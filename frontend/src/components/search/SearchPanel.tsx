import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import type { TravelPreferences } from '../../types/travel';

export default function SearchPanel({ preferences, onParsed }: { preferences: TravelPreferences; onParsed: (value: TravelPreferences) => void }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => { active.current?.abort(); setLoading(false); }, [preferences]);
  useEffect(() => () => active.current?.abort(), []);
  async function parse() {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setLoading(true); setNotice(null);
    try {
      const response = await api.parsePreferences({ text, current_preferences: preferences }, controller.signal);
      if (controller.signal.aborted) return;
      onParsed(response.preferences);
      setNotice(response.warnings.join(' ') || 'Preferences updated. Review the controls before searching.');
    } catch (error) {
      if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'Parsing unavailable. Use the controls.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }
  return <details className="preference-summary"><summary>Optional: describe your preferences</summary>
    <label htmlFor="preference-text">Travel preferences</label>
    <textarea id="preference-text" maxLength={4000} value={text} onChange={event => { active.current?.abort(); setLoading(false); setText(event.target.value); }} />
    <button onClick={() => void parse()} disabled={loading || !text.trim()}>{loading ? 'Parsing…' : 'Fill preference controls'}</button>
    <p>Optional server parser. The controls work without it.</p>{notice && <p role="status">{notice}</p>}
  </details>;
}
