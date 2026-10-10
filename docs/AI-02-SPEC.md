# AI-02 — Structured preference controls and direct ranking

## Outcome and scope

Replace the transitional natural-language form with accessible structured controls that submit the complete `TravelPreferences` object directly to `/api/recommendations`. No Gemini call or key is required. Keep Python responsible for ranking. API shapes, scoring weights, fixtures, and Engineer 1 display components are unchanged.

Implementation sequence: (1) controlled preference panel and validation, (2) root-owned submission/cancellation and result states, (3) integration tests, build, and handoff notes. Automatic 300ms reranking is AI-04; globe/details integration is AI-03.

## Approved interaction contract

Approved in conversation before this wizard implementation: a compact, one-question-at-a-time flow, budget and days first, with $1,500 and 5 days as testing defaults.

1. **What's your budget?** USD slider ($100–$10,000, $100 steps), visible editable amount, “excluding flights” label. Starts at $1,500. Positive custom amounts outside the slider range remain accepted in the number field.
2. **How many days?** Integer slider and number field, 1–30 days, starting at 5.
3. **What weather sounds good?** Any / Cold / Mild / Warm buttons; starts Any.
4. **When would you go?** Month selector plus Not sure; starts Not sure. Explain that climate scoring needs a month.
5. **What do you enjoy?** Optional multi-select chips for all six interest enums; starts empty. Final action: Find destinations.

- One compact panel, Step N of 5 and progress indicator, Back/Next navigation, no extra review screen. Preserve all answers when navigating. Focus the question heading when changing steps.
- Budget and duration can be cleared to null. Other questions have no-preference options; interests are not required. No assumed origin. Defaults belong to the wizard, not the shared API default object.
- Sliders have labels and visible values; numeric validation blocks Next and submission. Enter on an earlier step advances instead of submitting rankings.
- Submit only at the final step; no requests on navigation or edits. The full unwrapped preferences object goes directly to ranking. No Gemini calls.
- On success, collapse the wizard into a compact preference summary and Edit preferences button. Editing reopens step 1 with retained values. No additional review step before submission.
- Edits cancel pending ranking immediately and mark retained results stale. Loading/errors preserve prior results; retry uses current values. Catalog errors have separate retry. Preserve selected ID when present in latest results, otherwise select first eligible or null.
- Demo scores remain fixed and explicitly labeled; Find destinations loads fixtures in demo mode. Unknown costs stay unavailable and null scores are “Not scored.” Budget/duration affect affordability only with sourced cost data. Preserve and warn about any future total-trip scope.

## Files and dependencies

`frontend/src/components/preferences/PreferencesPanel.tsx`, `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, `frontend/src/style.css`, README, task board, owner ticket, and this spec. Use existing client/types and `docs/API-CONTRACT.md`; BE-04 is needed for live acceptance. No new package dependencies.

## Verification and acceptance

Passed: `npm test --prefix frontend` (10 tests), `npm run build --prefix frontend` (strict TypeScript and production build). Tests cover the approved defaults, one visible question, navigation and answer preservation, exact submitted payload, optional answers, validation/boundaries, custom budgets/sliders, zero parser calls, cancellation, retained results, selection and explicit fixtures. Early form submission advances instead of calling ranking.

Manual path: run `VITE_DEMO_MODE=true npm run dev --prefix frontend`; accept or adjust budget, Next to days, climate, month and interests, then Find destinations. Check the compact summary, select Kyoto, Edit preferences and resubmit. Verify keyboard navigation and a narrow viewport. With BE-04 running, confirm real ranking changes and no parser dependency; stop backend to verify retry.

Live ranking acceptance remains pending; real Chromium layout/navigation and keyboard-slider checks passed. Fixture tests do not prove real rankings. Automatic updates remain AI-04; globe/details integration remains AI-03.

Follow-up validation: real Chromium wizard checks passed at desktop/mobile widths. Engineer 2 at `f476baa` supports live catalog/detail calls and localhost:5173 CORS; the recommendation endpoint remains missing. See [integration findings](AI-02-INTEGRATION-CHECK.md) for evidence, limitations, and the proposed merge sequence.
