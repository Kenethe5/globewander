import { useEffect, useRef, useState } from 'react';
import AppShell from './components/AppShell';
import DestinationDetails from './components/destination/DestinationDetails';
import RecommendationList from './components/destination/RecommendationList';
import TravelGlobe from './components/globe/TravelGlobe';
import PreferencesPanel, { preferenceError } from './components/preferences/PreferencesPanel';
import SearchPanel from './components/search/SearchPanel';
import { api, demoMode } from './services/api';
import { defaultPreferences, type DestinationDetail, type DestinationSummary, type Recommendation, type TravelPreferences } from './types/travel';
import './styles/globe.css';

const initialPreferences: TravelPreferences = { ...defaultPreferences, budget_usd: 1500, duration_days: 5 };

export default function App() {
  const [preferences, setPreferences] = useState<TravelPreferences>(initialPreferences);
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DestinationDetail | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [stale, setStale] = useState(false);
  const [editing, setEditing] = useState(true);
  const [searched, setSearched] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [countryCities, setCountryCities] = useState<DestinationSummary[]>([]);
  const activeRanking = useRef<AbortController | null>(null);
  const rerankTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true); setCatalogError(null);
    api.getDestinations(controller.signal)
      .then(response => { if (!controller.signal.aborted) setDestinations(response.destinations); })
      .catch(cause => { if (!controller.signal.aborted) setCatalogError(message(cause)); })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [catalogRetry]);

  useEffect(() => () => {
    activeRanking.current?.abort();
    if (rerankTimer.current) clearTimeout(rerankTimer.current);
  }, []);

  useEffect(() => {
    if (!selectedDestinationId) { setDetail(null); setDetailError(null); setDetailsLoading(false); return; }
    const controller = new AbortController();
    setDetailsLoading(true); setDetail(null); setDetailError(null);
    api.getDestination(selectedDestinationId, controller.signal)
      .then(city => { if (!controller.signal.aborted) setDetail(city); })
      .catch(cause => { if (!controller.signal.aborted) setDetailError(message(cause)); })
      .finally(() => { if (!controller.signal.aborted) setDetailsLoading(false); });
    return () => controller.abort();
  }, [selectedDestinationId]);

  useEffect(() => {
    if (!searched || preferenceError(preferences)) return;
    if (rerankTimer.current) clearTimeout(rerankTimer.current);
    rerankTimer.current = setTimeout(() => { void rank(preferences, false); }, 300);
    return () => { if (rerankTimer.current) clearTimeout(rerankTimer.current); };
    // Changes made before the first explicit search must not call the backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  async function rank(next: TravelPreferences, explicit: boolean) {
    if (preferenceError(next) || catalogLoading || catalogError) return;
    if (rerankTimer.current) clearTimeout(rerankTimer.current);
    activeRanking.current?.abort();
    const controller = new AbortController(); activeRanking.current = controller;
    setRankingLoading(true); setError(null);
    if (!explicit) setStale(true);
    try {
      const response = await api.getRecommendations(next, controller.signal);
      if (controller.signal.aborted) return;
      setResults(response.results); setSearched(true); setStale(false);
      if (explicit) setEditing(false);
      setSelectedDestinationId(previous => response.results.some(result => result.destination_id === previous)
        ? previous : response.results.find(result => result.eligible)?.destination_id ?? null);
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(message(cause));
        if (explicit) setEditing(true);
      }
    } finally { if (!controller.signal.aborted) setRankingLoading(false); }
  }

  function changePreferences(next: TravelPreferences) {
    activeRanking.current?.abort();
    if (rerankTimer.current) clearTimeout(rerankTimer.current);
    setRankingLoading(false);
    setPreferences(next); setError(null);
    if (searched) setStale(true);
  }
  function selectDestination(id: string) { setSelectedDestinationId(id); setNotice(null); }
  function handleCountryClick(code: string | null, countryName: string) {
    const supported = code ? destinations.filter(city => city.country_code === code) : [];
    setCountryCities(supported);
    if (!supported.length) { setNotice(`${countryName}: Not yet covered. WanderSphere only evaluates curated cities.`); return; }
    setNotice(`${countryName}: ${supported.length} curated ${supported.length === 1 ? 'city' : 'cities'} available.`);
  }

  const selectedRecommendation = results.find(result => result.destination_id === selectedDestinationId) ?? null;
  const budgetSummary = preferences.budget_usd === null ? 'Budget not set' : `$${preferences.budget_usd.toLocaleString()} ${preferences.budget_scope === 'total_trip' ? 'total-trip budget (airfare unverified)' : 'on-site budget'}`;
  const sidebar = editing
    ? <PreferencesPanel preferences={preferences} onChange={changePreferences} onSubmit={() => { void rank(preferences, true); }} submitDisabled={catalogLoading || !!catalogError || rankingLoading} submitLabel={rankingLoading ? 'Ranking…' : error ? 'Retry recommendations' : 'Find destinations'} />
    : <section className="preference-summary" aria-label="Your preferences"><p className="eyebrow">Your trip</p><h2>Ready to explore</h2><p>{budgetSummary} · {preferences.duration_days === null ? 'Length undecided' : `${preferences.duration_days} days`}</p><p>{preferences.climate === 'any' ? 'Any climate' : `${preferences.climate} weather`} · {preferences.travel_month === null ? 'Month undecided' : monthName(preferences.travel_month)} · {preferences.interests.length ? preferences.interests.join(', ') : 'Any interests'}</p>{selectedDestinationId && <p>Selected city: {destinations.find(city => city.id === selectedDestinationId)?.name ?? selectedDestinationId}</p>}<button onClick={() => setEditing(true)}>Edit preferences</button></section>;

  return <AppShell
    notice={<>{demoMode && <aside role="note" className="demo-note"><strong>Development demo mode.</strong> Sample scores are invented. Controls do not recompute sample rankings.</aside>}{catalogLoading && <p role="status" className="banner">Loading curated cities…</p>}{catalogError && <p role="alert" className="banner error">{catalogError} <button onClick={() => setCatalogRetry(value => value + 1)}>Retry cities</button></p>}{notice && <p role="status" className="banner">{notice}</p>}{error && <p role="alert" className="banner error">{error} {searched && <button disabled={!!preferenceError(preferences)} onClick={() => { void rank(preferences, true); }}>Retry ranking</button>}</p>}{error && results.length > 0 && <p role="status" className="banner">Results are from previous preferences.</p>}{searched && stale && !error && <p role="status" className="banner">{preferenceError(preferences) ? 'Previous results retained. Correct invalid preferences to update.' : 'Results are updating for your latest preferences…'}</p>}</>}
    sidebar={<>{sidebar}{!demoMode && <SearchPanel preferences={preferences} onParsed={next => { changePreferences(next); setEditing(true); }} />}{searched && <button className="banner" disabled={!results.some(result => result.eligible)} onClick={() => { const eligible = results.filter(result => result.eligible); const choice = eligible[Math.floor(Math.random() * eligible.length)]; if (choice) selectDestination(choice.destination_id); }}>Surprise Me</button>}</>}
    globe={<><TravelGlobe destinations={destinations} results={results} selectedDestinationId={selectedDestinationId} onSelectDestination={selectDestination} onCountryClick={handleCountryClick} />{countryCities.length > 0 && <section className="banner" aria-label="Supported cities in selected country"><p>Supported cities</p>{countryCities.map(city => <button key={city.id} onClick={() => selectDestination(city.id)}>{city.name}</button>)}</section>}</>}
    results={<RecommendationList destinations={destinations} results={results} selectedDestinationId={selectedDestinationId} onSelect={selectDestination} loading={rankingLoading} searched={searched} />}
    details={<DestinationDetails destination={detail} recommendation={selectedRecommendation} loading={detailsLoading} error={detailError} travelMonth={preferences.travel_month} onClose={() => setSelectedDestinationId(null)} />}
  />;
}

function monthName(month: number): string { return new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month - 1, 1))); }
function message(cause: unknown): string { return cause instanceof Error ? cause.message : 'Something went wrong. Please retry.'; }
