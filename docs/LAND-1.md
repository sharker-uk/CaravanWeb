# LAND-1 — External land parcels (work in progress)

## Goal
Move purchasable land from the original internal 60×40 park tiles into neighbouring fields without breaking existing parks, utilities, or purchases.

## Phase 1: geometry foundation (implemented)
- `src/land-parcels.js` defines five non-overlapping external fields in the same scene-tile coordinates as `src/connected-world.js`: two northern, two southern, and one across the village road.
- Field rectangles cannot overlap the starting farm, and the module exposes conversion to village world coordinates.
- `tests/land-parcels.test.js` covers separation and coordinate round trips.
- This geometry is **not yet wired to rendering, purchases, or construction**. Existing `LandExpansion` behaviour remains unchanged on this branch at this checkpoint.

## Phase 2: migration and rules (in progress)
- Added deterministic mapping of legacy `meadow`/`dunes` rights to `north_field`/`north_coastal`, deduplicated without touching the saved state.
- Added a deny-by-default external parcel development predicate, with unit tests. It is **not wired into the game build commands yet**.
- **Important architecture blocker:** `GameState.getTileProperties`, placement validation, construction, utilities and the management bridge currently index `state.tiles[y][x]` directly. External fields north and west of the farm have negative scene coordinates. A naive field move would allow purchases but crash or deny all development. We must introduce a scene-to-storage tile mapping or a parcel-backed grid before switching the live land office.

## Phase 2 checkpoint: isolated external terrain
- Added `src/external-terrain.js`: deterministic grass/brush defaults for external parcels, sparse keyed storage, strict validation, ownership-checked writes, and JSON-compatible snapshot/restore.
- Added `tests/external-terrain.test.js` for deterministic reads, unchanged legacy grid, ownership enforcement, roundtrips, and malformed data rejection.
- **Not integrated with the browser save pipeline or build commands yet.** Do not claim external fields are playable until the game engine, save migrations, and UI use this interface.
- This default vegetation is temporary deterministic terrain initialization, **not** the LAND-2 landscape redesign.

## Remaining Phase 2 work
1. Preserve the legacy IDs `meadow` and `dunes` and map their ownership to agreed external parcels; do not charge existing owners again. Do not infer new ownership from modified building locations.
2. Decide how external plots extend the editable tile grid and utility/path graph. A visual rectangle outside the grid is not buildable land.
3. Extend the construction, placement, pathfinding, terrain and collision APIs to support external parcels only when owned.
4. Migrate saved parks idempotently with an untouched pre-migration backup and without clearing user-created roads or pitches.
5. Move the land-office and map markers only when the backing construction model is ready.
6. Retain beach-access dependency and avoid retroactively invalidating already built beach facilities.

## Guardrails
- No changes to continuous walking, camera, shops, or terrain generation.
- No main-branch writes and no merge without approval.
- A passing geometry unit test is not sufficient: verify new and legacy saves and browser building/purchase flows before merging.


## South Field instant-purchase development checkpoint

This is a **development-only purchase flow**, not the planned two-day conveyancing system.

1. Open the Cloudflare development build with `?landTest=1` appended to the URL.
2. In the tablet, choose **Park → Start another park → New farm**. This backs up the current park through the existing scenario flow. The **new** park receives a one-time **£12,000** ledger-recorded development grant on top of the standard £1,500, giving £13,500 starting cash. Do not use an existing park for the grant test.
3. Open **Land & beach** and find the **Caister Coastal Estates · Development Test** listing for **South Field**.
4. Confirm the instant **£6,500** purchase. Expected cash after purchase: **£7,000** before other spending.
5. Save, reload and confirm South Field still shows as owned and cannot be purchased again.

The grant and purchase UI are exposed only with the `landTest=1` URL parameter. A normal new game keeps the original starting cash and does not expose this instant external purchase route. The grant is applied only when creating a new farm, not on opening existing saves. Purchases use the existing economy ledger and the saved land ownership list.

**Known limitation:** this checkpoint proves purchase, ledger and persistence. External construction, player clearing, utility connection and path/pitch placement are **not yet integrated** into the live 60×40 simulation. Do not describe the purchased South Field as fully playable yet. The field art remains a preview and its irregular boundary is not yet the authoritative ownership polygon.
