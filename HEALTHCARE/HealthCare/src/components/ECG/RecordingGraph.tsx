import { useEffect, useRef } from 'react';

type Chunk = { sequence: number; first_sample_at: string; samples: number[] };

/** Draws the recorded samples at their actual times. A gap or missing batch breaks the line. */
export default function RecordingGraph({chunks, sampleRate}: {chunks: Chunk[]; sampleRate: number}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el || !chunks.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return;
    const draw = () => {
      const width = el.clientWidth, height = el.clientHeight, scale = window.devicePixelRatio || 1;
      el.width = width * scale; el.height = height * scale;
      const ctx = el.getContext('2d'); if (!ctx || !width || !height) return;
      ctx.scale(scale, scale); ctx.fillStyle = '#fff8f7'; ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#f3c3c3'; ctx.lineWidth = 1;
      for (let x=0;x<width;x+=20) {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
      for (let y=0;y<height;y+=20) {ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
      const ordered = [...chunks].sort((a,b)=>Date.parse(a.first_sample_at)-Date.parse(b.first_sample_at));
      let low=Infinity,high=-Infinity,start=Infinity,end=-Infinity;
      for(const chunk of ordered) {
        const t=Date.parse(chunk.first_sample_at); if(!Number.isFinite(t)) continue;
        start=Math.min(start,t);end=Math.max(end,t+Math.max(0,chunk.samples.length-1)*1000/sampleRate);
        for(const value of chunk.samples) if(Number.isFinite(value)){low=Math.min(low,value);high=Math.max(high,value);}
      }
      if(!Number.isFinite(low)||!Number.isFinite(start))return;
      const span=Math.max(end-start,1000/sampleRate), range=high-low || 1;
      ctx.strokeStyle='#302326';ctx.lineWidth=1.5;ctx.beginPath();
      let previous: Chunk | undefined;
      for(const chunk of ordered) {
        const time=Date.parse(chunk.first_sample_at);if(!Number.isFinite(time))continue;
        const previousEnd=previous ? Date.parse(previous.first_sample_at)+previous.samples.length*1000/sampleRate : NaN;
        const continuous=previous && chunk.sequence===previous.sequence+1 && Math.abs(time-previousEnd)<=Math.max(100,2000/sampleRate);
        let first=true;
        for(let i=0;i<chunk.samples.length;i++) {
          const value=chunk.samples[i]; if(!Number.isFinite(value)) {first=true;continue;}
          const x=(time+i*1000/sampleRate-start)/span*width, y=height-24-(value-low)/range*(height-48);
          if(first && !continuous)ctx.moveTo(x,y);else ctx.lineTo(x,y);first=false;
        }
        previous=chunk;
      }
      ctx.stroke();
    };
    draw();const observer=new ResizeObserver(draw);observer.observe(el);return()=>observer.disconnect();
  }, [chunks,sampleRate]);
  return <canvas ref={canvas} role="img" aria-label="ECG recording plotted over time" className="ecg-canvas"/>;
}
