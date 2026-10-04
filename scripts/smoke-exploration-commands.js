// 탐험 이동 명령과 자동 이동 (2026-09-30): a move command (minimap, map or battlefield click) never changes the mode —
// with auto-move on the hero walks there and goes back to exploring; auto-move off (직접 이동) moves only on commands;
// a command that cannot get closer is dropped; the battlefield point → cell inverse; the keys and the HUD key caps.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { runtime, run } = fixture(29);
// The run's facing is random (js/combat.js rollExplorationFacing); this check walks the drawn map's fixed coordinates.
run('rollExplorationFacing = () => undefined;');
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
let tick = 0;
function advance(count = 1) {
    for (let n = 0; n < count; n++) run(`coreLoop(${1800000000000 + (++tick) * 100})`);
}
function start(settings = {}) {
    runtime.extraSettings = settings; tick = 0;
    run(`
        game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
            level:100,combatTimeMs:1800000000000,settings:{pauseGameOnOverlay:false,mapCompleteAction:'stop',...extraSettings}});
        game.currentZoneId=0;game.maxZoneId=0;
        game.equipment['무기']={id:90001,slot:'무기',name:'진행 검사',rarity:'rare',
            baseStats:[{id:'flatDmg',val:1000000},{id:'flatHp',val:1000000}],stats:[]};
        startEncounterRun();game.playerHp=getPlayerStats().maxHp;
    `);
}
/** A walkable neighbour of the hero that the automatic route does not want (so arriving there proves the command). */
function sideCell() {
    return copy(`(() => {
        const map=actExplorationMap.layout(1),auto=actExplorationState.destination(game.actExploration,game.gridPlayer);
        const away=cell=>auto?Math.hypot(cell.gx-auto.gx,cell.gy-auto.gy):0; // 직접 이동 has no automatic target
        return actExplorationMap.neighbors(map,game.gridPlayer).sort((a,b)=>away(b)-away(a))[0];
    })()`);
}
const at = () => copy('[game.gridPlayer.gx,game.gridPlayer.gy]');

// ---------------------------------------------------------------- auto-move on: the command, then exploring again
start();
assert.equal(run('game.settings.autoMove'), true, 'auto-move is on by default');
assert.equal(run('game.actExploration.mode'), 'direct', 'a new run starts on the chosen route');
let cell = sideCell();
runtime.cell = cell;
assert.equal(run('actExplorationState.selectDestination(game.actExploration,cell)'), true);
assert.equal(run('game.actExploration.mode'), 'direct', 'a move command keeps auto-move on (the old click switched to 직접 이동)');
assert.equal(run('actExplorationProgress.holdPosition(false)'), true, 'while it walks the command the hero neither chases nor sidesteps');
for (let n = 0; n < 40 && run('game.actExploration.destination'); n++) advance();
assert.deepEqual(at(), [cell.gx, cell.gy], 'the hero walks to the commanded cell');
assert.equal(run('actExplorationProgress.holdPosition(false)'), false, 'once there, auto-move takes over again');
advance(30);
assert.notDeepEqual(at(), [cell.gx, cell.gy], 'and it goes on exploring');

// ---------------------------------------------------------------- a command walks through a fight; the automatic walk waits
start();
run('globalThis.stats=getPlayerStats(false);game.enemies=[{id:777,hp:10,maxHp:10,gx:99,gy:99}];');
let before = at();
run('actExplorationProgress.tick(game.actExploration.motionTimeMs+600,stats);');
assert.deepEqual(at(), before, 'with an enemy alive the automatic walk waits for the fight');
cell = sideCell(); runtime.cell = cell;
run('actExplorationState.selectDestination(game.actExploration,cell);for(let n=0;n<15;n++)actExplorationProgress.tick(game.actExploration.motionTimeMs+100,stats);');
assert.deepEqual(at(), [cell.gx, cell.gy], 'a command is walked even while enemies are alive');

// ---------------------------------------------------------------- a command that cannot get closer is dropped
start();
cell = sideCell(); runtime.cell = cell;
run('globalThis.stats=getPlayerStats(false);game.enemies=[{id:778,hp:10,maxHp:10,gx:cell.gx,gy:cell.gy}];');
run('actExplorationState.selectDestination(game.actExploration,cell);actExplorationProgress.tick(game.actExploration.motionTimeMs+200,stats);');
assert.ok(run('game.actExploration.destination'), 'blocked for a moment: the command still waits');
run('actExplorationProgress.tick(game.actExploration.motionTimeMs+200,stats);');
assert.equal(run('game.actExploration.destination'), null, 'blocked for good: the hero stays as close as it got and auto-move takes over');

// ---------------------------------------------------------------- auto-move off (직접 이동): only commands move the hero
start({ autoMove: false });
assert.equal(run('game.actExploration.mode'), 'manual', 'with auto-move off a new run starts in 직접 이동');
before = at();
advance(20);
assert.deepEqual(at(), before, 'without a command the hero stays');
assert.equal(run('actExplorationProgress.holdPosition(false)'), true, 'and neither chases nor sidesteps (the mobility gap-closer is off too)');
cell = sideCell(); runtime.cell = cell;
run('actExplorationState.selectDestination(game.actExploration,cell);');
for (let n = 0; n < 40 && run('game.actExploration.destination'); n++) advance();
assert.deepEqual(at(), [cell.gx, cell.gy], 'a command moves it');
advance(20);
assert.deepEqual(at(), [cell.gx, cell.gy], 'and it stays there');

// ---------------------------------------------------------------- the toggle, the map dialog modes and saves share one state
run('showGameToast=()=>null;');
start();
assert.equal(run('actExplorationUi.toggleAuto()'), false, 'the toggle turns auto-move off');
assert.deepEqual(copy('[game.settings.autoMove,game.actExploration.mode]'), [false, 'manual']);
run("game.settings.actExplorationMode='full';");
assert.equal(run('actExplorationUi.toggleAuto()'), true, 'and on again');
assert.deepEqual(copy('[game.settings.autoMove,game.actExploration.mode]'), [true, 'full'], 'back on the chosen route');
run("actExplorationUi.mode('manual');");
assert.equal(run('game.settings.autoMove'), false, 'the dialog\'s 직접 이동 is auto-move off');
run("actExplorationUi.mode('direct');");
assert.deepEqual(copy('[game.settings.autoMove,game.settings.actExplorationMode]'), [true, 'direct'], 'and 보스 직행 turns it back on');
assert.equal(run("mergeDefaults({settings:{}}).settings.autoMove"), true, 'old saves start with auto-move on');
assert.equal(run("mergeDefaults({settings:{autoMove:false}}).settings.autoMove"), false, 'off survives a reload');
assert.equal(run("mergeDefaults({settings:{autoMove:'no'}}).settings.autoMove"), true, 'odd values mean on');

// ---------------------------------------------------------------- battlefield point → cell
const picks = copy(`(() => {
    const p=actExplorationView.projection(960,640),g=game.gridPlayer,s=p.cellToScreen(g.gx+2,g.gy-1),half=p.tileW/2;
    return {centre:actExplorationView.cellAt(s),corner:actExplorationView.cellAt({x:s.x-half+.5,y:s.y-half+.5}),
        left:actExplorationView.cellAt({x:s.x-half-.5,y:s.y}),none:actExplorationView.cellAt(null),want:{gx:g.gx+2,gy:g.gy-1}};
})()`);
assert.deepEqual(picks.centre, picks.want, 'a click on a cell\'s centre picks that cell');
assert.deepEqual(picks.corner, picks.want, 'and so does its corner');
assert.deepEqual(picks.left, { gx: picks.want.gx - 1, gy: picks.want.gy }, 'just past its edge is the next cell');
assert.equal(picks.none, null);
runtime.far = { gx: -5, gy: -5 };
assert.equal(run('actExplorationUi.commandMove(far)'), false, 'a click outside the map is refused (with a toast)');

// ---------------------------------------------------------------- keys and the HUD
assert.equal(run("hotkeyBindings.actionForCode({},'KeyE').id"), 'combat:mobility', 'E casts the mobility gem');
assert.equal(run("hotkeyBindings.actionForCode({},'KeyA').id"), 'combat:autoMove', 'A toggles auto-move');
const slot = run("renderCombatSkillSlot({kind:'mobility',name:'향로구름',hotkey:getHotkeyLabel('combat:mobility')})");
assert.match(slot, /data-gem-name="향로구름" data-slot-kind="mobility" aria-keyshortcuts="E"/, 'the mobility slot names its key');
assert.match(slot, /<i class="combat-hud-key" aria-hidden="true">E<\/i><\/button>$/, 'and shows it like the auto-move key');
assert.doesNotMatch(run("renderCombatSkillSlot({kind:'primary',name:'연속 베기'})"), /combat-hud-key/, 'other slots have no key');
console.log('exploration commands: auto-move stays on, 직접 이동, give-up, click → cell, keys ok');
