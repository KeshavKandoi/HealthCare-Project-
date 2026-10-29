import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clearBackofficeSession, fetchWaveformState, isUnauthorized, saveWaveformMode, storedBackofficeSession, verifyBackofficeSession, waveformModeOptions, type WaveformState } from '../../backoffice/backoffice';
import { simulationPacket, simulationSeed, type WaveformMode } from '../../components/ECG/simulation';
import WaveformPreview from './WaveformPreview';
import './Backoffice.css';

const label = (mode: WaveformMode) => waveformModeOptions.find(option => option.mode === mode)?.label ?? mode;
// Three seconds of each mode, drawn from the same simulation the monitors stream.
function outline(mode: WaveformMode) {
  if (mode === 'off') return 'M0 26H120';
  const samples = [40, 41, 42].flatMap(second => simulationPacket(second, { scenario: 'resting-v2', seed: simulationSeed, mode }));
  return samples.map((value, i) => `${i ? 'L' : 'M'}${(i / (samples.length - 1) * 120).toFixed(1)} ${(26 - value * 17).toFixed(1)}`).join('');
}

export default function Backoffice() {
  const navigate = useNavigate();
  const [session] = useState(storedBackofficeSession);
  const [live, setLive] = useState<WaveformState | null>(null);
  const [pending, setPending] = useState<WaveformMode | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const outlines = useMemo(() => new Map(waveformModeOptions.map(option => [option.mode, outline(option.mode)])), []);
  const signOut = useCallback((reason?: string) => {
    clearBackofficeSession();
    if (reason) toast.error(reason);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    verifyBackofficeSession().catch(error => { if (active && isUnauthorized(error)) signOut('Your backoffice session has ended. Please sign in again.'); });
    // Stay in sync when the mode is changed from another device.
    const load = () => fetchWaveformState().then(state => { if (active) { setLive(state); setUnreachable(false); } }, () => { if (active) setUnreachable(true); });
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [session, signOut]);

  if (!session) return <Navigate to="/login" replace />;

  async function choose(mode: WaveformMode) {
    if (pending || mode === live?.mode) return;
    setPending(mode);
    try {
      const state = await saveWaveformMode(mode);
      setLive(state); setUnreachable(false);
      toast.success(`Live waveform: ${label(mode)}`);
      if (!state.persisted) toast('Applied until the server restarts. Database storage is unavailable.', { icon: '⚠️' });
    } catch (error) {
      if (isUnauthorized(error)) return signOut('Your backoffice session has ended. Please sign in again.');
      toast.error('Could not update the live waveform. Please try again.');
    } finally {
      setPending(null);
    }
  }

  const shown = pending ?? live?.mode ?? 'normal';
  return <div className="bo-shell">
    <header className="bo-top">
      <Link to="/backoffice" className="bo-brand"><span className="bo-brand-mark" aria-hidden="true">♥</span>Heartline<span className="bo-brand-tag">Backoffice</span></Link>
      <div className="bo-account">
        <span className="bo-email" title={session.email}>{session.email}</span>
        <button type="button" className="bo-signout" onClick={() => signOut()}><i className="fa-solid fa-right-from-bracket" aria-hidden="true" />Sign out</button>
      </div>
    </header>
    <main className="bo-main">
      <section className="bo-intro">
        <p className="bo-kicker">Live monitoring control</p>
        <h1>Live waveform</h1>
        <p>Choose what the Live monitoring screen shows. Every open monitor switches within a few seconds.</p>
      </section>

      <section className="bo-panel" aria-labelledby="bo-now-title">
        <div className="bo-now" aria-live="polite">
          <span className={`bo-dot${live ? (live.mode === 'off' ? ' is-off' : ' is-live') : ''}`} aria-hidden="true" />
          <div><span className="bo-label" id="bo-now-title">On monitors now</span><strong>{live ? label(live.mode) : unreachable ? 'Unavailable' : 'Connecting…'}</strong></div>
          {live && <span className="bo-updated">{live.updatedAt ? `Updated ${new Date(live.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Default'}</span>}
        </div>
        <WaveformPreview mode={shown} />
      </section>

      {unreachable && <p className="bo-alert" role="alert">Cannot reach the monitoring service. It may be waking up — retrying automatically.</p>}

      <section className="bo-modes-section" aria-labelledby="bo-modes-title">
        <h2 id="bo-modes-title">Waveform mode</h2>
        <div className="bo-modes" role="group" aria-labelledby="bo-modes-title">
          {waveformModeOptions.map(option => <button key={option.mode} type="button" className={`bo-mode${option.mode === 'off' ? ' is-off' : ''}`} aria-pressed={shown === option.mode} aria-label={`${option.label}: ${option.summary}`} aria-describedby={`bo-mode-${option.mode}`} disabled={!live} aria-disabled={pending ? true : undefined} onClick={() => void choose(option.mode)}>
            <svg className="bo-mode-outline" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><path d={outlines.get(option.mode)} /></svg>
            <span className="bo-mode-text">
              <strong>{option.label}{live?.mode === option.mode && <em className="bo-pill">Live</em>}{pending === option.mode && <em className="bo-pill is-pending">Applying…</em>}</strong>
              <span>{option.summary}</span>
              <small id={`bo-mode-${option.mode}`}>{option.detail}</small>
            </span>
          </button>)}
        </div>
      </section>    </main>
  </div>;
}
