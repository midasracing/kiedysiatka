import './PageStage.css';

// Switch prepared screens immediately. Do not animate or change opacity on
// the entire page: that rasterized long lists and flashed through the dock on
// mobile Safari. The lightweight persistent bottom-nav lens owns motion.
export default function PageStage({ page, direction, reducedMotion, children }) {
  return <div className={'vh-route-stage is-' + direction}>
    <main id="main-content" data-page={page}
      className={'vh-page' + (!reducedMotion ? ' vh-page-enter' : '')}>
      {children}
    </main>
  </div>;
}
