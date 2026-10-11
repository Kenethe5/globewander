# WanderSphere — GitHub Ticket Board (3 Engineers)

## Completion implementation status

The project-wide completion spec was approved in chat. Engineer 2/3 code was already local; no GitHub Engineer 1 code was imported. [Completion handoff](docs/COMPLETION-HANDOFF.md) records changed files, commands, acceptance evidence and limitations for every slice. The checkboxes below are conservative: visual judging-laptop gates and live Gemini phrase extraction are not inferred from unit tests.

| Tickets | Current evidence |
|---|---|
| FE-01–05 | Implemented; real Chrome globe rendering, photos/source details, polygon/marker clicks, drag/zoom events, reranking and mobile bounds pass. Subjective smoothness on the judging laptop remains manual. |
| BE-01–05 | Implemented; validation/scoring/API/source-metadata tests pass. All 12 cities have sourced planning cost intervals with visible assumptions. |
| AI-01–04 | Implemented; live ranking and browser integration pass; lifecycle tests cover debounce cancellation, submit, invalid edits, unmount and details. |
| AI-05 | Reliable local live/fallback run implemented and browser-tested. Separate judging-laptop rehearsal remains. |
| AI-06 | Surprise Me implemented and browser-tested using eligible result IDs. |
| AI-07 | Implemented and provider-mocked phrase/error tests pass. Actual Gemini phrase accuracy remains pending a server credential. |

This is the **single status page**. Detailed technical tickets live in the three engineer files below. Check off a ticket only when its own **Done when** condition has been demonstrated. Estimates are approximate; prioritize a working end-to-end demo over completing every stretch item.

| Owner | Ticket file | Responsibility | Boundary |
|---|---|---|---|
| **Engineer 1** | [`tickets/ENGINEER-1-GLOBE-UI.md`](tickets/ENGINEER-1-GLOBE-UI.md) | Globe, interactions, cards and details | No backend/API-fetch logic |
| **Engineer 2** | [`tickets/ENGINEER-2-BACKEND.md`](tickets/ENGINEER-2-BACKEND.md) | FastAPI, curated cities, scoring and tests | No AI model calls in scoring |
| **Engineer 3** | [`tickets/ENGINEER-3-AI-INTEGRATION.md`](tickets/ENGINEER-3-AI-INTEGRATION.md) | Preference controls, What If?, API client, integration; Gemini after MVP | Does not rewrite globe or scoring internals |

## Shared kickoff — first 45–60 minutes

- [ ] **ALL:** Agree on [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md). Lock field names, ISO alpha-3 country codes and city IDs.
- [ ] **ALL:** Clone repo, choose branches, agree on review/merge process and demo laptop.
- [x] **ENGINEER 2:** Define canonical Pydantic models and stable destination IDs.
- [x] **ENGINEER 3:** Mirror API types in TypeScript and publish frontend API client/fixtures interface.
- [ ] **ENGINEER 1:** Confirm globe library runs on the actual demo laptop.

## Engineer 1 — 3D globe + visual UI

Detailed steps: [`tickets/ENGINEER-1-GLOBE-UI.md`](tickets/ENGINEER-1-GLOBE-UI.md)

- [x] **FE-01 · P0 · ~2h:** Initialize interactive globe; dragging, zooming, resizing work.
- [x] **FE-02 · P0 · ~3h:** Clickable country polygons + supported city markers.
- [x] **FE-03 · P0 · ~3h:** Marker and country colors update from `Recommendation[]` props.
- [x] **FE-04 · P0 · ~3h:** Ranked result cards + destination details, null-safe states.
- [x] **FE-05 · P1 · ~2–3h:** Camera fly-to, visual transitions, responsiveness and polish.

**Handoff:** Export typed `TravelGlobe`, `RecommendationList`, `DestinationDetails` and `AppShell` components to Engineer 3. No network requests inside display components.

## Engineer 2 — Backend + recommendation scoring

Detailed steps: [`tickets/ENGINEER-2-BACKEND.md`](tickets/ENGINEER-2-BACKEND.md)

- [x] **BE-01 · P0 · ~2h:** FastAPI, Pydantic contracts, health and CORS.
- [x] **BE-02 · P0 · ~4h:** 12–15 curated city records, validation, destination GET endpoints.
- [x] **BE-03 · P0 · ~5h:** Pure interest/climate/affordability scoring; missing-data protections.
- [x] **BE-04 · P0 · ~3h:** `POST /api/recommendations`, unit tests, stable sorting.
- [x] **BE-05 · P1 · ~2–3h:** Source audit, cost caveats, error handling and hardening.

**Handoff:** Supply stable GET endpoints and ranking API to Engineer 3. Preference-router registration is deferred until post-MVP AI-07; it does not block ranking.

## Engineer 3 — Preference controls + experience + integration

Detailed steps: [`tickets/ENGINEER-3-AI-INTEGRATION.md`](tickets/ENGINEER-3-AI-INTEGRATION.md)

- [x] **AI-01 · P0 · ~3h:** Matching TypeScript interfaces, API client, React app state, explicit mock mode.
- [x] **AI-02 · P0 · ~3h:** Compact wizard: budget ($1,500), days (5), climate, month, interests; submit directly to ranking. Live acceptance verified. [Spec](docs/AI-02-SPEC.md).
- [x] **AI-03 · P0 · ~3h:** Structured preferences → score → globe, result cards and details.
- [x] **AI-04 · P0 · ~3h:** What If? controls, debounced ranking-only requests and stale-request guard.
- [ ] **AI-05 · P0 · ~3–4h:** Deployment or reliable local run, smoke tests and demo rehearsal.
- [x] **AI-06 · P2 · optional:** Surprise Me from eligible canonical results; local MVP flow verified.
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

- [x] One judge can set structured preferences and see supported cities ranked without Gemini.
- [x] Updating interests/climate changes the rankings without re-calling Gemini.
- [x] Country and city selections match the same canonical IDs.
- [x] Unsupported countries aren't depicted as low-scoring destinations.
- [x] No fake airfare, hotel inventory, prices, or unlabeled mock scores.
- [ ] Error/fallback behavior and a real judging-laptop run have been tested.
