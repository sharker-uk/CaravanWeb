/* LP-G1: visual-only registry. No game state or collision changes. */
(function(root){
'use strict';
const registry=Object.freeze({
 grass:Object.freeze({kind:'ground',states:['normal','overgrown','maintained']}),
 sand:Object.freeze({kind:'ground',states:['normal']}),
 water:Object.freeze({kind:'ground',states:['normal']}),
 tree:Object.freeze({kind:'nature',states:['standing','stump','removed'],interaction:'chop'}),
 debris:Object.freeze({kind:'nature',states:['scattered','removed'],interaction:'clear'}),
 hedge:Object.freeze({kind:'nature',states:['healthy','overgrown','removed']})
});
function hash(x,y,salt=0){let n=(Math.imul(x+71,73856093)^Math.imul(y+31,19349663)^Math.imul(salt+11,83492791))>>>0;return n%997;}
function tileVisual(tile,x,y){
 const t=tile||{};
 const terrain=t.terrain==='sand'?'sand':t.terrain==='water'?'water':'grass';
 const nature=t.nature==='tree'?'tree':t.nature==='debris'?'debris':null;
 return {terrain,nature,groundState:terrain==='grass'?(nature||hash(x,y,4)%9===0?'overgrown':hash(x,y,5)%7===0?'maintained':'normal'):'normal',natureState:nature==='tree'?'standing':nature==='debris'?'scattered':null};
}
function addGroundDetails(batch,tile,x,y,unit){
 const {bladesByColour,flowers}=batch;
 const v=tileVisual(tile,x,y);if(v.terrain!=='grass'||tile?.road||tile?.path)return;
 const seed=hash(x,y,8),cx=x*unit,cy=y*unit;
 const blades=v.groundState==='overgrown'?4:v.groundState==='maintained'?1:2;
 const colour=seed%3===0?'#78966a':'#8ca67b';
 for(let i=0;i<blades;i++){
  const px=cx+3+(hash(x+i,y,10+i)%14),py=cy+5+(hash(x,y+i,18+i)%12);
  const height=v.groundState==='overgrown'?5:3;
  bladesByColour[colour]+= `M${px} ${py}l-1 -${height}m1 ${height}l2 -${height-1}`;
 }
 if(seed%19===0&&v.groundState!=='maintained')flowers.push(`<circle cx="${cx+11}" cy="${cy+9}" r="1.2" fill="#d9c7a1"/><circle cx="${cx+13}" cy="${cy+10}" r=".8" fill="#e8dfc2"/>`);
}
function groundBatch(){
 return {bladesByColour:{'#78966a':'','#8ca67b':''},flowers:[]};
}
function renderGround(batch){
 return Object.entries(batch.bladesByColour).map(([colour,d])=>d?
  `<path d="${d}" fill="none" stroke="${colour}" stroke-width=".8" opacity=".68"/>`:'').join('')+batch.flowers.join('');
}
function groundDetails(tile,x,y,unit=20){
 const batch=groundBatch();
 addGroundDetails(batch,tile,x,y,unit);
 return renderGround(batch);
}
function groundRowDetails(row,y,unit=20){
 const batch=groundBatch();
 row.forEach((tile,x)=>addGroundDetails(batch,tile,x,y,unit));
 return renderGround(batch);
}
function tree(x,y,r=12,shade=0){
 const leaves=['#68875b','#738f61','#809968','#5c7d55'],a=leaves[shade%4],b=leaves[(shade+1)%4],c=leaves[(shade+2)%4];
 return `<g transform="translate(${x} ${y})"><ellipse cx="2" cy="6" rx="${r*.95}" ry="${r*.46}" fill="#324e3533"/><path d="M0 7V-8" stroke="#786b50" stroke-width="3.5"/><circle cx="-5" cy="-7" r="${r*.72}" fill="${b}"/><circle cx="6" cy="-8" r="${r*.75}" fill="${a}"/><circle cy="-15" r="${r*.82}" fill="${c}"/><path d="M-7 -19q4-4 9-2m1 6q4-3 8 0" fill="none" stroke="#c2d2a0" stroke-width="1.3" opacity=".42"/></g>`;
}
function debris(x,y,seed=0){
 const rot=seed%4*7;
 return `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse cy="4" rx="9" ry="3" fill="#53674b22"/><path d="M-8 3l4-7 4 8m-2-3 6-7 5 9" stroke="#987f5b" stroke-width="2" fill="none"/><path d="M-7 4l-2-4m12 4 4-5" stroke="#718c5d" stroke-width="1.6"/></g>`;
}
function natureGraphic(tile,x,y,unit=20){
 const v=tileVisual(tile,x,y),cx=x*unit+unit/2,cy=y*unit+unit*.6;
 if(v.nature==='tree')return tree(cx,cy,9+hash(x,y,2)%4,hash(x,y,3)%4);
 if(v.nature==='debris')return debris(cx,cy,hash(x,y,7));
 return '';
}
const api=Object.freeze({registry,hash,tileVisual,groundDetails,groundRowDetails,natureGraphic,tree,debris});
root.CaravanNatureAssets=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
