const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/game-rules.js');
const Simulation = require('../src/simulation.js');
const { advanceSimulationState } = Simulation;

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

test('caravan decay scales with elapsed time and simulation speed', () => {
  const makeState = simulationSpeed => ({
    isPaused: false,
    weather: 'Sunny',
    satisfaction: 60,
    rating: 1,
    caravans: [{condition: 80, isBroken: false}],
    facilities: [],
    guests: [],
    day: 1,
    hour: 9,
    minute: 0,
    dayLengthMinutes: 10,
    simulationSpeed
  });
  const normalSpeed = makeState(1);
  const doubleSpeed = makeState(2);

  advanceSimulationState(normalSpeed, 1);
  advanceSimulationState(doubleSpeed, 1);

  assert.ok(Math.abs(80 - normalSpeed.caravans[0].condition - 0.005) < 1e-10);
  assert.ok(Math.abs(80 - doubleSpeed.caravans[0].condition - 0.01) < 1e-10);
});

test('fast-forward-equivalent hourly caravan decay matches normal simulation time', () => {
  const fastForwarded = {
    weather: 'Rain',
    dayLengthMinutes: 10,
    simulationSpeed: 2,
    caravans: [{condition: 80, isBroken: false}]
  };
  const normallySimulated = {
    isPaused: false,
    weather: 'Rain',
    dayLengthMinutes: 10,
    simulationSpeed: 2,
    caravans: [{condition: 80, isBroken: false}],
    facilities: [],
    guests: [],
    day: 1,
    hour: 9,
    minute: 0
  };
  const elapsedSecondsPerHour = 10 * 600 / 24;

  Simulation.applyCaravanDecay(fastForwarded, elapsedSecondsPerHour);
  advanceSimulationState(normallySimulated, elapsedSecondsPerHour / 2);

  assert.equal(fastForwarded.caravans[0].condition, normallySimulated.caravans[0].condition);
});

test('simulation notifies callers when decay breaks a caravan', () => {
  const state = {
    isPaused: false,
    weather: 'Sunny',
    satisfaction: 60,
    rating: 1,
    caravans: [{condition: 39.99, isBroken: false}],
    facilities: [],
    guests: [],
    day: 1,
    hour: 9,
    minute: 0,
    dayLengthMinutes: 10,
    simulationSpeed: 1
  };
  const originalRandom = Math.random;
  let statusChangeCalls = 0;
  try {
    Math.random = () => 0;
    advanceSimulationState(state, 1, {
      onCaravanStatusChange: () => { statusChangeCalls++; }
    });
  } finally {
    Math.random = originalRandom;
  }

  assert.equal(state.caravans[0].isBroken, true);
  assert.equal(statusChangeCalls, 1);
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
