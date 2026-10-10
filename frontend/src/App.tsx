import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, demoMode } from './services/api';
import { defaultPreferences, type DestinationSummary, type Recommendation } from './types/travel';

export default function App() {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [destinations, setDestinations] = useState<DestinationSummary[]>([]);
  const [results, setResults] = useState<Recommendation[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [text, setText] = useState('Five days in December, $1500 excluding flights, beaches and food, warm weather');
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
  async function search(event: FormEvent) {
    event.preventDefault();
    activeRequest.current?.abort();
    const controller = new AbortController(); activeRequest.current = controller;
    setParseLoading(true); setRankingLoading(false); setError(null);
    try {
      const parsed = await api.parsePreferences({ text, current_preferences: preferences }, controller.signal);
      if (controller.signal.aborted) return;
      setPreferences(parsed.preferences); setWarnings(parsed.warnings);
      setParseLoading(false); setRankingLoading(true);
      const response = await api.getRecommendations(parsed.preferences, controller.signal);
      if (controller.signal.aborted) return;
      setResults(response.results); setSearched(true);
      setSelectedDestinationId(previous => response.results.some(result => result.destination_id === previous)
        ? previous : response.results.find(result => result.eligible)?.destination_id ?? null);
    } catch (cause) { if (!controller.signal.aborted) setError(message(cause)); }
    finally { if (!controller.signal.aborted) { setParseLoading(false); setRankingLoading(false); } }
  }
  const selected = destinations.find(city => city.id === selectedDestinationId);
  return <main>
    <h1>WanderSphere</h1>
    <p>Explore curated cities. Temporary integration UI for AI-01.</p>
    {demoMode && <aside role="note"><strong>Development demo mode</strong> — fixed sample preferences and invented scores. No AI parsing or live ranking; input does not change the fixtures.</aside>}
    {catalogLoading && <p role="status">Loading curated cities…</p>}
    {catalogError && <p role="alert">{catalogError} <button onClick={() => setRetry(value => value + 1)}>Retry cities</button></p>}
    <form onSubmit={search}>
      <label htmlFor="query">Your travel preferences</label>
      <textarea id="query" required value={text} onChange={event => setText(event.target.value)} />
      <button disabled={catalogLoading || !!catalogError || parseLoading || rankingLoading || !text.trim()}>{parseLoading ? 'Parsing…' : rankingLoading ? 'Ranking…' : demoMode ? 'Load sample results' : 'Search'}</button>
    </form>
    {error && <p role="alert">{error} Submit again to retry.</p>}
    <div aria-live="polite">{warnings.map(warning => <p key={warning}>{warning}</p>)}</div>
    <details><summary>Current structured preferences</summary><pre>{JSON.stringify(preferences, null, 2)}</pre></details>
    <h2>{demoMode ? 'Sample results — dev only' : 'Results'}</h2>
    {!results.length && <p>{searched ? 'No results. Try adjusting your preferences.' : 'Submit preferences to see curated cities.'}</p>}
    {!!results.length && !results.some(result => result.eligible) && <p>No eligible matches. Review the tradeoffs below.</p>}
    <ul>{results.map(result => {
      const city = destinations.find(item => item.id === result.destination_id);
      const cost = result.estimated_onsite_total_usd;
      return <li key={result.destination_id}>
        <button aria-pressed={selectedDestinationId === result.destination_id} onClick={() => setSelectedDestinationId(result.destination_id)}>{city?.name ?? result.destination_id}{city ? `, ${city.country}` : ''}</button>
        <p>{demoMode ? 'Mock score' : 'Match score'}: {result.score ?? 'Unavailable'} · {result.eligible ? 'Eligible' : 'Ineligible'} · Budget: {result.budget_status}</p>
        <p>Estimated on-site cost: {cost ? `$${cost.min}–$${cost.max}` : 'Unavailable'}. Airfare is not verified.</p>
        {[...result.reasons, ...result.tradeoffs].map((line, index) => <p key={index}>{line}</p>)}
      </li>;
    })}</ul>
    {selected && <p role="status">Selected city: {selected.name}. Photo: {selected.image_url ? 'Available' : 'Unavailable'}.</p>}
  </main>;
}
function message(cause: unknown): string { return cause instanceof Error ? cause.message : 'Something went wrong. Please retry.'; }
