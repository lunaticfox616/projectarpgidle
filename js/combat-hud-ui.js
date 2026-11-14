// GENERATED from modules/combat-hud-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearInterval = (...args) => globalThis.clearInterval(...args);
  var windowMatchMedia = (...args) => globalThis.matchMedia(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetInterval = (...args) => globalThis.setInterval(...args);

  // modules/ui/combat-hud-definitions.mjs
  function createRuntimeEffectDetails(runtime) {
    return Object.freeze({
      woodsmanCurse: (value) => (0, runtime.deps._t)("받는 피해 +{value}%", { value: Number(value || 0).toFixed(2) }),
      deathWard: (value, maximum) => (0, runtime.deps._t)("남은 피해 흡수량: {floor} / {floor2}", { floor: Math.floor(value || 0), floor2: Math.floor(maximum || 0) }),
      invulnerableBarrier: () => "모든 피해를 받지 않습니다.",
      warriorRage: (value, maximum) => (0, runtime.deps._t)("{floor} / {floor2}중첩, 물리 피해 +{value}%", { floor: Math.floor(value || 0), floor2: Math.floor(maximum || 0), value: Math.floor(value || 0) * (typeof runtime.deps.WARRIOR_RAGE_STACK_DAMAGE_PCT === "number" ? runtime.deps.WARRIOR_RAGE_STACK_DAMAGE_PCT : 10) }),
      playerUniqueGuard: (value, maximum) => (0, runtime.deps._t)("남은 피해 흡수량: {floor} / {floor2}", { floor: Math.floor(value || 0), floor2: Math.floor(maximum || 0) }),
      stoneShield: (value, maximum) => (0, runtime.deps._t)("남은 돌 보호막: {floor} / {floor2}", { floor: Math.floor(value || 0), floor2: Math.floor(maximum || 0) }),
      shadowStealth: (value) => (0, runtime.deps._t)("이동 속도/회피/치명타 피해 +{value}%", { value: Number(value || 0).toFixed(0) }),
      leechEfficiency: (value) => (0, runtime.deps._t)("모든 흡혈 효율 +{value}%", { value: Number(value || 0).toFixed(0) }),
      lifeLeech: (value, rate) => (0, runtime.deps._t)("남은 회복 {floor}, 초당 {floor2}", { floor: Math.floor(value || 0), floor2: Math.floor(rate || 0) }),
      energyShieldLeech: (value, rate) => (0, runtime.deps._t)("남은 보호막 회복 {floor}, 초당 {floor2}", { floor: Math.floor(value || 0), floor2: Math.floor(rate || 0) }),
      lifeRecoup: (value, rate) => (0, runtime.deps._t)("남은 회생 {floor}, 초당 {floor2}", { floor: Math.floor(value || 0), floor2: Math.floor(rate || 0) }),
      meleeArmorAmp: (stacks, perStack) => (0, runtime.deps._t)("방어도 {floor}중첩, 중첩당 {perStack}% 증폭", { floor: Math.floor(stacks || 0), perStack: Number(perStack || 0).toFixed(0) }),
      killMoveStacks: (stacks, perStack) => (0, runtime.deps._t)("{floor}중첩, 이동 속도 +{value}%", { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * Number(perStack || 0) }),
      warriorRhythm: (critStacks, doubleStacks) => (0, runtime.deps._t)("치명타 {floor}/5, 연속 공격 {floor2}/5", { floor: Math.floor(critStacks || 0), floor2: Math.floor(doubleStacks || 0) }),
      gladiatorFlurry: (stacks) => (0, runtime.deps._t)("{floor}/12중첩, 공격 속도 +{value}%, 회피 +{value2}%", { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * runtime.deps.ASCENDANCY_KEYSTONE_VALUES.g2.aspdPctPerStack, value2: Math.floor(stacks || 0) * 3 }),
      gladiatorVeteran: (value) => (0, runtime.deps._t)("다음 타격 치명타 확률 +{floor}%p", { floor: Math.floor(value || 0) }),
      gladiatorSwift: (attackReady, guardReady) => (0, runtime.deps._t)("다음 타격 강화 {value}, 다음 피격 경감 {value2}", { value: attackReady ? (0, runtime.deps._t)("준비") : (0, runtime.deps._t)("소모"), value2: guardReady ? (0, runtime.deps._t)("준비") : (0, runtime.deps._t)("소모") }),
      assassinBlurred: () => "이동 속도/회피 +20%, 치명타 피해 +25%",
      elementalistOverload: (stacks) => (0, runtime.deps._t)("{floor}중첩, 원소 피해 +{value}%, 치명타 확률 -{floor2}%p", { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * runtime.deps.ASCENDANCY_KEYSTONE_VALUES.e8.morePctPerStack, floor2: Math.floor(stacks || 0) }),
      catalystEvade: () => "다음 회피 판정이 30% 증폭됩니다.",
      crusaderLightningAegis: () => "초당 최대 ES 25% 회복, 번개 피해 +75%",
      guardianEndurance: (stacks) => (0, runtime.deps._t)("{floor}/5중첩, 방어도 +{value}%", { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * 11 }),
      colosseumReady: () => "다음 공격이 투기장 일격으로 강화됩니다.",
      summonDeathDamageBuff: (value) => (0, runtime.deps._t)("소환수 피해 +{value}%", { value: Number(value || 0).toFixed(0) }),
      summonCritAspd: (stacks, perStack) => (0, runtime.deps._t)("{floor}중첩, 소환수 공격 속도 +{value}%", { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * Number(perStack || 0) }),
      enemyWither: (stacks) => (0, runtime.deps._t)("{floor}/10중첩, 받는 카오스 피해 +{value}%", { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * runtime.deps.ASCENDANCY_KEYSTONE_VALUES.wlk9.chaosTakenPctPerStack }),
      enemyChaosResDown: (stacks, perStack) => (0, runtime.deps._t)("{floor}중첩, 카오스 저항 -{value}%", { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * Number(perStack || 0) }),
      enemyElementalResDown: (stacks, perStack) => (0, runtime.deps._t)("{floor}중첩, 원소 저항 -{value}%", { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * Number(perStack || 0) }),
      chaosErosion: (value) => (0, runtime.deps._t)("카오스 저항 -{value}%", { value: Number(value || 0).toFixed(0) }),
      regenSuppress: (value) => (0, runtime.deps._t)("생명력 재생 -{value}%", { value: Number(value || 0).toFixed(0) }),
      talentInquisitorMark: (value) => (0, runtime.deps._t)("폭발 예정 누적 피해 {floor}", { floor: Math.floor(value || 0) }),
      talentButcherMark: (value) => (0, runtime.deps._t)("{floor}/4회 적중", { floor: Math.floor(value || 0) }),
      rangerWeakpointMark: (value) => (0, runtime.deps._t)("{floor}/3회 적중", { floor: Math.floor(value || 0) }),
      bloomRegenSuppress: (value) => (0, runtime.deps._t)("생명력 재생 {value}% 억제", { value: Number(value || 0).toFixed(0) }),
      delayedGuardHeal: (value) => (0, runtime.deps._t)("남은 회복량 {floor}", { floor: Math.floor(value || 0) }),
      riderCompassReady: () => "이동 후 첫 타격 피해 +100%",
      fletcherCharge: (value) => (0, runtime.deps._t)("{floor}/3회 공격, 3번째 공격 피해 +33%", { floor: Math.floor(value || 0) }),
      colosseumCharge: (value) => (0, runtime.deps._t)("{floor}/5중첩, 5중첩 시 다음 공격 강화", { floor: Math.floor(value || 0) }),
      queenBeeSwarm: (count, attacksLeft) => (0, runtime.deps._t)("{floor}마리, 남은 공격 {floor2}회", { floor: Math.floor(count || 0), floor2: Math.floor(attacksLeft || 0) })
    });
  }
  var COMBAT_EFFECT_PRESENTATION = Object.freeze({
    ignite: { sprite: 0, label: "점화", color: "#ff9f43" },
    chill: { sprite: 1, label: "냉각", color: "#9be7ff" },
    freeze: { sprite: 2, label: "동결", color: "#4da3ff" },
    shock: { sprite: 3, label: "감전", color: "#ffe66d" },
    poison: { sprite: 4, label: "중독", color: "#c56cff" },
    bleed: { sprite: 5, label: "출혈", color: "#ff6b6b" },
    flameDecay: { sprite: 6, label: "화염 부패", color: "#ff7a3d" },
    assassinWeakness: { sprite: 7, label: "독점 약점", color: "#ff9bd1" },
    hunterExpose: { sprite: 8, label: "약점 노출", color: "#ffd36b" },
    cosmosJudgment: { sprite: 9, label: "우주 심판", color: "#b6a2ff" },
    realmAllResDown: { sprite: 10, label: "모든 저항 약화", color: "#d89cff" },
    cosmos_regen_down: { sprite: 11, label: "재생 효율 감소", color: "#d89cff" },
    cosmos_leech_down: { sprite: 12, label: "흡혈 효율 감소", color: "#d89cff" },
    cosmos_res_down: { sprite: 13, label: "저항 감소", color: "#d89cff" },
    cosmos_aspd_down: { sprite: 14, label: "공격 속도 감소", color: "#d89cff" },
    curse: { sprite: 15, label: "저주", color: "#d0a8ff" },
    guard: { sprite: 16, label: "수호", color: "#9be7ff" },
    warcry: { sprite: 17, label: "함성", color: "#ffd36b" },
    utility: { sprite: 18, label: "기능", color: "#8fe3b0" },
    buff: { sprite: 18, label: "강화 효과", color: "#8fe3b0" },
    woodsmanCurse: { sprite: 21, label: "나무꾼의 저주", color: "#d0a8ff" },
    deathWard: { sprite: 22, label: "감시 보호막", color: "#b9d9ff" },
    invulnerableBarrier: { sprite: 23, label: "균열 장막", color: "#c49bff" },
    warriorRage: { sprite: 24, label: "격노 순환", color: "#ff9f43" },
    playerUniqueGuard: { sprite: 25, label: "용맥의 수호", color: "#b9d9ff" },
    stoneShield: { sprite: 16, label: "돌 보호막", color: "#d8b77a" },
    shadowStealth: { sprite: 26, label: "그림자 은신", color: "#c9a8ff" },
    leechEfficiency: { sprite: 27, label: "흡혈 효율 강화", color: "#d989a2" },
    lifeLeech: { sprite: 27, label: "생명력 흡혈", color: "#df8396" },
    energyShieldLeech: { sprite: 27, label: "에너지 보호막 흡혈", color: "#8fcbe8" },
    meleeArmorAmp: { sprite: 28, label: "깨지지 않는 비늘", color: "#c9b59a" },
    killMoveStacks: { sprite: 29, label: "질주의 발자국", color: "#e1c58a" },
    lifeRecoup: { sprite: 30, label: "생명력 회생", color: "#e58f9a" },
    warriorRhythm: { sprite: 31, label: "전장의 리듬", color: "#d9ad7d" },
    gladiatorFlurry: { sprite: 32, label: "연참 호흡", color: "#e0c9a8" },
    gladiatorVeteran: { sprite: 33, label: "노련함", color: "#e2b88d" },
    gladiatorSwift: { sprite: 34, label: "속공 전개", color: "#e7d1aa" },
    assassinBlurred: { sprite: 35, label: "그림자 질주", color: "#a8b6c8" },
    elementalistOverload: { sprite: 36, label: "원소 과부하", color: "#c9a2ff" },
    catalystEvade: { sprite: 37, label: "연막 포션", color: "#b8c3ca" },
    crusaderLightningAegis: { sprite: 38, label: "번개 불사", color: "#ffe08a" },
    guardianEndurance: { sprite: 39, label: "인내 장전", color: "#d1bd9d" },
    colosseumReady: { sprite: 41, label: "투기장 일격 준비", color: "#e0ad78" },
    summonDeathDamageBuff: { sprite: 42, label: "소환수 사망 피해 강화", color: "#b7d8e5" },
    summonCritAspd: { sprite: 43, label: "소환수 치명타 공속", color: "#c4a7e8" },
    eliteTraitBuff: { sprite: 45, label: "무한한 허기", color: "#d98f88" },
    incidentBreath: { sprite: 18, label: "세계수의 숨결", color: "#b8f0c8" },
    enemyWither: { sprite: 46, label: "위축", color: "#b58be0" },
    talentInquisitorMark: { sprite: 9, label: "심판 표식", color: "#efb16e" },
    talentButcherMark: { sprite: 47, label: "도살자 표식", color: "#e58a7d" },
    rangerWeakpointMark: { sprite: 7, label: "급소 표식", color: "#efbd7a" },
    enemyChaosResDown: { sprite: 13, label: "카오스 저항 약화", color: "#b58be0" },
    enemyElementalResDown: { sprite: 13, label: "원소 저항 약화", color: "#9bcbe8" },
    chaosErosion: { sprite: 13, label: "카오스 침식", color: "#b58be0" },
    regenSuppress: { sprite: 11, label: "생명력 재생 억제", color: "#c99b9b" },
    bloomRegenSuppress: { sprite: 11, label: "혹독한 한기", color: "#9fc9e8" },
    delayedGuardHeal: { sprite: 30, label: "지연 회복", color: "#8fdaa8" },
    riderCompassReady: { sprite: 33, label: "기수의 나침반", color: "#d5b778" },
    fletcherCharge: { sprite: 34, label: "플레쳐", color: "#d9ae76" },
    colosseumCharge: { sprite: 41, label: "관중의 함성", color: "#e0ad78" },
    queenBeeSwarm: { sprite: 43, label: "여왕벌", color: "#e4c45f" },
    enemySkillDot: { sprite: 46, label: "지속 피해", color: "#a4c7df" }
  });

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

  // modules/ui/combat-hud-lifetime.mjs
  function syncCombatHudOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) {
      clearCombatHudWork(runtime);
      runtime.owner = runtime.deps.game;
    }
    return true;
  }
  function releaseCombatHudSkills(runtime) {
    for (const target of new Set(runtime.listeners.map((binding) => binding.target))) {
      if (runtime.deps.activeInfoTooltipToken === target) runtime.deps.hideInfoTooltip();
      releaseViewTarget(runtime, target);
    }
    if (runtime.skillHost) delete runtime.skillHost.dataset.signature;
    runtime.skillHost = null;
  }
  function releaseCombatHudTrait(runtime) {
    const element = runtime.trait;
    if (!element) return;
    if (element.__traitRotationTimer != null) runtime.deps.clearInterval(element.__traitRotationTimer);
    if (runtime.traitFrame !== null) runtime.deps.cancelAnimationFrame(runtime.traitFrame);
    element.__traitRotationTimer = null;
    element.__traitSignature = "";
    element.__traitOverflowPending = false;
    element.__traitOverflowGeneration = Math.max(0, Math.floor(element.__traitOverflowGeneration || 0)) + 1;
    element.classList.remove("is-overflowing", "is-rotating");
    runtime.trait = null;
    runtime.traitFrame = null;
  }
  function ownCombatHudTrait(runtime, element) {
    if (runtime.trait === element) return;
    releaseCombatHudTrait(runtime);
    runtime.trait = element;
  }
  function clearCombatHudWork(runtime) {
    releaseCombatHudTrait(runtime);
    releaseCombatHudSkills(runtime);
    runtime.handlers.hideEnemyTraitTooltip();
    if (runtime.levelAnimation) runtime.levelAnimation.cancel();
    runtime.levelAnimation = null;
    Object.assign(runtime.state, {
      playerHpDamageGhostPct: null,
      playerHpDamageGhostLastPct: null,
      playerHpDamageGhostLastAt: 0,
      playerHpDamageGhostHoldUntil: 0,
      hudShownLevel: 0
    });
    runtime.state.enemyHpDamageGhostStates.clear();
    runtime.state.combatSkillCooldownSpans.clear();
  }
  function disposeCombatHud(runtime) {
    if (!runtime.active) return;
    clearCombatHudWork(runtime);
    releaseViewEvents(runtime);
  }

  // modules/ui/combat-hud-skills.mjs
  function getCombatSkillHudEntries(runtime) {
    let summons = (Array.isArray(runtime.deps.game.equippedSummonSkills) ? runtime.deps.game.equippedSummonSkills : []).filter((name) => {
      let def = runtime.deps.SKILL_DB[name];
      return def && Array.isArray(def.tags) && def.tags.includes("summon_attack");
    });
    let gems = [runtime.deps.game.activeSkill || "기본 공격"].concat(summons).filter((name, index, list) => name && list.indexOf(name) === index).slice(0, 4).map((name, index) => ({ kind: index === 0 ? "primary" : "summon", name }));
    let mobility = runtime.deps.SKILL_DB[runtime.deps.game.mobilitySkill] ? [{ kind: "mobility", name: runtime.deps.game.mobilitySkill, hotkey: getHotkeyLabel(runtime, "combat:mobility") }] : [];
    return gems.slice(0, 1).concat(mobility, gems.slice(1)).slice(0, runtime.state.COMBAT_SKILL_HUD_LIMIT);
  }
  function getHotkeyLabel(runtime, actionId) {
    return runtime.deps.hotkeyBindings.label(runtime.deps.hotkeyBindings.codeFor(runtime.deps.game.settings.hotkeyOverrides, actionId));
  }
  function renderCombatSkillSlot(runtime, entry) {
    let name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(entry.name));
    let art = (0, runtime.deps.renderSkillGemArt)(entry.name, "combat-skill-gem-art", { eager: true });
    let cooldown = entry.kind === "mobility" ? '<span class="player-hud-skill-cooldown" aria-hidden="true" hidden></span>' : "";
    let key = entry.hotkey ? (0, runtime.deps.escapeHTML)(entry.hotkey) : "";
    let keyAttrs = key ? ` aria-keyshortcuts="${key}"` : "";
    let keyCap = key ? `<i class="combat-hud-key" aria-hidden="true">${key}</i>` : "";
    return `<button type="button" class="player-hud-skill-slot ${entry.kind}" data-gem-name="${name}" data-slot-kind="${entry.kind}"${keyAttrs} data-info-tooltip-anchor="1" aria-label="${runtime.state.COMBAT_SKILL_SLOT_LABELS[entry.kind]}, ${name}">${art}${cooldown}${keyCap}</button>`;
  }
  function bindCombatSkillSlot(runtime, button) {
    let name = button.dataset.gemName;
    const owner = runtime.owner;
    const current = () => runtime.active && runtime.deps.game === owner && button.isConnected;
    let show = (event) => {
      if (current() && event.pointerType === "mouse") (0, runtime.deps.showGemTooltip)(event, "active", name);
    };
    listenView(runtime, button, "pointerenter", show);
    listenView(runtime, button, "pointermove", show);
    listenView(runtime, button, "pointerleave", () => {
      if (current()) (0, runtime.deps.hideInfoTooltip)();
    });
    listenView(runtime, button, "click", () => {
      if (!current()) return;
      if (button.dataset.slotKind === "mobility") {
        runtime.deps.hotkeysUi.useMobility(button);
        return;
      }
      (0, runtime.deps.openTabPane)("tab-skills");
    });
  }
  function getCombatSkillCooldownSpan(runtime, name, readyAt, remaining) {
    let known = runtime.state.combatSkillCooldownSpans.get(name);
    if (!known || known.readyAt !== readyAt) {
      known = { readyAt, totalMs: Math.max(1, remaining) };
      runtime.state.combatSkillCooldownSpans.set(name, known);
    }
    return known.totalMs;
  }
  function paintCombatSkillCooldown(runtime, button, readyAt, now, justCast) {
    let name = button.dataset.gemName;
    let remaining = Math.max(0, readyAt - now);
    let badge = button.querySelector(".player-hud-skill-cooldown");
    let seconds = remaining > 0 ? String(Math.ceil(remaining / 1e3)) : "";
    button.style.setProperty("--cooldown", remaining > 0 ? (remaining / getCombatSkillCooldownSpan(runtime, name, readyAt, remaining)).toFixed(3) : "0");
    button.classList.toggle("cooling", remaining > 0);
    button.classList.toggle("just-cast", justCast);
    if (badge.textContent !== seconds) badge.textContent = seconds;
    badge.hidden = !seconds;
  }
  function refreshCombatSkillCooldowns(runtime, host) {
    let now = (0, runtime.deps.getCombatTime)();
    host.querySelectorAll(".player-hud-skill-slot.mobility").forEach((button) => paintCombatSkillCooldown(runtime, button, now + runtime.deps.mobilitySkill.cooldownLeft(now), now, false));
  }
  function renderCombatSkillHud(runtime) {
    let host = runtime.deps.document.getElementById("ui-combat-skill-gems");
    if (runtime.skillHost !== host) releaseCombatHudSkills(runtime);
    if (!host) return;
    runtime.skillHost = host;
    let entries = getCombatSkillHudEntries(runtime);
    let signature = runtime.deps.i18n.locale + "|" + entries.map((entry) => `${entry.kind}:${entry.name}:${entry.hotkey || ""}`).join("|");
    if (host.dataset.signature !== signature) {
      releaseCombatHudSkills(runtime);
      runtime.skillHost = host;
      entries.forEach((entry) => {
        const spec = runtime.deps.SKILL_SIGNATURE_SPRITES[runtime.deps.SKILL_GEM_VFX_PROFILES[entry.name]?.signature];
        if (spec) (0, runtime.deps.getSkillGemVfxImage)(spec.asset);
      });
      host.dataset.signature = signature;
      host.dataset.slotCount = String(entries.length);
      host.innerHTML = entries.map(runtime.handlers.renderCombatSkillSlot).join("");
      host.querySelectorAll(".player-hud-skill-slot").forEach(runtime.handlers.bindCombatSkillSlot);
    }
    refreshCombatSkillCooldowns(runtime, host);
  }

  // modules/ui/combat-hud-values.mjs
  function renderHudIdentity(runtime) {
    const { deps } = runtime;
    const identityId = deps.game.selectedClassId || deps.game.selectedHeroId;
    const hero = typeof deps.getHeroSelectionDef === "function" ? deps.getHeroSelectionDef(identityId) : null;
    const ascension = deps.game.ascendClass && deps.CLASS_TEMPLATES ? deps.CLASS_TEMPLATES[deps.game.ascendClass] : null;
    setTextById(runtime, "ui-player-name-label", hero ? hero.label : "플레이어");
    setTextById(runtime, "ui-player-class-label", ascension ? ascension.name : "미전직");
    deps.document.querySelector("#battle-column .player-hud-identity-row")?.toggleAttribute("data-ascended", !!ascension);
  }
  function setTextById(runtime, id, value) {
    setElementText(runtime, runtime.deps.document.getElementById(id), value);
  }
  function setElementText(runtime, el, value) {
    if (!el) return;
    const text = value == null ? "" : String(value);
    if (el.textContent !== text) el.textContent = text;
  }
  function setElementAttribute(runtime, el, name, value) {
    if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  function shouldUseCommaSetting(runtime, settingKey) {
    return !(runtime.deps.game && runtime.deps.game.settings && runtime.deps.game.settings[settingKey] === false);
  }
  function formatCommaNumber(runtime, value, options = {}) {
    let amount = Number(value) || 0;
    if (options.decimals !== void 0) return amount.toFixed(options.decimals);
    return Math.floor(amount).toLocaleString(runtime.deps.i18n.locale);
  }
  function formatSettingNumber(runtime, value, settingKey, options = {}) {
    if (!shouldUseCommaSetting(runtime, settingKey)) {
      if (options.decimals !== void 0) return (Number(value) || 0).toFixed(options.decimals);
      return String(Math.floor(Number(value) || 0));
    }
    return formatCommaNumber(runtime, value, options);
  }
  function formatCappedResistanceValue(runtime, appliedValue, uncappedValue) {
    let applied = Math.floor(Number(appliedValue) || 0);
    let uncapped = Number.isFinite(Number(uncappedValue)) ? Math.floor(Number(uncappedValue)) : applied;
    return applied === uncapped ? `${applied}` : `${applied} (${uncapped})`;
  }
  function setUiImageGaugePercent(runtime, element, percent) {
    if (!element) return;
    let safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    if (element.__gaugePercent === safePercent) return;
    element.__gaugePercent = safePercent;
    element.style.width = "100%";
    element.style.setProperty("--gauge-fill", `${safePercent}%`);
    if (element.parentElement && element.parentElement.style) {
      element.parentElement.style.setProperty("--gauge-fill", `${safePercent}%`);
    }
  }
  function renderEnergyShieldInline(runtime, el, hasEnergyShield, current, max) {
    if (!el) return;
    const display = hasEnergyShield ? "" : "none";
    if (el.style.display !== display) el.style.display = display;
    if (!hasEnergyShield) return;
    const parts = energyShieldInlineParts(runtime, el);
    const nowText = String(Math.floor(current || 0)), maxText = `/${Math.floor(max || 0)}`;
    if (parts.now.data !== nowText) parts.now.data = nowText;
    if (parts.max.data !== maxText) parts.max.data = maxText;
  }
  function energyShieldInlineParts(runtime, el) {
    if (el.__esParts && el.__esParts.now.parentNode === el) return el.__esParts;
    el.innerHTML = '0<span class="combat-es-max">/0</span>';
    el.__esParts = { now: el.childNodes[0], max: el.lastChild.firstChild };
    return el.__esParts;
  }

  // modules/ui/combat-hud-traits.mjs
  function getUiEnemyTraitLabels(runtime, tags) {
    return (Array.isArray(tags) ? tags : []).filter((tag) => {
      let label = String(tag || "").trim();
      return label && label !== "보스" && label !== "정예";
    });
  }
  function getUiEnemyTraitDisplayText(runtime, tags) {
    let labels = getUiEnemyTraitLabels(runtime, tags);
    let fullText = labels.join(", ");
    let compactLabels = labels.map((label) => String(label).replace(/^패턴:\s*/, "").replace(/^다음:\s*/, "다음 ").split(/\s+[—–]\s+/)[0].replace(/\s+전개$/, ""));
    let compactText = compactLabels.join(", ");
    if (compactText.length > 25) {
      compactText = compactLabels.map((label) => label.length > 7 ? `${label.slice(0, 6)}…` : label).join(", ");
    }
    return { fullText, compactText };
  }
  function clearUiEnemyTraitRotation(runtime, traitEl) {
    if (!traitEl || traitEl.__traitRotationTimer == null) return;
    (0, runtime.deps.clearInterval)(traitEl.__traitRotationTimer);
    traitEl.__traitRotationTimer = null;
  }
  function setUiEnemyTraitText(runtime, target, text) {
    target.innerHTML = `<span class="enemy-trait-text">${runtime.deps.statToneText.html(text)}</span>`;
  }
  function scheduleUiEnemyTraitOverflow(runtime, traitEl, track, content, signature) {
    if (runtime.traitFrame !== null) runtime.deps.cancelAnimationFrame(runtime.traitFrame);
    runtime.traitFrame = null;
    setUiEnemyTraitText(runtime, track, content);
    traitEl.__traitOverflowPending = true;
    if (typeof runtime.deps.document !== "undefined" && runtime.deps.document.hidden) return;
    let generation = Math.max(0, Math.floor(traitEl.__traitOverflowGeneration || 0)) + 1;
    traitEl.__traitOverflowGeneration = generation;
    const owner = runtime.owner;
    let measure = () => {
      runtime.traitFrame = null;
      if (!runtime.active || runtime.deps.game !== owner) return;
      if (!traitEl.isConnected || traitEl.__traitOverflowGeneration !== generation || traitEl.__traitSignature !== signature) return;
      if (typeof runtime.deps.document !== "undefined" && runtime.deps.document.hidden) return;
      setUiEnemyTraitText(runtime, track, content);
      let panelWidth = Math.max(0, traitEl.clientWidth);
      let singleWidth = Math.max(0, track.scrollWidth);
      let overflowing = singleWidth > panelWidth + 4;
      traitEl.classList.toggle("is-overflowing", overflowing);
      if (overflowing) {
        let loopText = runtime.deps.statToneText.html(`${content}　　　`);
        track.innerHTML = `<span class="enemy-trait-marquee-copy">${loopText}</span><span class="enemy-trait-marquee-copy" aria-hidden="true">${loopText}</span>`;
        let loopDistance = Math.max(singleWidth, track.scrollWidth / 2);
        track.style.setProperty("--trait-duration", `${Math.max(8, Math.min(20, loopDistance / 20)).toFixed(2)}s`);
      }
      traitEl.__traitOverflowPending = false;
    };
    if (typeof runtime.deps.requestAnimationFrame === "function") runtime.traitFrame = (0, runtime.deps.requestAnimationFrame)(measure);
    else measure();
  }
  function updateUiEnemyTraitMarqueeCopies(runtime, traitEl, track, content) {
    if (!traitEl.classList.contains("is-overflowing")) return false;
    let copies = track.querySelectorAll(".enemy-trait-marquee-copy");
    if (copies.length !== 2) return false;
    let loopText = `${content}　　　`;
    copies.forEach((copy) => {
      if (copy.textContent !== loopText) setUiEnemyTraitText(runtime, copy, loopText);
    });
    return true;
  }
  function createUpdateUiEnemyTraitPanel(runtime) {
    return function updateUiEnemyTraitPanel(traitEl, labels, display, fullTooltip, isBoss) {
      if (!traitEl) return;
      const track = traitEl.querySelector(".enemy-trait-marquee");
      if (!track) return;
      ownCombatHudTrait(runtime, traitEl);
      const visible = Array.isArray(labels) && labels.length > 0;
      traitEl.style.display = visible ? "" : "none";
      setTraitAccessibility(runtime, traitEl, fullTooltip || display.fullText || "", isBoss);
      if (!visible) {
        releaseCombatHudTrait(runtime);
        track.textContent = "";
        return;
      }
      const mode = traitDisplayMode(runtime, labels, isBoss);
      if (traitEl.__traitSignature === mode.signature) {
        resumeTraitMeasurement(runtime, traitEl, track, display.fullText, mode);
        return;
      }
      traitEl.__traitSignature = mode.signature;
      paintTraitPresentation(runtime, traitEl, track, { labels, display, isBoss, ...mode });
    };
  }
  function setTraitAccessibility(runtime, traitEl, detail, isBoss) {
    setElementAttribute(runtime, traitEl, "data-enemy-trait-tooltip", detail);
    setElementAttribute(runtime, traitEl, "data-enemy-trait-kind", isBoss ? "보스 특성" : "정예 특성");
    setElementAttribute(runtime, traitEl, "aria-label", detail);
    setElementAttribute(runtime, traitEl, "tabindex", "0");
  }
  function traitDisplayMode(runtime, labels, isBoss) {
    const mobile = isBoss && typeof runtime.deps.matchMedia === "function" && runtime.deps.uiDisplay.matches("(max-width: 1080px)");
    const reducedMotion = typeof runtime.deps.matchMedia === "function" && (0, runtime.deps.matchMedia)("(prefers-reduced-motion: reduce)").matches;
    const signature = `${isBoss ? "boss" : "elite"}|${mobile}|${reducedMotion}|${labels.join("")}`;
    return { mobile, reducedMotion, signature, measure: isBoss && (!mobile || reducedMotion || labels.length === 1) };
  }
  function resumeTraitMeasurement(runtime, traitEl, track, content, mode) {
    if (!traitEl.__traitOverflowPending || !mode.measure || runtime.traitFrame !== null) return;
    if (typeof runtime.deps.document !== "undefined" && runtime.deps.document.hidden) return;
    scheduleUiEnemyTraitOverflow(runtime, traitEl, track, content, mode.signature);
  }
  function paintTraitPresentation(runtime, traitEl, track, mode) {
    if (mode.isBoss && !mode.mobile && !mode.reducedMotion && updateUiEnemyTraitMarqueeCopies(runtime, traitEl, track, mode.display.fullText)) return;
    clearUiEnemyTraitRotation(runtime, traitEl);
    traitEl.classList.remove("is-overflowing", "is-rotating");
    if (!mode.isBoss) setUiEnemyTraitText(runtime, track, mode.display.compactText);
    else if (mode.measure) scheduleUiEnemyTraitOverflow(runtime, traitEl, track, mode.display.fullText, mode.signature);
    else rotateTraitLabels(runtime, traitEl, track, mode.labels);
  }
  function rotateTraitLabels(runtime, traitEl, track, labels) {
    let index = 0;
    const owner = runtime.owner;
    traitEl.classList.add("is-rotating");
    setUiEnemyTraitText(runtime, track, labels[index]);
    traitEl.__traitRotationTimer = (0, runtime.deps.setInterval)(() => {
      if (!runtime.active || runtime.deps.game !== owner) return clearUiEnemyTraitRotation(runtime, traitEl);
      if (!traitEl.isConnected) return clearUiEnemyTraitRotation(runtime, traitEl);
      if (traitEl.matches(":hover") || typeof runtime.deps.document !== "undefined" && runtime.deps.document.activeElement === traitEl) return;
      index = (index + 1) % labels.length;
      setUiEnemyTraitText(runtime, track, labels[index]);
    }, 2600);
  }
  function updateFocusedEnemyTraitPanel(runtime, traitEl, enemy, tags) {
    const isBoss = !!(enemy.isBoss || enemy.bossPhase);
    const pending = runtime.deps.window.GameModules.state.combat.pendingEnemyCombatAttacks.find((attack) => attack.enemyId === enemy.id);
    const cast = isBoss ? runtime.deps.enemyAttackRules.castBar(enemy, (0, runtime.deps.getCombatTime)(), pending) : null;
    const traits = getUiEnemyTraitLabels(runtime, tags);
    const labels = cast?.label ? [cast.label] : traits;
    const display = getUiEnemyTraitDisplayText(runtime, labels);
    const pattern = enemy.noAttack ? "" : (0, runtime.deps.getBossPatternDescription)(enemy.patternMode);
    const tooltip = [cast?.label, traits.join(", "), pattern].filter(Boolean).join("\n");
    traitEl.classList.toggle("is-casting", !!cast?.label);
    runtime.handlers.updateUiEnemyTraitPanel(traitEl, labels, display, tooltip, isBoss);
    if (cast?.label) setElementAttribute(runtime, traitEl, "data-enemy-trait-kind", "보스 행동");
    traitEl.closest(".enemy-card").classList.toggle("has-trait-line", labels.length > 0);
  }

  // modules/ui/combat-hud-tooltip.mjs
  function showEnemyTraitTooltip(runtime, event) {
    let anchor = event.currentTarget || (event.target && event.target.closest ? event.target.closest(".enemy-traits") : null);
    if (!anchor) return;
    let detail = anchor.getAttribute("data-enemy-trait-tooltip") || "";
    if (!detail) return runtime.handlers.showEnemyTraitTooltip.hide();
    let title = anchor.getAttribute("data-enemy-trait-kind") || "적 특성";
    let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)(title)}</div>` + String(detail).split("\n").map((line) => `<div class="tooltip-line">${runtime.deps.statToneText.html(line)}</div>`).join("");
    const rect = anchor.getBoundingClientRect();
    runtime.handlers.showEnemyTraitTooltip.current = { anchor, detail, title };
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX || rect.left + rect.width / 2, event.clientY || rect.bottom, html, "#d99a8f", anchor);
  }
  function onEnemyTraitKey(runtime, event) {
    if (!runtime.active || runtime.owner !== runtime.deps.game) return;
    if (!["Enter", " ", "Escape"].includes(event.key)) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.key === "Escape") {
      event.currentTarget.blur();
      runtime.handlers.showEnemyTraitTooltip.hide();
    } else showEnemyTraitTooltip(runtime, event);
  }
  function syncEnemyTraitTooltip(runtime) {
    const current = runtime.handlers.showEnemyTraitTooltip.current;
    if (!current) return;
    const { anchor, detail, title } = current;
    if (runtime.deps.activeInfoTooltipToken !== anchor) {
      runtime.handlers.showEnemyTraitTooltip.current = null;
      return;
    }
    if (!anchor.isConnected || anchor.style.display === "none" || anchor.closest("[hidden]")) return runtime.handlers.showEnemyTraitTooltip.hide();
    if (detail !== (anchor.getAttribute("data-enemy-trait-tooltip") || "") || title !== (anchor.getAttribute("data-enemy-trait-kind") || "적 특성")) showEnemyTraitTooltip(runtime, { currentTarget: anchor });
  }
  function hideEnemyTraitTooltip(runtime) {
    const anchor = runtime.handlers.showEnemyTraitTooltip.current?.anchor;
    runtime.handlers.showEnemyTraitTooltip.current = null;
    if (anchor && runtime.deps.activeInfoTooltipToken === anchor) (0, runtime.deps.hideInfoTooltip)();
  }

  // modules/ui/combat-hud-hp-ghost.mjs
  function updateHpDamageGhostState(runtime, state, actualPct, now, options) {
    actualPct = Math.max(0, Math.min(100, Number(actualPct) || 0));
    if (!state || state.ghostPct === null || state.lastPct === null) {
      return initialHpDamageGhost(runtime, actualPct, now, options);
    }
    let elapsedSec = Math.max(0, Math.min(0.5, (now - (state.lastAt || now)) / 1e3));
    extendHpDamageGhostHold(runtime, state, actualPct, now, options);
    if (now >= state.holdUntil && state.ghostPct > actualPct) {
      state.ghostPct = Math.max(actualPct, state.ghostPct - runtime.state.PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC * elapsedSec);
    }
    state.lastPct = actualPct;
    state.lastAt = now;
    return state;
  }
  function updatePlayerHpDamageGhost(runtime, actualPct) {
    let state = updateHpDamageGhostState(runtime, {
      ghostPct: runtime.state.playerHpDamageGhostPct,
      lastPct: runtime.state.playerHpDamageGhostLastPct,
      lastAt: runtime.state.playerHpDamageGhostLastAt,
      holdUntil: runtime.state.playerHpDamageGhostHoldUntil
    }, actualPct, runtime.deps.Date.now());
    runtime.state.playerHpDamageGhostPct = state.ghostPct;
    runtime.state.playerHpDamageGhostLastPct = state.lastPct;
    runtime.state.playerHpDamageGhostLastAt = state.lastAt;
    runtime.state.playerHpDamageGhostHoldUntil = state.holdUntil;
    return runtime.state.playerHpDamageGhostPct;
  }
  function primeEnemyHpDamageGhost(runtime, enemyId, actualPct) {
    if (enemyId === null || enemyId === void 0 || runtime.deps.game.isBackgroundCalculation) return;
    let key = String(enemyId);
    if (runtime.state.enemyHpDamageGhostStates.has(key)) return;
    runtime.state.enemyHpDamageGhostStates.set(key, updateHpDamageGhostState(runtime, null, actualPct === void 0 ? 100 : actualPct, runtime.deps.Date.now()));
  }
  function updateEnemyHpDamageGhost(runtime, enemyId, actualPct) {
    if (enemyId === null || enemyId === void 0) return Math.max(0, Math.min(100, Number(actualPct) || 0));
    let key = String(enemyId);
    let now = runtime.deps.Date.now();
    let state = updateHpDamageGhostState(runtime, runtime.state.enemyHpDamageGhostStates.get(key) || null, actualPct, now);
    if (state.ghostPct > actualPct + 0.05) {
      if (!Number.isFinite(state.snapAt) || state.snapAt <= 0) state.snapAt = now + runtime.state.ENEMY_HP_DAMAGE_GHOST_SNAP_MS;
      if (now >= state.snapAt) {
        state.ghostPct = Math.max(0, Math.min(100, Number(actualPct) || 0));
        state.holdUntil = 0;
        state.snapAt = 0;
      }
    } else {
      state.snapAt = 0;
    }
    runtime.state.enemyHpDamageGhostStates.set(key, state);
    return state.ghostPct;
  }
  function pruneEnemyHpDamageGhostStates(runtime, activeEnemyIds) {
    if (!runtime.state.enemyHpDamageGhostStates || runtime.state.enemyHpDamageGhostStates.size <= 0) return;
    let activeSet = new Set((activeEnemyIds || []).map((id) => String(id)));
    Array.from(runtime.state.enemyHpDamageGhostStates.keys()).forEach((key) => {
      if (!activeSet.has(key)) runtime.state.enemyHpDamageGhostStates.delete(key);
    });
  }
  function initialHpDamageGhost(runtime, actualPct, now, options) {
    let initialPct = Math.max(actualPct, Math.min(100, Number(options && options.initialGhostPct || actualPct) || actualPct));
    return { ghostPct: initialPct, lastPct: initialPct, lastAt: now, holdUntil: initialPct > actualPct + 0.05 ? now + runtime.state.PLAYER_HP_DAMAGE_GHOST_HOLD_MS : 0 };
  }
  function extendHpDamageGhostHold(runtime, state, actualPct, now, options) {
    let continuousDecay = !!(options && options.continuousDecay);
    if (actualPct < state.lastPct - 0.05) {
      let isAlreadyTrailing = state.ghostPct > actualPct + 0.05;
      state.ghostPct = Math.max(state.ghostPct, state.lastPct);
      if (!continuousDecay || !isAlreadyTrailing) {
        state.holdUntil = now + runtime.state.PLAYER_HP_DAMAGE_GHOST_HOLD_MS;
      }
    } else if (actualPct > state.ghostPct) {
      state.ghostPct = actualPct;
    }
  }

  // modules/ui/combat-hud-progress.mjs
  function syncMapProgressRow(runtime, zone) {
    const row = runtime.deps.document.getElementById("ui-map-progress-row");
    const speaks = !!zone && (runtime.state.MAP_PROGRESS_SPEAKING_TYPES.includes(zone.type) || zone.type === "outsideChaos" && !!runtime.deps.game.woodsmanEntrancePending);
    if (row) row.toggleAttribute("hidden", !!zone && (zone.type === "act" || !!zone.exploration) && !speaks);
  }
  function setCombatProgressGaugePercent(runtime, percent) {
    let bar = runtime.deps.document.getElementById("ui-move-bar");
    if (!bar) return;
    let safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    bar.style.width = `${safePercent}%`;
    if (bar.parentElement && bar.parentElement.style) {
      bar.parentElement.style.setProperty("--progress-fill", `${safePercent}%`);
    }
  }
  function getUiExperienceProgress(runtime, level, experience) {
    let required = Math.max(1, Number((0, runtime.deps.getExpReq)(level)) || 1);
    let current = Math.max(0, Number(experience) || 0);
    return {
      current,
      required,
      remaining: Math.max(0, Math.floor(required - current)),
      percent: Math.max(0, Math.min(100, current / required * 100))
    };
  }

  // modules/ui/combat-hud-effect-icons.mjs
  function getUiCombatEffectPresentation(runtime, key) {
    return runtime.state.UI_COMBAT_EFFECT_PRESENTATION[key] || { sprite: 48, label: String(key || "알 수 없는 효과"), color: "#d8d8d8" };
  }
  function renderCombatEffectIcon(runtime, options) {
    let visual = getUiCombatEffectPresentation(runtime, options.key);
    let label = options.label || visual.label;
    let safeKey = String(options.key || "unknown").replace(/[^a-zA-Z0-9_-]/g, "") || "unknown";
    let sprite = Math.max(0, Math.min(48, Math.floor(Number(visual.sprite) || 0)));
    let spriteX = (sprite % 7 / 6 * 100).toFixed(4);
    let spriteY = (Math.floor(sprite / 7) / 6 * 100).toFixed(4);
    let tooltip = options.tooltip || "";
    let tooltipAttrs = tooltip ? ` data-info-tooltip-anchor="1" onmouseenter="${tooltip}" onmousemove="${tooltip}" onmouseleave="hideInfoTooltip()"` : "";
    const { timedClass, remainingAngle, time } = combatEffectTiming(options);
    let badge = options.badge ? `<span class="combat-effect-badge">${(0, runtime.deps.escapeHTML)(options.badge)}</span>` : "";
    return `<span class="combat-effect-icon effect-${safeKey}${timedClass}" role="img" aria-label="${(0, runtime.deps.escapeHTML)(label)}" style="--effect-color:${visual.color};--effect-sprite-x:${spriteX}%;--effect-sprite-y:${spriteY}%;--effect-remaining-angle:${remainingAngle.toFixed(2)}deg;"${tooltipAttrs}><span class="combat-effect-art" aria-hidden="true"></span>${time}${badge}</span>`;
  }
  function getUiRuntimeEffectDetail(runtime, type, value, maxValue) {
    let formatter = runtime.state.UI_RUNTIME_EFFECT_DETAILS[type];
    return formatter ? formatter(value, maxValue) : "효과가 적용 중입니다.";
  }
  function getUiEffectRemainingSeconds(runtime, expiresAt, now) {
    return Math.ceil(Math.max(0, (Number(expiresAt || 0) - now) / 1e3));
  }
  function renderUiRuntimeEffectIcon(runtime, options, now) {
    let keyArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(options.key || "")));
    let value = Number(options.value || 0);
    let maxValue = Number(options.maxValue || 0);
    let remain = Number.isFinite(options.remainSec) ? Math.max(0, Math.ceil(options.remainSec)) : getUiEffectRemainingSeconds(runtime, options.expiresAt, now);
    let tooltip = `showPlayerRuntimeEffectTooltip(event,${keyArg},${value},${maxValue},${remain})`;
    return renderCombatEffectIcon(runtime, { key: options.key, label: options.label, tooltip, badge: options.badge || "", remainingSec: remain, durationSec: options.durationSec });
  }
  function renderUiNamedEffectIcon(runtime, options, now) {
    let keyArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(options.key || "")));
    let nameArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(options.name || "")));
    let detailArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(options.detail || "")));
    let remain = Number.isFinite(options.remainSec) ? Math.max(0, Math.ceil(options.remainSec)) : getUiEffectRemainingSeconds(runtime, options.expiresAt, now);
    let tooltip = `showPlayerNamedEffectTooltip(event,${keyArg},${nameArg},${detailArg},${remain})`;
    return renderCombatEffectIcon(runtime, { key: options.key, label: options.name, tooltip, badge: options.badge || "", remainingSec: remain, durationSec: options.durationSec });
  }
  function combatEffectTiming(options) {
    let remainingSec = Math.max(0, Number(options.remainingSec) || 0);
    let durationSec = Math.max(0, Number(options.durationSec) || 0);
    let timedClass = remainingSec > 0 ? " timed" : "";
    let remainingAngle = durationSec > 0 ? Math.max(0, Math.min(360, remainingSec / durationSec * 360)) : 360;
    let time = remainingSec > 0 ? `<span class="combat-effect-time">${remainingSec >= 100 ? "99+" : Math.ceil(remainingSec)}</span>` : "";
    return { timedClass, remainingAngle, time };
  }

  // modules/ui/combat-hud-effect-details.mjs
  function getUiRecoveryEffectSummary(runtime, instances, target) {
    let active = (Array.isArray(instances) ? instances : []).filter((row) => {
      if (!row || Number(row.remaining) <= 0 || Number(row.rate) <= 0) return false;
      return !target || (row.target === "energyShield" ? "energyShield" : "life") === target;
    });
    if (active.length === 0) return null;
    return active.reduce((summary, row) => {
      let remaining = Math.max(0, Number(row.remaining) || 0);
      let rate = Math.max(0, Number(row.rate) || 0);
      summary.remaining += remaining;
      summary.rate += rate;
      summary.remainSec = Math.max(summary.remainSec, rate > 0 ? remaining / rate : 0);
      return summary;
    }, { remaining: 0, rate: 0, remainSec: 0 });
  }
  function getUiEliteTraitBuffDetail(runtime, trait) {
    let source = trait && typeof trait === "object" ? trait : {};
    let parts = [];
    appendEliteMultiplierDetails(source, parts);
    if (Number(source.critChanceBonus)) parts.push(`치명타 확률 +${Number(source.critChanceBonus)}%p`);
    if (Number(source.dr)) parts.push(`피해 감소 +${Number(source.dr)}%`);
    let resistance = ["resF", "resC", "resL", "resChaos"].reduce((sum, stat) => sum + Math.max(0, Number(source[stat]) || 0), 0);
    if (resistance > 0) parts.push(`저항 보너스 합계 +${resistance}%`);
    if (Number(source.hitRateGuard)) parts.push(`회피 +${Math.round(Number(source.hitRateGuard) * 100)}%`);
    return parts.join(", ") || "훔친 정예 특성이 적용됩니다.";
  }
  function getConditionEffectTitle(runtime, name) {
    const id = String(name || "").replace(/^talisman:/, "");
    if (id === "resonance") return "함성 공명";
    const def = runtime.deps.talismans.conditionDef(id);
    return def ? def.name || { guard: "수호", warcry: "함성", curse: "저주" }[def.kind] : String(name || "");
  }
  function renderIncidentBreathIcon(runtime, now) {
    const breath = runtime.deps.game.incidentBreath, kind = Number(breath && breath.until) > now ? runtime.deps.combatIncidents.breathKind(breath) : null;
    return kind ? renderUiNamedEffectIcon(runtime, { key: "incidentBreath", name: kind.name, detail: kind.text, expiresAt: breath.until, durationSec: runtime.deps.ACT_EXPLORATION_INCIDENTS.breath.seconds }, now) : "";
  }
  function getUiLeechEffectDetail(runtime, summary, pStats, target) {
    let resource = target === "energyShield" ? "보호막" : "생명력";
    let remaining = Math.floor(summary.remaining || 0);
    let rate = Math.floor(summary.rate || 0);
    if (typeof runtime.deps.getLeechCaps !== "function") return (0, runtime.deps._t)("남은 {resource} 회복 {remaining}, 초당 {rate}", { resource, remaining, rate });
    let caps = (0, runtime.deps.getLeechCaps)(pStats, target);
    return (0, runtime.deps._t)("남은 {resource} 회복 {remaining} / 저장 한도 {floor}, 현재 초당 {rate}, 개별 초당 상한 {floor2}", { resource, remaining, floor: Math.floor(caps.totalCap), rate, floor2: Math.floor(caps.rateCap) });
  }
  function appendEliteMultiplierDetails(source, parts) {
    if (Number(source.atkMul) > 1) parts.push(`피해 +${Math.round((source.atkMul - 1) * 100)}%`);
    if (Number(source.attackSpeedVarMul) > 1) parts.push(`공격 속도 +${Math.round((source.attackSpeedVarMul - 1) * 100)}%`);
    if (Number(source.hpMul) > 1) parts.push(`최대 생명력 +${Math.round((source.hpMul - 1) * 100)}%`);
  }

  // modules/ui/combat-hud-player-effects.mjs
  function buildPlayerAilmentEffectIcons(runtime) {
    return (runtime.deps.game.playerAilments || []).filter((ail) => ail && (ail.time || 0) > 0).map((ail) => {
      let remain = Math.ceil(Math.max(0, ail.time || 0));
      let type = String(ail.type || "unknown");
      let typeArg = (0, runtime.deps.escapeHTML)(JSON.stringify(type));
      let visual = getUiCombatEffectPresentation(runtime, type);
      let stacks = Math.max(1, Math.floor(ail.stacks || 1));
      let tooltip = `showPlayerAilmentTooltip(event,${typeArg},${remain},${Number(ail.power || 0.1).toFixed(3)},${Math.floor((0, runtime.deps.getUiStoredAilmentHitDamage)(ail))})`;
      return renderCombatEffectIcon(runtime, { key: type, label: visual.label, tooltip, badge: stacks > 1 ? `${stacks}` : "", remainingSec: remain, durationSec: ail.duration });
    }).join("");
  }
  function buildPlayerConditionEffectIcons(runtime, now) {
    let icons = [];
    if (runtime.deps.game.woodsmanCurseActive) {
      let taken = Math.max(0, Math.floor(runtime.deps.game.woodsmanCurseDamageTakenStacks || 0)) * 0.01;
      let tooltip = `showPlayerRuntimeEffectTooltip(event,'woodsmanCurse',${taken.toFixed(2)},0,0)`;
      icons.push(renderCombatEffectIcon(runtime, { key: "woodsmanCurse", tooltip }));
    }
    runtime.deps.talismanCombat.active().forEach(({ buff }) => {
      let nameArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(buff.name || "")));
      let typeArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(buff.type || "buff")));
      let key = ["guard", "warcry"].includes(buff.type) ? buff.type : "buff";
      icons.push(renderCombatEffectIcon(runtime, { key, label: getConditionEffectTitle(runtime, buff.name), tooltip: `showPlayerBuffTooltip(event,${nameArg},${typeArg},0)` }));
    });
    (runtime.deps.game.cosmosPlayerDebuffs || []).filter((row) => row && (row.expiresAt || 0) > now).forEach((row) => {
      let remain = Math.ceil(Math.max(0, ((row.expiresAt || 0) - now) / 1e3));
      let type = String(row.type || "unknown");
      let typeArg = (0, runtime.deps.escapeHTML)(JSON.stringify(type));
      let labelArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(row.label || "")));
      let tooltip = `showPlayerCosmosDebuffTooltip(event,${typeArg},${Number(row.value || 0).toFixed(2)},${remain},${labelArg})`;
      icons.push(renderCombatEffectIcon(runtime, { key: type, label: row.label, tooltip, remainingSec: remain, durationSec: Number(row.durationMs) / 1e3 }));
    });
    return icons.join("");
  }
  function buildPlayerUniqueEffectIcons(runtime, pStats, now) {
    let icons = [];
    appendStoneShieldIcon(runtime, now, icons);
    appendUniqueGuardIcon(runtime, pStats, now, icons);
    appendStealthLeechIcons(runtime, pStats, now, icons);
    appendUniqueStackIcons(runtime, pStats, now, icons);
    appendUniqueReadyIcons(runtime, pStats, now, icons);
    return icons.join("");
  }
  function buildPlayerRecoveryEffectIcons(runtime, pStats) {
    let icons = [];
    let lifeLeech = getUiRecoveryEffectSummary(runtime, runtime.deps.game.playerLeechInstances, "life");
    let esLeech = getUiRecoveryEffectSummary(runtime, runtime.deps.game.playerLeechInstances, "energyShield");
    let recoup = getUiRecoveryEffectSummary(runtime, runtime.deps.game.playerRecoupInstances);
    if (lifeLeech) icons.push(renderUiNamedEffectIcon(runtime, { key: "lifeLeech", name: "생명력 흡혈", detail: getUiLeechEffectDetail(runtime, lifeLeech, pStats, "life"), remainSec: lifeLeech.remainSec }, 0));
    if (esLeech) icons.push(renderUiNamedEffectIcon(runtime, { key: "energyShieldLeech", name: "에너지 보호막 흡혈", detail: getUiLeechEffectDetail(runtime, esLeech, pStats, "energyShield"), remainSec: esLeech.remainSec }, 0));
    if (recoup) icons.push(renderUiRuntimeEffectIcon(runtime, { key: "lifeRecoup", value: recoup.remaining, maxValue: recoup.rate, remainSec: recoup.remainSec }, 0));
    if (Number(runtime.deps.game.delayedGuardHealPool) >= 1) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "delayedGuardHeal", value: runtime.deps.game.delayedGuardHealPool }, 0));
    }
    return icons.join("");
  }
  function appendUniqueReadyIcons(runtime, pStats, now, icons) {
    if (pStats.uniqueRiderCompass && Number(runtime.deps.game.lastMoveEndedAt) > 0 && !runtime.deps.game.uniqueRiderCompassConsumed) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "riderCompassReady" }, now));
    }
    icons.push(renderIncidentBreathIcon(runtime, now));
    let elite = runtime.deps.game.uniqueEliteTraitBuff;
    if (elite && Number(elite.expiresAt) > now) {
      icons.push(renderUiNamedEffectIcon(runtime, { key: "eliteTraitBuff", name: (elite.trait || {}).name || "무한한 허기", detail: getUiEliteTraitBuffDetail(runtime, elite.trait), expiresAt: elite.expiresAt }, now));
    }
  }
  function appendUniqueStackIcons(runtime, pStats, now, icons) {
    let armorAmp = pStats.uniqueMeleeArmorAmp;
    let armorStacks = Math.max(0, Math.floor(Number(runtime.deps.game.uniqueMeleeArmorAmpStacks) || 0));
    if (armorAmp && armorStacks > 0 && Number(runtime.deps.game.uniqueMeleeArmorAmpExpiresAt) > now) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "meleeArmorAmp", value: armorStacks, maxValue: armorAmp.ampPct, expiresAt: runtime.deps.game.uniqueMeleeArmorAmpExpiresAt, badge: `${armorStacks}` }, now));
    }
    let moveState = runtime.deps.game.uniqueKillMoveStacksState;
    if (pStats.uniqueKillMoveStacks && moveState && Number(moveState.stacks) > 0 && Number(moveState.expiresAt) > now) {
      let stacks = Math.floor(moveState.stacks);
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "killMoveStacks", value: stacks, maxValue: pStats.uniqueKillMoveStacks.movePerStack, expiresAt: moveState.expiresAt, badge: `${stacks}` }, now));
    }
  }
  function appendStealthLeechIcons(runtime, pStats, now, icons) {
    let stealth = pStats.uniqueDeflectStealth;
    if (stealth && Number(runtime.deps.game.shadowStealthExpiresAt) > now) {
      let detail = (0, runtime.deps._t)("이동 속도 +{move}%, 회피 +{evasionPct}%, 치명타 피해 +{critDmg}%", { move: Number(stealth.move || 20), evasionPct: Number(stealth.evasionPct || 20), critDmg: Number(stealth.critDmg || 20) });
      icons.push(renderUiNamedEffectIcon(runtime, { key: "shadowStealth", name: "그림자 은신", detail, expiresAt: runtime.deps.game.shadowStealthExpiresAt }, now));
    }
    let leech = pStats.uniqueLeechEfficiencyOnKill;
    if (leech && Number(runtime.deps.game.uniqueLeechEfficiencyUntil) > now) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "leechEfficiency", value: leech.efficiencyPct, expiresAt: runtime.deps.game.uniqueLeechEfficiencyUntil }, now));
    }
  }
  function appendUniqueGuardIcon(runtime, pStats, now, icons) {
    let guard = runtime.deps.game.playerUniqueGuard;
    if (guard && Number(guard.amount) > 0 && Number(guard.expiresAt) > now) {
      let hpPct = Number((pStats.uniqueDragonVeinGuard || {}).hpPct || 8);
      let maximum = Math.max(Number(guard.amount) || 0, Math.floor(Number(pStats.maxHp || 0) * hpPct / 100));
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "playerUniqueGuard", value: guard.amount, maxValue: maximum, expiresAt: guard.expiresAt }, now));
    }
  }
  function appendStoneShieldIcon(runtime, now, icons) {
    let talentRuntime = runtime.deps.game.talentCardRuntime;
    if (talentRuntime && Number(talentRuntime.stoneShieldAmount) > 0 && Number(talentRuntime.stoneShieldExpiresAt) > now) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "stoneShield", value: talentRuntime.stoneShieldAmount, maxValue: talentRuntime.stoneShieldMax, expiresAt: talentRuntime.stoneShieldExpiresAt }, now));
    }
  }

  // modules/ui/combat-hud-ascend-effects.mjs
  function buildPlayerAscendStackEffectIcons(runtime, now) {
    let icons = [];
    let owns = (id) => typeof runtime.deps.hasKeystone === "function" && (0, runtime.deps.hasKeystone)(id);
    appendWarriorRhythmIcon(runtime, now, icons, owns);
    appendGladiatorStackIcons(runtime, now, icons, owns);
    appendElementalGuardStackIcons(runtime, now, icons, owns);
    return icons.join("");
  }
  function buildPlayerAscendReadyEffectIcons(runtime, now) {
    let icons = [];
    let owns = (id) => typeof runtime.deps.hasKeystone === "function" && (0, runtime.deps.hasKeystone)(id);
    appendSwiftReadyIcon(runtime, now, icons, owns);
    if (owns("a2") && runtime.deps.game.assassinBlurred) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "assassinBlurred" }, now));
    }
    if (owns("ct4") && runtime.deps.game.catalystEvadeBoostReady) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "catalystEvade" }, now));
    }
    if (owns("cr8") && Number(runtime.deps.game.crusaderLightningAegisUntil) > now) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "crusaderLightningAegis", expiresAt: runtime.deps.game.crusaderLightningAegisUntil }, now));
    }
    return icons.join("");
  }
  function buildPlayerTalentAndSummonEffectIcons(runtime, now) {
    let icons = [];
    appendTalentChargeIcons(runtime, now, icons);
    if (Number(runtime.deps.game.bloomTrialRegenSuppress) > 0) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "bloomRegenSuppress", value: runtime.deps.game.bloomTrialRegenSuppress * 100 }, now));
    }
    appendBeeSwarmIcon(runtime, now, icons);
    appendSummonBuffIcons(runtime, now, icons);
    return icons.join("");
  }
  function appendElementalGuardStackIcons(runtime, now, icons, owns) {
    if (owns("e8") && Number(runtime.deps.game.elementalistOverloadStacks) > 0) {
      let stacks = Math.floor(runtime.deps.game.elementalistOverloadStacks);
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "elementalistOverload", value: stacks, badge: `${stacks}` }, now));
    }
    if (owns("gd6") && Number(runtime.deps.game.guardianEnduranceExpiresAt) > now) {
      let stacks = Math.min(5, Math.floor(runtime.deps.game.guardianEnduranceStacks || 0));
      if (stacks > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: "guardianEndurance", value: stacks, expiresAt: runtime.deps.game.guardianEnduranceExpiresAt, badge: `${stacks}` }, now));
    }
  }
  function appendGladiatorStackIcons(runtime, now, icons, owns) {
    if (owns("g2") && Number(runtime.deps.game.gladiatorFlurryExpiresAt) > now) {
      let stacks = Math.min(12, Math.floor(runtime.deps.game.gladiatorFlurryStacks || 0));
      if (stacks > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: "gladiatorFlurry", value: stacks, expiresAt: runtime.deps.game.gladiatorFlurryExpiresAt, badge: `${stacks}` }, now));
    }
    if (owns("g3") && Number(runtime.deps.game.gladiatorVeteranCritBonus) > 0) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "gladiatorVeteran", value: runtime.deps.game.gladiatorVeteranCritBonus, badge: `${Math.floor(runtime.deps.game.gladiatorVeteranCritBonus)}` }, now));
    }
  }
  function appendWarriorRhythmIcon(runtime, now, icons, owns) {
    if (owns("w2")) {
      let crit = Number(runtime.deps.game.warriorRhythmExpiresAt) > now ? Math.min(5, Math.floor(runtime.deps.game.warriorRhythmStacks || 0)) : 0;
      let chain = Number(runtime.deps.game.warriorRhythmDoubleExpiresAt) > now ? Math.min(5, Math.floor(runtime.deps.game.warriorRhythmDoubleStacks || 0)) : 0;
      if (crit + chain > 0) {
        let expiresAt = Math.max(Number(runtime.deps.game.warriorRhythmExpiresAt) || 0, Number(runtime.deps.game.warriorRhythmDoubleExpiresAt) || 0);
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: "warriorRhythm", value: crit, maxValue: chain, expiresAt, badge: `${crit + chain}` }, now));
      }
    }
  }
  function appendSwiftReadyIcon(runtime, now, icons, owns) {
    if (owns("g5") && (runtime.deps.game.gladiatorSwiftOpeningReady || runtime.deps.game.gladiatorSwiftGuardReady)) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "gladiatorSwift", value: runtime.deps.game.gladiatorSwiftOpeningReady ? 1 : 0, maxValue: runtime.deps.game.gladiatorSwiftGuardReady ? 1 : 0 }, now));
    }
  }
  function appendSummonBuffIcons(runtime, now, icons) {
    if (Number(runtime.deps.game.summonDeathDamageBuffExpiresAt) > now && Number(runtime.deps.game.summonDeathDamageBuffPct) > 0) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "summonDeathDamageBuff", value: runtime.deps.game.summonDeathDamageBuffPct, expiresAt: runtime.deps.game.summonDeathDamageBuffExpiresAt }, now));
    }
    if (Number(runtime.deps.game.summonCritAspdExpiresAt) > now && Number(runtime.deps.game.summonCritAspdStacks) > 0) {
      let stacks = Math.floor(runtime.deps.game.summonCritAspdStacks);
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "summonCritAspd", value: stacks, maxValue: runtime.deps.game.summonCritAspdPerStack, expiresAt: runtime.deps.game.summonCritAspdExpiresAt, badge: `${stacks}` }, now));
    }
  }
  function appendBeeSwarmIcon(runtime, now, icons) {
    let bees = (Array.isArray(runtime.deps.game.queenBees) ? runtime.deps.game.queenBees : []).filter((bee) => bee && Number(bee.expiresAt) > now && Number(bee.attacksLeft) > 0);
    if (bees.length > 0) {
      let attacksLeft = bees.reduce((sum, bee) => sum + Math.floor(bee.attacksLeft), 0);
      let expiresAt = Math.max(...bees.map((bee) => Number(bee.expiresAt) || 0));
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "queenBeeSwarm", value: bees.length, maxValue: attacksLeft, expiresAt, badge: `${bees.length}` }, now));
    }
  }
  function appendTalentChargeIcons(runtime, now, icons) {
    let talent = runtime.deps.game.talentRuntime && typeof runtime.deps.game.talentRuntime === "object" ? runtime.deps.game.talentRuntime : {};
    let talentActive = (id) => typeof runtime.deps.isTalentCardActive !== "function" || (0, runtime.deps.isTalentCardActive)(id);
    let fletcherCount = Math.max(0, Math.min(3, Math.floor(talent.fletcherCount || 0)));
    if (talentActive("hero1__gladiator") && fletcherCount > 0) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "fletcherCharge", value: fletcherCount, badge: `${fletcherCount}` }, now));
    }
    if (talentActive("hero2__gladiator") && talent.colosseumReady) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "colosseumReady" }, now));
    } else if (talentActive("hero2__gladiator") && Number(talent.colosseumKills) > 0) {
      let kills = Math.min(4, Math.floor(talent.colosseumKills));
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "colosseumCharge", value: kills, badge: `${kills}` }, now));
    }
  }

  // modules/ui/combat-hud-realm-effects.mjs
  function buildPlayerRealmEffectIcons(runtime, pStats, now) {
    let icons = [];
    appendRealmDeathWardIcon(runtime, pStats, icons);
    if ((runtime.deps.game.realmInvulnerableBarrierUntil || 0) > now) {
      let remain = Math.ceil((runtime.deps.game.realmInvulnerableBarrierUntil - now) / 1e3);
      icons.push(renderCombatEffectIcon(runtime, { key: "invulnerableBarrier", tooltip: `showPlayerRuntimeEffectTooltip(event,'invulnerableBarrier',0,0,${remain})`, remainingSec: remain, durationSec: 1.5 }));
    }
    if (typeof runtime.deps.hasKeystone === "function" && (0, runtime.deps.hasKeystone)("w5")) {
      let stacks = typeof runtime.deps.getWarriorRageStacks === "function" ? (0, runtime.deps.getWarriorRageStacks)(now) : 0;
      if (stacks > 0) {
        let remain = Math.ceil(Math.max(0, (runtime.deps.game.warriorRageExpiresAt - now) / 1e3));
        icons.push(renderCombatEffectIcon(runtime, { key: "warriorRage", tooltip: `showPlayerRuntimeEffectTooltip(event,'warriorRage',${stacks},5,${remain})`, badge: `${stacks}`, remainingSec: remain, durationSec: 5 }));
      }
    }
    return icons.join("");
  }
  function buildPlayerCombatEffectIcons(runtime, pStats, now) {
    return buildPlayerAilmentEffectIcons(runtime) + buildPlayerConditionEffectIcons(runtime, now) + buildPlayerUniqueEffectIcons(runtime, pStats, now) + buildPlayerRecoveryEffectIcons(runtime, pStats) + buildPlayerAscendStackEffectIcons(runtime, now) + buildPlayerAscendReadyEffectIcons(runtime, now) + buildPlayerTalentAndSummonEffectIcons(runtime, now) + buildPlayerRealmEffectIcons(runtime, pStats, now);
  }
  function appendRealmDeathWardIcon(runtime, pStats, icons) {
    if (pStats.uniqueDeathWard && runtime.deps.game.realmDeathWard && Number(runtime.deps.game.realmDeathWard.amount) > 0) {
      let amount = Math.max(0, Math.floor(Number(runtime.deps.game.realmDeathWard.amount) || 0));
      let maximum = Math.max(amount, Math.floor(Number(runtime.deps.game.realmDeathWard.maxAmount) || 0));
      icons.push(renderCombatEffectIcon(runtime, { key: "deathWard", tooltip: `showPlayerRuntimeEffectTooltip(event,'deathWard',${amount},${maximum},0)` }));
    }
  }

  // modules/ui/combat-hud-effect-strip.mjs
  function patchCombatEffectStrip(runtime, host, markup) {
    if (!host || host.__lastHtml === markup) return;
    host.__lastHtml = markup;
    const parsed = runtime.deps.document.createElement("template");
    parsed.innerHTML = markup;
    if (!parsed.content || !host.children) {
      host.innerHTML = markup;
      return;
    }
    const fresh = [...parsed.content.children], live = [...host.children];
    if (fresh.length === live.length && fresh.every((node, index) => sameEffectShape(runtime, node, live[index]))) {
      fresh.forEach((node, index) => syncEffectNode(runtime, live[index], node));
    } else host.innerHTML = markup;
  }
  function sameEffectShape(runtime, fresh, live) {
    const pairs = [[fresh, live]];
    while (pairs.length) {
      const [a, b] = pairs.pop();
      if (a.tagName !== b.tagName || a.className !== b.className || a.children.length !== b.children.length) return false;
      for (let index = 0; index < a.children.length; index++) pairs.push([a.children[index], b.children[index]]);
    }
    return true;
  }
  function syncEffectNode(runtime, live, fresh) {
    const pairs = [[live, fresh]];
    while (pairs.length) {
      const [to, from] = pairs.pop();
      for (const { name, value } of from.attributes) if (to.getAttribute(name) !== value) to.setAttribute(name, value);
      if (from.children.length) for (let index = 0; index < from.children.length; index++) pairs.push([to.children[index], from.children[index]]);
      else if (to.textContent !== from.textContent) to.textContent = from.textContent;
    }
  }
  function updatePlayerCombatEffectHud(runtime, pStats, hpAilBar) {
    let markup = buildPlayerCombatEffectIcons(runtime, pStats, (0, runtime.deps.getCombatTime)());
    patchCombatEffectStrip(runtime, runtime.deps.document.getElementById("ui-player-ailments-under"), markup);
    let projectedDamage = (runtime.deps.game.playerAilments || []).reduce((sum, ail) => {
      if (!ail || (ail.time || 0) <= 0 || !(0, runtime.deps.isUiDamageAilmentType)(ail.type)) return sum;
      return sum + Math.floor((0, runtime.deps.getUiPlayerDamageAilmentDps)(ail, pStats) * Math.max(0, ail.time || 0));
    }, 0);
    let playerHpPct = Math.max(0, Math.min(100, runtime.deps.game.playerHp / Math.max(1, pStats.maxHp) * 100));
    let pendingPct = Math.max(0, Math.min(playerHpPct, projectedDamage / Math.max(1, pStats.maxHp) * 100));
    if (!hpAilBar) return;
    hpAilBar.style.width = `${pendingPct}%`;
    hpAilBar.style.left = "auto";
    hpAilBar.style.right = `${Math.max(0, 100 - playerHpPct)}%`;
    hpAilBar.style.display = pendingPct > 0.05 ? "block" : "none";
  }

  // modules/ui/combat-hud-level.mjs
  function markPlayerEnergyShieldRow(runtime, hpTrack, hasEnergyShield) {
    let frame = hpTrack && hpTrack.closest && hpTrack.closest(".player-health-frame");
    if (frame) frame.toggleAttribute("data-energy-shield", hasEnergyShield);
  }
  function showHudLevel(runtime, level) {
    setTextById(runtime, "ui-exp-level-label", `Lv.${level}`);
    const previous = runtime.state.hudShownLevel;
    runtime.state.hudShownLevel = level;
    if (!previous || level <= previous || runtime.deps.game.isBackgroundCalculation) return;
    playLevelUpCallout(runtime, level);
  }
  function playLevelUpCallout(runtime, level) {
    const orb = runtime.deps.document.querySelector("#battle-column .combat-exp-bar");
    if (!orb || typeof orb.animate !== "function") return;
    let label = orb.querySelector(".level-up-callout");
    if (!label) {
      label = runtime.deps.document.createElement("span");
      label.className = "level-up-callout";
      label.setAttribute("aria-hidden", "true");
      orb.appendChild(label);
    }
    label.textContent = (0, runtime.deps._t)("레벨 업 Lv {level}", { level });
    if (runtime.levelAnimation) runtime.levelAnimation.cancel();
    label.getAnimations().forEach((animation) => animation.cancel());
    runtime.levelAnimation = label.animate([
      { opacity: 0, translate: "0 6px" },
      { opacity: 1, translate: "0 0", offset: 0.1 },
      { opacity: 1, translate: "0 0", offset: 0.8 },
      { opacity: 0, translate: "0 -6px" }
    ], { duration: 2e3, easing: "steps(20, end)", fill: "forwards" });
  }

  // modules/ui/combat-hud-enemy-effects.mjs
  function buildEnemyCombatEffectIcons(runtime, activeAilments, enemyDebuffs, now, enemy) {
    let ailmentIcons = (activeAilments || []).filter((ail) => ail && (ail.time || 0) > 0).map((ail) => {
      let remain = Math.ceil(Math.max(0, ail.time || 0));
      let type = String(ail.type || "unknown");
      let stacks = type === "assassinWeakness" ? Math.max(1, Math.floor(ail.power || 1)) : Math.max(1, Math.floor(ail.stacks || 1));
      let badge = stacks > 1 ? `${stacks}` : "";
      let tooltipPayload = enemyAilmentPayload(runtime, ail, { type, remain, stacks });
      let tooltip = `showEnemyAilmentTooltip(event,${(0, runtime.deps.escapeHTML)(JSON.stringify(tooltipPayload))})`;
      return renderCombatEffectIcon(runtime, { key: type, tooltip, badge, remainingSec: remain, durationSec: ail.duration });
    });
    let curseIcons = (enemyDebuffs || []).filter((row) => row && (row.expiresAt || 0) > now).map((row) => {
      let remain = Math.ceil(Math.max(0, ((row.expiresAt || 0) - now) / 1e3));
      let nameArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(row.name || "")));
      let tooltip = `showPlayerBuffTooltip(event,${nameArg},'curse',${remain})`;
      return renderCombatEffectIcon(runtime, { key: "curse", label: getConditionEffectTitle(runtime, row.name), tooltip, remainingSec: remain, durationSec: Number(row.durationMs) / 1e3 });
    });
    return ailmentIcons.concat(curseIcons).join("") + buildEnemyRuntimeEffectIcons(runtime, enemy, now);
  }
  function buildEnemyRuntimeEffectIcons(runtime, enemy, now) {
    if (!enemy || enemy.id == null) return "";
    let icons = [];
    let id = enemy.id;
    appendEnemySkillDotIcon(runtime, enemy, now, icons);
    appendEnemyChaosIcons(runtime, id, now, icons);
    appendEnemyElementalJudgmentIcons(runtime, id, now, icons);
    appendEnemyHitMarkIcons(runtime, id, now, icons);
    if (Number(enemy.chaosErosionShred) > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: "chaosErosion", value: enemy.chaosErosionShred }, now));
    if (Number(enemy.regenSuppressPct) > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: "regenSuppress", value: enemy.regenSuppressPct }, now));
    return icons.join("");
  }
  function appendEnemyHitMarkIcons(runtime, id, now, icons) {
    let butcherHits = Math.max(0, Math.floor(Number(((runtime.deps.game.talentButcherMarks || {})[id] || {}).hits) || 0));
    if (butcherHits > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: "talentButcherMark", value: butcherHits, badge: `${butcherHits}` }, now));
    let weakpointHits = Math.max(0, Math.floor(Number(((runtime.deps.game.rangerWeakpointMarks || {})[id] || {}).hits) || 0));
    if (weakpointHits > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: "rangerWeakpointMark", value: weakpointHits, badge: `${weakpointHits}` }, now));
  }
  function appendEnemyElementalJudgmentIcons(runtime, id, now, icons) {
    let elementalRow = (runtime.deps.game.enemyUniqueElementalResDown || {})[id];
    if (elementalRow && Number(elementalRow.stacks) > 0) {
      let stacks = Math.floor(elementalRow.stacks);
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "enemyElementalResDown", value: stacks, maxValue: elementalRow.perHit, badge: `${stacks}` }, now));
    }
    let judgment = (runtime.deps.game.talentInquisitorMarks || {})[id];
    if (judgment && Number(judgment.accumulated) > 0 && Number(judgment.explodeAt) > now) {
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "talentInquisitorMark", value: judgment.accumulated, expiresAt: judgment.explodeAt }, now));
    }
  }
  function appendEnemyChaosIcons(runtime, id, now, icons) {
    let witherStacks = Math.max(0, Math.floor(Number((runtime.deps.game.enemyWitherStacks || {})[id]) || 0));
    if (witherStacks > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: "enemyWither", value: witherStacks, badge: `${witherStacks}` }, now));
    let chaosRow = (runtime.deps.game.enemyUniqueChaosResDown || {})[id];
    if (chaosRow && Number(chaosRow.stacks) > 0) {
      let stacks = Math.floor(chaosRow.stacks);
      icons.push(renderUiRuntimeEffectIcon(runtime, { key: "enemyChaosResDown", value: stacks, maxValue: chaosRow.perHit, badge: `${stacks}` }, now));
    }
  }
  function appendEnemySkillDotIcon(runtime, enemy, now, icons) {
    let dot = enemy.dotState && typeof enemy.dotState === "object" ? enemy.dotState : null;
    if (dot && Number(dot.timeLeft) > 0 && dot.skillName !== "화염 부패") {
      const { stacks, name, detail } = enemySkillDotLabel(runtime, enemy, dot);
      icons.push(renderUiNamedEffectIcon(runtime, { key: "enemySkillDot", name, detail, remainSec: dot.timeLeft, badge: `${stacks}` }, now));
    }
  }
  function enemyAilmentPayload(runtime, ail, display) {
    return {
      type: display.type,
      timeLeft: display.remain,
      power: Number(ail.power || 0),
      sourceHitDamage: Math.floor((0, runtime.deps.getUiStoredAilmentHitDamage)(ail)),
      specialDps: Math.floor(ail.flameDecayDps || 0),
      critDotBonusPct: Number(ail.critDotBonusPct || 0),
      stacks: display.stacks,
      rawTickDamage: Math.floor(ail.rawTickDamage || 0),
      tickInterval: Number(ail.tickInterval || 0),
      enemyRes: Number(ail.enemyRes || 0),
      abyssPlayerMul: Number(ail.abyssPlayerMul || 1),
      igniteTakenMultiplier: Number(ail.igniteTakenMultiplier || 1)
    };
  }
  function enemySkillDotLabel(runtime, enemy, dot) {
    let stacks = Math.max(1, Math.floor(Number(dot.stacks) || Number(enemy.dotStacks) || 1));
    let slow = Math.max(0, Number(enemy.skillSlowPct) || 0);
    let name = dot.skillName && dot.skillName !== "dot" ? dot.skillName : "지속 피해";
    let detail = `${stacks}중첩, 틱 피해 ${Math.floor(Number(dot.rawTickDamage) || 0)}${slow > 0 ? (0, runtime.deps._t)(", 둔화 {slow}%", { slow: slow.toFixed(0) }) : ""}`;
    return { stacks, name, detail };
  }

  // modules/ui/combat-hud-update.mjs
  function updateCombatUI(runtime, pStats) {
    pStats = (0, runtime.deps.normalizeUiPlayerStats)(pStats, runtime.deps.cachedTooltipStats || {});
    if (pStats.__uiFallbackStats) pStats.maxHp = Math.max(pStats.maxHp, Math.max(1, Number(runtime.deps.game.playerHp) || 1));
    if (pStats && pStats.breakdowns && !pStats.__uiFallbackStats) runtime.deps.cachedTooltipStats = pStats;
    const { hpBar, hpPct } = updatePlayerLifeGauge(runtime, pStats);
    renderCombatSkillHud(runtime);
    const { hpWrap, hpAilBar } = updatePlayerLifeOverlays(runtime, hpBar, hpPct);
    updatePlayerShieldGauge(runtime, pStats, hpWrap);
    updatePlayerExperienceGauge(runtime);
    updatePlayerCombatEffectHud(runtime, pStats, hpAilBar);
    updatePlayerFieldBars(runtime, pStats);
    const zone = updateCombatLocation(runtime);
    updateCombatRegionProgress(runtime, zone);
    runtime.deps.sideEncounterUi.updateHud(zone);
    syncMapProgressRow(runtime, zone);
    runtime.deps.atlasUi.updateHud(zone);
    if ((0, runtime.deps.getRenderingUiTabIds)().has("tab-character")) (0, runtime.deps.renderCharacterStats)(pStats);
    updateEnemyCombatHud(runtime, pStats, zone);
    runtime.handlers.showEnemyTraitTooltip.sync();
  }
  function updateEnemyCombatHud(runtime, pStats, zone) {
    let enemies = (runtime.deps.game.enemies || []).filter((enemy) => enemy && (enemy.hp || 0) > 0);
    pruneEnemyHpDamageGhostStates(runtime, enemies.map((enemy) => enemy.id));
    let targetIds = (0, runtime.deps.getUiSkillTargets)(pStats).map((hit) => hit.enemy && hit.enemy.id).filter(Boolean);
    let bossEnemy = enemies.find((enemy) => enemy.isBoss || enemy.bossPhase);
    let focusedEnemy = bossEnemy || enemies.find((enemy) => targetIds.includes(enemy.id)) || enemies[0] || null;
    let enemyListEl = runtime.deps.document.getElementById("ui-enemy-list");
    if (!focusedEnemy) {
      enemyListEl.hidden = !!runtime.deps.woodsmanBattle.introduction();
      if (enemyListEl.dataset.enemyId !== "") {
        releaseCombatHudTrait(runtime);
        enemyListEl.dataset.enemyId = "";
        enemyListEl.innerHTML = `<div class="enemy-empty">${(0, runtime.deps._t)("현재 조준 중인 적이 없습니다.")}</div>`;
      }
    } else {
      updateFocusedCombatEnemy(runtime, pStats, zone, focusedEnemy, enemyListEl);
    }
  }
  function updateCombatRegionProgress(runtime, zone) {
    let pendingWoodsmanEntrance = !!runtime.deps.game.woodsmanEntrancePending && zone && zone.type === "outsideChaos";
    if (pendingWoodsmanEntrance) {
      updateWoodsmanEntranceProgress(runtime);
    } else if (runtime.deps.game.moveTimer > 0) {
      updateRoomMoveProgress(runtime);
    } else if (zone && zone.type === "oceanDepth") {
      updateOceanDepthProgress(runtime);
    } else if ((0, runtime.deps.getUiCrowdProgressPaused)()) {
      setTextById(runtime, "ui-progress-label", "적 정리 중");
      setTextById(runtime, "ui-move-time-text", `${runtime.deps.game.runProgress.toFixed(0)}%`);
      setCombatProgressGaugePercent(runtime, runtime.deps.game.runProgress);
    } else {
      setTextById(runtime, "ui-progress-label", "진행도");
      setTextById(runtime, "ui-move-time-text", `${runtime.deps.game.runProgress.toFixed(0)}%`);
      setCombatProgressGaugePercent(runtime, runtime.deps.game.runProgress);
    }
  }
  function updateCombatLocation(runtime) {
    let zone = (0, runtime.deps.getZone)(runtime.deps.game.currentZoneId);
    let storyAct = zone.type === "act" ? (0, runtime.deps.getStoryActByZoneId)(zone.id) : null;
    let compactZoneText = storyAct ? `${(0, runtime.deps.formatStoryActLabel)(storyAct)}: ${(0, runtime.deps._t)(storyAct.title)}` : (0, runtime.deps._t)(zone.name);
    setTextById(runtime, "ui-combat-zone", compactZoneText);
    setTextById(runtime, "ui-combat-zone-inline", compactZoneText);
    runtime.deps.cosmosRouteUi.updateHud();
    setTextById(runtime, "btn-combat-return", runtime.deps.sideEncounterUi.returnLabel(zone));
    return zone;
  }
  function updatePlayerFieldBars(runtime, pStats) {
    let hpCombatBar = runtime.deps.document.getElementById("ui-player-hp-combat");
    if (hpCombatBar) hpCombatBar.style.width = `${Math.max(0, Math.min(100, runtime.deps.game.playerHp / Math.max(1, pStats.maxHp) * 100))}%`;
    let esCombatBar = runtime.deps.document.getElementById("ui-player-es-combat");
    if (esCombatBar) {
      let pct = (pStats.energyShield || 0) > 0 ? Math.max(0, Math.min(100, (runtime.deps.game.playerEnergyShield || 0) / pStats.energyShield * 100)) : 0;
      esCombatBar.style.width = `${pct}%`;
      esCombatBar.style.display = (pStats.energyShield || 0) > 0 ? "block" : "none";
    }
  }
  function updatePlayerExperienceGauge(runtime) {
    let expProgress = getUiExperienceProgress(runtime, runtime.deps.game.level, runtime.deps.game.exp);
    setTextById(runtime, "ui-exp", formatSettingNumber(runtime, expProgress.current, "showExpComma"));
    setTextById(runtime, "ui-maxexp", formatSettingNumber(runtime, expProgress.required, "showExpComma"));
    let expPct = expProgress.percent;
    setUiImageGaugePercent(runtime, runtime.deps.document.getElementById("ui-exp-bar"), expPct);
    renderHudIdentity(runtime);
    showHudLevel(runtime, runtime.deps.game.level);
    setTextById(runtime, "ui-exp-note", `${expPct.toFixed(1)}%`);
  }
  function updatePlayerShieldGauge(runtime, pStats, hpWrap) {
    let hasEnergyShield = (pStats.energyShield || 0) > 0;
    let esPct = hasEnergyShield ? Math.max(0, Math.min(100, (runtime.deps.game.playerEnergyShield || 0) / pStats.energyShield * 100)) : 0;
    markPlayerEnergyShieldRow(runtime, hpWrap, hasEnergyShield);
    renderEnergyShieldInline(runtime, runtime.deps.document.getElementById("ui-es-inline"), hasEnergyShield, runtime.deps.game.playerEnergyShield, pStats.energyShield);
    let esBar = runtime.deps.document.getElementById("ui-es-bar");
    if (!esBar) {
      let esWrap = runtime.deps.document.getElementById("ui-es-track") || hpWrap;
      esBar = runtime.deps.document.createElement("div");
      esBar.id = "ui-es-bar";
      esBar.className = "hp-bar-fill player-es";
      esBar.style.backgroundColor = "#55c1ff";
      esBar.style.opacity = "0.75";
      esBar.style.position = "absolute";
      esBar.style.left = "0";
      esBar.style.top = "0";
      esBar.style.zIndex = "5";
      esWrap.insertBefore(esBar, esWrap.firstChild);
    }
    esBar.style.zIndex = "5";
    setUiImageGaugePercent(runtime, esBar, esPct);
    esBar.style.display = hasEnergyShield ? "block" : "none";
  }
  function updatePlayerLifeOverlays(runtime, hpBar, hpPct) {
    let hpWrap = hpBar.parentElement;
    let hpGhostBar = runtime.deps.document.getElementById("ui-hp-damage-ghost-bar");
    if (!hpGhostBar && hpWrap) {
      hpGhostBar = runtime.deps.document.createElement("div");
      hpGhostBar.id = "ui-hp-damage-ghost-bar";
      hpGhostBar.className = "hp-bar-fill player-damage-ghost";
      hpWrap.insertBefore(hpGhostBar, hpBar);
    }
    if (hpGhostBar) {
      let ghostPct = updatePlayerHpDamageGhost(runtime, hpPct);
      hpGhostBar.style.width = `${ghostPct}%`;
      hpGhostBar.style.display = ghostPct > hpPct + 0.2 ? "block" : "none";
    }
    let hpAilBar = runtime.deps.document.getElementById("ui-hp-ailment-bar");
    if (!hpAilBar && hpWrap) {
      hpAilBar = runtime.deps.document.createElement("div");
      hpAilBar.id = "ui-hp-ailment-bar";
      hpAilBar.className = "hp-bar-fill player-ailment-pending";
      hpWrap.insertBefore(hpAilBar, hpBar);
    }
    return { hpWrap, hpAilBar };
  }
  function updatePlayerLifeGauge(runtime, pStats) {
    let safeHp = Math.max(0, Number(runtime.deps.game.playerHp) || 0);
    let shownHp = Math.max(0, Math.min(Math.ceil(safeHp - 1e-6), Math.floor(Number(pStats.maxHp) || 0)));
    setTextById(runtime, "ui-hp", formatSettingNumber(runtime, shownHp, "showHpComma"));
    setTextById(runtime, "ui-maxhp", formatSettingNumber(runtime, pStats.maxHp, "showHpComma"));
    let hpPct = Math.max(0, Math.min(100, runtime.deps.game.playerHp / Math.max(1, pStats.maxHp) * 100));
    let hpBar = runtime.deps.document.getElementById("ui-hp-bar");
    setUiImageGaugePercent(runtime, hpBar, hpPct);
    hpBar.classList.toggle("player-danger", hpPct > 0 && hpPct <= 25);
    return { hpBar, hpPct };
  }
  function updateFocusedCombatEnemy(runtime, pStats, zone, focusedEnemy, enemyListEl) {
    let pct = Math.max(0, focusedEnemy.hp / focusedEnemy.maxHp * 100);
    const tags = combatEnemyTags(runtime, focusedEnemy);
    const { effectMarkup, projectedAilmentDamage } = combatEnemyEffects(runtime, focusedEnemy, pStats);
    const { pendingPct, pendingStartPct, ghostTrailPct, ghostDisplay } = combatEnemyHealthTrail(runtime, focusedEnemy, pct, projectedAilmentDamage);
    const enemyHudTier = ensureCombatEnemyCard(runtime, enemyListEl, focusedEnemy);
    let nameEl = enemyListEl.querySelector(".enemy-name");
    let ghostEl = enemyListEl.querySelector(".enemy-damage-ghost");
    let esEl = enemyListEl.querySelector(".hp-bar-fill.enemy-es");
    let hpEl = enemyListEl.querySelector(".hp-bar-fill.enemy");
    let pendingEl = enemyListEl.querySelector(".enemy-pending");
    let hpTextEl = enemyListEl.querySelector(".hp-text");
    let ailmentEl = enemyListEl.querySelector(".enemy-ailments");
    let traitEl = enemyListEl.querySelector(".enemy-traits");
    setElementText(runtime, nameEl, `${(0, runtime.deps.getEnemyDisplayName)(focusedEnemy)}, Lv.${runtime.deps.levelProgression.monsterLevel(zone, focusedEnemy)}`);
    paintEnemyGhostBar(ghostEl, pct, ghostTrailPct, ghostDisplay);
    paintEnemyShieldBar(esEl, focusedEnemy);
    if (hpEl) setUiImageGaugePercent(runtime, hpEl, pct);
    if (pendingEl) {
      pendingEl.style.left = `${pendingStartPct}%`;
      pendingEl.style.width = `${pendingPct}%`;
    }
    paintEnemyHpText(runtime, hpTextEl, focusedEnemy);
    patchCombatEffectStrip(runtime, ailmentEl, effectMarkup);
    if (traitEl) updateFocusedEnemyTraitPanel(runtime, traitEl, focusedEnemy, enemyHudTier === "mob" ? [] : tags);
  }
  function paintEnemyHpText(runtime, hpTextEl, focusedEnemy) {
    if (hpTextEl) {
      let zoneNow = (0, runtime.deps.getZone)(runtime.deps.game.currentZoneId);
      if (zoneNow && zoneNow.type === "woodsmanEcho") {
        let totalDealt = Math.max(0, Math.floor((focusedEnemy.echoStartHp || focusedEnemy.maxHp || 0) - Math.max(0, focusedEnemy.hp || 0)));
        setElementText(runtime, hpTextEl, `${enemyShieldText(runtime, focusedEnemy)}${formatSettingNumber(runtime, totalDealt, "showEnemyHpComma")} / ?`);
      } else setElementText(runtime, hpTextEl, `${enemyShieldText(runtime, focusedEnemy)}${formatSettingNumber(runtime, Math.max(0, focusedEnemy.hp), "showEnemyHpComma")}/${formatSettingNumber(runtime, focusedEnemy.maxHp, "showEnemyHpComma")}`);
    }
  }
  function paintEnemyShieldBar(esEl, focusedEnemy) {
    if (esEl) {
      let esPct = (focusedEnemy.maxEnergyShield || 0) > 0 ? Math.max(0, Math.min(100, (focusedEnemy.energyShield || 0) / Math.max(1, focusedEnemy.maxEnergyShield) * 100)) : 0;
      esEl.style.width = `${esPct}%`;
      esEl.style.display = esPct > 0 ? "block" : "none";
    }
  }
  function paintEnemyGhostBar(ghostEl, pct, ghostTrailPct, ghostDisplay) {
    if (ghostEl) {
      ghostEl.style.left = `${pct}%`;
      ghostEl.style.width = `${ghostTrailPct}%`;
      ghostEl.style.display = ghostDisplay;
    }
  }
  function ensureCombatEnemyCard(runtime, enemyListEl, focusedEnemy) {
    let enemyHudTier = focusedEnemy.isBoss || focusedEnemy.bossPhase ? "boss" : focusedEnemy.isElite ? "elite" : "mob";
    let focusedKey = String(focusedEnemy.id) + "|" + enemyHudTier;
    if (enemyListEl.hidden !== (enemyHudTier === "mob")) enemyListEl.hidden = enemyHudTier === "mob";
    if (enemyListEl.dataset.enemyId !== focusedKey || !enemyListEl.querySelector(".enemy-card.targeted")) {
      releaseCombatHudTrait(runtime);
      enemyListEl.dataset.enemyId = focusedKey;
      let traitMarkup = '<div class="enemy-tags muted enemy-traits" role="button" tabindex="0" aria-controls="info-tooltip" data-info-tooltip-anchor="1" onmouseenter="showEnemyTraitTooltip(event)" onmousemove="showEnemyTraitTooltip(event)" onfocus="showEnemyTraitTooltip(event)" onclick="event.stopPropagation(); showEnemyTraitTooltip(event)" onkeydown="showEnemyTraitTooltip.onKey(event)" onblur="showEnemyTraitTooltip.hide()" onmouseleave="if(document.activeElement!==this) showEnemyTraitTooltip.hide()"><span class="enemy-trait-marquee"></span></div>';
      let effectMarkup = '<div class="enemy-tags muted enemy-ailments combat-effect-strip enemy-combat-effect-strip" aria-label="활성 상태이상 및 효과"></div>';
      let metaMarkup = `<div class="enemy-hud-meta">${traitMarkup}</div>`;
      enemyListEl.innerHTML = `
                <div class="enemy-card targeted enemy-${enemyHudTier}">
                    <div class="enemy-nameplate"><div class="enemy-name"></div></div>
                    <div class="enemy-health-frame">
                        <img class="health-skin-frame" src="assets/ui/health-${enemyHudTier}-v2.png" alt="" aria-hidden="true">
                        <div class="hp-bar-bg">
                            <div class="health-skin-track">
                                <div class="hp-bar-fill enemy-damage-ghost"></div>
                                <div class="hp-bar-fill enemy-es"></div>
                                <div class="hp-bar-fill enemy"></div>
                                <div class="hp-bar-fill enemy-pending"></div>
                                <div class="hp-text"></div>
                            </div>
                        </div>
                        ${metaMarkup}
                    </div>
                    ${effectMarkup}
                </div>
            `;
    }
    return enemyHudTier;
  }
  function combatEnemyHealthTrail(runtime, focusedEnemy, pct, projectedAilmentDamage) {
    let pendingPct = Math.max(0, Math.min(pct, projectedAilmentDamage / Math.max(1, focusedEnemy.maxHp || 1) * 100));
    let pendingStartPct = Math.max(0, pct - pendingPct);
    let ghostPct = updateEnemyHpDamageGhost(runtime, focusedEnemy.id, pct);
    let ghostTrailPct = Math.max(0, ghostPct - pct);
    let ghostDisplay = ghostTrailPct > 0.2 ? "block" : "none";
    return { pendingPct, pendingStartPct, ghostTrailPct, ghostDisplay };
  }
  function combatEnemyEffects(runtime, focusedEnemy, pStats) {
    let activeAilments = (focusedEnemy.ailments || []).filter((ail) => ail && (ail.time || 0) > 0);
    let effectNow = (0, runtime.deps.getCombatTime)();
    let enemyDebuffs = ((runtime.deps.game.enemyConditionDebuffs || {})[focusedEnemy.id] || []).filter((row) => row && (row.expiresAt || 0) > effectNow);
    let effectMarkup = buildEnemyCombatEffectIcons(runtime, activeAilments, enemyDebuffs, effectNow, focusedEnemy);
    let projectedAilmentDamage = activeAilments.reduce((sum, ail) => {
      if (!ail || (ail.time || 0) <= 0) return sum;
      if (ail.type === "flameDecay") return sum + Math.floor(Math.max(0, ail.flameDecayDps || 0) * Math.max(0, ail.time || 0));
      if (!(0, runtime.deps.isUiDamageAilmentType)(ail.type)) return sum;
      let dps = (0, runtime.deps.getUiEnemyDamageAilmentDps)(ail, pStats);
      let stacks = Math.max(1, Math.floor(ail.stacks || 1));
      return sum + Math.floor(dps * stacks * Math.max(0, ail.time || 0));
    }, 0);
    return { effectMarkup, projectedAilmentDamage };
  }
  function combatEnemyTags(runtime, focusedEnemy) {
    let tags = (0, runtime.deps.getEnemyTraitSummary)(focusedEnemy);
    if (Array.isArray(focusedEnemy.chaosRealmAffixes) && focusedEnemy.chaosRealmAffixes.length > 0) tags = tags.concat(focusedEnemy.chaosRealmAffixes.map((a) => a.name));
    tags = Array.from(new Set(getUiEnemyTraitLabels(runtime, tags)));
    return tags;
  }
  function updateOceanDepthProgress(runtime) {
    let oceanSt = typeof runtime.deps.ensureOceanState === "function" ? (0, runtime.deps.ensureOceanState)() : null;
    let depthM = oceanSt ? Math.floor(oceanSt.depthM || 0) : 0;
    let segPct = Math.min(100, Math.max(0, depthM - Math.floor(depthM / 100) * 100));
    let isDrowning = !!(oceanSt && oceanSt.drowning);
    setTextById(runtime, "ui-progress-label", isDrowning ? "🫨 익사 위험" : "🌊 수심");
    setTextById(runtime, "ui-move-time-text", isDrowning ? (0, runtime.deps._t)("{depthM}m, 산소 고갈! 익사 피해 누적", { depthM }) : `${depthM}m`);
    setCombatProgressGaugePercent(runtime, isDrowning ? 100 : segPct);
  }
  function updateRoomMoveProgress(runtime) {
    let readyPct = Math.min(100, (1 - runtime.deps.game.moveTimer / runtime.deps.game.moveTotalTime) * 100);
    setTextById(runtime, "ui-progress-label", runtime.deps.game.isTownReturning ? "🏕️ 재정비 중..." : "다음 구간 준비");
    setTextById(runtime, "ui-move-time-text", (0, runtime.deps._t)("{max}초", { max: Math.max(0, runtime.deps.game.moveTimer).toFixed(1) }));
    setCombatProgressGaugePercent(runtime, readyPct);
  }
  function updateWoodsmanEntranceProgress(runtime) {
    let totalTime = Math.max(0.1, Number(runtime.deps.game.moveTotalTime) || 3);
    let readyPct = Math.min(100, Math.max(0, (1 - Math.max(0, runtime.deps.game.moveTimer || 0) / totalTime) * 100));
    setTextById(runtime, "ui-progress-label", "☠️ 나무꾼 등장 대기");
    setTextById(runtime, "ui-move-time-text", runtime.deps.game.moveTimer > 0 ? (0, runtime.deps._t)("{max}초", { max: Math.max(0, runtime.deps.game.moveTimer).toFixed(1) }) : "등장 임박");
    setCombatProgressGaugePercent(runtime, readyPct);
  }
  function enemyShieldText(runtime, focusedEnemy) {
    return focusedEnemy.energyShield > 0 ? (0, runtime.deps._t)("보호막 {energyShield}, ", { energyShield: formatSettingNumber(runtime, focusedEnemy.energyShield, "showEnemyHpComma") }) : "";
  }

  // modules/ui/combat-hud-view.mjs
  function createCombatHudView(deps) {
    const runtime = {
      deps,
      state: {},
      handlers: {},
      api: null,
      active: true,
      owner: null,
      listeners: [],
      skillHost: null,
      trait: null,
      traitFrame: null,
      levelAnimation: null
    };
    const handlers = { renderCombatSkillSlot, bindCombatSkillSlot, showEnemyTraitTooltip, setTextById, setElementText, primeEnemyHpDamageGhost, updateEnemyHpDamageGhost, formatSettingNumber, formatCappedResistanceValue, renderCombatSkillHud, setCombatProgressGaugePercent, getUiCombatEffectPresentation, getUiRuntimeEffectDetail, getUiExperienceProgress, getConditionEffectTitle, updatePlayerCombatEffectHud, renderEnergyShieldInline, updateCombatUI, onEnemyTraitKey, syncEnemyTraitTooltip, hideEnemyTraitTooltip };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    for (const name of ["primeEnemyHpDamageGhost", "updateEnemyHpDamageGhost", "renderCombatSkillHud", "updatePlayerCombatEffectHud", "updateCombatUI", "showEnemyTraitTooltip", "syncEnemyTraitTooltip"]) {
      const handler = runtime.handlers[name];
      runtime.handlers[name] = function combatHudCall(...args) {
        if (syncCombatHudOwner(runtime)) return handler(...args);
      };
    }
    initialize(runtime);
    runtime.handlers.updateUiEnemyTraitPanel = createUpdateUiEnemyTraitPanel(runtime);
    runtime.api = { setTextById: runtime.handlers.setTextById, setElementText: runtime.handlers.setElementText, primeEnemyHpDamageGhost: runtime.handlers.primeEnemyHpDamageGhost, updateEnemyHpDamageGhost: runtime.handlers.updateEnemyHpDamageGhost, formatSettingNumber: runtime.handlers.formatSettingNumber, formatCappedResistanceValue: runtime.handlers.formatCappedResistanceValue, renderCombatSkillHud: runtime.handlers.renderCombatSkillHud, setCombatProgressGaugePercent: runtime.handlers.setCombatProgressGaugePercent, getUiCombatEffectPresentation: runtime.handlers.getUiCombatEffectPresentation, getUiRuntimeEffectDetail: runtime.handlers.getUiRuntimeEffectDetail, getUiExperienceProgress: runtime.handlers.getUiExperienceProgress, getConditionEffectTitle: runtime.handlers.getConditionEffectTitle, updatePlayerCombatEffectHud: runtime.handlers.updatePlayerCombatEffectHud, showEnemyTraitTooltip: runtime.handlers.showEnemyTraitTooltip, renderEnergyShieldInline: runtime.handlers.renderEnergyShieldInline, updateCombatUI: runtime.handlers.updateCombatUI };
    runtime.handlers.showEnemyTraitTooltip.onKey = runtime.handlers.onEnemyTraitKey;
    runtime.handlers.showEnemyTraitTooltip.sync = runtime.handlers.syncEnemyTraitTooltip;
    runtime.handlers.showEnemyTraitTooltip.hide = runtime.handlers.hideEnemyTraitTooltip;
    runtime.api.dispose = () => disposeCombatHud(runtime);
    return Object.freeze(runtime.api);
  }
  function initialize(runtime) {
    runtime.state.playerHpDamageGhostPct = null;
    runtime.state.playerHpDamageGhostLastPct = null;
    runtime.state.playerHpDamageGhostLastAt = 0;
    runtime.state.playerHpDamageGhostHoldUntil = 0;
    runtime.state.enemyHpDamageGhostStates = /* @__PURE__ */ new Map();
    runtime.state.PLAYER_HP_DAMAGE_GHOST_HOLD_MS = 260;
    runtime.state.PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC = 34;
    runtime.state.ENEMY_HP_DAMAGE_GHOST_SNAP_MS = 680;
    runtime.state.COMBAT_SKILL_HUD_LIMIT = 6;
    runtime.state.COMBAT_SKILL_SLOT_LABELS = Object.freeze({ primary: "주 공격", mobility: "이동 스킬", summon: "소환" });
    runtime.state.combatSkillCooldownSpans = /* @__PURE__ */ new Map();
    runtime.state.MAP_PROGRESS_SPEAKING_TYPES = Object.freeze(["grandBreach", "woodsmanEcho", "colony", "oceanDepth"]);
    runtime.state.UI_COMBAT_EFFECT_PRESENTATION = COMBAT_EFFECT_PRESENTATION;
    runtime.state.UI_RUNTIME_EFFECT_DETAILS = createRuntimeEffectDetails(runtime);
    runtime.state.hudShownLevel = 0;
  }

  // modules/combat-hud-ui-classic.mjs
  var combatHudView = createCombatHudView({
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get Date() {
      return Date;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get i18n() {
      return i18n;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get hotkeyBindings() {
      return hotkeyBindings;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get _t() {
      return _t;
    },
    get renderSkillGemArt() {
      return renderSkillGemArt;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get showGemTooltip() {
      return showGemTooltip;
    },
    get openTabPane() {
      return openTabPane;
    },
    get hotkeysUi() {
      return hotkeysUi;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get SKILL_SIGNATURE_SPRITES() {
      return SKILL_SIGNATURE_SPRITES;
    },
    get SKILL_GEM_VFX_PROFILES() {
      return SKILL_GEM_VFX_PROFILES;
    },
    get getSkillGemVfxImage() {
      return getSkillGemVfxImage;
    },
    get getExpReq() {
      return getExpReq;
    },
    get getUiStoredAilmentHitDamage() {
      return getUiStoredAilmentHitDamage;
    },
    get talismans() {
      return talismans;
    },
    get talismanCombat() {
      return talismanCombat;
    },
    get combatIncidents() {
      return combatIncidents;
    },
    get ACT_EXPLORATION_INCIDENTS() {
      return ACT_EXPLORATION_INCIDENTS;
    },
    get getLeechCaps() {
      return typeof getLeechCaps === "undefined" ? void 0 : getLeechCaps;
    },
    get hasKeystone() {
      return typeof hasKeystone === "undefined" ? void 0 : hasKeystone;
    },
    get isTalentCardActive() {
      return typeof isTalentCardActive === "undefined" ? void 0 : isTalentCardActive;
    },
    get getWarriorRageStacks() {
      return typeof getWarriorRageStacks === "undefined" ? void 0 : getWarriorRageStacks;
    },
    get isUiDamageAilmentType() {
      return isUiDamageAilmentType;
    },
    get getUiPlayerDamageAilmentDps() {
      return getUiPlayerDamageAilmentDps;
    },
    get clearInterval() {
      return windowClearInterval;
    },
    get statToneText() {
      return statToneText;
    },
    get requestAnimationFrame() {
      return typeof requestAnimationFrame === "undefined" ? void 0 : windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get matchMedia() {
      return typeof matchMedia === "undefined" ? void 0 : windowMatchMedia;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get setInterval() {
      return windowSetInterval;
    },
    get window() {
      return window;
    },
    get enemyAttackRules() {
      return enemyAttackRules;
    },
    get getBossPatternDescription() {
      return getBossPatternDescription;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get normalizeUiPlayerStats() {
      return normalizeUiPlayerStats;
    },
    get cachedTooltipStats() {
      return window.GameModules.uiRuntime.stats.snapshot();
    },
    set cachedTooltipStats(value) {
      window.GameModules.uiRuntime.stats.store(value);
    },
    get getHeroSelectionDef() {
      return typeof getHeroSelectionDef === "function" ? getHeroSelectionDef : void 0;
    },
    get CLASS_TEMPLATES() {
      return typeof CLASS_TEMPLATES === "undefined" ? void 0 : CLASS_TEMPLATES;
    },
    get getZone() {
      return getZone;
    },
    get getStoryActByZoneId() {
      return getStoryActByZoneId;
    },
    get formatStoryActLabel() {
      return formatStoryActLabel;
    },
    get cosmosRouteUi() {
      return cosmosRouteUi;
    },
    get sideEncounterUi() {
      return sideEncounterUi;
    },
    get getUiCrowdProgressPaused() {
      return getUiCrowdProgressPaused;
    },
    get atlasUi() {
      return atlasUi;
    },
    get getRenderingUiTabIds() {
      return getRenderingUiTabIds;
    },
    get renderCharacterStats() {
      return renderCharacterStats;
    },
    get getUiSkillTargets() {
      return getUiSkillTargets;
    },
    get ensureOceanState() {
      return typeof ensureOceanState === "undefined" ? void 0 : ensureOceanState;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    },
    get getEnemyTraitSummary() {
      return getEnemyTraitSummary;
    },
    get getEnemyDisplayName() {
      return getEnemyDisplayName;
    },
    get levelProgression() {
      return levelProgression;
    },
    get getUiEnemyDamageAilmentDps() {
      return getUiEnemyDamageAilmentDps;
    },
    get activeInfoTooltipToken() {
      return window.GameModules.tooltipView.infoToken();
    },
    get WARRIOR_RAGE_STACK_DAMAGE_PCT() {
      return typeof WARRIOR_RAGE_STACK_DAMAGE_PCT === "undefined" ? void 0 : WARRIOR_RAGE_STACK_DAMAGE_PCT;
    },
    get ASCENDANCY_KEYSTONE_VALUES() {
      return ASCENDANCY_KEYSTONE_VALUES;
    }
  });
  window.GameModules.combatHudView = combatHudView;
  safeExposeGlobals({
    setTextById: combatHudView.setTextById,
    setElementText: combatHudView.setElementText,
    primeEnemyHpDamageGhost: combatHudView.primeEnemyHpDamageGhost,
    updateEnemyHpDamageGhost: combatHudView.updateEnemyHpDamageGhost,
    formatSettingNumber: combatHudView.formatSettingNumber,
    formatCappedResistanceValue: combatHudView.formatCappedResistanceValue,
    renderCombatSkillHud: combatHudView.renderCombatSkillHud,
    setCombatProgressGaugePercent: combatHudView.setCombatProgressGaugePercent,
    getUiCombatEffectPresentation: combatHudView.getUiCombatEffectPresentation,
    getUiRuntimeEffectDetail: combatHudView.getUiRuntimeEffectDetail,
    getUiExperienceProgress: combatHudView.getUiExperienceProgress,
    getConditionEffectTitle: combatHudView.getConditionEffectTitle,
    updatePlayerCombatEffectHud: combatHudView.updatePlayerCombatEffectHud,
    showEnemyTraitTooltip: combatHudView.showEnemyTraitTooltip,
    renderEnergyShieldInline: combatHudView.renderEnergyShieldInline,
    updateCombatUI: combatHudView.updateCombatUI
  });
})();
