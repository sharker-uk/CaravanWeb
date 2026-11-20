/* The walking scene uses continuous park-tile units on both sides of the gate. */
(function(root){
    'use strict';
    const farm = {west: 8, north: 0, east: 60, south: 40};
    const gate = {x: farm.west, y: 25, minY: 24, maxY: 26};
    const radius = 0.18;

    function placeVillage(village) {
        const scale = village.park.w / village.park.gridWidth;
        const [x, y] = village.nodes.parkGate;
        return {
            toVillage: (px, py) => [x + (px - gate.x) * scale, y + (py - gate.y) * scale],
            toScene: ([vx, vy]) => [gate.x + (vx - x) / scale, gate.y + (vy - y) / scale],
            toSceneLength: length => length / scale
        };
    }

    function inFarm(x, y) {
        return x >= farm.west && x < farm.east && y >= farm.north && y < farm.south;
    }

    function usesFarmBoundary(state) {
        return state.land?.enabled === true && !state.parkPackageId;
    }

    function canOccupy(state, x, y, village, placement, canOccupyPark) {
        if (!usesFarmBoundary(state)) return canOccupyPark(state, x, y);
        if (y >= farm.north - radius && y < farm.south + radius && Math.abs(x - gate.x) < radius) {
            if (y - radius < gate.minY || y + radius > gate.maxY || !village) return false;
            // Check the farm-side part of the opening against live park obstacles.
            if (!canOccupyPark(state, Math.max(gate.x + radius, x), y)) return false;
        }
        if (inFarm(x, y)) return canOccupyPark(state, x, y);
        if (!village) return false;
        return [-radius, radius].every(dx => [-radius, radius].every(dy => {
            const [vx, vy] = placement.toVillage(x + dx, y + dy);
            return root.CaravanVillageMovement.canWalk(village, vx, vy);
        }));
    }

    const api = {farm, gate, placeVillage, inFarm, usesFarmBoundary, canOccupy};
    root.CaravanConnectedWorld = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
