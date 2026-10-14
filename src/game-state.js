(function (globalScope) {
    const DEFAULT_STATE = {
        cash: 1500,
        initialBalance: 1500,
        wood: 0,
        beauty: 50,
        tools: {axe: true, shovel: false},
        transactions: [],
        rating: 1.0,
        satisfaction: 60,
        day: 1,
        hour: 9,
        minute: 0,
        dayLengthMinutes: 10,
        simulationSpeed: 1,
        isPaused: false,
        weather: 'Sunny',
        tiles: [],
        pitches: [],
        caravans: [],
        guests: [],
        guestArrivalProgress: 0,
        dailyGuestArrivals: 0,
        facilities: [],
        landmarks: [],
        constructions: [],
        vehicles: [],
        handymen: 0,
        camera: { x: 100, y: 100, zoom: 3 },
        activeTool: 'select',
        selectedEntity: null,
        player: { x: 5.5, y: 10.5 },
        playerPath: [],
        interactionTarget: null
    };

    function createGameState(overrides = {}) {
        const nextState = {
            ...DEFAULT_STATE,
            ...overrides,
            camera: {
                ...DEFAULT_STATE.camera,
                ...(overrides.camera || {})
            },
            player: {
                ...DEFAULT_STATE.player,
                ...(overrides.player || {})
            }
        };
        return nextState;
    }

    function getTileProperties(state, x, y) {
        if (!state || !Array.isArray(state.tiles) || !Array.isArray(state.pitches)) {
            return { walkable: false, buildable: false, occupied: true, interactable: false };
        }

        const tile = state.tiles[y]?.[x];
        if (!tile) {
            return { walkable: false, buildable: false, occupied: true, interactable: false };
        }

        const pitch = state.pitches.find(item =>
            x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h
        );
        const facility = state.facilities.find(item =>
            x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h
        );
        const caravan = state.caravans.find(item =>
            x >= item.pitch.x && x < item.pitch.x + item.pitch.w &&
            y >= item.pitch.y && y < item.pitch.y + item.pitch.h
        );
        const guest = state.guests.find(item =>
            x >= item.pitch.x && x < item.pitch.x + item.pitch.w &&
            y >= item.pitch.y && y < item.pitch.y + item.pitch.h
        );
        const landmark = state.landmarks?.find(item =>
            x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h
        );
        const construction = state.constructions?.find(item =>
            item.footprint && x >= item.footprint.x && x < item.footprint.x + item.footprint.w &&
            y >= item.footprint.y && y < item.footprint.y + item.footprint.h
        );
        const pitchIsAvailable = Boolean(pitch && !pitch.occupied);
        const tree = tile.nature === 'tree';
        const hasObject = Boolean(facility || caravan || guest);
        const landmarkBlocksBuilding = Boolean(landmark?.blocksBuilding);
        const landmarkBlocksMovement = Boolean(landmark?.blocksMovement);
        const buildable = tile.terrain === 'grass' && !tile.road && !tile.path && !tree &&
            !pitch && !hasObject && !landmarkBlocksBuilding && !construction;

        return {
            walkable: (tile.terrain === 'grass' || tile.terrain === 'sand') && !tree &&
                !hasObject && !landmarkBlocksMovement &&
                (!construction?.blocksMovement ||
                    (state.player && playerOverlapsFootprint(state.player, construction.footprint))),
            buildable,
            occupied: Boolean(tree || pitch || hasObject),
            interactable: Boolean(tree || tile.nature === 'debris' || pitchIsAvailable ||
                caravan || guest || facility || landmark?.interactable === true)
        };
    }

    function canOccupyPlayer(state, x, y) {
        const radius = 0.18;
        return [[0, 0], [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]]
            .every(([offsetX, offsetY]) => {
                const tileX = Math.floor(x + offsetX);
                const tileY = Math.floor(y + offsetY);
                return getTileProperties(state, tileX, tileY).walkable;
            });
    }

    function playerOverlapsFootprint(player, footprint) {
        const radius = 0.18;
        return player.x + radius > footprint.x &&
            player.x - radius < footprint.x + footprint.w &&
            player.y + radius > footprint.y &&
            player.y - radius < footprint.y + footprint.h;
    }

    function findPathToAny(state, destinationTiles) {
        const start = { x: Math.floor(state.player.x), y: Math.floor(state.player.y) };
        const destinations = new Set((destinationTiles || []).map(tile => `${Math.floor(tile.x)},${Math.floor(tile.y)}`));
        const startKey = `${start.x},${start.y}`;
        const queue = [start];
        const previous = new Map([[startKey, null]]);
        let destinationKey = destinations.has(startKey) ? startKey : null;

        for (let index = 0; index < queue.length && !destinationKey; index++) {
            const current = queue[index];
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const x = current.x + dx;
                const y = current.y + dy;
                const key = `${x},${y}`;
                if (previous.has(key) || !getTileProperties(state, x, y).walkable) continue;
                previous.set(key, `${current.x},${current.y}`);
                if (destinations.has(key)) {
                    destinationKey = key;
                    break;
                }
                queue.push({ x, y });
            }
        }

        if (!destinationKey) return null;

        const path = [];
        for (let key = destinationKey; key && key !== startKey; key = previous.get(key)) {
            const [x, y] = key.split(',').map(Number);
            path.unshift({ x: x + 0.5, y: y + 0.5 });
        }
        return path;
    }

    function findInteractableAt(state, x, y) {
        const tile = state.tiles[y]?.[x];
        if (tile?.nature === 'tree' || tile?.nature === 'debris') {
            return { kind: tile.nature, entity: tile, x, y, w: 1, h: 1 };
        }

        const caravan = state.caravans.find(item =>
            x >= item.pitch.x && x < item.pitch.x + item.pitch.w &&
            y >= item.pitch.y && y < item.pitch.y + item.pitch.h
        );
        if (caravan) return { kind: 'caravan', entity: caravan, x: caravan.pitch.x, y: caravan.pitch.y, w: caravan.pitch.w, h: caravan.pitch.h };

        const guest = state.guests.find(item =>
            x >= item.pitch.x && x < item.pitch.x + item.pitch.w &&
            y >= item.pitch.y && y < item.pitch.y + item.pitch.h
        );
        if (guest) return { kind: 'guest', entity: guest, x: guest.pitch.x, y: guest.pitch.y, w: guest.pitch.w, h: guest.pitch.h };

        const facility = state.facilities.find(item =>
            x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h
        );
        if (facility) return { kind: 'facility', entity: facility, x: facility.x, y: facility.y, w: facility.w, h: facility.h };

        const landmark = state.landmarks?.find(item => item.interactable === true &&
            x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h
        );
        if (landmark) return {kind: 'landmark', entity: landmark, x: landmark.x, y: landmark.y, w: landmark.w, h: landmark.h};

        const pitch = state.pitches.find(item => !item.occupied &&
            x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h);
        if (pitch) return { kind: 'pitch', entity: pitch, x: pitch.x, y: pitch.y, w: pitch.w, h: pitch.h };
        return null;
    }

    const api = {
        DEFAULT_STATE,
        createGameState,
        getTileProperties,
        canOccupyPlayer,
        findPathToAny,
        findInteractableAt
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    globalScope.GameState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
