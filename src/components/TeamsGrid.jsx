import { ChevronRight, Star } from 'lucide-react';
import { normalizeName } from '../data.js';
import { sameName } from '../nameUtils.js';
import TeamLogo from './TeamLogo.jsx';
import { EmptyState } from './UiPrimitives.jsx';

export default function TeamsGrid({ teams = [], logos, favorites, toggleFavorite, onOpenTeam }) {
  if (!teams.length) return <EmptyState title="Brak listy drużyn"
    message="Lista zespołów nie jest jeszcze dostępna w oficjalnym źródle." />;

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
