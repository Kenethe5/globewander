# Engineer 3 — Preference Controls, What If?, Integration, Deployment

**Mission:** Connect structured travel preferences directly to deterministic recommendations and the globe. Ship a working MVP before adding Gemini or natural-language input. Own app state, preference controls, the API client, and integration; do not rewrite globe or scoring internals.

**Before starting:** Read `../README.md`, `../AGENTS.md`, `../docs/API-CONTRACT.md`, and `../TASKS.md`.

## Scope decision

The MVP flow is **controls → recommendations → globe/results → What If?**. No parser, Gemini key, or AI service is required. Keep the existing `TravelPreferences` schema and ranking weights unchanged. `/api/preferences/parse` remains a future contract, not an MVP dependency. Keep this filename and AI ticket IDs for existing links; AI-02 now covers controls, and Gemini moves to AI-07.

## My assigned ticket checklist

- [x] **AI-01** — TypeScript contract, API client, and app state (existing foundation)
- [ ] **AI-02** — Structured preference controls and direct ranking
- [ ] **AI-03** — Globe, results, and details integration
- [ ] **AI-04** — Debounced What If? updates and request reliability
- [ ] **AI-05** — Deployment and demo verification
- [ ] **AI-06** — Optional differentiators, after MVP
- [ ] **AI-07** — Gemini natural-language parsing, after MVP

Keep this checklist synchronized with `../TASKS.md`. For every implementation handoff record outcome, actual files touched, dependencies, verification results, acceptance criteria passed, and remaining limitations/mocks.

## MVP controls

| Control | UI and initial state | Contract field / effect |
|---|---|---|
| On-site trip budget (USD, excluding flights) | Slider plus numeric input; proposed slider $100–$10,000 in $100 steps; allow positive custom amounts beyond the slider range. Start at $1,500 (approved testing default); clearing restores null. | `budget_usd: 1500` initially; keep `budget_scope: "excluding_flights"`. This is the whole on-site trip budget, not a daily budget. |
| Trip length | Integer slider/input, 1–30 days; start at 5 days (approved testing default). | `duration_days: 5` initially. Determines on-site cost totals; not a separate suitability score. |
| Preferred climate | Single-select buttons: Any, Cold, Mild, Warm; start Any. | `climate: "any" | "cold" | "mild" | "warm"`. Use categories, not an unsupported temperature slider. |
| Travel month | January–December selector plus “Not sure”; start Not sure. | `travel_month: null` or 1–12. A month and non-Any climate are both needed for climate scoring. |
| Interests | Multi-select chips: Food, Culture, Beaches, Nature, Nightlife, Adventure; start empty. | `interests: Interest[]`. Main personalization signal (45% base weight); no invented per-interest intensity fields. |

Budget bounds above are UI convenience, not a new API limit. Give sliders visible values, labels, keyboard support, and associated numeric inputs. Clearing optional numbers restores null, not zero. Do not infer a month or origin; keep `origin_city: null`. Use the approved compact wizard: budget → days → climate → month → interests. Show one question at a time with Back/Next and progress; finish with Find destinations, then a summary and Edit preferences. Do not prefill month, climate or interests.

Show these limitations near the controls/results:
- Without a month, climate is not scored; request a month without blocking other preferences.
- Budget/duration affect affordability only with verified cost ranges. Unknown costs stay unknown. Duration alone does not favor cities or generate an itinerary.
- With no usable scoring components, show unscored results rather than fabricated matches.
- All-in flight budgets are outside the MVP controls. If `total_trip` preferences arrive later, preserve the scope and explain that affordability cannot be verified without airfare.

## Ticket AI-01 — TypeScript contract, API client, and app state [P0; completed foundation]

**Outcome:** Existing types mirror the shared contract; typed API methods, root-owned state, cancellation, error handling, and explicit fixture mode support the next slice.

**Files:** `frontend/src/types/travel.ts`, `frontend/src/services/api.ts`, `frontend/src/App.tsx`, existing tests and frontend scaffold.

**Review:** Keep this ticket complete. Existing `parsePreferences` methods/types can remain dormant for AI-07. The current textarea and parse-before-rank flow are transitional and must be replaced under AI-02; no need to redo the foundation. Canonical backend models and Engineer 1 components are absent in this checkout, so reconcile them at handoff.

**Verify:** `npm ci --prefix frontend`, `npm test --prefix frontend`, `npm run build --prefix frontend`; explicit demo mode renders sample results and selection without a backend. Current tests cover fixture labels, null costs, endpoint payloads, cancellation and errors. This scope review could not rerun them because local dependencies were absent (`vitest: command not found`); the completion checkbox reflects the existing implementation record, not fresh test evidence.

## Ticket AI-02 — Structured controls and direct ranking [P0; frontend implemented; live acceptance pending]

**Outcome:** A user can find curated city matches with no natural-language request or Gemini dependency.

**Spec/status:** [AI-02 spec](../docs/AI-02-SPEC.md). Controls and direct submission are implemented; all 10 frontend tests and the TypeScript/production build pass; keep unchecked until live BE-04 acceptance is demonstrated. Chromium desktop/mobile checks passed; the budget step requires vertical scrolling on mobile.

**Planned files:** `frontend/src/components/preferences/PreferencesPanel.tsx`, `frontend/src/App.tsx`, relevant frontend styles and tests; API client only if needed.

**Tasks**
- Implement the five controls above as typed controlled inputs; `App.tsx` owns preferences.
- Replace textarea/parse loading with “Find destinations” submit → `getRecommendations(preferences)` directly. Send the complete unwrapped object; never call `parsePreferences` from the MVP flow.
- Retain catalog loading, legible validation, loading/error/retry, empty/unscored states and selection handling. Keep previous valid results on failure and identify them as results for previous preferences.
- Demo mode may return unchanged shared fixtures, but must explicitly say controls do not recompute sample rankings. Never implement a competing frontend scorer.

**Dependencies:** AI-01 and existing contract. Fixtures allow development now; BE-04 is required for live ranking.

**Verify / done when:** UI/API tests assert exact submitted fields, null clearing, duration boundaries, interest toggles, and zero parser calls. Manually complete the wizard and submit without a Gemini key. Real ranking acceptance requires BE-04; fixture-only behavior is not live acceptance.

## Ticket AI-03 — Globe, results, and details integration [P0; ~3h]

**Outcome:** Structured preferences drive a coherent globe and city detail experience.

**Planned files:** `frontend/src/App.tsx` and integration tests; consume Engineer 1 components through typed props.

**Tasks**
- Load destination summaries at startup; join result IDs to summaries.
- Render `AppShell`, `TravelGlobe`, `RecommendationList`, and `DestinationDetails` after Engineer 1's handoff.
- Fetch details via the API client on selection with loading/error/null states; prevent stale details from displaying for a different city.
- Preserve selection only if present in latest results; otherwise select the first eligible result or null.
- Recolor from results without camera movement on each control edit; use agreed explicit-selection behavior.

**Dependencies:** AI-02, FE-03/04, BE-02/04. Ask owners for small integration changes if component/backend interfaces need adjustment.

**Verify / done when:** Two interest/climate profiles (with an explicit month) produce real rankings and visible globe updates. Click marker/card and verify matching details; unsupported countries show “Not yet covered.” Missing photos/costs are unavailable, never $0. Temporary fixture UI remains labeled until handoffs land.

## Ticket AI-04 — What If? updates and request reliability [P0; ~3h]

**Outcome:** The same controls become live What If? controls after the first successful submission; no duplicate panel/state is needed.

**Planned files:** `frontend/src/App.tsx`, preference controls as needed, request-lifecycle tests.

**Tasks**
- Update local controls immediately; debounce ranking by ~300ms after edits. Initial search stays explicit.
- Call only `/api/recommendations`. Invalidate/abort the prior request immediately on edit, including the debounce window, so old results cannot commit after newer input.
- Cancel pending timers on explicit submit/unmount; retry uses the latest valid preferences. Invalid input must not issue requests.
- Keep results visible during updates, labeled as updating or stale on error. Maintain selection rules and avoid camera jitter.

**Dependencies:** AI-02; BE-04 for real reranking. Can develop request behavior before globe integration.

**Verify / done when:** Test rapid changes, out-of-order responses, an old response arriving during debounce, retry, unmount, and zero parser requests. With local backend, interest changes visibly rerank in the target <1s; budget changes claim effects only where sourced data supports them.

## Ticket AI-05 — Deployment and demo verification [P0; ~3–4h]

**Outcome:** Live and explicitly labeled fallback demos each run in under 90 seconds.

**Planned files:** Frontend environment example, README run/deploy notes, demo checklist, integration tests/config as needed.

**Tasks**
- Configure `VITE_API_BASE_URL`; coordinate CORS with Engineer 2. No Gemini setup required.
- Test slow/offline backend, restart, empty/all-ineligible/unscored results, stale requests, unsupported country, and missing data.
- Rehearse two profiles whose interest/climate data actually supports different rankings. Explain fixed fixture fallback honestly.
- Run tests/build and a real browser rehearsal on the judging laptop.

**Dependencies:** AI-02/03/04, running backend and globe components.

**Verify / done when:** `npm test --prefix frontend` and `npm run build --prefix frontend` pass; live controls → rank → globe → What If? works with no parser endpoint/key, no console errors, and a tested fallback. Record actual manual results; do not mark done from fixtures alone.

## Ticket AI-06 — Optional differentiators [P2; after MVP]

Pick one only after AI-05 passes: Surprise Me from eligible ranked cities, or comparison using existing data. Planned files: Engineer 3 controls/app wiring; coordinate display changes with Engineer 1. Verify selected IDs and factual data against actual responses. No invented city, score, price, or itinerary.

## Ticket AI-07 — Gemini natural-language parsing [P2; after MVP]

**Outcome:** Optional text input populates the same editable controls; ranking remains Python-owned and the app remains usable without Gemini.

**Planned files:** `backend/services/gemini_service.py`, `backend/routers/preferences.py`, `frontend/src/components/search/SearchPanel.tsx`, app wiring/tests and backend environment example. Engineer 2 registers the router via a reviewed integration change.

**Tasks:** Implement the existing parse contract with server-only `GEMINI_API_KEY`, structured output/Pydantic validation, explicit-field updates, safe timeout/errors, and all-in budget warnings. Do not fabricate dates/origin or overwrite controls on failure. Gemini explanations are a later optional extension grounded in verified facts.

**Dependencies:** MVP release gate passed, canonical backend models, owner coordination for registration.

**Verify / done when:** Ten phrases cover synonyms, partial edits, flight-inclusive budgets, missing month, invalid duration, and failures. Verify no frontend secret, deterministic ranking, no parser calls from What If?, and the controls-only flow still works when Gemini is unavailable. No silent mock parses.
