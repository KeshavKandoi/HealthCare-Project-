import express from 'express';
import { randomUUID, createHash } from 'node:crypto';

// This router must be mounted AFTER patientAuth. Client identity is never read from the body.
export function manualEcgRouter(pool, emit = () => {}) {
  const router = express.Router();
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  router.post('/manual/start', wrap(async (req, res) => {
    const client = await pool().connect();
    try {
      await client.query('begin');
      await client.query('select pg_advisory_xact_lock(hashtext($1))', [`manual:${req.patientId}`]);
      let { rows } = await client.query("select d.id from devices d join patient_device_assignments a on a.device_id=d.id where a.patient_id=$1 and a.unpaired_at is null and d.is_simulated and d.model='Browser stream' and d.status='paired' limit 1", [req.patientId]);
      const deviceId = rows[0]?.id || randomUUID();
      if (!rows.length) {
        await client.query("insert into devices(id,model,sample_rate_hz,units,status,is_simulated) values($1,'Browser stream',10,'raw','paired',true)", [deviceId]);
        await client.query('insert into patient_device_assignments(device_id,patient_id) values($1,$2)', [deviceId, req.patientId]);
      }
      // A new run explicitly closes an abandoned browser run, never a physical recording.
      await client.query("update ecg_recording_sessions set status='completed',ended_at=coalesce(last_sample_at,now()) where device_id=$1 and patient_id=$2 and status in ('recording','interrupted')", [deviceId, req.patientId]);
      const id = randomUUID();
      await client.query("insert into ecg_recording_sessions(id,patient_id,device_id,status,sample_rate_hz,units,target_hours,is_simulated) values($1,$2,$3,'recording',10,'raw',24,true)", [id, req.patientId, deviceId]);
      await client.query('commit');
      res.status(201).json({ id, deviceId });
    } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
  }));
  router.post('/manual/:id/packets', wrap(async (req, res) => {
    const { values, bpm, sequence } = req.body || {};
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id) || !Number.isInteger(sequence) || sequence < 0 || sequence >= 3600 || !Array.isArray(values) || values.length !== 10 || !values.every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e7) || !Number.isFinite(bpm) || bpm < 20 || bpm > 250) return res.status(400).json({ message: 'Provide 10 numeric samples, BPM 20–250 and a valid packet sequence.' });
    const client = await pool().connect();
    try {
      await client.query('begin');
      const { rows } = await client.query("select s.* from ecg_recording_sessions s join devices d on d.id=s.device_id where s.id=$1 and s.patient_id=$2 and s.is_simulated and d.model='Browser stream' and s.status='recording' for update of s", [req.params.id, req.patientId]);
      const session = rows[0];
      if (!session) { await client.query('rollback'); return res.status(404).json({ message: 'Active browser recording not found.' }); }
      if (sequence !== Number(session.last_sequence) + 1) { await client.query('rollback'); return res.status(409).json({ message: 'Packet sequence does not match the recording. Stop and start a new stream.' }); }
      if (session.last_sample_at && Date.now() - Date.parse(session.last_sample_at) < 500) { await client.query('rollback'); return res.status(429).json({ message: 'Send at most one packet per second.' }); }
      const receivedAt = new Date().toISOString();
      const digest = createHash('sha256').update(JSON.stringify({values,bpm})).digest('hex');
      await client.query('insert into ecg_recording_chunks(session_id,sequence,first_sample_at,sample_count,samples,sha256) values($1,$2,$3,10,$4,$5)', [session.id,sequence,receivedAt,JSON.stringify(values),digest]);
      await client.query('update ecg_recording_sessions set last_sequence=$2,sample_count=sample_count+10,last_sample_at=$3 where id=$1', [session.id,sequence,receivedAt]);
      await client.query('update devices set last_seen_at=$2 where id=$1', [session.device_id,receivedAt]);
      await client.query("insert into ecg_session_events(id,session_id,event,details) values($1,$2,'simulated_bpm',$3)", [randomUUID(),session.id,JSON.stringify({bpm,sequence,receivedAt})]);
      await client.query('commit');
      const batch = { sessionId:session.id,deviceId:session.device_id,sequence,firstSampleAt:receivedAt,sampleRateHz:10,samples:values,units:'raw',receivedAt,bpm };
      emit(req.patientId,batch);
      res.status(201).json({ batch });
    } catch(e) { await client.query('rollback'); throw e; } finally { client.release(); }
  }));
  return router;
}
