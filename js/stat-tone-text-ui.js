// GENERATED from modules/stat-tone-text-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/region-affixes.mjs
  var REGION_AFFIX_TONES = Object.freeze({ roots: "#c6a3ff", trunk: "#e3b77d", canopy: "#9fe3ff", garden: "#ff9f72", sanctum: "#a9c9ff" });
  var REGION_AFFIX_MODS = (() => {
    function tiers(min, max, decimal) {
      const unit = decimal ? 0.01 : 1, units = Math.round((max - min) / unit) + 1, round = (value) => Math.round(value * 100) / 100;
      const out = [];
      let low = min;
      for (let tier = 0; tier < 20; tier++) {
        const width = Math.floor(units * (tier + 1) / 20) - Math.floor(units * tier / 20);
        const high = round(low + (width - 1) * unit);
        out.push(Object.freeze([low, high]));
        low = round(high + unit);
      }
      return Object.freeze(out);
    }
    const region = (name) => (id, type, statName, slots, [min, max, decimal]) => Object.freeze({
      id,
      statId: id,
      type,
      statName,
      slots: Object.freeze(slots),
      regions: Object.freeze([name]),
      weight: 0.5,
      affixBalanceVersion: 2,
      tierValues: tiers(min, max, decimal)
    });
    const [roots, trunk, canopy, garden, sanctum] = ["roots", "trunk", "canopy", "garden", "sanctum"].map(region);
    return Object.freeze([
      // 깊은 뿌리(카오스): 중독이 번지고, 저항을 갉고, 중독된 적에게서 생명을 빨고, 넘치는 카오스 저항이 힘이 된다.
      roots("regionPoisonSpread", "suffix", "중독된 적 처치 시 주변에 중독 번짐(%)", ["무기", "장갑", "반지"], [20, 100]),
      roots("regionChaosShred", "prefix", "적중 시 적 카오스 저항 감소(%, 5중첩)", ["무기", "목걸이", "장갑"], [0.5, 3, true]),
      roots("regionPoisonedLeech", "suffix", "중독된 적에게 준 피해 생명력 흡수(%)", ["투구", "갑옷", "허리띠"], [0.3, 2.2, true]),
      roots("regionChaosOvercap", "prefix", "초과 카오스 저항 1%마다 카오스 피해(%)", ["갑옷", "방패", "목걸이"], [0.5, 2.5, true]),
      // 고목 줄기(물리): 막고 되받아치고, 단단할수록 세고, 피 흘리는 적을 쪼개고, 쓰러질 듯할 때 버틴다.
      trunk("regionBlockEmpower", "suffix", "막기 후 다음 공격 피해 증가(%)", ["방패", "장갑", "갑옷"], [20, 120]),
      trunk("regionArmorToPhys", "prefix", "방어도 1000마다 물리 피해(%)", ["갑옷", "방패", "투구"], [0.5, 4, true]),
      trunk("regionBleedingDamage", "prefix", "출혈 중인 적에게 주는 피해 증가(%)", ["무기", "장갑", "반지"], [14, 140]),
      trunk("regionLowLifeDR", "suffix", "생명력 절반 이하일 때 받는 피해 감소(%)", ["갑옷", "허리띠", "신발"], [3, 22]),
      // 하늘 가지(번개): 번개가 튀고, 치명타 뒤에 바람을 타고, 감전이 번지고, 감전된 적의 번개 저항을 뚫는다.
      canopy("regionShockChain", "prefix", "감전된 적 적중 시 번개 튐 확률(%)", ["무기", "장갑", "반지"], [5, 40]),
      canopy("regionCritMove", "suffix", "치명타 후 2초간 이동 속도(%)", ["신발", "장갑", "목걸이"], [5, 24]),
      canopy("regionShockSpread", "suffix", "감전된 적 처치 시 주변에 감전 번짐(%)", ["무기", "투구", "반지"], [30, 100]),
      canopy("regionShockedLightPen", "prefix", "감전된 적의 번개 저항 무시(%)", ["무기", "목걸이", "투구"], [2, 21]),
      // 잊힌 정원(화염): 불씨가 옮겨 붙고, 온전할 때 더 타오르고, 오래 타고, 타는 적을 더 찌른다.
      garden("regionIgniteSpread", "suffix", "점화된 적 처치 시 주변에 점화 번짐(%)", ["무기", "장갑", "목걸이"], [20, 100]),
      garden("regionFullLifeFire", "prefix", "생명력이 가득할 때 화염 피해(%)", ["투구", "갑옷", "목걸이"], [14, 140]),
      garden("regionIgniteDuration", "suffix", "점화 지속 시간(%)", ["무기", "반지", "허리띠"], [10, 80]),
      garden("regionIgnitedDamage", "prefix", "점화된 적에게 주는 피해 증가(%)", ["무기", "장갑", "반지"], [14, 140]),
      // 잠든 성소(냉기): 얼어붙은 적을 깨뜨리고, 깨진 얼음이 튀고, 무엇으로 쳐도 식히고, 식은 적의 공격이 무디다.
      sanctum("regionFrozenCritDamage", "prefix", "동결된 적에게 치명타 피해 증가(%)", ["무기", "장갑", "반지"], [20, 160]),
      sanctum("regionShatter", "suffix", "동결된 적 처치 시 얼음 파편(적 최대 생명력 %)", ["무기", "목걸이", "투구"], [5, 40]),
      sanctum("regionChillOnHit", "suffix", "적중 시 냉각 확률(%)", ["장갑", "반지", "신발"], [3, 22]),
      sanctum("regionChilledAttackerDR", "suffix", "냉각된 적에게 받는 피해 감소(%)", ["갑옷", "방패", "허리띠"], [3, 22])
    ]);
  })();

  // modules/ui/stat-tone-palette.mjs
  var ITEM_STAT_TONE_BY_ID = Object.freeze(Object.fromEntries([
    ["#ff9a76", ["firePctDmg", "resF", "igniteChance", "fireResOvercapMulPerPct"]],
    ["#8fd3ff", ["coldPctDmg", "resC", "freezeChance"]],
    ["#ffe083", ["lightPctDmg", "resL", "shockChance"]],
    ["#c7a6ff", ["chaosPctDmg", "resChaos", "dotPctDmg", "poisonChance"]],
    ["#ffd2a6", ["armor", "armorPct", "dr", "takenDamageReduceWhen1EnemyPct", "takenDamageReduceWhen2EnemiesPct"]],
    ["#baffc2", ["evasion", "evasionPct", "deflectChance", "deflectDamageReduce"]],
    ["#8fdcff", ["energyShield", "energyShieldPct", "energyShieldRegen", "energyShieldRechargeFaster"]],
    ["#ffb3b3", ["flatHp", "pctHp", "regen", "regenFlat"]],
    ["#ffd6f2", ["crit", "critDmg"]],
    ["#fff3a8", ["aspd", "move", "sight", "cooldownRecovery", "cooldownReduction", "mobilityCooldownRecovery", "mobilityCooldownReduction"]],
    ["#ffcf9f", [
      "flatDmg",
      "pctDmg",
      "physPctDmg",
      "meleePctDmg",
      "aoePctDmg",
      "minDmgRoll",
      "maxDmgRoll",
      "bossDamagePct",
      "eliteDamagePct",
      "firstStrikeDamagePct",
      "doubleDamageChance"
    ]],
    ["#d4a8ff", ["spellFlatPct", "spellFlatDmg"]],
    ["#ff8fa3", ["leech"]],
    ["#ffcb8e", ["resPen", "resAll", "ds"]],
    ["#a8e6cf", ["gemLevel", "suppCap", "expGain", "summonEfficiency", "summonCap"]],
    // 세계수 기운(12번 루프 27): 지역 줄은 그 지역 색(data/region-affixes.js REGION_AFFIX_TONES).
    ...REGION_AFFIX_MODS.map((row) => [REGION_AFFIX_TONES[row.regions[0]], [row.statId]])
  ].flatMap(([tone, ids]) => ids.map((id) => [id, tone]))));
  var STAT_TONE_FAMILIES = Object.freeze([
    [
      "#ffcb8e",
      [
        "res",
        "pen"
      ]
    ],
    [
      "#c7a6ff",
      [
        "chaos",
        "dot",
        "poison",
        "bleed"
      ]
    ],
    [
      "#ff9a76",
      [
        "fire",
        "ignite",
        "burn"
      ]
    ],
    [
      "#8fd3ff",
      [
        "cold",
        "freeze",
        "chill"
      ]
    ],
    [
      "#ffe083",
      [
        "light",
        "shock"
      ]
    ],
    [
      "#ffb3b3",
      [
        "hp",
        "life",
        "regen",
        "leech"
      ]
    ],
    [
      "#ffd2a6",
      [
        "armor",
        "block",
        "guard",
        "dr"
      ]
    ],
    [
      "#baffc2",
      [
        "evasion",
        "dodge",
        "deflect"
      ]
    ],
    [
      "#8fdcff",
      [
        "energyshield",
        "es"
      ]
    ],
    [
      "#ffd6f2",
      [
        "crit"
      ]
    ],
    [
      "#fff3a8",
      [
        "aspd",
        "speed",
        "move"
      ]
    ],
    [
      "#d4a8ff",
      [
        "spell"
      ]
    ],
    [
      "#a8e6cf",
      [
        "gem",
        "supp"
      ]
    ],
    [
      "#ffcf9f",
      [
        "dmg",
        "atk",
        "phys",
        "melee",
        "aoe"
      ]
    ]
  ]);
  function getItemStatToneColor(statId) {
    if (!statId) return "#d7e9ff";
    const id = String(statId);
    if (ITEM_STAT_TONE_BY_ID[id]) return ITEM_STAT_TONE_BY_ID[id];
    const low = id.toLowerCase();
    const family = STAT_TONE_FAMILIES.find(([, words]) => words.some((word) => low.includes(word)));
    return family ? family[0] : "#d7e9ff";
  }

  // modules/ui/stat-tone-text.mjs
  var KEYWORDS = Object.freeze([
    ["에너지 보호막", "energyShield"],
    ["보호막", "energyShield"],
    ["공격 속도", "aspd"],
    ["시전 속도", "aspd"],
    ["이동 속도", "move"],
    ["이속", "move"],
    ["공속", "aspd"],
    // 붙여 쓴 말(재능 카드 원문 등)
    ["공격속도", "aspd"],
    ["시전속도", "aspd"],
    ["이동속도", "move"],
    ["치명타확률", "crit"],
    ["피해감소", "dr"],
    ["최대생명력", "flatHp"],
    ["물리 피해 감소", "dr"],
    ["치명타 피해", "critDmg"],
    ["치명타 확률", "crit"],
    ["치명타", "crit"],
    ["치명", "crit"],
    ["모든 원소 저항", "resAll"],
    ["원소 저항", "resAll"],
    ["최대 저항", "resAll"],
    ["저항 관통", "resPen"],
    ["화염 저항", "resF"],
    ["냉기 저항", "resC"],
    ["번개 저항", "resL"],
    ["카오스 저항", "resChaos"],
    ["화염 피해", "firePctDmg"],
    ["냉기 피해", "coldPctDmg"],
    ["번개 피해", "lightPctDmg"],
    ["카오스 피해", "chaosPctDmg"],
    ["물리 피해", "physPctDmg"],
    ["주문 피해", "spellPctDmg"],
    ["원소 피해", "elementalPctDmg"],
    ["화염", "firePctDmg"],
    ["점화", "igniteChance"],
    ["불꽃", "firePctDmg"],
    ["용암", "firePctDmg"],
    ["냉기", "coldPctDmg"],
    ["동결", "freezeChance"],
    ["냉각", "chillChance"],
    ["서리", "coldPctDmg"],
    ["얼음", "coldPctDmg"],
    ["혹한", "coldPctDmg"],
    ["번개", "lightPctDmg"],
    ["감전", "shockChance"],
    ["뇌전", "lightPctDmg"],
    ["폭풍", "lightPctDmg"],
    ["카오스", "chaosPctDmg"],
    ["중독", "poisonChance"],
    ["독무", "poisonChance"],
    ["출혈", "bleedChance"],
    ["지속 피해", "dotPctDmg"],
    ["공허", "chaosPctDmg"],
    ["최대 생명력", "flatHp"],
    ["생명력 흡수", "leech"],
    ["생명력", "pctHp"],
    ["재생", "regen"],
    ["회복", "regen"],
    ["흡혈", "leech"],
    ["방어도", "armor"],
    ["피해 감소", "dr"],
    ["막기", "blockChance"],
    ["완갑", "armor"],
    ["방패", "armor"],
    ["회피", "evasion"],
    ["비껴내기", "deflectChance"],
    ["저항", "resAll"],
    ["관통", "resPen"],
    ["물리", "physPctDmg"],
    ["주문", "spellPctDmg"],
    ["룬 레벨", "gemLevel"],
    ["경험치", "expGain"],
    ["피해", "pctDmg"],
    ["공격력", "flatDmg"],
    ["증폭", "pctDmg"]
  ].sort((a, b) => b[0].length - a[0].length));
  var BY_WORD = new Map(KEYWORDS);
  var STOP_WORDS = Object.freeze(["모서리"]);
  var isKeyword = (word) => BY_WORD.has(word);
  var escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var NUMBER = "[+\\-−×x]?\\d+(?:[.,]\\d+)*(?:%p|%|배|초|칸|중첩|회|x)?";
  var WORDS = [...KEYWORDS.map(([word]) => word), ...STOP_WORDS].sort((a, b) => b.length - a.length);
  var TOKEN = new RegExp(`(${WORDS.map(escapeRe).join("|")})|(${NUMBER})`, "g");
  var CLAUSE = /([·:;!?()[\]{}/|\n]|[.,](?!\d)|\s-\s)/;
  var NUMBER_TONE = "#f6e7c1";
  var VOID_TAGS = /* @__PURE__ */ new Set(["br", "img", "hr", "input", "wbr"]);
  var escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  var toneOf = (word) => getItemStatToneColor(BY_WORD.get(word));
  function clauseSegments(clause) {
    const tokens = [...clause.matchAll(TOKEN)], lead = tokens.find((match) => isKeyword(match[1]));
    const clauseTone = lead ? toneOf(lead[1]) : NUMBER_TONE, out = [];
    let at = 0;
    for (const match of tokens) {
      if (match.index > at) out.push({ text: clause.slice(at, match.index), color: null });
      out.push({ text: match[0], color: match[1] ? isKeyword(match[1]) ? toneOf(match[1]) : null : clauseTone, number: !match[1] });
      at = match.index + match[0].length;
    }
    if (at < clause.length) out.push({ text: clause.slice(at), color: null });
    return out;
  }
  function segments(text) {
    return String(text == null ? "" : text).split(CLAUSE).flatMap((part) => CLAUSE.test(part) && part.length <= 3 ? [{ text: part, color: null }] : clauseSegments(part));
  }
  var spanOf = (segment) => segment.color ? `<span class="stat-tone${segment.number ? " is-number" : ""}" style="color:${segment.color}">${escape(segment.text)}</span>` : escape(segment.text);
  function html(text) {
    return segments(text).map(spanOf).join("");
  }
  var OWN_COLOUR_CLASS = /\bclass="[^"]*(?:\bstat-tone\b|\btooltip-title\b|[\w-]*(?:tag|chip|badge|tone)[\w-]*)/i;
  function tagStep(stack, tag) {
    const close = /^<\/(\w+)/.exec(tag), open = /^<(\w+)/.exec(tag);
    if (close) {
      const at = stack.map((row) => row.name).lastIndexOf(close[1].toLowerCase());
      if (at >= 0) stack.length = at;
    } else if (open && !VOID_TAGS.has(open[1].toLowerCase()) && !tag.endsWith("/>")) {
      stack.push({ name: open[1].toLowerCase(), coloured: /\bstyle="[^"]*\bcolor\s*:/i.test(tag) || OWN_COLOUR_CLASS.test(tag) });
    }
    return stack.some((row) => row.coloured);
  }
  function markup(source) {
    const stack = [];
    let coloured = false;
    return String(source == null ? "" : source).split(/(<(?:[^>"']|"[^"]*"|'[^']*')*>)/).map((part) => {
      if (part.startsWith("<")) {
        coloured = tagStep(stack, part);
        return part;
      }
      if (coloured || !part) return part;
      return part.split(/(&[#a-z0-9]+;)/i).map((piece) => piece.startsWith("&") ? piece : html(piece)).join("");
    }).join("");
  }
  function lineColor(text, fallback = null) {
    const lead = [...String(text == null ? "" : text).matchAll(TOKEN)].find((match) => isKeyword(match[1]));
    return lead ? toneOf(lead[1]) : fallback;
  }
  function statLine(stat, text) {
    return `<span class="stat-tone" style="color:${getItemStatToneColor(stat)}">${escape(text)}</span>`;
  }
  var statToneText = Object.freeze({ html, markup, segments, lineColor, statLine });

  // modules/stat-tone-text-ui-classic.mjs
  safeExposeGlobals({ statToneText, getItemStatToneColor });
})();
