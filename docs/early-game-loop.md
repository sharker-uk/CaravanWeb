# Early-game loop: reclaim the overgrown farm

## Starting position

A new park begins as a neglected, overgrown plot rather than a clean, build-ready site. The player has a small clear area to stand in, an existing rough access road, scattered debris and dense tree growth across the usable land. The browser prototype uses deterministic tile placement so a fresh start is repeatable.

## First gameplay loop

1. **Explore** the land on foot. Trees block movement and building; the player must approach them rather than deleting them remotely.
2. **Fell trees** by clicking a tree, letting the player walk to it, then pressing **E** when close enough.
3. **Collect timber** into an inventory. Each tree yields a stable 4–7 units so the action is predictable and testable.
4. **Sell timber** from Park Management for £8 per unit. Timber sales are recorded in the existing transaction ledger.
5. **Reclaim buildable space** by removing trees and debris, then place paths, pitches and facilities using the existing construction tools.
6. **Replant intentionally** for £30 per tree. A fully cleared site has poor beauty; some tree cover is attractive, but excessive cover is also penalised.
7. **Build a viable park** by balancing usable space, facilities, guest capacity, operating costs and landscape appeal.

## Beauty rules in the browser prototype

Beauty is a 0–100 derived score, not a second money balance. It responds to tree coverage, debris, pitches and facilities. A modest target tree coverage is rewarded; zero tree cover and very dense tree cover both score lower. Development also reduces the score slightly, making landscape planning a real trade-off.

Beauty contributes a small adjustment to guest demand. It should not override essential booking requirements: toilets and the appropriate shower capacity remain hard eligibility rules. Future iterations can expand landscaping to flowers, hedges, water views, paths, decoration condition and visual style progression.

## Godot 4.4 portability

Keep the core rules independent of canvas rendering:
- tile nature determines whether a tile is blocked, buildable or harvestable;
- harvesting produces inventory, and selling converts inventory to a ledger transaction;
- beauty is calculated from world state and can be unit-tested;
- input and animation are presentation concerns, not part of the economy rules.

The Godot implementation should use the existing TileMapLayer ground/nature separation and interactable tree entities. Tree removal should clear the collision/obstacle and leave a clear tile; later art can replace the browser placeholders without changing the loop.

## Acceptance checks

- A fresh game has a safe player start and visible overgrowth.
- Clicking a tree routes the player to an adjacent walkable tile; E harvests only when close.
- A felled tree no longer blocks movement or construction, and timber is added exactly once.
- Selling timber empties the inventory and adds the correct ledger income.
- Save/reload preserves timber and tree removal.
- Clearing all trees lowers beauty; replanting a moderate number raises it again.
- Tree-heavy land is less buildable, and pitches/facilities also carry a modest beauty cost.
