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
