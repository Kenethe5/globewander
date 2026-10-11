import { expect, it } from 'vitest';
import { countryRecommendations, GLOBE_COLORS, scoreColor } from './globeColors';
import cities from '../../../../shared/mock-destinations.json';
import fixture from '../../../../shared/mock-recommendations.json';
import type { DestinationSummary, Recommendation } from '../../types/travel';

it('aggregates eligible city scores by ISO country while preserving unknown and zero scores', () => {
  const city = cities.destinations[0] as DestinationSummary;
  const base = fixture.results[0] as Recommendation;
  const destinations = [city, { ...city, id: 'second' }, { ...city, id: 'third' }];
  const results = [
    { ...base, destination_id: city.id, score: null, eligible: true },
    { ...base, destination_id: 'second', score: 0, eligible: true },
    { ...base, destination_id: 'third', score: 100, eligible: false },
  ];
  expect(countryRecommendations(destinations, results).get(city.country_code)?.destination_id).toBe('second');
  expect(countryRecommendations(destinations, results).has('FRA')).toBe(false);
  expect(scoreColor(null, true)).toBe(GLOBE_COLORS.unscored);
  expect(scoreColor(100, false)).toBe(GLOBE_COLORS.overBudget);
  expect(scoreColor(0, true)).not.toBe(GLOBE_COLORS.unscored);
});
