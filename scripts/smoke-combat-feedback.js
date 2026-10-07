const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const events = new EventTarget();
const runtime = buildGameRuntime({}, events);
let now = 1000, rectangles = [], words = [], tones = [], media = false;
runtime.performance.now = () => now;
const run = code => vm.runInContext(code, runtime);
const ctx = { save(){}, restore(){}, translate(){}, fillRect(...args){rectangles.push(args);}, fillText(text){words.push(text);} };
runtime.feedbackCtx = ctx;
run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',currentZoneId:0,
    combatTimeMs:10000,settings:{pauseGameOnOverlay:false}});game.playerHp=getPlayerStats().maxHp;
    window.feedback=worldTreeSkillFx.feedback;window.area={width:390,height:720,now:1100};
    window.positions={player:{x:20,y:60},enemies:{7:{x:60,y:60}}};feedback.begin(1000);`);
// A fresh hit after a rendering stall must start on the first resumed frame, not wait for the old visual clock to catch up.
now=2000;
run(`battleVisualState.visualNow=1000;battleVisualState.lastWallNow=1000;battleVisualState.hitStopRemainingMs=100;
    addBattleFx('hit',{enemyId:7,damage:10});window.resumeFrame=feedback.advanceClock(2000);`);
assert.ok(run('resumeFrame.now>=battleFx[battleFx.length-1].start'));
assert.equal(run('battleVisualState.hitStopRemainingMs'),0,'no stale hit-stop on resume');
assert.equal(run('game.combatTimeMs'),10000,'presentation resync never simulates combat');
run('battleVisualState.hitStopRemainingMs=28;');
assert.equal(run('feedback.advanceClock(2016).deltaMs'),0,'a live hit still holds exactly the presentation clock');
assert.equal(run('feedback.advanceClock(2032).deltaMs'),4);
run('clearBattleVisualBacklog();feedback.begin(1000);');now=1000;
// Canvas calls are the external drawing boundary. Native skill hits must still leave a contact mark.
run(`window.hit={type:'hit',id:1,enemyId:7,damage:10,duration:300,skillName:Object.keys(SKILL_FX_ATLAS)[0]};
    drawLegacyHitFeedback(feedbackCtx,hit,.2,positions.player,positions.enemies);`);
assert.ok(rectangles.length > 0, 'native atlas art retains physical hit feedback');
rectangles=[];
run(`feedback.begin(1000);for(let i=0;i<200;i++)feedback.contact(feedbackCtx,{...hit,crit:true},60,positions);`);
assert.equal(rectangles.length,32,'dense attacks draw at most eight four-chip contacts per frame');
rectangles=[];
run(`feedback.begin(1000);feedback.contact(feedbackCtx,{...hit,dot:true},60,positions);feedback.contact(feedbackCtx,{...hit,damage:0},60,positions);`);
assert.equal(rectangles.length,0,'damage over time and blocked hits never produce contact marks');
run(`for(let i=0;i<200;i++)feedback.death(feedbackCtx,{enemyId:i,boss:true},.3,{x:50,y:50});`);
assert.equal(rectangles.length,100,'death chips are bounded independently of enemy count');
// One banner (boss kills only), priority and expiry. Several ordinary kills at once show no banner (2026-10-06).
run(`for(let i=0;i<5;i++)feedback.observe({type:'enemyDeath',enemyId:i,start:1000},1000);feedback.screen(feedbackCtx,area);`);
assert.deepEqual(words,[],'a pack of ordinary kills shows no kill-count banner');
words=[];
run(`feedback.observe({type:'enemyDeath',boss:true,name:'🔥 뿌리의 수호자',start:1000},1000);
    feedback.observe({type:'enemyDeath',enemyId:99,start:1000},1000);feedback.screen(feedbackCtx,area);`);
assert.deepEqual(words,['보스 처치','뿌리의 수호자']);
words=[];
run(`feedback.begin(3000);feedback.screen(feedbackCtx,{...area,now:3000});`);
assert.equal(words.length,0,'boss confirmation ends without retaining a UI queue');
run(`feedback.observe({type:'enemyDeath',boss:true,start:1000},3000);feedback.screen(feedbackCtx,{...area,now:3100});`);
assert.equal(words.length,0,'old backlog never creates a victory banner');
run(`feedback.observe({type:'enemyDeath',boss:true,start:3000},3000);setBattleFxSuppressed(true);setBattleFxSuppressed(false);
    feedback.begin(3100);feedback.screen(feedbackCtx,{...area,now:3200});`);
assert.equal(words.length,0,'visibility/map reset discards the transient banner');
run(`feedback.observe({type:'enemyDeath',boss:true,start:3200},3200);resetBattleRuntimeVisuals();
    feedback.begin(3300);feedback.screen(feedbackCtx,{...area,now:3400});`);
assert.equal(words.length,0,'full combat reset also discards presentation state without a persisted epoch');
// Real object command -> payment -> presentation; no presentation-only reward path.
let seed=120;
runtime.Math=Object.create(Math);
runtime.Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
// The hero stands beside the object: one boxed in by other objects (no free side) is passed over.
function prepare(kind) {
    run(`window.freeSide=row=>actExplorationMap.neighbors(m,row).find(cell=>!actExplorationState.objects.solidCells(r).has(cell.gx+','+cell.gy));`);
    const pick=`r.objects.entries.find(row=>row.kind==='${kind}'&&freeSide(row))`;
    run(`game.moveTimer=0;game.combatHalted=false;startEncounterRun(true);window.r=game.actExploration;window.m=actExplorationMap.forRun(r);r.mode='manual';`);
    for(let i=0;i<80&&!run(pick);i++)run('startEncounterRun(true);r=game.actExploration;m=actExplorationMap.forRun(r);r.mode="manual";');
    run(`{window.row=${pick};const side=freeSide(row);
        Object.assign(game.gridPlayer,side);actExplorationState.discover(r,side);clearBattleVisualBacklog();}`);
}
for(const kind of ['chest','pot','crate']) {
    prepare(kind);
    assert.equal(run('actExplorationProgress.objects.request(row.id)'),true);
    assert.equal(run("battleFx.filter(f=>f.type==='objectReward').length"),1);
    assert.equal(run("battleFx.find(f=>f.type==='objectReward').objectKind"),kind);
    const save=run('JSON.stringify(serializeSaveState(game))');
    assert.equal(run('actExplorationProgress.objects.request(row.id)'),false);
    run(`feedback.begin(4000);feedback.observe(battleFx.find(f=>f.type==='objectReward'),4000);feedback.screen(feedbackCtx,{...area,now:4100});`);
    assert.equal(run('JSON.stringify(serializeSaveState(game))'),save,'visuals and repeated clicks never alter saved rewards');
}
prepare('pot');
run('actExplorationProgress.objects.area([row]);');
assert.equal(run('row.phase'),'spent');
assert.equal(run("battleFx.filter(f=>f.type==='objectReward').length"),1,'actual area collateral produces one break effect');
prepare('pot');
run('game.isBackgroundCalculation=true;actExplorationProgress.objects.area([row]);');
assert.equal(run("battleFx.filter(f=>f.type==='objectReward').length"),0,'offline has no object presentation');
run('game.isBackgroundCalculation=false;');
run('clearBattleVisualBacklog();game.exp=getExpReq(game.level)-1;grantExpAndGem(createEnemy(getZone(0),{},0),getPlayerStats());');
assert.ok(run("battleFx.some(f=>f.type==='levelUp'&&f.duration>=800&&f.duration<=1200)"),'earned levels have a readable, bounded one-second confirmation');
// Re-load only the presentation module against a reduced-motion media boundary.
runtime.matchMedia=()=>({get matches(){return media;}});
run(require('node:fs').readFileSync('js/canvas-combat-feedback.js','utf8'));
media=true;rectangles=[];
run(`feedback=worldTreeSkillFx.feedback;feedback.begin(5000);feedback.death(feedbackCtx,{enemyId:7},.3,{x:50,y:50});`);
assert.equal(rectangles.length,0,'reduced motion has no flying fragments');
assert.equal(run('JSON.stringify(getBattleCameraShake(5000))'),' {"x":0,"y":0}'.trim());
// Web Audio behavior and real WAV assets are covered by smoke-game-audio.js.
console.log('combat feedback: native contacts, bounded chips, notices, real rewards, replay silence and reduced motion OK');
