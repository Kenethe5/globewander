# Engineer 3 — Gemini, Search/What If? UX, Integration, Deployment

**Mission:** Turn a natural-language request into structured preferences, connect every subsystem, and make the full judge flow resilient. You own the app state and API client but **not** the globe internals or ranking engine.

**Before starting:** Read [`../README.md`](../README.md), [`../AGENTS.md`](../AGENTS.md), and [`../docs/API-CONTRACT.md`](../docs/API-CONTRACT.md).

## My assigned ticket checklist

- [ ] **AI-01** — TypeScript contract, API client, and app state
- [ ] **AI-02** — Gemini structured preference parsing
- [ ] **AI-03** — Search UI + complete end-to-end loop
- [ ] **AI-04** — What If? live controls
- [ ] **AI-05** — Deployment, demo reliability, and polish
- [ ] **AI-06** — Optional differentiators

Keep this checklist synchronized with [`../TASKS.md`](../TASKS.md). Each ticket below includes implementation detail, dependencies, and a done condition.

**Primary files you own**

```text
backend/services/gemini_service.py
backend/routers/preferences.py
frontend/src/App.tsx
frontend/src/types/travel.ts
frontend/src/services/api.ts
frontend/src/components/search/SearchPanel.tsx
frontend/src/components/preferences/PreferencesPanel.tsx
frontend/src/components/preferences/WhatIfPanel.tsx
frontend/.env.example
backend/.env.example
README deployment notes / host configuration
```

Engineer 2 registers your backend router. Engineer 1 provides presentational components imported into your `App.tsx`.

## Ticket AI-01 — TypeScript contract, API client, and app state [P0; ~3h]

**Tasks**
- Mirror `docs/API-CONTRACT.md` in `frontend/src/types/travel.ts` (do not change JSON keys).
- Implement typed API methods: `getDestinations`, `getDestination`, `parsePreferences`, `getRecommendations`.
- Root `App.tsx` owns `preferences`, `destinations`, `results`, `selectedDestinationId`, `parseLoading`, `rankingLoading`, `error`.
- Initially replace API methods with `shared/` fixture responses behind an **explicit mock mode** toggle.
- Handle HTTP non-2xx status and null values; no implicit defaulting of missing cost fields.

**Done when:** mock search/results render in Engineer 1's UI (or temporary text UI), without a running backend; fixture content is visibly marked dev-only.

## Ticket AI-02 — Gemini structured preference parsing [P0; ~3–4h]

**Tasks**
- Install and use `google-genai` server-side. Read `GEMINI_API_KEY` from the backend environment; never embed it in Vite env.
- Build prompt to return schema-validated **TravelPreferences** from `text` + `current_preferences`. Preserve unspecified current values and do not hallucinate origin, dates, or cost.
- Use Pydantic schema / structured JSON output; validate response before returning.
- Build `/api/preferences/parse` request and response exactly as documented in the contract.
- If the query says “$1500 total including airfare,” set `budget_scope="total_trip"` and warn that flight costs are unavailable.
- Timeouts/invalid AI results return safe errors; optionally ship a **clearly labeled** demo fallback prompt set.

**Done when:** 10 manual test phrases (synonyms, changing only interests, all-in budget, no month, impossible duration) preserve or reject fields correctly. The API key never reaches the frontend.

## Ticket AI-03 — Search UI + complete end-to-end loop [P0; ~3h]

**Tasks**
- Build input with submit, loading state, helpful placeholder, retry, and parsed-preference chips.
- Submit query → `POST /api/preferences/parse` → update editable `preferences` state → `POST /api/recommendations` → update `results`.
- Fetch `/api/destinations` once at load and cache in state. Join result IDs to destination summaries.
- Render Engineer 1's `<TravelGlobe>`, `<RecommendationList>`, `<DestinationDetails>` in `<AppShell>`; use one selected-city ID throughout.
- Do not display blank screen if Gemini is slow or fails: leave previous valid recommendations visible with an error/retry option.

**Done when:** a new natural-language request visibly changes the globe and ranked cards using the real backend.

## Ticket AI-04 — What If? live controls [P0; ~3h, depends on BE-04]

**Tasks**
- Controlled budget slider (with a visible **excluding airfare** label), duration, month selector, climate selector, and interest toggles.
- On edit, update local structured state synchronously and debounce API request by ~300ms.
- Each What If? edit calls **only `/api/recommendations`**; it must never call `/api/preferences/parse`.
- Use `AbortController` or monotonic request sequence to avoid older responses overwriting newer ones.
- If an all-in budget is selected, show: "We can't verify affordability without flight prices" and skip confident budget matching.

**Done when:** the judge can change beach → culture and watch the globe rerank in <1s on local server; budget changes only claim effects when cost data actually supports them.

## Ticket AI-05 — Deployment, demo reliability, and polish [P0; ~3–4h]

**Tasks**
- Set frontend API base URL via `VITE_API_BASE_URL`; ensure the client doesn't leak secrets.
- Configure production CORS in coordination with Engineer 2; deploy frontend and backend or prepare a local demo that always runs.
- Test slow Gemini, server restart, empty results, stale response, unsupported country, no photo, and missing cost data.
- Prepare a real example that showcases distinct recommendations for two interest/climate profiles.
- Add **explicit** demo-mode switch for precomputed parses if Wi-Fi or AI quota fails; judges must be told when fallback is used.
- Run presentation rehearsal and verify animations are smooth on the judging laptop.

**Done when:** both a live run and a clearly labeled fallback run succeed in under 90 seconds; no developer-console errors.

## Ticket AI-06 — Optional differentiators [P2; only if everything above works]

- “Surprise Me”: pick from already ranked eligible cities, with visible score and reason (do not invent a new city).
- Compare two destinations using existing data.
- Gemini writes a short **source-grounded** 2–3 sentence explanation for the top match. Never let Gemini fabricate prices or overwrite computed rankings.

## Recommended integration tests

1. Parse "Warm beaches, 5 days in December" and inspect exact structured result.
2. Change only interest chips: ensure no Gemini request hits backend.
3. Drag budget rapidly: ensure last submitted state determines final rankings.
4. Country without covered cities says “Not yet covered.”
5. Missing photo/cost appears as “Unavailable,” not blank or $0.
6. Disconnect Gemini temporarily: old results remain and UI offers retry.

## End-to-end handoff dependencies

- Engineer 2: validate schemas and publish running backend; register your preferences router.
- Engineer 1: provide typed presentational components; you wire them to shared state.
- Do not wait for these dependencies: develop against shared mocks in parallel, then replace with live endpoints.
