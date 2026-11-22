import { useEffect, useId, useRef, useState } from 'react';
import { standingsWarpScale, standingsWarpSourceY } from './standingsWarpMath.js';
import { PICKER_ROW_HEIGHT, pickerBounds, pickerIndexForOffset, pickerOffsetForIndex } from './leaguePickerMath.js';
import './LeaguePicker.css';

const RED = '#fc0001';
const INITIAL_INDEX = 2; // Centre the opening frame on the list, not empty space.
const IVORY = '#f5f2ed';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// The same per-strip lens used by the standings. Render rows to offscreen
// canvases once, rather than re-laying-out fonts during finger movement.
function createTextSource(league, width, color, index) {
  const dpr = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * dpr);
  canvas.height = PICKER_ROW_HEIGHT * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const fontSize = Math.max(34, Math.min(46, width * 0.112));
  ctx.font = `900 ${fontSize}px Impact, 'Arial Black', 'Helvetica Neue', sans-serif`;
  const words = league.name.toLocaleUpperCase('pl-PL').split(/\s+/);
  const lines = [];
  const indent = [0, 14, 26, 10, 22, 15][index % 6];
  const usableWidth = Math.max(140, width - 62 - indent);
  for (const word of words) {
    const last = lines.length - 1;
    const candidate = last >= 0 ? lines[last] + ' ' + word : word;
    if (last >= 0 && ctx.measureText(candidate).width <= usableWidth) {
      lines[last] = candidate;
    } else {
      lines.push(word);
    }
  }
  // Keep every option within two readable lines, including on narrow phones.
  if (lines.length > 2) {
    lines.splice(1, lines.length - 1, lines.slice(1).join(' '));
  }
  const lineHeight = fontSize * 1.02;
  const startY = PICKER_ROW_HEIGHT / 2 - (lines.length - 1) * lineHeight / 2;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], 43 + indent, startY + i * lineHeight, usableWidth);
  }
  return canvas;
}

export default function LeaguePicker({ leagues, active }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const [selected, setSelected] = useState(INITIAL_INDEX);
  const selectedRef = useRef(INITIAL_INDEX);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
  const id = useId();

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return undefined;
    const change = () => setReducedMotion(query.matches);
    query.addEventListener?.('change', change);
    return () => query.removeEventListener?.('change', change);
  }, []);

  useEffect(() => {
    if (!active || reducedMotion || !leagues.length) return undefined;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let offset = 0;
    let velocity = 0;
    let paintFrame = 0;
    let animationFrame = 0;
    let wheelTimer = 0;
    let pointer = null;
    let sources = [];

    const getBounds = () => pickerBounds(leagues.length, height);
    const setOffset = next => {
      const { min, max } = getBounds();
      offset = clamp(next, min, max);
    };
    const updateSelected = () => {
      const index = pickerIndexForOffset(offset, height, leagues.length);
      if (index !== selectedRef.current && index >= 0) {
        selectedRef.current = index;
        setSelected(index);
      }
    };
    const paint = () => {
      paintFrame = 0;
      if (!width || !height) return;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const totalHeight = leagues.length * PICKER_ROW_HEIGHT;
      const activeIndex = selectedRef.current;
      // Match the standings' seamless inverse projection. Even individual
      // letter strokes curve at the top and bottom of the selector.
      for (let y = 0; y < height; y += 3) {
        const step = Math.min(3, height - y);
        const start = standingsWarpSourceY(y, height) + offset;
        const end = standingsWarpSourceY(y + step, height) + offset;
        if (end <= 0 || start >= totalHeight) continue;
        const mid = y + step / 2;
        const normalized = (mid - height / 2) / (height / 2);
        const scale = standingsWarpScale(mid, height);
        const drawnWidth = width * scale;
        const drawnX = (width - drawnWidth) * 0.22
          + Math.sin(normalized * Math.PI) * width * 0.018;
        const span = end - start;
        let cursor = Math.max(0, start);
        const finish = Math.min(totalHeight, end);
        while (cursor < finish - 0.0001) {
          const index = Math.floor(cursor / PICKER_ROW_HEIGHT);
          if (index >= sources.length) break;
          const segmentEnd = Math.min(finish, (index + 1) * PICKER_ROW_HEIGHT);
          const rowStart = cursor - index * PICKER_ROW_HEIGHT;
          const rowEnd = segmentEnd - index * PICKER_ROW_HEIGHT;
          const destinationY = y + ((cursor - start) / span) * step;
          const destinationHeight = ((segmentEnd - cursor) / span) * step;
          const source = sources[index][index === activeIndex ? 1 : 0];
          ctx.drawImage(source, 0, rowStart * 2, source.width, (rowEnd - rowStart) * 2,
            drawnX, destinationY, drawnWidth, destinationHeight + 0.15);
          cursor = segmentEnd;
        }
      }
    };
    const requestPaint = () => { if (!paintFrame) paintFrame = requestAnimationFrame(paint); };
    const stopAnimation = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };
    const moveTo = index => {
      stopAnimation();
      const target = pickerOffsetForIndex(clamp(index, 0, leagues.length - 1), height);
      const animate = () => {
        const distance = target - offset;
        if (Math.abs(distance) < 0.4) {
          offset = target;
          animationFrame = 0;
        } else {
          setOffset(offset + distance * 0.22);
          animationFrame = requestAnimationFrame(animate);
        }
        updateSelected();
        requestPaint();
      };
      animate();
    };
    const settle = () => moveTo(pickerIndexForOffset(offset, height, leagues.length));
    const glide = () => {
      animationFrame = 0;
      const previous = offset;
      setOffset(offset + velocity);
      velocity *= 0.91;
      updateSelected();
      requestPaint();
      if (Math.abs(velocity) < 0.22 || offset === previous) {
        settle();
      } else {
        animationFrame = requestAnimationFrame(glide);
      }
    };
    const resize = () => {
      const rect = host.getBoundingClientRect();
      const nextWidth = Math.round(rect.width);
      const nextHeight = Math.round(rect.height);
      if (nextWidth < 1 || nextHeight < 1) return;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      const scale = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      sources = leagues.map((league, index) => [
        createTextSource(league, width, RED, index),
        createTextSource(league, width, IVORY, index),
      ]);
      setOffset(pickerOffsetForIndex(selectedRef.current, height));
      requestPaint();
    };
    const down = event => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      stopAnimation();
      window.clearTimeout(wheelTimer);
      velocity = 0;
      pointer = { id: event.pointerId, y: event.clientY, startY: event.clientY, lastTime: performance.now() };
      host.setPointerCapture?.(event.pointerId);
    };
    const move = event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const now = performance.now();
      const delta = pointer.y - event.clientY;
      const duration = Math.max(8, now - pointer.lastTime);
      const before = offset;
      setOffset(offset + delta);
      velocity = offset === before ? 0 : velocity * 0.4 + delta * 16 / duration * 0.6;
      pointer.y = event.clientY;
      pointer.lastTime = now;
      updateSelected();
      requestPaint();
    };
    const up = event => {
      if (!pointer || pointer.id !== event.pointerId) return;
      const dragged = Math.abs(event.clientY - pointer.startY);
      pointer = null;
      if (host.hasPointerCapture?.(event.pointerId)) host.releasePointerCapture(event.pointerId);
      if (event.type === 'pointercancel') return settle();
      if (dragged < 10) {
        const y = event.clientY - host.getBoundingClientRect().top;
        const picked = Math.floor((standingsWarpSourceY(y, height) + offset) / PICKER_ROW_HEIGHT);
        moveTo(picked);
      } else if (Math.abs(velocity) > 0.22) {
        animationFrame = requestAnimationFrame(glide);
      } else {
        settle();
      }
    };
    const wheel = event => {
      event.preventDefault();
      stopAnimation();
      window.clearTimeout(wheelTimer);
      setOffset(offset + event.deltaY);
      updateSelected();
      requestPaint();
      wheelTimer = window.setTimeout(settle, 120);
    };
    const keyboard = event => {
      const current = pickerIndexForOffset(offset, height, leagues.length);
      const destinations = {
        ArrowDown: current + 1, ArrowUp: current - 1,
        PageDown: current + 2, PageUp: current - 2,
        Home: 0, End: leagues.length - 1,
      };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      window.clearTimeout(wheelTimer);
      moveTo(destinations[event.key]);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener('pointerdown', down);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', up);
    host.addEventListener('wheel', wheel, { passive: false });
    host.addEventListener('keydown', keyboard);
    resize();
    return () => {
      observer.disconnect();
      stopAnimation();
      window.clearTimeout(wheelTimer);
      if (paintFrame) cancelAnimationFrame(paintFrame);
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up);
      host.removeEventListener('pointercancel', up);
      host.removeEventListener('wheel', wheel);
      host.removeEventListener('keydown', keyboard);
    };
  }, [active, reducedMotion, leagues]);

  // Motion accessibility: no canvas distortion, still select-only.
  if (reducedMotion) {
    return <div className="vh-league-picker vh-league-picker--static" role="group" aria-label="Wybierz ligę">
      {leagues.map((league, index) =>
        <button key={league.id} type="button"
          className={selected === index ? 'is-selected' : ''}
          aria-pressed={selected === index}
          onClick={() => { selectedRef.current = index; setSelected(index); }}>
          {league.name}
        </button>)}
    </div>;
  }

  return <div ref={hostRef} className="vh-league-picker" role="listbox"
    aria-label="Wybierz ligę. Przesuń palcem w górę lub w dół."
    aria-activedescendant={id + '-league-' + leagues[selected]?.id}
    tabIndex={active ? 0 : -1}>
    <canvas ref={canvasRef} className="vh-league-picker__canvas" aria-hidden="true" />
    <span className="vh-league-picker__pointer" aria-hidden="true" />
    <span className="vh-league-picker__instruction" aria-hidden="true">PRZESUŃ PALCEM ↑↓</span>
    <div className="vh-league-picker__accessible">
      {leagues.map((league, index) =>
        <div key={league.id} id={id + '-league-' + league.id} role="option" aria-selected={selected === index}>
          {league.name}
        </div>)}
    </div>
  </div>;
}
