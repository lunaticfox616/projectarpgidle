const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const espree=require('espree');
const {buildGameRuntime}=require('./lib/game-runtime');
// Only browser/time boundaries are simulated; loot, completion and rendering are real modules.
const nodes=[],ids=new Map(),listeners=new Map();
let now=0;
const ctx={resetTransform(){},clearRect(){},setTransform(){},getTransform(){return {};}};
function element(tag='div') {
    const properties=new Map(),classes=new Set();
    const node={tag,style:{setProperty:(k,v)=>properties.set(k,v),getPropertyValue:k=>properties.get(k)||''},
        dataset:{},children:[],hidden:false,offsetWidth:80,offsetLeft:0,offsetTop:0,
        clientWidth:800,clientHeight:600,width:800,height:600,offsetParent:{},
        className:'',textContent:'',innerHTML:'',removed:false,
        classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},
        setAttribute(){},addEventListener(){},getAnimations:()=>[],getContext:()=>ctx,
        animate:()=>({cancel(){}}),remove(){this.removed=true;},
        append(...children){this.children.push(...children);this.firstElementChild=this.children[0];},
        prepend(child){this.children.unshift(child);},
        querySelector(selector){return this.children.find(n=>'.'+n.className===selector)||null;}};
    nodes.push(node);return node;
}
const source=element('canvas');source.parentElement=element();
ids.set('btn-exploration-loot-skip',element('button'));
ids.set('divine-drop-banner',element());
const runtime=buildGameRuntime({},new EventTarget(),{
    createElement:element,getElementById:id=>ids.get(id)||null,
    addEventListener:(name,fn)=>listeners.set(name,[...(listeners.get(name)||[]),fn])
});
runtime.performance.now=()=>now;
runtime.getComputedStyle=()=>({getPropertyValue:()=>'',transform:'none',borderTopColor:'#ddb655',color:'#fff3c4'});
runtime.source=source;runtime.ctx=ctx;
const run=code=>vm.runInContext(code,runtime);
// This real helper is nested in the legacy DOM refresh and normally published on first paint.
// Load its unchanged body because the Node DOM boundary deliberately does not boot the full UI.
const ui=fs.readFileSync('js/ui.js','utf8');
const pending=[espree.parse(ui,{ecmaVersion:'latest',range:true})];
while(pending.length) {
    const node=pending.pop();
    if(node.type==='FunctionDeclaration' && node.id.name==='getStyledOrbName') {
        vm.runInContext(ui.slice(...node.range),runtime);break;
    }
    for(const value of Object.values(node)) {
        if(Array.isArray(value))pending.push(...value.filter(child=>child?.type));
        else if(value?.type)pending.push(value);
    }
}
run(`game=mergeDefaults({level:100,season:2,currentZoneId:0,settings:{showLootLog:false,autoEquipEmptySlots:false}});
    startEncounterRun();
    actExplorationLoot.capture(game,game.actExploration,()=>awardEnemyLootCurrency('goldenRule',7));
    for(const pack of game.actExploration.packs) {
        const enemies=pack.waiting.splice(0);
        for(const enemy of enemies){enemy.hp=0;actExplorationState.recordDeath(game,enemy);}
    }
    window.claim=actExplorationProgress.beginCompletion(getZone(0)).loot;
    announceActExplorationLoot(window.claim);`);
const owned=run('JSON.stringify([game.currencies,game.inventory])');
// Fractional boss centre is legal for projection even though it is not an integer combat tile.
run(`battleGroundLoot.actorContext(source,ctx,0,{actorGroundOffsetY:8,
    cellToScreen:(gx,gy)=>({x:gx*12,y:gy*12})})`);
assert.equal(nodes.filter(n=>n.className==='battle-loot-drop'&&!n.removed).length,1);
assert.equal(ids.get('btn-exploration-loot-skip').hidden,false);
const label=nodes.find(n=>n.className==='battle-loot-name');
assert.match(label.innerHTML,/7/,'currency count is retained');
run('game.actExploration.departure={zoneId:1,remainingMs:5500}');
for(const click of listeners.get('click'))click({target:{closest:selector=>selector==='#btn-exploration-loot-skip'?ids.get('btn-exploration-loot-skip'):null}});
assert.equal(run('game.actExploration.departure.remainingMs'),0);
assert.equal(nodes.filter(n=>n.className==='battle-loot-drop'&&!n.removed).length,0);
assert.equal(ids.get('btn-exploration-loot-skip').hidden,true);
assert.equal(run('JSON.stringify([game.currencies,game.inventory])'),owned,'skip cannot pay or remove rewards');
// Offline completion must not enqueue presentation or show a skip control.
run(`dispatchRuntimeEvent('exploration-loot-claimed',{...window.claim,equipmentCount:0,background:true})`);
now=1500;
run(`battleGroundLoot.actorContext(source,ctx,1500,{actorGroundOffsetY:8,cellToScreen:()=>({x:300,y:200})})`);
assert.equal(nodes.filter(n=>n.className==='battle-loot-drop'&&!n.removed).length,0);
assert.equal(ids.get('btn-exploration-loot-skip').hidden,true);
console.log('Exploration settlement projection, currency labels, skip and offline presentation: OK');
