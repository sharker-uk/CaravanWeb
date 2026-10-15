const test = require('node:test');
const assert = require('node:assert/strict');
const PitchCapabilities = require('../src/pitch-capabilities.js');

function createState(pitchType = 'gravel') {
  const tiles = Array.from({length: 8}, () => Array.from({length: 8}, () => ({
    terrain: 'grass',
    road: false,
    path: false,
    utilities: {gas: false, water: false, electricity: false, waste: false}
  })));
  for (let x = 0; x <= 2; x++) {
    tiles[1][x].road = true;
    for (const utility of ['gas', 'water', 'electricity', 'waste']) {
      tiles[1][x].utilities[utility] = true;
    }
  }
  const pitch = {x: 2, y: 2, w: 2, h: 2, type: pitchType, occupied: false};
  return {
    tiles,
    pitches: [pitch],
    facilities: [{
      type: 'toilets', x: 2, y: 4, w: 3, h: 3,
      capacity: 8, isOperational: true
    }]
  };
}

test('pitch index derives physical accommodation, utility, and local service capabilities', () => {
  const state = createState();
  const index = PitchCapabilities.rebuild(state);
  const [record] = index.records;

  assert.deepEqual(record.accommodations, ['towed', 'static']);
  assert.deepEqual(record.utilities, {
    gas: true, water: true, electricity: true, waste: true
  });
  assert.equal(record.services.toilets, 8);
  assert.equal(Object.hasOwn(record, 'occupied'), false);
  assert.equal(Object.hasOwn(record, 'availability'), false);
});

test('candidate queries filter cached capabilities and read current pitch availability', () => {
  const state = createState();
  const index = PitchCapabilities.rebuild(state);
  const requirements = {
    accommodations: ['tent', 'static'],
    headcount: 4,
    requiredUtilities: ['water', 'electricity'],
    requiredServices: ['toilets']
  };

  assert.deepEqual(
    PitchCapabilities.findCandidates(index, requirements)
      .map(candidate => candidate.accommodation),
    ['static']
  );
  state.pitches[0].occupied = true;
  assert.deepEqual(PitchCapabilities.findCandidates(index, requirements), []);
});

test('rebuilding reflects facility changes and final validation catches stale candidates', () => {
  const state = createState('grass');
  const pitch = state.pitches[0];
  const index = PitchCapabilities.rebuild(state);
  const requirements = {
    accommodation: 'tent',
    headcount: 4,
    requiredServices: ['toilets']
  };

  assert.equal(PitchCapabilities.canHost(index, state, pitch, requirements), true);
  state.facilities[0].isOperational = false;
  assert.equal(PitchCapabilities.canHost(index, state, pitch, requirements), false);
  PitchCapabilities.rebuild(state, index);
  assert.deepEqual(index.records[0].services, {});
  assert.deepEqual(PitchCapabilities.findCandidates(index, {
    accommodations: ['tent'],
    headcount: 4,
    requiredServices: ['toilets']
  }), []);
});
