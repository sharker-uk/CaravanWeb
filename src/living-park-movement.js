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
function advance(state,seconds,input,walkable,canOccupy,speed=4,p=state.player){
 if(!Number.isFinite(seconds)||seconds<=0)return false;
 let vx=Number(Boolean(input?.right))-Number(Boolean(input?.left));
 let vy=Number(Boolean(input?.down))-Number(Boolean(input?.up));
 const moving=Boolean(vx||vy),path=state.playerPath||[];
 if(moving){path.length=0;state.interactionTarget=null;const length=Math.hypot(vx,vy);vx/=length;vy/=length;}
 else if(path.length){const target=path[0],dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);
  if(d<.001){p.x=target.x;p.y=target.y;path.shift();return true;}
  vx=dx/d;vy=dy/d;
 }
 else return false;
 const distance=Math.min(speed*Math.min(seconds,.1),!moving&&path.length?Math.hypot(path[0].x-p.x,path[0].y-p.y):Infinity);
 const nx=p.x+vx*distance,ny=p.y+vy*distance;
 let changed=false;
 if(nx!==p.x&&canOccupy(state,nx,p.y)){p.x=nx;changed=true;}
 if(ny!==p.y&&canOccupy(state,p.x,ny)){p.y=ny;changed=true;}
 if(!moving&&path.length){
  if(Math.hypot(p.x-path[0].x,p.y-path[0].y)<.005){p.x=path[0].x;p.y=path[0].y;path.shift();}
  else if(!changed)path.length=0;
 }
 return changed;
}
const api={tile,key,adjacent,route,step,advance};
root.LivingParkMovement=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
