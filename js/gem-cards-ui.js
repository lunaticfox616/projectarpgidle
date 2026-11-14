// GENERATED from modules/gem-cards-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/data/gem-presentation.mjs
  var GEM_TYPE_LABELS = Object.freeze([["summon_buff", "사역"], ["summon_guard", "수호 소환"], ["summon_attack", "소환"], ["mobility", "이동"], ["spell", "주문"], ["projectile", "투사체"], ["slam", "강타"]]);
  var PIXEL_ICONS = Object.freeze({
    sword: [".........##", "........#o#", ".......#o#.", "......#o#..", ".#...#o#...", "..#.#o#....", "...#o#.....", "..#.##.....", ".#...#.....", "#..........", "..........."],
    speed: ["...........", "##...##....", ".##...##...", "..##...##..", "...##...##.", "....##...##", "...##...##.", "..##...##..", ".##...##...", "##...##....", "..........."],
    eye: ["...........", "...#####...", "..#ooooo#..", ".#oo###oo#.", "#oo#ooo#oo#", "#oo#o#o#oo#", "#oo#ooo#oo#", ".#oo###oo#.", "..#ooooo#..", "...#####...", "..........."],
    star: [".....#.....", ".....#.....", "....#o#....", "....#o#....", ".###ooo###.", "##ooooooo##", ".###ooo###.", "....#o#....", "....#o#....", ".....#.....", ".....#....."],
    drop: [".....#.....", "....#o#....", "....#o#....", "...#ooo#...", "...#ooo#...", "..#ooooo#..", ".#o#ooooo#.", ".#o#ooooo#.", ".#oo#oooo#.", "..#ooooo#..", "...#####..."],
    fork: ["#....#....#", "#....#....#", ".#...#...#.", "..#..#..#..", "...#.#.#...", "....###....", ".....#.....", ".....#.....", ".....#.....", "....###....", "....###...."],
    split: ["##...#...##", "#.#.###.#.#", "...#.#.#...", "....###....", ".....#.....", ".....#.....", ".....#.....", ".....#.....", "....###....", "....#o#....", "....###...."],
    // 자물쇠(2026-10-23, 그루터기 함 잠금 js/stump-box-ui.js)
    lock: ["...........", "...#####...", "..##...##..", "..#.....#..", "..#.....#..", ".#########.", ".####o####.", ".####o####.", ".#########.", ".#########.", "..........."],
    // 열린 자물쇠(2026-11-09, 봉인한 룬의 해제 단추 js/skills-ui.js): 고리가 들려 왼쪽 다리가 빠진 자물쇠
    unlock: ["....#####..", "...##...##.", "...#.....#.", ".........#.", ".........#.", ".#########.", ".####o####.", ".####o####.", ".#########.", ".#########.", "..........."],
    reticle: ["...#####...", "..#.....#..", ".#...#...#.", "#....#....#", "#...ooo...#", "#.###o###.#", "#...ooo...#", "#....#....#", ".#...#...#.", "..#.....#..", "...#####..."],
    boomerang: ["...######..", "..#oooooo#.", ".#o######..", ".#o#.......", ".#o#....#..", ".#o#....##.", ".#o#######.", ".#oooooo##.", "..#######..", "........#..", "..........."],
    pierce: [".....#.....", "....###....", "...##o##...", ".....#.....", ".###.#.###.", ".#oo.#.oo#.", ".#oo.#.oo#.", ".#oo.#.oo#.", "..#o.#.o#..", "...#.#.#...", "....###...."],
    flame: [".....#.....", "....#o#....", "..#.#o#.#..", ".#o##o##o#.", ".#oo#o#oo#.", ".#ooooooo#.", "#oo#ooo#oo#", "#o#.#o#.#o#", "#oo#ooo#oo#", ".#ooooooo#.", "..#######.."],
    up: [".....#.....", "....#o#....", "...#ooo#...", "..#ooooo#..", ".####o####.", "....#o#....", "....#o#....", "....#o#....", "....#o#....", "....###....", "..........."],
    heart: ["...........", ".###...###.", "#ooo#.#ooo#", "#ooooooooo#", "#ooooooooo#", ".#ooooooo#.", "..#ooooo#..", "...#ooo#...", "....#o#....", ".....#.....", "..........."],
    shield: [".#########.", "#ooooooooo#", "#ooo###ooo#", "#ooo#o#ooo#", "#ooo#o#ooo#", ".#oo#o#oo#.", ".#ooo#ooo#.", "..#ooooo#..", "...#ooo#...", "....#o#....", ".....#....."],
    boot: ["...####....", "...#oo#....", "...#oo#....", "...#oo#....", "...#oo#....", "...#oo#....", "...#oo####.", "..#ooooooo#", ".#oooooooo#", ".##########", "..........."],
    // 낚시 창의 물고기(js/fishing-ui.js, 희귀도 색으로 칠한다).
    fish: ["...........", "...........", "...####...#", ".##oooo#.##", "#o#ooooo#o#", "#oooooooo##", "#ooooooo#o#", ".##oooo#.##", "...####...#", "...........", "..........."],
    // 그림이 없는 재화(심해 잠수 강화 비용, js/ocean-dive-ui.js): 창공의 정수 구름, 심해의 파편 수정, 암초 조각 산호, 군주의 핵 보석.
    cloud: ["...........", "...........", "....###....", "...#ooo#...", ".###ooo##..", "#ooo#oooo#.", "#oooooooo##", "#ooooooooo#", ".#########.", "...........", "..........."],
    shard: [".....#.....", "....#o#....", "...#oo##...", "...#oo#o#..", "..#ooo#oo#.", "..#ooo#oo#.", "..#ooo#oo#.", "...#oo#o#..", "...#oo##...", "....#o#....", ".....#....."],
    coral: [".#......#..", "#o#..#.#o#.", "#o#.#o##o#.", ".#o##o#o#..", "..#oo#o#.#.", "...#ooo##o#", "....#oo#o#.", "....#ooo#..", "...#ooo#...", "..#ooooo#..", ".#########."],
    gem: ["...........", "..#######..", ".#o#ooo#o#.", "#oo#ooo#oo#", "###########", ".#ooo#ooo#.", "..#oo#oo#..", "...#o#o#...", "....#o#....", ".....#.....", "..........."],
    // 기억의 잎(js/memory-leaves-ui.js 도감 카드, js/battle-ground-loot-ui.js 바닥 더미): 잎맥이 있는 비스듬한 잎.
    leaf: [".......###.", ".....##ooo#", "....#oooo#.", "...#ooo#o#.", "..#oo#oo#..", ".#oo#ooo#..", ".#o#ooo#...", "..#oo##....", ".#.##......", "#..........", "..........."],
    // 보조스킬룬 문양(js/support-gem-sigil-ui.js, 2026-10-11): 효과 종류마다 하나씩, 색은 계열(물리, 원소, 속도, 치명 …)을 따른다.
    arrow: ["......#####", ".......#oo#", "......#o#o#", ".....#o#.##", "....#o#...#", "...#o#.....", "#.#o#......", "##o#.......", "###........", "####.......", "..........."],
    burst: [".....#.....", ".#...#...#.", "..#..#..#..", "...#.o.#...", "....ooo....", "###ooooo###", "....ooo....", "...#.o.#...", "..#..#..#..", ".#...#...#.", ".....#....."],
    hammer: ["..#######..", ".#ooooooo#.", ".#ooooooo#.", ".#ooooooo#.", "..###o###..", "....#o#....", "....#o#....", "....#o#....", "....#o#....", "....#o#....", "....###...."],
    prism: ["....###....", "...#ooo#...", "...#ooo#...", "....###....", "...........", ".###...###.", "#ooo#.#ooo#", "#ooo#.#ooo#", ".###...###.", "...........", "..........."],
    hourglass: [".#########.", "..#ooooo#..", "..#ooooo#..", "...#ooo#...", "....#o#....", ".....#.....", "....#.#....", "...#.o.#...", "..#.ooo.#..", "..#ooooo#..", ".#########."],
    twin: ["....##...##", "...#o#..#o#", "..#o#..#o#.", ".#o#..#o#..", "#o#..#o#...", "##..#o#....", "...#o#.....", "..#o#......", ".#o#.......", "#o#........", "##........."],
    down: ["....###....", "....#o#....", "....#o#....", "....#o#....", ".####o####.", "..#ooooo#..", "...#ooo#...", "....#o#....", ".....#.....", "...........", ".#########."],
    bolt: ["......###..", ".....#o#...", "....#o#....", "...#o#.....", "..#oo####..", "...###oo#..", ".....#o#...", "....#o#....", "...#o#.....", "..#o#......", "..##......."],
    rift: [".....#.....", "....#o#....", "...#o.o#...", "..#o.#.o#..", ".#o.#o#.o#.", "#o.#ooo#.o#", ".#o.#o#.o#.", "..#o.#.o#..", "...#o.o#...", "....#o#....", ".....#....."],
    wave: ["#...#...#..", ".#...#...#.", "..#...#...#", "..#...#...#", "..#...#...#", "..#...#...#", "..#...#...#", ".#...#...#.", "#...#...#..", "...........", "..........."],
    orb: ["...#####...", "..#ooooo#..", ".#o#ooooo#.", "#o#ooooooo#", "#o#ooooooo#", "#ooooooooo#", "#ooooooooo#", "#ooooooooo#", ".#ooooooo#.", "..#ooooo#..", "...#####..."],
    bomb: [".......#.#.", "......#.#..", ".....#.....", "...#####...", "..#ooooo#..", ".#o#ooooo#.", ".#o#ooooo#.", ".#ooooooo#.", ".#ooooooo#.", "..#ooooo#..", "...#####..."],
    flask: ["...#####...", "....#o#....", "....#o#....", "....#o#....", "...#ooo#...", "..#ooooo#..", ".#ooooooo#.", ".#o#ooooo#.", ".#o#ooooo#.", "..#ooooo#..", "...#####..."],
    skull: ["..#######..", ".#ooooooo#.", "#ooooooooo#", "#o##ooo##o#", "#o##ooo##o#", "#ooooooooo#", ".#ooo#ooo#.", "..#ooooo#..", "..#o#o#o#..", "..#######..", "..........."],
    crack: [".####.####.", "#ooo#.#ooo#", "#oo#...#oo#", "#ooo#.#ooo#", "#oo#...#oo#", ".#oo#.#oo#.", ".#o#...#o#.", "..#o#.#o#..", "...##.##...", "....#.#....", "..........."]
  });
  var SKY_ENHANCEMENT_ICON_BY_STAT = Object.freeze({
    pctDmg: "sword",
    flatSkillDmgPct: "sword",
    hybrid: "sword",
    awakenedDamageMul: "sword",
    aspd: "speed",
    ds: "speed",
    awakenedAspdMul: "speed",
    crit: "eye",
    awakenedNoCritDouble: "eye",
    critDmg: "star",
    awakenedSpellFlatMul: "star",
    leech: "drop",
    leechRegenHybrid: "drop",
    targets: "fork",
    dotMulti: "flame",
    dotMultiplier: "flame",
    physIgnore: "pierce",
    resPen: "pierce",
    awakenedGemLevel: "up"
  });
  var SKY_PROJECTILE_ICONS = Object.freeze({ split: "split", focus: "reticle", return: "boomerang" });

  // modules/domain/gem-loadout-state.mjs
  function isSummonAttackSkillGem(runtime, name) {
    let gemDef = runtime.deps.SKILL_DB[name] || {};
    return !!(gemDef && Array.isArray(gemDef.tags) && gemDef.tags.includes("summon"));
  }
  function normalizeEquippedSummonAttackSkills(runtime) {
    runtime.deps.game.equippedSummonSkills = Array.isArray(runtime.deps.game.equippedSummonSkills) ? runtime.deps.game.equippedSummonSkills : [];
    runtime.deps.game.summonSkillCounts = runtime.deps.game.summonSkillCounts && typeof runtime.deps.game.summonSkillCounts === "object" ? runtime.deps.game.summonSkillCounts : {};
    let owned = Array.isArray(runtime.deps.game.skills) ? runtime.deps.game.skills : [];
    runtime.deps.game.equippedSummonSkills = Array.from(new Set(runtime.deps.game.equippedSummonSkills.filter((gemName) => isSummonAttackSkillGem(runtime, gemName) && owned.includes(gemName))));
    let blessing = runtime.deps.game.equippedSummonSkills.find((gemName) => runtime.deps.SKILL_DB[gemName].aura);
    runtime.deps.game.equippedSummonSkills = runtime.deps.game.equippedSummonSkills.filter((gemName) => !runtime.deps.SKILL_DB[gemName].aura || gemName === blessing);
    Object.keys(runtime.deps.game.summonSkillCounts).forEach((gemName) => {
      if (!runtime.deps.game.equippedSummonSkills.includes(gemName)) delete runtime.deps.game.summonSkillCounts[gemName];
    });
    runtime.deps.game.equippedSummonSkills.forEach((gemName) => {
      let count = Math.max(1, Math.floor(Number(runtime.deps.game.summonSkillCounts[gemName]) || 1));
      runtime.deps.game.summonSkillCounts[gemName] = runtime.deps.SKILL_DB[gemName].tags.includes("summon_attack") ? count : 1;
    });
    return runtime.deps.game.equippedSummonSkills;
  }
  function getSummonSkillCount(runtime, name) {
    normalizeEquippedSummonAttackSkills(runtime);
    return Math.max(0, Math.floor(Number((runtime.deps.game.summonSkillCounts || {})[name]) || 0));
  }
  function getEquippedSummonAttackCount(runtime) {
    return normalizeEquippedSummonAttackSkills(runtime).reduce((sum, name) => sum + getSummonSkillCount(runtime, name), 0);
  }
  function getEquippedSummonCount(runtime) {
    return getEquippedSummonAttackCount(runtime);
  }
  function getSummonEquipCapFromStats(runtime, stats) {
    let maximum = typeof runtime.deps.getSummonCapMaximum === "function" ? (0, runtime.deps.getSummonCapMaximum)() : typeof runtime.deps.hasKeystone === "function" && (0, runtime.deps.hasKeystone)("sb9") ? 12 : 8;
    return Math.max(1, Math.min(maximum, Math.floor(stats && stats.summonCap || 1)));
  }
  function getOtherWornBlessing(runtime, name) {
    if (!runtime.deps.SKILL_DB[name].aura) return null;
    return runtime.deps.game.equippedSummonSkills.find((gemName) => gemName !== name && runtime.deps.SKILL_DB[gemName]?.aura) || null;
  }
  function getSupportTierResonanceCost(runtime, name) {
    return (0, runtime.deps.getSupportResonanceCostAtTier)(name, getSupportActiveTier(runtime, name));
  }
  function getSupportActiveTier(runtime, name) {
    let rec = (0, runtime.deps.normalizeGemRecord)((runtime.deps.game.supportGemData || {})[name] || { level: 1, exp: 0 });
    let cap = typeof runtime.deps.getSupportTierCap === "function" ? (0, runtime.deps.getSupportTierCap)(name) : 3;
    let unlocked = Math.max(1, Math.min(cap, Math.floor(rec.unlockedTier || 1)));
    let active = Math.max(1, Math.min(unlocked, Math.floor(rec.activeTier || 1)));
    rec.unlockedTier = unlocked;
    rec.activeTier = active;
    runtime.deps.game.supportGemData = runtime.deps.game.supportGemData || {};
    runtime.deps.game.supportGemData[name] = rec;
    return active;
  }
  function prepareSupportTierChange(runtime, name, tier) {
    let rec = (0, runtime.deps.normalizeGemRecord)((runtime.deps.game.supportGemData || {})[name] || { level: 1, exp: 0 });
    let cap = typeof runtime.deps.getSupportTierCap === "function" ? (0, runtime.deps.getSupportTierCap)(name) : 3;
    rec.unlockedTier = Math.max(1, Math.min(cap, Math.floor(rec.unlockedTier || 1)));
    let nextTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(tier || 1)));
    let prevTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(rec.activeTier || 1)));
    let equipped = (runtime.deps.game.equippedSupports || []).includes(name);
    return { rec, nextTier, prevTier, equipped };
  }

  // modules/ui/gem-loadout-actions.mjs
  function changeSkill(runtime, name, slotKind) {
    const { deps } = runtime;
    if (!runtime.active || !deps.assertBuildEditable()) return;
    if (deps.mobilitySkill.isMobilityGem(name) && deps.game.mobilitySkill === name) return wearMobilityGem(runtime, "");
    if (typeof deps.canUseSkillWithCurrentEquipment === "function" && !deps.canUseSkillWithCurrentEquipment(name)) {
      return deps.addLog(deps._t("[{name}]{particle} 지금 쓸 수 없습니다: {why}.", { name: deps._t(name), particle: deps.pickParticle(name, "은", "는"), why: deps.getSkillRuneWeaponNote(name) }), "attack-monster");
    }
    if (isSummonAttackSkillGem(runtime, name)) return toggleSummonAttackGem(runtime, name);
    if (deps.mobilitySkill.isMobilityGem(name)) return wearMobilityRune(runtime, name, slotKind);
    selectAttackRune(runtime, name);
  }
  function selectAttackRune(runtime, name) {
    const { deps } = runtime;
    deps.playUiFeedbackSound("gemSocket");
    deps.game.activeSkill = name;
    if (deps.SKILL_DB[name]?.isGem) deps.game.gemEnhanceTargetSkill = name;
    deps.updateStaticUI();
  }
  function takeOffWornBlessing(runtime, replaced, name) {
    if (!replaced) return;
    runtime.deps.game.equippedSummonSkills = runtime.deps.game.equippedSummonSkills.filter((gemName) => gemName !== replaced);
    delete runtime.deps.game.summonSkillCounts[replaced];
    (0, runtime.deps.addLog)((0, runtime.deps._t)("가호는 하나만 걸립니다. [{replaced}] 대신 [{name}]{particle} 끼웠습니다.", { replaced: (0, runtime.deps._t)(replaced), name: (0, runtime.deps._t)(name), particle: (0, runtime.deps.pickParticle)(name, "을", "를") }), "season-up");
  }
  function changeSummonSkillCount(runtime, name, delta) {
    if (!(0, runtime.deps.assertBuildEditable)()) return;
    if (!isSummonAttackSkillGem(runtime, name) || !Array.isArray(runtime.deps.game.skills) || !runtime.deps.game.skills.includes(name)) return;
    normalizeEquippedSummonAttackSkills(runtime);
    runtime.deps.game.summonLoadoutInitialized = true;
    let current = getSummonSkillCount(runtime, name);
    if (delta > 0) return addSummonSkill(runtime, name, current);
    if (current <= 1) {
      runtime.deps.game.equippedSummonSkills = runtime.deps.game.equippedSummonSkills.filter((gemName) => gemName !== name);
      delete runtime.deps.game.summonSkillCounts[name];
    } else {
      runtime.deps.game.summonSkillCounts[name] = current - 1;
    }
    if (runtime.deps.game.activeSkill === name) runtime.deps.game.activeSkill = "기본 공격";
    (0, runtime.deps.updateStaticUI)();
  }
  function toggleSummonAttackGem(runtime, name) {
    normalizeEquippedSummonAttackSkills(runtime);
    if (!runtime.deps.game.equippedSummonSkills.includes(name)) return changeSummonSkillCount(runtime, name, 1);
    runtime.deps.game.summonLoadoutInitialized = true;
    runtime.deps.game.equippedSummonSkills = runtime.deps.game.equippedSummonSkills.filter((gemName) => gemName !== name);
    delete runtime.deps.game.summonSkillCounts[name];
    if (runtime.deps.game.activeSkill === name) runtime.deps.game.activeSkill = "기본 공격";
    (0, runtime.deps.updateStaticUI)();
  }
  function wearMobilityGem(runtime, name) {
    if (name && name !== runtime.deps.game.mobilitySkill) (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    runtime.deps.game.mobilitySkill = name;
    runtime.deps.mobilitySkill.reset();
    if (name) runtime.deps.game.gemEnhanceTargetSkill = name;
    (0, runtime.deps.updateStaticUI)();
  }
  function wearMobilityRune(runtime, name, slotKind) {
    const boots = (0, runtime.deps.isMobilityRuneAttackWorn)(runtime.deps.game);
    if (boots && name === runtime.deps.game.activeSkill && slotKind !== "mobility") return (0, runtime.deps.updateStaticUI)();
    const toAttack = boots && slotKind !== "mobility" && (slotKind === "active" || !runtime.deps.mobilitySkill.isMobilityGem(runtime.deps.game.activeSkill));
    if (!toAttack) {
      if (name === runtime.deps.game.activeSkill) runtime.deps.game.activeSkill = "기본 공격";
      return wearMobilityGem(runtime, name);
    }
    runtime.deps.game.activeSkill = name;
    runtime.deps.game.gemEnhanceTargetSkill = name;
    (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    (0, runtime.deps.updateStaticUI)();
  }
  function openEquippedGemManagement(runtime, name) {
    if (!runtime.deps.game.gemEnhanceUnlocked) return (0, runtime.deps.addLog)((0, runtime.deps._t)("룬 강화는 군주의 핵 또는 창공의 정수를 획득하면 개방됩니다."), "attack-monster");
    let equipped = typeof runtime.deps.getEquippedEnhanceableGemNames === "function" ? (0, runtime.deps.getEquippedEnhanceableGemNames)() : [];
    if (!equipped.includes(name)) return (0, runtime.deps.addLog)((0, runtime.deps._t)("장착 중인 공격 룬만 강화할 수 있습니다."), "attack-monster");
    runtime.deps.game.gemEnhanceTargetSkill = name;
    runtime.deps.game.gemEngraveSelectedSlot = 0;
    (0, runtime.deps.switchSkillSubtab)("skill-tab-enhance");
    (0, runtime.deps.updateStaticUI)();
  }
  function getEffectiveResonanceCap(runtime, statsOverride) {
    return runtime.deps.gemDropRewards.resonanceCap(runtime.deps.game, statsOverride || (0, runtime.deps.getUiPlayerStats)(null));
  }
  function setSupportActiveTier(runtime, name, tier) {
    if (!(0, runtime.deps.assertBuildEditable)()) return;
    if (!runtime.deps.SUPPORT_GEM_DB[name]) return;
    const { rec, nextTier, prevTier, equipped } = prepareSupportTierChange(runtime, name, tier);
    if (equipped && nextTier !== prevTier) {
      let used = (runtime.deps.game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(runtime, n), 0);
      rec.activeTier = nextTier;
      runtime.deps.game.supportGemData[name] = rec;
      let nextUsed = (runtime.deps.game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(runtime, n), 0);
      const stats = (0, runtime.deps.getUiPlayerStats)();
      let resonancePower = getEffectiveResonanceCap(runtime, stats);
      if (runtime.deps.gemDropRewards.exceedsResonanceBudget(stats, nextUsed, resonancePower)) {
        rec.activeTier = prevTier;
        runtime.deps.game.supportGemData[name] = rec;
        let need = Math.max(0, nextUsed - used);
        let remain = Math.max(0, resonancePower - used);
        return (0, runtime.deps.addLog)((0, runtime.deps._t)("공명력 부족 ({remain}/{need})", { remain, need }), "attack-monster", { toast: true });
      }
    } else {
      rec.activeTier = nextTier;
      runtime.deps.game.supportGemData[name] = rec;
    }
    (0, runtime.deps.normalizeSupportLoadout)(false);
    (0, runtime.deps.updateStaticUI)();
  }
  function toggleSupport(runtime, name) {
    if (!(0, runtime.deps.assertBuildEditable)()) return;
    if (![runtime.deps.contentProgression.isUnlocked("support"), runtime.deps.game.supports.includes(name), runtime.deps.SUPPORT_GEM_DB[name]].every(Boolean)) return;
    (0, runtime.deps.normalizeSupportLoadout)(false);
    runtime.deps.game.equippedSupports = Array.isArray(runtime.deps.game.equippedSupports) ? runtime.deps.game.equippedSupports : [];
    let idx = runtime.deps.game.equippedSupports.indexOf(name);
    if (idx > -1) runtime.deps.game.equippedSupports.splice(idx, 1);
    else {
      let stats = (0, runtime.deps.getUiPlayerStats)();
      if (runtime.deps.game.equippedSupports.length >= stats.suppCap) {
        (0, runtime.deps.addLog)((0, runtime.deps._t)("보조스킬룬 장착 한도 부족 ({length}/{max}), 다른 보조스킬룬을 먼저 해제하세요.", { length: runtime.deps.game.equippedSupports.length, max: Math.max(0, Math.floor(stats.suppCap || 0)) }), "attack-monster", { toast: true });
        (0, runtime.deps.updateStaticUI)();
        return;
      }
      const conflict = runtime.deps.window.GameModules.skills.supports.conflictReason(name, runtime.deps.game);
      if (conflict) return (0, runtime.deps.addLog)(conflict, "attack-monster", { toast: true });
      let used = runtime.deps.game.equippedSupports.reduce((sum, n) => sum + getSupportTierResonanceCost(runtime, n), 0);
      let remain = Math.max(0, getEffectiveResonanceCap(runtime, stats) - used);
      let cost = getSupportTierResonanceCost(runtime, name);
      if (remain < cost && !runtime.deps.gemDropRewards.allowsResonanceOverflow(stats)) return (0, runtime.deps.addLog)((0, runtime.deps._t)("공명력 부족 ({remain}/{cost})", { remain, cost }), "attack-monster", { toast: true });
      runtime.deps.game.equippedSupports.push(name);
      (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    }
    (0, runtime.deps.updateStaticUI)();
  }
  function addSummonSkill(runtime, name, current) {
    let cap = getSummonEquipCapFromStats(runtime, (0, runtime.deps.getUiPlayerStats)(null));
    let replaced = getOtherWornBlessing(runtime, name);
    if (getEquippedSummonCount(runtime) - Number(!!replaced) >= cap) return (0, runtime.deps.addLog)((0, runtime.deps._t)("소환수 한도({cap})로 인해 [{name}]{particle} 추가 소환할 수 없습니다.", { cap, name: (0, runtime.deps._t)(name), particle: (0, runtime.deps.pickParticle)(name, "을", "를") }), "attack-monster");
    takeOffWornBlessing(runtime, replaced, name);
    if (!runtime.deps.game.equippedSummonSkills.includes(name)) runtime.deps.game.equippedSummonSkills.push(name);
    runtime.deps.game.summonSkillCounts[name] = Number(runtime.deps.SKILL_DB[name].tags.includes("summon_attack")) * current + 1;
    (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    if (runtime.deps.SKILL_DB[name] && runtime.deps.SKILL_DB[name].isGem) runtime.deps.game.gemEnhanceTargetSkill = name;
    if (runtime.deps.game.activeSkill === name) runtime.deps.game.activeSkill = "기본 공격";
    (0, runtime.deps.updateStaticUI)();
    return;
  }

  // modules/ui/gem-card-markup.mjs
  function getSkillGemArtPath2(runtime, name) {
    const paths = runtime.deps.SKILL_GEM_ART_PATHS;
    return paths && paths[name] ? paths[name] : "";
  }
  function toggleGemFoldMode(runtime, mode) {
    if (mode === "attack") {
      runtime.deps.game.gemFoldInactiveAttack = !runtime.deps.game.gemFoldInactiveAttack;
    } else if (mode === "support") {
      runtime.deps.game.gemFoldInactiveSupport = !runtime.deps.game.gemFoldInactiveSupport;
    }
    (0, runtime.deps.updateStaticUI)();
  }
  function getGemCardMeta(runtime, def) {
    let tags = Array.isArray(def && def.tags) ? def.tags : [];
    let element = gemElement(def, tags);
    let elementMap = {
      fire: { icon: "◆", label: (0, runtime.deps._t)("화염"), className: "fire" },
      cold: { icon: "✦", label: (0, runtime.deps._t)("냉기"), className: "cold" },
      light: { icon: "ϟ", label: (0, runtime.deps._t)("번개"), className: "lightning" },
      lightning: { icon: "ϟ", label: (0, runtime.deps._t)("번개"), className: "lightning" },
      chaos: { icon: "◈", label: (0, runtime.deps._t)("카오스"), className: "chaos" },
      phys: { icon: "◇", label: (0, runtime.deps._t)("물리"), className: "physical" },
      physical: { icon: "◇", label: (0, runtime.deps._t)("물리"), className: "physical" }
    };
    let typeLabel = GEM_TYPE_LABELS.find(([tag]) => tags.includes(tag))?.[1] || "공격";
    let presentation = elementMap[element] || elementMap.phys;
    return { typeLabel, icon: presentation.icon, elementLabel: def?.elementLabel || presentation.label, className: presentation.className };
  }
  function gemElement(def, tags) {
    return String(def && def.ele || (tags.includes("fire") ? "fire" : tags.includes("cold") ? "cold" : tags.includes("lightning") ? "light" : tags.includes("chaos") ? "chaos" : "phys"));
  }
  function getRuneForgeAttrs(runtime, name, options) {
    const level = options?.plain ? 0 : Math.floor(Number(runtime.deps.game.gemData?.[name]?.enhanceLevel) || 0);
    return level > 0 ? ` data-forge-plus="+${level}" data-forge-tier="${runtime.deps.gemCoreForge.tierOf(level)}"` : "";
  }
  function renderSkillGemArt(runtime, name, className, options) {
    const forgeAttrs = getRuneForgeAttrs(runtime, name, options);
    const summonArt = runtime.deps.supportGemSigil.summonHtml(name, className);
    if (summonArt) return summonArt.replace("<span ", `<span${forgeAttrs} `);
    let def = runtime.deps.SKILL_DB[name] || {};
    let meta = getGemCardMeta(runtime, def);
    let artPath = (0, runtime.deps.getSkillGemArtPath)(name);
    let opts = options || {};
    let loading = opts.eager ? "eager" : "lazy";
    let fallbackHidden = artPath ? " hidden" : "";
    let image = artPath ? `<img src="${(0, runtime.deps.escapeHTML)(artPath)}" alt="" loading="${loading}" decoding="async" onerror="this.hidden=true; this.nextElementSibling.hidden=false">` : "";
    return `<span${forgeAttrs} class="${className || "gem-art"}" aria-label="${(0, runtime.deps._t)("{name} 룬 이미지", { name: (0, runtime.deps.escapeHTML)(name) })}">${image}<span class="gem-art-fallback" aria-hidden="true"${fallbackHidden}>${meta.icon}</span></span>`;
  }
  function renderGemTagChips(runtime, def, maxTags) {
    let rawTags = Array.isArray(def && def.tags) ? def.tags : [];
    let tagKey = (tag) => runtime.deps.SKILL_TAG_LABELS[tag] ? tag : Object.keys(runtime.deps.SKILL_TAG_LABELS).find((key) => runtime.deps.SKILL_TAG_LABELS[key] === tag) || tag;
    let getTone = (rawTag) => {
      let tag = tagKey(rawTag);
      if (["fire", "cold", "light", "lightning", "chaos", "phys", "physical"].includes(tag)) return tag === "light" ? "lightning" : tag === "phys" ? "physical" : tag;
      if (["summon_attack", "minion", "summon"].includes(tag)) return "summon";
      if (["spell", "projectile", "melee", "slam", "chain", "pierce", "dot", "aoe", "utility", "curse", "warcry", "guard"].includes(tag)) return tag;
      return "neutral";
    };
    return rawTags.slice(0, maxTags || 4).map((tag) => {
      let label = typeof runtime.deps.translateSkillTag === "function" ? (0, runtime.deps.translateSkillTag)(tag) : tag;
      return `<span class="gem-tag gem-tag--${getTone(tag)}">${(0, runtime.deps.escapeHTML)(label)}</span>`;
    }).join("");
  }
  function getGemTileSummary(runtime, name, def) {
    let meta = getGemCardMeta(runtime, def);
    if ((def.tags || []).includes("summon")) return `${meta.elementLabel} ${meta.typeLabel}`;
    let profile = (0, runtime.deps.getSkillGridProfile)(name, def);
    return (0, runtime.deps._t)("{value}, {max}칸", { value: (0, runtime.deps._t)((0, runtime.deps.getSkillGridProfileKindLabel)(profile.band ? "band" : profile.kind)), max: Math.max(1, profile.range || 1) });
  }
  function getGemTileHandlers(runtime, type, name) {
    let action = `gemSelectionUi.open(this,'${type}','${name}')`;
    return `role="button" tabindex="0" onclick="${action}" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${action};}" onpointerenter="showGemCardHint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()"`;
  }
  function renderGemTileLevel(runtime, gemInfo) {
    return `<span class="gem-tile-level ${gemInfo.totalLevel > gemInfo.baseLevel ? "effective" : ""}">Lv.${(0, runtime.deps.formatValue)("", gemInfo.totalLevel)}</span>`;
  }
  function renderGemTileCopies(runtime, name) {
    const spares = runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name);
    return spares ? `<span class="gem-tile-copies">×${spares + 1}</span>` : "";
  }
  function renderAttackGemCard(runtime, name, highlightedName, stats) {
    let def = runtime.deps.SKILL_DB[name] || {};
    let gemInfo = (0, runtime.deps.getUiGemPresentation)(name, false, stats);
    let meta = getGemCardMeta(runtime, def);
    let { summonEquipped, active, equipmentReady, state } = attackGemCardState(runtime, name, def);
    let classes = ["skill-gem", "gem-library-card", "gem-tile", `element-${meta.className}`, active ? "active" : "", equipmentReady ? "" : "equipment-blocked"].filter(Boolean).join(" ");
    let worn = active ? `<span class="gem-tile-worn">${summonEquipped ? (0, runtime.deps._t)("소환 ×{name}", { name: getSummonSkillCount(runtime, name) }) : (0, runtime.deps._t)("장착")}</span>` : "";
    return `<article class="${classes}" data-attack-rune="${(0, runtime.deps.escapeHTML)(name)}" ${getGemTileHandlers(runtime, "active", name)} aria-label="${(0, runtime.deps.escapeHTML)(name)} Lv.${(0, runtime.deps.formatValue)("", gemInfo.totalLevel)}${active ? (0, runtime.deps._t)(", 장착 중") : ""}${equipmentReady ? "" : ", " + (0, runtime.deps.escapeHTML)((0, runtime.deps.getSkillRuneWeaponNote)(name))}">
        ${renderGemTileLevel(runtime, gemInfo)}${worn}${renderGemTileCopies(runtime, name)}${renderSkillGemArt(runtime, name, "gem-card-sigil gem-card-art gem-tile-art")}
        <strong class="gem-tile-name">${highlightedName}</strong><small class="gem-usage-state">${(0, runtime.deps.escapeHTML)(state)}</small>
    </article>`;
  }
  function attackGemCardState(runtime, name, def) {
    let summonEquipped = (def.tags || []).includes("summon") && (runtime.deps.game.equippedSummonSkills || []).includes(name);
    let active = summonEquipped || [runtime.deps.game.activeSkill, runtime.deps.game.mobilitySkill].includes(name);
    let equipmentReady = typeof runtime.deps.canUseSkillWithCurrentEquipment !== "function" || (0, runtime.deps.canUseSkillWithCurrentEquipment)(name);
    let state = equipmentReady ? getGemTileSummary(runtime, name, def) : (0, runtime.deps.getSkillRuneWeaponNote)(name);
    return { summonEquipped, active, equipmentReady, state };
  }
  function getSupportEquipFailure(runtime, name, stats) {
    if ((runtime.deps.game.equippedSupports || []).includes(name)) return "";
    let equippedSupports = runtime.deps.game.equippedSupports || [];
    let supportCap = Math.max(0, Math.floor(stats && stats.suppCap || 0));
    if (equippedSupports.length >= supportCap) return "";
    const conflict = runtime.deps.window.GameModules.skills.supports.conflictReason(name, runtime.deps.game);
    if (conflict) return conflict;
    if (runtime.deps.gemDropRewards.allowsResonanceOverflow(stats)) return "";
    let used = equippedSupports.reduce((sum, supportName) => sum + getSupportTierResonanceCost(runtime, supportName), 0);
    let available = Math.max(0, getEffectiveResonanceCap(runtime, stats) - used);
    let cost = getSupportTierResonanceCost(runtime, name);
    return available < cost ? (0, runtime.deps._t)("공명력 {value} 모자람", { value: cost - available }) : "";
  }
  function renderSupportGemCard(runtime, name, highlightedName, stats) {
    let gemInfo = (0, runtime.deps.getUiGemPresentation)(name, true, stats);
    let active = (runtime.deps.game.equippedSupports || []).includes(name);
    let failure = getSupportEquipFailure(runtime, name, stats);
    let tier = getSupportActiveTier(runtime, name);
    let state = failure || runtime.deps.gemSelectionUi.application(name, stats);
    let classes = ["skill-gem", "support-gem", "gem-library-card", "gem-tile", `is-tone-${runtime.deps.supportGemSigil.tone(name)}`, active ? "active" : "", failure ? "equipment-blocked" : ""].filter(Boolean).join(" ");
    return `<article class="${classes}" ${getGemTileHandlers(runtime, "support", name)} aria-label="${(0, runtime.deps.escapeHTML)(name)}${active ? (0, runtime.deps._t)(", 장착 중") : failure ? `, ${(0, runtime.deps.escapeHTML)(failure)}` : ""}">
        ${renderGemTileLevel(runtime, gemInfo)}${active ? (0, runtime.deps._t)('<span class="gem-tile-worn">장착</span>') : ""}${runtime.deps.supportGemSigil.html(name, "gem-card-sigil gem-tile-art gem-tile-support-art", tier)}
        <strong class="gem-tile-name">${highlightedName}</strong>${runtime.deps.gemSelectionUi.indicators(name)}<small class="gem-usage-state">${(0, runtime.deps.escapeHTML)(state)}</small>
        <span class="support-library-effect">${(0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.effectText(name, tier, stats))}</span><small>${(0, runtime.deps._t)("공명 {name}, {value}", { name: getSupportTierResonanceCost(runtime, name), value: active ? (0, runtime.deps._t)("등급과 교체 보기") : (0, runtime.deps._t)("후보 상세 보기") })}</small>
    </article>`;
  }
  function showGemCardHint(runtime, event, type, name) {
    if (event.pointerType === "mouse") (0, runtime.deps.showGemTooltip)(event, type, name);
  }
  function getGemGrowthSummaryHtml(runtime, name, presentation) {
    if (!presentation || !presentation.skill) return "";
    const base = Number(presentation.baseLevel) || 1, material = Number(presentation.materialBonus) || 0;
    const total = Number(presentation.totalLevel || presentation.finalLevel) || 1;
    const parts = [["base", "기본", base], ["material", "재료/각성", material], ["source", "장비/패시브", Math.max(0, total - base - material)]];
    const bar = parts.map(([key, , value]) => `<i class="is-${key}" style="flex-grow:${value}"></i>`).join("");
    const legend = parts.map(([key, label, value]) => `<span class="is-${key}">${label} <b>${key === "base" ? "" : "+"}${(0, runtime.deps.formatValue)("", value)}</b></span>`).join("");
    return `<div class="gem-level"><div class="gem-level-final"><small>${(0, runtime.deps._t)("최종")}</small><b>Lv.${(0, runtime.deps.formatValue)("", total)}</b></div><div class="gem-level-bar" aria-hidden="true">${bar}</div><div class="gem-level-legend">${legend}</div></div>${getGemCombatChipsHtml(runtime, presentation.skill)}`;
  }
  function getGemCombatChipsHtml(runtime, skill) {
    const chips = [
      Number.isFinite(skill.dmg) ? ["피해 계수", skill.dmg.toFixed(2)] : null,
      Number.isFinite(skill.spd) ? ["속도", skill.spd.toFixed(2)] : null,
      Number.isFinite(skill.crit) ? ["치명타", `${skill.crit.toFixed(1)}%`] : null
    ].filter(Boolean);
    return chips.length ? `<div class="gem-level-stats">${chips.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join("")}</div>` : "";
  }
  function renderGemEnhanceTargetCard(runtime, name, selected, stats) {
    let def = runtime.deps.SKILL_DB[name] || {};
    let rec = (0, runtime.deps.normalizeGemRecord)((runtime.deps.game.gemData || {})[name]);
    let info = (0, runtime.deps.getUiGemPresentation)(name, false, stats);
    let meta = getGemCardMeta(runtime, def);
    let enhanceCount = (0, runtime.deps.getSkyEnhancementForSkill)(name).length;
    return `<button class="gem-target-card element-${meta.className} ${selected ? "selected" : ""}" onclick="selectGemEnhanceTargetSkill('${name}')">${renderSkillGemArt(runtime, name, "gem-target-icon")}<span><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</strong><small>Lv.${(0, runtime.deps.formatValue)("", info.totalLevel)}, 퀄리티 ${rec.quality || 0}%, 각인 ${enhanceCount}/${rec.skyEnhanceCap || 1}${runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) ? (0, runtime.deps._t)(", 여분 {spareCount}개", { spareCount: runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) }) : ""}</small></span>${selected ? (0, runtime.deps._t)("<b>선택</b>") : ""}</button>`;
  }
  function renderGemResourceStrip(runtime, activeGem, condensedPower) {
    let root = runtime.deps.document.getElementById("ui-gem-resource-strip");
    if (!root) return;
    root.innerHTML = `<div><span>${(0, runtime.deps._t)("군주의 핵")}</span><strong>${runtime.deps.game.currencies.bossCore || 0}</strong></div><div><span>${(0, runtime.deps._t)("창공의 정수")}</span><strong>${runtime.deps.game.currencies.skyEssence || 0}</strong></div><div><span>${(0, runtime.deps._t)("응축 창공")}</span><strong>${Math.floor(condensedPower || 0)}</strong></div><div><span>${(0, runtime.deps._t)("각성 잔향")}</span><strong>${runtime.deps.game.currencies.awakenedEcho || 0}</strong></div><div><span>${(0, runtime.deps._t)("고른 룬")}</span><strong>${!activeGem ? (0, runtime.deps._t)("없음") : activeGem.awakened ? (0, runtime.deps._t)("각성") : (0, runtime.deps._t)("각성 전")}</strong></div>`;
  }
  function bindGemEngraveSlotControls(runtime, root) {
    if (!runtime.active || !root || runtime.state.engraveRoot === root) return;
    if (runtime.state.engraveRoot) {
      releaseViewTarget(runtime, runtime.state.engraveRoot);
      delete runtime.state.engraveRoot.dataset.engraveSlotControlsBound;
    }
    runtime.state.engraveRoot = root;
    root.dataset.engraveSlotControlsBound = "true";
    listenView(runtime, root, "pointerdown", (event) => {
      let button = event.target && event.target.closest ? event.target.closest("button[data-slot-index]") : null;
      if (button && root.contains(button)) event.stopPropagation();
    });
    listenView(runtime, root, "click", (event) => {
      let button = event.target && event.target.closest ? event.target.closest("button[data-slot-index]") : null;
      if (!button || !root.contains(button) || button.disabled || button.dataset.slotState === "locked") return;
      event.stopPropagation();
      runtime.handlers.openGemEngraveSlotOverlay(button.dataset.slotIndex);
    });
  }

  // modules/ui/gem-engraving-markup.mjs
  function engravingOptionState({ current, usedElsewhere, compatible, locked }) {
    return current ? "현재 각인, 누르면 해제" : usedElsewhere ? "다른 슬롯에 적용 중" : !compatible ? "투사체 룬 전용" : locked ? "룬 각성 해금 필요" : "이 슬롯에 각인";
  }
  function engraveSlotGlyph(runtime, enhancement, unlocked, nextUnlock) {
    return enhancement ? renderSkyEnhancementIcon(runtime, enhancement) : unlocked ? "" : nextUnlock ? "+" : "×";
  }
  function renderGemEngraveSlots(runtime, activeSlots, engraveCap) {
    let root = runtime.deps.document.getElementById("ui-gem-engrave-slots");
    if (!root) return;
    bindGemEngraveSlotControls(runtime, root);
    let active = (0, runtime.deps.getGemEnhanceTargetSkill)();
    if (typeof runtime.deps.isEnhanceableAttackGem === "function" && !(0, runtime.deps.isEnhanceableAttackGem)(active)) {
      let emptySignature = `empty:${active || ""}`;
      if (root.dataset.renderSig !== emptySignature) {
        root.innerHTML = '<div class="gem-process-empty">장착 중인 공격 룬을 선택하면 중앙 각인 장치가 활성화됩니다.</div>';
        root.dataset.renderSig = emptySignature;
      }
      return;
    }
    let { normalizedCap, normalizedSlots, canAffordNextSlot } = engravingSlotsState(runtime, activeSlots, engraveCap);
    let renderSignature = JSON.stringify([active, normalizedCap, normalizedSlots, canAffordNextSlot]);
    if (root.dataset.renderSig === renderSignature) return;
    let slots = [];
    let spokes = [];
    for (let index = 0; index < 5; index++) {
      const rendered = engraveOrbitSlot(runtime, index, { normalizedSlots, normalizedCap, canAffordNextSlot });
      spokes.push(rendered.spoke);
      slots.push(rendered.slot);
    }
    root.innerHTML = `<div class="gem-orbit-stage"><div class="gem-orbit-rings" aria-hidden="true"></div>${spokes.join("")}<div class="gem-orbit-center element-${getGemCardMeta(runtime, runtime.deps.SKILL_DB[active] || {}).className}">${renderSkillGemArt(runtime, active, "gem-orbit-art", { eager: true })}<span>${(0, runtime.deps._t)("각인 대상")}</span><strong>${(0, runtime.deps.escapeHTML)(active)}</strong></div>${slots.join("")}</div><div class="gem-orbit-copy"><strong>${(0, runtime.deps._t)("중앙 룬과 연결된 슬롯을 선택하세요")}</strong><span class="gem-orbit-legend"><b class="is-empty"><i></i>${(0, runtime.deps._t)("빈 슬롯")}</b><b class="is-filled"><i></i>${(0, runtime.deps._t)("각인됨")}</b><b class="is-unlockable"><i>+</i>${(0, runtime.deps._t)("해금 가능")}</b></span></div>`;
    root.dataset.renderSig = renderSignature;
  }
  function renderSkyEnhancementIcon(runtime, enhancement) {
    let name = enhancement.projectilePatternMode ? SKY_PROJECTILE_ICONS[enhancement.projectilePatternMode] : SKY_ENHANCEMENT_ICON_BY_STAT[enhancement.stat];
    return renderPixelIcon(runtime, name, `sky-engrave-icon is-${getSkyEnhancementGroup(runtime, enhancement).className}`);
  }
  function renderPixelIcon(runtime, name, className) {
    let rects = [];
    (PIXEL_ICONS[name] || PIXEL_ICONS.star).forEach((row, y) => {
      for (let match of row.matchAll(/#+|o+/g)) rects.push(`<rect class="${match[0][0] === "#" ? "m" : "f"}" x="${match.index}" y="${y}" width="${match[0].length}" height="1"/>`);
    });
    return `<svg class="${className}" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
  }
  function getSkyEnhancementGroup(runtime, enhancement) {
    if (enhancement.projectilePatternMode) return { label: (0, runtime.deps._t)("탄도"), className: "crafted" };
    if (String(enhancement.id || "").startsWith("sky_awakened")) return { label: (0, runtime.deps._t)("각성"), className: "awakened" };
    if (String(enhancement.id || "").startsWith("sky_gemcraft")) return { label: (0, runtime.deps._t)("조율"), className: "crafted" };
    return { label: (0, runtime.deps._t)("기본"), className: "basic" };
  }
  function renderSkyEnhancementOption(runtime, enhancement, activeSlots, isGem) {
    let applied = activeSlots.includes(enhancement.id);
    let locked = !(0, runtime.deps.canUseSkyEnhancement)(enhancement.id);
    let removeCost = typeof runtime.deps.getSkyGemEnhancementRemoveCost === "function" ? (0, runtime.deps.getSkyGemEnhancementRemoveCost)() : 0;
    let group = getSkyEnhancementGroup(runtime, enhancement);
    let compatible = enhancementFitsTarget(runtime, enhancement);
    let actionLabel = applied ? (0, runtime.deps._t)("적용 중, 해제 창공 {removeCost}", { removeCost }) : !compatible ? "투사체 룬 전용" : locked ? "룬 각성 해금 필요" : "창공 1";
    return `<button class="gem-engrave-option group-${group.className} ${applied ? "applied" : ""}" onclick="toggleSkyGemEnhancement('${enhancement.id}')" ${!isGem || !compatible || locked && !applied ? "disabled" : ""}>${renderEngraveOptionFace(runtime, enhancement, group, actionLabel)}</button>`;
  }
  function renderEngraveOptionFace(runtime, enhancement, group, stateLabel) {
    return `<span class="gem-engrave-icon">${renderSkyEnhancementIcon(runtime, enhancement)}</span><span class="gem-engrave-copy"><span class="gem-engrave-top"><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(enhancement.name))}</strong><em>${(0, runtime.deps._t)(group.label)}</em></span><small>${runtime.deps.statToneText.html((0, runtime.deps._t)(enhancement.desc))}</small><b class="gem-engrave-state">${stateLabel}</b></span>`;
  }
  function renderGemEngraveOverlayOption(runtime, enhancement, slots, slotIndex) {
    let current = slots[slotIndex] === enhancement.id;
    let usedElsewhere = slots.some((id, index) => index !== slotIndex && id === enhancement.id);
    let locked = !(0, runtime.deps.canUseSkyEnhancement)(enhancement.id);
    let group = getSkyEnhancementGroup(runtime, enhancement);
    let compatible = enhancementFitsTarget(runtime, enhancement);
    let state = engravingOptionState({ current, usedElsewhere, compatible, locked });
    return `<button type="button" class="gem-engrave-option group-${group.className} ${current ? "applied" : ""}" data-engrave-id="${enhancement.id}" data-action="${current ? "remove" : "apply"}" ${usedElsewhere || !compatible || locked && !current ? "disabled" : ""}>${renderEngraveOptionFace(runtime, enhancement, group, state)}</button>`;
  }
  function enhancementFitsTarget(runtime, enhancement) {
    return typeof runtime.deps.isSkyEnhancementCompatibleWithSkill !== "function" || (0, runtime.deps.isSkyEnhancementCompatibleWithSkill)(enhancement.id, (0, runtime.deps.getGemEnhanceTargetSkill)());
  }
  function engravingSlotsState(runtime, activeSlots, engraveCap) {
    let normalizedCap = Math.max(1, Math.min(5, Math.floor(Number(engraveCap) || 1)));
    let sourceSlots = Array.isArray(activeSlots) ? activeSlots : [];
    let normalizedSlots = Array.from({ length: 5 }, (_, index) => sourceSlots[index] || null);
    let nextUnlockCost = normalizedCap < 5 ? normalizedCap + 1 : 0;
    let canAffordNextSlot = nextUnlockCost > 0 && (runtime.deps.game.currencies.skyEssence || 0) >= nextUnlockCost;
    return { normalizedCap, normalizedSlots, canAffordNextSlot };
  }
  function engraveOrbitSlot(runtime, index, { normalizedSlots, normalizedCap, canAffordNextSlot }) {
    let enhancement = normalizedSlots[index] ? runtime.deps.GEM_SKY_ENHANCEMENTS[normalizedSlots[index]] : null;
    let unlocked = index < normalizedCap;
    let nextUnlock = index === normalizedCap && normalizedCap < 5;
    let unlockReady = nextUnlock && canAffordNextSlot;
    let stateClass = enhancement ? "filled" : unlocked ? "open" : unlockReady ? "unlockable" : nextUnlock ? "unaffordable" : "locked";
    let title = engraveSlotTitle(runtime, index, { enhancement, unlocked, nextUnlock, unlockReady });
    let group = enhancement ? getSkyEnhancementGroup(runtime, enhancement) : null;
    let glyph = engraveSlotGlyph(runtime, enhancement, unlocked, nextUnlock);
    let orbitAngle = -90 + index * 72;
    let orbitRadius = 38.5;
    let orbitX = 50 + Math.cos(orbitAngle * Math.PI / 180) * orbitRadius;
    let orbitY = 50 + Math.sin(orbitAngle * Math.PI / 180) * orbitRadius;
    const label = engraveSlotLabel(runtime, { enhancement, nextUnlock, unlockReady });
    return { spoke: `<span class="gem-orbit-spoke" aria-hidden="true" style="--orbit-angle:${orbitAngle}deg"></span>`, slot: engraveSlotButton(runtime, index, { enhancement, unlocked, nextUnlock, unlockReady, stateClass, title, group, glyph, orbitX, orbitY, label }) };
  }
  function engraveSlotTitle(runtime, index, { enhancement, unlocked, nextUnlock, unlockReady }) {
    return enhancement ? (0, runtime.deps._t)("{value}번 슬롯, {name}, 눌러서 교체 또는 해제", { value: index + 1, name: enhancement.name }) : unlocked ? (0, runtime.deps._t)("{value}번 빈 각인 슬롯, 눌러서 각인 선택", { value: index + 1 }) : nextUnlock ? (0, runtime.deps._t)("{value}번 슬롯 해금, 창공의 정수 {value2}{value3}", { value: index + 1, value2: index + 1, value3: unlockReady ? "" : (0, runtime.deps._t)(", 재화 부족") }) : (0, runtime.deps._t)("{value}번 잠긴 슬롯, 앞 슬롯부터 해금 필요", { value: index + 1 });
  }
  function engraveSlotLabel(runtime, { enhancement, nextUnlock, unlockReady }) {
    return enhancement ? `<em>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(enhancement.name))}</em>` : nextUnlock ? `<em>${unlockReady ? (0, runtime.deps._t)("슬롯 해금") : (0, runtime.deps._t)("재화 부족")}</em>` : "";
  }
  function engraveSlotButton(runtime, index, { enhancement, unlocked, nextUnlock, stateClass, title, group, glyph, orbitX, orbitY, label }) {
    return `<button type="button" class="gem-orbit-slot slot-${index + 1} ${stateClass} ${group ? `group-${group.className}` : ""}" style="--slot-x:${orbitX.toFixed(3)}%;--slot-y:${orbitY.toFixed(3)}%" data-tip="${(0, runtime.deps.escapeHTML)(title)}" aria-label="${(0, runtime.deps.escapeHTML)(title)}" aria-pressed="${enhancement ? "true" : "false"}" aria-disabled="${!unlocked && !nextUnlock ? "true" : "false"}" data-slot-index="${index}" data-slot-state="${stateClass}" ${!unlocked && !nextUnlock ? 'tabindex="-1"' : ""}><span class="gem-orbit-slot-glyph" aria-hidden="true"><b>${glyph}</b></span>${label}</button>`;
  }

  // modules/ui/gem-engrave-dialog.mjs
  function openGemEngraveSlotOverlay(runtime, index) {
    if (!runtime.active) return;
    const selection = prepareEngraveSelection(runtime, index);
    if (!selection) return;
    closeGemEngraveSlotOverlay(runtime);
    const { deps } = runtime, overlay = deps.document.createElement("div");
    Object.assign(overlay, { id: "gem-engrave-slot-overlay", className: "game-choice-overlay gem-engrave-slot-overlay", tabIndex: -1 });
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", deps._t("{value}번 각인 슬롯 선택", { value: selection.slotIndex + 1 }));
    overlay.dataset.triggerSlotIndex = String(selection.slotIndex);
    overlay.innerHTML = engraveDialogMarkup(runtime, selection);
    runtime.state.engraveDialog = { ...selection, overlay };
    listenView(runtime, overlay, "click", (event) => handleEngraveClick(runtime, overlay, event));
    listenView(runtime, overlay, "keydown", (event) => {
      if (event.key === "Escape") closeGemEngraveSlotOverlay(runtime);
    });
    deps.document.body.appendChild(overlay);
    overlay.focus({ preventScroll: true });
  }
  function prepareEngraveSelection(runtime, index) {
    const { deps } = runtime, owner = deps.game, active = deps.getGemEnhanceTargetSkill();
    const cap = readEngraveCap(runtime, owner, active);
    if (!deps.isEnhanceableAttackGem(active) || !cap) return;
    const slotIndex = Math.max(0, Math.min(4, Math.floor(Number(index) || 0)));
    if (slotIndex >= cap && !deps.selectGemEngraveSlot(slotIndex)) return;
    if (deps.game !== owner || deps.getGemEnhanceTargetSkill() !== active) return;
    if (slotIndex >= readEngraveCap(runtime, owner, active)) return;
    owner.gemEngraveSelectedSlot = slotIndex;
    return { owner, active, slotIndex, loop: owner.loopCount, season: owner.season, slots: deps.getSkyEnhancementSlotsForSkill(active) };
  }
  function readEngraveCap(runtime, owner, active) {
    const gem = runtime.deps.normalizeGemRecord((owner.gemData || {})[active]);
    return gem ? Math.max(1, Math.min(5, Math.floor(gem.skyEnhanceCap || 1))) : 0;
  }
  function engraveDialogMarkup(runtime, selection) {
    const { deps } = runtime, { active, slotIndex, slots } = selection;
    const current = slots[slotIndex] && deps.GEM_SKY_ENHANCEMENTS[slots[slotIndex]];
    return `<section class="gem-engrave-slot-dialog"><header><div class="gem-engrave-dialog-identity">${renderSkillGemArt(runtime, active, "gem-engrave-dialog-art", { eager: true })}<div><span>${deps._t("하늘 각인")}</span><h3>${deps._t("{active}, {value}번 슬롯", { active: deps.escapeHTML(active), value: slotIndex + 1 })}</h3><p>${current ? `${deps._t("현재")} <b>${deps.escapeHTML(deps._t(current.name))}</b> ${deps.statToneText.html(deps._t(current.desc))}` : deps._t("이 슬롯에 넣을 각인을 선택하세요.")}</p></div></div><button type="button" data-action="close" aria-label="${deps._t("닫기")}">${deps._t("닫기")}</button></header><div class="gem-engrave-overlay-grid">${Object.values(deps.GEM_SKY_ENHANCEMENTS).map((enhancement) => renderGemEngraveOverlayOption(runtime, enhancement, slots, slotIndex)).join("")}</div></section>`;
  }
  function isCurrentEngraveSelection(runtime, selection) {
    if (!runtime.active || runtime.deps.game !== selection.owner) return false;
    if (selection.owner.loopCount !== selection.loop || selection.owner.season !== selection.season) return false;
    return runtime.deps.getGemEnhanceTargetSkill() === selection.active;
  }
  function handleEngraveClick(runtime, overlay, event) {
    const selection = runtime.state.engraveDialog;
    if (!selection || selection.overlay !== overlay) return;
    if (!isCurrentEngraveSelection(runtime, selection)) return closeGemEngraveSlotOverlay(runtime, false);
    if (event.target === overlay) return closeGemEngraveSlotOverlay(runtime);
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;
    if (button.dataset.action === "close") return closeGemEngraveSlotOverlay(runtime);
    applyEngraveSelection(runtime, selection, button.dataset);
  }
  function applyEngraveSelection(runtime, selection, { action, engraveId }) {
    if (!["remove", "apply"].includes(action)) return;
    const changed = action === "remove" ? runtime.deps.removeSkyGemEnhancementFromActive(engraveId, selection.slotIndex) : runtime.deps.applySkyGemEnhancementToActive(engraveId, selection.slotIndex);
    if (changed) closeGemEngraveSlotOverlay(runtime);
  }
  function closeGemEngraveSlotOverlay(runtime, restoreFocus = true) {
    const selection = runtime.state.engraveDialog;
    if (!selection) return;
    runtime.state.engraveDialog = null;
    releaseViewTarget(runtime, selection.overlay);
    selection.overlay.remove();
    if (!restoreFocus || !isCurrentEngraveSelection(runtime, selection)) return;
    const trigger = runtime.deps.document.querySelector(`#ui-gem-engrave-slots button[data-slot-index="${selection.slotIndex}"]`);
    if (trigger && !trigger.disabled) trigger.focus({ preventScroll: true });
  }

  // modules/ui/gem-cards-view.mjs
  function createGemCardsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { toggleGemFoldMode, getGemCardMeta, renderSkillGemArt, renderGemTagChips, getGemTileSummary, renderGemTileLevel, renderAttackGemCard, renderSupportGemCard, showGemCardHint, getGemGrowthSummaryHtml, renderGemEnhanceTargetCard, renderGemResourceStrip, renderGemEngraveSlots, renderSkyEnhancementIcon, renderPixelIcon, getSkyEnhancementGroup, renderSkyEnhancementOption, renderGemEngraveOverlayOption, normalizeEquippedSummonAttackSkills, getSummonSkillCount, getEquippedSummonCount, getSummonEquipCapFromStats, changeSummonSkillCount, toggleSummonAttackGem, wearMobilityGem, wearMobilityRune, openEquippedGemManagement, getEffectiveResonanceCap, getSupportTierResonanceCost, getSupportActiveTier, setSupportActiveTier, toggleSupport };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.api = { toggleGemFoldMode: runtime.handlers.toggleGemFoldMode, getGemCardMeta: runtime.handlers.getGemCardMeta, renderSkillGemArt: runtime.handlers.renderSkillGemArt, renderGemTagChips: runtime.handlers.renderGemTagChips, getGemTileSummary: runtime.handlers.getGemTileSummary, renderGemTileLevel: runtime.handlers.renderGemTileLevel, renderAttackGemCard: runtime.handlers.renderAttackGemCard, renderSupportGemCard: runtime.handlers.renderSupportGemCard, showGemCardHint: runtime.handlers.showGemCardHint, getGemGrowthSummaryHtml: runtime.handlers.getGemGrowthSummaryHtml, renderGemEnhanceTargetCard: runtime.handlers.renderGemEnhanceTargetCard, renderGemResourceStrip: runtime.handlers.renderGemResourceStrip, renderGemEngraveSlots: runtime.handlers.renderGemEngraveSlots, renderSkyEnhancementIcon: runtime.handlers.renderSkyEnhancementIcon, renderPixelIcon: runtime.handlers.renderPixelIcon, getSkyEnhancementGroup: runtime.handlers.getSkyEnhancementGroup, renderSkyEnhancementOption: runtime.handlers.renderSkyEnhancementOption, renderGemEngraveOverlayOption: runtime.handlers.renderGemEngraveOverlayOption, normalizeEquippedSummonAttackSkills: runtime.handlers.normalizeEquippedSummonAttackSkills, getSummonSkillCount: runtime.handlers.getSummonSkillCount, getEquippedSummonCount: runtime.handlers.getEquippedSummonCount, getSummonEquipCapFromStats: runtime.handlers.getSummonEquipCapFromStats, changeSummonSkillCount: runtime.handlers.changeSummonSkillCount, toggleSummonAttackGem: runtime.handlers.toggleSummonAttackGem, wearMobilityGem: runtime.handlers.wearMobilityGem, wearMobilityRune: runtime.handlers.wearMobilityRune, openEquippedGemManagement: runtime.handlers.openEquippedGemManagement, getEffectiveResonanceCap: runtime.handlers.getEffectiveResonanceCap, getSupportTierResonanceCost: runtime.handlers.getSupportTierResonanceCost, getSupportActiveTier: runtime.handlers.getSupportActiveTier, setSupportActiveTier: runtime.handlers.setSupportActiveTier, toggleSupport: runtime.handlers.toggleSupport, dispose: () => disposeGemCards(runtime) };
    runtime.handlers.openGemEngraveSlotOverlay = (index) => openGemEngraveSlotOverlay(runtime, index);
    runtime.api.openGemEngraveSlotOverlay = runtime.handlers.openGemEngraveSlotOverlay;
    runtime.api.closeGemEngraveSlotOverlay = () => closeGemEngraveSlotOverlay(runtime);
    runtime.api.changeSkill = (name, slotKind) => changeSkill(runtime, name, slotKind);
    runtime.api.getSkillGemArtPath = (name) => getSkillGemArtPath2(runtime, name);
    return runtime.api;
  }
  function disposeGemCards(runtime) {
    closeGemEngraveSlotOverlay(runtime, false);
    releaseViewEvents(runtime);
    if (runtime.state.engraveRoot) delete runtime.state.engraveRoot.dataset.engraveSlotControlsBound;
    runtime.state.engraveRoot = null;
  }

  // modules/gem-cards-ui-classic.mjs
  var gemCardsView = createGemCardsView({
    get updateStaticUI() {
      return updateStaticUI;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    },
    get gemCoreForge() {
      return gemCoreForge;
    },
    get supportGemSigil() {
      return supportGemSigil;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    // The optional skill lab overrides the public lookup; cards and ground loot share it.
    get getSkillGemArtPath() {
      return getSkillGemArtPath;
    },
    get SKILL_GEM_ART_PATHS() {
      return typeof SKILL_GEM_ART_PATHS === "undefined" ? void 0 : SKILL_GEM_ART_PATHS;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get SKILL_TAG_LABELS() {
      return SKILL_TAG_LABELS;
    },
    get translateSkillTag() {
      return typeof translateSkillTag === "undefined" ? void 0 : translateSkillTag;
    },
    get getSkillGridProfile() {
      return getSkillGridProfile;
    },
    get getSkillGridProfileKindLabel() {
      return getSkillGridProfileKindLabel;
    },
    get formatValue() {
      return formatValue;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get getUiGemPresentation() {
      return getUiGemPresentation;
    },
    get canUseSkillWithCurrentEquipment() {
      return typeof canUseSkillWithCurrentEquipment === "undefined" ? void 0 : canUseSkillWithCurrentEquipment;
    },
    get getSkillRuneWeaponNote() {
      return getSkillRuneWeaponNote;
    },
    get window() {
      return window;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    get showGemTooltip() {
      return showGemTooltip;
    },
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get getSkyEnhancementForSkill() {
      return getSkyEnhancementForSkill;
    },
    get document() {
      return document;
    },
    get selectGemEngraveSlot() {
      return selectGemEngraveSlot;
    },
    get getSkyEnhancementSlotsForSkill() {
      return getSkyEnhancementSlotsForSkill;
    },
    get removeSkyGemEnhancementFromActive() {
      return removeSkyGemEnhancementFromActive;
    },
    get applySkyGemEnhancementToActive() {
      return applySkyGemEnhancementToActive;
    },
    get getGemEnhanceTargetSkill() {
      return getGemEnhanceTargetSkill;
    },
    get isEnhanceableAttackGem() {
      return typeof isEnhanceableAttackGem === "undefined" ? void 0 : isEnhanceableAttackGem;
    },
    get GEM_SKY_ENHANCEMENTS() {
      return GEM_SKY_ENHANCEMENTS;
    },
    get canUseSkyEnhancement() {
      return canUseSkyEnhancement;
    },
    get getSkyGemEnhancementRemoveCost() {
      return typeof getSkyGemEnhancementRemoveCost === "undefined" ? void 0 : getSkyGemEnhancementRemoveCost;
    },
    get isSkyEnhancementCompatibleWithSkill() {
      return typeof isSkyEnhancementCompatibleWithSkill === "undefined" ? void 0 : isSkyEnhancementCompatibleWithSkill;
    },
    get statToneText() {
      return statToneText;
    },
    get getSummonCapMaximum() {
      return typeof getSummonCapMaximum === "undefined" ? void 0 : getSummonCapMaximum;
    },
    get hasKeystone() {
      return typeof hasKeystone === "undefined" ? void 0 : hasKeystone;
    },
    get addLog() {
      return addLog;
    },
    get pickParticle() {
      return pickParticle;
    },
    get assertBuildEditable() {
      return assertBuildEditable;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get isMobilityRuneAttackWorn() {
      return isMobilityRuneAttackWorn;
    },
    get getEquippedEnhanceableGemNames() {
      return typeof getEquippedEnhanceableGemNames === "undefined" ? void 0 : getEquippedEnhanceableGemNames;
    },
    get switchSkillSubtab() {
      return switchSkillSubtab;
    },
    get getSupportResonanceCostAtTier() {
      return getSupportResonanceCostAtTier;
    },
    get getSupportTierCap() {
      return typeof getSupportTierCap === "undefined" ? void 0 : getSupportTierCap;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get normalizeSupportLoadout() {
      return normalizeSupportLoadout;
    },
    get contentProgression() {
      return contentProgression;
    }
  });
  safeExposeGlobals({
    getSkillGemArtPath: gemCardsView.getSkillGemArtPath,
    openGemEngraveSlotOverlay: gemCardsView.openGemEngraveSlotOverlay,
    closeGemEngraveSlotOverlay: gemCardsView.closeGemEngraveSlotOverlay,
    changeSkill: gemCardsView.changeSkill,
    toggleGemFoldMode: gemCardsView.toggleGemFoldMode,
    getGemCardMeta: gemCardsView.getGemCardMeta,
    renderSkillGemArt: gemCardsView.renderSkillGemArt,
    renderGemTagChips: gemCardsView.renderGemTagChips,
    getGemTileSummary: gemCardsView.getGemTileSummary,
    renderGemTileLevel: gemCardsView.renderGemTileLevel,
    renderAttackGemCard: gemCardsView.renderAttackGemCard,
    renderSupportGemCard: gemCardsView.renderSupportGemCard,
    showGemCardHint: gemCardsView.showGemCardHint,
    getGemGrowthSummaryHtml: gemCardsView.getGemGrowthSummaryHtml,
    renderGemEnhanceTargetCard: gemCardsView.renderGemEnhanceTargetCard,
    renderGemResourceStrip: gemCardsView.renderGemResourceStrip,
    renderGemEngraveSlots: gemCardsView.renderGemEngraveSlots,
    renderSkyEnhancementIcon: gemCardsView.renderSkyEnhancementIcon,
    renderPixelIcon: gemCardsView.renderPixelIcon,
    getSkyEnhancementGroup: gemCardsView.getSkyEnhancementGroup,
    renderSkyEnhancementOption: gemCardsView.renderSkyEnhancementOption,
    renderGemEngraveOverlayOption: gemCardsView.renderGemEngraveOverlayOption,
    normalizeEquippedSummonAttackSkills: gemCardsView.normalizeEquippedSummonAttackSkills,
    getSummonSkillCount: gemCardsView.getSummonSkillCount,
    getEquippedSummonCount: gemCardsView.getEquippedSummonCount,
    getSummonEquipCapFromStats: gemCardsView.getSummonEquipCapFromStats,
    changeSummonSkillCount: gemCardsView.changeSummonSkillCount,
    toggleSummonAttackGem: gemCardsView.toggleSummonAttackGem,
    wearMobilityGem: gemCardsView.wearMobilityGem,
    wearMobilityRune: gemCardsView.wearMobilityRune,
    openEquippedGemManagement: gemCardsView.openEquippedGemManagement,
    getEffectiveResonanceCap: gemCardsView.getEffectiveResonanceCap,
    getSupportTierResonanceCost: gemCardsView.getSupportTierResonanceCost,
    getSupportActiveTier: gemCardsView.getSupportActiveTier,
    setSupportActiveTier: gemCardsView.setSupportActiveTier,
    toggleSupport: gemCardsView.toggleSupport
  });
  window.GameModules.gemCardsView = gemCardsView;
})();
