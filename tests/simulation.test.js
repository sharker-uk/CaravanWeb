const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Simulation = require('../src/simulation.js');

test('browser loads the simulation clock before the simulation module', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const clockIndex = html.indexOf('src="src/simulation-clock.js"');
  const simulationIndex = html.indexOf('src="src/simulation.js"');
  const partyIndex = html.indexOf('src="src/guest-parties.js"');
  const facilityIndex = html.indexOf('src="src/facility-operations.js"');
  const staticCaravansIndex = html.indexOf('src="src/static-caravans.js"');
  const capabilitiesIndex = html.indexOf('src="src/pitch-capabilities.js"');
  const migrationIndex = html.indexOf('src="src/save-migrations.js"');
  const constructionIndex = html.indexOf('src="src/construction.js"');
  const mainIndex = html.indexOf('src="src/main.js"');

  assert.notEqual(clockIndex, -1, 'simulation-clock.js must be included');
  assert.notEqual(simulationIndex, -1, 'simulation.js must be included');
  assert.ok(clockIndex < simulationIndex, 'simulation clock must load first');
  assert.ok(partyIndex < mainIndex, 'guest party logic must load before the game');
  assert.ok(facilityIndex < migrationIndex, 'facility defaults must load before save migrations');
  assert.ok(facilityIndex < capabilitiesIndex, 'facility operations must load before pitch capabilities');
  assert.ok(staticCaravansIndex < capabilitiesIndex, 'static catalogue must load before pitch capabilities');
  assert.ok(capabilitiesIndex < mainIndex, 'pitch capabilities must load before the game');
  assert.ok(migrationIndex < mainIndex, 'save migrations must load before the game');
  assert.ok(constructionIndex < mainIndex, 'construction queue must load before the game');
  assert.match(html, /id="start-screen"/, 'new players must see a controls screen');
  assert.match(html, /id="sleep-prompt"/, 'the farmhouse sleep prompt must be available');
  assert.match(html, /id="sleep-transition"/, 'sleep must have a black-screen transition');
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
