const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const movement = require('../src/living-park-movement');
const game = require('../src/game-state');
const construction = require('../src/construction');

test('clicking a tree routes to adjacent ground and allows walking away', () => {
    const state = game.createGameState({
        player: {x: 10.5, y: 10.5}, playerPath: [],
        tiles: Array.from({length: 16}, () => Array.from({length: 16}, () => ({terrain: 'grass'})))
    });
    const tree = {x: 12, y: 10};
    state.tiles[tree.y][tree.x].nature = 'tree';
    const shell = fs.readFileSync(require.resolve('../src/management-shell'), 'utf8');
    const canWalk = game.canOccupyPlayer;
    const context = vm.createContext({
        walking: true, api: {getState: () => state}, walkingPosition: () => state.player,
        map: {canWalk}, world: {usesFarmBoundary: () => true},
        LivingParkMovement: movement, announce() {}, render() {}
    });
    vm.runInContext(shell.slice(shell.indexOf('function walkTo('), shell.indexOf('function walkingFrame(')), context);
    assert.equal(context.walkTo(tree, true), true);
    for (let i = 0; i < 20; i++) movement.advance(state, 0.05, {}, null, canWalk);
    assert.equal(movement.adjacent(movement.tile(state.player), tree), true);
    assert.equal(canWalk(state, state.player.x, state.player.y), true);
    const position = {...state.player};
    assert.equal(movement.advance(state, 0.05, {left: true}, null, canWalk), true);
    assert.ok(state.player.x < position.x);
});

test('a planted tree finishes only after the player steps clear', () => {
    const state = {player: {x: 1.1, y: 0.5}, day: 1, hour: 9, minute: 0,
        tiles: [[{}, {}]], constructions: [{kind: 'tree', x: 0, y: 0,
            footprint: {x: 0, y: 0, w: 1, h: 1}, completesAt: 0}]};
    const main = fs.readFileSync(require.resolve('../src/main'), 'utf8');
    const context = vm.createContext({state, GameStateApi: game, playSound() {}});
    vm.runInContext(main.slice(main.indexOf('function completeConstruction('),
        main.indexOf('function updateConstructions(')), context);
    assert.equal(construction.completeDueConstructions(state, context.completeConstruction), 0);
    assert.equal(state.tiles[0][0].nature, undefined);
    state.player.x = 1.5;
    assert.equal(construction.completeDueConstructions(state, context.completeConstruction), 1);
    assert.equal(state.tiles[0][0].nature, 'tree');
});
