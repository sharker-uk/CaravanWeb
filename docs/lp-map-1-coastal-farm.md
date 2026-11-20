# LP-MAP-1 — Village-first coastal farm integration

## Non-negotiable world model
The existing **LittleHampton-on-Sea** village (`data/village-world.json`) is the master world. Keep its High Street, Natwinch Road, Church Lane lights, shops, housing, coastal quarter, bypass and traffic simulation. **Do not create a standalone coastal farm world or replace the village with an isolated park.**

The original farm sits in the existing village park inset beside Natwinch Road, with the old farmhouse next to the drive. It extends towards the dunes and beach. North and south parcels have varying sizes, and a separate field across the road could become pitches or parking. The main rough beach path is usable from day one; a gangway is a quality upgrade. Some coastal expansion parcels may offer secondary routes.

## What this draft actually changes
- `src/coastal-farm-layout.js`: village-anchored proposal using the existing village park and road-node coordinates, **not** a replacement world generator.
- `data/village-world.json`: QuickStop, a supplies shop, café and pub become selectable village destinations using the **existing** building positions. Their descriptions identify future gameplay; no transactions, inventories or guest AI have been added.
- Contract tests cover the village anchor and field configuration.

## Next implementation phases
1. Validate field footprints against roads, homes, village landmarks and the beach, then render hedges, gates and sale parcels in the village. The present geometry is **provisional**, not collision-cleared.
2. Make the village the primary navigable world and embed the park's existing tiles, sprite player and nature rendering at its established coordinate transform. Preserve the current park gameplay and saves.
3. Implement walkable links between park gate, High Street shops and beach. Guests and player can visit village destinations; test pathfinding and camera bounds.
4. Introduce a modest village-shopping loop: supplies/tools bought in shops, collection or delivery, opening hours and inventory. Use existing economy ledger; don't duplicate park shops or silently remove existing facilities.
5. Replace the old sequential meadow/dunes expansion logic with purchasable adjacent fields and a separately governed road-crossing parcel, with save migrations.
6. Model rough public beach path and gangway as distinct states; preserve paid upgrades in old saves.
7. Test traffic, guest demand, UI, saves, accessibility and existing map graphics end to end.

## Safety
**Draft PR.** The village remains intact. New shops are informational destinations only; no economic changes or world switching have been completed. Do not claim a seamless world or working shop purchases yet.

## Implementation update — village data renderer
The management SVG now loads `data/village-world.json` and draws its actual road segments, building footprints and destination names in the park coordinate system. This replaces the invented roadside strip. This is **visual-only**: player movement still uses the park's 60×40 tiles, and the shop destinations are not yet transactional. Do not claim continuous walkability or a completed land expansion migration. The village render needs browser verification against the Cloudflare preview before approval.

## Gated-region walking prototype (latest)
- Added `src/region-gate.js` with a single-use session-scoped transition between park and village, plus tests.
- In management walk mode, walking west through the designated gate corridor (x ≤ 2.5, y 18–25) saves the park and opens `village.html#walk`.
- Village walk mode now places a visible avatar at the village's authoritative `parkGate` node, accepts WASD/arrow movement along road corridors, follows the player with the camera, allows E to inspect nearby village places and E to return to the park gate.
- **Important:** This is a cross-page region switch, not a seamless renderer swap. The first version requires checking that the gate corridor is reachable with the existing park collisions. Village shop interaction currently displays place information; purchases are not implemented. The village avatar is a placeholder, not the animated park sprite. No live browser/Cloudflare acceptance test has been run.
- Next: test and fix entrance walkability, add pavements and collision, maintain animation/direction across transfer, and implement purchases and the agreed land parcel migration.
