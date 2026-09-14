const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const close = (actual, expected, label) => assert(Math.abs(actual - expected) < 1e-7, `${label}: ${actual} / ${expected}`);
const steps = level => level <= 19 ? level - 1 : 18 + (level - 19) * 1.1;
run('game=mergeDefaults({});game.season=10;game.equipment={};game.passives=[];game.actRewardBonuses=[];');

// Every skill uses the same growth boundary, including levels supplied by equipment.
const skills = json('Object.entries(SKILL_DB).filter(([,skill])=>skill.isGem)');
for (const [name, db] of skills) {
    for (const level of [1, 19, 20, 21, 30, 40]) {
        run(`game.gemData[${JSON.stringify(name)}]=normalizeGemRecord({level:${Math.min(20, level)}});
            game.actRewardBonuses=[{stat:'gemLevel',value:${Math.max(0, level-20)}}];`);
        const info = json(`getGemPresentation(${JSON.stringify(name)},false,{gemBonusSources:{total:0}})`);
        assert.equal(info.finalLevel, level, 'displayed level stays integer and is not inflated by the value buff');
        close(info.skill.dmg, db.baseDmg + steps(level) * db.dmgScale, `${name} Lv.${level} damage preview`);
        close(info.skill.spd, db.baseSpd + steps(level) * db.spdScale, `${name} Lv.${level} speed preview`);
        if (db.tags.includes('spell')) {
            const oldFlat = value => (db.spellFlatBase || 0) * (3 + .8 * Math.log2(value) ** 2) + (value-1)*(db.spellFlatScale || 0);
            const expected = oldFlat(level) + (level >= 20 ? (oldFlat(level)-oldFlat(19))*.1 : 0);
            close(run(`getGemSpellBaseDamage(SKILL_DB[${JSON.stringify(name)}],${level})`), expected, `${name} spell curve`);
        }
        if (db.requiresShield || db.tags.includes('summon_attack')) continue;
        run(`game.activeSkill=${JSON.stringify(name)}`);
        const actual = json(`getActiveSkillStats(${Math.max(0,level-20)})`);
        close(actual.dmg, info.skill.dmg, `${name} damage calculation matches preview`);
        const speed = name === '연속 베기' && level >= 20 ? info.skill.spd * 1.2 : info.skill.spd;
        close(actual.spd, speed, `${name} speed calculation keeps its existing level-20 perk`);
    }
}

// Normal and own-stat support gems retain tier strength and fixed effects (scale=0).
const supports = json('Object.entries(SUPPORT_GEM_DB)');
for (const [name, db] of supports) {
    for (const level of [1, 19, 20, 30]) {
        run(`game.supportGemData[${JSON.stringify(name)}]=normalizeGemRecord({level:${Math.min(20,level)}});
            game.actRewardBonuses=[{stat:'gemLevel',value:${Math.max(0,level-20)}}];`);
        const bases = db.scaleWithOwnStat ? {[db.scaleWithOwnStat]:100} : {};
        const info = json(`getGemPresentation(${JSON.stringify(name)},true,{supportScaleBases:${JSON.stringify(bases)}})`);
        const tier = run(`getSupportTierMultiplier(${JSON.stringify(name)},1)`);
        close(info.value, (db.baseVal + steps(level)*db.scale)*tier, `${name} support value`);
    }
}

// Preserve the summon curve itself: only growth beyond Lv.19 gains 10%, before rounding.
for (const name of ['서리늑대 소환', '수액 골렘 소환']) {
    const profile = json(`getSummonProfile(${JSON.stringify(name)})`);
    const growth = level => run(`getSummonLevelGrowthSteps(getSummonProfile(${JSON.stringify(name)}),${level})`);
    for (const level of [1,19,20,21,30,31,40]) {
        const anchor = growth(19), current = growth(level);
        const enhanced = current + Math.max(0,current-anchor)*.1;
        const expected = Math.floor(profile.baseDamage * (1+enhanced*profile.dmgPerLevelPct)+123);
        assert.equal(run(`getSummonScaledBaseDamage(getSummonProfile(${JSON.stringify(name)}),${level},{summonFlatDmg:123})`), expected,
            'summon flat equipment damage must not receive the gem growth buff');
        const hp = value => Math.pow(growth(value), profile.hpScaleExp)*profile.hpScaleBase;
        const expectedHp = Math.floor(profile.baseHp*(1+hp(level)+Math.max(0,hp(level)-hp(19))*.1));
        assert.equal(run(`getSummonMaxHp(getSummonProfile(${JSON.stringify(name)}),${level},{})`), expectedHp);
    }
}
const summonDmg = level => run(`getSummonScaledBaseDamage(getSummonProfile('서리늑대 소환'),${level},{})`);
assert(summonDmg(31)-summonDmg(30) > summonDmg(21)-summonDmg(20), 'late summon acceleration remains stronger');

// Validate the real stat buckets, not only the tooltip path, including delayed cap growth.
run(`game=mergeDefaults({});game.season=10;contentProgression.sync();
    game.contentProgression.inherited=['craft','support'];contentProgression.sync();
    game.level=80;game.activeSkill='연속 베기';game.skills=['연속 베기'];
    game.actRewardBonuses=[{stat:'gemLevel',value:10}];
    game.supports=['무자비','카오스 잠식'];game.equippedSupports=['무자비','카오스 잠식'];
    game.supportGemData={'무자비':normalizeGemRecord({level:20}),'카오스 잠식':normalizeGemRecord({level:20})};
    var withSupport=getPlayerStats(false);game.equippedSupports=[];var withoutSupport=getPlayerStats(false);`);
assert.equal(run('withSupport.chaosErosionCap'),31, 'Lv.21-30 each add 1.1 to the cap');
assert(run('withSupport.critDmg') > run('withoutSupport.critDmg'), 'support growth enters actual combat stats');

// Both materials share all five starting probabilities and preserve independent pity.
run(`game.contentProgression.inherited=['craft','gemForge'];contentProgression.sync();game.activeSkill='연속 베기';
    game.skills=['연속 베기'];game.currencies.bossCore=100;game.currencies.skyEssence=100;`);
for (const material of ['bossCore','skyEssence']) {
    const key = material === 'bossCore' ? 'bossCoreLevel' : 'skyCoreLevel';
    for (const [stage,chance] of [100,60,40,20,10].entries()) {
        run(`game.gemData['연속 베기']=normalizeGemRecord({${key}:${stage}})`);
        assert.equal(run(`gemCoreForge.inspect('연속 베기','${material}').chance`),chance);
    }
}
console.log(`smoke-gem-level-value passed (${skills.length} skills, ${supports.length} supports)`);
