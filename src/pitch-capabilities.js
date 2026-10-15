(function (globalScope) {
    const UTILITY_TYPES = ['gas', 'water', 'electricity', 'waste'];
    const parkServicesApi = globalScope.ParkServices ||
        (typeof require === 'function' ? require('./park-services.js') : null);
    const facilityOperationsApi = globalScope.FacilityOperations ||
        (typeof require === 'function' ? require('./facility-operations.js') : null);
    const staticCaravansApi = globalScope.StaticCaravans ||
        (typeof require === 'function' ? require('./static-caravans.js') : null);

    function getAccommodationTypes(state, pitch, hookups) {
        if (pitch.type === 'grass') return ['tent', 'towed'];
        if (pitch.type === 'gravel') {
            const caravan = staticCaravansApi.findInstalledVan(state, pitch);
            if (caravan) {
                const hasSleepingCapacity = staticCaravansApi.getMaximumOccupancy(caravan) > 0;
                return hasSleepingCapacity && UTILITY_TYPES.every(type => hookups[type])
                    ? ['static'] : [];
            }
            return ['tent', 'towed'];
        }
        return [];
    }

    function getServicesForPitch(state, pitch) {
        const services = {};
        (state.facilities || []).forEach(facility => {
            if (!facilityOperationsApi.isFacilityOperational(facility) ||
                !parkServicesApi.getServiceCoverage(facility, pitch)) return;
            const capacity = Math.max(0, Number(facility.capacity) || 0);
            services[facility.type] = Math.max(services[facility.type] || 0, capacity);
        });
        return services;
    }

    function deriveCapability(state, pitch, connectedUtilities) {
        const hookups = parkServicesApi.getPitchHookupsFromConnected(pitch, connectedUtilities);
        const caravan = staticCaravansApi.findInstalledVan(state, pitch);
        const staticEligible = pitch.type === 'gravel' &&
            UTILITY_TYPES.every(type => hookups[type]);
        const reserved = Boolean(pitch.constructionReserved || pitch.deliveryReserved ||
            pitch.replacementReserved);
        const availability = pitch.occupied ? 'occupied' : reserved ? 'reserved' : 'available';
        return {
            pitch,
            accommodations: getAccommodationTypes(state, pitch, hookups),
            utilities: hookups,
            services: getServicesForPitch(state, pitch),
            staticEligible,
            staticInstalled: Boolean(caravan),
            staticCapacity: staticCaravansApi.getMaximumOccupancy(caravan),
            availability
        };
    }

    function createIndex() {
        return {
            records: [],
            connectedUtilities: Object.fromEntries(UTILITY_TYPES.map(type => [type, new Set()]))
        };
    }

    function rebuild(state, index = createIndex()) {
        index.connectedUtilities = Object.fromEntries(UTILITY_TYPES.map(type => [
            type,
            parkServicesApi.getConnectedUtilityTiles(state.tiles || [], type)
        ]));
        index.records = (state.pitches || []).map(pitch =>
            deriveCapability(state, pitch, index.connectedUtilities)
        );
        return index;
    }

    function satisfiesHostingRequirements(state, pitch, capability, requirements) {
        const headcount = Math.max(1, Number(requirements.headcount) || 1);
        return Boolean(pitch && state.pitches?.includes(pitch)) &&
            !pitch.occupied && !pitch.constructionReserved && !pitch.deliveryReserved &&
            !pitch.replacementReserved &&
            capability.accommodations.includes(requirements.accommodation) &&
            (requirements.accommodation !== 'static' ||
                capability.staticCapacity >= headcount) &&
            (requirements.requiredUtilities || []).every(type => capability.utilities[type]) &&
            (requirements.requiredServices || []).every(type =>
                (capability.services[type] || 0) >= headcount
            );
    }

    function canHost(index, state, pitch, requirements = {}) {
        const capability = index?.records.find(record => record.pitch === pitch);
        return Boolean(capability &&
            satisfiesHostingRequirements(state, pitch, capability, requirements));
    }

    function canHostCurrent(state, pitch, requirements = {}) {
        const connectedUtilities = Object.fromEntries(UTILITY_TYPES.map(type => [
            type, parkServicesApi.getConnectedUtilityTiles(state.tiles || [], type)
        ]));
        const capability = deriveCapability(state, pitch, connectedUtilities);
        return satisfiesHostingRequirements(state, pitch, capability, requirements);
    }

    function findCandidates(index, requirements = {}) {
        const accommodations = requirements.accommodations || [];
        const headcount = Math.max(1, Number(requirements.headcount) || 1);
        const requiredUtilities = requirements.requiredUtilities || [];
        const requiredServices = requirements.requiredServices || [];
        return (index?.records || []).flatMap(record => {
            if (record.pitch.occupied || record.pitch.constructionReserved ||
                record.pitch.deliveryReserved || record.pitch.replacementReserved ||
                !requiredUtilities.every(type => record.utilities[type]) ||
                !requiredServices.every(type => (record.services[type] || 0) >= headcount)) {
                return [];
            }
            return accommodations
                .filter(accommodation => record.accommodations.includes(accommodation) &&
                    (accommodation !== 'static' || record.staticCapacity >= headcount))
                .map(accommodation => ({pitch: record.pitch, accommodation}));
        });
    }

    const api = {createIndex, rebuild, canHost, canHostCurrent, findCandidates};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.PitchCapabilities = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
