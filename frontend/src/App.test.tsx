// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./components/globe/TravelGlobe', () => ({ default: ({ onCountryClick }: { onCountryClick: (code: string | null, name: string) => void }) => <div aria-label="Globe rendering boundary"><button onClick={() => onCountryClick('PRT', 'Portugal')}>Portugal polygon</button><button onClick={() => onCountryClick(null, 'Uncovered country')}>Uncovered polygon</button></div> }));
vi.mock('./services/api', async importOriginal => {
  const original = await importOriginal<typeof import('./services/api')>();
  return { ...original, demoMode: true, api: original.createApi({ demo: true }) };
});
import App from './App';
import { api } from './services/api';
import { defaultPreferences } from './types/travel';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const next = (count = 1) => { for (let i = 0; i < count; i++) click('Next'); };
async function submit() {
  await waitFor(() => expect((screen.getByRole('button', { name: 'Find destinations' }) as HTMLButtonElement).disabled).toBe(false));
  click('Find destinations');
  await screen.findByRole('button', { name: 'Edit preferences' });
}
it('shows one question at a time, preserves defaults and submits only at the end without Gemini', async () => {
  const rank = vi.spyOn(api, 'getRecommendations');
  const parse = vi.spyOn(api, 'parsePreferences');
  const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No backend'));
  render(<App />);
  expect((screen.getByLabelText('Budget amount (USD)') as HTMLInputElement).value).toBe('1500');
  expect(screen.queryByLabelText('Number of days')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Find destinations' })).toBeNull();
  next();
  expect((screen.getByLabelText('Number of days') as HTMLInputElement).value).toBe('5');
  next(3);
  expect(screen.getByText('Step 5 of 5')).toBeTruthy();
  expect(rank).not.toHaveBeenCalled();
  await submit();
  expect(rank).toHaveBeenCalledWith({ ...defaultPreferences, budget_usd: 1500, duration_days: 5 }, expect.any(AbortSignal));
  expect(parse).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByText(/Controls do not recompute sample rankings/)).toBeTruthy();
  expect(screen.getAllByText(/Estimated on-site cost: Unavailable/)).toHaveLength(4);
  click('Kyoto, Japan');
  click('Edit preferences');
  next(4);
  await submit();
  expect(screen.getByText(/Selected city: Kyoto/)).toBeTruthy();
});
it('preserves answers through Back and submits custom amounts, month, climate and chips', async () => {
  const rank = vi.spyOn(api, 'getRecommendations');
  render(<App />);
  change('Budget amount (USD)', '12550'); next();
  change('Number of days', '30'); click('Back');
  expect((screen.getByLabelText('Budget amount (USD)') as HTMLInputElement).value).toBe('12550');
  next();
  expect((screen.getByLabelText('Number of days') as HTMLInputElement).value).toBe('30');
  next(); click('Warm'); next(); change('Travel month', '12'); next();
  click('Food'); click('Culture'); click('Food');
  await submit();
  expect(rank).toHaveBeenLastCalledWith({ ...defaultPreferences, budget_usd: 12550, duration_days: 30, climate: 'warm', travel_month: 12, interests: ['culture'] }, expect.any(AbortSignal));
});
it('blocks invalid numbers, accepts sliders and allows optional values to be cleared', async () => {
  const rank = vi.spyOn(api, 'getRecommendations');
  render(<App />);
  change('Budget amount (USD)', '-1');
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
  change('Adjust budget ($100–$10,000)', '2000'); next();
  for (const value of ['0', '31', '1.5']) {
    change('Number of days', value);
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
  }
  change('Adjust trip length (1–30 days)', '1'); next(3); await submit();
  expect(rank).toHaveBeenLastCalledWith(expect.objectContaining({ budget_usd: 2000, duration_days: 1 }), expect.any(AbortSignal));
  click('Edit preferences'); change('Budget amount (USD)', ''); next();
  change('Number of days', ''); next(); click('Cold'); next();
  expect(screen.getByText(/Choose a travel month/)).toBeTruthy();
  next(); await submit();
  expect(rank).toHaveBeenLastCalledWith(expect.objectContaining({ budget_usd: null, duration_days: null, travel_month: null, interests: [] }), expect.any(AbortSignal));
});
it('retains previous results on failure and ignores a response canceled by editing', async () => {
  render(<App />); next(4); await submit();
  click('Edit preferences'); next(4);
  vi.spyOn(api, 'getRecommendations').mockRejectedValueOnce(new Error('Ranking unavailable'));
  click('Find destinations');
  await screen.findByText(/Ranking unavailable/);
  expect(screen.getByRole('button', { name: 'Cancún, Mexico' })).toBeTruthy();
  expect(screen.getByText(/Results are from previous preferences/)).toBeTruthy();
  let finish!: (value: { results: [] }) => void;
  const rank = vi.spyOn(api, 'getRecommendations').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  click('Retry recommendations');
  const signal = rank.mock.calls.at(-1)?.[1];
  click('Culture');
  expect(signal?.aborted).toBe(true);
  await act(async () => { finish({ results: [] }); });
  expect(screen.getByRole('button', { name: 'Cancún, Mexico' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Find destinations' })).toBeTruthy();
});
it('Enter on an early step advances rather than requesting recommendations', () => {
  const rank = vi.spyOn(api, 'getRecommendations');
  render(<App />);
  fireEvent.submit(screen.getByRole('form', { name: "What's your budget?" }));
  expect(screen.getByRole('heading', { name: 'How many days?' })).toBeTruthy();
  expect(rank).not.toHaveBeenCalled();
});

it('allows returning to an invalid later answer after navigating Back', () => {
  render(<App />); next();
  change('Number of days', '31'); click('Back'); next();
  expect(screen.getByRole('heading', { name: 'How many days?' })).toBeTruthy();
  change('Number of days', '5'); next();
  expect(screen.getByRole('heading', { name: 'What weather sounds good?' })).toBeTruthy();
});

it('shows country cities and explicit unsupported-country feedback', async () => {
  render(<App />);
  await waitFor(() => expect((screen.getByRole('button', { name: 'Portugal polygon' }))).toBeTruthy());
  await screen.findByText('Loading curated cities…').catch(() => undefined);
  await waitFor(() => expect(screen.queryByText('Loading curated cities…')).toBeNull());
  click('Portugal polygon');
  click('Lisbon');
  await screen.findByRole('heading', { name: 'Lisbon' });
  click('Uncovered polygon');
  expect(screen.getByText(/Not yet covered/)).toBeTruthy();
});

it('invalidates an old response during debounce and debounces rapid edits without parsing', async () => {
  render(<App />); next(4); await submit();
  click('Edit preferences'); next(4);
  let finish!: (value: { results: [] }) => void;
  const rank = vi.spyOn(api, 'getRecommendations').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const parse = vi.spyOn(api, 'parsePreferences');
  click('Find destinations');
  const oldSignal = rank.mock.calls[0][1];
  click('Food'); click('Culture');
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => { finish({ results: [] }); });
  expect(screen.getByRole('button', { name: 'Kyoto, Japan' })).toBeTruthy();
  expect(rank).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(rank).toHaveBeenCalledTimes(2));
  expect(rank.mock.calls[1][0].interests).toEqual(['food', 'culture']);
  expect(parse).not.toHaveBeenCalled();
});

it('cancels pending updates on explicit submit and unmount and blocks invalid edits', async () => {
  const view = render(<App />); next(4); await submit();
  const rank = vi.spyOn(api, 'getRecommendations');
  click('Edit preferences');
  change('Budget amount (USD)', '-5');
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  expect(rank).not.toHaveBeenCalled();
  change('Budget amount (USD)', '2000'); next(4); await submit();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  expect(rank).toHaveBeenCalledTimes(1);
  click('Edit preferences'); change('Budget amount (USD)', '2500');
  view.unmount();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
  expect(rank).toHaveBeenCalledTimes(1);
});

it('dismisses pending details and ignores their late response', async () => {
  const original = api.getDestination;
  let finish!: (city: Awaited<ReturnType<typeof original>>) => void;
  vi.spyOn(api, 'getDestination').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<App />); next(4); await submit();
  await screen.findByText('Loading city details…');
  click('Close destination details');
  await act(async () => { finish(await original('cancun')); });
  expect(screen.queryByLabelText('Destination details')).toBeNull();
});
