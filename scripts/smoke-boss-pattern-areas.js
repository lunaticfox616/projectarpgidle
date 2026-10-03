const assert = require('assert');
const {prepare} = require('./audit-combat-20260905');

/** 이동 스킬 칸(예전 긴급 회피 컨디션 젬 자리): 그림자 점멸을 끼운다. */
function wearMobilityGem(r, state) {
    if (!state.skills.includes('그림자 점멸')) state.skills.push('그림자 점멸');
    state.mobilitySkill = '그림자 점멸';
    r.mobilitySkill.reset();
}

function bossFixture(mode = 'slam') {
    const env = prepare(), {runtime:r, state, enemy} = env;
    Object.assign(enemy, {isBoss:true, patternMode:mode, patternAttackCount:2, attackTimer:0.5,
        gx:7, gy:4, attackKind:'ranged', attackRange:99, damageMul:1, attackSpeedVar:1,
        ailments:[], critChance:0, ele:'phys'});
    state.playerHp = 10000;
    const stats = r.getPlayerStats();
    Object.assign(stats, {maxHp:10000, energyShield:0, evadeChance:0, blockChance:0, armor:0, dr:0});
    return {...env, stats};
}

// 검토 5차(출시 차단): 격앙 보스의 특수 공격 예고(nova)가 중심에 보스 전체 사본을 담고, 보스가 직전 예고 상태를 들고 있어 특수 공격마다
// 이전 상태가 겹겹이 쌓였다(단계가 바뀌면 기하급수: 20번이면 직렬화 실패). 1,000번 특수 공격 뒤에도 보스 상태는 작고, 중심은 칸 좌표다.
{
    const {runtime:r, enemy} = bossFixture('ramp');
    Object.assign(enemy, { maxHp: 1000, hp: 400 });
    const target = { gx: 3, gy: 4 };
    let now = r.getCombatTime();
    for (let attack = 0; attack < 1000; attack++) {
        if (attack === 500) enemy.hp = 200;
        enemy.attackTimer = 1;
        r.updateBossPatternTelegraph(enemy, now, target);
        now += 2000;
        r.consumeBossPatternAttack(enemy);
    }
    enemy.attackTimer = 1;
    r.updateBossPatternTelegraph(enemy, now, target);
    assert.deepStrictEqual(Object.keys(enemy.patternArea.center).sort(), ['gx', 'gy'], 'the warning centre is a cell, not a copy of the boss');
    assert(JSON.stringify(enemy).length < 20000, 'a thousand special attacks leave the boss state small');
    // 예전 저장(겹친 사본)은 불러올 때 줄인다.
    const nested = { ...enemy, lastPatternState: { area: { cells: [], center: { ...enemy, deep: { ...enemy } } } } };
    nested.patternArea = { cells: [{ gx: 7, gy: 4 }], center: { ...nested } };
    r.stripBossPatternRuntime(nested);
    assert.strictEqual('lastPatternState' in nested, false);
    assert.strictEqual(JSON.stringify(nested.patternArea.center), JSON.stringify({ gx: enemy.gx, gy: enemy.gy }));
}

{
    const {runtime:r, run, state, enemy, stats} = bossFixture();
    const start = r.getCombatTime();
    r.performMonsterAttacks(stats);
    const area = enemy.patternArea;
    assert(area && area.cells.length === 9, 'slam warns the full target-centered 3x3 footprint');
    state.gridPlayer.gx = 0;
    enemy.attackTimer = 100;
    state.combatTimeMs = start + 1499;
    r.performMonsterAttacks(stats);
    assert.strictEqual(run('pendingEnemyCombatAttacks.length'), 0, 'high attack speed cannot shorten warning');
    assert.strictEqual(enemy.patternArea, area, 'warning never follows its victim');
    state.combatTimeMs = start + 1500;
    r.performMonsterAttacks(stats);
    assert.strictEqual(run('pendingEnemyCombatAttacks.length'), 1, 'one release per tick');
    const released = run('pendingEnemyCombatAttacks[0]');
    assert.strictEqual(released.bossPattern.area, area, 'collision keeps the displayed footprint');
    const summons = [{id:1,gx:3,gy:4,hp:1000,maxHp:1000,alive:true,evasion:0},
        {id:2,gx:4,gy:4,hp:1000,maxHp:1000,alive:true,evasion:0},
        {id:3,gx:0,gy:0,hp:1000,maxHp:1000,alive:true,evasion:0}];
    state.summons = summons;
    enemy.attackTimer = 0;
    state.combatTimeMs = released.at;
    r.performMonsterAttacks(stats);
    assert.strictEqual(state.playerHp, 10000, 'a moved player is not hit');
    assert(summons[0].hp < 1000 && summons[1].hp < 1000, 'each summon remaining inside is hit');
    assert.strictEqual(summons[2].hp, 1000, 'outside summons stay unharmed');
    assert.strictEqual(run('pendingEnemyCombatAttacks.length'), 0, 'impact is consumed once');
}

{
    const {runtime:r, run, state, enemy, stats} = bossFixture();
    r.performMonsterAttacks(stats);
    const area = enemy.patternArea, start = r.getCombatTime();
    const origin = {...state.gridPlayer};
    for (let tick = 1; tick <= 15; tick++) {
        state.combatTimeMs = start + tick * 100;
        run('updateCombatHazardEvasion(getPlayerStats())');
    }
    assert.deepStrictEqual(state.gridPlayer, origin, 'boss warnings must not grant free automatic movement');
    assert.strictEqual(r.mobilitySkill.cast({ blocked:false, inRange:true, auto:false }), false, 'no mobility gem, no escape');
    assert.deepStrictEqual(state.gridPlayer, origin);
    wearMobilityGem(r, state);
    assert.strictEqual(r.mobilitySkill.cast({ blocked:true, inRange:true, auto:false }), true, 'the worn mobility gem escapes even while the main cast is busy');
    assert(!area.cells.some(cell => cell.gx === state.gridPlayer.gx && cell.gy === state.gridPlayer.gy),
        'the mobility slot moves outside the warned area');
    assert(Math.abs(state.gridPlayer.gx - origin.gx) + Math.abs(state.gridPlayer.gy - origin.gy) <= 3, 'within three steps');
    assert(r.mobilitySkill.cooldownLeft() > 0, 'a successful escape spends the mobility cooldown');
    assert.strictEqual(state.playerHp, 10000, 'movement changes no health');
    const safe = {...state.gridPlayer};
    assert.strictEqual(run('updateCombatHazardEvasion(getPlayerStats()).holdPosition'), true);
    r.updatePlayerGridEngagement(stats, {holdPosition:true});
    assert.strictEqual(state.gridPlayer.gx, safe.gx, 'do not walk back into a held warning');
    assert.strictEqual(state.gridPlayer.gy, safe.gy);
    enemy.ailments = [{type:'freeze',time:2,power:1}];
    r.performMonsterAttacks(stats);
    assert.strictEqual(enemy.patternArea, null, 'freeze cancels an unreleased area');
    enemy.ailments = []; enemy.attackTimer = 1;
    r.performMonsterAttacks(stats);
    assert.strictEqual(run('pendingEnemyCombatAttacks.length'), 0, 'thaw restarts a full warning');
}

{
    const {runtime:r, run, state, enemy, stats} = bossFixture('intro');
    r.performMonsterAttacks(stats);
    state.playerAilments = [{type:'freeze',time:2,power:1}];
    const start = r.getCombatTime(), before = {...state.gridPlayer};
    for (let tick = 1; tick <= 15; tick++) {
        state.combatTimeMs = start + tick * 100;
        run('updateCombatHazardEvasion(getPlayerStats())');
    }
    assert.strictEqual(state.gridPlayer.gx, before.gx, 'frozen players cannot escape');
    assert.strictEqual(state.gridPlayer.gy, before.gy);
    enemy.attackTimer = 1;
    r.performMonsterAttacks(stats);
    state.combatTimeMs += 500;
    r.performMonsterAttacks(stats);
    assert(state.playerHp < 10000, 'remaining in a warned cell deals actual damage');
}

{
    const {runtime:r, run, state, enemy} = bossFixture();
    for (const profile of Object.values(r.COMBAT_GRID_CONFIG.bossPatternProfiles)) {
        const area = r.getSkillStageFootprint('', {}, {aimCell:{gx:3,gy:4},gridProfile:profile}, enemy);
        r.areaAttack = {delivery:'patternArea',sourceCell:enemy,targetCell:{gx:3,gy:4},bossPattern:{area}};
        for (let gx = 0; gx < 9; gx++) for (let gy = 0; gy < 8; gy++) {
            state.gridPlayer = {gx,gy};
            const expected = area.cells.some(cell => cell.gx === gx && cell.gy === gy);
            assert.strictEqual(run('getEnemyCombatImpactTargets(areaAttack).includes(game.gridPlayer)'), expected,
                `${profile.kind} collision must match every displayed cell, including edges`);
        }
    }
}
for (const blockedBy of ['missing', 'cooldown', 'freeze', 'no-route']) {
    const {runtime:r, run, state, enemy, stats} = bossFixture();
    r.performMonsterAttacks(stats);
    if (blockedBy !== 'missing') wearMobilityGem(r, state);
    if (blockedBy === 'freeze') state.playerAilments = [{type:'freeze',time:2}];
    if (blockedBy === 'cooldown') r.mobilitySkill.restore({ runtime:null, cooldownUntil:r.getCombatTime() + 5000, lastStats:null });
    if (blockedBy === 'no-route') enemy.patternArea.cells = Array.from({length:72},(_,i)=>({gx:i%9,gy:Math.floor(i/9)}));
    const before = JSON.stringify([state.gridPlayer, state.playerHp, r.mobilitySkill.cooldownLeft()]);
    r.mobilitySkill.cast({ blocked:false, inRange:true, auto:false });
    run('updateCombatHazardEvasion(getPlayerStats())');
    assert.strictEqual(JSON.stringify([state.gridPlayer, state.playerHp, r.mobilitySkill.cooldownLeft()]), before,
        `${blockedBy}: failed or unavailable evasion cannot move or spend cooldown`);
}
console.log('smoke-boss-pattern-areas passed');
