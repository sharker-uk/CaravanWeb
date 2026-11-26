const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/land-parcels.js'),T=require('../src/external-field-terrain.js');
test('South Field terrain is deterministic and uses external coordinates',()=>{
 const a=T.createParcel('south_field'),b=T.createParcel('south_field');
 assert.deepEqual(a,b);
 assert.equal(a.version,1);
 assert.equal(T.initialNature('south_field',18,44),'barn');
 assert.equal(P.inParcel(18,44).id,'south_field');
});
test('Unowned external terrain is walkable but cannot be cleared',()=>{
 const s={land:{enabled:true,ownedPlotIds:[]}};
 assert.equal(T.canEnter(s,12,40),true);
 assert.equal(T.clear(s,12,43).ok,false);
});
test('Owned South Field clearing changes only external terrain',()=>{
 const s={land:{enabled:true,ownedPlotIds:['south_field']}};
 let found;
 for(let y=40;y<50&&!found;y++)for(let x=8;x<32;x++)if(['tree','debris'].includes(T.initialNature('south_field',x,y))){found={x,y};break;}
 assert.ok(found);
 assert.equal(T.canEnter(s,found.x,found.y),false);
 assert.equal(T.clear(s,found.x,found.y).ok,true);
 assert.equal(T.getTile(s,found.x,found.y).nature,null);
 assert.equal(T.canEnter(s,found.x,found.y),true);
 assert.equal(s.externalTerrain.south_field.version,1);
 assert.equal(T.getTile(s,0,0),null);
});
test('Saved tile overrides survive normalisation',()=>{
 const s={land:{enabled:true,ownedPlotIds:['south_field']}};
 const p={x:10,y:42};T.ensure(s,'south_field');
 s.externalTerrain.south_field.tiles['10,42']={nature:null,path:true};
 const copy=JSON.parse(JSON.stringify(s));
 assert.equal(T.normalise(copy.externalTerrain.south_field,'south_field').tiles['10,42'].path,true);
 assert.equal(T.getTile(copy,p.x,p.y).path,true);
});
