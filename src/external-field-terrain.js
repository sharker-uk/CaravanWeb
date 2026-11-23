/* LAND-2 foundation: deterministic, separately addressable external terrain.
 * Never expand or re-index the legacy 60x40 park tile array.
 * Walking is independent of ownership; development requires title.
 */
(function(root){
'use strict';
const Parcels=root.CaravanLandParcels;
const VERSION=1;
const key=(x,y)=>x+','+y;
function isEntrance(id,x,y){return id==='south_field'&&y===40;}
function initialNature(id,x,y){
 if(isEntrance(id,x,y))return null;
 // Stable per-tile distribution; no Math.random or hidden save mutations.
 let n=2166136261;
 for(const c of id+':'+key(x,y))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 if(id==='south_field'&&x>=17&&x<=20&&y>=43&&y<=46)return 'barn';
 return n%11===0?'tree':n%7===0?'debris':null;
}
function createParcel(id){
 const p=Parcels.PARCELS.find(p=>p.id===id);
 if(!p)throw Error('Unknown external parcel');
 const tiles={};
 for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++){
  const nature=initialNature(id,x,y);
  if(nature)tiles[key(x,y)]={nature};
 }
 return {version:VERSION,tiles};
}
function normalise(raw,id){
 const base=createParcel(id),p=Parcels.PARCELS.find(p=>p.id===id);
 if(!raw||raw.version!==VERSION||!raw.tiles||typeof raw.tiles!=='object'||Array.isArray(raw.tiles))return base;
 const tiles={};
 for(const [coord,tile] of Object.entries(raw.tiles)){
  const match=/^(-?\\d+),(-?\\d+)$/.exec(coord);
  if(!match||!tile||typeof tile!=='object')continue;
  const x=Number(match[1]),y=Number(match[2]);
  if(x<p.x||x>=p.x+p.w||y<p.y||y>=p.y+p.h)continue;
  if(![null,'tree','debris','barn'].includes(tile.nature))continue;
  tiles[coord]={nature:tile.nature||null,path:tile.path===true,road:tile.road===true};
 }
 return {version:VERSION,tiles};
}
function ensure(state,id){
 if(!state.externalTerrain||typeof state.externalTerrain!=='object')state.externalTerrain={};
 if(!state.externalTerrain[id])state.externalTerrain[id]=createParcel(id);
 else state.externalTerrain[id]=normalise(state.externalTerrain[id],id);
 return state.externalTerrain[id];
}
function getTile(state,x,y){
 const p=Parcels.inParcel(x,y);if(!p)return null;
 const terrain=state.externalTerrain?.[p.id];
 const saved=terrain?.tiles?.[key(x,y)];
 if(isEntrance(p.id,x,y))return {...(saved||{}),nature:null};
 return saved||{nature:initialNature(p.id,x,y),path:false,road:false};
}
function canEnter(state,x,y){
 const p=Parcels.inParcel(x,y);
 if(!p)return false;
 const tile=getTile(state,x,y);
 return !['tree','debris','barn'].includes(tile.nature);
}
function clear(state,x,y){
 const p=Parcels.inParcel(x,y);
 if(!p||!Parcels.canDevelopAt(state.land,x,y))return {ok:false,reason:'Land is not owned'};
 const tile=getTile(state,x,y);
 if(!['tree','debris'].includes(tile.nature))return {ok:false,reason:'Nothing to clear'};
 const terrain=ensure(state,p.id);
 terrain.tiles[key(x,y)]={...tile,nature:null};
 return {ok:true,nature:tile.nature};
}
const api={VERSION,isEntrance,createParcel,normalise,ensure,getTile,canEnter,clear,initialNature};
root.CaravanExternalTerrain=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
