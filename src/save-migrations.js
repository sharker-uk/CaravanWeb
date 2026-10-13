(function (globalScope) {
    const CURRENT_SAVE_SCHEMA = 6;
    const UTILITY_TYPES = ['gas', 'water', 'electricity', 'waste'];

    function createEmptyUtilities() {
        return {gas: false, water: false, electricity: false, waste: false};
    }

    function normalizeTile(tile) {
        if (!tile || typeof tile !== 'object') {
            return {terrain: 'grass', nature: null, road: false, path: false, utilities: createEmptyUtilities()};
        }

        if (tile.terrain !== undefined) {
            return {
                terrain: ['grass', 'water'].includes(tile.terrain) ? tile.terrain : 'grass',
                nature: tile.nature === 'tree' || tile.nature === 'debris' ? tile.nature : null,
                road: Boolean(tile.road),
                path: Boolean(tile.path),
                utilities: Object.fromEntries(UTILITY_TYPES.map(type => [type, Boolean(tile.utilities?.[type])]))
            };
        }

        if (tile.type === 'water') {
            return {terrain: 'water', nature: null, road: false, path: false, utilities: createEmptyUtilities()};
        }

        const road = tile.type === 'road';
        const path = tile.type === 'path';
        return {
            terrain: road || path ? 'grass' : (tile.type === 'water' ? 'water' : 'grass'),
            nature: null,
            road,
            path,
            utilities: Object.fromEntries(UTILITY_TYPES.map(type => [type, Boolean(tile.utilities?.[type])]))
        };
    }

    function normalizePitches(pitches) {
        if (!Array.isArray(pitches)) return [];
        return pitches.map(pitch => {
            if (!pitch || typeof pitch !== 'object') return null;
            const normalized = {
                x: Number(pitch.x),
                y: Number(pitch.y),
                w: Number(pitch.w),
                h: Number(pitch.h),
                type: pitch.type === 'gravel' ? 'gravel' : 'grass',
                occupied: Boolean(pitch.occupied)
            };
            if (!Number.isFinite(normalized.x) || !Number.isFinite(normalized.y) ||
                !Number.isFinite(normalized.w) || !Number.isFinite(normalized.h)) {
                return null;
            }
            return normalized;
        }).filter(Boolean);
    }

    function normalizeGuests(guests) {
        if (!Array.isArray(guests)) return [];
        return guests.map(guest => {
            if (!guest || typeof guest !== 'object') return null;
            return {
                ...guest,
                pitchIndex: Number.isInteger(guest.pitchIndex) ? guest.pitchIndex : 0,
                accommodation: typeof guest.accommodation === 'string' ? guest.accommodation : 'tent',
                ratingAtArrival: Number.isFinite(guest.ratingAtArrival) ? guest.ratingAtArrival : 1,
                dailyIncome: Number.isFinite(guest.dailyIncome) ? guest.dailyIncome : 0,
                totalIncome: Number.isFinite(guest.totalIncome) ? guest.totalIncome : 0,
                stayDaysRemaining: Number.isInteger(guest.stayDaysRemaining)
                    ? guest.stayDaysRemaining
                    : 1,
                position: guest.position && Number.isFinite(guest.position.x) &&
                    Number.isFinite(guest.position.y) ? guest.position : null,
                path: Array.isArray(guest.path) ? guest.path.filter(point =>
                    point && Number.isFinite(point.x) && Number.isFinite(point.y)) : [],
                destination: guest.destination && Number.isFinite(guest.destination.x) &&
                    Number.isFinite(guest.destination.y) ? guest.destination : null,
                activity: typeof guest.activity === 'string' ? guest.activity : 'relaxing at pitch',
                activityTimer: Number.isFinite(guest.activityTimer) ? guest.activityTimer : 0,
                facilityVisits: Number.isInteger(guest.facilityVisits)
                    ? Math.max(0, guest.facilityVisits)
                    : 0,
                routeFailures: Number.isInteger(guest.routeFailures)
                    ? Math.max(0, guest.routeFailures)
                    : 0,
                experienceScore: Number.isFinite(guest.experienceScore) ? guest.experienceScore : 60,
                lastUtilityReliability: Number.isFinite(guest.lastUtilityReliability)
                    ? guest.lastUtilityReliability
                    : 100
            };
        }).filter(Boolean);
    }

    function normalizeTransactions(transactions) {
        if (!Array.isArray(transactions)) return [];
        return transactions.filter(transaction => transaction &&
            Number.isFinite(transaction.day) && Number.isFinite(transaction.amount) &&
            typeof transaction.category === 'string' &&
            typeof transaction.description === 'string' &&
            Number.isFinite(transaction.balance)).slice(-1000);
    }

    function normalizeCaravans(caravans) {
        if (!Array.isArray(caravans)) return [];
        return caravans.map(caravan => {
            if (!caravan || typeof caravan !== 'object') return null;
            return {
                ...caravan,
                tier: caravan.tier === 2 ? 2 : 1,
                pitchIndex: Number.isInteger(caravan.pitchIndex) ? caravan.pitchIndex : 0,
                condition: Number.isFinite(caravan.condition) ? caravan.condition : 100,
                isBroken: Boolean(caravan.isBroken),
                hasDecking: Boolean(caravan.hasDecking),
                hasSkirting: Boolean(caravan.hasSkirting)
            };
        }).filter(Boolean);
    }

    function normalizeFacilities(facilities) {
        if (!Array.isArray(facilities)) return [];
        return facilities.map(facility => {
            if (!facility || typeof facility !== 'object') return null;
            return {
                x: Number(facility.x),
                y: Number(facility.y),
                w: Number(facility.w),
                h: Number(facility.h),
                type: typeof facility.type === 'string' ? facility.type : 'shop'
            };
        }).filter(facility => facility && Number.isFinite(facility.x) && Number.isFinite(facility.y) &&
            Number.isFinite(facility.w) && Number.isFinite(facility.h));
    }

    function migrateSave(saveData) {
        if (!saveData || typeof saveData !== 'object') return null;

        const normalizedTiles = Array.isArray(saveData.tiles)
            ? saveData.tiles.map(row => Array.isArray(row) ? row.map(normalizeTile) : [])
            : [];

        const migrated = {
            ...saveData,
            schemaVersion: CURRENT_SAVE_SCHEMA,
            cash: Number.isFinite(saveData.cash) ? saveData.cash : 2000,
            initialBalance: Number.isFinite(saveData.initialBalance)
                ? saveData.initialBalance
                : Number.isFinite(saveData.cash) ? saveData.cash : 2000,
            transactions: normalizeTransactions(saveData.transactions),
            guestArrivalProgress: Number.isFinite(saveData.guestArrivalProgress)
                ? Math.max(0, saveData.guestArrivalProgress)
                : 0,
            dailyGuestArrivals: Number.isInteger(saveData.dailyGuestArrivals)
                ? Math.max(0, saveData.dailyGuestArrivals)
                : 0,
            tiles: normalizedTiles,
            pitches: normalizePitches(saveData.pitches),
            guests: normalizeGuests(saveData.guests),
            caravans: normalizeCaravans(saveData.caravans),
            facilities: normalizeFacilities(saveData.facilities),
            handymen: Number.isFinite(saveData.handymen) ? saveData.handymen : 0,
            day: Number.isFinite(saveData.day) ? saveData.day : 1,
            hour: Number.isFinite(saveData.hour) ? saveData.hour : 9,
            minute: Number.isFinite(saveData.minute) ? saveData.minute : 0,
            satisfaction: Number.isFinite(saveData.satisfaction) ? saveData.satisfaction : 60,
            rating: Number.isFinite(saveData.rating) ? saveData.rating : 1,
            weather: typeof saveData.weather === 'string' ? saveData.weather : 'Sunny',
            dayLengthMinutes: Number.isFinite(saveData.dayLengthMinutes)
                ? Math.min(Math.max(Math.round(saveData.dayLengthMinutes), 3), 60)
                : 10,
            simulationSpeed: Number.isFinite(saveData.simulationSpeed)
                ? Math.max(1, Number(saveData.simulationSpeed))
                : 1,
            isPaused: Boolean(saveData.isPaused),
            camera: saveData.camera && typeof saveData.camera === 'object'
                ? { x: Number(saveData.camera.x) || 100, y: Number(saveData.camera.y) || 100, zoom: Number(saveData.camera.zoom) || 3 }
                : { x: 100, y: 100, zoom: 3 },
            player: saveData.player && typeof saveData.player === 'object'
                ? { x: Number(saveData.player.x) || 5.5, y: Number(saveData.player.y) || 10.5 }
                : { x: 5.5, y: 10.5 }
        };

        return migrated;
    }

    const api = {
        CURRENT_SAVE_SCHEMA,
        createEmptyUtilities,
        normalizeTile,
        normalizeTransactions,
        migrateSave
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    globalScope.SaveMigrations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
