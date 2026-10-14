/** AUDIO ENGINE **/
const AudioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(freq, type, duration) {
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
const GuestActivities = window.GuestActivities;
const GameRulesApi = window.GameRules;
const LandManagement = window.LandManagement;

const PALETTE = {
    grass: ['#556b2f', '#5c7433', '#4d612a'],
    road: '#34495e',
    path: '#9b8b72',
    water: '#2980b9',
    fac_wall: '#bdc3c7',
    fac_roof: '#c0392b',
    tree: '#1e8449'
};

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
    guests: [],
    guestArrivalProgress: 0,
    dailyGuestArrivals: 0,
    facilities: [],
    vehicles: [],
    handymen: 0,
    camera: { x: 100, y: 100, zoom: 3 },
    activeTool: 'select',
    overlayMode: 'none',
    selectedEntity: null,
    player: {x: 5.5, y: 10.5},
    playerPath: [],
    interactionTarget: null
};
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
            (caravan.tier === 1 || caravan.tier === 2)) ||
        (data.facilities !== undefined && (!Array.isArray(data.facilities) ||
            !data.facilities.every(facility => facility &&
                ['x', 'y', 'w', 'h'].every(key => Number.isFinite(facility[key])))))) {
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
    state.facilities = state.facilities.filter(facility => {
        if (facility.type !== 'tree') return true;
        const tile = state.tiles[facility.y]?.[facility.x];
        if (tile && tile.terrain === 'grass' && tile.nature !== 'tree') {
            tile.nature = 'tree';
        }
        return false;
    });
    state.handymen = Number.isFinite(data.handymen) ? data.handymen : 0;
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
    state.satisfaction = Number.isFinite(data.satisfaction) ? data.satisfaction : state.satisfaction;
    state.rating = Number.isFinite(data.rating) ? data.rating : state.rating;
    state.weather = typeof data.weather === 'string' ? data.weather : state.weather;
    if (data.camera && Number.isFinite(data.camera.x) && Number.isFinite(data.camera.y) &&
        Number.isFinite(data.camera.zoom)) {
        state.camera = {...state.camera, ...data.camera};
    }
    state.caravans = data.caravans.map(savedCaravan => {
        const pitchIndex = Number.isInteger(savedCaravan.pitchIndex)
            ? savedCaravan.pitchIndex
            : state.pitches.findIndex(pitch => savedCaravan.pitch && pitch.x === savedCaravan.pitch.x &&
                pitch.y === savedCaravan.pitch?.y && pitch.w === savedCaravan.pitch?.w &&
                pitch.h === savedCaravan.pitch?.h);
        const pitch = state.pitches[pitchIndex];
        pitch.occupied = true;
        const caravan = Object.assign(new Caravan(pitch, savedCaravan.tier), savedCaravan, {pitch});
        caravan.smokeParticles = [];
        return caravan;
    });
    const occupiedGuestPitches = new Set();
    state.guests = (Array.isArray(data.guests) ? data.guests : []).flatMap(guest => {
        const pitch = state.pitches[guest.pitchIndex];
        if (!pitch || pitch.occupied || occupiedGuestPitches.has(guest.pitchIndex) ||
            !isGuestAccommodationValid(pitch, guest.accommodation)) return [];
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
            position: guest.position || {x: pitch.x + pitch.w / 2, y: pitch.y + pitch.h / 2},
            path: Array.isArray(guest.path) ? guest.path : [],
            ratingAtArrival,
            stayDaysRemaining,
            totalIncome: Number.isFinite(guest.totalIncome) ? guest.totalIncome : 0,
            dailyIncome: Number.isFinite(guest.dailyIncome)
                ? guest.dailyIncome
                : getGuestDailyIncome(ratingAtArrival)
        };
        pitch.occupied = true;
        occupiedGuestPitches.add(guest.pitchIndex);
        return [restoredGuest];
    });
    if (data.player && Number.isFinite(data.player.x) && Number.isFinite(data.player.y) &&
        canOccupyPlayer(data.player.x, data.player.y)) {
        state.player = {...data.player};
    }
    state.playerPath = [];
    state.interactionTarget = null;
}

function generateNewMap() {
    state.wood = 0;
    state.pitches = [];
    state.caravans = [];
    state.guests = [];
    state.facilities = [];
    state.player = {x: 5.5, y: 10.5};
    for (let y = 0; y < GRID_H; y++) {
        state.tiles[y] = [];
        for (let x = 0; x < GRID_W; x++) {
            const terrain = Math.hypot(x - 50, y - 10) < 5 ? 'water' : 'grass';
            const road = terrain === 'grass' && y >= 18 && y <= 20 && x < 25;
            const roll = Math.abs((x * 73 + y * 37 + x * y * 11 + 19) % 100);
            const safeStart = x >= 3 && x <= 9 && y >= 7 && y <= 13;
            const overgrownCore = x >= 10 && x <= 43 && y >= 5 && y <= 35;
            let nature = null;
            if (terrain === 'grass' && !road && !safeStart) {
                if (roll < (overgrownCore ? 29 : 15)) nature = 'tree';
                else if (roll < (overgrownCore ? 42 : 26)) nature = 'debris';
            }
            state.tiles[y][x] = {
                terrain,
                nature,
                road,
                path: false,
                utilities: createEmptyUtilities()
            };
        }
    }
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
    if (!tile || typeof tile !== 'object') return false;
    if (tile.terrain === undefined) {
        return ['grass', 'road', 'water'].includes(tile.type);
    }
    return ['grass', 'water'].includes(tile.terrain) &&
        (tile.nature === null || tile.nature === undefined ||
            ['tree', 'debris'].includes(tile.nature)) &&
        (tile.road === undefined || typeof tile.road === 'boolean') &&
        (tile.path === undefined || typeof tile.path === 'boolean') &&
        (tile.utilities === undefined || (tile.utilities && typeof tile.utilities === 'object' &&
            UTILITY_TYPES.every(type => tile.utilities[type] === undefined ||
                typeof tile.utilities[type] === 'boolean')));
}

function isGuestAccommodationValid(pitch, accommodation) {
    return GameRulesApi.isGuestAccommodationValid(pitch, accommodation, state.tiles);
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
    if (target.kind === 'guest') {
        showToast(`${target.entity.party?.type || 'Guest'} party (${target.entity.party?.headcount || 1}) · ${target.entity.activity || 'relaxing'} · £${target.entity.totalIncome} paid · ${target.entity.stayDaysRemaining} day${target.entity.stayDaysRemaining === 1 ? '' : 's'} left`);
        return;
    }
    if (target.kind === 'pitch') {
        showToast(`Empty ${target.entity.type} pitch`);
    }
}

function interactNearby() {
    const target = state.interactionTarget &&
        distanceToTarget(state.interactionTarget) <= 1.25
        ? state.interactionTarget
        : [...state.caravans.map(entity => ({kind: 'caravan', entity, ...entity.pitch})),
            ...state.guests.map(entity => ({kind: 'guest', entity, ...entity.pitch})),
            ...state.facilities.map(entity => ({kind: 'facility', entity, ...entity})),
            ...state.tiles.flatMap((row, y) => row.map((tile, x) =>
                tile.nature === 'tree' || tile.nature === 'debris'
                    ? {kind: tile.nature, entity: tile, x, y, w: 1, h: 1}
                    : null).filter(Boolean)),
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
    let message = 'WASD / Arrows: Move · Click ground: Walk · Click overgrowth, approach, then E to clear';
    if (target && distanceToTarget(target) <= 1.25) {
        message = target.kind === 'tree' ? 'Press E to fell tree and collect timber'
            : target.kind === 'debris' ? 'Press E to clear brush and debris'
            : 'Press E to interact';
    } else if (target) {
        message = target.kind === 'tree' ? 'Approaching tree... · E: Fell when nearby'
            : target.kind === 'debris' ? 'Approaching debris... · E: Clear when nearby'
            : 'Approaching object... · E: Interact when nearby';
    }
    if (hint.innerText !== message) hint.innerText = message;
}

function updatePlayerMovement(deltaSeconds) {
    if (state.buildingDrag) return;
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
                : 10,
            cash: state.cash,
            initialBalance: state.initialBalance,
            wood: state.wood,
            tools: {axe: true, shovel: Boolean(state.tools?.shovel)},
            transactions: state.transactions,
            tiles: state.tiles,
            pitches: state.pitches,
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
            handymen: state.handymen,
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
            guestArrivalProgress: state.guestArrivalProgress,
            dailyGuestArrivals: state.dailyGuestArrivals
        }));
    } catch (error) {
        console.error('Unable to save the game.', error);
        showToast('❌ Unable to save the game.');
    }
}

class Caravan {
    constructor(pitch, tier) {
        this.pitch = pitch;
        this.tier = tier;
        this.condition = 100;
        this.isBroken = false;
        this.hasDecking = false;
        this.hasSkirting = false;
        this.smokeParticles = [];
    }
    getDailyRent() {
        let val = this.tier === 1 ? 75 : 190;
        if (this.hasDecking) val += 40;
        return val;
    }
    isRentalReady() {
        return this.tier === 1 || isPitchReadyForStatic(this.pitch);
    }
}

// --- Game Logic ---
function update(dt) {
    if (SimulationApi && typeof SimulationApi.advanceSimulationState === 'function') {
        SimulationApi.advanceSimulationState(state, dt, { onHourly, onDaily });
    } else {
        if (!state.isPaused) {
            SimulationClock.advanceSimulation(state, dt, {
                onHourly,
                onDaily
            });
        }

        state.caravans.forEach(c => {
            let decay = state.weather === 'Rain' ? 0.02 : 0.005;
            c.condition = Math.max(0, c.condition - decay);
            if (c.condition < 40 && !c.isBroken && Math.random() < 0.001) c.isBroken = true;
        });

        if (!state.isPaused) GuestActivities.updateGuestActivities(state, dt / 10);
        GuestActivities.updateGuestSatisfaction(state);
    }

    updateUI();
}

function onHourly() {
    if (state.handymen > 0) {
        recordTransaction(-(state.handymen * 2), 'wages', 'Handyman hourly wages');
        state.caravans.forEach(c => {
            if (c.isBroken && state.cash > 50) {
                recordTransaction(-40, 'repairs', 'Handyman caravan repair');
                c.isBroken = false;
            }
        });
    }
    FacilityOperations.processHourlyFacilities(state, recordTransaction);
    const candidate = createArrivalCandidate();
    const demand = GuestParties.getDemandProfile(state.day);
    if (Economy.shouldAcceptGuest(state, {
        demandMultiplier: demand.multiplier,
        eligible: Boolean(candidate && FacilityOperations.canHostParty(
            state, candidate.accommodation, candidate.party.headcount
        ).valid && ParkServices.getPitchServiceCheck(
            state, candidate.pitch, candidate.accommodation, candidate.party.headcount
        ).valid)
    })) arriveGuest(candidate);
    saveGame();
}

function createArrivalCandidate() {
    const party = GuestParties.createGuestParty(state.day);
    return GuestParties.selectEligibleBooking(
        state.pitches,
        party,
        pitch => pitch.type === 'grass'
            ? ['tent', 'towed']
            : ['towed', ...(isPitchReadyForStatic(pitch) ? ['static'] : [])],
        (accommodation, headcount, pitch) =>
            FacilityOperations.canHostParty(state, accommodation, headcount).valid &&
            ParkServices.getPitchServiceCheck(state, pitch, accommodation, headcount).valid
    );
}

function arriveGuest(candidate) {
    if (!candidate) return false;
    const {pitch, accommodation, party} = candidate;
    const facilityCheck = FacilityOperations.canHostParty(state, accommodation, party.headcount);
    const serviceCheck = ParkServices.getPitchServiceCheck(state, pitch, accommodation, party.headcount);
    if (!facilityCheck.valid || !serviceCheck.valid) return false;
    const ratingAtArrival = state.rating;
    const stayDaysRemaining = 1 + Math.floor(Math.random() * 14);
    const dailyIncome = getGuestDailyIncome(ratingAtArrival) +
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
        facilityVisits: 0,
        lastFacilityUpdate: -1,
        experienceScore: state.satisfaction,
        lastUtilityReliability: 100
    };
    pitch.occupied = true;
    state.guests.push(guest);
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
        return tile?.terrain === 'grass' && tile.nature !== 'tree' && isFree({x, y}) &&
            !state.facilities.some(facility =>
                x >= facility.x && x < facility.x + facility.w &&
                y >= facility.y && y < facility.y + facility.h
            ) &&
            !state.caravans.some(caravan =>
                x >= caravan.pitch.x && x < caravan.pitch.x + caravan.pitch.w &&
                y >= caravan.pitch.y && y < caravan.pitch.y + caravan.pitch.h
            );
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
            if (tile.terrain === 'grass' && (tile.road || tile.path) && isFree({x, y})) {
                return {x: x + 0.5, y: y + 0.5};
            }
        }
    }
    return {x: pitch.x + pitch.w / 2, y: pitch.y + pitch.h / 2};
}

function onDaily() {
    let income = 0;
    state.caravans.forEach(c => {
        if (!c.isBroken && c.isRentalReady()) income += c.getDailyRent();
    });
    const departingGuests = [];
    state.guests.forEach(guest => {
        guest.stayDaysRemaining--;
        if (guest.stayDaysRemaining <= 0) departingGuests.push(guest);
    });
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
    if (income) recordTransaction(income, 'caravan rental', 'Daily caravan rental income');
    state.dailyGuestArrivals = 0;
    if (income > 0 || departingGuests.length) {
        const notices = [];
        if (income > 0) notices.push(`💰 Daily Revenue: £${income}`);
        if (departingGuests.length) {
            notices.push(`${departingGuests.length} guest${departingGuests.length === 1 ? '' : 's'} checked out`);
        }
        showToast(notices.join(' · '));
    }
    if (income > 0) {
        playSound(880, 'sine', 0.2);
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

    if (state.activeTool === 'road') {
        if (!getTileProperties(gx, gy).buildable) {
            showToast('❌ Roads can only be built on clear, buildable ground.');
        } else if (spend(20, 'construction', 'Built road tile')) {
            tile.road = true;
            saveGame();
        }
    }
    if (state.activeTool === 'path') {
        if (!getTileProperties(gx, gy).buildable) {
            showToast('❌ Paths can only be built on clear, buildable ground.');
        } else if (spend(10, 'construction', 'Built path tile')) {
            tile.path = true;
            saveGame();
        }
    }
    if (state.activeTool.startsWith('utility_')) {
        const utility = state.activeTool.slice('utility_'.length);
        if (!tile.road && !tile.path) {
            showToast('❌ Utility lines can only be laid under a road or path.');
        } else if (tile.utilities[utility]) {
            showToast('That tile already has this utility line.');
        } else if (spend(UTILITY_COSTS[utility], 'construction', `Laid ${utility} utility line`)) {
            tile.utilities[utility] = true;
            saveGame();
            const connectedPitchCount = state.pitches.filter(pitch =>
                getPitchHookups(pitch)[utility]).length;
            if (connectedPitchCount) {
                showToast(`${utility[0].toUpperCase()}${utility.slice(1)} line laid · ${connectedPitchCount} pitch${connectedPitchCount === 1 ? '' : 'es'} connected.`);
            }
        }
    }
    if (state.activeTool === 'pitch_grass') createPitch(gx, gy, 4, 6, 'grass', 100);
    if (state.activeTool === 'pitch_gravel') createPitch(gx, gy, 4, 8, 'gravel', 250);
    
    if (state.activeTool.startsWith('buy_')) {
        const p = state.pitches.find(p => gx >= p.x && gx < p.x+p.w && gy >= p.y && gy < p.y+p.h);
        if (p) {
            const tier = state.activeTool === 'buy_tin' ? 1 : 2;
            const cost = tier === 1 ? 600 : 2000;
            const placement = GameRulesApi.validateAccommodationPlacement(
                p, tier === 1 ? 'towed' : 'static', state.tiles, p.occupied
            );
            if (!placement.valid) {
                showToast(`❌ ${placement.reason}`);
            } else if (spend(cost, 'accommodation', `Purchased tier ${tier} caravan`)) {
                const c = new Caravan(p, tier);
                p.occupied = true;
                state.caravans.push(c);
                playSound(440, 'square', 0.1);
                saveGame();
            }
        } else {
            showToast('❌ There is no pitch under the selected tile.');
        }
    }

    const facilityTool = state.activeTool.startsWith('build_')
        ? state.activeTool.slice('build_'.length)
        : null;
    const facility = facilityTool && FACILITY_BUILDINGS[facilityTool];
    if (facility) {
        placeFacility(gx, gy, facility.w, facility.h, facilityTool, facility.cost);
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
    if (!spend(30, 'construction', 'Planted park tree')) return;
    state.tiles[y][x].nature = 'tree';
    playSound(523, 'sine', 0.1);
    saveGame();
}

function placeFacility(x, y, w, h, type, cost) {
    if (!isFootprintAvailable(x, y, w, h)) {
        showToast('❌ That space is blocked or out of bounds.');
        return;
    }
    if (!spend(cost, 'construction', `Built ${type} facility`)) return;
    state.facilities.push({...FacilityOperations.getFacilityDefaults(type), x, y, w, h, type});
    playSound(523, 'sine', 0.1);
    saveGame();
}

function createPitch(x, y, w, h, type, cost) {
    const pitch = {x, y, w, h, type, occupied: false};
    const result = GameRulesApi.validatePitchPlacement(
        pitch, state.tiles, state.pitches, state.facilities
    );
    if (!result.valid) {
        showToast(`❌ ${result.reason}`);
        return;
    }
    if (!spend(cost, 'construction', `Built ${type} pitch`)) return;
    state.pitches.push(pitch);
    playSound(659, 'sine', 0.1);
    saveGame();
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
    if (!spend(unitCost * added.length, 'construction', `Built ${added.length} ${type} pitch${added.length === 1 ? '' : 'es'}`)) {
        return false;
    }
    state.pitches.push(...added);
    playSound(659, 'sine', 0.1);
    saveGame();
    showToast(`${added.length} ${type} pitch${added.length === 1 ? '' : 'es'} built.`);
    return true;
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
    if (!spend(points.length * UTILITY_COSTS[utility], 'construction',
        `Laid ${utility} utility line (${points.length} tiles)`)) return false;
    points.forEach(({x, y}) => { state.tiles[y][x].utilities[utility] = true; });
    saveGame();
    const connectedPitchCount = state.pitches.filter(pitch =>
        getPitchHookups(pitch)[utility]).length;
    showToast(`${utility[0].toUpperCase()}${utility.slice(1)} line laid · ${connectedPitchCount} pitch${connectedPitchCount === 1 ? '' : 'es'} connected.`);
    return true;
}

function handleBuildDrag(start, end) {
    if (state.activeTool === 'pitch_grass' || state.activeTool === 'pitch_gravel') {
        const type = state.activeTool === 'pitch_grass' ? 'grass' : 'gravel';
        return createPitchesInBox(start, end, type);
    }
    if (state.activeTool.startsWith('utility_')) {
        return drawUtilityLine(start, end, state.activeTool.slice('utility_'.length));
    }
    handleGridClick(start.x, start.y);
    return true;
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
            ctx.fillStyle = t.terrain === 'grass' ? PALETTE.grass[(x+y)%3] : PALETTE.water;
            ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // Nature layer
    for(let y=0; y<GRID_H; y++) {
        for(let x=0; x<GRID_W; x++) {
            const nature = state.tiles[y][x].nature;
            const px = x*TILE_SIZE; const py = y*TILE_SIZE;
            if (nature === 'debris') {
                ctx.fillStyle = 'rgba(35, 45, 24, 0.35)';
                ctx.fillRect(px+4, py+5, 2, 2);
                ctx.fillRect(px+10, py+11, 2, 2);
            } else if (nature === 'tree') {
                ctx.fillStyle = '#2d3b1e'; ctx.fillRect(px+6, py+10, 4, 6);
                ctx.fillStyle = PALETTE.tree; ctx.beginPath(); ctx.arc(px+8, py+6, 6, 0, Math.PI*2); ctx.fill();
            }
        }
    }

    // Road layer
    for(let y=0; y<GRID_H; y++) {
        for(let x=0; x<GRID_W; x++) {
            if (!state.tiles[y][x].road) continue;
            ctx.fillStyle = PALETTE.road;
            ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    for(let y=0; y<GRID_H; y++) {
        for(let x=0; x<GRID_W; x++) {
            if (!state.tiles[y][x].path) continue;
            ctx.fillStyle = PALETTE.path;
            ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
        ctx.fillStyle = wallColor; ctx.fillRect(px, py, f.w*TILE_SIZE, f.h*TILE_SIZE);
        ctx.fillStyle = roofColor; ctx.fillRect(px-2, py, (f.w*TILE_SIZE)+4, 4);
        ctx.fillStyle = '#2c3e50'; ctx.font = '8px Arial'; ctx.fillText(f.type.toUpperCase(), px+4, py+14);
    });

    // Caravans occupy their pitch footprint and belong to the placed-object layer
    state.caravans.forEach(c => {
        const px = c.pitch.x*TILE_SIZE + 4; const py = c.pitch.y*TILE_SIZE + 4;
        const pw = (c.pitch.w*TILE_SIZE)-8; const ph = (c.pitch.h*TILE_SIZE)-8;
        
        ctx.fillStyle = c.tier === 1 ? '#d8cfbe' : '#ded495';
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeStyle = '#000'; ctx.lineWidth=1; ctx.strokeRect(px, py, pw, ph);
        // Windows
        ctx.fillStyle = '#85c1e9'; ctx.fillRect(px+4, py+2, pw-8, 6);
        if (c.isBroken) { ctx.fillStyle = 'red'; ctx.beginPath(); ctx.arc(px+pw/2, py+ph/2, 4, 0, Math.PI*2); ctx.fill(); }
    });

    // Guest accommodation and residents
    state.guests.forEach(guest => {
        const pitch = guest.pitch;
        const px = pitch.x * TILE_SIZE;
        const py = pitch.y * TILE_SIZE;
        const width = pitch.w * TILE_SIZE;
        const height = pitch.h * TILE_SIZE;
        if (guest.accommodation === 'tent') {
            ctx.fillStyle = '#c9823b';
            ctx.beginPath();
            ctx.moveTo(px + width * 0.2, py + height * 0.58);
            ctx.lineTo(px + width * 0.5, py + height * 0.2);
            ctx.lineTo(px + width * 0.8, py + height * 0.58);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#f2d7a0';
            ctx.fillRect(px + width * 0.47, py + height * 0.43, width * 0.06, height * 0.15);
        } else {
            ctx.fillStyle = guest.accommodation === 'static' ? '#ded495' : '#d8cfbe';
            ctx.fillRect(px + width * 0.16, py + height * 0.24, width * 0.68, height * 0.42);
            ctx.strokeStyle = '#1a252f';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + width * 0.16, py + height * 0.24, width * 0.68, height * 0.42);
            ctx.fillStyle = '#85c1e9';
            ctx.fillRect(px + width * 0.26, py + height * 0.3, width * 0.16, height * 0.1);
        }
        const residentX = (guest.position?.x ?? (pitch.x + pitch.w / 2)) * TILE_SIZE;
        const residentY = (guest.position?.y ?? (pitch.y + pitch.h / 2)) * TILE_SIZE;
        ctx.fillStyle = '#f5cba7';
        ctx.beginPath(); ctx.arc(residentX, residentY, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(residentX - 2, residentY + 3, 4, 5);
    });

    // Player
    const playerX = state.player.x * TILE_SIZE;
    const playerY = state.player.y * TILE_SIZE;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(playerX, playerY + 5, 6, 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f5cba7';
    ctx.beginPath(); ctx.arc(playerX, playerY, 5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#2e86c1';
    ctx.fillRect(playerX - 4, playerY + 3, 8, 5);

    const lighting = getDayNightLighting();
    if (lighting.darkness > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(8, 16, 43, ${lighting.darkness})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
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
    const availablePitches = state.pitches.filter(pitch => !pitch.occupied).length;
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
    if (state.selectedEntity) {
        ins.style.display = 'block';
        const c = state.selectedEntity;
        if (typeof c.tier !== 'number' && typeof c.type === 'string') {
            document.getElementById('ins-name').innerText =
                `${c.type.replaceAll('_', ' ')} facility`;
            document.getElementById('ins-content').innerHTML =
                `Status: ${c.isOperational === false ? 'Closed' : 'Operational'}<br>` +
                `Capacity: ${c.capacity} guests/hour<br>` +
                `Hourly operating cost: £${c.hourlyCost}<br>` +
                `Current usage: ${c.hourlyUsage || 0}/${c.capacity}` +
                (ParkServices.ENTERTAINMENT_TYPES.includes(c.type)
                    ? `<br>Park-wide entertainment capacity: ${ParkServices.getEntertainmentCapacity(state)}`
                    : '');
            actionButtons.forEach(button => {
                button.style.display = 'none';
                button.disabled = true;
            });
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
            `${type}: ${hookups[type] ? 'connected' : 'not connected'}`).join('<br>');
        document.getElementById('ins-name').innerText = c.tier === 1 ? 'Retro Tin Unit' : 'Luxury Static';
        document.getElementById('ins-content').innerHTML = `Condition: ${Math.floor(c.condition)}%<br>Rent: £${c.getDailyRent()}/day<br>Status: ${c.isBroken ? '⚠️ BROKEN' : 'OK'}${c.tier === 2 ? `<br>Rental: ${c.isRentalReady() ? 'Ready' : 'Needs all hookups'}<br>${hookupStatus}` : ''}`;
        actionButtons.forEach(button => {
            button.style.display = 'block';
        });
        document.getElementById('btn-repair').disabled = !c.isBroken || state.cash < 40;
        document.getElementById('btn-upgrade').disabled = c.hasDecking || state.cash < 400;
        document.getElementById('btn-skirting').disabled = c.hasSkirting || state.cash < 150;
        document.getElementById('btn-sell').disabled = false;
    } else {
        facilityToggle.style.display = 'none';
        ins.style.display = 'block';
        document.getElementById('ins-name').innerText = 'Park Overview';
        const occupied = state.pitches.filter(pitch => pitch.occupied).length;
        const demand = getGuestDemand();
        const balance = Economy.getSevenDayBalance(state);
        const recentTransactions = state.transactions.slice(-5).reverse().map(transaction =>
            `${transaction.description}: ${transaction.amount < 0 ? '−' : '+'}£${Math.abs(transaction.amount).toLocaleString()}`
        );
        const parties = state.guests.reduce((sum, guest) =>
            sum + (guest.party?.headcount || 1), 0);
        document.getElementById('ins-content').innerHTML = `Cash: £${Math.floor(state.cash).toLocaleString()}<br>Occupancy: ${occupied}/${state.pitches.length || 0}<br>Guests: ${parties} people in ${state.guests.length} parties<br>Rating: ${state.rating.toFixed(1)} / 5<br>Demand: ${demand.level} (${demand.score}%)<br>7-day income: £${balance.income.toLocaleString()} · expenses: £${balance.expenses.toLocaleString()} · net: £${balance.net.toLocaleString()}<br>Ledger: ${balance.isValid ? '✓ reconciled' : '⚠ balance mismatch'}<br><strong>Recent transactions</strong><br>${recentTransactions.length ? recentTransactions.join('<br>') : 'No transactions yet.'}`;
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
    saveGame();
    updateUI();
}

function upgradeSelectedCaravan() {
    const caravan = state.selectedEntity;
    if (!caravan || caravan.hasDecking || !spend(400, 'upgrades', 'Added caravan decking')) return;
    caravan.hasDecking = true;
    saveGame();
    updateUI();
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
    const salePrice = caravan.tier === 1 ? 300 : 1000;
    recordTransaction(salePrice, 'asset sale', 'Sold caravan');
    state.caravans = state.caravans.filter(item => item !== caravan);
    caravan.pitch.occupied = false;
    state.selectedEntity = null;
    state.interactionTarget = null;
    saveGame();
    updateUI();
    showToast(`💰 Unit sold for £${salePrice}.`);
}

function toggleSelectedFacility() {
    const facility = state.selectedEntity;
    if (!facility || typeof facility.tier === 'number' || typeof facility.type !== 'string') return;
    facility.isOperational = facility.isOperational === false;
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

function hireHandyman() {
    if (spend(150, 'staff', 'Hired handyman')) {
        state.handymen++;
        saveGame();
        updateUI();
        showToast("🛠️ Handyman Hired!");
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
    state.isDown = true;
    state.buildingDrag = state.activeTool !== 'select';
    state.lastM = {x: event.clientX, y: event.clientY};
    state.dragStart = gridFromPointer(event.clientX, event.clientY);
    state.pointerTile = state.dragStart;
});
window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
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
