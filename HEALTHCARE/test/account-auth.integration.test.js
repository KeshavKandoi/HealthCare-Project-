import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('application accounts verify signup and recovery codes and revoke old sessions', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.HEALTHCARE_OTP_SECRET = 'test-only-otp-secret-at-least-32-characters';
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'noreply@example.test';
  const { getPool } = await import('../dist/config/db.js');
  const db = getPool();
  await db.query('create schema if not exists auth; create table if not exists auth.users(id uuid primary key,email text,raw_user_meta_data jsonb); create table if not exists public.app_users(id text primary key,data jsonb not null); create unique index if not exists app_users_email_test on public.app_users(lower(data->>\'email\'))');
  await db.query(await readFile(new URL('../migrations/010_account_auth.sql', import.meta.url), 'utf8'));
  const originalFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (_url, options) => { sent.push(JSON.parse(options.body)); return new Response('{}', {status: 200}); };
  try {
    const auth = await import('../dist/lib/accountAuth.js');
    await auth.signUpAccount({name:'Patient',email:'patient@example.test',password:'correct-horse-123'});
    const firstCode = sent.at(-1).text.match(/\b\d{6}\b/)[0];
    await assert.rejects(auth.verifySignupCode('patient@example.test', firstCode === '000000' ? '000001' : '000000'));
    await auth.verifySignupCode('patient@example.test', firstCode);
    await assert.rejects(auth.verifySignupCode('patient@example.test', firstCode));
    const session = await auth.signInAccount('patient@example.test', 'correct-horse-123');
    const user = await auth.accountFromToken(session.token);
    assert.equal(user.email, 'patient@example.test');
    assert.equal(user.password, undefined);
    const refreshed = await auth.refreshAccount(session.refreshToken);
    await assert.rejects(auth.refreshAccount(session.refreshToken));
    await auth.requestPasswordReset('patient@example.test');
    const recoveryCode = sent.at(-1).text.match(/\b\d{6}\b/)[0];
    await assert.rejects(auth.resetAccountPassword('patient@example.test', recoveryCode === '000000' ? '000001' : '000000', 'new-password-456'));
    await auth.resetAccountPassword('patient@example.test', recoveryCode, 'new-password-456');
    await assert.rejects(auth.accountFromToken(refreshed.token));
    await assert.rejects(auth.signInAccount('patient@example.test', 'correct-horse-123'));
    const updated = await auth.signInAccount('patient@example.test', 'new-password-456');
    assert.equal(updated.user.email, 'patient@example.test');
    await auth.logoutAccount(updated.refreshToken);
    await assert.rejects(auth.accountFromToken(updated.token));
    await assert.rejects(auth.refreshAccount(updated.refreshToken));
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000001','legacy@example.test','{\"name\":\"Legacy\"}')");
    await db.query("insert into public.app_users(id,data) values('existing-profile','{\"email\":\"legacy@example.test\",\"name\":\"Legacy\",\"isAdmin\":false}')");
    await auth.requestPasswordReset('legacy@example.test');
    const legacyCode = sent.at(-1).text.match(/\b\d{6}\b/)[0];
    await auth.resetAccountPassword('legacy@example.test', legacyCode, 'legacy-password-123');
    const legacySession = await auth.signInAccount('legacy@example.test', 'legacy-password-123');
    assert.equal(legacySession.user._id, 'existing-profile');
    const express = (await import('express')).default;
    const router = (await import('../dist/routes/userRoutes.js')).default;
    const app = express(); app.use(express.json()); app.use('/api/v1/user', router);
    const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}/api/v1/user`;
    const post = (path, body) => originalFetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    try {
      const created = await post('/register', { name:'API Patient', email:'api@example.test', password:'api-password-123' });
      assert.equal(created.status, 201);
      const signupCode = sent.at(-1).text.match(/\b\d{6}\b/)[0];
      assert.equal((await post('/register/verify-code', { email:'api@example.test', code:signupCode })).status, 200);
      const login = await post('/login', { email:'api@example.test', password:'api-password-123' });
      assert.equal(login.status, 200);
      assert.match((await login.json()).token, /^hc_/);
      assert.equal((await post('/password/forgot', {email:'api@example.test'})).status, 200);
      const resetCode = sent.at(-1).text.match(/\b\d{6}\b/)[0];
      assert.equal((await post('/password/reset', {email:'api@example.test', code:resetCode, password:'new-api-password-456'})).status, 200);
      assert.equal((await post('/login', { email:'api@example.test', password:'new-api-password-456' })).status, 200);
    } finally { await new Promise(resolve => server.close(resolve)); }
  } finally { globalThis.fetch = originalFetch; await db.end(); }
});
