import React, { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { dateKey, normalizeName } from '../data.js';
import { NOW } from '../dateUtils.js';
import { teamProfileSummary, sortedRoster } from '../teamProfileData.js';
import { MatchGroups } from '../components/MatchCards.jsx';
import TeamLogo from '../components/TeamLogo.jsx';
import './TeamProfile.css';

function Statistic({ value, label }) {
  return <div className="vh-profile-stat">
    <strong>{value}</strong>
    <span>{label}</span>
  </div>;
}

function PlayerCard({ player }) {
  const name = player.full_name || [player.first_name, player.last_name].filter(Boolean).join(' ') || 'Zawodnik';
  const source = /^https:\/\/www\.tauron(?:1)?liga\.pl\/players\/id\/\d+\//.test(player.source_url || '')
    ? player.source_url : null;
  return <article className="vh-profile-player">
    <div className="vh-profile-player__visual">
      {player.photo
        ? <img src={player.photo} alt="" loading="lazy" decoding="async" />
        : <div className="vh-profile-player__placeholder" aria-hidden="true">{String(name).slice(0, 1)}</div>}
      <span className="vh-profile-player__number">{player.number ?? '—'}</span>
    </div>
    <div className="vh-profile-player__copy">
      <strong>{name}</strong>
      {player.position && <span>{player.position}</span>}
      <div className="vh-profile-player__details">
        {player.height_cm != null && <small>{player.height_cm} cm</small>}
        {player.spike_reach_cm != null && <small>Atak {player.spike_reach_cm} cm</small>}
      </div>
      {source && <a href={source} target="_blank" rel="noopener noreferrer"
        aria-label={`Oficjalny profil zawodnika: ${name}`}>
        Profil PLS <ArrowUpRight size={14} aria-hidden="true" />
      </a>}
    </div>
  </article>;
}

const TeamProfile = React.memo(function TeamProfile({
  league, team, matches, logos, favorites, toggleFavorite, onBack,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const profile = useMemo(
    () => teamProfileSummary(matches, league.id, team.name, dateKey(NOW())),
    [matches, league.id, team.name]);
  const roster = useMemo(() => sortedRoster(team.players), [team.players]);
  const isFavorite = favorites.teams.some(name => normalizeName(name) === normalizeName(team.name));
  const crest = team.logo || logos.get(normalizeName(team.name));
  const past = showHistory ? profile.recent : profile.recent.slice(0, 4);
  const next = profile.upcoming.slice(0, 2);

  return <section className="vh-team-profile" aria-label={`Profil drużyny: ${team.name}`}>
    <div className="vh-team-profile__toolbar">
      <button type="button" className="vh-team-profile__back" onClick={onBack}>
        <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" /> Drużyny
      </button>
      <button type="button" className={'vh-team-profile__favorite' + (isFavorite ? ' is-favorite' : '')}
        aria-label={(isFavorite ? 'Usuń z' : 'Dodaj do') + ' ulubionych: ' + team.name}
        aria-pressed={isFavorite} onClick={() => toggleFavorite('teams', team.name)}>
        <Star size={21} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </div>

    <header className="vh-team-profile__hero">
      <p className="vh-team-profile__eyebrow">{league.short} <span>·</span> Drużyna</p>
      <div className="vh-team-profile__crest">
        <TeamLogo name={team.name} logo={crest} />
      </div>
      <h1>{team.name}</h1>
      <span className="vh-team-profile__country">Polska <span aria-hidden="true">🇵🇱</span></span>
    </header>

    <section className="vh-team-profile__section" aria-label="Bilans spotkań">
      <div className="vh-team-profile__section-heading">
        <h2>Bilans</h2><span>Na podstawie zakończonych spotkań z wynikiem</span>
      </div>
      <div className="vh-team-profile__stats">
        <Statistic value={profile.played} label="Mecze" />
        <Statistic value={profile.won} label="Wygrane" />
        <Statistic value={profile.lost} label="Porażki" />
      </div>
    </section>

    <section className="vh-team-profile__section">
      <div className="vh-team-profile__section-heading">
        <h2>Najbliższe mecze</h2><span>{next.length ? 'Terminarz' : 'Brak zaplanowanych spotkań'}</span>
      </div>
      {next.length > 0 &&
        <MatchGroups matches={next} logos={logos} showLeagueHeading={false} showDates />}
    </section>

    <section className="vh-team-profile__section">
      <div className="vh-team-profile__section-heading">
        <h2>Ostatnie wyniki</h2><span>{profile.recent.length} z wynikami</span>
      </div>
      {past.length > 0
        ? <MatchGroups matches={past} logos={logos} showLeagueHeading={false} showDates />
        : <p className="vh-team-profile__empty">Nie ma jeszcze zakończonych meczów z potwierdzonym wynikiem.</p>}
      {profile.recent.length > 4 &&
        <button type="button" className="vh-team-profile__more"
          onClick={() => setShowHistory(value => !value)}>
          {showHistory ? 'Pokaż mniej' : 'Wszystkie wyniki'}
          <ChevronRight size={18} aria-hidden="true" />
        </button>}
    </section>

    <section className="vh-team-profile__section vh-team-profile__roster">
      <div className="vh-team-profile__section-heading">
        <h2>Skład drużyny</h2><span>{roster.length} zawodników</span>
      </div>
      {roster.length > 0
        ? <div className="vh-profile-players">
          {roster.map((player, index) =>
            <PlayerCard key={player.id ? `${player.id}-${index}` : index} player={player} />)}
        </div>
        : <p className="vh-team-profile__empty">Skład drużyny nie został jeszcze udostępniony w danych ligi.</p>}
    </section>
  </section>;
});

export default TeamProfile;
