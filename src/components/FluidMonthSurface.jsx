import { useLayoutEffect, useRef } from 'react';
import { monthSurfacePath } from '../monthSurfaceGeometry.js';

const DURATION = 390;

/**
 * One responsive SVG surface morphs from the actual Mecze button to the
 * full-width month panel. Native scrolling of month labels stays independent
 * of the short, bounded path animation (no additional React renders).
 */
export default function FluidMonthSurface() {
  const svgRef = useRef(null);
  const pathRef = useRef(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const path = pathRef.current;
    const root = svg?.parentElement;
    const trigger = root?.querySelector('.vh-segmented button:first-child');
    const panel = root?.querySelector('.vh-month-flow');
    if (!svg || !path || !root || !trigger || !panel) return undefined;

    let progress = 0;
    let raf = 0;
    let startedAt = null;
    let geometry = null;
    const paint = value => {
      progress = value;
      if (geometry) path.setAttribute('d', monthSurfacePath(geometry, value));
    };
    const measure = () => {
      const box = root.getBoundingClientRect();
      const tab = trigger.getBoundingClientRect();
      const content = panel.getBoundingClientRect();
      if (box.width < 1 || tab.width < 1) return;
      geometry = {
        left: tab.left - box.left,
        right: tab.right - box.left,
        top: tab.top - box.top,
        bottom: tab.bottom - box.top,
        width: box.width,
        height: Math.max(content.bottom - box.top, tab.bottom - box.top + 50),
      };
      svg.setAttribute('viewBox', '0 0 ' + geometry.width + ' ' + geometry.height);
      paint(progress);
    };

    measure();
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      paint(1);
    } else {
      const tick = time => {
        if (startedAt === null) startedAt = time;
        const t = Math.min(1, (time - startedAt) / DURATION);
        paint(t * t * (3 - 2 * t));
        if (t < 1) raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
    }

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(root);
    observer?.observe(trigger);
    observer?.observe(panel);
    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, []);

  return <svg ref={svgRef} className="vh-fluid-month-surface" aria-hidden="true"
    focusable="false" preserveAspectRatio="none">
    <path ref={pathRef} fill="#f5f2ed" />
  </svg>;
}
