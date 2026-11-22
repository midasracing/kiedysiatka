import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import Standings from './Standings.jsx';
import './FullscreenStandings.css';

const LIQUID_ENTER_MS = 1120;
const LIQUID_EXIT_MS = 880;

/**
 * Fixed portal keeps the animated table outside PageStage's layout and outside
 * the persistent bottom navigation. Closing restores the previous league view
 * and the exact document scroll position.
 */
export default function FullscreenStandings({
  leagueName, rows, logos, groups = [], selectedGroup, onSelectGroup, onBack,
  onExitStart, origin,
}) {
  const backRef = useRef(null);
  const pillRef = useRef(null);
  const portalRef = useRef(null);
  const exitTimer = useRef(null);
  const exiting = useRef(false);
  const reducedMotion = useRef(
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
  ).current;
  const [phase, setPhase] = useState(reducedMotion ? 'active' : 'enter');

  const exitTable = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    if (reducedMotion) {
      onBack();
      return;
    }
    onExitStart?.();
    setPhase('exit');
    exitTimer.current = window.setTimeout(onBack, LIQUID_EXIT_MS);
  }, [onBack, onExitStart, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const timer = window.setTimeout(() => {
      setPhase(current => current === 'enter' ? 'active' : current);
    }, LIQUID_ENTER_MS);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  // One visual pill moves between the *real* segmented-button rectangle and
  // its final header slot. No letter scaling and no animation on the table.
  // Layout is measured before paint, so the flight starts without a jump.
  useLayoutEffect(() => {
    if (reducedMotion || !portalRef.current || !pillRef.current) return;
    const target = pillRef.current.getBoundingClientRect();
    const sourceLeft = Number.isFinite(origin?.left) ? origin.left : target.left;
    const sourceTop = Number.isFinite(origin?.top) ? origin.top : target.top;
    const dx = target.left - sourceLeft;
    const dy = target.top - sourceTop;
    portalRef.current.style.setProperty('--vh-flight-dx', `${dx}px`);
    portalRef.current.style.setProperty('--vh-flight-dy', `${dy}px`);
    portalRef.current.style.setProperty('--vh-flight-x30', `${dx * .30}px`);
    portalRef.current.style.setProperty('--vh-flight-y30', `${dy * .30 + 16}px`);
    portalRef.current.style.setProperty('--vh-flight-x75', `${dx * .75}px`);
    portalRef.current.style.setProperty('--vh-flight-y75', `${dy * .75 + 12}px`);
  }, [origin, reducedMotion]);

  // The heading is a single fixed overlay at the source title's coordinates.
  // It never scales, moves or gets clipped by the black unfolding surface.
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

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pillWidth = Number.isFinite(origin?.width) ? Math.max(1, origin.width) : 112;
  const pillHeight = Number.isFinite(origin?.height) ? Math.max(1, origin.height) : 43;
  const sourceLeft = Number.isFinite(origin?.left) ? origin.left : (vw - pillWidth) / 2;
  const sourceTop = Number.isFinite(origin?.top) ? origin.top : (vh - pillHeight) / 2;
  // The black reveal is clipped to the REAL Tabela tab at frame zero.
  // Animate the four edges out to the viewport, retaining the selected
  // button's rounded corners until they naturally flatten at full screen.
  // No extra backdrop layer, no scaling of the distorted standings Canvas.
  const sourceRight = Math.max(0, vw - sourceLeft - pillWidth);
  const sourceBottom = Math.max(0, vh - sourceTop - pillHeight);
  const pillRadius = Number.isFinite(origin?.radius)
    ? Math.max(0, Math.min(origin.radius, pillHeight / 2, pillWidth / 2)) : 13;
  // Progressively widen the rounded pill BEFORE opening vertically. Expanding
  // all four inset edges at once created the tall black bar seen on iPhone.
  const spillBounds = {
    '--vh-spill-wide-top': `${Math.max(0, sourceTop * .90)}px`,
    '--vh-spill-wide-right': `${sourceRight * .30}px`,
    '--vh-spill-wide-bottom': `${sourceBottom * .90}px`,
    '--vh-spill-wide-left': `${Math.max(0, sourceLeft * .30)}px`,
    '--vh-spill-open-top': `${Math.max(0, sourceTop * .42)}px`,
    '--vh-spill-open-right': `${sourceRight * .02}px`,
    '--vh-spill-open-bottom': `${sourceBottom * .42}px`,
    '--vh-spill-open-left': `${Math.max(0, sourceLeft * .02)}px`,
    '--vh-spill-finish-top': `${Math.max(0, sourceTop * .055)}px`,
    '--vh-spill-finish-bottom': `${sourceBottom * .055}px`,
  };

  const sourceTitle = origin?.title || null;
  const titleTypography = sourceTitle ? {
    fontSize: sourceTitle.fontSize,
    fontFamily: sourceTitle.fontFamily,
    fontWeight: sourceTitle.fontWeight,
    lineHeight: sourceTitle.lineHeight,
    letterSpacing: sourceTitle.letterSpacing,
  } : {};

  return createPortal(
    <section ref={portalRef} className="vh-standings-fullscreen" role="dialog" aria-modal="true"
      data-liquid-phase={phase}
      style={{
        ...spillBounds,
        '--vh-title-left': `${sourceTitle?.left ?? 20}px`,
        '--vh-title-top': `${sourceTitle?.top ?? 135}px`,
        '--vh-title-width': `${sourceTitle?.width ?? Math.max(1, vw - 40)}px`,
        '--vh-title-height': `${sourceTitle?.height ?? 48}px`,
        '--vh-liquid-top': `${Math.max(0, sourceTop)}px`,
        '--vh-liquid-right': `${sourceRight}px`,
        '--vh-liquid-bottom': `${sourceBottom}px`,
        '--vh-liquid-left': `${Math.max(0, sourceLeft)}px`,
        '--vh-liquid-corner-radius': `${pillRadius}px`,
        '--vh-pill-width': `${pillWidth}px`,
        '--vh-pill-height': `${pillHeight}px`,
        '--vh-pill-left': `${sourceLeft}px`,
        '--vh-pill-top': `${sourceTop}px`,
      }}
      aria-label={`Tabela ligowa — ${leagueName}`}>
      <div className="vh-standings-fullscreen__surface">
      <Standings key={selectedGroup || leagueName} rows={rows} logos={logos} />
      <div className="vh-standings-fullscreen__fade" aria-hidden="true" />
      <header className="vh-standings-fullscreen__header">
        <div className="vh-standings-fullscreen__topline">
          <button ref={backRef} className="vh-standings-fullscreen__back"
            type="button" onClick={exitTable} disabled={phase === 'exit'}>
            <ChevronLeft size={23} strokeWidth={2.1} aria-hidden="true" />
            <span>Wstecz</span>
          </button>
          <span className="vh-standings-fullscreen__section-title-wrap">
            <button ref={pillRef} type="button" className="vh-standings-fullscreen__section-title"
              onClick={exitTable} aria-disabled={phase === 'exit'}
              aria-label="Zamknij tabelę">Tabela</button>
          </span>
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
      {!reducedMotion && phase !== 'active' &&
        <span className="vh-standings-fullscreen__flying-pill" aria-hidden="true">Tabela</span>}
    </section>,
    document.body
  );
}
