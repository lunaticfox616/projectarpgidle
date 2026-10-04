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
    startEncounterRun();window.enemy=game.actExploration.packs[0].waiting[0];
    awardEnemyLootCurrency('goldenRule',7);
    queueEnemyGroundLoot(window.enemy,{currency:'goldenRule',count:7});
    window.iconless=Object.keys(ORB_DB).find(key=>!ORB_DB[key].icon);
    awardEnemyLootCurrency(window.iconless,2);
    queueEnemyGroundLoot({...window.enemy,id:999,gx:(window.enemy.gx+1)%getCombatGridSize().columns},{currency:window.iconless,count:2});`);
const owned=run('JSON.stringify([game.currencies,game.inventory])');
run(`battleGroundLoot.actorContext(source,ctx,performance.now(),{actorGroundOffsetY:8,
    cellToScreen:(gx,gy)=>({x:gx*12,y:gy*12})})`);
assert.equal(nodes.filter(n=>n.className==='battle-loot-drop'&&!n.removed).length,2,'paid drops appear where enemies fell while exploration is active');
const label=nodes.find(n=>n.className==='battle-loot-name');
assert.match(label.innerHTML,/7/);
assert.ok(nodes.some(n=>n.className==='battle-loot-item battle-loot-glyph'),'iconless currency has a visible fallback');
run('game.isBackgroundCalculation=true');
now=60;
run(`battleGroundLoot.actorContext(source,ctx,60,{actorGroundOffsetY:8,cellToScreen:()=>({x:300,y:200})})`);
assert.equal(nodes.filter(n=>n.className==='battle-loot-drop'&&!n.removed).length,0);
assert.equal(run('JSON.stringify([game.currencies,game.inventory])'),owned,'clearing presentation never changes rewards');
run("battleFx=[];queueEnemyGroundLoot(window.enemy,{currency:'goldenRule',count:1})");
assert.equal(run('battleFx.length'),0,'offline gains never enqueue ground effects');
console.log('immediate loot presentation, currency labels, iconless fallback and offline suppression: OK');
