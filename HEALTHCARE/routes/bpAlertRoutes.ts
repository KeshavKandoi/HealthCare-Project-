import { express } from '../serverDependencies.js';
import { getPool } from '../config/db.js';
import { patientAuth } from '../middlewares/ecgAuth.js';
import { bpVerificationConfigured, bpEmailConfigured, bpVoiceConfigured, bpSmsConfigured, startPhoneVerification, checkPhoneVerification } from '../lib/bpAlerts.js';

const router = express.Router();
router.use(patientAuth);
const wrap = (fn: (req: any, res: any) => Promise<unknown>) => (req: any, res: any, next: (error?: Error) => void) => Promise.resolve(fn(req, res)).catch(next);
const fail = (res: any, code: number, message: string) => res.status(code).json({ message });
const validId = (id: unknown) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);

router.get('/settings', wrap(async (req, res) => {
  const [settings, alerts] = await Promise.all([
    getPool().query('select enabled,systolic_limit,diastolic_limit,updated_at from patient_bp_alert_settings where patient_id=$1', [req.patientId]),
    getPool().query(`select e.id,e.kind,e.value,e.limit_value,e.status,e.email_status,e.voice_status,e.sms_status,e.created_at,g.invite_email
      from bp_alert_events e join caregiver_grants g on g.id=e.grant_id
      where e.patient_id=$1 order by e.created_at desc limit 30`, [req.patientId]),
  ]);
  res.json({ settings: settings.rows[0] || { enabled: false, systolic_limit: null, diastolic_limit: null }, alerts: alerts.rows,
    verificationConfigured: bpVerificationConfigured(), emailConfigured: bpEmailConfigured(), voiceConfigured: bpVoiceConfigured(), smsConfigured: bpSmsConfigured() });
}));

router.put('/settings', wrap(async (req, res) => {
  const { enabled, systolicLimit, diastolicLimit } = req.body || {};
  const systolic = systolicLimit === '' || systolicLimit == null ? null : Number(systolicLimit);
  const diastolic = diastolicLimit === '' || diastolicLimit == null ? null : Number(diastolicLimit);
  if (typeof enabled !== 'boolean' || (enabled && systolic == null && diastolic == null)
    || (systolic != null && (!Number.isInteger(systolic) || systolic < 90 || systolic > 250))
    || (diastolic != null && (!Number.isInteger(diastolic) || diastolic < 50 || diastolic > 150))) return fail(res, 400, 'Choose valid limits in mmHg');
  const { rows } = await getPool().query(`insert into patient_bp_alert_settings(patient_id,enabled,systolic_limit,diastolic_limit)
    values($1,$2,$3,$4) on conflict(patient_id) do update set enabled=excluded.enabled,
    systolic_limit=excluded.systolic_limit,diastolic_limit=excluded.diastolic_limit,updated_at=now()
    returning enabled,systolic_limit,diastolic_limit,updated_at`, [req.patientId, enabled, systolic, diastolic]);
  if (!enabled) await getPool().query("update bp_alert_events set status='expired' where patient_id=$1 and status='pending'", [req.patientId]);
  res.json({ settings: rows[0] });
}));

router.get('/caregiver/grants', wrap(async (req, res) => {
  const { rows } = await getPool().query(`select g.id,g.patient_id,u.data->>'name' patient_name,g.notify,g.phone_e164,g.phone_verified_at
    from caregiver_grants g join app_users u on u.id=g.patient_id
    where g.caregiver_user_id=$1 and g.accepted_at is not null and g.revoked_at is null
    order by g.accepted_at desc`, [req.patientId]);
  res.json({ grants: rows, verificationConfigured: bpVerificationConfigured() });
}));

router.post('/caregiver/grants/:id/phone/start', wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, 'Invalid invitation');
  const phone = String(req.body?.phone || '').trim();
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) return fail(res, 400, 'Enter a phone number with country code, such as +919876543210');
  if (!bpVerificationConfigured()) return fail(res, 503, 'Phone verification is not configured');
  const { rows } = await getPool().query(`update caregiver_grants set phone_e164=$3,phone_verified_at=null,phone_verification_requested_at=now()
    where id=$1 and caregiver_user_id=$2 and accepted_at is not null and revoked_at is null
      and (phone_verification_requested_at is null or phone_verification_requested_at<now()-interval '60 seconds')
    returning id`, [req.params.id, req.patientId, phone]);
  if (!rows[0]) return fail(res, 429, 'Invitation unavailable or verification requested too recently');
  await getPool().query("update bp_alert_events set status='expired' where grant_id=$1 and status='pending'", [req.params.id]);
  try { await startPhoneVerification(phone); res.json({ started: true }); }
  catch { await getPool().query('update caregiver_grants set phone_verification_requested_at=null where id=$1 and caregiver_user_id=$2 and phone_verified_at is null', [req.params.id, req.patientId]); return fail(res, 502, 'SMS verification could not be started'); }
}));

router.post('/caregiver/grants/:id/phone/check', wrap(async (req, res) => {
  if (!validId(req.params.id) || !/^\d{4,10}$/.test(String(req.body?.code || ''))) return fail(res, 400, 'Enter the verification code');
  if (!bpVerificationConfigured()) return fail(res, 503, 'Phone verification is not configured');
  const { rows } = await getPool().query(`select phone_e164 from caregiver_grants where id=$1 and caregiver_user_id=$2 and accepted_at is not null and revoked_at is null`, [req.params.id, req.patientId]);
  if (!rows[0]?.phone_e164) return fail(res, 404, 'Phone verification was not started');
  try {
    const result = await checkPhoneVerification(rows[0].phone_e164, String(req.body.code));
    if (result.status !== 'approved') return fail(res, 400, 'Code not approved');
    const updated = await getPool().query(`update caregiver_grants set phone_verified_at=now() where id=$1 and caregiver_user_id=$2 and phone_e164=$3 and revoked_at is null returning id,phone_e164,phone_verified_at`, [req.params.id, req.patientId, rows[0].phone_e164]);
    if (!updated.rows[0]) return fail(res, 403, 'Invitation no longer active');
    res.json({ grant: updated.rows[0] });
  } catch { return fail(res, 502, 'Could not check the verification code'); }
}));

router.delete('/caregiver/grants/:id/phone', wrap(async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, 'Invalid invitation');
  const result = await getPool().query(`update caregiver_grants set phone_e164=null,phone_verified_at=null,phone_verification_requested_at=null
    where id=$1 and caregiver_user_id=$2 and revoked_at is null returning id`, [req.params.id, req.patientId]);
  if (!result.rows[0]) return fail(res, 404, 'Invitation unavailable');
  await getPool().query("update bp_alert_events set status='expired' where grant_id=$1 and status='pending'", [req.params.id]);
  res.json({ removed: true });
}));

export default router;
