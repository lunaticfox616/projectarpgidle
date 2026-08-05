const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function extract(source, startNeedle, endNeedle) {
    const start = source.indexOf(startNeedle);
    const end = source.indexOf(endNeedle, start);
    assert(start >= 0 && end > start, `source block not found: ${startNeedle}`);
    return source.slice(start, end);
}

const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const htmlSource = fs.readFileSync('index.html', 'utf8');

const journalRuntimeBlock = extract(passiveSource, 'function getClaimedJournalPassivePointTotal', 'function markActRewardReady');
let requestGoalSystemRefreshCalls = 0;
const runtime = {
    JOURNAL_DB: {
        act_1: { title: '액트 1', bonus: { stat: 'flatHp', value: 5, label: '최대 생명력 +5' } },
        immortal: { title: '불사자', bonus: { stat: 'passivePoint', value: 1, label: '영구 패시브 포인트 +1' } }
    },
    game: {
        journalEntries: ['prologue'],
        journalBonuses: [{ entryId: 'act_1', stat: 'flatHp', value: 5 }],
        journalBonusClaims: {},
        passivePoints: 0,
        noti: {}
    },
    addLog() {},
    requestGoalSystemRefresh() { requestGoalSystemRefreshCalls++; }
};
vm.createContext(runtime);
vm.runInContext(journalRuntimeBlock, runtime, { filename: 'journal-runtime.js' });

runtime.unlockJournalEntry('act_1');
assert.strictEqual(runtime.game.journalBonuses.length, 1, 'an existing deterministic journal bonus must not be duplicated');
assert.strictEqual(runtime.game.journalBonusClaims.act_1, true);
assert.strictEqual(runtime.game.noti.journal, true, 'a newly unlocked journal must raise its tab notification');

runtime.unlockJournalEntry('immortal');
runtime.unlockJournalEntry('immortal');
assert.strictEqual(runtime.game.passivePoints, 1, 'passive-point journal rewards must remain one-time');
assert.strictEqual(requestGoalSystemRefreshCalls, 2, 'only genuinely new records should refresh the goal system');

const repaired = {
    journalEntries: ['act_1', 'immortal'],
    journalBonuses: [
        { entryId: 'act_1', stat: 'flatHp', value: 500 },
        { entryId: 'act_1', stat: 'flatHp', value: 5 },
        { entryId: 'immortal', stat: 'passivePoint', value: 1 }
    ],
    journalBonusClaims: { act_1: true, immortal: true }
};
const repairResult = runtime.rebuildJournalBonusStateForLoad(repaired);
assert.deepStrictEqual(JSON.parse(JSON.stringify(repaired.journalBonuses)), [
    { entryId: 'act_1', stat: 'flatHp', value: 5 }
], 'load repair must rebuild one authoritative bonus from JOURNAL_DB');
assert.strictEqual(repairResult.pendingPassivePoints, 1, 'legacy passive-point rows must convert exactly once');
assert.strictEqual(repaired.journalBonusClaims.immortal, true);

runtime.JOURNAL_DB.labyrinth_10 = { title: '고대 미궁' };
runtime.JOURNAL_DB.time_rift_fusion = { title: '시간의 균열' };
const recoveredProgress = {
    journalEntries: [],
    labyrinthUnlockedMaxFloor: 11,
    inventory: [{ fusedRelic: true }]
};
runtime.repairJournalEntriesFromProgress(recoveredProgress);
assert(recoveredProgress.journalEntries.includes('labyrinth_10'), 'completed exploration milestones must recover their journal entry on load');
assert(recoveredProgress.journalEntries.includes('time_rift_fusion'), 'a saved fused relic must recover the time-rift journal entry');

const actionBlock = extract(uiSource, 'function getJournalEntryAction', 'function updateStaticUI');
const calls = [];
const actionRuntime = {
    game: {
        season: 31,
        unlocks: { map: true, char: true },
        starWedge: { unlocked: true },
        chaosRealm: { unlocked: true },
        cosmosAtlas: {}
    },
    STAR_WEDGE_UNLOCK_LOOP: 7,
    OCEAN_UNLOCK_LOOP: 11,
    TIME_RIFT_UNLOCK_LOOP: 13,
    getCosmosCapstoneProgress: () => ({ canChallenge: false }),
    switchTab: id => calls.push(['tab', id]),
    switchMapSubtab: id => calls.push(['map', id]),
    switchMapExploreSubtab: id => calls.push(['explore', id])
};
vm.createContext(actionRuntime);
vm.runInContext(actionBlock, actionRuntime, { filename: 'journal-actions.js' });

assert.strictEqual(actionRuntime.getJournalEntryAction('cosmos_astra').subtabId, 'map-tab-cosmos');
assert.strictEqual(actionRuntime.getJournalEntryAction('labyrinth_10').subtabId, 'map-explore-labyrinth');
actionRuntime.openJournalEntryAction('act_4');
assert.deepStrictEqual(calls, [
    ['tab', 'tab-map'],
    ['map', 'map-tab-zones'],
    ['explore', 'map-explore-hunting']
], 'journal actions must open the correct nested content screen');

actionRuntime.getCosmosCapstoneProgress = () => ({ canChallenge: true });
assert.strictEqual(actionRuntime.getJournalEntryAction('cosmos_astra').subtabId, 'map-explore-root-boss');

assert(htmlSource.includes('id="noti-journal"'), 'the journal tab needs a visible notification dot');
assert(uiSource.includes("if (id === 'cosmos_astra') return '우주계 기록'"), 'Astra must not be categorized as an abandoned blade');
assert(uiSource.includes('class="journal-next-target'), 'the journal should expose a next-record target');
assert(uiSource.includes('rebuildJournalBonusStateForLoad(merged)'), 'save loading must use the tested deterministic journal ledger');

console.log('smoke-journal-progression passed');
