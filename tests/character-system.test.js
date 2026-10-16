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
    assert.equal(typeof avatar.top, 'string');
    assert.equal(typeof avatar.bottom, 'string');
    assert.ok(CharacterSystem.tops.some(top => top.value === avatar.top));
    assert.ok(CharacterSystem.bottoms.some(bottom => bottom.value === avatar.bottom));
    assert.ok(CharacterSystem.accessories.includes(avatar.accessory));
});

test('guest roster creates profiles for future bookings without spawning roaming NPCs', () => {
    const roster = CharacterSystem.createGuestRoster(12);
    assert.equal(roster.length, 12);
    assert.equal(new Set(roster.map(profile => profile.name)).size, 12);
    roster.forEach(profile => {
        assert.ok(profile.name.length > 0);
        assert.ok(CharacterSystem.hairStyles.includes(profile.appearance.hairStyle));
        assert.equal(profile.appearance.name, profile.name);
    });
});

test('a booking receives the correct number of named character appearances', () => {
    const roster = CharacterSystem.createGuestRoster(5);
    const result = CharacterSystem.createPartyMembers({type: 'family', headcount: 3}, roster);
    assert.equal(result.members.length, 3);
    assert.equal(result.roster.length, 2);
    result.members.forEach(member => {
        assert.ok(member.name.length > 0);
        assert.equal(member.appearance.name, member.name);
    });
});

test('saved guest roster profiles are normalized and capped', () => {
    const roster = Array.from({length: 35}, (_, index) => ({
        id: String(index),
        name: 'Visitor ' + index,
        appearance: {skin: 'invalid'}
    }));
    const restored = CharacterSystem.normalizeGuestRoster(roster);
    assert.equal(restored.length, 30);
    assert.equal(restored[0].name, 'Visitor 0');
    assert.equal(restored[0].appearance.skin, CharacterSystem.defaultAvatar().skin);
});
