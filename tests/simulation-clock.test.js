const test = require('node:test');
const assert = require('node:assert/strict');
const { createSimulationState, advanceSimulation, setSimulationSpeed, togglePause } = require('../src/simulation-clock.js');

test('simulation speed can be set and applied to time progression', () => {
  const state = createSimulationState({ dayLengthMinutes: 10 });

  setSimulationSpeed(state, 2);
  advanceSimulation(state, 1);

  assert.equal(state.simulationSpeed, 2);
  assert.equal(state.minute, 0.48);
  assert.equal(state.isPaused, false);
});

test('pause stops the simulation clock from advancing', () => {
  const state = createSimulationState({ dayLengthMinutes: 10 });

  togglePause(state);
  advanceSimulation(state, 1);

  assert.equal(state.isPaused, true);
  assert.equal(state.minute, 0);
});
