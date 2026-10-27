import { randomUUID, randomBytes, randomInt, createHash, createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getPool } from '../config/db.js';
import userModel from '../models/UserModels.js';
import * as legacy from './supabaseAuth.js';

const scrypt = promisify(scryptCallback);
const normalize = value => String(value || '').trim().toLowerCase();
const digest = value => createHash('sha256').update(value).digest('hex');
const opaque = () => randomBytes(32).toString('base64url');
const otpSecret = () => {
  const value = process.env.HEALTHCARE_OTP_SECRET || '';
  if (value.length < 32) throw new Error('HEALTHCARE_OTP_SECRET must contain at least 32 characters');
  return value;
};
const otpHash = (id, code) => createHmac('sha256', otpSecret()).update(`${id}:${code}`).digest('hex');
const failure = message => Object.assign(new Error(message), { status: 400 });

async function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 1024) throw failure('Password must contain at least 8 characters');
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}
async function passwordMatches(password, stored) {
  if (typeof password !== 'string' || password.length > 1024 || typeof stored !== 'string') return false;
  const [algorithm, salt, hash] = stored.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(hash || '')) return false;
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}
async function transaction(work) {
  const client = await getPool().connect();
  try { await client.query('begin'); const result = await work(client); await client.query('commit'); return result; }
  catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}
async function rateLimit(bucket, maximum, seconds) {
  const key = digest(bucket);
  return transaction(async client => {
    await client.query('select pg_advisory_xact_lock(hashtext($1))', [key]);
    const { rows } = await client.query("select count(*)::int as n from healthcare_private.auth_attempts where bucket=$1 and created_at > now() - $2 * interval '1 second'", [key, seconds]);
    if (rows[0].n >= maximum) throw Object.assign(new Error('Too many attempts. Please try again later.'), { status: 429 });
    await client.query('insert into healthcare_private.auth_attempts(bucket) values($1)', [key]);
    await client.query("delete from healthcare_private.auth_attempts where bucket=$1 and created_at < now() - interval '1 day'", [key]);
  });
}
async function deliver(email, code, purpose) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) throw Object.assign(new Error('Email delivery is not configured'), { status: 503 });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject: purpose === 'signup' ? 'Your Heartline verification code' : 'Your Heartline password reset code', text: `Your Heartline ${purpose === 'signup' ? 'verification' : 'password reset'} code is ${code}. It expires in 10 minutes.\n\nIf you did not request this code, you can ignore this email.` }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Object.assign(new Error('Email delivery unavailable'), { status: 503 });
}
async function issueCode(account, purpose) {
  const id = randomUUID(); const code = String(randomInt(1000000)).padStart(6, '0');
  await transaction(async client => {
    await client.query('select id from healthcare_private.accounts where id=$1 for update', [account.id]);
    const recent = await client.query("select 1 from healthcare_private.challenges where account_id=$1 and purpose=$2 and created_at>now()-interval '60 seconds' limit 1", [account.id, purpose]);
    if (recent.rowCount) throw Object.assign(new Error('Please wait before requesting another code'), { status: 429 });
    await client.query('insert into healthcare_private.challenges(id,account_id,purpose,code_hash,expires_at) values ($1,$2,$3,$4,now()+interval \'10 minutes\')', [id, account.id, purpose, otpHash(id, code)]);
  });
  try { await deliver(account.email, code, purpose); }
  catch (error) { await getPool().query('delete from healthcare_private.challenges where id=$1', [id]); throw error; }
}
async function findAccount(email) {
  return (await getPool().query('select * from healthcare_private.accounts where email=$1', [normalize(email)])).rows[0];
}
export async function signUpAccount({ name, email, password }) {
  email = normalize(email); name = String(name || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 120) throw failure('Enter a valid name and email');
  await rateLimit(`signup:${email}`, 5, 3600);
  const hash = await passwordHash(password);
  let account = await findAccount(email);
  if (account) {
    if (account.verified_at || !(await passwordMatches(password, account.password_hash))) throw failure('An account with this email already exists. Sign in or reset your password.');
  } else {
    const id = randomUUID();
    try { account = (await getPool().query('insert into healthcare_private.accounts(id,email,name,password_hash) values($1,$2,$3,$4) returning *', [id,email,name,hash])).rows[0]; }
    catch (error) { if (error.code === '23505') throw failure('An account with this email already exists.'); throw error; }
  }
  await issueCode(account, 'signup');
  return { needsEmailConfirmation: true };
}
export async function resendSignupCode(email) {
  email = normalize(email); await rateLimit(`resend:${email}`, 5, 3600);
  const account = await findAccount(email);
  if (account && !account.verified_at) await issueCode(account, 'signup');
}
async function verifyCode(email, code, purpose, update) {
  email = normalize(email);
  await rateLimit(`verify:${purpose}:${email}`, 12, 3600);
  const result = await transaction(async client => {
    const { rows } = await client.query('select * from healthcare_private.accounts where email=$1 for update', [email]);
    if (!rows[0]) return false;
    const account = rows[0];
    const challenge = (await client.query('select * from healthcare_private.challenges where account_id=$1 and purpose=$2 order by created_at desc limit 1 for update', [account.id,purpose])).rows[0];
    if (!challenge || challenge.consumed_at || challenge.attempts >= 5 || new Date(challenge.expires_at).getTime() <= Date.now()) return false;
    const expected = Buffer.from(challenge.code_hash, 'hex'); const actual = Buffer.from(otpHash(challenge.id, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await client.query('update healthcare_private.challenges set attempts=attempts+1 where id=$1', [challenge.id]); return false;
    }
    await client.query('update healthcare_private.challenges set consumed_at=now() where id=$1', [challenge.id]);
    await update(client, account);
    return true;
  });
  if (!result) throw failure('Invalid or expired code');
}
export async function verifySignupCode(email, code) {
  await verifyCode(email, code, 'signup', async (client, account) => {
    const profile = await client.query("select id from public.app_users where lower(data->>'email')=$1", [account.email]);
    if (!profile.rows[0]) await client.query('insert into public.app_users(id,data) values($1,$2::jsonb)', [account.id, JSON.stringify({ _id: account.id, email: account.email, name: account.name, isAdmin: false })]);
    await client.query('update healthcare_private.accounts set verified_at=now() where id=$1', [account.id]);
  });
}
export async function requestPasswordReset(email) {
  email = normalize(email); await rateLimit(`recovery:${email}`, 5, 3600);
  let account = await findAccount(email);
  const legacyUser = (await getPool().query('select id, raw_user_meta_data from auth.users where lower(email)=$1 limit 1', [email])).rows[0];
  if (!account && legacyUser) {
    const hash = await passwordHash(opaque());
    const name = String(legacyUser.raw_user_meta_data?.name || email.split('@')[0]).slice(0, 120);
    await getPool().query('insert into healthcare_private.accounts(id,email,name,password_hash) values($1,$2,$3,$4) on conflict(email) do nothing', [randomUUID(),email,name,hash]);
    account = await findAccount(email);
  }
  if (account && (account.verified_at || legacyUser)) await issueCode(account, 'recovery');
}
export async function resetAccountPassword(email, code, password) {
  const hash = await passwordHash(password);
  await verifyCode(email, code, 'recovery', async (client, account) => {
    const profile = await client.query("select id from public.app_users where lower(data->>'email')=$1", [account.email]);
    if (!profile.rows[0]) await client.query('insert into public.app_users(id,data) values($1,$2::jsonb)', [account.id, JSON.stringify({ _id: account.id, email: account.email, name: account.name, isAdmin: false })]);
    await client.query('update healthcare_private.accounts set password_hash=$2,verified_at=now() where id=$1', [account.id,hash]);
    await client.query('update healthcare_private.sessions set revoked_at=now() where account_id=$1 and revoked_at is null', [account.id]);
  });
}
export async function authRateLimit(req, res, next) {
  try {
    await rateLimit(`ip:${req.ip || 'unknown'}`, 150, 900);
    next();
  } catch (error) {
    res.status(error.status || 503).json({ success: false, message: error.status ? error.message : 'Authentication service unavailable' });
  }
}
async function profileFor(email) {
  const { rows } = await getPool().query("select id from public.app_users where lower(data->>'email')=$1", [email]);
  const profile = rows[0] ? await userModel.findById(rows[0].id) : null;
  if (!profile) return null;
  const { password, ...safe } = profile;
  return safe;
}
export async function signInAccount(email, password) {
  email = normalize(email); await rateLimit(`login:${email}`, 10, 900);
  const account = await findAccount(email);
  if (!account || !account.verified_at) {
    try { return await legacy.signInAccount(email, password); }
    catch (error) {
      if (!account && (error?.code === 'email_not_confirmed' || /email not confirmed/i.test(error?.message || ''))) {
        throw Object.assign(new Error('Please register again to receive an email verification code.'), { code: 'legacy_unconfirmed' });
      }
      if (!account) throw error;
    }
  }
  if (!(await passwordMatches(password, account.password_hash))) throw failure('Invalid email or password');
  if (!account.verified_at) throw Object.assign(new Error('Email not confirmed'), { code: 'email_not_confirmed' });
  const user = await profileFor(email);
  if (!user) throw new Error('Account profile unavailable');
  const token = `hc_${opaque()}`, refreshToken = `hr_${opaque()}`;
  await getPool().query("insert into healthcare_private.sessions(id,account_id,access_hash,refresh_hash,access_expires_at,refresh_expires_at) values($1,$2,$3,$4,now()+interval '1 hour',now()+interval '30 days')", [randomUUID(),account.id,digest(token),digest(refreshToken)]);
  return { token, refreshToken, user };
}
export async function accountFromToken(token) {
  if (!token?.startsWith('hc_')) return legacy.accountFromToken(token);
  const { rows } = await getPool().query('select a.email from healthcare_private.sessions s join healthcare_private.accounts a on a.id=s.account_id where s.access_hash=$1 and s.revoked_at is null and s.access_expires_at>now() and a.verified_at is not null', [digest(token)]);
  const user = rows[0] && await profileFor(rows[0].email);
  if (!user) throw new Error('Authentication required');
  return user;
}
export async function refreshAccount(refreshToken) {
  if (!refreshToken?.startsWith('hr_')) return legacy.refreshAccount(refreshToken);
  const token = `hc_${opaque()}`, nextRefresh = `hr_${opaque()}`;
  const { rows } = await getPool().query("update healthcare_private.sessions set access_hash=$2,refresh_hash=$3,access_expires_at=now()+interval '1 hour' where refresh_hash=$1 and revoked_at is null and refresh_expires_at>now() returning account_id", [digest(refreshToken),digest(token),digest(nextRefresh)]);
  if (!rows[0]) throw new Error('Session expired');
  const account = (await getPool().query('select email from healthcare_private.accounts where id=$1 and verified_at is not null', [rows[0].account_id])).rows[0];
  const user = account && await profileFor(account.email);
  if (!user) throw new Error('Session expired');
  return { token, refreshToken: nextRefresh, user };
}
export async function logoutAccount(refreshToken) {
  if (typeof refreshToken === 'string' && refreshToken.startsWith('hr_')) {
    await getPool().query('update healthcare_private.sessions set revoked_at=now() where refresh_hash=$1 and revoked_at is null', [digest(refreshToken)]);
  }
}
export async function changeAccountPassword(authUserId, email, oldPassword, newPassword) {
  const account = await findAccount(email);
  if (!account) return legacy.changeAccountPassword(authUserId,email,oldPassword,newPassword);
  if (!(await passwordMatches(oldPassword, account.password_hash))) throw failure('Incorrect current password');
  const hash = await passwordHash(newPassword);
  await transaction(async client => {
    await client.query('update healthcare_private.accounts set password_hash=$2 where id=$1', [account.id,hash]);
    await client.query('update healthcare_private.sessions set revoked_at=now() where account_id=$1', [account.id]);
  });
}
