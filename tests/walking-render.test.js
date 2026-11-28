const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('clearing a tree and moving guests preserve unchanged map artwork', () => {
    const writes = [];
    class Element {
        constructor() { this.children = []; this.dataset = {}; }
        append(node) { this.children.push(node); }
        set innerHTML(value) { writes.push(value); }
        querySelector(selector) { return this.children.find(node => '#' + node.id === selector); }
        querySelectorAll() { return []; }
        setAttribute() {}
        addEventListener() {}
        getBoundingClientRect() { return {width: 800, height: 600}; }
    }
    const svg = new Element();
    const world = new Element();
    const labels = new Element();
    world.id = 'mg-world';
    labels.id = 'mg-map-labels';
    svg.append(world);
    svg.append(labels);
    const window = {
        CaravanConnectedWorld: {usesFarmBoundary: () => false},
        CaravanNatureAssets: {groundDetails: () => '<path/>', hash: () => 0, natureGraphic: () => ''}
    };
    const context = vm.createContext({
        window, document: {createElementNS: () => new Element(), getElementById: () => null},
        fetch: () => new Promise(() => {}), ResizeObserver: class { observe() {} }
    });
    vm.runInContext(fs.readFileSync(require.resolve('../src/management-map'), 'utf8'), context);
    const map = window.ManagementMap.create(svg, {});
    const state = {
        tiles: [[{terrain: 'grass', nature: 'tree'}], [{terrain: 'grass', nature: 'tree'}]],
        guests: [], constructions: []
    };
    map.render(state, []);
    writes.length = 0;
    state.tiles[0][0].nature = null;
    map.render(state, []);
    assert.deepEqual(writes, ['']);

    writes.length = 0;
    state.guests.push({position: {x: 2, y: 3}});
    map.render(state, []);
    assert.equal(writes.length, 1);
    assert.match(writes[0], /cy="60"/);
    writes.length = 0;
    map.render(state, []);
    assert.equal(writes.length, 0);
});
