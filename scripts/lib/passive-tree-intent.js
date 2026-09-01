'use strict';

const CENTRAL_VOID_NO_EFFECT_NODE_IDS = Object.freeze([
    'nr79xrtmmci', 'njbfdp8mmye', 'n3bgwn6mnew', 'nfaxnztmrbg', 'nuup41gnf95',
    'n369bjmnxqs', 'npm8n1xnxqs', 'nrqghtvnxqs', 'n5sr1isnxqs', 'n5z3jnunxqs',
    'nxc3anuoz0y', 'nfu7n87oz0y', 'nlx18f4oz0y', 'n5nsyr9oz0y', 'ndnd5k0oz0y'
]);
const AUTHORED_MAJOR_NODE_IDS = Object.freeze([
    'expansion_archer_longbow_17',
    'expansion_archer_crossbow_15',
    'v13_balance_archer_quiver_04'
]);
const CENTRAL_VOID_NO_EFFECT_NODE_ID_SET = new Set(CENTRAL_VOID_NO_EFFECT_NODE_IDS);
const AUTHORED_MAJOR_NODE_ID_SET = new Set(AUTHORED_MAJOR_NODE_IDS);

function isIntentionalNoEffectNode(node) {
    return Boolean(node?.intentionalNoEffect)
        || CENTRAL_VOID_NO_EFFECT_NODE_ID_SET.has(String(node?.id));
}

function isAuthoredMajorNode(node) {
    if (!node || node.type !== 'major' || node.topologyRethemed) return false;
    return AUTHORED_MAJOR_NODE_ID_SET.has(String(node.id))
        || String(node.optionProfile || '').startsWith('authored:');
}

function isPreservedMajorNode(node) {
    return Boolean(node && node.type === 'major' && !node.topologyRethemed);
}

function hasNoEffects(node) {
    return Array.isArray(node?.mods) && node.mods.length === 0
        && Array.isArray(node?.runtimeEffects) && node.runtimeEffects.length === 0;
}

module.exports = {
    AUTHORED_MAJOR_NODE_IDS,
    AUTHORED_MAJOR_NODE_ID_SET,
    CENTRAL_VOID_NO_EFFECT_NODE_IDS,
    hasNoEffects,
    isAuthoredMajorNode,
    isPreservedMajorNode,
    isIntentionalNoEffectNode
};
