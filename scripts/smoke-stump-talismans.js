// 그루터기 함의 부적(2026-09-30, 예전 부적 판 · 생장판 · 컨디션 젬 자리): 예전 판 저장 정리, 봉인 풀기 조건, 판에서 깨어남,
// 이웃 효과(척력 · 중력 · 단순한 부적 · 오만 · 주베누비아의 선택 · 찰나), 젬 레벨, 조건부 줄과 저주의 전투 적용, 밀랍 · 표식,
// 루프 회귀, 저장 경계, 우주계 부적, 화면 조각.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const fresh = extra => run(`game = mergeDefaults(${JSON.stringify(extra || {})}); window.game = game; contentProgression.sync(game);`);
const unlockTalisman = () => run("game.contentProgression.inherited.push('talisman'); contentProgression.sync(game);");
// A legacy-shaped save inherits every unlock up to its loop; drop the talisman one to test the gate.
const lockTalisman = () => run("game.contentProgression.inherited = game.contentProgression.inherited.filter(id => id !== 'talisman'); contentProgression.sync(game);");
const clearBoard = () => run('game.stumpBox.board = game.stumpBox.board.map(() => null); game.stumpBox.items = [];');
// An awake talisman placed on an open cell (loop 8 opens the centre 13 cells).
const awake = (fields, cell) => run(`(() => { const item = stumpBox.addTalisman(game, ${JSON.stringify(fields)}, true);
    item.xp = STUMP_BOX_GROWTH.need.talisman; item.ripe = true; if (!stumpBox.place(game, item.id, ${cell})) throw new Error('place ${cell}'); return item.id; })()`);
const line = (id, value) => ({ kind: 'stat', id, value });
const summary = () => json(`(() => { const s = talismanEffects.summarize(); return { stats: s.stats, boss: s.bossFinalDmgBonusPct,
    suppressed: [...s.suppressed].sort(), amplified: [...s.amplified].sort(), conditions: s.conditions.map(c => [c.id, c.value]) }; })()`);

// ── 예전 부적 판 저장: 보상 없이 지우고 봉인편린은 남긴다(두 번 불러와도 같다) ───────────────────
const legacy = {
    season: 8, loopCount: 7, talismanUnlocked: true, talismanBoardUnlock: 4, talismanUnlockedCells: [1, 2],
    talismanInventory: [{ id: 5, shape: 'O', stat: 'pctDmg', value: 9 }], talismanBoard: [5],
    talismanPlacements: { 5: { x: 0, y: 0, talisman: { id: 5, shape: 'O', stat: 'pctDmg', value: 9 } } },
    talismanSelectedId: 5, talismanUnseal: { current: {} }, talismanUnlockPickMode: true, talismanSubtab: 'board',
    unlocks: { talisman: true }, noti: { talisman: true }, currencies: { sealShard: 7 }, settings: { notiFilters: { talisman: false } }
};
fresh(legacy);
const leftovers = json('Object.keys(game).filter(key => key.startsWith("talisman"))');
assert.deepStrictEqual(leftovers, [], 'every old talisman board key is gone');
assert.deepStrictEqual(json('[game.unlocks.talisman ?? null, game.noti.talisman ?? null, game.settings.notiFilters.talisman ?? null]'), [null, null, null],
    'the old tab unlock, notice dot and notice filter are gone');
assert.strictEqual(run('game.currencies.sealShard'), 7, 'seal shards stay for unsealing');
const once = run('serializeSaveState(game)');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.strictEqual(run('serializeSaveState(game)'), once, 'loading twice changes nothing');

// ── 봉인 풀기: 그루터기 함 · 해금 목록의 부적 · 편린 · 보관함이 모두 있어야 한다 ─────────────────
fresh({ currencies: { sealShard: 3 } });
assert.strictEqual(run("talismans.unseal('sealShard').reason"), '그루터기 함을 먼저 얻어야 합니다.');
fresh({ season: 8, loopCount: 7, currencies: { sealShard: 3, strongSealShard: 0 } });
lockTalisman();
assert.strictEqual(run("talismans.unseal('sealShard').reason"), '해금 목록에서 부적을 먼저 여세요.');
unlockTalisman();
assert.strictEqual(run("talismans.unseal('strongSealShard').reason"), '편린이 부족합니다.');
assert.strictEqual(run("talismans.unseal('nope').reason"), '알 수 없는 편린입니다.');
const sequence = values => `(() => { const values = ${JSON.stringify(values)}; return () => values.length ? values.shift() : 0.5; })()`;
const first = json(`talismans.unseal('sealShard', game, ${sequence([0.9, 0.9, 0.9, 0.5, 0.5])}).item`);
assert.strictEqual(first.family, 'talisman');
assert.strictEqual(first.rarity, 'rare', 'two lines make a rare talisman');
assert.strictEqual(first.lines.length, 2);
assert(first.lines.every(row => row.kind === 'stat'), 'no conditional line below the roll');
assert.strictEqual(run('game.currencies.sealShard'), 2, 'one shard per talisman');
assert.deepStrictEqual(json('stumpBox.storage(game).map(item => item.id)'), [first.id], 'the talisman waits in the stump box storage');
assert.strictEqual(run(`stumpBox.label(stumpBox.itemById(game, ${first.id}))`), `${first.name} · 잠듦`);
assert.strictEqual(run(`stumpBox.iconPath(stumpBox.itemById(game, ${first.id}))`), 'assets/px/stump/sealed-rare.png');
const unique = json(`talismans.unseal('sealShard', game, ${sequence([0])}).item`);
assert.strictEqual(unique.rarity, 'unique', 'a low roll unseals a unique');
run('while (stumpBox.createItem(game, { family: "seed", color: "fire", roll: 1 })) {}');
assert.strictEqual(run("talismans.unseal('sealShard').reason"), '그루터기 함 보관함이 가득 찼습니다.');
assert.strictEqual(run('game.currencies.sealShard'), 1, 'a refused unseal keeps the shard');
assert.deepStrictEqual(json('talismans.exchange(0)'), { ok: false, reason: '교환할 편린이 부족합니다.' });
run('game.currencies.sealShard = 80;');
assert.strictEqual(run('talismans.exchange(0).ok && game.currencies.sealShard === 0 && game.currencies.strongSealShard === 1'), true, '80 seal shards buy a strong shard');

// ── 판에서 깨어남: 판 위에서만 처치로 자라고, 색이 없어 공명 · 억제에 끼지 않는다 ──────────────────
clearBoard();
const sleeper = run(`stumpBox.addTalisman(game, { name: '격노 부적', rarity: 'magic', lines: [${JSON.stringify(line('pctDmg', 10))}] }).id`);
assert.strictEqual(run(`stumpBox.place(game, ${sleeper}, 12)`), true, 'a talisman needs no path');
assert.deepStrictEqual(summary().stats, {}, 'a sleeping talisman gives nothing');
for (let i = 0; i < 9; i++) run('stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.strictEqual(run(`stumpBox.itemById(game, ${sleeper}).ripe`), false, '270 of 300');
run('stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.deepStrictEqual(json(`[stumpBox.itemById(game, ${sleeper}).ripe, stumpBox.stageOf(stumpBox.itemById(game, ${sleeper}))]`), [true, 'talisman']);
assert.deepStrictEqual(summary().stats, { pctDmg: 10 }, 'an awake talisman gives its lines');
assert.strictEqual(run('(() => { const bucket = createEmptyStatBucket(); const s = talismanEffects.summarize(); Object.keys(s.stats).forEach(k => addStatToBucket(bucket, k, s.stats[k])); return bucket.pctDmg; })()'), 10);
run(`{ const fire = stumpBox.createItem(game, { family: 'sap', color: 'fire', roll: 1 }); stumpBox.place(game, fire.id, 11);
    const cold = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }); stumpBox.place(game, cold.id, 13); }`);
assert.strictEqual(run('stumpBox.evaluate(game).suppressed.size'), 0, 'a talisman between fire and cold keeps them apart');
assert.deepStrictEqual(json('stumpBox.evaluate(game).counts'), { fire: 0, cold: 0, lightning: 0, chaos: 0 }, 'talismans never count for resonance');
run('stumpBox.regress(game);');
assert.deepStrictEqual(json(`[stumpBox.itemById(game, ${sleeper}).ripe, stumpBox.itemById(game, ${sleeper}).xp, game.stumpBox.board[12]]`), [false, 0, sleeper],
    'a new loop puts the talisman back to sleep where it lies');
assert.deepStrictEqual(summary().stats, {});

// ── 이웃 효과(판의 상하좌우) ────────────────────────────────────────────────────
clearBoard();
const repel = awake({ name: '척력', rarity: 'unique', special: 'cosmosRepulsion', lines: [] }, 12);
const pride = awake({ name: '오만', rarity: 'unique', special: 'pride', lines: [] }, 13);
const moment = awake({ name: '찰나', rarity: 'unique', special: 'moment', moment: 12, lines: [] }, 11);
const normal = awake({ name: '격노 부적', rarity: 'magic', lines: [line('pctDmg', 10)] }, 6);
let s = summary();
assert.strictEqual(s.stats.pctDmg, 12.5, 'talismans not touching 척력 get +25%');
assert(!s.stats.gemLevel && !s.stats.suppCap, '오만 touching 척력 is off');
assert.strictEqual(s.boss, 0, '찰나 touching 척력 is off');
assert.deepStrictEqual(s.suppressed, [pride, moment].sort((a, b) => a - b));
assert.deepStrictEqual(s.amplified, [normal]);
void repel;

clearBoard();
awake({ name: '척력', rarity: 'unique', special: 'cosmosRepulsion', lines: [] }, 11);
awake({ name: '원천', rarity: 'magic', lines: [line('pctDmg', 10)] }, 12);
awake({ name: '중력', rarity: 'unique', special: 'gravity', lines: [] }, 13);
assert.strictEqual(summary().stats.pctDmg || 0, 0, 'a switched-off talisman does not leak through 중력');
clearBoard();
awake({ name: '척력', rarity: 'unique', special: 'cosmosRepulsion', lines: [] }, 11);
awake({ name: '원천', rarity: 'magic', lines: [line('pctDmg', 10)] }, 12);
awake({ name: '단순한 부적', rarity: 'unique', special: 'simpleCopy', dir: 3, lines: [] }, 13);
assert.strictEqual(summary().stats.pctDmg || 0, 0, 'nor through 단순한 부적');

clearBoard();
awake({ name: '원천', rarity: 'magic', lines: [line('pctDmg', 10), { kind: 'condition', id: 'cry_boss', value: 12 }] }, 12);
const simple = awake({ name: '단순한 부적', rarity: 'unique', special: 'simpleCopy', dir: 3, lines: [] }, 13);
const gravity = awake({ name: '중력', rarity: 'unique', special: 'gravity', lines: [] }, 7);
s = summary();
assert.strictEqual(s.stats.pctDmg, 22.5, '단순한 부적 copies the marked neighbour, 중력 adds 25% of its stat lines');
assert.deepStrictEqual(s.conditions, [['cry_boss', 12]], 'copies take stat lines only');
assert.strictEqual(run(`talismans.turn(${simple})`), true);
assert.strictEqual(summary().stats.pctDmg, 12.5, 'turning the mark away (up: an empty cell) stops the copy');
void gravity;

clearBoard();
const choice = awake(json("talismans.fromCosmos(COSMOS_BOSS_REWARD_DB['planet-48'].talisman)"), 12);
assert.deepStrictEqual(summary().stats, { gemLevel: 2 }, 'a sideways mark: +2 gem levels');
assert.strictEqual(run('getTalismanGemBonusSources([])'), 2, 'the gem level pipeline reads it');
run(`talismans.turn(${choice})`);
assert.deepStrictEqual(summary().stats, { gemLevel: -2, suppCap: 2 }, 'an upright mark: −2 gem levels, +2 support gems');
run('game.woodsmanBuildLock = true;');
assert.strictEqual(run(`talismans.turn(${choice})`), false, 'no turning during the woodsman fight');
run('game.woodsmanBuildLock = false;');

clearBoard();
awake({ name: '오만', rarity: 'unique', special: 'pride', lines: [] }, 12);
assert.deepStrictEqual(summary().stats, { gemLevel: 1, suppCap: 1 }, '오만 alone');
run(`{ const seed = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, seed.id, 13, 'flower'); }`);
assert.deepStrictEqual(summary().stats, { suppCap: 1 }, 'any piece next to it counts');
run(`{ const sap = stumpBox.createItem(game, { family: 'sap', color: 'lightning', roll: 1 }); stumpBox.place(game, sap.id, 11); }`);
assert.deepStrictEqual(summary().stats, { pctDmg: 15, aspd: 10 }, 'two neighbours');

clearBoard();
awake({ name: '찰나', rarity: 'unique', special: 'moment', moment: 12, lines: [] }, 12);
assert.strictEqual(summary().boss, 12);
assert.strictEqual(run('getPlayerStats(false, false, true).damageScales.talismanBossFinalDmgBonusPct'), 12, '찰나 reaches the boss damage scale');
clearBoard();
awake({ name: '불타는 부적', rarity: 'unique', special: 'elementFocus', lines: [line('fireGemLevel', 2), line('firePctDmg', 9), line('resF', 7)] }, 12);
assert.strictEqual(run("getTalismanGemBonusSources(['fire'])"), 2, 'element gem levels follow the gem tags');
assert.strictEqual(run("getTalismanGemBonusSources(['cold'])"), 0);

// ── 조건부 줄: 수호 · 함성은 조건이 맞는 틱에, 저주는 간격마다 적 하나에 ─────────────────────
clearBoard();
awake({ name: '함성 부적', rarity: 'rare', lines: [{ kind: 'condition', id: 'cry_boss', value: 20 }, { kind: 'condition', id: 'guard_low_life', value: 9 },
    { kind: 'condition', id: 'cry_crowd', value: 8 }] }, 12);
awake({ name: '생명 부적', rarity: 'magic', lines: [{ kind: 'condition', id: 'cry_full_life', value: 3 }] }, 6);
const effectsWith = (hp, enemies, extra = '') => json(`(() => { game.playerHp = ${hp}; game.enemies = ${JSON.stringify(enemies)};
    return talismanCombat.effects({ maxHp: 100 ${extra} }).map(row => [row.buff.name, row.buff.type, row.delta]); })()`);
assert.deepStrictEqual(effectsWith(60, [{ id: 1, hp: 5 }]), [], 'no condition holds');
assert.deepStrictEqual(effectsWith(40, [{ id: 1, hp: 5, isBoss: true }]),
    [['talisman:cry_boss', 'warcry', { pctDmg: 20 }], ['talisman:guard_low_life', 'guard', { dr: 9 }]], 'boss fight at low life');
assert.deepStrictEqual(effectsWith(100, [{ id: 1, hp: 5 }, { id: 2, hp: 5 }, { id: 3, hp: 5 }, { id: 4, hp: 0 }]),
    [['talisman:cry_full_life', 'warcry', { crit: 3 }], ['talisman:cry_crowd', 'warcry', { aspd: 8 }]], 'three living enemies at full life (board order)');
assert.deepStrictEqual(effectsWith(40, [{ id: 1, hp: 5, isBoss: true }], ', uniqueClosedEyes: true'), [], '질끈 감은 눈 shuts conditions off');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert(combatSource.includes('runConditionGemAutoRules(pStats); talismanCombat.applyHexes(pStats, getCombatTime());'), 'curses tick with the condition rules');
assert(combatSource.includes('})).concat(talismanCombat.effects(pStats));'), 'guard and warcry lines join the condition effects');

clearBoard();
awake({ name: '저주 부적', rarity: 'rare', lines: [{ kind: 'condition', id: 'hex_vulnerable', value: 10 }, { kind: 'condition', id: 'hex_enfeeble', value: 10 }] }, 12);
awake({ name: '약한 저주 부적', rarity: 'magic', lines: [{ kind: 'condition', id: 'hex_vulnerable', value: 6 }] }, 6);
const hex = now => json(`(() => { talismanCombat.applyHexes({ maxHp: 100, curseCap: 3 }, ${now});
    return (game.enemyConditionDebuffs[7] || []).map(row => [row.name, row.delta, row.expiresAt]); })()`);
run('game.enemies = [{ id: 7, hp: 50, maxHp: 50 }]; game.enemyConditionDebuffs = {};');
assert.deepStrictEqual(hex(1000), [['talisman:hex_vulnerable', { enemyTakenMul: 1.1 }, 7000], ['talisman:hex_enfeeble', { enemyDmgMul: 0.9 }, 7000]],
    'the strongest line of each curse lands on the first living enemy');
assert.deepStrictEqual(json('(() => { const fx = getEnemyConditionDebuffFactor(game.enemies[0], {}); return [fx.mul, fx.enemyDmgMul]; })()'), [1.1, 0.9],
    'the curse factor reads the carried delta');
assert.deepStrictEqual(hex(2000).map(row => row[2]), [7000, 7000], 'no recast before the interval');
assert.deepStrictEqual(hex(9000).map(row => row[2]), [15000, 15000], 'recast every 8 seconds');
assert.deepStrictEqual(hex(100).map(row => row[2]), [6100, 6100], 'a clock that went back does not freeze the curses');
run('game.enemies = [{ id: 8, hp: 50, curseImmune: true }]; game.enemyConditionDebuffs = {};');
assert.deepStrictEqual(hex(50000), [], 'curse-immune enemies are skipped');

// ── 밀랍 · 버리기 ──────────────────────────────────────────────────────────────
clearBoard();
const waxed = run(`stumpBox.addTalisman(game, { name: '두 줄', rarity: 'rare', lines: [${JSON.stringify(line('pctDmg', 10))}, ${JSON.stringify(line('crit', 2))}] }).id`);
assert.deepStrictEqual(json(`talismans.waxPreview(stumpBox.itemById(game, ${waxed}))`), { kind: 'stat', id: 'crit', value: 0.7, wax: true }, '35% of the weakest line');
run('game.currencies.beeswax = 0;');
assert.strictEqual(run(`talismans.wax(${waxed}).reason`), '밀랍이 부족합니다.');
run('game.currencies.beeswax = 1;');
assert.strictEqual(run(`talismans.wax(${waxed}).ok`), true);
assert.deepStrictEqual(json(`[stumpBox.itemById(game, ${waxed}).lines.length, stumpBox.itemById(game, ${waxed}).waxed, game.currencies.beeswax]`), [3, true, 0]);
run('game.currencies.beeswax = 1;');
assert.strictEqual(run(`talismans.wax(${waxed}).ok`), false, 'once per talisman');
assert(run(`talismans.describeLine(stumpBox.itemById(game, ${waxed}).lines[2])`).endsWith('(밀랍)'));
assert.strictEqual(run(`stumpBox.discard(game, ${waxed})`), true, 'a stored talisman can be thrown away');
const placedOne = awake({ name: '판 위', rarity: 'magic', lines: [line('pctDmg', 5)] }, 12);
assert.strictEqual(run(`stumpBox.discard(game, ${placedOne})`), false, 'a placed piece cannot');

// ── 저장 경계: 왕복 그대로, 모르는 줄 · 빈 부적은 버리고, 두 번 해도 같다 ─────────────────────
clearBoard();
awake({ name: '표식', rarity: 'unique', special: 'simpleCopy', dir: 0, lines: [] }, 12);
awake({ name: '찰나', rarity: 'unique', special: 'moment', moment: 12, lines: [] }, 13);
const savedBox = run('JSON.stringify(game.stumpBox)');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.strictEqual(run('JSON.stringify(game.stumpBox)'), savedBox, 'a save round trip keeps talismans, marks and awakening');
run(`game = mergeDefaults({ ...JSON.parse(serializeSaveState(game)), stumpBox: { acquired: true, nextId: 1, items: [
    { id: 20, family: 'talisman', name: '손상', rarity: 'rare', xp: 9999, lines: [{ kind: 'condition', id: 'nope', value: 3 }, { kind: 'stat', id: 'pctDmg', value: 'x' }, { kind: 'stat', id: 'crit', value: 2 }] },
    { id: 21, family: 'talisman', rarity: 'magic', lines: [] },
    { id: 22, family: 'talisman', name: '가짜 고유', rarity: 'magic', special: 'pride', lines: [{ kind: 'stat', id: 'aspd', value: 3 }] },
    { id: 23, family: 'talisman', name: '찰나', rarity: 'unique', special: 'moment', moment: 99, dir: 2, lines: [] }],
    board: [20, 21, 22, 23] } }); window.game = game;`);
assert.deepStrictEqual(json('game.stumpBox.items.map(item => [item.id, item.lines.length, item.xp, item.ripe, item.special || null, item.moment || null, item.dir ?? null])'),
    [[20, 1, 300, true, null, null, null], [22, 1, 0, false, null, null, null], [23, 0, 0, false, 'moment', 15, null]],
    'unknown lines and empty talismans drop, only uniques keep a special, values clamp, only marked uniques keep a mark');
const repaired = run('serializeSaveState(game)');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.strictEqual(run('serializeSaveState(game)'), repaired, 'repairing twice changes nothing');

// ── 우주계 부적: 보관함이 가득 차도 잃지 않는다 ──────────────────────────────────────
run('while (stumpBox.createItem(game, { family: "sap", color: "chaos", roll: 1 })) {}');
const full = run('game.stumpBox.items.length');
const cosmos = json("stumpBox.addTalisman(game, talismans.fromCosmos(COSMOS_BOSS_REWARD_DB['planet-47'].talisman), true)");
assert.strictEqual(run('game.stumpBox.items.length'), full + 1);
assert.deepStrictEqual(cosmos.lines.map(row => row.id), ['leechRateCap', 'leechTotalCap', 'leechInstanceCap']);
assert.strictEqual(run("stumpBox.addTalisman(game, talismans.fromCosmos(COSMOS_BOSS_REWARD_DB['planet-47'].talisman))"), null, 'unsealing still respects the storage');

// ── 화면 조각 ────────────────────────────────────────────────────────────────
fresh({ season: 8, loopCount: 7, currencies: { sealShard: 2, beeswax: 1 } });
lockTalisman();
assert.strictEqual(run('stumpTalismanUi.unsealHtml()'), '', 'no unseal panel before the unlock');
unlockTalisman();
const panel = run('stumpTalismanUi.unsealHtml()');
assert(panel.includes('봉인편린 풀기 · 2') && panel.includes('data-stump-action="talisman-unseal"'), 'the unseal panel shows the shards');
const shown = awake({ name: '보여 줄 부적', rarity: 'rare', lines: [line('pctDmg', 10), { kind: 'condition', id: 'hex_break', value: 9 }] }, 12);
const detail = run(`stumpTalismanUi.detailHtml(stumpBox.itemById(game, ${shown}), 12)`);
assert(detail.includes('희귀 부적') && detail.includes('8초마다 적 하나를 저주: 6초 동안 원소 저항 −9') && detail.includes('talisman-wax'), 'detail: rarity, lines, wax');
assert(!detail.includes('talisman-discard'), 'a placed talisman cannot be thrown away from the detail');
assert(run('stumpTalismanUi.summaryHtml()').includes('깨어난 부적'));
const html = fs.readFileSync('index.html', 'utf8');
assert(html.includes('id="stump-box-unseal"') && !html.includes('id="tab-talisman"') && !html.includes('btn-tab-talisman'), 'the talisman window is gone; unsealing lives in the stump box');

console.log('stump talismans: legacy cleanup, unseal, awakening, neighbours, gem levels, conditions, curses, wax, saves, cosmos and screen: OK');
