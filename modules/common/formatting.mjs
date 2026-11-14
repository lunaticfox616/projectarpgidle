function getExceptionalBaseStarCount(item) {
    return ((item && item.baseStats) || []).filter(stat => stat && stat.exceptional).length;
}

function getExceptionalBaseStars(item) {
    return '✦'.repeat(getExceptionalBaseStarCount(item));
}

function getExceptionalBaseStarsHtml(item) {
    let stars = getExceptionalBaseStars(item);
    return stars ? ` <span style="color:#ffb454; font-weight:700;">${stars}</span>` : '';
}

const COMPARE_STAT_META = {
    dps: { label: 'DPS', format: value => `${Math.floor(value)}` },
    summonDps: { label: '소환 DPS', format: value => `${Math.floor(value)}` },
    baseDmg: { label: '공격력', format: value => `${Math.floor(value)}` },
    aspd: { label: '공속', format: value => value.toFixed(2) },
    crit: { label: '치명타', format: value => `${value.toFixed(1)}%` },
    critDmg: { label: '치명타 피해', format: value => `${Math.floor(value)}%` },
    maxHp: { label: '최대 생명력', format: value => `${Math.floor(value)}` },
    armor: { label: '방어도', format: value => `${Math.floor(value)}` },
    armorReduction: { label: '방어도 피해 감소', format: value => `${value.toFixed(1)}%` },
    evasion: { label: '회피', format: value => `${Math.floor(value)}` },
    evadeChance: { label: '회피 확률', format: value => `${value.toFixed(1)}%` },
    energyShield: { label: '에너지 보호막', format: value => `${Math.floor(value)}` },
    energyShieldRegenRate: { label: '에너지 보호막 재생', format: value => `${value.toFixed(1)}%` },
    deflectChance: { label: '비껴내기 확률', format: value => `${value.toFixed(1)}%` },
    deflectDamageReduce: { label: '비껴내기 피해 감소', format: value => `${value.toFixed(1)}%` },
    blockChance: { label: '막기 확률', format: value => `${value.toFixed(1)}%` },
    blockChanceMax: { label: '막기 확률 상한', format: value => `${value.toFixed(1)}%` },
    moveSpeed: { label: '이동 속도', format: value => `${Math.floor(value)}%` },
    dr: { label: '물피감', format: value => `${Math.floor(value)}%` },
    physIgnore: { label: '물피감 무시', format: value => `${Math.floor(value)}%` },
    resPen: { label: '저항 관통', format: value => `${Math.floor(value)}%` },
    resF: { label: '화염 저항', format: value => `${Math.floor(value)}%` },
    resC: { label: '냉기 저항', format: value => `${Math.floor(value)}%` },
    resL: { label: '번개 저항', format: value => `${Math.floor(value)}%` },
    resChaos: { label: '카오스 저항', format: value => `${Math.floor(value)}%` },
    regen: { label: '초당 재생', format: value => `${formatValue('regen', value)}%` },
    leech: { label: '공격 피해 흡수', format: value => `${formatValue('leech', value)}%` },
    spellLeech: { label: '주문 피해 흡수', format: value => `${formatValue('spellLeech', value)}%` },
    leechRateCap: { label: '흡혈 회복 속도', format: value => `+${formatValue('leechRateCap', value)}%p` },
    leechTotalCap: { label: '흡혈 총 회복량', format: value => `+${formatValue('leechTotalCap', value)}%p` },
    leechInstanceCap: { label: '흡혈 관통당 회복량', format: value => `+${formatValue('leechInstanceCap', value)}%p` },
    ds: { label: '연속 타격', format: value => `${Math.floor(value)}%` },
    gemLv: { label: '룬 레벨', format: value => `${Math.floor(value)}` },
    suppCap: { label: '보조 한도', format: value => `${Math.floor(value)}` },
    minDmgRoll: { label: '최소피해 보정', format: value => `${Math.floor(value)}%` },
    maxDmgRoll: { label: '최대피해 보정', format: value => `${Math.floor(value)}%` }
};

function formatSupportGemEffectValue(value) {
    let num = Number(value);
    if (!Number.isFinite(num)) num = 0;
    return num.toFixed(1);
}

/** The stats rolled and shown in tenths (leech, regen and their caps); every other stat is whole. */
const TENTH_STAT_IDS = /* @__PURE__ */ Object.freeze(['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap']);

function isTenthStat(statId) {
    return TENTH_STAT_IDS.includes(statId);
}

// 정수로만 굴리는 옵션(2026-10-27 사용자: "회피같은건 정수로만"): 방어도, 회피, 에너지 보호막과 그 증가, 무기의 기본 피해 증가.
const WHOLE_ROLL_STAT_IDS = /* @__PURE__ */ Object.freeze(['armor', 'evasion', 'energyShield', 'armorPct', 'evasionPct', 'energyShieldPct', 'weaponFlatDmgPct']);

function formatValue(statId, value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    if (isTenthStat(statId)) {
        return numeric.toFixed(2).replace(/0$/, '');
    }
    const rounded = Math.round(numeric * 100) / 100;
    return Number.isInteger(rounded) ? rounded : String(rounded);
}

/** A stat value with its sign, '+12' or '-40' (a drawback line such as 균열유리 로브's 최대 생명력). */
function formatSignedValue(statId, value) {
    return `${Number(value) < 0 ? '' : '+'}${formatValue(statId, value)}`;
}

function formatPercentMultiplier(value) {
    return `${Math.round(value * 100)}%`;
}

function getRarityColor(rarity) {
    if (rarity === 'unique') return '#ff9f43';
    if (rarity === 'rare') return '#f1c40f';
    if (rarity === 'magic') return '#3498db';
    return '#d0d5da';
}

function getRarityRank(rarity) {
    if (rarity === 'normal') return 0;
    if (rarity === 'magic') return 1;
    if (rarity === 'rare') return 2;
    if (rarity === 'unique') return 3;
    return 99;
}

export { getExceptionalBaseStarCount, getExceptionalBaseStars, getExceptionalBaseStarsHtml, COMPARE_STAT_META, formatSupportGemEffectValue, TENTH_STAT_IDS, isTenthStat, WHOLE_ROLL_STAT_IDS, formatValue, formatSignedValue, formatPercentMultiplier, getRarityColor, getRarityRank };
