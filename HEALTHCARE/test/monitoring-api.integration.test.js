import test from 'node:test';
import {simulationPacket,scenarioVitals} from '../dist/lib/ecgSimulation.js';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import pg from 'pg';

const testUrl = process.env.PG_TEST_DATABASE_URL;
const localOnly = testUrl && ['localhost', '127.0.0.1', '::1'].includes(new URL(testUrl).hostname);

test('offline backfill, markers, clinician review, caregiver scopes, diagnostics and FHIR export', { skip: !localOnly }, async () => {
  const pool = new pg.Pool({ connectionString: testUrl });
  const patient = randomUUID(), caregiver = randomUUID(), doctorUser = randomUUID(), admin = randomUUID();
  const clinician = randomUUID(), device = randomUUID(), session = randomUUID(), appointmentId = randomUUID(), secret = randomBytes(32).toString('hex');
  const port = 44117;
  const base = `http://localhost:${port}/api/v1`;
  const token = id => id;
  let server;
  const authServer = createServer((req, res) => {
    const id = req.headers.authorization?.replace(/^Bearer /, '');
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/auth/v1/user' && [patient, caregiver, doctorUser, admin].includes(id)) {
      res.end(JSON.stringify({ id, email: `${id}@example.invalid` }));
    } else {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: 'Invalid token' }));
    }
  });
  await new Promise(resolve => authServer.listen(0, '127.0.0.1', resolve));
  try {
    for (const [id, name, email, isAdmin] of [[patient, 'Patient', 'patient@example.invalid', false], [caregiver, 'Caregiver', 'caregiver@example.invalid', false], [doctorUser, 'Clinician', 'clinician@example.invalid', false], [admin, 'Administrator', 'admin@example.invalid', true]]) {
      await pool.query('insert into app_users(id,data) values($1,$2)', [id, { name, email, password: 'test-only-hash', isAdmin }]);
    }
    await pool.query('insert into doctors(id,data) values($1,$2)', [clinician, { name: 'Dr. Test', email: 'doctor@example.invalid' }]);
    await pool.query('insert into doctor_profiles(doctor_id,user_id,verified_at) values($1,$2,now())', [clinician, doctorUser]);
    await pool.query("insert into scheduled_appointments(id,patient_id,doctor_id,start_at,end_at,status) values($1,$2,$3,now()-interval '5 minutes',now()+interval '25 minutes','confirmed')", [appointmentId, patient, clinician]);
    await pool.query("insert into devices(id,model,sample_rate_hz,units,status) values($1,'Test Holter',10,'mV','paired')", [device]);
    await pool.query('insert into device_credentials(device_id,secret_hash) values($1,$2)', [device, createHash('sha256').update(secret).digest('hex')]);
    await pool.query('insert into patient_device_assignments(device_id,patient_id) values($1,$2)', [device, patient]);
    const start = new Date(Date.now() - 2 * 3600000);
    await pool.query("insert into ecg_recording_sessions(id,patient_id,device_id,status,started_at,sample_rate_hz,units,target_hours) values($1,$2,$3,'recording',$4,10,'mV',24)", [session, patient, device, start]);

    server = spawn(process.execPath, ['dist/server.js'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: testUrl, SUPABASE_URL: `http://127.0.0.1:${authServer.address().port}`, SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key', ECG_REVIEW_SIGNING_KEY: 'isolated-test-review-signing-secret-123456', PORT: String(port) }, stdio: 'ignore' });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { if ((await fetch(`http://localhost:${port}/healthz`)).ok) { ready = true; break; } } catch { /* wait for startup */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, 'API did not become ready');
    const request = async (path, method = 'GET', body, userId) => {
      const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(userId ? { Authorization: `Bearer ${token(userId)}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, data: await response.json() };
    };
    const manual=await request('/ecg/manual/simulated/start','POST',{},patient);
    assert.equal(manual.status,201);assert.equal(manual.data.sampleRateHz,250);
    const manualStart=new Date(Date.now()-20000).toISOString();
    await pool.query('update ecg_recording_sessions set started_at=$2 where id=$1',[manual.data.id,manualStart]);
    let firstPacket;
    for(let sequence=0;sequence<10;sequence++){
      const packet={sequence,samples:simulationPacket(sequence),firstSampleAt:new Date(Date.parse(manualStart)+sequence*1000).toISOString(),sampleRateHz:250,source:'simulated',scenario:'resting-v1'};
      const uploaded=await request(`/ecg/manual/simulated/${manual.data.id}/packets`,'POST',packet,patient);
      assert.equal(uploaded.status,201,JSON.stringify(uploaded.data));assert.deepEqual(uploaded.data.batch.samples,simulationPacket(sequence));
      assert.equal(uploaded.data.batch.systolic,scenarioVitals(sequence).systolic);
      if(!sequence)firstPacket=packet;
    }
    assert.equal((await request(`/ecg/manual/simulated/${manual.data.id}/packets`,'POST',firstPacket,patient)).data.duplicate,true);
    assert.equal((await request(`/ecg/manual/simulated/${manual.data.id}/packets`,'POST',firstPacket,caregiver)).status,404);
    const manualSaved=await request(`/ecg/sessions/${manual.data.id}`,'GET',undefined,patient);
    assert.equal(Number(manualSaved.data.session.sample_count),2500);
    assert.equal(manualSaved.data.session.units,'mV');assert.equal(manualSaved.data.session.is_simulated,true);
    assert.deepEqual(manualSaved.data.chunks.flatMap(c=>c.samples),Array.from({length:10},(_,i)=>simulationPacket(i)).flat());
    assert.equal(Date.parse(manualSaved.data.chunks[1].first_sample_at)-Date.parse(manualSaved.data.chunks[0].first_sample_at),1000);
    assert.equal((await request(`/ecg/sessions/${manual.data.id}/stop`,'POST',{},patient)).status,200);
    const simulationId=randomUUID();
    assert.equal((await request('/ecg/simulations','POST',{id:simulationId,startedAt:new Date().toISOString(),durationSeconds:2},patient)).status,201);
    const simulationRead=await request(`/ecg/simulations/${simulationId}`,'GET',undefined,patient);
    assert.equal(simulationRead.data.run.waveform_chunks.length,2);
    assert.equal(simulationRead.data.run.waveform_chunks[0].samples.length,250);
    assert.equal(simulationRead.data.run.simulated_bp[0].source,'simulated');
    assert.equal((await request(`/ecg/simulations/${simulationId}`,'GET',undefined,caregiver)).status,404);
    assert.equal((await request('/ecg/simulations','POST',{id:randomUUID(),startedAt:new Date().toISOString(),durationSeconds:301},patient)).status,400);
    await pool.query('delete from ecg_simulation_runs where id=$1',[simulationId]);
    assert.equal((await request('/care-communications/conversations', 'GET', undefined, patient)).data.conversations.length, 1);
    assert.equal((await request(`/care-communications/appointments/${appointmentId}/messages`, 'GET', undefined, caregiver)).status, 403);
    assert.equal((await request(`/care-communications/appointments/${appointmentId}/messages`, 'POST', { body: 'I will bring my BP log.' }, patient)).status, 201);
    assert.equal((await request(`/care-communications/appointments/${appointmentId}/messages`, 'POST', { body: 'Thank you.' }, doctorUser)).status, 201);
    assert.equal((await request(`/care-communications/appointments/${appointmentId}/messages`, 'GET', undefined, patient)).data.messages.length, 2);
    assert.equal((await request(`/care-communications/appointments/${appointmentId}/calls`, 'POST', undefined, caregiver)).status, 403);
    const startedCall = await request(`/care-communications/appointments/${appointmentId}/calls`, 'POST', {}, patient);
    assert.equal(startedCall.status, 201);
    assert.equal((await request(`/care-communications/appointments/${appointmentId}/calls`, 'POST', {}, patient)).status, 409);
    assert.equal((await request(`/care-communications/calls/${startedCall.data.call.id}`, 'PATCH', { status: 'connected' }, doctorUser)).status, 200);
    assert.equal((await request(`/care-communications/calls/${startedCall.data.call.id}`, 'PATCH', { status: 'completed' }, patient)).status, 200);
    assert.equal((await request(`/care-communications/appointments/${appointmentId}/calls`, 'GET', undefined, doctorUser)).data.calls[0].status, 'completed');
    const batch = (sequence, timestamp) => ({ sessionId: session, sequence, firstSampleAt: timestamp.toISOString(), sampleRateHz: 10, samples: [0.1, 0.2] });
    const sampleTime = new Date(start.getTime() + 3600000);
    const upload = async data => { const response = await fetch(`${base}/ecg/device/batches`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-device-id': device, 'x-device-secret': secret }, body: JSON.stringify(data) }); return { status: response.status, data: await response.json() }; };
    assert.equal((await upload({ ...batch(0, sampleTime), simulated: true })).status, 403, 'synthetic packets must not enter real devices');
    assert.equal((await request('/ecg/data', 'POST', { patientId: patient, values: [1, 2], bpm: 90 })).status, 410);
    const simulatedDevice = randomUUID(), simulatedSecret = randomBytes(32).toString('hex');
    await pool.query("insert into devices(id,model,sample_rate_hz,units,status,is_simulated) values($1,'Simulation',10,'raw','paired',true)", [simulatedDevice]);
    await pool.query('insert into device_credentials(device_id,secret_hash) values($1,$2)', [simulatedDevice, createHash('sha256').update(simulatedSecret).digest('hex')]);
    await pool.query('insert into patient_device_assignments(device_id,patient_id) values($1,$2)', [simulatedDevice, patient]);
    const simulated = await request('/ecg/sessions', 'POST', { deviceId: simulatedDevice, targetHours: 24 }, patient);
    assert.equal(simulated.status, 201);
    const simulatedSession = simulated.data.id;
    const simulator = spawn(process.execPath, ['scripts/simulate-ecg.js', '2'], { cwd: process.cwd(), env: { ...process.env, ECG_DEVICE_ID: simulatedDevice, ECG_DEVICE_SECRET: simulatedSecret, ECG_SESSION_ID: simulatedSession, ECG_SAMPLE_RATE_HZ: '10', ECG_API_URL: `${base}/ecg` }, stdio: ['ignore', 'pipe', 'pipe'] });
    let simulatorOutput = '';
    simulator.stdout.on('data', chunk => { simulatorOutput += chunk; });
    simulator.stderr.on('data', chunk => { simulatorOutput += chunk; });
    assert.equal(await new Promise(resolve => simulator.on('close', resolve)), 0, simulatorOutput);
    assert.match(simulatorOutput, /SIMULATED packet 1: stored/);
    assert.equal((await request(`/ecg/sessions/${simulatedSession}/stop`, 'POST', {}, patient)).status, 200);
    const simulatedReport = await request(`/monitoring/sessions/${simulatedSession}/report`, 'GET', undefined, patient);
    assert.equal(simulatedReport.data.report.isSimulated, true);
    assert.equal(simulatedReport.data.report.receivedBatchCount, 2);
    assert.match(simulatedReport.data.report.interpretation, /SIMULATED/);
    assert.equal((await request(`/monitoring/doctor/sessions/${simulatedSession}/reviews`, 'POST', { summary: 'This must not be signed.' }, doctorUser)).status, 409);
    assert.equal((await upload(batch(0, sampleTime))).status, 201, 'one-hour-old buffered batch should upload');
    assert.equal((await upload(batch(0, sampleTime))).data.duplicate, true);
    const gap = await upload(batch(2, new Date(sampleTime.getTime() + 400)));
    assert.equal(gap.status, 409);
    assert.equal(gap.data.expectedSequence, 1);
    assert.equal((await upload(batch(1, new Date(sampleTime.getTime() + 200)))).status, 201);
    const marker = { clientId: randomUUID(), symptom: 'dizziness', markedAt: new Date(sampleTime.getTime() + 100).toISOString() };
    assert.equal((await request(`/monitoring/sessions/${session}/markers`, 'POST', marker, patient)).status, 201);
    assert.equal((await request(`/monitoring/sessions/${session}/markers`, 'POST', marker, patient)).data.duplicate, true);
    assert.equal((await request(`/ecg/sessions/${session}/stop`, 'POST', {}, patient)).status, 200);
    assert.equal((await upload(batch(2, new Date(sampleTime.getTime() + 400)))).status, 201, 'late batch after completion should upload');
    const report = await request(`/monitoring/sessions/${session}/report`, 'GET', undefined, patient);
    assert.equal(report.status, 200);
    assert.equal(report.data.report.receivedBatchCount, 3);
    assert.equal(report.data.report.missingSequences, 0);
    assert.equal(report.data.report.symptomMarkers[0].chunk_sequence, 0);
    assert.equal(report.data.report.symptomMarkers[0].sample_offset, 1);
    assert.equal((await request(`/monitoring/sessions/${session}/report`, 'GET', undefined, caregiver)).status, 404);

    assert.equal((await request('/monitoring/doctor/patients', 'GET', undefined, doctorUser)).data.patients[0].id, patient);
    assert.equal((await request(`/monitoring/doctor/sessions/${session}/annotations`, 'POST', { atTime: marker.markedAt, observation: 'Test observation on original signal', needsAttention: true }, doctorUser)).status, 201);
    assert.equal((await request(`/monitoring/doctor/sessions/${session}/reviews`, 'POST', { summary: 'A technical test review signed by a verified clinician.' }, doctorUser)).status, 201);
    assert.equal((await request(`/monitoring/sessions/${session}/report`, 'GET', undefined, patient)).data.reviews[0].signatureVerified, true);
    assert.equal((await request('/monitoring/doctor/plans', 'POST', { patientId: patient, deviceId: device, targetHours: 24, startsAt: new Date().toISOString(), reviewDueAt: new Date(Date.now() + 3 * 86400000).toISOString(), instructions: 'Wear the test device and mark symptoms.', symptoms: ['dizziness'] }, doctorUser)).status, 201);
    assert.equal((await request('/monitoring/plans', 'GET', undefined, patient)).data.plans.length, 1);

    const invitation = await request('/monitoring/caregivers', 'POST', { email: 'caregiver@example.invalid', scopes: ['overview'], notify: false }, patient);
    assert.equal(invitation.status, 201);
    assert.equal((await request('/monitoring/caregivers/accept', 'POST', { token: invitation.data.token }, caregiver)).status, 200);
    const shared = await request(`/monitoring/caregiver/shared/${patient}`, 'GET', undefined, caregiver);
    assert.equal(shared.status, 200);
    assert.deepEqual(shared.data.scopes, ['overview']);
    assert.equal(shared.data.measurements, undefined);
    assert.equal((await request(`/monitoring/caregivers/${invitation.data.invitation.id}`, 'PATCH', { scopes: ['overview', 'measurements'], notify: true }, patient)).status, 200);
    assert.ok(Array.isArray((await request(`/monitoring/caregiver/shared/${patient}`, 'GET', undefined, caregiver)).data.measurements));
    assert.equal((await request('/bp-alerts/settings', 'GET', undefined, patient)).data.verificationConfigured, false);
    assert.equal((await request('/bp-alerts/settings', 'PUT', { enabled: true, systolicLimit: 145, diastolicLimit: 95 }, patient)).status, 200);
    assert.equal((await request('/bp-alerts/settings', 'PUT', { enabled: true, systolicLimit: 20, diastolicLimit: null }, patient)).status, 400);
    assert.equal((await request('/bp-alerts/caregiver/grants', 'GET', undefined, caregiver)).data.grants.length, 1);
    assert.equal((await request(`/bp-alerts/caregiver/grants/${invitation.data.invitation.id}/phone/start`, 'POST', { phone: '+919876543210' }, caregiver)).status, 503);
    await pool.query('update caregiver_grants set phone_e164=$2,phone_verified_at=now() where id=$1', [invitation.data.invitation.id, '+919876543210']);
    const highReading = await request('/my-health/measurements', 'POST', { kind: 'systolic_bp', value: 151, unit: 'mmHg', measured_at: new Date().toISOString() }, patient);
    assert.equal(highReading.status, 201);
    assert.equal(highReading.data.alertsQueued, 1);
    const belowReading = await request('/my-health/measurements', 'POST', { kind: 'diastolic_bp', value: 81, unit: 'mmHg', measured_at: new Date().toISOString() }, patient);
    assert.equal(belowReading.data.alertsQueued, 0);
    const oldReading = await request('/my-health/measurements', 'POST', { kind: 'systolic_bp', value: 155, unit: 'mmHg', measured_at: new Date(Date.now() - 3600000).toISOString() }, patient);
    assert.equal(oldReading.data.alertsQueued, 0);
    assert.equal((await request('/bp-alerts/settings', 'GET', undefined, patient)).data.alerts.length, 1);
    assert.equal((await request(`/monitoring/caregivers/${invitation.data.invitation.id}`, 'DELETE', undefined, patient)).status, 200);
    assert.equal((await request(`/monitoring/caregiver/shared/${patient}`, 'GET', undefined, caregiver)).status, 403);
    assert.equal((await request('/my-health/measurements', 'POST', { kind: 'systolic_bp', value: 160, unit: 'mmHg', measured_at: new Date().toISOString() }, patient)).data.alertsQueued, 0);

    const heartbeat = await fetch(`${base}/ecg/device/heartbeat`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-device-id': device, 'x-device-secret': secret }, body: JSON.stringify({ batteryPercent: 73, queuedBatches: 0, syncFailures: 1, firmwareVersion: 'test' }) });
    assert.equal(heartbeat.status, 200);
    assert.equal((await request(`/monitoring/devices/${device}/diagnostics`, 'GET', undefined, patient)).data.device.battery_percent, 73);
    assert.equal((await request(`/monitoring/devices/${device}/support`, 'POST', { requestType: 'replacement', issue: 'Test device needs a replacement check.' }, patient)).status, 201);
    assert.equal((await request('/monitoring/staff/fleet', 'GET', undefined, patient)).status, 403);
    assert.equal((await request('/monitoring/staff/fleet', 'GET', undefined, admin)).status, 200);
    const staffRequests = await request('/monitoring/staff/support', 'GET', undefined, admin);
    assert.equal(staffRequests.data.requests.length, 1);
    assert.equal(staffRequests.data.requests[0].request_type, 'replacement');

    const exportResponse = await request('/monitoring/export/fhir', 'GET', undefined, patient);
    assert.equal(exportResponse.status, 200);
    assert.equal(exportResponse.data.resourceType, 'Bundle');
    assert.equal(exportResponse.data.entry.some(entry => entry.resource.resourceType === 'DiagnosticReport'), true);
  } finally {
    server?.kill('SIGTERM');
    await new Promise(resolve => authServer.close(resolve));
    await pool.end();
  }
});
