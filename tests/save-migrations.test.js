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
  assert.equal(migrated.caravans[0].tier, 'basic');
  assert.equal(migrated.caravans[0].modelId, 'basic-1br');
  assert.equal(migrated.caravans[0].maxOccupancy, undefined);
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

test('schema-11 static assets migrate to stable catalogue records without losing cash or guests', () => {
  const save = buildLegacySave();
  save.cash = 17325;
  save.day = 24;
  save.pitches = [
    {x: 2, y: 2, w: 4, h: 8, type: 'gravel', occupied: false}
  ];
  save.caravans = [{
    tier: 2,
    pitchIndex: 0,
    condition: 71,
    isBroken: false,
    hasDecking: true,
    hasSkirting: true
  }];
  save.guests = [{
    pitchIndex: 0,
    accommodation: 'static',
    party: {type: 'couple', adults: 2, children: 0},
    stayDaysRemaining: 2,
    booking: {id: 'kept-booking'}
  }];
  const migrated = migrateSave(save);
  const pitch = migrated.pitches[0];
  const van = migrated.caravans[0];

  assert.equal(migrated.cash, 17325);
  assert.equal(migrated.guests[0].booking.id, 'kept-booking');
  assert.equal(van.modelId, 'gold-2br');
  assert.equal(van.tier, 'gold');
  assert.equal(van.bedrooms, 2);
  assert.equal(van.pitchId, pitch.id);
  assert.equal(van.purchasePrice, 40000);
  assert.equal(van.purchasedAtMinutes, 0);
  assert.equal(van.hasDecking, true);
  assert.equal(van.hasSkirting, true);
  assert.equal(pitch.decking.id, `legacy-decking-${pitch.id}`);
  assert.ok(pitch.decking.condition < 100);
  assert.equal(migrated.schemaVersion, 12);
});

test('static caravan migration prefers its stable pitch ID over a stale array index', () => {
  const save = buildLegacySave();
  save.pitches = [
    {id: 'pitch-first', x: 2, y: 2, w: 4, h: 8, type: 'gravel'},
    {id: 'pitch-second', x: 10, y: 2, w: 4, h: 8, type: 'gravel'}
  ];
  save.caravans = [{
    modelId: 'silver-2br',
    pitchId: 'pitch-second',
    pitchIndex: 0
  }];

  const migrated = migrateSave(save);
  assert.equal(migrated.caravans[0].pitchId, 'pitch-second');
  assert.equal(migrated.caravans[0].pitchIndex, 1);
});

test('static catalogue, accessory stock, and pending delivery data normalize deterministically', () => {
  const save = buildLegacySave();
  save.staticDeliveries = [{
    id: 'delivery-8',
    vanId: 'static-9',
    pitchId: 'pitch-2-2-4-8',
    modelId: 'bronze-3br',
    purchasePrice: 22000,
    purchasedAtMinutes: 120,
    deliveryAtMinutes: 480,
    tradeInVanId: null,
    tradeInValue: 0
  }];
  save.accessoryInventory = {bbq: 2, patio: -1, unknown: 4};
  save.staticAssetSequence = 8;
  save.pitches = [{x: 2, y: 2, w: 4, h: 8, type: 'gravel'}];
  const migrated = migrateSave(save);

  assert.equal(migrated.staticDeliveries.length, 1);
  assert.equal(migrated.pitches[0].deliveryReserved, 'delivery-8');
  assert.equal(migrated.accessoryInventory.bbq, 2);
  assert.equal(migrated.accessoryInventory.patio, 0);
  assert.equal(migrated.accessoryInventory.unknown, undefined);
  assert.equal(migrated.staticAssetSequence, 9);
  assert.equal(migrateSave(save).pitches[0].id, migrated.pitches[0].id);
});

test('migration rejects prototype keys and sanitizes pitch and facility identifiers', () => {
  const save = buildLegacySave();
  save.pitches = [{
    id: '<img src=x onerror=alert(1)>',
    x: 2, y: 2, w: 4, h: 2, type: 'grass',
    accessories: [
      {type: 'toString', x: 2, y: 2, w: 1, h: 1},
      {type: '__proto__', x: 2, y: 2, w: 1, h: 1},
      {type: 'bbq', x: 2, y: 2, w: 1, h: 1}
    ]
  }];
  save.facilities = [
    {x: 1, y: 1, w: 2, h: 2, type: 'toString'},
    {x: 4, y: 1, w: 2, h: 2, type: '__proto__'}
  ];

  const migrated = migrateSave(save);

  assert.equal(migrated.pitches[0].id, 'pitch-2-2-4-2');
  assert.deepEqual(migrated.pitches[0].accessories.map(item => item.type), ['bbq']);
  assert.deepEqual(migrated.facilities.map(facility => facility.type), ['shop', 'shop']);
});

test('legacy tree facilities become grass tile nature before facilities are normalized', () => {
  const save = buildLegacySave();
  save.facilities.push(
    {x: 5, y: 1, w: 1, h: 1, type: 'tree'},
    {x: 6, y: 1, w: 1, h: 1, type: 'tree'},
    {x: 7, y: 1, w: 1, h: 1, type: 'tree'}
  );
  save.tiles[1][6] = {type: 'water'};

  const migrated = migrateSave(save);

  assert.equal(migrated.tiles[1][5].nature, 'tree');
  assert.equal(migrated.tiles[1][6].nature, null);
  assert.equal(migrated.tiles[1][7].nature, 'tree');
  assert.equal(migrated.facilities.some(facility => facility.type === 'tree'), false);
  assert.equal(migrated.facilities.length, 1);
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

test('migrateSave preserves coastal terrain, landmarks and unfinished builds', () => {
  const save = buildLegacySave();
  save.tiles[0][0] = {terrain: 'sand', road: false, path: false};
  save.landmarks = [{type: 'farmhouse', x: 2, y: 3, w: 4, h: 3, blocksBuilding: true}];
  save.constructions = [{
    kind: 'surface',
    surface: 'road',
    tiles: [{x: 8, y: 8}],
    footprint: {x: 8, y: 8, w: 1, h: 1},
    completesAt: 1200
  }];

  const migrated = migrateSave(save);
  assert.equal(migrated.tiles[0][0].terrain, 'sand');
  assert.equal(migrated.landmarks[0].type, 'farmhouse');
  assert.equal(migrated.constructions[0].completesAt, 1200);
});

test('migrateSave applies current defaults to newly modeled facilities', () => {
  const save = buildLegacySave();
  save.facilities = [{x: 1, y: 1, w: 3, h: 3, type: 'showers'}];
  const migrated = migrateSave(save);

  assert.equal(migrated.facilities[0].capacity, 12);
  assert.equal(migrated.facilities[0].hourlyCost, 1);
  assert.equal(migrated.facilities[0].costPerUse, 0.25);
});

test('migrateSave adds toilet condition bars and removes the legacy hourly toilet fee', () => {
  const save = buildLegacySave();
  save.facilities = [{x: 1, y: 1, w: 3, h: 3, type: 'toilets', hourlyCost: 0.5, cleanliness: 42, wear: 68}];
  let migrated = migrateSave(save);
  assert.equal(migrated.facilities[0].hourlyCost, 0);
  assert.equal(migrated.facilities[0].cleanliness, 42);
  assert.equal(migrated.facilities[0].wear, 68);
  assert.equal(migrated.facilities[0].maintenanceClosed, false);
  save.facilities[0].cleanliness = 0;
  migrated = migrateSave(save);
  assert.equal(migrated.facilities[0].isOperational, false);
  assert.equal(migrated.facilities[0].maintenanceClosed, true);
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
