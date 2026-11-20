/* Camera framing for a continuous coastal world. Pure functions are testable without DOM. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function target(player,viewport={width:1200,height:800},options={}){
 const x=Number(player?.x)||0,y=Number(player?.y)||0;
 const px=x*20,py=y*20;
 // The west park entrance is the transition to the village; zoom out
 // smoothly before reaching it, retaining detail when further inside.
 const edge=clamp((x-3)/15,0,1);
 const easing=edge*edge*(3-2*edge);
 const parkZoom=clamp(Math.min(viewport.width/850,viewport.height/650),.72,1.65);
 const villageZoom=clamp(Math.min(viewport.width/1800,viewport.height/1100),.32,.75);
 const zoom=villageZoom+(parkZoom-villageZoom)*easing;
 // Offset towards the road to reveal the village as the player approaches.
 const lookAhead=(1-easing)*Math.min(250,viewport.width*.25)/zoom;
 return {x:px-lookAhead,y:py,zoom,region:edge<.35?'entrance':edge<.85?'transition':'park'};
}
function smooth(current,next,dt){
 const factor=1-Math.exp(-Math.max(0,dt)*4.5);
 return {x:current.x+(next.x-current.x)*factor,y:current.y+(next.y-current.y)*factor,zoom:current.zoom+(next.zoom-current.zoom)*factor};
}
const api={target,smooth};root.CaravanWorldCamera=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
