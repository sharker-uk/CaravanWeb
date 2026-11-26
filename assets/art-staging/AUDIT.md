# ART-1 source artwork audit
Scope: imported 235-file archive, source manifests, README files and visual atlas review; no runtime edits. Archive CRC check passed. 224 individual PNGs, 5 atlas/preview PNGs, 6 metadata/docs. Terrain 96 (32 ground + 64 paths), nature 52 (26 paired types), buildings 76 (38 paired types). GitHub import previously confirmed 235 additions; no remote byte-by-byte comparison performed.

## Existing defect classification
Available (integration still pending): ART-001,003,004,005,007.
Adapt: ART-002,006,008,009,010,011,012.
Missing dedicated art: ART-013 through ART-048 inclusive. Generic building placeholders can cover some world businesses temporarily; extras 038–048 deferred.
All original defect IDs remain open.

## Findings
- Terrain: 16px base, 8 materials x4 variants; 4 path materials x16 NESW masks. Path strokes 8px wide; not suitable as full-width village roads without adaptation. No mixed-material or shoreline transitions. Use texture fills for existing curved geometry.
- Nature: 12 tree sprites 32x48, 40 other sprites 16x16. Bottom-center anchors; maintained/overgrown pairs. Fences/gates require directional/connection review; no dedicated debris branches.
- Buildings: 38 types with standard/overgrown variants, elevated-front view, repetitive facades, very limited roof depth. Retain as placeholders; new world artwork should show roof and front in consistent elevated overhead view. Do not stretch old sprite footprints to new physical dimensions. Touring 6x2.3m, motorhome 8x2.5m, static 12x4m, lodge 14x6m targets. Separate visual bounds from collision and ground footprint. Two parked orientations required; rotation of front-elevation art is not acceptable.
- No moving vehicle directional sets, shoreline transitions or deployment animations in source packs.
- New cross-cutting defects: ART-049 consistent building projection; ART-050 physical footprint metadata migration; ART-051 mixed terrain/path transitions; ART-052 fence/gate directional joins; ART-053 distinguishable facility silhouettes; ART-054 sprite layering/occlusion validation.

## Proposed sequence
Approve one residential house and one caravan in two orientations as visual reference before bulk world art. Preserve terrain/nature palette, nearest-neighbor sampling and existing world geometry. Then create residential, commercial, infrastructure and moving vehicle sets; extras last. No new graphics generated, no runtime tests performed, no runtime integration authorised.
