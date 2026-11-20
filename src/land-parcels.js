/* LAND-1: authoritative proposed external parcels in connected-world scene tiles.
 * Geometry only: ownership and construction remain in LandExpansion until migration.
 * Keeping these separate prevents advertising unbuildable land as purchased.
 */
(function(root){
'use strict';
const FARM={west:8,north:0,east:60,south:40};
const PARCELS=Object.freeze([
 Object.freeze({id:'north_field',name:'North Field',x:12,y:-10,w:18,h:10,side:'north',price:6000}),
 Object.freeze({id:'north_coastal',name:'North Coastal Field',x:32,y:-10,w:20,h:10,side:'north',price:9000}),
 Object.freeze({id:'south_field',name:'South Field',x:12,y:40,w:18,h:10,side:'south',price:6500}),
 Object.freeze({id:'south_coastal',name:'South Coastal Field',x:32,y:40,w:20,h:10,side:'south',price:9500}),
 Object.freeze({id:'across_road',name:'Roadside Field',x:-20,y:11,w:10,h:17,side:'west',price:8000})
]);
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function validate(parcels=PARCELS){
 const farm={x:FARM.west,y:FARM.north,w:FARM.east-FARM.west,h:FARM.south-FARM.north};
 const ids=new Set();
 for(const p of parcels){
  if(ids.has(p.id)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.w<=0||p.h<=0||overlaps(p,farm))return false;
  ids.add(p.id);
 }
 return parcels.every((p,i)=>parcels.slice(i+1).every(q=>!overlaps(p,q)));
}
/* Legacy rights are mapped by ID, never inferred from occupied tiles. */
const LEGACY_RIGHTS=Object.freeze({meadow:'north_field',dunes:'north_coastal'});
function migrateOwnedIds(ids){
 const known=new Set(PARCELS.map(p=>p.id));
 const source=Array.isArray(ids)?ids:[];
 return [...new Set(source.map(id=>LEGACY_RIGHTS[id]||id).filter(id=>known.has(id)))];
}
function ownsParcel(land,id){return migrateOwnedIds(land?.ownedPlotIds).includes(id);}
function canDevelopAt(land,x,y){
 const parcel=inParcel(x,y);
 return Boolean(parcel&&land?.enabled===true&&ownsParcel(land,parcel.id));
}
function inParcel(x,y){return PARCELS.find(p=>x>=p.x&&x<p.x+p.w&&y>=p.y&&y<p.y+p.h)||null;}
function toVillage(parcel,placement){
 if(!placement||typeof placement.toVillage!=='function')throw Error('Connected-world placement required');
 const [x,y]=placement.toVillage(parcel.x,parcel.y);
 const [east,south]=placement.toVillage(parcel.x+parcel.w,parcel.y+parcel.h);
 return {...parcel,x,y,w:east-x,h:south-y};
}
const api={FARM,PARCELS,LEGACY_RIGHTS,validate,inParcel,toVillage,migrateOwnedIds,ownsParcel,canDevelopAt};
if(!validate())throw Error('External land parcels overlap starting farm or one another');
root.CaravanLandParcels=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
