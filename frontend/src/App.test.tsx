// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('./services/api', async importOriginal => {
  const original = await importOriginal<typeof import('./services/api')>();
  return { ...original, demoMode: true, api: original.createApi({ demo: true }) };
});
import App from './App';
afterEach(cleanup);
it('renders clearly labeled fixture results without a backend and selects cities', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No backend'));
  render(<App />);
  expect(screen.getByText('Development demo mode')).toBeTruthy();
  const submit = screen.getByRole('button', { name: 'Load sample results' });
  await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(submit);
  await screen.findByRole('button', { name: 'Cancún, Mexico' });
  expect(screen.getByText(/Selected city: Cancún/)).toBeTruthy();
  expect(screen.getAllByText(/Estimated on-site cost: Unavailable/)).toHaveLength(4);
  expect(screen.getByText(/your text was not parsed/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Kyoto, Japan' }));
  expect(screen.getByText(/Selected city: Kyoto/)).toBeTruthy();
  fireEvent.click(submit);
  await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
  expect(screen.getByText(/Selected city: Kyoto/)).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
