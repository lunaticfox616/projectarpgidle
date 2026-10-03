// 보조 콘텐츠 통합 7단계(2026-10-01): 아르카나 · 가지치기 · 전문가 · 별가루 제거. 재미에 크게 영향을 주던 전문가 해금은 해금 항목 셋
// (화석 복원 · 고급 홀씨 · 젬 각성)과 아틀라스 패시브 둘(여왕의 방: 지도 벌 이벤트, 떨어지는 별: 별자리 관측)로 옮겼다.
// 저장의 흔적은 보상 없이 지우되, 전문가 레벨로 이미 쓰던 기능은 새 해금 항목으로 이어 준다(결정 4 · 10 · 11).
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// 정의가 없다: 상태 · 함수 · 해금 항목 · 재화 · 저널.
for (const name of ['ensureExpertiseState', 'getExpertLevel', 'grantExpertExpByAction', 'createDefaultArcanaState',
    'getArcanaGemDamageBonus', 'normalizePruningTreeState', 'renderExpertiseUI']) {
    assert.equal(run(`typeof ${name}`), 'undefined', `${name} is gone`);
}
assert.deepEqual(['arcana', 'pruningTree', 'expertise'].filter(key => run(`'${key}' in defaultGame`)), []);
assert.deepEqual(['experts', 'pruning', 'arcana'].filter(id => run(`CONTENT_UNLOCK_CATALOG.some(def => def.id === '${id}')`)), []);
assert.equal(run("'starDust' in ORB_DB"), false);
assert.equal(run('typeof JOURNAL_DB.arcana_first_seal'), 'undefined');

// 새 자리: 해금 항목 셋, 아틀라스 패시브 둘.
assert.deepEqual(json(`Object.fromEntries(['fossilRestore', 'advancedSpores', 'gemAwakening'].map(id => {
    const def = CONTENT_UNLOCK_CATALOG.find(row => row.id === id);
    return [id, def && [def.after, def.minLoop, def.cost]];
}))`), { fossilRestore: ['fossil', 5, 1], advancedSpores: ['fossil', 8, 1], gemAwakening: ['engraving', 14, 2] });
assert.equal(run(`atlasPassives.has({ atlas: { passives: ['e_bT'] } }, 'beeEvents')`), true, '여왕의 방 turns on map bee events');
assert.equal(run(`atlasPassives.has({ atlas: { passives: ['e_k1'] } }, 'constellation')`), true, '떨어지는 별 turns on constellation observation');
assert.equal(run(`atlasPassives.has({ atlas: { passives: [] } }, 'beeEvents')`), false);

// 불러오기: 세 시스템 · 별가루 · 탭 · 알림 · 벌집 갈림길의 양봉업자 레벨을 지우고, 산 해금 항목 포인트는 돌려준다.
const legacySave = {
    season: 20, level: 90, maxZoneId: 29, currentZoneId: 'beehive_run',
    arcana: { version: 2, unlocked: true, cards: [{ uid: 1, cardId: 'star', obtainedLoop: 18 }], deckSlots: [1], equipmentSlots: { '무기': 1 } },
    pruningTree: { version: 2, unlocked: true, growthPoints: 4, nodeRanks: { root: 2 } },
    expertise: { levels: { mycologist: 8, gemEngraver: 11, astronomer: 6, beekeeper: 9 }, exp: {}, favors: { mycologist: 'spore' } },
    currencies: { starDust: 140, pollen: 30 },
    unlocks: { pruning: true, arcana: true, expertise: true, items: true },
    noti: { pruning: true, arcana: false, expertise: true },
    beehive: { unlockedPermanent: true, inRun: true, branchStep: 2, returnZoneId: 3,
        pendingChoice: { expertLevel: 9,
            a: { effect: 'pollen', amount: 10, timing: 'immediate', text: '[즉시 보상] 꽃가루 +10', expertLevel: 9 },
            b: { effect: 'honey', amount: 1, timing: 'wave', text: '[웨이브 보상] 벌꿀 +1' },
            c: { effect: 'pollen', amount: 20, timing: 'queen', text: '[여왕 보상] 꽃가루 +20' } } },
    settings: { tabLayouts: { desktop: { tabOrder: ['btn-tab-arcana', 'btn-tab-items'], tabPlacement: { 'btn-tab-pruning': 'top' } } } },
    contentProgression: { version: 7, highestLoop: 20, unlocked: ['craft', 'experts', 'pruning', 'arcana'], inherited: [],
        paidCosts: { craft: 1, experts: 2, pruning: 2, arcana: 2 } }
};
const load = save => run(`game = mergeDefaults(JSON.parse(${JSON.stringify(JSON.stringify(save))})); contentProgression.points(game).balance`);
const loadedBalance = load(legacySave);
const loaded = json(`({ keys: ['arcana', 'pruningTree', 'expertise'].filter(key => key in game),
    flags: ['arcana', 'pruning', 'expertise'].filter(key => key in game.unlocks || key in game.noti),
    starDust: 'starDust' in game.currencies, pollen: game.currencies.pollen, choice: game.beehive.pendingChoice,
    layout: game.settings.tabLayouts.desktop, unlocked: game.contentProgression.unlocked, inherited: game.contentProgression.inherited })`);
assert.deepEqual(loaded.keys, [], 'the three systems leave the save');
assert.deepEqual(loaded.flags, [], 'their tab unlocks and notices leave the save');
assert.equal(loaded.starDust, false, 'star dust is dropped without compensation');
assert.equal(loaded.pollen, 30, 'unrelated currencies stay');
assert.ok(loaded.choice && !('expertLevel' in loaded.choice) && !('expertLevel' in loaded.choice.a), 'the hive crossroad keeps its rewards without the beekeeper level');
assert.equal(loaded.choice.c.amount, 20);
assert.deepEqual(loaded.layout.tabOrder, ['btn-tab-items'], 'retired tabs leave the saved menu order');
assert.deepEqual(loaded.layout.tabPlacement, {}, 'retired tabs leave the saved menu placement');
assert.deepEqual(loaded.unlocked, ['craft'], 'the removed unlock entries leave the ledger');
assert.deepEqual([...loaded.inherited].sort(), ['advancedSpores', 'fossilRestore'],
    'mycologist Lv.8 keeps fossil restoring and advanced spores; gem engraver Lv.11 had no awakening yet');
const never = { ...legacySave, contentProgression: { ...legacySave.contentProgression, unlocked: ['craft'], paidCosts: { craft: 1 } } };
assert.equal(loadedBalance, load(never), 'the points spent on removed entries come back');
load(legacySave);
const once = run('JSON.stringify(game)');
run('game = mergeDefaults(JSON.parse(JSON.stringify(game)));');
assert.equal(run('JSON.stringify(game)'), once, 'loading twice gives the same save');

// 계승 문턱은 옛 최소 레벨: 균사학자 Lv.4 화석 복원 · Lv.7 고급 홀씨, 젬 각인사 Lv.12 젬 각성.
const inheritedFor = levels => (load({ season: 20, level: 90, maxZoneId: 29, expertise: { levels }, contentProgression: never.contentProgression }),
    json('game.contentProgression.inherited').filter(id => ['fossilRestore', 'advancedSpores', 'gemAwakening'].includes(id)).sort());
assert.deepEqual(inheritedFor({ mycologist: 3, gemEngraver: 12 }), ['gemAwakening']);
assert.deepEqual(inheritedFor({ mycologist: 4, gemEngraver: 1 }), ['fossilRestore']);
assert.deepEqual(inheritedFor({ mycologist: 6 }), ['fossilRestore']);
assert.deepEqual(inheritedFor({ mycologist: 7 }), ['advancedSpores', 'fossilRestore']);
assert.deepEqual(inheritedFor({}), []);

// 젬 각성: 각성 각인만 해금을 본다(나머지 창공 각인은 레벨 제한이 없어졌다).
run(`game = mergeDefaults({ season: 14, level: 90 }); game.contentProgression.inherited = ['support', 'research', 'engraving'];`);
assert.equal(run(`canUseSkyEnhancement('sky_awakened_force')`), false, 'awakened engravings wait for 젬 각성');
assert.equal(run(`canUseSkyEnhancement('sky_gemcraft_dot')`), true, 'ordinary engravings are open');
run(`game.contentProgression.inherited.push('gemAwakening')`);
assert.equal(run(`canUseSkyEnhancement('sky_awakened_force')`), true);

// 여왕의 방(e_bT): 아틀라스 지도 처치에서만 꽃가루 10개로 벌 이벤트가 일어난다(무작위 0 = 여왕벌: 꽃가루 +25 · 벌꿀 +1).
run(`game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero1', selectedClassId: 'warrior', season: 12, level: 100, maxZoneId: 29 });
    game.chaosRealm.unlocked = true; game.loopProgressCurrent.chaos20Cleared = true;
    game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id); contentProgression.sync(); atlas.sync(game);
    window.beeBase = JSON.stringify(game);`);
const beeKill = (passives, inMap) => json(`(() => {
    game = mergeDefaults(JSON.parse(window.beeBase));
    game.atlas.passives = ${JSON.stringify(passives)};
    game.currentZoneId = 3;
    if (${inMap}) {
        const map = Object.assign(atlasMaps.create('roots_0', 1, 'normal'), { uid: game.atlas.nextUid++ });
        game.atlas.stash.push(map);
        const why = atlas.begin(game, map.uid, 3);
        if (why) throw new Error(why);
        game.currentZoneId = ATLAS.zoneId;
    }
    game.currencies.pollen = 10; game.currencies.enchantedHoney = 0;
    const random = Math.random; Math.random = () => 0;
    try { rollLootForEnemy({ name: '시험 정예', isElite: true, isBoss: false, level: 30, maxHp: 100, hp: 0 }); } finally { Math.random = random; }
    return { zone: getZone(game.currentZoneId).type, pollen: game.currencies.pollen, honey: game.currencies.enchantedHoney || 0 };
})()`);
const withPassive = beeKill(['e_bT'], true);
assert.equal(withPassive.zone, 'atlasMap');
assert.deepEqual([withPassive.pollen, withPassive.honey], [25, 1], 'the queen event spends 10 pollen and pays 25 pollen and a honey');
assert.deepEqual([beeKill([], true).honey, beeKill(['e_bT'], false).honey], [0, 0], 'no bee events without the passive or outside atlas maps');
console.log('smoke-aux-system-removal passed');
