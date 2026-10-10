import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './api';
import { defaultPreferences } from '../types/travel';

afterEach(() => vi.unstubAllGlobals());
describe('API-01 contract and explicit demo boundary', () => {
  it('loads shared demo fixtures without network calls, preserving unknown costs', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const api = createApi({ demo: true });
    const cities = await api.getDestinations();
    const parsed = await api.parsePreferences({ text: 'example', current_preferences: defaultPreferences });
    const ranked = await api.getRecommendations(parsed.preferences);
    expect(parsed.warnings.join()).toContain('not parsed');
    expect(ranked.results[0].destination_id).toBe('cancun');
    expect(ranked.results.every(result => cities.destinations.some(city => city.id === result.destination_id))).toBe(true);
    expect(ranked.results[0].estimated_onsite_total_usd).toBeNull();
    expect((await api.getDestination('cancun')).lodging_per_night_usd).toBeNull();
    await expect(api.getDestination('unknown')).rejects.toMatchObject({ status: 404 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends exact endpoint containers and forwards cancellation', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response('{"results":[]}')));
    vi.stubGlobal('fetch', fetch);
    const api = createApi({ baseUrl: 'http://localhost:8000/' });
    const controller = new AbortController();
    await api.getRecommendations(defaultPreferences, controller.signal);
    expect(fetch).toHaveBeenLastCalledWith('http://localhost:8000/api/recommendations', expect.objectContaining({
      method: 'POST', signal: controller.signal, body: JSON.stringify(defaultPreferences),
    }));
    const input = { text: 'warm', current_preferences: defaultPreferences };
    await api.parsePreferences(input);
    expect(fetch).toHaveBeenLastCalledWith('http://localhost:8000/api/preferences/parse', expect.objectContaining({ body: JSON.stringify(input) }));
    await api.getDestination('a/b');
    expect(fetch).toHaveBeenLastCalledWith('http://localhost:8000/api/destinations/a%2Fb', expect.objectContaining({ method: 'GET' }));
  });
  it('surfaces HTTP and network failures without returning demo rankings', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"detail":"Parser unavailable"}', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const api = createApi();
    await expect(api.getRecommendations(defaultPreferences)).rejects.toMatchObject({ status: 503, message: 'Parser unavailable' });
    fetch.mockResolvedValue(new Response('{"detail":[{"msg":"invalid"}]}', { status: 422 }));
    await expect(api.getDestinations()).rejects.toMatchObject({ status: 422 });
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.getDestinations()).rejects.toMatchObject({ status: 0 });
  });
  it('rejects empty queries and aborted demo requests', async () => {
    const api = createApi({ demo: true });
    await expect(api.parsePreferences({ text: ' ', current_preferences: defaultPreferences })).rejects.toMatchObject({ status: 422 });
    const controller = new AbortController(); controller.abort();
    await expect(api.getDestinations(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
