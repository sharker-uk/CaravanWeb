const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../src/external-terrain.js');
test('external terrain is deterministic and does not allocate legacy tiles',()=>{
 const state={tiles:Array.from({length:40},()=>Array(60).fill(null)),land:{enabled:true,ownedPlotIds:['meadow']}};
 const before=JSON.stringify(state.tiles);
 const a=T.read(state,14,-2),b=T.read(state,14,-2);
 assert.deepEqual(a,b);assert.notEqual(a,b);assert.equal(a.terrain,'grass');
 assert.equal(T.read(state,15,15),null);
 assert.equal(JSON.stringify(state.tiles),before);
 assert.equal(state.externalTiles,undefined);
});
test('external terrain writes require ownership and survive JSON roundtrip',()=>{
 const state={tiles:[],land:{enabled:true,ownedPlotIds:['meadow']}};
 const changed={...T.read(state,14,-2),nature:null,path:true};
 T.write(state,14,-2,changed);
 const json=JSON.stringify(T.snapshot(state)),restored=T.restore(JSON.parse(json));
 assert.deepEqual(restored['14,-2'],changed);
 assert.equal(T.read({...state,externalTiles:restored},14,-2).path,true);
 assert.throws(()=>T.write(state,40,42,changed),/not owned/i);
});
test('invalid and out-of-parcel terrain is rejected rather than silently discarded',()=>{
 assert.throws(()=>T.restore({'14,-2':{terrain:'lava'}}),/invalid external terrain tile/i);
 assert.throws(()=>T.restore({'999,999':{terrain:'grass'}}),/outside parcel/i);
 assert.throws(()=>T.restore([]),/invalid external terrain store/i);
 assert.throws(()=>T.write({land:{enabled:true,ownedPlotIds:['meadow']}},14,-2,{terrain:'water',utilities:{gas:'yes'}}),/invalid external terrain tile/i);
});
