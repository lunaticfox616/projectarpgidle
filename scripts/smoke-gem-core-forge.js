const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game=mergeDefaults({});game.season=10;contentProgression.sync();
    game.contentProgression.inherited=['craft','gemForge'];contentProgression.sync();
    game.skills=['연속 베기','서리 폭발','서리늑대 소환'];game.activeSkill='연속 베기';
    game.gemData['연속 베기']=normalizeGemRecord({level:14,quality:10});
    game.currencies.bossCore=100;game.currencies.skyEssence=100;`);
// Errors must not consume material, create records, or mutate the enhancement target.
for (const [name, key] of [['기본 공격','bossCore'], ['서리 폭발','bossCore'], ['연속 베기','invalid'], ['연속 베기','__proto__']]) {
    const before = json('[game.gemData,game.currencies,game.gemEnhanceTargetSkill]');
    assert.equal(run(`gemCoreForge.attempt('${name}','${key}').status`), 'blocked');
    assert.deepEqual(json('[game.gemData,game.currencies,game.gemEnhanceTargetSkill]'), before);
}
run('game.currencies.bossCore=0');
assert.equal(run("gemCoreForge.attempt('연속 베기','bossCore').error"), '재료 부족');
assert.equal(run("game.gemData['연속 베기'].bossCoreFailures"), 0);
run('game.currencies.bossCore=100');
run('game.season=1');
assert.equal(run("gemCoreForge.attempt('연속 베기','bossCore').status"), 'blocked');
assert.equal(run('game.currencies.bossCore'),100);
run('game.season=10');
const normalRandom = runtime.Math;
runtime.Math = Object.create(Math);
runtime.Math.random = () => 0.999999;
assert.equal(run("gemCoreForge.attempt('연속 베기','bossCore').status"), 'success');
assert.deepEqual(json("[game.gemData['연속 베기'].level,game.gemData['연속 베기'].quality,game.currencies.bossCore]"), [14,10,99]);
run("game.gemData['연속 베기'].bossCoreLevel=4");
const chances = [10,20,29.6,38.6,46.8,54,60,65,70,75,80,85,90,95,100];
for (let failure = 0; failure < chances.length - 1; failure++) {
    const chance = chances[failure], next = chances[failure + 1];
    assert.equal(run("gemCoreForge.inspect('연속 베기','bossCore').chance"), chance);
    assert.equal(run("gemCoreForge.attempt('연속 베기','bossCore').status"), 'failure');
    assert.equal(run("game.gemData['연속 베기'].bossCoreLevel"), 4);
    // Save restoration preserves per-track pity; repeated normalization never adds a failure.
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    assert.equal(run("gemCoreForge.inspect('연속 베기','bossCore').chance"), next);
    assert.equal(run("game.gemData['연속 베기'].skyCoreFailures"), 0);
}
assert.equal(run("gemCoreForge.attempt('연속 베기','bossCore').status"), 'success');
assert.deepEqual(json("[game.gemData['연속 베기'].bossCoreLevel,game.gemData['연속 베기'].bossCoreFailures,game.currencies.bossCore]"), [5,0,24]);
assert.equal(run("gemCoreForge.attempt('연속 베기','bossCore').status"), 'blocked');
assert.equal(run('game.currencies.bossCore'), 24);
assert.equal(run("gemCoreForge.attempt('연속 베기','skyEssence').status"), 'success');
assert.equal(run('game.currencies.skyEssence'), 99);
runtime.Math = normalRandom;
assert.deepEqual(json('gemCoreForge.effects(normalizeGemRecord({bossCoreLevel:5,skyCoreLevel:5}))'), {damage:1.2,speed:1.1,levels:2});
assert.deepEqual(json('[normalizeGemRecord({bossCoreFailures:Infinity}).bossCoreFailures,normalizeGemRecord({skyCoreFailures:-1}).skyCoreFailures]'), [0,0]);
// Compare actual skill values and presentation without changing base level, gear or quality.
for (const name of ['연속 베기','서리 폭발']) {
    run(`game.activeSkill='${name}';game.gemData['${name}']=normalizeGemRecord({level:14});`);
    const base = json('getActiveSkillStats(0)');
    run(`Object.assign(game.gemData['${name}'],{bossCoreLevel:3,skyCoreLevel:2});`);
    const enhanced = json('getActiveSkillStats(0)');
    assert.equal(enhanced.finalLevel, base.finalLevel);
    assert(Math.abs(enhanced.dmg / base.dmg - 1.12) < 1e-8);
    assert(Math.abs(enhanced.spd / base.spd - 1.04) < 1e-8);
    const presentation = json(`getGemPresentation('${name}',false,{gemBonusSources:{total:0}})`);
    assert.equal(presentation.skill.dmg, enhanced.dmg);
    assert.equal(presentation.skill.spd, enhanced.spd);
    run(`Object.assign(game.gemData['${name}'],{bossCoreLevel:5,skyCoreLevel:5});`);
    assert.equal(run('getActiveSkillStats(0).finalLevel'), base.finalLevel+2);
}
run(`game.gemData['서리늑대 소환']=normalizeGemRecord({level:14});
    game.equippedSummonSkills=['서리늑대 소환'];
    var summonStats={summonPctDmg:0,summonEfficiency:0,finalDamageMultiplier:1};
    var summon=buildSummonRuntimeStats({name:'서리늑대 소환',source:'skill'},summonStats,0);
    var hitOptions={rollOverridePct:100,forceCrit:false};`);
const baseHit = run('getSummonHitDamageInfo(summon,summonStats,null,hitOptions).damage');
const baseInterval = run('getSummonAttackIntervalMs(summonStats,summon)');
run("Object.assign(game.gemData['서리늑대 소환'],{bossCoreLevel:4,skyCoreLevel:4})");
const upgradedHit = run('getSummonHitDamageInfo(summon,summonStats,null,hitOptions).damage');
assert(Math.abs(upgradedHit/baseHit-1.16)<0.01);
assert.equal(run('getSummonAttackIntervalMs(summonStats,summon)'),Math.floor(1000/(1.35*1.08)));
assert(run('getSummonAttackIntervalMs(summonStats,summon)')<baseInterval);
run("Object.assign(game.gemData['서리늑대 소환'],{bossCoreLevel:5,skyCoreLevel:5})");
assert.equal(run("getSummonGemLevel('서리늑대 소환','skill',summonStats)"),16);
run("game.talentCards={'hero3__soulbinder':{level:10,score:600,count:1}};game.talentCardLoadout=['hero3__soulbinder',null,null,null,null,null];summonStats.aspd=2");
assert.equal(run('getSummonAttackIntervalMs(summonStats,summon)'),Math.floor(1000/(2*1.1)), 'shared player attack speed still benefits from sky enhancement');
console.log('smoke-gem-core-forge passed');
