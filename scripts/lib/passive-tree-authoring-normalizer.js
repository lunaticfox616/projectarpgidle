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
    energyShieldPct: 'def', blockChance: 'def', deflectChance: 'def', maxResAll: 'def', resAll: 'def',
    takenDamageReduceWhen1EnemyPct: 'def', summonGuardRedirectPct: 'spell',
    meleePctDmg: 'physical', physPctDmg: 'physical', shieldPctDmg: 'physical',
    slamPctDmg: 'physical', slamEchoChance: 'physical', bleedChance: 'physical',
    projectilePctDmg: 'atk', targetProjectile: 'atk', projectileExtraShots: 'atk', accuracy: 'atk',
    pctDmg: 'atk', minDmgRoll: 'atk', maxDmgRoll: 'atk', aspd: 'atk', crit: 'atk', critDmg: 'atk',
    mobilityPctDmg: 'atk', aoePctDmg: 'atk', minePctDmg: 'atk',
    spellPctDmg: 'spell', channelingPctDmg: 'spell', suppCap: 'spell',
    spellFlatDmg: 'spell', summonPctDmg: 'spell', summonResPen: 'spell', summonEfficiency: 'spell',
    summonHpPct: 'spell', summonGemLevel: 'spell',
    firePctDmg: 'fire', igniteChance: 'fire', coldPctDmg: 'cold', lightPctDmg: 'lightning',
    elementalPctDmg: 'elemental', resPen: 'elemental', chaosPctDmg: 'chaos',
    poisonChance: 'ailment', poisonDamageMultiplierPct: 'ailment', ailmentDamagePct: 'ailment',
    ailmentPotencyPct: 'ailment', freezeChance: 'cold',
    dotPctDmg: 'ailment', potionPctDmg: 'atk', move: 'dex',
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

module.exports = {
    canonicalizeMods,
    deriveTag,
    formatDescription,
    normalizeAuthoringTree
};
