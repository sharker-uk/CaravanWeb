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

    const api = {
        TIMBER_SELL_PRICE,
        harvestYield,
        calculateBeauty,
        getTimberSaleValue
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalScope.LandManagement = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
