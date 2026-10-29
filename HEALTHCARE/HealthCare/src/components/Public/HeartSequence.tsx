import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// A licensed camera-animation clip can be installed without changing the renderer.
const clip = import.meta.env.VITE_HEART_FILM_URL as string | undefined;
export default function HeartSequence() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const cinematic = Boolean(clip && ready && !failed && !reduced);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!cinematic) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = section.current;
      const film = video.current;
      if (!node || !film) return;
      const rect = node.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - window.innerHeight + 76)));
      node.style.setProperty('--scene-progress', String(progress));
      node.dataset.scene = progress < .35 ? 'intro' : progress < .68 ? 'heart' : 'signal';
      if (Number.isFinite(film.duration) && !film.seeking) {
        const target = progress * Math.max(0, film.duration - .05);
        if (Math.abs(film.currentTime - target) > .035) film.currentTime = target;
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    video.current?.addEventListener('seeked', schedule);
    const film = video.current;
    schedule();
    return () => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); film?.removeEventListener('seeked', schedule); cancelAnimationFrame(frame); };
  }, [cinematic]);
  return <section ref={section} className={`heart-sequence ${cinematic ? 'has-film' : 'poster-only'}`} data-scene="intro" aria-label="Heartline introduction">
    <div className="heart-stage">
      <div className="heart-light" aria-hidden="true" />
      <div className="heart-media" aria-hidden="true">
        <img src="/anatomical-heart.png" alt="" fetchPriority="high" width="1024" height="1024" />
        {clip && !failed && !reduced && <video ref={video} src={clip} muted playsInline preload="metadata" onLoadedData={() => setReady(true)} onError={() => setFailed(true)} style={{ opacity: ready ? 1 : 0 }} />}
      </div>
      <div className="heart-intro">
        <span className="pub-eyebrow">HEARTLINE / CONNECTED CARDIAC CARE</span>
        <h1>Your heart.<br /><em>Beyond<br />the moment.</em></h1>
        <p>Connected ECG monitoring, health records, and coordinated care — brought together in one platform.</p>
        <a className="pub-button" href="#connected">Explore Heartline <span aria-hidden="true">↘</span></a>
      </div>
      {cinematic && <><div className="heart-scene heart-close"><span className="pub-eyebrow">A CLOSER LOOK</span><h2>Every heartbeat<br />carries information.</h2></div><div className="heart-scene heart-signal"><span className="pub-eyebrow">FROM SIGNAL TO INSIGHT</span><h2>A moment recorded.<br />A story you can revisit.</h2><Link to="/how-it-works" className="pub-button">Follow the signal ↗</Link></div></>}
      <div className="heart-caption"><span>01 / THE HEART OF HEARTLINE</span><span>Scroll to discover ↓</span></div>
    </div>
  </section>;
}
