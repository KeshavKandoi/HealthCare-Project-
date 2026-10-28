import express from 'express';
import { manualEcgRouter } from './manualEcg.js';
import { patientAuth } from '../middlewares/ecgAuth.js';
import { getPool } from '../config/db.js';
import { io } from '../server.js';
import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const router = express.Router();
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (res,status,message) => res.status(status).json({success:false,message});
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const attempts=new Map();
function pairingLimit(req,res,next){const key=req.ip||'unknown',now=Date.now(),entry=attempts.get(key)||{count:0,until:now+60000};if(now>entry.until){entry.count=0;entry.until=now+60000}entry.count++;attempts.set(key,entry);if(entry.count>10)return fail(res,429,'Pairing rate limit exceeded');next()}
setInterval(()=>{const now=Date.now();for(const [key,value] of attempts)if(value.until<now)attempts.delete(key)},60000).unref();
const audit = (client,deviceId,patientId,action) => client.query('insert into device_audit_logs(id,device_id,patient_id,action) values($1,$2,$3,$4)',[randomUUID(),deviceId,patientId,action]);

async function deviceAuth(req,res,next) {
  const id = req.headers['x-device-id'], secret = req.headers['x-device-secret'];
  if (!uuid(id) || typeof secret !== 'string' || secret.length < 32) return fail(res,401,'Device credential required');
  const {rows} = await getPool().query('select d.*, c.secret_hash, c.revoked_at, a.patient_id from devices d join device_credentials c on c.device_id=d.id left join patient_device_assignments a on a.device_id=d.id and a.unpaired_at is null where d.id=$1',[id]);
  const device = rows[0];
  if (!device || device.revoked_at || device.status==='revoked' || !timingSafeEqual(Buffer.from(hash(secret)),Buffer.from(device.secret_hash))) return fail(res,401,'Invalid device credential');
  req.device=device; next();
}

// Provision only by a trusted operator over a private deployment channel.
router.post('/operator/devices',asyncRoute(async(req,res)=>{
  if (!process.env.ECG_OPERATOR_KEY || req.headers['x-operator-key'] !== process.env.ECG_OPERATOR_KEY) return fail(res,403,'Operator access required');
  const {model,sampleRateHz,units,isSimulated = false} = req.body;
  if (!Number.isInteger(sampleRateHz) || sampleRateHz<1 || sampleRateHz>2000 || !['raw','mV'].includes(units) || typeof isSimulated !== 'boolean' || (isSimulated && units !== 'raw')) return fail(res,400,'Valid sample rate and units required; simulated devices use raw units');
  const id=randomUUID(), secret=randomBytes(32).toString('hex');
  const client=await getPool().connect();
  try { await client.query('begin'); await client.query('insert into devices(id,model,sample_rate_hz,units,is_simulated) values($1,$2,$3,$4,$5)',[id,typeof model==='string'?model.slice(0,100):null,sampleRateHz,units,isSimulated]); await client.query('insert into device_credentials(device_id,secret_hash) values($1,$2)',[id,hash(secret)]); await audit(client,id,null,'provision'); await client.query('commit'); res.status(201).json({deviceId:id,deviceSecret:secret,isSimulated}); }
  catch(e){await client.query('rollback');throw e} finally {client.release()}
}));
router.post('/operator/devices/:id/rotate',asyncRoute(async(req,res)=>{
  if (!process.env.ECG_OPERATOR_KEY || req.headers['x-operator-key'] !== process.env.ECG_OPERATOR_KEY || !uuid(req.params.id)) return fail(res,403,'Operator access required');
  const secret=randomBytes(32).toString('hex');
  const {rowCount}=await getPool().query('update device_credentials set secret_hash=$2,rotated_at=now(),revoked_at=null where device_id=$1 and revoked_at is null',[req.params.id,hash(secret)]);
  if (!rowCount) return fail(res,404,'Device unavailable');
  res.json({deviceSecret:secret});
}));
router.post('/device/pair',pairingLimit,deviceAuth,asyncRoute(async(req,res)=>{
  const code=String(req.body?.code || '').trim();
  if (!/^\d{8}$/.test(code)) return fail(res,400,'Invalid pairing code');
  const client=await getPool().connect();
  try {
    await client.query('begin');
    const {rows}=await client.query('select * from device_pairing_challenges where code_hash=$1 and consumed_at is null and expires_at>now() for update',[hash(code)]);
    const challenge=rows[0];
    if (!challenge) {await client.query('rollback');return fail(res,400,'Pairing code expired or invalid')}
    const device=await client.query('select * from devices where id=$1 for update',[req.device.id]);
    if (device.rows[0].status!=='unpaired') {await client.query('rollback');return fail(res,409,'Device already assigned or revoked')}
    await client.query('insert into patient_device_assignments(device_id,patient_id) values($1,$2) on conflict(device_id) do update set patient_id=$2,assigned_at=now(),unpaired_at=null',[req.device.id,challenge.patient_id]);
    await client.query("update devices set status='paired' where id=$1",[req.device.id]);
    await client.query('update device_pairing_challenges set consumed_at=now() where id=$1',[challenge.id]);
    await audit(client,req.device.id,challenge.patient_id,'pair');
    await client.query('commit'); res.json({success:true,deviceId:req.device.id});
  } catch(e){await client.query('rollback');throw e} finally {client.release()}
}));
router.post('/device/heartbeat',deviceAuth,asyncRoute(async(req,res)=>{
  const firmware=typeof req.body?.firmwareVersion==='string'?req.body.firmwareVersion.slice(0,80):null;
  const {batteryPercent,queuedBatches,syncFailures}=req.body||{};
  if ((batteryPercent!==undefined&&(!Number.isInteger(batteryPercent)||batteryPercent<0||batteryPercent>100))||(queuedBatches!==undefined&&(!Number.isInteger(queuedBatches)||queuedBatches<0))||(syncFailures!==undefined&&(!Number.isInteger(syncFailures)||syncFailures<0))) return fail(res,400,'Invalid device telemetry');
  const client=await getPool().connect();try{await client.query('begin');await client.query('update devices set last_seen_at=now(), firmware_version=coalesce($2,firmware_version) where id=$1',[req.device.id,firmware]);await client.query('insert into device_telemetry(id,device_id,battery_percent,queued_batches,sync_failures,firmware_version) values($1,$2,$3,$4,$5,$6)',[randomUUID(),req.device.id,batteryPercent??null,queuedBatches??null,syncFailures??null,firmware]);await client.query('commit')}catch(error){await client.query('rollback');throw error}finally{client.release()}
  res.json({success:true});
}));
router.post('/device/batches',deviceAuth,asyncRoute(async(req,res)=>{
  const {sessionId,sequence,firstSampleAt,sampleRateHz,samples}=req.body || {};
  if (req.body?.simulated === true && !req.device.is_simulated) return fail(res,403,'Simulated packets require a simulated device');
  if (!req.device.patient_id || !uuid(sessionId) || !Number.isSafeInteger(sequence) || sequence<0 || !Array.isArray(samples) || samples.length<1 || samples.length>2000 || !samples.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1e7) || sampleRateHz!==req.device.sample_rate_hz) return fail(res,400,'Invalid batch');
  const firstTime=Date.parse(firstSampleAt); if (!Number.isFinite(firstTime) || firstTime>Date.now()+300000) return fail(res,400,'Sample timestamp is invalid or in the future');
  const client=await getPool().connect();
  try {
    await client.query('begin');
    const {rows}=await client.query('select * from ecg_recording_sessions where id=$1 and device_id=$2 and patient_id=$3 for update',[sessionId,req.device.id,req.device.patient_id]);
    const session=rows[0]; if (!session || !['recording','interrupted','completed'].includes(session.status) || session.sample_rate_hz!==sampleRateHz) {await client.query('rollback');return fail(res,409,'Recording session unavailable')}
    const lastTime=firstTime+(samples.length-1)*1000/sampleRateHz;
    const limit=session.ended_at?Date.parse(session.ended_at)+60000:Math.min(Date.now()+300000,Date.parse(session.started_at)+(Number(session.target_hours)||24)*3600000+3600000);
    if (firstTime<Date.parse(session.started_at)-60000 || lastTime>limit || (session.ended_at&&Date.now()-Date.parse(session.ended_at)>14*86400000)) {await client.query('rollback');return fail(res,400,'Batch timestamps fall outside the recording window')}
    const digest=hash(JSON.stringify({firstSampleAt,sampleRateHz,samples}));
    const prior=await client.query('select sha256 from ecg_recording_chunks where session_id=$1 and sequence=$2',[sessionId,sequence]);
    if (prior.rowCount) {await client.query('rollback');return prior.rows[0].sha256===digest?res.json({success:true,duplicate:true,nextSequence:Number(session.last_sequence)+1}):fail(res,409,'Conflicting sequence')}
    if (sequence!==Number(session.last_sequence)+1) {await client.query('rollback');return res.status(409).json({success:false,message:'Upload the next queued batch first',expectedSequence:Number(session.last_sequence)+1})}
    await client.query('insert into ecg_recording_chunks(session_id,sequence,first_sample_at,sample_count,samples,sha256) values($1,$2,$3,$4,$5,$6)',[sessionId,sequence,new Date(firstTime),samples.length,JSON.stringify(samples),digest]);
    const lastSampleAt=new Date(lastTime);
    await client.query("update ecg_recording_sessions set last_sequence=$2,sample_count=sample_count+$3,last_sample_at=$4 where id=$1",[sessionId,sequence,samples.length,lastSampleAt]);
    await client.query('update devices set last_seen_at=now() where id=$1',[req.device.id]);
    await client.query('commit');
    io.to(`patient:${req.device.patient_id}`).emit('ecg-batch',{sessionId,deviceId:req.device.id,sequence,firstSampleAt,sampleRateHz,samples,units:req.device.units,receivedAt:new Date().toISOString()});
    res.status(201).json({success:true,nextSequence:sequence+1});
  }catch(e){await client.query('rollback');throw e}finally{client.release()}
}));
router.post('/data',(_req,res)=>fail(res,410,'This endpoint is retired. Use an authenticated device batch and recording session.'));
router.use(patientAuth);
router.use('/manual/start', pairingLimit);
router.use(manualEcgRouter(getPool, (patientId, batch) => io.to(`patient:${patientId}`).emit('ecg-batch', batch)));
router.get('/devices',asyncRoute(async(req,res)=>{
 const {rows}=await getPool().query("select d.id,d.model,d.firmware_version,d.sample_rate_hz,d.units,d.last_seen_at,d.status,d.is_simulated from devices d join patient_device_assignments a on a.device_id=d.id where a.patient_id=$1 and a.unpaired_at is null order by a.assigned_at desc",[req.patientId]); res.json({devices:rows});
}));
router.post('/pairing-challenges',pairingLimit,asyncRoute(async(req,res)=>{
 const code=String(randomBytes(4).readUInt32BE()%100000000).padStart(8,'0'), id=randomUUID();
 await getPool().query('insert into device_pairing_challenges(id,patient_id,code_hash,expires_at) values($1,$2,$3,now()+interval \'5 minutes\')',[id,req.patientId,hash(code)]);
 res.status(201).json({code,expiresAt:new Date(Date.now()+300000).toISOString()});
}));
router.delete('/devices/:id',asyncRoute(async(req,res)=>{
 if(!uuid(req.params.id)) return fail(res,400,'Invalid device');
 const client=await getPool().connect(); try {await client.query('begin'); const result=await client.query('update patient_device_assignments set unpaired_at=now() where device_id=$1 and patient_id=$2 and unpaired_at is null returning device_id',[req.params.id,req.patientId]); if(!result.rowCount){await client.query('rollback');return fail(res,404,'Device unavailable')}; await client.query("update ecg_recording_sessions set status='interrupted' where device_id=$1 and patient_id=$2 and status='recording'",[req.params.id,req.patientId]); await client.query("update ecg_recording_sessions set status='failed',ended_at=now() where device_id=$1 and patient_id=$2 and status in ('created','starting','interrupted','finalizing')",[req.params.id,req.patientId]); await client.query("update devices set status='unpaired' where id=$1",[req.params.id]); await client.query('update device_credentials set revoked_at=now() where device_id=$1',[req.params.id]); await audit(client,req.params.id,req.patientId,'unpair'); await client.query('commit');res.json({success:true});}catch(e){await client.query('rollback');throw e}finally{client.release()}
}));
router.post('/sessions',asyncRoute(async(req,res)=>{
 const id=req.body?.deviceId; if(!uuid(id))return fail(res,400,'Invalid device');
 const targetHours=req.body?.targetHours??24;if(![24,72].includes(targetHours))return fail(res,400,'Choose a 24 or 72 hour study');
 const {rows}=await getPool().query("select d.* from devices d join patient_device_assignments a on a.device_id=d.id where d.id=$1 and a.patient_id=$2 and a.unpaired_at is null and d.status='paired'",[id,req.patientId]);
 if(!rows[0])return fail(res,404,'Device unavailable');
 const sessionId=randomUUID();
 try {await getPool().query("insert into ecg_recording_sessions(id,patient_id,device_id,status,sample_rate_hz,units,target_hours,is_simulated) values($1,$2,$3,'recording',$4,$5,$6,$7)",[sessionId,req.patientId,id,rows[0].sample_rate_hz,rows[0].units,targetHours,rows[0].is_simulated]);}
 catch(e){if(e.code==='23505')return fail(res,409,'Device already has an active recording');throw e}
 res.status(201).json({id:sessionId,status:'recording'});
}));
router.post('/sessions/:id/stop',asyncRoute(async(req,res)=>{
 if(!uuid(req.params.id))return fail(res,400,'Invalid session');
 const {rows}=await getPool().query("update ecg_recording_sessions set status='completed',ended_at=now() where id=$1 and patient_id=$2 and status in ('recording','interrupted') returning *",[req.params.id,req.patientId]);
 if(!rows[0])return fail(res,404,'Session unavailable');res.json({session:rows[0]});
}));
router.get('/sessions',asyncRoute(async(req,res)=>{
 const limit=Math.min(50,Math.max(1,Number(req.query.limit)||20)),offset=Math.max(0,Number(req.query.offset)||0);
 const {rows}=await getPool().query('select s.*,d.model from ecg_recording_sessions s join devices d on d.id=s.device_id where s.patient_id=$1 order by s.started_at desc limit $2 offset $3',[req.patientId,limit,offset]);res.json({sessions:rows});
}));
router.get('/sessions/:id',asyncRoute(async(req,res)=>{
 if(!uuid(req.params.id))return fail(res,400,'Invalid session');
 const {rows}=await getPool().query('select * from ecg_recording_sessions where id=$1 and patient_id=$2',[req.params.id,req.patientId]);if(!rows[0])return fail(res,404,'Session unavailable');
 const chunks=await getPool().query('select sequence,first_sample_at,sample_count,samples,sha256 from ecg_recording_chunks where session_id=$1 order by sequence limit 10000',[req.params.id]);
 const notes=await getPool().query('select id,note,created_at from ecg_session_notes where session_id=$1 and patient_id=$2 order by created_at',[req.params.id,req.patientId]);
 res.json({session:rows[0],chunks:chunks.rows,notes:notes.rows});
}));
router.get('/sessions/:id/download',asyncRoute(async(req,res)=>{
 if(!uuid(req.params.id))return fail(res,400,'Invalid session');
 const {rows}=await getPool().query('select id,is_simulated from ecg_recording_sessions where id=$1 and patient_id=$2',[req.params.id,req.patientId]);if(!rows[0])return fail(res,404,'Session unavailable');
 const {rows:chunks}=await getPool().query('select sequence,first_sample_at,samples from ecg_recording_chunks where session_id=$1 order by sequence',[req.params.id]);
 res.set('Content-Disposition',`attachment; filename="ecg-${req.params.id}.json"`);res.json({sessionId:req.params.id,isSimulated:rows[0].is_simulated,chunks});
}));
router.post('/sessions/:id/notes',asyncRoute(async(req,res)=>{
 if(!uuid(req.params.id)||typeof req.body?.note!=='string'||!req.body.note.trim()||req.body.note.length>1000)return fail(res,400,'Invalid note');
 const {rows}=await getPool().query('insert into ecg_session_notes(id,session_id,patient_id,note) select $1,id,$2,$3 from ecg_recording_sessions where id=$4 and patient_id=$2 returning *',[randomUUID(),req.patientId,req.body.note.trim(),req.params.id]);
 if(!rows[0])return fail(res,404,'Session unavailable');res.status(201).json({note:rows[0]});
}));
router.get('/history/:patientId',asyncRoute(async(req,res)=>{
 if(req.params.patientId!==req.patientId)return fail(res,403,'Forbidden');
 const {rows}=await getPool().query('select id,started_at,ended_at,status,sample_count,is_simulated from ecg_recording_sessions where patient_id=$1 order by started_at desc limit 100',[req.patientId]);res.json({success:true,records:rows});
}));
router.use((error,req,res,next)=>{console.error('ECG request failed',error.code||error.name);fail(res,503,['42P01','42703'].includes(error.code)?'ECG database setup is incomplete. The server needs the latest database migrations.':'ECG service is unavailable. Please retry shortly.')});
export default router;
