/* LAND-1 field dressing preview. Polygon outlines are visual only.
 * Rectangular parcel extents remain the source of ownership and build permissions.
 */
(function(root){
'use strict';
const polygons={
 north_field:[[0,0],[.23,.03],[.46,0],[.69,.04],[1,0],[1,1],[0,1]],
 north_coastal:[[0,0],[.20,.03],[.39,0],[.58,.04],[.77,.01],[1,0],[1,1],[0,1]],
 south_field:[[0,0],[1,0],[1,.94],[.77,.97],[.56,.92],[.31,.99],[.12,.95],[0,1]],
 south_coastal:[[0,0],[1,0],[1,.94],[.78,.99],[.58,.93],[.38,.98],[.18,.94],[0,.98]],
 across_road:[[.06,0],[1,0],[1,1],[.89,.97],[.77,1],[.53,.96],[.28,.99],[0,.91],[.04,.55],[0,.27]]
};
function polygon(p){
 const pts=polygons[p.id];
 if(!pts)throw Error('Unknown field');
 return pts.map(([u,v])=>[p.x+p.w*u,p.y+p.h*v]);
}
function path(p,unit){
 return polygon(p).map(([x,y],i)=>`${i?'L':'M'}${(x*unit).toFixed(1)} ${(y*unit).toFixed(1)}`).join(' ')+' Z';
}
function rand(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function hash(s){let n=2166136261;for(const c of s){n=Math.imul(n^c.charCodeAt(0),16777619);}return n>>>0;}
function render(p,{unit=20,owned=false}={}){
 const x=p.x*unit,y=p.y*unit,w=p.w*unit,h=p.h*unit;
 const d=path(p,unit),random=rand(hash(p.id));
 const id='field-clip-'+p.id;
 let scrub='';
 // Sparse grass, scrub and scattered saplings. Deliberately leave open ground.
 for(let i=0;i<Math.floor(p.w*p.h/14);i++){
  const px=x+12+random()*(w-24),py=y+12+random()*(h-24);
  const radius=2+random()*4;
  scrub+=`<g opacity=".7"><path d="M${px.toFixed(1)} ${py.toFixed(1)}l-3 -4m3 4l4 -5" stroke="#80976d" stroke-width="1.4" fill="none"/>${i%5===0?`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${radius.toFixed(1)}" fill="#7f9b6c" opacity=".8"/>`:''}</g>`;
 }
 // An old farm outbuilding is scenery only until a later renovation milestone.
 const barn=p.id==='south_field'? `<g transform="translate(${(x+w*.43).toFixed(1)} ${(y+h*.45).toFixed(1)})"><rect x="-30" y="-19" width="60" height="38" fill="#a39579" stroke="#756f5b" stroke-width="2"/><path d="M-34 -19L0 -36 34 -19Z" fill="#8b7868" stroke="#655b51" stroke-width="2"/><path d="M-11 19V-5H12V19" fill="#605b4f"/><path d="M-8 -1l17 16m0-16l-17 16" stroke="#a99c83" stroke-width="2"/><rect x="17" y="-9" width="8" height="8" fill="#5b6963"/><text x="0" y="35" text-anchor="middle" font-size="10" fill="#4d5d40" paint-order="stroke" stroke="#e7e5cc" stroke-width="3">OLD BARN · FUTURE RENOVATION</text></g>`:'';
 return `<g class="land-1-shaped-field" pointer-events="none">
 <defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>
 <path d="${d}" fill="${owned?'#90a67c22':'#b5ad7930'}" stroke="none"/>
 <g clip-path="url(#${id})">${scrub}${barn}</g>
 <path d="${d}" fill="none" stroke="#6d7650" stroke-width="5" stroke-linejoin="round" stroke-dasharray="17 5 3 5"/>
 <path d="${d}" fill="none" stroke="#a7ad7e" stroke-width="1.5" stroke-linejoin="round"/>
 <rect x="${x+7}" y="${y+7}" width="${w-14}" height="${h-14}" fill="none" stroke="#a18e59" stroke-width="1.5" stroke-dasharray="7 7" opacity=".6"/>
 <text x="${x+13}" y="${y+23}" font-size="12" font-weight="bold" fill="#40553a" paint-order="stroke" stroke="#eee9d2" stroke-width="3">${p.name.toUpperCase()} · ${owned?'OWNED':'FOR SALE · PREVIEW'}</text>
 </g>`;
}
const api={polygon,path,render};
root.CaravanFieldArt=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
