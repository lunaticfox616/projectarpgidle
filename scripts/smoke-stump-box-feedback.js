// 그루터기 함 처치 소식(2026-10-06): 다 자라면 로그 한 줄만 남던 것을 알림과 소리로, 보관함이 가득 찬 채 떨어진 씨앗 · 수액은
// 말없이 버리지 않고 거름이 됐다고(자라는 것이 없으면 놓쳤다고) 남긴다. 실제 사건 경로(stump-box-changed)를 탄다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime({}, new EventTarget());
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({ journalEntries: ['prologue', 'act_10'] }); window.game = game; contentProgression.sync(game);
    window.toasts = []; showGameToast = message => toasts.push(message);
    window.sounds = []; playUiFeedbackSound = kind => sounds.push(kind);
    window.logs = []; addLog = message => logs.push(message);
    window.sap = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 });
    stumpBox.place(game, sap.id, 12);
    sap.xp = stumpBox.need(sap) - 30;
    Math.random = () => 0.999;`);
run('stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.equal(run('stumpBox.isMature(sap)'), true, 'a boss kill finishes the sap');
// 16번(2026-10-08): 알림 끝에 다 자랄 때의 굴림(0.999면 추가 줄 셋, 만개)을 붙인다.
assert.deepEqual(json('toasts'), ['그루터기 함: 냉기 호박석 다 자람, 냉기 저항 +5% (만개, 추가 줄 3개)'], 'ripening from a kill shows a toast with what it gives and its roll');
assert.deepEqual(json('sounds'), ['success'], 'and chimes');
assert.match(json('logs').at(-1), /냉기 호박석 다 자람/, 'the log line stays');

run(`window.seed = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, seed.id, 6, 'flower');
    while (stumpBox.createItem(game, { family: 'sap', color: 'chaos' })) {}
    Math.random = () => 0; logs.length = 0;`);
run('stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.equal(run('seed.xp'), 30 + 80, 'the boss kill and the composted drop (80% quality) both grow the seed');
assert.match(json('logs').join('\n'), /보관함이 가득 차 .+이 거름이 됐습니다\(자라는 1개 \+80\)/, 'the full storage says the drop became compost');
// 씨앗을 판에서 내리려면 보관함에 한 칸이 있어야 한다: 하나 버리고 내린 뒤 다시 채운다.
run(`stumpBox.discard(game, game.stumpBox.items.find(item => item.color === 'chaos' && !game.stumpBox.board.includes(item.id)).id);
    stumpBox.unplace(game, seed.id); logs.length = 0;
    while (stumpBox.createItem(game, { family: 'sap', color: 'chaos' })) {}`);
assert.equal(run('stumpBox.growingItems(game).length'), 0, 'nothing grows now (the sap is ripe, the seed is stored)');
run('stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.match(json('logs').join('\n'), /가득 차고 판에서 자라는 것도 없어 .+을 놓쳤습니다/, 'a lost drop is said, not silent');
console.log('stump box feedback: ripening toast and chime, full-storage compost and lost-drop notices OK');
