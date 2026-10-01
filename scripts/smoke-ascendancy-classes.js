// 전직 18종(2026-10-02): 직업 6개마다 전직 3종. 직업별 전직 셋, 키스톤 구조 · id 고유, 기존 12종의 노드 값이 개편 전과 같음(지문),
// 새 여섯의 키스톤이 능력치 줄로 실제 힘을 바꿈(고른 것 · 우주계 쌍둥이), 쌍둥이 키스톤 풀, 저장 경계, 재능 개화 카드 180종.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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
for (const asc of ['berserker', 'juggernaut', 'bladedancer', 'stormarcher', 'grovewarden', 'bombardier']) {
    keystones[asc].forEach(node => {
        assert.ok(node.desc && node.stats.length, `${node.id} has a description and stat lines`);
        node.stats.forEach(line => assert.ok(statIds.has(line.stat) && Number.isFinite(line.val), `${node.id}: ${line.stat}`));
    });
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

console.log('ascendancies: 6 classes x 3, keystones, old node values, stat keystones (picked and twin), twin pool, save boundary, 180 cards: OK');
