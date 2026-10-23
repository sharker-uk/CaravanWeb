const test = require('node:test');
const assert = require('node:assert/strict');
const Construction = require('../src/construction.js');

test('construction completes only after two in-game hours, including across midnight', () => {
  const state = {
    day: 1,
    hour: 23,
    minute: 30,
    constructions: []
  };
  const job = Construction.queueConstruction(state, {kind: 'surface'});
  assert.equal(job.completesAt, 24 * 60 + 90);
  assert.equal(Construction.completeDueConstructions(state, () => true), 0);

  state.day = 2;
  state.hour = 1;
  state.minute = 29;
  assert.equal(Construction.completeDueConstructions(state, () => true), 0);

  state.minute = 30;
  let completedJob;
  assert.equal(Construction.completeDueConstructions(state, value => {
    completedJob = value;
    return true;
  }), 1);
  assert.equal(completedJob.kind, 'surface');
  assert.equal(state.constructions.length, 0);
});

test('a construction remains queued when its completion handler reports failure', () => {
  const state = {day: 1, hour: 12, minute: 0, constructions: []};
  Construction.queueConstruction(state, {kind: 'facility'});
  state.hour = 14;

  assert.equal(Construction.completeDueConstructions(state, () => false), 0);
  assert.equal(state.constructions.length, 1);
});
