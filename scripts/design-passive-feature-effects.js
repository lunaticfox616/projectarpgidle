#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { readTree } = require('./audit-passive-tree-source');
const { formatEffect, stableHash, writeJson, zoneForPosition } = require('./complete-passive-tree-options');
const {
    FEATURE_EFFECT_PROFILES, RARE_MAJOR_EFFECTS, nextFeaturePassiveValue, normalizeFeaturePassiveValue,
    scaleFeatureProfileEffects
} = require('./lib/passive-tree-feature-catalog');
const { refineShortBranchChoices } = require('./lib/passive-tree-branch-choices');
const { getManualMajorDesign } = require('./lib/passive-tree-major-design');
const {
    CENTRAL_VOID_NO_EFFECT_NODE_IDS,
    hasNoEffects,
    isAuthoredMajorNode,
    isPreservedMajorNode
} = require('./lib/passive-tree-intent');
const {
    STAT_META, isAllAttributesEffects, isReadablePassiveValue
} = require('./lib/passive-tree-option-catalog');
const { ATTRIBUTE_STATS, PATH_ALLOWED_STATS } = require('./lib/passive-tree-topology');
const { redesignPassiveTopology } = require('./lib/passive-tree-topology-effects');

const FEATURE_TYPES = new Set(['normal', 'major']);
const SMALL_TYPES = new Set(['minor', 'assist']);
const SPECIAL_CATS = new Set(['mystique', 'devotion', 'cycle']);
const PRIMARY_FEATURE_STATS = Object.freeze({
    strength: ['strength'], dexterity: ['dexterity'], intelligence: ['intelligence'], atk: ['pctDmg'],
    melee: ['meleePctDmg'], projectile: ['projectilePctDmg'], physical: ['physPctDmg'],
    armor: ['armor', 'armorPct', 'blockChance'], evasion: ['evasion', 'evasionPct', 'deflectChance'],
    energyShield: ['energyShield', 'energyShieldPct'], spell: ['spellPctDmg'], chaos: ['chaosPctDmg'],
    elemental: ['elementalPctDmg'], fire: ['firePctDmg'], cold: ['coldPctDmg'],
    lightning: ['lightPctDmg'], ailment: ['dotPctDmg'], potion: ['potionPctDmg'],
    shield: ['shieldPctDmg', 'blockChance'], summon: ['summonPctDmg'],
    mystique: ['mystique'], devotion: ['devotion'], cycle: ['cycle']
});
const STAT_FAMILIES = Object.freeze({
    accuracy: ['accuracy', 'accuracyBonusPct'], critical: ['crit', 'critDmg'], life: ['flatHp', 'pctHp'],
    armor: ['armor', 'armorPct'],
    physicalMitigation: ['dr', 'physTakenAsFire', 'physTakenAsCold', 'physTakenAsLight', 'physTakenAsChaos'],
    shield: ['blockChance', 'blockChanceMax', 'shieldPctDmg'], evasion: ['evasion', 'evasionPct', 'deflectChance'],
    energyShield: ['energyShield', 'energyShieldPct'],
    energyShieldRecovery: ['regen', 'energyShieldRegen', 'energyShieldRechargeFaster'],
    physical: ['flatDmg', 'physPctDmg', 'addedPhysDamagePct'],
    movement: ['move', 'mobilityPctDmg'],
    ignite: ['igniteChance', 'igniteDamageMultiplierPct'], poison: ['poisonChance', 'poisonDamageMultiplierPct'],
    shock: ['shockChance', 'shockedEnemyHitDamageMorePct']
});
const STAT_FAMILY_BY_ID = new Map(Object.entries(STAT_FAMILIES)
    .flatMap(([family, stats]) => stats.map(statId => [statId, family])));
const ZONE_PROFILE_FAMILIES = Object.freeze({
    warrior: new Set(['physical', 'armor', 'physicalMitigation', 'shield', 'life', 'critical']),
    cleric: new Set(['armor', 'physicalMitigation', 'shield', 'life', 'energyShield', 'energyShieldRecovery']),
    wanderer: new Set(['physical', 'evasion', 'life', 'critical', 'poison']),
    archer: new Set(['physical', 'evasion', 'accuracy', 'critical']),
    alchemist: new Set(['evasion', 'energyShield', 'energyShieldRecovery', 'ignite', 'poison', 'shock']),
    occultist: new Set(['energyShield', 'energyShieldRecovery', 'poison', 'critical'])
});
const COMBAT_PROFILE_HINTS = Object.freeze({
    physical: [[/격돌|진동|충격/, 'earth-impact', 'cataclysm']],
    dexterity: [[/발놀림|몸놀림/, 'mobile-strike', 'momentum']],
    spell: [[/유지|채널/, 'channel-focus', 'perfect-channel']],
    summon: [[/권속/, 'bound-life', 'immortal-retinue'], [/의식/, 'elemental-command', 'resistance-breaker']]
});
const GATED_TRADEOFF_NODE_ID = 'expansion_occult_grimoire_20';
const SPECIAL_CLASS_SYNERGIES = Object.freeze({
    nzf7qg5wy3x: ['intelligence', 5, 'occultist'],
    nwfwsvcwy3x: ['potionPctDmg', 4, 'alchemist'],
    expansion_core_prism_09: ['energyShieldPct', 4, 'occultist'],
    expansion_core_prism_17: ['meleePctDmg', 4, 'warrior'],
    expansion_core_prism_25: ['projectilePctDmg', 4, 'archer'],
    nlckhlvlzaq: ['potionPctDmg', 4, 'alchemist'],
    nzeldvjygxa: ['meleePctDmg', 4, 'wanderer'],
    nqz2dbdeewm: ['meleePctDmg', 8, 'warrior'],
    npytzk02tcj: ['evasionPct', 8, 'wanderer'],
    neqhae72l4u: ['shieldPctDmg', 8, 'cleric'],
    n41x9l9wy3x: ['spellPctDmg', 8, 'occultist'],
    nhz88k1d1br: ['projectilePctDmg', 8, 'archer'],
    n7fk4zu2l4u: ['potionPctDmg', 8, 'alchemist'],
    expansion_occult_ritual_eye_01: ['chaosPctDmg', 8, 'occultist']
});
const HIGH_SPECIAL_PENALTIES = Object.freeze({
    nfx1dxfde8q: ['aspd', -2],
    nsro5qcydmk: ['resAll', -2.5],
    v13_balance_center_dimensional_prism_13: ['pctHp', -2],
    v13_balance_center_left_orbit_07: ['energyShieldPct', -4],
    v13_balance_center_left_wave_07: ['move', -2]
});
const SPECIAL_PROFILE_HINTS = Object.freeze({
    mystique: [
        [/주문|비전|마도/, 'spell-gaze', 'arcane-eye'], [/공허|금단/, 'deep-gaze', 'void-eye'],
        [/심연/, 'deep-gaze', 'abyss-eye'], [/독|중독|증류|농축|병증/, 'ailment-secret', 'poison-eye'],
        [/정조준|매의 눈|추적/, 'hunter-sight', 'hunter-eye'],
        [/진실|꿰뚫/, 'forbidden-sight', 'truth-eye'], [/불|화염|타오/, 'deep-gaze', 'burning-eye']
    ],
    devotion: [
        [/방패/, 'guard', 'shield-gospel'], [/수호|정화|빛나는/, 'guard', 'guard-gospel'],
        [/생명/, 'life', 'life-gospel'], [/영혼/, 'spirit', 'soul-gospel'],
        [/심연/, 'abyss', 'abyss-gospel'], [/공허/, 'void', 'void-gospel'],
        [/금단/, 'forbidden', 'forbidden-gospel'], [/봉인/, 'sealed', 'sealed-gospel'],
        [/회복|의식/, 'life', 'recovery-gospel'], [/전투|파쇄/, 'combat', 'war-gospel']
    ],
    cycle: [
        [/철벽|강철|수호/, 'shell', 'iron-cycle'], [/생명|불굴/, 'breath', 'life-cycle'],
        [/전장/, 'battle', 'battle-cycle'], [/바람|흔적|기습|윤회/, 'return', 'wind-cycle'],
        [/폭풍|질풍|파쇄/, 'impact', 'storm-cycle'],
        [/병증/, 'breath', 'ailment-cycle'], [/삼원|원소/, 'impact', 'element-cycle']
    ]
});

function specialPrimaryValue(node) {
    const band = Math.max(0, Math.min(4, Number(node.powerBand) || 0));
    const byType = node.type === 'normal' ? [1, 1, 2, 2, 2] : [2, 2, 2, 3, 3];
    return byType[band];
}

function varySpecialPrimary(node, effects) {
    if (!SPECIAL_CATS.has(node.cat)) return effects;
    return effects.map(effect => effect.statId === node.cat
        ? { ...effect, value: specialPrimaryValue(node) } : effect);
}

function formatFeatureEffect(effect) {
    if (effect.statId !== 'devotion') return formatEffect(effect);
    const value = Number(effect.value), sign = value >= 0 ? '+' : '';
    return `계시 ${sign}${value}`;
}

function formatSmallPassive(node) {
    if (isAllAttributesEffects(node.runtimeEffects)) return `모든 능력치 +${node.runtimeEffects[0].value}`;
    return node.runtimeEffects.map(formatFeatureEffect).join('\n');
}

function selectSmallPassiveEffectIndex(node) {
    const effects = node.runtimeEffects || [];
    if (!SPECIAL_CATS.has(node.cat)) return 0;
    const index = effects.findIndex(effect => effect.statId === node.cat);
    return index < 0 ? 0 : index;
}

function normalizeSmallPassives(tree, report) {
    tree.nodes.filter(node => SMALL_TYPES.has(node.type) && !SPECIAL_CATS.has(node.cat)).forEach(node => {
        const before = structuredClone(node);
        const wasComposite = !isAllAttributesEffects(node.runtimeEffects) && node.runtimeEffects.length > 1;
        if (!isAllAttributesEffects(node.runtimeEffects) && node.runtimeEffects.length > 1) {
            const selectedIndex = selectSmallPassiveEffectIndex(node);
            node.runtimeEffects = [{ ...node.runtimeEffects[selectedIndex] }];
        }
        node.runtimeEffects = node.runtimeEffects.map(effect => ({
            ...effect, value: normalizeFeaturePassiveValue(effect.statId, effect.value, node.type)
        }));
        node.mods = node.runtimeEffects.map(effect => ({ ...effect }));
        node.desc = formatSmallPassive(node);
        if (wasComposite) node.statAutoName = true;
        if (JSON.stringify(before) === JSON.stringify(node)) return;
        report.smallPassiveChanges.push({ id: String(node.id), before: before.runtimeEffects, after: node.runtimeEffects });
    });
}

function groupNodesByCluster(tree) {
    const groups = new Map();
    tree.nodes.forEach(node => {
        if (!node.optionClusterId) return;
        if (!groups.has(node.optionClusterId)) groups.set(node.optionClusterId, []);
        groups.get(node.optionClusterId).push(node);
    });
    return groups;
}

function clusterStatWeights(node, groups) {
    const weights = new Map(), members = groups.get(node.optionClusterId) || [];
    (node.runtimeEffects || []).forEach(effect => weights.set(effect.statId, 20));
    members.filter(member => String(member.id) !== String(node.id)).forEach(member => {
        const typeWeight = FEATURE_TYPES.has(member.type) ? 0.5 : 1;
        (member.runtimeEffects || []).forEach(effect =>
            weights.set(effect.statId, (weights.get(effect.statId) || 0) + typeWeight));
    });
    return weights;
}

function hintedSpecialProfileId(node) {
    const hint = (SPECIAL_PROFILE_HINTS[node.cat] || []).find(([pattern]) => pattern.test(String(node.name || '')));
    if (!hint) return null;
    return node.type === 'normal' ? hint[1] : hint[2];
}

function hintedCombatProfileId(node) {
    const hint = (COMBAT_PROFILE_HINTS[effectArchetype(node)] || [])
        .find(([pattern]) => pattern.test(String(node.name || '')));
    if (!hint) return null;
    return node.type === 'normal' ? hint[1] : hint[2];
}

function preferredProfileId(node, profiles) {
    return hintedSpecialProfileId(node) || hintedCombatProfileId(node);
}

function contextualStatWeight(statId, weights) {
    const exact = weights.get(statId) || 0, family = STAT_FAMILY_BY_ID.get(statId);
    if (!family) return exact * 2;
    const related = STAT_FAMILIES[family].reduce((best, relatedId) =>
        Math.max(best, weights.get(relatedId) || 0), 0);
    return exact * 2 + (related === exact ? 0 : related * 0.6);
}

function featureStatFamily(statId) {
    return STAT_FAMILY_BY_ID.get(statId) || statId;
}

function profileScore(profile, weights) {
    const familyScores = new Map();
    profile.effects.forEach(([statId]) => {
        const family = featureStatFamily(statId), score = contextualStatWeight(statId, weights);
        familyScores.set(family, Math.max(familyScores.get(family) || 0, score));
    });
    return [...familyScores.values()].reduce((sum, score) => sum + score, 0);
}

function zoneProfileScore(node, profile) {
    const allowed = ZONE_PROFILE_FAMILIES[zoneForPosition(node.x, node.y)] || new Set();
    return profile.effects.reduce((score, [statId]) =>
        score + Number(allowed.has(STAT_FAMILY_BY_ID.get(statId))), 0);
}

function profileOrder(node, profiles, weights, globalUsage) {
    const start = stableHash(`${node.id}:${effectArchetype(node)}:${zoneForPosition(node.x, node.y)}`) % profiles.length;
    const preferredId = preferredProfileId(node, profiles);
    return profiles.map((profile, index) => ({
        profile, index, preferred: profile.id === preferredId,
        usage: globalUsage.get(profile.id) || 0, score: profileScore(profile, weights), zoneScore: zoneProfileScore(node, profile)
    })).sort((a, b) => Number(b.preferred) - Number(a.preferred)
            || b.score - a.score || b.zoneScore - a.zoneScore || a.usage - b.usage
            || (a.index - start + profiles.length) % profiles.length - (b.index - start + profiles.length) % profiles.length);
}

function effectArchetype(node) {
    const isSummon = (node.runtimeEffects || []).some(effect => String(effect.statId).startsWith('summon'));
    if (isSummon) return 'summon';
    return SPECIAL_CATS.has(node.cat) ? node.cat : node.archetype;
}

function secondaryFeatureFamilies(node) {
    const primary = new Set((PRIMARY_FEATURE_STATS[effectArchetype(node)] || []).map(featureStatFamily));
    return new Set((node.runtimeEffects || []).filter(effect => Number(effect.value) >= 0)
        .map(effect => featureStatFamily(effect.statId)).filter(family => !primary.has(family)));
}

function hasPreferredFeatureProfile(node) {
    return Boolean(preferredProfileId(node, []));
}

function topologyProfileCandidates(node, profiles, topology) {
    if (SPECIAL_CATS.has(node.cat)) return profiles;
    if (topology.corridorIds.has(String(node.id))) {
        return profiles.filter(profile => profile.effects.every(([statId]) => PATH_ALLOWED_STATS.has(statId)));
    }
    return profiles.filter(profile => profile.effects.every(([statId]) => !ATTRIBUTE_STATS.has(statId)));
}

function chooseProfile(node, state) {
    const archetype = effectArchetype(node), catalog = FEATURE_EFFECT_PROFILES[archetype];
    assert.ok(catalog, `효과 카탈로그가 없는 태그: ${node.id}/${archetype}`);
    const candidates = topologyProfileCandidates(node, catalog[node.type], state.topology);
    assert.ok(candidates.length > 0, `위상 규칙을 만족하는 효과가 없습니다: ${node.id}/${archetype}`);
    const weights = clusterStatWeights(node, state.groups);
    const usageKey = `${node.optionClusterId}:${archetype}:${node.type}`;
    const globalKey = `${archetype}:${node.type}`;
    if (!state.usedProfiles.has(usageKey)) state.usedProfiles.set(usageKey, new Set());
    if (!state.globalProfileUsage.has(globalKey)) state.globalProfileUsage.set(globalKey, new Map());
    const globalUsage = state.globalProfileUsage.get(globalKey);
    const used = state.usedProfiles.get(usageKey), ranked = profileOrder(node, candidates, weights, globalUsage);
    const selected = ranked.find(row => !used.has(row.profile.id)) || ranked[0];
    used.add(selected.profile.id);
    globalUsage.set(selected.profile.id, (globalUsage.get(selected.profile.id) || 0) + 1);
    return {
        profile: selected.profile, score: selected.score, zoneScore: selected.zoneScore,
        preferred: selected.preferred,
        alternatives: ranked.slice(0, 3).map(row => ({
            profileId: row.profile.id, score: row.score, zoneScore: row.zoneScore, preferred: row.preferred
        })),
        contextStats: [...weights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    };
}

function applyRareMajorEffect(node, effects) {
    const rare = RARE_MAJOR_EFFECTS[String(node.id)];
    if (!rare) return effects;
    if (effects.some(effect => effect.statId === rare[0])) return effects;
    if (isPreservedMajorNode(node)) return [...effects, { statId: rare[0], value: rare[1] }];
    return [...effects.slice(0, 2), { statId: rare[0], value: rare[1] }];
}

function applySpecialFeatureVariation(node, effects) {
    if (!SPECIAL_CATS.has(node.cat)) return effects;
    const nodeId = String(node.id);
    if (nodeId === GATED_TRADEOFF_NODE_ID) {
        node.specialVariation = 'gated-tradeoff';
        node.activationRequirement = { type: 'special-stat-reserve', statId: node.cat, minimum: 1 };
        return effects.map(effect => effect.statId === node.cat ? { ...effect, value: -1 } : effect);
    }
    const penalty = HIGH_SPECIAL_PENALTIES[nodeId];
    if (penalty) {
        node.specialVariation = 'high-power-penalty';
        return [...effects, { statId: penalty[0], value: penalty[1] }];
    }
    const synergy = SPECIAL_CLASS_SYNERGIES[nodeId];
    if (!synergy) return effects;
    node.specialVariation = 'class-synergy';
    node.specialSynergyClass = synergy[2];
    return [...effects, { statId: synergy[0], value: synergy[1] }];
}

function strengthenFeatureAgainstLowerGrades(node, effects, groups) {
    const lowerTypes = node.type === 'normal' ? SMALL_TYPES : new Set([...SMALL_TYPES, 'normal']);
    const lowerNodes = (groups.get(node.optionClusterId) || []).filter(member => lowerTypes.has(member.type));
    return effects.map(effect => {
        if (Number(effect.value) < 0 || SPECIAL_CATS.has(effect.statId)) return effect;
        const lowerValues = lowerNodes.flatMap(member => member.runtimeEffects || [])
            .filter(lower => lower.statId === effect.statId).map(lower => Number(lower.value));
        if (lowerValues.length === 0 || effect.value > Math.max(...lowerValues)) return effect;
        return { ...effect, value: nextFeaturePassiveValue(effect.statId, node.type, Math.max(...lowerValues)) };
    });
}

function normalizeFeatureEffects(node, effects) {
    return effects.map(effect => ({
        ...effect, value: normalizeFeaturePassiveValue(effect.statId, effect.value, node.type)
    }));
}

function preserveExistingMajorEffects(node) {
    if (!isPreservedMajorNode(node)) return;
    const original = structuredClone(node.runtimeEffects || []);
    const withRareEffect = applyRareMajorEffect(node, original);
    const specialized = applySpecialFeatureVariation(node, withRareEffect);
    const varied = node.specialVariation === 'gated-tradeoff' || !node.specialVariation
        ? specialized : varySpecialPrimary(node, specialized);
    node.runtimeEffects = normalizeFeatureEffects(node, varied);
    node.mods = node.runtimeEffects.map(effect => ({ ...effect }));
    node.desc = node.runtimeEffects.map(formatFeatureEffect).join('\n');
}

function refreshGeneratedFeatureGrades(output, groups) {
    output.nodes.filter(node => FEATURE_TYPES.has(node.type) && !isPreservedMajorNode(node)).forEach(node => {
        node.runtimeEffects = strengthenFeatureAgainstLowerGrades(node, node.runtimeEffects, groups);
        node.mods = node.runtimeEffects.map(effect => ({ ...effect }));
        node.desc = node.runtimeEffects.map(formatFeatureEffect).join('\n');
    });
}

function recordChange(report, before, node, selection) {
    report.changes.push({
        id: String(node.id), type: node.type, name: node.name, cat: node.cat, archetype: node.archetype,
        effectArchetype: node.effectArchetype || node.archetype,
        clusterId: node.optionClusterId, selectedProfile: selection.profile.name,
        nameHintProfileId: preferredProfileId(node, [selection.profile]),
        profileFitScore: selection.score, zoneFitScore: selection.zoneScore,
        alternatives: selection.alternatives,
        contextStats: selection.contextStats.map(([statId, weight]) => ({ statId, weight })),
        before: before.runtimeEffects, after: node.runtimeEffects,
        specialVariation: node.specialVariation || null,
        specialSynergyClass: node.specialSynergyClass || null,
        activationRequirement: node.activationRequirement || null
    });
}

function assignManualMajor(node, state, report, design) {
    const before = structuredClone(node);
    const effects = design.effects.map(([statId, value]) => ({ statId, value }));
    effects.forEach(effect => {
        assert.ok(STAT_META[effect.statId], `수동 주요 패시브에 미지원 효과가 있습니다: ${node.id}/${effect.statId}`);
        assert.ok(!ATTRIBUTE_STATS.has(effect.statId), `수동 주요 패시브에 능력치를 사용했습니다: ${node.id}/${effect.statId}`);
    });
    ['effectArchetype', 'specialVariation', 'specialSynergyClass', 'activationRequirement']
        .forEach(key => delete node[key]);
    node.name = design.name;
    node.runtimeEffects = normalizeFeatureEffects(node, effects);
    node.runtimeEffects = strengthenFeatureAgainstLowerGrades(node, node.runtimeEffects, state.groups);
    node.mods = node.runtimeEffects.map(effect => ({ ...effect }));
    node.desc = node.runtimeEffects.map(formatFeatureEffect).join('\n');
    node.optionProfile = `manual:${node.id}`;
    delete node.topologyRethemed;
    recordChange(report, before, node, {
        profile: { id: `manual:${node.id}`, name: design.name, effects: design.effects },
        score: null, zoneScore: null, alternatives: [], contextStats: []
    });
}

function assignFeatureNode(node, state, report) {
    const manualDesign = node.type === 'major' ? getManualMajorDesign(node.id) : null;
    if (manualDesign) return assignManualMajor(node, state, report, manualDesign);
    const before = structuredClone(node);
    const assignedArchetype = effectArchetype(node);
    if (assignedArchetype === node.archetype) delete node.effectArchetype;
    else node.effectArchetype = assignedArchetype;
    const selection = chooseProfile(node, state);
    const baseEffects = varySpecialPrimary(node, scaleFeatureProfileEffects(selection.profile, node));
    const specialized = applySpecialFeatureVariation(node, applyRareMajorEffect(node, baseEffects));
    const readable = normalizeFeatureEffects(node, specialized);
    node.runtimeEffects = strengthenFeatureAgainstLowerGrades(node, readable, state.groups);
    node.mods = node.runtimeEffects.map(effect => ({ ...effect }));
    node.desc = node.runtimeEffects.map(formatFeatureEffect).join('\n');
    node.optionProfile = `feature:${selection.profile.id}`;
    if (node.topologyRethemed) node.name = selection.profile.name;
    delete node.topologyRethemed;
    recordChange(report, before, node, selection);
}

function validateFeatureNode(node) {
    const hasThirdLine = RARE_MAJOR_EFFECTS[String(node.id)] || node.specialVariation;
    const expectedLines = hasThirdLine ? 3 : 2;
    assert.strictEqual(node.runtimeEffects.length, expectedLines, `효과 줄 수 오류: ${node.id}`);
    node.runtimeEffects.forEach(effect => {
        assert.ok(STAT_META[effect.statId], `미지원 효과: ${node.id}/${effect.statId}`);
        if (Number(effect.value) < 0) {
            assert.ok(['high-power-penalty', 'gated-tradeoff'].includes(node.specialVariation),
                `의도하지 않은 불이익이 있습니다: ${node.id}`);
        }
        assert.ok(isReadablePassiveValue(effect.statId, effect.value), `읽기 어려운 수치: ${node.id}/${effect.statId}`);
    });
    if (SPECIAL_CATS.has(node.cat)) {
        assert.ok(node.runtimeEffects.some(effect => effect.statId === node.cat), `특수 태그 본체 효과 누락: ${node.id}/${node.cat}`);
        const expectedPrimary = node.specialVariation === 'gated-tradeoff' ? -1 : specialPrimaryValue(node);
        assert.strictEqual(node.runtimeEffects.find(effect => effect.statId === node.cat).value,
            expectedPrimary, `특수 태그 본체 수치 구간 불일치: ${node.id}`);
        const hintedProfile = hintedSpecialProfileId(node);
        if (hintedProfile) assert.strictEqual(node.optionProfile, `feature:${hintedProfile}`, `이름과 효과가 어긋납니다: ${node.id}`);
        if (node.specialVariation === 'high-power-penalty') {
            assert.strictEqual(specialPrimaryValue(node), 3, `+3이 아닌 특수 노드에 고출력 불이익이 있습니다: ${node.id}`);
        }
        if (node.specialVariation === 'class-synergy') {
            assert.strictEqual(zoneForPosition(node.x, node.y), node.specialSynergyClass,
                `인접 직업 시너지와 위치가 어긋납니다: ${node.id}`);
        }
        if (node.specialVariation === 'gated-tradeoff') {
            assert.deepStrictEqual(node.activationRequirement,
                { type: 'special-stat-reserve', statId: node.cat, minimum: 1 }, `활성 조건 오류: ${node.id}`);
        }
    }
    assert.strictEqual(node.desc, node.runtimeEffects.map(formatFeatureEffect).join('\n'), `설명 불일치: ${node.id}`);
}

function validatePreservedMajorNode(node, sourceNode) {
    ['id', 'type', 'x', 'y', 'cat', 'archetype', 'name', 'optionProfile'].forEach(key =>
        assert.deepStrictEqual(node[key], sourceNode[key], `기존 주요 패시브 필드 변경: ${node.id}/${key}`));
    const outputEffects = new Map(node.runtimeEffects.map(effect => [effect.statId, Number(effect.value)]));
    sourceNode.runtimeEffects.forEach(effect =>
        assert.ok(outputEffects.has(effect.statId), `기존 주요 패시브 효과가 사라졌습니다: ${node.id}/${effect.statId}`));
    assert.strictEqual(node.type, 'major', `작성된 강력한 노드의 등급이 주요가 아닙니다: ${node.id}`);
    assert.ok(node.runtimeEffects.length > 0, `작성된 주요 패시브 효과가 없습니다: ${node.id}`);
    node.runtimeEffects.forEach(effect => {
        assert.ok(STAT_META[effect.statId], `미지원 효과: ${node.id}/${effect.statId}`);
        assert.ok(isReadablePassiveValue(effect.statId, effect.value), `읽기 어려운 수치: ${node.id}/${effect.statId}`);
    });
    assert.strictEqual(node.desc, node.runtimeEffects.map(formatFeatureEffect).join('\n'), `설명 불일치: ${node.id}`);
}

function validateTree(source, output, report = { smallPassiveChanges: [], topology: { changes: [] },
    branchChoices: { changes: [], after: { count: 0 } } }) {
    assert.strictEqual(output.nodes.length, source.nodes.length, '노드 수가 달라졌습니다.');
    assert.deepStrictEqual(output.edges, source.edges, '연결선이 달라졌습니다.');
    const sourceById = new Map(source.nodes.map(node => [String(node.id), node]));
    const branchChangeIds = new Set(report.branchChoices.changes.map(change => change.id));
    const featureChangeIds = new Set(report.changes.map(change => change.id));
    const normalizedSmallIds = new Set(report.smallPassiveChanges.map(change => change.id));
    const topologyChangeIds = new Set(report.topology.changes.map(change => change.id));
    output.nodes.forEach(node => {
        const before = sourceById.get(String(node.id));
        assert.ok(before, `원본에 없는 노드: ${node.id}`);
        ['id', 'type', 'x', 'y'].forEach(key =>
            assert.deepStrictEqual(node[key], before[key], `보존 필드 변경: ${node.id}/${key}`));
        if (!topologyChangeIds.has(String(node.id))) ['cat', 'archetype'].forEach(key =>
            assert.deepStrictEqual(node[key], before[key], `보존 필드 변경: ${node.id}/${key}`));
        if (isPreservedMajorNode(before) && !topologyChangeIds.has(String(node.id))
            && !featureChangeIds.has(String(node.id))
            && !branchChangeIds.has(String(node.id))) {
            validatePreservedMajorNode(node, before);
        }
        else if (FEATURE_TYPES.has(node.type)) validateFeatureNode(node);
        else if (!branchChangeIds.has(String(node.id)) && !normalizedSmallIds.has(String(node.id))
            && !topologyChangeIds.has(String(node.id))) {
            assert.deepStrictEqual(node, before, `범위 밖 노드 변경: ${node.id}`);
        }
    });
    const outputById = new Map(output.nodes.map(node => [String(node.id), node]));
    CENTRAL_VOID_NO_EFFECT_NODE_IDS.forEach(id => {
        const node = outputById.get(id);
        assert.ok(node?.intentionalNoEffect && hasNoEffects(node), `중앙 무효 패시브가 보존되지 않았습니다: ${id}`);
    });
    assert.strictEqual(report.branchChoices.after.count, 0,
        `고민할 필요가 없는 짧은 갈래가 남았습니다: ${JSON.stringify(report.branchChoices.after.rows)}`);
}

function designFeatureEffects(source, sourceFile) {
    const output = structuredClone(source);
    const topologyDesign = redesignPassiveTopology(output), groups = groupNodesByCluster(output);
    const state = { groups, topology: topologyDesign.topology, usedProfiles: new Map(), globalProfileUsage: new Map() };
    const report = { source: path.resolve(sourceFile), designPrinciples: [
        '각 직업 시작점에서 같은 축의 공허 노드까지 이어지는 능력치 경로 전체를 뼈대 길목으로 보호한다.',
        '힘·민첩·지능은 뼈대 길목에 집중하고, 노드 뭉치에서는 태그 피해·방어·저항·속도 선택지로 교체한다.',
        '노드 뭉치의 외부 진입점 사이를 통과하는 모든 길목에는 정확도·지속 피해·상태 이상·소환수처럼 건너뛸 수 있는 빌드 전용 효과를 사용하지 않는다.',
        '신비·계시·순환은 1·3·5·7·9·11시 축의 연결 뭉치와 중앙 핵심부에만 남긴다.',
        '소형·보조 패시브는 하나의 단순 효과만 가진다.',
        '일반 패시브는 태그의 기본 축 두 개를 결합한다.',
        '재설계 주요 패시브는 점수 기반 자동 선택 없이 위치·연결 형태·뭉치 콘셉트를 검토한 명시적 설계표를 사용한다.',
        '주요 패시브 효과 조합에는 힘·민첩·지능을 사용하지 않고, 공격·속도·관통·방어·회복의 선택 축을 제시한다.',
        '같은 뭉치의 주요 패시브는 속도, 치명타, 관통, 조건부 생존처럼 서로 다른 목적을 가져 한 선택이 다른 선택을 완전히 대체하지 않는다.',
        '특수 스탯 +3 노드는 작은 불이익을 함께 주어 자동 선택을 막는다.',
        '일부 특수 스탯 노드는 인접 직업의 핵심 능력치를 세 번째 효과로 제공한다.',
        '희소한 교환 노드는 특수 스탯을 지불할 수 있을 때만 모든 효과가 활성화된다.',
        '일반·주요 패시브는 전역 유일성보다 한 뭉치의 단일 목적과 선택 축을 우선한다.',
        '희소 효과는 기존에 의도된 주요 패시브에만 제한한다.'
    ], changes: [], smallPassiveChanges: [], topology: topologyDesign.report, branchChoices: null };
    normalizeSmallPassives(output, report);
    output.nodes.filter(node => isPreservedMajorNode(node) && !getManualMajorDesign(node.id))
        .forEach(preserveExistingMajorEffects);
    output.nodes.filter(node => FEATURE_TYPES.has(node.type)
        && (!isPreservedMajorNode(node) || getManualMajorDesign(node.id))).sort((a, b) =>
        String(a.optionClusterId).localeCompare(String(b.optionClusterId)) || String(a.id).localeCompare(String(b.id)))
        .forEach(node => assignFeatureNode(node, state, report));
    report.branchChoices = refineShortBranchChoices(output, state.topology);
    refreshGeneratedFeatureGrades(output, groups);
    validateTree(source, output, report);
    report.summary = summarize(output, report);
    return { output, report };
}

function summarize(output, report) {
    const features = output.nodes.filter(node => FEATURE_TYPES.has(node.type));
    const specialSmall = output.nodes.filter(node => ['minor', 'assist'].includes(node.type) && SPECIAL_CATS.has(node.cat));
    const specialFeatures = features.filter(node => SPECIAL_CATS.has(node.cat));
    return {
        topology: report.topology.summary,
        changed: report.changes.length,
        byType: Object.fromEntries(['normal', 'major'].map(type => [type, features.filter(node => node.type === type).length])),
        byArchetype: Object.fromEntries([...new Set(features.map(node => node.archetype))].sort()
            .map(archetype => [archetype, features.filter(node => node.archetype === archetype).length])),
        byEffectArchetype: Object.fromEntries([...new Set(features.map(node => node.effectArchetype || node.archetype))].sort()
            .map(archetype => [archetype, features.filter(node => (node.effectArchetype || node.archetype) === archetype).length])),
        negativeEffects: features.flatMap(node => node.runtimeEffects).filter(effect => Number(effect.value) < 0).length,
        rareEffects: Object.keys(RARE_MAJOR_EFFECTS).length,
        preservedAuthoredMajors: features.filter(isAuthoredMajorNode).length,
        preservedExistingMajors: features.filter(node => node.type === 'major').length
            - report.changes.filter(change => change.type === 'major').length
            - report.branchChoices.changes.filter(change => change.type === 'major').length,
        intentionalNoEffectPassives: CENTRAL_VOID_NO_EFFECT_NODE_IDS.length,
        singleEffectSpecialSmallPassives: specialSmall.filter(node => node.runtimeEffects.length === 1).length,
        normalizedSmallPassives: report.smallPassiveChanges.length,
        refinedShortBranchNodes: report.branchChoices.changes.length,
        dominatedShortBranchesBefore: report.branchChoices.before.count,
        dominatedShortBranchesAfter: report.branchChoices.after.count,
        specialPrimaryValues: Object.fromEntries(['normal', 'major'].map(type => [type,
            countByValue(specialFeatures.filter(node => node.type === type))])),
        variedSpecialFeatures: Object.fromEntries(['normal', 'major'].map(type => [type,
            specialFeatures.filter(node => node.type === type).length])),
        specialMechanicalVariations: {
            classSynergy: specialFeatures.filter(node => node.specialVariation === 'class-synergy').length,
            highPowerPenalty: specialFeatures.filter(node => node.specialVariation === 'high-power-penalty').length,
            gatedTradeoff: specialFeatures.filter(node => node.specialVariation === 'gated-tradeoff').length
        }
    };
}

function countByValue(nodes) {
    return Object.fromEntries(Object.entries(nodes.reduce((counts, node) => {
        const value = node.runtimeEffects.find(effect => effect.statId === node.cat)?.value;
        counts[value] = (counts[value] || 0) + 1;
        return counts;
    }, {})).sort((left, right) => Number(left[0]) - Number(right[0])));
}

function main() {
    const [sourceFile, outputFile, reportFile] = process.argv.slice(2);
    if (!sourceFile || !outputFile || !reportFile) {
        throw new Error('사용법: node scripts/design-passive-feature-effects.js <source.json> <output.json> <report.json>');
    }
    const source = readTree(sourceFile), { output, report } = designFeatureEffects(source, sourceFile);
    writeJson(outputFile, output);
    writeJson(reportFile, report);
    console.log(JSON.stringify(report.summary, null, 2));
}

if (require.main === module) main();

module.exports = {
    designFeatureEffects, featureStatFamily, hasPreferredFeatureProfile, preferredProfileId,
    secondaryFeatureFamilies, validateTree
};
