# Project completion spec — approved

## Scope and authority

Complete WanderSphere against all three engineer ticket files and docs/API-CONTRACT.md. The user authorizes project-wide completion across engineering boundaries. Do not import GitHub Engineer 1 code. Preserve existing local changes and the staged deletion of docs/TEAM-STATUS.md. Reimplement Engineer 1 display components to the contracts; retain compatible Engineer 2/3 work.

Approved by the user in chat: “i have you on approve fro me though,” followed by “okay so you may continue.” Project-wide implementation is authorized. See COMPLETION-HANDOFF.md for verification and remaining external/manual acceptance.

## Assessment (2026-10-11)

Read the README, API contract, task board, AGENTS.md, and all three ticket files. Fetched only Kenethe5/globewander's engineer-2 (7dda353) and engineer-3-connecting-backend-to-frontend (fe0384f) into assessment refs, without merging.

- Engineer 2's backend is already present locally, apart from local CORS and requirements-file differences. Do not overwrite those with a blanket pull. Existing nine backend tests pass, but do not demonstrate every required boundary and operational scenario.
- Engineer 3's tracked frontend foundation is already present locally. Local uncommitted app/globe integration extends it. No additional frontend source needs pulling from that branch.
- Production frontend build fails on country topology typing. Six app tests fail because WebGL/ResizeObserver are not supported by jsdom; four API tests pass.
- Local detail display omits selected-month climate, climate citations and actual verified cost ranges. Country clicks select one city rather than presenting supported-city choices. Globe textures require an external CDN.
- Request lifecycle and UI need verification/fixes for invalid edits, pending debounce/submit interactions, detail dismissal/loading, retry, and stale/error labels. Current tests still assert the preceding temporary UI.
- All catalog cost ranges and photos are null. Preserve truthful unavailable states. Audit climate data/provenance consistency before claiming verified climate recommendations.

## Implementation slices and acceptance

1. **BE-01–05:** retain Python scoring and existing endpoints; strengthen canonical validation and repeatable dependency/run setup; audit dataset sources and conversions; correct unsupported values or leave them null. Test scoring boundaries, missing components, one-day costs, both affordability monotonic directions, stable sorting, invalid requests, catalog loading and CORS. No live prices or invented cost ranges.
2. **FE-01–05:** build fresh typed presentational globe, country/marker interactions, score aggregation, cards, detail drawer and AppShell. Bundle geometry and suitable licensed visual assets for reliable local operation. Show all supported cities on country click and “Not yet covered” otherwise. Present null-safe costs/photos, selected-month historical climate, available scores, source links/dates and caveats. Resize and explicit-selection camera motion must work without motion on routine reranking.
3. **AI-01–04:** reuse contract types, client and five-step controls. Root owns state. Initial search is explicit; later valid edits debounce ranking approximately 300ms and immediately invalidate old requests. Keep previous results on failures with truthful stale status; retry latest valid inputs. Guard catalog/details/ranking races, cancel timers on submit/unmount, and preserve selection only when still present. No parser calls in ranking/What If.
4. **AI-05:** complete reliable local startup, environment examples, smoke checks and under-90-second live/fallback demo instructions. Verify real API responses and browser interaction where tooling allows; document any judging-laptop verification that still needs a human. Update checklists only with actual evidence.
5. **AI-06:** after the MVP gate, add the ticket's optional Surprise Me action using only eligible results and canonical IDs.
6. **AI-07:** after the MVP gate, add optional server-only Gemini parsing into the same controls. Preserve explicitly unchanged fields, validate outputs, handle timeouts/failures with safe 503 responses, warn for flight-inclusive budgets, and keep controls usable without a key. Test the required ten phrase/failure scenarios with mocked provider responses. Live provider acceptance requires an available server credential; never fabricate completion evidence.

## Files and contracts

Expected changes: frontend display components/styles/assets, App.tsx, controls/API client/types as required; backend models/scoring/data/routers/tests and optional Gemini service; requirements/environment examples; README, demo checklist, TASKS.md and ticket handoff records. Use canonical backend schemas and existing response containers, IDs, enums and ranking weights. Record exact files and verification per slice.

## Verification and limitations

Run pytest, frontend tests, strict TypeScript/production build, real backend smoke requests and a browser rehearsal where available. Frontend state tests use a mocked rendering boundary; real WebGL behavior needs browser verification. Test two supported interest/climate profiles, unsupported countries, missing data, empty/ineligible/unscored results, cancellation, offline/retry and explicit fixtures.

No bookings, auth, group trips, itinerary generation, live flights or AI video. Publishing, pushing and contacting teammates are outside this spec. Costs/photos may remain unavailable when sourcing cannot support them. Gemini live verification and judging-laptop rehearsal must be recorded as pending if unavailable.
