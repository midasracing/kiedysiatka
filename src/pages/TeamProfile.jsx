import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { dateKey, feedDateKey, fromKey, isLive, normalizeName } from '../data.js';
import { NOW } from '../dateUtils.js';
import { teamProfileSummary, rosterByPosition, teamStanding, teamOpponentPreview } from '../teamProfileData.js';
import TeamLogo from '../components/TeamLogo.jsx';
import './TeamProfile.css';

function shortFixtureDate(match) {
  const date = fromKey(feedDateKey(match?.date));
  return date ? date.toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: '2-digit',
  }).replace(/\./g, '') : '—';
}

function FixtureSnapshot({ title, match, opponent, logos, upcoming = false }) {
  return <div className="vh-team-snapshot__fixture">
    <div className="vh-team-snapshot__fixture-heading">
      <span>{upcoming && isLive(match) ? 'Trwający mecz' : title}</span>
      <time dateTime={match ? feedDateKey(match.date) : undefined}>
        {shortFixtureDate(match)}
      </time>
    </div>
    {opponent ? <div className="vh-team-snapshot__fixture-content">
      <div className="vh-team-snapshot__opponent">
        <TeamLogo name={opponent.opponent}
          logo={opponent.opponentLogo || logos.get(normalizeName(opponent.opponent))} />
        <strong>{opponent.opponent}</strong>
      </div>
      {upcoming ? <div className="vh-team-snapshot__kickoff">
        {isLive(match) ? <span className="vh-team-snapshot__live">LIVE</span>
          : <span>{match.time || '—:—'}</span>}
      </div> : opponent.ourSets != null ? <div className="vh-team-snapshot__result"
        aria-label={`Wynik: ${opponent.ourSets} do ${opponent.theirSets}, ${opponent.won ? 'wygrana' : 'porażka'}`}>
        <span className="vh-team-snapshot__set">{opponent.ourSets}</span>
        <span className="vh-team-snapshot__colon">:</span>
        <span className="vh-team-snapshot__set">{opponent.theirSets}</span>
        <span className={'vh-team-snapshot__outcome ' + (opponent.won ? 'is-win' : 'is-loss')}>
          {opponent.won ? 'W' : 'P'}
        </span>
      </div> : null}
    </div> : <p className="vh-team-snapshot__no-match">
      {upcoming ? 'Brak zaplanowanych meczów' : 'Brak zakończonych spotkań'}
    </p>}
  </div>;
}

function PlayerCard({ player, teamName, teamLogo }) {
  const name = player.full_name || [player.first_name, player.last_name].filter(Boolean).join(' ') || 'Zawodnik';
  const officialProfile = /^https:\/\/www\.tauron(?:1)?liga\.pl\/players\/id\/\d+\//.test(player.source_url || '')
    ? player.source_url : null;
  // The league feeds currently provide height, weight and spike reach.
  // Block reach is shown only when it actually exists in a future feed.
  const stats = [
    { label: 'Wzrost', value: player.height_cm, unit: 'cm' },
    { label: 'Waga', value: player.weight_kg, unit: 'kg' },
    { label: 'Zasięg bloku', value: player.block_reach_cm, unit: 'cm' },
    { label: 'Zasięg ataku', value: player.spike_reach_cm, unit: 'cm' },
  ].filter(stat => stat.value != null && stat.value !== '');

  const identity = <>
    <div className="vh-profile-player__visual">
      {player.photo
        ? <img src={player.photo} alt="" loading="lazy" decoding="async" />
        : <div className="vh-profile-player__placeholder" aria-hidden="true">{String(name).slice(0, 1)}</div>}
    </div>
    <div className="vh-profile-player__copy">
      <strong>{name}</strong>
      <div className="vh-profile-player__identity-meta">
        <TeamLogo name={teamName} logo={teamLogo} />
        <span>{player.number != null ? '#' + player.number : '—'}{player.position ? ' · ' + player.position : ''}</span>
      </div>
    </div>
    {officialProfile && <ChevronRight className="vh-profile-player__chevron" size={21} strokeWidth={2.1} aria-hidden="true" />}
  </>;

  return <article className="vh-profile-player">
    {officialProfile ? <a className="vh-profile-player__top" href={officialProfile}
      target="_blank" rel="noopener noreferrer"
      aria-label={'Otwórz oficjalny profil zawodnika: ' + name}>
      {identity}
    </a> : <div className="vh-profile-player__top">{identity}</div>}
    {stats.length > 0 && <div className="vh-profile-player__stats"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map(stat => <div className="vh-profile-player__stat" key={stat.label}>
        <strong>{stat.value}</strong>
        <span>{stat.label} <small>{stat.unit}</small></span>
      </div>)}
    </div>}
  </article>;
}

// Balance the official team name across the two lines beside its crest.
function splitTeamName(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [words.join(' '), ''];
  let split = 1;
  let difference = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const first = words.slice(0, i).join(' ');
    const second = words.slice(i).join(' ');
    const score = Math.abs(first.length - second.length);
    if (score < difference) {
      difference = score;
      split = i;
    }
  }
  return [words.slice(0, split).join(' '), words.slice(split).join(' ')];
}

const TeamProfile = React.memo(function TeamProfile({
  league, team, matches, standings, logos, favorites, toggleFavorite, onBack,
}) {
  const nameRef = useRef(null);
  const profile = useMemo(
    () => teamProfileSummary(matches, league.id, team.name, dateKey(NOW())),
    [matches, league.id, team.name]);
  const rosterGroups = useMemo(() => rosterByPosition(team.players), [team.players]);
  const rosterCount = rosterGroups.reduce((count, group) => count + group.players.length, 0);
  const [nameLineOne, nameLineTwo] = useMemo(() => splitTeamName(team.name), [team.name]);
  const isFavorite = favorites.teams.some(name => normalizeName(name) === normalizeName(team.name));
  const crest = team.logo || logos.get(normalizeName(team.name));
  const standingsRow = useMemo(() => teamStanding(standings, team.name), [standings, team.name]);
  const previousMatch = profile.recent[0] || null;
  const followingMatch = profile.upcoming[0] || null;
  const previousOpponent = teamOpponentPreview(previousMatch, team.name);
  const followingOpponent = teamOpponentPreview(followingMatch, team.name);
  // Keep the league-picker font on exactly two lines, fitting to available width.
  useLayoutEffect(() => {
    const title = nameRef.current;
    const container = title?.parentElement;
    if (!title || !container) return undefined;
    let frame = 0;
    let disposed = false;
    const fit = () => {
      frame = 0;
      if (disposed) return;
      const baseSize = 40;
      title.style.fontSize = `${baseSize}px`;
      const widest = Math.max(1, ...Array.from(title.children, line => line.scrollWidth));
      const available = Math.max(1, container.clientWidth - 2);
      title.style.fontSize = `${Math.min(baseSize, Math.max(14, baseSize * available / widest))}px`;
    };
    const onResize = () => {
      if (!frame) frame = requestAnimationFrame(fit);
    };
    fit();
    const observer = new ResizeObserver(onResize);
    observer.observe(container);
    document.fonts?.ready?.then(onResize);
    return () => {
      disposed = true;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [team.name]);

  return <section className="vh-team-profile" aria-label={`Profil drużyny: ${team.name}`}>
    <div className="vh-team-profile__toolbar">
      <button type="button" className="vh-team-profile__back" onClick={onBack}>
        <ChevronLeft size={23} strokeWidth={2.1} aria-hidden="true" />
        <span>Wstecz</span>
      </button>
      <button type="button" className={'vh-team-profile__favorite' + (isFavorite ? ' is-favorite' : '')}
        aria-label={(isFavorite ? 'Usuń z' : 'Dodaj do') + ' ulubionych: ' + team.name}
        aria-pressed={isFavorite} onClick={() => toggleFavorite('teams', team.name)}>
        <Star size={23} strokeWidth={2.1} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </div>

    <header className="vh-team-profile__hero">
      <div className="vh-team-profile__identity">
        <div className="vh-team-profile__crest">
          <TeamLogo name={team.name} logo={crest} />
        </div>
        <div className="vh-team-profile__identity-copy">
          <h1 ref={nameRef} title={team.name}>
            <span>{nameLineOne}</span>
            {nameLineTwo && <span>{nameLineTwo}</span>}
          </h1>
        </div>
      </div>
    </header>

    <section className="vh-team-snapshot" aria-label="Pozycja, punkty i najbliższe spotkania">
      <div className="vh-team-snapshot__metrics">
        <div className="vh-team-snapshot__metric">
          <span>Pozycja</span><strong>{standingsRow?.position ?? '—'}</strong>
        </div>
        <div className="vh-team-snapshot__metric">
          <span>Punkty</span><strong>{standingsRow?.points ?? '—'}</strong>
        </div>
      </div>
      <div className="vh-team-snapshot__fixtures">
        <FixtureSnapshot title="Poprzedni mecz" match={previousMatch}
          opponent={previousOpponent} logos={logos} />
        <div className="vh-team-snapshot__divider" aria-hidden="true" />
        <FixtureSnapshot title="Kolejny mecz" match={followingMatch}
          opponent={followingOpponent} logos={logos} upcoming />
      </div>
    </section>

    <section className="vh-team-profile__section vh-team-profile__roster">
      <div className="vh-team-profile__section-heading">
        <h2>Skład drużyny</h2><span>{rosterCount} zawodników</span>
      </div>
      {rosterGroups.length > 0
        ? <div className="vh-profile-roster-groups">
          {rosterGroups.map(group => <section className="vh-profile-position" key={group.position}
            aria-label={group.position}>
            <h3>{group.position}</h3>
            <div className="vh-profile-players">
              {group.players.map((player, index) =>
                <PlayerCard key={player.id ? `${player.id}-${index}` : index}
                  player={player} teamName={team.name} teamLogo={crest} />)}
            </div>
          </section>)}
        </div>
        : <p className="vh-team-profile__empty">Skład drużyny nie został jeszcze udostępniony w danych ligi.</p>}
    </section>
  </section>;
});

export default TeamProfile;
