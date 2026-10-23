const test = require('node:test');
const assert = require('node:assert/strict');
const AssetRenderer = require('../src/asset-renderer.js');

test('asset renderer preserves procedural fallback when a sprite is unavailable', () => {
    let fallbackCalls = 0;
    const context = {};
    const drawn = AssetRenderer.draw(context, 'terrain.grass.0', 0, 0, 16, 16, () => {
        fallbackCalls++;
    });

    assert.equal(drawn, false);
    assert.equal(fallbackCalls, 1);
});

test('asset renderer does not require browser image APIs to be present in tests', () => {
    assert.equal(typeof AssetRenderer.draw, 'function');
    assert.equal(typeof AssetRenderer.load, 'function');
});
