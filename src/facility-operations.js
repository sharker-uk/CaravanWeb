(function (globalScope) {
    const FACILITY_DEFAULTS = {
        toilets: {capacity: 16, hourlyCost: 0.5, costPerUse: 0},
        showers: {capacity: 12, hourlyCost: 1, costPerUse: 0.25},
        laundry: {capacity: 6, hourlyCost: 1, costPerUse: 2},
        shop: {capacity: 10, hourlyCost: 0.5, costPerUse: 0},
        playground: {capacity: 16, hourlyCost: 0.5, costPerUse: 0},
        pub: {capacity: 12, hourlyCost: 1.5, costPerUse: 0},
        restaurant: {capacity: 12, hourlyCost: 2, costPerUse: 0},
        arcade: {capacity: 12, hourlyCost: 1.5, costPerUse: 0},
        entertainment_space: {capacity: 20, hourlyCost: 2.5, costPerUse: 0},
        pool: {capacity: 20, hourlyCost: 3, costPerUse: 0},
        activity_centre: {capacity: 16, hourlyCost: 2, costPerUse: 0},
        entertainment_hub: {capacity: 24, hourlyCost: 4, costPerUse: 0}
    };

    function getFacilityDefaults(type) {
        const defaults = FACILITY_DEFAULTS[type] || FACILITY_DEFAULTS.shop;
        return {...defaults, isOperational: true, hourlyUsage: 0, usageDay: null, usageHour: null};
    }

    function getLargestOperationalFacilityCapacity(state, type) {
        return (state.facilities || []).filter(facility =>
            facility.type === type && facility.isOperational !== false
        ).reduce((largest, facility) =>
            Math.max(largest, Math.max(0, Number(facility.capacity) || 0)), 0);
    }

    function getRequiredFacilities(accommodation) {
        return accommodation === 'static' ? ['toilets'] : ['toilets', 'showers'];
    }

    function canHostParty(state, accommodation, headcount) {
        const missing = getRequiredFacilities(accommodation).filter(type =>
            getLargestOperationalFacilityCapacity(state, type) < headcount
        );
        return {valid: missing.length === 0, missing};
    }

    function adjustPartySatisfaction(party, amount) {
        if (!party?.needs) return;
        party.needs.satisfaction = Math.max(0, Math.min(100,
            (Number(party.needs.satisfaction) || 0) + amount));
    }

    function recordService(party, facility, serviceType, transaction) {
        const needs = party.needs;
        if (serviceType === 'toilets') {
            needs.toiletVisits++;
        } else if (serviceType === 'showers') {
            needs.showerVisits++;
        } else if (serviceType === 'laundry') {
            needs.laundryTrips++;
        } else if (serviceType === 'shop') {
            needs.shoppingTrips++;
        }

        const preferred = party.preferences?.preferredFacilities?.includes(serviceType);
        adjustPartySatisfaction(party, preferred ? 3 : 1);
        if (facility.costPerUse > 0) {
            const amount = serviceType === 'showers'
                ? party.headcount * facility.costPerUse
                : serviceType === 'laundry' ? party.headcount * 12 : 0;
            if (amount > 0) {
                if (serviceType === 'laundry') {
                    transaction(amount, 'laundry income', 'Guest laundry payment');
                    transaction(-party.headcount * facility.costPerUse, 'laundry supplies', 'Laundry operating supplies');
                } else {
                    transaction(-amount, 'facility costs', 'Guest shower use');
                }
            }
        }
        if (serviceType === 'shop') {
            const purchase = party.adults * 8 + party.children * 4;
            transaction(purchase, 'shop income', 'Guest shop purchases');
            transaction(-Math.round(purchase * 0.6), 'shop stock', 'Shop stock replenishment');
        }
    }

    function serveParty(state, party, type, transaction) {
        const facility = (state.facilities || []).find(item =>
            item.type === type && item.isOperational !== false &&
            (Number(item.hourlyUsage) || 0) + party.headcount <= item.capacity
        );
        if (!facility) return false;
        facility.hourlyUsage = (Number(facility.hourlyUsage) || 0) + party.headcount;
        recordService(party, facility, type, transaction);
        return true;
    }

    function processHourlyFacilities(state, transaction) {
        if (!state || typeof transaction !== 'function') return;
        const serial = state.day * 24 + state.hour;
        (state.facilities || []).forEach(facility => {
            if (facility.usageDay !== state.day || facility.usageHour !== state.hour) {
                facility.hourlyUsage = 0;
                facility.usageDay = state.day;
                facility.usageHour = state.hour;
            }
            if (facility.isOperational !== false) {
                const cost = Number(facility.hourlyCost) || 0;
                if (cost > 0) transaction(-cost, 'facility operations', `${facility.type} hourly operating cost`);
            }
        });

        (state.guests || []).forEach((guest, index) => {
            const party = guest.party;
            if (!party?.needs || guest.lastFacilityUpdate === serial) return;
            guest.lastFacilityUpdate = serial;
            const offset = (guest.pitchIndex ?? index) % 24;
            const preferences = party.preferences || {};

            if (preferences.toiletIntervalHours &&
                (serial + offset) % preferences.toiletIntervalHours === 0 &&
                !serveParty(state, party, 'toilets', transaction)) {
                party.needs.missedToiletVisits++;
                adjustPartySatisfaction(party, -8);
            }
            if (preferences.showerVisitIntervalDays > 0 && guest.accommodation !== 'static' &&
                (state.day - (guest.booking?.arrivalDay ?? state.day)) %
                    preferences.showerVisitIntervalDays === 0 &&
                state.hour === 8 + offset % 8 &&
                !serveParty(state, party, 'showers', transaction)) {
                party.needs.missedShowerVisits++;
                adjustPartySatisfaction(party, -8);
            }
            if (preferences.shopIntervalHours &&
                (serial + offset) % preferences.shopIntervalHours === 0) {
                serveParty(state, party, 'shop', transaction);
            }
            if (preferences.laundryEveryDays &&
                state.hour === 18 && state.day >= guest.booking?.arrivalDay &&
                (state.day - guest.booking.arrivalDay) % preferences.laundryEveryDays === 0) {
                serveParty(state, party, 'laundry', transaction);
            }
        });
    }

    const api = {
        FACILITY_DEFAULTS,
        getFacilityDefaults,
        getLargestOperationalFacilityCapacity,
        getRequiredFacilities,
        canHostParty,
        processHourlyFacilities
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.FacilityOperations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
