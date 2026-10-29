import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWaveformMode } from '../../backoffice/backoffice';
import { highBpReadingAt } from '../ECG/liveSimulation';
import './HighBpAlert.css';

/** App-wide alert shown while High blood pressure is selected in the Backoffice. */
export default function HighBpAlert() {
  const [waveform] = useWaveformMode(4000);
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (waveform.mode !== 'high-bp' || !waveform.updatedAt || dismissed === waveform.updatedAt) return null;
  const reading = highBpReadingAt(waveform.updatedAt);
  const time = new Date(waveform.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return <div className="hbp-alert" role="alert">
    <span className="hbp-alert-icon" aria-hidden="true"><i className="fa-solid fa-triangle-exclamation" /></span>
    <div className="hbp-alert-text"><strong>High blood pressure alert</strong><span>{reading.systolic}/{reading.diastolic} mmHg · {time} · Test alert, simulated reading</span></div>
    <Link to="/bp-alerts" className="hbp-alert-link" onClick={() => setDismissed(waveform.updatedAt)}>View alert</Link>
    <button type="button" className="hbp-alert-close" onClick={() => setDismissed(waveform.updatedAt)} aria-label="Dismiss alert"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
  </div>;
}
