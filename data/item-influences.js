// GENERATED from modules/data/item-influences.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/item-influences.mjs
  var ITEM_INFLUENCES = Object.freeze({
    red: Object.freeze({
      name: "태양",
      label: "태양 아이템",
      source: "검은 태양의 대사제",
      tone: "#ff7a45",
      line: "base",
      stack: "altar",
      currency: "altarEmber",
      room: "redAltar",
      found: "붉은 제단 장비, 성화 잉걸로 새김",
      feeds: "apex_archbishop"
    }),
    blue: Object.freeze({
      name: "허기",
      label: "허기 아이템",
      source: "세계수를 갉는 자",
      tone: "#3fd6c6",
      line: "base",
      stack: "altar",
      currency: "altarIchor",
      room: "blueAltar",
      found: "푸른 제단 장비, 허기의 즙으로 새김",
      feeds: "apex_devourer"
    }),
    guardian: Object.freeze({
      name: "수호자",
      label: "수호자 아이템",
      source: "지역 수호자",
      tone: "#dfe9f6",
      line: "explicit",
      found: "지역 수호자 보상 장비",
      feeds: "apex_gardener"
    }),
    blight: Object.freeze({
      name: "마름",
      label: "마름 아이템",
      source: "마름 사도",
      tone: "#a6d44a",
      line: "explicit",
      found: "사도 보상 장비",
      feeds: "apex_compost"
    })
  });
  var ITEM_INFLUENCE_RULES = Object.freeze({
    // 제단 방의 몬스터가 떨어뜨린 장비(제단 줄이 있는 부위)가 그 제단의 영향 줄을 달고 나올 확률.
    altarDropChance: 0.2,
    // 수호자 투기장과 사도가 지키는 지도의 몬스터 장비가 영향을 띨 확률. 수호자와 사도의 보상 장비는 모두 띤다.
    fieldChance: 0.08,
    // 영향 줄의 티어: 장비의 추가 옵션 티어 상한(affixTierCap)에서 이만큼 아래까지.
    tierSpread: 5
  });
  var { ALTAR_INFLUENCE_LINES, INFLUENCE_AFFIX_MODS } = (() => {
    const itemInfluenceTiers = (min, max, decimal) => {
      const fine = decimal || Math.round(max - min) + 1 < 20, unit = fine ? 0.01 : 1, units = Math.round((max - min) / unit) + 1;
      const round = (value) => Math.round(value * 100) / 100, out = [];
      let low = min;
      for (let tier = 0; tier < 20; tier++) {
        const width = Math.floor(units * (tier + 1) / 20) - Math.floor(units * tier / 20);
        const high = round(low + (width - 1) * unit);
        out.push(Object.freeze([low, high]));
        low = round(high + unit);
      }
      return Object.freeze(out);
    };
    const altarLines = (() => {
      const line = (statId, min, max, decimal) => Object.freeze({ statId, tierValues: itemInfluenceTiers(min, max, decimal) });
      const slots = (rows) => Object.freeze(Object.fromEntries(Object.entries(rows).map(([slot, list]) => [slot, Object.freeze(list.map((row) => line(...row)))])));
      return Object.freeze({
        // 성화와 검은 태양: 불, 점화, 번지는 불길, 성가의 빠르기, 치명.
        red: slots({
          투구: [["firePctDmg", 6, 65], ["critDmg", 8, 70], ["aoePctDmg", 6, 60], ["maxResF", 0.5, 4, true], ["resPen", 1, 12], ["cooldownRecovery", 2, 14]],
          갑옷: [["maxResF", 0.5, 4, true], ["firePctDmg", 6, 65], ["pctHp", 3, 32], ["igniteDamageMultiplierPct", 4, 40], ["dr", 2, 22]],
          장갑: [["igniteChance", 2, 25], ["igniteDamageMultiplierPct", 4, 40], ["aspd", 2, 22], ["fireFlatDmg", 6, 80], ["crit", 0.5, 5.5, true], ["cooldownRecovery", 2, 14]],
          신발: [["move", 3, 24], ["resF", 3, 26], ["aspd", 2, 18], ["ds", 4, 34], ["critDmg", 8, 60]],
          방패: [["maxResF", 0.5, 4, true], ["firePctDmg", 6, 65], ["igniteChance", 2, 20], ["aoePctDmg", 6, 55], ["critDmg", 8, 60]],
          허리띠: [["pctHp", 3, 32], ["firePctDmg", 6, 60], ["igniteDamageMultiplierPct", 4, 35], ["resF", 3, 26], ["aspd", 2, 18]]
        }),
        // 허기와 갉음: 카오스, 흡혈과 재생, 출혈, 강한 먹잇감.
        blue: slots({
          투구: [["chaosPctDmg", 6, 65], ["spellLeech", 0.1, 0.9, true], ["maxResChaos", 0.5, 3, true], ["bossDamagePct", 3, 30], ["resChaos", 2, 18]],
          갑옷: [["maxResChaos", 0.5, 3, true], ["pctHp", 3, 32], ["regen", 0.2, 1.2, true], ["regenFlat", 10, 120], ["resChaos", 2, 18]],
          장갑: [["leech", 0.1, 0.9, true], ["bleedChance", 2, 25], ["chaosFlatDmg", 6, 80], ["chaosPctDmg", 6, 60], ["aspd", 2, 18]],
          신발: [["move", 3, 24], ["resChaos", 2, 18], ["leech", 0.1, 0.6, true], ["regenFlat", 10, 120], ["bleedChance", 2, 20]],
          방패: [["maxResChaos", 0.5, 3, true], ["chaosPctDmg", 6, 60], ["spellLeech", 0.1, 0.8, true], ["regen", 0.2, 1, true], ["bossDamagePct", 3, 25]],
          허리띠: [["pctHp", 3, 32], ["leech", 0.1, 0.6, true], ["bossDamagePct", 3, 30], ["regen", 0.2, 1.2, true], ["chaosPctDmg", 6, 55]]
        })
      });
    })();
    const affixMods = (() => {
      const row = (influence) => ([id, statId], type, statName, slots, [min, max, decimal, retiredSlots]) => Object.freeze({
        id,
        statId,
        type,
        statName,
        slots: Object.freeze(slots),
        ...retiredSlots ? { retiredSlots: Object.freeze(retiredSlots) } : {},
        influences: Object.freeze([influence]),
        weight: 0.6,
        affixBalanceVersion: 2,
        tierValues: itemInfluenceTiers(min, max, decimal)
      });
      const [guardian, blight] = ["guardian", "blight"].map(row);
      return Object.freeze([
        // 지역 수호자: 버티고 막고, 보스를 상대하고, 흔들림 없이 친다.
        guardian(["guardianBlockMax", "blockChanceMax"], "suffix", "막기 확률 최대치(+%p)", ["방패", "갑옷", "허리띠"], [0.5, 4, true]),
        guardian(["guardianDotTaken", "dotTakenDamageReducePct"], "suffix", "받는 지속 피해 감소(%)", ["투구", "갑옷", "신발", "허리띠"], [2, 16]),
        guardian(["guardianEsRegen", "energyShieldRegen"], "suffix", "에너지 보호막 재생률(%)", ["투구", "갑옷", "방패", "신발"], [2, 16]),
        guardian(["guardianMaxResAll", "maxResAll"], "suffix", "모든 원소 최대 저항(%)", ["투구", "갑옷", "허리띠"], [0.5, 2.5, true]),
        guardian(["guardianMinRoll", "minDmgRoll"], "prefix", "최소 피해 보정(%)", ["장갑", "반지", "목걸이"], [3, 25]),
        guardian(["guardianBoss", "bossDamagePct"], "prefix", "보스 처치 피해(%)", ["무기", "장갑", "목걸이", "반지"], [4, 40]),
        guardian(["guardianFirstStrike", "firstStrikeDamagePct"], "prefix", "선제 타격 피해(%)", ["무기", "장갑", "신발"], [6, 60]),
        guardian(["guardianDouble", "doubleDamageChance"], "suffix", "확률로 2배의 피해를 줌(%)", ["무기", "목걸이", "반지"], [1, 8, true]),
        guardian(["guardianMobilityCooldown", "mobilityCooldownRecovery"], "suffix", "이동 스킬 재사용 대기시간 회복 속도(%)", ["신발", "장갑", "목걸이"], [3, 20]),
        // 마름 사도: 썩히고 퍼뜨리고, 낫지 못하게 하고, 들쭉날쭉 세게 친다.
        blight(["blightPoisonChance", "poisonChance"], "suffix", "중독 확률(%)", ["무기", "장갑", "반지", "목걸이", "방패"], [2, 25]),
        blight(["blightPoisonDamage", "poisonDamageMultiplierPct"], "prefix", "중독 피해 증가(%)", ["무기", "장갑", "반지", "허리띠"], [5, 50]),
        blight(["blightRegenSuppress", "regenSuppress"], "suffix", "재생 억제(%)", ["무기", "투구", "장갑"], [0.2, 1.6, true]),
        blight(["blightRotDamage", "dotPctDmg"], "prefix", "지속 피해 배율(%)", ["투구", "허리띠", "신발"], [4, 40, false, ["갑옷"]]),
        blight(["blightElite", "eliteDamagePct"], "prefix", "정예 처치 피해(%)", ["투구", "목걸이", "신발"], [4, 40]),
        blight(["blightMaxRoll", "maxDmgRoll"], "prefix", "최대 피해 보정(%)", ["장갑", "반지", "목걸이"], [3, 25]),
        blight(["blightChaosRes", "maxResChaos"], "suffix", "최대 카오스 저항(%)", ["갑옷", "방패", "허리띠"], [0.5, 3, true]),
        blight(["blightCooldownCut", "cooldownReduction"], "suffix", "재사용 대기시간 감소(%)", ["투구", "목걸이", "반지"], [1, 6])
      ]);
    })();
    return { ALTAR_INFLUENCE_LINES: altarLines, INFLUENCE_AFFIX_MODS: affixMods };
  })();
  var SWAPPED_UNIQUE_LINES = Object.freeze([
    ["firePctDmg", 20, 45],
    ["coldPctDmg", 20, 45],
    ["lightPctDmg", 20, 45],
    ["chaosPctDmg", 20, 45],
    ["physPctDmg", 20, 45],
    ["dotPctDmg", 15, 35],
    ["aoePctDmg", 15, 35],
    ["critDmg", 20, 60],
    ["crit", 2, 6],
    ["aspd", 6, 15],
    ["move", 6, 15],
    ["pctHp", 8, 20],
    ["flatHp", 40, 120],
    ["resAll", 8, 20],
    ["dr", 6, 15],
    ["leech", 0.4, 1.2],
    ["regen", 0.4, 1.2],
    ["energyShieldRegen", 6, 16],
    ["dotTakenDamageReducePct", 5, 12],
    ["blockChanceMax", 1, 3],
    ["resPen", 4, 12],
    ["igniteChance", 8, 25],
    ["igniteDamageMultiplierPct", 15, 35],
    ["poisonChance", 8, 25],
    ["poisonDamageMultiplierPct", 15, 35],
    ["bleedChance", 8, 25],
    ["minDmgRoll", 5, 20],
    ["maxDmgRoll", 5, 20],
    ["eliteDamagePct", 15, 35],
    ["bossDamagePct", 15, 35],
    ["spellCritDmg", 20, 40],
    ["doubleDamageChance", 3, 8],
    ["firstStrikeDamagePct", 15, 45]
  ].map(([statId, min, max]) => Object.freeze({ statId, min, max })));
  var SWAPPED_UNIQUE_META = Object.freeze({ name: "뒤바뀐", label: "뒤바뀐 아이템", tone: "#c792ff" });

  // modules/data/item-influences.mjs:classic
  Object.assign(globalThis, { ITEM_INFLUENCES, ITEM_INFLUENCE_RULES, ALTAR_INFLUENCE_LINES, INFLUENCE_AFFIX_MODS, SWAPPED_UNIQUE_LINES, SWAPPED_UNIQUE_META });
  if (typeof safeExposeData === "function") safeExposeData({ ITEM_INFLUENCES, ITEM_INFLUENCE_RULES, ALTAR_INFLUENCE_LINES, INFLUENCE_AFFIX_MODS, SWAPPED_UNIQUE_LINES, SWAPPED_UNIQUE_META });
})();
