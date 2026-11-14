// GENERATED from modules/gem-slot-dialog-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/gem-slot-actions.mjs
  function supportTierRows(runtime, name, stats) {
    const active = (0, runtime.deps.getSupportActiveTier)(name);
    const unlocked = Math.max(1, Math.floor(runtime.deps.game.supportGemData[name].unlockedTier || 1));
    const base = (Number((0, runtime.deps.getUiGemPresentation)(name, true, stats).value) || 0) / (0, runtime.deps.getSupportTierMultiplier)(name, active);
    return [1, 2, 3].slice(0, (0, runtime.deps.getSupportTierCap)(name)).map((tier) => ({
      tier,
      label: (0, runtime.deps.getSupportTierLabel)(name, tier),
      value: runtime.deps.SUPPORT_GEM_DB[name].tierValues?.[tier - 1] ?? base * (0, runtime.deps.getSupportTierMultiplier)(name, tier),
      cost: (0, runtime.deps.getSupportResonanceCostAtTier)(name, tier),
      open: tier <= unlocked,
      active: tier === active
    }));
  }
  function supportTierLineHtml(runtime, name, stats) {
    const rows = supportTierRows(runtime, name, stats);
    if (rows.length < 2) return "";
    const cells = rows.map((row) => `<span class="gem-tier-cell${row.active ? " is-active" : ""}${row.open ? "" : " is-locked"}"><b>${(0, runtime.deps._t)(row.label)}</b>${(0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.effectText(name, row.tier, stats))}<small>${(0, runtime.deps._t)("공명 {cost}{value}", { cost: row.cost, value: row.open ? "" : (0, runtime.deps._t)(", 잠김") })}</small></span>`);
    return `<div class="tooltip-line gem-tier-line">${cells.join("")}</div>`;
  }
  function summonNumbersHtml(runtime, name, stats) {
    const preview = (0, runtime.deps.getSummonTooltipPreview)(name, stats);
    if (!preview) return "";
    return `${(0, runtime.deps._t)("1타")} <b>${preview.hitDamageMin}~${preview.hitDamageMax}</b>${preview.attackPerSecond > 0 ? ` ${(0, runtime.deps._t)("초당")} <b>${preview.attackPerSecond}</b>${(0, runtime.deps._t)("회")}` : ""}`;
  }
  function gemNumbersHtml(runtime, name, stats) {
    if (isSupportSlot(runtime)) {
      return (0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.effectText(name, (0, runtime.deps.getSupportActiveTier)(name), stats));
    }
    const skill = (0, runtime.deps.getUiGemPresentation)(name, false, stats).skill;
    if (skill.tags.some((tag) => ["summon_buff", "summon_guard"].includes(tag))) return (0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.summonEffect(name, stats));
    if ((skill.tags || []).includes("summon_attack")) return summonNumbersHtml(runtime, name, stats);
    return `${(0, runtime.deps._t)("피해")} <b>${(0, runtime.deps.formatPercentMultiplier)(skill.dmg || skill.baseDmg || 1)}</b> ${(0, runtime.deps._t)("공속")} <b>${(0, runtime.deps.formatPercentMultiplier)(skill.spd || skill.baseSpd || 1)}</b>`;
  }
  function supportsInOtherSlots(runtime) {
    return runtime.deps.game.equippedSupports.filter((gem) => gem !== runtime.state.slot.name);
  }
  function slotSupportFailure(runtime, name, stats) {
    const conflict = runtime.deps.window.GameModules.skills.supports.conflictReason(name, runtime.deps.game, runtime.state.slot.name);
    if (conflict) return conflict;
    if (runtime.deps.gemDropRewards.allowsResonanceOverflow(stats)) return "";
    const worn = supportsInOtherSlots(runtime);
    const free = Math.max(0, (0, runtime.deps.getEffectiveResonanceCap)(stats) - worn.reduce((sum, gem) => sum + (0, runtime.deps.getSupportTierResonanceCost)(gem), 0));
    const cost = (0, runtime.deps.getSupportTierResonanceCost)(name);
    return free < cost ? (0, runtime.deps._t)("공명력 {value} 모자람", { value: cost - free }) : "";
  }
  function slotSupportState(runtime, name, stats) {
    if (runtime.deps.game.equippedSupports.includes(name)) return { note: (0, runtime.deps._t)("다른 칸에 장착 중"), blocked: true, rank: 2 };
    if (supportIsFull(runtime, stats)) return { note: (0, runtime.deps._t)("교체할 칸을 선택하세요"), blocked: false, rank: 0 };
    const failure = slotSupportFailure(runtime, name, stats);
    return { note: failure || (0, runtime.deps._t)("공명 {name}", { name: (0, runtime.deps.getSupportTierResonanceCost)(name) }), blocked: !!failure, rank: failure ? 1 : 0 };
  }
  function slotAttackState(runtime, name) {
    if (runtime.state.slot.kind === "summon" && runtime.deps.game.equippedSummonSkills.includes(name)) return { note: (0, runtime.deps._t)("다른 칸에 장착 중"), blocked: true, rank: 2 };
    if (!(0, runtime.deps.canUseSkillWithCurrentEquipment)(name)) return { note: (0, runtime.deps.getSkillRuneWeaponNote)(name), blocked: true, rank: 1 };
    return { note: (0, runtime.deps.getGemTileSummary)(name, runtime.deps.SKILL_DB[name]), blocked: false, rank: 0 };
  }
  function slotArtHtml(runtime, name, className, eager) {
    if (isSupportSlot(runtime)) return runtime.deps.supportGemSigil.html(name, className, (0, runtime.deps.getSupportActiveTier)(name));
    return (0, runtime.deps.renderSkillGemArt)(name, className, { eager });
  }
  function slotCardHtml(runtime, name, stats, state) {
    if (isSupportSlot(runtime)) return supportCandidateHtml(runtime, name, stats, state);
    const level = (0, runtime.deps.getUiGemPresentation)(name, isSupportSlot(runtime), stats).totalLevel;
    return `<button type="button" class="gem-slot-card${slotToneClass(runtime, name)}${state.blocked ? " is-blocked" : ""}" data-slot-gem="${(0, runtime.deps.escapeHTML)(name)}" aria-disabled="${state.blocked}" ${runtime.state.HINT_HANDLERS}>
            ${slotArtHtml(runtime, name, "gem-slot-card-art", false)}<span class="gem-slot-card-copy"><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}${level ? `<small>Lv.${(0, runtime.deps.formatValue)("", level)}</small>` : ""}${!isSupportSlot(runtime) && runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) ? `<small>×${runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) + 1}</small>` : ""}</strong>
            <span class="gem-slot-numbers">${gemNumbersHtml(runtime, name, stats)}</span><em>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(state.note))}</em></span></button>`;
  }
  function candidateTierButtons(runtime, name, stats) {
    const free = (0, runtime.deps.getEffectiveResonanceCap)(stats) - supportsInOtherSlots(runtime).reduce((sum, gem) => sum + (0, runtime.deps.getSupportTierResonanceCost)(gem), 0);
    const canOverflow = runtime.deps.gemDropRewards.allowsResonanceOverflow(stats);
    return `<div class="support-candidate-tiers" role="group" aria-label="${(0, runtime.deps._t)("{name} 등급", { name: (0, runtime.deps.escapeHTML)(name) })}">${supportTierRows(runtime, name, stats).map((row) => `<button type="button" data-slot-action="candidate-tier" data-name="${(0, runtime.deps.escapeHTML)(name)}" data-tier="${row.tier}" aria-pressed="${row.active}"${row.open ? "" : " disabled"} class="${row.open && (canOverflow || row.cost <= free) ? "is-affordable" : ""}"><b>${(0, runtime.deps._t)(row.label)}</b><small>${row.open ? (0, runtime.deps._t)("공명 {cost}", { cost: row.cost }) : (0, runtime.deps._t)("잠김")}</small></button>`).join("")}</div>`;
  }
  function candidateComparison(runtime, name) {
    if (runtime.deps.game.equippedSupports.includes(name)) return '<span class="support-compare-note">다른 칸에 장착 중</span>';
    const def = runtime.deps.SUPPORT_GEM_DB[name];
    if (def.nonDps) return '<span class="support-nondps">DPS 밖 효과</span>';
    if (!runtime.state.slot.name && supportIsFull(runtime, (0, runtime.deps.getUiPlayerStats)())) return '<span class="support-compare-note">교체할 칸을 고르면 DPS를 비교합니다.</span>';
    return runtime.deps.gemSelectionUi.compareHtml("support", name, runtime.state.slot.name);
  }
  function supportCandidateHtml(runtime, name, stats, state) {
    const level = (0, runtime.deps.getUiGemPresentation)(name, true, stats).totalLevel;
    const def = runtime.deps.SUPPORT_GEM_DB[name];
    return `<article class="gem-slot-card support-candidate${slotToneClass(runtime, name)}${runtime.state.slot.preview === name ? " is-preview" : ""}" data-support-candidate="${(0, runtime.deps.escapeHTML)(name)}">
            <button type="button" class="support-candidate-heading" data-slot-action="preview" data-name="${(0, runtime.deps.escapeHTML)(name)}">${slotArtHtml(runtime, name, "gem-slot-card-art", false)}<span><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</strong><small>${(0, runtime.deps._t)("Lv.{value}, 공명 {name}", { value: (0, runtime.deps.formatValue)("", level), name: (0, runtime.deps.getSupportTierResonanceCost)(name) })}</small></span>${runtime.deps.gemSelectionUi.indicators(name, runtime.state.slot.name)}</button>
            <p class="support-candidate-effect">${gemNumbersHtml(runtime, name, stats)}</p>${def.tradeoff ? `<p class="support-tradeoff">${(0, runtime.deps._t)("대가: {tradeoff}", { tradeoff: (0, runtime.deps.escapeHTML)(def.tradeoff) })}</p>` : ""}
            ${runtime.deps.gemSelectionUi.targetDetails(name, stats, runtime.state.slot.name)}${candidateComparison(runtime, name)}${candidateTierButtons(runtime, name, stats)}
            <div class="support-candidate-bottom"><small class="${state.blocked ? "is-short" : ""}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(state.note))}</small><button type="button" data-slot-action="choose" data-name="${(0, runtime.deps.escapeHTML)(name)}" ${state.blocked ? "disabled" : ""}>${runtime.state.slot.name || supportIsFull(runtime, stats) ? (0, runtime.deps._t)("바꾸기") : (0, runtime.deps._t)("장착")}</button></div></article>`;
  }
  function slotCandidates(runtime) {
    if (isSupportSlot(runtime)) return runtime.deps.game.supports.filter((name) => name !== runtime.state.slot.name);
    return runtime.deps.game.skills.filter((name) => name !== runtime.state.slot.name && fitsSlot(runtime, name));
  }
  function fitsSlot(runtime, name) {
    const kind = runtime.deps.skillGemBoardUi.kindOf(name);
    return kind === runtime.state.slot.kind || runtime.state.slot.kind === "active" && kind === "mobility" && (0, runtime.deps.isMobilityRuneAttackWorn)(runtime.deps.game);
  }
  function slotListHtml(runtime, stats) {
    const definitions = isSupportSlot(runtime) ? runtime.deps.SUPPORT_GEM_DB : runtime.deps.SKILL_DB;
    const rows = slotCandidates(runtime).filter((name) => (0, runtime.deps.matchSearchQuery)(runtime.deps.window.getGemSearchText(name, definitions[name]), runtime.state.slot.query)).map((name) => candidateRow(runtime, name, stats)).sort((a, b) => b.count - a.count || b.dps - a.dps || a.state.rank - b.state.rank);
    if (!rows.length) return '<p class="gem-slot-empty">조건에 맞는 룬이 없습니다.</p>';
    const render = (row) => slotCardHtml(runtime, row.name, stats, row.state);
    if (!isSupportSlot(runtime)) return rows.map(render).join("");
    const matched = rows.filter((row) => row.count > 0), unmatched = rows.filter((row) => !row.count);
    return matched.map(render).join("") + (unmatched.length ? `<details class="support-unmatched"><summary>${(0, runtime.deps._t)("지금 장착한 스킬에 안 맞음 ({length})", { length: unmatched.length })}</summary><div class="support-unmatched-grid">${unmatched.map(render).join("")}</div></details>` : "");
  }
  function candidateRow(runtime, name, stats) {
    const state = slotGemState(runtime, name, stats);
    const count = isSupportSlot(runtime) ? runtime.deps.gemSelectionUi.targetCount(name, runtime.state.slot.name) : 1;
    const canCompare = isSupportSlot(runtime) && count && !runtime.deps.SUPPORT_GEM_DB[name].nonDps && !supportIsFull(runtime, stats);
    const preview = canCompare ? runtime.deps.gemSelectionUi.preview("support", name, runtime.state.slot.name) : null;
    return { name, state, count, dps: preview ? preview.after.totalDps - preview.before.totalDps : 0 };
  }
  function slotTierButtons(runtime, name, stats) {
    const rows = supportTierRows(runtime, name, stats);
    if (rows.length < 2) return "";
    const buttons = rows.map((row) => `<button type="button" class="gem-slot-tier" data-slot-action="tier" data-tier="${row.tier}" aria-pressed="${row.active}" ${row.open ? "" : "disabled"}>
            <b>${(0, runtime.deps._t)(row.label)}</b><small>${row.open ? (0, runtime.deps._t)("공명 {cost}", { cost: row.cost }) : (0, runtime.deps._t)("잠김")}</small></button>`).join("");
    return `<div class="gem-slot-tiers" role="group" aria-label="${(0, runtime.deps._t)("보조스킬룬 등급")}">${buttons}</div>`;
  }
  function slotCountButtons(runtime, name) {
    if (!runtime.deps.SKILL_DB[name].tags.includes("summon_attack")) return '<span class="gem-slot-count">소환 한도 1칸 사용</span>';
    return `<span class="gem-slot-count"><button type="button" data-slot-action="summon-less" aria-label="${(0, runtime.deps._t)("소환 하나 줄이기")}">−</button><b>${(0, runtime.deps._t)("{name}기", { name: (0, runtime.deps.getSummonSkillCount)(name) })}</b><button type="button" data-slot-action="summon-more" aria-label="${(0, runtime.deps._t)("소환 하나 늘리기")}">+</button></span>`;
  }
  function slotEnhanceButton(runtime, name) {
    const ready = runtime.deps.game.gemEnhanceUnlocked && (0, runtime.deps.getEquippedEnhanceableGemNames)().includes(name);
    return ready ? '<button type="button" data-slot-action="enhance">강화와 각인</button>' : "";
  }
  function slotReachText(runtime, name, stats) {
    return isSupportSlot(runtime) ? runtime.deps.gemSelectionUi.application(name, stats) : (0, runtime.deps.getGemTileSummary)(name, runtime.deps.SKILL_DB[name]);
  }
  function slotCurrentHtml(runtime, stats) {
    const name = runtime.state.slot.name;
    if (!name) return '<div class="gem-slot-current is-empty"><strong>비어 있는 칸</strong><p>아래에서 낄 룬을 고르세요.</p></div>';
    const info = (0, runtime.deps.getUiGemPresentation)(name, isSupportSlot(runtime), stats);
    return `<div class="gem-slot-current${slotToneClass(runtime, name)}">
            <div class="gem-slot-current-main" data-slot-gem="${(0, runtime.deps.escapeHTML)(name)}" ${runtime.state.HINT_HANDLERS}>${slotArtHtml(runtime, name, "gem-slot-current-art", true)}
                <div class="gem-slot-current-copy"><small>${(0, runtime.deps._t)("지금 낀 룬")}</small><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}${info.totalLevel ? `<i>Lv.${(0, runtime.deps.formatValue)("", info.totalLevel)}</i>` : ""}</strong>
                <span class="gem-slot-numbers">${gemNumbersHtml(runtime, name, stats)}</span><p>${runtime.deps.statToneText.html((0, runtime.deps._t)(info.desc) || "")}</p><em>${(0, runtime.deps.escapeHTML)(slotReachText(runtime, name, stats))}</em></div></div>
            <div class="gem-slot-controls">${runtime.state.CONTROLS[runtime.state.slot.kind](name, stats)}</div>${isSupportSlot(runtime) ? runtime.deps.gemSelectionUi.targetDetails(name, stats) : runtime.deps.gemSelectionUi.skillSummary(runtime.state.slot.kind, name, stats)}</div>`;
  }
  function dpsChangeChip(runtime, now) {
    if (runtime.state.slot.before === null || runtime.state.slot.before <= 0 || Math.abs(now - runtime.state.slot.before) < 1) return "";
    const up = now > runtime.state.slot.before;
    return `<em class="${up ? "is-up" : "is-down"}">${up ? "▲" : "▼"}${Math.abs(Math.round((now - runtime.state.slot.before) / runtime.state.slot.before * 100))}%</em>`;
  }
  function slotHeadHtml(runtime, stats) {
    const parts = [`<span>DPS <b>${wholeNumber(runtime, stats.dps)}</b>${dpsChangeChip(runtime, stats.dps || 0)}</span>`];
    if (stats.summonDps > 0) parts.push(`<span>소환 DPS <b>${wholeNumber(runtime, stats.summonDps)}</b></span>`);
    if (isSupportSlot(runtime)) {
      const cap = (0, runtime.deps.getEffectiveResonanceCap)(stats), used = runtime.deps.game.equippedSupports.reduce((sum, gem) => sum + (0, runtime.deps.getSupportTierResonanceCost)(gem), 0);
      parts.push(`<span>공명력 <b>${used}</b> / ${cap}</span>`, `<span>칸 <b>${runtime.deps.game.equippedSupports.length}</b> / ${Math.floor(stats.suppCap || 0)}</span>`);
    }
    if (runtime.state.slot.kind === "summon") parts.push(`<span>소환수 <b>${(0, runtime.deps.getEquippedSummonCount)()}</b> / ${(0, runtime.deps.getSummonEquipCapFromStats)(stats)}</span>`);
    return `<div class="gem-slot-head">${parts.join("")}</div>${isSupportSlot(runtime) ? resonancePreview(runtime, stats) : ""}`;
  }
  function resonancePreview(runtime, stats) {
    const cap = (0, runtime.deps.getEffectiveResonanceCap)(stats);
    const used = supportsInOtherSlots(runtime).reduce((sum, name) => sum + (0, runtime.deps.getSupportTierResonanceCost)(name), 0);
    const cost = runtime.state.slot.preview ? (0, runtime.deps.getSupportTierResonanceCost)(runtime.state.slot.preview) : 0;
    const width = (value) => cap ? Math.min(100, value / cap * 100) : 0;
    const overflow = Math.max(0, used + cost - cap);
    const budgetNote = overflow ? (0, runtime.deps._t)(runtime.deps.gemDropRewards.allowsResonanceOverflow(stats) ? ", 모든 저항 -{value}%p" : ", 공명력 {value} 모자람", { value: overflow }) : "";
    const caption = runtime.state.slot.preview ? `${(0, runtime.deps._t)("{name} 선택", { name: (0, runtime.deps._t)(runtime.state.slot.preview) })}, ${used + cost}/${cap}${budgetNote}` : (0, runtime.deps._t)("후보 이름을 누르면 공명 비용을 미리 봅니다.");
    return `<div class="support-budget-preview"><div class="support-budget-track"><i style="width:${width(used)}%"></i><em style="left:${width(used)}%;width:${Math.min(100 - width(used), width(cost))}%"></em></div><small>${(0, runtime.deps.escapeHTML)(caption)}</small></div>`;
  }
  function replacementHtml(runtime, stats) {
    if (!runtime.state.slot.pending) return supportIsFull(runtime, stats) ? '<p class="support-full-banner">보조 칸이 차서 후보의 ‘바꾸기’로 교체할 칸을 고릅니다.</p>' : "";
    return `<section class="support-replacement"><b>${(0, runtime.deps._t)("{pending}: 교체할 칸 선택", { pending: (0, runtime.deps.escapeHTML)(runtime.state.slot.pending) })}</b><div>${runtime.deps.game.equippedSupports.map((name) => `<button type="button" data-slot-action="replace-slot" data-name="${(0, runtime.deps.escapeHTML)(name)}">${(0, runtime.deps.escapeHTML)(name)}<small>${(0, runtime.deps._t)("공명 {name} 반환", { name: (0, runtime.deps.getSupportTierResonanceCost)(name) })}</small></button>`).join("")}</div><button type="button" data-slot-action="cancel-replace">${(0, runtime.deps._t)("취소")}</button></section>`;
  }
  function renderSlotDialog(runtime) {
    const stats = (0, runtime.deps.getUiPlayerStats)();
    const list = runtime.deps.document.getElementById("gem-slot-grid"), scroll = list ? list.scrollTop : 0;
    const body = `${slotHeadHtml(runtime, stats)}${slotCurrentHtml(runtime, stats)}${isSupportSlot(runtime) ? replacementHtml(runtime, stats) : ""}
            <div class="gem-slot-list-head"><b>${runtime.state.slot.name ? (0, runtime.deps._t)("바꿔 낄 룬") : (0, runtime.deps._t)("낄 룬")}</b>
                <input type="search" id="gem-slot-search" class="gem-slot-search" placeholder="${(0, runtime.deps._t)("이름, 효과 검색")}" aria-label="${(0, runtime.deps._t)("룬 검색")}" value="${(0, runtime.deps.escapeHTML)(runtime.state.slot.query)}"></div>
            <div class="gem-slot-grid" id="gem-slot-grid">${slotListHtml(runtime, stats)}</div>`;
    runtime.deps.selectionDialog.show({ id: runtime.state.DIALOG_ID, title: runtime.state.TITLES[runtime.state.slot.kind], panelClass: `gem-slot-panel is-kind-${runtime.state.slot.kind}`, body });
    runtime.deps.document.getElementById("gem-slot-grid").scrollTop = scroll;
  }
  function openSlotDialog(runtime, kind, name, preview) {
    if (!runtime.active) return;
    (0, runtime.deps.normalizeSupportLoadout)(false);
    (0, runtime.deps.normalizeEquippedSummonAttackSkills)();
    runtime.state.slot = { owner: runtime.deps.game, kind, name: name || "", query: "", before: null, preview: preview || "", pending: "" };
    (0, runtime.deps.hideInfoTooltip)();
    renderSlotDialog(runtime);
  }
  function swapSlotSupport(runtime, name) {
    const old = runtime.state.slot.name, place = runtime.deps.game.equippedSupports.indexOf(old);
    if (old) (0, runtime.deps.toggleSupport)(old);
    if (runtime.deps.game.equippedSupports.includes(old)) return;
    (0, runtime.deps.toggleSupport)(name);
    if (!runtime.deps.game.equippedSupports.includes(name)) {
      if (old) (0, runtime.deps.toggleSupport)(old);
      return;
    }
    if (place >= 0) runtime.deps.game.equippedSupports.splice(place, 0, runtime.deps.game.equippedSupports.pop());
    runtime.state.slot.name = name;
  }
  function swapSlotSummon(runtime, name) {
    const old = runtime.state.slot.name, count = old ? (0, runtime.deps.getSummonSkillCount)(old) : 1;
    if (old) (0, runtime.deps.changeSkill)(old);
    if (runtime.deps.game.equippedSummonSkills.includes(old)) return;
    for (let i = 0; i < count; i++) (0, runtime.deps.changeSummonSkillCount)(name, 1);
    if (runtime.deps.game.equippedSummonSkills.includes(name)) runtime.state.slot.name = name;
  }
  function chooseSlotGem(runtime, name) {
    if (isSupportSlot(runtime)) {
      if (supportIsFull(runtime, (0, runtime.deps.getUiPlayerStats)())) {
        runtime.state.slot.pending = name;
        runtime.state.slot.preview = name;
        return;
      }
      if (slotSupportFailure(runtime, name, (0, runtime.deps.getUiPlayerStats)())) return;
      swapSlotSupport(runtime, name);
    } else if (runtime.state.slot.kind === "summon") swapSlotSummon(runtime, name);
    else {
      if (runtime.state.slot.kind === "active" && runtime.deps.game.mobilitySkill === name) (0, runtime.deps.wearMobilityGem)("");
      (0, runtime.deps.changeSkill)(name, runtime.state.slot.kind);
    }
  }
  function settleSlot(runtime) {
    if (runtime.state.slot.kind === "active") runtime.state.slot.name = runtime.deps.game.activeSkill || "기본 공격";
    else if (runtime.state.slot.kind === "mobility") runtime.state.slot.name = runtime.deps.mobilitySkill.equipped();
    else if (!(isSupportSlot(runtime) ? runtime.deps.game.equippedSupports : runtime.deps.game.equippedSummonSkills).includes(runtime.state.slot.name)) runtime.state.slot.name = "";
  }
  function runSlotChange(runtime, change) {
    const before = (0, runtime.deps.getUiPlayerStats)().dps || 0;
    (0, runtime.deps.hideInfoTooltip)();
    change();
    if (!runtime.deps.selectionDialog.isOpen(runtime.state.DIALOG_ID)) return;
    settleSlot(runtime);
    runtime.state.slot.before = before;
    renderSlotDialog(runtime);
  }
  function onSlotDialogClick(runtime, event) {
    if (!currentGemSlot(runtime)) return;
    if (!runtime.state.slot || !event.target.closest(`#${runtime.state.DIALOG_ID}`)) return;
    const action = event.target.closest("[data-slot-action]");
    if (action) {
      runSlotChange(runtime, () => runtime.state.ACTIONS[action.dataset.slotAction](action));
      return;
    }
    const card = event.target.closest(".gem-slot-grid [data-slot-gem]");
    if (card && card.getAttribute("aria-disabled") !== "true") runSlotChange(runtime, () => chooseSlotGem(runtime, card.dataset.slotGem));
  }
  function onSlotSearchInput(runtime, event) {
    if (!currentGemSlot(runtime)) return;
    if (!runtime.state.slot || event.target.id !== "gem-slot-search") return;
    runtime.state.slot.query = event.target.value;
    runtime.deps.document.getElementById("gem-slot-grid").innerHTML = slotListHtml(runtime, (0, runtime.deps.getUiPlayerStats)());
  }
  function slotGemHint(runtime, event, element) {
    if (!currentGemSlot(runtime)) return;
    if (event.pointerType !== "mouse" || !runtime.state.slot || !runtime.deps.window.matchMedia("(hover: hover)").matches) return;
    const name = element.dataset.slotGem, type = isSupportSlot(runtime) ? "support" : "active";
    const holder = runtime.deps.document.createElement("div");
    (0, runtime.deps.showGemTooltip)(null, type, name, holder);
    const candidate = name !== runtime.state.slot.name && element.getAttribute("aria-disabled") !== "true";
    const compare = candidate ? runtime.deps.gemSelectionUi.compareHtml(type, name, runtime.state.slot.name) : "";
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, holder.innerHTML + compare, runtime.state.BORDERS[type === "support" ? "support" : "attack"], `slot:${runtime.state.slot.kind}:${name}`);
  }
  function isSupportSlot(runtime) {
    return runtime.state.slot.kind === "support";
  }
  function wholeNumber(runtime, value) {
    return Math.floor(Number(value) || 0).toLocaleString(runtime.deps.i18n.locale);
  }
  function supportIsFull(runtime, stats) {
    return !runtime.state.slot.name && runtime.deps.game.equippedSupports.length >= Math.floor(stats.suppCap || 0);
  }
  function slotGemState(runtime, name, stats) {
    return isSupportSlot(runtime) ? slotSupportState(runtime, name, stats) : slotAttackState(runtime, name);
  }
  function slotToneClass(runtime, name) {
    return isSupportSlot(runtime) ? ` is-tone-${runtime.deps.supportGemSigil.tone(name)}` : ` element-${(0, runtime.deps.getGemCardMeta)(runtime.deps.SKILL_DB[name]).className}`;
  }
  function currentGemSlot(runtime) {
    if (!runtime.active || !runtime.state.slot) return false;
    if (runtime.state.slot.owner === runtime.deps.game) return true;
    runtime.deps.selectionDialog.close(runtime.state.DIALOG_ID);
    runtime.state.slot = null;
    return false;
  }

  // modules/ui/gem-slot-view.mjs
  function createGemSlotView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { openSlotDialog, slotGemHint, supportTierLineHtml, onSlotDialogClick, onSlotSearchInput };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ open: runtime.handlers.openSlotDialog, hint: runtime.handlers.slotGemHint, tierLineHtml: runtime.handlers.supportTierLineHtml, dispose: () => disposeGemSlot(runtime) });
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.onSlotDialogClick);
    listenView(runtime, runtime.deps.document, "input", runtime.handlers.onSlotSearchInput);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.DIALOG_ID = "gem-slot-dialog";
    runtime.state.TITLES = Object.freeze({ active: "주 공격 칸", mobility: "이동 칸", summon: "소환 칸", support: "보조스킬룬 칸" });
    runtime.state.BORDERS = Object.freeze({ support: "#2bcbba", attack: "#ff5252" });
    runtime.state.slot = null;
    runtime.state.HINT_HANDLERS = 'data-info-tooltip-anchor="1" onpointerenter="gemSlotDialog.hint(event,this)" onpointerleave="hideInfoTooltip()"';
    runtime.state.OFF_BUTTON = '<button type="button" data-slot-action="off">장착 해제</button>';
    runtime.state.CONTROLS = Object.freeze({
      support: (name, stats) => `${slotTierButtons(runtime, name, stats)}<div class="gem-slot-buttons">${runtime.state.OFF_BUTTON}</div>`,
      summon: (name) => `<div class="gem-slot-buttons">${slotCountButtons(runtime, name)}${slotEnhanceButton(runtime, name)}${runtime.state.OFF_BUTTON}</div>`,
      mobility: (name) => `<div class="gem-slot-buttons">${slotEnhanceButton(runtime, name)}${runtime.state.OFF_BUTTON}</div>`,
      active: (name) => `<div class="gem-slot-buttons">${slotEnhanceButton(runtime, name)}</div>`
    });
    runtime.state.ACTIONS = Object.freeze({
      tier: (button) => (0, runtime.deps.setSupportActiveTier)(runtime.state.slot.name, Number(button.dataset.tier)),
      off: () => isSupportSlot(runtime) ? (0, runtime.deps.toggleSupport)(runtime.state.slot.name) : (0, runtime.deps.changeSkill)(runtime.state.slot.name),
      enhance: () => {
        runtime.deps.selectionDialog.close(runtime.state.DIALOG_ID);
        (0, runtime.deps.openEquippedGemManagement)(runtime.state.slot.name);
      },
      "summon-more": () => (0, runtime.deps.changeSummonSkillCount)(runtime.state.slot.name, 1),
      "summon-less": () => (0, runtime.deps.changeSummonSkillCount)(runtime.state.slot.name, -1),
      choose: (button) => chooseSlotGem(runtime, button.dataset.name),
      preview: (button) => {
        runtime.state.slot.preview = button.dataset.name;
      },
      "candidate-tier": (button) => {
        (0, runtime.deps.setSupportActiveTier)(button.dataset.name, Number(button.dataset.tier));
        runtime.state.slot.preview = button.dataset.name;
      },
      "replace-slot": (button) => {
        runtime.state.slot.name = button.dataset.name;
        runtime.state.slot.preview = runtime.state.slot.pending;
        runtime.state.slot.pending = "";
      },
      "cancel-replace": () => {
        runtime.state.slot.pending = "";
      }
    });
  }
  function disposeGemSlot(runtime) {
    releaseViewEvents(runtime);
    runtime.deps.selectionDialog.close(runtime.state.DIALOG_ID);
    runtime.state.slot = null;
  }

  // modules/gem-slot-dialog-ui-classic.mjs
  var gemSlotDialog = createGemSlotView({
    get getSupportActiveTier() {
      return getSupportActiveTier;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getUiGemPresentation() {
      return getUiGemPresentation;
    },
    get getSupportTierMultiplier() {
      return getSupportTierMultiplier;
    },
    get getSupportTierCap() {
      return getSupportTierCap;
    },
    get getSupportTierLabel() {
      return getSupportTierLabel;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get getSupportResonanceCostAtTier() {
      return getSupportResonanceCostAtTier;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    get getSummonTooltipPreview() {
      return getSummonTooltipPreview;
    },
    get formatPercentMultiplier() {
      return formatPercentMultiplier;
    },
    get window() {
      return window;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get getEffectiveResonanceCap() {
      return getEffectiveResonanceCap;
    },
    get getSupportTierResonanceCost() {
      return getSupportTierResonanceCost;
    },
    get canUseSkillWithCurrentEquipment() {
      return canUseSkillWithCurrentEquipment;
    },
    get getSkillRuneWeaponNote() {
      return getSkillRuneWeaponNote;
    },
    get getGemTileSummary() {
      return getGemTileSummary;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get supportGemSigil() {
      return supportGemSigil;
    },
    get renderSkillGemArt() {
      return renderSkillGemArt;
    },
    get formatValue() {
      return formatValue;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get skillGemBoardUi() {
      return skillGemBoardUi;
    },
    get isMobilityRuneAttackWorn() {
      return isMobilityRuneAttackWorn;
    },
    get matchSearchQuery() {
      return matchSearchQuery;
    },
    get getSummonSkillCount() {
      return getSummonSkillCount;
    },
    get getEquippedEnhanceableGemNames() {
      return getEquippedEnhanceableGemNames;
    },
    get statToneText() {
      return statToneText;
    },
    get getEquippedSummonCount() {
      return getEquippedSummonCount;
    },
    get getSummonEquipCapFromStats() {
      return getSummonEquipCapFromStats;
    },
    get document() {
      return document;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get normalizeSupportLoadout() {
      return normalizeSupportLoadout;
    },
    get normalizeEquippedSummonAttackSkills() {
      return normalizeEquippedSummonAttackSkills;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get toggleSupport() {
      return toggleSupport;
    },
    get changeSkill() {
      return changeSkill;
    },
    get changeSummonSkillCount() {
      return changeSummonSkillCount;
    },
    get wearMobilityGem() {
      return wearMobilityGem;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get showGemTooltip() {
      return showGemTooltip;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get i18n() {
      return i18n;
    },
    get getGemCardMeta() {
      return getGemCardMeta;
    },
    get setSupportActiveTier() {
      return setSupportActiveTier;
    },
    get openEquippedGemManagement() {
      return openEquippedGemManagement;
    }
  });
  safeExposeGlobals({ gemSlotDialog });
})();
