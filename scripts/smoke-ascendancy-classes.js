// 전직 18종(2026-10-02): 직업 6개마다 전직 3종. 직업별 전직 셋, 키스톤 구조와 id 고유, 기존 12종의 노드 값이 개편 전과 같음(지문),
// 새 여섯의 키스톤이 능력치 줄과 고유 효과 줄로 실제 힘을 바꿈(고른 것, 우주계 쌍둥이), 고유 효과 키는 전투 엔진에 있고
// 장비보다 앞에 들어감, 쌍둥이 키스톤 풀, 저장 경계, 재능 개화 카드 180종(새 60장의 고유 효과).
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = source => vm.runInContext(source, runtime);
const json = source => JSON.parse(run(`JSON.stringify(${source})`));
run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero2',selectedClassId:'warrior'});window.game=game;Math.random=()=>0.37;`);

// 직업마다 셋, 모두 합쳐 18종, 겹치지 않는다.
const byClass = json('ASCENDANCIES_BY_PLAYER_CLASS');
assert.deepEqual(Object.keys(byClass).sort(), json('Object.keys(PLAYER_CLASS_DEFS)').sort(), 'every player class has its ascendancies');
const all = Object.values(byClass).flat();
assert.equal(all.length, 18);
assert.equal(new Set(all).size, 18, 'no ascendancy belongs to two classes');
assert.deepEqual(all.slice().sort(), json('Object.keys(CLASS_TEMPLATES)').sort(), 'every template belongs to a class');
assert.deepEqual(json(`getAscendanciesForClass('warrior')`), ['warrior', 'berserker', 'juggernaut']);
assert.equal(run(`isAscendancyOfClass('assassin', 'warrior')`), false, 'another class cannot take it');
assert.equal(run(`isAscendancyOfClass('crusader', 'cleric')`), true);

// 키스톤: 전직마다 9개, id는 전직을 통틀어 하나, 선행은 같은 전직 안, 9번째는 재능 개화 전용, 새 여섯은 능력치 줄.
const keystones = json('CLASS_KEYSTONE_DEFS');
const ids = Object.values(keystones).flat().map(node => node.id);
assert.equal(ids.length, 18 * 9);
assert.equal(new Set(ids).size, ids.length, 'keystone ids are unique across ascendancies');
const statIds = new Set(json('Object.keys(P_STATS)'));
for (const [asc, list] of Object.entries(keystones)) {
    const own = new Set(list.map(node => node.id));
    list.forEach(node => [node.req, ...(node.reqAny || [])].filter(Boolean).forEach(req => assert.ok(own.has(req), `${node.id} requires ${req} of ${asc}`)));
    assert.ok(list[8].fifthJobOnly, `${asc}: the ninth keystone needs the talent bloom`);
}
// 고유 효과 키는 getPlayerStats의 고유 효과 엔진이 아는 키여야 하고, 수치는 0이 아닌 양수(엔진은 0을 기본값으로 바꾼다).
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const engineKnows = key => combatSource.includes(`effect.key === '${key}'`);
const checkUniqueLine = (owner, unique) => {
    assert.ok(engineKnows(unique.key), `${owner}: ${unique.key} is handled by the unique-effect engine`);
    Object.entries(unique.params || {}).forEach(([name, value]) => assert.ok(Number.isFinite(value) && value > 0, `${owner}: ${unique.key}.${name} = ${value}`));
};
const NEW_SIX = ['berserker', 'juggernaut', 'bladedancer', 'stormarcher', 'grovewarden', 'bombardier'];
for (const asc of NEW_SIX) {
    keystones[asc].forEach(node => {
        assert.ok(node.desc && (node.stats || []).length + (node.uniques || []).length > 0, `${node.id} has a description and stat or unique lines`);
        (node.stats || []).forEach(line => assert.ok(statIds.has(line.stat) && Number.isFinite(line.val) && line.val !== 0, `${node.id}: ${line.stat}`));
        (node.uniques || []).forEach(unique => checkUniqueLine(node.id, unique));
    });
    assert.ok(keystones[asc].filter(node => (node.uniques || []).length).length >= 4, `${asc}: keystones 4-9 carry most of the unique effects`);
}

// 노드: 기존 12종은 개편 전 getClassTreeDef와 같은 값(지문), 새 여섯은 모든 노드가 아는 능력치의 양수 값.
const trees = json(`(() => {
    const out = {};
    for (const id of ['warrior','gladiator','assassin','ranger','elementalist','warlock','guardian','inquisitor','soulbinder','catalyst','hunter','crusader','berserker','juggernaut','bladedancer','stormarcher','grovewarden','bombardier']) {
        game.completedTrials = []; game.bloomedClassThisLoop = ''; game.bloomedTalentThisLoop = '';
        const base = getClassTreeDef(id);
        game.completedTrials = ['trial_1','trial_2','trial_3','trial_4'];
        const core = getClassTreeDef(id);
        game.bloomedClassThisLoop = id; game.bloomedTalentThisLoop = 'hero3';
        out[id] = { base, core, bloom: getClassTreeDef(id) };
    }
    game.completedTrials = []; game.bloomedClassThisLoop = ''; game.bloomedTalentThisLoop = '';
    return out;
})()`);
const oldTwelve = Object.fromEntries(Object.entries(trees).slice(0, 12));
assert.equal(crypto.createHash('sha1').update(JSON.stringify(oldTwelve)).digest('hex'), 'ea56ae41c84aff18d24f2fcbc80a29a33bf0b86c',
    'the twelve existing ascendancies keep their node values (data/ascendancies.js matches the old getClassTreeDef)');
for (const asc of ['berserker', 'juggernaut', 'bladedancer', 'stormarcher', 'grovewarden', 'bombardier']) {
    const nodes = Object.entries(trees[asc].bloom);
    assert.equal(nodes.length, 16, `${asc}: n1-n10, n11-n12 and n13a-d`);
    nodes.forEach(([id, node]) => (node.stats || [node]).forEach(line => assert.ok(statIds.has(line.stat) && line.val > 0, `${asc} ${id}: ${line.stat} ${line.val}`)));
}

// 새 키스톤은 고르면(그 전직일 때) 힘이 바뀌고, 우주계 쌍둥이 키스톤으로 받아도 바뀐다.
const power = json(`(() => {
    const dps = () => getPlayerStats(false).dps;
    game.ascendClass = 'berserker'; game.ascendKeystones = []; game.cosmosTwinKeystones = [];
    const plain = dps();
    game.ascendKeystones = ['bz2'];
    const picked = dps();
    game.ascendClass = ''; game.ascendKeystones = [];
    // 쌍둥이 키스톤 목록은 getPlayerStats가 장착한 우주계 주얼에서 다시 만든다 — 합산 함수에 상태를 직접 넘긴다.
    const bucket = () => ({ ...Object.fromEntries([...DIRECT_STAT_BUCKET_KEYS].map(key => [key, 0])) });
    const twinBucket = bucket(); accumulateCombatKeystoneStats(twinBucket, { ascendClass: 'warrior', ascendKeystones: [], cosmosTwinKeystones: ['bz2'] });
    const otherBucket = bucket(); accumulateCombatKeystoneStats(otherBucket, { ascendClass: 'warrior', ascendKeystones: ['bz2'], cosmosTwinKeystones: [] });
    return { plain, picked, twinAspd: twinBucket.aspd, otherAspd: otherBucket.aspd };
})()`);
assert.ok(power.picked > power.plain * 1.05, `a picked stat keystone raises DPS: ${power.plain} -> ${power.picked}`);
assert.equal(power.twinAspd, 14, 'a twin stat keystone works for any ascendancy');
assert.equal(power.otherAspd, 0, 'a picked keystone of another ascendancy does nothing');

// 고유 효과 줄: 고른 키스톤(그 전직일 때)과 쌍둥이 키스톤이 실제 능력치에 닿고, 다른 전직의 고른 키스톤은 닿지 않는다.
const immune = json(`(() => {
    const read = () => { const s = getPlayerStats(false); return [!!s.immuneFreeze, !!s.immuneBleed]; };
    game.ascendClass = 'juggernaut'; game.ascendKeystones = []; game.cosmosTwinKeystones = [];
    const plain = read();
    game.ascendKeystones = ['jg3', 'jg6'];
    const picked = read();
    const twin = getActiveAscendKeystoneUniqueEffects({ ascendClass: 'warrior', ascendKeystones: [], cosmosTwinKeystones: ['jg6'] }).map(e => e.key);
    const other = getActiveAscendKeystoneUniqueEffects({ ascendClass: 'warrior', ascendKeystones: ['jg6'], cosmosTwinKeystones: [] }).length;
    game.ascendClass = ''; game.ascendKeystones = [];
    return { plain, picked, twin, other };
})()`);
assert.deepEqual(immune.plain, [false, false]);
assert.deepEqual(immune.picked, [true, true], 'the picked keystone 불굴 makes the hero immune to freeze and bleed');
assert.deepEqual(immune.twin, ['immuneFreeze', 'immuneBleed'], 'a twin keystone brings its unique lines');
assert.equal(immune.other, 0, 'a picked keystone of another ascendancy brings nothing');

// 키스톤 줄은 고유 효과 목록 맨 앞에 들어간다: 나중 줄이 앞 줄을 덮는 키는 같은 효과를 주는 고유 장비의 수치가 남는다.
const order = json(`(() => {
    const list = [{ key: 'realmKillMoveStacks', params: { movePerStack: 10, maxStacks: 20, duration: 20, cooldownSec: 1 }, itemName: '장비' }];
    pushBuildKeystoneUniqueEffects(list, { ascendClass: 'stormarcher', ascendKeystones: ['sa3', 'sa6'], cosmosTwinKeystones: [] });
    return list.map(e => [e.key, e.itemName, e.params.movePerStack]);
})()`);
assert.deepEqual(order, [['realmKillMoveStacks', '전직 키스톤: 폭풍 걸음', 4], ['realmKillMoveStacks', '장비', 10]],
    'the keystone line comes first, so the unique item (processed last) keeps its stronger numbers');

// 회귀(2026-10-02): 쌍둥이 키스톤은 전직과 상관없이 켜진다. 기존 12종의 전투 코드가 전직까지 확인해서, 주얼 두 개가
// 어쌔신 키스톤 a1(치명타 피해 +66, 치명타 확률 -6)을 줘도 글래디에이터에게는 효과가 없었다. 고른 키스톤은 여전히 그 전직일 때만.
const twinOld = json(`(() => {
    const ring = (slot, uniqueId) => ({ slot, name: '시험 반지', rarity: 'normal', stats: [], voidSocket: { open: true, jewel: { uniqueId, name: uniqueId, rarity: 'unique', cosmosKeystoneJewel: true, cosmosKeystone: 'a1', stats: [] } } });
    const read = () => getPlayerStats(false).critDmg;
    const saved = { ...game.equipment };
    game.ascendClass = 'gladiator'; game.ascendKeystones = []; game.cosmosTwinKeystones = [];
    const plain = read();
    game.ascendKeystones = ['a1'];
    const pickedOther = read();
    game.ascendKeystones = [];
    game.equipment['반지1'] = ring('반지1', 'cbj_zubenubia_balance');
    game.equipment['반지2'] = ring('반지2', 'cbj_zubenshamali_judgment');
    const twin = read();
    const granted = game.cosmosTwinKeystones.slice();
    game.equipment = saved; game.ascendClass = ''; read();
    return { plain, pickedOther, twin, granted };
})()`);
assert.deepEqual(twinOld.granted, ['a1'], 'two matching twin jewels grant their keystone');
assert.equal(twinOld.twin - twinOld.plain, 66, `a twin assassin keystone works for a gladiator: ${twinOld.plain} -> ${twinOld.twin}`);
assert.equal(twinOld.pickedOther, twinOld.plain, 'a picked keystone of another ascendancy stays off');

// 우주계 쌍둥이 주얼은 지금 직업이 고를 수 있는 전직 셋의 키스톤만 준다.
const twinPool = json(`(() => { const seen = new Set(); let s = 1; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 400; i++) seen.add(getAscendKeystoneOwnerClass(pickRandomAscendKeystoneId('archer'))); Math.random = () => 0.37; return [...seen].sort(); })()`);
assert.deepEqual(twinPool, ['hunter', 'ranger', 'stormarcher']);

// 저장 경계: 모르는 전직은 비우고 노드 · 키스톤 포인트를 돌려준다. 재능 개화 단계 5는 남고, 없는 카드 조합은 버린다.
const loaded = json(`(() => {
    const save = mergeDefaults({ heroSelectionInitialized: true, selectedClassId: 'archer', ascendClass: 'templar', ascendNodes: ['n1', 'n2'], ascendKeystones: ['t1'],
        ascendPoints: 1, ascendKeystonePoints: 0, ascendRank: 5, completedTrials: ['trial_1'],
        talentCards: { hero1__ranger: { score: 3, level: 2, count: 1 }, hero1__templar: { score: 1, level: 1, count: 1 } },
        talentCardLoadout: ['hero1__ranger', 'hero1__templar', null, null, null, null] });
    return { ascendClass: save.ascendClass, nodes: save.ascendNodes, keystones: save.ascendKeystones, points: save.ascendPoints, kp: save.ascendKeystonePoints,
        rank: save.ascendRank, cards: Object.keys(save.talentCards), loadout: save.talentCardLoadout.slice(0, 2),
        first: JSON.stringify([save.ascendClass, save.ascendPoints, save.ascendKeystonePoints, save.talentCards, save.talentCardLoadout]),
        again: (again => JSON.stringify([again.ascendClass, again.ascendPoints, again.ascendKeystonePoints, again.talentCards, again.talentCardLoadout]))(mergeDefaults(JSON.parse(JSON.stringify(save)))) };
})()`);
assert.equal(loaded.ascendClass, '');
assert.deepEqual([loaded.nodes, loaded.keystones], [[], []]);
assert.equal(loaded.points, 3, 'two node points come back');
assert.ok(loaded.kp >= 1, 'the keystone point comes back');
assert.equal(loaded.rank, 5, 'a bloomed rank survives loading');
assert.deepEqual(loaded.cards, ['hero1__ranger']);
assert.deepEqual(loaded.loadout, ['hero1__ranger', null]);
assert.equal(loaded.again, loaded.first, 'loading twice gives the same ascendancy and cards (no second refund)');

// 재능 개화 카드: 재능 10 × 전직 18 = 180, 모든 조합이 있고 새 카드는 능력치 규칙을 가진다.
const cards = json('Object.keys(TALENT_BLOOM_CARD_DEFS)');
assert.equal(cards.length, 180);
assert.equal(run('TALENT_BLOOM_TOTAL_CARDS'), 180);
const heroes = json('HERO_SELECTION_ORDER');
for (const hero of heroes) for (const asc of all) assert.ok(cards.includes(`${hero}__${asc}`), `card ${hero}__${asc}`);
const rule = json(`TALENT_PRECISE_CARD_RULES['hero7__grovewarden']`);
assert.deepEqual(rule.stats, { summonPctDmg: 25, coldPctDmg: 30 });
assert.deepEqual(rule.uniques, [{ key: 'summonEfficiencyBonus', params: { pct: 10 } }]);

// 새 카드 60장: 이름이 저마다 다르고, 고유 효과 하나는 엔진이 알고 화면 라벨이 있는 키다. 카드는 고유 효과 목록 맨 뒤에
// 들어가므로 합산, 큰 값, 켜고 끄는 키만 쓴다(나중 줄이 이기는 키면 같은 효과의 장비 수치를 덮는다).
const COMPOSABLE = new Set(['projectileDoubleStrikePct', 'projectileTargetBonus', 'hitShockedEnemyDamageMorePct', 'warcryResonanceBelt',
    'dsAndTargetAnyBonus', 'cosmosSpeedBurst', 'genericTakenDamageReducePct', 'underdogNonMaxRollMorePct', 'cosmosSustain', 'realmAllMaxRes',
    'cosmosPenetration', 'igniteDamageMorePct', 'overkillSplash', 'uniqueMinDmgRoll', 'uniqueDeflectDamageReduce', 'uniqueBlockChance',
    'uniqueTakenReduceWhen2Enemies', 'chaosTakenDamageReducePct', 'overhealCapPct', 'uniqueTakenReduceWhen1Enemy', 'instakillNormalOnHitPct',
    'summonEfficiencyBonus', 'summonCapBonus', 'lifePctAsEnergyShield', 'immuneIgnite', 'cosmosFinalDmg', 'instantLeechAndDoubleDamage',
    'poisonDamageMorePct', 'realmPoisonDuration']);
const cardDefs = json('TALENT_BLOOM_CARD_DEFS');
const cardRules = json('TALENT_PRECISE_CARD_RULES');
const labelled = new Set(json('Object.keys(TALENT_UNIQ_LABELS)'));
const newCards = cards.filter(id => NEW_SIX.includes(id.split('__')[1]));
assert.equal(newCards.length, 60);
assert.equal(new Set(newCards.map(id => cardDefs[id].name)).size, 60, 'every new card has its own name');
for (const id of newCards) {
    const uniques = cardRules[id].uniques || [];
    assert.equal(uniques.length, 1, `${id}: one unique effect`);
    checkUniqueLine(id, uniques[0]);
    assert.ok(labelled.has(uniques[0].key), `${id}: ${uniques[0].key} has a card label`);
    assert.ok(COMPOSABLE.has(uniques[0].key), `${id}: ${uniques[0].key} sums, takes the larger value or is on/off`);
    assert.ok(!/[·]/.test(cardDefs[id].surface.desc), `${id}: no middle dot in the card text`);
}
for (const asc of NEW_SIX) {
    const keys = newCards.filter(id => id.endsWith('__' + asc)).map(id => cardRules[id].uniques[0].key);
    assert.equal(new Set(keys).size, 10, `${asc}: its ten cards give ten different effects`);
}

// 지난 루프처럼: 루프 초기화가 전직 배치를 기억하고, 같은 직업이면 고르기 화면이 그 전직을 내놓고 포인트만큼 같은 순서로 다시 산다.
const plan = json(`(() => {
    game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero2', selectedClassId: 'warrior' }); window.game = game;
    game.ascendClass = 'berserker'; game.ascendNodes = ['n1', 'n2', 'n3', 'n4']; game.ascendKeystones = ['bz2', 'bz1'];
    const cleared = rememberLoopAscendancyPlan(game);
    const remembered = JSON.parse(JSON.stringify(game.lastLoopAscendPlan));
    game.ascendClass = ''; game.ascendNodes = []; game.ascendKeystones = [];
    rememberLoopAscendancyPlan(game);
    const kept = game.lastLoopAscendPlan.ascendClass;
    const offered = renderLastLoopPlanCard().includes('지난 루프처럼: 버서커');
    game.ascendClass = 'berserker'; game.ascendPoints = 3; game.ascendKeystonePoints = 1;
    const placed = allocateLastLoopAscendPlan(game.lastLoopAscendPlan);
    const first = { nodes: game.ascendNodes.slice(), keystones: game.ascendKeystones.slice(), button: getAscendancyPlanContinueHtml() };
    game.ascendPoints = 2; game.ascendKeystonePoints = 1;
    const offerMore = getAscendancyPlanContinueHtml().includes('이어 하기');
    allocateLastLoopAscendPlan(game.lastLoopAscendPlan);
    const second = { nodes: game.ascendNodes.slice(), keystones: game.ascendKeystones.slice(), points: game.ascendPoints, button: getAscendancyPlanContinueHtml() };
    game.selectedClassId = 'archer'; game.ascendClass = '';
    const otherClass = renderLastLoopPlanCard().includes('지난 루프처럼');
    const saved = mergeDefaults({ heroSelectionInitialized: true, selectedClassId: 'warrior', lastLoopAscendPlan: { ascendClass: 'berserker', nodes: ['n1', 'x9', 'n13d', 'n1'], keystones: ['bz1', 'w8', 'bz9'] } }).lastLoopAscendPlan;
    const unknown = mergeDefaults({ heroSelectionInitialized: true, lastLoopAscendPlan: { ascendClass: 'templar', nodes: ['n1'], keystones: [] } }).lastLoopAscendPlan;
    return { cleared, remembered, kept, offered, placed, first, offerMore, second, otherClass, saved, unknown };
})()`);
assert.deepEqual(plan.cleared, ['bz2', 'bz1'], 'the loop reset still gets the keystones to clear');
assert.deepEqual(plan.remembered, { ascendClass: 'berserker', nodes: ['n1', 'n2', 'n3', 'n4'], keystones: ['bz2', 'bz1'] });
assert.equal(plan.kept, 'berserker', 'a loop without an ascendancy keeps the older plan');
assert.ok(plan.offered, 'the pick screen offers the remembered ascendancy of the same class');
assert.deepEqual([plan.first.nodes, plan.first.keystones, plan.placed], [['n1', 'n2', 'n3'], ['bz2'], 4], 'the remembered order, as far as points last');
assert.equal(plan.first.button, '', 'no continue button without points');
assert.ok(plan.offerMore, 'more points from a later trial bring the continue button');
assert.deepEqual([plan.second.nodes, plan.second.keystones, plan.second.points], [['n1', 'n2', 'n3', 'n4'], ['bz2', 'bz1'], 1]);
assert.equal(plan.second.button, '', 'nothing left in the plan, no button');
assert.equal(plan.otherClass, false, 'another class does not see the plan');
assert.deepEqual(plan.saved, { ascendClass: 'berserker', nodes: ['n1', 'n13d'], keystones: ['bz1', 'bz9'] }, 'loading keeps only node ids and this ascendancy\'s keystones');
assert.equal(plan.unknown, null, 'an unknown ascendancy plan is dropped');
assert.ok(fs.readFileSync('js/combat.js', 'utf8').includes('let clearedAscendKeystones = rememberLoopAscendancyPlan(game);'), 'the loop reset remembers the plan');

console.log('ascendancies: 6 classes x 3, keystones, old node values, stat and unique keystones (picked and twin), keystone lines before gear, twin pool, save boundary, 180 cards with 60 new unique cards, last-loop plan: OK');
