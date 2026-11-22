import { memo, useState } from 'react';

export default memo(function TeamLogo({ name, logo, className = '' }) {
  const [failedSource, setFailedSource] = useState(null);
  const source = JSON.stringify([name, logo]);
  const initials = String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return <span className={'vh-team-logo ' + className}>
    {logo && failedSource !== source ? <img src={logo} alt="" loading="lazy" onError={() => setFailedSource(source)} /> : <span className="team-mark" aria-hidden="true">{initials || '?'}</span>}
  </span>;
});
