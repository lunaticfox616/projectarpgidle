// 캐릭터 외형이 설정에 따라 재능을 따라가거나 고정되는 실제 상태 전이를 검사한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);

const behavior = JSON.parse(run(`JSON.stringify((function () {
    game.heroSelectionInitialized = true;
    game.discoveredHeroIds = [];
    game.settings.heroAppearanceMode = 'loop';
    game.selectedHeroId = 'hero2';
    game.appearanceHeroId = 'hero5';
    let loopBefore = getHeroAppearanceId();
    applyHeroSelection('hero3', { silent: true, skipSave: true });
    let loopAfter = getHeroAppearanceId();

    game.settings.heroAppearanceMode = 'fixed';
    game.appearanceHeroId = 'hero4';
    applyHeroSelection('hero6', { silent: true, skipSave: true });
    let fixedAfter = getHeroAppearanceId();

    game.settings.heroAppearanceMode = 'loop';
    game.selectedHeroId = 'hero7';
    applyHeroAppearanceMode('fixed', { silent: true, skipSave: true });
    let lockedAt = game.appearanceHeroId;
    applyHeroSelection('hero8', { silent: true, skipSave: true });
    let fixedAfterNextTalent = getHeroAppearanceId();

    game.heroSelectionInitialized = false;
    game.settings.heroAppearanceMode = 'fixed';
    game.appearanceHeroId = 'hero1';
    applyHeroSelection('hero9', { silent: true, skipSave: true });
    return { loopBefore, loopAfter, fixedAfter, lockedAt, fixedAfterNextTalent, firstFixedSelection: getHeroAppearanceId() };
})())`));

assert.deepStrictEqual(behavior, {
    loopBefore: 'hero2',
    loopAfter: 'hero3',
    fixedAfter: 'hero4',
    lockedAt: 'hero7',
    fixedAfterNextTalent: 'hero7',
    firstFixedSelection: 'hero9'
}, '외형 방식에 따른 재능 연동·고정 동작이 일관되어야 한다');

const merge = save => runtime.mergeDefaults(JSON.parse(JSON.stringify(save)));
assert.strictEqual(merge({ settings: {}, selectedHeroId: 'hero3', appearanceHeroId: null }).settings.heroAppearanceMode, 'loop',
    '외형을 직접 고르지 않은 옛 저장은 기존처럼 재능 외형을 따라야 한다');
assert.strictEqual(merge({ settings: {}, selectedHeroId: 'hero3', appearanceHeroId: 'hero5' }).settings.heroAppearanceMode, 'fixed',
    '외형을 직접 골랐던 옛 저장은 고정 모드로 이관되어야 한다');
assert.strictEqual(merge({ settings: { heroAppearanceMode: 'loop' }, selectedHeroId: 'hero3', appearanceHeroId: 'hero5' }).settings.heroAppearanceMode, 'loop',
    '사용자가 명시한 루프 연동 설정을 옛 고정 외형 값이 덮으면 안 된다');

const controls = {
    'sel-hero-appearance-mode': { value: '' },
    'sel-active-hero': { innerHTML: '', value: '', disabled: false, title: '' }
};
runtime.document.getElementById = id => controls[id] || null;
run(`game.heroFreeSwitchUnlocked = true; game.settings.heroAppearanceMode = 'loop'; renderHeroSelectionControls();`);
assert.strictEqual(controls['sel-hero-appearance-mode'].value, 'loop', '설정 화면에 현재 외형 방식이 표시되어야 한다');
assert.strictEqual(controls['sel-active-hero'].disabled, true, '루프 연동 중에는 고정 외형 선택을 막아야 한다');
run(`game.settings.heroAppearanceMode = 'fixed'; renderHeroSelectionControls();`);
assert.strictEqual(controls['sel-active-hero'].disabled, false, '고정 모드에서는 해금된 외형을 선택할 수 있어야 한다');

console.log('smoke-hero-appearance-mode passed');
