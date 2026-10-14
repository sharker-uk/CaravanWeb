# CaravanWeb

2D top-down browser prototype for Caravan Park Tycoon.

## Controls and construction

- New parks begin at a coastal Caister-inspired site with a farmhouse, pond, roadside shops and a neighbouring beach field marked for sale. The start screen includes a small pixel-art player avatar creator and randomiser.
- A new run starts with 5–7 randomly generated visitors who wander around the starting area. Their looks and positions are saved with the park; the start screen can re-roll the visitor group before you begin.
- Move the park manager with **WASD** or the arrow keys; the camera follows and scroll-wheel zooms.
- Walk up to the Old Farm House between 8pm and 5am to sleep until 8am.
- Tent and towed guests may arrive from 8am to 5pm; static renters arrive from 3pm to 8pm and check out by noon on their departure day.
- Select a build tool, then drag on the map. Roads and paths fill the selected rectangle; pitches can be laid as a box, and fixed-size buildings preview at the drag start.
- New roads, paths, pitches, utilities, trees, facilities and caravans take two in-game hours to finish. Their cost is charged when work begins; unfinished areas are reserved until construction completes.
- Draw utility lines along roads or paths. Each line is validated and charged as one operation.
- Click an empty pitch with an accommodation tool to order a caravan. Static units require a gravel pitch and all four hookups.
- Guest parties book when demand, pitch vacancy, essential washroom capacity and operational status allow. Each booking tracks party composition, dates, preferences, needs and upfront payment.
- Toilets are required for all overnight bookings; shared showers are required for tent and towed stays. Facilities have finite hourly capacity, operational switches and running costs.

Guest mix and arrival pressure shift between summer school holidays, weekends and quieter weekdays. Party preferences and unmet toilet/shower needs affect satisfaction; shop and laundry usage creates guest revenue alongside facility operating expenses. The park overview shows guest headcount, recent ledger entries, the rolling seven-day income/expense balance, and a reconciliation check against current cash. Save schema migrations preserve existing `caravan_tycoon_save` payloads while upgrading old one-guest bookings to solo parties.

Run `npm test` for the gameplay rules, simulation, save-migration, guest activity, economy, and character-system tests. Run `npm run check:syntax` to check the game and character-system scripts.
