/* Controlled two-region crossing. Transfer is transient, park save remains authoritative. */
(function(root){
'use strict';
const KEY='caravanweb_region_transfer_v1';
const GATE={park:{x:1.5,y:21.5},villageNode:'parkGate',parkRange:{minY:18,maxY:25},triggerX:2.5};
function canExit(player,left){return Boolean(left&&Number.isFinite(player?.x)&&Number.isFinite(player?.y)&&player.x<=GATE.triggerX&&player.y>=GATE.parkRange.minY&&player.y<=GATE.parkRange.maxY);}
function write(storage,region){if(!['village','park'].includes(region))throw Error('Unknown destination');storage.setItem(KEY,JSON.stringify({version:1,region}));}
function consume(storage,region){let data;try{data=JSON.parse(storage.getItem(KEY)||'null');}catch{}storage.removeItem(KEY);return data?.version===1&&data.region===region;}
const api={KEY,GATE,canExit,write,consume};root.CaravanRegionGate=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
