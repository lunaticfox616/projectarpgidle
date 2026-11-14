import { coreHasKeystone } from '../combat/core-keystones.mjs';

/** 장비 맵의 소켓에 낀 주얼 전부(공허 · 타락 · 심연 소켓 순, source는 소켓 종류). 주얼은 2026-09-30부터 장비 소켓에만 낀다. */
export function coreCollectSocketedJewels(env, equipment) {
    return Object.entries(equipment || {}).flatMap(([slot, item]) => env.deps.equipmentSockets.jewels(item)
        .map(row => ({ jewel: row.jewel, slot, source: row.kind, index: row.index })));
}

/** 요구치를 채워 실제로 적용되는 장비의 소켓 주얼. */
export function coreGetSocketedJewels(env, owner = env.owner) {
    return coreCollectSocketedJewels(env, env.deps.combatEquipmentStats.activeEquipment(owner));
}

// 거울 심장: 반지 소켓에 끼우면 반대쪽 반지 소켓의 주얼을 한 번 더 적용한다(예전 '반대 슬롯 주얼 복제').
export function coreGetMirroredRingJewels(env, owner = env.owner) {
    let rings = {};
    coreGetSocketedJewels(env, owner).forEach(row => { if (row.source === 'void') rings[row.slot] = row.jewel; });
    return [['반지1', '반지2'], ['반지2', '반지1']]
        .filter(([host, partner]) => rings[host] && rings[host].uniqueId === 'uj_mirror_heart' && rings[partner])
        .map(([, partner]) => rings[partner]);
}

// 두 주얼에 고정 배정된 전직 키스톤이 일치하면 해당 키스톤을 무료로 할당한다.
export function coreRecomputeCosmosTwinKeystones(env) {
    let granted = [];
    let slots = coreCollectSocketedJewels(env, env.owner.equipment).map(row => row.jewel);
    let ensureKeystone = (jewel) => {
        if (!jewel || !jewel.cosmosKeystoneJewel) return;
        if (!jewel.cosmosKeystone && typeof env.deps.pickRandomAscendKeystoneId === 'function') jewel.cosmosKeystone = env.deps.pickRandomAscendKeystoneId();
    };
    slots.forEach(ensureKeystone);
    let balance = slots.find(j => j && j.uniqueId === 'cbj_zubenubia_balance' && j.cosmosKeystone);
    let judgment = slots.find(j => j && j.uniqueId === 'cbj_zubenshamali_judgment' && j.cosmosKeystone);
    if (balance && judgment && balance.cosmosKeystone === judgment.cosmosKeystone) granted.push(balance.cosmosKeystone);
    env.owner.cosmosTwinKeystones = granted;
    // 키스톤과 고유 주얼이 켜는 옛 재능 카드 효과도 같은 때 다시 센다(js/talent-cards.js, 2026-10-02 재능 정리).
    if (typeof env.deps.refreshGrantedBloomMechanics === 'function') env.deps.refreshGrantedBloomMechanics(env.owner);
    return granted;
}

export function coreIsDualWielding(env) {
    let equipment = env.deps.combatEquipmentStats.activeEquipment(env.owner);
    let mainWeapon = equipment && equipment['무기'];
    let shieldWeapon = equipment && equipment['방패'];
    return !!(mainWeapon && shieldWeapon && shieldWeapon.slot === '무기');
}

export function coreGetEquippedJewelGemLevelBonusSources(env, target) {
    let gear = 0;
    let activeTags = typeof env.deps.getGemLevelTargetTags === 'function' ? env.deps.getGemLevelTargetTags(target) : [];
    // A settlement reads this for every summon every tick; it depends only on the socketed jewels (static build input).
    const memo = env.deps.getBackgroundBuildMemo(env.owner), memoKey = `jewel-gem-level:${activeTags.includes('summon')}`;
    if (memo?.has(memoKey)) return memo.get(memoKey);
    let addJewelGemLevels = (jewel, multiplier) => {
        if (!jewel || typeof env.deps.getJewelStats !== 'function') return;
        let mul = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
        env.deps.getJewelStats(jewel).forEach(stat => {
            if (!stat) return;
            let value = Number(stat.val || 0) * mul;
            if (stat.id === 'gemLevel') gear += value;
            if (stat.id === 'summonGemLevel' && activeTags.includes('summon')) gear += value;
        });
    };
    let socketMultiplier = env.deps.getSocketJewelMultiplier();
    let equipment = env.deps.combatEquipmentStats.activeEquipment(env.owner) || {};
    coreGetSocketedJewels(env).forEach(row => {
        addJewelGemLevels(row.jewel, socketMultiplier * (row.source === 'abyss' ? env.deps.getAbyssJewelMultiplier(equipment[row.slot]) : 1));
    });
    coreGetMirroredRingJewels(env).forEach(jewel => addJewelGemLevels(jewel, 1));
    memo?.set(memoKey, gear);
    return gear;
}

export function coreHasEmptyThroneSoloBonus(env) {
    if (typeof env.deps.getEquippedUniqueJewels !== 'function') return false;
    let equipped = env.deps.getEquippedUniqueJewels();
    return equipped.some(entry => entry && entry.jewel && entry.jewel.uniqueId === 'uj_crown_empty')
        && equipped.every(entry => entry && entry.jewel && entry.jewel.uniqueId === 'uj_crown_empty');
}

/** "모든 스킬룬 레벨 +N" (uniqueGemLevelBonus) on the equipped unique items that count for stats. */
export function coreGetEquippedUniqueGemLevelBonus(env) {
    return env.deps.getPlayerStatSourceItemEntries().reduce((sum, [, item]) => sum
        + (item && item.rarity === 'unique' && item.uniqueEffectKey === 'uniqueGemLevelBonus' ? Number((item.uniqueEffectParams || {}).level || 1) : 0), 0);
}

/** resolvedStats, when supplied, belongs to the current synchronous equipment evaluation only. */
export function coreGetTargetGemBonusSources(env, target, fallbackSources, resolvedStats, evaluation) {
    let sources = (typeof env.deps.getGemBonusSources === 'function') ? env.deps.getGemBonusSources(target, resolvedStats, evaluation) : fallbackSources;
    sources = sources ? { ...sources } : { gear: 0, passive: 0, reward: 0, total: 0 };
    let jewelGemLevel = coreGetEquippedJewelGemLevelBonusSources(env, target) + coreGetEquippedUniqueGemLevelBonus(env);
    sources.gear = Number(sources.gear || 0) + jewelGemLevel;
    sources.total = Number(sources.total || 0) + jewelGemLevel;
    coreApplySoloThroneBonus(env, sources);
    const targetKind = coreGemBonusTargetKind(env, target);
    coreApplyAscendGemBonus(env, sources);
    if (coreHasKeystone(env, 'iq6') && (targetKind.elemental || targetKind.support)) {
        sources.reward = Number(sources.reward || 0) + 1;
        sources.total = Number(sources.total || 0) + 1;
    }
    return sources;
}

function coreApplySoloThroneBonus(env, sources) {
    if (!coreHasEmptyThroneSoloBonus(env)) return;
    sources.reward = Number(sources.reward || 0) + 1;
    sources.total = Number(sources.total || 0) + 1;
}

function coreGemBonusTargetKind(env, target) {
    const name = Array.isArray(target) ? null : (target || env.owner.activeSkill);
    const support = !!(name && typeof env.deps.SUPPORT_GEM_DB !== 'undefined' && env.deps.SUPPORT_GEM_DB[name]);
    const tags = typeof env.deps.getGemLevelTargetTags === 'function' ? env.deps.getGemLevelTargetTags(target) : [];
    return { support, elemental: tags.includes('elemental') };
}

function coreApplyAscendGemBonus(env, sources) {
    if (env.owner.ascendClass && typeof env.deps.getClassTreeDef === 'function') {
        let ascendTree = env.deps.getClassTreeDef(env.owner.ascendClass);
        let ascendGemLevel = (env.owner.ascendNodes || []).reduce((total, id) => {
            let node = ascendTree[id];
            return total + (node && node.stat === 'gemLevel' ? Number(node.val || 0) : 0);
        }, 0);
        sources.passive = Number(sources.passive || 0) + ascendGemLevel;
        sources.total = Number(sources.total || 0) + ascendGemLevel;
    }
}
