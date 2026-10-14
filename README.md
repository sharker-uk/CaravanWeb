# CaravanWeb

2D top-down browser prototype for Caravan Park Tycoon.

## Controls and construction

- New parks begin at a coastal Caister-inspired site with a farmhouse, pond, roadside shops and a neighbouring beach field marked for sale. First-time players see a controls screen before the simulation starts.
- Move the park manager with **WASD** or the arrow keys; the camera follows and scroll-wheel zooms.
- Select a build tool, then drag on the map. Roads and paths fill the selected rectangle; pitches can be laid as a box, and fixed-size buildings preview at the drag start.
- New roads, paths, pitches, utilities, trees, facilities and caravans take two in-game hours to finish. Their cost is charged when work begins; unfinished areas are reserved until construction completes.
- Draw utility lines along roads or paths. Each line is validated and charged as one operation.
- Click an empty pitch with an accommodation tool to order a caravan. Static units require a gravel pitch and all four hookups.
- Guest parties book when demand, pitch vacancy, essential washroom capacity and operational status allow. Each booking tracks party composition, dates, preferences, needs and upfront payment.
- Toilets are required for all overnight bookings; shared showers are required for tent and towed stays. Facilities have finite hourly capacity, operational switches and running costs.

Guest mix and arrival pressure shift between summer school holidays, weekends and quieter weekdays. Party preferences and unmet toilet/shower needs affect satisfaction; shop and laundry usage creates guest revenue alongside facility operating expenses. The park overview shows guest headcount, recent ledger entries, the rolling seven-day income/expense balance, and a reconciliation check against current cash. Save schema migrations preserve existing `caravan_tycoon_save` payloads while upgrading old one-guest bookings to solo parties.

Run `npm test` for the gameplay rules, simulation, save-migration, guest activity, and economy tests.
