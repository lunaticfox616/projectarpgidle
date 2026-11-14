import { killNoteOceanKill } from '../combat/ocean-guardian-state.mjs';
import { killGetGrandBreachRewardSummary } from '../combat/kill-grand-breach.mjs';

/** The kill in the counters: a boss's content records, the grand breach's survival count, the loop's kills, and during an offline
 * settlement the normal/elite/boss mix it projects the rest with. */
export function* killCountKillForContent(env, enemy, zone, pStats) {
    if (enemy.isBoss) killMarkBossKillForContent(env, enemy, zone, pStats);
    killCountGrandBreachSurvivalKill(env, enemy, zone);
    (yield* killNoteOceanKill(env, enemy, zone));
    env.deps.combatIncidents.onKill(enemy, zone);
    env.owner.loopKills = Math.max(0, Math.floor(env.owner.loopKills || 0)) + 1;
    if (env.owner.isBackgroundCalculation) killCountBackgroundKillMix(env, enemy);
}

export function killMarkBossKillForContent(env, enemy, zone, pStats) {
    env.deps.completeHiddenJournalBossRun(enemy, zone, pStats);
    // 재능 개화 미궁의 보스를 실제로 처치한 경우에만 개화 완료를 허용하기 위해 기록한다.
    if (zone && zone.type === 'trial' && zone.bloomTrial) env.owner.bloomBossDefeated = true;
}

export function killCountGrandBreachSurvivalKill(env, enemy, zone) {
    const grand = env.owner.voidRift.grandRun;
    if (zone?.id !== 'grand_breach_run' || !grand?.inRun || grand.phase !== 'survival' || enemy.isBoss) return;
    const progress = env.deps.getGrandBreachProgress(grand.gauge);
    if (progress.complete) {
        grand.phase = 'bossPending';
        return;
    }
    grand.kills = killGetGrandBreachRewardSummary(grand.kills).kills + 1;
    const gain = enemy.isElite ? env.deps.GRAND_BREACH_ENCOUNTER.eliteGaugeGain : env.deps.GRAND_BREACH_ENCOUNTER.normalGaugeGain;
    const next = env.deps.getGrandBreachProgress(progress.gauge + gain);
    grand.gauge = next.gauge;
    if (next.complete) grand.phase = 'bossPending';
}

/** 백그라운드 정산이 남은 구간을 예상할 때 쓸 처치 구성. 재화 드랍 확률은 일반/정예/보스가 자릿수 단위로 다르므로(황금률: 보스 0.6% vs
 * 일반 0.007%), 총 처치 수만으로는 남은 구간의 재화를 제대로 다시 굴릴 수 없다. 시뮬레이션 중에만 센다. */
export function killCountBackgroundKillMix(env, enemy) {
    const mix = env.owner.backgroundKillMix && typeof env.owner.backgroundKillMix === 'object'
        ? env.owner.backgroundKillMix : (env.owner.backgroundKillMix = { normal: 0, elite: 0, boss: 0 });
    const bucket = enemy.isBoss ? 'boss' : (enemy.isElite ? 'elite' : 'normal');
    mix[bucket] = Math.max(0, Math.floor(mix[bucket] || 0)) + 1;
}
