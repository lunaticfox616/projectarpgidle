// 그루터기 함 16번(2026-10-08, docs/stump-box-unlocks-review-20261007.md): 다 자라는 순간의 굴림(풍작, 황금, 추가 줄 0~3개),
// 봉인 칸(루프 23, 29, 37), 품질 상한(루프 35, 45)과 접붙이기 6단계, 포식(불씨의 흉터), 번식, 씨앗 주머니, 거름 한꺼번에,
// 부적 도감, 저장 경계, 화면 단추. 난수는 줄(rolls)로 고정한다(비면 0.5: 풍작 없음, 황금 없음, 추가 줄 없음).
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const events = new EventTarget();
const ctx = buildGameRuntime({}, events);
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const regressed = [];
events.addEventListener('project-idle:stump-box-regressed', event => regressed.push(event.detail));
const rolls = list => run(`rolls = ${JSON.stringify(list)};`);
const atLoop = loop => run(`game.season = ${loop}; game.contentProgression.highestLoop = ${loop};`);
/** MOORE order (js/stump-box.js): the roll that makes a scar bite its k-th neighbour. */
const bite = k => (k + 0.5) / 8;

run(`window.rolls = []; Math.random = () => (rolls.length ? rolls.shift() : 0.5);
    window.toasts = []; showGameToast = message => toasts.push(message); playUiFeedbackSound = () => {};
    window.logs = []; addLog = message => logs.push(message);
    game = mergeDefaults({ journalEntries: ['prologue', 'act_10'] }); window.game = game; contentProgression.sync(game);
    window.clearBoard = () => { const box = game.stumpBox; box.board = box.board.map(() => null); box.items = []; box.sealed = []; box.graft = box.graft.map(() => 0); };
    window.grown = (family, color, cell, path, harvest) => {
        const item = stumpBox.createItem(game, { family, color, roll: 1 });
        stumpBox.place(game, item.id, cell, path);
        item.xp = stumpBox.need(item); item.ripe = true;
        if (harvest) item.harvest = harvest;
        return item;
    };
    window.sprout = (family, color, cell, path, roll) => {
        const item = stumpBox.createItem(game, { family, color, roll: 1 });
        if (roll) item.roll = roll;
        stumpBox.place(game, item.id, cell, path);
        item.xp = stumpBox.need(item) - 1;
        return item;
    };`);
assert.equal(run('game.stumpBox.acquired'), true, 'the act-10 save has the box');
assert.equal(run(`stumpBox.bulkCompostReason(game, 'fire')`), '수확 일지를 4칸 채우면 열립니다.', 'bulk compost waits for four journal cells');

// ── 다 자라는 순간의 굴림 ─────────────────────────────────────────────
atLoop(10);
run(`clearBoard(); window.plain = sprout('seed', 'fire', 12, 'flower');`);
rolls([]);
run('stumpBox.grow(game, {})');
assert.deepEqual(json('plain.harvest'), { bonus: 0, golden: false, lines: [] }, 'a middling roll ripens plainly');
assert.deepEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 6 }, 'a plain fire flower gives its one line');

run(`clearBoard(); window.lucky = sprout('seed', 'fire', 12, 'flower');`);
// 풍작(0.01 < 8%), 황금(0.001 < 0.5%), 줄 수 0.9(품질 110%의 확률표에서 2줄), 줄마다 고르기와 값
rolls([0.01, 0.001, 0.9, 0, 0.5, 0.99, 0]);
run('stumpBox.grow(game, {})');
assert.deepEqual(json('lucky.harvest'), { bonus: 0.1, golden: true, lines: [{ stat: 'igniteChance', value: 3 }, { stat: 'resPen', value: 1.05 }] },
    'bumper, golden and two different lines from the fire flower pool');
assert.deepEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 7.92, igniteChance: 3.96, resPen: 1.39 },
    'every line × quality (100% + 10%) × golden 1.2');
assert.equal(run('stumpBox.label(lucky)'), '황금 화염 꽃', 'a golden item says so in its name');

// 같은 굴림이라도 품질이 높을수록 줄이 많아질 확률이 오른다(품질로 정해지지 않는다).
const linesAt = roll => {
    run(`clearBoard(); window.probe = sprout('seed', 'cold', 12, 'flower', ${roll});`);
    rolls([0.5, 0.5, 0.99]);
    run('stumpBox.grow(game, {})');
    return run('probe.harvest.lines.length');
};
assert.deepEqual([linesAt(0.8), linesAt(1.5)], [2, 3], 'the same roll gives 80% quality two lines and 150% three');

// ── 봉인 칸: 루프 23, 29, 37에 하나씩(무료) ─────────────────────────────
atLoop(22);
assert.deepEqual(json(`[stumpBox.sealLimit(game), stumpBox.sealReason(game, 12), stumpBox.toggleSeal(game, 12)]`), [0, '봉인 칸은 루프 23부터 열립니다.', false]);
atLoop(23);
assert.equal(run('stumpBox.sealLimit(game)'), 1, 'loop 23 opens one seal cell');
run('clearBoard();');
assert.equal(run('stumpBox.toggleSeal(game, 12)'), true);
assert.equal(run('stumpBox.sealReason(game, 7)'), '봉인 칸은 1개까지입니다.', 'no more than the unlocks allow');
assert.equal(run('stumpBox.toggleSeal(game, 12) && game.stumpBox.sealed.length'), 0, 'sealing again unseals');
atLoop(29);
assert.equal(run('stumpBox.sealLimit(game)'), 2);
atLoop(37);
assert.equal(run('stumpBox.sealLimit(game)'), 3);

// 봉인 칸의 다 자란 것은 줄까지 그대로 루프를 넘기고, 나머지는 굴림을 지우고 돌아간다(뿌리 기억 25%).
run(`clearBoard(); game.stumpBox.sealed = [12];
    window.kept = grown('seed', 'fire', 12, 'flower', { bonus: 0.1, golden: true, lines: [{ stat: 'igniteChance', value: 3 }] });
    window.back = grown('sap', 'lightning', 7, null, { bonus: 0, golden: false, lines: [{ stat: 'pctHp', value: 2 }] });`);
regressed.length = 0;
run('logs.length = 0; stumpBox.regress(game);');
assert.deepEqual(json('[kept.ripe, kept.harvest, back.ripe, back.xp, back.harvest === undefined]'),
    [true, { bonus: 0.1, golden: true, lines: [{ stat: 'igniteChance', value: 3 }] }, false, 125, true], 'the sealed flower keeps everything');
assert.deepEqual(regressed.map(detail => [detail.count, detail.sealed, detail.keepPct]), [[1, 1, 25]]);
assert.ok(json('logs').some(line => /봉인 칸의 1개가 다 자란 채로 루프를 넘겼습니다/.test(line)), 'the new loop says what the seal kept');

// ── 품질 상한(루프 35 140%, 루프 45 150%)과 접붙이기 6단계 ───────────────
const capAt = loop => { atLoop(loop); run('clearBoard();'); return json(`[stumpBox.rollCap(game), stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1.6 }).roll, stumpBox.graftMaxRank(game)]`); };
assert.deepEqual([capAt(34), capAt(35), capAt(45)], [[1.3, 1.3, 5], [1.4, 1.4, 5], [1.5, 1.5, 6]]);
const merge = loop => {
    atLoop(loop);
    return json(`(() => { clearBoard(); const list = [1.45, 1.3, 1.2].map(roll => { const item = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); item.roll = roll; return item; });
        list[2].golden = true; const out = stumpCubeRecipes.run('stump_merge', [list.map(item => ({ kind: 'stump', item }))], game);
        return [out.outputs[0].spec.roll, out.outputs[0].spec.golden]; })()`);
};
assert.deepEqual([merge(35), merge(45)], [[1.4, true], [1.5, true]], 'merging tops out at the reached cap and keeps golden');

// ── 포식: 불씨의 흉터 ─────────────────────────────────────────────────
atLoop(22);
run('clearBoard(); game.stumpBox.scarGift = false;');
assert.deepEqual(json(`[stumpBox.devourOpen(game), stumpBox.grantScar(game), stumpBox.rollScarDrop(game, () => 0)]`), [false, null, null], 'no scars before loop 23');
atLoop(23);
assert.equal(run('stumpBox.grantScar(game).family'), 'scar', 'devouring opens with one scar');
assert.equal(run('stumpBox.grantScar(game)'), null, 'only once');
run(`window.scar = game.stumpBox.items.find(item => item.family === 'scar'); stumpBox.place(game, scar.id, 12);`);
assert.equal(run('stumpBox.growingItems(game).includes(scar)'), true, 'a sleeping scar wakes on the board like a seed grows');
run(`scar.xp = stumpBox.need(scar); scar.ripe = true; stumpBox.toggleSeal(game, 12);
    window.meal = grown('seed', 'fire', 7, 'flower', { bonus: 0, golden: false, lines: [{ stat: 'igniteChance', value: 3 }] });`);
regressed.length = 0;
rolls([bite(1)]);
run('logs.length = 0; stumpBox.regress(game);');
assert.deepEqual(json('scar.absorbed'), { firePctDmg: 3, igniteChance: 1.5 }, 'it eats the grown flower above it: half of every line');
assert.deepEqual(json('[scar.meals, scar.misses, scar.ripe, game.stumpBox.board[7], stumpBox.itemById(game, meal.id)]'), [1, 0, true, null, null],
    'the meal is gone and the sealed scar stays awake');
assert.equal(regressed[0].eaten[0].ate, '화염 꽃');
assert.ok(json('logs').includes('🔥 불씨의 흉터가 화염 꽃을 먹었습니다: 화염 피해 +3%, 점화 확률 +1.5%'), 'the log says what it ate and gained');
assert.deepEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 3, igniteChance: 1.5 }, 'an awake scar on the board gives what it holds');
run('game.stumpBox.graft[12] = 2;');
assert.deepEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 3.6, igniteChance: 1.8 }, 'its cell graft counts (+20%)');
run('game.stumpBox.graft[12] = 0;');

// 빈칸, 부적, 판 밖을 고르면 그 루프의 기회가 사라진다.
rolls([bite(0)]);
run('stumpBox.regress(game);');
run(`window.charm = stumpBox.addTalisman(game, { name: 'x', rarity: 'magic', lines: [{ kind: 'stat', id: 'pctDmg', value: 5 }] }, true); stumpBox.place(game, charm.id, 13);`);
rolls([bite(4)]);
run('stumpBox.regress(game);');
assert.deepEqual(json('[scar.misses, stumpBox.cellOf(game, charm.id)]'), [2, 13], 'an empty cell and a talisman are missed chances; the talisman stays');
run('stumpBox.toggleSeal(game, 12); stumpBox.move(game, scar.id, 0); stumpBox.toggleSeal(game, 0);');
rolls([bite(0)]);
run('stumpBox.regress(game);');
assert.equal(run('scar.misses'), 3, 'off the board (the corner) is a miss too');
// 흡수는 능력치마다 그 능력치의 가장 큰 기준값 × 3까지(화염 피해 6 × 3 = 18).
run(`scar.absorbed.firePctDmg = 17; grown('seed', 'fire', 1, 'flower');`);
rolls([bite(4)]);
run('stumpBox.regress(game);');
assert.equal(run('scar.absorbed.firePctDmg'), 18, 'absorbing stops at the cap');
// 자라는 중인 것은 4분의 1만.
run(`window.young = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }); stumpBox.place(game, young.id, 5);`);
rolls([bite(6)]);
run('stumpBox.regress(game);');
assert.equal(run('scar.absorbed.resC'), 1.25, 'a growing sap gives a quarter of its line (cold resistance 5 × 0.25)');
// 봉인을 풀면 루프를 넘길 때(먹은 뒤) 잠든다. 흡수한 것은 남지만 잠든 동안은 주지 않는다.
run('stumpBox.toggleSeal(game, 0);');
rolls([bite(0)]);
run('stumpBox.regress(game);');
assert.deepEqual(json('[scar.ripe, scar.xp, scar.absorbed.firePctDmg, stumpBox.label(scar)]'), [false, 100, 18, '불씨의 흉터 (잠듦)']);
assert.equal(run('stumpBox.evaluate(game).stats.firePctDmg'), undefined, 'a sleeping scar gives nothing');

// 아틀라스 최종 보스(정점 다섯) 처치마다 15%.
assert.equal(run('stumpBox.rollScarDrop(game, () => 0.2)'), null);
const scars = () => run(`game.stumpBox.items.filter(item => item.family === 'scar').length`);
const before = scars();
assert.equal(run('stumpBox.rollScarDrop(game, () => 0.1).family'), 'scar', 'a 15% roll gives one');
assert.equal(scars(), before + 1);
assert.ok(json('logs').some(line => line === '🔥 그루터기 함: 불씨의 흉터 (잠듦) 획득'), 'and the log says so');
assert.equal(run(`(() => { let calls = 0; const real = stumpBox.rollScarDrop; stumpBox.rollScarDrop = () => { calls++; return null; };
    game.atlas.endgame.kills.pinnacle = 1; atlasEndgame.onComplete(game, atlas.node('apex_archbishop'), {}); atlasEndgame.onComplete(game, atlas.node('roots_0'), {});
    stumpBox.rollScarDrop = real; return calls; })()`), 1, 'a final boss down rolls for a scar, a map boss does not');

// ── 번식(수확 일지 열매 줄) ─────────────────────────────────────────────
run(`clearBoard(); game.stumpBox.harvest.grown = ['fruit-fire', 'fruit-cold', 'fruit-lightning', 'fruit-chaos'];
    window.fruit = grown('seed', 'fire', 12, 'fruit');`);
assert.equal(run('stumpBox.breedingOpen(game)'), true);
rolls([0.5, 0.5, 0.5, 0.5]);
run('logs.length = 0; stumpBox.regress(game);');
const stored = () => json('stumpBox.storage(game).map(item => [item.family, item.color, item.roll, !!item.golden])');
assert.deepEqual(stored(), [['seed', 'fire', 1, false]], 'a grown fruit leaves a seed of its colour');
assert.ok(json('logs').includes('🌱 번식: 화염 씨앗'));
run('fruit.xp = stumpBox.need(fruit); fruit.ripe = true;');
rolls([0.5, 0.01, 0, 0.5, 0.001]);
run('logs.length = 0; stumpBox.regress(game);');
assert.deepEqual(stored()[1], ['seed', 'cold', 1, true], 'a mutation: another colour and golden');
assert.ok(json('logs').includes('🌱 번식: 냉기 씨앗 (돌연변이: 다른 색, 황금)'));
run('fruit.xp = stumpBox.need(fruit); fruit.ripe = true;');
rolls([0.001]);
run('stumpBox.regress(game);');
assert.equal(run('stumpBox.storage(game).at(-1).family'), 'scar', 'rarely a scar instead');

// ── 씨앗 주머니(저널마다 한 번, 셋 가운데 하나) ─────────────────────────
run(`game.journalEntries.push('meteor_fall');`);
assert.deepEqual(json('stumpBox.pendingPouches(game)'), ['pouch_meteor_fall']);
rolls([0, 0.5, 0.25, 0.5, 0.5, 0.99]);
const offers = json(`stumpBox.pouchOffers(game, 'pouch_meteor_fall')`);
assert.deepEqual(offers.map(offer => [offer.color, offer.roll]), [['fire', 1.05], ['cold', 1.05], ['lightning', 1.2]]);
rolls([0.9, 0.9, 0.9, 0.9, 0.9, 0.9]);
assert.deepEqual(json(`stumpBox.pouchOffers(game, 'pouch_meteor_fall')`), offers, 'the offers are kept until one is taken');
assert.deepEqual(json(`(item => [item.color, item.roll])(stumpBox.choosePouch(game, 'pouch_meteor_fall', 2))`), ['lightning', 1.2]);
assert.deepEqual(json('[stumpBox.pendingPouches(game), game.stumpBox.pouches]'), [[], { opened: ['pouch_meteor_fall'], offers: {} }], 'one pouch per page');

// ── 거름 한꺼번에(수확 일지 4칸): 계열마다 좋은 것 셋과 황금은 남기고, 낮은 품질부터, 자라는 것이 없으면 멈춘다 ─────
run(`clearBoard(); for (const roll of [0.8, 0.9, 1.0, 1.1, 1.2]) stumpBox.createItem(game, { family: 'seed', color: 'fire', roll });
    stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 0.8, golden: true });
    stumpBox.createItem(game, { family: 'sap', color: 'fire', roll: 1 });
    window.target = stumpBox.createItem(game, { family: 'seed', color: 'cold', roll: 1 }); stumpBox.place(game, target.id, 12, 'flower');`);
assert.deepEqual(json(`stumpBox.bulkCompostItems(game, 'fire').map(item => item.roll).sort()`), [0.8, 0.9], 'the best three of a family and golden ones stay');
assert.deepEqual(json(`(result => [result.count, result.growth, result.fed, target.xp])(stumpBox.compostMany(game, 'fire'))`), [2, 170, 1, 170]);
run(`stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 0.8 }); stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 0.8 }); target.xp = 390;`);
assert.deepEqual(json(`(result => [result.count, result.ripened.length, stumpBox.bulkCompostItems(game, 'fire').length])(stumpBox.compostMany(game, 'fire'))`), [1, 1, 1],
    'it stops once nothing grows, the rest stay');
assert.equal(run(`stumpBox.bulkCompostReason(game, 'fire')`), '판에서 자라는 것이 없습니다.');

// ── 부적 도감: 고유 부적의 첫 획득, 5종마다 보관함 +2 ─────────────────────
run('clearBoard(); game.stumpBox.codex = [];');
const roomy = run('stumpBox.storageLimit(game)');
run(`TALISMAN_UNIQUE_DB.slice(0, 5).concat(TALISMAN_UNIQUE_DB[0]).forEach(row => stumpBox.addTalisman(game,
    { name: row.name, rarity: 'unique', uniqueId: row.id, lines: [{ kind: 'stat', id: 'pctDmg', value: 5 }] }, true));`);
assert.deepEqual(json('[game.stumpBox.codex.length, stumpBox.storageLimit(game) - ' + roomy + ']'), [5, 2], 'five kinds (a second copy adds nothing) give +2');

// ── 저장 경계: 한 번 고친 상자는 그대로 돌아오고, 잘못된 값은 고친다 ─────────────
atLoop(23);
run(`clearBoard(); game.stumpBox.sealed = [12];
    grown('seed', 'fire', 12, 'flower', { bonus: 0.1, golden: false, lines: [{ stat: 'igniteChance', value: 3 }] }).golden = true;
    window.keptScar = stumpBox.addScar(game, true); stumpBox.place(game, keptScar.id, 7); keptScar.xp = 400; keptScar.ripe = true;
    keptScar.absorbed = { firePctDmg: 4, resPen: 1 }; keptScar.meals = 2; keptScar.misses = 1;
    game.stumpBox.pouches = { opened: [], offers: { pouch_meteor_fall: [{ family: 'seed', color: 'chaos', roll: 1.1 }] } };
    stumpBox.restore(game); window.first = JSON.stringify(game.stumpBox);
    game.stumpBox = JSON.parse(first); stumpBox.restore(game);`);
assert.equal(run('JSON.stringify(game.stumpBox) === first'), true, 'restore is idempotent');
assert.deepEqual(json(`(box => [box.items[0].golden, box.items[0].harvest, box.sealed, box.items[1].absorbed, box.items[1].meals, box.pouches.offers, box.scarGift])(game.stumpBox)`),
    [true, { bonus: 0.1, golden: false, lines: [{ stat: 'igniteChance', value: 3 }] }, [12], { firePctDmg: 4, resPen: 1 }, 2,
        { pouch_meteor_fall: [{ family: 'seed', color: 'chaos', roll: 1.1 }] }, true], 'golden, the roll, seals, a scar and the pouch survive');
run(`(() => { const raw = JSON.parse(first); const flower = raw.items[0], scar = raw.items[1];
    flower.harvest = { bonus: 0.5, golden: 'yes', lines: [{ stat: 'igniteChance', value: 50 }, { stat: 'igniteChance', value: 1 }, { stat: 'bogus', value: 1 },
        { stat: 'resPen', value: 1 }, { stat: 'igniteDamageMultiplierPct', value: 2 }] };
    scar.absorbed = { firePctDmg: 99, bogus: 3, resPen: -1 };
    raw.sealed = [12, 12, 7, 8, 'x'];
    raw.pouches = { opened: ['pouch_meteor_fall', 'bogus'], offers: { pouch_beehive_queen: [{ family: 'seed', color: 'pink' }] } };
    raw.items.push({ id: 900, family: 'seed', color: 'cold', xp: 10, roll: 1, harvest: { bonus: 0.1, golden: true, lines: [] } });
    game.stumpBox = raw; stumpBox.restore(game); })()`);
assert.deepEqual(json(`(box => [box.items[0].harvest, box.items[1].absorbed, box.sealed, box.pouches, 'harvest' in box.items[2]])(game.stumpBox)`),
    [{ bonus: 0, golden: false, lines: [{ stat: 'igniteChance', value: 3.9 }, { stat: 'resPen', value: 1 }, { stat: 'igniteDamageMultiplierPct', value: 2 }] },
        { firePctDmg: 18 }, [12], { opened: ['pouch_meteor_fall'], offers: {} }, false],
    'a forged roll, absorption, seal list, pouch and an unripe harvest are cleaned');

// ── 화면: 봉인 단추, 표식, 추가 줄, 흉터, 주머니, 거름 한꺼번에, 도감, 규칙 ─────────────────
run(`window.stumpNodes = {};
    window.stumpNode = id => stumpNodes[id] || (stumpNodes[id] = { id, innerHTML: '', clientWidth: id === 'tab-stump' ? 900 : 0,
        addEventListener(type, fn) { this.onclick = fn; }, scrollIntoView() {} });
    window.realGetById = document.getElementById;
    document.getElementById = id => id === 'tab-stump' || id.startsWith('stump-') ? stumpNode(id) : realGetById.call(document, id);
    window.stumpClick = data => stumpNode('tab-stump').onclick({ target: { closest: () => ({ dataset: data }) } });
    game.contentProgression.inherited.push('talisman'); contentProgression.sync(game);
    clearBoard(); game.stumpBox.codex = [TALISMAN_UNIQUE_DB[0].id]; game.stumpBox.pouches = { opened: [], offers: {} };
    window.shiny = grown('seed', 'fire', 12, 'flower', { bonus: 0.1, golden: true, lines: [{ stat: 'igniteChance', value: 3 }, { stat: 'resPen', value: 1 }, { stat: 'igniteDamageMultiplierPct', value: 5 }] });
    window.uiScar = stumpBox.addScar(game, true); uiScar.absorbed = { coldPctDmg: 2 }; uiScar.meals = 1;
    for (const roll of [0.8, 0.8, 1, 1, 1]) stumpBox.createItem(game, { family: 'sap', color: 'cold', roll });
    window.growingSap = stumpBox.createItem(game, { family: 'sap', color: 'lightning', roll: 1 }); stumpBox.place(game, growingSap.id, 6);
    stumpBoxUi.refreshStumpTabNow();`);
const part = id => run(`stumpNode('${id}').innerHTML`);
const tip = dataset => json(`stumpBoxUi.tipFor({ dataset: ${JSON.stringify(dataset)} })`);
assert.match(part('stump-box-board'), /class="[^"]*is-golden[^"]*"[^>]*data-cell="12"/, 'a golden item glows on the board');
const shinyTip = tip({ stumpTip: 'cell', stumpDrag: String(run('shiny.id')), stumpDropCell: '12' }).html;
assert.match(shinyTip, /황금 ×1\.2.*풍작 \+10%.*만개/, 'the tooltip shows its marks');
assert.match(shinyTip, /stump-tip-extra[^>]*>점화 확률 \+4%/, 'and its extra lines at quality and golden (3 × 1.32)');
run('stumpClick({ stumpAction: \'cell\', cell: \'18\' });');
assert.match(part('stump-box-detail'), /data-stump-action="seal" data-cell="18">이 칸 봉인 \(0\/1\)/, 'an empty cell offers the seal');
run('stumpClick({ stumpAction: \'seal\', cell: \'18\' });');
assert.deepEqual(json('game.stumpBox.sealed'), [18]);
assert.match(part('stump-box-board'), /class="[^"]*is-sealed[^"]*"[^>]*data-cell="18"[^>]*>.*?stump-seal-mark/, 'the sealed cell shows its mark');
run(`stumpClick({ stumpAction: 'item', item: String(uiScar.id) });`);
assert.match(part('stump-box-detail'), /냉기 피해 \+2% <small>\(최대 18\)<\/small>.*먹은 것 1번, 놓친 기회 0번/, 'a scar shows what it holds and its meals');
assert.match(part('stump-box-detail'), /data-stump-action="scar-discard">버리기/, 'a stored scar can be thrown away');
run(`window.asked = []; requestGameConfirmation = async message => { asked.push(message); return true; }; stumpClick({ stumpAction: 'scar-discard' });`);
run(`game.journalEntries.push('beehive_queen');`);
setImmediate(() => {
    assert.deepEqual(json('[asked.length, stumpBox.itemById(game, uiScar.id)]'), [1, null], 'after a confirmation the scar goes');
    run('stumpBoxUi.refreshStumpTabNow();');
    assert.match(part('stump-box-starter'), /씨앗 주머니.*data-stump-action="pouch" data-pouch="pouch_beehive_queen" data-index="0"/, 'a waiting pouch shows its three seeds');
    run(`stumpClick({ stumpAction: 'pouch', pouch: 'pouch_beehive_queen', index: '1' });`);
    assert.match(json('toasts').at(-1), /^씨앗 주머니: /, 'taking one says which');
    assert.match(part('stump-box-storage'), /data-stump-action="bulk-compost" data-color="cold"[^>]*>냉기 2</, 'bulk compost counts the spare cold saps');
    run(`stumpClick({ stumpAction: 'bulk-compost', color: 'cold' });`);
    assert.match(json('toasts').join('\n'), /거름 한꺼번에: 냉기 2개, 판에서 자라는 1개 \+160/, 'and spreads them');
    assert.match(part('stump-box-harvest'), /부적 도감 <small>1\/\d+, 보관함 \+0<\/small>/, 'the journal lists the codex');
    const rules = tip({ stumpTip: 'rules' }).html;
    assert.match(rules, /추가 줄\(0~3개\).*봉인 칸 1개.*불씨의 흉터.*번식/, 'the rules explain the roll, seals, devouring and breeding');
    assert.match(rules, /칸마다 최대 5단계/);
    run('document.getElementById = realGetById;');
    console.log('stump box ripening: roll, golden, seals, caps, devouring, breeding, pouches, bulk compost, codex, save boundary and screen OK');
});
