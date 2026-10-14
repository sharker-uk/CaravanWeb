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

test('migrateSave defaults missing starting cash to £1,500', () => {
  const save = buildLegacySave();
  delete save.cash;
  delete save.initialBalance;
  const migrated = migrateSave(save);
  assert.equal(migrated.cash, 1500);
  assert.equal(migrated.initialBalance, 1500);
});

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
  assert.equal(migrated.guests[0].party.type, 'solo');
  assert.equal(migrated.guests[0].party.headcount, 1);
  assert.equal(migrated.guests[0].booking.status, 'checked-in');
  assert.equal(migrated.facilities[0].isOperational, true);
  assert.equal(migrated.facilities[0].capacity, 10);
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
  assert.equal(migrated.guests[0].party.needs.satisfaction, 75);
  assert.equal(migrated.guests[0].booking.departureDay, 7);
});

test('migrateSave retains party details and facility operating state', () => {
  const save = buildLegacySave();
  save.guests[0].party = {
    type: 'family',
    adults: 2,
    children: 2,
    preferences: {preferredFacilities: ['playground']},
    needs: {satisfaction: 48, missedToiletVisits: 2}
  };
  save.guests[0].booking = {
    id: 'booking-1',
    bookedDay: 2,
    arrivalDay: 3,
    departureDay: 6,
    status: 'checked-in',
    source: 'demand'
  };
  save.facilities[0] = {
    ...save.facilities[0],
    isOperational: false,
    capacity: 24,
    hourlyCost: 3
  };

  const migrated = migrateSave(save);
  assert.equal(migrated.guests[0].party.headcount, 4);
  assert.equal(migrated.guests[0].party.needs.satisfaction, 48);
  assert.equal(migrated.guests[0].booking.id, 'booking-1');
  assert.equal(migrated.facilities[0].isOperational, false);
  assert.equal(migrated.facilities[0].capacity, 24);
  assert.equal(migrated.facilities[0].hourlyCost, 3);
});

test('migrateSave applies current defaults to newly modeled facilities', () => {
  const save = buildLegacySave();
  save.facilities = [{x: 1, y: 1, w: 3, h: 3, type: 'showers'}];
  const migrated = migrateSave(save);

  assert.equal(migrated.facilities[0].capacity, 12);
  assert.equal(migrated.facilities[0].hourlyCost, 1);
  assert.equal(migrated.facilities[0].costPerUse, 0.25);
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
  assert.equal(migrated.wood, 0);
  assert.deepEqual(migrated.tools, {axe: true, shovel: false});
});

test('migrateSave preserves tool unlocks and always grants the starting axe', () => {
  const save = buildLegacySave();
  save.tools = {axe: false, shovel: true};
  const migrated = migrateSave(save);
  assert.deepEqual(migrated.tools, {axe: true, shovel: true});
  delete save.tools;
  assert.deepEqual(migrateSave(save).tools, {axe: true, shovel: false});
});

test('migrateSave preserves timber inventory and clamps invalid inventory values', () => {
  const save = buildLegacySave();
  save.wood = 17;
  assert.equal(migrateSave(save).wood, 17);
  save.wood = -4;
  assert.equal(migrateSave(save).wood, 0);
  save.wood = 'lots';
  assert.equal(migrateSave(save).wood, 0);
});


test('migrateSave defaults overlays and park-wide entertainment capacity for legacy facilities', () => {
  const save = buildLegacySave();
  save.facilities = [
    {x: 1, y: 1, w: 3, h: 3, type: 'pub'},
    {x: 6, y: 1, w: 5, h: 4, type: 'entertainment_space'}
  ];
  const migrated = migrateSave(save);
  assert.equal(migrated.overlayMode, 'none');
  assert.equal(migrated.facilities[0].entertainmentCapacity, 12);
  assert.equal(migrated.facilities[1].entertainmentCapacity, 40);
  save.overlayMode = 'utilities';
  assert.equal(migrateSave(save).overlayMode, 'utilities');
});
