/** AUDIO ENGINE **/
let AudioCtx = null;
function playSound(freq, type, duration) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return;
    AudioCtx ||= new AudioContextConstructor();
    if (AudioCtx.state === 'suspended') AudioCtx.resume().catch(() => {});
    const osc = AudioCtx.createOscillator();
    const gain = AudioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, AudioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, AudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, AudioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(AudioCtx.destination);
    osc.start();
    osc.stop(AudioCtx.currentTime + duration);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function isFootprintUnderConstruction(footprint) {
    return state.constructions.some(job => job.footprint &&
        footprint.x < job.footprint.x + job.footprint.w &&
        footprint.x + footprint.w > job.footprint.x &&
        footprint.y < job.footprint.y + job.footprint.h &&
        footprint.y + footprint.h > job.footprint.y);
}

function ensurePitchId(pitch) {
    if (!pitch.id) pitch.id = `pitch-${pitch.x}-${pitch.y}-${pitch.w}-${pitch.h}`;
    return pitch.id;
}

function completeConstruction(job) {
    if (job.kind === 'surface') {
        job.tiles.forEach(({x, y}) => { state.tiles[y][x][job.surface] = true; });
    } else if (job.kind === 'utility') {
        job.tiles.forEach(({x, y}) => { state.tiles[y][x].utilities[job.utility] = true; });
    } else if (job.kind === 'pitch') {
        ensurePitchId(job.pitch);
        state.pitches.push(job.pitch);
    } else if (job.kind === 'pitches') {
        job.pitches.forEach(ensurePitchId);
        state.pitches.push(...job.pitches);
    } else if (job.kind === 'facility') {
        state.facilities.push({...FacilityOperations.getFacilityDefaults(job.type), ...job.facility});
    } else if (job.kind === 'tree') {
        state.tiles[job.y][job.x].nature = 'tree';
    } else if (job.kind === 'caravan') {
        const pitch = state.pitches[job.pitchIndex];
        if (!pitch || !pitch.constructionReserved) {
            console.error('Unable to complete caravan construction: its pitch is unavailable.', job);
            return false;
        }
        const caravan = new Caravan(pitch, job.tier, {
            id: StaticCaravans.createInstanceId(state, 'static'),
            pitchId: pitch.id
        });
        delete pitch.constructionReserved;
        pitch.occupied = false;
        pitch.staticCaravanId = caravan.id;
        state.caravans.push(caravan);
    } else {
        console.error('Unknown construction type.', job);
        return false;
    }
    playSound(523, 'sine', 0.1);
    return true;
}

function updateConstructions() {
    const completed = Construction.completeDueConstructions(state, completeConstruction);
    if (!completed) return;
    refreshPitchCapabilities();
    saveGame();
    showToast(`${completed} construction${completed === 1 ? '' : 's'} completed.`);
}

function updateStaticDeliveries() {
    const pendingBefore = state.staticDeliveries.length;
    const completed = StaticCaravans.completeDueDeliveries(
        state,
        (amount, category, description) => recordTransaction(amount, category, description),
        (pitch, installedVan) => {
            const index = state.caravans.indexOf(installedVan);
            if (index >= 0) {
                state.caravans[index] = Object.assign(
                    new Caravan(pitch, installedVan.modelId, installedVan),
                    installedVan,
                    {pitch}
                );
            }
            showToast('🚚 Static caravan delivered and installed.');
        },
        (order, reason) => {
            console.warn('Static delivery was cancelled after validation failed.', order, reason);
            showToast(`❌ ${reason}`);
        }
    );
    if (completed || state.staticDeliveries.length !== pendingBefore) {
        refreshPitchCapabilities();
        saveGame();
        updateUI();
    }
}

const TILE_SIZE = 16;
const GRID_W = 60;
const GRID_H = 40;
const SimulationClock = window.SimulationClock;
const GameStateApi = window.GameState;
const SaveMigrations = window.SaveMigrations;
const SimulationApi = window.Simulation;
const Economy = window.Economy;
const GuestParties = window.GuestParties;
const FacilityOperations = window.FacilityOperations;
const PitchCapabilities = window.PitchCapabilities;
const GuestActivities = window.GuestActivities;
const GameRulesApi = window.GameRules;
const LandManagement = window.LandManagement;
const Construction = window.Construction;
const CharacterSystem = window.CharacterSystem;
const StaticCaravans = window.StaticCaravans;

const PALETTE = {
    grass: ['#556b2f', '#5c7433', '#4d612a'],
    road: '#34495e',
    path: '#9b8b72',
    water: '#2980b9',
    fac_wall: '#bdc3c7',
    fac_roof: '#c0392b',
    tree: '#1e8449'
};
const STARTING_LANDMARKS = [
    {type: 'farmhouse', name: 'Run-down farmhouse', x: 13, y: 17, w: 6, h: 5, blocksBuilding: true, blocksMovement: true, interactable: true},
    {type: 'rusty_resales', name: 'Rusty Resales', subtitle: 'Caravan Emporium', x: 2, y: 7, w: 5, h: 3, blocksBuilding: true, blocksMovement: true, interactable: true},
    {type: 'fiddl_shop', name: 'Fiddl', subtitle: 'Convenience shop', x: 2, y: 14, w: 5, h: 3, blocksBuilding: true, blocksMovement: true, interactable: true},
    {type: 'job_centre', name: 'Job Centre', subtitle: 'Park staff', x: 2, y: 21, w: 5, h: 3, blocksBuilding: true, blocksMovement: true, interactable: true},
    {type: 'for_sale', name: 'Land for sale', x: 29, y: 12, w: 17, h: 16, blocksBuilding: true, blocksMovement: false, interactable: false}
];

let state = GameStateApi ? GameStateApi.createGameState() : {
    cash: 1500,
    initialBalance: 1500,
    wood: 0,
    beauty: 50,
    tools: {axe: true, shovel: false},
    transactions: [],
    rating: 1.0,
    satisfaction: 60,
    day: 1, hour: 9, minute: 0,
    dayLengthMinutes: 10,
    simulationSpeed: 1,
    isPaused: false,
    weather: 'Sunny',
    tiles: [],
    pitches: [],
    caravans: [],
    staticDeliveries: [],
    accessoryInventory: {bbq: 0, patio: 0, firepit: 0, hot_tub: 0},
    staticAssetSequence: 0,
    guests: [],
    guestArrivalProgress: 0,
    dailyGuestArrivals: 0,
    facilities: [],
    landmarks: [],
    constructions: [],
    vehicles: [],
    handymen: 0,
    groundsStaff: 0,
    handymanContractHoursRemaining: 0,
    maintenanceTask: null,
    camera: { x: 100, y: 100, zoom: 3 },
    activeTool: 'select',
    overlayMode: 'none',
    selectedEntity: null,
    player: {x: 5.5, y: 10.5},
    playerPath: [],
    interactionTarget: null
};
const pitchCapabilityIndex = PitchCapabilities.createIndex();
function refreshPitchCapabilities() {
    PitchCapabilities.rebuild(state, pitchCapabilityIndex);
}

const UTILITY_TYPES = ['gas', 'water', 'electricity', 'waste'];
const UTILITY_COSTS = {gas: 25, water: 20, electricity: 30, waste: 35};
const FACILITY_BUILDINGS = {
    toilets: {w: 3, h: 3, cost: 800},
    showers: {w: 3, h: 3, cost: 1200},
    laundry: {w: 3, h: 3, cost: 1800},
    shop: {w: 4, h: 3, cost: 1500},
    playground: {w: 3, h: 3, cost: 2200},
    pub: {w: 3, h: 3, cost: 3000},
    restaurant: {w: 4, h: 3, cost: 4500},
    arcade: {w: 3, h: 3, cost: 6000},
    entertainment_space: {w: 5, h: 4, cost: 8000},
    pool: {w: 5, h: 4, cost: 12000},
    activity_centre: {w: 4, h: 4, cost: 15000},
    entertainment_hub: {w: 6, h: 5, cost: 25000}
};
const pressedKeys = new Set();
const PLAYER_SPEED = 4;

// --- Initialization ---
function init() {
    const saved = localStorage.getItem('caravan_tycoon_save');
    if (!saved) {
        generateNewMap();
        return;
    }

    let data;
    try {
        data = JSON.parse(saved);
    } catch (error) {
        console.error('Unable to parse the saved game.', error);
        showToast('❌ Save data is invalid. A new park has been started.');
        generateNewMap();
        return;
    }

    data = SaveMigrations && typeof SaveMigrations.migrateSave === 'function'
        ? SaveMigrations.migrateSave(data)
        : data;

    if (!data || !Array.isArray(data.tiles) || data.tiles.length !== GRID_H ||
        !data.tiles.every(row => Array.isArray(row) && row.length === GRID_W &&
            row.every(isValidTileData)) ||
        !Array.isArray(data.pitches) ||
        !data.pitches.every(pitch => pitch && ['x', 'y', 'w', 'h'].every(key => Number.isFinite(pitch[key]))) ||
        !Array.isArray(data.caravans) ||
        !data.caravans.every(caravan => caravan && typeof caravan === 'object' &&
            (caravan.tier === 1 || caravan.tier === 2 ||
                ['basic', 'bronze', 'silver', 'gold', 'platinum'].includes(caravan.tier) ||
                typeof caravan.modelId === 'string')) ||
        (data.facilities !== undefined && (!Array.isArray(data.facilities) ||
            !data.facilities.every(facility => facility &&
                ['x', 'y', 'w', 'h'].every(key => Number.isFinite(facility[key]))))) ||
        (data.landmarks !== undefined && !Array.isArray(data.landmarks)) ||
        (data.constructions !== undefined && !Array.isArray(data.constructions))) {
        console.error('Saved game data is missing required map or entity data.');
        showToast('❌ Save data is invalid. A new park has been started.');
        generateNewMap();
        return;
    }
    const caravansHavePitches = data.caravans.every(caravan => {
        const index = Number.isInteger(caravan.pitchIndex)
            ? caravan.pitchIndex
            : data.pitches.findIndex(pitch => caravan.pitch && pitch.x === caravan.pitch.x &&
                pitch.y === caravan.pitch?.y && pitch.w === caravan.pitch?.w &&
                pitch.h === caravan.pitch?.h);
        return Boolean(data.pitches[index]);
    });
    if (!caravansHavePitches) {
        console.error('Saved caravan refers to a missing pitch.');
        showToast('❌ Save data is invalid. A new park has been started.');
        generateNewMap();
        return;
    }

    state.cash = Number.isFinite(data.cash) ? data.cash : state.cash;
    state.wood = Number.isFinite(data.wood) ? Math.max(0, Math.floor(data.wood)) : 0;
    state.tools = {axe: true, shovel: Boolean(data.tools?.shovel)};
    state.initialBalance = Number.isFinite(data.initialBalance) ? data.initialBalance : state.cash;
    state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
    state.guestArrivalProgress = Number.isFinite(data.guestArrivalProgress)
        ? data.guestArrivalProgress
        : 0;
    state.dailyGuestArrivals = Number.isInteger(data.dailyGuestArrivals)
        ? data.dailyGuestArrivals
        : 0;
    state.tiles = data.tiles.map(row => row.map(normalizeTile));
    state.overlayMode = ['none', 'services', 'utilities', 'entertainment'].includes(data.overlayMode) ? data.overlayMode : 'none';
    state.pitches = data.pitches.map(pitch => ({...pitch, occupied: false}));
    state.facilities = Array.isArray(data.facilities) ? data.facilities : [];
    state.landmarks = Array.isArray(data.landmarks) ? data.landmarks : [];
    state.constructions = Array.isArray(data.constructions) ? data.constructions : [];
    state.staticDeliveries = Array.isArray(data.staticDeliveries) ? data.staticDeliveries : [];
    state.accessoryInventory = data.accessoryInventory || {bbq: 0, patio: 0, firepit: 0, hot_tub: 0};
    state.staticAssetSequence = Number.isInteger(data.staticAssetSequence)
        ? data.staticAssetSequence : 0;
    state.staticDeliveries.forEach(order => {
        const pitch = state.pitches.find(item => item.id === order.pitchId);
        if (pitch && !pitch.deliveryReserved) pitch.deliveryReserved = order.id;
    });
    state.constructions.filter(job => job.kind === 'caravan').forEach(job => {
        const pitch = state.pitches[job.pitchIndex];
        if (pitch) pitch.constructionReserved = true;
    });
    state.facilities = state.facilities.filter(facility => {
        if (facility.type !== 'tree') return true;
        const tile = state.tiles[facility.y]?.[facility.x];
        if (tile && tile.terrain === 'grass' && tile.nature !== 'tree') {
            tile.nature = 'tree';
        }
        return false;
    });
    state.handymen = Number.isFinite(data.handymen) ? data.handymen : 0;
    state.groundsStaff = Number.isFinite(data.groundsStaff) ? data.groundsStaff : 0;
    state.handymanContractHoursRemaining = Number.isFinite(data.handymanContractHoursRemaining)
        ? Math.max(0, Math.min(24, data.handymanContractHoursRemaining)) : 0;
    state.maintenanceTask = data.maintenanceTask || null;
    state.day = Number.isFinite(data.day) ? data.day : state.day;
    state.hour = Number.isFinite(data.hour) ? data.hour : state.hour;
    state.minute = Number.isFinite(data.minute) ? data.minute : state.minute;
    state.dayLengthMinutes = Number.isFinite(data.dayLengthMinutes)
        ? Math.min(Math.max(Math.round(data.dayLengthMinutes), 3), 60)
        : state.dayLengthMinutes;
    state.simulationSpeed = Number.isFinite(data.simulationSpeed)
        ? Math.max(1, Number(data.simulationSpeed))
        : state.simulationSpeed;
    state.isPaused = Boolean(data.isPaused);
    updateTutorialVisibility(false);
    state.satisfaction = Number.isFinite(data.satisfaction) ? data.satisfaction : state.satisfaction;
    state.rating = Number.isFinite(data.rating) ? data.rating : state.rating;
    state.weather = typeof data.weather === 'string' ? data.weather : state.weather;
    if (data.camera && Number.isFinite(data.camera.x) && Number.isFinite(data.camera.y) &&
        Number.isFinite(data.camera.zoom)) {
        state.camera = {...state.camera, ...data.camera};
    }
    state.caravans = data.caravans.map(savedCaravan => {
        const stablePitchIndex = typeof savedCaravan.pitchId === 'string'
            ? state.pitches.findIndex(pitch => pitch.id === savedCaravan.pitchId)
            : -1;
        const pitchIndex = stablePitchIndex >= 0
            ? stablePitchIndex
            : Number.isInteger(savedCaravan.pitchIndex)
                ? savedCaravan.pitchIndex
                : state.pitches.findIndex(pitch => savedCaravan.pitch && pitch.x === savedCaravan.pitch.x &&
                    pitch.y === savedCaravan.pitch?.y && pitch.w === savedCaravan.pitch?.w &&
                    pitch.h === savedCaravan.pitch?.h);
        const pitch = state.pitches[pitchIndex];
        const caravan = Object.assign(
            new Caravan(pitch, savedCaravan.modelId || savedCaravan.tier, savedCaravan),
            savedCaravan,
            {pitch, pitchId: pitch.id}
        );
        caravan.smokeParticles = [];
        return caravan;
    });
    state.guestProfilePool = CharacterSystem.normalizeGuestRoster(data.guestProfilePool);
    const occupiedGuestPitches = new Set();
    state.guests = (Array.isArray(data.guests) ? data.guests : []).flatMap(guest => {
        const pitch = state.pitches[guest.pitchIndex];
        const headcount = guest.party?.headcount ||
            (Number(guest.party?.adults) || 1) + (Number(guest.party?.children) || 0);
        const savedStayAccommodationValid = guest.accommodation === 'static'
            ? StaticCaravans.getMaximumOccupancy(
                StaticCaravans.findInstalledVan(state, pitch)
            ) >= headcount
            : isGuestAccommodationValid(pitch, guest.accommodation, headcount);
        if (!pitch || pitch.occupied || pitch.deliveryReserved || pitch.constructionReserved ||
            occupiedGuestPitches.has(guest.pitchIndex) ||
            !savedStayAccommodationValid) return [];
        const ratingAtArrival = Number.isFinite(guest.ratingAtArrival)
            ? guest.ratingAtArrival
            : state.rating;
        const stayDaysRemaining = Number.isInteger(guest.stayDaysRemaining) &&
            guest.stayDaysRemaining >= 1 && guest.stayDaysRemaining <= 14
            ? guest.stayDaysRemaining
            : 1 + Math.floor(Math.random() * 14);
        const restoredGuest = {
            ...guest,
            pitch,
            bedtimeHour: Number.isInteger(guest.bedtimeHour)
                ? guest.bedtimeHour
                : GuestParties.getBedtimeHour(guest.party,
                    ParkServices.getEntertainmentCapacity(state) > 0),
            lastBedtimeDay: Number.isInteger(guest.lastBedtimeDay)
                ? guest.lastBedtimeDay : null,
            position: guest.position || {x: pitch.x + pitch.w / 2, y: pitch.y + pitch.h / 2},
            path: Array.isArray(guest.path) ? guest.path : [],
            ratingAtArrival,
            stayDaysRemaining,
            totalIncome: Number.isFinite(guest.totalIncome) ? guest.totalIncome : 0,
            dailyIncome: Number.isFinite(guest.dailyIncome)
                ? guest.dailyIncome
                : getGuestDailyIncome(ratingAtArrival)
        };
        restoredGuest.party ||= {type: 'solo', adults: 1, children: 0, headcount: 1};
        if (!Array.isArray(restoredGuest.party.members) || !restoredGuest.party.members.length) {
            const assigned = CharacterSystem.createPartyMembers(restoredGuest.party, state.guestProfilePool);
            restoredGuest.party.members = assigned.members;
            state.guestProfilePool = assigned.roster;
        }
        pitch.occupied = true;
        occupiedGuestPitches.add(guest.pitchIndex);
        return [restoredGuest];
    });
    state.constructions.filter(job => job.kind === 'caravan').forEach(job => {
        const pitch = state.pitches[job.pitchIndex];
        if (!pitch || pitch.occupied) {
            console.error('Saved caravan construction refers to an unavailable pitch.', job);
        }
    });
    if (data.player && Number.isFinite(data.player.x) && Number.isFinite(data.player.y) &&
        canOccupyPlayer(data.player.x, data.player.y)) {
        state.player = {...data.player};
    }
    state.playerAvatar = data.playerAvatar
        ? CharacterSystem.normalizeAvatar(data.playerAvatar)
        : CharacterSystem.randomizeAvatar(CharacterSystem.defaultAvatar());
    updateAvatarEditor();
    updateVisitorCount();
    state.playerPath = [];
    state.interactionTarget = null;
    refreshPitchCapabilities();
    // Upgrade older saves to use booked guests and persist a one-time random player avatar.
    if (!Array.isArray(data.guestProfilePool) || !data.playerAvatar ||
        (Array.isArray(data.parkNpcs) && data.parkNpcs.length)) saveGame();
}

function generateNewMap() {
    state.wood = 0;
    state.tools = {axe: true, shovel: false};
    state.overlayMode = 'none';
    state.pitches = [];
    state.caravans = [];
    state.staticDeliveries = [];
    state.accessoryInventory = {bbq: 0, patio: 0, firepit: 0, hot_tub: 0};
    state.staticAssetSequence = 0;
    state.guests = [];
    state.facilities = [];
    state.landmarks = STARTING_LANDMARKS.map(landmark => ({...landmark}));
    state.constructions = [];
    state.player = {x: 15.5, y: 25.5};
    state.isPaused = true;
    for (let y = 0; y < GRID_H; y++) {
        state.tiles[y] = [];
        for (let x = 0; x < GRID_W; x++) {
            const terrain = x >= 50 ? 'water' : x >= 47 ? 'sand' :
                Math.hypot(x - 23, y - 20) < 2.5 ? 'water' : 'grass';
            const road = terrain === 'grass' && x >= 8 && x <= 9;
            const path = terrain === 'grass' && y >= 24 && y <= 25 && x >= 10 && x <= 16;
            const roll = Math.abs((x * 73 + y * 37 + x * y * 11 + 19) % 100);
            const safeStart = x >= 1 && x <= 20 && y >= 5 && y <= 29;
            const overgrownCore = x >= 10 && x <= 43 && y >= 5 && y <= 35;
            let nature = null;
            const landmark = state.landmarks.some(item =>
                x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h
            );
            if (terrain === 'grass' && !road && !path && !safeStart && !landmark) {
                if (roll < (overgrownCore ? 29 : 15)) nature = 'tree';
                else if (roll < (overgrownCore ? 42 : 26)) nature = 'debris';
            }
            state.tiles[y][x] = {
                terrain,
                nature,
                road,
                path,
                utilities: createEmptyUtilities()
            };
        }
    }
    state.playerAvatar = state.playerAvatar
        ? CharacterSystem.normalizeAvatar(state.playerAvatar)
        : CharacterSystem.randomizeAvatar(CharacterSystem.defaultAvatar());
    state.guestProfilePool = CharacterSystem.normalizeGuestRoster(state.guestProfilePool);
    updateAvatarEditor();
    updateVisitorCount();
    updateTutorialVisibility();
    refreshPitchCapabilities();
}

function normalizeTile(tile) {
    if (tile.terrain) {
        const road = Boolean(tile.road);
        const path = Boolean(tile.path);
        return {
            terrain: tile.terrain,
            nature: tile.nature || null,
            road,
            path,
            utilities: road || path ? normalizeUtilities(tile.utilities) : createEmptyUtilities()
        };
    }
    return {
        terrain: tile.type === 'water' ? 'water' : 'grass',
        nature: tile.debris ? 'debris' : null,
        road: tile.type === 'road',
        path: false,
        utilities: createEmptyUtilities()
    };
}

function createEmptyUtilities() {
    return {gas: false, water: false, electricity: false, waste: false};
}

function normalizeUtilities(utilities) {
    return Object.fromEntries(UTILITY_TYPES.map(type => [type, Boolean(utilities?.[type])]));
}

function isValidTileData(tile) {
    return GameRulesApi.isValidTileData(tile);
}

function isGuestAccommodationValid(pitch, accommodation, headcount = 1) {
    const caravan = StaticCaravans.findInstalledVan(state, pitch);
    if (caravan && accommodation !== 'static') return false;
    if (!caravan && accommodation === 'static') return false;
    if (!GameRulesApi.isGuestAccommodationValid(pitch, accommodation, state.tiles)) return false;
    if (accommodation !== 'static') return true;
    return Boolean(caravan && caravan.isOperational !== false && !caravan.isBroken &&
        StaticCaravans.getMaximumOccupancy(caravan) >= headcount);
}

function getPitchHookups(pitch) {
    return ParkServices.getPitchHookups(pitch, state.tiles);
}

function isPitchReadyForStatic(pitch) {
    if (pitch.type !== 'gravel') return false;
    const hookups = getPitchHookups(pitch);
    return UTILITY_TYPES.every(type => hookups[type]);
}

function getGuestDailyIncome(rating) {
    return Math.max(0, Math.round(25 * rating));
}

function smoothstep(edge0, edge1, value) {
    const progress = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
    return progress * progress * (3 - 2 * progress);
}

function getDayNightLighting() {
    const time = state.hour + state.minute / 60;
    const dawnDarkness = 1 - smoothstep(4.5, 7, time);
    const duskDarkness = smoothstep(17, 19.5, time);
    const darkness = Math.max(dawnDarkness, duskDarkness);
    let phase;
    let icon;
    if (time < 5 || time >= 20) {
        phase = 'Night';
        icon = '🌙';
    } else if (time < 7) {
        phase = 'Dawn';
        icon = '🌅';
    } else if (time < 17) {
        phase = 'Daylight';
        icon = '☀️';
    } else {
        phase = 'Dusk';
        icon = '🌇';
    }
    return {phase, icon, darkness: darkness * 0.62};
}

function getTileProperties(x, y) {
    return GameStateApi.getTileProperties(state, x, y);
}

function canOccupyPlayer(x, y) {
    return GameStateApi.canOccupyPlayer(state, x, y);
}

function findPathToAny(destinationTiles) {
    return GameStateApi.findPathToAny(state, destinationTiles);
}

function findInteractableAt(x, y) {
    return GameStateApi.findInteractableAt(state, x, y);
}

function approachInteractable(target) {
    const candidates = [];
    for (let x = target.x; x < target.x + target.w; x++) {
        candidates.push({x, y: target.y - 1});
        candidates.push({x, y: target.y + target.h});
    }
    for (let y = target.y; y < target.y + target.h; y++) {
        candidates.push({x: target.x - 1, y});
        candidates.push({x: target.x + target.w, y});
    }
    const path = findPathToAny(candidates.filter(tile => getTileProperties(tile.x, tile.y).walkable));
    if (!path) {
        state.playerPath = [];
        state.interactionTarget = null;
        showToast('❌ There is no clear way to approach that object.');
        return;
    }
    state.playerPath = path;
    state.interactionTarget = target;
    updateInteractionHint();
}

function movePlayerTo(x, y) {
    if (!getTileProperties(x, y).walkable) {
        showToast('❌ You cannot walk there.');
        return;
    }
    const path = findPathToAny([{x, y}]);
    if (!path) {
        showToast('❌ There is no clear route there.');
        return;
    }
    state.playerPath = path;
    state.interactionTarget = null;
}

function distanceToTarget(target) {
    const dx = Math.max(target.x - state.player.x, 0, state.player.x - (target.x + target.w));
    const dy = Math.max(target.y - state.player.y, 0, state.player.y - (target.y + target.h));
    return Math.hypot(dx, dy);
}

function formatGameTime(minutes) {
    const day = Math.floor(minutes / 1440) + 1;
    const minuteOfDay = ((minutes % 1440) + 1440) % 1440;
    return `Day ${day}, ${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
}

function openVendor(title, renderer) {
    document.getElementById('vendor-title').textContent = title;
    document.getElementById('vendor-dialog').hidden = false;
    renderer();
    document.getElementById('vendor-close').focus();
}

function closeVendor() {
    document.getElementById('vendor-dialog').hidden = true;
}

function renderRustyResales(selectedPitchId) {
    const content = document.getElementById('vendor-content');
    const oldSelect = content.querySelector('#rusty-pitch');
    const selectedId = selectedPitchId || oldSelect?.value;
    const hardstanding = state.pitches.filter(pitch => pitch.type === 'gravel');
    const options = hardstanding.map(pitch => {
        const installed = StaticCaravans.findInstalledVan(state, pitch);
        const eligibility = StaticCaravans.getPitchEligibility(state, pitch, {
            replacingVanId: installed?.id
        });
        return {pitch, installed, eligibility};
    });
    const eligible = options.filter(option => option.eligibility.eligible);
    const selected = eligible.find(option => option.pitch.id === selectedId) || eligible[0] || null;
    const van = selected?.installed;
    const tradeIn = van
        ? StaticCaravans.calculateResaleValue(van, StaticCaravans.gameTimeMinutes(state))
        : 0;
    const selectedSummary = selected
        ? `<p>Pitch ${escapeHtml(selected.pitch.id)}: ${selected.installed ? 'replacement' : 'new installation'} · ` +
            `trade-in ${van ? `£${escapeHtml(tradeIn.toLocaleString())}` : '£0'} · catalogue prices shown below; net cost is price minus trade-in.</p>`
        : '';
    const pending = state.staticDeliveries || [];
    const deliveryMarkup = pending.length
        ? `<ul>${pending.map(order =>
            `<li>${escapeHtml(StaticCaravans.getModel(order.modelId)?.name || order.modelId)} → pitch ${escapeHtml(order.pitchId)} · expected ${escapeHtml(formatGameTime(order.deliveryAtMinutes))}</li>`
        ).join('')}</ul>`
        : '<p>No static deliveries are currently scheduled.</p>';
    const installedMarkup = state.caravans.length
        ? `<ul>${state.caravans.map(item => {
            const model = StaticCaravans.getModel(item.modelId);
            const ageDays = Math.floor(StaticCaravans.calculateAgeDays(
                item, StaticCaravans.gameTimeMinutes(state)
            ));
            const value = StaticCaravans.calculateResaleValue(item, StaticCaravans.gameTimeMinutes(state));
            return `<li>Pitch ${escapeHtml(item.pitchId)}: ${escapeHtml(model?.name || item.modelId)} · ${escapeHtml(model?.tierName || item.tier)} · ${escapeHtml(item.bedrooms)} bedroom(s) / ${escapeHtml(StaticCaravans.getMaximumOccupancy(item))} people · ${escapeHtml(ageDays)} in-game day(s) old · trade-in £${escapeHtml(value.toLocaleString())}</li>`;
        }).join('')}</ul>`
        : '<p>No static caravans are installed yet.</p>';
    const blockers = options.filter(option => !option.eligibility.eligible).map(option =>
        `<li>Pitch ${escapeHtml(option.pitch.id)}: ${escapeHtml(option.eligibility.reason)}</li>`
    );
    const modelCards = StaticCaravans.CATALOGUE.map(model => {
        const netCost = model.purchasePrice - tradeIn;
        return `<article class="vendor-item"><strong>${escapeHtml(model.name)} · £${escapeHtml(model.purchasePrice.toLocaleString())}</strong>` +
            `<p>${escapeHtml(model.tierName)} · ${escapeHtml(model.conditionCategory)} · ${escapeHtml(model.bedrooms)} bedroom(s), up to ${escapeHtml(model.maxOccupancy)} people · ${escapeHtml(model.interiorQuality)} interior</p>` +
            `<button type="button" data-vendor-buy="${escapeHtml(model.id)}" ${!selected || state.cash < netCost ? 'disabled' : ''}>` +
            `${netCost < 0 ? `Net credit £${escapeHtml(Math.abs(netCost).toLocaleString())}` : `Net cost £${escapeHtml(netCost.toLocaleString())}`}</button></article>`;
    }).join('');
    const deckingPitches = state.pitches.filter(pitch => {
        const installed = StaticCaravans.findInstalledVan(state, pitch);
        return pitch.type === 'gravel' && installed &&
            (!pitch.decking || pitch.decking.condition <= 0) && !pitch.occupied &&
            !pitch.constructionReserved && !pitch.deliveryReserved && !pitch.replacementReserved;
    });
    const deckingMarkup = deckingPitches.length
        ? `<div class="vendor-list">${deckingPitches.map(pitch =>
            `<article class="vendor-item"><strong>Pitch ${escapeHtml(pitch.id)}</strong><p>Hardstanding with a static caravan · decking lasts ${escapeHtml(StaticCaravans.DECKING.lifespanDays.toLocaleString())} in-game days.</p>` +
            `<button type="button" data-install-decking="${escapeHtml(pitch.id)}" ${state.cash < StaticCaravans.DECKING.price ? 'disabled' : ''}>${pitch.decking ? 'Replace end-of-life decking' : 'Install decking'} · £${escapeHtml(StaticCaravans.DECKING.price.toLocaleString())}</button></article>`
        ).join('')}</div>`
        : '<p>No unoccupied, unreserved static pitches currently qualify for decking.</p>';
    const deckingStatus = state.pitches.filter(pitch => pitch.decking).map(pitch => {
        const ageDays = Math.max(0, (StaticCaravans.gameTimeMinutes(state) -
            pitch.decking.installedAtMinutes) / 1440);
        const remaining = Math.max(0, StaticCaravans.DECKING.lifespanDays - ageDays);
        return `<li>Pitch ${escapeHtml(pitch.id)}: ${escapeHtml(Math.round(pitch.decking.condition))}% condition · ${escapeHtml(Math.floor(remaining).toLocaleString())} in-game day(s) remaining${pitch.decking.operational === false ? ' · End of life' : ''}</li>`;
    });
    content.innerHTML =
        `<p class="vendor-note">Available cash: £${escapeHtml(Math.floor(state.cash).toLocaleString())}. Time continues while browsing. Delivery takes six in-game hours and is limited to 08:00–20:00.</p>` +
        `<h3>Choose a pitch</h3>` +
        (eligible.length
            ? `<select id="rusty-pitch" class="vendor-select">${eligible.map(option =>
                `<option value="${escapeHtml(option.pitch.id)}" ${option.pitch.id === selected?.pitch.id ? 'selected' : ''}>` +
                `Pitch ${escapeHtml(option.pitch.id)} · ${option.installed ? `replace ${escapeHtml(StaticCaravans.getModel(option.installed.modelId)?.name || 'installed static')}` : 'empty hardstanding'}</option>`
            ).join('')}</select>${selectedSummary}`
            : '<p>No eligible empty or replacement pitches. A pitch needs connected gas, water, electricity and waste; it must be unoccupied and unreserved.</p>') +
        `<h3>Installed statics</h3>${installedMarkup}` +
        `<h3>Pitch availability</h3>${blockers.length ? `<ul>${blockers.join('')}</ul>` : '<p>All hardstanding pitches are eligible.</p>'}` +
        `<h3>Van catalogue</h3><div class="vendor-list">${modelCards}</div>` +
        `<h3>Decking</h3>${deckingMarkup}${deckingStatus.length ? `<ul>${deckingStatus.join('')}</ul>` : ''}` +
        `<h3>Pending deliveries</h3>${deliveryMarkup}`;
}

function openRustyResales() {
    openVendor('Rusty Resales · Static Caravans', () => renderRustyResales());
}

function renderFiddlShop() {
    const content = document.getElementById('vendor-content');
    content.innerHTML = `<p class="vendor-note">Available cash: £${escapeHtml(Math.floor(state.cash).toLocaleString())}. Buy an item here, then click a tile inside an eligible pitch to place it. Time continues while browsing.</p>` +
        `<div class="vendor-list">${Object.values(StaticCaravans.ACCESSORIES).map(item =>
            `<article class="vendor-item"><strong>${escapeHtml(item.name)} · £${escapeHtml(item.price.toLocaleString())}</strong><p>${escapeHtml(item.description)} Eligible: ${escapeHtml(item.pitches.map(type => type === 'gravel' ? 'Hardstanding' : 'Grass').join(', '))}. Owned: ${escapeHtml(state.accessoryInventory?.[item.id] || 0)}</p>` +
            `<button type="button" data-buy-accessory="${escapeHtml(item.id)}" ${state.cash < item.price ? 'disabled' : ''}>Buy and place · £${escapeHtml(item.price.toLocaleString())}</button></article>`
        ).join('')}</div>`;
}

function openFiddlShop() {
    openVendor('Fiddl · Pitch Accessories', renderFiddlShop);
}

function interactWith(target) {
    if (target.kind === 'tree' || target.kind === 'debris') {
        const tile = state.tiles[target.y]?.[target.x];
        if (!tile || tile.nature !== target.kind) {
            showToast('That overgrowth has already been cleared.');
            return;
        }
        tile.nature = null;
        state.interactionTarget = null;
        state.playerPath = [];
        if (target.kind === 'tree') {
            const timber = LandManagement.harvestYield(target.x, target.y);
            state.wood += timber;
            playSound(180, 'triangle', 0.18);
            saveGame();
            updateUI();
            showToast(`🪓 Tree felled · collected ${timber} timber. Sell timber from Park Management.`);
        } else {
            playSound(280, 'triangle', 0.1);
            saveGame();
            updateUI();
            showToast('🌿 Brush and debris cleared.');
        }
        return;
    }
    if (target.kind === 'caravan') {
        state.selectedEntity = target.entity;
        updateUI();
        return;
    }
    if (target.kind === 'facility') {
        state.selectedEntity = target.entity;
        updateUI();
        return;
    }
    if (target.kind === 'landmark') {
        if (target.entity.type === 'farmhouse') {
            if (SimulationClock.canSleep(state)) {
                showSleepPrompt();
            } else {
                showToast('The farmhouse is available for sleep between 8pm and 5am.');
            }
            return;
        }
        if (target.entity.type === 'rusty_resales') {
            openRustyResales();
        } else if (target.entity.type === 'fiddl_shop') {
            openFiddlShop();
        } else if (target.entity.type === 'job_centre') {
            const panel = 'park';
            showMenuPanel(panel, document.querySelector(`[data-panel="${panel}"]`));
            showToast('Job Centre: hire park staff from the management menu as your park grows.');
        } else {
            showToast('Home sweet (if slightly run-down) home.');
        }
        return;
    }
    if (target.kind === 'guest') {
        showToast(`${target.entity.party?.type || 'Guest'} party (${target.entity.party?.headcount || 1}) · ${target.entity.activity || 'relaxing'} · £${target.entity.totalIncome} paid · ${target.entity.stayDaysRemaining} day${target.entity.stayDaysRemaining === 1 ? '' : 's'} left`);
        return;
    }
    if (target.kind === 'pitch') {
        showToast(`Empty ${target.entity.type === 'gravel' ? 'Hardstanding' : 'Grass'} pitch`);
    }
}

function showSleepPrompt() {
    const prompt = document.getElementById('sleep-prompt');
    if (state.sleeping || !prompt.hidden || !SimulationClock.canSleep(state)) return;
    state.playerPath = [];
    state.interactionTarget = null;
    prompt.hidden = false;
    document.getElementById('sleep-confirm').focus();
}

function dismissSleepPrompt() {
    document.getElementById('sleep-prompt').hidden = true;
    state.sleepPromptDismissed = true;
}

async function sleepThroughNight() {
    if (state.sleeping) return;
    if (!SimulationClock.canSleep(state)) {
        document.getElementById('sleep-prompt').hidden = true;
        showToast('The farmhouse is available for sleep between 8pm and 5am.');
        return;
    }

    state.sleeping = true;
    state.playerPath = [];
    state.interactionTarget = null;
    state.isDown = false;
    state.buildingDrag = false;
    pressedKeys.clear();
    document.getElementById('sleep-prompt').hidden = true;
    const transition = document.getElementById('sleep-transition');
    transition.classList.add('active');
    await new Promise(resolve => window.setTimeout(resolve, 600));

    SimulationClock.advanceToHour(state, 8, {
        onHourly: () => {
            onHourly();
            GuestActivities.updateGuestActivities(
                state, (Number(state.dayLengthMinutes) || 10) * 60 / 24 / 10
            );
            applyCaravanDecayForElapsedSeconds(
                (Number(state.dayLengthMinutes) || 10) * 600 / 24
            );
        },
        onDaily
    });
    updateConstructions();
    updateStaticDeliveries();
    saveGame();
    updateUI();
    transition.classList.remove('active');
    await new Promise(resolve => window.setTimeout(resolve, 600));

    state.sleeping = false;
    state.sleepPromptDismissed = false;
    updateInteractionHint();
}

function interactNearby() {
    const target = state.interactionTarget &&
        distanceToTarget(state.interactionTarget) <= 1.25
        ? state.interactionTarget
        : [...state.caravans.map(entity => ({
            kind: 'caravan', entity, ...StaticCaravans.getStaticFootprint(entity.pitch)
        })),
            ...state.guests.map(entity => ({kind: 'guest', entity, ...entity.pitch})),
            ...state.facilities.map(entity => ({kind: 'facility', entity, ...entity})),
            ...state.tiles.flatMap((row, y) => row.map((tile, x) =>
                tile.nature === 'tree' || tile.nature === 'debris'
                    ? {kind: tile.nature, entity: tile, x, y, w: 1, h: 1}
                    : null).filter(Boolean)),
            ...(state.landmarks || []).filter(entity => entity.interactable)
                .map(entity => ({kind: 'landmark', entity, ...entity})),
            ...state.pitches.filter(entity => !entity.occupied)
                .map(entity => ({kind: 'pitch', entity, ...entity}))]
            .filter(item => distanceToTarget(item) <= 1.25)
            .sort((a, b) => distanceToTarget(a) - distanceToTarget(b))[0];

    if (!target) {
        showToast('Walk closer to an object to interact.');
        return;
    }
    interactWith(target);
}

function updateInteractionHint() {
    const hint = document.getElementById('interaction-hint');
    if (!hint) return;
    const target = state.interactionTarget;
    let message = state.activeTool.startsWith('place_accessory_')
        ? 'Click a tile inside an eligible pitch to place the selected accessory'
        : 'WASD / Arrows: Move · Click ground: Walk · Click overgrowth, approach, then E to clear';
    if (target && distanceToTarget(target) <= 1.25) {
        message = target.kind === 'tree' ? 'Press E to fell tree and collect timber'
            : target.kind === 'debris' ? 'Press E to clear brush and debris'
            : target.kind === 'landmark' && target.entity.type === 'farmhouse'
                ? 'Old Farm House · sleep available from 8pm to 5am'
            : target.kind === 'landmark' && target.entity.type === 'rusty_resales'
                ? 'Press E to browse static caravans and decking'
            : target.kind === 'landmark' && target.entity.type === 'fiddl_shop'
                ? 'Press E to browse pitch accessories'
            : 'Press E to interact';
    } else if (target) {
        message = target.kind === 'tree' ? 'Approaching tree... · E: Fell when nearby'
            : target.kind === 'debris' ? 'Approaching debris... · E: Clear when nearby'
            : 'Approaching object... · E: Interact when nearby';
    }
    if (hint.innerText !== message) hint.innerText = message;
}

function updatePlayerMovement(deltaSeconds) {
    if (!document.getElementById('start-screen').hidden || state.sleeping ||
        !document.getElementById('sleep-prompt').hidden || state.buildingDrag) return;
    const horizontal = Number(pressedKeys.has('d') || pressedKeys.has('arrowright')) -
        Number(pressedKeys.has('a') || pressedKeys.has('arrowleft'));
    const vertical = Number(pressedKeys.has('s') || pressedKeys.has('arrowdown')) -
        Number(pressedKeys.has('w') || pressedKeys.has('arrowup'));
    if (horizontal || vertical) {
        state.playerPath = [];
        state.interactionTarget = null;
        const length = Math.hypot(horizontal, vertical);
        const distance = PLAYER_SPEED * deltaSeconds / length;
        const nextX = state.player.x + horizontal * distance;
        const nextY = state.player.y + vertical * distance;
        if (canOccupyPlayer(nextX, state.player.y)) state.player.x = nextX;
        if (canOccupyPlayer(state.player.x, nextY)) state.player.y = nextY;
    } else if (state.playerPath.length) {
        let remaining = PLAYER_SPEED * deltaSeconds;
        while (remaining > 0 && state.playerPath.length) {
            const destination = state.playerPath[0];
            const dx = destination.x - state.player.x;
            const dy = destination.y - state.player.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= remaining) {
                state.player.x = destination.x;
                state.player.y = destination.y;
                state.playerPath.shift();
                remaining -= distance;
            } else {
                state.player.x += dx / distance * remaining;
                state.player.y += dy / distance * remaining;
                remaining = 0;
            }
        }
    }
    const farmhouse = state.landmarks.find(landmark => landmark.type === 'farmhouse');
    if (farmhouse) {
        const distance = distanceToTarget(farmhouse);
        if (distance > 1.25) {
            state.sleepPromptDismissed = false;
        } else if (SimulationClock.canSleep(state) && !state.sleepPromptDismissed) {
            showSleepPrompt();
        }
    }
    updateInteractionHint();
}

function updateCamera() {
    const zoom = Math.max(2.6, state.camera.zoom);
    state.camera.zoom = Math.min(zoom, 4);
    state.camera.x = canvas.width / 2 - state.player.x * TILE_SIZE * state.camera.zoom;
    state.camera.y = canvas.height / 2 - state.player.y * TILE_SIZE * state.camera.zoom;
}

function saveGame() {
    try {
        localStorage.setItem('caravan_tycoon_save', JSON.stringify({
            schemaVersion: SaveMigrations && SaveMigrations.CURRENT_SAVE_SCHEMA
                ? SaveMigrations.CURRENT_SAVE_SCHEMA
                : 12,
            cash: state.cash,
            initialBalance: state.initialBalance,
            wood: state.wood,
            tools: {axe: true, shovel: Boolean(state.tools?.shovel)},
            transactions: state.transactions,
            tiles: state.tiles,
            pitches: state.pitches,
            staticDeliveries: state.staticDeliveries,
            accessoryInventory: state.accessoryInventory,
            staticAssetSequence: state.staticAssetSequence,
            guests: state.guests.map(guest => ({
                pitchIndex: state.pitches.indexOf(guest.pitch),
                accommodation: guest.accommodation,
                ratingAtArrival: guest.ratingAtArrival,
                dailyIncome: guest.dailyIncome,
                totalIncome: guest.totalIncome,
                stayDaysRemaining: guest.stayDaysRemaining,
                position: guest.position,
                path: guest.path,
                destination: guest.destination,
                activity: guest.activity,
                activityTimer: guest.activityTimer,
                bedtimeHour: guest.bedtimeHour,
                lastBedtimeDay: guest.lastBedtimeDay,
                facilityVisits: guest.facilityVisits,
                activityFacilityType: guest.activityFacilityType,
                routeFailures: guest.routeFailures,
                experienceScore: guest.experienceScore,
                lastUtilityReliability: guest.lastUtilityReliability,
                party: guest.party,
                booking: guest.booking,
                lastFacilityUpdate: guest.lastFacilityUpdate
            })),
            caravans: state.caravans.map(caravan => ({
                ...caravan,
                pitchIndex: state.pitches.indexOf(caravan.pitch),
                pitch: undefined,
                smokeParticles: undefined
            })),
            facilities: state.facilities,
            overlayMode: state.overlayMode || 'none',
            landmarks: state.landmarks,
            constructions: state.constructions,
            handymen: state.handymen,
            groundsStaff: state.groundsStaff || 0,
            handymanContractHoursRemaining: state.handymanContractHoursRemaining || 0,
            maintenanceTask: state.maintenanceTask || null,
            day: state.day,
            hour: state.hour,
            minute: state.minute,
            satisfaction: state.satisfaction,
            rating: state.rating,
            weather: state.weather,
            dayLengthMinutes: state.dayLengthMinutes,
            simulationSpeed: state.simulationSpeed,
            isPaused: state.isPaused,
            camera: state.camera,
            player: state.player,
            playerAvatar: CharacterSystem.normalizeAvatar(state.playerAvatar),
            guestProfilePool: CharacterSystem.normalizeGuestRoster(state.guestProfilePool),
            guestArrivalProgress: state.guestArrivalProgress,
            dailyGuestArrivals: state.dailyGuestArrivals
        }));
    } catch (error) {
        console.error('Unable to save the game.', error);
        showToast('❌ Unable to save the game.');
    }
}

class Caravan {
    constructor(pitch, tier, options = {}) {
        const modelId = typeof tier === 'string' ? tier : tier === 2 ? 'gold-2br' : 'basic-1br';
        const model = StaticCaravans.createVan(modelId, {
            ...options,
            pitchId: pitch?.id || options.pitchId
        });
        if (!model) throw new Error(`Unknown static caravan model: ${modelId}`);
        Object.assign(this, model);
        this.pitch = pitch;
        this.id ||= null;
    }
    getDailyRent() {
        return StaticCaravans.getModel(this.modelId)?.dailyRent || 0;
    }
    isRentalReady() {
        return this.isOperational && !this.isBroken && isPitchReadyForStatic(this.pitch);
    }
}

// --- Game Logic ---
function update(dt) {
    if (state.sleeping) return;
    if (SimulationApi && typeof SimulationApi.advanceSimulationState === 'function') {
        SimulationApi.advanceSimulationState(state, dt, {
            onHourly,
            onDaily,
            onCaravanStatusChange: refreshPitchCapabilities
        });
    } else {
        if (!state.isPaused) {
            SimulationClock.advanceSimulation(state, dt, {
                onHourly,
                onDaily
            });
        }

        applyCaravanDecayForElapsedSeconds(dt * (Number(state.simulationSpeed) || 1));

        if (!state.isPaused) GuestActivities.updateGuestActivities(state, dt / 10);
        GuestActivities.updateGuestSatisfaction(state);
    }

    StaticCaravans.updateDeckingCondition(state);
    if (!state.isPaused) {
        updateConstructions();
        updateStaticDeliveries();
    }
    updateUI();
}

function applyCaravanDecayForElapsedSeconds(elapsedSeconds) {
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return;
    const brokenStatus = state.caravans.map(caravan => caravan.isBroken);
    if (SimulationApi?.applyCaravanDecay) {
        SimulationApi.applyCaravanDecay(state, elapsedSeconds);
    } else {
        const gameHourSeconds = (Number(state.dayLengthMinutes) || 10) * 600 / 24;
        const breakChance = 1 - Math.pow(1 - 0.001, elapsedSeconds / gameHourSeconds);
        state.caravans.forEach(caravan => {
            const rate = state.weather === 'Rain' ? 0.02 : 0.005;
            caravan.condition = Math.max(0, caravan.condition - rate * elapsedSeconds);
            if (caravan.condition < 40 && !caravan.isBroken && Math.random() < breakChance) {
                caravan.isBroken = true;
            }
        });
    }
    if (state.caravans.some((caravan, index) =>
        caravan.isBroken !== brokenStatus[index])) {
        refreshPitchCapabilities();
    }
}

function onHourly() {
    let pitchCapabilitiesChanged = advanceMaintenanceTask();
    if (state.handymanContractHoursRemaining > 0) {
        state.handymanContractHoursRemaining--;
        pitchCapabilitiesChanged = maintainToiletBlocks(1, 2) || pitchCapabilitiesChanged;
        state.caravans.forEach(caravan => {
            if (caravan.isBroken && state.cash >= 40) {
                recordTransaction(-40, 'repairs', 'Day handyman caravan repair');
                caravan.condition = 100;
                caravan.isBroken = false;
                pitchCapabilitiesChanged = true;
            }
        });
        if (state.handymanContractHoursRemaining === 0) showToast('The booked handyman has finished the day’s work.');
    }
    if (state.groundsStaff > 0) {
        recordTransaction(-(state.groundsStaff * 1), 'wages', 'Grounds staff hourly wages');
        pitchCapabilitiesChanged = maintainToiletBlocks(
            state.groundsStaff * 1.5, state.groundsStaff * 0.25
        ) || pitchCapabilitiesChanged;
    }
    if (state.handymen > 0) {
        recordTransaction(-(state.handymen * 2), 'wages', 'Handyman hourly wages');
        state.caravans.forEach(c => {
            if (c.isBroken && state.cash > 50) {
                recordTransaction(-40, 'repairs', 'Handyman caravan repair');
                c.condition = 100;
                c.isBroken = false;
                pitchCapabilitiesChanged = true;
            }
        });
    }
    FacilityOperations.processHourlyFacilities(state, recordTransaction, () => {
        pitchCapabilitiesChanged = true;
    });
    if (state.hour >= 12) {
        const departingStaticGuests = state.guests.filter(guest =>
            GuestParties.isStaticCheckoutDue(guest, state.day, state.hour)
        );
        const checkedOut = checkOutGuests(departingStaticGuests);
        if (checkedOut) {
            showToast(`${checkedOut} static renter${checkedOut === 1 ? '' : 's'} checked out.`);
        }
    }
    if (pitchCapabilitiesChanged) refreshPitchCapabilities();
    const candidate = createArrivalCandidate();
    const demand = GuestParties.getDemandProfile(state.day);
    const entertainmentAvailable = candidate
        ? ParkServices.canUseEntertainment(state, candidate.party.headcount).valid
        : false;
    const bookingInterest = GuestParties.getBookingInterest(
        candidate?.party, entertainmentAvailable
    );
    const passesInterestCheck = bookingInterest >= 1 || Math.random() < bookingInterest;
    if (candidate && passesInterestCheck && Economy.shouldAcceptGuest(state, {
        demandMultiplier: demand.multiplier,
        eligible: true
    })) {
        candidate.party.spendingMultiplier =
            GuestParties.getSpendingMultiplier(candidate.party, entertainmentAvailable);
        candidate.bedtimeHour = GuestParties.getBedtimeHour(
            candidate.party, entertainmentAvailable
        );
        arriveGuest(candidate);
    }
    saveGame();
}

function createArrivalCandidate() {
    const party = GuestParties.createGuestParty(state.day);
    const accommodations = ['tent', 'towed', 'static'].filter(accommodation =>
        GuestParties.isArrivalTimeAllowed(accommodation, state.hour)
    );
    const candidates = PitchCapabilities.findCandidates(pitchCapabilityIndex, {
        accommodations,
        headcount: party.headcount,
        requiredServices: ['toilets']
    });
    if (!candidates.length) return null;
    return {...candidates[Math.floor(Math.random() * candidates.length)], party};
}

function arriveGuest(candidate) {
    if (!candidate) return false;
    const {pitch, accommodation, party} = candidate;
    const facilityCheck = FacilityOperations.canHostParty(state, accommodation, party.headcount);
    const serviceCheck = ParkServices.getPitchServiceCheck(state, pitch, accommodation, party.headcount);
    if (!facilityCheck.valid || !serviceCheck.valid || pitch.occupied ||
        pitch.constructionReserved || pitch.deliveryReserved || pitch.replacementReserved ||
        !state.pitches.includes(pitch) ||
        !PitchCapabilities.canHostCurrent(state, pitch, {
            accommodation,
            headcount: party.headcount,
            requiredServices: ['toilets']
        }) || !isGuestAccommodationValid(pitch, accommodation, party.headcount)) return false;
    const ratingAtArrival = state.rating;
    const maximumStayDays = accommodation === 'static'
        ? 14
        : ParkServices.getMaximumStayDays(state, pitch, accommodation, party.headcount);
    const stayDaysRemaining = 1 + Math.floor(Math.random() * maximumStayDays);
    const installedVan = accommodation === 'static'
        ? StaticCaravans.findInstalledVan(state, pitch) : null;
    const baseDailyIncome = accommodation === 'static'
        ? StaticCaravans.getModel(installedVan?.modelId)?.dailyRent ||
            getGuestDailyIncome(ratingAtArrival)
        : getGuestDailyIncome(ratingAtArrival);
    const dailyIncome = baseDailyIncome +
        Math.max(0, party.adults - 1) * 8 + party.children * 5;
    const booking = {
        id: `booking-${state.day}-${state.pitches.indexOf(pitch)}-${state.dailyGuestArrivals}`,
        bookedDay: state.day,
        arrivalDay: state.day,
        departureDay: state.day + stayDaysRemaining,
        status: 'checked-in',
        source: 'demand',
        requiredFacilities: FacilityOperations.getRequiredFacilities(accommodation)
    };
    const assignedMembers = CharacterSystem.createPartyMembers(party, state.guestProfilePool);
    party.members = assignedMembers.members;
    state.guestProfilePool = assignedMembers.roster;
    const guest = {
        pitch,
        pitchIndex: state.pitches.indexOf(pitch),
        accommodation,
        party,
        booking,
        ratingAtArrival,
        dailyIncome,
        stayDaysRemaining,
        totalIncome: dailyIncome * stayDaysRemaining,
        position: findGuestArrivalPosition(pitch),
        path: [],
        activity: 'arriving',
        activityTimer: 2,
        bedtimeHour: candidate.bedtimeHour,
        lastBedtimeDay: null,
        facilityVisits: 0,
        lastFacilityUpdate: -1,
        experienceScore: state.satisfaction,
        lastUtilityReliability: 100
    };
    pitch.occupied = true;
    state.guests.push(guest);
    updateVisitorCount();
    recordTransaction(guest.totalIncome, 'guest payment', 'Guest stay paid upfront');
    showToast(`${party.type} party (${party.headcount}) checked in for ${guest.stayDaysRemaining} day${guest.stayDaysRemaining === 1 ? '' : 's'} · £${guest.totalIncome} paid`);
    playSound(660, 'sine', 0.12);
    return true;
}

function findGuestArrivalPosition(pitch) {
    const candidates = [];
    for (let x = pitch.x; x < pitch.x + pitch.w; x++) {
        candidates.push({x, y: pitch.y - 1}, {x, y: pitch.y + pitch.h});
    }
    for (let y = pitch.y; y < pitch.y + pitch.h; y++) {
        candidates.push({x: pitch.x - 1, y}, {x: pitch.x + pitch.w, y});
    }
    const isFree = ({x, y}) => !state.guests.some(guest =>
        Math.floor(guest.position?.x ?? Number.NaN) === x &&
        Math.floor(guest.position?.y ?? Number.NaN) === y
    );
    const isArrivalWalkable = ({x, y}) => {
        const tile = state.tiles[y]?.[x];
        return tile && ['grass', 'sand'].includes(tile.terrain) && tile.nature !== 'tree' &&
            !(state.landmarks || []).some(landmark => landmark.blocksMovement &&
                x >= landmark.x && x < landmark.x + landmark.w &&
                y >= landmark.y && y < landmark.y + landmark.h) &&
            !(state.constructions || []).some(job => job.blocksMovement &&
                x >= job.footprint.x && x < job.footprint.x + job.footprint.w &&
                y >= job.footprint.y && y < job.footprint.y + job.footprint.h) &&
            isFree({x, y}) &&
            !state.facilities.some(facility =>
                x >= facility.x && x < facility.x + facility.w &&
                y >= facility.y && y < facility.y + facility.h
            ) &&
            !state.caravans.some(caravan => {
                const footprint = StaticCaravans?.getStaticFootprint(caravan.pitch) ||
                    caravan.pitch;
                return x >= footprint.x && x < footprint.x + footprint.w &&
                    y >= footprint.y && y < footprint.y + footprint.h;
            });
    };
    const route = candidates.find(({x, y}) => {
        const tile = state.tiles[y]?.[x];
        return tile && (tile.road || tile.path) && isArrivalWalkable({x, y});
    });
    if (route) return {x: route.x + 0.5, y: route.y + 0.5};
    const nearby = candidates.find(isArrivalWalkable);
    if (nearby) return {x: nearby.x + 0.5, y: nearby.y + 0.5};
    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            const tile = state.tiles[y][x];
            if (tile.terrain === 'grass' && (tile.road || tile.path) &&
                isArrivalWalkable({x, y})) {
                return {x: x + 0.5, y: y + 0.5};
            }
        }
    }
    for (let y = pitch.y; y < pitch.y + pitch.h; y++) {
        for (let x = pitch.x; x < pitch.x + pitch.w; x++) {
            if (isArrivalWalkable({x, y})) return {x: x + 0.5, y: y + 0.5};
        }
    }
    return {x: pitch.x + pitch.w / 2, y: pitch.y + pitch.h / 2};
}

function checkOutGuests(departingGuests) {
    departingGuests.forEach(guest => {
        if (Number.isFinite(guest.experienceScore)) {
            const partySatisfaction = Number(guest.party?.needs?.satisfaction) || 75;
            state.satisfaction = Math.max(0, Math.min(100,
                state.satisfaction * 0.7 + guest.experienceScore * 0.2 + partySatisfaction * 0.1));
        }
        if (guest.booking) guest.booking.status = 'checked-out';
        guest.pitch.occupied = false;
        state.guests.splice(state.guests.indexOf(guest), 1);
    });
    return departingGuests.length;
}

function onDaily() {
    const departingGuests = [];
    state.guests.forEach(guest => {
        guest.stayDaysRemaining--;
        if (guest.stayDaysRemaining <= 0 && guest.accommodation !== 'static') {
            departingGuests.push(guest);
        }
    });
    checkOutGuests(departingGuests);
    state.dailyGuestArrivals = 0;
    state.weather = Math.random() < 0.25 ? 'Rain' : 'Sunny';
    if (departingGuests.length) {
        showToast(`${departingGuests.length} guest${departingGuests.length === 1 ? '' : 's'} checked out`);
    }
    saveGame();
}

// --- Build Functions ---
function handleGridClick(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return;
    if (state.activeTool === 'pitch_gravel' && !state.tools?.shovel) {
        showToast('🔒 Buy the shovel from the Tool Shop to prepare hardstanding.');
        return;
    }
    if (state.activeTool.startsWith('utility_') && !state.tools?.shovel) {
        showToast('🔒 Buy the shovel from the Tool Shop to dig utility trenches.');
        return;
    }
    const tile = state.tiles[gy][gx];

    if (state.activeTool === 'select') {
        const target = getTileProperties(gx, gy).interactable
            ? findInteractableAt(gx, gy)
            : null;
        if (target) {
            approachInteractable(target);
        } else {
            state.selectedEntity = null;
            state.interactionTarget = null;
            updateUI();
            movePlayerTo(gx, gy);
        }
        return;
    }

    if (state.activeTool.startsWith('place_accessory_')) {
        placePitchAccessory(gx, gy, state.activeTool.slice('place_accessory_'.length));
        return;
    }
    if (state.activeTool.startsWith('buy_')) {
        showToast('Static caravans are ordered at Rusty Resales.');
        openRustyResales();
        return;
    }

    if (state.activeTool.startsWith('utility_')) {
        const utility = state.activeTool.slice('utility_'.length);
        if (!tile.road && !tile.path) {
            showToast('❌ Utility lines can only be laid under a road or path.');
        } else if (tile.utilities[utility]) {
            showToast('That tile already has this utility line.');
        } else if (isTileUnderConstruction(gx, gy)) {
            showToast('That tile already has construction in progress.');
        } else {
            startConstruction('utility', {utility, tiles: [{x: gx, y: gy}]},
                {x: gx, y: gy, w: 1, h: 1}, UTILITY_COSTS[utility],
                `Laid ${utility} utility line`);
        }
    }
    if (state.activeTool === 'pitch_grass') createPitch(gx, gy, 4, 6, 'grass', 100);
    if (state.activeTool === 'pitch_gravel') createPitch(gx, gy, 4, 8, 'gravel', 250);
    
    const facilityTool = state.activeTool.startsWith('build_')
        ? state.activeTool.slice('build_'.length)
        : null;
    const facility = facilityTool && FACILITY_BUILDINGS[facilityTool];
    if (facility) {
        placeFacility(gx, gy, facility.w, facility.h, facilityTool, facility.cost);
    }

    function placePitchAccessory(x, y, accessoryId) {
        const pitch = state.pitches.find(item =>
            x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h
        );
        if (!pitch) {
            showToast('❌ Accessories must be placed inside a pitch.');
            return false;
        }
        if (!(state.accessoryInventory?.[accessoryId] > 0)) {
            console.error('Accessory placement was requested without owned stock.', {accessoryId});
            showToast('❌ You do not own this accessory.');
            state.activeTool = 'select';
            return false;
        }
        const validation = StaticCaravans.canPlaceAccessory(state, pitch, accessoryId, x, y);
        if (!validation.valid) {
            showToast(`❌ ${validation.reason}`);
            return false;
        }
        const definition = StaticCaravans.ACCESSORIES[accessoryId];
        pitch.accessories ||= [];
        pitch.accessories.push({
            id: StaticCaravans.createInstanceId(state, 'accessory'),
            type: accessoryId,
            x,
            y,
            w: definition.w,
            h: definition.h,
            condition: 100,
            installedAtMinutes: StaticCaravans.gameTimeMinutes(state)
        });
        state.accessoryInventory[accessoryId]--;
        state.activeTool = 'select';
        document.querySelectorAll('.tool-btn').forEach(button => button.classList.remove('active'));
        saveGame();
        updateUI();
        showToast(`${definition.name} placed on pitch ${pitch.id}.`);
        return true;
    }
    if (state.activeTool === 'build_tree') plantTree(gx, gy);
}

function isFootprintAvailable(x, y, w, h) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 ||
        x + w > GRID_W || y + h > GRID_H) return false;

    for (let tileY = y; tileY < y + h; tileY++) {
        for (let tileX = x; tileX < x + w; tileX++) {
            if (!getTileProperties(tileX, tileY).buildable) return false;
        }
    }
    return true;
}

function plantTree(x, y) {
    if (!isFootprintAvailable(x, y, 1, 1)) {
        showToast('❌ That space is blocked or out of bounds.');
        return;
    }
    startConstruction('tree', {x, y}, {x, y, w: 1, h: 1}, 30, 'Planted park tree');
}

function placeFacility(x, y, w, h, type, cost) {
    if (!isFootprintAvailable(x, y, w, h)) {
        showToast('❌ That space is blocked or out of bounds.');
        return;
    }
    startConstruction('facility', {
        type,
        facility: {x, y, w, h, type}
    }, {x, y, w, h}, cost, `Built ${type} facility`);
}

function createPitch(x, y, w, h, type, cost) {
    const pitch = {x, y, w, h, type, occupied: false};
    if (!isFootprintAvailable(x, y, w, h)) {
        showToast('❌ That pitch area is blocked or out of bounds.');
        return;
    }
    const result = GameRulesApi.validatePitchPlacement(
        pitch, state.tiles, state.pitches, state.facilities
    );
    if (!result.valid) {
        showToast(`❌ ${result.reason}`);
        return;
    }
    startConstruction('pitch', {pitch}, pitch, cost, `Built ${type} pitch`);
}

function createPitchesInBox(start, end, type) {
    if (type === 'gravel' && !state.tools?.shovel) {
        showToast('🔒 Buy the shovel from the Tool Shop to prepare hardstanding.');
        return false;
    }
    const plan = GameRulesApi.planPitchBox(start, end, type);
    if (!plan.valid) {
        showToast(`❌ ${plan.reason}`);
        return false;
    }
    if (!hasAdjacentRoute(plan.box.x, plan.box.y, plan.box.w, plan.box.h)) {
        showToast('❌ Connect the pitch area to an adjacent road or path.');
        return false;
    }

    const added = [];
    for (const pitch of plan.pitches) {
        if (!isFootprintAvailable(pitch.x, pitch.y, pitch.w, pitch.h)) {
            showToast('❌ That pitch area is blocked or out of bounds.');
            return false;
        }
        const result = GameRulesApi.validatePitchPlacement(
            pitch, state.tiles, [...state.pitches, ...added], state.facilities,
            {requireAdjacentRoute: false}
        );
        if (!result.valid) {
            showToast(`❌ ${result.reason}`);
            return false;
        }
        added.push(pitch);
    }
    const unitCost = type === 'grass' ? 100 : 250;
    return startConstruction('pitches', {pitches: added}, plan.box,
        unitCost * added.length,
        `Built ${added.length} ${type} pitch${added.length === 1 ? '' : 'es'}`);
}

function drawUtilityLine(start, end, utility) {
    if (!state.tools?.shovel) {
        showToast('🔒 Buy the shovel from the Tool Shop to dig utility trenches.');
        return false;
    }
    const validation = GameRulesApi.validateUtilityLine(start, end, state.tiles, utility);
    if (!validation.valid) {
        showToast(`❌ ${validation.reason}`);
        return false;
    }
    const points = validation.tiles;
    if (points.some(({x, y}) => isTileUnderConstruction(x, y))) {
        showToast('That tile already has construction in progress.');
        return false;
    }
    return startConstruction('utility', {utility, tiles: points},
        getTileBounds(points), points.length * UTILITY_COSTS[utility],
        `Laid ${utility} utility line (${points.length} tiles)`);
}

function handleBuildDrag(start, end) {
    if (state.activeTool === 'road' || state.activeTool === 'path') {
        return createSurfaceInBox(start, end, state.activeTool);
    }
    if (state.activeTool === 'pitch_grass' || state.activeTool === 'pitch_gravel') {
        const type = state.activeTool === 'pitch_grass' ? 'grass' : 'gravel';
        return createPitchesInBox(start, end, type);
    }
    if (state.activeTool.startsWith('utility_')) {
        return drawUtilityLine(start, end, state.activeTool.slice('utility_'.length));
    }
    handleGridClick(end.x, end.y);
    return true;
}

function getTileBounds(tiles) {
    const xs = tiles.map(tile => tile.x);
    const ys = tiles.map(tile => tile.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return {x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1};
}

function startConstruction(kind, payload, footprint, cost, description, category = 'construction') {
    const job = Construction.queueConstruction(state, {
        kind, ...payload, footprint, blocksMovement: true
    });
    if (!job) {
        console.error('Unable to queue construction.', {kind, payload, footprint});
        showToast('❌ Construction could not be scheduled.');
        return false;
    }
    if (!spend(cost, category, description)) {
        state.constructions.pop();
        return false;
    }
    if (kind === 'caravan') {
        const pitch = state.pitches[payload.pitchIndex];
        pitch.constructionReserved = true;
    }
    saveGame();
    showToast('Construction started · ready in 2 in-game hours.');
    return true;
}

function isTileUnderConstruction(x, y) {
    return state.constructions.some(job => job.footprint &&
        x >= job.footprint.x && x < job.footprint.x + job.footprint.w &&
        y >= job.footprint.y && y < job.footprint.y + job.footprint.h);
}

function createSurfaceInBox(start, end, surface) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x) + 1;
    const h = Math.abs(end.y - start.y) + 1;
    if (x < 0 || y < 0 || x + w > GRID_W || y + h > GRID_H) {
        showToast('❌ The selected area is outside the park.');
        return false;
    }
    const tiles = [];
    for (let tileY = y; tileY < y + h; tileY++) {
        for (let tileX = x; tileX < x + w; tileX++) {
            if (!getTileProperties(tileX, tileY).buildable) {
                showToast(`❌ ${surface === 'road' ? 'Roads' : 'Paths'} need clear, buildable ground.`);
                return false;
            }
            tiles.push({x: tileX, y: tileY});
        }
    }
    const cost = surface === 'road' ? 20 : 10;
    return startConstruction('surface', {surface, tiles}, {x, y, w, h}, cost * tiles.length,
        `Built ${tiles.length} ${surface} tile${tiles.length === 1 ? '' : 's'}`);
}

function hasAdjacentRoute(x, y, w, h) {
    for (let tileX = x; tileX < x + w; tileX++) {
        const north = state.tiles[y - 1]?.[tileX];
        const south = state.tiles[y + h]?.[tileX];
        if (north?.road || north?.path || south?.road || south?.path) return true;
    }
    for (let tileY = y; tileY < y + h; tileY++) {
        const west = state.tiles[tileY]?.[x - 1];
        const east = state.tiles[tileY]?.[x + w];
        if (west?.road || west?.path || east?.road || east?.path) return true;
    }
    return false;
}

function recordTransaction(amount, category, description) {
    if (!Economy.recordTransaction(state, amount, category, description)) {
        console.error('Unable to record a game transaction.', {amount, category, description});
        showToast('❌ Transaction could not be recorded.');
        return false;
    }
    return true;
}

function spend(amt, category = 'construction', description = 'Park construction') {
    if (state.cash >= amt) {
        return recordTransaction(-amt, category, description);
    }
    showToast("❌ Not enough cash!");
    return false;
}

// --- Rendering ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Artwork is optional: AssetRenderer falls back to the original procedural art
// until a tileset manifest and atlas are supplied.
function drawAsset(key, x, y, width, height, fallback) {
    return window.AssetRenderer
        ? window.AssetRenderer.draw(ctx, key, x, y, width, height, fallback)
        : (fallback(), false);
}

function drawAccommodationGlow(x, y, width, strength) {
    if (strength <= 0) return;
    const radius = TILE_SIZE * 1.15;
    const centerX = (x + width / 2) * TILE_SIZE;
    const centerY = y * TILE_SIZE + TILE_SIZE * 0.08;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(1, 0.55);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(255, 196, 112, ${0.19 * strength})`);
    glow.addColorStop(0.45, `rgba(255, 196, 112, ${0.1 * strength})`);
    glow.addColorStop(1, 'rgba(255, 196, 112, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.restore();
}

function connectedSurfaceMask(x, y, surface) {
    const has = (tileX, tileY) => Boolean(state.tiles[tileY]?.[tileX]?.[surface]);
    return (has(x, y - 1) ? 1 : 0) |
        (has(x + 1, y) ? 2 : 0) |
        (has(x, y + 1) ? 4 : 0) |
        (has(x - 1, y) ? 8 : 0);
}

function resizeCanvas() {
    const topBar = document.getElementById('top-bar');
    const availableHeight = Math.max(160, window.innerHeight - (topBar?.getBoundingClientRect().height || 52));
    canvas.width = window.innerWidth;
    canvas.height = availableHeight;
}
let lastFrameTime = 0;

function draw(timestamp = 0) {
    const deltaSeconds = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.05) : 0;
    lastFrameTime = timestamp;
    updatePlayerMovement(deltaSeconds);
    updateCamera();
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.save();
    ctx.translate(state.camera.x, state.camera.y);
    ctx.scale(state.camera.zoom, state.camera.zoom);

    // Terrain layer
    for(let y=0; y<GRID_H; y++) {
        for(let x=0; x<GRID_W; x++) {
            const t = state.tiles[y][x];
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            const terrainKey = t.terrain === 'grass' ? `terrain.grass.${(x + y) % 3}`
                : t.terrain === 'sand' ? 'terrain.sand' : 'terrain.water';
            drawAsset(terrainKey, px, py, TILE_SIZE, TILE_SIZE, () => {
                ctx.fillStyle = t.terrain === 'grass' ? PALETTE.grass[(x+y)%3] :
                    t.terrain === 'sand' ? '#d6c18e' : PALETTE.water;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            });
        }
    }

    // Nature layer
    for(let y=0; y<GRID_H; y++) {
        for(let x=0; x<GRID_W; x++) {
            const nature = state.tiles[y][x].nature;
            const px = x*TILE_SIZE; const py = y*TILE_SIZE;
            if (nature === 'debris') {
                drawAsset('nature.debris', px, py, TILE_SIZE, TILE_SIZE, () => {
                    ctx.fillStyle = 'rgba(35, 45, 24, 0.35)';
                    ctx.fillRect(px+4, py+5, 2, 2);
                    ctx.fillRect(px+10, py+11, 2, 2);
                });
            } else if (nature === 'tree') {
                drawAsset('nature.tree', px, py - TILE_SIZE, TILE_SIZE, TILE_SIZE * 2, () => {
                    ctx.fillStyle = '#2d3b1e'; ctx.fillRect(px+6, py+10, 4, 6);
                    ctx.fillStyle = PALETTE.tree; ctx.beginPath(); ctx.arc(px+8, py+6, 6, 0, Math.PI*2); ctx.fill();
                });
            }
        }
    }

    // Road layer
    for(let y=0; y<GRID_H; y++) {
        for(let x=0; x<GRID_W; x++) {
            if (!state.tiles[y][x].road) continue;
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            const mask = connectedSurfaceMask(x, y, 'road');
            drawAsset(`surface.road.${mask}`, px, py, TILE_SIZE, TILE_SIZE, () => {
                ctx.fillStyle = PALETTE.road;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            });
        }
    }
    for(let y=0; y<GRID_H; y++) {
        for(let x=0; x<GRID_W; x++) {
            if (!state.tiles[y][x].path) continue;
            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;
            const mask = connectedSurfaceMask(x, y, 'path');
            drawAsset(`surface.path.${mask}`, px, py, TILE_SIZE, TILE_SIZE, () => {
                ctx.fillStyle = PALETTE.path;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            });
        }
    }
    if (state.overlayMode === 'services') {
        state.facilities.filter(f => ['toilets', 'showers'].includes(f.type)).forEach(f => {
            const cx = (f.x + f.w / 2) * TILE_SIZE;
            const cy = (f.y + f.h / 2) * TILE_SIZE;
            ctx.fillStyle = 'rgba(52, 152, 219, 0.12)';
            ctx.strokeStyle = 'rgba(52, 152, 219, 0.75)';
            ctx.lineWidth = 1.5 / state.camera.zoom;
            const radius = ParkServices.LOCAL_SERVICE_RADIUS * TILE_SIZE;
            ctx.beginPath();
            ctx.moveTo(cx, cy - radius);
            ctx.lineTo(cx + radius, cy);
            ctx.lineTo(cx, cy + radius);
            ctx.lineTo(cx - radius, cy);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        });
        state.pitches.forEach(p => {
            const check = ParkServices.getPitchServiceCheck(state, p, p.type === 'gravel' ? 'static' : 'tent', 1);
            ctx.fillStyle = check.valid ? 'rgba(46, 204, 113, 0.24)' : 'rgba(231, 76, 60, 0.22)';
            ctx.fillRect(p.x*TILE_SIZE, p.y*TILE_SIZE, p.w*TILE_SIZE, p.h*TILE_SIZE);
        });
    } else if (state.overlayMode === 'utilities') {
        const overlayColors = {gas: '#e67e22', water: '#5dade2', electricity: '#f4d03f', waste: '#d5d8dc'};
        UTILITY_TYPES.forEach(type => {
            const connected = ParkServices.getConnectedUtilityTiles(state.tiles, type);
            const utilityIndex = UTILITY_TYPES.indexOf(type);
            for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
                const tile = state.tiles[y][x];
                if (!tile.utilities?.[type] || (!tile.road && !tile.path)) continue;
                ctx.strokeStyle = connected.has(`${x},${y}`) ? overlayColors[type] : '#e74c3c';
                ctx.lineWidth = 2 / state.camera.zoom;
                ctx.beginPath();
                ctx.moveTo(x*TILE_SIZE + 2, y*TILE_SIZE + 3 + utilityIndex * 3);
                ctx.lineTo(x*TILE_SIZE + TILE_SIZE - 2, y*TILE_SIZE + 3 + utilityIndex * 3);
                ctx.stroke();
            }
        });
    } else if (state.overlayMode === 'entertainment') {
        const capacity = ParkServices.getEntertainmentCapacity(state);
        const usage = ParkServices.getEntertainmentUsage(state);
        state.facilities.filter(f => ParkServices.ENTERTAINMENT_TYPES.includes(f.type)).forEach(f => {
            ctx.fillStyle = 'rgba(155, 89, 182, 0.2)';
            ctx.fillRect(f.x*TILE_SIZE, f.y*TILE_SIZE, f.w*TILE_SIZE, f.h*TILE_SIZE);
            ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial';
            ctx.fillText(`Park ${usage}/${capacity}`, f.x*TILE_SIZE + 3, f.y*TILE_SIZE + 12);
        });
    }

    state.landmarks.forEach(landmark => {
        const px = landmark.x * TILE_SIZE;
        const py = landmark.y * TILE_SIZE;
        const width = landmark.w * TILE_SIZE;
        const height = landmark.h * TILE_SIZE;
        if (landmark.type === 'for_sale') {
            ctx.fillStyle = 'rgba(218, 196, 127, 0.16)';
            ctx.fillRect(px, py, width, height);
            ctx.strokeStyle = '#f3df9b';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(px + 2, py + 2, width - 4, height - 4);
            ctx.setLineDash([]);
            ctx.fillStyle = '#fff4c2';
            ctx.font = 'bold 9px Arial';
            ctx.fillText('LAND FOR SALE', px + 6, py + 14);
            return;
        }
        const isFarmhouse = landmark.type === 'farmhouse';
        const hasArtwork = drawAsset(`landmark.${landmark.type}`, px, py, width, height, () => {
            ctx.fillStyle = isFarmhouse ? '#9b8464' : '#d6c4a3';
            ctx.fillRect(px, py + 3, width, height - 3);
            ctx.fillStyle = isFarmhouse ? '#69483b' : '#6b3f32';
            ctx.fillRect(px - 2, py, width + 4, 5);
            ctx.fillStyle = '#31485a';
            ctx.fillRect(px + 4, py + 9, 5, 6);
            ctx.fillRect(px + width - 10, py + 9, 5, 6);
        });
        if (!hasArtwork) {
            ctx.fillStyle = '#fff4dc';
            ctx.font = 'bold 7px Arial';
            ctx.fillText(landmark.name.toUpperCase(), px + 3, py + height - 5, width - 6);
            if (landmark.subtitle) {
                ctx.font = '6px Arial';
                ctx.fillText(landmark.subtitle, px + 3, py + height + 3, width - 6);
            }
        }
    });
    const utilityColors = {
        gas: '#e67e22', water: '#5dade2', electricity: '#f4d03f', waste: '#d5d8dc'
    };
    for(let y=0; y<GRID_H; y++) {
        for(let x=0; x<GRID_W; x++) {
            const tile = state.tiles[y][x];
            if (!tile.road && !tile.path) continue;
            UTILITY_TYPES.forEach((type, index) => {
                if (!tile.utilities[type]) return;
                ctx.strokeStyle = utilityColors[type];
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x*TILE_SIZE + 2, y*TILE_SIZE + 3 + index * 3);
                ctx.lineTo(x*TILE_SIZE + TILE_SIZE - 2, y*TILE_SIZE + 3 + index * 3);
                ctx.stroke();
            });
        }
    }

    // Pitch layer
    state.pitches.forEach(p => {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(p.x*TILE_SIZE, p.y*TILE_SIZE, p.w*TILE_SIZE, p.h*TILE_SIZE);
        ctx.setLineDash([]);
    });

    if (state.isDown && state.dragStart && state.pointerTile &&
        (state.activeTool === 'pitch_grass' || state.activeTool === 'pitch_gravel')) {
        const x = Math.min(state.dragStart.x, state.pointerTile.x);
        const y = Math.min(state.dragStart.y, state.pointerTile.y);
        const width = Math.abs(state.pointerTile.x - state.dragStart.x) + 1;
        const height = Math.abs(state.pointerTile.y - state.dragStart.y) + 1;
        const minimum = state.activeTool === 'pitch_grass' ? {w: 4, h: 6} : {w: 4, h: 8};
        const validSize = ((width >= minimum.w && height >= minimum.h) ||
            (width >= minimum.h && height >= minimum.w)) &&
            hasAdjacentRoute(x, y, width, height) &&
            Array.from({length: height}, (_, row) =>
                Array.from({length: width}, (_, column) =>
                    getTileProperties(x + column, y + row).buildable
                ).every(Boolean)
            ).every(Boolean);
        ctx.fillStyle = validSize ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.24)';
        ctx.strokeStyle = validSize ? '#2ecc71' : '#e74c3c';
        ctx.lineWidth = 2 / state.camera.zoom;
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, width * TILE_SIZE, height * TILE_SIZE);
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, width * TILE_SIZE, height * TILE_SIZE);
    }

    if (state.isDown && state.dragStart && state.pointerTile) {
        let box = null;
        let valid = true;
        if (state.activeTool === 'road' || state.activeTool === 'path') {
            const x = Math.min(state.dragStart.x, state.pointerTile.x);
            const y = Math.min(state.dragStart.y, state.pointerTile.y);
            const w = Math.abs(state.pointerTile.x - state.dragStart.x) + 1;
            const h = Math.abs(state.pointerTile.y - state.dragStart.y) + 1;
            box = {x, y, w, h};
            valid = x >= 0 && y >= 0 && x + w <= GRID_W && y + h <= GRID_H &&
                Array.from({length: h}, (_, row) => Array.from({length: w}, (_, column) =>
                    getTileProperties(x + column, y + row).buildable).every(Boolean)).every(Boolean);
        } else if (state.activeTool.startsWith('build_') && state.activeTool !== 'build_tree') {
            const type = state.activeTool.slice('build_'.length);
            const building = FACILITY_BUILDINGS[type];
            if (building) {
                box = {...state.pointerTile, ...building};
                valid = isFootprintAvailable(box.x, box.y, box.w, box.h);
            }
        } else if (state.activeTool === 'build_tree') {
            box = {...state.pointerTile, w: 1, h: 1};
            valid = isFootprintAvailable(box.x, box.y, 1, 1);
        } else if (state.activeTool.startsWith('utility_')) {
            const validation = GameRulesApi.validateUtilityLine(state.dragStart,
                state.pointerTile, state.tiles, state.activeTool.slice('utility_'.length));
            valid = validation.valid;
            if (validation.tiles.length) box = getTileBounds(validation.tiles);
        } else if (state.activeTool.startsWith('buy_')) {
            const pitch = state.pitches.find(item => state.pointerTile.x >= item.x &&
                state.pointerTile.x < item.x + item.w && state.pointerTile.y >= item.y &&
                state.pointerTile.y < item.y + item.h);
            if (pitch) box = pitch;
            valid = Boolean(pitch && !pitch.occupied && !isFootprintUnderConstruction(pitch));
        }
        if (box) {
            ctx.fillStyle = valid ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.24)';
            ctx.strokeStyle = valid ? '#2ecc71' : '#e74c3c';
            ctx.lineWidth = 2 / state.camera.zoom;
            ctx.fillRect(box.x * TILE_SIZE, box.y * TILE_SIZE, box.w * TILE_SIZE, box.h * TILE_SIZE);
            ctx.strokeRect(box.x * TILE_SIZE, box.y * TILE_SIZE, box.w * TILE_SIZE, box.h * TILE_SIZE);
        }
    }

    // Placed-object layer
    state.facilities.forEach(f => {
        const px = f.x*TILE_SIZE; const py = f.y*TILE_SIZE;
        const facilityColors = {
                toilets: ['#bdc3c7', '#2980b9'], showers: ['#aed6f1', '#2874a6'],
                laundry: ['#d5f5e3', '#239b56'], shop: ['#f5cba7', '#d35400'],
            playground: ['#82e0aa', '#27ae60'], pub: ['#d7bde2', '#6c3483'],
            restaurant: ['#f9e79f', '#b7950b'], arcade: ['#85c1e9', '#2471a3'],
            entertainment_space: ['#f5b7b1', '#c0392b'], pool: ['#76d7c4', '#148f77'],
            activity_centre: ['#a9dfbf', '#1e8449'], entertainment_hub: ['#d2b4de', '#512e5f']
        };
        const [wallColor, roofColor] = facilityColors[f.type] || [PALETTE.fac_wall, PALETTE.fac_roof];
        const hasArtwork = drawAsset(`facility.${f.type}`, px, py,
            f.w * TILE_SIZE, f.h * TILE_SIZE, () => {
                ctx.fillStyle = wallColor; ctx.fillRect(px, py, f.w*TILE_SIZE, f.h*TILE_SIZE);
                ctx.fillStyle = roofColor; ctx.fillRect(px-2, py, (f.w*TILE_SIZE)+4, 4);
            });
        if (!hasArtwork) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = '8px Arial';
            ctx.fillText(f.type.toUpperCase(), px+4, py+14);
        }
    });

    state.constructions.forEach(job => {
        const {x, y, w, h} = job.footprint;
        ctx.fillStyle = 'rgba(230, 126, 34, 0.2)';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1,
            w * TILE_SIZE - 2, h * TILE_SIZE - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = '#fff2d8';
        ctx.font = 'bold 7px Arial';
        ctx.fillText('BUILDING', x * TILE_SIZE + 3, y * TILE_SIZE + 10);
    });

    state.pitches.filter(pitch => pitch.decking).forEach(pitch => {
        const {x, y, w, h} = StaticCaravans.getDeckingFootprint(pitch);
        ctx.fillStyle = pitch.decking.operational === false ? '#62584d' : '#a67c52';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
        ctx.strokeStyle = '#3e3024';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, w * TILE_SIZE, h * TILE_SIZE);
        ctx.fillStyle = '#f3e5d0';
        ctx.font = 'bold 7px Arial';
        ctx.fillText(pitch.decking.operational === false ? 'DECK · WORN OUT' : 'DECK',
            x * TILE_SIZE + 3, y * TILE_SIZE + 9);
    });

    state.caravans.forEach(c => {
        const footprint = StaticCaravans.getStaticFootprint(c.pitch);
        const px = footprint.x * TILE_SIZE + 2;
        const py = footprint.y * TILE_SIZE + 2;
        const pw = footprint.w * TILE_SIZE - 4;
        const ph = footprint.h * TILE_SIZE - 4;
        
        drawAsset('accommodation.static',
            px, py, pw, ph, () => {
                ctx.fillStyle = '#ded495';
                ctx.fillRect(px, py, pw, ph);
                ctx.strokeStyle = '#000'; ctx.lineWidth=1; ctx.strokeRect(px, py, pw, ph);
                // Windows
                ctx.fillStyle = '#85c1e9'; ctx.fillRect(px+4, py+2, pw-8, 6);
            });
        ctx.fillStyle = '#795548';
        ctx.fillRect(px + pw / 2 - 3, py + ph - 8, 6, 8);
        if (c.isBroken) { ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(px+pw/2, py+ph/2, 4, 0, Math.PI*2); ctx.fill(); }
    });

    state.pitches.forEach(pitch => (pitch.accessories || []).forEach(accessory => {
        const palette = {
            bbq: '#424949',
            patio: '#8e6e53',
            firepit: '#d35400',
            hot_tub: '#2874a6'
        };
        const x = accessory.x * TILE_SIZE + 2;
        const y = accessory.y * TILE_SIZE + 2;
        const w = accessory.w * TILE_SIZE - 4;
        const h = accessory.h * TILE_SIZE - 4;
        ctx.fillStyle = palette[accessory.type] || '#7f8c8d';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#17232d';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 7px Arial';
        ctx.fillText(accessory.type === 'hot_tub' ? 'TUB' : accessory.type.toUpperCase(),
            x + 2, y + 9);
    }));

    // Guest accommodation and residents
    state.guests.forEach(guest => {
        const pitch = guest.pitch;
        const px = pitch.x * TILE_SIZE;
        const py = pitch.y * TILE_SIZE;
        const width = pitch.w * TILE_SIZE;
        const height = pitch.h * TILE_SIZE;
        if (guest.accommodation === 'tent') {
            drawAsset('accommodation.tent', px, py, width, height, () => {
                ctx.fillStyle = '#c9823b';
                ctx.beginPath();
                ctx.moveTo(px + width * 0.2, py + height * 0.58);
                ctx.lineTo(px + width * 0.5, py + height * 0.2);
                ctx.lineTo(px + width * 0.8, py + height * 0.58);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#f2d7a0';
                ctx.fillRect(px + width * 0.47, py + height * 0.43, width * 0.06, height * 0.15);
            });
        } else if (guest.accommodation === 'towed') {
            drawAsset(guest.accommodation === 'static' ? 'accommodation.static' : 'accommodation.tin',
                px + width * 0.16, py + height * 0.24, width * 0.68, height * 0.42, () => {
                    ctx.fillStyle = guest.accommodation === 'static' ? '#ded495' : '#d8cfbe';
                    ctx.fillRect(px + width * 0.16, py + height * 0.24, width * 0.68, height * 0.42);
                    ctx.strokeStyle = '#1a252f';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(px + width * 0.16, py + height * 0.24, width * 0.68, height * 0.42);
                    ctx.fillStyle = '#85c1e9';
                    ctx.fillRect(px + width * 0.26, py + height * 0.3, width * 0.16, height * 0.1);
                });
        }
        const residentX = (guest.position?.x ?? (pitch.x + pitch.w / 2)) * TILE_SIZE;
        const residentY = (guest.position?.y ?? (pitch.y + pitch.h / 2)) * TILE_SIZE;
        const members = Array.isArray(guest.party?.members) && guest.party.members.length
            ? guest.party.members
            : [{appearance: CharacterSystem.defaultAvatar()}];
        const offsets = [
            [-0.18, 0], [0.18, 0], [-0.38, 0.22], [0.38, 0.22],
            [-0.18, 0.42], [0.18, 0.42], [-0.42, -0.2], [0.42, -0.2]
        ];
        if (guest.activity !== 'sleeping') {
            members.slice(0, 8).forEach((member, index) => {
                const [offsetX, offsetY] = offsets[index] || [0, 0];
                CharacterSystem.drawCharacter(ctx, member.appearance || CharacterSystem.defaultAvatar(),
                    residentX + offsetX * TILE_SIZE, residentY + offsetY * TILE_SIZE, members.length > 3 ? 0.8 : 0.9);
            });
        }
    });
    const playerX = state.player.x * TILE_SIZE;
    const playerY = state.player.y * TILE_SIZE;
    CharacterSystem.drawCharacter(ctx, state.playerAvatar, playerX, playerY, 1);

    const lighting = getDayNightLighting();
    if (lighting.darkness > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(8, 16, 43, ${lighting.darkness})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    const glowStrength = lighting.darkness / 0.62;
    if (glowStrength > 0) {
        state.caravans.forEach(caravan => {
            const footprint = StaticCaravans.getStaticFootprint(caravan.pitch);
            drawAccommodationGlow(footprint.x, footprint.y + footprint.h, footprint.w, glowStrength);
        });
        state.guests.forEach(guest => {
            if (guest.accommodation === 'tent' || guest.accommodation === 'towed') {
                drawAccommodationGlow(guest.pitch.x, guest.pitch.y + guest.pitch.h,
                    guest.pitch.w, glowStrength);
            }
        });
    }

    ctx.restore();
    requestAnimationFrame(draw);
}

// --- UI & Controls ---
function updateUI() {
    state.beauty = LandManagement.calculateBeauty(state.tiles, state.pitches, state.facilities);
    document.getElementById('cash-display').innerText = Math.floor(state.cash).toLocaleString();
    const woodDisplay = document.getElementById('wood-display');
    if (woodDisplay) woodDisplay.innerText = Math.floor(state.wood).toLocaleString();
    document.getElementById('weather-display').textContent =
        state.weather === 'Rain' ? '🌧️' : '☀️';
    document.getElementById('weather-text').textContent = state.weather;
    const beautyDisplay = document.getElementById('beauty-display');
    if (beautyDisplay) beautyDisplay.innerText = `${state.beauty}%`;
    const shovelButton = document.getElementById('buy-shovel-btn');
    if (shovelButton) {
        shovelButton.disabled = Boolean(state.tools?.shovel);
        shovelButton.innerHTML = state.tools?.shovel
            ? '🪏<span>Shovel · Owned</span>'
            : '🪏<span>Shovel · £350</span>';
    }
    document.getElementById('clock-display').innerText =
        `Day ${state.day}, ${String(state.hour).padStart(2, '0')}:${String(Math.floor(state.minute)).padStart(2, '0')}`;
    const lighting = getDayNightLighting();
    document.getElementById('time-of-day').innerText = `${lighting.icon} ${lighting.phase}`;
    document.getElementById('day-length').value = state.dayLengthMinutes;
    const pauseButton = document.getElementById('pause-toggle');
    if (pauseButton) pauseButton.textContent = state.isPaused ? '▶️ Resume' : '⏸️ Pause';
    document.querySelectorAll('.speed-btn').forEach(button => {
        button.classList.toggle('active', Number(button.dataset.speed) === state.simulationSpeed);
    });
    document.getElementById('day-length-value').innerText = state.dayLengthMinutes;
    document.getElementById('rating-display').innerText = state.rating.toFixed(1);
    document.getElementById('satisfaction-fill').style.width = state.satisfaction + '%';
    const demand = getGuestDemand();
    const demandTrack = document.getElementById('demand-track');
    const demandFill = document.getElementById('demand-fill');
    demandFill.style.width = `${demand.score}%`;
    demandFill.style.backgroundColor = demand.score >= 67 ? '#27ae60' :
        (demand.score >= 34 ? '#f1c40f' : '#e67e22');
    document.getElementById('demand-level').innerText = `${demand.level} ${demand.score}%`;
    demandTrack.setAttribute('aria-valuenow', demand.score);
    const availablePitches = state.pitches.filter(pitch => !pitch.occupied &&
        !pitch.constructionReserved && !pitch.deliveryReserved && !pitch.replacementReserved).length;
    const demandCapacity = document.getElementById('demand-capacity');
    demandCapacity.innerText = state.pitches.length === 0
        ? 'No pitches — guests cannot stay'
        : availablePitches === 0
            ? 'No vacancies — demand unserved'
            : `${availablePitches} pitch${availablePitches === 1 ? '' : 'es'} available`;

    const ins = document.getElementById('inspector');
    const actionButtons = [
        document.getElementById('btn-repair'),
        document.getElementById('btn-upgrade'),
        document.getElementById('btn-skirting'),
        document.getElementById('btn-sell')
    ];
    const facilityToggle = document.getElementById('btn-facility-toggle');
    const toiletCleanButton = document.getElementById('btn-clean-toilets');
    const toiletRepairButton = document.getElementById('btn-repair-facility');
    [toiletCleanButton, toiletRepairButton].forEach(button => {
        if (button) { button.style.display = 'none'; button.disabled = true; }
    });
    const groundsStaffButton = document.getElementById('hire-grounds-staff-btn');
    if (groundsStaffButton) {
        const unlocked = state.facilities.length >= 4 && state.pitches.length >= 6;
        groundsStaffButton.disabled = state.groundsStaff > 0 ? false : (!unlocked || state.cash < 250);
        groundsStaffButton.innerHTML = state.groundsStaff > 0
            ? '🌿<span>Dismiss grounds staff</span>'
            : unlocked ? '🌿<span>Hire grounds staff · £250 + £1/hour</span>'
                : '🌿<span>Grounds staff · Unlock at 4 facilities / 6 pitches</span>';
    }
    const handymanButton = document.getElementById('book-handyman-btn');
    if (handymanButton) {
        const maintenanceNeeded = state.caravans.some(caravan => caravan.isBroken) ||
            state.facilities.some(facility => facility.type === 'toilets' &&
                (facility.maintenanceClosed || Number(facility.cleanliness ?? 100) < 50 || Number(facility.wear ?? 100) < 50));
        handymanButton.style.display = maintenanceNeeded || state.handymanContractHoursRemaining > 0 ? 'flex' : 'none';
        handymanButton.disabled = state.handymanContractHoursRemaining > 0 || state.cash < 100;
        handymanButton.innerHTML = state.handymanContractHoursRemaining > 0
            ? '🛠️<span>Handyman booked · ' + escapeHtml(state.handymanContractHoursRemaining) + 'h left</span>'
            : '🛠️<span>Book handyman · £100/day</span>';
    }
    if (state.selectedEntity) {
        ins.style.display = 'block';
        const c = state.selectedEntity;
        const selectedIsVan = state.caravans.includes(c) || Boolean(StaticCaravans.getModel(c.modelId));
        if (!selectedIsVan && typeof c.type === 'string') {
            document.getElementById('ins-name').innerText =
                `${c.type.replaceAll('_', ' ')} facility`;
            const isToiletBlock = c.type === 'toilets';
            const cleanliness = Math.max(0, Math.min(100, Number(c.cleanliness ?? 100)));
            const wear = Math.max(0, Math.min(100, Number(c.wear ?? 100)));
            const activeTask = state.maintenanceTask && state.maintenanceTask.facilityIndex === state.facilities.indexOf(c)
                ? state.maintenanceTask : null;
            document.getElementById('ins-content').innerHTML =
                `Status: ${escapeHtml(c.isOperational === false ? (c.maintenanceClosed ? 'Closed — needs maintenance' : 'Closed') : 'Operational')}<br>` +
                `Capacity: ${escapeHtml(c.capacity)} guests/hour<br>` +
                `Hourly operating cost: £${escapeHtml(c.hourlyCost)}<br>` +
                `Current usage: ${escapeHtml(c.hourlyUsage || 0)}/${escapeHtml(c.capacity)}` +
                (isToiletBlock ?
                    `<br><br><strong>Cleanliness · ${escapeHtml(Math.round(cleanliness))}%</strong>` +
                    `<div class="condition-track" role="meter" aria-label="Toilet cleanliness" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${escapeHtml(Math.round(cleanliness))}"><div class="condition-fill" style="width:${escapeHtml(cleanliness)}%;background:#27ae60"></div></div>` +
                    `<strong>Wear and tear · ${escapeHtml(Math.round(wear))}%</strong>` +
                    `<div class="condition-track" role="meter" aria-label="Toilet block wear and tear" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${escapeHtml(Math.round(wear))}"><div class="condition-fill" style="width:${escapeHtml(wear)}%;background:#e67e22"></div></div>` +
                    (activeTask ? `<br>Work in progress: ${activeTask.action === 'clean' ? 'Cleaning' : 'Repairing'} · ${escapeHtml(activeTask.hoursRemaining)} in-game hour(s) left` : '')
                    : '') +
                (ParkServices.ENTERTAINMENT_TYPES.includes(c.type)
                    ? `<br>Park-wide entertainment capacity: ${escapeHtml(ParkServices.getEntertainmentCapacity(state))}`
                    : '');
            actionButtons.forEach(button => {
                button.style.display = 'none';
                button.disabled = true;
            });
            if (isToiletBlock) {
                const cleaningCost = FacilityOperations.getMaintenanceCost('clean', cleanliness);
                const repairCost = FacilityOperations.getMaintenanceCost('repair', wear);
                toiletCleanButton.style.display = 'block';
                toiletRepairButton.style.display = 'block';
                toiletCleanButton.disabled = cleanliness >= 100 || Boolean(state.maintenanceTask) || state.cash < cleaningCost;
                toiletRepairButton.disabled = wear >= 100 || Boolean(state.maintenanceTask) || state.cash < repairCost;
                toiletCleanButton.textContent = cleanliness >= 100 ? '🧹 Already clean' : '🧹 Clean · £' + cleaningCost + ' · 2 in-game hours';
                toiletRepairButton.textContent = wear >= 100 ? '🔧 No repairs needed' : '🔧 Repair · £' + repairCost + ' · 3 in-game hours';
            }
            facilityToggle.style.display = 'block';
            facilityToggle.textContent = c.isOperational === false
                ? '▶️ Reopen facility'
                : '⏸️ Close facility';
            facilityToggle.disabled = false;
            return;
        }
        facilityToggle.style.display = 'none';
        const hookups = getPitchHookups(c.pitch);
        const hookupStatus = UTILITY_TYPES.map(type =>
            `${escapeHtml(type)}: ${hookups[type] ? 'connected' : 'not connected'}`).join('<br>');
        const model = StaticCaravans.getModel(c.modelId);
        const ageDays = Math.floor(StaticCaravans.calculateAgeDays(
            c, StaticCaravans.gameTimeMinutes(state)
        ));
        const decking = c.pitch.decking;
        const deckingAgeDays = decking
            ? Math.max(0, (StaticCaravans.gameTimeMinutes(state) -
                decking.installedAtMinutes) / 1440)
            : 0;
        const deckingText = decking
            ? `<br>Decking: ${escapeHtml(Math.round(decking.condition))}% condition · ${decking.operational === false ? 'end of life; replacement required' : `${escapeHtml(Math.max(0, Math.floor(StaticCaravans.DECKING.lifespanDays - deckingAgeDays)))} day(s) remaining`}`
            : '<br>Decking: not installed';
        document.getElementById('ins-name').innerText = model?.name || 'Static caravan';
        document.getElementById('ins-content').innerHTML =
            `Tier: ${escapeHtml(model?.tierName || c.tier)} · ${escapeHtml(c.bedrooms)} bedroom(s) · maximum ${escapeHtml(StaticCaravans.getMaximumOccupancy(c))} people` +
            `<br>Interior: ${escapeHtml(model?.interiorQuality || 'legacy')} · Condition: ${escapeHtml(Math.floor(c.condition))}%` +
            `<br>Age: ${escapeHtml(ageDays)} in-game day(s) · Purchase price: £${escapeHtml(c.purchasePrice.toLocaleString())}` +
            `<br>Rent: £${escapeHtml(c.getDailyRent())}/day · Status: ${escapeHtml(c.isBroken ? '⚠️ BROKEN' : c.isOperational === false ? 'Out of service' : 'Operational')}` +
            `<br>Rental: ${escapeHtml(c.isRentalReady() ? 'Ready' : 'Needs connected hookups or repair')}<br>${hookupStatus}` +
            deckingText;
        actionButtons.forEach(button => {
            button.style.display = 'block';
        });
        document.getElementById('btn-upgrade').style.display = 'none';
        document.getElementById('btn-repair').disabled = !c.isBroken || state.cash < 40;
        document.getElementById('btn-skirting').disabled = c.hasSkirting || state.cash < 150;
        const saleValue = StaticCaravans.calculateResaleValue(c, StaticCaravans.gameTimeMinutes(state));
        const pitchUnavailable = c.pitch.occupied || c.pitch.deliveryReserved ||
            c.pitch.replacementReserved || c.pitch.constructionReserved;
        document.getElementById('btn-sell').textContent = `💰 Sell · £${saleValue.toLocaleString()}`;
        document.getElementById('btn-sell').disabled = pitchUnavailable;
    } else {
        facilityToggle.style.display = 'none';
        ins.style.display = 'block';
        document.getElementById('ins-name').innerText = 'Park Overview';
        const occupied = state.pitches.filter(pitch => pitch.occupied).length;
        const demand = getGuestDemand();
        const balance = Economy.getSevenDayBalance(state);
        const recentTransactions = state.transactions.slice(-5).reverse().map(transaction =>
            `${escapeHtml(transaction.description)}: ${escapeHtml(transaction.amount < 0 ? '−' : '+')}£${escapeHtml(Math.abs(transaction.amount).toLocaleString())}`
        );
        const parties = state.guests.reduce((sum, guest) =>
            sum + (guest.party?.headcount || 1), 0);
        document.getElementById('ins-content').innerHTML = `Cash: £${escapeHtml(Math.floor(state.cash).toLocaleString())}<br>Occupancy: ${escapeHtml(occupied)}/${escapeHtml(state.pitches.length || 0)}<br>Guests: ${escapeHtml(parties)} people in ${escapeHtml(state.guests.length)} parties<br>Rating: ${escapeHtml(state.rating.toFixed(1))} / 5<br>Demand: ${escapeHtml(demand.level)} (${escapeHtml(demand.score)}%)<br>7-day income: £${escapeHtml(balance.income.toLocaleString())} · expenses: £${escapeHtml(balance.expenses.toLocaleString())} · net: £${escapeHtml(balance.net.toLocaleString())}<br>Ledger: ${escapeHtml(balance.isValid ? '✓ reconciled' : '⚠ balance mismatch')}<br><strong>Recent transactions</strong><br>${recentTransactions.length ? recentTransactions.join('<br>') : 'No transactions yet.'}`;
        actionButtons.forEach(button => {
            button.style.display = 'none';
            button.disabled = true;
        });
    }
}

function setDayLengthMinutes(minutes) {
    state.dayLengthMinutes = Math.min(Math.max(Math.round(minutes), 3), 60);
    document.getElementById('day-length').value = state.dayLengthMinutes;
    document.getElementById('day-length-value').innerText = state.dayLengthMinutes;
    saveGame();
}

function setSimulationSpeed(speed) {
    const nextSpeed = Number(speed);
    if (!Number.isFinite(nextSpeed) || nextSpeed <= 0) return;
    state.simulationSpeed = nextSpeed;
    updateUI();
    saveGame();
}

function togglePauseState() {
    state.isPaused = !state.isPaused;
    updateUI();
    saveGame();
}

function getGuestDemand() {
    return Economy.getGuestDemand(state);
}

function repairSelectedCaravan() {
    const caravan = state.selectedEntity;
    if (!caravan || !caravan.isBroken || !spend(40, 'repairs', 'Repaired caravan')) return;
    caravan.condition = 100;
    caravan.isBroken = false;
    refreshPitchCapabilities();
    saveGame();
    updateUI();
}

function upgradeSelectedCaravan() {
    showToast('Decking is installed through Rusty Resales.');
}

function fitSelectedSkirting() {
    const caravan = state.selectedEntity;
    if (!caravan || caravan.hasSkirting || !spend(150, 'upgrades', 'Added caravan skirting')) return;
    caravan.hasSkirting = true;
    saveGame();
    updateUI();
}

function sellSelectedCaravan() {
    const caravan = state.selectedEntity;
    if (!caravan) return;
    if (caravan.pitch.occupied || caravan.pitch.deliveryReserved ||
        caravan.pitch.replacementReserved || caravan.pitch.constructionReserved) {
        showToast('This static cannot be sold while its pitch is occupied or reserved.');
        return;
    }
    const salePrice = StaticCaravans.calculateResaleValue(
        caravan, StaticCaravans.gameTimeMinutes(state)
    );
    if (!window.confirm(`Sell ${StaticCaravans.getModel(caravan.modelId)?.name || 'static caravan'} for £${salePrice.toLocaleString()}?`)) {
        return;
    }
    if (salePrice > 0 && !recordTransaction(salePrice, 'asset sale', `Sold ${caravan.modelId}`)) return;
    state.caravans = state.caravans.filter(item => item !== caravan);
    state.selectedEntity = null;
    state.interactionTarget = null;
    refreshPitchCapabilities();
    saveGame();
    updateUI();
    showToast(`💰 Unit sold for £${salePrice}.`);
}

function maintainToiletBlocks(cleanlinessGain, wearGain) {
    let capabilitiesChanged = false;
    state.facilities.filter(facility => facility.type === 'toilets').forEach(facility => {
        const wasOperational = FacilityOperations.isFacilityOperational(facility);
        facility.cleanliness = Math.min(100, Number(facility.cleanliness ?? 100) + cleanlinessGain);
        facility.wear = Math.min(100, Number(facility.wear ?? 100) + wearGain);
        FacilityOperations.refreshFacilityOperationalStatus(facility);
        if (wasOperational !== FacilityOperations.isFacilityOperational(facility)) {
            capabilitiesChanged = true;
        }
    });
    return capabilitiesChanged;
}
function advanceMaintenanceTask() {
    const task = state.maintenanceTask;
    if (!task) return false;
    task.hoursRemaining--;
    if (task.hoursRemaining > 0) { saveGame(); return false; }
    const facility = state.facilities[task.facilityIndex];
    const wasOperational = FacilityOperations.isFacilityOperational(facility);
    if (facility?.type === 'toilets') {
        if (task.action === 'clean') facility.cleanliness = Math.min(100, Number(facility.cleanliness ?? 100) + 50);
        else facility.wear = Math.min(100, Number(facility.wear ?? 100) + 50);
        FacilityOperations.refreshFacilityOperationalStatus(facility);
        showToast(task.action === 'clean'
            ? '🧹 Toilet block cleaned. Guests can use it again if it is otherwise serviceable.'
            : '🔧 Toilet block repaired. Check cleanliness as well as wear and tear.');
    } else showToast('Maintenance could not be completed because the toilet block no longer exists.');
    state.maintenanceTask = null;
    saveGame();
    updateUI();
    return wasOperational !== FacilityOperations.isFacilityOperational(facility);
}
function startToiletMaintenance(action) {
    const facility = state.selectedEntity;
    if (!facility || facility.type !== 'toilets' || state.maintenanceTask) return;
    const facilityIndex = state.facilities.indexOf(facility);
    if (facilityIndex < 0) return;
    const condition = action === 'clean' ? Number(facility.cleanliness ?? 100) : Number(facility.wear ?? 100);
    const cost = FacilityOperations.getMaintenanceCost(action, condition);
    if (!Number.isFinite(cost)) return;
    if (!spend(cost, 'maintenance', (action === 'clean' ? 'Cleaned' : 'Repaired') + ' toilet block (condition ' + Math.round(condition) + '%)')) return;
    state.maintenanceTask = {facilityIndex, action, hoursRemaining: action === 'clean' ? 2 : 3, cost, conditionAtStart: condition};
    saveGame();
    updateUI();
    showToast(action === 'clean'
        ? '🧹 Cleaning started for £' + cost + '. This takes 2 in-game hours.'
        : '🔧 Repairs started for £' + cost + '. This takes 3 in-game hours.');
}
function cleanSelectedToiletBlock() {
    const facility = state.selectedEntity;
    if (!facility || facility.type !== 'toilets' || Number(facility.cleanliness ?? 100) >= 100) return;
    startToiletMaintenance('clean');
}
function repairSelectedToiletBlock() {
    const facility = state.selectedEntity;
    if (!facility || facility.type !== 'toilets' || Number(facility.wear ?? 100) >= 100) return;
    startToiletMaintenance('repair');
}
function toggleSelectedFacility() {
    const facility = state.selectedEntity;
    if (!facility || typeof facility.tier === 'number' || typeof facility.type !== 'string') return;
    if (facility.type === 'toilets' && facility.maintenanceClosed) {
        showToast('This toilet block needs cleaning or repair before it can reopen.');
        return;
    }
    facility.isOperational = facility.isOperational === false;
    refreshPitchCapabilities();
    saveGame();
    updateUI();
    showToast(`${facility.type.replaceAll('_', ' ')} ${facility.isOperational ? 'reopened' : 'closed'}.`);
}

function showMenuPanel(panel, btn) {
    document.querySelectorAll('.menu-panel').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.menu-tab').forEach(item => item.classList.remove('active'));
    const panelElement = document.getElementById(`panel-${panel}`);
    if (panelElement) panelElement.classList.add('active');
    if (btn) btn.classList.add('active');
    toggleBuildMenu(true);
}

function toggleBuildMenu(open) {
    const menu = document.getElementById('build-menu');
    if (menu) menu.classList.toggle('collapsed', !open);
}

function setOverlayMode(mode) {
    state.overlayMode = ['none', 'services', 'utilities', 'entertainment'].includes(mode) ? mode : 'none';
    document.querySelectorAll('[data-overlay]').forEach(button =>
        button.classList.toggle('active', button.dataset.overlay === state.overlayMode)
    );
    saveGame();
}

function setTool(t, btn) {
    if (t === 'pitch_gravel' && !state.tools?.shovel) {
        showToast('🔒 Buy the shovel from the Tool Shop to prepare hardstanding.');
        showMenuPanel('shop', document.querySelector('[data-panel="shop"]'));
        return;
    }
    if (t.startsWith('utility_') && !state.tools?.shovel) {
        showToast('🔒 Buy the shovel from the Tool Shop to dig utility trenches.');
        showMenuPanel('shop', document.querySelector('[data-panel="shop"]'));
        return;
    }
    state.activeTool = t;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

function showToast(m) {
    const t = document.getElementById('toast'); t.innerText = m; t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 2000);
}

function buyTool(tool) {
    if (!state.tools) state.tools = {axe: true, shovel: false};
    const catalogue = {
        shovel: {cost: 350, label: 'Shovel', description: 'unlocked hardstanding preparation and utility trenching'}
    };
    const item = catalogue[tool];
    if (!item) return;
    if (state.tools?.[tool]) {
        showToast(`You already own the ${item.label}.`);
        return;
    }
    if (!spend(item.cost, 'tools', `Purchased ${item.label}`)) return;
    state.tools = {...state.tools, axe: true, [tool]: true};
    saveGame();
    updateUI();
    showToast(`🛠️ ${item.label} purchased! You have ${item.description}.`);
}

function sellTimber() {
    const units = Math.floor(state.wood || 0);
    if (units <= 0) {
        showToast('No timber to sell. Fell a few trees first.');
        return;
    }
    const value = LandManagement.getTimberSaleValue(units);
    if (!recordTransaction(value, 'timber sale', `Sold ${units} timber`)) return;
    state.wood -= units;
    saveGame();
    updateUI();
    showToast(`💰 Sold ${units} timber for £${value}.`);
}

function updateTutorialVisibility(visible = true) {
    const screen = document.getElementById('start-screen');
    if (screen) screen.hidden = !visible;
    if (visible) {
        updateAvatarEditor();
        updateVisitorCount();
    }
}

function setStartPanel(panelId) {
    const panelIds = ['avatar-panel', 'controls-panel'];
    const target = document.getElementById(panelId);
    if (!target) return;
    const shouldOpen = target.hidden;
    panelIds.forEach(id => {
        const panel = document.getElementById(id);
        if (panel) panel.hidden = id !== panelId || !shouldOpen;
        const button = document.querySelector(`[aria-controls="${id}"]`);
        if (button) button.setAttribute('aria-expanded', String(id === panelId && shouldOpen));
    });
    if (shouldOpen && panelId === 'avatar-panel') {
        updateAvatarEditor();
        document.getElementById('player-name')?.focus();
    }
}

function closeStartPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) panel.hidden = true;
    const button = document.querySelector(`[aria-controls="${panelId}"]`);
    if (button) button.setAttribute('aria-expanded', 'false');
}

function getAvatarFromEditor() {
    const value = id => document.getElementById(id)?.value;
    return CharacterSystem.normalizeAvatar({
        name: (value('player-name') || 'Park Manager').trim() || 'Park Manager',
        skin: value('avatar-skin'),
        hairStyle: value('avatar-hair-style'),
        hairColour: value('avatar-hair-colour'),
        top: value('avatar-top'),
        bottom: value('avatar-bottom'),
        accessory: value('avatar-accessory')
    });
}

function renderAvatarPreview() {
    const preview = document.getElementById('avatar-preview');
    if (!preview || !CharacterSystem) return;
    const previewContext = preview.getContext('2d');
    previewContext.clearRect(0, 0, preview.width, preview.height);
    CharacterSystem.drawCharacter(previewContext, getAvatarFromEditor(), 48, 59, 4);
}

function updateAvatarEditor() {
    const avatar = CharacterSystem.normalizeAvatar(state.playerAvatar || CharacterSystem.defaultAvatar());
    const fields = {
        'player-name': avatar.name,
        'avatar-skin': avatar.skin,
        'avatar-hair-style': avatar.hairStyle,
        'avatar-hair-colour': avatar.hairColour,
        'avatar-top': avatar.top,
        'avatar-bottom': avatar.bottom,
        'avatar-accessory': avatar.accessory
    };
    Object.entries(fields).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = value;
    });
    renderAvatarPreview();
}

function updateVisitorCount() {
    const count = document.getElementById('visitor-count');
    if (count) {
        const total = Array.isArray(state.guestProfilePool) ? state.guestProfilePool.length : 0;
        count.textContent = total
            ? `${total} guest profiles ready. People appear in the world only after their booking is accepted.`
            : 'Guest appearances will be generated automatically when bookings are accepted.';
    }
}

function randomizePlayerAvatar() {
    const avatar = CharacterSystem.randomizeAvatar(getAvatarFromEditor());
    const fields = {
        'avatar-skin': avatar.skin,
        'avatar-hair-style': avatar.hairStyle,
        'avatar-hair-colour': avatar.hairColour,
        'avatar-top': avatar.top,
        'avatar-bottom': avatar.bottom,
        'avatar-accessory': avatar.accessory
    };
    Object.entries(fields).forEach(([id, value]) => { document.getElementById(id).value = value; });
    renderAvatarPreview();
}

function randomizeStartingNpcs() {
    state.guestProfilePool = CharacterSystem.createGuestRoster(12);
    updateVisitorCount();
}

function startNewGame() {
    state.playerAvatar = getAvatarFromEditor();
    state.isPaused = false;
    updateTutorialVisibility(false);
    saveGame();
    updateUI();
}

function hireHandyman() {
    if (state.handymanContractHoursRemaining > 0) {
        showToast('A handyman is already booked for today.');
        return;
    }
    if (spend(100, 'contractor', 'Booked handyman for one day')) {
        state.handymanContractHoursRemaining = 24;
        saveGame();
        updateUI();
        showToast('🛠️ Handyman booked for 24 in-game hours. Repairs are covered during the visit.');
    }
}
function hireGroundsStaff() {
    if (state.groundsStaff > 0) {
        state.groundsStaff = 0;
        saveGame();
        updateUI();
        showToast('🌿 Grounds staff dismissed. Their hourly wages have stopped.');
        return;
    }
    if (!(state.facilities.length >= 4 && state.pitches.length >= 6)) {
        showToast('Grounds staff become available once the park has 4 facilities and 6 pitches.');
        return;
    }
    if (spend(250, 'staff', 'Hired grounds staff')) {
        state.groundsStaff = 1;
        saveGame();
        updateUI();
        showToast('🌿 Grounds staff hired. They clean and maintain toilet blocks for £1 per in-game hour. Use the same button to dismiss them.');
    }
}

function resetGame() {
    if(confirm("Clear park and start over?")) {
        localStorage.removeItem('caravan_tycoon_save');
        location.reload();
    }
}

// Input Handlers
function gridFromPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const worldX = (clientX - rect.left - state.camera.x) / state.camera.zoom;
    const worldY = (clientY - rect.top - state.camera.y) / state.camera.zoom;
    return {x: Math.floor(worldX / TILE_SIZE), y: Math.floor(worldY / TILE_SIZE)};
}

canvas.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    if (!document.getElementById('start-screen').hidden ||
        !document.getElementById('sleep-prompt').hidden || state.sleeping) return;
    state.isDown = true;
    state.buildingDrag = state.activeTool !== 'select';
    state.lastM = {x: event.clientX, y: event.clientY};
    state.dragStart = gridFromPointer(event.clientX, event.clientY);
    state.pointerTile = state.dragStart;
});
window.addEventListener('keydown', e => {
    if (!document.getElementById('start-screen').hidden) return;
    const key = e.key.toLowerCase();
    const vendorDialog = document.getElementById('vendor-dialog');
    if (!vendorDialog.hidden) {
        if (key === 'escape') closeVendor();
        return;
    }
    if (!document.getElementById('sleep-prompt').hidden) {
        if (key === 'escape') dismissSleepPrompt();
        return;
    }
    if (state.sleeping) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        pressedKeys.add(key);
    } else if (key === 'e' && !e.repeat) {
        interactNearby();
    } else if (key === ' ' && !e.repeat) {
        togglePauseState();
    }
});
window.addEventListener('keyup', e => pressedKeys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => {
    pressedKeys.clear();
    state.isDown = false;
    state.buildingDrag = false;
    state.dragStart = null;
});
window.addEventListener('beforeunload', saveGame);
window.addEventListener('mouseup', e => {
    if (!document.getElementById('sleep-prompt').hidden || state.sleeping) {
        state.isDown = false;
        return;
    }
    if (state.isDown) {
        const end = gridFromPointer(e.clientX, e.clientY);
        state.pointerTile = end;
        if (state.buildingDrag) {
            handleBuildDrag(state.dragStart, end);
        } else if (Math.hypot(e.clientX - state.lastM.x, e.clientY - state.lastM.y) < 5) {
            handleGridClick(end.x, end.y);
        }
    }
    state.isDown = false;
    state.buildingDrag = false;
    state.dragStart = null;
});
window.addEventListener('mousemove', e => {
    state.pointerTile = gridFromPointer(e.clientX, e.clientY);
});
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    state.camera.zoom = Math.min(Math.max(state.camera.zoom * delta, 2.6), 4);
});

// Start
window.onload = () => {
    document.getElementById('start-game').addEventListener('click', startNewGame);
    document.getElementById('randomize-avatar').addEventListener('click', randomizePlayerAvatar);
    document.getElementById('randomize-npcs').addEventListener('click', randomizeStartingNpcs);
    document.getElementById('open-avatar-creator').addEventListener('click', () => setStartPanel('avatar-panel'));
    document.getElementById('open-controls').addEventListener('click', () => setStartPanel('controls-panel'));
    document.querySelectorAll('[data-close-panel]').forEach(button =>
        button.addEventListener('click', () => closeStartPanel(button.dataset.closePanel)));
    ['player-name', 'avatar-skin', 'avatar-hair-style', 'avatar-hair-colour', 'avatar-top', 'avatar-bottom', 'avatar-accessory']
        .forEach(id => document.getElementById(id).addEventListener('input', renderAvatarPreview));
    document.getElementById('sleep-confirm').addEventListener('click', sleepThroughNight);
    document.getElementById('sleep-cancel').addEventListener('click', dismissSleepPrompt);
    document.getElementById('vendor-close').addEventListener('click', closeVendor);
    document.getElementById('vendor-content').addEventListener('change', event => {
        if (event.target.id === 'rusty-pitch') renderRustyResales(event.target.value);
    });
    document.getElementById('vendor-content').addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.vendorBuy) {
            const pitch = state.pitches.find(item =>
                item.id === document.getElementById('rusty-pitch')?.value
            );
            const model = StaticCaravans.getModel(button.dataset.vendorBuy);
            if (!pitch || !model) {
                showToast('❌ Select an eligible pitch and static model.');
                return;
            }
            const oldVan = StaticCaravans.findInstalledVan(state, pitch);
            const tradeIn = oldVan
                ? StaticCaravans.calculateResaleValue(oldVan, StaticCaravans.gameTimeMinutes(state))
                : 0;
            const netCost = model.purchasePrice - tradeIn;
            const confirmation =
                `Purchase ${model.name} for £${model.purchasePrice.toLocaleString()}?` +
                (oldVan ? `\nTrade-in credit: £${tradeIn.toLocaleString()}.` : '') +
                `\nNet ${netCost < 0 ? 'credit' : 'cost'}: £${Math.abs(netCost).toLocaleString()}.` +
                `\nDelivery expected ${formatGameTime(StaticCaravans.scheduleDelivery(state))}.`;
            if (!window.confirm(confirmation)) return;
            const result = StaticCaravans.queuePurchase(state, pitch, model.id,
                (amount, category, description) => recordTransaction(amount, category, description));
            if (!result.ok) {
                showToast(`❌ ${result.reason}`);
                renderRustyResales(pitch.id);
                return;
            }
            refreshPitchCapabilities();
            saveGame();
            updateUI();
            renderRustyResales(pitch.id);
            showToast(`✅ ${model.name} ordered. Delivery expected ${formatGameTime(result.order.deliveryAtMinutes)}.`);
            return;
        }
        if (button.dataset.installDecking) {
            const pitch = state.pitches.find(item => item.id === button.dataset.installDecking);
            if (!pitch || !window.confirm(
                `Install decking on pitch ${pitch?.id || ''} for £${StaticCaravans.DECKING.price.toLocaleString()}?`
            )) return;
            const result = StaticCaravans.installDecking(
                state, pitch, (amount, category, description) =>
                    recordTransaction(amount, category, description)
            );
            if (!result.ok) {
                showToast(`❌ ${result.reason}`);
                renderRustyResales(pitch?.id);
                return;
            }
            saveGame();
            updateUI();
            renderRustyResales(pitch.id);
            showToast(`✅ Decking installed. Its ${StaticCaravans.DECKING.lifespanDays.toLocaleString()}-day lifespan has started.`);
            return;
        }
        if (button.dataset.buyAccessory) {
            const item = StaticCaravans.ACCESSORIES[button.dataset.buyAccessory];
            if (!item || !window.confirm(`Buy ${item.name} for £${item.price.toLocaleString()}?`)) return;
            const result = StaticCaravans.purchaseAccessory(
                state, item.id, (amount, category, description) =>
                    recordTransaction(amount, category, description)
            );
            if (!result.ok) {
                showToast(`❌ ${result.reason}`);
                return;
            }
            saveGame();
            closeVendor();
            setTool(`place_accessory_${item.id}`);
            showToast(`${item.name} purchased. Click a tile inside an eligible pitch to place it.`);
            updateUI();
        }
    });
    document.getElementById('btn-repair').addEventListener('click', repairSelectedCaravan);
    document.getElementById('btn-upgrade').addEventListener('click', upgradeSelectedCaravan);
    document.getElementById('btn-skirting').addEventListener('click', fitSelectedSkirting);
    document.getElementById('btn-sell').addEventListener('click', sellSelectedCaravan);
    document.getElementById('btn-facility-toggle').addEventListener('click', toggleSelectedFacility);
    document.getElementById('pause-toggle').addEventListener('click', togglePauseState);
    document.querySelectorAll('.speed-btn').forEach(button => button.addEventListener('click', () => {
        setSimulationSpeed(Number(button.dataset.speed));
    }));
    document.getElementById('day-length').addEventListener('input', event => {
        setDayLengthMinutes(Number(event.target.value));
    });
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    init();
    draw();
    setInterval(() => update(1), 100);
};
