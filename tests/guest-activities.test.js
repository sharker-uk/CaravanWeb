const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/game-rules.js');
require('../src/static-caravans.js');
const {isWalkable, updateGuestActivities, calculateGuestExperience, updateGuestSatisfaction} =
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

test('static caravan collision blocks only its footprint, not the rest of its pitch', () => {
  const pitch = {x: 2, y: 2, w: 6, h: 8, type: 'gravel'};
  const caravan = {pitch};
  const guest = {pitch};
  const state = {
    tiles: Array.from({length: 12}, () =>
      Array.from({length: 12}, () => ({terrain: 'grass', nature: null}))
    ),
    caravans: [caravan],
    facilities: [],
    landmarks: [],
    constructions: [],
    guests: [guest]
  };

  assert.equal(isWalkable(state, 2, 4, guest), true);
  assert.equal(isWalkable(state, 3, 4, guest), false);
});

test('families return to their pitch at bedtime and wake after seven', () => {
  const pitch = {x: 2, y: 2, w: 4, h: 4, type: 'grass'};
  const guest = {
    pitch,
    party: {type: 'family'},
    position: {x: 3.5, y: 3.5},
    path: [],
    activity: 'relaxing at pitch',
    activityTimer: 10,
    bedtimeHour: 19,
    lastBedtimeDay: null
  };
  const state = {
    day: 3,
    hour: 19,
    minute: 0,
    tiles: Array.from({length: 10}, () =>
      Array.from({length: 10}, () => ({terrain: 'grass', nature: null}))
    ),
    caravans: [],
    facilities: [],
    landmarks: [],
    constructions: [],
    guests: [guest]
  };

  updateGuestActivities(state, 0.1);
  assert.equal(guest.activity, 'sleeping');
  assert.equal(guest.lastBedtimeDay, 3);

  state.hour = 6;
  updateGuestActivities(state, 0.1);
  assert.equal(guest.activity, 'sleeping');

  state.hour = 7;
  updateGuestActivities(state, 0.1);
  assert.equal(guest.activity, 'relaxing at pitch');
});

test('couple bedtime after midnight is associated with the previous night', () => {
  const pitch = {x: 2, y: 2, w: 4, h: 4, type: 'grass'};
  const guest = {
    pitch,
    party: {type: 'couple', ageGroup: 'young'},
    position: {x: 3.5, y: 3.5},
    path: [],
    activity: 'relaxing at pitch',
    activityTimer: 10,
    bedtimeHour: 25,
    lastBedtimeDay: null
  };
  const state = {
    day: 4,
    hour: 1,
    minute: 0,
    tiles: Array.from({length: 10}, () =>
      Array.from({length: 10}, () => ({terrain: 'grass', nature: null}))
    ),
    caravans: [],
    facilities: [],
    landmarks: [],
    constructions: [],
    guests: [guest]
  };

  updateGuestActivities(state, 0.1);

  assert.equal(guest.activity, 'sleeping');
  assert.equal(guest.lastBedtimeDay, 3);
});

test('guests walk back to their pitch before sleeping', () => {
  const pitch = {x: 3, y: 2, w: 4, h: 4, type: 'grass'};
  const guest = {
    pitch,
    party: {type: 'family'},
    position: {x: 1.5, y: 1.5},
    path: [],
    activity: 'strolling around the park',
    activityTimer: 10,
    bedtimeHour: 19,
    lastBedtimeDay: null
  };
  const state = {
    day: 2,
    hour: 20,
    minute: 0,
    tiles: Array.from({length: 10}, () =>
      Array.from({length: 10}, () => ({terrain: 'grass', nature: null}))
    ),
    caravans: [],
    facilities: [],
    landmarks: [],
    constructions: [],
    guests: [guest]
  };

  updateGuestActivities(state, 0.1);

  assert.equal(guest.activity, 'returning to accommodation');
  assert.ok(guest.path.length > 0);
  assert.ok(guest.destination.x >= pitch.x && guest.destination.x < pitch.x + pitch.w);
  assert.ok(guest.destination.y >= pitch.y && guest.destination.y < pitch.y + pitch.h);
});

test('guests select a reachable facility and move through world coordinates', () => {
  const state = createState();
  const startX = state.guests[0].position.x;
  const originalRandom = Math.random;
  try {
    // Force the facility branch so this test does not intermittently choose a stroll.
    Math.random = () => 0.9;
    updateGuestActivities(state, 4);
  } finally {
    Math.random = originalRandom;
  }

  assert.ok(state.guests[0].position.x > startX);
  assert.equal(state.guests[0].activity, 'visiting facility');
});

test('guest pathfinding treats blocking map landmarks as obstacles', () => {
  const state = createState();
  state.landmarks = [{x: 5, y: 0, w: 1, h: 12, blocksMovement: true}];

  updateGuestActivities(state, 0.1);

  assert.equal(state.guests[0].activity, 'relaxing at pitch');
  assert.deepEqual(state.guests[0].path, []);
});

test('guest satisfaction responds to utilities, stay quality, and facility access', () => {
  const state = createState();
  const guest = state.guests[0];
  guest.accommodation = 'towed';
  const noUtilityScore = calculateGuestExperience(state, guest);
  // Utilities count only when the laid line reaches the incoming feed at the park edge.
  for (let x = 0; x <= 4; x++) {
    state.tiles[6][x].utilities.water = true;
    state.tiles[6][x].utilities.electricity = true;
  }
  const hooked = state.tiles[6][4].utilities;
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
