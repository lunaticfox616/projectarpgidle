// TODO: phased extraction target. Kept for load-order compatibility in phase 1.

const LEECH_SOFTCAP_START = 1.2;
const LEECH_SOFTCAP_MID = 2.5;
const LEECH_SOFTCAP_MID_EFF = 0.6;
const LEECH_SOFTCAP_HIGH_EFF = 0.3;
const LEECH_BASE_INSTANCE_CAP_PCT = 20;
const LEECH_BASE_TOTAL_CAP_PCT = 40;
const LEECH_BASE_RATE_CAP_PCT = 4;
const ARMOR_MITIGATION_SCALE = 24;
const EVASION_ACCURACY_SCALE = 2.25;
const MIN_PENETRATED_RESISTANCE = -200;

function getArmorPhysicalReductionPct(armor, incomingPhysical) {
    let armorValue = Math.max(0, Number(armor) || 0);
    let hitValue = Math.max(1, Number(incomingPhysical) || 1);
    return Math.min(90, (armorValue / (armorValue + hitValue * ARMOR_MITIGATION_SCALE)) * 100);
}

function getEvasionChancePct(evasion, enemyAccuracy) {
    let evasionValue = Math.max(0, Number(evasion) || 0);
    let accuracyValue = Math.max(1, Number(enemyAccuracy) || 1);
    return Math.min(90, (evasionValue / (evasionValue + accuracyValue * EVASION_ACCURACY_SCALE)) * 100);
}

function formatNumberKR(value) {
    let n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return Math.floor(n).toLocaleString('ko-KR');
}

function addEvasionCombatLog(target, isPlayer) {
    if (game.settings && game.settings.showCombatLog === false) return;
    let targetName = String(target && target.name ? target.name : '적');
    let isWoodsman = !isPlayer && (targetName.includes('나무꾼') || (target && target.zoneType === 'outsideChaos'));
    let message = isPlayer
        ? '🌀 플레이어 회피'
        : (isWoodsman ? '🪓 나무꾼 회피' : `🌀 ${targetName} 회피`);
    let aggregateKey = isPlayer ? 'combat:evasion:player' : (isWoodsman ? 'combat:evasion:woodsman' : `combat:evasion:enemy:${targetName}`);
    addLog(message, isPlayer ? 'loot-magic' : 'attack-monster', {
        noToast: true,
        aggregateKey: aggregateKey,
        aggregateWindowMs: 450
    });
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
    let leechTarget = target === 'energyShield' ? 'energyShield' : 'life';
    let instantAmount = Math.max(0, Number(rawAmount) || 0);
    if (instantAmount <= 0) return 0;
    let caps = getLeechCaps(pStats, leechTarget);
    if (caps.instanceCap <= 0) return 0;
    instantAmount = Math.min(instantAmount, caps.instanceCap);
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

function getActiveRecoupInstances() {
    game.playerRecoupInstances = Array.isArray(game.playerRecoupInstances) ? game.playerRecoupInstances : [];
    game.playerRecoupInstances = game.playerRecoupInstances
        .map(inst => ({ remaining: Math.max(0, Number(inst && inst.remaining) || 0), rate: Math.max(0, Number(inst && inst.rate) || 0) }))
        .filter(inst => inst.remaining > 0 && inst.rate > 0);
    return game.playerRecoupInstances;
}
function addPlayerRecoupInstance(rawAmount, durationSec) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    let duration = Math.max(0.5, Number(durationSec) || 4);
    if (amount <= 0) return 0;
    let instances = getActiveRecoupInstances();
    instances.push({ remaining: amount, rate: amount / duration });
    game.playerRecoupInstances = instances;
    return amount;
}
function tickPlayerRecoup(pStats, dt) {
    let instances = getActiveRecoupInstances();
    if (instances.length === 0 || dt <= 0) return 0;
    let hpCap = getPlayerHpCap(pStats);
    let healed = 0;
    let next = [];
    instances.forEach(inst => {
        let tick = Math.min(inst.remaining, inst.rate * dt);
        if (tick <= 0) return;
        let before = Math.max(0, Number(game.playerHp) || 0);
        game.playerHp = Math.min(hpCap, before + tick);
        healed += Math.max(0, game.playerHp - before);
        inst.remaining = Math.max(0, inst.remaining - tick);
        if (inst.remaining > 0) next.push(inst);
    });
    game.playerRecoupInstances = next;
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
    let shieldWeapon = game.equipment && game.equipment['방패'];
    return !!(mainWeapon && shieldWeapon && shieldWeapon.slot === '무기');
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

function pruneEnemyRuntimeDebuffMaps() {
    let alive = new Set((game.enemies || []).filter(e => e && e.hp > 0).map(e => String(e.id)));
    function pruneMap(obj, maxKeys) {
        let src = (obj && typeof obj === 'object') ? obj : {};
        let keys = Object.keys(src);
        if (keys.length === 0) return {};
        let out = {};
        let kept = 0;
        for (let i = 0; i < keys.length; i++) {
            let k = keys[i];
            if (!alive.has(String(k))) continue;
            out[k] = src[k];
            kept++;
            if (kept >= maxKeys) break;
        }
        return out;
    }
    game.enemyKeystoneDebuffs = pruneMap(game.enemyKeystoneDebuffs, 180);
    game.rangerWeakpointMarks = pruneMap(game.rangerWeakpointMarks, 180);
    game.enemyUniqueChaosResDown = pruneMap(game.enemyUniqueChaosResDown, 180);
    game.enemyUniqueElementalResDown = pruneMap(game.enemyUniqueElementalResDown, 180);
    game.enemyCurseExpirePayloads = pruneMap(game.enemyCurseExpirePayloads, 180);
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

function getEnemyConditionDebuffFactor(enemy, pStats) {
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
    if (pStats && pStats.uniqueCursedTakenAndRefresh && list.length > 0) fx.mul *= Math.max(1, Number(pStats.uniqueCursedTakenAndRefresh.takenMul) || 1);
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
        playerRecoupInstances: game.playerRecoupInstances || [],
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
    game.playerRecoupInstances = JSON.parse(JSON.stringify(snap.playerRecoupInstances || []));
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


function runColonyDefenseTick(pStats) {
    let zoneNow = getZone(game.currentZoneId);
    if (!zoneNow || zoneNow.id !== 'colony_run' || !(game.colony && game.colony.inRun)) return false;
    if ((game.enemies || []).length <= 0 && typeof spawnColonyWave === 'function') spawnColonyWave();
    tickEnemyDotEffects(pStats, 0.1);
    tickEnemyAilments(pStats, 0.1);
    let nowCast = Date.now();
    let castUntil = Math.floor(game.playerCastDelayUntil || 0);
    let castBlocked = nowCast < castUntil;
    if (!castBlocked) pTimer += 0.1 * pStats.aspd;
    while (!castBlocked && pTimer >= 1.0 && (game.enemies || []).length > 0) {
        pTimer -= 1.0;
        performPlayerAttack(pStats);
    }
    performMonsterAttacks(pStats);
    return true;
}

function getActiveSummonGemDefs() {
    let owned = Array.isArray(game.skills) ? game.skills : [];
    game.summonSkillCounts = (game.summonSkillCounts && typeof game.summonSkillCounts === 'object') ? game.summonSkillCounts : {};
    let equippedSummonAttack = Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [];
    let attackNames = Array.from(new Set(equippedSummonAttack.filter(name => {
        let db = SKILL_DB[name];
        return owned.includes(name) && db && Array.isArray(db.tags) && db.tags.includes('summon_attack');
    })));
    let defs = [];
    attackNames.forEach(name => {
        let count = Math.max(1, Math.floor(Number(game.summonSkillCounts[name]) || 1));
        game.summonSkillCounts[name] = count;
        for (let i = 0; i < count; i++) defs.push({ name, db: SKILL_DB[name], source: 'skill', duplicateIndex: i });
    });
    game.equippedSummonSkills = attackNames;
    Object.keys(game.summonSkillCounts).forEach(name => { if (!attackNames.includes(name)) delete game.summonSkillCounts[name]; });
    let supportSummons = (game.equippedSupports || [])
        .map(name => ({ name, db: SUPPORT_GEM_DB[name], source: 'support', duplicateIndex: 0 }))
        .filter(row => row.db && Array.isArray(row.db.tags) && row.db.tags.includes('summon_guard'));
    return supportSummons.concat(defs);
}

function getSummonProfile(gemName) {
    let table = {
        '서리늑대 소환': { role: 'attack', ele: 'cold', trait: '빠른 공속', baseHp: 330, baseArmor: 36, baseEvasion: 63, baseRes: { fire: 10, cold: 24, light: 10, chaos: 0 }, baseDamage: 36, attackSpeedMul: 1.35, baseCrit: 8, baseCritDmg: 150, resPenBonus: 4, respawnMs: 2000, hpScaleBase: 0.038, hpScaleExp: 1.12, dmgPerLevelPct: 0.105, armorScaleBase: 0.018, armorScaleExp: 1.1, evasionScaleBase: 0.026, evasionScaleExp: 1.12 },
        '불곰 소환': { role: 'attack', ele: 'fire', trait: '강한 1타', baseHp: 473, baseArmor: 66, baseEvasion: 24, baseRes: { fire: 28, cold: 8, light: 10, chaos: 0 }, baseDamage: 57, attackSpeedMul: 0.78, baseCrit: 5, baseCritDmg: 145, resPenBonus: 2, respawnMs: 2000, hpScaleBase: 0.045, hpScaleExp: 1.14, dmgPerLevelPct: 0.135, armorScaleBase: 0.026, armorScaleExp: 1.12, evasionScaleBase: 0.012, evasionScaleExp: 1.08 },
        '벼락멧돼지 소환': { role: 'attack', ele: 'light', trait: '높은 저항 관통', baseHp: 368, baseArmor: 36, baseEvasion: 45, baseRes: { fire: 8, cold: 8, light: 30, chaos: 0 }, baseDamage: 41, attackSpeedMul: 1.02, baseCrit: 7, baseCritDmg: 150, resPenBonus: 18, respawnMs: 2000, hpScaleBase: 0.04, hpScaleExp: 1.12, dmgPerLevelPct: 0.112, armorScaleBase: 0.017, armorScaleExp: 1.1, evasionScaleBase: 0.018, evasionScaleExp: 1.11 },
        '칼날까마귀 소환': { role: 'attack', ele: 'phys', trait: '치명타 특화', baseHp: 315, baseArmor: 27, baseEvasion: 87, baseRes: { fire: 12, cold: 12, light: 12, chaos: 0 }, baseDamage: 33, attackSpeedMul: 1.18, baseCrit: 22, baseCritDmg: 190, physIgnoreBonus: 8, respawnMs: 2000, hpScaleBase: 0.036, hpScaleExp: 1.1, dmgPerLevelPct: 0.108, armorScaleBase: 0.014, armorScaleExp: 1.08, evasionScaleBase: 0.03, evasionScaleExp: 1.13 },
        '공허 유충 소환': { role: 'attack', ele: 'chaos', trait: '카오스 관통', baseHp: 405, baseArmor: 39, baseEvasion: 30, baseRes: { fire: 10, cold: 10, light: 10, chaos: 34 }, baseDamage: 42, attackSpeedMul: 0.95, baseCrit: 6, baseCritDmg: 155, resPenBonus: 14, respawnMs: 2000, hpScaleBase: 0.042, hpScaleExp: 1.14, dmgPerLevelPct: 0.118, armorScaleBase: 0.019, armorScaleExp: 1.11, evasionScaleBase: 0.013, evasionScaleExp: 1.08 },
        '벌떼 소환': { role: 'attack', ele: 'chaos', trait: '매우 빠른 공속', baseHp: 285, baseArmor: 24, baseEvasion: 75, baseRes: { fire: 10, cold: 10, light: 10, chaos: 8 }, baseDamage: 24, attackSpeedMul: 1.65, baseCrit: 10, baseCritDmg: 145, resPenBonus: 6, respawnMs: 2000, hpScaleBase: 0.033, hpScaleExp: 1.08, dmgPerLevelPct: 0.092, armorScaleBase: 0.012, armorScaleExp: 1.06, evasionScaleBase: 0.026, evasionScaleExp: 1.12 },
        '수액 골렘 소환': { role: 'guard', ele: 'phys', trait: '피해 대리', baseHp: 630, baseArmor: 90, baseEvasion: 18, baseRes: { fire: 15, cold: 15, light: 15, chaos: 10 }, baseDamage: 15, attackSpeedMul: 0, baseCrit: 0, baseCritDmg: 130, respawnMs: 4000, redirectPct: 0, hpScaleBase: 0.055, hpScaleExp: 1.12, dmgPerLevelPct: 0.06, armorScaleBase: 0.032, armorScaleExp: 1.1, evasionScaleBase: 0.01, evasionScaleExp: 1.06 }
    };
    return table[gemName] || { role: 'attack', ele: 'phys', trait: '균형형', baseHp: 330, baseArmor: 30, baseEvasion: 30, baseRes: { fire: 10, cold: 10, light: 10, chaos: 0 }, baseDamage: 30, attackSpeedMul: 1, baseCrit: 5, baseCritDmg: 140, respawnMs: 2000, hpScaleBase: 0.04, hpScaleExp: 1.12, dmgPerLevelPct: 0.1, armorScaleBase: 0.015, armorScaleExp: 1.1, evasionScaleBase: 0.015, evasionScaleExp: 1.1 };
}

function getSummonRuntimeCap(pStats) {
    return Math.max(1, Math.min(8, Math.floor((pStats && pStats.summonCap) || 1)));
}

function buildActiveSummonRuntimeDefs(pStats) {
    let maxCap = getSummonRuntimeCap(pStats);
    let defs = getActiveSummonGemDefs();
    return defs.slice(0, maxCap).map((row, idx) => ({ ...row, slotIdx: idx, duplicateIndex: row.duplicateIndex || 0 }));
}

function getEquippedJewelGemLevelBonusSources(target) {
    let gear = 0;
    let activeTags = typeof getGemLevelTargetTags === 'function' ? getGemLevelTargetTags(target) : [];
    let addJewelGemLevels = (jewel, multiplier) => {
        if (!jewel || typeof getJewelStats !== 'function') return;
        let mul = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
        getJewelStats(jewel).forEach(stat => {
            if (!stat) return;
            let value = Number(stat.val || 0) * mul;
            if (stat.id === 'gemLevel') gear += value;
            if (stat.id === 'summonGemLevel' && activeTags.includes('summon_attack')) gear += value;
        });
    };
    Object.values(game.equipment || {}).forEach(item => {
        if (!item) return;
        if (item.voidSocket && item.voidSocket.open) addJewelGemLevels(item.voidSocket.jewel, 1);
        let abyssAmp = 1;
        if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp') {
            let params = item.uniqueEffectParams || {};
            let min = Number(params.ampMin || 1), max = Number(params.ampMax || 100);
            let pct = Number.isFinite(Number(params.ampPct)) ? Number(params.ampPct) : ((min + max) / 2);
            abyssAmp += pct / 100;
        }
        (Array.isArray(item.abyssSockets) ? item.abyssSockets : []).forEach(socket => addJewelGemLevels(socket && socket.jewel, abyssAmp));
    });
    (game.jewelSlots || []).forEach((jewel, idx) => {
        let amplify = Math.max(0, Math.floor(((game.jewelSlotAmplify || [])[idx]) || 0));
        addJewelGemLevels(jewel, 1 + (amplify * 0.03));
    });
    (game.jewelSlots || []).forEach((jewel, idx) => {
        if (!jewel || jewel.uniqueId !== 'uj_mirror_heart') return;
        addJewelGemLevels((game.jewelSlots || [])[idx === 0 ? 1 : 0], 1);
    });
    return gear;
}

function hasEmptyThroneSoloBonus() {
    if (typeof getEquippedUniqueJewels !== 'function') return false;
    let equipped = getEquippedUniqueJewels();
    return equipped.some(entry => entry && entry.jewel && entry.jewel.uniqueId === 'uj_crown_empty')
        && equipped.every(entry => entry && entry.jewel && entry.jewel.uniqueId === 'uj_crown_empty');
}

function getTargetGemBonusSources(target, fallbackSources) {
    let sources = (typeof getGemBonusSources === 'function') ? getGemBonusSources(target) : fallbackSources;
    sources = sources ? { ...sources } : { gear: 0, passive: 0, reward: 0, total: 0 };
    let jewelGemLevel = getEquippedJewelGemLevelBonusSources(target);
    sources.gear = Number(sources.gear || 0) + jewelGemLevel;
    sources.total = Number(sources.total || 0) + jewelGemLevel;
    if (hasEmptyThroneSoloBonus()) {
        sources.reward = Number(sources.reward || 0) + 1;
        sources.total = Number(sources.total || 0) + 1;
    }
    let targetName = Array.isArray(target) ? null : (target || game.activeSkill);
    let isSupportGem = !!(targetName && typeof SUPPORT_GEM_DB !== 'undefined' && SUPPORT_GEM_DB[targetName]);
    let targetTags = (typeof getGemLevelTargetTags === 'function') ? getGemLevelTargetTags(target) : [];
    let isElementalGem = targetTags.includes('elemental');
    if (game.ascendClass === 'inquisitor' && hasKeystone('iq6') && (isElementalGem || isSupportGem)) {
        sources.reward = Number(sources.reward || 0) + 1;
        sources.total = Number(sources.total || 0) + 1;
    }
    return sources;
}

function getSummonGemLevel(gemName, source, pStats) {
    let records = source === 'support' ? (game.supportGemData || {}) : (game.gemData || {});
    let baseLevel = Math.max(1, (records[gemName] || {}).level || 1);
    let sources = getTargetGemBonusSources(gemName, pStats && pStats.gemBonusSources);
    let bonus = Math.max(0, Math.floor((sources && sources.total) || 0));
    return Math.max(1, baseLevel + bonus);
}

function getAttackSummonGrowthSteps(gemLv) {
    let levelSteps = Math.max(0, Math.floor(Number(gemLv || 1)) - 1);
    let earlySteps = Math.min(19, levelSteps);
    let post20Steps = Math.max(0, levelSteps - earlySteps);
    return 0.3 + (earlySteps * 1.08) + (post20Steps * 1.45) + (Math.pow(post20Steps, 1.15) * 0.12);
}

function getSummonLevelGrowthSteps(profile, gemLv) {
    return profile && profile.role === 'attack'
        ? getAttackSummonGrowthSteps(gemLv)
        : Math.max(0, Math.floor(Number(gemLv || 1)) - 1);
}

function getSummonScaledBaseDamage(profile, gemLv, pStats) {
    let dmgGrowth = 1 + getSummonLevelGrowthSteps(profile, gemLv) * (profile.dmgPerLevelPct || 0.1);
    let flat = Math.max(0, (pStats && pStats.summonFlatDmg) || 0);
    return Math.max(1, Math.floor(((profile.baseDamage || 20) * dmgGrowth) + flat));
}

function buildSummonRuntimeStats(row, pStats, now) {
    let profile = getSummonProfile(row.name);
    let isGuard = profile.role === 'guard';
    let gemLv = getSummonGemLevel(row.name, row.source, pStats);
    let levelSteps = getSummonLevelGrowthSteps(profile, gemLv);
    let hpGrowth = 1 + (Math.pow(levelSteps, profile.hpScaleExp || 1.12) * (profile.hpScaleBase || 0.04));
    let armorGrowth = 1 + (Math.pow(levelSteps, profile.armorScaleExp || 1.1) * (profile.armorScaleBase || 0.015));
    let evasionGrowth = 1 + (Math.pow(levelSteps, profile.evasionScaleExp || 1.1) * (profile.evasionScaleBase || 0.015));
    let baseHp = profile.baseHp * hpGrowth;
    let hpMul = 1 + ((pStats.summonHpPct || 0) / 100);
    let effMul = 1 + ((pStats.summonEfficiency || 0) / 100);
    let maxHp = Math.max(1, Math.floor(baseHp * hpMul * effMul));
    return {
        gemName: row.name,
        slotIdx: row.slotIdx,
        duplicateIndex: row.duplicateIndex || 0,
        role: isGuard ? 'guard' : 'attack',
        gemLevel: gemLv,
        trait: profile.trait || '',
        hp: maxHp,
        maxHp: maxHp,
        armor: Math.max(0, Math.floor((profile.baseArmor || 0) * armorGrowth)),
        evasion: Math.max(0, Math.floor((profile.baseEvasion || 0) * evasionGrowth)),
        resFire: Math.max(-60, Math.min(90, profile.baseRes.fire || 0)),
        resCold: Math.max(-60, Math.min(90, profile.baseRes.cold || 0)),
        resLight: Math.max(-60, Math.min(90, profile.baseRes.light || 0)),
        resChaos: Math.max(-60, Math.min(90, profile.baseRes.chaos || 0)),
        redirectPct: isGuard ? 100 : Math.max(0, Math.min(100, profile.redirectPct || 0)),
        respawnMs: isGuard ? 4000 : 2000,
        baseDamage: getSummonScaledBaseDamage(profile, gemLv, pStats),
        ele: profile.ele || 'phys',
        attackSpeedMul: Math.max(0, Number(profile.attackSpeedMul || 1)),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        crit: Math.max(0, profile.baseCrit || 0),
        critDmg: Math.max(100, profile.baseCritDmg || 140),
        alive: true,
        respawnAt: 0,
        nextAttackAt: now + 300
    };
}

function getLimitedSummonPenetrationStats(pStats, summon) {
    let fullPen = game.ascendClass === 'soulbinder' && hasKeystone('sb6');
    let baseResPen = fullPen ? Math.max(0, pStats.resPen || 0) : Math.min(25, Math.max(0, pStats.resPen || 0) * 0.35);
    let basePhysIgnore = Math.min(20, Math.max(0, pStats.physIgnore || 0) * 0.35);
    return {
        ...pStats,
        resPen: baseResPen + Math.max(0, (summon && summon.resPenBonus) || 0) + Math.max(0, (pStats && pStats.summonResPen) || 0),
        physIgnore: basePhysIgnore + Math.max(0, (summon && summon.physIgnoreBonus) || 0)
    };
}

function getLimitedSummonFinalDamageMultiplier(pStats) {
    let mul = Math.max(0, Number(pStats && pStats.finalDamageMultiplier) || 1);
    if (mul <= 1) return mul;
    return 1 + Math.min(1.5, (mul - 1) * 0.65);
}

function getLimitedSummonBossDamageMultiplier(pStats, target) {
    if (!target || !target.isBoss) return 1;
    let mul = Math.max(0, Number(pStats && pStats.bossDamageDealtMultiplier) || 1);
    if (mul <= 1) return mul;
    return 1 + Math.min(1.25, (mul - 1) * 0.65);
}

function getSummonAttackIntervalMs(pStats, summon) {
    let profileMul = Math.max(0.1, Number((summon && summon.attackSpeedMul) || 1));
    let summonAspdMul = 1 + Math.max(0, ((pStats && pStats.summonAspd) || 0) / 100);
    return Math.max(120, Math.floor(1000 / (summonAspdMul * profileMul)));
}

function getSummonSharedDamageIncreasePct(summon, pStats) {
    let generic = Math.max(0, Number((pStats && pStats.summonSharedPctDmg) || 0));
    let taggedStats = (pStats && pStats.summonSharedTaggedPctDmg) || {};
    let skillDef = summon && summon.gemName && typeof SKILL_DB !== 'undefined' ? SKILL_DB[summon.gemName] : null;
    let tags = new Set((skillDef && Array.isArray(skillDef.tags)) ? skillDef.tags : []);
    let tagged = 0;
    Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).forEach(tag => {
        if (!tags.has(tag)) return;
        tagged += Math.max(0, Number(taggedStats[TAGGED_DAMAGE_STAT_BY_TAG[tag]]) || 0);
    });
    return generic + tagged;
}

function getSummonHitDamageInfo(s, pStats, target, options) {
    let expected = !!(options && options.expected);
    let ele = s.ele || 'phys';
    let zone = getZone(game.currentZoneId) || getZone(0);
    let zoneTier = (zone && zone.tier) || 1;
    let base = Math.max(1, Math.floor(s.baseDamage || 20));
    if (game.ascendClass === 'soulbinder' && hasKeystone('sb1')) base = Math.max(1, Math.floor(base * 1.15));
    let soulbinderComplementPct = Math.max(0, Number((pStats && pStats.sbSummonDamageFromPlayerPct) || 0));
    let sharedIncreasePct = getSummonSharedDamageIncreasePct(s, pStats);
    let dmgMul = 1 + ((pStats.summonPctDmg || 0) / 100) + ((pStats.summonEfficiency || 0) / 100) + (soulbinderComplementPct / 100) + (sharedIncreasePct / 100);
    let critChance = Math.max(0, Math.min(0.95, ((s.crit || 0) + (pStats.summonCrit || 0)) / 100));
    let critMul = Math.max(1.2, ((s.critDmg || 140) + (pStats.summonCritDmg || 0)) / 100);
    let crit = false;
    let dmg = Math.max(1, base * dmgMul);
    let ailmentSourceDmg = Math.max(1, base * dmgMul);
    if (expected) {
        dmg *= pStats.uniqueSummonNonCritNoDamage ? (critChance * critMul) : ((1 - critChance) + (critChance * critMul));
    } else if (Math.random() < critChance) {
        dmg *= critMul;
        crit = true;
    } else if (pStats.uniqueSummonNonCritNoDamage) {
        dmg = 0;
        ailmentSourceDmg = 0;
    }
    if (target && target.isBoss) {
        let bossMul = getLimitedSummonBossDamageMultiplier(pStats, target);
        dmg *= bossMul;
        ailmentSourceDmg *= bossMul;
    }
    let curseFx = target ? getEnemyConditionDebuffFactor(target, pStats) : { mul: 1, resShred: 0, resFShred: 0, resCShred: 0, resLShred: 0, resChaosShred: 0, physDrShred: 0, lightTakenMul: 1, chaosTakenMul: 1, critDmgTakenMul: 1 };
    let limitedStats = getLimitedSummonPenetrationStats(pStats, s);
    let enemyRes = getEffectiveEnemyMitigation(ele, zoneTier, target, limitedStats) - (curseFx.resShred || 0);
    if (ele === 'fire') enemyRes -= (curseFx.resFShred || 0);
    if (ele === 'cold') enemyRes -= (curseFx.resCShred || 0);
    if (ele === 'light') enemyRes -= (curseFx.resLShred || 0);
    if (ele === 'chaos') enemyRes -= (curseFx.resChaosShred || 0);
    if (ele === 'phys') enemyRes -= (curseFx.physDrShred || 0);
    if (!expected && target && (target.evasionChance || 0) > 0 && Math.random() * 100 < target.evasionChance) {
        dmg = 0;
        ailmentSourceDmg = 0;
        addBattleFx('enemyEvade', { enemyId: target.id, text: '회피!', color: '#9fb4c8', duration: 260 });
        addEvasionCombatLog(target, false);
    }
    dmg = Math.floor(dmg * (1 - (enemyRes / 100)));
    ailmentSourceDmg = Math.floor(ailmentSourceDmg * (1 - (enemyRes / 100)));
    dmg = Math.floor(dmg * (curseFx.mul || 1));
    ailmentSourceDmg = Math.floor(ailmentSourceDmg * (curseFx.mul || 1));
    if (ele === 'phys' && target) {
        dmg = Math.floor(dmg * (target.physicalDamageTakenMul || 1));
        ailmentSourceDmg = Math.floor(ailmentSourceDmg * (target.physicalDamageTakenMul || 1));
    }
    if (ele === 'light') {
        dmg = Math.floor(dmg * (curseFx.lightTakenMul || 1));
        ailmentSourceDmg = Math.floor(ailmentSourceDmg * (curseFx.lightTakenMul || 1));
    }
    if (ele === 'chaos') {
        dmg = Math.floor(dmg * (curseFx.chaosTakenMul || 1));
        ailmentSourceDmg = Math.floor(ailmentSourceDmg * (curseFx.chaosTakenMul || 1));
    }
    if (crit) dmg = Math.floor(dmg * (curseFx.critDmgTakenMul || 1));
    if (target) {
        let keystoneMul = getKeystoneEnemyTakenMultiplier(target, ele);
        dmg = Math.floor(dmg * keystoneMul);
        ailmentSourceDmg = Math.floor(ailmentSourceDmg * keystoneMul);
    }
    let abyssMul = getAbyssMonsterScales(zone).playerDamageMul || 1;
    dmg = Math.floor(dmg * abyssMul);
    ailmentSourceDmg = Math.floor(ailmentSourceDmg * abyssMul);
    if (target && target.isBoss && (pStats.damageScales || {}).talismanBossFinalDmgBonusPct) {
        let talismanMul = 1 + ((pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100);
        dmg = Math.floor(dmg * talismanMul);
        ailmentSourceDmg = Math.floor(ailmentSourceDmg * talismanMul);
    }
    let finalMul = getLimitedSummonFinalDamageMultiplier(pStats);
    dmg = Math.floor(dmg * finalMul);
    ailmentSourceDmg = Math.floor(ailmentSourceDmg * finalMul);
    // 재능 개화 표면 키스톤: 조건부 피해 배율 + 정밀 메커니즘 공격 배율(예: 플레쳐 매 3타)
    if (typeof getTalentKeystoneDamageMul === 'function') {
        let ksMul = getTalentKeystoneDamageMul(target, ele, crit, pStats);
        if (typeof getTalentAttackDamageMul === 'function') ksMul *= getTalentAttackDamageMul();
        if (ksMul !== 1) {
            dmg = Math.floor(dmg * ksMul);
            ailmentSourceDmg = Math.floor(ailmentSourceDmg * ksMul);
        }
    }
    return { damage: Math.max(0, Math.floor(dmg)), ailmentSourceDamage: Math.max(0, Math.floor(ailmentSourceDmg)), crit: crit, critChance: critChance, element: ele };
}

function getSummonAilmentStats(pStats, element) {
    let scale = (game.ascendClass === 'soulbinder' && hasKeystone('sb6')) ? 0.5 : 0.35;
    return {
        ...pStats,
        sSkill: { ...(pStats.sSkill || {}), ele: element || 'phys' },
        igniteChance: Math.max(0, (pStats.igniteChance || 0) * scale),
        chillChance: Math.max(0, (pStats.chillChance || 0) * scale),
        freezeChance: Math.max(0, (pStats.freezeChance || 0) * scale),
        shockChance: Math.max(0, (pStats.shockChance || 0) * scale),
        poisonChance: Math.max(0, (pStats.poisonChance || 0) * scale),
        bleedChance: Math.max(0, (pStats.bleedChance || 0) * scale),
        ailmentResistPenPct: Math.max(0, (pStats.ailmentResistPenPct || 0) * scale),
        ailmentPowerMultiplier: 1 + Math.max(0, ((pStats.ailmentPowerMultiplier || 1) - 1) * scale),
        dotDurationMultiplier: 1 + Math.max(0, ((pStats.dotDurationMultiplier || 1) - 1) * scale)
    };
}

function applySummonAilmentFromHit(target, pStats, hitElement, hitDamage, isCrit, ailmentSourceDamage) {
    if (!target || hitDamage <= 0) return;
    let hasExplicitSource = Number.isFinite(Number(ailmentSourceDamage));
    applyEnemyAilmentFromHit(target, getSummonAilmentStats(pStats, hitElement), hitDamage, isCrit, {
        ailmentSourceDamage: hasExplicitSource ? ailmentSourceDamage : hitDamage,
        critDotBonusPct: (hasExplicitSource && isCrit) ? 50 : 0
    });
}

function estimateSummonDps(pStats) {
    if (game.ascendClass === 'soulbinder' && hasKeystone('sb5')) {
        return { total: 0, activeCount: 0, lines: ['홀로서기 각인: 소환수 직접 공격 비활성화'] };
    }
    let target = (game.enemies || []).find(e => e && e.hp > 0) || null;
    let rows = buildActiveSummonRuntimeDefs(pStats);
    let total = 0;
    let activeCount = 0;
    let lines = [];
    rows.forEach(row => {
        let profile = getSummonProfile(row.name);
        if (profile.role === 'guard') return;
        let gemLv = getSummonGemLevel(row.name, row.source, pStats);
        let s = {
            gemName: row.name,
            ele: profile.ele || 'phys',
            baseDamage: getSummonScaledBaseDamage(profile, gemLv, pStats),
            attackSpeedMul: Math.max(0.1, Number(profile.attackSpeedMul || 1)),
            resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
            physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
            crit: Math.max(0, profile.baseCrit || 0),
            critDmg: Math.max(100, profile.baseCritDmg || 140)
        };
        let intervalSec = getSummonAttackIntervalMs(pStats, s) / 1000;
        let hit = getSummonHitDamageInfo(s, pStats, target, { expected: true });
        let dps = hit.damage / intervalSec;
        total += dps;
        activeCount++;
    });
    lines.push(`공격 소환수 ${activeCount}기 · 소환수별 공격 주기 적용`);
    if (rows.length > activeCount) lines.push(`방어/보조 소환수 ${rows.length - activeCount}기는 DPS에서 제외`);
    lines.push('최종 피해/보스 피해/관통/상태이상 계열은 제한 계수로 반영');
    if (rows.some(row => row.duplicateIndex > 0)) lines.push('남는 소환수 한도는 공격 소환수 중복 소환으로 사용');
    return { total: Math.max(0, total), activeCount: activeCount, lines: lines };
}

function getSummonTooltipPreview(gemName, pStats) {
    let stats = pStats || (typeof getPlayerStats === 'function' ? getPlayerStats() : null) || {};
    let profile = getSummonProfile(gemName);
    let gemLv = getSummonGemLevel(gemName, SUPPORT_GEM_DB[gemName] ? 'support' : 'skill', stats);
    let hitProfile = {
        gemName: gemName,
        ele: profile.ele || 'phys',
        baseDamage: getSummonScaledBaseDamage(profile, gemLv, stats),
        attackSpeedMul: Math.max(0.1, Number(profile.attackSpeedMul || 1)),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        crit: Math.max(0, profile.baseCrit || 0),
        critDmg: Math.max(100, profile.baseCritDmg || 140)
    };
    let hit = getSummonHitDamageInfo(hitProfile, stats, null, { expected: true });
    let levelSteps = getSummonLevelGrowthSteps(profile, gemLv);
    let hpGrowth = 1 + (Math.pow(levelSteps, profile.hpScaleExp || 1.12) * (profile.hpScaleBase || 0.04));
    let maxHp = Math.max(1, Math.floor((profile.baseHp || 1) * hpGrowth * (1 + ((stats.summonHpPct || 0) / 100)) * (1 + ((stats.summonEfficiency || 0) / 100))));
    let critChance = Math.max(0, Math.min(0.95, ((profile.baseCrit || 0) + (stats.summonCrit || 0)) / 100));
    return {
        roleLabel: profile.role === 'guard' ? '방어 소환수' : '공격 소환수',
        trait: profile.trait || '',
        gemLevel: gemLv,
        maxHp: maxHp,
        hitDamageMin: hitProfile.baseDamage,
        hitDamageMax: Math.max(hitProfile.baseDamage, Math.floor(hit.damage || hitProfile.baseDamage)),
        attackPerSecond: profile.role === 'guard' ? 0 : (Math.round((1000 / getSummonAttackIntervalMs(stats, hitProfile)) * 100) / 100),
        critChancePct: Math.round(critChance * 1000) / 10,
        critDmgPct: Math.max(100, (profile.baseCritDmg || 140) + (stats.summonCritDmg || 0)),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        redirectPct: Math.max(0, Math.min(100, Math.max(profile.redirectPct || 0, (stats.summonGuardRedirectPct || 0))))
    };
}

function ensureSummonRuntime(pStats) {
    if (!Array.isArray(game.summons)) game.summons = [];
    game.summonSeq = Math.max(1, Math.floor(game.summonSeq || 1));
    let activeDefs = buildActiveSummonRuntimeDefs(pStats);
    let activeKeys = new Set(activeDefs.map(row => `${row.gemName || row.name}::${row.slotIdx}`));
    game.summons = game.summons.filter(s => s && activeKeys.has(`${s.gemName}::${s.slotIdx}`));
    let now = Date.now();
    activeDefs.forEach(row => {
        let existing = game.summons.find(s => s && s.gemName === row.name && s.slotIdx === row.slotIdx);
        let runtime = buildSummonRuntimeStats(row, pStats, now);
        if (existing) {
            let wasAlive = !!existing.alive;
            let hpRatio = (wasAlive && existing.maxHp > 0) ? Math.max(0, Math.min(1, (existing.hp || 0) / existing.maxHp)) : 0;
            let id = existing.id;
            let respawnAt = existing.respawnAt || 0;
            let nextAttackAt = existing.nextAttackAt || now + 300;
            Object.assign(existing, runtime);
            existing.id = id;
            existing.alive = wasAlive;
            existing.hp = wasAlive ? Math.max(1, Math.min(existing.maxHp, Math.floor(existing.maxHp * hpRatio))) : 0;
            existing.respawnAt = respawnAt;
            existing.nextAttackAt = nextAttackAt;
            return;
        }
        game.summons.push({ id: game.summonSeq++, ...runtime });
    });
    game.summons.forEach(s => {
        if (!s || s.alive || !s.respawnAt || now < s.respawnAt) return;
        s.alive = true;
        s.hp = s.maxHp;
        s.respawnAt = 0;
        s.nextAttackAt = now + 300;
    });
}

function runSummonAttackTick(pStats) {
    if (game.ascendClass === 'soulbinder' && hasKeystone('sb5')) return;
    let now = Date.now();
    let aliveEnemies = (game.enemies || []).filter(e => e && e.hp > 0);
    if (aliveEnemies.length <= 0) return;
    (game.summons || []).forEach(s => {
        if (!s || !s.alive) return;
        if (s.role !== 'attack') return;
        if (now < (s.nextAttackAt || 0)) return;
        s.nextAttackAt = now + getSummonAttackIntervalMs(pStats, s);
        let target = (game.enemies || []).find(e => e && e.hp > 0);
        if (!target) return;
        let hit = getSummonHitDamageInfo(s, pStats, target);
        let dmg = Math.max(0, hit.damage || 0);
        let dealt = applyDamageToEnemyResource(target, dmg);
        if (hit.crit && pStats.uniqueSummonCritAspdStacks) {
            let cfg = pStats.uniqueSummonCritAspdStacks || {};
            let maxStacks = Math.max(1, Math.floor(cfg.maxStacks || 3));
            let nowForCritBuff = Date.now();
            let currentStacks = (game.summonCritAspdExpiresAt || 0) > nowForCritBuff ? Math.max(0, Math.floor(game.summonCritAspdStacks || 0)) : 0;
            game.summonCritAspdStacks = Math.min(maxStacks, currentStacks + 1);
            game.summonCritAspdPerStack = Math.max(0, Number(cfg.aspd || 10));
            game.summonCritAspdExpiresAt = nowForCritBuff + Math.max(1, Number(cfg.duration || 4)) * 1000;
        }
        applySummonAilmentFromHit(target, pStats, hit.element, dmg, hit.crit, hit.ailmentSourceDamage);
        if (game.ascendClass === 'soulbinder' && hasKeystone('sb3')) {
            let heal = Math.max(0, Math.floor(dealt * 0.03));
            if (heal > 0) s.hp = Math.min(s.maxHp || s.hp || 1, (s.hp || 0) + heal);
            if (heal > 0) {
                let maxHp = Math.max(1, Math.floor((pStats && pStats.maxHp) || game.playerHp || 1));
                game.playerHp = Math.min(maxHp, Math.max(0, Math.floor((game.playerHp || 0) + heal)));
            }
        }
        addBattleFx('hit', { enemyId: target.id, color: getElementColor(hit.element), damage: dmg, crit: hit.crit, duration: 220, element: hit.element });
        if (target.hp <= 0) handleEnemyDeath(target, pStats);
    });
}

function markPlayerMovementCompleted() {
    game.lastMoveEndedAt = Date.now();
    game.uniqueRiderCompassConsumed = false;
}

function coreLoop() {
    if (game.woodsmanBuildLock) enforceWoodsmanBuildLock();
    tickWoodsmanCurse();
    if (ensurePendingLoopHeroSelectionPrompt()) return;
    const pStats = getPlayerStats();
    ensureSummonRuntime(pStats);
    // Guard against malformed stat payloads from legacy saves/runtime merges.
    // If ASPD becomes NaN/<=0, pTimer never advances and combat appears frozen.
    if (!Number.isFinite(pStats.aspd) || pStats.aspd <= 0) pStats.aspd = 1;
    if (!Number.isFinite(pStats.moveSpeed) || pStats.moveSpeed <= 0) pStats.moveSpeed = 100;
    if (!Number.isFinite(pStats.maxHp) || pStats.maxHp <= 0) pStats.maxHp = 1;
    if (!Number.isFinite(pTimer) || pTimer < 0) pTimer = 0;
    if (!Number.isFinite(game.playerCastDelayUntil)) game.playerCastDelayUntil = 0;
    sanitizeCombatRuntimeState();
    reconcileMapProgressRuntimeState();
    if (pStats.uniqueClosedEyes) {
        game.playerConditionBuffs = [];
        game.enemyConditionDebuffs = {};
    } else {
        runConditionGemAutoRules(pStats);
    }
    processPendingSlamEchoHits();
    tickAilments(pStats, 0.1);
    let ailmentMap = {};
    let activePlayerShock = null;
    (game.playerAilments || []).forEach(ail => {
        ailmentMap[ail.type] = Math.max(ailmentMap[ail.type] || 0, ail.time || 0);
        if (ail && ail.type === 'shock' && (ail.time || 0) > 0 && (!activePlayerShock || (ail.power || 0) > (activePlayerShock.power || 0))) activePlayerShock = ail;
    });
    if (ailmentMap.chill) pStats.aspd *= 0.68;
    pStats.playerShockTakenDamageIncreasePct = activePlayerShock ? getPlayerShockTakenDamageIncreasePct(pStats, activePlayerShock.power) : 0;
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
    applyCosmosPlayerDebuffsToStats(pStats);
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
            markPlayerMovementCompleted();
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
        let manualStopState = stopByMapSetting || stopByTownSetting || !!game.pendingLoopDecision || !!game.pendingLoopReady;
        if (beehivePause || game.inTicketBossFight || manualStopState) return;
        game.combatHalted = false;
    }
    if (game.playerHp > 0 && game.playerHp < pStats.maxHp) {
        let hpCap = getPlayerHpCap(pStats);
        let bloomRegenMul = Math.max(0.05, 1 - Math.max(0, Math.min(0.95, game.bloomTrialRegenSuppress || 0)));
        game.playerHp = Math.min(hpCap, game.playerHp + (pStats.maxHp * (pStats.regen / 100)) * 0.1 * bloomRegenMul);
    }
    if ((game.delayedGuardHealPool || 0) > 0) {
        let tickHeal = Math.max(0, (game.delayedGuardHealPool / 4) * 0.1);
        let hpCap = getPlayerHpCap(pStats);
        game.playerHp = Math.min(hpCap, game.playerHp + tickHeal);
        game.delayedGuardHealPool = Math.max(0, game.delayedGuardHealPool - tickHeal);
    }
    tickPlayerLeech(pStats, 0.1);
    tickPlayerRecoup(pStats, 0.1);
    if (!Number.isFinite(game.playerEnergyShield)) game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerEnergyShield = Math.max(0, Math.min(game.playerEnergyShield, Math.floor(pStats.energyShield || 0)));
    if (!Number.isFinite(game.playerEsLastHitAt)) game.playerEsLastHitAt = 0;
    if ((pStats.energyShield || 0) > 0 && game.playerEnergyShield < (pStats.energyShield || 0)) {
        if (game.ascendClass === 'crusader' && hasKeystone('cr5')) {
            let lifeRegenToEs = (pStats.maxHp || 0) * ((pStats.regen || 0) / 100);
            game.playerEnergyShield = Math.min((pStats.energyShield || 0), game.playerEnergyShield + lifeRegenToEs * 0.1);
        }
        if ((game.crusaderEsRegenUntil || 0) > Date.now()) {
            let regenPerSec = (pStats.energyShield || 0) * 0.25;
            game.playerEnergyShield = Math.min((pStats.energyShield || 0), game.playerEnergyShield + regenPerSec * 0.1);
        }
        let sinceHit = (Date.now() - (game.playerEsLastHitAt || 0)) / 1000;
        let noInterruptEsRegen = game.ascendClass === 'elementalist' && hasKeystone('e3');
        let allowRechargeWhileMoving = (game.moveTimer || 0) > 0 && (pStats.energyShieldRechargeDelay || 0) <= 0;
        if (noInterruptEsRegen || allowRechargeWhileMoving || sinceHit >= (pStats.energyShieldRechargeDelay || 3)) {
            let regenPerSec = (pStats.energyShield || 0) * ((pStats.energyShieldRegenRate || 12.5) / 100);
            game.playerEnergyShield = Math.min((pStats.energyShield || 0), game.playerEnergyShield + regenPerSec * 0.1);
        }
    }

    if (game.moveTimer > 0) {
        game.moveTimer -= 0.1;
        if (game.moveTimer <= 0) {
            markPlayerMovementCompleted();
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
    let _nowPrune = Date.now();
    game._nextEnemyRuntimePruneAt = Number.isFinite(game._nextEnemyRuntimePruneAt) ? game._nextEnemyRuntimePruneAt : 0;
    if (_nowPrune >= game._nextEnemyRuntimePruneAt) {
        pruneEnemyRuntimeDebuffMaps();
        game._nextEnemyRuntimePruneAt = _nowPrune + 2000;
    }
    if ((typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun)) && !(game.beehive && game.beehive.awaitingClear)) return;
    let progressBefore = game.runProgress;
    let zoneNow = getZone(game.currentZoneId);
    if (runColonyDefenseTick(pStats)) return;
    if (zoneNow && zoneNow.type === 'underworld' && game.playerHp > 0) {
        let floor = Math.max(1, Math.floor(zoneNow.floor || 1));
        if (floor >= 15) {
            let tickPct = floor >= 40 ? 0.02 : (floor >= 30 ? 0.015 : 0.01);
            let skyStoneMitigation = 1 - Math.max(0, Math.min(75, typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct() : 0)) / 100;
            let tickDmg = Math.max(1, Math.floor((pStats.maxHp || 1) * tickPct * skyStoneMitigation));
            game.playerHp = Math.max(0, Math.floor(game.playerHp - tickDmg));
        }
    }
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
        runSummonAttackTick(pStats);
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
    if (typeof UNIQUE_DB !== 'undefined' && Array.isArray(UNIQUE_DB)) {
        declared = UNIQUE_DB.map(unique => unique && unique.uniqueEffectKey).filter(Boolean);
    }
    let uniqueKeys = Array.from(new Set(declared));
    let implemented = new Set([
        'xpGainPct','flatDmgPerLevel','esAmpAndRecoverOnCrit','invertShockTaken','alwaysShock',
        'projectileDoubleStrikePct','hitApplyChaosResDown','corpseExplodeOnKill','instantLeechAndDoubleDamage',
        'riderCompass','maxRollBonusHit','ceilingSmashDouble','minRollEqualsMaxRoll','hpToPhysPct','immuneIgnite',
        'abyssSocketOnItem','abyssSocketAndJewelAmp','leechEfficiencyOnKill','overkillSplash','dragonVeinGuard','fateTwinRollSync','realmAllResDownOnHit','realmKillMoveStacks','realmCursedTakenAndRefresh','realmEnemyRegenCutAndMinRoll','realmPhysDrHalfTakenAsMore','realmArmorAppliesToDot','realmMeleeArmorAmp','realmNoCollisionBlock','realmResonanceAndSuppCap','realmRegenRateAndRegen','realmMaxHpPct','realmAllMaxRes','frostSentinelBoots','shockTracerGreaves','venomStride','bleedBlockHelm','curseCrown','guardianArmor','warcryResonanceBelt','stackingElementalResDownOnHit','conditionManual','queenBeeSummonOnHit','bleedWeightOnBleedingHit','grandBreachCrown','labyrinthShackles','meteorFootsteps'
        ,'cosmosFinalDmg','cosmosTakenLess','cosmosSpeedBurst','cosmosPenetration','cosmosSustain','cosmosBossSlayer','cosmosStatBundle','summonCapBonus','summonDeathDamageBuff','summonCritAspdStacks','summonNonCritNoDamage','summonEfficiencyBonus','rightRingSummonCap','genericTakenDamageReducePct','uniqueBlockChance','uniqueDeflectDamageReduce','blockRecoverEnergyShieldPct','uniqueTakenReduceWhen2Enemies','uniqueMaxResAll','deflectGrantShadowStealth','chaosTakenDamageReducePct','uniqueGemLevelBonus','lifeRecoupTakenDamage','immuneBleed','uniqueTakenReduceWhen1Enemy','lifePctAsEnergyShield','dsAndTargetAnyBonus','poisonDamageMorePct','immuneFreeze','uniqueMinDmgRoll','hitShockedEnemyDamageMorePct','noCollisionBlock','projectileTargetBonus','igniteDamageMorePct'
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

function getLabyrinthShacklesDamageMultiplier(moveSpeed) {
    let reducedMoveSpeed = Math.max(0, Number(moveSpeed || 0) - 100);
    return 1 + (reducedMoveSpeed * 0.5) / 100;
}

function getAbsoluteFloorDamageRoll(maxDamageRoll) {
    return Math.max(5, Number(maxDamageRoll || 0) * 0.85);
}

function getSolitaryHuntDoubleStrikeBonus(originalTargets) {
    let reducedTargets = Math.max(0, Math.floor(Number(originalTargets || 1)) - 1);
    return (Math.min(5, reducedTargets) * 100) + (Math.max(0, reducedTargets - 5) * 50);
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
    let colonyWardBonus = {};

    let localDefenseTotals = { armor: 0, evasion: 0, energyShield: 0 };
    let shieldBaseBlockChance = 0;
    let shieldBlockChancePct = 0;
    let shieldBlockChanceFlat = 0;
    let equippedUniqueEffects = [];
    let warriorDualWeaponEffectMultiplier = (game.ascendClass === 'warrior' && hasKeystone('w6') && isDualWielding()) ? 1.5 : 1;
    let scaleStatList = (stats, multiplier) => multiplier === 1 ? (stats || []) : (stats || []).map(stat => stat && Number.isFinite(Number(stat.val)) ? { ...stat, val: Number(stat.val) * multiplier } : stat);
    Object.entries(game.equipment || {}).forEach(([equipSlotKey, item]) => {
        if (!item) return;
        if (game.ascendClass === 'crusader' && hasKeystone('cr3') && item.slot === '무기') return;
        if (item.rarity === 'unique' && item.uniqueEffectKey) equippedUniqueEffects.push({ key: item.uniqueEffectKey, params: item.uniqueEffectParams || null, itemName: item.name || '', sourceSlot: equipSlotKey });
        let itemStatMultiplier = item.slot === '무기' ? warriorDualWeaponEffectMultiplier : 1;
        let qualityCap = item.qualityLockedByLimitBreak ? 30 : 20;
        let qualityMul = 1 + (Math.max(0, Math.min(qualityCap, Math.floor(item.quality || 0))) / 100);
        let itemBaseStats = scaleStatList((item.baseStats || []).map(stat => stat && Number.isFinite(Number(stat.val)) ? { ...stat, val: Number((Number(stat.val) * qualityMul).toFixed(2)) } : stat), itemStatMultiplier);
        applyStatsToBucket(gearBase, itemBaseStats);
        let immutableSpecialStats = typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item) : [];
        let riftAmpRow = (item.stats || []).find(stat => stat && stat.id === 'fossilRiftAmp');
        let riftAmpMul = 1 + (Math.max(0, Number(riftAmpRow && riftAmpRow.val) || 0) / 100);
        let adjustedExplicitStats = (item.stats || []).map(stat => {
            if (!stat) return stat;
            if (stat.id === 'fossilRiftBlank' || stat.id === 'fossilRiftAmp') return stat;
            if (!Number.isFinite(Number(stat.val))) return stat;
        
    return { ...stat, val: Number((Number(stat.val) * riftAmpMul).toFixed(2)) };
        });
        let explicitItemStats = scaleStatList(adjustedExplicitStats.concat(item.underEnchant ? [item.underEnchant] : [], item.chaosInfusion ? [item.chaosInfusion] : [], immutableSpecialStats), itemStatMultiplier);
        applyStatsToBucket(gearExplicit, explicitItemStats);
        let itemBaseArmor = 0, itemBaseEvasion = 0, itemBaseEs = 0;
        let itemFlatArmor = 0, itemFlatEvasion = 0, itemFlatEs = 0;
        let itemPctArmor = 0, itemPctEvasion = 0, itemPctEs = 0;
        itemBaseStats.forEach(stat => {
            if (!stat) return;
            if (stat.id === 'armor') itemBaseArmor += Number(stat.val || 0);
            if (stat.id === 'evasion') itemBaseEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShield') itemBaseEs += Number(stat.val || 0);
            if (stat.id === 'baseBlockChance') shieldBaseBlockChance += Number(stat.val || 0);
        });
        explicitItemStats.forEach(stat => {
            if (!stat) return;
            if (stat.id === 'armor') itemFlatArmor += Number(stat.val || 0);
            if (stat.id === 'evasion') itemFlatEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShield') itemFlatEs += Number(stat.val || 0);
            if (stat.id === 'armorPct') itemPctArmor += Number(stat.val || 0);
            if (stat.id === 'evasionPct') itemPctEvasion += Number(stat.val || 0);
            if (stat.id === 'energyShieldPct') itemPctEs += Number(stat.val || 0);
            if (stat.id === 'baseBlockChance') shieldBaseBlockChance += Number(stat.val || 0);
            if (stat.id === 'blockChancePct') shieldBlockChancePct += Number(stat.val || 0);
            if (stat.id === 'blockChance') shieldBlockChanceFlat += Number(stat.val || 0);
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
                let pct = Number.isFinite(Number(p.ampPct)) ? Number(p.ampPct) : ((min + max) / 2);
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
    let uniqueFateTwinRollSync=false, uniqueFrostSentinel=false, uniqueShockTracer=null, uniqueVenomStride=false, uniqueBleedBlockHelm=false, uniqueImmuneBleed=false, uniqueImmuneFreeze=false, uniqueCurseCrownPerCursePct=0, uniqueWarcryResonancePct=0, uniqueConditionManual=null, uniqueStackingElementalResDownOnHit=null;
    let uniqueAllResDownOnHit=null, uniqueKillMoveStacks=null, uniqueCursedTakenAndRefresh=null, uniqueEnemyRegenCutAndMinRoll=null, uniquePhysDrHalfTakenAsMore=null, uniqueArmorAppliesToDot=false, uniqueMeleeArmorAmp=null, uniqueNoCollisionBlock=false, uniqueResonanceAndSuppCap=null, uniqueRegenRateAndRegen=null, uniqueMaxHpPct=0, uniqueAllMaxRes=0;
    let uniqueLeechEfficiencyOnKill=null, uniqueOverkillSplash=false, uniqueDragonVeinGuard=null, uniqueGuardianArmor=null;
    let uniqueQueenBeeSummon=null, uniqueBleedWeightOnBleedingHit=false, uniqueGrandBreachCrown=null, uniqueLabyrinthShackles=false, uniqueMeteorFootsteps=null;
    if (activeUniqueIds.has('uj_crown_empty')) {
        let otherUniqueCount = equippedUniqueJewels.filter(entry => entry && entry.jewel && entry.jewel.uniqueId !== 'uj_crown_empty').length;
        if (otherUniqueCount === 0) {
            addStatToBucket(reward, 'pctDmg', 25);
            addStatToBucket(reward, 'gemLevel', 1);
        }
    }
    if (activeUniqueIds.has('uj_condensed_curse')) uniqueCurseCrownPerCursePct = Math.max(uniqueCurseCrownPerCursePct, 10);
    let uniqueSummonDeathDamageBuff=null, uniqueSummonCritAspdStacks=null, uniqueSummonNonCritNoDamage=false;
    let uniqueBlockRecoverEnergyShieldPct=0, uniqueDeflectStealth=null, uniqueChaosTakenDamageReducePct=0, uniqueLifeRecoupTakenDamage=null;
    // 재능 개화 표면 키스톤: 장착된 카드가 부여하는 고유 효과를 동일 파이프라인에 주입
    if (typeof getActiveTalentKeystoneUniqueEffects === 'function') {
        getActiveTalentKeystoneUniqueEffects().forEach(e => { if (e && e.key) equippedUniqueEffects.push(e); });
    }
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
        else if (effect.key === 'shockTracerGreaves') uniqueShockTracer = { shockEffectPct: Number(ep.shockEffectPct || 25), strikeDamagePct: Number(ep.strikeDamagePct || 500), icdSec: Number(ep.icdSec || 0.5) };
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

        else if (effect.key === 'realmAllResDownOnHit') uniqueAllResDownOnHit = { perHit: Number(ep.perHit || 5), max: Number(ep.max || 4), duration: Number(ep.duration || 5) };
        else if (effect.key === 'realmKillMoveStacks') uniqueKillMoveStacks = { movePerStack: Number(ep.movePerStack || 10), maxStacks: Number(ep.maxStacks || 20), duration: Number(ep.duration || 20), cooldownSec: Number(ep.cooldownSec || 1) };
        else if (effect.key === 'realmCursedTakenAndRefresh') uniqueCursedTakenAndRefresh = { takenMul: Number(ep.takenMul || 1.1), refreshSec: Number(ep.refreshSec || 4) };
        else if (effect.key === 'realmEnemyRegenCutAndMinRoll') uniqueEnemyRegenCutAndMinRoll = { enemyRegenRateMul: Number(ep.enemyRegenRateMul || 0.5), minRoll: Number(ep.minRoll || 10) };
        else if (effect.key === 'realmPhysDrHalfTakenAsMore') uniquePhysDrHalfTakenAsMore = { ratio: Number(ep.ratio || 0.5) };
        else if (effect.key === 'realmArmorAppliesToDot') uniqueArmorAppliesToDot = true;
        else if (effect.key === 'realmMeleeArmorAmp') uniqueMeleeArmorAmp = { ampPct: Number(ep.ampPct || 5), maxStacks: Number(ep.maxStacks || 3), duration: Number(ep.duration || 2) };
        else if (effect.key === 'realmNoCollisionBlock') uniqueNoCollisionBlock = true;
        else if (effect.key === 'realmResonanceAndSuppCap') uniqueResonanceAndSuppCap = { resonancePower: Number(ep.resonancePower || 150), suppCap: Number(ep.suppCap || 3) };
        else if (effect.key === 'realmRegenRateAndRegen') uniqueRegenRateAndRegen = { regenRatePct: Number(ep.regenRatePct || 25), regen: Number(ep.regen || 2) };
        else if (effect.key === 'realmMaxHpPct') uniqueMaxHpPct += Number(ep.pctHp || 35);
        else if (effect.key === 'realmAllMaxRes') uniqueAllMaxRes += Number(ep.maxRes || 3);
        else if (effect.key === 'meteorFootsteps') uniqueMeteorFootsteps = { chance: Number(ep.chance || 20), damagePct: Number(ep.damagePct || 180) };
        else if (effect.key === 'summonCapBonus') addStatToBucket(reward, 'summonCap', Number(ep.cap || 1));
        else if (effect.key === 'summonEfficiencyBonus') addStatToBucket(reward, 'summonEfficiency', Number(ep.pct || 10));
        else if (effect.key === 'rightRingSummonCap') { if (effect.sourceSlot === '반지2') addStatToBucket(reward, 'summonCap', Number(ep.cap || 1)); }
        else if (effect.key === 'summonDeathDamageBuff') uniqueSummonDeathDamageBuff = { pct: Number(ep.pct || 40), duration: Number(ep.duration || 4) };
        else if (effect.key === 'summonCritAspdStacks') uniqueSummonCritAspdStacks = { aspd: Number(ep.aspd || 10), maxStacks: Number(ep.maxStacks || 3), duration: Number(ep.duration || 4) };
        else if (effect.key === 'summonNonCritNoDamage') uniqueSummonNonCritNoDamage = true;
        else if (effect.key === 'genericTakenDamageReducePct') addStatToBucket(reward, 'genericTakenDamageReducePct', Number(ep.pct || 0));
        else if (effect.key === 'uniqueBlockChance') addStatToBucket(reward, 'blockChance', Number(ep.chance || 0));
        else if (effect.key === 'uniqueDeflectDamageReduce') addStatToBucket(reward, 'deflectDamageReduce', Number(ep.pct || 0));
        else if (effect.key === 'blockRecoverEnergyShieldPct') uniqueBlockRecoverEnergyShieldPct = Math.max(uniqueBlockRecoverEnergyShieldPct, Number(ep.pct || 2));
        else if (effect.key === 'uniqueTakenReduceWhen2Enemies') addStatToBucket(reward, 'takenDamageReduceWhen2EnemiesPct', Number(ep.pct || 0));
        else if (effect.key === 'uniqueTakenReduceWhen1Enemy') addStatToBucket(reward, 'takenDamageReduceWhen1EnemyPct', Number(ep.pct || 0));
        else if (effect.key === 'uniqueMaxResAll') addStatToBucket(reward, 'maxResAll', Number(ep.pct || 0));
        else if (effect.key === 'deflectGrantShadowStealth') uniqueDeflectStealth = { duration: Number(ep.duration || 3), move: Number(ep.move || 20), evasionPct: Number(ep.evasionPct || 20), critDmg: Number(ep.critDmg || 20) };
        else if (effect.key === 'chaosTakenDamageReducePct') uniqueChaosTakenDamageReducePct = Math.max(uniqueChaosTakenDamageReducePct, Number(ep.pct || 15));
        else if (effect.key === 'uniqueGemLevelBonus') addStatToBucket(reward, 'gemLevel', Number(ep.level || 1));
        else if (effect.key === 'lifeRecoupTakenDamage') uniqueLifeRecoupTakenDamage = { pct: Number(ep.pct || 25), duration: Number(ep.duration || 4) };
        else if (effect.key === 'immuneBleed') uniqueImmuneBleed = true;
        else if (effect.key === 'immuneFreeze') uniqueImmuneFreeze = true;
        else if (effect.key === 'lifePctAsEnergyShield') addStatToBucket(reward, 'energyShield', Math.floor(Math.max(0, baseHp) * Math.max(0, Number(ep.pct || 10)) / 100));
        else if (effect.key === 'dsAndTargetAnyBonus') { addStatToBucket(reward, 'ds', Number(ep.ds || 8)); addStatToBucket(reward, 'targetAny', Number(ep.target || 1)); }
        else if (effect.key === 'poisonDamageMorePct') addStatToBucket(reward, 'poisonDamageMultiplierPct', Number(ep.pct || 25));
        else if (effect.key === 'uniqueMinDmgRoll') addStatToBucket(reward, 'minDmgRoll', Number(ep.pct || 5));
        else if (effect.key === 'hitShockedEnemyDamageMorePct') addStatToBucket(reward, 'shockedEnemyHitDamageMorePct', Number(ep.pct || 50));
        else if (effect.key === 'noCollisionBlock') uniqueNoCollisionBlock = true;
        else if (effect.key === 'projectileTargetBonus') addStatToBucket(reward, 'targetProjectile', Number(ep.target || 1));
        else if (effect.key === 'igniteDamageMorePct') addStatToBucket(reward, 'igniteDamageMultiplierPct', Number(ep.pct || 25));
        else if (effect.key === 'cosmosFinalDmg') addStatToBucket(reward, 'pctDmg', Number(ep.pct || 12));
        else if (effect.key === 'cosmosTakenLess') addStatToBucket(reward, 'dr', Number(ep.dr || 8));
        else if (effect.key === 'cosmosSpeedBurst') { addStatToBucket(reward, 'move', Number(ep.move || 12)); addStatToBucket(reward, 'aspd', Number(ep.aspd || 10)); }
        else if (effect.key === 'cosmosPenetration') addStatToBucket(reward, 'resPen', Number(ep.pen || 8));
        else if (effect.key === 'cosmosSustain') { addStatToBucket(reward, 'regen', Number(ep.regen || 1.2)); addStatToBucket(reward, 'leech', Number(ep.leech || 0.8)); }
        else if (effect.key === 'cosmosBossSlayer') { addStatToBucket(reward, 'pctDmg', Number(ep.pct || 14)); addStatToBucket(reward, 'critDmg', Number(ep.critDmg || 20)); }
        else if (effect.key === 'cosmosStatBundle') {
            addStatToBucket(reward, 'pctDmg', Number(ep.pctDmg || 0));
            addStatToBucket(reward, 'dr', Number(ep.dr || 0));
            addStatToBucket(reward, 'move', Number(ep.move || 0));
            addStatToBucket(reward, 'aspd', Number(ep.aspd || 0));
            addStatToBucket(reward, 'resPen', Number(ep.resPen || 0));
            addStatToBucket(reward, 'critDmg', Number(ep.critDmg || 0));
            addStatToBucket(reward, 'regen', Number(ep.regen || 0));
            addStatToBucket(reward, 'leech', Number(ep.leech || 0));
        }

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

    let seasonNodeLevels = (game && game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object') ? game.seasonNodeLevels : {};
    safeSeasonNodes.forEach(id => {
        let node = SEASON_NODES[id];
        if (!node) return;
        let lv = Math.max(1, Math.floor(seasonNodeLevels[id] || 1));
        let scaled = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(4));
        addStatToBucket(season, node.stat, scaled);
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
    let runeCorpseExplodeChance = 0;
    let runeCorpseExplodeLifePct = 0;
    let runeResonancePower = 0;
    if (Array.isArray(UNDERWORLD_RUNE_DB)) {
        let runeState = game.underworldRunes || {};
        let cap = Math.max(0, Math.min(6, Math.floor(runeState.unlockedSlots || 0)));
        let equipped = Array.isArray(runeState.equippedRunes) ? runeState.equippedRunes.slice(0, cap) : [];
        equipped.forEach(no => {
            let n = Math.floor(Number(no) || 0);
            if (n <= 0) return;
            let rune = UNDERWORLD_RUNE_DB.find(row => row.no === n);
            if (!rune) return;
            let lv = Math.max(0, Math.floor((runeState.enhanceLvByNo && runeState.enhanceLvByNo[n]) || 0));
            let boosted = Number(rune.val || 0) * (1 + lv * 0.01);
            if (rune.stat === 'corpseExplodeChance') runeCorpseExplodeChance += boosted;
            else if (rune.stat === 'corpseExplodeLifePct') runeCorpseExplodeLifePct += boosted;
            else if (rune.stat === 'resonancePower') runeResonancePower += boosted;
            else addStatToBucket(reward, rune.stat, boosted);
            let bonusLines = (runeState.bonusLinesByNo && Array.isArray(runeState.bonusLinesByNo[n])) ? runeState.bonusLinesByNo[n] : [];
            bonusLines.forEach(line => { if (line && line.stat) addStatToBucket(reward, line.stat, Number(line.val || 0)); });
        });
    }
    if (typeof getCoreCubeActiveStats === 'function') {
        getCoreCubeActiveStats().forEach(stat => { if (stat && stat.id) addStatToBucket(reward, stat.id, stat.val); });
    }
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

    let gemSources = getTargetGemBonusSources(game.activeSkill);
    safeEquippedSupports.forEach(name => {
        let gem = normalizeGemRecord((game.supportGemData || {})[name]);
        let db = SUPPORT_GEM_DB[name];
        if (!db) return;
        let activeTier = typeof getSupportActiveTier === 'function' ? getSupportActiveTier(name) : Math.max(1, Math.min((typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3), Math.floor(gem.activeTier || gem.unlockedTier || 1)));
        let tierMul = typeof getSupportTierMultiplier === 'function' ? getSupportTierMultiplier(name, activeTier) : (activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2);
        let supportGemSources = getTargetGemBonusSources(name);
        let effectiveLevel = Math.max(1, gem.level + supportGemSources.total);
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
    // 재능: 1 아방가르드 — 물리/투사체 스킬 관통(대상 최대화)
    if (typeof isTalentCardActive === 'function' && isTalentCardActive('hero1__warrior') && (skill.ele === 'phys' || (Array.isArray(skill.tags) && skill.tags.includes('projectile')))) {
        skill.targets = 6;
    }
    // 재능 개화 카드(장착) 효과를 보상 버킷에 합산 → 이후 모든 최종 스탯/태그 피해에 반영
    let talentStatMap = (typeof getActiveTalentStatMap === 'function') ? getActiveTalentStatMap() : {};
    if (typeof getActiveTalentCardStatBonuses === 'function') applyStatsToBucket(reward, getActiveTalentCardStatBonuses());
    let talentLine = function (stat, suffix) { let v = talentStatMap[stat]; return v ? `🌸 재능 개화 +${Math.round(v * 100) / 100}${suffix || '%'} (위 합계에 포함)` : null; };

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
    let baseTaggedTotal = taggedTotal;
    function sumStatAcrossBuckets(statId) {
        return gearBase[statId] + gearExplicit[statId] + passive[statId] + season[statId] + ascend[statId] + support[statId] + reward[statId] + (starBlessing[statId] || 0);
    }
    let coreCubeAddedDamagePct = {
        phys: sumStatAcrossBuckets('addedPhysDamagePct'),
        fire: sumStatAcrossBuckets('addedFireDamagePct'),
        cold: sumStatAcrossBuckets('addedColdDamagePct'),
        light: sumStatAcrossBuckets('addedLightDamagePct'),
        chaos: sumStatAcrossBuckets('addedChaosDamagePct')
    };
    let coreCubeFlatElementDamage = {
        fire: sumStatAcrossBuckets('fireFlatDmg'),
        cold: sumStatAcrossBuckets('coldFlatDmg'),
        light: sumStatAcrossBuckets('lightFlatDmg'),
        chaos: sumStatAcrossBuckets('chaosFlatDmg')
    };
    let coreCubeFlatElementDamageTotal = Object.values(coreCubeFlatElementDamage).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    let coreCubeTakenFlatReduce = {
        phys: sumStatAcrossBuckets('physFlatTakenReduce'),
        fire: sumStatAcrossBuckets('fireFlatTakenReduce'),
        cold: sumStatAcrossBuckets('coldFlatTakenReduce'),
        light: sumStatAcrossBuckets('lightFlatTakenReduce'),
        chaos: sumStatAcrossBuckets('chaosFlatTakenReduce'),
        all: sumStatAcrossBuckets('allFlatTakenReduce')
    };
    let coreCubePhysTakenAs = {
        fire: sumStatAcrossBuckets('physTakenAsFire'),
        cold: sumStatAcrossBuckets('physTakenAsCold'),
        light: sumStatAcrossBuckets('physTakenAsLight'),
        chaos: sumStatAcrossBuckets('physTakenAsChaos')
    };
    let coreCubeDoubleDamageChance = sumStatAcrossBuckets('doubleDamageChance');
    let coreCubeSlamEchoDamagePct = sumStatAcrossBuckets('slamEchoDamagePct');
    let crusaderThunderDoctrinePct = 0;
    if (game.ascendClass === 'crusader' && hasKeystone('cr2') && skill.ele === 'light') {
        let firePct = sumStatAcrossBuckets('firePctDmg');
        let coldPct = sumStatAcrossBuckets('coldPctDmg');
        crusaderThunderDoctrinePct = Math.max(0, firePct + coldPct);
        if (crusaderThunderDoctrinePct > 0) {
            taggedTotal += crusaderThunderDoctrinePct;
            taggedSummary.push(`천뢰 교리: 화염/냉기 피해 ${Math.floor(crusaderThunderDoctrinePct)}%를 번개 피해에 추가 적용`);
        }
    }

    let hasRandomElementConversion = Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0;
    let skillHasElementalConversion = hasRandomElementConversion || ['fire','cold','light','chaos'].includes(skill.ele);

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

    let weaponBaseDmgPct = Math.max(0, gearBase.weaponFlatDmgPct + gearExplicit.weaponFlatDmgPct);
    let gearFlatDmg = (gearBase.flatDmg * (1 + weaponBaseDmgPct / 100)) + gearExplicit.flatDmg;
    let passiveFlatDmg = passive.flatDmg + season.flatDmg + ascend.flatDmg + reward.flatDmg;
    let generalPctDmg = gearBase.pctDmg + gearExplicit.pctDmg + passive.pctDmg + season.pctDmg + ascend.pctDmg + support.pctDmg + reward.pctDmg + starBlessing.pctDmg;
    let dotPctDmg = gearBase.dotPctDmg + gearExplicit.dotPctDmg + passive.dotPctDmg + season.dotPctDmg + ascend.dotPctDmg + support.dotPctDmg + reward.dotPctDmg;
    function sumAilmentChanceStat(statId) {
        return (gearBase[statId] || 0) + (gearExplicit[statId] || 0) + (passive[statId] || 0) + (season[statId] || 0) + (ascend[statId] || 0) + (support[statId] || 0) + (reward[statId] || 0) + (starBlessing[statId] || 0);
    }
    let finalIgniteChance = sumAilmentChanceStat('igniteChance');
    let finalChillChance = sumAilmentChanceStat('chillChance');
    let finalFreezeChance = sumAilmentChanceStat('freezeChance');
    let finalShockChance = sumAilmentChanceStat('shockChance');
    let finalPoisonChance = sumAilmentChanceStat('poisonChance');
    let finalBleedChance = sumAilmentChanceStat('bleedChance');
    let ailmentCritChance = { ignite: 25, chill: 25, freeze: 25, shock: 25, poison: 25, bleed: 25 };
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
    let totalFlatDmg = (isSpellSkill ? spellFlatDmg : (baseDmg + gearFlatDmg + passiveFlatDmg)) + coreCubeFlatElementDamageTotal;
    let codexBonusRatio = 1 + (getCodexBonusPct() / 100);

    let gearFlatHp = gearBase.flatHp + gearExplicit.flatHp;
    let passiveFlatHp = passive.flatHp + season.flatHp + ascend.flatHp + reward.flatHp;
    let totalFlatHp = baseHp + gearFlatHp + passiveFlatHp + starBlessing.flatHp;
    let totalPctHp = gearBase.pctHp + gearExplicit.pctHp + passive.pctHp + season.pctHp + ascend.pctHp + support.pctHp + reward.pctHp;
    let finalMaxHp = Math.floor(totalFlatHp * (1 + totalPctHp / 100) * codexBonusRatio);

    let hpScaleRatio = Math.max(0, finalMaxHp * (skill.hpDmgScale || 0));
    let hpFlatBonus = Math.floor(totalFlatDmg * hpScaleRatio);
    let scaledFlatDmg = totalFlatDmg + hpFlatBonus;
    let baseDamageIncreaseMultiplier = (1 + (generalPctDmg + taggedTotal) / 100) * (skill.dmg || skill.baseDmg || 1) * codexBonusRatio;
    baseDamageIncreaseMultiplier *= (1 + Math.max(0, Number(skill.flatSkillDmgPct) || 0) / 100);
    let finalBaseDmg = Math.floor(scaledFlatDmg * baseDamageIncreaseMultiplier);

    let gearAspd = gearBase.aspd + gearExplicit.aspd;
    let passiveAspd = passive.aspd + season.aspd + ascend.aspd + reward.aspd;
    let totalAspdPct = gearAspd + passiveAspd + support.aspd;
    let rawAspd = (1.0 + glovePairAspdBonus) * (1 + totalAspdPct / 100) * (skill.spd || skill.baseSpd || 1) * 0.88;
    let finalAspd = rawAspd <= 5 ? rawAspd : (5 + Math.pow(Math.max(0, rawAspd - 5), 0.72));
    finalAspd = Math.min(12, finalAspd);

    let gearCrit = gearBase.crit + gearExplicit.crit;
    let passiveCrit = passive.crit + season.crit + ascend.crit + reward.crit;
    let finalCrit = (2.5 + gearCrit + passiveCrit + support.crit + (skill.crit || 0)) * 0.82;
    let finalMove = baseMove + gearBase.move + gearExplicit.move + passive.move + season.move + ascend.move + support.move + reward.move + starBlessing.move;
    let activeShadowStealth = uniqueDeflectStealth && (game.shadowStealthExpiresAt || 0) > Date.now();
    if (activeShadowStealth) finalMove += Math.max(0, Number(uniqueDeflectStealth.move || 20));
    if (uniqueKillMoveStacks && game.uniqueKillMoveStacksState && (game.uniqueKillMoveStacksState.expiresAt || 0) > Date.now()) finalMove += Math.max(0, Math.floor(game.uniqueKillMoveStacksState.stacks || 0)) * Math.max(0, Number(uniqueKillMoveStacks.movePerStack || 10));
    let zonePenalty = getZone(game.currentZoneId) || getZone(0);
    if (zonePenalty && zonePenalty.type === 'underworld') {
        let uf = Math.max(1, Math.floor(zonePenalty.floor || 1));
        let gravitySlow = Math.min(0.75, 0.12 + Math.max(0, uf - 1) * 0.018);
        let skyStoneReduction = Math.max(0, Math.min(75, typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct() : 0)) / 100;
        gravitySlow *= (1 - skyStoneReduction);
        finalAspd *= (1 - gravitySlow);
        finalMove *= (1 - gravitySlow);
    }
    if (zonePenalty && zonePenalty.bloomTrial && zonePenalty.underworldPenaltyFloor) {
        // 지하계 N층급 중력 패널티: 창공석으로 줄일 수 없음
        let uf = Math.max(1, Math.floor(zonePenalty.underworldPenaltyFloor || 1));
        let gravitySlow = Math.min(0.75, 0.12 + Math.max(0, uf - 1) * 0.018);
        finalAspd *= (1 - gravitySlow);
        finalMove *= (1 - gravitySlow);
    }
    let finalDamageMultiplier = 1;
    if (uniqueLabyrinthShackles) {
        finalDamageMultiplier *= getLabyrinthShacklesDamageMultiplier(finalMove);
        finalMove = 100;
    }
    
    let extraFlatArmor = passive.armor + season.armor + ascend.armor + reward.armor;
    let extraFlatEvasion = passive.evasion + season.evasion + ascend.evasion + reward.evasion;
    let extraFlatEnergyShield = passive.energyShield + season.energyShield + ascend.energyShield + reward.energyShield;
    let gearArmor = localDefenseTotals.armor + extraFlatArmor;
    let gearEvasion = localDefenseTotals.evasion + extraFlatEvasion;
    let gearEnergyShield = localDefenseTotals.energyShield + extraFlatEnergyShield;
    let totalArmorPct = passive.armorPct + season.armorPct + ascend.armorPct + reward.armorPct;
    let totalEvasionPct = passive.evasionPct + season.evasionPct + ascend.evasionPct + reward.evasionPct + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.evasionPct || 20)) : 0);
    let totalEnergyShieldPct = passive.energyShieldPct + season.energyShieldPct + ascend.energyShieldPct + reward.energyShieldPct;
    let finalArmor = Math.max(0, Math.floor(gearArmor * (1 + totalArmorPct / 100)));
    let finalEvasion = Math.max(0, Math.floor(gearEvasion * (1 + totalEvasionPct / 100)));
    let finalEnergyShield = Math.max(0, Math.floor(gearEnergyShield * (1 + totalEnergyShieldPct / 100)));
    if (uniqueGrandBreachCrown) finalEnergyShield = Math.max(0, Math.floor(finalEnergyShield * (1 + Math.max(0, uniqueGrandBreachCrown.esPct || 30) / 100)));
    if (uniqueEsAmpPct > 0) finalEnergyShield = Math.floor(finalEnergyShield * (1 + uniqueEsAmpPct / 100));
    let finalEnergyShieldRegenRate = Math.max(0, 12.5 + gearBase.energyShieldRegen + gearExplicit.energyShieldRegen + passive.energyShieldRegen + season.energyShieldRegen + ascend.energyShieldRegen + support.energyShieldRegen + reward.energyShieldRegen);
    let finalEnergyShieldRechargeDelay = Math.max(0.25, 1 - (gearBase.energyShieldRechargeFaster + gearExplicit.energyShieldRechargeFaster + passive.energyShieldRechargeFaster + season.energyShieldRechargeFaster + ascend.energyShieldRechargeFaster + support.energyShieldRechargeFaster + reward.energyShieldRechargeFaster));
    let referenceIncomingPhysical = Math.max(1, Math.floor((2 + ((getZone(game.currentZoneId) || { tier: 1 }).tier || 1) * 3.1)));
    let armorReduction = getArmorPhysicalReductionPct(finalArmor, referenceIncomingPhysical);
    let enemyAccuracy = Math.max(60, Math.floor(90 + ((getZone(game.currentZoneId) || { tier: 1 }).tier || 1) * 24));
    let evadeChance = getEvasionChancePct(finalEvasion, enemyAccuracy);
    let finalDeflectChance = Math.max(0, gearBase.deflectChance + gearExplicit.deflectChance + passive.deflectChance + season.deflectChance + ascend.deflectChance + support.deflectChance + reward.deflectChance);
    let finalDeflectDamageReduce = Math.max(0, gearBase.deflectDamageReduce + gearExplicit.deflectDamageReduce + passive.deflectDamageReduce + season.deflectDamageReduce + ascend.deflectDamageReduce + support.deflectDamageReduce + reward.deflectDamageReduce);

    let finalCritDmg = 150 + gearBase.critDmg + gearExplicit.critDmg + passive.critDmg + season.critDmg + ascend.critDmg + support.critDmg + reward.critDmg + (skill.critDmgBonus || 0) + (activeShadowStealth ? Math.max(0, Number(uniqueDeflectStealth.critDmg || 20)) : 0);
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
    let genericTakenDamageReducePct = Math.max(0, Math.min(90, (gearBase.genericTakenDamageReducePct || 0) + (gearExplicit.genericTakenDamageReducePct || 0) + (passive.genericTakenDamageReducePct || 0) + (season.genericTakenDamageReducePct || 0) + (ascend.genericTakenDamageReducePct || 0) + (support.genericTakenDamageReducePct || 0) + (reward.genericTakenDamageReducePct || 0)));
    genericTakenDamageMultiplier *= (1 - genericTakenDamageReducePct / 100);
    let bossDamageDealtMultiplier = 1;
    let bossTakenDamageMultiplier = 1;
    let ailmentResistBonusPct = 0;
    let swiftOpeningTakenMultiplier = 1;
    let guardianReflectDamage = 0;
    let guardianBlockChance = 0;
    let guardianArmorDamageBonus = false;
    let sbSummonAspdBonus = 0;
    let sbSummonCapBonus = 0;
    let sbPlayerDamageFromSummonPct = 0;
    let sbSummonDamageFromPlayerPct = 0;
    let ailmentResistPenPct = 0;
    let crusaderLightningIgnoreRes = false;
    let crusaderNoResPenOnLightning = false;
    let crusaderHolyFlatDmg = 0;
    let crusaderHolyScaledDmg = 0;
    let baseDsFromSources = gearBase.ds + gearExplicit.ds + passive.ds + season.ds + ascend.ds + support.ds + reward.ds;
    let skillDsBonus = skill.dsBonus || 0;
    let finalDs = baseDsFromSources + skillDsBonus;
    let finalSlamEchoChance = gearBase.slamEchoChance + gearExplicit.slamEchoChance + passive.slamEchoChance + season.slamEchoChance + ascend.slamEchoChance + support.slamEchoChance + reward.slamEchoChance;
    let finalSlamEchoDamagePct = Math.max(0, coreCubeSlamEchoDamagePct || 0);
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
    let finalCritResist = (gearBase.critResist || 0) + (gearExplicit.critResist || 0) + (passive.critResist || 0) + (season.critResist || 0) + (ascend.critResist || 0) + (support.critResist || 0) + (reward.critResist || 0);
    let finalIgniteDamageReducePct = gearBase.igniteDamageReducePct + gearExplicit.igniteDamageReducePct + passive.igniteDamageReducePct + season.igniteDamageReducePct + ascend.igniteDamageReducePct + support.igniteDamageReducePct + reward.igniteDamageReducePct;
    let finalBleedDamageReducePct = gearBase.bleedDamageReducePct + gearExplicit.bleedDamageReducePct + passive.bleedDamageReducePct + season.bleedDamageReducePct + ascend.bleedDamageReducePct + support.bleedDamageReducePct + reward.bleedDamageReducePct;
    let finalPoisonDamageReducePct = gearBase.poisonDamageReducePct + gearExplicit.poisonDamageReducePct + passive.poisonDamageReducePct + season.poisonDamageReducePct + ascend.poisonDamageReducePct + support.poisonDamageReducePct + reward.poisonDamageReducePct;
    let finalDotTakenDamageReducePct = gearBase.dotTakenDamageReducePct + gearExplicit.dotTakenDamageReducePct + passive.dotTakenDamageReducePct + season.dotTakenDamageReducePct + ascend.dotTakenDamageReducePct + support.dotTakenDamageReducePct + reward.dotTakenDamageReducePct;
    let finalTakenDamageReduceWhen2EnemiesPct = gearBase.takenDamageReduceWhen2EnemiesPct + gearExplicit.takenDamageReduceWhen2EnemiesPct + passive.takenDamageReduceWhen2EnemiesPct + season.takenDamageReduceWhen2EnemiesPct + ascend.takenDamageReduceWhen2EnemiesPct + support.takenDamageReduceWhen2EnemiesPct + reward.takenDamageReduceWhen2EnemiesPct;
    let finalTakenDamageReduceWhen1EnemyPct = gearBase.takenDamageReduceWhen1EnemyPct + gearExplicit.takenDamageReduceWhen1EnemyPct + passive.takenDamageReduceWhen1EnemyPct + season.takenDamageReduceWhen1EnemyPct + ascend.takenDamageReduceWhen1EnemyPct + support.takenDamageReduceWhen1EnemyPct + reward.takenDamageReduceWhen1EnemyPct;
    let finalIgniteDamageMultiplierPct = gearBase.igniteDamageMultiplierPct + gearExplicit.igniteDamageMultiplierPct + passive.igniteDamageMultiplierPct + season.igniteDamageMultiplierPct + ascend.igniteDamageMultiplierPct + support.igniteDamageMultiplierPct + reward.igniteDamageMultiplierPct;
    let finalPoisonDamageMultiplierPct = gearExplicit.poisonDamageMultiplierPct + passive.poisonDamageMultiplierPct + season.poisonDamageMultiplierPct + ascend.poisonDamageMultiplierPct + support.poisonDamageMultiplierPct + reward.poisonDamageMultiplierPct;
    let finalShockEffectBonusPct = (gearExplicit.shockEffect || 0) + (passive.shockEffect || 0) + (season.shockEffect || 0) + (ascend.shockEffect || 0) + (reward.shockEffect || 0) + Math.max(0, Number(uniqueShockTracer && uniqueShockTracer.shockEffectPct || 0));
    let finalMinDmgRoll = Math.max(5, 80 + gearBase.minDmgRoll + gearExplicit.minDmgRoll + passive.minDmgRoll + season.minDmgRoll + ascend.minDmgRoll + support.minDmgRoll + reward.minDmgRoll);
    let finalMaxDmgRoll = Math.max(finalMinDmgRoll, 100 + gearBase.maxDmgRoll + gearExplicit.maxDmgRoll + passive.maxDmgRoll + season.maxDmgRoll + ascend.maxDmgRoll + support.maxDmgRoll + reward.maxDmgRoll);
    if (uniqueMaxHpPct) finalMaxHp = Math.floor(finalMaxHp * (1 + Math.max(0, uniqueMaxHpPct) / 100));
    if (uniqueMeleeArmorAmp && (game.uniqueMeleeArmorAmpExpiresAt || 0) > Date.now()) {
        let stacks = Math.max(0, Math.min(Math.floor(uniqueMeleeArmorAmp.maxStacks || 3), Math.floor(game.uniqueMeleeArmorAmpStacks || 0)));
        if (stacks > 0) finalArmor = Math.floor(finalArmor * Math.pow(1 + Math.max(0, Number(uniqueMeleeArmorAmp.ampPct || 5)) / 100, stacks));
    }
    if (uniqueMinRollEqualsMaxRoll) {
        finalMaxDmgRoll = getAbsoluteFloorDamageRoll(finalMaxDmgRoll);
        finalMinDmgRoll = finalMaxDmgRoll;
    }
    if (uniqueHpToPhysPct && skill.ele === 'phys' && !skillHasElementalConversion) finalBaseDmg = Math.floor(finalBaseDmg * (1 + (finalMaxHp / 100) / 100));

    let resistPenalty = (game.maxZoneId >= 5 ? 30 : 0) + (game.maxZoneId >= 10 ? 30 : 0);
    let resistanceBlendBonus = 0;
    let resistanceBlendMaxBonus = 0;
    let crusaderLightningMaxResBonus = 0;
    let elementalistResistanceShift = { resF: 0, resC: 0, resL: 0, resChaos: 0 };
    let elementalistChaosConversionBonus = 0;
    let finalMaxResF = Math.min(90, 75 + gearBase.maxResF + gearExplicit.maxResF + passive.maxResF + season.maxResF + ascend.maxResF + support.maxResF + reward.maxResF);
    let finalMaxResC = Math.min(90, 75 + gearBase.maxResC + gearExplicit.maxResC + passive.maxResC + season.maxResC + ascend.maxResC + support.maxResC + reward.maxResC);
    let finalMaxResL = Math.min(90, 75 + gearBase.maxResL + gearExplicit.maxResL + passive.maxResL + season.maxResL + ascend.maxResL + support.maxResL + reward.maxResL);
    let finalMaxResChaos = Math.min(90, 75 + gearBase.maxResChaos + gearExplicit.maxResChaos + passive.maxResChaos + season.maxResChaos + ascend.maxResChaos + support.maxResChaos + reward.maxResChaos);
    let hasElementalistPrismaticShell = game.ascendClass === 'elementalist' && hasKeystone('e2');
    if (hasElementalistPrismaticShell) {
        elementalistResistanceShift = { resF: 15, resC: 15, resL: 15, resChaos: -10 };
        finalMaxResF = Math.min(90, finalMaxResF + 3);
        finalMaxResC = Math.min(90, finalMaxResC + 3);
        finalMaxResL = Math.min(90, finalMaxResL + 3);
    }
    let rawResF = gearBase.resF + gearExplicit.resF + passive.resF + season.resF + ascend.resF + support.resF + reward.resF + elementalistResistanceShift.resF - resistPenalty;
    let rawResC = gearBase.resC + gearExplicit.resC + passive.resC + season.resC + ascend.resC + support.resC + reward.resC + elementalistResistanceShift.resC - resistPenalty;
    let rawResL = gearBase.resL + gearExplicit.resL + passive.resL + season.resL + ascend.resL + support.resL + reward.resL + elementalistResistanceShift.resL - resistPenalty;
    let rawResChaos = gearBase.resChaos + gearExplicit.resChaos + passive.resChaos + season.resChaos + ascend.resChaos + support.resChaos + reward.resChaos + elementalistResistanceShift.resChaos - resistPenalty;
    if (uniqueRegenRateAndRegen) { finalRegen += Number(uniqueRegenRateAndRegen.regen || 0); finalRegen *= (1 + Math.max(0, Number(uniqueRegenRateAndRegen.regenRatePct || 0)) / 100); }
    if (uniqueAllMaxRes) { finalMaxResF += uniqueAllMaxRes; finalMaxResC += uniqueAllMaxRes; finalMaxResL += uniqueAllMaxRes; }
    if (uniqueEnemyRegenCutAndMinRoll) finalMinDmgRoll += Number(uniqueEnemyRegenCutAndMinRoll.minRoll || 0);
    if (game.ascendClass === 'catalyst' && hasKeystone('ct2')) {
        resistanceBlendBonus = Math.max(0, dotPctDmg) * 0.1;
        resistanceBlendMaxBonus = Math.floor(Math.max(0, dotPctDmg) * 0.01);
        rawResF += resistanceBlendBonus; rawResC += resistanceBlendBonus; rawResL += resistanceBlendBonus; rawResChaos += resistanceBlendBonus;
        finalMaxResF = Math.min(90, finalMaxResF + resistanceBlendMaxBonus);
        finalMaxResC = Math.min(90, finalMaxResC + resistanceBlendMaxBonus);
        finalMaxResL = Math.min(90, finalMaxResL + resistanceBlendMaxBonus);
        finalMaxResChaos = Math.min(90, finalMaxResChaos + resistanceBlendMaxBonus);
    }
    let finalResF = Math.min(finalMaxResF, rawResF);
    let finalResC = Math.min(finalMaxResC, rawResC);
    let finalResL = Math.min(finalMaxResL, rawResL);
    let warlockElementalOvercapToChaos = (game.ascendClass === 'warlock' && hasKeystone('wlk4'))
        ? (Math.max(0, rawResF - finalMaxResF) + Math.max(0, rawResC - finalMaxResC) + Math.max(0, rawResL - finalMaxResL)) * 0.25
        : 0;
    let finalResChaos = Math.min(finalMaxResChaos, rawResChaos + warlockElementalOvercapToChaos);
    if (activeUniqueIds.has('uj_burning_will')) {
        let overcapFire = Math.max(0, rawResF - finalMaxResF);
        finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.min(0.35, overcapFire * 0.005)));
    }
    let regenScaledBonus = 1 + Math.max(0, finalRegen * (skill.regenDmgScale || 0) / 100);
    let fireResOvercap = Math.max(0, rawResF - finalMaxResF);
    let fireResOvercapCap = Number.isFinite(Number(skill.fireResOvercapCap)) ? Math.max(0, Number(skill.fireResOvercapCap)) : Infinity;
    let effectiveFireResOvercap = Math.min(fireResOvercap, fireResOvercapCap);
    let fireResOvercapAdditiveMultiplier = Math.max(0, skill.fireResOvercapMulPerPct || 0);
    let fireResScaledBonus = fireResOvercapAdditiveMultiplier > 0
        ? 1 + (effectiveFireResOvercap * fireResOvercapAdditiveMultiplier)
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
    if (uniqueVenomStride) finalDamageMultiplier *= 1.30;
    if (uniqueWarcryResonancePct>0){ let now=Date.now(); let c=(Array.isArray(game.playerConditionBuffs)?game.playerConditionBuffs:[]).filter(b=>b&&b.type==='warcry'&&(b.expiresAt||0)>now).length; if(c>0) finalDamageMultiplier*=(1+(c*uniqueWarcryResonancePct)/100);}
    if (uniqueCurseCrownPerCursePct>0){ let e=(game.enemies||[]).find(x=>x&&x.hp>0); let n=0; if(e&&game.enemyConditionDebuffs&&Array.isArray(game.enemyConditionDebuffs[e.id])) n=game.enemyConditionDebuffs[e.id].length; if(n>0) finalDamageMultiplier*=(1+(n*uniqueCurseCrownPerCursePct)/100);}
    finalBaseDmg = Math.floor(finalBaseDmg * regenScaledBonus * fireResScaledBonus);
    if (uniqueFlatDmgPerLevel > 0) finalBaseDmg += Math.floor(Math.max(1, game.level || 1) * uniqueFlatDmgPerLevel);
    talismanEntries.forEach(entry => {
        let t = entry.talisman; if (!t) return;
        if (t.special === 'moment') {
            let roll = typeof getTalismanMomentRoll === 'function' ? getTalismanMomentRoll(t) : (t.bossFinalDmgRoll || t.bossFinalDmgValue || t.bossFinalDmgMin || 5);
            talismanBossFinalDmgBonusPct = Math.max(talismanBossFinalDmgBonusPct, roll);
        }
    });
    let damageScales = {
        hpFlatBonus: hpFlatBonus,
        hpScaleRatio: hpScaleRatio,
        regen: regenScaledBonus,
        fireRes: fireResScaledBonus,
        fireResOvercap: fireResOvercap,
        effectiveFireResOvercap: effectiveFireResOvercap,
        fireResOvercapCap: fireResOvercapCap,
        rawResF: rawResF,
        fireResOvercapAdditiveMultiplier: fireResOvercapAdditiveMultiplier,
        dot: dotMultiplier,
        dotStat: dotStatMultiplier,
        randomElementDamagePct: randomElementDamagePct,
        crusaderThunderDoctrinePct: crusaderThunderDoctrinePct,
        talismanBossFinalDmgBonusPct: talismanBossFinalDmgBonusPct
    };
    let suppCap = 2 + gearBase.suppCap + gearExplicit.suppCap + passive.suppCap + season.suppCap + ascend.suppCap + reward.suppCap;
    if (uniqueResonanceAndSuppCap) suppCap += Math.floor(uniqueResonanceAndSuppCap.suppCap || 0);

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
    } else if (game.ascendClass === 'hunter') {
        if (hasKeystone('h3')) finalEvasion = Math.floor(finalEvasion * (1 + Math.max(0, finalMove) * 0.002));
        if (hasKeystone('h5')) { finalCritDmg += 250; finalCrit = Math.max(0, finalCrit - 25); }
        if (hasKeystone('h6') && Array.isArray(skill.tags) && skill.tags.includes('projectile')) {
            skill.targets = Math.min(12, Math.max(1, (skill.targets || 1) + 1));
            totalProjectileExtraShots += 1;
        }
        if (hasKeystone('h7')) {
            let solitaryOriginalTargets = Math.max(1, Math.floor(skill.targets || 1));
            finalDs += getSolitaryHuntDoubleStrikeBonus(solitaryOriginalTargets);
            skill.targets = 1;
        }
        if (hasKeystone('h8')) {
            let dsAsCrit = Math.max(0, finalDs);
            finalDs = 0;
            finalCrit = Math.min(1000, finalCrit + dsAsCrit);
        }
    } else if (game.ascendClass === 'crusader') {
        if (hasKeystone('cr1')) { finalRegen += 1.5; finalRegen *= 1.4; }
        if (hasKeystone('cr2')) {
            crusaderLightningIgnoreRes = true;
            crusaderNoResPenOnLightning = true;
        }
        if (hasKeystone('cr4')) {
            let previousMaxResL = finalMaxResL;
            finalMaxResL = Math.min(90, finalMaxResL + 3);
            crusaderLightningMaxResBonus = finalMaxResL - previousMaxResL;
        }
        if (hasKeystone('cr5')) {
            finalRegen += 3;
            finalMaxHp = Math.floor(finalMaxHp * 1.1);
            finalArmor = Math.floor(finalArmor * 1.3);
            finalEnergyShield = Math.floor(finalEnergyShield * 1.3);
        }
        if (hasKeystone('cr6') && skill.ele === 'light') finalMaxDmgRoll = Math.floor(finalMaxDmgRoll * 1.5);
        if (hasKeystone('cr7')) {
            let addEs = Math.floor(finalArmor * 0.5);
            let addArmor = Math.floor(finalEnergyShield * 0.5);
            finalEnergyShield += addEs;
            finalArmor += addArmor;
            finalEnergyShieldRechargeDelay = Math.max(0.1, finalEnergyShieldRechargeDelay * 0.5);
        }
        if (hasKeystone('cr3') && skill.ele === 'light') {
            crusaderHolyFlatDmg = Math.floor((Math.max(0, finalEnergyShield) / 100) * Math.max(1, Math.floor(game.level || 1)));
            crusaderHolyScaledDmg = Math.floor(crusaderHolyFlatDmg * baseDamageIncreaseMultiplier);
            finalBaseDmg = Math.max(1, finalBaseDmg + crusaderHolyScaledDmg);
        }
        if (hasKeystone('cr8') && (game.crusaderLightningAegisUntil || 0) > Date.now()) finalBaseDmg = Math.floor(finalBaseDmg * (skill.ele === 'light' ? 1.5 : 1));
    } else if (game.ascendClass === 'elementalist') {
        if (hasKeystone('e1')) {
            if (skill.ele === 'phys' && !skillHasElementalConversion) finalBaseDmg = 0;
            else finalDamageMultiplier *= 1.15;
        }
        if (hasKeystone('e3')) {
            finalMaxHp = Math.floor(finalMaxHp * 0.85);
            finalEnergyShieldRegenRate += 10;
            finalEnergyShieldRechargeDelay = 0;
        }
        if (hasKeystone('e4')) { /* 융해 결합: 원소 풀 변환은 skill 생성 직후 적용됨 */ }
        if (hasKeystone('e5')) {
            let maxElemRes = Math.max(finalResF, finalResC, finalResL);
            elementalistChaosConversionBonus = Math.floor(maxElemRes * 0.5);
            finalResChaos = Math.min(finalMaxResChaos, finalResChaos + elementalistChaosConversionBonus);
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
        let inquisitorResonancePower = Math.max(0, Math.floor((game.resonancePower || 0) + runeResonancePower));
        let inquisitorElementalSkill = ['fire', 'cold', 'light'].includes(skill.ele) || (Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0);
        if (hasKeystone('iq1') && inquisitorElementalSkill) finalBaseDmg = Math.floor(finalBaseDmg * (1 + (inquisitorResonancePower * 0.5) / 100));
        if (hasKeystone('iq2')) {
            finalCrit = Math.max(0, finalCrit - 8);
            finalCritDmg += 75;
        }
        if (hasKeystone('iq5')) { finalResPen += 20; if (skill.ele === 'phys' && !skillHasElementalConversion) finalBaseDmg = 0; }
        if (hasKeystone('iq6')) {
            suppCap += 1 + Math.floor(inquisitorResonancePower / 25);
            finalMaxHp = Math.floor(finalMaxHp * 0.75);
        }
        if (hasKeystone('iq7')) finalCritDmg += inquisitorResonancePower;
        if (hasKeystone('iq8') && inquisitorElementalSkill) finalBaseDmg = Math.floor(finalBaseDmg * (1 + Math.max(0, finalResPen) / 100));
    } else if (game.ascendClass === 'soulbinder') {
        if (hasKeystone('sb4')) { sbSummonAspdBonus += 15; sbSummonCapBonus += 1; }
        if (hasKeystone('sb8')) sbSummonCapBonus += 3;
        if (hasKeystone('sb6')) finalResPen += 16;
        if (hasKeystone('sb5')) {
            let sumFlat = Math.max(0, (gearBase.summonFlatDmg || 0) + (gearExplicit.summonFlatDmg || 0) + (passive.summonFlatDmg || 0) + (season.summonFlatDmg || 0) + (ascend.summonFlatDmg || 0) + (support.summonFlatDmg || 0) + (reward.summonFlatDmg || 0));
            let sumPct = Math.max(0, (gearBase.summonPctDmg || 0) + (gearExplicit.summonPctDmg || 0) + (passive.summonPctDmg || 0) + (season.summonPctDmg || 0) + (ascend.summonPctDmg || 0) + (support.summonPctDmg || 0) + (reward.summonPctDmg || 0));
            let sumCrit = Math.max(0, (gearBase.summonCrit || 0) + (gearExplicit.summonCrit || 0) + (passive.summonCrit || 0) + (season.summonCrit || 0) + (ascend.summonCrit || 0) + (support.summonCrit || 0) + (reward.summonCrit || 0));
            let sumCritDmg = Math.max(0, (gearBase.summonCritDmg || 0) + (gearExplicit.summonCritDmg || 0) + (passive.summonCritDmg || 0) + (season.summonCritDmg || 0) + (ascend.summonCritDmg || 0) + (support.summonCritDmg || 0) + (reward.summonCritDmg || 0));
            let sumAspd = Math.max(0, (gearBase.summonAspd || 0) + (gearExplicit.summonAspd || 0) + (passive.summonAspd || 0) + (season.summonAspd || 0) + (ascend.summonAspd || 0) + (support.summonAspd || 0) + (reward.summonAspd || 0));
            finalBaseDmg += Math.floor(sumFlat);
            finalBaseDmg = Math.floor(finalBaseDmg * (1 + sumPct / 100));
            finalCrit += sumCrit;
            finalCritDmg += sumCritDmg;
            finalAspd = Math.max(0.1, finalAspd * (1 + sumAspd / 100));
        }
        if (hasKeystone('sb7')) {
            if (!hasKeystone('sb5')) sbPlayerDamageFromSummonPct += 0.5;
            sbSummonDamageFromPlayerPct += Math.max(0, generalPctDmg * 0.5);
        }
    } else if (game.ascendClass === 'catalyst') {
        if (hasKeystone('ct4')) {
            finalMove *= 1.2;
            finalCritDmg += 25;
            finalEvasion = Math.floor(finalEvasion * 1.2);
        }
        if (hasKeystone('ct6')) {
            totalDotDamageMultiplier *= 2;
            dotDurationMultiplier *= 0.5;
        }
        if (hasKeystone('ct7')) {
            let convertedCritChance = Math.max(0, finalCrit);
            let convertedCritDamage = Math.max(0, finalCritDmg) * 0.2;
            totalDotDamageMultiplier *= (1 + (convertedCritChance + convertedCritDamage) / 100);
            if (Array.isArray(skill.tags) && skill.tags.includes('attack')) finalCrit = 100;
            finalCritDmg = 100 + Math.max(0, (totalDotDamageMultiplier - 1) * 100 * 0.2);
        }
    }

    finalCritDmg = Math.max(0, finalCritDmg);
    armorReduction = getArmorPhysicalReductionPct(finalArmor, referenceIncomingPhysical);
    evadeChance = getEvasionChancePct(finalEvasion, enemyAccuracy);

    damageScales.dot = dotMultiplier;
    damageScales.dotStat = dotStatMultiplier;
    damageScales.instantDamageMultiplier = instantDamageMultiplier;
    damageScales.finalDamageMultiplier = finalDamageMultiplier;
    damageScales.ailmentPowerMultiplier = ailmentPowerMultiplier;
    damageScales.chaosDamageMultiplier = chaosDamageMultiplier;
    damageScales.dotTickIntervalMultiplier = dotTickIntervalMultiplier;
    damageScales.dotDurationMultiplier = dotDurationMultiplier;
    damageScales.warlockElementalOvercapToChaos = warlockElementalOvercapToChaos;

    if (game.ascendClass === 'hunter' && hasKeystone('h8')) finalCrit = Math.min(1000, finalCrit);
    else finalCrit = Math.min(100, finalCrit);
    if (skill.cannotCrit && !(game.ascendClass === 'catalyst' && hasKeystone('ct7') && Array.isArray(skill.tags) && skill.tags.includes('attack'))) finalCrit = 0;
    if (uniqueFateTwinRollSync) {
        let critForTwin = Math.max(0, finalCrit);
        let v = Math.max(finalMinDmgRoll, finalMaxDmgRoll) + (critForTwin * 0.2);
        finalMinDmgRoll = v;
        finalMaxDmgRoll = v;
    }
    critChance = Math.max(0, Math.min(1, finalCrit / 100));
    critMulti = finalCritDmg / 100;
    if (game.ascendClass === 'hunter' && hasKeystone('h8')) {
        let expectedCritCount = Math.max(0, finalCrit / 100);
        avgHit = finalBaseDmg * (1 + ((Math.max(1, critMulti) - 1) * expectedCritCount));
    } else {
        avgHit = finalBaseDmg * (1 - critChance) + finalBaseDmg * critChance * critMulti;
    }
    finalDps = avgHit * finalAspd;

    let avgRollMultiplier = Math.max(0.05, (finalMinDmgRoll + finalMaxDmgRoll) / 200);
    let expectedDoubleStrikeMultiplier = Math.max(1, 1 + (Math.max(0, finalDs) / 100));
    let coreCubeAddedDamageLabels = { phys: '물리', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스' };
    let coreCubeAddedDamageTotalPct = Math.max(0, Object.values(coreCubeAddedDamagePct).reduce((sum, value) => sum + (Number(value) || 0), 0));
    let coreCubeAddedDamageParts = Object.keys(coreCubeAddedDamagePct)
        .filter(ele => Math.max(0, Number(coreCubeAddedDamagePct[ele] || 0)) > 0)
        .map(ele => `${coreCubeAddedDamageLabels[ele]} ${Math.floor(coreCubeAddedDamagePct[ele])}%`);
    let expectedAddedDamageMultiplier = 1 + coreCubeAddedDamageTotalPct / 100;
    if (expectedAddedDamageMultiplier > 1) damageScales.coreCubeAddedDamageMultiplier = expectedAddedDamageMultiplier;
    let soulbinderSb7PlayerMul = 1;
    if (game.ascendClass === 'soulbinder' && hasKeystone('sb7')) {
        soulbinderSb7PlayerMul += Math.max(0, (sbPlayerDamageFromSummonPct || 0) * ((gearBase.summonPctDmg || 0) + (gearExplicit.summonPctDmg || 0) + (passive.summonPctDmg || 0) + (season.summonPctDmg || 0) + (ascend.summonPctDmg || 0) + (support.summonPctDmg || 0) + (reward.summonPctDmg || 0)) / 100);
    }
    let dpsDamageMultiplier = instantDamageMultiplier * finalDamageMultiplier * (skill.ele === 'chaos' ? chaosDamageMultiplier : 1) * soulbinderSb7PlayerMul;
    let finalDpsAdjusted = finalDps * avgRollMultiplier * expectedDoubleStrikeMultiplier * dpsDamageMultiplier * expectedAddedDamageMultiplier;
    let isProjectileSkillForDps = Array.isArray(skill.tags) && skill.tags.includes('projectile');
    let projectileExtraShotsForDps = isProjectileSkillForDps ? Math.max(0, Math.min(5, Math.floor(totalProjectileExtraShots || 0))) : 0;
    let projectileExtraShotDpsMul = 1 + projectileExtraShotsForDps;
    let finalDpsWithProjectileShots = finalDpsAdjusted * projectileExtraShotDpsMul;
    let estimatedSkillDotDps = 0;
    if (isDotSkill) {
        let dotTickInterval = DOT_TICK_INTERVAL * Math.max(0.05, dotTickIntervalMultiplier);
        let dotDuration = DOT_EFFECT_DURATION * Math.max(0.05, dotDurationMultiplier);
        let expectedDotStackRate = finalAspd * expectedDoubleStrikeMultiplier;
        let expectedDotStacks = Math.max(1, Math.min(DOT_STACK_MAX, Math.floor(expectedDotStackRate * dotDuration)));
        let expectedDotStackMultiplier = getDotStackMultiplier(expectedDotStacks);
        let expectedDotSourceHit = avgHit * avgRollMultiplier * (skill.ele === 'chaos' ? chaosDamageMultiplier : 1) * soulbinderSb7PlayerMul;
        estimatedSkillDotDps = Math.max(0, expectedDotSourceHit * DOT_TICK_FROM_HIT_RATIO * totalDotDamageMultiplier * expectedDotStackMultiplier / Math.max(0.02, dotTickInterval));
        damageScales.estimatedDotStackRate = expectedDotStackRate;
        damageScales.estimatedDotStacks = expectedDotStacks;
        damageScales.estimatedDotStackMultiplier = expectedDotStackMultiplier;
        damageScales.estimatedSkillDotDps = estimatedSkillDotDps;
    }
    let finalPlayerSkillDps = finalDpsWithProjectileShots + estimatedSkillDotDps;
    // 재능 개화 키스톤: 상시 피해 배율을 표시 DPS에 반영(조건부는 툴팁에 별도 표기)
    let talentDpsSummary = (typeof getTalentKeystoneDamageSummary === 'function') ? getTalentKeystoneDamageSummary() : { alwaysMul: 1, conditional: [] };
    if (talentDpsSummary.alwaysMul !== 1) finalPlayerSkillDps *= talentDpsSummary.alwaysMul;
    let flameDecayIgniteTakenMultiplierPreview = skill.flameDecayDebuff ? getFlameDecayIgniteTakenMultiplier({ maxHp: finalMaxHp, sSkill: skill }) : 1;
    let flameDecayDpsLines = [];
    if (skill.flameDecayDebuff) {
        flameDecayDpsLines = [
            `화염 부패 기대 지속 DPS ${Math.floor(estimatedSkillDotDps)} (생명력/초과 화염 저항/지속 피해 배율 적용, 적 저항 적용 전)`,
            `생명력 계수: 최대 생명력 ${Math.floor(finalMaxHp)} → 내장 피해 +${Math.floor(hpFlatBonus)}`,
            (skill.regenDmgScale || 0) > 0 ? `생명력 재생 계수: ${regenScaledBonus.toFixed(2)}x (재생 ${formatValue('regen', finalRegen)}%)` : null,
            `초과 화염 저항 계수: ${fireResScaledBonus.toFixed(2)}x (미적용 화염 저항 ${Math.floor(rawResF)}% / 최대 ${Math.floor(finalMaxResF)}%, 초과 ${fireResOvercap.toFixed(1)}% 중 적용 ${effectiveFireResOvercap.toFixed(1)}%)`,
            `지속 피해 총 배율: ${totalDotDamageMultiplier.toFixed(2)}x (스킬 ${dotMultiplier.toFixed(2)}x · 스탯 ${dotStatMultiplier.toFixed(2)}x)`,
            `화염 부패 대상 점화 피해 증폭: ${flameDecayIgniteTakenMultiplierPreview.toFixed(2)}x (생명력 100당 ${(Math.max(0, Number(skill.igniteTakenHpScalePer100 || 0)) * 100).toFixed(1)}%, 최대 ${(Math.max(1, Number(skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1)}x)`,
            `실제 적별 화염 부패 DPS는 적 상태이상 툴팁에서 저항/심연 배율까지 반영해 표시됩니다.`
        ].filter(Boolean);
    }

    function makeAilmentChanceBreakdown(title, statId, finalValue, critValue, note, effectLines) {
        return {
            title: title,
            lines: [
                makeSourceLine('장비', (gearBase[statId] || 0) + (gearExplicit[statId] || 0), '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', (passive[statId] || 0) + (season[statId] || 0) + (ascend[statId] || 0) + (reward[statId] || 0), '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조 젬', support[statId] || 0, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('성좌 각성', starBlessing[statId] || 0, '%', value => `${value.toFixed(1)}%`),
                note || `치명타 시 해당 상태 이상 확률: ${Math.floor(critValue)}%`,
                note ? null : '비치명타는 위 확률을 사용하며, 치명타는 해당 상태 이상 확률에 +25%가 추가됩니다.',
                ...(effectLines || [])
            ].filter(Boolean),
            final: `${Math.max(0, finalValue).toFixed(1)}%`
        };
    }

    function makeAilmentResistBreakdown(title, ailmentLabel, ailmentResValue, finalValue, mitigationLines) {
        return {
            title: title,
            lines: [
                makeSourceLine(`${ailmentLabel} 방지 확률`, finalValue, '%', value => `${Math.max(0, value).toFixed(1)}%`),
                `계산 기준: ${ailmentLabel} 방지 옵션 ${Number(ailmentResValue || 0).toFixed(1)}% + 공통 방지 ${Math.floor(ailmentResistBonusPct)}%`,
                medicineResistanceAilmentBonus.ignite > 0 || medicineResistanceAilmentBonus.freeze > 0 || medicineResistanceAilmentBonus.shock > 0
                    ? `약품 내성: 최고 비-제한 원소 저항 상태이상 방지 +100% (점화 ${medicineResistanceAilmentBonus.ignite}% / 냉각·동결 ${medicineResistanceAilmentBonus.freeze}% / 감전 ${medicineResistanceAilmentBonus.shock}%)`
                    : null,
                ...(mitigationLines || []),
                '피해 저항(화염/냉기/번개/카오스/물리 피해 감소)은 상태이상 방지 확률에 직접 합산되지 않습니다.'
            ].filter(Boolean),
            final: `${Math.max(0, finalValue).toFixed(1)}%`
        };
    }


    let cw = (game && game.colony && Array.isArray(game.colony.wardEquipped)) ? game.colony.wardEquipped : [];
    let cwSlots = Math.max(1, Math.min(4, Math.floor((game && game.colony && game.colony.wardSlots) || 1)));
    if (game && game.colony) game.colony.wardSlots = cwSlots;
    cw.slice(0, cwSlots).forEach(w => { if (w && w.stat) colonyWardBonus[w.stat] = (colonyWardBonus[w.stat] || 0) + Number(w.val || 0); });
    finalMaxResF = Math.min(90, finalMaxResF + (colonyWardBonus.maxResF || 0));
    finalMaxResC = Math.min(90, finalMaxResC + (colonyWardBonus.maxResC || 0));
    finalMaxResL = Math.min(90, finalMaxResL + (colonyWardBonus.maxResL || 0));
    finalMaxResChaos = Math.min(90, finalMaxResChaos + (colonyWardBonus.maxResChaos || 0));
    finalMaxHp += (colonyWardBonus.flatHp || 0);
    finalArmor += (colonyWardBonus.armor || 0);
    finalEvasion += (colonyWardBonus.evasion || 0);
    let riderCompassEvasionMorePct = uniqueRiderCompass && finalMove >= 200 ? 20 : 0;
    if (riderCompassEvasionMorePct > 0) finalEvasion = Math.floor(finalEvasion * (1 + riderCompassEvasionMorePct / 100));
    armorReduction = getArmorPhysicalReductionPct(finalArmor, referenceIncomingPhysical);
    evadeChance = getEvasionChancePct(finalEvasion, enemyAccuracy);
    finalEnergyShield += (colonyWardBonus.energyShield || 0);
    finalDr = Math.min(75, finalDr + (colonyWardBonus.dr || 0));
    finalResF = Math.min(finalMaxResF, finalResF + (colonyWardBonus.resAll || 0));
    finalResC = Math.min(finalMaxResC, finalResC + (colonyWardBonus.resAll || 0));
    finalResL = Math.min(finalMaxResL, finalResL + (colonyWardBonus.resAll || 0));
    finalResChaos = Math.min(finalMaxResChaos, finalResChaos + (colonyWardBonus.resAll || 0) + (colonyWardBonus.resChaos || 0));
    finalRegen += (colonyWardBonus.regenFlat || 0);
    finalEnergyShieldRegenRate += (colonyWardBonus.energyShieldRegen || 0);
    finalCritResist = Math.min(80, finalCritResist + (colonyWardBonus.critResist || 0));
    finalDotTakenDamageReducePct += (colonyWardBonus.dotTakenDamageReducePct || 0);
    finalIgniteDamageReducePct += (colonyWardBonus.igniteDamageReducePct || 0);
    finalBleedDamageReducePct += (colonyWardBonus.bleedDamageReducePct || 0);
    finalPoisonDamageReducePct += (colonyWardBonus.poisonDamageReducePct || 0);
    finalTakenDamageReduceWhen2EnemiesPct += (colonyWardBonus.takenDamageReduceWhen2EnemiesPct || 0);
    finalTakenDamageReduceWhen1EnemyPct += (colonyWardBonus.takenDamageReduceWhen1EnemyPct || 0);

    let uncappedResF = rawResF + (colonyWardBonus.resAll || 0);
    let uncappedResC = rawResC + (colonyWardBonus.resAll || 0);
    let uncappedResL = rawResL + (colonyWardBonus.resAll || 0);
    let uncappedResChaos = rawResChaos + warlockElementalOvercapToChaos + elementalistChaosConversionBonus + (colonyWardBonus.resAll || 0) + (colonyWardBonus.resChaos || 0);
    let medicineResistanceAilmentBonus = { ignite: 0, freeze: 0, shock: 0 };
    if (game.ascendClass === 'catalyst' && hasKeystone('ct2')) {
        let highestUncappedElementalResistance = Math.max(uncappedResF, uncappedResC, uncappedResL);
        if (uncappedResF === highestUncappedElementalResistance) medicineResistanceAilmentBonus.ignite = 100;
        if (uncappedResC === highestUncappedElementalResistance) medicineResistanceAilmentBonus.freeze = 100;
        if (uncappedResL === highestUncappedElementalResistance) medicineResistanceAilmentBonus.shock = 100;
    }

    let ailResIgniteTotal = (gearBase.ailResIgnite || 0) + (gearExplicit.ailResIgnite || 0) + (passive.ailResIgnite || 0) + (season.ailResIgnite || 0) + (ascend.ailResIgnite || 0) + (reward.ailResIgnite || 0) + (colonyWardBonus.ailResIgnite || 0) + medicineResistanceAilmentBonus.ignite;
    let ailResFreezeTotal = (gearBase.ailResFreeze || 0) + (gearExplicit.ailResFreeze || 0) + (passive.ailResFreeze || 0) + (season.ailResFreeze || 0) + (ascend.ailResFreeze || 0) + (reward.ailResFreeze || 0) + (colonyWardBonus.ailResFreeze || 0) + medicineResistanceAilmentBonus.freeze;
    let ailResShockTotal = (gearBase.ailResShock || 0) + (gearExplicit.ailResShock || 0) + (passive.ailResShock || 0) + (season.ailResShock || 0) + (ascend.ailResShock || 0) + (reward.ailResShock || 0) + (colonyWardBonus.ailResShock || 0) + medicineResistanceAilmentBonus.shock;
    let ailResPoisonTotal = (gearBase.ailResPoison || 0) + (gearExplicit.ailResPoison || 0) + (passive.ailResPoison || 0) + (season.ailResPoison || 0) + (ascend.ailResPoison || 0) + (reward.ailResPoison || 0) + (colonyWardBonus.ailResPoison || 0);
    let ailResBleedTotal = (gearBase.ailResBleed || 0) + (gearExplicit.ailResBleed || 0) + (passive.ailResBleed || 0) + (season.ailResBleed || 0) + (ascend.ailResBleed || 0) + (reward.ailResBleed || 0) + (colonyWardBonus.ailResBleed || 0);
    let finalAilmentResistIgniteChance = getPlayerAilmentResistChance('ignite', { ailResIgnite: ailResIgniteTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistChillChance = getPlayerAilmentResistChance('chill', { ailResFreeze: ailResFreezeTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistFreezeChance = getPlayerAilmentResistChance('freeze', { ailResFreeze: ailResFreezeTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistShockChance = getPlayerAilmentResistChance('shock', { ailResShock: ailResShockTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistPoisonChance = getPlayerAilmentResistChance('poison', { ailResPoison: ailResPoisonTotal, ailmentResistBonusPct }) * 100;
    let finalAilmentResistBleedChance = getPlayerAilmentResistChance('bleed', { ailResBleed: ailResBleedTotal, ailmentResistBonusPct }) * 100;
    let catalystAilmentSourceMultiplier = game.ascendClass === 'catalyst' && hasKeystone('ct1') ? 2 : 1;
    let makeDamageAilmentEffectLines = (specificLabel, specificPct) => {
        let specificMultiplier = 1 + Math.max(0, Number(specificPct || 0)) / 100;
        let totalMultiplier = catalystAilmentSourceMultiplier * totalDotDamageMultiplier * specificMultiplier;
        return [
            `지속 피해 배율 스탯: +${Math.max(0, dotPctDmg).toFixed(1)}%`,
            catalystAilmentSourceMultiplier > 1 ? `과잉 촉매 기준 피해: x${catalystAilmentSourceMultiplier.toFixed(2)}` : null,
            totalDotDamageMultiplier !== dotStatMultiplier ? `키스톤·스킬 포함 지속 피해 배율: x${totalDotDamageMultiplier.toFixed(2)}` : null,
            specificPct > 0 ? `${specificLabel}: +${Number(specificPct).toFixed(1)}%` : null,
            `해당 상태이상 피해 총 배율: x${totalMultiplier.toFixed(2)} (기본 대비 +${Math.max(0, (totalMultiplier - 1) * 100).toFixed(1)}%)`
        ].filter(Boolean);
    };
    let makeDamageAilmentMitigationLines = (specificLabel, specificPct) => {
        let common = Math.max(0, Math.min(90, Number(finalDotTakenDamageReducePct || 0)));
        let specific = Math.max(0, Math.min(90, Number(specificPct || 0)));
        let combined = (1 - ((1 - common / 100) * (1 - specific / 100))) * 100;
        return [
            `받는 지속 피해 감소: ${common.toFixed(1)}%`,
            `${specificLabel}: ${specific.toFixed(1)}%`,
            `복합 적용 피해 감소: ${combined.toFixed(1)}%`
        ];
    };


    // 방패 막기 공식
    // 1) 방패 옵션의 막기 확률(%) 증가는 방패 베이스 막기 확률 자체를 상승시킨다.
    // 2) 패시브/키스톤 등 기타 막기 확률(%) 증가는 원본 베이스 막기 확률에서만 %로 증가한다.
    // 3) 막기 확률 +%p는 마지막에 더한다.
    // 4) 최종 상한은 기본 50%, 막기 확률 상한 증가로 최대 75%까지 상승한다.
    let effectiveShieldBaseBlockChance = Math.max(0, shieldBaseBlockChance * (1 + Math.max(0, shieldBlockChancePct) / 100));
    let blockChanceFromOtherPct = Math.max(0,
        guardianBlockChance + gearBase.blockChancePct + passive.blockChancePct + season.blockChancePct + ascend.blockChancePct + support.blockChancePct + reward.blockChancePct
    );
    let flatBlockChanceBonus = Math.max(0, shieldBlockChanceFlat + gearBase.blockChance + passive.blockChance + season.blockChance + ascend.blockChance + support.blockChance + reward.blockChance);
    let finalBlockChanceCap = Math.max(50, Math.min(75, 50 + Math.max(0, sumStatAcrossBuckets('blockChanceMax'))));
    let finalBlockChance = Math.min(finalBlockChanceCap, Math.max(0, effectiveShieldBaseBlockChance + (shieldBaseBlockChance * blockChanceFromOtherPct / 100) + flatBlockChanceBonus));

    function formatSignedPercentagePointLine(label, value) {
        let amount = Number(value || 0);
        if (!amount) return null;
        return `${label} ${amount > 0 ? '+' : ''}${Math.floor(amount)}%p`;
    }

    function formatResistanceSourceLine(label, value) {
        let amount = Number(value || 0);
        if (!amount) return null;
        let rendered = Number.isInteger(amount) ? `${Math.abs(amount)}` : Math.abs(amount).toFixed(1);
        return `${label} ${amount > 0 ? '+' : '-'}${rendered}%`;
    }

    function makeResistanceBreakdown(title, statId, maxStatId, finalValue, maxValue, extraLines, extraMaxLines) {
        let maxGear = (gearBase[maxStatId] || 0) + (gearExplicit[maxStatId] || 0);
        let maxPassive = (passive[maxStatId] || 0) + (season[maxStatId] || 0) + (ascend[maxStatId] || 0) + (reward[maxStatId] || 0);
        return {
            title: title,
            lines: [
                formatResistanceSourceLine('장비', (gearBase[statId] || 0) + (gearExplicit[statId] || 0)),
                formatResistanceSourceLine('패시브', (passive[statId] || 0) + (season[statId] || 0) + (ascend[statId] || 0) + (reward[statId] || 0)),
                formatResistanceSourceLine('보조 젬', support[statId] || 0),
                ...(extraLines || []),
                formatResistanceSourceLine('캠페인 패널티', -resistPenalty),
                `최대 저항: ${Math.floor(maxValue)}% (기본 75%)`,
                formatResistanceSourceLine('최대 저항 · 장비', maxGear),
                formatResistanceSourceLine('최대 저항 · 패시브', maxPassive),
                formatResistanceSourceLine('최대 저항 · 보조 젬', support[maxStatId] || 0),
                ...(extraMaxLines || [])
            ].filter(Boolean),
            final: `${Math.floor(finalValue)}%`
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
                makeSourceLine('태그 보너스', baseTaggedTotal, '%', value => `${Math.floor(value)}%`),
                talentLine('pctDmg'),
                crusaderThunderDoctrinePct > 0 ? makeSourceLine('천뢰 교리(화염/냉기 → 번개)', crusaderThunderDoctrinePct, '%', value => `${Math.floor(value)}%`) : null,
                crusaderThunderDoctrinePct > 0 ? makeSourceLine('피해 증가 합계', generalPctDmg + taggedTotal, '%', value => `${Math.floor(value)}%`) : null,
                taggedSummary.length > 0 ? `적용 태그: ${taggedSummary.join(' / ')}` : null,
                `스킬 배율 ${formatPercentMultiplier(skill.dmg || 1)}`,
                (skill.hpDmgScale || 0) > 0 ? `생명력 계수 내장 피해 +${Math.floor(hpFlatBonus)} (최대 생명력 ${Math.floor(finalMaxHp)}, 피해 증가 적용)` : null,
                crusaderHolyFlatDmg > 0 ? `신성한 검 번개 기본 피해 +${Math.floor(crusaderHolyFlatDmg)} → ${Math.floor(crusaderHolyScaledDmg)} (피해 증가 적용)` : null,
                (skill.regenDmgScale || 0) > 0 ? `재생 계수 배율 ${regenScaledBonus.toFixed(2)}x (재생 ${formatValue('regen', finalRegen)}%)` : null,
                (skill.fireResDmgScale || 0) > 0 ? `화염 저항 계수 배율 ${fireResScaledBonus.toFixed(2)}x (화염 저항 ${Math.floor(finalResF)}%)` : null,
                (skill.fireResOvercapMulPerPct || 0) > 0 ? `초과 화염 저항 계수 배율 ${fireResScaledBonus.toFixed(2)}x (미적용 화염 저항 ${Math.floor(rawResF)}%/${Math.floor(finalMaxResF)}%, 초과 ${fireResOvercap.toFixed(1)}% 중 적용 ${effectiveFireResOvercap.toFixed(1)}%)` : null,
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
                talentLine('aspd'),
                glovePairAspdBonus > 0 ? `동형 장갑 세트 보너스 +${glovePairAspdBonus.toFixed(2)} 기본 공속` : null,
                `스킬 속도 배율 ${formatPercentMultiplier(skill.spd || 1)}`,
                rawAspd > 5 ? `소프트캡 적용중 (원시 ${rawAspd.toFixed(2)} → 최종 ${finalAspd.toFixed(2)})` : null
            ].filter(Boolean),
            final: `${finalAspd.toFixed(2)}`
        },
        crit: {
            title: '치명타 확률',
            lines: [
                `기본 2.5%`,
                makeSourceLine('장비', gearCrit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', passiveCrit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조 젬', support.crit, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('스킬', skill.crit || 0, '%', value => `${value.toFixed(1)}%`),
                talentLine('crit')
            ].filter(Boolean),
            final: `${finalCrit.toFixed(1)}%`
        },
        critDmg: {
            title: '치명타 피해',
            lines: [
                `기본 150%`,
                makeSourceLine('장비', gearBase.critDmg + gearExplicit.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('패시브', passive.critDmg + season.critDmg + ascend.critDmg + reward.critDmg, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('보조 젬', support.critDmg, '%', value => `${Math.floor(value)}%`),
                talentLine('critDmg')
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
                makeSourceLine('보조 젬', support.move, '%', value => `${Math.floor(value)}%`),
                talentLine('move')
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
                makeSourceLine('생명력 증가', totalPctHp, '%', value => `${Math.floor(value)}%`),
                talentLine('pctHp')
            ].filter(Boolean),
            final: `${Math.floor(finalMaxHp)}`
        },
        regen: {
            title: '초당 재생',
            lines: [
                makeSourceLine('장비', gearBase.regen + gearExplicit.regen, '%', value => `${formatValue('regen', value)}%`),
                makeSourceLine('패시브', passive.regen + season.regen + ascend.regen + reward.regen, '%', value => `${formatValue('regen', value)}%`),
                makeSourceLine('보조 젬', support.regen, '%', value => `${formatValue('regen', value)}%`),
                talentLine('regen')
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
                skill.instantLeech ? '흡혈 타격: 이 젬으로 준 피해의 흡혈은 인스턴스 대신 즉시 회복되며 1회 흡혈량 캡을 적용받습니다.' : `타격 시 즉시 회복 대신 흡혈 인스턴스 생성`,
                (game.ascendClass === 'warlock' && hasKeystone('wlk3')) ? `금단 대가: 흡혈 ${skill.instantLeech ? '즉시 회복이 생명력 대신 에너지 보호막에 적용됩니다.' : '인스턴스가 생명력 대신 에너지 보호막에 저장/회복됩니다.'}` : null,
                `일반 흡혈 캡: 타격당 최대 생명력 ${LEECH_BASE_INSTANCE_CAP_PCT}% · 전체 저장 ${LEECH_BASE_TOTAL_CAP_PCT}% · 인스턴스당 초당 ${LEECH_BASE_RATE_CAP_PCT}%`,
                `일반 흡혈 추가 캡: 회복 속도 +${formatValue('leechRateCap', finalLeechRateCap)}%p · 전체 +${formatValue('leechTotalCap', finalLeechTotalCap)}%p · 타격당 +${formatValue('leechInstanceCap', finalLeechInstanceCap)}%p`,
                `적용 전 ${formatValue('leech', rawLeech)}% → 적용 후 ${formatValue('leech', finalLeech)}%`
            ].filter(Boolean),
            final: `${formatValue('leech', finalLeech)}%`
        },
        ds: {
            title: '연속 타격',
            lines: [
                makeSourceLine('장비', gearBase.ds + gearExplicit.ds, '%p', value => `${Math.floor(value)}%p`),
                makeSourceLine('패시브', passive.ds + season.ds + ascend.ds + reward.ds, '%p', value => `${Math.floor(value)}%p`),
                makeSourceLine('보조 젬', support.ds, '%p', value => `${Math.floor(value)}%p`),
                makeSourceLine('스킬', skillDsBonus, '%p', value => `${Math.floor(value)}%p`),
                formatSignedPercentagePointLine('기타 효과', finalDs - baseDsFromSources - skillDsBonus),
                '각 수치는 연속 타격 확률에 합산되는 %p입니다.'
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
                makeSourceLine('기수의 나침반 증폭', riderCompassEvasionMorePct, '%', value => `${Math.floor(value)}%`),
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
        blockChance: {
            title: '막기 확률',
            lines: [
                makeSourceLine('방패 기본 막기', shieldBaseBlockChance, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('방패 막기 확률 증가', shieldBlockChancePct, '%', value => `${value.toFixed(1)}%`),
                effectiveShieldBaseBlockChance !== shieldBaseBlockChance ? `증가 적용 방패 기본 막기: ${effectiveShieldBaseBlockChance.toFixed(1)}%` : null,
                makeSourceLine('기타 막기 확률 증가', blockChanceFromOtherPct, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('막기 확률 보너스', flatBlockChanceBonus, '%', value => `${value.toFixed(1)}%`),
                `막기 확률 상한: ${finalBlockChanceCap.toFixed(1)}%`,
                '몬스터의 일반 타격 피해를 막으면 해당 타격 피해를 받지 않습니다.'
            ].filter(Boolean),
            final: `${finalBlockChance.toFixed(1)}%`
        },
        blockChanceMax: {
            title: '막기 확률 상한',
            lines: [
                '기본 막기 확률 상한 50%',
                makeSourceLine('상한 증가', Math.max(0, sumStatAcrossBuckets('blockChanceMax')), '%', value => `${value.toFixed(1)}%`),
                '상한 증가는 최대 75%까지 적용됩니다.'
            ],
            final: `${finalBlockChanceCap.toFixed(1)}%`
        },
        deflectChance: {
            title: '빗겨내기 확률',
            lines: [
                makeSourceLine('장비', gearBase.deflectChance + gearExplicit.deflectChance, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', passive.deflectChance + season.deflectChance + ascend.deflectChance + reward.deflectChance, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조 젬', support.deflectChance, '%', value => `${value.toFixed(1)}%`),
                `빗겨내기 성공 시 피해 감소: ${Math.min(85, 40 + finalDeflectDamageReduce).toFixed(1)}%`,
                '기본 피해 감소 40%에 빗겨내기 피해 감소 옵션이 더해지며, 최대 85%까지 적용됩니다.'
            ].filter(Boolean),
            final: `${finalDeflectChance.toFixed(1)}%`
        },
        deflectDamageReduce: {
            title: '빗겨내기 피해 감소',
            lines: [
                makeSourceLine('장비', gearBase.deflectDamageReduce + gearExplicit.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('패시브', passive.deflectDamageReduce + season.deflectDamageReduce + ascend.deflectDamageReduce + reward.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                makeSourceLine('보조 젬', support.deflectDamageReduce, '%', value => `${value.toFixed(1)}%`),
                '실제 감소율은 기본 40% + 이 수치입니다.'
            ].filter(Boolean),
            final: `${finalDeflectDamageReduce.toFixed(1)}%`
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
        resF: makeResistanceBreakdown('화염 저항', 'resF', 'maxResF', finalResF, finalMaxResF, [
            formatResistanceSourceLine('약품 내성', resistanceBlendBonus),
            formatResistanceSourceLine('분광 외피', elementalistResistanceShift.resF),
            formatResistanceSourceLine('군락 수호구', colonyWardBonus.resAll || 0)
        ], [
            formatResistanceSourceLine('최대 저항 · 영역 고유 효과', uniqueAllMaxRes),
            formatResistanceSourceLine('최대 저항 · 약품 내성', resistanceBlendMaxBonus),
            formatResistanceSourceLine('최대 저항 · 분광 외피', hasElementalistPrismaticShell ? 3 : 0),
            formatResistanceSourceLine('최대 저항 · 군락 수호구', colonyWardBonus.maxResF || 0)
        ]),
        resC: makeResistanceBreakdown('냉기 저항', 'resC', 'maxResC', finalResC, finalMaxResC, [
            formatResistanceSourceLine('약품 내성', resistanceBlendBonus),
            formatResistanceSourceLine('분광 외피', elementalistResistanceShift.resC),
            formatResistanceSourceLine('군락 수호구', colonyWardBonus.resAll || 0)
        ], [
            formatResistanceSourceLine('최대 저항 · 영역 고유 효과', uniqueAllMaxRes),
            formatResistanceSourceLine('최대 저항 · 약품 내성', resistanceBlendMaxBonus),
            formatResistanceSourceLine('최대 저항 · 분광 외피', hasElementalistPrismaticShell ? 3 : 0),
            formatResistanceSourceLine('최대 저항 · 군락 수호구', colonyWardBonus.maxResC || 0)
        ]),
        resL: makeResistanceBreakdown('번개 저항', 'resL', 'maxResL', finalResL, finalMaxResL, [
            formatResistanceSourceLine('약품 내성', resistanceBlendBonus),
            formatResistanceSourceLine('분광 외피', elementalistResistanceShift.resL),
            formatResistanceSourceLine('군락 수호구', colonyWardBonus.resAll || 0)
        ], [
            formatResistanceSourceLine('최대 저항 · 영역 고유 효과', uniqueAllMaxRes),
            formatResistanceSourceLine('최대 저항 · 약품 내성', resistanceBlendMaxBonus),
            formatResistanceSourceLine('최대 저항 · 분광 외피', hasElementalistPrismaticShell ? 3 : 0),
            formatResistanceSourceLine('최대 저항 · 전하 보루', crusaderLightningMaxResBonus),
            formatResistanceSourceLine('최대 저항 · 군락 수호구', colonyWardBonus.maxResL || 0)
        ]),
        resChaos: makeResistanceBreakdown('카오스 저항', 'resChaos', 'maxResChaos', finalResChaos, finalMaxResChaos, [
            formatResistanceSourceLine('약품 내성', resistanceBlendBonus),
            formatResistanceSourceLine('암흑 치환', warlockElementalOvercapToChaos),
            formatResistanceSourceLine('분광 외피', elementalistResistanceShift.resChaos),
            formatResistanceSourceLine('공허 결합', elementalistChaosConversionBonus),
            formatResistanceSourceLine('군락 수호구', (colonyWardBonus.resAll || 0) + (colonyWardBonus.resChaos || 0))
        ], [
            formatResistanceSourceLine('최대 저항 · 약품 내성', resistanceBlendMaxBonus),
            formatResistanceSourceLine('최대 저항 · 군락 수호구', colonyWardBonus.maxResChaos || 0)
        ]),

        ailmentResist: {
            title: '상태이상 방지 확률',
            lines: [
                `점화 방지: ${finalAilmentResistIgniteChance.toFixed(1)}%`,
                `냉각 방지: ${finalAilmentResistChillChance.toFixed(1)}%`,
                `동결 방지: ${finalAilmentResistFreezeChance.toFixed(1)}%`,
                `감전 방지: ${finalAilmentResistShockChance.toFixed(1)}%`,
                `중독 방지: ${finalAilmentResistPoisonChance.toFixed(1)}%`,
                `출혈 방지: ${finalAilmentResistBleedChance.toFixed(1)}%`
            ],
            final: `${Math.floor(ailmentResistBonusPct)}% 공통 방지`
        },
        dmgRoll: {
            title: '피해 보정 범위',
            lines: [
                makeSourceLine('최소', finalMinDmgRoll, '%', value => `${Math.floor(value)}%`),
                makeSourceLine('최대', finalMaxDmgRoll, '%', value => `${Math.floor(value)}%`)
            ],
            final: `${Math.floor(finalMinDmgRoll)}% ~ ${Math.floor(finalMaxDmgRoll)}%`
        },
        igniteChance: makeAilmentChanceBreakdown('점화 확률', 'igniteChance', finalIgniteChance, ailmentCritChance.ignite, null, makeDamageAilmentEffectLines('점화 피해 증가', finalIgniteDamageMultiplierPct)),
        chillChance: makeAilmentChanceBreakdown('냉각 확률', 'chillChance', finalChillChance, ailmentCritChance.chill, null, ['냉각은 피해형 상태이상이 아니며 적의 행동 속도를 감소시킵니다.']),
        freezeChance: makeAilmentChanceBreakdown('동결 확률', 'freezeChance', finalFreezeChance, ailmentCritChance.freeze, '냉기 피해 치명타는 동결 시도를 보장합니다. 그 외에는 해당 확률로 동결을 시도하며, 시도 성공 후 적의 최대 생명력 대비 타격 피해로 동결 적용 판정을 합니다.', ['동결은 피해형 상태이상이 아니며 적의 행동을 정지시킵니다.']),
        shockChance: makeAilmentChanceBreakdown('감전 확률', 'shockChance', finalShockChance, ailmentCritChance.shock, null, [`감전 효과 증가: +${Math.max(0, finalShockEffectBonusPct).toFixed(1)}%`, '감전은 직접 피해를 주지 않고 대상이 받는 피해를 증가시킵니다.']),
        ailmentResistIgniteChance: makeAilmentResistBreakdown('점화 저항 확률', '점화', ailResIgniteTotal, finalAilmentResistIgniteChance, makeDamageAilmentMitigationLines('점화 피해 감소', finalIgniteDamageReducePct)),
        ailmentResistChillChance: makeAilmentResistBreakdown('냉각 저항 확률', '냉각', ailResFreezeTotal, finalAilmentResistChillChance, [`냉각 효과 감소: ${Math.max(0, finalChillEffectReducePct).toFixed(1)}%`]),
        ailmentResistFreezeChance: makeAilmentResistBreakdown('동결 저항 확률', '동결', ailResFreezeTotal, finalAilmentResistFreezeChance, [`동결 지속시간 감소: ${Math.max(0, finalFreezeDurationReducePct).toFixed(1)}%`]),
        ailmentResistShockChance: makeAilmentResistBreakdown('감전 저항 확률', '감전', ailResShockTotal, finalAilmentResistShockChance, [`감전 효과 감소: ${Math.max(0, finalShockEffectReducePct).toFixed(1)}%`]),
        ailmentResistPoisonChance: makeAilmentResistBreakdown('중독 저항 확률', '중독', ailResPoisonTotal, finalAilmentResistPoisonChance, makeDamageAilmentMitigationLines('중독 피해 감소', finalPoisonDamageReducePct)),
        ailmentResistBleedChance: makeAilmentResistBreakdown('출혈 저항 확률', '출혈', ailResBleedTotal, finalAilmentResistBleedChance, makeDamageAilmentMitigationLines('출혈 피해 감소', finalBleedDamageReducePct)),
        poisonChance: makeAilmentChanceBreakdown('중독 확률', 'poisonChance', finalPoisonChance, ailmentCritChance.poison, null, makeDamageAilmentEffectLines('중독 피해 증가', finalPoisonDamageMultiplierPct)),
        bleedChance: makeAilmentChanceBreakdown('출혈 확률', 'bleedChance', finalBleedChance, ailmentCritChance.bleed, null, makeDamageAilmentEffectLines('출혈 전용 피해 증가', 0)),
        dps: {
            title: 'DPS',
            lines: [
                `평균 한 방 ${Math.floor(avgHit)}`,
                `공격 속도 ${finalAspd.toFixed(2)}`,
                `치명 기대값 반영`,
                crusaderThunderDoctrinePct > 0 ? `천뢰 교리 반영: 화염/냉기 피해 증가 +${Math.floor(crusaderThunderDoctrinePct)}%가 번개 공격력/평균 한 방/DPS에 적용` : null,
                `피해 보정 기대값 x${avgRollMultiplier.toFixed(2)} (${Math.floor(finalMinDmgRoll)}~${Math.floor(finalMaxDmgRoll)}%)`,
                `연속 타격 기대값 x${expectedDoubleStrikeMultiplier.toFixed(2)} (${Math.floor(finalDs)}%)`,
                coreCubeAddedDamageTotalPct > 0 ? `코어 큐브 추가 피해 x${expectedAddedDamageMultiplier.toFixed(2)} (총 피해의 ${Math.floor(coreCubeAddedDamageTotalPct)}% → ${coreCubeAddedDamageParts.join(' / ')})` : null,
                isProjectileSkillForDps && projectileExtraShotsForDps > 0 ? `투사체 추가 발사 기대값 x${projectileExtraShotDpsMul.toFixed(2)} (추가 발사 +${projectileExtraShotsForDps})` : null,
                estimatedSkillDotDps > 0 ? `지속 피해 기대값 +${Math.floor(estimatedSkillDotDps)} DPS (틱 ${DOT_TICK_FROM_HIT_RATIO * 100}% / ${Math.max(0.02, DOT_TICK_INTERVAL * Math.max(0.05, dotTickIntervalMultiplier)).toFixed(2)}초, 예상 중첩 ${Math.floor((damageScales.estimatedDotStacks || 1))}/${DOT_STACK_MAX})` : null,
                talentDpsSummary.alwaysMul !== 1 ? `🌸 재능 개화 키스톤(상시) x${talentDpsSummary.alwaysMul.toFixed(2)}` : null,
                (talentDpsSummary.conditional && talentDpsSummary.conditional.length) ? `🌸 재능 개화 키스톤(조건부): ${talentDpsSummary.conditional.map(c => `${(typeof getTalentKeystoneConditionText === 'function' ? getTalentKeystoneConditionText(c.when, c.threshold) : '')}+${Math.floor(c.moreMul)}%`).join(', ')} (상황별 추가 적용)` : null
            ].concat(flameDecayDpsLines).filter(Boolean),
            final: `${Math.floor(finalPlayerSkillDps)}`
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
        fireTakenDamageReducePct: Math.max(0, colonyWardBonus.fireTakenDamageReducePct || 0),
        coldTakenDamageReducePct: Math.max(0, colonyWardBonus.coldTakenDamageReducePct || 0),
        lightTakenDamageReducePct: Math.max(0, colonyWardBonus.lightTakenDamageReducePct || 0),
        chaosTakenDamageReducePct: Math.max(0, colonyWardBonus.chaosTakenDamageReducePct || 0),
        dotTakenDamageReducePct: finalDotTakenDamageReducePct,
        takenDamageReduceWhen2EnemiesPct: finalTakenDamageReduceWhen2EnemiesPct,
        takenDamageReduceWhen1EnemyPct: finalTakenDamageReduceWhen1EnemyPct,
        igniteDamageMultiplierPct: finalIgniteDamageMultiplierPct,
        dps: finalPlayerSkillDps || 0,
        hitDps: finalDpsWithProjectileShots || 0,
        skillDotDps: estimatedSkillDotDps || 0,
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
        shieldBaseBlockChance: shieldBaseBlockChance,
        effectiveShieldBaseBlockChance: effectiveShieldBaseBlockChance,
        shieldBlockChancePct: shieldBlockChancePct,
        shieldBlockChanceFlat: shieldBlockChanceFlat,
        blockChance: finalBlockChance,
        blockChanceMax: finalBlockChanceCap,
        deflectChance: finalDeflectChance,
        deflectDamageReduce: finalDeflectDamageReduce,
        ailmentResistBonusPct: ailmentResistBonusPct,
        ailmentResistPenPct: ailmentResistPenPct,
        crusaderLightningIgnoreRes: crusaderLightningIgnoreRes,
        crusaderNoResPenOnLightning: crusaderNoResPenOnLightning,
        ds: finalDs,
        slamEchoChance: finalSlamEchoChance,
        slamEchoDamagePct: finalSlamEchoDamagePct,
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
        rawResF: uncappedResF,
        resC: finalResC,
        rawResC: uncappedResC,
        resL: finalResL,
        rawResL: uncappedResL,
        maxResF: finalMaxResF,
        maxResC: finalMaxResC,
        maxResL: finalMaxResL,
        maxResChaos: finalMaxResChaos,
        resChaos: finalResChaos,
        rawResChaos: uncappedResChaos,
        critResist: Math.max(0, Math.min(80, finalCritResist)),
        ailResIgnite: ailResIgniteTotal,
        ailResShock: ailResShockTotal,
        ailResFreeze: ailResFreezeTotal,
        ailResPoison: ailResPoisonTotal,
        ailResBleed: ailResBleedTotal,
        ailmentResistIgniteChance: finalAilmentResistIgniteChance,
        ailmentResistChillChance: finalAilmentResistChillChance,
        ailmentResistFreezeChance: finalAilmentResistFreezeChance,
        ailmentResistShockChance: finalAilmentResistShockChance,
        ailmentResistPoisonChance: finalAilmentResistPoisonChance,
        ailmentResistBleedChance: finalAilmentResistBleedChance,
        resistPenalty: resistPenalty,
        dotDamageScale: totalDotDamageMultiplier,
        flameDecayIgniteTakenMultiplier: flameDecayIgniteTakenMultiplierPreview,
        dotCritBonusScale: dotMultiplier,
        instantDamageMultiplier: instantDamageMultiplier,
        finalDamageMultiplier: finalDamageMultiplier,
        ailmentPowerMultiplier: ailmentPowerMultiplier,
        shockEffectBonusPct: finalShockEffectBonusPct,
        chaosDamageMultiplier: chaosDamageMultiplier,
        dotTickIntervalMultiplier: dotTickIntervalMultiplier,
        dotDurationMultiplier: dotDurationMultiplier,
        igniteChance: finalIgniteChance,
        chillChance: finalChillChance,
        freezeChance: finalFreezeChance,
        shockChance: finalShockChance,
        poisonChance: finalPoisonChance,
        bleedChance: finalBleedChance,
        ailmentCritChance: ailmentCritChance,
        damageScales: damageScales,
        randomElementDamagePct: randomElementDamagePct,
        addedDamagePctByElement: coreCubeAddedDamagePct,
        flatElementDamage: coreCubeFlatElementDamage,
        takenFlatReduce: coreCubeTakenFlatReduce,
        physTakenAs: coreCubePhysTakenAs,
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
        uniqueDoubleDamageChancePct: uniqueDoubleDamageChancePct + Math.max(0, coreCubeDoubleDamageChance || 0),
        uniqueEsRecoverOnCritPct: uniqueEsRecoverOnCritPct,
        uniqueRiderCompass: uniqueRiderCompass,
        uniqueMaxRollBonusHit: uniqueMaxRollBonusHit,
        uniqueCeilingSmashDouble: uniqueCeilingSmashDouble,
        uniqueConditionManual: uniqueConditionManual,
        uniqueStackingElementalResDownOnHit: uniqueStackingElementalResDownOnHit,
        uniqueLeechEfficiencyOnKill: uniqueLeechEfficiencyOnKill,
        uniqueKillMoveStacks: uniqueKillMoveStacks, uniqueEnemyRegenCutAndMinRoll: uniqueEnemyRegenCutAndMinRoll, uniqueAllResDownOnHit: uniqueAllResDownOnHit, uniqueCursedTakenAndRefresh: uniqueCursedTakenAndRefresh, uniquePhysDrHalfTakenAsMore: uniquePhysDrHalfTakenAsMore, uniqueMeleeArmorAmp: uniqueMeleeArmorAmp, uniqueArmorAppliesToDot: uniqueArmorAppliesToDot, uniqueNoCollisionBlock: uniqueNoCollisionBlock, ignoreEnemyCollision: !!uniqueNoCollisionBlock,
        uniqueResonanceFloor: uniqueResonanceAndSuppCap ? Math.floor(uniqueResonanceAndSuppCap.resonancePower || 0) : 0,
        uniqueOverkillSplash: uniqueOverkillSplash,
        uniqueDragonVeinGuard: uniqueDragonVeinGuard,
        uniqueGuardianArmor: uniqueGuardianArmor,
        uniqueQueenBeeSummon: uniqueQueenBeeSummon,
        uniqueSummonDeathDamageBuff: uniqueSummonDeathDamageBuff,
        uniqueSummonCritAspdStacks: uniqueSummonCritAspdStacks,
        uniqueSummonNonCritNoDamage: uniqueSummonNonCritNoDamage,
        uniqueBlockRecoverEnergyShieldPct: uniqueBlockRecoverEnergyShieldPct,
        uniqueDeflectStealth: uniqueDeflectStealth,
        uniqueChaosTakenDamageReducePct: uniqueChaosTakenDamageReducePct,
        uniqueLifeRecoupTakenDamage: uniqueLifeRecoupTakenDamage,
        uniqueBleedWeightOnBleedingHit: uniqueBleedWeightOnBleedingHit,
        uniqueImmuneBleed: uniqueImmuneBleed,
        uniqueImmuneFreeze: uniqueImmuneFreeze,
        uniqueMeteorFootsteps: uniqueMeteorFootsteps,
        uniqueShockTracer: uniqueShockTracer,
        uniquePoisonExtraStacks: uniqueVenomStride ? 1 : 0,
        runeCorpseExplodeChance: runeCorpseExplodeChance,
        runeCorpseExplodeLifePct: runeCorpseExplodeLifePct,
        runeResonancePower: runeResonancePower,
        summonFlatDmg: Math.max(0, (gearBase.summonFlatDmg || 0) + (gearExplicit.summonFlatDmg || 0) + (passive.summonFlatDmg || 0) + (season.summonFlatDmg || 0) + (ascend.summonFlatDmg || 0) + (support.summonFlatDmg || 0) + (reward.summonFlatDmg || 0)),
        summonPctDmg: Math.max(0, (gearBase.summonPctDmg || 0) + (gearExplicit.summonPctDmg || 0) + (passive.summonPctDmg || 0) + (season.summonPctDmg || 0) + (ascend.summonPctDmg || 0) + (support.summonPctDmg || 0) + (reward.summonPctDmg || 0) + (((game.summonDeathDamageBuffExpiresAt || 0) > Date.now()) ? Math.max(0, Number(game.summonDeathDamageBuffPct || 0)) : 0)),
        summonSharedPctDmg: Math.max(0, generalPctDmg),
        summonSharedTaggedPctDmg: Object.fromEntries(Array.from(new Set(Object.values(TAGGED_DAMAGE_STAT_BY_TAG))).map(statId => [statId, Math.max(0, sumStatAcrossBuckets(statId))])),
        summonAspd: Math.max(0, (gearBase.summonAspd || 0) + (gearExplicit.summonAspd || 0) + (passive.summonAspd || 0) + (season.summonAspd || 0) + (ascend.summonAspd || 0) + (support.summonAspd || 0) + (reward.summonAspd || 0) + sbSummonAspdBonus + (((game.summonCritAspdExpiresAt || 0) > Date.now()) ? Math.max(0, Math.floor(game.summonCritAspdStacks || 0)) * Math.max(0, Number(game.summonCritAspdPerStack || 0)) : 0)),
        summonHpPct: Math.max(0, (gearBase.summonHpPct || 0) + (gearExplicit.summonHpPct || 0) + (passive.summonHpPct || 0) + (season.summonHpPct || 0) + (ascend.summonHpPct || 0) + (support.summonHpPct || 0) + (reward.summonHpPct || 0)),
        summonCrit: Math.max(0, (gearBase.summonCrit || 0) + (gearExplicit.summonCrit || 0) + (passive.summonCrit || 0) + (season.summonCrit || 0) + (ascend.summonCrit || 0) + (support.summonCrit || 0) + (reward.summonCrit || 0)),
        summonCritDmg: Math.max(0, (gearBase.summonCritDmg || 0) + (gearExplicit.summonCritDmg || 0) + (passive.summonCritDmg || 0) + (season.summonCritDmg || 0) + (ascend.summonCritDmg || 0) + (support.summonCritDmg || 0) + (reward.summonCritDmg || 0)),
        summonCap: Math.max(1, 1 + Math.floor((gearBase.summonCap || 0) + (gearExplicit.summonCap || 0) + (passive.summonCap || 0) + (season.summonCap || 0) + (ascend.summonCap || 0) + (support.summonCap || 0) + (reward.summonCap || 0) + sbSummonCapBonus)),
        summonEfficiency: Math.max(0, (gearBase.summonEfficiency || 0) + (gearExplicit.summonEfficiency || 0) + (passive.summonEfficiency || 0) + (season.summonEfficiency || 0) + (ascend.summonEfficiency || 0) + (support.summonEfficiency || 0) + (reward.summonEfficiency || 0)),
        summonResPen: Math.max(0, (gearBase.summonResPen || 0) + (gearExplicit.summonResPen || 0) + (passive.summonResPen || 0) + (season.summonResPen || 0) + (ascend.summonResPen || 0) + (support.summonResPen || 0) + (reward.summonResPen || 0)),
        summonGuardRedirectPct: Math.max(0, Math.min(100, (gearBase.summonGuardRedirectPct || 0) + (gearExplicit.summonGuardRedirectPct || 0) + (passive.summonGuardRedirectPct || 0) + (season.summonGuardRedirectPct || 0) + (ascend.summonGuardRedirectPct || 0) + (support.summonGuardRedirectPct || 0) + (reward.summonGuardRedirectPct || 0))),
        poisonDamageMultiplierPct: Math.max(0, finalPoisonDamageMultiplierPct),
        shockedEnemyHitDamageMorePct: Math.max(0, (gearBase.shockedEnemyHitDamageMorePct || 0) + (gearExplicit.shockedEnemyHitDamageMorePct || 0) + (passive.shockedEnemyHitDamageMorePct || 0) + (season.shockedEnemyHitDamageMorePct || 0) + (ascend.shockedEnemyHitDamageMorePct || 0) + (support.shockedEnemyHitDamageMorePct || 0) + (reward.shockedEnemyHitDamageMorePct || 0)),
        sbPlayerDamageFromSummonPct: Math.max(0, sbPlayerDamageFromSummonPct),
        sbSummonDamageFromPlayerPct: Math.max(0, sbSummonDamageFromPlayerPct)
    };
    let summonEstimate = estimateSummonDps(enemy);
    enemy.summonDps = Math.max(0, summonEstimate.total || 0);
    enemy.directDps = Math.max(0, enemy.dps || 0);
    enemy.totalDps = enemy.directDps + enemy.summonDps;
    enemy.breakdowns.directDps = {
        title: '직접 DPS',
        lines: (enemy.breakdowns.dps && enemy.breakdowns.dps.lines ? enemy.breakdowns.dps.lines.slice() : []),
        final: `${Math.floor(enemy.directDps)}`
    };
    enemy.breakdowns.summonDps = {
        title: '소환 DPS',
        lines: summonEstimate.lines || [],
        final: `${Math.floor(enemy.summonDps)}`
    };
    enemy.breakdowns.dps = {
        title: '총 DPS',
        lines: [
            `직접 DPS ${Math.floor(enemy.directDps)}`,
            `예상 소환 DPS ${Math.floor(enemy.summonDps)}`,
            `총 DPS = 직접 DPS + 예상 소환 DPS`
        ].concat((enemy.breakdowns.dps && enemy.breakdowns.dps.lines ? enemy.breakdowns.dps.lines : [])),
        final: `${Math.floor(enemy.totalDps)}`
    };
    if (uniqueImmuneIgnite) enemy.immuneIgnite = true;
    if (uniqueFrostSentinel) { enemy.immuneChill = true; enemy.immuneFreeze = true; }
    if (uniqueImmuneFreeze) enemy.immuneFreeze = true;
    if (uniqueShockTracer) {
        enemy.immuneShock = true;
        addStatToBucket(reward, 'shockEffect', Math.max(0, Number(uniqueShockTracer.shockEffectPct || 0)));
    }
    if (uniqueBleedBlockHelm || uniqueImmuneBleed) enemy.immuneBleed = true;
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
    let targetGemSources = getTargetGemBonusSources(name, stats.gemBonusSources);
    if (isSupport) {
        let gem = normalizeGemRecord((game.supportGemData || {})[name]);
        let db = SUPPORT_GEM_DB[name];
        if (!db) return { baseLevel: gem.level, totalLevel: gem.level, value: 0, desc: '정의되지 않은 보조젬', statName: name, statId: null, gemBonusSources: targetGemSources };
        let totalLevel = Math.max(1, gem.level + targetGemSources.total);
        let val = db.baseVal + ((totalLevel - 1) * db.scale);
        let activeTier = typeof getSupportActiveTier === 'function' ? getSupportActiveTier(name) : Math.max(1, Math.min((typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3), Math.floor(gem.activeTier || gem.unlockedTier || 1)));
        let tierMul = typeof getSupportTierMultiplier === 'function' ? getSupportTierMultiplier(name, activeTier) : (activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2);
        return { baseLevel: gem.level, totalLevel: totalLevel, value: val * tierMul, desc: db.desc, statName: db.name, statId: db.stat, activeTier: activeTier, gemBonusSources: targetGemSources };
    }
    let db = SKILL_DB[name];
    if (!db) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: '정의되지 않은 스킬', skill: SKILL_DB['기본 공격'], tags: ['attack'] };
    if (!db.isGem && !db.levelable) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: db.desc, statName: name, skill: db, tags: getSkillTagList(db) };
    game.gemData = game.gemData || {};
    let gem = normalizeGemRecord((game.gemData || {})[name]);
    if (db.levelable) game.gemData[name] = gem;
    let permanentSkyBonus = db.isGem && typeof getSkyTowerGemBoostLevel === 'function' ? getSkyTowerGemBoostLevel(name) : 0;
    let materialBonus = db.isGem ? (gem.bossCoreLevel || 0) + (gem.skyCoreLevel || 0) + (gem.awakened ? 2 : 0) + permanentSkyBonus : 0;
    let levelBonus = db.isGem ? targetGemSources.total : 0;
    let totalLevel = gem.level + levelBonus + materialBonus;
    let finalLevel = Math.min(20, gem.level) + levelBonus + materialBonus;
    let skill = { ...db };
    skill.dmg = skill.baseDmg + ((finalLevel - 1) * skill.dmgScale);
    skill.spd = skill.baseSpd + ((finalLevel - 1) * skill.spdScale);
    if (skill.critScale) skill.crit = (skill.crit || 0) + (finalLevel * skill.critScale);
    let qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    skill.dmg *= qualityMul;
    skill.spd *= qualityMul;
    return { baseLevel: gem.level, totalLevel: totalLevel, finalLevel: finalLevel, materialBonus: materialBonus, permanentSkyBonus: permanentSkyBonus, bossCoreLevel: gem.bossCoreLevel || 0, skyCoreLevel: gem.skyCoreLevel || 0, skyEnhanceCap: gem.skyEnhanceCap || 1, quality: gem.quality || 0, awakened: !!gem.awakened, desc: db.desc, skill: skill, tags: getSkillTagList(skill), gemBonusSources: targetGemSources };
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
    if (!enemy || !zone || (zone.type !== 'chaosRealm' && !zone.bloomTrialAffixFloor)) return enemy;
    let floor = Math.max(1, Math.floor(zone.bloomTrialAffixFloor || zone.floor || 1));
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
    let zoneProgress = clampNumber(((zoneTier || 1) - 1) / 19, 0, 1);
    let curved = zoneProgress * zoneProgress;
    if (skillEle === 'fire' || skillEle === 'cold' || skillEle === 'light') baseRes = 5 + Math.floor(20 * curved);
    else if (skillEle === 'chaos') baseRes = 5 + Math.floor(20 * curved);
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
        rawMitigation -= shred;
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
        if (skillEle === 'light' && pStats && pStats.crusaderLightningIgnoreRes) rawMitigation = 0;
        let effective = rawMitigation - ((skillEle === 'light' && pStats && pStats.crusaderNoResPenOnLightning) ? 0 : Math.max(0, pStats.resPen || 0));
        let cap = Math.max(0, Number(enemy && enemy.maxResCap) || 80);
        if (effective > 0) effective = Math.min(cap, effective);
        return Math.max(MIN_PENETRATED_RESISTANCE, effective);
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


function getZoneDefenseVariance(zone) {
    let key = String((zone && zone.id) || 'zone');
    let seed = Math.abs(hashSeed(key + ':def-var')) % 7;
    return (seed - 3) * 0.02;
}

function getZoneElementWardProfile(zone) {
    if (!zone) return null;
    let specialBossZone = zone.type === 'outsideChaos'
        || zone.id === 'beehive_run'
        || zone.id === 'grand_breach_run'
        || zone.type === 'meteor'
        || zone.type === 'seasonBoss'
        || zone.type === 'trial';
    if (specialBossZone) return null;
    let key = String(zone.id || zone.name || 'zone');
    let elemList = ['fire', 'cold', 'light'];
    let elem = elemList[Math.abs(hashSeed(key + ':elem-ward')) % elemList.length];
    let strength = 6 + (Math.abs(hashSeed(key + ':elem-ward-strength')) % 13);
    return { elem: elem, strength: strength };
}

function getCosmosExclusiveEnemyTrait(zone, isElite, isBoss, seed) {
    if (!zone || zone.type !== 'cosmos' || (!isElite && !isBoss)) return null;
    const tag = String(zone.cosmosTag || '').trim() || 'stellar';
    const sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    const gravity = Math.max(1, Number(zone.gravity || 1));
    const power = (isBoss ? 1.45 : 1) * (1 + Math.max(0, sizeClass - 1) * 0.06 + Math.max(0, gravity - 1) * 0.04);
    const byTag = {
        crit: 'critResist', toxiccrit: 'critResist', mirror: 'critResist', reflect: 'critResist', balance: 'critResist', judgement: 'critResist',
        guard: 'critDamageResist', shield: 'critDamageResist', relic: 'critDamageResist', belt: 'critDamageResist', tank: 'critDamageResist', purify: 'critDamageResist',
        projectile: 'comboGuard', bind: 'comboGuard', path: 'comboGuard', node: 'comboGuard', gate: 'comboGuard', loop: 'comboGuard', warp: 'comboGuard',
        charge: 'heavySlow', impact: 'heavySlow', aoe: 'heavySlow', fire: 'heavySlow', physical: 'heavySlow', core: 'heavySlow', end: 'heavySlow',
        speed: 'fast', hunt: 'fast', arcane: 'fast', dual: 'fast', companion: 'fast', sting: 'fast',
        absorb: 'energyShield', cold: 'energyShield', vital: 'energyShield', regen: 'energyShield', seed: 'energyShield', flower: 'energyShield',
        map: 'evasion', wealth: 'evasion', reward: 'evasion', gateway: 'evasion', outer: 'evasion', skill: 'evasion',
        venom: 'armor', poison: 'armor', chaos: 'armor', curse: 'armor', sacrifice: 'armor', asteroid: 'armor', boss: 'heavySlow'
    };
    const archetype = byTag[tag] || ['critResist', 'critDamageResist', 'comboGuard', 'heavySlow', 'fast', 'energyShield', 'evasion', 'armor'][Math.abs(seed || 0) % 8];
    const trait = {
        id: `cosmos_${archetype}`,
        name: '',
        expMul: 1 + (isBoss ? 0.16 : 0.08),
        dropMul: 1 + (isBoss ? 0.12 : 0.06),
        bossDebuffs: []
    };
    if (archetype === 'critResist') {
        trait.name = '우주계 한정: 성운 굴절';
        trait.critResistPct = Math.floor((isBoss ? 42 : 26) * power);
        trait.critDamageResistPct = Math.floor((isBoss ? 38 : 22) * power);
    } else if (archetype === 'critDamageResist') {
        trait.name = '우주계 한정: 항성 장갑';
        trait.critDamageResistPct = Math.floor((isBoss ? 58 : 36) * power);
        trait.dr = Math.floor((isBoss ? 10 : 6) * power);
        trait.armorMul = 1 + (isBoss ? 0.85 : 0.55) * power;
    } else if (archetype === 'comboGuard') {
        trait.name = '우주계 한정: 연속 타격 저항';
        trait.hitRateGuard = Math.min(0.28, (isBoss ? 0.12 : 0.08) * power);
        trait.comboTakenLessPct = Math.min(70, Math.floor((isBoss ? 38 : 24) * power));
    } else if (archetype === 'heavySlow') {
        trait.name = '우주계 한정: 중력 강타';
        trait.atkMul = 1 + (isBoss ? 0.62 : 0.38) * power;
        trait.damageMul = 1 + (isBoss ? 0.28 : 0.16) * power;
        trait.attackSpeedVarMul = Math.max(0.42, 1 - (isBoss ? 0.32 : 0.22) * power);
        trait.penetration = Math.floor((isBoss ? 8 : 4) * power);
    } else if (archetype === 'fast') {
        trait.name = '우주계 한정: 광속 공세';
        trait.attackSpeedVarMul = 1 + (isBoss ? 0.55 : 0.34) * power;
        trait.critChanceBonus = Math.floor((isBoss ? 12 : 7) * power);
        trait.evasionChance = Math.floor((isBoss ? 18 : 10) * power);
    } else if (archetype === 'energyShield') {
        const esPct = Math.min(100, Math.max(50, Math.floor(50 + ((Math.abs(seed || 0) % 51)) + (isBoss ? 18 : 0))));
        trait.name = `우주계 한정: 에너지 보호막 ${esPct}%`;
        trait.energyShieldPct = esPct;
        trait.resAll = Math.floor((isBoss ? 8 : 4) * power);
    } else if (archetype === 'evasion') {
        trait.name = '우주계 한정: 성간 회피';
        trait.evasionMul = 1 + (isBoss ? 1.65 : 1.05) * power;
        trait.evasionChance = Math.min(72, Math.floor((isBoss ? 42 : 28) * power));
    } else if (archetype === 'armor') {
        trait.name = '우주계 한정: 운석 장갑';
        trait.armorMul = 1 + (isBoss ? 2.2 : 1.35) * power;
        trait.armorGuard = Math.min(0.72, (isBoss ? 0.36 : 0.24) * power);
        trait.dr = Math.floor((isBoss ? 14 : 8) * power);
    }
    if (isBoss) {
        const debuffSets = {
            critResist: ['cosmos_res_down', 'cosmos_aspd_down'],
            critDamageResist: ['cosmos_regen_down', 'cosmos_res_down'],
            comboGuard: ['cosmos_aspd_down', 'cosmos_leech_down'],
            heavySlow: ['cosmos_res_down', 'cosmos_regen_down'],
            fast: ['cosmos_aspd_down', 'cosmos_leech_down'],
            energyShield: ['cosmos_regen_down', 'cosmos_leech_down'],
            evasion: ['cosmos_aspd_down', 'cosmos_res_down'],
            armor: ['cosmos_leech_down', 'cosmos_regen_down']
        };
        trait.bossDebuffs = debuffSets[archetype] || ['cosmos_res_down'];
        trait.debuffPower = Math.min(1.7, power);
    }
    return trait;
}

function applyCosmosExclusiveTraitToEnemy(enemy, trait) {
    if (!enemy || !trait) return;
    enemy.traitName = enemy.traitName ? `${enemy.traitName} · ${trait.name}` : trait.name;
    if (Number.isFinite(trait.dr)) enemy.dr = Math.min(90, Math.max(0, enemy.dr + trait.dr));
    if (Number.isFinite(trait.resAll)) {
        enemy.resF = Math.min(95, enemy.resF + trait.resAll);
        enemy.resC = Math.min(95, enemy.resC + trait.resAll);
        enemy.resL = Math.min(95, enemy.resL + trait.resAll);
        enemy.resChaos = Math.min(95, enemy.resChaos + trait.resAll);
    }
    if (Number.isFinite(trait.armorMul)) enemy.armor = Math.floor(enemy.armor * Math.max(0.1, trait.armorMul));
    if (Number.isFinite(trait.evasionMul)) enemy.evasion = Math.floor(enemy.evasion * Math.max(0.1, trait.evasionMul));
    if (Number.isFinite(trait.armorGuard)) enemy.armorGuard = Math.max(Number(enemy.armorGuard || 0), trait.armorGuard);
    if (Number.isFinite(trait.evasionChance)) enemy.evasionChance = Math.max(Number(enemy.evasionChance || 0), Math.min(78, trait.evasionChance));
    if (Number.isFinite(trait.hitRateGuard)) enemy.hitRateGuard = Math.max(Number(enemy.hitRateGuard || 0), trait.hitRateGuard);
    if (Number.isFinite(trait.comboTakenLessPct)) enemy.comboTakenLessPct = Math.max(Number(enemy.comboTakenLessPct || 0), trait.comboTakenLessPct);
    if (Number.isFinite(trait.critResistPct)) enemy.critResistPct = Math.max(Number(enemy.critResistPct || 0), trait.critResistPct);
    if (Number.isFinite(trait.critDamageResistPct)) enemy.critDamageResistPct = Math.max(Number(enemy.critDamageResistPct || 0), trait.critDamageResistPct);
    if (Number.isFinite(trait.penetration)) enemy.penetration = Math.max(Number(enemy.penetration || 0), Number(enemy.penetration || 0) + trait.penetration);
    if (Number.isFinite(trait.energyShieldPct)) {
        enemy.maxEnergyShield = Math.max(Math.floor(Number(enemy.maxEnergyShield || 0)), Math.floor((enemy.maxHp || 1) * trait.energyShieldPct / 100));
        enemy.energyShield = Math.max(Math.floor(Number(enemy.energyShield || 0)), enemy.maxEnergyShield);
    }
    if (Array.isArray(trait.bossDebuffs) && trait.bossDebuffs.length > 0) {
        enemy.cosmosBossDebuffs = trait.bossDebuffs.slice();
        enemy.cosmosBossDebuffPower = Math.max(1, Number(trait.debuffPower || 1));
    }
}

function getCosmosDebuffSpec(type, power) {
    const p = Math.max(1, Number(power || 1));
    const table = {
        cosmos_regen_down: { type, label: '재생 효율 감소', value: Math.min(70, Math.floor(32 * p)), duration: 5.5 },
        cosmos_leech_down: { type, label: '흡혈 효율 감소', value: Math.min(75, Math.floor(36 * p)), duration: 5.5 },
        cosmos_res_down: { type, label: '저항 감소', value: Math.min(38, Math.floor(16 * p)), duration: 5.0 },
        cosmos_aspd_down: { type, label: '공격 속도 감소', value: Math.min(46, Math.floor(20 * p)), duration: 4.5 }
    };
    return table[type] || null;
}

function applyCosmosBossPlayerDebuff(enemy) {
    if (!enemy || !enemy.isBoss || !Array.isArray(enemy.cosmosBossDebuffs) || enemy.cosmosBossDebuffs.length <= 0) return;
    const now = Date.now();
    if (now < Math.floor(enemy.nextCosmosBossDebuffAt || 0)) return;
    enemy.nextCosmosBossDebuffAt = now + 3200;
    const type = enemy.cosmosBossDebuffs[Math.abs((enemy.variantSeed || 0) + Math.floor(now / 3200)) % enemy.cosmosBossDebuffs.length];
    const spec = getCosmosDebuffSpec(type, enemy.cosmosBossDebuffPower || 1);
    if (!spec) return;
    game.cosmosPlayerDebuffs = Array.isArray(game.cosmosPlayerDebuffs) ? game.cosmosPlayerDebuffs : [];
    let row = game.cosmosPlayerDebuffs.find(d => d && d.type === spec.type);
    if (!row) { row = { type: spec.type, label: spec.label, value: 0, expiresAt: 0 }; game.cosmosPlayerDebuffs.push(row); }
    row.label = spec.label;
    row.value = Math.max(Number(row.value || 0), spec.value);
    row.expiresAt = Math.max(Number(row.expiresAt || 0), now + Math.floor(spec.duration * 1000));
    if (game.settings && game.settings.showCombatLog) addLog(`🌌 ${enemy.name}의 우주계 보스 디버프: ${spec.label} -${spec.value}%`, 'attack-monster', { noToast: true });
}

function applyCosmosPlayerDebuffsToStats(pStats) {
    game.cosmosPlayerDebuffs = Array.isArray(game.cosmosPlayerDebuffs) ? game.cosmosPlayerDebuffs : [];
    const currentZone = getZone(game.currentZoneId);
    if (!currentZone || currentZone.type !== 'cosmos') {
        game.cosmosPlayerDebuffs = [];
        return;
    }
    const now = Date.now();
    game.cosmosPlayerDebuffs = game.cosmosPlayerDebuffs.filter(d => d && (d.expiresAt || 0) > now);
    game.cosmosPlayerDebuffs.forEach(d => {
        const value = Math.max(0, Math.min(90, Number(d.value || 0)));
        if (d.type === 'cosmos_regen_down') {
            pStats.regen = Math.max(0, (pStats.regen || 0) * (1 - value / 100));
            pStats.energyShieldRegenRate = Math.max(0, (pStats.energyShieldRegenRate || 0) * (1 - value / 100));
        } else if (d.type === 'cosmos_leech_down') {
            pStats.leech = Math.max(0, (pStats.leech || 0) * (1 - value / 100));
        } else if (d.type === 'cosmos_res_down') {
            pStats.resF -= value;
            pStats.resC -= value;
            pStats.resL -= value;
            pStats.resChaos -= value;
        } else if (d.type === 'cosmos_aspd_down') {
            pStats.aspd *= Math.max(0.2, 1 - value / 100);
        }
    });
}

function getCosmosEnemyModifiers(zone, isElite, isBoss) {
    if (!zone || zone.type !== 'cosmos') return null;
    let tag = String(zone.cosmosTag || '').trim();
    let sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    let gravity = Math.max(1, Number(zone.gravity || 1));
    let sizePressure = Math.max(0, sizeClass - 1);
    let gravityPressure = Math.max(0, gravity - 1);
    let bossMul = isBoss ? 1.35 : (isElite ? 1.12 : 1);
    let mod = {
        hpMul: 1 + sizePressure * 0.10 + gravityPressure * 0.13,
        damageMul: 1 + sizePressure * 0.025 + gravityPressure * 0.055,
        atkMul: 1 + gravityPressure * 0.035,
        attackSpeedMul: Math.max(0.72, 1 - gravityPressure * 0.018 + sizePressure * 0.012),
        dr: Math.floor(sizePressure * 2 + gravityPressure * 3),
        resAll: Math.floor(gravityPressure * 4),
        armorMul: 1 + sizePressure * 0.09 + gravityPressure * 0.08,
        evasionMul: 1 + Math.max(0, 3 - sizeClass) * 0.035,
        critChanceBonus: 0,
        penetration: Math.floor(gravityPressure * 2),
        regenMul: 1,
        ailmentChanceBonus: 0,
        firstHitGuard: 0,
        patternMode: null,
        traitName: `우주계:${tag || 'stellar'} ${sizeClass}등급/${gravity.toFixed(1)}g`
    };
    const tagMods = {
        gateway: { resAll: 3, firstHitGuard: 0.08 },
        arcane: { resChaos: 8, penetration: 3 },
        cold: { resC: 14, attackSpeedMul: 0.94, ailmentChanceBonus: 0.04 },
        fire: { resF: 14, damageMul: 0.09, ailmentChanceBonus: 0.03 },
        hunt: { attackSpeedMul: 1.08, critChanceBonus: 5 },
        venom: { resChaos: 10, regenMul: 1.25, ailmentChanceBonus: 0.05 },
        relic: { armorMul: 1.16, dr: 4 },
        guard: { dr: 7, firstHitGuard: 0.14 },
        speed: { attackSpeedMul: 1.18, evasionMul: 1.18 },
        projectile: { penetration: 5, damageMul: 0.04 },
        map: { resAll: 5, evasionMul: 1.08 },
        seed: { regenMul: 1.45 },
        shield: { firstHitGuard: 0.20, resAll: 5 },
        loop: { attackSpeedMul: 1.08, hpMul: 0.08 },
        wealth: { dropMul: 1.08 },
        mirror: { evasionMul: 1.14, firstHitGuard: 0.10 },
        vital: { hpMul: 0.18, regenMul: 1.35 },
        crit: { critChanceBonus: 9 },
        belt: { armorMul: 1.12, resAll: 4 },
        gate: { penetration: 4, resChaos: 8 },
        bind: { attackSpeedMul: 0.92, dr: 5 },
        reflect: { firstHitGuard: 0.18, resAll: 4 },
        aoe: { damageMul: 0.10, hpMul: 0.08 },
        curse: { resChaos: 14, ailmentChanceBonus: 0.06 },
        charge: { atkMul: 0.12, penetration: 4 },
        chaos: { resChaos: 16, damageMul: 0.08 },
        warp: { attackSpeedMul: 1.12, evasionMul: 1.1 },
        asteroid: { armorMul: 1.08, dropMul: 1.04 },
        boss: { hpMul: 0.35, damageMul: 0.18, dr: 8, resAll: 8, penetration: 6, critChanceBonus: 7, firstHitGuard: 0.22, patternMode: 'cosmos' }
    };
    let extra = tagMods[tag] || {};
    Object.keys(extra).forEach(key => {
        if (key === 'patternMode') mod.patternMode = extra[key];
        else if (key === 'traitName') mod.traitName = extra[key];
        else if (key === 'attackSpeedMul' || key === 'armorMul' || key === 'evasionMul' || key === 'regenMul' || key === 'dropMul') mod[key] = (mod[key] || 1) * extra[key];
        else mod[key] = (mod[key] || 0) + extra[key];
    });
    mod.hpMul = Math.max(0.5, mod.hpMul * bossMul);
    mod.damageMul = Math.max(0.5, mod.damageMul * (isBoss ? 1.1 : 1));
    return mod;
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
    if (zone.type === 'skyTower') {
        let towerFloor = Math.max(1, Math.floor(zone.floor || 1));
        hp = Math.floor(hp * 4.2 * (1 + Math.max(0, towerFloor - 1) * 0.035));
    }
    if (zone.type === 'underworld') {
        let underFloor = Math.max(1, Math.floor(zone.floor || 1));
        hp = Math.floor(hp * 5 * (1 + Math.max(0, underFloor - 1) * 0.045));
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
    const cosmosMods = getCosmosEnemyModifiers(zone, isElite, isBoss);
    const cosmosExclusiveTrait = getCosmosExclusiveEnemyTrait(zone, isElite, isBoss, variantSeed);
    const woodsmanRegenMul = 0.1;
    const regenMul = ((zone.type === 'outsideChaos' && isBoss) ? woodsmanRegenMul : 1) * (cosmosMods && cosmosMods.regenMul ? cosmosMods.regenMul : 1);
    if (trait && trait.hpMul) hp = Math.floor(hp * trait.hpMul);
    if (cosmosMods && cosmosMods.hpMul) hp = Math.floor(hp * cosmosMods.hpMul);
    if (cosmosExclusiveTrait && cosmosExclusiveTrait.hpMul) hp = Math.floor(hp * cosmosExclusiveTrait.hpMul);
    let isSky = (game.season || 1) >= 4 && zone.type === 'abyss' && !isBoss && Math.random() < 0.08;
    if (isSky) name = `☁️ ${name}`;
    let zoneProgress = clampNumber(((zone.tier || 1) - 1) / 19, 0, 1);
    let curved = zoneProgress * zoneProgress;
    let variance = getZoneDefenseVariance(zone);
    let normalDrCap = 20, eliteDrCap = 45, bossDrCap = 75;
    let drFloor = isBoss ? 10 : 0;
    let drRange = isBoss ? (bossDrCap - drFloor) : (isElite ? eliteDrCap : normalDrCap);
    let drBase = drFloor + Math.floor(Math.max(0, drRange) * clampNumber(curved + variance, 0, 1));

    let normalResCap = 25, eliteResCap = 60, bossResCap = 80;
    let resFloor = isBoss ? 15 : 5;
    let resRange = (isBoss ? bossResCap : (isElite ? eliteResCap : normalResCap)) - resFloor;
    let resistBase = resFloor + Math.floor(Math.max(0, resRange) * clampNumber(curved + variance, 0, 1));
    let chaosResBase = resistBase;

    let defenseTierScale = Math.min(1.9, 0.6 + zone.tier * 0.08);
    let defenseLoopScale = Math.min(2.2, 1 + Math.max(0, (game.loopCount || 0)) * 0.05);
    let baseArmor = Math.floor((18 + zone.tier * 26) * defenseTierScale * defenseLoopScale * (isBoss ? 2.2 : (isElite ? 1.6 : 1)));
    let baseEvasion = Math.floor((16 + zone.tier * 24) * defenseTierScale * defenseLoopScale * (isBoss ? 2.1 : (isElite ? 1.5 : 1)));
    let baselineResistancePressure = (game.season || 1) >= 4 ? (isBoss ? 14 : (isElite ? 8 : 3)) : 0;
    let isDeepChaos = zone.type === 'abyss';
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
        dr: Math.min(90, Math.max(0, drBase + (trait && trait.dr ? trait.dr : 0))),
        resF: Math.min(95, resistBase + (trait && trait.resF ? trait.resF : 0) + (abyssScale.resistBonus || 0)),
        resC: Math.min(95, resistBase + (trait && trait.resC ? trait.resC : 0) + (abyssScale.resistBonus || 0)),
        resL: Math.min(95, resistBase + (trait && trait.resL ? trait.resL : 0) + (abyssScale.resistBonus || 0)),
        resChaos: Math.min(95, chaosResBase + (trait && trait.resChaos ? trait.resChaos : 0) + (abyssScale.resistBonus || 0)),
        armor: baseArmor,
        evasion: baseEvasion,
        atkMul: (trait && trait.atkMul ? trait.atkMul : 1) * (cosmosMods && cosmosMods.atkMul ? cosmosMods.atkMul : 1) * (cosmosExclusiveTrait && cosmosExclusiveTrait.atkMul ? cosmosExclusiveTrait.atkMul : 1),
        damageMul: (zone.type === 'outsideChaos' ? 2 : 1) * (cosmosMods && cosmosMods.damageMul ? cosmosMods.damageMul : 1) * (cosmosExclusiveTrait && cosmosExclusiveTrait.damageMul ? cosmosExclusiveTrait.damageMul : 1),
        attackSpeedVar: (0.85 + (((variantSeed % 11) / 10) * 0.5)) * (trait && trait.attackSpeedVarMul ? trait.attackSpeedVarMul : 1) * (zone.type === 'outsideChaos' ? 1.5 : 1) * (cosmosMods && cosmosMods.attackSpeedMul ? cosmosMods.attackSpeedMul : 1) * (cosmosExclusiveTrait && cosmosExclusiveTrait.attackSpeedVarMul ? cosmosExclusiveTrait.attackSpeedVarMul : 1),
        critChance: ((game.season || 1) >= 2 ? (isBoss ? 16 : isElite ? 10 : 4) : 0) + (trait && trait.critChanceBonus ? trait.critChanceBonus : 0) + (cosmosMods && cosmosMods.critChanceBonus ? cosmosMods.critChanceBonus : 0) + (cosmosExclusiveTrait && cosmosExclusiveTrait.critChanceBonus ? cosmosExclusiveTrait.critChanceBonus : 0),
        regenRate: ((game.season || 1) >= 3 ? (isBoss ? 0.004 : (isElite ? 0.0022 : 0.0012)) : 0) * 0.12 * regenMul,
        regenSuppressPct: 0,
        penetration: (isDeepChaos ? 0 : baselineResistancePressure) + (cosmosMods && cosmosMods.penetration ? cosmosMods.penetration : 0),
        resistanceReduction: isDeepChaos ? baselineResistancePressure : 0,
        hybridElement: (game.season || 1) >= 3 ? rndChoice(['fire', 'cold', 'light', 'chaos']) : null,
        ailmentChance: ((game.season || 1) >= 4 ? (isBoss ? 0.14 : (isElite ? 0.08 : 0.03)) : 0) + (cosmosMods && cosmosMods.ailmentChanceBonus ? cosmosMods.ailmentChanceBonus : 0),
        firstHitGuard: Math.max((game.season || 1) >= 5 ? (isBoss ? 0.75 : ((trait && trait.firstHitGuard) || 0)) : 0, cosmosMods && cosmosMods.firstHitGuard ? cosmosMods.firstHitGuard : 0),
        hitRateGuard: (game.season || 1) >= 5 ? ((trait && trait.hitRateGuard) || (isBoss ? 0.06 : 0)) : 0,
        recentHitsTaken: 0,
        recentHitsTimer: 0,
        patternMode: (cosmosMods && cosmosMods.patternMode) || ((game.season || 1) >= 6 && isBoss ? rndChoice(['burst', 'ramp', 'slam']) : null),
        disableExecute: zone.type === 'outsideChaos',
        disableHpScaleDamage: zone.type === 'outsideChaos',
        traitName: trait ? trait.name : null,
        leechEffMul: trait && Number.isFinite(trait.leechEffMul) ? Math.max(0, trait.leechEffMul) : 1,
        expMul: (trait && Number.isFinite(trait.expMul) ? Math.max(1, trait.expMul) : 1) * (cosmosExclusiveTrait && Number.isFinite(cosmosExclusiveTrait.expMul) ? Math.max(1, cosmosExclusiveTrait.expMul) : 1),
        dropMul: (trait && Number.isFinite(trait.dropMul) ? Math.max(1, trait.dropMul) : 1) * (cosmosExclusiveTrait && Number.isFinite(cosmosExclusiveTrait.dropMul) ? Math.max(1, cosmosExclusiveTrait.dropMul) : 1) * getTierDropMulWithCaps(zone.tier, zone),
        isSky: isSky
    };
    let zoneWard = getZoneElementWardProfile(zone);
    if (zoneWard) {
        if (zoneWard.elem === 'fire') enemy.resF = Math.min(95, enemy.resF + zoneWard.strength);
        else if (zoneWard.elem === 'cold') enemy.resC = Math.min(95, enemy.resC + zoneWard.strength);
        else if (zoneWard.elem === 'light') enemy.resL = Math.min(95, enemy.resL + zoneWard.strength);
    }
    if (cosmosMods) {
        enemy.dr = Math.min(90, Math.max(0, enemy.dr + (cosmosMods.dr || 0)));
        enemy.resF = Math.min(95, enemy.resF + (cosmosMods.resAll || 0) + (cosmosMods.resF || 0));
        enemy.resC = Math.min(95, enemy.resC + (cosmosMods.resAll || 0) + (cosmosMods.resC || 0));
        enemy.resL = Math.min(95, enemy.resL + (cosmosMods.resAll || 0) + (cosmosMods.resL || 0));
        enemy.resChaos = Math.min(95, enemy.resChaos + (cosmosMods.resAll || 0) + (cosmosMods.resChaos || 0));
        enemy.armor = Math.floor(enemy.armor * (cosmosMods.armorMul || 1));
        enemy.evasion = Math.floor(enemy.evasion * (cosmosMods.evasionMul || 1));
        enemy.dropMul *= cosmosMods.dropMul || 1;
        enemy.cosmosTag = zone.cosmosTag || '';
        enemy.cosmosSizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
        enemy.cosmosGravity = Math.max(1, Number(zone.gravity || 1));
        enemy.traitName = enemy.traitName ? `${enemy.traitName} · ${cosmosMods.traitName}` : cosmosMods.traitName;
    }
    applyCosmosExclusiveTraitToEnemy(enemy, cosmosExclusiveTrait);
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
    if (zone.type === 'cosmos') {
        let gravity = Math.max(1, Number(zone.gravity || 1));
        let sizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
        let markerCount = Math.max(4, Math.min(12, 4 + sizeClass + Math.floor((gravity - 1) * 4)));
        let minPack = Math.max(2, Math.min(6, 2 + Math.floor(sizeClass / 2)));
        let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor((gravity - 1) * 2)));
        return { markerCount, minPack, maxPack, eliteChance: Math.min(0.75, 0.16 + sizeClass * 0.05), bossAdds: 2 + Math.floor(sizeClass / 2), label: zone.name || '우주계' };
    }
    if (zone.type === 'chaosRealm') return { markerCount: 4 + Math.floor((zone.floor || 1) / 8), minPack: 2, maxPack: Math.min(8, 3 + Math.floor((zone.floor || 1) / 6)), eliteChance: 0.35, bossAdds: 2 + Math.floor((zone.floor || 1) / 12), label: `혼돈계 ${zone.floor || 1}층` };
    if (zone.type === 'skyTower') {
        let floor = Math.max(1, Math.floor(zone.floor || 1));
        let minPack = Math.min(9, 2 + Math.floor(floor / 10));
        let maxPack = Math.min(10, minPack + 2 + Math.floor(floor / 18));
        return { markerCount: 40 + Math.floor(floor / 3), minPack: minPack, maxPack: Math.max(minPack, maxPack), eliteChance: Math.min(0.5, 0.18 + floor * 0.006), bossAdds: 2 + Math.floor(floor / 12), label: `창공의 탑 ${floor}층` };
    }
    if (zone.type === 'underworld') {
        let floor = Math.max(1, Math.floor(zone.floor || 1));
        let minPack = Math.min(10, 3 + Math.floor(floor / 7));
        let maxPack = Math.min(10, minPack + 2 + Math.floor(floor / 14));
        maxPack = Math.max(minPack, maxPack);
        return {
            markerCount: 5 + Math.floor(floor / 6),
            minPack: minPack,
            maxPack: maxPack,
            eliteChance: Math.min(0.55, 0.2 + floor * 0.012),
            bossAdds: 2 + Math.floor(floor / 10),
            label: `지하계 ${floor}층`
        };
    }
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
    if (zone.type === 'cosmos') {
        let p = getZoneEncounterProfile(zone);
        let plan = [];
        for (let i = 1; i <= p.markerCount; i++) {
            plan.push({
                at: Math.min(98, Math.floor((100 / (p.markerCount + 1)) * i)),
                count: p.minPack + Math.floor(Math.random() * Math.max(1, (p.maxPack - p.minPack + 1))),
                elite: Math.random() < p.eliteChance
            });
        }
        plan.push({ at: 100, count: Math.max(1, p.bossAdds), boss: true });
        return plan;
    }
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
    // 개화 시련 밖으로 나가면 누적된 재생 억제를 해제한다.
    if (!zone || !zone.bloomTrial) game.bloomTrialRegenSuppress = 0;
    if (!zone || zone.type !== 'trial') {
        trialHazardTimer = 0;
        return;
    }
    trialHazardTimer = 1.8 + Math.random() * 1.6;
}

// 재능 개화 시련 클리어 처리. (키 소모 + 조합 기록 + 직업 5차 노드 해금 + 개화 카드 획득/강화)
function handleTalentBloomClear(zone) {
    game.currencies.chaosKey = Math.max(0, Math.floor(game.currencies.chaosKey || 0) - 1);
    game.currencies.coreKey = Math.max(0, Math.floor(game.currencies.coreKey || 0) - 1);
    game.bloomTrialRegenSuppress = 0;
    let heroId = game.selectedHeroId || 'hero1';
    let classKey = game.ascendClass || 'none';
    let comboKey = `${heroId}__${classKey}`;
    game.talentBloomClears = Math.max(0, Math.floor(game.talentBloomClears || 0)) + 1;
    game.talentBloomCombos = Array.isArray(game.talentBloomCombos) ? game.talentBloomCombos : [];
    let isNewCombo = !game.talentBloomCombos.includes(comboKey);
    if (isNewCombo) game.talentBloomCombos.push(comboKey);
    let heroLabel = (typeof getHeroSelectionDef === 'function') ? getHeroSelectionDef(heroId).label : heroId;
    let classLabel = (typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[classKey]) ? CLASS_TEMPLATES[classKey].name : '무직';
    addLog(`🌸 재능 개화 성공! [${heroLabel} × ${classLabel}]${isNewCombo ? ' (신규 조합!)' : ''}`, 'loot-unique');
    // 해당 직업으로 첫 개화 시: 5차 노드 해금 + 전직 포인트 + 키스톤 포인트 지급 (직업당 1회)
    game.bloomedClasses = Array.isArray(game.bloomedClasses) ? game.bloomedClasses : [];
    if (game.ascendClass && !game.bloomedClasses.includes(game.ascendClass)) {
        game.bloomedClasses.push(game.ascendClass);
        game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + 1;
        game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + 1;
        game.ascendRank = Math.max(game.ascendRank || 0, 5);
        addLog(`🌸 [${classLabel}] 5차 개화 노드 해금! 전직 포인트 +1 · 키스톤 포인트 +1`, 'loot-unique');
        if (typeof queueTutorialNotice === 'function') queueTutorialNotice('unlock_fifth_node', '5차 개화 노드 해금', '직업전직 탭에 5차 재능 개화 노드가 추가되었습니다.', 'tab-traits');
    }
    // 재능 개화 카드 획득/강화 + 재능 탭 해금
    if (typeof recordTalentBloomCard === 'function') {
        let result = recordTalentBloomCard(comboKey);
        if (!game.unlocks) game.unlocks = {};
        let firstUnlock = !game.unlocks.talent;
        game.unlocks.talent = true;
        game.noti.talent = true;
        let cardLabel = `${heroLabel} × ${classLabel}`;
        if (firstUnlock) {
            if (typeof queueTutorialNotice === 'function') queueTutorialNotice('unlock_talent_tab', '재능 탭 해금', '재능 개화 카드를 획득했습니다! 재능 탭에서 보유 카드와 효과를 확인하세요.', 'tab-talent');
        }
        addLog(`🃏 개화 카드 [${cardLabel}] Lv.${result.card.level} (점수 ${result.score})${result.leveledUp ? ' · 레벨 상승!' : ''}`, 'loot-unique');
        if (typeof renderTalentTab === 'function' && document.getElementById('tab-talent') && document.getElementById('tab-talent').classList.contains('active')) renderTalentTab();
    }
    game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
    game.killsInZone = 0;
    game.inTicketBossFight = false;
    startMoving(false);
    updateStaticUI();
    queueImportantSave(200);
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

function getPlayerShockTakenDamageIncreasePct(pStats, power) {
    let base = 22;
    let reduction = Math.max(0, Math.min(0.95, Number(pStats && pStats.shockEffectReducePct || 0) / 100));
    let value = Math.max(0, base * (1 - reduction));
    return (pStats && pStats.uniqueShockInvertTaken) ? -value : value;
}

function getEnemyShockTakenDamageIncreasePct(ail, pStats) {
    if (!ail || ail.type !== 'shock' || (ail.time || 0) <= 0) return 0;
    let power = Math.max(0, Number(ail.power || 0));
    let base = Math.min(35, 8 + power * 12);
    let bonus = Math.max(0, Number(pStats && pStats.shockEffectBonusPct) || 0);
    return Math.max(0, Math.min(50, base * (1 + bonus / 100)));
}

function getActiveEnemyShockTakenDamageIncreasePct(enemy, pStats) {
    if (!enemy || !Array.isArray(enemy.ailments)) return 0;
    return enemy.ailments.reduce((best, ail) => Math.max(best, getEnemyShockTakenDamageIncreasePct(ail, pStats)), 0);
}

function getStoredAilmentHitDamage(ail) {
    if (!ail) return 0;
    return Math.max(0, Number(ail.sourceHitDamage || ail.hitDamage || 0) || 0);
}

function getDamageAilmentBaseDpsFromHit(hitDamage, power, scale, critDotBonusPct, critDotBonusScale) {
    let source = Math.max(0, Number(hitDamage) || 0);
    if (source <= 0) return 0;
    let mul = getDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
    return Math.max(1, Math.floor(source * 0.90 * mul));
}

function getDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale) {
    let baseScale = Math.max(0.01, Number(scale) || 1);
    let bonusPct = Math.max(0, Number(critDotBonusPct) || 0);
    let bonusScale = Math.max(0.01, Number(critDotBonusScale) || 1);
    return baseScale + (bonusPct / 100) * bonusScale;
}

function getDamageAilmentScore(sourceDamage, critDotBonusPct, scale, critDotBonusScale) {
    let source = Math.max(0, Number(sourceDamage) || 0);
    return source * getDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
}

function getEnemyDamageAilmentDps(ail, pStats) {
    let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
    let dps = getDamageAilmentBaseDpsFromHit(getStoredAilmentHitDamage(ail), ail ? ail.power : 0, dotDamageScale, ail ? ail.critDotBonusPct : 0, pStats ? pStats.dotCritBonusScale : 1);
    if (ail && ail.type === 'ignite') dps = Math.floor(dps * (1 + Math.max(0, Number(pStats && pStats.igniteDamageMultiplierPct) || 0) / 100));
    if (ail && ail.type === 'poison') dps = Math.floor(dps * (1 + Math.max(0, Number(pStats && pStats.poisonDamageMultiplierPct) || 0) / 100));
    return dps;
}

function getEnemyDamageAilmentMaxStacks() {
    let cap = 1;
    if (game.ascendClass === 'catalyst' && hasKeystone('ct6')) cap += 1;
    if (game.ascendClass === 'catalyst' && hasKeystone('ct8')) cap += 2;
    return Math.max(1, cap);
}

function cloneEnemyAilmentForSpread(ail) {
    if (!ail || (ail.time || 0) <= 0) return null;
    const spreadableTypes = ['ignite', 'poison', 'bleed', 'chill', 'shock', 'freeze'];
    if (!spreadableTypes.includes(ail.type)) return null;
    let copy = { type: ail.type, time: Math.max(0, Number(ail.time) || 0), power: Math.max(0, Number(ail.power) || 0) };
    if (isDamageAilmentType(ail.type)) {
        copy.stacks = Math.max(1, Math.min(getEnemyDamageAilmentMaxStacks(), Math.floor(ail.stacks || 1)));
        copy.sourceHitDamage = getStoredAilmentHitDamage(ail);
        copy.critDotBonusPct = Math.max(0, Number(ail.critDotBonusPct) || 0);
        copy.ailmentDotScore = Math.max(0, Number(ail.ailmentDotScore) || 0);
    }
    return copy;
}

function mergeEnemyAilment(target, incoming) {
    if (!target || !incoming || (incoming.time || 0) <= 0) return false;
    target.ailments = Array.isArray(target.ailments) ? target.ailments : [];
    let row = target.ailments.find(ail => ail && ail.type === incoming.type);
    if (!row) {
        target.ailments.push({ ...incoming });
        return true;
    }
    row.time = Math.max(row.time || 0, incoming.time || 0);
    row.power = Math.max(row.power || 0, incoming.power || 0);
    if (isDamageAilmentType(incoming.type)) {
        row.stacks = Math.max(1, Math.min(getEnemyDamageAilmentMaxStacks(), Math.max(Math.floor(row.stacks || 1), Math.floor(incoming.stacks || 1))));
        let rowScore = Math.max(0, Number(row.ailmentDotScore) || getStoredAilmentHitDamage(row));
        let incomingScore = Math.max(0, Number(incoming.ailmentDotScore) || getStoredAilmentHitDamage(incoming));
        if (incomingScore >= rowScore) {
            row.sourceHitDamage = getStoredAilmentHitDamage(incoming);
            row.critDotBonusPct = Math.max(0, Number(incoming.critDotBonusPct) || 0);
            row.ailmentDotScore = incomingScore;
        }
    }
    return true;
}

function spreadCatalystAilmentsOnDeath(enemy) {
    if (game.ascendClass !== 'catalyst' || !hasKeystone('ct3')) return;
    if (!enemy || !Array.isArray(enemy.ailments)) return;
    let ailments = enemy.ailments.map(cloneEnemyAilmentForSpread).filter(Boolean);
    if (ailments.length <= 0) return;
    let sourceGroup = Number.isFinite(enemy.groupIndex) ? enemy.groupIndex : 0;
    let sourceDist = Number.isFinite(enemy.colonyDist) ? enemy.colonyDist : null;
    let targets = (game.enemies || [])
        .filter(target => target && target.id !== enemy.id && target.hp > 0)
        .sort((a, b) => {
            if (sourceDist !== null && Number.isFinite(a.colonyDist) && Number.isFinite(b.colonyDist)) {
                let da = Math.abs(a.colonyDist - sourceDist);
                let db = Math.abs(b.colonyDist - sourceDist);
                if (da !== db) return da - db;
            }
            let ga = Math.abs((Number.isFinite(a.groupIndex) ? a.groupIndex : 0) - sourceGroup);
            let gb = Math.abs((Number.isFinite(b.groupIndex) ? b.groupIndex : 0) - sourceGroup);
            if (ga !== gb) return ga - gb;
            return (a.id || 0) - (b.id || 0);
        });
    if (targets.length <= 0) return;
    targets.forEach(target => ailments.forEach(ail => mergeEnemyAilment(target, ail)));
    if (game.settings && game.settings.showCombatLog) addLog(`🧪 확산 반응: 남은 상태이상이 주변 적 ${targets.length}마리에게 퍼졌습니다.`, 'attack-player', { rateKey: 'catalyst:spread', minIntervalMs: 500 });
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
    let payload = {
        type: 'flameDecay',
        time: Math.max(0, dotState.timeLeft || 0),
        power: Math.max(0, dotState.stacks || 1),
        flameDecayDps: dps,
        rawTickDamage: Math.max(0, Number(dotState.rawTickDamage || 0)),
        tickInterval: tickInterval,
        enemyRes: enemyRes,
        abyssPlayerMul: abyssPlayerMul,
        igniteTakenMultiplier: Math.max(1, Number(pStats && pStats.flameDecayIgniteTakenMultiplier) || getFlameDecayIgniteTakenMultiplier(pStats))
    };
    if (row) Object.assign(row, payload);
    else enemy.ailments.push(payload);
}

function getFlameDecayIgniteTakenMultiplier(pStats) {
    let skill = pStats && pStats.sSkill;
    let per100 = Math.max(0, Number(skill && skill.igniteTakenHpScalePer100) || 0);
    if (per100 <= 0) return 1;
    let uncapped = 1 + (Math.max(0, Number(pStats && pStats.maxHp) || 0) / 100) * per100;
    let cap = Math.max(1, Number(skill && skill.igniteTakenMaxMultiplier) || Infinity);
    return Math.min(uncapped, cap);
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
    let dps = source > 0 ? getDamageAilmentBaseDpsFromHit(source, ail ? ail.power : 0, 1, ail ? ail.critDotBonusPct : 0, 1) : getPlayerDamageAilmentFallbackDps(ail ? ail.type : null, ail ? ail.power : 0, pStats);
    if (pStats && pStats.uniqueArmorAppliesToDot) {
        let armor = Math.max(0, Number(pStats.armor) || 0);
        let armorRed = Math.min(0.8, armor / (armor + 1200));
        dps = Math.max(0, Math.floor(dps * (1 - armorRed)));
    }
    return dps;
}

function applyEnemyAilmentFromHit(enemy, pStats, hitDamage, isCrit, options) {
    if (!enemy || enemy.hp <= 0) return;
    let ele = (pStats.sSkill && pStats.sSkill.ele) || 'phys';
    let primaryType = getAilmentTypeFromElement(ele);
    let opts = (options && typeof options === 'object') ? options : {};
    let sourceHitDamage = Math.max(0, Math.floor(Number(opts.ailmentSourceDamage !== undefined ? opts.ailmentSourceDamage : hitDamage) || 0));
    let catalystAilmentMul = (game.ascendClass === 'catalyst' && hasKeystone('ct1')) ? 2 : 1;
    let ailmentPowerSourceDamage = Math.max(0, Math.floor(sourceHitDamage * Math.max(0.01, Number(pStats && pStats.ailmentPowerMultiplier) || 1) * catalystAilmentMul));
    let critDotBonusPct = Math.max(0, Number(opts.critDotBonusPct !== undefined ? opts.critDotBonusPct : (isCrit ? 50 : 0)) || 0);
    let ailmentDotScore = getDamageAilmentScore(ailmentPowerSourceDamage, critDotBonusPct, pStats && Number.isFinite(pStats.dotDamageScale) ? pStats.dotDamageScale : 1, pStats && Number.isFinite(pStats.dotCritBonusScale) ? pStats.dotCritBonusScale : 1);
    let hitRatio = Math.max(0.001, Math.min(0.35, ailmentPowerSourceDamage / Math.max(1, enemy.maxHp || 1)));
    let hitPower = Math.sqrt(Math.max(1, ailmentPowerSourceDamage)) * 0.01;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    function applyAilmentType(type, forceChance) {
        let baseChance = (Number.isFinite(forceChance) ? forceChance : getPlayerAilmentChance(pStats, type));
        let tryProc = Math.max(0, Math.min(1, baseChance + (isCrit ? 0.25 : 0)));
        if (Math.random() >= tryProc) return false;
        let resKey = 'ailRes' + type.charAt(0).toUpperCase() + type.slice(1);
        let ailResPen = (pStats && pStats.ailmentResistPenPct) || 0;
        let resistChance = Math.max(0, Math.min(0.95, ((enemy[resKey] || 0) - ailResPen) / 100));
        if (Math.random() < resistChance) return false;
        if (type === 'freeze' && Math.random() >= getFreezeApplyChanceFromHitRatio(hitRatio, enemy.maxHp || 1)) return false;
        let damageAilment = isDamageAilmentType(type);
        let power = damageAilment
            ? 0.90
            : Math.max(0.05, Math.min(1.5, hitPower + (hitRatio * 1.8)));
        let row = enemy.ailments.find(a => a.type === type);
        let durationMul = damageAilment ? Math.max(0.05, (pStats && Number.isFinite(pStats.dotDurationMultiplier)) ? pStats.dotDurationMultiplier : 1) : 1;
        let dur = (damageAilment ? 3 : (type === 'freeze' ? (0.8 + hitRatio * 4) : (2 + hitRatio * 10))) * durationMul;
        let payload = { type: type, time: dur, power: power, stacks: 1 };
        if (damageAilment) {
            payload.sourceHitDamage = ailmentPowerSourceDamage;
            payload.critDotBonusPct = critDotBonusPct;
            payload.ailmentDotScore = ailmentDotScore;
        }
        if (row) {
            row.time = Math.max(row.time || 0, dur);
            row.power = Math.max(row.power || 0, power);
            if (damageAilment) {
                let rowScore = Math.max(0, Number(row.ailmentDotScore) || getStoredAilmentHitDamage(row));
                let incomingScore = ailmentDotScore;
                if (incomingScore >= rowScore) {
                    row.sourceHitDamage = ailmentPowerSourceDamage;
                    row.critDotBonusPct = critDotBonusPct;
                    row.ailmentDotScore = incomingScore;
                }
            }
            if (damageAilment) {
                let maxStacks = getEnemyDamageAilmentMaxStacks();
                row.stacks = Math.max(1, Math.min(maxStacks, Math.floor((row.stacks || 1) + 1)));
            }
        } else enemy.ailments.push(payload);
        return true;
    }
    applyAilmentType(primaryType);
    if (ele === 'cold') applyAilmentType('freeze');
    if (game.ascendClass === 'catalyst' && hasKeystone('ct8')) {
        let now = Date.now();
        if ((game.catalystBurstReadyAt || 0) <= now) {
            let maxDamageAilmentStacks = getEnemyDamageAilmentMaxStacks();
            let burstReady = (enemy.ailments || []).some(a => a && ['ignite','poison','bleed'].includes(a.type) && (a.stacks || 1) >= maxDamageAilmentStacks && (a.time || 0) > 0);
            if (burstReady) {
                let burst = 0;
                (enemy.ailments || []).forEach(a => {
                    if (!a || !['ignite','poison','bleed'].includes(a.type) || (a.time || 0) <= 0) return;
                    let dps = getEnemyDamageAilmentDps(a, pStats);
                    burst += Math.max(0, Math.floor(dps * Math.min(2, a.time || 0)));
                    a.time = 0;
                });
                if (burst > 0) {
                    applyDamageToEnemyResource(enemy, burst);
                    game.catalystBurstReadyAt = now + 1000;
                }
            }
        }
    }
}

function tickEnemyAilments(pStats, dt) {
    let zone = getZone(game.currentZoneId);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (getAbyssMonsterScales(zone).playerDamageMul || 1);
    let storyAct = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
    (game.enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0) return;
        if (zone && zone.id === 'colony_run' && Number(enemy.colonyDist || 0) > 8) return;
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
                let stackMul = Math.max(1, Math.floor(ail.stacks || 1));
                let dotDmg = dps > 0 ? Math.max(1, Math.floor(dps * stackMul * dt * (1 - enemyRes / 100) * abyssPlayerMul * igniteMul)) : 0;
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
        if (zone && zone.id === 'colony_run' && Number(enemy.colonyDist || 0) > 8) return;
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
    if (zone.id === 'beehive_run' || zone.id === 'colony_run' || zone.id === 'grand_breach_run') return false;
    if (typeof zone.id === 'string' && zone.id.includes('_boss_')) return false;
    return ['act', 'abyss', 'trial', 'meteor', 'labyrinth', 'chaosRealm', 'skyTower'].includes(zone.type);
}

function reconcileMapProgressRuntimeState() {
    let zone = getZone(game.currentZoneId) || getZone(0);
    if (!zone) return false;
    if (typeof reconcileBeehiveRunState === 'function') reconcileBeehiveRunState();
    zone = getZone(game.currentZoneId) || getZone(0);
    if (!isRegularAutoProgressZone(zone)) return false;
    let changed = false;
    let explicitStop = (game.settings && ((game.settings.mapCompleteAction || 'nextZone') === 'stop' || (game.settings.townReturnAction || 'retry') === 'stop')) || !!game.pendingLoopDecision || !!game.pendingLoopReady;
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
    if (zone && zone.id === 'grand_breach_run') {
        tickGrandBreachRun(zone);
        return;
    }
    if (zone && zone.type === 'woodsmanEcho') {
        tickWoodsmanEchoRun();
        return;
    }
    ensureEncounterRun();
    if (game.runProgress >= 100) return;
    if (isCrowdProgressPaused()) return;
    let abyssScale = getAbyssMonsterScales(zone);
    let enemyCount = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
    let zoneType = zone ? zone.type : 'act';
    let baseGain = zoneType === 'trial' ? 0.26 : (zoneType === 'abyss' ? 0.42 : (zoneType === 'skyTower' ? 0.072 : 0.36));
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


function ensureWoodsmanEchoRunState() {
    game.woodsmanEchoRun = (game.woodsmanEchoRun && typeof game.woodsmanEchoRun === 'object') ? game.woodsmanEchoRun : {};
    let run = game.woodsmanEchoRun;
    run.active = !!run.active;
    run.duration = 30;
    run.timeLeft = Math.max(0, Number(run.timeLeft || 0));
    run.lastTickAt = Math.max(0, Math.floor(run.lastTickAt || 0));
    run.totalDamage = Math.max(0, Math.floor(run.totalDamage || 0));
    run.bestDps = Math.max(0, Number(run.bestDps || 0));
    return run;
}
function finishWoodsmanEchoRun() {
    let run = ensureWoodsmanEchoRunState();
    let elapsed = Math.max(0.001, run.duration - Math.max(0, run.timeLeft || 0));
    let dps = run.totalDamage / elapsed;
    run.bestDps = Math.max(run.bestDps || 0, dps);
    run.active = false;
    run.timeLeft = 0;
    game.enemies = [];
    game.combatHalted = true;
    game.currentZoneId = CHAOS_REALM_ZONE_ID;
    addLog(`🪵 나무꾼의 잔상: 총 피해 ${Math.floor(run.totalDamage).toLocaleString()} · 최종 DPS ${Math.floor(dps).toLocaleString()} (최고 ${Math.floor(run.bestDps).toLocaleString()})`, 'season-up');
    updateStaticUI();
}
function tickWoodsmanEchoRun() {
    let run = ensureWoodsmanEchoRunState();
    if (!run.active) return;
    let now = Date.now();
    run.lastTickAt = Number.isFinite(run.lastTickAt) && run.lastTickAt > 0 ? run.lastTickAt : now;
    run.timeLeft = Math.max(0, run.timeLeft - Math.max(0, (now - run.lastTickAt) / 1000));
    run.lastTickAt = now;
    let target = (game.enemies || []).find(e => e && e.hp > 0);
    if (target) run.totalDamage = Math.max(0, Math.floor((target.echoStartHp || target.maxHp || 0) - Math.max(0, target.hp || 0)));
    if (run.timeLeft <= 0) finishWoodsmanEchoRun();
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
    game.equippedSummonSkills = Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [];
    game.equippedSummonSkills.forEach(name => {
        let def = SKILL_DB[name] || {};
        if (!def || !Array.isArray(def.tags) || !def.tags.includes('summon_attack')) return;
        game.gemData = game.gemData || {};
        game.gemData[name] = normalizeGemRecord(game.gemData[name]);
        let gem = game.gemData[name];
        if (gem && gem.level < 20) {
            gem.exp += gemExp;
            if (gem.exp >= getGemReqExp(gem.level)) {
                gem.level++;
                gem.exp = 0;
                addLog(`🐾 소환수 젬 [${name}] 레벨업!`, "loot-unique");
            }
        }
    });
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
                    let tierCap = typeof getSupportTierCap === 'function' ? getSupportTierCap(gem) : 3;
                    let before = Math.max(1, Math.min(tierCap, Math.floor(record.unlockedTier || 1)));
                    record.unlockedTier = before;
                    record.activeTier = Math.max(1, Math.min(before, Math.floor(record.activeTier || 1)));
                    if (before < tierCap) {
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
                            let resonanceCap = typeof getEffectiveResonanceCap === 'function' ? getEffectiveResonanceCap() : Math.floor((game.resonancePower || 0) + ((getPlayerStats().runeResonancePower || 0)));
                            let remain = Math.max(0, resonanceCap - used);
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
                    let tierLabel = typeof getSupportTierLabel === 'function' ? getSupportTierLabel(gem, tier) : (tier >= 3 ? '상급' : tier === 2 ? '중급' : '하급');
                    if (game.settings.showLootLog) addLog(`🟢 보조젬 <span class='loot-rare'>[${gem}]</span> 획득! (해금: ${tierLabel})`);
                }
            }
        }
    }

    getCurrencyDrops(enemy).forEach(drop => {
        if (!drop || !drop[0]) return;
        if (drop[0] === 'blurred45') {
            let gain = typeof addCoreCubeBlurred45 === 'function' ? addCoreCubeBlurred45(drop[1]) : 0;
            addBattleFx('lootPickup', { enemyId: enemy.id, color: '#9de8ff', duration: 760 });
            if (game.settings.showLootLog) addLog(`🧊 흐릿한 45면체 +${gain || drop[1]}`, 'loot-unique');
            return;
        }
        awardCurrency(drop[0], drop[1]);
        addBattleFx('lootPickup', { enemyId: enemy.id, color: (drop[0] === 'divine' || drop[0] === 'exalted') ? '#ffd166' : '#9ad1ff', duration: 760 });
        if (drop[0] === 'divine' || drop[0] === 'exalted') addBattleFx('lootCelebration', { enemyId: enemy.id, color: '#ffcf6b', duration: 980 });
        let currencyName = typeof getStyledOrbName === 'function' ? getStyledOrbName(drop[0]) : ((ORB_DB[drop[0]] && ORB_DB[drop[0]].name) || drop[0]);
        if (game.settings.showLootLog) addLog(`🪙 ${currencyName} +${drop[1]}`, drop[0] === 'divine' || drop[0] === 'exalted' ? 'loot-unique' : 'loot-magic');
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
    let isDeepChaosZone = zone && zone.type === 'abyss' && Math.max(0, Math.floor(zone.depth || 0)) >= 21;
    if ((game.season || 1) >= 15 && (isDeepChaosZone || game.currentZoneId === 'beehive_run' || game.currentZoneId === 'grand_breach_run')) {
        let traceChance = isDeepChaosZone ? 0.006 : (game.currentZoneId === 'grand_breach_run' ? 0.009 : 0.004);
        if (Math.random() < traceChance) {
            awardCurrency('colonyTrace', 1);
            addLog('🧭 군락지 흔적을 발견했습니다.', 'loot-magic', { noToast: true });
        }
    }

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
    spreadCatalystAilmentsOnDeath(enemy);
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
    if (pStats && (pStats.runeCorpseExplodeChance || 0) > 0 && Math.random() < Math.max(0, Math.min(1, Number(pStats.runeCorpseExplodeChance || 0) / 100))) {
        let lifePct = Math.max(0, Number(pStats.runeCorpseExplodeLifePct || 0));
        let splash = Math.max(1, Math.floor((enemy.maxHp || 0) * (lifePct / 100)));
        (game.enemies || []).forEach(target => {
            if (!target || target.id === enemy.id || target.hp <= 0) return;
            target.hp = Math.max(0, target.hp - splash);
            if (target.hp <= 0) handleEnemyDeath(target, pStats);
        });
        if (game.settings.showCombatLog) addLog(`💥 룬 시체폭발 발동! 주변 몬스터에게 ${splash} 피해`, 'attack-player');
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
    if (pStats && pStats.uniqueKillMoveStacks) {
        let now = Date.now();
        let state = game.uniqueKillMoveStacksState || { stacks: 0, expiresAt: 0, lastProcAt: 0 };
        if ((state.lastProcAt || 0) + Math.floor((pStats.uniqueKillMoveStacks.cooldownSec || 1) * 1000) <= now) {
            state.stacks = Math.min(Math.max(1, Math.floor(pStats.uniqueKillMoveStacks.maxStacks || 20)), Math.max(0, Math.floor(state.stacks || 0)) + 1);
            state.lastProcAt = now;
        }
        state.expiresAt = now + Math.floor((pStats.uniqueKillMoveStacks.duration || 20) * 1000);
        game.uniqueKillMoveStacksState = state;
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
    if (zone && zone.id === 'colony_run' && game.colony && game.colony.inRun) {
        game.colony.kills = Math.max(0, Math.floor((game.colony.kills || 0) + 1));
        if ((game.colony.kills || 0) >= Math.max(1, Math.floor(game.colony.requiredKills || 1))) {
            if (Math.random() < 0.6) awardCurrency('colonyShard', 1 + Math.floor((game.colony.wave || 1) / 3));
            if (Math.random() < 0.35) awardCurrency('chaos', 1);

            if (Math.random() < 0.42) {
                let c = game.colony || (game.colony = {});
                c.wardInventory = Array.isArray(c.wardInventory) ? c.wardInventory : [];
                if (typeof generateColonyWard === 'function') {
                    let ward = generateColonyWard();
                    c.wardInventory.push(ward);
                    addLog(`🛡️ 군락지 액막이 부적 획득: ${ward.name}`, 'loot-rare');
                }
            }
            if (Math.random() < 0.42) {
                let c = game.colony || (game.colony = {});
                c.wardInventory = Array.isArray(c.wardInventory) ? c.wardInventory : [];
                if (typeof generateColonyWard === 'function') {
                    let ward = generateColonyWard();
                    c.wardInventory.push(ward);
                    addLog(`🛡️ 군락지 액막이 부적 획득: ${ward.name}`, 'loot-rare');
                }
            }
            game.colony.wave = Math.max(1, Math.floor((game.colony.wave || 1) + 1));
            game.colony.kills = 0;
            game.colony.requiredKills = Math.min(60, 16 + Math.floor((game.colony.wave || 1) * 3));
            if (typeof spawnColonyWave === 'function') spawnColonyWave();
            addLog(`🪲 군락지 웨이브 완료! 다음 웨이브 ${game.colony.wave} 시작.`, 'loot-magic');
        }
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

function ensureNextEndlessChaosDepthUnlocked(depth) {
    let clearedDepth = Math.max(1, Math.floor(depth || 1));
    if ((game.season || 1) < 10 || clearedDepth < 20) return 0;
    game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
    let nextDepth = Math.max(21, clearedDepth + 1);
    if (!game.abyssUnlockedDepths.includes(nextDepth)) game.abyssUnlockedDepths.push(nextDepth);
    game.abyssUnlockedDepths = Array.from(new Set(game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 20))).sort((a, b) => a - b);
    return nextDepth;
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

function unlockConditionGemsAfterRootBossClear() {
    if (game.conditionGemUnlocked || (game.season || 1) < 2) return false;
    game.conditionGemUnlocked = true;
    addLog('🧠 컨디션 젬 시스템이 해금되었습니다!', 'loot-unique');
    return true;
}

function finishEncounterRun() {
    let zone = getZone(game.currentZoneId);
    let mapAction = (game.settings && game.settings.mapCompleteAction) || 'nextZone';
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
        unlockJournalEntry('woodsman_echo');
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
    if (zone.type === 'skyTower') {
        let st = ensureSkyTowerState();
        let floor = Math.max(1, Math.floor(zone.floor || st.currentFloor || 1));
        let remainingBefore = getSkyTowerRemainingClears();
        if (remainingBefore > 0) {
            st.clearedFloors = Array.isArray(st.clearedFloors) ? st.clearedFloors : [];
            let firstClear = !st.clearedFloors.includes(floor);
            let reward = 0;
            if (firstClear) {
                reward = getSkyTowerRewardAmount(floor);
                st.clearedFloors.push(floor);
                st.clearedFloors = Array.from(new Set(st.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b);
                st.highestFloor = Math.max(Math.floor(st.highestFloor || 1), floor + 1);
                st.currentFloor = Math.min(st.highestFloor, floor + 1);
            } else {
                if (Math.random() < 0.16) reward = Math.max(1, Math.floor(getSkyTowerRewardAmount(floor) * 0.35));
                st.currentFloor = Math.max(1, Math.min(Math.floor(st.highestFloor || 1), floor));
            }
            if (reward > 0) st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + reward;
            st.clearedThisLoop = Math.min(getSkyTowerLoopClearLimit(), Math.max(0, Math.floor(st.clearedThisLoop || 0)) + 1);
            let rewardText = firstClear
                ? `최초 클리어 보상: 응축된 창공의 힘 +${reward}`
                : (reward > 0 ? `반복 클리어 보상: 응축된 창공의 힘 +${reward}` : '반복 클리어: 응축된 창공의 힘 미발견');
            addLog(`☁️ 창공의 탑 ${floor}층 돌파! ${rewardText} · 이번 루프 잔여 클리어 ${getSkyTowerRemainingClears()}/${getSkyTowerLoopClearLimit()}`, reward > 0 ? 'loot-unique' : 'season-up');
        } else {
            addLog(`☁️ 창공의 탑 ${floor}층 도전 완료. 이번 루프의 클리어 보상/진행 한도는 모두 사용했습니다.`, 'attack-monster');
        }
        game.killsInZone = 0;
        game.currentZoneId = SKY_TOWER_ZONE_ID;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(220);
        return;
    }
    if (zone.type === 'trial' && zone.bloomTrial) {
        handleTalentBloomClear(zone);
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
        unlockConditionGemsAfterRootBossClear();
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
        let clearedFloor = Math.max(1, Math.floor(game.labyrinthFloor || zone.floor || 1));
        if (mapAction === 'repeatZone') {
            game.labyrinthFloor = clearedFloor;
        } else {
            game.labyrinthFloor = clearedFloor + 1;
            game.labyrinthUnlockedMaxFloor = Math.max(game.labyrinthUnlockedMaxFloor || 1, game.labyrinthFloor || 1);
            if ((game.labyrinthUnlockedMaxFloor || 1) > prevLab && typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'labyrinth_new_floor');
        }
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
    if (zone.type === 'underworld') {
        let uw = (game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : { highestFloor: 1, currentFloor: 1 };
        game.underworldProgress = uw;
        let floor = Math.max(1, Math.floor(zone.floor || uw.currentFloor || 1));
        uw.highestFloor = Math.max(Math.floor(uw.highestFloor || 1), floor + 1);
        uw.currentFloor = Math.min(uw.highestFloor, floor + 1);
        if (floor >= 10) uw.floor10Cleared = true;
        if (!game.underworldRunes || typeof game.underworldRunes !== 'object') game.underworldRunes = { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [] };
        if (floor % 10 === 0) {
            let runeState = game.underworldRunes;
            let unlockTier = Math.floor(floor / 10);
            let prevSlots = Math.max(0, Math.floor(runeState.unlockedSlots || 0));
            let prevMaxRuneNo = Math.max(0, Math.floor(runeState.unlockedRunesMaxNumber || 0));
            runeState.unlockedSlots = Math.min(6, Math.max(prevSlots, unlockTier));
            runeState.unlockedRunesMaxNumber = Math.min(30, Math.max(prevMaxRuneNo, unlockTier));
            if (runeState.unlockedSlots > prevSlots || runeState.unlockedRunesMaxNumber > prevMaxRuneNo) {
                addLog(`🧿 지하계 ${floor}층 보상: 룬 슬롯 ${runeState.unlockedSlots}/6, 룬 번호 1~${runeState.unlockedRunesMaxNumber} 해금`, 'loot-unique');
            }
        }
        addLog(`🕳️ 지하계 ${floor}층 돌파! ${uw.currentFloor}층까지 하강 가능합니다.`, 'season-up');
        game.killsInZone = 0;
        if (mapAction === 'repeatZone') game.currentZoneId = UNDERWORLD_ZONE_ID;
        else if (mapAction === 'nextLoopBestPlusOne') {
            let nextZone = resolveNextLoopBestPlusOneZone(zone);
            game.currentZoneId = nextZone !== null ? nextZone : UNDERWORLD_ZONE_ID;
        } else if (mapAction === 'stop') {
            game.combatHalted = true;
            game.enemies = [];
            game.encounterPlan = [];
            game.encounterIndex = 0;
            game.runProgress = 0;
            updateStaticUI();
            queueImportantSave(180);
            return;
        } else game.currentZoneId = UNDERWORLD_ZONE_ID;
        startMoving(false);
        updateStaticUI();
        queueImportantSave(220);
        return;
    }
    if (zone.type === 'cosmos') {
        if (typeof window.exploreSelectedCosmosNode === 'function') {
            window.exploreSelectedCosmosNode(zone.cosmosNodeId || null);
        }
        if (game.cosmosAtlas && typeof game.cosmosAtlas === 'object') game.cosmosAtlas.activeChallenge = null;
        game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
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
            ensureNextEndlessChaosDepthUnlocked(depth);
            if (depth >= 20) {
                game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0 };
                game.loopProgressCurrent.chaos20Cleared = true;
                if (typeof maybeUnlockSkyTowerFromChaos20 === 'function') maybeUnlockSkyTowerFromChaos20();
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
                addLog('🗡️ 창조 권능 절단이 완성되었다. 나무꾼을 베어낸 루프가 새 루프의 문을 연다.', 'loot-unique');
                handleSeasonLoopConditionMet();
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
                ensureNextEndlessChaosDepthUnlocked(nowEndless);
                // Preserve a higher recorded endless depth when clearing a lower loop cap; continuing advances from here.
                // Setting this to the unlocked next depth would double-advance and skip a floor (e.g. 20 -> 22).
                game.abyssEndlessDepth = nowEndless;
                game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0 };
                let seasonAbyssCap = getSeasonAbyssDepthCap(game.season || 1);
                let bestAbyssDepthBeforeClear = Math.max(0, Math.floor(game.loopProgressCurrent.bestAbyssDepth || 0));
                let hadCurrentSeasonLoopRequirementBeforeClear = seasonAbyssCap <= 20
                    ? (typeof hasCurrentLoopChaos20Clear === 'function' ? hasCurrentLoopChaos20Clear() : !!game.loopProgressCurrent.chaos20Cleared)
                    : bestAbyssDepthBeforeClear >= seasonAbyssCap;
                if (depth >= 21) game.loopProgressCurrent.bestAbyssDepth = Math.max(bestAbyssDepthBeforeClear, depth);
                game.loopProgressCurrent.chaos20Cleared = true;
                if (typeof maybeUnlockSkyTowerFromChaos20 === 'function') maybeUnlockSkyTowerFromChaos20();
                if (depth >= 21 && hadCurrentSeasonLoopRequirementBeforeClear) {
                    enterNextEndlessChaosDepth();
                    return;
                }
                game.pendingLoopDecision = true;
                game.combatHalted = true;
                game.enemies = [];
                game.encounterPlan = [];
                game.encounterIndex = 0;
                game.runProgress = 0;
                updateStaticUI();
                return;
            }
            handleSeasonLoopConditionMet();
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
        return;
    }
    // 구역 maxKills 미달성 시 — 다음 encounter 진행
    checkUnlocks();
    startMoving(false);
    updateStaticUI();
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

    // 키스톤으로 보장된 치명타(암살자 a5, 촉매 ct7 공격 스킬)는 적 치명타 저항 굴림도 무시한다.
    let guaranteedCrit = (game.ascendClass === 'assassin' && hasKeystone('a5'))
        || (game.ascendClass === 'catalyst' && hasKeystone('ct7') && Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('attack'));
    let isCrit = guaranteedCrit || Math.random() < (pStats.crit / 100);
    if (typeof talentOnPlayerAttack === 'function') talentOnPlayerAttack(pStats, isCrit);
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
    let riderCompassReady = !!(pStats.uniqueRiderCompass && (game.lastMoveEndedAt || 0) > 0 && !game.uniqueRiderCompassConsumed);
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
    if (!['phys','fire','cold','light','chaos'].includes(swingElement)) swingElement = (pStats.sSkill && pStats.sSkill.ele) || 'phys';
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
    if (passiveSlamEchoChance > 0 && Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('slam')) slamEchoPct = Math.max(slamEchoPct, Math.max(0.25, (Number(pStats.slamEchoDamagePct || 0) / 100)));
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
    if (game.ascendClass === 'hunter' && hasKeystone('h7')) {
        pStats.sSkill.targets = 1;
    }
    let perEnemyHitCount = new Map();
    let originalPierceTargets = new Set(targets.map(entry => entry && entry.enemy).filter(Boolean));
    let pierceOverkillCarryStartedTargets = new Set();
    let hitSummary = { totalHits: 0, totalDamage: 0, uniqueTargets: new Set() };
    function applyPierceOverkillCarry(sourceEnemy, carryDamage, hitElement, hitCrit, ailmentCarrySourceDamage) {
        let hunterSinglePierce = game.ascendClass === 'hunter' && hasKeystone('h4') && (game.enemies || []).filter(e => e && e.hp > 0).length === 1;
        if ((!pStats.sSkill.pierceOverkillCarry && !hunterSinglePierce) || carryDamage <= 0) return;
        let remainingDamage = Math.max(0, Math.floor(carryDamage));
        let remainingAilmentSourceDamage = Math.max(0, Math.floor(Number(ailmentCarrySourceDamage !== undefined ? ailmentCarrySourceDamage : carryDamage) || 0));
        let visited = new Set(sourceEnemy && sourceEnemy.id ? [sourceEnemy.id] : []);
        let chainLimit = Math.max(1, Math.min(12, Math.floor(pStats.sSkill.targets || 1)));
        for (let chainIdx = 0; chainIdx < chainLimit && remainingDamage > 0; chainIdx++) {
            let chainTarget = (game.enemies || []).find(enemy => enemy && enemy.hp > 0 && !visited.has(enemy.id)
                && (!pStats.sSkill.pierceOverkillCarry || !originalPierceTargets.has(enemy)));
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
            applyEnemyAilmentFromHit(chainTarget, { ...pStats, sSkill: { ...pStats.sSkill, ele: hitElement } }, remainingDamage, hitCrit, {
                ailmentSourceDamage: remainingAilmentSourceDamage,
                critDotBonusPct: hitCrit ? 50 : 0
            });
            if (chainTarget.hp <= 0) {
                let prevRemainingDamage = remainingDamage;
                remainingDamage = Math.max(0, remainingDamage - dealtToChain);
                let carryRatio = prevRemainingDamage > 0 ? (remainingDamage / prevRemainingDamage) : 0;
                remainingAilmentSourceDamage = Math.max(0, Math.floor(remainingAilmentSourceDamage * carryRatio));
            } else {
                remainingDamage = 0;
                remainingAilmentSourceDamage = 0;
            }
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
            let curseFx = getEnemyConditionDebuffFactor(targetEnemy, pStats);
            let enemyRes = getEffectiveEnemyMitigation(hitElement, zoneTier, targetEnemy, pStats) - (curseFx.resShred || 0);
            if (hitElement === 'fire') enemyRes -= (curseFx.resFShred || 0);
            if (hitElement === 'cold') enemyRes -= (curseFx.resCShred || 0);
            if (hitElement === 'light') enemyRes -= (curseFx.resLShred || 0);
            if (hitElement === 'chaos') enemyRes -= (curseFx.resChaosShred || 0);
            if (hitElement === 'phys') enemyRes -= (curseFx.physDrShred || 0);
            if (targetEnemy && Array.isArray(targetEnemy.ailments)) { let rs = targetEnemy.ailments.find(a => a && a.type === 'realmAllResDown' && (a.time || 0) > 0); if (rs) enemyRes -= Math.max(0, Math.floor(rs.stacks || 0)) * Math.max(0, Number((pStats.uniqueAllResDownOnHit && pStats.uniqueAllResDownOnHit.perHit) || 0)); }
            let hitCrit = isCrit;
            if (pStats.uniqueAllResDownOnHit && targetEnemy) {
                let now = Date.now();
                targetEnemy.ailments = Array.isArray(targetEnemy.ailments) ? targetEnemy.ailments : [];
                let row = targetEnemy.ailments.find(a => a && a.type === 'realmAllResDown');
                if (!row) { row = { type: 'realmAllResDown', stacks: 0, time: 0 }; targetEnemy.ailments.push(row); }
                row.stacks = Math.min(Math.max(1, Math.floor(pStats.uniqueAllResDownOnHit.max || 4)), Math.max(0, Math.floor(row.stacks || 0)) + 1);
                row.time = Math.max(row.time || 0, Number(pStats.uniqueAllResDownOnHit.duration || 5));
            }
            let hitBaseDamage = pStats.baseDmg;
            let ailmentBaseDamage = pStats.baseDmg;
            if (game.ascendClass === 'hunter' && hasKeystone('h8')) {
                let critCount = 0;
                let critChancePct = Math.max(0, Number(pStats.crit) || 0);
                while (critChancePct > 0) {
                    let slice = Math.min(100, critChancePct);
                    if (Math.random() * 100 < slice) critCount++;
                    critChancePct -= 100;
                }
                if (critCount > 0) {
                    hitCrit = true;
                    let critMul = Math.max(1, pStats.critDmg / 100);
                    hitBaseDamage = Math.floor(hitBaseDamage * (1 + ((critMul - 1) * critCount)));
                }
            } else {
                hitBaseDamage = hitCrit ? Math.floor(pStats.baseDmg * (pStats.critDmg / 100)) : pStats.baseDmg;
            }
            if (hitCrit && !guaranteedCrit && (targetEnemy.critResistPct || 0) > 0 && Math.random() * 100 < Math.max(0, Math.min(95, targetEnemy.critResistPct || 0))) {
                hitCrit = false;
                hitBaseDamage = pStats.baseDmg;
            }
            if (hitCrit && (targetEnemy.critDamageResistPct || 0) > 0) {
                let critResist = Math.max(0, Math.min(95, Number(targetEnemy.critDamageResistPct || 0))) / 100;
                let basePart = Math.max(1, Math.floor(pStats.baseDmg || 1));
                hitBaseDamage = Math.max(1, Math.floor(basePart + Math.max(0, hitBaseDamage - basePart) * (1 - critResist)));
            }
            if (riderCompassReady) {
                hitBaseDamage = Math.floor(hitBaseDamage * 2);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * 2);
                riderCompassReady = false;
                game.uniqueRiderCompassConsumed = true;
            }
            if (hitCrit && game.ascendClass === 'assassin' && hasKeystone('a7') && (game.enemies || []).filter(e => e && e.hp > 0).length === 1) hitBaseDamage *= 2;
            if (hitCrit && game.activeSkill === '묵직한 강타' && pStats.sSkill.finalLevel >= 20) hitBaseDamage *= 2;
            let randomElementPct = pStats.randomElementDamagePct && Number(pStats.randomElementDamagePct[hitElement]) ? Number(pStats.randomElementDamagePct[hitElement]) : 0;
            if (randomElementPct) {
                hitBaseDamage = Math.floor(hitBaseDamage * (1 + randomElementPct / 100));
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * (1 + randomElementPct / 100));
            }
            if (hitElement === 'phys') {
                let physMul = Math.max(0, Number(pStats.warriorPhysDamageMultiplier) || 1);
                hitBaseDamage = Math.floor(hitBaseDamage * physMul);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * physMul);
            }
            if (game.ascendClass === 'hunter' && hasKeystone('h1')) {
                let aliveCnt = (game.enemies || []).filter(e => e && e.hp > 0).length;
                let hunterMul = aliveCnt === 1 ? 1.25 : 1.10;
                hitBaseDamage = Math.floor(hitBaseDamage * hunterMul);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * hunterMul);
            }
            if (game.ascendClass === 'soulbinder' && hasKeystone('sb7')) {
                let soulbinderMul = 1 + Math.max(0, (pStats.sbPlayerDamageFromSummonPct || 0) * (pStats.summonPctDmg || 0)) / 100;
                hitBaseDamage = Math.floor(hitBaseDamage * soulbinderMul);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * soulbinderMul);
            }
            if (game.ascendClass === 'catalyst' && hasKeystone('ct5') && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && (a.time || 0) > 0)) {
                hitBaseDamage = Math.floor(hitBaseDamage * 1.2);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * 1.2);
            }
            if (targetEnemy.isBoss) {
                let bossMul = Math.max(0, Number(pStats.bossDamageDealtMultiplier) || 1);
                hitBaseDamage = Math.floor(hitBaseDamage * bossMul);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * bossMul);
            }
            if (game.ascendClass === 'gladiator' && hasKeystone('g5') && game.gladiatorSwiftOpeningReady) {
                hitBaseDamage = Math.floor(hitBaseDamage * 1.30);
                ailmentBaseDamage = Math.floor(ailmentBaseDamage * 1.30);
                game.gladiatorSwiftOpeningReady = false;
            }
            let dmg = Math.floor(hitBaseDamage * (hit.mult || 1));
            let ailmentSourceDamage = Math.floor(ailmentBaseDamage * (hit.mult || 1));
            if (!Number.isFinite(dmg)) dmg = 0;
            let minRoll = Math.max(1, Math.floor(pStats.minDmgRoll || 80));
            let maxRoll = Math.max(minRoll, Math.floor(pStats.maxDmgRoll || 100));
            let rollPct = minRoll + Math.random() * (maxRoll - minRoll);
            if (pStats.uniqueCeilingSmashDouble && rollPct >= 140 && Math.random() < 0.15) {
                dmg *= 2;
                ailmentSourceDamage *= 2;
            }
            dmg = Math.floor(dmg * (rollPct / 100));
            ailmentSourceDamage = Math.floor(ailmentSourceDamage * (rollPct / 100));
            if (hitElement === 'chaos') {
                let chaosMultiplier = Math.max(0, Number(pStats.chaosDamageMultiplier) || 1);
                dmg = Math.floor(dmg * chaosMultiplier);
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * chaosMultiplier);
            }
            if ((targetEnemy.firstHitGuard || 0) > 0 && !targetEnemy.firstHitConsumed) {
                dmg = Math.floor(dmg * (1 - targetEnemy.firstHitGuard));
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * (1 - targetEnemy.firstHitGuard));
                targetEnemy.firstHitConsumed = true;
            }
            let burstHits = Math.max(0, (targetEnemy.recentHitsTaken || 0) - 2);
            let hitGuard = (targetEnemy.hitRateGuard || 0) * Math.min(5, burstHits);
            if (hitGuard > 0) {
                let hitGuardMul = Math.max(0.2, 1 - hitGuard);
                dmg = Math.floor(dmg * hitGuardMul);
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * hitGuardMul);
            }
            if ((targetEnemy.comboTakenLessPct || 0) > 0 && burstHits > 0) {
                let comboLess = Math.max(0, Math.min(85, Number(targetEnemy.comboTakenLessPct || 0) * Math.min(5, burstHits) / 5));
                dmg = Math.floor(dmg * (1 - comboLess / 100));
                ailmentSourceDamage = Math.floor(ailmentSourceDamage * (1 - comboLess / 100));
            }
            let damageBeforeMitigation = dmg;
            let ailmentDamageBeforeCritMitigation = Math.max(0, Math.floor(ailmentSourceDamage));
            dmg = Math.floor(dmg * Math.max(0, pStats.instantDamageMultiplier || 1));
            if ((pStats.uniqueDoubleDamageChancePct || 0) > 0 && Math.random() < ((pStats.uniqueDoubleDamageChancePct || 0) / 100)) dmg *= 2;
            if ((targetEnemy.evasionChance || 0) > 0 && Math.random() * 100 < targetEnemy.evasionChance) {
                addBattleFx('enemyEvade', { enemyId: targetEnemy.id, text: '회피!', color: '#9fb4c8', duration: 260 });
                addEvasionCombatLog(targetEnemy, false);
                return;
            }
            dmg = Math.floor(dmg * (1 - (enemyRes / 100)));
            let addedDamagePctByElement = (pStats && pStats.addedDamagePctByElement) || {};
            ['phys', 'fire', 'cold', 'light', 'chaos'].forEach(addEle => {
                let addPct = Math.max(0, Number(addedDamagePctByElement[addEle] || 0));
                let rawAdded = Math.floor(damageBeforeMitigation * addPct / 100);
                if (rawAdded <= 0) return;
                let addRes = getEffectiveEnemyMitigation(addEle, zoneTier, targetEnemy, pStats) - (curseFx.resShred || 0);
                if (addEle === 'fire') addRes -= (curseFx.resFShred || 0);
                if (addEle === 'cold') addRes -= (curseFx.resCShred || 0);
                if (addEle === 'light') addRes -= (curseFx.resLShred || 0);
                if (addEle === 'chaos') addRes -= (curseFx.resChaosShred || 0);
                if (addEle === 'phys') addRes -= (curseFx.physDrShred || 0);
                let mitigatedAdded = Math.floor(rawAdded * (1 - (addRes / 100)));
                if (addEle === 'phys') mitigatedAdded = Math.floor(mitigatedAdded * (targetEnemy.physicalDamageTakenMul || 1));
                if (addEle === 'light') mitigatedAdded = Math.floor(mitigatedAdded * (curseFx.lightTakenMul || 1));
                if (addEle === 'chaos') mitigatedAdded = Math.floor(mitigatedAdded * (curseFx.chaosTakenMul || 1));
                if (mitigatedAdded > 0) dmg += mitigatedAdded;
            });
            dmg = Math.floor(dmg * (curseFx.mul || 1));
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * (curseFx.mul || 1));
            if ((pStats.sSkill.tags || []).includes('projectile')) {
                let projectileTakenMul = (curseFx.projectileTakenMul || 1) * (targetEnemy.projectileDamageTakenMul || 1);
                dmg = Math.floor(dmg * projectileTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * projectileTakenMul);
            }
            if ((pStats.sSkill.tags || []).includes('spell')) {
                let spellTakenMul = targetEnemy.spellDamageTakenMul || 1;
                dmg = Math.floor(dmg * spellTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * spellTakenMul);
            }
            if (hitElement === 'phys') {
                let physicalTakenMul = targetEnemy.physicalDamageTakenMul || 1;
                dmg = Math.floor(dmg * physicalTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * physicalTakenMul);
            }
            if ((targetEnemy.armorGuard || 0) > 0 && hitElement === 'phys') {
                let armorGuardMul = Math.max(0.2, 1 - targetEnemy.armorGuard);
                dmg = Math.floor(dmg * armorGuardMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * armorGuardMul);
            }
            if (hitElement === 'light') {
                let lightTakenMul = curseFx.lightTakenMul || 1;
                dmg = Math.floor(dmg * lightTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * lightTakenMul);
            }
            if (hitElement === 'chaos') {
                let chaosTakenMul = curseFx.chaosTakenMul || 1;
                dmg = Math.floor(dmg * chaosTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * chaosTakenMul);
            }
            if (hitCrit) dmg = Math.floor(dmg * (curseFx.critDmgTakenMul || 1));
            let enemyShockTakenIncreasePct = getActiveEnemyShockTakenDamageIncreasePct(targetEnemy, pStats);
            if (enemyShockTakenIncreasePct > 0) {
                let enemyShockTakenMul = 1 + enemyShockTakenIncreasePct / 100;
                dmg = Math.floor(dmg * enemyShockTakenMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * enemyShockTakenMul);
            }
            if ((pStats.shockedEnemyHitDamageMorePct || 0) > 0 && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'shock' && (a.time || 0) > 0)) {
                let shockedMore = 1 + Math.max(0, Number(pStats.shockedEnemyHitDamageMorePct || 0)) / 100;
                dmg = Math.floor(dmg * shockedMore);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * shockedMore);
            }
            if (pStats.uniqueBleedWeightOnBleedingHit && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'bleed' && (a.time || 0) > 0)) {
                dmg = Math.floor(dmg * 2);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * 2);
            }
            if (pStats.uniqueMeleeArmorAmp && Array.isArray(pStats.sSkill.tags) && pStats.sSkill.tags.includes('melee')) {
                let now = Date.now();
                let active = (game.uniqueMeleeArmorAmpExpiresAt || 0) > now;
                let stacks = active ? Math.max(0, Math.floor(game.uniqueMeleeArmorAmpStacks || 0)) : 0;
                game.uniqueMeleeArmorAmpStacks = Math.min(Math.floor(pStats.uniqueMeleeArmorAmp.maxStacks || 3), stacks + 1);
                game.uniqueMeleeArmorAmpExpiresAt = now + Math.floor((pStats.uniqueMeleeArmorAmp.duration || 2) * 1000);
            }
            let keystoneTakenMul = getKeystoneEnemyTakenMultiplier(targetEnemy, hitElement);
            dmg = Math.floor(dmg * keystoneTakenMul);
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * keystoneTakenMul);
            dmg = Math.floor(dmg * (getAbyssMonsterScales(getZone(game.currentZoneId)).playerDamageMul || 1));
            if (targetEnemy.isBoss && (pStats.damageScales || {}).talismanBossFinalDmgBonusPct) {
                let talismanBossMul = 1 + ((pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100);
                dmg = Math.floor(dmg * talismanBossMul);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * talismanBossMul);
            }
            let finalDamageMul = Math.max(0, Number(pStats.finalDamageMultiplier) || 1);
            dmg = Math.floor(dmg * finalDamageMul);
            ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * finalDamageMul);
            if (!Number.isFinite(dmg) || dmg < 0) dmg = 0;
            if (game.ascendClass === 'hunter' && hasKeystone('h2') && targetEnemy) {
                targetEnemy.ailments = Array.isArray(targetEnemy.ailments) ? targetEnemy.ailments : [];
                let weak = targetEnemy.ailments.find(a => a && a.type === 'hunterExpose');
                if (weak) weak.time = 3;
                else targetEnemy.ailments.push({ type: 'hunterExpose', time: 3, power: 1 });
            }
            if (game.ascendClass === 'hunter' && Array.isArray(targetEnemy.ailments) && targetEnemy.ailments.some(a => a && a.type === 'hunterExpose' && (a.time || 0) > 0)) {
                dmg = Math.floor(dmg * 1.2);
                ailmentDamageBeforeCritMitigation = Math.floor(ailmentDamageBeforeCritMitigation * 1.2);
            }
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
            if (targetEnemy && targetEnemy.id && pStats.uniqueCursedTakenAndRefresh) {
                let refreshSec = Math.max(0, Number(pStats.uniqueCursedTakenAndRefresh.refreshSec || 0));
                if (refreshSec > 0 && game.enemyConditionDebuffs && Array.isArray(game.enemyConditionDebuffs[targetEnemy.id])) {
                    let nextExpire = Date.now() + Math.floor(refreshSec * 1000);
                    game.enemyConditionDebuffs[targetEnemy.id] = game.enemyConditionDebuffs[targetEnemy.id].map(deb => {
                        if (!deb) return deb;
                        if ((deb.expiresAt || 0) > Date.now()) deb.expiresAt = Math.max(deb.expiresAt || 0, nextExpire);
                        return deb;
                    });
                }
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
            if (targetEnemy.hp <= 0 && dmg > dealtToEnemy) {
                let overkillDamage = dmg - dealtToEnemy;
                let ailmentOverkillSourceDamage = dmg > 0 ? Math.floor(ailmentDamageBeforeCritMitigation * (overkillDamage / dmg)) : 0;
                let isOriginalPierceTarget = originalPierceTargets.size === 0 || originalPierceTargets.has(targetEnemy);
                let canStartPierceCarry = !pStats.sSkill.pierceOverkillCarry
                    || (isOriginalPierceTarget && !pierceOverkillCarryStartedTargets.has(targetEnemy));
                if (canStartPierceCarry) {
                    if (pStats.sSkill.pierceOverkillCarry) pierceOverkillCarryStartedTargets.add(targetEnemy);
                    applyPierceOverkillCarry(targetEnemy, overkillDamage, hitElement, hitCrit, ailmentOverkillSourceDamage);
                }
            }
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
                    let icdMs = Math.max(100, Math.floor((Number(pStats.uniqueShockTracer.icdSec || 0.5)) * 1000));
                    game.uniqueShockTracerNextAt = now + icdMs;
                    let strikePct = Math.max(1, Number(pStats.uniqueShockTracer.strikeDamagePct || 500));
                    let strike = Math.max(1, Math.floor(dmg * (strikePct / 100)));
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
            applyEnemyAilmentFromHit(targetEnemy, { ...pStats, sSkill: { ...pStats.sSkill, ele: hitElement } }, dmg, hitCrit, {
                ailmentSourceDamage: ailmentDamageBeforeCritMitigation,
                critDotBonusPct: hitCrit ? 50 : 0
            });
            if (pStats.uniqueAlwaysShock) {
                let shockStats = { ...pStats, sSkill: { ...pStats.sSkill, ele: 'light' } };
                let shockHit = Math.max(1, Math.floor(dmg * 0.25 * (1 + Math.max(0, Number(pStats.shockEffectBonusPct)||0)/100)));
                applyEnemyAilmentFromHit(targetEnemy, shockStats, shockHit, true);
            }
        });
    }
    let instantLeechRecovered = 0;
    if (pStats.leech > 0 && totalLeechableDamage > 0) {
        let leechAmount = (totalLeechableDamage * (pStats.leech / 100));
        let leechTarget = (game.ascendClass === 'warlock' && hasKeystone('wlk3') && (pStats.energyShield || 0) > 0) ? 'energyShield' : 'life';
        if ((pStats.uniqueInstantLeechPct || 0) > 0) instantLeechRecovered += applyInstantPlayerLeech(leechAmount * ((pStats.uniqueInstantLeechPct || 0) / 100), pStats, leechTarget);
        if (pStats.sSkill && pStats.sSkill.instantLeech) instantLeechRecovered += applyInstantPlayerLeech(leechAmount, pStats, leechTarget);
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
        if (instantLeechRecovered > 0) {
            let instantLeechText = instantLeechRecovered < 1
                ? instantLeechRecovered.toFixed(2)
                : (instantLeechRecovered < 10 ? instantLeechRecovered.toFixed(1).replace(/\.0$/, '') : `${Math.floor(instantLeechRecovered)}`);
            line += ` · 즉시흡수 +${instantLeechText}`;
        }
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
    } else if (zone && zone.id === 'colony_run' && game.colony && game.colony.inRun) {
        addLog(message || "☠️ 군락지 방어전에서 패배했습니다.", "death", { noToast: !!opts.noToast });
        game.colony.inRun = false;
        game.currentZoneId = game.colony.returnZoneId !== undefined && game.colony.returnZoneId !== null ? game.colony.returnZoneId : getAutoProgressZoneId(game.maxZoneId);
        game.colony.returnZoneId = null;
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
        addLog(message || "☠️ 뿌리 보스 도전에 실패했습니다. 액트 1로 되돌아갑니다.", "death", { noToast: !!opts.noToast });
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
    if (type === 'ignite') res = pStats.ailResIgnite || 0;
    else if (type === 'chill' || type === 'freeze') res = pStats.ailResFreeze || 0;
    else if (type === 'shock') res = pStats.ailResShock || 0;
    else if (type === 'poison') res = pStats.ailResPoison || 0;
    else if (type === 'bleed') res = pStats.ailResBleed || 0;
    return Math.max(0, Math.min(1.00, (res + (pStats.ailmentResistBonusPct || 0)) / 100));
}

function applyPlayerAilment(type, duration, power, pStats, sourceHitDamage, options) {
    if (!type || duration <= 0) return;
    if ((type === 'ignite' && pStats.immuneIgnite) || (type === 'chill' && pStats.immuneChill) || (type === 'freeze' && pStats.immuneFreeze) || (type === 'shock' && pStats.immuneShock) || (type === 'bleed' && pStats.immuneBleed)) return;
    if (Math.random() < getPlayerAilmentResistChance(type, pStats)) return;
    game.playerAilments = Array.isArray(game.playerAilments) ? game.playerAilments : [];
    let damageAilment = isDamageAilmentType(type);
    let opts = (options && typeof options === 'object') ? options : {};
    let hitSource = Math.max(0, Math.floor(Number(opts.ailmentSourceDamage !== undefined ? opts.ailmentSourceDamage : sourceHitDamage) || 0));
    let critDotBonusPct = Math.max(0, Number(opts.critDotBonusPct) || 0);
    let ailmentDotScore = getDamageAilmentScore(hitSource, critDotBonusPct, 1, 1);
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
        if (damageAilment) {
            let existingScore = Math.max(0, Number(existing.ailmentDotScore) || getStoredAilmentHitDamage(existing));
            let incomingScore = ailmentDotScore;
            if (incomingScore >= existingScore) {
                existing.sourceHitDamage = hitSource;
                existing.critDotBonusPct = critDotBonusPct;
                existing.ailmentDotScore = incomingScore;
            }
        }
    } else {
        let row = { type: type, time: duration, power: Math.max(0.1, power || 0.1) };
        if (damageAilment) {
            row.sourceHitDamage = hitSource;
            row.critDotBonusPct = critDotBonusPct;
            row.ailmentDotScore = ailmentDotScore;
        }
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


function updateColonyDefenseApproach() {
    let zone = getZone(game.currentZoneId);
    if (!zone || zone.id !== 'colony_run' || !(game.colony && game.colony.inRun)) return;
    let enemies = (game.enemies || []).filter(e => e && e.hp > 0);
    enemies.forEach(e => {
        if (!Number.isFinite(e.colonyDist)) e.colonyDist = 100 + Math.random() * 40;
        let spd = Math.max(0.1, Number(e.colonyMoveSpeed || e.moveSpeed || 0.6));
        e.colonyDist = Math.max(0, e.colonyDist - spd * 0.55);
    });
}

function getPlayerResistanceAfterEnemyModifiers(pStats, element, enemy, effectMultiplier) {
    let keyByElement = { fire: 'F', cold: 'C', light: 'L', chaos: 'Chaos' };
    let suffix = keyByElement[element];
    if (!suffix) return 0;
    let finalResistance = Number((pStats && pStats[`res${suffix}`]) || 0);
    let uncappedResistance = Number.isFinite(Number(pStats && pStats[`rawRes${suffix}`]))
        ? Number(pStats[`rawRes${suffix}`])
        : finalResistance;
    let maxResistance = Number.isFinite(Number(pStats && pStats[`maxRes${suffix}`]))
        ? Number(pStats[`maxRes${suffix}`])
        : 75;
    let multiplier = Math.max(0, Number(effectMultiplier == null ? 1 : effectMultiplier) || 0);
    let resistanceReduction = Math.max(0, Number((enemy && enemy.resistanceReduction) || 0)) * multiplier;
    let penetration = Math.max(0, Number((enemy && enemy.penetration) || 0)) * multiplier;
    let reducedResistance = Math.min(maxResistance, uncappedResistance - resistanceReduction);
    return Math.max(MIN_PENETRATED_RESISTANCE, reducedResistance - penetration);
}

function performMonsterAttacks(pStats) {
    updateColonyDefenseApproach();
    let zone = getZone(game.currentZoneId);
    let abyssScale = getAbyssMonsterScales(zone);
    if (!Number.isFinite(game.playerEnergyShield)) game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerEnergyShield = Math.max(0, Math.min(Math.floor(Number(game.playerEnergyShield) || 0), Math.floor(pStats.energyShield || 0)));
    let aliveCount = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
    let crowdPenalty = Math.max(0.34, 1 - Math.max(0, aliveCount - 1) * 0.055);
    for (let enemy of (game.enemies || [])) {
        if (enemy.hp <= 0) continue;
        if (enemy.noAttack) continue;
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
            let uniqueRegenCut = (pStats && pStats.uniqueEnemyRegenCutAndMinRoll) ? Math.max(0, Number(pStats.uniqueEnemyRegenCutAndMinRoll.enemyRegenRateMul || 1)) : 1;
            let effectiveRegenRate = Math.max(0, enemy.regenRate * (1 - suppress / 100) * (curseFx.enemyRegenRateMul || 1) * uniqueRegenCut);
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
        if (zone.type === 'underworld') atkRate *= 0.76;
        if (zone.type === 'skyTower') atkRate *= 1.05;
        if (!Number.isFinite(atkRate) || atkRate <= 0) atkRate = 0.12;
        if (!Number.isFinite(enemy.attackTimer) || enemy.attackTimer < 0) enemy.attackTimer = 0;
        enemy.attackTimer += 0.1 * atkRate;
        while (enemy.attackTimer >= 1) {
            if (zone && zone.type === 'cosmos') applyCosmosBossPlayerDebuff(enemy);
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
            let dmg = Math.floor((2.4 + zone.tier * 3.35) * monsterBaseDamageMul * seasonDmgScale);
            if (zone.type === 'underworld') dmg = Math.floor(dmg * 0.78);
            if (zone.type === 'skyTower') dmg = Math.floor(dmg * 1.08);
            dmg = Math.floor(dmg * enemyDmgMul * (enemy.damageMul || 1));
            if (zone.type === 'act' && zone.id <= 1 && (game.season || 1) >= 3) dmg = Math.floor(dmg * 0.58);
            if (enemy.isElite) dmg = Math.floor(dmg * 1.28);
            if (enemy.isBoss) dmg = Math.floor(dmg * (1.14 + zone.tier * 0.16));
            if (!enemy.isBoss) dmg = Math.floor(dmg * crowdPenalty);
            dmg = Math.floor(dmg * (abyssScale.dmgMul || 1) * (abyssScale.playerTakenMul || 1) * (enemy.isBoss ? (abyssScale.bossMul || 1) : 1));
            // 몬스터 혼합 타격은 '원본 피해'를 먼저 50:50으로 분할한 뒤,
            // 물리/속성을 각각 별도로 방어 계산한다. (한쪽 감소 후 재분할 금지)
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
            let convertedTakenAsBreakdown = [];
            let originalPhysicalPortion = physicalPortion;
            let physTakenAs = (pStats && pStats.physTakenAs) || {};
            let takenAsEntries = [['fire', physTakenAs.fire || 0], ['cold', physTakenAs.cold || 0], ['light', physTakenAs.light || 0], ['chaos', physTakenAs.chaos || 0]];
            let totalTakenAs = takenAsEntries.reduce((sum, row) => sum + Math.max(0, Number(row[1]) || 0), 0);
            let takenAsScale = totalTakenAs > 75 ? 75 / totalTakenAs : 1;
            let totalShiftedPhysical = 0;
            takenAsEntries.forEach(row => {
                let ele = row[0];
                let pct = Math.max(0, Number(row[1]) || 0) * takenAsScale;
                if (pct <= 0 || originalPhysicalPortion <= 0) return;
                let shifted = Math.min(originalPhysicalPortion - totalShiftedPhysical, Math.floor(originalPhysicalPortion * pct / 100));
                if (shifted <= 0) return;
                totalShiftedPhysical += shifted;
                let res = getPlayerResistanceAfterEnemyModifiers(pStats, ele, enemy);
                let mitigated = Math.max(0, Math.floor(shifted * (1 - (res / 100))));
                if (mitigated > 0) convertedTakenAsBreakdown.push({ ele, amount: mitigated });
            });
            physicalPortion = Math.max(0, originalPhysicalPortion - totalShiftedPhysical);
            let elementalRes = ['fire', 'cold', 'light', 'chaos'].includes(enemy.ele)
                ? getPlayerResistanceAfterEnemyModifiers(pStats, enemy.ele, enemy)
                : 0;
            let mitigatedElemental = Math.max(0, Math.floor(elementalPortion * (1 - (elementalRes / 100))));
            let physRes = Math.max(-60, pStats.dr + getArmorPhysicalReductionPct(pStats.armor, physicalPortion));
            let mitigatedPhysical = Math.max(0, Math.floor(physicalPortion * (1 - (physRes / 100))));
            let damageBreakdown = [];
            if (mitigatedPhysical > 0) damageBreakdown.push({ ele: 'phys', amount: mitigatedPhysical });
            if (mitigatedElemental > 0) damageBreakdown.push({ ele: enemy.ele, amount: mitigatedElemental });
            if (convertedTakenAsBreakdown.length > 0) damageBreakdown = damageBreakdown.concat(convertedTakenAsBreakdown);
            damageBreakdown = damageBreakdown.map(row => {
                let less = 0;
                if (row.ele === 'fire') less = pStats.fireTakenDamageReducePct || 0;
                else if (row.ele === 'cold') less = pStats.coldTakenDamageReducePct || 0;
                else if (row.ele === 'light') less = pStats.lightTakenDamageReducePct || 0;
                else if (row.ele === 'chaos') less = pStats.chaosTakenDamageReducePct || 0;
                if (less > 0) return { ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * (1 - Math.max(0, Math.min(0.9, less / 100))))) };
                return row;
            }).filter(row => row.amount > 0);
            if (game.ascendClass === 'crusader' && hasKeystone('cr4')) {
                let converted = [];
                damageBreakdown.forEach(row => {
                    if (!row || row.amount <= 0) return;
                    if (row.ele === 'fire' || row.ele === 'cold' || row.ele === 'chaos') {
                        let shift = Math.floor(row.amount * 0.3);
                        converted.push({ ele: row.ele, amount: Math.max(0, row.amount - shift) });
                        if (shift > 0) converted.push({ ele: 'light', amount: shift });
                    } else converted.push(row);
                });
                damageBreakdown = converted.filter(row => row.amount > 0);
            }
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
            let takenFlatReduce = (pStats && pStats.takenFlatReduce) || {};
            damageBreakdown = damageBreakdown.map(row => {
                if (!row || row.amount <= 0) return row;
                let elementFlatLess = Math.max(0, Number(takenFlatReduce[row.ele] || 0));
                if (elementFlatLess <= 0) return row;
                return { ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) - elementFlatLess)) };
            }).filter(row => row && row.amount > 0);
            let allFlatLess = Math.max(0, Number(takenFlatReduce.all || 0));
            while (allFlatLess > 0 && damageBreakdown.length > 0) {
                let targetIndex = 0;
                for (let i = 1; i < damageBreakdown.length; i++) {
                    if ((damageBreakdown[i].amount || 0) > (damageBreakdown[targetIndex].amount || 0)) targetIndex = i;
                }
                let spend = Math.min(allFlatLess, Math.max(0, Math.floor(damageBreakdown[targetIndex].amount || 0)));
                if (spend <= 0) break;
                damageBreakdown[targetIndex].amount = Math.max(0, Math.floor((damageBreakdown[targetIndex].amount || 0) - spend));
                allFlatLess -= spend;
                damageBreakdown = damageBreakdown.filter(row => row && row.amount > 0);
            }
            if (damageBreakdown.length === 0) damageBreakdown.push({ ele: enemy.ele === 'phys' ? 'phys' : enemy.ele, amount: 1 });
            let sumBreakdown = () => damageBreakdown.reduce((sum, row) => sum + Math.max(0, Math.floor(row.amount || 0)), 0);
            let scaleBreakdown = (mul) => {
                damageBreakdown = damageBreakdown.map(row => ({ ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * mul)) })).filter(row => row.amount > 0);
                if (damageBreakdown.length === 0) damageBreakdown.push({ ele: enemy.ele === 'phys' ? 'phys' : enemy.ele, amount: 1 });
            };
            let scaleBreakdownToTotal = (targetTotal) => {
                targetTotal = Math.max(1, Math.floor(targetTotal || 1));
                let sourceTotal = Math.max(1, sumBreakdown());
                let remainingTotal = targetTotal;
                damageBreakdown = damageBreakdown.map((row, idx) => {
                    let amount = idx === damageBreakdown.length - 1
                        ? remainingTotal
                        : Math.max(0, Math.floor(((row.amount || 0) / sourceTotal) * targetTotal));
                    remainingTotal = Math.max(0, remainingTotal - amount);
                    return { ele: row.ele, amount };
                }).filter(row => row.amount > 0);
                if (damageBreakdown.length === 0) damageBreakdown.push({ ele: enemy.ele === 'phys' ? 'phys' : enemy.ele, amount: targetTotal });
                return Math.max(1, sumBreakdown());
            };
            dmg = Math.max(1, sumBreakdown());
            let playerShockTakenIncreasePct = Number(pStats.playerShockTakenDamageIncreasePct || 0);
            if (playerShockTakenIncreasePct !== 0) {
                let playerShockTakenMul = Math.max(0.1, 1 + playerShockTakenIncreasePct / 100);
                dmg = scaleBreakdownToTotal(Math.max(1, Math.floor(dmg * playerShockTakenMul)));
            }
            let ailmentSourceDamageBeforeCrit = dmg;
            let enemyCritDotBonusPct = 0;
            let enemyCritChance = Math.max(0, (enemy.critChance || 0) - Math.max(0, Math.min(80, pStats.critResist || 0)));
            if (enemyCritChance > 0 && Math.random() < (enemyCritChance / 100)) {
                scaleBreakdown(enemy.critDamageMul || 1.55);
                dmg = Math.max(1, sumBreakdown());
                enemyCritDotBonusPct = 50;
            }
            if (enemy.hybridElement && Math.random() < 0.35) {
                let hybridRes = getPlayerResistanceAfterEnemyModifiers(pStats, enemy.hybridElement, enemy, 0.7);
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
            if ((pStats.uniqueChaosTakenDamageReducePct || 0) > 0 && enemy.ele === 'chaos') {
                let chaosLess = Math.max(0, Math.min(95, Number(pStats.uniqueChaosTakenDamageReducePct || 0)));
                dmg = Math.max(1, Math.floor(dmg * (1 - chaosLess / 100)));
            }
            if (pStats.uniquePhysDrHalfTakenAsMore && enemy.ele === 'phys') {
                let ratio = Math.max(0, Number(pStats.uniquePhysDrHalfTakenAsMore.ratio || 0.5));
                let takenMore = Math.max(0, (Math.max(0, Number(pStats.dr) || 0) / 100) * ratio);
                dmg = Math.max(1, Math.floor(dmg * (1 + takenMore)));
            }
            if (game.ascendClass === 'gladiator' && hasKeystone('g5') && game.gladiatorSwiftGuardReady) {
                dmg = Math.max(1, Math.floor(dmg * Math.max(0, Number(pStats.swiftOpeningTakenMultiplier) || 0.70)));
                game.gladiatorSwiftGuardReady = false;
            }
            let aliveEnemies = (game.enemies || []).filter(e => e && e.hp > 0).length;
            if (aliveEnemies >= 2) dmg = Math.max(1, Math.floor(dmg * (1 - Math.max(0, Math.min(0.9, (pStats.takenDamageReduceWhen2EnemiesPct || 0) / 100)))));
            else if (aliveEnemies === 1) dmg = Math.max(1, Math.floor(dmg * (1 - Math.max(0, Math.min(0.9, (pStats.takenDamageReduceWhen1EnemyPct || 0) / 100)))));
            let evadeChance = Math.max(0, pStats.evadeChance || 0);
            if (game.ascendClass === 'catalyst' && hasKeystone('ct4') && game.catalystEvadeBoostReady) {
                evadeChance *= 1.3;
                game.catalystEvadeBoostReady = false;
            }
            let evadeRoll = Math.random() * 100;
            if (game.ascendClass === 'hunter' && hasKeystone('h3')) evadeRoll = Math.min(evadeRoll, Math.random() * 100);
            if (evadeRoll < evadeChance) {
                addBattleFx('statusText', { text: '회피!', color: '#9fb4c8', duration: 260 });
                addEvasionCombatLog(null, true);
                if (game.ascendClass === 'catalyst' && hasKeystone('ct4')) game.catalystEvadeBoostReady = true;
                continue;
            }
            let blockRollCap = Math.max(50, Math.min(75, Number(pStats.blockChanceMax || 50)));
            let blockRollChance = Math.max(0, Math.min(blockRollCap, pStats.blockChance || pStats.guardianBlockChance || 0));
            if (Math.random() * 100 < blockRollChance) {
                if ((pStats.uniqueBlockRecoverEnergyShieldPct || 0) > 0 && (pStats.energyShield || 0) > 0) {
                    let recover = Math.max(1, Math.floor((pStats.energyShield || 0) * Math.max(0, Number(pStats.uniqueBlockRecoverEnergyShieldPct || 0)) / 100));
                    game.playerEnergyShield = Math.min((pStats.energyShield || 0), Math.max(0, Number(game.playerEnergyShield) || 0) + recover);
                }
                addBattleFx('statusText', { text: '막아냄!', color: '#a7a7a7', duration: 260 });
                if (game.settings.showCombatLog) addLog(`🛡️ 막아냄!`, "loot-magic");
                continue;
            }
            let deflected = false;
            let deflectReducePct = 0;
            if (Math.random() * 100 < Math.max(0, Math.min(75, pStats.deflectChance || 0))) {
                let deflectReduce = Math.max(0, Math.min(85, 40 + Number(pStats.deflectDamageReduce || 0)));
                dmg = scaleBreakdownToTotal(Math.max(1, Math.floor(dmg * (1 - deflectReduce / 100))));
                if (pStats.uniqueDeflectStealth) {
                    let cfg = pStats.uniqueDeflectStealth || {};
                    game.shadowStealthExpiresAt = Date.now() + Math.max(1, Number(cfg.duration || 3)) * 1000;
                }
                deflected = true;
                deflectReducePct = Math.floor(deflectReduce);
            }
            let ailRoll = Math.random();
            if (game.ascendClass === 'hunter' && hasKeystone('h3')) ailRoll = Math.max(ailRoll, Math.random());
            if ((enemy.ailmentChance || 0) > 0 && ailRoll < enemy.ailmentChance) {
                let ail = enemy.ele === 'fire' ? 'ignite' : enemy.ele === 'cold' ? 'chill' : enemy.ele === 'light' ? 'shock' : 'poison';
                let hitRatio = Math.max(0.001, Math.min(0.35, dmg / Math.max(1, pStats.maxHp || 1)));
                let damageAilment = isDamageAilmentType(ail);
                let ailPower = damageAilment
                    ? 0.90
                    : Math.max(0.1, Math.min(1.5, (Math.sqrt(Math.max(1, dmg)) * 0.01) + (hitRatio * 1.8)));
                applyPlayerAilment(ail, enemy.isBoss ? 5 : 3, ailPower, pStats, dmg, {
                    ailmentSourceDamage: ailmentSourceDamageBeforeCrit,
                    critDotBonusPct: enemyCritDotBonusPct
                });
                if (game.settings.showCombatLog) addLog(`☣️ 상태이상: ${ail === 'ignite' ? '점화' : ail === 'chill' ? '냉각' : ail === 'shock' ? '감전' : '중독'} (${enemy.isBoss ? 5 : 3}초)`, 'attack-monster');
            }

            let remaining = dmg;
            let guardRedirectPct = Math.max(0, Math.min(100, Math.floor(pStats.summonGuardRedirectPct || 0)));
            if (game.ascendClass === 'soulbinder' && hasKeystone('sb2')) guardRedirectPct = Math.max(guardRedirectPct, 50);
            let aliveGuards = (game.summons || []).filter(s => s && s.alive && s.hp > 0 && (s.role === 'guard' || (game.ascendClass === 'soulbinder' && hasKeystone('sb2'))));
            if (guardRedirectPct > 0 && aliveGuards.length > 0) {
                let redirect = Math.min(remaining, Math.floor(remaining * (guardRedirectPct / 100)));
                if (redirect > 0) {
                    let each = Math.max(1, Math.floor(redirect / aliveGuards.length));
                    let redirectedTotal = 0;
                    aliveGuards.forEach((guard, idx) => {
                        if (!guard.alive || guard.hp <= 0) return;
                        let share = idx === (aliveGuards.length - 1) ? Math.max(0, redirect - redirectedTotal) : each;
                        let local = Math.max(0, Math.min(100, Number(guard.redirectPct || 0)));
                        if (local > 0) share = Math.floor(share * (local / 100));
                        let evade = Math.max(0, Math.min(85, (guard.evasion || 0) / ((guard.evasion || 0) + 300) * 100));
                        if (Math.random() * 100 < evade) share = 0;
                        let guardRes = 0;
                        if (enemy.ele === 'fire') guardRes = guard.resFire || 0;
                        else if (enemy.ele === 'cold') guardRes = guard.resCold || 0;
                        else if (enemy.ele === 'light') guardRes = guard.resLight || 0;
                        else if (enemy.ele === 'chaos') guardRes = guard.resChaos || 0;
                        let reduced = Math.max(0, Math.floor(share * (1 - (Math.max(-60, guardRes) / 100))));
                        let armorRed = Math.min(85, (guard.armor || 0) / ((guard.armor || 0) + Math.max(1, reduced) * 8) * 100);
                        reduced = Math.max(0, Math.floor(reduced * (1 - armorRed / 100)));
                        reduced = Math.max(0, Math.min(reduced, guard.hp));
                        if (reduced <= 0) return;
                        guard.hp = Math.max(0, guard.hp - reduced);
                        redirectedTotal += reduced;
                        if (guard.hp <= 0) {
                            guard.alive = false;
                            guard.respawnAt = Date.now() + Math.max(2000, Math.floor(guard.respawnMs || 4000));
                            if (pStats.uniqueSummonDeathDamageBuff) {
                                let cfg = pStats.uniqueSummonDeathDamageBuff || {};
                                game.summonDeathDamageBuffPct = Math.max(Number(game.summonDeathDamageBuffPct || 0), Math.max(0, Number(cfg.pct || 40)));
                                game.summonDeathDamageBuffExpiresAt = Date.now() + Math.max(1, Number(cfg.duration || 4)) * 1000;
                            }
                        }
                    });
                    remaining = Math.max(0, remaining - redirectedTotal);
                }
            }
            game.playerEnergyShield = Math.max(0, Math.floor(Number(game.playerEnergyShield) || 0));
            let beforeEsForCr8 = game.playerEnergyShield;
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
            if (remaining > 0 && pStats.uniqueLifeRecoupTakenDamage) {
                let cfg = pStats.uniqueLifeRecoupTakenDamage || {};
                addPlayerRecoupInstance(remaining * Math.max(0, Number(cfg.pct || 25)) / 100, Math.max(1, Number(cfg.duration || 4)));
            }
            if (game.ascendClass === 'crusader' && hasKeystone('cr8') && beforeEsForCr8 > 0 && game.playerEnergyShield <= 0 && (game.crusaderEsRegenCooldownUntil || 0) <= Date.now()) {
                game.crusaderEsRegenUntil = Date.now() + 4000;
                game.crusaderLightningAegisUntil = Date.now() + 4000;
                game.crusaderEsRegenCooldownUntil = Date.now() + 4000;
            }
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
            addBattleFx('playerHit', { enemyId: enemy.id, color: getElementColor(topDamageEntry.ele), damage: dmg, duration: 220, deflected: deflected });
            if (game.settings.showCombatLog) {
                let breakdownText = damageBreakdown
                    .filter(row => row.amount > 0)
                    .sort((a, b) => b.amount - a.amount)
                    .map(row => `${getDamageElementLabel(row.ele)} ${Math.floor(row.amount)}`)
                    .join(' / ');
                let deflectText = deflected ? ` · 🪶빗겨냄 -${deflectReducePct}%` : '';
                addLog(`🩸 [${getDamageElementLabel(topDamageEntry.ele)}] 피격 (${dmg} 피해 · ${breakdownText}${deflectText})`, "attack-monster");
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
    if (zone.bloomTrial && (zone.trapRegenSuppressPct || 0) > 0) {
        game.bloomTrialRegenSuppress = Math.min(0.95, (game.bloomTrialRegenSuppress || 0) + (zone.trapRegenSuppressPct || 0) / 100);
        addLog(`❄️ 혹독한 한기: 생명력 재생 억제 ${Math.round((game.bloomTrialRegenSuppress || 0) * 100)}%`, 'attack-monster', { noToast: true });
    }
    addLog(`⚠️ 시련 함정 발동 [${getDamageElementLabel('phys')}] (${trapDamage} 피해)`, 'attack-monster', { noToast: true });
    if (game.playerHp <= 0) {
        handlePlayerDefeat(zone, pStats, "☠️ 시련 함정에 쓰러졌습니다. 마을로 귀환합니다.", { fatalElement: 'phys', sourceName: '시련 함정', noToast: true });
    }
}

function applyLoopHeroSelection(heroId, previousHeroId) {
    game.pendingLoopHeroSelection = false;
    saveGame({ skipCloudSync: true });
    if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave('루프 캐릭터 선택 완료');
    startMoving(true);
    dispatchRuntimeEvent('loop-hero-selection-completed', {
        heroId,
        changed: heroId !== previousHeroId
    });
}

function requestLoopHeroSelection(options = {}) {
    let previousHeroId = game.selectedHeroId || 'hero1';
    let detail = {
        handled: false,
        options,
        select: heroId => applyLoopHeroSelection(heroId, previousHeroId)
    };
    return dispatchRuntimeEvent('loop-hero-selection-requested', detail);
}

function ensurePendingLoopHeroSelectionPrompt() {
    if (!game || !game.pendingLoopHeroSelection) return false;
    return requestLoopHeroSelection({
        kicker: 'Loop Resume',
        title: '중단된 루프의 재능 선택',
        body: '저장된 루프 진행을 이어가기 전에 이번 루프 재능을 선택하세요.'
    });
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
    let outsideChaosRequirementMet = typeof hasCurrentLoopAbyssRequirementClear === 'function'
        ? hasCurrentLoopAbyssRequirementClear(game.season || 1)
        : ((getSeasonAbyssDepthCap(game.season || 1) <= 20)
            ? (typeof hasCurrentLoopChaos20Clear === 'function' ? hasCurrentLoopChaos20Clear() : !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared))
            : Math.max(0, Math.floor((game.loopProgressCurrent && game.loopProgressCurrent.bestAbyssDepth) || 0)) >= getSeasonAbyssDepthCap(game.season || 1));
    if (!outsideChaosRequirementMet) return addLog(`${getLoopAbyssRequirementText(game.season || 1)} 조건을 먼저 달성해야 합니다.`, 'attack-monster');
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

function enterWoodsmanEchoChallenge() {
    let st = ensureChaosRealmState();
    if (!st.unlocked) return addLog('혼돈계 해금 이후 이용 가능합니다.', 'attack-monster');
    if (!(Array.isArray(game.journalEntries) && game.journalEntries.includes('woodsman_echo'))) return addLog('나무꾼 완전 격파 이후에만 도전할 수 있습니다.', 'attack-monster');
    let run = ensureWoodsmanEchoRunState();
    run.active = true;
    run.duration = 30;
    run.timeLeft = 30;
    run.lastTickAt = Date.now();
    run.totalDamage = 0;
    game.currentZoneId = WOODSMAN_ECHO_ZONE_ID;
    game.killsInZone = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    game.moveTotalTime = 0;
    game.combatHalted = false;
    game.encounterPlan = [];
    game.encounterIndex = 0;
    let zone = getZone(OUTSIDE_CHAOS_ZONE_ID);
    let dummy = createEnemy(zone, { at: 0, count: 1, boss: true }, 0);
    dummy.name = '나무꾼의 잔상';
    dummy.maxHp = Math.max(1, Math.floor((dummy.maxHp || 1) * 1000));
    dummy.hp = dummy.maxHp;
    dummy.echoStartHp = dummy.maxHp;
    dummy.noAttack = true;
    game.enemies = [dummy];
    addLog('📏 나무꾼의 잔상 도전 시작: 30초 동안 최대 피해를 기록하세요. (허수아비는 공격하지 않습니다)', 'season-up');
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
    game.pendingLoopReady = false;
    let codexReveal = {};
    Object.keys(game.uniqueCodex || {}).forEach(key => {
        if (!key || !game.uniqueCodex[key]) return;
        let parts = key.split('|');
        codexReveal[key] = { revealed: true, slot: parts[0] || '', name: parts[1] || '' };
    });
    dispatchRuntimeEvent('loop-rewrite-started');
    let prevStarWedge = (game.starWedge && typeof game.starWedge === 'object') ? game.starWedge : {};
    let preservedEternalWedges = Array.isArray(prevStarWedge.wedges)
        ? prevStarWedge.wedges.filter(w => w && w.eternal).map(w => JSON.parse(JSON.stringify(w)))
        : [];
    let preservedConstellationBuff = (prevStarWedge.constellationBuff && prevStarWedge.constellationBuff.permanent)
        ? JSON.parse(JSON.stringify(prevStarWedge.constellationBuff))
        : null;
    let prevLabMax = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    let preservedChaosRealm = JSON.parse(JSON.stringify(ensureChaosRealmState()));
    let preservedSkyTower = JSON.parse(JSON.stringify(ensureSkyTowerState()));
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
    game.seasonChaseUniqueDrops = [];
    game.uniqueCodex = codexReveal;
    game.starWedge = JSON.parse(JSON.stringify(defaultGame.starWedge));
    game.starWedge.wedges = preservedEternalWedges;
    game.starWedge.constellationBuff = preservedConstellationBuff;
    game.unlocks = { ...defaultGame.unlocks };
    game.noti = { ...defaultGame.noti };
    if (typeof relockCoreCubeForLoop === 'function') relockCoreCubeForLoop();
    game.itemSubtab = 'item-tab-equip';
    game.skillSubtab = 'skill-tab-equip';
    game.mapSubtab = 'map-tab-zones';
    game.chaosRealm = preservedChaosRealm;
    game.skyTower = preservedSkyTower;
    game.skyTower.loopSeason = Math.max(1, Math.floor(game.season || 1));
    game.skyTower.clearedThisLoop = 0;
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
        game.settings.jewelAutoSalvageEnabled = false;
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
    requestLoopHeroSelection();
}

/**
 * 루프 조건 달성 시 진입점. 루프 10 미만에서는 즉시 리셋하지 않고
 * 시간을 멈춘 상태(pendingLoopReady)로 전환해 아이템 정리·도감 등록 시간을 준다.
 * 루프 10 이상의 비혼돈 경로는 기존처럼 즉시 리셋한다.
 */
function handleSeasonLoopConditionMet() {
    if ((game.season || 1) >= 10) {
        triggerSeasonReset();
        return;
    }
    game.pendingLoopReady = true;
    game.combatHalted = true;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    addLog('⏸️ 루프 조건 달성! 시간이 멈췄습니다. 아이템 정리와 도감 등록을 마친 뒤 [루프 진행] 버튼을 누르세요.', 'season-up');
    updateStaticUI();
}

function confirmLoopReady() {
    if (!game.pendingLoopReady) return;
    game.pendingLoopReady = false;
    triggerSeasonReset();
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


safeExposeGlobals({ getPlayerStats, getGemPresentation, getConditionGemStatDelta, isCrowdProgressPaused, ensureSummonRuntime, runSummonAttackTick, estimateSummonDps, enterWoodsmanEchoChallenge, getSkillTargets, createEnemy, generateEncounterPlan, startEncounterRun, startMoving, returnToTown, ensureEncounterRun, advanceMapProgress, grantExpAndGem, rollLootForEnemy, handleEnemyDeath, finishEncounterRun, performPlayerAttack, handlePlayerDefeat, applyPlayerAilment, tickAilments, tickPlayerLeech, addPlayerLeechInstance, applyInstantPlayerLeech, getLeechCaps, getLeechOutstandingTotal, performMonsterAttacks, applyTrialTrapTick, ensurePendingLoopHeroSelectionPrompt, triggerSeasonReset, handleSeasonLoopConditionMet, confirmLoopReady, chooseLoopAdvance, markLoopSpecialBossKill, addWoodsmanPendingScore, enterOutsideChaos, grantChaosRealmFloorBonus, maybeUnlockChaosRealmFromWoodsman, isDamageAilmentType, getPlayerShockTakenDamageIncreasePct, getEnemyShockTakenDamageIncreasePct, getActiveEnemyShockTakenDamageIncreasePct, getStoredAilmentHitDamage, getDamageAilmentBaseDpsFromHit, getEnemyDamageAilmentDps, getPlayerDamageAilmentDps, getPlayerDamageAilmentFallbackDps, getUniqueEffectImplementationReport });
