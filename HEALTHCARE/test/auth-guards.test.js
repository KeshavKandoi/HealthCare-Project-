import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { userAuth, isAdmin } from '../dist/middlewares/authMiddlewares.js';

function response() {
  return {
    code: 200,
    body: null,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('user auth rejects malformed and invalid bearer tokens', () => {
  process.env.JWT_SECRET = 'isolated-test-secret';
  for (const authorization of [undefined, 'abc', 'Bearer invalid']) {
    const res = response();
    let advanced = false;
    userAuth({ headers: { authorization } }, res, () => { advanced = true; });
    assert.equal(res.code, 401);
    assert.equal(advanced, false);
  }
});

test('user auth requires a valid identity claim', () => {
  process.env.JWT_SECRET = 'isolated-test-secret';
  const res = response();
  const token = jwt.sign({ other: 'value' }, process.env.JWT_SECRET);
  let advanced = false;
  userAuth({ headers: { authorization: `Bearer ${token}` } }, res, () => { advanced = true; });
  assert.equal(res.code, 401);
  assert.equal(advanced, false);
});

test('user auth forwards a verified patient identity', () => {
  process.env.JWT_SECRET = 'isolated-test-secret';
  const res = response();
  const token = jwt.sign({ id: 'patient-test-id' }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  let advanced = false;
  userAuth(req, res, () => { advanced = true; });
  assert.equal(advanced, true);
  assert.deepEqual(req.user, { id: 'patient-test-id' });
});

test('admin auth requires an authenticated identity', async () => {
  const res = response();
  let advanced = false;
  await isAdmin({ headers: {} }, res, () => { advanced = true; });
  assert.equal(res.code, 401);
  assert.equal(advanced, false);
});
