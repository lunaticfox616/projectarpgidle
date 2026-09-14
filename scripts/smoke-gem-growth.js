const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

for (let level = 1; level <= 13; level++) {
    assert.equal(run(`getGemReqExp(${level})`), Math.floor(100 * 1.3 ** (level - 1)), 'reaching level 14 keeps the existing requirements');
}
let previousIncrease = 0;
for (let level = 14; level <= 19; level++) {
    const increase = run(`getGemReqExp(${level}) - getGemReqExp(${level - 1})`);
    assert.ok(increase > previousIncrease, 'each of the final six levels requires a larger investment');
    previousIncrease = increase;
}
run('var gem=normalizeGemRecord({level:1,exp:90,quality:12,awakened:true})');
assert.equal(run('gainGemExperience(gem,1000)'), 5);
assert.deepEqual(json('({level:gem.level,exp:gem.exp,quality:gem.quality,awakened:gem.awakened})'),
    {level:6,exp:187,quality:12,awakened:true}, 'all earned XP is retained across multiple levels');
const previous = run('JSON.stringify(gem)');
assert.equal(run('gainGemExperience(gem,0)'), 0);
assert.equal(run('gainGemExperience(gem,-1)'), 0);
assert.equal(run('JSON.stringify(gem)'), previous, 'nonpositive rewards do not change the gem');
run('gem=normalizeGemRecord({level:19,exp:getGemReqExp(19)-1,quality:20})');
assert.equal(run('gainGemExperience(gem,1)'), 1);
assert.deepEqual(json('({level:gem.level,exp:gem.exp,quality:gem.quality})'), {level:20,exp:0,quality:20});
assert.equal(run('gainGemExperience(gem,100000000)'), 0, 'max level does not accumulate or overlevel');

run(`game=JSON.parse(JSON.stringify(defaultGame));game.currentZoneId=1;game.level=100;
    game.skills=['기본 공격','연속 베기','서리늑대 소환'];game.activeSkill='연속 베기';
    game.equippedSummonSkills=['서리늑대 소환'];game.summonSkillCounts={'서리늑대 소환':1};
    var support=Object.keys(SUPPORT_GEM_DB)[0];game.supports=[support];game.equippedSupports=[support];
    game.gemData['연속 베기']=normalizeGemRecord({level:14,quality:7});
    game.gemData['서리늑대 소환']=normalizeGemRecord({level:14,quality:8});
    game.supportGemData[support]=normalizeGemRecord({level:14,quality:9});
    var stats=getPlayerStats(false), reward=getEnemyExperienceReward({level:100},stats), gemReward=Math.floor(reward*.45);
    var currentGems=()=>[game.gemData['연속 베기'],game.gemData['서리늑대 소환'],game.supportGemData[support]];
    var records=currentGems();
    records.forEach(record=>{record.exp=getGemReqExp(14)-gemReward-1;});
    grantExpAndGem({level:100},stats);records=currentGems();`);
assert.deepEqual(json('records.map(record=>[record.level,record.exp])'), [[14,9999],[14,9999],[14,9999]],
    'attack, summon and support gems share the exact threshold');
run('records.forEach(record=>{record.exp=getGemReqExp(14)-gemReward+7;});grantExpAndGem({level:100},stats);records=currentGems()');
assert.deepEqual(json('records.map(record=>[record.level,record.exp])'), [[15,7],[15,7],[15,7]],
    'combat does not discard overflow in any gem category');
assert.deepEqual(json('records.map(record=>record.quality)'), [7,8,9]);
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json("[game.gemData['연속 베기'],game.gemData['서리늑대 소환'],game.supportGemData[support]].map(record=>[record.level,record.exp])"),
    [[15,7],[15,7],[15,7]], 'save restoration preserves earned gem levels and XP');
console.log('smoke-gem-growth passed');
