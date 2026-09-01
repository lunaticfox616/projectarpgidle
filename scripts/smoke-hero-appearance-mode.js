// 직업 외형이 현재 직업을 따라가거나 고정되는 실제 상태 전이를 검사한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);

const behavior = JSON.parse(run(`JSON.stringify((function () {
    game.heroSelectionInitialized = true;
    game.discoveredClassIds = [];
    game.settings.heroAppearanceMode = 'loop';
    game.selectedClassId = 'warrior';
    game.appearanceClassId = 'cleric';
    let loopBefore = getHeroAppearanceId();
    applyHeroSelection('alchemist', { silent: true, skipSave: true });
    let loopAfter = getHeroAppearanceId();

    game.settings.heroAppearanceMode = 'fixed';
    game.appearanceClassId = 'wanderer';
    applyHeroSelection('archer', { silent: true, skipSave: true });
    let fixedAfter = getHeroAppearanceId();

    game.settings.heroAppearanceMode = 'loop';
    game.selectedClassId = 'occultist';
    applyHeroAppearanceMode('fixed', { silent: true, skipSave: true });
    let lockedAt = game.appearanceClassId;
    applyHeroSelection('cleric', { silent: true, skipSave: true });
    let fixedAfterNextClass = getHeroAppearanceId();

    game.heroSelectionInitialized = false;
    game.settings.heroAppearanceMode = 'fixed';
    game.appearanceClassId = 'archer';
    applyHeroSelection('warrior', { silent: true, skipSave: true });
    return { loopBefore, loopAfter, fixedAfter, lockedAt, fixedAfterNextClass,
        firstFixedSelection: getHeroAppearanceId() };
})())`));

assert.deepStrictEqual(behavior, {
    loopBefore: 'warrior', loopAfter: 'alchemist', fixedAfter: 'wanderer',
    lockedAt: 'occultist', fixedAfterNextClass: 'occultist', firstFixedSelection: 'warrior'
}, '직업 연동·고정 외형 동작이 일관되어야 한다');

const merge = save => runtime.mergeDefaults(JSON.parse(JSON.stringify(save)));
assert.strictEqual(merge({ settings: {}, selectedHeroId: 'hero3' }).settings.heroAppearanceMode, 'loop');
assert.strictEqual(merge({ settings: {}, selectedHeroId: 'hero3', appearanceHeroId: 'hero5' }).settings.heroAppearanceMode, 'fixed');
assert.strictEqual(merge({ settings: { heroAppearanceMode: 'loop' }, selectedHeroId: 'hero3', appearanceHeroId: 'hero5' }).settings.heroAppearanceMode, 'loop');

const controls = {
    'sel-hero-appearance-mode': { value: '' },
    'sel-active-hero': { innerHTML: '', value: '', disabled: false, title: '' }
};
runtime.document.getElementById = id => controls[id] || null;
run(`game.classFreeSwitchUnlocked = true; game.settings.heroAppearanceMode = 'loop'; renderHeroSelectionControls();`);
assert.strictEqual(controls['sel-active-hero'].disabled, true);
run(`game.settings.heroAppearanceMode = 'fixed'; renderHeroSelectionControls();`);
assert.strictEqual(controls['sel-active-hero'].disabled, false);

console.log('smoke-hero-appearance-mode passed');
