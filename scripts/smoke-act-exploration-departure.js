const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');

// Small DOM boundary: click capture, inline handlers and native-dialog responses.
// Confirmation, travel, combat and loot implementations are the production modules.
const nodes=new Map(),listeners=new Map();
let context;
function element(id='',attributes={}) {
    const handlers=new Map(),classes=new Set();
    const node={id,style:{},dataset:{},children:[],disabled:false,isConnected:true,open:false,
        textContent:'',_html:'',
        classList:{add:key=>classes.add(key),remove:key=>classes.delete(key),contains:key=>classes.has(key)},
        hasAttribute:key=>Object.hasOwn(attributes,key),getAttribute:key=>attributes[key]??null,
        setAttribute:(key,value)=>{attributes[key]=value;},removeAttribute:key=>{delete attributes[key];},
        addEventListener:(name,fn)=>handlers.set(name,fn),
        querySelector:selector=>nodes.get(selector.slice(1))||null,querySelectorAll:()=>[],
        closest:selector=>selector.split(',').some(part=>part.trim()==='#'+id ||
            (/^\[[\w-]+\]$/.test(part.trim()) && Object.hasOwn(attributes,part.trim().slice(1,-1))))?node:null,
        contains:other=>other===node,focus:()=>{},blur:()=>{},
        showModal(){this.open=true;},close(){this.open=false;},
        appendChild(child){this.children.push(child);if(child.id)nodes.set(child.id,child);},
        click(){
            let stopped=false;
            const event={target:node,currentTarget:node,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){stopped=true;}};
            for(const fn of listeners.get('click')||[]){fn(event);if(stopped)return;}
            handlers.get('click')?.(event);
            if(attributes.onclick){context.testClickEvent=event;vm.runInContext('(function(event){'+attributes.onclick+'})(testClickEvent)',context);}
        }
    };
    Object.defineProperty(node,'innerHTML',{get:()=>node._html,set:html=>{
        node._html=html;
        for(const match of html.matchAll(/\bid="([^"]+)"/g))nodes.set(match[1],element(match[1]));
    }});
    return node;
}
context=buildGameRuntime({},null,{
    body:element(),createElement:()=>element(),getElementById:id=>nodes.get(id)||null,
    addEventListener:(name,fn)=>listeners.set(name,[...(listeners.get(name)||[]),fn])
});
const run=code=>vm.runInContext(code,context),copy=code=>JSON.parse(run('JSON.stringify('+code+')'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fresh() {
    run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
        currentZoneId:0,maxZoneId:9,season:3,settings:{pauseGameOnOverlay:false}});
        gameplayStarted=true;startupOverlayActive=false;startEncounterRun(true);
        game.currencies.hiveKey=3;
        actExplorationLoot.capture(game,game.actExploration,()=>actExplorationLoot.currency(game,'goldenRule',2));`);
}
function returnButton() {
    const tag=fs.readFileSync('index.html','utf8').match(/<button\b[^>]*id="btn-combat-return"[^>]*>/)[0];
    const attributes={onclick:tag.match(/onclick="([^"]+)"/)[1]};
    if(tag.includes('data-exploration-departure'))attributes['data-exploration-departure']='';
    return element('btn-combat-return',attributes);
}
const snapshot=()=>copy('({zone:game.currentZoneId,loot:game.actExploration?.loot,player:game.gridPlayer,currencies:game.currencies})');
async function main() {
    fresh();const before=snapshot(),button=returnButton();
    button.click();assert.equal(run('actExplorationUi.departurePending()'),true);
    assert.equal(run('isForegroundGameplayPausedForBackground()'),true,'loss confirmation pauses even with optional overlay pause off');
    assert.match(nodes.get('game-dialog-message').innerHTML,/황금률 ×2/);
    button.click();assert.deepEqual(snapshot(),before,'double-click cannot travel or mutate rewards');
    nodes.get('game-dialog-cancel').click();await settle();
    assert.deepEqual(snapshot(),before,'cancel preserves pending loot and position');
    assert.equal(run('actExplorationUi.departurePending()'),false);
    assert.equal(run('isForegroundGameplayPausedForBackground()'),false);
    button.click();nodes.get('game-dialog-confirm').click();await settle();
    assert.equal(run('game.actExploration'),null);
    assert.deepEqual(copy('game.currencies'),before.currencies,'abandon never pays pending loot');
    assert.equal(run('game.isTownReturning'),true,'normal town return still executes');

    fresh();const state=run('game.actExploration');button.click();
    run('startEncounterRun(true)');const replacement=run('game.actExploration');
    nodes.get('game-dialog-confirm').click();await settle();
    assert.notEqual(replacement,state);assert.equal(run('game.actExploration'),replacement,'stale confirmation cannot abandon a newer run');
    button.click();button.isConnected=false;nodes.get('game-dialog-confirm').click();await settle();
    assert.equal(run('game.actExploration'),replacement,'removed control cannot replay stale travel');

    fresh();const hive=element('',{'data-exploration-departure':'',onclick:'startBeehiveRun()'});
    hive.click();nodes.get('game-dialog-cancel').click();await settle();
    assert.equal(run('game.currencies.hiveKey'),3);assert.equal(run('game.currentZoneId'),0);
    hive.click();nodes.get('game-dialog-confirm').click();await settle();
    assert.equal(run('game.currencies.hiveKey'),2,'confirmed admission spends exactly one key');
    assert.equal(run('game.currentZoneId'),'beehive_run');
    assert.equal(run('game.actExploration'),null,'special entry clears abandoned exploration immediately, even while its choice screen pauses combat');
    assert.equal(run('game.currencies.goldenRule'),0);
    run("exitBeehiveRun('test','season-up')");
    assert.equal(run('game.actExploration'),null,'returning from the hive cannot revive abandoned loot');
    fresh();run('game.settings.autoEnterGrandBreach=true;game.voidRift.grandBreachUnlock=true;autoEnterGrandBreachIfReady()');
    assert.equal(run('game.currentZoneId'),0,'automatic special entry cannot silently abandon an active exploration');
    assert.equal(run('game.actExploration.loot.currencies.goldenRule'),2);
    run('enterGrandBreach()');assert.equal(run('game.actExploration'),null);
    fresh();run('game.currencies.colonyTrace=1;startColonyRun()');assert.equal(run('game.actExploration'),null);
    fresh();run("game.chaosRealm.unlocked=true;game.journalEntries.push('woodsman_echo');enterWoodsmanEchoChallenge()");
    assert.equal(run('game.actExploration'),null);
    fresh();run('game.season=10;game.loopProgressCurrent.chaos20Cleared=true;enterOutsideChaos()');
    assert.equal(run('game.actExploration'),null);

    fresh();const direct=element('',{'data-exploration-departure':'',onclick:'changeZone(1)'});
    direct.click();nodes.get('game-dialog-confirm').click();await settle();
    assert.equal(run('game.currentZoneId'),1);assert.equal(run('game.actExploration'),null);
    fresh();run('actExplorationProgress.defeat(game)');direct.click();
    assert.equal(run('game.currentZoneId'),1,'already-lost loot needs no extra confirmation');
    assert.equal(run('actExplorationUi.departurePending()'),false);
    fresh();run("game.actExploration.status='cleared';finishEncounterRun()");direct.click();
    assert.equal(run('game.currentZoneId'),1,'completed and claimed runs do not warn');
    fresh();const tooltip=element('',{onclick:'void 0'});tooltip.click();
    assert.equal(run('actExplorationUi.departurePending()'),false,'tooltip actions inside cards do not request travel');
    run('returnToTown()');assert.equal(run('game.actExploration'),null,'combat-initiated return stays synchronous');
    // 다른 지역에 남은 탐험이 든 저장은 손상 처리 대신 그 탐험만 버리고 연다(임시 전리품 미지급).
    fresh();run('game.currentZoneId=1');
    const stale=copy('(()=>{const restored=mergeDefaults(JSON.parse(serializeSaveState(game)));return {zone:restored.currentZoneId,run:restored.actExploration,gold:restored.currencies.goldenRule};})()');
    assert.deepEqual(stale,{zone:1,run:null,gold:0},'a stale exploration from another zone is dropped on load without paying its loot');
    console.log('act exploration departure: PASS');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
