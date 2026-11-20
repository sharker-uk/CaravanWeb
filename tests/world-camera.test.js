const test = require('node:test');
const assert = require('node:assert/strict');
const Camera = require('../src/world-camera.js');

test('walking camera uses the same scale and player framing across the gate', () => {
    const park = Camera.target({x: 8.1, y: 25});
    const village = Camera.target({x: 7.9, y: 25});
    assert.equal(park.zoom, village.zoom);
    assert.equal(park.y, village.y);
    assert.equal(park.x - village.x, 4);
});

test('camera smoothing is stable and converges without overshoot', () => {
    const a = {x: 0, y: 0, zoom: 1};
    const b = {x: 100, y: 80, zoom: .4};
    const next = Camera.smooth(a, b, .016);
    assert.ok(next.x > 0 && next.x < 100);
    assert.ok(next.zoom < 1 && next.zoom > .4);
    assert.deepEqual(Camera.smooth(a, b, 0), a);
});
