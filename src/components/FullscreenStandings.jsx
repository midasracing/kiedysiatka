import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import Standings from './Standings.jsx';
import './FullscreenStandings.css';

const SLIDE_ENTER_MS = 500;
const SLIDE_EXIT_MS = 540;

/**
 * Fixed portal keeps the animated table outside PageStage's layout and outside
 * the persistent bottom navigation. Closing restores the previous league view
 * and the exact document scroll position.
 */
export default function FullscreenStandings({
  leagueName, rows, logos, groups = [], selectedGroup, onSelectGroup, onBack,
  origin, returnTab = 'matches',
}) {
  const backRef = useRef(null);
  const exitTimer = useRef(null);
  const exiting = useRef(false);
  const reducedMotion = useRef(
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  ).current;
  const [phase, setPhase] = useState(reducedMotion ? 'active' : 'prepare');
  const [exitDestination, setExitDestination] = useState(returnTab);

  useEffect(() => {
    if (reducedMotion) return undefined;
    // Standings queues its first canvas draw on mount. Let that frame paint
    // before starting the sheet, rather than rasterizing during the swipe.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setPhase(current => current === 'prepare' ? 'enter' : current);
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [reducedMotion]);

  const exitTable = useCallback((destination = returnTab) => {
    if (exiting.current) return;
    exiting.current = true;
    setExitDestination(destination);
    if (reducedMotion) {
      onBack(destination);
      return;
    }
    setPhase('exit');
    exitTimer.current = window.setTimeout(() => onBack(destination), SLIDE_EXIT_MS);
  }, [onBack, reducedMotion, returnTab]);

  useEffect(() => {
    if (phase !== 'enter') return undefined;
    // Finish from animationend; a busy first paint must not cut the swipe.
    // The timer only recovers from an interrupted animation.
    const timer = window.setTimeout(() => {
      setPhase(current => current === 'enter' ? 'active' : current);
    }, SLIDE_ENTER_MS + 1000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  // The league heading stays stationary while the sheet moves underneath it.
  // It never scales, moves or gets clipped by the black unfolding surface.
  useLayoutEffect(() => {
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

  const sourceTitle = origin?.title || null;
  const sourceMenu = origin?.menu || null;
  const titleTypography = sourceTitle ? {
    fontSize: sourceTitle.fontSize,
    fontFamily: sourceTitle.fontFamily,
    fontWeight: sourceTitle.fontWeight,
    lineHeight: sourceTitle.lineHeight,
    letterSpacing: sourceTitle.letterSpacing,
  } : {};

  return createPortal(
    <section className="vh-standings-fullscreen" role="dialog" aria-modal="true"
      data-liquid-phase={phase}
      style={{
        '--vh-title-left': `${sourceTitle?.left ?? 20}px`,
        '--vh-title-top': `${sourceTitle?.top ?? 135}px`,
        '--vh-title-width': `${sourceTitle?.width ?? Math.max(1, window.innerWidth - 40)}px`,
        '--vh-title-height': `${sourceTitle?.height ?? 48}px`,
        '--vh-sheet-origin-offset': sourceMenu
          ? `calc(${sourceMenu.top}px - env(safe-area-inset-top, 0px) - 82px)`
          : '100dvh',
        '--vh-menu-left': `${sourceMenu?.left ?? 20}px`,
        '--vh-menu-width': `${sourceMenu?.width ?? Math.max(1, window.innerWidth - 40)}px`,
        '--vh-menu-height': `${sourceMenu?.height ?? 53}px`,
      }}
      aria-label={`Tabela ligowa — ${leagueName}`}>
      <div className="vh-standings-fullscreen__surface" onAnimationEnd={event => {
        if (event.target === event.currentTarget && event.animationName === 'vh-standings-slide-up') {
          setPhase(current => current === 'enter' ? 'active' : current);
        }
      }}>
      <Standings key={selectedGroup || leagueName} rows={rows} logos={logos} />
      <div className="vh-standings-fullscreen__fade" aria-hidden="true" />
      <div className="vh-standings-fullscreen__travel-menu"
        role="tablist" aria-label="Widok rozgrywek">
        {[
          ['matches', 'Mecze'],
          ['table', 'Tabela'],
          ['teams', 'Drużyny'],
        ].map(([id, label]) => <button key={id} type="button"
          role="tab"
          className={((phase === 'exit' ? exitDestination : 'table') === id) ? 'is-selected' : ''}
          aria-selected={(phase === 'exit' ? exitDestination : 'table') === id}
          disabled={phase === 'exit' || phase === 'prepare'}
          onClick={() => { if (id !== 'table') exitTable(id); }}>
          {label}
        </button>)}
      </div>
      <header className="vh-standings-fullscreen__header">
        <div className="vh-standings-fullscreen__topline">
          <button ref={backRef} className="vh-standings-fullscreen__back"
            type="button" onClick={() => exitTable()} disabled={phase === 'exit'}>
            <ChevronLeft size={23} strokeWidth={2.1} aria-hidden="true" />
            <span>Wstecz</span>
          </button>
        </div>
        <div className="vh-standings-fullscreen__identity-spacer" aria-hidden="true" />
        {groups.length > 0 && <div className="vh-standings-fullscreen__groups"
          role="group" aria-label="Wybierz grupę ligi">
          {groups.map(item =>
            <button key={item.name} type="button"
              aria-pressed={selectedGroup === item.name}
              className={'vh-standings-fullscreen__chip' + (selectedGroup === item.name ? ' is-selected' : '')}
              onClick={() => onSelectGroup(item.name)}>{item.name}</button>)}
        </div>}
      </header>
      </div>
      <div className="vh-standings-fullscreen__identity">
        <h2 style={titleTypography}>{leagueName.toLocaleUpperCase('pl-PL')}</h2>
      </div>
    </section>,
    document.body
  );
}
