'use strict';

const { isIntentionalNoEffectNode } = require('./passive-tree-intent');

const ACTIONABLE_TYPES = new Set(['minor', 'assist', 'normal', 'major']);
const DAMAGE_TYPE_STATS = Object.freeze({
    spell: 'spellPctDmg', chaos: 'chaosPctDmg', fire: 'firePctDmg', cold: 'coldPctDmg',
    lightning: 'lightPctDmg', elemental: 'elementalPctDmg', physical: 'physPctDmg'
});
const DAMAGE_METHOD_STATS = Object.freeze({
    projectile: 'projectilePctDmg', melee: 'meleePctDmg', area: 'aoePctDmg'
});
const LEGACY_STATS = Object.freeze({
    critical_strike_chance: 'crit', critical_damage_multiplier: 'critDmg'
});
const TAG_BY_STAT = Object.freeze({
    strength: 'str', dexterity: 'dex', intelligence: 'int',
    flatHp: 'def', pctHp: 'def', regen: 'def', leech: 'def',
    armor: 'def', armorPct: 'def', evasion: 'def', evasionPct: 'def', energyShield: 'def',
    energyShieldPct: 'def', energyShieldRegen: 'def', energyShieldRechargeFaster: 'def',
    blockChance: 'def', deflectChance: 'def', dr: 'def',
    maxResAll: 'def', maxResF: 'def', maxResC: 'def', maxResL: 'def', maxResChaos: 'def',
    resF: 'def', resC: 'def', resL: 'def', resAll: 'def', resChaos: 'def',
    takenDamageReduceWhen1EnemyPct: 'def', summonGuardRedirectPct: 'spell',
    meleePctDmg: 'physical', physPctDmg: 'physical', shieldPctDmg: 'physical',
    slamPctDmg: 'physical', slamEchoChance: 'physical', bleedChance: 'physical',
    projectilePctDmg: 'atk', targetProjectile: 'atk', projectileExtraShots: 'atk', accuracy: 'atk',
    pctDmg: 'atk', minDmgRoll: 'atk', maxDmgRoll: 'atk', aspd: 'atk', ds: 'atk', crit: 'atk', critDmg: 'atk',
    mobilityPctDmg: 'atk', aoePctDmg: 'atk', minePctDmg: 'atk',
    spellPctDmg: 'spell', channelingPctDmg: 'spell', suppCap: 'spell', spellGemLevel: 'spell',
    spellFlatDmg: 'spell', spellFlatPct: 'spell', summonPctDmg: 'spell', summonResPen: 'spell', summonEfficiency: 'spell',
    summonHpPct: 'spell', summonGemLevel: 'spell',
    firePctDmg: 'fire', igniteChance: 'fire', igniteDamageMultiplierPct: 'fire', fireGemLevel: 'fire',
    coldPctDmg: 'cold', chillChance: 'cold', chillEffect: 'cold', coldGemLevel: 'cold', lightPctDmg: 'lightning',
    shockEffect: 'lightning', shockedEnemyHitDamagePct: 'lightning', lightGemLevel: 'lightning',
    elementalPctDmg: 'elemental', resPen: 'elemental', chaosPctDmg: 'chaos',
    poisonChance: 'ailment', poisonDamageMultiplierPct: 'ailment', ailmentDamagePct: 'ailment',
    ailmentPotencyPct: 'ailment', freezeChance: 'cold',
    dotPctDmg: 'ailment', dotGemLevel: 'ailment', potionPctDmg: 'atk', move: 'dex',
    elementalGemLevel: 'elemental', projectileGemLevel: 'atk', meleeGemLevel: 'physical',
    slamGemLevel: 'physical', aoeGemLevel: 'atk',
    mystique: 'mystique', devotion: 'devotion', cycle: 'cycle'
});
const ARCHETYPE_BY_TAG = Object.freeze({
    str: 'strength', dex: 'dexterity', int: 'intelligence', def: 'shield', atk: 'precision',
    physical: 'blade', spell: 'arcane', fire: 'elemental', cold: 'elemental',
    lightning: 'elemental', elemental: 'elemental', chaos: 'chaos', ailment: 'chaos',
    mystique: 'mystique', devotion: 'devotion', cycle: 'cycle'
});

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function canonicalizeMod(entry) {
    const value = Number(entry.value);
    if (entry.statId === 'attribute' && entry.target === 'all') {
        return ['strength', 'dexterity', 'intelligence'].map(statId => ({ statId, value }));
    }
    if (entry.statId === 'attribute') return [{ statId: entry.target, value }];
    if (entry.statId === 'damage_method') {
        return [{ statId: DAMAGE_METHOD_STATS[entry.target] || entry.statId, value }];
    }
    if (entry.statId === 'damage_type') {
        return [{ statId: DAMAGE_TYPE_STATS[entry.target] || entry.statId, value }];
    }
    return [{ statId: LEGACY_STATS[entry.statId] || entry.statId, value }];
}

function canonicalizeMods(mods) {
    return (mods || []).flatMap(canonicalizeMod);
}

function cleanStatName(name, statId) {
    const cleaned = String(name || statId).replace(/\s*\(%\)\s*$/, '').trim();
    return cleaned || statId;
}

function formatEffect(effect, statCatalog) {
    const definition = statCatalog[effect.statId] || {};
    const name = cleanStatName(definition.name, effect.statId);
    const value = Number(effect.value), sign = value >= 0 ? '+' : '';
    return `${name} ${sign}${value}${definition.isPct ? '%' : ''}`;
}

function formatDescription(effects, statCatalog) {
    return effects.map(effect => formatEffect(effect, statCatalog)).join('\n');
}

function deriveTag(effects) {
    for (const effect of effects || []) {
        const tag = TAG_BY_STAT[effect.statId];
        if (tag) return tag;
    }
    return null;
}

function assignMissingTag(node, effects, report) {
    if (node.cat && node.cat !== 'none') return;
    const tag = deriveTag(effects);
    if (!tag) throw new Error(`효과에서 태그를 결정할 수 없습니다: ${node.id}`);
    node.cat = tag;
    if (!node.archetype || node.archetype === 'none') node.archetype = ARCHETYPE_BY_TAG[tag] || tag;
    report.tagged.push(String(node.id));
}

function repairNode(node, options, report) {
    const id = String(node.id), shouldSync = options.runtimeSyncIds.has(id);
    if (shouldSync) {
        node.mods = canonicalizeMods(node.mods);
        node.runtimeEffects = clone(node.mods);
        report.runtimeSynced.push(id);
    }
    const effects = canonicalizeMods(node.mods);
    assignMissingTag(node, effects, report);
    if (options.descriptionRepairIds.has(id) || shouldSync) {
        node.desc = formatDescription(effects, options.statCatalog);
        report.descriptionsRepaired.push(id);
    }
}

function addBridgeEffects(node, statCatalog, report) {
    const effects = [{ statId: 'strength', value: 5 }];
    node.cat = 'str';
    node.name = '힘';
    node.desc = formatDescription(effects, statCatalog);
    node.mods = clone(effects);
    node.runtimeEffects = clone(effects);
    node.statAutoName = true;
    node.archetype = 'strength';
    report.bridgeNodesRepaired.push(String(node.id));
}

function applyAuthoredCorrection(node, correction, statCatalog, report) {
    Object.entries(correction).forEach(([key, value]) => {
        node[key] = clone(value);
    });
    node.mods = canonicalizeMods(node.mods);
    node.runtimeEffects = clone(node.mods);
    node.desc = formatDescription(node.mods, statCatalog);
    report.authoredEffectsRepaired.push(String(node.id));
}

function normalizeAuthoringTree(source, options) {
    const output = clone(source), report = {
        bridgeNodesRepaired: [], authoredEffectsRepaired: [], runtimeSynced: [], descriptionsRepaired: [], tagged: []
    };
    output.nodes.forEach(node => {
        const id = String(node.id);
        const correction = options.authoredCorrections?.[id];
        if (correction) {
            applyAuthoredCorrection(node, correction, options.statCatalog, report);
            return;
        }
        if (options.bridgeNodeIds.has(id)) {
            addBridgeEffects(node, options.statCatalog, report);
            return;
        }
        if (!ACTIONABLE_TYPES.has(node.type) || isIntentionalNoEffectNode(node)) return;
        repairNode(node, options, report);
    });
    return { tree: output, report };
}

// ── 패시브 트리 설계자 파일 불러오기(편집기 [파일 불러오기], 2026-10-28) ─────────────
// 설계자(PassiveTreeBuilder 1.x, statsSchemaVersion 6~8)의 옵션 → 게임 옵션. 위의 canonicalizeMod는 예전 저작 원본(schema 5)용이다:
// 설계자의 evasion은 회피 %인데 게임 id evasion은 고정 회피라 같은 표를 쓸 수 없다. 열쇠는 "옵션" 또는 "옵션:대상"이다.
// to: 게임 옵션(여럿이면 같은 값으로 모두, 비면 게임에 없는 옵션), near: 비슷한 게임 옵션으로 바꾼 것(보고에 따로 적는다).
const builder = (to, label, near = false) => Object.freeze({ to: [].concat(to), label, near });
const BUILDER_OPTIONS = Object.freeze({
    attack_power: builder('flatDmg', '공격력', true), base_damage: builder('flatDmg', '기본 피해'), damage: builder('pctDmg', '피해'),
    attack_speed: builder('aspd', '공격 속도'), critical_strike_chance: builder('crit', '치명타 확률'),
    critical_damage_multiplier: builder('critDmg', '치명타 피해 배율'), movement_speed: builder('move', '이동 속도'),
    cooldown_reduction: builder('cooldownReduction', '재사용 대기시간 감소'), buff_duration: builder([], '버프 지속시간'),
    'attribute:strength': builder('strength', '힘'), 'attribute:dexterity': builder('dexterity', '민첩'),
    'attribute:intelligence': builder('intelligence', '지능'), 'attribute:all': builder(['strength', 'dexterity', 'intelligence'], '모든 능력치'),
    maximum_life: builder('pctHp', '최대 생명력 %'), maximum_life_flat: builder('flatHp', '최대 생명력'),
    life_regeneration: builder('regen', '생명력 재생'), life_leech: builder('leech', '생명력 흡수'),
    life_leech_recovery_cap: builder('leechRateCap', '흡혈 회복량 캡', true),
    armour: builder('armorPct', '방어도 %'), armour_flat: builder('armor', '방어도'), evasion: builder('evasionPct', '회피 %'),
    evasion_flat: builder('evasion', '회피'), energy_shield: builder('energyShieldPct', '에너지 보호막 %'),
    energy_shield_flat: builder('energyShield', '에너지 보호막'), energy_shield_regeneration_rate: builder('energyShieldRegen', '에너지 보호막 재생 속도'),
    block_chance: builder('blockChance', '막기 확률'), deflection_chance: builder('deflectChance', '비껴내기 확률'),
    physical_damage_reduction: builder('dr', '물리 피해 감소'), physical_damage_reduction_ignore: builder('physIgnore', '물리 피해 감소 무시'),
    'resistance:fire': builder('resF', '화염 저항'), 'resistance:cold': builder('resC', '냉기 저항'), 'resistance:lightning': builder('resL', '번개 저항'),
    'resistance:chaos': builder('resChaos', '카오스 저항'), 'resistance:elemental': builder('resAll', '모든 원소 저항'),
    'resistance:all': builder(['resAll', 'resChaos'], '모든 저항'),
    'resistance_penetration:elemental': builder('resPen', '원소 저항 관통'), 'resistance_penetration:all': builder('resPen', '모든 저항 관통', true),
    'resistance_penetration:fire': builder('resPen', '화염 저항 관통', true), 'resistance_penetration:cold': builder('resPen', '냉기 저항 관통', true),
    'resistance_penetration:lightning': builder('resPen', '번개 저항 관통', true), 'resistance_penetration:chaos': builder([], '카오스 저항 관통'),
    regeneration_suppression: builder('regenSuppress', '재생 억제'), minimum_damage_adjustment: builder('minDmgRoll', '최소 피해 보정'),
    maximum_damage_adjustment: builder('maxDmgRoll', '최대 피해 보정'), damage_over_time_multiplier: builder('dotPctDmg', '지속 피해 배율'),
    'damage_type:fire': builder('firePctDmg', '화염 피해'), 'damage_type:cold': builder('coldPctDmg', '냉기 피해'),
    'damage_type:lightning': builder('lightPctDmg', '번개 피해'), 'damage_type:chaos': builder('chaosPctDmg', '카오스 피해'),
    'damage_type:physical': builder('physPctDmg', '물리 피해'), 'damage_type:spell': builder('spellPctDmg', '주문 피해'),
    'damage_type:elemental': builder('elementalPctDmg', '원소 피해'),
    'damage_method:melee': builder('meleePctDmg', '근접 피해'), 'damage_method:slam': builder('slamPctDmg', '강타 피해'),
    'damage_method:projectile': builder('projectilePctDmg', '투사체 피해'), 'damage_method:area': builder('aoePctDmg', '범위 피해'),
    'damage_method:spell_inherent': builder('spellFlatPct', '주문 내장 피해'),
    'skill_gem_level:physical': builder('physGemLevel', '물리 스킬 젬 레벨'), 'skill_gem_level:fire': builder('fireGemLevel', '화염 스킬 젬 레벨'),
    'skill_gem_level:cold': builder('coldGemLevel', '냉기 스킬 젬 레벨'), 'skill_gem_level:lightning': builder('lightGemLevel', '번개 스킬 젬 레벨'),
    'skill_gem_level:chaos': builder('chaosGemLevel', '카오스 스킬 젬 레벨'), 'skill_gem_level:all': builder('gemLevel', '모든 스킬 젬 레벨'),
    'skill_gem_level:strength': builder('strGemLevel', '힘 스킬 젬 레벨'), 'skill_gem_level:dexterity': builder('dexGemLevel', '민첩 스킬 젬 레벨'),
    'skill_gem_level:intelligence': builder('intGemLevel', '지능 스킬 젬 레벨'),
    support_gem_limit: builder('suppCap', '보조 스킬 젬 한도'), additional_projectiles: builder('projectileExtraShots', '투사체 추가 발사'),
    minion_damage: builder('summonPctDmg', '소환수 피해'), minion_attack_speed: builder('summonAspd', '소환수 공격 속도'),
    minion_maximum_life: builder('summonHpPct', '소환수 최대 생명력'),
    'ailment_chance:ignite': builder('igniteChance', '점화 확률'), 'ailment_chance:chill': builder('chillChance', '냉각 확률'),
    'ailment_chance:shock': builder('shockChance', '감전 확률'), 'ailment_chance:poison': builder('poisonChance', '중독 확률'),
    'ailment_chance:bleed': builder('bleedChance', '출혈 확률'),
    'ailment_chance:all': builder(['igniteChance', 'chillChance', 'shockChance', 'poisonChance', 'bleedChance'], '모든 상태 이상 확률'),
    erosion_chance: builder([], '침식 확률'), 'ailment_max_stacks:erosion': builder([], '침식 최대 중첩 수'),
    'ailment_max_stacks:bleed': builder([], '출혈 최대 중첩 수'), 'ailment_max_stacks:poison': builder([], '중독 최대 중첩 수'),
    'ailment_damage:poison': builder('poisonDamageMultiplierPct', '중독 피해'), 'ailment_damage:bleed': builder([], '출혈 피해'),
    'ailment_magnitude:shock': builder('shockEffect', '감전 강도'), 'ailment_magnitude:ignite': builder('igniteDamageMultiplierPct', '점화 강도', true),
    'ailment_magnitude:erosion': builder([], '침식 효과'),
    'damage_against_ailment:shock': builder('shockedEnemyHitDamagePct', '감전 상태의 적에게 주는 피해'),
    'damage_against_ailment:chill': builder([], '냉각 상태의 적에게 주는 피해'), 'damage_against_ailment:ignite': builder([], '점화 상태의 적에게 주는 피해'),
    devotion: builder('devotion', '계시'), mystique: builder('mystique', '신비'), cycle: builder('cycle', '순환'), resonance: builder('runeResonancePower', '공명력')
});

function countInto(bucket, key) {
    bucket[key] = (bucket[key] || 0) + 1;
}

/** One builder option as game effects; what the game lacks or only nearly has is counted in the report. A game id passes as it is. */
function builderEffects(mod, knownStats, report) {
    const key = mod.target ? `${mod.statId}:${mod.target}` : String(mod.statId), option = BUILDER_OPTIONS[key];
    const value = Number(mod.value);
    if (!option) {
        if (knownStats.has(mod.statId)) return [{ statId: mod.statId, value }];
        countInto(report.unsupported, key);
        return [];
    }
    if (!option.to.length) countInto(report.unsupported, option.label);
    else if (option.near) (report.approximate[option.label] ||= { to: option.to, count: 0 }).count++;
    return option.to.map(statId => ({ statId, value }));
}

/** A builder node (no runtimeEffects key) gets game effects from its options; its own options stay as they were. */
function convertBuilderNode(node, knownStats, report) {
    node.runtimeEffects = (node.mods || []).flatMap(mod => builderEffects(mod, knownStats, report));
    if (!node.cat || node.cat === 'none') node.cat = deriveTag(node.runtimeEffects) || 'none';
    report.converted++;
}

/** Start nodes named after a class get that class (the game finds its roots by startClassId). */
function markClassStarts(tree, classIdByName, report) {
    tree.nodes.filter(node => node.type === 'start' && !node.startClassId && classIdByName[node.name])
        .forEach(node => { node.startClassId = classIdByName[node.name]; });
    const found = new Set(tree.nodes.map(node => node.startClassId).filter(Boolean));
    report.missingStarts = Object.entries(classIdByName).filter(([, classId]) => !found.has(classId)).map(([name]) => name);
}

/** The game knows a keystone by its node id; a keystone named like one of the game's takes that id (links and taken nodes follow). */
function adoptKeystoneIds(tree, keystoneIdByTitle, report) {
    const used = new Set(tree.nodes.map(node => String(node.id)));
    tree.nodes.filter(node => node.type === 'keystone').forEach(node => {
        const gameId = keystoneIdByTitle[node.name], id = String(node.id);
        if (!gameId) return report.unknownKeystones.push(node.name || id);
        if (gameId === id) return report.keystones.push(node.name);
        if (used.has(gameId)) return report.unknownKeystones.push(node.name);
        node.id = gameId;
        used.add(gameId);
        tree.edges.forEach(edge => {
            if (String(edge.a) === id) edge.a = gameId;
            if (String(edge.b) === id) edge.b = gameId;
        });
        if (Array.isArray(tree.allocated)) tree.allocated = tree.allocated.map(entry => (String(entry) === id ? gameId : entry));
        report.keystones.push(node.name);
    });
}

/**
 * A tree file for the editor: its own export comes back as it is; a builder file gets game effects, class starts and the game's
 * keystone ids. @returns {{ tree: object, report: object }} report: converted nodes, unsupported options ({ label: count }),
 * approximate ones ({ label: { to: game ids, count } }), classes without a start, keystones joined to the game's and the ones the
 * game does not have.
 */
function importAuthoringTree(source, options) {
    const tree = clone(source), knownStats = new Set(options.knownStatIds);
    const report = { converted: 0, unsupported: {}, approximate: {}, missingStarts: [], keystones: [], unknownKeystones: [] };
    tree.nodes.filter(node => !Array.isArray(node.runtimeEffects)).forEach(node => convertBuilderNode(node, knownStats, report));
    markClassStarts(tree, options.classIdByName, report);
    adoptKeystoneIds(tree, options.keystoneIdByTitle, report);
    return { tree, report };
}

module.exports = {
    canonicalizeMods,
    deriveTag,
    formatDescription,
    importAuthoringTree,
    normalizeAuthoringTree
};
