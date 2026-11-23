const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/land-parcels.js'),T=require('../src/external-field-terrain.js'),W=require('../src/connected-world.js');
const previous={CaravanLandParcels:global.CaravanLandParcels,CaravanExternalTerrain:global.CaravanExternalTerrain,GameState:global.GameState,CaravanVillageMovement:global.CaravanVillageMovement};
global.CaravanLandParcels=P;global.CaravanExternalTerrain=T;
global.GameState={getTileProperties:()=>({walkable:true})};
global.CaravanVillageMovement={canWalk:()=>true};
const village={},placement={toVillage:(x,y)=>[x,y]};
test('all five parcels resolve from the same world coordinates',()=>{
 for(const p of P.PARCELS){
  const state={land:{enabled:true,ownedPlotIds:[p.id]}};
  let free=null;
  for(let y=p.y;y<p.y+p.h&&!free;y++)for(let x=p.x;x<p.x+p.w;x++)
   if(T.canEnter(state,x,y)){free={x,y};break;}
  assert.ok(free,'no walkable tile: '+p.id);
  assert.equal(W.tileWalkable(state,free.x,free.y,village,placement),true,p.id);
  assert.equal(W.canOccupy(state,free.x+.5,free.y+.5,village,placement,()=>true),true,p.id);
  state.land.ownedPlotIds=[];
  assert.equal(W.tileWalkable(state,free.x,free.y,village,placement),false,p.id);
 }
});
test('south boundary can be crossed in both directions without resizing original grid',()=>{
 const state={land:{enabled:true,ownedPlotIds:['south_field']}};
 for(const y of [39.6,39.8,39.99,40,40.01,40.2,40.5])
  assert.equal(W.canOccupy(state,25.5,y,village,placement,()=>true),true,'y='+y);
});
test('the original farm and public village retain walking routes',()=>{
 const state={land:{enabled:true,ownedPlotIds:[]}};
 assert.equal(W.canOccupy(state,30.5,20.5,village,placement,()=>true),true);
 assert.equal(W.canOccupy(state,-2.5,20.5,village,placement,()=>true),true);
});
test.after(()=>Object.entries(previous).forEach(([k,v])=>{if(v===undefined)delete global[k];else global[k]=v;}));
