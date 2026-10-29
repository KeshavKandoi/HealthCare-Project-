import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {createTestAlerts, testAlertContent, providerOutcome, highBpReadingAt} from '../dist/lib/bpTestAlerts.js';

const reading={systolic:172,diastolic:106,recordedAt:new Date('2026-10-30T05:41:00Z')};

test('test alert wording matches the hospital alert templates and fills in the reading',()=>{
  const content=testAlertContent(reading,'Asia/Kolkata');
  assert.equal(content.subject,'Heartline | High Blood Pressure Alert — TEST');
  assert.match(content.text,/^HIGH BLOOD PRESSURE ALERT/);
  assert.match(content.text,/Blood Pressure: 172\/106 mmHg/);
  assert.match(content.text,/Recorded at: .*11:11.*IST/i);
  assert.match(content.text,/part of a simulated monitoring test\.$/);
  assert.match(content.sms,/^HEARTLINE BP ALERT — TEST: Elevated BP 172\/106 mmHg at .+\. Please review the reading\. Simulated monitoring event\.$/);
  assert.match(content.voice,/reading is 172 over 106 millimeters of mercury/);
  assert.match(content.twiml,/^<Response><Pause length="1"\/><Say voice="Polly\.Joanna-Neural"/);
  assert.match(content.html,/HIGH BLOOD PRESSURE ALERT/);
  assert.ok(!content.twiml.includes('<script'));
});

test('provider states map only to statuses the provider actually reported',()=>{
  assert.equal(providerOutcome.email('sent'),'submitted');assert.equal(providerOutcome.email('delivered'),'delivered');assert.equal(providerOutcome.email('bounced'),'failed');
  assert.equal(providerOutcome.sms('sent'),'submitted');assert.equal(providerOutcome.sms('delivered'),'delivered');assert.equal(providerOutcome.sms('undelivered'),'failed');
  assert.equal(providerOutcome.voice('ringing'),'submitted');assert.equal(providerOutcome.voice('completed'),'delivered');assert.equal(providerOutcome.voice('no-answer'),'failed');
});

test('the monitors and the alert use the same High blood pressure reading',()=>{
  const value=highBpReadingAt('2026-10-30T05:41:03.000Z');
  assert.ok(value.systolic>=160&&value.systolic<=180);assert.ok(value.diastolic>=100&&value.diastolic<=110);
});

test('one trigger sends one email, SMS and call through mocked providers, independently and without duplicates',{skip:process.env.ECG_INTEGRATION_TEST!=='1'},async()=>{
  Object.assign(process.env,{RESEND_API_KEY:'re_mock',RESEND_FROM_EMAIL:'alerts@example.test',TWILIO_ACCOUNT_SID:'AC'+'0'.repeat(32),TWILIO_AUTH_TOKEN:'mock',TWILIO_SMS_FROM:'+15005550006',TWILIO_VOICE_FROM:'+15005550006'});
  const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
  const account=`operator-${randomUUID()}@example.test`;
  const calls=[];let failSms=false;const remote={};
  const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  const fetcher=async(url,init={})=>{
    calls.push({url,method:init.method||'GET',body:String(init.body||'')});
    if(url==='https://api.resend.com/emails')return reply(200,{id:`email-${calls.length}`});
    if(url.endsWith('/Messages.json'))return failSms?reply(400,{code:21608,message:'The number is unverified'}):reply(201,{sid:`SM${calls.length}`,status:'queued'});
    if(url.endsWith('/Calls.json'))return reply(201,{sid:`CA${calls.length}`,status:'queued'});
    const id=decodeURIComponent(url.split('/').pop().replace('.json',''));
    if(url.includes('/emails/'))return reply(200,{id,last_event:remote[id]||'sent'});
    return reply(200,{sid:id,status:remote[id]||'sent'});
  };
  const alerts=createTestAlerts({pool:()=>pool,fetcher,config:()=>({account,email:account,phone:'+919876543210',timeZone:'Asia/Kolkata'}),refreshAfterMs:0});
  const settle=async()=>{for(let i=0;i<60;i++){await alerts.processPending();const {rows}=await pool.query("select count(*)::int n from healthcare_private.bp_test_alerts a, jsonb_each(a.deliveries) c where a.account_email=$1 and c.value->>'status' in ('pending','sending')",[account]);if(!rows[0].n)return;await new Promise(r=>setTimeout(r,50))}throw new Error('deliveries did not settle')};
  try{
    const first=await alerts.trigger({triggerKey:`test:${randomUUID()}`,reading});
    assert.equal(first.recorded,true);
    await settle();
    const sent=calls.filter(c=>c.method==='POST');
    assert.equal(sent.length,3);
    assert.match(sent.find(c=>c.url.endsWith('/emails')).body,/172\/106 mmHg/);
    assert.match(decodeURIComponent(sent.find(c=>c.url.endsWith('/Messages.json')).body.replaceAll('+',' ')),/Elevated BP 172\/106 mmHg/);
    assert.match(decodeURIComponent(sent.find(c=>c.url.endsWith('/Calls.json')).body.replaceAll('+',' ')),/172 over 106/);
    // The same trigger again (a retried request) is ignored and sends nothing.
    const repeatKey=`test:${randomUUID()}`;await alerts.trigger({triggerKey:repeatKey,reading});await settle();
    const before=calls.filter(c=>c.method==='POST').length;
    assert.equal((await alerts.trigger({triggerKey:repeatKey,reading})).recorded,false);
    await settle();assert.equal(calls.filter(c=>c.method==='POST').length,before);
    // A rejected SMS does not stop the email or the call.
    failSms=true;const partial=await alerts.trigger({triggerKey:`test:${randomUUID()}`,reading});await settle();
    const {rows:[row]}=await pool.query('select deliveries from healthcare_private.bp_test_alerts where id=$1',[partial.id]);
    assert.equal(row.deliveries.sms.status,'failed');assert.match(row.deliveries.sms.detail,/unverified/);assert.equal(row.deliveries.sms.providerStatus,'HTTP 400');
    assert.equal(row.deliveries.email.status,'submitted');assert.equal(row.deliveries.voice.status,'submitted');
    // Provider updates become Delivered only when the provider reports it.
    for(const [key,value] of Object.entries(row.deliveries))if(value.providerId)remote[value.providerId]=key==='email'?'delivered':'completed';
    const listed=await alerts.listFor(account);
    assert.equal(listed.authorized,true);
    const updated=listed.alerts.find(item=>item.id===partial.id).deliveries;
    assert.equal(updated.email.recipient,account);
    assert.equal(updated.email.status,'delivered');assert.equal(updated.voice.status,'delivered');assert.equal(updated.sms.status,'failed');
    assert.ok(updated.email.history.length>=3);
    // Other accounts see the alert and its statuses, but never the contact details.
    const shared=await alerts.listFor('someone-else@example.test');
    assert.equal(shared.authorized,false);
    const seen=shared.alerts.find(item=>item.id===partial.id).deliveries;
    assert.equal(seen.email.status,'delivered');assert.equal(seen.email.recipient,null);assert.equal(seen.sms.recipient,null);
    // Without configured contacts the alert is still recorded, but nothing is sent.
    const unconfigured=createTestAlerts({pool:()=>pool,fetcher,config:()=>({account:null,email:null,phone:null,timeZone:'Asia/Kolkata'})});
    const skipped=await unconfigured.trigger({triggerKey:`test:${randomUUID()}`,reading});
    const postsBefore=calls.filter(c=>c.method==='POST').length;
    assert.equal(skipped.recorded,true);assert.equal(skipped.deliveries.email.status,'not_configured');assert.equal(skipped.deliveries.voice.status,'not_configured');
    await unconfigured.processPending();assert.equal(calls.filter(c=>c.method==='POST').length,postsBefore);
    await pool.query('delete from healthcare_private.bp_test_alerts where id=$1',[skipped.id]);
  }finally{
    await pool.query('delete from healthcare_private.bp_test_alerts where account_email=$1',[account]);
    await pool.end();
  }
});
