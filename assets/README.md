# CaravanWeb art and tileset specification

This browser prototype uses a **16 × 16 logical world tile**. Keep that gameplay grid; artwork can be larger than one tile. The renderer reads source rectangles from `assets/tileset.json` and draws them into the world, so multi-tile objects can use the exact footprints already defined by game logic.

## Technical delivery

- **Style:** cohesive pixel art suited to a British, slightly shabby coastal caravan park; readable at the game's current zoom levels.
- **Perspective:** the current browser renderer is straight top-down. Design the first pack for that view. If the intended final look is 3/4 / Stardew-style, confirm that before drawing the full pack; the renderer's object-depth ordering will need a deliberate update first.
- **Atlas:** one transparent PNG, recommended starting size **512 × 512 px**, arranged on a 16 px source grid. Larger sprites may occupy multiples of that grid.
- **Filtering:** nearest-neighbour / no smoothing. Do not pre-scale sprites.
- **Transparency:** PNG with alpha for trees and objects. Ground and connected road/path tiles should be opaque.
- **Alignment:** buildings fit their existing footprint exactly; trees are bottom-anchored and may extend above their tile. Keep consistent door/front orientation.
- **No baked-in text:** building names, prices, condition, selection outlines and management overlays are rendered by the game UI, not painted into sprites.
- **Naming:** atlas keys below are logical names in `tileset.json`, not filenames.

## Minimum set for this version

### Ground — 16 × 16 each
- `terrain.grass.0`, `terrain.grass.1`, `terrain.grass.2`: subtle grass variants that tile seamlessly.
- `terrain.sand`: beach/shore sand.
- `terrain.water`: pond and sea water.
- Recommended next pass: grass/sand and sand/water transition edges and corners, plus a few decorative grass/flower variants.

### Roads and paths — 16 × 16 each
Road and path sprites use a four-neighbour connection mask: north = 1, east = 2, south = 4, west = 8. Provide all 16 combinations for each surface:
- `surface.road.0` through `surface.road.15`
- `surface.path.0` through `surface.path.15`

The mask allows straight sections, ends, corners, T-junctions, crossings and isolated tiles to be drawn correctly as the player builds freely. Adjacent road/path transitions can be added once the base tiles are settled.

### Overgrowth and scenery
- `nature.tree`: transparent tree, ideally 16 × 32 px, with trunk/base aligned to the bottom tile.
- `nature.debris`: transparent brush/rubble, 16 × 16 px.
- Recommended: stump, hedge sections, flower clumps, bins, benches, fences, lamp posts and coastal planting. These can be a later decorative pack.

### Starting landmarks
These should look appropriately worn at the start of the game:
- `landmark.farmhouse`: run-down farmhouse, footprint **6 × 5 tiles = 96 × 80 world px**.
- `landmark.rusty_resales`: caravan sales yard/shop, **5 × 3 = 80 × 48 px**.
- `landmark.fiddl_shop`: convenience shop, **5 × 3 = 80 × 48 px**.
- `landmark.job_centre`: staff/job centre, **5 × 3 = 80 × 48 px**.

### Accommodation
- `accommodation.tin`: small older touring caravan / “Tin Banger”.
- `accommodation.static`: larger static caravan / “Classic '02”.
- `accommodation.tent`: simple tent.
  These are scaled to the existing pitch/guest rendering rectangles. It is fine for source artwork to be larger than 16 × 16; keep a consistent top-down view and ground contact point.

### Facilities
Create one transparent building sprite for each existing type, sized to its current footprint:
| Key | Footprint | Destination size |
|---|---:|---:|
| `facility.toilets` | 3 × 3 | 48 × 48 px |
| `facility.showers` | 3 × 3 | 48 × 48 px |
| `facility.laundry` | 3 × 3 | 48 × 48 px |
| `facility.shop` | 4 × 3 | 64 × 48 px |
| `facility.playground` | 3 × 3 | 48 × 48 px |
| `facility.pub` | 3 × 3 | 48 × 48 px |
| `facility.restaurant` | 4 × 3 | 64 × 48 px |
| `facility.arcade` | 3 × 3 | 48 × 48 px |
| `facility.entertainment_space` | 5 × 4 | 80 × 64 px |
| `facility.pool` | 5 × 4 | 80 × 64 px |
| `facility.activity_centre` | 4 × 4 | 64 × 64 px |
| `facility.entertainment_hub` | 6 × 5 | 96 × 80 px |

## How the atlas manifest works

For each finished sprite, add a source rectangle to `assets/tileset.json`, for example:

```json
{
  "version": 1,
  "tileSize": 16,
  "atlas": "assets/park-tileset.png",
  "sprites": {
    "terrain.grass.0": { "x": 0, "y": 0, "w": 16, "h": 16 },
    "landmark.farmhouse": { "x": 0, "y": 64, "w": 96, "h": 80 }
  }
}
```

Coordinates refer to the **source PNG**, not the in-game destination size. The example coordinates are illustrative only; replace them with the actual placement in the finished atlas.

NPCs and the selectable player avatar deliberately remain on the current character renderer. This art pass does not require replacing or redrawing them.
