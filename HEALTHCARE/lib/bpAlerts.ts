import { getPool } from '../config/db.js';

const sid = () => process.env.TWILIO_ACCOUNT_SID || '';
const token = () => process.env.TWILIO_AUTH_TOKEN || '';
const verifySid = () => process.env.TWILIO_VERIFY_SERVICE_SID || '';
const twilioConfigured = () => /^AC[0-9a-f]{32}$/i.test(sid()) && !!token();
export const bpVerificationConfigured = () => twilioConfigured() && /^VA[0-9a-f]{32}$/i.test(verifySid());
export const bpEmailConfigured = () => !!process.env.RESEND_API_KEY && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.RESEND_FROM_EMAIL || '');
export const bpVoiceConfigured = () => twilioConfigured() && /^\+[1-9]\d{7,14}$/.test(process.env.TWILIO_VOICE_FROM || '');
export const bpSmsConfigured = () => twilioConfigured() && /^\+[1-9]\d{7,14}$/.test(process.env.TWILIO_SMS_FROM || '');
export const bpDeliveryConfigured = () => bpEmailConfigured() || bpVoiceConfigured() || bpSmsConfigured();

async function twilio(path: string, fields: Record<string, string>) {
  const response = await fetch(`https://${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid()}:${token()}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json() as { sid?: string; status?: string; code?: number; message?: string };
  if (!response.ok) throw new Error(`SMS provider rejected request (${response.status})`);
  return result;
}

export const startPhoneVerification = (phone: string) => twilio(`verify.twilio.com/v2/Services/${verifySid()}/Verifications`, { To: phone, Channel: 'sms' });
export const checkPhoneVerification = (phone: string, code: string) => twilio(`verify.twilio.com/v2/Services/${verifySid()}/VerificationCheck`, { To: phone, Code: code });

export async function enqueueBpAlerts(patientId: string, measurement: { id: string; kind: string; value: number | string; unit: string; measured_at: string | Date }) {
  if (!['systolic_bp', 'diastolic_bp'].includes(measurement.kind) || measurement.unit.toLowerCase() !== 'mmhg') return 0;
  const age = Date.now() - Date.parse(String(measurement.measured_at));
  if (age < -60000 || age > 5 * 60000) return 0;
  const { rowCount } = await getPool().query(`insert into bp_alert_events(id,patient_id,measurement_id,grant_id,kind,value,limit_value)
    select gen_random_uuid(),$1,$2,g.id,$3,$4::numeric,
      case when $3='systolic_bp' then s.systolic_limit else s.diastolic_limit end
    from patient_bp_alert_settings s join caregiver_grants g on g.patient_id=s.patient_id
    where s.patient_id=$1 and s.enabled and g.notify and g.accepted_at is not null and g.revoked_at is null
      and (g.invite_email is not null or (g.phone_verified_at is not null and g.phone_e164 is not null))
      and $4::numeric > case when $3='systolic_bp' then s.systolic_limit else s.diastolic_limit end
    on conflict(measurement_id,grant_id) do nothing`, [patientId, measurement.id, measurement.kind, Number(measurement.value)]);
  return rowCount || 0;
}

let processing = false;
const alertMessage = 'Heartline alert: a blood pressure reading exceeded the limit set in the app. Please contact your family member to confirm the reading and follow their clinician\'s care plan. This is not an emergency service.';

async function sendEmail(to: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [to], subject: 'Heartline blood pressure alert', text: alertMessage }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Email provider rejected request (${response.status})`);
  return (await response.json() as { id?: string }).id || null;
}

async function sendVoice(to: string) {
  const xml = `<Response><Say>${alertMessage.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</Say></Response>`;
  const result = await twilio(`api.twilio.com/2010-04-01/Accounts/${sid()}/Calls.json`, {
    To: to, From: process.env.TWILIO_VOICE_FROM || '', Twiml: xml,
  });
  return result.sid || null;
}

async function sendSms(to: string) {
  const result = await twilio(`api.twilio.com/2010-04-01/Accounts/${sid()}/Messages.json`, {
    To: to, From: process.env.TWILIO_SMS_FROM || '',
    Body: 'Heartline: A blood pressure reading exceeded the limit set in the app. Please check on your family member and follow their care plan.',
  });
  return result.sid || null;
}

export async function processBpAlerts() {
  if (!bpDeliveryConfigured() || processing) return;
  processing = true;
  try {
    await getPool().query("update bp_alert_events set status='expired' where status='pending' and created_at<now()-interval '10 minutes'");
    await getPool().query("update bp_alert_events set status='failed',failure_code='submission state unknown after interruption' where status='sending' and created_at<now()-interval '10 minutes'");
    for (let i = 0; i < 20; i++) {
      const { rows } = await getPool().query(`with candidate as (
        select e.id from bp_alert_events e join caregiver_grants g on g.id=e.grant_id
          join patient_bp_alert_settings s on s.patient_id=e.patient_id
        where e.status='pending' and e.created_at>now()-interval '10 minutes'
          and s.enabled and g.notify and g.accepted_at is not null and g.revoked_at is null
        order by e.created_at for update of e skip locked limit 1
      ) update bp_alert_events e set status='sending' from candidate c,caregiver_grants g
        where e.id=c.id and g.id=e.grant_id returning e.id,g.phone_e164,g.phone_verified_at,g.invite_email`);
      const alert = rows[0];
      if (!alert) break;
      try {
        const permission = await getPool().query(`select g.phone_e164,g.phone_verified_at,g.invite_email from bp_alert_events e
          join caregiver_grants g on g.id=e.grant_id
          join patient_bp_alert_settings s on s.patient_id=e.patient_id
          where e.id=$1 and e.status='sending' and s.enabled and g.notify
            and g.accepted_at is not null and g.revoked_at is null`, [alert.id]);
        if (!permission.rowCount) { await getPool().query("update bp_alert_events set status='expired' where id=$1", [alert.id]); continue; }
        const recipient = permission.rows[0];
        const delivery = await Promise.allSettled([
          bpEmailConfigured() && recipient.invite_email ? sendEmail(recipient.invite_email) : Promise.resolve(null),
          bpVoiceConfigured() && recipient.phone_verified_at && recipient.phone_e164 ? sendVoice(recipient.phone_e164) : Promise.resolve(null),
          bpSmsConfigured() && recipient.phone_verified_at && recipient.phone_e164 ? sendSms(recipient.phone_e164) : Promise.resolve(null),
        ]);
        const emailSent = delivery[0].status === 'fulfilled' && !!delivery[0].value;
        const voiceSent = delivery[1].status === 'fulfilled' && !!delivery[1].value;
        const smsSent = delivery[2].status === 'fulfilled' && !!delivery[2].value;
        await getPool().query(`update bp_alert_events set status=$2,email_status=$3,voice_status=$4,
          email_provider_id=$5,voice_provider_id=$6,sms_status=$7,sms_provider_id=$8,submitted_at=case when $2='submitted' then now() else null end,
          failure_code=case when $2='failed' then 'No configured channel accepted alert' else null end where id=$1`,
          [alert.id, emailSent || voiceSent || smsSent ? 'submitted' : 'failed', emailSent ? 'submitted' : delivery[0].status === 'rejected' ? 'failed' : 'skipped',
            voiceSent ? 'submitted' : delivery[1].status === 'rejected' ? 'failed' : 'skipped',
            emailSent && delivery[0].status === 'fulfilled' ? delivery[0].value : null,
            voiceSent && delivery[1].status === 'fulfilled' ? delivery[1].value : null,
            smsSent ? 'submitted' : delivery[2].status === 'rejected' ? 'failed' : 'skipped',
            smsSent && delivery[2].status === 'fulfilled' ? delivery[2].value : null]);
      } catch (error) {
        await getPool().query("update bp_alert_events set status='failed',failure_code=$2 where id=$1", [alert.id, error instanceof Error ? error.message.slice(0, 100) : 'provider error']);
      }
    }
  } finally { processing = false; }
}

export function startBpAlertWorker() {
  if (!bpDeliveryConfigured()) return;
  const timer = setInterval(() => { void processBpAlerts().catch(error => console.error('BP alert worker error', error)); }, 10000);
  timer.unref();
  void processBpAlerts().catch(error => console.error('BP alert worker error', error));
}
