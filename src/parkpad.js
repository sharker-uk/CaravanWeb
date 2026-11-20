/* ParkPad: tablet navigation layer. The original management engine stays mounted
 * behind the tablet; existing map/build/finance commands remain authoritative. */
(() => {
 'use strict';
 if(document.body.dataset.management!=='true')return;
 const root=document.querySelector('#management-app');
 if(!root)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
 const apps=[
  ['estate','🏡','Estate Agents','Find land and make an offer'],
  ['map','🗺️','Park Map','Explore your park and village'],
  ['build','🏗️','Builders','Roads, paths, pitches and construction'],
  ['utilities','⚡','Utilities','Water, electricity and services'],
  ['finances','📊','Accounts','Your income and expenditure'],
  ['guests','🧳','Guests','Bookings and visitor needs'],
  ['settings','🏠','Park Office','Records, saves and settings'],
  ['jobs','📋','Job Centre','Advertise jobs and recruit staff']
 ];
 root.insertAdjacentHTML('afterbegin',`<div id="parkpad-bar" class="parkpad-bar"><button type="button" id="parkpad-home-button">▦ ParkPad</button><span id="parkpad-location">Home</span><span id="parkpad-balance">£1,500</span><button type="button" id="parkpad-save">Save</button><button type="button" id="parkpad-close">✕ Close tablet</button></div><section id="parkpad-screen" class="parkpad-screen" aria-label="ParkPad tablet"><div id="parkpad-content"></div></section>`);
 const screen=document.querySelector('#parkpad-screen'),content=document.querySelector('#parkpad-content'),locationLabel=document.querySelector('#parkpad-location'),balance=document.querySelector('#parkpad-balance');
 let current='home',ready=false;
 const tabletOpen=()=>document.body.classList.contains('tablet-open');
 function showTablet(open){document.querySelector('#parkpad-bar').hidden=!open;screen.hidden=!open||!['home','estate','jobs'].includes(current);root.dataset.parkpadVisible=String(open);}
 window.addEventListener('caravan:tablet',event=>{if(event.detail.open){navigate('home');showTablet(true);}else showTablet(false);});
 const game=()=>window.CaravanGame;
 const state=()=>game()?.getState();
 const land=()=>window.CaravanLandParcels;
 function syncBalance(){const s=state();if(s)balance.textContent=money(Math.floor(s.cash));}
 function navigate(view){
  current=view;root.dataset.parkpadView=view;locationLabel.textContent=view==='home'?'Home':apps.find(a=>a[0]===view)?.[2]||view;
  const legacy=view==='estate'?'land':view==='utilities'?'build':view;
  if(!['home','estate','jobs'].includes(view)){
   const button=root.querySelector('.main-nav [data-view="'+legacy+'"]');button?.click();
  }
  screen.hidden=!tabletOpen()||!['home','estate','jobs'].includes(view);
  if(view==='home')renderHome();
  if(view==='estate')renderEstate();
  if(view==='jobs')renderJobs();
  syncBalance();
 }
 function renderHome(){
  content.innerHTML=`<div class="parkpad-intro"><p class="parkpad-kicker">NORFOLK COAST · PARKPAD</p><h1>Your park. Your business.</h1><p>Local services and everything you need to run your caravan park.</p></div><div class="parkpad-app-grid">${apps.map(([id,icon,name,desc])=>`<button class="parkpad-app" data-parkpad-open="${id}"><span class="parkpad-icon">${icon}</span><strong>${name}</strong><small>${desc}</small></button>`).join('')}</div>`;
 }
 function renderJobs(){
  const s=state();if(!s){content.innerHTML='<p>Loading Job Centre…</p>';return;}
  content.innerHTML='<div class="parkpad-intro"><p class="parkpad-kicker">CAISTER JOB CENTRE</p><h1>Find the right people.</h1><p>Recruitment will use advertised vacancies and applicants rather than instant hiring.</p></div><div class="parkpad-properties"><article class="parkpad-property"><div class="parkpad-property-info"><h2>Groundskeeper</h2><p>Help maintain the grounds and keep facilities tidy.</p><p>'+ (s.groundsStaff?'Your park currently employs grounds staff.':'Vacancy advertising is being developed.')+'</p><button disabled>Place vacancy advert · Coming soon</button></div></article><article class="parkpad-property"><div class="parkpad-property-info"><h2>Maintenance contractor</h2><p>Hire local tradespeople for repairs through a future contractor listing.</p><button disabled>Find contractor · Coming soon</button></div></article></div>';
 }
 function renderEstate(){
  const s=state(),P=land(),test=game()?.landTestEnabled?.();
  if(!s||!P){content.innerHTML='<p>Loading property listings…</p>';return;}
  const listing=P.PARCELS.map(p=>{
   const owned=P.ownsParcel(s.land,p.id);
   const canBuy=test&&p.id==='south_field'&&!owned&&game().southFieldQuote().ok;
   const reason=p.id==='south_field'&&test&&!owned?game().southFieldQuote().reasons.join(' '):'';
   return `<article class="parkpad-property"><div class="parkpad-property-art" aria-hidden="true"><span>🌳</span>${p.id==='south_field'?'<span>🏚️</span>':''}</div><div class="parkpad-property-info"><p class="parkpad-kicker">${esc(p.side)} · CAISTER COASTAL ESTATES</p><h2>${esc(p.name)}</h2><p>${p.id==='south_field'?'Partially overgrown agricultural land with an old barn.':'Neighbouring agricultural land available for future expansion.'}</p><div class="parkpad-property-meta"><strong>${money(p.price)}</strong><span>${p.w} × ${p.h} tiles</span><span>${owned?'Owned':'For sale'}</span></div>${owned?'<p class="parkpad-owned">✓ This land belongs to your park.</p>':canBuy?'<button class="parkpad-buy" data-parkpad-buy="south_field">Buy instantly · development test</button>':`<p class="parkpad-pending">${esc(reason||(test?'Purchase integration coming in a later milestone.':'Offers and two-day conveyancing are planned for normal gameplay.'))}</p>`}</div></article>`;
  }).join('');
  content.innerHTML=`<div class="parkpad-intro"><p class="parkpad-kicker">CAISTER COASTAL ESTATES</p><h1>Find room to grow.</h1><p>Neighbouring land and future opportunities around your park.</p>${test?'<p class="parkpad-test">Development test enabled · South Field completes instantly. A new test farm receives £12,000 extra starting capital.</p>':''}</div><div class="parkpad-properties">${listing}</div>`;
 }
 root.addEventListener('click',event=>{
  const open=event.target.closest('[data-parkpad-open]');if(open){navigate(open.dataset.parkpadOpen);return;}
  const buy=event.target.closest('[data-parkpad-buy]');if(buy){
   const q=game()?.southFieldQuote?.();if(!q?.ok){renderEstate();return;}
   if(!window.confirm('Buy South Field for '+money(q.price)+'? This is an instant development-test purchase.'))return;
   game().purchaseSouthFieldTest();renderEstate();return;
  }
 });
 document.querySelector('#parkpad-home-button').addEventListener('click',()=>navigate('home'));
 document.querySelector('#parkpad-close').addEventListener('click',()=>document.querySelector('#mg-walk-mode')?.click());
 document.querySelector('#parkpad-save').addEventListener('click',()=>{if(game()?.save())window.showToast?.('Park saved.');});
 window.addEventListener('caravan:ready',()=>{ready=true;navigate('home');});
 window.addEventListener('caravan:change',()=>{if(ready){syncBalance();if(current==='estate')renderEstate();}});
 // Existing management shell has already registered its own ready listener.
 // On a late injection the game may already exist.
 if(game()?.getState?.()){ready=true;navigate('home');}
 showTablet(tabletOpen());
})();
