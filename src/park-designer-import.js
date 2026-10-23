/* Import versioned Park Designer packages without replacing game-owned character art. */
(() => {
    'use strict';
    const DB_NAME = 'CaravanWebParkPackages';
    const STORE_NAME = 'packages';
    const GRID_W = 60, GRID_H = 40, TILE_SIZE = 16;
    const utilitySet = () => ({gas:false, water:false, electricity:false, waste:false});
    const openDb = () => new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME))
                request.result.createObjectStore(STORE_NAME, {keyPath:'id'});
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    const savePackage = async pkg => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear(); store.put(pkg);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    };
    const getPackage = async () => {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const req = tx.objectStore(STORE_NAME).getAll();
            req.onsuccess = () => { const list=req.result||[]; db.close(); resolve(list[0]||null); };
            req.onerror = () => { db.close(); reject(req.error); };
        });
    };
    const assetKind = asset => {
        const s = (String(asset?.category||'')+' '+String(asset?.name||'')).toLowerCase();
        if (s.includes('water')||s.includes('sea')) return 'water';
        if (s.includes('sand')||s.includes('beach')) return 'sand';
        if (s.includes('road')) return 'road';
        if (s.includes('path')) return 'path';
        if (s.includes('tree')||s.includes('nature')||s.includes('bush')) return 'tree';
        if (s.includes('grass')) return 'grass';
        return 'object';
    };
    const coordinateEntries = layer => {
        if (!layer || typeof layer !== 'object' || Array.isArray(layer)) return [];
        return Object.entries(layer).map(([key,assetId]) => {
            const match=/^(\\d+),(\\d+)$/.exec(key);
            if (!match) throw new Error('Invalid terrain coordinate: '+key);
            return {x:Number(match[1]),y:Number(match[2]),assetId};
        });
    };
    const loadImages = async catalog => {
        const entries=Object.entries(catalog);
        if(entries.length>500) throw new Error('Maximum 500 assets per park package.');
        const images={};
        await Promise.all(entries.map(([id,asset])=>new Promise((resolve,reject)=>{
            if(!asset || typeof asset.dataUrl!=='string' || !asset.dataUrl.startsWith('data:image/png;base64,')) {
                reject(new Error('Asset '+id+' has no embedded PNG image.')); return;
            }
            const img=new Image();
            img.onload=()=>{
                if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth>4096||img.naturalHeight>4096) {
                    reject(new Error('Asset '+id+' has unsupported dimensions.')); return;
                }
                images[id]=img; resolve();
            };
            img.onerror=()=>reject(new Error('Unable to decode asset '+id+'.'));
            img.src=asset.dataUrl;
        })));
        return images;
    };
    async function preparePackage(pkg) {
        if(!pkg || pkg.packageType!=='caravanweb-park' || pkg.packageVersion!==1 ||
            pkg.format!=='caravanweb' || !pkg.grid || pkg.grid.widthCells!==GRID_W ||
            pkg.grid.heightCells!==GRID_H || pkg.grid.cellSizePx!==TILE_SIZE ||
            !pkg.terrain || !pkg.assetCatalog || !Array.isArray(pkg.pitches) || !Array.isArray(pkg.objects))
            throw new Error('Unsupported package. Expected a 60 × 40 Park Designer package with 16px cells.');
        const images=await loadImages(pkg.assetCatalog);
        const blank=()=>Array.from({length:GRID_H},()=>Array(GRID_W).fill(null));
        const terrain=blank(), secondary=blank(), roads=blank(), paths=blank(), nature=blank(), objects=[];
        const tiles=Array.from({length:GRID_H},()=>Array.from({length:GRID_W},()=>({
            terrain:'grass',nature:null,road:false,path:false,utilities:utilitySet()
        })));
        for(const [layerId,grid] of [['layer_base_terrain',terrain],['layer_secondary_terrain',secondary],
            ['layer_paths_roads',null],['layer_nature',nature]]) {
            for(const cell of coordinateEntries(pkg.terrain[layerId])) {
                if(cell.x<0||cell.y<0||cell.x>=GRID_W||cell.y>=GRID_H||
                    typeof cell.assetId!=='string'||!pkg.assetCatalog[cell.assetId])
                    throw new Error('Terrain references an invalid cell or missing asset.');
                const kind=assetKind(pkg.assetCatalog[cell.assetId]);
                if(grid) grid[cell.y][cell.x]=cell.assetId;
                if(layerId==='layer_base_terrain') {
                    if(kind==='water') tiles[cell.y][cell.x].terrain='water';
                    else if(kind==='grass'||kind==='sand') tiles[cell.y][cell.x].terrain='grass';
                } else if(layerId==='layer_paths_roads') {
                    if(kind==='road') {tiles[cell.y][cell.x].road=true;roads[cell.y][cell.x]=cell.assetId;}
                    if(kind==='path') {tiles[cell.y][cell.x].path=true;paths[cell.y][cell.x]=cell.assetId;}
                } else if(kind==='tree') tiles[cell.y][cell.x].nature='tree';
                else objects.push({x:cell.x,y:cell.y,w:1,h:1,assetId:cell.assetId,blocksPlayer:false,
                    anchorPx:{x:0,y:TILE_SIZE},visualOffsetPx:{x:0,y:0}});
            }
        }
        const pitches=pkg.pitches.map(p=>{
            if(!p||!['x','y','widthCells','heightCells'].every(k=>Number.isInteger(p[k]))||
                p.x<0||p.y<0||p.widthCells<1||p.heightCells<1||
                p.x+p.widthCells>GRID_W||p.y+p.heightCells>GRID_H||
                !['tent','caravan','motorhome','serviced'].includes(p.type))
                throw new Error('A pitch has invalid dimensions, coordinates or type.');
            return {id:String(p.id||('designer-'+p.x+'-'+p.y)),x:p.x,y:p.y,w:p.widthCells,h:p.heightCells,
                type:p.type==='tent'?'grass':'gravel',occupied:false,
                designerHookups:{electricity:Boolean(p.electricHookup),water:Boolean(p.waterHookup)}};
        });
        const facilities=[];
        for(const obj of pkg.objects) {
            const asset=pkg.assetCatalog[obj.assetId];
            if(!asset||!Number.isFinite(obj.x)||!Number.isFinite(obj.y)) throw new Error('A placed object references a missing asset or invalid position.');
            const type=String(obj.gameplay?.objectType||'').toLowerCase().replace(/[\\s-]+/g,'_');
            const w=Math.max(1,Math.round(obj.footprintCells?.width||1)), h=Math.max(1,Math.round(obj.footprintCells?.height||1));
            if(['toilets','shop','playground','pub','restaurant','arcade','entertainment_space','pool','activity_centre','entertainment_hub'].includes(type)&&
                Number.isInteger(obj.x)&&Number.isInteger(obj.y)&&obj.x>=0&&obj.y>=0&&obj.x+w<=GRID_W&&obj.y+h<=GRID_H) {
                facilities.push({x:obj.x,y:obj.y,w,h,type,assetId:obj.assetId,designerObjectId:obj.id});
            } else if(assetKind(asset)==='tree'&&Number.isInteger(obj.x)&&Number.isInteger(obj.y)&&obj.x>=0&&obj.y>=0&&obj.x<GRID_W&&obj.y<GRID_H) {
                tiles[obj.y][obj.x].nature='tree'; nature[obj.y][obj.x]=obj.assetId;
            } else objects.push({x:obj.x,y:obj.y,w,h,assetId:obj.assetId,
                blocksPlayer:Boolean(obj.collision?.blocksPlayer),anchorPx:obj.anchorPx||{x:0,y:0},
                visualOffsetPx:obj.visualOffsetPx||{x:0,y:0}});
        }
        return {pkg,images,terrain,secondary,roads,paths,nature,objects,pitches,facilities,tiles};
    }
    async function importPackage(pkg) {
        const prepared=await preparePackage(pkg);
        if(!window.CaravanWebParkAdapter) throw new Error('Game integration is not ready yet.');
        window.CaravanWebParkAdapter.applyPackage(prepared.pkg,prepared.images,prepared.terrain,
            prepared.secondary,prepared.roads,prepared.paths,prepared.nature,prepared.objects,
            prepared.pitches,prepared.facilities,prepared.tiles);
        await savePackage(pkg);
    }
    async function restorePackage() {
        try { const pkg=await getPackage(); if(pkg) await importPackage(pkg); }
        catch(error) { console.error('Saved Park Designer package could not be restored.',error); }
    }
    const button=document.getElementById('import-park-button');
    const input=document.getElementById('import-park-file');
    button?.addEventListener('click',()=>input?.click());
    input?.addEventListener('change',async()=>{
        const file=input.files?.[0]; if(!file) return;
        try {
            if(file.size>25*1024*1024) throw new Error('The park JSON exceeds the 25 MB import limit.');
            await importPackage(JSON.parse(await file.text()));
        } catch(error) {
            console.error('Park Designer import failed.',error);
            if(typeof window.showToast==='function') window.showToast('❌ '+error.message);
            else alert('Park import failed: '+error.message);
        } finally { input.value=''; }
    });
    // Wait for the game adapter before restoring a saved package.
    window.addEventListener('load',()=>setTimeout(restorePackage,0),{once:true});
})();
