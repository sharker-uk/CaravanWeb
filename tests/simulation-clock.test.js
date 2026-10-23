const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createSimulationState,
  advanceSimulation,
  setSimulationSpeed,
  togglePause,
  canSleep,
  advanceToHour
} = require('../src/simulation-clock.js');

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

test('sleep is available from 8pm until before 5am', () => {
  assert.equal(canSleep(createSimulationState({hour: 19, minute: 59})), false);
  assert.equal(canSleep(createSimulationState({hour: 20})), true);
  assert.equal(canSleep(createSimulationState({hour: 4, minute: 59})), true);
  assert.equal(canSleep(createSimulationState({hour: 5})), false);
});

test('fast-forwarding to 8am advances overnight and runs hourly and daily callbacks', () => {
  const state = createSimulationState({day: 3, hour: 20, minute: 30, isPaused: true});
  let hourlyCalls = 0;
  let dailyCalls = 0;

  advanceToHour(state, 8, {
    onHourly: () => { hourlyCalls++; },
    onDaily: () => { dailyCalls++; }
  });

  assert.equal(state.day, 4);
  assert.equal(state.hour, 8);
  assert.equal(state.minute, 0);
  assert.equal(state.isPaused, true);
  assert.equal(hourlyCalls, 12);
  assert.equal(dailyCalls, 1);
});

test('fast-forwarding from before dawn reaches 8am on the same day', () => {
  const state = createSimulationState({day: 2, hour: 4, minute: 30});

  advanceToHour(state, 8);

  assert.equal(state.day, 2);
  assert.equal(state.hour, 8);
  assert.equal(state.minute, 0);
});

test('fast-forwarding rounds fractional clock precision to exactly 8am', () => {
  const state = createSimulationState({day: 1, hour: 20, minute: 47.123456789});

  advanceToHour(state, 8);

  assert.equal(state.day, 2);
  assert.equal(state.hour, 8);
  assert.equal(state.minute, 0);
});
