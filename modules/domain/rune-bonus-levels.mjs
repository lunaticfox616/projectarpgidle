import { runeFlowGetSkyEnhancementForSkill } from './rune-engrave-slots.mjs';

export function runeFlowGetGemSkyEnhanceGemLevelBonus(env, owner, skillName) {
    let bonus = 0;
    runeFlowGetSkyEnhancementForSkill(env, owner, skillName).forEach(id => {
        let enh = env.deps.GEM_SKY_ENHANCEMENTS[id];
        if (enh && enh.stat === 'awakenedGemLevel') bonus += (enh.gemLvVal || 0);
    });
    return Math.max(0, Math.floor(bonus));
}

export function runeFlowGetSkillRuneBonusLevels(env, owner, name, record) {
    const permanentSkyBonus = typeof env.deps.getSkyTowerGemBoostLevel === 'function' ? env.deps.getSkyTowerGemBoostLevel(name) : 0;
    const materialBonus = env.deps.gemCoreForge.effects(record).levels + (record.awakened ? 2 : 0) + permanentSkyBonus;
    return { permanentSkyBonus, materialBonus, engraveLevel: runeFlowGetGemSkyEnhanceGemLevelBonus(env, owner, name) };
}

export function runeFlowGetGemLevelTargetTags(env, owner, target) {
    let def = null;
    let tags = [];
    if (Array.isArray(target)) {
        tags = target.slice();
    } else {
        let name = target || owner.activeSkill;
        def = env.deps.SKILL_DB[name] || env.deps.SUPPORT_GEM_DB[name] || env.deps.SKILL_DB['기본 공격'];
        tags = Array.isArray(def.tags) ? def.tags.slice() : [];
    }
    if (def && def.ele) appendRuneElementTags(tags, def.ele);
    return Array.from(new Set(tags));
}

export function runeFlowGetTalismanGemBonusSources(env, owner, activeTags) {
    const tags = Array.isArray(activeTags) ? activeTags : [];
    const stats = env.deps.talismanEffects.summarize(owner).stats;
    return env.GEM_LEVEL_TAG_RULES.reduce((total, rule) => total + (tags.includes(rule.tag) ? Number(stats[rule.stat]) || 0 : 0),
        Number(stats.gemLevel) || 0);
}

export function runeFlowGetGemLevelValueFromStatLines(env, stats, activeTags) {
    let total = 0;
    let visit = stat => {
        if (!stat || typeof stat !== 'object') return;
        let value = Number(stat.val);
        if (Number.isFinite(value) && stat.id === 'gemLevel') total += value;
        env.GEM_LEVEL_TAG_RULES.forEach(rule => {
            if (Number.isFinite(value) && stat.id === rule.stat && activeTags.includes(rule.tag)) total += value;
        });
        (stat.extraStats || []).forEach(visit);
    };
    (stats || []).forEach(visit);
    return total;
}

export function runeFlowGetPassiveGemLevelEffects(env, node) {
    return env.deps.getEffectivePassiveNodeEffects(node);
}

export function runeFlowCreateGemBonusEvaluation(env, owner, resolvedStats) {
    let sources = resolvedStats;
    if (!sources) {
        sources = env.deps.getPlayerStatSourceItemEntries().map(([slotKey, item]) =>
            env.deps.getResolvedEquipmentStatLists(slotKey, item, owner));
    }
    const ids = new Set(['gemLevel', ...env.GEM_LEVEL_TAG_RULES.map(rule => rule.stat)]);
    const gearLines = sources.map(resolved => runeFlowCollectGemLevelStatLines([...resolved.baseStats, ...resolved.explicitStats], ids));
    const passiveEffects = (owner.passives || []).flatMap(id => runeFlowGetPassiveGemLevelEffects(env, env.deps.PASSIVE_TREE.nodes[id])
        .filter(effect => ids.has(effect.stat)));
    const stumpStats = owner.stumpBox?.acquired ? env.deps.stumpBox.evaluate(owner).stats : {};
    const rewardLines = Object.entries(stumpStats).map(([id, val]) => ({ id, val }));
    return { gearLines, passiveEffects, rewardLines, memo: new Map() };
}

export function runeFlowCollectGemLevelStatLines(stats, ids) {
    const lines = [];
    const visit = stat => {
        if (!stat || typeof stat !== 'object') return;
        if (ids.has(stat.id)) lines.push({ id: stat.id, val: stat.val });
        (stat.extraStats || []).forEach(visit);
    };
    stats.forEach(visit);
    return lines;
}

export function runeFlowGetGemBonusSources(env, owner, target, resolvedStats, evaluation) {
    let gear = 0;
    let passive = 0;
    let reward = 0;
    let activeTags = runeFlowGetGemLevelTargetTags(env, owner, target);
    const memo = env.deps.getBackgroundBuildMemo(owner) || evaluation?.memo;
    const memoKey = `gem-bonus:${activeTags.join(',')}`;
    if (memo?.has(memoKey)) return memo.get(memoKey);
    const inputs = evaluation || runeFlowCreateGemBonusEvaluation(env, owner, resolvedStats);
    inputs.gearLines.forEach(lines => {
        gear += runeFlowGetGemLevelValueFromStatLines(env, lines, activeTags);
    });
    inputs.passiveEffects.forEach(effect => {
        if (effect.stat === 'gemLevel') passive += Number(effect.val) || 0;
        env.GEM_LEVEL_TAG_RULES.forEach(rule => {
            if (effect.stat === rule.stat && activeTags.includes(rule.tag)) passive += Number(effect.val) || 0;
        });
    });
    (owner.actRewardBonuses || []).forEach(entry => {
        if (entry.stat === 'gemLevel') reward += entry.value;
    });
    (owner.journalBonuses || []).forEach(entry => {
        if (entry && entry.stat === 'gemLevel') reward += entry.value;
    });
    reward += runeFlowGetTalismanGemBonusSources(env, owner, activeTags);
    reward += runeFlowGetGemLevelValueFromStatLines(env, inputs.rewardLines, activeTags);
    const result = { gear: gear, passive: passive, reward: reward, total: gear + passive + reward };
    memo?.set(memoKey, result);
    return result;
}

function appendRuneElementTags(tags, element) {
    if (element === 'fire') tags.push('fire', 'elemental');
    if (element === 'cold') tags.push('cold', 'elemental');
    if (element === 'light') tags.push('lightning', 'elemental');
    if (element === 'chaos') tags.push('chaos');
    if (element === 'phys') tags.push('physical');
}
