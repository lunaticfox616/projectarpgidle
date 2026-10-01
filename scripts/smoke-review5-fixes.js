// 출시 전 검토 5차 수정의 회귀 검사 (2026-10-01):
// - 루프 2의 탭 해금 안내(unlock_items)가 새 캐릭터의 시작 안내(tutorial_first_gear)를 본 사람에게 '처음 얻었습니다'를 다시 띄웠다.
// - 젬 설명 "피해의 45%를"이 "45%" / "를 줍니다."로 갈렸다(keep-all로도 막히지 않는 자리).
// - 진행 · 이정표의 앞날 루프가 같은 예고로 네 줄씩 늘어섰다.
// - 아틀라스 패시브 바퀴 넷(2×2)이 창 높이를 넘었고, 노드에 마우스를 올려도 설명이 곧바로 사라졌다.
// - 휴대폰에서 이웃한 적의 체력 막대가 한 줄로 이어져 보였다(막대가 칸보다 넓었다).
// 검토 6차: 실행 중 오류가 전투 기록을 스택으로 덮어썼고, 방치 결과 창이 떠 있던 이야기 카드 위에 겹쳤다. 아틀라스 노드 설명 카드가
// 바퀴 옆 설명 칸을 가렸다(이제 그 칸에서 읽힌다).
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = source => vm.runInContext(source, runtime);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior'});window.game=game;`);

// 같은 안내의 두 이름: 시작 안내를 본 사람에게 해금 안내를 다시 띄우지 않는다. 처음 보는 사람에게는 그대로 띄운다.
const notices = copy(`(() => {
    tutorialQueue.length = 0;
    game.seenTutorials = ['tutorial_first_gear'];
    queueTutorialNotice('unlock_items', '첫 장비', '장비나 제작 재화를 처음 얻었습니다.', 'tab-items');
    const afterSeen = tutorialQueue.length;
    game.seenTutorials = [];
    queueTutorialNotice('unlock_items', '첫 장비', '장비나 제작 재화를 처음 얻었습니다.', 'tab-items');
    return { afterSeen, fresh: tutorialQueue.length };
})()`);
assert.deepEqual(notices, { afterSeen: 0, fresh: 1 }, 'the loop-2 unlock card stays quiet after the starter guide');

// "45%를": %와 조사 사이에 줄바꿈 금지 문자가 들어가고, 젬 카드에도 그대로 실린다.
assert.equal(run(`keepKoreanUnitParticles('첫 타격 피해의 45%를 줍니다. 100% 확률')`), '첫 타격 피해의 45%⁠를 줍니다. 100% 확률');
assert.ok(run(`renderAttackGemCard('연속 베기', '연속 베기', getUiPlayerStats())`).includes('45%⁠를'), 'the gem card keeps "45%를" together');

// 앞날의 루프 중 같은 예고만 잇는 루프는 한 줄로 묶는다(해금이 열리는 루프와 현재 루프는 따로).
const runs = copy(`(() => {
    game.season = 20;
    return contentUnlockUi.milestoneRuns([20, 21, 22, 23, 24]).map(run => [run.start, run.end]);
})()`);
assert.deepEqual(runs[0], [20, 20], 'the current loop keeps its own row');
assert.ok(runs.length < 5, 'identical future loops share a row: ' + JSON.stringify(runs));
assert.ok(run(`contentUnlockUi.milestone(21, 24)`).includes('루프 21–24'), 'a merged row names its loop range');

// 아틀라스 패시브: 바퀴는 하나만 보이고(나머지는 숨김), 고르면 바뀐다. 노드는 설명 칸을 유지하는 앵커다.
const wheels = copy(`(() => {
    const visible = html => (html.match(/<section class="atlas-wheel"[^>]*>/g) || []).map(tag => !tag.includes(' hidden'));
    const first = visible(atlasPassivesUi.html());
    globalThis.atlasUi = { refresh() {} }; // 창 없이: 다시 그리기와 설명 칸 닫기는 할 일이 없다
    hideInfoTooltip = () => {};
    atlasPassivesUi.pick(ATLAS_PASSIVES.wheels[2].id);
    const html = atlasPassivesUi.html();
    // 마우스를 올린 노드는 바퀴 옆 설명 칸에서 읽힌다(떠 있는 카드가 그 칸을 가렸다 — 검토 6차). 떠나면 소개로 돌아간다.
    const note = { innerHTML: '' }, art = { dataset: { wheel: ATLAS_PASSIVES.wheels[2].id } }, section = { querySelector: () => note };
    const target = { closest: selector => (selector === '.atlas-wheel' ? section : art) }, node = ATLAS_PASSIVES.wheels[2].nodes[1];
    atlasPassivesUi.hint({ currentTarget: target }, node.id);
    const shown = note.innerHTML.includes(node.name);
    atlasPassivesUi.hint({ currentTarget: target }, null);
    return { first, picked: visible(html), previews: html.split('onmouseenter="atlasPassivesUi.hint(event,').length - 1,
        shown, left: !note.innerHTML.includes(node.name) };
})()`);
assert.deepEqual(wheels.first, [true, false, false, false], 'one wheel on screen at first');
assert.deepEqual(wheels.picked, [false, false, true, false], 'picking a wheel shows that wheel');
assert.equal(wheels.previews, 76, 'every passive node previews on hover');
assert.ok(wheels.shown && wheels.left, 'the note reads the hovered passive and goes back after the pointer leaves');

// 적 체력 막대는 칸보다 넓지 않다(좁은 휴대폰 칸), 넓은 칸에서는 예전 너비, 보스는 그대로.
assert.equal(run(`getEnemyFieldBarWidth({}, 30)`), 25);
assert.equal(run(`getEnemyFieldBarWidth({ isElite: true }, 30)`), 25);
assert.equal(run(`getEnemyFieldBarWidth({}, 80)`), 40);
assert.equal(run(`getEnemyFieldBarWidth({ isElite: true }, 80)`), 54);
assert.equal(run(`getEnemyFieldBarWidth({ isBoss: true }, 30)`), 96);
assert.equal(run(`getEnemyFieldBarWidth({})`), 40, 'no grid size: the old width');

// 검토 6차: 실행 중 오류는 전투 기록에 짧은 한국어 한 줄만 남긴다(파일 경로가 든 스택으로 기록을 덮어썼다).
const runtimeLog = copy(`(() => {
    const lines = [];
    addLog = (text, kind, options) => lines.push({ text, kind, rateKey: options && options.rateKey });
    const quiet = console.error; console.error = () => {};
    reportFatalError('runtime', new Error('boom at validateProgress (http://127.0.0.1:4191/js/act-exploration-state.js:1:1)'));
    console.error = quiet;
    return lines;
})()`);
assert.equal(runtimeLog.length, 1);
assert.ok(!/http|boom|at /.test(runtimeLog[0].text), 'no stack or file path reaches the player log: ' + runtimeLog[0].text);
assert.equal(runtimeLog[0].rateKey, 'runtime-error', 'repeated errors do not flood the log');

// 검토 6차: 방치 결과 창이 뜰 때 떠 있던 이야기 카드는 줄 맨 앞으로 물러난다(다시 불러온 뒤 두 판이 겹쳤다).
const yielded = copy(`(() => {
    tutorialQueue.length = 0;
    tutorialQueue.push({ key: 'unlock_map' });
    activeTutorial = { key: 'story_act2_end', title: '액트 2', body: '…' };
    yieldTutorialCardToResult();
    return { active: activeTutorial, queue: tutorialQueue.map(row => row.key) };
})()`);
assert.deepEqual(yielded, { active: null, queue: ['story_act2_end', 'unlock_map'] });

console.log('review 5 fixes smoke passed');
