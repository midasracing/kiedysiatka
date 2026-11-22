import { useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { normalizeName } from '../data.js';
import TeamLogo from './TeamLogo.jsx';
import { EmptyState } from './UiPrimitives.jsx';
import './StandingsWarp.css';

const ROW_HEIGHT = 68;
const RED = '#fc0001';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const numberOrDash = value => value ?? '–';

function AccessibleTable({ rows, logos }) {
  return <div className="vh-table-scroll" role="region" aria-label="Tabela ligowa">
    <table className="vh-table">
      <thead><tr><th scope="col">#</th><th scope="col">Drużyna</th><th scope="col">Pkt</th><th scope="col">M</th><th scope="col">W</th><th scope="col">P</th><th scope="col">Sety</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.team || index}>
        <td>{row.rank || index + 1}</td>
        <td><span className="vh-table-team"><TeamLogo name={row.team} logo={logos?.get(normalizeName(row.team))} />{row.team}</span></td>
        <td><strong>{numberOrDash(row.points)}</strong></td>
        <td>{numberOrDash(row.played)}</td>
        <td>{numberOrDash(row.wins)}</td>
        <td>{numberOrDash(row.losses)}</td>
        <td>{numberOrDash(row.sets_for)}:{numberOrDash(row.sets_against)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

// Paint each league row once. The onscreen renderer reprojects thin horizontal
// slices, so actual letterforms bend rather than entire rows merely scaling.
function drawRowSource(row, index, width) {
  const canvas = document.createElement('canvas');
  const quality = 2;
  canvas.width = Math.max(1, Math.round(width * quality));
  canvas.height = ROW_HEIGHT * quality;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.scale(quality, quality);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = RED;
  context.font = "900 38px Impact, 'Arial Narrow', 'Arial Black', sans-serif";
  const title = String(row.rank || index + 1).padStart(2, '0') + '  ' + String(row.team || '—').toLocaleUpperCase('pl-PL');
  context.fillText(title, width / 2, 25, width - 12);
  const stats = 'PKT ' + numberOrDash(row.points)
    + '     M ' + numberOrDash(row.played)
    + '     W ' + numberOrDash(row.wins)
    + '     P ' + numberOrDash(row.losses)
    + '     SETY ' + numberOrDash(row.sets_for) + ':' + numberOrDash(row.sets_against);
  context.font = "800 13px 'Arial Narrow', 'Helvetica Neue', sans-serif";
  context.fillText(stats, width / 2, 54, width - 18);
  return canvas;
}

function WarpTable({ rows, logos }) {
  const surfaceRef = useRef(null);
  const canvasRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const update = () => setReducedMotion(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const host = surfaceRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return undefined;

    let width = 0;
    let height = 0;
    let offset = 0;
    let speed = 0;
    let drawingFrame = 0;
    let momentumFrame = 0;
    let sourceRows = [];
    let dragging = false;
    let pointerId = null;
    let previousY = 0;
    let previousTime = 0;

    const limit = () => Math.max(0, rows.length * ROW_HEIGHT + 14 - height);
    const setOffset = next => { offset = clamp(next, 0, limit()); };

    const render = () => {
      drawingFrame = 0;
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;

      const first = Math.max(0, Math.floor(offset / ROW_HEIGHT) - 1);
      const last = Math.min(rows.length, Math.ceil((offset + height) / ROW_HEIGHT) + 1);
      for (let index = first; index < last; index += 1) {
        const source = sourceRows[index];
        if (!source) continue;
        const top = 7 + index * ROW_HEIGHT - offset;
        // Project every strip into the same hourglass field. Adjacent rows
        // have no seams because the warp depends on the screen Y, not the row.
        for (let sourceY = 0; sourceY < ROW_HEIGHT; sourceY += 3) {
          const stripHeight = Math.min(3, ROW_HEIGHT - sourceY);
          const screenY = top + sourceY;
          if (screenY + stripHeight < 0 || screenY > height) continue;
          const normalized = (screenY + stripHeight / 2 - height / 2) / (height / 2);
          const distance = Math.min(1, Math.abs(normalized));
          const scale = 0.19 + 0.85 * Math.pow(distance, 1.65);
          const targetWidth = width * scale;
          const shift = Math.sin(normalized * Math.PI) * width * 0.016;
          const targetX = (width - targetWidth) / 2 + shift;
          context.drawImage(
            source, 0, sourceY * 2, source.width, stripHeight * 2,
            targetX, screenY, targetWidth, stripHeight + 0.6
          );
        }
      }
    };

    const queueRender = () => {
      if (!drawingFrame) drawingFrame = requestAnimationFrame(render);
    };
    const stopMomentum = () => {
      if (momentumFrame) cancelAnimationFrame(momentumFrame);
      momentumFrame = 0;
    };
    const momentum = () => {
      momentumFrame = 0;
      if (Math.abs(speed) < 0.18) return;
      const oldOffset = offset;
      setOffset(offset + speed);
      speed *= 0.92;
      queueRender();
      if (offset !== oldOffset) momentumFrame = requestAnimationFrame(momentum);
    };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);
      if (nextWidth < 1 || nextHeight < 1) return;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      sourceRows = rows.map((row, index) => drawRowSource(row, index, width));
      setOffset(offset);
      queueRender();
    };

    const pointerDown = event => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      stopMomentum();
      speed = 0;
      dragging = true;
      pointerId = event.pointerId;
      previousY = event.clientY;
      previousTime = performance.now();
      host.setPointerCapture?.(event.pointerId);
    };
    const pointerMove = event => {
      if (!dragging || event.pointerId !== pointerId) return;
      const now = performance.now();
      const delta = previousY - event.clientY;
      const elapsed = Math.max(8, now - previousTime);
      const oldOffset = offset;
      setOffset(offset + delta);
      speed = offset === oldOffset ? 0 : 0.45 * speed + 0.55 * delta * 16 / elapsed;
      previousY = event.clientY;
      previousTime = now;
      queueRender();
    };
    const pointerUp = event => {
      if (!dragging || event.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      if (host.hasPointerCapture?.(event.pointerId)) host.releasePointerCapture(event.pointerId);
      if (event.type === 'pointercancel') speed = 0;
      if (Math.abs(speed) > 0.18) momentumFrame = requestAnimationFrame(momentum);
    };
    const wheel = event => {
      event.preventDefault();
      stopMomentum();
      setOffset(offset + event.deltaY);
      queueRender();
    };
    const keyboard = event => {
      const increments = { ArrowDown: 56, ArrowUp: -56, PageDown: height * 0.7, PageUp: -height * 0.7 };
      if (!(event.key in increments) && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      stopMomentum();
      setOffset(event.key === 'Home' ? 0 : event.key === 'End' ? limit() : offset + increments[event.key]);
      queueRender();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener('pointerdown', pointerDown);
    host.addEventListener('pointermove', pointerMove);
    host.addEventListener('pointerup', pointerUp);
    host.addEventListener('pointercancel', pointerUp);
    host.addEventListener('wheel', wheel, { passive: false });
    host.addEventListener('keydown', keyboard);
    resize();

    return () => {
      observer.disconnect();
      stopMomentum();
      if (drawingFrame) cancelAnimationFrame(drawingFrame);
      host.removeEventListener('pointerdown', pointerDown);
      host.removeEventListener('pointermove', pointerMove);
      host.removeEventListener('pointerup', pointerUp);
      host.removeEventListener('pointercancel', pointerUp);
      host.removeEventListener('wheel', wheel);
      host.removeEventListener('keydown', keyboard);
    };
  }, [rows, reducedMotion]);

  if (reducedMotion) return <AccessibleTable rows={rows} logos={logos} />;

  return <div className="vh-standings-warp" ref={surfaceRef} tabIndex={0} role="region"
    aria-label="Interaktywna tabela ligowa. Przesuń palcem w górę lub w dół, aby przeglądać drużyny. Możesz też użyć strzałek na klawiaturze.">
    <canvas ref={canvasRef} className="vh-standings-warp__canvas" aria-hidden="true" />
    <span className="vh-standings-warp__hint" aria-hidden="true">PRZESUŃ PALCEM ↑↓</span>
    <div className="vh-standings-warp__accessible"><AccessibleTable rows={rows} logos={logos} /></div>
  </div>;
}

export default function Standings({ rows = [], logos }) {
  if (!rows.length) return <EmptyState title="Tabela niedostępna" message="Oficjalne źródło nie udostępnia jeszcze tabeli dla tej grupy." icon={Trophy} />;
  return <WarpTable rows={rows} logos={logos} />;
}
