import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import API from '../../Api/API';
import { parseStreamInput } from './streamInput';
import type { ECGBatch } from '../../types/domain';

const example = '{"packets":1,"values":[80,90,100,110,100,90,80,85,95,105],"bpm":75}';

type Props = { onStarted: (deviceId: string) => void; onBatch: (batch: ECGBatch) => void; onFinished: () => void };
export default function ManualStream({ onStarted, onBatch, onFinished }: Props) {
  const [input, setInput] = useState(example);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(0);
  const [bpm, setBpm] = useState<number | null>(null);
  const run = useRef({ stopped: false, id: '' });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; run.current.stopped = true; }; }, []);
  const start = async () => {
    if (busy) return;
    let settings: ReturnType<typeof parseStreamInput>;
    try { settings = parseStreamInput(input); } catch(e) { setError(e instanceof Error ? e.message : 'Invalid input'); return; }
    run.current = { stopped: false, id: '' };
    setBusy(true); setError(''); setSent(0); setBpm(null); setStatus('Connecting…');
    try {
      const { data } = await API.post('/ecg/manual/start', {}, { timeout: 20000 });
      run.current.id = data.id;
      if (mounted.current) onStarted(data.deviceId);
      for (let sequence = 0; sequence < settings.packets && !run.current.stopped; sequence++) {
        const values = settings.values ?? Array.from({length:10}, () => 80 + Math.floor(Math.random()*41));
        const rate = settings.bpm ?? 60 + Math.floor(Math.random()*40);
        const response = await API.post(`/ecg/manual/${data.id}/packets`, {sequence,values,bpm:rate}, {timeout:10000});
        if (mounted.current) { setSent(sequence+1); setBpm(rate); setStatus('Connected · streaming'); onBatch(response.data.batch); }
        if (sequence + 1 < settings.packets && !run.current.stopped) await new Promise(resolve => setTimeout(resolve,1000));
      }
    } catch(e) {
      if (mounted.current) setError(axios.isAxiosError(e) ? e.response?.data?.message || 'The stream could not reach the server. Check your connection.' : 'Unable to start the stream.');
    } finally {
      if (run.current.id) {
        try { await API.post(`/ecg/sessions/${run.current.id}/stop`, {}, {timeout:10000}); }
        catch { if (mounted.current) setError('Packets stopped, but the server could not finalize the recording. Retry Complete recording.'); }
      }
      if (mounted.current) { setBusy(false); setStatus('Disconnected'); onFinished(); }
    }
  };
  return <section className="ecg-panel manual-stream" aria-label="Manual connection">
    <div className="ecg-panel-head"><div><h2>Manual connection</h2><p>Paste your packet JSON or terminal loop here, then click Connect and start. This page sends authenticated packets to your recording.</p></div><span className="manual-stream-badge">Simulated data</span></div>
    <label htmlFor="manual-packets">Packet input</label>
    <textarea id="manual-packets" spellCheck={false} value={input} disabled={busy} onChange={e=>setInput(e.target.value)} />
    <p className="manual-stream-help">Do not run the old /ecg/data command in Terminal: that endpoint is retired. Paste the loop above instead. Packets are sent to your account once per second. Keep this page open. This is a 10-sample/s raw test feed, not hardware ECG. Reusing the same values repeats that pattern; it cannot create P–QRS–T detail.</p>
    <div className="ecg-actions"><button disabled={busy} onClick={()=>void start()} className="ecg-primary">{busy?'Streaming…':'Connect and start'}</button><button disabled={!busy} onClick={()=>{run.current.stopped=true;setStatus('Disconnecting…')}}>Stop stream</button><button disabled={busy} onClick={()=>setInput(example)}>Use example</button></div>
    <div className="manual-stream-status" role="status"><strong>{status}</strong><span>{sent} packets saved</span><span>{bpm === null ? '—' : bpm} BPM</span></div>
    {error && <p role="alert" className="ecg-banner">{error}</p>}
    {!busy && sent>0 && <a href="/ecg-history">View recording and report →</a>}
  </section>;
}
