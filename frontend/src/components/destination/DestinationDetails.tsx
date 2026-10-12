import type { DestinationDetail, PriceRange, Recommendation } from '../../types/travel';
import photoCredits from '../../data/photo-credits.json';

function source(url: string | null, date: string | null) {
  return url ? <p><a href={url} target="_blank" rel="noreferrer">Source</a> · {date ? `Checked ${date}` : 'Check date unavailable'}</p> : <p>Source unavailable.</p>;
}

function cost(label: string, range: PriceRange | null) {
  if (!range?.source_url || !range.checked_at) return <p>{label}: Unavailable</p>;
  return <div><p>{label}: ${range.min.toLocaleString()}–${range.max.toLocaleString()}</p>{source(range.source_url, range.checked_at)}</div>;
}

interface DestinationDetailsProps {
  destination: DestinationDetail | null;
  recommendation: Recommendation | null;
  loading: boolean;
  error: string | null;
  travelMonth?: number | null;
  onClose: () => void;
}

export default function DestinationDetails({ destination, recommendation, loading, error, travelMonth, onClose }: DestinationDetailsProps) {
  if (!destination && !loading && !error) return null;
  const temperature = destination && travelMonth ? destination.monthly_avg_temp_c[travelMonth - 1] : null;
  const photo = destination?.image_url ? photoCredits[destination.id as keyof typeof photoCredits] : undefined;
  return <aside className="details-drawer" aria-label="Destination details" aria-live="polite">
    <button className="close-details" onClick={onClose} aria-label="Close destination details">×</button>
    {loading && <p>Loading city details…</p>}
    {error && <p role="alert">{error}</p>}
    {destination && <>
      {destination.image_url ? <img src={destination.image_url} alt={`${destination.name}, ${destination.country}`} /> : <div className="photo-placeholder">No sourced photo available</div>}
      {photo && <p className="photo-credit">Photo: <a href={photo.source_url} target="_blank" rel="noreferrer">{photo.author}</a> · <a href={photo.license_url ?? photo.source_url} target="_blank" rel="noreferrer">{photo.license}</a>. {photo.changes}</p>}
      <p className="eyebrow">Selected destination</p><h2>{destination.name}</h2><p className="country-name">{destination.country}</p>
      {recommendation && <p className="detail-score">{recommendation.score === null ? 'Not scored yet' : `${Math.round(recommendation.score)}% suitability`} · {recommendation.eligible ? 'Eligible' : 'Ineligible'}</p>}
      <h3>Highlights</h3><ul>{destination.highlights.length ? destination.highlights.map(item => <li key={item}>{item}</li>) : <li>Highlights are unavailable.</li>}</ul>
      <h3>Typical climate</h3><p>{!travelMonth ? 'Choose a travel month to see the typical historical temperature.' : temperature == null || !destination.climate_source_url ? 'Historical temperature is unavailable for this month.' : `${temperature}°C historical average in ${new Intl.DateTimeFormat('en', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, travelMonth - 1, 1)))}. Historical average, not a forecast.`}</p>
      {source(destination.climate_source_url, destination.climate_checked_at)}
      {cost('Lodging per night', destination.lodging_per_night_usd)}
      {cost('Daily food, local transport and activities (excluding lodging)', destination.daily_ex_lodging_usd)}
      {recommendation?.estimated_onsite_total_usd && <p>Estimated on-site total: ${recommendation.estimated_onsite_total_usd.min.toLocaleString()}–${recommendation.estimated_onsite_total_usd.max.toLocaleString()}</p>}
      <h3>Cost assumptions</h3><p>{destination.cost_note ?? 'No verified on-site cost estimate is available. Airfare is not verified.'}</p>
      {recommendation && <><h3>Score breakdown</h3><dl>{Object.entries(recommendation.breakdown).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value === null ? 'Not scored' : `${value}/100`}</dd></div>)}</dl><h3>Reasons and tradeoffs</h3><ul>{[...recommendation.reasons, ...recommendation.tradeoffs].map((text, index) => <li key={`${index}-${text}`}>{text}</li>)}</ul></>}
    </>}
  </aside>;
}
