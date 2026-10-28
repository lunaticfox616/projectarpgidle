'use strict';

// Option half of the v23 skill tree rework (scripts/rework-passive-tree-v23.js). Every value goes through the option catalog's
// type and distance scaling (scalePassiveLine), so a rewritten node reads like the authored ones around it.

const { buildGraph, graphDistances } = require('../audit-passive-tree-source');
const { formatEffect, zoneForPosition } = require('../complete-passive-tree-options');
const { ARCHETYPE_PROFILES, CATEGORY_NOUNS, STAT_META, ZONE_ADJECTIVES, normalizePassiveValue, scalePassiveLine } =
    require('./passive-tree-option-catalog');
const { FIRST_NOTABLE_STEPS, nodeMap, startIds } = require('./passive-tree-v23-layout');

const ACTIONABLE = new Set(['minor', 'assist', 'normal', 'major']);
const SPECIAL = new Set(['mystique', 'devotion', 'cycle']);
const ATTRIBUTES = new Set(['strength', 'dexterity', 'intelligence']);
const DEFENCE = new Set(['energyShieldPct', 'evasionPct', 'energyShield', 'pctHp', 'armorPct', 'regen', 'flatHp', 'blockChance', 'resL', 'armor',
    'evasion', 'resF', 'deflectChance', 'resChaos', 'resAll', 'resC', 'summonHpPct', 'energyShieldRegen', 'dr', 'leech', 'energyShieldRechargeFaster',
    'maxResF', 'maxResL', 'maxResC', 'maxResChaos', 'takenDamageReduceWhen1EnemyPct', 'summonGuardRedirectPct', 'blockChanceMax',
    'takenDamageReduceWhen2EnemiesPct', 'physTakenAsFire', 'physTakenAsCold', 'physTakenAsLight', 'physTakenAsChaos', 'maxResAll']);
const UTILITY = new Set(['move', 'mystique', 'devotion', 'cycle', 'cooldownRecovery', 'mobilityCooldownRecovery', 'summonEfficiency',
    'targetProjectile', 'chillChance', 'chillEffect']);
/** Options whose skills the game no longer has (no channelling rune, one mine rune): they move to the nearest live option. */
const DEAD_STATS = Object.freeze({ channelingPctDmg: 'spellPctDmg', minePctDmg: 'potionPctDmg' });
const ZONE_ATTACK = Object.freeze({ archer: 'projectile', alchemist: 'potion', occultist: 'spell', cleric: 'spell', warrior: 'melee', wanderer: 'melee' });
const ZONE_DEFENCE = Object.freeze({ archer: 'evasion', wanderer: 'evasion', occultist: 'energyShield', cleric: 'energyShield', alchemist: 'energyShield', warrior: 'armor' });
/** First-five-step nodes keep their own attribute and gain one of the class's two attacks, alternating along the way out; each
 * node is named after its attack. */
const OPENING_ATTACKS = Object.freeze({ warrior: ['meleePctDmg', 'physPctDmg'], wanderer: ['meleePctDmg', 'physPctDmg'],
    archer: ['projectilePctDmg', 'physPctDmg'], alchemist: ['potionPctDmg', 'elementalPctDmg'], occultist: ['spellPctDmg', 'chaosPctDmg'],
    cleric: ['spellPctDmg', 'elementalPctDmg'] });
const OPENING_NAMES = Object.freeze({ meleePctDmg: '날 선 칼끝', physPctDmg: '무거운 일격', projectilePctDmg: '조준하는 손끝',
    potionPctDmg: '조제의 통찰', elementalPctDmg: '원소의 손끝', spellPctDmg: '주문 해석', chaosPctDmg: '심연의 속삭임' });
const OPENING_ATTACK_SHARE = 0.4;
const WEAK_POWER = 0.6;
const LIFTED_POWER = 0.85;

const roleOf = statId => (ATTRIBUTES.has(statId) ? 'T' : /GemLevel$|^gemLevel$|^suppCap$/.test(statId) ? 'P'
    : DEFENCE.has(statId) ? 'D' : UTILITY.has(statId) ? 'U' : 'A');
const effectsOf = node => (Array.isArray(node.runtimeEffects) ? node.runtimeEffects : []);
const rolesOf = node => new Set(effectsOf(node).map(effect => roleOf(effect.statId)));
const bandOf = node => Math.max(0, Math.min(4, Number(node.powerBand) || 0));

/** Per-stat value of one ordinary small line, from the catalog profiles, else the median small node in the tree. */
function buildBaseValues(tree) {
    const base = new Map();
    Object.values(ARCHETYPE_PROFILES).flat().forEach(profile => profile.lines.forEach(line => {
        if (!line.fixed) base.set(line.statId, Math.max(base.get(line.statId) || 0, line.value));
    }));
    const smalls = new Map();
    tree.nodes.filter(node => node.type === 'minor').forEach(node => effectsOf(node).forEach(effect => {
        if (!smalls.has(effect.statId)) smalls.set(effect.statId, []);
        smalls.get(effect.statId).push(Math.abs(Number(effect.value)));
    }));
    smalls.forEach((values, statId) => {
        if (base.has(statId)) return;
        const sorted = values.sort((a, b) => a - b);
        base.set(statId, sorted[Math.floor(sorted.length / 2)]);
    });
    return base;
}

/** Median value per type and stat, the yardstick for weak nodes. */
function buildMedians(tree) {
    const lists = new Map();
    tree.nodes.filter(node => ACTIONABLE.has(node.type)).forEach(node => effectsOf(node).forEach(effect => {
        const key = `${node.type}|${effect.statId}`;
        if (!lists.has(key)) lists.set(key, []);
        lists.get(key).push(Math.abs(Number(effect.value)));
    }));
    return new Map([...lists].map(([key, values]) => [key, values.sort((a, b) => a - b)[Math.floor(values.length / 2)]]));
}

function line(context, statId, type, band) {
    return scalePassiveLine({ statId, value: context.base.get(statId) || 1 }, type, band);
}

function setEffects(node, effects, profile) {
    const clean = effects.map(effect => ({ statId: effect.statId, value: normalizePassiveValue(effect.statId, effect.value) }));
    Object.assign(node, { runtimeEffects: clean, mods: clean.map(effect => ({ ...effect })), desc: clean.map(formatEffect).join('\n') });
    if (profile) node.optionProfile = profile;
}

function zoneOf(node) {
    return zoneForPosition(Number(node.x), Number(node.y));
}

/** The small node put before a lone notable: one line of the notable's own leading option at small-node size. */
function makeApproachStep(context) {
    return (notable, spot) => {
        const lead = effectsOf(notable).find(effect => roleOf(effect.statId) !== 'P' && !SPECIAL.has(effect.statId)
            && !['projectileExtraShots', 'targetProjectile'].includes(effect.statId));
        const statId = lead ? lead.statId : `${ZONE_ATTACK[zoneOf(notable)]}PctDmg`;
        const effects = [line(context, STAT_META[statId] ? statId : 'pctDmg', 'assist', bandOf(notable))];
        const special = SPECIAL.has(notable.cat) || SPECIAL.has(notable.archetype);
        const step = { cat: special ? { A: 'atk', D: 'def' }[roleOf(effects[0].statId)] || 'utility' : notable.cat, id: `pt_v23_step_${notable.id}`,
            x: spot.x, y: spot.y, type: 'assist', name: STAT_META[effects[0].statId][0], statAutoName: true,
            archetype: special ? ZONE_ATTACK[zoneOf(notable)] : notable.archetype, optionClusterId: notable.optionClusterId, powerBand: bandOf(notable) };
        setEffects(step, effects, `v23-step:${notable.id}`);
        return step;
    };
}

/** The empty ring around the three centre sockets: every class meets there, so each node gives every attribute. */
function fillCentreEmpties(tree, report) {
    tree.nodes.filter(node => node.intentionalNoEffect && ACTIONABLE.has(node.type)).forEach(node => {
        setEffects(node, [...ATTRIBUTES].map(statId => ({ statId, value: 3 })), 'v23-prism');
        Object.assign(node, { name: '모든 능력치', archetype: 'prism', cat: 'attr', statAutoName: true });
        delete node.intentionalNoEffect;
        report.centreFilled.push(String(node.id));
    });
}

/** Values off the stat's step (two poison chances of 3.5%p) snap to it like every other line. */
function roundOffStepValues(tree, report) {
    tree.nodes.forEach(node => {
        const effects = effectsOf(node);
        if (effects.every(effect => normalizePassiveValue(effect.statId, effect.value) === Number(effect.value))) return;
        setEffects(node, effects);
        report.rounded.push(String(node.id));
    });
}

function replaceDeadStats(tree, report) {
    tree.nodes.forEach(node => {
        const effects = effectsOf(node);
        if (!effects.some(effect => DEAD_STATS[effect.statId])) return;
        setEffects(node, effects.map(effect => (DEAD_STATS[effect.statId] ? { ...effect, statId: DEAD_STATS[effect.statId] } : effect)));
        if (node.archetype === 'mine') node.archetype = 'potion';
        report.deadStats.push(String(node.id));
    });
}

/** The zone's leading attack or defence line at notable size, for a notable that lost its other half. */
function zoneSecondLine(context, node, role, taken) {
    const archetype = role === 'A' ? ZONE_ATTACK[zoneOf(node)] : ZONE_DEFENCE[zoneOf(node)];
    const lines = (ARCHETYPE_PROFILES[archetype] || []).flatMap(profile => profile.lines)
        .filter(entry => !entry.fixed && roleOf(entry.statId) === role && !taken.has(entry.statId));
    return lines.length ? scalePassiveLine(lines[lines.length > 1 ? 1 : 0], 'major', bandOf(node)) : null;
}

/** The small node beside a notable that takes the half it gave up: its approach node, else a pack small next to it. */
function sideSmall(tree, node, graph, nodes) {
    const neighbors = (graph.get(String(node.id)) || []).map(id => nodes.get(id))
        .filter(other => ['minor', 'assist'].includes(other.type) && !SPECIAL.has(other.cat) && !isAttributeOnly(other));
    return neighbors.find(other => String(other.id) === `pt_v23_step_${node.id}`) || neighbors.find(other => other.type === 'assist') || null;
}

/** A notable that gives attack and defence together keeps the half its first line belongs to, made stronger; the other half moves
 * to the small node beside it at small-node size, so the area still offers both. */
function purifyMixedNotables(tree, context, report) {
    const graph = buildGraph(tree), nodes = nodeMap(tree);
    tree.nodes.filter(node => node.type === 'major' && rolesOf(node).has('A') && rolesOf(node).has('D')).forEach(node => {
        const effects = effectsOf(node), primary = roleOf(effects[0].statId) === 'D' ? 'D' : 'A', drop = primary === 'A' ? 'D' : 'A';
        // The +30% goes to the first positive line of the kept half, never to a special option or a cost line (심연의 헌신: 헌신 3, 스킬 속도 -2).
        const remaining = effects.filter(effect => roleOf(effect.statId) !== drop);
        const boosted = remaining.findIndex(effect => roleOf(effect.statId) === primary && Number(effect.value) > 0);
        const kept = remaining.map((effect, index) => (index === boosted ? { ...effect, value: Number(effect.value) * 1.3 } : effect));
        const extra = kept.length < 2 ? zoneSecondLine(context, node, primary, new Set(kept.map(effect => effect.statId))) : null;
        const given = effects.find(effect => roleOf(effect.statId) === drop), side = sideSmall(tree, node, graph, nodes);
        setEffects(node, extra ? [...kept, extra] : kept);
        if (given && side) {
            setEffects(side, [line(context, given.statId, side.type, bandOf(side))], `v23-side:${node.id}`);
            Object.assign(side, { name: STAT_META[given.statId][0], statAutoName: true });
            report.sideHalves.push(String(side.id));
        }
        report.purified.push(String(node.id));
    });
}

function nodePower(context, node) {
    const effects = effectsOf(node);
    const sum = effects.reduce((total, effect) => total + Math.abs(Number(effect.value)) / (context.medians.get(`${node.type}|${effect.statId}`) || 1), 0);
    return sum / (node.type === 'normal' || node.type === 'major' ? 2 : 1);
}

/** Notables and medium nodes far under the usual value of their own options are raised to the usual range. */
function liftWeakFeatures(tree, context, report) {
    tree.nodes.filter(node => (node.type === 'major' || node.type === 'normal') && !node.choiceGroup).forEach(node => {
        const power = nodePower(context, node);
        if (!effectsOf(node).length || power >= WEAK_POWER) return;
        const factor = Math.min(2, LIFTED_POWER / Math.max(0.1, power));
        setEffects(node, effectsOf(node).map(effect => (['projectileExtraShots', 'gemLevel', 'suppCap'].includes(effect.statId) || SPECIAL.has(effect.statId)
            ? effect : { ...effect, value: Number(effect.value) * factor })));
        report.lifted.push(String(node.id));
    });
}

/** A catalog profile led by this stat (two lines), else the stat with a plain second line of the same kind. */
function leafLines(context, node) {
    const statId = effectsOf(node)[0].statId, band = bandOf(node);
    const profile = Object.values(ARCHETYPE_PROFILES).flat().find(entry => entry.lines.length > 1 && entry.lines[0].statId === statId
        && entry.lines.every(item => !item.fixed && !item.majorOnly));
    if (profile) return { name: profile.name, effects: profile.lines.map(item => scalePassiveLine(item, 'normal', band)) };
    const second = { A: 'crit', D: 'pctHp', U: 'move' }[roleOf(statId)] || 'pctHp';
    return { name: null, effects: [line(context, statId, 'normal', band), line(context, second === statId ? 'aspd' : second, 'normal', band)] };
}

/** Small dead ends that lead nowhere become medium nodes, so walking out to them pays. */
function promoteDeadEndLeaves(tree, context, report) {
    const graph = buildGraph(tree), nodes = nodeMap(tree);
    tree.nodes.forEach(node => {
        const neighbors = graph.get(String(node.id)) || [];
        if (!['minor', 'assist'].includes(node.type) || neighbors.length !== 1 || SPECIAL.has(node.archetype) || SPECIAL.has(node.cat)) return;
        if (!effectsOf(node).length || ATTRIBUTES.has(effectsOf(node)[0].statId) || nodes.get(neighbors[0]).type === 'start') return;
        const next = leafLines(context, node);
        node.type = 'normal';
        setEffects(node, next.effects, next.name ? next.name : `v23-leaf:${effectsOf(node)[0].statId}`);
        node.name = next.name || '';
        node.statAutoName = !next.name;
        report.promotedLeaves.push(String(node.id));
    });
}

/** The attack option a feature node leads with, or null when it leads with something else. */
function leadAttackStat(node) {
    const lead = effectsOf(node).find(effect => roleOf(effect.statId) === 'A' && !['projectileExtraShots', 'targetProjectile'].includes(effect.statId));
    return lead && roleOf(effectsOf(node)[0].statId) === 'A' ? lead.statId : null;
}

/** A defence-only path node right before an attack notable or medium node takes that node's attack, so the walk in reads as one theme. */
function themeAttackDoorways(tree, context, report) {
    const graph = buildGraph(tree), nodes = nodeMap(tree);
    tree.nodes.filter(node => node.type === 'minor' && isDefenceOnly(node) && !SPECIAL.has(node.cat)).forEach(node => {
        const feature = (graph.get(String(node.id)) || []).map(id => nodes.get(id))
            .find(other => ['major', 'normal'].includes(other.type) && leadAttackStat(other));
        if (!feature || !STAT_META[leadAttackStat(feature)]) return;
        const statId = leadAttackStat(feature);
        setEffects(node, [line(context, statId, 'minor', bandOf(node))], `v23-doorway:${feature.id}`);
        Object.assign(node, { name: STAT_META[statId][0], statAutoName: true, archetype: feature.archetype, cat: feature.cat });
        report.doorways.push(String(node.id));
    });
}

/** Sum of option size by role, each line measured in ordinary small lines (the yardstick for how much defence moved). */
function roleUnits(tree, context) {
    const units = { A: 0, D: 0, U: 0, T: 0, P: 0 };
    tree.nodes.filter(node => ACTIONABLE.has(node.type)).forEach(node => effectsOf(node).forEach(effect => {
        units[roleOf(effect.statId)] += Math.abs(Number(effect.value)) / (context.base.get(effect.statId) || Math.abs(Number(effect.value)) || 1);
    }));
    return Object.fromEntries(Object.entries(units).map(([role, value]) => [role, Math.round(value)]));
}

function singleSourceDistances(tree, startId) {
    return graphDistances(buildGraph(tree), [startId]);
}

/** Nodes one to five steps from a class start, inside that class's zone. */
function openingNodes(tree, start) {
    const distances = singleSourceDistances(tree, String(start.id));
    return tree.nodes.filter(node => ACTIONABLE.has(node.type) && distances.has(String(node.id))
        && distances.get(String(node.id)) <= FIRST_NOTABLE_STEPS && zoneOf(node) === start.startClassId)
        .sort((a, b) => distances.get(String(a.id)) - distances.get(String(b.id)) || String(a.id).localeCompare(String(b.id)));
}

const isAttributeOnly = node => effectsOf(node).length > 0 && effectsOf(node).every(effect => ATTRIBUTES.has(effect.statId));
const isDefenceOnly = node => effectsOf(node).length > 0 && [...rolesOf(node)].every(role => role === 'D');

/** The first five steps of each class hold at least 40% attack: attribute nodes keep their attribute and add the class attack. */
function strengthenOpenings(tree, context, report) {
    tree.nodes.filter(node => node.type === 'start').forEach(start => {
        const zone = start.startClassId, attacks = OPENING_ATTACKS[zone];
        const nodes = openingNodes(tree, start), small = node => node.type === 'minor' || node.type === 'assist';
        const needed = () => Math.ceil(nodes.length * OPENING_ATTACK_SHARE) - nodes.filter(node => rolesOf(node).has('A')).length;
        const candidates = [...nodes.filter(node => small(node) && isAttributeOnly(node)), ...nodes.filter(node => small(node) && isDefenceOnly(node))];
        candidates.forEach((node, index) => {
            if (needed() <= 0) return;
            const attribute = isAttributeOnly(node) ? effectsOf(node)[0].statId : null, attackStat = attacks[index % attacks.length];
            const attack = line(context, attackStat, node.type, bandOf(node));
            setEffects(node, attribute ? [{ statId: attribute, value: 5 }, attack] : [attack], `v23-opening:${zone}`);
            Object.assign(node, { name: attribute ? OPENING_NAMES[attackStat] : STAT_META[attackStat][0], statAutoName: !attribute,
                archetype: attribute ? node.archetype : ZONE_ATTACK[zone] });
            report.openings.push(String(node.id));
        });
    });
}

function claimNotableName(tree, node, archetype) {
    const used = new Set(tree.nodes.filter(entry => entry.type === 'major').map(entry => entry.name));
    const adjectives = ZONE_ADJECTIVES[zoneOf(node)], nouns = CATEGORY_NOUNS[archetype] || CATEGORY_NOUNS.melee;
    for (const noun of nouns) for (const adjective of adjectives) if (!used.has(`${adjective} ${noun}`)) return `${adjective} ${noun}`;
    return `${adjectives[0]} ${nouns[0]}`;
}

function nearestNotableSteps(tree, start) {
    const distances = singleSourceDistances(tree, String(start.id));
    const steps = tree.nodes.filter(node => node.type === 'major' && distances.has(String(node.id)) && rolesOf(node).has('A'))
        .map(node => distances.get(String(node.id)));
    return { distances, steps: steps.length ? Math.min(...steps) : Infinity };
}

/** Every class reaches an attack notable within five points: the best medium or small node at five steps becomes one. */
function ensureFirstNotable(tree, context, report) {
    tree.nodes.filter(node => node.type === 'start').forEach(start => {
        const { distances, steps } = nearestNotableSteps(tree, start);
        if (steps <= FIRST_NOTABLE_STEPS) return;
        const pick = tree.nodes.filter(node => ['normal', 'assist', 'minor'].includes(node.type) && distances.get(String(node.id)) === FIRST_NOTABLE_STEPS
            && zoneOf(node) === start.startClassId && !SPECIAL.has(node.archetype))
            .sort((a, b) => ({ normal: 0, assist: 1, minor: 2 }[a.type] - { normal: 0, assist: 1, minor: 2 }[b.type]) || String(a.id).localeCompare(String(b.id)))[0];
        if (!pick) return report.firstNotableMissing.push(start.startClassId);
        const archetype = ZONE_ATTACK[start.startClassId], profile = ARCHETYPE_PROFILES[archetype][0];
        pick.type = 'major';
        setEffects(pick, profile.lines.filter(item => !item.majorOnly).map(item => scalePassiveLine(item, 'major', bandOf(pick))), profile.name);
        Object.assign(pick, { archetype, cat: archetype, statAutoName: false, name: claimNotableName(tree, pick, archetype) });
        report.firstNotables.push({ classId: start.startClassId, id: String(pick.id) });
    });
}

/** Distance from the nearest class start and the value band drawn from it (validate-passive-tree-options contract). */
function refreshDistances(tree) {
    const distances = graphDistances(buildGraph(tree), startIds(tree));
    tree.nodes.filter(node => ACTIONABLE.has(node.type)).forEach(node => {
        if (!distances.has(String(node.id))) return;
        node.distanceFromClassStart = distances.get(String(node.id));
        node.powerBand = Math.min(4, Math.floor(node.distanceFromClassStart / 7));
    });
}

/** Role shares (a node with two roles counts in both), the yardstick the report compares before and after. */
function roleShares(tree) {
    const nodes = tree.nodes.filter(node => ACTIONABLE.has(node.type) && effectsOf(node).length && ![...rolesOf(node)].every(role => role === 'T'));
    const count = role => nodes.filter(node => rolesOf(node).has(role)).length;
    const pct = value => Math.round(value / Math.max(1, nodes.length) * 1000) / 10;
    return { functional: nodes.length, A: pct(count('A')), D: pct(count('D')), U: pct(count('U')),
        mixedNotables: tree.nodes.filter(node => node.type === 'major' && rolesOf(node).has('A') && rolesOf(node).has('D')).length };
}

function openingShares(tree) {
    return Object.fromEntries(tree.nodes.filter(node => node.type === 'start').map(start => {
        const nodes = openingNodes(tree, start);
        return [start.startClassId, { nodes: nodes.length, attack: nodes.filter(node => rolesOf(node).has('A')).length,
            firstAttackNotable: nearestNotableSteps(tree, start).steps }];
    }));
}

function createContext(tree) {
    return { base: buildBaseValues(tree), medians: buildMedians(tree) };
}

module.exports = {
    LIFTED_POWER, SPECIAL, WEAK_POWER, ZONE_ATTACK, ZONE_DEFENCE, bandOf, nodePower, claimNotableName, createContext, effectsOf, ensureFirstNotable, fillCentreEmpties, isAttributeOnly,
    liftWeakFeatures, line, makeApproachStep, openingShares, promoteDeadEndLeaves, purifyMixedNotables, refreshDistances, replaceDeadStats,
    roleOf, roleShares, roleUnits, roundOffStepValues, setEffects, strengthenOpenings, themeAttackDoorways, zoneOf
};
