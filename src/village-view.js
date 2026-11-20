(async()=>{
'use strict';
const $=s=>document.querySelector(s),V=VillageWorld,A=ManagementArt;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
 const response=await fetch('data/village-world.json');if(!response.ok)throw Error('The village layout could not be loaded.');const world=await response.json();
 let saved=null;try{saved=JSON.parse(localStorage.getItem('caravan_tycoon_save')||'null');}catch{}
 const summary=V.parkSummary(saved);$('#park-total').textContent=`${summary.pitches} pitches · ${summary.guests} guests`;
 let sim=V.createSimulation(world,summary),selected=null,trafficView=false,last=0,statsAt=0,width=1,height=1,drag=null;
 const camera={x:800,y:650,zoom:.6},svg=$('#village-map'),group=$('#v-world');
 function house(x,y,w=31,h=22,roof='#b2977d',type='home'){
  const windows=Array.from({length:Math.max(1,Math.floor((w-12)/14))},(_,i)=>`<rect x="${x+7+i*14}" y="${y+h+3}" width="7" height="5" fill="#75958b"/>`).join('');
  return `<g filter="url(#house-shadow)"><path d="M${x} ${y+h}v13h${w}v-13" fill="#e3d8bc" stroke="#9d9e80" stroke-width=".7"/><path d="M${x+w} ${y}l6 5v${h+8}l-6 0" fill="#aeb69a"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${roof}" stroke="#8b967a" stroke-width=".8"/><path d="M${x-2} ${y+h/2}h${w+4}" stroke="#8d8d76" stroke-width="1"/>${windows}<rect x="${x+w-9}" y="${y+h+3}" width="5" height="10" fill="#8e9a7d"/>${type==='shop'?`<path d="M${x-1} ${y+h+5}h${w+2}" stroke="#6f8d78" stroke-width="5"/><rect x="${x+7}" y="${y+h+5}" width="${w-20}" height="7" fill="#89aaa0"/>`:''}</g>`;
 }
 const roads=V.graph(world),path=r=>`M${world.nodes[r.a]}L${world.nodes[r.b]}`;
 const toSegment=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
 function parkArt(){
  const box=world.park,z=box.w/60;let out=`<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="4" fill="#b5c59f" stroke="#6c9065" stroke-dasharray="5 4" stroke-width="2"/>`;
  if(!Array.isArray(saved?.tiles)||saved.tiles.length!==40)return out+`<text x="${box.x+box.w/2}" y="${box.y+box.h/2}" text-anchor="middle" class="district-label">YOUR FUTURE PARK</text>`;
  let content='';saved.tiles.forEach((row,y)=>row.forEach((t,x)=>{if(t.terrain==='water'||t.terrain==='sand'||t.road||t.path)content+=`<rect x="${x*20}" y="${y*20}" width="20" height="20" fill="${t.terrain==='water'?'#8fb3ad':t.terrain==='sand'?'#e4d9af':t.road?'#c4c7b2':'#dbd5bc'}"/>`;if(t.nature==='tree')content+=A.tree(x*20+10,y*20+12,9,(x+y)%4);}));
  for(const p of saved.pitches||[]){const van=(saved.caravans||[]).find(v=>v.pitchId===p.id||saved.pitches[v.pitchIndex]===p),occupied=(saved.guests||[]).some(g=>saved.pitches[g.pitchIndex]===p);content+=`<rect x="${p.x*20+2}" y="${p.y*20+2}" width="${p.w*20-4}" height="${p.h*20-4}" fill="${p.type==='gravel'?'#c6ccb3':'#a6bd8c'}" stroke="#8ea779"/>`;if(van||occupied)content+=A.building({id:'van',x:(p.x+p.w/2)*20,y:(p.y+p.h/2)*20,w:56,h:32,type:van?'static':'touring',tier:'Silver'});}
  for(const f of [...(saved.facilities||[]),...(saved.landmarks||[]).filter(l=>l.blocksMovement)])content+=A.building({id:f.type,x:(f.x+f.w/2)*20,y:(f.y+f.h/2)*20,w:Math.min(85,f.w*20-6),h:Math.min(42,f.h*20-8),type:'facility'});
  for(const l of (saved.landmarks||[]).filter(l=>l.type==='land_plot'))content+=`<rect x="${l.x*20}" y="${l.y*20}" width="${l.w*20}" height="${l.h*20}" fill="none" stroke="${l.blocksBuilding?'#aa9869':'#83a078'}" stroke-width="3" stroke-dasharray="8 5"/>`;
  return out+`<g transform="translate(${box.x} ${box.y}) scale(${z/20})">${content}</g>`;
 }
 function parcelArt(){
  if(!window.CoastalFarmLayout)return '';
  const layout=window.CoastalFarmLayout.plan(world);
  const fences=layout.fields.map(p=>`<g><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="#a8bb8c" fill-opacity=".3" stroke="#77895f" stroke-width="2" stroke-dasharray="7 4"/><text x="${p.x+p.w/2}" y="${p.y+p.h/2}" text-anchor="middle" font-size="9" fill="#536a48" stroke="#d6dfbf" stroke-width="2" paint-order="stroke">${p.name}</text></g>`).join('');
  const f=layout.farmhouse;
  return `<g id="v-farm-parcels">${fences}<rect x="${f.x}" y="${f.y}" width="26" height="19" fill="#a8795f" stroke="#5e7757"/><text x="${f.x+13}" y="${f.y-5}" font-size="10" text-anchor="middle" fill="#526749">Old farmhouse</text></g>`;
 }
 function terrain(){
  let out='<rect x="-1000" y="-1000" width="4000" height="4000" fill="url(#v-water)"/><path d="M-1000-1000H1187V363L1270 580 1300 980 1250 2300H-1000Z" fill="url(#v-grass)"/><path d="M1187-1000H1208V363L1350 580 1380 980 1330 2300H1250L1300 980 1270 580 1187 363Z" fill="#e0d4a8"/><path d="M1198-1000V363L1290 580 1320 980 1270 2300" fill="none" stroke="#ede2bd" stroke-width="13"/>';
  out+='<path d="M350 55H715V340H335Z" fill="#b9c8a0" stroke="#8ba777" stroke-width="2"/><path d="M365 70H710M360 160H710M350 250H710" stroke="#a9bd8e" stroke-width="2"/><rect x="340" y="790" width="300" height="270" rx="12" fill="#b5c596" stroke="#8faa7d" stroke-dasharray="5 6"/><rect x="1000" y="420" width="205" height="175" rx="8" fill="#a1b68b" stroke="#8da77a"/>';
  out+='<rect x="1035" y="447" width="133" height="118" fill="none" stroke="#d7e1c6" stroke-width="2"/><path d="M1035 506h133m-66-59v118" stroke="#d7e1c6" fill="none"/><circle cx="1102" cy="506" r="17" fill="none" stroke="#d7e1c6"/>';
  // Narrow residential lanes provide the informal, clustered fishing-village character.
  for(const d of ['M790 350H665V280H585','M814 620H650V700H540','M850 890H1040V1000H1150','M1160 690V875H1245','M850 1100H1025V1190H1210'])out+=`<path d="${d}" class="road" stroke="#b1b99e" stroke-width="16"/><path d="${d}" class="road" stroke="#d0cfb7" stroke-width="11"/>`;
  for(const r of roads)out+=`<path d="${path(r)}" class="road" stroke="#b1b99f" stroke-width="${r.width+9}"/><path d="${path(r)}" class="road" stroke="#ced0bb" stroke-width="${r.width}"/><path d="${path(r)}" class="road" stroke="#ecebdd" stroke-width="1.2" stroke-dasharray="${r.singleLane?'0':'8 13'}"/>`;
  out+=`<path id="traffic-narrows" d="${path(roads.find(r=>r.id==='church-narrows'))}" class="road" stroke="#ba8e58" stroke-width="19" opacity="0"/>`;
  // Village homes, short terraces, and shops rather than a city-sized grid.
  for(const b of world.buildings){if(b.garden)out+=`<rect x="${b.x-7}" y="${b.y-7}" width="${b.w+13}" height="${b.h+32}" fill="#bfd0ab" stroke="#9eb38d" stroke-width=".7"/>`;out+=house(b.x,b.y,b.w,b.h,b.roof,b.kind);}
  out+='<text x="887" y="716" text-anchor="middle" font-family="Arial" font-size="6" fill="#f9f7eb">QUICKSTOP</text>';
  // Church with tower, fort footings, school, pavilion and lifeboat house.
  out+='<path d="M730 382v-15m-6 5h12" stroke="#77846b" stroke-width="2"/><rect x="691" y="385" width="88" height="125" rx="8" fill="none" stroke="#96a882" stroke-dasharray="3 4"/>';
  out+='<g stroke="#9da585" stroke-width="6" fill="none"><path d="M448 367h98v66h-98Zm31 0v43h38v23m-69-33h31m38-33v33h29"/></g>';

  out+='<path d="M1294 831v23h22v-23" fill="#718d83"/><path d="M1320 842h17v42h-17" stroke="#b9ad87" fill="#ddcda7"/>';
  out+='<rect x="1210" y="705" width="83" height="61" rx="4" fill="#bdc1a9" stroke="#a3af94"/><path d="M1222 716v18m17-18v18m17-18v18m17-18v18m-51 10v13m17-13v13m17-13v13m17-13v13" stroke="#e4e5d4" stroke-width="1.5"/>';
  out+=parkArt();out+=parcelArt();
  for(let i=0;i<190;i++){const x=70+(i*197%1240),y=50+(i*137%1200);if((x>330&&x<1285&&y<1200)||roads.some(r=>toSegment([x,y],world.nodes[r.a],world.nodes[r.b])<30))continue;out+=A.tree(x,y,8+i%5,i%4);}
  for(const [x,y] of [[350,370],[395,420],[580,420],[980,400],[1210,430],[1210,580],[920,550],[680,570],[920,1070],[1120,1180],[440,1120],[1240,270],[440,1070],[625,830]])out+=A.tree(x,y,14,(x+y)%4);
  out+='<g class="district-label"><text x="1065" y="50" text-anchor="middle">HAMPTONVILLA</text><text x="1095" y="612" text-anchor="middle" font-size="11">KINGFISHER GREEN</text><text x="515" y="330" text-anchor="middle" font-size="12">OLD FORT MEADOW</text><text x="475" y="1080" text-anchor="middle" font-size="11">WEST FIELD</text><text x="1480" y="620" text-anchor="middle" transform="rotate(90 1480 620)" font-size="29" letter-spacing="9">NORTH SEA</text></g>';
  out+='<g class="street-label"><text x="753" y="203" transform="rotate(86 753 203)">NATWINCH ROAD</text><text x="792" y="820" transform="rotate(85 792 820)">HIGH STREET</text><text x="990" y="676" transform="rotate(9 990 676)">BEACH ROAD</text><text x="221" y="800" transform="rotate(87 221 800)">COAST BYPASS</text><text x="550" y="529" transform="rotate(-18 550 529)">FEN ROAD</text></g>';
  out+='<g id="bypass-closure" style="display:none"><path d="M235 690l25 22m-26 2 25-24" stroke="#ad7854" stroke-width="5"/><rect x="162" y="715" width="170" height="29" rx="3" fill="#f5ebc9" stroke="#b39664"/><text x="247" y="734" text-anchor="middle" font-family="Arial" font-size="12" fill="#9b794e">BYPASS WORKS</text></g>';
  out+='<g id="church-signals"><rect x="783" y="455" width="9" height="18" rx="2" fill="#5f725b"/><circle id="signal-north" cx="787.5" cy="461" r="3" fill="#b78e6b"/><rect x="833" y="629" width="9" height="18" rx="2" fill="#5f725b"/><circle id="signal-south" cx="837.5" cy="635" r="3" fill="#b78e6b"/></g>';
  $('#v-terrain').innerHTML=out;
 }
 function pins(){$('#v-pins').innerHTML=world.places.map(p=>`<g class="v-pin ${p.id===selected?'active':''}" transform="translate(${p.x} ${p.y})" data-place="${p.id}" role="button" tabindex="0" aria-label="Explore ${esc(p.name)}"><circle r="19" fill="#faf9ed" stroke="#8ba17c" stroke-width="1.5"/><text y="4" text-anchor="middle">${esc(p.symbol)}</text><text y="34" text-anchor="middle" font-size="11" stroke="#e8edda" stroke-width="3" paint-order="stroke">${esc(p.name)}</text></g>`).join('');}
 function select(id){const p=world.places.find(p=>p.id===id);selected=p?.id||null;$('#v-detail').hidden=!p;if(p){$('#v-detail').innerHTML=`<button class="detail-close" aria-label="Close selected village place">×</button><p class="eyebrow">${esc(p.kind)}</p><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p><p class="next-note">${esc(p.next)}</p>${p.id==='park'?'<a class="primary" href="index.html">Manage your park →</a>':p.id==='church'||p.id==='bypass'?'<button id="detail-traffic" class="primary">Open traffic study</button>':''}`;document.querySelector('aside').classList.remove('mobile-open');$('#mobile-places').setAttribute('aria-expanded','false');}document.querySelectorAll('.place-row').forEach(b=>b.classList.toggle('active',b.dataset.place===selected));pins();}
 $('#places-list').innerHTML=world.places.map(p=>`<button class="place-row" data-place="${p.id}"><span>${esc(p.symbol)}</span><div><b>${esc(p.name)}</b><small>${esc(p.kind)}</small></div></button>`).join('');
 $('#places-list').addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(b)select(b.dataset.place);});
 function setTab(traffic){trafficView=traffic;$('#places-panel').hidden=traffic;$('#traffic-panel').hidden=!traffic;$('#places-tab').setAttribute('aria-pressed',String(!traffic));$('#traffic-tab').setAttribute('aria-pressed',String(traffic));$('#traffic-narrows').setAttribute('opacity',traffic?'.45':'0');}
 $('#places-tab').onclick=()=>setTab(false);$('#traffic-tab').onclick=()=>setTab(true);$('#v-detail').onclick=e=>{if(e.target.closest('.detail-close'))select(null);if(e.target.closest('#detail-traffic')){select(null);setTab(true);if(innerWidth<=700)document.querySelector('aside').classList.add('mobile-open');}};
 function reset(){const paused=sim.paused;sim=V.createSimulation(world,summary);sim.mode=$('#traffic-scenario').value;sim.bypassWorks=$('#bypass-works').checked;sim.paused=paused;$('#bypass-closure').style.display=sim.bypassWorks?'':'none';$('#scenario-note').textContent=sim.mode==='changeover'?'A busy changeover stress test, independent of current bookings.':'Village journeys plus traffic scaled to your saved park.';}
 $('#traffic-step').onclick=()=>{const paused=sim.paused;sim.paused=false;for(let i=0;i<5;i++)V.advance(sim,60);sim.paused=paused;};
 $('#traffic-scenario').onchange=reset;$('#bypass-works').onchange=reset;$('#traffic-reset').onclick=reset;$('#traffic-pause').onclick=()=>{sim.paused=!sim.paused;$('#traffic-pause').textContent=sim.paused?'Resume traffic':'Pause traffic';$('#traffic-status').textContent=sim.paused?'Traffic study paused':'Traffic study running';};
 function transform(){group.setAttribute('transform',`translate(${width/2} ${height/2}) scale(${camera.zoom}) translate(${-camera.x} ${-camera.y})`);}
 function fit(){camera.x=800;camera.y=650;camera.zoom=Math.max(.18,Math.min((width-60)/1600,(height-130)/1300));transform();}
 function zoom(factor){camera.zoom=Math.max(.18,Math.min(2.7,camera.zoom*factor));transform();}
 $('#v-plus').onclick=()=>zoom(1.25);$('#v-minus').onclick=()=>zoom(.8);$('#v-fit').onclick=fit;
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-Math.max(-150,Math.min(150,e.deltaY))*.002));},{passive:false});svg.addEventListener('contextmenu',e=>e.preventDefault());
 svg.addEventListener('pointerdown',e=>{svg.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y,id:e.target.closest('[data-place]')?.dataset.place,moved:false};svg.classList.add('dragging');});
 svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;if(drag.moved){camera.x=Math.max(-100,Math.min(1700,drag.cx-dx/camera.zoom));camera.y=Math.max(-100,Math.min(1400,drag.cy-dy/camera.zoom));transform();}});
 svg.addEventListener('pointerup',()=>{if(drag&&!drag.moved)select(drag.id);drag=null;svg.classList.remove('dragging');});svg.addEventListener('pointercancel',()=>{drag=null;svg.classList.remove('dragging');});
 svg.addEventListener('keydown',e=>{if(e.target.dataset.place&&['Enter',' '].includes(e.key)){e.preventDefault();select(e.target.dataset.place);return;}const keys={ArrowLeft:()=>camera.x-=80/camera.zoom,ArrowRight:()=>camera.x+=80/camera.zoom,ArrowUp:()=>camera.y-=80/camera.zoom,ArrowDown:()=>camera.y+=80/camera.zoom,'+':()=>zoom(1.25),'=':()=>zoom(1.25),'-':()=>zoom(.8),'0':fit,Escape:()=>select(null)};if(keys[e.key]){e.preventDefault();keys[e.key]();transform();}});
 $('#mobile-places').onclick=()=>{const aside=document.querySelector('aside'),open=aside.classList.toggle('mobile-open');$('#mobile-places').setAttribute('aria-expanded',String(open));if(open)aside.scrollTop=0;};$('#about-map').onclick=()=>$('#map-about').showModal();$('#close-about').onclick=()=>$('#map-about').close();$('#source-links').innerHTML=world.sources.map(s=>`<li><a target="_blank" rel="noopener" href="${esc(s.url)}">${esc(s.title)}</a></li>`).join('');
 $('#export-world').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(world,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='littlehampton-world-v1.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 terrain();pins();new ResizeObserver(()=>{const r=svg.getBoundingClientRect();width=r.width;height=r.height;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);fit();}).observe(svg);
 // Village walkabout is entered only from the park gate; traffic and village remain visible.
 const gate=window.CaravanRegionGate;
 const walkingVillage=Boolean(gate&&location.hash==='#walk'&&gate.consume(sessionStorage,'village'));
 const villagePlayer={x:world.nodes.parkGate[0],y:world.nodes.parkGate[1]};
 const villageKeys=new Set();
 let villageHint=null,villageAvatar=null;
 if(walkingVillage){
  villageAvatar=document.createElementNS('http://www.w3.org/2000/svg','g');
  villageAvatar.setAttribute('id','village-player');
  villageAvatar.innerHTML='<circle r="9" fill="#e8bc68" stroke="#fff6df" stroke-width="3"/><path d="M-4-3h8M0-5v10" stroke="#665a44" stroke-width="2"/>';
  group.append(villageAvatar);
  villageHint=document.createElement('div');
  villageHint.setAttribute('role','status');
  villageHint.style.cssText='position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#f8f2df;color:#315039;padding:10px 16px;border-radius:10px;z-index:20;box-shadow:0 2px 12px #0003;font-weight:600';
  villageHint.textContent='WASD / arrows: walk village roads · E: interact / return at park gate';
  document.body.append(villageHint);
  camera.x=villagePlayer.x;camera.y=villagePlayer.y;camera.zoom=Math.max(camera.zoom,1.15);
  document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e'].includes(k)){e.preventDefault();e.stopPropagation();villageKeys.add(k);}},true);
  document.addEventListener('keyup',e=>villageKeys.delete(e.key.toLowerCase()),true);
  window.addEventListener('blur',()=>villageKeys.clear());
 }
 function walkVillage(dt){
  if(!walkingVillage)return;
  const dx=Number(villageKeys.has('d')||villageKeys.has('arrowright'))-Number(villageKeys.has('a')||villageKeys.has('arrowleft'));
  const dy=Number(villageKeys.has('s')||villageKeys.has('arrowdown'))-Number(villageKeys.has('w')||villageKeys.has('arrowup'));
  const len=Math.hypot(dx,dy),speed=105;
  if(len){
   const nx=villagePlayer.x+dx/len*speed*dt,ny=villagePlayer.y+dy/len*speed*dt;
   // Roads are the first navigable corridor; private gardens remain inaccessible.
   const passable=(x,y)=>roads.some(r=>toSegment([x,y],world.nodes[r.a],world.nodes[r.b])<=Math.max(10,r.width*.65));
   if(passable(nx,villagePlayer.y))villagePlayer.x=nx;
   if(passable(villagePlayer.x,ny))villagePlayer.y=ny;
  }
  const gateDistance=Math.hypot(villagePlayer.x-world.nodes.parkGate[0],villagePlayer.y-world.nodes.parkGate[1]);
  const nearby=world.places.filter(p=>p.id!=='park').map(p=>({p,d:Math.hypot(villagePlayer.x-p.x,villagePlayer.y-p.y)})).sort((a,b)=>a.d-b.d)[0];
  if(villageKeys.has('e')){
   villageKeys.delete('e');
   if(gateDistance<24){gate.write(sessionStorage,'park');location.assign('index.html');return;}
   if(nearby&&nearby.d<65){select(nearby.p.id);villageHint.textContent=nearby.p.name+' · '+nearby.p.description; }
  }else if(gateDistance<24)villageHint.textContent='Park entrance · Press E to return to your farm';
  else if(nearby&&nearby.d<65)villageHint.textContent=nearby.p.name+' · Press E to explore';
  else villageHint.textContent='WASD / arrows: walk village roads · Follow Natwinch Road towards the High Street';
  villageAvatar.setAttribute('transform',`translate(${villagePlayer.x} ${villagePlayer.y})`);
  const t=Math.min(1,dt*5);
  camera.x+=(villagePlayer.x-camera.x)*t;camera.y+=(villagePlayer.y-camera.y)*t;transform();
 }
 function frame(now){const dt=last?Math.min(.2,(now-last)/1000):0;last=now;V.advance(sim,dt);walkVillage(dt);$('#v-cars').innerHTML=sim.cars.map(c=>{const p=V.position(sim,c),color={Guest:'#e7e6d5',Village:'#819d98',Through:'#a19580',Service:'#b99e7c'}[c.kind];return `<g transform="translate(${p.x} ${p.y}) rotate(${p.angle})"><rect x="-${c.length/2}" y="-3.5" width="${c.length}" height="7" rx="2" fill="${color}" stroke="#637a67" stroke-width=".8"/><rect x="1" y="-2.6" width="3" height="5.2" fill="#8ba6a0"/>${c.kind==='Guest'?'<path d="M-2-4v8" stroke="#7c8e77"/>':''}</g>`;}).join('');$('#signal-north').setAttribute('fill',V.signal(sim,true)?'#7da379':'#c08166');$('#signal-south').setAttribute('fill',V.signal(sim,false)?'#7da379':'#c08166');if(now-statsAt>250){statsAt=now;const m=V.metrics(sim);$('#traffic-vehicles').textContent=m.vehicles;$('#traffic-queue').textContent=m.queued;$('#traffic-delay').textContent=m.meanDelay+'s';$('#traffic-pressure').textContent=m.pressure;$('#traffic-status').textContent=`Traffic study ${sim.paused?'paused':'running'} · ${Math.floor(sim.time/60)}m ${Math.floor(sim.time%60)}s`;}requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
}catch(error){$('#v-error').hidden=false;$('#v-error').textContent=error.message;}
})();
