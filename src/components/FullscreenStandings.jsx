import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import Standings from './Standings.jsx';
import RedlineWarpCanvas from './RedlineWarpCanvas.jsx';
import { REDLINE_IN_MS, REDLINE_OUT_MS } from '../redlineWarpMath.js';
import './FullscreenStandings.css';

/**
 * Fixed portal keeps the animated table outside PageStage's layout and outside
 * the persistent bottom navigation. Closing restores the previous league view
 * and the exact document scroll position.
 */
export default function FullscreenStandings({
  leagueName, rows, logos, groups = [], selectedGroup, onSelectGroup, onBack,
}) {
  const backRef = useRef(null);
  const leagueTitleRef = useRef(null);
  const sourceRef = useRef(null);
  const sourceYsRef = useRef([]);
  const exitStarted = useRef(false);
  const exitTimer = useRef(null);
  const reducedMotion = useRef(
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  ).current;
  const [phase, setPhase] = useState(reducedMotion ? 'active' : 'enter');

  const exitTable = useCallback(() => {
    if (exitStarted.current) return;
    exitStarted.current = true;
    if (reducedMotion) {
      onBack();
      return;
    }
    // Reveal the existing cards beneath the portal before the tunnel opens.
    sourceRef.current?.classList.add('is-redline-returning');
    sourceRef.current?.classList.remove('is-redline-hidden');
    setPhase('exit');
    exitTimer.current = window.setTimeout(onBack, REDLINE_OUT_MS);
  }, [onBack, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = window.setTimeout(() => {
      setPhase(current => current === 'enter' ? 'active' : current);
    }, REDLINE_IN_MS);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  // The title itself travels from the live red league header into the white
  // table heading (and reverses on back) using a measured FLIP transform.
  // Keep original cards in the DOM, and flatten only their visual layer.
  useLayoutEffect(() => {
    if (reducedMotion) return undefined;
    const source = document.querySelector('[data-route="competitions"] .vh-competition-detail');
    const title = leagueTitleRef.current;
    const original = source?.querySelector('.vh-competition-heading h1');
    if (!source || !title || !original) return undefined;
    sourceRef.current = source;
    const sourceBox = original.getBoundingClientRect();
    const targetBox = title.getBoundingClientRect();
    if (targetBox.width > 0) {
      const scale = sourceBox.width / targetBox.width;
      title.style.setProperty('--redline-title-x', (sourceBox.left - targetBox.left) + 'px');
      title.style.setProperty('--redline-title-y', (sourceBox.top - targetBox.top) + 'px');
      title.style.setProperty('--redline-title-scale', String(Math.max(.25, Math.min(3, scale))));
    }
    sourceYsRef.current = Array.from(
      source.querySelectorAll('.vh-match, .vh-team-tile')
    ).map(node => {
      const rect = node.getBoundingClientRect();
      return rect.top + rect.height / 2;
    }).filter(y => y > -60 && y < window.innerHeight + 80).slice(0, 12);
    source.classList.add('is-redline-source');
    const frame = requestAnimationFrame(() => {
      if (!exitStarted.current) source.classList.add('is-redline-hidden');
    });
    return () => {
      cancelAnimationFrame(frame);
      source.classList.remove('is-redline-source', 'is-redline-hidden', 'is-redline-returning');
      sourceRef.current = null;
    };
  }, [leagueName, reducedMotion]);

  // Use the same Impact letterforms as the red team names in the warped table.
  // Fit long league names uniformly into the available width, without scaleX.
  useLayoutEffect(() => {
    const title = leagueTitleRef.current;
    const wrapper = title?.parentElement;
    if (!title || !wrapper) return undefined;
    let cancelled = false;
    const fitTitle = () => {
      if (cancelled) return;
      const maxSize = 112;
      title.style.fontSize = `${maxSize}px`;
      const measuredWidth = title.getBoundingClientRect().width;
      const available = Math.max(1, wrapper.clientWidth - 2);
      if (measuredWidth > 0) {
        title.style.fontSize = `${Math.min(maxSize, maxSize * available / measuredWidth)}px`;
      }
    };
    fitTitle();
    const observer = new ResizeObserver(fitTitle);
    observer.observe(wrapper);
    document.fonts?.ready?.then(fitTitle);
    return () => { cancelled = true; observer.disconnect(); };
  }, [leagueName]);

  useEffect(() => {
    const body = document.body;
    const root = document.getElementById('root');
    const previousFocus = document.activeElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const previousStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const hadInert = root?.inert ?? false;

    // iOS Safari may scroll behind an overlay with overflow:hidden alone.
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    if (root) root.inert = true;
    backRef.current?.focus({ preventScroll: true });

    const handleKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        exitTable();
      }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      for (const [property, value] of Object.entries(previousStyles)) {
        body.style[property] = value;
      }
      if (root) root.inert = hadInert;
      window.scrollTo(scrollX, scrollY);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [exitTable]);

  return createPortal(
    <section className="vh-standings-fullscreen" role="dialog" aria-modal="true"
      data-redline-phase={phase} aria-label={`Tabela ligowa — ${leagueName}`}>
      <Standings key={selectedGroup || leagueName} rows={rows} logos={logos} />
      <div className="vh-standings-fullscreen__fade" aria-hidden="true" />
      {!reducedMotion && phase !== 'active' &&
        <RedlineWarpCanvas phase={phase} sourceYsRef={sourceYsRef} />}
      <header className="vh-standings-fullscreen__header">
        <div className="vh-standings-fullscreen__topline">
          <button ref={backRef} className="vh-standings-fullscreen__back"
            type="button" onClick={exitTable} disabled={phase === 'exit'}>
            <ChevronLeft size={23} strokeWidth={2.1} aria-hidden="true" />
            <span>Wstecz</span>
          </button>
          <span className="vh-standings-fullscreen__section-title">Tabela</span>
        </div>
        <div className="vh-standings-fullscreen__identity">
          <h2 ref={leagueTitleRef}>{leagueName.toLocaleUpperCase('pl-PL')}</h2>
        </div>
        {groups.length > 0 && <div className="vh-standings-fullscreen__groups"
          role="group" aria-label="Wybierz grupę ligi">
          {groups.map(item =>
            <button key={item.name} type="button"
              aria-pressed={selectedGroup === item.name}
              className={'vh-standings-fullscreen__chip' + (selectedGroup === item.name ? ' is-selected' : '')}
              onClick={() => onSelectGroup(item.name)}>{item.name}</button>)}
        </div>}
      </header>
    </section>,
    document.body
  );
}
