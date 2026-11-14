import { ascendNodeValue } from './ascendancy-rule-values.mjs';

/** 나눠갖기(sb2): 소환수가 대신 받은 피해의 일부를 그 소환수의 다음 공격에 싣는다. */
export function ascendNodeStoreSharedBlow(env, owner, summon, taken) {
    if (env.deps.hasKeystone('sb2', owner) && taken > 0) summon.sharedBlow = (Number(summon.sharedBlow) || 0) + taken * ascendNodeValue(env, 'sb2').storePct / 100;
}

export function ascendNodeTakeSharedBlow(summon) {
    const stored = Math.floor(Number(summon.sharedBlow) || 0);
    summon.sharedBlow = 0;
    return stored;
}

/** 야생성(sb3): 소환수가 적을 쓰러뜨리면 생명력과 에너지 보호막을 되찾고, 쓰러진 소환수 하나가 조금 일찍 돌아온다. */
export function ascendNodeOnSummonKill(env, owner, pStats) {
    if (!env.deps.hasKeystone('sb3', owner)) return;
    const v = ascendNodeValue(env, 'sb3'), es = Math.max(0, Number(pStats.energyShield) || 0);
    owner.playerHp = Math.min(env.deps.getPlayerRecoveryHpCap(pStats), (owner.playerHp || 0) + (pStats.maxHp || 0) * v.healPct / 100);
    owner.playerEnergyShield = Math.min(es, (owner.playerEnergyShield || 0) + es * v.healPct / 100);
    const fallen = (owner.summons || []).filter(summon => summon && !summon.alive && summon.respawnAt).sort((a, b) => a.respawnAt - b.respawnAt)[0];
    if (fallen) fallen.respawnAt -= v.reviveMs;
}
