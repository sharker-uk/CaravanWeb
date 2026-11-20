# CaravanWeb — Living Park, Tablet, Art & Monetisation Roadmap

**Status:** Proposed for approval — planning only. No runtime, save, ads or deployment changes in this branch.
**Baseline:** Main branch, 20 November 2026.
**Vision:** A character-led British coastal caravan-park management game: *walk the park, work the land, run the business from a tablet*.

## 1. Product principles (approved direction)

1. **One world, one simulation.** The character and tablet are two interfaces to the same park. Do not fork economies, world state, bookings, construction or save formats.
2. **Physical charm, managerial convenience.** Walk up to trees, debris, guests and shops to interact; tablet gives immediate access to administration. Never require walking to a distant office just to see finances.
3. **No mandatory ads.** No forced videos, pop-ups during play, ad-click requirements, gameplay locks, or advertising disguised as game actions.
4. **Fictional advertising is worldbuilding.** Weathered shop signs, noticeboards, caravan dealer banners and coastal posters are decorative and can evolve as the park improves. Keep clearly separated from paid promotions.
5. **Incremental integration.** Preserve the current management map, SVG camera/pins/routes, classic walkabout, village and Cloudflare Pages deployment while validating the replacement visual path.
6. **Existing save first.** Preserve `caravan_tycoon_save` and schema-13 compatibility; any new persisted state needs a tested migration, export/import and backup/recovery story.
7. **UK seaside character.** Warm, slightly imperfect, recognisable details rather than a generic sterile resort. Brightness grows through actual development, not a global brightness filter that hides important statuses.

## 2. Verified current baseline

- `index.html` is the SVG management edition; `walkabout.html` is a separate classic canvas/avatar entry; `village.html` is LittleHampton-on-Sea.
- `src/management-map.js` procedurally draws trees/buildings and projects the 60×40 tile world into a rotatable, zoomable SVG camera.
- `src/management-shell.js` owns management panels, construction controls and map navigation; `src/management-bridge.js` delegates commands to existing gameplay systems.
- `src/main.js` contains the classic engine/character loop; the management entry deliberately skips its avatar loop and classic keyboard handler.
- `src/asset-renderer.js` and `assets/tileset.json` already define a partial sprite pipeline, but the management renderer is not yet sprite-backed.
- `src/park-designer-import.js` supports artwork/project imports for the classic experience; management deliberately does not auto-restore an artwork package because it could replace a progressed park.
- `docs/early-game-loop.md` already specifies approach-tree, click, E-to-harvest, timber inventory/sale, shovel unlock and landscape beauty. Reuse those rules.
- `docs/management-map.md` documents save schema 13, management camera keys, real-grid routes, two playable starts and private preview validation.

**Not yet verified by this planning PR:** live browser rendering, performance with full sprite atlases, physical touch input, advertising-provider eligibility, consent requirements for the eventual audience/regions, or image licence/provenance for any external art.

## 3. Target architecture

```text
                       Game state + simulation (single authority)
                                     |
                 +-------------------+-------------------+
                 |                                       |
          Living Park surface                      Tablet surface
     player/camera/interactions             existing management UI/bridge
                 |                                       |
                 +------------- commands ----------------+
                                     |
                          existing game actions
          (clear, harvest, build, purchase, book, staff, repair)
```

- A shared **world coordinate adapter** maps logical tile coordinates to the management SVG world and back. Keep simulation and collision in unrotated tile space; camera rotation affects only presentation/input projection.
- A shared **player controller** handles WASD/arrow keys, click-to-approach, pathfinding, facing, interaction range, and movement suspension while the tablet is open.
- A shared **interaction registry** resolves click targets to actions and validation: tree, debris, shop, guest, pitch, facility, farmhouse. Existing game actions remain authoritative.
- A **sprite/scene renderer adapter** draws ground, objects and characters with consistent depth ordering; preserve SVG layers for pins, selection, utility overlays, construction previews and routes. Prefer a controlled hybrid SVG/image solution first, measure before considering a canvas renderer.
- A **tablet controller** toggles the existing management shell; do not duplicate finance/booking logic. On desktop: tablet icon and Tab shortcut (not while typing). On touch: always-visible accessible tap target.
- **Monetisation adapter** is presentation-only, opt-in configured, failure-safe and never allowed to mutate game state. A later optional rewarded-ad flow must use server-verified grants before modifying balances.

## 4. Delivery milestones

### LP-0 — Baseline, contract and regression protection (P0)

- [ ] Inventory the existing management, classic and village entry points; document shared and divergent state.
- [ ] Capture reference screenshots at desktop and mobile widths; record load/interaction performance.
- [ ] Pin a representative farm save, developed save, migrated older save and corrupted-save recovery fixture.
- [ ] Add integration tests proving management/classic state continuity and no duplicate engine ticks when switching surfaces.
- [ ] Document coordinate and camera transforms (including 0°, 90°, 180°, 270°) and input ownership.
- [ ] Agree initial graphic style against real in-game screenshots, not only standalone concept sheets.

**Exit:** repeatable visual baseline, no save/economy regression, no ambiguous double input.

### LP-1 — Shared on-foot player in the management world (P0)

- [ ] Draw an avatar in the management world at a valid spawn near the farmhouse; keep player position in world tiles.
- [ ] Add WASD/arrow movement and camera follow with pan/zoom; preserve current pan/rotate controls outside character mode.
- [ ] Reuse existing walkability/pathfinding, collisions and obstacle state; prevent walking through trees, facilities or closed areas.
- [ ] Add click-to-approach and adjacent-tile target resolution; reject unreachable targets gracefully.
- [ ] Add interaction prompts and E-to-interact with distance checks; no full animation dependency.
- [ ] Provide basic idle/walk/tool-use frames and simple effects (chop, leaves, stump), with reduced-motion setting.
- [ ] Ensure guest movement remains independent and never blocks the player indefinitely.

**Exit:** start farm, walk to a tree, inspect/harvest once, receive correct timber, save/reload, and repeat after camera rotation.

### LP-2 — Tablet as the believable management gateway (P0)

- [ ] Add bottom-corner tablet icon and Tab keyboard shortcut; ensure keyboard focus and touch accessibility.
- [ ] Open existing management interface within a tablet presentation, preserving map, guests, finances, build, park and land/beach.
- [ ] Opening tablet suspends character input, not the simulation clock; explicit pause remains separate.
- [ ] Closing tablet restores camera/character focus without moving the avatar or resetting map state.
- [ ] Keep management actions available from anywhere; physical interaction is for embodied activities, not bookkeeping.
- [ ] Keep the farmhouse computer as a thematic optional access point, **not** a gameplay gate.
- [ ] Persist only UI preferences as needed; do not write temporary tablet state into the park save.

**Exit:** character ↔ tablet transitions work without reloading, losing selection, duplicating commands or affecting bookings.

### LP-3 — Sprite pipeline and first playable art slice (P0)

- [ ] Inspect/validate the previously created 16×16 terrain/path, nature/decor and buildings/accommodation ZIPs; record actual asset quality, alpha, source, dimensions and footprints.
- [ ] Define a single versioned logical asset catalogue used by CaravanWeb and Park Designer; avoid coupling gameplay entity IDs to filenames.
- [ ] Add mapping from current entity types to sprite keys, with explicit fallbacks and condition variants.
- [ ] Render **farmhouse, Rusty Resales, Fiddl, trees/overgrowth, roads, grass, touring caravan, static, tent and toilet block** in one playable map slice.
- [ ] Support 16×16 ground, multi-tile objects, transparent alpha, bottom anchors, trunk collision and depth sorting.
- [ ] Ensure road/path connection masks update as the player builds and clears tiles.
- [ ] Keep UI/pins/labels/selection/utility overlays readable at current zoom and map rotation; test low-zoom legibility.
- [ ] Record art provenance and licence; keep original PNGs, atlases and generated metadata in sync.
- [ ] Do not replace the existing visual treatment wholesale until the slice is approved.

**Exit:** same park rules and camera, recognisable cohesive coastal art, no blocking/occlusion regressions.

### LP-4 — Charm, ambience and world interactions (P1)

- [ ] Create consistent worn/maintained/improved states for farmhouse, dealer, shops, caravans, fences and grounds.
- [ ] Add British coastal detail: noticeboards, benches, patched roads, hedges, bins, flowers, bunting, faded signs, washing lines and park furniture.
- [ ] Add guest greetings, brief contextual reactions and lightweight arrivals/maintenance effects without lengthy animation.
- [ ] Improve LittleHampton visual consistency using the same catalogue; village-scale sprites may use alternate LOD.
- [ ] Add optional small in-world objectives tied to existing systems, not a separate quest economy.
- [ ] Add scalable graphics quality and reduced-motion controls; benchmark lower-end mobile devices.

**Exit:** the park feels lived-in and improves visually as player actions change real state.

### LP-5 — Fictional in-game advertising system (P1)

- [ ] Create **fictional brands** for dealer signs, village posters, roadside boards, café specials and holiday-park noticeboards.
- [ ] Keep all fictional adverts as world art, not commercial placements; no click tracking or external network dependency.
- [ ] Create thematic states: faded/peeling early, repaired/clean later, seasonal decorations where suitable.
- [ ] Implement a data-driven sign/poster catalogue with map positions, size, condition and optional seasonal variant.
- [ ] Reserve the right to replace *specific, clearly disclosed* placements with sponsorship later only after separate design/privacy review.
- [ ] Review names/logos for accidental real-brand resemblance and inappropriate content.

**Exit:** fictional signs enrich the map, never alter bookings/cash unless an explicit existing game mechanic does so.

### LP-6 — Commercial advertising foundation, **disabled by default** (P1)

- [ ] Create a provider-neutral ad slot registry: `tablet.dashboard`, `tablet.finances` and optional tablet subpages; cap density and frequency.
- [ ] Define slot dimensions and mobile breakpoints to prevent layout shift; never overlay the walking world, map controls, save/export or essential information.
- [ ] Add `ads.enabled=false` launch flag, provider adapter, mock provider and no-ad graceful fallback.
- [ ] Separate commercial adverts from fictional in-world signs; label live ads **Advertisement** and do not imitate park shop offers.
- [ ] Add privacy/consent gating before loading any nonessential ad scripts or storage. Support consent refusal, withdrawal and changes; assess UK GDPR/PECR and any other launch-region requirements with current legal/provider guidance.
- [ ] Review child-directed/underage audience rules, ad personalisation restrictions, provider policies, accessibility and regional suitability **before launch**.
- [ ] Add provider failure, blocked script, slow connection, consent-denied and offline tests.
- [ ] Collect only privacy-respecting aggregate diagnostics by default; no player profiling or sale of personal data.
- [ ] Add a provider configuration/runbook and kill switch, without introducing a backend merely for placeholder slots.

**Exit:** the game plays identically with ads disabled, blocked, unavailable or consent refused; ad slots are safe to enable only after policy review.

### LP-7 — Launch readiness and optional future revenue (P2)

- [ ] Evaluate an ad provider only after traffic, audience and eligibility are known; verify actual policy compatibility with browser games.
- [ ] If ads are enabled, start with **one modest tablet placement**, measure performance and retention, then reconsider density.
- [ ] Add a non-punitive ad-free purchase option only if a secure entitlement/payment system is justified.
- [ ] Consider **optional** rewarded ads later; never promise rewards without verified completion, abuse prevention and save-safe grants. Do not introduce pay-to-win dependencies.
- [ ] Decide whether sponsorship is worthwhile separately from fictional scenery; require explicit disclosure if real paid promotion appears in-world.
- [ ] Review launch analytics, consent rates, accessibility, load time and ad revenue against actual player retention.

**Exit:** commercial revenue is optional and demonstrably does not reduce core enjoyment or accessibility.

## 5. Suggested sprint sequence and dependencies

| Sprint | Milestone | Priority | Depends on | Deliverable |
|---|---|---|---|---|
| 0 | LP-0 | P0 | None | Baseline tests, screenshots, camera/input contract |
| 1 | LP-1 | P0 | LP-0 | Player walking and tree interaction on management map |
| 2 | LP-2 | P0 | LP-1 | Tablet toggle into existing management UI |
| 3 | LP-3 | P0 | LP-0, LP-1 | Approved visual slice, working sprite adapter |
| 4 | LP-4 | P1 | LP-3 | Expanded park charm and village consistency |
| 5 | LP-5 | P1 | LP-3 | Fictional sign/poster system |
| 6 | LP-6 | P1 | LP-2 | Disabled-by-default commercial ad infrastructure |
| 7 | LP-7 | P2 | LP-6 and policy review | Controlled monetisation launch options |

LP-5 and LP-6 can proceed in parallel after their dependencies. Sprints are **milestone order, not time estimates**.

## 6. Test and release gates (every milestone)

- [ ] `npm run check:syntax` and `npm test` pass; add focused tests for changed behavior.
- [ ] No duplicate simulation tick or ledger transaction across tablet/character transitions.
- [ ] Farm and developed scenarios, legacy save migration, import/export and recovery backup remain intact.
- [ ] Keyboard, pointer and touch input work; controls remain accessible and do not conflict with typing.
- [ ] Camera rotation and zoom do not change logical interaction range or collision.
- [ ] Responsive layouts work at narrow mobile widths and desktop sizes.
- [ ] Asset missing/failure falls back gracefully; broken ads never break gameplay.
- [ ] Performance measured on modest hardware and mobile; no blocking ad scripts.
- [ ] Owner reviews preview screenshots and a playable Cloudflare preview before merge.
- [ ] No automatic live deployment or ads enablement from planning approval.

## 7. Explicit exclusions for the first release

- Full skeletal character animations or elaborate cutscenes.
- Multiplayer, accounts, cloud saves or backend migration.
- Paid in-world billboard sponsorship.
- Forced video, mandatory rewarded ads or paid progression gates.
- Replacing all SVG management functionality or rewriting the simulation.
- Automatic import of Park Designer packages into progressed management saves without a safe asset-only path.

## 8. Decisions settled / decisions still open

**Settled:** management game with walkable character; tablet/computer icon as believable gateway; finance and booking convenience; simple animations; fictional in-game advertising; real ads optional and nonintrusive; existing world and save continuity.

**Open for approval:** final sprite visual style; whether first release exposes player-controlled camera rotation while walking or only while tablet is open; initial commercial provider and launch regions; minimum age/audience positioning; whether tablet opens full-screen on mobile. These are not blockers to LP-0 or LP-1.

## 9. Suggested PR boundaries

1. LP-0: test fixtures + camera/coordinate contract.
2. LP-1: player controller + interaction registry + renderer hook.
3. LP-2: tablet UI shell and input ownership.
4. LP-3: sprite catalogue + first art slice (binary assets separately reviewed).
5. LP-4/LP-5: atmosphere + fictional signage.
6. LP-6: advertising adapter + consent/kill-switch tests.
7. LP-7: separate provider/entitlement decision and controlled launch.

**Approval request:** review this plan before implementation; keep all runtime changes on separate draft PRs.
