import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { leagueNameLines, pickerIndexFromScroll, pickerScrollForIndex, pickerIndentForDistance, pickerFixedScale, PICKER_ROW_HEIGHT } from './leaguePickerMath.js';
import './LeaguePicker.css';

// The reference uses a native vertical list with a fixed selection marker.
// Only its heavy, blood-red typography comes from our standings; no lens warp.
const INITIAL_INDEX = 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function LeaguePicker({ leagues, active, initialIndex = INITIAL_INDEX, onSelectionChange, onOpen }) {
  const scrollerRef = useRef(null);
  const animationRef = useRef(0);
  const measuredSize = useRef('');
  const labelsRef = useRef([]);
  const fixedScalesRef = useRef([]);
  const programmaticTarget = useRef(null);
  const selectedRef = useRef(clamp(initialIndex, 0, leagues.length - 1));
  const [selected, setSelected] = useState(() => clamp(initialIndex, 0, leagues.length - 1));

  const updateFromScroll = useCallback(() => {
    animationRef.current = 0;
    const scroller = scrollerRef.current;
    if (!scroller || !leagues.length || !active) return;
    // All layout measurements happen on resize/font readiness, NEVER inside
    // the scroll frame. Reading six offsetWidths per frame forced Safari to
    // synchronously reflow the text while its native momentum was running.
    if (!measuredSize.current) return;
    // Ignore iOS rubber-band overscroll at the first and last rows.
    const position = clamp(scroller.scrollTop, 0, pickerScrollForIndex(leagues.length - 1));
    const target = programmaticTarget.current;
    // Keep the selected option stable while native smooth-scroll passes over
    // intermediate rows. Real finger/wheel scrolling clears the target.
    if (target !== null) {
      if (Math.abs(position - pickerScrollForIndex(target)) < 1.5) {
        programmaticTarget.current = null;
      } else {
        // Still update label indentation on each frame below.
      }
    }
    const index = programmaticTarget.current !== null
      ? programmaticTarget.current
      : pickerIndexFromScroll(position, leagues.length);
    if (index !== selectedRef.current) {
      selectedRef.current = index;
      setSelected(index);
      onSelectionChange?.(index);
    }
    // Only translate the cached text layers during momentum. A varying
    // scaleX re-rasterized the Impact glyphs every frame, causing shimmer
    // and tiny sideways jerks. Keep each line's scale fixed at its measured
    // safe width, and update the indent with SUBPIXEL precision.
    const options = labelsRef.current;
    const scales = fixedScalesRef.current;
    for (let i = 0; i < options.length; i += 1) {
      const desiredIndent = pickerIndentForDistance(i * PICKER_ROW_HEIGHT - position);
      options[i].style.transform =
        `translate3d(${desiredIndent.toFixed(2)}px,0,0) scaleX(${(scales[i] || 1).toFixed(5)})`;
    }
  }, [active, leagues.length, onSelectionChange]);

  const queueUpdate = useCallback(() => {
    if (!animationRef.current) animationRef.current = requestAnimationFrame(updateFromScroll);
  }, [updateFromScroll]);

  useLayoutEffect(() => {
    if (!active || !leagues.length) return undefined;
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    let previousSize = '';
    let cancelled = false;
    const measureLabels = () => {
      // These DOM reads run only at mount, on a genuine viewport resize
      // and after the Impact web font becomes available.
      const width = scroller.clientWidth;
      const labels = [...scroller.querySelectorAll('.vh-league-picker__label')];
      labelsRef.current = labels;
      fixedScalesRef.current = labels.map(label =>
        pickerFixedScale(label.offsetWidth, width));
      queueUpdate();
    };
    const resize = () => {
      const height = scroller.clientHeight;
      const size = height + ':' + scroller.clientWidth;
      if (!height || size === previousSize) return;
      previousSize = size;
      measuredSize.current = size;
      scroller.style.setProperty('--picker-spacer', `${Math.max(0, (height - PICKER_ROW_HEIGHT) / 2)}px`);
      measureLabels();
      const destination = clamp(selectedRef.current, 0, leagues.length - 1);
      // Only an actual viewport change may realign the chosen row. Dynamic
      // iPhone toolbar changes no longer resize the list (100svh in CSS).
      programmaticTarget.current = destination;
      scroller.scrollTop = pickerScrollForIndex(destination);
      queueUpdate();
    };
    resize();
    document.fonts?.ready?.then(() => {
      if (!cancelled) measureLabels();
    });
    const observer = new ResizeObserver(resize);
    // Centering changes padding, so the content box changes as a result of
    // our own callback. Observe the fixed outer box to avoid a WebKit resize
    // feedback loop while still detecting viewport changes.
    observer.observe(scroller, { box: 'border-box' });
    return () => {
      cancelled = true;
      observer.disconnect();
      labelsRef.current = [];
      fixedScalesRef.current = [];
      // StrictMode mounts this effect again after its cleanup. A cancelled
      // frame ID must not block the next mount's scroll updates forever.
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    };
  }, [active, leagues.length, queueUpdate]);

  const choose = useCallback(index => {
    const scroller = scrollerRef.current;
    if (!scroller || !leagues.length) return;
    const destination = clamp(index, 0, leagues.length - 1);
    programmaticTarget.current = destination;
    selectedRef.current = destination;
    setSelected(destination);
    onSelectionChange?.(destination);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({
      top: pickerScrollForIndex(destination),
      behavior: reduceMotion ? 'instant' : 'smooth',
    });
    queueUpdate();
  }, [leagues.length, queueUpdate, onSelectionChange]);

  const openSelected = (index, option) => {
    if (index !== selectedRef.current) {
      choose(index);
      return;
    }
    if (!onOpen || !option || !active) return;
    if (programmaticTarget.current !== null && scrollerRef.current) {
      const scroller = scrollerRef.current;
      scroller.scrollTo({ top: pickerScrollForIndex(index), behavior: 'instant' });
      programmaticTarget.current = null;
      updateFromScroll();
    }
    const captureText = element => {
      const bounds = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        text: element.textContent,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        naturalWidth: element.offsetWidth,
        naturalHeight: element.offsetHeight,
        font: style.font,
        letterSpacing: style.letterSpacing,
      };
    };
    // Capture every name before the picker unmounts. The return transition
    // uses these same positions, so no row can appear late on black.
    const rows = [...scrollerRef.current.querySelectorAll('.vh-league-picker__option')]
      .map((row, rowIndex) => ({
        index: rowIndex,
        lines: [...row.querySelectorAll('.vh-league-picker__line')].map(captureText),
      }));
    const topfade = scrollerRef.current.closest('.vh-competitions-screen')
      ?.querySelector('.vh-competitions-topfade');
    const gradientBounds = topfade?.getBoundingClientRect();
    const gradient = gradientBounds ? {
      left: gradientBounds.left,
      top: gradientBounds.top,
      width: gradientBounds.width,
      height: gradientBounds.height,
      backgroundImage: window.getComputedStyle(topfade).backgroundImage,
    } : null;
    const heading = topfade?.querySelector('h1');
    const pointer = scrollerRef.current.parentElement
      ?.querySelector('.vh-league-picker__pointer');
    const pointerBounds = pointer?.getBoundingClientRect();
    const lines = rows[index]?.lines || [];
    if (lines.length === 2) onOpen(leagues[index], {
      index,
      lines,
      rows,
      heading: heading ? captureText(heading) : null,
      gradient,
      pointer: pointerBounds ? { left: pointerBounds.left, top: pointerBounds.top } : null,
    });
  };

  const onKeyDown = event => {
    const keys = {
      ArrowDown: selectedRef.current + 1,
      ArrowUp: selectedRef.current - 1,
      PageDown: selectedRef.current + 3,
      PageUp: selectedRef.current - 3,
      Home: 0,
      End: leagues.length - 1,
    };
    if (Object.hasOwn(keys, event.key)) {
      event.preventDefault();
      choose(keys[event.key]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = scrollerRef.current?.querySelectorAll('.vh-league-picker__option')[selectedRef.current];
      if (option) openSelected(selectedRef.current, option);
    }
  };

  return <div className="vh-league-picker" role="group" aria-label="Selektor rozgrywek">
    <div
      ref={scrollerRef}
      className="vh-league-picker__scroll"
      role="listbox"
      aria-label="Wybierz ligę. Przesuwaj w pionie, aby zmieniać wybór."
      aria-activedescendant={leagues[selected] ? `league-choice-${leagues[selected].id}` : undefined}
      tabIndex={active ? 0 : -1}
      onScroll={queueUpdate}
      onPointerDown={() => { programmaticTarget.current = null; }}
      onTouchStart={() => { programmaticTarget.current = null; }}
      onWheel={() => { programmaticTarget.current = null; }}
      onKeyDown={onKeyDown}
    >
      {leagues.map((league, index) =>
        <button
          type="button"
          key={league.id}
          id={`league-choice-${league.id}`}
          className="vh-league-picker__option"
          role="option"
          aria-selected={selected === index}
          aria-label={league.name}
          tabIndex={-1}
          onPointerDown={event => {
            if (index === selectedRef.current && event.pointerType !== 'mouse') {
              event.currentTarget.classList.add('is-pressed');
            }
          }}
          onPointerUp={event => event.currentTarget.classList.remove('is-pressed')}
          onPointerCancel={event => event.currentTarget.classList.remove('is-pressed')}
          onPointerLeave={event => event.currentTarget.classList.remove('is-pressed')}
          onTouchStart={event => {
            if (index === selectedRef.current) event.currentTarget.classList.add('is-pressed');
          }}
          onTouchMove={event => event.currentTarget.classList.remove('is-pressed')}
          onTouchEnd={event => event.currentTarget.classList.remove('is-pressed')}
          onTouchCancel={event => event.currentTarget.classList.remove('is-pressed')}
          onClick={event => openSelected(index, event.currentTarget)}
        >
          <span className="vh-league-picker__label">
            {leagueNameLines(league).map((line, i) =>
              <span className="vh-league-picker__line" key={i}>{line}</span>
            )}
          </span>
        </button>
      )}
    </div>
    <span className="vh-league-picker__pointer" aria-hidden="true" />
  </div>;
}
