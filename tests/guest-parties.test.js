const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createGuestParty,
  getDemandProfile,
  getDemandPeriod,
  isArrivalTimeAllowed,
  isStaticCheckoutDue,
  getBedtimeHour,
  getBookingInterest,
  getSpendingMultiplier
} =
  require('../src/guest-parties.js');
const {selectEligibleBooking} = require('../src/guest-parties.js');

test('party composition and booking demand vary across seasons and weekdays', () => {
  assert.equal(getDemandPeriod(6), 'weekend');
  assert.equal(getDemandPeriod(100), 'quiet');
  assert.equal(getDemandPeriod(181), 'holiday');
  assert.ok(getDemandProfile(181).multiplier > getDemandProfile(100).multiplier);

  const holidayFamily = createGuestParty(181, () => 0);
  assert.equal(holidayFamily.type, 'family');
  assert.equal(holidayFamily.headcount, holidayFamily.adults + holidayFamily.children);
  assert.ok(holidayFamily.children > 0);

  const quietSolo = createGuestParty(100, () => 0.55);
  assert.equal(quietSolo.type, 'solo');
  assert.equal(quietSolo.adults, 1);
  assert.equal(quietSolo.headcount, 1);
});

test('booking candidate selection skips unsuitable vacant pitches', () => {
  const pitches = [
    {type: 'grass', occupied: false, id: 'no-service'},
    {type: 'gravel', occupied: false, id: 'suitable'}
  ];
  const party = {type: 'solo', adults: 1, children: 0, headcount: 1};
  const candidate = selectEligibleBooking(
    pitches,
    party,
    pitch => pitch.type === 'grass' ? ['tent'] : ['towed', 'static'],
    (accommodation) => accommodation === 'static',
    () => 0
  );

  assert.equal(candidate.pitch.id, 'suitable');
  assert.equal(candidate.accommodation, 'static');
});

test('booking candidate selection does not choose occupied pitches', () => {
  const candidate = selectEligibleBooking(
    [{type: 'gravel', occupied: true}],
    {headcount: 1},
    () => ['static'],
    () => true
  );
  assert.equal(candidate, null);
});

test('arrival windows match each accommodation type', () => {
  for (const hour of [8, 12, 17]) {
    assert.equal(isArrivalTimeAllowed('tent', hour), true);
    assert.equal(isArrivalTimeAllowed('towed', hour), true);
  }
  assert.equal(isArrivalTimeAllowed('tent', 7), false);
  assert.equal(isArrivalTimeAllowed('towed', 18), false);

  for (const hour of [15, 18, 20]) {
    assert.equal(isArrivalTimeAllowed('static', hour), true);
  }
  assert.equal(isArrivalTimeAllowed('static', 14), false);
  assert.equal(isArrivalTimeAllowed('static', 21), false);
  assert.equal(isArrivalTimeAllowed('static', 8.5), false);
});

test('bedtime depends on party type, couple age group, and entertainment availability', () => {
  const youngCouple = {
    type: 'couple',
    ageGroup: 'young'
  };
  const olderCouple = {
    type: 'couple',
    ageGroup: 'older'
  };
  const family = {type: 'family'};

  assert.equal(getBedtimeHour(family, false, () => 0), 19);
  assert.equal(getBedtimeHour(family, false, () => 0.999), 22);
  assert.equal(getBedtimeHour(olderCouple, true, () => 0.999), 21);
  assert.equal(getBedtimeHour(youngCouple, false, () => 0.999), 22);
  assert.equal(getBedtimeHour(youngCouple, true, () => 0), 22);
  assert.equal(getBedtimeHour(youngCouple, true, () => 0.999), 25);
  assert.equal(getBookingInterest(youngCouple, false), 0.35);
  assert.equal(getBookingInterest(youngCouple, true), 1);
  assert.equal(getSpendingMultiplier(youngCouple, false), 1);
  assert.equal(getSpendingMultiplier(youngCouple, true), 1.5);
});

test('new couple parties receive a stable young or older age classification', () => {
  const values = [0, 0, 0, 0.2];
  const young = createGuestParty(100, () => values.shift());
  const olderValues = [0, 0, 0, 0.9];
  const older = createGuestParty(100, () => olderValues.shift());

  assert.equal(young.type, 'couple');
  assert.equal(young.ageGroup, 'young');
  assert.equal(older.type, 'couple');
  assert.equal(older.ageGroup, 'older');
});

test('static renter checkout is due from noon on the departure day', () => {
  const guest = {
    accommodation: 'static',
    booking: {departureDay: 5}
  };

  assert.equal(isStaticCheckoutDue(guest, 5, 11), false);
  assert.equal(isStaticCheckoutDue(guest, 5, 12), true);
  assert.equal(isStaticCheckoutDue(guest, 6, 12), true);
  assert.equal(isStaticCheckoutDue(guest, 4, 12), false);
  assert.equal(isStaticCheckoutDue({...guest, accommodation: 'tent'}, 5, 12), false);
});
