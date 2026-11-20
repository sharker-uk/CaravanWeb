# WORLD-WALK-1 — Village walkabout

Status: Implemented in draft branch; browser acceptance pending.

## Scope
- Retains the park-to-village gate transition via `village.html#walk`.
- Replaces the village's temporary marker with `CaravanPlayerSprites.frameSvg`, matching the park sprite and reading colour choices from `caravan_tycoon_save.playerAvatar`.
- Reuses WASD and arrow keys, normalised diagonal movement and smooth follow camera.
- `src/village-movement.js` is a renderer-independent movement module. Its WW1 collision model follows road corridors and prevents walking through building footprints; proper pavements, greens and private-area boundaries are WW2.
- Press E at the park gate to return; E near village destinations opens their information. Purchases are not yet wired.
- Village movement and traffic do not advance the park economy.

## Acceptance checklist (manual)
1. Open park, walk west through the farm gate.
2. Confirm same player sprite colours appear in village; walk cycle and facing update in all four directions.
3. Walk west along park lane, then south along Natwinch Road towards the High Street.
4. Check building footprints and grass outside road shoulders are blocked.
5. Return north and east to the park gate; E returns to park and existing save is preserved.
6. Repeat after changing the player appearance in the park.

No browser or Cloudflare deployment acceptance was run by the assistant. The tests are committed but were not executed in this environment.
