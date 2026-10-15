(function (globalScope) {
    const UTILITY_TYPES = ['gas', 'water', 'electricity', 'waste'];
    const parkServicesApi = globalScope.ParkServices ||
        (typeof require === 'function' ? require('./park-services.js') : null);
    const facilityOperationsApi = globalScope.FacilityOperations ||
        (typeof require === 'function' ? require('./facility-operations.js') : null);

    function getAccommodationTypes(pitch, hookups) {
        if (pitch.type === 'grass') return ['tent', 'towed'];
        if (pitch.type === 'gravel') {
            return ['towed', ...(UTILITY_TYPES.every(type => hookups[type]) ? ['static'] : [])];
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
        return {
            pitch,
            accommodations: getAccommodationTypes(pitch, hookups),
            utilities: hookups,
            services: getServicesForPitch(state, pitch)
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

    function canHost(index, state, pitch, requirements = {}) {
        const capability = deriveCapability(state, pitch, index.connectedUtilities);
        const headcount = Math.max(1, Number(requirements.headcount) || 1);
        return capability.accommodations.includes(requirements.accommodation) &&
            (requirements.requiredUtilities || []).every(type => capability.utilities[type]) &&
            (requirements.requiredServices || []).every(type =>
                (capability.services[type] || 0) >= headcount
            );
    }

    function findCandidates(index, requirements = {}) {
        const accommodations = requirements.accommodations || [];
        const headcount = Math.max(1, Number(requirements.headcount) || 1);
        const requiredUtilities = requirements.requiredUtilities || [];
        const requiredServices = requirements.requiredServices || [];
        return (index?.records || []).flatMap(record => {
            if (record.pitch.occupied || record.pitch.constructionReserved ||
                !requiredUtilities.every(type => record.utilities[type]) ||
                !requiredServices.every(type => (record.services[type] || 0) >= headcount)) {
                return [];
            }
            return accommodations
                .filter(accommodation => record.accommodations.includes(accommodation))
                .map(accommodation => ({pitch: record.pitch, accommodation}));
        });
    }

    const api = {createIndex, rebuild, canHost, findCandidates};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.PitchCapabilities = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
