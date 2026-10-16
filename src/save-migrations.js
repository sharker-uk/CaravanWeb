(function (globalScope) {
    const CURRENT_SAVE_SCHEMA = 12;
    const UTILITY_TYPES = ['gas', 'water', 'electricity', 'waste'];
    const facilityApi = globalScope.FacilityOperations ||
        (typeof require === 'function' ? require('./facility-operations.js') : null);
    const staticCaravansApi = globalScope.StaticCaravans ||
        (typeof require === 'function' ? require('./static-caravans.js') : null);

    function createEmptyUtilities() {
        return {gas: false, water: false, electricity: false, waste: false};
    }

    function normalizeTile(tile) {
        if (!tile || typeof tile !== 'object') {
            return {terrain: 'grass', nature: null, road: false, path: false, utilities: createEmptyUtilities()};
        }

        if (tile.terrain !== undefined) {
            return {
                terrain: ['grass', 'water', 'sand'].includes(tile.terrain) ? tile.terrain : 'grass',
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
            const generatedPitchId = `pitch-${pitch.x}-${pitch.y}-${pitch.w}-${pitch.h}`
                .replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64);
            const stablePitchId = typeof pitch.id === 'string' &&
                /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(pitch.id)
                ? pitch.id
                : generatedPitchId;
            const normalized = {
                id: stablePitchId,
                x: Number(pitch.x),
                y: Number(pitch.y),
                w: Number(pitch.w),
                h: Number(pitch.h),
                type: pitch.type === 'gravel' ? 'gravel' : 'grass',
                occupied: Boolean(pitch.occupied),
                accessories: Array.isArray(pitch.accessories)
                    ? pitch.accessories.filter(item => item &&
                        Object.hasOwn(staticCaravansApi.ACCESSORIES, item.type) &&
                        Number.isInteger(item.x) && Number.isInteger(item.y) &&
                        Number.isInteger(item.w) && Number.isInteger(item.h))
                        .map((item, index) => ({
                            ...item,
                            id: typeof item.id === 'string' ? item.id : `accessory-${stablePitchId}-${index + 1}`,
                            condition: Number.isFinite(item.condition)
                                ? Math.min(100, Math.max(0, item.condition)) : 100,
                            installedAtMinutes: Number.isFinite(item.installedAtMinutes)
                                ? Math.max(0, item.installedAtMinutes) : 0
                        }))
                    : [],
                decking: pitch.decking && typeof pitch.decking === 'object'
                    ? {
                        ...pitch.decking,
                        id: typeof pitch.decking.id === 'string' ? pitch.decking.id :
                            `decking-${stablePitchId}`,
                        installedAtMinutes: Number.isFinite(pitch.decking.installedAtMinutes)
                            ? Math.max(0, pitch.decking.installedAtMinutes) : 0,
                        condition: Number.isFinite(pitch.decking.condition)
                            ? Math.min(100, Math.max(0, pitch.decking.condition)) : 100,
                        operational: pitch.decking.operational !== false
                    }
                    : null
            };
            if (!Number.isFinite(normalized.x) || !Number.isFinite(normalized.y) ||
                !Number.isFinite(normalized.w) || !Number.isFinite(normalized.h)) {
                return null;
            }
            return normalized;
        }).filter(Boolean);
    }

    function normalizeGuests(guests, currentDay = 1) {
        if (!Array.isArray(guests)) return [];
        return guests.map(guest => {
            if (!guest || typeof guest !== 'object') return null;
            const stayDaysRemaining = Number.isInteger(guest.stayDaysRemaining) &&
                guest.stayDaysRemaining > 0 ? guest.stayDaysRemaining : 1;
            const adults = Number.isInteger(guest.party?.adults) && guest.party.adults > 0
                ? guest.party.adults
                : 1;
            const children = Number.isInteger(guest.party?.children) && guest.party.children >= 0
                ? guest.party.children
                : 0;
            const partyType = ['solo', 'couple', 'family', 'friends'].includes(guest.party?.type)
                ? guest.party.type
                : 'solo';
            const bookedDay = Number.isInteger(guest.booking?.bookedDay)
                ? guest.booking.bookedDay
                : currentDay;
            const arrivalDay = Number.isInteger(guest.booking?.arrivalDay)
                ? guest.booking.arrivalDay
                : currentDay;
            const party = {
                ...guest.party,
                type: partyType,
                adults,
                children,
                headcount: adults + children,
                preferences: {
                    preferredFacilities: Array.isArray(guest.party?.preferences?.preferredFacilities)
                        ? guest.party.preferences.preferredFacilities.filter(type => typeof type === 'string')
                        : partyType === 'family' ? ['playground', 'shop', 'toilets', 'showers'] : ['shop', 'toilets', 'showers'],
                    toiletIntervalHours: Number.isInteger(guest.party?.preferences?.toiletIntervalHours)
                        ? guest.party.preferences.toiletIntervalHours
                        : partyType === 'family' ? 3 : 4,
                    showerVisitIntervalDays: Number.isInteger(
                        guest.party?.preferences?.showerVisitIntervalDays
                    ) ? Math.max(0, guest.party.preferences.showerVisitIntervalDays)
                        : guest.party?.preferences?.showerDaily === false || partyType === 'solo' ? 0 : 1,
                    shopIntervalHours: Number.isInteger(guest.party?.preferences?.shopIntervalHours)
                        ? guest.party.preferences.shopIntervalHours
                        : 8,
                    laundryEveryDays: Number.isInteger(guest.party?.preferences?.laundryEveryDays)
                        ? guest.party.preferences.laundryEveryDays
                        : 5
                },
                needs: {
                    toiletVisits: Number.isInteger(guest.party?.needs?.toiletVisits)
                        ? Math.max(0, guest.party.needs.toiletVisits) : 0,
                    showerVisits: Number.isInteger(guest.party?.needs?.showerVisits)
                        ? Math.max(0, guest.party.needs.showerVisits) : 0,
                    missedToiletVisits: Number.isInteger(guest.party?.needs?.missedToiletVisits)
                        ? Math.max(0, guest.party.needs.missedToiletVisits) : 0,
                    missedShowerVisits: Number.isInteger(guest.party?.needs?.missedShowerVisits)
                        ? Math.max(0, guest.party.needs.missedShowerVisits) : 0,
                    shoppingTrips: Number.isInteger(guest.party?.needs?.shoppingTrips)
                        ? Math.max(0, guest.party.needs.shoppingTrips) : 0,
                    laundryTrips: Number.isInteger(guest.party?.needs?.laundryTrips)
                        ? Math.max(0, guest.party.needs.laundryTrips) : 0,
                    satisfaction: Number.isFinite(guest.party?.needs?.satisfaction)
                        ? Math.min(100, Math.max(0, guest.party.needs.satisfaction)) : 75
                }
            };
            return {
                ...guest,
                party,
                booking: {
                    ...guest.booking,
                    id: typeof guest.booking?.id === 'string'
                        ? guest.booking.id
                        : `legacy-${bookedDay}-${guest.pitchIndex ?? 0}`,
                    bookedDay,
                    arrivalDay,
                    departureDay: Number.isInteger(guest.booking?.departureDay)
                        ? guest.booking.departureDay
                        : arrivalDay + stayDaysRemaining,
                    requiredFacilities: Array.isArray(guest.booking?.requiredFacilities)
                        ? guest.booking.requiredFacilities.filter(type => typeof type === 'string')
                        : guest.accommodation === 'static' ? ['toilets'] : ['toilets', 'showers'],
                    status: typeof guest.booking?.status === 'string'
                        ? guest.booking.status
                        : 'checked-in',
                    source: typeof guest.booking?.source === 'string'
                        ? guest.booking.source
                        : 'legacy-save'
                },
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
                lastFacilityUpdate: Number.isInteger(guest.lastFacilityUpdate)
                    ? guest.lastFacilityUpdate
                    : -1,
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

    function normalizeCaravans(caravans, pitches, currentDay) {
        if (!Array.isArray(caravans)) return [];
        return caravans.map((caravan, index) => {
            if (!caravan || typeof caravan !== 'object') return null;
            const stablePitchIndex = typeof caravan.pitchId === 'string'
                ? pitches.findIndex(pitch => pitch.id === caravan.pitchId)
                : -1;
            const pitchIndex = stablePitchIndex >= 0
                ? stablePitchIndex
                : Number.isInteger(caravan.pitchIndex) ? caravan.pitchIndex : index;
            const pitch = pitches[pitchIndex];
            if (!pitch) return null;
            const normalized = staticCaravansApi.normalizeLegacyVan(caravan, pitch.id);
            normalized.id ||= `legacy-static-${pitch.id}`;
            normalized.pitchIndex = pitchIndex;
            if (caravan.hasDecking && !pitch.decking) {
                const installedAtMinutes = Number.isFinite(caravan.deckingInstalledAtMinutes)
                    ? Math.max(0, caravan.deckingInstalledAtMinutes) : 0;
                const ageDays = Math.max(0, (((currentDay - 1) * 1440) - installedAtMinutes) / 1440);
                pitch.decking = {
                    id: `legacy-decking-${pitch.id}`,
                    installedAtMinutes,
                    condition: Math.max(0, (1 - ageDays / staticCaravansApi.DECKING.lifespanDays) * 100),
                    operational: ageDays < staticCaravansApi.DECKING.lifespanDays
                };
            }
            normalized.hasDecking = Boolean(pitch.decking);
            return normalized;
        }).filter(Boolean);
    }

    function normalizeStaticDeliveries(deliveries, pitches) {
        if (!Array.isArray(deliveries)) return [];
        return deliveries.filter(order => order && typeof order.id === 'string' &&
            typeof order.vanId === 'string' && typeof order.pitchId === 'string' &&
            staticCaravansApi.getModel(order.modelId) &&
            Number.isFinite(order.purchasePrice) && Number.isFinite(order.purchasedAtMinutes) &&
            Number.isFinite(order.deliveryAtMinutes) &&
            pitches.some(pitch => pitch.id === order.pitchId))
            .map(order => ({
                ...order,
                tradeInVanId: typeof order.tradeInVanId === 'string' ? order.tradeInVanId : null,
                tradeInValue: Number.isFinite(order.tradeInValue) ? Math.max(0, order.tradeInValue) : 0
            }));
    }

    function normalizeFacilities(facilities) {
        if (!Array.isArray(facilities)) return [];
        return facilities.map(facility => {
            if (!facility || typeof facility !== 'object') return null;
            const type = typeof facility.type === 'string' &&
                /^[a-z][a-z0-9_]{0,63}$/.test(facility.type) &&
                (!facilityApi?.FACILITY_DEFAULTS ||
                    Object.hasOwn(facilityApi.FACILITY_DEFAULTS, facility.type))
                ? facility.type : 'shop';
            const defaults = facilityApi?.getFacilityDefaults(type) ||
                {capacity: type === 'toilets' ? 16 : 10, hourlyCost: 1};
            return {
                ...facility,
                x: Number(facility.x),
                y: Number(facility.y),
                w: Number(facility.w),
                h: Number(facility.h),
                type,
                capacity: Number.isFinite(facility.capacity) && facility.capacity >= 0
                    ? facility.capacity
                    : defaults.capacity,
                entertainmentCapacity: Number.isFinite(facility.entertainmentCapacity) && facility.entertainmentCapacity >= 0
                    ? facility.entertainmentCapacity
                    : (defaults.entertainmentCapacity ?? 0),
                hourlyCost: type === 'toilets' ? 0 :
                    Number.isFinite(facility.hourlyCost) && facility.hourlyCost >= 0
                        ? facility.hourlyCost
                        : defaults.hourlyCost,
                cleanliness: Number.isFinite(facility.cleanliness)
                    ? Math.min(100, Math.max(0, facility.cleanliness)) : 100,
                wear: Number.isFinite(facility.wear)
                    ? Math.min(100, Math.max(0, facility.wear)) : 100,
                maintenanceClosed: Boolean(facility.maintenanceClosed) ||
                    (type === 'toilets' &&
                        ((Number.isFinite(facility.cleanliness) ? facility.cleanliness : 100) <= 0 ||
                         (Number.isFinite(facility.wear) ? facility.wear : 100) <= 0)),
                costPerUse: Number.isFinite(facility.costPerUse) && facility.costPerUse >= 0
                    ? facility.costPerUse
                    : defaults.costPerUse || 0,
                isOperational: facility.isOperational !== false &&
                    !(type === 'toilets' &&
                        ((Number.isFinite(facility.cleanliness) ? facility.cleanliness : 100) <= 0 ||
                         (Number.isFinite(facility.wear) ? facility.wear : 100) <= 0)),
                hourlyUsage: Number.isFinite(facility.hourlyUsage) && facility.hourlyUsage >= 0
                    ? facility.hourlyUsage
                    : 0,
                usageDay: Number.isInteger(facility.usageDay) ? facility.usageDay : null,
                usageHour: Number.isInteger(facility.usageHour) ? facility.usageHour : null
            };
        }).filter(facility => facility && Number.isFinite(facility.x) && Number.isFinite(facility.y) &&
            Number.isFinite(facility.w) && Number.isFinite(facility.h));
    }

    function migrateSave(saveData) {
        if (!saveData || typeof saveData !== 'object') return null;
        const currentDay = Number.isFinite(saveData.day) ? saveData.day : 1;

        const normalizedTiles = Array.isArray(saveData.tiles)
            ? saveData.tiles.map(row => Array.isArray(row) ? row.map(normalizeTile) : [])
            : [];
        const legacyTrees = (Array.isArray(saveData.facilities) ? saveData.facilities : [])
            .filter(facility => facility?.type === 'tree');
        legacyTrees.forEach(tree => {
            if (!Number.isInteger(tree.x) || !Number.isInteger(tree.y)) return;
            const tile = normalizedTiles[tree.y]?.[tree.x];
            if (tile?.terrain === 'grass') tile.nature = 'tree';
        });
        const facilitiesWithoutLegacyTrees =
            (Array.isArray(saveData.facilities) ? saveData.facilities : [])
                .filter(facility => facility?.type !== 'tree');
        const pitches = normalizePitches(saveData.pitches);
        const caravans = normalizeCaravans(saveData.caravans, pitches, currentDay);
        const staticDeliveries = normalizeStaticDeliveries(saveData.staticDeliveries, pitches);
        staticDeliveries.forEach(order => {
            const pitch = pitches.find(item => item.id === order.pitchId);
            if (pitch && !pitch.deliveryReserved) pitch.deliveryReserved = order.id;
        });
        const inferredAssetSequence = [...caravans, ...staticDeliveries]
            .flatMap(asset => [asset.id, asset.vanId])
            .map(id => Number((id || '').match(/-(\d+)$/)?.[1]) || 0)
            .reduce((max, value) => Math.max(max, value), 0);

        const migrated = {
            ...saveData,
            schemaVersion: CURRENT_SAVE_SCHEMA,
            cash: Number.isFinite(saveData.cash) ? saveData.cash : 1500,
            wood: Number.isFinite(saveData.wood) ? Math.max(0, Math.floor(saveData.wood)) : 0,
            tools: {
                axe: true,
                shovel: Boolean(saveData.tools?.shovel)
            },
            initialBalance: Number.isFinite(saveData.initialBalance)
                ? saveData.initialBalance
                : Number.isFinite(saveData.cash) ? saveData.cash : 1500,
            transactions: normalizeTransactions(saveData.transactions),
            guestArrivalProgress: Number.isFinite(saveData.guestArrivalProgress)
                ? Math.max(0, saveData.guestArrivalProgress)
                : 0,
            dailyGuestArrivals: Number.isInteger(saveData.dailyGuestArrivals)
                ? Math.max(0, saveData.dailyGuestArrivals)
                : 0,
            tiles: normalizedTiles,
            pitches,
            guests: normalizeGuests(saveData.guests, currentDay),
            caravans,
            staticDeliveries,
            accessoryInventory: Object.fromEntries(Object.keys(staticCaravansApi.ACCESSORIES)
                .map(id => [id, Number.isInteger(saveData.accessoryInventory?.[id])
                    ? Math.max(0, saveData.accessoryInventory[id]) : 0])),
            staticAssetSequence: Number.isInteger(saveData.staticAssetSequence)
                ? Math.max(inferredAssetSequence, saveData.staticAssetSequence)
                : inferredAssetSequence,
            facilities: normalizeFacilities(facilitiesWithoutLegacyTrees),
            overlayMode: ['none', 'services', 'utilities', 'entertainment'].includes(saveData.overlayMode)
                ? saveData.overlayMode : 'none',
            landmarks: Array.isArray(saveData.landmarks) ? saveData.landmarks.filter(landmark =>
                landmark && ['x', 'y', 'w', 'h'].every(key => Number.isFinite(landmark[key])) &&
                typeof landmark.type === 'string') : [],
            constructions: Array.isArray(saveData.constructions) ? saveData.constructions.filter(job =>
                job && typeof job.kind === 'string' && Number.isFinite(job.completesAt) &&
                job.footprint && ['x', 'y', 'w', 'h'].every(key =>
                    Number.isFinite(job.footprint[key]))) : [],
            handymen: Number.isFinite(saveData.handymen) ? Math.max(0, Math.floor(saveData.handymen)) : 0,
            groundsStaff: Number.isFinite(saveData.groundsStaff) ? Math.max(0, Math.floor(saveData.groundsStaff)) : 0,
            handymanContractHoursRemaining: Number.isFinite(saveData.handymanContractHoursRemaining)
                ? Math.min(24, Math.max(0, Math.floor(saveData.handymanContractHoursRemaining))) : 0,
            maintenanceTask: saveData.maintenanceTask &&
                Number.isInteger(saveData.maintenanceTask.facilityIndex) &&
                ['clean', 'repair'].includes(saveData.maintenanceTask.action) &&
                Number.isInteger(saveData.maintenanceTask.hoursRemaining) &&
                saveData.maintenanceTask.hoursRemaining > 0
                    ? {facilityIndex: saveData.maintenanceTask.facilityIndex,
                        action: saveData.maintenanceTask.action,
                        hoursRemaining: Math.min(3, saveData.maintenanceTask.hoursRemaining),
                        cost: Number.isFinite(saveData.maintenanceTask.cost) ? saveData.maintenanceTask.cost : 0,
                        conditionAtStart: Number.isFinite(saveData.maintenanceTask.conditionAtStart)
                            ? saveData.maintenanceTask.conditionAtStart : null}
                    : null,
            day: currentDay,
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
