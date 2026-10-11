import type { DestinationSummary, Recommendation } from '../../types/travel';

export const GLOBE_COLORS = {
  neutral: 'rgba(89, 111, 136, 0.52)',
  unsupported: 'rgba(63, 77, 96, 0.38)',
  unscored: '#98a8b9',
  overBudget: '#856f72',
  selected: '#fff3a6',
} as const;

export function scoreColor(score: number | null, eligible: boolean): string {
  if (!eligible) return GLOBE_COLORS.overBudget;
  if (score === null) return GLOBE_COLORS.unscored;
  if (score >= 80) return '#f6c453';
  if (score >= 60) return '#aab96b';
  if (score >= 40) return '#5e9a8b';
  return '#237f8f';
}

export function resultById(results: Recommendation[]): Map<string, Recommendation> {
  return new Map(results.map(result => [result.destination_id, result]));
}

export function countryRecommendations(destinations: DestinationSummary[], results: Recommendation[]): Map<string, Recommendation> {
  const byId = resultById(results);
  const aggregate = new Map<string, Recommendation>();
  for (const city of destinations) {
    const result = byId.get(city.id);
    if (!result?.eligible) continue;
    const current = aggregate.get(city.country_code);
    if (!current || (result.score ?? -1) > (current.score ?? -1)) aggregate.set(city.country_code, result);
  }
  return aggregate;
}
