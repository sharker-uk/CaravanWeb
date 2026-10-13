const test = require('node:test');
const assert = require('node:assert/strict');
const ParkServices = require('../src/park-services.js');
const GameRules = require('../src/game-rules.js');
const FacilityOperations = require('../src/facility-operations.js');

function map(width = 8, height = 6) {
  return Array.from({length: height}, () => Array.from({length: width}, () => ({
    terrain: 'grass', road: false, path: false,
    utilities: {gas: false, water: false, electricity: false, waste: false}
  })));
}

function route(tileMap, x, y, type = 'road', utility) {
  tileMap[y][x][type] = true;
  if (utility) tileMap[y][x].utilities[utility] = true;
}

test('utility only connects through contiguous route tiles back to the park-edge incoming feed', () => {
  const tiles = map();
  route(tiles, 0, 2, 'road', 'water');
  route(tiles, 1, 2, 'road', 'water');
  route(tiles, 2, 2, 'path', 'water');
  route(tiles, 4, 2, 'road', 'water');
  const connected = ParkServices.getConnectedUtilityTiles(tiles, 'water');
  assert.equal(connected.has('0,2'), true);
  assert.equal(connected.has('2,2'), true);
  assert.equal(connected.has('4,2'), false);
});

test('pitch hookups require utility on an adjacent road/path and a connected feed', () => {
  const tiles = map();
  const pitch = {x: 2, y: 2, w: 2, h: 2, type: 'gravel'};
  route(tiles, 2, 1, 'road', 'electricity');
  assert.equal(GameRules.getPitchHookups(pitch, tiles).electricity, false);
  route(tiles, 0, 1, 'road', 'electricity');
  route(tiles, 1, 1, 'road', 'electricity');
  assert.equal(GameRules.getPitchHookups(pitch, tiles).electricity, true);
});

test('local toilet and shower service coverage is limited by radius and operating state', () => {
  const pitch = {x: 10, y: 10, w: 4, h: 6};
  const toilets = {...FacilityOperations.getFacilityDefaults('toilets'), type: 'toilets', x: 5, y: 10, w: 3, h: 3};
  assert.equal(ParkServices.getServiceCoverage(toilets, pitch), true);
  assert.equal(ParkServices.getServiceCoverage({...toilets, x: 0}, pitch), false);
  assert.equal(ParkServices.getServiceCoverage({...toilets, isOperational: false}, pitch), false);
});

test('booking service check requires nearby operational facilities with enough capacity', () => {
  const pitch = {x: 10, y: 10, w: 4, h: 6};
  const state = {facilities: [
    {...FacilityOperations.getFacilityDefaults('toilets'), type: 'toilets', x: 5, y: 10, w: 3, h: 3},
    {...FacilityOperations.getFacilityDefaults('showers'), type: 'showers', x: 5, y: 13, w: 3, h: 3}
  ]};
  assert.deepEqual(ParkServices.getPitchServiceCheck(state, pitch, 'tent', 4), {valid: true, missing: []});
  state.facilities[1].isOperational = false;
  assert.deepEqual(ParkServices.getPitchServiceCheck(state, pitch, 'tent', 4), {valid: false, missing: ['showers']});
});

test('park-wide entertainment capacity aggregates venues and respects simultaneous occupancy', () => {
  const pub = {...FacilityOperations.getFacilityDefaults('pub'), type: 'pub'};
  const hall = {...FacilityOperations.getFacilityDefaults('entertainment_space'), type: 'entertainment_space'};
  const restaurant = {...FacilityOperations.getFacilityDefaults('restaurant'), type: 'restaurant'};
  const state = {facilities: [pub, hall, restaurant], guests: [
    {activity: 'using facility', activityFacilityType: 'pub', party: {headcount: 10}}
  ]};
  assert.equal(ParkServices.getEntertainmentCapacity(state), 52);
  assert.deepEqual(ParkServices.canUseEntertainment(state, 42), {
    valid: true, capacity: 52, occupied: 10, available: 42
  });
  assert.equal(ParkServices.canUseEntertainment(state, 43).valid, false);
});
