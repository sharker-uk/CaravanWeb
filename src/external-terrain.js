/* LAND-1: deterministic external terrain, separate from legacy park tiles.
 * No mutation of the 60x40 park array or village road surfaces.
 */
(function(root){
'use strict';
const coords=root.CaravanTileCoordinates||(typeof require==='function'?require('./tile-coordinates.js'):null);
const parcels=root.CaravanLandParcels||(typeof require==='function'?require('./land-parcels.js'):null);
const TYPES=['grass','sand','water'];
const UTILITY_TYPES=['gas','water','electricity','waste'];
function validTile(t){
 return Boolean(t&&typeof t==='object'&&!Array.isArray(t)&&TYPES.includes(t.terrain)&&
 (t.nature==null||t.nature==='tree'||t.nature==='debris')&&
 (t.road===undefined||typeof t.road==='boolean')&&
 (t.path===undefined||typeof t.path==='boolean')&&
 (t.utilities===undefined||(t.utilities&&typeof t.utilities==='object'&&!Array.isArray(t.utilities)&&
 UTILITY_TYPES.every(k=>t.utilities[k]===undefined||typeof t.utilities[k]==='boolean'))));
}
function seed(x,y){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^0x6d2b79f5;h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;}
function defaultTile(x,y){
 const a=coords.address(x,y);
 if(a?.kind!=='external')return null;
 const v=seed(x,y)%100;
 return {terrain:'grass',nature:v<11?'tree':v<24?'debris':null,road:false,path:false,
 utilities:{gas:false,water:false,electricity:false,waste:false}};
}
function read(state,x,y){
 const a=coords.address(x,y);
 if(a?.kind!=='external')return null;
 return state?.externalTiles?.[a.key]??defaultTile(x,y);
}
function restore(raw){
 if(raw===undefined||raw===null)return Object.create(null);
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid external terrain store');
 const store=coords.createStore(raw);
 for(const tile of Object.values(store))if(!validTile(tile))throw Error('Invalid external terrain tile');
 return store;
}
function write(state,x,y,tile){
 if(!validTile(tile))throw Error('Invalid external terrain tile');
 return coords.setExternal(state,x,y,tile);
}
function snapshot(state){return restore(state?.externalTiles);}
const api={validTile,defaultTile,read,restore,write,snapshot};
root.CaravanExternalTerrain=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
