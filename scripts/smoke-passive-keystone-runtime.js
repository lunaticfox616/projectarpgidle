'use strict';

const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const { PASSIVE_KEYSTONE_CONTRACTS } = require('./lib/passive-tree-keystone-contracts');

const context = buildGameRuntime();
const byName = Object.fromEntries(PASSIVE_KEYSTONE_CONTRACTS.map(contract => [contract.name, contract]));

function run(source) {
    return vm.runInContext(source, context);
}

function setPassives(names) {
    const ids = names.map(name => byName[name].id);
    context.__passiveIds = ids;
    run('game.passives = __passiveIds.slice();');
}

function hitMultiplier(flags, target, hitIndex = 0, targetIndex = 0, skillName = '시험 스킬') {
    context.__hitArgs = { pStats: { passiveKeystoneFlags: flags, sSkill: { tags: [], ele: 'phys' } },
        target, hitIndex, targetIndex, skillName };
    return run(`getPassiveKeystoneHitMultiplier(__hitArgs.pStats, __hitArgs.target,
        __hitArgs.hitIndex, __hitArgs.targetIndex, __hitArgs.skillName)`);
}

// The seven-node approach is separate from the five devotion spokes at its tip.
const stormMajorId = 'nulyw0mk1cz';
const stormRoute = ['nz8vzbtji7n', 'nk750y2jewy', 'ntm85xjjfrx', 'nm7813yjg54',
    'nspi20ejgh8', 'n44sj00jimz', 'ny0b9czjubr'];
const devotionSpokes = ['n6edbwrjop1', 'nxombfrjpre', 'n89tfsgjqkz', 'nwidntrjrgw', 'n3hbg2ujt5h'];
const stormMajor = context.PASSIVE_TREE.nodes[stormMajorId];
const originalMajorEffects = JSON.stringify(stormMajor.effects);
for (const id of stormRoute) {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(context.PASSIVE_TREE.nodes[id].effects)),
        [{ stat: 'physPctDmg', val: 7 }, { stat: 'lightPctDmg', val: 7 }],
        `${id}: approach nodes must grant both physical and lightning damage`);
}
for (const id of devotionSpokes) {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(context.PASSIVE_TREE.nodes[id].effects)),
        [{ stat: 'devotion', val: 1 }], `${id}: devotion spokes must stay intact`);
}
run("game.passives = []; game.activeSkill = '기본 공격';");
const stormBaseline = run('getPlayerStats()');
context.__stormNodes = [...stormRoute, stormMajorId];
for (let count = 0; count <= devotionSpokes.length; count += 1) {
    context.__stormSpokes = devotionSpokes.slice(0, count);
    run('game.passives = [...__stormNodes, ...__stormSpokes];');
    for (const stat of ['physPctDmg', 'lightPctDmg']) {
        assert.strictEqual(context.getAllocatedPassiveStatValue(stat), 99 - 10 * count,
            `allocated ${count} devotion spokes: 49% approach + 50% major - 10% per spoke`);
        assert.strictEqual(Object.fromEntries(run('getAllocatedPassiveStatSummary().totals'))[stat], 99 - 10 * count,
            'investment summary must match the actual combat bonus');
    }
    const stats = run('getPlayerStats()');
    assert.strictEqual(stats.damageIncreasePct - stormBaseline.damageIncreasePct, 99 - 10 * count);
    assert.strictEqual(stats.talentSourceStats.lightPct - stormBaseline.talentSourceStats.lightPct, 99 - 10 * count);
    assert.strictEqual(stats.talentSourceStats.hpPct, stormBaseline.talentSourceStats.hpPct);
    const label = context.getPassiveEffectLabel(stormMajor);
    assert.ok(label.includes(`물리 피해 +${50 - 10 * count}%`) && label.includes(`번개 피해 +${50 - 10 * count}%`));
    assert.ok(label.includes('헌신 1개 할당마다') && label.includes('10%p'));
}
assert.strictEqual(JSON.stringify(stormMajor.effects), originalMajorEffects, 'calculations must not rewrite the base effects');
// Non-adjacent devotion, duplicate saved IDs, and disabled spoke effects are not extra allocations.
context.__distantDevotion = Object.values(context.PASSIVE_TREE.nodes).find(node =>
    !devotionSpokes.includes(node.id) && node.effects.some(effect => effect.stat === 'devotion' && effect.val > 0)).id;
run('game.passives = [...__stormNodes, __distantDevotion];');
assert.strictEqual(context.getAllocatedPassiveStatValue('lightPctDmg'), 99);
run(`game.passives = [...__stormNodes, 'n6edbwrjop1', 'n6edbwrjop1'];
    game.starWedge.disabledNodeEffects.n6edbwrjop1 = true;`);
assert.strictEqual(context.getEffectivePassiveNodeEffects(stormMajor)[0].val, 40);
run('delete game.starWedge.disabledNodeEffects.n6edbwrjop1; game.passives = __stormNodes.slice();');
assert.strictEqual(context.getEffectivePassiveNodeEffects(stormMajor)[0].val, 50, 'returning the spoke must restore the major');
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.getEffectivePassiveNodeEffects(stormMajor,
    { currentStat: 'flatHp', currentVal: 30 }))), [{ stat: 'flatHp', val: 30 }],
    'a star-wedge replacement is a replacement effect, not the original damage bonus');

// Re-investing a saved preset must compute the same penalty from its allocated IDs.
run('game.passives = []; game.passivePoints = 100;');
assert.strictEqual(run("activatePassivePath('nulyw0mk1cz').activated"), true);
assert.ok(stormRoute.every(id => run('game.passives').includes(id)), 'the real route must include all seven approach nodes');
const ownedBeforeFailure = JSON.stringify(run('game.passives'));
run('game.passivePoints = 0;');
assert.strictEqual(run("activatePassivePath('n6edbwrjop1').reason"), 'points');
assert.strictEqual(JSON.stringify(run('game.passives')), ownedBeforeFailure, 'failed allocation must not change the major');
assert.strictEqual(context.getEffectivePassiveNodeEffects(stormMajor)[0].val, 50);
run('game.passivePoints = 1;');
assert.strictEqual(run("activatePassivePath('n6edbwrjop1').activated"), true);
run("saveCurrentPassiveTreePreset(0, '물리 번개 시험'); game.passives = []; game.passivePoints = 100; setPassiveTreeAutoInvest(true);");
assert.ok(run('runPassiveTreeAutoInvest().nodes') > 0);
assert.strictEqual(context.getEffectivePassiveNodeEffects(stormMajor)[0].val, 40);
run('game.passives = JSON.parse(serializeSaveState(game)).passives;');
assert.strictEqual(context.getEffectivePassiveNodeEffects(stormMajor)[1].val, 40, 'saved allocations must retain the same effective bonus');
run('setPassiveTreeAutoInvest(false);');

// Hidden elemental branches must add their own element, never generic damage.
run('game.passives = [];');
const baseline = run('getPlayerStats().talentSourceStats');
for (const [id, field, amount] of [
    ['nhenzv8gp4i', 'firePct', 30], ['ndru1xggqhg', 'lightPct', 25], ['nlwk06igprm', 'coldPct', 30]
]) {
    context.__elementNodeId = id;
    run('game.passives = [__elementNodeId];');
    const stats = run('getPlayerStats().talentSourceStats');
    for (const stat of ['generalPct', 'firePct', 'lightPct', 'coldPct']) {
        assert.strictEqual(stats[stat] - baseline[stat], stat === field ? amount : 0,
            `${id}: ${stat} must only increase for the corresponding element`);
    }
}

setPassives(['지혜의 도약']);
for (const [choice, element] of [['fire', 'fire'], ['cold', 'cold'], ['lightning', 'light'], ['chaos', 'chaos']]) {
    context.__wisdomChoice = choice;
    context.__damageElement = element;
    assert.strictEqual(run("setPassiveKeystoneChoice('wisdom_leap_element', __wisdomChoice)"), true);
    run('game.activeSkill = Object.keys(SKILL_DB).find(name => SKILL_DB[name].ele === __damageElement);');
    assert.strictEqual(run('getPlayerStats().sSkill.ele'), element);
    assert.strictEqual(run('getPlayerStats().finalDamageMultiplier'), 1.2,
        `${choice}: selected elemental skills must receive the keystone bonus`);
    run("game.activeSkill = '기본 공격';");
    assert.strictEqual(run('getPlayerStats().finalDamageMultiplier'), 0,
        '선택한 원소가 아닌 물리 스킬은 피해를 줄 수 없어야 합니다.');
}
run("setPassiveKeystoneChoice('wisdom_leap_element', 'fire');");
const wisdomEdges = context.PASSIVE_TREE.edges.filter(edge => edge.requiresAllocatedNodeId === 'nkf64engb6m');
assert.strictEqual(wisdomEdges.length, 4, '공허를 포함한 네 갈래가 유지되어야 합니다.');
for (const edge of wisdomEdges) {
    assert.strictEqual(context.isPassiveTreeEdgeAvailable(edge, []), false);
    assert.strictEqual(context.isPassiveTreeEdgeAvailable(edge, ['nkf64engb6m']), true);
}

PASSIVE_KEYSTONE_CONTRACTS.forEach(contract => {
    setPassives([contract.name]);
    assert.strictEqual(context.findAllocatedPassiveKeystone(contract.name).id, contract.id,
        `키스톤을 고유 ID로 찾을 수 없습니다: ${contract.name}`);
});

setPassives(PASSIVE_KEYSTONE_CONTRACTS.map(contract => contract.name));
const flags = JSON.parse(run(`JSON.stringify(getPassiveKeystoneCombatFlags(
    ['attack', 'melee', 'projectile', 'channeling', 'potion']))`));
[
    'farshot', 'duel', 'channelPath', 'erosionLegacy', 'proxyCovenant', 'maximumRoll',
    'fullEvasion', 'projectileFormation', 'explosiveDistill', 'soulSanctuary', 'movingWall',
    'bloodAcceleration', 'openingHunt', 'taintedWarhead', 'blackDistill', 'singleMystique',
    'soleMinion', 'flaskOverdose'
].forEach(flag => assert.strictEqual(flags[flag], true, `전투 규칙 플래그가 연결되지 않았습니다: ${flag}`));

run('game.gridPlayer = { gx:0, gy:0 }; game.enemies = [{ id:1, hp:10 }];');
assert.strictEqual(hitMultiplier({ farshot: true }, { id: 1, gx: 3, gy: 0 }), 1.25,
    '최후방 사격은 3칸 거리 피해를 25% 증폭해야 합니다.');
assert.strictEqual(hitMultiplier({ farshot: true }, { id: 1, gx: 1, gy: 0 }), 0.75,
    '최후방 사격은 인접 피해를 25% 감폭해야 합니다.');
assert.strictEqual(hitMultiplier({ duel: true }, { id: 1 }), 1.3,
    '결투의 규율은 단일 적 근접 피해를 30% 증폭해야 합니다.');
run('game.enemies = [{ id:1, hp:10 }, { id:2, hp:10 }];');
assert.strictEqual(hitMultiplier({ duel: true }, { id: 1 }), 1.3,
    '결투의 규율은 적 수와 무관하게 근접 피해를 30% 증폭해야 합니다.');
setPassives([]);
const baseDuelDefense = run('getPlayerStats().takenDamageReduceWhen1EnemyPct');
setPassives(['결투의 규율']);
assert.strictEqual(run('getPassiveKeystoneCombatFlags(["melee"]).duel'), true);
assert.strictEqual(run('getPassiveKeystoneCombatFlags(["spell", "projectile"]).duel'), false);
assert.strictEqual(run('getPlayerStats().takenDamageReduceWhen1EnemyPct'), baseDuelDefense,
    '결투의 규율에 이전의 단일 적 피해 감소 보너스가 남으면 안 됩니다.');
assert.strictEqual(hitMultiplier({ projectileFormation: true }, { id: 1 }, 0, 1), 0.6,
    '관통 행렬은 두 번째 대상부터 피해를 40% 감폭해야 합니다.');
assert.strictEqual(hitMultiplier({ explosiveDistill: true }, { id: 1 }), 0.75,
    '폭발성 증류는 포션 명중 피해를 25% 감폭해야 합니다.');
context.__openingTarget = { id: 1 };
assert.strictEqual(run(`getPassiveKeystoneHitMultiplier({ passiveKeystoneFlags:{ openingHunt:true },
    sSkill:{ tags:[], ele:'phys' } }, __openingTarget, 0, 0, '사냥')`), 2,
    '선제 사냥의 첫 공격은 피해가 100% 증폭되어야 합니다.');
assert.strictEqual(run(`getPassiveKeystoneHitMultiplier({ passiveKeystoneFlags:{ openingHunt:true },
    sSkill:{ tags:[], ele:'phys' } }, __openingTarget, 0, 0, '사냥')`), 0.8,
    '선제 사냥의 후속 공격은 피해가 20% 감폭되어야 합니다.');

run('game.passiveChannelPath = null;');
context.__channelStats = { passiveKeystoneFlags: { channelPath: true },
    sSkill: { tags: ['channeling'], ele: 'phys' } };
context.__channelTarget = { id: 7 };
assert.strictEqual(run(`getPassiveKeystoneHitMultiplier(__channelStats, __channelTarget, 0, 0, '광선')`), 1.07);
for (let index = 0; index < 8; index += 1) {
    run(`getPassiveKeystoneHitMultiplier(__channelStats, __channelTarget, 0, 0, '광선')`);
}
assert.strictEqual(run('game.passiveChannelPath.stacks'), 6, '몰아의 통로 집중은 6에서 멈춰야 합니다.');
context.__channelStats.sSkill.tags = [];
assert.strictEqual(run(`getPassiveKeystoneHitMultiplier(__channelStats, __channelTarget, 0, 0, '일격')`), 0.8,
    '몰아의 통로는 비채널링 피해를 20% 감폭하고 집중을 초기화해야 합니다.');
assert.strictEqual(run('game.passiveChannelPath'), null);

setPassives(['타락한 복음']);
context.__triplePath = [byName['삼중 계시'].id];
assert.ok(run('getPassiveKeystoneConflict(__triplePath)').includes('동시에 할당할 수 없습니다'),
    '상호 배타 키스톤은 최단 경로 일괄 투자에서도 차단되어야 합니다.');

setPassives(['과잉 투여']);
context.__flask = { maxCharges: 11, chargesPerKills: 3 };
assert.strictEqual(run('getPassiveUtilityFlaskMaxCharges(__flask)'), 5,
    '과잉 투여의 최대 충전 감폭은 내림하여 적용되어야 합니다.');
assert.strictEqual(run('getPassiveUtilityFlaskChargeKills(__flask)'), 6,
    '과잉 투여의 처치 충전 획득 감폭은 필요 처치 수 2배로 적용되어야 합니다.');

setPassives(['단 하나의 사역']);
context.__soleStats = { passiveKeystoneFlags: { soleMinion: true }, summonCap: 8,
    summonHpPct: 0, summonEfficiency: 0, passiveSoleMinionLostCap: 7 };
assert.strictEqual(run('getSummonRuntimeCap(__soleStats)'), 1, '단 하나의 사역은 공격형 소환수 한도를 1로 고정해야 합니다.');
const baseSummonHp = run("getSummonMaxHp(getSummonProfile('서리늑대 소환'), 1, { summonHpPct:0, summonEfficiency:0 })");
const soleSummonHp = run("getSummonMaxHp(getSummonProfile('서리늑대 소환'), 1, __soleStats)");
assert.ok(soleSummonHp >= baseSummonHp * 4.5 && soleSummonHp < (baseSummonHp + 1) * 4.5,
    '잃은 공격형 소환수 한도 7은 반올림 전 생명력을 기준으로 350% 증폭해야 합니다.');

run("game.ascendClass = 'elementalist'; game.ascendKeystones = ['e8']; game.elementalistOverloadStacks = 0;");
for (let index = 0; index < 50; index += 1) run('recordElementalistOverloadAttack(true)');
assert.strictEqual(run('game.elementalistOverloadStacks'), 20,
    '100% 치명타 조합에서도 원소 과부하가 무한히 중첩되면 안 됩니다.');
assert.strictEqual(run('recordElementalistOverloadAttack(false)'), 0,
    '비치명타 공격은 원소 과부하 중첩을 모두 제거해야 합니다.');

setPassives([]);
console.log('smoke-passive-keystone-runtime passed');
