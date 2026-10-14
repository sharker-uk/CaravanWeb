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
            top: TOP_COLOURS.some(item => item.value === avatar.top) ? avatar.top :
                (TOP_COLOURS.some(item => item === avatar.top) ? avatar.top : fallback.top),
            bottom: BOTTOM_COLOURS.some(item => item.value === avatar.bottom) ? avatar.bottom :
                (BOTTOM_COLOURS.some(item => item === avatar.bottom) ? avatar.bottom : fallback.bottom),
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
            top: pick(TOP_COLOURS).value,
            bottom: pick(BOTTOM_COLOURS).value,
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

    function createNpcs(state, canOccupy) {
        const count = 5 + Math.floor(Math.random() * 3);
        const usedNames = new Set();
        const npcs = [];
        for (let index = 0; index < count; index++) {
            let position = null;
            for (let attempt = 0; attempt < 80; attempt++) {
                const x = 10.5 + Math.random() * 10;
                const y = 22.5 + Math.random() * 6;
                if ((!canOccupy || canOccupy(x, y)) &&
                    !npcs.some(npc => Math.hypot(npc.x - x, npc.y - y) < 1.25)) {
                    position = {x, y};
                    break;
                }
            }
            if (!position) position = {x: 12.5 + index, y: 26.5};
            let name = pick(NAMES);
            let tries = 0;
            while (usedNames.has(name) && tries++ < 20) name = pick(NAMES);
            usedNames.add(name);
            const appearance = randomizeAvatar(defaultAvatar());
            appearance.name = name;
            npcs.push({
                id: 'visitor-' + (index + 1),
                name,
                appearance,
                x: position.x,
                y: position.y,
                targetX: position.x,
                targetY: position.y,
                wanderTimer: Math.random() * 3,
                speed: 0.22 + Math.random() * 0.18
            });
        }
        return npcs;
    }

    function normalizeNpcs(value, state, canOccupy) {
        if (!Array.isArray(value)) return createNpcs(state, canOccupy);
        return value.slice(0, 12).filter(npc => npc && typeof npc === 'object' &&
            Number.isFinite(npc.x) && Number.isFinite(npc.y)).map((npc, index) => {
            const appearance = normalizeAvatar(npc.appearance);
            const x = Math.max(1, Math.min(45, npc.x));
            const y = Math.max(1, Math.min(37, npc.y));
            return {
                id: typeof npc.id === 'string' ? npc.id : 'visitor-' + (index + 1),
                name: typeof npc.name === 'string' ? npc.name.slice(0, 24) : appearance.name,
                appearance,
                x, y,
                targetX: Number.isFinite(npc.targetX) ? npc.targetX : x,
                targetY: Number.isFinite(npc.targetY) ? npc.targetY : y,
                wanderTimer: Number.isFinite(npc.wanderTimer) ? npc.wanderTimer : 0,
                speed: Number.isFinite(npc.speed) ? Math.max(0.1, Math.min(0.6, npc.speed)) : 0.3
            };
        });
    }

    function updateNpcs(npcs, deltaSeconds, canOccupy) {
        if (!Array.isArray(npcs) || !canOccupy || deltaSeconds <= 0) return;
        npcs.forEach(npc => {
            npc.wanderTimer -= deltaSeconds;
            const distance = Math.hypot(npc.targetX - npc.x, npc.targetY - npc.y);
            if (distance < 0.18 || npc.wanderTimer <= 0) {
                let found = false;
                for (let attempt = 0; attempt < 20; attempt++) {
                    const targetX = 10.5 + Math.random() * 10;
                    const targetY = 22.5 + Math.random() * 6;
                    if (canOccupy(targetX, targetY)) {
                        npc.targetX = targetX;
                        npc.targetY = targetY;
                        npc.wanderTimer = 2 + Math.random() * 5;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    npc.targetX = npc.x;
                    npc.targetY = npc.y;
                    npc.wanderTimer = 2;
                }
                return;
            }
            const step = Math.min(distance, npc.speed * deltaSeconds);
            const nextX = npc.x + (npc.targetX - npc.x) / distance * step;
            const nextY = npc.y + (npc.targetY - npc.y) / distance * step;
            if (canOccupy(nextX, nextY)) {
                npc.x = nextX;
                npc.y = nextY;
            } else {
                npc.wanderTimer = 0;
            }
        });
    }

    globalScope.CharacterSystem = {
        skinTones: SKIN_TONES,
        hairColours: HAIR_COLOURS,
        hairStyles: HAIR_STYLES,
        accessories: ACCESSORIES,
        tops: TOP_COLOURS,
        bottoms: BOTTOM_COLOURS,
        defaultAvatar,
        normalizeAvatar,
        randomizeAvatar,
        drawCharacter,
        createNpcs,
        normalizeNpcs,
        updateNpcs
    };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = globalScope.CharacterSystem;
    }
})(typeof window !== 'undefined' ? window : globalThis);
