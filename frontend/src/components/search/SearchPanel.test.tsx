// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import SearchPanel from './SearchPanel';
import { api } from '../../services/api';
import { defaultPreferences } from '../../types/travel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('populates controls only after explicit parsing and preserves them on failure', async () => {
  const parsed = vi.fn();
  const parse = vi.spyOn(api, 'parsePreferences').mockRejectedValue(new Error('Parser unavailable'));
  render(<SearchPanel preferences={defaultPreferences} onParsed={parsed} />);
  expect(parse).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Travel preferences'), { target: { value: 'warm food trip' } });
  fireEvent.click(screen.getByText('Fill preference controls'));
  await screen.findByText('Parser unavailable');
  expect(parsed).not.toHaveBeenCalled();
  parse.mockResolvedValueOnce({ preferences: { ...defaultPreferences, climate: 'warm' }, extracted_fields: ['climate'], warnings: ['Review climate'] });
  fireEvent.click(screen.getByText('Fill preference controls'));
  await screen.findByText('Review climate');
  expect(parsed).toHaveBeenCalledWith({ ...defaultPreferences, climate: 'warm' });
});

it('does not overwrite controls with a parse response after preferences change', async () => {
  const parsed = vi.fn();
  let resolve!: (value: Awaited<ReturnType<typeof api.parsePreferences>>) => void;
  const parse = vi.spyOn(api, 'parsePreferences').mockImplementationOnce(() => new Promise(finish => { resolve = finish; }));
  const view = render(<SearchPanel preferences={defaultPreferences} onParsed={parsed} />);
  fireEvent.change(screen.getByLabelText('Travel preferences'), { target: { value: 'warm' } });
  fireEvent.click(screen.getByText('Fill preference controls'));
  view.rerender(<SearchPanel preferences={{ ...defaultPreferences, climate: 'cold' }} onParsed={parsed} />);
  expect(parse.mock.calls[0][1]?.aborted).toBe(true);
  await act(async () => resolve({ preferences: { ...defaultPreferences, climate: 'warm' }, extracted_fields: ['climate'], warnings: [] }));
  expect(parsed).not.toHaveBeenCalled();
});
