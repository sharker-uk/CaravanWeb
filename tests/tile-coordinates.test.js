const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/tile-coordinates.js');
test('legacy grid coordinates are unchanged and village space is distinct',()=>{
 const tiles=Array.from({length:40},()=>Array.from({length:60},()=>({terrain:'grass'})));
 const state={tiles};
 assert.deepEqual(C.address(8,0).kind,'park');
 assert.deepEqual(C.address(59,39).kind,'park');
 assert.equal(C.get(state,8,0),tiles[0][8]);
 assert.equal(C.get(state,59,39),tiles[39][59]);
 assert.equal(C.address(7,30).kind,'village');
 assert.equal(C.get(state,7,30),null);
 assert.equal(C.address(2.5,5),null);
});
test('negative coordinates are external keys, not array offsets',()=>{
 const state={tiles:Array.from({length:40},()=>Array(60).fill(null)),land:{enabled:true,ownedPlotIds:['meadow']}};
 assert.equal(C.address(14,-2).parcelId,'north_field');
 assert.equal(C.get(state,14,-2),null);
 const t={terrain:'grass',nature:null,utilities:{}};
 C.setExternal(state,14,-2,t);
 assert.equal(C.get(state,14,-2),t);
 assert.equal(Object.hasOwn(state.tiles,'-2'),false);
 assert.equal(Object.keys(state.externalTiles).length,1);
 assert.throws(()=>C.setExternal(state,40,42,t),/not owned/i);
 assert.throws(()=>C.setExternal(state,15,15,t),/not an external/i);
});
test('external storage rejects malformed and out-of-parcel keys',()=>{
 assert.deepEqual(Object.keys(C.createStore({'14,-2':{terrain:'grass'}})),['14,-2']);
 for(const bad of ['oops','14,2.5','10000,-1','014,-2','__proto__'])assert.throws(()=>C.createStore({[bad]:{}}));
});
test('scene-to-village coordinates remain invertible',()=>{
 const W=require('../src/connected-world.js'),v=require('../data/village-world.json'),placement=W.placeVillage(v);
 for(const [x,y] of [[8,25],[14,-2],[40,45],[-15,20]]){
  const [vx,vy]=C.villagePoint(x,y,placement),[sx,sy]=placement.toScene([vx,vy]);
  assert.ok(Math.abs(x-sx)<1e-9);assert.ok(Math.abs(y-sy)<1e-9);
 }
});
