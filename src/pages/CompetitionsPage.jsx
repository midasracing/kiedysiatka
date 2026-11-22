import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ChevronLeft, ChevronRight, Star, WifiOff } from 'lucide-react';
import { LEAGUES, dateKey } from '../data.js';
import { leagueTimeline } from '../leagueTimeline.js';
import { leagueRounds, recommendedRoundNumber } from '../leagueRounds.js';
import { NOW } from '../dateUtils.js';
import { EmptyState, FeedWarning, LoadingCards } from '../components/UiPrimitives.jsx';
import { MatchGroups } from '../components/MatchCards.jsx';
import FullscreenStandings from '../components/FullscreenStandings.jsx';
import TeamsGrid from '../components/TeamsGrid.jsx';
import TeamProfile from './TeamProfile.jsx';
import { sameName } from '../nameUtils.js';
import LeaguePicker from '../components/LeaguePicker.jsx';
import LeagueSplitTransition from '../components/LeagueSplitTransition.jsx';

const canMorphTeam = () => typeof document !== 'undefined'
  && typeof document.startViewTransition === 'function'
  && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const CompetitionsPage = React.memo(function CompetitionsPage({ active, feeds, matches, loading, errors, refresh, logos, favorites, toggleFavorite, selectedLeague, setSelectedLeague }) {
  const [view, setView] = useState('matches');
  const [group, setGroup] = useState('all');
  const [roundOverride, setRoundOverride] = useState(null);
  const [tableGroup, setTableGroup] = useState(null);
  const [tableOrigin, setTableOrigin] = useState(null);
  const [selectedTeamName, setSelectedTeamName] = useState(null);
  const [returningTeamName, setReturningTeamName] = useState(null);
  const lastOpenedTeamName = useRef(null);
  const teamTransitionBusy = useRef(false);
  const teamListScroll = useRef(0);
  const restoreTeamScroll = useRef(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const previousView = useRef('matches');
  const [pickerIndex, setPickerIndex] = useState(0);
  const [split, setSplit] = useState(null);
  const splitSnapshot = useRef(null);
  const transitionBusy = useRef(false);
  const leagueTitleRef = useRef(null);

  const openFromPicker = useCallback((item, snapshot) => {
    if (!active || transitionBusy.current || !snapshot || !item) return;
    transitionBusy.current = true;
    const captured = { ...snapshot, id: item.id };
    splitSnapshot.current = captured;
    setPickerIndex(snapshot.index);
    setView('matches');
    setGroup('all');
    setRoundOverride(null);
    setTableGroup(null);
    setSelectedTeamName(null);
    setVisibleCount(30);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSelectedLeague(item.id);
    setSplit({ phase: 'open', snapshot: captured });
  }, [active, setSelectedLeague]);

  const returnToPicker = useCallback(() => {
    if (transitionBusy.current) return;
    setSelectedTeamName(null);
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
  const supportsTeamProfiles = league?.id === 'men' || league?.id === 'first';
  const selectedTeam = supportsTeamProfiles && selectedTeamName
    ? data?.teams?.find(team => sameName(team.name, selectedTeamName)) : null;
  // Only transform the selected crest/name during navigation. The remaining
  // club rows use native scrolling, with no per-scroll React work or canvas.
  const openTeamProfile = useCallback((team, source) => {
    if (!team?.name || teamTransitionBusy.current) return;
    teamListScroll.current = window.scrollY;
    restoreTeamScroll.current = false;
    lastOpenedTeamName.current = team.name;
    const label = source?.querySelector('.vh-club-wall__name');
    const logo = source?.querySelector('.vh-club-wall__crest');
    if (canMorphTeam() && label && logo) {
      teamTransitionBusy.current = true;
      label.style.viewTransitionName = 'vh-club-name';
      logo.style.viewTransitionName = 'vh-club-logo';
      try {
        const transition = document.startViewTransition(() => {
          flushSync(() => setSelectedTeamName(team.name));
        });
        transition.finished.catch(() => {}).finally(() => {
          teamTransitionBusy.current = false;
        });
      } catch {
        teamTransitionBusy.current = false;
        setSelectedTeamName(team.name);
      }
      return;
    }
    setSelectedTeamName(team.name);
  }, []);

  const closeTeamProfile = useCallback(() => {
    if (teamTransitionBusy.current) return;
    restoreTeamScroll.current = true;
    if (canMorphTeam() && lastOpenedTeamName.current) {
      teamTransitionBusy.current = true;
      try {
        const transition = document.startViewTransition(() => {
          flushSync(() => {
            setReturningTeamName(lastOpenedTeamName.current);
            setSelectedTeamName(null);
          });
        });
        transition.finished.catch(() => {}).finally(() => {
          teamTransitionBusy.current = false;
          setReturningTeamName(null);
        });
      } catch {
        teamTransitionBusy.current = false;
        setReturningTeamName(null);
        setSelectedTeamName(null);
      }
      return;
    }
    setSelectedTeamName(null);
  }, []);
  useLayoutEffect(() => {
    if (selectedTeamName) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (restoreTeamScroll.current) {
      restoreTeamScroll.current = false;
      window.scrollTo({ top: teamListScroll.current, behavior: 'instant' });
    }
  }, [selectedTeamName]);
  const grouped = league?.id === 'second' ? (data?.groups || []) : [];
  const groupChoices = group === 'all' ? grouped : grouped.filter(item => item.name === group);
  const openTable = () => {
    if (view === 'table') return;
    // Preserve one stationary title while the black standings sheet slides up.
    const titleNode = leagueTitleRef.current;
    const titleRect = titleNode?.getBoundingClientRect();
    const titleCss = titleNode && window.getComputedStyle(titleNode);
    const title = titleRect && titleCss ? {
      left: titleRect.left,
      top: titleRect.top,
      width: titleRect.width,
      height: titleRect.height,
      fontSize: titleCss.fontSize,
      fontFamily: titleCss.fontFamily,
      fontWeight: titleCss.fontWeight,
      lineHeight: titleCss.lineHeight,
      letterSpacing: titleCss.letterSpacing,
    } : null;
    setTableOrigin({ title });
    previousView.current = view;
    setTableGroup(group === 'all' ? (grouped[0]?.name ?? null) : group);
    setView('table');
  };
  const closeTable = useCallback(() => {
    setView(previousView.current);
    setTableOrigin(null);
  }, []);
  const currentTableGroup = grouped.find(item => item.name === tableGroup) || grouped[0];
  const tableRows = league?.id === 'second' ? (currentTableGroup?.table || []) : (data?.table || []);
  // Keep the outgoing screen alive behind the portal. The liquid cover opens
  // directly from its "Tabela" tab and reverses without rebuilding the cards.
  const underlayView = view === 'table' ? previousView.current : view;
  // Match and result cards share one reverse-chronological timeline.
  const timeline = useMemo(() => leagueTimeline(matches, league?.id, group), [matches, league?.id, group]);
  const { rounds, reliable: roundsReliable } = useMemo(() => leagueRounds(timeline), [timeline]);
  const scope = (league?.id || '') + ':' + group;
  const manualNumber = roundOverride?.scope === scope ? roundOverride.number : null;
  const recommendedNumber = recommendedRoundNumber(rounds, dateKey(NOW()));
  const selectedRoundNumber = rounds.some(item => item.number === manualNumber)
    ? manualNumber : recommendedNumber;
  const roundIndex = rounds.findIndex(item => item.number === selectedRoundNumber);
  const selectedRound = roundIndex < 0 ? null : rounds[roundIndex];
  const pageMatches = roundsReliable ? (selectedRound?.matches || []) : timeline.slice(0, visibleCount);
  const goRound = delta => {
    const next = rounds[roundIndex + delta];
    if (next) setRoundOverride({ scope, number: next.number });
  };
  useEffect(() => setVisibleCount(30), [league?.id, group]);
  // Preserve the selector's Impact letterforms while fitting the league name
  // into one uppercase line. Font-size changes uniformly, never scaleX.
  useLayoutEffect(() => {
    const title = leagueTitleRef.current;
    const holder = title?.parentElement;
    if (!title || !holder) return undefined;
    let frame = 0;
    let disposed = false;
    let fittedWidth = -1;
    const fitTitle = () => {
      frame = 0;
      if (disposed) return;
      const MAX_SIZE = 72;
      fittedWidth = holder.clientWidth;
      title.style.fontSize = `${MAX_SIZE}px`;
      const naturalWidth = title.getBoundingClientRect().width;
      const available = Math.max(1, fittedWidth - 2);
      if (!naturalWidth) return;
      const fitted = Math.min(MAX_SIZE, MAX_SIZE * available / naturalWidth);
      title.style.fontSize = `${Math.max(16, fitted)}px`;
    };
    fitTitle();
    const queueFit = () => {
      if (!disposed && !frame) frame = requestAnimationFrame(fitTitle);
    };
    const observer = new ResizeObserver(() => {
      // Fitting changes the holder's height. Only its available width needs
      // a new fit, and font writes must run outside ResizeObserver delivery.
      if (holder.clientWidth !== fittedWidth) queueFit();
    });
    observer.observe(holder);
    document.fonts?.ready?.then(queueFit);
    return () => {
      disposed = true;
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [selectedLeague, selectedTeamName]);
  return <>
    {active && split && <LeagueSplitTransition
      phase={split.phase} snapshot={split.snapshot} onComplete={finishSplit}
    />}
    {active && league && view === 'table' && !selectedTeamName && <FullscreenStandings
      key={league.id}
      leagueName={league.name}
      rows={tableRows}
      logos={logos}
      groups={grouped}
      selectedGroup={currentTableGroup?.name || null}
      onSelectGroup={setTableGroup}
      onBack={closeTable}
      origin={tableOrigin}
    />}
    {league && selectedTeam ? <TeamProfile
      key={league.id + ':' + selectedTeam.name}
      league={league} team={selectedTeam} matches={matches} standings={data?.table}
      logos={logos} favorites={favorites} toggleFavorite={toggleFavorite}
      onBack={closeTeamProfile}
    /> : league ? <section className={'vh-competition-detail' + (split?.phase === 'open' ? ' is-entering' : '') + (view === 'table' ? ' is-liquid-table-open' : '')}>
      <div className="vh-competition-toolbar">
        <button className="vh-back" type="button" onClick={returnToPicker}>
          <ChevronLeft size={23} strokeWidth={2.1} aria-hidden="true" />
          <span>Wstecz</span>
        </button>
        <button type="button"
          className={'vh-competition-favorite ' + (favorites.leagues.includes(league.name) ? 'is-favorite' : '')}
          aria-label={(favorites.leagues.includes(league.name) ? 'Usuń z' : 'Dodaj do') + ' ulubionych: ' + league.name}
          aria-pressed={favorites.leagues.includes(league.name)}
          onClick={() => toggleFavorite('leagues', league.name)}>
          <Star size={23} strokeWidth={2.1} aria-hidden="true"
            fill={favorites.leagues.includes(league.name) ? 'currentColor' : 'none'} />
        </button>
      </div>
      <header className="vh-competition-heading">
        <div className="vh-competition-heading__copy">
          <h1 ref={leagueTitleRef}>{league.name}</h1>
        </div>
      </header>
      <div className="vh-league-view-tabs">
        <div className="vh-segmented" role="tablist" aria-label="Widok rozgrywek">
          {[
            ['matches', 'Mecze'],
            ['table', 'Tabela'],
            ['teams', 'Drużyny'],
          ].map(([id, label]) => <button key={id} role="tab" aria-selected={view === id}
            className={(view === id ? 'selected' : '') + (id === 'table' ? ' vh-table-tab' : '')}
            onClick={() => id === 'table' ? openTable() : setView(id)}>{id === 'table'
              ? <span className="vh-table-tab__label">{label}</span>
              : label}</button>)}
        </div>
      </div>
      {grouped.length > 0 && <div className="vh-controls">
        <button type="button" className={'vh-filter-chip ' + (group === 'all' ? 'chosen' : '')}
          onClick={() => { setGroup('all'); setRoundOverride(null); }}>Wszystkie grupy</button>
        {grouped.map(item => <button key={item.name} type="button"
          className={'vh-filter-chip ' + (group === item.name ? 'chosen' : '')}
          onClick={() => { setGroup(item.name); setRoundOverride(null); }}>{item.name}</button>)}
      </div>}
      {underlayView === 'matches' && timeline.length > 0 && (
        <div className="vh-round-selector" role="group" aria-label="Nawigacja po kolejkach">
          <h2 className="vh-round-selector__heading">
            {roundsReliable ? <>Kolejka <span key={selectedRoundNumber} className="vh-round-selector__number">{selectedRoundNumber}</span></> : 'Terminarz'}
          </h2>
          <div className="vh-round-selector__arrows">
            <button type="button" aria-label="Poprzednia kolejka"
              title="Poprzednia kolejka" disabled={roundIndex <= 0}
              onClick={() => goRound(-1)}><ChevronLeft size={24} strokeWidth={1.9}/></button>
            <button type="button" aria-label="Następna kolejka"
              title="Następna kolejka" disabled={roundIndex < 0 || roundIndex >= rounds.length - 1}
              onClick={() => goRound(1)}><ChevronRight size={24} strokeWidth={1.9}/></button>
          </div>
        </div>
      )}
      {underlayView === 'matches' && timeline.length > 0 && !roundsReliable && (
        <p className="vh-round-selector__note">Źródło nie udostępnia wiarygodnych numerów kolejek dla tej ligi.</p>
      )}
      <FeedWarning errors={league && errors[league.id] ? { [league.id]: errors[league.id] } : {}} refresh={refresh} />
      {!data && loading ? <LoadingCards /> : !data ? <EmptyState icon={WifiOff} title="Nie udało się pobrać ligi" message="Sprawdź połączenie i spróbuj ponownie." action="Odśwież dane" onAction={refresh} /> : <>
        {underlayView === 'matches' && <>
          <MatchGroups matches={pageMatches} logos={logos} showDates showLeagueHeading={false} emptyMessage="Brak spotkań w pobranych danych tej ligi." />
          {!roundsReliable && timeline.length > visibleCount && <button type="button" className="vh-match-more"
            onClick={() => setVisibleCount(count => count + 30)}>
            Pokaż starsze mecze <span>{Math.min(30, timeline.length - visibleCount)} z {timeline.length - visibleCount}</span>
          </button>}
        </>}
        {underlayView === 'teams' && <TeamsGrid
          variant="wall"
          morphTeam={returningTeamName}
          teams={league.id === 'second' ? groupChoices.flatMap(item => item.teams || []) : data.teams}
          logos={logos} favorites={favorites} toggleFavorite={toggleFavorite}
          onOpenTeam={supportsTeamProfiles ? openTeamProfile : undefined}
        />}
      </>}
      {data?.updated_at && underlayView !== 'teams' && <p className="vh-source-note">Aktualizacja źródła: {new Date(data.updated_at).toLocaleString('pl-PL')}</p>}
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
