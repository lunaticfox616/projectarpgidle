import { oceanForceSurfaceOcean } from './ocean-progress-surface.mjs';
import { oceanGetOceanFishingStrategyDef } from './ocean-progress-collection.mjs';
import { oceanTickOceanDepth } from './ocean-progress-depth.mjs';

// 산소가 0이 된 뒤에는 시간이 지날수록 점점 큰 익사 피해를 입는다. 쓰러지기 직전이 되면 사망이 아니라 수면으로 복귀한다.
export function* oceanApplyOceanDrowningDamage(env, owner, st, dtSec) {
    if (!st || !(dtSec > 0)) return;
    if (!st.drowning) {
        st.drowning = true;
        st.drownSec = 0;
        (yield { kind: 'progressLog', args: [env.deps._t('🫨 산소가 바닥났습니다! 익사 피해가 점점 커지니 즉시 수면으로 복귀하세요.'), 'attack-monster'] });
    }
    st.drownSec = (Number(st.drownSec) || 0) + dtSec;
    let dmg = drowningDamage(env, owner, st, dtSec);
    let curHp = Math.max(0, Number(owner.playerHp) || 0);
    if (dmg >= curHp - 1) {
        // 쓰러지기 직전이면 사망 처리(전멸) 대신 수면 복귀 버튼과 동일한 효과로 강제 귀환한다.
        owner.playerHp = Math.max(1, curHp);
        yield* oceanForceSurfaceOcean(env, owner, 'oxygen');
        return;
    }
    owner.playerHp = curHp - dmg;
}

function drowningDamage(env, owner, st, dtSec) {
    let pStats = (typeof env.deps.getPlayerStats === 'function') ? env.deps.getPlayerStats() : null;
    let maxHp = Math.max(1, Math.floor((pStats && pStats.maxHp) || owner.playerHp || 1));
    // 익사 피해: 초당 최대체력의 (3% + 익사 누적 시간 × 3%). 시간이 지날수록 가속된다.
    let dmgPct = 3 + (st.drownSec * 3);
    return maxHp * (dmgPct / 100) * dtSec;
}

export function oceanIsInOceanZone(env, owner) {
    return owner.currentZoneId === env.deps.OCEAN_ZONE_ID;
}

export function* oceanTickOceanOxygen(env, owner, nowMs) {
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked || !st.diving) return;
    // 산소는 실제로 심해 맵에 입장해 있을 때만 감소합니다. 다른 맵으로 이동하면 잠수가 일시 중지됩니다.
    if (!oceanIsInOceanZone(env, owner)) { st.lastTickAt = nowMs; return; }
    let last = Math.max(0, Number(st.lastTickAt) || nowMs);
    let dtSec = Math.max(0, Math.min(5, (nowMs - last) / 1000));
    st.lastTickAt = nowMs;
    if (dtSec <= 0) return;
    let drainPerSec = activeOceanDrain(env, owner, st);
    st.oxygenCur = Math.max(0, Math.min(st.oxygenMax, st.oxygenCur - drainPerSec * dtSec));
    if (st.oxygenCur <= 0) { yield* oceanApplyOceanDrowningDamage(env, owner, st, dtSec); return; }
    // 산소가 다시 차오르면 익사 상태를 해제한다(잠수 중에는 보통 회복되지 않지만 안전 장치).
    st.drowning = false;
    st.drownSec = 0;
    yield* oceanTickOceanDepth(env, st, dtSec);
}

function activeOceanDrain(env, owner, st) {
    let drainPerSec = env.deps.getOceanOxygenDrainPerSec(owner);
    drainPerSec *= Math.max(0.1, Number(oceanGetOceanFishingStrategyDef(env, owner, st).oxygenDrainMul) || 1);
    let leechAlive = (owner.enemies || []).some(e => e && e.hp > 0 && e.trait && e.trait.oceanOxygenLeechOnHit);
    if (leechAlive) drainPerSec *= 1.4;
    let pressureCrushMul = (owner.enemies || []).reduce((mul, enemy) => {
        if (!enemy || enemy.hp <= 0 || !enemy.trait) return mul;
        return Math.max(mul, Number(enemy.trait.oceanPressureGainMul) || 1);
    }, 1);
    return drainPerSec * pressureCrushMul;
}
