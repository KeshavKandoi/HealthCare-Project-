import { useState, type FormEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';
import { login } from '../../redux/actions/authAction';
import { logout } from '../../redux/slice/authSlice';
import { leaveDemoSession } from '../../demo/demoSession';
import './Auth.css';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { tr } = useLanguage();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return toast.error(tr('Please provide all fields'));
    setSubmitting(true);
    setNeedsVerification(false);
    try {
      leaveDemoSession();
      dispatch(logout());
      await dispatch(login({ email: email.trim(), password })).unwrap();
      toast.success(tr('Login successful'));
      navigate(localStorage.getItem('heartline.onboardingEmail') === email.trim().toLowerCase() ? '/my-health?setup=1' : '/');
    } catch (error) {
      const message = typeof error === 'string' ? error : 'Login failed';
      setNeedsVerification(/unconfirmed email|email not verified/i.test(message));
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="auth-container memora-auth"><div className="memora-auth-content"><div className="memora-brand">♥ Heartline</div><div className="card">
    <h2>{tr('Login')}</h2>
    <p>{tr('Please enter your email and password')}</p>
    <form onSubmit={handleSubmit}>
      <div className="form-group mb-3"><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" aria-label={tr('Email')} autoComplete="email" required placeholder={tr('Enter your email')} value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div className="form-group mb-3"><label htmlFor="auth-password">Password</label><input id="auth-password" type="password" aria-label={tr('Password')} autoComplete="current-password" required placeholder={tr('Enter your password')} value={password} onChange={event => setPassword(event.target.value)} /></div>
      <button className="hl-button" type="submit" disabled={submitting || !email || !password} style={{ width: '100%' }}>{tr(submitting ? 'Signing in…' : 'Login')}</button>
      <p className="mt-3"><NavLink to="/forgot-password">Forgot password?</NavLink></p>
      {needsVerification && <p className="mt-3"><NavLink to="/register" onClick={() => sessionStorage.setItem('pendingSignupEmail', email.trim())}>Verify email or resend code</NavLink></p>}
      <p className="mt-3">{tr('New here?')} <NavLink to="/register">{tr('Create an account')}</NavLink></p>
    </form>
  </div><p className="memora-auth-foot">Your heart health, together.</p></div></div>;
}
