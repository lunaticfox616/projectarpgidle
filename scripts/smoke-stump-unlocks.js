// 그루터기 함 해금 1차(2026-10-07, docs/stump-box-unlocks-review-20261007.md): 수확 일지(A1), 보관함 확장(A2), 조합법 발견(B1),
// 뿌리 기억(B7), 저널 접붙이기 점수(C2). 조건은 저장하지 않고 계산하며, 저장되는 것은 수확 기록, 줄 선물 영수증, 알린 조합법뿐이다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const events = new EventTarget();
const ctx = buildGameRuntime({}, events);
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const fresh = extra => run(`game = mergeDefaults(${JSON.stringify(extra || {})}); window.game = game; contentProgression.sync(game);`);
const regressed = [];
events.addEventListener('project-idle:stump-box-regressed', event => regressed.push(event.detail));
// 판의 가운데 칸에 놓고 한 번 처치해 다 자라게 한다(드랍은 Math.random 0.999로 막는다). 처치 소식은 실제 사건 경로
// (stump-box-changed → 화면의 알림)를 타므로 알림, 소리, 기록은 모아 둔다.
run(`window.toasts = []; showGameToast = message => toasts.push(message); playUiFeedbackSound = () => {};
    window.logs = []; addLog = message => logs.push(message);
    Math.random = () => 0.999;
    window.growOne = (family, color, path) => {
        game.stumpBox.board = game.stumpBox.board.map(() => null);
        const item = stumpBox.createItem(game, { family, color, roll: 1 });
        stumpBox.place(game, item.id, 12, path);
        item.xp = stumpBox.need(item) - 1;
        stumpBox.onEnemyKilled(game, {});
        return item;
    };`);

// ── A1 수확 일지: 다 자랄 때만, 조합마다 한 번 ─────────────────────────────────
fresh({ journalEntries: ['prologue', 'act_10'] });
assert.deepEqual(json('game.stumpBox.harvest'), { grown: [], gifts: { flower: false, fruit: false, amber: false } }, 'a new box has an empty journal');
run(`growOne('seed', 'fire', 'flower')`);
assert.deepEqual(json('game.stumpBox.harvest.grown'), ['flower-fire'], 'the first grown fire flower is written');
const signature = run('getPersistentBuildSignature(game)');
run(`(() => { const item = stumpBox.createItem(game, { family: 'seed', color: 'cold', roll: 1 }); stumpBox.place(game, item.id, 7, 'fruit'); })()`);
const growing = run('getPersistentBuildSignature(game)');
run('stumpBox.onEnemyKilled(game, {})');
assert.equal(run('getPersistentBuildSignature(game)'), growing, 'a kill that grows nothing to the end keeps the build signature (xp is not in it)');
assert.notEqual(growing, signature);
run(`growOne('seed', 'fire', 'flower')`);
assert.deepEqual(json('game.stumpBox.harvest.grown'), ['flower-fire'], 'a second fire flower adds nothing');
['cold', 'lightning', 'chaos'].forEach(color => run(`growOne('seed', '${color}', 'flower')`));
assert.deepEqual(json('stumpBox.harvestRows(game)'), ['flower'], 'four flower colours fill the flower row');
assert.deepEqual(json('stumpBox.pendingGifts(game)'), ['flower']);
assert.match(json('toasts').at(-1), /카오스 꽃 다 자람.*, 수확 일지 선물을 받으세요$/, 'the ripening toast points at the waiting gift');
// 거름으로 다 자란 것도 적는다(growBy 한 곳).
run(`(() => { game.stumpBox.board = game.stumpBox.board.map(() => null);
    const sap = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }); stumpBox.place(game, sap.id, 12); sap.xp = stumpBox.need(sap) - 1;
    const food = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.compost(game, food.id); })()`);
assert.ok(run(`game.stumpBox.harvest.grown.includes('amber-cold')`), 'compost that finishes a sap writes its amber');
// 부적은 색이 없어 적지 않는다.
run(`game.contentProgression.inherited.push('talisman'); contentProgression.sync(game); game.stumpBox.board = game.stumpBox.board.map(() => null);
    (() => { const t = stumpBox.addTalisman(game, { name: 'x', rarity: 'magic', lines: [{ kind: 'stat', id: 'pctDmg', value: 5 }] }, true);
        stumpBox.place(game, t.id, 12); t.xp = stumpBox.need(t) - 1; stumpBox.onEnemyKilled(game, {}); })()`);
assert.equal(run('game.stumpBox.harvest.grown.length'), 5, 'a talisman never enters the journal');

// 줄 선물: 고른 색 씨앗(꽃, 열매 줄)이나 수액(호박석 줄) 1개, 품질 120%, 줄마다 한 번. 채우지 않은 줄과 가득 찬 보관함은 기다린다.
const gift = json(`stumpBox.claimHarvestGift(game, 'flower', 'chaos')`);
assert.deepEqual([gift.family, gift.color, gift.roll], ['seed', 'chaos', 1.2]);
assert.equal(run(`stumpBox.claimHarvestGift(game, 'flower', 'cold')`), null, 'once per row');
assert.equal(run(`stumpBox.claimHarvestGift(game, 'fruit', 'cold')`), null, 'not before the row is full');
run(`game.stumpBox.harvest.grown = ['amber-fire', 'amber-cold', 'amber-lightning', 'amber-chaos'];
    while (stumpBox.createItem(game, { family: 'sap', color: 'chaos' })) {}`);
assert.equal(run(`stumpBox.claimHarvestGift(game, 'amber', 'fire')`), null, 'a full storage leaves the gift waiting');
assert.deepEqual(json('stumpBox.pendingGifts(game)'), ['amber']);
run('game.stumpBox.items.splice(0, 5);');
assert.equal(json(`stumpBox.claimHarvestGift(game, 'amber', 'fire')`).family, 'sap', 'the amber row gives a sap');

// 예전 저장: 지금 다 자란 것으로 한 번 채운다. 모르는 키와 중복은 버리고, 영수증은 true만. 두 번 불러도 같다.
run(`game = mergeDefaults({ season: 3, loopCount: 2, stumpBox: { acquired: true, nextId: 5,
    items: [{ id: 1, family: 'sap', color: 'cold', xp: 500 }, { id: 2, family: 'seed', color: 'fire', path: 'fruit', xp: 9999 }], board: [1, 2],
    harvest: { grown: ['nope', 'flower-chaos', 'flower-chaos', 7], gifts: { amber: 'yes', fruit: true } } } }); window.game = game;`);
assert.deepEqual(json('game.stumpBox.harvest'), { grown: ['flower-chaos', 'fruit-fire', 'amber-cold'], gifts: { flower: false, fruit: true, amber: false } });
const once = run('JSON.stringify(game.stumpBox)');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.equal(run('JSON.stringify(game.stumpBox)'), once, 'restoring twice gives the same box');

// ── A2 보관함 50 → 75(일지 한 줄) → 100(저널 미궁 10), 따로따로 ───────────────────
fresh({ journalEntries: ['prologue', 'act_10'] });
assert.equal(run('stumpBox.storageLimit(game)'), 50);
run(`game.journalEntries.push('labyrinth_10');`);
assert.equal(run('stumpBox.storageLimit(game)'), 75, 'the labyrinth page alone gives +25');
run(`game.stumpBox.harvest.grown = ['amber-fire', 'amber-cold', 'amber-lightning', 'amber-chaos'];`);
assert.equal(run('stumpBox.storageLimit(game)'), 100, 'a full journal row gives the other +25');
run('while (stumpBox.createItem(game, { family: "sap", color: "chaos" })) {}');
assert.equal(run('stumpBox.storage(game).length'), 100);
run(`game.contentProgression.inherited.push('talisman'); contentProgression.sync(game); game.currencies.sealShard = 5;`);
assert.equal(json(`talismans.unseal('sealShard', game)`).reason, '그루터기 함 보관함이 가득 찼습니다.', 'unsealing checks the same limit');
run(`game.journalEntries = game.journalEntries.filter(id => id !== 'labyrinth_10');`);
assert.equal(run('stumpBox.storage(game).length'), 100, 'a lower limit never deletes what is stored');
assert.equal(run('stumpBox.createItem(game, { family: "sap", color: "fire" })'), null);

// ── B7 뿌리 기억: 새 루프에 다 자란 것이 0, 25%(루프 10), 50%(저널 잔상) 자란 채로 ────────────
const regressAt = extra => {
    fresh(extra);
    run(`window.ripeSeed = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, ripeSeed.id, 12, 'flower'); ripeSeed.xp = 400; ripeSeed.ripe = true;
        window.ripeSap = stumpBox.createItem(game, { family: 'sap', color: 'lightning', roll: 1 }); stumpBox.place(game, ripeSap.id, 6); ripeSap.xp = 500; ripeSap.ripe = true;
        window.halfSeed = stumpBox.createItem(game, { family: 'seed', color: 'chaos', roll: 1 }); stumpBox.place(game, halfSeed.id, 8, 'fruit'); halfSeed.xp = 30;`);
    const count = run('stumpBox.regress(game)');
    return { count, seed: run('ripeSeed.xp'), sap: run('ripeSap.xp'), half: run('halfSeed.xp'), stage: run('stumpBox.stageOf(ripeSeed)'), again: run('stumpBox.regress(game)') };
};
assert.deepEqual(regressAt({ season: 9, loopCount: 8 }), { count: 2, seed: 0, sap: 0, half: 30, stage: 'seed', again: 0 });
assert.deepEqual(regressAt({ season: 10, loopCount: 9 }), { count: 2, seed: 100, sap: 125, half: 30, stage: 'seed', again: 0 });
assert.deepEqual(regressAt({ season: 12, loopCount: 11, journalEntries: ['prologue', 'act_10', 'woodsman', 'woodsman_echo'] }),
    { count: 2, seed: 200, sap: 250, half: 30, stage: 'sprout', again: 0 }, 'half of a seed is already a sprout');
assert.deepEqual(regressed.map(row => [row.count, row.keepPct]), [[2, 0], [2, 25], [2, 50]], 'regress says what it kept');
fresh({ season: 9, loopCount: 8, level: 90 });
run(`window.loopSeed = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, loopSeed.id, 12, 'flower'); loopSeed.xp = 400; loopSeed.ripe = true;
    game.pendingLoopReady = true; triggerSeasonReset('chaos');`);
assert.deepEqual([run('game.season'), run('loopSeed.xp')], [10, 100], 'entering loop 10 already keeps 25%');

// ── C2 저널 접붙이기 점수: 정점 4개 +3, 버려진 날 6개 +2(최대 +24) ─────────────────────
fresh({ season: 31, loopCount: 30, journalEntries: ['prologue', 'act_10', 'pinnacle_underking', 'rival_overheat'] });
assert.deepEqual(json('stumpBox.graftPoints(game)'), { earned: 42 + 5, spent: 0, free: 47 });
run(`game.journalEntries.push(...Object.keys(STUMP_BOX_GRAFT.journalPoints), 'pinnacle_sky');`);
assert.equal(run('stumpBox.graftJournalPoints(game)'), 24, 'a page counts once, at most +24');
assert.ok(json('Object.keys(STUMP_BOX_GRAFT.journalPoints)').every(id => run(`!!JOURNAL_DB['${id}']`)), 'every scored page exists');
fresh({ season: 31, loopCount: 30, journalEntries: ['prologue', 'act_10', 'pinnacle_underking', 'rival_overheat'],
    stumpBox: { acquired: true, items: [], board: [], graft: [5, 5, 5, 1] } });
assert.deepEqual(json('game.stumpBox.graft.slice(0, 4)'), [5, 5, 5, 1], '46 of 47 spent loads (journal points count in the budget)');
fresh({ season: 31, loopCount: 30, stumpBox: { acquired: true, items: [], board: [], graft: [5, 5, 5, 1] } });
assert.deepEqual(json('game.stumpBox.graft.slice(0, 4)'), [5, 5, 4, 1], 'without the pages only 42 are earned');

// ── B1 조합법 발견: 책에는 재료가 생길 수 있게 된 조합법만, 새로 열린 것은 한 번 알린다 ─────────────
fresh({ journalEntries: ['prologue', 'act_10'] });
assert.deepEqual(json('stumpCube.revealed(game).map(recipe => recipe.id)'), ['stump_merge'], 'a new box shows only the merge');
assert.deepEqual(json('stumpCube.learn(game)'), [], 'the first call records silently');
run(`toasts.length = 0; logs.length = 0; growOne('seed', 'cold', 'fruit')`);
assert.deepEqual(json('game.stumpCube.known'), ['equip_magic_upgrade', 'equip_unique_reroll', 'stump_merge'], 'the first grown seed opens two');
assert.deepEqual(json('toasts.slice(1)'), ['새 조합법: 마법 장비 승급, 고유 장비 순환'], 'the ripening news announces them');
assert.ok(json('logs').includes('🧩 새 조합법: 마법 장비 승급, 고유 장비 순환'));
assert.deepEqual(json('stumpCube.learn(game)'), [], 'and only once');
assert.equal(json('stumpCube.match(game)'), null, 'hidden or not, matching is unchanged (an empty cube)');
run('stumpCube.clear(game); game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.deepEqual(json('game.stumpCube.known'), ['equip_magic_upgrade', 'equip_unique_reroll', 'stump_merge'], 'what was learned survives clear and reload');
run(`game.contentProgression.inherited.push('jewel', 'talisman', 'cube'); contentProgression.sync(game);`);
assert.deepEqual(json('stumpCube.learn(game).map(recipe => recipe.id)'), ['equip_socket_jewel', 'talisman_upgrade', 'talisman_unique_reroll', 'jewel_fuse', 'core_reroll'],
    'buying jewels, talismans and the cube opens their recipes');
const book = run('(() => { stumpCubeUi.toggleCubeBook(); return stumpCubeUi.cubeHtml(); })()');
// 2026-10-08: 호박석 기폭제(12번 루프 32)가 열한 번째 조합법이다(호박석을 거두고 루프 32가 되면 보인다).
assert.ok(book.includes('조합법 8/11') && book.includes('아직 모르는 조합법 3개'), 'the book shows the open ones and counts the rest');
assert.ok(!book.includes('희귀 장비 단련'), 'an amber recipe stays hidden before any amber grows');

// ── 화면 조각과 알림 ─────────────────────────────────────────────────────────
fresh({ journalEntries: ['prologue', 'act_10'] });
run(`game.stumpBox.harvest.grown = ['flower-fire', 'flower-cold', 'flower-lightning', 'flower-chaos', 'amber-fire'];`);
const journal = run('stumpHarvestUi.journalHtml()');
assert.equal((journal.match(/stump-harvest-cell is-on/g) || []).length, 5, 'grown entries are lit');
assert.equal((journal.match(/stump-harvest-cell/g) || []).length, 12, 'twelve entries');
assert.ok(journal.includes('수확 일지 <small>5/12</small>') && journal.includes('숨은 저널') && !journal.includes('잔상'), 'a hidden page keeps its name');
const gifts = run('stumpHarvestUi.giftsHtml()');
assert.equal((gifts.match(/data-stump-action="harvest-gift" data-row="flower"/g) || []).length, 4, 'the flower row offers four colours');
run('game.seenTutorials = []; tutorialQueue.length = 0; game.journalEntries.push("labyrinth_10"); stumpHarvestUi.announceUnlocks();');
assert.equal(run('tutorialQueue.length'), 1, 'two unlocks at once make one card');
assert.ok(run('tutorialQueue[0].body').includes('보관함 +25칸 (수확 일지 1줄)') && run('tutorialQueue[0].body').includes("저널 '고대 미궁 - 열 번째 문'"));
run('stumpHarvestUi.announceUnlocks();');
assert.equal(run('tutorialQueue.length'), 1, 'and never again');
assert.ok(!/[·—]/.test(journal + gifts + run('tutorialQueue[0].body')), 'no middle dots or dashes in the new text');

// ── 시작 선물(2026-10-07 사용자 결정): 고르지 않고 함을 얻으면 바로 준다. 씨앗은 지금 젬의 원소 꽃(물리면 화염 열매), 수액은
//    씨앗의 상극이 아닌 가장 약한 저항. '따라 해보기'로 판에 놓고, 안내를 닫으면 판 가운데부터 대신 놓는다.
fresh({ journalEntries: ['prologue'] });
run(`game.activeSkill = '서리 폭발';`);
assert.deepEqual(json(`stumpBox.starterChoice(game, { resF: 0, resC: 10, resL: 20 })`), { seed: { color: 'cold', path: 'flower' }, sap: 'cold' },
    'a cold spell gets a cold flower; the sap skips fire (the cold opposite) and takes the weaker of cold and lightning');
run(`game.activeSkill = '번개 타격';`);
assert.equal(json(`stumpBox.starterChoice(game, {})`).seed.color, 'lightning', "the skill element 'light' is the lightning colour");
run(`game.activeSkill = '연속 베기';`);
assert.deepEqual(json(`stumpBox.starterChoice(game, { resF: 0, resC: -5, resL: 20 })`), { seed: { color: 'fire', path: 'fruit' }, sap: 'fire' },
    'a physical skill gets a fire fruit (boss damage), and never a cold sap beside it');
run(`tutorialQueue.length = 0; game.seenTutorials = []; game.journalEntries.push('act_10'); toasts.length = 0; stumpBoxUi.checkStumpBoxUnlock();`);
assert.deepEqual(json('[game.stumpBox.acquired, game.stumpBox.starter]'), [true, { seed: true, sap: true }], 'the box comes with its starter gift');
assert.deepEqual(json('stumpBox.storage(game).map(item => [item.family, item.color, item.path])'), [['seed', 'fire', 'fruit'], ['sap', 'fire', null]]);
assert.deepEqual(json('tutorialQueue.map(row => row.key)'), ['unlock_stump_box'], 'one card introduces the box and its gift');
run('stumpBoxUi.checkStumpBoxUnlock();');
assert.deepEqual(json('tutorialQueue.map(row => row.key)'), ['unlock_stump_box'], 'the next unlock check adds no second card');
assert.ok(run(`tutorialActionUi.requiresAttention(tutorialQueue[0]) && !!tutorialActionUi.guideFor('unlock_stump_box')`), 'the card stays open and offers 따라 해보기');
assert.equal(run(`tutorialOpenLabel(tutorialQueue[0])`), '따라 해보기');
assert.deepEqual(json(`stumpBox.grantStarter(game, {})`), [], 'the gift is given once');
run(`plantSkippedStumpStarter('unlock_stump_box')`);
assert.deepEqual(json('[12, 7].map(cell => stumpBox.itemById(game, game.stumpBox.board[cell]).family)'), ['seed', 'sap'], 'closing the guide plants the gift from the centre');
assert.equal(run('stumpBox.evaluate(game).suppressed.size'), 0, 'and nothing is blocked by an opposite colour');
assert.deepEqual(json('toasts'), ['그루터기 함: 받은 씨앗과 수액을 판에 놓았습니다']);
assert.equal(run(`tutorialActionUi.guideFor('unlock_stump_box')`), null, 'nothing left to place, no guide');
// 함 안내를 예전에 본 저장(선물을 받지 않고 판도 비어 있음): 선물을 주고 놓는 법만 따로 한 번 안내한다.
fresh({ season: 3, loopCount: 2, seenTutorials: ['unlock_stump_box'] });
run(`tutorialQueue.length = 0; stumpBoxUi.checkStumpBoxUnlock();`);
assert.deepEqual(json('[stumpBox.storage(game).length, tutorialQueue.map(row => row.key)]'), [2, ['tutorial_stump_starter']]);
assert.ok(run(`!!tutorialActionUi.guideFor('tutorial_stump_starter')`), 'the old-save card leads the same guide');
assert.ok(!/[·—]/.test(run('tutorialQueue[0].body')));

console.log('stump unlocks: harvest journal, row gifts, storage 50/75/100, recipe discovery, root memory, journal graft points, starter gift, screen: OK');
