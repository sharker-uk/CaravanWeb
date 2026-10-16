(function (globalScope) {
    function applyCaravanDecay(state, elapsedSeconds = 1) {
        if (!state || !Array.isArray(state.caravans)) return state;
        if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return state;
        const gameHourSeconds = (Number(state.dayLengthMinutes) || 10) * 600 / 24;
        const elapsedGameHours = elapsedSeconds / gameHourSeconds;
        state.caravans.forEach(caravan => {
            const decay = (state.weather === 'Rain' ? 0.02 : 0.005) * elapsedSeconds;
            caravan.condition = Math.max(0, caravan.condition - decay);
            const breakChance = 1 - Math.pow(1 - 0.001, elapsedGameHours);
            if (caravan.condition < 40 && !caravan.isBroken &&
                Math.random() < breakChance) {
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

        const elapsedSeconds = dt * (Number(state.simulationSpeed) || 1);
        const brokenStatus = state.caravans.map(caravan => caravan.isBroken);
        applyCaravanDecay(state, elapsedSeconds);
        if (state.caravans.some((caravan, index) =>
            caravan.isBroken !== brokenStatus[index]) &&
            typeof options.onCaravanStatusChange === 'function') {
            options.onCaravanStatusChange();
        }
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
