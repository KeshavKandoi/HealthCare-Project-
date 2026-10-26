import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { getPool } from '../config/db.js';

const sql = await readFile(new URL('../migrations/001_postgres.sql', import.meta.url), 'utf8');
const client = await getPool().connect();
try {
  await client.query('begin');
  await client.query(sql);
  await client.query('commit');
  console.log('PostgreSQL schema ready');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  client.release();
  await getPool().end();
}
