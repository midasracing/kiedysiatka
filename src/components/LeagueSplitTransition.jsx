import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './LeagueSplitTransition.css';

// A responsive three-beat entrance; preserve the existing 660 ms return.
const OPEN_DURATION = 860;
const DURATION = 660;
const EASING = 'cubic-bezier(.54,.04,.28,1)';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const reverseFrames = frames => frames.slice().reverse().map(frame => ({
  ...frame,
  offset: 1 - frame.offset,
}));

/**
 * Opening: touch pulse -> BOTH selected lines grow to screen width -> the
 * entire list splits like curtains. Closing retains the previously approved
 * inverse timeline and its exact gradient choreography.
 */
export default function LeagueSplitTransition({ phase, snapshot, onComplete }) {
  const lineRefs = useRef([]);
  const veilRef = useRef(null);
  const gradientRef = useRef(null);
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

    // The return remains the previously approved animation. Only the
    // opening gains a different timeline, with precisely timed stages.
    const animate = (node, forward, easing = EASING, opening = forward) => {
      if (!node) return;
      animations.push(node.animate(
        phase === 'open' ? opening : reverseFrames(forward),
        {
          duration: phase === 'open' ? OPEN_DURATION : DURATION,
          easing: phase === 'open' ? 'linear' : easing,
          fill: 'both',
        },
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
      let opening;
      if (line.rowIndex === snapshot.index) {
        // 0–17%: tactile pulse.
        // 17–55%: uniform zoom, never horizontal text stretching.
        // Each line reaches both screen edges at its own proportional scale.
        // 55–100%: the two lines form the upper/lower curtains.
        const zoom = vw / naturalWidth;
        const expandedHeight = naturalHeight * zoom;
        const wideX = 0;
        const stackY = (line.partIndex === 0
          ? vh * .5 - expandedHeight * 1.03
          : vh * .5 + expandedHeight * .03);
        const fullWidth = position(wideX, stackY, zoom, zoom);
        const pressed = position(
          line.left - line.width * .024,
          line.top - line.height * .024,
          baseX * 1.048,
          baseY * 1.048,
        );
        opening = [
          { offset: 0, transform: start, filter: 'brightness(1)', easing: 'ease-out' },
          { offset: .09, transform: pressed, filter: 'brightness(1.36)', easing: 'ease-in-out' },
          { offset: .17, transform: start, filter: 'brightness(1)', easing: 'cubic-bezier(.55,0,.16,1)' },
          { offset: .55, transform: fullWidth, filter: 'brightness(1)' },
          { offset: .61, transform: fullWidth, filter: 'brightness(1)', easing: 'cubic-bezier(.7,0,.26,1)' },
          { offset: 1, transform: position(wideX, targetY, zoom, zoom), filter: 'brightness(1)' },
        ];
      } else {
        // Other names wait for the enlargement to finish, then peel away
        // as one coherent upper/lower curtain rather than leaving early.
        opening = [
          { offset: 0, transform: start },
          { offset: .52, transform: start, easing: 'cubic-bezier(.66,0,.24,1)' },
          { offset: 1, transform: position(line.left, targetY, baseX, baseY) },
        ];
      }
      animate(lineRefs.current[index], frames, EASING, opening);
    });

    // Keep the league details visible until the returning names actually
    // arrive. The black backdrop grows with the curtain, never ahead of it.
    animate(veilRef.current, [
      { offset: 0, opacity: 1 },
      { offset: .22, opacity: .91 },
      { offset: .58, opacity: .45 },
      { offset: .92, opacity: 0 },
      { offset: 1, opacity: 0 },
    ], 'linear', [
      { offset: 0, opacity: 1 },
      { offset: .52, opacity: 1 },
      { offset: .76, opacity: .40 },
      { offset: .95, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);

    // Match the actual selector's top gradient throughout both directions.
    // On return it builds gradually while the entire list converges,
    // reaching full strength exactly when the real selector takes over.
    animate(gradientRef.current, [
      { offset: 0, opacity: 1 },
      { offset: .15, opacity: .88 },
      { offset: .50, opacity: .48 },
      { offset: .85, opacity: .08 },
      { offset: 1, opacity: 0 },
    ], 'linear', [
      { offset: 0, opacity: 1 },
      { offset: .38, opacity: 1 },
      { offset: .77, opacity: .1 },
      { offset: 1, opacity: 0 },
    ]);

    animate(headingRef.current, [
      { offset: 0, opacity: 1 },
      { offset: .32, opacity: .92 },
      { offset: .76, opacity: 0 },
      { offset: 1, opacity: 0 },
    ], 'linear', [
      { offset: 0, opacity: 1 },
      { offset: .28, opacity: 1 },
      { offset: .69, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);

    animate(pointerRef.current, [
      { offset: 0, opacity: 1 },
      { offset: .30, opacity: 0 },
      { offset: 1, opacity: 0 },
    ], 'linear', [
      { offset: 0, opacity: 1 },
      { offset: .14, opacity: 1 },
      { offset: .47, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);

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
      {snapshot?.gradient && <div
        ref={gradientRef}
        className="vh-league-split__gradient"
        style={{
          left: snapshot.gradient.left,
          top: snapshot.gradient.top,
          width: snapshot.gradient.width,
          height: snapshot.gradient.height,
          backgroundImage: snapshot.gradient.backgroundImage,
        }}
      />}
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
