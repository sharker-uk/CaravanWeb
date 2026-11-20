# LP-1.2 — Player character graphics (draft)

This branch replaces the blue SVG placeholder on the **living park** map with a 32×32 transparent, pixel-aligned character. The default appearance is a red jacket, brown hair, blue trousers and boots, based on the approved player-character concept sheet.

## Deliverables

- `assets/player/default-character.svg`: transparent 192×768 SVG sprite atlas (6 columns, 24 rows, 32×32 per cell).
- `assets/player/manifest.json`: frame coordinates and durations for walking, idle, axe chopping, digging, mining and carrying timber in four directions.
- `src/player-sprites.js`: reusable pixel renderer for future palette swaps and appearance customisation.
- `src/management-map.js`: default character shown in the existing world position; animation direction follows movement and returns to idle when stationary.

The atlas is *graphics groundwork*: chop/dig/mine/carry animation frames are supplied but gameplay actions are not yet connected to those animations. Existing character creator and walkabout rendering remain unchanged in this PR. The SVG is crisp-edged and has no background, suitable for conversion to PNG with nearest-neighbour scaling if required. This is an original, deterministic production sprite set rather than an automatic crop of the earlier concept sheet.

## Acceptance

Run `npm run check:syntax && npm test`. Test on the Cloudflare branch preview: start a new park, walk in all four directions, stop to idle, zoom and pan, open/close tablet, and verify the character survives a map redraw and a save reload. Do not merge before review.
