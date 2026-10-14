(function (globalScope) {
    function getGameTimeMinutes(state) {
        if (!state || !Number.isFinite(state.day) || !Number.isFinite(state.hour) ||
            !Number.isFinite(state.minute)) return null;
        return ((state.day - 1) * 24 + state.hour) * 60 + state.minute;
    }

    function queueConstruction(state, construction, durationMinutes = 120) {
        const currentTime = getGameTimeMinutes(state);
        if (!state || !Array.isArray(state.constructions) || currentTime === null ||
            !construction || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
            return null;
        }
        const job = {...construction, completesAt: currentTime + durationMinutes};
        state.constructions.push(job);
        return job;
    }

    function completeDueConstructions(state, onComplete) {
        const currentTime = getGameTimeMinutes(state);
        if (!state || !Array.isArray(state.constructions) || currentTime === null ||
            typeof onComplete !== 'function') return 0;

        let completed = 0;
        for (let index = 0; index < state.constructions.length;) {
            const job = state.constructions[index];
            if (job.completesAt > currentTime) {
                index++;
                continue;
            }
            if (onComplete(job) === false) {
                index++;
                continue;
            }
            state.constructions.splice(index, 1);
            completed++;
        }
        return completed;
    }

    const api = {getGameTimeMinutes, queueConstruction, completeDueConstructions};

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    globalScope.Construction = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
