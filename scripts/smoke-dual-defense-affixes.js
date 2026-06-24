// Regression: dual-defense armor bases should roll defense affixes for both
// base defense types at about 60% of the single-line value.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const stateSrc = fs.readFileSync('js/state.js', 'utf8');
const modDbMatch = stateSrc.match(/const MOD_DB = \[[\s\S]*?\n\];/);
assert(modDbMatch, 'MOD_DB must be found in state.js');

const passSrc = fs.readFileSync('js/passives.js', 'utf8');
function extractFn(name) {
    const start = passSrc.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must be found`);
    let depth = 0;
    let seen = false;
    for (let i = start; i < passSrc.length; i++) {
        if (passSrc[i] === '{') { depth++; seen = true; }
        if (passSrc[i] === '}') depth--;
        if (seen && depth === 0) return passSrc.slice(start, i + 1);
    }
    throw new Error(`${name} body must close`);
}
const constStart = passSrc.indexOf('const DEFENSE_TYPE_PCT_STAT');
const constEnd = passSrc.indexOf('function getItemBaseDefenseTypes');
assert(constStart >= 0 && constEnd > constStart, 'dual defense constants must be near helpers');

const ctx = {
    Math,
    Number,
    Array,
    Set,
    getStatName: id => id,
    clampNumber: (v, lo, hi) => Math.max(lo, Math.min(hi, v))
};
vm.createContext(ctx);
vm.runInContext(
    `${modDbMatch[0]}\nthis.MOD_DB = MOD_DB;\n` +
    `${passSrc.slice(constStart, constEnd)}\n` +
    `${extractFn('getItemBaseDefenseTypes')}\n` +
    `${extractFn('getPrimaryBaseDefenseType')}\n` +
    `${extractFn('getDefenseTypeForAffixStat')}\n` +
    `${extractFn('isPrimaryDualDefenseAffixMod')}\n` +
    `${extractFn('scaleDefenseCompoundStat')}\n` +
    `${extractFn('makeDualDefenseAffixMod')}\n` +
    `${extractFn('isDefenseTypeStatAllowed')}\n` +
    `${extractFn('getImmutableItemSpecialStats')}\n` +
    `${extractFn('getItemOccupiedExplicitModIds')}\n` +
    `${extractFn('getAvailableMods')}\n` +
    `${extractFn('rollTierValueAffix')}\n` +
    `${extractFn('rollCompoundExtraStats')}\n` +
    `${extractFn('rollAffixValue')}\n` +
    `this.getAvailableMods = getAvailableMods; this.rollAffixValue = rollAffixValue;`,
    ctx
);

const dualItem = { slot: '갑옷', rarity: 'rare', baseStats: [{ id: 'armor' }, { id: 'evasion' }], stats: [] };
const mods = ctx.getAvailableMods(dualItem);
const armor = mods.find(mod => mod.id === 'armor');
const armorPct = mods.find(mod => mod.id === 'armorPct');
const compoundArmor = mods.find(mod => mod.id === 'compoundArmor');

assert(armor, 'dual base keeps one flat defense affix representative');
assert(armorPct, 'dual base keeps one percent defense affix representative');
assert(compoundArmor, 'dual base keeps one compound defense affix representative');
assert(!mods.some(mod => mod.id === 'evasion'), 'dual base must not double flat defense affix weight');
assert(!mods.some(mod => mod.id === 'evasionPct'), 'dual base must not double percent defense affix weight');
assert(!mods.some(mod => mod.id === 'compoundEvasion'), 'dual base must not double compound defense affix weight');
assert(armor.compound.some(sub => sub.statId === 'evasion'), 'dual armor flat affix must also grant evasion flat');
assert(Math.abs(armor.compound.find(sub => sub.statId === 'evasion').base - 7.2) < 0.0001, 'dual flat side value must be 60% of single flat base');
assert(armorPct.compound.some(sub => sub.statId === 'evasionPct'), 'dual armor percent affix must also grant evasion percent');
assert(Math.abs(armorPct.compound.find(sub => sub.statId === 'evasionPct').base - 3.6) < 0.0001, 'dual percent side value must be 60% of single percent base');
assert(compoundArmor.compound.some(sub => sub.statId === 'armorPct'), 'compound armor keeps its own armor percent');
assert(compoundArmor.compound.some(sub => sub.statId === 'evasion'), 'compound armor also grants evasion flat');
assert(compoundArmor.compound.some(sub => sub.statId === 'evasionPct'), 'compound armor also grants evasion percent');

const rolled = ctx.rollAffixValue(compoundArmor, 1, { roundInteger: true });
const rolledIds = rolled.extraStats.map(stat => stat.id).sort();
assert.strictEqual(JSON.stringify(rolledIds), JSON.stringify(['armorPct', 'evasion', 'evasionPct']), 'rolled compound dual-defense line must carry all paired stats');

const singleItem = { slot: '갑옷', rarity: 'rare', baseStats: [{ id: 'armor' }], stats: [] };
const singleArmor = ctx.getAvailableMods(singleItem).find(mod => mod.id === 'armor');
assert(!singleArmor.compound, 'single-defense bases must keep single-stat defense affixes');


const uiSource = fs.readFileSync('js/ui.js', 'utf8');
assert(uiSource.includes('for (let i = 0; i < parts.length; i += 2)'), 'compound option tooltip must wrap long dual-compound lines in pairs');
assert(uiSource.includes('compound-option-continuation'), 'wrapped compound option lines must have a continuation marker');

console.log('smoke-dual-defense-affixes: OK');
