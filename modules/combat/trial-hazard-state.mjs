import { effectGetTrialHazardProfile } from '../domain/skill-effect-values.mjs';

export function hitPrimeTrialHazardTimer(env, zone) {
    // 개화 시련 밖으로 나가면 누적된 재생 억제를 해제한다.
    if (!zone || !zone.bloomTrial) env.owner.bloomTrialRegenSuppress = 0;
    if (!zone || (zone.type !== 'trial' && !zone.trialHazard)) {
        env.runtime.trialHazardRuntime = { nextAt: 0, active: null };
        env.owner.trialHazardIndex = 0;
        return;
    }
    env.owner.trialHazardIndex = 0;
    env.runtime.trialHazardRuntime = {
        nextAt: env.deps.getCombatTime() + effectGetTrialHazardProfile(zone).initialDelayMs,
        active: null
    };
}
