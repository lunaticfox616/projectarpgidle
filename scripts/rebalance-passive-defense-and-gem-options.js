#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { STAT_META } = require('./lib/passive-tree-option-catalog');

const SOURCE_FILE = 'artifacts/passive-tree/260831_2passive-normalized.json';
const TYPE_VALUES = Object.freeze({
    dr: { minor: 1, assist: 1.5, normal: 2, major: 4 },
    resF: { minor: 5, assist: 7, normal: 10, major: 15 },
    resC: { minor: 5, assist: 7, normal: 10, major: 15 },
    resL: { minor: 5, assist: 7, normal: 10, major: 15 },
    resChaos: { minor: 3, assist: 4, normal: 6, major: 10 },
    resAll: { minor: 3, assist: 4, normal: 6, major: 10 },
    energyShield: { minor: 15, assist: 20, normal: 30, major: 60 },
    energyShieldRegen: { minor: 0.5, assist: 1, normal: 1.5, major: 3 },
    energyShieldRechargeFaster: { minor: 0.1, assist: 0.2, normal: 0.3, major: 0.5 },
    armorPct: { minor: 5, assist: 7, normal: 10, major: 20 },
    evasionPct: { minor: 5, assist: 7, normal: 10, major: 20 },
    spellPctDmg: { minor: 5, assist: 7, normal: 12, major: 20 },
    dotPctDmg: { minor: 5, assist: 7, normal: 12, major: 20 },
    pctHp: { minor: 2, assist: 3, normal: 4, major: 6 },
    blockChance: { minor: 1, assist: 1.5, normal: 2.5, major: 5 }
});

const DEFENSE_GROUPS = Object.freeze({
    dr: Object.freeze([
        'anchor:nnbzzntdgnd', 'anchor:n9i7lxbn61q',
        'cluster:backbone_branch_cleric_warrior_center:theme:cleric_warrior_resist_armor',
        'anchor:n2bs598tfi6', 'anchor:nuh4qfz2tcj', 'anchor:nf1njb1k1ha'
    ]),
    resF: Object.freeze([
        'cluster:backbone_branch_cleric_outer_3:theme:cleric_maximum_resist',
        'anchor:completion_alchemist_flask_20', 'anchor:nyjhqoqs0fe',
        'anchor:nsdu4kbcvnr', 'anchor:v13_bulk_연금술사_2_07', 'anchor:na0752u9zq2'
    ]),
    resC: Object.freeze([
        'anchor:n33yhibs13g', 'anchor:nv4s9u8dlfr', 'anchor:nvoyo9owy3x',
        'bundle:v13_balance_center_dimensional_prism_01', 'anchor:nhz88k1d1br', 'anchor:npc7ayw2l4u'
    ]),
    resL: Object.freeze([
        'anchor:npynrdvcvnr', 'anchor:nmw6zlmrzvb', 'anchor:n726ld3r2yf',
        'anchor:n6mg44h34v1', 'bundle:expansion_occult_ritual_eye_01', 'anchor:ntt0pzauzsg'
    ]),
    resChaos: Object.freeze([
        'anchor:n5qbn9tzm38', 'anchor:nv88pjywy3x', 'anchor:naem45q3jy1',
        'anchor:n4jbqe4ltnj', 'anchor:n0irmnqwy3x', 'anchor:nqcn7k4wy3x'
    ]),
    resAll: Object.freeze([
        'cluster:backbone_branch_cleric_outer_2:theme:cleric_resist',
        'cluster:backbone_branch_alchemist_outer_4:theme:alchemist_resist',
        'anchor:v13_balance_center_left_diamond_05', 'anchor:n41x9l9wy3x'
    ])
});

const CLEANUP_GROUPS = Object.freeze({
    'anchor:naym07x29mt': 'energyShieldRechargeFaster', 'anchor:ntpyi3hdb1j': 'energyShield',
    'anchor:nbvnhnpwsjx': 'energyShield', 'anchor:nkiplby1sk8': 'energyShieldRegen',
    'anchor:n7rmdxbrpjt': 'energyShieldRegen', 'anchor:nz5u8ro3ab1': 'energyShield',
    'anchor:nhl6sgdt9jq': 'energyShield', 'anchor:ntbveo1ta62': 'energyShield',
    'anchor:ns0bc85cg2f': 'armorPct', 'anchor:n1376tme09i': 'energyShield',
    'anchor:nzf7qg5wy3x': 'energyShield', 'bundle:n081836wy3x': 'energyShield',
    'anchor:neln43kwy3x': 'energyShield', 'bundle:n121z3is5xu': 'evasionPct',
    'anchor:n0syjlnechx': 'evasionPct', 'anchor:nlwk06igprm': 'spellPctDmg',
    'anchor:nfx1dxfde8q': 'energyShield', 'anchor:nczf2xtdgvv': 'energyShield',
    'anchor:n7czou0nlyk': 'energyShieldRechargeFaster', 'anchor:n0t16p8qgpd': 'pctHp',
    'bundle:n7sr619yw1e': 'energyShieldRegen', 'anchor:nyqgwi51dd9': 'spellPctDmg',
    'bundle:n2i9scwd7lc': 'energyShield',
    'anchor:nc3w8091wzu': 'energyShieldRechargeFaster', 'anchor:v13_bulk_연금술사_4_07': 'dotPctDmg',
    'anchor:v13_bulk_성직자_1_10': 'energyShieldRegen', 'bundle:n3j2xrf67a0': 'blockChance',
    'cluster:backbone_branch_occultist_cleric_center:theme:occultist_cleric_resist_energy': 'energyShield',
    'cluster:backbone_branch_cleric_outer_3:theme:cleric_devotion': 'pctHp'
});

const AUTHORED_NODES = Object.freeze({
    backbone_branch_cleric_outer_3_t1_n07: ['불변의 화염 성역', [['resF', 15], ['maxResF', 1]], 'def', 'maximum_resist'],
    completion_alchemist_flask_20: ['잿불 정제', [['firePctDmg', 20], ['maxResF', 1]], 'fire', 'fire'],
    nyjhqoqs0fe: ['공허 화염', [['firePctDmg', 30], ['maxResF', 1]], 'fire', 'fire'],
    n33yhibs13g: ['혹한의 냉기', [['coldPctDmg', 30], ['maxResC', 1]], 'cold', 'cold'],
    nmw6zlmrzvb: ['고전압', [['lightPctDmg', 30], ['maxResL', 1]], 'lightning', 'lightning'],
    n5qbn9tzm38: ['금단의 복음', [['chaosPctDmg', 30], ['maxResChaos', 1]], 'chaos', 'chaos'],
    backbone_branch_occultist_outer_1_t1_n05: ['상위 주문 각인', [['spellGemLevel', 1], ['spellFlatDmg', 10]], 'spell', 'spell'],
    n05jx3suzdh: ['상위 화염술', [['firePctDmg', 30], ['fireGemLevel', 1]], 'fire', 'fire'],
    nsi1cc6xdjs: ['상위 냉기술', [['coldPctDmg', 30], ['coldGemLevel', 1]], 'cold', 'cold'],
    backbone_branch_alchemist_outer_3_t2_n04: ['상위 번개술', [['lightPctDmg', 30], ['lightGemLevel', 1]], 'lightning', 'lightning'],
    v13_balance_center_dimensional_prism_01: ['원소의 극점', [['elementalPctDmg', 30], ['elementalGemLevel', 1]], 'elemental', 'elemental'],
    expansion_archer_crossbow_19: ['관통 쇠뇌', [['projectilePctDmg', 30], ['projectileGemLevel', 1]], 'atk', 'projectile'],
    n9iiw9wl9k2: ['맹렬한 칼끝', [['meleePctDmg', 30], ['meleeGemLevel', 1]], 'physical', 'melee'],
    n7u6tr9kzle: ['전장의 파문', [['slamPctDmg', 30], ['slamGemLevel', 1]], 'physical', 'slam'],
    backbone_branch_cleric_warrior_center_t3_n03: ['방패 충격 집중', [['shieldPctDmg', 13], ['armorPct', 5]], 'physical', 'shield'],
    backbone_branch_warrior_outer_1_t3_n03: ['물리 피해', [['physPctDmg', 5]], 'physical', 'physical'],
    v13_bulk_연금술사_4_07: ['부식의 정점', [['dotPctDmg', 30], ['dotGemLevel', 1]], 'ailment', 'ailment'],
    nr9ez53ar77: ['봉인된 대주문진', [['aoePctDmg', 30], ['aoeGemLevel', 1]], 'spell', 'elemental'],
    n0ptqetxrno: ['번지는 작열', [['firePctDmg', 20], ['igniteDamageMultiplierPct', 15]], 'fire', 'fire'],
    nzsokkouxmx: ['점화 촉매', [['firePctDmg', 12], ['igniteDamageMultiplierPct', 8]], 'fire', 'fire'],
    backbone_branch_alchemist_outer_2_t3_n03: ['냉각 약제 집중', [['coldPctDmg', 15], ['chillEffect', 10]], 'cold', 'cold'],
    n5m0ntdx0a3: ['변성의 뇌광', [['lightPctDmg', 30], ['shockEffect', 15]], 'lightning', 'lightning'],
    backbone_branch_alchemist_outer_3_t1_n03: ['전도 약제 집중', [['shockedEnemyHitDamagePct', 15], ['shockEffect', 10]], 'lightning', 'lightning'],
    nc4lmzo26vp: ['정확도', [['accuracy', 50]], 'atk', 'precision'],
    newxmmn28wz: ['전사의 조준', [['accuracy', 100], ['meleePctDmg', 10]], 'atk', 'precision'],
    ndvc51s2dea: ['정확도', [['accuracy', 50]], 'atk', 'precision'],

    // Arrow fan: repeated hits / extra projectiles / critical damage remain separate arms.
    expansion_archer_arrow_fan_02: ['연속 타격', [['ds', 3]], 'atk', 'projectile'],
    expansion_archer_arrow_fan_04: ['쏟아지는 화살', [['projectilePctDmg', 30], ['ds', 10]], 'atk', 'projectile'],
    expansion_archer_arrow_fan_11: ['연속 타격', [['ds', 3]], 'atk', 'projectile'],
    // Dagger's short side tip repeats hits; the long tip still pierces physical reduction.
    completion_wanderer_dagger_10: ['연속 타격', [['ds', 3]], 'atk', 'melee'],
    completion_wanderer_dagger_09: ['그림자 연참', [['meleePctDmg', 25], ['ds', 10]], 'physical', 'melee'],
    // Warrior's two curved approaches offer sustain or extra hits, not more attributes.
    nqjbg9yt7vt: ['생명력 흡수', [['leech', 0.5]], 'def', 'life'],
    n7fsonptami: ['연속 타격', [['ds', 3]], 'atk', 'melee'],
    nmon3e1tgnr: ['끊임없는 맹공', [['meleePctDmg', 30], ['ds', 10]], 'physical', 'melee'],

    // Outer spell fork: an embedded-damage core leads to gem level or support capacity.
    backbone_branch_occultist_outer_1_t1_n01: ['주문 내장 피해', [['spellFlatDmg', 5]], 'spell', 'spell'],
    backbone_branch_occultist_outer_1_t2_n02: ['주문 내장 피해 증가', [['spellFlatPct', 15]], 'spell', 'spell'],
    backbone_branch_occultist_outer_1_t3_n03: ['주문 내장 피해', [['spellFlatDmg', 5]], 'spell', 'spell'],
    backbone_branch_occultist_outer_1_t2_n06: ['주문 내장 피해 증가', [['spellFlatPct', 10]], 'spell', 'spell'],
    // Inner spell hook is optional; the adjoining intelligence/ES corridor is unchanged.
    njbqg7vrd9k: ['주문 내장 피해', [['spellFlatDmg', 5]], 'spell', 'spell'],
    no3kqxbre07: ['주문 내장 피해 증가', [['spellFlatPct', 10]], 'spell', 'spell'],
    neryoj6rg9p: ['응축된 주문핵', [['spellFlatPct', 25], ['spellFlatDmg', 15]], 'spell', 'spell'],

    // Paired elemental curls: cold offers slowing; lightning concentrates damage/shock.
    n7mumm5x6wu: ['냉기 피해', [['coldPctDmg', 10]], 'cold', 'cold'],
    newd0r0xeoe: ['냉각 확률', [['chillChance', 5]], 'cold', 'cold'],
    nycdq27xe3s: ['냉기 피해', [['coldPctDmg', 10]], 'cold', 'cold'],
    ngxf5hpx0nn: ['번개 피해', [['lightPctDmg', 10]], 'lightning', 'lightning'],
    nneueobx1bl: ['번개 피해', [['lightPctDmg', 10]], 'lightning', 'lightning'],
    nvwwsyax27g: ['번개 피해', [['lightPctDmg', 10]], 'lightning', 'lightning'],
    backbone_branch_alchemist_outer_2_t2_n02: ['냉기 피해', [['coldPctDmg', 10]], 'cold', 'cold'],
    backbone_branch_alchemist_outer_2_t1_n05: ['냉기 피해', [['coldPctDmg', 10]], 'cold', 'cold'],
    backbone_branch_alchemist_outer_2_t2_n06: ['냉각 확률', [['chillChance', 10]], 'cold', 'cold'],
    backbone_branch_alchemist_outer_3_t1_n01: ['번개 피해', [['lightPctDmg', 10]], 'lightning', 'lightning'],
    backbone_branch_alchemist_outer_3_t1_n05: ['번개 피해', [['lightPctDmg', 10]], 'lightning', 'lightning'],
    backbone_branch_alchemist_outer_3_t2_n06: ['번개 피해', [['lightPctDmg', 10]], 'lightning', 'lightning'],

    // Inner ES loop: one side builds capacity, the other improves recovery.
    n7sr619yw1e: ['에너지 보호막 회복 속도', [['energyShieldRegen', 2]], 'def', 'energyShield'],
    njmuxz1yyb0: ['에너지 보호막 회복 속도', [['energyShieldRegen', 2]], 'def', 'energyShield'],
    n99gnyxyu0e: ['수호의 외피', [['energyShieldPct', 35], ['energyShieldRegen', 5]], 'def', 'energyShield'],
    nqfx25r1u7w: ['에너지 보호막 재충전 대기시간 감소', [['energyShieldRechargeFaster', 0.1]], 'def', 'energyShield'],
    nc3w8091wzu: ['차원의 외피', [['energyShieldPct', 20], ['energyShieldRechargeFaster', 0.5]], 'def', 'energyShield'],
    // Central blood fork: passive regeneration versus on-hit leech, then sustained speed.
    backbone_branch_warrior_wanderer_center_t2_n02: ['생명력 재생', [['regen', 1]], 'def', 'life'],
    backbone_branch_warrior_wanderer_center_t3_n03: ['생명력 흡수', [['leech', 0.5]], 'def', 'life'],
    backbone_branch_warrior_wanderer_center_t4_n04: ['피의 순환', [['pctHp', 10], ['leech', 0.5]], 'def', 'life'],
    backbone_branch_warrior_wanderer_center_t5_n05: ['끝없는 갈증', [['aspd', 10], ['leech', 1]], 'atk', 'life']
});

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function formatEffects(effects) {
    return effects.map(effect => {
        let meta = STAT_META[effect.statId];
        if (!meta) throw new Error(`등록되지 않은 패시브 옵션: ${effect.statId}`);
        let sign = effect.value >= 0 ? '+' : '';
        return `${meta[0]} ${sign}${effect.value}${meta[1]}`;
    }).join('\n');
}

function setEffects(node, effects, identity) {
    let normalized = effects.map(([statId, value]) => ({ statId, value }));
    node.mods = clone(normalized);
    node.runtimeEffects = clone(normalized);
    node.desc = formatEffects(normalized);
    if (!identity) return;
    node.name = identity[0];
    node.cat = identity[2];
    node.archetype = identity[3];
    node.optionProfile = `manual:${node.id}`;
    node.statAutoName = false;
}

function replaceEffect(node, fromStat, toStat) {
    if (fromStat === toStat) return false;
    let effects = (node.runtimeEffects || []).map(effect => [effect.statId, effect.value]);
    let replaced = false;
    effects = effects.map(([statId, value]) => {
        if (statId !== fromStat) return [statId, value];
        replaced = true;
        return [toStat, TYPE_VALUES[toStat][node.type]];
    });
    if (replaced) setEffects(node, effects);
    return replaced;
}

function applyGroupReplacements(nodes, groupMap) {
    let changed = 0;
    nodes.forEach(node => {
        let statId = groupMap[node.optionClusterId];
        if (!statId) return;
        let replaced = replaceEffect(node, 'resAll', statId);
        let hasTarget = (node.runtimeEffects || []).some(effect => effect.statId === statId);
        if (!replaced && !hasTarget) return;
        node.optionProfile = `manual:${node.id}`;
        if ((node.runtimeEffects || []).length === 1) {
            node.name = STAT_META[statId][0];
            node.statAutoName = true;
        }
        if (replaced) changed += 1;
    });
    return changed;
}

function invertDefenseGroups() {
    let output = {};
    Object.entries(DEFENSE_GROUPS).forEach(([statId, ids]) => ids.forEach(id => {
        if (output[id]) throw new Error(`중복 방어 배치: ${id}`);
        output[id] = statId;
    }));
    return output;
}

function applyAuthoredNodes(nodes) {
    let byId = new Map(nodes.map(node => [String(node.id), node]));
    Object.entries(AUTHORED_NODES).forEach(([id, identity]) => {
        let node = byId.get(id);
        if (!node) throw new Error(`대상 패시브를 찾을 수 없습니다: ${id}`);
        setEffects(node, identity[1], identity);
    });
}

function countClustersByStat(nodes, statId) {
    return new Set(nodes.filter(node => (node.runtimeEffects || []).some(effect => effect.statId === statId))
        .map(node => node.optionClusterId || `node:${node.id}`)).size;
}

function validate(nodes) {
    let expected = { dr: 6, resF: 6, resC: 6, resL: 6, resChaos: 6, resAll: 4 };
    Object.entries(expected).forEach(([statId, count]) => {
        let actual = countClustersByStat(nodes, statId);
        if (actual !== count) throw new Error(`${statId} 배치가 ${actual}곳입니다. 기대값: ${count}`);
    });
    let exactNodes = { maxResF: 3, maxResC: 1, maxResL: 1, maxResChaos: 1 };
    Object.entries(exactNodes).forEach(([statId, count]) => {
        let actual = nodes.filter(node => (node.runtimeEffects || []).some(effect => effect.statId === statId)).length;
        if (actual !== count) throw new Error(`${statId} 노드가 ${actual}개입니다. 기대값: ${count}`);
    });
    ['elementalGemLevel', 'fireGemLevel', 'coldGemLevel', 'lightGemLevel', 'projectileGemLevel',
        'meleeGemLevel', 'slamGemLevel', 'spellGemLevel', 'dotGemLevel', 'aoeGemLevel'].forEach(statId => {
        let actual = nodes.filter(node => (node.runtimeEffects || []).some(effect => effect.statId === statId)).length;
        if (actual !== 1) throw new Error(`${statId} 배치는 정확히 1개여야 합니다: ${actual}`);
    });
    let passiveMore = nodes.filter(node => (node.runtimeEffects || []).some(effect => effect.statId === 'shockedEnemyHitDamageMorePct'));
    if (passiveMore.length) throw new Error(`감전 명중 피해 증폭 패시브가 남았습니다: ${passiveMore.map(node => node.id).join(', ')}`);
    if (countClustersByStat(nodes, 'slamPctDmg') !== 2) throw new Error('강타 피해는 전사 구역의 두 뭉치에만 있어야 합니다.');
    let warriorAccuracy = nodes.filter(node => node.optionClusterId === 'anchor:newxmmn28wz'
        && (node.runtimeEffects || []).some(effect => effect.statId === 'accuracy'));
    if (warriorAccuracy.length !== 3) throw new Error('전사 정확도 갈래의 세 노드가 유지되어야 합니다.');
}

function main() {
    let tree = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
    let defenseChanges = applyGroupReplacements(tree.nodes, invertDefenseGroups());
    let cleanupChanges = applyGroupReplacements(tree.nodes, CLEANUP_GROUPS);
    applyAuthoredNodes(tree.nodes);
    validate(tree.nodes);
    fs.writeFileSync(SOURCE_FILE, `${JSON.stringify(tree, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify({ nodes: tree.nodes.length, defenseChanges, cleanupChanges }, null, 2));
}

if (require.main === module) main();

module.exports = { AUTHORED_NODES, CLEANUP_GROUPS, DEFENSE_GROUPS, validate };
