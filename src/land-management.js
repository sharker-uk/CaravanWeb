(function (globalScope) {
    const TIMBER_PER_TREE_MIN = 4;
    const TIMBER_PER_TREE_RANGE = 4;
    const TIMBER_SELL_PRICE = 8;
    const TARGET_TREE_COVERAGE = 0.12;

    function harvestYield(x, y) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) return TIMBER_PER_TREE_MIN;
        return TIMBER_PER_TREE_MIN + Math.abs((x * 7 + y * 11) % TIMBER_PER_TREE_RANGE);
    }

    function calculateBeauty(tiles, pitches = [], facilities = []) {
        if (!Array.isArray(tiles) || tiles.length === 0) return 50;
        let grassTiles = 0;
        let treeCount = 0;
        let debrisCount = 0;
        for (const row of tiles) {
            if (!Array.isArray(row)) continue;
            for (const tile of row) {
                if (!tile || tile.terrain !== 'grass') continue;
                grassTiles++;
                if (tile.nature === 'tree') treeCount++;
                if (tile.nature === 'debris') debrisCount++;
            }
        }
        if (!grassTiles) return 15;
        const treeCoverage = treeCount / grassTiles;
        const debrisCoverage = debrisCount / grassTiles;
        const treeScore = Math.max(0, 60 - Math.abs(treeCoverage - TARGET_TREE_COVERAGE) * 450);
        const clutterPenalty = debrisCoverage * 80;
        const developmentPenalty = (pitches.length * 1.5) + (facilities.length * 0.5);
        return Math.round(Math.min(100, Math.max(0, 15 + treeScore - clutterPenalty - developmentPenalty)));
    }

    function getTimberSaleValue(units) {
        return Number.isFinite(units) && units > 0
            ? Math.floor(units) * TIMBER_SELL_PRICE
            : 0;
    }

    const FIREWOOD_SALE = 'firewood sale';

    function findStall(state) {
        return state.landmarks.find(landmark => landmark.type === 'firewood_stall');
    }

    function ensureFarmStall(state) {
        if (state.parkPackageId || findStall(state)) return;
        const house = state.landmarks.find(landmark => landmark.type === 'farmhouse' &&
            landmark.name === 'Run-down farmhouse' && landmark.w === 6 && landmark.h === 5);
        if (!house) return;

        const reserved = [...state.pitches, ...state.facilities, ...state.landmarks,
            ...state.constructions.map(job => job.footprint)];
        const candidates = [];
        for (let x = house.x; x < house.x + house.w; x++) {
            candidates.push({x, y: house.y + house.h});
        }
        for (let y = house.y + house.h - 1; y >= house.y; y--) {
            candidates.push({x: house.x - 1, y}, {x: house.x + house.w, y});
        }
        const site = candidates.find(({x, y}) => {
            const tile = state.tiles[y]?.[x];
            return tile?.terrain === 'grass' && !tile.nature && !tile.road && !tile.path &&
                !Object.values(tile.utilities || {}).some(Boolean) &&
                !(Math.floor(state.player?.x) === x && Math.floor(state.player?.y) === y) &&
                !reserved.some(item => item.blocksBuilding !== false &&
                    x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h);
        });
        if (site) state.landmarks.push({...site, w: 1, h: 1, type: 'firewood_stall',
            name: 'Firewood stall', blocksBuilding: true, blocksMovement: true, interactable: true});
    }

    function normalizeStall(raw) {
        return {
            stock: Number.isSafeInteger(raw?.stock) ? Math.max(0, raw.stock) : 0,
            hasSold: raw?.hasSold === true
        };
    }

    function transferFirewood(state, bundles) {
        if (!findStall(state) || !Number.isSafeInteger(bundles) || !bundles ||
            state.wood - bundles < 0 || state.firewoodStall.stock + bundles < 0 ||
            !Number.isSafeInteger(state.firewoodStall.stock + bundles) ||
            !Number.isSafeInteger(state.wood - bundles)) return false;
        state.wood -= bundles;
        state.firewoodStall.stock += bundles;
        return true;
    }

    function todayFirewoodSales(state) {
        return state.transactions.filter(entry =>
            entry.day === state.day && entry.category === FIREWOOD_SALE).length;
    }

    function processFirewoodHour(state, recordTransaction, random = Math.random) {
        const stall = state.firewoodStall;
        // Open 09:00–18:00. The first stocked hour introduces the mechanic.
        if (!stall.stock || state.hour < 9 || state.hour >= 18 || !findStall(state)) return false;
        const reputation = Math.min(5, Math.max(1, state.rating));
        const chance = (0.25 + (reputation - 1) * 0.10) * (state.weather === 'Rain' ? 0.4 : 1);
        if (stall.hasSold && random() >= chance) return false;
        if (!recordTransaction(TIMBER_SELL_PRICE, FIREWOOD_SALE, 'Sold 1 bundle of firewood')) return false;
        stall.stock--;
        stall.hasSold = true;
        return true;
    }

    const api = {
        findStall,
        ensureFarmStall,
        normalizeStall,
        transferFirewood,
        todayFirewoodSales,
        processFirewoodHour,
        TIMBER_SELL_PRICE,
        harvestYield,
        calculateBeauty,
        getTimberSaleValue
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.LandManagement = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
