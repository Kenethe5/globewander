# WanderSphere

## Current local completion run

The full controls → live Python ranking → globe → What If? flow is integrated. See [completion handoff](docs/COMPLETION-HANDOFF.md) for ticket evidence and remaining manual checks; the historical notes below describe earlier milestones.

From the repository root, use two terminals:

```sh
python3 -m pip install -r backend/requirements.txt
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

```sh
npm ci --prefix frontend
npm run dev --prefix frontend -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. Live mode is default. For a backend-free fallback, start `VITE_DEMO_MODE=true npm run dev --prefix frontend`; the banner explicitly identifies fixed invented fixtures. All 12 live cities have sourced on-site planning intervals and locally bundled licensed photos. Budget changes affect affordability and eligibility when flights are excluded. Details show source links, checked dates, photo credits and assumptions. Estimates are budget-to-mid-range averages, not live quotes or guaranteed bounds.

Optional text parsing requires `GEMINI_API_KEY` exported only in the backend environment. `GEMINI_MODEL` is configurable; the example uses `gemini-3.8-flash` from Google's current documentation. Environment files are examples, not automatically loaded by Python; export variables before starting the server. Without a key, parsing returns a useful 503 and the controls still work. Parsing fills controls and never calculates rankings. `CORS_ORIGINS` accepts an explicit comma-separated list; wildcard entries are discarded.

Verification: `python3 -m pytest backend/tests -q`, `npm test --prefix frontend`, `npm run build --prefix frontend`. For real Chrome smoke checks, install `puppeteer-core` in a separate tooling directory, set `WANDER_PUPPETEER_MODULE` to its absolute module directory and run `node scripts/browser-smoke.cjs` with both servers running. `WANDER_CHROME_PATH` overrides the Mac Chrome path. For fixture checks, run a demo server on port 5174 and add `WANDER_SITE_URL=http://127.0.0.1:5174 WANDER_DEMO_CHECK=1`.

One-user travel discovery MVP. The shared API is defined in [docs/API-CONTRACT.md](docs/API-CONTRACT.md); implementation status lives in [TASKS.md](TASKS.md).

## MVP direction

Engineer 3 now prioritizes structured controls → ranking → globe → What If?. Budget and duration use sliders; climate uses category buttons, with a travel-month selector and interest chips. Gemini parsing is deferred to post-MVP AI-07. See the revised [Engineer 3 tickets](tickets/ENGINEER-3-AI-INTEGRATION.md). The existing API already accepts structured preferences directly.

AI-02 now provides structured controls and direct ranking submission; see the [implementation spec](docs/AI-02-SPEC.md). Main now includes the backend catalog and details; globe components and the ranking endpoint remain pending. Automatic debounced reranking is scheduled for AI-04.

## Frontend (AI-02)

Requires Node.js 22.12+ and npm. From the repository root:

```sh
npm ci --prefix frontend
VITE_DEMO_MODE=true npm run dev --prefix frontend
```

Open the localhost URL printed by Vite. No backend is needed in explicit demo mode. Follow the five-step wizard: budget ($1,500 default), days (5 default), climate, month, interests, then **Find destinations**. Select a city to change the selected destination. The banner identifies invented, fixed sample scores; editing controls does not recompute fixtures. Unknown costs and photos display as unavailable.

Live mode is the default. Configure `frontend/.env.local` using `frontend/.env.example`, leave `VITE_DEMO_MODE=false`, and start `npm run dev --prefix frontend`. `VITE_API_BASE_URL` is the backend origin (without `/api`). Restart Vite after changing environment variables. Live submission calls only the ranking endpoint. Gemini is not required; unavailable services show an error with retry, never silent demo results. Never put API secrets in a `VITE_` variable.

```sh
npm run build --prefix frontend
npm test --prefix frontend
```

## AI-01 handoff (historical foundation)

Outcome: matching TypeScript interfaces, typed API methods, root-owned state, and a working explicitly labeled fixture search/results UI.

Files: `frontend/src/types/travel.ts`, `frontend/src/services/api.ts`, `frontend/src/App.tsx`, their tests, frontend entry point/styles/configuration/package files, `.gitignore`, this README, and ticket status files.

Dependencies/contracts: `docs/API-CONTRACT.md` and the three unchanged JSON fixtures in `shared/`. Backend Pydantic models and Engineer 1 components were absent at implementation time; reconcile with the canonical models when they arrive. Engineer 1 can consume the shared types and receive destinations, results, selected ID, and selection callbacks from App. No globe, destination display components, scoring internals, or backend files were changed.

Acceptance verification: automated UI test submits a sample search with no backend, confirms the development warning and unavailable costs, switches the selected city, and verifies selection survives another response. API tests cover endpoint paths, request bodies, null fixture costs, HTTP/network errors, empty input, and cancellation. Strict TypeScript and production build must pass.

Manual check: run demo mode, load sample results, select Kyoto, submit again, and confirm Kyoto remains selected. Restart without demo mode and without a backend: confirm a visible connection error and **Retry cities** action. Browser layout remains a manual check; the automated UI test runs in jsdom.

Limitations: temporary text UI pending Engineer 1's components; demo parse/rank is fixed fixture data, not a real parser or scoring implementation. Demo destination detail has null cost/climate data. No What If controls yet. HTTP JSON is typed but not runtime schema-validated; backend Pydantic validation remains canonical.

## AI-02 handoff

Outcome: budget/duration sliders and number inputs, climate buttons, month selector and interest chips submit directly to ranking. The compact wizard starts with approved testing defaults of $1,500 and 5 days; all other preferences are undecided. Back/Next preserve answers, and successful submission shows a summary with Edit preferences. Edits cancel in-flight ranking and mark previous results stale; failures preserve results. Optional fields clear to null and invalid numbers block submission.

Files: `frontend/src/components/preferences/PreferencesPanel.tsx`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, `frontend/src/style.css`, `docs/AI-02-SPEC.md`, this README, task board and owner ticket. Existing API types/client and shared fixtures are unchanged.

Verification: run the test/build commands above. Manual path: start explicit demo mode, advance through the wizard, edit controls, find destinations, select Kyoto, edit preferences and resubmit; check keyboard use and narrow layout. Against BE-04, use **Find destinations** and confirm only `/api/recommendations` receives preferences. No Gemini key or parser is needed.

Limitations: live BE-04 acceptance remains pending; mobile budget entry requires vertical scrolling. The temporary result list awaits Engineer 1 integration; demo scores remain fixed fixtures. Automatic reranking belongs to AI-04. See the spec for acceptance coverage.

Verified in this checkout: `npm test --prefix frontend` passed all 10 tests; `npm run build --prefix frontend` passed strict TypeScript and the Vite production build. `git diff --check` passed. Chromium desktop/mobile and live catalog/detail checks passed; live ranking remains pending.

Follow-up validation: real Chromium wizard checks passed at desktop/mobile widths. Engineer 2 models at `01218fc` accept wizard payloads; live ranking is blocked by missing destination/recommendation endpoints and CORS. See [integration findings](docs/AI-02-INTEGRATION-CHECK.md) for evidence, limitations, and the proposed merge sequence.

Latest backend integration: [PR #1 review](docs/PR-1-REVIEW.md) verifies the 12-city catalog and details through the real frontend client. Use the exact `http://localhost:5173` frontend origin for its CORS configuration. Ranking remains unavailable until BE-04; see the review for the tested two-server commands.
