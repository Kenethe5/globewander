# AI-02 integration check

## Revisions and isolation

Validated origin/engineer-2 at `01218fc` (fetched from origin) against the current Engineer 3 wizard working tree based on `56f4638`. Extracted the backend into `/tmp/wandersphere-engineer2-validation`; no owner backend files or main branch were modified. Browser tooling and Python dependencies were installed outside the project. No merge or push was performed.

## Verified

- Engineer 2 Pydantic models accept the wizard defaults ($1,500, 5 days), cleared optional values, and a custom budget/month/climate/interests profile. Invalid duration values 0, 31 and 1.5 are rejected.
- Shared destination and recommendation fixtures validate against backend models. These remain invented test scores, not live recommendations.
- Health endpoint passes via FastAPI TestClient. The unmodified app also starts with Uvicorn on port 8000.
- Real headless Chromium checks pass at 1280×800 and 375×812: one question at a time, approved defaults, keyboard slider changes, Back preserves answers, all five steps have no horizontal overflow, demo submission, city selection, and Edit preserves values. No JavaScript page errors in the demo flow.
- Live-mode frontend against the running backend shows catalog failure and Retry cities; it does not silently use demo fixtures.
- Screenshots reviewed for desktop and mobile budget step. Mobile requires vertical scrolling to reach Next; this is a compactness concern for a later agreed polish change, not a completed one-screen mobile design.

## Backend integration blockers

At the tested revision, `main.py` registers only `/api/health`:
- GET `/api/destinations`: 404.
- GET `/api/destinations/lisbon`: 404.
- POST `/api/recommendations`: 404.
- Recommendation CORS preflight: 404, no allow-origin header.

The branch has no dependency manifest or backend tests. Validation used temporary FastAPI 0.143.0, Pydantic 2.14.0 and HTTPX 0.28.1; Engineer 2 should declare supported dependencies. Backend permits budget zero while the wizard requires positive values or null; all wizard-produced valid values are accepted, but the zero-budget policy should be settled before broader API use.

## Proposed merge sequence

1. Engineer 2 prepares a small backend PR: declare dependencies, configure local frontend CORS, remove tracked `.DS_Store`/`__pycache__` files, and add foundation tests. Complete BE-02/03/04 for destination data and real rankings.
2. Commit Engineer 3's approved wizard and scope/spec documentation on its existing feature branch, with tests/build evidence. Review it independently of backend scoring.
3. Assemble both reviewed branches on an integration branch and run real controls → ranking checks with two different profiles, plus budget/null/error cases. Current committed branches have no source-file conflicts in a read-only merge preview; Engineer 3's pending changes also do not overlap backend additions. Recheck after new commits.
4. Merge reviewed PRs into main after their relevant checks pass. The backend foundation and frontend can land independently, but do not call AI-02 live integration complete until real endpoints pass. Add Engineer 1 globe integration under AI-03 after its own handoff.

## Needed from the user/team

Confirm with Engineer 2 whether BE-02–04 exist locally or on another branch and have them push that work. If they are still implementing, share the missing endpoint/CORS/dependency findings above. No Gemini credentials are needed. Engineer 3 can rerun the live acceptance checks once the backend is ready.

## Superseding follow-up: PR #1 at f476baa

The earlier missing-catalog/CORS findings above applied to `01218fc`. PR #1 now supplies 12 live city summaries/details and CORS for localhost:5173. Real Chromium successfully connected the current wizard/API client to this unmodified backend; the recommendation endpoint remains absent. See [PR #1 review](PR-1-REVIEW.md) for current evidence, run commands, and merge recommendations.
