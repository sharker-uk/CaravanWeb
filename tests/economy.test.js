const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getGuestDemand,
  getSevenDayBalance,
  recordTransaction,
  shouldAcceptGuest
} = require('../src/economy.js');

test('ledger records both sides of transactions and validates the balance', () => {
  const state = {cash: 2000, initialBalance: 2000, day: 4, transactions: []};
  recordTransaction(state, -125, 'construction', 'Built a facility');
  recordTransaction(state, 300, 'guest payment', 'Guest booking');

  assert.equal(state.cash, 2175);
  assert.deepEqual(getSevenDayBalance(state), {
    income: 300, expenses: 125, net: 175, expectedCash: 2175, actualCash: 2175, isValid: true
  });
  state.cash++;
  assert.equal(getSevenDayBalance(state).isValid, false);
});

test('seven-day balance excludes older transactions while retaining cash reconciliation', () => {
  const state = {
    cash: 1900,
    initialBalance: 2000,
    day: 10,
    transactions: [
      {day: 2, amount: -100},
      {day: 10, amount: 0}
    ]
  };
  const summary = getSevenDayBalance(state);
  assert.equal(summary.expenses, 0);
  assert.equal(summary.net, 0);
  assert.equal(summary.isValid, true);
});

test('arrival demand is capacity-based and arrives only as demand accrues', () => {
  const state = {
    rating: 5,
    satisfaction: 100,
    pitches: [{occupied: false}, {occupied: false}],
    dailyGuestArrivals: 0,
    guestArrivalProgress: 0
  };
  assert.equal(getGuestDemand(state).score, 100);
  let arrivals = 0;
  for (let hour = 0; hour < 24; hour++) {
    if (shouldAcceptGuest(state)) arrivals++;
  }
  assert.equal(arrivals, 2);
  state.pitches.forEach(pitch => { pitch.occupied = true; });
  assert.equal(shouldAcceptGuest(state), false);
});

test('starting demand produces bookings as the park expands over two days', () => {
  const state = {
    rating: 1,
    satisfaction: 60,
    pitches: [{occupied: false}, {occupied: false}],
    dailyGuestArrivals: 0,
    guestArrivalProgress: 0
  };
  let arrivals = 0;

  for (let hour = 0; hour < 9; hour++) {
    if (shouldAcceptGuest(state, {demandMultiplier: 0.7})) {
      arrivals++;
      state.pitches.find(pitch => !pitch.occupied).occupied = true;
    }
  }
  state.pitches.push({occupied: false});
  state.day = 2;
  state.dailyGuestArrivals = 0;
  state.guests = [{}];
  for (let hour = 0; hour < 10; hour++) {
    if (shouldAcceptGuest(state, {demandMultiplier: 0.7})) {
      arrivals++;
      state.pitches.find(pitch => !pitch.occupied).occupied = true;
    }
  }

  assert.equal(arrivals, 2);
});

test('a viable empty park gets its first booking during the opening days', () => {
  const state = {
    day: 2,
    rating: 1,
    satisfaction: 60,
    pitches: [{occupied: false}],
    guests: [],
    dailyGuestArrivals: 0,
    guestArrivalProgress: 0
  };

  assert.equal(shouldAcceptGuest(state, {demandMultiplier: 0.7, eligible: true}), true);
  assert.equal(state.dailyGuestArrivals, 1);
});

test('high demand fills an available pitch by late morning', () => {
  const state = {
    day: 2,
    rating: 1.7,
    satisfaction: 100,
    pitches: [{occupied: true}, {occupied: false}],
    guests: [{}],
    dailyGuestArrivals: 0,
    guestArrivalProgress: 0
  };
  let arrivals = 0;

  for (let hour = 0; hour < 4; hour++) {
    if (shouldAcceptGuest(state, {demandMultiplier: 0.7, eligible: true})) arrivals++;
  }

  assert.equal(arrivals, 1);
});

test('landscape beauty improves guest demand without replacing satisfaction and rating', () => {
  const poorLandscape = getGuestDemand({rating: 3, satisfaction: 70, beauty: 0});
  const attractiveLandscape = getGuestDemand({rating: 3, satisfaction: 70, beauty: 100});
  assert.ok(attractiveLandscape.score > poorLandscape.score);
  assert.equal(attractiveLandscape.score - poorLandscape.score, 20);
});

test('lower demand reduces arrivals and the target remains below physical capacity', () => {
  const state = {
    rating: 0,
    satisfaction: 20,
    pitches: [{occupied: false}],
    dailyGuestArrivals: 0,
    guestArrivalProgress: 0
  };
  for (let hour = 0; hour < 24; hour++) assert.equal(shouldAcceptGuest(state), false);
  assert.ok(state.guestArrivalProgress < 1);
});
