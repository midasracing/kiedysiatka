import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './StartupEntrance.css';

const LOGO = import.meta.env.BASE_URL + 'kiedy-siatka-logo.svg?v=5';

// One unchanged SVG travels from the opening composition into the real header.
// Only transforms and opacity animate; feed loading never gates the entrance.
export default function StartupEntrance({ enabled, onComplete }) {
  const copy = useRef(null);
  const [revealing, setRevealing] = useState(false);
  useEffect(() => {
    if (!enabled || document.hidden) { onComplete(); return undefined; }
    let disposed = false;
    const timers = [], animations = [];
    const brand = document.querySelector('.vh-brand-signature');
    const originalOpacity = brand?.style.opacity || '';
    if (brand) brand.style.opacity = '0';
    const restoreBrand = () => { if (brand) brand.style.opacity = originalOpacity; };
    const later = (callback, delay) => timers.push(window.setTimeout(callback, delay));
    const finish = () => { if (!disposed) onComplete(); };
    const animate = (element, frames, options) => {
      if (!element?.animate) return null;
      const animation = element.animate(frames, { fill: 'both', easing: 'cubic-bezier(.16,1,.3,1)', ...options });
      animations.push(animation);
      return animation;
    };
    later(() => {
      if (disposed) return;
      const logo = copy.current;
      const target = brand?.querySelector('img')?.getBoundingClientRect();
      const start = logo?.getBoundingClientRect();
      const page = document.querySelector('.vh-tab-panel:not([hidden])');
      // Read geometry before freezing the logo's layout and starting effects.
      const elements = [
        page?.querySelector('.vh-section-heading, .vh-page-head'),
        page?.querySelector('.im-league'),
        ...Array.from(page?.querySelectorAll('.vh-match') || []).filter(card => {
          const box = card.getBoundingClientRect();
          return box.top < window.innerHeight + 40 && box.bottom > 0;
        }).slice(0, 4),
      ].filter(Boolean);
      setRevealing(true);
      if (logo && target?.width > 0 && start?.width > 0) {
        // Preserve the centered layout and fly with transforms alone. Changing
        // left/top/width here forces layout exactly when the flight starts.
        const flight = animate(logo, [
          { transform: 'translate3d(-50%,-60%,0) translate3d(0,0,0) scale(1)' },
          { transform: `translate3d(-50%,-60%,0) translate3d(${target.left - start.left}px,${target.top - start.top}px,0) scale(${target.width / start.width})` },
        ], { duration: 900, easing: 'cubic-bezier(.76,0,.24,1)' });
        if (flight) flight.finished.then(() => {
          if (disposed) return;
          restoreBrand();
          logo.style.visibility = 'hidden';
        }).catch(() => {});
        else restoreBrand();
      } else {
        animate(logo, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 });
        restoreBrand();
      }
      elements.forEach((element, index) => animate(element, [
        { opacity: 0, transform: 'translate3d(0,28px,0)' },
        { opacity: 1, transform: 'translate3d(0,0,0)' },
      ], { duration: 550, delay: 100 + index * 55 }));
      animate(document.querySelector('.vh-bottom'), [{ opacity: 0 }, { opacity: 1 }], { duration: 480, delay: 180 });
    }, 1100);
    later(finish, 2500);
    const onVisibility = () => { if (document.hidden) finish(); };
    const viewportWidth = window.innerWidth;
    const onResize = () => { if (window.innerWidth !== viewportWidth) finish(); };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('keydown', finish);
    window.addEventListener('resize', onResize);
    return () => {
      disposed = true;
      timers.forEach(window.clearTimeout);
      animations.forEach(animation => animation.cancel());
      restoreBrand();
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keydown', finish);
      window.removeEventListener('resize', onResize);
    };
  }, [enabled, onComplete]);
  if (!enabled) return null;
  return createPortal(<div className={'vh-startup-intro' + (revealing ? ' is-revealing' : '')}>
    <div className="vh-startup-backdrop" aria-hidden="true">
      {/* Geometry and tracks match motion/entrance/scene.rml, without a JS renderer. */}
      <svg className="vh-startup-planes" viewBox="0 0 600 1000" preserveAspectRatio="none" focusable="false">
        <g className="vh-startup-plane vh-startup-plane--deep">
          <rect x="-260" y="-750" width="520" height="1500" transform="rotate(-13.750987083)" fill="#750001" />
        </g>
        <g className="vh-startup-plane vh-startup-plane--red">
          <rect x="-190" y="-750" width="380" height="1500" transform="rotate(-13.750987083)" fill="#fc0001" />
        </g>
      </svg>
    </div>
    <div ref={copy} className="vh-startup-copy" aria-hidden="true">
      <img className="vh-startup-logo" src={LOGO} width="1180" height="655" alt="" draggable={false} fetchPriority="high" />
    </div>
  </div>, document.body);
}
