

export function meteorNormalizeMeteorSiteTiers(env, site) {
    site.skyRiftMinTier = Number.isFinite(site.skyRiftMinTier) ? Math.max(1, Math.floor(site.skyRiftMinTier)) : null;
    site.activeMeteorTier = Number.isFinite(site.activeMeteorTier) ? Math.max(8, Math.min(40, Math.floor(site.activeMeteorTier))) : null;
    const returnZoneId = site.meteorReturnZoneId;
    site.meteorReturnZoneId = ['number', 'string'].includes(typeof returnZoneId) && returnZoneId !== env.deps.METEOR_FALL_ZONE_ID ? returnZoneId : null;
}

/** 운석 낙하 지점: 하늘 균열 게이지 · 들어갈 단계 · 돌아갈 사냥터 · 별자리 관측 버프. 별쐐기가 없어지며(2026-10-01)
 * 별쐐기 저장에서 떼어 냈다. 불러오기와 런타임이 같은 정규화를 쓴다. */
export function meteorEnsureMeteorSiteState(env, owner) {
    const site = owner.meteorSite && typeof owner.meteorSite === 'object' ? owner.meteorSite : {};
    owner.meteorSite = site;
    env.deps.METEOR_SITE_FLAGS.forEach(key => { site[key] = !!site[key]; });
    env.deps.METEOR_SITE_NUMBERS.forEach(([key, max, whole]) => {
        const value = Math.min(max, Math.max(0, Number(site[key]) || 0));
        site[key] = whole ? Math.floor(value) : value;
    });
    meteorNormalizeMeteorSiteTiers(env, site);
    // 운석 종류가 생기기 전에 채운 하늘 균열과 원정은 그때처럼 불타는 운석이다.
    const known = env.deps.METEOR_KINDS.some(kind => kind.id === site.kind);
    site.kind = known ? site.kind : (site.skyRiftReady || site.activeMeteorTier ? env.deps.METEOR_KINDS[0].id : null);
    site.constellationBuff = site.constellationBuff && typeof site.constellationBuff === 'object' ? site.constellationBuff : null;
    return site;
}

/** 하늘 균열이 다 찼을 때 떨어질 운석: 다섯 종류가 같은 확률이다. */
export function meteorRollMeteorKind(env, random = Math.random) {
    return env.deps.METEOR_KINDS[Math.min(env.deps.METEOR_KINDS.length - 1, Math.floor(random() * env.deps.METEOR_KINDS.length))].id;
}

/** 정해진 운석(하늘 균열이 다 찼거나 원정 중), 없으면 null. */
export function meteorGetMeteorKind(env, owner, site = meteorEnsureMeteorSiteState(env, owner)) {
    return env.deps.METEOR_KINDS.find(kind => kind.id === site.kind) || null;
}
