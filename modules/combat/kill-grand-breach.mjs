export function* killGrantGrandBreachClearRewards(env, kills, enemy = env.owner.gridPlayer) {
    const rewards = killGetGrandBreachRewardSummary(kills);
    rewards.voidChisel = (yield { kind: 'keepCurrencyDrop', args: [enemy, 'voidChisel', rewards.voidChisel] }).gain;
    rewards.jewelShard = rewards.jewelShard > 0 ? (yield { kind: 'keepCurrencyDrop', args: [enemy, 'jewelShard', rewards.jewelShard] }).gain : 0;
    return rewards;
}

export function killGrandBreachClearRewardText(env, rewards) {
    const pieces = [env.deps._t('균열 몬스터 {kills}처치 정산', { kills: rewards.kills })];
    if (rewards.voidChisel) pieces.push(`공허의 끌 +${rewards.voidChisel}`);
    if (rewards.jewelShard) pieces.push(`주얼 결정 +${rewards.jewelShard}`);
    return pieces.join(', ');
}

/** The lord releases the held horde loot; the hero leaves only after picking up the floor. */
export function* killFinishGrandBreachOnBossKill(env, enemy, zone) {
    const grand = env.owner.voidRift.grandRun;
    if (!zone || zone.id !== 'grand_breach_run' || !enemy.isBoss || !grand || !grand.inRun || grand.phase!=='boss') return;
    const v = env.owner.voidRift || (env.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    const rewards = (yield* killGrantGrandBreachClearRewards(env, grand.kills,enemy));
    env.deps.actExplorationState.groundLoot.releaseEncounter(grand,enemy);
    grand.rewardVoidChisel = rewards.voidChisel;
    grand.rewardJewelShard = rewards.jewelShard;
    grand.phase = 'loot';
    v.grandBreachCleared = true;
    env.owner.enemies = [];
    env.owner.encounterPlan = [];
    env.owner.encounterIndex = 0;
    env.owner.runProgress = 0;
    env.deps.markLoopSpecialBossKill('void_grand_breach');
    env.deps.unlockJournalEntry('void_grand_breach');
    (yield { kind: 'killSay', args: [env.deps._t('🌌 대균열 보스를 격파했습니다! {rewards}. 바닥 전리품을 모두 획득하면 귀환합니다.', { rewards: killGrandBreachClearRewardText(env, rewards) }), 'level-up'] });
    (yield* killFinishGrandBreachLootCollection(env, zone));
    (yield { kind: 'queueImportantSave', args: [200] });
}

/** Whether the lord's floor still holds items. An offline replay walks no detours (collectingLoot is foreground only): it takes
 * the floor at once. */
export function* killGrandBreachFloorLeft(env) {
    const floor=env.deps.actExplorationState.current(env.owner);
    if(floor?.groundLoot.length && env.owner.isBackgroundCalculation)(yield { kind: 'collectExplorationFloorLoot', args: [env.deps.actExplorationState.groundLoot.takeAll(floor)] });
    return !!floor?.groundLoot.length;
}

/** A cleared breach stays on its field until every released item has been collected. */
export function* killFinishGrandBreachLootCollection(env, zone) {
    const grand=env.owner.voidRift.grandRun;
    if(!grand?.inRun || grand.phase!=='loot')return;
    if((yield* killGrandBreachFloorLeft(env)))return;
    if(!env.deps.actExplorationProgress.beginCompletion(zone))return;
    grand.inRun=false;
    grand.phase='done';
    env.deps.actExplorationProgress.depart(env.owner);
    env.owner.currentZoneId=grand.returnZoneId!==undefined && grand.returnZoneId!==null
        ? grand.returnZoneId : env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    (yield { kind: 'queueImportantSave', args: [200] });
}

export function killGetGrandBreachRewardSummary(kills) {
    let safeKills = Math.max(0, Math.floor(Number(kills) || 0));
    return {
        kills: safeKills,
        voidChisel: 2 + Math.floor(safeKills / 10),
        jewelShard: Math.min(3, Math.floor(safeKills / 15))
    };
}
