// 이동 스킬 칸 (js/mobility-skill.js) and the movement gems 54~57 (js/skill-gem-casts.js, 스킬 변경분 2): the slot's save
// shape and equipping, when it casts, that the main gem's casts are untouched, and where each movement gem lands.
const assert = require('node:assert/strict');
const { runtime: r, run } = require('./lib/replay-fixture')(54);
const json = code => JSON.parse(run('JSON.stringify(' + code + ')'));
run(`Math.random=()=>.5;
 game.skills=Object.keys(SKILL_DB).filter(n=>SKILL_DB[n].isGem);
 for(const name of game.skills)game.gemData[name]={level:1,quality:0,exp:0};`);

// ---------------------------------------------------------------- which gems, and the save
assert.deepEqual(json('Object.keys(SKILL_DB).filter(mobilitySkill.isMobilityGem)').sort(),
    ['공중강타', '그림자 점멸', '방패 돌진', '암살', '작살화살', '차원찢기', '향로구름'].sort(), 'every gem tagged mobility, and only those');
function merged(save) {
    r.saveIn = save;
    return json('(()=>{const m=mergeDefaults(saveIn),again=mergeDefaults(JSON.parse(serializeSaveState(m)));return {main:m.activeSkill,move:m.mobilitySkill,target:m.gemEnhanceTargetSkill,again:[again.activeSkill,again.mobilitySkill]};})()');
}
const moved = merged({ level: 30, skills: ['연속 베기', '암살'], gemData: {}, activeSkill: '암살' });
assert.deepEqual([moved.main, moved.move], ['기본 공격', '암살'], 'a mobility gem worn as the main gem moves to its own slot');
assert.deepEqual(moved.again, ['기본 공격', '암살'], 'and stays there across a save round trip');
assert.equal(moved.target, '암살', 'the enhance screen may open on the worn mobility gem');
assert.equal(merged({ level: 30, skills: ['연속 베기'], gemData: {}, activeSkill: '연속 베기', mobilitySkill: '암살' }).move, '', 'an unowned gem is not worn');
assert.equal(merged({ level: 30, skills: ['연속 베기'], gemData: {}, activeSkill: '연속 베기', mobilitySkill: '연속 베기' }).move, '', 'nor an attack gem');
assert.equal(merged({ level: 30, skills: ['연속 베기'], gemData: {}, activeSkill: '연속 베기', mobilitySkill: 7 }).move, '', 'nor garbage');
assert.equal(merged({ level: 30, skills: ['연속 베기'], gemData: {}, activeSkill: '연속 베기' }).move, '', 'old saves start with an empty slot');

// ---------------------------------------------------------------- equipping
run("changeSkill('연속 베기');changeSkill('그림자 점멸');");
assert.deepEqual(json('[game.activeSkill,game.mobilitySkill]'), ['연속 베기', '그림자 점멸'], 'a mobility gem goes into its own slot; the main gem stays');
run("changeSkill('그림자 점멸');");
assert.equal(json('game.mobilitySkill'), '', 'choosing the worn one again takes it off');

// ---------------------------------------------------------------- casting from the slot
function arena(mobility, enemies, hero = { gx: 3, gy: 4 }, main = '연속 베기') {
    Object.assign(r, { arenaMobility: mobility, arenaEnemies: enemies, arenaHero: hero, arenaMain: main });
    run(`game.activeSkill=arenaMain;game.mobilitySkill=arenaMobility;resetCombatTacticsRuntime();resetCombatChannelRuntime();
      game.gridPlayer={...arenaHero,gridMoveTimer:0};game.combatTimeMs=100000;game.combatHalted=false;game.playerHp=10000;
      game.playerAilments=[];game.playerCastDelayUntil=0;game.queenBees=[];
      game.enemies=arenaEnemies.map((e,i)=>Object.assign(createEnemy(getZone(1),{at:0},0),
        {id:9100+i,hp:1e7,maxHp:1e7,energyShield:0,evasion:0,evasionChance:0,facingDirection:4,...e}));`);
}
/** The slot decides and its casts move on; the main gem's reach gates it like in the combat loop. */
function play(ms, inRange) {
    let casts = 0;
    for (let t = 0; t <= ms; t += 50) {
        r.tickMs = t; r.forceRange = inRange;
        run('game.combatTimeMs=100000+tickMs;globalThis.mainStats=getPlayerStats(false);advanceSkillGemCasts(mainStats);');
        casts += run('mobilitySkill.cast({blocked:false,inRange:forceRange ?? getSkillTargets(mainStats).length>0})') ? 1 : 0;
    }
    return { casts, hero: json('[game.gridPlayer.gx,game.gridPlayer.gy]'), hurt: json('game.enemies.map(e=>e.hp<e.maxHp)') };
}
arena('향로구름', [{ gx: 6, gy: 4 }]);
let result = play(1500);
assert.deepEqual(result.hero, [5, 4], '향로구름: out of the main gem\'s reach, the caster puffs to the target\'s side nearest it');
assert.deepEqual(result.hurt, [false], '향로구름 deals no damage');
assert.equal(result.casts, 1, 'then waits out its cooldown');
assert.ok(run('mobilitySkill.cooldownLeft()') > 0);

arena('차원찢기', [{ gx: 6, gy: 4 }]);
result = play(1500);
assert.deepEqual(result.hero, [5, 4], '차원찢기: out of the second tear, next to the target on the way back');
assert.deepEqual(result.hurt, [true], 'the closing tears hurt the enemies around the exit');

arena('작살화살', [{ gx: 7, gy: 4 }]);
result = play(1500);
assert.deepEqual([result.hero, result.hurt], [[6, 4], [true]], '작살화살: the harpoon bites and the rope pulls the archer in front of the target');
arena('작살화살', [{ gx: 4, gy: 4 }]);
result = play(1500, false);
assert.deepEqual([result.hero, result.hurt], [[3, 4], [true]], 'already beside it: a strike, no pull');

arena('공중강타', [{ gx: 6, gy: 4 }]);
result = play(1500);
assert.deepEqual([result.hero, result.hurt], [[5, 4], [true]], '공중강타: lands in front of the target and slams the cells around');
arena('공중강타', [{ gx: 8, gy: 4 }]);
result = play(800);
assert.deepEqual([result.casts, result.hero], [0, [3, 4]], 'out of its 3-cell reach nothing happens');

const ring = [[5, 3], [5, 4], [5, 5], [6, 3], [6, 5], [7, 3], [7, 4], [7, 5]].map(([gx, gy]) => ({ gx, gy }));
arena('향로구름', [{ gx: 6, gy: 4 }, ...ring], { gx: 2, gy: 4 });
result = play(800, false);
assert.deepEqual(result.hero, [4, 4], 'an enemy with no free cell around it is passed over for the nearest one with a free side');

arena('향로구름', [{ gx: 4, gy: 4 }]);
result = play(800);
assert.deepEqual([result.casts, result.hero], [0, [3, 4]], 'the main gem already reaches an enemy: no gap to close');

// ---------------------------------------------------------------- the main gem's casts in flight are untouched
arena('암살', [{ gx: 6, gy: 4, facingDirection: 4 }], { gx: 3, gy: 4 }, '탄성 플라스크');
run('globalThis.mainStats=getPlayerStats(false);performPlayerAttack(mainStats);');
assert.ok(run('mobilitySkill.cast({blocked:false,inRange:false})'), 'the mobility gem casts beside the main gem');
assert.ok(run('skillGemCombatRuntime.casts.some(c=>c.id===44)'), 'the main gem\'s flask is still in flight');
assert.ok(run('mobilitySkill.castState().casts.some(c=>c.id===52)'), 'and the assassination runs in the slot\'s own cast state');
assert.equal(run('game.activeSkill'), '탄성 플라스크', 'the main gem is back in its slot after the cast');

// ---------------------------------------------------------------- while the caster is mid-move it neither walks nor attacks
arena('공중강타', [{ gx: 6, gy: 4 }]);
run('mobilitySkill.cast({blocked:false,inRange:false});');
assert.ok(run('mobilitySkill.moving()'), 'a leap is a move in progress');
assert.equal(run('updatePlayerGridEngagement(getPlayerStats(false),{})'), false, 'so the engagement holds');

// ---------------------------------------------------------------- an enemy walks onto the landing mid-move
arena('공중강타', [{ gx: 6, gy: 4 }]);
run('mobilitySkill.cast({blocked:false,inRange:false});game.enemies.push(Object.assign(createEnemy(getZone(1),{at:0},0),{id:9199,gx:5,gy:4,hp:1e7,maxHp:1e7,energyShield:0,evasion:0,evasionChance:0}));');
result = play(1200, false);
assert.deepEqual(result.hero, [4, 4], 'the leap comes down beside the cell that got taken, nearest the caster');
assert.deepEqual(result.hurt, [false, true], 'and slams the cells around where it really landed');

// ---------------------------------------------------------------- replay isolation
arena('차원찢기', [{ gx: 6, gy: 4 }]);
run('mobilitySkill.cast({blocked:false,inRange:false});globalThis.online=JSON.stringify(mobilitySkill.capture());globalThis.sim=createCombatReplay(2000,game,getCombatTime());advanceCombatReplay(sim,1000);');
assert.equal(run('JSON.stringify(mobilitySkill.capture())'), run('online'), 'an offline replay cannot move the online mobility cast');
console.log('mobility skill slot: save, equipping, gap closing, 54~57 landings, isolation ok');
