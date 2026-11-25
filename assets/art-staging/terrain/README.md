# CaravanWeb Terrain & Paths — v1.0.0

Production-format pixel-art asset pack: 16×16 RGBA PNGs with a machine-readable manifest.

## Contents
- `terrain.png`: 8 ground materials × 4 variants, atlas 64×128 px, opaque RGBA.
- `paths.png`: 4 transparent path materials × 16 NESW connection masks, atlas 256×64 px.
- `manifest.json`: exact atlas rectangles and connection metadata.
- `individual/`: all 96 individual 16×16 PNG sprites for direct Park Designer import.
- `preview.png`: example composited game map (not an atlas).

## NESW autotiling
For a path tile, calculate mask = (same-kind north ? 1 : 0) + (east ? 2 : 0) + (south ? 4 : 0) + (west ? 8 : 0). Look up `manifest.paths[kind].variants[String(mask)]` and draw the rectangle from `paths.png`. A path with no neighbors is mask 0; four neighbors is 15. Paint paths above terrain. Path sprites are 8 pixels wide, and transparent outside the drawn path.

## Browser canvas integration
Use `ctx.imageSmoothingEnabled = false`; `drawImage(atlas, sprite.x, sprite.y, 16, 16, screenX, screenY, 16*zoom, 16*zoom)`. For crisp edges, round destination coordinates and use integer zoom. Keep the existing collision/placement logic independent of sprites.

## Scope and limits
These are deliberately pixel-perfect, procedurally authored first-pass assets. They are seamless as a grid and all path masks are included, but there are no diagonal shoreline transitions, no animation, no raised curbs, and no path-to-path mixed-material transitions. Different ground textures abut with a hard edge; transitions can be added in v1.1. `manifest.json` is an asset-pack format, **not** a verified drop-in replacement for any existing `assets/tileset.json` contract; adapt through the existing renderer.

## License
Original generated assets supplied under CC0-1.0; free to use, modify and distribute.
