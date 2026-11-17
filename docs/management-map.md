# Management map integration

The default game now opens a management view using the accepted explorer's cream / sage palette, procedural buildings and map-first navigation. It renders real game entities instead of a fixed demo-location table.

## Scope and command boundary

The original simulation modules still own bookings, economics, facility service radii, condition, construction and delivery timing, utility connectivity and save migrations. The management bridge calls those rules and ledger functions. The map's tool preview estimates size and cost; the existing placement validator decides whether to queue work. Clearing overgrowth and opening shops are available directly from the park office interface without moving an avatar.

The new management rental switch changes an installed static's existing `isOperational` flag, so future eligibility uses the existing capability index. Current stays are retained. Facility operating switches, caravan repair / skirting / sale, toilet cleaning / repair, staffing, tool purchases, timber sales, static purchases / replacements / decking and accessory placement continue through the existing engine actions.

Map routes traverse only real road / path cells and stop at an adjacent location boundary. They start from a path by the farmhouse when one exists. They are expressed in game tiles; no real-world distance or walking-speed assumption is made. A missing route is an exploration hint, not a new booking prerequisite: guest movement keeps its existing rules.

## Saves and compatibility

The schema remains 12 and the primary save key remains `caravan_tycoon_save`. The classic view reads the same save; switching views restores the same cash, bookings, game time, assets and terrain. Management camera and saved-place preferences use `caravanweb_management_camera_v1` and `caravanweb_management_saved_v1`.

Before a new scenario or imported save replaces an existing game, the current save is copied to `caravan_tycoon_management_backup`. The Park tab can export either version. Replacement aborts if the required backup cannot be written. Imports validate the grid, bounded pitch geometry and supported schema, run existing migrations, reject migrations that would drop entity records, and restore the original state / stored save / recovery backup on restoration failure. Exported files can be moved between site origins; browser storage is not shared across origins or devices.

The management edition deliberately skips Park Designer's automatic artwork-package restore, which would replace a progressed game with the package's original layout. Saved gameplay geometry still renders as vectors. Package import / theme artwork remains in the classic view; a dedicated management workflow for authoring or importing Park Designer packages is outside this change.

## Playable starts

The original £1,500 farm start is unchanged. The developed scenario explicitly initializes £20,000 in capital, 12 correctly sized pitches, four installed statics and seven facilities. Its ledger begins with the capital balance; the existing assets are part of the selected start, not hidden purchases. Its terrain / facilities / pitches are tested for valid placement and all static pitches have four connected mains services. Local toilet coverage is intentionally incomplete for some outer pitches, and there is a broken caravan and a dirty block to manage. No existing save is silently converted into this scenario.

## Validation

`npm run check:syntax` passes. `npm test` passes **136 tests**, including the original 126 plus ten integration tests executing the real browser engine in an isolated Node VM. New coverage checks valid scenario geometry / connected statics / opening ledger, real repair charges and repeat guards, invalid / valid construction and timed completion, toilet maintenance, live status projections, routes / camera transforms / game build minimums, schema-preserving save round trips, corrupt / future imports, rollback and backup-storage failure.

Managed Chrome browser checks on 17 November 2026:

| Flow | Observed result |
| --- | --- |
| Developed start | 12 pitches, 4 statics, 7 facilities and £20,000; paused until resumed |
| Caravan repair | £40 deducted once; repaired flag / condition and ledger update; repeat action disabled |
| Toilet cleaning | £18 charged at 55% cleanliness; job completes after two game hours; live cleanliness then changes with guest use |
| Running simulation | Seven bookings / 14 guests during the observed first afternoon, with live activities / upfront payments; later checkouts also update occupancy |
| Map construction | Three path cells cost £30, reserve a two-hour job and become path terrain after time runs |
| Finances | Repair, maintenance, construction, guest receipts and running costs reconcile with actual cash |
| Export / scenario replacement / import | Exported park restored £26,009, Day 2 06:14 and 6 / 12 occupied pitches; recovery backup offered before replacement |
| Classic compatibility | Same £26,009, Day 2 06:14, six parties / ten guests and reconciled ledger; return link reopens management |
| Dealer | Rusty Resales opens directly with 15 live catalogue models and pitch eligibility |
| Map controls | Search / selection, keyboard pan / rotation, zoom, fit, office route, grid and actual utility layers |
| 390 × 844 viewport | Navigation, tools drawer, automatic close after tool choice, search / inspection / route and a 358px finance panel without outer horizontal overflow |
| Logs | No application-origin browser errors observed |

The narrow check uses an iframe viewport rather than a physical device. Multi-touch pinch is implemented but not exercised with physical touch hardware. The temporary responsive harness is removed by the preview build. Full manual coverage of every catalogue purchase / accessory variation is not claimed; existing automated static / delivery / accessory tests still pass.

## Deployment and remaining limits

The review build is deployed only to the existing owner-private preview. The first standalone explorer is retained under `/explorer/` in that private preview for comparison. No public Pages setting, domain, audience or live main branch is changed by this integration branch.

This is the first management integration, not a balance redesign. It retains current guest prices, maintenance / decay rates, unlocked facilities, staff rules and land restrictions. Land purchase, configurable rental prices, cloud saves, multiplayer and a long-term progression rebalance are not added. The classic DOM hooks are retained for compatibility with the current main module; extracting the engine from that module can be a later refactor.
