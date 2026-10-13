const test = require('node:test');
const assert = require('node:assert/strict');
const { harvestYield, calculateBeauty, getTimberSaleValue } = require('../src/land-management.js');

test('tree harvest yields a stable amount of timber for a tile', () => {
  assert.equal(harvestYield(3, 4), harvestYield(3, 4));
  assert.ok(harvestYield(3, 4) >= 4);
  assert.ok(harvestYield(3, 4) <= 7);
});

test('a fully cleared landscape has lower beauty than a lightly wooded landscape', () => {
  const cleared = Array.from({ length: 20 }, () =>
    Array.from({ length: 20 }, () => ({ terrain: 'grass', nature: null }))
  );
  const wooded = cleared.map(row => row.map(tile => ({ ...tile })));
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      if ((x * 7 + y * 11) % 100 < 12) wooded[y][x].nature = 'tree';
    }
  }
  assert.ok(calculateBeauty(wooded) > calculateBeauty(cleared));
});

test('excessive tree coverage is not more attractive than balanced tree coverage', () => {
  const makeTiles = coverage => {
    const tiles = Array.from({ length: 20 }, () =>
      Array.from({ length: 20 }, () => ({ terrain: 'grass', nature: null }))
    );
    let count = Math.floor(400 * coverage);
    for (let y = 0; y < 20 && count > 0; y++) {
      for (let x = 0; x < 20 && count > 0; x++, count--) tiles[y][x].nature = 'tree';
    }
    return tiles;
  };
  assert.ok(calculateBeauty(makeTiles(0.12)) > calculateBeauty(makeTiles(0.3)));
});

test('timber sales value whole units at the fixed sale price', () => {
  assert.equal(getTimberSaleValue(5), 40);
  assert.equal(getTimberSaleValue(2.9), 16);
  assert.equal(getTimberSaleValue(0), 0);
});
