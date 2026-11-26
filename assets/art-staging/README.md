# ART-1 — Asset staging (not loaded by game)
Original packs: caravanweb_terrain_paths_v1.zip, caravanweb_nature_decorations_v1.zip, caravanweb_buildings_accommodation_v1.zip. Preserve source PNGs and manifests unchanged. The Park Designer bundle is a derivative, not a fourth independent art pack.

Planned directories: terrain/, nature/, accommodation/, residential/, commercial/, infrastructure/, vehicles/, eccentric/. Store original manifests alongside source artwork; future runtime catalogue must separately specify metre footprints, anchors and collision. One world tile = one metre. Stationary pitches support north–south and east–west; do not assume rotating perspective sprites produces correct artwork. Moving vehicles require directional sprites. No runtime references until explicitly approved.

Status: scaffold only; binary import pending. Existing procedural renderer remains unchanged.
