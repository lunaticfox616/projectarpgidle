const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const nodes = new Map();
let interacting = false;
function node(id) {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set(), value = { dataset: {}, style: {}, innerHTML: '',
        classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key),
            toggle(key, on) { if (on) classes.add(key); else classes.delete(key); } },
        setAttribute() {}, addEventListener() {}, matches: () => interacting,
        querySelector: () => null, querySelectorAll: () => [], prepend() {} };
    nodes.set(id, value); return value;
}
const runtime = buildGameRuntime({}, null, { getElementById: node,
    querySelector: selector => selector === '#tutorial-overlay .tutorial-card' ? node('card') : null });
const run = code => vm.runInContext(code, runtime);
run(`game.settings.pauseGameOnOverlay=true; activeTutorial={key:'unlock_map',title:'지도 개방',body:'다음 액트가 열렸습니다.',tabId:'tab-map'};
    document.getElementById('tutorial-overlay').classList.add('active'); renderTutorialStep();`);
assert.equal(run('isTutorialOpen()'), true);
assert.equal(run('isTutorialPausingCombat()'), false, 'an ordinary unlock no longer interrupts battle');
assert.match(node('tutorial-body').innerHTML, /<details/);
run('tutorialActionUi.noticeUntil=8000; tutorialActionUi.expireNotice(7999);');
assert.equal(run('activeTutorial.key'), 'unlock_map', 'notice remains available for eight seconds');
interacting = true;
run('tutorialActionUi.expireNotice(9000);');
assert.equal(run('activeTutorial.key'), 'unlock_map', 'reading with pointer or keyboard prevents expiry');
interacting = false;
run('tutorialActionUi.expireNotice(9001);');
assert.equal(run('activeTutorial'), null, 'unattended information clears automatically');
for (const key of ['story_act1_end', 'tutorial_battle_basics', 'tutorial_starter_gem_equip', 'unlock_items']) {
    run(`activeTutorial={key:'${key}'}; document.getElementById('tutorial-overlay').classList.add('active');`);
    assert.equal(run('isTutorialPausingCombat()'), true, key + ': story and first actions retain pause');
    run('tutorialActionUi.expireNotice(99999);');
    assert.equal(run('activeTutorial.key'), key, 'action/story cards never auto-dismiss');
}
run('game.settings.pauseGameOnOverlay=false;');
assert.equal(run('isTutorialPausingCombat()'), false, 'explicit pause preference remains authoritative');
console.log('Notice flow: compact unlocks, no battle pause, timed dismissal with reading guard, story/action pause retained OK');
