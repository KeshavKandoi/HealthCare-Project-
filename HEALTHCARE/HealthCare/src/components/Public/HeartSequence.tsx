import { useEffect, useState } from 'react';

const clip = (import.meta.env.VITE_HEART_FILM_URL as string | undefined) || `${import.meta.env.BASE_URL}heart.mp4`;

export default function HeartSequence() {
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  return <section className="heart-sequence" aria-label="Heartline introduction">
    <div className="heart-stage">
      <div className="heart-light" aria-hidden="true" />
      <div className="heart-media" aria-hidden="true">
        {failed || reduced
          ? <img src={`${import.meta.env.BASE_URL}anatomical-heart.png`} alt="" />
          : <video src={clip} poster={`${import.meta.env.BASE_URL}anatomical-heart.png`} autoPlay loop muted playsInline onError={() => setFailed(true)} />}
      </div>
      <p className="heart-tagline">Heartline — connected by care.</p>
    </div>
  </section>;
}
