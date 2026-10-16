(function (globalScope) {
    const SKIN_TONES = ['#f7d2b0', '#d9a078', '#b87550', '#87543b', '#603b2b'];
    const HAIR_COLOURS = ['#33251f', '#68452f', '#b97835', '#d5b66b', '#b94b35', '#aeb4b8'];
    const TOP_COLOURS = ['#397c9d', '#b84d3f', '#65824c', '#d7ad55', '#795d91', '#e2d8c6'];
    const BOTTOM_COLOURS = ['#34495e', '#5b493b', '#536b45', '#8d8e8f', '#263c54'];
    const HAIR_STYLES = ['short', 'messy', 'bob', 'long', 'bald'];
    const ACCESSORIES = ['none', 'flatcap', 'bucket-hat', 'glasses'];
    const NAMES = [
        'Pat', 'Darren', 'Mandy', 'Kev', 'Sharon', 'Baz', 'Julie', 'Martin',
        'Tracey', 'Nigel', 'Debbie', 'Wayne', 'Gillian', 'Clive', 'Bev', 'Colin',
        'Rita', 'Trevor', 'Donna', 'Phil', 'Carol', 'Mick', 'Sue', 'Barry'
    ];
    const TOPS = [
        {label: 'Coastal blue', value: '#397c9d'},
        {label: 'Rusty red', value: '#b84d3f'},
        {label: 'Park green', value: '#65824c'},
        {label: 'Seaside yellow', value: '#d7ad55'},
        {label: 'Dusky purple', value: '#795d91'},
        {label: 'Cream', value: '#e2d8c6'}
    ];
    const BOTTOMS = [
        {label: 'Navy', value: '#34495e'},
        {label: 'Brown', value: '#5b493b'},
        {label: 'Olive', value: '#536b45'},
        {label: 'Grey', value: '#8d8e8f'},
        {label: 'Dark denim', value: '#263c54'}
    ];

    function pick(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    function defaultAvatar() {
        return {
            name: 'Park Manager',
            skin: '#f7d2b0',
            hairStyle: 'short',
            hairColour: '#33251f',
            top: '#397c9d',
            bottom: '#34495e',
            accessory: 'none'
        };
    }

    function normalizeAvatar(value) {
        const avatar = value && typeof value === 'object' ? value : {};
        const fallback = defaultAvatar();
        return {
            name: typeof avatar.name === 'string' ? avatar.name.slice(0, 24) : fallback.name,
            skin: SKIN_TONES.includes(avatar.skin) ? avatar.skin : fallback.skin,
            hairStyle: HAIR_STYLES.includes(avatar.hairStyle) ? avatar.hairStyle : fallback.hairStyle,
            hairColour: HAIR_COLOURS.includes(avatar.hairColour) ? avatar.hairColour : fallback.hairColour,
            top: TOPS.some(item => item.value === avatar.top) || TOP_COLOURS.includes(avatar.top)
                ? avatar.top : fallback.top,
            bottom: BOTTOMS.some(item => item.value === avatar.bottom) || BOTTOM_COLOURS.includes(avatar.bottom)
                ? avatar.bottom : fallback.bottom,
            accessory: ACCESSORIES.includes(avatar.accessory) ? avatar.accessory : fallback.accessory
        };
    }

    function randomizeAvatar(current) {
        const base = normalizeAvatar(current);
        return {
            ...base,
            skin: pick(SKIN_TONES),
            hairStyle: pick(HAIR_STYLES),
            hairColour: pick(HAIR_COLOURS),
            top: pick(TOPS).value,
            bottom: pick(BOTTOMS).value,
            accessory: pick(ACCESSORIES)
        };
    }

    function drawCharacter(ctx, value, x, y, scale = 1) {
        const avatar = normalizeAvatar(value);
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.scale(scale, scale);
        ctx.imageSmoothingEnabled = false;

        // A deliberately tiny, blocky character that matches the current canvas prototype.
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 7, 6, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = avatar.bottom;
        ctx.fillRect(-3, 4, 2, 4);
        ctx.fillRect(1, 4, 2, 4);
        ctx.fillStyle = '#2a2826';
        ctx.fillRect(-3, 7, 3, 1);
        ctx.fillRect(1, 7, 3, 1);

        ctx.fillStyle = avatar.top;
        ctx.fillRect(-4, -1, 8, 6);
        ctx.fillRect(-5, 0, 2, 4);
        ctx.fillRect(3, 0, 2, 4);
        ctx.fillStyle = avatar.skin;
        ctx.fillRect(-1, -3, 2, 3);
        ctx.fillRect(-3, -7, 6, 6);

        // Hair silhouettes are kept to a few pixels so the shapes read at game zoom.
        ctx.fillStyle = avatar.hairColour;
        if (avatar.hairStyle === 'short') {
            ctx.fillRect(-3, -8, 6, 2);
            ctx.fillRect(-4, -6, 1, 2);
        } else if (avatar.hairStyle === 'messy') {
            ctx.fillRect(-4, -8, 3, 2);
            ctx.fillRect(-1, -9, 3, 3);
            ctx.fillRect(2, -8, 2, 2);
        } else if (avatar.hairStyle === 'bob') {
            ctx.fillRect(-4, -8, 8, 2);
            ctx.fillRect(-4, -6, 2, 5);
            ctx.fillRect(2, -6, 2, 5);
        } else if (avatar.hairStyle === 'long') {
            ctx.fillRect(-4, -8, 8, 2);
            ctx.fillRect(-4, -6, 2, 7);
            ctx.fillRect(2, -6, 2, 7);
        }
        if (avatar.accessory === 'flatcap') {
            ctx.fillStyle = avatar.hairColour;
            ctx.fillRect(-4, -10, 8, 2);
            ctx.fillRect(1, -8, 4, 1);
        } else if (avatar.accessory === 'bucket-hat') {
            ctx.fillStyle = avatar.hairColour;
            ctx.fillRect(-4, -10, 8, 2);
            ctx.fillRect(-5, -8, 10, 1);
        }

        ctx.fillStyle = '#33251f';
        ctx.fillRect(-2, -5, 1, 1);
        ctx.fillRect(1, -5, 1, 1);
        if (avatar.accessory === 'glasses') {
            ctx.fillStyle = '#25323b';
            ctx.fillRect(-3, -6, 2, 2);
            ctx.fillRect(1, -6, 2, 2);
            ctx.fillRect(-1, -5, 2, 1);
        }
        ctx.restore();
    }

    function createGuestRoster(count = 12) {
        const roster = [];
        const usedNames = new Set();
        for (let index = 0; index < Math.max(1, Math.min(30, count)); index++) {
            let name = pick(NAMES);
            let tries = 0;
            while (usedNames.has(name) && tries++ < 30) name = pick(NAMES);
            usedNames.add(name);
            const appearance = randomizeAvatar(defaultAvatar());
            appearance.name = name;
            roster.push({
                id: 'guest-profile-' + (index + 1),
                name,
                appearance
            });
        }
        return roster;
    }

    function normalizeGuestRoster(value) {
        if (!Array.isArray(value)) return createGuestRoster(12);
        const profiles = value.slice(0, 30).filter(profile => profile && typeof profile === 'object');
        return profiles.map((profile, index) => {
            const name = typeof profile.name === 'string' && profile.name.trim()
                ? profile.name.trim().slice(0, 24)
                : 'Visitor ' + (index + 1);
            return {
                id: typeof profile.id === 'string' ? profile.id : 'guest-profile-' + (index + 1),
                name,
                appearance: normalizeAvatar({...profile.appearance, name})
            };
        });
    }

    function createPartyMembers(party, roster = []) {
        const requestedCount = Math.max(1, Math.min(8, Number.isInteger(party?.headcount) ? party.headcount : 1));
        const available = normalizeGuestRoster(roster);
        while (available.length < requestedCount) {
            available.push(...createGuestRoster(Math.max(4, requestedCount - available.length)));
        }
        const members = available.splice(0, requestedCount).map((profile, index) => {
            const name = typeof profile.name === 'string' ? profile.name : 'Visitor ' + (index + 1);
            const appearance = normalizeAvatar({...profile.appearance, name});
            return {
                id: typeof profile.id === 'string' ? profile.id : 'guest-' + (index + 1),
                name,
                appearance
            };
        });
        return {members, roster: available};
    }

    globalScope.CharacterSystem = {
        skinTones: SKIN_TONES,
        hairColours: HAIR_COLOURS,
        hairStyles: HAIR_STYLES,
        accessories: ACCESSORIES,
        tops: TOPS,
        bottoms: BOTTOMS,
        defaultAvatar,
        normalizeAvatar,
        randomizeAvatar,
        drawCharacter,
        createGuestRoster,
        normalizeGuestRoster,
        createPartyMembers
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = globalScope.CharacterSystem;
    }
})(typeof window !== 'undefined' ? window : globalThis);
