const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/game-rules.js');
const { advanceSimulationState } = require('../src/simulation.js');

test('simulation update step keeps the same decay and rating behavior', () => {
  const state = {
    isPaused: false,
    weather: 'Sunny',
    satisfaction: 60,
    rating: 1.0,
    caravans: [{ condition: 50, isBroken: false }],
    facilities: [{ type: 'shop' }],
    hour: 9,
    minute: 0,
    day: 1,
    dayLengthMinutes: 10,
    simulationSpeed: 1,
    cash: 100,
    guests: []
  };

  advanceSimulationState(state, 1, { onHourly: () => {}, onDaily: () => {} });

  assert.ok(state.caravans[0].condition < 50);
  assert.ok(state.rating >= 1.0);
  assert.ok(Number.isFinite(state.satisfaction));
});

test('paused simulation does not advance guest movement or activities', () => {
  const pitch = {x: 1, y: 1, w: 4, h: 4, type: 'grass'};
  const position = {x: 1.5, y: 1.5};
  const state = {
    isPaused: true,
    weather: 'Sunny',
    satisfaction: 60,
    rating: 1,
    caravans: [],
    facilities: [],
    pitches: [pitch],
    guests: [{
      pitch,
      position: {...position},
      path: [{x: 2.5, y: 1.5}],
      destination: {x: 2.5, y: 1.5},
      activity: 'visiting facility',
      activityTimer: 10,
      accommodation: 'tent'
    }],
    tiles: Array.from({length: 6}, () =>
      Array.from({length: 6}, () => ({terrain: 'grass', nature: null}))
    ),
    hour: 9,
    minute: 0,
    day: 1,
    dayLengthMinutes: 10,
    simulationSpeed: 1
  };

  advanceSimulationState(state, 1);
  assert.deepEqual(state.guests[0].position, position);
  assert.equal(state.guests[0].activityTimer, 10);
  assert.equal(state.guests[0].path.length, 1);
});
