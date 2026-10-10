import type { DestinationDetail, DestinationsResponse, RecommendationsResponse, ParsePreferencesRequest, ParsePreferencesResponse, TravelPreferences } from '../types/travel';

export const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError'; }
}
export function createApi({ baseUrl = 'http://localhost:8000', demo = false } = {}) {
  async function request<T>(path: string, signal?: AbortSignal, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}/api${path}`, {
        method: body === undefined ? 'GET' : 'POST', signal,
        ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError('Cannot reach the backend. Check that it is running and retry.', 0);
    }
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const detail = payload && typeof payload === 'object' && 'detail' in payload ? payload.detail : null;
      throw new ApiError(typeof detail === 'string' ? detail : `Request failed (${response.status}). Check your input and retry.`, response.status);
    }
    try { return await response.json() as T; }
    catch { throw new ApiError('The backend returned invalid JSON. Please retry.', response.status); }
  }
  async function fixtures(signal?: AbortSignal) {
    signal?.throwIfAborted();
    const [destinations, recommendations, preferences] = await Promise.all([
      import('../../../shared/mock-destinations.json'), import('../../../shared/mock-recommendations.json'), import('../../../shared/mock-preferences.json'),
    ]);
    signal?.throwIfAborted();
    // Shared JSON is deliberately confined to the explicit demo branch.
    return structuredClone({ destinations: destinations.default, recommendations: recommendations.default, preferences: preferences.default }) as {
      destinations: DestinationsResponse; recommendations: RecommendationsResponse; preferences: TravelPreferences;
    };
  }
  return {
    async getDestinations(signal?: AbortSignal): Promise<DestinationsResponse> {
      return demo ? (await fixtures(signal)).destinations : request('/destinations', signal);
    },
    async getDestination(id: string, signal?: AbortSignal): Promise<DestinationDetail> {
      if (!demo) return request(`/destinations/${encodeURIComponent(id)}`, signal);
      const city = (await fixtures(signal)).destinations.destinations.find(city => city.id === id);
      if (!city) throw new ApiError('Destination not found', 404);
      return { ...city, highlights: [], monthly_avg_temp_c: Array<null>(12).fill(null), lodging_per_night_usd: null,
        daily_ex_lodging_usd: null, climate_source_url: null, climate_checked_at: null, cost_note: 'Development fixture: cost and climate data unavailable.' };
    },
    async parsePreferences(input: ParsePreferencesRequest, signal?: AbortSignal): Promise<ParsePreferencesResponse> {
      if (!input.text.trim()) throw new ApiError('Enter your travel preferences.', 422);
      if (!demo) return request('/preferences/parse', signal, input);
      return { preferences: (await fixtures(signal)).preferences, extracted_fields: [],
        warnings: ['Demo: fixed sample preferences loaded; your text was not parsed. Scores are invented fixtures.'] };
    },
    async getRecommendations(preferences: TravelPreferences, signal?: AbortSignal): Promise<RecommendationsResponse> {
      return demo ? (await fixtures(signal)).recommendations : request('/recommendations', signal, preferences);
    },
  };
}
export const api = createApi({ baseUrl: import.meta.env.VITE_API_BASE_URL, demo: demoMode });
