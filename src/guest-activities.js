(function (globalScope) {
    const WALK_SPEED = 0.7;
    const ACTIVITY_DURATION = 18;

    function isWalkable(state, x, y, guest) {
        if (x < 0 || y < 0 || y >= state.tiles.length || x >= state.tiles[0].length) return false;
        const tile = state.tiles[y][x];
        if (!tile || !['grass', 'sand'].includes(tile.terrain) || tile.nature === 'tree') return false;
        if ((state.landmarks || []).some(landmark => landmark.blocksMovement &&
            x >= landmark.x && x < landmark.x + landmark.w &&
            y >= landmark.y && y < landmark.y + landmark.h)) return false;
        if ((state.constructions || []).some(construction => construction.blocksMovement &&
            x >= construction.footprint.x && x < construction.footprint.x + construction.footprint.w &&
            y >= construction.footprint.y && y < construction.footprint.y + construction.footprint.h)) return false;
        if ((state.caravans || []).some(caravan => {
            const footprint = globalScope.StaticCaravans?.getStaticFootprint(caravan.pitch) ||
                caravan.pitch;
            return x >= footprint.x && x < footprint.x + footprint.w &&
                y >= footprint.y && y < footprint.y + footprint.h;
        })) return false;
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
            if (globalScope.ParkServices?.ENTERTAINMENT_TYPES.includes(facility.type) &&
                !globalScope.ParkServices.canUseEntertainment(state, guest.party?.headcount || 1).valid) continue;
            for (let x = facility.x; x < facility.x + facility.w; x++) {
                destinations.push({x, y: facility.y - 1, facilityType: facility.type}, {x, y: facility.y + facility.h, facilityType: facility.type});
            }
            for (let y = facility.y; y < facility.y + facility.h; y++) {
                destinations.push({x: facility.x - 1, y, facilityType: facility.type}, {x: facility.x + facility.w, y, facilityType: facility.type});
            }
        }
        const paths = destinations.filter(tile => isWalkable(state, tile.x, tile.y, guest))
            .map(tile => ({
                tile,
                facilityType: tile.facilityType,
                path: globalScope.GameRules.findPathToAny(start, [tile],
                    (x, y) => isWalkable(state, x, y, guest))
            })).filter(candidate => candidate.path?.length);
        paths.sort((a, b) => a.path.length - b.path.length);
        return paths[0] || null;
    }

    function reachableWalk(state, guest, villageOnly = false) {
        const start = guest.position || {x: guest.pitch.x + guest.pitch.w / 2, y: guest.pitch.y + guest.pitch.h / 2};
        const candidates = [];
        for (let y = 0; y < state.tiles.length; y++) {
            for (let x = 0; x < state.tiles[y].length; x++) {
                const tile = state.tiles[y][x];
                if (!tile || (!tile.road && !tile.path)) continue;
                if (villageOnly ? x > 9 || y < 10 || y > 29 : x < 10) continue;
                if (!isWalkable(state, x, y, guest) || Math.hypot(start.x - x, start.y - y) < 3) continue;
                candidates.push({x, y});
            }
        }
        for (let attempt = 0; attempt < Math.min(12, candidates.length); attempt++) {
            const index = Math.floor(Math.random() * candidates.length);
            const [tile] = candidates.splice(index, 1);
            const path = globalScope.GameRules.findPathToAny(start, [tile],
                (x, y) => isWalkable(state, x, y, guest));
            if (path?.length) return {tile, path};
        }
        return null;
    }

    function getBedtimeNight(state) {
        const hour = Number(state.hour) + (Number(state.minute) || 0) / 60;
        const afterMidnight = hour < 5;
        return {
            day: state.day - Number(afterMidnight),
            hour: hour + (afterMidnight ? 24 : 0)
        };
    }

    function findAccommodationPath(state, guest) {
        const start = guest.position;
        const destinations = [];
        for (let y = guest.pitch.y; y < guest.pitch.y + guest.pitch.h; y++) {
            for (let x = guest.pitch.x; x < guest.pitch.x + guest.pitch.w; x++) {
                if (isWalkable(state, x, y, guest)) destinations.push({x, y});
            }
        }
        return destinations.map(tile => ({
            tile,
            path: globalScope.GameRules.findPathToAny(start, [tile],
                (x, y) => isWalkable(state, x, y, guest))
        })).filter(candidate => candidate.path !== null)
            .sort((a, b) => a.path.length - b.path.length)[0] || null;
    }

    function updateBedtime(state, guest) {
        if (!['family', 'couple'].includes(guest.party?.type) ||
            !Number.isFinite(guest.bedtimeHour)) return false;
        const currentHour = Number(state.hour) + (Number(state.minute) || 0) / 60;
        if (guest.activity === 'sleeping') {
            if (currentHour >= 7 && currentHour < 19) {
                guest.activity = 'relaxing at pitch';
                guest.activityTimer = ACTIVITY_DURATION;
                guest.destination = null;
                guest.path = [];
            }
            return true;
        }

        const night = getBedtimeNight(state);
        if (night.hour < guest.bedtimeHour || night.day === guest.lastBedtimeDay) {
            return false;
        }
        const accommodation = findAccommodationPath(state, guest);
        if (!accommodation) return false;
        guest.lastBedtimeDay = night.day;
        guest.activityFacilityType = null;
        if (!accommodation.path.length) {
            guest.activity = 'sleeping';
            guest.destination = null;
            guest.path = [];
        } else {
            guest.activity = 'returning to accommodation';
            guest.destination = accommodation.tile;
            guest.path = accommodation.path;
        }
        guest.activityTimer = 0;
        return true;
    }

    function chooseActivity(state, guest) {
        // Booked guests can take a trip into the village, stroll the park paths, or use facilities.
        const choice = Math.random();
        const villageWalk = choice < 0.28 ? reachableWalk(state, guest, true) : null;
        if (villageWalk) {
            guest.activity = 'visiting the village';
            guest.activityFacilityType = null;
            guest.destination = villageWalk.tile;
            guest.path = villageWalk.path;
            guest.activityTimer = ACTIVITY_DURATION;
            return;
        }
        const parkWalk = choice >= 0.28 && choice < 0.5
            ? reachableWalk(state, guest, false)
            : null;
        if (parkWalk) {
            guest.activity = 'strolling around the park';
            guest.activityFacilityType = null;
            guest.destination = parkWalk.tile;
            guest.path = parkWalk.path;
            guest.activityTimer = ACTIVITY_DURATION;
            return;
        }
        const facility = reachableActivity(state, guest);
        if (facility) {
            guest.activity = 'visiting facility';
            guest.activityFacilityType = facility.facilityType || null;
            guest.destination = facility.tile;
            guest.path = facility.path;
            guest.activityTimer = ACTIVITY_DURATION;
            return;
        }
        const fallbackWalk = reachableWalk(state, guest, false);
        if (fallbackWalk) {
            guest.activity = 'strolling around the park';
            guest.activityFacilityType = null;
            guest.destination = fallbackWalk.tile;
            guest.path = fallbackWalk.path;
            guest.activityTimer = ACTIVITY_DURATION;
            return;
        }
        guest.activity = 'relaxing at pitch';
        guest.activityFacilityType = null;
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
            if (updateBedtime(state, guest)) {
                if (guest.activity === 'sleeping') continue;
            }
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
                const completed = guest.activity;
                if (completed === 'returning to accommodation') {
                    guest.activity = 'sleeping';
                } else if (completed === 'visiting facility') {
                    guest.facilityVisits = (guest.facilityVisits || 0) + 1;
                    guest.activity = 'using facility';
                } else if (completed === 'visiting the village') {
                    guest.activity = 'looking around the village';
                } else if (completed === 'strolling around the park') {
                    guest.activity = 'enjoying a walk';
                }
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

    const api = {
        isWalkable,
        updateBedtime,
        updateGuestActivities,
        calculateGuestExperience,
        updateGuestSatisfaction
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.GuestActivities = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
