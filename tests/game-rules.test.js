const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createEmptyUtilities,
  validateSaveData,
  isGuestAccommodationValid,
  validateAccommodationPlacement,
  validateUtilityLine,
  getGuestDailyIncome,
  findPathToAny
} = require('../src/game-rules.js');

function createValidSave(overrides = {}) {
  const tiles = Array.from({length: 40}, () =>
    Array.from({length: 60}, () => ({
      terrain: 'grass',
      nature: null,
      road: false,
      path: false,
      utilities: createEmptyUtilities()
    }))
  );

  const save = {
    cash: 2000,
    rating: 1,
    tiles,
    pitches: [{x: 5, y: 5, w: 3, h: 2, type: 'grass'}],
    caravans: [{tier: 1, pitchIndex: 0}],
    facilities: [],
    guests: [],
    handymen: 0
  };

  return {...save, ...overrides};
}

test('validateSaveData accepts a valid save file', () => {
  const validSave = createValidSave();
  assert.equal(validateSaveData(validSave), true);
});

test('validateSaveData accepts coastal sand terrain', () => {
  const save = createValidSave();
  save.tiles[0][0].terrain = 'sand';
  assert.equal(validateSaveData(save), true);
});

test('validateSaveData rejects bad save structure and malformed data', () => {
  const brokenSave = createValidSave({
    tiles: Array.from({length: 39}, () => Array.from({length: 60}, () => ({ terrain: 'grass' })))
  });
  assert.equal(validateSaveData(brokenSave), false);

  const missingPitch = createValidSave({
    pitches: [{x: 'bad', y: 1, w: 2, h: 2, type: 'grass'}]
  });
  assert.equal(validateSaveData(missingPitch), false);

  const badCaravan = createValidSave({ caravans: [{tier: 3}] });
  assert.equal(validateSaveData(badCaravan), false);
});

test('guest accommodation and income rules match the park logic', () => {
  const grassPitch = {type: 'grass'};
  assert.equal(isGuestAccommodationValid(grassPitch, 'tent'), true);
  assert.equal(isGuestAccommodationValid(grassPitch, 'static'), false);

  const gravelPitch = {type: 'gravel'};
  const hooks = {
    gas: true,
    water: true,
    electricity: true,
    waste: true
  };
  assert.equal(isGuestAccommodationValid(gravelPitch, 'towed'), true);
  assert.equal(
    isGuestAccommodationValid(gravelPitch, 'static', [
      [{road: false, path: false, utilities: createEmptyUtilities()}],
      [{road: false, path: false, utilities: hooks}]
    ]),
    false
  );

  assert.equal(getGuestDailyIncome(1.25), 31);
  assert.equal(getGuestDailyIncome(0), 0);
});

test('accommodation placement reports occupancy, pitch type, and missing hookups', () => {
  const grassPitch = {type: 'grass'};
  assert.match(validateAccommodationPlacement(grassPitch, 'static').reason, /cannot be placed/);
  assert.match(validateAccommodationPlacement(grassPitch, 'towed', [], true).reason, /occupied/);
  const gravelPitch = {x: 2, y: 2, w: 4, h: 4, type: 'gravel'};
  const tileMap = Array.from({length: 8}, () => Array(8).fill(null));
  const result = validateAccommodationPlacement(gravelPitch, 'static', tileMap);
  assert.equal(result.valid, false);
  assert.match(result.reason, /Missing: gas, water, electricity, waste/);
});

test('utility line validation requires a continuous route and rejects duplicate or invalid tiles', () => {
  const tiles = Array.from({length: 3}, () =>
    Array.from({length: 4}, () => ({road: true, path: false, utilities: createEmptyUtilities()}))
  );
  assert.equal(validateUtilityLine({x: 0, y: 1}, {x: 3, y: 1}, tiles, 'water').tiles.length, 4);
  tiles[1][2].utilities.water = true;
  assert.match(validateUtilityLine({x: 0, y: 1}, {x: 3, y: 1}, tiles, 'water').reason, /already laid/);
  tiles[1][2].road = false;
  assert.match(validateUtilityLine({x: 0, y: 1}, {x: 3, y: 1}, tiles, 'gas').reason, /road or path/);
  assert.match(validateUtilityLine({x: -1, y: 1}, {x: 0, y: 1}, tiles, 'gas').reason, /inside the park/);
});

test('findPathToAny can route through walkable tiles and avoid blocked ones', () => {
  const walkable = Array.from({length: 5}, () => Array(5).fill(true));
  walkable[2][1] = false;
  walkable[2][2] = false;
  walkable[2][3] = false;

  const path = findPathToAny({x: 0, y: 0}, [{x: 4, y: 4}], (x, y) => {
    if (y < 0 || y >= walkable.length || x < 0 || x >= walkable[0].length) return false;
    return walkable[y][x];
  });

  assert.ok(path);
  assert.equal(path.length > 0, true);
  assert.deepEqual(path[path.length - 1], {x: 4.5, y: 4.5});
});
