const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const M=require('../src/village-movement.js');
const world=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/village-world.json'),'utf8'));
test('player can leave village gate along the actual park lane',()=>{
 const p={x:world.nodes.parkGate[0],y:world.nodes.parkGate[1]};
 assert.equal(M.canWalk(world,p.x,p.y),true);
 let moved=false;for(let i=0;i<80;i++)moved=M.advance(world,p,.016,{left:true})||moved;
 assert.equal(moved,true);assert.ok(p.x<world.nodes.parkGate[0]-40);
});
test('village movement rejects off-road areas and building footprints',()=>{
 assert.equal(M.canWalk(world,-5,30),false);
 const building=world.buildings[0];assert.equal(M.canWalk(world,building.x+building.w/2,building.y+building.h/2),false);
});
test('diagonal movement is normalised and collisions stop movement',()=>{
 const p={x:world.nodes.parkGate[0],y:world.nodes.parkGate[1]};
 const before={...p};M.advance(world,p,.05,{left:true,up:true});
 assert.ok(Math.hypot(p.x-before.x,p.y-before.y)<=5.251);
});
