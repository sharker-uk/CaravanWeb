const test = require('node:test');
const assert = require('node:assert/strict');
const {createGuestParty, getDemandProfile, getDemandPeriod} =
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
