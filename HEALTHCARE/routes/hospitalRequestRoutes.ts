import { express } from '../serverDependencies.js';
import { randomUUID } from 'node:crypto';
import { getPool } from '../config/db.js';
import { patientAuth } from '../middlewares/ecgAuth.js';
const router = express.Router();
const db = () => getPool();
const fail = (res: any, code: number, message: string) => res.status(code).json({ message });
const wrap = (fn: (req: any, res: any) => Promise<unknown>) => (req: any, res: any, next: any) => Promise.resolve(fn(req,res)).catch(next);
const profiles = new Set(['st-johns-kiron-varghese','st-johns-srilakshmi','st-johns-shweta-agrawal','st-johns-usha-m-k','trilife-prashant-wankhade','trilife-mohamed-ahmed']);
router.post('/operator/link', wrap(async (req,res) => {
  if (!process.env.CLINICIAN_OPERATOR_KEY || req.headers['x-operator-key'] !== process.env.CLINICIAN_OPERATOR_KEY) return fail(res,403,'Operator access required');
  const { profileId, doctorId } = req.body || {};
  if (!profiles.has(profileId) || typeof doctorId !== 'string') return fail(res,400,'Invalid profile or doctor');
  const { rows } = await db().query(`insert into hospital_doctor_links(profile_id,doctor_id)
    select $1,p.doctor_id from doctor_profiles p where p.doctor_id=$2 and p.user_id is not null and p.verified_at is not null and p.demo_only=false
    on conflict(profile_id) do nothing returning *`,[profileId,doctorId]);
  if (!rows[0]) return fail(res,409,'Profile already linked or verified clinician unavailable');
  res.json({ link: rows[0] });
}));
router.use(patientAuth);
router.get('/profiles', wrap(async (_req,res) => { const {rows} = await db().query('select profile_id,doctor_id from hospital_doctor_links'); res.json({ linked: rows }); }));
router.get('/mine', wrap(async (req,res) => {
  const {rows} = await db().query('select id,profile_id,preferred_start_at,reason,status,appointment_id,created_at from hospital_appointment_requests where patient_id=$1 order by created_at desc limit 100',[req.patientId]);
  res.json({ requests: rows });
}));
router.post('/', wrap(async (req,res) => {
  const {profileId,preferredStartAt,reason} = req.body || {};
  if (!profiles.has(profileId) || typeof preferredStartAt !== 'string' || !Number.isFinite(Date.parse(preferredStartAt)) || Date.parse(preferredStartAt) < Date.now()+3600000 || Date.parse(preferredStartAt) > Date.now()+180*86400000 || typeof reason !== 'string' || reason.trim().length > 500) return fail(res,400,'Choose a valid future time and reason');
  const {rows:linked} = await db().query('select doctor_id from hospital_doctor_links where profile_id=$1',[profileId]);
  const doctorId = linked[0]?.doctor_id;
  if (!doctorId) return fail(res,409,'Online booking is not yet available for this doctor');
  const start = new Date(preferredStartAt); const local = new Date(start.getTime()+330*60000);
  const weekday=local.getUTCDay(),minute=local.getUTCHours()*60+local.getUTCMinutes();
  const {rows:rules}=await db().query('select duration_minutes from doctor_availability_rules where doctor_id=$1 and weekday=$2 and start_minute<=$3 and end_minute>=$3+duration_minutes and (($3-start_minute)%duration_minutes)=0',[doctorId,weekday,minute]);
  if (!rules[0]) return fail(res,409,'This time is not in the doctor’s published schedule');
  const end=new Date(start.getTime()+rules[0].duration_minutes*60000);
  const {rows:busy}=await db().query("select 1 from scheduled_appointments where doctor_id=$1 and status in('requested','confirmed') and start_at<$3 and end_at>$2 union all select 1 from doctor_schedule_exceptions where doctor_id=$1 and start_at<$3 and end_at>$2 limit 1",[doctorId,start,end]);
  if (busy[0]) return fail(res,409,'This time is no longer available');
  const {rows} = await db().query("insert into hospital_appointment_requests(id,profile_id,patient_id,preferred_start_at,duration_minutes,reason) values($1,$2,$3,$4,$5,$6) returning *",[randomUUID(),profileId,req.patientId,preferredStartAt,rules[0].duration_minutes,reason.trim() || null]);
  res.status(201).json({request:rows[0]});
}));
router.post('/:id/cancel', wrap(async (req,res) => {
  const {rows} = await db().query("update hospital_appointment_requests set status='cancelled',updated_at=now() where id=$1 and patient_id=$2 and status='requested' returning *",[req.params.id,req.patientId]);
  if (!rows[0]) return fail(res,409,'Request cannot be cancelled'); res.json({request:rows[0]});
}));
router.get('/doctor/inbox', wrap(async (req,res) => {
  const {rows} = await db().query(`select r.id,r.profile_id,r.preferred_start_at,r.reason,r.status,r.created_at,u.data->>'name' patient_name
    from hospital_appointment_requests r join hospital_doctor_links l on l.profile_id=r.profile_id
    join doctor_profiles p on p.doctor_id=l.doctor_id join app_users u on u.id=r.patient_id
    where p.user_id=$1 and p.verified_at is not null order by r.created_at desc limit 100`,[req.patientId]);
  res.json({requests:rows});
}));
router.patch('/doctor/:id', wrap(async (req,res) => {
  const status = req.body?.status;
  if (!['confirmed','declined'].includes(status)) return fail(res,400,'Invalid decision');
  const client = await db().connect();
  try {
    await client.query('begin');
    const {rows} = await client.query(`select r.*,l.doctor_id from hospital_appointment_requests r
      join hospital_doctor_links l on l.profile_id=r.profile_id join doctor_profiles p on p.doctor_id=l.doctor_id
      where r.id=$1 and p.user_id=$2 and p.verified_at is not null for update of r`,[req.params.id,req.patientId]);
    const request = rows[0];
    if (!request || request.status !== 'requested') { await client.query('rollback'); return fail(res,409,'Request unavailable'); }
    if (status === 'declined') {
      const result = await client.query("update hospital_appointment_requests set status='declined',updated_at=now() where id=$1 returning *",[request.id]);
      await client.query('commit'); return res.json({request:result.rows[0]});
    }
    const start = new Date(request.preferred_start_at);
    if (start.getTime() < Date.now()+30*60000) { await client.query('rollback'); return fail(res,409,'Requested time has passed'); }
    const end = new Date(start.getTime()+request.duration_minutes*60000);
    const {rows:blocked}=await client.query('select 1 from doctor_schedule_exceptions where doctor_id=$1 and start_at<$3 and end_at>$2 limit 1',[request.doctor_id,start,end]);
    if (blocked[0]) { await client.query('rollback'); return fail(res,409,'This time is blocked in the clinician schedule'); }
    const appointmentId = randomUUID();
    await client.query("insert into scheduled_appointments(id,patient_id,doctor_id,start_at,end_at,status,reason) values($1,$2,$3,$4,$5,'confirmed',$6)",[appointmentId,request.patient_id,request.doctor_id,start,end,request.reason]);
    await client.query('insert into appointment_status_events(id,appointment_id,actor_id,status) values($1,$2,$3,$4)',[randomUUID(),appointmentId,req.patientId,'confirmed']);
    const result = await client.query("update hospital_appointment_requests set status='confirmed',appointment_id=$2,updated_at=now() where id=$1 returning *",[request.id,appointmentId]);
    await client.query('commit'); res.json({request:result.rows[0]});
  } catch(error: any) { await client.query('rollback'); if (error?.code === '23P01') return fail(res,409,'This time conflicts with another appointment'); throw error; }
  finally { client.release(); }
}));
router.use((error: any,_req: any,res: any,_next: any) => { if (error?.code === '23505') return fail(res,409,'Doctor is already linked to another profile'); console.error('Hospital request error',error?.code || error?.name); return fail(res,500,'Appointment request failed'); });
export default router;
