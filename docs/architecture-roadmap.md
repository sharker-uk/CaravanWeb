# Architecture roadmap

## Phase 1 — Safe foundation

- [x] Create an isolated refactor branch.
- [x] Extract inline CSS and JavaScript without intentionally changing game rules.
- [ ] Verify the extracted build in a browser and inspect the Cloudflare Pages preview.
- [ ] Add lightweight automated checks for syntax, save compatibility, grid/pathfinding and economy.

## Phase 2 — Separate simulation from presentation

- [ ] Define a small, explicit game-state interface.
- [ ] Move pathfinding and walkability into a testable module.
- [ ] Separate simulation updates from canvas drawing and UI refresh.
- [ ] Add save-version migrations without invalidating existing local saves.

## Phase 3 — Gameplay systems

- [ ] Give guests independent world positions and simple activity state machines.
- [ ] Keep guest pitch occupancy independent from where the guest is walking.
- [ ] Add collision-aware, route-aware NPC movement and fallback destinations.
- [ ] Separate utility connection availability, accommodation requirements and price premiums.
- [ ] Keep guest stay payment upfront; keep daily rental income distinct.

## Phase 4 — Art pipeline

- [ ] Evaluate a free tileset against the 16×16 grid and the intended rusty-resale-to-brighter-park visual progression.
- [ ] Add a renderer abstraction so placeholder shapes can be replaced without changing simulation rules.
- [ ] Track asset source and licence in an asset manifest.

## Cloudflare decision

Remain on Cloudflare Pages for static hosting and preview deployments. Consider Pages Functions or Workers only when there is a concrete server-side requirement (for example, shared parks, accounts, cloud saves or a leaderboard). Consider D1 for relational persistent data and R2 for larger uploaded assets only when those features are actually needed. No migration is required for this refactor.
