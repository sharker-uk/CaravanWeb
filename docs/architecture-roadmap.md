# Architecture roadmap

## Phase 1 — Safe foundation

- [x] Create an isolated refactor branch.
- [x] Extract inline CSS and JavaScript without intentionally changing game rules.
- [ ] Verify the extracted build in a browser and inspect the Cloudflare Pages preview.
- [x] Add lightweight automated checks for syntax, save compatibility, grid/pathfinding and economy.

## Phase 2 — Separate simulation from presentation

- [x] Define a small, explicit game-state interface.
- [x] Move pathfinding and walkability into a testable module.
- [x] Separate simulation updates from canvas drawing and UI refresh.
- [x] Add save-version migrations without invalidating existing local saves.

## Phase 3 — Gameplay systems

- [x] Give guests independent world positions and simple activity state machines.
- [x] Keep guest pitch occupancy independent from where the guest is walking.
- [x] Add collision-aware, route-aware NPC movement and fallback destinations.
- [x] Separate utility connection availability from accommodation requirements and placement feedback.
- [x] Keep guest stay payment upfront; keep daily rental income distinct.
- [x] Replace hourly guest spawning with demand- and vacancy-limited arrivals.
- [x] Record cash movements in a reconciled transaction ledger and seven-day balance.
- [x] Base satisfaction on guest utilities, accommodation condition and visited facilities.
- [x] Model guest party composition, booking dates, preferences and seasonal demand.
- [x] Enforce operational toilet/shower capacity and account for facility operations, shop stock and laundry.
- [x] Exercise three-week operating costs and revenue through the transaction ledger.
- [x] Follow the player camera and support drag-to-build pitch areas and utility lines.

## Phase 4 — Art pipeline

- [ ] Evaluate a free tileset against the 16×16 grid and the intended rusty-resale-to-brighter-park visual progression.
- [ ] Add a renderer abstraction so placeholder shapes can be replaced without changing simulation rules.
- [ ] Track asset source and licence in an asset manifest.

## Cloudflare decision

Remain on Cloudflare Pages for static hosting and preview deployments. Consider Pages Functions or Workers only when there is a concrete server-side requirement (for example, shared parks, accounts, cloud saves or a leaderboard). Consider D1 for relational persistent data and R2 for larger uploaded assets only when those features are actually needed. No migration is required for this refactor.
