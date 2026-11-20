const test = require('node:test');
const assert = require('node:assert/strict');
const { migrateSave } = require('../src/save-migrations.js');

function legacyFarm() {
    return {
        schemaVersion: 13,
        tiles: Array.from({length: 40}, () => Array.from({length: 60}, () => ({terrain: 'grass'}))),
        landmarks: [
            {type: 'farmhouse', name: 'Run-down farmhouse', x: 13, y: 17, w: 6, h: 5, blocksBuilding: true},
            {type: 'rusty_resales', name: 'Rusty Resales', x: 2, y: 7, w: 5, h: 3},
            {type: 'fiddl_shop', name: 'Fiddl', x: 2, y: 14, w: 5, h: 3},
            {type: 'job_centre', name: 'Job Centre', x: 2, y: 21, w: 5, h: 3},
            {type: 'fiddl_shop', name: 'Custom supplies', x: 24, y: 14, w: 5, h: 3}
        ],
        facilities: [{type: 'shop', x: 23, y: 30, w: 4, h: 3}],
        land: {version: 1, enabled: true, ownedPlotIds: ['meadow']}
    };
}

test('legacy farm migration moves the starter farmhouse and removes only generated businesses', () => {
    const save = legacyFarm();
    save.tiles[4][8] = {terrain: 'grass', road: true, utilities: {gas: true}};
    save.tiles[24][8].road = true;
    const migrated = migrateSave(save);
    assert.deepEqual(migrated.landmarks.slice(0, 2).map(({name, x, y}) => ({name, x, y})), [
        {name: 'Run-down farmhouse', x: 10, y: 18},
        {name: 'Custom supplies', x: 24, y: 14}
    ]);
    assert.equal(migrated.facilities[0].type, 'shop');
    assert.equal(migrated.tiles[4][8].road, true);
    assert.equal(migrated.tiles[4][8].utilities.gas, true);
    assert.equal(migrated.tiles[24][8].utilityInlet, true);
    assert.deepEqual(migrated.land.ownedPlotIds, ['meadow']);
    assert.equal(save.landmarks[0].x, 13);
    assert.deepEqual(migrateSave(migrated), migrated);
});

test('farmhouse migration preserves pending works and existing infrastructure', () => {
    const save = legacyFarm();
    save.constructions = [{kind: 'facility', completesAt: 600, footprint: {x: 10, y: 18, w: 2, h: 2}}];
    assert.equal(migrateSave(save).landmarks[0].x, 13);
    save.constructions = [];
    save.tiles[18][10] = {terrain: 'grass', path: true, utilities: {water: true}};
    assert.equal(migrateSave(save).landmarks[0].x, 13);
});

test('custom package retains its farmhouse, businesses and surfaces', () => {
    const save = legacyFarm();
    save.parkPackageId = 'custom';
    save.tiles[24][8].road = true;
    const migrated = migrateSave(save);
    assert.deepEqual(migrated.landmarks.slice(0, 5), save.landmarks);
    assert.equal(migrated.tiles[24][8].utilityInlet, undefined);
});
