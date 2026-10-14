(function (globalScope) {
    const LEDGER_LIMIT = 1000;

    function recordTransaction(state, amount, category, description) {
        if (!state || !Number.isFinite(state.cash) || !Number.isFinite(state.day) ||
            !Number.isFinite(amount) || amount === 0 ||
            typeof category !== 'string' || typeof description !== 'string') {
            return false;
        }
        state.initialBalance = Number.isFinite(state.initialBalance)
            ? state.initialBalance
            : state.cash;
        state.cash += amount;
        state.transactions ||= [];
        state.transactions.push({
            day: state.day,
            amount,
            category,
            description,
            balance: state.cash
        });
        if (state.transactions.length > LEDGER_LIMIT) {
            const removed = state.transactions.shift();
            state.initialBalance += removed.amount;
        }
        return true;
    }

    function getSevenDayBalance(state) {
        const currentDay = state?.day;
        const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
        const recent = transactions.filter(transaction =>
            Number.isFinite(currentDay) && Number.isFinite(transaction.day) &&
            transaction.day > currentDay - 7 && transaction.day <= currentDay
        );
        const income = recent.reduce((sum, transaction) =>
            sum + Math.max(0, transaction.amount), 0);
        const expenses = recent.reduce((sum, transaction) =>
            sum + Math.max(0, -transaction.amount), 0);
        const recordedBalance = transactions.reduce((balance, transaction) =>
            balance + transaction.amount, Number.isFinite(state?.initialBalance)
                ? state.initialBalance
                : Number.NaN);
        return {
            income,
            expenses,
            net: income - expenses,
            expectedCash: recordedBalance,
            actualCash: state?.cash,
            isValid: Number.isFinite(recordedBalance) && Number.isFinite(state?.cash) &&
                Math.abs(recordedBalance - state.cash) < 0.005
        };
    }

    function getGuestDemand(state) {
        const rating = Math.min(Math.max(Number(state?.rating) || 0, 0), 5) / 5;
        const satisfaction = Math.min(Math.max(Number(state?.satisfaction) || 0, 0), 100) / 100;
        const baseScore = (rating * 50) + (satisfaction * 50);
        const beauty = Math.min(Math.max(Number.isFinite(state?.beauty) ? state.beauty : 50, 0), 100);
        const score = Math.round(Math.min(100, Math.max(0, baseScore + (beauty - 50) * 0.2)));
        return {
            score,
            level: score >= 67 ? 'High' : score >= 34 ? 'Moderate' : 'Low'
        };
    }

    function shouldAcceptGuest(state, options = {}) {
        if (options.eligible === false) return false;
        const pitches = state?.pitches || [];
        const vacancies = pitches.filter(pitch => !pitch.occupied).length;
        const demand = getGuestDemand(state).score;
        const dailyCapacity = Math.min(pitches.length, 24);
        if (!vacancies || !demand || (state.dailyGuestArrivals || 0) >= dailyCapacity) return false;
        state.guestArrivalProgress = (state.guestArrivalProgress || 0) +
            dailyCapacity * demand * (Number.isFinite(options.demandMultiplier)
                ? Math.max(0, options.demandMultiplier)
                : 1) / 1000;
        if (state.guestArrivalProgress < 1) return false;
        state.guestArrivalProgress -= 1;
        state.dailyGuestArrivals = (state.dailyGuestArrivals || 0) + 1;
        return true;
    }

    const api = {recordTransaction, getSevenDayBalance, getGuestDemand, shouldAcceptGuest};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.Economy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
