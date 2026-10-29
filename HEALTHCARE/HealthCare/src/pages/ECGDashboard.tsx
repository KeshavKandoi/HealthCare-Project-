import './ECGDashboard.css';
import { useWaveformMode } from '../backoffice/backoffice';
import LiveSweep from '../components/ECG/LiveSweep';
import { useLiveVitals } from '../components/ECG/liveSimulation';

const trend = (value?: string) => value ? value[0].toUpperCase() + value.slice(1) : '';

/** Live monitor that shows whatever waveform mode the backoffice has selected. */
function ECGDashboard(){
 const [waveform]=useWaveformMode(2000);
 const off=waveform.mode==='off';
 const vitals=useLiveVitals(waveform.mode);
 return <main className="ecg-new ecg-live">
  <div className="ecg-new-head"><div><p className="ecg-kicker">PATIENT MONITORING</p><h1>Live monitoring</h1><p>Your heart’s electrical activity, displayed in real time.</p></div></div>
  <div className="ecg-metrics ecg-live-metrics">
   <article><span>HEART RATE</span><strong>{vitals?`${Math.round(vitals.bpm)} BPM`:'—'}</strong><small>{off?'Leads are not connected':trend(vitals?.heartRateTrend)}</small></article>
   <article><span>BLOOD PRESSURE</span><strong>{vitals?`${Math.round(vitals.systolic)} / ${Math.round(vitals.diastolic)} mmHg`:'—'}</strong><small>{off?'Leads are not connected':trend(vitals?.trend)}</small></article>
   <article><span>LEADS</span><strong>{off?'Not connected':'Connected'}</strong><small>{off?'No signal':'Receiving signal'}</small></article>
  </div>
  <section className="ecg-panel">
   <div className="ecg-panel-head"><div><h2>Live waveform</h2><p>{off?'Leads are not connected':'Lead I · 250 samples/s'}</p></div><span className={`ecg-live-badge${off?' is-off':''}`}>{off?'No signal':'Live'}</span></div>
   {off?<div className="ecg-leads-off" role="status"><div className="ecg-leads-off-card"><span className="ecg-leads-off-icon" aria-hidden="true"><i className="fa-solid fa-plug-circle-xmark" /></span><h3>Leads are not connected</h3><p>The waveform will return as soon as the leads are reconnected.</p></div></div>
   :<LiveSweep mode={waveform.mode} ink="#202127" lineWidth={1.6} span={8} className="ecg-live-screen" label="Live ECG waveform" />}
  </section>
 </main>;
}
export default ECGDashboard;
