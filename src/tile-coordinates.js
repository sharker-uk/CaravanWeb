/* LAND-1: pure coordinate addressing. No rendering or gameplay mutations.
 * Scene coordinates preserve the original park's tile indices.
 * External cells are stored separately; never use negative array indices.
 */
(function(root){
'use strict';
const W=root.CaravanConnectedWorld||(typeof require==='function'?require('./connected-world.js'):null);
const P=root.CaravanLandParcels||(typeof require==='function'?require('./land-parcels.js'):null);
const integer=n=>Number.isSafeInteger(n);
const key=(x,y)=>`${x},${y}`;
function address(x,y){
 if(!integer(x)||!integer(y))return null;
 if(W.inFarm(x,y))return {kind:'park',x,y,key:key(x,y)};
 const parcel=P.inParcel(x+.5,y+.5);
 return parcel?{kind:'external',x,y,parcelId:parcel.id,key:key(x,y)}:{kind:'village',x,y,key:key(x,y)};
}
function createStore(cells={}){
 const own=Object.create(null);
 for(const [k,v] of Object.entries(cells||{})){
  const parts=k.split(',');
  if(parts.length!==2||!parts.every(s=>/^-?\d+$/.test(s)))throw Error('Invalid external cell key');
  const [x,y]=parts.map(Number),a=address(x,y);
  if(!a||a.kind!=='external'||key(x,y)!==k)throw Error('External cell outside parcel');
  own[k]=v;
 }
 return own;
}
function get(state,x,y){
 const a=address(x,y);
 if(!a)return null;
 if(a.kind==='park')return state?.tiles?.[y]?.[x]??null;
 if(a.kind==='external')return state?.externalTiles?.[a.key]??null;
 return null;
}
function setExternal(state,x,y,tile){
 const a=address(x,y);
 if(!a||a.kind!=='external')throw Error('Not an external parcel tile');
 if(!P.canDevelopAt(state.land,x+.5,y+.5))throw Error('External parcel is not owned');
 if(!tile||typeof tile!=='object'||Array.isArray(tile))throw Error('Invalid tile');
 if(!state.externalTiles)state.externalTiles=Object.create(null);
 state.externalTiles[a.key]=tile;
 return tile;
}
function villagePoint(x,y,placement){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!placement?.toVillage)throw Error('Invalid world point');
 return placement.toVillage(x,y);
}
const api={address,key,createStore,get,setExternal,villagePoint};
root.CaravanTileCoordinates=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
