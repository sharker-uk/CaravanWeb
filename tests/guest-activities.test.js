const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/game-rules.js');
const {updateGuestActivities, calculateGuestExperience, updateGuestSatisfaction} =
  require('../src/guest-activities.js');

function createState() {
  const tiles = Array.from({length: 12}, () =>
    Array.from({length: 12}, () => ({
      terrain: 'grass', nature: null, road: false, path: false,
      utilities: {gas: false, water: false, electricity: false, waste: false}
    }))
  );
  for (let x = 0; x < 12; x++) tiles[6][x].path = true;
  const pitch = {x: 3, y: 2, w: 4, h: 4, type: 'grass', occupied: true};
  return {
    tiles,
    pitches: [pitch],
    facilities: [{x: 8, y: 4, w: 2, h: 2, type: 'shop'}],
    caravans: [],
    guests: [{
      pitch,
      accommodation: 'tent',
      position: {x: 4.5, y: 6.5},
      path: [],
      activity: 'relaxing at pitch',
      activityTimer: 0
    }],
    satisfaction: 40,
    rating: 2
  };
}

test('guests select a reachable facility and move through world coordinates', () => {
  const state = createState();
  const startX = state.guests[0].position.x;
  updateGuestActivities(state, 4);

  assert.ok(state.guests[0].position.x > startX);
  assert.equal(state.guests[0].activity, 'visiting facility');
});

test('guest satisfaction responds to utilities, stay quality, and facility access', () => {
  const state = createState();
  const guest = state.guests[0];
  guest.accommodation = 'towed';
  const noUtilityScore = calculateGuestExperience(state, guest);
  const hooked = state.tiles[6][4].utilities;
  hooked.water = true;
  hooked.electricity = true;
  const utilityScore = calculateGuestExperience(state, guest);
  assert.ok(utilityScore > noUtilityScore);

  updateGuestSatisfaction(state);
  assert.ok(state.satisfaction > 40);
  assert.ok(state.rating >= 1 && state.rating <= 5);
});

test('weather changes the quality of an individual tent stay', () => {
  const state = createState();
  const guest = state.guests[0];
  const sunnyScore = calculateGuestExperience(state, guest);
  state.weather = 'Rain';
  const rainyScore = calculateGuestExperience(state, guest);
  assert.equal(rainyScore, sunnyScore - 6);
});

test('guests abandon blocked routes and recover instead of walking through one another', () => {
  const state = createState();
  const guest = state.guests[0];
  updateGuestActivities(state, 0.1);
  const blockedTile = guest.path[0];
  state.guests.push({
    pitch: {x: 0, y: 0, w: 1, h: 1},
    position: {x: blockedTile.x, y: blockedTile.y},
    path: [],
    activityTimer: 20
  });

  updateGuestActivities(state, 0.1);
  assert.equal(guest.routeFailures, 1);
  assert.equal(guest.activity, 'waiting for a clear route');
});
