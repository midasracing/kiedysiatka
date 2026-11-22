import React, { useState } from 'react';
import { ChevronRight, Heart, Trophy } from 'lucide-react';
import { LEAGUES } from '../data.js';
import { sameName } from '../nameUtils.js';
import TeamsGrid from '../components/TeamsGrid.jsx';

// Keep the minimal favorites header and two-tab switcher. Only saved
// selections appear below: no discovery lists, search, or empty-state cards.
const FavoritesPage = React.memo(function FavoritesPage({
  teams, logos, favorites, toggleFavorite, onOpenLeague,
}) {
  const [tab, setTab] = useState('teams');
  const savedTeams = favorites.teams.map(name =>
    teams.find(team => sameName(team.name, name)) || { name });
  const savedLeagues = favorites.leagues;

  return <section className="vh-favorites-screen" aria-label="Ulubione">
    <header className="vh-favorites-heading">
      <h1>Ulubione</h1>
    </header>
    <div className="vh-segmented vh-favorites-tabs" role="tablist" aria-label="Rodzaj ulubionych">
      <button type="button" role="tab" aria-selected={tab === 'teams'}
        className={tab === 'teams' ? 'selected' : ''}
        onClick={() => setTab('teams')}>
        Drużyny <span>{favorites.teams.length}</span>
      </button>
      <button type="button" role="tab" aria-selected={tab === 'leagues'}
        className={tab === 'leagues' ? 'selected' : ''}
        onClick={() => setTab('leagues')}>
        Rozgrywki <span>{favorites.leagues.length}</span>
      </button>
    </div>

    {tab === 'teams' && savedTeams.length > 0 &&
      <div className="vh-favorites-saved" role="tabpanel" aria-label="Polubione drużyny">
        <TeamsGrid teams={savedTeams} logos={logos} favorites={favorites}
          toggleFavorite={toggleFavorite} />
      </div>}

    {tab === 'leagues' && savedLeagues.length > 0 &&
      <div className="vh-favorites-saved" role="tabpanel" aria-label="Polubione rozgrywki">
        <div className="vh-league-stack">
          {savedLeagues.map(name => {
            const league = LEAGUES.find(item => sameName(item.name, name));
            return <div className="vh-league-tile vh-league-select" key={name}>
              <button className="vh-league-main" type="button" disabled={!league}
                onClick={() => league && onOpenLeague(league.id)}>
                <span className="vh-league-number"><Trophy size={19} /></span>
                <span><strong>{name}</strong><small>{league ? 'Otwórz rozgrywki' : 'Liga niedostępna'}</small></span>
                {league && <ChevronRight size={18} />}
              </button>
              <button className="vh-star-button is-favorite" type="button"
                aria-label={'Usuń z ulubionych: ' + name}
                onClick={() => toggleFavorite('leagues', name)}>
                <Heart size={20} fill="currentColor" />
              </button>
            </div>;
          })}
        </div>
      </div>}
  </section>;
});

export default FavoritesPage;
