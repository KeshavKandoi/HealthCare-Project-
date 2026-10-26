import React, { useEffect, useRef, useState, useCallback } from "react";
import "./HeartFlipbook.css";

const frameCount = 145;

const frames = Array.from({ length: frameCount }, (_, i) => {
  const num = String(i + 1).padStart(4, "0");
  return new URL(`../../../assets/frames/heart/frame_${num}.jpg`, import.meta.url).href;
});

const annotations = [
  { frame: 0,   title: "The Human Heart",         desc: "The engine of your body — beating 100,000 times every single day", color: "#ef4444" },
  { frame: 29,  title: "Coronary Arteries",        desc: "Deliver oxygen-rich blood directly to the heart muscle itself",    color: "#f97316" },
  { frame: 58,  title: "Four Chambers",            desc: "Two atria receive blood. Two ventricles pump it across the body",  color: "#eab308" },
  { frame: 87,  title: "Heart Valves",             desc: "Four valves open and close preventing backflow with every beat",   color: "#22c55e" },
  { frame: 116, title: "Cardiac Care at Heartline", desc: "ECG Monitoring · Angioplasty · Bypass Surgery · 24/7 Support",    color: "#3b82f6" },
];

const HeartFlipbook = () => {
  const canvasRef       = useRef(null);
  const sectionRef      = useRef(null);
  const imagesRef       = useRef([]);
  const rafRef          = useRef(null);
  const frameRef        = useRef(0);       // current displayed frame
  const lastTsRef       = useRef(0);       // last RAF timestamp
  const scrollActiveRef = useRef(false);   // true while user is scrolling
  const scrollTimerRef  = useRef(null);

  const [loadProgress, setLoadProgress]           = useState(0);
  const [loaded, setLoaded]                       = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState(0);

  /* ── draw ── */
  const drawFrame = useCallback((index) => {
    const canvas = canvasRef.current;
    const img    = imagesRef.current[index];
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    const w   = canvas.offsetWidth;
    const h   = canvas.offsetHeight;
    canvas.width  = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const scale = Math.max(w / img.width, h / img.height);
    const x = (w - img.width  * scale) / 2;
    const y = (h - img.height * scale) / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }, []);

  const updateAnnotation = useCallback((fi) => {
    let ai = 0;
    for (let i = annotations.length - 1; i >= 0; i--) {
      if (fi >= annotations[i].frame) { ai = i; break; }
    }
    setCurrentAnnotation(ai);
  }, []);

  /* ── preload ── */
  useEffect(() => {
    let done = 0;
    imagesRef.current = new Array(frameCount);
    frames.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imagesRef.current[i] = img;
        done++;
        setLoadProgress(Math.round((done / frameCount) * 100));
        if (done === frameCount) {
          setLoaded(true);
        }
      };
    });
  }, []);

  /* ── MAIN LOOP — starts once loaded, never stops ── */
  useEffect(() => {
    if (!loaded) return;

    const FPS      = 24;
    const interval = 1000 / FPS;

    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop);

      if (!scrollActiveRef.current) {
        // Auto-advance only when user is NOT scrolling
        if (ts - lastTsRef.current >= interval) {
          lastTsRef.current = ts;
          frameRef.current  = (frameRef.current + 1) % frameCount;
          drawFrame(frameRef.current);
          updateAnnotation(frameRef.current);
        }
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [loaded, drawFrame, updateAnnotation]);

  /* ── SCROLL — scrubs frame, pauses auto-advance temporarily ── */
  useEffect(() => {
    if (!loaded) return;

    const onScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect     = section.getBoundingClientRect();
      const total    = section.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);

      // Only scrub when section is in the viewport
      if (scrolled < 0 || rect.top > window.innerHeight) return;

      const progress = Math.min(1, scrolled / Math.max(total, 1));
      const fi       = Math.min(frameCount - 1, Math.floor(progress * frameCount));

      // Pause auto-advance while scrolling
      scrollActiveRef.current = true;
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        // Resume auto-advance from current frame after scroll stops
        scrollActiveRef.current = false;
        lastTsRef.current       = 0; // reset so next tick fires immediately
      }, 600);

      if (fi !== frameRef.current) {
        frameRef.current = fi;
        drawFrame(fi);
        updateAnnotation(fi);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimerRef.current);
    };
  }, [loaded, drawFrame, updateAnnotation]);

  const ann         = annotations[currentAnnotation];
  const progressPct = (frameRef.current / (frameCount - 1)) * 100;

  return (
    <div ref={sectionRef} className="flipbook-section">
      <div className="flipbook-sticky">

        {!loaded && (
          <div className="fb-loading">
            <div className="fb-loading-icon">
              <i className="fa-solid fa-heart-pulse"></i>
            </div>
            <div className="fb-bar-wrap">
              <div className="fb-bar" style={{ width: `${loadProgress}%` }}></div>
            </div>
            <p className="fb-loading-text">
              Preparing cardiac experience... {loadProgress}%
            </p>
          </div>
        )}

        <canvas ref={canvasRef} className={`fb-canvas ${loaded ? "show" : ""}`} />

        {loaded && (
          <>
            <div className="fb-vignette"></div>
            <div className="fb-watermark-cover"><span>Myocardium<br/>Cross-Section</span></div>

            <div className="fb-annotation" key={currentAnnotation}>
              <div className="fb-ann-dot" style={{ background: ann.color }}></div>
              <h2 className="fb-ann-title" style={{ color: ann.color }}>
                {ann.title}
              </h2>
              <p className="fb-ann-desc">{ann.desc}</p>
              {currentAnnotation === annotations.length - 1 && (
                <a href="/ecg-monitor" className="fb-ann-btn" style={{ background: ann.color }}>
                  <i className="fa-solid fa-wave-square"></i>
                  Start ECG Monitor
                </a>
              )}
            </div>

            <div className="fb-dots">
              {annotations.map((a, i) => (
                <div
                  key={i}
                  className={`fb-dot ${i === currentAnnotation ? "active" : ""}`}
                  style={i === currentAnnotation
                    ? { background: a.color, transform: "scale(1.6)" }
                    : {}}
                />
              ))}
            </div>

            <div className="fb-progress">
              <div
                className="fb-progress-fill"
                style={{ width: `${progressPct}%`, background: ann.color }}
              />
            </div>

            <div className="fb-scroll-hint">
              <i className="fa-solid fa-computer-mouse"></i>
              Scroll to scrub · Auto-plays when stopped
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HeartFlipbook;
