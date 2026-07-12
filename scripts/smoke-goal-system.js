// 목표 선정 계층(js/goal-system.js) 행동 검사.
// 실제 파일을 가짜 상태/헬퍼 경계 위에서 실행해 우선순위·보조 안내·오류 격리 계약을 고정한다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('js/goal-system.js', 'utf8');

function boot(gameState, overrides = {}) {
    const exposed = {};
    const presented = [];
    const timers = [];
    const context = {
        console: { warn: () => {}, log: () => {}, error: () => {} },
        setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
        clearTimeout: () => {},
        safeExposeGlobals: fns => Object.assign(exposed, fns),
        presentGoalDrawer: goal => presented.push(goal),
        game: gameState,
        LAST_STORY_ZONE_ID: 9,
        TAB_UNLOCK_GATES: { 'tab-map': 'map', 'tab-season': 'season' },
        getZone: id => ({ id, name: `지역${id}`, type: id <= 9 ? 'act' : 'abyss' }),
        getStoryActByZoneId: id => (id <= 9 ? { order: id + 1, bossName: `보스${id + 1}` } : null),
        getSeasonAbyssDepthCap: season => (season <= 9 ? 10 + (season - 1) : 20),
        hasCurrentLoopAbyssRequirementClear: () => false,
        getAvailableLoopAdvancePaths: () => [],
        getHighestUnlockedEndlessChaosDepth: () => 0,
        getInventoryLimit: () => 30,
        ...overrides
    };
    vm.createContext(context);
    vm.runInContext(source, context, { filename: 'js/goal-system.js' });
    return { exposed, presented, timers, context, refresh: () => exposed.runGoalSystemRefresh() };
}

const baseGame = extra => ({
    maxZoneId: 0, currentZoneId: 0, runProgress: 42.7, season: 1,
    unlocks: { map: false, season: false, char: false, traits: false },
    inventory: [], claimableActRewards: [],
    passivePoints: 0, ascendPoints: 0, seasonPoints: 0,
    loopProgressCurrent: {},
    ...extra
});

// 1) 새 게임: 액트 1 진행 목표. 지도 미해금이므로 버튼 없음(잠긴 화면을 열지 않음).
{
    const m = boot(baseGame());
    m.refresh();
    const goal = m.presented[0];
    assert(goal, '새 게임에서 목표가 있어야 함');
    assert.strictEqual(goal.id, 'story-zone-0');
    assert(goal.title.includes('보스1'), '액트 보스 처치 목표');
    assert.strictEqual(goal.current, 42, '실제 runProgress 사용');
    assert.strictEqual(goal.target, 100);
    assert.strictEqual(goal.actionTabId, undefined, '지도 미해금 상태에서는 버튼을 만들지 않음');
}

// 2) 지도 해금 후에는 같은 목표에 화면 열기 버튼이 붙는다(화면 열기 외 동작 없음).
{
    const m = boot(baseGame({ maxZoneId: 1, currentZoneId: 1, unlocks: { map: true } }));
    m.refresh();
    const goal = m.presented[0];
    assert.strictEqual(goal.actionTabId, 'tab-map');
    assert.strictEqual(typeof goal.actionLabel, 'string');
    assert(!('action' in goal) && !('onAction' in goal), '목표에 실행 함수를 싣지 않는다');
}

// 3) 선택하지 않은 액트 보상은 전투 목표보다 우선한다.
{
    const m = boot(baseGame({ maxZoneId: 3, claimableActRewards: [0, 2], unlocks: { map: true } }));
    m.refresh();
    assert.strictEqual(m.presented[0].id, 'claim-act-reward');
    assert(m.presented[0].description.includes('2개'));
}

// 4) pendingLoopReady는 최우선이며, 보상 대기는 보조 안내로 밀려난다.
{
    const m = boot(baseGame({ pendingLoopReady: true, claimableActRewards: [0], unlocks: { map: true, season: true } }));
    m.refresh();
    const goal = m.presented[0];
    assert.strictEqual(goal.id, 'pending-loop-advance');
    assert.strictEqual(goal.mandatory, true);
    assert(goal.notices.some(n => n.includes('액트 보상')), '보상은 보조 안내로 표시');
}

// 5) 스토리 이후에는 현재 루프가 요구하는 혼돈 깊이를 실제 진행도로 표시한다.
{
    const m = boot(baseGame({ maxZoneId: 12, season: 8, unlocks: { map: true }, loopProgressCurrent: { bestAbyssDepth: 13 } }));
    m.refresh();
    const goal = m.presented[0];
    assert.strictEqual(goal.id, 'loop-chaos-17', '시즌 8 요구 깊이 17');
    assert.strictEqual(goal.current, 13);
    assert.strictEqual(goal.target, 17);
}

// 6) 루프 조건 달성 시 즉시 '루프 진행 준비' 목표로 바뀌고, 우주계 대체 경로는 보조 안내로 나온다.
{
    const m = boot(
        baseGame({ maxZoneId: 12, season: 31, unlocks: { map: true, season: true } }),
        { hasCurrentLoopAbyssRequirementClear: () => true, getAvailableLoopAdvancePaths: () => ['chaos', 'cosmos'] }
    );
    m.refresh();
    assert.strictEqual(m.presented[0].id, 'loop-requirement-met');
    // 우주계 안내는 주 목표가 혼돈 진행일 때만 표시(달성 상태에서는 불필요).
    const m2 = boot(
        baseGame({ maxZoneId: 12, season: 31, unlocks: { map: true } }),
        { getAvailableLoopAdvancePaths: () => ['cosmos'] }
    );
    m2.refresh();
    assert(m2.presented[0].id.startsWith('loop-chaos-'));
    assert(m2.presented[0].notices.some(n => n.includes('우주계')), '우주계 대체 경로 보조 안내');
}

// 7) 사용하지 않은 포인트는 주 목표를 빼앗지 않고 보조 안내(최대 2개)로만 표시된다.
{
    const m = boot(baseGame({
        maxZoneId: 2, currentZoneId: 2, passivePoints: 4, ascendPoints: 2, seasonPoints: 1,
        unlocks: { map: true, char: true, traits: true, season: true }
    }));
    m.refresh();
    const goal = m.presented[0];
    assert(goal.id.startsWith('story-zone-'), '포인트가 주 목표를 빼앗지 않음');
    assert.strictEqual(goal.notices.length, 2, '보조 안내는 최대 2개');
    assert(goal.notices[0].includes('패시브 포인트 4'));
}

// 8) 표시할 목표가 전혀 없으면 null로 숨긴다.
{
    const m = boot(baseGame({ maxZoneId: 12 }), {
        getSeasonAbyssDepthCap: () => { throw new Error('broken'); }
    });
    m.refresh();
    assert.strictEqual(m.presented[0], null, '규칙이 모두 실패/불일치면 숨김');
}

// 9) 손상된 저장 데이터(NaN/누락/음수)에서도 예외 없이 동작한다.
{
    const m = boot({ maxZoneId: NaN, currentZoneId: 0, runProgress: -5, unlocks: null, claimableActRewards: 'bad' });
    assert.doesNotThrow(() => m.refresh());
    const goal = m.presented[0];
    assert(goal && goal.id === 'story-zone-0', 'NaN maxZoneId는 0으로 처리');
    assert.strictEqual(goal.current, 0, '음수 진행도는 0으로 clamp');
    const m2 = boot({ maxZoneId: 1, currentZoneId: 'x', runProgress: 50, unlocks: null });
    assert.doesNotThrow(() => m2.refresh());
    assert(m2.presented[0] && m2.presented[0].id === 'story-zone-1', '손상된 currentZoneId에서도 목표 선정');
}

// 10) 규칙 하나가 던져도 다음 우선순위 규칙이 대신 선정된다.
{
    // claim-act-reward 규칙의 matches만 예외를 던지도록, length 접근 시 터지는 배열 프록시 사용.
    const explodingRewards = new Proxy([], { get(target, prop) { if (prop === 'length') throw new Error('boom'); return target[prop]; } });
    const m = boot(baseGame({ maxZoneId: 2, currentZoneId: 2, claimableActRewards: explodingRewards, unlocks: { map: true } }));
    m.refresh();
    const goal = m.presented[0];
    assert(goal, '규칙 실패 시에도 목표 선정이 계속되어야 함');
    assert(goal.id.startsWith('story-zone-'), '다음 규칙으로 폴백');
}

// 11) 연속 호출은 디바운스되어 한 번만 실행된다.
{
    const m = boot(baseGame());
    m.exposed.requestGoalSystemRefresh();
    m.exposed.requestGoalSystemRefresh();
    m.exposed.requestGoalSystemRefresh();
    assert.strictEqual(m.timers.length, 1, '중복 예약 금지');
    m.timers[0].fn();
    assert.strictEqual(m.presented.length, 1, '실행은 한 번');
}

console.log('smoke-goal-system passed');
