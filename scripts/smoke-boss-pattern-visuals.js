const assert = require('assert');
const {runtime:r, enemy, state} = require('./audit-combat-20260905').prepare();
const calls = [];
const ctx = {canvas:{width:320,height:240},getTransform:()=>({a:1}),measureText:label=>({width:label.length*8})};
for (const method of ['save','restore','beginPath','stroke','fill','clip','rect','moveTo','lineTo',
    'closePath','ellipse','setLineDash','fillRect','fillText','strokeRect','roundRect']) {
    ctx[method] = (...args) => calls.push({method,args});
}
Object.assign(enemy, {isBoss:true,patternMode:'intro',patternAttackCount:2,attackTimer:0.5});
r.refreshBossPatternPreview(enemy);
r.updateBossPatternTelegraph(enemy, r.getCombatTime(), state.gridPlayer);
const projection = {tileW:40,tileH:40,cellToScreen:(gx,gy)=>({x:gx*40,y:gy*40})};
const layout = [{enemy,x:160,y:160}];
r.drawEnemyAttackTelegraphs(ctx, layout, 1, projection, []);
assert.deepStrictEqual(calls.filter(call=>call.method==='rect').map(call=>call.args), [[100,140,40,40]],
    'warning covers exactly the cast-time cell at every viewport size');
assert.strictEqual(calls.filter(call=>call.method==='fillText').length,0,'ground warnings do not draw labels underneath actors');
r.drawBattlefieldEnemyHealthBars(ctx, layout, []);
assert.strictEqual(calls.filter(call=>call.method==='fillText').length, 0, 'cast gauges never draw a skill name');
assert.strictEqual(calls.filter(call=>call.method==='roundRect').length,2,'cast gauge has a rounded border and clipped fill');
const pattern = r.consumeBossPatternAttack(enemy);
calls.length = 0;
r.drawEnemyAttackTelegraphs(ctx, layout, 1, projection, [{delivery:'patternArea',bossPattern:pattern}]);
assert.strictEqual(calls.filter(call=>call.method==='rect').length, 1, 'released attacks retain their warning until impact');
calls.length = 0;
enemy.patternArea = pattern.area;
enemy.ailments = [{type:'freeze',time:1}];
r.drawEnemyAttackTelegraphs(ctx, layout, 1, projection, []);
assert.strictEqual(calls.length, 0, 'unreleased frozen bosses draw no stale warning');

console.log('smoke-boss-pattern-visuals passed');
