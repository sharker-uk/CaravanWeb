/* Management presentation only; game mutations go through CaravanGame. */
(() => {
'use strict';
if(document.body.dataset.management!=='true')return;
document.body.insertAdjacentHTML('afterbegin', `<div id="management-app">
<header class="masthead">
 <a class="brand" href="./" aria-label="Caravan Web home"><svg viewBox="0 0 46 40" aria-hidden="true"><path d="M4 28V13q0-5 5-5h22q5 0 5 5v15Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 15h12v8H8Zm17 0h7v13h-7M36 27h6v4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="30" r="4" fill="currentColor"/><circle cx="29" cy="30" r="4" fill="currentColor"/></svg><span>CARAVAN<span class="brand-web">WEB</span><small>A LITTLE SPACE. A GROWING BUSINESS.</small></span></a>
 <nav class="main-nav" aria-label="Management views"><button data-view="map" aria-pressed="true">Park map</button><button data-view="land" aria-pressed="false"><span class="land-label-wide">Land & beach</span><span class="land-label-narrow">Land</span></button><button data-view="guests" aria-pressed="false">Guests</button><button data-view="finances" aria-pressed="false">Finances</button><button data-view="build" aria-pressed="false">Build</button><button data-view="settings" aria-pressed="false">Park</button></nav>
 <div class="header-balance"><small>AVAILABLE CASH</small><strong id="mg-cash">£1,500</strong></div><button id="mg-save" class="save-control">Save park</button>
</header>
<div class="management-status">
 <div class="status-left"><span class="live-dot"></span><b id="mg-clock">Day 1 · 09:00</b><span id="mg-weather">Sunny</span><span class="status-divider"></span><span id="mg-occupancy">0 / 0 pitches</span><span id="mg-guests">0 guests</span><span id="mg-rating">1.0 / 5</span></div>
 <div class="time-controls"><span id="save-status">Saved locally</span><button id="mg-pause" aria-label="Resume time">Resume</button><div class="time-speeds" aria-label="Simulation speed"><button data-game-speed="1" aria-pressed="true">1×</button><button data-game-speed="2" aria-pressed="false">2×</button><button data-game-speed="4" aria-pressed="false">4×</button></div></div>
</div>
<main class="workspace">
 <aside class="sidebar" id="sidebar" aria-label="Park locations and management">
  <div class="sidebar-heading"><p class="eyebrow">YOUR PARK, AT A GLANCE</p><h1>A place to stay.<br>A park to grow.</h1><p>Keep an eye on the details. Make room for the good days.</p></div>
  <div id="location-controls"><div class="search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="mg-search" type="search" placeholder="Find a pitch, shop or facility…" aria-label="Search park locations"><kbd>/</kbd></div>
  <div class="tabs"><button data-category="all" aria-pressed="true">All places</button><button data-category="pitch" aria-pressed="false">Pitches</button><button data-category="facility" aria-pressed="false">Facilities</button></div>
  <div class="filter-row"><label class="sr-only" for="mg-status">Location status</label><select id="mg-status"><option value="all">Every status</option><option value="available">Available</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option><option value="closed">Closed / repair</option><option value="open">Open</option></select><button id="mg-saved" class="saved-filter" aria-pressed="false">♡ Saved <span id="mg-saved-count">0</span></button></div></div>
  <div class="results-heading"><span id="mg-count" role="status"></span><button id="mg-reset-filters" class="text-button" hidden>Reset filters</button></div>
  <div class="results" id="mg-results"></div>
  <div id="build-list" class="build-list" hidden></div>
  <footer class="sidebar-footer"><span class="live-dot"></span><div><b>Live park simulation</b><small id="mg-footer">Saves in this browser</small></div><button id="mg-help" aria-label="Help and controls">?</button></footer>
 </aside>
 <section class="map-shell" aria-label="Live park map">
  <div class="map-heading"><div><span class="eyebrow">NORFOLK COAST · YOUR PARK</span><h2 id="mg-park-name">Caister Coast <span>Management view</span></h2><a class="village-link" href="village.html">Explore the village →</a></div><button id="mobile-list" aria-expanded="false">☰ Places</button></div>
  <div class="map-actions"><button id="mg-plan" aria-pressed="false">◇ Plan view</button><button id="mg-layers" aria-expanded="false">▱ Layers</button></div>
  <div id="layers-panel" class="layers-panel" hidden><h3>Map layers</h3><label><input type="checkbox" id="mg-labels" checked> Place labels</label><label><input type="checkbox" id="mg-people" checked> Guests</label><label><input type="checkbox" id="mg-utilities"> Utility connections</label><label><input type="checkbox" id="mg-grid"> Tile grid</label><p class="fine-print">Utilities: blue water · amber gas · gold electricity · green waste. Dashed lines have no mains connection.</p></div>
  <svg id="park-map" role="group" tabindex="0" aria-label="Live park map. Drag to pan, scroll to zoom. Arrow keys pan, Q and E rotate, zero fits the park."><defs>
   <pattern id="grass" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#aabe94"/><path d="m5 8 2-3m19 19 2-3M11 31l2-3" stroke="#879f76" stroke-width=".8" opacity=".32"/></pattern>
   <pattern id="water" width="60" height="36" patternUnits="userSpaceOnUse"><rect width="60" height="36" fill="#9fc3c4"/><path d="M5 15q12-5 24 0m8 12q8-3 15 0" fill="none" stroke="#d4e3d9" stroke-width="1.5" opacity=".55"/></pattern>
   <pattern id="sand" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#e7d7ac"/><path d="M3 6h2m13 15h2" stroke="#c6b78e" opacity=".6"/></pattern>
   <filter id="tree-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="4" dy="6" stdDeviation="2" flood-color="#324e35" flood-opacity=".13"/></filter>
   <filter id="pin-shadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#223c35" flood-opacity=".25"/></filter>
  </defs><g id="mg-world"></g><g id="mg-map-labels"></g></svg>
  <div id="mg-priorities" class="priorities"></div>
  <div id="mg-queue" class="construction-queue"></div>
  <div class="map-caption"><span class="caption-line"></span><span>A coastal park. A slower pace.</span><small>The big picture, with the little details.</small></div>
  <div class="legend"><span><i class="available"></i>Available</span><span><i class="occupied"></i>Occupied</span><span><i class="maintenance"></i>Needs attention</span></div>
  <div class="navigation"><div class="compass"><span>N</span><button id="mg-north" aria-label="Reset north">↑</button></div><div class="zoom-stack"><button id="mg-zoom-in" aria-label="Zoom in">+</button><span id="zoom-value">100%</span><button id="mg-zoom-out" aria-label="Zoom out">−</button></div><button id="mg-fit" aria-label="Fit whole park">⛶</button><div class="rotate-stack"><button id="mg-left" aria-label="Rotate left">↶</button><button id="mg-right" aria-label="Rotate right">↷</button></div></div>
  <aside id="mg-detail" class="detail" aria-label="Selected place" hidden></aside>
  <section id="mg-panel" class="management-panel" hidden></section>
  <div id="mg-build-hint" class="build-hint" role="status" hidden></div>
  <div id="mg-route-info" class="route-summary" role="status" hidden></div>
  <div class="map-bottom"><span id="mg-coordinates">60 × 40 tiles</span><span class="interaction-hint">Drag to explore · Scroll to zoom · Q / E to turn</span><span>CaravanWeb · Management edition</span></div>
 </section>
</main>
<dialog id="mg-welcome"><p class="eyebrow">WELCOME TO CARAVAN WEB</p><h2>Your own little<br>piece of the coast.</h2><p>Build a park from the ground up, or take the keys to an established one. Manage pitches, guests, services and cash from the map.</p><button class="scenario-card" data-start="new"><strong>Start from scratch <span>£1,500</span></strong><small>An overgrown farm, a little savings and a lot of possibility.</small></button><button class="scenario-card" data-start="developed"><strong>Take over a developed park <span>£20,000</span></strong><small>12 pitches, 4 statics and working utilities. A few things need your attention.</small></button><p class="fine-print">Both are playable scenarios using the actual game simulation. Your park saves in this browser. Choosing a new scenario creates a recovery backup of an existing park.</p><button id="mg-welcome-close" class="quiet" hidden>Keep my current park</button></dialog>
<dialog id="mg-help-dialog"><button class="dialog-close" aria-label="Close help">×</button><p class="eyebrow">THE PARK OFFICE</p><h2>Less walking.<br>More managing.</h2><p>Everything on this map comes from your game. Select a pitch or facility to inspect bookings, connections and maintenance. Open Guests or Finances for the wider picture.</p><ul><li>Drag to explore, scroll or pinch to zoom. Q / E turns the map.</li><li>Build: choose a tool, then drag a tile area. Fixed-size facilities need a single click. Right-drag always pans.</li><li>Roads, paths, pitches and utilities take two in-game hours. Resume time to finish the work.</li><li>Statics are ordered from Rusty Resales. All four mains hookups must reach an empty hardstanding pitch.</li><li>Use the Park tab to export or import a save, manage staff, or open the classic walkabout view.</li><li>Space pauses time when the map is focused. Escape cancels a tool or closes a panel.</li></ul><button class="primary" id="mg-help-done">Back to the park</button></dialog>
<dialog id="mg-purchase" aria-labelledby="mg-purchase-title"><p class="eyebrow">ROOM TO GROW</p><h2 id="mg-purchase-title">Review purchase</h2><div id="mg-purchase-body"></div><div class="purchase-buttons"><button id="mg-purchase-cancel">Keep looking</button><button id="mg-purchase-confirm" class="primary">Confirm purchase</button></div></dialog>
<input type="file" accept=".json,application/json" id="mg-import-file" hidden>
</div>`);
const $=s=>document.querySelector(s),M=window.ManagementModel;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:Math.abs(n)%1?2:0}).format(Number(n)||0);
const title=s=>String(s||'').replaceAll('_',' ').replace(/^\w/,c=>c.toUpperCase());
const app={view:'map',selected:null,query:'',category:'all',status:'all',savedOnly:false,saved:[],route:false,layers:{labels:true,people:true,utilities:false,grid:false}};
let api,map,places=[],renderTimer,ready=false,lastDetail='',lastResults='',lastPanel='',lastBuild='';
try{const ids=JSON.parse(localStorage.getItem('caravanweb_management_saved_v1')||'[]');if(Array.isArray(ids))app.saved=ids.filter(id=>typeof id==='string');}catch{}
// The classic DOM remains available to unchanged game code. Only its shop and toast are presented here.
for(const id of ['vendor-dialog','toast'])document.body.append(document.getElementById(id));
function setText(id,text){const e=document.getElementById(id);if(e&&e.textContent!==String(text))e.textContent=text;}
function replaceKeepingFocus(el,html){if(el.innerHTML===html)return;const focused=el.contains(document.activeElement)?document.activeElement:null,id=focused?.id,dataId=focused?.dataset.select;el.innerHTML=html;if(id)el.querySelector('#'+CSS.escape(id))?.focus({preventScroll:true});else if(dataId)el.querySelector(`[data-select="${CSS.escape(dataId)}"]`)?.focus({preventScroll:true});}
function filtered(){return M.filterPlaces(places,{...app,category:app.view==='land'?'land':app.category});}
function current(){return places.find(p=>p.id===app.selected);}
function announce(text){window.showToast(text);}
function download(text,name){if(!text){announce('The save could not be prepared.');return;}const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function select(id,recenter=true){
    app.selected=places.some(p=>p.id===id)?id:null;app.route=false;
    const p=current();
    if(p&&!M.filterPlaces([p],app).length){Object.assign(app,{query:'',category:'all',status:'all',savedOnly:false});$('#mg-search').value='';$('#mg-status').value='all';}
    api.select(p?.van||p?.entity||null);
    if(p&&recenter)map.focus(p);
    app.view=p?.kind==='land'?'land':'map';api.tool('select');
    if(app.selected)history.replaceState(null,'','#'+new URLSearchParams({place:app.selected}));else history.replaceState(null,'',location.pathname+location.search);
    $('#sidebar').classList.remove('mobile-open');$('#mobile-list').setAttribute('aria-expanded','false');render(true);
}
function setView(view){app.view=view;app.route=false;if(view==='land'){resetFilters();app.selected=places.find(p=>p.kind==='land')?.id||null;}if(view!=='build')api.tool('select');const open=view==='build'&&innerWidth<=700;$('#sidebar').classList.toggle('mobile-open',open);$('#mobile-list').setAttribute('aria-expanded',String(open));render(true);}
function setTool(tool){const actual=api.tool(tool);if(actual!==tool)return;app.view='build';app.route=false;$('#sidebar').classList.remove('mobile-open');$('#mobile-list').setAttribute('aria-expanded','false');if(tool.startsWith('utility_')){app.layers.utilities=true;$('#mg-utilities').checked=true;}render(true);}
function renderResults(){
    const list=filtered();setText('mg-count',`${list.length} ${list.length===1?'place':'places'} in your park`);setText('mg-saved-count',app.saved.length);
    $('#mg-reset-filters').hidden=!app.query&&app.category==='all'&&app.status==='all'&&!app.savedOnly;
    $('#mg-saved').setAttribute('aria-pressed',app.savedOnly);
    document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===app.category)));
    let last='';const html=list.map(p=>{const group=p.kind==='pitch'?'PITCHES & CARAVANS':p.kind==='facility'?'PARK FACILITIES':p.kind==='land'?'LAND & BEACH':'AROUND THE PARK',heading=group!==last?`<div class="result-group">${group}</div>`:'';last=group;return `${heading}<button class="result-item" data-select="${esc(p.id)}" aria-label="Manage ${esc(p.name)}" aria-pressed="${p.id===app.selected}"><span class="result-icon">${p.van?'<svg viewBox="0 0 40 32" aria-hidden="true"><path d="M4 24V10q0-4 4-4h24q4 0 4 4v14Z" fill="#b6c9a2" stroke="#789773"/><path d="M9 11h11v7H9Zm17 0h6v13h-6" fill="#f8f8e8" stroke="#789773"/><circle cx="12" cy="25" r="3" fill="#67805d"/><circle cx="29" cy="25" r="3" fill="#67805d"/></svg>':esc(p.symbol)}</span><span class="result-copy"><strong>${esc(p.name)}</strong><small>${esc(p.label)}</small></span><span class="result-end"><i class="status-dot ${p.status}" title="${p.status}"></i><span class="sr-only">${p.status}</span>${app.saved.includes(p.id)?'♥':'›'}</span></button>`;}).join('')||'<div class="empty">A little room to grow.<small>No places match these filters. A new park starts with just the farm and village shops.</small><button data-reset class="text-button">Reset filters</button></div>';
    if(html!==lastResults){replaceKeepingFocus($('#mg-results'),html);lastResults=html;}
}
function detailHero(p){if(p.kind==='land')return `<svg viewBox="0 0 285 104" aria-hidden="true"><rect width="285" height="104" fill="#dce5ce"/><path d="M0 86H285" stroke="#d0c5a4" stroke-width="20"/>${ManagementArt.tree(58,76,19,2)}${ManagementArt.tree(225,68,16,1)}${p.type==='beach_gate'?'<path d="M120 54v40m40-40v40m-40-29h40m-40 16h40" stroke="#9a8966" stroke-width="4"/>':'<path d="M99 84V40h85v44Z" fill="#eae3c9" stroke="#a3926c"/><text x="141" y="68" text-anchor="middle" fill="#6a7857" font-size="13">'+(p.status==='owned'?'YOUR FIELD':'FOR SALE')+'</text>'}</svg>`;const obj={id:p.type,x:145,y:55,w:95,h:42,type:p.kind==='pitch'?(p.van?'static':p.guest?.accommodation==='tent'?'tent':'touring'):'facility',tier:p.van?StaticCaravans.getModel(p.van.modelId)?.tierName:'Silver'};return `<svg viewBox="0 0 285 104" aria-hidden="true"><rect width="285" height="104" fill="#dce5ce"/><path d="M0 87H285" stroke="#c3c7a4" stroke-width="18"/>${ManagementArt.tree(42,64,17,2)}${ManagementArt.tree(242,64,17,1)}${ManagementArt.building(obj)}</svg>`;}
function actionButton(action,label,disabled=false,primary=false){return `<button data-action="${action}" ${disabled?'disabled':''} class="${primary?'primary':''}" id="mg-action-${action}">${label}</button>`;}
function renderDetail(state){
    const p=current(),visible=p&&['map','land'].includes(app.view);$('#mg-detail').hidden=!visible;$('.map-shell').classList.toggle('has-detail',Boolean(visible));
    if(!visible)return;
    let body='',actions='';
    if(p.kind==='land'){
        const card=landCard(state,p);body=card.body;actions=card.actions;
    }else if(p.kind==='pitch'){
        const cap=p.capability,van=p.van,guest=p.guest;
        const ready=PitchCapabilities.canHostCurrent(state,p.entity,{accommodation:van?'static':'tent',headcount:1,requiredServices:['toilets']});
        const blockers=[];if(van?.isBroken)blockers.push('Caravan needs repair');if(van?.isOperational===false)blockers.push('New bookings are paused');if(van&&!Object.values(cap.utilities).every(Boolean))blockers.push('Missing connected hookups');if(!cap.services.toilets)blockers.push('No operational toilets in the service area');if(p.status==='reserved')blockers.push('Pitch is reserved for work or delivery');
        const model=van?StaticCaravans.getModel(van.modelId):null;
        body=`<div class="detail-facts">${model?`<div><b>${model.bedrooms}</b>Bedrooms</div><div><b>${model.maxOccupancy}</b>Max. guests</div><div><b>${Math.floor(van.condition)}%</b>Condition</div>`:`<div><b>${p.w} × ${p.h}</b>Tile footprint</div><div><b>${p.entity.type==='gravel'?'Hardstanding':'Grass'}</b>Pitch surface</div>`}</div><div class="readiness ${blockers.length?'attention':''}"><strong>${guest?'Guests are staying':ready?'Ready for bookings':blockers.length?'Needs attention':'Available for a suitable party'}</strong>${blockers.length?`<ul>${blockers.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}</div><h4>Connected services</h4><div class="hookups">${Object.entries(cap.utilities).map(([u,on])=>`<span class="${on?'connected':'disconnected'}">${on?'✓':'−'} ${title(u)}</span>`).join('')}</div><p>${cap.services.toilets?'Toilets nearby':'No shared toilets nearby'} · ${cap.services.showers?'Showers nearby':'No shared showers nearby'}</p>`;
        if(guest){const party=guest.party||{},names=(party.members||[]).map(m=>m.name).filter(Boolean).join(', ');body+=`<div class="guest-stay"><h4>Current booking</h4><strong>${esc(title(party.type))} · ${party.headcount||1} guest${party.headcount===1?'':'s'}</strong><p>${esc(names)}<br>${guest.stayDaysRemaining} day${guest.stayDaysRemaining===1?'':'s'} remaining · ${money(guest.totalIncome)} upfront<br>${esc(title(guest.activity||'Relaxing'))}</p></div>`;}
        if(van){body+=`<p>${esc(model.tierName)} · ${money(model.dailyRent)} daily static rent<br>Resale: ${money(StaticCaravans.calculateResaleValue(van,StaticCaravans.gameTimeMinutes(state)))}${p.entity.decking?'<br>Decking: '+Math.floor(p.entity.decking.condition)+'% condition':''}</p>`;
            actions=actionButton('repair','Repair caravan · £40',!van.isBroken||state.cash<40,true)+actionButton('rental',van.isOperational===false?'Accept new bookings':'Pause new bookings')+actionButton('skirting',van.hasSkirting?'Skirting fitted':'Fit skirting · £150',van.hasSkirting||state.cash<150)+actionButton('sell','Sell caravan',p.entity.occupied||p.status==='reserved');
        }else if(p.entity.type==='gravel')actions=actionButton('rusty','Order a static caravan',false,true);
    }else if(p.kind==='facility'){
        const f=p.entity;body=`<div class="detail-facts"><div><b>${esc(f.capacity)}</b>Guests / hour</div><div><b>${money(f.hourlyCost)}</b>Running cost / hour</div></div><p>Current usage: ${esc(f.hourlyUsage||0)} / ${esc(f.capacity)} guests this hour.</p>`;
        if(f.type==='toilets'){
            const clean=Math.round(f.cleanliness),wear=Math.round(f.wear),cleanCost=FacilityOperations.getMaintenanceCost('clean',f.cleanliness),repairCost=FacilityOperations.getMaintenanceCost('repair',f.wear);
            body+=`<h4>Cleanliness · ${clean}%</h4><meter min="0" max="100" value="${clean}" aria-label="Cleanliness">${clean}%</meter><h4>Condition · ${wear}%</h4><meter min="0" max="100" value="${wear}" aria-label="Facility condition">${wear}%</meter>`;
            const task=state.maintenanceTask;if(task&&task.facilityIndex===p.index)body+=`<p class="work-status">${task.action==='clean'?'Cleaning':'Repair'} in progress · ${task.hoursRemaining} game hour(s) left</p>`;
            actions+=actionButton('clean',`Clean · ${money(cleanCost)} · 2h`,f.cleanliness>=100||Boolean(task)||state.cash<cleanCost,true)+actionButton('repairFacility',`Repair · ${money(repairCost)} · 3h`,f.wear>=100||Boolean(task)||state.cash<repairCost);
        }
        actions+=actionButton('toggleFacility',f.isOperational===false?'Reopen facility':'Close facility');
    }else{
        body=`<p>${esc(({farmhouse:'The park office and home at the heart of your coastal business.',rusty_resales:'Browse the static caravan catalogue, compare trade-ins and arrange delivery to an eligible hardstanding pitch.',fiddl_shop:'Buy pitch accessories for your park. Choose an item here, then place it on the map.',job_centre:'Hire grounds staff or book a handyman from the Park tab.',for_sale:'Inspect expansion fields from Land & beach.'})[p.type]||'Part of your coastal park.')}</p>`;
        if(p.type==='rusty_resales')actions=actionButton('rusty','Browse static caravans',false,true);
        if(p.type==='fiddl_shop')actions=actionButton('fiddl','Browse accessories',false,true);
        if(p.type==='job_centre')actions='<button data-open-settings class="primary">Open staffing</button>';
    }
    const html=`<button class="detail-close" aria-label="Close selected place">×</button><div class="detail-hero">${detailHero(p)}</div><div class="detail-body"><p class="eyebrow">${esc(p.kind==='pitch'?p.label:p.kind)}</p><h3>${esc(p.name)}</h3><div class="detail-status"><span><i class="status-dot ${p.status}"></i>${title(p.status)}</span><small>Live game state</small></div>${body}<div class="management-actions">${actions}</div><div class="detail-buttons"><button id="mg-route" ${p.type==='land_plot'?'hidden':''}>${app.route?'Hide route':'Show office route'}</button><button id="mg-save-place" aria-pressed="${app.saved.includes(p.id)}">${app.saved.includes(p.id)?'♥ Saved':'♡ Save place'}</button></div></div>`;
    if(html!==lastDetail){replaceKeepingFocus($('#mg-detail'),html);lastDetail=html;}
}
function landCard(state,p){
    const L=LandExpansion;
    if(p.type==='land_plot'){
        const q=L.purchaseQuote(state,p.entity.plotId),plot=q.plot;
        return {body:`<div class="detail-facts"><div><b>${money(plot.price)}</b>Purchase price</div><div><b>${plot.w} × ${plot.h}</b>Field tiles</div></div><p>${esc(plot.description)}</p><div class="readiness ${q.ok||plot.owned?'':'attention'}"><strong>${plot.owned?'Your field, your plans.':'A permanent addition to the park.'}</strong>${!plot.owned&&q.reasons.length?`<ul>${q.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>`:''}</div><p>The purchase gives you development rights. Trees, paths, pitches, facilities and utility connections still need your work and budget.</p>`,actions:plot.owned?'<button data-view="build" class="primary">Develop this field</button>':`<button data-buy-land="${plot.id}" class="primary" ${q.ok?'':'disabled'}>Review purchase · ${money(plot.price)}</button>`};
    }
    const b=state.land.beach,q=L.beachQuote(state),status=L.beachStatus(state),job=state.constructions.find(j=>j.kind==='beach_access');
    return {body:`<div class="detail-facts"><div><b>£2,500</b>Path & gate</div><div><b>2 hours</b>Game build time</div><div><b>£1 / h</b>While open</div></div><p>A coastal entrance for your guests. Connect a park path to the inland edge of the marked beach entrance, then clear the 4 × 2 approach beside the dunes.</p><div class="readiness ${status.operational?'':'attention'}"><strong>${status.operational?'Open and connected':b.constructed?status.connected?'Gate closed':'Reconnect the approach path':b.purchased?'Construction in progress':'Prepare your route to the beach'}</strong>${job?`<p>${Math.max(0,Math.ceil(job.completesAt-Construction.getGameTimeMinutes(state)))} game minutes remaining. Resume time to finish.</p>`:''}${!b.purchased&&q.reasons.length?`<ul>${q.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>`:''}</div><p>Open, connected access adds <b>5 demand points</b> (maximum 100). A party reaching the beach between 08:00 and 20:00 gains <b>3 satisfaction points</b>, once per game day. Guests choose their own outings.</p>`,actions:b.constructed?`<button data-toggle-beach class="primary" ${!b.isOpen&&!status.connected?'disabled':''}>${b.isOpen?'Close beach gate':'Open beach gate'}</button>`:b.purchased?'':`<button data-buy-land="beach" class="primary" ${q.ok?'':'disabled'}>Review development · £2,500</button>`};
}
let purchaseId=null;
function reviewPurchase(id){
 const state=api.getState(),q=id==='beach'?LandExpansion.beachQuote(state):LandExpansion.purchaseQuote(state,id);if(!q.ok){announce(q.reasons.join(' '));return;}
 purchaseId=id;$('#mg-purchase-title').textContent=id==='beach'?'A way to the beach.':`Buy ${q.plot.name}?`;
 $('#mg-purchase-body').innerHTML=`<p>${id==='beach'?'Build the marked coastal path and gate. Work takes two game hours; the gate opens when construction finishes.':esc(q.plot.description)}</p><dl class="purchase-totals"><div><dt>Purchase</dt><dd>${money(q.price)}</dd></div><div><dt>Cash afterwards</dt><dd>${money(state.cash-q.price)}</dd></div></dl><p>${id==='beach'?'Upkeep: £1 per game hour while open and connected. Closing the gate stops the demand bonus and new beach outings.':'Clearing, new pitches, paths and utility lines are paid separately.'}</p>`;$('#mg-purchase-confirm').disabled=false;$('#mg-purchase').showModal();$('#mg-purchase-cancel').focus();
}
$('#mg-purchase-cancel').addEventListener('click',()=>{$('#mg-purchase').close();purchaseId=null;});
$('#mg-purchase').addEventListener('close',()=>{purchaseId=null;});
$('#mg-purchase-confirm').addEventListener('click',()=>{if(!purchaseId)return;$('#mg-purchase-confirm').disabled=true;const result=api.purchaseLand(purchaseId);if(result.ok){$('#mg-purchase').close();map.invalidate();}else $('#mg-purchase-body').textContent=result.reasons.join(' ');render(true);});
function toolButton(tool,label,meta,disabled=false){return `<button class="build-tool" data-tool="${tool}" aria-pressed="${api.getState().activeTool===tool}" ${disabled?'disabled':''}><strong>${label}</strong><small>${meta}</small><span aria-hidden="true">+</span></button>`;}
function renderBuild(state){
    const html=`<div class="build-intro"><p>Choose a tool, then lay it out on the map. The game checks space, funds and connections before starting work.</p><button id="mg-stop-build" class="text-button">Return to selecting</button></div><h3>Ground & pitches</h3>${toolButton('clear','Clear overgrowth','Click a tree or brush · Harvests timber')}${toolButton('path','Park path','£10 / tile · Drag an area')}${toolButton('road','Park road','£20 / tile · Drag an area')}${toolButton('pitch_grass','Grass pitch','£100 each · Draw at least 4 × 6 tiles')}${toolButton('pitch_gravel','Hardstanding','£250 each · Draw at least 4 × 8 tiles',!state.tools.shovel)}<h3>Facilities</h3>${Object.entries(api.facilityDefinitions).map(([type,f])=>toolButton('build_'+type,M.names[type],`${money(f.cost)} · ${f.w} × ${f.h} tiles · Click to place`)).join('')}<h3>Utilities</h3><p class="build-note">Mains connect at a park edge. Lines must follow roads or paths.</p>${!state.tools.shovel?'<button class="primary" data-action="shovel">Buy shovel to unlock · £350</button>':''}${ParkServices.UTILITY_TYPES.map(type=>toolButton('utility_'+type,title(type),`${money({gas:25,water:20,electricity:30,waste:35}[type])} / tile · Drag a line`,!state.tools.shovel)).join('')}${toolButton('build_tree','Plant a tree','£30 · Click clear ground')}`;
    if(html!==lastBuild){replaceKeepingFocus($('#build-list'),html);lastBuild=html;}
}
function panelHeader(kicker,name,description){return `<header class="panel-top"><div><p class="eyebrow">${kicker}</p><h2>${name}</h2><p>${description}</p></div><button data-close-panel aria-label="Close management panel">×</button></header>`;}
function renderPanel(state){
    const visible=['guests','finances','settings'].includes(app.view);$('#mg-panel').hidden=!visible;if(!visible)return;
    let html='';
    if(app.view==='guests'){
        const people=state.guests.reduce((n,g)=>n+(g.party?.headcount||1),0);
        html=panelHeader('GUEST RELATIONS','Good days start here.','Current bookings and the people staying in your park.')+`<div class="panel-metrics"><div><b>${people}</b><small>Guests staying</small></div><div><b>${state.guests.length}</b><small>Booked pitches</small></div><div><b>${Math.round(state.satisfaction)}%</b><small>Satisfaction</small></div><div><b>${api.getDemand().score}%</b><small>Current demand</small></div></div>`;
        html+=state.guests.length?`<div class="table-scroll"><table><thead><tr><th>Pitch & party</th><th>Guests</th><th>Stay remaining</th><th>Upfront paid</th><th>Activity</th></tr></thead><tbody>${state.guests.map(g=>{const p=places.find(p=>p.entity===g.pitch);return `<tr><td><button data-select="${esc(p?.id)}" class="text-button">${esc(p?.name||'Pitch')}</button><small>${esc(title(g.party?.type))} · ${esc((g.party?.members||[]).map(m=>m.name).filter(Boolean).join(', '))}</small></td><td>${g.party?.headcount||1}</td><td>${g.stayDaysRemaining} ${g.stayDaysRemaining===1?'day':'days'}</td><td>${money(g.totalIncome)}</td><td>${esc(title(g.activity||'relaxing'))}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="panel-empty"><h3>Your next guests are on their way.</h3><p>Resume time during arrival hours. Bookings need a suitable available pitch, enough toilet capacity and local service access.</p><button class="primary" data-view="build">Prepare the park</button></div>';
    }
    if(app.view==='finances'){
        const b=api.getBalance(),transactions=state.transactions.slice(-50).reverse();
        html=panelHeader('THE PARK ACCOUNTS','Every little detail adds up.','Rolling seven game days, with your most recent 50 ledger entries.')+`<div class="panel-metrics"><div><b>${money(state.cash)}</b><small>Available cash</small></div><div><b>${money(b.income)}</b><small>7-day income</small></div><div><b>${money(b.expenses)}</b><small>7-day expenses</small></div><div><b class="${b.net<0?'negative':''}">${money(b.net)}</b><small>7-day net</small></div></div><div class="ledger-check ${b.isValid?'':'attention'}">${b.isValid?'✓ Ledger reconciles with available cash':'Ledger balance mismatch — review your save'}<span>Opening balance: ${money(state.initialBalance)}</span></div>`;
        const days=Array.from({length:7},(_,i)=>state.day-6+i).filter(d=>d>0),sums=days.map(day=>{const tx=state.transactions.filter(t=>t.day===day);return {day,income:tx.reduce((n,t)=>n+Math.max(0,t.amount),0),expenses:tx.reduce((n,t)=>n+Math.max(0,-t.amount),0)};}),max=Math.max(1,...sums.flatMap(d=>[d.income,d.expenses]));
        html+=`<div class="cash-chart" aria-label="Daily income and expenses">${sums.map(d=>`<div class="chart-day"><div class="chart-bars"><span class="income" style="height:${d.income/max*100}%" title="Income ${money(d.income)}"></span><span class="expense" style="height:${d.expenses/max*100}%" title="Expenses ${money(d.expenses)}"></span></div><small>Day ${d.day}</small></div>`).join('')}<div class="chart-key"><span>Income</span><span>Expenses</span></div></div>`;
        html+=transactions.length?`<div class="table-scroll"><table><thead><tr><th>Day</th><th>Transaction</th><th>Amount</th><th>Balance</th></tr></thead><tbody>${transactions.map(t=>`<tr><td>${t.day}</td><td>${esc(t.description)}<small>${esc(title(t.category))}</small></td><td class="${t.amount<0?'negative':'positive'}">${money(t.amount)}</td><td>${money(t.balance)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="panel-empty"><h3>A clean set of books.</h3><p>Your first building project or guest booking will appear here. The starting scenario includes its opening assets.</p></div>';
    }
    if(app.view==='settings'){
        html=panelHeader('THE PARK OFFICE','Keep the park ticking.','Staff, tools, time settings and a safe place for your progress.')+`<div class="settings-grid"><article><h3>Your team</h3><p>${state.groundsStaff?'Grounds staff are cleaning and maintaining toilets for £1 per game hour.':'Grounds staff unlock at 4 facilities and 6 pitches. Hiring costs £250, then £1 per game hour.'}</p><button class="primary" data-action="grounds" ${!state.groundsStaff&&(state.facilities.length<4||state.pitches.length<6||state.cash<250)?'disabled':''}>${state.groundsStaff?'Dismiss grounds staff':'Hire grounds staff · £250'}</button><p>A handyman can cover urgent repairs for 24 game hours.</p><button data-action="handyman" ${state.handymanContractHoursRemaining>0||state.cash<100?'disabled':''}>${state.handymanContractHoursRemaining>0?'Handyman booked · '+state.handymanContractHoursRemaining+'h left':'Book handyman · £100'}</button></article><article><h3>Tools & timber</h3><p>The shovel unlocks hardstanding preparation and utility trenching.</p><button data-action="shovel" ${state.tools.shovel||state.cash<350?'disabled':''}>${state.tools.shovel?'Shovel owned':'Buy shovel · £350'}</button><p>${state.wood} timber in storage.</p><button data-action="timber" ${state.wood<=0?'disabled':''}>Sell timber · ${money(LandManagement.getTimberSaleValue(state.wood))}</button><h3>Game pace</h3><label for="mg-day-length">Day length setting: ${state.dayLengthMinutes} min</label><input id="mg-day-length" type="range" min="3" max="60" value="${state.dayLengthMinutes}"></article><article><h3>Your save</h3><p>Progress is saved in this browser. Export a game file to keep a portable copy or move to another device.</p><button class="primary" id="mg-export">Export game save</button><button id="mg-import">Import game save</button><button id="mg-export-backup" ${!api.getBackup()?'disabled':''}>Export recovery backup</button><p>A previous-save backup is created before loading a file or starting another scenario.</p></article><article><h3>A different perspective</h3><p>The classic avatar view uses the same simulation and local save. Your management camera is stored separately.</p><a class="button-link" href="walkabout.html">Open classic walkabout</a><h3>Start another park</h3><p>Choose a new farm or a developed park. Your current park is kept as a recovery backup.</p><button id="mg-new-park">Choose a new scenario</button></article></div>`;
    }
    if(html!==lastPanel){replaceKeepingFocus($('#mg-panel'),html);lastPanel=html;}
}
function render(force=false){
    if(!ready)return;const state=api.getState();places=M.getPlaces(state);
    if(app.selected&&!places.some(p=>p.id===app.selected)){app.selected=null;app.route=false;}
    setText('mg-cash',money(Math.floor(state.cash)));setText('mg-clock',`Day ${state.day} · ${String(state.hour).padStart(2,'0')}:${String(Math.floor(state.minute)).padStart(2,'0')}`);setText('mg-weather',state.weather);setText('mg-occupancy',`${state.pitches.filter(p=>p.occupied).length} / ${state.pitches.length} pitches`);setText('mg-guests',`${state.guests.reduce((n,g)=>n+(g.party?.headcount||1),0)} guests`);setText('mg-rating',`${state.rating.toFixed(1)} / 5`);setText('mg-pause',state.isPaused?'Resume':'Pause');$('#mg-pause').setAttribute('aria-label',state.isPaused?'Resume time':'Pause time');
    document.querySelectorAll('[data-game-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.gameSpeed)===state.simulationSpeed)));
    document.querySelectorAll('.main-nav [data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===app.view)));
    setText('mobile-list',app.view==='build'?'☰ Tools':'☰ Places');
    $('#location-controls').hidden=['build','land'].includes(app.view);$('#mg-results').hidden=app.view==='build';$('#build-list').hidden=app.view!=='build';$('#mg-count').parentElement.hidden=app.view==='build';
    $('.sidebar-heading h1').innerHTML=app.view==='build'?'Room for<br>something new.':app.view==='land'?'A little more<br>of the coast.':'A place to stay.<br>A park to grow.';
    if(app.view==='build')renderBuild(state);else renderResults();
    const alerts=M.getAlerts(state,places),priorities=alerts.slice(0,2).map(a=>`<button ${a.place?'data-select="'+esc(a.place)+'"':'data-view="'+esc(a.kind)+'"'}><strong>${esc(a.title)}</strong><small>${esc(a.text)}</small></button>`).join('');
    replaceKeepingFocus($('#mg-priorities'),priorities?`<p class="eyebrow">${alerts.length} THING${alerts.length===1?'':'S'} TO WATCH</p>${priorities}`:'');$('#mg-priorities').hidden=Boolean(app.selected)||app.view!=='map'||!alerts.length;
    const now=Construction.getGameTimeMinutes(state),queue=state.constructions.slice(0,3).map(j=>`<div><span class="queue-dot"></span><span>${esc(title(j.type||j.surface||j.utility||j.kind))} <small>${Math.max(0,Math.ceil(j.completesAt-now))} game min left</small></span></div>`).join('');replaceKeepingFocus($('#mg-queue'),queue?'<p class="eyebrow">WORK IN PROGRESS</p>'+queue:'');$('#mg-queue').hidden=!queue||!['map','build','land'].includes(app.view);
    renderDetail(state);renderPanel(state);
    const tool=state.activeTool||'select';$('#mg-build-hint').hidden=tool==='select';if(tool!=='select'&&!$('#mg-build-hint').dataset.preview)$('#mg-build-hint').innerHTML=`<strong>${esc(title(tool.replace('build_','')))}</strong><span>${tool.startsWith('place_accessory_')?'Click an eligible pitch tile to place your purchase.':'Draw on the map to place. Right-drag pans. Escape cancels.'}</span><button id="mg-cancel-tool">Cancel</button>`;
    const route=app.route?M.getRoute(state,current()):null;$('#mg-route-info').hidden=!app.route;
    if(app.route)$('#mg-route-info').innerHTML=route?`<strong>Park office → ${esc(current().name)}</strong><small>${route.tiles} path tiles · Game grid, not real-world distance</small>`:'<strong>No connected path to this entrance</strong><small>Routes follow roads and paths. Add a link to reach this location.</small>';
    map.render(state,places,{selected:app.selected,visibleIds:new Set(filtered().map(p=>p.id)),route,tool,layers:app.layers});
    $('.map-shell').classList.toggle('has-panel',['guests','finances','settings'].includes(app.view));
}
function resetFilters(){Object.assign(app,{query:'',category:'all',status:'all',savedOnly:false});$('#mg-search').value='';$('#mg-status').value='all';render(true);}
function showWelcome(){if(api.getState().pitches.length||localStorage.getItem('caravan_tycoon_save'))$('#mg-welcome-close').hidden=false;$('#mg-welcome').showModal();}
function runAction(action){const p=current(),entity=p?.van||p?.entity;const result=api.action(action,entity);render(true);return result;}
$('#mg-search').addEventListener('input',e=>{app.query=e.target.value;render(true);});$('#mg-status').addEventListener('change',e=>{app.status=e.target.value;render(true);});
$('#mg-saved').addEventListener('click',()=>{app.savedOnly=!app.savedOnly;render(true);});$('#mg-reset-filters').addEventListener('click',resetFilters);
$('#mg-pause').addEventListener('click',()=>{api.pause();render(true);});$('#mg-save').addEventListener('click',()=>{if(api.save()){setText('save-status','Saved just now');announce('Park saved in this browser.');}});
$('#mg-plan').addEventListener('click',()=>{const plan=map.togglePlan();$('#mg-plan').setAttribute('aria-pressed',String(plan));$('#mg-plan').textContent=plan?'◇ Landscape view':'◇ Plan view';});
$('#mg-layers').addEventListener('click',()=>{const open=$('#layers-panel').hidden;$('#layers-panel').hidden=!open;$('#mg-layers').setAttribute('aria-expanded',String(open));});
for(const [id,key] of [['mg-labels','labels'],['mg-people','people'],['mg-utilities','utilities'],['mg-grid','grid']])$('#'+id).addEventListener('change',e=>{app.layers[key]=e.target.checked;render(true);});
$('#mg-zoom-in').addEventListener('click',()=>map.zoom(1.25));$('#mg-zoom-out').addEventListener('click',()=>map.zoom(.8));$('#mg-fit').addEventListener('click',()=>map.fit());$('#mg-left').addEventListener('click',()=>map.turn(-45));$('#mg-right').addEventListener('click',()=>map.turn(45));$('#mg-north').addEventListener('click',()=>map.north());
$('#mobile-list').addEventListener('click',()=>{const open=$('#sidebar').classList.toggle('mobile-open');$('#mobile-list').setAttribute('aria-expanded',String(open));});
$('#mg-help').addEventListener('click',()=>$('#mg-help-dialog').showModal());$('#mg-help-done').addEventListener('click',()=>$('#mg-help-dialog').close());$('#mg-help-dialog .dialog-close').addEventListener('click',()=>$('#mg-help-dialog').close());$('#mg-welcome-close').addEventListener('click',()=>$('#mg-welcome').close());
$('#management-app').addEventListener('click',e=>{
    const buy=e.target.closest('[data-buy-land]');if(buy){reviewPurchase(buy.dataset.buyLand);return;}
    if(e.target.closest('[data-toggle-beach]')){api.toggleBeach();map.invalidate();render(true);return;}
    const selectButton=e.target.closest('[data-select]');if(selectButton){select(selectButton.dataset.select);return;}
    const viewButton=e.target.closest('[data-view]');if(viewButton){setView(viewButton.dataset.view);return;}
    const action=e.target.closest('[data-action]');if(action){runAction(action.dataset.action);return;}
    const tool=e.target.closest('[data-tool]');if(tool){setTool(tool.dataset.tool);return;}
    const speed=e.target.closest('[data-game-speed]');if(speed){api.speed(speed.dataset.gameSpeed);render(true);return;}
    const category=e.target.closest('[data-category]');if(category){app.category=category.dataset.category;render(true);return;}
    const start=e.target.closest('[data-start]');if(start){const result=api.begin(start.dataset.start);if(result.ok){app.selected=null;app.route=false;app.view='map';resetFilters();$('#mg-welcome').close();map.invalidate();map.fit();render(true);}return;}
    if(e.target.closest('[data-reset]')){resetFilters();return;}
    if(e.target.closest('.detail-close')){select(null,false);return;}
    if(e.target.closest('[data-open-settings]')){setView('settings');return;}
    if(e.target.closest('[data-close-panel]')){setView('map');return;}
    if(e.target.closest('#mg-route')){app.route=!app.route;render(true);return;}
    if(e.target.closest('#mg-save-place')){const id=app.selected,next=app.saved.includes(id)?app.saved.filter(i=>i!==id):[...app.saved,id];try{localStorage.setItem('caravanweb_management_saved_v1',JSON.stringify(next));app.saved=next;render(true);}catch{announce('This browser could not save the place.');}return;}
    if(e.target.closest('#mg-cancel-tool,#mg-stop-build')){api.tool('select');$('#mg-build-hint').dataset.preview='';render(true);return;}
    if(e.target.closest('#mg-export')){download(api.getSave(),`caravanweb-day-${api.getState().day}.json`);return;}
    if(e.target.closest('#mg-export-backup')){download(api.getBackup(),'caravanweb-recovery-backup.json');return;}
    if(e.target.closest('#mg-import')){$('#mg-import-file').click();return;}
    if(e.target.closest('#mg-new-park'))showWelcome();
});
$('#mg-panel').addEventListener('change',e=>{if(e.target.id==='mg-day-length'){api.dayLength(e.target.value);render(true);}});
$('#mg-import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>5*1024*1024)throw new Error('Choose a game save under 5 MB.');const result=api.importSave(await file.text());if(result.ok){app.selected=null;app.route=false;map.invalidate();resetFilters();}}catch(error){announce(error.message);}finally{e.target.value='';render(true);}});
window.addEventListener('hashchange',()=>{const id=new URLSearchParams(location.hash.slice(1)).get('place');select(id);});
document.addEventListener('keydown',e=>{
    if(!ready||e.target.matches('input,select,textarea')||document.querySelector('dialog[open]')||!$('#vendor-dialog').hidden)return;
    const key=e.key.toLowerCase();
    if(key==='/'){e.preventDefault();if(innerWidth<=700){$('#sidebar').classList.add('mobile-open');$('#mobile-list').setAttribute('aria-expanded','true');}$('#mg-search').focus();return;}
    if(key==='escape'){api.tool('select');app.route=false;app.selected=null;app.view='map';$('#sidebar').classList.remove('mobile-open');$('#layers-panel').hidden=true;$('#mg-layers').setAttribute('aria-expanded','false');$('#mobile-list').setAttribute('aria-expanded','false');render(true);return;}
    if(!e.target.closest('#park-map')&&e.target!==document.body)return;
    const commands={arrowleft:()=>map.pan(-60,0),arrowright:()=>map.pan(60,0),arrowup:()=>map.pan(0,-60),arrowdown:()=>map.pan(0,60),q:()=>map.turn(-45),e:()=>map.turn(45),'+':()=>map.zoom(1.25),'=':()=>map.zoom(1.25),'-':()=>map.zoom(.8),'0':()=>map.fit(),' ':()=>api.pause()};
    if(commands[key]){e.preventDefault();commands[key]();render(true);}
});
window.addEventListener('caravan:change',()=>{if(ready&&!renderTimer)renderTimer=setTimeout(()=>{renderTimer=null;render();},250);});
window.addEventListener('caravan:ready',()=>{
    api=window.CaravanGame;ready=true;
    map=ManagementMap.create($('#park-map'),{facilityDefinitions:api.facilityDefinitions,onSelect:id=>select(id),onBuild:(tool,start,end)=>{api.build(tool,start,end);$('#mg-build-hint').dataset.preview='';map.invalidate();render(true);},onPreview:p=>{$('#mg-build-hint').dataset.preview='true';$('#mg-build-hint').innerHTML=`<strong>${esc(p.label)}${p.cost===null?'':' · '+money(p.cost)}</strong><span>Release to build · Subject to game placement checks</span><button id="mg-cancel-tool">Cancel</button>`;}});
    places=M.getPlaces(api.getState());const id=new URLSearchParams(location.hash.slice(1)).get('place');if(places.some(p=>p.id===id))app.selected=id;
    let cameraSaved=false;try{cameraSaved=Boolean(localStorage.getItem('caravanweb_management_camera_v1'));}catch{}
    if(!cameraSaved)map.fit();render(true);
    const plan=map.getCamera().tilt===1;$('#mg-plan').setAttribute('aria-pressed',String(plan));$('#mg-plan').textContent=plan?'◇ Landscape view':'◇ Plan view';
    let exists=false;try{exists=Boolean(localStorage.getItem('caravan_tycoon_save'));}catch{}
    if(!exists)showWelcome();
});
})();
