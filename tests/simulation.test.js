const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Simulation = require('../src/simulation.js');

test('browser loads the simulation clock before the simulation module', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const clockIndex = html.indexOf('src="src/simulation-clock.js"');
  const simulationIndex = html.indexOf('src="src/simulation.js"');

  assert.notEqual(clockIndex, -1, 'simulation-clock.js must be included');
  assert.notEqual(simulationIndex, -1, 'simulation.js must be included');
  assert.ok(clockIndex < simulationIndex, 'simulation clock must load first');
});

test('paused simulation freezes time, caravan condition, satisfaction and rating', () => {
  const state = {
    isPaused: true,
    day: 1,
    hour: 9,
    minute: 0,
    dayLengthMinutes: 10,
    simulationSpeed: 1,
    weather: 'Rain',
    caravans: [{ condition: 80, isBroken: false }],
    facilities: [],
    satisfaction: 20,
    rating: 4
  };
  let hourlyCalls = 0;
  let dailyCalls = 0;
  let afterUpdateCalls = 0;

  Simulation.advanceSimulationState(state, 30, {
    onHourly: () => { hourlyCalls++; },
    onDaily: () => { dailyCalls++; },
    onAfterUpdate: () => { afterUpdateCalls++; }
  });

  assert.equal(state.day, 1);
  assert.equal(state.hour, 9);
  assert.equal(state.minute, 0);
  assert.equal(state.caravans[0].condition, 80);
  assert.equal(state.satisfaction, 20);
  assert.equal(state.rating, 4);
  assert.equal(hourlyCalls, 0);
  assert.equal(dailyCalls, 0);
  assert.equal(afterUpdateCalls, 1, 'UI refresh callback may still run while paused');
});

test('unpaused simulation still advances and applies simulation updates', () => {
  const state = {
    isPaused: false,
    day: 1,
    hour: 9,
    minute: 0,
    dayLengthMinutes: 10,
    simulationSpeed: 1,
    weather: 'Rain',
    caravans: [{ condition: 80, isBroken: false }],
    facilities: [],
    satisfaction: 20,
    rating: 4
  };

  Simulation.advanceSimulationState(state, 1);

  assert.ok(state.minute > 0, 'game clock should advance');
  assert.ok(state.caravans[0].condition < 80, 'caravan condition should decay');
  assert.notEqual(state.satisfaction, 20, 'satisfaction should update');
});
