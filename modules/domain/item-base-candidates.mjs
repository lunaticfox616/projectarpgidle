

export function itemFlowGetBaseDefenseProfile(base) {
    let ids = new Set((base.baseStats || []).map(stat => stat.id));
    return ['armor', 'evasion', 'energyShield'].filter(id => ids.has(id)).join('+');
}

export function itemFlowGetBaseSecondaryStatSignature(base, slot) {
    let coreStatsBySlot = {
        무기: new Set(['flatDmg']),
        투구: new Set(['flatHp', 'armor', 'evasion', 'energyShield']),
        갑옷: new Set(['flatHp', 'armor', 'evasion', 'energyShield']),
        장갑: new Set(['flatHp', 'armor', 'evasion', 'energyShield', 'aspd']),
        신발: new Set(['flatHp', 'armor', 'evasion', 'energyShield', 'move']),
        목걸이: new Set([]),
        반지: new Set([]),
        허리띠: new Set(['flatHp']),
        방패: new Set(['armor', 'evasion', 'energyShield', 'baseBlockChance'])
    };
    let coreSet = coreStatsBySlot[slot] || new Set();
    return (base.baseStats || [])
        .map(stat => stat.id)
        .filter(statId => !coreSet.has(statId))
        .sort();
}

export function itemFlowGetWeaponBaseArchetype(base) {
    let ids = (base.baseStats || []).map(stat => stat.id);
    if (ids.some(id => id.startsWith('summon'))) return 'summon';
    if (ids.some(id => id.startsWith('projectile'))) return 'projectile';
    if (ids.some(id => id.startsWith('spell'))) return 'spell';
    return 'melee';
}

export function itemFlowGetBaseBuildArchetype(base) {
    if (!base) return 'generic';
    if (base.slot === '무기') return itemFlowGetWeaponBaseArchetype(base);
    if (base.slot === '방패') return `shield:${base.shieldStyle || 'fortress'}`;
    let ids = (base.baseStats || []).map(stat => stat.id);
    if (ids.some(id => id.startsWith('summon'))) return 'summon';
    return 'generic';
}

export function itemFlowGetBaseFamilyUpgradeCandidates(env, currentBase) {
    return env.deps.BASE_ITEM_DB.filter(base => base.slot === currentBase.slot && base.family === currentBase.family
        && base.reqTier > currentBase.reqTier && !base.dropOnly && !base.realmBase).sort((a, b) => a.reqTier - b.reqTier);
}

export function itemFlowGetBaseUpgradeCandidates(env, currentBase) {
    if (currentBase.family) return itemFlowGetBaseFamilyUpgradeCandidates(env, currentBase);
    let currentProfile = itemFlowGetBaseDefenseProfile(currentBase);
    let currentSecondarySignature = itemFlowGetBaseSecondaryStatSignature(currentBase, currentBase.slot);
    let currentArchetype = itemFlowGetBaseBuildArchetype(currentBase);
    let currentCategory = env.deps.getWeaponCategoryOfBase(currentBase.id);
    let isArmorSlot = ['투구','갑옷','장갑','신발','방패'].includes(currentBase.slot);
    let candidates = env.deps.BASE_ITEM_DB
        .filter(base => base.slot === currentBase.slot && base.reqTier > currentBase.reqTier && !base.dropOnly && !base.realmBase && !base.family)
        .filter(base => isArmorSlot ? itemFlowGetBaseDefenseProfile(base) === currentProfile : true)
        .filter(base => itemFlowGetBaseBuildArchetype(base) === currentArchetype)
        // 무기는 같은 대분류 안에서만 승급한다(한손검이 대검이 되지 않게).
        .filter(base => env.deps.getWeaponCategoryOfBase(base.id) === currentCategory)
        .sort((a,b)=>a.reqTier-b.reqTier);
    // 방어구는 방어 프로파일(방어도/회피/보호막)이 정체성이다. 저항 같은 부가 옵션은
    // 부수적이므로, 같은 프로파일끼리 티어 순서대로 이어 준다(저항이 달라도 무방).
    if (isArmorSlot) return candidates;
    // 무기/목걸이/반지/허리띠는 부가 옵션 자체가 정체성이다.
    if (currentSecondarySignature.length > 0) {
        // 1) 부가 옵션 정체성 보존: 현재 부가 옵션을 모두 유지하는(상위 집합) 후보를 우선.
        //    (예: 물리 피해 감소 허리띠가 카오스 저항 허리띠로 바뀌면 안 된다.)
        let preserving = candidates.filter(base => {
            let signature = new Set(itemFlowGetBaseSecondaryStatSignature(base, base.slot));
            return currentSecondarySignature.every(id => signature.has(id));
        });
        if (preserving.length > 0) return preserving;
        // 2) 완전히 다른 부옵션을 가진 베이스끼리는 한 체인으로 묶지 않는다 —
        //    최소한 하나의 부가 옵션을 공유하는 후보만 허용한다.
        return candidates.filter(base => {
            let signature = new Set(itemFlowGetBaseSecondaryStatSignature(base, base.slot));
            return currentSecondarySignature.some(id => signature.has(id));
        });
    }
    return candidates;
}
