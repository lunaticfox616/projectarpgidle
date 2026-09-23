const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const plain = code => JSON.parse(JSON.stringify(run(code)));
run(`
game = JSON.parse(JSON.stringify(defaultGame));
game.level=100; game.season=15; game.passivePoints=300; game.starWedge.unlocked=true;
game.expertise.levels.astronomer=15; assignStarWedgeSockets();
var central=Object.values(PASSIVE_TREE.nodes).find(n=>n.kind==='hub'&&n.starWedgeMode!=='constellation');
var outer=Object.values(PASSIVE_TREE.nodes).find(n=>n.starWedgeMode==='constellation');
var outer2=Object.values(PASSIVE_TREE.nodes).find(n=>n.starWedgeMode==='constellation'&&n.id!==outer.id);
function sample(type,id) {
    var w={...createStarWedgeItem(),id,unique:!!type,uniqueType:type};
    w.lines=[{stat:'flatHp',val:10},{stat:'pctDmg',val:5},{stat:'crit',val:3},{stat:'flatHp',val:30}];
    w.outerLayout={counts:[3,2,1],forks:[false,true,false]};
    return normalizeUniqueStarWedgeItem(w);
}
var ordinary=sample('',8100);game.starWedge.wedges=[ordinary];
socketStarWedgeOnNode(outer.id,ordinary.id);
var first=Object.values(PASSIVE_TREE.nodes).find(n=>n.requiresStarWedgeSocketNodeId===outer.id&&n.starWedgeLineIndex===0&&n.starWedgeRoot);
var last=PASSIVE_TREE.nodes[first.id+'_branch_2'];
`);
assert.equal(run('last.effects[0].val'),20,'each outer passive has twice the item value');
assert.equal(run('getPassiveActivationPath(last.id).length'),3,'a branch must buy its intermediate nodes');
const budget = run('game.passivePoints');
assert.equal(run('activatePassivePath(last.id).cost'),3);
assert.equal(run('game.passivePoints'),budget-3);
assert.equal(run('canRefundPassiveNode(first.id)'),false,'cannot refund a parent and keep its descendants');
assert.equal(run('getAllocatedPassiveStatValue("flatHp")'),60);
const allocated = plain('game.passives');
run('var saved=JSON.parse(JSON.stringify(game));var restored=mergeDefaults(saved);');
assert.deepEqual(plain('restored.passives'),allocated,'save/load preserves generated branch allocation');
assert.deepEqual(plain('restored.starWedge.wedges[0].outerLayout'),plain('ordinary.outerLayout'));
run('recalculateStarWedgeMutations(); unsocketStarWedge(outer.id);');
assert.equal(run('game.passivePoints'),budget,'removing a branch refunds its three points once');
run('refreshStarWedgePassiveState();');
assert.equal(run('game.passivePoints'),budget);

// Probability boundaries are exact; 625 evenly spaced rolls exercise the entire distribution.
run('var originalRandom=Math.random;var histogram=[0,0,0,0,0];for(var i=0;i<625;i++){Math.random=()=>i/625;histogram[starWedgeRules.rollPlutoCount()-1]++;}Math.random=originalRandom;');
assert.deepEqual(plain('histogram'),[500,100,20,4,1]);
run('var comet=sample("comet",8101);');
assert.deepEqual(plain('comet.lines.map(l=>l.val)'),[6,10,14,24]);

run(`var pluto=sample('pluto',8200);pluto.voidCount=5;game.starWedge.wedges.push(pluto);
var beforeSockets=JSON.stringify(game.starWedge.sockets);socketStarWedgeOnNode(central.id,pluto.id);`);
assert.equal(run('JSON.stringify(game.starWedge.sockets)'),run('beforeSockets'),'invalid central placement leaves slots unchanged');
run(`socketStarWedgeOnNode(outer.id,pluto.id);
var voidIds=Object.values(PASSIVE_TREE.nodes).filter(n=>n.starWedgeOwnerId===pluto.id&&isPassiveNodeAvailable(n)).map(n=>n.id);
voidIds.forEach(id=>activatePassivePath(id));
game.voidPassives[voidIds[0]]={stats:[{id:'flatHp',val:30}],transcendent:null};
game.voidPassives[voidIds[1]]={stats:[{id:'flatHp',val:30},{id:'pctDmg',val:5}],transcendent:null};
game.voidPassives[voidIds[2]]={stats:[],transcendent:{id:'thirdFinger',value:1}};
`);
assert.equal(run('voidIds.length'),5);
assert.equal(run('getTranscendentVoidPassiveCount("thirdFinger")'),1);
run(`var dark=sample('dark_matter',8201);game.starWedge.wedges.push(dark);socketStarWedgeOnNode(central.id,dark.id);`);
assert.deepEqual(plain('starWedgeRules.voidStats(game.voidPassives[voidIds[0]],game)'),[{id:'flatHp',val:60}]);
assert.equal(run('starWedgeRules.voidStats(game.voidPassives[voidIds[1]],game)[0].val'),30,'two-line void options are not doubled');
assert.equal(run('game.voidPassives[voidIds[0]].stats[0].val'),30,'saved base values are unchanged');
run('var withDark=getPlayerStats();unsocketStarWedge(central.id);var withoutDark=getPlayerStats();');
assert.ok(run('withDark.maxHp > withoutDark.maxHp'),'dark matter reaches actual combat stats');
run(`socketStarWedgeOnNode(outer2.id,pluto.id);`);
assert.equal(run('getTranscendentVoidPassiveCount("thirdFinger")'),1,'moving Pluto preserves its own allocated nodes');
assert.equal(run('game.voidPassives[voidIds[0]].stats[0].val'),30);
run(`unsocketStarWedge(outer2.id);var savedVoid=JSON.parse(JSON.stringify(game));var reloadedVoid=mergeDefaults(savedVoid);`);
assert.equal(run('getTranscendentVoidPassiveCount("thirdFinger")'),0,'inactive generated void nodes cannot grant extra slots');
assert.equal(run('reloadedVoid.voidPassives[voidIds[0]].stats[0].val'),30,'unsocketed Pluto keeps crafted options across load');
run('socketStarWedgeOnNode(outer.id,pluto.id);');
assert.equal(run('game.passives.filter(id=>voidIds.includes(id)).length'),0,'refunded allocations must be purchased again');

// Rerolling count preserves all five crafted entries and spends only the usual shard cost.
run(`Object.assign(game.currencies,{meteorShard:100,incompleteStarWedge:3});
Math.random=()=>0;rerollStarWedge(pluto.id);Math.random=originalRandom;`);
assert.equal(run('pluto.voidCount'),1);
assert.equal(run('game.currencies.meteorShard'),77);
assert.equal(run('game.currencies.incompleteStarWedge'),3);
assert.equal(run('game.voidPassives[voidIds[2]].transcendent.id'),'thirdFinger');
run(`rerollStarWedge(pluto.id,'single');`);
assert.equal(run('game.currencies.meteorShard'),77,'invalid line-lock reroll must not consume materials');

run(`var nova=sample('supernova',8300);game.starWedge.wedges.push(nova);socketStarWedgeOnNode(central.id,nova.id);`);
assert.equal(run('getStarWedgeMutationBands(nova).length'),0);
assert.deepEqual(plain('getPassiveNodeRawEffects(central,getPassiveNodeMutation(central)).map(l=>l.val)'),[10,5,3,30]);
run('socketStarWedgeOnNode(outer2.id,nova.id);');
assert.equal(run(`Object.values(PASSIVE_TREE.nodes).filter(n=>n.requiresStarWedgeSocketNodeId===outer2.id&&n.starWedgeOptionActive).length`),1,'supernova generates only its combined core');
assert.deepEqual(plain(`Object.values(PASSIVE_TREE.nodes).find(n=>n.requiresStarWedgeSocketNodeId===outer2.id&&n.starWedgeOptionActive).effects.map(l=>l.val)`),[20,10,6,60]);

// Points granted by a crafted void node must disappear with its allocation.
run(`game.passives=[voidIds[0]];game.passivePoints=0;
game.voidPassives[voidIds[0]]={stats:[],transcendent:{id:'paleBlueDot',value:10}};
syncPaleBlueDotPassivePoints(null,game.voidPassives[voidIds[0]].transcendent);
var novaCore=Object.values(PASSIVE_TREE.nodes).find(n=>n.requiresStarWedgeSocketNodeId===outer2.id&&n.starWedgeOptionActive);
activatePassivePath(novaCore.id);
var thirdOuter=Object.values(PASSIVE_TREE.nodes).find(n=>n.starWedgeMode==='constellation'&&n.id!==outer.id&&n.id!==outer2.id);
socketStarWedgeOnNode(thirdOuter.id,ordinary.id);
Object.values(PASSIVE_TREE.nodes).filter(n=>n.requiresStarWedgeSocketNodeId===thirdOuter.id&&n.starWedgeOptionActive).forEach(n=>activatePassivePath(n.id));
unsocketStarWedge(outer.id);`);
assert.equal(run('starWedgeRules.pointBudget(game)'),1,'removing borrowed points cannot leave excess allocations');
assert.equal(run('game.passives.length + game.passivePoints'),1);
run('refreshStarWedgePassiveState();');
assert.equal(run('game.passives.length + game.passivePoints'),1,'repeated reconciliation never creates more points');

// Small graph isolates permission removal from the authored layout's ordinary routes.
run(`Object.keys(PASSIVE_TREE.nodes).forEach(id=>delete PASSIVE_TREE.nodes[id]);
PASSIVE_TREE.edges=[{from:'n0',to:'home'},{from:'far',to:'bridge'},{from:'bridge',to:'end'}];
Object.assign(PASSIVE_TREE.nodes,{
n0:{id:'n0',kind:'start',x:-100,y:0},home:{id:'home',kind:'hub',socketType:'star_wedge',x:0,y:0},
far:{id:'far',kind:'hub',socketType:'star_wedge',x:1000,y:0},bridge:{id:'bridge',kind:'path',stat:'flatHp',val:5,x:850,y:0},
end:{id:'end',kind:'path',stat:'pctDmg',val:5,x:1100,y:0}});
game.passives=[];game.passivePoints=10;game.voidPassives={};
var black=sample('black_hole',8400);black.recordedHubNodeId='far';
var ring=sample('andromeda',8401);game.starWedge={wedges:[black,ring],sockets:[],unlocked:true};
socketStarWedgeOnNode('home',black.id);activatePassivePath('end');`);
assert.deepEqual(plain('game.passives'),['bridge','end']);
run(`unsocketStarWedge('home');`);
assert.deepEqual(plain('game.passives'),[],'revoking a virtual hub removes the isolated branch');
assert.equal(run('game.passivePoints'),10);
run(`socketStarWedgeOnNode('home',ring.id);`);
assert.deepEqual(plain('getPassiveActivationPath("bridge")'),['bridge']);
assert.deepEqual(plain('getPassiveActivationPath("end")'),[],'an unallocated annulus node cannot be a free bridge');
run(`activatePassivePath('bridge');activatePassivePath('end');socketStarWedgeOnNode('far',ring.id);`);
assert.deepEqual(plain('game.passives'),[],'moving the annulus revokes access at its previous location');
assert.equal(run('game.passivePoints'),10);
console.log('smoke-star-wedge-expansion passed');
