/* Procedural SVG artwork shared in spirit with the accepted map prototype. */
(function(root){
'use strict';
function tree(x,y,r=12,shade=0){const cs=['#68875b','#738f61','#809968','#5c7d55'];return `<g transform="translate(${x} ${y})" filter="url(#tree-shadow)"><ellipse cy="7" rx="${r*.88}" ry="${r*.55}" fill="#617f5033"/><path d="M0 8V-7" stroke="#707553" stroke-width="3"/><circle cx="-5" cy="-7" r="${r*.7}" fill="${cs[(shade+1)%4]}"/><circle cx="6" cy="-8" r="${r*.72}" fill="${cs[shade%4]}"/><circle cy="-15" r="${r*.78}" fill="${cs[(shade+2)%4]}"/></g>`;}
function building(p,hero=false){
 const x=p.x-p.w/2,y=p.y-p.h/2,w=p.w,h=p.h;
 const fill=p.type==='static'?({Basic:'#d5cfb8',Silver:'#d8ddd0',Gold:'#d7c9aa',Bronze:'#bdc7ad',Platinum:'#e6e2d4'}[p.tier]):p.type==='touring'?'#ecebd9':'#9a9a7a';
 if(p.id==='firewood_stall')return `<g><rect x="${p.x-7}" y="${p.y-5}" width="14" height="13" rx="1" fill="#765232"/><path d="M${p.x-9} ${p.y-4}l3-6h12l3 6Z" fill="#d7b478" stroke="#765232"/><text x="${p.x}" y="${p.y+5}" text-anchor="middle" font-size="9" fill="#fff4dc">£</text></g>`;
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
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const statusColor={available:'#5a876a',occupied:'#aaa088',reserved:'#c39757',closed:'#be7653',open:'#74948c',unavailable:'#b5a274',owned:'#63876b',for_sale:'#b59658',locked:'#a69b7c',building:'#c39757'};
    function placeArt(p) {
        const x=(p.x+p.w/2)*unit,y=(p.y+p.h/2)*unit;
        if(p.type==='land_plot')return `<rect x="${p.x*unit+2}" y="${p.y*unit+2}" width="${p.w*unit-4}" height="${p.h*unit-4}" rx="3" fill="${p.status==='owned'?'#93ac7c10':'#ddc98e28'}" stroke="${p.status==='owned'?'#829c74':'#a18e59'}" stroke-width="2" stroke-dasharray="${p.status==='owned'?'3 8':'9 5'}"/><text x="${p.x*unit+9}" y="${p.y*unit+16}" fill="#6b714e" font-size="10" font-family="Arial">${esc(p.name.toUpperCase())} · ${p.status==='owned'?'OWNED':esc(p.label.split(' · ')[0])}</text>`;
        if(p.type==='beach_gate')return `<path d="M920 480H1000V520H920" fill="#d3c9a4" stroke="#a4946c" stroke-dasharray="4 4"/><path d="M925 480V520m10-40v40m-10-30h10m-10 20h10" stroke="${p.status==='open'?'#65866a':'#a18b61'}" stroke-width="3"/>`;
        if(p.type==='for_sale')return `<rect x="${p.x*unit}" y="${p.y*unit}" width="${p.w*unit}" height="${p.h*unit}" fill="#d1c89d30" stroke="#8c9870" stroke-width="2" stroke-dasharray="5 5"/><rect x="${x-34}" y="${y-22}" width="68" height="32" rx="2" fill="#e9e1c3" stroke="#9c946e"/><path d="M${x-24} ${y+10}v25m48-25v25" stroke="#9c946e" stroke-width="3"/>`;
        const obj={id:p.type,x,y,w:Math.min(100,p.w*unit-10),h:Math.min(50,p.h*unit-16),type:p.kind==='pitch'?(p.van?'static':p.guest?.accommodation==='tent'?'tent':'touring'):'facility',tier:p.van?root.StaticCaravans.getModel(p.van.modelId)?.tierName:'Silver'};
        if(p.kind==='pitch'){
            const lot=`<rect x="${p.x*unit+3}" y="${p.y*unit+3}" width="${p.w*unit-6}" height="${p.h*unit-6}" rx="4" fill="${p.entity.type==='gravel'?'#c3c9ae':'#a8bc8e'}" stroke="#8fa57b" stroke-width="1.1"/><path d="M${p.x*unit+8} ${(p.y+p.h)*unit-10}h17" stroke="#849a6e" stroke-width="3"/>`;
            let unitArt='';if(p.van||p.guest)unitArt=A.building(obj);
            const decking=p.entity.decking?`<rect x="${x-32}" y="${y+38}" width="64" height="25" fill="#ae9b78" stroke="#9c8a67"/><path d="M${x-28} ${y+44}h56m-56 6h56m-56 6h56" stroke="#c0af8e"/>`:'';
            const accessories=(p.entity.accessories||[]).map(item=>`<rect x="${item.x*unit+4}" y="${item.y*unit+4}" width="${item.w*unit-8}" height="${item.h*unit-8}" rx="4" fill="${item.type==='hot_tub'?'#739a97':'#ba9b70'}" stroke="#798d6b"/>`).join('');
            return lot+decking+unitArt+accessories;
        }
        return A.building(obj);
    }
    function create(svg,callbacks) {
        const world=svg.querySelector('#mg-world'),labels=svg.querySelector('#mg-map-labels');
        const scene=document.createElementNS('http://www.w3.org/2000/svg','g');
        world.append(scene);
        let width=1,height=1,baseZoom=.8,game=null,places=[],selected=null,visibleIds=null,route=null,tool='select',layers={labels:true,people:true,utilities:false,grid:false},worldKey='',pointer=null,moved=false,pinchDistance=null;
        const camera={x:570,y:400,zoom:.8,rotation:0,tilt:.8},touches=new Map();
        try{const saved=JSON.parse(localStorage.getItem('caravanweb_management_camera_v1'));if(saved&&['x','y','zoom','rotation','tilt'].every(k=>Number.isFinite(saved[k]))){camera.x=Math.max(-650,Math.min(1500,saved.x));camera.y=Math.max(-300,Math.min(1100,saved.y));camera.zoom=Math.max(.3,Math.min(4,saved.zoom));camera.rotation=saved.rotation%360;camera.tilt=saved.tilt===1?1:.8;}}catch{}
        function persist(){try{localStorage.setItem('caravanweb_management_camera_v1',JSON.stringify(camera));}catch{}}
        function dimensions(){const rect=svg.getBoundingClientRect();width=rect.width;height=rect.height;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);baseZoom=Math.max(.3,Math.min((width-50)/1200,(height-140)/(800*camera.tilt)));}
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
        function zoom(factor,x=width/2,y=height/2){const before=M.unproject(x,y,camera,width,height);camera.zoom=Math.max(.3,Math.min(4,camera.zoom*factor));const after=M.unproject(x,y,camera,width,height);camera.x+=before[0]-after[0];camera.y+=before[1]-after[1];cameraChanged();}
        function fit(){dimensions();Object.assign(camera,{x:570,y:400,rotation:0,zoom:baseZoom});cameraChanged();}
        function pan(dx,dy){const xy=M.unproject(width/2+dx,height/2+dy,camera,width,height);camera.x=Math.max(-650,Math.min(1500,xy[0]));camera.y=Math.max(-300,Math.min(1100,xy[1]));cameraChanged();}
        function focus(p){if(!p)return;camera.zoom=Math.max(camera.zoom,width<650?.68:1);camera.x=(p.x+p.w/2)*unit+(width<650?0:140);camera.y=(p.y+p.h/2)*unit+(width<650?160:20);cameraChanged();}
        // Draw the actual village's roads and buildings in the park's coordinate system.
        // The village's park footprint is mapped onto the existing 60x40 playable grid.
        let villageData=null, placement=null;
        fetch('data/village-world.json').then(r=>{if(!r.ok)throw Error('Village data unavailable');return r.json();}).then(data=>{
            villageData=data;placement=W.placeVillage(data);worldKey='';if(game)render(game,places,{selected,visibleIds,route,tool,layers});
        }).catch(err=>console.warn('Village scenery could not load:',err));
        function villageFringe(){
            if(!villageData||!W.usesFarmBoundary(game))return '';
            const v=villageData;
            const x=n=>placement.toScene([n,0])[0]*unit;
            const y=n=>placement.toScene([0,n])[1]*unit;
            const size=n=>placement.toSceneLength(n)*unit;
            const roads=v.roads.map(r=>{
                const a=v.nodes[r.a],b=v.nodes[r.b];if(!a||!b)return '';
                return `<path d="M${x(a[0])} ${y(a[1])}L${x(b[0])} ${y(b[1])}" fill="none" stroke="${r.id==='park-lane'?'#c7c8b3':'#d0d0b9'}" stroke-width="${r.id==='park-lane'? (W.gate.maxY-W.gate.minY)*unit : size(r.width)}"/>`;
            }).join('');
            const buildings=v.buildings.map(b=>{
                const bx=x(b.x),by=y(b.y),w=size(b.w),h=size(b.h);
                return `<g><rect x="${bx-5}" y="${by-5}" width="${w+10}" height="${h+10}" fill="#a8bf96" stroke="#8ca77e"/><rect x="${bx}" y="${by}" width="${w}" height="${h}" fill="${b.roof||'#b29a7c'}" stroke="#75846e"/>${b.kind==='shop'?`<path d="M${bx} ${by+h*.72}h${w}" stroke="#e3d8b9" stroke-width="6"/>`:''}</g>`;
            }).join('');
            const labels=v.places.filter(q=>q.id!=='park').map(q=>`<text x="${x(q.x)}" y="${y(q.y)+30}" text-anchor="middle" font-size="12" fill="#4f674d" paint-order="stroke" stroke="#dce6cf" stroke-width="3">${String(q.name).replace(/[&<>]/g,'')}</text>`).join('');
            const coast=x(1200);
            return `<g id="mg-village-context"><rect x="-2400" y="-2400" width="4800" height="4800" fill="#b6c89e"/><rect x="${coast}" y="-2400" width="2400" height="4800" fill="#e4d5ac"/><rect x="${x(1300)}" y="-2400" width="2300" height="4800" fill="#a7cbd0"/>${roads}${buildings}${labels}<text x="${x(790)}" y="${y(700)}" font-size="20" fill="#5b7650">LITTLEHAMPTON-ON-SEA</text></g>`;
        }
        function worldMarkup() {
            let ground='',nature='',grid='',utilities='';
            for(let y=0;y<game.tiles.length;y++){
                const row=game.tiles[y];
                for(const surface of ['sand','water','road','path']){
                    for(let x=0;x<row.length;){const active=t=>surface==='sand'||surface==='water'?t?.terrain===surface:Boolean(t?.[surface]);if(!active(row[x])){x++;continue;}let end=x+1;while(end<row.length&&active(row[end]))end++;
                        ground+=`<rect x="${x*unit}" y="${y*unit}" width="${(end-x)*unit}" height="${unit}" fill="${surface==='sand'?'url(#sand)':surface==='water'?'url(#water)':surface==='road'?'#c7c8b3':'#d9d2b7'}"/>`;x=end;
                    }
                }
                row.forEach((t,x)=>{const assets=root.CaravanNatureAssets;if(assets){ground+=assets.groundDetails(t,x,y,unit);nature+=assets.natureGraphic(t,x,y,unit);}else if(t.nature==='tree')nature+=A.tree(x*unit+10,y*unit+12,9+(x+y)%4,(x+y)%4);});
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
            return `<rect x="-500" y="-500" width="2400" height="1800" fill="url(#water)"/><rect x="-800" y="-800" width="1740" height="2400" fill="url(#grass)"/><rect x="940" y="-800" width="60" height="2400" fill="url(#sand)"/>${villageFringe()}${ground}${farmBoundary()}${places.filter(p=>p.type==='land_plot').map(placeArt).join('')}${nature}${lots}${buildings}${utilities}${jobs}${people}<path d="${grid}" fill="none" stroke="#637b4b" stroke-width=".6" opacity=".22"/><g id="mg-build-preview"></g>`;
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
            labels.innerHTML='<path class="route-outer" data-route/><path class="route-line" stroke-width="4" data-route/>'+places.map(p=>{
                const match=!visibleIds||visibleIds.has(p.id),isSelected=p.id===selected;
                const short=p.kind==='pitch'?p.name.replace('Pitch ',''):p.symbol;
                return `<g data-place="${esc(p.id)}" class="map-pin${isSelected?' selected':''}${match?'':' dimmed'}" role="button" tabindex="${match?0:-1}" aria-label="${esc(p.name+', '+p.label+', '+p.status)}" aria-pressed="${isSelected}" ${match?'':'aria-hidden="true"'}><title>${esc(p.name)} · ${p.status}</title><circle class="pin-ring" r="21" fill="#fffbee80" stroke="#355c42" stroke-width="2"/><circle r="13" fill="#faf9eb" stroke="#8fa27e" filter="url(#pin-shadow)"/><text y="3" text-anchor="middle" font-size="8" font-family="Arial" fill="#476341" font-weight="600">${esc(short)}</text><circle cx="10" cy="-9" r="3.5" fill="${statusColor[p.status]}" stroke="#faf9eb" stroke-width="1.5"/><text class="map-label pin-name" text-anchor="middle" y="29">${esc(p.kind==='pitch'?'':p.name)}</text></g>`;
            }).join('')+'<text data-sea class="area-label" text-anchor="middle" style="fill:#638f93;letter-spacing:4px;font-size:18px">NORTH SEA</text>';
            if(focusedId)labels.querySelector(`[data-place="${CSS.escape(focusedId)}"]`)?.focus({preventScroll:true});
        }
        let playerFacing='down',lastPlayerPosition=null,lastSpriteFrame='',playerMotionSince=0;
        function updatePlayer(p){
            if(!p)return;
            const sprites=root.CaravanPlayerSprites;
            let marker=world.querySelector('#living-park-player');
            if(!marker){world.insertAdjacentHTML('beforeend','<g id="living-park-player" pointer-events="none"></g>');marker=world.querySelector('#living-park-player');lastSpriteFrame='';}
            const dx=lastPlayerPosition?p.x-lastPlayerPosition.x:0,dy=lastPlayerPosition?p.y-lastPlayerPosition.y:0;
            const moving=Math.hypot(dx,dy)>.0001;
            if(moving){playerFacing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');playerMotionSince=Date.now();}
            const walking=Date.now()-playerMotionSince<120;
            const frame=walking?Math.floor(Date.now()/130)%4:0;
            const avatar=root.CharacterSystem.normalizeAvatar(game.playerAvatar);
            const frameKey=JSON.stringify([walking,playerFacing,frame,avatar]);
            const palette={skin:avatar.skin,hair:avatar.hairColour,top:avatar.top,trousers:avatar.bottom};
            const style={hairStyle:avatar.hairStyle,accessory:avatar.accessory};
            if(sprites&&lastSpriteFrame!==frameKey){
                marker.innerHTML=`<g transform="translate(-12 -22.5) scale(.75)" shape-rendering="crispEdges">${sprites.frameSvg(playerFacing,frame,walking?'walk':'idle',palette,style)}</g>`;
                lastSpriteFrame=frameKey;
            }
            marker.setAttribute('transform',`translate(${p.x*unit} ${p.y*unit})`);
            lastPlayerPosition={x:p.x,y:p.y};
        }
        function render(nextGame,nextPlaces,options={}){
            game=nextGame;places=nextPlaces;selected=options.selected;visibleIds=options.visibleIds||null;route=options.route||null;tool=options.tool||'select';layers={...layers,...options.layers};
            const key=JSON.stringify([game.tiles,places.map(p=>[p.id,p.status,p.guest?.accommodation,p.van?.modelId,p.entity.decking,p.entity.accessories]),game.constructions,game.guests.map(g=>[g.position,g.party?.headcount]),[...visibleIds||[]],layers,tool]);
            if(key!==worldKey){scene.innerHTML=worldMarkup();worldKey=key;}
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
            if(moved){const a=M.unproject(0,0,pointer.camera,width,height),b=M.unproject(dx,dy,pointer.camera,width,height);camera.x=Math.max(-650,Math.min(1500,pointer.camera.x+a[0]-b[0]));camera.y=Math.max(-300,Math.min(1100,pointer.camera.y+a[1]-b[1]));cameraChanged();}
        });
        function end(e){
            if(pointer&&e.type==='pointerup'&&touches.size===1){if(pointer.build)callbacks.onBuild?.(tool,pointer.start,pointerGrid(e));else if(!moved){if(callbacks.onGround&&callbacks.isWalking?.())callbacks.onGround(pointerGrid(e));else callbacks.onSelect?.(pointer.place||null);}}
            touches.delete(e.pointerId);pointer=null;pinchDistance=null;world.querySelector('#mg-build-preview')?.replaceChildren();svg.classList.remove('dragging');
        }
        svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);svg.addEventListener('lostpointercapture',end);
        labels.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.dataset.place){e.preventDefault();e.stopPropagation();callbacks.onSelect(e.target.dataset.place);}});
        new ResizeObserver(()=>{dimensions();cameraChanged();}).observe(svg);
        dimensions();
        const api={render,updatePlayer,fit,zoom,pan,focus,turn:delta=>{camera.rotation=(camera.rotation+delta+360)%360;cameraChanged();},north:()=>{camera.rotation=0;cameraChanged();},togglePlan:()=>{camera.tilt=camera.tilt===1?.8:1;dimensions();cameraChanged();return camera.tilt===1;},getCamera:()=>({...camera}),showRoute:r=>{route=r;cameraChanged();},canWalk:(state,x,y)=>W.canOccupy(state,x,y,villageData,placement,root.GameState.canOccupyPlayer),
            followPlayer:(p,dt)=>{const framing=root.CaravanWorldCamera,target=framing.target(p,{width,height});
                const distance=Math.hypot(camera.x-target.x,camera.y-target.y);
                const next=dt===undefined||distance<.1?target:framing.smooth(camera,target,dt);
                if(camera.x===next.x&&camera.y===next.y&&camera.zoom===target.zoom)return;
                Object.assign(camera,{x:next.x,y:next.y,zoom:target.zoom});cameraChanged(false);},invalidate:()=>{worldKey='';}};
        return api;
    }
    root.ManagementMap={create,placeArt};
})(window);
