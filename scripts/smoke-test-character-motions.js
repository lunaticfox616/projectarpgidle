const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const plain = value => JSON.parse(JSON.stringify(value));

const definitions = plain(run(`PLAYER_CLASS_ORDER.map(id => {
    let def = PLAYER_CLASS_DEFS[id];
    return { id, label: def.label, portrait: def.portrait, description: def.description,
        talentId: def.recommendedTalentHeroId, strips: def.strips,
        idleDirections: def.strips.idleDirections || {},
        attackKeys: def.strips.attacks || [def.strips.attack],
        attackDirections: def.strips.attackDirections || {},
        attackVariantWeights: def.attackVariantWeights || null,
        motionAnchors: def.motionAnchors || null };
})`));
assert.deepStrictEqual(definitions.map(def => def.label), ['비술사', '방랑자', '성직자', '궁수', '연금술사', '전사']);
assert.strictEqual(definitions.length, 6, 'the player-facing class selection must contain exactly six classes');
assert(definitions.every(def => def.description && /^hero(?:10|[1-9])$/.test(def.talentId)),
    'each class must provide a recommended starter combat profile');
assert.strictEqual(run('HERO_SELECTION_ORDER.length'), 10,
    'all ten talents must remain available for fifth-ascension bloom selection');

const initialSelection = plain(run(`(function () {
    game.heroSelectionInitialized = false;
    game.talentSelectionInitialized = true;
    game.selectedHeroId = 'hero1';
    applyHeroSelection('warrior', { silent: true, skipSave: true });
    return { classId: game.selectedClassId, talentId: game.selectedHeroId,
        expectedTalentId: PLAYER_CLASS_DEFS.warrior.recommendedTalentHeroId };
})()`));
assert.deepStrictEqual(initialSelection, { classId: 'warrior', talentId: 'hero2', expectedTalentId: 'hero2' },
    'the first class choice must align the legacy talent bridge even when an old default talent is present');

const selected = plain(run(`(function () {
    game.heroSelectionInitialized = true;
    game.talentSelectionInitialized = true;
    game.selectedHeroId = 'hero5';
    game.ascendClass = 'warrior';
    game.settings.heroAppearanceMode = 'loop';
    let changed = applyHeroSelection('occultist', { silent: true, skipSave: true });
    return { changed, classId: game.selectedClassId, appearance: getHeroAppearanceId(),
        talentId: game.selectedHeroId, ascendClass: game.ascendClass };
})()`));
assert.deepStrictEqual(selected, {
    changed: true, classId: 'occultist', appearance: 'occultist', talentId: 'hero5', ascendClass: 'warrior'
}, 'choosing a class must update its combat appearance without changing talent or ascendancy');

const migrated = runtime.mergeDefaults({
    heroSelectionInitialized: true, selectedHeroId: 'hero5', appearanceHeroId: 'hero4',
    discoveredHeroIds: ['hero1', 'hero4', 'hero5'], settings: { heroAppearanceMode: 'fixed' }
});
assert.strictEqual(migrated.selectedClassId, 'cleric', 'legacy hero saves must migrate to the closest new class');
assert.strictEqual(migrated.appearanceClassId, 'wanderer', 'legacy fixed appearances must migrate independently');
assert.deepStrictEqual(Array.from(migrated.discoveredClassIds), ['archer', 'wanderer', 'cleric']);
assert.strictEqual(Object.prototype.hasOwnProperty.call(migrated, 'appearanceHeroId'), false,
    'legacy cosmetic state must not remain as a second mutable source of truth');
const migratedTest = runtime.mergeDefaults({ selectedHeroId: 'hero2', settings: { testCharacterMotionId: 'motion_alchemist' } });
assert.strictEqual(migratedTest.selectedClassId, 'alchemist', 'the former motion-test choice must become the selected class');
assert.strictEqual(migratedTest.selectedHeroId, 'hero2', 'migration must preserve the old starter-profile bridge');
assert.strictEqual(Object.prototype.hasOwnProperty.call(migratedTest.settings, 'testCharacterMotionId'), false);
assert.strictEqual(runtime.mergeDefaults({ selectedClassId: 'warrior', settings: {} }).selectedHeroId, 'hero2',
    'a partial new-format save must rebuild its temporary talent bridge from the selected class');
assert.strictEqual(runtime.mergeDefaults({ selectedClassId: 'warrior', selectedHeroId: 'hero1',
    talentSelectionInitialized: false, settings: {} }).talentSelectionInitialized, false,
    'an explicit pending first-talent flag must not be promoted merely because a default hero id exists');
const realignedSave = runtime.mergeDefaults({ heroSelectionInitialized: true, selectedClassId: 'warrior',
    selectedHeroId: 'hero1', talentSelectionInitialized: true, classTalentAlignmentVersion: 0, settings: {} });
assert.strictEqual(realignedSave.selectedHeroId, 'hero2',
    'saves created before class/talent alignment must be repaired once so rewards match the selected class');
const intentionalTalentSave = runtime.mergeDefaults({ heroSelectionInitialized: true, selectedClassId: 'warrior',
    selectedHeroId: 'hero1', talentSelectionInitialized: true, classTalentAlignmentVersion: 1, settings: {} });
assert.strictEqual(intentionalTalentSave.selectedHeroId, 'hero1',
    'after migration, a preexisting starter-profile bridge must remain stable until the next class choice');

const manifest = JSON.parse(fs.readFileSync('assets/playable/classes/manifest.json', 'utf8'));
let totalBytes = 0;
definitions.forEach(def => {
    let portrait = fs.readFileSync(def.portrait);
    assert.strictEqual(portrait.readUInt32BE(16), 64, `${def.label} portrait width must be 64px`);
    assert.strictEqual(portrait.readUInt32BE(20), 64, `${def.label} portrait height must be 64px`);
    ['idle', 'walk', 'attack'].forEach(motion => {
        let path = `assets/playable/classes/${def.id}/${motion}.webp`;
        assert(fs.existsSync(path), `${def.label} ${motion} strip must exist`);
        totalBytes += fs.statSync(path).size;
    });
    manifest[def.id].attackVariants.slice(1).forEach(variant => {
        let path = `assets/playable/classes/${def.id}/${variant.asset}`;
        assert(fs.existsSync(path), `${def.label} alternate attack strip must exist`);
        totalBytes += fs.statSync(path).size;
    });
    assert.strictEqual(manifest[def.id].attackVariants.length, def.attackKeys.length);
    assert.deepStrictEqual(Object.keys(def.idleDirections), ['north', 'east', 'south']);
    Object.entries(manifest[def.id].idleDirections).forEach(([direction, idle]) => {
        let path = `assets/playable/classes/${def.id}/${idle.asset}`;
        assert(fs.existsSync(path), `${def.label} ${direction} idle pose must exist`);
        assert.strictEqual(idle.frames, 1, `${def.label} ${direction} idle pose must remain a single stable frame`);
        if (direction !== 'east') totalBytes += fs.statSync(path).size;
    });
    assert.deepStrictEqual(Object.keys(def.attackDirections), ['north', 'east', 'south']);
    Object.entries(manifest[def.id].attackDirections).forEach(([direction, variants]) => {
        assert(variants.length > 0, `${def.label} ${direction} attack must retain at least one source motion`);
        variants.forEach(variant => {
            let path = `assets/playable/classes/${def.id}/${variant.asset}`;
            assert(fs.existsSync(path), `${def.label} ${direction} attack strip must exist`);
            assert(variant.frames >= 4 && variant.frames <= 9,
                `${def.label} ${direction} attack must retain its readable source poses`);
            if (direction !== 'east') totalBytes += fs.statSync(path).size;
        });
    });
    assert.strictEqual(manifest[def.id].walk.frames, 9);
    assert.deepStrictEqual(Object.keys(def.strips.walkDirections), ['north', 'east', 'south', 'west']);
    Object.entries(manifest[def.id].walkDirections).forEach(([direction, walk]) => {
        let path = `assets/playable/classes/${def.id}/${walk.asset}`;
        assert(fs.existsSync(path), `${def.label} ${direction} walk strip must exist`);
        assert(walk.frames >= 8 && walk.frames <= 9, `${def.label} ${direction} walk must retain its source poses`);
        if (direction !== 'east') totalBytes += fs.statSync(path).size;
    });
});
assert.deepStrictEqual(definitions.map(def => def.attackKeys.length), [2, 2, 1, 2, 3, 3]);
assert.deepStrictEqual(definitions.find(def => def.id === 'alchemist').attackVariantWeights, [49, 49, 2],
    'Hurricane Kick must remain a rare two-percent attack');
assert.deepStrictEqual(definitions.find(def => def.id === 'warrior').motionAnchors,
    { idle: 78, walk: 80, attacks: [90, 90, 91] }, 'warrior animations must stay anchored to the feet');
assert(totalBytes < 320000, 'all six classes and their directional motion strips should stay below the WebP budget');
assert.strictEqual(runtime.getPlayableHeroAttackDurationScale('occultist'), 1.2);

const mobileHeroTuning = plain(run('getLocalBattleHeroVisualTuning(1.032)'));
assert(mobileHeroTuning.scaleBoost >= 0.55 && mobileHeroTuning.scaleBoost <= 0.57,
    'mobile combat actors must shrink with the grid instead of staying at desktop height');
const desktopHeroTuning = plain(run('getLocalBattleHeroVisualTuning(2.15)'));
assert.strictEqual(desktopHeroTuning.scaleBoost, 1.12,
    'desktop combat actors must retain their established maximum scale');

const controls = {
    'sel-hero-appearance-mode': { value: '' },
    'sel-active-hero': { innerHTML: '', value: '', disabled: false, title: '' },
    'loop-hero-select-overlay': { classList: { add() {}, remove() {} } },
    'loop-hero-select-grid': { innerHTML: '' },
    'loop-hero-select-kicker': { innerText: '' },
    'loop-hero-select-title': { innerText: '' },
    'loop-hero-select-body': { innerText: '' }
};
runtime.document.getElementById = id => controls[id] || null;
run(`game.discoveredClassIds = ['archer']; openLoopHeroSelection(id => { game.__pickedClass = id; });`);
assert.strictEqual((controls['loop-hero-select-grid'].innerHTML.match(/data-class-id=/g) || []).length, 6,
    'the loop chooser must render one card for each new class');
assert(!controls['loop-hero-select-grid'].innerHTML.includes('드루이드'),
    'the old ten-talent roster must not leak into the player-facing chooser');
run(`chooseLoopHero('warrior')`);
assert.strictEqual(run('game.__pickedClass'), 'warrior', 'the loop callback must receive the selected class id');
assert.strictEqual(run('game.selectedHeroId'), 'hero2',
    'each loop class choice must realign the starter talent before talent rewards and the first-kill gem are granted');
run(`game.selectedClassId = 'cleric'; game.settings.heroAppearanceMode = 'loop'; renderHeroSelectionControls();`);
assert.strictEqual(controls['sel-active-hero'].value, 'cleric');
assert(definitions.every(def => controls['sel-active-hero'].innerHTML.includes(def.label)),
    'settings must list all six playable classes');
const indexSource = fs.readFileSync('index.html', 'utf8');
assert(!indexSource.includes('sel-active-talent') && !indexSource.includes('active-talent-control'),
    'the passive screen must not expose the removed active-talent selector');

console.log('smoke-test-character-motions passed');
