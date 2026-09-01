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
assert.strictEqual(hitMultiplier({ duel: true }, { id: 1 }), 1.35,
    '결투의 규율은 단일 적 근접 피해를 35% 증폭해야 합니다.');
run('game.enemies = [{ id:1, hp:10 }, { id:2, hp:10 }];');
assert.strictEqual(hitMultiplier({ duel: true }, { id: 1 }), 0.85,
    '결투의 규율은 다수 적 근접 피해를 15% 감폭해야 합니다.');
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
