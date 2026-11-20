const test=require('node:test');const assert=require('node:assert/strict');const L=require('../src/coastal-farm-layout.js');
test('proposed coastal farm layout has valid parcels',()=>assert.deepEqual(L.validate(),[]));
test('farm reaches the coast and contains the original drive',()=>{assert.ok(L.STARTING_PLOT.x+L.STARTING_PLOT.w>=L.DRIVE.to.x);assert.ok(L.DRIVE.from.y>=L.STARTING_PLOT.y&&L.DRIVE.from.y<L.STARTING_PLOT.y+L.STARTING_PLOT.h);assert.equal(L.MAIN_BEACH_ROUTE.availableAtStart,true);});
test('north and south parcels exist, without overlapping the farm',()=>{assert.equal(L.PARCELS.filter(p=>p.id.startsWith('north')).length,2);assert.equal(L.PARCELS.filter(p=>p.id.startsWith('south')).length,2);for(const p of L.PARCELS)assert.equal(L.intersects(p,L.STARTING_PLOT),false);});
test('roadside parcel is separated from original farm',()=>{const p=L.PARCELS.find(p=>p.id==='roadside');assert.equal(p.roadSeparated,true);assert.equal(L.touches(p,L.STARTING_PLOT),false);});
