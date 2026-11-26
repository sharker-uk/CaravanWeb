const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const GuestParties = require('../src/guest-parties.js');
const Economy = require('../src/economy.js');
const Construction = require('../src/construction.js');
const {migrateSave} = require('../src/save-migrations.js');

const main = fs.readFileSync(path.join(__dirname, '../src/main.js'), 'utf8');

function bookingGame() {
    const pitch = {id: 'pitch-1', type: 'grass'};
    const state = {day: 1, hour: 10, minute: 0, rating: 1, satisfaction: 75,
        cash: 1500, guests: [], transactions: [], pitches: [pitch], bookingRequests: [],
        bookingSequence: 0, dailyGuestArrivals: 0};
    const noOp = () => {};
    const context = vm.createContext({
        state, GuestParties, Economy, Construction,
        FacilityOperations: {canHostParty: () => ({valid: true}), getRequiredFacilities: () => ['toilets']},
        ParkServices: {getPitchServiceCheck: () => ({valid: true}), getMaximumStayDays: () => 5,
            canUseEntertainment: () => ({valid: false})},
        PitchCapabilities: {rebuild: noOp, canHostCurrent: () => true,
            findCandidates: (_, {accommodations}) => !pitch.occupied && accommodations.includes('tent') ? [{pitch}] : []},
        StaticCaravans: {getModel: noOp},
        CharacterSystem: {createPartyMembers: () => ({members: [], roster: []})},
        getGuestDailyIncome: () => 25, isGuestAccommodationValid: () => true,
        ensurePitchId: item => item.id, findGuestArrivalPosition: () => ({x: 10, y: 20}),
        recordTransaction: (...args) => Economy.recordTransaction(state, ...args),
        saveGame: noOp, updateUI: noOp, updateVisitorCount: noOp, showToast: noOp, playSound: noOp
    });
    vm.runInContext(main.slice(main.indexOf('function pendingBookingRequests()'),
        main.indexOf('function findGuestArrivalPosition(')), context);
    return {state, ...Object.fromEntries(['createBookingRequest', 'respondToBooking', 'processBookingArrivals']
        .map(name => [name, context[name]]))};
}

test('the first request reserves dates after approval and charges exactly once at check-in', () => {
    const {state, createBookingRequest, respondToBooking, processBookingArrivals} = bookingGame();
    createBookingRequest();
    const [request] = state.bookingRequests;
    const payment = request.dailyIncome;
    assert.equal(request.status, 'pending');
    assert.equal(request.expiresAt - Construction.getGameTimeMinutes(state), 1440);
    assert.equal(state.guests.length, 0);
    assert.equal(state.cash, 1500);
    assert.equal(respondToBooking(request.id, 'pitch-1'), true);

    state.bookingRequests.push({...request, id: 'other', status: 'pending'});
    assert.equal(respondToBooking('other', 'pitch-1'), false);
    processBookingArrivals();
    assert.equal(state.cash, 1500);

    const restored = migrateSave(JSON.parse(JSON.stringify(state)));
    assert.equal(restored.bookingRequests[0].pitchId, 'pitch-1');
    assert.equal(restored.bookingSequence, 1);
    state.bookingRequests = restored.bookingRequests;
    state.day = request.arrivalDay;
    state.hour = 8;
    processBookingArrivals();
    processBookingArrivals();
    assert.equal(state.guests.length, 1);
    assert.equal(state.guests[0].activity, 'arriving');
    assert.equal(state.guests[0].booking.departureDay, request.departureDay);
    assert.equal(state.cash, 1500 + payment);
    assert.equal(state.transactions.length, 1);
    assert.equal(state.bookingRequests.length, 0);
});

test('declined and expired requests produce no arrivals or payments', () => {
    const {state, createBookingRequest, respondToBooking, processBookingArrivals} = bookingGame();
    createBookingRequest();
    const [request] = state.bookingRequests;
    assert.equal(respondToBooking(request.id, null), true);
    state.bookingRequests.push({...request, id: 'expired'});
    state.day++;
    assert.equal(respondToBooking('expired', 'pitch-1'), false);
    processBookingArrivals();
    assert.equal(state.bookingRequests.length, 0);
    assert.equal(state.guests.length, 0);
    assert.equal(state.cash, 1500);
});
