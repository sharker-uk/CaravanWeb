# LP-0 / LP-1 implementation checkpoint

**Branch:** `feat/lp-0-1-living-park-foundation`
**Status:** Draft for review; **not merged, deployed or browser-validated**.

## Included in this first slice

- Reuses `state.player` from the existing schema-13 game state; no new save schema or second simulation.
- `src/living-park-movement.js` supplies deterministic 4-neighbour pathfinding, adjacent interaction routing and collision-checked one-tile stepping.
- `tests/living-park-movement.test.js` covers blocked movement, boundaries, approach routing, unreachable targets and determinism.
- Management SVG map can render a simple player marker and follow it using the existing camera transform.
- Optional **Walk park / Map view** toggle keeps the existing management interface intact. WASD/arrows walk in logical tile space; clicking ground walks toward it. Clicking a tree/debris walks to an adjacent tile; **E** clears it through the existing `CaravanGame.build('clear',...)` command and timber/economy rules.
- Map mode preserves existing map pan/rotate/build controls; walking mode uses the same game state and save.

## Known limits and next steps before approval

- **No runtime or browser test has been executed by this GitHub-only change.** Run `npm run check:syntax && npm test` locally/CI, then desktop/mobile browser smoke tests.
- The avatar is a temporary SVG marker, not yet the configurable `CharacterSystem` sprite.
- Walking currently moves one tile per key press; click-to-walk steps on a short timer. No directional animation or smooth interpolation yet.
- Walking mode currently shares the management screen. LP-2 will make the tablet the gateway to that screen.
- Tree/debris E action is in place; inspect/prune, shops, guests, facilities and other interactions still need an interaction registry.
- Spawn validation/repositioning and robust save import/new-scenario reset handling need additional work; don't approve LP-1 as complete until those are tested.
- Camera follows while walking but camera rotation is still available in map mode; confirm input handling at 90°/180°/270°.
- The current map still uses procedural SVG scenery; the uploaded art packs belong to LP-3.
- No advertising or monetisation code is included.

## LP-0 validation checklist

- [ ] Capture desktop/mobile before/after screenshots on the private Cloudflare preview.
- [ ] Run syntax checks and all tests; investigate any failures.
- [ ] Verify farm start, developed start, old-save migration, save export/import and recovery backup.
- [ ] Confirm no duplicate simulation clock/ledger transactions when toggling walking.
- [ ] Verify player collision against trees, facilities, guest pitches and park boundaries.
- [ ] Verify camera rotation/zoom, build mode, map pins and management search are unchanged.
- [ ] Test mouse, keyboard, narrow viewport and physical touch where available.
- [ ] Confirm tree interaction only grants timber once and remains cleared after reload.

**Review rule:** no merge or public deployment until these checks pass and the Owner approves the playable preview.

## Follow-up: walk-first and tablet management (20 Nov 2026)

- Default mode is **Walk**, with the management masthead/sidebar/finance/build tools visually hidden. **Tablet** button and Tab (outside form fields/dialogs) reveal the existing management UI; Tab/Escape returns to walking.
- Smooth movement uses requestAnimationFrame delta-time, 4 logical tiles/sec, normalized diagonals and the existing `GameStateApi.canOccupyPlayer` collision predicate. WASD/arrows move continuously while held; click-to-walk follows tile-centre waypoints with continuous interpolation.
- Character remains in the same world and simulation; switching modes does not create a second game or pause the clock.
- Walk mode handles physical clearing with E after approaching trees/debris. Planning/building, roads, pitches, utilities, bookings and finances remain in the tablet. Walk mode does not expose the build UI.
- Avatar position updates without reconstructing the whole SVG map; camera-follow does not write localStorage every frame.
- Movement unit tests expanded for frame-time movement, diagonal normalization, collision and path completion.

**Outstanding verification:** GitHub connector edits were not run in a browser or local Node process. Cloudflare preview smoke test and `npm test` remain required. Additional physical interactions, sprite animations, mobile touch movement and improved character appearance remain separate work.
