import { getPool } from '../config/db.js';

const sid = () => process.env.TWILIO_ACCOUNT_SID || '';
const token = () => process.env.TWILIO_AUTH_TOKEN || '';
const verifySid = () => process.env.TWILIO_VERIFY_SERVICE_SID || '';
const messagingSid = () => process.env.TWILIO_MESSAGING_SERVICE_SID || '';
export const bpSmsConfigured = () => /^AC[0-9a-f]{32}$/i.test(sid()) && !!token() && /^VA[0-9a-f]{32}$/i.test(verifySid()) && /^MG[0-9a-f]{32}$/i.test(messagingSid());

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
      and g.phone_verified_at is not null and g.phone_e164 is not null
      and $4::numeric > case when $3='systolic_bp' then s.systolic_limit else s.diastolic_limit end
    on conflict(measurement_id,grant_id) do nothing`, [patientId, measurement.id, measurement.kind, Number(measurement.value)]);
  return rowCount || 0;
}

let processing = false;
export async function processBpAlerts() {
  if (!bpSmsConfigured() || processing) return;
  processing = true;
  try {
    await getPool().query("update bp_alert_events set status='expired' where status='pending' and created_at<now()-interval '10 minutes'");
    await getPool().query("update bp_alert_events set status='failed',failure_code='submission state unknown after interruption' where status='sending' and created_at<now()-interval '10 minutes'");
    for (let i = 0; i < 20; i++) {
      const { rows } = await getPool().query(`with candidate as (
        select e.id from bp_alert_events e join caregiver_grants g on g.id=e.grant_id
          join patient_bp_alert_settings s on s.patient_id=e.patient_id
        where e.status='pending' and e.created_at>now()-interval '10 minutes'
          and s.enabled and g.notify and g.revoked_at is null and g.phone_verified_at is not null
        order by e.created_at for update of e skip locked limit 1
      ) update bp_alert_events e set status='sending' from candidate c,caregiver_grants g
        where e.id=c.id and g.id=e.grant_id returning e.id,g.phone_e164`);
      const alert = rows[0];
      if (!alert) break;
      try {
        const permission = await getPool().query(`select 1 from bp_alert_events e
          join caregiver_grants g on g.id=e.grant_id
          join patient_bp_alert_settings s on s.patient_id=e.patient_id
          where e.id=$1 and e.status='sending' and s.enabled and g.notify
            and g.revoked_at is null and g.phone_verified_at is not null and g.phone_e164=$2`, [alert.id, alert.phone_e164]);
        if (!permission.rowCount) { await getPool().query("update bp_alert_events set status='expired' where id=$1", [alert.id]); continue; }
        const result = await twilio(`api.twilio.com/2010-04-01/Accounts/${sid()}/Messages.json`, {
          To: alert.phone_e164,
          MessagingServiceSid: messagingSid(),
          Body: 'Heartline: a blood pressure reading exceeded the alert limit you agreed to receive. Please contact your family member to confirm the reading. This is not an emergency service.',
        });
        await getPool().query("update bp_alert_events set status='submitted',provider_message_id=$2,submitted_at=now() where id=$1", [alert.id, result.sid || null]);
      } catch (error) {
        await getPool().query("update bp_alert_events set status='failed',failure_code=$2 where id=$1", [alert.id, error instanceof Error ? error.message.slice(0, 100) : 'provider error']);
      }
    }
  } finally { processing = false; }
}

export function startBpAlertWorker() {
  if (!bpSmsConfigured()) return;
  const timer = setInterval(() => { void processBpAlerts().catch(error => console.error('BP alert worker error', error)); }, 10000);
  timer.unref();
  void processBpAlerts().catch(error => console.error('BP alert worker error', error));
}
