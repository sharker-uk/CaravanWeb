(function (globalScope) {
    function createSimulationState(overrides = {}) {
        return {
            day: 1,
            hour: 9,
            minute: 0,
            dayLengthMinutes: 10,
            simulationSpeed: 1,
            isPaused: false,
            ...overrides
        };
    }

    function setSimulationSpeed(state, speed) {
        const numericSpeed = Number(speed);
        if (!state || !Number.isFinite(numericSpeed) || numericSpeed <= 0) {
            return state?.simulationSpeed ?? 1;
        }
        state.simulationSpeed = numericSpeed;
        return state.simulationSpeed;
    }

    function togglePause(state) {
        if (!state) return false;
        state.isPaused = !state.isPaused;
        return state.isPaused;
    }

    function canSleep(state) {
        return Boolean(state && Number.isInteger(state.hour) && state.hour >= 0 &&
            state.hour < 24 && Number.isFinite(state.minute) && state.minute >= 0 &&
            state.minute < 60 && (state.hour >= 20 || state.hour < 5));
    }

    function advanceToHour(state, targetHour, options = {}) {
        if (!state || !Number.isInteger(targetHour) || targetHour < 0 || targetHour >= 24 ||
            !Number.isInteger(state.hour) || state.hour < 0 || state.hour >= 24 ||
            !Number.isFinite(state.minute) || state.minute < 0 || state.minute >= 60 ||
            !Number.isFinite(state.day)) return state;

        const currentMinute = state.hour * 60 + state.minute;
        const targetMinute = targetHour * 60;
        let minutesRemaining = (targetMinute - currentMinute + 1440) % 1440;
        if (minutesRemaining === 0) minutesRemaining = 1440;

        while (minutesRemaining > 0) {
            const minutesToNextHour = 60 - state.minute;
            if (minutesRemaining < minutesToNextHour - 1e-9) {
                state.minute += minutesRemaining;
                break;
            }

            minutesRemaining = Math.max(0, minutesRemaining - minutesToNextHour);
            state.minute = 0;
            state.hour += 1;
            if (state.hour >= 24) {
                state.hour = 0;
                state.day += 1;
                if (typeof options.onDaily === 'function') options.onDaily();
            }
            if (typeof options.onHourly === 'function') options.onHourly();
        }

        return state;
    }

    function advanceSimulation(state, dtSeconds = 1, options = {}) {
        if (!state || !Number.isFinite(dtSeconds)) return state;
        if (state.isPaused) return state;

        const speed = Number(state.simulationSpeed) || 1;
        state.minute += dtSeconds * speed * (1440 / (state.dayLengthMinutes * 600));

        while (state.minute >= 60) {
            state.minute -= 60;
            state.hour += 1;
            if (state.hour >= 24) {
                state.hour = 0;
                state.day += 1;
                if (typeof options.onDaily === 'function') {
                    options.onDaily();
                }
            }
            if (typeof options.onHourly === 'function') {
                options.onHourly();
            }
        }

        return state;
    }

    const api = {
        createSimulationState,
        setSimulationSpeed,
        togglePause,
        canSleep,
        advanceToHour,
        advanceSimulation
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    globalScope.SimulationClock = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
