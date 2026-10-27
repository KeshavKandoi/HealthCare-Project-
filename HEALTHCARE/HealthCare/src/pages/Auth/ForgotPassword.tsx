import { useState, type FormEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import API from '../../Api/API';
import './Auth.css';

function authError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') return error.response.data.message as string;
  return fallback;
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function sendCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await API.post<{ message: string }>('/user/password/forgot', { email: email.trim() });
      toast.success(data.message);
      setCodeSent(true);
    } catch (error) {
      toast.error(authError(error, 'Could not send a code yet.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || password.length < 8) return;
    setSubmitting(true);
    try {
      await API.post('/user/password/reset', { email: email.trim(), code, password });
      toast.success('Password updated. Please sign in.');
      navigate('/login');
    } catch (error) {
      toast.error(authError(error, 'Invalid or expired code.'));
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="auth-container"><div className="card">
    <h2>Reset your password</h2>
    <p>{codeSent ? `Enter the code sent to ${email.trim()} and choose a new password.` : 'Enter your account email address to receive a six digit code.'}</p>
    {codeSent ? <form onSubmit={resetPassword}>
      <div className="form-group mb-3"><input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-label="Password reset code" placeholder="Six digit code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
      <div className="form-group mb-3"><input type="password" autoComplete="new-password" minLength={8} required aria-label="New password" placeholder="New password (at least 8 characters)" value={password} onChange={event => setPassword(event.target.value)} /></div>
      <button className="hl-button" type="submit" disabled={submitting || code.length !== 6 || password.length < 8} style={{ width: '100%' }}>{submitting ? 'Updating…' : 'Reset password'}</button>
      <p className="mt-3">No code? <button type="button" className="auth-text-button" disabled={submitting} onClick={() => sendCode()}>Send a new code</button></p>
      <p className="mt-3"><button type="button" className="auth-text-button" onClick={() => { setCodeSent(false); setCode(''); }}>Change email</button></p>
    </form> : <form onSubmit={sendCode}>
      <div className="form-group mb-3"><input type="email" autoComplete="email" required aria-label="Email" placeholder="Enter your email" value={email} onChange={event => setEmail(event.target.value)} /></div>
      <button className="hl-button" type="submit" disabled={submitting || !email.trim()} style={{ width: '100%' }}>{submitting ? 'Sending…' : 'Send reset code'}</button>
    </form>}
    <p className="mt-3"><NavLink to="/login">Back to sign in</NavLink></p>
  </div></div>;
}
