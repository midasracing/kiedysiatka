import { ChevronRight, Star } from 'lucide-react';
import { normalizeName } from '../data.js';
import { sameName } from '../nameUtils.js';
import TeamLogo from './TeamLogo.jsx';
import { EmptyState } from './UiPrimitives.jsx';
import './TeamsGrid.css';

export default function TeamsGrid({
  teams = [], logos, favorites, toggleFavorite, onOpenTeam, variant = 'tiles', morphTeam = null,
}) {
  if (!teams.length) return <EmptyState title="Brak listy drużyn"
    message="Lista zespołów nie jest jeszcze dostępna w oficjalnym źródle." />;

  // The competition roster uses huge type and unframed logos. Favorites keep
  // their compact tiles; neither layout needs a scroll-driven React render.
  if (variant === 'wall') {
    return <div className="vh-club-wall" aria-label="Drużyny">
      {teams.map((team, index) => {
        const favorite = favorites.teams.some(name => sameName(name, team.name));
        const logo = team.logo || logos.get(normalizeName(team.name));
        const returnTarget = morphTeam && sameName(team.name, morphTeam);
        // Bogdanka's almost-black emblem needs a dark-background print variant.
        // A solid one-colour rendering is cleaner than a glow or grey tile.
        const darkCrest = /bogdanka/i.test(team.name);
        const identity = <>
          <span className={'vh-club-wall__crest' + (darkCrest ? ' is-dark-crest' : '')}
            style={returnTarget ? { viewTransitionName: 'vh-club-logo' } : undefined}>
            <TeamLogo name={team.name} logo={logo} className="vh-club-wall__logo" />
          </span>
          <strong className="vh-club-wall__name"
            style={returnTarget ? { viewTransitionName: 'vh-club-name' } : undefined}>{team.name}</strong>
        </>;
        return <article key={team.id || team.name + index}
          className={'vh-club-wall__row' + (onOpenTeam ? ' is-openable' : '')}>
          {onOpenTeam ? <button type="button" className="vh-club-wall__open"
            aria-label={'Otwórz profil drużyny: ' + team.name}
            onClick={event => onOpenTeam(team, event.currentTarget)}>
            {identity}
          </button> : <div className="vh-club-wall__open">{identity}</div>}
          <button type="button" className={'vh-club-wall__star' + (favorite ? ' is-favorite' : '')}
            aria-label={(favorite ? 'Usuń z' : 'Dodaj do') + ' ulubionych: ' + team.name}
            aria-pressed={favorite} onClick={() => toggleFavorite('teams', team.name)}>
            <Star size={22} strokeWidth={1.9} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        </article>;
      })}
    </div>;
  }

  return <div className="vh-team-grid">{teams.map((team, index) => {
    const favorite = favorites.teams.some(name => sameName(name, team.name));
    const logo = team.logo || logos.get(normalizeName(team.name));
    return <article className={'vh-team-tile' + (onOpenTeam ? ' is-openable' : '')}
      key={team.id || team.name + index}>
      {onOpenTeam ? <button type="button" className="vh-team-tile__open"
        aria-label={'Otwórz profil drużyny: ' + team.name}
        onClick={() => onOpenTeam(team)}>
        <TeamLogo name={team.name} logo={logo} />
        <strong>{team.name}</strong>
        <span className="vh-team-tile__hint">Profil <ChevronRight size={15} aria-hidden="true" /></span>
      </button> : <>
        <TeamLogo name={team.name} logo={logo} />
        <strong>{team.name}</strong>
      </>}
      <button type="button"
        aria-label={(favorite ? 'Usuń z' : 'Dodaj do') + ' ulubionych: ' + team.name}
        aria-pressed={favorite}
        onClick={() => toggleFavorite('teams', team.name)}
        className={favorite ? 'is-favorite' : ''}>
        <Star size={19} fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </article>;
  })}</div>;
}
