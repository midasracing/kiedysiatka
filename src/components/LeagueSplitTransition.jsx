import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './LeagueSplitTransition.css';

const DURATION = 660;
const EASING = 'cubic-bezier(.54,.04,.28,1)';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const reverseFrames = frames => frames.slice().reverse().map(frame => ({
  ...frame,
  offset: 1 - frame.offset,
}));

/**
 * The full league list is the curtain, not just the selected word.
 * Rows above the selection exit upwards, rows below exit downwards.
 * The two selected lines expand across the screen and split apart.
 * Reversing ALL keyframes reconstructs the complete list together.
 */
export default function LeagueSplitTransition({ phase, snapshot, onComplete }) {
  const lineRefs = useRef([]);
  const veilRef = useRef(null);
  const headingRef = useRef(null);
  const pointerRef = useRef(null);

  const rows = snapshot?.rows?.length
    ? snapshot.rows
    : [{ index: snapshot?.index ?? 0, lines: snapshot?.lines || [] }];
  const parts = rows.flatMap(row => row.lines.map((line, partIndex) => ({
    ...line,
    rowIndex: row.index,
    partIndex,
  })));

  useLayoutEffect(() => {
    if (!parts.length || !veilRef.current) {
      onComplete(phase);
      return undefined;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        !lineRefs.current[0]?.animate) {
      onComplete(phase);
      return undefined;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const animations = [];
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const animate = (node, forward, easing = EASING) => {
      if (!node) return;
      animations.push(node.animate(
        phase === 'open' ? forward : reverseFrames(forward),
        { duration: DURATION, easing, fill: 'both' },
      ));
    };

    parts.forEach((line, index) => {
      const naturalWidth = Math.max(1, line.naturalWidth);
      const naturalHeight = Math.max(1, line.naturalHeight);
      const baseX = line.width / naturalWidth;
      const baseY = line.height / naturalHeight;
      const position = (x, y, scaleX, scaleY) =>
        `translate3d(${x - line.left}px,${y - line.top}px,0) scale(${scaleX},${scaleY})`;

      const start = position(line.left, line.top, baseX, baseY);
      const goesUp = line.rowIndex < snapshot.index ||
        (line.rowIndex === snapshot.index && line.partIndex === 0);
      const targetY = goesUp
        ? -naturalHeight * 3 - vh * .10
        : vh + naturalHeight * 3 + vh * .10;

      let frames;
      if (line.rowIndex === snapshot.index) {
        const width = vw * 1.06;
        const bigScaleX = width / naturalWidth;
        const bigScaleY = clamp(Math.sqrt(bigScaleX) * 1.24, 1.2, 2.7);
        const expandedHeight = naturalHeight * bigScaleY;
        const x = (vw - width) / 2;
        const middleY = (goesUp ? vh * .29 : vh * .70) - expandedHeight / 2;
        frames = [
          { offset: 0, transform: start },
          { offset: .51, transform: position(x, middleY, bigScaleX, bigScaleY) },
          { offset: 1, transform: position(x, targetY, bigScaleX, bigScaleY) },
        ];
      } else {
        // Every surrounding league moves in the same direction as its
        // side of the curtain: no isolated chosen word on an empty screen.
        frames = [
          { offset: 0, transform: start },
          { offset: .50, transform: position(
            line.left, line.top + (targetY - line.top) * .56, baseX, baseY,
          ) },
          { offset: 1, transform: position(line.left, targetY, baseX, baseY) },
        ];
      }
      animate(lineRefs.current[index], frames);
    });

    // Keep the league details visible until the returning names actually
    // arrive. The black backdrop grows with the curtain, never ahead of it.
    animate(veilRef.current, [
      { offset: 0, opacity: 1 },
      { offset: .22, opacity: .91 },
      { offset: .58, opacity: .45 },
      { offset: .92, opacity: 0 },
      { offset: 1, opacity: 0 },
    ], 'linear');

    animate(headingRef.current, [
      { offset: 0, opacity: 1 },
      { offset: .42, opacity: 0 },
      { offset: 1, opacity: 0 },
    ], 'linear');

    animate(pointerRef.current, [
      { offset: 0, opacity: 1 },
      { offset: .30, opacity: 0 },
      { offset: 1, opacity: 0 },
    ], 'linear');

    let cancelled = false;
    Promise.all(animations.map(animation => animation.finished.catch(() => null)))
      .then(() => { if (!cancelled) onComplete(phase); });
    return () => {
      cancelled = true;
      animations.forEach(animation => animation.cancel());
      document.body.style.overflow = previousOverflow;
    };
  }, [phase, snapshot, onComplete]);

  return createPortal(
    <div className="vh-league-split" data-phase={phase}
      data-names={rows.length} aria-hidden="true">
      <div className="vh-league-split__veil" ref={veilRef} />
      {parts.map((line, index) =>
        <span
          key={`${line.rowIndex}-${line.partIndex}`}
          ref={node => { lineRefs.current[index] = node; }}
          className="vh-league-split__line"
          data-league-row={line.rowIndex}
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
      {snapshot?.heading && <h1
        ref={headingRef}
        className="vh-league-split__heading"
        style={{
          left: snapshot.heading.left,
          top: snapshot.heading.top,
          font: snapshot.heading.font,
          letterSpacing: snapshot.heading.letterSpacing,
        }}
      >{snapshot.heading.text}</h1>}
      {snapshot?.pointer && <span ref={pointerRef}
        className="vh-league-split__pointer"
        style={{ left: snapshot.pointer.left, top: snapshot.pointer.top }} />}
    </div>,
    document.body,
  );
}
