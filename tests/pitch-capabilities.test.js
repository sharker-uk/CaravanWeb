const test = require('node:test');
const assert = require('node:assert/strict');
const PitchCapabilities = require('../src/pitch-capabilities.js');
const StaticCaravans = require('../src/static-caravans.js');

function createState(pitchType = 'gravel', installStatic = true) {
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
  const state = {
    tiles,
    pitches: [pitch],
    caravans: [],
    guests: [],
    constructions: [],
    facilities: [{
      type: 'toilets', x: 2, y: 4, w: 3, h: 3,
      capacity: 8, isOperational: true
    }]
  };
  if (pitchType === 'gravel' && installStatic) {
    const caravan = StaticCaravans.createVan('basic-1br', {
      id: 'test-static', pitchId: 'test-pitch'
    });
    pitch.id = 'test-pitch';
    caravan.pitch = pitch;
    state.caravans.push(caravan);
  }
  return state;
}

test('pitch index derives physical accommodation, utility, and local service capabilities', () => {
  const state = createState();
  const index = PitchCapabilities.rebuild(state);
  const [record] = index.records;

  assert.deepEqual(record.accommodations, ['static']);
  assert.deepEqual(record.utilities, {
    gas: true, water: true, electricity: true, waste: true
  });
  assert.equal(record.services.toilets, 8);
  assert.equal(record.staticEligible, true);
  assert.equal(record.staticInstalled, true);
  assert.equal(record.staticCapacity, 4);
  assert.equal(record.availability, 'available');
});

test('empty hardstanding pitches remain static-eligible but do not have static accommodation capacity', () => {
  const state = createState('gravel', false);
  const record = PitchCapabilities.rebuild(state).records[0];
  assert.equal(record.staticEligible, true);
  assert.equal(record.staticInstalled, false);
  assert.equal(record.staticCapacity, 0);
  assert.deepEqual(record.accommodations, ['tent', 'towed']);
  const grass = createState('grass');
  const grassRecord = PitchCapabilities.rebuild(grass).records[0];
  assert.equal(grassRecord.staticEligible, false);
  assert.equal(grassRecord.accommodations.includes('static'), false);
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
