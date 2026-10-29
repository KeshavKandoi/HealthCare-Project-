import { useEffect, useRef, type ReactNode } from 'react';
import { liveSample, liveSeconds } from './liveSimulation';
import type { SignalMode, WaveformMode } from './simulation';

const drawRate = 125;
type Point = { x: number; y: number };
type Props = { mode: WaveformMode; ink: string; label: string; span?: number; lineWidth?: number; className?: string; children?: ReactNode };

/** Bedside-monitor sweep of the live simulation for the selected mode. */
export default function LiveSweep({ mode, ink, label, span = 5, lineWidth = 2, className, children }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => {
    const el = canvas.current, ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sweep = span * drawRate;
    let width = 0, height = 0, next = 0, previous: Point | null = null, painted = '', frame = 0;
    const at = (index: number): Point => {
      const t = index / drawRate;
      return { x: (t % span) / span * width, y: height * .62 - liveSample(t, modeRef.current as SignalMode) * height * .42 };
    };
    // Redraw the most recent sweep from scratch.
    const restart = () => { ctx.clearRect(0, 0, width, height); previous = null; next = Math.max(0, Math.floor(liveSeconds() * drawRate) - sweep + 1); };
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = el.clientWidth; height = el.clientHeight;
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      restart(); painted = '';
    };
    const draw = (from: number, to: number) => {
      ctx.strokeStyle = ink; ctx.lineWidth = lineWidth; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let index = from; index <= to; index++) {
        const point = at(index);
        if (previous && point.x < previous.x) previous = null; // the sweep wrapped to the left edge
        ctx.clearRect(point.x, 0, 14, height);
        if (previous) { ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(point.x, point.y); ctx.stroke(); }
        previous = point;
      }
    };
    const tick = () => {
      const last = Math.floor(liveSeconds() * drawRate);
      if (modeRef.current === 'off') {
        if (painted !== 'off') ctx.clearRect(0, 0, width, height);
        previous = null; painted = 'off';
      } else {
        // Back from leads off, a hidden tab, or the hourly wrap of the clock.
        if (painted === 'off' || last < next - 1 || last - next > sweep) restart();
        if (!still) draw(next, last);
        else if (painted !== modeRef.current) { restart(); draw(next, last); }
        painted = modeRef.current;
      }
      next = last + 1;
      frame = requestAnimationFrame(tick);
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(el);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [ink, lineWidth, span]);
  return <div className={className}><canvas ref={canvas} role="img" aria-label={label} />{children}</div>;
}
