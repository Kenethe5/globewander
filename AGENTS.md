# Codex Instructions — WanderSphere

Use this file as the repository-wide implementation contract. **First read** `README.md`, `docs/API-CONTRACT.md`, `TASKS.md`, and your assigned `tickets/ENGINEER-*.md` file before changing files.

## Product constraints

- One-user hackathon MVP: responsive interactive 3D globe, curated city recommendations, structured preference controls, city details, and **What If?** reranking.
- **Do not implement group trips, bookings, live flight prices, auth, AI video, or itinerary generation** unless a later explicit ticket adds them.
- Prefer **small, working vertical slices** and mock fixtures over overengineering.
- API keys are server-only. Never send `GEMINI_API_KEY` to the browser.
- Structured ranking is calculated by Python, never by Gemini. Gemini parses text and may write explanations based on verified facts.

## Team boundaries

- **Engineer 1:** owns globe, country geometry, destination displays and `AppShell`. Do not edit ranking, Gemini, `App.tsx`, or `services/api.ts`.
- **Engineer 2:** owns backend schemas, endpoint registration, destination JSON, scoring logic and tests. Do not edit frontend or Gemini service.
- **Engineer 3:** owns preference controls, post-MVP Gemini parsing, API client, root app wiring, deployment and integration. Do not rewrite globe or scoring internals.
- Integration exception: Engineer 2 registers Engineer 3's `backend/routers/preferences.py` router in `main.py` after its interface is ready in post-MVP AI-07. Agree on names via the shared contract, not ad-hoc edits.
- If changes cross ownership boundaries, request a small integration PR and tell the owner before modifying their files.

## Source-of-truth contracts

- `docs/API-CONTRACT.md` governs endpoint names, request/response JSON, nullability, score meanings, IDs, and preference enums.
- Backend Pydantic models are canonical; frontend TypeScript interfaces **must match** them.
- Country codes are **ISO alpha-3** (`PRT`, `JPN`, `MEX`). City IDs are lowercase slug strings (`lisbon`, `kyoto`).
- Full responses use `{ "destinations": [...] }` or `{ "results": [...] }` containers as defined in the contract; do not silently change them.
- During parallel development use `shared/mock-destinations.json` and `shared/mock-recommendations.json`. Their scores are **mock test values**, not product claims.

## Recommendation reliability

1. Hard constraints first (known over-budget estimates can disqualify; unknown costs stay explicitly unknown).
2. Normalize available component scores to 0–100. Missing components are `null`, not zero.
3. Weighted average: 45% interests, 30% climate, 25% verified **on-site** affordability, normalized over available components; total-trip budgets with unknown flights do not get an affordability score.
4. Return breakdown, `budget_status`, `eligible`, `estimated_onsite_total_usd` when known, reasons/tradeoffs.
5. Don't claim all countries are ranked; **only curated cities** have recommendations.
6. Show cost assumptions, source URLs and checked dates for any sourced estimates. If sources aren't ready, leave values null and show the limitation.

## Frontend interaction rules

- `App.tsx` owns preferences, recommendations, loading/error states and selected destination ID.
- All globe and detail components should be presentational with typed props; no direct API calls inside `TravelGlobe`.
- What If? sliders/chips call `/api/recommendations` with a ~300ms debounce, not Gemini. Cancel stale requests (`AbortController` or a monotonic request ID).
- Avoid camera motion on every tiny slider update. Animate to a newly selected top city or on explicit click.
- On country clicks, show supported cities; when no cities are supported, show “Not yet covered.”
- Preserve selected destination only if it still exists in the latest results; otherwise select the top eligible result.

## Implementation and testing standards

- Spec-driven workflow: discuss each ticket with the user, draft and revise its spec together, and wait for explicit user approval before implementation.

- Add a short test or an explicit manual verification step with every ticket.
- Python: type hints, Pydantic validation, deterministic pure scoring functions, pytest.
- TypeScript: strict interfaces, no `any` for API data, basic loading/empty/error UI.
- API errors should be legible; do not return `200 OK` with silently fake rankings.
- Do not ship dev mocks pretending they are live results. Use an explicit demo/fallback indicator.
- Optimize time-to-demo. Avoid adding databases, auth, geocoding, or other dependencies without justification.

## Every ticket / PR should state

- Ticket ID + one-sentence outcome
- Files touched
- Dependencies or contracts used
- How to test it (commands and/or click path)
- Acceptance criteria passed
- Known limitations and whether mocks are present

## Priority order

**P0:** functioning controls → rank → globe → What If? loop; Gemini parsing is deferred until after MVP.
**P1:** source-aware details, photo, typical weather, animation, polish.  
**P2:** comparison, Surprise Me, hotels, anything unrelated to demo-critical path.

When uncertain: implement the simplest version that preserves the agreed contract and can be demoed in under 90 seconds.

## Owner ticket files

- Engineer 1: [`tickets/ENGINEER-1-GLOBE-UI.md`](tickets/ENGINEER-1-GLOBE-UI.md)
- Engineer 2: [`tickets/ENGINEER-2-BACKEND.md`](tickets/ENGINEER-2-BACKEND.md)
- Engineer 3: [`tickets/ENGINEER-3-AI-INTEGRATION.md`](tickets/ENGINEER-3-AI-INTEGRATION.md)
- Status and integration milestones: [`TASKS.md`](TASKS.md)
