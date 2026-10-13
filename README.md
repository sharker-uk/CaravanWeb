# CaravanWeb

2D top-down browser prototype for Caravan Park Tycoon.

## Controls and construction

- Move the park manager with **WASD** or the arrow keys; the camera follows and scroll-wheel zooms.
- Select a build tool, then left-click or drag on the map. The manager pauses while a build drag is active.
- Drag a pitch-sized rectangle to fill it with grass or hardstanding pitches. A red outline indicates a box below the minimum pitch size.
- Draw utility lines along roads or paths. Each line is validated and charged as one operation.
- Click an empty pitch with an accommodation tool to place a caravan. Static units require a gravel pitch and all four hookups.
- Guests book when demand and vacancy capacity allow, pay for their stay upfront, and move between their pitch and reachable facilities.

The park overview shows recent ledger entries, the rolling seven-day income/expense balance, and a reconciliation check against current cash. Guest satisfaction reflects utility access, accommodation condition, and facilities guests actually visit.

Run `npm test` for the gameplay rules, simulation, save-migration, guest activity, and economy tests.
