import { useEffect, useRef, useState } from 'react';
import PreferencesPanel, { preferenceError } from './components/preferences/PreferencesPanel';
import { api, demoMode } from './services/api';
import { defaultPreferences, type DestinationSummary, type Recommendation, type TravelPreferences } from './types/travel';

export default function App() {
  const [preferences, setPreferences] = useState<TravelPreferences>(() => ({ ...defaultPreferences, budget_usd: 1500, duration_days: 5 }));
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [stale, setStale] = useState(false);
  const [editing, setEditing] = useState(true);
  const [searched, setSearched] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoading(true); setCatalogError(null);
    api.getDestinations(controller.signal).then(response => setDestinations(response.destinations))
      .catch((cause: unknown) => { if (!controller.signal.aborted) setCatalogError(message(cause)); })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => () => activeRequest.current?.abort(), []);
  function changePreferences(next: TravelPreferences) {
    activeRequest.current?.abort();
    setRankingLoading(false); setError(null); setStale(true);
    setPreferences(next);
  }
  async function search() {
    if (preferenceError(preferences) || catalogLoading || catalogError || rankingLoading) return;
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;
    setRankingLoading(true); setError(null); setStale(true);
    try {
      const response = await api.getRecommendations(preferences, controller.signal);
      if (controller.signal.aborted) return;
      setResults(response.results); setSearched(true); setStale(false); setEditing(false);
      setSelectedDestinationId(previous => response.results.some(result => result.destination_id === previous)
        ? previous : response.results.find(result => result.eligible)?.destination_id ?? null);
    } catch (cause) { if (!controller.signal.aborted) setError(message(cause)); }
    finally { if (!controller.signal.aborted) { setRankingLoading(false); } }
  }
  const selected = destinations.find(city => city.id === selectedDestinationId);
  return <main>
    <h1>WanderSphere</h1>
    <p>Find curated cities that fit your interests and travel preferences.</p>
    {demoMode && <aside role="note"><strong>Development demo mode</strong> — invented sample scores. Controls do not recompute sample rankings; no live ranking is performed.</aside>}
    {catalogLoading && <p role="status">Loading curated cities…</p>}
    {catalogError && <p role="alert">{catalogError} <button onClick={() => setRetry(value => value + 1)}>Retry cities</button></p>}
    {editing ? <PreferencesPanel preferences={preferences} onChange={changePreferences}
      onSubmit={() => { void search(); }} submitDisabled={catalogLoading || !!catalogError || rankingLoading}
      submitLabel={rankingLoading ? 'Ranking…' : error ? 'Retry recommendations' : 'Find destinations'} />
      : <section className="preference-summary" aria-label="Your preferences">
        <p>{preferences.budget_usd === null ? 'Budget not set' : `$${preferences.budget_usd.toLocaleString()} budget`} · {preferences.budget_scope === 'total_trip' ? 'including flights (unverified)' : 'excluding flights'} · {preferences.duration_days === null ? 'Length undecided' : `${preferences.duration_days} days`}</p>
        <p>{preferences.climate === 'any' ? 'Any climate' : `${preferences.climate} weather`} · {preferences.travel_month === null ? 'Month undecided' : new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, preferences.travel_month - 1, 1)))} · {preferences.interests.length ? preferences.interests.join(', ') : 'Any interests'}</p>
        <button onClick={() => setEditing(true)}>Edit preferences</button>
      </section>}
    {error && <p role="alert">{error} Submit again to retry.</p>}
    {rankingLoading && <p role="status">Updating recommendations…</p>}
    {searched && stale && <p role="status">Results are from previous preferences. Submit your current preferences to update them.</p>}
    <h2>{demoMode ? 'Sample results — dev only' : 'Results'}</h2>
    {!results.length && <p>{searched ? 'No results. Try adjusting your preferences.' : 'Submit preferences to see curated cities.'}</p>}
    {!!results.length && !results.some(result => result.eligible) && <p>No eligible matches. Review the tradeoffs below.</p>}
    <ul>{results.map(result => {
      const city = destinations.find(item => item.id === result.destination_id);
      const cost = result.estimated_onsite_total_usd;
      return <li key={result.destination_id}>
        <button aria-pressed={selectedDestinationId === result.destination_id} onClick={() => setSelectedDestinationId(result.destination_id)}>{city?.name ?? result.destination_id}{city ? `, ${city.country}` : ''}</button>
        <p>{demoMode ? 'Mock score' : 'Match score'}: {result.score ?? 'Not scored'} · {result.eligible ? 'Eligible' : 'Ineligible'} · Budget: {result.budget_status}</p>
        <p>Estimated on-site cost: {cost ? `$${cost.min}–$${cost.max}` : 'Unavailable'}. Airfare is not verified.</p>
        {[...result.reasons, ...result.tradeoffs].map((line, index) => <p key={index}>{line}</p>)}
      </li>;
    })}</ul>
    {selected && <p role="status">Selected city: {selected.name}. Photo: {selected.image_url ? 'Available' : 'Unavailable'}.</p>}
  </main>;
}
function message(cause: unknown): string { return cause instanceof Error ? cause.message : 'Something went wrong. Please retry.'; }
