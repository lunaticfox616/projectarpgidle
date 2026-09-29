// NPC purchases consume this finite demand budget. These are initial tuning values, not market prices.
const PLAYER_STALL_RULES = Object.freeze({
    slots: 4, visitMs: 6 * 60000, minimumAgeMs: 12 * 60000,
    offlineLimitMs: 12 * 3600000, dewPerHour: 12, walletCap: 120,
    maxAppraisal: 100, pricePremium: 1.2, maxAsk: 1000000, historyLimit: 16,
    currency: 'formlessDew'
});
const PLAYER_STALL_CUSTOMERS = Object.freeze([
    { name: '여행하는 경비병', stats: ['flatHp','armor','armorPct','resAll','resF','resC','resL','resChaos','blockChance'], slots: ['방패','갑옷','투구'] },
    { name: '뿌리길 사냥꾼', stats: ['flatDmg','pctDmg','aspd','crit','critDmg','projectilePctDmg','dexterity'], slots: ['무기','장갑','신발'] },
    { name: '떠돌이 학자', stats: ['spellFlatPct','spellFlatDmg','energyShield','intelligence','firePctDmg','coldPctDmg','lightPctDmg','chaosPctDmg'], slots: ['무기','목걸이','반지'] },
    { name: '행상인의 견습생', stats: ['move','regen','flatHp','resAll','evasion'], slots: ['신발','허리띠','반지'] }
]);
safeExposeData({ PLAYER_STALL_RULES, PLAYER_STALL_CUSTOMERS });
