import React, { useMemo, useRef, useState } from 'react';
import { LEAGUES, dateKey, feedDateKey } from '../data.js';
import DateStrip from '../components/DateStrip.jsx';
import { useAnimatedDate } from '../components/ScheduleMotion.jsx';
import { FeedWarning, LoadingCards } from '../components/UiPrimitives.jsx';
import { MatchGroups } from '../components/MatchCards.jsx';
import { isFeedStale } from '../feedUpdates.js';

const MatchesPage = React.memo(function MatchesPage({ feeds, matches, loading, errors, refresh, logos, selectedDate, setSelectedDate, leagueFilter, setLeagueFilter }) {
  const resultsRef = useRef(null);
  const displayedDate = useAnimatedDate(selectedDate, resultsRef);
  const [groupFilter, setGroupFilter] = useState('all');
  const all = useMemo(() => leagueFilter ? matches.filter(match => match.leagueId === leagueFilter) : matches, [matches, leagueFilter]);
  const groups = [...new Set(all.filter(match => match.leagueId === 'second').map(match => match.group).filter(Boolean))];
  const filtered = all.filter(match => feedDateKey(match.date) === dateKey(displayedDate) && (groupFilter === 'all' || match.leagueId !== 'second' || match.group === groupFilter));
  const sourceDates = LEAGUES.filter(league => ['second', 'pomorska'].includes(league.id) && filtered.some(match => match.leagueId === league.id) && feeds[league.id]?.updated_at);
  const updateLeague = id => { setLeagueFilter(id); setGroupFilter('all'); };
  return <>
    <DateStrip selected={selectedDate} onSelect={setSelectedDate} />
    <div className="vh-controls">
      <button type="button" className={'vh-filter-chip ' + (!leagueFilter ? 'chosen' : '')} onClick={() => updateLeague(null)}>Wszystkie ligi</button>
      {LEAGUES.map(league => <button className={'vh-filter-chip ' + (leagueFilter === league.id ? 'chosen' : '')} type="button" key={league.id} onClick={() => updateLeague(league.id)}>{league.short}</button>)}
    </div>
    {leagueFilter === 'second' && <div className="vh-controls vh-secondary-filters"><button className={'vh-filter-chip ' + (groupFilter === 'all' ? 'chosen' : '')} onClick={() => setGroupFilter('all')}>Wszystkie grupy</button>{groups.map(group => <button key={group} className={'vh-filter-chip ' + (groupFilter === group ? 'chosen' : '')} onClick={() => setGroupFilter(group)}>{group}</button>)}</div>}
    <FeedWarning errors={errors} refresh={refresh} />
    <div className="vh-day-results" ref={resultsRef} data-day={dateKey(displayedDate)} aria-busy={dateKey(displayedDate) !== dateKey(selectedDate)}>
    {loading && !Object.keys(feeds).length ? <LoadingCards /> : <MatchGroups matches={filtered} logos={logos} emptyMessage="Nie znaleziono meczów na wybrany dzień. Przesuń kalendarz lub wybierz inną ligę." />}
    </div>
    {sourceDates.map(league => <p key={league.id} className="vh-source-note" role={isFeedStale(feeds[league.id]) ? 'status' : undefined}>
      {league.short}: ostatni odczyt {new Date(feeds[league.id].updated_at).toLocaleString('pl-PL')}.
      {isFeedStale(feeds[league.id]) && ' Dane nie były odświeżane od ponad doby; część wyników może być nieaktualna.'}
    </p>)}
    <p className="vh-source-note">Dane pochodzą z oficjalnych źródeł rozgrywek. Aplikacja automatycznie sprawdza dostępność nowych danych.</p>
  </>;
});
export default MatchesPage;
