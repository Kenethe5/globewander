import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ClimatePreference, Interest, TravelPreferences } from '../../types/travel';

const climates: ClimatePreference[] = ['any', 'cold', 'mild', 'warm'];
const interests: Interest[] = ['food', 'culture', 'beaches', 'nature', 'nightlife', 'adventure'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const label = (value: string) => value[0].toUpperCase() + value.slice(1);
export function preferenceError(preferences: TravelPreferences): string | null {
  const { budget_usd: budget, duration_days: days } = preferences;
  if (budget !== null && (!Number.isFinite(budget) || budget <= 0)) return 'Enter a positive budget or leave it blank.';
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 30)) return 'Trip length must be a whole number from 1 to 30 days, or blank.';
  return null;
}

export default function PreferencesPanel({ preferences, onChange, onSubmit, submitDisabled, submitLabel }: {
  preferences: TravelPreferences;
  onChange: (preferences: TravelPreferences) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel: string;
}) {
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const questions = ["What's your budget?", 'How many days?', 'What weather sounds good?', 'When would you go?', 'What do you enjoy?'];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity() || error) return;
    if (step < 4) setStep(step + 1);
    else if (!submitDisabled) onSubmit();
  }
  const update = (patch: Partial<TravelPreferences>) => onChange({ ...preferences, ...patch });
  const error = preferenceError(step === 4 ? preferences : {
    ...preferences,
    budget_usd: step === 0 ? preferences.budget_usd : null,
    duration_days: step === 1 ? preferences.duration_days : null,
  });
  return <form className="preference-wizard" onSubmit={submit} aria-labelledby="preferences-heading">
    <p className="step-count">Step {step + 1} of 5</p>
    <progress value={step + 1} max={5} aria-label="Preference progress" />
    <h2 id="preferences-heading" ref={heading} tabIndex={-1}>{questions[step]}</h2>
    {step === 0 && <fieldset>
      <legend>{preferences.budget_scope === 'total_trip' ? 'Total trip budget (USD, including flights)' : 'On-site trip budget (USD, excluding flights)'}</legend>
      <label htmlFor="budget">Budget amount (USD)</label>
      <input id="budget" type="number" min="0" step="any" value={preferences.budget_usd ?? ''} placeholder="No budget set" onChange={event => update({ budget_usd: event.target.value === '' ? null : event.target.valueAsNumber })} />
      <label htmlFor="budget-slider">Adjust budget ($100–$10,000)</label>
      <input id="budget-slider" type="range" min="100" max="10000" step="100" value={Math.min(10000, Math.max(100, preferences.budget_usd ?? 100))} aria-valuetext={preferences.budget_usd === null ? 'No budget set; move slider to set a budget' : `$${preferences.budget_usd}; numeric input holds the exact budget`} onChange={event => update({ budget_usd: event.target.valueAsNumber })} />
      <p>{preferences.budget_usd === null ? 'No budget set.' : `Budget: $${preferences.budget_usd.toLocaleString()}.`} Custom amounts outside the slider range are accepted in the number field.</p>
      <button type="button" onClick={() => update({ budget_usd: null })}>Clear budget</button>
    </fieldset>}
    {step === 1 && <fieldset>
      <legend>Trip length</legend>
      <label htmlFor="days">Number of days</label>
      <input id="days" type="number" min="1" max="30" step="1" value={preferences.duration_days ?? ''} placeholder="Not sure" onChange={event => update({ duration_days: event.target.value === '' ? null : event.target.valueAsNumber })} />
      <label htmlFor="days-slider">Adjust trip length (1–30 days)</label>
      <input id="days-slider" type="range" min="1" max="30" step="1" value={preferences.duration_days ?? 1} aria-valuetext={preferences.duration_days === null ? 'Not sure; move slider to set trip length' : `${preferences.duration_days} days`} onChange={event => update({ duration_days: event.target.valueAsNumber })} />
      <p>{preferences.duration_days === null ? 'Trip length: Not sure.' : `Trip length: ${preferences.duration_days} days.`}</p>
      <button type="button" onClick={() => update({ duration_days: null })}>Clear trip length</button>
    </fieldset>}
    {step === 2 && <fieldset><legend>Preferred climate</legend><div className="choices">
      {climates.map(climate => <button type="button" key={climate} aria-pressed={preferences.climate === climate} onClick={() => update({ climate })}>{label(climate)}</button>)}
    </div></fieldset>}
    {step === 3 && <div className="month-step">
    <label htmlFor="month">Travel month</label>
    <select id="month" value={preferences.travel_month ?? ''} onChange={event => update({ travel_month: event.target.value === '' ? null : Number(event.target.value) })}>
      <option value="">Not sure</option>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
    </select>
    {preferences.climate !== 'any' && preferences.travel_month === null && <p>Choose a travel month to include climate in your matches.</p>}
    </div>}
    {step === 4 && <fieldset><legend>Interests — choose any</legend><div className="choices">
      {interests.map(interest => <button type="button" key={interest} aria-pressed={preferences.interests.includes(interest)} onClick={() => update({ interests: preferences.interests.includes(interest) ? preferences.interests.filter(item => item !== interest) : [...preferences.interests, interest] })}>{label(interest)}</button>)}
    </div></fieldset>}
    {step < 2 && <p className="hint">Budget and trip length affect affordability only when verified on-site costs are available. Unknown costs stay unknown; airfare is not verified.</p>}
    {preferences.budget_scope === 'total_trip' && <p>We can't verify affordability without flight prices.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="wizard-actions">
      {step > 0 && <button type="button" onClick={() => setStep(step - 1)}>Back</button>}
      <button type="submit" disabled={!!error || (step === 4 && submitDisabled)}>{step < 4 ? 'Next' : submitLabel}</button>
    </div>
  </form>;
}
