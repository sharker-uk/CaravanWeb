# LP-G1 — Terrain and Nature Foundation

## Scope
This change introduces a deterministic, visual-only registry for grass and nature in the existing SVG park renderer. **The game state remains authoritative**: when a tree or debris tile is cleared, its graphic disappears on the next existing map redraw. The registry never modifies collision, money, inventory, saved tiles, or the player's position.

### Included
- Nature registry: grass, sand, water, tree, debris, hedge; metadata for state/interaction.
- Deterministic ground detail variation: maintained/normal/overgrown grass blades and occasional stones; excludes roads and paths.
- Improved illustrated trees with canopy highlights, trunks and shadows; illustrated debris piles.
- Map integration and Node contract tests.

### Not yet included
- Hedges do not have an authoritative tile representation in this game; their registry entry is reserved.
- Tree fall animations, stumps, and tool animations are future gameplay changes. No fake persistent stumps are rendered.
- This deliberately keeps the existing ground surfaces, buildings, collisions, and tablet behaviour intact. It is independent of the unmerged LP-1.2 character PR.

### Acceptance checklist
1. Start a new neglected farm and compare trees, debris, and grass details.
2. Clear a tree or debris using the existing gameplay action; the art must disappear without refreshing the page.
3. Save, reload, and confirm cleared objects stay gone.
4. Check walking collisions, zoom, tablet planning, roads and paths remain unchanged.
5. Run `npm run check:syntax && npm test` and review the Cloudflare branch preview before merge.
