const test = require('node:test');
const assert = require('node:assert/strict');
const { migrateSave, CURRENT_SAVE_SCHEMA } = require('../src/save-migrations.js');

function buildLegacySave() {
  return {
    cash: 1500,
    tiles: [
      Array.from({ length: 60 }, () => ({ type: 'grass' })),
      Array.from({ length: 60 }, () => ({ type: 'grass' }))
    ],
    pitches: [{ x: 2, y: 2, w: 4, h: 2, type: 'grass', occupied: false }],
    guests: [{ pitchIndex: 0, accommodation: 'tent', ratingAtArrival: 1.2, dailyIncome: 30, totalIncome: 90, stayDaysRemaining: 3 }],
    caravans: [{ tier: 1, pitchIndex: 0, condition: 82, isBroken: false }],
    facilities: [{ x: 1, y: 1, w: 2, h: 2, type: 'shop' }],
    handymen: 1,
    day: 4,
    hour: 11,
    minute: 12,
    satisfaction: 72,
    rating: 1.6,
    weather: 'Rain',
    dayLengthMinutes: 12,
    simulationSpeed: 2,
    isPaused: true,
    camera: { x: 10, y: 20, zoom: 1.7 },
    player: { x: 3.5, y: 4.5 }
  };
}

test('migrateSave upgrades legacy save payloads to the current schema', () => {
  const migrated = migrateSave(buildLegacySave());
  assert.equal(migrated.schemaVersion, CURRENT_SAVE_SCHEMA);
  assert.equal(Array.isArray(migrated.tiles), true);
  assert.equal(migrated.tiles[0][0].terrain, 'grass');
  assert.equal(migrated.pitches[0].type, 'grass');
  assert.equal(migrated.guests[0].accommodation, 'tent');
  assert.equal(migrated.caravans[0].tier, 1);
  assert.equal(migrated.camera.zoom, 1.7);
  assert.equal(migrated.player.x, 3.5);
  assert.equal(migrated.initialBalance, 1500);
  assert.deepEqual(migrated.transactions, []);
  assert.equal(migrated.guestArrivalProgress, 0);
});

test('migrateSave preserves guest world state and transaction history', () => {
  const save = buildLegacySave();
  save.initialBalance = 2000;
  save.transactions = [{day: 4, amount: -500, category: 'construction', description: 'Built path', balance: 1500}];
  save.cash = 1500;
  save.guests[0].position = {x: 7.5, y: 8.5};
  save.guests[0].path = [{x: 8.5, y: 8.5}];
  save.guests[0].activity = 'visiting facility';
  save.guests[0].facilityVisits = 2;
  const migrated = migrateSave(save);

  assert.deepEqual(migrated.transactions, save.transactions);
  assert.deepEqual(migrated.guests[0].position, {x: 7.5, y: 8.5});
  assert.deepEqual(migrated.guests[0].path, [{x: 8.5, y: 8.5}]);
  assert.equal(migrated.guests[0].activity, 'visiting facility');
  assert.equal(migrated.guests[0].facilityVisits, 2);
});

test('migrateSave keeps already migrated saves stable', () => {
  const migrated = migrateSave({
    schemaVersion: CURRENT_SAVE_SCHEMA,
    cash: 2000,
    tiles: Array.from({ length: 40 }, () => Array.from({ length: 60 }, () => ({ terrain: 'grass', nature: null, road: false, path: false, utilities: { gas: false, water: false, electricity: false, waste: false } }))),
    pitches: [],
    caravans: [],
    guests: [],
    facilities: [],
    handymen: 0,
    day: 1,
    hour: 9,
    minute: 0,
    satisfaction: 60,
    rating: 1,
    weather: 'Sunny',
    dayLengthMinutes: 10,
    simulationSpeed: 1,
    isPaused: false,
    camera: { x: 100, y: 100, zoom: 1.8 },
    player: { x: 5.5, y: 10.5 }
  });

  assert.equal(migrated.schemaVersion, CURRENT_SAVE_SCHEMA);
  assert.equal(migrated.cash, 2000);
});
