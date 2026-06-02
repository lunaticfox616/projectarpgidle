// Core Cube content module.
// Keeps the blurred 45-polyhedron and cube power sources out of the normal currency list.
const CORE_CUBE_FACE_COUNT = 6;
const CORE_CUBE_POWER_MIN = 1;
const CORE_CUBE_POWER_MAX = 45;

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
        if (typeof addLog === 'function') addLog('🧊 흐릿한 45면체를 획득해 큐브 탭이 다시 열렸습니다.', 'loot-unique');
    } else {
        maybeUnlockCoreCube({ silent: true });
    }
    if (game && game.noti) game.noti.cube = true;
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

function removeCoreCubePower(powerNo, count = 1) {
    let st = ensureCoreCubeState();
    let n = Math.floor(Number(powerNo) || 0);
    let need = Math.max(1, Math.floor(Number(count) || 1));
    if (!st.powers[n] || st.powers[n] < need) return false;
    st.powers[n] -= need;
    if (st.powers[n] <= 0) delete st.powers[n];
    return true;
}

function useCoreCubeBlurred45() {
    if (!isCoreCubeUnlocked()) return addLog('코어 큐브가 아직 해금되지 않았습니다.', 'attack-monster');
    let st = ensureCoreCubeState();
    if (st.blurred45 <= 0) return addLog('흐릿한 45면체가 없습니다.', 'attack-monster');
    st.blurred45 -= 1;
    let rolled = 1 + Math.floor(Math.random() * CORE_CUBE_POWER_MAX);
    addCoreCubePower(rolled, 1);
    addLog(`🧊 흐릿한 45면체 해석: ${rolled}의 동력원 획득`, 'loot-unique');
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
    if (!removeCoreCubePower(n, 1)) return addLog(`${n}의 동력원이 부족합니다.`, 'attack-monster');
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
    let total = getCoreCubePowerTotal();
    let targetFaces = allRemaining ? emptyFaces : [st.selectedFace];
    targetFaces = targetFaces.filter(idx => st.faces[idx] === null);
    if (total < targetFaces.length) return addLog('동력원이 부족합니다.', 'attack-monster');
    targetFaces.forEach(idx => {
        let picked = pickRandomCoreCubePower();
        if (picked !== null && removeCoreCubePower(picked, 1)) st.faces[idx] = picked;
    });
    renderCoreCubePanel();
    updateStaticUI();
}

function getCoreCubePowerTotal() {
    let st = ensureCoreCubeState();
    return Object.values(st.powers || {}).reduce((sum, count) => sum + Math.max(0, Math.floor(count || 0)), 0);
}

function pickRandomCoreCubePower() {
    let st = ensureCoreCubeState();
    let total = getCoreCubePowerTotal();
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

function resetCoreCube() {
    let st = ensureCoreCubeState();
    if (!st.completed && st.faces.every(v => v === null)) return addLog('재구성할 큐브 각인이 없습니다.', 'attack-monster');
    if (!confirm('큐브를 재구성하면 각인된 동력원과 발현 옵션이 사라집니다. 진행할까요?')) return;
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
        { group:'defense', id:'deflect', stat:'deflectChance', label:'빗겨내기 확률', unit:'%', min:2, max:7 },
        { group:'defense', id:'block_max', stat:'blockChanceMax', label:'막기 확률 최대치', unit:'%', min:2, max:6 },
        { group:'defense', id:'deflect_reduce', stat:'deflectDamageReduce', label:'빗겨내기 피해 감소율', unit:'%', min:3, max:10 },
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
        if (def.extraMin) option.extraValue = coreCubeRandInt(rng, def.extraMin, def.extraMax || def.extraMin);
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

function renderCoreCubePanel() {
    let host = document.getElementById('ui-core-cube-panel');
    if (!host || !game) return;
    let st = ensureCoreCubeState();
    let info = getCoreCubeUnlockInfo();
    let unlocked = isCoreCubeUnlocked();
    let faceHtml = st.faces.map((value, idx) => {
        let cls = ['core-cube-face'];
        if (idx === st.selectedFace) cls.push('selected');
        if (value !== null) cls.push('powered');
        if (st.completed) cls.push('completed');
        return `<button class="${cls.join(' ')}" onclick="selectCoreCubeFace(${idx})"><span>${idx + 1}번 면</span><strong>${value === null ? '비어 있음' : value + ' 동력'}</strong></button>`;
    }).join('');
    let powerEntries = Object.keys(st.powers || {}).map(Number).sort((a, b) => a - b);
    let inventoryHtml = powerEntries.length ? powerEntries.map(no => `<button class="core-cube-power" onclick="socketCoreCubePower(${no})" ${st.completed ? 'disabled' : ''}>${no}의 동력원 <span>×${st.powers[no]}</span></button>`).join('') : '<div class="core-cube-muted">보유 동력원이 없습니다.</div>';
    let comboText = st.faces.every(v => v !== null) ? st.faces.slice().sort((a, b) => a - b).join(' / ') : '6면 각인 필요';
    let optionsHtml = (st.revealedOptions || []).length ? st.revealedOptions.map(row => `<div class="core-cube-option">${row.text || formatCoreCubeOption(row)}</div>`).join('') : '<div class="core-cube-muted">큐브를 완성하면 옵션 4줄이 발현됩니다.</div>';
    let lockedHtml = `<div class="core-cube-locked"><strong>코어 큐브 잠김</strong><br>해금 조건: 지하계 10층 클리어 (${info.underworld10Cleared ? '완료' : `최고 ${info.highestFloor}층`}) · 루프 20 (${info.loopReady ? '완료' : `현재 ${info.currentLoop}`})</div>`;
    host.innerHTML = `${unlocked ? '' : lockedHtml}
        <div class="core-cube-shell ${st.completed ? 'completed' : ''} ${unlocked ? '' : 'locked'}">
            <div class="core-cube-stage">
                <div class="core-cube-visual">
                    <div class="core-cube-orb">CORE<br>CUBE</div>
                    <div class="core-cube-ring"></div>
                </div>
                <div class="core-cube-faces">${faceHtml}</div>
            </div>
            <div class="core-cube-side">
                <div class="core-cube-card"><h3>흐릿한 45면체</h3><div class="core-cube-row"><span>보유 <strong>${st.blurred45}</strong></span><button onclick="useCoreCubeBlurred45()" ${unlocked && st.blurred45 > 0 ? '' : 'disabled'}>사용</button></div><p>사용 시 1~45 중 하나의 동력원을 획득합니다. 이 재료는 재화 목록에 표시되지 않습니다.</p>${st.lastPower ? `<p class="core-cube-good">최근 획득: ${st.lastPower}의 동력원</p>` : ''}</div>
                <div class="core-cube-card"><h3>동력원 보관함</h3><div class="core-cube-row"><span>선택 면: <strong>${st.selectedFace + 1}번</strong></span><button onclick="socketRandomCoreCubePower(false)" ${unlocked && !st.completed && st.faces[st.selectedFace] === null && getCoreCubePowerTotal() > 0 ? '' : 'disabled'}>선택 면 무작위</button><button onclick="socketRandomCoreCubePower(true)" ${unlocked && !st.completed && getCoreCubePowerTotal() >= st.faces.filter(v => v === null).length && st.faces.some(v => v === null) ? '' : 'disabled'}>전체 무작위</button></div><div class="core-cube-inventory">${inventoryHtml}</div></div>
                <div class="core-cube-card"><h3>큐브 완성</h3><div class="core-cube-row"><button class="core-cube-complete" onclick="completeCoreCube()" ${unlocked && !st.completed && st.faces.every(v => v !== null) ? '' : 'disabled'}>코어 큐브 완성</button><button onclick="resetCoreCube()" ${unlocked && (st.completed || st.faces.some(v => v !== null)) ? '' : 'disabled'}>재구성</button></div><p>현재 조합: <strong>${comboText}</strong></p><div class="core-cube-options">${optionsHtml}</div></div>
            </div>
        </div>`;
}

safeExposeGlobals({ getCoreCubeDefaultState, normalizeCoreCubeState, ensureCoreCubeState, getCoreCubeUnlockInfo, isCoreCubeUnlocked, maybeUnlockCoreCube, relockCoreCubeForLoop, canDropCoreCubeBlurred45, addCoreCubeBlurred45, addCoreCubePower, useCoreCubeBlurred45, selectCoreCubeFace, socketCoreCubePower, socketRandomCoreCubePower, resetCoreCube, completeCoreCube, generateCoreCubeOptions, getCoreCubeActiveStats, renderCoreCubePanel });
