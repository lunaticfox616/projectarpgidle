#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildGraph, graphDistances, isIntendedSpecial, normalizedAngle, readTree } =
    require('./audit-passive-tree-source');
const { ARCHETYPE_PROFILES, CATEGORY_NOUNS, STAT_META, ZONE_ADJECTIVES, ZONE_PALETTES, normalizePassiveValue,
    scalePassiveLine } =
    require('./lib/passive-tree-option-catalog');
const { clusterThemePlan, ensureBundleFeatures } = require('./lib/passive-tree-clusters');

const ACTIONABLE_TYPES = new Set(['minor', 'assist', 'normal', 'major']);
const STRUCTURAL_TYPES = new Set(['start', 'void', 'keystone', 'quatrefoil']);
const CLASS_ID_BY_NAME = Object.freeze({
    '비술사': 'occultist', '방랑자': 'wanderer', '성직자': 'cleric',
    '궁수': 'archer', '연금술사': 'alchemist', '전사': 'warrior'
});
const ZONE_LABELS = Object.freeze({
    archer: '궁수', alchemist: '연금술사', occultist: '비술사',
    cleric: '성직자', warrior: '전사', wanderer: '방랑자'
});
const DIRECT_CATEGORY_MAP = Object.freeze({
    str: 'strength', dex: 'dexterity', int: 'intelligence', physical: 'physical',
    spell: 'spell', chaos: 'chaos', fire: 'fire', cold: 'cold', lightning: 'lightning', ailment: 'ailment'
});
const PRESERVED_PREFIX = /^(completion_|expansion_|v13_balance_)/;

function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stableHash(value) {
    let hash = 2166136261;
    for (const char of String(value)) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function zoneForPosition(x, y) {
    const angle = Math.round(normalizedAngle({ x, y }) * 1e6) / 1e6;
    if (angle < 60) return 'cleric';
    if (angle < 120) return 'warrior';
    if (angle < 180) return 'wanderer';
    if (angle < 240) return 'archer';
    if (angle < 300) return 'alchemist';
    return 'occultist';
}

function motifArchetype(node) {
    const id = String(node.id);
    if (/archer_(longbow|crossbow|arrow|reticle|quiver)/.test(id)) return 'projectile';
    if (/wanderer_dagger/.test(id)) return 'melee';
    if (/alchemist_flask/.test(id)) return 'potion';
    if (/occult_grimoire/.test(id)) return 'spell';
    if (/occult_ritual/.test(id)) return 'chaos';
    if (/cycle_infinity/.test(id) && isIntendedSpecial(node)) return 'cycle';
    if (/dimensional_prism/.test(id) && isIntendedSpecial(node)) return 'devotion';
    return null;
}

function zoneDefenseArchetype(zone) {
    if (zone === 'archer' || zone === 'wanderer') return 'evasion';
    if (zone === 'occultist' || zone === 'cleric') return 'energyShield';
    return 'armor';
}

function zoneAttackArchetype(zone) {
    if (zone === 'archer') return 'projectile';
    if (zone === 'alchemist') return 'potion';
    if (zone === 'occultist' || zone === 'cleric') return 'spell';
    return 'melee';
}

function chooseArchetype(node) {
    if (isIntendedSpecial(node)) return node.cat;
    const motif = motifArchetype(node);
    if (motif) return motif;
    const zone = zoneForPosition(node.x, node.y);
    if (node.cat === 'atk') return zoneAttackArchetype(zone);
    if (node.cat === 'def') return zoneDefenseArchetype(zone);
    if (DIRECT_CATEGORY_MAP[node.cat]) return DIRECT_CATEGORY_MAP[node.cat];
    const palette = ZONE_PALETTES[zone];
    return palette[stableHash(`${node.id}:${node.cat}`) % palette.length];
}

function clusterThemeAllowed(node, archetype) {
    if (!['mystique', 'devotion', 'cycle'].includes(archetype)) return true;
    return isIntendedSpecial({ ...node, cat: archetype });
}

function legacyTargetStat(mod) {
    const damage = { physical: 'physPctDmg', spell: 'spellPctDmg', chaos: 'chaosPctDmg', fire: 'firePctDmg',
        cold: 'coldPctDmg', lightning: 'lightPctDmg', elemental: 'elementalPctDmg' };
    const method = { melee: 'meleePctDmg', projectile: 'projectilePctDmg', area: 'aoePctDmg' };
    const ailment = { bleed: 'bleedChance', poison: 'poisonChance', ignite: 'igniteChance', chill: 'chillChance', shock: 'shockChance' };
    if (mod.statId === 'attribute') return mod.target;
    if (mod.statId === 'damage_type') return damage[mod.target];
    if (mod.statId === 'damage_method') return method[mod.target];
    if (mod.statId === 'ailment_chance') return ailment[mod.target] || 'igniteChance';
    return null;
}

function legacyDirectStat(statId) {
    return ({ attack_power: 'flatDmg', attack_speed: 'aspd', movement_speed: 'move', maximum_life: 'pctHp',
        maximum_life_flat: 'flatHp', life_regeneration: 'regen', life_leech: 'leech', armour: 'armorPct',
        armour_flat: 'armor', evasion: 'evasionPct', block_chance: 'blockChance', damage_over_time_multiplier: 'dotPctDmg',
        physical_damage_reduction_ignore: 'physIgnore', physical_damage_reduction: 'dr', additional_projectiles: 'projectileExtraShots',
        mystique: 'mystique', devotion: 'devotion', cycle: 'cycle' })[statId] || statId;
}

function convertLegacyEffects(node) {
    return (Array.isArray(node.mods) ? node.mods : [node.mods]).filter(Boolean).map(mod => ({
        statId: legacyTargetStat(mod) || legacyDirectStat(mod.statId), value: Number(mod.value)
    })).filter(mod => STAT_META[mod.statId] && Number.isFinite(mod.value));
}

function hasMeaningfulVerticalOption(node) {
    if (node.type !== 'major' || Math.abs(Number(node.x) || 0) > 750 || Math.abs(Number(node.y) || 0) < 1200) return false;
    const mods = Array.isArray(node.mods) ? node.mods : [node.mods].filter(Boolean);
    return mods.length >= 2 && mods.some(mod => Number(mod.value) < 0 || ['additional_projectiles', 'life_leech'].includes(mod.statId));
}

function shouldPreserveAuthoredOption(node) {
    if (!ACTIONABLE_TYPES.has(node.type) || !Array.isArray(node.mods) && !node.mods) return false;
    if (['mystique', 'devotion', 'cycle'].includes(node.cat) && !isIntendedSpecial(node)) return false;
    return PRESERVED_PREFIX.test(String(node.id)) || hasMeaningfulVerticalOption(node);
}

function scaledEffects(profile, node, distance) {
    const band = Math.min(4, Math.floor(Math.max(0, distance) / 7));
    let lines = profile.lines.filter(line => !line.majorOnly || node.type === 'major');
    const lineLimit = node.type === 'major' ? 3 : (node.type === 'normal' ? 2 : 1);
    lines = lines.slice(0, lineLimit);
    return lines.map(line => scalePassiveLine(line, node.type, band));
}

function formatEffect(effect) {
    const meta = STAT_META[effect.statId] || [effect.statId, ''];
    const value = Number(effect.value), sign = value >= 0 ? '+' : '';
    return `${meta[0]} ${sign}${value}${meta[1]}`;
}

function claimMajorName(node, archetype, profile, usedNames) {
    const zone = zoneForPosition(node.x, node.y), adjectives = ZONE_ADJECTIVES[zone], nouns = CATEGORY_NOUNS[archetype];
    const seed = stableHash(`${node.id}:${archetype}`);
    for (let offset = 0; offset < adjectives.length * nouns.length; offset += 1) {
        const index = (seed + offset) % (adjectives.length * nouns.length);
        const name = `${adjectives[index % adjectives.length]} ${nouns[Math.floor(index / adjectives.length)]}`;
        if (usedNames.has(name)) continue;
        usedNames.add(name);
        return name;
    }
    const fallback = `${profile.name} · ${String(node.id).slice(-4)}`;
    usedNames.add(fallback);
    return fallback;
}

function profileUsage(usageByCluster, clusterId) {
    if (!usageByCluster.has(clusterId)) usageByCluster.set(clusterId, new Map());
    return usageByCluster.get(clusterId);
}

function selectProfile(node, archetype, graph, assignedProfiles, usage) {
    const profiles = ARCHETYPE_PROFILES[archetype], start = stableHash(`${node.id}:${archetype}`) % profiles.length;
    const neighborProfiles = new Set((graph.get(String(node.id)) || []).map(id => assignedProfiles.get(id)).filter(Boolean));
    return profiles.map((profile, offset) => ({ profile, offset, used: usage.get(profile.name) || 0 }))
        .sort((a, b) => Number(neighborProfiles.has(a.profile.name)) - Number(neighborProfiles.has(b.profile.name)) || a.used - b.used
            || (a.offset - start + profiles.length) % profiles.length - (b.offset - start + profiles.length) % profiles.length)[0].profile;
}

function preserveAuthoredNode(node, archetype, distance, clusterId, report) {
    if (!shouldPreserveAuthoredOption(node) || chooseArchetype(node) !== archetype) return false;
    const effects = convertLegacyEffects(node).map(effect => ({
        ...effect, value: normalizePassiveValue(effect.statId, effect.value)
    }));
    if (effects.length === 0) return false;
    Object.assign(node, { archetype, cat: archetype, runtimeEffects: effects, mods: effects.map(effect => ({ ...effect })),
        desc: effects.map(formatEffect).join('\n'), optionProfile: `authored:${node.name}`, optionClusterId: clusterId,
        distanceFromClassStart: distance, powerBand: Math.min(4, Math.floor(distance / 7)) });
    report.preservedAuthored += 1;
    return true;
}

function assignActionableNodes(tree, graph, distances, report, plan) {
    const assignedProfiles = new Map(), usedNames = new Set(), usageByCluster = new Map();
    const nodes = tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)).sort((a, b) =>
        (distances.get(String(a.id)) || 0) - (distances.get(String(b.id)) || 0) || String(a.id).localeCompare(String(b.id)));
    nodes.forEach(node => {
        const id = String(node.id), archetype = plan.themes.get(id) || chooseArchetype(node);
        const distance = distances.get(id) || 0, clusterId = plan.clusterIds.get(id) || `node:${id}`;
        const usage = profileUsage(usageByCluster, clusterId);
        if (preserveAuthoredNode(node, archetype, distance, clusterId, report)) {
            assignedProfiles.set(id, node.optionProfile);
            usage.set(node.optionProfile, (usage.get(node.optionProfile) || 0) + 1);
            return;
        }
        const profile = selectProfile(node, archetype, graph, assignedProfiles, usage);
        const effects = scaledEffects(profile, node, distance);
        assignedProfiles.set(id, profile.name);
        usage.set(profile.name, (usage.get(profile.name) || 0) + 1);
        Object.assign(node, { cat: archetype, archetype, optionProfile: profile.name, runtimeEffects: effects, mods: effects,
            optionClusterId: clusterId, desc: effects.map(formatEffect).join('\n'), statAutoName: node.type !== 'major',
            distanceFromClassStart: distance, powerBand: Math.min(4, Math.floor(distance / 7)) });
        node.name = node.type === 'major' ? claimMajorName(node, archetype, profile, usedNames) : profile.name;
        report.reassigned += 1;
        report.byArchetype[archetype] = (report.byArchetype[archetype] || 0) + 1;
        report.byType[node.type] = (report.byType[node.type] || 0) + 1;
    });
}

function ensureRequiredBuildOptions(tree) {
    const requirements = [
        { statId: 'chaosGemLevel', archetype: 'chaos', label: '카오스 스킬 젬 레벨' },
        { statId: 'suppCap', archetype: 'spell', label: '보조 스킬 젬 한도' }
    ];
    const used = new Set();
    requirements.forEach(requirement => {
        if (tree.nodes.some(node => (node.runtimeEffects || []).some(effect => effect.statId === requirement.statId))) return;
        const target = tree.nodes.filter(node => node.type === 'major' && node.archetype === requirement.archetype
            && !used.has(String(node.id)) && (node.runtimeEffects || []).length < 3)
            .sort((a, b) => Number(b.distanceFromClassStart || 0) - Number(a.distanceFromClassStart || 0))[0];
        if (!target) throw new Error(`${requirement.label}을 배치할 주요 노드가 없습니다.`);
        const effect = { statId: requirement.statId, value: 1 };
        target.runtimeEffects.push(effect);
        target.mods = target.runtimeEffects.map(row => ({ ...row }));
        target.desc = target.runtimeEffects.map(formatEffect).join('\n');
        used.add(String(target.id));
    });
}

function configureStartAndVoidNodes(tree) {
    tree.nodes.forEach(node => {
        if (node.type === 'start') Object.assign(node, { startClassId: CLASS_ID_BY_NAME[node.name], desc: `${node.name} 패시브 시작점`,
            cat: 'none', mods: [], runtimeEffects: [], statAutoName: false });
        if (node.type === 'void') Object.assign(node, { cat: 'none', mods: [], runtimeEffects: [], statAutoName: false });
    });
}

function configureStarWedgeSockets(tree, report) {
    tree.nodes.filter(node => node.type === 'quatrefoil').forEach(node => {
        const center = Math.hypot(Number(node.x) || 0, Number(node.y) || 0) < 500;
        const zone = zoneForPosition(node.x, node.y);
        Object.assign(node, { starWedgeMode: center ? 'mutation' : 'constellation', cat: 'none', mods: [], runtimeEffects: [],
            desc: center ? '별쐐기를 장착하면 원형 범위 안의 기존 패시브 효과가 별쐐기 옵션으로 변성됩니다.'
                : '별쐐기를 장착하면 별쐐기 옵션을 가진 투자 가능한 패시브가 새로 나타납니다.', statAutoName: false });
        if (!center) node.name = `${ZONE_LABELS[zone]}의 외곽 성률`;
        report.starWedgeModes[center ? 'mutation' : 'constellation'] += 1;
    });
}

function configureKeystones(tree, report) {
    const byName = new Map(tree.nodes.filter(node => node.type === 'keystone').map(node => [node.name, node]));
    const wisdom = byName.get('지혜의 도약'), covenant = byName.get('헌신의 서약');
    tree.nodes.filter(node => node.type === 'keystone').forEach(node => Object.assign(node, {
        mods: [], runtimeEffects: [], statAutoName: false, keystoneEffectId: `keystone:${node.id}`
    }));
    const ashura = byName.get('아슈라');
    if (ashura) ashura.desc = '피격된 피해 속성에 대응하는 상태 이상 유발 확률이 순환 1당 1%p 증가합니다.\n'
        + '대응 상태 이상이 이미 지속 중이면, 남은 지속시간 1초와 순환 1당 해당 속성으로 받는 피해가 0.1% 감폭됩니다(최대 50%).\n'
        + '대응 상태 이상을 유발한 최초 피해에는 이 피해 감폭이 적용되지 않습니다.';
    if (wisdom) wisdom.choiceGroup = { id: 'wisdom_leap_element', defaultChoice: 'fire', options: ['fire', 'cold', 'lightning', 'chaos'] };
    if (!covenant) return;
    tree.nodes.forEach(node => {
        if (String(node.hiddenByKeystoneId || '') === String(covenant.id)) delete node.hiddenByKeystoneId;
    });
    covenant.hiddenRouteNodeIds = [];
    report.hiddenRouteNodes = 0;
}

function removeOverlappingIsolatedNodes(tree, report) {
    let graph = buildGraph(tree), removed = new Set();
    tree.nodes.forEach(node => {
        if ((graph.get(String(node.id)) || []).length !== 0) return;
        const duplicate = tree.nodes.find(other => other !== node && Number(other.x) === Number(node.x) && Number(other.y) === Number(node.y));
        if (duplicate) removed.add(String(node.id));
    });
    if (removed.size === 0) return;
    tree.nodes = tree.nodes.filter(node => !removed.has(String(node.id)));
    tree.edges = tree.edges.filter(edge => !removed.has(String(edge.a)) && !removed.has(String(edge.b)));
    report.removedOverlaps = [...removed];
}

function separateConnectedCoordinateDuplicates(tree, report) {
    const graph = buildGraph(tree), occupied = new Set(tree.nodes.map(node => `${node.x}:${node.y}`));
    const groups = new Map();
    tree.nodes.forEach(node => {
        const key = `${node.x}:${node.y}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(node);
    });
    groups.forEach(nodes => {
        if (nodes.length < 2) return;
        nodes.sort((a, b) => ({ major: 0, keystone: 1, normal: 2, assist: 3, minor: 4 }[a.type] ?? 9)
            - ({ major: 0, keystone: 1, normal: 2, assist: 3, minor: 4 }[b.type] ?? 9));
        nodes.slice(1).forEach(node => {
            const neighbor = (graph.get(String(node.id)) || []).map(id => tree.nodes.find(entry => String(entry.id) === id)).find(Boolean);
            const dx = neighbor ? node.x - neighbor.x : 1, dy = neighbor ? node.y - neighbor.y : 0;
            const length = Math.max(1, Math.hypot(dx, dy));
            let distance = 60, nextX, nextY, key;
            do {
                nextX = Math.round((node.x + dx / length * distance) * 100) / 100;
                nextY = Math.round((node.y + dy / length * distance) * 100) / 100;
                key = `${nextX}:${nextY}`;
                distance += 20;
            } while (occupied.has(key));
            occupied.add(key);
            report.repositionedDuplicates.push({ id: String(node.id), from: { x: node.x, y: node.y }, to: { x: nextX, y: nextY } });
            node.x = nextX;
            node.y = nextY;
        });
    });
}

function connectDisconnectedNodes(tree, report) {
    const graph = buildGraph(tree), starts = tree.nodes.filter(node => node.type === 'start').map(node => String(node.id));
    const reached = graphDistances(graph, starts), disconnected = tree.nodes.filter(node => !reached.has(String(node.id)));
    disconnected.forEach(node => {
        const nearest = tree.nodes.filter(other => reached.has(String(other.id)) && String(other.id) !== String(node.id))
            .sort((a, b) => Math.hypot(a.x - node.x, a.y - node.y) - Math.hypot(b.x - node.x, b.y - node.y))[0];
        if (!nearest) throw new Error(`연결할 수 없는 고립 노드입니다: ${node.id}`);
        tree.edges.push({ a: String(node.id), b: String(nearest.id) });
        report.addedEdges.push({ a: String(node.id), b: String(nearest.id) });
    });
}

function createReport(sourceFile, tree) {
    return { source: path.resolve(sourceFile), nodesBefore: tree.nodes.length, edgesBefore: tree.edges.length,
        nodes: 0, edges: 0, reassigned: 0, preservedAuthored: 0, byArchetype: {}, byType: {},
        correctedSpecialAssignments: 0, starWedgeModes: { mutation: 0, constellation: 0 }, hiddenRouteNodes: 0,
        removedOverlaps: [], repositionedDuplicates: [], addedEdges: [], promotedClusterNodes: [] };
}

function assertCompleted(tree) {
    const graph = buildGraph(tree), starts = tree.nodes.filter(node => node.type === 'start');
    if (starts.length !== 6 || starts.some(node => !node.startClassId || node.runtimeEffects.length !== 0)) throw new Error('6직업 시작점 계약이 올바르지 않습니다.');
    if (tree.nodes.some(node => node.type === 'void' && node.runtimeEffects.length !== 0)) throw new Error('공허 노드에 고정 효과가 있습니다.');
    const sockets = tree.nodes.filter(node => node.type === 'quatrefoil');
    if (sockets.filter(node => node.starWedgeMode === 'mutation').length !== 3
        || sockets.filter(node => node.starWedgeMode === 'constellation').length !== 6) throw new Error('성률 중앙/외곽 구성이 올바르지 않습니다.');
    tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)).forEach(node => {
        if (!Array.isArray(node.runtimeEffects) || node.runtimeEffects.length === 0) throw new Error(`효과가 없는 노드: ${node.id}`);
        node.runtimeEffects.forEach(effect => { if (!STAT_META[effect.statId]) throw new Error(`지원하지 않는 효과: ${node.id}/${effect.statId}`); });
        if (['mystique', 'devotion', 'cycle'].includes(node.cat) && !isIntendedSpecial(node)) throw new Error(`특수 스탯 구역 이탈: ${node.id}/${node.cat}`);
    });
    const reached = graphDistances(graph, starts.map(node => String(node.id)));
    if (reached.size !== tree.nodes.length) throw new Error(`고립 노드가 ${tree.nodes.length - reached.size}개 남았습니다.`);
}

function completeTreeData(source, sourceLabel) {
    const tree = JSON.parse(JSON.stringify(source)), report = createReport(sourceLabel, tree);
    if (!Array.isArray(tree.nodes) || !Array.isArray(tree.edges)) throw new Error('패시브 트리 nodes/edges 배열이 필요합니다.');
    removeOverlappingIsolatedNodes(tree, report);
    separateConnectedCoordinateDuplicates(tree, report);
    connectDisconnectedNodes(tree, report);
    ensureBundleFeatures(tree, report);
    configureStartAndVoidNodes(tree);
    configureStarWedgeSockets(tree, report);
    const graph = buildGraph(tree), starts = tree.nodes.filter(node => node.type === 'start').map(node => String(node.id));
    const distances = graphDistances(graph, starts);
    report.correctedSpecialAssignments = tree.nodes.filter(node => ['mystique', 'devotion', 'cycle'].includes(node.cat) && !isIntendedSpecial(node)).length;
    const clusterPlan = clusterThemePlan(tree, chooseArchetype, clusterThemeAllowed);
    assignActionableNodes(tree, graph, distances, report, clusterPlan);
    ensureRequiredBuildOptions(tree);
    configureKeystones(tree, report);
    tree.statsSchemaVersion = 6;
    report.nodes = tree.nodes.length;
    report.edges = tree.edges.length;
    assertCompleted(tree);
    return { tree, report };
}

function completeTree(sourceFile) {
    return completeTreeData(readTree(sourceFile), sourceFile);
}

function main() {
    const [sourceFile, outputFile, reportFile] = process.argv.slice(2);
    if (!sourceFile || !outputFile) throw new Error('사용법: node scripts/complete-passive-tree-options.js <source.json> <output.json> [report.json]');
    const { tree, report } = completeTree(sourceFile);
    writeJson(outputFile, tree);
    if (reportFile) writeJson(reportFile, report);
    console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) main();

module.exports = {
    ACTIONABLE_TYPES, completeTree, completeTreeData, formatEffect, shouldPreserveAuthoredOption,
    stableHash, writeJson, zoneForPosition
};
