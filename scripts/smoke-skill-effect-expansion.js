// 효과 확장 +N (스킬 변경분 2 · js/skill-effect-expansion.js): which gems grow what, grids and authored stages, the keystone's
// damage cost, native gem numbers — and that +0 leaves every gem exactly as it was.
const assert = require('node:assert/strict');
const { runtime: r, run } = require('./lib/replay-fixture')(53);
const json = code => JSON.parse(run('JSON.stringify(' + code + ')'));
run(`game.skills=Object.keys(SKILL_DB).filter(n=>SKILL_DB[n].isGem);
 for(const name of game.skills)game.gemData[name]={level:1,quality:0,exp:0};
 game.gridPlayer={gx:3,gy:4,gridMoveTimer:0};`);

// ---------------------------------------------------------------- the table covers every numbered gem
const table = json('SKILL_EFFECT_EXPANSION');
for (const name of [...Object.keys(table.kinds), ...table.excluded]) assert.ok(json(`!!SKILL_DB[${JSON.stringify(name)}]?.isGem`), `${name} is a gem`);
for (const name of json('Object.keys(SKILL_FX_ATLAS).filter(n=>SKILL_DB[n]?.isGem)')) {
    assert.ok(table.kinds[name] || table.excluded.includes(name), `${name} has an expansion rule (or is excluded)`);
}
assert.deepEqual(table.excluded, ['광창 강림', '시간 가속', '과냉각 혼합물', '인과'], 'radius 3+ gems are left out');

// ---------------------------------------------------------------- the resolved skill and its grid
function resolved(name, level) {
    r.gemName = name; r.expandLevel = level;
    return json(`(()=>{skillEffectExpansion.setTestLevel(expandLevel);game.activeSkill=gemName;
        const s=getPlayerStats().sSkill,g=getSkillGridProfile(gemName,s);
        return {n:s.effectExpansion,targets:s.targets,dmg:s.dmg,range:g.range,radius:g.radius,row:g===SKILL_GRID_DB[gemName]};})()`);
}
const blast0 = resolved('서리 폭발', 0), blast1 = resolved('서리 폭발', 1), blast2 = resolved('서리 폭발', 2);
assert.equal(blast0.row, true, '+0 hands back the table row itself');
assert.deepEqual([blast1.radius, blast1.range], [3, 5], 'area gem +1: radius 2→3, cast range kept');
assert.equal(blast2.radius, 4);
assert.ok(Math.abs(blast2.dmg / blast0.dmg - 0.7) < 1e-9, '+2 (keystone) costs the skill 30% damage');
assert.equal(blast1.dmg, blast0.dmg, '+1 is free');
assert.equal(json('SKILL_GRID_DB["서리 폭발"].radius'), 2, 'the table row is never changed');
const whirl = resolved('회오리바람', 1);
assert.deepEqual([whirl.radius, whirl.range], [2, 2], 'an area around the caster reaches as far as it grew');
assert.equal(resolved('용암 강타', 1).range, 3, 'cone +1: one cell longer');
assert.equal(resolved('얼음 창', 2).range, 9, 'line +2: two cells further');
const cleave0 = resolved('연속 베기', 0), cleave1 = resolved('연속 베기', 1);
assert.equal(cleave1.targets, cleave0.targets + 1, 'target gem +1: one more target');
const cold0 = resolved('과냉각 혼합물', 0), cold2 = resolved('과냉각 혼합물', 2);
assert.deepEqual([cold2.n, cold2.radius, cold2.dmg], [0, cold0.radius, cold0.dmg], 'excluded gems neither grow nor pay the cost');

// ---------------------------------------------------------------- authored stages grow with their own sizes
function stageRadii(name, level) {
    r.gemName = name; r.expandLevel = level;
    return json(`(()=>{skillEffectExpansion.setTestLevel(expandLevel);game.activeSkill=gemName;
        game.enemies=[Object.assign(createEnemy(getZone(1),{at:0},0),{id:7001,gx:4,gy:4,hp:1e7,maxHp:1e7})];
        const s=getPlayerStats().sSkill;
        return buildSkillHitSequence(gemName,s,[{enemy:game.enemies[0],mult:1}]).map(st=>st.gridProfile.radius);})()`);
}
assert.deepEqual(stageRadii('혈기 폭쇄', 0), [0, 1]);
assert.deepEqual(stageRadii('혈기 폭쇄', 1), [0, 2], 'the first (one-cell) hit stays on its cell, the burst grows');
assert.deepEqual(stageRadii('중력 붕괴', 1), [3, 2], 'both pull and crush grow');

// ---------------------------------------------------------------- native gems grow their own numbers
const at = (gx, gy) => ({ gx, gy });
r.expandSource = at(3, 4);
function nativeTargets(id, enemies, extra) {
    r.expandEnemies = enemies.map((e, i) => ({ id: 7100 + i, hp: 10, maxHp: 10, ...e }));
    r.expandId = id; r.expandExtra = extra;
    return json('skillGemCasts.targets(expandId,expandSource,expandEnemies,expandExtra).map(e=>e.id)').length;
}
assert.equal(nativeTargets(50, [at(5, 4)], 0), 0);
assert.equal(nativeTargets(50, [at(5, 4)], 1), 1, '신성한 안개 +1 reaches the second ring');
assert.equal(nativeTargets(52, [{ ...at(8, 4), facingDirection: 4 }], 0), 0);
assert.equal(nativeTargets(52, [{ ...at(8, 4), facingDirection: 4 }], 1), 1, '암살 +1 reaches 5 cells');
assert.equal(nativeTargets(51, [at(5, 6)], 0), 0);
assert.equal(nativeTargets(51, [at(5, 6)], 1), 1, '파문심판 +1: the cross arms reach 2 cells');
assert.equal(nativeTargets(51, [at(6, 5)], 1), 0, 'and it stays a cross, not a diamond');
function bounces(level) {
    r.expandLevel = level;
    run(`skillEffectExpansion.setTestLevel(expandLevel);game.activeSkill='탄성 플라스크';resetCombatTacticsRuntime();resetCombatChannelRuntime();
      game.gridPlayer={gx:3,gy:4,gridMoveTimer:0};game.combatTimeMs=100000;game.combatHalted=false;game.playerHp=10000;game.queenBees=[];
      game.enemies=[Object.assign(createEnemy(getZone(1),{at:0},0),{id:9001,gx:5,gy:4,hp:1e7,maxHp:1e7,energyShield:0,evasion:0,evasionChance:0})];
      globalThis.castStats=getPlayerStats();performPlayerAttack(castStats);`);
    let hits = 0, hp = 1e7;
    for (let ms = 0; ms <= 4000; ms += 20) {
        r.tickMs = ms;
        run('game.combatTimeMs=100000+tickMs;updateSkillGemCombat(castStats);');
        const now = run('game.enemies[0].hp');
        if (now < hp) hits++;
        hp = now;
    }
    return hits;
}
assert.equal(bounces(0), 4, '탄성 플라스크 lands 4 times');
assert.equal(bounces(1), 5, 'and once more per +1');
run('skillEffectExpansion.setTestLevel(0);');
console.log('skill effect expansion: table, grids, authored stages, keystone cost and native gems ok');
