import { useEffect, useRef } from 'react';
import {
  REDLINE_IN_MS, REDLINE_OUT_MS, redlineClamp, redlineEase,
  redlineCoverage, redlineIntensity,
} from '../redlineWarpMath.js';

const RED = [252, 0, 1];

function paint(ctx, width, height, progress, sourceYs) {
  const p = redlineClamp(progress);
  ctx.clearRect(0, 0, width, height);
  if (p <= 0 || p >= 1) return;

  const coverage = redlineCoverage(p);
  ctx.fillStyle = 'rgba(0,0,0,' + coverage + ')';
  ctx.fillRect(0, 0, width, height);

  const energy = redlineIntensity(p);
  if (energy < .015) return;
  const cx = width / 2;
  const horizon = height * .55;
  const squeeze = redlineEase((p - .10) / .61);
  const rows = sourceYs.length ? sourceYs : [
    height * .38, height * .45, height * .52,
    height * .59, height * .66, height * .73,
  ];

  // Source match-card separators become curved red ribbons as they contract
  // into the perspective's vanishing point. A pair of inexpensive strokes
  // gives depth without blur filters, shaders or extra React renders.
  const ribbonCount = Math.min(12, Math.max(6, rows.length + 2));
  for (let i = 0; i < ribbonCount; i++) {
    const sourceY = rows[i % rows.length] + Math.floor(i / rows.length) * 42;
    const lane = i - (ribbonCount - 1) / 2;
    const targetY = horizon + lane * 18;
    const y = sourceY * (1 - squeeze) + targetY * squeeze;
    const half = width * (.56 - .42 * squeeze);
    const bend = (10 + 37 * squeeze) * Math.sin(i * 1.83 + p * 6);
    const alpha = energy * (.33 + (i % 3) * .17);
    ctx.beginPath();
    ctx.moveTo(cx - half, y + 8 * squeeze);
    ctx.bezierCurveTo(cx - half * .46, y - bend,
      cx + half * .41, y + bend, cx + half, y - 8 * squeeze);
    ctx.strokeStyle = 'rgba(' + RED.join(',') + ',' + (alpha * .23) + ')';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(' + RED.join(',') + ',' + Math.min(.94, alpha) + ')';
    ctx.lineWidth = 1.35 + (i % 3) * .26;
    ctx.stroke();
  }

  // Diagonal perspective rays only emerge near the tunnel's deepest point.
  const rayStrength = energy * redlineEase((p - .21) / .34);
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    const departure = cx + i * width * .18;
    const endY = height + 30;
    const endX = cx + i * width * .39;
    ctx.beginPath();
    ctx.moveTo(cx + i * 7, horizon - 7);
    ctx.quadraticCurveTo(departure, height * .77, endX, endY);
    ctx.strokeStyle = 'rgba(252,0,1,' + (rayStrength * (.14 + (Math.abs(i) % 3) * .075)) + ')';
    ctx.stroke();
  }

  // A brief clean crimson pulse marks the geometry crossing the horizon.
  const pulse = energy * Math.max(0, 1 - Math.abs(p - .50) / .23);
  if (pulse > 0) {
    const glow = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, width * .49);
    glow.addColorStop(0, 'rgba(252,0,1,' + (.27 * pulse) + ')');
    glow.addColorStop(1, 'rgba(252,0,1,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - width * .49, width, width * .98);
  }
}

/**
 * A fixed transparent canvas performs the red perspective transition.
 * It draws at device-scale <= 1.75 and stops all frames when animation ends.
 */
export default function RedlineWarpCanvas({ phase, sourceYsRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase === 'active') return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;
    let frame = 0;
    let start = null;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(1.75, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const duration = phase === 'exit' ? REDLINE_OUT_MS : REDLINE_IN_MS;
    const tick = time => {
      if (start === null) start = time;
      const progress = redlineClamp((time - start) / duration);
      paint(ctx, width, height, phase === 'exit' ? 1 - progress : progress,
        sourceYsRef.current || []);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener('resize', resize, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, width, height);
    };
  }, [phase, sourceYsRef]);

  return <canvas className="vh-redline-canvas" ref={canvasRef} aria-hidden="true" />;
}
