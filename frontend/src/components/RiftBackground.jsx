import { useEffect, useRef } from "react";

/**
 * Sfondo animato globale (canvas, fixed, dietro a tutto).
 * Livelli: 1) strati topografici che ondeggiano lenti, 2) due nuclei di calore che derivano,
 * 3) braci che salgono e si allontanano dal cursore, 4) alone arancio che segue il puntatore.
 * - intensity="full" per la landing, "calm" per le pagine dell'app (meno particelle, più scuro).
 * - Con prefers-reduced-motion disegna un solo frame statico. Si mette in pausa a tab nascosta.
 */
export default function RiftBackground({ intensity = "calm" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.("2d");
    if (!ctx) return undefined; // jsdom / browser senza canvas

    const full = intensity === "full";
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, raf = 0, t = 0;
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const N = full ? 90 : 46;
    const spawn = (anywhere) => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10 + Math.random() * 40,
      r: 0.6 + Math.random() * (full ? 2.2 : 1.6),
      vy: 0.25 + Math.random() * (full ? 0.9 : 0.55),
      sway: Math.random() * Math.PI * 2,
      hot: Math.random(),
      life: 0.6 + Math.random() * 0.4,
    });
    const embers = Array.from({ length: N }, () => spawn(true));

    const STRATA = full ? 16 : 11;
    const drawStrata = () => {
      ctx.lineWidth = 1;
      for (let i = 0; i < STRATA; i++) {
        const base = (h / (STRATA - 1)) * i;
        const a = 0.035 + (i % 4 === 0 ? 0.03 : 0);
        ctx.strokeStyle = `rgba(255,140,70,${full ? a : a * 0.7})`;
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 18) {
          const y = base
            + Math.sin(x * 0.0042 + t * 0.00018 + i * 0.7) * 26
            + Math.sin(x * 0.011 - t * 0.00011 + i * 1.9) * 9
            + (x / w) * -60; // leggera pendenza: richiama la diagonale della mid lane
          x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const blob = (x, y, r, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,107,26,${alpha})`);
      g.addColorStop(0.45, `rgba(194,65,12,${alpha * 0.35})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    const frame = () => {
      t += 16;
      ctx.clearRect(0, 0, w, h);

      // nuclei di calore
      const k = full ? 1 : 0.6;
      blob(w * (0.82 + Math.sin(t * 0.00009) * 0.05), h * (0.12 + Math.cos(t * 0.00007) * 0.05), Math.max(w, h) * 0.55, 0.16 * k);
      blob(w * (0.1 + Math.cos(t * 0.00006) * 0.04), h * (0.95 + Math.sin(t * 0.00008) * 0.04), Math.max(w, h) * 0.45, 0.09 * k);

      drawStrata();

      // alone del cursore (smussato)
      mouse.sx += (mouse.x - mouse.sx) * 0.08;
      mouse.sy += (mouse.y - mouse.sy) * 0.08;
      if (mouse.sx > -1000) blob(mouse.sx, mouse.sy, full ? 260 : 200, full ? 0.1 : 0.06);

      // braci
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.y -= e.vy;
        e.sway += 0.012;
        e.x += Math.sin(e.sway) * 0.35;
        const dx = e.x - mouse.sx, dy = e.y - mouse.sy, d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) { const f = (1 - Math.sqrt(d2) / 140) * 1.6; e.x += (dx / 140) * f; e.y += (dy / 140) * f; }
        const fade = Math.min(1, e.y / (h * 0.85)) * e.life;
        const flick = 0.65 + Math.sin(t * 0.01 + i) * 0.35;
        const a = Math.max(0, fade * flick);
        const col = e.hot > 0.7 ? "255,200,110" : "255,120,40";
        ctx.fillStyle = `rgba(${col},${a})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,107,26,${a * 0.08})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 3, 0, Math.PI * 2); ctx.fill();
        if (e.y < -10) embers[i] = spawn(false);
      }
      ctx.globalCompositeOperation = "source-over";

      if (!reduce) raf = requestAnimationFrame(frame);
    };

    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; if (mouse.sx < -1000) { mouse.sx = e.clientX; mouse.sy = e.clientY; } };
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden && !reduce) raf = requestAnimationFrame(frame); };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intensity]);

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <canvas ref={ref} style={{ position: "absolute", inset: 0 }} />
      {/* grana + vignetta: tolgono l'effetto "digitale piatto" */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.75) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}
