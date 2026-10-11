# Team integration status after Engineer 1 rebase

## Branches and merge requests

- `main`: PR #1 backend foundation and PR #2 frontend foundation/wizard are merged (`3ac2717` before this rebase).
- `engineer-1-globe-ui`: rebased onto main; draft PR #3 remains the globe/display handoff. Default entry preserves the approved app. `/globe-preview.html` exposes the separate fixture preview for development. Do not treat preview-derived prices or scores as live results.
- `engineer-2`: `f476baa` is already included in main; no newer remote backend commits found.
- `engineer-3-connecting-backend-to-frontend`: `fe0384f` is included in main through PR #2. Future AI-03 work should branch from the reviewed combined baseline, rather than rebuilding a second frontend.
- Local branch names may lag remote main; `origin/main` is the fetched shared baseline. Temporary review worktrees are not additional product branches.

## Ticket evidence and next work

| Tickets | Current evidence | Remaining acceptance/work |
|---|---|---|
| FE-01 | Globe component, local geometry, resize and camera code supplied | Full country/marker interaction and judging-laptop acceptance; Chromium mount/drag/zoom/resize smoke passed |
| FE-02 | Country/marker click callbacks supplied | Root supported-city lookup and “Not yet covered”; preview currently launches a continent-scoped wizard |
| FE-03 | Prop-driven colors and unit tests supplied | Verify real App results drive globe after AI-03 |
| FE-04 | Cards/details components supplied | Live/demo labels, fixture attribution, real details wiring and null-state integration |
| FE-05 | Camera/projection/polish implementation supplied | Judge-laptop performance and responsive acceptance |
| BE-01 | Models, health, local CORS tested; merged | Dependency manifest, maintained tests, request-validation acceptance |
| BE-02 | 12 cities and all list/detail responses tested; merged | Maintain automated data/API coverage and complete source review |
| BE-03 | Interest scoring implemented and sampled | Climate, affordability, combined score and hard-constraint logic |
| BE-04 | Not implemented | Recommendation endpoint and unit/integration suite — live ranking blocker |
| BE-05 | Null prices and source metadata present | Full source/error/operational audit |
| AI-01 | Complete and merged | No new foundation work needed |
| AI-02 | Approved wizard implemented, tests and browser checks pass | Keep live acceptance open until BE-04 works |
| AI-03 | Components now available in combined branch | Agree spec, then connect AppShell/globe/cards/details to App and real catalog |
| AI-04 | Planned | Debounced What If? reranking after initial search |
| AI-05 | Planned | Reliable local/deployed live demo, failure paths and rehearsal |
| AI-06/07 | Deferred | Optional extras and Gemini after MVP |

Implementation present does not automatically mean a ticket's full Done when condition has passed. Existing checkboxes remain conservative.

## Next decisions

Agree AI-03's initial layout and country/city selection behavior before coding. Preserve the five-step wizard and Python-owned ranking. Coordinate display-component contract changes with Engineer 1; do not adopt the preview's synthetic scoring, extra city IDs, or climate hard filter into live mode. Engineer 2 can complete BE-03/04 concurrently.

## Rebase verification

All 19 tests pass across the wizard/API and globe suites. Strict TypeScript and the default production build pass. Chromium verified the default five-step flow and separate WebGL preview at 1440×900, plus drag/zoom/resize smoke at 900×700 without JavaScript page errors. This is not full country-click, photo-source, or live-ranking acceptance.
