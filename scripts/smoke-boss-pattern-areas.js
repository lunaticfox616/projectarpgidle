const assert = require('assert');
const {prepare} = require('./audit-combat-20260905');

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
    state.season = 2;
    state.conditionGemUnlocked = true;
    state.conditionGemPool = ['긴급 회피'];
    state.skillAutoRules = [{enabled:true,priority:1,triggerType:'boss_warning',actionType:'condition_gem',skillName:'긴급 회피'}];
    r.runConditionGemAutoRules(stats);
    assert(!area.cells.some(cell => cell.gx === state.gridPlayer.gx && cell.gy === state.gridPlayer.gy),
        'the equipped condition gem must move outside the warned area');
    assert(state.conditionGemCooldowns['긴급 회피'] > r.getCombatTime(), 'successful escape starts cooldown');
    assert.strictEqual(state.playerHp, 10000, 'movement changes no health');
    assert(!state.playerConditionBuffs.some(buff => buff.name === '긴급 회피'), 'escape grants no invisible immunity buff');
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
for (const blockedBy of ['missing', 'disabled', 'cooldown', 'freeze', 'no-route']) {
    const {runtime:r, run, state, enemy, stats} = bossFixture();
    r.performMonsterAttacks(stats);
    state.season = 2; state.conditionGemUnlocked = true;
    state.conditionGemPool = blockedBy === 'missing' ? [] : ['긴급 회피'];
    state.conditionGemCooldowns = {};
    state.skillAutoRules = [{enabled:blockedBy !== 'disabled',priority:1,triggerType:'boss_warning',actionType:'condition_gem',skillName:'긴급 회피'}];
    if (blockedBy === 'freeze') state.playerAilments = [{type:'freeze',time:2}];
    if (blockedBy === 'cooldown') state.conditionGemCooldowns['긴급 회피'] = r.getCombatTime() + 5000;
    if (blockedBy === 'no-route') enemy.patternArea.cells = Array.from({length:72},(_,i)=>({gx:i%9,gy:Math.floor(i/9)}));
    const before = JSON.stringify([state.gridPlayer,state.playerHp,state.conditionGemCooldowns]);
    r.runConditionGemAutoRules(stats);
    run('updateCombatHazardEvasion(getPlayerStats())');
    assert.strictEqual(JSON.stringify([state.gridPlayer,state.playerHp,state.conditionGemCooldowns]), before,
        `${blockedBy}: failed or unavailable evasion cannot move or spend cooldown`);
}
console.log('smoke-boss-pattern-areas passed');
