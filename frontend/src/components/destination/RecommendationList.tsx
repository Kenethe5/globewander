import type { DestinationSummary, Recommendation } from '../../types/travel';
import { scoreColor } from '../globe/globeColors';

interface RecommendationListProps {
  results: Recommendation[];
  destinations: DestinationSummary[];
  selectedDestinationId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  searched?: boolean;
}

export default function RecommendationList({ results, destinations, selectedDestinationId, onSelect, loading, searched }: RecommendationListProps) {
  const lookup = new Map(destinations.map(city => [city.id, city]));
  const ordered = [...results].sort((a, b) => Number(b.eligible) - Number(a.eligible) || (b.score ?? -1) - (a.score ?? -1));
  if (!ordered.length) return <section className="recommendation-list empty-results"><h2>Destinations</h2><p>{searched ? 'No destinations were returned. Adjust your preferences and retry.' : 'Choose your preferences to see curated city matches.'}</p></section>;
  return <section className="recommendation-list">
    <div className="section-heading"><div><p className="eyebrow">Curated results</p><h2>Destinations</h2></div>{loading && <span className="updating">Updating…</span>}</div>
    {ordered.every(result => !result.eligible) && <p>No eligible matches. These cities exceed a verified constraint; adjust your budget.</p>}
    {ordered.every(result => result.score === null) && <p>Not scored: choose interests or a climate and travel month. Unknown costs cannot produce an affordability score.</p>}
    <div className="cards">
      {ordered.map(result => {
        const city = lookup.get(result.destination_id);
        if (!city) return null;
        const selected = selectedDestinationId === city.id;
        return <button className={`destination-card ${selected ? 'selected' : ''} ${!result.eligible ? 'ineligible' : ''}`} key={city.id} onClick={() => onSelect(city.id)} aria-label={`${city.name}, ${city.country}`} aria-pressed={selected}>
          <span className="score-chip" style={{ background: scoreColor(result.score, result.eligible) }}>{result.score === null ? '—' : Math.round(result.score)}</span>
          <span className="card-copy"><strong>{city.name}</strong><small>{city.country}</small><em>{{ unverified: 'Estimated on-site cost: Unavailable', over: 'Budget below planning interval', within: 'Planning interval fits budget', uncertain: 'Budget overlaps planning interval', not_applicable: 'Budget not assessed' }[result.budget_status]}</em><span>{result.reasons[0] ?? result.tradeoffs[0] ?? 'No scored components yet.'}</span></span>
        </button>;
      })}
    </div>
  </section>;
}
