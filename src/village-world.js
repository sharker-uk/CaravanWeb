(function(root){
'use strict';
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function graph(world){return world.roads.map(r=>({...r,length:distance(world.nodes[r.a],world.nodes[r.b])}));}
function route(world,from,to,closed=[]){
 if(!world.nodes[from]||!world.nodes[to])return null;if(from===to)return [];
 const roads=graph(world).filter(r=>!closed.includes(r.id)),cost=new Map([[from,0]]),previous=new Map(),pending=new Set(Object.keys(world.nodes));
 while(pending.size){let u=null;for(const id of pending)if(cost.has(id)&&(u===null||cost.get(id)<cost.get(u)))u=id;if(u===null)break;pending.delete(u);if(u===to)break;for(const r of roads){const v=r.a===u?r.b:r.b===u?r.a:null;if(!v||!pending.has(v))continue;const n=cost.get(u)+r.length/r.speed;if(!cost.has(v)||n<cost.get(v)){cost.set(v,n);previous.set(v,{from:u,road:r.id,forward:r.a===u});}}}
 if(!previous.has(to))return null;const result=[];for(let v=to;v!==from;){const p=previous.get(v);result.unshift({road:p.road,forward:p.forward});v=p.from;}return result;
}
function parkSummary(save){return {pitches:Array.isArray(save?.pitches)?save.pitches.length:0,occupied:Array.isArray(save?.guests)?save.guests.length:0,guests:(save?.guests||[]).reduce((n,g)=>n+(Number(g.party?.headcount)||1),0),cash:Number(save?.cash)||0};}
function createSimulation(world,summary={pitches:0,occupied:0}){
 const roads=graph(world),byId=new Map(roads.map(r=>[r.id,r]));
 return {world,roads,byId,summary,time:0,spawnClock:0,cars:[],sequence:0,completed:0,totalDelay:0,mode:'park',bypassWorks:false,paused:false};
}
function signal(sim,forward){const phase=sim.time%28;return forward?phase<8:phase>=14&&phase<22;}
function spawn(sim){
 const n=sim.sequence++,routes=[['north','south','Through'],['south','north','Through'],['south','beach','Village'],['beach','north','Village'],['north','parkGate','Guest'],['parkGate','south','Guest'],['west','beach','Service'],['south','parkGate','Guest']];
 const choice=routes[n%routes.length];
 if(choice[2]==='Guest'&&sim.mode==='park'&&!sim.summary.pitches)return;
 const steps=route(sim.world,choice[0],choice[1],sim.bypassWorks?['bypass']:[]);if(!steps?.length)return;
 const first=steps[0];if(sim.cars.some(c=>c.route[c.step].road===first.road&&c.route[c.step].forward===first.forward&&c.progress<c.length+12))return;
 const free=steps.reduce((t,p)=>{const r=sim.byId.get(p.road);return t+r.length/r.speed;},0);
 sim.cars.push({id:n,route:steps,step:0,progress:0,kind:choice[2],startedAt:sim.time,freeTime:free,wait:0,speed:0,length:choice[2]==='Guest'?21:choice[2]==='Service'?20:13});
}
function canEnter(sim,car,step){
 const r=sim.byId.get(step.road);
 if(r.singleLane&&(!signal(sim,step.forward)||sim.cars.some(c=>c!==car&&c.route[c.step].road===r.id&&c.route[c.step].forward!==step.forward)))return false;
 return !sim.cars.some(c=>c!==car&&c.route[c.step].road===r.id&&c.route[c.step].forward===step.forward&&c.progress<c.length+12);
}
function advance(sim,seconds){
 if(sim.paused||!Number.isFinite(seconds)||seconds<=0)return sim;
 // Small deterministic steps keep signals and following gaps stable after slow frames.
 for(let left=Math.min(seconds,60);left>1e-9;){const dt=Math.min(.1,left);left-=dt;sim.time+=dt;sim.spawnClock+=dt;
 const flow=sim.mode==='changeover'?.38:Math.max(.7,1.8-Math.min(sim.summary.pitches,60)*.014-Math.min(sim.summary.occupied,40)*.02);
 while(sim.spawnClock>=flow){sim.spawnClock-=flow;if(sim.cars.length<85)spawn(sim);}
 const finished=[];
 for(const car of [...sim.cars].sort((a,b)=>b.progress-a.progress)){
  const step=car.route[car.step],r=sim.byId.get(step.road);let move=r.speed*dt;
  for(const lead of sim.cars)if(lead!==car&&lead.route[lead.step].road===r.id&&lead.route[lead.step].forward===step.forward&&lead.progress>car.progress)move=Math.min(move,Math.max(0,lead.progress-car.progress-lead.length-10));
  const before=car.progress;car.progress=Math.min(r.length,car.progress+move);
  if(car.progress>=r.length){const next=car.route[car.step+1];if(!next){finished.push(car);sim.completed++;sim.totalDelay+=Math.max(0,sim.time-car.startedAt-car.freeTime);}else if(canEnter(sim,car,next)){car.step++;car.progress=0;}else car.progress=r.length-.01;}
  car.speed=Math.max(0,car.progress-before)/dt;if(car.speed<2)car.wait+=dt;
 }
 sim.cars=sim.cars.filter(c=>!finished.includes(c));
 }
 return sim;
}
function position(sim,car){const step=car.route[car.step],r=sim.byId.get(step.road),a=sim.world.nodes[step.forward?r.a:r.b],b=sim.world.nodes[step.forward?r.b:r.a],t=car.progress/r.length,dx=(b[0]-a[0])/r.length,dy=(b[1]-a[1])/r.length;const lane=r.singleLane?0:4;return {x:a[0]+(b[0]-a[0])*t+dy*lane,y:a[1]+(b[1]-a[1])*t-dx*lane,angle:Math.atan2(dy,dx)*180/Math.PI};}
function metrics(sim){const queued=sim.cars.filter(c=>c.speed<2&&c.wait>1).length;return {vehicles:sim.cars.length,queued,completed:sim.completed,meanDelay:sim.completed?Math.round(sim.totalDelay/sim.completed):0,pressure:queued>12?'High':queued>4?'Building':'Low'};}
const api={graph,route,parkSummary,createSimulation,advance,signal,position,metrics};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.VillageWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this);
