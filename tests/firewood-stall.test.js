const test = require('node:test');
const assert = require('node:assert/strict');
const timber = require('../src/land-management.js');
const economy = require('../src/economy.js');
const clock = require('../src/simulation-clock.js');
const {migrateSave} = require('../src/save-migrations.js');

function farm() {
    return migrateSave({
        schemaVersion: 14,
        cash: 1500, wood: 8, day: 4, hour: 20, minute: 0,
        tiles: Array.from({length: 40}, () =>
            Array.from({length: 60}, () => ({terrain: 'grass'}))),
        landmarks: [{type: 'farmhouse', name: 'Run-down farmhouse', x: 10, y: 18, w: 6, h: 5}]
    });
}

test('the stall reserves an open tile at the farmhouse and saves stock without duplication', () => {
    const state = farm();
    assert.deepEqual([timber.findStall(state).x, timber.findStall(state).y], [10, 23]);
    assert.equal(timber.transferFirewood(state, 9), false);
    assert.equal(timber.transferFirewood(state, 5), true);
    assert.equal(timber.transferFirewood(state, -1), true);
    assert.equal(state.wood, 4);
    assert.equal(state.cash, 1500);

    const restored = migrateSave(JSON.parse(JSON.stringify(state)));
    assert.equal(restored.wood, 4);
    assert.equal(restored.firewoodStall.stock, 4);
    assert.equal(restored.landmarks.filter(item => item.type === 'selling_stall').length, 1);
});

test('sleep carries stock over and only daylight sales pay into the ledger one bundle at a time', () => {
    const state = farm();
    timber.transferFirewood(state, 5);
    const record = (...args) => economy.recordTransaction(state, ...args);
    const sell = () => timber.processFirewoodHour(state, record, () => 0.2);
    clock.advanceToHour(state, 8, {onHourly: sell});
    assert.equal(state.firewoodStall.stock, 5);
    assert.equal(state.cash, 1500);

    state.hour = 9;
    assert.equal(sell(), true);
    assert.equal(timber.todayFirewoodSales(state), 1);
    assert.equal(state.firewoodStall.stock, 4);
    assert.equal(state.cash, 1508);
    state.hour++;
    state.weather = 'Rain';
    assert.equal(sell(), false);
    state.hour++;
    state.rating = 5;
    assert.equal(sell(), true);
    assert.equal(timber.todayFirewoodSales(state), 2);
    assert.equal(economy.getSevenDayBalance(state).isValid, true);
    assert.equal(timber.todayFirewoodSales(migrateSave(state)), 2);
});

test('an existing farmhouse stall keeps its location and gains the stock interaction', () => {
    const state = farm();
    const stall = timber.findStall(state);
    Object.assign(stall, {x: 9, y: 23, interactable: false});
    const restored = migrateSave(state);
    assert.equal(timber.findStall(restored).x, 9);
    assert.equal(timber.findStall(restored).interactable, true);
    assert.equal(restored.landmarks.filter(item => item.type === 'selling_stall').length, 1);
});
