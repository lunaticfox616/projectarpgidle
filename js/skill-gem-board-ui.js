// GENERATED from modules/skill-gem-board-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/skill-board-actions.mjs
  function kindOf(runtime, name) {
    if ((runtime.deps.SKILL_DB[name]?.tags || []).includes("summon")) return "summon";
    return runtime.deps.mobilitySkill.isMobilityGem(name) ? "mobility" : "active";
  }
  function gemArt(runtime, name, className) {
    return (0, runtime.deps.renderSkillGemArt)(name, className, { eager: true });
  }
  function engraveSlots(runtime, main) {
    if (!runtime.deps.contentProgression.isUnlocked("engraving") || !(0, runtime.deps.isEnhanceableAttackGem)(main)) return [];
    const ids = (0, runtime.deps.getSkyEnhancementSlotsForSkill)(main);
    const cap = (0, runtime.deps.normalizeGemRecord)((runtime.deps.game.gemData || {})[main]).skyEnhanceCap || 1;
    return [0, 1, 2, 3, 4].map((index) => {
      const def = index < cap && ids[index] ? runtime.deps.GEM_SKY_ENHANCEMENTS[ids[index]] : null;
      const state = index < cap ? def ? "full" : "open" : index === cap ? "next" : "lock";
      return { index, state, def };
    });
  }
  function engraveUnlockNeed(runtime, index) {
    return { need: index + 1, have: Math.floor(Number(runtime.deps.game.currencies.skyEssence) || 0), loopOk: (runtime.deps.game.season || 1) >= 4 };
  }
  function engraveUnlockBlock(runtime, need) {
    if (!need.loopOk) return (0, runtime.deps._t)("루프 4부터 열 수 있습니다.");
    return need.have < need.need ? (0, runtime.deps._t)("창공의 정수가 부족합니다. (필요: {need})", { need: need.need }) : "";
  }
  function engraveLabel(runtime, slot) {
    if (slot.state === "full") return (0, runtime.deps._t)(slot.def.name);
    return (0, runtime.deps._t)(slot.state === "open" ? "빈 각인" : slot.state === "next" ? "다음 칸" : "잠김");
  }
  function renderEngraveRing(runtime, slots) {
    if (!slots.length) return "";
    const marks = slots.map((slot) => {
      const angle = -Math.PI / 2 + slot.index * 2 * Math.PI / 5;
      const x = Math.round(Math.cos(angle) * runtime.state.RING_RADIUS), y = Math.round(Math.sin(angle) * runtime.state.RING_RADIUS);
      const glyph = slot.state === "full" ? (0, runtime.deps.renderSkyEnhancementIcon)(slot.def) : slot.state === "open" ? "+" : "";
      const group = slot.state === "full" ? ` is-group-${(0, runtime.deps.getSkyEnhancementGroup)(slot.def).className}` : "";
      const title = slot.state === "full" ? `${(0, runtime.deps._t)(slot.def.name)}, ${slot.def.desc}` : engraveLabel(runtime, slot);
      return `<button type="button" class="skill-board-engrave is-${slot.state}${group}" style="--x:${x}px;--y:${y}px" data-board-engrave="${slot.index}" data-info-tooltip-anchor="1" onpointerenter="skillGemBoardUi.engraveHint(event,${slot.index})" onpointerleave="hideInfoTooltip()" aria-label="${(0, runtime.deps._t)("각인 {value}: {title}", { value: slot.index + 1, title: (0, runtime.deps.escapeHTML)(title) })}"><i>${glyph ? `<b>${glyph}</b>` : ""}</i><span>${(0, runtime.deps.escapeHTML)(engraveLabel(runtime, slot))}</span></button>`;
    }).join("");
    return `<div class="skill-board-ring" aria-hidden="false">${marks}</div>`;
  }
  function createRenderSatellite(runtime) {
    return function renderSatellite(kind, label, name, extra, cap = "") {
      if (!name) return `<button type="button" class="skill-board-satellite is-empty" data-board-pick="${kind}" aria-label="${(0, runtime.deps._t)("{label} 칸 비어 있음, 룬 고르기", { label })}"><i>+</i>${cap ? `<em class="skill-board-cap" data-tip="${(0, runtime.deps._t)("소환 한도")}">${cap}</em>` : ""}<small>${label}</small><b>${(0, runtime.deps._t)("비어 있음")}</b></button>`;
      return `<button type="button" class="skill-board-satellite active element-${(0, runtime.deps.getGemCardMeta)(runtime.deps.SKILL_DB[name]).className}" data-board-pick="${kind}" data-board-gem="${(0, runtime.deps.escapeHTML)(name)}" ${hoverHint(runtime, "active", name)} aria-label="${label}: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}">${gemArt(runtime, name, "skill-board-satellite-art")}${cap ? `<em class="skill-board-cap">${cap}</em>` : ""}<small>${label}${extra || ""}</small><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</b></button>`;
    };
  }
  function renderSummons(runtime, stats) {
    const worn = runtime.deps.game.equippedSummonSkills || [];
    const cap = `${(0, runtime.deps.getEquippedSummonCount)()}/${(0, runtime.deps.getSummonEquipCapFromStats)(stats)}`;
    const parts = worn.map((name, index) => runtime.handlers.renderSatellite("summon", (0, runtime.deps._t)("소환"), name, ` ×${(0, runtime.deps.getSummonSkillCount)(name)}`, index ? "" : cap));
    if ((0, runtime.deps.getEquippedSummonCount)() < (0, runtime.deps.getSummonEquipCapFromStats)(stats)) parts.push(runtime.handlers.renderSatellite("summon", (0, runtime.deps._t)("소환"), "", "", parts.length ? "" : cap));
    return `<div class="skill-board-summons">${parts.join("")}</div>`;
  }
  function renderBoard(runtime, stats) {
    const main = runtime.deps.game.activeSkill || "기본 공격";
    const info = (0, runtime.deps.getUiGemPresentation)(main, false, stats);
    const meta = (0, runtime.deps.getGemCardMeta)(runtime.deps.SKILL_DB[main] || {});
    const slots = engraveSlots(runtime, main);
    const filled = slots.filter((slot) => slot.state === "full").length, open = slots.filter((slot) => slot.state === "full" || slot.state === "open").length;
    const engraveNote = slots.length ? `<em>${(0, runtime.deps._t)("각인 {filled} / {open}칸", { filled, open })}</em>` : "";
    const level = info.totalLevel > info.baseLevel ? `<small class="is-boosted">Lv.${(0, runtime.deps.formatValue)("", info.totalLevel)}</small>` : `<small>Lv.${info.totalLevel || 1}</small>`;
    return `<div class="skill-board-linked-row"><div class="skill-board-mobility">${runtime.handlers.renderSatellite("mobility", (0, runtime.deps._t)("이동"), runtime.deps.mobilitySkill.equipped())}</div><div class="skill-board-main"><div class="skill-board-head"><span>${(0, runtime.deps._t)("주 공격")}</span><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(main))}</b>${level}${engraveNote}</div>
            <div class="skill-board-stage element-${meta.className}${slots.length ? " has-ring" : ""}">
                ${renderEngraveRing(runtime, slots)}
                <button type="button" class="skill-board-core active" data-board-pick="active" data-board-gem="${(0, runtime.deps.escapeHTML)(main)}" ${hoverHint(runtime, "active", main)} aria-label="${(0, runtime.deps._t)("주 공격: {name}, 바꿀 룬 고르기", { name: (0, runtime.deps._t)(main) })}">${gemArt(runtime, main, "skill-board-core-art")}</button>
            </div></div>${renderSummons(runtime, stats)}</div>`;
  }
  function shortTarget(runtime, text) {
    if (text.startsWith("적용: ")) return text.slice(4);
    return (0, runtime.deps._t)("맞는 스킬 없음");
  }
  function renderSupportSlot(runtime, name, stats) {
    const target = shortTarget(runtime, runtime.deps.gemSelectionUi.application(name, stats));
    const role = runtime.state.focusedSkill.kind === "active" ? "main" : runtime.state.focusedSkill.kind;
    const lit = runtime.deps.gemSelectionUi.targetRows(name).some((row) => row.role === role && row.name === focusedName(runtime) && row.status === "on");
    return `<button type="button" class="support-slot active${lit ? " is-linked" : ""}" data-board-pick="support" data-board-gem="${(0, runtime.deps.escapeHTML)(name)}" ${hoverHint(runtime, "support", name)} aria-label="${(0, runtime.deps._t)("보조스킬룬")}: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}, ${(0, runtime.deps.escapeHTML)(target)}">${runtime.deps.supportGemSigil.html(name, "support-slot-sigil", (0, runtime.deps.getSupportActiveTier)(name))}<b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</b>${runtime.deps.gemSelectionUi.indicators(name)}<small>${(0, runtime.deps.escapeHTML)(target)}</small></button>`;
  }
  function focusedName(runtime) {
    if (runtime.state.focusedSkill.kind === "active") return runtime.deps.game.activeSkill || "기본 공격";
    if (runtime.state.focusedSkill.kind === "mobility") return runtime.deps.mobilitySkill.equipped();
    return runtime.deps.game.equippedSummonSkills.includes(runtime.state.focusedSkill.name) ? runtime.state.focusedSkill.name : runtime.deps.game.equippedSummonSkills[0] || "";
  }
  function renderSupports(runtime, stats) {
    const cap = Math.max(0, Math.floor(stats.suppCap || 0));
    const worn = (runtime.deps.game.equippedSupports || []).slice(0, cap);
    const resonanceCap = (0, runtime.deps.getEffectiveResonanceCap)(stats);
    const used = (runtime.deps.game.equippedSupports || []).reduce((sum, name) => sum + (0, runtime.deps.getSupportTierResonanceCost)(name), 0);
    const fill = resonanceCap > 0 ? Math.round(Math.min(1, used / resonanceCap) * 100) : 0;
    const resonanceTip = stats.supportResonanceOverflow ? (0, runtime.deps._t)("공명력 {value} 초과: 모든 저항 -{value}%p", { value: stats.supportResonanceOverflow }) : (0, runtime.deps._t)("장착 보조스킬룬이 쓰는 공명력");
    const slots = worn.map((name) => renderSupportSlot(runtime, name, stats));
    for (let i = worn.length; i < cap; i++) slots.push(`<button type="button" class="support-slot is-empty" data-board-pick="support" aria-label="${(0, runtime.deps._t)("빈 보조스킬룬 칸, 룬 고르기")}"><i>+</i><b>${(0, runtime.deps._t)("빈 칸")}</b><small>&nbsp;</small></button>`);
    slots.push(`<div class="support-slot is-lock" aria-label="${(0, runtime.deps._t)("다음 보조스킬룬 칸은 장비, 패시브로 늘어납니다")}"><i></i><b>${(0, runtime.deps._t)("다음 칸")}</b><small>${(0, runtime.deps._t)("장비, 패시브")}</small></div>`);
    return `<div class="support-slots-head"><span>${(0, runtime.deps._t)("보조스킬룬")}</span><em>${(0, runtime.deps._t)("칸")} ${worn.length} / ${cap}</em>
                <div class="support-resonance" data-tip="${(0, runtime.deps.escapeHTML)(resonanceTip)}"><small>${(0, runtime.deps._t)("공명력")}</small><span class="support-resonance-bar"><i style="width:${fill}%"></i></span><b>${used}</b><small>/ ${resonanceCap}</small></div></div>
            <div class="support-slots-row">${slots.join("")}</div>${runtime.deps.gemSelectionUi.skillSummary(runtime.state.focusedSkill.kind, focusedName(runtime), stats)}<div class="support-indicator-key">${(0, runtime.deps._t)("● 적용, ○ 태그 불일치, ◌ 빈 칸, ◉ 소환 대응 없음, ⊙ 사역룬 제외")}</div>`;
  }
  function render(runtime, stats) {
    const board = runtime.deps.document.getElementById("ui-skill-board");
    const supports = runtime.deps.document.getElementById("ui-support-slots");
    const boardHtml = renderBoard(runtime, stats);
    if (board.dataset.renderSig !== boardHtml) {
      board.innerHTML = boardHtml;
      board.dataset.renderSig = boardHtml;
    }
    const supportHtml = renderSupports(runtime, stats);
    if (supports.dataset.renderSig !== supportHtml) {
      supports.innerHTML = supportHtml;
      supports.dataset.renderSig = supportHtml;
    }
    runtime.deps.document.getElementById("skill-tab-equip").dataset.picking = runtime.state.pickerKind;
    runtime.deps.document.getElementById("ui-skill-picker-title").textContent = (0, runtime.deps._t)(runtime.state.PICKER_TITLES[runtime.state.pickerKind]);
  }
  function currentKind(runtime) {
    if (runtime.state.pickerKind === "support" && !runtime.deps.contentProgression.isUnlocked("support")) runtime.state.pickerKind = "active";
    return runtime.state.pickerKind;
  }
  function pick(runtime, kind, stay) {
    runtime.state.pickerKind = kind;
    runtime.deps.document.getElementById("skill-tab-equip").dataset.picking = kind;
    (0, runtime.deps.updateStaticUI)();
    const list = runtime.deps.document.querySelector("#skill-tab-equip .skill-picker");
    if (list && !stay && runtime.deps.uiDisplay.matches("(max-width: 1080px)")) list.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function openEngrave(runtime, index) {
    const main = runtime.deps.game.activeSkill;
    const slot = engraveSlots(runtime, main)[index];
    if (!slot) return;
    if (slot.state === "full" || slot.state === "open") {
      runtime.deps.game.gemEnhanceTargetSkill = main;
      (0, runtime.deps.openGemEngraveSlotOverlay)(index);
      return;
    }
    if (slot.state === "next") {
      openNextEngrave(runtime, main, index);
      return;
    }
    (0, runtime.deps.openEquippedGemManagement)(main);
  }
  async function openNextEngrave(runtime, main, index) {
    const block = engraveUnlockBlock(runtime, engraveUnlockNeed(runtime, index));
    if (block) {
      (0, runtime.deps.showGameToast)(block, { tone: "warning" });
      return;
    }
    const message = (0, runtime.deps._t)("창공의 정수 {need}개를 써서 {n}번 각인 칸을 엽니다.", { need: index + 1, n: index + 1 });
    if (await (0, runtime.deps.requestGameConfirmation)(message, { title: (0, runtime.deps._t)("각인 칸 열기"), confirmLabel: (0, runtime.deps._t)("열기") }) !== true) return;
    runtime.deps.game.gemEnhanceTargetSkill = main;
    (0, runtime.deps.openGemEngraveSlotOverlay)(index);
  }
  function wornGemHint(runtime, event, type, name) {
    if (hoversWithMouse(runtime, event)) (0, runtime.deps.showGemTooltip)(event, type, name);
  }
  function engraveNeedTooltipHtml(runtime, slot) {
    const need = engraveUnlockNeed(runtime, slot.index), short = need.have < need.need ? ' style="color:#ff8a80"' : "";
    const lines = [`<div class="tooltip-line"${short}>${(0, runtime.deps._t)("필요: 창공의 정수 {need}개, 보유 {have}개", need)}</div>`];
    if (!need.loopOk) lines.push(`<div class="tooltip-line" style="color:#ff8a80">${(0, runtime.deps._t)("루프 4부터 열 수 있습니다.")}</div>`);
    const ready = slot.state === "next" && !engraveUnlockBlock(runtime, need);
    if (ready || slot.state === "lock") lines.push(`<div class="tooltip-line gem-card-hint">${(0, runtime.deps._t)(runtime.state.ENGRAVE_HINTS[slot.state])}</div>`);
    return `<div class="tooltip-title">${engraveLabel(runtime, slot)}</div>${lines.join("")}`;
  }
  function boardEngraveTooltipHtml(runtime, slot) {
    if (slot.state === "next" || slot.state === "lock") return engraveNeedTooltipHtml(runtime, slot);
    if (slot.state !== "full") return `<div class="tooltip-title">${engraveLabel(runtime, slot)}</div><div class="tooltip-line">${(0, runtime.deps._t)(runtime.state.ENGRAVE_HINTS[slot.state])}</div>`;
    const group = (0, runtime.deps.getSkyEnhancementGroup)(slot.def);
    return `<div class="tooltip-title engrave-tone-${group.className}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(slot.def.name))}</div><div class="tooltip-line engrave-tooltip-group">${(0, runtime.deps._t)("{group} 각인, {n}번 칸", { group: (0, runtime.deps._t)(group.label), n: slot.index + 1 })}</div><div class="tooltip-line engrave-tooltip-effect">${runtime.deps.statToneText.html((0, runtime.deps._t)(slot.def.desc))}</div><div class="tooltip-line gem-card-hint">${(0, runtime.deps._t)("누르면 다른 각인으로 바꿉니다")}</div>`;
  }
  function boardEngraveHint(runtime, event, index) {
    const slot = hoversWithMouse(runtime, event) ? engraveSlots(runtime, runtime.deps.game.activeSkill)[index] : null;
    if (!slot) return;
    const tone = slot.state === "full" ? runtime.state.GROUP_TONES[(0, runtime.deps.getSkyEnhancementGroup)(slot.def).className] : runtime.state.GROUP_TONES.basic;
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, boardEngraveTooltipHtml(runtime, slot), tone, `engrave:${index}:${slot.state}`);
  }
  function hoverHint(runtime, type, name) {
    return `data-info-tooltip-anchor="1" onpointerenter="skillGemBoardUi.hint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()"`;
  }
  function hoversWithMouse(runtime, event) {
    return event.pointerType === "mouse" && runtime.deps.window.matchMedia("(hover: hover)").matches;
  }

  // modules/ui/skill-board-view.mjs
  function createSkillBoardView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { render, pick, currentKind, kindOf, wornGemHint, boardEngraveHint };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.renderSatellite = createRenderSatellite(runtime);
    runtime.api = Object.freeze({ render: runtime.handlers.render, pick: runtime.handlers.pick, currentKind: runtime.handlers.currentKind, kindOf: runtime.handlers.kindOf, hint: runtime.handlers.wornGemHint, engraveHint: runtime.handlers.boardEngraveHint, dispose: () => disposeSkillBoard(runtime) });
    listenView(runtime, runtime.deps.document, "click", (event) => {
      const engrave = event.target.closest("[data-board-engrave]");
      if (engrave) {
        openEngrave(runtime, Number(engrave.dataset.boardEngrave));
        return;
      }
      const slot = event.target.closest("[data-board-pick]");
      if (!slot) return;
      const kind = slot.dataset.boardPick;
      if (kind !== "support") {
        runtime.state.focusedSkill = { kind, name: slot.dataset.boardGem || "" };
        render(runtime, (0, runtime.deps.getUiPlayerStats)());
      }
      if (kind !== runtime.state.pickerKind) pick(runtime, kind, true);
      runtime.deps.gemSlotDialog.open(kind, slot.dataset.boardGem || "");
    });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.pickerKind = "active";
    runtime.state.focusedSkill = { kind: "active", name: "" };
    runtime.state.PICKER_TITLES = Object.freeze({ active: "공격스킬룬", mobility: "이동스킬룬", summon: "소환스킬룬", support: "보조스킬룬", sealed: "봉인한 룬" });
    runtime.state.RING_RADIUS = 96;
    runtime.state.ENGRAVE_HINTS = Object.freeze({ open: "눌러서 넣을 각인을 고릅니다.", next: "눌러서 이 칸을 엽니다.", lock: "앞 칸부터 차례로 엽니다." });
    runtime.state.GROUP_TONES = Object.freeze({ basic: "#7aa4d6", crafted: "#d9a650", awakened: "#b48ae6" });
  }
  function disposeSkillBoard(runtime) {
    releaseViewEvents(runtime);
    runtime.state.focusedSkill = null;
  }

  // modules/skill-gem-board-ui-classic.mjs
  var skillGemBoardUi = createSkillBoardView({
    get SKILL_DB() {
      return SKILL_DB;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get renderSkillGemArt() {
      return renderSkillGemArt;
    },
    get contentProgression() {
      return contentProgression;
    },
    get isEnhanceableAttackGem() {
      return isEnhanceableAttackGem;
    },
    get getSkyEnhancementSlotsForSkill() {
      return getSkyEnhancementSlotsForSkill;
    },
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get GEM_SKY_ENHANCEMENTS() {
      return GEM_SKY_ENHANCEMENTS;
    },
    get _t() {
      return _t;
    },
    get renderSkyEnhancementIcon() {
      return renderSkyEnhancementIcon;
    },
    get getSkyEnhancementGroup() {
      return getSkyEnhancementGroup;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getGemCardMeta() {
      return getGemCardMeta;
    },
    get getEquippedSummonCount() {
      return getEquippedSummonCount;
    },
    get getSummonEquipCapFromStats() {
      return getSummonEquipCapFromStats;
    },
    get getSummonSkillCount() {
      return getSummonSkillCount;
    },
    get getUiGemPresentation() {
      return getUiGemPresentation;
    },
    get formatValue() {
      return formatValue;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    get supportGemSigil() {
      return supportGemSigil;
    },
    get getSupportActiveTier() {
      return getSupportActiveTier;
    },
    get getEffectiveResonanceCap() {
      return getEffectiveResonanceCap;
    },
    get getSupportTierResonanceCost() {
      return getSupportTierResonanceCost;
    },
    get document() {
      return document;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get openEquippedGemManagement() {
      return openEquippedGemManagement;
    },
    get openGemEngraveSlotOverlay() {
      return openGemEngraveSlotOverlay;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get showGameToast() {
      return showGameToast;
    },
    get showGemTooltip() {
      return showGemTooltip;
    },
    get statToneText() {
      return statToneText;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get window() {
      return window;
    },
    get gemSlotDialog() {
      return gemSlotDialog;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    }
  });
  safeExposeGlobals({ skillGemBoardUi });
})();
