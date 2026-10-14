const test = require('node:test');
const assert = require('node:assert/strict');
const CharacterSystem = require('../src/character-system.js');

test('default avatar uses the current prototype palette', () => {
    const avatar = CharacterSystem.defaultAvatar();
    assert.equal(avatar.name, 'Park Manager');
    assert.equal(avatar.top, '#397c9d');
    assert.equal(avatar.hairStyle, 'short');
});

test('avatar normalization replaces invalid options with safe defaults', () => {
    const avatar = CharacterSystem.normalizeAvatar({
        name: 'A very long park manager name that should be shortened',
        skin: 'not-a-colour',
        hairStyle: 'dragon',
        hairColour: '#33251f',
        top: '#b84d3f',
        bottom: '#263c54',
        accessory: 'jetpack'
    });
    assert.equal(avatar.name.length, 24);
    assert.equal(avatar.skin, CharacterSystem.defaultAvatar().skin);
    assert.equal(avatar.hairStyle, 'short');
    assert.equal(avatar.top, '#b84d3f');
    assert.equal(avatar.bottom, '#263c54');
    assert.equal(avatar.accessory, 'none');
});

test('avatar randomiser keeps the manager name and selects supported appearance values', () => {
    const avatar = CharacterSystem.randomizeAvatar({...CharacterSystem.defaultAvatar(), name: 'Sharker'});
    assert.equal(avatar.name, 'Sharker');
    assert.ok(CharacterSystem.skinTones.includes(avatar.skin));
    assert.ok(CharacterSystem.hairStyles.includes(avatar.hairStyle));
    assert.ok(CharacterSystem.hairColours.includes(avatar.hairColour));
    assert.ok(CharacterSystem.tops.some(top => top.value === avatar.top));
    assert.ok(CharacterSystem.bottoms.some(bottom => bottom.value === avatar.bottom));
    assert.ok(CharacterSystem.accessories.includes(avatar.accessory));
});

test('new park visitors are generated as distinct, styled characters', () => {
    const npcs = CharacterSystem.createNpcs({tiles: []}, () => true);
    assert.ok(npcs.length >= 5 && npcs.length <= 7);
    assert.equal(new Set(npcs.map(npc => npc.name)).size, npcs.length);
    npcs.forEach(npc => {
        assert.ok(Number.isFinite(npc.x));
        assert.ok(Number.isFinite(npc.y));
        assert.ok(CharacterSystem.hairStyles.includes(npc.appearance.hairStyle));
        assert.equal(npc.appearance.name, npc.name);
    });
});

test('saved visitor data is normalized and capped', () => {
    const npcs = Array.from({length: 15}, (_, index) => ({
        id: String(index),
        name: 'Visitor ' + index,
        appearance: {skin: 'invalid'},
        x: 100,
        y: -5
    }));
    const restored = CharacterSystem.normalizeNpcs(npcs, {}, () => true);
    assert.equal(restored.length, 12);
    assert.equal(restored[0].x, 45);
    assert.equal(restored[0].y, 1);
    assert.equal(restored[0].appearance.skin, CharacterSystem.defaultAvatar().skin);
});
