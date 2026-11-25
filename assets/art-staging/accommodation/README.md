# CaravanWeb Buildings & Accommodation v1.0

38 object types, 76 individual transparent PNG sprites (standard and overgrown), 16px base tile, RGBA. All art drawn on an integer-pixel grid.

Each `sprites/` PNG is sized to its placement footprint in multiples of 16 pixels. `manifest.json` gives individual paths, atlas rectangles, footprints, collision rectangles, and bottom-centre anchors.

## Integration

1. Import PNGs and manifest into CaravanWeb or Park Designer.
2. Use `footprint` for placement and `collision` for logical obstruction. For walkable facilities, implement doors/entrances separately.
3. Draw using `imageSmoothingEnabled = false`. Position each sprite using its bottom-centre anchor and sort objects by base Y coordinate.
4. Change `standard` to `overgrown` without changing footprint.
5. The atlas uses 96×80 slots, not fixed 16×16 slots, because sprites are multi-tile objects. Use manifest atlas rectangles.

## Limitations

These are deliberately simple, programmatically drawn first-pass assets; visual quality is below the concept illustration. Building fronts use an elevated-front 2D view (not strict orthographic top-down). Validate scale and rendering against the existing game before adopting. The manifest is a standalone format, not confirmed to be accepted directly by the existing CaravanWeb asset loader.
