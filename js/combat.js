// TODO: phased extraction target. Kept for load-order compatibility in phase 1.

const LEECH_SOFTCAP_START = 1.2;
const LEECH_SOFTCAP_MID = 2.5;
const LEECH_SOFTCAP_MID_EFF = 0.6;
const LEECH_SOFTCAP_HIGH_EFF = 0.3;
const LEECH_BASE_INSTANCE_CAP_PCT = 20;
const LEECH_BASE_TOTAL_CAP_PCT = 40;
const LEECH_BASE_RATE_CAP_PCT = 4;


function formatNumberKR(value) {
    let n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return Math.floor(n).toLocaleString('ko-KR');
}

function applyLeechSoftcap(rawLeech) {
    let raw = Math.max(0, Number(rawLeech) || 0);
    if (raw <= LEECH_SOFTCAP_START) return raw;
    let midSpan = Math.max(0, Math.min(raw, LEECH_SOFTCAP_MID) - LEECH_SOFTCAP_START);
    let highSpan = Math.max(0, raw - LEECH_SOFTCAP_MID);
    return LEECH_SOFTCAP_START + midSpan * LEECH_SOFTCAP_MID_EFF + highSpan * LEECH_SOFTCAP_HIGH_EFF;
}

function getLeechCaps(pStats, target) {
    let maxHp = Math.max(1, Number(pStats && pStats.maxHp) || 1);
    let maxEnergyShield = Math.max(0, Number(pStats && pStats.energyShield) || 0);
    let leechPool = target === 'energyShield' ? Math.max(1, maxEnergyShield) : maxHp;
    let instancePct = Math.max(0, LEECH_BASE_INSTANCE_CAP_PCT + (Number(pStats && pStats.leechInstanceCap) || 0));
    let totalPct = Math.max(0, LEECH_BASE_TOTAL_CAP_PCT + (Number(pStats && pStats.leechTotalCap) || 0));
    let ratePct = Math.max(0, LEECH_BASE_RATE_CAP_PCT + (Number(pStats && pStats.leechRateCap) || 0));
    return {
        instanceCap: leechPool * instancePct / 100,
        totalCap: leechPool * totalPct / 100,
        rateCap: leechPool * ratePct / 100,
        instancePct: instancePct,
        totalPct: totalPct,
        ratePct: ratePct
    };
}
function getActiveLeechInstances() {
    game.playerLeechInstances = Array.isArray(game.playerLeechInstances) ? game.playerLeechInstances : [];
    game.playerLeechInstances = game.playerLeechInstances
        .map(inst => ({
            remaining: Math.max(0, Number(inst && inst.remaining) || 0),
            rate: Math.max(0, Number(inst && inst.rate) || 0),
            target: inst && inst.target === 'energyShield' ? 'energyShield' : 'life'
        }))
        .filter(inst => inst.remaining > 0 && inst.rate > 0);
    return game.playerLeechInstances;
}
function getLeechOutstandingTotal() {
    return getActiveLeechInstances().reduce((sum, inst) => sum + Math.max(0, inst.remaining || 0), 0);
}
function addPlayerLeechInstance(rawAmount, pStats, target) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 0) return 0;
    let caps = getLeechCaps(pStats, target === 'energyShield' ? 'energyShield' : 'life');
    if (caps.instanceCap <= 0 || caps.totalCap <= 0 || caps.rateCap <= 0) return 0;
    let instances = getActiveLeechInstances();
    let outstanding = instances.reduce((sum, inst) => sum + Math.max(0, inst.remaining || 0), 0);
    let allowed = Math.max(0, caps.totalCap - outstanding);
    let stored = Math.min(amount, caps.instanceCap, allowed);
    if (stored <= 0) return 0;
    instances.push({
        remaining: stored,
        rate: caps.rateCap,
        target: target === 'energyShield' ? 'energyShield' : 'life'
    });
    game.playerLeechInstances = instances;
    return stored;
}
function applyInstantPlayerLeech(rawAmount, pStats, target) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 0) return 0;
    let leechTarget = target === 'energyShield' ? 'energyShield' : 'life';
    let caps = getLeechCaps(pStats, leechTarget);
    if (caps.instanceCap <= 0) return 0;
    let instantAmount = Math.min(amount, caps.instanceCap);
    if (instantAmount <= 0) return 0;
    if (leechTarget === 'energyShield') {
        let esCap = Math.max(0, Number(pStats && pStats.energyShield) || 0);
        if (esCap <= 0) return 0;
        let before = Math.max(0, Number(game.playerEnergyShield) || 0);
        game.playerEnergyShield = Math.min(esCap, before + instantAmount);
        return Math.max(0, game.playerEnergyShield - before);
    }
    let hpCap = getPlayerHpCap(pStats);
    let before = Math.max(0, Number(game.playerHp) || 0);
    game.playerHp = Math.min(hpCap, before + instantAmount);
    return Math.max(0, game.playerHp - before);
}
function tickPlayerLeech(pStats, dt) {
    let instances = getActiveLeechInstances();
    if (instances.length === 0 || dt <= 0) return 0;
    let hpCap = getPlayerHpCap(pStats);
    let esCap = Math.max(0, Number(pStats && pStats.energyShield) || 0);
    let healed = 0;
    let next = [];
    instances.forEach(inst => {
        let tick = Math.min(inst.remaining, inst.rate * dt);
        if (tick <= 0) return;
        if (inst.target === 'energyShield') {
            if (esCap > 0) {
                let before = Math.max(0, Number(game.playerEnergyShield) || 0);
                game.playerEnergyShield = Math.min(esCap, before + tick);
                healed += Math.max(0, game.playerEnergyShield - before);
            }
        } else {
            let before = Math.max(0, Number(game.playerHp) || 0);
            game.playerHp = Math.min(hpCap, before + tick);
            healed += Math.max(0, game.playerHp - before);
        }
        inst.remaining = Math.max(0, inst.remaining - tick);
        if (inst.remaining > 0) next.push(inst);
    });
    game.playerLeechInstances = next;
    return healed;
}

function hasKeystone(id) {
    return Array.isArray(game.ascendKeystones) && game.ascendKeystones.includes(id);
}

function getPlayerHpCap(pStats) {
    if (!pStats) return 0;
    let maxHp = Math.max(0, pStats.maxHp || 0);
    return (game.ascendClass === 'warrior' && hasKeystone('w8')) ? (maxHp * 0.5) : maxHp;
}

function isDualWielding() {
    let mainWeapon = game.equipment && game.equipment['무기'];
    let neckWeapon = game.equipment && game.equipment['목걸이'];
    return !!(mainWeapon && neckWeapon && neckWeapon.slot === '무기');
}



function cleanupConditionGemStates(now) {
    function triggerCurseExpireEffects(enemyId, deb) {
        if (!deb || deb.name !== '파멸 징표') return;
        let pending = game.enemyCurseExpirePayloads || {};
        let row = pending[enemyId];
        if (!row || !row.doomDamage) return;
        let enemy = (game.enemies || []).find(e => e && e.id === enemyId && e.hp > 0);
        if (!enemy) return;
        let bonus = Math.max(0, Math.floor(row.doomDamage * 0.16));
        if (bonus <= 0) return;
        enemy.hp = Math.max(0, enemy.hp - bonus);
        if (game.settings && game.settings.showCombatLog !== false) addLog(`💀 파멸 징표 폭발: ${formatNumberKR(bonus)} 추가 피해`, 'attack-monster', { noToast: true });
        if (enemy.hp <= 0) handleEnemyDeath(enemy, getPlayerStats());
        delete pending[enemyId];
        game.enemyCurseExpirePayloads = pending;
    }
    game.playerConditionBuffs = (game.playerConditionBuffs || []).filter(buff => buff && (buff.expiresAt || 0) > now);
    let map = game.enemyConditionDebuffs || {};
    Object.keys(map).forEach(id => {
        let next = [];
        (map[id] || []).forEach(deb => {
            if (!deb || (deb.expiresAt || 0) <= now) {
                triggerCurseExpireEffects(Number(id), deb);
                return;
            }
            next.push(deb);
        });
        map[id] = next;
        if (map[id].length === 0) delete map[id];
    });
    game.enemyConditionDebuffs = map;
}

function getConditionGemLevel(name) {
    let levels = game.conditionGemLevels || {};
    return Math.max(1, Math.min(5, Math.floor(levels[name] || 1)));
}

function getConditionGemStatDelta(name, type) {
    const PRESETS = {
        // Curses
        '재의 표식': { enemyResFShred: 10, igniteChanceAdd: 0.15, igniteTakenMul: 1.10 },
        '빙결의 낙인': { enemyResCShred: 10, chillChanceAdd: 0.10, freezeChanceAdd: 0.10, chillTakenMul: 1.10, freezeTakenMul: 1.10 },
        '감전 문양': { enemyResLShred: 10, shockChanceAdd: 0.10, shockTakenMul: 1.10 },
        '부패 각인': { enemyResChaosShred: 10, poisonChanceAdd: 0.10, poisonTakenMul: 1.10 },
        '균열 저주': { enemyResShred: 15, enemyResChaosShred: 15 },
        '취약의 낙인': { enemyTakenMul: 1.15 },
        '파멸 징표': { doomMark: 1 },
        '쇠약의 기도': { enemyDmgMul: 0.90, enemyAspdSlow: 0.10 },
        '타오른 죄책': { enemyResFShred: 8, fireDotTakenMul: 1.06, igniteTakenMul: 1.06 },
        '천둥 포박': { enemyLightTakenMul: 1.10, enemyCritDmgTakenMul: 1.10 },
        '절단의 맹세': { enemyPhysDrShred: 10, bleedChanceAdd: 0.10, bleedTakenMul: 1.15 },
        '심연 고리': { enemyResChaosShred: 10, enemyChaosTakenMul: 1.10 },
        '상처 악화': { enemyRegenRateMul: 0.60 },
        '약점 조준': { enemyProjectileTakenMul: 1.10, projectileExtraHits: 2 },
        // Warcries
        '전장의 함성': { pctDmg: 16, aspd: 12, dr: 6, move: 8 },
        '피의 함성': { pctDmg: 22, leech: 0.9, hpSacrificePct: 6 },
        '추적자의 함성': { aspd: 14, targetAny: 1, crit: 6, move: 12 },
        '용광의 외침': { pctDmg: 15, fireBonus: 0.12, leech: 0.4, regen: 0.8 },
        '빙하의 포효': { pctDmg: 13, coldBonus: 0.12, dr: 8, energyShieldRegen: 2 },
        '폭풍의 고함': { aspd: 16, crit: 5 },
        '공허의 외침': { pctDmg: 17, chaosBonus: 0.15, resPen: 8, leech: 0.7 },
        '결전 신호': { pctDmg: 24, dr: -4, critDmg: 30 },
        '지진의 함성': { slamEchoPct: 0.25, slamEchoDelaySec: 1.0 },
        // Guards
        '원소 장막': { dr: 22, resAll: 10, maxResAll: 4 },
        '가시 방패': { dr: 20, thorns: 0.26, physIgnore: 10 },
        '현무 장막': { dr: 22, resAll: 10, maxResAll: 4 },
        '응보 방패': { dr: 20, thorns: 0.26, physIgnore: 10 },
        '철의 맹세': { dr: 25, aspd: -8, armorMul: 0.20 },
        '서리 장벽': { dr: 14, coldGuard: 0.2, cleanseChill: 1, cleanseFreeze: 1, immuneChill: 1, immuneFreeze: 1 },
        '폭풍 장벽': { dr: 15, move: 16, aspd: 10, cleanseShock: 1, immuneShock: 1 },
        '심연 껍질': { dr: 20, chaosGuard: 0.28, regen: 1.0, resChaos: 12 },
        '용암 벽': { dr: 15, fireGuard: 0.2, cleanseIgnite: 1, immuneIgnite: 1 },
        '이독제독': { dr: 18, poisonToHeal: 1 },
        '불멸의 힘': { delayedRegenFromTakenDamage: 0.25 },
        '에너지 과다': { dr: 10, energyShieldRegen: 12.5, energyShieldRechargeDelayDelta: -0.5 },
        '무혈': { dr: 14, cleanseBleed: 1, immuneBleed: 1, disableEnemyLeech: 1 },
        // Utility
        '귀환 젬': { }
    };
    let base = PRESETS[name] || (type === 'warcry' ? { pctDmg: 10, aspd: 8 } : (type === 'guard' ? { dr: 10, regen: 0.6 } : (type === 'curse' ? { enemyTakenMul: 1.1, enemyResShred: 6 } : {})));
    let level = getConditionGemLevel(name);
    let scale = 1 + ((level - 1) * 0.125);
    let out = {};
    Object.keys(base).forEach(key => {
        let val = base[key];
        if (typeof val !== 'number') { out[key] = val; return; }
        if (key === 'enemyTakenMul') out[key] = 1 + ((val - 1) * scale);
        else out[key] = val * scale;
    });
    return out;
}

function getEnemyConditionDebuffFactor(enemy) {
    let list = (game.enemyConditionDebuffs && enemy) ? (game.enemyConditionDebuffs[enemy.id] || []) : [];
    let fx = { mul: 1, resShred: 0, resFShred: 0, resCShred: 0, resLShred: 0, resChaosShred: 0, physDrShred: 0, projectileTakenMul: 1, lightTakenMul: 1, chaosTakenMul: 1, enemyDmgMul: 1, enemyRegenRateMul: 1, projectileExtraHits: 0, critDmgTakenMul: 1 };
    list.forEach(deb => {
        let d = getConditionGemStatDelta(deb.name, 'curse');
        fx.mul *= (d.enemyTakenMul || 1);
        fx.resShred += (d.enemyResShred || 0);
        fx.resFShred += (d.enemyResFShred || 0);
        fx.resCShred += (d.enemyResCShred || 0);
        fx.resLShred += (d.enemyResLShred || 0);
        fx.resChaosShred += (d.enemyResChaosShred || 0);
        fx.physDrShred += (d.enemyPhysDrShred || 0);
        fx.projectileTakenMul *= (d.enemyProjectileTakenMul || 1);
        fx.lightTakenMul *= (d.enemyLightTakenMul || 1);
        fx.chaosTakenMul *= (d.enemyChaosTakenMul || 1);
        fx.enemyDmgMul *= (d.enemyDmgMul || 1);
        fx.enemyRegenRateMul *= (d.enemyRegenRateMul || 1);
        fx.projectileExtraHits += (d.projectileExtraHits || 0);
        fx.critDmgTakenMul *= (d.enemyCritDmgTakenMul || 1);
    });
    fx.mul = Math.min(1.35, fx.mul);
    fx.resShred = Math.min(20, fx.resShred);
    return fx;
}


function getKeystoneEnemyTakenMultiplier(enemy, hitElement) {
    if (!enemy) return 1;
    let now = Date.now();
    let mul = 1;
    let debuffs = game.enemyKeystoneDebuffs || {};
    let list = debuffs[enemy.id] || [];
    list = list.filter(row => row && (row.expiresAt || 0) > now);
    debuffs[enemy.id] = list;
    game.enemyKeystoneDebuffs = debuffs;
    let a3Stacks = list.filter(row => row.type === 'a3').length;
    if (a3Stacks > 0) mul *= (1 + Math.min(10, a3Stacks) * 0.06);
    return mul;
}

function getAllConditionGemEntriesForCombat() {
    let db = window.CONDITION_GEM_DB || {};
    return [].concat(db.curse || [], db.warcry || [], db.guard || [], db.utility || []);
}

function runConditionGemAutoRules(pStats) {
    let now = Date.now();
    cleanupConditionGemStates(now);
    // 조건 젬 시전 중에는 추가 자동 시전을 예약하지 않는다.
    // (HP 50% 이하 같은 조건에서 함성/가드가 연쇄로 걸리면 일반 공격이 영구 차단될 수 있음)
    if (now < Math.floor(game.playerCastDelayUntil || 0)) return;
    if (!game.conditionGemUnlocked) return;
    if (!Array.isArray(game.skillAutoRules) || game.skillAutoRules.length === 0) return;
    game.conditionGemCooldowns = game.conditionGemCooldowns || {};
    game.enemyConditionDebuffs = game.enemyConditionDebuffs || {};
    game.playerConditionBuffs = Array.isArray(game.playerConditionBuffs) ? game.playerConditionBuffs : [];
    let rules = game.skillAutoRules.filter(r => r && r.enabled).sort((a,b)=>(a.priority||0)-(b.priority||0));
    for (let rule of rules) {
        let hpPct = (pStats.maxHp || 1) > 0 ? (game.playerHp / pStats.maxHp * 100) : 100;
        let esPct = (pStats.energyShield || 0) > 0 ? ((game.playerEnergyShield || 0) / Math.max(1, pStats.energyShield) * 100) : 0;
        let trigger = rule.triggerType || 'hp_below';
        let threshold = rule.hpThreshold || 40;
        let liveEnemies = (game.enemies || []).filter(e => e && e.hp > 0);
        let liveCount = liveEnemies.length;
        let hasLiveBoss = liveEnemies.some(e => e.isBoss);
        if (trigger === 'hp_below' && hpPct > threshold) continue;
        if (trigger === 'hp_above' && hpPct < threshold) continue;
        if (trigger === 'enemy_many' && liveCount < threshold) continue;
        if (trigger === 'enemy_few' && (liveCount <= 0 || liveCount > threshold)) continue;
        if (trigger === 'es_below' && esPct > threshold) continue;
        if (trigger === 'es_above' && esPct < threshold) continue;
        if (trigger === 'boss_present' && !hasLiveBoss) continue;
        if (trigger === 'boss_absent' && (liveCount <= 0 || hasLiveBoss)) continue;
        let gemName = (rule.skillName || '').trim();
        if (!gemName || !(game.conditionGemPool || []).includes(gemName)) continue;
        let entry = getAllConditionGemEntriesForCombat().find(e => e.name === gemName);
        if (!entry) continue;
        let until = game.conditionGemCooldowns[gemName] || 0;
        if (now < until) continue;
        let castTargetId = null;
        if (entry.type === 'curse') {
            let target = (game.enemies || []).find(e => e && e.hp > 0 && !e.curseImmune);
            if (!target) continue;
            castTargetId = target.id;
            let limit = Math.max(1, Math.floor((pStats.curseCap || 1)));
            let list = game.enemyConditionDebuffs[target.id] || [];
            let existingIdx = list.findIndex(row => row && row.name === gemName);
            let durMul=1+Math.max(0,Number(pStats&&pStats.uniqueConditionManual&&pStats.uniqueConditionManual.durationPct)||0)/100;
            let nextExpire = now + Math.floor((entry.duration || 6) * 1000 * durMul);
            if (existingIdx >= 0) {
                list[existingIdx].expiresAt = nextExpire;
            } else {
                list.push({ name: gemName, expiresAt: nextExpire });
            }
            // 저주 최대치는 "서로 다른 저주 종류" 기준으로 제한
            let seen = new Set();
            list = list.filter(row => {
                if (!row || !row.name) return false;
                if (seen.has(row.name)) return false;
                seen.add(row.name);
                return true;
            });
            while (list.length > limit) list.shift();
            game.enemyConditionDebuffs[target.id] = list;
            if (gemName === '파멸 징표') {
                let store = game.enemyCurseExpirePayloads || {};
                store[target.id] = { doomDamage: 0 };
                game.enemyCurseExpirePayloads = store;
            }
        } else {
            let durMul=1+Math.max(0,Number(pStats&&pStats.uniqueConditionManual&&pStats.uniqueConditionManual.durationPct)||0)/100;
            game.playerConditionBuffs.push({ name: gemName, type: entry.type, expiresAt: now + Math.floor((entry.duration || 4) * 1000 * durMul) });
            let castDelta = getConditionGemStatDelta(gemName, entry.type);
            if (castDelta.hpSacrificePct) game.playerHp = Math.max(1, game.playerHp * (1 - castDelta.hpSacrificePct / 100));
        }
        let cdr=Math.max(0,Number(pStats&&pStats.uniqueConditionManual&&pStats.uniqueConditionManual.cdrPct)||0);
        game.conditionGemCooldowns[gemName] = now + Math.max(2000, Math.floor(((entry.castTime || 1) * 1000 + 2500) * (1 - cdr/100)));
        if (gemName === '귀환 젬') returnToTown();
        let castDelayMs = Math.max(0, Math.floor((entry.castTime || 0) * 1000));
        game.playerCastDelayUntil = Math.max(now, Math.floor(game.playerCastDelayUntil || 0), now + castDelayMs);
        game.lastConditionGemCast = { name: gemName, type: entry.type, targetId: castTargetId, expiresAt: now + 1100 };
        if (!game.settings || game.settings.showCombatLog !== false) addLog(`🧠 [${gemName}] 발동`, 'attack-monster', { noToast: true });
        break;
    }
}


function snapshotWoodsmanBuildState() {
    return JSON.parse(JSON.stringify({
        passives: game.passives || [],
        ascendNodes: game.ascendNodes || [],
        ascendKeystones: game.ascendKeystones || [],
        passivePoints: game.passivePoints || 0,
        seasonPoints: game.seasonPoints || 0,
        ascendPoints: game.ascendPoints || 0,
        ascendKeystonePoints: game.ascendKeystonePoints || 0,
        scour: game.scour || 0,
        equipment: game.equipment || {},
        inventory: game.inventory || [],
        skills: game.skills || [],
        activeSkill: game.activeSkill || '기본 공격',
        supports: game.supports || [],
        equippedSupports: game.equippedSupports || [],
        supportGemData: game.supportGemData || {},
        playerLeechInstances: game.playerLeechInstances || [],
        gemData: game.gemData || {},
        jewelInventory: game.jewelInventory || [],
        jewelSlots: game.jewelSlots || [null, null],
        jewelSlotAmplify: game.jewelSlotAmplify || [0,0],
        talismanInventory: game.talismanInventory || [],
        talismanBoard: game.talismanBoard || [],
        talismanPlacements: game.talismanPlacements || {},
        starWedge: game.starWedge || {}
    }));
}

function enforceWoodsmanBuildLock() {
    if (!game.woodsmanBuildLock || !game.woodsmanBuildSnapshot) return;
    let snap = game.woodsmanBuildSnapshot;
    game.passives = JSON.parse(JSON.stringify(snap.passives));
    game.ascendNodes = JSON.parse(JSON.stringify(snap.ascendNodes));
    game.ascendKeystones = JSON.parse(JSON.stringify(snap.ascendKeystones));
    game.passivePoints = Math.floor(snap.passivePoints || 0);
    game.seasonPoints = Math.floor(snap.seasonPoints || 0);
    game.ascendPoints = Math.floor(snap.ascendPoints || 0);
    game.ascendKeystonePoints = Math.floor(snap.ascendKeystonePoints || 0);
    game.scour = Math.floor(snap.scour || 0);
    game.equipment = JSON.parse(JSON.stringify(snap.equipment));
    game.inventory = JSON.parse(JSON.stringify(snap.inventory));
    game.skills = JSON.parse(JSON.stringify(snap.skills));
    game.activeSkill = snap.activeSkill;
    game.supports = JSON.parse(JSON.stringify(snap.supports));
    game.equippedSupports = JSON.parse(JSON.stringify(snap.equippedSupports));
    game.supportGemData = JSON.parse(JSON.stringify(snap.supportGemData));
    game.playerLeechInstances = JSON.parse(JSON.stringify(snap.playerLeechInstances || []));
    game.gemData = JSON.parse(JSON.stringify(snap.gemData));
    game.jewelInventory = JSON.parse(JSON.stringify(snap.jewelInventory));
    game.jewelSlots = JSON.parse(JSON.stringify(snap.jewelSlots));
    game.jewelSlotAmplify = JSON.parse(JSON.stringify(snap.jewelSlotAmplify));
    game.talismanInventory = JSON.parse(JSON.stringify(snap.talismanInventory));
    game.talismanBoard = JSON.parse(JSON.stringify(snap.talismanBoard));
    game.talismanPlacements = JSON.parse(JSON.stringify(snap.talismanPlacements));
    game.starWedge = JSON.parse(JSON.stringify(snap.starWedge));
}

function clearWoodsmanBuildLock() {
    game.woodsmanEntrancePending = false;
    resetWoodsmanCurse();
    if (game.woodsmanBuildLock && game.woodsmanBuildSnapshot) {
        // 마지막으로 스냅샷 기준으로 복원
        enforceWoodsmanBuildLock();
    }
    game.woodsmanBuildLock = false;
    game.woodsmanBuildSnapshot = null;
}


function sanitizeCombatRuntimeState() {
    if (!Number.isFinite(game.playerHp)) game.playerHp = 1;
    game.enemies = Array.isArray(game.enemies) ? game.enemies : [];
    game.enemies.forEach(enemy => {
        if (!enemy) return;
        if (!Number.isFinite(enemy.hp)) enemy.hp = 0;
        if (!Number.isFinite(enemy.energyShield)) enemy.energyShield = 0;
        if (!Number.isFinite(enemy.attackTimer)) enemy.attackTimer = 0;
    });
    // NaN 체력 엔트리가 남아 있으면 hp>0 판정에는 걸리지 않지만 배열 길이는 유지되어
    // 보스전 종료/맵 진행 정산이 멈춘 것처럼 보일 수 있다.
    let invalidOrDead = (game.enemies || []).filter(enemy => enemy && (!Number.isFinite(enemy.hp) || enemy.hp <= 0));
    if (invalidOrDead.length > 0) {
        invalidOrDead.forEach(enemy => {
            if (enemy && Number.isFinite(enemy.id)) handleEnemyDeath(enemy, getPlayerStats());
        });
        game.enemies = (game.enemies || []).filter(enemy => enemy && Number.isFinite(enemy.hp) && enemy.hp > 0);
    }
}

function coreLoop() {
    if (game.woodsmanBuildLock) enforceWoodsmanBuildLock();
    tickWoodsmanCurse();
    if (ensurePendingLoopHeroSelectionPrompt()) return;
    const pStats = getPlayerStats();
    // Guard against malformed stat payloads from legacy saves/runtime merges.
    // If ASPD becomes NaN/<=0, pTimer never advances and combat appears frozen.
    if (!Number.isFinite(pStats.aspd) || pStats.aspd <= 0) pStats.aspd = 1;
    if (!Number.isFinite(pStats.moveSpeed) || pStats.moveSpeed <= 0) pStats.moveSpeed = 100;
    if (!Number.isFinite(pStats.maxHp) || pStats.maxHp <= 0) pStats.maxHp = 1;
    if (!Number.isFinite(pTimer) || pTimer < 0) pTimer = 0;
    if (!Number.isFinite(game.playerCastDelayUntil)) game.playerCastDelayUntil = 0;
    sanitizeCombatRuntimeState();
    reconcileMapProgressRuntimeState();
    runConditionGemAutoRules(pStats);
    processPendingSlamEchoHits();
    tickAilments(pStats, 0.1);
    let ailmentMap = {};
    (game.playerAilments || []).forEach(ail => { ailmentMap[ail.type] = Math.max(ailmentMap[ail.type] || 0, ail.time || 0); });
    if (ailmentMap.chill) pStats.aspd *= 0.68;
    if (ailmentMap.shock) pStats.dr = pStats.uniqueShockInvertTaken ? Math.min(90, pStats.dr + 22) : Math.max(-40, pStats.dr - 22);
    (game.playerConditionBuffs || []).forEach(buff => {
        let delta = getConditionGemStatDelta(buff.name, buff.type);
        if (delta.pctDmg) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta.pctDmg / 100));
        if (delta.aspd) pStats.aspd *= (1 + delta.aspd / 100);
        if (delta.dr) pStats.dr = Math.min(90, (pStats.dr || 0) + delta.dr);
        if (delta.regen) pStats.regen += delta.regen;
        if (delta.crit) pStats.crit += delta.crit;
        if (delta.critDmg) pStats.critDmg += delta.critDmg;
        if (delta.resPen) pStats.resPen += delta.resPen;
        if (delta.targetAny) pStats.sSkill.targets = Math.min(8, (pStats.sSkill.targets || 1) + delta.targetAny);
        if (delta.leech) pStats.leech += delta.leech;
        if (delta.move) pStats.move += delta.move;
        if (delta.resAll) {
            pStats.resF += delta.resAll;
            pStats.resC += delta.resAll;
            pStats.resL += delta.resAll;
        }
        if (delta.maxResAll) {
            pStats.resF += delta.maxResAll;
            pStats.resC += delta.maxResAll;
            pStats.resL += delta.maxResAll;
        }
        if (delta.resChaos) pStats.resChaos += delta.resChaos;
        if (delta.energyShieldRegen) pStats.energyShieldRegenRate = Math.max(0, (pStats.energyShieldRegenRate || 0) + delta.energyShieldRegen);
        if (delta.fireBonus && (pStats.sSkill.ele === 'fire')) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta.fireBonus));
        if (delta.coldBonus && (pStats.sSkill.ele === 'cold')) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta.coldBonus));
        if (delta.chaosBonus && (pStats.sSkill.ele === 'chaos')) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta.chaosBonus));
        if (delta.physBonus && (pStats.sSkill.ele === 'phys')) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta.physBonus));
        if (delta.energyShieldRechargeDelayDelta) pStats.energyShieldRechargeDelay = Math.max(0, (pStats.energyShieldRechargeDelay || 3) + delta.energyShieldRechargeDelayDelta);
        if (delta.poisonToHeal) pStats.poisonToHeal = true;
        if (delta.disableEnemyLeech) pStats.disableEnemyLeech = true;
        if (delta.delayedRegenFromTakenDamage) pStats.delayedRegenFromTakenDamage = Math.max(pStats.delayedRegenFromTakenDamage || 0, delta.delayedRegenFromTakenDamage);
        if (delta.armorMul) pStats.dr += Math.max(0, (pStats.dr || 0) * delta.armorMul);
        if (delta.immuneIgnite) pStats.immuneIgnite = true;
        if (delta.immuneChill) pStats.immuneChill = true;
        if (delta.immuneFreeze) pStats.immuneFreeze = true;
        if (delta.immuneShock) pStats.immuneShock = true;
        if (delta.immuneBleed) pStats.immuneBleed = true;
        if (delta.cleanseIgnite || delta.cleanseChill || delta.cleanseFreeze || delta.cleanseShock || delta.cleanseBleed) {
            game.playerAilments = (game.playerAilments || []).filter(ail => {
                if (!ail) return false;
                if (delta.cleanseIgnite && ail.type === 'ignite') return false;
                if (delta.cleanseChill && ail.type === 'chill') return false;
                if (delta.cleanseFreeze && ail.type === 'freeze') return false;
                if (delta.cleanseShock && ail.type === 'shock') return false;
                if (delta.cleanseBleed && ail.type === 'bleed') return false;
                return true;
            });
        }
    });
    if (isDeathOverlayOpen()) return;
    if (!Number.isFinite(game.runProgress) || game.runProgress < 0) game.runProgress = 0;
    if (!Number.isFinite(game.moveTimer)) game.moveTimer = 0;
    if ((Number(game.playerHp) || 0) <= 0) {
        handlePlayerDefeat(getZone(game.currentZoneId) || getZone(0), pStats, "☠️ 치명상을 입어 쓰러졌습니다.", { fatalElement: 'other', sourceName: '치명상' });
        return;
    }
    if (game.woodsmanEntrancePending && game.moveTimer <= 0) {
        finishWoodsmanEntrance();
        return;
    }
    if (game.combatHalted && game.moveTimer > 0) {
        game.moveTimer -= 0.1;
        if (game.moveTimer <= 0) {
            game.lastMoveEndedAt = Date.now();
            game.uniqueRiderCompassConsumed = false;
            if (!finishWoodsmanEntrance()) startEncounterRun();
        }
        return;
    }
    if (game.combatHalted) {
        let beehive = game.beehive || {};
        let beehiveLocked = typeof isBeehiveRunLockedForMapTravel === 'function'
            ? isBeehiveRunLockedForMapTravel()
            : (!!beehive.inRun && game.currentZoneId === 'beehive_run');
        // stale beehive flags from older saves can keep combatHalted forever on normal zones.
        // only an active beehive expedition should block halt recovery.
        let beehivePause = !!(beehiveLocked && game.currentZoneId === 'beehive_run' && !beehive.awaitingClear);
        let stopByMapSetting = (game.settings.mapCompleteAction || 'nextZone') === 'stop';
        let stopByTownSetting = (game.settings.townReturnAction || 'retry') === 'stop';
        let manualStopState = stopByMapSetting || stopByTownSetting || !!game.pendingLoopDecision;
        if (beehivePause || game.inTicketBossFight || manualStopState) return;
        game.combatHalted = false;
    }
    if (game.playerHp > 0 && game.playerHp < pStats.maxHp) {
        let hpCap = getPlayerHpCap(pStats);
        game.playerHp = Math.min(hpCap, game.playerHp + (pStats.maxHp * (pStats.regen / 100)) * 0.1);
    }
    if ((game.delayedGuardHealPool || 0) > 0) {
        let tickHeal = Math.max(0, (game.delayedGuardHealPool / 4) * 0.1);
        let hpCap = getPlayerHpCap(pStats);
        game.playerHp = Math.min(hpCap, game.playerHp + tickHeal);
        game.delayedGuardHealPool = Math.max(0, game.delayedGuardHealPool - tickHeal);
    }
    tickPlayerLeech(pStats, 0.1);
    if (!Number.isFinite(game.playerEnergyShield)) game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerEnergyShield = Math.max(0, Math.min(game.playerEnergyShield, Math.floor(pStats.energyShield || 0)));
    if (!Number.isFinite(game.playerEsLastHitAt)) game.playerEsLastHitAt = 0;
    if ((pStats.energyShield || 0) > 0 && game.playerEnergyShield < (pStats.energyShield || 0)) {
        let sinceHit = (Date.now() - (game.playerEsLastHitAt || 0)) / 1000;
        if (sinceHit >= (pStats.energyShieldRechargeDelay || 3)) {
            let regenPerSec = (pStats.energyShield || 0) * ((pStats.energyShieldRegenRate || 12.5) / 100);
            game.playerEnergyShield = Math.min((pStats.energyShield || 0), game.playerEnergyShield + regenPerSec * 0.1);
        }
    }

    if (game.moveTimer > 0) {
        game.moveTimer -= 0.1;
        if (game.moveTimer <= 0) {
            if (game.isTownReturning) {
                game.isTownReturning = false;
                if ((game.settings.townReturnAction || 'retry') === 'stop') {
                    game.combatHalted = true;
                    game.enemies = [];
                    game.encounterPlan = [];
                    game.encounterIndex = 0;
                    game.runProgress = 0;
                    updateStaticUI();
                    return;
                }
            }
            if (!finishWoodsmanEntrance()) startEncounterRun();
        }
        return;
    }
    if (game.woodsmanEntrancePending) {
        finishWoodsmanEntrance();
        return;
    }

    syncCrowdPauseState();
    if ((typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun)) && !(game.beehive && game.beehive.awaitingClear)) return;
    let progressBefore = game.runProgress;
    let zoneNow = getZone(game.currentZoneId);
    let vRift = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0, pendingWave: false, totalToSpawn: 0, spawnedCount: 0, spawnTick: 0 });
    let holdMapProgress = !!(zoneNow && zoneNow.type === "abyss" && vRift.active);
    if (!holdMapProgress) advanceMapProgress(pStats);
    if (game.moveTimer <= 0 && (game.enemies || []).length === 0) {
        if (game.runProgress <= progressBefore + 0.0001) progressStallTicks++;
        else progressStallTicks = 0;
        if (progressStallTicks >= 20) {
            ensureEncounterRun();
            game.runProgress = Math.min(99.9, progressBefore + 0.4);
            progressStallTicks = 0;
        }
    } else {
        progressStallTicks = 0;
    }
    if ((game.enemies || []).length > 0) {
        tickEnemyDotEffects(pStats, 0.1);
        tickEnemyAilments(pStats, 0.1);
        let nowCast = Date.now();
        let castUntil = Math.floor(game.playerCastDelayUntil || 0);
        if (!Number.isFinite(castUntil) || castUntil < 0) castUntil = 0;
        if (castUntil > nowCast + 5000) { castUntil = nowCast + 500; game.playerCastDelayUntil = castUntil; }
        let castBlocked = nowCast < castUntil;
        if (!castBlocked) pTimer += 0.1 * pStats.aspd;
        while (!castBlocked && pTimer >= 1.0 && game.enemies.length > 0) {
            pTimer -= 1.0;
            performPlayerAttack(pStats);
            let dsChance = Math.max(0, pStats.ds || 0);
            let guaranteedExtra = Math.floor(dsChance / 100);
            let extraRemainder = dsChance - (guaranteedExtra * 100);
            let extraHits = guaranteedExtra + ((Math.random() * 100 < extraRemainder) ? 1 : 0);
            for (let chain = 0; chain < extraHits && game.enemies.length > 0; chain++) {
                if (game.settings.showCombatLog) addLog(`⚔️ [연속 타격] ${chain + 2}연속 공격!`, "loot-rare", { rateKey: 'combat:double-strike', minIntervalMs: 220, aggregateKey: 'combat:double-strike', aggregateWindowMs: 500 });
                performPlayerAttack(pStats);
                if (game.ascendClass === 'gladiator' && hasKeystone('g2')) {
                    let now = Date.now();
                    let active = (game.gladiatorFlurryExpiresAt || 0) > now;
                    let stacks = active ? Math.max(0, Math.min(12, Math.floor(game.gladiatorFlurryStacks || 0))) : 0;
                    game.gladiatorFlurryStacks = Math.min(12, stacks + 1);
                    game.gladiatorFlurryExpiresAt = now + 3000;
                }
                if (game.ascendClass === 'warrior' && hasKeystone('w2')) {
                    let now = Date.now();
                    let active = (game.warriorRhythmDoubleExpiresAt || 0) > now;
                    let stacks = active ? Math.max(0, Math.min(5, Math.floor(game.warriorRhythmDoubleStacks || 0))) : 0;
                    game.warriorRhythmDoubleStacks = Math.min(5, stacks + 1);
                    game.warriorRhythmDoubleExpiresAt = now + 2000;
                }
            }

        }
        performMonsterAttacks(pStats);
    }
    zoneNow = getZone(game.currentZoneId);
    if ((game.season || 1) >= 9 && zoneNow && zoneNow.type === 'abyss') {
        let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
        if (v.active) {
            v.pendingWave = v.pendingWave !== false;
            v.totalToSpawn = Math.max(3, Math.floor(v.totalToSpawn || (6 + Math.floor(Math.random() * 4))));
            v.spawnedCount = Math.max(0, Math.floor(v.spawnedCount || 0));
            v.spawnTick = Math.max(0, Math.floor(v.spawnTick || 0));
            if (v.pendingWave && v.spawnedCount < v.totalToSpawn) {
                v.spawnTick++;
                if (v.spawnTick >= 4) {
                    v.spawnTick = 0;
                    let idx = v.spawnedCount;
                    let marker = { at: Math.max(5, Math.min(95, 10 + idx * 8)), elite: Math.random() < 0.18, boss: false };
                    let riftEnemy = createEnemy(zoneNow, marker, idx + 1);
                    riftEnemy.fromVoidRift = true;
                    game.enemies.push(riftEnemy);
                    v.spawnedCount++;
                    if (game.settings.showSpawnLog !== false) addLog(`🕳️ 균열 출현 ${v.spawnedCount}/${v.totalToSpawn}`, 'attack-monster', { noToast: true });
                }
            }
            if (v.spawnedCount >= v.totalToSpawn && (v.defeatedCount || 0) >= v.totalToSpawn && (game.enemies || []).filter(e => e.hp > 0 && e.fromVoidRift).length === 0) {
                v.active = false;
                v.pendingWave = false;
                v.breachClears = (v.breachClears || 0) + 1;
                let reward = 1 + (Math.random() < 0.2 ? 1 : 0);
                awardCurrency('voidChisel', reward);
                let unlockedGrand = false;
                if (Math.random() < 0.08) {
                    v.grandBreachUnlock = true;
                    unlockedGrand = true;
                }
                addLog(`🕳️ 공허의 구멍 정리 완료! 공허의 끌 +${reward}`, 'loot-magic', { noToast: true });
                if (unlockedGrand) {
                    addLog('🚨 대균열이 열렸습니다! [대균열 진입] 버튼을 확인하세요.', 'loot-unique');
                    if (!v.grandNoticeShown && typeof queueTutorialNotice === 'function') {
                        v.grandNoticeShown = true;
                        queueTutorialNotice('void_grand_breach_ready_once', '대균열 개방', '대균열이 열렸습니다! 지도 탭에서 [대균열 진입] 버튼으로 도전할 수 있습니다.', 'tab-map');
                    }
                }
            }
        }
    }
    let currentZone = getZone(game.currentZoneId);
    if (currentZone && currentZone.type === 'act' && game.runProgress >= 100) {
        let currentStoryAct = getStoryActByZoneId(currentZone.id);
        let hasBossAlive = (game.enemies || []).some(enemy => enemy.isBoss && enemy.hp > 0);
        if (hasBossAlive && currentStoryAct && currentStoryAct.specialType === 'loop_gate' && handleStoryActSpecialDefeat(currentZone, pStats)) return;
    }
    if (game.playerHp > 0) applyTrialTrapTick(pStats);
    if (game.playerHp <= 0) {
        handlePlayerDefeat(getZone(game.currentZoneId), pStats, "☠️ 상태이상으로 쓰러졌습니다.", { fatalElement: 'other', sourceName: '상태이상' });
        return;
    }
    syncCrowdPauseState();

    if (game.runProgress >= 100 && game.encounterIndex >= game.encounterPlan.length && game.enemies.length === 0) finishEncounterRun();
}

function processPendingSlamEchoHits() {
    let now = Date.now();
    let list = Array.isArray(game.pendingSlamEchoHits) ? game.pendingSlamEchoHits : [];
    let next = [];
    list.forEach(row => {
        if (!row || !row.enemyId || !row.at) return;
        if (row.at > now) { next.push(row); return; }
        let enemy = (game.enemies || []).find(e => e && e.id === row.enemyId && e.hp > 0);
        if (!enemy) return;
        let bonus = Math.max(1, Math.floor(row.damage || 0));
        enemy.hp = Math.max(0, enemy.hp - bonus);
        addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(row.element || 'phys'), damage: bonus, duration: 220 });
        if (game.settings && game.settings.showCombatLog !== false) addLog(`🌋 지진의 함성: ${formatNumberKR(bonus)} 추가 타격`, 'attack-player', { noToast: true });
        if (enemy.hp <= 0) handleEnemyDeath(enemy, getPlayerStats());
    });
    game.pendingSlamEchoHits = next;
}


safeExposeGlobals({ coreLoop, isRegularAutoProgressZone, reconcileMapProgressRuntimeState });

// Phase-3 extracted core combat runtime block.

function convertSkillDamageToChaos(skill) {
    let next = { ...(skill || {}) };
    let tags = Array.isArray(next.tags) ? next.tags.slice() : [];
    let convertedTags = tags.filter(tag => !['physical', 'elemental', 'fire', 'cold', 'lightning'].includes(tag));
    if (!convertedTags.includes('chaos')) convertedTags.push('chaos');
    next.tags = convertedTags;
    next.ele = 'chaos';
    if (Array.isArray(next.randomElementPool)) next.randomElementPool = null;
    next.convertedToChaos = true;
    return next;
}


function getUniqueEffectImplementationReport() {
    let declared = [];
    try {
        if (Array.isArray(UNIQUE_DB)) declared = UNIQUE_DB.map(u => u && u.uniqueEffectKey).filter(Boolean);
    } catch (_) {}
    let uniqueKeys = Array.from(new Set(declared));
    let implemented = new Set([
        'xpGainPct','flatDmgPerLevel','esAmpAndRecoverOnCrit','invertShockTaken','alwaysShock',
        'projectileDoubleStrikePct','hitApplyChaosResDown','corpseExplodeOnKill','instantLeechAndDoubleDamage',
        'riderCompass','maxRollBonusHit','ceilingSmashDouble','minRollEqualsMaxRoll','hpToPhysPct','immuneIgnite',
        'abyssSocketOnItem','abyssSocketAndJewelAmp','leechEfficiencyOnKill','overkillSplash','dragonVeinGuard','fateTwinRollSync','frostSentinelBoots','shockTracerGreaves','venomStride','bleedBlockHelm','curseCrown','guardianArmor','warcryResonanceBelt','stackingElementalResDownOnHit','conditionManual','queenBeeSummonOnHit','bleedWeightOnBleedingHit','grandBreachCrown','labyrinthShackles','meteorFootsteps'
    ]);
    return {
        total: uniqueKeys.length,
        implemented: uniqueKeys.filter(k => implemented.has(k)),
        missing: uniqueKeys.filter(k => !implemented.has(k))
    };
}

function getEquippedUniqueJewels() {
    let equipped = [];
    (game.jewelSlots || []).forEach((jewel, idx) => {
        if (jewel && jewel.rarity === 'unique' && jewel.uniqueId) equipped.push({ jewel, slot: idx, source: 'slot' });
    });
    Object.values(game.equipment || {}).forEach(item => {
        let j = item && item.voidSocket && item.voidSocket.open ? item.voidSocket.jewel : null;
        if (j && j.rarity === 'unique' && j.uniqueId) equipped.push({ jewel: j, slot: -1, source: 'void' });
        if (Array.isArray(item && item.abyssSockets)) {
            item.abyssSockets.forEach((sock, idx) => {
                let aj = sock && sock.jewel ? sock.jewel : null;
                if (aj && aj.rarity === 'unique' && aj.uniqueId) equipped.push({ jewel: aj, slot: idx, source: 'abyss' });
            });
        }
    });
    return equipped;
}

function getPlayerStats() {
    const safePassives = Array.isArray(game.passives) ? game.passives : [];
    const safeSeasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    const safeAscendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    const safeRewardBonuses = Array.isArray(game.actRewardBonuses) ? game.actRewardBonuses : [];
    const safeJournalBonuses = Array.isArray(game.journalBonuses) ? game.journalBonuses : [];
    const safeEquippedSupports = Array.isArray(game.equippedSupports) ? game.equippedSupports : [];
    let baseDmg = 16 + (game.level * 1.5);
    let baseHp = 90 + (game.level * 8);
    let baseMove = 100;
    let glovePairAspdBonus = 0;
    let glove1 = game.equipment ? game.equipment['장갑1'] : null;
    let glove2 = game.equipment ? game.equipment['장갑2'] : null;
    if (glove1 && glove2 && glove1.baseId && glove2.baseId && glove1.baseId === glove2.baseId) glovePairAspdBonus = 0.1;

    let gearBase = createEmptyStatBucket();
    let gearExplicit = createEmptyStatBucket();
    let passive = createEmptyStatBucket();
    let support = createEmptyStatBucket();
    let season = createEmptyStatBucket();
    let ascend = createEmptyStatBucket();
    let reward = createEmptyStatBucket();
    let starBlessing = createEmptyStatBucket();

    let localDefenseTotals = { armor: 0, evasion: 0, energyShield: 0 };
    let equippedUniqueEffects = [];
    let warriorDualWeaponEffectMultiplier = (game.ascendClass === 'warrior' && hasKeystone('w6') && isDualWielding()) ? 1.5 : 1;
    let scaleStatList = (stats, multiplier) => multiplier === 1 ? (stats || []) : (stats || []).map(stat => stat && Number.isFinite(Number(stat.val)) ? { ...stat, val: Number(stat.val) * multiplier } : stat);
    Object.values(game.equipment || {}).forEach(item => {
        if (!item) return;
        if (item.rarity === 'unique' && item.uniqueEffectKey) equippedUniqueEffects.push({ key: item.uniqueEffectKey, params: item.uniqueEffectParams || null, itemName: item.name || '' });
        let itemStatMultiplier = item.slot === '무기' ? warriorDualWeaponEffectMultiplier : 1;
        let itemBaseStats = scaleStatList(item.baseStats || [], itemStatMultiplier);
        applyStatsToBucket(gearBase, itemBaseStats);
        let immutableSpecialStats = typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item) : [];
        let explicitItemStats = scaleStatList((item.stats || []).concat(item.chaosInfusion ? [item.chaosInfusion] : [], immutableSpecialStats), itemStatMultiplier);
        applyStatsToBucket(gearExplicit, explicitItemStats);
        let itemBaseArmor = 0, itemBaseEvasion = 0, itemBaseEs = 0;
        let itemFlatArmor = 0, itemFlatEvasion = 0, itemFlatEs = 0;
        let itemPctArmor = 0, itemPctEvasion = 0, itemPctEs = 0;
        itemBaseStats.forEach(stat => {
            if (!stat) return;
            if (stat.id === 'armor') itemBaseArmor += Number(stat.val || 0);
            if (stat.id === 'evasion') itemBaseEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShield') itemBaseEs += Number(stat.val || 0);
        });
        explicitItemStats.forEach(stat => {
            if (!stat) return;
            if (stat.id === 'armor') itemFlatArmor += Number(stat.val || 0);
            if (stat.id === 'evasion') itemFlatEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShield') itemFlatEs += Number(stat.val || 0);
            if (stat.id === 'armorPct') itemPctArmor += Number(stat.val || 0);
            if (stat.id === 'evasionPct') itemPctEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShieldPct') itemPctEs += Number(stat.val || 0);
        });
        localDefenseTotals.armor += (itemBaseArmor + itemFlatArmor) * (1 + itemPctArmor / 100);
        localDefenseTotals.evasion += (itemBaseEvasion + itemFlatEvasion) * (1 + itemPctEvasion / 100);
        localDefenseTotals.energyShield += (itemBaseEs + itemFlatEs) * (1 + itemPctEs / 100);
        if (item.voidSocket && item.voidSocket.open && item.voidSocket.jewel) {
            getJewelStats(item.voidSocket.jewel).forEach(stat => addStatToBucket(gearExplicit, stat.id, stat.val));
        }
        if (Array.isArray(item.abyssSockets) && item.abyssSockets.length > 0) {
            let abyssAmp = 1;
            if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp') {
                let p = item.uniqueEffectParams || {};
                let min = Number(p.ampMin || 1), max = Number(p.ampMax || 100);
                let pct = (min + max) / 2;
                abyssAmp = 1 + (pct / 100);
            }
            item.abyssSockets.forEach(sock => {
                let jewel = sock && sock.jewel ? sock.jewel : null;
                if (!jewel) return;
                getJewelStats(jewel).forEach(stat => addStatToBucket(gearExplicit, stat.id, Number((stat.val * abyssAmp).toFixed(2))));
            });
        }
    });
    game.jewelSlotAmplify = Array.isArray(game.jewelSlotAmplify) ? game.jewelSlotAmplify : [0, 0];
    (game.jewelSlots || []).forEach((jewel, idx) => {
        let amp = Math.max(0, Math.floor((game.jewelSlotAmplify[idx] || 0)));
        let ampMul = 1 + (amp * 0.03);
        getJewelStats(jewel).forEach(stat => addStatToBucket(gearExplicit, stat.id, Number((Number(stat.val || 0) * ampMul).toFixed(2))));
    });
    let equippedUniqueJewels = getEquippedUniqueJewels();
    let activeUniqueIds = new Set(equippedUniqueJewels.map(entry => entry.jewel.uniqueId));
    if (activeUniqueIds.has('uj_mirror_heart')) {
        (game.jewelSlots || []).forEach((jewel, idx) => {
            if (!jewel || jewel.uniqueId !== 'uj_mirror_heart') return;
            let other = (game.jewelSlots || [])[idx === 0 ? 1 : 0];
            if (!other) return;
            getJewelStats(other).forEach(stat => addStatToBucket(gearExplicit, stat.id, stat.val));
        });
    }
    if (activeUniqueIds.has('uj_old_box')) {
        let inv = Array.isArray(game.inventory) ? game.inventory : [];
        let r = { normal: 0, magic: 0, rare: 0, unique: 0 };
        inv.forEach(item => { let k = (item && item.rarity) || 'normal'; if (r[k] !== undefined) r[k]++; });
        addStatToBucket(reward, 'aspd', Math.min(30, r.magic * 0.5));
        addStatToBucket(reward, 'pctDmg', Math.min(60, r.rare * 1.2));
        addStatToBucket(reward, 'dr', Math.min(12, r.unique * 1.5));
    }
    if (activeUniqueIds.has('uj_condensed_curse')) addStatToBucket(reward, 'curseCap', 1);
    let uniqueClosedEyes = activeUniqueIds.has('uj_closed_eyes');
    let uniqueXpGainPct = 0, uniqueFlatDmgPerLevel = 0, uniqueEsAmpPct = 0, uniqueShockInvertTaken = false, uniqueAlwaysShock = false, uniqueProjectileDoubleStrikePct = 0;
    let uniqueChaosResDownOnHit = null, uniqueCorpseExplode = null, uniqueInstantLeechPct = 0, uniqueDoubleDamageChancePct = 0, uniqueEsRecoverOnCritPct = 0;
    let uniqueRiderCompass = false, uniqueMaxRollBonusHit = false, uniqueCeilingSmashDouble = false, uniqueMinRollEqualsMaxRoll = false, uniqueHpToPhysPct = false, uniqueImmuneIgnite = false;
    let uniqueFateTwinRollSync=false, uniqueFrostSentinel=false, uniqueShockTracer=false, uniqueVenomStride=false, uniqueBleedBlockHelm=false, uniqueCurseCrownPerCursePct=0, uniqueWarcryResonancePct=0, uniqueConditionManual=null, uniqueStackingElementalResDownOnHit=null;
    let uniqueLeechEfficiencyOnKill=null, uniqueOverkillSplash=false, uniqueDragonVeinGuard=null, uniqueGuardianArmor=null;
    let uniqueQueenBeeSummon=null, uniqueBleedWeightOnBleedingHit=false, uniqueGrandBreachCrown=null, uniqueLabyrinthShackles=false, uniqueMeteorFootsteps=null;
    equippedUniqueEffects.forEach(effect => {
        if (!effect || !effect.key) return;
        let ep = effect.params || {};
        if (effect.key === 'xpGainPct') uniqueXpGainPct += Number(ep.pct || 0);
        else if (effect.key === 'flatDmgPerLevel') uniqueFlatDmgPerLevel += Number(ep.perLevel || 0);
        else if (effect.key === 'esAmpAndRecoverOnCrit') { uniqueEsAmpPct = Math.max(uniqueEsAmpPct, Number(ep.ampPct || 50)); uniqueEsRecoverOnCritPct = Math.max(uniqueEsRecoverOnCritPct, Number(ep.recoverPctOnCrit || 2)); }
        else if (effect.key === 'invertShockTaken') uniqueShockInvertTaken = true;
        else if (effect.key === 'alwaysShock') uniqueAlwaysShock = true;
        else if (effect.key === 'projectileDoubleStrikePct') uniqueProjectileDoubleStrikePct += Number(ep.pct || 100);
        else if (effect.key === 'hitApplyChaosResDown') uniqueChaosResDownOnHit = { perHit: Number(ep.perHit || 3), maxStacks: Number(ep.maxStacks || 10) };
        else if (effect.key === 'corpseExplodeOnKill') uniqueCorpseExplode = { chance: Number(ep.chance || 15), lifePct: Number(ep.lifePct || 25) };
        else if (effect.key === 'instantLeechAndDoubleDamage') { uniqueInstantLeechPct += Number(ep.instantLeechPct || 25); uniqueDoubleDamageChancePct += Number(ep.doubleDamageChance || 20); }
        else if (effect.key === 'riderCompass') uniqueRiderCompass = true;
        else if (effect.key === 'maxRollBonusHit') uniqueMaxRollBonusHit = true;
        else if (effect.key === 'ceilingSmashDouble') uniqueCeilingSmashDouble = true;
        else if (effect.key === 'minRollEqualsMaxRoll') uniqueMinRollEqualsMaxRoll = true;
        else if (effect.key === 'hpToPhysPct') uniqueHpToPhysPct = true;
        else if (effect.key === 'immuneIgnite') uniqueImmuneIgnite = true;

        else if (effect.key === 'fateTwinRollSync') uniqueFateTwinRollSync = true;
        else if (effect.key === 'frostSentinelBoots') uniqueFrostSentinel = true;
        else if (effect.key === 'shockTracerGreaves') uniqueShockTracer = true;
        else if (effect.key === 'venomStride') uniqueVenomStride = true;
        else if (effect.key === 'bleedBlockHelm') uniqueBleedBlockHelm = true;
        else if (effect.key === 'curseCrown') { addStatToBucket(reward, 'curseCap', Number(ep.extraCurseCap || 1)); uniqueCurseCrownPerCursePct = Math.max(uniqueCurseCrownPerCursePct, Number(ep.finalDmgPerCursePct || 6)); }
        else if (effect.key === 'warcryResonanceBelt') uniqueWarcryResonancePct = Math.max(uniqueWarcryResonancePct, Number(ep.perWarcryAmpPct || 20));
        else if (effect.key === 'conditionManual') uniqueConditionManual = { durationPct: Number(ep.durationPct || 100), cdrPct: Number(ep.cdrPct || 20) };
        else if (effect.key === 'stackingElementalResDownOnHit') uniqueStackingElementalResDownOnHit = { perHit: Number(ep.perHit || 2), max: Number(ep.max || 20) };
        else if (effect.key === 'leechEfficiencyOnKill') uniqueLeechEfficiencyOnKill = { duration: Number(ep.duration || 8), efficiencyPct: Number(ep.efficiencyPct || 100) };
        else if (effect.key === 'overkillSplash') uniqueOverkillSplash = true;
        else if (effect.key === 'dragonVeinGuard') uniqueDragonVeinGuard = { chance: Number(ep.chance || 20), duration: Number(ep.duration || 2), hpPct: Number(ep.hpPct || 8) };
        else if (effect.key === 'guardianArmor') uniqueGuardianArmor = { takenLessPct: Number(ep.takenLessPct || 8), bossTakenLessPct: Number(ep.bossTakenLessPct || 12) };
        else if (effect.key === 'queenBeeSummonOnHit') uniqueQueenBeeSummon = { chance: Number(ep.chance || 8), hitPct: Number(ep.hitPct || 125), attacks: Number(ep.attacks || 3), maxBees: Number(ep.maxBees || 10) };
        else if (effect.key === 'bleedWeightOnBleedingHit') uniqueBleedWeightOnBleedingHit = true;
        else if (effect.key === 'grandBreachCrown') uniqueGrandBreachCrown = { spellFromEsPct: Number(ep.spellFromEsPct || 10), esPct: Number(ep.esPct || 30) };
        else if (effect.key === 'labyrinthShackles') uniqueLabyrinthShackles = true;
        else if (effect.key === 'meteorFootsteps') uniqueMeteorFootsteps = { chance: Number(ep.chance || 20), damagePct: Number(ep.damagePct || 180) };

        else if (effect.key === 'abyssSocketOnItem' || effect.key === 'abyssSocketAndJewelAmp') { /* handled by item generation/socket stat merge path */ }
    });

    recalculateStarWedgeMutations();
    let mutationMap = (game.starWedge && game.starWedge.nodeMutations) || {};
    safePassives.forEach(id => {
        let node = PASSIVE_TREE.nodes[id];
        if (!node) return;
        let mut = mutationMap[id];
        if (mut && mut.currentStat) addStatToBucket(passive, mut.currentStat, mut.currentVal);
        else addStatToBucket(passive, node.stat, node.val);
    });
    let ownedPassiveSet = new Set(safePassives);
    Object.keys(mutationMap).forEach(nodeId => {
        let mut = mutationMap[nodeId];
        if (!mut || mut.lineIndex !== 3 || !mut.currentStat || ownedPassiveSet.has(nodeId)) return;
        addStatToBucket(passive, mut.currentStat, mut.currentVal);
    });

    safeSeasonNodes.forEach(id => {
        let node = SEASON_NODES[id];
        if (node) addStatToBucket(season, node.stat, node.val);
    });

    if (game.ascendClass) {
        let tree = getClassTreeDef(game.ascendClass);
        safeAscendNodes.forEach(id => {
            let node = tree[id];
            if (node) addStatToBucket(ascend, node.stat, node.val);
        });
    }
    safeRewardBonuses.forEach(entry => {
        if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
    });
    let loop10Bonus = game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
    let loopDeep = game.loopDeepStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
    addStatToBucket(reward, 'flatHp', (loop10Bonus.flatHp || 0) * 12);
    addStatToBucket(reward, 'flatDmg', (loop10Bonus.flatDmg || 0) * 3);
    addStatToBucket(reward, 'aspd', (loop10Bonus.aspd || 0) * 1.5);
    addStatToBucket(reward, 'move', (loop10Bonus.move || 0) * 1.0);
    addStatToBucket(reward, 'flatHp', (loopDeep.flatHp || 0) * 10);
    addStatToBucket(reward, 'flatDmg', (loopDeep.flatDmg || 0) * 2);
    addStatToBucket(reward, 'aspd', (loopDeep.aspd || 0) * 1.2);
    addStatToBucket(reward, 'move', (loopDeep.move || 0) * 0.8);
    addStatToBucket(reward, 'dr', (loopDeep.dr || 0) * 0.5);
    addStatToBucket(reward, 'crit', (loopDeep.crit || 0) * 0.6);
    let chaosRealmBonus = (ensureChaosRealmState().permanentBonuses || {});
    Object.keys(chaosRealmBonus).forEach(statKey => addStatToBucket(reward, statKey, chaosRealmBonus[statKey] || 0));
    safeJournalBonuses.forEach(entry => {
        if (entry && entry.stat) addStatToBucket(reward, entry.stat, entry.value);
    });
    let heroDef = getHeroSelectionDef(game.selectedHeroId);
    (heroDef.stats || []).forEach(row => {
        if (row && row.stat) addStatToBucket(reward, row.stat, row.value);
    });
    if (game.passiveStarEvolution) {
        Object.keys(PASSIVE_STAR_BLESSING).forEach(statId => addStatToBucket(starBlessing, statId, PASSIVE_STAR_BLESSING[statId]));
    }
    let talismanEntries = Object.values(game.talismanPlacements || {}).filter(entry => entry && entry.talisman);
    talismanEntries.forEach(entry => {
        let t = entry.talisman;
        if (Array.isArray(t.stats) && t.stats.length > 0) t.stats.forEach(st => { if (st && st.stat) addStatToBucket(reward, st.stat, st.value || 0); });
        else if (t.stat) addStatToBucket(reward, t.stat, t.value || 0);
    });
    let idPos = {};
    talismanEntries.forEach(entry => { if (entry.talisman && entry.talisman.id) idPos[entry.talisman.id] = entry; });
    function adjCount(tid) {
        let e = idPos[tid]; if (!e) return 0;
        let set = new Set();
        (e.talisman.cells || []).forEach(cell => {
            let x=(e.x||0)+(cell.x||0), y=(e.y||0)+(cell.y||0);
            [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{ let nid=(game.talismanBoard||[])[(y+d[1])*8 + (x+d[0])]; if (nid && nid!==tid) set.add(nid); });
        });
        return set.size;
    }

    function adjIds(tid) {
        let e = idPos[tid]; if (!e) return [];
        let set = new Set();
        (e.talisman.cells || []).forEach(cell => {
            let x=(e.x||0)+(cell.x||0), y=(e.y||0)+(cell.y||0);
            [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{ let nx=x+d[0], ny=y+d[1]; if (nx<0||ny<0||nx>=8||ny>=8) return; let nid=(game.talismanBoard||[])[ny*8 + nx]; if (nid && nid!==tid) set.add(nid); });
        });
        return Array.from(set);
    }
    function findMarkedNeighborId(entry) {
        if (!entry || !entry.talisman || !entry.talisman.markDir) return null;
        let cells = (entry.talisman.cells || []).map(cell => ({ x: cell.x || 0, y: cell.y || 0 }));
        let anchor = cells[0] || { x: 0, y: 0 };
        if (cells.length > 0) {
            let filled = new Set(cells.map(cell => `${cell.x},${cell.y}`));
            let centerX = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
            let centerY = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length;
            let ranked = cells.map(cell => {
                let neighbors = 0;
                if (filled.has(`${cell.x - 1},${cell.y}`)) neighbors++;
                if (filled.has(`${cell.x + 1},${cell.y}`)) neighbors++;
                if (filled.has(`${cell.x},${cell.y - 1}`)) neighbors++;
                if (filled.has(`${cell.x},${cell.y + 1}`)) neighbors++;
                let dist = Math.hypot(cell.x - centerX, cell.y - centerY);
                return { cell, neighbors, dist };
            });
            ranked.sort((a, b) => {
                if (b.neighbors !== a.neighbors) return b.neighbors - a.neighbors;
                if (a.dist !== b.dist) return a.dist - b.dist;
                if (a.cell.y !== b.cell.y) return a.cell.y - b.cell.y;
                return a.cell.x - b.cell.x;
            });
            anchor = ranked[0].cell;
        }
        let x=(entry.x||0)+(anchor.x||0), y=(entry.y||0)+(anchor.y||0);
        let d = entry.talisman.markDir === 'up' ? [0,-1] : entry.talisman.markDir === 'right' ? [1,0] : entry.talisman.markDir === 'down' ? [0,1] : [-1,0];
        let nx=x+d[0], ny=y+d[1];
        if (nx<0||ny<0||nx>=8||ny>=8) return null;
        let nid=(game.talismanBoard||[])[ny*8 + nx];
        return nid || null;
    }

    talismanEntries.forEach(entry => {
        let t = entry.talisman; if (!t || !t.special) return;
        if (t.special === 'gravity') {
            adjIds(t.id).forEach(nid => {
                let n = idPos[nid] && idPos[nid].talisman;
                if (!n) return;
                let list = Array.isArray(n.stats) && n.stats.length > 0 ? n.stats : (n.stat ? [{ stat:n.stat, value:n.value || 0 }] : []);
                list.forEach(st => { if (st && st.stat) addStatToBucket(reward, st.stat, (st.value || 0) * 0.25); });
            });
        }
        if (t.special === 'simpleCopy') {
            let nid = findMarkedNeighborId(entry);
            let n = nid ? (idPos[nid] && idPos[nid].talisman) : null;
            if (!n) return;
            let list = Array.isArray(n.stats) && n.stats.length > 0 ? n.stats : (n.stat ? [{ stat:n.stat, value:n.value || 0 }] : []);
            list.forEach(st => { if (st && st.stat) addStatToBucket(reward, st.stat, st.value || 0); });
        }
    });
    talismanEntries.forEach(entry => {
        let t = entry.talisman; if (!t || !t.special) return;
        if (t.special === 'pride') {
            let n = adjCount(t.id);
            if (n === 0) { addStatToBucket(reward,'gemLevel',1); addStatToBucket(reward,'suppCap',1); }
            else if (n === 1) addStatToBucket(reward,'suppCap',1);
            else if (n <= 4) { addStatToBucket(reward,'pctDmg',15); addStatToBucket(reward,'aspd',10); }
            else { addStatToBucket(reward,'crit',5); addStatToBucket(reward,'critDmg',25); addStatToBucket(reward,'pctDmg',15); addStatToBucket(reward,'aspd',10); }
        }
    });

    let gemSources = getGemBonusSources();
    let hasIq6Keystone = (game.ascendClass === 'inquisitor') && hasKeystone('iq6');
    if (hasIq6Keystone) {
        gemSources.reward += 1;
        gemSources.total += 1;
    }
    safeEquippedSupports.forEach(name => {
        let gem = normalizeGemRecord((game.supportGemData || {})[name]);
        let db = SUPPORT_GEM_DB[name];
        if (!db) return;
        let activeTier = Math.max(1, Math.min(3, Math.floor(gem.activeTier || gem.unlockedTier || 1)));
        let tierMul = activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2;
        let effectiveLevel = Math.max(1, gem.level + gemSources.total);
        let val = (db.baseVal + ((effectiveLevel - 1) * db.scale)) * tierMul;
        addStatToBucket(support, db.stat, val);
    });

    if (game.shrineBuff && Date.now() > (game.shrineBuff.expiresAt || 0)) game.shrineBuff = null;
    if (game.shrineBuff && game.shrineBuff.stat) addStatToBucket(reward, game.shrineBuff.stat, game.shrineBuff.value || 0);
    let constellation = game.starWedge && game.starWedge.constellationBuff;
    if (constellation && constellation.stat) addStatToBucket(reward, constellation.stat, constellation.val || 0);
    let skill = getActiveSkillStats(gemSources.total);
    if (game.ascendClass === 'warlock' && hasKeystone('wlk1')) skill = convertSkillDamageToChaos(skill);
    if (game.ascendClass === 'elementalist' && hasKeystone('e4')) {
        skill = { ...skill, ele: 'fire', randomElementPool: ['fire', 'cold', 'light'] };
        skill.tags = Array.from(new Set([...(skill.tags || []), 'elemental']));
    }
    let favorFx = (typeof getExpertFavorEffectTotals === 'function') ? getExpertFavorEffectTotals() : {};
    Object.keys(favorFx).forEach(statKey => addStatToBucket(reward, statKey, favorFx[statKey] || 0));
    let targetBonus = (gearBase.targetAny + gearExplicit.targetAny + passive.targetAny + season.targetAny + ascend.targetAny + reward.targetAny);
    let totalProjectileExtraShots = gearBase.projectileExtraShots + gearExplicit.projectileExtraShots + passive.projectileExtraShots + season.projectileExtraShots + ascend.projectileExtraShots + reward.projectileExtraShots;
    if (Array.isArray(skill.tags) && skill.tags.includes('projectile')) targetBonus += (gearBase.targetProjectile + gearExplicit.targetProjectile + passive.targetProjectile + season.targetProjectile + ascend.targetProjectile + reward.targetProjectile);
    if (Array.isArray(skill.tags) && skill.tags.includes('slam')) targetBonus += (gearBase.targetSlam + gearExplicit.targetSlam + passive.targetSlam + season.targetSlam + ascend.targetSlam + reward.targetSlam);
    if (targetBonus > 0) skill.targets = Math.min(Array.isArray(skill.tags) && skill.tags.includes('projectile') ? 12 : 6, Math.max(1, (skill.targets || 1) + Math.floor(targetBonus)));
    else skill.targets = Math.min(6, Math.max(1, skill.targets || 1));
    let gearTagged = getTaggedDamageBreakdown(gearBase, skill);
    let gearExplicitTagged = getTaggedDamageBreakdown(gearExplicit, skill);
    let passiveTagged = getTaggedDamageBreakdown(passive, skill);
    let seasonTagged = getTaggedDamageBreakdown(season, skill);
    let ascendTagged = getTaggedDamageBreakdown(ascend, skill);
    let supportTagged = getTaggedDamageBreakdown(support, skill);
    let rewardTagged = getTaggedDamageBreakdown(reward, skill);
    let starTagged = getTaggedDamageBreakdown(starBlessing, skill);

    let taggedTotal = gearTagged.total + gearExplicitTagged.total + passiveTagged.total + seasonTagged.total + ascendTagged.total + supportTagged.total + rewardTagged.total + starTagged.total;
    let taggedParts = [].concat(gearTagged.parts, gearExplicitTagged.parts, passiveTagged.parts, seasonTagged.parts, ascendTagged.parts, supportTagged.parts, rewardTagged.parts, starTagged.parts);
    let taggedMap = {};
    taggedParts.forEach(part => {
        let tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === part.statId);
        if (!tag) return;
        taggedMap[tag] = (taggedMap[tag] || 0) + part.value;
    });
    let taggedSummary = Object.keys(taggedMap).map(tag => `${translateSkillTag(tag)} ${Math.floor(taggedMap[tag])}%`);
    function sumStatAcrossBuckets(statId) {
        return gearBase[statId] + gearExplicit[statId] + passive[statId] + season[statId] + ascend[statId] + support[statId] + reward[statId] + (starBlessing[statId] || 0);
    }
    let randomElementDamagePct = Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0 ? {
        fire: sumStatAcrossBuckets('firePctDmg'),
        cold: sumStatAcrossBuckets('coldPctDmg'),
        light: sumStatAcrossBuckets('lightPctDmg')
    } : null;
    if (randomElementDamagePct) {
        let randomElementSummary = Object.entries(randomElementDamagePct)
            .filter(([, value]) => value)
            .map(([ele, value]) => `${ele === 'fire' ? '화염' : (ele === 'cold' ? '냉기' : '번개')} ${Math.floor(value)}%`);
        if (randomElementSummary.length > 0) taggedSummary.push(`무작위 원소별 적용: ${randomElementSummary.join(' / ')}`);
    }

    let gearFlatDmg = gearBase.flatDmg + gearExplicit.flatDmg;
    let passiveFlatDmg = passive.flatDmg + season.flatDmg + ascend.flatDmg + reward.flatDmg;
    let generalPctDmg = gearBase.pctDmg + gearExplicit.pctDmg + passive.pctDmg + season.pctDmg + ascend.pctDmg + support.pctDmg + reward.pctDmg + starBlessing.pctDmg;
    let dotPctDmg = gearBase.dotPctDmg + gearExplicit.dotPctDmg + passive.dotPctDmg + season.dotPctDmg + ascend.dotPctDmg + support.dotPctDmg + reward.dotPctDmg;
    function sumAilmentChanceStat(statId) {
        return (gearBase[statId] || 0) + (gearExplicit[statId] || 0) + (passive[statId] || 0) + (season[statId] || 0) + (ascend[statId] || 0) + (support[statId] || 0) + (reward[statId] || 0) + (starBlessing[statId] || 0);
    }
    let finalIgniteChance = sumAilmentChanceStat('igniteChance');
    let finalChillChance = sumAilmentChanceStat('chillChance');
    let finalFreezeChance = sumAilmentChanceStat('freezeChance');
    let finalPoisonChance = sumAilmentChanceStat('poisonChance');
    let finalBleedChance = sumAilmentChanceStat('bleedChance');
    let ailmentCritChance = { ignite: 100, chill: 100, freeze: 100, poison: 100, bleed: 100 };
    let isSpellSkill = Array.isArray(skill.tags) && skill.tags.includes('spell');
    let isDotSkill = Array.isArray(skill.tags) && skill.tags.includes('dot');
    let spellFlatDmg = 0;
    if (isSpellSkill) {
        let skillLevel = Number.isFinite(skill.finalLevel) ? skill.finalLevel : 1;
        let spellBase = Number.isFinite(skill.spellFlatBase) ? skill.spellFlatBase : 0;
        let spellScale = Number.isFinite(skill.spellFlatScale) ? skill.spellFlatScale : 0;
        let logBoost = Math.log2(Math.max(1, skillLevel));
        let spellFlatBonus = gearBase.spellFlatDmg + gearExplicit.spellFlatDmg + passive.spellFlatDmg + season.spellFlatDmg + ascend.spellFlatDmg + reward.spellFlatDmg + support.spellFlatDmg;
        if (uniqueGrandBreachCrown) spellFlatBonus += Math.floor(Math.max(0, localDefenseTotals.energyShield) * (Math.max(0, uniqueGrandBreachCrown.spellFromEsPct || 10) / 100));
        let spellFlatPct = gearBase.spellFlatPct + gearExplicit.spellFlatPct + passive.spellFlatPct + season.spellFlatPct + ascend.spellFlatPct + reward.spellFlatPct + support.spellFlatPct;
        spellFlatDmg = Math.max(1, ((spellBase * 3) + Math.max(0, skillLevel - 1) * spellScale + (spellBase * 0.8 * logBoost * logBoost) + spellFlatBonus) * (1 + spellFlatPct / 100));
        spellFlatDmg *= (1 + Math.max(0, Number(skill.spellFlatMulBonus) || 0) / 100);
    }
    let totalFlatDmg = isSpellSkill ? spellFlatDmg : (baseDmg + gearFlatDmg + passiveFlatDmg);
    let codexBonusRatio = 1 + (getCodexBonusPct() / 100);

    let gearFlatHp = gearBase.flatHp + gearExplicit.flatHp;
    let passiveFlatHp = passive.flatHp + season.flatHp + ascend.flatHp + reward.flatHp;
    let totalFlatHp = baseHp + gearFlatHp + passiveFlatHp + starBlessing.flatHp;
    let totalPctHp = gearBase.pctHp + gearExplicit.pctHp + passive.pctHp + season.pctHp + ascend.pctHp + support.pctHp + reward.pctHp;
    let finalMaxHp = Math.floor(totalFlatHp * (1 + totalPctHp / 100) * codexBonusRatio);

    let hpScaleRatio = Math.max(0, finalMaxHp * (skill.hpDmgScale || 0));
    let hpFlatBonus = Math.floor(totalFlatDmg * hpScaleRatio);
    let scaledFlatDmg = totalFlatDmg + hpFlatBonus;
    let finalBaseDmg = Math.floor(scaledFlatDmg * (1 + (generalPctDmg + taggedTotal) / 100) * (skill.dmg || skill.baseDmg || 1) * codexBonusRatio);
    finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.max(0, Number(skill.flatSkillDmgPct) || 0) / 100));

    let gearAspd = gearBase.aspd + gearExplicit.aspd;
    let passiveAspd = passive.aspd + season.aspd + ascend.aspd + reward.aspd;
    let totalAspdPct = gearAspd + passiveAspd + support.aspd;
    let rawAspd = (1.0 + glovePairAspdBonus) * (1 + totalAspdPct / 100) * (skill.spd || skill.baseSpd || 1) * 0.88;
    let finalAspd = rawAspd <= 5 ? rawAspd : (5 + Math.pow(Math.max(0, rawAspd - 5), 0.72));
    finalAspd = Math.min(12, finalAspd);

    let gearCrit = gearBase.crit + gearExplicit.crit;
    let passiveCrit = passive.crit + season.crit + ascend.crit + reward.crit;
    let finalCrit = Math.min(100, (5 + gearCrit + passiveCrit + support.crit + (skill.crit || 0)) * 0.82);
    let finalMove = baseMove + gearBase.move + gearExplicit.move + passive.move + season.move + ascend.move + support.move + reward.move + starBlessing.move;
    let finalDamageMultiplier = 1;
    if (uniqueLabyrinthShackles) {
        let reduced = Math.max(0, finalMove - 100);
        finalMove = 100;
        finalDamageMultiplier *= (1 + reduced / 100);
    }
    
    let extraFlatArmor = passive.armor + season.armor + ascend.armor + reward.armor;
    let extraFlatEvasion = passive.evasion + season.evasion + ascend.evasion + reward.evasion;
    let extraFlatEnergyShield = passive.energyShield + season.energyShield + ascend.energyShield + reward.energyShield;
    let gearArmor = localDefenseTotals.armor + extraFlatArmor;
    let gearEvasion = localDefenseTotals.evasion + extraFlatEvasion;
    let gearEnergyShield = localDefenseTotals.energyShield + extraFlatEnergyShield;
    let totalArmorPct = passive.armorPct + season.armorPct + ascend.armorPct + reward.armorPct;
    let totalEvasionPct = passive.evasionPct + season.evasionPct + ascend.evasionPct + reward.evasionPct;
    let totalEnergyShieldPct = passive.energyShieldPct + season.energyShieldPct + ascend.energyShieldPct + reward.energyShieldPct;
    let finalArmor = Math.max(0, Math.floor(gearArmor * (1 + totalArmorPct / 100)));
    let finalEvasion = Math.max(0, Math.floor(gearEvasion * (1 + totalEvasionPct / 100)));
    let finalEnergyShield = Math.max(0, Math.floor(gearEnergyShield * (1 + totalEnergyShieldPct / 100)));
    if (uniqueGrandBreachCrown) finalEnergyShield = Math.max(0, Math.floor(finalEnergyShield * (1 + Math.max(0, uniqueGrandBreachCrown.esPct || 30) / 100)));
    if (uniqueEsAmpPct > 0) finalEnergyShield = Math.floor(finalEnergyShield * (1 + uniqueEsAmpPct / 100));
    let finalEnergyShieldRegenRate = Math.max(0, 12.5 + gearBase.energyShieldRegen + gearExplicit.energyShieldRegen + passive.energyShieldRegen + season.energyShieldRegen + ascend.energyShieldRegen + reward.energyShieldRegen);
    let finalEnergyShieldRechargeDelay = Math.max(0.25, 1 - (gearBase.energyShieldRechargeFaster + gearExplicit.energyShieldRechargeFaster + passive.energyShieldRechargeFaster + season.energyShieldRechargeFaster + ascend.energyShieldRechargeFaster + reward.energyShieldRechargeFaster));
    let referenceIncomingPhysical = Math.max(1, Math.floor((2 + ((getZone(game.currentZoneId) || { tier: 1 }).tier || 1) * 3.1)));
    let armorReduction = Math.min(90, (finalArmor / (finalArmor + referenceIncomingPhysical * 10)) * 100);
    let enemyAccuracy = Math.max(60, Math.floor(90 + ((getZone(game.currentZoneId) || { tier: 1 }).tier || 1) * 24));
    let evadeChance = Math.min(90, (finalEvasion / (finalEvasion + enemyAccuracy)) * 100);

    let finalCritDmg = 150 + gearBase.critDmg + gearExplicit.critDmg + passive.critDmg + season.critDmg + ascend.critDmg + support.critDmg + reward.critDmg + (skill.critDmgBonus || 0);
    let rawLeech = (skill.leech || 0) + gearBase.leech + gearExplicit.leech + passive.leech + season.leech + ascend.leech + support.leech + reward.leech;
    let finalLeech = applyLeechSoftcap(rawLeech);
    if (uniqueLeechEfficiencyOnKill && game.uniqueLeechEfficiencyUntil && Date.now() < game.uniqueLeechEfficiencyUntil) {
        finalLeech *= (1 + Math.max(0, uniqueLeechEfficiencyOnKill.efficiencyPct || 0) / 100);
    }
    let finalLeechRateCap = gearBase.leechRateCap + gearExplicit.leechRateCap + passive.leechRateCap + season.leechRateCap + ascend.leechRateCap + support.leechRateCap + reward.leechRateCap;
    let finalLeechTotalCap = gearBase.leechTotalCap + gearExplicit.leechTotalCap + passive.leechTotalCap + season.leechTotalCap + ascend.leechTotalCap + support.leechTotalCap + reward.leechTotalCap;
    let finalLeechInstanceCap = gearBase.leechInstanceCap + gearExplicit.leechInstanceCap + passive.leechInstanceCap + season.leechInstanceCap + ascend.leechInstanceCap + support.leechInstanceCap + reward.leechInstanceCap;
    let finalDr = Math.min(75, gearBase.dr + gearExplicit.dr + passive.dr + season.dr + ascend.dr + support.dr + reward.dr);
    let finalPhysIgnore = gearBase.physIgnore + gearExplicit.physIgnore + passive.physIgnore + season.physIgnore + ascend.physIgnore + support.physIgnore + reward.physIgnore + (skill.physIgnoreBonus || 0);
    let allowNegativePhysIgnore = false;
    let warriorPhysDamageMultiplier = 1;
    let warriorTakenDamageMultiplier = 1;
    let genericTakenDamageMultiplier = 1;
    let bossDamageDealtMultiplier = 1;
    let bossTakenDamageMultiplier = 1;
    let ailmentResistBonusPct = 0;
    let swiftOpeningTakenMultiplier = 1;
    let guardianReflectDamage = 0;
    let guardianBlockChance = 0;
    let guardianArmorDamageBonus = false;
    let finalDs = ((gearBase.ds + gearExplicit.ds + passive.ds + season.ds + ascend.ds + support.ds + reward.ds) + (skill.dsBonus || 0)) * 0.75;
    let finalSlamEchoChance = gearBase.slamEchoChance + gearExplicit.slamEchoChance + passive.slamEchoChance + season.slamEchoChance + ascend.slamEchoChance + support.slamEchoChance + reward.slamEchoChance;
    let finalRegen = gearBase.regen + gearExplicit.regen + passive.regen + season.regen + ascend.regen + support.regen + reward.regen + (skill.regenBonus || 0);
    let flatRegen = gearBase.regenFlat + gearExplicit.regenFlat + passive.regenFlat + season.regenFlat + ascend.regenFlat + support.regenFlat + reward.regenFlat;
    finalRegen += (flatRegen / Math.max(1, finalMaxHp)) * 100;
    if (activeUniqueIds.has('uj_hurried_mind')) {
        let alive = (game.enemies || []).filter(e => e && e.hp > 0).length;
        if (alive === 0) finalMove *= 1.5;
    }
    let finalRegenSuppress = gearBase.regenSuppress + gearExplicit.regenSuppress + passive.regenSuppress + season.regenSuppress + ascend.regenSuppress + support.regenSuppress + reward.regenSuppress;
    let finalResPen = gearBase.resPen + gearExplicit.resPen + passive.resPen + season.resPen + ascend.resPen + support.resPen + reward.resPen + (skill.resPenBonus || 0);
    let finalChillEffectReducePct = gearBase.chillEffectReducePct + gearExplicit.chillEffectReducePct + passive.chillEffectReducePct + season.chillEffectReducePct + ascend.chillEffectReducePct + support.chillEffectReducePct + reward.chillEffectReducePct;
    let finalFreezeDurationReducePct = gearBase.freezeDurationReducePct + gearExplicit.freezeDurationReducePct + passive.freezeDurationReducePct + season.freezeDurationReducePct + ascend.freezeDurationReducePct + support.freezeDurationReducePct + reward.freezeDurationReducePct;
    let finalShockEffectReducePct = gearBase.shockEffectReducePct + gearExplicit.shockEffectReducePct + passive.shockEffectReducePct + season.shockEffectReducePct + ascend.shockEffectReducePct + support.shockEffectReducePct + reward.shockEffectReducePct;
    let finalIgniteDamageReducePct = gearBase.igniteDamageReducePct + gearExplicit.igniteDamageReducePct + passive.igniteDamageReducePct + season.igniteDamageReducePct + ascend.igniteDamageReducePct + support.igniteDamageReducePct + reward.igniteDamageReducePct;
    let finalBleedDamageReducePct = gearBase.bleedDamageReducePct + gearExplicit.bleedDamageReducePct + passive.bleedDamageReducePct + season.bleedDamageReducePct + ascend.bleedDamageReducePct + support.bleedDamageReducePct + reward.bleedDamageReducePct;
    let finalPoisonDamageReducePct = gearBase.poisonDamageReducePct + gearExplicit.poisonDamageReducePct + passive.poisonDamageReducePct + season.poisonDamageReducePct + ascend.poisonDamageReducePct + support.poisonDamageReducePct + reward.poisonDamageReducePct;
    let finalDotTakenDamageReducePct = gearBase.dotTakenDamageReducePct + gearExplicit.dotTakenDamageReducePct + passive.dotTakenDamageReducePct + season.dotTakenDamageReducePct + ascend.dotTakenDamageReducePct + support.dotTakenDamageReducePct + reward.dotTakenDamageReducePct;
    let finalTakenDamageReduceWhen2EnemiesPct = gearBase.takenDamageReduceWhen2EnemiesPct + gearExplicit.takenDamageReduceWhen2EnemiesPct + passive.takenDamageReduceWhen2EnemiesPct + season.takenDamageReduceWhen2EnemiesPct + ascend.takenDamageReduceWhen2EnemiesPct + support.takenDamageReduceWhen2EnemiesPct + reward.takenDamageReduceWhen2EnemiesPct;
    let finalTakenDamageReduceWhen1EnemyPct = gearBase.takenDamageReduceWhen1EnemyPct + gearExplicit.takenDamageReduceWhen1EnemyPct + passive.takenDamageReduceWhen1EnemyPct + season.takenDamageReduceWhen1EnemyPct + ascend.takenDamageReduceWhen1EnemyPct + support.takenDamageReduceWhen1EnemyPct + reward.takenDamageReduceWhen1EnemyPct;
    let finalIgniteDamageMultiplierPct = gearBase.igniteDamageMultiplierPct + gearExplicit.igniteDamageMultiplierPct + passive.igniteDamageMultiplierPct + season.igniteDamageMultiplierPct + ascend.igniteDamageMultiplierPct + support.igniteDamageMultiplierPct + reward.igniteDamageMultiplierPct;
    let finalMinDmgRoll = Math.max(5, 80 + gearBase.minDmgRoll + gearExplicit.minDmgRoll + passive.minDmgRoll + season.minDmgRoll + ascend.minDmgRoll + support.minDmgRoll + reward.minDmgRoll);
    let finalMaxDmgRoll = Math.max(finalMinDmgRoll, 100 + gearBase.maxDmgRoll + gearExplicit.maxDmgRoll + passive.maxDmgRoll + season.maxDmgRoll + ascend.maxDmgRoll + support.maxDmgRoll + reward.maxDmgRoll);
    if (uniqueMinRollEqualsMaxRoll) finalMinDmgRoll = finalMaxDmgRoll;
    if (uniqueHpToPhysPct) finalBaseDmg = Math.floor(finalBaseDmg * (1 + (finalMaxHp / 100) / 100));

    let resistPenalty = (game.maxZoneId >= 5 ? 30 : 0) + (game.maxZoneId >= 10 ? 30 : 0);
    let finalMaxResF = Math.min(90, 75 + gearBase.maxResF + gearExplicit.maxResF + passive.maxResF + season.maxResF + ascend.maxResF + reward.maxResF);
    let finalMaxResC = Math.min(90, 75 + gearBase.maxResC + gearExplicit.maxResC + passive.maxResC + season.maxResC + ascend.maxResC + reward.maxResC);
    let finalMaxResL = Math.min(90, 75 + gearBase.maxResL + gearExplicit.maxResL + passive.maxResL + season.maxResL + ascend.maxResL + reward.maxResL);
    let rawResF = gearBase.resF + gearExplicit.resF + passive.resF + season.resF + ascend.resF + reward.resF - resistPenalty;
    let rawResC = gearBase.resC + gearExplicit.resC + passive.resC + season.resC + ascend.resC + reward.resC - resistPenalty;
    let rawResL = gearBase.resL + gearExplicit.resL + passive.resL + season.resL + ascend.resL + reward.resL - resistPenalty;
    let rawResChaos = gearBase.resChaos + gearExplicit.resChaos + passive.resChaos + season.resChaos + ascend.resChaos + reward.resChaos - resistPenalty;
    let finalResF = Math.min(finalMaxResF, rawResF);
    let finalResC = Math.min(finalMaxResC, rawResC);
    let finalResL = Math.min(finalMaxResL, rawResL);
    let warlockElementalOvercapToChaos = (game.ascendClass === 'warlock' && hasKeystone('wlk4'))
        ? (Math.max(0, rawResF - finalMaxResF) + Math.max(0, rawResC - finalMaxResC) + Math.max(0, rawResL - finalMaxResL)) * 0.25
        : 0;
    let finalResChaos = Math.min(75, rawResChaos + warlockElementalOvercapToChaos);
    if (activeUniqueIds.has('uj_burning_will')) {
        let overcapFire = Math.max(0, rawResF - finalMaxResF);
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.min(0.35, overcapFire * 0.005)));
    }
    let regenScaledBonus = 1 + Math.max(0, finalRegen * (skill.regenDmgScale || 0) / 100);
    let fireResOvercap = Math.max(0, rawResF - finalMaxResF);
    let fireResOvercapAdditiveMultiplier = Math.max(0, skill.fireResOvercapMulPerPct || 0);
    let fireResScaledBonus = fireResOvercapAdditiveMultiplier > 0
        ? 1 + (fireResOvercap * fireResOvercapAdditiveMultiplier)
        : 1 + Math.max(0, finalResF * (skill.fireResDmgScale || 0));
    let dotMultiplier = skill.dotMultiplier || 1;
    let dotStatMultiplier = 1 + Math.max(0, dotPctDmg) / 100;
    let totalDotDamageMultiplier = dotMultiplier * dotStatMultiplier;
    let instantDamageMultiplier = 1;
    let ailmentPowerMultiplier = 1;
    let talismanBossFinalDmgBonusPct = 0;
    let chaosDamageMultiplier = 1;
    let dotTickIntervalMultiplier = 1;
    let dotDurationMultiplier = 1;
    if (uniqueFateTwinRollSync) { let v=Math.max(finalMinDmgRoll, finalMaxDmgRoll)+(finalCrit*0.2); finalMinDmgRoll=v; finalMaxDmgRoll=v; }
    if (uniqueVenomStride) finalDamageMultiplier *= 1.30;
    if (uniqueWarcryResonancePct>0){ let now=Date.now(); let c=(Array.isArray(game.playerConditionBuffs)?game.playerConditionBuffs:[]).filter(b=>b&&b.type==='warcry'&&(b.expiresAt||0)>now).length; if(c>0) finalDamageMultiplier*=(1+(c*uniqueWarcryResonancePct)/100);}
    if (uniqueCurseCrownPerCursePct>0){ let e=(game.enemies||[]).find(x=>x&&x.hp>0); let n=0; if(e&&game.enemyConditionDebuffs&&Array.isArray(game.enemyConditionDebuffs[e.id])) n=game.enemyConditionDebuffs[e.id].length; if(n>0) finalDamageMultiplier*=(1+(n*uniqueCurseCrownPerCursePct)/100);}
    finalBaseDmg = Math.floor(finalBaseDmg * regenScaledBonus * fireResScaledBonus);
    if (uniqueFlatDmgPerLevel > 0) finalBaseDmg += Math.floor(Math.max(1, game.level || 1) * uniqueFlatDmgPerLevel);
    talismanEntries.forEach(entry => {
        let t = entry.talisman; if (!t) return;
        if (t.special === 'moment') talismanBossFinalDmgBonusPct = Math.max(talismanBossFinalDmgBonusPct, (t.bossFinalDmgMin || 5) + Math.floor(Math.random() * (((t.bossFinalDmgMax || 15) - (t.bossFinalDmgMin || 5)) + 1)));
    });
    let damageScales = {
        hpFlatBonus: hpFlatBonus,
        hpScaleRatio: hpScaleRatio,
        regen: regenScaledBonus,
        fireRes: fireResScaledBonus,
        fireResOvercap: fireResOvercap,
        rawResF: rawResF,
        fireResOvercapAdditiveMultiplier: fireResOvercapAdditiveMultiplier,
        dot: dotMultiplier,
        dotStat: dotStatMultiplier,
        randomElementDamagePct: randomElementDamagePct,
        talismanBossFinalDmgBonusPct: talismanBossFinalDmgBonusPct
    };
    let suppCap = 2 + gearBase.suppCap + gearExplicit.suppCap + passive.suppCap + season.suppCap + ascend.suppCap + reward.suppCap;

    let critChance = finalCrit / 100;
    let critMulti = finalCritDmg / 100;
    let avgHit = finalBaseDmg * (1 - critChance) + finalBaseDmg * critChance * critMulti;
    let finalDps = avgHit * finalAspd;

    // Keystone phase-1 runtime effects (safe static subset)
    if (game.ascendClass === 'warrior') {
        // 1) Base multipliers / penalties
        if (hasKeystone('w1')) {
            warriorPhysDamageMultiplier *= 1.15;
            finalArmor = Math.floor(finalArmor * 1.15);
        }
        if (hasKeystone('w2')) {
            let now = Date.now();
            let critStacks = (game.warriorRhythmExpiresAt || 0) > now ? Math.max(0, Math.min(5, Math.floor(game.warriorRhythmStacks || 0))) : 0;
            let doubleStacks = (game.warriorRhythmDoubleExpiresAt || 0) > now ? Math.max(0, Math.min(5, Math.floor(game.warriorRhythmDoubleStacks || 0))) : 0;
            let stacks = critStacks + doubleStacks;
            if (stacks > 0) finalAspd = Math.min(12, finalAspd * Math.pow(1.08, stacks));
        }
        if (hasKeystone('w3')) finalBaseDmg = Math.floor(finalBaseDmg * (isDualWielding() ? 1.08 : 1));
        if (hasKeystone('w4')) { finalPhysIgnore += 15; allowNegativePhysIgnore = true; }
        if (hasKeystone('w5')) {
            let now = Date.now();
            let stacks = (game.warriorRageExpiresAt || 0) > now ? Math.max(0, Math.min(5, Math.floor(game.warriorRageStacks || 0))) : 0;
            if (stacks > 0) warriorPhysDamageMultiplier *= (1 + stacks * 0.05);
        }
        if (hasKeystone('w7') && (game.playerHp / Math.max(1, finalMaxHp)) <= 0.5) {
            finalBaseDmg = Math.floor(finalBaseDmg * 1.15);
            warriorTakenDamageMultiplier *= 0.85;
        }
        // 2) Keystone cap/transform phase
        if (hasKeystone('w8')) {
            finalCrit = Math.min(200, finalCrit + 15);
            finalCritDmg += 15;
            finalAspd = Math.min(12, finalAspd * 1.15);
            finalMove *= 1.15;
            finalDamageMultiplier *= 1.15;
            finalDs += 15;
        }
    } else if (game.ascendClass === 'gladiator') {
        if (hasKeystone('g1')) {
            if (skill.ele === 'phys') finalBaseDmg = Math.floor(finalBaseDmg * 1.12);
            else finalBaseDmg = Math.floor(finalBaseDmg * 0.80);
        }
        if (hasKeystone('g2')) {
            let now = Date.now();
            let stacks = (game.gladiatorFlurryExpiresAt || 0) > now ? Math.max(0, Math.min(12, Math.floor(game.gladiatorFlurryStacks || 0))) : 0;
            if (stacks > 0) {
                finalAspd = Math.min(12, finalAspd * (1 + stacks * 0.03));
                finalEvasion = Math.floor(finalEvasion * (1 + stacks * 0.03));
            }
        }
        if (hasKeystone('g3')) finalCrit = Math.min(100, finalCrit + Math.max(0, Math.floor(game.gladiatorVeteranCritBonus || 0)));
        if (hasKeystone('g4')) {
            let crowdCount = (game.enemies || []).filter(e => e && e.hp > 0).length;
            if (crowdCount >= 3) {
                finalBaseDmg = Math.floor(finalBaseDmg * 1.15);
                finalDr = Math.min(75, finalDr + 15);
            }
        }
        if (hasKeystone('g5')) {
            if (game.gladiatorSwiftGuardReady) swiftOpeningTakenMultiplier = 0.70;
        }
        if (hasKeystone('g7')) {
            finalDs += Math.floor(Math.max(0, finalEvasion) / 50);
            finalCrit += Math.floor(Math.max(0, finalArmor) / 400);
        }
        if (hasKeystone('g8')) {
            finalDs += 100;
            finalBaseDmg = Math.floor(finalBaseDmg * 1.18);
            bossDamageDealtMultiplier *= 1.18;
            bossTakenDamageMultiplier *= 1.18;
            finalRegen *= 0.5;
            finalEnergyShieldRegenRate = 0;
        }
    } else if (game.ascendClass === 'assassin') {
        if (hasKeystone('a1')) {
            finalCrit = Math.max(0, finalCrit - 6);
            finalCritDmg += 66;
        }
        if (hasKeystone('a2') && game.assassinBlurred) {
            finalMove *= 1.2;
            finalCritDmg += 25;
            finalEvasion = Math.floor(finalEvasion * 1.2);
        }
        if (hasKeystone('a4')) {
            finalPhysIgnore += 25;
            finalResPen += 25;
            finalBaseDmg = Math.floor(finalBaseDmg * 0.92);
        }
        if (hasKeystone('a6')) {
            if ((game.playerHp / Math.max(1, finalMaxHp)) > 0.66) finalCritDmg = Math.floor(finalCritDmg * 1.2);
            else finalEvasion = Math.floor(finalEvasion * 1.2);
        }
        if (hasKeystone('a7')) finalCritDmg -= 200;
        if (hasKeystone('a8')) {
            finalCritDmg *= 2;
            finalBaseDmg = Math.floor(finalBaseDmg * 0.75);
        }
    } else if (game.ascendClass === 'ranger') {
        if (hasKeystone('r1')) {
            finalMove *= 1.15;
            finalArmor = 0;
            finalEnergyShield = 0;
        }
        if (hasKeystone('r2')) {
            finalAspd = Math.min(12, finalAspd * 1.1);
            finalBaseDmg = Math.floor(finalBaseDmg * 0.9);
        }
        if (hasKeystone('r3')) {
            finalMinDmgRoll = Math.max(5, finalMinDmgRoll - 10);
        }
        if (hasKeystone('r4')) finalAspd = Math.min(12, finalAspd * (1 + Math.max(0, finalMove) * 0.001));
        if (hasKeystone('r6') && Array.isArray(skill.tags) && skill.tags.includes('projectile')) {
            skill.targets = Math.min(12, Math.max(1, (skill.targets || 1) + 1));
            finalBaseDmg = Math.floor(finalBaseDmg * 0.90 * (1 + Math.max(1, Math.floor(skill.targets || 1)) * 0.03));
        }
        if (hasKeystone('r8')) {
            let aspdBonus = Math.max(0, finalAspd - 1) * 0.07;
            let moveBonus = Math.max(0, finalMove) * 0.0007;
            finalAspd = Math.min(12, finalAspd * (1 + moveBonus));
            finalMove *= (1 + aspdBonus);
            finalMaxHp = Math.floor(finalMaxHp * 0.85);
        }
        if (hasKeystone('r7')) {
            if (!Number.isFinite(game.playerLastHitAt) || game.playerLastHitAt <= 0) game.playerLastHitAt = Date.now();
            let sinceHitSec = Math.max(0, (Date.now() - Math.floor(game.playerLastHitAt || 0)) / 1000);
            finalCrit = Math.min(100, finalCrit + Math.floor(sinceHitSec) * 5);
        }
    } else if (game.ascendClass === 'elementalist') {
        if (hasKeystone('e1')) {
            if (skill.ele === 'phys' && !(Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0)) finalBaseDmg = 0;
            else finalDamageMultiplier *= 1.15;
        }
        if (hasKeystone('e2')) {
            finalResF = Math.min(78, finalResF + 15);
            finalResC = Math.min(78, finalResC + 15);
            finalResL = Math.min(78, finalResL + 15);
            finalResChaos -= 10;
        }
        if (hasKeystone('e3')) {
            finalMaxHp = Math.floor(finalMaxHp * 0.85);
            finalEnergyShieldRegenRate += 10;
            finalEnergyShieldRechargeDelay = 0;
        }
        if (hasKeystone('e4')) { /* 융해 결합: 원소 풀 변환은 skill 생성 직후 적용됨 */ }
        if (hasKeystone('e5')) {
            let maxElemRes = Math.max(finalResF, finalResC, finalResL);
            finalResChaos += Math.floor(maxElemRes * 0.5);
            finalDamageMultiplier *= (1 + Math.max(0, finalResChaos) / 100);
        }
        if (hasKeystone('e6')) {
            finalResPen += 20;
            finalCritDmg -= 25;
        }
        if (hasKeystone('e8')) {
            let stacks = Math.max(0, Math.floor(game.elementalistOverloadStacks || 0));
            finalDamageMultiplier *= (1 + stacks * 0.04);
            finalCrit = Math.max(0, finalCrit - stacks);
        }
        if (hasKeystone('e7')) {
            let pool = Array.isArray(skill.randomElementPool) ? skill.randomElementPool : [];
            if (['fire','cold','light'].every(ele => pool.includes(ele))) {
                finalDamageMultiplier *= 1.05;
                ailmentPowerMultiplier = Math.max(ailmentPowerMultiplier, 2);
            }
        }
    } else if (game.ascendClass === 'warlock') {
        if (hasKeystone('wlk2')) {
            totalDotDamageMultiplier *= 1.10;
            instantDamageMultiplier *= 0.90;
        }
        if (hasKeystone('wlk3')) {
            finalRegen = 0;
            finalEnergyShieldRegenRate = 0;
        }
        if (hasKeystone('wlk6')) {
            finalResPen += 43;
            finalCrit = 0;
            finalPoisonChance += 25;
        }
        if (hasKeystone('wlk8')) {
            chaosDamageMultiplier *= 1.25;
            finalLeech *= 0.5;
            finalRegen *= 0.5;
            finalPoisonChance += 25;
        }
        if (hasKeystone('wlk5')) {
            dotTickIntervalMultiplier /= 1.33;
            dotDurationMultiplier *= 0.5;
        }
        if (hasKeystone('wlk7')) {
            if ((game.playerEnergyShield || 0) <= (finalEnergyShield * 0.5)) finalBaseDmg = Math.floor(finalBaseDmg * 1.2);
            finalDr = Math.max(-40, finalDr - 12);
        }
    } else if (game.ascendClass === 'guardian') {
        if (hasKeystone('gd1')) {
            finalArmor = Math.floor(finalArmor * 1.1);
            guardianArmorDamageBonus = true;
        }
        if (hasKeystone('gd2')) finalMaxHp = Math.floor(finalMaxHp * 1.2);
        if (hasKeystone('gd3')) { finalRegen *= 1.2; finalEnergyShieldRegenRate *= 0.8; }
        if (hasKeystone('gd4')) {
            let converted = Math.floor((finalEvasion + finalEnergyShield) * 0.6);
            finalArmor += converted;
            finalEvasion = 0;
            finalEnergyShield = 0;
        }
        if (hasKeystone('gd5')) {
            finalBaseDmg = Math.floor(finalBaseDmg * 0.88);
            genericTakenDamageMultiplier *= 0.85;
        }
        if (hasKeystone('gd6')) { let now = Date.now(); let stacks = (game.guardianEnduranceExpiresAt || 0) > now ? Math.max(0, Math.min(5, Math.floor(game.guardianEnduranceStacks || 0))) : 0; if (stacks > 0) finalArmor = Math.floor(finalArmor * (1 + stacks * 0.11)); guardianReflectDamage = Math.max(1, Math.floor(finalArmor * 0.6)); }
        if (guardianArmorDamageBonus) finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.max(0, finalArmor) * 0.001));
        if (hasKeystone('gd8')) { guardianBlockChance += 25; ailmentResistBonusPct += 50; }
        if (hasKeystone('gd7') && (game.playerHp / Math.max(1, finalMaxHp)) <= 0.4) {
            genericTakenDamageMultiplier *= 0.8;
            finalBaseDmg = Math.floor(finalBaseDmg * 1.2);
            let now = Date.now();
            if ((game.guardianLastStandCleanseAt || 0) + 5000 <= now) {
                game.playerAilments = [];
                game.guardianLastStandCleanseAt = now;
            }
        }
    } else if (game.ascendClass === 'inquisitor') {
        if (hasKeystone('iq3')) { suppCap += 1; game.resonancePower = Math.max(Math.floor(game.resonancePower || 0), 10 + Math.floor(((game.sealedSkills || []).length + (game.sealedSupports || []).length) / 4)); finalAspd = Math.max(0.1, finalAspd * 0.94); }
        let inquisitorResonancePower = Math.max(0, Math.floor(game.resonancePower || 0));
        let inquisitorElementalSkill = ['fire', 'cold', 'light'].includes(skill.ele) || (Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0);
        if (hasKeystone('iq1') && inquisitorElementalSkill) finalBaseDmg = Math.floor(finalBaseDmg * (1 + (inquisitorResonancePower * 0.5) / 100));
        if (hasKeystone('iq2')) {
            finalCrit = Math.max(0, finalCrit - 8);
            finalCritDmg += 75;
        }
        if (hasKeystone('iq5')) { finalResPen += 20; if (skill.ele === 'phys' && !(Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0)) finalBaseDmg = 0; }
        if (hasKeystone('iq6')) {
            suppCap += 1 + Math.floor(inquisitorResonancePower / 25);
            finalMaxHp = Math.floor(finalMaxHp * 0.75);
        }
        if (hasKeystone('iq7')) finalCritDmg += inquisitorResonancePower;
        if (hasKeystone('iq8') && inquisitorElementalSkill) finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.max(0, finalResPen) / 100));
    }

    finalCritDmg = Math.max(0, finalCritDmg);
    armorReduction = Math.min(90, (finalArmor / (finalArmor + referenceIncomingPhysical * 10)) * 100);
    evadeChance = Math.min(90, (finalEvasion / (finalEvasion + enemyAccuracy)) * 100);

    damageScales.dot = dotMultiplier;
    damageScales.dotStat = dotStatMultiplier;
    damageScales.instantDamageMultiplier = instantDamageMultiplier;
    damageScales.finalDamageMultiplier = finalDamageMultiplier;
    damageScales.ailmentPowerMultiplier = ailmentPowerMultiplier;
    damageScales.chaosDamageMultiplier = chaosDamageMultiplier;
    damageScales.dotTickIntervalMultiplier = dotTickIntervalMultiplier;
    damageScales.dotDurationMultiplier = dotDurationMultiplier;
    damageScales.warlockElementalOvercapToChaos = warlockElementalOvercapToChaos;

    if (skill.cannotCrit) finalCrit = 0;
    critChance = Math.max(0, Math.min(1, finalCrit / 100));
    critMulti = finalCritDmg / 100;
    avgHit = finalBaseDmg * (1 - critChance) + finalBaseDmg * critChance * critMulti;
    finalDps = avgHit * finalAspd;

    let avgRollMultiplier = Math.max(0.05, (finalMinDmgRoll + finalMaxDmgRoll) / 200);
    let expectedDoubleStrikeMultiplier = Math.max(1, 1 + (Math.max(0, finalDs) / 100));
    let dpsDamageMultiplier = instantDamageMultiplier * finalDamageMultiplier * (skill.ele === 'chaos' ? chaosDamageMultiplier : 1);
    let finalDpsAdjusted = finalDps * avgRollMultiplier * expectedDoubleStrikeMultiplier * dpsDamageMultiplier;
    let isProjectileSkillForDps = Array.isArray(skill.tags) && skill.tags.includes('projectile');
    let projectileExtraShotsForDps = isProjectileSkillForDps ? Math.max(0, Math.min(5, Math.floor(totalProjectileExtraShots || 0))) : 0;
    let projectileExtraShotDpsMul = 1 + projectileExtraShotsForDps;
    let finalDpsWithProjectileShots = finalDpsAdjusted * projectileExtraShotDpsMul;

    function makeAilmentChanceBreakdown(title, statId, finalValue, critValue, note) {
        return {
            title: title,
            lines: [
                makeSourceLine('장비', (gearBase[statId] || 0) + (gearExplicit[statId] || 0), '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', (passive[statId] || 0) + (season[statId] || 0) + (ascend[statId] || 0) + (reward[statId] || 0), '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조 젬', support[statId] || 0, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('성좌 각성', starBlessing[statId] || 0, '%', value => `${value.toFixed(1)}%`),
                note || `치명타 시 해당 상태 이상 확률: ${Math.floor(critValue)}%`,
                note ? null : '비치명타는 위 확률을 사용하며, 치명타는 기본적으로 해당 피해 속성의 상태 이상을 보장합니다.'
            ].filter(Boolean),
            final: `${Math.max(0, finalValue).toFixed(1)}%`
        };
    }

    let breakdowns = {
        atk: {
            title: '공격력',
            lines: [
                isSpellSkill ? `주문 내장 피해 ${Math.floor(spellFlatDmg)}` : `기본 공격력 ${Math.floor(baseDmg)}`,
                isSpellSkill ? null : makeSourceLine('장비', gearFlatDmg),
                isSpellSkill ? null : makeSourceLine('패시브', passiveFlatDmg),
                makeSourceLine('성좌 각성', starBlessing.pctDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('총 피해 증가', generalPctDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('태그 보너스', taggedTotal, '%', value => `${Math.floor(value)}%`),
                taggedSummary.length > 0 ? `적용 태그: ${taggedSummary.join(' / ')}` : null,
                `스킬 배율 ${formatPercentMultiplier(skill.dmg || 1)}`,
                (skill.hpDmgScale || 0) > 0 ? `생명력 계수 내장 피해 +${Math.floor(hpFlatBonus)} (최대 생명력 ${Math.floor(finalMaxHp)}, 피해 증가 적용)` : null,
                (skill.regenDmgScale || 0) > 0 ? `재생 계수 배율 ${regenScaledBonus.toFixed(2)}x (재생 ${formatValue('regen', finalRegen)}%)` : null,
                (skill.fireResDmgScale || 0) > 0 ? `화염 저항 계수 배율 ${fireResScaledBonus.toFixed(2)}x (화염 저항 ${Math.floor(finalResF)}%)` : null,
                (skill.fireResOvercapMulPerPct || 0) > 0 ? `초과 화염 저항 계수 배율 ${fireResScaledBonus.toFixed(2)}x (미적용 화염 저항 ${Math.floor(rawResF)}%/${Math.floor(finalMaxResF)}%, 최대치 초과 적용분 ${fireResOvercap.toFixed(1)}%)` : null,
                (skill.dotMultiplier || 1) !== 1 ? `스킬 지속 피해 배율 ${dotMultiplier.toFixed(2)}x` : null,
                dotPctDmg > 0 ? `지속 피해 배율 스탯 ${Math.floor(dotPctDmg)}% (${dotStatMultiplier.toFixed(2)}x)` : null,
                instantDamageMultiplier !== 1 ? `즉발 피해 배율 ${instantDamageMultiplier.toFixed(2)}x` : null,
                finalDamageMultiplier !== 1 ? `최종 피해 배율 ${finalDamageMultiplier.toFixed(2)}x` : null,
                chaosDamageMultiplier !== 1 ? `카오스 피해 배율 ${chaosDamageMultiplier.toFixed(2)}x` : null,
                skill.convertedToChaos ? '워록 심연 각인: 모든 공격 피해를 카오스 피해로 적용' : null,
                `피해 범위 ${Math.floor(finalMinDmgRoll)}% ~ ${Math.floor(finalMaxDmgRoll)}%`
            ].filter(Boolean),
            final: `${Math.floor(finalBaseDmg)}`
        },
        aps: {
            title: '공속',
            lines: [
                `기본 1.00`,
                makeSourceLine('장비', gearAspd, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passiveAspd, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.aspd, '%', value => `${Math.floor(value)}%`),
                glovePairAspdBonus > 0 ? `동형 장갑 세트 보너스 +${glovePairAspdBonus.toFixed(2)} 기본 공속` : null,
                `스킬 속도 배율 ${formatPercentMultiplier(skill.spd || 1)}`,
                rawAspd > 5 ? `소프트캡 적용중 (원시 ${rawAspd.toFixed(2)} → 최종 ${finalAspd.toFixed(2)})` : null
            ].filter(Boolean),
            final: `${finalAspd.toFixed(2)}`
        },
        crit: {
            title: '치명타 확률',
            lines: [
                `기본 5.0%`,
                makeSourceLine('장비', gearCrit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', passiveCrit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조 젬', support.crit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('스킬', skill.crit || 0, '%', value => `${value.toFixed(1)}%`)
            ].filter(Boolean),
            final: `${finalCrit.toFixed(1)}%`
        },
        critDmg: {
            title: '치명타 피해',
            lines: [
                `기본 150%`,
                makeSourceLine('장비', gearBase.critDmg + gearExplicit.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.critDmg + season.critDmg + ascend.critDmg + reward.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.critDmg, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalCritDmg)}%`
        },
        move: {
            title: '이동 속도',
            lines: [
                `기본 100%`,
                makeSourceLine('장비', gearBase.move + gearExplicit.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.move + season.move + ascend.move + reward.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('성좌 각성', starBlessing.move, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.move, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalMove)}%`
        },
        hp: {
            title: '최대 생명력',
            lines: [
                `기본 생명력 ${Math.floor(baseHp)}`,
                makeSourceLine('장비', gearFlatHp),
                makeSourceLine('패시브', passiveFlatHp),
                makeSourceLine('성좌 각성', starBlessing.flatHp),
                makeSourceLine('생명력 증가', totalPctHp, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalMaxHp)}`
        },
        regen: {
            title: '초당 재생',
            lines: [
                makeSourceLine('장비', gearBase.regen + gearExplicit.regen, '%', value => `${formatValue('regen', value)}%`),
                makeSourceLine('패시브', passive.regen + season.regen + ascend.regen + reward.regen, '%', value => `${formatValue('regen', value)}%`),
                makeSourceLine('보조 젬', support.regen, '%', value => `${formatValue('regen', value)}%`)
            ].filter(Boolean),
            final: `${formatValue('regen', finalRegen)}%`
        },
        regenSuppress: {
            title: '재생 억제',
            lines: [
                makeSourceLine('장비', gearBase.regenSuppress + gearExplicit.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                makeSourceLine('패시브', passive.regenSuppress + season.regenSuppress + ascend.regenSuppress + reward.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                makeSourceLine('보조 젬', support.regenSuppress, '%', value => `${formatValue('regenSuppress', value)}%`),
                '공격 시 적의 생명력 재생을 해당 수치(%)만큼 줄여주는 옵션입니다.'
            ].filter(Boolean),
            final: `${formatValue('regenSuppress', finalRegenSuppress)}%`
        },
        leech: {
            title: '흡혈',
            lines: [
                makeSourceLine('스킬', skill.leech || 0, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('장비', gearBase.leech + gearExplicit.leech, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('패시브', passive.leech + season.leech + ascend.leech + reward.leech, '%', value => `${formatValue('leech', value)}%`),
                makeSourceLine('보조 젬', support.leech, '%', value => `${formatValue('leech', value)}%`),
                skill.instantLeech ? '흡혈 타격: 이 젬으로 준 피해의 흡혈은 인스턴스 대신 즉시 회복됩니다.' : `타격 시 즉시 회복 대신 흡혈 인스턴스 생성`,
                (game.ascendClass === 'warlock' && hasKeystone('wlk3')) ? `금단 대가: 흡혈 ${skill.instantLeech ? '즉시 회복이 생명력 대신 에너지 보호막에 적용됩니다.' : '인스턴스가 생명력 대신 에너지 보호막에 저장/회복됩니다.'}` : null,
                `기본 캡: 타격당 최대 생명력 ${LEECH_BASE_INSTANCE_CAP_PCT}% · 전체 저장 ${LEECH_BASE_TOTAL_CAP_PCT}% · 인스턴스당 초당 ${LEECH_BASE_RATE_CAP_PCT}%`,
                `추가 캡: 회복 속도 +${formatValue('leechRateCap', finalLeechRateCap)}%p · 전체 +${formatValue('leechTotalCap', finalLeechTotalCap)}%p · 타격당 +${formatValue('leechInstanceCap', finalLeechInstanceCap)}%p`,
                `적용 전 ${formatValue('leech', rawLeech)}% → 적용 후 ${formatValue('leech', finalLeech)}%`
            ].filter(Boolean),
            final: `${formatValue('leech', finalLeech)}%`
        },
        ds: {
            title: '연속 타격',
            lines: [
                makeSourceLine('장비', gearBase.ds + gearExplicit.ds, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.ds + season.ds + ascend.ds + reward.ds, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.ds, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalDs)}%`
        },
        dr: {
            title: '물리 피해 감소',
            lines: [
                makeSourceLine('장비', gearBase.dr + gearExplicit.dr, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.dr + season.dr + ascend.dr + reward.dr, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.dr, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalDr)}%`
        },
        armor: {
            title: '방어도',
            lines: [
                makeSourceLine('장비', gearBase.armor + gearExplicit.armor),
                makeSourceLine('패시브', passive.armor + season.armor + ascend.armor + reward.armor),
                makeSourceLine('방어도 증가', totalArmorPct, '%', value => `${Math.floor(value)}%`),
                `예상 물리 피해 감소율(기준 타격 ${Math.floor(referenceIncomingPhysical)}): ${armorReduction.toFixed(1)}%`
            ].filter(Boolean),
            final: `${Math.floor(finalArmor)}`
        },
        evasion: {
            title: '회피',
            lines: [
                makeSourceLine('장비', gearBase.evasion + gearExplicit.evasion),
                makeSourceLine('패시브', passive.evasion + season.evasion + ascend.evasion + reward.evasion),
                makeSourceLine('회피 증가', totalEvasionPct, '%', value => `${Math.floor(value)}%`),
                `예상 회피 확률(동일 레벨 적 기준): ${evadeChance.toFixed(1)}%`
            ].filter(Boolean),
            final: `${Math.floor(finalEvasion)}`
        },
        energyShield: {
            title: '에너지 보호막',
            lines: [
                makeSourceLine('장비', gearBase.energyShield + gearExplicit.energyShield),
                makeSourceLine('패시브', passive.energyShield + season.energyShield + ascend.energyShield + reward.energyShield),
                makeSourceLine('보호막 증가', totalEnergyShieldPct, '%', value => `${Math.floor(value)}%`),
                `재충전 대기시간: ${finalEnergyShieldRechargeDelay.toFixed(2)}초`,
                `에너지 보호막 재생량: 초당 ${Math.floor(finalEnergyShield * (finalEnergyShieldRegenRate / 100))} (${finalEnergyShieldRegenRate.toFixed(1)}%)`
            ].filter(Boolean),
            final: `${Math.floor(finalEnergyShield)}`
        },
        physIgnore: {
            title: '물리 피해 감소 무시',
            lines: [
                makeSourceLine('장비', gearBase.physIgnore + gearExplicit.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.physIgnore + season.physIgnore + ascend.physIgnore + reward.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.physIgnore, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('각인', skill.physIgnoreBonus || 0, '%', value => `${Math.floor(value)}%`),
                '적의 양수 물리 피해 감소만 0%까지 깎습니다.'
            ].filter(Boolean),
            final: `${Math.floor(finalPhysIgnore)}%`
        },
        resPen: {
            title: '저항 관통',
            lines: [
                makeSourceLine('장비', gearBase.resPen + gearExplicit.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resPen + season.resPen + ascend.resPen + reward.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.resPen, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('각인', skill.resPenBonus || 0, '%', value => `${Math.floor(value)}%`),
                '원소/카오스 저항은 음수까지 떨어질 수 있으며, 음수만큼 추가 피해를 줍니다.'
            ].filter(Boolean),
            final: `${Math.floor(finalResPen)}%`
        },
        resF: {
            title: '화염 저항',
            lines: [
                makeSourceLine('장비', gearBase.resF + gearExplicit.resF, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resF + season.resF + ascend.resF + reward.resF, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('캠페인 패널티', -resistPenalty, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalResF)}%`
        },
        resC: {
            title: '냉기 저항',
            lines: [
                makeSourceLine('장비', gearBase.resC + gearExplicit.resC, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resC + season.resC + ascend.resC + reward.resC, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('캠페인 패널티', -resistPenalty, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalResC)}%`
        },
        resL: {
            title: '번개 저항',
            lines: [
                makeSourceLine('장비', gearBase.resL + gearExplicit.resL, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resL + season.resL + ascend.resL + reward.resL, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('캠페인 패널티', -resistPenalty, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalResL)}%`
        },
        resChaos: {
            title: '카오스 저항',
            lines: [
                makeSourceLine('장비', gearBase.resChaos + gearExplicit.resChaos, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.resChaos + season.resChaos + ascend.resChaos + reward.resChaos, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('캠페인 패널티', -resistPenalty, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('암흑 치환', warlockElementalOvercapToChaos, '%', value => `${Math.floor(value)}%`)
            ].filter(Boolean),
            final: `${Math.floor(finalResChaos)}%`
        },
        dmgRoll: {
            title: '피해 보정 범위',
            lines: [
                makeSourceLine('최소', finalMinDmgRoll, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('최대', finalMaxDmgRoll, '%', value => `${Math.floor(value)}%`)
            ],
            final: `${Math.floor(finalMinDmgRoll)}% ~ ${Math.floor(finalMaxDmgRoll)}%`
        },
        igniteChance: makeAilmentChanceBreakdown('점화 확률', 'igniteChance', finalIgniteChance, ailmentCritChance.ignite),
        chillChance: makeAilmentChanceBreakdown('냉각 확률', 'chillChance', finalChillChance, ailmentCritChance.chill),
        freezeChance: makeAilmentChanceBreakdown('동결 확률', 'freezeChance', finalFreezeChance, ailmentCritChance.freeze, '냉기 피해 치명타는 동결 시도를 보장합니다. 그 외에는 해당 확률로 동결을 시도하며, 시도 성공 후 적의 최대 생명력 대비 타격 피해로 동결 적용 판정을 합니다.'),
        poisonChance: makeAilmentChanceBreakdown('중독 확률', 'poisonChance', finalPoisonChance, ailmentCritChance.poison),
        bleedChance: makeAilmentChanceBreakdown('출혈 확률', 'bleedChance', finalBleedChance, ailmentCritChance.bleed),
        dps: {
            title: 'DPS',
            lines: [
                `평균 한 방 ${Math.floor(avgHit)}`,
                `공격 속도 ${finalAspd.toFixed(2)}`,
                `치명 기대값 반영`,
                `피해 보정 기대값 x${avgRollMultiplier.toFixed(2)} (${Math.floor(finalMinDmgRoll)}~${Math.floor(finalMaxDmgRoll)}%)`,
                `연속 타격 기대값 x${expectedDoubleStrikeMultiplier.toFixed(2)} (${Math.floor(finalDs)}%)`,
                isProjectileSkillForDps && projectileExtraShotsForDps > 0 ? `투사체 추가 발사 기대값 x${projectileExtraShotDpsMul.toFixed(2)} (추가 발사 +${projectileExtraShotsForDps})` : null
            ].filter(Boolean),
            final: `${Math.floor(finalDpsWithProjectileShots)}`
        },
        gem: {
            title: '젬 레벨 보너스',
            lines: [
                makeSourceLine('패시브', gemSources.passive + gemSources.reward),
                makeSourceLine('장비', gemSources.gear)
            ].filter(Boolean),
            final: `총 +${gemSources.total}`
        }
    };

    let enemy = {
        baseDmg: finalBaseDmg,
        maxHp: finalMaxHp,
        aspd: finalAspd || 1.0,
        crit: finalCrit,
        moveSpeed: finalMove,
        chillEffectReducePct: finalChillEffectReducePct,
        freezeDurationReducePct: finalFreezeDurationReducePct,
        shockEffectReducePct: finalShockEffectReducePct,
        igniteDamageReducePct: finalIgniteDamageReducePct,
        bleedDamageReducePct: finalBleedDamageReducePct,
        poisonDamageReducePct: finalPoisonDamageReducePct,
        dotTakenDamageReducePct: finalDotTakenDamageReducePct,
        takenDamageReduceWhen2EnemiesPct: finalTakenDamageReduceWhen2EnemiesPct,
        takenDamageReduceWhen1EnemyPct: finalTakenDamageReduceWhen1EnemyPct,
        igniteDamageMultiplierPct: finalIgniteDamageMultiplierPct,
        dps: finalDpsWithProjectileShots || 0,
        dpsBaseNoProjectileShots: finalDpsAdjusted || 0,
        critDmg: finalCritDmg,
        regen: finalRegen,
        regenSuppress: finalRegenSuppress,
        leech: finalLeech,
        leechRateCap: finalLeechRateCap,
        leechTotalCap: finalLeechTotalCap,
        leechInstanceCap: finalLeechInstanceCap,
        dr: finalDr,
        physIgnore: finalPhysIgnore,
        allowNegativePhysIgnore: allowNegativePhysIgnore,
        warriorPhysDamageMultiplier: warriorPhysDamageMultiplier,
        warriorTakenDamageMultiplier: warriorTakenDamageMultiplier,
        genericTakenDamageMultiplier: genericTakenDamageMultiplier,
        bossDamageDealtMultiplier: bossDamageDealtMultiplier,
        bossTakenDamageMultiplier: bossTakenDamageMultiplier,
        swiftOpeningTakenMultiplier: swiftOpeningTakenMultiplier,
        guardianReflectDamage: guardianReflectDamage,
        guardianBlockChance: guardianBlockChance,
        ailmentResistBonusPct: ailmentResistBonusPct,
        ds: finalDs,
        slamEchoChance: finalSlamEchoChance,
        minDmgRoll: finalMinDmgRoll,
        maxDmgRoll: finalMaxDmgRoll,
        gemLv: gemSources.total,
        gemBonusSources: gemSources,
        glovePairAspdBonus: glovePairAspdBonus,
        suppCap: suppCap,
        expGain: season.expGain + reward.expGain + uniqueXpGainPct,
        sSkill: skill,
        resPen: finalResPen,
        resF: finalResF,
        rawResF: rawResF,
        resC: finalResC,
        resL: finalResL,
        maxResF: finalMaxResF,
        maxResC: finalMaxResC,
        maxResL: finalMaxResL,
        resChaos: finalResChaos,
        ailResIgnite: (gearExplicit.ailResIgnite || 0) + (passive.ailResIgnite || 0) + (season.ailResIgnite || 0) + (ascend.ailResIgnite || 0) + (reward.ailResIgnite || 0),
        ailResShock: (gearExplicit.ailResShock || 0) + (passive.ailResShock || 0) + (season.ailResShock || 0) + (ascend.ailResShock || 0) + (reward.ailResShock || 0),
        ailResFreeze: (gearExplicit.ailResFreeze || 0) + (passive.ailResFreeze || 0) + (season.ailResFreeze || 0) + (ascend.ailResFreeze || 0) + (reward.ailResFreeze || 0),
        ailResPoison: (gearExplicit.ailResPoison || 0) + (passive.ailResPoison || 0) + (season.ailResPoison || 0) + (ascend.ailResPoison || 0) + (reward.ailResPoison || 0),
        ailResBleed: (gearExplicit.ailResBleed || 0) + (passive.ailResBleed || 0) + (season.ailResBleed || 0) + (ascend.ailResBleed || 0) + (reward.ailResBleed || 0),
        resistPenalty: resistPenalty,
        dotDamageScale: totalDotDamageMultiplier,
        instantDamageMultiplier: instantDamageMultiplier,
        finalDamageMultiplier: finalDamageMultiplier,
        ailmentPowerMultiplier: ailmentPowerMultiplier,
        shockEffectBonusPct: (gearExplicit.shockEffect || 0) + (passive.shockEffect || 0) + (season.shockEffect || 0) + (ascend.shockEffect || 0) + (reward.shockEffect || 0),
        chaosDamageMultiplier: chaosDamageMultiplier,
        dotTickIntervalMultiplier: dotTickIntervalMultiplier,
        dotDurationMultiplier: dotDurationMultiplier,
        igniteChance: finalIgniteChance,
        chillChance: finalChillChance,
        freezeChance: finalFreezeChance,
        poisonChance: finalPoisonChance,
        bleedChance: finalBleedChance,
        ailmentCritChance: ailmentCritChance,
        damageScales: damageScales,
        randomElementDamagePct: randomElementDamagePct,
        talismanBossFinalDmgBonusPct: talismanBossFinalDmgBonusPct,
        armor: finalArmor,
        evasion: finalEvasion,
        energyShield: finalEnergyShield,
        armorReduction: armorReduction,
        evadeChance: evadeChance,
        energyShieldRegenRate: finalEnergyShieldRegenRate,
        energyShieldRechargeDelay: finalEnergyShieldRechargeDelay,
        projectileExtraShots: Math.max(0, Math.floor(totalProjectileExtraShots)),
        breakdowns: breakdowns,
        uniqueClosedEyes: uniqueClosedEyes,
        uniqueShockInvertTaken: uniqueShockInvertTaken,
        uniqueAlwaysShock: uniqueAlwaysShock,
        uniqueProjectileDoubleStrikePct: uniqueProjectileDoubleStrikePct,
        uniqueChaosResDownOnHit: uniqueChaosResDownOnHit,
        uniqueCorpseExplode: uniqueCorpseExplode,
        uniqueInstantLeechPct: uniqueInstantLeechPct,
        uniqueDoubleDamageChancePct: uniqueDoubleDamageChancePct,
        uniqueEsRecoverOnCritPct: uniqueEsRecoverOnCritPct,
        uniqueRiderCompass: uniqueRiderCompass,
        uniqueMaxRollBonusHit: uniqueMaxRollBonusHit,
        uniqueCeilingSmashDouble: uniqueCeilingSmashDouble,
        uniqueConditionManual: uniqueConditionManual,
        uniqueStackingElementalResDownOnHit: uniqueStackingElementalResDownOnHit,
        uniqueLeechEfficiencyOnKill: uniqueLeechEfficiencyOnKill,
        uniqueOverkillSplash: uniqueOverkillSplash,
        uniqueDragonVeinGuard: uniqueDragonVeinGuard,
        uniqueGuardianArmor: uniqueGuardianArmor,
        uniqueQueenBeeSummon: uniqueQueenBeeSummon,
        uniqueBleedWeightOnBleedingHit: uniqueBleedWeightOnBleedingHit,
        uniqueMeteorFootsteps: uniqueMeteorFootsteps
        ,uniquePoisonExtraStacks: uniqueVenomStride ? 1 : 0
    };
    if (uniqueImmuneIgnite) enemy.immuneIgnite = true;
    if (uniqueFrostSentinel) { enemy.immuneChill = true; enemy.immuneFreeze = true; }
    if (uniqueShockTracer) enemy.immuneShock = true;
    if (uniqueBleedBlockHelm) enemy.immuneBleed = true;
    if (uniqueClosedEyes) {
        enemy.immuneIgnite = true;
        enemy.immuneChill = true;
        enemy.immuneFreeze = true;
        enemy.immuneShock = true;
        enemy.immuneBleed = true;
        enemy.immunePoison = true;
    }
    return enemy;
}

function getGemPresentation(name, isSupport) {
    let stats = getPlayerStats();
    if (isSupport) {
        let gem = normalizeGemRecord((game.supportGemData || {})[name]);
        let db = SUPPORT_GEM_DB[name];
        if (!db) return { baseLevel: gem.level, totalLevel: gem.level, value: 0, desc: '정의되지 않은 보조젬', statName: name, statId: null };
        let totalLevel = Math.max(1, gem.level + stats.gemBonusSources.total);
        let val = db.baseVal + ((totalLevel - 1) * db.scale);
        let activeTier = Math.max(1, Math.min(3, Math.floor(gem.activeTier || gem.unlockedTier || 1)));
        let tierMul = activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2;
        return { baseLevel: gem.level, totalLevel: totalLevel, value: val * tierMul, desc: db.desc, statName: db.name, statId: db.stat, activeTier: activeTier };
    }
    let db = SKILL_DB[name];
    if (!db) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: '정의되지 않은 스킬', skill: SKILL_DB['기본 공격'], tags: ['attack'] };
    if (!db.isGem && !db.levelable) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: db.desc, statName: name, skill: db, tags: getSkillTagList(db) };
    game.gemData = game.gemData || {};
    let gem = normalizeGemRecord((game.gemData || {})[name]);
    if (db.levelable) game.gemData[name] = gem;
    let materialBonus = db.isGem ? (gem.bossCoreLevel || 0) + (gem.skyCoreLevel || 0) + (gem.awakened ? 2 : 0) : 0;
    let levelBonus = db.isGem ? stats.gemBonusSources.total : 0;
    let totalLevel = gem.level + levelBonus + materialBonus;
    let finalLevel = Math.min(20, gem.level) + levelBonus + materialBonus;
    let skill = { ...db };
    skill.dmg = skill.baseDmg + ((finalLevel - 1) * skill.dmgScale);
    skill.spd = skill.baseSpd + ((finalLevel - 1) * skill.spdScale);
    if (skill.critScale) skill.crit = (skill.crit || 0) + (finalLevel * skill.critScale);
    let qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    skill.dmg *= qualityMul;
    skill.spd *= qualityMul;
    return { baseLevel: gem.level, totalLevel: totalLevel, finalLevel: finalLevel, materialBonus: materialBonus, bossCoreLevel: gem.bossCoreLevel || 0, skyCoreLevel: gem.skyCoreLevel || 0, skyEnhanceCap: gem.skyEnhanceCap || 1, quality: gem.quality || 0, awakened: !!gem.awakened, desc: db.desc, skill: skill, tags: getSkillTagList(skill) };
}

function getSkillTargets(pStats) {
    let alive = (game.enemies || []).filter(enemy => enemy.hp > 0);
    if (alive.length === 0) return [];
    let skill = pStats.sSkill;
    let targetCount = Math.max(1, skill.targets || 1);
    if (skill.targetMode === 'all') return alive.slice(0, Math.min(8, Math.max(6, skill.targets || 6))).map(enemy => ({ enemy: enemy, mult: 1 }));
    if (skill.targetMode === 'whirl') {
        return alive.slice(0, targetCount).map((enemy, idx) => ({
            enemy: enemy,
            mult: idx === 0 ? 1 : (idx < 3 ? 0.82 : (idx < 5 ? 0.68 : 0.56))
        }));
    }
    if (skill.targetMode === 'cleave') return alive.slice(0, targetCount).map((enemy, idx) => ({ enemy: enemy, mult: idx === 0 ? 1 : 0.72 }));
    if (skill.targetMode === 'chain') return alive.slice(0, targetCount).map((enemy, idx) => ({ enemy: enemy, mult: Math.max(0.45, 1 - idx * 0.2) }));
    if (skill.targetMode === 'pierce') return alive.slice(0, targetCount).map((enemy, idx) => ({ enemy: enemy, mult: idx === 0 ? 1 : 0.65 }));
    if (targetCount > 1) return alive.slice(0, targetCount).map((enemy, idx) => ({ enemy: enemy, mult: idx === 0 ? 1 : 0.7 }));
    return [{ enemy: alive[0], mult: 1 }];
}




function rollEnemyTrait(zone, isElite, isBoss, seed) {
    if (!isElite && !isBoss) return null;
    let list = ENEMY_TRAIT_POOL.slice();
    if (zone && zone.type === 'trial' && zone.id === 'trial_3') {
        list = list.filter(trait => trait.id !== 'bloodless');
    }
    if (zone && zone.type === 'trial' && zone.id === 'trial_4') {
        list = list.map(trait => trait.id === 'bloodless' ? { id: 'leechResist_trial4', name: '흡혈저항', leechEffMul: 0.45, expMul: trait.expMul, dropMul: trait.dropMul } : trait);
    }
    if (zone.ele === 'fire') list.unshift({ id: 'fireWard+', name: '화염 과충전', resF: 36 });
    if (zone.ele === 'cold') list.unshift({ id: 'coldWard+', name: '빙결 과충전', resC: 36 });
    if (zone.ele === 'light') list.unshift({ id: 'lightWard+', name: '뇌전 과충전', resL: 36 });
    if (zone.ele === 'chaos') list.unshift({ id: 'chaosWard+', name: '공허 장막', resChaos: 32 });
    if ((game.season || 1) >= 10 && zone && zone.type === 'abyss' && zone.ele === 'chaos') list.unshift({ id: 'veryFast_loop10', name: '매우 빠름', attackSpeedVarMul: 1.34, expMul: 1.10, dropMul: 1.08 });
    let idx = Math.abs(seed || 0) % list.length;
    return { ...list[idx] };
}


function applyDamageToEnemyResource(enemy, damage, options) {
    let remaining = Math.max(0, Math.floor(Number(damage) || 0));
    if (!enemy || remaining <= 0) return 0;
    let dealt = 0;
    if ((enemy.energyShield || 0) > 0) {
        let absorbed = Math.min(Math.max(0, Math.floor(enemy.energyShield || 0)), remaining);
        enemy.energyShield = Math.max(0, Math.floor(enemy.energyShield || 0) - absorbed);
        remaining -= absorbed;
        dealt += absorbed;
    }
    if (remaining > 0) {
        let beforeHp = Math.max(0, Math.floor(enemy.hp || 0));
        let minimumHp = Math.max(0, Math.floor((options && Number.isFinite(options.minimumHp)) ? options.minimumHp : 0));
        enemy.hp = Math.max(minimumHp, beforeHp - remaining);
        dealt += Math.max(0, beforeHp - enemy.hp);
    }
    return dealt;
}
function getEnemyLifeDamagePct(enemy) {
    if (!enemy || !(enemy.maxHp > 0)) return 0;
    return Math.max(0, Math.min(100, (1 - (Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1))) * 100));
}
function maybeUnlockChaosRealmFromWoodsman(enemy, options) {
    if (!enemy || !enemy.isBoss) return;
    let zone = getZone(game.currentZoneId) || getZone(0);
    if (!zone || zone.id !== OUTSIDE_CHAOS_ZONE_ID) return;
    let st = ensureChaosRealmState();
    let pct = getEnemyLifeDamagePct(enemy);
    st.woodsmanBestDamagePct = Math.max(st.woodsmanBestDamagePct || 0, pct);
    if (options && options.finalize && !st.unlocked && st.woodsmanBestDamagePct >= 10) {
        st.unlocked = true;
        st.highestFloor = Math.max(1, Math.floor(st.highestFloor || 0));
        game.noti.map = true;
        addLog('🌌 나무꾼의 경계가 갈라지며 혼돈계가 해금되었습니다.', 'loot-unique');
        if (typeof queueTutorialNotice === 'function') queueTutorialNotice('unlock_chaos_realm', '혼돈계 해금', '혼돈 밖 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투가 종료되었습니다.\n지도 탭의 혼돈계에서 루프 밖 영구 등반을 시작하세요.', 'tab-map');
    }
    if (options && options.log) {
        addLog(`🪓 나무꾼 피해율 기록: ${st.woodsmanBestDamagePct.toFixed(1)}% / 해금 조건 10%`, st.woodsmanBestDamagePct >= 10 ? 'season-up' : 'attack-monster');
    }
}
function applyChaosRealmAffixesToEnemy(enemy, zone) {
    if (!enemy || !zone || zone.type !== 'chaosRealm') return enemy;
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let scale = getChaosRealmAffixScale(floor);
    let affixes = getChaosRealmAffixes(floor);
    enemy.chaosRealmFloor = floor;
    enemy.chaosRealmAffixes = affixes;
    enemy.traitName = affixes.map(a => a.name).join(' · ');
    affixes.forEach(affix => {
        let s = affix.scale || scale;
        if (affix.id === 'elemental_wall') { enemy.resF += Math.floor(58 * s); enemy.resC += Math.floor(58 * s); enemy.resL += Math.floor(58 * s); }
        if (affix.id === 'iron_bark') { enemy.dr += Math.floor(34 * s); enemy.armorGuard = Math.max(enemy.armorGuard || 0, 0.16 + 0.05 * s); }
        if (affix.id === 'mirage_step') enemy.evasionChance = Math.max(enemy.evasionChance || 0, Math.min(55, 22 + floor * 0.9));
        if (affix.id === 'soul_shell') { enemy.maxEnergyShield = Math.max(enemy.maxEnergyShield || 0, enemy.maxHp); enemy.energyShield = enemy.maxEnergyShield; }
        if (affix.id === 'projectile_dampening') enemy.projectileDamageTakenMul = Math.min(enemy.projectileDamageTakenMul || 1, 0.5);
        if (affix.id === 'spell_dampening') enemy.spellDamageTakenMul = Math.min(enemy.spellDamageTakenMul || 1, 0.5);
        if (affix.id === 'blood_drinker') enemy.leechPct = Math.max(enemy.leechPct || 0, 2.5 + floor * 0.08);
        if (affix.id === 'bloodless') enemy.leechEffMul = Math.min(enemy.leechEffMul || 1, Math.max(0.08, 0.28 - floor * 0.002));
        if (affix.id === 'curse_blade') { enemy.curseBlade = true; enemy.atkMul = (enemy.atkMul || 1) * (1.18 + floor * 0.006); enemy.penetration += Math.floor(8 * s); }
        if (affix.id === 'curse_immune') enemy.curseImmune = true;
        if (affix.id === 'phys_dampening') enemy.physicalDamageTakenMul = Math.min(enemy.physicalDamageTakenMul || 1, 0.5);
        if (affix.id === 'deadly_crit') { enemy.critChance += Math.floor(18 * s); enemy.critDamageMul = Math.max(enemy.critDamageMul || 1.55, 1.95 + floor * 0.01); }
        if (affix.id === 'multi_strike') enemy.doubleStrikeChance = Math.max(enemy.doubleStrikeChance || 0, Math.min(45, 18 + floor * 0.6));
        if (affix.id === 'deep_penetration') enemy.penetration += Math.floor(18 * s);
    });
    return enemy;
}
function getChaosRealmBonusSummary() {
    let b = (ensureChaosRealmState().permanentBonuses || {});
    return [`피해 +${(b.pctDmg||0).toFixed(1)}%`, `이속 +${(b.move||0).toFixed(1)}%`, `생명력 +${(b.pctHp||0).toFixed(1)}%`, `카오스저항 +${Math.floor(b.resChaos||0)}%`, `치명 +${Math.floor(b.crit||0)}%`, `관통 +${Math.floor(b.resPen||0)}%`, `방어/회피/보호막 +${Math.floor(b.armorPct||0)}%`, `치피 +${Math.floor(b.critDmg||0)}%`, `공속 +${Math.floor(b.aspd||0)}%`].join(' · ');
}
function grantChaosRealmFloorBonus(floor) {
    let st = ensureChaosRealmState();
    let b = st.permanentBonuses;
    b.pctDmg += 0.5;
    b.move += 0.5;
    if (floor % 3 === 0) b.pctHp += 1;
    if (floor % 5 === 0) b.resChaos += 1;
    if (floor % 10 === 0) b.crit += 1;
    if (floor % 15 === 0) { b.armorPct += 10; b.evasionPct += 10; b.energyShieldPct += 10; }
    if (floor % 25 === 0) { b.critDmg += 5; b.aspd += 5; }
    addLog(`🌌 혼돈계 ${floor}층 최초 돌파 보너스: ${getChaosRealmBonusSummary()}`, 'loot-unique');
    if (floor === 10) addLog('🗺️ 혼돈계 10층 달성! 모든 액트 구간 지도 길이가 50%로 축소됩니다.', 'season-up');
}

function getEnemyElementResistance(skillEle, zoneTier, enemy) {
    let baseRes = 0;
    if (skillEle === 'fire' || skillEle === 'cold' || skillEle === 'light') baseRes = Math.min(32, zoneTier * 3);
    else if (skillEle === 'chaos') baseRes = Math.min(22, zoneTier * 2.2);
    if (!enemy) return baseRes;
    if (skillEle === 'fire') return baseRes + (enemy.resF || 0);
    if (skillEle === 'cold') return baseRes + (enemy.resC || 0);
    if (skillEle === 'light') return baseRes + (enemy.resL || 0);
    if (skillEle === 'chaos') return baseRes + (enemy.resChaos || 0);
    if (skillEle === 'phys') return baseRes + (enemy.dr || 0);
    return baseRes;
}

function getEffectiveEnemyMitigation(skillEle, zoneTier, enemy, pStats) {
    let rawMitigation = getEnemyElementResistance(skillEle, zoneTier, enemy);
    if (enemy && enemy.isWoodsman && enemy.maxHp > 0) {
        let missingHpRatio = Math.max(0, Math.min(1, 1 - ((enemy.hp || 0) / enemy.maxHp)));
        let bonusRes = Math.floor(missingHpRatio * 28);
        if (skillEle === 'fire') rawMitigation = (enemy.baseResF || rawMitigation) + bonusRes;
        else if (skillEle === 'cold') rawMitigation = (enemy.baseResC || rawMitigation) + bonusRes;
        else if (skillEle === 'light') rawMitigation = (enemy.baseResL || rawMitigation) + bonusRes;
        else if (skillEle === 'chaos') rawMitigation = (enemy.baseResChaos || rawMitigation) + bonusRes;
    }
    if (skillEle !== 'chaos' && ['fire','cold','light'].includes(skillEle) && enemy && enemy.id && game.enemyUniqueElementalResDown && game.enemyUniqueElementalResDown[enemy.id]) {
        let deb = game.enemyUniqueElementalResDown[enemy.id];
        let shred = Math.min(Math.max(0, Number(deb.max || 20)), Math.max(0, Number(deb.stacks || 0)) * Math.max(0, Number(deb.perHit || 2)));
        resist -= shred;
    }
    if (skillEle === 'chaos' && enemy && enemy.id && game.enemyUniqueChaosResDown && game.enemyUniqueChaosResDown[enemy.id]) {
        let deb = game.enemyUniqueChaosResDown[enemy.id];
        rawMitigation -= Math.max(0, (deb.perHit || 0) * (deb.stacks || 0));
    }
    if (skillEle === 'phys') {
        let cappedReduction = Math.max(0, Math.min(80, rawMitigation));
        let ignoreAmount = Math.max(0, Number(pStats.physIgnore) || 0);
        if (cappedReduction > 0) {
            cappedReduction = (pStats && pStats.allowNegativePhysIgnore)
                ? (cappedReduction - ignoreAmount)
                : Math.max(0, cappedReduction - ignoreAmount);
        }
        if (rawMitigation < 0) return rawMitigation;
        return cappedReduction;
    }
    if (skillEle === 'fire' || skillEle === 'cold' || skillEle === 'light' || skillEle === 'chaos') {
        if ((skillEle === 'fire' || skillEle === 'cold' || skillEle === 'light') && game.ascendClass === 'inquisitor' && hasKeystone('iq4')) rawMitigation = 0;
        let effective = rawMitigation - Math.max(0, pStats.resPen || 0);
        let cap = Math.max(0, Number(enemy && enemy.maxResCap) || 80);
        if (effective > 0) effective = Math.min(cap, effective);
        return effective;
    }
    return Math.min(80, rawMitigation);
}


function getTierDropMulWithCaps(tier, zone) {
    let t = Math.max(1, Math.floor(Number(tier) || 1));
    let preSoft = Math.min(10, t - 1);
    let postSoft = Math.max(0, Math.min(20, t) - 10);
    let baseMul = 1 + preSoft * 0.02 + postSoft * 0.008;
    if (zone && zone.type === 'labyrinth') {
        let floor = Math.max(1, Math.floor(zone.floor || 1));
        let floor30SoftCapMul = 1.236;
        if (floor <= 30) return baseMul;
        if (floor <= 200) return Math.min(baseMul, floor30SoftCapMul);
        return floor30SoftCapMul;
    }
    return baseMul;
}

function createEnemy(zone, marker, groupIndex) {
    let seasonDepth = Math.max(0, (game.season || 1) - 1);
    let tierProgress = clampNumber(((zone.tier || 1) - 1) / 18, 0, 1);
    let seasonHpScale = 1 + seasonDepth * (0.08 + (tierProgress * 0.52));
    let lateGameHpScale = 1 + (tierProgress * 9);
    let hp = Math.floor(((56 + zone.tier * 30) * 1.15) * seasonHpScale * lateGameHpScale);
    let loopHpScale = 1 + Math.max(0, (game.loopCount || 0) * 0.12);
    hp = Math.floor(hp * loopHpScale);
    let abyssScale = getAbyssMonsterScales(zone);
    let isBoss = !!marker.boss;
    let isElite = !!marker.elite && !isBoss;
    let abyssDepth = zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    if (zone.type === 'abyss' && !isElite && !isBoss) {
        let hpRamp = Math.min(0.20, Math.max(0, abyssDepth - 1) * 0.015);
        let deepNormalHpMul = abyssDepth >= 21 && abyssDepth <= 30 ? 1.2 : 1;
        hp = Math.floor(hp * (1 + hpRamp) * deepNormalHpMul);
    }
    if (zone.type === 'chaosRealm') {
        let realmFloor = Math.max(1, Math.floor(zone.floor || 1));
        // 혼돈계 1층 기준 난이도를 심화 혼돈 30급으로 맞추고, 층이 오를수록 완만히 추가 상승.
        let realmBaseMul = 5;
        let realmFloorMul = 1 + Math.max(0, realmFloor - 1) * 0.06;
        hp = Math.floor(hp * realmBaseMul * realmFloorMul);
    }
    if (isElite) hp = Math.floor(hp * (1.4 + Math.max(0, (game.loopCount || 0) * 0.05)));
    if (isBoss) hp = Math.floor(hp * (2.4 + zone.tier * 0.6));
    if (isBoss) hp = Math.floor(hp * (1 + (tierProgress * 4)));
    hp = Math.floor(hp * (abyssScale.hpMul || 1) * (isBoss ? (abyssScale.bossMul || 1) : 1));
    hp = Math.floor(hp * 0.92);
    if (isBoss && zone.type === 'trial' && zone.id === 'trial_3') hp = Math.floor(hp * 0.85);
    if (typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun)) {
        let empower = Math.max(0, Math.floor(game.beehive.enemyEmpower || 0));
        if (empower > 0) hp = Math.floor(hp * (1 + empower * 0.08));
    }
    let enemyElePool = zone.ele === 'chaos' ? ['fire','cold','light','chaos'] : ['phys', zone.ele || 'phys', 'fire', 'cold', 'light', 'chaos'];
    let enemyEle = rndChoice(enemyElePool);
    let eleIcon = enemyEle === 'fire' ? '🔥' : (enemyEle === 'cold' ? '❄️' : (enemyEle === 'light' ? '⚡' : (enemyEle === 'chaos' ? '☠️' : '🩸')));
    let name = `${eleIcon} ${zone.name.split(':')[0]} 추종자`;
    if (isElite) name = `정예 ${name}`;
    if (zone.type === 'outsideChaos') {
        isBoss = true;
        name = '🪓 혼돈 밖의 나무꾼';
        hp = Math.floor(hp * 120);
    }
    if (isBoss) {
        let bossName = zone.type === 'outsideChaos' ? '혼돈 밖의 나무꾼' : (zone.type === 'trial' ? `${zone.name} 수호자` : (zone.type === 'seasonBoss' ? zone.name : (zone.type === 'meteor' ? '검은 별의 심장' : (ACT_BOSS_NAMES[zone.id] || `${zone.name.split(':')[0]} 지배자`))));
        name = `👿 ${bossName}`;
    }
    let zoneSeed = Number.isFinite(zone.id) ? zone.id : hashSeed(zone.id || zone.name || 'zone');
    let variantSeed = ((zoneSeed + 1) * 37 + (marker.at || 0) * 13 + groupIndex * 17) % 997;
    let trait = rollEnemyTrait(zone, isElite, isBoss, variantSeed);
    const woodsmanRegenMul = 0.1;
    const regenMul = (zone.type === 'outsideChaos' && isBoss) ? woodsmanRegenMul : 1;
    if (trait && trait.hpMul) hp = Math.floor(hp * trait.hpMul);
    let isSky = (game.season || 1) >= 4 && zone.type === 'abyss' && !isBoss && Math.random() < 0.08;
    if (isSky) name = `☁️ ${name}`;
    let resistBase = isBoss ? Math.min(75, 24 + Math.floor(zone.tier * 2.2)) : (isElite ? Math.min(60, 14 + Math.floor(zone.tier * 1.8)) : Math.min(40, Math.floor(zone.tier * 1.9)));
    let chaosResBase = isBoss ? Math.min(60, 12 + Math.floor(zone.tier * 1.7)) : (isElite ? Math.min(45, 8 + Math.floor(zone.tier * 1.3)) : Math.min(30, Math.floor(zone.tier * 1.1)));
    let defenseTierScale = Math.min(1.9, 0.6 + zone.tier * 0.08);
    let defenseLoopScale = Math.min(2.2, 1 + Math.max(0, (game.loopCount || 0)) * 0.05);
    let baseArmor = Math.floor((18 + zone.tier * 26) * defenseTierScale * defenseLoopScale * (isBoss ? 2.2 : (isElite ? 1.6 : 1)));
    let baseEvasion = Math.floor((16 + zone.tier * 24) * defenseTierScale * defenseLoopScale * (isBoss ? 2.1 : (isElite ? 1.5 : 1)));
    let drBase = isBoss ? Math.min(70, 10 + Math.floor(zone.tier * 1.55)) : (isElite ? Math.min(55, 6 + Math.floor(zone.tier * 1.2)) : Math.min(40, 2 + Math.floor(zone.tier * 0.85)));
    let enemy = {
        id: game.nextEnemyId++,
        hp: hp,
        maxHp: hp,
        name: name,
        isElite: isElite,
        isBoss: isBoss,
        attackTimer: (((zoneSeed + 1) * 13 + (marker.at || 0) * 3 + groupIndex * 7) % 10) / 20,
        spawnAt: marker.at,
        groupIndex: groupIndex,
        variantSeed: variantSeed,
        ele: enemyEle,
        dr: Math.max(0, drBase + (trait && trait.dr ? trait.dr : 0)),
        resF: Math.min(75, resistBase + (trait && trait.resF ? trait.resF : 0) + (abyssScale.resistBonus || 0)),
        resC: Math.min(75, resistBase + (trait && trait.resC ? trait.resC : 0) + (abyssScale.resistBonus || 0)),
        resL: Math.min(75, resistBase + (trait && trait.resL ? trait.resL : 0) + (abyssScale.resistBonus || 0)),
        resChaos: Math.min(75, chaosResBase + (trait && trait.resChaos ? trait.resChaos : 0) + (abyssScale.resistBonus || 0)),
        armor: baseArmor,
        evasion: baseEvasion,
        atkMul: trait && trait.atkMul ? trait.atkMul : 1,
        damageMul: zone.type === 'outsideChaos' ? 2 : 1,
        attackSpeedVar: (0.85 + (((variantSeed % 11) / 10) * 0.5)) * (trait && trait.attackSpeedVarMul ? trait.attackSpeedVarMul : 1) * (zone.type === 'outsideChaos' ? 1.5 : 1),
        critChance: ((game.season || 1) >= 2 ? (isBoss ? 16 : isElite ? 10 : 4) : 0) + (trait && trait.critChanceBonus ? trait.critChanceBonus : 0),
        regenRate: ((game.season || 1) >= 3 ? (isBoss ? 0.004 : (isElite ? 0.0022 : 0.0012)) : 0) * 0.12 * regenMul,
        regenSuppressPct: 0,
        penetration: (game.season || 1) >= 4 ? (isBoss ? 14 : (isElite ? 8 : 3)) : 0,
        hybridElement: (game.season || 1) >= 3 ? rndChoice(['fire', 'cold', 'light', 'chaos']) : null,
        ailmentChance: (game.season || 1) >= 4 ? (isBoss ? 0.14 : (isElite ? 0.08 : 0.03)) : 0,
        firstHitGuard: (game.season || 1) >= 5 ? (isBoss ? 0.75 : ((trait && trait.firstHitGuard) || 0)) : 0,
        hitRateGuard: (game.season || 1) >= 5 ? ((trait && trait.hitRateGuard) || (isBoss ? 0.06 : 0)) : 0,
        recentHitsTaken: 0,
        recentHitsTimer: 0,
        patternMode: (game.season || 1) >= 6 && isBoss ? rndChoice(['burst', 'ramp', 'slam']) : null,
        disableExecute: zone.type === 'outsideChaos',
        disableHpScaleDamage: zone.type === 'outsideChaos',
        traitName: trait ? trait.name : null,
        leechEffMul: trait && Number.isFinite(trait.leechEffMul) ? Math.max(0, trait.leechEffMul) : 1,
        expMul: trait && Number.isFinite(trait.expMul) ? Math.max(1, trait.expMul) : 1,
        dropMul: (trait && Number.isFinite(trait.dropMul) ? Math.max(1, trait.dropMul) : 1) * getTierDropMulWithCaps(zone.tier, zone),
        isSky: isSky
    };
    if (zone.type === 'outsideChaos') enemy.ailResFreeze = Math.max(Number(enemy.ailResFreeze || 0), 50);
    if (zone.type === 'outsideChaos') {
        enemy.isWoodsman = true;
        enemy.dr = Math.max(50, enemy.dr + 8);
        enemy.maxResCap = 85;
        enemy.baseResF = enemy.resF;
        enemy.baseResC = enemy.resC;
        enemy.baseResL = enemy.resL;
        enemy.baseResChaos = enemy.resChaos;
        enemy.armor = Math.floor(enemy.armor * 1.35);
        enemy.evasion = Math.floor(enemy.evasion * 1.3);
        enemy.armorGuard = Math.max(Number(enemy.armorGuard || 0), 0.12);
        enemy.evasionChance = Math.max(Number(enemy.evasionChance || 0), 12);
    }
    applyChaosRealmAffixesToEnemy(enemy, zone);
    applyGrandBreachMobTuning(zone, enemy);
    if (typeof primeEnemyHpDamageGhost === 'function') primeEnemyHpDamageGhost(enemy.id, 100);
    return enemy;
}

function getZoneEncounterProfile(zone) {
    if (zone.type === 'chaosRealm') return { markerCount: 4 + Math.floor((zone.floor || 1) / 8), minPack: 2, maxPack: Math.min(8, 3 + Math.floor((zone.floor || 1) / 6)), eliteChance: 0.35, bossAdds: 2 + Math.floor((zone.floor || 1) / 12), label: `혼돈계 ${zone.floor || 1}층` };
    if (zone.type === 'meteor') return { markerCount: 2, minPack: 2, maxPack: 3, eliteChance: 1, bossAdds: 2, label: '운석' };
    if (zone.type === 'trial') return { markerCount: 3, minPack: 1, maxPack: 2, eliteChance: 1, bossAdds: 2, label: '시련' };
    if (zone.type === 'seasonBoss') return { markerCount: 1, minPack: 1, maxPack: 1, eliteChance: 1, bossAdds: 0, label: '보스' };
    if (zone.type === 'labyrinth') {
        let floor = Math.max(1, zone.floor || 1);
        let minPack = 2 + Math.floor(floor / 10);
        let maxPack = Math.min(9, minPack + 2);
        return { markerCount: 5 + Math.floor(floor / 5), minPack: minPack, maxPack: maxPack, eliteChance: Math.min(0.46, 0.14 + floor * 0.009), bossAdds: floor % 5 === 0 ? 2 : 1, label: `미궁 ${floor}층` };
    }
    if (zone.type === 'abyss') {
        let abyssScale = getAbyssMonsterScales(zone);
        let minPack = 2 + Math.floor(zone.tier / 7);
        let maxPack = Math.min(10, 4 + Math.floor(zone.tier * 0.42));
        minPack = Math.max(1, Math.floor(minPack * (abyssScale.hordeMul || 1)));
        maxPack = Math.max(minPack, Math.floor(maxPack * (abyssScale.hordeMul || 1)));
        return {
            markerCount: Math.max(6, Math.floor((8 + Math.floor(zone.tier * 0.48)) * (abyssScale.mapLengthMul || 1))),
            minPack: minPack,
            maxPack: maxPack,
            eliteChance: Math.min(0.8, 0.13 + zone.tier * 0.012 + (abyssScale.eliteBonus || 0)),
            bossAdds: 2 + Math.floor(zone.tier / 4),
            label: `${minPack}-${maxPack}기`
        };
    }
    let minPack = 1;
    let maxPack = Math.min(3, 1 + Math.floor((zone.id + 2) / 3));
    return {
        markerCount: 3 + Math.floor(zone.tier * 0.8),
        minPack: minPack,
        maxPack: maxPack,
        eliteChance: 0.05 + zone.tier * 0.015,
        bossAdds: zone.tier >= 4 ? 1 : 0,
        label: `${minPack}-${maxPack}기`
    };
}

function generateEncounterPlan(zone) {
    if (zone.type === 'meteor') return [{ at: 36, count: 2, elite: true }, { at: 76, count: 3, elite: true }, { at: 100, count: 2, boss: true }];
    if (zone.type === 'trial') return [{ at: 18, count: 1, elite: true }, { at: 54, count: 2, elite: true }, { at: 100, count: 2, boss: true }];
    if (zone.id === 's6_beast_cerberus') {
        return [
            { at: 33, count: 3, boss: true, phase: 1 },
            { at: 66, count: 2, boss: true, phase: 2 },
            { at: 100, count: 1, boss: true, phase: 3 }
        ];
    }
    if (zone.type === 'seasonBoss') return [{ at: 100, count: 1, boss: true }];
    if (zone.type === 'outsideChaos') return [{ at: 100, count: 1, boss: true }];
    if (zone.type === 'chaosRealm') {
        let profile = getZoneEncounterProfile(zone);
        return [{ at: 28, count: profile.minPack + 1, elite: true }, { at: 62, count: profile.maxPack, elite: true }, { at: 100, count: 1 + profile.bossAdds, boss: true }];
    }
    let profile = getZoneEncounterProfile(zone);
    let rng = zone.type === 'act' ? createSeededRng(`act:${zone.id}`) : Math.random;
    let markers = [];
    for (let i = 0; i < profile.markerCount; i++) {
        let at = Math.floor(((i + 1) / (profile.markerCount + 1)) * 96 + (rng() * 8 - 4));
        let spread = profile.maxPack - profile.minPack;
        let count = profile.minPack + Math.floor(Math.pow(rng(), 0.78) * (spread + 1));
        markers.push({
            at: clampNumber(at, 6, 94),
            count: clampNumber(count, profile.minPack, profile.maxPack),
            elite: rng() < profile.eliteChance
        });
    }
    markers.push({ at: 100, count: 1 + profile.bossAdds, boss: true });
    markers.sort((a, b) => a.at - b.at);
    return markers;
}

function resetBattleRuntimeVisuals() {
    battleFx = [];
    battleFxId = 0;
    battleVisualState = {
        projectiles: [],
        damageTexts: [],
        skillProjectiles: [],
        skillEffects: [],
        skillPlayback: null,
        lastAutoSwingId: 0,
        lastAutoSkillAt: 0,
        processedFxIds: new Set(),
        enemyGhostPos: {},
        playerPos: null,
        playerAdvanceBlend: 0,
        playerAttackBlend: 0,
        playerHurtBlend: 0,
        playerDownBlend: 0,
        lastNow: 0,
        advanceDesired: false,
        advanceChangedAt: 0
    };
    crowdPauseActive = false;
    trialHazardTimer = 0;
}

function reserveBattleSlot(usedSlots) {
    let slotSet = usedSlots instanceof Set ? usedSlots : new Set();
    for (let i = 0; i < BATTLE_SLOT_ORDER.length; i++) {
        if (!slotSet.has(BATTLE_SLOT_ORDER[i])) return BATTLE_SLOT_ORDER[i];
    }
    let fallback = 0;
    while (slotSet.has(fallback)) fallback++;
    return fallback;
}

function primeTrialHazardTimer(zone) {
    if (!zone || zone.type !== 'trial') {
        trialHazardTimer = 0;
        return;
    }
    trialHazardTimer = 1.8 + Math.random() * 1.6;
}

function isCrowdProgressPaused() {
    if (game.moveTimer > 0) return false;
    return (game.enemies || []).filter(enemy => enemy.hp > 0).length >= ENEMY_CROWD_PAUSE_LIMIT;
}

function getDotStackMultiplier(stacks) {
    let safeStacks = Math.max(1, Math.min(DOT_STACK_MAX, Math.floor(stacks || 1)));
    return Math.pow(1 + DOT_STACK_GROWTH_PER_STACK, safeStacks - 1);
}

function applyEnemyDotFromHit(enemy, hitDamage, pStats) {
    if (!enemy || enemy.hp <= 0) return;
    let prev = (enemy.dotState && typeof enemy.dotState === 'object') ? enemy.dotState : null;
    let nextStacks = Math.min(DOT_STACK_MAX, Math.max(0, (prev && prev.stacks) || 0) + 1);
    let stackMultiplier = getDotStackMultiplier(nextStacks);
    let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
    let baseTick = Math.max(1, Math.floor(Math.max(1, hitDamage) * DOT_TICK_FROM_HIT_RATIO * dotDamageScale));
    let nextRawTickDamage = Math.max(1, Math.floor(baseTick * stackMultiplier));
    let tickInterval = DOT_TICK_INTERVAL * Math.max(0.05, (pStats && Number.isFinite(pStats.dotTickIntervalMultiplier)) ? pStats.dotTickIntervalMultiplier : 1);
    let duration = DOT_EFFECT_DURATION * Math.max(0.05, (pStats && Number.isFinite(pStats.dotDurationMultiplier)) ? pStats.dotDurationMultiplier : 1);
    enemy.dotState = {
        stacks: nextStacks,
        rawTickDamage: Math.max(nextRawTickDamage, (prev && prev.rawTickDamage) || 0),
        tickInterval: tickInterval,
        tickTimer: (prev && Number.isFinite(prev.tickTimer)) ? Math.min(prev.tickTimer, tickInterval) : tickInterval,
        timeLeft: duration,
        ele: (pStats && pStats.sSkill && pStats.sSkill.ele) || 'chaos',
        skillName: game.activeSkill || 'dot'
    };
    if (pStats && pStats.sSkill && pStats.sSkill.flameDecayDebuff) syncEnemyFlameDecayAilment(enemy, enemy.dotState, pStats);
    enemy.dotStacks = nextStacks;
}

function getAilmentTypeFromElement(ele) {
    if (ele === 'fire') return 'ignite';
    if (ele === 'cold') return 'chill';
    if (ele === 'light') return 'shock';
    if (ele === 'chaos') return 'poison';
    return 'bleed';
}

function getPlayerAilmentChance(pStats, type) {
    let base = 0;
    if (type === 'ignite') base = pStats.igniteChance || 0;
    else if (type === 'chill') base = pStats.chillChance || 0;
    else if (type === 'freeze') base = pStats.freezeChance || 0;
    else if (type === 'shock') base = pStats.shockChance || 0;
    else if (type === 'poison') base = pStats.poisonChance || 0;
    else if (type === 'bleed') base = pStats.bleedChance || 0;
    return Math.max(0, Math.min(1, base / 100));
}

function getFreezeApplyChanceFromHitRatio(hitRatio, enemyMaxHp) {
    let ratio = Math.max(0, Number(hitRatio) || 0);
    let hp = Math.max(1, Number(enemyMaxHp) || 1);
    let hpFactor = Math.max(0.18, 1 / Math.log10(hp + 10));
    return Math.max(0.01, Math.min(0.7, ratio * 1.8 * hpFactor));
}

function isDamageAilmentType(type) {
    return type === 'ignite' || type === 'poison' || type === 'bleed';
}

function getStoredAilmentHitDamage(ail) {
    if (!ail) return 0;
    return Math.max(0, Number(ail.sourceHitDamage || ail.hitDamage || 0) || 0);
}

function getDamageAilmentBaseDpsFromHit(hitDamage, power, scale) {
    let source = Math.max(0, Number(hitDamage) || 0);
    if (source <= 0) return 0;
    let p = Math.max(0, Number(power) || 0);
    let mul = Math.max(0.01, Number(scale) || 1);
    return Math.max(1, Math.floor(source * (0.10 + p * 0.08) * mul));
}

function getEnemyDamageAilmentDps(ail, pStats) {
    let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
    let dps = getDamageAilmentBaseDpsFromHit(getStoredAilmentHitDamage(ail), ail ? ail.power : 0, dotDamageScale);
    if (ail && ail.type === 'ignite') dps = Math.floor(dps * (1 + Math.max(0, Number(pStats && pStats.igniteDamageMultiplierPct) || 0) / 100));
    return dps;
}

function syncEnemyFlameDecayAilment(enemy, dotState, pStats) {
    if (!enemy || !dotState || dotState.skillName !== '화염 부패') return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    let zone = getZone(game.currentZoneId) || getZone(0);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (getAbyssMonsterScales(zone).playerDamageMul || 1);
    let tickInterval = Math.max(0.02, Number(dotState.tickInterval) || DOT_TICK_INTERVAL);
    let enemyRes = getEffectiveEnemyMitigation(dotState.ele || 'fire', zoneTier, enemy, pStats);
    let dps = Math.max(1, Math.floor(((dotState.rawTickDamage || 1) / tickInterval) * (1 - enemyRes / 100) * abyssPlayerMul));
    let row = enemy.ailments.find(ail => ail && ail.type === 'flameDecay');
    let payload = { type: 'flameDecay', time: Math.max(0, dotState.timeLeft || 0), power: Math.max(0, dotState.stacks || 1), flameDecayDps: dps };
    if (row) Object.assign(row, payload);
    else enemy.ailments.push(payload);
}

function getFlameDecayIgniteTakenMultiplier(pStats) {
    let skill = pStats && pStats.sSkill;
    let per100 = Math.max(0, Number(skill && skill.igniteTakenHpScalePer100) || 0);
    if (per100 <= 0) return 1;
    return 1 + (Math.max(0, Number(pStats && pStats.maxHp) || 0) / 100) * per100;
}

function getPlayerDamageAilmentFallbackDps(type, power, pStats) {
    let stats = pStats || (typeof getPlayerStats === 'function' ? getPlayerStats() : null);
    let maxHp = Math.max(1, Math.floor((stats && stats.maxHp) || 0));
    if (maxHp <= 1) return 0;
    let p = Math.max(0.1, Number(power || 0.1));
    let perTick = 0;
    if (type === 'ignite') perTick = Math.max(1, Math.floor(maxHp * (0.0035 + p * 0.0040)));
    else if (type === 'poison') perTick = Math.max(1, Math.floor(maxHp * (0.0030 + p * 0.0034)));
    else if (type === 'bleed') perTick = Math.max(1, Math.floor(maxHp * (0.0032 + p * 0.0032)));
    return perTick > 0 ? perTick * 10 : 0;
}

function getPlayerDamageAilmentDps(ail, pStats) {
    let source = getStoredAilmentHitDamage(ail);
    if (source > 0) return getDamageAilmentBaseDpsFromHit(source, ail ? ail.power : 0, 1);
    return getPlayerDamageAilmentFallbackDps(ail ? ail.type : null, ail ? ail.power : 0, pStats);
}

function applyEnemyAilmentFromHit(enemy, pStats, hitDamage, isCrit) {
    if (!enemy || enemy.hp <= 0) return;
    let ele = (pStats.sSkill && pStats.sSkill.ele) || 'phys';
    let primaryType = getAilmentTypeFromElement(ele);
    let sourceHitDamage = Math.max(0, Math.floor(Number(hitDamage) || 0));
    let ailmentPowerSourceDamage = Math.max(0, Math.floor(sourceHitDamage * Math.max(0.01, Number(pStats && pStats.ailmentPowerMultiplier) || 1)));
    let hitRatio = Math.max(0.001, Math.min(0.35, ailmentPowerSourceDamage / Math.max(1, enemy.maxHp || 1)));
    let hitPower = Math.sqrt(Math.max(1, ailmentPowerSourceDamage)) * 0.01;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    function applyAilmentType(type, forceChance) {
        let tryProc = isCrit ? 1 : (Number.isFinite(forceChance) ? forceChance : getPlayerAilmentChance(pStats, type));
        if (Math.random() >= tryProc) return false;
        let resKey = 'ailRes' + type.charAt(0).toUpperCase() + type.slice(1);
        let resistChance = Math.max(0, Math.min(0.95, (enemy[resKey] || 0) / 100));
        if (Math.random() < resistChance) return false;
        if (type === 'freeze' && Math.random() >= getFreezeApplyChanceFromHitRatio(hitRatio, enemy.maxHp || 1)) return false;
        let damageAilment = isDamageAilmentType(type);
        let power = damageAilment
            ? Math.max(0.05, Math.min(1.5, hitPower))
            : Math.max(0.05, Math.min(1.5, hitPower + (hitRatio * 1.8)));
        let row = enemy.ailments.find(a => a.type === type);
        let durationMul = damageAilment ? Math.max(0.05, (pStats && Number.isFinite(pStats.dotDurationMultiplier)) ? pStats.dotDurationMultiplier : 1) : 1;
        let dur = (damageAilment ? 3 : (type === 'freeze' ? (0.8 + hitRatio * 4) : (2 + hitRatio * 10))) * durationMul;
        let payload = { type: type, time: dur, power: power };
        if (damageAilment) payload.sourceHitDamage = ailmentPowerSourceDamage;
        if (row) {
            row.time = Math.max(row.time || 0, dur);
            row.power = Math.max(row.power || 0, power);
            if (damageAilment) row.sourceHitDamage = Math.max(getStoredAilmentHitDamage(row), ailmentPowerSourceDamage);
        } else enemy.ailments.push(payload);
        return true;
    }
    applyAilmentType(primaryType);
    if (ele === 'cold') applyAilmentType('freeze');
}

function tickEnemyAilments(pStats, dt) {
    let zone = getZone(game.currentZoneId);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (getAbyssMonsterScales(zone).playerDamageMul || 1);
    let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
    (game.enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0) return;
        enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
        if (enemy.ailments.length <= 0) return;
        let next = [];
        enemy.ailments.forEach(ail => {
            ail.time = Math.max(0, (ail.time || 0) - dt);
            let power = Math.max(0, ail.power || 0);
            let type = ail.type;
            if (ail.time > 0 && (type === 'ignite' || type === 'poison' || type === 'bleed')) {
                let ele = type === 'ignite' ? 'fire' : (type === 'poison' ? 'chaos' : 'phys');
                let enemyRes = getEffectiveEnemyMitigation(ele, zoneTier, enemy, pStats);
                let dps = getEnemyDamageAilmentDps(ail, pStats);
                let igniteMul = (type === 'ignite' && (enemy.ailments || []).some(row => row && row.type === 'flameDecay' && (row.time || 0) > 0)) ? getFlameDecayIgniteTakenMultiplier(pStats) : 1;
                let dotDmg = dps > 0 ? Math.max(1, Math.floor(dps * dt * (1 - enemyRes / 100) * abyssPlayerMul * igniteMul)) : 0;
                let minimumHp = (enemy.isBoss && storyAct && (storyAct.specialType === 'forced_defeat' || (storyAct.specialType === 'loop_gate' && !canBreakWoodsmanLoop()))) ? 1 : 0;
                let dealt = applyDamageToEnemyResource(enemy, dotDmg, { minimumHp: minimumHp });
                // 출혈/점화/중독 도트는 0.1초마다 틱이 들어와 모바일에서 히트 FX가 과도하게 누적될 수 있다.
                // 특히 출혈 빌드는 틱 빈도/대상 수가 높아 화면이 하얗게 번쩍이며 프레임이 급락하는 증상이 보고됨.
                let fxState = game.dotFxThrottle || (game.dotFxThrottle = {});
                let fxKey = `${enemy.id}:${type}`;
                let now = Date.now();
                let prev = Number(fxState[fxKey] || 0);
                if (dealt > 0 && (now - prev) >= 240) {
                    fxState[fxKey] = now;
                    addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(ele), damage: dealt, duration: 160, element: ele, noLine: true, dot: true });
                }
            }
            if (ail.time > 0) next.push(ail);
        });
        enemy.ailments = next;
        if (enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
    });
}

function tickEnemyDotEffects(pStats, dt) {
    let zone = getZone(game.currentZoneId);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (getAbyssMonsterScales(zone).playerDamageMul || 1);
    let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
    (game.enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0) return;
        let dotState = (enemy.dotState && typeof enemy.dotState === 'object') ? enemy.dotState : null;
        if (!dotState) return;
        dotState.timeLeft = Math.max(0, (dotState.timeLeft || 0) - dt);
        let tickInterval = Math.max(0.02, Number(dotState.tickInterval) || DOT_TICK_INTERVAL);
        syncEnemyFlameDecayAilment(enemy, dotState, pStats);
        dotState.tickTimer = (dotState.tickTimer || tickInterval) - dt;
        while (dotState.tickTimer <= 0 && dotState.timeLeft > 0 && enemy.hp > 0) {
            dotState.tickTimer += tickInterval;
            let dotEle = dotState.ele || 'chaos';
            let enemyRes = getEffectiveEnemyMitigation(dotEle, zoneTier, enemy, pStats);
            let dotDmg = Math.max(1, Math.floor((dotState.rawTickDamage || 1) * (1 - (enemyRes / 100))));
            dotDmg = Math.max(1, Math.floor(dotDmg * abyssPlayerMul));
            let minimumHp = (enemy.isBoss && storyAct && (storyAct.specialType === 'forced_defeat' || (storyAct.specialType === 'loop_gate' && !canBreakWoodsmanLoop()))) ? 1 : 0;
            let dealt = applyDamageToEnemyResource(enemy, dotDmg, { minimumHp: minimumHp });
            addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(dotEle), damage: dealt, duration: 240, element: dotEle, noLine: true, dot: true });
            if (enemy.hp <= 0) {
                handleEnemyDeath(enemy, pStats);
                break;
            }
        }
        if (dotState.timeLeft <= 0 || enemy.hp <= 0) {
            enemy.dotState = null;
            enemy.dotStacks = 0;
            enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments.filter(ail => ail && ail.type !== 'flameDecay') : [];
        }
    });
}

function syncCrowdPauseState() {
    let paused = isCrowdProgressPaused();
    if (paused === crowdPauseActive) return paused;
    crowdPauseActive = paused;
    if (game.settings.showCrowdPauseLog !== false) {
        if (paused) addLog(`⛔ 적이 ${ENEMY_CROWD_PAUSE_LIMIT}기 이상 몰려 맵 진행이 멈췄습니다. 적 수를 줄이면 다시 전진합니다.`, 'attack-monster');
        else addLog('🧭 적 숫자가 줄어 맵 진행을 재개합니다.', 'loot-normal');
    }
    return paused;
}

function resetWoodsmanCurse() {
    game.woodsmanCurseActive = false;
    game.woodsmanCurseDamageTakenStacks = 0;
    game.woodsmanCurseLastTickAt = 0;
    game.woodsmanCurseNextLogStack = 0;
}

function startWoodsmanCurse() {
    game.woodsmanCurseActive = true;
    game.woodsmanCurseDamageTakenStacks = 0;
    game.woodsmanCurseLastTickAt = Date.now();
    game.woodsmanCurseNextLogStack = 100;
    addLog('🪓 나무꾼의 저주: 전투가 끝날 때까지 매초 받는 피해가 0.01%씩 증가합니다.', 'attack-monster');
}

function tickWoodsmanCurse() {
    let zone = getZone(game.currentZoneId);
    if (!zone || zone.type !== 'outsideChaos' || !game.woodsmanCurseActive) return;
    let now = Date.now();
    game.woodsmanCurseLastTickAt = Number.isFinite(game.woodsmanCurseLastTickAt) && game.woodsmanCurseLastTickAt > 0 ? game.woodsmanCurseLastTickAt : now;
    let elapsed = now - game.woodsmanCurseLastTickAt;
    if (elapsed < 1000) return;
    let ticks = Math.floor(elapsed / 1000);
    game.woodsmanCurseLastTickAt += ticks * 1000;
    game.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(game.woodsmanCurseDamageTakenStacks || 0)) + ticks;
    if ((game.settings && game.settings.showCombatLog !== false) && game.woodsmanCurseDamageTakenStacks >= Math.max(100, Math.floor(game.woodsmanCurseNextLogStack || 100))) {
        addLog(`🪓 나무꾼의 저주 중첩: 받는 피해 +${(game.woodsmanCurseDamageTakenStacks * 0.01).toFixed(2)}%`, 'attack-monster', { noToast: true });
        game.woodsmanCurseNextLogStack = Math.floor(game.woodsmanCurseDamageTakenStacks / 100 + 1) * 100;
    }
}

function getWoodsmanCurseDamageTakenMul() {
    let zone = getZone(game.currentZoneId);
    if (!zone || zone.type !== 'outsideChaos' || !game.woodsmanCurseActive) return 1;
    return 1 + Math.max(0, Math.floor(game.woodsmanCurseDamageTakenStacks || 0)) * 0.0001;
}

function startEncounterRun() {
    pTimer = 0;
    progressStallTicks = 0;
    game.runProgress = 0;
    game.encounterIndex = 0;
    let zone = getZone(game.currentZoneId) || getZone(0);
    resetBattleRuntimeVisuals();
    primeTrialHazardTimer(zone);
    game.encounterPlan = generateEncounterPlan(zone);
    game.enemies = [];
    if (zone && zone.type === 'outsideChaos') startWoodsmanCurse();
    else resetWoodsmanCurse();
}

function startMoving(isTown) {
    pTimer = 0;
    progressStallTicks = 0;
    resetBattleRuntimeVisuals();
    if (!isTown && game.ascendClass === 'assassin' && hasKeystone('a2')) game.assassinBlurred = true;
    let ms = getPlayerStats().moveSpeed;
    if (!Number.isFinite(ms) || ms <= 0) ms = 100;
    let time = Math.max(0.5, 1.2 * (100 / ms));
    game.moveTotalTime = time;
    game.moveTimer = time;
    game.isTownReturning = !!isTown;
    game.combatHalted = false;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.playerAilments = [];
    game.playerLeechInstances = [];
    game.gladiatorSwiftOpeningReady = true;
    game.gladiatorSwiftGuardReady = true;
    game.woodsmanEntrancePending = false;
    resetWoodsmanCurse();
    let v = game.voidRift;
    if (v && v.active) {
        v.active = false;
        v.pendingWave = false;
        v.totalToSpawn = 0;
        v.spawnedCount = 0;
        v.defeatedCount = 0;
        v.spawnTick = 0;
    }
}


function returnToTown() {
    if (game.isTownReturning && game.moveTimer > 0) return;
    let pStats = getPlayerStats();
    game.playerHp = getPlayerHpCap(pStats);
    game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerLeechInstances = [];
    pTimer = 0;
    addLog("⛺ 마을 귀환", "season-up");
    startMoving(true);
    updateStaticUI();
}

function ensureEncounterRun() {
    if (game.moveTimer <= 0 && (!game.encounterPlan || game.encounterPlan.length === 0)) startEncounterRun();
}

function isRegularAutoProgressZone(zone) {
    if (!zone) return false;
    if (zone.id === 'beehive_run' || zone.id === 'grand_breach_run') return false;
    if (typeof zone.id === 'string' && zone.id.includes('_boss_')) return false;
    return ['act', 'abyss', 'trial', 'meteor', 'labyrinth', 'chaosRealm'].includes(zone.type);
}

function reconcileMapProgressRuntimeState() {
    let zone = getZone(game.currentZoneId) || getZone(0);
    if (!zone) return false;
    if (typeof reconcileBeehiveRunState === 'function') reconcileBeehiveRunState();
    zone = getZone(game.currentZoneId) || getZone(0);
    if (!isRegularAutoProgressZone(zone)) return false;
    let changed = false;
    let explicitStop = (game.settings && ((game.settings.mapCompleteAction || 'nextZone') === 'stop' || (game.settings.townReturnAction || 'retry') === 'stop')) || !!game.pendingLoopDecision;
    if (game.inTicketBossFight) {
        game.inTicketBossFight = false;
        changed = true;
    }
    if (game.combatHalted && !explicitStop) {
        game.combatHalted = false;
        changed = true;
    }
    if (game.moveTimer <= 0 && (game.runProgress || 0) <= 0) {
        let hasPlan = Array.isArray(game.encounterPlan) && game.encounterPlan.length > 0;
        let liveEnemies = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0).length;
        if (liveEnemies > 0 && !hasPlan && Math.max(0, Math.floor(game.encounterIndex || 0)) === 0) {
            game.enemies = [];
            changed = true;
        }
        if (!hasPlan) {
            startEncounterRun();
            changed = true;
        }
    }
    return changed;
}

function spawnEncounterMarker(marker) {
    let zone = getZone(game.currentZoneId);
    let count = marker.count || 1;
    let isCerberus = zone && zone.id === 's6_beast_cerberus';
    let usedSlots = new Set((game.enemies || []).map(enemy => enemy.battleSlot).filter(slot => Number.isFinite(slot)));
    if (marker.boss) {
        for (let i = 0; i < Math.max(0, count - 1); i++) {
            let enemy = createEnemy(zone, { ...marker, boss: false, elite: true }, i);
            if (isCerberus) {
                enemy.name = `👿 케르베로스 머리 ${Math.max(1, (count - i))}`;
                if (marker.phase === 1) enemy.ele = ['cold', 'fire', 'light'][i % 3];
                else enemy.ele = 'phys';
                enemy.atkMul *= 1.55;
                enemy.penetration += 12;
                enemy.critChance += marker.phase >= 2 ? 10 : 0;
            }
            enemy.battleSlot = reserveBattleSlot(usedSlots);
            usedSlots.add(enemy.battleSlot);
            enemy.spawnStamp = performance.now();
            game.enemies.push(enemy);
            addBattleFx('enemySpawn', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 360, boss: false });
        }
        let bossEnemy = createEnemy(zone, { ...marker, count: 1 }, count);
        let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
        if (storyAct && storyAct.specialType === 'forced_defeat') {
            let now = performance.now();
            bossEnemy.forcedDefeatBoss = true;
            bossEnemy.nextForcedRegenAt = now + 5000;
            bossEnemy.forcedDoomAt = now + 10000;
        }
        if (isCerberus) {
            bossEnemy.name = marker.phase === 3 ? '👿 케르베로스 본체' : `👿 케르베로스 머리`;
            bossEnemy.ele = marker.phase === 1 ? 'fire' : 'phys';
            bossEnemy.atkMul *= marker.phase === 3 ? 2.1 : 1.7;
            bossEnemy.penetration += 18;
            bossEnemy.critChance += marker.phase >= 2 ? 14 : 0;
            bossEnemy.hybridElement = marker.phase === 3 ? 'chaos' : bossEnemy.hybridElement;
        }
        bossEnemy.battleSlot = reserveBattleSlot(usedSlots);
        usedSlots.add(bossEnemy.battleSlot);
        bossEnemy.spawnStamp = performance.now();
        game.enemies.push(bossEnemy);
        addBattleFx('enemySpawn', { enemyId: bossEnemy.id, color: getElementColor(bossEnemy.ele), duration: 460, boss: true });
        if (game.settings.showSpawnLog !== false) {
            addLog(`👑 '${bossEnemy.name.replace(/^👿\s*/, '')}' 등장.`, "loot-unique");
            if (isCerberus && marker.phase === 1) addLog('🐺 케르베로스 1페이즈: 냉기/화염/번개 머리 3개', 'attack-monster');
            if (isCerberus && marker.phase === 2) addLog('🐺 케르베로스 2페이즈: 물리 머리 2개 (치명/연속공격 강화)', 'attack-monster');
            if (isCerberus && marker.phase === 3) addLog('🐺 케르베로스 3페이즈: 본체 (브레스/헬파이어/몸통박치기)', 'attack-monster');
        }
    } else {
        for (let i = 0; i < count; i++) {
            let enemy = createEnemy(zone, marker, i);
            enemy.battleSlot = reserveBattleSlot(usedSlots);
            usedSlots.add(enemy.battleSlot);
            enemy.spawnStamp = performance.now();
            game.enemies.push(enemy);
            addBattleFx('enemySpawn', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 320, boss: false });
        }
        if (game.settings.showSpawnLog !== false) addLog(`⚠️ 적 ${count}마리 참전`, marker.elite ? "loot-rare" : "attack-monster");
    }
    addBattleFx('spawnWave', { count: count, boss: !!marker.boss, duration: 420 });
}

function advanceMapProgress(pStats) {
    if (game.moveTimer > 0) return;
    let zone = getZone(game.currentZoneId) || getZone(0);
    if (zone && zone.type === 'outsideChaos' && game.woodsmanEntrancePending) return;
    if (zone && zone.id === 'beehive_run' && game.beehive && game.beehive.inRun) return;
    ensureEncounterRun();
    if (game.runProgress >= 100) return;
    if (isCrowdProgressPaused()) return;
    if (zone && zone.id === 'grand_breach_run') {
        tickGrandBreachRun(zone);
        return;
    }
    let abyssScale = getAbyssMonsterScales(zone);
    let enemyCount = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
    let zoneType = zone ? zone.type : 'act';
    let baseGain = zoneType === 'trial' ? 0.26 : (zoneType === 'abyss' ? 0.42 : 0.36);
    let crowdPenalty = enemyCount > 0 ? Math.max(0.4, 1 - enemyCount * 0.13) : 0.94;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let chaosRealmActRush = zone && zone.type === 'act' && ensureChaosRealmState().highestFloor >= 10 ? 2 : 1;
    let gain = baseGain * 0.5 * (moveSpeed / 100) * crowdPenalty * (abyssScale.mapProgressMul || 1) * chaosRealmActRush;
    game.runProgress = Math.min(100, game.runProgress + gain);
    while (game.encounterIndex < game.encounterPlan.length && game.runProgress >= game.encounterPlan[game.encounterIndex].at) {
        spawnEncounterMarker(game.encounterPlan[game.encounterIndex]);
        game.encounterIndex++;
    }
}

function tickGrandBreachRun(zone) {
    let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let g = v.grandRun;
    if (!g || !g.inRun) return;
    let now = Date.now();
    cleanupConditionGemStates(now);
    g.lastTickAt = Number.isFinite(g.lastTickAt) ? g.lastTickAt : now;
    let dt = Math.max(0, (now - g.lastTickAt) / 1000);
    g.lastTickAt = now;
    if (g.phase === 'survival') {
        g.timeLeft = Math.max(0, (g.timeLeft || 0) - dt);
        let alive = (game.enemies || []).filter(e => e.hp > 0).length;
        if (alive < 7 && now >= (g.nextRefillAt || 0)) {
            g.nextRefillAt = now + 700;
            let add = 4 + Math.floor(Math.random() * 3);
            for (let i = 0; i < add; i++) game.enemies.push(createEnemy(zone, { elite: Math.random() < 0.55, boss: false }, i));
        }
        if (g.timeLeft <= 0) {
            g.phase = 'boss';
            let boss = createEnemy(zone, { boss: true, count: 1 }, 0);
            let soul = Math.max(0, Math.floor(g.kills || 0));
            let scale = 1 + soul * 0.02;
            boss.name = '👿 균열 군주';
            boss.maxHp = Math.floor(boss.maxHp * (2.2 + scale));
            boss.hp = boss.maxHp;
            boss.atkMul *= (1.4 + soul * 0.005);
            boss.traitName = `균열 몬스터 ${soul}마리의 영혼 흡수`;
            game.enemies = [boss];
            addLog(`🕳️ 생존 종료! 처치 수 ${soul} 기반으로 강화된 보스가 출현합니다.`, 'loot-unique');
        }
    }
}

function grantExpAndGem(enemy, pStats) {
    let zone = getZone(game.currentZoneId);
    let abyssScale = getAbyssMonsterScales(zone);
    let abyssDepth = zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    let exp = Math.floor((14 + zone.tier * 10) * (1 + game.season * 0.35));
    if (enemy.isElite) exp = Math.floor(exp * 1.8);
    if (enemy.isBoss) exp = Math.floor(exp * Math.max(3, zone.tier * 1.5));
    exp = Math.floor(exp * (enemy.expMul || 1));
    exp = Math.floor(exp * (1 + (pStats.expGain / 100)) * (abyssScale.expMul || 1));
    if (abyssDepth > 1) {
        let depthExpDampen = Math.max(0.68, 1 - (abyssDepth - 1) * 0.012);
        exp = Math.floor(exp * depthExpDampen);
    }
    game.exp += exp;
    if (game.settings.showExpLog) addLog(`✨ 경험치 +${exp}`, "exp-txt");

    let gemExp = Math.floor(exp * 0.45);
    if ((pStats.sSkill.isGem || pStats.sSkill.levelable) && game.activeSkill) {
        game.gemData = game.gemData || {};
        game.gemData[game.activeSkill] = normalizeGemRecord(game.gemData[game.activeSkill]);
        let gem = game.gemData[game.activeSkill];
        if (gem.level < 20) {
            gem.exp += gemExp;
            if (gem.exp >= getGemReqExp(gem.level)) {
                gem.level++;
                gem.exp = 0;
                addLog(`✨ ${pStats.sSkill.isGem ? '젬' : '스킬'} [${game.activeSkill}] 레벨업!`, "loot-unique");
            }
        }
    }
    (game.equippedSupports || []).forEach(name => {
        let gem = game.supportGemData[name];
        if (gem && gem.level < 20) {
            gem.exp += gemExp;
            if (gem.exp >= getGemReqExp(gem.level)) {
                gem.level++;
                gem.exp = 0;
                if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('gemEngraver', 'support_gem_upgrade');
                addLog(`🟢 젬 [${name}] 레벨업!`, "loot-rare");
            }
        }
    });

    let req = getExpReq(game.level);
    let guard = 0;
    let leveledUp = false;
    while (game.level < MAX_PLAYER_LEVEL && game.exp >= req && guard < 50) {
        game.exp -= req;
        game.level++;
        leveledUp = true;
        game.passivePoints++;
        game.noti.char = true;
        game.playerHp = getPlayerHpCap(getPlayerStats());
        addLog(`🎉 레벨업! (Lv.${game.level})`, "level-up");
        req = getExpReq(game.level);
        guard++;
        checkUnlocks();
    }
    if (game.level >= MAX_PLAYER_LEVEL) game.exp = 0;
    if (leveledUp) queueImportantSave(250);
}

function applyGrandBreachMobTuning(zone, enemy) {
    if (!zone || zone.id !== 'grand_breach_run' || !enemy || enemy.isBoss) return;
    enemy.maxHp = Math.max(1, Math.floor((enemy.maxHp || 1) * 5));
    enemy.hp = enemy.maxHp;
    enemy.atkMul = (enemy.atkMul || 1) * 1.25;
}


function maybeTriggerBeeMappingEvent(beeLv, enemy) {
    if (beeLv < 10 || !enemy || enemy.isBoss) return;
    if ((game.currencies.pollen || 0) < 10) return;
    let chance = enemy.isElite ? 0.012 : 0.0025;
    if (Math.random() >= chance) return;
    game.currencies.pollen = Math.max(0, (game.currencies.pollen || 0) - 10);
    let roll = Math.random();
    if (beeLv >= 14 && roll < 0.08) {
        let bonusPct = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('queenBeeRewardBonusPct') || 0) / 100 : 0;
        let pollen = Math.max(1, Math.floor(75 * (1 + bonusPct)));
        awardCurrency('pollen', pollen);
        awardCurrency('enchantedHoney', 1);
        awardCurrency('beeswax', 2);
        addLog(`👑 여왕벌 이벤트! 꽃가루 +${pollen}, 벌꿀 +1, 밀랍 +2`, 'loot-unique');
    } else if (beeLv >= 12 && roll < 0.28) {
        awardCurrency('venomStinger', 1);
        if (Math.random() < 0.35) awardCurrency('beeswax', 1);
        addLog('🐝 독침벌 무리 이벤트! 독벌침 +1', 'loot-rare');
    } else if (beeLv >= 11 && roll < 0.55) {
        awardCurrency('pollen', 45);
        awardCurrency('beeswax', 1);
        addLog('🐝 호박벌 이벤트! 꽃가루 +45, 밀랍 +1', 'loot-rare');
    } else {
        awardCurrency('pollen', 24);
        addLog('🐝 벌 이벤트! 꽃가루 +24', 'loot-magic');
    }
}

function rollLootForEnemy(enemy) {
    let zone = getZone(game.currentZoneId) || getZone(0);
    let gemExpertLvForLoot = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('gemEngraver') || 1)) : 1;
    if (gemExpertLvForLoot >= 12 && (enemy.isBoss || enemy.isElite)) {
        let echoChance = enemy.isBoss ? 0.045 : 0.004;
        let bonus = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('awakenedGemDropPct') || 0) / 100 : 0;
        if (Math.random() < echoChance * (1 + bonus)) {
            awardCurrency('awakenedEcho', 1);
            if (game.settings.showLootLog) addLog('🌌 각성 잔향 +1', 'loot-unique');
        }
    }
    if (Math.random() < (enemy.isBoss ? 0.15 : enemy.isElite ? 0.03 : 0.005)) {
        if (Math.random() < 0.5) {
            let available = Object.keys(SKILL_DB).filter(name => !hasSkillGemOwned(name) && SKILL_DB[name].isGem);
            if (available.length > 0) {
                let skill = rndChoice(available);
                game.skills.push(skill);
                let awakenedDrop = gemExpertLvForLoot >= 13 && Math.random() < 0.035;
                game.gemData[skill] = { level: 1, exp: 0, awakened: awakenedDrop };
                game.noti.skills = true;
                checkUnlocks();
                if (game.settings.showLootLog) addLog(`✨ 공격 젬 <span class='loot-magic'>[${skill}]</span> 획득!${awakenedDrop ? ' (각성 후보)' : ''}`);
            }
        } else {
            let available = Object.keys(SUPPORT_GEM_DB);
            if (available.length > 0) {
                let gem = rndChoice(available);
                let didImprove = false;
                game.supportGemData = game.supportGemData || {};
                if (!hasSupportGemOwned(gem)) {
                    game.supports.push(gem);
                    game.supportGemData[gem] = { level: 1, exp: 0, unlockedTier: 1, activeTier: 1 };
                    didImprove = true;
                } else {
                    let record = normalizeGemRecord(game.supportGemData[gem] || { level:1, exp:0 });
                    let before = Math.max(1, Math.floor(record.unlockedTier || 1));
                    if (before < 3) {
                        record.unlockedTier = before + 1;
                        if ((record.activeTier || 1) < record.unlockedTier) {
                            let prevTier = Math.max(1, Math.floor(record.activeTier || 1));
                            let baseCost = Math.max(1, Math.floor(getSupportResonanceCost(gem)));
                            let getTierCost = (tier) => {
                                let db = SUPPORT_GEM_DB[gem] || {};
                                if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[tier - 1])) return Math.max(1, Math.floor(db.resonanceCosts[tier - 1]));
                                if (tier <= 1) return baseCost;
                                if (tier === 2) return Math.max(baseCost + 2, Math.floor(baseCost * 2.4));
                                return Math.max(baseCost + 5, Math.floor(baseCost * 3.8));
                            };
                            let isEquipped = (game.equippedSupports || []).includes(gem);
                            let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
                            let remain = Math.max(0, Math.floor(game.resonancePower || 0) - used);
                            let extraNeed = Math.max(0, getTierCost(record.unlockedTier) - getTierCost(prevTier));
                            if (!isEquipped || remain >= extraNeed) {
                                record.activeTier = record.unlockedTier;
                            }
                        }
                        game.supportGemData[gem] = record;
                        didImprove = true;
                    }
                }
                if (didImprove) {
                    game.noti.skills = true;
                    checkUnlocks();
                    let tier = ((game.supportGemData[gem] || {}).unlockedTier || 1);
                    if (game.settings.showLootLog) addLog(`🟢 보조젬 <span class='loot-rare'>[${gem}]</span> 획득! (해금: ${tier >= 3 ? '상급' : tier === 2 ? '중급' : '하급'})`);
                }
            }
        }
    }

    getCurrencyDrops(enemy).forEach(drop => {
        awardCurrency(drop[0], drop[1]);
        addBattleFx('lootPickup', { enemyId: enemy.id, color: (drop[0] === 'divine' || drop[0] === 'exalted') ? '#ffd166' : '#9ad1ff', duration: 760 });
        if (drop[0] === 'divine' || drop[0] === 'exalted') addBattleFx('lootCelebration', { enemyId: enemy.id, color: '#ffcf6b', duration: 980 });
        if (game.settings.showLootLog) addLog(`🪙 ${typeof getStyledOrbName === 'function' ? getStyledOrbName(drop[0]) : ORB_DB[drop[0]].name} +${drop[1]}`, drop[0] === 'divine' || drop[0] === 'exalted' ? 'loot-unique' : 'loot-magic');
    });

    let itemChance = enemy.isBoss ? 0.46 : (enemy.isElite ? 0.15 : 0.04);
    itemChance *= (1 + (getCodexBonusPct() / 100));
    itemChance *= Math.max(0.2, 1 + ((getAbyssPassiveState().tenacity || 0) * 0.01));
    if (zone.type === 'labyrinth') {
        let floor = Math.max(1, Math.floor(zone.floor || 1));
        let softCapFloor = 30;
        let hardCapFloor = 200;
        let softCapMul = 1;
        let hardCapMul = 0.3;
        if (floor > softCapFloor) {
            let progress = Math.min(1, (floor - softCapFloor) / Math.max(1, hardCapFloor - softCapFloor));
            let labyrinthDropMul = softCapMul + (hardCapMul - softCapMul) * progress;
            itemChance *= labyrinthDropMul;
        }
    }
    if (Math.random() < itemChance) {
        let item = generateEquipmentDrop(enemy);
        if (addItemToInventory(item) && game.settings.showLootLog) {
            addBattleFx('lootPickup', { enemyId: enemy.id, color: item.rarity === 'unique' ? '#ffb05a' : '#9ed6ff', duration: 780 });
            if (item.rarity === 'unique') addBattleFx('lootCelebration', { enemyId: enemy.id, color: '#ff9f43', duration: 1200 });
            addLog(`🛡️ <span class='loot-${item.rarity}'>[${item.name}]</span>${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''} 획득!`);
        }
    }
    if ((game.season || 1) >= 5 && (enemy.isElite || enemy.isBoss) && Math.random() < 0.056) {
        let jewel = generateJewelDrop((getZone(game.currentZoneId) || { tier: 1 }).tier || 1);
        game.jewelInventory = game.jewelInventory || [];
        if (game.jewelInventory.length >= getJewelInventoryLimit()) {
            salvageJewelObject(jewel, true);
            if (game.settings.showLootLog) addLog(`💠 주얼 인벤토리 초과로 [${jewel.name}] 자동 해체`, 'attack-monster');
        } else if (game.settings.jewelAutoSalvageEnabled && game.settings.jewelAutoSalvageRarities && game.settings.jewelAutoSalvageRarities[jewel.rarity || 'normal']) {
            salvageJewelObject(jewel, true);
            if (game.settings.showLootLog) addLog(`💠 주얼 자동해체: [${jewel.name}]`, 'loot-normal');
        } else {
            game.jewelInventory.push(jewel);
            let lineText = getJewelStats(jewel).map(stat => `${isJewelPetiteStat(stat) ? '쁘띠 ' : ''}${getStatName(stat.id)} +${formatJewelStatValue(stat.id, stat.val)}${Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` T${Math.floor(stat.tier)}` : ''}`).join(' / ');
            if (game.settings.showLootLog) addLog(`💠 ${getJewelRarityLabel(jewel.rarity)} 주얼 [${jewel.name}] 획득! (${lineText})`, 'loot-rare');
        }
    }
    let beeUnlocked = !!(game.beehive && game.beehive.unlockedPermanent);
    let mappingZone = zone && zone.type === 'abyss';
    if (beeUnlocked && mappingZone && !enemy.isBoss) {
        let beeLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('beekeeper') || 1)) : 1;
        let beeLootLogs = [];
        if (beeLv >= 1 && Math.random() < 0.05) {
            let pollenAmount = enemy.isElite ? 5 : 2;
            awardCurrency('pollen', pollenAmount);
            beeLootLogs.push(`꽃가루 +${pollenAmount}`);
        }
        if (beeLv >= 4 && enemy.isElite && Math.random() < 0.024) {
            awardCurrency('venomStinger', 1);
            beeLootLogs.push('독벌침 +1');
        }
        if (beeLv >= 2 && enemy.isElite && Math.random() < 0.0032) {
            awardCurrency('enchantedHoney', 1);
            beeLootLogs.push('마력 깃든 벌꿀 +1');
        }
        if (beeLv >= 8 && enemy.isElite && Math.random() < 0.016) {
            awardCurrency('beeswax', 1);
            beeLootLogs.push('밀랍 +1');
        }
        maybeTriggerBeeMappingEvent(beeLv, enemy);
        if (game.settings.showLootLog && beeLootLogs.length > 0) beeLootLogs.forEach(msg => addLog(`🐝 ${msg}`, 'loot-normal'));
    }
    if ((game.season || 1) >= 8 && mappingZone && Math.random() < (enemy.isBoss ? 0.01 : enemy.isElite ? 0.003 : 0.0004)) {
        awardCurrency('hiveKey', 1);
        if (game.settings.showLootLog) addLog('🗝️ 벌집 입장권 열쇠를 발견했습니다.', 'loot-rare');
    }
    let sporeUnlocked = Math.max(0, Math.floor(game.loopCount || 0)) >= 2;
    if (sporeUnlocked && zone && (zone.type === 'act' || zone.type === 'abyss')) {
        let sporeChance = enemy.isBoss ? 0.32 : (enemy.isElite ? 0.2 : 0.11);
        if (Math.random() < sporeChance) {
            let pool = ['sporeFire', 'sporeCold', 'sporeLight'];
            if (enemy.ele === 'fire') pool.push('sporeFire');
            if (enemy.ele === 'cold') pool.push('sporeCold');
            if (enemy.ele === 'light') pool.push('sporeLight');
            let key = rndChoice(pool);
            awardCurrency(key, 1);
            if (game.settings.showLootLog) addLog(`🌱 ${typeof getStyledOrbName === 'function' ? getStyledOrbName(key) : ORB_DB[key].name} +1`, 'loot-magic');
        }
    }
}


function clearDotFxThrottleForEnemy(enemyId) {
    if (!Number.isFinite(enemyId)) return;
    let fxState = game.dotFxThrottle;
    if (!fxState || typeof fxState !== 'object') return;
    let prefix = `${enemyId}:`;
    Object.keys(fxState).forEach(key => {
        if (key && key.startsWith(prefix)) delete fxState[key];
    });
}

function handleEnemyDeath(enemy, pStats) {
    if (!enemy || !Number.isFinite(enemy.id)) return;
    let liveRef = (game.enemies || []).find(entry => entry && entry.id === enemy.id);
    // 이미 처리되어 enemies 배열에서 제거된 적(중복 재귀 호출)은 무시한다.
    if (!liveRef || liveRef.hp > 0) return;
    enemy = liveRef;
    let zone = getZone(game.currentZoneId);
    let grand = (game.voidRift || {}).grandRun;
    if (zone && zone.id === 'grand_breach_run' && grand && grand.inRun && grand.phase === 'survival' && !enemy.isBoss) {
        grand.kills = Math.max(0, Math.floor(grand.kills || 0)) + 1;
    }
    game.loopKills = Math.max(0, Math.floor(game.loopKills || 0)) + 1;
    addBattleFx('enemyDeath', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 420 });
    grantExpAndGem(enemy, pStats);
    rollLootForEnemy(enemy);
    gainSkyRiftGaugeFromCombat(zone, enemy);
    // 루프 특수 보스 집계에는 일반 액트/혼돈 보스를 포함하지 않음.
    if ((game.season || 1) >= 9 && zone && zone.type === 'abyss') {
        let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
        if (v.active && enemy.fromVoidRift) v.defeatedCount = Math.max(0, Math.floor(v.defeatedCount || 0)) + 1;
        if (!v.active && Math.random() < (enemy.isElite ? 0.008 : 0.0018)) {
            v.active = true;
            v.activeKills = 0;
            v.requiredKills = 0;
            v.pendingWave = true;
            v.totalToSpawn = 6 + Math.floor(Math.random() * 4);
            v.spawnedCount = 0;
            v.defeatedCount = 0;
            v.spawnTick = 0;
            addLog('🕳️ 공허의 구멍이 랜덤으로 열렸습니다!', 'attack-monster', { noToast: true });
        }
    }
    let equippedHeralds = (game.equippedSupports || []).map(name => {
        let db = SUPPORT_GEM_DB[name];
        if (!db || !Number.isFinite(db.heraldExplodeBase)) return null;
        let gem = normalizeGemRecord((game.supportGemData || {})[name]);
        let lvl = Math.max(1, gem.level + (pStats.gemLv || 0));
        return db.heraldExplodeBase + ((lvl - 1) * (db.heraldExplodeScale || 0));
    }).filter(Boolean);
    if (equippedHeralds.length > 0) {
        let explodeChance = clampNumber(equippedHeralds.reduce((a, b) => a + b, 0), 0, 0.85);
        if (Math.random() < explodeChance) {
            let splash = Math.floor((enemy.maxHp || enemy.hp || 0) * 0.10);
            (game.enemies || []).forEach(target => {
                if (!target || target.id === enemy.id || target.hp <= 0) return;
                target.hp = Math.max(0, target.hp - splash);
                if (target.hp <= 0) handleEnemyDeath(target, pStats);
            });
            if (game.settings.showCombatLog) addLog(`💥 전령 시체폭발 발동! 주변 몬스터에게 ${splash} 피해`, 'attack-player');
        }
    }
    if (pStats && pStats.uniqueCorpseExplode && Math.random() < Math.max(0, Math.min(1, (pStats.uniqueCorpseExplode.chance || 0) / 100))) {
        let lifePct = Math.max(0, Number(pStats.uniqueCorpseExplode.lifePct || 0));
        let splash = Math.max(1, Math.floor((enemy.maxHp || 0) * (lifePct / 100)));
        (game.enemies || []).forEach(target => {
            if (!target || target.id === enemy.id || target.hp <= 0) return;
            target.hp = Math.max(0, target.hp - splash);
            if (target.hp <= 0) handleEnemyDeath(target, pStats);
        });
        addBattleFx('hit', { enemyId: enemy.id, color: '#c56cff', damage: splash, duration: 360, element: 'chaos' });
        if (game.settings.showCombatLog) addLog(`💥 [종말의 논리] 시체 폭발 발동! 주변 몬스터에게 ${splash} 피해`, 'attack-player');
    }
    if (pStats && pStats.uniqueLeechEfficiencyOnKill) {
        let durationMs = Math.max(1000, Math.floor((pStats.uniqueLeechEfficiencyOnKill.duration || 8) * 1000));
        game.uniqueLeechEfficiencyUntil = Date.now() + durationMs;
    }
    if (pStats && pStats.uniqueOverkillSplash && enemy && Number.isFinite(enemy.lastOverkillDamage) && enemy.lastOverkillDamage > 0) {
        let splash = Math.max(1, Math.floor(enemy.lastOverkillDamage));
        (game.enemies || []).forEach(target => {
            if (!target || target.id === enemy.id || target.hp <= 0) return;
            target.hp = Math.max(0, target.hp - splash);
            if (target.hp <= 0) handleEnemyDeath(target, pStats);
        });
    }
    game.enemies = game.enemies.filter(entry => entry.id !== enemy.id);
    clearDotFxThrottleForEnemy(enemy.id);
    if (zone && zone.id === 'beehive_run' && game.beehive && game.beehive.inRun && (game.enemies || []).filter(entry => entry && entry.hp > 0).length === 0) {
        if (typeof onBeehiveWaveCleared === 'function') onBeehiveWaveCleared();
    }
    if (zone && zone.id === 'grand_breach_run' && enemy.isBoss && grand && grand.inRun) {
        let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
        grand.inRun = false;
        grand.phase = 'done';
        grand.timeLeft = 0;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
        game.currentZoneId = grand.returnZoneId !== undefined ? grand.returnZoneId : getAutoProgressZoneId(game.maxZoneId);
        markLoopSpecialBossKill('void_grand_breach');
        unlockJournalEntry('void_grand_breach');
        addLog('🌌 대균열 보스를 격파했습니다!', 'level-up');
    }
    // 시체폭발/연쇄 피해 등으로 동시에 0 이하가 된 적은
    // 일반 타격 루프를 통하지 않으면 사망 처리(handleEnemyDeath)가 누락될 수 있다.
    // 누락 시 enemies 배열에 hp<=0 엔트리가 남아 100% 진행 후에도 클리어가 멈춘다.
    let chainedDefeats = (game.enemies || []).filter(entry => entry && entry.hp <= 0);
    if (chainedDefeats.length > 0) {
        chainedDefeats.forEach(defeated => handleEnemyDeath(defeated, pStats));
    }
    pendingHeavyUiRefresh = true;
}

function canBreakWoodsmanLoop() {
    return Math.max(0, Math.floor(game.woodsmanDefeatAttempts || 0)) >= WOODSMAN_BREAK_LOOP_REQUIRED;
}

function handleStoryActSpecialDefeat(zone, pStats) {
    let storyAct = getStoryActByZoneId(zone && zone.id);
    if (!storyAct) return false;
    if (storyAct.specialType === 'loop_gate') {
        if (canBreakWoodsmanLoop()) return false;
        game.woodsmanDefeatAttempts = Math.max(0, Math.floor(game.woodsmanDefeatAttempts || 0)) + 1;
        game.loopCount = Math.max(0, Math.floor(game.loopCount || 0)) + 1;
        addLog(`🪓 ${storyAct.clearText}`, 'death');
        addLog(`❄️ 나무꾼의 창조 권능이 세계를 되감았습니다. (루프 ${game.loopCount}/${WOODSMAN_BREAK_LOOP_REQUIRED})`, 'attack-monster');
        game.currentZoneId = 0;
        game.maxZoneId = 0;
        game.killsInZone = 0;
        game.playerHp = getPlayerHpCap(pStats);
        startMoving(false);
        updateStaticUI();
        return true;
    }
    return false;
}

function resolveNextLoopBestPlusOneZone(zone) {
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0 };
    if (zone && zone.type === 'abyss' && Math.max(0, Math.floor(game.loopProgressCurrent.bestAbyssDepth || 0)) >= 21) {
        let nextDepth = Math.max(21, Math.floor(game.loopProgressCurrent.bestAbyssDepth || 21) + 1);
        let unlocked = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)) : [];
        if (unlocked.length > 0 && !unlocked.includes(nextDepth)) nextDepth = Math.max(...unlocked.filter(v => v >= 21));
        if (nextDepth >= 21) return getAbyssZoneIdForDepth(nextDepth);
    }
    if (zone && zone.type === 'labyrinth' && Math.max(0, Math.floor(game.loopProgressCurrent.bestLabyrinthFloor || 0)) >= 1) {
        game.labyrinthFloor = Math.max(1, Math.floor(game.loopProgressCurrent.bestLabyrinthFloor || 1) + 1);
        return LABYRINTH_ZONE_ID;
    }
    if (zone && zone.type === 'chaosRealm' && Math.max(0, Math.floor(game.loopProgressCurrent.bestChaosRealmFloor || 0)) >= 1) {
        let st = ensureChaosRealmState();
        st.currentFloor = Math.min(Math.max(1, Math.floor(st.highestFloor || 1)), Math.max(1, Math.floor(game.loopProgressCurrent.bestChaosRealmFloor || 1) + 1));
        return CHAOS_REALM_ZONE_ID;
    }
    return null;
}

function finishEncounterRun() {
    let zone = getZone(game.currentZoneId);
    game.killsInZone++;

    if (zone.type === 'meteor') {
        grantMeteorEncounterRewards();
        let st = ensureStarWedgeState();
        st.entriesCleared = (st.entriesCleared || 0) + 1;
        st.activeMeteorTier = null;
        clearWoodsmanBuildLock();
        game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
        game.killsInZone = 0;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(200);
        return;
    }

    if (zone.type === 'outsideChaos') {
        // outsideChaos는 현재 단일 보스(나무꾼) 클리어 전투이므로
        // 완료 시점이면 보스 처치로 간주한다.
        addWoodsmanPendingScore(1000000);
        let realm = ensureChaosRealmState();
        realm.woodsmanBestDamagePct = 100;
        maybeUnlockChaosRealmFromWoodsman({ isBoss: true, hp: 0, maxHp: 1 }, { finalize: true });
        markLoopSpecialBossKill('woodsman_true');
        addLog('🪓 나무꾼을 쓰러뜨렸습니다. 다음 경계가 열립니다.', 'loot-unique');
        clearWoodsmanBuildLock();
        game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
        game.killsInZone = 0;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(220);
        return;
    }

    if (zone.type === 'chaosRealm') {
        let st = ensureChaosRealmState();
        let floor = Math.max(1, Math.floor(zone.floor || st.currentFloor || 1));
        st.clearedFloors = Array.isArray(st.clearedFloors) ? st.clearedFloors : [];
        let firstClear = !st.clearedFloors.includes(floor);
        if (firstClear) {
            st.clearedFloors.push(floor);
            st.clearedFloors.sort((a, b) => a - b);
            grantChaosRealmFloorBonus(floor);
        }
        st.highestFloor = Math.max(Math.floor(st.highestFloor || 1), floor + 1);
        st.currentFloor = Math.min(st.highestFloor, floor + 1);
        addLog(`🌌 혼돈계 ${floor}층 돌파! ${st.currentFloor}층까지 입장 가능합니다.`, 'season-up');
        let mapAction = game.settings.mapCompleteAction || 'nextZone';
        if (mapAction === 'nextLoopBestPlusOne') {
            let nextZone = resolveNextLoopBestPlusOneZone(zone);
            game.currentZoneId = nextZone !== null ? nextZone : CHAOS_REALM_ZONE_ID;
        } else game.currentZoneId = CHAOS_REALM_ZONE_ID;
        game.killsInZone = 0;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(220);
        return;
    }
    if (zone.type === 'trial') {
        let isFirstClear = !game.completedTrials.includes(zone.id);
        if (isFirstClear) game.completedTrials.push(zone.id);
        if (isFirstClear) {
            game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + 1;
            addLog(`💠 키스톤 포인트 +1 (현재 ${game.ascendKeystonePoints})`, 'loot-unique');
        }
        if (zone.id === 'trial_4') {
            game.ascendPoints += isFirstClear ? 1 : 0;
            if (isFirstClear) {
                game.ascendRank = Math.max(game.ascendRank || 0, 4);
                addLog(`👑 [${zone.name}] 통과! 4차 전직 핵심 노드 선택권 +1 획득!`, "loot-unique");
            }
        } else {
            if (isFirstClear) game.ascendPoints += 2;
            game.ascendRank = Math.max(game.ascendRank || 0, zone.id === 'trial_3' ? 3 : (zone.id === 'trial_2' ? 2 : 1));
        }
        if (!game.unlocks.traits) game.unlocks.traits = true;
        game.noti.traits = true;
        if (zone.id === 'trial_1' && isFirstClear) {
            queueTutorialNotice('unlock_first_ascend', '1차 전직 해금', '1차 전직 시련을 통과했습니다!\n직업전직 탭에서 클래스를 선택하고 전직 노드를 활성화하세요.', 'tab-traits');
        }
        checkUnlocks();
        if (zone.id !== 'trial_4') {
            if (isFirstClear) addLog(`👑 [${zone.name}] 통과! 전직 포인트 2점 획득!`, "loot-unique");
            else addLog(`🔁 [${zone.name}] 재도전 완료 (전직 포인트 보상 없음)`, "attack-monster", { noToast: true });
        }
        game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
        game.killsInZone = 0;
        game.inTicketBossFight = false;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(200);
        return;
    }
    if (zone.type === 'seasonBoss') {
        let firstRootBossClear = !(game.clearedRootBosses || []).includes(zone.id);
        game.clearedRootBosses = Array.isArray(game.clearedRootBosses) ? game.clearedRootBosses : [];
        if (firstRootBossClear) game.clearedRootBosses.push(zone.id);
        if (!game.conditionGemUnlocked && firstRootBossClear && (game.season || 1) >= 2) {
            game.conditionGemUnlocked = true;
            addLog('🧠 컨디션 젬 시스템이 해금되었습니다!', 'loot-unique');
        }
        if (Math.random() < 0.5) awardCurrency(zone.reward || 'bossCore', 1);
        if (Math.random() < 0.4) {
            let bossUnique = generateUniqueItem(zone.tier || 12);
            addItemToInventory(bossUnique);
            addLog(`👑 [${bossUnique.name}] 획득!`, 'loot-unique');
        }
        addLog(`🗝️ [${zone.name}] 토벌 완료!`, 'loot-unique');
        let shouldRepeat = !!game.autoRepeatSeasonBoss;
        let keyLeft = game.currencies[zone.key] || 0;
        if (shouldRepeat && keyLeft > 0) {
            game.currencies[zone.key]--;
            game.currentZoneId = zone.id;
            game.killsInZone = 0;
            game.inTicketBossFight = true;
            addLog(`🔁 입장권 1개 소모, [${zone.name}] 자동 재도전 시작! (남은 열쇠 ${game.currencies[zone.key] || 0})`, 'season-up');
            startMoving(true);
        } else {
            if (shouldRepeat && keyLeft <= 0) addLog('🔁 반복 도전이 켜져 있지만 입장권이 없어 자동 재도전을 중단합니다.', 'attack-monster');
            game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
            game.killsInZone = 0;
            game.inTicketBossFight = false;
            startMoving(false);
        }
        updateStaticUI();
        queueImportantSave(200);
        return;
    }
    if (zone.type === 'labyrinth') {
        let prevLab = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
        game.labyrinthFloor = (game.labyrinthFloor || 1) + 1;
        game.labyrinthUnlockedMaxFloor = Math.max(game.labyrinthUnlockedMaxFloor || 1, game.labyrinthFloor || 1);
        if ((game.labyrinthUnlockedMaxFloor || 1) > prevLab && typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'labyrinth_new_floor');
        let gotBaseFossil = Math.random() < 0.5;
        if (gotBaseFossil) awardCurrency('fossil', 1);
        let fossilDropPool = FOSSIL_DB.filter(fossil => !fossil.ancientPrimalOnly);
        let rolledFossil = rndChoice(fossilDropPool);
        let gotTypedFossil = Math.random() < 0.5;
        if (gotTypedFossil) awardCurrency(rolledFossil.key, 1);
        let mycologistLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('mycologist') || 1)) : 1;
        let primalChance = Math.min(0.45, 0.10 + Math.floor(game.labyrinthFloor || 1) * 0.003);
        let ancientChance = Math.min(0.14, 0.025 + Math.floor(game.labyrinthFloor || 1) * 0.001);
        let gotPrimalFossil = mycologistLv >= 4 && Math.random() < primalChance;
        let gotAncientPrimalFossil = mycologistLv >= 5 && Math.random() < ancientChance;
        if (gotPrimalFossil) awardCurrency('fossilPrimal', 1);
        if (gotAncientPrimalFossil) awardCurrency('fossilAncientPrimal', 1);
        if (Math.random() < 0.03) {
            awardCurrency('fossilAbyssal', 1);
            addLog('🌌 희귀 화석 [심연 화석]을 발견했습니다!', 'loot-unique');
        }
        if ((game.season || 1) >= 6 && Math.random() < 0.025) awardCurrency('sealShard', 1);
        if ((game.season || 1) >= 6 && Math.random() < 0.0075) awardCurrency('strongSealShard', 1);
        if ((game.season || 1) >= 6 && Math.floor(game.labyrinthFloor || 1) >= 30 && Math.random() < 0.0016) awardCurrency('radiantSealShard', 1);
        let fossilSummary = [];
        if (gotBaseFossil) fossilSummary.push('기본 화석 +1');
        if (gotTypedFossil) fossilSummary.push(`${rolledFossil.name} +1`);
        if (gotPrimalFossil) fossilSummary.push('원시 화석 +1');
        if (gotAncientPrimalFossil) fossilSummary.push('원시 고대 화석 +1');
        addLog(`🏛️ 미궁 ${game.labyrinthFloor}층으로 진입합니다. [${fossilSummary.join(' / ') || '화석 없음'}]`, 'season-up');
        let mapAction = game.settings.mapCompleteAction || 'nextZone';
        if (mapAction === 'nextLoopBestPlusOne') {
            let nextZone = resolveNextLoopBestPlusOneZone(zone);
            if (nextZone !== null) game.currentZoneId = nextZone;
        }
        game.killsInZone = 0;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(200);
        return;
    }

    if (game.killsInZone >= zone.maxKills) {
        if (zone.type === 'abyss') {
            let depth = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
            if (depth === 5 && !game.woodsmanSimulatorSeenLoop) {
                game.woodsmanSimulatorSeenLoop = true;
                game.chaosInfuserUnlocked = true;
                unlockJournalEntry('woodsman');
                queueTutorialNotice('woodsman_simulator_loop', '나무꾼의 시뮬레이터', '“다음은 더 나은 세계를 바라지.”\n정체를 드러낸 존재는 진짜 나무꾼이 아닌 시뮬레이터였다.\n더 깊은 혼돈을 돌파해야 루프가 열린다.', 'tab-season');
            }
            let capDepth = 20;
            game.abyssClearedDepths = Array.isArray(game.abyssClearedDepths) ? game.abyssClearedDepths : [];
            if (depth <= capDepth && !game.abyssClearedDepths.includes(depth)) {
                game.abyssClearedDepths.push(depth);
                game.abyssPassivePoints = Math.max(0, Math.floor(game.abyssPassivePoints || 0)) + 5;
                addLog(`🌌 혼돈 ${depth} 클리어 보상: 혼돈 패시브 포인트 +5`, 'season-up');
            }
        }
        if (zone.type === 'act' && zone.id <= 9) markActRewardReady(zone.id);
        if (zone.type === 'act') {
            let storyAct = getStoryActByZoneId(zone.id);
            if (storyAct && storyAct.clearText) addLog(`📜 ${storyAct.clearText}`, 'season-up');
            if (zone.id === 1) addLog('📖 정원사의 불멸 앞에서 패배를 기록했지만, 전진을 위한 보상은 확보했다.', 'season-up');
            if (zone.id === 0) unlockJournalEntry('act_1');
            if (zone.id === 1) unlockJournalEntry('act_2');
            if (zone.id === 2) unlockJournalEntry('act_3');
            if (zone.id === 3) unlockJournalEntry('act_4');
            if (zone.id === 4) unlockJournalEntry('act_5');
            if (zone.id === 5) unlockJournalEntry('act_6');
            if (zone.id === 6) unlockJournalEntry('act_7');
            if (zone.id === 7) unlockJournalEntry('act_8');
            if (zone.id === 8) unlockJournalEntry('act_9');
            if (zone.id === 9) unlockJournalEntry('act_10');
            if (zone.id === 9 && Math.max(0, Math.floor(game.loopDeaths || 0)) <= 0) unlockJournalEntry('immortal');
            if (storyAct && storyAct.specialType === 'loop_gate') {
                addLog('🗡️ 창조 권능 절단이 완성되었다. 나무꾼을 베어낸 루프가 새 시즌의 문을 연다.', 'loot-unique');
                triggerSeasonReset();
                return;
            }
        }
        let clearedAbyssDepth = zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
        let clearedSeasonFinalZone = zone.id === getCurrentSeasonFinalZoneId() || (zone.type === 'abyss' && clearedAbyssDepth >= getSeasonAbyssDepthCap(game.season || 1));
        if (clearedSeasonFinalZone) {
            if ((game.season || 1) >= 10 && zone.type === 'abyss') {
                let depth = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
                game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
                let nowEndless = Math.max(20, depth, Math.floor(game.abyssEndlessDepth || depth));
                let nextDepth = Math.max(21, nowEndless + 1);
                if (!game.abyssUnlockedDepths.includes(nextDepth)) game.abyssUnlockedDepths.push(nextDepth);
                // Keep current endless depth here; enterNextEndlessChaosDepth() advances by +1 when continuing.
                // Setting this to nextDepth would double-advance and skip a floor (e.g. 20 -> 22).
                game.abyssEndlessDepth = Math.max(nowEndless, 20);
                game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0 };
                if (game.loopProgressCurrent.chaos20Cleared) {
                    enterNextEndlessChaosDepth();
                    return;
                }
                game.loopProgressCurrent.chaos20Cleared = true;
                game.pendingLoopDecision = true;
                game.combatHalted = true;
                game.enemies = [];
                game.encounterPlan = [];
                game.encounterIndex = 0;
                game.runProgress = 0;
                updateStaticUI();
                return;
            }
            triggerSeasonReset();
            return;
        }
        if (zone.type === 'abyss' && !game.unlockedTrials.includes('trial_3')) {
            let shouldUnlockTrial3 = zone.name === '혼돈 5' || Math.random() < 0.15;
            if (shouldUnlockTrial3) {
                game.unlockedTrials.push('trial_3');
                game.noti.map = true;
                addLog(zone.name === '혼돈 5' ? "✨ [여신의 헌사] 혼돈 5 보스 확정 드랍! 3차 전직 시련 개방!" : "✨ [여신의 헌사] 획득! 3차 전직 시련 개방!", "loot-unique");
            }
        }
        // 다음 지역 해금은 "지금 막 클리어한 존"을 기준으로 보정한다.
        // 특히 혼돈 구간은 반복/자동화 상태와 무관하게 N 클리어 시 N+1이 열려야 하므로
        // targetUnlockZone을 직접 계산해 누락을 방지한다.
        let targetUnlockZone = Math.min(getCurrentSeasonFinalZoneId(), zone.id + 1);
        // 이미 열려 있는 이전 구역 반복 클리어로 프론티어를 우회 해금하지 않도록
        // "현재 프론티어(=maxZoneId) 이상 구역을 클리어했을 때만" 다음 구역을 연다.
        let clearedAtFrontier = zone.id >= game.maxZoneId;
        if (clearedAtFrontier && game.maxZoneId < targetUnlockZone) {
            game.maxZoneId = targetUnlockZone;
            game.noti.map = true;
            triggerMapUnlockReveal(game.maxZoneId);
            let clearedStoryAct = getStoryActByZoneId(zone.id);
            if (clearedStoryAct && clearedStoryAct.unlockText) addLog(`🧭 ${clearedStoryAct.unlockText}`, 'season-up');
            let unlockedZone = getZone(game.maxZoneId);
            addLog(`🗺️ 신규 사냥터 [${unlockedZone ? unlockedZone.name : ('구역 ' + game.maxZoneId)}] 개방!`, "season-up");
        }
        game.killsInZone = 0;
        game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0 };
        if (zone.type === 'abyss') {
            let d = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
            if (d >= 21) game.loopProgressCurrent.bestAbyssDepth = Math.max(Math.floor(game.loopProgressCurrent.bestAbyssDepth || 0), d);
        }
        if (zone.type === 'labyrinth') game.loopProgressCurrent.bestLabyrinthFloor = Math.max(Math.floor(game.loopProgressCurrent.bestLabyrinthFloor || 0), Math.max(1, Math.floor(game.labyrinthFloor || zone.floor || 1)));
        if (zone.type === 'chaosRealm') game.loopProgressCurrent.bestChaosRealmFloor = Math.max(Math.floor(game.loopProgressCurrent.bestChaosRealmFloor || 0), Math.max(1, Math.floor(zone.floor || (ensureChaosRealmState().currentFloor || 1))));
        let mapAction = game.settings.mapCompleteAction || 'nextZone';
        if (game.beehive && game.beehive.inRun) mapAction = 'repeatZone';
        if (mapAction === 'repeatZone') game.currentZoneId = zone.id;
        else if (mapAction === 'nextLoopBestPlusOne') {
            let nextZone = resolveNextLoopBestPlusOneZone(zone);
            game.currentZoneId = nextZone !== null ? nextZone : getAutoProgressZoneId(Math.max(game.currentZoneId, game.maxZoneId));
        }
        else if (mapAction === 'stop') {
            game.combatHalted = true;
            game.enemies = [];
            game.encounterPlan = [];
            game.encounterIndex = 0;
            game.runProgress = 0;
            updateStaticUI();
            queueImportantSave(180);
            return;
        } else game.currentZoneId = getAutoProgressZoneId(Math.max(game.currentZoneId, game.maxZoneId));
        let star = game.starWedge || {};
        let beehiveRunning = typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun);
        let grandRunning = !!(game.voidRift && game.voidRift.grandRun && game.voidRift.grandRun.inRun);
        if (game.settings && game.settings.autoEnterMeteor && !beehiveRunning && !grandRunning && star.unlocked && star.skyRiftReady && zone.type !== 'meteor') {
            game.currentZoneId = METEOR_FALL_ZONE_ID;
            addLog('☄️ 자동입장: 하늘 균열 100% 충전으로 운석 낙하 지점에 진입합니다.', 'season-up');
        }
    }
    checkUnlocks();
    if ((game.settings.townReturnAction || 'retry') === 'stop') {
        game.combatHalted = true;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
    } else startMoving(false);
    updateStaticUI();
    queueImportantSave(220);
}

function performPlayerAttack(pStats) {
    if (Array.isArray(game.queenBees) && game.queenBees.length > 0) {
        let now = Date.now();
        game.queenBees = game.queenBees.filter(bee => bee && (bee.expiresAt || 0) > now && (bee.attacksLeft || 0) > 0);
        game.queenBees.forEach(bee => {
            if (now < (bee.nextAt || 0)) return;
            bee.nextAt = now + 1000;
            bee.attacksLeft = Math.max(0, Math.floor((bee.attacksLeft || 0) - 1));
            let target = (game.enemies || []).find(e => e && e.hp > 0);
            if (!target) return;
            let beeDmg = Math.max(1, Math.floor((pStats.baseDmg || 1) * ((bee.hitPct || 125) / 100)));
            applyDamageToEnemyResource(target, beeDmg);
        });
    }
    let targets = getSkillTargets(pStats);
    if (targets.length === 0) return;
    let isDotSkill = Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('dot');

    let isCrit = Math.random() < (pStats.crit / 100);
    if (game.ascendClass === 'assassin' && hasKeystone('a5')) isCrit = true;
    if (game.ascendClass === 'warrior' && hasKeystone('w2') && isCrit) {
        let now = Date.now();
        let active = (game.warriorRhythmExpiresAt || 0) > now;
        let stacks = active ? Math.max(0, Math.min(5, Math.floor(game.warriorRhythmStacks || 0))) : 0;
        game.warriorRhythmStacks = Math.min(5, stacks + 1);
        game.warriorRhythmExpiresAt = now + 2000;
    }
    if (game.ascendClass === 'gladiator' && hasKeystone('g3')) {
        game.gladiatorVeteranCritBonus = Math.max(0, Math.floor(game.gladiatorVeteranCritBonus || 0));
        if (isCrit) game.gladiatorVeteranCritBonus = 0;
        else game.gladiatorVeteranCritBonus = Math.min(100, game.gladiatorVeteranCritBonus + 5);
    }
    let preloadElementalistStacks = Math.max(0, Math.floor(game.elementalistOverloadStacks || 0));
    if (game.ascendClass === 'elementalist' && hasKeystone('e8')) {
        if (isCrit) game.elementalistOverloadStacks = preloadElementalistStacks + 1;
        else game.elementalistOverloadStacks = 0;
        game.elementalistOverloadExpiresAt = 0;
    }
    let baseDamage = pStats.baseDmg;
    let movedRecently = (Date.now() - (game.lastMoveEndedAt || 0)) <= 1200;
    let riderCompassReady = !!(pStats.uniqueRiderCompass && movedRecently && !game.uniqueRiderCompassConsumed);
    if (isCrit) {
        baseDamage = Math.floor(baseDamage * (pStats.critDmg / 100));
        if (game.activeSkill === '묵직한 강타' && pStats.sSkill.finalLevel >= 20) baseDamage *= 2;
    }
    let getHitElement = () => {
        let pool = Array.isArray(pStats.sSkill.randomElementPool) ? pStats.sSkill.randomElementPool.filter(Boolean) : null;
        if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
        return pStats.sSkill.ele || 'phys';
    };
    let swingElement = getHitElement();
    game.lastSkillHitElement = swingElement;
    addBattleFx('playerSwing', {
        color: getElementColor(swingElement),
        element: swingElement,
        crit: isCrit,
        projectile: (pStats.sSkill.tags || []).includes('projectile'),
        skillName: game.activeSkill,
        duration: 600
    });

    let zoneTier = getZone(game.currentZoneId).tier;
    let slamEchoPct = 0;
    let slamEchoDelayMs = 1000;
    let slamEchoGuaranteed = false;
    let passiveSlamEchoChance = Math.max(0, Math.min(100, pStats.slamEchoChance || 0)) / 100;
    if (passiveSlamEchoChance > 0 && Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('slam')) slamEchoPct = Math.max(slamEchoPct, 0.25);
    (game.playerConditionBuffs || []).forEach(buff => {
        let delta = getConditionGemStatDelta(buff.name, buff.type);
        if (delta.slamEchoPct) { slamEchoPct = Math.max(slamEchoPct, delta.slamEchoPct); slamEchoGuaranteed = true; }
        if (delta.slamEchoDelaySec) slamEchoDelayMs = Math.max(100, Math.floor(delta.slamEchoDelaySec * 1000));
    });
    let hits = [];
    let totalDamage = 0;
    let totalLeechableDamage = 0;
    let isProjectileSkill = Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('projectile');
    let projectileBonusShots = isProjectileSkill ? Math.max(0, Math.min(5, Math.floor(pStats.projectileExtraShots || 0))) : 0;
    let curseProjectileExtraHits = 0;
    if (isProjectileSkill) {
        let aliveEnemies = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
        for (let enemy of aliveEnemies) {
            let fx = getEnemyConditionDebuffFactor(enemy);
            curseProjectileExtraHits = Math.max(curseProjectileExtraHits, Math.max(0, Math.floor(fx.projectileExtraHits || 0)));
        }
    }
    let uniqueProjectileExtraHits = isProjectileSkill ? Math.max(0, Math.floor((pStats.uniqueProjectileDoubleStrikePct || 0) / 100)) : 0;
    let repeats = Math.max(1, Math.min(12, Math.floor(pStats.sSkill.multiHit || 1) + projectileBonusShots + curseProjectileExtraHits + uniqueProjectileExtraHits));
    let perEnemyHitCount = new Map();
    let hitSummary = { totalHits: 0, totalDamage: 0, uniqueTargets: new Set() };
    function applyPierceOverkillCarry(sourceEnemy, carryDamage, hitElement, hitCrit) {
        if (!pStats.sSkill.pierceOverkillCarry || carryDamage <= 0) return;
        let remainingDamage = Math.max(0, Math.floor(carryDamage));
        let visited = new Set(sourceEnemy && sourceEnemy.id ? [sourceEnemy.id] : []);
        let chainLimit = Math.max(1, Math.min(12, Math.floor(pStats.sSkill.targets || 1)));
        for (let chainIdx = 0; chainIdx < chainLimit && remainingDamage > 0; chainIdx++) {
            let chainTarget = (game.enemies || []).find(enemy => enemy && enemy.hp > 0 && !visited.has(enemy.id));
            if (!chainTarget) return;
            visited.add(chainTarget.id);
            let zone = getZone(game.currentZoneId);
            let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
            let beforeHpForForced = chainTarget.hp;
            let chainRes = getEffectiveEnemyMitigation(hitElement, zone.tier, chainTarget, pStats);
            let chainDamage = Math.floor(remainingDamage * (1 - chainRes / 100));
            if ((pStats.sSkill.tags || []).includes('projectile')) chainDamage = Math.floor(chainDamage * (chainTarget.projectileDamageTakenMul || 1));
            if (hitElement === 'phys') chainDamage = Math.floor(chainDamage * (chainTarget.physicalDamageTakenMul || 1));
            let dealtToChain = applyDamageToEnemyResource(chainTarget, Math.max(1, chainDamage));
            if (chainTarget.isBoss && storyAct && (storyAct.specialType === 'forced_defeat' || (storyAct.specialType === 'loop_gate' && !canBreakWoodsmanLoop())) && chainTarget.hp <= 0) {
                chainTarget.hp = Math.max(1, Math.min(beforeHpForForced, chainTarget.maxHp || 1));
            }
            maybeUnlockChaosRealmFromWoodsman(chainTarget);
            chainTarget.recentHitsTaken = (chainTarget.recentHitsTaken || 0) + 1;
            chainTarget.recentHitsTimer = 1.8;
            totalDamage += dealtToChain;
            totalLeechableDamage += dealtToChain * (chainTarget && chainTarget.leechEffMul !== undefined ? chainTarget.leechEffMul : 1);
            hits.push(dealtToChain);
            hitSummary.totalHits += 1;
            hitSummary.totalDamage += dealtToChain;
            hitSummary.uniqueTargets.add(chainTarget.id);
            addBattleFx('hit', {
                enemyId: chainTarget.id,
                color: getElementColor(hitElement),
                crit: hitCrit,
                projectile: true,
                chain: true,
                skillName: game.activeSkill,
                damage: dealtToChain,
                duration: 320,
                element: hitElement
            });
            applyEnemyAilmentFromHit(chainTarget, { ...pStats, sSkill: { ...pStats.sSkill, ele: hitElement } }, remainingDamage, hitCrit);
            remainingDamage = (chainTarget.hp <= 0) ? Math.max(0, remainingDamage - dealtToChain) : 0;
        }
    }
    let randomTargetCapFallbackUsed = false;
    for (let hitIdx = 0; hitIdx < repeats; hitIdx++) {
        let hitEntries = pStats.sSkill.randomTargetEachHit ? [{ mult: 1 }] : targets;
        hitEntries.forEach(hit => {
            let targetEnemy = hit.enemy;
            if (pStats.sSkill.randomTargetEachHit) {
                let alive = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
                if (alive.length <= 0) return;
                let eligible = alive.filter(enemy => (perEnemyHitCount.get(enemy.id) || 0) < 2);
                if (eligible.length > 0) targetEnemy = eligible[Math.floor(Math.random() * eligible.length)];
                else if (!randomTargetCapFallbackUsed) {
                    randomTargetCapFallbackUsed = true;
                    targetEnemy = alive[Math.floor(Math.random() * alive.length)];
                } else return;
            }
            if (!targetEnemy || targetEnemy.hp <= 0) return;
            let nextHitCount = (perEnemyHitCount.get(targetEnemy.id) || 0) + 1;
            perEnemyHitCount.set(targetEnemy.id, nextHitCount);
            let hitElement = swingElement;
            let curseFx = getEnemyConditionDebuffFactor(targetEnemy);
            let enemyRes = getEffectiveEnemyMitigation(hitElement, zoneTier, targetEnemy, pStats) - (curseFx.resShred || 0);
            if (hitElement === 'fire') enemyRes -= (curseFx.resFShred || 0);
            if (hitElement === 'cold') enemyRes -= (curseFx.resCShred || 0);
            if (hitElement === 'light') enemyRes -= (curseFx.resLShred || 0);
            if (hitElement === 'chaos') enemyRes -= (curseFx.resChaosShred || 0);
            if (hitElement === 'phys') enemyRes -= (curseFx.physDrShred || 0);
            let hitCrit = isCrit;
            let hitBaseDamage = hitCrit ? Math.floor(pStats.baseDmg * (pStats.critDmg / 100)) : pStats.baseDmg;
            if (riderCompassReady) {
                hitBaseDamage = Math.floor(hitBaseDamage * 2);
                riderCompassReady = false;
                game.uniqueRiderCompassConsumed = true;
            }
            if (hitCrit && game.ascendClass === 'assassin' && hasKeystone('a7') && (game.enemies || []).filter(e => e && e.hp > 0).length === 1) hitBaseDamage *= 2;
            if (hitCrit && game.activeSkill === '묵직한 강타' && pStats.sSkill.finalLevel >= 20) hitBaseDamage *= 2;
            let randomElementPct = pStats.randomElementDamagePct && Number(pStats.randomElementDamagePct[hitElement]) ? Number(pStats.randomElementDamagePct[hitElement]) : 0;
            if (randomElementPct) hitBaseDamage = Math.floor(hitBaseDamage * (1 + randomElementPct / 100));
            if (hitElement === 'phys') hitBaseDamage = Math.floor(hitBaseDamage * Math.max(0, Number(pStats.warriorPhysDamageMultiplier) || 1));
            if (targetEnemy.isBoss) hitBaseDamage = Math.floor(hitBaseDamage * Math.max(0, Number(pStats.bossDamageDealtMultiplier) || 1));
            if (game.ascendClass === 'gladiator' && hasKeystone('g5') && game.gladiatorSwiftOpeningReady) {
                hitBaseDamage = Math.floor(hitBaseDamage * 1.30);
                game.gladiatorSwiftOpeningReady = false;
            }
            let dmg = Math.floor(hitBaseDamage * (hit.mult || 1));
            let minRoll = Math.max(1, Math.floor(pStats.minDmgRoll || 80));
            let maxRoll = Math.max(minRoll, Math.floor(pStats.maxDmgRoll || 100));
            let rollPct = minRoll + Math.random() * (maxRoll - minRoll);
            if (pStats.uniqueCeilingSmashDouble && rollPct >= 140 && Math.random() < 0.15) dmg *= 2;
            dmg = Math.floor(dmg * (rollPct / 100));
            if (hitElement === 'chaos') {
                let chaosMultiplier = Math.max(0, Number(pStats.chaosDamageMultiplier) || 1);
                dmg = Math.floor(dmg * chaosMultiplier);
            }
            if ((targetEnemy.firstHitGuard || 0) > 0 && !targetEnemy.firstHitConsumed) {
                dmg = Math.floor(dmg * (1 - targetEnemy.firstHitGuard));
                targetEnemy.firstHitConsumed = true;
            }
            let burstHits = Math.max(0, (targetEnemy.recentHitsTaken || 0) - 2);
            let hitGuard = (targetEnemy.hitRateGuard || 0) * Math.min(5, burstHits);
            if (hitGuard > 0) dmg = Math.floor(dmg * Math.max(0.2, 1 - hitGuard));
            let damageBeforeMitigation = dmg;
            dmg = Math.floor(dmg * Math.max(0, pStats.instantDamageMultiplier || 1));
            if ((pStats.uniqueDoubleDamageChancePct || 0) > 0 && Math.random() < ((pStats.uniqueDoubleDamageChancePct || 0) / 100)) dmg *= 2;
            if ((targetEnemy.evasionChance || 0) > 0 && Math.random() * 100 < targetEnemy.evasionChance) {
                if (game.settings.showCombatLog) addLog(`🌀 ${targetEnemy.name} 회피`, 'attack-monster', { noToast: true });
                return;
            }
            dmg = Math.floor(dmg * (1 - (enemyRes / 100)));
            dmg = Math.floor(dmg * (curseFx.mul || 1));
            if ((pStats.sSkill.tags || []).includes('projectile')) dmg = Math.floor(dmg * (curseFx.projectileTakenMul || 1) * (targetEnemy.projectileDamageTakenMul || 1));
            if ((pStats.sSkill.tags || []).includes('spell')) dmg = Math.floor(dmg * (targetEnemy.spellDamageTakenMul || 1));
            if (hitElement === 'phys') dmg = Math.floor(dmg * (targetEnemy.physicalDamageTakenMul || 1));
            if ((targetEnemy.armorGuard || 0) > 0 && hitElement === 'phys') dmg = Math.floor(dmg * Math.max(0.2, 1 - targetEnemy.armorGuard));
            if (hitElement === 'light') dmg = Math.floor(dmg * (curseFx.lightTakenMul || 1));
            if (hitElement === 'chaos') dmg = Math.floor(dmg * (curseFx.chaosTakenMul || 1));
            if (hitCrit) dmg = Math.floor(dmg * (curseFx.critDmgTakenMul || 1));
            if (pStats.uniqueBleedWeightOnBleedingHit && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'bleed' && (a.time || 0) > 0)) dmg = Math.floor(dmg * 2);
            dmg = Math.floor(dmg * getKeystoneEnemyTakenMultiplier(targetEnemy, hitElement));
            dmg = Math.floor(dmg * (getAbyssMonsterScales(getZone(game.currentZoneId)).playerDamageMul || 1));
            if (targetEnemy.isBoss && (pStats.damageScales || {}).talismanBossFinalDmgBonusPct) dmg = Math.floor(dmg * (1 + ((pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100)));
            dmg = Math.floor(dmg * Math.max(0, Number(pStats.finalDamageMultiplier) || 1));
            let hasActiveDoomMark = false;
            if (targetEnemy && targetEnemy.id) {
                let debs = (game.enemyConditionDebuffs && game.enemyConditionDebuffs[targetEnemy.id]) ? game.enemyConditionDebuffs[targetEnemy.id] : [];
                hasActiveDoomMark = debs.some(deb => deb && deb.name === '파멸 징표' && (deb.expiresAt || 0) > Date.now());
            }
            if (targetEnemy && targetEnemy.id && dmg > 0 && hasActiveDoomMark) {
                let curseStore = game.enemyCurseExpirePayloads || {};
                let row = curseStore[targetEnemy.id] || { doomDamage: 0 };
                row.doomDamage = Math.max(0, Math.floor(row.doomDamage || 0) + dmg);
                curseStore[targetEnemy.id] = row;
                game.enemyCurseExpirePayloads = curseStore;
            }
            let zone = getZone(game.currentZoneId);
            let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
            let beforeHpForForced = targetEnemy.hp;
            let dealtToEnemy = applyDamageToEnemyResource(targetEnemy, dmg);
            if (targetEnemy.hp <= 0) targetEnemy.lastOverkillDamage = Math.max(0, dmg - dealtToEnemy);
            if (pStats.uniqueMaxRollBonusHit && rollPct >= 130 && dealtToEnemy > 0 && targetEnemy.hp > 0) {
                let bonus = Math.max(1, Math.floor(dealtToEnemy * 0.5));
                dealtToEnemy += applyDamageToEnemyResource(targetEnemy, bonus);
            }
            if (game.ascendClass === 'ranger' && hasKeystone('r5') && targetEnemy.hp > 0) {
                game.rangerWeakpointMarks = game.rangerWeakpointMarks || {};
                let mark = game.rangerWeakpointMarks[targetEnemy.id] || { hits: 0 };
                mark.hits = Math.max(0, Math.floor(mark.hits || 0)) + 1;
                if (mark.hits >= 3) {
                    mark.hits = 0;
                    let bonus = Math.max(1, Math.floor((targetEnemy.maxHp || targetEnemy.hp || 1) * 0.01));
                    dealtToEnemy += applyDamageToEnemyResource(targetEnemy, bonus);
                    addBattleFx('hit', { enemyId: targetEnemy.id, color: getElementColor('phys'), damage: bonus, duration: 280, element: 'phys' });
                }
                game.rangerWeakpointMarks[targetEnemy.id] = mark;
            }
            if (targetEnemy.isBoss && storyAct && (storyAct.specialType === 'forced_defeat' || (storyAct.specialType === 'loop_gate' && !canBreakWoodsmanLoop())) && targetEnemy.hp <= 0) {
                targetEnemy.hp = Math.max(1, Math.min(beforeHpForForced, targetEnemy.maxHp || 1));
            }
            maybeUnlockChaosRealmFromWoodsman(targetEnemy);
            if (targetEnemy.hp <= 0 && dmg > dealtToEnemy) applyPierceOverkillCarry(targetEnemy, dmg - dealtToEnemy, hitElement, hitCrit);
            if (slamEchoPct > 0 && (pStats.sSkill.tags || []).includes('slam') && dmg > 0 && targetEnemy.hp > 0 && (slamEchoGuaranteed || passiveSlamEchoChance <= 0 || Math.random() < passiveSlamEchoChance)) {
                game.pendingSlamEchoHits = Array.isArray(game.pendingSlamEchoHits) ? game.pendingSlamEchoHits : [];
                game.pendingSlamEchoHits.push({
                    at: Date.now() + slamEchoDelayMs,
                    enemyId: targetEnemy.id,
                    damage: Math.max(1, Math.floor(dmg * slamEchoPct)),
                    element: hitElement
                });
            }
            if ((pStats.damageScales || {}).talismanBossFinalDmgBonusPct && targetEnemy.hp > 0 && (targetEnemy.hp / Math.max(1, targetEnemy.maxHp || targetEnemy.hp)) <= 0.05) targetEnemy.hp = 0;
            if (game.ascendClass === 'gladiator' && hasKeystone('g6') && targetEnemy.hp > 0) {
                let executeThreshold = targetEnemy.isBoss ? 0.10 : 0.20;
                if ((targetEnemy.hp / Math.max(1, targetEnemy.maxHp || targetEnemy.hp)) < executeThreshold) {
                    targetEnemy.hp = 0;
                }
            }
            if ((pStats.regenSuppress || 0) > 0) targetEnemy.regenSuppressPct = Math.min(95, (targetEnemy.regenSuppressPct || 0) + pStats.regenSuppress);
            targetEnemy.recentHitsTaken = (targetEnemy.recentHitsTaken || 0) + 1;
            targetEnemy.recentHitsTimer = 1.8;
            if (pStats.uniqueChaosResDownOnHit) {
                game.enemyUniqueChaosResDown = game.enemyUniqueChaosResDown || {};
                let row = game.enemyUniqueChaosResDown[targetEnemy.id] || { stacks: 0, perHit: pStats.uniqueChaosResDownOnHit.perHit, maxStacks: pStats.uniqueChaosResDownOnHit.maxStacks };
                row.stacks = Math.min(row.maxStacks, Math.max(0, row.stacks + 1));
                row.perHit = pStats.uniqueChaosResDownOnHit.perHit;
                row.maxStacks = pStats.uniqueChaosResDownOnHit.maxStacks;
                game.enemyUniqueChaosResDown[targetEnemy.id] = row;
            }

            if (pStats.uniqueStackingElementalResDownOnHit && ['fire','cold','light'].includes(hitElement)) {
                game.enemyUniqueElementalResDown = game.enemyUniqueElementalResDown || {};
                let row = game.enemyUniqueElementalResDown[targetEnemy.id] || { stacks: 0, perHit: pStats.uniqueStackingElementalResDownOnHit.perHit, max: pStats.uniqueStackingElementalResDownOnHit.max };
                row.stacks = Math.min(Math.ceil(row.max / Math.max(1,row.perHit)), Math.max(0, row.stacks + 1));
                row.perHit = pStats.uniqueStackingElementalResDownOnHit.perHit;
                row.max = pStats.uniqueStackingElementalResDownOnHit.max;
                game.enemyUniqueElementalResDown[targetEnemy.id] = row;
            }
            if (pStats.uniqueQueenBeeSummon && Math.random() < Math.max(0, Math.min(1, (pStats.uniqueQueenBeeSummon.chance || 0) / 100))) {
                let bees = game.queenBees || [];
                bees.push({ expiresAt: Date.now() + Math.max(1000, Math.floor((pStats.uniqueQueenBeeSummon.attacks || 3) * 1000)), nextAt: Date.now() + 1000, attacksLeft: Math.max(1, Math.floor(pStats.uniqueQueenBeeSummon.attacks || 3)), hitPct: Math.max(1, Number(pStats.uniqueQueenBeeSummon.hitPct || 125)) });
                while (bees.length > Math.max(1, Math.floor(pStats.uniqueQueenBeeSummon.maxBees || 10))) bees.shift();
                game.queenBees = bees;
            }
            if (hitCrit && pStats.uniqueMeteorFootsteps && Math.random() < Math.max(0, Math.min(1, (pStats.uniqueMeteorFootsteps.chance || 0) / 100))) {
                let meteor = Math.max(1, Math.floor(dmg * (Math.max(1, Number(pStats.uniqueMeteorFootsteps.damagePct || 180)) / 100)));
                (game.enemies || []).forEach(e => { if (!e || e.hp <= 0) return; e.hp = Math.max(0, e.hp - meteor); });
            }
            if (pStats.uniqueShockTracer && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'shock' && (a.time || 0) > 0)) {
                let now = Date.now();
                game.uniqueShockTracerNextAt = Number(game.uniqueShockTracerNextAt || 0);
                if (now >= game.uniqueShockTracerNextAt) {
                    game.uniqueShockTracerNextAt = now + 500;
                    let strike = Math.max(1, Math.floor(dmg * 5));
                    dealtToEnemy += applyDamageToEnemyResource(targetEnemy, strike);
                }
            }
            if (pStats.uniqueDragonVeinGuard && Math.random() < Math.max(0, Math.min(1, (pStats.uniqueDragonVeinGuard.chance || 0) / 100))) {
                let guardAmt = Math.max(1, Math.floor((pStats.maxHp || 0) * Math.max(0, Number(pStats.uniqueDragonVeinGuard.hpPct || 8)) / 100));
                game.playerUniqueGuard = { amount: guardAmt, expiresAt: Date.now() + Math.max(500, Math.floor((pStats.uniqueDragonVeinGuard.duration || 2) * 1000)) };
            }

            totalDamage += dealtToEnemy;
            totalLeechableDamage += dealtToEnemy * (targetEnemy && targetEnemy.leechEffMul !== undefined ? targetEnemy.leechEffMul : 1);
            hits.push(dealtToEnemy);
            hitSummary.totalHits += 1;
            hitSummary.totalDamage += dealtToEnemy;
            hitSummary.uniqueTargets.add(targetEnemy.id);
            addBattleFx('hit', {
                enemyId: targetEnemy.id,
                color: getElementColor(hitElement),
                crit: hitCrit,
                projectile: (pStats.sSkill.tags || []).includes('projectile'),
                chain: pStats.sSkill.targetMode === 'chain',
                skillName: game.activeSkill,
                damage: dealtToEnemy,
                duration: 320,
                element: hitElement
            });
            if (hitCrit && game.ascendClass === 'assassin' && hasKeystone('a3')) {
                let now = Date.now();
                game.enemyKeystoneDebuffs = game.enemyKeystoneDebuffs || {};
                let list = (game.enemyKeystoneDebuffs[targetEnemy.id] || []).filter(row => row && (row.expiresAt || 0) > now);
                list.push({ type: 'a3', expiresAt: now + 5000 });
                while (list.filter(row => row.type === 'a3').length > 10) { let idx=list.findIndex(row=>row.type==='a3'); if (idx>=0) list.splice(idx,1); else break; }
                game.enemyKeystoneDebuffs[targetEnemy.id] = list;
                targetEnemy.ailments = Array.isArray(targetEnemy.ailments) ? targetEnemy.ailments : [];
                let stacks = list.filter(row => row.type === 'a3').length;
                let mark = targetEnemy.ailments.find(ail => ail && ail.type === 'assassinWeakness');
                if (mark) { mark.time = 5; mark.power = stacks; }
                else targetEnemy.ailments.push({ type: 'assassinWeakness', time: 5, power: stacks });
            }
            if (isDotSkill) applyEnemyDotFromHit(targetEnemy, damageBeforeMitigation, pStats);
            applyEnemyAilmentFromHit(targetEnemy, { ...pStats, sSkill: { ...pStats.sSkill, ele: hitElement } }, dmg, hitCrit);
            if (pStats.uniqueAlwaysShock) {
                let shockStats = { ...pStats, sSkill: { ...pStats.sSkill, ele: 'light' } };
                let shockHit = Math.max(1, Math.floor(dmg * 0.25 * (1 + Math.max(0, Number(pStats.shockEffectBonusPct)||0)/100)));
                applyEnemyAilmentFromHit(targetEnemy, shockStats, shockHit, true);
            }
        });
    }
    if (pStats.leech > 0 && totalLeechableDamage > 0) {
        let leechAmount = (totalLeechableDamage * (pStats.leech / 100));
        let leechTarget = (game.ascendClass === 'warlock' && hasKeystone('wlk3') && (pStats.energyShield || 0) > 0) ? 'energyShield' : 'life';
        if ((pStats.uniqueInstantLeechPct || 0) > 0) applyInstantPlayerLeech(leechAmount * ((pStats.uniqueInstantLeechPct || 0) / 100), pStats, leechTarget);
        if (pStats.sSkill && pStats.sSkill.instantLeech) applyInstantPlayerLeech(leechAmount, pStats, leechTarget);
        else addPlayerLeechInstance(leechAmount, pStats, leechTarget);
    }

    if (isCrit && (pStats.uniqueEsRecoverOnCritPct || 0) > 0 && (pStats.energyShield || 0) > 0) {
        let recover = Math.max(1, Math.floor((pStats.energyShield || 0) * ((pStats.uniqueEsRecoverOnCritPct || 0) / 100)));
        game.playerEnergyShield = Math.min((pStats.energyShield || 0), Math.max(0, (game.playerEnergyShield || 0) + recover));
    }

    if (game.settings.showCombatLog) {
        let dotInfo = '';
        if (isDotSkill) {
            let maxDotStack = targets.reduce((max, hit) => Math.max(max, (hit.enemy && hit.enemy.dotStacks) || 0), 0);
            if (maxDotStack > 0) dotInfo = ` · 도트중첩 ${maxDotStack}/${DOT_STACK_MAX} (${getDotStackMultiplier(maxDotStack).toFixed(2)}x)`;
        }
        let hitPrefix = isDotSkill ? '⚔️ 직격' : '⚔️';
        let totalDamageText = `${Math.floor(hitSummary.totalDamage)} 피해`;
        let showHitCount = hitSummary.totalHits >= 2;
        let showTargetCount = hitSummary.uniqueTargets.size >= 2;
        let lineCore = [totalDamageText];
        if (showHitCount) lineCore.push(`${hitSummary.totalHits}히트`);
        if (showTargetCount) lineCore.push(`대상 ${hitSummary.uniqueTargets.size}`);
        let line = `${hitPrefix} ${lineCore.join(' / ')}`;
        line += dotInfo;
        if (isCrit) line = `💥 ${line}`;
        let scales = pStats.damageScales || {};
        let hiddenScaleTags = Array.isArray(pStats.sSkill.hideCombatScales) ? pStats.sSkill.hideCombatScales : [];
        let scaleLabels = [];
        if ((scales.hpFlatBonus || 0) > 0) scaleLabels.push(`생명력추가+${Math.floor(scales.hpFlatBonus || 0)}`);
        if (!hiddenScaleTags.includes('regen') && (scales.regen || 1) > 1.0001) scaleLabels.push(`재생x${(scales.regen || 1).toFixed(2)}`);
        if (!hiddenScaleTags.includes('fireRes') && (scales.fireRes || 1) > 1.0001) scaleLabels.push(`화저x${(scales.fireRes || 1).toFixed(2)}`);
        if (scaleLabels.length > 0) line += ` [계수 ${scaleLabels.join(' / ')}]`;
        addLog(line, isCrit ? 'attack-crit' : 'attack-player', { rateKey: isCrit ? 'combat:hit-crit' : 'combat:hit', minIntervalMs: isCrit ? 120 : 180, aggregateKey: isCrit ? 'combat:hit-crit' : 'combat:hit', aggregateWindowMs: 500 });
    }

    (game.enemies || []).slice().forEach(enemy => {
        if (enemy && enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
    });
}

function handlePlayerDefeat(zone, pStats, message, options) {
    let opts = options || {};
    let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
    addBattleFx('playerDown', { color: '#ff6b6b', duration: 600 });
    let expLost = 0;
    if (storyAct && storyAct.specialType === 'forced_defeat') {
        addLog(`🩸 ${storyAct.clearText}`, 'death');
        addLog('🧊 이 패배는 담금질로 기록된다.', 'season-up');
        unlockJournalEntry('act_2');
        if (zone && zone.type === 'act' && zone.id <= 9) markActRewardReady(zone.id);
        if (game.maxZoneId <= zone.id) {
            game.maxZoneId = Math.min(getCurrentSeasonFinalZoneId(), game.maxZoneId + 1);
            triggerMapUnlockReveal(game.maxZoneId);
        }
        game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
        game.killsInZone = 0;
        game.playerHp = getPlayerHpCap(pStats);
        startMoving(false);
        updateStaticUI();
        queueImportantSave(160);
        return;
    }
    game.loopDeaths = Math.max(0, Math.floor(game.loopDeaths || 0)) + 1;
    if (zone && zone.id === OUTSIDE_CHAOS_ZONE_ID) {
        let woodsman = (game.enemies || []).find(e => e && e.isBoss);
        if (woodsman && woodsman.maxHp > 0) {
            let dealtRatio = Math.max(0, Math.min(0.999, 1 - (woodsman.hp / woodsman.maxHp)));
            let score = Math.floor(dealtRatio * 1000000);
            addWoodsmanPendingScore(score);
            maybeUnlockChaosRealmFromWoodsman(woodsman, { log: true, finalize: true });
            addLog(`🪓 나무꾼 전투 정산 대기 점수 +${score} (루프 정산 시 반영)`, 'season-up');
        }
        clearWoodsmanBuildLock();
        game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
        game.killsInZone = 0;
    } else if (zone && zone.id === 'beehive_run' && game.beehive && game.beehive.inRun) {
        addLog(message || "☠️ 벌집 전투에서 패배했습니다. 원정이 즉시 종료됩니다.", "death", { noToast: !!opts.noToast });
        if (typeof exitBeehiveRun === 'function') exitBeehiveRun('', 'death');
        else {
            game.beehive.inRun = false;
            game.beehive.awaitingClear = false;
            game.beehive.pendingChoice = null;
            game.currentZoneId = game.beehive.returnZoneId !== undefined && game.beehive.returnZoneId !== null ? game.beehive.returnZoneId : getAutoProgressZoneId(game.maxZoneId);
            game.beehive.returnZoneId = null;
            game.enemies = [];
            game.encounterPlan = [];
            game.encounterIndex = 0;
            game.runProgress = 0;
            game.killsInZone = 0;
        }
    } else if (zone && zone.id === 'grand_breach_run') {
        let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
        let grand = v.grandRun || {};
        addLog(message || "☠️ 대균열에서 패배했습니다. 균열이 닫히며 추방됩니다.", "death", { noToast: !!opts.noToast });
        v.grandRun = { ...grand, inRun: false, phase: 'failed', timeLeft: 0 };
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
        game.currentZoneId = grand.returnZoneId !== undefined ? grand.returnZoneId : getAutoProgressZoneId(game.maxZoneId);
        game.killsInZone = 0;
    } else if (zone && zone.type === 'meteor') {
        addLog(message || "☠️ 운석 낙하 지점에서 패배했습니다. 운석 지점이 닫힙니다.", "death", { noToast: !!opts.noToast });
        let st = ensureStarWedgeState();
        st.activeMeteorTier = null;
        game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
        game.killsInZone = 0;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
    } else if (zone && zone.type === 'seasonBoss' && game.inTicketBossFight) {
        addLog(message || "☠️ 시즌 보스 도전에 실패했습니다. 액트 1로 되돌아갑니다.", "death", { noToast: !!opts.noToast });
        game.currentZoneId = 0;
        game.killsInZone = 0;
        game.inTicketBossFight = false;
    } else if (zone && zone.type === 'trial') {
        addLog(message || "☠️ 시련 실패! 마을로 귀환합니다.", "death", { noToast: !!opts.noToast });
        game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
        game.killsInZone = 0;
    } else {
        expLost = Math.floor(getExpReq(game.level) * 0.1);
        addLog(message || "☠️ 사망! 경험치 페널티 적용", "death", { noToast: !!opts.noToast });
        game.exp = Math.max(0, game.exp - expLost);
    }
    let damageSummary = buildDeathDamageSummary(3000);
    let ailmentDamageSummary = buildDeathDamageSummary(3000, { ailmentOnly: true });
    let activeAilments = snapshotPlayerAilmentsForDeathLog();
    let primaryEntry = damageSummary[0] || null;
    let primaryElement = primaryEntry ? primaryEntry.ele : normalizeDamageElementKey(opts.fatalElement);
    let reasonText = DEATH_REASON_TEXT[primaryElement] || DEATH_REASON_TEXT.phys;
    game.lastDeathLog = {
        at: Date.now(),
        zoneName: zone && zone.name ? zone.name : '알 수 없는 지역',
        expLost: expLost,
        primaryElement: primaryElement,
        reasonText: reasonText,
        damageSummary: damageSummary,
        ailmentDamageSummary: ailmentDamageSummary,
        activeAilments: activeAilments,
        sourceName: opts.sourceName || ''
    };
    if (game.settings.showDeathNotice !== false) openDeathOverlay(game.lastDeathLog);
    game.playerHp = getPlayerHpCap(pStats);
    startMoving(false);
    updateStaticUI();
    queueImportantSave(160);
}

function getPlayerAilmentResistChance(type, pStats) {
    if (!pStats) return 0;
    let res = 0;
    if (type === 'ignite') res = (pStats.resF || 0) + (pStats.ailResIgnite || 0);
    else if (type === 'chill' || type === 'freeze') res = (pStats.resC || 0) + (pStats.ailResFreeze || 0);
    else if (type === 'shock') res = (pStats.resL || 0) + (pStats.ailResShock || 0);
    else if (type === 'poison') res = (pStats.resChaos || 0) + (pStats.ailResPoison || 0);
    else if (type === 'bleed') res = (pStats.dr || 0) + (pStats.ailResBleed || 0);
    return Math.max(0, Math.min(1.00, (res + (pStats.ailmentResistBonusPct || 0)) / 100));
}

function applyPlayerAilment(type, duration, power, pStats, sourceHitDamage) {
    if (!type || duration <= 0) return;
    if ((type === 'ignite' && pStats.immuneIgnite) || (type === 'chill' && pStats.immuneChill) || (type === 'freeze' && pStats.immuneFreeze) || (type === 'shock' && pStats.immuneShock) || (type === 'bleed' && pStats.immuneBleed)) return;
    if (Math.random() < getPlayerAilmentResistChance(type, pStats)) return;
    game.playerAilments = Array.isArray(game.playerAilments) ? game.playerAilments : [];
    let damageAilment = isDamageAilmentType(type);
    let hitSource = Math.max(0, Math.floor(Number(sourceHitDamage) || 0));
    let existing = game.playerAilments.find(row => row.type === type);
    if (type === 'poison') {
        let maxStacks = Math.max(1, 1 + Math.max(0, Math.floor((pStats && pStats.uniquePoisonExtraStacks) || 0)));
        let poisonRows = game.playerAilments.filter(row => row && row.type === 'poison');
        if (poisonRows.length >= maxStacks) {
            existing = poisonRows.reduce((a, b) => ((a.time || 0) <= (b.time || 0) ? a : b), poisonRows[0]);
        } else {
            existing = null;
        }
    }
    if (existing) {
        existing.time = Math.max(existing.time || 0, duration);
        existing.power = Math.max(existing.power || 0, power || 0.1);
        if (damageAilment) existing.sourceHitDamage = Math.max(getStoredAilmentHitDamage(existing), hitSource);
    } else {
        let row = { type: type, time: duration, power: Math.max(0.1, power || 0.1) };
        if (damageAilment) row.sourceHitDamage = hitSource;
        game.playerAilments.push(row);
    }
}

function tickAilments(pStats, dt) {
    game.playerAilments = Array.isArray(game.playerAilments) ? game.playerAilments : [];
    let next = [];
    game.playerAilments.forEach(ail => {
        ail.time = Math.max(0, (ail.time || 0) - dt);
        let power = Math.max(0.1, ail.power || 0.1);
        if (ail.type === 'ignite') {
            let burn = getPlayerDamageAilmentDps(ail, pStats);
            if (burn > 0) {
                burn = Math.max(1, Math.floor(burn * dt * (1 - Math.max(0, Math.min(0.75, (pStats.resF || 0) / 100))) * getWoodsmanCurseDamageTakenMul()));
                burn = Math.max(0, Math.floor(burn * (1 - Math.max(0, Math.min(0.9, (pStats.dotTakenDamageReducePct || 0) / 100)))));
                burn = Math.max(0, Math.floor(burn * (1 - Math.max(0, Math.min(0.9, (pStats.igniteDamageReducePct || 0) / 100)))));
                game.playerHp -= burn;
                recordIncomingDamage('fire', burn, '점화');
            }
        } else if (ail.type === 'poison') {
            let poison = getPlayerDamageAilmentDps(ail, pStats);
            if (poison > 0) {
                poison = Math.max(1, Math.floor(poison * dt * (1 - Math.max(0, Math.min(0.75, (pStats.resChaos || 0) / 100))) * getWoodsmanCurseDamageTakenMul()));
                poison = Math.max(0, Math.floor(poison * (1 - Math.max(0, Math.min(0.9, (pStats.dotTakenDamageReducePct || 0) / 100)))));
                poison = Math.max(0, Math.floor(poison * (1 - Math.max(0, Math.min(0.9, (pStats.poisonDamageReducePct || 0) / 100)))));
                if (pStats.poisonToHeal) game.playerHp = Math.min(getPlayerHpCap(pStats), game.playerHp + poison);
                else {
                    game.playerHp -= poison;
                    recordIncomingDamage('chaos', poison, '중독');
                }
            }
        } else if (ail.type === 'bleed') {
            let bleed = getPlayerDamageAilmentDps(ail, pStats);
            if (bleed > 0) {
                bleed = Math.max(1, Math.floor(bleed * dt * (1 - Math.max(0, Math.min(0.75, (pStats.dr || 0) / 100))) * getWoodsmanCurseDamageTakenMul()));
                bleed = Math.max(0, Math.floor(bleed * (1 - Math.max(0, Math.min(0.9, (pStats.dotTakenDamageReducePct || 0) / 100)))));
                bleed = Math.max(0, Math.floor(bleed * (1 - Math.max(0, Math.min(0.9, (pStats.bleedDamageReducePct || 0) / 100)))));
                game.playerHp -= bleed;
                recordIncomingDamage('phys', bleed, '출혈');
            }
        } else if (ail.type === 'chill') {
            // chill handled via aspd modifier in core loop
        } else if (ail.type === 'shock') {
            // shock handled via dr modifier in core loop
        } else if (ail.type === 'freeze') {
            // freeze duration only
        }
        if (ail.time > 0) next.push(ail);
    });
    game.playerAilments = next;
}

function performMonsterAttacks(pStats) {
    let zone = getZone(game.currentZoneId);
    let abyssScale = getAbyssMonsterScales(zone);
    if (!Number.isFinite(game.playerEnergyShield)) game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerEnergyShield = Math.max(0, Math.min(Math.floor(Number(game.playerEnergyShield) || 0), Math.floor(pStats.energyShield || 0)));
    let aliveCount = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
    let crowdPenalty = Math.max(0.34, 1 - Math.max(0, aliveCount - 1) * 0.055);
    for (let enemy of (game.enemies || [])) {
        if (enemy.hp <= 0) continue;
        let ailMap = {};
        (enemy.ailments || []).forEach(ail => { if ((ail.time || 0) > 0) ailMap[ail.type] = Math.max(ailMap[ail.type] || 0, ail.power || 0); });
        if (ailMap.freeze) continue;
        if (enemy.forcedDefeatBoss) {
            let now = performance.now();
            if (now >= (enemy.nextForcedRegenAt || 0)) {
                enemy.hp = enemy.maxHp;
                enemy.nextForcedRegenAt = now + 5000;
                if (game.settings.showCombatLog) addLog('✂️ 정원사의 불멸성이 상처를 되감아 풀피로 회복했다.', 'attack-monster');
            }
            if (now >= (enemy.forcedDoomAt || 0)) {
                enemy.forcedDoomAt = now + 10000;
                game.playerHp = 0;
                recordIncomingDamage('chaos', pStats.maxHp, '정원사의 가지치기');
                handlePlayerDefeat(zone, pStats, '☠️ 정원사의 가지치기가 당신의 생명력을 절단했습니다.', { fatalElement: 'chaos', sourceName: '정원사' });
                return;
            }
        }
        if ((enemy.regenRate || 0) > 0 && enemy.hp < (enemy.maxHp || enemy.hp)) {
            let suppress = Math.max(0, Math.min(95, enemy.regenSuppressPct || 0));
            let curseFx = getEnemyConditionDebuffFactor(enemy);
            let effectiveRegenRate = Math.max(0, enemy.regenRate * (1 - suppress / 100) * (curseFx.enemyRegenRateMul || 1));
            let maxHp = Math.max(1, enemy.maxHp || enemy.hp || 1);
            let rawRegen = Math.max(0, maxHp * effectiveRegenRate);
            let wholeRegen = Math.floor(rawRegen);
            let fractionalRegen = rawRegen - wholeRegen;
            enemy.regenBank = Math.max(0, Number(enemy.regenBank) || 0);
            if (fractionalRegen > 0) {
                let storedFraction = Math.max(0.1, Math.round(fractionalRegen * 10) / 10);
                enemy.regenBank = Math.round((enemy.regenBank + storedFraction) * 10) / 10;
            }
            if (enemy.regenBank >= 1) {
                wholeRegen += Math.floor(enemy.regenBank);
                enemy.regenBank = Math.round((enemy.regenBank - Math.floor(enemy.regenBank)) * 10) / 10;
            }
            if (wholeRegen > 0) enemy.hp = Math.min(maxHp, enemy.hp + wholeRegen);
        }
        enemy.recentHitsTimer = Math.max(0, (enemy.recentHitsTimer || 0) - 0.1);
        if (enemy.recentHitsTimer <= 0) enemy.recentHitsTaken = Math.max(0, (enemy.recentHitsTaken || 0) - 1);
        let seasonDepth = Math.max(0, (game.season || 1) - 1);
        let tierPressure = clampNumber(((zone.tier || 1) - 1) / 10, 0, 1);
        const monsterBaseAttackSpeedMul = 1.10;
        const monsterBaseDamageMul = 1.15;
        let seasonAtkScale = 1 + seasonDepth * (0.012 + (tierPressure * 0.018));
        let curseDebuffs = (game.enemyConditionDebuffs && game.enemyConditionDebuffs[enemy.id]) ? game.enemyConditionDebuffs[enemy.id] : [];
        let curseSlow = 0;
        let enemyDmgMul = 1;
        curseDebuffs.forEach(deb => { curseSlow += (getConditionGemStatDelta(deb.name, 'curse').enemyAspdSlow || 0); });
        curseDebuffs.forEach(deb => { enemyDmgMul *= (getConditionGemStatDelta(deb.name, 'curse').enemyDmgMul || 1); });
        let chillSlow = ailMap.chill ? Math.min(0.45, 0.12 + ailMap.chill * 0.14) : 0;
        chillSlow *= Math.max(0, 1 - Math.max(0, Math.min(0.95, (pStats.chillEffectReducePct || 0) / 100))); 
        chillSlow = Math.min(0.65, chillSlow + curseSlow);
        let atkRate = (0.26 + zone.tier * 0.013) * monsterBaseAttackSpeedMul * seasonAtkScale * (enemy.isElite || enemy.isBoss ? 1.16 : 1) * (enemy.atkMul || 1) * (enemy.attackSpeedVar || 1) * 1.03 * (1 - chillSlow);
        if (!Number.isFinite(atkRate) || atkRate <= 0) atkRate = 0.12;
        if (!Number.isFinite(enemy.attackTimer) || enemy.attackTimer < 0) enemy.attackTimer = 0;
        enemy.attackTimer += 0.1 * atkRate;
        while (enemy.attackTimer >= 1) {
            if (zone.type === 'outsideChaos') {
                enemy.nextCurseAt = Number.isFinite(enemy.nextCurseAt) ? enemy.nextCurseAt : 0;
                if (Date.now() >= enemy.nextCurseAt) {
                    enemy.nextCurseAt = Date.now() + 6500;
                    let curseType = rndChoice(['ignite','chill','shock','poison','bleed']);
                    applyPlayerAilment(curseType, 4, 0.18, pStats);
                    addLog(`☠️ 알 수 없는 권능: ${curseType === 'ignite' ? '점화' : curseType === 'chill' ? '냉각' : curseType === 'shock' ? '감전' : curseType === 'poison' ? '중독' : '출혈'}`, 'attack-monster', { noToast: true });
                }
            }
            enemy.attackTimer -= 1;
            let seasonDmgScale = 1 + seasonDepth * (0.05 + (tierPressure * 0.07));
            let shockAmp = ailMap.shock ? Math.min(0.35, 0.08 + ailMap.shock * 0.12) : 0;
            shockAmp *= Math.max(0, 1 - Math.max(0, Math.min(0.95, (pStats.shockEffectReducePct || 0) / 100)));
            let dmg = Math.floor((2.4 + zone.tier * 3.35) * monsterBaseDamageMul * seasonDmgScale * (1 - shockAmp));
            dmg = Math.floor(dmg * enemyDmgMul * (enemy.damageMul || 1));
            if (zone.type === 'act' && zone.id <= 1 && (game.season || 1) >= 3) dmg = Math.floor(dmg * 0.58);
            if (enemy.isElite) dmg = Math.floor(dmg * 1.28);
            if (enemy.isBoss) dmg = Math.floor(dmg * (1.14 + zone.tier * 0.16));
            if (!enemy.isBoss) dmg = Math.floor(dmg * crowdPenalty);
            dmg = Math.floor(dmg * (abyssScale.dmgMul || 1) * (abyssScale.playerTakenMul || 1) * (enemy.isBoss ? (abyssScale.bossMul || 1) : 1));
            let physicalPortion = Math.floor(dmg * 0.5);
            let elementalPortion = Math.max(0, dmg - physicalPortion);
            if (zone.type === 'outsideChaos' && enemy.maxHp > 0) {
                let hpRatio = enemy.hp / enemy.maxHp;
                let phase = Math.max(0, Math.floor((1 - hpRatio) / 0.05));
                let cycle = ['phys','fire','cold','light','chaos'];
                enemy.ele = cycle[phase % cycle.length];
                enemy.atkMul = 1 + Math.pow(1 - hpRatio, 1.4) * 3.2;
                enemy.attackSpeedVar = (1 + Math.pow(1 - hpRatio, 1.2) * 1.8) * 1.5;
                enemy.penetration = 8 + Math.floor((1 - hpRatio) * 28);
                enemy.dr = 10 + Math.floor((1 - hpRatio) * 40);
            }
            if (enemy.ele === 'phys') {
                physicalPortion = dmg;
                elementalPortion = 0;
            }
            let elementalRes = 0;
            if (enemy.ele === 'fire') elementalRes = pStats.resF;
            else if (enemy.ele === 'cold') elementalRes = pStats.resC;
            else if (enemy.ele === 'light') elementalRes = pStats.resL;
            else if (enemy.ele === 'chaos') elementalRes = pStats.resChaos;
            elementalRes = Math.max(-60, elementalRes - (enemy.penetration || 0));
            let mitigatedElemental = Math.max(0, Math.floor(elementalPortion * (1 - (elementalRes / 100))));
            let physRes = Math.max(-60, (pStats.dr + (pStats.armor / (pStats.armor + Math.max(1, physicalPortion) * 10)) * 100) - (enemy.penetration || 0));
            let mitigatedPhysical = Math.max(0, Math.floor(physicalPortion * (1 - (physRes / 100))));
            let damageBreakdown = [];
            if (mitigatedPhysical > 0) damageBreakdown.push({ ele: 'phys', amount: mitigatedPhysical });
            if (mitigatedElemental > 0) damageBreakdown.push({ ele: enemy.ele, amount: mitigatedElemental });
            if (pStats.uniqueBleedBlockHelm) {
                damageBreakdown = damageBreakdown.flatMap(row => {
                    if (row.ele !== 'phys' || row.amount <= 0) return [row];
                    let chaosPart = Math.max(0, Math.floor(row.amount * 0.15));
                    let physPart = Math.max(0, row.amount - chaosPart);
                    let out = [];
                    if (physPart > 0) out.push({ ele: 'phys', amount: physPart });
                    if (chaosPart > 0) out.push({ ele: 'chaos', amount: chaosPart });
                    return out;
                });
            }
            if (damageBreakdown.length === 0) damageBreakdown.push({ ele: enemy.ele === 'phys' ? 'phys' : enemy.ele, amount: 1 });
            let sumBreakdown = () => damageBreakdown.reduce((sum, row) => sum + Math.max(0, Math.floor(row.amount || 0)), 0);
            let scaleBreakdown = (mul) => {
                damageBreakdown = damageBreakdown.map(row => ({ ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * mul)) })).filter(row => row.amount > 0);
                if (damageBreakdown.length === 0) damageBreakdown.push({ ele: enemy.ele === 'phys' ? 'phys' : enemy.ele, amount: 1 });
            };
            dmg = Math.max(1, sumBreakdown());
            if ((enemy.critChance || 0) > 0 && Math.random() < (enemy.critChance / 100)) {
                scaleBreakdown(enemy.critDamageMul || 1.55);
                dmg = Math.max(1, sumBreakdown());
            }
            if (enemy.hybridElement && Math.random() < 0.35) {
                let hybridRes = enemy.hybridElement === 'fire' ? pStats.resF : enemy.hybridElement === 'cold' ? pStats.resC : enemy.hybridElement === 'light' ? pStats.resL : pStats.resChaos;
                hybridRes = Math.max(-60, hybridRes - ((enemy.penetration || 0) * 0.7));
                let hybrid = Math.max(0, Math.floor(dmg * 0.32 * (1 - (hybridRes / 100))));
                if (hybrid > 0) damageBreakdown.push({ ele: normalizeDamageElementKey(enemy.hybridElement), amount: hybrid });
                dmg = Math.max(1, sumBreakdown());
            }
            dmg = Math.max(1, Math.floor(dmg * getWoodsmanCurseDamageTakenMul() * Math.max(0, Number(pStats.warriorTakenDamageMultiplier) || 1) * Math.max(0, Number(pStats.genericTakenDamageMultiplier) || 1)));
            if (enemy.isBoss) dmg = Math.max(1, Math.floor(dmg * Math.max(0, Number(pStats.bossTakenDamageMultiplier) || 1)));
            if (pStats.uniqueGuardianArmor) {
                let less = Math.max(0, Math.min(95, Number(pStats.uniqueGuardianArmor.takenLessPct || 0)));
                dmg = Math.max(1, Math.floor(dmg * (1 - less / 100)));
                if (enemy.isBoss) {
                    let bossLess = Math.max(0, Math.min(95, Number(pStats.uniqueGuardianArmor.bossTakenLessPct || 0)));
                    dmg = Math.max(1, Math.floor(dmg * (1 - bossLess / 100)));
                }
            }
            if (game.ascendClass === 'gladiator' && hasKeystone('g5') && game.gladiatorSwiftGuardReady) {
                dmg = Math.max(1, Math.floor(dmg * Math.max(0, Number(pStats.swiftOpeningTakenMultiplier) || 0.70)));
                game.gladiatorSwiftGuardReady = false;
            }
            let aliveEnemies = (game.enemies || []).filter(e => e && e.hp > 0).length;
            if (aliveEnemies >= 2) dmg = Math.max(1, Math.floor(dmg * (1 - Math.max(0, Math.min(0.9, (pStats.takenDamageReduceWhen2EnemiesPct || 0) / 100)))));
            else if (aliveEnemies === 1) dmg = Math.max(1, Math.floor(dmg * (1 - Math.max(0, Math.min(0.9, (pStats.takenDamageReduceWhen1EnemyPct || 0) / 100)))));
            if (enemy.ele === 'phys' && Math.random() * 100 < Math.max(0, pStats.evadeChance || 0)) {
                if (game.settings.showCombatLog) addLog(`🌀 회피 성공`, "loot-magic");
                continue;
            }
            if (Math.random() * 100 < Math.max(0, Math.min(95, pStats.guardianBlockChance || 0))) {
                if (game.settings.showCombatLog) addLog(`🛡️ 절대 수호: 피해 무효`, "loot-magic");
                continue;
            }
            if ((enemy.ailmentChance || 0) > 0 && Math.random() < enemy.ailmentChance) {
                let ail = enemy.ele === 'fire' ? 'ignite' : enemy.ele === 'cold' ? 'chill' : enemy.ele === 'light' ? 'shock' : 'poison';
                let hitRatio = Math.max(0.001, Math.min(0.35, dmg / Math.max(1, pStats.maxHp || 1)));
                let damageAilment = isDamageAilmentType(ail);
                let ailPower = damageAilment
                    ? Math.max(0.1, Math.min(1.5, Math.sqrt(Math.max(1, dmg)) * 0.01))
                    : Math.max(0.1, Math.min(1.5, (Math.sqrt(Math.max(1, dmg)) * 0.01) + (hitRatio * 1.8)));
                applyPlayerAilment(ail, enemy.isBoss ? 5 : 3, ailPower, pStats, dmg);
                if (game.settings.showCombatLog) addLog(`☣️ 상태이상: ${ail === 'ignite' ? '점화' : ail === 'chill' ? '냉각' : ail === 'shock' ? '감전' : '중독'} (${enemy.isBoss ? 5 : 3}초)`, 'attack-monster');
            }

            let remaining = dmg;
            game.playerEnergyShield = Math.max(0, Math.floor(Number(game.playerEnergyShield) || 0));
            if (remaining > 0 && game.playerEnergyShield > 0) {
                let absorbed = Math.min(game.playerEnergyShield, remaining);
                game.playerEnergyShield -= absorbed;
                remaining -= absorbed;
            }
            if (remaining > 0 && game.playerUniqueGuard && Date.now() < (game.playerUniqueGuard.expiresAt || 0) && (game.playerUniqueGuard.amount || 0) > 0) {
                let absorbed = Math.min(remaining, Math.floor(game.playerUniqueGuard.amount || 0));
                game.playerUniqueGuard.amount = Math.max(0, Math.floor((game.playerUniqueGuard.amount || 0) - absorbed));
                remaining -= absorbed;
            }
            game.playerHp = Math.floor(game.playerHp - remaining);
            if (remaining > 0 && game.ascendClass === 'guardian' && hasKeystone('gd6')) {
                let stacks = Math.max(0, Math.min(5, Math.floor(game.guardianEnduranceStacks || 0))) + 1;
                game.guardianEnduranceExpiresAt = Date.now() + 4000;
                if (stacks >= 5) {
                    let reflect = Math.max(1, Math.floor((pStats.guardianReflectDamage || 1) + remaining));
                    applyDamageToEnemyResource(enemy, reflect);
                    addBattleFx('hit', { enemyId: enemy.id, color: getElementColor('phys'), damage: reflect, duration: 260, element: 'phys' });
                    stacks = 2;
                }
                game.guardianEnduranceStacks = Math.max(0, Math.min(5, stacks));
            }
            if (remaining > 0 && game.ascendClass === 'warrior' && hasKeystone('w5')) {
                let now = Date.now();
                let active = (game.warriorRageExpiresAt || 0) > now;
                let stacks = active ? Math.max(0, Math.min(5, Math.floor(game.warriorRageStacks || 0))) : 0;
                game.warriorRageStacks = Math.min(5, stacks + 1);
                game.warriorRageExpiresAt = now + 5000;
            }
            if ((enemy.leechPct || 0) > 0 && remaining > 0) {
                let leeched = Math.max(1, Math.floor(remaining * (enemy.leechPct || 0) / 100));
                if ((enemy.energyShield || 0) < (enemy.maxEnergyShield || 0)) enemy.energyShield = Math.min(enemy.maxEnergyShield || 0, (enemy.energyShield || 0) + leeched);
                else enemy.hp = Math.min(enemy.maxHp || enemy.hp || 1, (enemy.hp || 0) + leeched);
            }
            if ((enemy.doubleStrikeChance || 0) > 0 && Math.random() * 100 < enemy.doubleStrikeChance) enemy.attackTimer += 1;
            if ((pStats.delayedRegenFromTakenDamage || 0) > 0 && remaining > 0) {
                let recover = Math.max(0, remaining * pStats.delayedRegenFromTakenDamage);
                game.delayedGuardHealPool = Math.max(0, (game.delayedGuardHealPool || 0) + recover);
            }
            game.playerEsLastHitAt = Date.now();
            game.playerLastHitAt = Date.now();
            if (game.ascendClass === 'assassin' && hasKeystone('a2')) game.assassinBlurred = false;
            let topDamageEntry = damageBreakdown
                .filter(row => row && row.amount > 0)
                .sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] || { ele: enemy.ele === 'phys' ? 'phys' : (enemy.ele || 'phys'), amount: dmg };
            damageBreakdown.forEach(row => recordIncomingDamage(row.ele, row.amount, enemy.name));
            addBattleFx('playerHit', { enemyId: enemy.id, color: getElementColor(topDamageEntry.ele), damage: dmg, duration: 220 });
            if (game.settings.showCombatLog) {
                let breakdownText = damageBreakdown
                    .filter(row => row.amount > 0)
                    .sort((a, b) => b.amount - a.amount)
                    .map(row => `${getDamageElementLabel(row.ele)} ${Math.floor(row.amount)}`)
                    .join(' / ');
                addLog(`🩸 [${getDamageElementLabel(topDamageEntry.ele)}] 피격 (${dmg} 피해 · ${breakdownText})`, "attack-monster");
            }
            if (game.playerHp <= 0) {
                handlePlayerDefeat(zone, pStats, null, { fatalElement: topDamageEntry.ele, sourceName: enemy.name });
                return;
            }
        }
    }
}

function applyTrialTrapTick(pStats) {
    let zone = getZone(game.currentZoneId);
    if (!zone || zone.type !== 'trial' || game.moveTimer > 0) return;
    if (game.runProgress >= 100 && game.encounterIndex >= (game.encounterPlan || []).length && (game.enemies || []).length === 0) return;
    trialHazardTimer -= 0.1;
    if (trialHazardTimer > 0) return;
    trialHazardTimer = Math.max(2.2, 4.2 - zone.tier * 0.12) + Math.random() * 1.4;
    let trapDamage = Math.floor((pStats.maxHp * (0.035 + zone.tier * 0.005)) + 10 + zone.tier * 3);
    trapDamage = Math.max(10, Math.floor(trapDamage * (1 - (pStats.dr * 0.45 / 100))));
    let remaining = trapDamage;
    game.playerEnergyShield = Math.max(0, Math.floor(Number(game.playerEnergyShield) || 0));
    if (remaining > 0 && game.playerEnergyShield > 0) {
        let absorbed = Math.min(game.playerEnergyShield, remaining);
        game.playerEnergyShield -= absorbed;
        remaining -= absorbed;
    }
    game.playerHp = Math.floor(game.playerHp - remaining);
    game.playerEsLastHitAt = Date.now();
    recordIncomingDamage('phys', trapDamage, '시련 함정');
    addBattleFx('trialTrap', { color: '#ffd36b', duration: 460 });
    addLog(`⚠️ 시련 함정 발동 [${getDamageElementLabel('phys')}] (${trapDamage} 피해)`, 'attack-monster', { noToast: true });
    if (game.playerHp <= 0) {
        handlePlayerDefeat(zone, pStats, "☠️ 시련 함정에 쓰러졌습니다. 마을로 귀환합니다.", { fatalElement: 'phys', sourceName: '시련 함정', noToast: true });
    }
}

function ensurePendingLoopHeroSelectionPrompt() {
    if (!game || !game.pendingLoopHeroSelection) return false;
    if (isLoopHeroSelectOpen() || isStartupOverlayOpen() || isLoadingOverlayOpen() || isDeathOverlayOpen()) return false;
    let previousHeroId = game.selectedHeroId || 'hero1';
    openLoopHeroSelection((heroId) => {
        if (heroId !== previousHeroId) addLog(`🧬 루프 전환으로 ${getHeroSelectionDef(heroId).label} 캐릭터를 선택했습니다.`, 'season-up');
        game.pendingLoopHeroSelection = false;
        saveGame({ skipCloudSync: true });
        if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave('루프 캐릭터 선택 완료');
        startMoving(true);
        switchTab('tab-character');
    }, {
        kicker: 'Loop Resume',
        title: '중단된 루프의 재능 선택',
        body: '저장된 루프 진행을 이어가기 전에 이번 루프 재능을 선택하세요.'
    });
    return true;
}

function playLoopRewriteEffect() {
    let overlay = document.getElementById('loop-rewrite-overlay');
    if (!overlay) return;
    overlay.innerHTML = `<div class="rewrite-card"><div class="rewrite-title">세계가 되감기는 중…</div><div class="rewrite-sub">흔적을 거슬러, 이전 루프로 복귀합니다.</div></div>`;
    document.body.classList.add('loop-rewrite-active');
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
        document.body.classList.remove('loop-rewrite-active');
    }, 1950);
}

function markLoopSpecialBossKill(bossKey) {
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [] };
    game.loopProgressCurrent.specialBosses = Array.isArray(game.loopProgressCurrent.specialBosses) ? game.loopProgressCurrent.specialBosses : [];
    if (!game.loopProgressCurrent.specialBosses.includes(bossKey)) game.loopProgressCurrent.specialBosses.push(bossKey);
}


function addWoodsmanPendingScore(scoreGain) {
    let score = Math.max(0, Math.floor(scoreGain || 0));
    if (score <= 0) return;
    // 나무꾼 점수는 누적합이 아니라 '최고 기록' 기반으로 관리
    game.woodsmanPendingScore = Math.max(Math.floor(game.woodsmanPendingScore || 0), score);
    game.woodsmanLifetimeScore = Math.max(Math.floor(game.woodsmanLifetimeScore || 0), score);
}

const WOODSMAN_ENTRANCE_DELAY_SECONDS = 3;

function finishWoodsmanEntrance() {
    if (!game.woodsmanEntrancePending) return false;
    game.woodsmanEntrancePending = false;
    game.currentZoneId = OUTSIDE_CHAOS_ZONE_ID;
    let zone = getZone(OUTSIDE_CHAOS_ZONE_ID);
    if (!zone || zone.type !== 'outsideChaos') return false;
    game.moveTimer = 0;
    game.moveTotalTime = 0;
    game.runProgress = 0;
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.enemies = [];
    game.inEncounter = true;
    startWoodsmanCurse();
    addLog('☠️ 하늘이 갈라지고 도끼날의 그림자가 전장을 뒤덮습니다.', 'loot-unique');
    game.enemies = [createEnemy(zone, { at: 0, count: 1, boss: true }, 0)];
    updateStaticUI();
    return true;
}


function enterOutsideChaos() {
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if ((game.season || 1) < 10) return addLog('혼돈 밖은 루프 10 이후 개방됩니다.', 'attack-monster');
    if (!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared)) return addLog(`${getLoopAbyssRequirementText(game.season || 1)} 조건을 먼저 달성해야 합니다.`, 'attack-monster');
    game.woodsmanBuildSnapshot = snapshotWoodsmanBuildState();
    game.woodsmanBuildLock = true;
    game.currentZoneId = OUTSIDE_CHAOS_ZONE_ID;
    game.killsInZone = 0;
    game.runProgress = 0;
    game.moveTotalTime = WOODSMAN_ENTRANCE_DELAY_SECONDS;
    game.moveTimer = WOODSMAN_ENTRANCE_DELAY_SECONDS;
    game.isTownReturning = false;
    game.combatHalted = false;
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.enemies = [];
    game.inEncounter = false;
    game.woodsmanEntrancePending = true;
    resetWoodsmanCurse();
    addLog('☠️ 금단의 경계 너머로 발을 들였습니다. 혼돈이 몇 초간 숨을 고릅니다.', 'loot-unique');
    updateStaticUI();
}

function awardLoopProgressPoints() {
    game.loopProgressBase = game.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [] };
    let baseDepth = Math.max(20, Math.floor(game.loopProgressBase.abyssEndlessDepth || 20));
    let unlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : [];
    let highestUnlocked = unlockedDepths.length > 0 ? Math.max(...unlockedDepths) : Math.max(20, Math.floor(game.abyssEndlessDepth || 20));
    let nowDepth = Math.max(20, highestUnlocked >= 21 ? (highestUnlocked - 1) : highestUnlocked);
    let depthGain = Math.max(0, nowDepth - baseDepth);
    let baseLab = Math.max(1, Math.floor(game.loopProgressBase.labyrinthUnlockedMaxFloor || 1));
    let nowLab = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    let labGain = Math.max(0, nowLab - baseLab);
    let baseBosses = new Set(Array.isArray(game.loopProgressBase.specialBosses) ? game.loopProgressBase.specialBosses : []);
    let newBosses = (Array.isArray(game.loopProgressCurrent.specialBosses) ? game.loopProgressCurrent.specialBosses : []).filter(id => !baseBosses.has(id));
    let bonus = (depthGain * 2) + Math.floor(labGain / 5) + (newBosses.length * 3);
    let woodsmanScore = Math.max(0, Math.floor(game.woodsmanPendingScore || 0));
    let woodsmanSettled = Math.max(0, Math.floor(game.woodsmanSettledScore || 0));
    let woodsmanDelta = Math.max(0, woodsmanScore - woodsmanSettled);
    let woodsmanGain = Math.floor(Math.sqrt(woodsmanDelta) / 25);
    bonus += woodsmanGain;
    if (bonus > 0) game.loopDeepPoints = Math.max(0, Math.floor(game.loopDeepPoints || 0)) + bonus;
    game.loopProgressBase = { abyssEndlessDepth: nowDepth, labyrinthUnlockedMaxFloor: nowLab, specialBosses: Array.from(new Set([...(Array.isArray(game.loopProgressBase.specialBosses) ? game.loopProgressBase.specialBosses : []), ...newBosses])) };
    game.loopProgressCurrent = { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0 };
    game.woodsmanSettledScore = Math.max(woodsmanSettled, woodsmanScore);
    game.woodsmanPendingScore = game.woodsmanSettledScore;
    return { bonus, depthGain, labGain, bossGain: newBosses.length, woodsmanGain: woodsmanGain, woodsmanScore: woodsmanScore, woodsmanDelta: woodsmanDelta };
}

function triggerSeasonReset() {
    if (isRewardOpen()) closeRewardOverlay();
    if (game.woodsmanBuildLock) {
        clearWoodsmanBuildLock();
        addLog('☠️ 혼돈 밖 전투를 중단하고 루프를 진행합니다. 세팅 잠금이 해제되었습니다.', 'season-up');
    }
    game.pendingLoopDecision = false;
    let codexReveal = {};
    Object.keys(game.uniqueCodex || {}).forEach(key => {
        if (!key || !game.uniqueCodex[key]) return;
        let parts = key.split('|');
        codexReveal[key] = { revealed: true, slot: parts[0] || '', name: parts[1] || '' };
    });
    playLoopRewriteEffect();
    let previousHeroId = game.selectedHeroId || 'hero1';
    let prevStarWedge = (game.starWedge && typeof game.starWedge === 'object') ? game.starWedge : {};
    let preservedEternalWedges = Array.isArray(prevStarWedge.wedges)
        ? prevStarWedge.wedges.filter(w => w && w.eternal).map(w => JSON.parse(JSON.stringify(w)))
        : [];
    let preservedConstellationBuff = (prevStarWedge.constellationBuff && prevStarWedge.constellationBuff.permanent)
        ? JSON.parse(JSON.stringify(prevStarWedge.constellationBuff))
        : null;
    let prevLabMax = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    let preservedChaosRealm = JSON.parse(JSON.stringify(ensureChaosRealmState()));
    let loopDeepBeforeReset = Math.max(0, Math.floor(game.loopDeepPoints || 0));
    let loopReward = awardLoopProgressPoints();
    let loopDeepExpectedAfterSettle = Math.max(0, Math.floor(game.loopDeepPoints || 0));
    game.season++;
    if (typeof resetExpertiseLoopCaps === 'function') resetExpertiseLoopCaps();
    if (typeof grantLoopBaseExpertExp === 'function') grantLoopBaseExpertExp();
    game.loopCount = Math.max(0, Math.floor(game.loopCount || 0)) + 1;
    game.seasonPoints++;
    if (game.loopCount === 2 && typeof queueTutorialNotice === 'function') {
        queueTutorialNotice('unlock_spore_crafting', '홀씨 제작 해금', '루프 2 달성! 이제 액트/혼돈 몬스터가 화염/냉기/번개 홀씨를 떨어뜨립니다.\n제작 탭에서 오브 사용 시 홀씨 태그를 지정할 수 있습니다.', 'tab-items');
    }
    addLog(`🧬 심화 루프 정산: +${loopReward.bonus}pt (혼돈 심화 +${loopReward.depthGain}, 미궁 +${loopReward.labGain}, 특수보스 +${loopReward.bossGain}, 나무꾼 +${loopReward.woodsmanGain || 0})`, loopReward.bonus > 0 ? 'season-up' : 'attack-monster');
    game.level = 1;
    game.exp = 0;
    game.killsInZone = 0;
    game.loopDeaths = 0;
    game.loopKills = 0;
    game.woodsmanSimulatorSeenLoop = false;
    game.currentZoneId = 0;
    game.maxZoneId = 0;
    game.combatHalted = false;
    game.passivePoints = 0;
    game.passives = ['n0'];
    game.skills = ['기본 공격'];
    game.activeSkill = '기본 공격';
    game.gemData = { '기본 공격': { level: 1, exp: 0 } };
    game.skyGemEnhancements = {};
    game.supports = [];
    game.equippedSupports = [];
    game.supportGemData = {};
    game.conditionGemUnlocked = false;
    game.conditionGemPool = [];
    game.pendingConditionGemChoices = null;
    game.skillAutoRules = [];
    game.conditionGemCooldowns = {};
    game.enemyConditionDebuffs = {};
    game.playerConditionBuffs = [];
    game.lastConditionGemCast = null;
    game.playerCastDelayUntil = 0;
    game.dotFxThrottle = {};
    game.sealedSkills = [];
    game.sealedSupports = [];
    game.resonancePower = 10;
    game.completedTrials = [];
    game.unlockedTrials = [];
    game.ascendNodes = [];
    game.ascendPoints = 0;
    game.ascendRank = 0;
    game.ascendClass = null;
    game.inventory = [];
    game.equipment = { ...defaultGame.equipment };
    game.currencies = { ...defaultGame.currencies };
    game.labyrinthFloor = 1;
    game.labyrinthUnlockedMaxFloor = Math.max(1, Math.floor(prevLabMax || 1));
    game.jewelInventory = [];
    game.jewelSlots = [null, null];
    game.jewelSlotAmplify = [0, 0];
    game.talismanUnlocked = false;
    game.talismanBoardUnlock = Math.max(3, Math.floor(defaultGame.talismanBoardUnlock || 3));
    game.talismanUnlockedCells = [];
    game.talismanInventory = [];
    game.talismanBoard = [];
    game.talismanPlacements = {};
    game.talismanSelectedId = null;
    game.talismanUnseal = null;
    game.talismanUnlockPickMode = false;
    game.abyssPassivePoints = 0;
    game.abyssPassives = { power: 0, tenacity: 0, horde: 0, frailty: 0, weakness: 0, resistance: 0, elite: 0, coreRaid: 0, arrogance: 0, magnifier: 0 };
    game.abyssClearedDepths = [];
    game.claimableActRewards = [];
    game.claimedActRewards = [];
    game.actRewardBonuses = [];
    game.seasonChaseUniqueDropped = false;
    game.uniqueCodex = codexReveal;
    game.starWedge = JSON.parse(JSON.stringify(defaultGame.starWedge));
    game.starWedge.wedges = preservedEternalWedges;
    game.starWedge.constellationBuff = preservedConstellationBuff;
    game.unlocks = { ...defaultGame.unlocks };
    game.noti = { ...defaultGame.noti };
    game.itemSubtab = 'item-tab-equip';
    game.skillSubtab = 'skill-tab-equip';
    game.mapSubtab = 'map-tab-zones';
    game.chaosRealm = preservedChaosRealm;
    game.gemEnhanceUnlocked = false;
    game.inTicketBossFight = false;
    game.talismanUnlocked = false;
    game.talismanBoardUnlock = 3;
    game.talismanInventory = [];
    game.talismanBoard = [];
    game.talismanPlacements = {};
    game.talismanSelectedId = null;
    game.talismanUnseal = null;
    game.talismanUnlockPickMode = false;
    if (game.settings) {
        game.settings.autoSalvageEnabled = false;
        game.settings.itemFilterEnabled = false;
    }
    game.loopDeepPoints = Math.max(loopDeepBeforeReset, loopDeepExpectedAfterSettle);
    grantCodexLegacyStarterUniques();
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    progressStallTicks = 0;
    clearCraftSelection();
    applySeasonContentProgression({ silent: false });
    assignStarWedgeSockets();
    recalculateStarWedgeMutations();
    calculateReachableNodes();
    refreshPassiveVisibility();
    game.playerHp = getPlayerHpCap(getPlayerStats());
    ensureActJournalCompletionForLoop({ silent: false });
    addLog("🌟 [루프 포인트 1점] 획득. 밝혀낸 성좌 지형은 유지됩니다.", "season-up");
    checkUnlocks();
    game.pendingLoopHeroSelection = true;
    saveGame({ skipCloudSync: true });
    if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave('루프 진행');
    openLoopHeroSelection((heroId) => {
        if (heroId !== previousHeroId) addLog(`🧬 루프 전환으로 ${getHeroSelectionDef(heroId).label} 캐릭터를 선택했습니다.`, 'season-up');
        game.pendingLoopHeroSelection = false;
        saveGame({ skipCloudSync: true });
        if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave('루프 캐릭터 선택 완료');
        startMoving(true);
        switchTab('tab-character');
    });
}

function chooseLoopAdvance(shouldLoop) {
    if (!game.pendingLoopDecision) return;
    if (shouldLoop) {
        game.pendingLoopDecision = false;
        triggerSeasonReset();
        return;
    }
    game.pendingLoopDecision = false;
    addLog(`♾️ 루프를 보류하고 혼돈 심화 등반을 이어갑니다. (혼돈 ${Math.max(21, Math.floor((game.abyssEndlessDepth || 20) + 1))}부터 시작)`, 'season-up');
    enterNextEndlessChaosDepth();
}


safeExposeGlobals({ getPlayerStats, getSkillTargets, createEnemy, generateEncounterPlan, startEncounterRun, startMoving, returnToTown, ensureEncounterRun, advanceMapProgress, grantExpAndGem, rollLootForEnemy, handleEnemyDeath, finishEncounterRun, performPlayerAttack, handlePlayerDefeat, applyPlayerAilment, tickAilments, tickPlayerLeech, addPlayerLeechInstance, applyInstantPlayerLeech, getLeechCaps, getLeechOutstandingTotal, performMonsterAttacks, applyTrialTrapTick, ensurePendingLoopHeroSelectionPrompt, triggerSeasonReset, chooseLoopAdvance, markLoopSpecialBossKill, addWoodsmanPendingScore, enterOutsideChaos, grantChaosRealmFloorBonus, maybeUnlockChaosRealmFromWoodsman, isDamageAilmentType, getStoredAilmentHitDamage, getDamageAilmentBaseDpsFromHit, getEnemyDamageAilmentDps, getPlayerDamageAilmentDps, getPlayerDamageAilmentFallbackDps, getUniqueEffectImplementationReport });
