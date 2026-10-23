# Caravan Park Tycoon — Web Prototype Architecture

## Current delivery model

This project remains a static browser game deployed through Cloudflare Pages. The refactor branch deliberately does not introduce a Worker, database, framework, build step, or external runtime dependency.

## Refactor strategy

The first step is a behaviour-preserving extraction of the existing inline CSS and JavaScript into separate files. The game rules and save format should remain unchanged during this step.

- `index.html`: page structure and script/style entry points.
- `styles/main.css`: existing presentation rules.
- `src/main.js`: existing game logic, extracted as a classic browser script so current global handlers and inline event attributes keep working.
- `docs/architecture-roadmap.md`: staged plan for the next changes.

## Planned module boundaries

As logic is changed and tested, split the monolithic script into focused modules:

- core state, grid and clock
- pathfinding and player movement
- economy, accommodation, hookups and guest lifecycle
- NPC movement and activity selection
- canvas rendering and sprite/tileset handling
- persistence and save migrations
- UI and input

Do not perform this split as one large rewrite. Move one cohesive responsibility at a time and validate it against the current behaviour.

## Compatibility rules

- Preserve the existing `caravan_tycoon_save` localStorage key and existing save fields.
- Add explicit save migrations before changing persisted structures.
- Keep upfront guest payment and daily rental income as separate mechanics.
- Preserve the existing localStorage save envelope and migrate guest/facility structures when adding party bookings, facility capacity, or operating state.
- Keep the current Pages deployment until a server-side requirement justifies Workers.
