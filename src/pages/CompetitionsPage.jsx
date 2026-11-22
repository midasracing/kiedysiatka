import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Star, WifiOff } from 'lucide-react';
import { LEAGUES } from '../data.js';
import { leagueTimeline } from '../leagueTimeline.js';
import { EmptyState, FeedWarning, LoadingCards, PageHeader } from '../components/UiPrimitives.jsx';
import { MatchGroups } from '../components/MatchCards.jsx';
import FullscreenStandings from '../components/FullscreenStandings.jsx';
import TeamsGrid from '../components/TeamsGrid.jsx';
import LeaguePicker from '../components/LeaguePicker.jsx';

const CompetitionsPage = React.memo(function CompetitionsPage({ active, feeds, matches, loading, errors, refresh, logos, favorites, toggleFavorite, selectedLeague, setSelectedLeague }) {
  const [view, setView] = useState('matches');
  const [group, setGroup] = useState('all');
  const [tableGroup, setTableGroup] = useState(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const previousView = useRef('matches');
  const league = LEAGUES.find(item => item.id === selectedLeague);
  const data = league ? feeds[league.id] : null;
  const grouped = league?.id === 'second' ? (data?.groups || []) : [];
  const groupChoices = group === 'all' ? grouped : grouped.filter(item => item.name === group);
  const openTable = () => {
    previousView.current = view === 'table' ? 'matches' : view;
    setTableGroup(group === 'all' ? (grouped[0]?.name ?? null) : group);
    setView('table');
  };
  const closeTable = useCallback(() => setView(previousView.current), []);
  const currentTableGroup = grouped.find(item => item.name === tableGroup) || grouped[0];
  const tableRows = league?.id === 'second' ? (currentTableGroup?.table || []) : (data?.table || []);
  // Match and result cards share one reverse-chronological timeline.
  const timeline = useMemo(() => leagueTimeline(matches, league?.id, group), [matches, league?.id, group]);
  useEffect(() => setVisibleCount(30), [league?.id, group]);
  const pageMatches = timeline.slice(0, visibleCount);
  return <>
    {active && league && view === 'table' && <FullscreenStandings
      key={league.id}
      leagueName={league.name}
      rows={tableRows}
      logos={logos}
      groups={grouped}
      selectedGroup={currentTableGroup?.name || null}
      onSelectGroup={setTableGroup}
      onBack={closeTable}
    />}
    {league ? <>
      <button className="vh-back" type="button" onClick={() => setSelectedLeague(null)}><ChevronLeft size={18} /> Wszystkie rozgrywki</button>
      <header className="vh-competition-heading">
        <div className="vh-competition-heading__copy">
          <span className="vh-eyebrow">{league.flag || '🇵🇱'} {league.category === 'Europa' ? 'WŁOCHY' : league.category === 'Świat' ? 'JAPONIA' : 'POLSKA'} · MĘŻCZYŹNI</span>
          <h1>{league.name}</h1>
        </div>
        <button type="button" className={'vh-competition-favorite ' + (favorites.leagues.includes(league.name) ? 'is-favorite' : '')}
          aria-label={(favorites.leagues.includes(league.name) ? 'Usuń z' : 'Dodaj do') + ' ulubionych: ' + league.name}
          onClick={() => toggleFavorite('leagues', league.name)}>
          <Star size={21} fill={favorites.leagues.includes(league.name) ? 'currentColor' : 'none'} />
        </button>
      </header>
      <div className="vh-segmented" role="tablist" aria-label="Widok rozgrywek">{[['matches','Mecze'], ['table','Tabela'], ['teams','Drużyny']].map(([id,label]) => <button key={id} role="tab" aria-selected={view === id} className={view === id ? 'selected' : ''} onClick={() => id === 'table' ? openTable() : setView(id)}>{label}</button>)}</div>
      {grouped.length > 0 && <div className="vh-controls"><button type="button" className={'vh-filter-chip ' + (group === 'all' ? 'chosen' : '')} onClick={() => setGroup('all')}>Wszystkie grupy</button>{grouped.map(item => <button key={item.name} type="button" className={'vh-filter-chip ' + (group === item.name ? 'chosen' : '')} onClick={() => setGroup(item.name)}>{item.name}</button>)}</div>}
      <FeedWarning errors={league && errors[league.id] ? { [league.id]: errors[league.id] } : {}} refresh={refresh} />
      {!data && loading ? <LoadingCards /> : !data ? <EmptyState icon={WifiOff} title="Nie udało się pobrać ligi" message="Sprawdź połączenie i spróbuj ponownie." action="Odśwież dane" onAction={refresh} /> : <>
        {view === 'matches' && <>
          <MatchGroups matches={pageMatches} logos={logos} showDates showLeagueHeading={false} emptyMessage="Brak spotkań w pobranych danych tej ligi." />
          {timeline.length > visibleCount && <button type="button" className="vh-match-more"
            onClick={() => setVisibleCount(count => count + 30)}>
            Pokaż starsze mecze <span>{Math.min(30, timeline.length - visibleCount)} z {timeline.length - visibleCount}</span>
          </button>}
        </>}
        {view === 'teams' && <TeamsGrid teams={league.id === 'second' ? groupChoices.flatMap(item => item.teams || []) : data.teams} logos={logos} favorites={favorites} toggleFavorite={toggleFavorite} />}
      </>}
      {data?.updated_at && <p className="vh-source-note">Aktualizacja źródła: {new Date(data.updated_at).toLocaleString('pl-PL')}</p>}
      {view === 'table' && (league.id === 'second' ? groupChoices : [data]).some(item => Object.keys(item?.source_table_discrepancies || {}).length > 0) && <p className="vh-source-note" role="status">Wyniki i tabela VolleyStation są publikowane osobno. Pokazujemy tabelę dokładnie według źródła.</p>}
    </> : <>
      <PageHeader title="Rozgrywki" subtitle="Przesuń palcem i wybierz ligę." />
      <LeaguePicker leagues={LEAGUES} active={active} />
    </>}
  </>;
});
export default CompetitionsPage;
