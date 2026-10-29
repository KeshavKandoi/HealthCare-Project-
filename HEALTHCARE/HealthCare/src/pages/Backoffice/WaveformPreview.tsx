import { useEffect, useRef, useState } from 'react';
import { scenarioVitals, simulationSample, simulationSeed, type SignalMode, type WaveformMode } from '../../components/ECG/simulation';

const span = 5, drawRate = 125;
type Point = { x: number; y: number };
type Vitals = ReturnType<typeof scenarioVitals>;

/** Bedside-style sweep of the same simulation the live monitors stream, with its readings. */
export default function WaveformPreview({ mode }: { mode: WaveformMode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => {
    const el = canvas.current, ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const origin = performance.now();
    let width = 0, height = 0, next = 0, previous: Point | null = null, painted = '', frame = 0;
    const clock = () => (performance.now() - origin) / 1000;
    const config = () => ({ scenario: 'resting-v2' as const, seed: simulationSeed, mode: modeRef.current as SignalMode });
    const at = (t: number): Point => ({ x: (t % span) / span * width, y: height * .62 - simulationSample(t, config()) * height * .42 });
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = el.clientWidth; height = el.clientHeight;
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Resizing clears the canvas, so redraw the whole current sweep on the next frame.
      previous = null; painted = ''; next = Math.max(0, Math.floor(clock() * drawRate) - span * drawRate + 1);
    };
    const draw = (from: number, to: number) => {
      ctx.strokeStyle = '#5ef0a1'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let index = from; index <= to; index++) {
        const point = at(index / drawRate);
        if (previous && point.x < previous.x) previous = null; // the sweep wrapped to the left edge
        ctx.clearRect(point.x, 0, 14, height);
        if (previous) { ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(point.x, point.y); ctx.stroke(); }
        previous = point;
      }
    };
    const tick = () => {
      const last = Math.floor(clock() * drawRate);
      if (modeRef.current === 'off') { if (painted !== 'off') ctx.clearRect(0, 0, width, height); previous = null; painted = 'off'; next = last + 1; }
      else if (still) {
        if (painted !== modeRef.current) { ctx.clearRect(0, 0, width, height); previous = null; draw(Math.max(0, last - span * drawRate + 1), last); painted = modeRef.current; }
        next = last + 1;
      } else {
        // Coming back from a hidden tab or leads off: redraw at most one sweep.
        if (painted === 'off' || last - next > span * drawRate) { ctx.clearRect(0, 0, width, height); previous = null; next = Math.max(next, last - span * drawRate + 1); }
        painted = modeRef.current;
        draw(next, last); next = last + 1;
      }
      frame = requestAnimationFrame(tick);
    };
    const readings = () => setVitals(modeRef.current === 'off' ? null : scenarioVitals(clock(), config()));
    resize(); readings();
    const observer = new ResizeObserver(resize); observer.observe(el);
    const timer = window.setInterval(readings, 1000);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); window.clearInterval(timer); observer.disconnect(); };
  }, []);

  const off = mode === 'off';
  return <div className="bo-preview">
    <div className="bo-screen">
      <canvas ref={canvas} role="img" aria-label={off ? 'Preview: leads are not connected' : 'Preview of the simulated ECG waveform'} />
      {off && <div className="bo-screen-off"><i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" /><span>Leads are not connected</span></div>}
    </div>
    <div className="bo-readout" aria-label="Preview readings">
      <div><span>Heart rate</span><strong>{!off && vitals ? Math.round(vitals.bpm) : '—'}<small>BPM</small></strong></div>
      <div><span>Blood pressure</span><strong>{!off && vitals ? `${Math.round(vitals.systolic)}/${Math.round(vitals.diastolic)}` : '—'}<small>mmHg</small></strong></div>
    </div>
  </div>;
}
