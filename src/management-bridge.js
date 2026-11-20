/* Thin command bridge: presentation delegates to the existing game rules and ledger. */
(() => {
    'use strict';
    if (!MANAGEMENT_MODE) return;
    const SAVE_KEY='caravan_tycoon_save', BACKUP_KEY='caravan_tycoon_management_backup';
    const landTestEnabled=new URLSearchParams(location.search).get('landTest')==='1';
    const TEST_GRANT=12000;
    const applyLandTestCapital=()=>{if(!landTestEnabled||state.landTestGrantApplied)return false;
        if(!Economy.recordTransaction(state,TEST_GRANT,'development test','Temporary South Field testing capital'))return false;
        state.landTestGrantApplied=true;return true;};
    const changed=()=>{refreshPitchCapabilities();updateUI();};
    const getSave=()=>saveGame() ? localStorage.getItem(SAVE_KEY) : null;
    const backup=()=>{const current=localStorage.getItem(SAVE_KEY);if(current)localStorage.setItem(BACKUP_KEY,current);};
    const fail=message=>{showToast(message);return {ok:false,reason:message};};
    window.CaravanGame = {
        getState:()=>state,
        landTestEnabled:()=>landTestEnabled,
        southFieldQuote:()=>landTestEnabled?LandExpansion.southFieldQuote(state):{ok:false,reasons:['Development test is disabled.']},
        purchaseSouthFieldTest(){if(!landTestEnabled)return fail('Development test is disabled.');const result=LandExpansion.purchaseSouthFieldTest(state,recordTransaction);if(result.ok){saveGame();changed();showToast('South Field purchased for the development test.');}else showToast(result.reasons.join(' '));return result;},
        purchaseLand(id){const result=id==='beach'?LandExpansion.purchaseBeach(state,recordTransaction):LandExpansion.purchasePlot(state,id,recordTransaction);if(result.ok){saveGame();changed();showToast(id==='beach'?'Beach access construction started.':'Field purchased. Clear and connect it to develop more pitches.');}else showToast(result.reasons.join(' '));return result;},
        toggleBeach(){const result=LandExpansion.toggleBeach(state);if(result.ok){saveGame();changed();}else showToast(result.reasons.join(' '));return result;},
        getCapabilities:()=>PitchCapabilities.rebuild(state),
        getDemand:()=>getGuestDemand(),
        getBalance:()=>Economy.getSevenDayBalance(state),
        facilityDefinitions:FACILITY_BUILDINGS,
        getSave,
        getBackup:()=>localStorage.getItem(BACKUP_KEY),
        save:()=>saveGame(),
        pause:()=>togglePauseState(),
        speed:speed=>{if([1,2,4].includes(Number(speed)))setSimulationSpeed(speed);},
        dayLength:minutes=>setDayLengthMinutes(Number(minutes)),
        select(entity){state.selectedEntity=entity;updateUI();},
        build(tool,start,end) {
            const inBounds=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<GRID_W&&p.y>=0&&p.y<GRID_H;
            const allowed=['select','clear','road','path','pitch_grass','pitch_gravel','build_tree',...Object.keys(FACILITY_BUILDINGS).map(t=>'build_'+t),...UTILITY_TYPES.map(t=>'utility_'+t),...Object.keys(StaticCaravans.ACCESSORIES).map(t=>'place_accessory_'+t)];
            if(!allowed.includes(tool)||!inBounds(start)||!inBounds(end))return fail('Choose a valid tool and a tile inside the park.');
            const before=JSON.stringify([state.cash,state.wood,state.constructions.length,state.accessoryInventory,state.tiles[end.y][end.x].nature]);
            if(tool==='clear'){
                const tile=state.tiles[end.y][end.x];
                if(tile.nature==='tree'||tile.nature==='debris')interactWith({kind:tile.nature,x:end.x,y:end.y});
                else return fail('Select a tree or brush to clear.');
            }else{
                setTool(tool);
                if(state.activeTool!==tool)return {ok:false};
                // Fixed-size buildings / planting / accessories use a single location.
                if(tool.startsWith('build_')||tool.startsWith('place_accessory_'))handleGridClick(end.x,end.y);
                else handleBuildDrag(start,end);
            }
            changed();
            const after=JSON.stringify([state.cash,state.wood,state.constructions.length,state.accessoryInventory,state.tiles[end.y][end.x].nature]);
            return {ok:before!==after};
        },
        tool(tool){setTool(tool);updateUI();return state.activeTool;},
        action(action,entity){
            const liveVan=state.caravans.includes(entity), liveFacility=state.facilities.includes(entity);
            if(['repair','skirting','sell','rental'].includes(action)&&!liveVan)return fail('That caravan is no longer in the park.');
            if(['clean','repairFacility','toggleFacility'].includes(action)&&!liveFacility)return fail('That facility is no longer in the park.');
            state.selectedEntity=entity||null;
            const commands={repair:repairSelectedCaravan,skirting:fitSelectedSkirting,sell:sellSelectedCaravan,clean:cleanSelectedToiletBlock,repairFacility:repairSelectedToiletBlock,toggleFacility:toggleSelectedFacility,shovel:()=>buyTool('shovel'),timber:sellTimber,handyman:hireHandyman,grounds:hireGroundsStaff,rusty:openRustyResales,fiddl:openFiddlShop};
            if(action==='rental'){
                entity.isOperational=entity.isOperational===false;
                saveGame();
            }else if(commands[action])commands[action]();
            else return fail('That management action is unavailable.');
            changed();return {ok:true};
        },
        begin(mode){
            if(!['new','developed'].includes(mode))return fail('Choose a park scenario.');
            const previous=state;let previousText=null,previousBackup=null;
            try{
                previousText=localStorage.getItem(SAVE_KEY);previousBackup=localStorage.getItem(BACKUP_KEY);
                if(previousText){if(!saveGame())return {ok:false};previousText=localStorage.getItem(SAVE_KEY);backup();}
                state=GameStateApi.createGameState({transactions:[]});
                generateNewMap();
                if(mode==='new')applyLandTestCapital();
                if(mode==='developed')ManagementModel.applyDevelopedScenario(state,(pitch,model,options)=>new Caravan(pitch,model,options));
                state.selectedEntity=null;state.activeTool='select';state.isPaused=true;
                if(!saveGame())throw new Error('The new park could not be saved.');
                changed();showToast(mode==='developed'?'Developed park ready. Resume time to welcome guests.':'Your new park is ready. Start with a path, a pitch and toilets.');return {ok:true};
            }catch(error){
                state=previous;
                try{if(previousText!==null)localStorage.setItem(SAVE_KEY,previousText);else localStorage.removeItem(SAVE_KEY);if(previousBackup!==null)localStorage.setItem(BACKUP_KEY,previousBackup);else localStorage.removeItem(BACKUP_KEY);}catch{}
                changed();return fail('Your park was kept open: '+error.message);
            }
        },
        importSave(text){
            const oldState=state;let previous=null,previousBackup=null,wrote=false;
            try{
                if(typeof text!=='string'||text.length>5*1024*1024)throw new Error('Choose a game save under 5 MB.');
                const raw=JSON.parse(text);
                if(!raw||Array.isArray(raw)||Number(raw.schemaVersion)>SaveMigrations.CURRENT_SAVE_SCHEMA)throw new Error('This save uses an unsupported format or a newer game version.');
                const data=SaveMigrations.migrateSave(raw);
                for(const field of ['pitches','caravans','facilities','guests'])if(Array.isArray(raw[field])&&Array.isArray(data[field])&&raw[field].length!==data[field].length)throw new Error('The save contains invalid '+field+' records; loading it would discard progress.');
                if(!GameRulesApi.validateSaveData(data)||!data.pitches.every(p=>['x','y','w','h'].every(k=>Number.isInteger(p[k]))&&p.x>=0&&p.y>=0&&p.w>0&&p.h>0&&p.x+p.w<=GRID_W&&p.y+p.h<=GRID_H))throw new Error('The file is not a valid CaravanWeb game save.');
                if(!saveGame())return {ok:false};previous=localStorage.getItem(SAVE_KEY);previousBackup=localStorage.getItem(BACKUP_KEY);backup();
                localStorage.setItem(SAVE_KEY,JSON.stringify(data));wrote=true;
                state=GameStateApi.createGameState({transactions:[]});
                if(init()!==true)throw new Error('Saved pitch or caravan references could not be restored.');
                if(!saveGame())throw new Error('The imported game could not be saved.');
                changed();showToast('Game save loaded. Your previous park has a recovery backup.');return {ok:true};
            }catch(error){
                state=oldState;
                if(wrote&&previous!==null){try{localStorage.setItem(SAVE_KEY,previous);if(previousBackup!==null)localStorage.setItem(BACKUP_KEY,previousBackup);else localStorage.removeItem(BACKUP_KEY);}catch{}}
                changed();return fail('Save not loaded: '+error.message);
            }
        }
    };
})();
