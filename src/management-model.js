(function (root) {
    'use strict';
    const services = root.ParkServices || (typeof require === 'function' ? require('./park-services.js') : null);
    const statics = root.StaticCaravans || (typeof require === 'function' ? require('./static-caravans.js') : null);
    const facilities = root.FacilityOperations || (typeof require === 'function' ? require('./facility-operations.js') : null);
    const capabilities = root.PitchCapabilities || (typeof require === 'function' ? require('./pitch-capabilities.js') : null);
    const rules = root.GameRules || (typeof require === 'function' ? require('./game-rules.js') : null);
    const land = root.LandExpansion || (typeof require === 'function' ? require('./land-expansion.js') : null);
    const names = {toilets:'Toilet block',showers:'Shower block',laundry:'Laundry',shop:'Park shop',playground:'Playground',pub:'Pub',restaurant:'Restaurant',arcade:'Arcade',entertainment_space:'Events space',pool:'Pool',activity_centre:'Activity centre',entertainment_hub:'Entertainment hub'};
    const symbols = {toilets:'WC',showers:'SH',laundry:'L',shop:'S',playground:'P',pub:'PB',restaurant:'R',arcade:'A',pool:'PL',farmhouse:'H',firewood_stall:'£',rusty_resales:'R',fiddl_shop:'F',job_centre:'J',for_sale:'£'};
    function getPlaces(state) {
        const index = capabilities.rebuild(state);
        const pitches = (state.pitches || []).map((pitch, i) => {
            const van = statics.findInstalledVan(state, pitch), guest = (state.guests || []).find(g => g.pitch === pitch);
            const capability = index.records.find(r => r.pitch === pitch);
            const blocked = van && (van.isBroken || van.isOperational === false);
            const status = pitch.occupied ? 'occupied' : blocked ? 'closed' : capability.availability;
            return {id:'pitch:' + (pitch.id || `${pitch.x}-${pitch.y}`),name:`Pitch ${String(i+1).padStart(2,'0')}`,kind:'pitch',type:van?'static':pitch.type==='gravel'?'touring':'grass',status,entity:pitch,van,guest,capability,x:pitch.x,y:pitch.y,w:pitch.w,h:pitch.h,symbol:van?'S':pitch.type==='gravel'?'T':'G',label:van ? statics.getModel(van.modelId)?.name || 'Static caravan' : pitch.type==='gravel'?'Hardstanding pitch':'Grass pitch'};
        });
        const buildings = (state.facilities || []).map((f,i) => ({id:`facility:${f.type}:${f.x}:${f.y}`,name:f.name || ((state.facilities || []).filter(item=>item.type===f.type).length>1 ? (names[f.type] || f.type)+' '+String((state.facilities || []).slice(0,i+1).filter(item=>item.type===f.type).length).padStart(2,'0') : names[f.type] || f.type),kind:'facility',type:f.type,status:facilities.isFacilityOperational(f)?'open':'closed',entity:f,x:f.x,y:f.y,w:f.w,h:f.h,symbol:symbols[f.type] || 'F',label:`${f.capacity || 0} guests / hour`,index:i}));
        const landmarks = (state.landmarks || []).map(l => ({id:`landmark:${l.type}:${l.x}:${l.y}`,name:l.name,kind:'landmark',type:l.type,status:l.type==='for_sale'?'unavailable':'open',entity:l,x:l.x,y:l.y,w:l.w,h:l.h,symbol:symbols[l.type] || 'i',label:l.subtitle || 'Around the park'}));
        for(const p of landmarks){
            if(p.type==='land_plot'){const q=land.purchaseQuote(state,p.entity.plotId);p.id='land:'+p.entity.plotId;p.kind='land';p.status=q.plot.owned?'owned':q.plot.requires.some(id=>!state.land.ownedPlotIds.includes(id))?'locked':'for_sale';p.symbol='£';p.label=q.plot.owned?'Owned · Ready to develop':`£${q.price.toLocaleString('en-GB')} · ${p.w*p.h} tiles`;p.quote=q;}
            if(p.type==='beach_gate'){p.id='land:beach';p.kind='land';p.status=land.beachStatus(state).status;p.symbol='B';p.label=state.land.beach.purchased?`Beach access · ${p.status}`:'£2,500 · Coastal path & gate';}
        }
        return [...pitches, ...buildings, ...landmarks];
    }
    function filterPlaces(places, {query='',category='all',status='all',savedOnly=false,saved=[]}={}) {
        const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
        return places.filter(p => (category==='all' || p.kind===category) && (status==='all' || p.status===status) && (!savedOnly || saved.includes(p.id)) && words.every(w => `${p.name} ${p.label} ${p.type} ${p.entity.id || ''}`.toLowerCase().includes(w)));
    }
    function getAlerts(state, places=getPlaces(state)) {
        const result=[];
        if (!state.pitches.length) result.push({title:'Your first pitch',text:'Lay a path, add a grass pitch and build toilets to welcome overnight guests.',kind:'build'});
        if (!state.facilities.some(f=>f.type==='toilets' && facilities.isFacilityOperational(f))) result.push({title:'Toilets are essential',text:'Bookings need an operational toilet block with enough capacity.',kind:'build'});
        for(const p of places) {
            if(p.van?.isBroken) result.push({title:`${p.name} needs repair`,text:'A broken caravan cannot accept new bookings.',place:p.id});
            if(p.kind==='facility' && p.type==='toilets' && (p.entity.cleanliness<60 || p.entity.wear<50 || p.status==='closed')) result.push({title:`${p.name} needs attention`,text:`${Math.round(p.entity.cleanliness)}% clean · ${Math.round(p.entity.wear)}% condition`,place:p.id});
            if(p.van && !Object.values(p.capability.utilities).every(Boolean)) result.push({title:`${p.name} has missing hookups`,text:'Statics need connected gas, water, electricity and waste.',place:p.id});
        }
        if(state.cash<500) result.push({title:'Cash is running low',text:'Check the ledger and running costs before building more.',kind:'finances'});
        return result;
    }
    function project(x,y,c,w,h){const a=c.rotation*Math.PI/180,dx=x-c.x,dy=y-c.y;return [w/2+(dx*Math.cos(a)-dy*Math.sin(a))*c.zoom,h/2+(dx*Math.sin(a)+dy*Math.cos(a))*c.zoom*c.tilt];}
    function unproject(x,y,c,w,h){const a=-c.rotation*Math.PI/180,dx=(x-w/2)/c.zoom,dy=(y-h/2)/(c.zoom*c.tilt);return [c.x+dx*Math.cos(a)-dy*Math.sin(a),c.y+dx*Math.sin(a)+dy*Math.cos(a)];}
    function getRoute(state, place) {
        if(!place || ['for_sale','land_plot'].includes(place.type)) return null;
        const blocked=(x,y)=>(state.facilities||[]).some(f=>x>=f.x&&y>=f.y&&x<f.x+f.w&&y<f.y+f.h)||(state.landmarks||[]).some(l=>l.blocksMovement&&x>=l.x&&y>=l.y&&x<l.x+l.w&&y<l.y+l.h);
        const routeTiles=[];
        state.tiles.forEach((row,y)=>row.forEach((t,x)=>{if((t.path||t.road)&&t.nature!=='tree'&&!blocked(x,y))routeTiles.push([x,y]);}));
        if(!routeTiles.length)return null;
        const home=state.landmarks?.find(l=>l.type==='farmhouse');
        const origin=home?[home.x+home.w/2,home.y+home.h+2]:[state.player?.x||9,state.player?.y||25];
        const start=routeTiles.reduce((a,b)=>Math.hypot(a[0]-origin[0],a[1]-origin[1])<Math.hypot(b[0]-origin[0],b[1]-origin[1])?a:b);
        const allowed=new Set(routeTiles.map(p=>p.join(','))),ends=new Set();
        for(let x=place.x;x<place.x+place.w;x++){ends.add(`${x},${place.y-1}`);ends.add(`${x},${place.y+place.h}`);}
        for(let y=place.y;y<place.y+place.h;y++){ends.add(`${place.x-1},${y}`);ends.add(`${place.x+place.w},${y}`);}
        const q=[start],prev=new Map([[start.join(','),null]]);let end=null;
        for(let i=0;i<q.length;i++){const p=q[i],key=p.join(',');if(ends.has(key)){end=key;break;}for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const next=[p[0]+dx,p[1]+dy],k=next.join(',');if(allowed.has(k)&&!prev.has(k)){prev.set(k,key);q.push(next);}}}
        if(!end)return null;
        const points=[];for(let k=end;k!==null;k=prev.get(k))points.unshift(k.split(',').map(n=>Number(n)+.5));
        // Grid cells are gameplay units. No unverified real-world metre scale is assumed.
        return {points,tiles:Math.max(0,points.length-1)};
    }
    function buildPreview(tool,start,end,facilityDefinitions) {
        const box={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(start.x-end.x)+1,h:Math.abs(start.y-end.y)+1};
        if(tool==='pitch_grass'||tool==='pitch_gravel'){const plan=rules.planPitchBox(start,end,tool==='pitch_grass'?'grass':'gravel');return {...box,cost:plan.valid?plan.pitches.length*(tool==='pitch_grass'?100:250):null,label:plan.valid?`${plan.pitches.length} pitch${plan.pitches.length===1?'':'es'}`:plan.reason};}
        if(tool==='path'||tool==='road')return {...box,cost:box.w*box.h*(tool==='path'?10:20),label:`${box.w*box.h} tiles`};
        if(tool.startsWith('utility_')){const n=Math.max(Math.abs(start.x-end.x),Math.abs(start.y-end.y))+1;return {...box,cost:n*({gas:25,water:20,electricity:30,waste:35}[tool.slice(8)]||0),label:`${n} service tiles`};}
        const f=facilityDefinitions[tool.replace('build_','')];
        return f?{x:end.x,y:end.y,w:f.w,h:f.h,cost:f.cost,label:names[tool.replace('build_','')]}:{x:end.x,y:end.y,w:1,h:1,cost:tool==='build_tree'?30:0,label:tool==='clear'?'Clear overgrowth':'Select tile'};
    }
    function applyDevelopedScenario(state, createVan) {
        state.cash=20000;state.initialBalance=20000;state.transactions=[];state.tools={axe:true,shovel:true};
        state.rating=3;state.satisfaction=78;state.isPaused=true;
        state.land=land.createState(true);state.land.ownedPlotIds=land.PLOTS.map(p=>p.id);
        land.syncLandmarks(state);
        state.landmarks=state.landmarks.filter(l=>l.type!=='for_sale');
        state.tiles.forEach((row,y)=>row.forEach((t,x)=>{if(x>=10&&x<47&&y<39&&t.terrain==='grass')t.nature=null;}));
        const path=(x,y)=>{const t=state.tiles[y]?.[x];if(t&&t.terrain==='grass'){t.path=true;t.nature=null;}};
        for(const y of [9,16,24,33])for(let x=10;x<=45;x++)path(x,y);
        for(const x of [20,45])for(let y=8;y<=33;y++)path(x,y);
        for(const y of [3,10,25])for(const x of [22,28,34,40])state.pitches.push({id:`pitch-${x}-${y}-4-${y===25?8:6}`,x,y,w:4,h:y===25?8:6,type:y===25?'gravel':'grass',occupied:false});
        state.tiles.forEach(row=>row.forEach(t=>{if(t.path||t.road)for(const u of services.UTILITY_TYPES)t.utilities[u]=true;}));
        for(const [type,x,y] of [['toilets',26,19],['showers',30,19],['shop',35,19],['laundry',39,19],['playground',41,35],['toilets',26,35],['toilets',31,0]])state.facilities.push({...facilities.getFacilityDefaults(type),type,x,y,w:type==='shop'?4:3,h:3});
        state.facilities[0].cleanliness=55;state.facilities[0].wear=68;
        for(const [i,pitch] of state.pitches.filter(p=>p.type==='gravel').entries()){
            const model=['silver-2br','gold-2br','bronze-1br','basic-3br'][i];
            const van=createVan(pitch,model,{id:`static-developed-${i+1}`,pitchId:pitch.id,purchasedAtMinutes:0,condition:i===2?32:93,isBroken:i===2});
            pitch.staticCaravanId=van.id;state.caravans.push(van);
        }
        return state;
    }
    const api={names,symbols,getPlaces,filterPlaces,getAlerts,project,unproject,getRoute,buildPreview,applyDevelopedScenario};
    if(typeof module!=='undefined'&&module.exports)module.exports=api;
    root.ManagementModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
