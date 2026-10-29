import { useEffect, useRef, useState } from 'react';
import API from '../../Api/API';
import './RecordingGraph.css';

type Chunk = { sequence: number; first_sample_at: string; samples: number[] };
type Props = { sessionId: string; sampleRate: number; start: string; end: string; units: string };
const windows = [5, 10, 30, 60, 300];

export default function RecordingGraph({ sessionId, sampleRate, start, end, units }: Props) {
  const begin = Date.parse(start), finish = Math.max(begin + 1000, Date.parse(end) || begin + 1000);
  const [seconds, setSeconds] = useState(10);
  const [position, setPosition] = useState(begin);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{x:number; position:number} | null>(null);
  const span = Math.min(seconds * 1000, finish - begin);
  const max = Math.max(begin, finish - span);
  const left = Math.max(begin, Math.min(position, max));
  useEffect(() => { setPosition(begin); }, [sessionId, begin]);
  useEffect(() => {
    if (!Number.isFinite(left) || !Number.isFinite(span)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      API.get<{chunks:Chunk[]}>(`/ecg/sessions/${sessionId}/chunks`, { params: { start: new Date(left).toISOString(), end: new Date(left + span).toISOString() }, signal: controller.signal })
        .then(response => { setChunks(response.data.chunks); setError(''); })
        .catch(() => { if (!controller.signal.aborted) { setChunks([]); setError('Could not load this part of the recording. Try again.'); } });
    }, 120);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [sessionId, left, span]);
  useEffect(() => {
    const el=canvas.current; if(!el || !sampleRate) return;
    const draw=()=>{
      const w=el.clientWidth,h=el.clientHeight,dpr=window.devicePixelRatio||1; if(!w||!h)return;
      el.width=w*dpr;el.height=h*dpr;const ctx=el.getContext('2d');if(!ctx)return;ctx.scale(dpr,dpr);
      ctx.fillStyle='#fff8f7';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#f4caca';ctx.lineWidth=1;
      for(let x=0;x<w;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      let low=Infinity,high=-Infinity; for(const c of chunks) for(const v of c.samples) if(Number.isFinite(v)){low=Math.min(low,v);high=Math.max(high,v)}
      if(!Number.isFinite(low))return; const mid=(low+high)/2, range=Math.max(high-low,1);ctx.strokeStyle='#302326';ctx.lineWidth=1.3;ctx.beginPath();
      let prev:Chunk|undefined; for(const c of chunks){const t=Date.parse(c.first_sample_at);if(!Number.isFinite(t))continue;const prevEnd=prev?Date.parse(prev.first_sample_at)+prev.samples.length*1000/sampleRate:NaN;let connected=!!prev && Number(c.sequence)===Number(prev.sequence)+1 && Math.abs(t-prevEnd)<Math.max(2,500/sampleRate);let lastPixel=-1,min=Infinity,maxValue=-Infinity;
        const flush=()=>{if(lastPixel<0)return;const x=lastPixel;const y1=h/2-(min-mid)/range*(h-50),y2=h/2-(maxValue-mid)/range*(h-50);if(connected)ctx.lineTo(x,y1);else ctx.moveTo(x,y1);ctx.lineTo(x,y2);connected=true;};
        for(let i=0;i<c.samples.length;i++){const time=t+i*1000/sampleRate,v=c.samples[i];if(time<left||time>left+span)continue;if(!Number.isFinite(v)){flush();lastPixel=-1;min=Infinity;maxValue=-Infinity;connected=false;continue}const x=Math.floor((time-left)/span*w);if(x!==lastPixel){flush();lastPixel=x;min=v;maxValue=v}else{min=Math.min(min,v);maxValue=Math.max(maxValue,v)}}flush();prev=c;
      }ctx.stroke();
    };draw();const observer=new ResizeObserver(draw);observer.observe(el);return()=>observer.disconnect();
  },[chunks,sampleRate,left,span]);
  const move=(delta:number)=>setPosition(p=>Math.max(begin,Math.min(max,p+delta)));
  return <div className="recording-viewer"><div className="recording-controls"><label>Time window <select value={seconds} onChange={e=>setSeconds(Number(e.target.value))}>{windows.map(n=><option value={n} key={n}>{n<60?`${n} seconds`:`${n/60} minute${n===60?'':'s'}`}</option>)}</select></label><button type="button" onClick={()=>setSeconds(windows[Math.max(0,windows.indexOf(seconds)-1)])}>Zoom in</button><button type="button" onClick={()=>setSeconds(windows[Math.min(windows.length-1,windows.indexOf(seconds)+1)])}>Zoom out</button></div>
    <canvas ref={canvas} className="ecg-canvas recording-canvas" role="img" aria-label="Recorded ECG samples over the selected time window" onPointerDown={e=>{drag.current={x:e.clientX,position:left};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(drag.current)setPosition(Math.max(begin,Math.min(max,drag.current.position-(e.clientX-drag.current.x)/e.currentTarget.clientWidth*span)))}} onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}} onWheel={e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setSeconds(windows[Math.max(0,Math.min(windows.length-1,windows.indexOf(seconds)+(e.deltaY>0?1:-1)))])}else if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();move((e.deltaX||e.deltaY)/e.currentTarget.clientWidth*span)}}}/>
    <div className="recording-times"><span>{new Date(left).toLocaleString()}</span><span>{new Date(left+span).toLocaleString()}</span></div><label className="recording-timeline">Recording timeline<input type="range" min={begin} max={Math.max(begin+1,max)} value={left} onChange={e=>setPosition(Number(e.target.value))} aria-label="Recording timeline" /></label><div className="recording-times"><span>{new Date(begin).toLocaleString()}</span><span>{new Date(finish).toLocaleString()}</span></div><p>{error || `Amplitude: ${units || 'raw units'}; display is automatically scaled. Calibration and clinical signal quality are not verified.`}</p></div>;
}
