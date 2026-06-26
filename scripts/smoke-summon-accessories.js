const fs = require('fs');
const assert = require('assert');

const talismanData = fs.readFileSync('data/passives.js', 'utf8');
const passives = fs.readFileSync('js/passives.js', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const combat = fs.readFileSync('js/combat.js', 'utf8');
const state = fs.readFileSync('js/state.js', 'utf8');
const utils = fs.readFileSync('js/utils.js', 'utf8');

const summonOptionIds = [
    'summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonHpPct',
    'summonCrit', 'summonCritDmg', 'summonEfficiency', 'summonResPen'
];
for (const statId of summonOptionIds) {
    assert(talismanData.includes(`{ stat: '${statId}'`), `talisman pool must include ${statId}`);
    assert(passives.includes(`{ id: '${statId}'`), `jewel pool must include ${statId}`);
}

assert(ui.includes("id:'ut_soul_shepherd'"), 'summon gem-level unique talisman must exist');
assert(ui.includes("stat:'summonGemLevel',value:2"), 'summon unique talisman must grant +2 summon attack gem levels');
assert(combat.includes("stat.id === 'summonGemLevel' && activeTags.includes('summon_attack')"), 'summon gem levels on jewels must target summon attack gems');
assert(utils.includes('summonGemLevel: 0'), 'stat buckets must retain summon gem levels');
assert(state.includes('소환수 생명력 등 방어적인 소환 옵션은 전이되지 않으며'), 'Lone Stand tooltip must disclose its defensive transfer restriction');

assert(passives.includes('const JEWEL_SUMMON_OPTION_GROUP'), 'jewel summon affixes must be represented by one roll-pool group');
assert(passives.includes('function rollRandomJewelStat(excludeIds)'), 'jewel rolls must resolve grouped summon options only after the summon group is selected');
assert(passives.includes('getJewelRollOptionPool(excludeIds)'), 'jewel option pool must collapse summon affixes before random selection');
assert(ui.includes('const TALISMAN_SUMMON_OPTION_GROUP'), 'talisman summon affixes must be represented by one roll-pool group');
assert(ui.includes('function rollTalismanOption()'), 'talisman rolls must resolve grouped summon options only after the summon group is selected');
assert(ui.includes('rollTalismanStatLine(multiplier)'), 'talisman candidate generation must use the grouped roll helper');

const sb5Block = combat.slice(combat.indexOf("if (hasKeystone('sb5')) {", combat.indexOf("game.ascendClass === 'soulbinder'")), combat.indexOf("if (hasKeystone('sb7'))", combat.indexOf("game.ascendClass === 'soulbinder'")));
assert(sb5Block.includes('sumFlat') && sb5Block.includes('sumPct') && sb5Block.includes('sumCrit') && sb5Block.includes('sumAspd'), 'Lone Stand must retain offensive summon transfers');
assert(!sb5Block.includes('sumHp'), 'Lone Stand must not transfer summon life to the player');
assert(!sb5Block.includes('finalMaxHp'), 'Lone Stand must not modify player maximum life');

console.log('Summon accessory and Lone Stand smoke checks passed.');
