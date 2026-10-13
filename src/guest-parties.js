(function (globalScope) {
    const PARTY_PROFILES = {
        holiday: [
            {type: 'family', weight: 55, adults: [2, 2], children: [1, 3]},
            {type: 'couple', weight: 20, adults: [2, 2], children: [0, 0]},
            {type: 'friends', weight: 20, adults: [3, 5], children: [0, 0]},
            {type: 'solo', weight: 5, adults: [1, 1], children: [0, 0]}
        ],
        weekend: [
            {type: 'couple', weight: 35, adults: [2, 2], children: [0, 0]},
            {type: 'friends', weight: 35, adults: [3, 5], children: [0, 0]},
            {type: 'family', weight: 20, adults: [2, 2], children: [1, 2]},
            {type: 'solo', weight: 10, adults: [1, 1], children: [0, 0]}
        ],
        quiet: [
            {type: 'couple', weight: 35, adults: [2, 2], children: [0, 0]},
            {type: 'solo', weight: 30, adults: [1, 1], children: [0, 0]},
            {type: 'friends', weight: 20, adults: [2, 3], children: [0, 0]},
            {type: 'family', weight: 15, adults: [2, 2], children: [1, 2]}
        ]
    };

    function getDemandPeriod(day) {
        const dayOfYear = ((Math.max(1, Math.floor(day)) - 1) % 365) + 1;
        if (dayOfYear >= 181 && dayOfYear <= 237) return 'holiday';
        if ((Math.max(1, Math.floor(day)) - 1) % 7 >= 5) return 'weekend';
        return 'quiet';
    }

    function getDemandProfile(day) {
        const period = getDemandPeriod(day);
        return {
            period,
            multiplier: period === 'holiday' ? 1.4 : period === 'weekend' ? 1.15 : 0.7
        };
    }

    function randomInteger(range, random) {
        return range[0] + Math.floor(random() * (range[1] - range[0] + 1));
    }

    function createGuestParty(day, random = Math.random) {
        const profile = getDemandProfile(day);
        const choices = PARTY_PROFILES[profile.period];
        let roll = random() * choices.reduce((sum, choice) => sum + choice.weight, 0);
        const choice = choices.find(item => {
            roll -= item.weight;
            return roll < 0;
        }) || choices[choices.length - 1];
        const adults = randomInteger(choice.adults, random);
        const children = randomInteger(choice.children, random);
        const partyPreferences = {
            family: ['playground', 'shop', 'toilets', 'showers'],
            couple: ['restaurant', 'shop', 'showers'],
            friends: ['pub', 'shop', 'showers'],
            solo: ['shop', 'toilets', 'showers']
        };

        return {
            type: choice.type,
            adults,
            children,
            headcount: adults + children,
            preferences: {
                preferredFacilities: partyPreferences[choice.type],
                toiletIntervalHours: choice.type === 'family' ? 3 : 4,
                showerVisitIntervalDays: choice.type === 'solo' ? 0 : 1,
                shopIntervalHours: choice.type === 'solo' ? 12 : 8,
                laundryEveryDays: choice.type === 'family' ? 3 : 5
            },
            needs: {
                toiletVisits: 0,
                showerVisits: 0,
                missedToiletVisits: 0,
                missedShowerVisits: 0,
                shoppingTrips: 0,
                laundryTrips: 0,
                satisfaction: 75
            }
        };
    }

    function selectEligibleBooking(pitches, party, getAccommodations, canHost, random = Math.random) {
        const candidates = [];
        (pitches || []).filter(pitch => !pitch.occupied).forEach(pitch => {
            getAccommodations(pitch).forEach(accommodation => {
                if (canHost(accommodation, party.headcount)) {
                    candidates.push({pitch, accommodation, party});
                }
            });
        });
        return candidates.length
            ? candidates[Math.floor(random() * candidates.length)]
            : null;
    }

    const api = {getDemandPeriod, getDemandProfile, createGuestParty, selectEligibleBooking};
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.GuestParties = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
