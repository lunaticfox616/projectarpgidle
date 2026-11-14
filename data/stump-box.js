// GENERATED from modules/data/stump-box.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/stump-box.mjs
  var STUMP_BOX_SIZE = 5;
  var STUMP_BOX_COLORS = Object.freeze({
    physical: Object.freeze({ label: "물리", tone: "#c9a27a" }),
    cold: Object.freeze({ label: "냉기", tone: "#6cb8ec" }),
    lightning: Object.freeze({ label: "번개", tone: "#f0cc3a" }),
    fire: Object.freeze({ label: "화염", tone: "#f07a34" }),
    chaos: Object.freeze({ label: "카오스", tone: "#b070dc" })
  });
  var STUMP_BOX_OVERCOMES = Object.freeze({ physical: "chaos", chaos: "cold", cold: "fire", fire: "lightning", lightning: "physical" });
  var STUMP_BOX_FEEDS = Object.freeze({ physical: "fire", fire: "chaos", chaos: "lightning", lightning: "cold", cold: "physical" });
  var STUMP_BOX_CELL_ORDER = Object.freeze([12, 7, 11, 13, 17, 6, 8, 16, 18, 2, 10, 14, 22, 1, 9, 23, 15, 3, 19, 21, 5, 0, 4, 24, 20]);
  var STUMP_BOX_OPENING = Object.freeze({ start: 9, everyLoops: 1 });
  var STUMP_BOX_GROWTH = Object.freeze({
    need: Object.freeze({ seed: 3200, talisman: 2400, scar: 3200 }),
    v1Need: Object.freeze({ seed: 400, talisman: 300, scar: 400 }),
    legacySapNeed: 4e3,
    perKill: Object.freeze({ normal: 2, elite: 12, boss: 60 })
  });
  var STUMP_BOX_KINDS = Object.freeze(["flower", "fruit", "vine", "root"]);
  var STUMP_BOX_DROPS = Object.freeze({
    chance: Object.freeze({ normal: 3e-3, elite: 0.03, boss: 0.28 }),
    boardColorShare: 0.5,
    roll: Object.freeze({ min: 0.8, max: 1.2 })
  });
  var STUMP_BOX_COMPOST = Object.freeze({ growth: 120 });
  var STUMP_BOX_NURSERY = Object.freeze({ rate: 0.1, ratePerRank: 0.1 });
  var STUMP_BOX_ROLL_LIMIT = Object.freeze({ min: 0.8, max: 1.3 });
  var STUMP_BOX_STORAGE_BASE = 50;
  var STUMP_BOX_SYNERGY = Object.freeze({
    resonance: Object.freeze({ label: "공명", length: 3, bonusPct: 10 }),
    feed: Object.freeze({ label: "상생", bonusPct: 10 }),
    discipline: Object.freeze({ label: "규율", bonusPct: 15 })
  });
  var STUMP_BOX_HARVEST = Object.freeze({ rows: STUMP_BOX_KINDS, giftRoll: STUMP_BOX_DROPS.roll.max });
  var STUMP_BOX_HARVEST_CRAFT = Object.freeze({
    colors: Object.freeze({ fire: "fire", cold: "cold", light: "lightning", chaos: "chaos", damage: "physical" }),
    rot: Object.freeze(["fire", "cold", "lightning"]),
    riftKind: "root"
  });
  var STUMP_BOX_UNLOCKS = Object.freeze([
    Object.freeze({ id: "storage_harvest", label: "보관함 +25", when: Object.freeze({ harvestRows: 1 }), storage: 25 }),
    Object.freeze({ id: "storage_labyrinth", label: "보관함 +25", when: Object.freeze({ journal: "labyrinth_10" }), storage: 25 }),
    // 뿌리 기억(2026-11-04 사용자, 전: 루프가 바뀌어도 성장 완료된 아이템의 경험치 25%, 나무꾼의 잔상 저널로 50% 유지): 봉인 칸 밖이 모두
    // 사라지게 되어 봉인 칸 +1이 됐다. id는 그대로다(본 해금 알림과 저장의 해금 기록).
    Object.freeze({ id: "root_memory_loop", label: "뿌리 기억, 봉인 칸 +1", when: Object.freeze({ content: "rootMemory" }), sealSlots: 1, rootMemory: true }),
    Object.freeze({ id: "root_memory_echo", label: "뿌리 기억 2, 봉인 칸 +1", when: Object.freeze({ journal: "woodsman_echo" }), sealSlots: 1, rootMemory: true }),
    Object.freeze({ id: "compost_bulk", label: "일괄 거름 사용", when: Object.freeze({ harvestCells: 4 }), bulkCompost: true }),
    Object.freeze({ id: "breeding", label: "번식", when: Object.freeze({ harvestRow: "fruit" }), breeding: true }),
    Object.freeze({ id: "pouch_meteor_fall", label: "씨앗 주머니", when: Object.freeze({ journal: "meteor_fall" }), pouch: true }),
    Object.freeze({ id: "pouch_beehive_queen", label: "씨앗 주머니", when: Object.freeze({ journal: "beehive_queen" }), pouch: true }),
    Object.freeze({ id: "pouch_void_grand_breach", label: "씨앗 주머니", when: Object.freeze({ journal: "void_grand_breach" }), pouch: true }),
    Object.freeze({ id: "seal_1", label: "봉인 칸 1, 포식", when: Object.freeze({ content: "stumpSeal1" }), sealSlots: 1, devour: true }),
    Object.freeze({ id: "seal_2", label: "봉인 칸 2", when: Object.freeze({ content: "stumpSeal2" }), sealSlots: 1 }),
    Object.freeze({ id: "quality_140", label: "품질 상한 140%", when: Object.freeze({ content: "stumpQuality1" }), qualityCap: 1.4 }),
    Object.freeze({ id: "seal_3", label: "봉인 칸 3", when: Object.freeze({ content: "stumpSeal3" }), sealSlots: 1 }),
    Object.freeze({ id: "quality_150", label: "품질 상한 150%, 접붙이기 6단계", when: Object.freeze({ content: "stumpQuality2" }), qualityCap: 1.5, graftRanks: 1 }),
    // 루프 50 이후 이정표(2026-10-09, data/maps.js SEASON_CONTENT_ROADMAP): 봉인 칸, 품질 상한, 접붙이기 단계가 이어서 열린다.
    Object.freeze({ id: "seal_4", label: "봉인 칸 4", when: Object.freeze({ content: "stumpSeal4" }), sealSlots: 1 }),
    Object.freeze({ id: "quality_160", label: "품질 상한 160%, 접붙이기 7단계", when: Object.freeze({ content: "stumpQuality3" }), qualityCap: 1.6, graftRanks: 1 }),
    Object.freeze({ id: "seal_5", label: "봉인 칸 5", when: Object.freeze({ content: "stumpSeal5" }), sealSlots: 1 }),
    Object.freeze({ id: "quality_170", label: "품질 상한 170%, 접붙이기 8단계", when: Object.freeze({ content: "stumpQuality4" }), qualityCap: 1.7, graftRanks: 1 }),
    Object.freeze({ id: "seal_6", label: "봉인 칸 6", when: Object.freeze({ content: "stumpSeal6" }), sealSlots: 1 }),
    Object.freeze({ id: "quality_180", label: "품질 상한 180%, 접붙이기 9단계", when: Object.freeze({ content: "stumpQuality5" }), qualityCap: 1.8, graftRanks: 1 })
  ]);
  var BOSS_EXTRA_LINE = Object.freeze({ stat: "bossDamagePct", value: 1.5, weight: 0.5, span: Object.freeze({ min: 0.4, max: 1 }), text: "보스 상대 피해 +{v}%" });
  var STUMP_BOX_RIPENING = Object.freeze({
    // Once per bloom. These unique lines never scale with quality, resonance or grafts.
    // 2026-11-04: 물리 줄, 덩굴(새로), 뿌리(옛 호박석 그대로에 물리)를 더했다. 수치는 사용자에게 표로 보인 첫 시안이다.
    albino: Object.freeze({ chance: 1e-4, tone: "#e8ddff", variants: Object.freeze({
      flower: Object.freeze({
        physical: [{ stat: "physGemLevel", value: 3, text: "물리 스킬룬 레벨 +{v}" }],
        fire: [{ stat: "fireGemLevel", value: 3, text: "화염 스킬룬 레벨 +{v}" }],
        cold: [{ stat: "coldGemLevel", value: 3, text: "냉기 스킬룬 레벨 +{v}" }],
        lightning: [{ stat: "lightGemLevel", value: 3, text: "번개 스킬룬 레벨 +{v}" }],
        chaos: [{ stat: "chaosGemLevel", value: 3, text: "카오스 스킬룬 레벨 +{v}" }]
      }),
      fruit: Object.freeze({
        physical: [{ stat: "gemLevel", value: 1, text: "모든 스킬룬 레벨 +{v}" }],
        fire: [{ stat: "meleeGemLevel", value: 3, text: "근접 스킬룬 레벨 +{v}" }, { stat: "slamGemLevel", value: 2, text: "강타 스킬룬 레벨 +{v}" }],
        cold: [{ stat: "spellGemLevel", value: 3, text: "주문 스킬룬 레벨 +{v}" }],
        lightning: [{ stat: "projectileGemLevel", value: 3, text: "투사체 스킬룬 레벨 +{v}" }],
        chaos: [{ stat: "summonGemLevel", value: 3, text: "소환수 공격 스킬룬 레벨 +{v}" }, { stat: "dotGemLevel", value: 2, text: "지속 스킬룬 레벨 +{v}" }]
      }),
      vine: Object.freeze({
        physical: [{ stat: "ds", value: 15, text: "연속 타격 확률 +{v}%" }],
        fire: [{ stat: "move", value: 20, text: "이동 속도 +{v}%" }],
        cold: [{ stat: "cooldownReduction", value: 15, text: "재사용 대기시간 감소 +{v}%" }],
        lightning: [{ stat: "aspd", value: 15, text: "공격/시전 속도 +{v}%" }],
        chaos: [{ stat: "skillDelayReduce", value: 10, text: "공격 딜레이 감소 +{v}%" }]
      }),
      root: Object.freeze({
        physical: [{ stat: "doubleDamageChance", value: 10, text: "두 배 피해 확률 +{v}%" }],
        fire: [{ stat: "runeResonancePower", value: 50, text: "공명력 +{v}" }],
        cold: [{ stat: "spellRepeatChance", value: 25, text: "주문 이중 시전 확률 +{v}%" }],
        lightning: [{ stat: "projectileExtraShots", value: 2, text: "투사체 추가 발사 +{v}" }],
        chaos: [{ stat: "suppCap", value: 1, text: "보조스킬룬 한도 +{v}" }, { stat: "runeResonancePower", value: 20, text: "공명력 +{v}" }]
      })
    }) }),
    bumper: Object.freeze({ chance: 0.08, quality: 0.1 }),
    golden: Object.freeze({ chance: 5e-3, dropChance: 1e-3, mul: 1.2 }),
    lineOdds: Object.freeze([
      Object.freeze({ roll: 0.8, odds: Object.freeze([0.65, 0.3, 0.045, 5e-3]) }),
      Object.freeze({ roll: 1, odds: Object.freeze([0.55, 0.37, 0.07, 0.01]) }),
      Object.freeze({ roll: 1.3, odds: Object.freeze([0.4, 0.45, 0.125, 0.025]) }),
      Object.freeze({ roll: 1.5, odds: Object.freeze([0.32, 0.47, 0.17, 0.04]) })
    ]),
    lineValue: Object.freeze({ min: 0.7, max: 1.3 })
  });
  var STUMP_LINE = Object.freeze({
    bleedChance: { stat: "bleedChance", value: 3, text: "출혈 확률 +{v}%" },
    bleedDuration: { stat: "bleedDurationPct", value: 5, text: "출혈 지속시간 +{v}%" },
    physIgnore: { stat: "physIgnore", value: 1.5, text: "물리 피해 감소 무시 +{v}%" },
    igniteChance: { stat: "igniteChance", value: 3, text: "점화 확률 +{v}%" },
    igniteEffect: { stat: "igniteDamageMultiplierPct", value: 5, text: "점화 효율 +{v}%" },
    freezeChance: { stat: "freezeChance", value: 3, text: "동결 확률 +{v}%" },
    chillEffect: { stat: "chillEffect", value: 5, text: "냉각 효율 +{v}%" },
    shockChance: { stat: "shockChance", value: 3, text: "감전 확률 +{v}%" },
    shockEffect: { stat: "shockEffect", value: 5, text: "감전 효율 +{v}%" },
    poisonChance: { stat: "poisonChance", value: 3, text: "중독 확률 +{v}%" },
    poisonDamage: { stat: "poisonDamageMultiplierPct", value: 5, text: "중독 피해 +{v}%" },
    dot: { stat: "dotPctDmg", value: 3, text: "지속 피해 배율 +{v}%" },
    resPen: { stat: "resPen", value: 1.5, text: "저항 관통 +{v}%" },
    melee: { stat: "meleePctDmg", value: 4, text: "근접 피해 +{v}%" },
    projectile: { stat: "projectilePctDmg", value: 4, text: "투사체 피해 +{v}%" },
    area: { stat: "aoePctDmg", value: 4, text: "범위 피해 +{v}%" },
    ailmentDamage: { stat: "ailmentDamagePct", value: 4, text: "상태이상 피해 +{v}%" },
    ailmentPotency: { stat: "ailmentPotencyPct", value: 3, text: "상태이상 위력 +{v}%" },
    shocked: { stat: "shockedEnemyHitDamagePct", value: 4, text: "감전된 적에게 주는 명중 피해 +{v}%" },
    crit: { stat: "crit", value: 1, text: "치명타 확률 +{v}%" },
    critDamage: { stat: "critDmg", value: 6, text: "치명타 피해 +{v}%" },
    spellCrit: { stat: "spellCritDmg", value: 8, text: "주문 치명타 피해 +{v}%" },
    elite: { stat: "eliteDamagePct", value: 2.5, text: "정예 상대 피해 +{v}%" },
    firstStrike: { stat: "firstStrikeDamagePct", value: 4, text: "첫 타격 피해 +{v}%" },
    alone: { stat: "takenDamageReduceWhen1EnemyPct", value: 1, text: "적이 하나일 때 받는 피해 -{v}%" },
    crowd: { stat: "takenDamageReduceWhen2EnemiesPct", value: 1, text: "적이 둘 이상일 때 받는 피해 -{v}%" },
    double: { stat: "doubleDamageChance", value: 1, text: "피해 2배 확률 +{v}%" },
    cull: { stat: "cullStrikePct", value: 1, text: "처형 일격 +{v}%" },
    critTaken: { stat: "critTakenDamageReducePct", value: 2.5, text: "치명타로 받는 피해 -{v}%" },
    taken: { stat: "genericTakenDamageReducePct", value: 1, text: "받는 피해 -{v}%" },
    cooldown: { stat: "cooldownReduction", value: 2, text: "재사용 대기시간 감소 +{v}%" },
    mobilityCooldown: { stat: "mobilityCooldownReduction", value: 4, text: "이동 룬 재사용 대기시간 감소 +{v}%" },
    hp: { stat: "pctHp", value: 2, text: "생명력 +{v}%" },
    flatHp: { stat: "flatHp", value: 20, text: "최대 생명력 +{v}" },
    resAll: { stat: "resAll", value: 2, text: "모든 원소 저항 +{v}%" },
    armor: { stat: "armorPct", value: 4, text: "방어도 +{v}%" },
    evasion: { stat: "evasionPct", value: 4, text: "회피 +{v}%" },
    shield: { stat: "energyShieldPct", value: 4, text: "에너지 보호막 +{v}%" },
    regen: { stat: "regen", value: 0.2, text: "초당 생명력 재생 +{v}%" }
  });
  var linesOf = (...keys) => Object.freeze(keys.map((key) => typeof key === "string" ? Object.freeze(STUMP_LINE[key]) : Object.freeze(key)));
  var VINE_YIELDS = Object.freeze({
    physical: Object.freeze({ stat: "ds", value: 2, text: "연속 타격 확률 +{v}%" }),
    cold: Object.freeze({ stat: "cooldownRecovery", value: 6, text: "재사용 대기시간 회복 속도 +{v}%" }),
    lightning: Object.freeze({ stat: "aspd", value: 3, text: "공격/시전 속도 +{v}%" }),
    fire: Object.freeze({ stat: "move", value: 4, text: "이동 속도 +{v}%" }),
    chaos: Object.freeze({ stat: "skillDelayReduce", value: 1, text: "공격 딜레이 감소 +{v}%" })
  });
  var VINE_EXTRA_LINES = Object.freeze(Object.fromEntries(Object.keys(VINE_YIELDS).map((color) => [color, linesOf(
    ...Object.entries(VINE_YIELDS).filter(([other]) => other !== color).map(([, line]) => ({ ...line, value: line.value / 2 })),
    "cooldown",
    "mobilityCooldown"
  )])));
  var STUMP_BOX_EXTRA_LINES = Object.freeze({
    flower: Object.freeze({
      physical: linesOf("bleedChance", "bleedDuration", "physIgnore", "melee", "critDamage", "area"),
      cold: linesOf("freezeChance", "chillEffect", "resPen", "spellCrit", "projectile", "crit"),
      lightning: linesOf("shockChance", "shockEffect", "resPen", "shocked", "projectile", "critDamage"),
      fire: linesOf("igniteChance", "igniteEffect", "resPen", "ailmentDamage", "area", "crit"),
      chaos: linesOf("poisonChance", "poisonDamage", "dot", "ailmentPotency", "area", "resPen")
    }),
    fruit: Object.freeze({
      physical: linesOf(BOSS_EXTRA_LINE, "elite", "firstStrike", "alone", "double", "cull"),
      cold: linesOf(BOSS_EXTRA_LINE, "elite", "firstStrike", "crowd", "double", "critTaken"),
      lightning: linesOf(BOSS_EXTRA_LINE, "firstStrike", "alone", "crowd", "cull", "double"),
      fire: linesOf("elite", "firstStrike", "alone", "crowd", "double", "cull"),
      chaos: linesOf(BOSS_EXTRA_LINE, "elite", "alone", "crowd", "cull", "critTaken")
    }),
    vine: VINE_EXTRA_LINES,
    root: Object.freeze({
      physical: linesOf("armor", "hp", "critTaken", "taken", "flatHp", "resAll"),
      cold: linesOf({ stat: "maxResC", value: 0.5, text: "최대 냉기 저항 +{v}%" }, "hp", "evasion", "flatHp", "taken", "resAll"),
      lightning: linesOf({ stat: "maxResL", value: 0.5, text: "최대 번개 저항 +{v}%" }, "hp", "shield", "flatHp", "taken", "resAll"),
      fire: linesOf({ stat: "maxResF", value: 0.5, text: "최대 화염 저항 +{v}%" }, "hp", "armor", "flatHp", "taken", "resAll"),
      chaos: linesOf({ stat: "maxResChaos", value: 0.5, text: "최대 카오스 저항 +{v}%" }, "hp", "regen", "flatHp", "taken", "critTaken")
    })
  });
  var STUMP_BOX_SCAR = Object.freeze({
    name: "불씨의 흉터",
    absorb: Object.freeze({ ripe: 0.5 }),
    capMul: 3,
    maxLines: 3,
    bossChance: 0.15,
    tone: "#e0561a"
  });
  var STUMP_BOX_BREEDING = Object.freeze({ mutation: Object.freeze({ color: 0.05, golden: 5e-3, scar: 3e-3 }) });
  var STUMP_BOX_SEED_POUCH = Object.freeze({ offers: 3, roll: Object.freeze({ min: 0.9, max: 1.2 }) });
  var STUMP_BOX_BULK_COMPOST = Object.freeze({ keep: 3 });
  var STUMP_BOX_TALISMAN_CODEX = Object.freeze({ every: 5, storage: 2 });
  var STUMP_BOX_GRAFT = Object.freeze({
    startLoop: 18,
    pointsPerLoop: 3,
    maxRank: 5,
    pctPerRank: 10,
    refundSpores: 1,
    journalPoints: Object.freeze({
      pinnacle_underking: 3,
      pinnacle_leviathan: 3,
      pinnacle_sky: 3,
      pinnacle_observer: 3,
      rival_overheat: 2,
      rival_dull: 2,
      rival_glutton: 2,
      rival_afterimage: 2,
      rival_backedge: 2,
      rival_masterwork: 2
    })
  });
  var STUMP_BOX_YIELDS = Object.freeze({
    flower: Object.freeze({
      physical: Object.freeze({ stat: "physPctDmg", value: 6, text: "물리 피해 +{v}%" }),
      fire: Object.freeze({ stat: "firePctDmg", value: 6, text: "화염 피해 +{v}%" }),
      cold: Object.freeze({ stat: "coldPctDmg", value: 6, text: "냉기 피해 +{v}%" }),
      lightning: Object.freeze({ stat: "lightPctDmg", value: 6, text: "번개 피해 +{v}%" }),
      chaos: Object.freeze({ stat: "chaosPctDmg", value: 6, text: "카오스 피해 +{v}%" })
    }),
    fruit: Object.freeze({
      physical: Object.freeze({ stat: "takenDamageReduceWhen2EnemiesPct", value: 2, text: "적이 둘 이상일 때 받는 피해 -{v}%" }),
      fire: Object.freeze({ stat: "bossDamagePct", value: 3, text: "보스 상대 피해 +{v}%" }),
      cold: Object.freeze({ stat: "takenDamageReduceWhen1EnemyPct", value: 2, text: "적이 하나일 때 받는 피해 -{v}%" }),
      lightning: Object.freeze({ stat: "eliteDamagePct", value: 5, text: "정예 상대 피해 +{v}%" }),
      chaos: Object.freeze({ stat: "firstStrikeDamagePct", value: 8, text: "첫 타격 피해 +{v}%" })
    }),
    vine: VINE_YIELDS,
    root: Object.freeze({
      physical: Object.freeze({ stat: "dr", value: 2, text: "물리 피해 감소 +{v}%" }),
      fire: Object.freeze({ stat: "resF", value: 5, text: "화염 저항 +{v}%" }),
      cold: Object.freeze({ stat: "resC", value: 5, text: "냉기 저항 +{v}%" }),
      lightning: Object.freeze({ stat: "resL", value: 5, text: "번개 저항 +{v}%" }),
      chaos: Object.freeze({ stat: "resChaos", value: 3, text: "카오스 저항 +{v}%" })
    })
  });
  var STUMP_BOX_STAGES = Object.freeze({
    seed: Object.freeze({ label: "씨앗", icon: "seed" }),
    flower: Object.freeze({ label: "꽃", icon: "flower" }),
    fruit: Object.freeze({ label: "열매", icon: "fruit" }),
    vine: Object.freeze({ label: "덩굴", icon: "vine" }),
    root: Object.freeze({ label: "뿌리", icon: "root" }),
    sealed: Object.freeze({ label: "잠든 부적", icon: "sealed" }),
    talisman: Object.freeze({ label: "부적", icon: "talisman" }),
    scarAsleep: Object.freeze({ label: "식은 흉터", icon: "scar-ash" }),
    scar: Object.freeze({ label: "불씨의 흉터", icon: "scar-ember" })
  });
  var STUMP_BOX_ANCIENT = Object.freeze({ graftRanks: 1 });

  // modules/data/stump-box.mjs:classic
  Object.assign(globalThis, { STUMP_BOX_SIZE, STUMP_BOX_COLORS, STUMP_BOX_OVERCOMES, STUMP_BOX_FEEDS, STUMP_BOX_CELL_ORDER, STUMP_BOX_OPENING, STUMP_BOX_GROWTH, STUMP_BOX_KINDS, STUMP_BOX_DROPS, STUMP_BOX_COMPOST, STUMP_BOX_NURSERY, STUMP_BOX_ROLL_LIMIT, STUMP_BOX_STORAGE_BASE, STUMP_BOX_SYNERGY, STUMP_BOX_HARVEST, STUMP_BOX_HARVEST_CRAFT, STUMP_BOX_UNLOCKS, BOSS_EXTRA_LINE, STUMP_BOX_RIPENING, STUMP_LINE, linesOf, VINE_YIELDS, VINE_EXTRA_LINES, STUMP_BOX_EXTRA_LINES, STUMP_BOX_SCAR, STUMP_BOX_BREEDING, STUMP_BOX_SEED_POUCH, STUMP_BOX_BULK_COMPOST, STUMP_BOX_TALISMAN_CODEX, STUMP_BOX_GRAFT, STUMP_BOX_YIELDS, STUMP_BOX_STAGES, STUMP_BOX_ANCIENT });
  if (typeof safeExposeData === "function") safeExposeData({ STUMP_BOX_SIZE, STUMP_BOX_COLORS, STUMP_BOX_OVERCOMES, STUMP_BOX_FEEDS, STUMP_BOX_CELL_ORDER, STUMP_BOX_OPENING, STUMP_BOX_GROWTH, STUMP_BOX_KINDS, STUMP_BOX_DROPS, STUMP_BOX_COMPOST, STUMP_BOX_NURSERY, STUMP_BOX_ROLL_LIMIT, STUMP_BOX_STORAGE_BASE, STUMP_BOX_SYNERGY, STUMP_BOX_HARVEST, STUMP_BOX_HARVEST_CRAFT, STUMP_BOX_UNLOCKS, BOSS_EXTRA_LINE, STUMP_BOX_RIPENING, STUMP_LINE, linesOf, VINE_YIELDS, VINE_EXTRA_LINES, STUMP_BOX_EXTRA_LINES, STUMP_BOX_SCAR, STUMP_BOX_BREEDING, STUMP_BOX_SEED_POUCH, STUMP_BOX_BULK_COMPOST, STUMP_BOX_TALISMAN_CODEX, STUMP_BOX_GRAFT, STUMP_BOX_YIELDS, STUMP_BOX_STAGES, STUMP_BOX_ANCIENT });
})();
