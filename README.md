# CaravanWeb

2D top-down browser prototype for Caravan Park Tycoon.

## Controls and construction

- New parks begin at a coastal Caister-inspired site with a farmhouse, pond, roadside shops and a neighbouring beach field marked for sale. The compact start screen offers game start, a guest-roster randomiser, optional player-avatar creation, and optional controls.
- The guest-roster randomiser prepares names and pixel-art appearances for future bookings. People only appear after a booking is accepted; each booking's party is rendered as characters and can stroll the park paths, visit facilities, and take trips along the village road. Guest appearances and remaining profiles are saved with the park.
- Move the park manager with **WASD** or the arrow keys; the camera follows and scroll-wheel zooms.
- Walk up to the Old Farm House between 8pm and 5am to sleep until 8am.
- Tent and towed guests may arrive from 8am to 5pm; static renters arrive from 3pm to 8pm and check out by noon on their departure day.
- Select a build tool, then drag on the map. Roads and paths fill the selected rectangle; pitches can be laid as a box, and fixed-size buildings preview at the drag start.
- New roads, paths, pitches, utilities, trees and facilities take two in-game hours to finish. Their cost is charged when work begins; unfinished areas are reserved until construction completes.
- Draw utility lines along roads or paths. Each line is validated and charged as one operation.
- Walk to Rusty Resales and press **E** to browse static caravans, view connected-hookup eligibility, compare trade-ins and order a delivery. Static caravans require an unoccupied hardstanding pitch with connected gas, water, electricity and waste.
- Van deliveries take six in-game hours and arrive only between 8am and 8pm, inclusive. An order at exactly 8am is due at 2pm; one at exactly 2pm is due at 8pm. Orders just before or exactly 8pm that would arrive outside the window are deferred to 8am the next day, while an order after 8pm starts at 8am the next day and is due at 2pm. The pitch remains reserved while a delivery or replacement is pending; the installed van and its occupancy limit change only when delivery completes. Simulation pause and speed apply normally.
- Walk to Fiddl and press **E** to buy BBQs, patio furniture, firepits and hot tubs. Select an owned item and click a valid pitch tile to place it. Hot tubs are hardstanding-only; accessories do not currently add rent or satisfaction bonuses.
- Decking is bought and installed through Rusty Resales. It attaches at the shared static-caravan footprint, lasts 3,650 in-game days, and remains visible but unusable at end of life until explicitly replaced.
- Guest parties book when demand, pitch vacancy, essential toilet capacity and operational status allow. Each booking tracks party composition, dates, preferences, needs and upfront payment.
- Toilets are required for all overnight bookings; showers are optional but affect maximum stay. Tents can stay up to 14 days with nearby operational showers, or 5 days with toilets only. Touring caravans can stay up to 14 days with showers plus connected water and electricity hookups, 7 days with showers but missing either hookup, or 5 days with toilets only. Actual stays are randomly selected from 1 day up to the pitch's maximum. Toilet blocks have no hourly running charge, but guest use reduces cleanliness and wear. The player can clean them in 2 in-game hours or repair them in 3; the price is charged upfront and depends on the condition when work starts, not the time taken. Cleaning costs £5 at 80–100% cleanliness, £10 at 60–79%, £18 at 40–59%, £28 at 20–39%, and £40 at 0–19%. Repairs cost £10 at 80–100% wear, £20 at 60–79%, £35 at 40–59%, £60 at 20–39%, and £100 at 0–19%. Blocks that reach zero condition close until maintained. A one-day handyman booking costs £100 and can handle urgent maintenance, while grounds staff unlock after 4 facilities and 6 pitches, cost £1 per in-game hour, and can be dismissed. Facilities have finite hourly capacity, operational switches and running costs.

Guest mix and arrival pressure shift between summer school holidays, weekends and quieter weekdays. Party preferences and unmet toilet/shower needs affect satisfaction; shop and laundry usage creates guest revenue alongside facility operating expenses. The park overview shows guest headcount, recent ledger entries, the rolling seven-day income/expense balance, and a reconciliation check against current cash. Save schema migrations preserve existing `caravan_tycoon_save` payloads while upgrading old one-guest bookings to solo parties.

## Static caravan catalogue and balancing placeholders

The static catalogue lives in `src/static-caravans.js`. Every quality tier has 1-, 2- and 3-bedroom models, with a maximum occupancy of 4, 6 and 8 respectively. These initial purchase prices are balancing placeholders (GBP); bedroom configurations use 1.0×, 1.25× and 1.5× the tier base price:

| Tier | Condition category | Interior | 1 bedroom | 2 bedrooms | 3 bedrooms |
|---|---|---|---:|---:|---:|
| Basic | Pre-loved | Used | £9,000 | £11,250 | £13,500 |
| Bronze | Pre-loved | Refreshed | £14,000 | £17,500 | £21,000 |
| Silver | New | Basic | £22,000 | £27,500 | £33,000 |
| Gold | New | Good | £32,000 | £40,000 | £48,000 |
| Platinum | New | Top-of-the-line | £45,000 | £56,250 | £67,500 |

Resale is the original purchase price multiplied by `max(20%, 100% − 0.04% × in-game age in days)`, rounded down to whole pounds. The 20% minimum is configurable. The initial accessory placeholders are BBQ £180, patio table and chairs £250, firepit £125 and hot tub £2,400. Decking costs £1,200 and has a 3,650 in-game-day lifespan; replacement is permitted only after end of life. These improvements currently have no gameplay bonuses.

Schema-11 tier-1 caravans migrate to Basic, 1-bedroom statics; tier-2 caravans migrate to Gold, 2-bedroom statics. If their original purchase price or date is unavailable, migration uses the mapped catalogue price and Day 1 at 00:00, deterministically. Legacy decking with no installation date uses the same Day 1 default and is aged against its full lifespan. Cash, bookings, and pitch references are retained; capability records are rebuilt from normalized state.

Run `npm test` for gameplay rules, static catalogue and delivery, simulation, save-migration, guest activity, economy, and character-system tests. Run `npm run check:syntax` to check the browser modules.
