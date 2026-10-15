const test = require('node:test');
const assert = require('node:assert/strict');
const StaticCaravans = require('../src/static-caravans.js');
const PitchCapabilities = require('../src/pitch-capabilities.js');
const Economy = require('../src/economy.js');

function createState() {
  const tiles = Array.from({length: 8}, () => Array.from({length: 8}, () => ({
    terrain: 'grass',
    road: false,
    path: false,
    utilities: {gas: false, water: false, electricity: false, waste: false}
  })));
  tiles[0][2].road = true;
  tiles[1][2].road = true;
  for (const utility of ['gas', 'water', 'electricity', 'waste']) {
    tiles[0][2].utilities[utility] = true;
    tiles[1][2].utilities[utility] = true;
  }
  const pitch = {id: 'pitch-1', x: 2, y: 2, w: 4, h: 8, type: 'gravel', occupied: false};
  return {
    cash: 100000,
    initialBalance: 100000,
    day: 1,
    hour: 9,
    minute: 0,
    tiles,
    pitches: [pitch],
    caravans: [],
    guests: [],
    constructions: [],
    staticDeliveries: [],
    transactions: []
  };
}

function recordTransaction(state, amount, category, description) {
  return Economy.recordTransaction(state, amount, category, description);
}

test('each static tier offers all bedroom configurations with 4, 6, and 8 places', () => {
  assert.equal(StaticCaravans.CATALOGUE.length, 15);
  for (const tier of ['basic', 'bronze', 'silver', 'gold', 'platinum']) {
    const models = StaticCaravans.CATALOGUE.filter(model => model.tier === tier);
    assert.deepEqual(models.map(model => model.bedrooms), [1, 2, 3]);
    assert.deepEqual(models.map(model => model.maxOccupancy), [4, 6, 8]);
    assert.equal(new Set(models.map(model => model.conditionCategory)).size, 1);
  }
});

test('static occupancy comes from the installed model and changes after delivery', () => {
  const state = createState();
  const oldVan = StaticCaravans.createVan('basic-1br', {
    id: 'static-old', pitchId: state.pitches[0].id, purchasedAtMinutes: 0
  });
  oldVan.pitch = state.pitches[0];
  state.caravans.push(oldVan);
  let index = PitchCapabilities.rebuild(state);
  assert.equal(index.records[0].staticCapacity, 4);
  assert.equal(PitchCapabilities.findCandidates(index, {
    accommodations: ['static'], headcount: 5
  }).length, 0);
  const queued = StaticCaravans.queuePurchase(
    state, state.pitches[0], 'gold-3br', amount => recordTransaction(state, amount, 'test', 'static order')
  );
  assert.equal(queued.ok, true);
  index = PitchCapabilities.rebuild(state, index);
  assert.equal(index.records[0].staticCapacity, 4);
  assert.equal(PitchCapabilities.findCandidates(index, {
    accommodations: ['static'], headcount: 1
  }).length, 0);

  state.hour = 15;
  assert.equal(StaticCaravans.completeDueDeliveries(state,
    (amount, category, description) => recordTransaction(state, amount, category, description)), 1);
  index = PitchCapabilities.rebuild(state, index);
  assert.equal(index.records[0].staticCapacity, 8);
  assert.equal(PitchCapabilities.findCandidates(index, {
    accommodations: ['static'], headcount: 8
  }).length, 1);
});

test('resale value follows original price and age and respects the configured floor', () => {
  const van = StaticCaravans.createVan('silver-2br', {
    purchasePrice: 28000, purchasedAtMinutes: 0
  });
  assert.equal(StaticCaravans.calculateResaleValue(van, 0), 28000);
  assert.ok(StaticCaravans.calculateResaleValue(van, 1440 * 365) < 28000);
  assert.equal(
    StaticCaravans.calculateResaleValue(van, 1440 * 100000),
    Math.floor(28000 * StaticCaravans.DEPRECIATION.minimumValuePercent)
  );
  assert.ok(StaticCaravans.calculateResaleValue({...van, purchasePrice: 1}, 1440 * 100000) >= 0);
});

test('delivery uses the game clock, the operating window, and freezes while paused', () => {
  const state = createState();
  assert.equal(StaticCaravans.scheduleDelivery(state), 15 * 60);
  state.hour = 21;
  assert.equal(StaticCaravans.scheduleDelivery(state), 1440 + 14 * 60);
  state.hour = 19;
  assert.equal(StaticCaravans.scheduleDelivery(state), 1440 + 8 * 60);
  state.hour = 9;
  const queued = StaticCaravans.queuePurchase(
    state, state.pitches[0], 'basic-1br', amount => recordTransaction(state, amount, 'test', 'static order')
  );
  assert.equal(queued.ok, true);
  state.isPaused = true;
  state.day = 1;
  state.hour = 15;
  assert.equal(StaticCaravans.completeDueDeliveries(state,
    (amount, category, description) => recordTransaction(state, amount, category, description)), 0);
  assert.equal(state.staticDeliveries.length, 1);
});

test('insufficient funds leave cash, inventory, reservations, and ledger untouched', () => {
  const state = createState();
  state.cash = 100;
  const result = StaticCaravans.queuePurchase(
    state, state.pitches[0], 'basic-1br', amount => recordTransaction(state, amount, 'test', 'static order')
  );
  assert.equal(result.ok, false);
  assert.equal(state.cash, 100);
  assert.equal(state.transactions.length, 0);
  assert.equal(state.staticDeliveries.length, 0);
  assert.equal(state.pitches[0].deliveryReserved, undefined);
});

test('only hardstanding with four connected hookups qualifies for a static', () => {
  const state = createState();
  assert.equal(StaticCaravans.getPitchEligibility(state, state.pitches[0]).eligible, true);
  state.pitches[0].type = 'grass';
  assert.match(StaticCaravans.getPitchEligibility(state, state.pitches[0]).reason, /hardstanding/);
  state.pitches[0].type = 'gravel';
  state.tiles[0][2].utilities.gas = false;
  const disconnected = StaticCaravans.getPitchEligibility(state, state.pitches[0]);
  assert.equal(disconnected.eligible, false);
  assert.match(disconnected.reason, /gas/);
});

test('occupied, reserved, and under-construction pitches reject installation or replacement', () => {
  const state = createState();
  const pitch = state.pitches[0];
  pitch.occupied = true;
  assert.match(StaticCaravans.getPitchEligibility(state, pitch).reason, /occupied/);
  pitch.occupied = false;
  pitch.deliveryReserved = 'another-order';
  assert.match(StaticCaravans.getPitchEligibility(state, pitch).reason, /reserved/);
  delete pitch.deliveryReserved;
  state.constructions.push({pitchIndex: 0});
  assert.match(StaticCaravans.getPitchEligibility(state, pitch).reason, /construction/);
});

test('an installed static is a replacement candidate, never an empty-pitch candidate', () => {
  const state = createState();
  const pitch = state.pitches[0];
  const van = StaticCaravans.createVan('bronze-2br', {
    id: 'installed', pitchId: pitch.id
  });
  van.pitch = pitch;
  state.caravans.push(van);
  assert.match(StaticCaravans.getPitchEligibility(state, pitch).reason, /already has/);
  assert.equal(StaticCaravans.getPitchEligibility(state, pitch, {
    replacingVanId: van.id
  }).eligible, true);
});

test('accessories enforce pitch-type, footprint, overlap, and one-per-type rules', () => {
  const state = createState();
  const pitch = state.pitches[0];
  assert.equal(StaticCaravans.canPlaceAccessory(state, pitch, 'hot_tub', 2, 2).valid, true);
  pitch.type = 'grass';
  assert.equal(StaticCaravans.canPlaceAccessory(state, pitch, 'hot_tub', 2, 2).valid, false);
  assert.equal(StaticCaravans.canPlaceAccessory(state, pitch, 'bbq', 6, 2).valid, false);
  assert.equal(StaticCaravans.canPlaceAccessory(state, pitch, 'bbq', 2, 2).valid, true);
  pitch.accessories = [{id: 'bbq-1', type: 'bbq', x: 2, y: 2, w: 1, h: 1}];
  assert.match(
    StaticCaravans.canPlaceAccessory(state, pitch, 'firepit', 2, 2).reason,
    /overlap/
  );
  assert.match(
    StaticCaravans.canPlaceAccessory(state, pitch, 'bbq', 3, 2).reason,
    /already has/
  );
});

test('accessory purchase charges once and insufficient cash leaves inventory and ledger unchanged', () => {
  const state = createState();
  const result = StaticCaravans.purchaseAccessory(
    state, 'bbq',
    (amount, category, description) => Economy.recordTransaction(state, amount, category, description)
  );
  assert.equal(result.ok, true);
  assert.equal(state.cash, 100000 - StaticCaravans.ACCESSORIES.bbq.price);
  assert.equal(state.accessoryInventory.bbq, 1);
  assert.equal(state.transactions.length, 1);

  state.cash = 10;
  const transactionCount = state.transactions.length;
  assert.equal(StaticCaravans.purchaseAccessory(
    state, 'hot_tub',
    (amount, category, description) => Economy.recordTransaction(state, amount, category, description)
  ).ok, false);
  assert.equal(state.accessoryInventory.hot_tub, undefined);
  assert.equal(state.transactions.length, transactionCount);
});

test('decking requires an installed hardstanding static and has explicit end-of-life replacement', () => {
  const state = createState();
  const pitch = state.pitches[0];
  const van = StaticCaravans.createVan('silver-1br', {id: 'static-1', pitchId: pitch.id});
  van.pitch = pitch;
  state.caravans.push(van);
  const purchase = (amount, category, description) =>
    Economy.recordTransaction(state, amount, category, description);
  assert.equal(StaticCaravans.installDecking(state, pitch, purchase).ok, true);
  const installDate = pitch.decking.installedAtMinutes;
  assert.equal(StaticCaravans.installDecking(state, pitch, purchase).ok, false);
  state.day += StaticCaravans.DECKING.lifespanDays;
  StaticCaravans.updateDeckingCondition(state);
  assert.equal(pitch.decking.condition, 0);
  assert.equal(pitch.decking.operational, false);
  assert.equal(StaticCaravans.installDecking(state, pitch, purchase).ok, true);
  assert.ok(pitch.decking.installedAtMinutes > installDate);
  assert.equal(pitch.decking.condition, 100);
});

test('replacement trade-in and purchase reconcile as separate transactions', () => {
  const state = createState();
  const pitch = state.pitches[0];
  const oldVan = StaticCaravans.createVan('basic-1br', {
    id: 'old-static', pitchId: pitch.id, purchasePrice: 9000
  });
  oldVan.pitch = pitch;
  state.caravans.push(oldVan);
  const result = StaticCaravans.queuePurchase(
    state, pitch, 'gold-2br',
    (amount, category, description) => Economy.recordTransaction(state, amount, category, description)
  );
  assert.equal(result.ok, true);
  assert.equal(state.transactions.length, 2);
  assert.deepEqual(state.transactions.map(transaction => transaction.amount), [
    StaticCaravans.calculateResaleValue(oldVan, StaticCaravans.gameTimeMinutes(state)),
    -40000
  ]);
  assert.equal(Economy.getSevenDayBalance(state).isValid, true);
  assert.equal(state.caravans[0].id, 'old-static');
  assert.equal(StaticCaravans.queuePurchase(
    state, pitch, 'gold-2br',
    (amount, category, description) => Economy.recordTransaction(state, amount, category, description)
  ).ok, false);

  pitch.occupied = true;
  state.hour = 15;
  assert.equal(StaticCaravans.completeDueDeliveries(state,
    (amount, category, description) => Economy.recordTransaction(state, amount, category, description)), 0);
  assert.equal(state.caravans[0].id, 'old-static');
  assert.equal(pitch.deliveryReserved, undefined);
  assert.equal(state.staticDeliveries.length, 0);
  assert.equal(state.cash, 100000);
  assert.equal(Economy.getSevenDayBalance(state).isValid, true);
});

test('a newly delivered static inherits decking without resetting its lifespan', () => {
  const state = createState();
  const pitch = state.pitches[0];
  pitch.decking = {id: 'deck-1', installedAtMinutes: 25, condition: 99};
  const order = StaticCaravans.queuePurchase(
    state, pitch, 'bronze-2br',
    (amount, category, description) => Economy.recordTransaction(state, amount, category, description)
  ).order;
  state.hour = 15;
  assert.equal(StaticCaravans.completeDueDeliveries(state,
    (amount, category, description) => Economy.recordTransaction(state, amount, category, description)), 1);
  assert.equal(state.caravans[0].hasDecking, true);
  assert.equal(pitch.decking.installedAtMinutes, 25);
  assert.equal(state.staticDeliveries.includes(order), false);
});
