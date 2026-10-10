# Judging Demo Checklist — Single-User WanderSphere

## The demo hook (0:00–0:15)

“Planning a trip is easy once you've chosen a destination. But what if you don't know *where* you want to go? WanderSphere turns your preferences into a living travel map.”

## The 90-second demo

1. **0:15–0:30:** Show the 3D globe, briefly rotate it, point to city markers. Say recommendations cover selected cities, not every country.
2. **0:30–0:45:** Set controls: 5 days, December, Warm, Beaches + Food, $1,500 **excluding flights**. Click “Find destinations.” These controls are planned in AI-02; the current AI-01 screen remains transitional.
3. **0:45–1:00:** Globe highlights top city matches; select the first card and fly to it. Open its brief details and tradeoff explanation.
4. **1:00–1:20:** Switch the interests from beaches to culture and the climate preference to cold. Show instant reranking using only the ranking endpoint.
5. **1:20–1:30:** Explain the stack: controls supply structured preferences; Python computes matches; React/Three.js renders the globe. Gemini is deferred until after MVP.

## Never promise these in the pitch

- “Finds the best country in the world” — only curated cities have data.
- “Real-time hotel/flight prices” — there is no live booking inventory.
- “All-in budget verified” — no airfare pricing in MVP.
- “AI plans and books the whole vacation” — out of scope.

## Before demo begins

- [ ] Judging laptop/browser renders WebGL globe at smooth frame rate.
- [ ] Frontend and backend are running; correct API URL and CORS.
- [ ] The entire MVP runs without a Gemini key or parser endpoint.
- [ ] Controls and two contrasting interest/climate profiles with explicit months tested.
- [ ] Selected destinations have legitimate highlights and visible caveats.
- [ ] One offline/mock fallback works **with a clear DEMO label**.
- [ ] Team knows who talks, who clicks, and who answers technical questions.

## If something fails

- **Ranking slow:** retain previous results with an updating indicator; on failure show error/retry and label previous results as stale.
- **Network down:** run local backend and fixture mode labeled demo-only.
- **Weather or cost missing:** show typical climate or “No verified estimate”; do not substitute invented numbers.
- **Globe lagging:** disable atmosphere/auto-rotate, reduce texture and GeoJSON complexity.
- **Ranking isn't changing:** ensure the toggle changes a component that actually has data (interests/climate are safer than unsourced budgets).

## Closing pitch

“Most travel apps ask where you want to go. WanderSphere helps you discover the destination that actually fits your trip—and shows how the answer changes when your priorities do.”
