const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/land-parcels.js'),T=require('../src/external-field-terrain.js'),W=require('../src/connected-world.js');
test('owned South Field has an unobstructed entrance across its north edge',()=>{
 const s={land:{enabled:true,ownedPlotIds:['south_field']}};
 for(let x=8;x<32;x++)for(let y=40;y<=40;y++){
  assert.equal(T.getTile(s,x,y).nature,null);
  assert.equal(T.canEnter(s,x,y),true);
 }
});
test('crossing farm to South Field does not block a clear entrance',()=>{
 const s={land:{enabled:true,ownedPlotIds:['south_field']}};
 const original=global.CaravanLandParcels;
 global.CaravanLandParcels=P;global.CaravanExternalTerrain=T;
 global.GameState={getTileProperties:()=>({walkable:true})};
 try{
  const park=()=>true;
  for(const y of [39.5,39.8,39.9,40,40.1,40.5,41.5])
   assert.equal(W.canOccupy(s,25.5,y,null,null,park),true,'blocked at y='+y);
 }finally{global.CaravanLandParcels=original;delete global.CaravanExternalTerrain;delete global.GameState;}
});
test('unowned South Field allows walking but blocks development',()=>{
 const s={land:{enabled:true,ownedPlotIds:[]}};
 assert.equal(T.canEnter(s,25,40),true);
 assert.equal(T.clear(s,25,41).ok,false);
});
