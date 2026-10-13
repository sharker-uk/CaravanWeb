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
        const guestApi = globalScope.GuestActivities ||
            (typeof require === 'function' ? require('./guest-activities.js') : null);
        if (guestApi && typeof guestApi.updateGuestSatisfaction === 'function') {
            guestApi.updateGuestSatisfaction(state);
        }
        return state;
    }

    function advanceSimulationState(state, dt, options = {}) {
        if (!state || !Number.isFinite(dt)) return state;

        // Pausing freezes all simulation state, not just the game clock.
        // Keep the post-update callback available so callers can refresh UI if needed.
        if (state.isPaused) {
            if (typeof options.onAfterUpdate === 'function') {
                options.onAfterUpdate(state);
            }
            return state;
        }

        const clockApi = globalScope.SimulationClock ||
            (typeof require === 'function' ? require('./simulation-clock.js') : null);
        if (clockApi && typeof clockApi.advanceSimulation === 'function') {
            clockApi.advanceSimulation(state, dt, {
                onHourly: options.onHourly,
                onDaily: options.onDaily
            });
        }

        applyCaravanDecay(state);
        const guestApi = globalScope.GuestActivities ||
            (typeof require === 'function' ? require('./guest-activities.js') : null);
        if (!state.isPaused && guestApi && typeof guestApi.updateGuestActivities === 'function') {
            guestApi.updateGuestActivities(state, dt / 10);
        }
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
