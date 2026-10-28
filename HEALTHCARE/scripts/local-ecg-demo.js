// Local, in-memory demonstration receiver. Never bind this to a public interface.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.ECG_DEMO_PORT || 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('ECG_DEMO_PORT must be a valid port');
const streamId = randomUUID();
let sequence = 0;
const packets = [];
const reply = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
};
const server = createServer(async (req, res) => {
  const host = (req.headers.host || '').split(':')[0];
  if (!['localhost', '127.0.0.1'].includes(host)) return reply(res, 403, { message: 'Local access only' });
  const origin = req.headers.origin;
  if (origin) {
    let allowed = false;
    try { const parsed = new URL(origin); allowed = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname); } catch { /* invalid origin */ }
    if (!allowed) return reply(res, 403, { message: 'Local origin required' });
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return reply(res, 204, {});
  }
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (req.method === 'GET' && url.pathname === '/api/v1/ecg/demo-stream') {
    const after = Number(url.searchParams.get('after') || 0);
    const cursor = Number.isSafeInteger(after) && after >= 0 ? after : 0;
    return reply(res, 200, { simulated: true, streamId, latestSequence: sequence, packets: packets.filter(packet => packet.sequence > cursor) });
  }
  if (req.method !== 'POST' || url.pathname !== '/api/v1/ecg/data') return reply(res, 404, { message: 'Unknown local demo endpoint' });
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(res, 415, { message: 'JSON required' });
  let raw = '';
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 16384) return reply(res, 413, { message: 'Packet too large' });
    }
    const { values, bpm } = JSON.parse(raw);
    if (!Array.isArray(values) || values.length < 1 || values.length > 2000 || !values.every(value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e7) || typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm < 0 || bpm > 300) return reply(res, 400, { message: 'Invalid simulated values or BPM' });
    const packet = { sequence: ++sequence, values, bpm, receivedAt: new Date().toISOString() };
    packets.push(packet);
    if (packets.length > 300) packets.shift();
    console.log(`SIMULATED packet ${packet.sequence} accepted (${values.length} values, ${bpm} simulated BPM)`);
    return reply(res, 201, { success: true, simulated: true, sequence: packet.sequence });
  } catch {
    return reply(res, 400, { message: 'Invalid JSON packet' });
  }
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is in use. Stop the local API on this port before starting the demo receiver.`);
  else console.error('Could not start the local demo receiver:', error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Local SIMULATED ECG receiver: http://127.0.0.1:${port}/api/v1/ecg/data. No patient data, medical alerts or messages are sent.`));
