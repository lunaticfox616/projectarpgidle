// 무기 숙련(2026-10-08, data/weapon-mastery.js, js/weapon-mastery.js): 들고 있는 무기 대분류만 처치 경험치를 얻고(일반 1, 정예 4, 보스 20),
// 레벨 2부터 레벨마다 그 무기를 들었을 때 피해 +0.5%(레벨 1은 아무것도 없어 숙련 전의 수치는 그대로), 10단위 레벨마다 그 무기의 특전이 열린다. 여섯 레벨의 합이 이정표를 넘으면 방치 효율이 오르고,
// 루프를 넘어 남으며, 망가진 저장 값은 0으로 읽는다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({}); window.game = game; game.inventory = [];
    window.__events = []; const dispatch = dispatchRuntimeEvent;
    dispatchRuntimeEvent = (name, detail) => { window.__events.push({ name, detail }); return false; };
    window.weaponOf = category => { const base = BASE_ITEM_DB.find(row => row.slot === '무기' && WEAPON_BASE_CATEGORIES[row.id] === category);
        const item = createItemFromBase(base, 'normal', 1); item.stats = []; return item; };
    window.wield = category => { game.equipment['무기'] = category ? weaponOf(category) : null; };`);

// 1. 곡선: 1에서 2까지 150, 10까지 약 2,300, 50까지 약 46만.
assert.equal(run('weaponMastery.need(1)'), 150);
assert.ok(run('weaponMastery.reach(10)') > 2200 && run('weaponMastery.reach(10)') < 2400, 'level 10 near 2,300');
assert.ok(run('weaponMastery.reach(50)') > 440000 && run('weaponMastery.reach(50)') < 480000, 'level 50 near 460k');
assert.deepEqual(json('weaponMastery.ids'), ['greatsword', 'scimitar', 'shortbow', 'orb', 'flask', 'censer']);

// 2. 처치: 든 무기의 대분류만, 종류별 경험치. 무기가 없으면 아무도 얻지 않는다.
run(`wield('scimitar');
    weaponMastery.onKilled(game, { isBoss: false, isElite: false });
    weaponMastery.onKilled(game, { isElite: true });
    weaponMastery.onKilled(game, { isBoss: true });`);
assert.deepEqual(json('game.weaponMastery.xp'), { scimitar: 25 });
run(`wield(null); weaponMastery.onKilled(game, { isBoss: true });`);
assert.deepEqual(json('game.weaponMastery.xp'), { scimitar: 25 }, 'no weapon, no experience');

// 3. 레벨이 오르면 알림 이벤트, 10단위는 특전.
run(`wield('scimitar'); game.weaponMastery.xp.scimitar = weaponMastery.reach(10) - 1; window.__events = [];
    weaponMastery.onKilled(game, {});`);
assert.deepEqual(json('window.__events.map(row => [row.name, row.detail.id, row.detail.level, row.detail.milestone])'),
    [['weapon-mastery', 'scimitar', 10, true]]);

// 4. 능력치: 든 대분류의 레벨당 피해와 열린 특전만. 다른 대분류의 숙련은 붙지 않는다.
run(`game.weaponMastery.xp.greatsword = weaponMastery.reach(30);`);
assert.deepEqual(json('weaponMastery.lines(game)'), [{ stat: 'pctDmg', val: 4.5 }, { stat: 'aspd', val: 4 }], 'scimitar 10: +4.5% and its first perk');
const unskilled = json(`(() => { game.weaponMastery.xp.scimitar = 0; return weaponMastery.lines(game); })()`);
assert.deepEqual(unskilled, [], 'level 1 adds nothing: stats without mastery stay as they were');
const before = run(`(() => { game.weaponMastery.xp.scimitar = 0; return getPlayerStats(false).damageIncreasePct || 0; })()`);
const after = run(`(() => { game.weaponMastery.xp.scimitar = weaponMastery.reach(20); return getPlayerStats(false).damageIncreasePct || 0; })()`);
assert.ok(Math.abs(after - before - 9.5) < 1e-9, `getPlayerStats picks up the mastery (+${after - before}% damage at level 20)`);
run(`wield('greatsword');`);
assert.deepEqual(json('weaponMastery.lines(game).map(row => row.stat)'), ['pctDmg', 'meleePctDmg', 'pctHp', 'aoePctDmg'], 'greatsword 30: three perks');

// 5. 합계 이정표 → 방치 효율, 방치 정산의 출처 줄.
run(`game.weaponMastery.xp = {}; for (const id of weaponMastery.ids) game.weaponMastery.xp[id] = weaponMastery.reach(10);`);
assert.equal(run('weaponMastery.total(game)'), 60);
assert.equal(run('weaponMastery.offline(game)'), 0.02, 'totals 30 and 60 passed');
assert.deepEqual(json(`getOfflineEfficiencySources(game).find(row => row.key === 'mastery')`), { key: 'mastery', label: '무기 숙련', rate: 0.02 });

// 6. 정산 전후의 레벨 차이(결과 창 한 줄).
const gains = json(`(() => { const before = JSON.parse(JSON.stringify(game)); game.weaponMastery.xp.orb = weaponMastery.reach(13);
    return weaponMastery.gains(before, game); })()`);
assert.deepEqual(gains, [{ id: 'orb', from: 10, to: 13 }]);
assert.match(run(`weaponMasteryUi.settlementLine(${JSON.stringify(gains)})`), /오브 10 → <strong>13<\/strong>/);

// 7. 루프를 넘어 남고, 망가진 값은 0으로 읽는다.
run(`game.weaponMastery.xp = { scimitar: 'abc', orb: -40, flask: 1e12, nope: 500 };`);
assert.equal(run(`weaponMastery.level(game, 'scimitar')`), 1);
assert.equal(run(`weaponMastery.level(game, 'orb')`), 1);
assert.equal(run(`weaponMastery.level(game, 'flask')`), 50, 'capped at the top level');
run(`game.weaponMastery = null;`);
assert.equal(run('weaponMastery.total(game)'), 6, 'a missing record reads as level 1 everywhere');
run(`game.weaponMastery = { xp: { censer: weaponMastery.reach(12) } }; game.season = 3; triggerSeasonReset();`);
assert.equal(run(`weaponMastery.level(game, 'censer')`), 12, 'the loop reset keeps mastery');

// 8. 화면: 기록 창 칸과 무기 툴팁 줄.
const section = run('weaponMasteryUi.sectionHtml()');
assert.match(section, /무기 숙련/);
assert.match(section, /향로/);
assert.match(run(`weaponMasteryUi.tooltipHtml(weaponOf('censer'))`), /향로 숙련 12/);
assert.equal(run(`weaponMasteryUi.tooltipHtml({ slot: '투구' })`), '');
console.log('weapon mastery smoke passed');
