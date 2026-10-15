# First production graphics brief

## Shared visual rules
- Setting: British seaside holiday park, Caister-inspired.
- Style: illustrated 3/4 diorama; clean dark outlines, restrained painted texture, warm muted colours.
- Feel: modest, weathered and believable; the park can become tidier and brighter as it improves.
- Keep silhouettes readable at normal zoom; avoid detail that only works when enlarged.
- Placed objects need transparent backgrounds. Do not bake labels, selection outlines, UI or ground tiles into object sprites.
- Keep a clear, consistent ground-contact point. NPC/player art remains unchanged for this first slice.

## Sprite 1 — toilet block
- Runtime key: `facility.toilets`
- Destination footprint: 3×3 logical tiles (48×48 world pixels).
- A small, practical holiday-park toilet block, not a modern urban public convenience.
- Show a clear entrance and a few recognisable details; no baked-in text.

## Sprite 2 — tent
- Runtime key: `accommodation.tent`
- Rendered to the guest pitch footprint, so keep the composition centred with transparent margin.
- A recognisable family camping tent, slightly weathered and appropriate for a British coastal campsite.
- Clear entrance flap and simple fabric panels; no people or ground tile baked in.

## Sprite 3 — towed caravan
- Runtime key: `accommodation.tin`
- Rendered smaller than the guest pitch footprint by the game.
- A modest touring caravan from the same 3/4 angle as the buildings.
- Include windows, door and visible tow hitch; details should survive normal zoom.
- Distinct from the larger static caravans planned for a later slice.

## Atlas
The starter atlas is planned as 512×512 pixels. Reserved rectangles in `../tileset.json`:
- toilet block: x=0, y=0, 48×48
- tent: x=48, y=0, 32×32
- towed caravan: x=80, y=0, 48×32

Do not change these coordinates unless the manifest is updated alongside the atlas. The PNG is not present yet, so the game's procedural fallback remains active.
