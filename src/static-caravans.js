(function (globalScope) {
    const TIER_CONFIG = [
        {id: 'basic', name: 'Basic', conditionCategory: 'pre-loved', interiorQuality: 'Used', dailyRent: 75},
        {id: 'bronze', name: 'Bronze', conditionCategory: 'pre-loved', interiorQuality: 'Refreshed', dailyRent: 115},
        {id: 'silver', name: 'Silver', conditionCategory: 'new', interiorQuality: 'Basic', dailyRent: 155},
        {id: 'gold', name: 'Gold', conditionCategory: 'new', interiorQuality: 'Good', dailyRent: 190},
        {id: 'platinum', name: 'Platinum', conditionCategory: 'new', interiorQuality: 'Top-of-the-line', dailyRent: 240}
    ];
    const BEDROOM_CONFIG = [
        {bedrooms: 1, maxOccupancy: 4, priceMultiplier: 1},
        {bedrooms: 2, maxOccupancy: 6, priceMultiplier: 1.25},
        {bedrooms: 3, maxOccupancy: 8, priceMultiplier: 1.5}
    ];
    const TIER_BASE_PRICES = {
        basic: 9000,
        bronze: 14000,
        silver: 22000,
        gold: 32000,
        platinum: 45000
    };
    const DEPRECIATION = {
        dailyRate: 0.0004,
        minimumValuePercent: 0.2
    };
    const DELIVERY = {
        durationMinutes: 360,
        openingHour: 8,
        closingHour: 20
    };
    const STATIC_GEOMETRY = {
        footprint: {w: 3, h: 5},
        doorSide: 'south',
        doorOffset: 0.5
    };
    const ACCESSORIES = {
        bbq: {
            id: 'bbq', name: 'BBQ', description: 'A compact outdoor barbecue.',
            price: 180, pitches: ['grass', 'gravel'], w: 1, h: 1
        },
        patio: {
            id: 'patio', name: 'Patio table and chairs',
            description: 'A table with seating for outdoor meals.',
            price: 250, pitches: ['grass', 'gravel'], w: 2, h: 2
        },
        firepit: {
            id: 'firepit', name: 'Firepit', description: 'A small outdoor firepit.',
            price: 125, pitches: ['grass', 'gravel'], w: 1, h: 1
        },
        hot_tub: {
            id: 'hot_tub', name: 'Hot tub', description: 'A hardstanding-only hot tub.',
            price: 2400, pitches: ['gravel'], w: 2, h: 2
        }
    };
    const DECKING = {
        id: 'decking',
        name: 'Decking',
        price: 1200,
        lifespanDays: 3650,
        deckFootprint: {w: 3, h: 2}
    };
    const parkServicesApi = globalScope.ParkServices ||
        (typeof require === 'function' ? require('./park-services.js') : null);

    const CATALOGUE = TIER_CONFIG.flatMap(tier => BEDROOM_CONFIG.map(bedroom => {
        const modelId = `${tier.id}-${bedroom.bedrooms}br`;
        return {
            id: modelId,
            name: `${tier.name} ${bedroom.bedrooms}-bedroom static`,
            tier: tier.id,
            tierName: tier.name,
            conditionCategory: tier.conditionCategory,
            bedrooms: bedroom.bedrooms,
            maxOccupancy: bedroom.maxOccupancy,
            interiorQuality: tier.interiorQuality,
            dailyRent: tier.dailyRent,
            purchasePrice: Math.round(TIER_BASE_PRICES[tier.id] * bedroom.priceMultiplier)
        };
    }));
    const CATALOGUE_BY_ID = new Map(CATALOGUE.map(model => [model.id, model]));

    function getModel(modelId) {
        return CATALOGUE_BY_ID.get(modelId) || null;
    }

    function getMaximumOccupancy(van) {
        return getModel(van?.modelId)?.maxOccupancy || 0;
    }

    function gameTimeMinutes(state) {
        if (!state || !Number.isFinite(state.day) || !Number.isFinite(state.hour) ||
            !Number.isFinite(state.minute)) return null;
        return ((state.day - 1) * 24 + state.hour) * 60 + state.minute;
    }

    function createInstanceId(state, kind = 'van') {
        state.staticAssetSequence = Math.max(0, Number(state.staticAssetSequence) || 0) + 1;
        return `${kind}-${state.staticAssetSequence}`;
    }

    function createVan(modelId, options = {}) {
        const model = getModel(modelId);
        if (!model) return null;
        const purchasedAtMinutes = Number.isFinite(options.purchasedAtMinutes)
            ? options.purchasedAtMinutes : 0;
        return {
            id: options.id || null,
            modelId: model.id,
            tier: model.tier,
            bedrooms: model.bedrooms,
            purchasePrice: Number.isFinite(options.purchasePrice)
                ? options.purchasePrice : model.purchasePrice,
            purchasedAtMinutes,
            condition: Number.isFinite(options.condition)
                ? Math.min(100, Math.max(0, options.condition)) : 100,
            isBroken: Boolean(options.isBroken),
            isOperational: options.isOperational !== false,
            pitchId: options.pitchId || null,
            hasDecking: Boolean(options.hasDecking),
            hasSkirting: Boolean(options.hasSkirting),
            accessories: Array.isArray(options.accessories) ? options.accessories : [],
            smokeParticles: []
        };
    }

    function normalizeLegacyVan(van, pitchId) {
        const savedModel = getModel(van?.modelId);
        const tier = savedModel?.tier || (van?.tier === 2 ? 'gold' : 'basic');
        const bedrooms = Number.isInteger(van?.bedrooms) &&
            [1, 2, 3].includes(van.bedrooms) ? van.bedrooms : (tier === 'gold' ? 2 : 1);
        const modelId = savedModel?.id || `${tier}-${bedrooms}br`;
        const model = getModel(modelId);
        const purchasedAtMinutes = Number.isFinite(van?.purchasedAtMinutes) &&
            van.purchasedAtMinutes >= 0
            ? van.purchasedAtMinutes
            : Math.max(0, ((Number(van?.purchaseDay) || 1) - 1) * 1440);
        return {
            ...createVan(modelId, {
                id: van?.id || null,
                pitchId,
                purchasePrice: Number.isFinite(van?.purchasePrice) && van.purchasePrice > 0
                    ? van.purchasePrice : model.purchasePrice,
                purchasedAtMinutes,
                condition: van?.condition,
                isBroken: van?.isBroken,
                isOperational: van?.isOperational,
                accessories: van?.accessories
            }),
            ...van,
            modelId,
            tier,
            bedrooms,
            id: typeof van?.id === 'string' && van.id ? van.id : null,
            pitchId,
            purchasePrice: Number.isFinite(van?.purchasePrice) && van.purchasePrice > 0
                ? van.purchasePrice : model.purchasePrice,
            purchasedAtMinutes,
            condition: Number.isFinite(van?.condition)
                ? Math.min(100, Math.max(0, van.condition)) : 100,
            isBroken: Boolean(van?.isBroken),
            isOperational: van?.isOperational !== false,
            hasDecking: Boolean(van?.hasDecking),
            hasSkirting: Boolean(van?.hasSkirting),
            accessories: Array.isArray(van?.accessories) ? van.accessories : []
        };
    }

    function calculateAgeDays(van, nowMinutes) {
        if (!Number.isFinite(nowMinutes) || !Number.isFinite(van?.purchasedAtMinutes)) return 0;
        return Math.max(0, (nowMinutes - van.purchasedAtMinutes) / 1440);
    }

    function calculateResaleValue(van, nowMinutes) {
        if (!van || !Number.isFinite(van.purchasePrice) || van.purchasePrice <= 0) return 0;
        const ageDays = calculateAgeDays(van, nowMinutes);
        const remaining = Math.max(DEPRECIATION.minimumValuePercent,
            1 - ageDays * DEPRECIATION.dailyRate);
        return Math.max(0, Math.floor(van.purchasePrice * remaining));
    }

    function findInstalledVan(state, pitch) {
        if (!pitch) return null;
        return (state?.caravans || []).find(van =>
            (van.pitchId && pitch.id && van.pitchId === pitch.id) ||
            van.pitch === pitch ||
            (Number.isInteger(van.pitchIndex) && state.pitches?.[van.pitchIndex] === pitch)
        ) || null;
    }

    function isHardstanding(pitch) {
        return pitch?.type === 'gravel';
    }

    function hasAdjacentAccess(state, pitch) {
        for (let x = pitch.x; x < pitch.x + pitch.w; x++) {
            if (state.tiles?.[pitch.y - 1]?.[x]?.road || state.tiles?.[pitch.y - 1]?.[x]?.path ||
                state.tiles?.[pitch.y + pitch.h]?.[x]?.road ||
                state.tiles?.[pitch.y + pitch.h]?.[x]?.path) return true;
        }
        for (let y = pitch.y; y < pitch.y + pitch.h; y++) {
            if (state.tiles?.[y]?.[pitch.x - 1]?.road || state.tiles?.[y]?.[pitch.x - 1]?.path ||
                state.tiles?.[y]?.[pitch.x + pitch.w]?.road ||
                state.tiles?.[y]?.[pitch.x + pitch.w]?.path) return true;
        }
        return false;
    }

    function getPitchEligibility(state, pitch, options = {}) {
        if (!pitch || !isHardstanding(pitch)) return {eligible: false, reason: 'Static caravans require a hardstanding pitch.'};
        if (pitch.w < 4 || pitch.h < 8) {
            return {eligible: false, reason: 'Static caravans require a hardstanding pitch at least 4 × 8 tiles.'};
        }
        if (!hasAdjacentAccess(state, pitch)) {
            return {eligible: false, reason: 'Static caravans require a pitch connected to an adjacent road or path.'};
        }
        const hookups = parkServicesApi.getPitchHookups(pitch, state.tiles || []);
        const missing = Object.entries(hookups).filter(([, connected]) => !connected).map(([type]) => type);
        if (missing.length) return {eligible: false, reason: `Missing connected hookups: ${missing.join(', ')}.`, missing};
        if (!state.pitches?.includes(pitch)) return {eligible: false, reason: 'This pitch is no longer in the park.'};
        if (pitch.occupied || (state.guests || []).some(guest => guest.pitch === pitch)) {
            return {eligible: false, reason: 'This pitch is occupied by guests.'};
        }
        const reservationMatchesOrder = options.orderId &&
            (pitch.deliveryReserved === options.orderId ||
                pitch.replacementReserved === options.orderId);
        if (pitch.constructionReserved ||
            ((pitch.deliveryReserved || pitch.replacementReserved) && !reservationMatchesOrder)) {
            return {eligible: false, reason: 'This pitch is reserved.'};
        }
        if ((state.constructions || []).some(job => job.pitchId === pitch.id ||
            (Number.isInteger(job.pitchIndex) && state.pitches[job.pitchIndex] === pitch))) {
            return {eligible: false, reason: 'This pitch is under construction.'};
        }
        const installed = findInstalledVan(state, pitch);
        const staticFootprint = getStaticFootprint(pitch);
        const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x &&
            a.y < b.y + b.h && a.y + a.h > b.y;
        if ((pitch.accessories || []).some(item => overlaps(staticFootprint, item))) {
            return {eligible: false, reason: 'A pitch accessory overlaps the standard static-caravan footprint.'};
        }
        if (installed && options.replacingVanId !== installed.id) {
            return {eligible: false, reason: 'This pitch already has a static caravan.'};
        }
        if (options.replacingVanId && (!installed || installed.id !== options.replacingVanId)) {
            return {eligible: false, reason: 'The static selected for replacement is no longer installed.'};
        }
        return {eligible: true, reason: '', installed};
    }

    function scheduleDelivery(state) {
        const current = gameTimeMinutes(state);
        if (current === null) return null;
        const dayStart = Math.floor(current / 1440) * 1440;
        const minuteOfDay = current - dayStart;
        let start = current;
        if (minuteOfDay < DELIVERY.openingHour * 60) {
            start = dayStart + DELIVERY.openingHour * 60;
        } else if (minuteOfDay > DELIVERY.closingHour * 60) {
            start = dayStart + 1440 + DELIVERY.openingHour * 60;
        }
        let deliveryAtMinutes = start + DELIVERY.durationMinutes;
        const deliveryMinuteOfDay = deliveryAtMinutes % 1440;
        if (deliveryMinuteOfDay < DELIVERY.openingHour * 60) {
            deliveryAtMinutes = Math.floor(deliveryAtMinutes / 1440) * 1440 +
                DELIVERY.openingHour * 60;
        } else if (deliveryMinuteOfDay > DELIVERY.closingHour * 60) {
            deliveryAtMinutes = Math.floor(deliveryAtMinutes / 1440) * 1440 +
                1440 + DELIVERY.openingHour * 60;
        }
        return deliveryAtMinutes;
    }

    function findPitchById(state, pitchId) {
        return (state.pitches || []).find(pitch => pitch.id === pitchId) || null;
    }

    function queuePurchase(state, pitch, modelId, recordTransaction) {
        const model = getModel(modelId);
        if (!model || typeof recordTransaction !== 'function') {
            return {ok: false, reason: 'Select a valid static caravan.'};
        }
        const installed = findInstalledVan(state, pitch);
        const eligibility = getPitchEligibility(state, pitch, {
            replacingVanId: installed?.id
        });
        if (!eligibility.eligible) return {ok: false, reason: eligibility.reason};
        const now = gameTimeMinutes(state);
        const deliveryAtMinutes = scheduleDelivery(state);
        if (now === null || deliveryAtMinutes === null) {
            return {ok: false, reason: 'The game clock is unavailable.'};
        }
        const tradeInValue = installed ? calculateResaleValue(installed, now) : 0;
        const netCost = model.purchasePrice - tradeInValue;
        if (!Number.isFinite(state.cash) || state.cash < netCost) {
            return {ok: false, reason: 'Not enough cash for the net purchase cost.', netCost, tradeInValue};
        }
        state.staticDeliveries ||= [];
        if (state.staticDeliveries.some(order => order.pitchId === pitch.id)) {
            return {ok: false, reason: 'A delivery is already reserved for this pitch.'};
        }
        const orderId = createInstanceId(state, 'delivery');
        const vanId = createInstanceId(state, 'static');
        if (installed && tradeInValue > 0 &&
            !recordTransaction(tradeInValue, 'asset sale', `Trade-in ${installed.modelId}`)) {
            return {ok: false, reason: 'Trade-in transaction could not be recorded.'};
        }
        if (!recordTransaction(-model.purchasePrice, 'accommodation', `Purchased ${model.name}`)) {
            if (installed && tradeInValue > 0) {
                recordTransaction(-tradeInValue, 'asset sale reversal', `Reversed trade-in ${installed.modelId}`);
            }
            return {ok: false, reason: 'Purchase transaction could not be recorded.'};
        }
        const order = {
            id: orderId,
            vanId,
            pitchId: pitch.id,
            modelId,
            purchasePrice: model.purchasePrice,
            purchasedAtMinutes: now,
            tradeInVanId: installed?.id || null,
            tradeInValue,
            deliveryAtMinutes
        };
        pitch.deliveryReserved = orderId;
        state.staticDeliveries.push(order);
        return {ok: true, order, netCost, tradeInValue};
    }

    function clearDeliveryReservation(state, order) {
        const pitch = findPitchById(state, order.pitchId);
        if (pitch?.deliveryReserved === order.id) delete pitch.deliveryReserved;
        if (pitch?.replacementReserved === order.id) delete pitch.replacementReserved;
    }

    function completeDueDeliveries(state, recordTransaction, onInstalled = () => {}, onFailed = () => {}) {
        const now = gameTimeMinutes(state);
        if (now === null || state.isPaused || !Array.isArray(state.staticDeliveries)) return 0;
        let completed = 0;
        for (let i = 0; i < state.staticDeliveries.length;) {
            const order = state.staticDeliveries[i];
            if (order.deliveryAtMinutes > now) {
                i++;
                continue;
            }
            const pitch = findPitchById(state, order.pitchId);
            const oldVan = order.tradeInVanId
                ? state.caravans.find(van => van.id === order.tradeInVanId)
                : null;
            const eligibility = getPitchEligibility(state, pitch, {
                replacingVanId: order.tradeInVanId || undefined,
                orderId: order.id
            });
            const reservationMatches = pitch &&
                (pitch.deliveryReserved === order.id || pitch.replacementReserved === order.id);
            const valid = eligibility.eligible && reservationMatches &&
                (order.tradeInVanId ? Boolean(oldVan) : !findInstalledVan(state, pitch)) &&
                Boolean(getModel(order.modelId));
            if (!valid) {
                if (typeof recordTransaction !== 'function') {
                    console.error('Unable to roll back an invalid static delivery without a ledger.', order);
                    i++;
                    continue;
                }
                if (!recordTransaction(order.purchasePrice, 'refund', `Refunded invalid delivery ${order.modelId}`) ||
                    (order.tradeInValue > 0 &&
                        !recordTransaction(-order.tradeInValue, 'asset sale reversal', 'Reversed invalid static trade-in'))) {
                    console.error('Unable to reconcile an invalid static delivery.', order);
                    i++;
                    continue;
                }
                clearDeliveryReservation(state, order);
                state.staticDeliveries.splice(i, 1);
                onFailed(order, 'Delivery pitch became unavailable; purchase and trade-in were reversed.');
                continue;
            }
            if (oldVan) state.caravans = state.caravans.filter(van => van !== oldVan);
            const newVan = createVan(order.modelId, {
                id: order.vanId,
                pitchId: pitch.id,
                purchasePrice: order.purchasePrice,
                purchasedAtMinutes: order.purchasedAtMinutes
            });
            if (!newVan) {
                console.error('Static delivery references an unavailable catalogue model.', order);
                i++;
                continue;
            }
            newVan.pitch = pitch;
            newVan.hasDecking = Boolean(pitch.decking);
            state.caravans.push(newVan);
            delete pitch.deliveryReserved;
            delete pitch.replacementReserved;
            state.staticDeliveries.splice(i, 1);
            onInstalled(pitch, newVan);
            completed++;
        }
        return completed;
    }

    function canPlaceAccessory(state, pitch, accessoryId, x, y) {
        const definition = ACCESSORIES[accessoryId];
        if (!definition || !pitch || !definition.pitches.includes(pitch.type)) {
            return {valid: false, reason: 'This accessory is not allowed on this pitch type.'};
        }
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < pitch.x || y < pitch.y ||
            x + definition.w > pitch.x + pitch.w || y + definition.h > pitch.y + pitch.h) {
            return {valid: false, reason: 'The accessory must fit inside the pitch.'};
        }
        if (pitch.constructionReserved || pitch.deliveryReserved || pitch.replacementReserved ||
            (state.constructions || []).some(job => job.pitchId === pitch.id ||
                (Number.isInteger(job.pitchIndex) && state.pitches[job.pitchIndex] === pitch))) {
            return {valid: false, reason: 'This pitch is reserved.'};
        }
        if (pitch.occupied || (state.guests || []).some(guest => guest.pitch === pitch)) {
            return {valid: false, reason: 'Accessories cannot be placed while guests occupy this pitch.'};
        }
        if ((pitch.accessories || []).some(item => item.type === accessoryId)) {
            return {valid: false, reason: 'This pitch already has this accessory.'};
        }
        const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x &&
            a.y < b.y + b.h && a.y + a.h > b.y;
        const incoming = {x, y, w: definition.w, h: definition.h};
        const van = findInstalledVan(state, pitch);
        if (van) {
            const footprint = getStaticFootprint(pitch);
            if (overlaps(incoming, footprint)) {
                return {valid: false, reason: 'The accessory cannot overlap the static caravan.'};
            }
        }
        const deckingFootprint = getDeckingFootprint(pitch);
        if (pitch.decking && overlaps(incoming, deckingFootprint)) {
            return {valid: false, reason: 'The accessory cannot overlap decking.'};
        }
        if ((pitch.accessories || []).some(item => overlaps(incoming, {
            x: item.x, y: item.y, w: item.w, h: item.h
        }))) {
            return {valid: false, reason: 'The accessory cannot overlap another pitch improvement.'};
        }
        return {valid: true, reason: ''};
    }

    function purchaseAccessory(state, accessoryId, recordTransaction) {
        const item = ACCESSORIES[accessoryId];
        if (!item || typeof recordTransaction !== 'function') {
            return {ok: false, reason: 'Select a valid accessory.'};
        }
        if (!Number.isFinite(state.cash) || state.cash < item.price) {
            return {ok: false, reason: 'Not enough cash for this accessory.'};
        }
        if (!recordTransaction(-item.price, 'accessories', `Purchased ${item.name}`)) {
            return {ok: false, reason: 'Accessory purchase could not be recorded.'};
        }
        state.accessoryInventory ||= {};
        state.accessoryInventory[accessoryId] =
            Math.max(0, Number(state.accessoryInventory[accessoryId]) || 0) + 1;
        return {ok: true, item, quantity: state.accessoryInventory[accessoryId]};
    }

    function getStaticFootprint(pitch) {
        const {w, h} = STATIC_GEOMETRY.footprint;
        return {x: pitch.x + Math.floor((pitch.w - w) / 2), y: pitch.y + 1, w, h};
    }

    function getDeckingFootprint(pitch) {
        const {w, h} = DECKING.deckFootprint;
        const staticFootprint = getStaticFootprint(pitch);
        return {x: staticFootprint.x, y: staticFootprint.y + staticFootprint.h, w, h};
    }

    function installDecking(state, pitch, recordTransaction) {
        const van = findInstalledVan(state, pitch);
        if (!pitch || !isHardstanding(pitch) || !van) {
            return {ok: false, reason: 'Decking requires a static caravan on hardstanding.'};
        }
        const replacingExpiredDecking = pitch.decking && pitch.decking.condition <= 0;
        if ((pitch.decking && !replacingExpiredDecking) ||
            (!pitch.decking && van.hasDecking)) {
            return {ok: false, reason: 'This pitch already has decking.'};
        }
        if (pitch.constructionReserved || pitch.deliveryReserved || pitch.replacementReserved ||
            (state.constructions || []).some(job => job.pitchId === pitch.id ||
                (Number.isInteger(job.pitchIndex) && state.pitches[job.pitchIndex] === pitch))) {
            return {ok: false, reason: 'This pitch is reserved.'};
        }
        if (pitch.occupied || (state.guests || []).some(guest => guest.pitch === pitch)) {
            return {ok: false, reason: 'Decking cannot be installed while guests occupy this pitch.'};
        }
        const footprint = getDeckingFootprint(pitch);
        if (footprint.x < pitch.x || footprint.x + footprint.w > pitch.x + pitch.w ||
            footprint.y + footprint.h > pitch.y + pitch.h) {
            return {ok: false, reason: 'This pitch is too small for the standard decking layout.'};
        }
        const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x &&
            a.y < b.y + b.h && a.y + a.h > b.y;
        if ((pitch.accessories || []).some(item => overlaps(footprint, item))) {
            return {ok: false, reason: 'Move accessories that overlap the decking area first.'};
        }
        if (state.cash < DECKING.price) return {ok: false, reason: 'Not enough cash for decking.'};
        if (!recordTransaction(-DECKING.price, 'upgrades', 'Installed static caravan decking')) {
            return {ok: false, reason: 'Decking purchase could not be recorded.'};
        }
        const now = gameTimeMinutes(state) ?? 0;
        pitch.decking = {id: createInstanceId(state, 'decking'), installedAtMinutes: now, condition: 100};
        van.hasDecking = true;
        return {ok: true, decking: pitch.decking};
    }

    function updateDeckingCondition(state) {
        const now = gameTimeMinutes(state);
        if (now === null) return;
        (state.pitches || []).forEach(pitch => {
            if (!pitch.decking) return;
            const age = Math.max(0, (now - pitch.decking.installedAtMinutes) / 1440);
            pitch.decking.condition = Math.max(0,
                Math.min(100, (1 - age / DECKING.lifespanDays) * 100));
            if (pitch.decking.condition === 0) pitch.decking.operational = false;
        });
    }

    const api = {
        CATALOGUE, TIER_BASE_PRICES, DEPRECIATION, DELIVERY, ACCESSORIES, DECKING,
        STATIC_GEOMETRY,
        getModel, getMaximumOccupancy, gameTimeMinutes, createInstanceId, createVan,
        normalizeLegacyVan, calculateAgeDays, calculateResaleValue, findInstalledVan,
        getPitchEligibility, hasAdjacentAccess, scheduleDelivery, queuePurchase, completeDueDeliveries,
        canPlaceAccessory, purchaseAccessory, getStaticFootprint, getDeckingFootprint, installDecking,
        updateDeckingCondition
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.StaticCaravans = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
