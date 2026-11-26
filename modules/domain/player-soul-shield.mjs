/** 영혼 흡수(97, 2026-11-26 전달본 V3.25)의 에너지 보호막. 따로 막는 칸을 두지 않고 기존 에너지 보호막(owner.playerEnergyShield)에 얹는다:
 * 최대치(회복 한도) 위로 쌓인 몫이 영혼 보호막이고, 맞으면 그 몫부터 깎인다(맨 위의 층). 영혼 보호막은 저절로 다시 차지 않는다.
 * shield는 전투 런타임 상태(modules/state/combat-runtime.mjs soulShield, 저장하지 않는다): { amount 쌓인 몫, cap 최대치, baseCap 얻을 때의 기본 한도, until, flashAt 전투 시계 ms, lifeMs } | null.
 * 전투 시계가 새로 시작해 until이 lifeMs보다 멀리 남으면 끝난 것으로 본다. */

/** 지금 살아 있는 보호막인가. */
export function soulShieldLive(shield, now) {
    return !!shield && shield.until > now && shield.until - now <= (Number(shield.lifeMs) || 0);
}

/** 아직 남은 영혼 보호막(맞아서 깎인 몫을 뺀 것). */
export function soulShieldRemaining(shield, energyShield, baseCap, now) {
    if (!soulShieldLive(shield, now)) return 0;
    return Math.max(0, Math.min(Number(shield.amount) || 0, (Number(energyShield) || 0) - baseCap));
}

/** 에너지 보호막의 회복 한도: 기본 한도 위로는 남은 영혼 보호막만큼만(다시 차지 않게 지금 값을 넘지 않는다). */
export function energyShieldCapWithSoul(baseCap, energyShield, shield, now) {
    return baseCap + soulShieldRemaining(shield, energyShield, baseCap, now);
}

/** 얻은 양(gain)을 에너지 보호막에 더한다. 기본 한도 위로는 cap까지 쌓이고 lifeMs 동안 간다. @returns {{ shield: object, energyShield: number }} */
export function gainSoulShield(input) {
    const { gain, cap, lifeMs, now, baseCap, energyShield } = input;
    const before = Math.max(0, Number(energyShield) || 0), top = baseCap + Math.max(0, cap);
    const after = Math.max(before, Math.min(top, before + Math.max(0, gain)));
    return { energyShield: after, shield: { amount: Math.max(0, after - baseCap), cap: Math.max(0, cap), baseCap, until: now + lifeMs, flashAt: now, lifeMs } };
}

/** 무대와 HUD가 읽는 지금의 보호막: 남은 양, 최대치, 때. 없거나 끝났으면 null. */
export function soulShieldView(shield, energyShield, now) {
    if (!soulShieldLive(shield, now)) return null;
    const remaining = soulShieldRemaining(shield, energyShield, Number(shield.baseCap) || 0, now);
    return remaining > 0 ? { remaining, cap: shield.cap, flashAt: shield.flashAt, until: shield.until, now } : null;
}
