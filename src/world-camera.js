/* Camera framing for a continuous coastal world. Pure functions are testable without DOM. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function target(player,viewport={width:1200,height:800}){
 const zoom=clamp(Math.min(viewport.width/850,viewport.height/650),.72,1.65);
 return {x:player.x*20,y:player.y*20,zoom};
}
function smooth(current,next,dt){
 const factor=1-Math.exp(-Math.max(0,dt)*2.5);
 return {x:current.x+(next.x-current.x)*factor,y:current.y+(next.y-current.y)*factor,zoom:current.zoom+(next.zoom-current.zoom)*factor};
}
const api={target,smooth};root.CaravanWorldCamera=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
