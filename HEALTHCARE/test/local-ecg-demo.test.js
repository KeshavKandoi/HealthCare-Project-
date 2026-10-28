import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';

test('local demo accepts test packets, returns them to the browser and rejects nonlocal origins', async () => {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const processChild = spawn(process.execPath, ['scripts/local-ecg-demo.js'], { cwd: process.cwd(), env: { ...process.env, ECG_DEMO_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  const base = `http://127.0.0.1:${port}`;
  try {
    let available = false;
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`${base}/api/v1/ecg/demo-stream`)).ok) { available = true; break; } } catch { /* server starting */ }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(available, true);
    const packet = { patientId: 'ignored-test-id', bpm: 84, values: [80, 90, 100, 110] };
    let response = await fetch(`${base}/api/v1/ecg/data`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(packet) });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).simulated, true);
    response = await fetch(`${base}/api/v1/ecg/demo-stream?after=0`, { headers: { Origin: 'http://127.0.0.1:5173' } });
    const data = await response.json();
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
    assert.equal(data.packets[0].bpm, 84);
    assert.deepEqual(data.packets[0].values, packet.values);
    assert.equal((await (await fetch(`${base}/api/v1/ecg/demo-stream?after=1`)).json()).packets.length, 0);
    assert.equal((await fetch(`${base}/api/v1/ecg/data`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://external.example' }, body: JSON.stringify(packet) })).status, 403);
    assert.equal((await fetch(`${base}/api/v1/ecg/data`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({bpm: 80, values: []}) })).status, 400);
  } finally { processChild.kill('SIGTERM'); await new Promise(resolve => processChild.on('close', resolve)); }
});
