/* Procedural SVG artwork shared in spirit with the accepted map prototype. */
(function(root){
'use strict';
function tree(x,y,r=12,shade=0){const cs=['#68875b','#738f61','#809968','#5c7d55'];return `<g transform="translate(${x} ${y})" filter="url(#tree-shadow)"><ellipse cy="7" rx="${r*.88}" ry="${r*.55}" fill="#617f5033"/><path d="M0 8V-7" stroke="#707553" stroke-width="3"/><circle cx="-5" cy="-7" r="${r*.7}" fill="${cs[(shade+1)%4]}"/><circle cx="6" cy="-8" r="${r*.72}" fill="${cs[shade%4]}"/><circle cy="-15" r="${r*.78}" fill="${cs[(shade+2)%4]}"/></g>`;}
function building(p,hero=false){
 const x=p.x-p.w/2,y=p.y-p.h/2,w=p.w,h=p.h;
 const fill=p.type==='static'?({Basic:'#d5cfb8',Silver:'#d8ddd0',Gold:'#d7c9aa',Bronze:'#bdc7ad',Platinum:'#e6e2d4'}[p.tier]):p.type==='touring'?'#ecebd9':'#9a9a7a';
 if(p.id==='pond')return `<ellipse cx="${p.x}" cy="${p.y}" rx="64" ry="42" fill="#8aab85"/><ellipse cx="${p.x}" cy="${p.y-3}" rx="52" ry="32" fill="#7fa7a0" stroke="#acc19a" stroke-width="4"/><path d="m${p.x-25} ${p.y-6}q15-6 30 0m-12 16h20" fill="none" stroke="#b8cdc0" stroke-width="2"/>`;
 if(p.id==='beach')return `<g stroke="#8b9070" stroke-width="3"><path d="M${x} ${y}v25m${x+35} ${y}v25m-35-15h35m-35-9h35"/></g>`;
 if(p.id==='playground')return `<rect x="${x-6}" y="${y-6}" width="${w+12}" height="${h+12}" rx="9" fill="#c9bc92"/><path d="m${x+10} ${y+34} 13-37 13 37m-26-30h45m-8-7 9 37m-16-30v19m-10-19v19" stroke="#9e7755" stroke-width="3" fill="none"/><path d="M${x+27} ${y+22}h12" stroke="#667e60" stroke-width="5"/>`;
 if(p.type==='tent')return `<ellipse cx="${p.x}" cy="${p.y+19}" rx="32" ry="11" fill="#69875025"/><path d="M${x-4} ${y+h} ${p.x-3} ${y-7} ${x+w+7} ${y+h}Z" fill="#c7a277" stroke="#8d8c60"/><path d="M${x-4} ${y+h} ${p.x-3} ${y-7} ${p.x+4} ${y+h}Z" fill="#dfc293"/><path d="m${p.x-3} ${y+9} 5 31h-18Z" fill="#637856"/><path d="m${x-4} ${y+h} -8 4m${x+w+7} ${y+h} 7 4" stroke="#8c8860" stroke-width="1.5"/>`;
 const isVan=p.type==='static'||p.type==='touring',roof=isVan?fill:({farmhouse:'#b9896b',reception:'#b4b9a0',washrooms:'#8fa292',shop:'#b9a285',rusty:'#8b9b8c',fiddl:'#a79d83',laundry:'#91a294'}[p.id]||fill);
 const elevation=isVan?10:17;
 return `<ellipse cx="${p.x+7}" cy="${p.y+h/2+5}" rx="${w*.65}" ry="${h*.5}" fill="#49694218"/>
 <path d="M${x} ${y+h}v${elevation}h${w}v-${elevation}" fill="${isVan?'#b1b9a5':'#c7bea0'}" stroke="#768369" stroke-width="1"/><path d="M${x+w} ${y}l9 7v${h+elevation-7}l-9 ${-elevation}" fill="#8e9c82" stroke="#768369" stroke-width=".6"/>
 <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${isVan?4:1}" fill="${roof}" stroke="#73846d" stroke-width="1.1"/>
 ${isVan?`<path d="M${x+7} ${y+5}h${w-14}m-${w-14} 5h${w-14}m-${w-14} ${h-16}h${w-14}" stroke="#fffced" opacity=".45"/><rect x="${x+10}" y="${y+h+3}" width="13" height="5" fill="#547774"/><rect x="${x+31}" y="${y+h+3}" width="13" height="5" fill="#547774"/><rect x="${x+w-13}" y="${y+h+1}" width="7" height="9" fill="#eef0dc"/><rect x="${x+w-17}" y="${y+h+10}" width="17" height="7" fill="#a5997b"/>`:`<path d="M${x-3} ${y+h/2}h${w+6}" stroke="#7c8b73" stroke-width="1.4"/><path d="m${x-3} ${y+h/2} ${w/2+3} ${-h/2-7} ${w/2+3} ${h/2+7}" fill="${roof}" stroke="#74826b" stroke-width="1"/><rect x="${x+w/2-4}" y="${y+h+4}" width="8" height="13" fill="#738f7a"/><rect x="${x+10}" y="${y+h+4}" width="12" height="7" fill="#71948b"/>`}`;
}

root.ManagementArt={tree,building};
})(window);

(function(root){
    'use strict';
    const M=root.ManagementModel,A=root.ManagementArt,W=root.CaravanConnectedWorld,unit=20;
    const externalParcels=root.CaravanLandParcels;
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const statusColor={available:'#5a876a',occupied:'#aaa088',reserved:'#c39757',closed:'#be7653',open:'#74948c',unavailable:'#b5a274',owned:'#63876b',for_sale:'#b59658',locked:'#a69b7c',building:'#c39757'};
    // ART-3: staged artwork, visual only. Preserve existing world geometry.
    const artRegistry={"residential/detached_victorian":["sprites/residential/detached_victorian.png",192,183,12,10],"residential/semi_1930s":["sprites/residential/semi_1930s.png",224,194,14,9],"residential/semi_1970s":["sprites/residential/semi_1970s.png",224,176,14,9],"residential/detached_traditional":["sprites/residential/detached_traditional.png",160,144,10,10],"residential/detached_gabled":["sprites/residential/detached_gabled.png",160,156,10,10],"residential/detached_modern":["sprites/residential/detached_modern.png",192,172,12,10],"residential/bungalow":["sprites/residential/bungalow.png",192,145,12,9],"residential/cottage":["sprites/residential/cottage.png",96,104,6,8],"residential/terrace":["sprites/residential/terrace.png",80,132,5,8],"residential_side/victorian_side":["sprites/residential_side/victorian_side.png",160,192,10,12],"residential_side/semi_1930s_side":["sprites/residential_side/semi_1930s_side.png",144,165,9,14],"residential_side/semi_1970s_side":["sprites/residential_side/semi_1970s_side.png",144,154,9,14],"residential_side/detached_side":["sprites/residential_side/detached_side.png",160,149,10,10],"residential_side/gabled_side":["sprites/residential_side/gabled_side.png",160,150,10,10],"residential_side/modern_front":["sprites/residential_side/modern_front.png",192,191,12,10],"residential_side/bungalow_rear":["sprites/residential_side/bungalow_rear.png",192,143,12,9],"residential_side/cottage_side":["sprites/residential_side/cottage_side.png",128,147,8,6],"residential_side/terrace_side":["sprites/residential_side/terrace_side.png",128,205,8,5],"high_street/fish_chips":["sprites/high_street/fish_chips.png",96,124,6,8],"high_street/bakery":["sprites/high_street/bakery.png",112,130,7,9],"high_street/cafe":["sprites/high_street/cafe.png",112,137,7,9],"high_street/pharmacy":["sprites/high_street/pharmacy.png",128,137,8,10],"high_street/estate_agents":["sprites/high_street/estate_agents.png",128,124,8,10],"high_street/post_office":["sprites/high_street/post_office.png",128,134,8,10],"high_street/bank":["sprites/high_street/bank.png",160,165,10,12],"high_street/council":["sprites/high_street/council.png",160,151,10,12],"high_street/pub":["sprites/high_street/pub.png",240,237,15,12],"trade/cr_diy":["sprites/trade/cr_diy.png",240,250,15,7],"trade/timber":["sprites/trade/timber.png",240,242,15,7],"trade/builders":["sprites/trade/builders.png",240,247,15,7],"trade/tool_hire":["sprites/trade/tool_hire.png",240,240,15,7],"trade/caravan_sales":["sprites/trade/caravan_sales.png",240,233,15,7],"trade/garage":["sprites/trade/garage.png",240,222,15,7],"trade/garden_centre":["sprites/trade/garden_centre.png",240,227,15,7],"trade/fidl":["sprites/trade/fidl.png",320,322,20,15],"trade/t_mart":["sprites/trade/t_mart.png",400,387,25,20],"landmarks/church":["sprites/landmarks/church.png",352,343,22,12],"landmarks/old_hall":["sprites/landmarks/old_hall.png",320,341,20,15],"landmarks/worlds_end":["sprites/landmarks/worlds_end.png",240,236,15,12],"landmarks/brewery":["sprites/landmarks/brewery.png",288,285,18,15],"landmarks/job_centre":["sprites/landmarks/job_centre.png",192,187,12,10],"landmarks/solicitors":["sprites/landmarks/solicitors.png",160,169,10,10],"landmarks/convenience":["sprites/landmarks/convenience.png",128,149,8,10],"landmarks/community_hall":["sprites/landmarks/community_hall.png",240,240,15,12],"landmarks/fire_station":["sprites/landmarks/fire_station.png",256,247,16,12],"tents/a_frame":["sprites/tents/a_frame.png",32,27,2,3],"tents/dome_blue":["sprites/tents/dome_blue.png",32,24,2,2],"tents/dome_orange":["sprites/tents/dome_orange.png",48,40,3,3],"tents/tunnel":["sprites/tents/tunnel.png",48,51,3,5],"tents/family":["sprites/tents/family.png",80,74,5,6],"tents/inflatable":["sprites/tents/inflatable.png",64,62,4,7],"tents/bell":["sprites/tents/bell.png",80,72,5,5],"tents/safari":["sprites/tents/safari.png",80,75,5,7],"tents/ridge":["sprites/tents/ridge.png",64,63,4,6],"touring/vintage":["sprites/touring/vintage.png",90,68,2.1,4.5],"touring/compact":["sprites/touring/compact.png",90,71,2.1,4.5],"touring/aluminium":["sprites/touring/aluminium.png",113,79,2.3,6],"touring/family":["sprites/touring/family.png",113,93,2.3,6],"touring/solar":["sprites/touring/solar.png",113,97,2.3,6],"touring/twin_axle":["sprites/touring/twin_axle.png",143,121,2.5,8],"touring/luxury":["sprites/touring/luxury.png",143,123,2.5,8],"touring/aerodynamic":["sprites/touring/aerodynamic.png",143,125,2.5,8],"touring/awning":["sprites/touring/awning.png",163,153,5,7],"statics/vintage":["sprites/statics/vintage.png",48,116,3,9],"statics/standard":["sprites/statics/standard.png",64,148,4,12],"statics/panoramic":["sprites/statics/panoramic.png",64,146,4,12],"statics/family":["sprites/statics/family.png",64,139,4,12],"statics/luxury":["sprites/statics/luxury.png",69,148,4.3,13],"statics/budget":["sprites/statics/budget.png",56,129,3.5,10],"statics/timber_lodge":["sprites/statics/timber_lodge.png",80,136,5,12],"statics/twin_lodge":["sprites/statics/twin_lodge.png",96,161,6,14],"statics/coastal_lodge":["sprites/statics/coastal_lodge.png",112,191,7,15],"residential_individual/semi_01":["sprites/residential_individual/semi_01.png",224,160,14,9],"residential_individual/semi_02":["sprites/residential_individual/semi_02.png",224,153,14,9],"residential_individual/detached_01":["sprites/residential_individual/detached_01.png",160,171,10,10],"residential_individual/detached_02":["sprites/residential_individual/detached_02.png",160,152,10,10],"residential_individual/bungalow_01":["sprites/residential_individual/bungalow_01.png",192,139,12,9],"residential_individual/cottage_01":["sprites/residential_individual/cottage_01.png",96,105,6,8],"residential_individual/bungalow_l_side":["sprites/residential_individual/bungalow_l_side.png",192,191,12,12],"residential_individual/bungalow_side":["sprites/residential_individual/bungalow_side.png",144,179,9,12]};
    const villageSprites={"church-nave":"landmarks/church","fidl":"trade/fidl","old-hall":"landmarks/old_hall","brewery":"landmarks/brewery","tesco":"trade/t_mart","trade-0":"trade/cr_diy","trade-1":"trade/timber","trade-2":"trade/builders","trade-3":"trade/tool_hire","trade-4":"trade/caravan_sales","trade-5":"trade/garage","trade-6":"trade/garden_centre","high-0":"landmarks/job_centre","high-1":"high_street/estate_agents","high-2":"high_street/bank","high-3":"high_street/council","high-4":"high_street/post_office","high-5":"high_street/pub","high-6":"high_street/fish_chips","high-7":"high_street/bakery","high-8":"high_street/cafe","high-9":"high_street/pharmacy","home-0":"residential/terrace","home-1":"residential/cottage","home-2":"residential/detached_traditional","home-3":"residential/terrace","home-4":"residential/cottage","home-5":"residential/detached_gabled"};
    function sprite(id,x,y,w,h,physical=false){
        const a=artRegistry[id];if(!a||w<=0||h<=0)return '';
        const [path,pw,ph,mw,mh]=a;
        const scale=Math.min(w/pw,h/ph,physical?Math.min(mw*unit/pw,mh*unit/ph):Infinity);
        const sw=pw*scale,sh=ph*scale;
        return `<image data-art-id="${id}" href="assets/art-staging/art2/${path}" x="${x+(w-sw)/2}" y="${y+h-sh}" width="${sw}" height="${sh}" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`;
    }
    function accommodationSprite(p){
        const hash=Array.from(String(p.id)).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0);
        const tier=root.StaticCaravans.getModel(p.van?.modelId)?.tierName;
        const ids=p.van?[({Basic:'vintage',Bronze:'budget',Silver:'standard',Gold:'family',Platinum:'luxury'}[tier]||'standard')]:p.guest?.accommodation==='tent'?['a_frame','dome_blue','dome_orange','tunnel','family','inflatable','ridge']:['vintage','compact','aluminium','family','solar','twin_axle','luxury','aerodynamic','awning'];
        const category=p.van?'statics':p.guest?.accommodation==='tent'?'tents':'touring';
        return sprite(category+'/'+ids[hash%ids.length],p.x*unit+4,p.y*unit+4,p.w*unit-8,p.h*unit-8,true);
    }
    function placeArt(p) {
        const x=(p.x+p.w/2)*unit,y=(p.y+p.h/2)*unit;
        if(p.type==='land_plot')return `<rect x="${p.x*unit+2}" y="${p.y*unit+2}" width="${p.w*unit-4}" height="${p.h*unit-4}" rx="3" fill="${p.status==='owned'?'#93ac7c10':'#ddc98e28'}" stroke="${p.status==='owned'?'#829c74':'#a18e59'}" stroke-width="2" stroke-dasharray="${p.status==='owned'?'3 8':'9 5'}"/><text x="${p.x*unit+9}" y="${p.y*unit+16}" fill="#6b714e" font-size="10" font-family="Arial">${esc(p.name.toUpperCase())} · ${p.status==='owned'?'OWNED':esc(p.label.split(' · ')[0])}</text>`;
        if(p.type==='beach_gate')return `<g transform="translate(${p.x*unit} ${p.y*unit})"><rect x="1" y="1" width="${p.w*unit-2}" height="${p.h*unit-2}" rx="3" fill="#d3c9a488" stroke="#a4946c" stroke-dasharray="4 4"/><path d="M5 2V${p.h*unit-2}m10-${p.h*unit-4}v${p.h*unit-4}m-10-22h10m-10 12h10" stroke="${p.status==='open'?'#65866a':'#a18b61'}" stroke-width="3"/></g>`;
        if(p.type==='for_sale')return `<rect x="${p.x*unit}" y="${p.y*unit}" width="${p.w*unit}" height="${p.h*unit}" fill="#d1c89d30" stroke="#8c9870" stroke-width="2" stroke-dasharray="5 5"/><rect x="${x-34}" y="${y-22}" width="68" height="32" rx="2" fill="#e9e1c3" stroke="#9c946e"/><path d="M${x-24} ${y+10}v25m48-25v25" stroke="#9c946e" stroke-width="3"/>`;
        const obj={id:p.type,x,y,w:Math.min(100,p.w*unit-10),h:Math.min(50,p.h*unit-16),type:p.kind==='pitch'?(p.van?'static':p.guest?.accommodation==='tent'?'tent':'touring'):'facility',tier:p.van?root.StaticCaravans.getModel(p.van.modelId)?.tierName:'Silver'};
        if(p.kind==='pitch'){
            const lot=`<rect x="${p.x*unit+3}" y="${p.y*unit+3}" width="${p.w*unit-6}" height="${p.h*unit-6}" rx="4" fill="${p.entity.type==='gravel'?'#c3c9ae':'#a8bc8e'}" stroke="#8fa57b" stroke-width="1.1"/><path d="M${p.x*unit+8} ${(p.y+p.h)*unit-10}h17" stroke="#849a6e" stroke-width="3"/>`;
            let unitArt='';if(p.van||p.guest)unitArt=accommodationSprite(p)||A.building(obj);
            const decking=p.entity.decking?`<rect x="${x-32}" y="${y+38}" width="64" height="25" fill="#ae9b78" stroke="#9c8a67"/><path d="M${x-28} ${y+44}h56m-56 6h56m-56 6h56" stroke="#c0af8e"/>`:'';
            const accessories=(p.entity.accessories||[]).map(item=>`<rect x="${item.x*unit+4}" y="${item.y*unit+4}" width="${item.w*unit-8}" height="${item.h*unit-8}" rx="4" fill="${item.type==='hot_tub'?'#739a97':'#ba9b70'}" stroke="#798d6b"/>`).join('');
            return lot+decking+unitArt+accessories;
        }
        if(p.type==='selling_stall'){const x=p.x*unit,y=p.y*unit;return `<g pointer-events="none"><rect x="${x+2}" y="${y+7}" width="16" height="11" rx="1" fill="#996a3d" stroke="#60432b"/><path d="M${x+1} ${y+7}l3 -5h12l3 5z" fill="#d5b47a" stroke="#60432b"/><path d="M${x+5} ${y+10}h10" stroke="#e5cba1" stroke-width="2"/></g>`;}
        const facility={farmhouse:'office',reception:'reception',washrooms:'toilets',toilets:'toilets',showers:'showers',laundry:'laundry',shop:'shop',pub:'clubhouse',restaurant:'restaurant',arcade:'arcade',entertainment_space:'clubhouse',pool:'pool_building',activity_centre:'gym',entertainment_hub:'clubhouse',maintenance:'maintenance',barn:'storage_barn',rusty:'workshop'}[p.type];
        if(facility)return `<image href="assets/art-staging/accommodation/sprites/${facility}_standard.png" x="${p.x*unit}" y="${p.y*unit}" width="${p.w*unit}" height="${p.h*unit}" preserveAspectRatio="xMidYMax meet" pointer-events="none"/>`;
        return A.building(obj);
    }
    function create(svg,callbacks) {
        const world=svg.querySelector('#mg-world'),labels=svg.querySelector('#mg-map-labels');
        const scene=document.createElementNS('http://www.w3.org/2000/svg','g');
        world.append(scene);
        let width=1,height=1,baseZoom=.8,game=null,places=[],selected=null,visibleIds=null,route=null,tool='select',layers={labels:true,people:true,utilities:false,grid:false},worldKey='',pointer=null,moved=false,pinchDistance=null;
        const MIN_OVERVIEW_ZOOM=.025;
        const camera={x:570,y:400,zoom:1.4,rotation:0,tilt:1},touches=new Map();
        try{const saved=JSON.parse(localStorage.getItem('caravanweb_management_camera_v1'));if(saved&&['x','y','zoom','rotation','tilt'].every(k=>Number.isFinite(saved[k]))){camera.x=Math.max(-650,Math.min(1500,saved.x));camera.y=Math.max(-300,Math.min(1100,saved.y));camera.zoom=Math.max(MIN_OVERVIEW_ZOOM,Math.min(6,saved.zoom));camera.rotation=saved.rotation%360;camera.tilt=saved.tilt===1?1:.8;}}catch{}
        function persist(){try{localStorage.setItem('caravanweb_management_camera_v1',JSON.stringify(camera));}catch{}}
        function dimensions(){const rect=svg.getBoundingClientRect();width=rect.width;height=rect.height;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);baseZoom=Math.max(MIN_OVERVIEW_ZOOM,Math.min((width-50)/1200,(height-140)/(800*camera.tilt)));}
        function cameraChanged(shouldPersist=true){
            const a=camera.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),z=camera.zoom,t=camera.tilt;
            world.setAttribute('transform',`matrix(${z*c} ${z*t*s} ${-z*s} ${z*t*c} ${width/2-z*c*camera.x+z*s*camera.y} ${height/2-z*t*s*camera.x-z*t*c*camera.y})`);
            labels.querySelectorAll('[data-place]').forEach(el=>{const p=places.find(p=>p.id===el.dataset.place);if(!p)return;const xy=M.project((p.x+p.w/2)*unit,(p.y+p.h/2)*unit-8,camera,width,height);el.setAttribute('transform',`translate(${xy})`);el.querySelector('.pin-name').style.display=layers.labels&&(camera.zoom>.7||p.id===selected)?'':'none';});
            const d=route?route.points.map(([x,y],i)=>`${i?'L':'M'}${M.project(x*unit,y*unit,camera,width,height)}`).join(' '):'';
            labels.querySelectorAll('[data-route]').forEach(el=>el.setAttribute('d',d));
            const sea=labels.querySelector('[data-sea]');if(sea){const xy=M.project(1100,360,camera,width,height);sea.setAttribute('x',xy[0]);sea.setAttribute('y',xy[1]);}
            const percent=document.getElementById('zoom-value');if(percent)percent.textContent=Math.round(camera.zoom/baseZoom*100)+'%';
            const north=document.getElementById('mg-north');if(north)north.style.transform=`rotate(${camera.rotation}deg)`;
            callbacks.onCamera?.(camera);if(shouldPersist)persist();
        }
        function zoom(factor,x=width/2,y=height/2){const before=M.unproject(x,y,camera,width,height);camera.zoom=Math.max(MIN_OVERVIEW_ZOOM,Math.min(6,camera.zoom*factor));const after=M.unproject(x,y,camera,width,height);camera.x+=before[0]-after[0];camera.y+=before[1]-after[1];cameraChanged();}
        function fit(){dimensions();const b=sceneBounds(),connected=villageData&&game&&W.usesFarmBoundary(game);Object.assign(camera,connected?{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2,rotation:0,zoom:Math.max(MIN_OVERVIEW_ZOOM,Math.min((width-50)/(b.right-b.left),(height-140)/((b.bottom-b.top)*camera.tilt)))}:{x:570,y:400,rotation:0,zoom:baseZoom});cameraChanged();}
        function pan(dx,dy){const xy=M.unproject(width/2+dx,height/2+dy,camera,width,height);clampCamera(xy[0],xy[1]);cameraChanged();}
        function focus(p){if(!p)return;camera.zoom=Math.max(camera.zoom,width<650?.68:1);camera.x=(p.x+p.w/2)*unit+(width<650?0:140);camera.y=(p.y+p.h/2)*unit+(width<650?160:20);cameraChanged();}
        // Draw the actual village's roads and buildings in the park's coordinate system.
        // The village's park footprint is mapped onto the existing 60x40 playable grid.
        let villageData=null, placement=null;
        function sceneBounds(){
            if(!villageData||!placement||!game||!W.usesFarmBoundary(game))return {left:-650,top:-300,right:1500,bottom:1100};
            const b=villageData.bounds;
            const [left,top]=placement.toScene([b.x,b.y]).map(n=>n*unit);
            const [right,bottom]=placement.toScene([b.x+b.w,b.y+b.h]).map(n=>n*unit);
            return {left,top,right,bottom};
        }
        function clampCamera(x,y){const b=sceneBounds();camera.x=Math.max(b.left,Math.min(b.right,x));camera.y=Math.max(b.top,Math.min(b.bottom,y));}

        fetch('data/village-world.json').then(r=>{if(!r.ok)throw Error('Village data unavailable');return r.json();}).then(data=>{
            villageData=data;placement=W.placeVillage(data);worldKey='';if(game)render(game,places,{selected,visibleIds,route,tool,layers});
        }).catch(err=>console.warn('Village scenery could not load:',err));
        function villageFringe(){
            if(!villageData||!W.usesFarmBoundary(game))return '';
            const v=villageData;
            const x=n=>placement.toScene([n,0])[0]*unit;
            const y=n=>placement.toScene([0,n])[1]*unit;
            const size=n=>placement.toSceneLength(n)*unit;
            const roadGeometry=v.roads.map(r=>{
                const a=v.nodes[r.a],b=v.nodes[r.b];if(!a||!b)return null;
                const d=r.control?.length===2?`M${x(a[0])} ${y(a[1])}C${r.control.map(c=>x(c[0])+' '+y(c[1])).join(' ')} ${x(b[0])} ${y(b[1])}`:`M${x(a[0])} ${y(a[1])}L${x(b[0])} ${y(b[1])}`;
                const w=r.id==='park-lane'?(W.gate.maxY-W.gate.minY)*unit:size(r.width);
                return {d,w,pavement:r.pavement===undefined?3.5:size(r.pavement)};
            }).filter(Boolean);
            const roads='<g fill="none" stroke-linejoin="round" stroke-linecap="round">'+roadGeometry.map(({d,w,pavement})=>`<path d="${d}" stroke="url(#art3-paving)" stroke-width="${w+2*pavement}"/>`).join('')+roadGeometry.map(({d,w})=>`<path d="${d}" stroke="url(#art3-tarmac)" stroke-width="${w}"/>`).join('')+roadGeometry.map(({d,w})=>w>12?`<path d="${d}" stroke="#e6e3cb" stroke-width="1" stroke-dasharray="8 10"/>`:'').join('')+'</g>';
            const reserved=(v.reservedAreas||[]).map(a=>`<rect x="${x(a.x)}" y="${y(a.y)}" width="${x(a.x+a.w)-x(a.x)}" height="${y(a.y+a.h)-y(a.y)}" fill="${a.id==='old-railway'?'#b9ab83':'#c4c68c'}" stroke="#9a936c" stroke-dasharray="5 4"/>`).join('');
            const buildings=v.buildings.map(b=>{
                const bx=x(b.x),by=y(b.y),w=x(b.x+b.w)-bx,h=y(b.y+b.h)-by;
                const roof=b.roof||'#b29a7c';
                const imported=sprite(villageSprites[b.id],bx,by,w,h);
                if(imported&&!b.scalePilot)return imported;
                // Commercial identity artwork stays inside the collision footprint.
                if(/^trade-[0-6]$/.test(b.id)){
                    const i=Number(b.id.slice(-1));
                    const palette=['#526c76','#92734e','#827d70','#526e82','#d3d8ce','#68767a','#739b76'];
                    const rect=(x,y,w,h,fill,stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}"/>`;
                    const line=(x,y,X,Y,c,width=1)=>`<path d="M${x} ${y}L${X} ${Y}" stroke="${c}" stroke-width="${width}"/>`;
                    const bays=(n)=>Array.from({length:n},(_,j)=>rect(8+j*84/n,75,70/n,20,'#a9b5b5','#48585b')+Array.from({length:4},(_,k)=>line(8+j*84/n,79+k*4,8+j*84/n+70/n,79+k*4,'#738386')).join('')).join('');
                    let art=rect(0,0,100,100,'#d4c9b0','#665f51')+rect(1,1,98,70,palette[i],'#59645c');
                    if(i===0){ // DIY retail warehouse
                        art+=rect(5,8,90,12,'#758e98')+rect(8,29,84,5,'#a5b7b9')+rect(8,48,84,5,'#a5b7b9')+rect(0,72,100,8,'#d77b36')+rect(12,83,76,12,'#b8d5d8','#526c76')+rect(45,81,10,18,'#455e66');
                    }else if(i===1){ // timber merchant: covered racks
                        art+=rect(5,5,90,62,'#b29b74')+Array.from({length:5},(_,j)=>rect(9+j*17,10,12,51,'#896b43','#6e5437')+line(12+j*17,12,12+j*17,59,'#d3b789',2)).join('')+bays(2);
                    }else if(i===2){ // builders merchant: covered aggregate bins
                        art+=Array.from({length:4},(_,j)=>rect(5+j*23,7,20,57,['#bcb6a5','#c6a47a','#8d8b80','#b4a38d'][j],'#66665e')+Array.from({length:3},(_,k)=>line(7+j*23,20+k*12,22+j*23,20+k*12,'#e1d6bf')).join('')).join('')+bays(3);
                    }else if(i===3){ // tool hire workshop
                        art+=Array.from({length:4},(_,j)=>rect(8+j*23,12,14,42,'#8da6b0','#3d596b')).join('')+rect(0,69,100,7,'#d6aa45')+bays(3);
                    }else if(i===4){ // caravan sales showroom, glazed roof and display silhouettes
                        art+=rect(4,4,92,63,'#9ebcc1','#627f85')+Array.from({length:3},(_,j)=>rect(10+j*30,15,24,38,'#f3eee0','#7c8987')+rect(13+j*30,20,18,7,'#7d9ca7')+rect(13+j*30,42,18,5,'#b6b4a8')).join('')+rect(5,76,90,18,'#b8d5d8','#627f85');
                    }else if(i===5){ // garage
                        art+=rect(7,8,86,48,'#8a9698')+Array.from({length:5},(_,j)=>line(10+j*20,9,10+j*20,55,'#bcc6c5')).join('')+rect(0,69,100,6,'#a24d42')+bays(3);
                    }else{ // garden centre greenhouse
                        art+=rect(4,4,92,64,'#b9d3bb','#527c62')+Array.from({length:6},(_,j)=>line(5+j*18,4,5+j*18,68,'#759a83')).join('')+Array.from({length:8},(_,j)=>`<circle cx="${12+(j%4)*24}" cy="${20+Math.floor(j/4)*30}" r="7" fill="${j%2?'#7b9b59':'#547e4c'}"/>`).join('')+rect(8,77,84,17,'#9fb77b','#527c62');
                    }
                    return `<g data-commercial-art="${b.id}" transform="translate(${bx} ${by}) scale(${w/100} ${h/100})">${art}</g>`;
                }
                if(b.scalePilot){
                    const front=y(v.nodes[v.roads.find(r=>r.id==='res-road').a][1])+size(v.roads.find(r=>r.id==='res-road').width)/2+size(v.roads.find(r=>r.id==='res-road').pavement);
                    const pathX=bx+w*.5, carW=1.8*unit,carL=4.5*unit;
                    return `<g><rect x="${bx-10}" y="${front}" width="${w+20}" height="${by+h+65-front}" fill="#a0b780" stroke="#668354" stroke-width="3"/>
                    <path d="M${pathX} ${front}V${by}" stroke="#d8cbb1" stroke-width="22"/>
                    ${imported||`                    <rect x="${bx}" y="${by}" width="${w}" height="${h}" fill="#dfc7a4" stroke="#756653"/>
                    <rect x="${bx}" y="${by+12}" width="${w}" height="${h-12}" fill="${roof}" stroke="#756653"/>
                    <path d="M${bx} ${by+h*.55}h${w}" stroke="#e0bda2" stroke-width="3"/>
                    <rect x="${pathX-9}" y="${by}" width="18" height="12" fill="#64574a"/>
                    <rect x="${bx+12}" y="${by+2}" width="20" height="8" fill="#b5d1d8"/>
                    <rect x="${bx+w-32}" y="${by+2}" width="20" height="8" fill="#b5d1d8"/>
`}
                    <circle cx="${bx+20}" cy="${by+h+30}" r="14" fill="#63884f"/>
                    <path d="M${bx-8} ${by+h+62}h${w+16}" stroke="#557648" stroke-width="5"/>
                    ${b.driveway?`<g transform="translate(${bx+8} ${front-5}) rotate(-90)"><rect x="-4" y="-4" width="${carW+8}" height="${carL+8}" fill="#858983"/><rect width="${carW}" height="${carL}" rx="7" fill="#466d91" stroke="#304b63"/><rect x="4" y="17" width="${carW-8}" height="17" rx="3" fill="#b8d0d7"/><rect x="4" y="${carL-25}" width="${carW-8}" height="13" rx="3" fill="#b8d0d7"/></g>`:''}</g>`;
                }

                const garden=b.garden?`<rect x="${bx-6}" y="${by-6}" width="${w+12}" height="${h+12}" rx="2" fill="#a8bf96" stroke="#8ca77e"/><path d="M${bx+w*.5} ${by+h}v6" stroke="#ddd0b2" stroke-width="5"/><circle cx="${bx-3}" cy="${by+h*.8}" r="3" fill="#678b59"/>`:'';
                const windows=[.22,.72].map(t=>`<rect x="${bx+w*t-3}" y="${by+h*.83}" width="6" height="5" fill="#b7d4d6" stroke="#65766c" stroke-width=".7"/>`).join('');
                return `<g>${garden}<rect x="${bx}" y="${by}" width="${w}" height="${h}" fill="#e3d4b8" stroke="#756f5e"/><path d="M${bx} ${by}H${bx+w}L${bx+w} ${by+h*.78}H${bx}Z" fill="${roof}" stroke="#756f5e"/><path d="M${bx} ${by+h*.39}H${bx+w}" stroke="#ffffff" opacity=".3" stroke-width="2"/><path d="M${bx+w*.5} ${by+h*.82}v${h*.18}" stroke="#66594b" stroke-width="5"/>${windows}${b.kind==='shop'?`<path d="M${bx} ${by+h*.72}h${w}" stroke="#e3d8b9" stroke-width="6"/>`:''}</g>`;
            }).join('');
            const labels=v.places.filter(q=>q.id!=='park').map(q=>`<text x="${x(q.x)}" y="${y(q.y)+30}" text-anchor="middle" font-size="12" fill="#4f674d" paint-order="stroke" stroke="#dce6cf" stroke-width="3">${String(q.name).replace(/[&<>]/g,'')}</text>`).join('');
            // Village park ends at the shore; the public beach continues east of it.
            // Keep the sand outside the saved park tiles, so the coast is not a buildable expansion.
            const shore=x(v.park.x+v.park.w);
            const bounds=sceneBounds(), top=bounds.top-100, bottom=bounds.bottom+100, left=bounds.left-100, right=bounds.right+100;
            const coast=root.CaravanCoastalArt?.render({shore,unit,worldHeight:bottom-top,top,beachWidth:size(70)});
            const seaEdge=shore+size(70);
            const fallback=`<rect x="${shore}" y="${top}" width="${seaEdge-shore}" height="${bottom-top}" fill="#e4d5ac"/><rect x="${seaEdge}" y="${top}" width="${Math.max(0,right-seaEdge)}" height="${bottom-top}" fill="#a7cbd0"/>`;
            return `<g id="mg-village-context"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}" fill="url(#art3-grass)"/>${coast||fallback}${reserved}${roads}${buildings}${labels}</g>`;
        }
        // LAND-1 step 1: geometry preview only. Do not redirect purchases or saves.
        function externalFieldPreview(){
            if(!externalParcels||!W.usesFarmBoundary(game))return '';
            return externalParcels.PARCELS.map(p=>{
                const owned=externalParcels.ownsParcel(game.land,p.id);
                if(root.CaravanFieldArt)return root.CaravanFieldArt.render(p,{unit,owned});
                const x=p.x*unit,y=p.y*unit,w=p.w*unit,h=p.h*unit;
                return `<g pointer-events="none"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#b5ad7930" stroke="#6d7650" stroke-dasharray="8 5"/><text x="${x+10}" y="${y+20}" fill="#44553b" font-size="12">${esc(p.name)} · PREVIEW</text></g>`;
            }).join('');
        }
        function externalTerrainArtwork(){
            if(!game||!W.usesFarmBoundary(game))return '';
            const T=root.CaravanExternalTerrain,A=root.ManagementArt;
            if(!T||!externalParcels)return '';
            let art='';
            for(const p of externalParcels.PARCELS){
                for(let y=p.y;y<p.y+p.h;y++)for(let x=p.x;x<p.x+p.w;x++){
                    const t=T.getTile(game,x,y);
                    if(t?.nature==='tree')art+=A.tree((x+.5)*unit,(y+.75)*unit,8+(x+y)%3,(x+y)%4);
                    else if(t?.nature==='debris')art+=`<g stroke="#947f59" stroke-width="2.5" fill="none"><path d="M${x*unit+4} ${y*unit+13}l10 -6m-6 0l8 10"/></g>`;
                    if(t?.path)art+=`<rect x="${x*unit}" y="${y*unit}" width="${unit}" height="${unit}" fill="#d9d2b7"/>`;
                }
            }
            return `<g id="external-parcel-terrain" pointer-events="none">${art}</g>`;
        }
        function worldMarkup() {
            let ground='',nature='',grid='',utilities='';
            const artDefs='<defs><pattern id="art3-grass" patternUnits="userSpaceOnUse" width="20" height="20"><image href="assets/art-staging/terrain/individual/terrain/grass_0.png" width="20" height="20"/></pattern><pattern id="art3-tarmac" patternUnits="userSpaceOnUse" width="20" height="20"><image href="assets/art-staging/terrain/individual/terrain/tarmac_0.png" width="20" height="20"/></pattern><pattern id="art3-paving" patternUnits="userSpaceOnUse" width="20" height="20"><image href="assets/art-staging/terrain/individual/terrain/paving_0.png" width="20" height="20"/></pattern><pattern id="art3-gravel" patternUnits="userSpaceOnUse" width="20" height="20"><image href="assets/art-staging/terrain/individual/terrain/gravel_0.png" width="20" height="20"/></pattern><pattern id="art3-sand" patternUnits="userSpaceOnUse" width="20" height="20"><image href="assets/art-staging/terrain/individual/terrain/sand_0.png" width="20" height="20"/></pattern></defs>';
            for(let y=0;y<game.tiles.length;y++){
                const row=game.tiles[y];
                for(const surface of ['sand','water','road','path']){
                    for(let x=0;x<row.length;){const active=t=>surface==='sand'||surface==='water'?t?.terrain===surface:Boolean(t?.[surface]);if(!active(row[x])){x++;continue;}let end=x+1;while(end<row.length&&active(row[end]))end++;
                        ground+=`<rect x="${x*unit}" y="${y*unit}" width="${(end-x)*unit}" height="${unit}" fill="${surface==='sand'?'url(#art3-sand)':surface==='water'?'url(#water)':surface==='road'?'url(#art3-tarmac)':'url(#art3-paving)'}"/>`;x=end;
                    }
                }
                row.forEach((t,x)=>{const assets=root.CaravanNatureAssets;if(assets){ground+=assets.groundDetails(t,x,y,unit);nature+=t.nature==='tree'?`<image href="assets/art-staging/nature/trees/${['oak','birch','pine'][assets.hash(x,y)%3]}_overgrown.png" x="${x*unit-10}" y="${y*unit-28}" width="40" height="48" preserveAspectRatio="xMidYMax meet" pointer-events="none"/>`:assets.natureGraphic(t,x,y,unit);}else if(t.nature==='tree')nature+=A.tree(x*unit+10,y*unit+12,9+(x+y)%4,(x+y)%4);});
            }
            if(layers.utilities){
                for(const [i,type] of root.ParkServices.UTILITY_TYPES.entries()){
                    const connected=root.ParkServices.getConnectedUtilityTiles(game.tiles,type),color=['#ca8c56','#6a9ca9','#c8ad4e','#618e76'][i];
                    game.tiles.forEach((row,y)=>row.forEach((t,x)=>{if(t.utilities?.[type]){
                        let d=`M${x*unit+5+i*3} ${y*unit+5+i*3}h6`;
                        if(row[x+1]?.utilities?.[type])d+=`M${x*unit+10} ${y*unit+5+i*3}h20`;
                        if(game.tiles[y+1]?.[x]?.utilities?.[type])d+=`M${x*unit+5+i*3} ${y*unit+10}v20`;
                        utilities+=`<path d="${d}" stroke="${color}" stroke-width="2" fill="none" ${connected.has(`${x},${y}`)?'':'stroke-dasharray="3 3"'}/>`;
                    }}));
                }
            }
            if(layers.grid||tool!=='select'){for(let x=0;x<=60;x++)grid+=`M${x*unit} 0V800`;for(let y=0;y<=40;y++)grid+=`M0 ${y*unit}H1200`;}
            const lots=places.filter(p=>p.kind==='pitch').map(p=>`<g opacity="${!visibleIds||visibleIds.has(p.id)?1:.35}">${placeArt(p)}</g>`).join('');
            const buildings=places.filter(p=>p.kind!=='pitch'&&p.type!=='land_plot').sort((a,b)=>(a.y+a.h)-(b.y+b.h)).map(p=>`<g opacity="${!visibleIds||visibleIds.has(p.id)?1:.35}">${placeArt(p)}</g>`).join('');
            const jobs=game.constructions.map(j=>{const b=j.footprint;return b?`<rect x="${b.x*unit+1}" y="${b.y*unit+1}" width="${b.w*unit-2}" height="${b.h*unit-2}" fill="#d6ad5c55" stroke="#a88948" stroke-width="2" stroke-dasharray="6 4"/>`:'';}).join('');
            const people=layers.people?game.guests.flatMap(g=>(g.party?.members||[{}]).map((m,i)=>{const pos=g.position||{x:g.pitch.x+1,y:g.pitch.y+1},x=pos.x*unit+(i%3)*5,y=pos.y*unit+Math.floor(i/3)*5;return `<g><ellipse cx="${x+1}" cy="${y+8}" rx="3" ry="1.5" fill="#446a4c44"/><path d="M${x} ${y+2}v6" stroke="${/^#[0-9a-fA-F]{6}$/.test(m.appearance?.top||'')?m.appearance.top:'#7a91a0'}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="2.5" fill="#dcbb96"/></g>`;})).join(''):'';
            return `${artDefs}${villageData&&W.usesFarmBoundary(game)?villageFringe():'<rect x="-2400" y="-2400" width="4800" height="4800" fill="url(#art3-grass)"/>'}${ground}${farmBoundary()}${externalFieldPreview()}${externalTerrainArtwork()}${W.usesFarmBoundary(game)?'':places.filter(p=>p.type==='land_plot').map(placeArt).join('')}${nature}${lots}${buildings}${utilities}${jobs}${people}<path d="${grid}" fill="none" stroke="#637b4b" stroke-width=".6" opacity=".22"/><g id="mg-build-preview"></g>`;
        }
        function farmBoundary(){
            if(!W.usesFarmBoundary(game))return '';
            const {west,north,east,south}=W.farm;
            const x=west*unit, top=north*unit, bottom=south*unit;
            const from=W.gate.minY*unit, to=W.gate.maxY*unit;
            const hedge=`M${x} ${top}V${from}M${x} ${to}V${bottom}`;
            return `<g id="park-boundary" pointer-events="none">
                <path d="${hedge}" stroke="#56794d" stroke-width="11" stroke-linecap="round"/>
                <path d="${hedge}" stroke="#83a16b" stroke-width="6" stroke-dasharray="4 7"/>
                <path d="M${x-9} ${from}h18m-18 ${to-from}h18" stroke="#755c3e" stroke-width="4"/>
                <text x="${x+15}" y="${from-8}" font-size="12" font-weight="600" fill="#405d3c" paint-order="stroke" stroke="#e8edda" stroke-width="3">FARM GATE</text>
                <path d="M${x} ${top}H${east*unit}V${bottom}H${x}" fill="none" stroke="#829b6d" stroke-width="1.5" stroke-dasharray="4 7"/>
            </g>`;
        }
        function drawPins(){
            const focusedId=document.activeElement?.dataset.place;
            labels.innerHTML='<path class="route-outer" data-route/><path class="route-line" stroke-width="4" data-route/>'+places.filter(p=>!(W.usesFarmBoundary(game)&&p.type==='land_plot')).map(p=>{
                const match=!visibleIds||visibleIds.has(p.id),isSelected=p.id===selected;
                const short=p.kind==='pitch'?p.name.replace('Pitch ',''):p.symbol;
                return `<g data-place="${esc(p.id)}" class="map-pin${isSelected?' selected':''}${match?'':' dimmed'}" role="button" tabindex="${match?0:-1}" aria-label="${esc(p.name+', '+p.label+', '+p.status)}" aria-pressed="${isSelected}" ${match?'':'aria-hidden="true"'}><title>${esc(p.name)} · ${p.status}</title><circle class="pin-ring" r="21" fill="#fffbee80" stroke="#355c42" stroke-width="2"/><circle r="13" fill="#faf9eb" stroke="#8fa27e" filter="url(#pin-shadow)"/><text y="3" text-anchor="middle" font-size="8" font-family="Arial" fill="#476341" font-weight="600">${esc(short)}</text><circle cx="10" cy="-9" r="3.5" fill="${statusColor[p.status]}" stroke="#faf9eb" stroke-width="1.5"/><text class="map-label pin-name" text-anchor="middle" y="29">${esc(p.kind==='pitch'?'':p.name)}</text></g>`;
            }).join('')+'<text data-sea class="area-label" text-anchor="middle" style="fill:#638f93;letter-spacing:4px;font-size:18px">NORTH SEA</text>';
            if(focusedId)labels.querySelector(`[data-place="${CSS.escape(focusedId)}"]`)?.focus({preventScroll:true});
        }
        let playerFacing='down',lastPlayerPosition=null,lastSpriteFrame='',playerMotionSince=0;
        function drawSurfaceMarks(marks){
            let layer=world.querySelector('#gp-surface-marks');
            if(!layer){world.insertAdjacentHTML('beforeend','<g id="gp-surface-marks" pointer-events="none"></g>');layer=world.querySelector('#gp-surface-marks');}
            layer.innerHTML=marks.map(({x,y,surface,valid})=>`<rect x="${x*unit+2}" y="${y*unit+2}" width="${unit-4}" height="${unit-4}" rx="3" fill="${valid?'#ffffff22':'#d43b4166'}" stroke="${surface==='road'?'#fff':'#f5d76e'}" stroke-width="2" stroke-dasharray="4 3"/>`).join('');
            const player=world.querySelector('#living-park-player');if(player)world.append(player);
        }
        function updatePlayer(p){
            if(!p)return;
            // Use the same avatar renderer as the walking game, rather than a
            // second SVG sprite design that changes the player's appearance.
            let marker=world.querySelector('#living-park-player');
            if(!marker){world.insertAdjacentHTML('beforeend','<g id="living-park-player" pointer-events="none"></g>');marker=world.querySelector('#living-park-player');lastSpriteFrame='';}
            const avatar=root.CharacterSystem.normalizeAvatar(game.playerAvatar);
            const avatarKey=JSON.stringify(avatar);
            if(lastSpriteFrame!==avatarKey){
                const canvas=document.createElement('canvas');
                canvas.width=32;canvas.height=40;
                const ctx=canvas.getContext('2d');
                if(ctx){
                    root.CharacterSystem.drawCharacter(ctx,avatar,16,23,2);
                    const image=document.createElementNS('http://www.w3.org/2000/svg','image');
                    image.setAttribute('x','-16');image.setAttribute('y','-23');
                    image.setAttribute('width','32');image.setAttribute('height','40');
                    image.setAttribute('href',canvas.toDataURL('image/png'));
                    image.setAttribute('style','image-rendering:pixelated');
                    marker.replaceChildren(image);
                    lastSpriteFrame=avatarKey;
                }
            }
            marker.setAttribute('transform',`translate(${p.x*unit} ${p.y*unit})`);
            lastPlayerPosition={x:p.x,y:p.y};
        }
        function render(nextGame,nextPlaces,options={}){
            game=nextGame;places=nextPlaces;selected=options.selected;visibleIds=options.visibleIds||null;route=options.route||null;tool=options.tool||'select';layers={...layers,...options.layers};
            const key=JSON.stringify([game.tiles,places.map(p=>[p.id,p.status,p.guest?.accommodation,p.van?.modelId,p.entity.decking,p.entity.accessories]),game.constructions,game.externalTerrain,game.land?.ownedPlotIds,game.guests.map(g=>[g.position,g.party?.headcount]),[...visibleIds||[]],layers,tool]);
            if(key!==worldKey){scene.innerHTML=worldMarkup();worldKey=key;}
            drawSurfaceMarks(callbacks.getSurfaceMarks?.()||[]);
            updatePlayer(callbacks.getWalker?.() || game.player);
            // Keep focused map controls alive when only time / condition values change.
            const pinKey=JSON.stringify(places.map(p=>[p.id,p.status,p.id===selected,!visibleIds||visibleIds.has(p.id)]));
            if(labels.dataset.key!==pinKey){drawPins();labels.dataset.key=pinKey;}
            cameraChanged(!callbacks.isWalking?.());
        }
        function pointerGrid(event){const r=svg.getBoundingClientRect(),xy=M.unproject(event.clientX-r.left,event.clientY-r.top,camera,width,height);return {x:Math.floor(xy[0]/unit),y:Math.floor(xy[1]/unit)};}
        function preview(start,end){const p=M.buildPreview(tool,start,end,callbacks.facilityDefinitions);world.querySelector('#mg-build-preview').innerHTML=`<rect x="${p.x*unit}" y="${p.y*unit}" width="${p.w*unit}" height="${p.h*unit}" fill="#faf8d855" stroke="#496d44" stroke-width="2" stroke-dasharray="4 3"/>`;callbacks.onPreview?.(p);}
        svg.addEventListener('contextmenu',e=>e.preventDefault());
        svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoom(Math.exp(-Math.max(-150,Math.min(150,e.deltaY))*.002),e.clientX-r.left,e.clientY-r.top);},{passive:false});
        svg.addEventListener('pointerdown',e=>{
            touches.set(e.pointerId,[e.clientX,e.clientY]);svg.setPointerCapture(e.pointerId);moved=false;
            if(touches.size===2){const [a,b]=[...touches.values()];pinchDistance=Math.hypot(a[0]-b[0],a[1]-b[1]);pointer=null;return;}
            pointer={x:e.clientX,y:e.clientY,camera:{...camera},start:pointerGrid(e),place:e.target.closest('[data-place]')?.dataset.place,build:tool!=='select'&&e.button===0&&!e.shiftKey};
            if(pointer.build)preview(pointer.start,pointer.start);svg.classList.add('dragging');
        });
        svg.addEventListener('pointermove',e=>{
            if(!touches.has(e.pointerId))return;touches.set(e.pointerId,[e.clientX,e.clientY]);
            if(touches.size===2){const [a,b]=[...touches.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),r=svg.getBoundingClientRect();if(pinchDistance)zoom(d/pinchDistance,(a[0]+b[0])/2-r.left,(a[1]+b[1])/2-r.top);pinchDistance=d;moved=true;return;}
            if(!pointer)return;
            const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(dx,dy)>4)moved=true;
            if(pointer.build){preview(pointer.start,pointerGrid(e));return;}
            if(moved){const a=M.unproject(0,0,pointer.camera,width,height),b=M.unproject(dx,dy,pointer.camera,width,height);clampCamera(pointer.camera.x+a[0]-b[0],pointer.camera.y+a[1]-b[1]);cameraChanged();}
        });
        function end(e){
            if(pointer&&e.type==='pointerup'&&touches.size===1){if(pointer.build)callbacks.onBuild?.(tool,pointer.start,pointerGrid(e));else if(!moved){if(callbacks.onGround&&callbacks.isWalking?.())callbacks.onGround(pointerGrid(e));else callbacks.onSelect?.(pointer.place||null);}}
            touches.delete(e.pointerId);pointer=null;pinchDistance=null;world.querySelector('#mg-build-preview')?.replaceChildren();svg.classList.remove('dragging');
        }
        svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
        labels.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.dataset.place){e.preventDefault();e.stopPropagation();callbacks.onSelect(e.target.dataset.place);}});
        new ResizeObserver(()=>{dimensions();cameraChanged();}).observe(svg);
        dimensions();
        const api={render,updatePlayer,drawSurfaceMarks,fit,zoom,pan,focus,turn:delta=>{camera.rotation=(camera.rotation+delta+360)%360;cameraChanged();},north:()=>{camera.rotation=0;cameraChanged();},togglePlan:()=>{camera.tilt=camera.tilt===1?.8:1;dimensions();cameraChanged();return camera.tilt===1;},getCamera:()=>({...camera}),showRoute:r=>{route=r;cameraChanged();},canWalk:(state,x,y)=>W.canOccupy(state,x,y,villageData,placement,root.GameState.canOccupyPlayer),
            followPlayer:(p,dt)=>{const framing=root.CaravanWorldCamera,target=framing.target(p,{width,height});
                const distance=Math.hypot(camera.x-target.x,camera.y-target.y);
                const next=dt===undefined||distance<.1?target:framing.smooth(camera,target,dt);
                if(camera.x===next.x&&camera.y===next.y)return;
                Object.assign(camera,{x:next.x,y:next.y});cameraChanged(false);},invalidate:()=>{worldKey='';}};
        return api;
    }
    root.ManagementMap={create,placeArt};
})(window);
