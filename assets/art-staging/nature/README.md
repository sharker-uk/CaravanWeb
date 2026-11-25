# CaravanWeb Nature & Decorations v1

Original procedurally drawn transparent RGBA pixel art, no external assets.

- Tile grid: 16×16 px. Trees are 32×48 px, with a 1×1 logical footprint.
- All other sprites: 16×16 px.
- Maintained and overgrown variants share placement anchors and collision footprints.
- `manifest.json` includes individual PNG paths, atlas rectangles, logical footprints, and condition.
- `nature_atlas.png` is an atlas of 48×48 slots; use manifest rectangles to draw sprites.
- Anchor `bottom_center`: draw sprite centered on tile horizontally, bottom aligned to tile bottom.
- Nearest-neighbor filtering recommended.
- This is an initial hand-coded pixel art pack, not a faithful extraction of the AI concept art.
- Not yet integrated/tested in CaravanWeb or Park Designer.
