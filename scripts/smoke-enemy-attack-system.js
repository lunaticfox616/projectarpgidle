const assert=require('assert');
const {prepare}=require('./audit-combat-20260905');
function fixture(delivery='projectileCell',overrides={}) {
    const env=prepare(),{runtime:r,state,enemy}=env;
    r.Math.random=()=>.5;
    Object.assign(enemy,{gx:7,gy:4,attackRange:9,attackKind:'ranged',attackDelivery:delivery,
        attackTimer:1,attackCastMs:0,projectileToEdge:false,ele:'phys',critChance:0,ailments:[]});
    const stats=r.getPlayerStats();
    Object.assign(stats,{maxHp:10000,energyShield:0,armor:0,dr:0,evadeChance:0,blockChance:0},overrides);
    state.playerHp=10000;state.playerEnergyShield=stats.energyShield;
    return {...env,stats};
}
function launch(env,delivery) {
    const {runtime:r,state,enemy,stats}=env;
    if(delivery==='instantTarget') {
        enemy.attackKind='melee';enemy.gx=4;enemy.attackRange=1;
        r.performMonsterAttacks(stats);return;
    }
    let pattern=null;
    if(delivery==='patternArea')pattern={label:'검증 강타',damageMul:1,area:{cells:[{...state.gridPlayer}]}};
    r.queueEnemyCombatAttack(enemy,state.gridPlayer,pattern,delivery);
    enemy.attackTimer=0;
}
function finish(env) {
    const pending=env.run('pendingEnemyCombatAttacks[0]');
    if(!pending)return;
    env.state.combatTimeMs=pending.endsAt || pending.at;
    env.runtime.performMonsterAttacks(env.stats);
}
{
    const env=fixture(),r=env.runtime,profiles=new Set();
    for(let i=0;i<40;i++) {
        const one={spriteVariantId:'species-'+i,isElite:true},two={...one};
        r.assignEnemyGridCombatProfile(one);r.assignEnemyGridCombatProfile(two);
        assert.deepStrictEqual(one,two,'same monster species retains its attack role across spawns');
        profiles.add(one.attackDelivery);
        assert.strictEqual(!!one.attackCastMs,!!one.projectileToEdge,'only elite edge shots have a normal-monster cast bar');
    }
    assert.strictEqual(profiles.size,3);
    const wisp={monsterArchetype:'wisp',spriteVariantId:'wisp-fire'};r.assignEnemyGridCombatProfile(wisp);
    assert.strictEqual(wisp.attackDelivery,'projectileTarget');assert.strictEqual(wisp.attackCastMs,0);
}

for (const hit of [true,false]) {
    const env=fixture();env.state.gridPlayer={gx:3,gy:1};launch(env,'projectileCell');
    env.state.gridPlayer={gx:6,gy:hit?4:5};finish(env);
    assert.strictEqual(env.state.playerHp<10000,hit,'oblique shots hit only tiles intersected by their exact ray');
}
{
    const env=fixture();env.enemy.projectileToEdge=true;env.state.gridPlayer={gx:3,gy:1};
    launch(env,'projectileCell');
    const flight=env.run('pendingEnemyCombatAttacks[0]');
    assert(Math.abs((flight.targetCell.gx-7)*-3-(flight.targetCell.gy-4)*-4)<1e-9,
        'edge extension keeps the exact aim angle without snapping the endpoint to a tile');
    assert.strictEqual(flight.targetCell.gy,0);
    env.state.gridPlayer={gx:8,gy:7};
    env.state.combatTimeMs=flight.launchedAt+flight.path.at(-1).offsetMs;
    env.runtime.performMonsterAttacks(env.stats);
    assert(!flight.finished,'a missed shot continues visually to its exact endpoint');
    finish(env);assert(flight.finished);
}
for(const delivery of ['instantTarget','projectileTarget','projectileCell','patternArea']) {
    const evade=fixture(delivery,{evadeChance:90});
    launch(evade,delivery);finish(evade);
    assert.strictEqual(evade.state.playerHp,10000,`${delivery}: ordinary stat evasion applies`);
    assert(evade.run('battleFx.some(fx=>fx.type==="statusText" && fx.text==="회피!")'));
    const shield=fixture(delivery,{energyShield:1000});
    launch(shield,delivery);finish(shield);
    assert.strictEqual(shield.state.playerHp,10000,`${delivery}: shield absorbs the hit before health`);
    assert(shield.state.playerEnergyShield<1000,`${delivery}: the shield actually took damage`);
    const bare=fixture(delivery);launch(bare,delivery);finish(bare);
    const armored=fixture(delivery,{armor:100000});launch(armored,delivery);finish(armored);
    assert(10000-armored.state.playerHp<10000-bare.state.playerHp,`${delivery}: physical armor still works`);
}
{
    const env=fixture(),r=env.runtime;
    assert.strictEqual(r.enemyAttackRules.castBar(env.enemy,r.getCombatTime()),null,'ordinary attacks have no cast bar');
    Object.assign(env.enemy,{isBoss:true,patternMode:'slam',patternAttackCount:0,attackTimer:.5});
    r.performMonsterAttacks(env.stats);
    assert.strictEqual(r.enemyAttackRules.castBar(env.enemy,r.getCombatTime()),null,'ordinary boss strikes have no cast bar');
}
{
    const env=fixture('projectileTarget');launch(env,'projectileTarget');
    env.state.gridPlayer={gx:0,gy:0};finish(env);
    assert(env.state.playerHp<10000,'homing follows the selected living target after movement');
}
for(const delivery of ['projectileCell','patternArea']) {
    const env=fixture(delivery);launch(env,delivery);
    env.state.gridPlayer={gx:0,gy:0};finish(env);
    assert.strictEqual(env.state.playerHp,10000,`${delivery}: moving outside avoids the hit`);
}
{
    const env=fixture(),{runtime:r,state,run}=env;launch(env,'projectileCell');
    const flight=run('pendingEnemyCombatAttacks[0]');
    state.combatTimeMs=flight.launchedAt+flight.path[0].offsetMs;
    r.performMonsterAttacks(env.stats);
    assert.strictEqual(state.playerHp,10000,'a distant victim is not hit at the first path cell');
    state.gridPlayer={gx:6,gy:4};finish(env);
    assert.strictEqual(state.playerHp,10000,'walking behind a passed projectile must not be hit retroactively');
    assert.strictEqual(run('pendingEnemyCombatAttacks.length'),0);
    r.performMonsterAttacks(env.stats);
    assert.strictEqual(state.playerHp,10000,'an expired shot cannot resolve twice');
}
{
    const env=fixture();env.enemy.projectileToEdge=true;launch(env,'projectileCell');
    const flight=env.run('pendingEnemyCombatAttacks[0]');
    assert.strictEqual(flight.targetCell.gx,0,'edge shots continue past the original aim cell');
    env.state.gridPlayer={gx:1,gy:4};finish(env);
    assert(env.state.playerHp<10000,'standing farther down the ray still collides');
}
{
    const env=fixture('instantTarget');env.enemy.attackKind='melee';env.enemy.attackRange=1;env.enemy.gx=5;
    env.runtime.performMonsterAttacks(env.stats);
    assert.strictEqual(env.state.playerHp,10000,'melee cannot begin outside range 1');
    env.enemy.gx=5;env.enemy.attackRange=2;env.enemy.attackTimer=1;
    env.runtime.performMonsterAttacks(env.stats);
    assert(env.state.playerHp<10000,'explicit melee range 2 is supported');
}
for(const type of ['freeze','stun','silence']) {
    const env=fixture(),{runtime:r,enemy,state,stats}=env;
    Object.assign(enemy,{isBoss:true,patternMode:'slam',patternAttackCount:2,attackTimer:.5});
    r.performMonsterAttacks(stats);
    assert(enemy.patternArea && r.enemyAttackRules.castBar(enemy,r.getCombatTime()));
    enemy.ailments=[{type,time:1,power:0}];r.performMonsterAttacks(stats);
    assert.strictEqual(enemy.patternArea,null,`${type}: power 0 still cancels a live cast`);
    assert(r.enemyAttackRules.castBar(enemy,r.getCombatTime()).cancelled);
    state.combatTimeMs+=3000;r.performMonsterAttacks(stats);
    assert.strictEqual(state.playerHp,10000,`${type}: interrupted cast cannot deal delayed damage`);
    enemy.ailments=[];enemy.attackTimer=1;r.performMonsterAttacks(stats);
    assert.strictEqual(env.run('pendingEnemyCombatAttacks.length'),0,'a new cast needs its full warning');
    state.combatTimeMs+=1500;r.performMonsterAttacks(stats);
    const pending=env.run('pendingEnemyCombatAttacks[0]');assert(pending);
    enemy.ailments=[{type,time:1}];state.combatTimeMs=pending.at;r.performMonsterAttacks(stats);
    assert.strictEqual(state.playerHp,10000,`${type}: area casts remain interruptible through impact`);
    assert.strictEqual(env.run('pendingEnemyCombatAttacks.length'),0);
}
for (const type of ['freeze','stun','silence']) {
    const env=fixture(),{runtime:r,enemy,state,stats}=env;
    launch(env,'patternArea');
    const pending=env.run('pendingEnemyCombatAttacks[0]');
    state.combatTimeMs+=10;enemy.ailments=[{type,time:.05,power:0}];
    r.tickEnemyAilments(stats,.1);
    state.combatTimeMs=pending.at;r.performMonsterAttacks(stats);
    assert.strictEqual(state.playerHp,10000,`${type}: expiration cannot revive an interrupted area cast`);
}
{
    const env=fixture(),{runtime:r,enemy,state,stats}=env;
    enemy.attackCastMs=900;r.performMonsterAttacks(stats);
    assert(enemy.attackCast);assert.strictEqual(env.run('pendingEnemyCombatAttacks.length'),0);
    enemy.ailments=[{type:'stun',time:.05}];r.tickEnemyAilments(stats,.1);
    assert.strictEqual(enemy.attackCast,null,'even a short control cancels before its duration expires');
    enemy.ailments=[];launch(env,'projectileCell');enemy.hp=0;state.enemies=[];finish(env);
    assert(state.playerHp<10000,'already released projectiles survive caster death');
}
{
    const env=fixture();env.enemy.regenRate=.01;env.enemy.hp=env.enemy.maxHp-100;
    launch(env,'projectileCell');
    const before=env.enemy.hp;
    env.runtime.performMonsterAttacks(env.stats);
    assert(env.enemy.hp>before,'waiting for a projectile must not suspend enemy regeneration');
    assert.strictEqual(env.run('pendingEnemyCombatAttacks.length'),1,'waiting does not launch a duplicate shot');
}
{
    const env=fixture(),r=env.runtime,calls=[];
    const ctx={save(){},restore(){},translate(){},rotate(){},drawImage(...args){calls.push(args);}};
    const start={x:0,y:0},end=[{x:100,y:50}];
    assert.strictEqual(r.enemyProjectileSprites.draw(ctx,{owner:'player'},start,end,.5),false);
    env.run("battleAssets.images.skillFxEnemyProjectiles={complete:true,naturalWidth:128}");
    for(const [element,sourceId,wisp] of [['phys',2],['fire',2],['cold',2],['light',2],['chaos',2],['chaos',3],['phys',3],['phys',2,true]]) {
        const fx={owner:'enemy',element,sourceId,enemyFlight:{source:{monsterArchetype:wisp?'wisp':null}}};
        assert(r.enemyProjectileSprites.draw(ctx,fx,start,end,.5));
    }
    assert.strictEqual(calls.length,8,'each projectile uses one sprite draw');
    assert.strictEqual(new Set(calls.map(args=>args.slice(1,3).join(','))).size,8,'eight distinct silhouettes are selected');
    env.run('delete battleAssets.images.skillFxEnemyProjectiles');
    assert.strictEqual(r.enemyProjectileSprites.draw(ctx,{owner:'enemy'},start,end,.5),false,'loading atlas keeps the existing fallback available');
}
console.log('enemy attack system: four deliveries, evasion/armor/shield, moving collision, cast cancellation and released flights passed');
