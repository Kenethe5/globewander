# WanderSphere

One-user travel discovery MVP. The shared API is defined in [docs/API-CONTRACT.md](docs/API-CONTRACT.md); implementation status lives in [TASKS.md](TASKS.md).

## Frontend (AI-01)

Requires Node.js 22.12+ and npm. From the repository root:

```sh
npm ci --prefix frontend
VITE_DEMO_MODE=true npm run dev --prefix frontend
```

Open the localhost URL printed by Vite. No backend is needed in explicit demo mode. Click **Load sample results** to load the shared preferences and ranking fixtures; select a city to change the selected destination. The banner and warnings identify the fixed sample parse and invented scores. Input text does not affect demo results. Unknown costs and photos display as unavailable.

Live mode is the default. Configure `frontend/.env.local` using `frontend/.env.example`, leave `VITE_DEMO_MODE=false`, and start `npm run dev --prefix frontend`. `VITE_API_BASE_URL` is the backend origin (without `/api`). Restart Vite after changing environment variables. The backend and Gemini parser are separate tickets; unavailable services show an error with retry, never silent demo results. Never put API secrets in a `VITE_` variable.

```sh
npm run build --prefix frontend
npm test --prefix frontend
```

## AI-01 handoff

Outcome: matching TypeScript interfaces, typed API methods, root-owned state, and a working explicitly labeled fixture search/results UI.

Files: `frontend/src/types/travel.ts`, `frontend/src/services/api.ts`, `frontend/src/App.tsx`, their tests, frontend entry point/styles/configuration/package files, `.gitignore`, this README, and ticket status files.

Dependencies/contracts: `docs/API-CONTRACT.md` and the three unchanged JSON fixtures in `shared/`. Backend Pydantic models and Engineer 1 components were absent at implementation time; reconcile with the canonical models when they arrive. Engineer 1 can consume the shared types and receive destinations, results, selected ID, and selection callbacks from App. No globe, destination display components, scoring internals, or backend files were changed.

Acceptance verification: automated UI test submits a sample search with no backend, confirms the development warning and unavailable costs, switches the selected city, and verifies selection survives another response. API tests cover endpoint paths, request bodies, null fixture costs, HTTP/network errors, empty input, and cancellation. Strict TypeScript and production build must pass.

Manual check: run demo mode, load sample results, select Kyoto, submit again, and confirm Kyoto remains selected. Restart without demo mode and without a backend: confirm a visible connection error and **Retry cities** action. Browser layout remains a manual check; the automated UI test runs in jsdom.

Limitations: temporary text UI pending Engineer 1's components; demo parse/rank is fixed fixture data, not a real parser or scoring implementation. Demo destination detail has null cost/climate data. No What If controls yet. HTTP JSON is typed but not runtime schema-validated; backend Pydantic validation remains canonical.
