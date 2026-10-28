import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = process.env.PG_TEST_DATABASE_URL;
const local = url && ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);

test('BP SMS is submitted only for a verified caregiver and records provider failures', { skip: !local }, async () => {
  process.env.DATABASE_URL = url;
  process.env.TWILIO_ACCOUNT_SID = `AC${'a'.repeat(32)}`;
  process.env.TWILIO_AUTH_TOKEN = 'test-token';
  process.env.TWILIO_SMS_FROM = '+12025550100';
  process.env.TWILIO_VOICE_FROM = '';
  process.env.RESEND_API_KEY = '';
  const { getPool } = await import('../dist/config/db.js');
  const { enqueueBpAlerts, processBpAlerts } = await import('../dist/lib/bpAlerts.js');
  const db = getPool(), patient = randomUUID(), caregiver = randomUUID(), grant = randomUUID();
  const originalFetch = globalThis.fetch;
  let requests = [], reject = false;
  globalThis.fetch = async (target, options) => {
    requests.push({ target, fields: Object.fromEntries(options.body) });
    return new Response(JSON.stringify(reject ? { message: 'rejected' } : { sid: 'SMtest' }), { status: reject ? 400 : 201, headers: { 'content-type': 'application/json' } });
  };
  try {
    await db.query('insert into app_users(id,data) values($1,$2),($3,$4)', [patient, {name:'Patient',email:`${patient}@example.test`}, caregiver, {name:'Caregiver',email:`${caregiver}@example.test`}]);
    await db.query("insert into caregiver_grants(id,patient_id,invite_email,token_hash,scopes,notify,expires_at,caregiver_user_id,accepted_at,phone_e164,phone_verified_at) values($1,$2,$3,$4,array['overview'],true,now()+interval '1 day',$5,now(),'+12025550101',now())", [grant,patient,`${caregiver}@example.test`,randomUUID(),caregiver]);
    await db.query('insert into patient_bp_alert_settings(patient_id,enabled,systolic_limit) values($1,true,140)', [patient]);
    async function reading(value) {
      const id = randomUUID(), measuredAt = new Date();
      await db.query("insert into patient_health_measurements(id,patient_id,kind,value,unit,measured_at) values($1,$2,'systolic_bp',$3,'mmHg',$4)", [id,patient,value,measuredAt]);
      return enqueueBpAlerts(patient,{id,kind:'systolic_bp',value,unit:'mmHg',measured_at:measuredAt});
    }
    assert.equal(await reading(120), 0);
    assert.equal(await reading(150), 1);
    await processBpAlerts();
    assert.equal(requests.length, 1);
    assert.match(requests[0].target, /Messages\.json$/);
    assert.equal(requests[0].fields.To, '+12025550101');
    assert.equal((await db.query('select sms_status from bp_alert_events where patient_id=$1', [patient])).rows[0].sms_status, 'submitted');
    reject = true;
    assert.equal(await reading(151), 1);
    await processBpAlerts();
    assert.equal((await db.query("select count(*)::int n from bp_alert_events where patient_id=$1 and sms_status='failed'", [patient])).rows[0].n, 1);
    await db.query('update caregiver_grants set phone_verified_at=null where id=$1', [grant]);
    assert.equal(await reading(152), 1); // The invitation's email is still eligible.
    await processBpAlerts();
    assert.equal(requests.length, 2, 'an unverified phone must not receive SMS');
  } finally { globalThis.fetch = originalFetch; await db.end(); }
});
