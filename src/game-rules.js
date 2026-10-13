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

    function validateAccommodationPlacement(pitch, accommodation, tileMap = [], occupied = false) {
        if (!pitch) return {valid: false, reason: 'Select a pitch before placing accommodation.'};
        if (occupied) return {valid: false, reason: 'This pitch is already occupied.'};
        if (!isGuestAccommodationValid(pitch, accommodation, tileMap)) {
            if (accommodation === 'static' && pitch.type === 'gravel') {
                const missing = Object.entries(getPitchHookups(pitch, tileMap))
                    .filter(([, connected]) => !connected)
                    .map(([type]) => type);
                return {
                    valid: false,
                    reason: `Static caravans need all four hookups. Missing: ${missing.join(', ')}.`
                };
            }
            return {
                valid: false,
                reason: `${accommodation === 'static' ? 'Static caravans' : 'This accommodation'} cannot be placed on a ${pitch.type} pitch.`
            };
        }
        return {valid: true, reason: ''};
    }

    function validatePitchPlacement(pitch, tileMap = [], pitches = [], facilities = [], options = {}) {
        if (!pitch || !['grass', 'gravel'].includes(pitch.type) ||
            !['x', 'y', 'w', 'h'].every(key => Number.isInteger(pitch[key]))) {
            return {valid: false, reason: 'Pitch dimensions must be whole tiles.'};
        }
        const minimum = pitch.type === 'grass' ? {w: 4, h: 6} : {w: 4, h: 8};
        const fitsNormally = pitch.w >= minimum.w && pitch.h >= minimum.h;
        const fitsRotated = pitch.w >= minimum.h && pitch.h >= minimum.w;
        if (!fitsNormally && !fitsRotated) {
            return {
                valid: false,
                reason: `${pitch.type === 'grass' ? 'Grass' : 'Hardstanding'} pitches must be at least ${minimum.w} × ${minimum.h} tiles.`
            };
        }
        if (pitch.x < 0 || pitch.y < 0 ||
            pitch.x + pitch.w > tileMap[0]?.length ||
            pitch.y + pitch.h > tileMap.length) {
            return {valid: false, reason: 'The pitch would extend beyond the park boundary.'};
        }
        for (let y = pitch.y; y < pitch.y + pitch.h; y++) {
            for (let x = pitch.x; x < pitch.x + pitch.w; x++) {
                const tile = tileMap[y]?.[x];
                if (!tile || tile.terrain !== 'grass') {
                    return {valid: false, reason: 'Pitches can only be placed on dry grass.'};
                }
                if (tile.nature === 'tree' || tile.nature === 'debris') {
                    return {valid: false, reason: 'Clear trees and debris before building a pitch.'};
                }
                if (tile.road || tile.path) {
                    return {valid: false, reason: 'A pitch cannot overlap a road or path.'};
                }
            }
        }
        const overlaps = other => pitch.x < other.x + other.w && pitch.x + pitch.w > other.x &&
            pitch.y < other.y + other.h && pitch.y + pitch.h > other.y;
        if (pitches.some(overlaps) || facilities.some(overlaps)) {
            return {valid: false, reason: 'The pitch overlaps an existing pitch or facility.'};
        }
        let hasAdjacentRoute = false;
        for (let x = pitch.x; x < pitch.x + pitch.w; x++) {
            hasAdjacentRoute ||= Boolean(tileMap[pitch.y - 1]?.[x]?.road ||
                tileMap[pitch.y - 1]?.[x]?.path ||
                tileMap[pitch.y + pitch.h]?.[x]?.road ||
                tileMap[pitch.y + pitch.h]?.[x]?.path);
        }
        for (let y = pitch.y; y < pitch.y + pitch.h; y++) {
            hasAdjacentRoute ||= Boolean(tileMap[y]?.[pitch.x - 1]?.road ||
                tileMap[y]?.[pitch.x - 1]?.path ||
                tileMap[y]?.[pitch.x + pitch.w]?.road ||
                tileMap[y]?.[pitch.x + pitch.w]?.path);
        }
        if (options.requireAdjacentRoute !== false && !hasAdjacentRoute) {
            return {valid: false, reason: 'Connect the pitch to an adjacent road or path.'};
        }
        return {valid: true, reason: ''};
    }

    function planPitchBox(start, end, type) {
        if (!start || !end || !['x', 'y'].every(key =>
            Number.isInteger(start[key]) && Number.isInteger(end[key])) ||
            !['grass', 'gravel'].includes(type)) {
            return {valid: false, reason: 'Select a valid pitch area.'};
        }
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const boxWidth = Math.abs(end.x - start.x) + 1;
        const boxHeight = Math.abs(end.y - start.y) + 1;
        const minimum = type === 'grass' ? {w: 4, h: 6} : {w: 4, h: 8};
        const fitsNormally = boxWidth >= minimum.w && boxHeight >= minimum.h;
        const rotated = !fitsNormally && boxWidth >= minimum.h && boxHeight >= minimum.w;
        const pitchWidth = rotated ? minimum.h : minimum.w;
        const pitchHeight = rotated ? minimum.w : minimum.h;
        if (boxWidth < pitchWidth || boxHeight < pitchHeight) {
            return {
                valid: false,
                reason: `Draw at least ${minimum.w} × ${minimum.h} tiles for a ${type} pitch.`
            };
        }

        const columns = Math.floor(boxWidth / pitchWidth);
        const rows = Math.floor(boxHeight / pitchHeight);
        const pitches = [];
        let currentY = y;
        for (let row = 0; row < rows; row++) {
            const height = Math.floor(boxHeight / rows) + Number(row < boxHeight % rows);
            let currentX = x;
            for (let column = 0; column < columns; column++) {
                const width = Math.floor(boxWidth / columns) + Number(column < boxWidth % columns);
                pitches.push({x: currentX, y: currentY, w: width, h: height, type, occupied: false});
                currentX += width;
            }
            currentY += height;
        }
        return {valid: true, reason: '', pitches, box: {x, y, w: boxWidth, h: boxHeight}};
    }

    function getGridLine(start, end) {
        const points = [];
        let x = start.x;
        let y = start.y;
        const dx = Math.abs(end.x - start.x);
        const sx = start.x < end.x ? 1 : -1;
        const dy = -Math.abs(end.y - start.y);
        const sy = start.y < end.y ? 1 : -1;
        let error = dx + dy;
        while (true) {
            points.push({x, y});
            if (x === end.x && y === end.y) break;
            const doubledError = 2 * error;
            if (doubledError >= dy) {
                error += dy;
                x += sx;
            }
            if (doubledError <= dx) {
                error += dx;
                y += sy;
            }
        }
        return points;
    }

    function validateUtilityLine(start, end, tileMap = [], type) {
        if (!start || !end || !['x', 'y'].every(key =>
            Number.isInteger(start[key]) && Number.isInteger(end[key])) ||
            !UTILITY_TYPES.includes(type)) {
            return {valid: false, reason: 'Select a valid utility line.'};
        }
        const points = getGridLine(start, end);
        for (const point of points) {
            const tile = tileMap[point.y]?.[point.x];
            if (!tile) return {valid: false, reason: 'Utility lines must stay inside the park.'};
            if (!tile.road && !tile.path) {
                return {valid: false, reason: 'Every utility tile must run beneath a road or path.'};
            }
            if (tile.utilities?.[type]) {
                return {valid: false, reason: `The ${type} utility is already laid on part of this line.`};
            }
        }
        return {valid: true, reason: '', tiles: points};
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
        validateAccommodationPlacement,
        isPitchReadyForStatic,
        validatePitchPlacement,
        planPitchBox,
        validateUtilityLine,
        getPitchHookups,
        getGuestDailyIncome,
        findPathToAny
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    globalScope.GameRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
