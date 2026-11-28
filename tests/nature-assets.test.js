const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const N=require('../src/nature-assets.js');
test('registry defines nature states and actions',()=>{assert.deepEqual(N.registry.tree.states,['standing','stump','removed']);assert.equal(N.registry.tree.interaction,'chop');assert.equal(N.registry.debris.interaction,'clear');});
test('nature graphics are deterministic and reflect authoritative tile removal',()=>{const tree={nature:'tree',terrain:'grass'};const before=N.natureGraphic(tree,4,5);assert.equal(before,N.natureGraphic(tree,4,5));assert.match(before,/<circle/);assert.equal(N.natureGraphic({...tree,nature:null},4,5),'');assert.match(N.natureGraphic({nature:'debris'},4,5),/<path/);});
test('terrain detail never overrides built roads or paths',()=>{assert.equal(N.groundDetails({terrain:'grass',road:true},3,4),'');assert.equal(N.groundDetails({terrain:'grass',path:true},3,4),'');assert.equal(N.groundDetails({terrain:'water'},3,4),'');assert.equal(N.groundDetails({terrain:'sand'},3,4),'');assert.match(N.groundDetails({terrain:'grass',nature:'tree'},3,4),/<path/);});
test('map loads nature registry before renderer and retains authoritative collision',()=>{const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.ok(html.indexOf('src/nature-assets.js')<html.indexOf('src/management-map.js'));const src=fs.readFileSync(path.join(__dirname,'../src/management-map.js'),'utf8');assert.match(src,/assets\.natureGraphic\(t,x,y,unit\)/);});
test('grass details use at most two SVG paths per row and retain all blade segments',()=>{
 const row=Array.from({length:60},(_,x)=>({terrain:'grass',nature:x%2?'tree':null}));
 const separate=row.map((tile,x)=>N.groundDetails(tile,x,10)).join('');
 const batch=N.groundRowDetails(row,10);
 assert.equal((batch.match(/<path/g)||[]).length,2);
 assert.deepEqual([...batch.matchAll(/M\d+ \d+l-1 -\d+m1 \d+l2 -\d+/g)].map(m=>m[0]).sort(),
  [...separate.matchAll(/M\d+ \d+l-1 -\d+m1 \d+l2 -\d+/g)].map(m=>m[0]).sort());
});
