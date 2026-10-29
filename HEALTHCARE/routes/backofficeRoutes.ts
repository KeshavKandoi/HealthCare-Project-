import { express } from '../serverDependencies.js';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getPool } from '../config/db.js';
import { passwordMatches } from '../lib/accountAuth.js';
import { isWaveformMode, type WaveformMode } from '../lib/ecgSimulation.js';

// The single backoffice operator. Only the scrypt hash of the password is stored in source.
export const backofficeEmail = 'keshavkandoi@gmail.com';
const passwordHash = 'scrypt:3e913ccbbb52be467babbe806051f0e5:b18fbf770c4f510241762d4fbcbbb31bc959ae875c346d1cacf8b9e0996b2d4fcbe14dab726620edfe0f2be5ea6d8590bdead5554df16c88d09c2df5b47ca16c';
const sessionMs = 12 * 3600000;
const createTable = `create table if not exists healthcare_private.backoffice_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now())`;

export type WaveformState = { mode: WaveformMode; updatedAt: string | null };
type Pool = { query(sql: string, params?: unknown[]): Promise<{ rows: any[] }> };

const wrap = (fn: (req: any, res: any) => Promise<unknown>) => (req: any, res: any, next: (error?: Error) => void) => Promise.resolve(fn(req, res)).catch(next);
const fail = (res: any, status: number, message: string) => res.status(status).json({ message });
let signingKey: Buffer | undefined;
function sign(payload: string) {
  // Derived on first use, after dotenv has loaded. Without HEALTHCARE_OTP_SECRET, sessions end when the process restarts.
  signingKey ??= createHmac('sha256', process.env.HEALTHCARE_OTP_SECRET || randomBytes(32)).update(`heartline-backoffice:${passwordHash}`).digest();
  return createHmac('sha256', signingKey).update(payload).digest('base64url');
}

function issueToken() {
  const expiresAt = Date.now() + sessionMs, payload = `${expiresAt}.${randomBytes(16).toString('base64url')}`;
  return { token: `bo_${payload}.${sign(payload)}`, expiresAt: new Date(expiresAt).toISOString() };
}
export function verifyBackofficeToken(token: unknown): string | null {
  const match = typeof token === 'string' ? /^bo_(\d{13})\.([\w-]{22})\.([\w-]{43})$/.exec(token) : null;
  if (!match || Number(match[1]) <= Date.now()) return null;
  const expected = Buffer.from(sign(`${match[1]}.${match[2]}`)), actual = Buffer.from(match[3]);
  return timingSafeEqual(expected, actual) ? new Date(Number(match[1])).toISOString() : null;
}
function requireBackoffice(req: any, res: any, next: () => void) {
  const expiresAt = verifyBackofficeToken(/^Bearer (.+)$/i.exec(req.headers.authorization || '')?.[1]);
  if (!expiresAt) return fail(res, 401, 'Backoffice sign-in required');
  req.backofficeExpiresAt = expiresAt;
  next();
}
/** Backoffice sign-in and the shared live-waveform mode followed by every simulated monitor. */
export function backofficeRouter(emit: (state: WaveformState) => void = () => {}, pool: () => Pool = getPool) {
  const router = express.Router();
  const attempts = new Map<string, { count: number; until: number }>();
  const loginLimit = (req: any, res: any, next: () => void) => {
    const now = Date.now(), key = req.ip || 'unknown';
    if (attempts.size > 1000) for (const [ip, entry] of attempts) if (entry.until < now) attempts.delete(ip);
    let entry = attempts.get(key);
    if (!entry || entry.until < now) attempts.set(key, entry = { count: 0, until: now + 900000 });
    if (++entry.count > 10) return fail(res, 429, 'Too many sign-in attempts. Please try again later.');
    next();
  };
  let state: WaveformState = { mode: 'normal', updatedAt: null }, ready: Promise<void> | null = null, loading: Promise<void> | null = null;
  // Migration 014 creates the table; creating it here keeps the mode durable on databases that missed it.
  const db = async (sql: string, params?: unknown[]) => {
    ready ??= pool().query(createTable).then(() => undefined, () => undefined);
    await ready;
    return pool().query(sql, params);
  };
  const current = async () => {
    loading ??= db("select value,updated_at from healthcare_private.backoffice_settings where key='waveform_mode'").then(({ rows }) => {
      if (rows[0] && isWaveformMode(rows[0].value?.mode)) state = { mode: rows[0].value.mode, updatedAt: new Date(rows[0].updated_at).toISOString() };
    }, () => { /* Without a database the mode is kept in memory until restart. */ });
    await loading;
    return state;
  };

  router.post('/login', loginLimit, wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const validPassword = await passwordMatches(password, passwordHash);
    if (typeof email !== 'string' || email.trim().toLowerCase() !== backofficeEmail || !validPassword) return fail(res, 401, 'Invalid backoffice credentials');
    res.json({ ...issueToken(), email: backofficeEmail });
  }));
  router.get('/session', requireBackoffice, (req: any, res: any) => res.json({ email: backofficeEmail, expiresAt: req.backofficeExpiresAt }));
  // Public read for monitors. It exposes only the demonstration mode.
  router.get('/waveform', wrap(async (_req, res) => res.set('Cache-Control', 'no-store').json(await current())));
  router.put('/waveform', requireBackoffice, wrap(async (req, res) => {
    if (!isWaveformMode(req.body?.mode)) return fail(res, 400, 'Choose normal, off, post-workout or heavy-breathing');
    await current();
    state = { mode: req.body.mode, updatedAt: new Date().toISOString() };
    let persisted = true;
    try {
      await db(`insert into healthcare_private.backoffice_settings(key,value,updated_at) values('waveform_mode',$1,$2)
        on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at`, [JSON.stringify({ mode: state.mode }), state.updatedAt]);
    } catch { persisted = false; }
    emit(state);
    res.json({ ...state, persisted });
  }));
  return router;
}
