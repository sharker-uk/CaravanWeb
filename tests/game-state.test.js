const test = require('node:test');
const assert = require('node:assert/strict');
const { createGameState, canOccupyPlayer, findPathToAny, getTileProperties, findInteractableAt } = require('../src/game-state.js');

test('game state exposes a minimal explicit structure and default player state', () => {
  const state = createGameState();
  assert.equal(state.cash, 1500);
  assert.equal(state.initialBalance, 1500);
  assert.equal(state.player.x, 5.5);
  assert.equal(state.player.y, 10.5);
  assert.equal(Array.isArray(state.tiles), true);
});

test('walkability and pathfinding use the state contract instead of global data', () => {
  const tiles = Array.from({ length: 6 }, () =>
    Array.from({ length: 6 }, () => ({ terrain: 'grass', nature: null, road: false, path: false }))
  );
  const state = createGameState({
    tiles,
    player: { x: 0.5, y: 0.5 },
    pitches: [],
    caravans: [],
    guests: [],
    facilities: []
  });

  assert.equal(canOccupyPlayer(state, 0.5, 0.5), true);
  assert.equal(canOccupyPlayer(state, 1.5, 0.5), true);

  const path = findPathToAny(state, [{ x: 4, y: 4 }]);
  assert.ok(path);
  assert.equal(path[path.length - 1].x, 4.5);
  assert.equal(path[path.length - 1].y, 4.5);
});

test('trees block walking and building but can be targeted for chopping', () => {
  const tiles = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => ({ terrain: 'grass', nature: null, road: false, path: false }))
  );
  tiles[1][1].nature = 'tree';
  const state = createGameState({ tiles, pitches: [], caravans: [], guests: [], facilities: [] });

  const properties = getTileProperties(state, 1, 1);
  assert.equal(properties.walkable, false);
  assert.equal(properties.buildable, false);
  assert.equal(properties.interactable, true);
  assert.equal(findInteractableAt(state, 1, 1).kind, 'tree');
});
