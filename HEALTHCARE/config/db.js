import pg from 'pg';

const { Pool } = pg;
let pool;

export function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Copy HEALTHCARE/.env.example to .env and set your PostgreSQL URL.');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  }
  return pool;
}

export default async function connectDB() {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query("select to_regclass('public.app_users') as users, to_regclass('public.doctors') as doctors, to_regclass('public.appointments') as appointments, to_regclass('public.health_records') as health_records, to_regclass('public.ecg_records') as ecg_records, to_regclass('public.web_messages') as web_messages");
    if (Object.values(rows[0]).some(value => !value)) throw new Error('PostgreSQL schema missing. Run npm run db:migrate before starting the API.');
    console.log('PostgreSQL database connected');
  } finally {
    client.release();
  }
}
