import { express } from '../serverDependencies.js';
import { randomBytes, randomUUID, createHash, createHmac } from 'node:crypto';
import { getPool } from '../config/db.js';
import { patientAuth } from '../middlewares/ecgAuth.js';
import { userAuth, isAdmin } from '../middlewares/authMiddlewares.js';
import { makeTechnicalReport } from '../lib/monitoringReport.js';

const router = express.Router();
const db = () => getPool();
const wrap = (fn: (req: any, res: any) => Promise<unknown>) => (req: any, res: any, next: (error?: Error) => void) => Promise.resolve(fn(req, res)).catch(next);
const fail = (res: any, status: number, message: string) => res.status(status).json({ message });
const validId = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const fleetSql = `select d.id,d.model,d.firmware_version,d.status,d.last_seen_at,
  t.battery_percent,t.queued_batches,t.sync_failures,t.reported_at,
  (select count(*)::int from device_support_requests r where r.device_id=d.id and r.status<>'resolved') open_support_requests
  from devices d left join lateral(select * from device_telemetry where device_id=d.id order by reported_at desc limit 1) t on true
  order by d.last_seen_at desc nulls last limit 500`;
const supportSql = "select id,device_id,request_type,issue,status,created_at,updated_at from device_support_requests order by case when status='resolved' then 1 else 0 end,created_at desc limit 500";

async function patientSession(sessionId: string, patientId: string) {
  if (!validId(sessionId)) return null;
  const { rows } = await db().query('select * from ecg_recording_sessions where id=$1 and patient_id=$2', [sessionId, patientId]);
  return rows[0] || null;
}

async function doctorSession(sessionId: string, userId: string) {
  if (!validId(sessionId)) return null;
  const { rows } = await db().query(`select s.*,p.doctor_id from ecg_recording_sessions s
    join doctor_profiles p on p.user_id=$2 and p.verified_at is not null
    where s.id=$1 and (
      exists(select 1 from scheduled_appointments a where a.patient_id=s.patient_id and a.doctor_id=p.doctor_id and a.status in ('confirmed','completed'))
      or exists(select 1 from patient_doctor_consents c where c.patient_id=s.patient_id and c.doctor_id=p.doctor_id and c.revoked_at is null)
    )`, [sessionId, userId]);
  return rows[0] || null;
}

async function doctorForPatient(userId: string, patientId: string) {
  const { rows } = await db().query(`select p.doctor_id from doctor_profiles p where p.user_id=$1 and p.verified_at is not null and (
    exists(select 1 from scheduled_appointments a where a.patient_id=$2 and a.doctor_id=p.doctor_id and a.status in ('confirmed','completed'))
    or exists(select 1 from patient_doctor_consents c where c.patient_id=$2 and c.doctor_id=p.doctor_id and c.revoked_at is null)
  )`, [userId, patientId]);
  return rows[0]?.doctor_id || null;
}

async function technicalReport(session: any) {
  const [chunks, markers, events, measurements] = await Promise.all([
    db().query('select sequence,first_sample_at,sample_count from ecg_recording_chunks where session_id=$1 order by sequence', [session.id]),
    db().query('select id,symptom,marked_at,note from ecg_symptom_markers where session_id=$1 order by marked_at', [session.id]),
    db().query('select event,details,created_at from ecg_session_events where session_id=$1 order by created_at', [session.id]),
    db().query("select kind,value,unit,measured_at,source from patient_health_measurements where patient_id=$1 and source='clinician' and measured_at between $2 and coalesce($3,now()) order by measured_at limit 200", [session.patient_id, session.started_at, session.ended_at]),
  ]);
  return makeTechnicalReport(session, chunks.rows, markers.rows, events.rows, measurements.rows);
}

router.get('/operator/fleet', wrap(async (req, res) => {
  if (!process.env.ECG_OPERATOR_KEY || req.headers['x-operator-key'] !== process.env.ECG_OPERATOR_KEY) return fail(res, 403, 'Operator access required');
  const { rows } = await db().query(fleetSql);
  res.json({ devices: rows });
}));

router.get('/operator/support', wrap(async (req, res) => {
  if (!process.env.ECG_OPERATOR_KEY || req.headers['x-operator-key'] !== process.env.ECG_OPERATOR_KEY) return fail(res, 403, 'Operator access required');
  const { rows } = await db().query(supportSql);
  res.json({ requests: rows });
}));

router.patch('/operator/support/:id', wrap(async (req, res) => {
  if (!process.env.ECG_OPERATOR_KEY || req.headers['x-operator-key'] !== process.env.ECG_OPERATOR_KEY) return fail(res, 403, 'Operator access required');
  if (!validId(req.params.id) || !['open', 'in_progress', 'resolved'].includes(req.body?.status)) return fail(res, 400, 'Invalid support update');
  const { rows } = await db().query('update device_support_requests set status=$2,updated_at=now() where id=$1 returning *', [req.params.id, req.body.status]);
  if (!rows[0]) return fail(res, 404, 'Request unavailable');
  res.json({ request: rows[0] });
}));

router.get('/staff/fleet', userAuth, isAdmin, wrap(async (_req, res) => {
  const { rows } = await db().query(fleetSql);
  res.json({ devices: rows });
}));
router.get('/staff/support', userAuth, isAdmin, wrap(async (_req, res) => {
  const { rows } = await db().query(supportSql);
  res.json({ requests: rows });
}));
router.patch('/staff/support/:id', userAuth, isAdmin, wrap(async (req, res) => {
  if (!validId(req.params.id) || !['open', 'in_progress', 'resolved'].includes(req.body?.status)) return fail(res, 400, 'Invalid support update');
  const { rows } = await db().query('update device_support_requests set status=$2,updated_at=now() where id=$1 returning *', [req.params.id, req.body.status]);
  if (!rows[0]) return fail(res, 404, 'Request unavailable');
  res.json({ request: rows[0] });
}));

router.use(patientAuth);

router.post('/sessions/:id/markers', wrap(async (req, res) => {
  const session = await patientSession(req.params.id, req.patientId);
  if (!session) return fail(res, 404, 'Recording unavailable');
  const { symptom, note } = req.body || {};
  const markerId = req.body?.clientId === undefined ? randomUUID() : req.body.clientId;
  const markedAt = req.body?.markedAt ? new Date(req.body.markedAt) : new Date();
  if (!validId(markerId) || !['dizziness', 'discomfort', 'palpitations', 'breathlessness', 'other'].includes(symptom) || !Number.isFinite(markedAt.getTime()) || (note != null && (typeof note !== 'string' || note.length > 500))) return fail(res, 400, 'Invalid symptom marker');
  if (markedAt.getTime() < new Date(session.started_at).getTime() - 60000 || markedAt.getTime() > (session.ended_at ? new Date(session.ended_at).getTime() + 60000 : Date.now() + 300000)) return fail(res, 400, 'Marker outside recording window');
  const { rows } = await db().query('insert into ecg_symptom_markers(id,session_id,patient_id,symptom,marked_at,note) values($1,$2,$3,$4,$5,$6) on conflict(id) do nothing returning *', [markerId, session.id, req.patientId, symptom, markedAt, note?.trim() || null]);
  if (rows[0]) return res.status(201).json({ marker: rows[0] });
  const previous = await db().query('select * from ecg_symptom_markers where id=$1 and session_id=$2 and patient_id=$3', [markerId, session.id, req.patientId]);
  if (!previous.rows[0] || previous.rows[0].symptom !== symptom || new Date(previous.rows[0].marked_at).getTime() !== markedAt.getTime()) return fail(res, 409, 'Conflicting marker ID');
  res.json({ marker: previous.rows[0], duplicate: true });
}));

router.get('/sessions/:id/report', wrap(async (req, res) => {
  const session = await patientSession(req.params.id, req.patientId);
  if (!session) return fail(res, 404, 'Recording unavailable');
  const report = await technicalReport(session);
  const { rows } = await db().query('select r.id,r.doctor_id,r.summary,r.signed_at,r.signature,r.released_at,d.data->>\'name\' doctor_name from ecg_doctor_reviews r join doctors d on d.id=r.doctor_id where r.session_id=$1 and r.released_at is not null order by r.signed_at desc', [session.id]);
  const reviews = rows.map((review: any) => {
    const expected = process.env.ECG_REVIEW_SIGNING_KEY && createHmac('sha256', process.env.ECG_REVIEW_SIGNING_KEY).update(JSON.stringify([review.id, session.id, review.doctor_id, review.summary, new Date(review.signed_at).toISOString()])).digest('hex');
    return { ...review, signatureVerified: !!expected && expected === review.signature };
  });
  res.json({ report, reviews });
}));

router.get('/plans', wrap(async (req, res) => {
  const { rows } = await db().query(`select p.*,d.data->>'name' doctor_name,
    coalesce((select sum(s.sample_count::numeric/s.sample_rate_hz/3600) from ecg_recording_sessions s where s.patient_id=p.patient_id and s.device_id=p.device_id and not s.is_simulated and s.started_at>=p.starts_at and s.started_at<=p.review_due_at),0) recorded_hours
    from monitoring_plans p join doctors d on d.id=p.doctor_id where p.patient_id=$1 order by p.created_at desc limit 50`, [req.patientId]);
  res.json({ plans: rows });
}));

router.get('/doctor/patients', wrap(async (req, res) => {
  const { rows } = await db().query(`select distinct u.id,u.data->>'name' name from app_users u
    join doctor_profiles p on p.user_id=$1 and p.verified_at is not null
    where exists(select 1 from scheduled_appointments a where a.patient_id=u.id and a.doctor_id=p.doctor_id and a.status in ('confirmed','completed'))
      or exists(select 1 from patient_doctor_consents c where c.patient_id=u.id and c.doctor_id=p.doctor_id and c.revoked_at is null)
    order by name limit 100`, [req.patientId]);
  res.json({ patients: rows });
}));

router.get('/doctor/patients/:patientId/sessions', wrap(async (req, res) => {
  if (!await doctorForPatient(req.patientId, req.params.patientId)) return fail(res, 403, 'Care relationship required');
  const { rows } = await db().query('select id,device_id,status,started_at,ended_at,sample_count,target_hours from ecg_recording_sessions where patient_id=$1 and not is_simulated order by started_at desc limit 100', [req.params.patientId]);
  res.json({ sessions: rows });
}));

router.get('/doctor/patients/:patientId/devices', wrap(async (req, res) => {
  if (!await doctorForPatient(req.patientId, req.params.patientId)) return fail(res, 403, 'Care relationship required');
  const { rows } = await db().query('select d.id,d.model,d.sample_rate_hz,d.last_seen_at from devices d join patient_device_assignments a on a.device_id=d.id and a.patient_id=$1 and a.unpaired_at is null order by a.assigned_at desc', [req.params.patientId]);
  res.json({ devices: rows });
}));

router.get('/doctor/sessions/:id', wrap(async (req, res) => {
  const session = await doctorSession(req.params.id, req.patientId);
  if (!session) return fail(res, 403, 'Care relationship required');
  const [chunks, annotations, reviews] = await Promise.all([
    db().query('select sequence,first_sample_at,sample_count,samples,sha256 from ecg_recording_chunks where session_id=$1 order by sequence limit 10000', [session.id]),
    db().query('select * from ecg_doctor_annotations where session_id=$1 order by at_time', [session.id]),
    db().query('select id,summary,signed_at,signature,released_at from ecg_doctor_reviews where session_id=$1 order by signed_at', [session.id]),
  ]);
  res.json({ session, report: await technicalReport(session), chunks: chunks.rows, annotations: annotations.rows, reviews: reviews.rows });
}));

router.post('/doctor/sessions/:id/annotations', wrap(async (req, res) => {
  const session = await doctorSession(req.params.id, req.patientId);
  if (!session) return fail(res, 403, 'Care relationship required');
  const { atTime, endTime, observation, needsAttention } = req.body || {};
  const at = Date.parse(atTime), end = endTime ? Date.parse(endTime) : at;
  if (!Number.isFinite(at) || !Number.isFinite(end) || at < Date.parse(session.started_at) || end > Date.parse(session.ended_at || new Date()) || end < at || typeof observation !== 'string' || !observation.trim() || observation.length > 2000) return fail(res, 400, 'Invalid annotation');
  const segment = await db().query('select 1 from ecg_recording_chunks where session_id=$1 and first_sample_at<=$2 and first_sample_at+(sample_count::double precision/$3*interval \'1 second\')>$2 limit 1', [session.id, new Date(at), session.sample_rate_hz]);
  if (!segment.rowCount) return fail(res, 409, 'No recorded ECG segment at that time');
  const { rows } = await db().query('insert into ecg_doctor_annotations(id,session_id,doctor_id,at_time,end_time,observation,needs_attention) values($1,$2,$3,$4,$5,$6,$7) returning *', [randomUUID(), session.id, session.doctor_id, new Date(at), endTime ? new Date(end) : null, observation.trim(), !!needsAttention]);
  res.status(201).json({ annotation: rows[0] });
}));

router.post('/doctor/sessions/:id/reviews', wrap(async (req, res) => {
  const session = await doctorSession(req.params.id, req.patientId);
  if (!session) return fail(res, 403, 'Care relationship required');
  if (session.is_simulated) return fail(res, 409, 'Simulated recordings cannot receive a clinical review');
  if (session.status !== 'completed') return fail(res, 409, 'Complete the recording before signing a review');
  const summary = req.body?.summary;
  if (typeof summary !== 'string' || summary.trim().length < 20 || summary.length > 5000) return fail(res, 400, 'Review summary must be 20–5000 characters');
  if (!process.env.ECG_REVIEW_SIGNING_KEY || process.env.ECG_REVIEW_SIGNING_KEY.length < 32) return fail(res, 503, 'Review signing is not configured');
  const id = randomUUID(), signedAt = new Date().toISOString(), normalized = summary.trim();
  const signature = createHmac('sha256', process.env.ECG_REVIEW_SIGNING_KEY).update(JSON.stringify([id, session.id, session.doctor_id, normalized, signedAt])).digest('hex');
  try {
    const { rows } = await db().query('insert into ecg_doctor_reviews(id,session_id,doctor_id,summary,signed_at,signature,released_at) values($1,$2,$3,$4,$5,$6,$5) returning id,summary,signed_at,signature,released_at', [id, session.id, session.doctor_id, normalized, signedAt, signature]);
    res.status(201).json({ review: rows[0] });
  } catch (error: any) {
    if (error.code === '23505') return fail(res, 409, 'This clinician already signed this recording');
    throw error;
  }
}));

router.post('/doctor/plans', wrap(async (req, res) => {
  const { patientId, deviceId, targetHours, startsAt, reviewDueAt, instructions, symptoms } = req.body || {};
  const doctorId = await doctorForPatient(req.patientId, patientId);
  if (!doctorId) return fail(res, 403, 'Care relationship required');
  if (!validId(deviceId) || ![24, 72].includes(targetHours) || !Number.isFinite(Date.parse(startsAt)) || !Number.isFinite(Date.parse(reviewDueAt)) || Date.parse(reviewDueAt) <= Date.parse(startsAt) || typeof instructions !== 'string' || !instructions.trim() || instructions.length > 3000 || !Array.isArray(symptoms) || symptoms.some(value => !['dizziness', 'discomfort', 'palpitations', 'breathlessness', 'other'].includes(value))) return fail(res, 400, 'Invalid monitoring plan');
  const assigned = await db().query('select 1 from patient_device_assignments where device_id=$1 and patient_id=$2 and unpaired_at is null', [deviceId, patientId]);
  if (!assigned.rowCount) return fail(res, 409, 'Device is not assigned to this patient');
  const { rows } = await db().query('insert into monitoring_plans(id,patient_id,doctor_id,device_id,target_hours,starts_at,review_due_at,instructions,symptoms) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *', [randomUUID(), patientId, doctorId, deviceId, targetHours, startsAt, reviewDueAt, instructions.trim(), symptoms]);
  res.status(201).json({ plan: rows[0] });
}));

router.get('/caregivers', wrap(async (req, res) => {
  const { rows } = await db().query('select id,invite_email,scopes,notify,expires_at,accepted_at,revoked_at,phone_verified_at,created_at from caregiver_grants where patient_id=$1 order by created_at desc', [req.patientId]);
  res.json({ caregivers: rows });
}));

router.post('/caregivers', wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase(), scopes = req.body?.scopes, notify = !!req.body?.notify;
  const allowed = ['overview', 'measurements', 'appointments', 'ecg_reports'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !Array.isArray(scopes) || !scopes.length || scopes.some(value => !allowed.includes(value)) || new Set(scopes).size !== scopes.length) return fail(res, 400, 'Choose an email and explicit viewing permissions');
  const own = await db().query("select 1 from app_users where id=$1 and lower(data->>'email')=$2", [req.patientId, email]);
  if (own.rowCount) return fail(res, 400, 'Invite a different person');
  const token = randomBytes(32).toString('base64url');
  try {
    const { rows } = await db().query("insert into caregiver_grants(id,patient_id,invite_email,token_hash,scopes,notify,expires_at) values($1,$2,$3,$4,$5,$6,now()+interval '7 days') returning id,invite_email,scopes,notify,expires_at", [randomUUID(), req.patientId, email, hash(token), scopes, notify]);
    res.status(201).json({ invitation: rows[0], token });
  } catch (error: any) {
    if (error.code === '23505') return fail(res, 409, 'An active invitation exists for this email. Revoke it before changing permissions.');
    throw error;
  }
}));

router.post('/caregivers/accept', wrap(async (req, res) => {
  const token = String(req.body?.token || '');
  if (token.length < 32 || token.length > 128) return fail(res, 400, 'Invalid invitation');
  const { rows } = await db().query(`update caregiver_grants g set caregiver_user_id=$2,accepted_at=now()
    where g.token_hash=$1 and g.revoked_at is null and g.accepted_at is null and g.expires_at>now()
    and exists(select 1 from app_users u where u.id=$2 and lower(u.data->>'email')=g.invite_email)
    returning id,patient_id,scopes,notify`, [hash(token), req.patientId]);
  if (!rows[0]) return fail(res, 403, 'Invitation unavailable or email does not match');
  res.json({ grant: rows[0] });
}));

router.delete('/caregivers/:id', wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, 'Invalid invitation');
  const { rowCount } = await db().query('update caregiver_grants set revoked_at=now() where id=$1 and patient_id=$2 and revoked_at is null', [req.params.id, req.patientId]);
  if (!rowCount) return fail(res, 404, 'Invitation unavailable');
  await db().query("update bp_alert_events set status='expired' where grant_id=$1 and status='pending'", [req.params.id]);
  res.json({ success: true });
}));

router.patch('/caregivers/:id', wrap(async (req, res) => {
  const allowed = ['overview', 'measurements', 'appointments', 'ecg_reports'];
  const { scopes, notify } = req.body || {};
  if (!validId(req.params.id) || !Array.isArray(scopes) || !scopes.length || scopes.some(value => !allowed.includes(value)) || new Set(scopes).size !== scopes.length || typeof notify !== 'boolean') return fail(res, 400, 'Choose explicit viewing and notification permissions');
  const { rows } = await db().query('update caregiver_grants set scopes=$3,notify=$4 where id=$1 and patient_id=$2 and revoked_at is null returning id,invite_email,scopes,notify,accepted_at,revoked_at', [req.params.id, req.patientId, scopes, notify]);
  if (!rows[0]) return fail(res, 404, 'Invitation unavailable');
  if (!notify) await db().query("update bp_alert_events set status='expired' where grant_id=$1 and status='pending'", [req.params.id]);
  res.json({ grant: rows[0] });
}));

router.get('/caregiver/shared/:patientId', wrap(async (req, res) => {
  const { rows } = await db().query('select scopes,notify from caregiver_grants where patient_id=$1 and caregiver_user_id=$2 and accepted_at is not null and revoked_at is null order by accepted_at desc limit 1', [req.params.patientId, req.patientId]);
  const grant = rows[0];
  if (!grant) return fail(res, 403, 'No active permission');
  const shared: Record<string, unknown> = { scopes: grant.scopes, notify: grant.notify };
  if (grant.scopes.includes('overview')) shared.overview = (await db().query("select data->>'name' name from app_users where id=$1", [req.params.patientId])).rows[0];
  if (grant.scopes.includes('measurements')) shared.measurements = (await db().query('select kind,value,unit,measured_at from patient_health_measurements where patient_id=$1 order by measured_at desc limit 100', [req.params.patientId])).rows;
  if (grant.scopes.includes('appointments')) shared.appointments = (await db().query('select start_at,end_at,status from scheduled_appointments where patient_id=$1 and start_at>now() order by start_at limit 20', [req.params.patientId])).rows;
  if (grant.scopes.includes('ecg_reports')) shared.ecgReports = (await db().query('select id,started_at,ended_at,status,sample_count,target_hours from ecg_recording_sessions where patient_id=$1 and not is_simulated order by started_at desc limit 20', [req.params.patientId])).rows;
  res.json(shared);
}));

router.get('/devices/:id/diagnostics', wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, 'Invalid device');
  const { rows } = await db().query(`select d.id,d.model,d.firmware_version,d.last_seen_at,d.status,
    t.battery_percent,t.queued_batches,t.sync_failures,t.reported_at
    from devices d join patient_device_assignments a on a.device_id=d.id and a.patient_id=$2 and a.unpaired_at is null
    left join lateral(select * from device_telemetry where device_id=d.id order by reported_at desc limit 1) t on true where d.id=$1`, [req.params.id, req.patientId]);
  if (!rows[0]) return fail(res, 404, 'Device unavailable');
  const [history, telemetry, requests] = await Promise.all([
    db().query('select action,created_at from device_audit_logs where device_id=$1 and patient_id=$2 order by created_at desc limit 30', [req.params.id, req.patientId]),
    db().query('select reported_at,battery_percent,queued_batches,sync_failures from device_telemetry where device_id=$1 order by reported_at desc limit 30', [req.params.id]),
    db().query('select id,request_type,issue,status,created_at from device_support_requests where device_id=$1 and patient_id=$2 order by created_at desc limit 30', [req.params.id, req.patientId]),
  ]);
  res.json({ device: rows[0], history: history.rows, telemetry: telemetry.rows, supportRequests: requests.rows });
}));

router.post('/devices/:id/support', wrap(async (req, res) => {
  if (!validId(req.params.id) || !['support', 'replacement'].includes(req.body?.requestType) || typeof req.body?.issue !== 'string' || req.body.issue.trim().length < 10 || req.body.issue.length > 2000) return fail(res, 400, 'Choose support or replacement and describe the issue in 10–2000 characters');
  const { rows } = await db().query(`insert into device_support_requests(id,device_id,patient_id,request_type,issue)
    select $1,a.device_id,$2,$3,$4 from patient_device_assignments a where a.device_id=$5 and a.patient_id=$2 and a.unpaired_at is null returning *`, [randomUUID(), req.patientId, req.body.requestType, req.body.issue.trim(), req.params.id]);
  if (!rows[0]) return fail(res, 404, 'Device unavailable');
  let emailStatus = 'not_configured';
  const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.SUPPORT_EMAIL || 'letstalks.support@gmail.com';
  if (key && from) {
    try {
      const result = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject: `Heartline device ${req.body.requestType} request`, text: `Request ID: ${rows[0].id}\nDevice ID: ${req.params.id}\nRequest type: ${req.body.requestType}\n\nIssue:\n${req.body.issue.trim()}` }),
        signal: AbortSignal.timeout(10000),
      });
      emailStatus = result.ok ? 'sent' : 'failed';
    } catch { emailStatus = 'failed'; }
  }
  res.status(201).json({ request: rows[0], emailStatus });
}));

router.get('/export/fhir', wrap(async (req, res) => {
  const id = req.patientId;
  const [user, measurements, allergies, medications, sessions] = await Promise.all([
    db().query("select data->>'name' name from app_users where id=$1", [id]),
    db().query('select id,kind,value,unit,measured_at,source from patient_health_measurements where patient_id=$1 order by measured_at desc limit 1000', [id]),
    db().query('select id,substance,reaction,severity,created_at from patient_allergies where patient_id=$1 order by created_at desc limit 200', [id]),
    db().query('select id,name,dosage,frequency,start_date,end_date,status,created_at from patient_medications where patient_id=$1 order by created_at desc limit 200', [id]),
    db().query("select s.id,s.started_at,s.ended_at,s.status,s.is_simulated,r.summary,r.signed_at from ecg_recording_sessions s left join ecg_doctor_reviews r on r.session_id=s.id and r.released_at is not null where s.patient_id=$1 order by s.started_at desc limit 100", [id]),
  ]);
  const patientRef = `urn:uuid:${randomUUID()}`;
  const entry: Array<{ fullUrl: string; resource: Record<string, unknown> }> = [{ fullUrl: patientRef, resource: { resourceType: 'Patient', identifier: [{ system: 'urn:heartline:patient', value: id }], name: [{ text: user.rows[0]?.name || 'Patient' }] } }];
  const codes: Record<string, [string, string]> = { heart_rate: ['8867-4', 'Heart rate'], systolic_bp: ['8480-6', 'Systolic blood pressure'], diastolic_bp: ['8462-4', 'Diastolic blood pressure'], blood_glucose: ['2339-0', 'Glucose'], oxygen: ['59408-5', 'Oxygen saturation'], weight: ['29463-7', 'Body weight'] };
  for (const item of measurements.rows) {
    const [code, display] = codes[item.kind] || [item.kind, item.kind];
    entry.push({ fullUrl: `urn:uuid:${item.id}`, resource: { resourceType: 'Observation', id: item.id, status: 'final', category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }], code: { coding: [{ system: 'http://loinc.org', code, display }] }, subject: { reference: patientRef }, effectiveDateTime: item.measured_at, valueQuantity: { value: Number(item.value), unit: item.unit }, method: { text: `Source recorded by Heartline: ${item.source}` } } });
  }
  for (const item of allergies.rows) entry.push({ fullUrl: `urn:uuid:${item.id}`, resource: { resourceType: 'AllergyIntolerance', id: item.id, patient: { reference: patientRef }, code: { text: item.substance }, recordedDate: item.created_at, note: item.reaction ? [{ text: `Patient recorded reaction: ${item.reaction}` }] : undefined } });
  for (const item of medications.rows) entry.push({ fullUrl: `urn:uuid:${item.id}`, resource: { resourceType: 'MedicationStatement', id: item.id, status: 'recorded', medication: { concept: { text: item.name } }, subject: { reference: patientRef }, dateAsserted: item.created_at, effectivePeriod: item.start_date || item.end_date ? { start: item.start_date || undefined, end: item.end_date || undefined } : undefined, renderedDosageInstruction: [item.dosage, item.frequency].filter(Boolean).join(' · ') || undefined, note: [{ text: `Patient medication list status: ${item.status}` }] } });
  for (const item of sessions.rows) entry.push({ fullUrl: `urn:uuid:${item.id}`, resource: { resourceType: 'DiagnosticReport', id: item.id, status: item.summary ? 'final' : 'preliminary', code: { text: item.is_simulated ? 'SIMULATED ECG recording technical summary - test data' : 'Holter ECG recording technical summary' }, subject: { reference: patientRef }, effectivePeriod: { start: item.started_at, end: item.ended_at || undefined }, conclusion: item.summary || undefined, issued: item.signed_at || undefined } });
  res.set('Content-Type', 'application/fhir+json');
  res.set('Content-Disposition', 'attachment; filename="heartline-fhir-r5.json"');
  res.json({ resourceType: 'Bundle', type: 'collection', timestamp: new Date().toISOString(), entry });
}));

router.use((error: any, _req: any, res: any, _next: any) => {
  console.error('Monitoring request failed', error.code || error.name);
  fail(res, 500, 'Monitoring request failed');
});

export default router;
