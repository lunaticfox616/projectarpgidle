

/** From loop 9 in void rift zones, an open rift's wave: reinforcements arrive, and when all came and fell the rift closes with its
 * rewards and maybe opens the grand breach. ui: { say (addLog), enterGrand (the grand breach auto entry) } from the tick. */
export function* tickTickVoidRiftWave(env, zone) {
    if ((env.owner.season || 1) < 9 || !env.deps.isVoidRiftCombatZone(zone)) return;
    const v = env.owner.voidRift || (env.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    if (!v.active) return;
    tickSanitizeVoidRiftWave(env, v);
    if (env.deps.spawnVoidBreachReinforcement(zone, v) && env.owner.settings.showSpawnLog !== false) {
        (yield { kind: 'say', args: [env.deps._t('🕳️ 균열 출현 {spawnedCount}/{totalToSpawn}', { spawnedCount: v.spawnedCount, totalToSpawn: v.totalToSpawn }), 'attack-monster', { noToast: true }] });
    }
    if (tickVoidRiftWaveCleared(env, v)) yield* tickCloseVoidRiftWave(env, v);
}

export function tickSanitizeVoidRiftWave(env, v) {
    v.pendingWave = v.pendingWave !== false;
    v.totalToSpawn = Math.max(3, Math.floor(v.totalToSpawn || (6 + Math.floor(env.deps.random() * 4))));
    v.spawnedCount = Math.max(0, Math.floor(v.spawnedCount || 0));
    v.spawnTick = Math.max(0, Math.floor(v.spawnTick || 0));
}

export function* tickCloseVoidRiftWave(env, v) {
    v.active = false;
    v.pendingWave = false;
    v.breachClears = (v.breachClears || 0) + 1;
    let reward = 1 + (env.deps.random() < 0.2 ? 1 : 0);
    reward = env.deps.combatLootReceipts.capture(env.owner,()=>env.deps.awardCurrency('voidChisel', reward, 'drop'));
    let unlockedGrand = false;
    if (env.deps.random() < env.deps.GRAND_BREACH_ENCOUNTER.unlockChance) {
        v.grandBreachUnlock = true;
        unlockedGrand = true;
    }
    (yield { kind: 'say', args: [env.deps._t('🕳️ 공허의 구멍 정리 완료!{reward}', { reward: reward ? ` ${env.deps._t('공허의 끌')} +${reward}` : '' }), 'loot-magic', { noToast: true }] });
    if (unlockedGrand) yield* tickAnnounceGrandBreachOpen(env, v);
}

export function* tickAnnounceGrandBreachOpen(env, v) {
    const enteredGrand = (yield { kind: 'enterGrand', args: [] });
    if (!enteredGrand) (yield { kind: 'say', args: [env.deps._t('🚨 대균열이 열렸습니다! [대균열 입장] 버튼을 확인하세요.'), 'loot-unique'] });
    if (!enteredGrand && !v.grandNoticeShown && env.deps.canQueueTutorialNotice) {
        v.grandNoticeShown = true;
        (yield { kind: 'queueTutorialNotice', args: ['void_grand_breach_ready_once', env.deps._t('대균열'), env.deps._t('대균열이 열렸습니다.\n‘지도 → 탐험 → 공허 균열, 대균열’에서 ‘대균열 입장’을 누르세요.'), 'tab-map'] });
    }
}

export function tickVoidRiftWaveCleared(env, v) { return v.spawnedCount >= v.totalToSpawn && (v.defeatedCount || 0) >= v.totalToSpawn
    && (env.owner.enemies || []).filter(e => e.hp > 0 && e.fromVoidRift).length === 0; }
