/* LP-MAP-1: village-anchored farm concept; the village remains authoritative. */
(function(root){
'use strict';
const VILLAGE_WORLD='data/village-world.json';
function plan(world){
 if(!world||!world.park||!world.nodes?.parkGate)throw Error('Village park anchor is required');
 const p=world.park,road=world.nodes.parkTurn,gate=world.nodes.parkGate;
 const strip={x:p.x,y:p.y,w:p.w,h:p.h};
 // Village coordinates, not an independent 60x40 map.
 const fields=[
  {id:'north_field',name:'North Field',x:p.x+55,y:p.y-48,w:130,h:48,side:'north'},
  {id:'north_coastal',name:'North Coastal Field',x:p.x+195,y:p.y-48,w:135,h:48,side:'north',secondaryBeach:true},
  {id:'south_field',name:'South Field',x:p.x+55,y:p.y+p.h,w:130,h:45,side:'south'},
  {id:'south_coastal',name:'South Coastal Field',x:p.x+195,y:p.y+p.h,w:135,h:45,side:'south',secondaryBeach:true},
  {id:'across_road',name:'Roadside Field',x:road[0]-105,y:gate[1]-75,w:75,h:110,side:'west',roadCrossing:true}
 ];
 return {villageId:world.id,worldBounds:world.bounds,park:strip,entrance:{road,gate},farmhouse:{x:p.x+35,y:gate[1]-35},mainBeachAccess:{side:'east',availableAtStart:true,quality:'rough',upgrade:'gangway'},fields,shopsInVillage:true};
}
const api={VILLAGE_WORLD,plan};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CoastalFarmLayout=api;
})(typeof window!=='undefined'?window:globalThis);
