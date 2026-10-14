(function (globalScope) {
    const LOCAL_SERVICE_RADIUS = 8;
    const UTILITY_TYPES = ['gas', 'water', 'electricity', 'waste'];
    const ENTERTAINMENT_TYPES = ['pub', 'arcade', 'entertainment_space', 'pool', 'activity_centre', 'entertainment_hub'];

    function isRoute(tile) { return Boolean(tile && (tile.road || tile.path)); }

    // A utility only works if its laid tiles form a contiguous route to a park-edge
    // connection, which represents the incoming mains feed in this prototype.
    function getConnectedUtilityTiles(tileMap = [], type) {
        if (!UTILITY_TYPES.includes(type) || !Array.isArray(tileMap) || !tileMap.length) return new Set();
        const height = tileMap.length;
        const width = Math.max(0, ...tileMap.map(row => Array.isArray(row) ? row.length : 0));
        const queue = [];
        const connected = new Set();
        const add = (x, y) => {
            const key = `${x},${y}`;
            const tile = tileMap[y]?.[x];
            if (!tile || !isRoute(tile) || !tile.utilities?.[type] || connected.has(key)) return;
            connected.add(key);
            queue.push({x, y});
        };
        for (let x = 0; x < width; x++) { add(x, 0); add(x, height - 1); }
        for (let y = 0; y < height; y++) { add(0, y); add(width - 1, y); }
        for (let i = 0; i < queue.length; i++) {
            const {x, y} = queue[i];
            [[0,-1],[1,0],[0,1],[-1,0]].forEach(([dx,dy]) => add(x + dx, y + dy));
        }
        return connected;
    }

    function getPitchHookups(pitch, tileMap = []) {
        const hookups = Object.fromEntries(UTILITY_TYPES.map(type => [type, false]));
        if (!pitch) return hookups;
        const connected = Object.fromEntries(UTILITY_TYPES.map(type =>
            [type, getConnectedUtilityTiles(tileMap, type)]
        ));
        const adjacent = [];
        for (let x = pitch.x; x < pitch.x + pitch.w; x++) {
            adjacent.push({x, y: pitch.y - 1}, {x, y: pitch.y + pitch.h});
        }
        for (let y = pitch.y; y < pitch.y + pitch.h; y++) {
            adjacent.push({x: pitch.x - 1, y}, {x: pitch.x + pitch.w, y});
        }
        adjacent.forEach(({x,y}) => {
            const tile = tileMap[y]?.[x];
            if (!isRoute(tile)) return;
            UTILITY_TYPES.forEach(type => {
                if (connected[type].has(`${x},${y}`)) hookups[type] = true;
            });
        });
        return hookups;
    }

    function getFacilityAccessPoint(facility) {
        return {x: facility.x + facility.w / 2, y: facility.y + facility.h / 2};
    }

    function getDistanceToPitchBoundary(point, pitch) {
        const left = pitch.x;
        const right = pitch.x + pitch.w;
        const top = pitch.y;
        const bottom = pitch.y + pitch.h;
        const insidePitch = point.x >= left && point.x <= right &&
            point.y >= top && point.y <= bottom;
        if (insidePitch) {
            return Math.min(point.x - left, right - point.x, point.y - top, bottom - point.y);
        }

        const nearestX = Math.max(left, Math.min(point.x, right));
        const nearestY = Math.max(top, Math.min(point.y, bottom));
        return Math.abs(point.x - nearestX) + Math.abs(point.y - nearestY);
    }

    function getServiceCoverage(facility, pitch, radius = LOCAL_SERVICE_RADIUS) {
        if (!facility || !pitch || facility.isOperational === false) return false;
        return getDistanceToPitchBoundary(getFacilityAccessPoint(facility), pitch) <= radius;
    }

    function getRequiredFacilities(accommodation) {
        // Toilets are essential for every stay; showers improve the stay but are optional.
        return ['toilets'];
    }

    function getPitchServiceCheck(state, pitch, accommodation, headcount = 1) {
        const missing = getRequiredFacilities(accommodation).filter(type => {
            const candidates = (state?.facilities || []).filter(f =>
                f.type === type && f.isOperational !== false && getServiceCoverage(f, pitch)
            );
            return !candidates.some(f => Math.max(0, Number(f.capacity) || 0) >= headcount);
        });
        return {valid: missing.length === 0, missing};
    }

    function getMaximumStayDays(state, pitch, accommodation, headcount = 1) {
        if (accommodation !== 'tent' && accommodation !== 'towed') return 14;
        const hasShowers = (state?.facilities || []).some(facility =>
            facility.type === 'showers' && getServiceCoverage(facility, pitch) &&
            Math.max(0, Number(facility.capacity) || 0) >= headcount
        );
        if (!hasShowers) return 5;
        if (accommodation === 'tent') return 14;
        const hookups = getPitchHookups(pitch, state?.tiles || []);
        return hookups.water && hookups.electricity ? 14 : 7;
    }

    function getEntertainmentCapacity(state) {
        return (state?.facilities || []).filter(f =>
            ENTERTAINMENT_TYPES.includes(f.type) && f.isOperational !== false
        ).reduce((sum, f) => sum + Math.max(0, Number(f.entertainmentCapacity ?? f.capacity) || 0), 0);
    }

    function getEntertainmentUsage(state) {
        return (state?.guests || []).filter(g =>
            ['visiting facility', 'using facility'].includes(g.activity) && ENTERTAINMENT_TYPES.includes(g.activityFacilityType)
        ).reduce((sum, g) => sum + Math.max(1, Number(g.party?.headcount) || 1), 0);
    }

    function canUseEntertainment(state, headcount = 1) {
        const capacity = getEntertainmentCapacity(state);
        const occupied = getEntertainmentUsage(state);
        return {valid: capacity > 0 && occupied + Math.max(1, headcount) <= capacity,
            capacity, occupied, available: Math.max(0, capacity - occupied)};
    }

    function getUtilityOverlay(tileMap = [], type) {
        const connected = getConnectedUtilityTiles(tileMap, type);
        return {connected, disconnected: new Set()};
    }

    const api = {
        LOCAL_SERVICE_RADIUS, UTILITY_TYPES, ENTERTAINMENT_TYPES,
        getConnectedUtilityTiles, getPitchHookups, getServiceCoverage,
        getPitchServiceCheck, getMaximumStayDays, getEntertainmentCapacity, getEntertainmentUsage,
        canUseEntertainment, getUtilityOverlay
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.ParkServices = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
