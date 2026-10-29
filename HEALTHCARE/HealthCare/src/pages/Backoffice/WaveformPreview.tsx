import LiveSweep from '../../components/ECG/LiveSweep';
import { useLiveVitals } from '../../components/ECG/liveSimulation';
import type { WaveformMode } from '../../components/ECG/simulation';

/** The same live sweep and readings the monitors show, on a bedside-style screen. */
export default function WaveformPreview({ mode }: { mode: WaveformMode }) {
  const vitals = useLiveVitals(mode);
  const off = mode === 'off';
  return <div className="bo-preview">
    <LiveSweep mode={mode} ink="#5ef0a1" className="bo-screen" label={off ? 'Preview: leads are not connected' : 'Preview of the live ECG waveform'}>
      {off && <div className="bo-screen-off"><i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" /><span>Leads are not connected</span></div>}
    </LiveSweep>
    <div className="bo-readout" aria-label="Preview readings">
      <div><span>Heart rate</span><strong>{vitals ? Math.round(vitals.bpm) : '—'}<small>BPM</small></strong></div>
      <div><span>Blood pressure</span><strong>{vitals ? `${Math.round(vitals.systolic)}/${Math.round(vitals.diastolic)}` : '—'}<small>mmHg</small></strong></div>
    </div>
  </div>;
}
