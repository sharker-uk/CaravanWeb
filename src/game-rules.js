(function (globalScope) {
    const GRID_W = 60;
    const GRID_H = 40;
    const UTILITY_TYPES = ['gas', 'water', 'electricity', 'waste'];

    function createEmptyUtilities() {
        return {gas: false, water: false, electricity: false, waste: false};
    }

    function normalizeUtilities(utilities = {}) {
        return Object.fromEntries(
            UTILITY_TYPES.map(type => [type, Boolean(utilities?.[type])])
        );
    }

    function isValidTileData(tile) {
        if (!tile || typeof tile !== 'object') return false;
        if (tile.terrain === undefined) {
            return ['grass', 'road', 'water'].includes(tile.type);
        }
        return ['grass', 'water'].includes(tile.terrain) &&
            (tile.nature === null || tile.nature === undefined ||
                ['tree', 'debris'].includes(tile.nature)) &&
            (tile.road === undefined || typeof tile.road === 'boolean') &&
            (tile.path === undefined || typeof tile.path === 'boolean') &&
            (tile.utilities === undefined || (tile.utilities && typeof tile.utilities === 'object' &&
                UTILITY_TYPES.every(type => tile.utilities[type] === undefined ||
                    typeof tile.utilities[type] === 'boolean')));
    }

    function validateSaveData(data, options = {}) {
        const width = Number(options.gridWidth ?? GRID_W);
        const height = Number(options.gridHeight ?? GRID_H);

        if (!data || !Array.isArray(data.tiles) || data.tiles.length !== height) return false;
        if (!Array.isArray(data.pitches) || !Array.isArray(data.caravans)) return false;
        if (!data.tiles.every(row => Array.isArray(row) && row.length === width &&
            row.every(isValidTileData))) {
            return false;
        }
        if (!data.pitches.every(pitch => pitch && typeof pitch === 'object' &&
            ['x', 'y', 'w', 'h'].every(key => Number.isFinite(pitch[key])))) {
            return false;
        }
        if (!data.caravans.every(caravan => caravan && typeof caravan === 'object' &&
            (caravan.tier === 1 || caravan.tier === 2))) {
            return false;
        }
        if (data.facilities !== undefined && (!Array.isArray(data.facilities) ||
            !data.facilities.every(facility => facility && typeof facility === 'object' &&
                ['x', 'y', 'w', 'h'].every(key => Number.isFinite(facility[key]))))) {
            return false;
        }
        return true;
    }

    function getPitchHookups(pitch, tileMap = []) {
        const hookups = createEmptyUtilities();
        if (!pitch || !Number.isFinite(pitch.x) || !Number.isFinite(pitch.y) ||
            !Number.isFinite(pitch.w) || !Number.isFinite(pitch.h)) {
            return hookups;
        }

        for (let x = pitch.x; x < pitch.x + pitch.w; x++) {
            for (const y of [pitch.y - 1, pitch.y + pitch.h]) {
                const tile = tileMap[y]?.[x];
                if (tile && (tile.road || tile.path)) {
                    UTILITY_TYPES.forEach(type => { hookups[type] ||= Boolean(tile.utilities?.[type]); });
                }
            }
        }
        for (let y = pitch.y; y < pitch.y + pitch.h; y++) {
            for (const x of [pitch.x - 1, pitch.x + pitch.w]) {
                const tile = tileMap[y]?.[x];
                if (tile && (tile.road || tile.path)) {
                    UTILITY_TYPES.forEach(type => { hookups[type] ||= Boolean(tile.utilities?.[type]); });
                }
            }
        }
        return hookups;
    }

    function isPitchReadyForStatic(pitch, tileMap = []) {
        if (pitch?.type !== 'gravel') return false;
        const hookups = getPitchHookups(pitch, tileMap);
        return UTILITY_TYPES.every(type => hookups[type]);
    }

    function isGuestAccommodationValid(pitch, accommodation, tileMap = []) {
        if (!pitch || !accommodation) return false;
        if (pitch.type === 'grass') return accommodation === 'tent' || accommodation === 'towed';
        if (pitch.type === 'gravel') {
            return accommodation === 'towed' ||
                (accommodation === 'static' && isPitchReadyForStatic(pitch, tileMap));
        }
        return false;
    }

    function getGuestDailyIncome(rating) {
        return Math.max(0, Math.round(25 * Number(rating) || 0));
    }

    function findPathToAny(start, destinationTiles, isWalkable) {
        if (!start || typeof isWalkable !== 'function') return null;

        const startX = Math.floor(start.x);
        const startY = Math.floor(start.y);
        const destinations = new Set(
            (destinationTiles || []).map(tile => `${Math.floor(tile.x)},${Math.floor(tile.y)}`)
        );
        const startKey = `${startX},${startY}`;
        const queue = [{x: startX, y: startY}];
        const previous = new Map([[startKey, null]]);

        let destinationKey = destinations.has(startKey) ? startKey : null;
        for (let index = 0; index < queue.length && !destinationKey; index++) {
            const current = queue[index];
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const x = current.x + dx;
                const y = current.y + dy;
                const key = `${x},${y}`;
                if (previous.has(key) || !isWalkable(x, y)) continue;
                previous.set(key, `${current.x},${current.y}`);
                if (destinations.has(key)) {
                    destinationKey = key;
                    break;
                }
                queue.push({x, y});
            }
        }

        if (!destinationKey) return null;

        const path = [];
        for (let key = destinationKey; key && key !== startKey; key = previous.get(key)) {
            const [x, y] = key.split(',').map(Number);
            path.unshift({x: x + 0.5, y: y + 0.5});
        }
        return path;
    }

    const api = {
        GRID_W,
        GRID_H,
        UTILITY_TYPES,
        createEmptyUtilities,
        normalizeUtilities,
        isValidTileData,
        validateSaveData,
        isGuestAccommodationValid,
        isPitchReadyForStatic,
        getPitchHookups,
        getGuestDailyIncome,
        findPathToAny
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    globalScope.GameRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
