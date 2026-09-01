'use strict';

const { FEATURE_EFFECT_PROFILES } = require('./passive-tree-feature-catalog');
const { STAT_META } = require('./passive-tree-option-catalog');

const SIMPLE_NAME_OVERRIDES = Object.freeze({
    regen: '생명력 재생',
    devotion: '계시'
});

const PLAIN_PASSIVE_NAMES = new Set([
    ...Object.values(STAT_META).map(meta => meta[0]),
    ...Object.values(SIMPLE_NAME_OVERRIDES),
    '모든 능력치'
]);

function simpleEffectName(effect) {
    if (!effect || !effect.statId) return '';
    return SIMPLE_NAME_OVERRIDES[effect.statId] || STAT_META[effect.statId]?.[0] || String(effect.statId);
}

function featureProfileName(node) {
    const match = /^feature:(.+)$/.exec(String(node.optionProfile || ''));
    if (!match) return '';
    const profiles = FEATURE_EFFECT_PROFILES[node.effectArchetype || node.archetype]?.[node.type] || [];
    return profiles.find(profile => profile.id === match[1])?.name || '';
}

function isAllAttributes(effects) {
    const ids = effects.map(effect => effect.statId).sort();
    return ids.length === 3 && ids.join(',') === 'dexterity,intelligence,strength';
}

function distinctivePassiveName(node, effects) {
    if (isAllAttributes(effects)) return '삼위의 조화';
    const featureName = featureProfileName(node);
    if (featureName) return featureName;
    const currentName = String(node.name || '').trim();
    if (currentName && !PLAIN_PASSIVE_NAMES.has(currentName)) return currentName;
    const specialProfile = ['mystique', 'devotion', 'cycle'].includes(node.archetype)
        ? String(node.optionProfile || '').replace(/^authored:/, '') : '';
    if (specialProfile && !specialProfile.startsWith('feature:') && !PLAIN_PASSIVE_NAMES.has(specialProfile)) {
        return specialProfile;
    }
    return `${simpleEffectName(effects[0])}의 정수`;
}

function resolvePassiveNodeName(node) {
    const effects = Array.isArray(node.runtimeEffects) ? node.runtimeEffects : [];
    if (effects.length === 0) return node.name || null;
    const simpleTier = ['minor', 'assist'].includes(node.type);
    if (simpleTier && effects.length === 1) return simpleEffectName(effects[0]);
    if (simpleTier && isAllAttributes(effects)) return '모든 능력치';
    return distinctivePassiveName(node, effects);
}

module.exports = { resolvePassiveNodeName, simpleEffectName };
