(function (globalScope) {
    function applyCaravanDecay(state) {
        if (!state || !Array.isArray(state.caravans)) return state;
        state.caravans.forEach(caravan => {
            const decay = state.weather === 'Rain' ? 0.02 : 0.005;
            caravan.condition = Math.max(0, caravan.condition - decay);
            if (caravan.condition < 40 && !caravan.isBroken && Math.random() < 0.001) {
                caravan.isBroken = true;
            }
        });
        return state;
    }

    function applySatisfactionAndRating(state) {
        if (!state) return state;
        const facilityBenefits = {
            toilets: 30, shop: 20, playground: 10, pub: 12, restaurant: 14,
            arcade: 12, entertainment_space: 18, pool: 15, activity_centre: 18,
            entertainment_hub: 25
        };
        let targetSat = 40 + (state.facilities || []).reduce((total, facility) =>
            total + (facilityBenefits[facility.type] || 0), 0);
        if ((state.caravans || []).some(caravan => caravan.isBroken)) targetSat -= 15;
        targetSat = Math.min(Math.max(targetSat, 0), 100);
        state.satisfaction += (targetSat - state.satisfaction) * 0.01;
        state.rating = 1.0 + ((state.caravans || []).length * 0.2) + (state.satisfaction / 50);
        return state;
    }

    function advanceSimulationState(state, dt, options = {}) {
        if (!state || !Number.isFinite(dt)) return state;

        if (!state.isPaused) {
            const clockApi = globalScope.SimulationClock ||
                (typeof require === 'function' ? require('./simulation-clock.js') : null);
            if (clockApi && typeof clockApi.advanceSimulation === 'function') {
                clockApi.advanceSimulation(state, dt, {
                    onHourly: options.onHourly,
                    onDaily: options.onDaily
                });
            }
        }

        applyCaravanDecay(state);
        applySatisfactionAndRating(state);

        if (typeof options.onAfterUpdate === 'function') {
            options.onAfterUpdate(state);
        }

        return state;
    }

    const api = {
        applyCaravanDecay,
        applySatisfactionAndRating,
        advanceSimulationState
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    globalScope.Simulation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
