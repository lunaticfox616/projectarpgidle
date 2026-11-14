import { killEnterAutomaticMapInterruptionAfterClear } from './clear-interruption.mjs';
export function* clearGrantGuaranteedTrialSkillGem(env) {
    let skill = env.deps.pickSkillRuneReward(env.deps.gemDropRewards.attackRunes());
    env.deps.gemDropRewards.grant(env.owner, { kind: 'attack', name: skill, awakened: false }, 0);
    (yield { kind: 'addLog', args: [env.deps._t("✨ 전직 시련 보상: 공격 룬 <span class='loot-magic'>[{skill}]</span> 획득!", { skill }), 'loot-magic'] });
    return true;
}

export function clearGetTrialSkillGemRewardChance(zone, isFirstClear) {
    if (isFirstClear) return 1;
    return Math.max(0, Math.min(1, Number(zone && zone.repeatGemChance) || 0));
}

export function* clearFinishTrialEncounter(env, zone) {
    if (zone.bloomTrial) return (yield* clearFinishBloomTrial(env, zone));
    let isFirstClear = !env.owner.completedTrials.includes(zone.id);
    if (isFirstClear) env.owner.completedTrials.push(zone.id);
    if (Math.random() < clearGetTrialSkillGemRewardChance(zone, isFirstClear)) (yield* clearGrantGuaranteedTrialSkillGem(env));
    if (isFirstClear) (yield* clearGrantTrialKeystonePoint(env));
    (yield* clearGrantTrialAscendPoints(env, zone, isFirstClear));
    if (!env.owner.unlocks.traits) env.owner.unlocks.traits = true;
    env.owner.noti.traits = true;
    if (zone.id === 'trial_1' && isFirstClear) {
        (yield { kind: 'queueTutorialNotice', args: ['unlock_first_ascend', env.deps._t('1차 전직'), env.deps._t('1차 전직 시련을 통과했습니다.\n‘스킬트리 → 전직’에서 전직을 고르고 전직 노드를 할당하세요.'), 'tab-traits'] });
    }
    (yield { kind: 'finishUnlocks', args: [] });
    if (zone.id !== 'trial_4') {
        if (isFirstClear) (yield { kind: 'finishSay', args: [env.deps._t('👑 [{name}] 통과! 전직 포인트 2점 획득!', { name: env.deps._t(zone.name) }), "loot-unique"] });
        else (yield { kind: 'finishSay', args: [env.deps._t('🔁 [{name}] 재도전 완료 (전직 포인트 보상 없음)', { name: env.deps._t(zone.name) }), "attack-monster", { noToast: true }] });
    }
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    env.owner.inTicketBossFight = false;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    env.deps.startMoving(false);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [200] });
}

export function* clearFinishBloomTrial(env, zone) {
    // 보스를 실제로 처치하지 않았는데 런이 완료 처리된 경우(예: 보스 미스폰/즉시 제거 등)에는
    // 개화를 인정하지 않고 전투를 다시 구성한다. 보스를 잡아야만 재능 개화가 완료된다.
    if (!env.owner.bloomBossDefeated) {
        (yield { kind: 'finishSay', args: [env.deps._t('❄️ 개화 미궁의 수호자를 아직 쓰러뜨리지 못했습니다. 전투를 다시 구성합니다.'), 'attack-monster', { noToast: true }] });
        env.deps.startEncounterRun();
        return;
    }
    env.deps.handleTalentBloomClear(zone);
}

export function* clearGrantTrialKeystonePoint(env) {
    env.owner.ascendKeystonePoints = Math.max(0, Math.floor(env.owner.ascendKeystonePoints || 0)) + 1;
    (yield { kind: 'finishSay', args: [env.deps._t('💠 키스톤 포인트 +1 (현재 {ascendKeystonePoints})', { ascendKeystonePoints: env.owner.ascendKeystonePoints }), 'loot-unique'] });
}

/** A trial's ascendancy points and rank: the fourth gives a core node pick on its first clear, the others 2 points. */
export function* clearGrantTrialAscendPoints(env, zone, isFirstClear) {
    if (zone.id === 'trial_4') {
        env.owner.ascendPoints += isFirstClear ? 1 : 0;
        if (isFirstClear) {
            env.owner.ascendRank = Math.max(env.owner.ascendRank || 0, 4);
            (yield { kind: 'finishSay', args: [env.deps._t('👑 [{name}] 통과! 4차 전직 핵심 노드 선택권 +1 획득!', { name: env.deps._t(zone.name) }), "loot-unique"] });
        }
        return;
    }
    if (isFirstClear) env.owner.ascendPoints += 2;
    env.owner.ascendRank = Math.max(env.owner.ascendRank || 0, zone.id === 'trial_3' ? 3 : (zone.id === 'trial_2' ? 2 : 1));
}
