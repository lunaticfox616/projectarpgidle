// 자동 환생 (js/loop-automation-ui.js, docs/atlas-endgame-20260930.md 5절) and the cosmos loop path (P1): with automation on, a met
// loop gate advances after its countdown through the same functions as the buttons, the next class can be kept without the overlay,
// the loop-10+ decision screen loops too, settings normalize strictly, and a cosmos planet re-cleared in a later loop meets that
// loop's alternative path again.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
runtime.showGameToast = () => {};
const run = source => vm.runInContext(source, runtime);
run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'cleric'});window.game=game;
    game.season=5;game.loopCount=4;game.level=60;game.maxZoneId=10;handleSeasonLoopConditionMet();`);
assert.equal(run('game.pendingLoopReady'), true, 'loop 5 reaches its gate');

const t0 = 1_000_000;
run(`loopAutomationUi.autoTick(${t0});loopAutomationUi.autoTick(${t0 + 60000});`);
assert.equal(run('game.season'), 5, 'automation off: the gate waits for the player');

run('game.settings.autoLoop=true;');
run(`loopAutomationUi.autoTick(${t0 + 60000});loopAutomationUi.autoTick(${t0 + 64000});`);
assert.equal(run('game.season'), 5, 'the countdown runs first');
run(`loopAutomationUi.autoTick(${t0 + 65001});`);
assert.equal(run('game.season'), 6, 'then the loop advances through the confirm path');
assert.equal(run('game.pendingLoopHeroSelection'), true, 'and the next class is asked for');

run(`game.settings.autoLoopClass='keep';loopAutomationUi.autoTick(${t0 + 66000});`);
assert.equal(run('game.pendingLoopHeroSelection'), false, 'keeping the class answers the selection');
assert.equal(run('game.selectedClassId'), 'cleric', 'with the same class');
assert.ok(run('game.moveTimer') > 0, 'and the new loop sets off');

run(`game.season=12;game.loopCount=11;handleSeasonLoopConditionMet();`);
assert.equal(run('game.pendingLoopDecision'), true, 'from loop 10 the gate asks loop-or-climb');
run(`loopAutomationUi.autoTick(${t0 + 70000});loopAutomationUi.autoTick(${t0 + 76000});`);
assert.equal(run('game.season'), 13, 'automation takes the loop');
run(`loopAutomationUi.autoTick(${t0 + 77000});`);
assert.equal(run('game.pendingLoopHeroSelection'), false);

const settings = JSON.parse(run(`JSON.stringify(mergeDefaults({settings:{autoLoop:'yes',autoLoopClass:'warrior',autoMove:0}}).settings)`));
assert.deepEqual([settings.autoLoop, settings.autoLoopClass, settings.autoMove], [false, 'ask', true], 'only explicit values switch automation');

// ---------------------------------------------------------------- cosmos loop path (P1)
run(`game.season=LOOP_GATE_ALT_START_SEASON;game.loopProgressCurrent={specialBosses:[],chaos20Cleared:false,bestAbyssDepth:0,cosmosPlanets:[]};`);
assert.equal(run('markLoopCosmosPlanetClear(LOOP_GATE_ALT_COSMOS_PLANET_ID)'), true, 'the alternative planet meets the cosmos path');
assert.equal(run('markLoopCosmosPlanetClear(LOOP_GATE_ALT_COSMOS_PLANET_ID)'), false, 'announced once per loop');
assert.equal(run('hasCurrentLoopCosmosRequirementClear(game.season)'), true);
run('game.season+=1;game.loopProgressCurrent.cosmosPlanets=[];');
assert.equal(run('hasCurrentLoopCosmosRequirementClear(game.season)'), false, 'a new loop starts without it');
assert.equal(run('markLoopCosmosPlanetClear(LOOP_GATE_ALT_COSMOS_PLANET_ID)'), true, 'and clearing the planet again meets it again');
const atlasSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
assert.ok(!atlasSource.includes("firstClear && node.kind === 'planet'"), 'the planet clear is recorded every loop, not only the first ever');
console.log('loop automation: countdown advance, kept class, loop-10 decision, strict settings; cosmos path re-met each loop: OK');
