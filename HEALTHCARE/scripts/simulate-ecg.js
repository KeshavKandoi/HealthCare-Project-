import dotenv from 'dotenv';
import { getPool } from '../config/db.js';

dotenv.config();

const args = process.argv.slice(2);
const countIndex = args.indexOf('--count');
const count = countIndex === -1 ? Infinity : Number(args[countIndex + 1]);
if (countIndex !== -1) args.splice(countIndex, 2);
if (args.length > 1 || (count !== Infinity && (!Number.isInteger(count) || count < 1))) {
  console.error('Usage: npm run ecg:simulate -- [patient-id] [--count N]');
  process.exit(1);
}

async function resolvePatientId() {
  if (args[0]) return args[0];
  if (process.env.ECG_PATIENT_ID) return process.env.ECG_PATIENT_ID;
  const pool = getPool();
  const { rows } = await pool.query('select id from app_users limit 2');
  await pool.end();
  if (rows.length === 1) return rows[0].id;
  throw new Error(rows.length ? 'Multiple patient accounts exist. Pass the patient ID as an argument or set ECG_PATIENT_ID.' : 'No patient account exists yet. Register a patient first.');
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const waveform = [92, 93, 95, 108, 120, 83, 91, 95, 93, 92];

try {
  const patientId = await resolvePatientId();
  const url = `http://localhost:${process.env.PORT || 4000}/api/v1/ecg/data`;
  console.log(`Streaming ECG for patient ${patientId}. Press Ctrl+C to stop.`);
  for (let packet = 1; packet <= count; packet += 1) {
    const bpm = Math.floor(Math.random() * 40) + 60;
    const values = waveform.map(value => value + Math.floor(Math.random() * 5) - 2);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, values, bpm }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(`Packet ${packet} rejected: ${result.message || `HTTP ${response.status}`}`);
    console.log(`Sent packet ${packet} — BPM: ${bpm}`);
    if (packet < count) await wait(1000);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
