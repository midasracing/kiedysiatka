import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { leagueNameLines, pickerIndexFromScroll, pickerScrollForIndex, PICKER_ROW_HEIGHT } from './leaguePickerMath.js';
import './LeaguePicker.css';

// The reference uses a native vertical list with a fixed selection marker.
// Only its heavy, blood-red typography comes from our standings; no lens warp.
const INITIAL_INDEX = 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function LeaguePicker({ leagues, active }) {
  const scrollerRef = useRef(null);
  const animationRef = useRef(0);
  const selectedRef = useRef(INITIAL_INDEX);
  const [selected, setSelected] = useState(INITIAL_INDEX);

  const updateFromScroll = useCallback(() => {
    animationRef.current = 0;
    const scroller = scrollerRef.current;
    if (!scroller || !leagues.length || !active) return;
    const position = scroller.scrollTop;
    const index = pickerIndexFromScroll(position, leagues.length);
    if (index !== selectedRef.current) {
      selectedRef.current = index;
      setSelected(index);
    }
    // The video has a curved, stepped indentation in X, NOT warped letter
    // shapes. Transform only six text spans; native touch momentum stays intact.
    const options = scroller.querySelectorAll('.vh-league-picker__label');
    for (let i = 0; i < options.length; i += 1) {
      const distance = Math.abs(i * PICKER_ROW_HEIGHT - position);
      const ratio = distance / (PICKER_ROW_HEIGHT * 1.25);
      const desiredIndent = Math.round(54 * Math.exp(-ratio * ratio));
      const pad = scroller.clientWidth <= 390 ? 48 : 52;
      const naturalWidth = options[i].offsetWidth;
      // Keep full two-line titles readable on narrow phones without reducing font size.
      const available = Math.max(1, scroller.clientWidth - pad - 12 - desiredIndent);
      const fit = naturalWidth ? Math.min(1, available / naturalWidth) : 1;
      options[i].style.transform = `translate3d(${desiredIndent}px,0,0) scaleX(${fit})`;
    }
  }, [active, leagues.length]);

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
      scroller.style.setProperty('--picker-spacer', `${Math.max(0, (height - PICKER_ROW_HEIGHT) / 2)}px`);
      scroller.scrollTop = pickerScrollForIndex(
        clamp(selectedRef.current, 0, leagues.length - 1)
      );
      queueUpdate();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [active, leagues.length, queueUpdate]);

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  const choose = useCallback(index => {
    const scroller = scrollerRef.current;
    if (!scroller || !leagues.length) return;
    const destination = clamp(index, 0, leagues.length - 1);
    selectedRef.current = destination;
    setSelected(destination);
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({
      top: pickerScrollForIndex(destination),
      behavior: reduceMotion ? 'instant' : 'smooth',
    });
    queueUpdate();
  }, [leagues.length, queueUpdate]);

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
    }
    // Enter/Space intentionally do not open any league yet.
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
          onClick={() => choose(index)}
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
