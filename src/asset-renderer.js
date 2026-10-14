(function (globalScope) {
    'use strict';

    let manifest = {version: 1, atlas: null, sprites: {}};
    let atlas = null;
    let loadStarted = false;

    function load() {
        if (loadStarted) return;
        loadStarted = true;
        if (typeof fetch !== 'function' || typeof Image === 'undefined') return;
        fetch('assets/tileset.json')
            .then(response => {
                if (!response.ok) throw new Error('Tileset manifest unavailable');
                return response.json();
            })
            .then(data => {
                if (!data || typeof data !== 'object') return;
                manifest = {
                    version: Number(data.version) || 1,
                    atlas: typeof data.atlas === 'string' ? data.atlas : null,
                    sprites: data.sprites && typeof data.sprites === 'object' ? data.sprites : {}
                };
                if (!manifest.atlas || !Object.keys(manifest.sprites).length) return;
                const image = new Image();
                image.onload = () => { atlas = image; };
                image.onerror = () => {
                    console.warn('Caravan Park Tycoon tileset could not be loaded; using fallback artwork.');
                };
                image.src = manifest.atlas;
            })
            .catch(() => {
                // Missing art must never prevent the prototype from starting.
            });
    }

    function draw(ctx, key, x, y, width, height, fallback) {
        const sprite = manifest.sprites[key];
        if (atlas && sprite &&
            ['x', 'y', 'w', 'h'].every(field => Number.isFinite(sprite[field])) &&
            sprite.w > 0 && sprite.h > 0) {
            const previousSmoothing = ctx.imageSmoothingEnabled;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(atlas, sprite.x, sprite.y, sprite.w, sprite.h, x, y, width, height);
            ctx.imageSmoothingEnabled = previousSmoothing;
            return true;
        }
        if (typeof fallback === 'function') fallback();
        return false;
    }

    const api = {load, draw};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.AssetRenderer = api;
    load();
})(typeof window !== 'undefined' ? window : globalThis);
