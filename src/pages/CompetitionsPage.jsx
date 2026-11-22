import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Star, WifiOff } from 'lucide-react';
import { LEAGUES } from '../data.js';
import { leagueTimeline } from '../leagueTimeline.js';
import { EmptyState, FeedWarning, LoadingCards } from '../components/UiPrimitives.jsx';
import { MatchGroups } from '../components/MatchCards.jsx';
import FullscreenStandings from '../components/FullscreenStandings.jsx';
import TeamsGrid from '../components/TeamsGrid.jsx';
import LeaguePicker from '../components/LeaguePicker.jsx';
import LeagueSplitTransition from '../components/LeagueSplitTransition.jsx';

const CompetitionsPage = React.memo(function CompetitionsPage({ active, feeds, matches, loading, errors, refresh, logos, favorites, toggleFavorite, selectedLeague, setSelectedLeague }) {
  const [view, setView] = useState('matches');
  const [group, setGroup] = useState('all');
  const [tableGroup, setTableGroup] = useState(null);
  const [visibleCount, setVisibleCount] = useState(30);
  const previousView = useRef('matches');
  const [pickerIndex, setPickerIndex] = useState(2);
  const [split, setSplit] = useState(null);
  const splitSnapshot = useRef(null);
  const transitionBusy = useRef(false);

  const openFromPicker = useCallback((item, snapshot) => {
    if (!active || transitionBusy.current || !snapshot || !item) return;
    transitionBusy.current = true;
    const captured = { ...snapshot, id: item.id };
    splitSnapshot.current = captured;
    setPickerIndex(snapshot.index);
    setView('matches');
    setGroup('all');
    setTableGroup(null);
    setVisibleCount(30);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSelectedLeague(item.id);
    setSplit({ phase: 'open', snapshot: captured });
  }, [active, setSelectedLeague]);

  const returnToPicker = useCallback(() => {
    if (transitionBusy.current) return;
    const captured = splitSnapshot.current;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!captured || captured.id !== selectedLeague || !active || reduced) {
      const index = LEAGUES.findIndex(item => item.id === selectedLeague);
      if (index >= 0) setPickerIndex(index);
      window.scrollTo({ top: 0, behavior: 'instant' });
      setSelectedLeague(null);
      setView('matches');
      return;
    }
    transitionBusy.current = true;
    setSplit({ phase: 'close', snapshot: captured });
  }, [active, selectedLeague, setSelectedLeague]);

  const finishSplit = useCallback(phase => {
    if (phase === 'close') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setSelectedLeague(null);
      setView('matches');
    }
    transitionBusy.current = false;
    setSplit(null);
  }, [setSelectedLeague]);
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
    {active && split && <LeagueSplitTransition
      phase={split.phase} snapshot={split.snapshot} onComplete={finishSplit}
    />}
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
    {league ? <section className={'vh-competition-detail' + (split?.phase === 'open' ? ' is-entering' : '')}>
      <button className="vh-back" type="button" onClick={returnToPicker}><ChevronLeft size={18} /> Wszystkie rozgrywki</button>
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
    </section> : <section className="vh-competitions-screen">
      <header className="vh-competitions-topfade">
        <h1>Rozgrywki</h1>
      </header>
      <LeaguePicker leagues={LEAGUES} active={active}
        initialIndex={pickerIndex} onSelectionChange={setPickerIndex} onOpen={openFromPicker}
      />
    </section>}
  </>;
});
export default CompetitionsPage;
