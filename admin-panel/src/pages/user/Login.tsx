import { useState, type FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux/store';
import { login } from '../../redux/actions/authAction';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return toast.error('Please provide email and password');
    setSubmitting(true);
    try {
      await dispatch(login({ email: email.trim(), password })).unwrap();
      toast.success('Signed in');
      navigate('/home');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return <form onSubmit={handleSubmit} className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
    <h1>Admin panel</h1>
    <div className="mb-3"><label htmlFor="admin-email" className="form-label">Email address</label><input id="admin-email" type="email" autoComplete="email" required className="form-control" value={email} onChange={event => setEmail(event.target.value)} /></div>
    <div className="mb-3"><label htmlFor="admin-password" className="form-label">Password</label><input id="admin-password" type="password" autoComplete="current-password" required className="form-control" value={password} onChange={event => setPassword(event.target.value)} /></div>
    <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Login'}</button>
  </form>;
}
