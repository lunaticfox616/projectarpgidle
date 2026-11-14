export function noticeRuneUpgrade(runtime, name) {
    if(runtime.deps.game.activeSkill===name || (0, runtime.deps.isMobilityRuneName)(name) || !(runtime.deps.game.skills||[]).includes(name) || !(0, runtime.deps.canUseSkillWithCurrentEquipment)(name))return;
    const { dps: [before, after] } = (0, runtime.deps.previewBuildStats)(copy => { copy.activeSkill = name; });
    const format=runtime.deps.COMPARE_STAT_META.dps.format;
    if(before>0 && after>=before*runtime.state.RUNE_UPGRADE_NOTICE_GAIN)(0, runtime.deps.showGameToast)((0, runtime.deps._t)('더 강한 공격 룬을 얻었습니다. 「{name}」 DPS {before} → {after}', { name, before: format(before), after: format(after) }),{tone:'reward',duration:4200});
}

export function queueRuneUpgradeNotice(runtime, {gem,kind}) {
    if(!gem || kind!=='attack' || runtime.deps.game.isBackgroundCalculation || (runtime.deps.SKILL_DB[gem.name]?.tags||[]).includes('summon'))return;
    const owner = runtime.deps.game, name = gem.name;
    const timer = runtime.deps.setTimeout(() => {
        runtime.timers.delete(timer);
        if (runtime.active && runtime.deps.game === owner && !owner.isBackgroundCalculation) noticeRuneUpgrade(runtime, name);
    }, 0);
    runtime.timers.add(timer);
}

export function announceGemReward(runtime, reward) {
    queueRuneUpgradeNotice(runtime, reward);
    if(!runtime.deps.game.settings.showLootLog)return;
    const {gem,kind}=reward;
    if(!gem)return;
    if(kind==='attack')(0, runtime.deps.addLog)((0, runtime.deps._t)("✨ 공격 룬 <span class='loot-magic'>[{name}]</span> 획득!{awakened}", { name: (0, runtime.deps._t)(gem.name), awakened: gem.awakened ? ` ${(0, runtime.deps._t)('(각성 후보)')}` : '' }));
    else (0, runtime.deps.addLog)((0, runtime.deps._t)("🟢 보조스킬룬 <span class='loot-rare'>[{name}]</span> 획득! (해금: {supportTierLabel})", { name: (0, runtime.deps._t)(gem.name), supportTierLabel: (0, runtime.deps.getSupportTierLabel)(gem.name,gem.tier) }));
}
