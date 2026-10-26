import { createHash } from 'node:crypto';
import { chmod, mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

type Batch = { sessionId: string; sequence: number; firstSampleAt: string; sampleRateHz: number; samples: number[] };
const deviceId = process.env.ECG_DEVICE_ID || '';
const secret = process.env.ECG_DEVICE_SECRET || '';
const baseUrl = process.env.ECG_API_URL || 'http://localhost:4000/api/v1';
const queueDir = process.env.ECG_QUEUE_DIR || './ecg-gateway-queue';
const action = process.argv[2] || 'watch';

if (!/^[0-9a-f-]{36}$/i.test(deviceId) || secret.length < 32) throw new Error('Set ECG_DEVICE_ID and ECG_DEVICE_SECRET for a provisioned device');
const endpoint = new URL(baseUrl);
if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))) throw new Error('ECG_API_URL must use HTTPS outside localhost');
await mkdir(queueDir, { recursive: true, mode: 0o700 });
await chmod(queueDir, 0o700);

function validate(value: unknown): Batch {
  if (!value || typeof value !== 'object') throw new Error('Expected a batch object');
  const batch = value as Batch;
  if (!/^[0-9a-f-]{36}$/i.test(batch.sessionId) || !Number.isSafeInteger(batch.sequence) || batch.sequence < 0 || !Number.isInteger(batch.sampleRateHz) || batch.sampleRateHz < 1 || batch.sampleRateHz > 2000 || !Number.isFinite(Date.parse(batch.firstSampleAt)) || !Array.isArray(batch.samples) || !batch.samples.length || batch.samples.length > 2000 || !batch.samples.every(sample => typeof sample === 'number' && Number.isFinite(sample) && Math.abs(sample) < 1e7)) throw new Error('Invalid ECG batch');
  return batch;
}

function pathFor(batch: Batch) { return join(queueDir, `${batch.sessionId}-${String(batch.sequence).padStart(12, '0')}.json`); }
const digest = (text: string) => createHash('sha256').update(text).digest('hex');

async function enqueue(value: unknown) {
  const batch = validate(value);
  const path = pathFor(batch), serialized = JSON.stringify(batch);
  try {
    const previous = await readFile(path, 'utf8');
    if (digest(previous) !== digest(serialized)) throw new Error(`Conflicting queued sequence ${batch.sequence}`);
    return;
  } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  const temporary = `${path}.${process.pid}.tmp`;
  const file = await open(temporary, 'wx', 0o600);
  try { await file.writeFile(serialized); await file.sync(); } finally { await file.close(); }
  await rename(temporary, path);
  try { const directory = await open(queueDir, 'r'); try { await directory.sync(); } finally { await directory.close(); } } catch { /* some filesystems do not sync directories */ }
}

let syncFailures = 0;
let draining: Promise<void> | null = null;
async function drain() {
  if (draining) return draining;
  draining = (async () => {
    const files = (await readdir(queueDir)).filter(name => name.endsWith('.json')).sort();
    for (const name of files) {
      const path = join(queueDir, name);
      const batch = validate(JSON.parse(await readFile(path, 'utf8')));
      try {
        const response = await fetch(new URL('/api/v1/ecg/device/batches', endpoint.origin), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId, 'x-device-secret': secret }, body: JSON.stringify(batch), signal: AbortSignal.timeout(15000) });
        if (response.ok) { await unlink(path); continue; }
        const body = await response.json().catch(() => ({})) as { message?: string; expectedSequence?: number };
        if (response.status === 409 && Number.isSafeInteger(body.expectedSequence)) {
          console.error(`Waiting for batch ${body.expectedSequence} before ${batch.sequence}`);
          break;
        }
        syncFailures++;
        console.error(`Sync paused: HTTP ${response.status} ${body.message || ''}`);
        break;
      } catch (error) { syncFailures++; console.error('Offline; queued ECG batches remain on disk', error instanceof Error ? error.message : error); break; }
    }
  })().finally(() => { draining = null; });
  return draining;
}

async function heartbeat() {
  const queuedBatches = (await readdir(queueDir)).filter(name => name.endsWith('.json')).length;
  try {
    await fetch(new URL('/api/v1/ecg/device/heartbeat', endpoint.origin), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId, 'x-device-secret': secret }, body: JSON.stringify({ queuedBatches, syncFailures, firmwareVersion: process.env.ECG_FIRMWARE_VERSION || undefined, batteryPercent: process.env.ECG_BATTERY_PERCENT ? Number(process.env.ECG_BATTERY_PERCENT) : undefined }), signal: AbortSignal.timeout(10000) });
  } catch { /* Heartbeat retries with the next cycle. */ }
}

if (action === 'sync') { await drain(); }
else if (action === 'status') console.log(JSON.stringify({ queuedBatches: (await readdir(queueDir)).filter(name => name.endsWith('.json')).length, syncFailures }));
else if (action === 'enqueue' || action === 'watch') {
  if (action === 'watch') {
    await drain();
    await heartbeat();
    setInterval(() => { void drain().then(heartbeat).catch(error => console.error(error)); }, 5000);
  }
  for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
    if (!line.trim()) continue;
    try { await enqueue(JSON.parse(line)); if (action === 'watch') void drain(); }
    catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
  }
} else throw new Error('Use watch, enqueue, sync, or status');
