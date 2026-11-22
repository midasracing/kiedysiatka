import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft } from 'lucide-react';
import Standings from './Standings.jsx';
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
        onBack();
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
  }, [onBack]);

  return createPortal(
    <section className="vh-standings-fullscreen" role="dialog" aria-modal="true"
      aria-label={`Tabela ligowa — ${leagueName}`}>
      <Standings key={selectedGroup || leagueName} rows={rows} logos={logos} />
      <div className="vh-standings-fullscreen__fade" aria-hidden="true" />
      <header className="vh-standings-fullscreen__header">
        <div className="vh-standings-fullscreen__topline">
          <button ref={backRef} className="vh-standings-fullscreen__back"
            type="button" onClick={onBack}>
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
