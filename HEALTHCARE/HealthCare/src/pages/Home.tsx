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
type Summary = { next: Visit | null; health: Health | null; recordings: RecordingSession[] | null; plan: Plan | null; visitsFailed: boolean; plansFailed: boolean };

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
        recordings: recordings.status === 'fulfilled' ? recordings.value.data.sessions : null,
        plan: plans.status === 'fulfilled' ? plans.value.data.plans[0] || null : null,
        visitsFailed: visits.status === 'rejected',
        plansFailed: plans.status === 'rejected',
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

  const latestRecording = summary?.recordings?.[0];
  const latestBp = (kind: HealthMeasurement['kind']) => summary?.health?.measurements
    .filter(item => item.kind === kind).sort((a, b) => Date.parse(b.measured_at) - Date.parse(a.measured_at))[0];
  const systolic = latestBp('systolic_bp');
  const diastolic = latestBp('diastolic_bp');
  const bp = systolic && diastolic ? `${systolic.value}/${diastolic.value} mmHg` : null;

  return <main className="home-dashboard">
    <div className="home-dashboard-inner">
    <header className="home-dashboard-heading">
      <div className="home-heading-copy"><span className="home-kicker"><span className="home-kicker-dot" />{tr(demo ? 'DEMO WORKSPACE' : 'YOUR DASHBOARD')}</span><h1>{tr('Welcome,')} <span>{user.name?.split(' ')[0] || 'there'}.</span></h1><p>{tr(demo ? 'Explore the workspace. Sample records are available in each section.' : 'Your latest information and next steps.')}</p><Link className="home-monitor-button" to="/ecg-monitor"><i className="fa-solid fa-heart-pulse" aria-hidden="true" />{tr('Open ECG monitor')} <span aria-hidden="true">↗</span></Link></div>
      <div className="home-heading-art" aria-hidden="true"><div className="home-art-ring home-art-ring-outer" /><div className="home-art-ring home-art-ring-inner" /><svg viewBox="0 0 300 90" fill="none"><path d="M0 46h68l12-11 12 25 14-45 17 65 15-34h36l10-8 9 16 12-27 13 29 9-10h73" /></svg><span className="home-art-caption">HEARTLINE / YOUR CARE</span></div>
    </header>
    {failed && !demo && <p className="home-dashboard-error" role="status">{tr('Some information could not load. Open its section to try again.')}</p>}
    {loading && <p className="home-dashboard-loading" role="status">{tr('Loading your records…')}</p>}
    <div className="home-section-heading"><div><span className="home-kicker">{tr('YOUR DASHBOARD')}</span><h2>{tr('Your health at a glance')}</h2></div><span className="home-section-hint">{tr('Select a card to see more')} <span aria-hidden="true">↗</span></span></div>
    <section className="home-summary-grid" aria-label="Your latest health information">
      <Link to="/ecg-history" className="home-summary-card"><div className="home-card-top"><span className="home-card-icon"><i className="fa-solid fa-wave-square" aria-hidden="true" /></span><span className="home-card-arrow" aria-hidden="true">↗</span></div><span className="home-card-label">{tr('ECG RECORDINGS')}</span><strong>{demo ? tr('Explore') : summary?.recordings ? String(summary.recordings.length) : '—'}</strong><small>{demo ? tr('View sample studies') : loading ? tr('Loading your records…') : summary?.recordings === null ? tr('Unable to load') : latestRecording ? `Latest study: ${latestRecording.status}` : tr('No recordings yet')}</small></Link>
      <Link to="/my-health" className="home-summary-card"><div className="home-card-top"><span className="home-card-icon home-card-icon-blue"><i className="fa-solid fa-droplet" aria-hidden="true" /></span><span className="home-card-arrow" aria-hidden="true">↗</span></div><span className="home-card-label">{tr('LATEST BLOOD PRESSURE')}</span><strong>{demo ? tr('Explore') : bp || '—'}</strong><small>{demo ? tr('View sample measurements') : loading ? tr('Loading your records…') : summary && !summary.health ? tr('Unable to load') : bp ? tr('Most recent saved reading') : tr('No BP reading saved')}</small></Link>
      <Link to="/appointments" className="home-summary-card"><div className="home-card-top"><span className="home-card-icon home-card-icon-peach"><i className="fa-regular fa-calendar" aria-hidden="true" /></span><span className="home-card-arrow" aria-hidden="true">↗</span></div><span className="home-card-label">{tr('NEXT APPOINTMENT')}</span><strong>{demo ? tr('Explore') : summary?.next ? new Date(summary.next.start_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '—'}</strong><small>{demo ? tr('View sample appointments') : loading ? tr('Loading your records…') : summary?.visitsFailed ? tr('Unable to load') : summary?.next ? `${summary.next.doctor_name || 'Confirmed visit'} · ${new Date(summary.next.start_at).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}` : tr('No confirmed appointment')}</small></Link>
      <Link to="/care-plans" className="home-summary-card"><div className="home-card-top"><span className="home-card-icon home-card-icon-lilac"><i className="fa-solid fa-clipboard-list" aria-hidden="true" /></span><span className="home-card-arrow" aria-hidden="true">↗</span></div><span className="home-card-label">{tr('CARE PLAN')}</span><strong>{demo ? tr('Explore') : summary?.plan ? `${summary.plan.target_hours}h` : '—'}</strong><small>{demo ? tr('View sample plans') : loading ? tr('Loading your records…') : summary?.plansFailed ? tr('Unable to load') : summary?.plan ? tr('Target recording duration') : tr('No plan assigned')}</small></Link>
    </section>
    <section className="home-next" aria-labelledby="home-next-heading"><div className="home-next-intro"><span className="home-kicker">{tr('QUICK ACCESS')}</span><h2 id="home-next-heading">{tr('Continue where you need to.')}</h2><p>{tr('Your care, in one place.')}</p></div><nav aria-label="Dashboard shortcuts"><Link to="/my-health"><span className="home-shortcut-icon"><i className="fa-regular fa-folder-open" aria-hidden="true" /></span><span>{tr('Health records')}</span><span className="home-shortcut-arrow" aria-hidden="true">↗</span></Link><Link to="/doctors"><span className="home-shortcut-icon"><i className="fa-solid fa-user-doctor" aria-hidden="true" /></span><span>{tr('Find a doctor')}</span><span className="home-shortcut-arrow" aria-hidden="true">↗</span></Link><Link to="/ecg-history"><span className="home-shortcut-icon"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /></span><span>{tr('Recording history')}</span><span className="home-shortcut-arrow" aria-hidden="true">↗</span></Link></nav></section>
    </div>
  </main>;
}
