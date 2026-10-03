// 보조 콘텐츠 통합 6단계(2026-10-01): 별쐐기 제거. 별쐐기 허브 9개는 공허 소켓이 되고, 고유 별쐐기 11종은 요정의 고리로
// 굴리는 초월 공허 패시브로 옮겼다(블랙홀 · 안드로메다는 연결 규칙 그대로). 성좌 각성은 외곽 공허 소켓 여섯의 초월로 건다.
// 운석 낙하 지점은 남기고 보상만 정리한다(희귀 이상 장비; 별가루는 7단계에서 없앴다). 저장의 별쐐기 흔적은 보상 없이 사라진다(결정 4 · 8 · 9).
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// 정의가 없다: 별쐐기 규칙 · 상태 · 재화 · 해금 항목 · 저널.
assert.equal(run('typeof starWedgeRules'), 'undefined');
assert.equal(run('typeof ensureStarWedgeState'), 'undefined');
assert.equal(run("['meteorShard', 'incompleteStarWedge', 'starWedge'].some(key => key in ORB_DB)"), false);
assert.equal(run("'astralCore' in WALLET_CURRENCY_INFO"), false);
assert.equal(run("CONTENT_UNLOCK_CATALOG.some(def => def.id === 'meteor')"), false);
assert.equal(run("'starWedge' in defaultGame || ['meteorShard', 'astralCore'].some(key => key in defaultGame.currencies)"), false);
assert.equal(run('typeof JOURNAL_DB.star_wedge'), 'undefined');
assert.equal(run("'starDust' in ORB_DB"), false, 'star dust is gone (7단계)');

// 트리: 허브 9개는 공허 소켓(외곽 여섯은 성좌 각성 자리), 성률 선택지 · 별쐐기 표식은 남지 않는다.
const tree = json(`(() => {
    const nodes = Object.values(PASSIVE_TREE.nodes);
    return { voids: nodes.filter(n => n.kind === 'void').length,
        outer: nodes.filter(n => n.kind === 'void' && n.voidRing === 'outer').map(n => n.id).sort(),
        center: ['expansion_core_prism_05', 'expansion_core_prism_13', 'expansion_core_prism_21'].map(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind),
        remnants: nodes.filter(n => n.kind === 'hub' || n.kind === 'star_option' || n.starWedgeMode || n.socketType).length };
})()`);
assert.equal(tree.voids, 34);
assert.deepEqual(tree.outer, ['n06xz25l4b7', 'n4b35c5l4b7', 'n4pmrfnl4b7', 'n6byocll4b7', 'nh9myirl4b7', 'nm7jw7el4b7']);
assert.deepEqual(tree.center, ['void', 'void', 'void']);
assert.equal(tree.remnants, 0);

// 불러오기: 별쐐기 · 장착 · 변성 · 재화는 지우고 운석 낙하 지점 상태는 meteorSite로 옮긴다. 두 번 불러와도 같다.
const legacySave = {
    season: 8, level: 60, maxZoneId: 8,
    starWedge: { unlocked: true, skyRiftGauge: 55.5, skyRiftReady: true, activeMeteorTier: 12, meteorReturnZoneId: 3, entriesCleared: 2,
        constellationBuff: { stat: 'pctDmg', label: '피해', val: 4, permanent: true }, firstClearDone: true,
        wedges: [{ id: 5, lines: [{ stat: 'flatHp', val: 10 }] }], sockets: [{ nodeId: 'nh9myirl4b7', wedgeId: 5 }],
        nodeMutations: { pt_base_path_001: { currentStat: 'flatHp', currentVal: 5 } }, selectedWedgeId: 5 },
    currencies: { meteorShard: 40, astralCore: 3, incompleteStarWedge: 1, starWedge: 2, starDust: 7 },
    journalEntries: ['prologue', 'star_wedge'],
    contentProgression: { version: 7, highestLoop: 8, unlocked: ['craft', 'meteor'], inherited: [], paidCosts: { craft: 1, meteor: 1 } },
    voidPassives: { star_pluto_5_0: { stats: [{ id: 'flatHp', val: 20 }] } },
    retiredVoidPassives: { star_pluto_5_1: { stats: [] }, pt_void_south: { stats: [{ id: 'resAll', val: 3 }] } },
    woodsmanBuildSnapshot: { passives: [], starWedge: { wedges: [] } }
};
run(`window.legacyStarSave = ${JSON.stringify(legacySave)}; game = mergeDefaults(JSON.parse(JSON.stringify(window.legacyStarSave)));`);
const loaded = json(`({ star: 'starWedge' in game, site: game.meteorSite, currencies: game.currencies, journal: game.journalEntries,
    owned: [...game.contentProgression.unlocked, ...game.contentProgression.inherited],
    crafts: Object.keys(game.voidPassives), retired: Object.keys(game.retiredVoidPassives), snapshot: Object.keys(game.woodsmanBuildSnapshot) })`);
assert.equal(loaded.star, false, 'the star-wedge save is gone');
assert.deepEqual({ ...loaded.site, constellationBuff: null }, { unlocked: true, skyRiftGauge: 55.5, skyRiftReady: true, skyRiftMinTier: null,
    skyRiftAllCosmos: false, activeMeteorTier: 12, meteorReturnZoneId: 3, lastAnomalyAt: 0, skyRiftCarryGauge: 0, constellationBuff: null,
    entriesCleared: 2 }, 'gauge, tier, return zone and clears move to the meteor site');
assert.deepEqual(loaded.site.constellationBuff, legacySave.starWedge.constellationBuff, 'a permanent observation survives the move');
assert.deepEqual(['meteorShard', 'astralCore', 'incompleteStarWedge', 'starWedge', 'starDust'].filter(key => key in loaded.currencies), [],
    'star-wedge materials and star dust are dropped without compensation');
assert.ok(loaded.journal.includes('meteor_fall') && !loaded.journal.includes('star_wedge'), 'the star-wedge record becomes the meteor-site record');
assert.deepEqual(loaded.owned, ['craft'], 'the removed unlock entry drops out of the ledger');
assert.ok(!loaded.crafts.some(id => id.startsWith('star_')) && !loaded.retired.some(id => id.startsWith('star_')),
    'crafts on pluto-generated void nodes are gone for good');
assert.ok(loaded.retired.includes('pt_void_south'), 'crafts kept for ordinary void nodes stay');
assert.deepEqual(loaded.snapshot, ['passives'], 'the woodsman snapshot no longer carries star wedges');
const once = run('JSON.stringify(game)');
run('game = mergeDefaults(JSON.parse(JSON.stringify(game)));');
assert.equal(run('JSON.stringify(game)'), once, 'loading twice gives the same save');

// 운석 낙하 정산: 희귀 이상 장비만(재화 없음). 첫 정산은 저널을 남긴다.
run(`game = mergeDefaults({ season: 8, level: 60, maxZoneId: 8 }); game.meteorSite.activeMeteorTier = 12;`);
const before = json('game.currencies');
run('grantMeteorEncounterRewards()');
const after = json('game.currencies');
assert.deepEqual(Object.keys(after).filter(key => after[key] !== before[key]), [], 'the settlement pays no currency');
assert.equal(run("game.journalEntries.includes('meteor_fall')"), true);

// 초월 공허 패시브: 옛 고유 별쐐기 11종이 요정의 고리 목록에 있다.
const ids = json('TRANSCENDENT_VOID_PASSIVE_DB.map(def => def.id)');
['pluto', 'resonantStar', 'darkMatter', 'sun', 'blackHole', 'andromeda', 'comet', 'asteroidBelt', 'zeroGravity', 'satellite', 'supernova']
    .forEach(id => assert.ok(ids.includes(id), `${id} is a transcendent void`));
assert.deepEqual(json('[0, 0.79, 0.8, 0.959, 0.96, 0.991, 0.992, 0.9983, 0.9984, 0.9999].map(r => { const random = Math.random; Math.random = () => r; const v = rollPlutoVoidCount(); Math.random = random; return v; })'),
    [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], '명왕성 1~5개: 80% · 16% · 3.2% · 0.64% · 0.16%');

// 줄 배율과 수치: 태양 ×3(자기 줄), 암흑물질(한 줄짜리 다른 공허 ×2), 초신성(다른 공허 +값%), 공명별 · 혜성 · 무중력 · 위성.
run(`game = mergeDefaults({ level: 100, season: 10 });
    window.voids = Object.values(PASSIVE_TREE.nodes).filter(n => n.kind === 'void').map(n => n.id);
    window.craft = (id, stats, transcendent) => { game.voidPassives[id] = { rarity: transcendent ? 'transcendent' : 'magic', stats, transcendent }; };
    game.passives = window.voids.slice(0, 4);
    craft(voids[0], [{ id: 'flatHp', val: 30 }], null);
    craft(voids[1], [{ id: 'pctDmg', val: 6 }, { id: 'crit', val: 2 }], null);
    craft(voids[2], [{ id: 'flatHp', val: 40 }], { id: 'sun', value: 0, value2: 0 });
    craft(voids[3], [], { id: 'darkMatter', value: 0, value2: 0 });`);
const lines = id => json(`passiveRouting.voidStats(game.voidPassives['${id}'], game)`);
const voids = json('window.voids');
assert.deepEqual(lines(voids[0]), [{ id: 'flatHp', val: 60 }], 'dark matter doubles a one-line void');
assert.deepEqual(lines(voids[1]), [{ id: 'pctDmg', val: 6 }, { id: 'crit', val: 2 }], 'two-line voids are not doubled');
assert.deepEqual(lines(voids[2]), [{ id: 'flatHp', val: 120 }], 'the sun triples its own lines (and is not doubled as a transcendent)');
assert.deepEqual(lines(voids[3]), [], 'other transcendents have no ordinary lines');
run(`craft(voids[3], [], { id: 'supernova', value: 50, value2: 0 });`);
assert.deepEqual(lines(voids[0]), [{ id: 'flatHp', val: 45 }], 'a supernova raises other voids by its value');
const stat = (id, tr) => json(`(() => { craft('${id}', [], ${JSON.stringify(tr)}); return getTranscendentVoidPassiveStats('${id}', game.voidPassives['${id}'], getVirtualVoidPassiveCount()); })()`);
assert.deepEqual(stat(voids[3], { id: 'resonantStar', value: 1, value2: 0 }), [{ stat: 'suppCap', val: 1 }]);
assert.deepEqual(stat(voids[3], { id: 'comet', value: 24, value2: 0 }), [{ stat: 'move', val: 24 }]);
assert.deepEqual(stat(voids[3], { id: 'zeroGravity', value: 20, value2: 0 }), [{ stat: 'evasionPct', val: 20 }]);
assert.deepEqual(stat(voids[3], { id: 'satellite', value: 10, value2: 0 }), [{ stat: 'aspd', val: 10 }]);
// 명왕성은 공허 개수 간주로 '공허 하나당' 효과를 키운다.
run(`craft(voids[1], [], { id: 'pluto', value: 3, value2: 0 });`);
assert.equal(run('getVirtualVoidPassiveCount()'), 4 + 3);
assert.deepEqual(stat(voids[3], { id: 'overflowingVigor', value: 5, value2: 0 }), [{ stat: 'pctHp', val: 35 }]);
// 공명별은 실제 전투 능력치(보조 젬 한도)에 들어간다.
run(`craft(voids[3], [], null);`);
const suppBefore = run('getPlayerStats(false).suppCap');
run(`craft(voids[3], [], { id: 'resonantStar', value: 1, value2: 0 });`);
assert.equal(run('getPlayerStats(false).suppCap') - suppBefore, 1, 'resonant star adds one support gem slot');

// 요정의 고리: 태양이 나오면 직전 옵션을 지키고, 다른 결과는 옵션을 지운다.
run(`game.currencies.fairyRing = 2; game.voidPassives = {}; craft(voids[0], [{ id: 'flatHp', val: 30 }], null);`);
run(`{ const pool = TRANSCENDENT_VOID_PASSIVE_DB, sunAt = pool.findIndex(def => def.id === 'sun'), realRandom = Math.random; let calls = 0;
    Math.random = () => (calls++ === 0 ? 0.9 : (sunAt + 0.5) / pool.length);
    try { applyVoidPassiveCurrency(voids[0], 'fairyRing'); } finally { Math.random = realRandom; } }`);
assert.deepEqual(json(`game.voidPassives['${voids[0]}']`).stats, [{ id: 'flatHp', val: 30 }], 'the sun keeps the lines it was rolled on');
assert.equal(json(`game.voidPassives['${voids[0]}']`).transcendent.id, 'sun');

// 연결 규칙(작은 그래프): 블랙홀은 무료 연결 거점, 안드로메다는 반경 안 노드를 길 없이 할당. 사라지면 고립된 투자를 정산한다.
run(`PASSIVE_TREE.layoutVersion = -1;
    Object.keys(PASSIVE_TREE.nodes).forEach(id => delete PASSIVE_TREE.nodes[id]);
    PASSIVE_TREE.edges.length = 0;
    Object.assign(PASSIVE_TREE.nodes, {
        n0: { id: 'n0', kind: 'start', x: -100, y: 0 },
        a: { id: 'a', kind: 'path', stat: 'flatHp', val: 5, x: 0, y: 0 },
        hole: { id: 'hole', kind: 'void', x: 100, y: 0 },
        b: { id: 'b', kind: 'path', stat: 'flatHp', val: 5, x: 200, y: 0 },
        ring: { id: 'ring', kind: 'void', x: 1000, y: 0 },
        near: { id: 'near', kind: 'path', stat: 'pctDmg', val: 5, x: 1200, y: 0 },
        far: { id: 'far', kind: 'path', stat: 'pctDmg', val: 5, x: 1500, y: 0 }
    });
    PASSIVE_TREE.edges.push({ from: 'n0', to: 'a' }, { from: 'a', to: 'hole' }, { from: 'hole', to: 'b' }, { from: 'near', to: 'far' });
    game.passives = ['a', 'hole', 'b']; game.passivePoints = 0; game.voidPassives = {};
    craft('hole', [], { id: 'blackHole', value: 0, value2: 0 });`);
assert.equal(run("canRefundPassiveNode('a')"), true, 'a black hole keeps the far side connected, so the path to it can be refunded');
run(`game.passives = game.passives.filter(id => id !== 'a'); game.passivePoints += 1; refreshPassiveConnectivity();`);
assert.deepEqual(json('game.passives'), ['hole', 'b'], 'the far side stays connected through the black hole');
run(`craft('hole', [], null); refreshPassiveConnectivity();`);
assert.deepEqual(json('game.passives'), [], 'losing the black hole settles the isolated branch');
assert.equal(run('game.passivePoints'), 3, 'every settled node returns its point');
run(`game.passives = ['ring']; craft('ring', [], { id: 'andromeda', value: 0, value2: 0 }); game.passivePoints = 2; calculateReachableNodes();`);
assert.deepEqual(json("getPassiveActivationPath('near')"), ['near'], 'a node within the andromeda radius needs no path');
assert.deepEqual(json("getPassiveActivationPath('far')"), [], 'a node outside the radius still needs a path');
run(`activatePassivePath('near'); activatePassivePath('far');`);
assert.deepEqual(json('game.passives'), ['ring', 'near', 'far'], 'the free node becomes a connection root for its neighbours');
run(`craft('ring', [], null); refreshPassiveConnectivity();`);
assert.deepEqual(json('game.passives'), [], 'losing andromeda settles the nodes it allowed');
assert.equal(run('game.passivePoints'), 3);

// 창백한 푸른 점이 빌려준 포인트는 그 노드와 함께 사라지고, 다시 정산해도 늘지 않는다(옛 별쐐기 검사에서 옮김).
run(`game.passives = ['a', 'hole']; game.passivePoints = 0; craft('hole', [], { id: 'paleBlueDot', value: 10, value2: 0 });
    syncPaleBlueDotPassivePoints(null, game.voidPassives.hole.transcendent);`);
assert.equal(run('game.passivePoints'), 10);
run(`activatePassivePath('b');`);
assert.equal(run('game.passives.length + game.passivePoints'), 12);
run(`game.currencies.blightSpore = 5; craft('hole', [], null); syncPaleBlueDotPassivePoints({ id: 'paleBlueDot', value: 10 }, null);`);
assert.equal(run('passiveRouting.pointBudget(game)'), 2, 'removing borrowed points cannot leave excess allocations');
assert.equal(run('game.passives.length + game.passivePoints'), 2);
run('refreshPassiveConnectivity();');
assert.equal(run('game.passives.length + game.passivePoints'), 2, 'repeated settlement never creates more points');
console.log('smoke-star-wedge-removal passed');
