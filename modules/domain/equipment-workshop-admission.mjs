

export function workshopGetAdmission(env, owner, action) {
    if (['liberateEncroachment', 'applyVoidChisel'].includes(action)) return '';
    if (owner.woodsmanBuildLock) return env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.');
    if (action === 'applyChaosInfusion' && !env.deps.isChaosInfuserUnlocked(owner)) return env.deps._t('나무꾼을 한 번 이상 마주친 뒤 혼돈 주입을 사용할 수 있습니다.');
    const harvestReasons = { applyCorruptSpore: '부패 수확은 고급 수확 제작을 해금해야 쓸 수 있습니다.', applyRiftSpore: '균열 수확은 고급 수확 제작을 해금해야 쓸 수 있습니다.' };
    if (harvestReasons[action] && !env.deps.contentProgression.isUnlocked('advancedSpores', owner)) return env.deps._t(harvestReasons[action]);
    return '';
}
