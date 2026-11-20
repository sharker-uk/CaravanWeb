/* WW1: deterministic village walking, independent of rendering and park saves. */
(function(root){
'use strict';
const distanceToSegment=(x,y,a,b)=>{
 const dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy;
 const t=d?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/d)):0;
 return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
};
function canWalk(world,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>world.bounds.w||y>world.bounds.h)return false;
 // WW1 allows roads and their shoulders; WW2 will add proper pavement polygons.
 const onRoad=world.roads.some(r=>world.nodes[r.a]&&world.nodes[r.b]&&distanceToSegment(x,y,world.nodes[r.a],world.nodes[r.b])<=Math.max(14,r.width*.75));
 if(!onRoad)return false;
 // Do not pass through buildings even where they overlap a road shoulder.
 return !(world.buildings||[]).some(b=>x>=b.x-4&&x<=b.x+b.w+4&&y>=b.y-4&&y<=b.y+b.h+4);
}
function advance(world,player,dt,input,speed=105){
 if(!Number.isFinite(dt)||dt<=0)return false;
 let dx=Number(Boolean(input.right))-Number(Boolean(input.left)),dy=Number(Boolean(input.down))-Number(Boolean(input.up));
 const length=Math.hypot(dx,dy);if(!length)return false;
 dx/=length;dy/=length;
 const step=Math.min(.05,dt)*speed;
 let moved=false;
 const nx=player.x+dx*step,ny=player.y+dy*step;
 if(canWalk(world,nx,player.y)){player.x=nx;moved=true;}
 if(canWalk(world,player.x,ny)){player.y=ny;moved=true;}
 return moved;
}
const api={canWalk,advance,distanceToSegment};
root.CaravanVillageMovement=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
