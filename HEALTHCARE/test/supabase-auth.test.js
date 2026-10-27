import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import userModel from '../dist/models/UserModels.js';
import { userAuth, isAdmin } from '../dist/middlewares/authMiddlewares.js';
import { patientAuth, authenticateSocket } from '../dist/middlewares/ecgAuth.js';
import { signInAccount, refreshAccount, requestPasswordReset, resetAccountPassword } from '../dist/lib/supabaseAuth.js';

function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json() { return this; } };
}

test('Supabase token establishes patient identity and ignores supplied IDs', async () => {
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/auth/v1/user' && req.headers.authorization === 'Bearer owner-token') {
      res.end(JSON.stringify({ id: 'auth-owner', email: 'owner@example.test' }));
    } else if (req.url?.startsWith('/auth/v1/token?grant_type=') && req.method === 'POST') {
      res.end(JSON.stringify({ access_token: 'owner-token', refresh_token: 'refresh-owner', token_type: 'bearer', expires_in: 3600, user: { id: 'auth-owner', email: 'owner@example.test' } }));
    } else {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: 'Invalid token' }));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const oldFindOne = userModel.findOne;
  const oldFindById = userModel.findById;
  process.env.SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
  userModel.findOne = async filter => filter.authUserId === 'auth-owner' ? { _id: 'local-owner', authUserId: 'auth-owner', email: 'owner@example.test' } : null;
  userModel.findById = async () => null;
  try {
    const login = await signInAccount('owner@example.test', 'password');
    assert.equal(login.token, 'owner-token');
    assert.equal(login.refreshToken, 'refresh-owner');
    assert.equal(login.user._id, 'local-owner');
    const refreshed = await refreshAccount('refresh-owner');
    assert.equal(refreshed.token, 'owner-token');
    const req = { headers: { authorization: 'Bearer owner-token' }, body: { patientId: 'victim' } };
    let advanced = false;
    await patientAuth(req, response(), () => { advanced = true; });
    assert.equal(advanced, true);
    assert.equal(req.patientId, 'local-owner');
    const userReq = { headers: { authorization: 'Bearer owner-token' } };
    await userAuth(userReq, response(), () => { advanced = true; });
    assert.equal(userReq.user.id, 'local-owner');
    const socket = { handshake: { auth: { token: 'owner-token', patientId: 'victim' } }, data: {} };
    await authenticateSocket(socket, error => assert.equal(error, undefined));
    assert.equal(socket.data.patientId, 'local-owner');
    for (const authorization of [undefined, 'Bearer bad-token']) {
      const denied = response();
      await patientAuth({ headers: { authorization } }, denied, () => assert.fail('must reject'));
      assert.equal(denied.code, 401);
    }
    const deniedSocket = { handshake: { auth: { patientId: 'victim' } }, data: {} };
    await authenticateSocket(deniedSocket, error => assert.match(error.message, /Authentication required/));
  } finally {
    userModel.findOne = oldFindOne;
    userModel.findById = oldFindById;
    await new Promise(resolve => server.close(resolve));
  }
});

test('administrator gate still requires an authenticated local administrator', async () => {
  const denied = response();
  await isAdmin({ headers: {} }, denied, () => assert.fail('must reject'));
  assert.equal(denied.code, 401);
});

test('password recovery changes a password only after the emailed code is verified', async () => {
  const requests = [];
  const accessToken = [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'owner', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
    'test-signature',
  ].join('.');
  const server = createServer(async (req, res) => {
    const body = await new Promise(resolve => {
      let value = '';
      req.on('data', chunk => { value += chunk; });
      req.on('end', () => resolve(value ? JSON.parse(value) : {}));
    });
    requests.push({ path: req.url, method: req.method, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/auth/v1/recover' && req.method === 'POST') return res.end('{}');
    if (req.url?.startsWith('/auth/v1/verify') && req.method === 'POST') {
      if (body.token !== '123456') {
        res.statusCode = 403;
        return res.end(JSON.stringify({ message: 'Invalid token' }));
      }
      return res.end(JSON.stringify({ access_token: accessToken, refresh_token: 'recovery-refresh', token_type: 'bearer', expires_in: 3600, user: { id: 'owner', email: 'owner@example.test' } }));
    }
    if (req.url === '/auth/v1/user' && req.method === 'GET') return res.end(JSON.stringify({ id: 'owner', email: 'owner@example.test' }));
    if (req.url === '/auth/v1/user' && req.method === 'PUT') return res.end(JSON.stringify({ id: 'owner', email: 'owner@example.test' }));
    if (req.url === '/auth/v1/logout' && req.method === 'POST') return res.end('{}');
    res.statusCode = 404;
    res.end(JSON.stringify({ message: 'Unexpected request' }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
  try {
    await requestPasswordReset('owner@example.test');
    await assert.rejects(resetAccountPassword('owner@example.test', '000000', 'new-password-123'));
    assert.equal(requests.filter(req => req.method === 'PUT').length, 0);
    await resetAccountPassword('owner@example.test', '123456', 'new-password-123');
    assert.equal(requests.filter(req => req.method === 'PUT').length, 1);
    assert.equal(requests.find(req => req.method === 'PUT').body.password, 'new-password-123');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
