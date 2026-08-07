// 지도 알람(빨간 점)을 보고 지도를 열면, 마지막에 보던 화면이 아니라
// 그 알람을 띄운 세부 화면부터 열리는지 검사한다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');

function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

function readConstSource(source, name) {
    const start = source.indexOf(`const ${name} =`);
    assert.ok(start >= 0, `${name} must exist`);
    const end = source.indexOf('\n', start);
    return source.slice(start, end);
}

// 좌측 탐험 버튼은 해금되면 style.display를 비운다. 여기서는 노출 여부만 흉내 낸다.
function bootMapAlarmContext(gameState, visibleSubtabs) {
    const buttons = {};
    ['map-explore-hunting', 'map-explore-root-boss', 'map-explore-colony', 'map-explore-trials'].forEach(id => {
        buttons['btn-' + id] = { style: { display: visibleSubtabs.includes(id) ? '' : 'none' } };
    });
    const context = {
        game: gameState,
        document: { getElementById: id => buttons[id] || null },
        LAST_STORY_ZONE_ID: 9,
        SEASON_BOSS_ZONES: [{ reqSeason: 2 }, { reqSeason: 5 }],
        TRIAL_ZONES: [
            { id: 'trial_1', reqZone: 3 },
            { id: 'trial_2', reqZone: 8 }
        ],
        canSeeTalentBloomTrial: () => false,
        isNotiEnabled: () => true,
        Array,
        Math,
        Object
    };
    vm.createContext(context);
    vm.runInContext([
        readConstSource(uiSource, 'MAP_EXPLORE_ALARM_SUBTABS'),
        readFunctionSource(uiSource, 'getMapExploreUnlockSignatures'),
        readFunctionSource(uiSource, 'ensureMapAlarmState'),
        readFunctionSource(uiSource, 'isMapExploreSubtabOpenable'),
        readFunctionSource(uiSource, 'getMapAlarmSourceSubtab'),
        readFunctionSource(uiSource, 'focusMapAlarmSourceSubtab')
    ].join('\n'), context, { filename: 'map-alarm-focus.js' });
    return context;
}

const baseMapGame = extra => ({
    maxZoneId: 3, season: 2, noti: { map: true },
    claimableActRewards: [],
    unlockedTrials: [], completedTrials: [],
    mapSubtab: 'map-tab-underworld', mapExploreSubtab: 'map-explore-hunting',
    mapAlarmSeen: {}, mapAlarmMainSeen: {},
    ...extra
});

// 1) 미수령 액트 보상이 있으면 보상 카드가 붙는 나무(사냥터) 화면으로 연다.
{
    const context = bootMapAlarmContext(
        baseMapGame({ claimableActRewards: [0, 1], mapExploreSubtab: 'map-explore-trials' }),
        ['map-explore-hunting', 'map-explore-trials']
    );
    context.focusMapAlarmSourceSubtab();
    assert.strictEqual(context.game.mapSubtab, 'map-tab-zones', '탐험 화면으로 전환해야 한다');
    assert.strictEqual(context.game.mapExploreSubtab, 'map-explore-hunting', '액트 보상은 나무 화면에서 받는다');
}

// 2) 새로 열린 전직 시련은 그 시련 화면으로 연다.
{
    const context = bootMapAlarmContext(
        baseMapGame({ mapAlarmSeen: { 'map-explore-hunting': 3, 'map-explore-root-boss': 1, 'map-explore-colony': 0, 'map-explore-trials': 0 } }),
        ['map-explore-hunting', 'map-explore-root-boss', 'map-explore-trials']
    );
    context.focusMapAlarmSourceSubtab();
    assert.strictEqual(context.game.mapExploreSubtab, 'map-explore-trials', '새로 열린 시련 화면으로 이동');
}

// 3) 아직 해금되지 않아 버튼이 숨겨진 세부 탭은 대상으로 고르지 않는다(빈 화면 방지).
{
    const context = bootMapAlarmContext(
        baseMapGame({ mapAlarmSeen: { 'map-explore-hunting': 3, 'map-explore-root-boss': 1, 'map-explore-colony': 0, 'map-explore-trials': 0 } }),
        ['map-explore-hunting']
    );
    context.focusMapAlarmSourceSubtab();
    assert.strictEqual(context.game.mapSubtab, 'map-tab-underworld', '고를 화면이 없으면 그대로 둔다');
    assert.strictEqual(context.game.mapExploreSubtab, 'map-explore-hunting');
}

// 4) 알람이 꺼져 있으면 마지막에 보던 화면을 그대로 유지한다(임의 이동 금지).
{
    const context = bootMapAlarmContext(
        baseMapGame({ noti: { map: false }, claimableActRewards: [0], mapExploreSubtab: 'map-explore-trials' }),
        ['map-explore-hunting', 'map-explore-trials']
    );
    context.focusMapAlarmSourceSubtab();
    assert.strictEqual(context.game.mapSubtab, 'map-tab-underworld', '알람 없이 열면 보던 화면 유지');
    assert.strictEqual(context.game.mapExploreSubtab, 'map-explore-trials');
}

// 5) 알람 원인이 탐험 밖(혼돈계·운석 등)이면 화면을 옮기지 않는다.
{
    const context = bootMapAlarmContext(
        baseMapGame({ mapAlarmSeen: { 'map-explore-hunting': 3, 'map-explore-root-boss': 1, 'map-explore-colony': 0, 'map-explore-trials': 1 } }),
        ['map-explore-hunting', 'map-explore-root-boss', 'map-explore-trials']
    );
    assert.strictEqual(context.getMapAlarmSourceSubtab(), null, '새 해금이 없으면 원인 화면도 없다');
    context.focusMapAlarmSourceSubtab();
    assert.strictEqual(context.game.mapSubtab, 'map-tab-underworld');
}

// 6) 알림을 끄기 전에 판정해야 하므로, switchTab이 알림 해제보다 앞에서 호출해야 한다.
{
    const switchTabSource = readFunctionSource(uiSource, 'switchTab');
    const focusAt = switchTabSource.indexOf('focusMapAlarmSourceSubtab()');
    const clearAt = switchTabSource.indexOf('TAB_HEADER_NOTI_KEYS.forEach');
    assert.ok(focusAt >= 0, 'switchTab이 지도 알람 원인 화면을 선택해야 한다');
    assert.ok(clearAt >= 0 && focusAt < clearAt, '알림을 해제하기 전에 원인 화면을 판정해야 한다');
}

console.log('smoke-map-alarm-focus passed');
