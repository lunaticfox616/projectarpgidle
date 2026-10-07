// 잿불 터(12번 루프 30, 2026-10-08, docs/loop-content-12-plan-20261008.md, data/ember-corruption.js): 아틀라스의 콘텐츠 방 잿불 터의
// 잿불 무리가 잿불가지와 드물게 타오른 잿불가지를 떨어뜨리고, 타오른 잿불가지는 장비 하나에 한 번 쓰는 두 번째 타락이다
// (25% 파괴, 고유 옵션 ±20%, 타락 전용 2줄, 품질 30). 재가 된 장비는 그루터기 함 거름이 된다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const espree = require('espree');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
// The currency name colours live in js/ui.js (not in the runtime): load that one function as the loot presentation smoke does.
{
    const ui = fs.readFileSync('js/ui.js', 'utf8'), pending = [espree.parse(ui, { ecmaVersion: 'latest', range: true })];
    while (pending.length) {
        const node = pending.pop();
        if (node.type === 'FunctionDeclaration' && node.id.name === 'getStyledOrbName') { vm.runInContext(ui.slice(...node.range), ctx); break; }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) pending.push(...value.filter(child => child && child.type));
            else if (value && value.type) pending.push(value);
        }
    }
}
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

run(`game = mergeDefaults({}); window.game = game; game.contentProgression.inherited = ['craft']; contentProgression.sync(); game.inventory = [];
    window.logs = []; addLog = (text, kind) => { logs.push(String(text)); };
    window.seq = values => { let i = 0; return () => values[Math.min(i++, values.length - 1)]; };
    window.gear = (slot, rarity = 'rare') => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === slot), rarity === 'unique' ? 'rare' : rarity, 18);
        item.stats = pickRandomMods(getAvailableMods(item), 6, { prefix: 3, suffix: 3 }).map(mod => rollAffixValue(mod, 18));
        item.chaosInfusion = null; item.corrupted = false; if (rarity === 'unique') item.rarity = 'unique'; return item; };`);

// 1. 자료: 17줄, 부위마다 넷 이상, 정수 범위, 전투가 이미 쓰는 스탯(빈 스탯 묶음에 있는 이름)만.
const data = json(`(() => {
    const slots = {}, bucket = createEmptyStatBucket();
    for (const row of EMBER_CORRUPTION_LINES) for (const slot of row.slots) slots[slot] = (slots[slot] || 0) + 1;
    return { count: EMBER_CORRUPTION_LINES.length, slots, bad: EMBER_CORRUPTION_LINES.filter(row => !Object.hasOwn(bucket, row.id)
        || !Number.isInteger(row.min) || !Number.isInteger(row.max) || row.min > row.max || row.min < 1).map(row => row.id),
        ash: EMBER_BURN_OUTCOMES.unique.find(([kind]) => kind === 'ash')[1] / EMBER_BURN_OUTCOMES.unique.reduce((sum, [, w]) => sum + w, 0),
        ashOther: EMBER_BURN_OUTCOMES.other.find(([kind]) => kind === 'ash')[1] / EMBER_BURN_OUTCOMES.other.reduce((sum, [, w]) => sum + w, 0) };
})()`);
assert.equal(data.count, 17);
assert.deepEqual(data.bad, [], 'every corruption line is a whole-number stat the combat already sums');
assert.deepEqual(Object.keys(data.slots).sort(), ['갑옷', '목걸이', '무기', '반지', '방패', '신발', '장갑', '투구', '허리띠'].sort());
assert.ok(Object.values(data.slots).every(count => count >= 4), 'every slot has at least four corruption lines: ' + JSON.stringify(data.slots));
assert.equal(data.ash, 0.25, 'a unique burns away one time in four (user default)');
assert.equal(data.ashOther, 0.25, 'and so does any other item');

// 2. 쓸 수 있는 장비: 장비만, 한 번만. 이미 타락한 장비와 고유 장비도 된다.
assert.match(run(`emberCorruption.burnReason(null)`), /선택/);
assert.match(run(`emberCorruption.burnReason({ slot: '부적' })`), /장비에만/);
assert.equal(run(`(() => { const item = gear('반지'); item.corrupted = true; return emberCorruption.burnReason(item); })()`), '', 'a corrupted item takes a second corruption');
assert.equal(run(`emberCorruption.burnReason(gear('목걸이', 'unique'))`), '', 'uniques too');
assert.match(run(`emberCorruption.burnReason({ ...gear('무기'), burned: true })`), /이미 한 번/);

// 3. 결과표: 고유와 나머지, 이 장비에 일어날 수 없는 결과는 뺀다(품질이 이미 30, 다시 구울 줄이 없음).
assert.deepEqual(json(`emberCorruption.outcomes(gear('목걸이', 'unique')).map(([kind]) => kind)`), ['ash', 'scale', 'twoLines', 'scaleAndLine', 'nothing']);
assert.deepEqual(json(`emberCorruption.outcomes(gear('무기')).map(([kind]) => kind)`), ['ash', 'twoLines', 'scale', 'quality', 'nothing']);
assert.deepEqual(json(`emberCorruption.outcomes({ ...gear('무기'), quality: 30 }).map(([kind]) => kind)`), ['ash', 'twoLines', 'scale', 'nothing']);
assert.deepEqual(json(`emberCorruption.outcomes({ ...gear('무기', 'normal'), stats: [] }).map(([kind]) => kind)`), ['ash', 'twoLines', 'quality', 'nothing'],
    'an item without lines has nothing to bake');

// 4. 결과마다(굴림을 정해 둔다): 표의 순서대로 [0, 25) 재, 그다음 칸들.
const burn = (slot, rarity, rolls) => json(`(() => {
    const item = gear(${JSON.stringify(slot)}, ${JSON.stringify(rarity)}), before = item.stats.map(stat => stat.val);
    if (item.stats[0]) item.stats[0].lockedByHoney = true;
    const out = emberCorruption.burn(item, seq(${JSON.stringify(rolls)}));
    return { out, item, before };
})()`);
const ash = burn('무기', 'rare', [0]);
assert.equal(ash.out.kind, 'ash');
assert.ok(ash.item.burned && ash.item.corrupted, 'every burn marks the item burned and corrupted');

const lines = burn('투구', 'rare', [0.3, 0.1, 0.9, 0.5, 0.0]);
assert.equal(lines.out.kind, 'twoLines');
assert.equal(lines.item.emberLines.length, 2);
assert.notEqual(lines.item.emberLines[0].id, lines.item.emberLines[1].id, 'two different lines');
const helmPool = json(`EMBER_CORRUPTION_LINES.filter(row => row.slots.includes('투구'))`);
for (const line of lines.item.emberLines) {
    const row = helmPool.find(entry => entry.id === line.id);
    assert.ok(row && line.val >= row.min && line.val <= row.max && line.emberLine, 'a helmet line in its range: ' + JSON.stringify(line));
}
assert.match(lines.out.text, /타락 전용 줄/);

// 고유: [25, 55) 다시 굽기. 줄마다 0.8~1.2배(정해 둔 굴림: 0, 1에 가까움, 0.5), 벌꿀 고정 줄은 그대로.
const baked = burn('목걸이', 'unique', [0.3, 0, 0.999, 0.5, 0.5, 0.5, 0.5, 0.5]);
assert.equal(baked.out.kind, 'scale');
assert.equal(baked.item.stats[0].val, baked.before[0], 'a honey-locked line keeps its value');
assert.equal(baked.item.stats[0].emberScale, undefined);
assert.equal(baked.item.stats[1].emberScale, 0.8);
assert.equal(baked.item.stats[2].emberScale, 1.2);
const rescaled = (value, mul) => (Number.isInteger(value) ? Math.round(value * mul) : Math.round(value * mul * 100) / 100);
assert.equal(baked.item.stats[1].val, rescaled(baked.before[1], 0.8));
assert.equal(baked.item.stats[2].val, rescaled(baked.before[2], 1.2));
assert.match(baked.out.text, /다시 구워졌습니다/);

const both = burn('반지', 'unique', [0.82, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0]);
assert.equal(both.out.kind, 'scaleAndLine');
assert.equal(both.item.emberLines.length, 1, 'bake and one line');
const quality = burn('장갑', 'rare', [0.85]);
assert.equal(quality.out.kind, 'quality');
assert.equal(quality.item.quality, 30, 'quality jumps to the corruption cap');
assert.equal(burn('신발', 'rare', [0.99]).out.kind, 'nothing');

// 5. 스탯: 타락 전용 줄은 제작으로 바뀌지 않는 줄로 장비 스탯에 더해진다(접두, 접미 자리는 그대로).
const equipped = json(`(() => {
    const item = gear('무기');
    item.burned = true; item.corrupted = true;
    item.emberLines = [{ id: 'gemLevel', val: 1, valMin: 1, valMax: 1, statName: getStatName('gemLevel'), emberLine: true },
        { id: 'doubleDamageChance', val: 5, valMin: 3, valMax: 6, statName: getStatName('doubleDamageChance'), emberLine: true }];
    const explicit = getResolvedEquipmentStatLists('무기', item, game).explicitStats;
    return { gem: explicit.filter(stat => stat.id === 'gemLevel').reduce((sum, stat) => sum + stat.val, 0),
        double: explicit.filter(stat => stat.id === 'doubleDamageChance').reduce((sum, stat) => sum + stat.val, 0),
        count: getItemExplicitOptionCount(item), lines: item.stats.length, total: getItemTotalStats(item).gemLevel };
})()`);
assert.ok(equipped.gem >= 1 && equipped.double >= 5, 'the ember lines reach the equipment stats: ' + JSON.stringify(equipped));
assert.equal(equipped.count, equipped.lines, 'they take no prefix or suffix place');
assert.ok(equipped.total >= 1, 'and the item totals (gem levels) see them');

// 6. 저장 경계: 아는 줄만, 그 부위의 줄만, 범위 안 정수로, 둘까지, 겹치지 않게. 타오른 장비는 타락한 장비다.
const stored = json(`(() => {
    const item = gear('반지');
    item.burned = true; item.corrupted = false;
    item.emberLines = [{ id: 'firstStrikeDamagePct', val: 99 }, { id: 'nope', val: 3 }, { id: 'gemLevel', val: 1 }, { id: 'firstStrikeDamagePct', val: 30 },
        { id: 'maxResF', val: 3.7 }, { id: 'eliteDamagePct', val: 20 }];
    item.stats[1].emberScale = 1.13;
    const back = normalizeItem(JSON.parse(JSON.stringify(item)));
    const plain = normalizeItem(JSON.parse(JSON.stringify({ ...gear('반지'), emberLines: [{ id: 'gemLevel', val: 1 }] })));
    return { lines: back.emberLines, corrupted: back.corrupted, burned: back.burned, scale: back.stats[1].emberScale, plain: plain.emberLines || null, plainBurned: plain.burned || null };
})()`);
assert.deepEqual(stored.lines.map(line => [line.id, line.val]), [['firstStrikeDamagePct', 50], ['maxResF', 3]],
    'unknown and other-slot lines go, values clamp and floor, duplicates go, two at most');
assert.equal(stored.corrupted, true);
assert.equal(stored.burned, true);
assert.equal(stored.scale, 1.13, 'a baked line keeps its share');
assert.equal(stored.plainBurned, null);
assert.equal(stored.plain, null, 'a line of another slot goes');

// 7. 처치 드롭: 잿불 무리만, 일반 1%, 정예 8%의 타오른 잿불가지(잿불가지는 5%, 30%).
assert.deepEqual(json(`emberCorruption.killDrops({ atlasEncounter: 'emberField' }, seq([0.009, 0.009]))`), [['emberBranch', 1], ['burningEmberBranch', 1]]);
assert.deepEqual(json(`emberCorruption.killDrops({ atlasEncounter: 'emberField' }, seq([0.04, 0.011]))`), [['emberBranch', 1]]);
assert.deepEqual(json(`emberCorruption.killDrops({ atlasEncounter: 'emberField', isElite: true }, seq([0.5, 0.07]))`), [['burningEmberBranch', 1]]);
assert.deepEqual(json(`emberCorruption.killDrops({ atlasEncounter: 'hive' }, () => 0)`), [], 'other rooms drop no branches');
const kills = json(`(() => {
    const saved = Math.random; Math.random = () => 0;
    const ember = getCurrencyDrops({ atlasEncounter: 'emberField', isElite: true, hp: 0, maxHp: 1 }).map(([key]) => key);
    const plain = getCurrencyDrops({ isElite: true, hp: 0, maxHp: 1 }).map(([key]) => key);
    Math.random = saved;
    return { ember: ember.includes('burningEmberBranch'), plain: plain.includes('burningEmberBranch') };
})()`);
assert.deepEqual(kills, { ember: true, plain: false }, 'the kill drops go through the ordinary currency drops (floor piles, beams)');

// 8. 방: 루프 30부터, 잊힌 정원에서 두 배. 몬스터는 화염으로 치고 잿불 테와 불씨가 있다.
assert.equal(run(`atlasEncounters.isOpen('emberField', 29)`), false);
assert.equal(run(`atlasEncounters.isOpen('emberField', 30)`), true);
assert.equal(run(`atlasEncounters.isOpen('breach', 1)`), true);
assert.equal(run(`atlasEncounters.chance('emberField', {}, 'garden')`), 16);
assert.equal(run(`atlasEncounters.chance('emberField', { emberField: 2 }, 'roots')`), 10);
const rooms = json(`(() => {
    let seed = 7; const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
    const count = context => { let n = 0; for (let i = 0; i < 20000; i++) if (atlasEncounters.roll({ encounterExtra: 0 }, [], random, Infinity, context).includes('emberField')) n++; return n; };
    return { before: count({ loop: 29 }), roots: count({ loop: 30, region: 'roots' }), garden: count({ loop: 30, region: 'garden' }),
        awake: atlasEncounters.roll({ encounterExtra: 0, exarch: 100, eater: 100 }, [], random, Infinity, true).length };
})()`);
assert.equal(rooms.before, 0, 'no ember room before loop 30');
assert.ok(rooms.roots > 0 && rooms.garden > rooms.roots * 1.6, 'the garden doubles the ember room: ' + JSON.stringify(rooms));
assert.ok(rooms.awake >= 1, 'a bare boolean context still means awake (altars roll)');
const tuned = json(`atlasEncounters.tuneEnemy({ name: '고블린', maxHp: 100, hp: 100, ele: 'cold' }, 'emberField')`);
assert.equal(tuned.name, '잿불 고블린');
assert.equal(tuned.ele, 'fire', 'ember monsters hit with fire');
assert.equal(tuned.encounterOutline, '#ffb347');
assert.equal(tuned.encounterSparks, '#ff9a3c');
assert.equal(tuned.maxHp, 150);
assert.deepEqual(json(`ATLAS.encounters.emberField.rewards`), [['emberBranch', 2, 0.1], ['burningEmberBranch', 0.1, 0]]);

// 9. 재화: 지갑, 제작 해금을 따르는 드롭, 제작실의 특수 재화(한 번씩 쓴다).
assert.equal(run(`defaultGame.currencies.burningEmberBranch`), 0);
assert.equal(run(`contentProgression.canDropCurrency('burningEmberBranch')`), true);
assert.equal(run(`craftingWorkspaceState.group('burningEmberBranch')`), 'special');
assert.match(run(`ORB_DB.burningEmberBranch.desc`), /25%/);
assert.match(run(`getStyledOrbName('burningEmberBranch')`), /#ff8a3d/);
assert.equal(run(`getStyledOrbName('goldenRule')`), '<span class="orb-tone" style="--orb-tone:#ffffff; border:1px solid #7a1f1f; border-radius:4px; padding:0 4px; background:#0f1116;">황금률</span>',
    'the name tones are unchanged for the other currencies');
assert.equal(run(`getStyledOrbName('ouroboros')`), '<span class="woodsman-touch-name">우로보로스</span>');
assert.equal(run(`getStyledOrbName('timeRemnant')`), '시간의 잔재');

// 10. 화면: 툴팁의 잿불 칸과 다시 구운 몫, 제작실 카드.
const view = json(`(() => {
    const item = { ...gear('반지'), burned: true, emberLines: [{ id: 'eliteDamagePct', val: 20, statName: getStatName('eliteDamagePct') }] };
    return { tip: emberCorruptionUi.tooltipHtml(item), never: emberCorruptionUi.tooltipHtml(gear('반지')), up: emberCorruptionUi.scaleBadgeHtml({ emberScale: 1.12 }),
        down: emberCorruptionUi.scaleBadgeHtml({ emberScale: 0.92 }), even: emberCorruptionUi.scaleBadgeHtml({ emberScale: 1 }), note: emberCorruptionUi.scaleNote({ emberScale: 0.8 }),
        card: emberCorruptionUi.cardHtml(item), ash: emberCorruptionUi.ashPct(gear('무기')) };
})()`);
assert.match(view.tip, /타오른 장비/);
assert.match(view.tip, /\[잿불\] 정예 처치 피해\(%\) \+20/);
assert.equal(view.never, '', 'an item never burned shows no ember section');
assert.match(view.up, /🔥\+12%/);
assert.match(view.down, /🔥-8%/);
assert.equal(view.even, '');
assert.equal(view.note, '불길 -20%');
assert.match(view.card, /\[잿불\]/);
assert.equal(view.ash, 25, 'the confirmation names the burn-away chance');

// 11. 제작실에서 쓰기: 재화가 없으면 막고, 확인 뒤 하나를 치르고 태운다. 재가 되면 장비가 사라지고 재는 그루터기 함 거름이 된다.
(async () => {
    run(`game = mergeDefaults({ journalEntries: ['prologue', 'act_10'] }); window.game = game; game.contentProgression.inherited = ['craft']; contentProgression.sync(game);
        game.inventory = []; requestGameConfirmation = async () => true;
        { const box = game.stumpBox; box.board = box.board.map(() => null); box.items = []; box.sealed = []; }
        window.seed = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, seed.id, 12, 'flower');`);
    const before = json(`({ xp: seed.xp, reason: emberCorruptionUi.useState(gear('허리띠')).reason })`);
    assert.equal(before.reason, '재화 부족');
    const ash = await run(`(async () => {
        const item = gear('허리띠'); game.inventory.push(item); selectForCrafting(item.id, false);
        game.currencies.burningEmberBranch = 2;
        const saved = Math.random; Math.random = () => 0;
        const result = await emberCorruptionUi.use();
        Math.random = saved;
        return JSON.stringify({ result, left: game.currencies.burningEmberBranch, gone: !game.inventory.includes(item), xp: seed.xp, log: logs.at(-1) });
    })()`);
    const burnt = JSON.parse(ash);
    assert.equal(burnt.result, true);
    assert.equal(burnt.left, 1, 'one branch is spent');
    assert.equal(burnt.gone, true, 'the burned-away item leaves the inventory');
    assert.equal(burnt.xp - before.xp, 150, 'its ashes feed the growing seed (rare: 150)');
    assert.match(burnt.log, /재가 되었습니다.*그루터기 함 거름/);

    const kept = JSON.parse(await run(`(async () => {
        const item = gear('목걸이'); game.inventory.push(item); selectForCrafting(item.id, false);
        const saved = Math.random; Math.random = () => 0.3;
        const result = await emberCorruptionUi.use();
        Math.random = saved;
        return JSON.stringify({ result, left: game.currencies.burningEmberBranch, lines: (item.emberLines || []).length, burned: item.burned,
            again: emberCorruption.burnReason(item), log: logs.at(-1) });
    })()`));
    assert.deepEqual([kept.result, kept.left, kept.lines, kept.burned], [true, 0, 2, true], 'a surviving item keeps its two corruption lines');
    assert.match(kept.again, /이미 한 번/);
    assert.match(kept.log, /타락 전용 줄/);

    const refused = JSON.parse(await run(`(async () => {
        const item = gear('신발'); game.inventory.push(item); selectForCrafting(item.id, false);
        game.currencies.burningEmberBranch = 1; requestGameConfirmation = async () => false;
        const result = await emberCorruptionUi.use();
        return JSON.stringify({ result: result === undefined ? null : result, left: game.currencies.burningEmberBranch, burned: !!item.burned });
    })()`));
    assert.deepEqual(refused, { result: null, left: 1, burned: false }, 'a declined confirmation spends nothing');
    console.log('ember field smoke passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
