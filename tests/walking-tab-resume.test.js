const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const LivingParkMovement = require('../src/living-park-movement.js');

const shell = fs.readFileSync(path.join(__dirname, '../src/management-shell.js'), 'utf8');

test('walking resumes after a hidden tab misses keyup and animation frames', () => {
    const state = {player: {x: 12, y: 24}, playerPath: []};
    const panel = () => ({hidden: true});
    const document = Object.assign(new EventTarget(), {hidden: false, querySelector: () => null});
    const window = Object.assign(new EventTarget(), {CaravanLandParcels: {inParcel: () => false}});
    const context = vm.createContext({
        state, document, window, LivingParkMovement,
        api: {getState: () => state, save() {}},
        map: {canWalk: () => true, updatePlayer() {}, followPlayer() {}},
        world: {usesFarmBoundary: () => true, inFarm: () => true},
        GameStateApi: {}, $: panel, requestAnimationFrame() {},
        walkingPosition: () => state.player
    });
    const section = (start, end) => shell.slice(shell.indexOf(start), shell.indexOf(end));
    vm.runInContext(`
        let ready = true, walking = true, lastFrame = 0, lastAutosave = 0;
        let actionMenuOpen = false, spraying = false, interaction = null, surfaceTool = '';
        const held = new Set();
        function refreshMarking() {}
        function stopSpray() { spraying = false; }
        ${section('function stopWalking()', 'function setTablet(')}
        ${section('function walkingFrame(', '\nrequestAnimationFrame(walkingFrame);')}
        ${section("document.addEventListener('keyup'", "window.addEventListener('caravan:change'")}
    `, context);

    const run = code => vm.runInContext(code, context);
    const key = value => {
        const event = Object.assign(new Event('keydown'), {key: value, repeat: false});
        const listenerTarget = {closest: () => null};
        Object.defineProperty(event, 'target', {value: listenerTarget});
        document.dispatchEvent(event);
    };

    key('d');
    run('walkingFrame(100); walkingFrame(116);');
    const before = state.player.x;
    assert.ok(before > 12);

    document.hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(run('held.size'), 0);
    key('d');
    assert.equal(run('held.size'), 0);

    document.hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    run('walkingFrame(1800116);');
    assert.equal(state.player.x, before);
    key('d');
    run('walkingFrame(1800132);');
    assert.ok(state.player.x > before);

    key('e');
    assert.equal(run('actionMenuOpen'), true);
    window.dispatchEvent(new Event('blur'));
    assert.equal(run('actionMenuOpen'), false);
    key('a');
    const beforeLeft = state.player.x;
    run('walkingFrame(1800148); walkingFrame(1800164);');
    assert.ok(state.player.x < beforeLeft);
});
