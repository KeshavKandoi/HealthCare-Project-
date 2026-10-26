import { express } from '../serverDependencies.js';
import { randomUUID } from 'node:crypto';
import { getPool } from '../config/db.js';
import { patientAuth } from '../middlewares/ecgAuth.js';

const router = express.Router();
const db = () => getPool();
const wrap = (fn: (req: any, res: any) => Promise<unknown>) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch(next);
const fail = (res: any, status: number, message: string) => res.status(status).json({ message });

export async function careAppointment(appointmentId: string, userId: string) {
  const { rows } = await db().query(`select a.id,a.patient_id,a.doctor_id,a.start_at,a.end_at,a.status,
    p.user_id doctor_user_id,d.data->>'name' doctor_name,u.data->>'name' patient_name
    from scheduled_appointments a join doctor_profiles p on p.doctor_id=a.doctor_id
    join doctors d on d.id=a.doctor_id join app_users u on u.id=a.patient_id
    where a.id=$1 and (a.patient_id=$2 or p.user_id=$2) and a.status in ('confirmed','completed')
      and p.verified_at is not null and ($3='1' or p.demo_only=false)`,
  [appointmentId, userId, process.env.ENABLE_DEMO_CLINICIANS === 'true' ? '1' : '0']);
  return rows[0] || null;
}

router.use(patientAuth);
router.get('/conversations', wrap(async (req, res) => {
  const { rows } = await db().query(`select a.id appointment_id,a.status,a.start_at,a.end_at,
    d.data->>'name' doctor_name,u.data->>'name' patient_name,
    (select max(created_at) from appointment_messages where appointment_id=a.id) last_message_at,
    (select count(*)::int from appointment_messages where appointment_id=a.id) message_count
    from scheduled_appointments a join doctor_profiles p on p.doctor_id=a.doctor_id
    join doctors d on d.id=a.doctor_id join app_users u on u.id=a.patient_id
    where (a.patient_id=$1 or p.user_id=$1) and a.status in ('confirmed','completed')
      and p.verified_at is not null and ($2='1' or p.demo_only=false)
    order by coalesce((select max(created_at) from appointment_messages where appointment_id=a.id),a.start_at) desc limit 100`,
  [req.patientId, process.env.ENABLE_DEMO_CLINICIANS === 'true' ? '1' : '0']);
  res.json({ conversations: rows });
}));
router.get('/appointments/:id/messages', wrap(async (req, res) => {
  if (!await careAppointment(req.params.id, req.patientId)) return fail(res, 403, 'Conversation unavailable');
  const { rows } = await db().query('select id,appointment_id,sender_user_id,body,created_at from appointment_messages where appointment_id=$1 order by created_at desc,id desc limit 200', [req.params.id]);
  res.json({ messages: rows.reverse() });
}));
router.post('/appointments/:id/messages', wrap(async (req, res) => {
  if (!await careAppointment(req.params.id, req.patientId)) return fail(res, 403, 'Conversation unavailable');
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body || body.length > 2000) return fail(res, 400, 'Message must contain 1–2000 characters');
  const { rows } = await db().query('insert into appointment_messages(id,appointment_id,sender_user_id,body) values($1,$2,$3,$4) returning id,appointment_id,sender_user_id,body,created_at', [randomUUID(), req.params.id, req.patientId, body]);
  res.status(201).json({ message: rows[0] });
}));
router.get('/appointments/:id/calls', wrap(async (req, res) => {
  if (!await careAppointment(req.params.id, req.patientId)) return fail(res, 403, 'Call history unavailable');
  await db().query("update appointment_calls set status='missed',ended_at=now() where appointment_id=$1 and status='ringing' and started_at<now()-interval '2 minutes'", [req.params.id]);
  const { rows } = await db().query('select id,appointment_id,initiated_by,status,started_at,connected_at,ended_at from appointment_calls where appointment_id=$1 order by started_at desc limit 100', [req.params.id]);
  res.json({ calls: rows });
}));
router.post('/appointments/:id/calls', wrap(async (req, res) => {
  const a = await careAppointment(req.params.id, req.patientId);
  if (!a || a.status !== 'confirmed') return fail(res, 403, 'Confirmed appointment required');
  const now = Date.now();
  if (now < Date.parse(a.start_at) - 15 * 60000 || now > Date.parse(a.end_at) + 30 * 60000) return fail(res, 409, 'Video is available from 15 minutes before to 30 minutes after the appointment');
  await db().query("update appointment_calls set status='missed',ended_at=now() where appointment_id=$1 and status='ringing' and started_at<now()-interval '2 minutes'", [a.id]);
  const { rows } = await db().query(`insert into appointment_calls(id,appointment_id,initiated_by)
    select $1,$2,$3 where not exists(select 1 from appointment_calls where appointment_id=$2 and status in ('ringing','connected'))
    returning id,appointment_id,initiated_by,status,started_at`, [randomUUID(), a.id, req.patientId]);
  if (!rows[0]) return fail(res, 409, 'A call is already active for this appointment');
  res.status(201).json({ call: rows[0] });
}));
router.patch('/calls/:id', wrap(async (req, res) => {
  const status = req.body?.status;
  if (!['connected','completed','declined','failed'].includes(status)) return fail(res, 400, 'Invalid call status');
  const { rows: existing } = await db().query('select id,appointment_id,status from appointment_calls where id=$1', [req.params.id]);
  if (!existing[0] || !await careAppointment(existing[0].appointment_id, req.patientId)) return fail(res, 403, 'Call unavailable');
  const from = status === 'connected' ? ['ringing'] : ['ringing','connected'];
  const { rows } = await db().query(`update appointment_calls set status=$2,
    connected_at=case when $2='connected' then now() else connected_at end,
    ended_at=case when $2='connected' then ended_at else now() end
    where id=$1 and status=any($3::text[]) returning id,appointment_id,initiated_by,status,started_at,connected_at,ended_at`, [req.params.id, status, from]);
  if (!rows[0]) return fail(res, 409, 'Call is no longer active');
  res.json({ call: rows[0] });
}));
router.use((error: any, _req: any, res: any, _next: any) => { if (error?.code === '23505') return fail(res, 409, 'A call is already active for this appointment'); console.error('Care communication error', error?.code || error?.name); return fail(res, 500, 'Communication request failed'); });
export default router;
