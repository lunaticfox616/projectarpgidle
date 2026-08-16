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
        journalEntries: ['woodsman'],
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
vm.runInContext(fs.readFileSync('js/utils.js', 'utf8'), context, { filename: 'js/utils.js' });
vm.runInContext(fs.readFileSync('js/combat-patterns.js', 'utf8'), context, { filename: 'js/combat-patterns.js' });
vm.runInContext(fs.readFileSync('js/cosmos-rules.js', 'utf8'), context, { filename: 'js/cosmos-rules.js' });
vm.runInContext(fs.readFileSync('js/cosmos-atlas.js', 'utf8'), context, { filename: 'js/cosmos-atlas.js' });

const fireMechanic = context.resolveCosmosMechanic('fire', 0);
assert.strictEqual(fireMechanic.id, 'heavySlow', '화염 노드는 실제 중력 강타 기믹을 예고해야 한다');
assert(fireMechanic.counter.includes('EHP'), '기믹에는 입장 전 대응법이 있어야 한다');

const baseTarget = context.calculateCosmosDifficultyTarget({ combatTier: 57, sizeClass: 1, gravity: 1, isGalaxyBoss: false, element: 'chaos' });
const deepTarget = context.calculateCosmosDifficultyTarget({ combatTier: 70, sizeClass: 4, gravity: 3, isGalaxyBoss: true, element: 'phys' });
assert.strictEqual(baseTarget.basis, 'bossPeakHit', 'every cosmos node should report boss-peak EHP');
assert(baseTarget.dps > 5000000 && baseTarget.ehp > 30000,
    '전투 모듈 준비 전 대체값도 실제 나무꾼 이후 보스 공식과 같은 규모여야 한다');
assert(deepTarget.dps > baseTarget.dps && deepTarget.ehp > baseTarget.ehp, '깊은 은하와 보스는 DPS/EHP 요구가 함께 올라야 한다');
assert.strictEqual(context.evaluateCosmosReadiness(baseTarget, { dps: baseTarget.dps * 2, ehp: baseTarget.ehp * 0.7 }).id, 'risky', 'DPS가 높아도 EHP 병목을 숨기면 안 된다');

context.game.journalEntries = [];
let guide = context.getCosmosProgressGuide();
assert.strictEqual(guide.title, '혼돈 밖의 나무꾼 격파', '우주계는 나무꾼 이후의 두 번째 성장 목표여야 한다');
context.game.journalEntries.push('woodsman');
guide = context.getCosmosProgressGuide();
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

const firstSignalChoices = context.getCosmosExpeditionDirectiveChoices('planet-1', 0);
assert.strictEqual(firstSignalChoices.length, 3, '각 우주계 노드는 세 가지 탐사 신호를 제시해야 한다');
assert.strictEqual(firstSignalChoices[0].id, 'survey', '안정 관측 항로는 항상 첫 선택지로 남아야 한다');
assert.strictEqual(new Set(firstSignalChoices.map(row => row.id)).size, 3, '같은 탐사 신호를 중복 제시하면 안 된다');
assert.deepStrictEqual(
    firstSignalChoices.map(row => row.id),
    context.getCosmosExpeditionDirectiveChoices('planet-1', 0).map(row => row.id),
    '완료 전 새로고침으로 탐사 신호가 재굴림되면 안 된다'
);
const rotatedSignals = new Set(Array.from({ length: 8 }, (_, cycle) =>
    context.getCosmosExpeditionDirectiveChoices('planet-1', cycle).map(row => row.id).join(',')));
assert(rotatedSignals.size > 1, '탐사 완료 뒤에는 무작위 신호 구성이 갱신되어야 한다');
const rareSignalCount = Array.from({ length: 500 }, (_, cycle) =>
    context.getCosmosExpeditionDirectiveChoices('planet-46', cycle).some(row => row.id === 'eclipse'))
    .filter(Boolean).length;
assert(rareSignalCount >= 5 && rareSignalCount <= 50,
    '흑성 일식은 실제로 등장하되 일반 신호처럼 자주 나오면 안 된다');

context.game.cosmosAtlas = { layoutVersion: 20260811, cleared: ['planet-0'], bossClears: [], mastery: {}, selectedDirectives: {}, directiveCycles: {} };
context.game.currencies.starDust = 0;
context.focusRecommendedCosmosNode();
const expeditionNodeId = context.game.cosmosAtlas.selectedId;
const expeditionChoices = context.getCosmosExpeditionDirectiveChoices(expeditionNodeId, 0);
const riskyDirective = expeditionChoices.find(row => row.id !== 'survey');
const safeExpeditionTarget = context.getCosmosNodeRecommendation(expeditionNodeId).target;
context.game.cosmosAtlas.selectedDirectives[expeditionNodeId] = riskyDirective.id;
const riskyExpeditionTarget = context.getCosmosNodeRecommendation(expeditionNodeId).target;
assert(riskyExpeditionTarget.dps > safeExpeditionTarget.dps && riskyExpeditionTarget.ehp > safeExpeditionTarget.ehp,
    '탐사 신호의 위험도는 입장 전 권장 DPS와 EHP에 반영되어야 한다');
context.challengeSelectedCosmosNode();
assert.strictEqual(context.game.cosmosAtlas.activeChallenge.directive.id, riskyDirective.id,
    '선택한 탐사 신호가 실제 전투 계약에 고정되어야 한다');
vm.runInContext('Math.random = () => 0;', context);
context.exploreSelectedCosmosNode(expeditionNodeId);
assert(context.game.currencies.starDust > 7, '위험 탐사와 공명 잭팟은 실제 별가루 보상을 늘려야 한다');
assert.strictEqual(context.game.cosmosAtlas.directiveCycles[expeditionNodeId], 1,
    '탐사를 완료한 뒤에만 해당 노드 신호 주기가 증가해야 한다');
assert.strictEqual(context.game.cosmosAtlas.selectedDirectives[expeditionNodeId], undefined,
    '완료한 탐사의 이전 선택은 다음 신호에 남으면 안 된다');

const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
assert(cosmosSource.includes('예상 DPS<strong class="map-power-grade grade-${ready.dps.id}">${ready.dps.label}')
    && cosmosSource.includes('권장 EHP<strong class="map-power-grade grade-${ready.ehp.id}">${ready.ehp.label}'),
    '우주계 노드도 원시 수치 대신 낮음·적정·높음 준비도만 표시해야 한다');
assert(!cosmosSource.includes('약 ${model.target.clearTimeSec}초 클리어')
    && !cosmosSource.includes('renderCosmosMechanicSection(node)'),
    '우주계 상세 화면은 클리어 시간이나 기믹 공략을 미리 노출하지 않아야 한다');

console.log('smoke-cosmos-endgame passed');
