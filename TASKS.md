# WanderSphere — GitHub Ticket Board (3 Engineers)

This is the **single status page**. Detailed technical tickets live in the three engineer files below. Check off a ticket only when its own **Done when** condition has been demonstrated. Estimates are approximate; prioritize a working end-to-end demo over completing every stretch item.

| Owner | Ticket file | Responsibility | Boundary |
|---|---|---|---|
| **Engineer 1** | [`tickets/ENGINEER-1-GLOBE-UI.md`](tickets/ENGINEER-1-GLOBE-UI.md) | Globe, interactions, cards and details | No backend/API-fetch logic |
| **Engineer 2** | [`tickets/ENGINEER-2-BACKEND.md`](tickets/ENGINEER-2-BACKEND.md) | FastAPI, curated cities, scoring and tests | No AI model calls in scoring |
| **Engineer 3** | [`tickets/ENGINEER-3-AI-INTEGRATION.md`](tickets/ENGINEER-3-AI-INTEGRATION.md) | Preference controls, What If?, API client, integration; Gemini after MVP | Does not rewrite globe or scoring internals |

## Shared kickoff — first 45–60 minutes

- [ ] **ALL:** Agree on [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md). Lock field names, ISO alpha-3 country codes and city IDs.
- [ ] **ALL:** Clone repo, choose branches, agree on review/merge process and demo laptop.
- [ ] **ENGINEER 2:** Define canonical Pydantic models and stable destination IDs.
- [ ] **ENGINEER 3:** Mirror API types in TypeScript and publish frontend API client/fixtures interface.
- [ ] **ENGINEER 1:** Confirm globe library runs on the actual demo laptop.

## Engineer 1 — 3D globe + visual UI

Detailed steps: [`tickets/ENGINEER-1-GLOBE-UI.md`](tickets/ENGINEER-1-GLOBE-UI.md)

- [ ] **FE-01 · P0 · ~2h:** Initialize interactive globe; dragging, zooming, resizing work.
- [ ] **FE-02 · P0 · ~3h:** Clickable country polygons + supported city markers.
- [ ] **FE-03 · P0 · ~3h:** Marker and country colors update from `Recommendation[]` props.
- [ ] **FE-04 · P0 · ~3h:** Ranked result cards + destination details, null-safe states.
- [ ] **FE-05 · P1 · ~2–3h:** Camera fly-to, visual transitions, responsiveness and polish.

**Handoff:** Export typed `TravelGlobe`, `RecommendationList`, `DestinationDetails` and `AppShell` components to Engineer 3. No network requests inside display components.

## Engineer 2 — Backend + recommendation scoring

Detailed steps: [`tickets/ENGINEER-2-BACKEND.md`](tickets/ENGINEER-2-BACKEND.md)

- [ ] **BE-01 · P0 · ~2h:** FastAPI, Pydantic contracts, health and CORS.
- [ ] **BE-02 · P0 · ~4h:** 12–15 curated city records, validation, destination GET endpoints.
- [ ] **BE-03 · P0 · ~5h:** Pure interest/climate/affordability scoring; missing-data protections.
- [ ] **BE-04 · P0 · ~3h:** `POST /api/recommendations`, unit tests, stable sorting.
- [ ] **BE-05 · P1 · ~2–3h:** Source audit, cost caveats, error handling and hardening.

**Handoff:** Supply stable GET endpoints and ranking API to Engineer 3. Preference-router registration is deferred until post-MVP AI-07; it does not block ranking.

## Engineer 3 — Preference controls + experience + integration

Detailed steps: [`tickets/ENGINEER-3-AI-INTEGRATION.md`](tickets/ENGINEER-3-AI-INTEGRATION.md)

- [x] **AI-01 · P0 · ~3h:** Matching TypeScript interfaces, API client, React app state, explicit mock mode.
- [ ] **AI-02 · P0 · ~3h:** Compact wizard: budget ($1,500), days (5), climate, month, interests; submit directly to ranking. Frontend implemented; live BE-04 acceptance pending. [Spec](docs/AI-02-SPEC.md).
- [ ] **AI-03 · P0 · ~3h:** Structured preferences → score → globe, result cards and details.
- [ ] **AI-04 · P0 · ~3h:** What If? controls, debounced ranking-only requests and stale-request guard.
- [ ] **AI-05 · P0 · ~3–4h:** Deployment or reliable local run, smoke tests and demo rehearsal.
- [ ] **AI-06 · P2 · optional:** Surprise Me or comparison only after all P0 done.
- [ ] **AI-07 · P2 · after MVP:** Optional server-side Gemini parser populating the existing controls.

**Handoff:** Integrate components from Engineer 1 and API from Engineer 2 without changing their internal ownership areas.

## Dependencies / merge order

```text
Kickoff + signed-off API contract
 |--- Engineer 1: FE-01 -> FE-02 -> FE-03 + FE-04 -> FE-05
 |--- Engineer 2: BE-01 + BE-02 -> BE-03 -> BE-04 -> BE-05
 `--- Engineer 3: AI-01 -> AI-02 -> AI-03 -> AI-04 -> AI-05 -> AI-07 (optional)
                                     ^       ^
                               FE-03/04   BE-04
                               BE-04
```

Develop against [`shared/`](shared/) mocks while waiting for handoffs. Make small PRs; no giant merges at hour 35.

## Timeline gates (48-hour event)

- [ ] **Hour 2:** Shared API contract accepted; repo scaffolded; mocks accessible.
- [ ] **Hour 10:** Standalone globe works; FastAPI returns destinations; structured controls submit preferences directly to ranking (fixtures explicitly labeled until BE-04).
- [ ] **Hour 20:** Structured preferences flow through scoring and visible globe update.
- [ ] **Hour 28:** What If? changes rankings without calling Gemini.
- [ ] **Hour 36:** Destination detail view and errors/fallback paths work.
- [ ] **Hour 42:** Feature freeze; demo runs locally or from deployed URL.
- [ ] **Hour 48:** Two successful rehearsal runs; submit.

**24-hour contingency:** Cut FE-05, BE-05 and AI-06. Reduce to 8–10 cities; use precomputed climate. Keep controls → rank → globe → What If? intact. Gemini (AI-07) remains deferred.

## Demo release gate

Use [`docs/DEMO-CHECKLIST.md`](docs/DEMO-CHECKLIST.md) for the live presentation and fallback checklist.

- [ ] One judge can set structured preferences and see supported cities ranked without Gemini.
- [ ] Updating interests/climate changes the rankings without re-calling Gemini.
- [ ] Country and city selections match the same canonical IDs.
- [ ] Unsupported countries aren't depicted as low-scoring destinations.
- [ ] No fake airfare, hotel inventory, prices, or unlabeled mock scores.
- [ ] Error/fallback behavior and a real judging-laptop run have been tested.
