import { useState, type FormEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';
import { register } from '../../redux/actions/authAction';
import { startDemo } from '../../redux/slice/authSlice';
import { enterDemoSession } from '../../demo/demoSession';
import './Auth.css';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { tr } = useLanguage();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password) return toast.error(tr('Please provide all fields'));
    setSubmitting(true);
    try {
      await dispatch(register({ name: name.trim(), email: email.trim(), password })).unwrap();
      toast.success(tr('Account created. Please sign in.'));
      navigate('/login');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Registration failed');
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
    <h2>{tr('Create an account')}</h2>
    <p>{tr('Please enter your details to register')}</p>
    <form onSubmit={handleSubmit}>
      <div className="form-group mb-3"><input type="text" aria-label={tr('Name')} autoComplete="name" required placeholder={tr('Enter your name')} value={name} onChange={event => setName(event.target.value)} /></div>
      <div className="form-group mb-3"><input type="email" aria-label={tr('Email')} autoComplete="email" required placeholder={tr('Enter your email')} value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div className="form-group mb-3"><input type="password" aria-label={tr('Password')} autoComplete="new-password" required minLength={8} placeholder={tr('Enter your password')} value={password} onChange={event => setPassword(event.target.value)} /></div>
      <button className="hl-button" type="submit" disabled={submitting || !name || !email || !password} style={{ width: '100%' }}>{tr(submitting ? 'Creating account…' : 'Register')}</button>
      <p className="mt-3">{tr('Already have an account?')} <NavLink to="/login">{tr('Sign in')}</NavLink></p>
    </form>
    <div className="demo-signin"><span>{tr('or')}</span><button className="hl-button hl-button--soft" type="button" onClick={handleDemoSignIn}>{tr('Continue as demo patient')}</button><p>{tr('No account or email key needed. Your demo changes stay in this tab.')}</p></div>
  </div></div>;
}
