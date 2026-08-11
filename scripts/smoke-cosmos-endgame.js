const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
    console,
    window: null,
    globalThis: null,
    document: { readyState: 'loading', addEventListener() {}, getElementById() { return null; } },
    addEventListener() {},
    game: {
        season: 31,
        loopCount: 30,
        currencies: { starDust: 0 },
        jewelSlots: [],
        currentZoneId: 0,
        underworldProgress: { highestFloor: 30 },
        cosmosAtlas: { layoutVersion: 20260601, cleared: ['planet-0'], bossClears: [], mastery: {} }
    },
    getChaosRealmTier(floor) {
        const safe = Math.max(1, Math.floor(floor || 1));
        return 30 + Math.floor((safe - 1) * 0.85) + Math.floor(Math.max(0, safe - 10) * 0.18);
    },
    getZone() { return { type: 'act' }; },
    getPlayerStats() { return { totalDps: 900000, maxHp: 5000, energyShield: 1000 }; },
    calculatePlayerEhpProfile() {
        return { elements: { phys: { entropy: 18000 }, fire: { entropy: 24000 }, cold: { entropy: 23000 }, light: { entropy: 22000 }, chaos: { entropy: 16000 } } };
    }
};
context.window = context;
context.globalThis = context;
context.safeExposeData = values => Object.assign(context, values);
context.safeExposeGlobals = values => Object.assign(context, values);
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/constants.js', 'utf8'), context, { filename: 'data/constants.js' });
vm.runInContext(fs.readFileSync('data/maps.js', 'utf8'), context, { filename: 'data/maps.js' });
vm.runInContext(fs.readFileSync('js/combat-patterns.js', 'utf8'), context, { filename: 'js/combat-patterns.js' });
vm.runInContext(fs.readFileSync('js/cosmos-rules.js', 'utf8'), context, { filename: 'js/cosmos-rules.js' });
vm.runInContext(fs.readFileSync('js/cosmos-atlas.js', 'utf8'), context, { filename: 'js/cosmos-atlas.js' });

const fireMechanic = context.resolveCosmosMechanic('fire', 0);
assert.strictEqual(fireMechanic.id, 'heavySlow', '화염 노드는 실제 중력 강타 기믹을 예고해야 한다');
assert(fireMechanic.counter.includes('EHP'), '기믹에는 입장 전 대응법이 있어야 한다');

const baseTarget = context.calculateCosmosDifficultyTarget({ combatTier: 57, sizeClass: 1, gravity: 1, isGalaxyBoss: false, element: 'chaos' });
const deepTarget = context.calculateCosmosDifficultyTarget({ combatTier: 70, sizeClass: 4, gravity: 3, isGalaxyBoss: true, element: 'phys' });
assert.strictEqual(baseTarget.basis, 'bossPeakHit', 'every cosmos node should report boss-peak EHP');
assert.strictEqual(baseTarget.ehp, Math.round(18000 * 1.55 * 1.55),
    'cosmos EHP should include the node boss special hit and critical damage');
assert(deepTarget.dps > baseTarget.dps && deepTarget.ehp > baseTarget.ehp, '깊은 은하와 보스는 DPS/EHP 요구가 함께 올라야 한다');
assert.strictEqual(context.evaluateCosmosReadiness(baseTarget, { dps: baseTarget.dps * 2, ehp: baseTarget.ehp * 0.7 }).id, 'risky', 'DPS가 높아도 EHP 병목을 숨기면 안 된다');

let guide = context.getCosmosProgressGuide();
assert.strictEqual(guide.stage, 'stabilize');
assert.strictEqual(guide.galaxy, 1, '관문 이후 첫 은하부터 순서대로 안내해야 한다');
context.allocateCosmosMastery('riftGuard');
assert.strictEqual(context.game.cosmosAtlas.mastery.riftGuard, 0, '균열 방벽은 시작 노드로 바로 살 수 없어야 한다');

const firstGalaxyClears = ['planet-1', 'planet-6', 'planet-11', 'planet-16', 'planet-21', 'planet-26', 'planet-31', 'planet-36', 'planet-41',
    'asteroid-32', 'asteroid-60', 'asteroid-81', 'asteroid-111', 'asteroid-115', 'asteroid-127'];
context.game.cosmosAtlas.cleared.push(...firstGalaxyClears);
context.game.cosmosAtlas.cleared.push('planet-2', 'planet-7', 'planet-12', 'planet-17', 'planet-22');
context.game.cosmosAtlas.mastery.challengeEase = 10;
context.game.cosmosAtlas.mastery.gravityHarness = 10;
context.allocateCosmosMastery('riftGuard');
assert.strictEqual(context.game.cosmosAtlas.mastery.riftGuard, 1, '두 생존 선행 노드 10레벨 뒤에는 균열 방벽을 선택할 수 있어야 한다');
guide = context.getCosmosProgressGuide();
assert.strictEqual(guide.stage, 'boss');
assert.strictEqual(guide.targetId, 'planet-46', '15개 노드 안정화 후 은하 보스를 직접 가리켜야 한다');

context.game.cosmosAtlas.cleared.push('planet-46');
context.game.cosmosAtlas.bossClears.push('planet-46');
guide = context.getCosmosProgressGuide();
assert.strictEqual(guide.galaxy, 2, 'G1 보스 처치 후 G2로 진행해야 한다');

context.game.season = 30;
context.game.cosmosAtlas.bossClears = ['planet-46', 'planet-47', 'planet-48', 'planet-49', 'planet-45'];
guide = context.getCosmosProgressGuide();
assert.strictEqual(guide.stage, 'season', '다섯 은하 정복 후에도 루프 31 전에는 잔향 표식을 안내하면 안 된다');
context.game.season = 31;

const first = context.getCosmosNodeRecommendation('planet-1');
const boss = context.getCosmosNodeRecommendation('planet-47');
assert(first && boss && boss.target.dps > first.target.dps && boss.target.ehp > first.target.ehp,
    '상위 은하 보스의 권장 DPS/EHP는 초입 노드보다 높아야 한다');

const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
assert(cosmosSource.includes('예상 DPS<strong>약 ${formatCosmosPower(model.target.dps)}')
    && cosmosSource.includes('예상 EHP<strong>약 ${formatCosmosPower(model.target.ehp)}'),
    '우주계 노드도 상세 비율 대신 대략적인 DPS/EHP만 표시해야 한다');
assert(!cosmosSource.includes('약 ${model.target.clearTimeSec}초 클리어')
    && !cosmosSource.includes('내 DPS ${formatCosmosPower(model.player.dps)}'),
    '우주계 예상치에는 클리어 시간과 상세 플레이어 비율을 중복 표시하지 않아야 한다');

console.log('smoke-cosmos-endgame passed');
