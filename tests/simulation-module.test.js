const test = require('node:test');
const assert = require('node:assert/strict');
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
