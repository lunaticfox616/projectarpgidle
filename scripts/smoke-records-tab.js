// 전적 기록(js/records.js)과 전적 화면(js/records-ui.js) 행동 검사.
//
// 시간을 다루므로 Date.now를 고정해 결과가 실행 시각에 흔들리지 않게 한다.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const recordsSource = fs.readFileSync('js/records.js', 'utf8');
const uiSource = fs.readFileSync('js/records-ui.js', 'utf8');
const mainUiSource = fs.readFileSync('js/ui.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function bootRecords(gameState, overrides = {}) {
    let clock = { now: 1_700_000_000_000 };
    const context = {
        game: gameState,
        Date: class extends Date {
            constructor(...args) { super(...(args.length ? args : [clock.now])); }
            static now() { return clock.now; }
        },
        safeExposeGlobals(fns) { Object.assign(context, fns); },
        Math, Object, Array, Number, JSON, String, console,
        escapeHTML: value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])),
        getZone: id => ({ id, name: `액트 ${id + 1}` }),
        document: { getElementById: () => null },
        // overrides가 기본 스텁을 덮어써야 하므로 마지막에 펼친다.
        ...overrides
    };
    vm.createContext(context);
    vm.runInContext(recordsSource, context, { filename: 'js/records.js' });
    vm.runInContext(uiSource, context, { filename: 'js/records-ui.js' });
    return { context, clock, advance: ms => { clock.now += ms; } };
}

const baseGame = extra => ({
    season: 1, level: 1, maxZoneId: 0, loopDeaths: 0, loopKills: 0,
    loopProgressCurrent: {}, colony: {}, chaosRealm: {}, skyTower: {}, ocean: {},
    underworldProgress: {},
    ...extra
});

// 1) 기존 세이브(records 없음)는 지금부터 기록을 시작하고, 그 사실이 남는다.
{
    const { context, clock } = bootRecords(baseGame());
    const r = context.ensureRecordsState();
    assert.strictEqual(r.startedAt, clock.now, '기록 시작 시각을 남긴다');
    assert.strictEqual(r.loops.length, 0, '없는 과거를 지어내지 않는다');
    assert.strictEqual(r.currentLoop.loop, 1);
    assert.strictEqual(r.currentLoop.startedAt, clock.now);
}

// 2) 액트 돌파는 루프 시작 기준 경과를 남기고, 루프당 첫 돌파만 기록한다.
{
    const { context, advance } = bootRecords(baseGame());
    context.ensureRecordsState();
    advance(5 * 60 * 1000);
    context.recordActClear(0);
    advance(7 * 60 * 1000);
    context.recordActClear(0);            // 같은 루프의 재클리어는 무시
    context.recordActClear(1);
    const view = context.getRecordsView();
    assert.strictEqual(view.currentLoop.actClears[0], 5 * 60 * 1000, '첫 돌파 시점을 유지한다');
    assert.strictEqual(view.currentLoop.actClears[1], 12 * 60 * 1000, '루프 시작 기준 경과');
    assert.strictEqual(view.actBest[0], 5 * 60 * 1000, '최고 기록에도 반영된다');
    context.recordActClear(-1);
    context.recordActClear('없음');
    assert.strictEqual(Object.keys(view.currentLoop.actClears).length, 2, '잘못된 구역 id는 무시한다');
}

// 3) 루프를 닫으면 소요 시간·도달치가 남고, 다음 루프가 즉시 시작된다.
{
    const { context, advance } = bootRecords(baseGame({ maxZoneId: 4, level: 30, loopDeaths: 2, loopProgressCurrent: { bestAbyssDepth: 23 } }));
    context.ensureRecordsState();
    advance(10 * 60 * 1000);
    context.recordActClear(0);
    advance(50 * 60 * 1000);
    const row = context.closeLoopRecord('cosmos');
    assert.strictEqual(row.durationMs, 60 * 60 * 1000, '루프 소요 시간');
    assert.strictEqual(row.maxZoneId, 4);
    assert.strictEqual(row.bestAbyssDepth, 23);
    assert.strictEqual(row.deaths, 2);
    assert.strictEqual(row.path, 'cosmos');
    assert.strictEqual(row.actClears[0], 10 * 60 * 1000, '루프 기록이 액트 돌파 시간을 함께 보관한다');
    const r = context.ensureRecordsState();
    assert.strictEqual(r.currentLoop.loop, 2, '다음 루프가 시작된다');
    assert.strictEqual(Object.keys(r.currentLoop.actClears).length, 0, '새 루프의 액트 기록은 비어 있다');
    assert.strictEqual(r.actBest[0], 10 * 60 * 1000, '역대 최고는 루프를 건너 유지된다');
}

// 4) 루프 목록은 상한을 넘지 않고, 최신이 앞에 온다.
{
    const { context, advance } = bootRecords(baseGame());
    context.ensureRecordsState();
    const limit = context.RECORDS_LOOP_HISTORY_LIMIT;
    for (let i = 0; i < limit + 5; i++) {
        advance(60 * 1000);
        context.game.season = i + 1;
        context.closeLoopRecord('chaos');
    }
    const view = context.getRecordsView();
    assert.strictEqual(view.loops.length, limit, `보관 상한 ${limit}개를 지킨다`);
    assert.ok(view.loops[0].endedAt >= view.loops[1].endedAt, '최신 루프가 앞에 온다');
}

// 5) 최고 도달은 루프 정산이 초기화하는 값도 단조 증가로 지킨다.
{
    const { context } = bootRecords(baseGame({ colony: { highestWave: 9 }, abyssEndlessDepth: 23, labyrinthUnlockedMaxFloor: 7 }));
    context.trackRecordBests();
    assert.strictEqual(context.game.records.best.colonyWave, 9);
    assert.strictEqual(context.game.records.best.abyssDepth, 23);
    // 루프 정산: 군락지는 통째로 초기화된다(js/combat.js가 defaultGame.colony로 되돌린다).
    context.game.colony = { wave: 0, highestWave: 0 };
    context.game.abyssEndlessDepth = 20;
    context.trackRecordBests();
    assert.strictEqual(context.game.records.best.colonyWave, 9, '초기화되어도 역대 최고는 유지된다');
    assert.strictEqual(context.game.records.best.abyssDepth, 23);
    context.game.colony = { highestWave: 14 };
    context.trackRecordBests();
    assert.strictEqual(context.game.records.best.colonyWave, 14, '더 높은 값은 갱신된다');
}

// 6) 잔상 측정은 최고치와 횟수를 누적한다.
{
    const { context, clock } = bootRecords(baseGame());
    context.recordWoodsmanEchoRun(1000, 100);
    context.recordWoodsmanEchoRun(500, 250);
    const echo = context.getRecordsView().echo;
    assert.strictEqual(echo.runs, 2);
    assert.strictEqual(echo.bestDamage, 1000, '총 피해 최고');
    assert.strictEqual(echo.bestDps, 250, 'DPS 최고는 따로 잡는다');
    assert.strictEqual(echo.lastAt, clock.now);
}

// 7) 요약 통계(최단/평균)는 완료한 루프만 센다.
{
    const { context, advance } = bootRecords(baseGame());
    context.ensureRecordsState();
    [30, 10, 20].forEach(minutes => {
        advance(minutes * 60 * 1000);
        context.closeLoopRecord('chaos');
    });
    const summary = context.getRecordsView().loopSummary;
    assert.strictEqual(summary.count, 3);
    assert.strictEqual(summary.fastestMs, 10 * 60 * 1000);
    assert.strictEqual(summary.averageMs, 20 * 60 * 1000);
}

// 8) 화면: 안 가본 콘텐츠는 행 자체를 숨기고, 빈 상태도 안내를 낸다.
{
    const { context } = bootRecords(baseGame());
    const empty = context.buildRecordsHtml(context.getRecordsView());
    assert.ok(empty.includes('아직 완료한 루프가 없습니다'), '빈 상태 안내');
    assert.ok(!empty.includes('혼돈 심화'), '가보지 않은 콘텐츠는 노출하지 않는다');
    assert.ok(empty.includes('이 기능이 추가된 시점부터'), '기록 시작 시점을 밝힌다');

    context.game.abyssEndlessDepth = 23;
    context.trackRecordBests();
    const filled = context.buildRecordsHtml(context.getRecordsView());
    assert.ok(filled.includes('혼돈 심화'), '도달한 콘텐츠는 노출한다');
}

// 9) 화면: 표시 문자열은 이스케이프한다(구역 이름이 데이터에서 온다).
{
    const { context } = bootRecords(baseGame(), { getZone: () => ({ id: 0, name: '<img src=x onerror=1>' }) });
    context.ensureRecordsState();
    context.closeLoopRecord('chaos');
    const out = context.buildRecordsHtml(context.getRecordsView());
    assert.ok(!out.includes('<img src=x'), '구역 이름을 그대로 심지 않는다');
    assert.ok(out.includes('&lt;img'), '이스케이프한 형태로 들어간다');
}

// 10) 시간 표기는 자릿수가 큰 두 단위까지만 보여준다.
{
    const { context } = bootRecords(baseGame());
    const f = context.formatRecordDuration;
    assert.strictEqual(f(45 * 1000), '45초');
    assert.strictEqual(f(90 * 1000), '1분 30초');
    assert.strictEqual(f(3 * 60 * 60 * 1000 + 25 * 60 * 1000), '3시간 25분');
    assert.strictEqual(f(2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), '2일 5시간');
    assert.strictEqual(f(-1), '0초', '음수는 0으로 다룬다');
}

// ── 배선 ────────────────────────────────────────────────────────────
// 도메인이 맞아도 게임에 연결되어 있지 않으면 화면에 아무것도 남지 않는다.
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert.ok(/recordActClear\(zone\.id\)/.test(combatSource), '액트 돌파가 기록을 남겨야 한다');
assert.ok(/recordWoodsmanEchoRun\(run\.totalDamage, dps\)/.test(combatSource), '잔상 측정이 기록을 남겨야 한다');
assert.ok(/trackRecordBests\(\)/.test(combatSource), '최고 기록을 주기적으로 적립해야 한다');
// 루프 기록은 상태 초기화보다 앞서야 이번 루프의 도달치를 남길 수 있다.
const closeAt = combatSource.indexOf('closeLoopRecord(loopPath)');
const resetAt = combatSource.indexOf('game.unlocks = { ...defaultGame.unlocks }');
assert.ok(closeAt > 0 && resetAt > closeAt, '루프 기록은 초기화 전에 닫아야 한다');

assert.ok(/ensureRecordsState\(merged\)/.test(mainUiSource), '저장 불러오기에서 기록 상태를 정규화해야 한다');
assert.ok(/isTabRendering\('tab-records'\)/.test(mainUiSource), '전적 탭이 보일 때 렌더해야 한다');
assert.ok(/id: 'tab-records'/.test(mainUiSource), '기록 그룹에 전적 탭이 등록되어야 한다');

assert.ok(html.includes('id="tab-records"'), 'index.html에 전적 화면이 있어야 한다');
assert.ok(html.includes('id="ui-records-body"'), '전적 본문 컨테이너가 있어야 한다');
// 로드 순서 계약: 도메인은 state 뒤, 화면은 ui.js 뒤여야 한다.
assert.ok(html.indexOf('js/state.js') < html.indexOf('js/records.js'), 'records.js는 state.js 뒤에 로드해야 한다');
assert.ok(html.indexOf('js/ui.js') < html.indexOf('js/records-ui.js'), 'records-ui.js는 ui.js 뒤에 로드해야 한다');
assert.ok(html.indexOf('js/records.js') < html.indexOf('js/records-ui.js'), '도메인이 화면보다 먼저 로드되어야 한다');

// 화면 파일이 게임 상태를 직접 훑으면 기록 규칙이 두 곳으로 갈라진다.
assert.ok(!/\bgame\.(?!records\b)[a-zA-Z]/.test(uiSource.replace(/\/\/.*$/gm, '')),
    '전적 화면은 getRecordsView() 결과만 읽어야 한다(게임 상태 직접 접근 금지)');

console.log('smoke-records-tab passed');
