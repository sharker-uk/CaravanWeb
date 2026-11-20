/* LP-0/1: shared, deterministic tile-space movement; no renderer or economy dependency. */
(function(root){
'use strict';
const tile=p=>({x:Math.floor(p.x),y:Math.floor(p.y)});
const key=p=>p.x+','+p.y;
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
function route(state,start,goal,walkable,adjacentTarget=false){
 const from=tile(start),to=tile(goal),valid=p=>Boolean(state.tiles[p.y]?.[p.x])&&walkable(state,p.x,p.y);
 if(!valid(from))return null;
 if(!adjacentTarget&&!valid(to))return null;
 const done=p=>adjacentTarget?adjacent(p,to):key(p)===key(to);
 if(done(from))return [];
 const queue=[from],seen=new Set([key(from)]),parent=new Map();
 for(let i=0;i<queue.length;i++){
  const here=queue[i];
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
   const next={x:here.x+dx,y:here.y+dy},k=key(next);
   if(seen.has(k)||!valid(next))continue;
   seen.add(k);parent.set(k,here);
   if(done(next)){
    const path=[next];let p=here;
    while(key(p)!==key(from)){path.unshift(p);p=parent.get(key(p));}
    return path;
   }
   queue.push(next);
  }
 }
 return null;
}
function step(state,dx,dy,walkable){
 if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
 const p=tile(state.player),x=p.x+dx,y=p.y+dy;
 if(!state.tiles[y]?.[x]||!walkable(state,x,y))return false;
 state.player={...state.player,x:x+.5,y:y+.5};
 return true;
}
const api={tile,key,adjacent,route,step};
root.LivingParkMovement=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
