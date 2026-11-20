/* LAND-2 coastal visuals only: no terrain, ownership, movement or save mutations.
 * Reuses the source PNG shore/sea/grass artwork already in assets/source/nature.
 */
(function(root){
'use strict';
const art='assets/source/nature/';
const png=name=>art+name+'.png';
function boundary(x,top,height,phase,amplitude){
 let d=`M${x.toFixed(2)} ${top}`;
 for(let y=top;y<top+height;y+=24){
  const next=Math.min(top+height,y+24),mid=(y+next)/2;
  const wave=t=>Math.sin(t*.009+phase)*amplitude+Math.sin(t*.027+phase*1.7)*amplitude*.32;
  d+=` Q${(x+wave(mid)).toFixed(2)} ${mid.toFixed(2)} ${(x+wave(next)).toFixed(2)} ${next.toFixed(2)}`;
 }
 return d;
}
function render({shore,top=-2400,worldHeight=4800,beachWidth=150}={}){
 if(![shore,top,worldHeight,beachWidth].every(Number.isFinite)||worldHeight<=0||beachWidth<45)return '';
 const dunes=shore+beachWidth*.22,water=shore+beachWidth;
 const landLine=boundary(dunes,top,worldHeight,.7,beachWidth*.09);
 const waterLine=boundary(water,top,worldHeight,1.6,beachWidth*.12);
 const bottom=top+worldHeight;
 // Background extends to the right of the viewport, then the dune/beach mask
 // follows deterministic SVG curves. Patterns use existing uploaded PNGs.
 return `<g id="mg-organic-coast" pointer-events="none">
 <defs>
 <pattern id="mg-coast-sand" width="64" height="64" patternUnits="userSpaceOnUse"><image href="${png('beach_main')}" width="64" height="64" preserveAspectRatio="none"/></pattern>
 <pattern id="mg-coast-sea" width="96" height="96" patternUnits="userSpaceOnUse"><image href="${png('sea')}" width="96" height="96" preserveAspectRatio="none"/></pattern>
 <pattern id="mg-coast-dune" width="64" height="64" patternUnits="userSpaceOnUse"><image href="${png('Grass003')}" width="64" height="64" preserveAspectRatio="none"/></pattern>
 </defs>
 <path d="${landLine} L${water+2500} ${bottom} L${water+2500} ${top} Z" fill="#e4d5ac"/>
 <path d="${landLine} L${water+2500} ${bottom} L${water+2500} ${top} Z" fill="url(#mg-coast-sand)" opacity=".55"/>
 <path d="${landLine} L${dunes+beachWidth*.12} ${bottom} L${dunes+beachWidth*.12} ${top} Z" fill="url(#mg-coast-dune)" opacity=".20"/>
 <path d="${waterLine} L${water+2500} ${bottom} L${water+2500} ${top} Z" fill="#a7cbd0"/>
 <path d="${waterLine} L${water+2500} ${bottom} L${water+2500} ${top} Z" fill="url(#mg-coast-sea)" opacity=".55"/>
 <path d="${waterLine}" stroke="#f2eee0" stroke-width="5" opacity=".7" fill="none"/>
 </g>`;
}
const api={render,boundary};
root.CaravanCoastalArt=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
