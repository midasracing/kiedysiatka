import { useEffect, useRef } from 'react';
import {
  REDLINE_IN_MS, REDLINE_OUT_MS, redlineClamp, redlineEase,
  redlineCoverage, redlineIntensity,
} from '../redlineWarpMath.js';

/**
 * REDLINE WARP: crisp match-card traces fold toward the horizon and reopen
 * as the lens aperture. All effects live on this isolated transparent canvas.
 * The actual warped standings Canvas never receives a CSS scale/rotation.
 */
function paint(ctx, width, height, progress, sourceYs) {
  const p = redlineClamp(progress);
  ctx.clearRect(0, 0, width, height);
  if (p <= 0 || p >= 1) return;

  const coverage = redlineCoverage(p);
  ctx.fillStyle = 'rgba(0,0,0,' + coverage + ')';
  ctx.fillRect(0, 0, width, height);

  const strength = redlineIntensity(p);
  if (strength <= .01) return;

  const horizon = height * .53;
  const middle = width * .5;
  const fold = redlineEase((p - .08) / .45);
  const unfold = redlineEase((p - .54) / .34);
  const drawnRows = sourceYs.filter(y => Number.isFinite(y) && y >= -100 && y <= height + 100);
  const origins = drawnRows.length ? drawnRows : [
    height * .33, height * .42, height * .51,
    height * .60, height * .69, height * .78,
  ];
  const count = 8;

  // Smooth, symmetrical optical fold with no random sine-wave jitter.
  for (let i = 0; i < count; i++) {
    const lane = i - (count - 1) / 2;
    const startY = origins[i % origins.length];
    const targetY = horizon + lane * 22;
    const y = startY * (1 - fold) + targetY * fold;
    const halfWidth = width * (
      .50 * (1 - fold) + .12 * fold * (1 - unfold) + .55 * unfold
    );
    const arch = (lane / count) * width * .06 * fold;
    const opacity = Math.min(.96, strength * (.6 + (i % 3) * .13));

    ctx.beginPath();
    ctx.moveTo(middle - halfWidth, y);
    ctx.quadraticCurveTo(middle, y - arch, middle + halfWidth, y);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(252,0,1,' + (opacity * .16) + ')';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(252,0,1,' + opacity + ')';
    ctx.lineWidth = i === 3 || i === 4 ? 2.2 : 1.5;
    ctx.stroke();
  }

  // Thin perspective rails imply depth without drawing a noisy spiderweb.
  const railOpacity = strength * fold * (1 - unfold) * .40;
  if (railOpacity > .015) {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(252,0,1,' + railOpacity + ')';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(middle + side * width * .075, horizon - 7);
      ctx.lineTo(middle + side * width * .54, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(middle + side * width * .075, horizon + 7);
      ctx.lineTo(middle + side * width * .54, 0);
      ctx.stroke();
    }
  }

  // A precise, brief red scanning line forms the handoff between the two views.
  const flash = Math.max(0, 1 - Math.abs(p - .55) / .19) * strength;
  if (flash > 0) {
    ctx.fillStyle = 'rgba(252,0,1,' + (.72 * flash) + ')';
    ctx.fillRect(0, Math.round(horizon), width, 1.5);
  }
}

export default function RedlineWarpCanvas({ phase, sourceYsRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase === 'active') return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;
    let frame = 0;
    let startedAt = null;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const duration = phase === 'exit' ? REDLINE_OUT_MS : REDLINE_IN_MS;
    const tick = time => {
      if (startedAt === null) startedAt = time;
      const elapsed = redlineClamp((time - startedAt) / duration);
      paint(ctx, width, height, phase === 'exit' ? 1 - elapsed : elapsed,
        sourceYsRef.current || []);
      if (elapsed < 1) frame = requestAnimationFrame(tick);
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
