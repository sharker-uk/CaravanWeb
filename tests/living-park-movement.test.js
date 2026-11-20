const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../src/living-park-movement.js');
const world=()=>({tiles:Array.from({length:5},()=>Array.from({length:6},()=>({nature:null}))),player:{x:1.5,y:2.5}});
const walk=(s,x,y)=>Boolean(s.tiles[y]?.[x])&&s.tiles[y][x].nature!=='tree';
test('tile-space stepping preserves centre and rejects blocked, diagonal, out-of-bounds',()=>{
 const s=world();s.tiles[2][2].nature='tree';
 assert.equal(M.step(s,1,0,walk),false);
 assert.equal(M.step(s,1,1,walk),false);
 assert.equal(M.step(s,-1,0,walk),true);
 assert.deepEqual(s.player,{x:.5,y:2.5});
 assert.equal(M.step(s,-1,0,walk),false);
});
test('route avoids trees and approaches adjacent tile without entering target',()=>{
 const s=world();s.tiles[2][2].nature='tree';
 const p=M.route(s,s.player,{x:4,y:2},walk);
 assert.ok(p?.length>3);
 assert.ok(!p.some(t=>t.x===2&&t.y===2));
 const approach=M.route(s,s.player,{x:2,y:2},walk,true);
 assert.ok(approach);
 const end=approach.at(-1);
 assert.ok(M.adjacent(end,{x:2,y:2}));
});
test('unreachable and blocked destinations fail safely',()=>{
 const s=world();s.tiles[1][1].nature='tree';s.tiles[3][1].nature='tree';s.tiles[2][0].nature='tree';s.tiles[2][2].nature='tree';
 assert.equal(M.route(s,s.player,{x:4,y:2},walk),null);
 assert.equal(M.route(s,s.player,{x:2,y:2},walk,true),null);
});
test('path is deterministic and leaves the original state unchanged',()=>{
 const s=world(),before=JSON.stringify(s);
 assert.deepEqual(M.route(s,s.player,{x:4,y:2},walk),M.route(s,s.player,{x:4,y:2},walk));
 assert.equal(JSON.stringify(s),before);
});

test('continuous movement uses frame time, supports diagonals and preserves player coordinates',()=>{
 const s=world(),occupy=(state,x,y)=>walk(state,Math.floor(x),Math.floor(y));
 assert.equal(M.advance(s,.05,{right:true},walk,occupy),true);
 assert.ok(Math.abs(s.player.x-1.7)<1e-9);
 const start={...s.player};
 M.advance(s,.05,{right:true,down:true},walk,occupy);
 assert.ok(s.player.x>start.x&&s.player.y>start.y);
 assert.ok(Math.hypot(s.player.x-start.x,s.player.y-start.y)<=.201);
});
test('continuous movement stops at blocked tiles without tunnelling',()=>{
 const s=world(),occupy=(state,x,y)=>walk(state,Math.floor(x),Math.floor(y));
 s.tiles[2][2].nature='tree';
 for(let i=0;i<20;i++)M.advance(s,.05,{right:true},walk,occupy);
 assert.ok(s.player.x<2);
});
test('click route advances smoothly and arrives at target tile centre',()=>{
 const s=world(),occupy=(state,x,y)=>walk(state,Math.floor(x),Math.floor(y));
 s.playerPath=M.route(s,s.player,{x:4,y:2},walk).map(p=>({x:p.x+.5,y:p.y+.5}));
 for(let i=0;i<100;i++)M.advance(s,.05,{},walk,occupy);
 assert.ok(Math.abs(s.player.x-4.5)<.001);
 assert.ok(Math.abs(s.player.y-2.5)<.001);
 assert.equal(s.playerPath.length,0);
});
