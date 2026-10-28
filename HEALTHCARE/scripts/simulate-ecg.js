// Test data only. The receiving device must be explicitly provisioned as simulated.
import 'dotenv/config';
import { setTimeout as delay } from 'node:timers/promises';

const { ECG_DEVICE_ID: id, ECG_DEVICE_SECRET: secret, ECG_SESSION_ID: sessionId } = process.env;
const count = Number(process.argv[2] || 10);
const rate = Number(process.env.ECG_SAMPLE_RATE_HZ);
const firstSequence = Number(process.env.ECG_START_SEQUENCE || 0);
const base = (process.env.ECG_API_URL || 'http://localhost:4000/api/v1/ecg').replace(/\/$/, '');
if (!id || !secret || !sessionId || !Number.isInteger(count) || count < 1 || !Number.isInteger(rate) || rate < 1 || rate > 2000 || !Number.isSafeInteger(firstSequence) || firstSequence < 0) {
  console.error('Set ECG_DEVICE_ID, ECG_DEVICE_SECRET, ECG_SESSION_ID and ECG_SAMPLE_RATE_HZ for a simulated device and recording. Usage: npm run ecg:simulate -- 300');
  process.exit(1);
}

console.log(`SIMULATED ECG: sending ${count} one-second batches at ${rate} samples/s. This does not measure heart rate, blood pressure or glucose.`);
for (let offset = 0; offset < count; offset++) {
  const sequence = firstSequence + offset;
  const started = Date.now();
  const firstSampleAt = new Date(started).toISOString();
  const samples = Array.from({ length: rate }, (_, i) => Math.round(100 + 35 * Math.sin(2 * Math.PI * i / rate * 2)));
  let response;
  try {
    response = await fetch(`${base}/device/batches`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-device-id': id, 'x-device-secret': secret },
      body: JSON.stringify({ sessionId, sequence, firstSampleAt, sampleRateHz: rate, samples, simulated: true }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error(`SIMULATED packet ${sequence} was not confirmed: ${error.message}. Check the recording before resuming.`);
    process.exitCode = 1; break;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error(`SIMULATED packet ${sequence} rejected (HTTP ${response.status}): ${data.message || 'Request failed'}${Number.isInteger(data.expectedSequence) ? `; expected sequence ${data.expectedSequence}` : ''}`);
    process.exitCode = 1; break;
  }
  console.log(`SIMULATED packet ${sequence}: ${data.duplicate ? 'already stored' : 'stored'} (${samples.length} samples)`);
  if (offset + 1 < count) await delay(Math.max(0, 1000 - (Date.now() - started)));
}
