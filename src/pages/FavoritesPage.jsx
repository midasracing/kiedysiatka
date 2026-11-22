import React, { useState } from 'react';

// Intentionally minimal favorites landing screen. Favorite selections remain
// stored globally; this view shows only the two category tabs and their counts.
const FavoritesPage = React.memo(function FavoritesPage({ favorites }) {
  const [tab, setTab] = useState('teams');

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
  </section>;
});

export default FavoritesPage;
