const test=require('node:test'),assert=require('node:assert/strict');
const village=require('../data/village-world.json');
const W=require('../src/connected-world.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('saved 60x40 park grid maps exactly onto village park footprint',()=>{
 const t=W.placeVillage(village),p=village.park;
 for(const [scene,expected] of [ [[0,0],[p.x,p.y]],[[60,0],[p.x+p.w,p.y]],[[0,40],[p.x,p.y+p.h]],[[60,40],[p.x+p.w,p.y+p.h]],[[W.gate.x,W.gate.y],village.nodes.parkGate]]){
  const v=t.toVillage(...scene);close(v[0],expected[0]);close(v[1],expected[1]);
 }
});
test('roundtrip is reversible across park, entrance and external coordinates',()=>{
 const t=W.placeVillage(village);
 for(const [x,y] of [[0,0],[8,25],[60,40],[14,-2],[-20,12],[70,50],[29.3,17.6]]){
  const v=t.toVillage(x,y),s=t.toScene(v);close(x,s[0]);close(y,s[1]);
 }
});
test('scene coordinates and original farm bounds are unchanged',()=>{
 assert.deepEqual(W.farm,{west:8,north:0,east:60,south:40});
 assert.deepEqual(W.gate,{x:8,y:25,minY:24,maxY:26});
});

test('management renderer keeps a public beach outside the farm before the sea',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.join(__dirname,'../src/management-map.js'),'utf8');
 assert.match(source,/const shoreline=x\(v\.park\.x\+v\.park\.w\)/);
 assert.match(source,/const seaEdge=x\(v\.park\.x\+v\.park\.w\+70\)/);
 assert.ok(source.indexOf('fill="#e4d5ac"')<source.indexOf('fill="#a7cbd0"'));
});
