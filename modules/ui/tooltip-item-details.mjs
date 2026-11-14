/** The '세계수 기운' line of an item that remembers its atlas region (item.dropRegion), in the region's colour; '' otherwise. */
export function getItemDropRegionLineHtml(runtime, item) {
    const region = item && item.dropRegion ? runtime.deps.ATLAS.regions.find(row => row.id === item.dropRegion) : null;
    return region ? `<div class="tooltip-line" style="color:${runtime.deps.REGION_AFFIX_TONES[region.id]};">${(0, runtime.deps._t)('🌳 세계수 기운: {name}', { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name)) })}</div>` : '';
}

export function getItemSlotDisplayLabel(runtime, item, fallbackLabel) {
    let rawSlot = item?.slot ?? null;
    if (rawSlot === null && item && Array.isArray(item.slots) && item.slots.length > 0) rawSlot = item.slots[0];
    let label = rawSlot !== null ? rawSlot : (fallbackLabel || '장비');
    // 부위 이름은 저장 키이기도 해서 여기서만 현재 언어로 옮긴다(docs/i18n.md).
    return (0, runtime.deps._t)((0, runtime.deps.weaponCategorySlotLabel)(item, String(label || '장비').replace(/[12]$/, '')));
}

export function getItemStatRollRange(runtime, stat, options) {
    if (!stat) return null;
    let min = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : Number(stat.baseRollMin);
    let max = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : Number(stat.baseRollMax);
    if ((!Number.isFinite(min) || !Number.isFinite(max)) && options && options.estimateFromValue) {
        let cur = Number(stat.val || 0);
        min = Number((cur * 0.8).toFixed(2));
        max = Number((cur * 1.2).toFixed(2));
    }
    return orderedItemRollBounds(min, max);
}

function orderedItemRollBounds(min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return max < min ? { min: max, max: min } : { min, max };
}

export function getItemStatRollRangeHtml(runtime, stat, options) {
    let statKey = stat && (stat.id || stat.stat);
    let range = getItemStatRollRange(runtime, stat, options);
    if (!range) return '';
    return ` <span style="color:#888;">(${(0, runtime.deps.formatValue)(statKey, range.min)}~${(0, runtime.deps.formatValue)(statKey, range.max)})</span>`;
}

export function getHoneyLockBadgeHtml(runtime, stat) {
    return stat && stat.lockedByHoney
        ? ' <span class="item-affix-lock item-affix-lock--honey" data-tip="마력 깃든 벌꿀로 고정되어 재련/소멸되지 않는 옵션">🍯 벌꿀 고정</span>'
        : '';
}

export function getUniqueEffectApplicationHint(runtime, item, isEquipped, equipSlotKey) {
    if (!item || item.rarity !== 'unique' || !item.uniqueEffectKey) return '';
    let key = String(item.uniqueEffectKey || '');
    if (key === 'rightRingSummonCap') {
        if (isEquipped && equipSlotKey !== '반지2') return '현재 조건 미충족: 오른쪽 반지 슬롯에 장착해야 적용';
        return '오른쪽 반지 슬롯 전용';
    }
    let triggerLabels = {
        summonDeathDamageBuff: '소환수 사망 시 발동',
        summonCritAspdStacks: '소환수 치명타 적중 시 발동',
        blockRecoverEnergyShieldPct: '막기 성공 시 발동',
        deflectGrantShadowStealth: '비껴내기 성공 시 발동',
        hitShockedEnemyDamageMorePct: '감전된 적을 타격할 때 적용',
        stackingElementalResDownOnHit: '원소 피해 적중 시 중첩',
        projectileExtraShotChance: '투사체 공격 시 확률 발동',
        maxRollBonusHit: '최대 피해 조건을 만족한 타격 시 발동',
        leechEfficiencyOnKill: '적 처치 시 발동',
        corpseExplodeOnKill: '적 처치 시 확률 발동',
        stealEliteTrait: '정예 처치 시 발동',
        realmRiftWaveOnHit: '적중 시 확률 발동',
        realmInvulnerableBarrierOnHit: '피격 시 확률 발동',
        realmAllResDownOnHit: '적중 시 중첩',
        realmKillMoveStacks: '적 처치 시 중첩',
        meteorFootsteps: '이동 중 확률 발동',
        queenBeeSummonOnHit: '적중 시 확률 발동',
        implicitAmp: '이 장비의 기본 옵션에 적용',
        loopGrowth: '지금 루프 수만큼 적용',
        familyBond: '장착한 수평 베이스 수만큼 적용',
        sightBeyond: '탐험 지도에서 적용',
        chestLuck: '탐험 지도를 열 때 적용',
        emberHeart: '장착한 타락 장비 수만큼 적용',
        amberTime: '장착한 장비의 품질 합만큼 적용',
        witheredEcho: '목걸이에 새긴 노드 수만큼 적용',
        nurseryBloom: '그루터기 함의 성장 완료된 꽃, 열매, 덩굴, 뿌리 수만큼 적용',
        // 체이싱 고유(2026-10-20, data/items.js): 수만큼 자라는 넷과 잔잔한 사건(js/combat-incidents.js)을 바꾸는 넷, 액막이 허리띠.
        uniqueChorus: '장착한 고유 장비 수만큼 적용',
        rareBark: '장착한 희귀 장비 수만큼 적용',
        wardVow: '끼운 액막이 수만큼 적용',
        emptyPlaces: '비어 있는 장비 칸 수만큼 적용',
        critterLure: '금빛 수액 슬라임을 만날 때 적용',
        goldenTouch: '적 처치 시 확률 발동',
        repdigitLuck: '행운의 숫자에 적용',
        drowsyIncense: '처음 들어선 전투 방에서 확률 발동',
        wardString: '액막이 칸과 끼운 액막이에 적용',
        uniqueTakenReduceWhen1Enemy: '생존한 적이 1명일 때만 적용',
        uniqueTakenReduceWhen2Enemies: '생존한 적이 2명 이상일 때만 적용',
        crowdEvasionMore: '요구 적 수를 만족할 때만 적용',
        mirrorOppositeRing: '반대쪽 반지의 옵션을 복제',
        kaleidoscopeShield: '이 장비의 추가 옵션에 적용'
    };
    if (triggerLabels[key]) return triggerLabels[key];
    if (/OnHit|onHit|OnKill|onKill|OnCrit|onCrit|OnBlock|onBlock/.test(key)) return '전투 조건 충족 시 발동';
    return '';
}

export function getPlayerStatComparisonLines(runtime, before, after) {
    return Object.keys(runtime.deps.COMPARE_STAT_META).map(key => {
        let diff = (after[key] || 0) - (before[key] || 0);
        if (Math.abs(diff) < 0.001) return null;
        let meta = runtime.deps.COMPARE_STAT_META[key];
        let color = diff > 0 ? '#2ecc71' : '#e74c3c';
        let sign = diff > 0 ? '▲' : '▼';
        return `<div class="tooltip-line item-compare-line"><span style="color:${color}">${sign}</span> ${(0, runtime.deps._t)(meta.label)}: <span style="color:${color}">${meta.format(Math.abs(diff))}</span></div>`;
    }).filter(Boolean);
}
