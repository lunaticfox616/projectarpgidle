export function killClearDotFxThrottleForEnemy(env, enemyId) {
    if (!Number.isFinite(enemyId)) return;
    let fxState = env.owner.dotFxThrottle;
    if (!fxState || typeof fxState !== 'object') return;
    let prefix = `${enemyId}:`;
    Object.keys(fxState).forEach(key => {
        if (key && key.startsWith(prefix)) delete fxState[key];
    });
}

// 루프의 첫 처치는 그 직업의 대표 무기를 떨어뜨린다(2026-11-09 사용자: "기존 몹 잡아서 룬 떨어지는 건 직업에 맞는 무기로 바꿔서 장비 장착 튜토리얼로").
// 기초 스킬은 직업을 고를 때 받고(js/basic-skills.js) 그 무기를 들어야 쓴다. 무기 칸이 차 있으면(봉인해 물려받은 무기) 떨어뜨리지 않는다.
// 탐험 지도에서는 그 처치 자리 바닥에 떨어지고 주울 때 들어온다(액트 1 입구 방의 첫 몬스터, createStarterRescuePack). 장착 안내를 아직 안 본
// 저장(새 게임의 첫 루프)은 그 무기를 안내까지 가방에 둔다(starterWeaponTutorialPending, js/content-progression-ui.js announceStarterWeapon).
// 그 뒤 루프는 빈 칸 자동 장착 설정대로 낀다. enemy가 없으면(스크립트) 바로 가방으로 간다.
export function* killGrantLoopStarterWeaponOnFirstKill(env, enemy) {
    if (env.owner.loopStarterWeaponGranted) return;
    env.owner.loopStarterWeaponGranted = true;
    const item = env.deps.createClassStarterWeapon(env.owner.selectedClassId);
    if (!item) return;
    if (!(env.owner.seenTutorials || []).includes(env.deps.basicSkills.weaponGuide)) env.owner.starterWeaponTutorialPending = item.id;
    if (enemy) (yield { kind: 'keepEquipmentDrop', args: [enemy, item, { guaranteedKeep: true }] });
    else env.deps.addItemToInventory(item, { guaranteedKeep: true });
}

/** Resolve a live victim once; a defeated training target finishes its measurement without becoming a rewarded kill. */
export function killResolveEnemyDeath(env, enemy) {
    if (!enemy || !Number.isFinite(enemy.id)) return null;
    const liveRef = (env.owner.enemies || []).find(entry => entry && entry.id === enemy.id);
    // 이미 처리되어 enemies 배열에서 제거된 적(중복 재귀 호출)은 무시한다.
    if (!liveRef || liveRef.hp > 0) return null;
    enemy = liveRef;
    // A training target is not a kill: no experience, loot, growth or on-kill rewards.
    if (env.owner.currentZoneId === env.deps.WOODSMAN_ECHO_ZONE_ID) {
        const run = env.deps.ensureWoodsmanEchoRunState();
        run.totalDamage = Math.max(run.totalDamage, Math.floor(enemy.echoStartHp || enemy.maxHp));
        env.deps.finishWoodsmanEchoRun();
        return null;
    }
    return enemy;
}

/** Talent state kept per kill: the inquisitor's marks on this monster go, 콜로세움 브레이커 counts the crowd's roar (5 = next strike). */
export function killTickTalentKillRuntime(env, enemy) {
    // 재능 런타임: 적별 누적 상태 정리(메모리 누수 방지)
    if (env.owner.talentInquisitorMarks) delete env.owner.talentInquisitorMarks[enemy.id];
    if (typeof env.deps.isTalentCardActive !== 'function' || !env.deps.isTalentCardActive('hero2__gladiator')) return;
    env.owner.talentRuntime = (env.owner.talentRuntime && typeof env.owner.talentRuntime === 'object') ? env.owner.talentRuntime : {};
    env.owner.talentRuntime.colosseumKills = (env.owner.talentRuntime.colosseumKills || 0) + 1;
    if (env.owner.talentRuntime.colosseumKills >= 5) { env.owner.talentRuntime.colosseumKills = 0; env.owner.talentRuntime.colosseumReady = true; }
}
