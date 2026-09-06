const assert = require('assert');
const {runtime:r, run} = require('./lib/replay-fixture')();
run(`game.activeSkill = '지진 파쇄'; game.gridPlayer = {gx:3,gy:4}; Math.random = () => 0.5;
    game.enemies = [[4,4],[5,4],[5,5],[0,0]].map(([gx,gy],index) =>
        Object.assign(createEnemy(getZone(1), {at:20,count:4}, index), {gx,gy,hp:100000,maxHp:100000}));
    game.enemies[0].hp = 1; battleFx = [];`);
const skill = run('SKILL_DB["지진 파쇄"]');
const stats = r.getPlayerStats();
stats.sSkill = {...stats.sSkill, ...skill};
r.performPlayerAttack(stats, {skillName:'지진 파쇄',forcedCrit:false});
const rows = run('pendingSkillStageHits');
assert.strictEqual(rows.length, 2);
const [strike, shock] = rows;
assert.strictEqual(strike.targetEntries.length, 1, 'initial slam strikes only the primary enemy');
assert.strictEqual(strike.options.attackFootprint.cells.length, 1);
assert.strictEqual(shock.at - strike.at, 460);
assert(Math.abs(strike.options.hitDamageMultiplier - 0.58) < 1e-12);
assert.strictEqual(shock.options.hitDamageMultiplier, 0.42);
assert.strictEqual(shock.options.attackFootprint.cells.length, 9, 'target and eight surrounding cells');
assert.strictEqual(shock.options.attackFootprint.center.gx, 4, 'area is centered on the enemy, not the caster');
const center = JSON.stringify(shock.options.attackFootprint);
run('game.combatTimeMs = pendingSkillStageHits[0].at;');
r.processPendingSkillStageHits();
assert(!run('game.enemies.some(enemy => enemy.gx === 4 && enemy.gy === 4 && enemy.hp > 0)'), 'the first slam kills the primary');
assert.strictEqual(run('game.enemies.find(enemy => enemy.gx === 5 && enemy.gy === 4).hp'), 100000,
    'neighbors receive no damage before the eruption');
run(`game.enemies.find(enemy => enemy.gx === 5 && enemy.gy === 5).gx = 7;
    for (const [index,gx,gy] of [[10,3,3],[11,3,5],[12,4,2]]) {
        const enemy = createEnemy(getZone(1), {at:20,count:1}, index);
        Object.assign(enemy, {gx,gy,hp:100000,maxHp:100000,isBoss:index===12});
        game.enemies.push(enemy);
    }
    game.gridPlayer = {gx:0,gy:7};`);
assert.strictEqual(JSON.stringify(shock.options.attackFootprint), center, 'movement/death cannot move the eruption');
run('game.combatTimeMs = pendingSkillStageHits[0].at - 1;');
r.processPendingSkillStageHits();
assert.strictEqual(run('game.enemies.find(enemy => enemy.gx === 5 && enemy.gy === 4).hp'), 100000);
run('game.combatTimeMs += 1;');
r.processPendingSkillStageHits();
assert.strictEqual(run('game.enemies.filter(enemy => enemy.hp < 100000 && enemy.hp > 0).length'), 4,
    'new arrivals and an overlapping 2x2 boss are struck once, independent of the original victim count');
assert.strictEqual(run('game.enemies.find(enemy => enemy.gx === 7 && enemy.gy === 5).hp'), 100000,
    'an enemy that leaves the marked area avoids the eruption');
const settled = run('JSON.stringify(game)');
r.processPendingSkillStageHits();
assert.strictEqual(run('JSON.stringify(game)'), settled, 'processing again cannot repeat damage');
const cast = run('battleFx.find(fx => fx.type === "combatTravel" && fx.patternKind === "earthSpikes")');
assert(cast, 'the ground effect survives the primary victim dying');
const projection = {tileW:40,tileH:40,cellToScreen:(gx,gy)=>({x:gx*40,y:gy*40})};
const footprint = r.projectSkillFootprint(shock.options.attackFootprint, projection);
const spike = {}, crack = {}, draws = [];
const ctx = new Proxy({globalAlpha:1}, {get:(obj,key)=> key in obj ? obj[key] : (...args)=>{
    if(key==='drawImage')draws.push(args);
}});
r.drawEarthSpikeField(ctx,footprint,{start:1000,arriveAt:1460,now:1459,end:1720},{spike,crack});
assert.strictEqual(draws.filter(args=>args[0]===spike).length, 0, 'spikes cannot erupt before damage time');
draws.length=0;
r.drawEarthSpikeField(ctx,footprint,{start:1000,arriveAt:1460,now:1500,end:1720},{spike,crack});
const rocks = draws.filter(args=>args[0]===spike);
assert.strictEqual(rocks.length,8, 'rock debris surrounds a clear central impact');
assert.strictEqual(rocks.filter(args=>args[4]>16).length,4, 'four prominent wedges surround the impact');
assert(rocks.every(args=>args[3]<=40*0.72 && args[4]<=40*0.75), 'compact wedges stay below three quarters of a tile');
assert.strictEqual(draws.filter(args=>args[0]===crack).length,1, 'one connected fracture spans the whole damage area');
assert(new Set(rocks.filter(args=>args[4]>16).map(args=>args[4])).size > 1, 'major wedges have different silhouettes');
draws.length=0;
r.drawEarthSpikeField(ctx,footprint,{start:1000,arriveAt:1460,now:1500,end:1720,playerPoint:{x:120,y:120}},{spike,crack});
assert.strictEqual(draws.filter(args=>args[0]===spike).length,7,'no rock can erupt in the current player cell');
assert.strictEqual(draws.filter(args=>args[0]===spike && args[4]>16).length,3,'the blocked tall wedge is also removed');
draws.length=0;
r.drawEarthSpikeField(ctx,footprint,{start:1000,arriveAt:1460,now:1720,end:1720},{spike,crack});
assert.strictEqual(draws.length,0,'expired eruption leaves no visual residue');
assert.strictEqual(run('JSON.stringify(game)'),settled,'rendering never mutates combat');
console.log('smoke-earth-spikes passed');
