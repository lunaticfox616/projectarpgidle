function safeExposeData(map) {
  Object.keys(map || {}).forEach(function (key) {
    if (typeof window[key] === "undefined") window[key] = map[key];
  });
}

// Phase-1 extracted data (global compatibility).
const UNIQUE_DB = [
    { name: "첫 계약", slots: ["무기"], reqTier: 1, uniqueEffect: "소환수 최대 한도 +1", uniqueEffectKey: "summonCapBonus", uniqueEffectParams: { cap: 1 }, stats: [{ id: "summonFlatDmg", min: 4, max: 8 }, { id: "summonPctDmg", min: 12, max: 18 }, { id: "summonEfficiency", min: 6, max: 10 }, { id: 'summonResPen', min: 14.7, max: 16.8 }, { id: 'critDmg', min: 46.7, max: 53.1 }] },
    { name: "무리의 서약", slots: ["무기"], reqTier: 6, uniqueEffect: "소환수 최대 한도 +1", uniqueEffectKey: "summonCapBonus", uniqueEffectParams: { cap: 1 }, stats: [{ id: "summonPctDmg", min: 18, max: 28 }, { id: "summonHpPct", min: 16, max: 24 }, { id: "summonAspd", min: 8, max: 14 }, { id: "resAll", min: 6, max: 10 }, { id: 'elementalPctDmg', min: 30, max: 34.3 }, { id: 'minDmgRoll', min: 16, max: 18.1 }] },
    { name: "묘지종 사령홀", slots: ["무기"], reqTier: 10, uniqueEffect: "소환수 사망 시 4초 동안 소환수 피해 +40%", uniqueEffectKey: "summonDeathDamageBuff", uniqueEffectParams: { pct: 40, duration: 4 }, stats: [{ id: "summonHpPct", min: 28, max: 42 }, { id: "summonPctDmg", min: 24, max: 36 }, { id: "summonEfficiency", min: 10, max: 16 }, { id: "resChaos", min: 10, max: 16 }, { id: 'summonCritDmg', min: 32, max: 36.3 }, { id: 'elementalPctDmg', min: 30, max: 34.3 }] },
    { name: "칼날폭풍 지휘봉", slots: ["무기"], reqTier: 12, uniqueEffect: "소환수가 치명타 적중 시 4초 동안 소환수 공격 속도 +10% (3중첩)", uniqueEffectKey: "summonCritAspdStacks", uniqueEffectParams: { aspd: 10, maxStacks: 3, duration: 4 }, stats: [{ id: "summonAspd", min: 16, max: 24 }, { id: "summonCrit", min: 5, max: 8 }, { id: "summonCritDmg", min: 28, max: 45 }, { id: "summonPctDmg", min: 24, max: 36 }, { id: "summonResPen", min: 4, max: 7 }] },
    { name: "뭉툭한 사역 지팡이", slots: ["무기"], reqTier: 15, uniqueEffect: "소환수의 비-치명타 피해 없음", uniqueEffectKey: "summonNonCritNoDamage", stats: [{ id: "summonPctDmg", min: 38, max: 56 }, { id: "summonCritDmg", min: 50, max: 80 }, { id: "summonCrit", min: 40, max: 60 }, { id: "summonEfficiency", min: 14, max: 22 }, { id: "resAll", min: 8, max: 14 }] },
    { name: "효율적인 아콘 사역마 지팡이", slots: ["무기"], reqTier: 16, uniqueEffect: "소환수 최대 한도 +2", uniqueEffectKey: "summonCapBonus", uniqueEffectParams: { cap: 2 }, stats: [{ id: "summonPctDmg", min: 45, max: 68 }, { id: "summonEfficiency", min: 18, max: 30 }, { id: "summonHpPct", min: 24, max: 38 }, { id: "summonAspd", min: 12, max: 20 }, { id: "summonCritDmg", min: 35, max: 60 }, { id: "resAll", min: 10, max: 16 }] },
    { name: "새끼 사역마의 인장", slots: ["반지"], reqTier: 6, uniqueEffect: "소환수 효율 +10%", uniqueEffectKey: "summonEfficiencyBonus", uniqueEffectParams: { pct: 10 }, stats: [{ id: "summonPctDmg", min: 16, max: 24 }, { id: "summonHpPct", min: 16, max: 24 }, { id: "resAll", min: 6, max: 10 }, { id: "leech", min: 0.4, max: 0.8 }, { id: 'summonFlatDmg', min: 29.3, max: 33.6 }, { id: 'summonEfficiency', min: 22.7, max: 25.9 }] },
    { name: "군주의 오른손 고리", slots: ["반지"], reqTier: 15, uniqueEffect: "오른쪽에 장착 시 소환수 최대 한도 +1", uniqueEffectKey: "rightRingSummonCap", uniqueEffectParams: { cap: 1 }, stats: [{ id: "summonPctDmg", min: 26, max: 40 }, { id: "summonEfficiency", min: 14, max: 22 }, { id: "summonCrit", min: 5, max: 8 }, { id: "summonCritDmg", min: 25, max: 45 }, { id: "crit", min: 4, max: 7 }, { id: "resAll", min: 8, max: 14 }] },
    { name: "찌그러진 생존 방패", slots: ["방패"], reqTier: 1, uniqueEffect: "받는 피해 감소 +2%", uniqueEffectKey: "genericTakenDamageReducePct", uniqueEffectParams: { pct: 2 }, stats: [{ id: "armor", min: 50, max: 80 }, { id: "flatHp", min: 25, max: 40 }, { id: "resAll", min: 3, max: 6 }, { id: 'energyShieldPct', min: 30.7, max: 34.9 }, { id: 'regen', min: 0.73, max: 0.84 }] },
    { name: "철벽의 심장판", slots: ["방패"], reqTier: 8, uniqueEffect: "막기 확률 +5%", uniqueEffectKey: "uniqueBlockChance", uniqueEffectParams: { chance: 5 }, stats: [{ id: "armor", min: 150, max: 220 }, { id: "armorPct", min: 20, max: 30 }, { id: "flatHp", min: 60, max: 90 }, { id: "dr", min: 5, max: 8 }, { id: 'evasionPct', min: 30.7, max: 34.9 }, { id: 'regen', min: 0.73, max: 0.84 }] },
    { name: "접이식 방패", slots: ["방패"], reqTier: 8, uniqueEffect: "빗겨내기 피해 감소 +5%", uniqueEffectKey: "uniqueDeflectDamageReduce", uniqueEffectParams: { pct: 5 }, stats: [{ id: "evasion", min: 120, max: 200 }, { id: "evasionPct", min: 20, max: 30 }, { id: "deflectChance", min: 5, max: 10 }, { id: "move", min: 6, max: 10 }, { id: 'resAll', min: 15.3, max: 17.5 }, { id: 'flatHp', min: 76.7, max: 87.3 }] },
    { name: "별빛 응축기", slots: ["방패"], reqTier: 12, uniqueEffect: "막아낼 시 에너지 보호막의 2% 회복", uniqueEffectKey: "blockRecoverEnergyShieldPct", uniqueEffectParams: { pct: 2 }, stats: [{ id: "energyShield", min: 140, max: 220 }, { id: "energyShieldPct", min: 24, max: 36 }, { id: "energyShieldRegen", min: 12, max: 20 }, { id: "blockChanceMax", min: 3, max: 3 }, { id: "resAll", min: 8, max: 14 }] },
    { name: "용비늘 방패", slots: ["방패"], reqTier: 12, uniqueEffect: "적 2명 이상일 때 받는 피해 감소 +10%", uniqueEffectKey: "uniqueTakenReduceWhen2Enemies", uniqueEffectParams: { pct: 10 }, stats: [{ id: "armor", min: 120, max: 180 }, { id: "evasion", min: 110, max: 170 }, { id: "dr", min: 4, max: 7 }, { id: "ds", min: 5, max: 8 }, { id: "meleePctDmg", min: 18, max: 28 }] },
    { name: "성소의 맹세", slots: ["방패"], reqTier: 12, uniqueEffect: "최대 원소 저항 +2%", uniqueEffectKey: "uniqueMaxResAll", uniqueEffectParams: { pct: 2 }, stats: [{ id: "armor", min: 120, max: 180 }, { id: "energyShield", min: 100, max: 160 }, { id: "flatHp", min: 70, max: 110 }, { id: "resAll", min: 10, max: 16 }, { id: "regen", min: 1.0, max: 1.6 }] },
    { name: "달그림자", slots: ["방패"], reqTier: 12, uniqueEffect: "빗겨내기 성공 시 3초 동안 은신 상태 부여, 은신 상태는 이동 속도 +20%, 회피 +20%, 치명타 피해 배율 +20%", uniqueEffectKey: "deflectGrantShadowStealth", uniqueEffectParams: { duration: 3, move: 20, evasionPct: 20, critDmg: 20 }, stats: [{ id: "evasion", min: 120, max: 180 }, { id: "energyShield", min: 100, max: 160 }, { id: "crit", min: 5, max: 8 }, { id: "resPen", min: 5, max: 8 }, { id: "deflectChance", min: 8, max: 14 }] },
    { name: "아스트랄 수호성", slots: ["방패"], reqTier: 16, uniqueEffect: "받는 카오스 피해 감소 +15%", uniqueEffectKey: "chaosTakenDamageReducePct", uniqueEffectParams: { pct: 15 }, stats: [{ id: "evasion", min: 180, max: 260 }, { id: "energyShield", min: 160, max: 240 }, { id: "evasionPct", min: 22, max: 34 }, { id: "energyShieldPct", min: 22, max: 34 }, { id: "resAll", min: 12, max: 18 }, { id: "dotTakenDamageReducePct", min: 8, max: 12 }] },
    { name: "새벽 현자 후드", slots: ["투구"], reqTier: 1, uniqueEffect: "모든 스킬 젬 레벨 +1", uniqueEffectKey: "uniqueGemLevelBonus", uniqueEffectParams: { level: 1 }, stats: [{ id: "energyShield", min: 45, max: 70 }, { id: "spellFlatPct", min: 8, max: 14 }, { id: "resAll", min: 4, max: 8 }, { id: 'dr', min: 14.7, max: 16.8 }, { id: 'energyShieldPct', min: 30.7, max: 34.9 }] },
    { name: "맹세의 바르부트", slots: ["투구"], reqTier: 4, uniqueEffect: "받는 피해 감소 +3%", uniqueEffectKey: "genericTakenDamageReducePct", uniqueEffectParams: { pct: 3 }, stats: [{ id: "armor", min: 70, max: 110 }, { id: "energyShield", min: 60, max: 100 }, { id: "flatHp", min: 35, max: 55 }, { id: "resAll", min: 6, max: 10 }, { id: 'evasionPct', min: 30.7, max: 34.9 }, { id: 'pctHp', min: 22.7, max: 25.9 }] },
    { name: "사제의 왕관", slots: ["투구"], reqTier: 8, uniqueEffect: "받은 피해의 25%를 4초에 걸쳐 생명력으로 회생", uniqueEffectKey: "lifeRecoupTakenDamage", uniqueEffectParams: { pct: 25, duration: 4 }, stats: [{ id: "energyShield", min: 100, max: 150 }, { id: "resAll", min: 12, max: 20 }, { id: "elementalPctDmg", min: 18, max: 28 }, { id: "resPen", min: 4, max: 7 }, { id: "critDmg", min: 20, max: 35 }] },
    { name: "철면피", slots: ["투구"], reqTier: 9, uniqueEffect: "출혈에 면역", uniqueEffectKey: "immuneBleed", stats: [{ id: "armor", min: 130, max: 190 }, { id: "armorPct", min: 18, max: 28 }, { id: "flatHp", min: 50, max: 80 }, { id: "dr", min: 4, max: 7 }, { id: 'critDmg', min: 46.7, max: 53.1 }, { id: 'evasionPct', min: 30.7, max: 34.9 }] },
    { name: "생존자의 외투", slots: ["갑옷"], reqTier: 1, uniqueEffect: "적 1명일 때 받는 피해 감소 +4%", uniqueEffectKey: "uniqueTakenReduceWhen1Enemy", uniqueEffectParams: { pct: 4 }, stats: [{ id: "evasion", min: 40, max: 100 }, { id: "flatHp", min: 40, max: 65 }, { id: "move", min: 4, max: 7 }, { id: 'resAll', min: 15.3, max: 17.5 }, { id: 'pctHp', min: 22.7, max: 25.9 }] },
    { name: "어느 성전사의 낡은 판금", slots: ["갑옷"], reqTier: 4, uniqueEffect: "생명력의 10%만큼을 에너지 보호막으로 획득", uniqueEffectKey: "lifePctAsEnergyShield", uniqueEffectParams: { pct: 10 }, stats: [{ id: "armor", min: 120, max: 180 }, { id: "energyShield", min: 90, max: 140 }, { id: "resAll", min: 7, max: 12 }, { id: "dr", min: 3, max: 5 }, { id: 'energyShieldPct', min: 30.7, max: 34.9 }, { id: 'armorPct', min: 30.7, max: 34.9 }] },
    { name: "별무리", slots: ["갑옷"], reqTier: 8, uniqueEffect: "연속 타격 +8%, 스킬 타겟 수 +1", uniqueEffectKey: "dsAndTargetAnyBonus", uniqueEffectParams: { ds: 8, target: 1 }, stats: [{ id: "armor", min: 120, max: 180 }, { id: "evasion", min: 120, max: 180 }, { id: "resAll", min: 10, max: 16 }, { id: "critDmg", min: 18, max: 30 }, { id: "aspd", min: 6, max: 10 }] },
    { name: "맹독 외투", slots: ["갑옷"], reqTier: 9, uniqueEffect: "중독 피해 25% 증폭", uniqueEffectKey: "poisonDamageMorePct", uniqueEffectParams: { pct: 25 }, stats: [{ id: "evasion", min: 130, max: 200 }, { id: "poisonChance", min: 12, max: 20 }, { id: "chaosPctDmg", min: 18, max: 28 }, { id: "resChaos", min: 10, max: 16 }, { id: "dotPctDmg", min: 10, max: 18 }] },
    { name: "조류의 수호흉갑", slots: ["갑옷"], reqTier: 11, uniqueEffect: "동결에 면역", uniqueEffectKey: "immuneFreeze", stats: [{ id: "flatHp", min: 90, max: 135 }, { id: "resC", min: 16, max: 24 }, { id: "dotTakenDamageReducePct", min: 8, max: 12 }, { id: "regen", min: 1.0, max: 1.6 }, { id: "resAll", min: 8, max: 14 }] },
    { name: "숨은 칼날 장갑", slots: ["장갑"], reqTier: 1, uniqueEffect: "최소 피해 보정 +5%", uniqueEffectKey: "uniqueMinDmgRoll", uniqueEffectParams: { pct: 5 }, stats: [{ id: "aspd", min: 8, max: 12 }, { id: "evasion", min: 35, max: 60 }, { id: "crit", min: 2, max: 4 }, { id: 'ds', min: 23.3, max: 26.5 }, { id: 'regen', min: 0.73, max: 0.84 }] },
    { name: "보호장갑", slots: ["장갑"], reqTier: 4, uniqueEffect: "막기 확률 +4%", uniqueEffectKey: "uniqueBlockChance", uniqueEffectParams: { chance: 4 }, stats: [{ id: "armor", min: 55, max: 90 }, { id: "energyShield", min: 45, max: 80 }, { id: "resAll", min: 5, max: 9 }, { id: "dr", min: 2, max: 4 }, { id: 'pctHp', min: 22.7, max: 25.9 }, { id: 'energyShieldPct', min: 30.7, max: 34.9 }] },
    { name: "잔류전류", slots: ["장갑"], reqTier: 8, uniqueEffect: "타격이 항상 감전 부여", uniqueEffectKey: "alwaysShock", stats: [{ id: "aspd", min: 12, max: 18 }, { id: "crit", min: 5, max: 8 }, { id: "lightPctDmg", min: 18, max: 28 }, { id: "shockEffect", min: 20, max: 35 }, { id: "resL", min: 10, max: 16 }] },
    { name: "번개 강타", slots: ["장갑"], reqTier: 10, uniqueEffect: "감전된 적 타격 시 피해 +50%", uniqueEffectKey: "hitShockedEnemyDamageMorePct", uniqueEffectParams: { pct: 50 }, stats: [{ id: "aspd", min: 12, max: 18 }, { id: "resL", min: 12, max: 20 }, { id: "lightPctDmg", min: 20, max: 32 }, { id: "ds", min: 6, max: 10 }, { id: "critDmg", min: 20, max: 34 }] },
    { name: "헝겊 순례자", slots: ["신발"], reqTier: 1, uniqueEffect: "경험치 획득 +5%", uniqueEffectKey: "xpGainPct", uniqueEffectParams: { pct: 5 }, stats: [{ id: "move", min: 12, max: 16 }, { id: "energyShield", min: 35, max: 60 }, { id: "regen", min: 0.5, max: 0.9 }, { id: 'evasionPct', min: 30.7, max: 34.9 }, { id: 'flatHp', min: 76.7, max: 87.3 }] },
    { name: "추적자", slots: ["신발"], reqTier: 4, uniqueEffect: "적 한도에 의해 이동이 막히지 않음", uniqueEffectKey: "noCollisionBlock", stats: [{ id: "move", min: 14, max: 20 }, { id: "evasion", min: 70, max: 110 }, { id: "energyShield", min: 60, max: 100 }, { id: "resPen", min: 3, max: 5 }, { id: 'evasionPct', min: 30.7, max: 34.9 }, { id: 'flatHp', min: 76.7, max: 87.3 }] },
    { name: "명사수의 경보", slots: ["신발"], reqTier: 8, uniqueEffect: "투사체 스킬 타겟 수 +1", uniqueEffectKey: "projectileTargetBonus", uniqueEffectParams: { target: 1 }, stats: [{ id: "move", min: 16, max: 22 }, { id: "evasion", min: 100, max: 160 }, { id: "crit", min: 5, max: 8 }, { id: "projectilePctDmg", min: 18, max: 28 }, { id: "projectileExtraShots", min: 1, max: 1 }] },
    { name: "태양의 불길", slots: ["신발"], reqTier: 10, uniqueEffect: "점화 피해 25% 증폭", uniqueEffectKey: "igniteDamageMorePct", uniqueEffectParams: { pct: 25 }, stats: [{ id: "move", min: 18, max: 24 }, { id: "resF", min: 14, max: 22 }, { id: "firePctDmg", min: 20, max: 32 }, { id: "igniteChance", min: 10, max: 18 }, { id: "aspd", min: 8, max: 12 }] },
    { name: "핏빛 톱날", slots: ["무기"], reqTier: 1, stats: [{ id: "flatDmg", min: 12, max: 18 }, { id: "leech", min: 0.8, max: 1.2 }, { id: "minDmgRoll", min: 4, max: 7 }, { id: "aspd", min: 4, max: 7 }, { id: 'elementalPctDmg', min: 30, max: 34.3 }, { id: 'physPctDmg', min: 30, max: 34.3 }] },
    { name: "순풍의 장화", slots: ["신발"], reqTier: 1, stats: [{ id: "move", min: 14, max: 18 }, { id: "projectilePctDmg", min: 8, max: 12 }, { id: "aspd", min: 3, max: 6 }, { id: "evasionPct", min: 6, max: 10 }, { id: 'resPen', min: 6, max: 6.9 }, { id: 'energyShieldPct', min: 30.7, max: 34.9 }] },
    { name: "도둑의 반지", slots: ["반지"], reqTier: 2, stats: [{ id: "leech", min: 1.4, max: 2.0 }, { id: "chaosPctDmg", min: 14, max: 22 }, { id: "resAll", min: 5, max: 9 }, { id: "move", min: 4, max: 7 }, { id: "crit", min: 1, max: 3 }] },
    { name: "군단 지휘관의 투구", slots: ["투구"], reqTier: 3, stats: [{ id: "flatHp", min: 38, max: 50 }, { id: "aoePctDmg", min: 10, max: 16 }, { id: "dr", min: 3, max: 5 }, { id: "resAll", min: 5, max: 8 }, { id: 'regen', min: 0.73, max: 0.84 }, { id: 'crit', min: 3.7, max: 4.2 }] },
    { name: "사냥개의 발톱", slots: ["장갑"], reqTier: 4, stats: [{ id: "aspd", min: 12, max: 18 }, { id: "ds", min: 8, max: 12 }, { id: "minDmgRoll", min: 3, max: 6 }, { id: "crit", min: 2, max: 4 }, { id: 'flatHp', min: 76.7, max: 87.3 }, { id: 'meleePctDmg', min: 30, max: 34.3 }] },
    { name: "현자의 시선", slots: ["목걸이"], reqTier: 5, stats: [{ id: "gemLevel", min: 1, max: 1 }, { id: "suppCap", min: 1, max: 1 }, { id: "elementalPctDmg", min: 12, max: 18 }, { id: "resAll", min: 6, max: 10 }, { id: 'resPen', min: 6, max: 6.9 }, { id: 'firePctDmg', min: 22.7, max: 25.9 }] },
    { name: "분광 고리", slots: ["반지"], reqTier: 6, stats: [{ id: "resAll", min: 10, max: 14 }, { id: "crit", min: 4, max: 6 }, { id: "elementalPctDmg", min: 10, max: 16 }, { id: "resPen", min: 3, max: 5 }, { id: 'flatHp', min: 76.7, max: 87.3 }, { id: 'chaosPctDmg', min: 22.7, max: 25.9 }] },
    { name: "카옴의 심장", slots: ["갑옷"], reqTier: 7, stats: [{ id: "flatHp", min: 150, max: 205 }, { id: "pctHp", min: 14, max: 22 }, { id: "regen", min: 1.0, max: 1.5 }, { id: "dr", min: 4, max: 6 }, { id: "resF", min: 10, max: 16 }] },
    { name: "절단자의 송곳니", slots: ["무기"], reqTier: 7, stats: [{ id: "flatDmg", min: 22, max: 30 }, { id: "physIgnore", min: 8, max: 12 }, { id: "physPctDmg", min: 18, max: 26 }, { id: "critDmg", min: 14, max: 20 }, { id: 'elementalPctDmg', min: 30, max: 34.3 }, { id: 'maxDmgRoll', min: 16, max: 18.1 }] },
    { name: "불멸의 띠", slots: ["허리띠"], reqTier: 8, stats: [{ id: "dr", min: 6, max: 9 }, { id: "flatHp", min: 70, max: 95 }, { id: "resChaos", min: 8, max: 12 }, { id: "regen", min: 0.7, max: 1.2 }, { id: 'evasionPct', min: 30.7, max: 34.9 }, { id: 'resAll', min: 15.3, max: 17.5 }] },
    { name: "분광 천칭", slots: ["목걸이"], reqTier: 8, stats: [{ id: "resPen", min: 8, max: 12 }, { id: "elementalPctDmg", min: 18, max: 26 }, { id: "resAll", min: 8, max: 12 }, { id: "crit", min: 3, max: 5 }, { id: 'flatHp', min: 76.7, max: 87.3 }, { id: 'critDmg', min: 46.7, max: 53.1 }] },
    { name: "광전사의 손길", slots: ["장갑"], reqTier: 9, stats: [{ id: "aspd", min: 14, max: 20 }, { id: "ds", min: 10, max: 14 }, { id: "meleePctDmg", min: 18, max: 26 }, { id: "flatHp", min: 40, max: 65 }, { id: 'armorPct', min: 30.7, max: 34.9 }, { id: 'pctHp', min: 22.7, max: 25.9 }] },
    { name: "별의 파괴자", slots: ["무기"], reqTier: 10, stats: [{ id: "flatDmg", min: 40, max: 56 }, { id: "physPctDmg", min: 46, max: 62 }, { id: "critDmg", min: 36, max: 48 }, { id: "physIgnore", min: 8, max: 12 }, { id: "maxDmgRoll", min: 6, max: 10 }] },
    { name: "균열 사냥꾼", slots: ["장갑"], reqTier: 11, stats: [{ id: "physIgnore", min: 8, max: 12 }, { id: "aspd", min: 12, max: 18 }, { id: "meleePctDmg", min: 20, max: 30 }, { id: "maxDmgRoll", min: 4, max: 8 }, { id: 'flatHp', min: 83.3, max: 94 }, { id: 'crit', min: 4, max: 4.5 }] },
    { name: "폭군의 왕관", slots: ["투구"], reqTier: 11, stats: [{ id: "aoePctDmg", min: 24, max: 34 }, { id: "critDmg", min: 30, max: 45 }, { id: "flatHp", min: 60, max: 82 }, { id: 'evasionPct', min: 33.3, max: 37.6 }, { id: 'dr', min: 16, max: 18.1 }] },
    { name: "심연의 굴레", slots: ["목걸이"], reqTier: 12, stats: [{ id: "chaosPctDmg", min: 24, max: 34 }, { id: "resChaos", min: 12, max: 18 }, { id: "leech", min: 1.0, max: 1.4 }, { id: 'dotPctDmg', min: 26.7, max: 29.9 }, { id: 'resAll', min: 18, max: 20.1 }] },
    { name: "공허의 첨탑", slots: ["반지"], reqTier: 12, stats: [{ id: "resPen", min: 7, max: 11 }, { id: "chaosPctDmg", min: 18, max: 28 }, { id: "crit", min: 4, max: 7 }, { id: 'dotPctDmg', min: 26.7, max: 29.9 }, { id: 'resChaos', min: 22.7, max: 25.3 }] },
    { name: "무명의 맹세", slots: ["갑옷"], reqTier: 13, stats: [{ id: "flatHp", min: 185, max: 250 }, { id: "resAll", min: 14, max: 20 }, { id: "dr", min: 10, max: 14 }, { id: "regen", min: 1.2, max: 2.0 }, { id: "resChaos", min: 10, max: 16 }] },
    { name: "균열추", slots: ["무기"], reqTier: 14, stats: [{ id: "flatDmg", min: 34, max: 44 }, { id: "aoePctDmg", min: 24, max: 32 }, { id: "crit", min: 6, max: 10 }, { id: 'resPen', min: 7.1, max: 7.9 }, { id: 'elementalPctDmg', min: 35.3, max: 39.6 }] },
    { name: "여명의 결속", slots: ["허리띠"], reqTier: 15, stats: [{ id: "pctHp", min: 16, max: 24 }, { id: "regen", min: 1.0, max: 1.6 }, { id: "resAll", min: 8, max: 12 }, { id: 'evasionPct', min: 36, max: 40.3 }, { id: 'dr', min: 17.3, max: 19.5 }] },
    { name: "화염 군주의 숨결", slots: ["목걸이"], reqTier: 12, stats: [{ id: "firePctDmg", min: 20, max: 30 }, { id: "resF", min: 18, max: 26 }] },
    { name: "서리 여제의 인장", slots: ["반지"], reqTier: 12, stats: [{ id: "coldPctDmg", min: 20, max: 30 }, { id: "resC", min: 18, max: 26 }] },
    { name: "폭풍 군단장의 창끝", slots: ["무기"], reqTier: 13, stats: [{ id: "lightPctDmg", min: 24, max: 34 }, { id: "crit", min: 8, max: 12 }] },
    { name: "창공의 사슬", slots: ["허리띠"], reqTier: 14, stats: [{ id: "move", min: 14, max: 20 }, { id: "elementalPctDmg", min: 20, max: 30 }] },
    { name: "타락한 심장석", slots: ["갑옷"], reqTier: 15, stats: [{ id: "pctHp", min: 20, max: 30 }, { id: "chaosPctDmg", min: 28, max: 40 }, { id: "resChaos", min: 18, max: 26 }, { id: "flatHp", min: 90, max: 130 }, { id: 'resPen', min: 7.1, max: 7.9 }, { id: 'resAll', min: 18, max: 20.1 }] },
    { name: "초월자 파쇄검", slots: ["무기"], reqTier: 1, ultraRare: true, uniqueEffect: "플레이어 레벨 1당 기본 피해 +10", uniqueEffectKey: "flatDmgPerLevel", uniqueEffectParams: { perLevel: 10 }, stats: [{ id: "flatDmg", min: 32, max: 42 }, { id: "critDmg", min: 55, max: 75 }, { id: "aspd", min: 11, max: 15 }, { id: 'maxDmgRoll', min: 16, max: 18.1 }, { id: 'minDmgRoll', min: 16, max: 18.1 }] },
    { name: "새벽의 약속", slots: ["투구"], reqTier: 6, ultraRare: true, uniqueEffect: "경험치 획득량 +10%", uniqueEffectKey: "xpGainPct", uniqueEffectParams: { pct: 10 }, stats: [{ id: "flatHp", min: 90, max: 120 }, { id: "resAll", min: 12, max: 17 }, { id: "resChaos", min: 12, max: 17 }, { id: "regen", min: 1.0, max: 1.5 }, { id: 'critDmg', min: 46.7, max: 53.1 }, { id: 'evasionPct', min: 30.7, max: 34.9 }] },
    { name: "심연 군주갑", slots: ["갑옷"], reqTier: 6, ultraRare: true, uniqueEffect: "심연 주얼 슬롯 (1~2)개", uniqueEffectKey: "abyssSocketOnItem", uniqueEffectParams: { min: 1, max: 2 }, stats: [{ id: "flatHp", min: 260, max: 340 }, { id: "dr", min: 12, max: 18 }, { id: "resChaos", min: 20, max: 28 }, { id: 'dotPctDmg', min: 22.7, max: 25.9 }, { id: 'armorPct', min: 30.7, max: 34.9 }] },
    { name: "폭풍 추적자", slots: ["신발"], reqTier: 6, ultraRare: true, uniqueEffect: "플레이어가 받는 감전 효과 반전 (피해 증가 → 피해 감소)", uniqueEffectKey: "invertShockTaken", stats: [{ id: "move", min: 17, max: 22 }, { id: "aspd", min: 9, max: 12 }, { id: "resL", min: 14, max: 19 }, { id: 'evasionPct', min: 30.7, max: 34.9 }, { id: 'coldPctDmg', min: 22.7, max: 25.9 }] },
    { name: "종말의 논리", slots: ["목걸이"], reqTier: 10, ultraRare: true, uniqueEffect: "적 처치 시 15% 확률로 생명력 25% 시체 폭발", uniqueEffectKey: "corpseExplodeOnKill", uniqueEffectParams: { chance: 15, lifePct: 25 }, stats: [{ id: "gemLevel", min: 3, max: 3 }, { id: "suppCap", min: 2, max: 2 }, { id: "elementalPctDmg", min: 50, max: 70 }, { id: "resPen", min: 12, max: 20 }, { id: "crit", min: 10, max: 16 }] },
    { name: "공허 제국의 인장", slots: ["반지"], reqTier: 10, ultraRare: true, uniqueEffect: "타격 시 적 카오스 저항 -3% (최대 10중첩)", uniqueEffectKey: "hitApplyChaosResDown", uniqueEffectParams: { perHit: 3, maxStacks: 10 }, stats: [{ id: "resAll", min: 8, max: 11 }, { id: "crit", min: 4, max: 6 }, { id: "chaosPctDmg", min: 22, max: 32 }, { id: "leech", min: 0.45, max: 0.7 }, { id: "resPen", min: 4, max: 7 }] },
    { name: "황제의 심연띠", slots: ["허리띠"], reqTier: 10, ultraRare: true, uniqueEffect: "심연 주얼 슬롯 (1~2)개, 장착 심연 주얼 효과 (1~100)% 증가", uniqueEffectKey: "abyssSocketAndJewelAmp", uniqueEffectParams: { socketsMin: 1, socketsMax: 2, ampMin: 1, ampMax: 100 }, stats: [{ id: "flatHp", min: 130, max: 175 }, { id: "pctHp", min: 14, max: 19 }, { id: "dr", min: 6, max: 9 }, { id: "resAll", min: 7, max: 10 }, { id: 'elementalPctDmg', min: 30, max: 34.3 }, { id: 'dotPctDmg', min: 22.7, max: 25.9 }] },
    { name: "세계파쇄자", slots: ["무기"], reqTier: 10, ultraRare: true, stats: [{ id: "physIgnore", min: 9, max: 13 }, { id: "flatDmg", min: 45, max: 60 }, { id: "critDmg", min: 45, max: 65 }, { id: "targetCount", min: 1, max: 1 }, { id: "aspd", min: 7, max: 7 }] },
    { name: "만상 관통석", slots: ["목걸이"], reqTier: 10, ultraRare: true, stats: [{ id: "resPen", min: 9, max: 13 }, { id: "elementalPctDmg", min: 20, max: 29 }, { id: "resAll", min: 10, max: 10 }, { id: "gemLevel", min: 1, max: 2 }, { id: 'critDmg', min: 46.7, max: 53.1 }, { id: 'chaosPctDmg', min: 22.7, max: 25.9 }] },
    { name: "천공 붕괴자", slots: ["무기"], reqTier: 10, ultraRare: true, uniqueEffect: "이 무기는 항상 감전 부여", uniqueEffectKey: "alwaysShock", stats: [{ id: "flatDmg", min: 55, max: 72 }, { id: "lightPctDmg", min: 24, max: 33 }, { id: "critDmg", min: 60, max: 80 }, { id: "shockEffect", min: 50, max: 50 }, { id: 'elementalPctDmg', min: 30, max: 34.3 }, { id: 'resAll', min: 15.3, max: 17.5 }] },
    { name: "폭우의 석궁", slots: ["무기"], reqTier: 11, ultraRare: true, stats: [{ id: "flatDmg", min: 44, max: 59 }, { id: "projectilePctDmg", min: 31, max: 43 }, { id: "projectileExtraShots", min: 1, max: 2 }, { id: "projectileExtraShots", min: 1, max: 2 }, { id: 'critDmg', min: 50.7, max: 57.1 }, { id: 'minDmgRoll', min: 17.3, max: 19.5 }] },
    { name: "칠흑의 연사기", slots: ["무기"], reqTier: 14, ultraRare: true, uniqueEffect: "투사체 스킬 연속타격 +100%", uniqueEffectKey: "projectileDoubleStrikePct", uniqueEffectParams: { pct: 100 }, stats: [{ id: "flatDmg", min: 120, max: 155 }, { id: "projectilePctDmg", min: 74, max: 98 }, { id: "projectileExtraShots", min: 3, max: 5 }, { id: 'critDmg', min: 54.7, max: 61.1 }, { id: 'minDmgRoll', min: 18.7, max: 20.8 }] },
    { name: "성좌의 주문핵", slots: ["무기"], reqTier: 11, ultraRare: true, stats: [{ id: "spellFlatDmg", min: 36, max: 54 }, { id: "spellFlatPct", min: 14, max: 21 }, { id: "spellCritDmg", min: 35, max: 35 }, { id: "gemLevel", min: 1, max: 1 }, { id: 'physPctDmg', min: 32.7, max: 36.9 }, { id: 'maxDmgRoll', min: 17.3, max: 19.5 }] },
    { name: "영겁의 마도서", slots: ["무기"], reqTier: 14, ultraRare: true, stats: [{ id: "spellFlatDmg", min: 96, max: 138 }, { id: "spellFlatPct", min: 36, max: 54 }, { id: "gemLevel", min: 1, max: 5 }, { id: "spellLeech", min: 1.0, max: 2.5 }, { id: 'aspd', min: 17.3, max: 19.5 }, { id: 'resPen', min: 7.1, max: 7.9 }] },
    { name: "영겁의 손아귀", slots: ["장갑"], reqTier: 10, ultraRare: true, stats: [{ id: "aspd", min: 12, max: 16 }, { id: "ds", min: 12, max: 17 }, { id: "meleePctDmg", min: 22, max: 30 }, { id: "leech", min: 0.6, max: 1.2 }, { id: "leechRateCap", min: 20, max: 40 }] },
    { name: "황혼의 왕관", slots: ["투구"], reqTier: 10, ultraRare: true, uniqueEffect: "에너지 보호막 50% 전역 증폭, 치명타 시 최대 ES의 2% 즉시 회복", uniqueEffectKey: "esAmpAndRecoverOnCrit", uniqueEffectParams: { ampPct: 50, recoverPctOnCrit: 2 }, stats: [{ id: "crit", min: 10, max: 14 }, { id: "critDmg", min: 45, max: 62 }, { id: "resAll", min: 10, max: 14 }, { id: 'armorPct', min: 30.7, max: 34.9 }, { id: 'dr', min: 14.7, max: 16.8 }] },
    { name: "기수의 나침반", slots: ["목걸이"], reqTier: 9, uniqueEffect: "이동 후 첫 타격 피해 +100%, 이동 속도 200% 이상 시 회피 20% 증폭", uniqueEffectKey: "riderCompass", stats: [{ id: "move", min: 12, max: 18 }, { id: "minDmgRoll", min: 5, max: 9 }, { id: "aspd", min: 8, max: 12 }, { id: 'resAll', min: 15.3, max: 17.5 }, { id: 'chaosPctDmg', min: 22.7, max: 25.9 }] },
    { name: "쐐기 파편", slots: ["무기"], reqTier: 9, uniqueEffect: "최대 피해 롤 130% 이상 타격 시 피해 50% 추가 타격 1회", uniqueEffectKey: "maxRollBonusHit", stats: [{ id: "maxDmgRoll", min: 8, max: 14 }, { id: "flatDmg", min: 28, max: 40 }] },
    { name: "절대 하한", slots: ["장갑"], reqTier: 10, uniqueEffect: "최대 피해 보정 15% 감폭, 최소 피해 보정이 최대 피해 보정과 동일", uniqueEffectKey: "minRollEqualsMaxRoll", stats: [{ id: "minDmgRoll", min: 10, max: 16 }, { id: "aspd", min: 10, max: 14 }, { id: "flatHp", min: 55, max: 80 }, { id: 'resAll', min: 15.3, max: 17.5 }, { id: 'meleePctDmg', min: 30, max: 34.3 }] },
    { name: "천정 파쇄", slots: ["무기"], reqTier: 11, uniqueEffect: "최대 피해 롤 140% 이상 시 15% 확률 2배 피해", uniqueEffectKey: "ceilingSmashDouble", stats: [{ id: "maxDmgRoll", min: 12, max: 18 }, { id: "critDmg", min: 30, max: 44 }, { id: "physPctDmg", min: 24, max: 34 }, { id: 'resPen', min: 6.5, max: 7.4 }, { id: 'aspd', min: 16, max: 18.1 }] },
    { name: "가호의 갑피", slots: ["갑옷"], reqTier: 11, stats: [{ id: "armor", min: 500, max: 500 }, { id: "armorPct", min: 20, max: 20 }, { id: "dr", min: 6, max: 6 }, { id: 'evasionPct', min: 33.3, max: 37.6 }, { id: 'regen', min: 0.8, max: 0.91 }] },
    { name: "굶주린 톱니", slots: ["반지"], reqTier: 12, uniqueEffect: "적 처치 시 8초간 모든 흡혈 효율 +100% (중첩 불가, 갱신형)", uniqueEffectKey: "leechEfficiencyOnKill", uniqueEffectParams: { duration: 8, efficiencyPct: 100 }, stats: [{ id: "leech", min: 1.2, max: 1.8 }, { id: "minDmgRoll", min: 4, max: 7 }, { id: "chaosPctDmg", min: 20, max: 30 }, { id: 'crit', min: 4.3, max: 4.9 }, { id: 'resChaos', min: 22.7, max: 25.3 }] },
    { name: "거인의 지지대", slots: ["허리띠"], reqTier: 12, uniqueEffect: "최대 생명력 100당 물리 피해 +1%", uniqueEffectKey: "hpToPhysPct", stats: [{ id: "flatHp", min: 100, max: 145 }, { id: "regenFlat", min: 50, max: 200 }, { id: "maxDmgRoll", min: 3, max: 6 }, { id: 'elementalPctDmg', min: 35.3, max: 39.6 }, { id: 'resAll', min: 18, max: 20.1 }] },
    { name: "지평선 분할자", slots: ["무기"], reqTier: 13, uniqueEffect: "적 처치 시 초과 피해를 주변 적에게 전달", uniqueEffectKey: "overkillSplash", stats: [{ id: "flatDmg", min: 44, max: 60 }, { id: "minDmgRoll", min: 8, max: 12 }, { id: "maxDmgRoll", min: 8, max: 12 }, { id: 'resPen', min: 7.1, max: 7.9 }, { id: 'aspd', min: 17.3, max: 19.5 }] },
    { name: "용맥 수호", slots: ["장갑"], reqTier: 13, uniqueEffect: "타격 시 20% 확률로 2초간 수호(최대생명력 8% 보호막, 중첩 불가)", uniqueEffectKey: "dragonVeinGuard", uniqueEffectParams: { chance: 20, duration: 2, hpPct: 8 }, stats: [{ id: "flatHp", min: 70, max: 100 }, { id: "regen", min: 0.9, max: 1.4 }, { id: "minDmgRoll", min: 5, max: 9 }, { id: 'meleePctDmg', min: 35.3, max: 39.6 }, { id: 'dr', min: 17.3, max: 19.5 }] },
    { name: "운명의 쌍현", slots: ["목걸이"], reqTier: 14, dropOnly: { type: 'cosmos' }, uniqueEffect: "최소/최대 피해 보정을 높은 값으로 통일, 치확의 20%만큼 추가 상승", uniqueEffectKey: "fateTwinRollSync", uniqueEffectParams: { critToRollPct: 20 }, stats: [{ id: "minDmgRoll", min: 7, max: 11 }, { id: "maxDmgRoll", min: 7, max: 11 }, { id: "crit", min: 8, max: 12 }, { id: 'critDmg', min: 54.7, max: 61.1 }, { id: 'resAll', min: 18, max: 20.1 }] },

    { name: "불씨 군주의 보행", slots: ["신발"], reqTier: 11, uniqueEffect: "점화 피해를 받지 않음", uniqueEffectKey: "immuneIgnite", stats: [{ id: "move", min: 16, max: 22 }, { id: "resF", min: 18, max: 26 }, { id: "igniteDamageMultiplierPct", min: 30, max: 30 }, { id: "dr", min: 4, max: 7 }, { id: 'aspd', min: 16, max: 18.1 }, { id: 'regen', min: 0.8, max: 0.91 }] },
    { name: "빙결파수 장화", slots: ["신발"], reqTier: 12, uniqueEffect: "냉각/동결 면역, 냉각 효율 +50%", uniqueEffectKey: "frostSentinelBoots", uniqueEffectParams: { chillEffectPct: 50 }, stats: [{ id: "move", min: 15, max: 21 }, { id: "resC", min: 20, max: 28 }, { id: "energyShield", min: 80, max: 130 }, { id: "regen", min: 0.8, max: 1.3 }, { id: 'armorPct', min: 36, max: 40.3 }, { id: 'crit', min: 4.3, max: 4.9 }] },
    { name: "감전추적 경갑", slots: ["신발"], reqTier: 13, uniqueEffect: "감전 면역, 감전 효율 +25%, 감전 적 타격 시 번개 낙뢰(내부쿨 0.5초)", uniqueEffectKey: "shockTracerGreaves", uniqueEffectParams: { shockEffectPct: 25, strikeDamagePct: 500, icdSec: 0.5 }, stats: [{ id: "move", min: 18, max: 24 }, { id: "resL", min: 20, max: 30 }, { id: "aspd", min: 10, max: 15 }, { id: "crit", min: 6, max: 10 }, { id: 'coldPctDmg', min: 26.7, max: 29.9 }, { id: 'flatHp', min: 90, max: 100.7 }] },
    { name: "독기 유영화", slots: ["신발"], reqTier: 14, uniqueEffect: "중독 피해 배율 +30%, 중독 최대 중첩 +1", uniqueEffectKey: "venomStride", uniqueEffectParams: { poisonMorePct: 30, poisonExtraStack: 1 }, stats: [{ id: "move", min: 16, max: 22 }, { id: "resChaos", min: 18, max: 28 }, { id: "leech", min: 1.0, max: 1.6 }, { id: "chaosPctDmg", min: 20, max: 30 }, { id: 'armorPct', min: 36, max: 40.3 }, { id: 'dotPctDmg', min: 26.7, max: 29.9 }] },
    { name: "출혈 봉쇄 투구", slots: ["투구"], reqTier: 12, uniqueEffect: "출혈 면역, 받는 물리 피해의 15%를 카오스 피해로 전환", uniqueEffectKey: "bleedBlockHelm", uniqueEffectParams: { physToChaosTakenPct: 15 }, stats: [{ id: "flatHp", min: 72, max: 98 }, { id: "dr", min: 7, max: 11 }, { id: "resAll", min: 10, max: 16 }, { id: "regen", min: 1.0, max: 1.5 }, { id: 'crit', min: 4.3, max: 4.9 }, { id: 'resPen', min: 7.1, max: 7.9 }] },
    { name: "저주의 관", slots: ["투구"], reqTier: 13, uniqueEffect: "저주 최대치 +1, 적에게 걸린 저주 1개당 최종 피해 +6%", uniqueEffectKey: "curseCrown", uniqueEffectParams: { extraCurseCap: 1, finalDmgPerCursePct: 6 }, stats: [{ id: "chaosPctDmg", min: 20, max: 30 }, { id: "resPen", min: 8, max: 14 }, { id: "crit", min: 6, max: 10 }, { id: "resChaos", min: 10, max: 16 }, { id: 'resAll', min: 18, max: 20.1 }, { id: 'energyShieldPct', min: 36, max: 40.3 }] },
    { name: "수호 성갑", slots: ["갑옷"], reqTier: 14, uniqueEffect: "받는 피해 -8%, 보스에게 받는 피해 -12%", uniqueEffectKey: "guardianArmor", uniqueEffectParams: { takenLessPct: 8, bossTakenLessPct: 12 }, stats: [{ id: "flatHp", min: 140, max: 200 }, { id: "dr", min: 10, max: 14 }, { id: "resAll", min: 14, max: 20 }, { id: "regen", min: 1.4, max: 2.2 }, { id: 'armorPct', min: 36, max: 40.3 }, { id: 'evasionPct', min: 36, max: 40.3 }] },
    { name: "함성 공명 허리띠", slots: ["허리띠"], reqTier: 13, uniqueEffect: "플레이어에게 적용된 함성 1개당 피해 20% 증폭", uniqueEffectKey: "warcryResonanceBelt", uniqueEffectParams: { perWarcryAmpPct: 20 }, stats: [{ id: "flatHp", min: 90, max: 130 }, { id: "move", min: 8, max: 14 }, { id: "aspd", min: 8, max: 12 }, { id: "resAll", min: 8, max: 14 }, { id: 'dr', min: 17.3, max: 19.5 }, { id: 'energyShieldPct', min: 36, max: 40.3 }] },
    { name: "저항 잠식 반지", slots: ["반지"], reqTier: 12, uniqueEffect: "동일 대상 연속 타격 시 원소저항 -2% 누적 (최대 -20%)", uniqueEffectKey: "stackingElementalResDownOnHit", uniqueEffectParams: { perHit: 2, max: 20 }, stats: [{ id: "resPen", min: 10, max: 16 }, { id: "elementalPctDmg", min: 18, max: 28 }, { id: "resAll", min: 8, max: 14 }, { id: "leech", min: 0.8, max: 1.3 }, { id: 'flatHp', min: 90, max: 100.7 }, { id: 'crit', min: 4.3, max: 4.9 }] },
    { name: "컨디션 교본", slots: ["목걸이"], reqTier: 14, uniqueEffect: "컨디션 젬 지속시간 +100%, 쿨다운 회복 속도 +20%", uniqueEffectKey: "conditionManual", uniqueEffectParams: { durationPct: 100, cdrPct: 20 }, stats: [{ id: "gemLevel", min: 2, max: 2 }, { id: "suppCap", min: 1, max: 1 }, { id: "regen", min: 1.1, max: 1.7 }, { id: "resAll", min: 10, max: 16 }, { id: 'resPen', min: 7.1, max: 7.9 }, { id: 'flatHp', min: 90, max: 100.7 }] },

    { name: "벌집 여왕의 명령", slots: ["투구"], reqTier: 12, dropOnly: { type: 'beehive' }, uniqueEffect: "타격 시 8% 확률로 벌 소환(최대 10마리)", uniqueEffectKey: "queenBeeSummonOnHit", uniqueEffectParams: { chance: 8, hitPct: 125, intervalSec: 1, attacks: 3, maxBees: 10 }, stats: [{ id: "flatHp", min: 68, max: 96 }, { id: "evasion", min: 90, max: 140 }, { id: "venomStingerBonus", min: 8, max: 14 }, { id: "resChaos", min: 12, max: 18 }, { id: 'crit', min: 4.3, max: 4.9 }, { id: 'regen', min: 0.87, max: 0.97 }] },
    { name: "시련 심판자의 장갑", slots: ["장갑"], reqTier: 15, dropOnly: { type: 'trial' }, uniqueEffect: "출혈 중인 적 타격 시 출혈 피해 2배", uniqueEffectKey: "bleedWeightOnBleedingHit", stats: [{ id: "aspd", min: 12, max: 18 }, { id: "dr", min: 4, max: 7 }, { id: "armor", min: 70, max: 120 }, { id: "critDmg", min: 20, max: 34 }, { id: 'pctHp', min: 26.7, max: 29.9 }, { id: 'evasionPct', min: 36, max: 40.3 }] },
    { name: "대균열의 왕관", slots: ["투구"], reqTier: 17, dropOnly: { id: 'grand_breach_run' }, uniqueEffect: "주문 내장 피해 +최대ES의 10%, 에너지 보호막 +30%", uniqueEffectKey: "grandBreachCrown", uniqueEffectParams: { spellFromEsPct: 10, esPct: 30 }, stats: [{ id: "energyShield", min: 110, max: 170 }, { id: "resPen", min: 8, max: 14 }, { id: "resAll", min: 10, max: 16 }, { id: 'pctHp', min: 26.7, max: 29.9 }, { id: 'evasionPct', min: 36, max: 40.3 }] },
    { name: "미궁 군주의 족쇄", slots: ["신발"], reqTier: 20, dropOnly: { type: 'labyrinth', minFloor: 30 }, uniqueEffect: "이동 속도 100% 고정, 감소된 이속의 50%만큼 피해 증가", uniqueEffectKey: "labyrinthShackles", stats: [{ id: "move", min: 18, max: 24 }, { id: "armor", min: 110, max: 160 }, { id: "dr", min: 4, max: 8 }, { id: "resAll", min: 10, max: 16 }, { id: 'crit', min: 4.3, max: 4.9 }, { id: 'armorPct', min: 36, max: 40.3 }] },
    { name: "낙성의 발자취", slots: ["신발"], reqTier: 19, dropOnly: { type: 'meteor' }, uniqueEffect: "치명타 적중 시 20% 확률로 소형 운석 낙하", uniqueEffectKey: "meteorFootsteps", uniqueEffectParams: { chance: 20, damagePct: 180 }, stats: [{ id: "move", min: 18, max: 24 }, { id: "evasion", min: 120, max: 180 }, { id: "crit", min: 6, max: 10 }, { id: "lightPctDmg", min: 16, max: 26 }, { id: 'aspd', min: 17.3, max: 19.5 }, { id: 'resPen', min: 7.1, max: 7.9 }] },
    { name: "영원", slots: ["무기"], reqTier: 15, ultraRare: true, uniqueEffect: "흡혈의 25% 즉시 흡수, 20% 확률로 2배 피해", uniqueEffectKey: "instantLeechAndDoubleDamage", uniqueEffectParams: { instantLeechPct: 25, doubleDamageChance: 20 }, stats: [{ id: "flatDmg", min: 95, max: 130 }, { id: "minDmgRoll", min: 14, max: 20 }, { id: "maxDmgRoll", min: 14, max: 20 }, { id: "critDmg", min: 90, max: 130 }, { id: 'physPctDmg', min: 35.3, max: 39.6 }, { id: 'elementalPctDmg', min: 35.3, max: 39.6 }] }
];

const REALM_UNIQUE_SLOTS = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'];
const CHAOS_REALM_ENTRIES = [
    { name: '파열의 언약', effect: '출혈 중인 적에게 주는 피해 22% 증폭' },
    { name: '균열의 정수', effect: '타격 시 12% 확률로 균열파 발동' },
    { name: '공허의 갈고리', effect: '카오스 피해의 8%를 즉시 흡수' },
    { name: '타락각 투구', effect: '중독 최대 중첩 +1' },
    { name: '균열군주의 피부', effect: '피격 시 10% 확률로 1.5초 무적 장막' },
    { name: '독성 심연갑', effect: '중독 지속시간 +35%' },
    { name: '침식 장갑', effect: '공격 시 적의 모든 저항이 5% 감소 (최대 4중첩)' },
    { name: '망각 추적화', effect: '처치 후 20초간 이동 속도 +10% (쿨타임 1초, 최대 20중첩, 새로운 맵 진입 시 초기화)' },
    { name: '잠식 목걸이', effect: '저주가 걸린 적이 받는 피해 +10%, 공격 적중 시 적에게 걸린 저주의 지속시간이 갱신됨' },
    { name: '절단 반지', effect: '적의 모든 재생 효율 50% 감소, 최소 피해 보정 +10%' }
];
const UNDERWORLD_REALM_ENTRIES = [
    { name: '심층 제련검', effect: '방어도 1000당 물리 피해 +3%' },
    { name: '암반 분쇄기', effect: '적의 원래 물리 피해 감소의 절반만큼 적이 받는 피해 증가.' },
    { name: '망자 감시투구', effect: '사망 방지 보호막(최대생명력 12%) 20초마다 재생성' },
    { name: '지하 성채갑', effect: '방어도의 물리 피해 감소가 모든 지속 피해에도 적용' },
    { name: '대지 구속장갑', effect: '근접 타격 시 2초간 방어도 5% 증폭 (최대 3중첩)' },
    { name: '철벽 척력화', effect: '적 한도 초과로 인해 이동이 막히지 않음' },
    { name: '룬 심장 목걸이', effect: '공명력 +150, 보조 젬 한도 +3' },
    { name: '지맥 반지', effect: '생명력 재생 속도 25% 증폭, 생명력 재생 +2%' },
    { name: '골렘 허리띠', effect: '최대 생명력 +35%' },
    { name: '중핵 결속대', effect: '모든 최대 저항 +3%' }
];
const COSMOS_EFFECT_LINES = [
    '성도의 발화점: 같은 대상 7회 연속 타격 시 별화염 폭발(공격력의 420%)',
    '광추의 파편: 투사체가 적을 관통할 때마다 최종 피해 +6% (최대 5중첩)',
    '성운 봉인: 생명력 35% 이하일 때 받는 피해 28% 감소',
    '은하의 각인: 치명타 적중 시 1.5초간 시간균열(적 이동/공격속도 30% 감소)',
    '공전의 귀환: 회피 성공 시 다음 타격 2회가 반드시 치명타',
    '초신성 직조: 보스에게 적중 시 10초마다 초신성 파동(공격력의 700%)',
    '별자리 금속: 장비의 방어도/회피/보호막 중 가장 높은 수치의 22%를 추가 적용',
    '월광 항법: 밤의 표식 3중첩 시 즉시 생명력 12% 회복',
    '항성 낙인: 적에게 준 원소 상태이상 1개당 관통 +4% (최대 4개)',
    '성단의 결: 연결된 노드 1개당 피해 +2%, 받는 피해 -1% (최대 12개 계산)',
    '서광 공명기: 스킬 사용 5회마다 다음 스킬의 범위 +60%, 피해 +30%',
    '자전 폭심: 근접 타격 시 15% 확률로 회전충격파 2회 발사',
    '빛무리 경첩: 최소 피해 보정이 최대 피해 보정의 80% 이상으로 고정',
    '천구의 열쇠: 잠긴 우주계 노드 도전 시 성공률 보정 +12%',
    '유성 궤도핵: 8초마다 유성핵 1개 획득, 최대 3개(타격 시 1개 소모/추가타격)',
    '오로라 박동: 냉각 적 타격 시 점화도 함께 부여(피해 55%)',
    '천문 추침: 원거리 적 첫 타격 피해 +45%',
    '성운 분기: 다중 대상 타격 시 분기번개 발생(최대 4체)',
    '행성외권: 근접/원거리 태그가 동시에 있는 스킬 피해 +38%',
    '영점 편광: 원소 저항이 동일할 때 모든 최대저항 +1%',
    '은하 심도: 지하계 패널티 18% 완화',
    '항성 절편: 물리 피해의 18%를 추가 카오스 피해로 획득',
    '성류 고리: 흡혈 인스턴스당 회복 속도 +35%',
    '별무덤 인장: 처치 시 8% 확률로 시체폭발(생명력 18%)',
    '자력 낙화: 감전된 적이 사망하면 주변 6m 전이감전',
    '성층 반향: 사용한 스킬을 20% 확률로 메아리 시전',
    '혜성 구속: 이동속도 180% 이상일 때 받는 피해 -16%',
    '태양풍 초점: 점화 피해가 치명타 배율의 40%를 추가 반영',
    '월식 잔광: 암흑 상태(피격 3초 무피격 유지)에서 첫 타격 2배 피해',
    '항성 원환: 투사체 추가 발사 +1, 대신 투사체 피해 -10%',
    '중력 접힘: 보스 스킬 피격 시 2초간 중력붕괴 버프(피해 +25%)',
    '성운 승화: 보호막이 0이 되면 3초간 피해면역(전투당 1회)',
    '공전 쐐기: 방향 전환 직후 1초간 관통/연쇄 +1',
    '자전 공명: 공격속도의 30%를 추가 치명타 확률로 전환',
    '천체 해석기: 적의 남은 생명력 70% 이상 구간에 주는 피해 +22%',
    '광년 축전기: 과충전 상태에서 스킬 피해 +40%, 마나소모 +25%',
    '성핵 타래: 카오스 저항 1%당 카오스 피해 +0.9%',
    '여명 자침: 첫 진입 10초간 모든 저항 +25%',
    '천공 스피너: 범위 스킬 사용 시 주변에 궤도칼날 3개 생성',
    '우주맥 봉인: 군중제어 면역 지속시간 +100%',
    '은하연 다발: 소환/설치물 피해 +35%',
    '성흔 제어핵: 스킬 젬 레벨 +1, 보조 젬 한도 +1',
    '항성 편극: 화염/냉기/번개 피해 중 가장 높은 값만 1.7배 적용',
    '감마 포개짐: 4초마다 감마장(적 받는 피해 +12%) 생성',
    '광권 반전: 원소 반사 피해 면역, 카오스 반사 피해 50% 감소',
    '극야 성환: 지속 피해 20% 감소, 중독/출혈 피해 25% 감소',
    '유성 정렬자: 운석 낙하지점 게이지 획득량 +30%',
    '성도 지시계: 우주계 도전 요구치 -10%, 우주계 보상 +15%',
    '궤도 정박기: 은하 보스 격파 시 우주석 추가 1개 확률 +20%',
    '창공 미분기: 우주계 노드 클리어 시 다음 노드 첫 타격 피해 +60%'
];
const COSMOS_EFFECT_KEYS = [
    { key: 'corpseExplodeOnKill', params: { chance: 16, lifePct: 22 } },
    { key: 'hitApplyChaosResDown', params: { perHit: 2, maxStacks: 12 } },
    { key: 'guardianArmor', params: { takenLessPct: 7, bossTakenLessPct: 10 } },
    { key: 'riderCompass', params: {} },
    { key: 'maxRollBonusHit', params: {} },
    { key: 'ceilingSmashDouble', params: {} },
    { key: 'fateTwinRollSync', params: { critToRollPct: 18 } },
    { key: 'dragonVeinGuard', params: { chance: 22, duration: 2, hpPct: 8 } },
    { key: 'stackingElementalResDownOnHit', params: { perHit: 2, max: 22 } },
    { key: 'leechEfficiencyOnKill', params: { duration: 8, efficiencyPct: 90 } },
    { key: 'conditionManual', params: { durationPct: 80, cdrPct: 16 } },
    { key: 'shockTracerGreaves', params: { shockEffectPct: 20, strikeDamagePct: 420, icdSec: 0.6 } },
    { key: 'venomStride', params: { poisonMorePct: 25, poisonExtraStack: 1 } },
    { key: 'frostSentinelBoots', params: { chillEffectPct: 40 } },
    { key: 'bleedBlockHelm', params: { physToChaosTakenPct: 12 } },
    { key: 'curseCrown', params: { extraCurseCap: 1, finalDmgPerCursePct: 5 } },
    { key: 'warcryResonanceBelt', params: { perWarcryAmpPct: 16 } },
    { key: 'meteorFootsteps', params: { chance: 18, damagePct: 160 } },
    { key: 'alwaysShock', params: {} },
    { key: 'invertShockTaken', params: {} },
    { key: 'cosmosFinalDmg', params: { pct: 14 } },
    { key: 'cosmosTakenLess', params: { dr: 10 } },
    { key: 'cosmosSpeedBurst', params: { move: 14, aspd: 12 } },
    { key: 'cosmosPenetration', params: { pen: 10 } },
    { key: 'cosmosSustain', params: { regen: 1.4, leech: 1.0 } },
    { key: 'cosmosBossSlayer', params: { pct: 16, critDmg: 24 } }
];
while (COSMOS_EFFECT_KEYS.length < 50) {
    let idx = COSMOS_EFFECT_KEYS.length;
    COSMOS_EFFECT_KEYS.push({
        key: 'cosmosStatBundle',
        params: {
            pctDmg: 6 + (idx % 5) * 2,
            dr: (idx % 3 === 0) ? 4 : 0,
            move: (idx % 4 === 0) ? 8 : 0,
            aspd: (idx % 4 === 1) ? 8 : 0,
            resPen: (idx % 5 === 2) ? 6 : 0,
            critDmg: (idx % 6 === 0) ? 12 : 0,
            regen: (idx % 7 === 0) ? 0.8 : 0,
            leech: (idx % 7 === 1) ? 0.6 : 0
        }
    });
}
const COSMOS_REALM_ENTRIES = [
    '성도의 발화점','광추의 파편','성운 봉인','은하의 각인','공전의 귀환',
    '초신성 직조','별자리 금속','월광 항법','항성 낙인','성단의 결',
    '서광 공명기','자전 폭심','빛무리 경첩','천구의 열쇠','유성 궤도핵',
    '오로라 박동','천문 추침','성운 분기','행성외권','영점 편광',
    '은하 심도','항성 절편','성류 고리','별무덤 인장','자력 낙화',
    '성층 반향','혜성 구속','태양풍 초점','월식 잔광','항성 원환',
    '중력 접힘','성운 승화','공전 쐐기','자전 공명','천체 해석기',
    '광년 축전기','성핵 타래','여명 자침','천공 스피너','우주맥 봉인',
    '은하연 다발','성흔 제어핵','항성 편극','감마 포개짐','광권 반전',
    '극야 성환','유성 정렬자','성도 지시계','궤도 정박기','창공 미분기'
].map((name, idx) => ({ name, effect: `우주계 전용 효과 #${idx + 1}: ${COSMOS_EFFECT_LINES[idx] || '행성 클리어 시 전투 보너스 획득'}` }));
const REALM_STAT_PACKS = {
    chaos: [
        [{ id: 'chaosPctDmg', min: 26, max: 44 }, { id: 'resChaos', min: 15, max: 24 }, { id: 'leech', min: 1.0, max: 1.8 }, { id: 'dotPctDmg', min: 22.7, max: 25.9 }, { id: 'resPen', min: 7.3, max: 8.2 }],
        [{ id: 'flatDmg', min: 38, max: 58 }, { id: 'critDmg', min: 20, max: 40 }, { id: 'physIgnore', min: 7, max: 13 }, { id: 'physPctDmg', min: 30, max: 34.3 }, { id: 'aspd', min: 14.7, max: 16.8 }],
        [{ id: 'flatHp', min: 80, max: 132 }, { id: 'dr', min: 7, max: 12 }, { id: 'resAll', min: 8, max: 14 }, { id: 'pctHp', min: 22.7, max: 25.9 }, { id: 'regen', min: 0.73, max: 0.84 }]
    ],
    underworld: [
        [{ id: 'armorPct', min: 20, max: 34 }, { id: 'evasionPct', min: 20, max: 34 }, { id: 'energyShieldPct', min: 20, max: 34 }, { id: 'flatHp', min: 83.3, max: 94 }, { id: 'resAll', min: 16.7, max: 18.8 }],
        [{ id: 'flatHp', min: 90, max: 145 }, { id: 'dr', min: 8, max: 14 }, { id: 'regen', min: 1.0, max: 1.8 }, { id: 'pctHp', min: 26.7, max: 29.9 }, { id: 'resAll', min: 18, max: 20.1 }],
        [{ id: 'resF', min: 13, max: 22 }, { id: 'resC', min: 13, max: 22 }, { id: 'resL', min: 13, max: 22 }, { id: 'flatHp', min: 90, max: 100.7 }, { id: 'dr', min: 17.3, max: 19.5 }]
    ],
    cosmos: [
        [{ id: 'resPen', min: 8, max: 16 }, { id: 'elementalPctDmg', min: 24, max: 42 }, { id: 'crit', min: 6, max: 11 }, { id: 'critDmg', min: 54.7, max: 61.1 }, { id: 'resAll', min: 18, max: 20.1 }],
        [{ id: 'gemLevel', min: 1, max: 1 }, { id: 'suppCap', min: 1, max: 1 }, { id: 'resAll', min: 9, max: 15 }, { id: 'flatHp', min: 90, max: 100.7 }, { id: 'elementalPctDmg', min: 35.3, max: 39.6 }],
        [{ id: 'flatDmg', min: 40, max: 62 }, { id: 'aspd', min: 10, max: 17 }, { id: 'maxDmgRoll', min: 7, max: 13 }, { id: 'critDmg', min: 54.7, max: 61.1 }, { id: 'resPen', min: 7.1, max: 8 }],
        [{ id: 'move', min: 14, max: 22 }, { id: 'critDmg', min: 22, max: 42 }, { id: 'resChaos', min: 10, max: 18 }, { id: 'flatHp', min: 90, max: 100.7 }, { id: 'resAll', min: 18, max: 20.1 }]
    ]
};
function pushRealmUniqueSet(realm, entries, tierStart) {
    let packs = REALM_STAT_PACKS[realm] || REALM_STAT_PACKS.cosmos;
    let dropTypeByRealm = { chaos: 'chaosRealm', underworld: 'underworld', cosmos: 'cosmos' };
    entries.forEach((entry, i) => {
        let cosmosEffect = realm === 'cosmos' ? COSMOS_EFFECT_KEYS[i % COSMOS_EFFECT_KEYS.length] : null;
        let realmEffectMap = {
            '침식 장갑': { key: 'realmAllResDownOnHit', params: { perHit: 5, max: 4, duration: 5 } },
            '망각 추적화': { key: 'realmKillMoveStacks', params: { movePerStack: 10, maxStacks: 20, duration: 20, cooldownSec: 1 } },
            '잠식 목걸이': { key: 'realmCursedTakenAndRefresh', params: { takenMul: 1.10, refreshSec: 4 } },
            '절단 반지': { key: 'realmEnemyRegenCutAndMinRoll', params: { enemyRegenRateMul: 0.5, minRoll: 10 } },
            '암반 분쇄기': { key: 'realmPhysDrHalfTakenAsMore', params: { ratio: 0.5 } },
            '지하 성채갑': { key: 'realmArmorAppliesToDot', params: {} },
            '대지 구속장갑': { key: 'realmMeleeArmorAmp', params: { ampPct: 5, maxStacks: 3, duration: 2 } },
            '철벽 척력화': { key: 'realmNoCollisionBlock', params: {} },
            '룬 심장 목걸이': { key: 'realmResonanceAndSuppCap', params: { resonancePower: 150, suppCap: 3 } },
            '지맥 반지': { key: 'realmRegenRateAndRegen', params: { regenRatePct: 25, regen: 2 } },
            '골렘 허리띠': { key: 'realmMaxHpPct', params: { pctHp: 35 } },
            '중핵 결속대': { key: 'realmAllMaxRes', params: { maxRes: 3 } }
        };
        let realmNamed = realmEffectMap[entry.name] || null;
        UNIQUE_DB.push({
            name: entry.name,
            slots: [REALM_UNIQUE_SLOTS[i % REALM_UNIQUE_SLOTS.length]],
            reqTier: tierStart + Math.floor(i / 4),
            realmCodexOnly: true,
            realm,
            dropOnly: { type: dropTypeByRealm[realm] || 'cosmos' },
            uniqueEffect: entry.effect,
            uniqueEffectKey: realmNamed ? realmNamed.key : (cosmosEffect ? cosmosEffect.key : undefined),
            uniqueEffectParams: realmNamed ? realmNamed.params : (cosmosEffect ? cosmosEffect.params : undefined),
            stats: JSON.parse(JSON.stringify(packs[i % packs.length]))
        });
    });
}
pushRealmUniqueSet('chaos', CHAOS_REALM_ENTRIES, 12);
pushRealmUniqueSet('underworld', UNDERWORLD_REALM_ENTRIES, 16);
pushRealmUniqueSet('cosmos', COSMOS_REALM_ENTRIES, 18);

const UNIQUE_STAT_MULTIPLIER = 1.5;

UNIQUE_DB.forEach(unique => {
    if (!unique || !Array.isArray(unique.stats)) return;
    unique.stats.forEach(stat => {
        if (!Number.isFinite(stat.min) || !Number.isFinite(stat.max)) return;
        if (['projectileExtraShots', 'gemLevel', 'suppCap', 'targetCount'].includes(stat.id)) {
            stat.min = Math.floor(stat.min);
            stat.max = Math.floor(stat.max);
            if (stat.max < stat.min) stat.max = stat.min;
            return;
        }
        stat.min = Number((stat.min * UNIQUE_STAT_MULTIPLIER).toFixed(1));
        stat.max = Number((stat.max * UNIQUE_STAT_MULTIPLIER).toFixed(1));
        if (stat.max < stat.min) stat.max = stat.min;
    });
});

const ORB_DB = {
    transmute: { name: '진화의 오브', desc: '노멀 아이템을 매직으로 바꿉니다.' },
    augment: { name: '확장의 오브', desc: '매직 아이템의 빈 옵션 칸을 하나 채웁니다.' },
    alteration: { name: '변화의 오브', desc: '매직 아이템의 옵션을 다시 굴립니다.' },
    alchemy: { name: '연금술의 오브', desc: '노멀 아이템을 희귀 아이템으로 바꿉니다.' },
    exalted: { name: '엑잘티드 오브', desc: '희귀 아이템에 새 옵션을 하나 추가합니다.' },
    regal: { name: '제왕의 오브', desc: '매직 아이템에 옵션을 1줄 추가하고 희귀 아이템으로 만듭니다.' },
    chaos: { name: '카오스 오브', desc: '희귀 아이템의 옵션을 모두 다시 굴립니다.' },
    divine: { name: '신성한 오브', desc: '아이템 옵션 수치를 다시 굴립니다.' },
    scour: { name: '정화의 오브', desc: '유니크를 제외한 아이템을 노멀 상태로 되돌립니다.' },
    bossKeyFlame: { name: '열쇠: 화염 군주', desc: '루프2 뿌리 보스 [이그니스] 도전권입니다.' },
    bossKeyFrost: { name: '열쇠: 서리 여제', desc: '루프2 뿌리 보스 [글라시아] 도전권입니다.' },
    bossKeyStorm: { name: '열쇠: 폭풍 군단장', desc: '루프2 뿌리 보스 [볼타] 도전권입니다.' },
    beastKeyCerberus: { name: '열쇠: 케르베로스', desc: '루프6 야수 뿌리 보스 [케르베로스] 도전권입니다.' },
    trialKey3: { name: '시련의 증표', desc: '3차/4차 전직 시련 재도전권입니다.' },
    blessing: { name: '축복의 오브', desc: '장비의 베이스 옵션 값을 80%~120% 구간에서 다시 굴립니다.' },
    bossCore: { name: '군주의 핵', desc: '루프2 뿌리 보스를 처치하면 얻는 젬 강화 재료입니다.' },
    fossil: { name: '미궁 화석', desc: '기본 화석 조각입니다. 미궁에서 다양한 타입의 화석으로 정제됩니다.' },
    fossilPrimal: { name: '원시 화석', desc: '균사학자 Lv.4부터 미궁에서 발견되는 복원 전용 화석입니다. 복원하면 화석과 재화를 얻습니다.' },
    fossilAncientPrimal: { name: '원시 고대 화석', desc: '균사학자 Lv.5부터 낮은 확률로 발견되는 복원 전용 화석입니다. 복원하면 전용 화석과 고급 재화 확률이 높습니다.' },
    fossilPrimordial: { name: '태고 화석', desc: '원시 고대 화석 복원으로만 얻는 전용 화석입니다. 관통/카오스 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilJagged: { name: '톱니 화석', desc: '물리/근접 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilBound: { name: '속박 화석', desc: '생명/방어 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilGale: { name: '돌풍 화석', desc: '속도/치명 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilPrismatic: { name: '프리즘 화석', desc: '저항/원소 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilAbyssal: { name: '심연 화석', desc: '카오스/흡혈/재생 계열 옵션 하나를 확정한 카오스 재련을 합니다.' },
    fossilBulwark: { name: '🛡️ 방패 화석', desc: '지하계 전용 화석. 최대 화염/냉기/번개/카오스 저항 또는 최대 받는 물리 피해 감소 계열 옵션을 확정합니다.' },
    fossilWedge: { name: '🗡️ 쐐기 화석', desc: '지하계 전용 화석. 투사체 추가 발사/투사체 피해/치명타 확률 계열 옵션을 확정합니다.' },
    fossilOld: { name: '📜 오래된 화석', desc: '지하계 전용 화석. 화석 전용 옵션 1개를 확정한 카오스 재련을 합니다.' },
    fossilRift: { name: '🌀 균열 화석', desc: '지하계 전용 화석. 2옵션 동시 부여(균열 태그 포함)를 위한 특수 화석입니다.' },
    deepWhetstone: { name: '심층 숫돌', desc: '무기 전용 퀄리티 재화. 장비 퀄리티 1%당 베이스 옵션 효과가 1% 증가합니다.' },
    rootIron: { name: '뿌리철', desc: '방어구 전용 퀄리티 재화. 장비 퀄리티 1%당 베이스 옵션 효과가 1% 증가합니다.' },
    jewelPolish: { name: '보석연마제', desc: '장신구 전용 퀄리티 재화. 장비 퀄리티 1%당 베이스 옵션 효과가 1% 증가합니다.' },
    uberRootTicketFlame: { name: '우버 뿌리 입장권: 화염', desc: '지하계 전용 매우 희귀 보상. 우버 화염 뿌리 보스 도전권입니다.' },
    uberRootTicketFrost: { name: '우버 뿌리 입장권: 냉기', desc: '지하계 전용 매우 희귀 보상. 우버 냉기 뿌리 보스 도전권입니다.' },
    uberRootTicketStorm: { name: '우버 뿌리 입장권: 번개', desc: '지하계 전용 매우 희귀 보상. 우버 번개 뿌리 보스 도전권입니다.' },
    uberRootTicketChaos: { name: '우버 뿌리 입장권: 카오스', desc: '지하계 전용 매우 희귀 보상. 우버 카오스 뿌리 보스 도전권입니다.' },
    runeShard: { name: '룬 조각', desc: '지하계 전용 룬 가공 재료입니다. 해금된 번호 중 1개를 확률로 가공해 룬을 획득합니다.' },
    underCopper: { name: '지하계 구리', desc: '지하계 전용 재화. 인챈트/한계돌파/룬 강화의 기본 재료입니다.' },
    underSilver: { name: '지하계 은', desc: '지하계 전용 희귀 재화. 중~고급 인챈트 및 한계돌파에 사용됩니다.' },
    underGold: { name: '지하계 금', desc: '지하계 전용 초희귀 재화. 강력한 인챈트, 고급 한계돌파, 룬 강화에 사용됩니다.' },
    skyEssence: { name: '창공의 힘', desc: '루프4 창공 몬스터에게서 얻는 젬 강화 재료입니다. 스킬 탭의 젬 강화에서 특수 옵션을 부여합니다.' },
    tainted: { name: '타락의 오브', desc: '아이템을 타락시켜 추가 옵션을 시도합니다. 옵션이 가득 차 있어도 성공 시 초과 부여됩니다. 타락 후 제작 불가.' },
    jewelCore: { name: '주얼 핵(구)', desc: '이전 버전 재화입니다. 로드 시 주얼 결정으로 자동 통합됩니다.' },
    jewelShard: { name: '주얼 결정', desc: '주얼 해체/제작/슬롯 증폭에 사용하는 통합 재화입니다.' },
    hiveKey: { name: '벌집 열쇠', desc: '루프8 이후 맵핑에서 낮은 확률로 발견되는 벌집 입장권입니다.' },
    enchantedHoney: { name: '마력 깃든 벌꿀', desc: '장비 옵션 1개를 영구 고정하는 매우 희귀 재화입니다.' },
    venomStinger: { name: '독벌침', desc: '무기에 랜덤 공격 옵션 한 줄을 추가/재설정합니다.' },
    pollen: { name: '꽃가루', desc: '벌집 열쇠/독벌침/벌꿀 제작에 사용하는 천장 재화입니다.' },
    beeswax: { name: '밀랍', desc: '양봉업자 Lv.8부터 발견되는 벌 재화입니다. 고급 벌 이벤트와 제작 보조에 사용됩니다.' },
    starDust: { name: '별가루', desc: '천문학자 Lv.2부터 관측 중 발견되는 별 재화입니다. 이상 현상과 별쐐기 보조 제작에 사용됩니다.' },
    awakenedEcho: { name: '각성 잔향', desc: '젬 각인사 Lv.12부터 발견되는 각성 재료입니다. Lv.15에서 공격 젬을 각성 젬으로 변환해 젬 자체 보너스를 부여할 때 사용됩니다. 각성 각인은 각성 젬이 아니어도 모든 공격 젬에 부여할 수 있습니다.' },
    sporeFire: { name: '화염 홀씨', desc: '속성 홀씨 제작 태그에 사용됩니다.' },
    sporeCold: { name: '냉기 홀씨', desc: '속성 홀씨 제작 태그에 사용됩니다.' },
    sporeLight: { name: '번개 홀씨', desc: '속성 홀씨 제작 태그에 사용됩니다.' },
    voidChisel: { name: '공허의 끌', desc: '반지/목걸이에 주얼 소켓을 뚫고 제거할 때 쓰입니다.' },
    sealShard: { name: '봉인편린', desc: '루프6 부적 시스템 핵심 재료입니다. 봉인을 해제해 부적 후보를 확인합니다.' },
    strongSealShard: { name: '강력한 기운의 봉인편린', desc: '희귀한 고급 봉인편린입니다. 더 강한 부적 옵션을 노릴 수 있습니다.' },
    radiantSealShard: { name: '찬란한 봉인편린', desc: '극도로 희귀한 최상급 봉인편린입니다. 고유 부적 등장 확률이 높습니다.' },
    meteorShard: { name: '운석 파편', desc: '운석 낙하 지점에서 얻는 검은 별 파편. 별쐐기 제작/리롤에 사용됩니다.' },
    incompleteStarWedge: { name: '불완전한 별쐐기', desc: '미완성 별쐐기 코어. 운석 파편과 결합하면 완성할 수 있습니다.' },
    starWedge: { name: '별쐐기', desc: '검은 별의 파편. 패시브 트리에 장착해 주변 노드 효과를 변성시킵니다.' }
};
const MARKET_EXCHANGES = [
    { id: 'm1', from: 'transmute', to: 'augment', need: 8, gain: 1 },
    { id: 'm2', from: 'augment', to: 'alteration', need: 8, gain: 1 },
    { id: 'm3', from: 'alteration', to: 'alchemy', need: 8, gain: 1 },
    { id: 'm4', from: 'alchemy', to: 'chaos', need: 20, gain: 1 },
    { id: 'm5', from: 'chaos', to: 'exalted', need: 15, gain: 1 },
    { id: 'm6', from: 'chaos', to: 'divine', need: 100, gain: 1 },
    { id: 'm7', from: 'chaos', to: 'regal', need: 3, gain: 1 },
    { id: 'm8', from: 'regal', to: 'chaos', need: 8, gain: 1 },
    { id: 'm9', from: 'chaos', to: 'scour', need: 4, gain: 1 },
    { id: 'm10', from: 'exalted', to: 'divine', need: 5, gain: 1 },
    { id: 'm11', from: 'divine', to: 'chaos', need: 1, gain: 30 }
    ,{ id: 'm12', from: 'chaos', to: 'blessing', need: 5, gain: 1 }
    ,{ id: 'm13', from: 'blessing', to: 'chaos', need: 3, gain: 1 }
];

safeExposeData({ UNIQUE_DB, ORB_DB, MARKET_EXCHANGES });
