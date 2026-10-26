import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import API from '../Api/API';
import { useLanguage } from '../i18n/LanguageContext';
import type { RootState } from '../redux/store';
import type { Appointment, RecordingSession, HealthMeasurement } from '../types/domain';
import './Home.css';

type Plan = { id: string; target_hours: number; recorded_hours: number | string; review_due_at: string; doctor_name?: string };
type Health = { events: unknown[]; medications: unknown[]; measurements: HealthMeasurement[] };
type Visit = Appointment & { doctor_name?: string };
type Summary = { next: Visit | null; health: Health | null; recordings: RecordingSession[]; plan: Plan | null };

export default function Home() {
  const { user, demo } = useSelector((state: RootState) => state.auth);
  const { locale, tr } = useLanguage();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user || demo) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    Promise.allSettled([
      API.get<{ appointments: Visit[] }>('/scheduling/mine'),
      API.get<Health>('/my-health/overview'),
      API.get<{ sessions: RecordingSession[] }>('/ecg/sessions'),
      API.get<{ plans: Plan[] }>('/monitoring/plans'),
    ]).then(([visits, health, recordings, plans]) => {
      if (!active) return;
      setFailed([visits, health, recordings, plans].some(result => result.status === 'rejected'));
      const appointments = visits.status === 'fulfilled' ? visits.value.data.appointments : [];
      const next = appointments.filter(item => item.status === 'confirmed' && Date.parse(item.start_at) > Date.now())
        .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at))[0] || null;
      setSummary({
        next,
        health: health.status === 'fulfilled' ? health.value.data : null,
        recordings: recordings.status === 'fulfilled' ? recordings.value.data.sessions : [],
        plan: plans.status === 'fulfilled' ? plans.value.data.plans[0] || null : null,
      });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, demo]);

  if (!user) return <main className="home-public">
    <div className="home-public-content">
      <span className="home-kicker">HEARTLINE</span>
      <h1>{tr('Your care,')} <em>{tr('in one place.')}</em></h1>
      <p>{tr('Keep your health history, ECG recordings, appointments, and care plans together.')}</p>
      <div className="home-public-actions">
        <Link className="hl-button" to="/register">{tr('Sign up')} <span aria-hidden="true">↗</span></Link>
        <Link className="hl-button hl-button--soft" to="/login">{tr('Sign in')}</Link>
      </div>
      <div className="home-public-foot"><span>{tr('ECG records')}</span><span>{tr('Appointments')}</span><span>{tr('Care plans')}</span></div>
    </div>
    <div className="home-public-art" aria-hidden="true"><div className="home-public-line"><svg viewBox="0 0 520 130" preserveAspectRatio="none"><path d="M0 67h92l18-15 15 37 20-74 23 102 19-50h72l16-9 13 17 18-37 19 57 16-28h168" /></svg></div><div className="home-public-art-label">{tr('A clearer record of your care.')}</div></div>
  </main>;

  const latestRecording = summary?.recordings[0];
  const latestBp = (kind: HealthMeasurement['kind']) => summary?.health?.measurements
    .filter(item => item.kind === kind).sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at))[0];
  const systolic = latestBp('systolic_bp');
  const diastolic = latestBp('diastolic_bp');
  const bp = systolic && diastolic ? `${systolic.value}/${diastolic.value} mmHg` : null;

  return <main className="home-dashboard">
    <header className="home-dashboard-heading">
      <div><span className="home-kicker">{tr(demo ? 'DEMO WORKSPACE' : 'YOUR DASHBOARD')}</span><h1>{tr('Welcome,')} {user.name?.split(' ')[0] || 'there'}.</h1><p>{tr(demo ? 'Explore the workspace. Sample records are available in each section.' : 'Your latest information and next steps.')}</p></div>
      <Link className="hl-button" to="/ecg-monitor">{tr('Open ECG monitor')} <span aria-hidden="true">↗</span></Link>
    </header>
    {failed && !demo && <p className="home-dashboard-error" role="status">{tr('Some information could not load. Open its section to try again.')}</p>}
    {loading && <p className="home-dashboard-loading" role="status">{tr('Loading your records…')}</p>}
    <section className="home-summary-grid" aria-label="Your latest health information">
      <Link to="/ecg-history" className="home-summary-card"><span>{tr('ECG RECORDINGS')}</span><strong>{demo ? tr('Explore') : summary ? String(summary.recordings.length) : '—'}</strong><small>{demo ? tr('View sample studies') : latestRecording ? `Latest study: ${latestRecording.status}` : tr('No recordings yet')}</small><i aria-hidden="true">↗</i></Link>
      <Link to="/my-health" className="home-summary-card"><span>{tr('LATEST BLOOD PRESSURE')}</span><strong>{demo ? tr('Explore') : bp || '—'}</strong><small>{demo ? tr('View sample measurements') : bp ? tr('Most recent saved reading') : tr('No BP reading saved')}</small><i aria-hidden="true">↗</i></Link>
      <Link to="/appointments" className="home-summary-card"><span>{tr('NEXT APPOINTMENT')}</span><strong>{demo ? tr('Explore') : summary?.next ? new Date(summary.next.start_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '—'}</strong><small>{demo ? tr('View sample appointments') : summary?.next ? `${summary.next.doctor_name || 'Confirmed visit'} · ${new Date(summary.next.start_at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}` : tr('No confirmed appointment')}</small><i aria-hidden="true">↗</i></Link>
      <Link to="/care-plans" className="home-summary-card"><span>{tr('CARE PLAN')}</span><strong>{demo ? tr('Explore') : summary?.plan ? `${summary.plan.target_hours}h` : '—'}</strong><small>{demo ? tr('View sample plans') : summary?.plan ? tr('Target recording duration') : tr('No plan assigned')}</small><i aria-hidden="true">↗</i></Link>
    </section>
    <section className="home-next" aria-labelledby="home-next-heading"><div><span className="home-kicker">{tr('QUICK ACCESS')}</span><h2 id="home-next-heading">{tr('Continue where you need to.')}</h2></div><nav aria-label="Dashboard shortcuts"><Link to="/my-health">{tr('Health records')} <span aria-hidden="true">↗</span></Link><Link to="/doctors">{tr('Find a doctor')} <span aria-hidden="true">↗</span></Link><Link to="/ecg-history">{tr('Recording history')} <span aria-hidden="true">↗</span></Link></nav></section>
  </main>;
}
