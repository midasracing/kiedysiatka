import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './LeagueSplitTransition.css';

const DURATION = 720;
const EASING = 'cubic-bezier(.7,0,.2,1)';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * A real two-line split transition, measured from the selected option rather
 * than fabricated text. WAAPI composites only two transforms and one veil.
 * Reverse uses the same keyframes in reverse order, so both directions meet.
 */
export default function LeagueSplitTransition({ phase, snapshot, onComplete }) {
  const lineRefs = useRef([]);
  const veilRef = useRef(null);

  useLayoutEffect(() => {
    if (!snapshot?.lines?.length || !veilRef.current) {
      onComplete(phase);
      return undefined;
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !lineRefs.current[0]?.animate) {
      onComplete(phase);
      return undefined;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const animations = [];
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    snapshot.lines.forEach((line, index) => {
      const node = lineRefs.current[index];
      if (!node) return;
      const naturalWidth = Math.max(1, line.naturalWidth);
      const naturalHeight = Math.max(1, line.naturalHeight);
      const startScaleX = line.width / naturalWidth;
      const startScaleY = line.height / naturalHeight;
      const expandedWidth = viewportWidth * 1.06;
      const wideScaleX = expandedWidth / naturalWidth;
      const wideScaleY = clamp(Math.sqrt(wideScaleX) * 1.24, 1.2, 2.7);
      const expandedHeight = naturalHeight * wideScaleY;
      const wideX = (viewportWidth - expandedWidth) / 2;
      const spreadY = (index === 0 ? viewportHeight * .29 : viewportHeight * .70) - expandedHeight / 2;
      const endY = index === 0
        ? -expandedHeight - viewportHeight * .13
        : viewportHeight + viewportHeight * .13;

      const position = (x, y, sx, sy) =>
        `translate3d(${x - line.left}px,${y - line.top}px,0) scale(${sx},${sy})`;

      const forward = [
        { offset: 0, transform: position(line.left, line.top, startScaleX, startScaleY), opacity: 1 },
        { offset: .64, transform: position(wideX, spreadY, wideScaleX, wideScaleY), opacity: 1 },
        { offset: 1, transform: position(wideX, endY, wideScaleX, wideScaleY), opacity: 0 },
      ];
      const frames = phase === 'open' ? forward : forward.slice().reverse().map(frame => ({
        ...frame, offset: 1 - frame.offset,
      }));
      animations.push(node.animate(frames, {
        duration: DURATION,
        easing: EASING,
        fill: 'both',
      }));
    });

    const veil = [
      { offset: 0, opacity: 1 },
      { offset: .24, opacity: .98 },
      { offset: .78, opacity: 0 },
      { offset: 1, opacity: 0 },
    ];
    animations.push(veilRef.current.animate(
      phase === 'open' ? veil : veil.slice().reverse().map(frame => ({
        ...frame, offset: 1 - frame.offset,
      })),
      { duration: DURATION, easing: 'linear', fill: 'both' },
    ));

    let cancelled = false;
    Promise.all(animations.map(animation => animation.finished.catch(() => null)))
      .then(() => { if (!cancelled) onComplete(phase); });
    return () => {
      cancelled = true;
      animations.forEach(animation => animation.cancel());
      document.body.style.overflow = oldOverflow;
    };
  }, [phase, snapshot, onComplete]);

  return createPortal(
    <div className="vh-league-split" data-phase={phase} aria-hidden="true">
      <div className="vh-league-split__veil" ref={veilRef} />
      {snapshot.lines.map((line, index) =>
        <span
          key={index}
          ref={node => { lineRefs.current[index] = node; }}
          className="vh-league-split__line"
          style={{
            left: line.left,
            top: line.top,
            font: line.font,
            letterSpacing: line.letterSpacing,
            textTransform: 'uppercase',
            color: '#fc0001',
          }}
        >{line.text}</span>
      )}
    </div>,
    document.body,
  );
}
