# LP-MAP-1 — Coastal Farm World Layout (phase 1)

## Agreed geography
- **Main road on the western side**, coast and dunes to the east. This follows the intended real-world orientation rather than the rotated discussion sketch.
- **One long starting property** extends from its roadside entrance to the dunes; the old farmhouse sits beside the original farm drive.
- **North and south neighbouring fields**, each split into parcels of different sizes. Coastal parcels can eventually offer secondary beach access.
- **Roadside field across the public road**, intended for parking or pitches with future safe-crossing/traffic considerations.
- **Main beach access through the original farm** exists on day one as a rough dune path; a gangway is a later improvement, not an unlock for the beach itself.

## Phase 1 deliverable
`src/coastal-farm-layout.js` defines the proposed geometry, route and parcel identifiers independently of saves, building permissions and purchase logic. Contract tests verify boundaries and non-overlap. **This phase intentionally does not activate the new layout in gameplay.**

## Required before enabling the layout
1. Rework the existing 60×40 world generator and farmhouse/drive/entrance placements together. Verify village road alignment and playable camera bounds.
2. Migrate the legacy `meadow` and `dunes` expansion states, preserving purchased land and constructions; do not silently remove existing pitches.
3. Replace the old sequential purchase dependencies with adjacency and road-crossing rules. A field across the road needs an explicit crossing/connection policy.
4. Model ownership as an independent mask from terrain and public footpaths; prevent movement and construction on unowned farmland, without blocking the main dune route.
5. Convert beach mechanics to an available-but-rough route and a separate optional gangway construction. Migrate already-purchased beach upgrades.
6. Draw actual hedges, fences, farm gates, roadside access and rough dune trail from the same geometry; keep player sprites and LP-G1 nature graphics.
7. Update tutorial, guest complaints, accessibility and tests for new and legacy saves.

## Scope and safety
This is a **foundation PR**, not a claim that the game map has already changed. The existing map and purchases remain functional until the migration and rendering are implemented and tested. Do not merge without checking parcel geometry and the full follow-up plan.
