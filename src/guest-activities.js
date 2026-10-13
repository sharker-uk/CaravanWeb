(function (globalScope) {
    const WALK_SPEED = 0.7;
    const ACTIVITY_DURATION = 18;

    function isWalkable(state, x, y, guest) {
        if (x < 0 || y < 0 || y >= state.tiles.length || x >= state.tiles[0].length) return false;
        const tile = state.tiles[y][x];
        if (!tile || tile.terrain !== 'grass' || tile.nature === 'tree') return false;
        if ((state.caravans || []).some(caravan =>
            x >= caravan.pitch.x && x < caravan.pitch.x + caravan.pitch.w &&
            y >= caravan.pitch.y && y < caravan.pitch.y + caravan.pitch.h)) return false;
        if ((state.guests || []).some(other => other !== guest &&
            Math.floor(other.position?.x ?? Number.NaN) === x &&
            Math.floor(other.position?.y ?? Number.NaN) === y)) return false;
        if ((state.facilities || []).some(facility =>
            x >= facility.x && x < facility.x + facility.w &&
            y >= facility.y && y < facility.y + facility.h)) return false;
        return true;
    }

    function reachableActivity(state, guest) {
        const start = guest.position || {x: guest.pitch.x + guest.pitch.w / 2, y: guest.pitch.y + guest.pitch.h / 2};
        const destinations = [];
        const preferences = guest.party?.preferences?.preferredFacilities;
        const facilities = (state.facilities || []).filter(facility =>
            facility.isOperational !== false &&
            (!Array.isArray(preferences) || !preferences.length || preferences.includes(facility.type))
        );
        for (const facility of facilities) {
            for (let x = facility.x; x < facility.x + facility.w; x++) {
                destinations.push({x, y: facility.y - 1}, {x, y: facility.y + facility.h});
            }
            for (let y = facility.y; y < facility.y + facility.h; y++) {
                destinations.push({x: facility.x - 1, y}, {x: facility.x + facility.w, y});
            }
        }
        const paths = destinations.filter(tile => isWalkable(state, tile.x, tile.y, guest))
            .map(tile => ({
                tile,
                path: globalScope.GameRules.findPathToAny(start, [tile],
                    (x, y) => isWalkable(state, x, y, guest))
            })).filter(candidate => candidate.path?.length);
        paths.sort((a, b) => a.path.length - b.path.length);
        return paths[0] || null;
    }

    function chooseActivity(state, guest) {
        const activity = reachableActivity(state, guest);
        if (activity) {
            guest.activity = 'visiting facility';
            guest.destination = activity.tile;
            guest.path = activity.path;
            guest.activityTimer = ACTIVITY_DURATION;
            return;
        }
        guest.activity = 'relaxing at pitch';
        guest.destination = null;
        guest.path = [];
        guest.activityTimer = ACTIVITY_DURATION;
    }

    function updateGuestActivities(state, elapsedSeconds) {
        if (!state || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
        for (const guest of state.guests || []) {
            guest.position ||= {
                x: guest.pitch.x + guest.pitch.w / 2,
                y: guest.pitch.y + guest.pitch.h / 2
            };
            guest.path ||= [];
            guest.activityTimer = Math.max(0, (guest.activityTimer || 0) - elapsedSeconds);
            if (!guest.path.length && guest.activityTimer <= 0) chooseActivity(state, guest);
            let distanceLeft = WALK_SPEED * elapsedSeconds;
            while (distanceLeft > 0 && guest.path.length) {
                const next = guest.path[0];
                if (!isWalkable(state, Math.floor(next.x), Math.floor(next.y), guest)) {
                    guest.routeFailures = (guest.routeFailures || 0) + 1;
                    guest.path = [];
                    guest.destination = null;
                    guest.activity = 'waiting for a clear route';
                    guest.activityTimer = 0;
                    break;
                }
                const dx = next.x - guest.position.x;
                const dy = next.y - guest.position.y;
                const distance = Math.hypot(dx, dy);
                if (distance <= distanceLeft) {
                    guest.position = {x: next.x, y: next.y};
                    guest.path.shift();
                    distanceLeft -= distance;
                } else {
                    guest.position.x += dx / distance * distanceLeft;
                    guest.position.y += dy / distance * distanceLeft;
                    distanceLeft = 0;
                }
            }
            if (!guest.path.length && guest.destination) {
                guest.facilityVisits = (guest.facilityVisits || 0) + 1;
                guest.activity = guest.activity === 'visiting facility' ? 'using facility' : 'relaxing';
                guest.destination = null;
                guest.activityTimer = ACTIVITY_DURATION;
            }
        }
    }

    function calculateGuestExperience(state, guest) {
        const pitch = guest.pitch;
        const hooks = globalScope.GameRules.getPitchHookups(pitch, state.tiles);
        const essentialUtilities = guest.accommodation === 'static'
            ? ['gas', 'water', 'electricity', 'waste']
            : guest.accommodation === 'towed' ? ['electricity', 'water'] : [];
        const available = essentialUtilities.filter(type => hooks[type]).length;
        const utilityScore = essentialUtilities.length
            ? available / essentialUtilities.length * 100
            : 100;
        const facilityScore = Math.min((guest.facilityVisits || 0) * 15, 60);
        const caravan = (state.caravans || []).find(item => item.pitch === pitch);
        const accommodationQuality = {tent: 72, towed: 78, static: 88};
        let accommodationScore = caravan
            ? (caravan.isBroken ? 15 : Math.min(caravan.condition, 100))
            : accommodationQuality[guest.accommodation] || 65;
        if (state.weather === 'Rain' && guest.accommodation === 'tent') accommodationScore -= 20;
        accommodationScore = Math.max(0, accommodationScore - (guest.routeFailures || 0) * 5);
        const partyScore = Number.isFinite(guest.party?.needs?.satisfaction)
            ? guest.party.needs.satisfaction
            : 75;
        const score = Math.round(utilityScore * 0.4 + facilityScore * 0.2 +
            accommodationScore * 0.3 + partyScore * 0.1);
        guest.experienceScore = score;
        guest.lastUtilityReliability = utilityScore;
        return score;
    }

    function updateGuestSatisfaction(state) {
        if (!state) return;
        const guests = state.guests || [];
        const guestExperience = guests.length
            ? guests.reduce((sum, guest) => sum + calculateGuestExperience(state, guest), 0) / guests.length
            : 60;
        const brokenPenalty = (state.caravans || []).some(caravan => caravan.isBroken) ? 12 : 0;
        const target = Math.max(0, Math.min(100, guestExperience - brokenPenalty));
        state.satisfaction += (target - state.satisfaction) * 0.02;
        state.rating = Math.max(0, Math.min(5, 1 + state.satisfaction / 25));
    }

    const api = {updateGuestActivities, calculateGuestExperience, updateGuestSatisfaction};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.GuestActivities = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
