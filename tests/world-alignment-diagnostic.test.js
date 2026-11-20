const test=require('node:test'),assert=require('node:assert/strict');
const village=require('../data/village-world.json');
const W=require('../src/connected-world.js');
test('village park bounds do not currently coincide with scene farm bounds',()=>{
 const placement=W.placeVillage(village),nw=placement.toVillage(W.farm.west,W.farm.north),se=placement.toVillage(W.farm.east,W.farm.south);
 const mismatch={west:nw[0]-village.park.x,north:nw[1]-village.park.y,east:se[0]-(village.park.x+village.park.w),south:se[1]-(village.park.y+village.park.h)};
 // Regression detector: this test documents the pre-existing mismatch, not a corrected alignment.
 assert.ok(Object.values(mismatch).some(n=>Math.abs(n)>1));
 assert.ok(Math.abs(mismatch.west)>1);
});
test('the coastline lies inside the current village-defined park footprint',()=>{
 assert.ok(1200>village.park.x&&1200<village.park.x+village.park.w);
});
