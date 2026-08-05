// Core Cube content module.
// Keeps the blurred 45-polyhedron and cube power sources out of the normal currency list.
const CORE_CUBE_FACE_COUNT = 6;
const CORE_CUBE_POWER_MIN = 1;
const CORE_CUBE_POWER_MAX = 45;

const CORE_CUBE_VERTICES = [
    [-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1],
    [-1, -1, -1], [ 1, -1, -1], [ 1,  1, -1], [-1,  1, -1]
];
const CORE_CUBE_FACE_DEFS = [
    { id: 0, name: '1번 면', verts: [0, 1, 2, 3] },
    { id: 1, name: '2번 면', verts: [5, 4, 7, 6] },
    { id: 2, name: '3번 면', verts: [3, 2, 6, 7] },
    { id: 3, name: '4번 면', verts: [4, 5, 1, 0] },
    { id: 4, name: '5번 면', verts: [1, 5, 6, 2] },
    { id: 5, name: '6번 면', verts: [4, 0, 3, 7] }
];
const coreCubeCanvasView = {
    canvas: null,
    ctx: null,
    textureCanvas: null,
    textureCtx: null,
    animationFrame: null,
    rotationMatrix: [
        [0.78, 0.00, 0.62],
        [-0.24, 0.92, 0.31],
        [-0.57, -0.39, 0.72]
    ],
    dragging: false,
    dragMoved: false,
    dragStartX: 0,
    dragStartY: 0,
    lastTrackballVector: null,
    projectedFaces: []
};

function getCoreCubeDefaultState() {
    return {
        unlocked: false,
        everUnlocked: false,
        relockUntilDrop: false,
        unlockNoticeSeen: false,
        selectedFace: 0,
        blurred45: 0,
        powers: {},
        faces: Array(CORE_CUBE_FACE_COUNT).fill(null),
        completed: false,
        isCompleting: false,
        revealedOptions: [],
        optionMechanism: null,
        lastPower: null
    };
}

function normalizeCoreCubeState(raw) {
    let def = getCoreCubeDefaultState();
    let src = (raw && typeof raw === 'object') ? raw : {};
    let faces = Array.isArray(src.faces) ? src.faces.slice(0, CORE_CUBE_FACE_COUNT) : def.faces.slice();
    while (faces.length < CORE_CUBE_FACE_COUNT) faces.push(null);
    faces = faces.map(value => {
        let n = Math.floor(Number(value) || 0);
        return n >= CORE_CUBE_POWER_MIN && n <= CORE_CUBE_POWER_MAX ? n : null;
    });
    let powers = {};
    Object.keys(src.powers || {}).forEach(key => {
        let n = Math.floor(Number(key) || 0);
        let count = Math.max(0, Math.floor(Number(src.powers[key]) || 0));
        if (n >= CORE_CUBE_POWER_MIN && n <= CORE_CUBE_POWER_MAX && count > 0) powers[n] = count;
    });
    let revealedOptions = Array.isArray(src.revealedOptions) ? src.revealedOptions.filter(row => row && typeof row === 'object') : [];
    return {
        ...def,
        ...src,
        unlocked: !!src.unlocked,
        everUnlocked: !!src.everUnlocked || !!src.unlocked,
        relockUntilDrop: !!src.relockUntilDrop,
        unlockNoticeSeen: !!src.unlockNoticeSeen,
        selectedFace: Math.max(0, Math.min(CORE_CUBE_FACE_COUNT - 1, Math.floor(Number(src.selectedFace) || 0))),
        blurred45: Math.max(0, Math.floor(Number(src.blurred45) || 0)),
        powers,
        faces,
        completed: !!src.completed,
        isCompleting: false,
        revealedOptions,
        optionMechanism: (src.optionMechanism && typeof src.optionMechanism === 'object') ? src.optionMechanism : null,
        lastPower: Math.floor(Number(src.lastPower) || 0) || null
    };
}

function ensureCoreCubeState() {
    if (!window.game) return getCoreCubeDefaultState();
    game.coreCube = normalizeCoreCubeState(game.coreCube);
    return game.coreCube;
}

function getCoreCubeUnlockInfo() {
    let uw = (game && game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : {};
    let highest = Math.max(1, Math.floor(Number(uw.highestFloor) || 1));
    let underworld10Cleared = highest >= 11;
    let loopReady = Math.max(1, Math.floor(Number((game && game.season) || 1))) >= 20 || Math.max(0, Math.floor(Number((game && game.loopCount) || 0))) >= 20;
    let st = (game && game.coreCube && typeof game.coreCube === 'object') ? game.coreCube : {};
    let firstUnlockReady = underworld10Cleared && loopReady;
    return {
        unlocked: !!st.unlocked,
        firstUnlockReady,
        dropEligible: firstUnlockReady || !!st.everUnlocked,
        underworld10Cleared,
        loopReady,
        highestFloor: highest,
        currentLoop: Math.max(1, Math.floor(Number((game && game.season) || 1)))
    };
}

function canDropCoreCubeBlurred45() {
    let st = ensureCoreCubeState();
    let info = getCoreCubeUnlockInfo();
    return !!(info.dropEligible || st.everUnlocked);
}

function isCoreCubeUnlocked() {
    let st = ensureCoreCubeState();
    let info = getCoreCubeUnlockInfo();
    if (!st.everUnlocked && info.firstUnlockReady) {
        st.unlocked = true;
        st.everUnlocked = true;
        st.relockUntilDrop = false;
        if (game.unlocks) game.unlocks.cube = true;
    }
    return !!st.unlocked;
}

function maybeUnlockCoreCube(options = {}) {
    if (!game) return false;
    let st = ensureCoreCubeState();
    let info = getCoreCubeUnlockInfo();
    if (!st.everUnlocked && !info.firstUnlockReady) return false;
    if (!st.everUnlocked && info.firstUnlockReady) {
        st.unlocked = true;
        st.everUnlocked = true;
        st.relockUntilDrop = false;
        if (game.unlocks) game.unlocks.cube = true;
        if (game.noti) game.noti.cube = true;
        if (!options.silent) {
            if (typeof queueTutorialNotice === 'function') queueTutorialNotice('unlock_core_cube', '큐브 탭 개방', '지하계 10층 클리어와 루프 20 조건을 달성해 코어 큐브가 해금되었습니다. 흐릿한 45면체는 이제 지하계에서 드랍됩니다.', 'tab-cube');
            else if (typeof addLog === 'function') addLog('🧊 코어 큐브가 해금되었습니다!', 'loot-unique');
        }
        return true;
    }
    if (st.everUnlocked && st.unlocked) {
        if (game.unlocks) game.unlocks.cube = true;
        return true;
    }
    return false;
}

function relockCoreCubeForLoop() {
    let st = ensureCoreCubeState();
    if (!st.everUnlocked) return;
    let keepEverUnlocked = !!st.everUnlocked;
    game.coreCube = normalizeCoreCubeState({ ...getCoreCubeDefaultState(), everUnlocked: keepEverUnlocked, relockUntilDrop: true });
    if (game.unlocks) game.unlocks.cube = false;
    if (game.noti) game.noti.cube = false;
}

function addCoreCubeBlurred45(amount = 1) {
    let st = ensureCoreCubeState();
    let gain = Math.max(1, Math.floor(Number(amount) || 1));
    st.blurred45 += gain;
    if (st.everUnlocked && !st.unlocked) {
        st.unlocked = true;
        st.relockUntilDrop = false;
        if (game && game.unlocks) game.unlocks.cube = true;
        // 알림은 탭이 다시 열리는 이 시점에만 켠다. 예전처럼 45면체 드랍마다 켜면
        // 지하계 파밍 중 장비 상위탭 그룹 점이 계속 되살아나 항상 켜진 것처럼 보인다.
        if (game && game.noti) game.noti.cube = true;
    } else {
        maybeUnlockCoreCube({ silent: true });
    }
    return gain;
}

function addCoreCubePower(powerNo, count = 1) {
    let st = ensureCoreCubeState();
    let n = Math.max(CORE_CUBE_POWER_MIN, Math.min(CORE_CUBE_POWER_MAX, Math.floor(Number(powerNo) || 1)));
    let gain = Math.max(1, Math.floor(Number(count) || 1));
    st.powers[n] = Math.max(0, Math.floor(st.powers[n] || 0)) + gain;
    st.lastPower = n;
    return n;
}

function consumeCoreCubePowerFromState(st, powerNo, count = 1) {
    if (!st || !st.powers) return false;
    let n = Math.floor(Number(powerNo) || 0);
    let need = Math.max(1, Math.floor(Number(count) || 1));
    if (!st.powers[n] || st.powers[n] < need) return false;
    st.powers[n] -= need;
    if (st.powers[n] <= 0) delete st.powers[n];
    return true;
}

function removeCoreCubePower(powerNo, count = 1) {
    return consumeCoreCubePowerFromState(ensureCoreCubeState(), powerNo, count);
}

function useCoreCubeBlurred45(count = 1) {
    if (!isCoreCubeUnlocked()) return addLog('코어 큐브가 아직 해금되지 않았습니다.', 'attack-monster');
    let st = ensureCoreCubeState();
    if (st.blurred45 <= 0) return addLog('흐릿한 45면체가 없습니다.', 'attack-monster');
    let requested = count === 'all' ? st.blurred45 : Math.max(1, Math.floor(Number(count) || 1));
    let useCount = Math.min(st.blurred45, requested);
    let gained = {};
    let lastRolled = null;
    st.blurred45 -= useCount;
    for (let i = 0; i < useCount; i += 1) {
        lastRolled = 1 + Math.floor(Math.random() * CORE_CUBE_POWER_MAX);
        gained[lastRolled] = (gained[lastRolled] || 0) + 1;
    }
    Object.keys(gained).map(Number).sort((a, b) => a - b).forEach(no => {
        st.powers[no] = Math.max(0, Math.floor(st.powers[no] || 0)) + gained[no];
    });
    st.lastPower = lastRolled;
    let summary = Object.keys(gained).map(Number).sort((a, b) => a - b).map(no => `${no}×${gained[no]}`).join(', ');
    addLog(`🧊 흐릿한 45면체 ${useCount}개 해석: ${summary} 동력원 획득`, 'loot-unique');
    renderCoreCubePanel();
    updateStaticUI();
}

function selectCoreCubeFace(faceIndex) {
    let st = ensureCoreCubeState();
    st.selectedFace = Math.max(0, Math.min(CORE_CUBE_FACE_COUNT - 1, Math.floor(Number(faceIndex) || 0)));
    renderCoreCubePanel();
}

function socketCoreCubePower(powerNo) {
    if (!isCoreCubeUnlocked()) return addLog('코어 큐브가 아직 해금되지 않았습니다.', 'attack-monster');
    let st = ensureCoreCubeState();
    if (st.completed) return addLog('완성된 큐브입니다. 재구성 후 다시 각인할 수 있습니다.', 'attack-monster');
    let faceIndex = Math.max(0, Math.min(CORE_CUBE_FACE_COUNT - 1, Math.floor(st.selectedFace || 0)));
    if (st.faces[faceIndex] !== null) return addLog('이미 동력원이 각인된 면입니다.', 'attack-monster');
    let n = Math.floor(Number(powerNo) || 0);
    if (!consumeCoreCubePowerFromState(st, n, 1)) return addLog(`${n}의 동력원이 부족합니다.`, 'attack-monster');
    st.faces[faceIndex] = n;
    addLog(`🧊 코어 큐브 ${faceIndex + 1}번 면에 ${n}의 동력원 각인`, 'loot-magic');
    renderCoreCubePanel();
    updateStaticUI();
}

function socketRandomCoreCubePower(allRemaining = false) {
    let st = ensureCoreCubeState();
    if (st.completed) return addLog('완성된 큐브입니다. 재구성 후 다시 각인할 수 있습니다.', 'attack-monster');
    let emptyFaces = st.faces.map((value, idx) => value === null ? idx : null).filter(idx => idx !== null);
    if (emptyFaces.length <= 0) return addLog('비어 있는 큐브 면이 없습니다.', 'attack-monster');
    let total = Object.values(st.powers || {}).reduce((sum, count) => sum + Math.max(0, Math.floor(count || 0)), 0);
    let targetFaces = allRemaining ? emptyFaces : [st.selectedFace];
    targetFaces = targetFaces.filter(idx => st.faces[idx] === null);
    if (total < targetFaces.length) return addLog('동력원이 부족합니다.', 'attack-monster');
    targetFaces.forEach(idx => {
        let picked = pickRandomCoreCubePowerFromState(st);
        if (picked !== null && consumeCoreCubePowerFromState(st, picked, 1)) st.faces[idx] = picked;
    });
    renderCoreCubePanel();
    updateStaticUI();
}

function getCoreCubePowerTotal() {
    let st = ensureCoreCubeState();
    return Object.values(st.powers || {}).reduce((sum, count) => sum + Math.max(0, Math.floor(count || 0)), 0);
}

function pickRandomCoreCubePowerFromState(st) {
    let total = Object.values((st && st.powers) || {}).reduce((sum, count) => sum + Math.max(0, Math.floor(count || 0)), 0);
    if (total <= 0) return null;
    let cursor = Math.floor(Math.random() * total);
    let entries = Object.keys(st.powers || {}).map(Number).sort((a, b) => a - b);
    for (let n of entries) {
        let count = Math.max(0, Math.floor(st.powers[n] || 0));
        if (cursor < count) return n;
        cursor -= count;
    }
    return null;
}

function pickRandomCoreCubePower() {
    return pickRandomCoreCubePowerFromState(ensureCoreCubeState());
}

async function resetCoreCube() {
    let st = ensureCoreCubeState();
    if (!st.completed && st.faces.every(v => v === null)) return addLog('재구성할 큐브 각인이 없습니다.', 'attack-monster');
    if (!await requestGameConfirmation('큐브를 재구성하면 각인된 동력원과 발현 옵션이 사라집니다.', {
        title: '코어 큐브 재구성',
        tone: 'danger',
        confirmLabel: '재구성'
    })) return;
    st.faces = Array(CORE_CUBE_FACE_COUNT).fill(null);
    st.completed = false;
    st.isCompleting = false;
    st.revealedOptions = [];
    st.optionMechanism = null;
    st.selectedFace = 0;
    addLog('🧊 코어 큐브를 재구성했습니다.', 'season-up');
    renderCoreCubePanel();
    updateStaticUI();
}

function completeCoreCube() {
    if (!isCoreCubeUnlocked()) return addLog('코어 큐브가 아직 해금되지 않았습니다.', 'attack-monster');
    let st = ensureCoreCubeState();
    if (st.completed) return addLog('이미 완성된 큐브입니다.', 'attack-monster');
    if (!st.faces.every(value => value !== null)) return addLog('코어 큐브 6면에 동력원을 모두 붙여야 합니다.', 'attack-monster');
    let combo = st.faces.slice().sort((a, b) => a - b);
    let generated = generateCoreCubeOptions(combo);
    st.revealedOptions = generated.options;
    st.optionMechanism = generated.mechanism;
    st.completed = true;
    st.isCompleting = false;
    if (game.noti) game.noti.cube = true;
    addLog(`✨ 코어 큐브 완성: ${generated.options.map(o => o.text).join(' / ')}`, 'loot-unique');
    renderCoreCubePanel();
    updateStaticUI();
}

function hashCoreCubeCombo(combo) {
    if (typeof hashSeed === 'function') return hashSeed(combo.join('/'));
    let h = 2166136261;
    String(combo.join('/')).split('').forEach(ch => { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); });
    return h >>> 0;
}

function makeCoreCubeRng(combo) {
    if (typeof createSeededRng === 'function') return createSeededRng(`core-cube:${combo.join('/')}`);
    let seed = hashCoreCubeCombo(combo) || 1;
    return function () {
        seed += 0x6D2B79F5;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function coreCubeRandInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function getCoreCubeOptionPool() {
    return [
        { group:'defense', id:'phys_dr', stat:'dr', label:'물리 피해 감소', unit:'%', min:2, max:6 },
        { group:'defense', id:'block', stat:'blockChance', label:'막기 확률', unit:'%', min:2, max:6 },
        { group:'defense', id:'deflect', stat:'deflectChance', label:'비껴내기 확률', unit:'%', min:2, max:7 },
        { group:'defense', id:'block_max', stat:'blockChanceMax', label:'막기 확률 최대치', unit:'%', min:2, max:6 },
        { group:'defense', id:'deflect_reduce', stat:'deflectDamageReduce', label:'비껴내기 피해 감소율', unit:'%', min:3, max:10 },
        { group:'defense', id:'armor_pct', stat:'armorPct', label:'방어도', unit:'%', min:12, max:36 },
        { group:'defense', id:'evasion_pct', stat:'evasionPct', label:'회피', unit:'%', min:12, max:36 },
        { group:'defense', id:'es_pct', stat:'energyShieldPct', label:'에너지보호막', unit:'%', min:12, max:36 },
        { group:'defense', id:'life_pct', stat:'pctHp', label:'생명력', unit:'%', min:6, max:18 },
        { group:'defense', id:'regen', stat:'regen', label:'생명력 재생', unit:'%', min:1, max:4, decimals:1 },
        { group:'defense', id:'es_recovery', stat:'energyShieldRegen', label:'에너지 보호막 회복 속도', unit:'%', min:8, max:24 },

        { group:'resist', id:'fire_res', stat:'resF', label:'화염 저항', unit:'%', min:8, max:24 },
        { group:'resist', id:'cold_res', stat:'resC', label:'냉기 저항', unit:'%', min:8, max:24 },
        { group:'resist', id:'light_res', stat:'resL', label:'번개 저항', unit:'%', min:8, max:24 },
        { group:'resist', id:'chaos_res', stat:'resChaos', label:'카오스 저항', unit:'%', min:8, max:24 },
        { group:'resist', id:'max_fire', stat:'maxResF', label:'화염 저항 최대치', unit:'%', min:1, max:3 },
        { group:'resist', id:'max_cold', stat:'maxResC', label:'냉기 저항 최대치', unit:'%', min:1, max:3 },
        { group:'resist', id:'max_light', stat:'maxResL', label:'번개 저항 최대치', unit:'%', min:1, max:3 },
        { group:'resist', id:'max_chaos', stat:'maxResChaos', label:'카오스 저항 최대치', unit:'%', min:1, max:3 },
        { group:'resist', id:'pen', stat:'resPen', label:'저항 관통', unit:'%', min:3, max:9 },

        { group:'mitigation', id:'flat_phys_reduce', stat:'physFlatTakenReduce', label:'받는 물리 피해 감소 flat', unit:'', min:3, max:14 },
        { group:'mitigation', id:'flat_fire_reduce', stat:'fireFlatTakenReduce', label:'받는 화염 피해 감소 flat', unit:'', min:3, max:14 },
        { group:'mitigation', id:'flat_cold_reduce', stat:'coldFlatTakenReduce', label:'받는 냉기 피해 감소 flat', unit:'', min:3, max:14 },
        { group:'mitigation', id:'flat_light_reduce', stat:'lightFlatTakenReduce', label:'받는 번개 피해 감소 flat', unit:'', min:3, max:14 },
        { group:'mitigation', id:'flat_chaos_reduce', stat:'chaosFlatTakenReduce', label:'받는 카오스 피해 감소 flat', unit:'', min:3, max:14 },
        { group:'mitigation', id:'flat_all_reduce', stat:'allFlatTakenReduce', label:'받는 피해 감소 flat', unit:'', min:2, max:8 },
        { group:'mitigation', id:'taken_as_fire', stat:'physTakenAsFire', label:'받는 물리 피해의 일부를 화염 피해로 받음', unit:'%', min:3, max:8 },
        { group:'mitigation', id:'taken_as_cold', stat:'physTakenAsCold', label:'받는 물리 피해의 일부를 냉기 피해로 받음', unit:'%', min:3, max:8 },
        { group:'mitigation', id:'taken_as_light', stat:'physTakenAsLight', label:'받는 물리 피해의 일부를 번개 피해로 받음', unit:'%', min:3, max:8 },
        { group:'mitigation', id:'taken_as_chaos', stat:'physTakenAsChaos', label:'받는 물리 피해의 일부를 카오스 피해로 받음', unit:'%', min:3, max:8 },

        { group:'offense', id:'added_fire', stat:'addedFireDamagePct', label:'총 피해의 일부만큼 화염 추가 피해', unit:'%', min:4, max:12 },
        { group:'offense', id:'added_cold', stat:'addedColdDamagePct', label:'총 피해의 일부만큼 냉기 추가 피해', unit:'%', min:4, max:12 },
        { group:'offense', id:'added_light', stat:'addedLightDamagePct', label:'총 피해의 일부만큼 번개 추가 피해', unit:'%', min:4, max:12 },
        { group:'offense', id:'added_chaos', stat:'addedChaosDamagePct', label:'총 피해의 일부만큼 카오스 추가 피해', unit:'%', min:4, max:12 },
        { group:'offense', id:'added_phys', stat:'addedPhysDamagePct', label:'총 피해의 일부만큼 물리 추가 피해', unit:'%', min:4, max:12 },
        { group:'offense', id:'flat_dmg', stat:'flatDmg', label:'기본 피해', unit:'', min:8, max:26 },
        { group:'offense', id:'fire_flat', stat:'fireFlatDmg', label:'화염 기본 피해', unit:'', min:8, max:24 },
        { group:'offense', id:'cold_flat', stat:'coldFlatDmg', label:'냉기 기본 피해', unit:'', min:8, max:24 },
        { group:'offense', id:'light_flat', stat:'lightFlatDmg', label:'번개 기본 피해', unit:'', min:8, max:24 },
        { group:'offense', id:'chaos_flat', stat:'chaosFlatDmg', label:'카오스 기본 피해', unit:'', min:8, max:24 },
        { group:'offense', id:'pct_dmg', stat:'pctDmg', label:'피해 증가', unit:'%', min:8, max:24 },
        { group:'offense', id:'fire_dmg', stat:'firePctDmg', label:'화염 피해', unit:'%', min:10, max:28 },
        { group:'offense', id:'cold_dmg', stat:'coldPctDmg', label:'냉기 피해', unit:'%', min:10, max:28 },
        { group:'offense', id:'light_dmg', stat:'lightPctDmg', label:'번개 피해', unit:'%', min:10, max:28 },
        { group:'offense', id:'chaos_dmg', stat:'chaosPctDmg', label:'카오스 피해', unit:'%', min:10, max:28 },
        { group:'offense', id:'spell_dmg', stat:'spellFlatPct', label:'주문 피해', unit:'%', min:8, max:22 },
        { group:'offense', id:'aoe_dmg', stat:'aoePctDmg', label:'범위 피해', unit:'%', min:10, max:28 },
        { group:'offense', id:'projectile_dmg', stat:'projectilePctDmg', label:'투사체 피해', unit:'%', min:10, max:28 },
        { group:'offense', id:'dot', stat:'dotPctDmg', label:'지속 피해 배율', unit:'%', min:10, max:28 },

        { group:'utility', id:'crit', stat:'crit', label:'치명타 확률', unit:'%', min:2, max:7 },
        { group:'utility', id:'crit_dmg', stat:'critDmg', label:'치명타 피해 배율', unit:'%', min:12, max:36 },
        { group:'utility', id:'double_strike', stat:'ds', label:'연속 타격', unit:'%', min:3, max:9 },
        { group:'utility', id:'leech', stat:'leech', label:'흡혈', unit:'%', min:1, max:4, decimals:1 },
        { group:'utility', id:'summon_dmg', stat:'summonPctDmg', label:'소환수 피해', unit:'%', min:10, max:30 },
        { group:'utility', id:'summon_hp', stat:'summonHpPct', label:'소환수 생명력', unit:'%', min:10, max:30 },
        { group:'utility', id:'summon_crit', stat:'summonCrit', pairedStat:'summonCritDmg', pairedMul:4, label:'소환수 치명타 확률 및 치명타 피해 배율', unit:'%', min:2, max:7 },
        { group:'utility', id:'projectile_shots', stat:'projectileExtraShots', label:'투사체 추가 발사', unit:'', min:1, max:1 },
        { group:'utility', id:'spell_flat_pct', stat:'spellFlatPct', label:'주문 내장 피해 증가', unit:'%', min:8, max:22 },
        { group:'utility', id:'slam_aftershock', stat:'slamEchoChance', pairedStat:'slamEchoDamagePct', label:'강타 공격 시 확률로 여진 피해 추가', unit:'%', min:4, max:12, extraMin:35, extraMax:90 },
        { group:'utility', id:'double_damage', stat:'doubleDamageChance', label:'확률로 2배의 피해를 줌', unit:'%', min:2, max:6 }
    ];
}

function formatCoreCubeOption(row) {
    if (!row) return '';
    if (row.id === 'slam_aftershock') return `강타 공격 시 ${row.value}% 확률로 ${row.extraValue}% 만큼의 여진 피해 추가`;
    if (row.id === 'double_damage') return `${row.value}% 확률로 2배의 피해를 줌`;
    if (row.id && row.id.startsWith('taken_as_')) {
        let elementName = row.id === 'taken_as_fire' ? '화염' : row.id === 'taken_as_cold' ? '냉기' : row.id === 'taken_as_light' ? '번개' : '카오스';
        return `받는 물리 피해의 ${row.value}%를 ${elementName} 피해로 받음`;
    }
    if (row.id && row.id.startsWith('added_')) {
        let elementName = row.id === 'added_fire' ? '화염' : row.id === 'added_cold' ? '냉기' : row.id === 'added_light' ? '번개' : row.id === 'added_chaos' ? '카오스' : '물리';
        return `총 피해의 ${row.value}%만큼 ${elementName} 추가 피해`;
    }
    if (row.pairedStat && row.id === 'summon_crit') return `${row.label} +${row.value}% / +${row.pairedValue}%`;
    let sign = row.value >= 0 ? '+' : '';
    return `${row.label} ${sign}${row.value}${row.unit || ''}`;
}

function generateCoreCubeOptions(combo) {
    let rng = makeCoreCubeRng(combo);
    let pool = getCoreCubeOptionPool();
    let options = [];
    let used = new Set();

    // The six socketed power-source numbers define the seed, but do not force
    // defense/offense/utility buckets. Every completed cube rolls 4 distinct
    // lines from the full option pool and rolls each line's value from its own
    // range, so the huge 1~45 choose 6 combination space maps to many possible
    // option/value results.
    while (options.length < 4 && used.size < pool.length) {
        let index = Math.floor(rng() * pool.length);
        let def = pool[index];
        if (!def || used.has(def.id)) continue;
        used.add(def.id);

        let value = def.decimals
            ? Number((def.min + rng() * (def.max - def.min)).toFixed(1))
            : coreCubeRandInt(rng, def.min, def.max);
        let option = { ...def, value };
        if (def.pairedStat) option.pairedValue = value * (def.pairedMul || 1);
        if (def.extraMin) {
            option.extraValue = coreCubeRandInt(rng, def.extraMin, def.extraMax || def.extraMin);
            if (def.id === 'slam_aftershock') option.pairedValue = option.extraValue;
        }
        option.text = formatCoreCubeOption(option);
        options.push(option);
    }

    return {
        options,
        mechanism: {
            combo: combo.slice(),
            seed: hashCoreCubeCombo(combo),
            poolSize: pool.length,
            picks: options.map((row, idx) => ({ slot: idx + 1, optionId: row.id, label: row.label, value: row.value }))
        }
    };
}

function getCoreCubeActiveStats() {
    let st = ensureCoreCubeState();
    if (!st.completed || !Array.isArray(st.revealedOptions)) return [];
    let stats = [];
    st.revealedOptions.forEach(option => {
        if (!option || !option.stat) return;
        stats.push({ id: option.stat, val: Number(option.value || 0), source: 'coreCube' });
        if (option.pairedStat) stats.push({ id: option.pairedStat, val: Number(option.pairedValue || 0), source: 'coreCube' });
    });
    return stats;
}

function toCoreCubeRoman(num) {
    const table = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let result = '';
    let value = Math.max(1, Math.floor(Number(num) || 1));
    table.forEach(([amount, symbol]) => {
        while (value >= amount) {
            result += symbol;
            value -= amount;
        }
    });
    return result;
}

function coreCubeMultiplyMatrixVector(m, v) {
    return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
    ];
}

function coreCubeMultiplyMatrices(a, b) {
    const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            r[y][x] = a[y][0] * b[0][x] + a[y][1] * b[1][x] + a[y][2] * b[2][x];
        }
    }
    return r;
}

function coreCubeNormalizeVector(v) {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
}

function coreCubeCross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function coreCubeDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function coreCubeCreateRotationMatrix(axis, angle) {
    const [x, y, z] = coreCubeNormalizeVector(axis);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    return [
        [t * x * x + c,     t * x * y - s * z, t * x * z + s * y],
        [t * x * y + s * z, t * y * y + c,     t * y * z - s * x],
        [t * x * z - s * y, t * y * z + s * x, t * z * z + c]
    ];
}

function coreCubeGetTrackballVector(clientX, clientY) {
    const canvas = coreCubeCanvasView.canvas;
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = -(((clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
    const lengthSq = nx * nx + ny * ny;
    if (lengthSq <= 1) return coreCubeNormalizeVector([nx, ny, Math.sqrt(1 - lengthSq)]);
    return coreCubeNormalizeVector([nx, ny, 0]);
}

function coreCubeGetNormal(a, b, c) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    return [nx / len, ny / len, nz / len];
}

function coreCubePointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
    }
    return inside;
}

function initCoreCubeTextureCanvas() {
    if (coreCubeCanvasView.textureCanvas || typeof document === 'undefined') return;
    coreCubeCanvasView.textureCanvas = document.createElement('canvas');
    coreCubeCanvasView.textureCanvas.width = 256;
    coreCubeCanvasView.textureCanvas.height = 256;
    coreCubeCanvasView.textureCtx = coreCubeCanvasView.textureCanvas.getContext('2d');
}

function resizeCoreCubeCanvas() {
    const canvas = coreCubeCanvasView.canvas;
    const ctx = coreCubeCanvasView.ctx;
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawCoreCubeCanvas();
}

function coreCubeProjectVertex(v) {
    const canvas = coreCubeCanvasView.canvas;
    const rect = canvas.getBoundingClientRect();
    const [x, y, z] = v;
    const distance = 4.3;
    const scale = Math.min(rect.width, rect.height) * 0.15;
    const perspective = distance / (distance - z);
    return {
        x: rect.width / 2 + x * scale * perspective,
        y: rect.height / 2 - y * scale * perspective,
        z
    };
}

function drawCoreCubeBackground(rect) {
    const ctx = coreCubeCanvasView.ctx;
    ctx.save();
    for (let i = 0; i < 54; i++) {
        const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233) * 24634.6345) % 1;
        const px = Math.abs(x) * rect.width;
        const py = Math.abs(y) * rect.height;
        const radius = 0.7 + (i % 4) * 0.32;
        ctx.fillStyle = `rgba(150, 215, 255, ${0.05 + (i % 5) * 0.014})`;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawCoreCubeCanvas() {
    const canvas = coreCubeCanvasView.canvas;
    const ctx = coreCubeCanvasView.ctx;
    if (!canvas || !ctx || !canvas.isConnected) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    drawCoreCubeBackground(rect);

    const st = ensureCoreCubeState();
    const rotated = CORE_CUBE_VERTICES.map(v => coreCubeMultiplyMatrixVector(coreCubeCanvasView.rotationMatrix, v));
    const projected = rotated.map(coreCubeProjectVertex);
    const drawableFaces = CORE_CUBE_FACE_DEFS.map(face => {
        const points = face.verts.map(index => projected[index]);
        const avgZ = points.reduce((sum, p) => sum + p.z, 0) / points.length;
        const normal = coreCubeGetNormal(rotated[face.verts[0]], rotated[face.verts[1]], rotated[face.verts[2]]);
        return { ...face, value: st.faces[face.id], points, avgZ, normalZ: normal[2] };
    }).sort((a, b) => a.avgZ - b.avgZ);
    coreCubeCanvasView.projectedFaces = drawableFaces.filter(face => face.normalZ > -0.12).sort((a, b) => b.avgZ - a.avgZ);
    drawableFaces.forEach(face => drawCoreCubeFace(face, st));
    drawCoreCubeWireframe(drawableFaces, st.completed);
}

function drawCoreCubeFace(face, st) {
    const ctx = coreCubeCanvasView.ctx;
    const points = face.points;
    const isSelected = st.selectedFace === face.id;
    const hasPower = face.value !== null;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    if (st.completed) {
        const pulse = 0.16 + Math.sin(performance.now() * 0.005) * 0.05;
        ctx.fillStyle = `rgba(255, 142, 55, ${pulse})`;
        ctx.fill();
        ctx.shadowBlur = 28;
        ctx.shadowColor = 'rgba(255, 142, 55, 0.90)';
        ctx.strokeStyle = 'rgba(255, 190, 110, 0.72)';
        ctx.lineWidth = 2.0;
        ctx.stroke();
    } else if (hasPower) {
        const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
        gradient.addColorStop(0, 'rgba(80, 230, 255, 0.24)');
        gradient.addColorStop(0.5, 'rgba(120, 190, 255, 0.14)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.045)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(75, 230, 255, 0.62)';
        ctx.strokeStyle = 'rgba(110, 240, 255, 0.34)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
    } else {
        ctx.fillStyle = 'rgba(120, 165, 210, 0.022)';
        ctx.fill();
    }
    if (!st.completed && isSelected) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(255, 217, 128, 0.65)';
        ctx.strokeStyle = 'rgba(255, 224, 150, 0.70)';
        ctx.lineWidth = 2.2;
        ctx.stroke();
    }
    ctx.restore();
    if (hasPower) drawCoreCubeRomanTexture(face, toCoreCubeRoman(face.value), st.completed);
}

function drawCoreCubeRomanTexture(face, roman, completed) {
    initCoreCubeTextureCanvas();
    const textureCanvas = coreCubeCanvasView.textureCanvas;
    const textureCtx = coreCubeCanvasView.textureCtx;
    if (!textureCanvas || !textureCtx) return;
    textureCtx.clearRect(0, 0, 256, 256);
    const bg = textureCtx.createRadialGradient(128, 128, 16, 128, 128, 120);
    bg.addColorStop(0, completed ? 'rgba(255, 160, 70, 0.20)' : 'rgba(100, 225, 255, 0.14)');
    bg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    textureCtx.fillStyle = bg;
    textureCtx.fillRect(0, 0, 256, 256);
    textureCtx.save();
    textureCtx.translate(128, 128);
    textureCtx.textAlign = 'center';
    textureCtx.textBaseline = 'middle';
    textureCtx.font = "900 52px Georgia, 'Times New Roman', serif";
    textureCtx.shadowBlur = completed ? 18 : 14;
    textureCtx.shadowColor = completed ? 'rgba(255, 160, 74, 0.72)' : 'rgba(150, 235, 255, 0.55)';
    textureCtx.lineWidth = 4;
    textureCtx.strokeStyle = completed ? 'rgba(255, 170, 74, 0.34)' : 'rgba(170, 245, 255, 0.28)';
    textureCtx.strokeText(roman, 0, 0);
    textureCtx.fillStyle = completed ? 'rgba(255, 230, 190, 0.78)' : 'rgba(210, 250, 255, 0.70)';
    textureCtx.fillText(roman, 0, 0);
    textureCtx.restore();
    const points = face.points;
    drawCoreCubeImageTriangle(textureCanvas, 0, 0, 256, 0, 256, 256, points[0], points[1], points[2]);
    drawCoreCubeImageTriangle(textureCanvas, 0, 0, 256, 256, 0, 256, points[0], points[2], points[3]);
}

function drawCoreCubeImageTriangle(img, sx0, sy0, sx1, sy1, sx2, sy2, p0, p1, p2) {
    const ctx = coreCubeCanvasView.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.clip();
    const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
    const a = (p0.x * (sy1 - sy2) + p1.x * (sy2 - sy0) + p2.x * (sy0 - sy1)) / denom;
    const c = (p0.x * (sx2 - sx1) + p1.x * (sx0 - sx2) + p2.x * (sx1 - sx0)) / denom;
    const e = (p0.x * (sx1 * sy2 - sx2 * sy1) + p1.x * (sx2 * sy0 - sx0 * sy2) + p2.x * (sx0 * sy1 - sx1 * sy0)) / denom;
    const b = (p0.y * (sy1 - sy2) + p1.y * (sy2 - sy0) + p2.y * (sy0 - sy1)) / denom;
    const d = (p0.y * (sx2 - sx1) + p1.y * (sx0 - sx2) + p2.y * (sx1 - sx0)) / denom;
    const f = (p0.y * (sx1 * sy2 - sx2 * sy1) + p1.y * (sx2 * sy0 - sx0 * sy2) + p2.y * (sx0 * sy1 - sx1 * sy0)) / denom;
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
}

function drawCoreCubeWireframe(drawableFaces, completed) {
    const ctx = coreCubeCanvasView.ctx;
    const edges = new Map();
    drawableFaces.forEach(face => {
        for (let i = 0; i < face.points.length; i++) {
            const a = face.verts[i];
            const b = face.verts[(i + 1) % face.verts.length];
            const key = [Math.min(a, b), Math.max(a, b)].join('-');
            if (!edges.has(key)) edges.set(key, [face.points[i], face.points[(i + 1) % face.points.length]]);
        }
    });
    const pulse = completed ? 0.72 + Math.sin(performance.now() * 0.006) * 0.18 : 1;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    for (const [, [a, b]] of edges) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (completed) {
            ctx.shadowBlur = 32;
            ctx.shadowColor = `rgba(255, 132, 36, ${0.95 * pulse})`;
            ctx.strokeStyle = `rgba(255, 146, 55, ${0.78 * pulse})`;
            ctx.lineWidth = 5.2;
            ctx.stroke();
            ctx.shadowBlur = 12;
            ctx.strokeStyle = `rgba(255, 232, 178, ${0.92 * pulse})`;
            ctx.lineWidth = 1.25;
            ctx.stroke();
        } else {
            ctx.shadowBlur = 22;
            ctx.shadowColor = 'rgba(75, 230, 255, 0.82)';
            ctx.strokeStyle = 'rgba(95, 235, 255, 0.58)';
            ctx.lineWidth = 3.8;
            ctx.stroke();
            ctx.shadowBlur = 8;
            ctx.strokeStyle = 'rgba(225, 255, 255, 0.80)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
        }
    }
    ctx.restore();
}

function startCoreCubeCanvasAnimation() {
    if (coreCubeCanvasView.animationFrame) cancelAnimationFrame(coreCubeCanvasView.animationFrame);
    const animate = () => {
        if (!coreCubeCanvasView.canvas || !coreCubeCanvasView.canvas.isConnected) {
            coreCubeCanvasView.animationFrame = null;
            return;
        }
        if (!coreCubeCanvasView.dragging) {
            const idleRotation = coreCubeCreateRotationMatrix([0.22, 1, 0.08], 0.0045);
            coreCubeCanvasView.rotationMatrix = coreCubeMultiplyMatrices(idleRotation, coreCubeCanvasView.rotationMatrix);
        }
        drawCoreCubeCanvas();
        coreCubeCanvasView.animationFrame = requestAnimationFrame(animate);
    };
    coreCubeCanvasView.animationFrame = requestAnimationFrame(animate);
}

function bindCoreCubeCanvas(canvas) {
    if (!canvas || coreCubeCanvasView.canvas === canvas) return;
    coreCubeCanvasView.canvas = canvas;
    coreCubeCanvasView.ctx = canvas.getContext('2d');
    initCoreCubeTextureCanvas();
    canvas.addEventListener('mousedown', event => {
        coreCubeCanvasView.dragging = true;
        coreCubeCanvasView.dragMoved = false;
        coreCubeCanvasView.dragStartX = event.clientX;
        coreCubeCanvasView.dragStartY = event.clientY;
        coreCubeCanvasView.lastTrackballVector = coreCubeGetTrackballVector(event.clientX, event.clientY);
    });
    canvas.addEventListener('mousemove', event => {
        if (!coreCubeCanvasView.dragging) return;
        const dx = event.clientX - coreCubeCanvasView.dragStartX;
        const dy = event.clientY - coreCubeCanvasView.dragStartY;
        if (Math.hypot(dx, dy) > 4) coreCubeCanvasView.dragMoved = true;
        const currentVector = coreCubeGetTrackballVector(event.clientX, event.clientY);
        const previousVector = coreCubeCanvasView.lastTrackballVector;
        const axis = coreCubeCross(previousVector, currentVector);
        const axisLength = Math.hypot(axis[0], axis[1], axis[2]);
        if (axisLength > 0.0001) {
            const angle = Math.acos(Math.max(-1, Math.min(1, coreCubeDot(previousVector, currentVector))));
            const rotation = coreCubeCreateRotationMatrix(axis, angle * 1.35);
            coreCubeCanvasView.rotationMatrix = coreCubeMultiplyMatrices(rotation, coreCubeCanvasView.rotationMatrix);
            coreCubeCanvasView.lastTrackballVector = currentVector;
            drawCoreCubeCanvas();
        }
    });
    ['mouseup', 'mouseleave'].forEach(type => canvas.addEventListener(type, () => {
        coreCubeCanvasView.dragging = false;
        coreCubeCanvasView.lastTrackballVector = null;
    }));
    canvas.addEventListener('click', event => {
        if (coreCubeCanvasView.dragMoved) return;
        const rect = canvas.getBoundingClientRect();
        const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        for (const face of coreCubeCanvasView.projectedFaces) {
            if (coreCubePointInPolygon(point, face.points)) {
                selectCoreCubeFace(face.id);
                return;
            }
        }
    });
    if (!bindCoreCubeCanvas.resizeBound && typeof window !== 'undefined') {
        window.addEventListener('resize', resizeCoreCubeCanvas);
        bindCoreCubeCanvas.resizeBound = true;
    }
    resizeCoreCubeCanvas();
    startCoreCubeCanvasAnimation();
}

function initCoreCubeCanvas() {
    if (typeof document === 'undefined') return;
    const canvas = document.getElementById('coreCubeCanvas');
    if (!canvas) return;
    bindCoreCubeCanvas(canvas);
    resizeCoreCubeCanvas();
}


function renderCoreCubePanel() {
    if (typeof document === 'undefined') return;
    let host = document.getElementById('ui-core-cube-panel');
    if (!host || !game) return;
    let st = ensureCoreCubeState();
    let info = getCoreCubeUnlockInfo();
    let unlocked = isCoreCubeUnlocked();
    st = ensureCoreCubeState();
    let faceHtml = st.faces.map((value, idx) => {
        let cls = ['core-cube-face'];
        if (idx === st.selectedFace) cls.push('selected');
        if (value !== null) cls.push('powered');
        if (st.completed) cls.push('completed');
        return `<button type="button" class="${cls.join(' ')}" onclick="selectCoreCubeFace(${idx})"><span>${idx + 1}번 면</span><strong>${value === null ? '비어 있음' : value + ' 동력'}</strong></button>`;
    }).join('');
    let powerEntries = Object.keys(st.powers || {}).map(Number).sort((a, b) => a - b);
    let selectedFilled = st.faces[st.selectedFace] !== null;
    let inventoryHtml = powerEntries.length
        ? powerEntries.map(no => `<button type="button" class="core-cube-power" onclick="socketCoreCubePower(${no})" ${st.completed || selectedFilled || !unlocked ? 'disabled' : ''}>${no}의 동력원 <span>×${st.powers[no]}</span></button>`).join('')
        : '<div class="core-cube-muted">보유 동력원이 없습니다.</div>';
    let comboText = st.faces.every(v => v !== null) ? st.faces.slice().sort((a, b) => a - b).join(' / ') : '6면 각인 필요';
    let optionsHtml = (st.revealedOptions || []).length ? st.revealedOptions.map(row => `<div class="core-cube-option">${row.text || formatCoreCubeOption(row)}</div>`).join('') : '<div class="core-cube-muted">큐브를 완성하면 옵션 4줄이 발현됩니다.</div>';
    let blurredUseDisabled = unlocked && st.blurred45 > 0 ? '' : 'disabled';
    let blurredButtonsHtml = [
        '<button type="button" onclick="useCoreCubeBlurred45(1)" ' + blurredUseDisabled + '>1개</button>',
        '<button type="button" onclick="useCoreCubeBlurred45(5)" ' + blurredUseDisabled + '>5개</button>',
        '<button type="button" onclick="useCoreCubeBlurred45(10)" ' + blurredUseDisabled + '>10개</button>',
        '<button type="button" onclick="useCoreCubeBlurred45(\'all\')" ' + blurredUseDisabled + '>전부</button>'
    ].join('');
    let lockedHtml = `<div class="core-cube-locked"><strong>코어 큐브 잠김</strong><br>해금 조건: 지하계 10층 클리어 (${info.underworld10Cleared ? '완료' : `최고 ${info.highestFloor}층`}) · 루프 20 (${info.loopReady ? '완료' : `현재 ${info.currentLoop}`})</div>`;
    host.innerHTML = `${unlocked ? '' : lockedHtml}
        <div class="core-cube-shell ${st.completed ? 'completed' : ''} ${unlocked ? '' : 'locked'}">
            <div class="core-cube-stage">
                <div class="core-cube-stage-title"><span>Subterranean Core</span><strong>코어 큐브</strong></div>
                <div class="core-cube-canvas-wrap"><canvas id="coreCubeCanvas" aria-label="코어 큐브 3D 캔버스"></canvas></div>
                <div class="core-cube-stage-complete"><button type="button" class="core-cube-complete" onclick="completeCoreCube()" ${unlocked && !st.completed && st.faces.every(v => v !== null) ? '' : 'disabled'}>코어 큐브 완성</button></div>
                <div class="core-cube-faces">${faceHtml}</div>
            </div>
            <div class="core-cube-side">
                <div class="core-cube-card"><h3>흐릿한 45면체</h3><div class="core-cube-row"><span>보유 <strong>${st.blurred45}</strong></span>${blurredButtonsHtml}</div><p>사용 시 1~45 중 하나의 동력원을 획득합니다. 이 재료는 재화 목록에 표시되지 않습니다.</p>${st.lastPower ? `<p class="core-cube-good">최근 획득: ${st.lastPower}의 동력원</p>` : ''}</div>
                <div class="core-cube-card"><h3>동력원 보관함</h3><div class="core-cube-row"><span>선택 면: <strong>${st.selectedFace + 1}번</strong> · ${selectedFilled ? '<strong class="core-cube-good">각인됨</strong>' : '비어 있음'}</span><button type="button" onclick="socketRandomCoreCubePower(false)" ${unlocked && !st.completed && st.faces[st.selectedFace] === null && getCoreCubePowerTotal() > 0 ? '' : 'disabled'}>선택 면 무작위</button><button type="button" onclick="socketRandomCoreCubePower(true)" ${unlocked && !st.completed && getCoreCubePowerTotal() >= st.faces.filter(v => v === null).length && st.faces.some(v => v === null) ? '' : 'disabled'}>전체 무작위</button></div><div class="core-cube-inventory">${inventoryHtml}</div><p>동력원 버튼을 누르면 선택된 면에 즉시 각인됩니다. 각인된 동력원은 재구성 전까지 회수할 수 없습니다.</p></div>
                <div class="core-cube-card"><h3>큐브 완성</h3><div class="core-cube-row"><button type="button" class="core-cube-complete" onclick="completeCoreCube()" ${unlocked && !st.completed && st.faces.every(v => v !== null) ? '' : 'disabled'}>코어 큐브 완성</button><button type="button" onclick="resetCoreCube()" ${unlocked && (st.completed || st.faces.some(v => v !== null)) ? '' : 'disabled'}>재구성</button></div><p>현재 조합: <strong>${comboText}</strong></p><div class="core-cube-options">${optionsHtml}</div></div>
            </div>
        </div>`;
    initCoreCubeCanvas();
}

safeExposeGlobals({ getCoreCubeDefaultState, normalizeCoreCubeState, ensureCoreCubeState, getCoreCubeUnlockInfo, isCoreCubeUnlocked, maybeUnlockCoreCube, relockCoreCubeForLoop, canDropCoreCubeBlurred45, addCoreCubeBlurred45, addCoreCubePower, useCoreCubeBlurred45, selectCoreCubeFace, socketCoreCubePower, socketRandomCoreCubePower, resetCoreCube, completeCoreCube, generateCoreCubeOptions, getCoreCubeActiveStats, renderCoreCubePanel });
