const test = require('node:test');
const assert = require('node:assert/strict');
const {createGuestParty} = require('../src/guest-parties.js');
const {
  canHostParty,
  getFacilityDefaults,
  getRequiredFacilities,
  getMaintenanceCost,
  processHourlyFacilities
} = require('../src/facility-operations.js');
const {getSevenDayBalance, recordTransaction} = require('../src/economy.js');

function facility(type, capacity) {
  return {
    ...getFacilityDefaults(type),
    type,
    capacity: capacity ?? getFacilityDefaults(type).capacity
  };
}

test('overnight party eligibility requires operational capacity for essential facilities', () => {
  const state = {facilities: [facility('toilets', 4), facility('showers', 3)]};
  assert.deepEqual(canHostParty(state, 'tent', 4), {valid: true, missing: []});
  assert.deepEqual(canHostParty(state, 'static', 4), {valid: true, missing: []});
  state.facilities[1].isOperational = false;
  assert.deepEqual(canHostParty(state, 'towed', 2), {valid: true, missing: []});
});

test('toilet blocks have no hourly running cost and begin in good condition', () => {
  const toilets = facility('toilets');
  assert.equal(toilets.hourlyCost, 0);
  assert.equal(toilets.cleanliness, 100);
  assert.equal(toilets.wear, 100);
});

test('toilet maintenance prices rise with neglect, independent of job duration', () => {
  assert.equal(getMaintenanceCost('clean', 100), 5);
  assert.equal(getMaintenanceCost('clean', 80), 5);
  assert.equal(getMaintenanceCost('clean', 79), 10);
  assert.equal(getMaintenanceCost('clean', 60), 10);
  assert.equal(getMaintenanceCost('clean', 59), 18);
  assert.equal(getMaintenanceCost('clean', 40), 18);
  assert.equal(getMaintenanceCost('clean', 39), 28);
  assert.equal(getMaintenanceCost('clean', 20), 28);
  assert.equal(getMaintenanceCost('clean', 19), 40);
  assert.equal(getMaintenanceCost('clean', 0), 40);
  assert.equal(getMaintenanceCost('repair', 100), 10);
  assert.equal(getMaintenanceCost('repair', 80), 10);
  assert.equal(getMaintenanceCost('repair', 79), 20);
  assert.equal(getMaintenanceCost('repair', 60), 20);
  assert.equal(getMaintenanceCost('repair', 59), 35);
  assert.equal(getMaintenanceCost('repair', 40), 35);
  assert.equal(getMaintenanceCost('repair', 39), 60);
  assert.equal(getMaintenanceCost('repair', 20), 60);
  assert.equal(getMaintenanceCost('repair', 19), 100);
  assert.equal(getMaintenanceCost('repair', 0), 100);
  assert.equal(getMaintenanceCost('unknown', 50), null);
});

test('essential capacity matches single-facility service allocation', () => {
  const state = {
    facilities: [
      facility('toilets', 10),
      facility('toilets', 10),
      facility('showers', 20)
    ]
  };
  assert.deepEqual(canHostParty(state, 'tent', 18), {
    valid: false,
    missing: ['toilets']
  });
  assert.deepEqual(canHostParty(state, 'tent', 10), {valid: true, missing: []});
});

test('essential shower access is separate from a party shower-use preference', () => {
  const solo = createGuestParty(100, () => 0.55);
  const state = {facilities: [facility('toilets', 16), facility('showers', 12)]};
  assert.equal(solo.type, 'solo');
  assert.equal(solo.preferences.showerVisitIntervalDays, 0);
  assert.deepEqual(getRequiredFacilities('tent'), ['toilets']);
  assert.deepEqual(canHostParty(state, 'tent', solo.headcount), {valid: true, missing: []});
});

test('facility service capacity, party needs and transactions affect operating results', () => {
  const party = createGuestParty(181, () => 0);
  const guest = {
    party,
    accommodation: 'tent',
    pitchIndex: 0,
    booking: {arrivalDay: 1},
    lastFacilityUpdate: -1
  };
  const state = {
    day: 1,
    hour: 8,
    facilities: [
      facility('toilets', 4),
      facility('showers', 4),
      facility('shop', 4),
      facility('laundry', 4)
    ],
    guests: [guest]
  };
  const ledger = [];
  const transaction = (...args) => ledger.push(args);

  processHourlyFacilities(state, transaction);
  assert.equal(state.facilities[0].hourlyUsage, 0);
  assert.equal(state.facilities[1].hourlyUsage, party.headcount);
  assert.ok(ledger.some(entry => entry[1] === 'facility operations'));
  assert.ok(party.needs.satisfaction > 75);

  state.day = 1;
  state.hour = 9;
  processHourlyFacilities(state, transaction);
  assert.ok(state.facilities.every(item => item.hourlyUsage <= item.capacity));
  assert.ok(party.needs.toiletVisits + party.needs.showerVisits > 0);
});

test('toilet use gradually reduces cleanliness and wear and dirty toilets lower satisfaction', () => {
  const party = createGuestParty(181, () => 0);
  party.headcount = 4;
  party.needs.satisfaction = 75;
  party.preferences = {...party.preferences, preferredFacilities: [], toiletIntervalHours: 1, showerVisitIntervalDays: 0, shopIntervalHours: 0, laundryEveryDays: 0};
  const toilets = facility('toilets', 16);
  toilets.cleanliness = 40;
  const state = {day: 1, hour: 0, facilities: [toilets], guests: [{
    party, accommodation: 'static', pitchIndex: 0,
    booking: {arrivalDay: 1}, lastFacilityUpdate: -1
  }]};
  processHourlyFacilities(state, () => {});
  assert.ok(toilets.cleanliness < 40);
  assert.ok(toilets.wear < 100);
  assert.ok(party.needs.satisfaction < 75);
});

test('three-week managed-park operations remain ledger-reconciled and profitable', () => {
  const family = createGuestParty(181, () => 0);
  const guest = {
    party: family,
    accommodation: 'tent',
    pitchIndex: 0,
    booking: {arrivalDay: 1},
    lastFacilityUpdate: -1
  };
  const state = {
    cash: 5000,
    initialBalance: 5000,
    day: 1,
    hour: 0,
    facilities: [facility('toilets'), facility('showers'), facility('shop'), facility('laundry')],
    guests: [],
    transactions: []
  };
  const transact = (amount, category, description) =>
    recordTransaction(state, amount, category, description);

  for (let day = 1; day <= 21; day++) {
    state.day = day;
    if ((day - 1) % 4 === 0) {
      const party = createGuestParty(day, () => 0);
      guest.party = party;
      guest.booking = {arrivalDay: day};
      guest.lastFacilityUpdate = -1;
      state.guests = [guest];
      transact(4 * (25 + party.adults * 8 + party.children * 5),
        'guest payment', 'Four-day party booking');
    }
    for (let hour = 0; hour < 24; hour++) {
      state.hour = hour;
      processHourlyFacilities(state, transact);
    }
    if (day % 4 === 0) state.guests = [];
  }

  const net = state.transactions.reduce((sum, entry) => sum + entry.amount, 0);
  const balance = getSevenDayBalance(state);
  assert.ok(net > 0, `managed park should profit over three weeks (net £${net})`);
  assert.ok(net < state.initialBalance, `profit should remain proportionate (net £${net})`);
  assert.equal(state.cash, state.initialBalance + net);
  assert.equal(balance.isValid, true);
  assert.ok(state.transactions.some(entry => entry.category === 'shop income'));
  assert.ok(state.transactions.some(entry => entry.category === 'facility operations'));
});

test('toilets remain essential while showers are optional for tent and touring stays', () => {
  assert.deepEqual(canHostParty({facilities: [facility('toilets', 4)]}, 'tent', 2), {
    valid: true, missing: []
  });
  assert.deepEqual(canHostParty({facilities: [facility('showers', 12)]}, 'towed', 2), {
    valid: false, missing: ['toilets']
  });
});
