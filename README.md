# CaravanWeb

2D top-down browser prototype for Caravan Park Tycoon.

## Controls and construction

- Move the park manager with **WASD** or the arrow keys; the camera follows and scroll-wheel zooms.
- Select a build tool, then left-click or drag on the map. The manager pauses while a build drag is active.
- Drag a pitch-sized rectangle to fill it with grass or hardstanding pitches. A red outline indicates a box below the minimum pitch size.
- Draw utility lines along roads or paths. Each line is validated and charged as one operation.
- Click an empty pitch with an accommodation tool to place a caravan. Static units require a gravel pitch and all four hookups.
- Guest parties book when demand, pitch vacancy, essential washroom capacity and operational status allow. Each booking tracks party composition, dates, preferences, needs and upfront payment.
- Toilets are required for all overnight bookings; shared showers are required for tent and towed stays. Facilities have finite hourly capacity, operational switches and running costs.

Guest mix and arrival pressure shift between summer school holidays, weekends and quieter weekdays. Party preferences and unmet toilet/shower needs affect satisfaction; shop and laundry usage creates guest revenue alongside facility operating expenses. The park overview shows guest headcount, recent ledger entries, the rolling seven-day income/expense balance, and a reconciliation check against current cash. Save schema migrations preserve existing `caravan_tycoon_save` payloads while upgrading old one-guest bookings to solo parties.

Run `npm test` for the gameplay rules, simulation, save-migration, guest activity, and economy tests.
