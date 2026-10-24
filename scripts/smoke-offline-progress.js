const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

// 방치 정산의 시간과 효율(2026-10-25 사용자: 영구 방치 성장을 해금에 통합): 해금 탭 강화의 시간 인식과 전투 효율 단계로 읽고,
// 옛 저장은 잔재로 올린 단계를 물려받으며 방치 보관함의 장비는 가방으로 돌아온다. 보관함과 방치 지시는 없다.
(async function runOfflineProgressSmoke() {

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const { mergeDefaults, simulateBackgroundCombat, simulateBackgroundCombatChunked } = runtime;

// A new game counts 3 hours at 30%; each step raises them, and the outside sources stop at the cap.
run('game = mergeDefaults({})');
assert.deepStrictEqual(json('[getOfflineProgressConfig(game).recognitionHours, getOfflineProgressConfig(game).baseEfficiencyRate]'), [3, 0.3]);
run(`game.season = 5; contentProgression.sync();
    for (const id of ['offlineHours1', 'offlineHours2', 'offlineRate1']) if (!contentProgression.purchase(id).ok) throw new Error(id);`);
assert.deepStrictEqual(json('[getOfflineProgressConfig(game).recognitionHours, getOfflineProgressConfig(game).baseEfficiencyRate]'), [9, 0.32]);
assert.strictEqual(run('getOfflineProgressConfig(game).effectiveLimitMs'), 9 * 3600000 * 0.32);
run('game = mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.strictEqual(run('getOfflineProgressConfig(game).recognitionHours'), 9, 'bought steps survive a reload');
assert.strictEqual(run(`getOfflineProgressConfig({ ...game, atlas: { epoch: { perks: { calm: 99 } } } }).efficiencyRate <= OFFLINE_PROGRESS_EFFICIENCY_CAP`), true);

// An old save: its remnant levels become steps (efficiency's last level is now the 5th step), its stash gear comes back to the bag
// and nothing of the old system is left; a second load changes nothing.
const oldSave = {
    season: 30, loopCount: 29, inventory: [],
    contentProgression: { version: 9, highestLoop: 30, carry: 0, unlocked: [], paidCosts: {}, inherited: [] },
    offlineProgress: { version: 1, recognitionLevel: 7, efficiencyLevel: 6, stashLevel: 2, huntDirectiveUnlocked: true, stash: [{ name: 'old-stash', rarity: 'rare', slot: '반지1', baseStats: [] }], protectedOverflow: [] },
    currencies: { timeRemnant: 40 }
};
run(`game = mergeDefaults(${JSON.stringify(oldSave)})`);
assert.deepStrictEqual(json('[getOfflineProgressConfig(game).recognitionHours, getOfflineProgressConfig(game).baseEfficiencyRate]'), [24, 0.4]);
assert.strictEqual(run('getEquipmentInventoryPageCount(game)'), 7, 'loop 30 kept the 7 bag pages it had');
assert.deepStrictEqual(json("[game.offlineProgress === undefined, game.currencies.timeRemnant === undefined, [...game.inventory, ...game.equipmentTemporaryStorage].filter(item => item.name === 'old-stash').length]"), [true, true, 1]);
const loaded = run('JSON.stringify(game)');
run('game = mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.strictEqual(run('JSON.stringify(game.contentProgression)'), JSON.stringify(JSON.parse(loaded).contentProgression), 'the inheritance happens once');

// Away combat has no directive stops any more: a hunt that kills nothing still runs its whole time.
const snapshot = mergeDefaults({ loopCount: 0, inventory: [], heroSelectionInitialized: true, playerHp: 100, moveTimer: 600, moveTotalTime: 600, enemies: [], encounterPlan: [] });
const syncResult = simulateBackgroundCombat({ elapsedMs: 360000, snapshot });
assert.strictEqual(syncResult.processedMs, 360000, 'the whole away time is settled');
assert.strictEqual(syncResult.stopReason || null, null);
runtime.setTimeout = fn => setImmediate(fn);
const asyncResult = await simulateBackgroundCombatChunked({ elapsedMs: 360000, snapshot });
assert.strictEqual(asyncResult.processedMs, syncResult.processedMs);

console.log('smoke-offline-progress: ok');
}()).catch(error => { console.error(error); process.exitCode = 1; });
