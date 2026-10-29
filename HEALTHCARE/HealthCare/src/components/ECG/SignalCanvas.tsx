import { useEffect, useRef } from 'react';
import type { CanvasHTMLAttributes } from 'react';
import { niceStep, reduceToPixels, signalSegments } from './signal';
import type { AmplitudeScale, SignalChunk } from './signal';

type Props = CanvasHTMLAttributes<HTMLCanvasElement> & { chunks: SignalChunk[]; sampleRate: number; start: number; span: number; scale: AmplitudeScale; units: string };
/** Shared live/playback renderer; physical calibration is never inferred from waveform appearance. */
export default function SignalCanvas({ chunks, sampleRate, start, span, scale, units, ...props }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const draw = () => {
      const width = el.clientWidth, height = el.clientHeight, dpr = window.devicePixelRatio || 1;
      if (!width || !height) return;
      el.width = Math.round(width * dpr); el.height = Math.round(height * dpr);
      const ctx = el.getContext('2d'); if (!ctx) return;
      ctx.scale(dpr, dpr); ctx.fillStyle = '#fffafa'; ctx.fillRect(0, 0, width, height);
      const pad = { left: 62, right: 12, top: 16, bottom: 28 };
      const w = width - pad.left - pad.right, h = height - pad.top - pad.bottom;
      const x = (time: number) => pad.left + (time - start) / span * w;
      const y = (value: number) => pad.top + h / 2 - (value - scale.center) / scale.perDivision * h / 6;
      const majorMs = niceStep(span / Math.max(2, w / 95)), minorMs = majorMs / 5;
      ctx.font = '11px system-ui'; ctx.fillStyle = '#64484c';
      for (let t = Math.ceil(start / minorMs) * minorMs, count = 0; t <= start + span && count < 2000; t += minorMs, count++) {
        const major = Math.abs(t / majorMs - Math.round(t / majorMs)) < 0.001;
        ctx.strokeStyle = major ? '#e9a7b0' : '#f7dce0'; ctx.lineWidth = major ? 0.8 : 0.5;
        ctx.beginPath(); ctx.moveTo(x(t), pad.top); ctx.lineTo(x(t), height - pad.bottom); ctx.stroke();
        if (major) ctx.fillText(`${((t - start) / 1000).toFixed(span < 5000 ? 2 : 1)}s`, x(t) + 3, height - 8);
      }
      for (let i = -15; i <= 15; i++) {
        const value = scale.center + i * scale.perDivision / 5, major = i % 5 === 0;
        ctx.strokeStyle = major ? '#e9a7b0' : '#f7dce0'; ctx.lineWidth = major ? 0.8 : 0.5;
        ctx.beginPath(); ctx.moveTo(pad.left, y(value)); ctx.lineTo(width - pad.right, y(value)); ctx.stroke();
        if (major) ctx.fillText(Number(value.toPrecision(5)).toString(), 4, y(value) + 4);
      }
      ctx.save(); ctx.beginPath(); ctx.rect(pad.left, pad.top, w, h); ctx.clip();
      ctx.strokeStyle = '#202127'; ctx.fillStyle = '#202127'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
      const segments = signalSegments(chunks, sampleRate, start, start + span);
      // Draw the same sample-to-sample trace for every source. Never smooth or bridge missing segments.
      for (const segment of segments) {
        const points = reduceToPixels(segment, start, span, w);
        ctx.beginPath();
        points.forEach((point, i) => {
          if (i === 0) ctx.moveTo(x(point.time), y(point.value));
          else ctx.lineTo(x(point.time), y(point.value));
        });
        ctx.stroke();
        // A lone sample has no neighbour to join, but must remain visible.
        if (points.length === 1) { ctx.beginPath(); ctx.arc(x(points[0].time), y(points[0].value), 1, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
      ctx.fillStyle = '#64484c'; ctx.fillText(units === 'mV' ? 'mV*' : 'raw', 4, 12);
    };
    draw(); const observer = new ResizeObserver(draw); observer.observe(el); return () => observer.disconnect();
  }, [chunks, sampleRate, start, span, scale, units]);
  return <canvas {...props} ref={ref} className={`ecg-canvas recording-canvas ${props.className || ''}`} role="img" aria-label={props['aria-label'] || 'Original ECG samples, positioned by recording timestamp'} />;
}
