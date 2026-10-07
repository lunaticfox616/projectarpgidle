// 수액 상처(12번 루프 32, 2026-10-08, docs/loop-content-12-plan-20261008.md, data/sap-catalysts.js): 아틀라스의 수액 상처 방과 그 무리의
// 기폭제(장비의 품질 속성을 그 태그로 바꾸고 품질 +2%, 20%까지). 치명과 소환은 기폭제만 주는 품질 속성이다. 화염, 냉기, 번개, 카오스
// 기폭제는 그루터기 함의 같은 색 호박석 둘로도 만든다(조합창).
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({ journalEntries: ['prologue', 'act_10'] }); window.game = game; game.season = 32;
    game.contentProgression.inherited = ['craft']; contentProgression.sync(game); game.inventory = [];
    window.logs = []; addLog = text => logs.push(String(text));
    window.seq = values => { let i = 0; return () => values[Math.min(i++, values.length - 1)]; };
    window.gear = slot => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === slot), 'rare', 18);
        item.stats = pickRandomMods(getAvailableMods(item), 6, { prefix: 3, suffix: 3 }).map(mod => rollAffixValue(mod, 18));
        item.chaosInfusion = null; item.corrupted = false; return item; };`);

// 1. 자료: 여섯 기폭제, 품질 속성은 모두 태그 규칙이 있고, 넷은 그루터기 함 색과 짝.
const kinds = json('SAP_CATALYSTS.kinds');
assert.deepEqual(kinds.map(kind => kind.mode), ['fire', 'cold', 'light', 'chaos', 'crit', 'summon']);
assert.ok(kinds.every(kind => run(`(QUALITY_ATTRIBUTE_STAT_GROUPS[${JSON.stringify(kind.mode)}] || []).length`) > 0), 'every catalyst mode grows some lines');
assert.deepEqual(kinds.filter(kind => kind.color).map(kind => kind.color), ['fire', 'cold', 'lightning', 'chaos']);
assert.ok(kinds.every(kind => run(`defaultGame.currencies[${JSON.stringify(kind.key)}]`) === 0 && run(`!!ORB_DB[${JSON.stringify(kind.key)}]`)), 'wallet and names');
assert.ok(!json('QUALITY_ATTRIBUTE_STAT_GROUPS.summon').includes('summonGemLevel'), 'summon quality leaves gem levels alone');

// 2. 품질 속성: 치명과 소환은 저장된 그대로 읽히고, 심연 촉매의 순환은 그대로(치명에서 쓰면 화염부터).
assert.equal(run(`getItemQualityAttributeMode({ qualityAttribute: 'crit' })`), 'crit');
assert.equal(run(`getItemQualityAttributeMode({ qualityAttribute: 'nope' })`), 'base');
assert.equal(run(`getItemQualityAttributeLabel('summon')`), '소환');
assert.equal(run(`(() => { const item = { qualityAttribute: 'crit' }; return applyAbyssCatalystToItemQuality(item) && item.qualityAttribute; })()`), 'fire');
assert.equal(run(`(() => { const item = { qualityAttribute: 'speed' }; applyAbyssCatalystToItemQuality(item); return item.qualityAttribute; })()`), 'base',
    'the abyss catalyst cycle does not pass through the catalyst modes');

// 3. 쓰기: 속성을 바꾸고 품질 +2(20까지), 타락한 장비와 이미 가득 찬 같은 속성은 거절, 한계돌파 장비는 품질 그대로.
assert.match(run(`sapCatalysts.useReason(null, 'catalystCrit')`), /선택/);
assert.match(run(`sapCatalysts.useReason({ ...gear('반지'), corrupted: true }, 'catalystCrit')`), /타락/);
assert.match(run(`sapCatalysts.useReason({ ...gear('반지'), qualityAttribute: 'crit', quality: 20 }, 'catalystCrit')`), /더 올릴 수 없습니다/);
assert.equal(run(`sapCatalysts.useReason({ ...gear('반지'), qualityAttribute: 'fire', quality: 20 }, 'catalystCrit')`), '', 'switching the tag at 20% is fine');
assert.deepEqual(json(`(() => { const item = { ...gear('반지'), quality: 19 }; const out = sapCatalysts.apply(item, 'catalystCrit');
    return [out.mode, out.before, out.after, item.qualityAttribute]; })()`), ['crit', 19, 20, 'crit']);
assert.deepEqual(json(`(() => { const item = { ...gear('반지'), quality: 25, qualityLockedByLimitBreak: true }; sapCatalysts.apply(item, 'catalystSummon');
    return [item.quality, item.qualityAttribute]; })()`), [25, 'summon'], 'a limit-broken item keeps its quality');

// 4. 효과: 치명 속성의 품질 20%가 치명 줄을 1.2배로(장비 스탯 해석).
const grown = json(`(() => {
    const item = gear('반지');
    item.stats = [rollAffixValue(MOD_DB.find(mod => (mod.statId || mod.id) === 'crit' && mod.slots.includes('반지')), 18)];
    const raw = item.stats[0].val;
    Object.assign(item, { quality: 20, qualityAttribute: 'crit' });
    const line = getResolvedEquipmentStatLists('반지1', item, game).explicitStats.find(stat => stat.id === 'crit');
    return { raw, now: line.val };
})()`);
assert.ok(Math.abs(grown.now - grown.raw * 1.2) < 0.02, 'crit quality grows the crit line: ' + JSON.stringify(grown));

// 5. 드롭: 수액 무리만(일반 4%, 정예 25%), 보통 재화 드롭 길로.
assert.deepEqual(json(`sapCatalysts.killDrops({ atlasEncounter: 'sapWound' }, seq([0.03, 0]))`), [['catalystFire', 1]]);
assert.deepEqual(json(`sapCatalysts.killDrops({ atlasEncounter: 'sapWound' }, seq([0.05]))`), []);
assert.deepEqual(json(`sapCatalysts.killDrops({ atlasEncounter: 'sapWound', isElite: true }, seq([0.2, 0.99]))`), [['catalystSummon', 1]]);
assert.deepEqual(json(`sapCatalysts.killDrops({ atlasEncounter: 'emberField' }, () => 0)`), []);
assert.equal(run(`(() => { const saved = Math.random; Math.random = () => 0;
    const keys = getCurrencyDrops({ atlasEncounter: 'sapWound', isElite: true, hp: 0, maxHp: 1 }).map(([key]) => key);
    Math.random = saved; return keys.some(key => sapCatalysts.isCatalyst(key)); })()`), true);

// 6. 방: 루프 32부터, 고목 줄기에서 두 배, 단단한 무리와 호박 테, 방을 비우면 무작위 한 종류.
assert.equal(run(`atlasEncounters.isOpen('sapWound', 31)`), false);
assert.equal(run(`atlasEncounters.isOpen('sapWound', 32)`), true);
assert.equal(run(`atlasEncounters.chance('sapWound', {}, 'trunk')`), 16);
const pack = json(`atlasEncounters.tuneEnemy({ name: '늑대', maxHp: 100, hp: 100 }, 'sapWound')`);
assert.deepEqual([pack.name, pack.maxHp, pack.encounterOutline], ['수액 늑대', 200, '#e8c15a']);
const reward = json(`atlasEncounters.rewards({ atlasTier: 10 }, 'sapWound', {}, seq([0.5, 0.9]))`);
assert.equal(reward.length, 1);
assert.equal(reward[0][1], 2, 'one + 0.1 per tier at tier 10');
assert.equal(run(`sapCatalysts.isCatalyst(${JSON.stringify(reward[0][0])})`), true);
assert.deepEqual(json(`atlasEncounters.rewards({ atlasTier: 0 }, 'treasure', {}, () => 0.99).map(([key]) => key)`), ['magicBud', 'formlessDew', 'sapBud'],
    'plain key rows are unchanged');

// 7. 그루터기 함 호박석 조합: 같은 색 호박석 둘 → 그 색의 기폭제(지갑으로, 칸에는 남지 않는다). 루프 32 전에는 책에도 없다.
const cube = json(`(() => {
    const box = game.stumpBox; box.board = box.board.map(() => null); box.items = [];
    const amber = color => { const item = stumpBox.createItem(game, { family: 'sap', color, roll: 1 }); item.xp = stumpBox.need(item); item.ripe = true; return item; };
    stumpCube.clear && stumpCube.clear(game);
    const a = amber('lightning'), b = amber('lightning');
    const placed = [stumpCube.put(game, 'stump', a), stumpCube.put(game, 'stump', b)];
    const before = game.currencies.catalystLight || 0, result = stumpCube.transmute(game);
    return { placed, ok: result.ok, recipe: result.ok && result.recipe.id, gained: (game.currencies.catalystLight || 0) - before,
        left: game.stumpBox.items.length, inside: stumpCube.entries ? stumpCube.entries(game).length : 0, names: result.ok && result.outputs.map(row => row.item.name) };
})()`);
assert.deepEqual(cube.placed, ['', '']);
assert.equal(cube.ok, true);
assert.equal(cube.recipe, 'amber_catalyst');
assert.equal(cube.gained, 1, 'two lightning ambers make one lightning catalyst');
assert.equal(cube.left, 0, 'the ambers are used up');
assert.equal(cube.inside, 0, 'a currency result does not sit in the cube');
assert.deepEqual(cube.names, ['번개 기폭제 1']);
run(`game.stumpBox.journal = game.stumpBox.journal || {};`);
const revealedAt = loop => run(`(() => { game.season = ${loop}; const shown = stumpCube.isRevealed(STUMP_CUBE_RECIPES.find(row => row.id === 'amber_catalyst'), game); game.season = 32; return shown; })()`);
assert.equal(revealedAt(31), false, 'the recipe waits for loop 32');

// 8. 제작실과 툴팁: 쓸 수 있는지, 쓰면 재화 하나와 결과 문장, 툴팁의 품질 줄.
const used = json(`(() => {
    const item = gear('장갑'); game.inventory.push(item); selectForCrafting(item.id, false);
    const none = sapCatalystsUi.useState('catalystCrit', item).reason;
    game.currencies.catalystCrit = 2;
    const result = sapCatalystsUi.use('catalystCrit');
    return { none, result, left: game.currencies.catalystCrit, mode: item.qualityAttribute, quality: item.quality, log: logs.at(-1),
        tip: sapCatalystsUi.qualityHtml(item), plain: sapCatalystsUi.qualityHtml(gear('장갑')) };
})()`);
assert.equal(used.none, '재화 부족');
assert.deepEqual([used.result, used.left, used.mode, used.quality], [true, 1, 'crit', 2]);
assert.match(used.log, /품질 속성 치명, 품질 0% → 2%/);
assert.match(used.tip, /품질 2%: 치명 태그 줄 \+2%/);
assert.equal(used.plain, '', 'no quality, no line');
console.log('sap catalysts smoke passed');
