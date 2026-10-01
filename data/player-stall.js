// Each NPC visitor purchases independently. These are initial tuning values, not market prices.
const PLAYER_STALL_RULES = Object.freeze({
    slots: 4, visitMs: 60000, minimumAgeMs: 60000, matureAgeMs: 10 * 60000, repriceDelayMs: 20000,
    // Bounded exponential arrivals: about one minute on average, with quiet gaps and close arrivals.
    minVisitMs: 10000, maxVisitMs: 180000, visitSpreadMs: 52000,
    crowdPriceRatio: 0.4, crowdMinDemand: 0.5, crowdMinMarketValue: 10, crowdMinFit: 0.65,
    crowdBaseChance: 0.1, crowdDiscountChance: 0.5, maxCrowd: 4,
    // Probabilities describe a six-minute decision window, converted to the ordinary average visit rate.
    decisionWindowMs: 6 * 60000, earlyInterest: 0.12, earlyDiscountBoost: 0.68, fullEarlyDiscount: 0.6,
    bargainOfferRate: 0.14,
    // A minority of proposals are deliberately low, independently of the normal sale price.
    lowballOfferRate: 0.15, lowballOfferMin: 0.2, lowballOfferMax: 0.45,
    offlineLimitMs: 12 * 3600000, maxPaymentDew: 5000,
    maxAppraisal: 5000, pricePremium: 1.2, maxAsk: 1000000, historyLimit: 16, salesLimit: 50,
    offerLifetimeMs: 24 * 3600000, offerCooldownMs: 30 * 60000,
    currency: 'formlessDew', currencies: ['magicBud', 'formlessDew', 'goldenRule'],
    proceedsKeys: { magicBud: 'budProceeds', formlessDew: 'proceeds', goldenRule: 'goldProceeds' },
    // Payment ceilings use the best discounted cash-out (5 buds -> 1 dew), not the ordinary 8:1 price unit.
    // Thus changing denomination cannot bypass resale limits. audit-player-stall verifies this boundary.
    // Gold uses its 100-dew purchase unit, exceeding even the best discounted 65.5-dew cash-out.
    paymentDew: { formlessDew: 1, magicBud: 0.2, goldenRule: 100 }
});
const PLAYER_STALL_CUSTOMERS = Object.freeze([
    { name: '여행하는 경비병', buyRate: 1.12, offerRate: 0.8, lowballRate: 0.65, premium: 1, flexibility: 0.55, art: 'guard', stats: ['flatHp','armor','armorPct','resAll','resF','resC','resL','resChaos','blockChance'], slots: ['방패','갑옷','투구'] },
    { name: '뿌리길 사냥꾼', buyRate: 1, offerRate: 1, lowballRate: 1, premium: 1.12, flexibility: 0.6, art: 'hunter', stats: ['flatDmg','pctDmg','aspd','crit','critDmg','projectilePctDmg','dexterity'], slots: ['무기','장갑','신발'] },
    { name: '떠돌이 학자', buyRate: 0.95, offerRate: 1.08, lowballRate: 0.65, premium: 1.16, flexibility: 0.7, art: 'scholar', stats: ['spellFlatPct','spellFlatDmg','energyShield','intelligence','firePctDmg','coldPctDmg','lightPctDmg','chaosPctDmg'], slots: ['무기','목걸이','반지'] },
    { name: '행상인의 견습생', buyRate: 0.88, offerRate: 1.15, lowballRate: 1.7, premium: 0.92, flexibility: 0.3, art: 'apprentice', stats: ['move','regen','flatHp','resAll','evasion'], slots: ['신발','허리띠','반지'] }
]);
// Initial NPC resale tuning, not player-market prices or DPS rankings. Higher T means stronger in this game.
// Weights price one comparable tier/roll: build access > broad offense/survival > conditional utility.
const PLAYER_STALL_APPRAISAL = Object.freeze({
    statGroups: [
        { weight: 2.1, ids: ['gemLevel','spellGemLevel','summonGemLevel','suppCap','summonCap','targetAny','targetProjectile','targetSlam'] },
        { weight: 1.65, ids: ['flatDmg','weaponFlatDmgPct','spellFlatDmg','spellFlatPct','aspd','resPen','physIgnore','projectileExtraChance','flatHp','pctHp','resAll','maxResAll'] },
        { weight: 1.4, ids: ['pctDmg','attackPctDmg','spellPctDmg','crit','critDmg','ds','summonFlatDmg','summonPctDmg','summonAspd','summonCrit','summonCritDmg','summonEfficiency','summonResPen','dr','energyShield','energyShieldPct','blockChance','blockChancePct','maxResF','maxResC','maxResL','maxResChaos'] },
        { weight: 1.15, ids: ['meleePctDmg','projectilePctDmg','physPctDmg','elementalPctDmg','firePctDmg','coldPctDmg','lightPctDmg','chaosPctDmg','dotPctDmg','aoePctDmg','physFlatDmg','fireFlatDmg','coldFlatDmg','lightFlatDmg','chaosFlatDmg','armor','armorPct','evasion','evasionPct','deflectChance','resF','resC','resL','resChaos','move','leech','spellLeech'] },
        { weight: 0.85, ids: ['strength','dexterity','intelligence','accuracy','minDmgRoll','maxDmgRoll','regen','regenFlat','summonHpPct','leechRateCap','leechTotalCap','leechInstanceCap'] },
        { weight: 0.5, ids: ['regenSuppress','stunChance','stunDuration','blindChance','slowChance','thorns','reflectDmg','itemRarity','goldGain'] },
        { weight: 1, ids: ['igniteChance','poisonChance','bleedChance','shockChance','chillChance','freezeChance','corpseExplodeChance','corpseExplodeLifePct','resonancePower'] }
    ],
    // Family follows actual base implicits, not the item's translated name or the player's equipped build.
    families: [
        { key: 'summon', label: '사역', anchors: ['summonPctDmg','summonEfficiency','summonCap'], requires: [['summonFlatDmg','summonPctDmg','summonAspd','summonCrit','summonCritDmg','summonEfficiency','summonGemLevel','summonCap']], stats: ['summonFlatDmg','summonPctDmg','summonAspd','summonCrit','summonCritDmg','summonEfficiency','summonResPen','summonGemLevel','summonCap','summonHpPct','gemLevel','suppCap','pctDmg'] },
        { key: 'spell', label: '주문', anchors: ['spellFlatDmg','spellFlatPct'], requires: [['spellFlatDmg','spellFlatPct','spellPctDmg','spellGemLevel']], stats: ['spellFlatDmg','spellFlatPct','spellPctDmg','spellGemLevel','gemLevel','suppCap','pctDmg','resPen','spellLeech','aspd','crit','critDmg'] },
        { key: 'projectile', label: '투사체', anchors: ['projectilePctDmg','projectileExtraChance'], requires: [['projectilePctDmg','projectileExtraChance','targetProjectile']], stats: ['projectilePctDmg','projectileExtraChance','targetProjectile','aspd','crit','critDmg'] },
        // A generic gem bonus may support either build; spell and summon levels never reinforce one another.
        { key: 'gems', label: '젬 특화', anchors: ['gemLevel','suppCap'], requires: [['gemLevel','suppCap']], stats: ['gemLevel','suppCap','pctDmg','resPen'] },
        { key: 'armor', label: '방어도', anchors: ['armor'], requires: [['armor','armorPct']], stats: ['armor','armorPct','flatHp','pctHp','dr','blockChance','blockChancePct','resAll','resChaos'] },
        { key: 'evasion', label: '회피', anchors: ['evasion'], requires: [['evasion','evasionPct','deflectChance']], stats: ['evasion','evasionPct','deflectChance','flatHp','pctHp','resAll','resChaos','move'] },
        { key: 'energyShield', label: '보호막', anchors: ['energyShield'], requires: [['energyShield','energyShieldPct']], stats: ['energyShield','energyShieldPct','intelligence','resAll','resChaos','blockChance','blockChancePct'] },
        { key: 'attack', label: '공격', anchors: ['flatDmg','aspd','crit'], requires: [['flatDmg','weaponFlatDmgPct','attackPctDmg']], stats: ['flatDmg','weaponFlatDmgPct','attackPctDmg','pctDmg','physFlatDmg','physPctDmg','meleePctDmg','aspd','crit','critDmg','ds','physIgnore','accuracy'] },
        { key: 'resistance', label: '저항', anchors: ['resAll','resChaos','resF','resC','resL'], requires: [['resAll','resChaos','resF','resC','resL']], stats: ['flatHp','pctHp','resAll','resChaos','resF','resC','resL','maxResAll','maxResChaos','maxResF','maxResC','maxResL'] },
        // Affix-only families have no base anchors, so generic implicits cannot grant their alignment bonus.
        { key: 'projectileAttack', anchors: [], align: ['projectile','attack'], requires: [['projectilePctDmg','projectileExtraChance','targetProjectile'],['flatDmg','weaponFlatDmgPct','attackPctDmg']], stats: ['projectilePctDmg','projectileExtraChance','targetProjectile','flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg','accuracy'] },
        { key: 'projectileSpell', anchors: [], align: ['projectile','spell'], requires: [['projectilePctDmg','projectileExtraChance','targetProjectile'],['spellFlatDmg','spellFlatPct','spellPctDmg','spellGemLevel']], stats: ['projectilePctDmg','projectileExtraChance','targetProjectile','spellFlatDmg','spellFlatPct','spellPctDmg','spellGemLevel','aspd','crit','critDmg','resPen'] },
        { key: 'fire', anchors: [], requires: [['fireFlatDmg','firePctDmg']], stats: ['fireFlatDmg','firePctDmg','elementalPctDmg','resPen','igniteChance','crit','critDmg'] },
        { key: 'cold', anchors: [], requires: [['coldFlatDmg','coldPctDmg']], stats: ['coldFlatDmg','coldPctDmg','elementalPctDmg','resPen','chillChance','freezeChance','crit','critDmg'] },
        { key: 'light', anchors: [], requires: [['lightFlatDmg','lightPctDmg']], stats: ['lightFlatDmg','lightPctDmg','elementalPctDmg','resPen','shockChance','crit','critDmg'] },
        { key: 'chaos', anchors: [], requires: [['chaosFlatDmg','chaosPctDmg']], stats: ['chaosFlatDmg','chaosPctDmg','resPen','poisonChance','crit','critDmg'] },
        { key: 'physical', anchors: [], requires: [['physFlatDmg','physPctDmg']], stats: ['physFlatDmg','physPctDmg','physIgnore','bleedChance','crit','critDmg'] },
        { key: 'life', anchors: [], requires: [['flatHp','pctHp']], stats: ['flatHp','pctHp','regen','regenFlat','leech','leechRateCap','leechTotalCap'] },
        { key: 'critical', anchors: [], requires: [['crit'],['critDmg']], stats: ['crit','critDmg'] }
    ],
    slotBase: { 무기: 0.9, 방패: 0.8, 갑옷: 0.85, 투구: 0.7, 장갑: 0.65, 신발: 0.7, 허리띠: 0.65, 반지: 0.65, 목걸이: 0.75 },
    // Non-affix implicits have no MOD_DB T10 range; these are explicit comparison units.
    implicitUnits: { baseBlockChance: 18, flaskUtilSlots: 1, venomStingerBonus: 1 },
    implicitWeights: { baseBlockChance: 1.4, flaskUtilSlots: 2.1, venomStingerBonus: 1.4 },
    rarity: { normal: 0, magic: 0.3, rare: 0.7, unique: 12 },
    unknownWeight: 0.25, resaleFraction: 0.6,
    synergy: { rates: [0, 0, 0.08, 0.16, 0.25, 0.35, 0.45], alignment: 0.08, cap: 0.5 },
    marketCurve: { threshold: 24, minimum: 0.02, lowPower: 3, highLinear: 0.6, highQuadratic: 0.3,
        richThreshold: 42, richCubic: 1, demandPower: 4, uplift: 1.12 }
});
safeExposeData({ PLAYER_STALL_RULES, PLAYER_STALL_CUSTOMERS, PLAYER_STALL_APPRAISAL });
