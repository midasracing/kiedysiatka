import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { leagueNameLines, pickerIndexFromScroll, pickerScrollForIndex, PICKER_ROW_HEIGHT } from './leaguePickerMath.js';
import './LeaguePicker.css';

// The reference uses a native vertical list with a fixed selection marker.
// Only its heavy, blood-red typography comes from our standings; no lens warp.
const INITIAL_INDEX = 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function LeaguePicker({ leagues, active, initialIndex = INITIAL_INDEX, onSelectionChange, onOpen }) {
  const scrollerRef = useRef(null);
  const animationRef = useRef(0);
  const measuredSize = useRef('');
  const programmaticTarget = useRef(null);
  const selectedRef = useRef(clamp(initialIndex, 0, leagues.length - 1));
  const [selected, setSelected] = useState(() => clamp(initialIndex, 0, leagues.length - 1));

  const updateFromScroll = useCallback(() => {
    animationRef.current = 0;
    const scroller = scrollerRef.current;
    if (!scroller || !leagues.length || !active) return;
    const width = scroller.clientWidth;
    // Native scroll anchoring may fire before ResizeObserver when CSS or the
    // viewport changes. Do not treat that provisional offset as a new choice.
    if (measuredSize.current !== scroller.clientHeight + ':' + width) return;
    const position = scroller.scrollTop;
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
    // The video has a curved, stepped indentation in X, NOT warped letter
    // shapes. Transform only six text spans; native touch momentum stays intact.
    const options = scroller.querySelectorAll('.vh-league-picker__label');
    // Complete layout reads before writing any transforms.
    const widths = Array.from(options, option => option.offsetWidth);
    const pad = width <= 390 ? 48 : 52;
    for (let i = 0; i < options.length; i += 1) {
      const distance = Math.abs(i * PICKER_ROW_HEIGHT - position);
      const ratio = distance / (PICKER_ROW_HEIGHT * 1.25);
      const desiredIndent = Math.round(54 * Math.exp(-ratio * ratio));
      const naturalWidth = widths[i];
      // Keep full two-line titles readable on narrow phones without reducing font size.
      const available = Math.max(1, width - pad - 12 - desiredIndent);
      const fit = naturalWidth ? Math.min(1, available / naturalWidth) : 1;
      options[i].style.transform = `translate3d(${desiredIndent}px,0,0) scaleX(${fit})`;
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
    const resize = () => {
      const height = scroller.clientHeight;
      const size = height + ':' + scroller.clientWidth;
      if (!height || size === previousSize) return;
      previousSize = size;
      measuredSize.current = size;
      scroller.style.setProperty('--picker-spacer', `${Math.max(0, (height - PICKER_ROW_HEIGHT) / 2)}px`);
      const destination = clamp(selectedRef.current, 0, leagues.length - 1);
      // WebKit can report the unstyled height before CSS finishes loading.
      // That first scroll is clamped to zero. Preserve the intended selection
      // until the next resize can center it, just as during choose().
      programmaticTarget.current = destination;
      scroller.scrollTop = pickerScrollForIndex(destination);
      queueUpdate();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(scroller);
    return () => {
      observer.disconnect();
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
