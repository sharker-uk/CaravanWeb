/* LP-MAP-1: proposed coastal farm geometry; no mutation of existing saves. */
(function(root){
'use strict';
const WORLD=Object.freeze({width:60,height:40,orientation:'road-west-sea-east'});
const STARTING_PLOT=Object.freeze({id:'original_farm',name:'Old Coastal Farm',x:8,y:12,w:39,h:16,owned:true,coastal:true});
const ROAD=Object.freeze({x:5,y:0,w:3,h:40,name:'Main road',public:true});
const FARMHOUSE=Object.freeze({x:9,y:17,w:3,h:3,side:'north-of-drive'});
const DRIVE=Object.freeze({from:{x:5,y:21},to:{x:44,y:21},kind:'rough_farm_track'});
const MAIN_BEACH_ROUTE=Object.freeze({from:{x:44,y:21},to:{x:49,y:21},kind:'rough_dune_path',availableAtStart:true,upgrade:'timber_gangway'});
const PARCELS=Object.freeze([
 Object.freeze({id:'north_west',name:'North Farm Field',x:8,y:3,w:18,h:9,coastal:false,beachAccess:'via_main_park'}),
 Object.freeze({id:'north_coastal',name:'North Coastal Field',x:26,y:3,w:21,h:9,coastal:true,beachAccess:'secondary'}),
 Object.freeze({id:'south_west',name:'South Farm Field',x:8,y:28,w:18,h:9,coastal:false,beachAccess:'via_main_park'}),
 Object.freeze({id:'south_coastal',name:'South Coastal Field',x:26,y:28,w:21,h:9,coastal:true,beachAccess:'secondary'}),
 Object.freeze({id:'roadside',name:'Roadside Field',x:0,y:3,w:5,h:12,coastal:false,beachAccess:'via_main_park',roadSeparated:true,uses:['parking','pitches']})
]);
function intersects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function touches(a,b){return (a.x+a.w===b.x||b.x+b.w===a.x)&&a.y<b.y+b.h&&a.y+a.h>b.y||(a.y+a.h===b.y||b.y+b.h===a.y)&&a.x<b.x+b.w&&a.x+a.w>b.x;}
function validate(){const errors=[];for(const p of PARCELS){if(intersects(p,STARTING_PLOT))errors.push(p.id+' overlaps starting farm');if(p.x<0||p.y<0||p.x+p.w>WORLD.width||p.y+p.h>WORLD.height)errors.push(p.id+' outside world');}if(!MAIN_BEACH_ROUTE.availableAtStart)errors.push('main beach route must exist from day one');return errors;}
const api=Object.freeze({WORLD,STARTING_PLOT,ROAD,FARMHOUSE,DRIVE,MAIN_BEACH_ROUTE,PARCELS,intersects,touches,validate});
root.CoastalFarmLayout=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
