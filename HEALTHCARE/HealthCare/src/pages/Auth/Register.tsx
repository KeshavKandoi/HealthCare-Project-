import { useState, type FormEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';
import { register } from '../../redux/actions/authAction';
import { startDemo } from '../../redux/slice/authSlice';
import { enterDemoSession } from '../../demo/demoSession';
import './Auth.css';
import { useLanguage } from '../../i18n/LanguageContext';
import API from '../../Api/API';

function authError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === 'string') return error.response.data.message as string;
  return fallback;
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => sessionStorage.getItem('pendingSignupEmail') || '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(() => !!sessionStorage.getItem('pendingSignupEmail'));
  const [code, setCode] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { tr } = useLanguage();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password) return toast.error(tr('Please provide all fields'));
    setSubmitting(true);
    try {
      const result = await dispatch(register({ name: name.trim(), email: email.trim(), password })).unwrap();
      toast.success(result.message);
      if (result.needsEmailConfirmation) {
        sessionStorage.setItem('pendingSignupEmail', email.trim());
        setAwaitingCode(true);
      }
      else navigate('/login');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return toast.error('Enter the six digit code from your email.');
    setSubmitting(true);
    try {
      await API.post('/user/register/verify-code', { email: email.trim(), code });
      sessionStorage.removeItem('pendingSignupEmail');
      toast.success('Email verified. Please sign in.');
      navigate('/login');
    } catch (error) {
      toast.error(authError(error, 'Invalid or expired code.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    setSubmitting(true);
    try {
      const { data } = await API.post<{ message: string }>('/user/register/resend-code', { email: email.trim() });
      toast.success(data.message);
    } catch (error) {
      toast.error(authError(error, 'Could not send a new code yet.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDemoSignIn() {
    enterDemoSession();
    dispatch(startDemo());
    navigate('/');
  }

  return <div className="auth-container"><div className="card">
    <h2>{awaitingCode ? 'Verify your email' : tr('Create an account')}</h2>
    <p>{awaitingCode ? `Enter the six digit code sent to ${email.trim()}.` : tr('Please enter your details to register')}</p>
    {awaitingCode ? <form onSubmit={verifyCode}>
      <div className="form-group mb-3"><input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} aria-label="Email verification code" required placeholder="Six digit code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
      <button className="hl-button" type="submit" disabled={submitting || code.length !== 6} style={{ width: '100%' }}>{submitting ? 'Verifying…' : 'Verify email'}</button>
      <p className="mt-3">No code? <button type="button" className="auth-text-button" onClick={resendCode} disabled={submitting}>Send a new code</button></p>
      <p className="mt-3"><button type="button" className="auth-text-button" onClick={() => { sessionStorage.removeItem('pendingSignupEmail'); setAwaitingCode(false); setCode(''); }}>Change email</button></p>
      <p className="mt-3">Received a confirmation link instead? Open it from your email, then <NavLink to="/login">sign in</NavLink>.</p>
      <p className="mt-3"><NavLink to="/login">Already verified? Sign in</NavLink></p>
    </form> : <form onSubmit={handleSubmit}>
      <div className="form-group mb-3"><input type="text" aria-label={tr('Name')} autoComplete="name" required placeholder={tr('Enter your name')} value={name} onChange={event => setName(event.target.value)} /></div>
      <div className="form-group mb-3"><input type="email" aria-label={tr('Email')} autoComplete="email" required placeholder={tr('Enter your email')} value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div className="form-group mb-3"><input type="password" aria-label={tr('Password')} autoComplete="new-password" required minLength={8} placeholder={tr('Enter your password')} value={password} onChange={event => setPassword(event.target.value)} /></div>
      <button className="hl-button" type="submit" disabled={submitting || !name || !email || !password} style={{ width: '100%' }}>{tr(submitting ? 'Creating account…' : 'Register')}</button>
      <p className="mt-3">{tr('Already have an account?')} <NavLink to="/login">{tr('Sign in')}</NavLink></p>
    </form>}
    {!awaitingCode && <div className="demo-signin"><span>{tr('or')}</span><button className="hl-button hl-button--soft" type="button" onClick={handleDemoSignIn}>{tr('Continue as demo patient')}</button><p>{tr('No account or email key needed. Your demo changes stay in this tab.')}</p></div>}
  </div></div>;
}
