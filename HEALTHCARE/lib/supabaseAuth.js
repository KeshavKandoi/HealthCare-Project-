import { createClient } from '@supabase/supabase-js';
import userModel from '../models/UserModels.js';
import { getPool } from '../config/db.js';

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

async function findProfile(authUser) {
  return await userModel.findOne({ authUserId: authUser.id }) || await userModel.findById(authUser.id);
}

export async function accountFromToken(token) {
  if (!token) throw new Error('Authentication required');
  const { data, error } = await client().auth.getUser(token);
  if (error || !data.user) throw new Error('Authentication required');
  const profile = await findProfile(data.user);
  if (!profile) throw new Error('Account not found');
  return publicUser(profile);
}

export async function signUpAccount({ name, email, password }) {
  const { data, error } = await client().auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw error;
  return { needsEmailConfirmation: !data.session };
}

export async function resendSignupCode(email) {
  const { error } = await client().auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export async function verifySignupCode(email, code) {
  const { data, error } = await client().auth.verifyOtp({ email, token: code, type: 'email' });
  if (error || !data.user?.email_confirmed_at) throw error || new Error('Invalid or expired code');
}

export async function requestPasswordReset(email) {
  const { error } = await client().auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function resetAccountPassword(email, code, password) {
  const auth = client();
  const { data, error } = await auth.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error || !data.session || data.user?.email?.toLowerCase() !== email.toLowerCase()) {
    throw error || new Error('Invalid or expired code');
  }
  const session = await auth.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (session.error) throw session.error;
  const updated = await auth.auth.updateUser({ password });
  if (updated.error) throw updated.error;
  await auth.auth.signOut();
}

async function ensureProfile(authUser) {
  let profile = await findProfile(authUser);
  if (!profile) {
    const email = authUser.email?.toLowerCase();
    if (!email) throw new Error('Authenticated email is required');
    const { rows } = await getPool().query("select id from app_users where lower(data->>'email') = lower($1) limit 1", [email]);
    if (rows[0] && !authUser.email_confirmed_at) throw new Error('Confirm your email before linking an existing account');
    profile = rows[0] ? await userModel.findById(rows[0].id) : null;
    if (profile && profile.authUserId && profile.authUserId !== authUser.id) throw new Error('Account already linked');
    if (!profile) {
      profile = new userModel({ _id: authUser.id, email, name: authUser.user_metadata?.name || email.split('@')[0] });
    }
    profile.authUserId = authUser.id;
    delete profile.password;
    await profile.save();
  }
  return publicUser(profile);
}

export async function signInAccount(email, password) {
  const auth = client();
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw error || new Error('Invalid credentials');
  return { token: data.session.access_token, refreshToken: data.session.refresh_token, user: await ensureProfile(data.user) };
}

export async function refreshAccount(refreshToken) {
  if (!refreshToken) throw new Error('Refresh token required');
  const { data, error } = await client().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.user || !data.session) throw error || new Error('Session expired');
  return { token: data.session.access_token, refreshToken: data.session.refresh_token, user: await ensureProfile(data.user) };
}

export async function changeAccountPassword(authUserId, email, oldPassword, newPassword) {
  const auth = client();
  const { data, error } = await auth.auth.signInWithPassword({ email, password: oldPassword });
  if (error || data.user?.id !== authUserId) throw new Error('Incorrect current password');
  const result = await auth.auth.updateUser({ password: newPassword });
  if (result.error) throw result.error;
}
