/* The walking scene uses continuous park-tile units on both sides of the gate. */
(function(root){
    'use strict';
    const farm = {west: 8, north: 0, east: 60, south: 40};
    const gate = {x: farm.west, y: 25, minY: 24, maxY: 26};
    const radius = 0.18;

    // Pin both the saved 60x40 park footprint and its entrance to the village.
    // Piecewise affine axes avoid moving saved tiles or breaking the gate connection.
    function placeVillage(village) {
        const p = village.park;
        const [gx, gy] = village.nodes.parkGate;
        const west = p.x, east = p.x + p.w, north = p.y, south = p.y + p.h;
        const xScaleLeft = (gx - west) / gate.x;
        const xScaleRight = (east - gx) / (p.gridWidth - gate.x);
        const yScaleTop = (gy - north) / gate.y;
        const yScaleBottom = (south - gy) / (p.gridHeight - gate.y);
        if (![xScaleLeft, xScaleRight, yScaleTop, yScaleBottom].every(n => Number.isFinite(n) && n > 0))
            throw Error('Invalid village park geometry or gate anchor');
        const vx = x => x <= gate.x ? gx + (x - gate.x) * xScaleLeft : gx + (x - gate.x) * xScaleRight;
        const vy = y => y <= gate.y ? gy + (y - gate.y) * yScaleTop : gy + (y - gate.y) * yScaleBottom;
        const sx = x => x <= gx ? gate.x + (x - gx) / xScaleLeft : gate.x + (x - gx) / xScaleRight;
        const sy = y => y <= gy ? gate.y + (y - gy) / yScaleTop : gate.y + (y - gy) / yScaleBottom;
        return {
            toVillage: (px, py) => [vx(px), vy(py)],
            toScene: ([x, y]) => [sx(x), sy(y)],
            // Legacy width conversion is retained for road stroke widths only.
            toSceneLength: length => length / xScaleRight
        };
    }

    function inFarm(x, y) {
        return x >= farm.west && x < farm.east && y >= farm.north && y < farm.south;
    }

    function usesFarmBoundary(state) {
        return state.land?.enabled === true && !state.parkPackageId;
    }

    // One world-space tile resolver for the original park, every expansion
    // parcel and the public village. No field-specific movement branches.
    function tileWalkable(state, tx, ty, village, placement) {
        const parcels=root.CaravanLandParcels;
        const parcel=parcels?.inParcel(tx,ty);
        if(parcel){
            if(!parcels.ownsParcel(state.land,parcel.id))return false;
            return root.CaravanExternalTerrain?.canEnter(state,tx,ty)===true;
        }
        if(inFarm(tx+.5,ty+.5))
            return root.GameStateApi?.getTileProperties(state,tx,ty)?.walkable===true;
        if(!village||!placement)return false;
        const [vx,vy]=placement.toVillage(tx+.5,ty+.5);
        return root.CaravanVillageMovement?.canWalk(village,vx,vy)===true;
    }
    function canOccupy(state,x,y,village,placement,canOccupyPark){
        if(!usesFarmBoundary(state))return canOccupyPark(state,x,y);
        // Keep the original public gate's narrow opening. All other
        // transitions are resolved by the same tile-space collision rules.
        const nearGate=Math.abs(x-gate.x)<radius &&
            y>=farm.north-radius&&y<farm.south+radius;
        if(nearGate&&(y-radius<gate.minY||y+radius>gate.maxY||!village))return false;
        return [[0,0],[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]]
            .every(([dx,dy])=>{
                const sx=x+dx,sy=y+dy;
                const tx=Math.floor(sx),ty=Math.floor(sy);
                const parcel=root.CaravanLandParcels?.inParcel(tx,ty);
                if(parcel||inFarm(sx,sy))return tileWalkable(state,tx,ty,village,placement);
                if(!village||!placement)return false;
                const [vx,vy]=placement.toVillage(sx,sy);
                return root.CaravanVillageMovement.canWalk(village,vx,vy);
            });
    }

    const api = {farm, gate, placeVillage, inFarm, usesFarmBoundary, tileWalkable, canOccupy};
    root.CaravanConnectedWorld = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
