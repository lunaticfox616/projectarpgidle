// 조합창(그루터기 함 아래 3×3, 호라드릭 큐브 방식): 넣기 · 칸 크기 · 꺼내기 · 가리킴 정리, 조합법 판정(모양 무관 · 남는 재료 없음 ·
// 같은 부위/색 조건), 비용, 조합법 10개의 결과, 나무꾼 잠금, 저장 경계와 루프 초기화, 화면 조각.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const fresh = extra => run(`game = mergeDefaults(${JSON.stringify(extra || {})}); window.game = game; contentProgression.sync(game);`);
const seq = values => `(() => { const values = ${JSON.stringify(values)}; return () => values.length ? values.shift() : 0.5; })()`;

fresh({ season: 12, loopCount: 11, level: 60, maxZoneId: 20 });
run(`game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id); contentProgression.sync(game); stumpBox.sync(game, 'test');
    game.inventory = []; game.jewelInventory = []; game.cores = coreItems.defaultState();
    globalThis.makeGear = (slot, rarity, tier = 6) => { const item = createItemFromBase(chooseItemBase(slot, tier, {}), rarity, tier, {}); game.inventory.push(item); return item; };
    globalThis.putIn = (kind, item) => stumpCube.put(game, kind, item);
    globalThis.cubeView = () => stumpCube.entries(game).map(entry => [entry.kind, entry.x, entry.y, entry.w, entry.h]);`);

// ── 넣기 · 칸 크기 · 꺼내기 ────────────────────────────────────────────────
run(`globalThis.armor = makeGear('갑옷', 'magic'); globalThis.ring = makeGear('반지', 'magic'); globalThis.bow = makeGear('무기', 'magic');`);
assert.strictEqual(run("putIn('equipment', armor)"), '');
assert.strictEqual(run("putIn('equipment', ring)"), '');
assert.deepStrictEqual(json('cubeView()'), [['equipment', 0, 0, 2, 2], ['equipment', 2, 0, 1, 1]], 'items take their inventory footprint, first free spot');
assert.strictEqual(run("putIn('equipment', armor)"), '이미 조합창에 있습니다.');
run("bow.baseId = 'test_longbow'; bow.baseName = '장궁'; bow.name = '장궁';");
assert.deepStrictEqual(json('stumpCube.footprint("equipment", bow)'), { w: 1, h: 3 }, 'a 4-tall weapon is folded to the cube height');
assert.strictEqual(run("putIn('equipment', bow)"), '조합창에 자리가 없습니다.', 'no free 1×3 column is left');
assert.strictEqual(run('stumpCube.takeOut(game, 4)'), true, 'any covered cell takes the item out');
assert.deepStrictEqual(json('cubeView()'), [['equipment', 2, 0, 1, 1]]);
assert.strictEqual(run('game.inventory.includes(armor)'), true, 'taking out never moves the item: it stayed in the inventory');
run('armor.locked = true;');
assert.strictEqual(run("putIn('equipment', armor)"), '넣을 수 없는 아이템입니다.', 'locked gear stays out');
run('armor.locked = false; game.inventory = game.inventory.filter(item => item !== ring);');
assert.deepStrictEqual(json('cubeView()'), [], 'a salvaged/equipped item leaves the cube on its own');
run('stumpCube.clear(game);');

// ── 판정: 모양 무관 · 남는 재료 없음 ─────────────────────────────────────────────
run(`globalThis.ripe = (family, color = 'fire') => { const item = stumpBox.createItem(game, { family, color, roll: 1 });
    item.xp = STUMP_BOX_GROWTH.need[family]; item.ripe = true; if (family === 'seed') item.path = 'flower'; return item; };
    stumpCube.clear(game); game.inventory = []; game.stumpBox.items = []; globalThis.helm = makeGear('투구', 'magic', 8);`);
run("putIn('equipment', helm);");
assert.strictEqual(run('stumpCube.match(game)'), null, 'a helmet alone makes nothing');
run("globalThis.bud = stumpBox.createItem(game, { family: 'seed', color: 'cold', roll: 1 }); putIn('stump', bud);");
assert.strictEqual(run('stumpCube.match(game)'), null, 'an unripe seed is no catalyst');
run("stumpCube.clear(game); putIn('stump', ripe('seed', 'cold')); putIn('equipment', helm);");
assert.strictEqual(run('stumpCube.match(game).recipe.id'), 'equip_magic_upgrade', 'the order and spot do not matter');
run("globalThis.extraJewel = generateJewelDrop(6); game.jewelInventory.push(extraJewel); putIn('jewel', extraJewel);");
assert.strictEqual(run('stumpCube.match(game)'), null, 'a leftover ingredient breaks the recipe');
run('stumpCube.takeOut(game, (() => { const entry = stumpCube.entries(game).find(row => row.kind === "jewel"); return entry.y * 3 + entry.x; })());');
const upgraded = json('stumpCube.transmute(game)');
assert.strictEqual(upgraded.ok, true);
assert.deepStrictEqual([upgraded.outputs[0].item.rarity, upgraded.outputs[0].item.baseId, upgraded.outputs[0].item.itemTier],
    ['rare', run('helm.baseId'), 8], 'a magic helmet and a grown seed make a rare helmet of the same base and tier');
assert.deepStrictEqual(json('[game.inventory.includes(helm), game.stumpBox.items.filter(item => item.ripe).length]'), [false, 0], 'the ingredients are gone');
assert.deepStrictEqual(json('cubeView()'), [['equipment', 0, 0, 2, 2]], 'the result waits in the cube like the Horadric Cube');

// ── 비용 · 단련 티어 상한 · 나무꾼 잠금 ─────────────────────────────────────────
run(`stumpCube.clear(game); game.inventory = []; game.level = 60; globalThis.boots = makeGear('신발', 'rare', 7);
    putIn('equipment', boots); putIn('stump', ripe('sap', 'cold')); putIn('stump', ripe('sap', 'chaos')); game.currencies.formlessDew = 0;`);
assert.strictEqual(run('stumpCube.match(game).recipe.id'), 'equip_rare_tier');
assert.strictEqual(run('stumpCube.transmute(game).reason'), `${run('ORB_DB.formlessDew.name')}이(가) 부족합니다.`);
run('game.currencies.formlessDew = 2; game.woodsmanBuildLock = true;');
assert.strictEqual(run('stumpCube.transmute(game).ok'), false, 'no combining during the woodsman fight');
run('game.woodsmanBuildLock = false;');
const cap = run('levelProgression.maxDropTier(60)');
const tempered = json('stumpCube.transmute(game)');
assert.deepStrictEqual([tempered.outputs[0].item.slot, tempered.outputs[0].item.itemTier], ['신발', Math.max(7, Math.min(8, cap))],
    'tier +1, capped by what the level already drops');
assert.strictEqual(run('game.currencies.formlessDew'), 1, 'the cost is paid once');

// ── 고유 장비 순환 · 소켓 ─────────────────────────────────────────────────────
run(`stumpCube.clear(game); game.inventory = []; globalThis.oldUnique = generateUniqueItem(8, '장갑', null, {}); game.inventory.push(oldUnique);
    putIn('equipment', oldUnique); ['fire', 'cold', 'chaos'].forEach(color => putIn('stump', ripe('seed', color)));`);
const rerolled = json('stumpCube.transmute(game)');
assert.strictEqual(rerolled.ok && rerolled.outputs[0].item.rarity, 'unique', 'a unique and three grown seeds turn into another unique');
assert.strictEqual(rerolled.outputs[0].item.slot, '장갑', 'of the same slot');
run(`stumpCube.clear(game); game.inventory = []; globalThis.gloves = makeGear('장갑', 'rare'); globalThis.socketJewel = generateJewelDrop(6);
    game.jewelInventory = [socketJewel]; putIn('equipment', gloves); putIn('jewel', socketJewel); game.currencies.voidChisel = 1;`);
assert.strictEqual(run('stumpCube.match(game).recipe.id'), 'equip_socket_jewel');
assert.strictEqual(run('stumpCube.transmute(game).ok'), true);
assert.deepStrictEqual(json('[equipmentSockets.list(gloves).map(row => row.jewel && row.jewel.id), game.jewelInventory.length, game.currencies.voidChisel]'),
    [[run('socketJewel.id')], 0, 0], 'the chisel opens a socket and the jewel goes in, paid once');
assert.deepStrictEqual(json('cubeView()'), [['equipment', 0, 0, 2, 2]], 'the socketed gear stays in the cube');
run('stumpCube.clear(game); game.currencies.voidChisel = 1; globalThis.ring2 = makeGear("반지", "rare"); globalThis.j2 = generateJewelDrop(6); game.jewelInventory.push(j2); putIn("equipment", ring2); putIn("jewel", j2);');
assert.strictEqual(run('stumpCube.match(game)'), null, 'a ring already has its socket: nothing to chisel');

// ── 그루터기: 합치기 · 부적 ─────────────────────────────────────────────────────
run(`stumpCube.clear(game); game.stumpBox.items = []; game.stumpBox.board = game.stumpBox.board.map(() => null);
    globalThis.seeds = [1, 1.2, 1.1].map(roll => stumpBox.createItem(game, { family: 'seed', color: 'fire', roll }));
    seeds.forEach(item => putIn('stump', item));`);
const merged = json('stumpCube.transmute(game)');
assert.deepStrictEqual([merged.outputs[0].item.family, merged.outputs[0].item.color, merged.outputs[0].item.roll], ['seed', 'fire', 1.3], 'best quality +10%, capped at 130%');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.strictEqual(run('game.stumpBox.items.find(item => item.family === "seed").roll'), 1.3, 'a merged 130% seed survives a reload');
run(`stumpCube.clear(game); [stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }), stumpBox.createItem(game, { family: 'seed', color: 'cold', roll: 1 }),
    stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 })].forEach(item => putIn('stump', item));`);
assert.strictEqual(run('stumpCube.match(game)'), null, 'mixed colours do not merge');
run(`stumpCube.clear(game); { const placed = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }); stumpBox.place(game, placed.id, 12);
    globalThis.placedSap = placed; }`);
assert.strictEqual(run("putIn('stump', placedSap)"), '보관 중인 아이템만 넣을 수 있습니다.', 'a piece on the board stays out');

const addTalisman = fields => `stumpBox.addTalisman(game, ${JSON.stringify(fields)}, true)`;
run(`stumpCube.clear(game); globalThis.rares = [0, 1, 2].map(() => ${addTalisman({ name: '희귀', rarity: 'rare', lines: [{ kind: 'stat', id: 'pctDmg', value: 8 }, { kind: 'stat', id: 'crit', value: 2 }] })});
    rares.forEach(item => putIn('stump', item));`);
const upgradedTalisman = json(`stumpCube.transmute(game, ${seq([0.9, 0.9, 0.2, 0.5, 0.5, 0.5, 0.5])})`);
assert.strictEqual(upgradedTalisman.outputs[0].item.family, 'talisman');
assert(upgradedTalisman.outputs[0].item.lines.length >= 2, 'three rare talismans are unsealed again with a radiant shard (2~3 lines)');
run(`stumpCube.clear(game); globalThis.rewrite = ${addTalisman({ name: '고칠 부적', rarity: 'magic', lines: [{ kind: 'stat', id: 'pctDmg', value: 6 }] })};
    globalThis.amber = stumpBox.createItem(game, { family: 'sap', color: 'chaos', roll: 1 }); putIn('stump', rewrite); putIn('stump', amber);`);
assert.strictEqual(run('stumpCube.match(game)'), null, 'an unripe sap is not amber');
run('amber.xp = STUMP_BOX_GROWTH.need.sap; amber.ripe = true; game.currencies.sealShard = 1;');
assert.strictEqual(run('stumpCube.match(game).recipe.id'), 'talisman_reroll_line');
const rewritten = json(`stumpCube.transmute(game, ${seq([0, 0.99])})`);
assert.strictEqual(rewritten.ok, true);
assert.deepStrictEqual(json('[rewrite.lines.length, rewrite.lines[0].id !== "pctDmg" || rewrite.lines[0].value !== 6, game.stumpBox.items.includes(amber), game.currencies.sealShard]'),
    [1, true, false, 0], 'the stat line is rewritten, the amber and one seal shard are spent');
run(`stumpCube.clear(game); globalThis.uniques = [${addTalisman({ name: '중력', rarity: 'unique', uniqueId: 'ut_gravity', special: 'gravity', lines: [] })},
    ${addTalisman({ name: '오만', rarity: 'unique', uniqueId: 'ut_pride', special: 'pride', lines: [] })}]; uniques.forEach(item => putIn('stump', item));
    game.currencies.strongSealShard = 1;`);
const otherUnique = json('stumpCube.transmute(game)').outputs[0].item;
assert(otherUnique.rarity === 'unique' && !['ut_gravity', 'ut_pride'].includes(otherUnique.uniqueId), 'two unique talismans become a different unique');

// ── 주얼 융합 · 코어 ────────────────────────────────────────────────────────
run(`stumpCube.clear(game); game.jewelInventory = [0, 1, 2].map(() => generateJewelDrop(8)).map(jewel => ({ ...jewel, rarity: 'magic', uniqueId: undefined }));
    game.jewelInventory.forEach(jewel => putIn('jewel', jewel)); game.currencies.jewelShard = 10;`);
const fused = json('stumpCube.transmute(game)').outputs[0].item;
assert.strictEqual(fused.rarity, 'rare');
assert(fused.stats.length >= 3 && fused.stats.length <= 4, 'a fused jewel has 3~4 lines');
assert.deepStrictEqual(json('[game.jewelInventory.length, game.currencies.jewelShard]'), [1, 0]);
run(`stumpCube.clear(game); game.cores.owned = [coreItems.roll(), coreItems.roll(), coreItems.roll()]; game.cores.owned.slice().forEach(core => putIn('core', core));`);
assert.strictEqual(run('stumpCube.transmute(game).ok && game.cores.owned.length'), 1, 'three cores make one new core');

// ── 저장 경계 · 루프 초기화 ───────────────────────────────────────────────────
const cleaned = json(`stumpCube.normalize({ slots: [{ kind: 'core', id: 3, x: 0, y: 0 }, { kind: 'rock', id: 1, x: 0, y: 0 },
    { kind: 'jewel', id: 2, x: 3, y: 0 }, { kind: 'equipment', id: 'abc', x: 1, y: 2, extra: true }, null] })`);
assert.deepStrictEqual(cleaned, { slots: [{ kind: 'core', id: 3, x: 0, y: 0 }, { kind: 'equipment', id: 'abc', x: 1, y: 2 }] });
assert.deepStrictEqual(json(`stumpCube.normalize(${JSON.stringify(cleaned)})`), cleaned, 'normalizing twice changes nothing');
run('game.stumpCube = "broken"; game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.deepStrictEqual(json('game.stumpCube'), { slots: [] }, 'a broken cube loads empty');
assert(fs.readFileSync('js/combat.js', 'utf8').includes('coreItems.resetForLoop(); stumpCube.clear();'), 'a new loop empties the cube with the storages');

// ── 화면 조각 ────────────────────────────────────────────────────────────────
run(`stumpCube.clear(game); game.inventory = []; putIn('equipment', makeGear('투구', 'magic')); putIn('stump', ripe('seed', 'lightning'));`);
const cubeHtml = run('stumpCubeUi.cubeHtml()');
assert(cubeHtml.includes('마법 장비 승급') && cubeHtml.includes('data-stump-action="cube-transmute"') && !cubeHtml.includes('cube-transmute" disabled'),
    'a matching recipe enables [조합]');
assert.strictEqual((cubeHtml.match(/class="stump-cube-item"/g) || []).length, 2);
assert.strictEqual((cubeHtml.match(/class="stump-cube-cell"/g) || []).length, 9);
const html = fs.readFileSync('index.html', 'utf8');
assert(html.indexOf('id="stump-box-board"') < html.indexOf('id="stump-cube"') && html.indexOf('id="stump-cube"') < html.indexOf('id="stump-box-summary"'),
    'the cube sits right under the stump box board');

console.log('stump cube: placement, footprints, matching, costs, ten recipes, locks, saves, loop reset and screen: OK');
