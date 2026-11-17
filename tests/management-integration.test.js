const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function engine(){
    const storage=new Map(), elements=new Map();
    const noop=()=>{}, gradient={addColorStop:noop};
    const context=new Proxy({}, {get:(o,k)=>o[k]||(String(k).includes('Gradient')?()=>gradient:noop),set:(o,k,v)=>(o[k]=v,true)});
    const element=id=>{
        if(!elements.has(id))elements.set(id,{id,value:'',innerText:'',textContent:'',innerHTML:'',hidden:true,style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},getContext:()=>context,getBoundingClientRect:()=>({height:52}),addEventListener:noop,setAttribute:noop,querySelector:()=>null,querySelectorAll:()=>[],focus:noop});
        return elements.get(id);
    };
    const sandbox={console,Math,JSON,Date,Number,String,Boolean,Array,Object,Set,Map,Event:class{constructor(type){this.type=type;}},setTimeout:noop,setInterval:noop,clearTimeout:noop,requestAnimationFrame:noop,innerWidth:1300,innerHeight:900,addEventListener:noop,dispatchEvent:noop,confirm:()=>true,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},document:{body:{dataset:{management:'true'}},getElementById:element,querySelector:()=>element('query'),querySelectorAll:()=>[]}};
    sandbox.window=sandbox;const ctx=vm.createContext(sandbox);
    for(const file of ['park-services','static-caravans','game-rules','land-management','game-state','simulation-clock','construction','guest-parties','facility-operations','pitch-capabilities','save-migrations','economy','guest-activities','simulation','character-system','main','management-model','management-bridge'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file+'.js'),'utf8'),ctx,{filename:file+'.js'});
    return {api:sandbox.CaravanGame,ctx,storage,M:sandbox.ManagementModel,run:code=>vm.runInContext(code,ctx)};
}
test('developed scenario is valid game state with compliant pitches, connected statics and a reconciled opening balance',()=>{
    const e=engine();assert.equal(e.api.begin('developed').ok,true);const s=e.api.getState();
    assert.equal(s.pitches.length,12);assert.equal(s.caravans.length,4);assert.equal(s.facilities.length,7);assert.equal(s.cash,20000);assert.equal(s.isPaused,true);
    assert.equal(e.run('GameRulesApi.validateSaveData(JSON.parse(CaravanGame.getSave()))'),true);
    for(const p of s.pitches){const peers=s.pitches.filter(x=>x!==p);const valid=e.ctx.GameRules.validatePitchPlacement(p,s.tiles,peers,s.facilities);assert.equal(valid.valid,true,valid.reason);}
    for(const p of s.pitches.filter(p=>p.type==='gravel'))assert.equal(Object.values(e.ctx.ParkServices.getPitchHookups(p,s.tiles)).every(Boolean),true);
    assert.equal(e.api.getBalance().isValid,true);assert.equal(s.caravans.filter(v=>v.isBroken).length,1);
});
test('management repairs use the existing ledger, and repeat or unaffordable actions never charge again',()=>{
    const e=engine();e.api.begin('developed');const s=e.api.getState(),van=s.caravans.find(v=>v.isBroken);
    e.api.action('repair',van);assert.equal(s.cash,19960);assert.equal(van.isBroken,false);assert.equal(s.transactions.length,1);assert.equal(e.api.getBalance().isValid,true);
    e.api.action('repair',van);assert.equal(s.cash,19960);assert.equal(s.transactions.length,1);
    s.cash=20;const other=s.caravans[0];other.isBroken=true;e.api.action('repair',other);assert.equal(other.isBroken,true);assert.equal(s.cash,20);
});
test('construction validates actual terrain, reserves work and finishes on the game clock',()=>{
    const e=engine();e.api.begin('developed');const s=e.api.getState();
    e.api.build('path',{x:52,y:10},{x:53,y:10});assert.equal(s.cash,20000);assert.equal(s.constructions.length,0);
    e.api.build('path',{x:11,y:35},{x:13,y:35});assert.equal(s.cash,19970);assert.equal(s.constructions.length,1);assert.equal(s.tiles[35][11].path,false);
    e.run('update(1)');assert.equal(s.constructions.length,1); // paused
    e.api.pause();e.run('update(500)');assert.equal(s.constructions.length,0);assert.equal(s.tiles[35][11].path,true);assert.equal(e.api.getBalance().isValid,true);
});
test('timed maintenance and facility operating state follow existing simulation rules',()=>{
    const e=engine();e.api.begin('developed');const s=e.api.getState(),f=s.facilities[0];
    e.api.action('clean',f);assert.equal(s.cash,19982);assert.equal(s.maintenanceTask.action,'clean');assert.equal(s.maintenanceTask.hoursRemaining,2);
    e.api.action('clean',f);assert.equal(s.cash,19982);
    e.api.pause();e.run('update(500)');assert.equal(s.maintenanceTask,null);assert.ok(f.cleanliness>55);
    e.api.action('toggleFacility',f);assert.equal(f.isOperational,false);
});
test('presentation records and filters reflect occupancy, rental state and maintenance without mutating game entities',()=>{
    const e=engine();e.api.begin('developed');const s=e.api.getState(),before=JSON.stringify(s);
    let places=e.M.getPlaces(s);assert.equal(JSON.stringify(s),before);assert.equal(places.filter(p=>p.kind==='pitch').length,12);assert.equal(places.find(p=>p.van?.isBroken).status,'closed');
    const van=s.caravans[0];e.api.action('rental',van);places=e.M.getPlaces(s);assert.equal(places.find(p=>p.van===van).status,'closed');
    assert.equal(e.M.filterPlaces(places,{query:'pitch 09'}).length,1);assert.equal(e.M.filterPlaces(places,{category:'facility'}).length,7);
});
test('routes stay on real park paths, camera transforms invert, and build previews retain game minimums',()=>{
    const e=engine();e.api.begin('developed');const s=e.api.getState(),p=e.M.getPlaces(s).find(p=>p.name==='Pitch 09'),r=e.M.getRoute(s,p);
    assert.ok(r);for(const [x,y] of r.points){const t=s.tiles[Math.floor(y)][Math.floor(x)];assert.ok(t.path||t.road);}
    assert.equal(r.tiles,r.points.length-1);assert.equal(e.M.buildPreview('pitch_gravel',{x:10,y:30},{x:11,y:31},e.api.facilityDefinitions).cost,null);
    assert.equal(e.M.buildPreview('pitch_grass',{x:10,y:30},{x:13,y:35},e.api.facilityDefinitions).cost,100);
    assert.equal(e.M.buildPreview('utility_water',{x:9,y:3},{x:9,y:9},e.api.facilityDefinitions).cost,140);
    for(const rotation of [0,45,90,180,315])for(const tilt of [.8,1]){const c={x:570,y:400,zoom:.9,rotation,tilt},xy=e.M.project(700,300,c,1000,700),back=e.M.unproject(...xy,c,1000,700);assert.ok(Math.abs(back[0]-700)<1e-8);assert.ok(Math.abs(back[1]-300)<1e-8);}
});
test('save roundtrips preserve the schema, cash, pitch identities and caravan classes; rejected imports preserve the current game',()=>{
    const e=engine();e.api.begin('developed');e.api.action('repair',e.api.getState().caravans.find(v=>v.isBroken));const saved=e.api.getSave(),parsed=JSON.parse(saved);
    assert.equal(parsed.schemaVersion,12);e.api.begin('new');assert.equal(e.api.getState().cash,1500);assert.equal(e.api.getBackup(),saved);
    assert.equal(e.api.importSave(saved).ok,true);assert.equal(e.api.getState().cash,19960);assert.equal(e.api.getState().pitches.length,12);assert.equal(typeof e.api.getState().caravans[0].getDailyRent,'function');
    const before=e.api.getSave(),beforeState=e.api.getState();assert.equal(e.api.importSave('{bad json').ok,false);assert.equal(e.api.getSave(),before);assert.equal(e.api.getState(),beforeState);
    parsed.schemaVersion=999;assert.equal(e.api.importSave(JSON.stringify(parsed)).ok,false);assert.equal(e.api.getSave(),before);
});
test('management entry keeps classic scripts in dependency order and does not load a tileset',()=>{
    const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),classic=fs.readFileSync(path.join(__dirname,'../walkabout.html'),'utf8');
    assert.match(index,/data-management="true"/);assert.ok(index.indexOf('src/main.js')<index.indexOf('src/management-bridge.js'));assert.ok(index.indexOf('src/management-model.js')<index.indexOf('src/management-map.js'));assert.ok(!index.includes('src/asset-renderer.js'));assert.ok(classic.includes('src/asset-renderer.js'));assert.ok(!classic.includes('data-management="true"'));
});
test('a structurally broken save rolls back the live state and preserves the previous recovery backup',()=>{
    const e=engine();e.api.begin('developed');const developed=e.api.getSave();e.api.begin('new');const previous=e.api.getSave(),backup=e.api.getBackup(),state=e.api.getState();
    const bad=JSON.parse(developed);bad.caravans[0].pitchIndex=999;bad.caravans[0].pitchId='missing';
    assert.equal(e.api.importSave(JSON.stringify(bad)).ok,false);assert.equal(e.api.getState(),state);assert.equal(e.api.getSave(),previous);assert.equal(e.api.getBackup(),backup);
});
test('backup storage failure prevents scenario replacement',()=>{
    const e=engine();e.api.begin('developed');const state=e.api.getState(),original=e.api.getSave(),write=e.ctx.localStorage.setItem;
    e.ctx.localStorage.setItem=(key,value)=>{if(key==='caravan_tycoon_management_backup')throw new Error('Storage full');return write(key,value);};
    assert.equal(e.api.begin('new').ok,false);assert.equal(e.api.getState(),state);assert.equal(e.api.getSave(),original);
});
