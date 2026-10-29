import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { getPool } from '../config/db.js';

const files = ['001_postgres.sql', '002_ecg.sql', '003_patient_appointments.sql', '004_monitoring_care.sql', '005_bp_alerts.sql', '006_care_communications.sql', '007_hospital_appointment_requests.sql', '008_plan_inquiries.sql', '009_supabase_auth.sql', '010_account_auth.sql', '011_simulated_ecg.sql', '012_bp_sms.sql', '013_ecg_research.sql', '014_backoffice_settings.sql', '015_bp_test_alerts.sql'];
const client = await getPool().connect();
try {
  await client.query('begin');
  for (const file of files) {
    const sql = await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
    await client.query(sql);
  }
  await client.query('commit');
  console.log('PostgreSQL schema ready');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await getPool().end();
}
