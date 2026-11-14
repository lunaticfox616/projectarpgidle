

export function liveSupportSupportValue(env, name,level,ownStat) {
    const def=env.deps.SUPPORT_GEM_DB[name],gem=env.deps.normalizeGemRecord(env.owner.supportGemData[name]);
    const {tierMul}=env.deps.getSupportGemTier(name,gem,null);
    const value=(def.baseVal+env.deps.getGemLevelGrowthSteps(level)*def.scale)*tierMul;
    if(def.tierValues)return env.deps.supportRules.value(name);
    return def.scaleWithOwnStat ? Math.max(0,ownStat(def.scaleWithOwnStat))*value/100 : value;
}

export function liveSupportValues(env, skill,context) {
    const result={};
    for(const name of context.names) {
        const def=env.deps.SUPPORT_GEM_DB[name];
        if(!def)continue;
        const gem=env.deps.normalizeGemRecord(env.owner.supportGemData[name]);
        const level=Math.max(1,gem.level+context.bonus(name));
        result[name]=liveSupportSupportValue(env, name,level,context.ownStat);
        if(!def.stat || !env.deps.supportRules.matches(name,skill,'main'))continue;
        context.add(def.stat,result[name]);
        if(def.capStat)context.add(def.capStat,liveSupportCapValue(env, def,level));
    }
    return result;
}

export function liveSupportCapValue(env, def,level) { return (def.capBase||0)+env.deps.getGemLevelGrowthSteps(level,def.capGrowAfterLevel||0)*(def.capPerLevel||0); }

/** Whether a worn support rune or a blessing in the summon slots grants strength, dexterity or intelligence (none did on
     * 2026-11-07). Only then does the equip requirement check need the rune pass (js/player-stats.js getPlayerStats attributesOnly). */
export function liveSupportGrantsAttributes(env, state,names) {
    const attribute=stat=>stat==='strength' || stat==='dexterity' || stat==='intelligence';
    const support=names.some(name=>{ const def=env.deps.SUPPORT_GEM_DB[name]; return !!def && (attribute(def.stat) || attribute(def.capStat)); });
    return support || (state.equippedSummonSkills || []).some(name=>{
        const aura=env.deps.SKILL_DB[name] && env.deps.SKILL_DB[name].aura;
        return !!aura && (attribute(aura.flatStat) || aura.stats.some(row=>attribute(row.stat)));
    });
}
