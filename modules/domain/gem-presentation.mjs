import { normalizeGemRecord } from '../state/gem-records.mjs';
import { getGemLevelGrowthSteps } from './gem-growth.mjs';

function supportTier(name, gem, activeTierOf, deps) {
    const activeTier = activeTierOf ? activeTierOf(name)
        : Math.max(1, Math.min(deps.tierCap ? deps.tierCap(name) : 3, Math.floor(gem.activeTier || gem.unlockedTier || 1)));
    const tierMul = deps.tierMultiplier ? deps.tierMultiplier(name, activeTier) : activeTier === 1 ? 1 : activeTier === 2 ? 1.55 : 2.2;
    return { activeTier, tierMul };
}

function supportPresentation(owner, name, context, activeTierOf, deps) {
    const { stats, sources } = context;
    const gem = normalizeGemRecord((owner.supportGemData || {})[name], deps.forgeRules);
    const db = deps.supports[name];
    if (!db) return { baseLevel: gem.level, totalLevel: gem.level, value: 0, desc: deps.translate('정의되지 않은 보조스킬룬'), statName: name, statId: null, gemBonusSources: sources };
    const totalLevel = Math.max(1, gem.level + sources.total);
    const val = db.baseVal + getGemLevelGrowthSteps(totalLevel) * db.scale;
    const { activeTier, tierMul } = supportTier(name, gem, activeTierOf, deps);
    const ratioPct = db.tierValues ? db.tierValues[activeTier - 1] : val * tierMul;
    const scaleBase = db.scaleWithOwnStat ? Math.max(0, Number(stats.supportScaleBases && stats.supportScaleBases[db.scaleWithOwnStat]) || 0) : 0;
    const value = db.scaleWithOwnStat ? scaleBase * (ratioPct / 100) : ratioPct;
    return { baseLevel: gem.level, totalLevel, value, desc: db.desc, statName: db.name, statId: db.stat, activeTier,
        gemBonusSources: sources, scaleWithOwnStat: db.scaleWithOwnStat || null, scaleBase, scaleRatioPct: ratioPct };
}

function skillLevels(name, db, gem, sources, deps) {
    const { permanentSkyBonus, materialBonus, engraveLevel } = db.isGem ? deps.bonusLevels(name, gem) : deps.noBonusLevels;
    const levelBonus = db.isGem ? sources.total : 0;
    const totalLevel = gem.level + levelBonus + materialBonus + engraveLevel;
    const finalLevel = Math.min(20, gem.level) + levelBonus + materialBonus + engraveLevel;
    return { permanentSkyBonus, materialBonus, engraveLevel, totalLevel, finalLevel };
}

function leveledSkill(db, gem, finalLevel, forgeEffects) {
    const skill = { ...db };
    skill.dmg = skill.baseDmg + getGemLevelGrowthSteps(finalLevel) * skill.dmgScale;
    skill.spd = skill.baseSpd + getGemLevelGrowthSteps(finalLevel) * skill.spdScale;
    if (skill.critScale) skill.crit = (skill.crit || 0) + getGemLevelGrowthSteps(finalLevel, 0) * skill.critScale;
    const qualityMul = 1 + Math.max(0, Math.min(20, gem.quality || 0)) / 200;
    skill.dmg *= qualityMul * (db.isGem ? forgeEffects(gem).damage : 1);
    skill.spd *= qualityMul * (db.isGem ? forgeEffects(gem).speed : 1);
    return skill;
}

function presentationPattern(owner, name, skill, stats, deps) {
    const active = name === owner.activeSkill && stats.sSkill && stats.sSkill.projectilePatternSource ? stats.sSkill : null;
    const mode = active && active.projectilePattern ? active.projectilePattern.mode : deps.skyPattern(name);
    return mode ? deps.applyPattern(skill, mode, active ? active.projectilePatternSource : '창공 각인', active ? active.projectilePatternDamageMultiplier : null) : skill;
}

function skillPresentation(owner, name, context, deps) {
    const { stats, sources } = context;
    const db = deps.skills[name];
    if (!db) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: deps.translate('정의되지 않은 스킬'), skill: deps.skills['기본 공격'], tags: ['attack'] };
    if (!db.isGem && !db.levelable) return { baseLevel: 0, totalLevel: 0, finalLevel: 0, desc: db.desc, statName: name, skill: db, tags: deps.tags(db) };
    owner.gemData = owner.gemData || {};
    const gem = normalizeGemRecord((owner.gemData || {})[name], deps.forgeRules);
    if (db.levelable) owner.gemData[name] = gem;
    const levels = skillLevels(name, db, gem, sources, deps);
    const skill = deps.resolve(presentationPattern(owner, name, leveledSkill(db, gem, levels.finalLevel, deps.forgeEffects), stats, deps));
    return { baseLevel: gem.level, totalLevel: levels.totalLevel, finalLevel: levels.finalLevel, materialBonus: levels.materialBonus,
        permanentSkyBonus: levels.permanentSkyBonus, engraveLevel: levels.engraveLevel, enhanceLevel: gem.enhanceLevel || 0,
        skyEnhanceCap: gem.skyEnhanceCap || 1, quality: gem.quality || 0, awakened: !!gem.awakened,
        desc: db.desc, skill, tags: deps.tags(skill), gemBonusSources: sources };
}

/** Rune values and normalization retain the explicit owner; no DOM or stored singleton state. */
export function createGemPresentation(deps) {
    return Object.freeze({
        read(owner, name, isSupport, stats) {
            const context = { stats, sources: deps.sources(name, stats.gemBonusSources) };
            return isSupport ? supportPresentation(owner, name, context, deps.activeTier || null, deps) : skillPresentation(owner, name, context, deps);
        },
        support: (owner, name, context, activeTierOf) => supportPresentation(owner, name, context, activeTierOf, deps),
        tier: (name, gem, activeTierOf) => supportTier(name, gem, activeTierOf, deps),
        levels: (name, db, gem, sources) => skillLevels(name, db, gem, sources, deps)
    });
}
