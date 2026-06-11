#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const skillsSource = fs.readFileSync('js/skills.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const dataSkillsSource = fs.readFileSync('data/skills.js', 'utf8');

const growthFn = combatSource.match(/function getAttackSummonGrowthSteps\(gemLv\) \{[\s\S]*?\n\}/);
assert(growthFn, 'attack summon growth helper must exist');
const context = {};
vm.createContext(context);
vm.runInContext(`${growthFn[0]}; this.getAttackSummonGrowthSteps = getAttackSummonGrowthSteps;`, context);
const lv1 = context.getAttackSummonGrowthSteps(1);
const lv2 = context.getAttackSummonGrowthSteps(2);
const lv9 = context.getAttackSummonGrowthSteps(9);
const lv10 = context.getAttackSummonGrowthSteps(10);
const lv11 = context.getAttackSummonGrowthSteps(11);
const lv19 = context.getAttackSummonGrowthSteps(19);
const lv20 = context.getAttackSummonGrowthSteps(20);
const lv21 = context.getAttackSummonGrowthSteps(21);
const lv30 = context.getAttackSummonGrowthSteps(30);
assert.strictEqual(lv1, 9, 'attack summon level-1 growth baseline must be 20x the previous 0.45 baseline');
assert(lv20 > 50, 'levels 10-20 should now grow much more steeply than the prior curve');
assert((lv10 - lv9) > (lv2 - lv1) * 1.5, 'attack summon growth should steepen starting at level 10');
assert((lv20 - lv19) > (lv11 - lv10), 'attack summon growth should keep accelerating through level 20');
assert((lv21 - lv20) > (lv20 - lv19), 'growth after level 20 should be steeper than growth before level 20');
assert(lv30 > 90, 'high-level attack summons should materially outgrow the old linear curve');
assert(combatSource.includes("profile && profile.role === 'attack'"), 'the boosted curve must be limited to attack summons');
assert(dataSkillsSource.includes("tags: ['summon', 'summon_attack'"), 'attack summon skill gems must carry the summon_attack tag');
assert(!dataSkillsSource.includes('수액 골렘 소환'), 'Sap Golem must remain outside the attack skill gem database');

assert(skillsSource.includes("{ stat: 'summonGemLevel', tag: 'summon_attack' }"), 'summon gem level must target attack summon gems only');
assert(stateSource.includes("id: 'summonWeaponGemLevel', statId: 'summonGemLevel'"), 'weapon summon gem level affix must exist');
assert(stateSource.includes("slots: ['무기'], tierValues: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], weight: 0.15"), 'weapon summon gem level must scale by tier up to +5 at low weight');
assert(stateSource.includes("id: 'summonRingGemLevel', statId: 'summonGemLevel'"), 'ring summon gem level affix must remain separate');
assert(stateSource.includes("slots: ['반지'], tierValues: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], weight: 0.15"), 'ring summon gem level must remain capped at +1');
assert(passivesSource.includes("'summonResPen', 'summonGemLevel'"), 'summon gem level must be restricted to summon base items');

const profileFn = combatSource.match(/function getSummonProfile\(gemName\) \{[\s\S]*?\n\}/);
assert(profileFn, 'summon profile helper must exist');
vm.runInContext(`${profileFn[0]}; this.getSummonProfile = getSummonProfile;`, context);
const expectedProfiles = {
    '서리늑대 소환': { baseHp: 330, baseArmor: 36, baseEvasion: 63, baseDamage: 54 },
    '불곰 소환': { baseHp: 473, baseArmor: 66, baseEvasion: 24, baseDamage: 86 },
    '벼락멧돼지 소환': { baseHp: 368, baseArmor: 36, baseEvasion: 45, baseDamage: 62 },
    '칼날까마귀 소환': { baseHp: 315, baseArmor: 27, baseEvasion: 87, baseDamage: 50 },
    '공허 유충 소환': { baseHp: 405, baseArmor: 39, baseEvasion: 30, baseDamage: 63 },
    '벌떼 소환': { baseHp: 285, baseArmor: 24, baseEvasion: 75, baseDamage: 36 },
    '수액 골렘 소환': { baseHp: 630, baseArmor: 90, baseEvasion: 18, baseDamage: 15 }
};
Object.entries(expectedProfiles).forEach(([name, expected]) => {
    const profile = context.getSummonProfile(name);
    Object.entries(expected).forEach(([stat, value]) => assert.strictEqual(profile[stat], value, `${name} ${stat} must use the raised base value`));
});

const sharedDamageFn = combatSource.match(/function getSummonSharedDamageIncreasePct\(summon, pStats\) \{[\s\S]*?\n\}/);
assert(sharedDamageFn, 'summon shared damage increase helper must exist');
const sharedContext = {
    SKILL_DB: {
        '서리늑대 소환': { tags: ['summon', 'summon_attack', 'cold', 'elemental'] },
        '칼날까마귀 소환': { tags: ['summon', 'summon_attack', 'physical'] }
    },
    TAGGED_DAMAGE_STAT_BY_TAG: {
        physical: 'physPctDmg', elemental: 'elementalPctDmg', fire: 'firePctDmg', cold: 'coldPctDmg', lightning: 'lightPctDmg', chaos: 'chaosPctDmg', aoe: 'aoePctDmg'
    }
};
vm.createContext(sharedContext);
vm.runInContext(`${sharedDamageFn[0]}; this.getSummonSharedDamageIncreasePct = getSummonSharedDamageIncreasePct;`, sharedContext);
const sharedStats = {
    summonSharedPctDmg: 20,
    summonSharedTaggedPctDmg: { coldPctDmg: 15, elementalPctDmg: 10, firePctDmg: 99, physPctDmg: 12 },
    flatDmg: 9999,
    summonFlatDmg: 8888
};
assert.strictEqual(sharedContext.getSummonSharedDamageIncreasePct({ gemName: '서리늑대 소환' }, sharedStats), 45, 'cold elemental summons must inherit generic, cold, and elemental increases only');
assert.strictEqual(sharedContext.getSummonSharedDamageIncreasePct({ gemName: '칼날까마귀 소환' }, sharedStats), 32, 'physical summons must inherit generic and physical increases only');
assert(combatSource.includes('(sharedIncreasePct / 100)'), 'shared damage increases must be included in summon hit scaling');
assert(!sharedDamageFn[0].includes('flatDmg'), 'shared summon scaling must not inherit player flat damage');


function extractFunctionBlock(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert(start >= 0, `${name} must exist`);
    const bodyStart = source.indexOf('{', source.indexOf(')', start));
    assert(bodyStart >= 0, `${name} body must start`);
    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let i = bodyStart; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        else if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return source.slice(start, i + 1);
        }
    }
    throw new Error(`${name} body not found`);
}

const tooltipContext = {
    SKILL_DB: {
        '서리늑대 소환': { isGem: true, baseDmg: 0.1, baseSpd: 1, targetMode: 'single', targets: 1, desc: '소환수 공격 젬', tags: ['summon', 'summon_attack', 'cold'] },
        '연속 베기': { isGem: true, baseDmg: 0.65, baseSpd: 1.8, targetMode: 'cleave', targets: 2, desc: '일반 공격 젬', tags: ['attack', 'melee'] }
    },
    SUPPORT_GEM_DB: {},
    TAGGED_DAMAGE_STAT_BY_TAG: {},
    gemTooltipCache: null,
    capturedHtml: '',
    getUiGemPresentation(name) {
        const skill = tooltipContext.SKILL_DB[name];
        return { baseLevel: 1, finalLevel: 1, totalLevel: 1, desc: skill.desc, skill, tags: skill.tags, gemBonusSources: { passive: 0, gear: 0, reward: 0 } };
    },
    getUiPlayerStats() { return { gemBonusSources: { passive: 0, gear: 0, reward: 0 } }; },
    formatPercentMultiplier(value) { return `${Number(value).toFixed(2)}x`; },
    getSummonTooltipPreview() { return { roleLabel: '공격 소환수', trait: '빠른 공속', gemLevel: 1, hitDamageMin: 1, hitDamageMax: 2, attackPerSecond: 1.2, critChancePct: 0, critDmgPct: 140, resPenBonus: 0, physIgnoreBonus: 0, redirectPct: 0 }; },
    showInfoTooltipHtml(x, y, html) { tooltipContext.capturedHtml = html; }
};
tooltipContext.cachedTooltipStats = null;
vm.createContext(tooltipContext);
vm.runInContext(`${extractFunctionBlock(fs.readFileSync('js/ui.js', 'utf8'), 'showGemTooltip')}; this.showGemTooltip = showGemTooltip;`, tooltipContext);
tooltipContext.showGemTooltip({ clientX: 0, clientY: 0 }, 'active', '서리늑대 소환');
assert(!tooltipContext.capturedHtml.includes('피해 배율'), 'summon attack tooltip must hide generic damage multiplier');
assert(!tooltipContext.capturedHtml.includes('공속 배율'), 'summon attack tooltip must hide generic attack-speed multiplier');
assert(!tooltipContext.capturedHtml.includes('타겟 방식'), 'summon attack tooltip must hide target mode');
assert(!tooltipContext.capturedHtml.includes('최대 타겟 수'), 'summon attack tooltip must hide max target count');
tooltipContext.showGemTooltip({ clientX: 0, clientY: 0 }, 'active', '연속 베기');
assert(tooltipContext.capturedHtml.includes('피해 배율'), 'normal attack tooltip should keep generic damage multiplier');
assert(tooltipContext.capturedHtml.includes('공속 배율'), 'normal attack tooltip should keep generic attack-speed multiplier');
assert(tooltipContext.capturedHtml.includes('타겟 방식'), 'normal attack tooltip should keep target mode');
assert(tooltipContext.capturedHtml.includes('최대 타겟 수'), 'normal attack tooltip should keep max target count');

console.log('summon growth smoke checks passed');
