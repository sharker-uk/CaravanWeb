const test=require('node:test');const assert=require('node:assert/strict');
const P=require('../src/land-parcels.js'),W=require('../src/connected-world.js');
const village=require('../data/village-world.json');
test('all sale fields are outside the starting farm and do not overlap',()=>{assert.equal(P.validate(),true);assert.equal(P.PARCELS.length,5);for(const p of P.PARCELS){assert.equal(P.inParcel(p.x+.5,p.y+.5).id,p.id);assert.equal(p.y+p.h<=0||p.y>=40||p.x+p.w<=8||p.x>=60,true);}});
test('external parcel coordinates round trip through the shared village placement',()=>{const placement=W.placeVillage(village);for(const p of P.PARCELS){const v=P.toVillage(p,placement),[x,y]=placement.toScene([v.x,v.y]);assert.ok(Math.abs(x-p.x)<1e-9);assert.ok(Math.abs(y-p.y)<1e-9);}});
test('legacy meadow and dunes purchases have a deliberate future mapping',()=>{assert.ok(P.PARCELS.some(p=>p.id==='north_field'));assert.ok(P.PARCELS.some(p=>p.id==='north_coastal'));});

test('legacy purchases map to the new external fields without losing or duplicating rights',()=>{
 assert.deepEqual(P.migrateOwnedIds(['meadow','dunes','meadow','unknown']),['north_field','north_coastal']);
 assert.deepEqual(P.migrateOwnedIds(['north_field','meadow','south_field']),['north_field','south_field']);
 assert.deepEqual(P.migrateOwnedIds(null),[]);
});
test('external development is denied unless the matching field is owned',()=>{
 const north=P.PARCELS.find(p=>p.id==='north_field'),south=P.PARCELS.find(p=>p.id==='south_field');
 const land={enabled:true,ownedPlotIds:['meadow']};
 assert.equal(P.canDevelopAt(land,north.x+1,north.y+1),true);
 assert.equal(P.canDevelopAt(land,south.x+1,south.y+1),false);
 assert.equal(P.canDevelopAt(land,15,15),false);
 assert.equal(P.canDevelopAt({...land,enabled:false},north.x+1,north.y+1),false);
});

test('northern and southern fields share edges and coastal fields reach the eastern farm edge',()=>{
 const byId=Object.fromEntries(P.PARCELS.map(p=>[p.id,p]));
 for(const [inland,coastal] of [['north_field','north_coastal'],['south_field','south_coastal']]){
  const a=byId[inland],c=byId[coastal];
  assert.equal(a.x+a.w,c.x,'no gap between adjacent fields');
  assert.equal(c.x+c.w,P.FARM.east,'coastal parcel reaches the farm beach-facing edge');
  assert.equal(a.x,P.FARM.west,'inland field starts at western farm edge');
 }
 assert.equal(byId.north_field.y+byId.north_field.h,P.FARM.north);
 assert.equal(byId.south_field.y,P.FARM.south);
 assert.equal(P.validate(),true);
});
