

/** @param {string} currencyKey @param {number} amount @param {'reward'|'drop'} source */
/** The currency and whole amount an award would commit; refused when a drop of a still-locked currency is dropped. */
export function acquireResolveCurrencyAward(env, owner, currencyKey, amount, source = 'reward') {
    const key = env.deps.getCanonicalCurrencyKey(currencyKey);
    if (source === 'drop' && !env.deps.contentProgression.canDropCurrency(key, owner)) return { key, gain: 0, refused: true };
    let gain = Number(amount || 0);
    if (gain > 0) gain = Math.max(1, Math.floor(gain));
    return { key, gain, refused: false };
}

export function* acquireAwardCurrency(env, owner, currencyKey, amount, source = 'reward') {
    const award = acquireResolveCurrencyAward(env, owner, currencyKey, amount, source);
    if (award.refused) return 0;
    (yield* acquireCommitCurrencyGain(env, owner, award.key, award.gain));
    return award.gain;
}

/** Commit an already resolved amount without applying expert multipliers again. */
export function* acquireCommitCurrencyGain(env, owner, currencyKey, gain) {
    if (currencyKey === 'condensedSkyPower') {
        let st = env.deps.ensureSkyTowerState(owner);
        st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + gain;
        env.deps.combatLootReceipts.currency(owner,currencyKey,gain);
        owner.currencyDropVersion = Math.max(0, Math.floor(owner.currencyDropVersion || 0)) + 1;
        return;
    }
    owner.currencies[currencyKey] = (owner.currencies[currencyKey] || 0) + gain;
    env.deps.currencyExchange.noteSeen(owner, currencyKey);
    env.deps.combatLootReceipts.currency(owner,currencyKey,gain);
    owner.currencyDropVersion = Math.max(0, Math.floor(owner.currencyDropVersion || 0)) + 1;
    (yield* acquireNotifyCurrencyAcquisition(owner, currencyKey, gain));
}

export function* acquireNotifyCurrencyAcquisition(owner, currencyKey, gain) {
    if ((currencyKey === 'chaosKey' || currencyKey === 'coreKey') && gain > 0) {
        // 둘 중 하나라도 습득하면 지도 알람을 띄운다(5차 미궁 시련/재능 개화 도전 알림).
        if (owner.noti) owner.noti.map = true;
    }
    if (currencyKey === 'ouroboros' && gain > 0) {
        owner.woodsmanTouchSeen = true;
    }
    const unlocked=acquireUnlockLegacyCurrencyFeatures(owner, currencyKey);
    (yield { kind: 'acquisitionEvent', args: ['currency-acquired', {currencyKey,gain,unlocked}] });
}

export function acquireUnlockLegacyCurrencyFeatures(owner, currencyKey) {
    const unlocked={gem:false};
    if (!owner.contentProgression && !owner.gemEnhanceUnlocked && (currencyKey === 'bossCore' || currencyKey === 'skyEssence')) {
        owner.gemEnhanceUnlocked = true;
        owner.noti.skills = true;
        unlocked.gem=true;
    }
    return unlocked;
}
