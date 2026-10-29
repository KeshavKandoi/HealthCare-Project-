import { useEffect, useMemo, useRef, useState } from 'react';
import API from '../../Api/API';
import SignalCanvas from './SignalCanvas';
import { initialScale, inspectSignal, validRate } from './signal';
import type { SignalChunk, AmplitudeScale } from './signal';
import './RecordingGraph.css';

type Props = { sessionId: string; sampleRate: number; start: string; end: string; units: string; live?: boolean; sourceChunks?: SignalChunk[]; liveChunks?: SignalChunk[]; lead?: string };
const windows = [1, 2, 5, 10, 30, 60, 300];

export default function RecordingGraph(props: Props) {
  // Remount all viewport state when switching recordings, including fixed amplitude scale.
  return <RecordingViewer key={props.sessionId} {...props} />;
}
function RecordingViewer({ sessionId, sampleRate, start, end, units, live = false, sourceChunks, liveChunks, lead }: Props) {
  const begin = Date.parse(start), finish = Math.max(begin + 1, Date.parse(end) || begin + 1);
  const [seconds, setSeconds] = useState(10);
  const [position, setPosition] = useState(begin);
  const [mode, setMode] = useState<'live' | 'paused' | 'playback'>(live ? 'live' : 'playback');
  const [remote, setRemote] = useState<{ key: string; chunks: SignalChunk[] } | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const [scale, setScale] = useState<AmplitudeScale | null>(null);
  const [zoom, setZoom] = useState(1);
  const [frozen, setFrozen] = useState<{chunks: SignalChunk[]; left: number} | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{x:number; position:number} | null>(null);
  const span = seconds * 1000; // Always ten seconds initially, even if only one packet exists.
  const max = Math.max(begin, finish - span);
  const left = mode === 'paused' && frozen ? frozen.left : mode === 'live' ? max : Math.max(begin, Math.min(position, max));
  // Keep an in-flight live request alive while the display clock advances.
  const fetchLeft = mode === 'live' ? Math.floor(left / 5000) * 5000 : left;
  const fetchSpan = mode === 'live' ? Math.min(300000, span + 5000) : span;
  const requestKey = `${fetchLeft}:${fetchSpan}:${retry}`;
  const merged = useMemo(()=>{const fetched = remote && (remote.key === requestKey || mode === 'live') ? remote.chunks : [];const bySequence=new Map(fetched.map(c=>[Number(c.sequence),c]));if(mode==='live')for(const c of liveChunks||[])bySequence.set(Number(c.sequence),c);return [...bySequence.values()]},[remote,requestKey,mode,liveChunks]);
  const chunks = mode === 'paused' && frozen ? frozen.chunks : sourceChunks ?? merged;
  const diagnostics = useMemo(() => inspectSignal(chunks, sampleRate), [chunks, sampleRate]);
  const displayScale = useMemo(() => ({ center: scale?.center ?? 0, perDivision: (scale?.perDivision ?? 100) / zoom }), [scale, zoom]);
  useEffect(() => {
    if (sourceChunks || mode === 'paused' || !Number.isFinite(fetchLeft) || !validRate(sampleRate)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPending(true); setError('');
      API.get<{chunks:SignalChunk[]}>(`/ecg/sessions/${sessionId}/chunks`, { params: { start: new Date(fetchLeft).toISOString(), end: new Date(fetchLeft + fetchSpan).toISOString() }, signal: controller.signal })
        .then(response => { if (!controller.signal.aborted) { setRemote({key:requestKey, chunks:response.data.chunks}); if(response.data.chunks.some(c=>c.samples.some(Number.isFinite)))setScale(current=>current??initialScale(response.data.chunks,units)); } })
        .catch(() => { if (!controller.signal.aborted) { setRemote(null); setError('Unable to load samples. Reconnect and retry.'); } })
        .finally(() => { if (!controller.signal.aborted) setPending(false); });
    }, 100);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [sessionId, fetchLeft, fetchSpan, requestKey, sampleRate, sourceChunks, mode, units]);
  useEffect(() => {
    const supplied=sourceChunks||liveChunks;
    if (supplied?.some(c=>c.samples.some(Number.isFinite))) setScale(current=>current??initialScale(supplied,units));
  }, [sourceChunks, liveChunks, units]);
  useEffect(() => {
    const reconnect = () => setRetry(value => value + 1);
    window.addEventListener('online', reconnect);
    // Poll the same viewport in live mode too: late/gateway-replayed batches may have identical end times.
    const timer = undefined;
    return () => { window.removeEventListener('online', reconnect); clearInterval(timer); };
  }, [live, mode, sourceChunks]);
  const pan = (next: number) => { setMode('playback'); setPosition(Math.max(begin, Math.min(max, next))); };
  const changeZoom = (direction: number) => {
    setSeconds(current => windows[Math.max(0, Math.min(windows.length - 1, windows.indexOf(current) + direction))]);
    if (mode === 'paused') { setMode('playback'); setPosition(left); }
  };
  // React wheel listeners are passive; use a native non-passive listener for modifier zoom and trackpads.
  useEffect(() => {
    const el = surface.current; if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) { event.preventDefault(); changeZoom(event.deltaY > 0 ? 1 : -1); }
      else if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault(); const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1;
        pan(left + (event.deltaX || event.deltaY) * unit / Math.max(1, el.clientWidth - 74) * span);
      }
    };
    el.addEventListener('wheel', wheel, {passive:false}); return () => el.removeEventListener('wheel', wheel);
  });
  if (!Number.isFinite(begin) || !validRate(sampleRate)) return <p role="alert">Recording timing is unavailable. A sample rate and start timestamp are required.</p>;
  const clipping = Number.isFinite(diagnostics.low) && (diagnostics.low < displayScale.center - 3 * displayScale.perDivision || diagnostics.high > displayScale.center + 3 * displayScale.perDivision);
  return <div className="recording-viewer">
    <div className="recording-controls">
      <label>Time window <select value={seconds} onChange={e=>{setSeconds(Number(e.target.value));if(mode==='paused'){setMode('playback');setPosition(left)}}}>{windows.map(n=><option value={n} key={n}>{n<60?`${n} seconds`:`${n/60} minute${n===60?'':'s'}`}</option>)}</select></label>
      <button type="button" onClick={()=>changeZoom(-1)} disabled={seconds===1}>Zoom in</button><button type="button" onClick={()=>changeZoom(1)} disabled={seconds===300}>Zoom out</button>
      <label>Amplitude <select value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[0.25,0.5,1,2,4].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
      <button type="button" onClick={()=>{setScale(initialScale(chunks,units));setZoom(1)}} disabled={!chunks.length}>Fit amplitude once</button>
      {live && <button type="button" onClick={()=>{if(mode==='paused'){setMode('live');setFrozen(null)}else{setFrozen({chunks,left});setMode('paused')}}}>{mode==='paused'?'Resume live':'Pause display'}</button>}
      {live && mode!=='live' && <button type="button" onClick={()=>{setMode('live');setFrozen(null)}}>Back to Live</button>}
    </div>
    <div className="recording-caption"><strong>{lead || 'Channel 1 · lead unspecified'}</strong><span>{mode==='live'?'Live':mode==='paused'?'Paused Display':'Recording Playback'}</span><span>{sampleRate} samples/s · {sourceChunks && lead ? 'Reference metadata' : 'Configured rate; hardware timing unverified'}</span></div>
    <div ref={surface} className="recording-surface" tabIndex={0} role="group" aria-label="ECG viewport. Drag to pan; use left and right arrow keys to move; Control or Command wheel to zoom." onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();pan(left+(e.key==='ArrowLeft'?-1:1)*span/5)}}} onPointerDown={e=>{if(e.button!==0)return;drag.current={x:e.clientX,position:left};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current)pan(drag.current.position-(e.clientX-drag.current.x)/Math.max(1,e.currentTarget.clientWidth-74)*span)}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onLostPointerCapture={()=>{drag.current=null}}>
      <SignalCanvas chunks={chunks} sampleRate={sampleRate} start={left} span={span} scale={displayScale} units={units} />
    </div>
    <div className="recording-times"><span>{new Date(left).toLocaleString()}</span><span>{new Date(left+span).toLocaleString()}</span></div>
    <label className="recording-timeline">Recording timeline<input type="range" min={begin} max={Math.max(begin+1,max)} value={left} disabled={max===begin} onChange={e=>pan(Number(e.target.value))} aria-label="Recording timeline" /></label>
    <div className="recording-times"><span>{new Date(begin).toLocaleString()}</span><span>{new Date(finish).toLocaleString()}</span></div>
    <p className="recording-calibration">{units==='mV'?'Reported mV*':'Raw amplitude'} · {displayScale.perDivision} {units==='mV'?'mV':'units'}/major division · {sourceChunks && lead ? 'Reference scaling from source header' : 'Uncalibrated: lead, ADC gain and calibration have not been verified.'} No filtering applied.</p>
    {sampleRate<100 && <p className="recording-quality">Low sample rate: the line connects the received samples. Fine P–QRS–T detail may not be captured at this rate.</p>}
    {diagnostics.repeatedChunks>0 && <p className="recording-quality">{diagnostics.repeatedChunks} adjacent packets contain identical sample arrays. The repetition is present in the source data.</p>}
    {diagnostics.overlaps>0 && <p className="recording-quality">Overlapping packet timestamps detected; segments are shown separately.</p>}
    {clipping && <p className="recording-quality">Some values are outside the current amplitude view. Reduce amplitude magnification or choose “Fit amplitude once”.</p>}
    {error ? <p role="alert">{error} <button type="button" onClick={()=>setRetry(v=>v+1)}>Retry</button></p> : <p role="status">{pending && !chunks.length?'Loading this time range…':!chunks.length?'No recorded samples in this time range.':'Drag to review · Shift + wheel to pan · Ctrl / ⌘ + wheel to zoom'}</p>}
  </div>;
}
