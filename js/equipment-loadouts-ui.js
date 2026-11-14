// GENERATED from modules/equipment-loadouts-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/equipment-loadout-actions.mjs
  function describeLoadoutMissingWarning(runtime, missing) {
    const label = missing.every((row) => row.stored) ? "임시 보관함에 있음" : "누락";
    return `${label}: ${missing.map((row) => row.name).join(", ")}`;
  }
  function describeLoadoutPresetSlot(runtime, preset, inspection) {
    if (!preset) return "빈 세팅, 누르고 저장";
    if (inspection.missing.length > 0) return describeLoadoutMissingWarning(runtime, inspection.missing);
    if (inspection.incompatible.length > 0) return `장착 불가: ${inspection.incompatible.map((row) => row.name).join(", ")}`;
    if (inspection.runeReason) return inspection.runeReason;
    if (inspection.applied) return (0, runtime.deps._t)("사용 중, 장비 {count}부위", { count: inspection.count });
    return (0, runtime.deps._t)("장비 {count}부위, 누르면 세트 보기", { count: inspection.count });
  }
  function renderEquipmentLoadoutPresetSlot(runtime, preset, index, selectedSlot) {
    let inspection = runtime.deps.equipmentLoadoutRuntime.inspect(index);
    let blocked = presetBlocked(runtime, inspection);
    let stateClass = !preset ? " empty" : inspection.applied ? " applied" : blocked ? " missing" : "";
    let name = `${index + 1}번 빌드 세팅${preset ? ` [${preset.name}]` : ""}`;
    return `<button type="button" class="equipment-preset-slot${index === selectedSlot ? " selected" : ""}${stateClass}" data-tip="${(0, runtime.deps.escapeHTML)(`${name}, ${describeLoadoutPresetSlot(runtime, preset, inspection)}`)}"
        aria-label="${(0, runtime.deps.escapeHTML)(name)}" aria-pressed="${index === selectedSlot}" onclick="equipmentLoadoutUi.pick(${index})"><span class="px-center">${runtime.state.LOADOUT_SLOT_NUMERALS[index] || index + 1}</span></button>`;
  }
  function presetBlocked(runtime, inspection) {
    return inspection.missing.length + inspection.incompatible.length || inspection.runeReason;
  }
  function runeRows(runtime, loadout) {
    const active = (name) => name ? [{ kind: "active", name }] : [];
    const summons = loadout.equippedSummonSkills.map((name) => ({ kind: "active", name, note: (0, runtime.deps._t)("소환 ×{summonSkillCounts}", { summonSkillCounts: loadout.summonSkillCounts[name] }) }));
    const supports = loadout.equippedSupports.map((name) => ({ kind: "support", name, tier: loadout.supportTiers[name], note: (0, runtime.deps._t)("{supportTiers}등급", { supportTiers: loadout.supportTiers[name] }) }));
    return [["주 공격", active(loadout.activeSkill)], ["이동", active(loadout.mobilitySkill)], ["소환", summons], ["공용 보조", supports]];
  }
  function renderEquipmentLoadoutPresetPanel(runtime) {
    let root = runtime.deps.document.getElementById("ui-equipment-presets");
    if (!root) return;
    let state = runtime.deps.equipmentLoadoutRuntime.ensureState();
    let selected = state.selectedSlot;
    let preset = state.presets[selected];
    let html = `<section class="equipment-preset-panel" aria-label="${(0, runtime.deps._t)("통합 빌드 세팅")}">
        <div class="equipment-preset-row">${state.presets.map((row, index) => renderEquipmentLoadoutPresetSlot(runtime, row, index, selected)).join("")}
            <button type="button" class="equipment-preset-save" onclick="equipmentLoadoutUi.save()" data-tip="${(0, runtime.deps._t)("현재 장비와 주 공격, 이동, 소환, 보조 등급을 {value}번 빌드에 저장", { value: selected + 1 })}">${(0, runtime.deps._t)("저장")}</button>
            <details class="eqw-more equipment-preset-more"><summary aria-label="${(0, runtime.deps._t)("세팅 관리")}">⋯</summary><div class="eqw-more-panel">
                <button type="button" onclick="equipmentLoadoutUi.rename()" ${preset ? "" : "disabled"}>${(0, runtime.deps._t)("이름 바꾸기")}</button>
                <button type="button" onclick="equipmentLoadoutUi.clear()" ${preset ? "" : "disabled"}>${(0, runtime.deps._t)("비우기")}</button></div></details>
        </div>
    </section>`;
    if (root.dataset.renderHtml === html) return;
    root.innerHTML = html;
    root.dataset.renderHtml = html;
  }
  function pickEquipmentLoadoutPreset(runtime, slotIndex) {
    selectEquipmentLoadoutPreset(runtime, slotIndex);
    openReview(runtime, "load", runtime.deps.equipmentLoadoutRuntime.ensureState().selectedSlot);
  }
  function selectEquipmentLoadoutPreset(runtime, slotIndex) {
    runtime.state.actionNotice = "";
    let state = runtime.deps.equipmentLoadoutRuntime.ensureState();
    state.selectedSlot = Math.max(0, Math.min(runtime.deps.equipmentLoadoutRuntime.limit - 1, Math.floor(Number(slotIndex) || 0)));
    renderEquipmentLoadoutPresetPanel(runtime);
    if (typeof runtime.deps.queueImportantSave === "function") (0, runtime.deps.queueImportantSave)(300);
  }
  function saveEquipmentLoadoutPresetFromUi(runtime) {
    openReview(runtime, "save", runtime.deps.equipmentLoadoutRuntime.ensureState().selectedSlot);
  }
  function commitSave(runtime, index) {
    const previous = runtime.deps.equipmentLoadoutRuntime.ensureState().presets[index];
    const name = previous ? previous.name : (0, runtime.deps._t)("{activeSkill} 빌드", { activeSkill: runtime.deps.game.activeSkill });
    let result = runtime.deps.equipmentLoadoutRuntime.save(index, name);
    if (!result.ok) return showFailure(runtime, result.reason);
    runtime.state.actionNotice = (0, runtime.deps._t)("{LOADOUT_SLOT_NUMERALS} {name}에 현재 빌드를 저장했습니다.", { LOADOUT_SLOT_NUMERALS: runtime.state.LOADOUT_SLOT_NUMERALS[index], name: result.preset.name });
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🧰 빌드 세팅 [{name}] 저장, 장비 {count}부위와 룬, 보조 등급", { name: (0, runtime.deps._t)(result.preset.name), count: result.count }), "season-up", { toast: true });
    if (typeof runtime.deps.queueImportantSave === "function") (0, runtime.deps.queueImportantSave)(100);
    (0, runtime.deps.updateStaticUI)();
    return true;
  }
  function commitApply(runtime, index) {
    let result = runtime.deps.equipmentLoadoutRuntime.apply(index);
    if (!result.ok) return showFailure(runtime, result.reason);
    runtime.state.actionNotice = (0, runtime.deps._t)("{LOADOUT_SLOT_NUMERALS} {name} 불러오기 완료", { LOADOUT_SLOT_NUMERALS: runtime.state.LOADOUT_SLOT_NUMERALS[index], name: result.preset.name });
    if (typeof runtime.deps.clearCraftSelection === "function") (0, runtime.deps.clearCraftSelection)();
    if (typeof runtime.deps.hideItemTooltip === "function") (0, runtime.deps.hideItemTooltip)();
    const scope = result.preset.runeLoadout ? "장비와 룬, 보조 등급" : "장비만";
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🧰 빌드 세팅 전환: [{name}], {scope}", { name: (0, runtime.deps._t)(result.preset.name), scope }), "season-up", { toast: true });
    if (typeof runtime.deps.queueImportantSave === "function") (0, runtime.deps.queueImportantSave)(100);
    (0, runtime.deps.updateStaticUI)();
    return true;
  }
  function showFailure(runtime, reason) {
    runtime.state.actionNotice = (0, runtime.deps._t)("바꾸거나 저장할 수 없습니다: {reason}", { reason });
    (0, runtime.deps.addLog)(runtime.state.actionNotice, "attack-monster");
    renderEquipmentLoadoutPresetPanel(runtime);
    return false;
  }
  function currentBuild(runtime) {
    return { slots: Object.fromEntries(runtime.deps.equipmentLoadoutRuntime.slots.map((slot) => {
      const item = runtime.deps.game.equipment[slot];
      return [slot, item ? { id: item.id, instanceId: runtime.deps.equipmentLoadoutRuntime.getItemIdentity(item), name: item.name } : null];
    })), runeLoadout: runtime.deps.window.GameModules.skills.loadouts.capture(runtime.deps.game) };
  }
  function renderSetNavigation(runtime, state) {
    return `<nav class="build-set-tabs" aria-label="${(0, runtime.deps._t)("빌드 세트 선택")}"><button type="button" data-build-view="current" aria-pressed="${runtime.state.review.view === "current"}">${(0, runtime.deps._t)("현재 착용")}</button>
        ${state.presets.map((preset, slot) => `<button type="button" data-build-slot="${slot}" data-build-view="${slot}" aria-pressed="${runtime.state.review.view === String(slot)}">
        ${runtime.state.LOADOUT_SLOT_NUMERALS[slot]}${preset ? (0, runtime.deps._t)(" 세트") : (0, runtime.deps._t)(", 빈 칸")}</button>`).join("")}</nav>`;
  }
  function renderSetGear(runtime, preset, side) {
    const count = Object.values(preset.slots).filter(Boolean).length;
    const slots = (0, runtime.deps.getPaperdollSlots)(preset.slots);
    if (preset.slots["코어"] || runtime.deps.contentProgression.isUnlocked("cube")) slots.push("코어");
    const classes = `${slots.includes("반지3") ? " has-ring3" : ""}${slots.includes("코어") ? " has-core" : ""}`;
    const wards = runtime.deps.equipmentLoadoutRuntime.slots.filter((slot) => slot.startsWith("액막이"));
    return `<section class="build-set-gear"><h3>${(0, runtime.deps._t)("장비")} <small>${(0, runtime.deps._t)("{count}부위", { count })}</small></h3><div class="equipment-paperdoll build-set-paperdoll${classes}">
        ${slots.map((slot) => renderGearChoice(runtime, preset.slots[slot], slot, side)).join("")}</div>
        <h4 class="build-set-wards-heading">${(0, runtime.deps._t)("액막이")}</h4><div class="build-set-wards">${wards.map((slot) => renderGearChoice(runtime, preset.slots[slot], slot, side)).join("")}</div></section>`;
  }
  function renderSetRunes(runtime, loadout, side) {
    if (!loadout) return '<div class="build-set-legacy"><b>장비 전용 세트</b><p>장비만 불러오고 지금 끼운 스킬룬은 그대로 둡니다.</p><small>다시 저장하면 스킬룬도 함께 저장됩니다.</small></div>';
    if (loadout.invalidReason) return '<p class="build-review-warning">룬 기록을 읽을 수 없습니다. 다시 저장해 주세요.</p>';
    return `<section class="build-set-runes"><h3>${(0, runtime.deps._t)("스킬룬")}</h3><div class="build-set-rune-groups">${runeRows(runtime, loadout).map(([label, choices], index) => `<section class="build-set-rune-group${index < 2 ? " is-primary" : ""}"><h4>${label}</h4><div class="build-set-rune-grid">${renderRuneChoices(runtime, choices, side)}</div></section>`).join("")}</div></section>`;
  }
  function renderSavedSet(runtime, preset, slot) {
    const label = `${runtime.state.LOADOUT_SLOT_NUMERALS[slot]} ${preset?.name || (0, runtime.deps._t)("빈 세트")}`;
    const inspection = runtime.deps.equipmentLoadoutRuntime.inspect(slot);
    const status = !preset ? "빈 저장칸" : inspection.applied ? "착용 중" : "저장된 빌드";
    const contents = preset ? renderSetGear(runtime, preset, label) + renderSetRunes(runtime, preset.runeLoadout, label) : '<div class="build-set-empty"><b>저장된 세트 없음</b><p>현재 장비와 스킬룬을 이 칸에 함께 저장하세요.</p></div>';
    return `<article class="build-set-card is-selected" data-build-set="${slot}" aria-label="${(0, runtime.deps.escapeHTML)(label)}">
        <header class="build-set-heading"><b>${(0, runtime.deps.escapeHTML)(label)}</b><small>${status}</small></header>
        <div class="build-set-contents">${contents}</div>${preset && presetBlocked(runtime, inspection) ? `<p class="build-set-status">${(0, runtime.deps.escapeHTML)(describeLoadoutPresetSlot(runtime, preset, inspection))}</p>` : ""}</article>`;
  }
  function renderSets(runtime, state, index, current) {
    if (runtime.state.review.view !== "current") return renderSavedSet(runtime, state.presets[index], index);
    return `<article class="build-set-card is-current" data-build-set="current" aria-label="${(0, runtime.deps._t)("현재 착용 세트")}">
        <header class="build-set-heading"><b>${(0, runtime.deps._t)("현재 착용 세트")}</b><small>${(0, runtime.deps.escapeHTML)(current.runeLoadout.activeSkill)}</small></header>
        <div class="build-set-contents">${renderSetGear(runtime, current, "현재 장착")}${renderSetRunes(runtime, current.runeLoadout, "현재 장착")}</div></article>`;
  }
  function renderGearChoice(runtime, reference, slot, side) {
    if (!reference) return `<span class="build-set-gear-empty slot-${slot}" aria-label="${(0, runtime.deps._t)("{slot} 빈 칸", { slot: (0, runtime.deps.escapeHTML)(slot) })}"><i aria-hidden="true">-</i><small>${slot === "방패" ? (0, runtime.deps._t)("완갑/보조") : (0, runtime.deps.escapeHTML)(slot)}</small></span>`;
    const item = side === "현재 장착" ? runtime.deps.game.equipment[slot] : runtime.state.review.items.get(reference.instanceId);
    const detail = { kind: "gear", name: item?.name || reference.name, item, slot, side };
    const icon = item ? (0, runtime.deps.renderInventoryItemVisual)(item, "equipment", "build-review-art") : '<span aria-hidden="true">?</span>';
    const note = item ? slot === "방패" ? "완갑/보조" : slot : "미보유";
    return renderChoice(runtime, detail, icon, note, item ? (0, runtime.deps.getRarityColor)(item.rarity) : "#b8ab94");
  }
  function renderRuneChoices(runtime, choices, side) {
    if (!choices) return '<span class="build-review-empty">저장 기록 없음</span>';
    if (!choices.length) return '<span class="build-review-empty">없음</span>';
    return choices.map((choice) => {
      const support = choice.kind === "support";
      const icon = support ? runtime.deps.supportGemSigil.html(choice.name, "build-review-art", choice.tier) : (0, runtime.deps.renderSkillGemArt)(choice.name, "build-review-art", { eager: true });
      const meta = (0, runtime.deps.getGemCardMeta)(runtime.deps.SKILL_DB[choice.name]);
      const colorClass = support ? `is-tone-${runtime.deps.supportGemSigil.tone(choice.name)}` : `element-${meta.className}`;
      return renderChoice(runtime, { ...choice, side, colorClass }, icon, choice.note || meta.elementLabel, "var(--sigil)");
    }).join("");
  }
  function renderChoice(runtime, detail, icon, note, tone) {
    const key = runtime.state.review.details.push(detail) - 1;
    const classes = detail.kind === "gear" ? `build-review-gear slot-${detail.slot}` : `build-review-rune ${detail.colorClass}`;
    return `<button type="button" class="build-review-asset ${classes}" style="--build-tone:${tone}" data-build-detail="${key}" data-info-tooltip-anchor="1"
        aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)("{side}, {name}, {note}, 상세 보기", { side: detail.side, name: detail.name, note }))}" aria-haspopup="dialog">
        <span class="build-review-icon" aria-hidden="true">${icon}</span><span class="build-review-copy"><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(detail.name))}</b>${note ? `<small>${(0, runtime.deps.escapeHTML)(note)}</small>` : ""}</span></button>`;
  }
  function renderReviewIntent(runtime, mode, index, preset) {
    const target = `${runtime.state.LOADOUT_SLOT_NUMERALS[index]} ${preset?.name || (0, runtime.deps._t)("빈 저장칸")}`;
    const direction = mode === "save" ? (0, runtime.deps._t)("현재 빌드 → {target}에 저장", { target }) : (0, runtime.deps._t)("{target} → 현재 빌드로 불러오기", { target });
    const scope = mode === "load" && preset && !preset.runeLoadout ? "장비만 불러오고 지금 끼운 스킬룬은 그대로 둡니다. 새 장비에 맞지 않는 룬은 쉬거나 빠집니다." : "장비, 주 공격, 이동, 소환룬과 수, 보조룬과 선택 등급";
    return `<div class="build-review-intent"><b>${(0, runtime.deps.escapeHTML)(direction)}</b><p>${scope}</p></div>`;
  }
  function renderReviewActions(runtime, mode, index, preset, applied) {
    const numeral = runtime.state.LOADOUT_SLOT_NUMERALS[index];
    const action = mode === "save" ? (0, runtime.deps._t)("{numeral}에 {value}", { numeral, value: preset ? (0, runtime.deps._t)("덮어쓰기") : (0, runtime.deps._t)("새 빌드 저장") }) : (0, runtime.deps._t)("{numeral} 빌드 불러오기", { numeral });
    const disabled = mode === "load" && (!preset || applied);
    return `<div class="build-review-actions"><button type="button" data-build-mode="${mode === "save" ? "load" : "save"}">${mode === "save" ? (0, runtime.deps._t)("불러오기로 전환") : (0, runtime.deps._t)("이 칸에 현재 빌드 저장…")}</button>
        <button type="button" data-build-confirm ${disabled ? "disabled" : ""}>${action}</button></div>`;
  }
  function createRenderReviewBody(runtime) {
    return function renderReviewBody(mode, index, state, current, notice) {
      const preset = state.presets[index], inspection = runtime.deps.equipmentLoadoutRuntime.inspect(index);
      const warning = notice || (presetBlocked(runtime, inspection) ? describeLoadoutPresetSlot(runtime, preset, inspection) : "");
      return `${renderSetNavigation(runtime, state)}<p class="build-review-help">${(0, runtime.deps._t)("아이콘에 마우스를 올리면 상세, 누르면 크게 봅니다.")}</p>
        ${warning ? `<p class="build-review-warning" role="status">${(0, runtime.deps.escapeHTML)(warning)}</p>` : ""}
        ${renderSets(runtime, state, index, current)}<div class="build-review-footer">${renderReviewIntent(runtime, mode, index, preset)}
        ${renderReviewActions(runtime, mode, index, preset, inspection.applied)}</div>
        <p class="build-review-note">${(0, runtime.deps._t)("룬 레벨, 경험치, 해금, 패시브는 저장하거나 되돌리지 않습니다.")}</p>`;
    };
  }
  function openReview(runtime, mode, index, notice = "", view = mode === "save" ? "current" : String(index)) {
    const state = runtime.deps.equipmentLoadoutRuntime.ensureState(), current = currentBuild(runtime);
    const items = (0, runtime.deps.getEquipmentLoadoutOwnedItems)(runtime.deps.game).concat(runtime.deps.game.equipmentTemporaryStorage || []);
    clearReviewHint(runtime);
    runtime.state.review = {
      mode,
      index,
      view,
      owner: runtime.deps.game,
      signature: JSON.stringify([current, state.presets[index]]),
      details: [],
      items: new Map(items.map((item) => [runtime.deps.equipmentLoadoutRuntime.getItemIdentity(item), item]))
    };
    runtime.deps.selectionDialog.show({
      id: runtime.state.REVIEW_ID,
      title: mode === "save" ? "빌드 세트 저장" : "빌드 세트 불러오기",
      panelClass: "build-preset-review",
      body: runtime.handlers.renderReviewBody(mode, index, state, current, notice)
    });
  }
  function onReviewAction(runtime, event) {
    const button = event.target.closest(`#${runtime.state.REVIEW_ID} button`);
    if (!button || !runtime.state.review) return;
    clearReviewHint(runtime);
    if (button.dataset.buildDetail !== void 0) return openChoiceDetails(runtime, button);
    const { mode, index } = runtime.state.review;
    if (button.hasAttribute("data-build-confirm")) return confirmReview(runtime);
    if (button.dataset.buildView === "current") return openReview(runtime, mode, index, "", "current");
    if (button.dataset.buildMode) return openReview(runtime, button.dataset.buildMode, index);
    if (button.dataset.buildSlot !== void 0) {
      const next = Number(button.dataset.buildSlot);
      selectEquipmentLoadoutPreset(runtime, next);
      openReview(runtime, mode, next, "", String(next));
    }
  }
  function supportDetails(runtime, detail) {
    const { name, tier } = detail, stats = (0, runtime.deps.getUiPlayerStats)();
    const info = (0, runtime.deps.getUiGemPresentation)(name, true, stats), def = runtime.deps.SUPPORT_GEM_DB[name];
    return `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)(name)}</div><div class="tooltip-line">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(info.desc) || def.desc)}</div>
        <div class="tooltip-line build-detail-tier">${(0, runtime.deps._t)("선택 등급: {tier}등급, {name}", { tier, name: (0, runtime.deps.escapeHTML)((0, runtime.deps.getSupportTierLabel)(name, tier)) })}</div>
        <div class="tooltip-line">${runtime.deps.statToneText.html(runtime.deps.gemSelectionUi.effectText(name, tier, stats))}</div>
        ${def.tradeoff ? `<div class="tooltip-line">${(0, runtime.deps._t)("대가: {tradeoff}", { tradeoff: (0, runtime.deps.escapeHTML)(def.tradeoff) })}</div>` : ""}
        <div class="tooltip-line">${(0, runtime.deps._t)("공명력 {name}, 현재 룬 Lv.{value}", { name: (0, runtime.deps.getSupportResonanceCostAtTier)(name, tier), value: (0, runtime.deps.formatValue)("", info.totalLevel) })}</div>
        <div class="gem-card-tags gem-tooltip-tags">${(0, runtime.deps.renderGemTagChips)(def, (def.tags || []).length)}</div>`;
  }
  function choiceDetails(runtime, detail) {
    const holder = runtime.deps.document.createElement("div");
    if (detail.kind === "gear") {
      if (detail.item) (0, runtime.deps.showItemTooltip)(null, detail.slot, detail.side === "현재 장착", detail.item, { target: holder });
      else holder.textContent = (0, runtime.deps._t)("{name}: 보유하지 않은 장비입니다. 옵션 정보를 확인할 수 없습니다.", { name: detail.name });
    } else if (detail.kind === "support") holder.innerHTML = supportDetails(runtime, detail);
    else (0, runtime.deps.showGemTooltip)(null, "active", detail.name, holder);
    const gearBasis = detail.item ? "보유 장비의 현재 옵션" : "저장된 이름만 표시합니다.";
    const basis = detail.kind === "gear" ? gearBasis : "룬 수치는 현재 레벨과 능력치 기준";
    return `<p class="build-detail-context">${(0, runtime.deps.escapeHTML)(detail.side)}${detail.note ? `, ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(detail.note))}` : ""}</p>${holder.innerHTML}
        <p class="build-review-note">${basis}</p>`;
  }
  function openChoiceDetails(runtime, button) {
    const detail = runtime.state.review.details[Number(button.dataset.buildDetail)];
    if (!detail) return;
    runtime.deps.selectionDialog.show({ id: "equipment-build-detail", title: (0, runtime.deps._t)("빌드 구성 상세 정보"), panelClass: "build-preset-detail", body: choiceDetails(runtime, detail) });
  }
  function clearReviewHint(runtime) {
    if (!runtime.state.hintButton) return;
    (0, runtime.deps.hideInfoTooltip)();
    runtime.state.hintButton = null;
  }
  function acceptsChoiceHint(runtime, event) {
    return event.type === "focusin" ? event.target.matches(":focus-visible") : event.pointerType === "mouse";
  }
  function onChoiceHint(runtime, event) {
    if (!acceptsChoiceHint(runtime, event)) return;
    const button = event.target.closest(`#${runtime.state.REVIEW_ID} [data-build-detail]`);
    if (!button || !runtime.state.review || runtime.deps.selectionDialog.isOpen("equipment-build-detail")) return;
    const detail = runtime.state.review.details[Number(button.dataset.buildDetail)];
    if (!detail) return;
    const bounds = button.getBoundingClientRect();
    const point = event.type === "focusin" ? { clientX: bounds.left, clientY: bounds.bottom } : event;
    const token = `build-detail:${runtime.state.review.index}:${button.dataset.buildDetail}`;
    if (runtime.state.hintButton === button && (0, runtime.deps.reuseInfoTooltip)(point, token)) return;
    runtime.state.hintButton = button;
    (0, runtime.deps.showInfoTooltipHtml)(point.clientX, point.clientY, choiceDetails(runtime, detail), "#cfad6b", token);
  }
  function onChoiceLeave(runtime, event) {
    if (runtime.state.hintButton?.contains(event.target) && !runtime.state.hintButton.contains(event.relatedTarget)) clearReviewHint(runtime);
  }
  function onReviewDismiss(runtime, event) {
    if (event.type === "keydown" && event.key !== "Escape") return;
    if (event.type === "click" && event.target.closest?.("[data-build-detail]")) return;
    clearReviewHint(runtime);
  }
  function confirmReview(runtime) {
    if (!runtime.state.review || !runtime.deps.selectionDialog.isOpen(runtime.state.REVIEW_ID)) return;
    const { mode, index, owner, signature } = runtime.state.review;
    const latest = JSON.stringify([currentBuild(runtime), runtime.deps.equipmentLoadoutRuntime.ensureState().presets[index]]);
    if (owner !== runtime.deps.game || signature !== latest) return openReview(runtime, mode, index, "구성이 바뀌었습니다. 갱신된 내용을 확인한 뒤 다시 눌러 주세요.");
    const ok = mode === "save" ? commitSave(runtime, index) : commitApply(runtime, index);
    if (!ok) return openReview(runtime, mode, index, runtime.state.actionNotice);
    runtime.deps.selectionDialog.close(runtime.state.REVIEW_ID);
    runtime.state.review = null;
  }
  async function renameEquipmentLoadoutPresetFromUi(runtime) {
    if (!runtime.active) return false;
    let state = runtime.deps.equipmentLoadoutRuntime.ensureState();
    let preset = state.presets[state.selectedSlot];
    if (!preset) return false;
    const request = { owner: runtime.deps.game, index: state.selectedSlot, signature: JSON.stringify(preset) };
    let name = await (0, runtime.deps.requestGameText)("빌드 세팅 이름을 입력하세요.", {
      title: (0, runtime.deps._t)("빌드 세팅 이름"),
      value: preset.name,
      maxlength: 18,
      confirmLabel: (0, runtime.deps._t)("변경")
    });
    if (!name || !loadoutRequestCurrent(runtime, request)) return false;
    if (!runtime.deps.equipmentLoadoutRuntime.rename(request.index, name)) return false;
    if (typeof runtime.deps.queueImportantSave === "function") (0, runtime.deps.queueImportantSave)(100);
    renderEquipmentLoadoutPresetPanel(runtime);
    return true;
  }
  async function clearEquipmentLoadoutPresetFromUi(runtime) {
    if (!runtime.active) return false;
    let state = runtime.deps.equipmentLoadoutRuntime.ensureState();
    let preset = state.presets[state.selectedSlot];
    const request = { owner: runtime.deps.game, index: state.selectedSlot, signature: JSON.stringify(preset) };
    if (!preset || !await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)("[{name}] 빌드 기록을 비웁니다. 보유 장비와 룬은 사라지지 않습니다.", { name: preset.name }), {
      title: (0, runtime.deps._t)("빌드 세팅 비우기"),
      tone: "danger",
      confirmLabel: (0, runtime.deps._t)("기록 비우기")
    })) return false;
    if (!loadoutRequestCurrent(runtime, request)) return false;
    runtime.deps.equipmentLoadoutRuntime.clear(request.index);
    runtime.state.actionNotice = "";
    if (typeof runtime.deps.queueImportantSave === "function") (0, runtime.deps.queueImportantSave)(100);
    (0, runtime.deps.updateStaticUI)();
    return true;
  }
  function loadoutRequestCurrent(runtime, request) {
    if (!runtime.active || runtime.deps.game !== request.owner) return false;
    const state = runtime.deps.equipmentLoadoutRuntime.ensureState();
    return state.selectedSlot === request.index && JSON.stringify(state.presets[request.index]) === request.signature;
  }

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

  // modules/ui/equipment-loadout-view.mjs
  function createEquipmentLoadoutView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { renderEquipmentLoadoutPresetPanel, selectEquipmentLoadoutPreset, pickEquipmentLoadoutPreset, saveEquipmentLoadoutPresetFromUi, renameEquipmentLoadoutPresetFromUi, clearEquipmentLoadoutPresetFromUi, onReviewAction, onChoiceHint, onChoiceLeave, onReviewDismiss, clearReviewHint };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.renderReviewBody = createRenderReviewBody(runtime);
    runtime.api = Object.freeze({
      render: runtime.handlers.renderEquipmentLoadoutPresetPanel,
      select: runtime.handlers.selectEquipmentLoadoutPreset,
      pick: runtime.handlers.pickEquipmentLoadoutPreset,
      save: runtime.handlers.saveEquipmentLoadoutPresetFromUi,
      rename: runtime.handlers.renameEquipmentLoadoutPresetFromUi,
      clear: runtime.handlers.clearEquipmentLoadoutPresetFromUi,
      dispose: () => disposeEquipmentLoadout(runtime)
    });
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.onReviewAction);
    listenView(runtime, runtime.deps.document, "pointerover", runtime.handlers.onChoiceHint);
    listenView(runtime, runtime.deps.document, "pointermove", runtime.handlers.onChoiceHint, { passive: true });
    listenView(runtime, runtime.deps.document, "pointerout", runtime.handlers.onChoiceLeave);
    listenView(runtime, runtime.deps.document, "focusin", runtime.handlers.onChoiceHint);
    listenView(runtime, runtime.deps.document, "focusout", runtime.handlers.onChoiceLeave);
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.onReviewDismiss, true);
    listenView(runtime, runtime.deps.document, "scroll", runtime.handlers.clearReviewHint, true);
    listenView(runtime, runtime.deps.window, "keydown", runtime.handlers.onReviewDismiss, true);
    return runtime.api;
  }
  function disposeEquipmentLoadout(runtime) {
    releaseViewEvents(runtime);
    clearReviewHint(runtime);
    runtime.deps.selectionDialog.close("equipment-build-detail");
    runtime.deps.selectionDialog.close(runtime.state.REVIEW_ID);
    runtime.state.review = null;
  }
  function initialize(runtime) {
    runtime.state.actionNotice = "";
    runtime.state.review = null;
    runtime.state.REVIEW_ID = "equipment-build-review";
    runtime.state.LOADOUT_SLOT_NUMERALS = Object.freeze(["I", "II", "III"]);
    runtime.state.hintButton = null;
  }

  // modules/equipment-loadouts-ui-classic.mjs
  var equipmentLoadoutUi = createEquipmentLoadoutView({
    get _t() {
      return _t;
    },
    get equipmentLoadoutRuntime() {
      return equipmentLoadoutRuntime;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get document() {
      return document;
    },
    get queueImportantSave() {
      return typeof queueImportantSave === "undefined" ? void 0 : queueImportantSave;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get addLog() {
      return addLog;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get clearCraftSelection() {
      return typeof clearCraftSelection === "undefined" ? void 0 : clearCraftSelection;
    },
    get hideItemTooltip() {
      return typeof hideItemTooltip === "undefined" ? void 0 : hideItemTooltip;
    },
    get window() {
      return window;
    },
    get getPaperdollSlots() {
      return getPaperdollSlots;
    },
    get contentProgression() {
      return contentProgression;
    },
    get renderInventoryItemVisual() {
      return renderInventoryItemVisual;
    },
    get getRarityColor() {
      return getRarityColor;
    },
    get supportGemSigil() {
      return supportGemSigil;
    },
    get renderSkillGemArt() {
      return renderSkillGemArt;
    },
    get getGemCardMeta() {
      return getGemCardMeta;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get getEquipmentLoadoutOwnedItems() {
      return getEquipmentLoadoutOwnedItems;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get getUiGemPresentation() {
      return getUiGemPresentation;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get getSupportTierLabel() {
      return getSupportTierLabel;
    },
    get statToneText() {
      return statToneText;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    get getSupportResonanceCostAtTier() {
      return getSupportResonanceCostAtTier;
    },
    get formatValue() {
      return formatValue;
    },
    get renderGemTagChips() {
      return renderGemTagChips;
    },
    get showGemTooltip() {
      return showGemTooltip;
    },
    get showItemTooltip() {
      return showItemTooltip;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get reuseInfoTooltip() {
      return reuseInfoTooltip;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get requestGameText() {
      return requestGameText;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    }
  });
  safeExposeGlobals({ equipmentLoadoutUi });
})();
