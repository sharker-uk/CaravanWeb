const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/village-movement.js');
const World = require('../src/connected-world.js');
const Movement = require('../src/living-park-movement.js');
const village = require('../data/village-world.json');
const placement = World.placeVillage(village);
const park = {land: {enabled: true}, player: {x: 15.5, y: 25.5}};
const parkOccupancy = (state, x, y) => x >= 0 && x < 60 && y >= 0 && y < 40;
const walkable = (state, x, y) => World.canOccupy(state, x, y, village, placement, parkOccupancy);

test('farm gate and driveway meet the village lane endpoint', () => {
    assert.deepEqual(placement.toVillage(World.gate.x, World.gate.y), village.nodes.parkGate);
    const [x, y] = placement.toScene(village.nodes.parkTurn);
    assert.ok(x < World.gate.x);
    assert.equal(y, World.gate.y);
    const [px, py] = placement.toScene(placement.toVillage(15.5, 25.5));
    assert.ok(Math.abs(px - 15.5) < 1e-8);
    assert.ok(Math.abs(py - 25.5) < 1e-8);
});

test('one movement controller walks across the gate and back at the same speed', () => {
    const player = {...park.player};
    const state = {...park};
    const [roadX] = placement.toScene(village.nodes.parkTurn);
    const steps = Math.floor((player.x - roadX) / .16);
    for (let i = 0; i < steps; i++) {
        assert.equal(Movement.advance(state, .04, {left: true}, null, walkable, 4, player), true);
    }
    assert.ok(Math.abs(player.x - roadX) < .16);
    assert.equal(World.inFarm(player.x, player.y), false);
    for (let i = 0; i < steps; i++) {
        assert.equal(Movement.advance(state, .04, {right: true}, null, walkable, 4, player), true);
    }
    assert.ok(Math.abs(player.x - park.player.x) < 1e-8);
    assert.equal(player.y, park.player.y);
});

test('hedge and park obstacles block the crossing and custom parks retain local collision', () => {
    assert.equal(walkable(park, 8.05, 23.8), false);
    assert.equal(walkable(park, 8.05, 24.1), false);
    assert.equal(walkable(park, 8.05, 25), true);
    assert.equal(World.canOccupy(park, 8.05, 25, null, null, parkOccupancy), false);
    const blocked = () => false;
    assert.equal(World.canOccupy(park, 7.95, 25, village, placement, blocked), false);
    assert.equal(walkable({...park, parkPackageId: 'custom'}, 7.95, 20), true);
});
