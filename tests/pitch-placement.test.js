const test = require('node:test');
const assert = require('node:assert/strict');
const {planPitchBox, validatePitchPlacement} = require('../src/game-rules.js');

function createTiles() {
  const tiles = Array.from({length: 20}, () =>
    Array.from({length: 20}, () => ({terrain: 'grass', nature: null, road: false, path: false}))
  );
  tiles[5][8].road = true;
  return tiles;
}

test('pitch placement enforces minimum dimensions, route access, terrain, and occupancy', () => {
  const tiles = createTiles();
  const pitch = {x: 8, y: 6, w: 4, h: 6, type: 'grass'};
  assert.equal(validatePitchPlacement({...pitch, w: 3}, tiles).valid, false);
  assert.equal(validatePitchPlacement(pitch, tiles).valid, true);
  assert.match(validatePitchPlacement({...pitch, x: 10}, tiles).reason, /road or path/);
  tiles[6][8].nature = 'tree';
  assert.match(validatePitchPlacement(pitch, tiles).reason, /trees and debris/);
});

test('pitch placement rejects overlap and water with a specific reason', () => {
  const tiles = createTiles();
  const pitch = {x: 8, y: 6, w: 4, h: 6, type: 'grass'};
  assert.match(validatePitchPlacement(pitch, tiles, [pitch]).reason, /overlaps/);
  tiles[6][8].terrain = 'water';
  assert.match(validatePitchPlacement(pitch, tiles).reason, /dry grass/);
});

test('pitch box layout fills the selected rectangle with minimum-sized pitches', () => {
  const layout = planPitchBox({x: 3, y: 4}, {x: 10, y: 15}, 'grass');
  assert.equal(layout.valid, true);
  assert.equal(layout.pitches.length, 4);
  assert.deepEqual(layout.box, {x: 3, y: 4, w: 8, h: 12});
  assert.equal(layout.pitches.reduce((area, pitch) => area + pitch.w * pitch.h, 0), 96);
  assert.ok(layout.pitches.every(pitch => pitch.w >= 4 && pitch.h >= 6));

  const undersized = planPitchBox({x: 0, y: 0}, {x: 2, y: 5}, 'grass');
  assert.equal(undersized.valid, false);
  assert.match(undersized.reason, /4 × 6/);
});
