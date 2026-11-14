// GENERATED from modules/skills-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/skill-library-actions.mjs
  function renderGemUpgradeButton(runtime, upgrade, currentLevel) {
    let details = upgrade.done ? "최대 단계" : upgrade.details;
    if (!upgrade.done && upgrade.gain) details += (0, runtime.deps._t)(", 적용 후 최종 Lv.{value}", { value: currentLevel + upgrade.gain });
    return `<button class="gem-upgrade-btn ${upgrade.done ? "done" : ""}" onclick="${(0, runtime.deps.escapeHTML)(upgrade.action)}" ${upgrade.ready && !upgrade.done ? "" : "disabled"}><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(upgrade.title))}${upgrade.done ? (0, runtime.deps._t)(" 완료") : ""}</strong><small>${(0, runtime.deps.escapeHTML)(details)}</small></button>`;
  }
  function createRenderGemLibrary(runtime) {
    return function renderGemLibrary(kind, owned, sealed, stats, filter) {
      const support = kind === "support";
      const slotKind = support ? null : runtime.deps.skillGemBoardUi.currentKind();
      const fold = support ? runtime.deps.game.gemFoldInactiveSupport : runtime.deps.game.gemFoldInactiveAttack;
      const definitions = support ? runtime.deps.SUPPORT_GEM_DB : runtime.deps.SKILL_DB;
      const records = owned.map((name) => ({ name, sealed: false })).concat(sealed.map((name) => ({ name, sealed: true }))).filter((record) => {
        if (slotKind && runtime.deps.skillGemBoardUi.kindOf(record.name) !== slotKind) return false;
        const active = !record.sealed && (support ? runtime.deps.game.equippedSupports.includes(record.name) : [runtime.deps.game.activeSkill, runtime.deps.game.mobilitySkill].includes(record.name) || (runtime.deps.game.equippedSummonSkills || []).includes(record.name));
        return runtime.deps.window.isGemLibraryMatchVisible(runtime.deps.window.getGemSearchText(record.name, definitions[record.name] || {}), filter, fold, active);
      });
      const state = runtime.state.libraryPages[kind];
      if (support) return renderSupportLibrary(runtime, records, stats, filter);
      const query = JSON.stringify([filter || "", !!fold, slotKind]);
      if (state.query !== query) {
        state.index = 0;
        state.query = query;
      }
      const mobile = runtime.deps.uiDisplay.matches("(max-width: 1080px)");
      const count = Math.max(1, Math.ceil(records.length / runtime.state.MOBILE_PAGE_SIZE));
      state.index = Math.min(state.index, count - 1);
      const visible = mobile ? records.slice(state.index * runtime.state.MOBILE_PAGE_SIZE, (state.index + 1) * runtime.state.MOBILE_PAGE_SIZE) : records;
      const cards = visible.map((record) => {
        const label = runtime.deps.window.highlightSearchText((0, runtime.deps._t)(record.name), filter);
        return record.sealed ? renderSealedRuneTile(runtime, record.name, label, false, stats) : withTileSeal(runtime, (0, runtime.deps.renderAttackGemCard)(record.name, label, stats), false, record.name);
      }).join("");
      if (!mobile || records.length <= runtime.state.MOBILE_PAGE_SIZE) return cards;
      return renderLibraryPager(runtime, kind, state.index, count, records.length) + cards;
    };
  }
  function renderSupportLibrary(runtime, records, stats, filter) {
    const full = runtime.deps.game.equippedSupports.length >= Math.floor(stats.suppCap || 0);
    const rows = records.map((record) => supportLibraryRow(runtime, record, full, stats));
    rows.sort((a, b) => b.targets - a.targets || b.dps - a.dps);
    const card = (row) => row.sealed ? renderSealedRuneTile(runtime, row.name, runtime.deps.window.highlightSearchText((0, runtime.deps._t)(row.name), filter), true, stats) : withTileSeal(runtime, (0, runtime.deps.renderSupportGemCard)(row.name, runtime.deps.window.highlightSearchText((0, runtime.deps._t)(row.name), filter), stats), true, row.name);
    const matched = rows.filter((row) => row.targets > 0), unmatched = rows.filter((row) => row.targets === 0);
    const banner = full ? '<p class="support-full-banner">보조 칸이 차서 룬을 고르면 바꿀 칸을 고릅니다.</p>' : "";
    return banner + matched.map(card).join("") + (unmatched.length ? `<details class="support-unmatched"><summary>${(0, runtime.deps._t)("지금 장착한 스킬에 안 맞음 ({length})", { length: unmatched.length })}</summary><div class="support-library-unmatched">${unmatched.map(card).join("")}</div></details>` : "");
  }
  function supportLibraryRow(runtime, record, full, stats) {
    const targets = runtime.deps.gemSelectionUi.targetCount(record.name);
    const compare = !full && !record.sealed && !runtime.deps.game.equippedSupports.includes(record.name) && targets > 0;
    return { ...record, targets, dps: compare ? supportDpsGain(runtime, record.name, stats) : 0 };
  }
  function supportDpsGain(runtime, name, stats) {
    const key = [name, stats.totalDps, runtime.deps.game.activeSkill, runtime.deps.game.mobilitySkill, ...runtime.deps.game.equippedSupports, "|", ...runtime.deps.game.equippedSummonSkills || []].join(",");
    if (!runtime.state.supportDpsGains.has(key)) {
      if (runtime.state.supportDpsGains.size > 500) runtime.state.supportDpsGains.clear();
      const preview = runtime.deps.gemSelectionUi.preview("support", name);
      runtime.state.supportDpsGains.set(key, preview.after.totalDps - preview.before.totalDps);
    }
    return runtime.state.supportDpsGains.get(key);
  }
  function renderLibraryPager(runtime, kind, index, count, total) {
    return '<nav class="gem-library-pager" aria-label="' + (kind === "support" ? "보조" : "공격") + ' 룬 페이지"><button type="button" data-gem-page="' + kind + '" data-step="-1"' + (index === 0 ? " disabled" : "") + '>이전</button><span aria-live="polite">' + (index + 1) + " / " + count + "<small>총 " + total + '개</small></span><button type="button" data-gem-page="' + kind + '" data-step="1"' + (index === count - 1 ? " disabled" : "") + ">다음</button></nav>";
  }
  function bumpSealedTab(runtime) {
    const tab = runtime.deps.document.querySelector('#ui-skill-picker-tabs [data-picker-kind="sealed"]');
    if (!tab) return;
    tab.classList.remove("is-bumped");
    void tab.offsetWidth;
    tab.classList.add("is-bumped");
  }
  function sealResonanceWith(runtime, kind, names) {
    const key = kind === "support" ? "sealedSupports" : "sealedSkills";
    return runtime.deps.gemDropRewards.sealResonance({ ...runtime.deps.game, [key]: [...runtime.deps.game[key] || [], ...names] });
  }
  async function confirmLibrarySeal(runtime, kind) {
    if (runtime.state.sealConfirmationPending) return;
    const names = runtime.deps.window.GameModules.skills.sealableNames(kind);
    if (!names.length) return;
    const state = runtime.deps.game, season = runtime.deps.game.season, label = (0, runtime.deps._t)(kind === "support" ? "보조스킬룬" : "공격 룬");
    const gain = sealResonanceWith(runtime, kind, names) - runtime.deps.gemDropRewards.sealResonance(runtime.deps.game);
    runtime.state.sealConfirmationPending = true;
    try {
      const accepted = await (0, runtime.deps.requestGameConfirmation)(
        (0, runtime.deps._t)("{label} {length}개를 봉인합니다. 공명력 +{gain}", { label, length: names.length, gain }),
        { title: (0, runtime.deps._t)("{label} 일괄 봉인", { label }), confirmLabel: (0, runtime.deps._t)("{length}개 봉인", { length: names.length }), cancelLabel: (0, runtime.deps._t)("취소") }
      );
      if (!runtime.active || !accepted || runtime.deps.game !== state || runtime.deps.game.season !== season) return;
      if (JSON.stringify(names) !== JSON.stringify(runtime.deps.window.GameModules.skills.sealableNames(kind))) {
        (0, runtime.deps.showGameToast)((0, runtime.deps._t)("룬 목록이 바뀌었습니다. 다시 확인하세요."), { tone: "warning" });
        return;
      }
      if (kind === "support") (0, runtime.deps.sealAllInactiveSupportGems)();
      else (0, runtime.deps.sealAllInactiveSkillGems)();
      bumpSealedTab(runtime);
    } finally {
      runtime.state.sealConfirmationPending = false;
    }
  }
  function bulkSealButton(runtime, kind) {
    const disabled = runtime.deps.window.GameModules.skills.sealableNames(kind).length ? "" : "disabled";
    return `<button type="button" data-gem-bulk-seal="${kind}" ${disabled}>${(0, runtime.deps._t)(kind === "support" ? "보조룬 일괄 봉인" : "공격룬 일괄 봉인")}</button>`;
  }
  function renderLibraryActions(runtime, kind, fold) {
    const toggle = `<button type="button" data-gem-fold="${kind === "support" ? "support" : "attack"}" aria-pressed="${fold}" class="${fold ? "active" : ""}">${(0, runtime.deps._t)("장착 중")}</button>`;
    return toggle + (fold ? "" : bulkSealButton(runtime, kind));
  }
  function withTileSeal(runtime, cardHtml, support, name) {
    if ((0, runtime.deps.getSkillGemSealRefusal)(name, support)) return cardHtml;
    const end = cardHtml.lastIndexOf("</article>");
    const button = `<button type="button" class="gem-tile-seal" data-tile-seal="${support ? "support" : "skill"}" data-gem-name="${(0, runtime.deps.escapeHTML)(name)}" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)("{name} 봉인", { name: (0, runtime.deps._t)(name) }))}">${(0, runtime.deps.renderPixelIcon)("lock", "gem-tile-seal-icon")}<span>${(0, runtime.deps._t)("봉인")}</span></button>`;
    return cardHtml.slice(0, end) + button + cardHtml.slice(end);
  }
  function renderSealedRuneTile(runtime, name, label, support, stats) {
    const type = support ? "support" : "active";
    const art = support ? runtime.deps.supportGemSigil.html(name, "gem-card-sigil gem-tile-art gem-tile-support-art", 0) : (0, runtime.deps.renderSkillGemArt)(name, "gem-card-sigil gem-card-art gem-tile-art");
    const sealedCount = (runtime.deps.game.sealedSkills || []).length + (runtime.deps.game.sealedSupports || []).length;
    const note = sealedCount % 2 === 0 ? `<small class="gem-usage-state">${(0, runtime.deps._t)("공명력 -1")}</small>` : "";
    const button = runtime.deps.game.woodsmanBuildLock ? "" : `<button type="button" class="gem-tile-seal is-unseal" data-tile-unseal="${support ? "support" : "skill"}" data-gem-name="${(0, runtime.deps.escapeHTML)(name)}" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)("{name} 봉인 해제", { name: (0, runtime.deps._t)(name) }))}">${(0, runtime.deps.renderPixelIcon)("unlock", "gem-tile-seal-icon")}<span>${(0, runtime.deps._t)("해제")}</span></button>`;
    return `<article class="skill-gem gem-library-card gem-tile sealed-gem-card${support ? " support-gem" : ""}" data-info-tooltip-anchor="1" onpointerenter="showGemCardHint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)("{name}, 봉인됨", { name: (0, runtime.deps._t)(name) }))}">${(0, runtime.deps.renderGemTileLevel)((0, runtime.deps.getUiGemPresentation)(name, support, stats))}${button}<span class="gem-tile-sealed-art">${art}${(0, runtime.deps.renderPixelIcon)("lock", "gem-tile-sealed-lock")}</span><strong class="gem-tile-name">${label}</strong>${note}</article>`;
  }
  function renderSealedLibrary(runtime, stats) {
    const skills = runtime.deps.game.sealedSkills || [], supports = runtime.deps.game.sealedSupports || [];
    const total = skills.length + supports.length;
    const pips = [0, 1].map((index) => `<i class="${index < total % 2 ? "is-on" : ""}"></i>`).join("");
    const bulk = bulkSealButton(runtime, "skill") + (runtime.deps.contentProgression.isUnlocked("support") ? bulkSealButton(runtime, "support") : "");
    const head = `<div class="sealed-library-head">${(0, runtime.deps.renderPixelIcon)("lock", "sealed-library-icon")}<div class="sealed-library-sum"><b>${(0, runtime.deps._t)("봉인 {total}개", { total })}</b><span class="sealed-library-power"><em>${(0, runtime.deps._t)("공명력 +{power}", { power: runtime.deps.gemDropRewards.sealResonance(runtime.deps.game) })}</em><span class="sealed-library-pips" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)("다음 공명력까지 {left}개", { left: 2 - total % 2 }))}">${pips}</span></span></div><div class="search-action-row sealed-library-actions">${bulk}</div></div>`;
    const group = (title, names, support) => names.length ? `<section class="sealed-library-group"><h4>${(0, runtime.deps._t)(title)}<small>${names.length}</small></h4><div class="sealed-library-grid">${names.map((name) => renderSealedRuneTile(runtime, name, (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name)), support, stats)).join("")}</div></section>` : "";
    const empty = total ? "" : `<p class="sealed-library-empty">${(0, runtime.deps._t)("봉인한 룬이 없습니다.")}</p>`;
    return head + empty + group("공격 룬", skills, false) + group("보조스킬룬", supports, true);
  }
  function renderPickerTabs(runtime, current) {
    const counts = { support: (runtime.deps.game.supports || []).length, sealed: (runtime.deps.game.sealedSkills || []).length + (runtime.deps.game.sealedSupports || []).length };
    (runtime.deps.game.skills || []).forEach((name) => {
      const kind = runtime.deps.skillGemBoardUi.kindOf(name);
      counts[kind] = (counts[kind] || 0) + 1;
    });
    const html = runtime.state.PICKER_TABS.filter((tab) => tab.kind !== "support" || runtime.deps.contentProgression.isUnlocked("support")).map((tab) => {
      const on = tab.kind === current;
      return `<button type="button" role="tab" class="skill-picker-tab is-${tab.kind}${on ? " is-active" : ""}" aria-selected="${on}" data-picker-kind="${tab.kind}">${(0, runtime.deps.renderPixelIcon)(tab.icon, "skill-picker-tab-icon")}<span>${(0, runtime.deps._t)(tab.label)}</span><b>${counts[tab.kind] || 0}</b></button>`;
    }).join("");
    const nav = runtime.deps.document.getElementById("ui-skill-picker-tabs");
    if (nav.dataset.renderSig !== html) {
      nav.innerHTML = html;
      nav.dataset.renderSig = html;
    }
  }
  function syncPickerHead(runtime, kind, stats) {
    renderPickerTabs(runtime, kind);
    runtime.deps.document.getElementById("ui-skills-list").hidden = kind === "support" || kind === "sealed";
    runtime.deps.document.getElementById("ui-support-list").hidden = kind !== "support";
    const sealedList = runtime.deps.document.getElementById("ui-sealed-list");
    sealedList.hidden = kind !== "sealed";
    const sealedHtml = kind === "sealed" ? renderSealedLibrary(runtime, stats) : "";
    if (sealedList.dataset.renderSig !== sealedHtml) {
      sealedList.innerHTML = sealedHtml;
      sealedList.dataset.renderSig = sealedHtml;
    }
  }
  function renderAttackGemLibrary(runtime, stats, filter, fold) {
    const sealed = Array.isArray(runtime.deps.game.sealedSkills) ? runtime.deps.game.sealedSkills : [];
    const html = runtime.handlers.renderGemLibrary("skill", runtime.deps.game.skills, sealed, stats, filter);
    const actions = renderLibraryActions(runtime, "skill", fold);
    let list = runtime.deps.document.getElementById("ui-skills-list");
    const signature = `${html}::${actions}`;
    if (!list || list.dataset.renderSig === signature) return;
    (0, runtime.deps.renderSearchSection)("ui-skills-list", "skill", "공격 룬 이름/태그 검색", html, "", actions);
    list = runtime.deps.document.getElementById("ui-skills-list");
    list.dataset.renderSig = signature;
  }

  // modules/ui/skill-enhancement-render.mjs
  function syncEnhanceTabButton(runtime, button, open) {
    if (!button) return;
    button.disabled = !open;
    button.style.opacity = open ? "1" : "0.45";
    button.dataset.tip = open ? "" : runtime.deps._t("해금 탭에서 룬 강화를 해금하세요.");
  }
  function renderSkillEnhancement(runtime, pStats) {
    let gemEnhanceOpen = !!runtime.deps.game.gemEnhanceUnlocked;
    let gemEnhanceHeader = runtime.deps.document.getElementById("ui-gem-enhance-header");
    let gemEnhancePanel = runtime.deps.document.getElementById("ui-gem-enhance-panel");
    let skillEnhanceBtn = runtime.deps.document.getElementById("btn-skill-tab-enhance");
    if (gemEnhanceHeader && gemEnhancePanel) {
      gemEnhanceHeader.style.display = gemEnhanceOpen ? "" : "none";
      gemEnhancePanel.style.display = gemEnhanceOpen ? "" : "none";
      syncEnhanceTabButton(runtime, skillEnhanceBtn, gemEnhanceOpen);
      if (!gemEnhanceOpen && runtime.deps.game.skillSubtab === "skill-tab-enhance") runtime.deps.game.skillSubtab = "skill-tab-equip";
      if (gemEnhanceOpen) {
        renderEnhancementDetails(runtime, pStats);
      }
    }
  }
  function renderEnhancementDetails(runtime, pStats) {
    const view = { pStats };
    readEnhanceTarget(runtime, view);
    readEnhanceRecord(runtime, view);
    readEnhanceAwakening(runtime, view);
    readEnhanceSlot(runtime, view);
    readEnhanceSkyPower(runtime, view);
    readEnhanceCompletion(runtime, view);
    readEnhancePresentation(runtime, view);
    renderEnhanceTarget(runtime, view);
    renderEnhanceCore(runtime, view);
    renderEnhanceUpgrades(runtime, view);
    renderEnhanceOptions(runtime, view);
  }
  function readEnhanceTarget(runtime, view) {
    const { pStats } = view;
    let active = typeof runtime.deps.getGemEnhanceTargetSkill === "function" ? (0, runtime.deps.getGemEnhanceTargetSkill)() : runtime.deps.game.activeSkill;
    let equippedEnhanceTargets = typeof runtime.deps.getEquippedEnhanceableGemNames === "function" ? (0, runtime.deps.getEquippedEnhanceableGemNames)() : [];
    if ((!active || !equippedEnhanceTargets.includes(active)) && equippedEnhanceTargets.length > 0) active = equippedEnhanceTargets[0];
    let targetButtons = equippedEnhanceTargets.map((name) => (0, runtime.deps.renderGemEnhanceTargetCard)(name, name === active, pStats)).join("");
    let isGem = typeof runtime.deps.isEnhanceableAttackGem === "function" ? (0, runtime.deps.isEnhanceableAttackGem)(active) : !!(runtime.deps.SKILL_DB[active] && runtime.deps.SKILL_DB[active].isGem);
    Object.assign(view, { active, equippedEnhanceTargets, targetButtons, isGem });
  }
  function readEnhanceRecord(runtime, view) {
    const { isGem, active } = view;
    let activeSlots = isGem && typeof runtime.deps.getSkyEnhancementSlotsForSkill === "function" ? (0, runtime.deps.getSkyEnhancementSlotsForSkill)(active) : [null, null, null, null, null];
    let activeEnh = (0, runtime.deps.getSkyEnhancementForSkill)(active);
    let activeGem = isGem ? (0, runtime.deps.normalizeGemRecord)((runtime.deps.game.gemData || {})[active]) : null;
    Object.assign(view, { activeSlots, activeEnh, activeGem });
  }
  function readEnhanceAwakening(runtime, view) {
    const { activeGem } = view;
    let gemAwakening = runtime.deps.contentProgression.isUnlocked("gemAwakening");
    let qualityNeed = activeGem ? 1 + Math.floor((activeGem.quality || 0) / 5) : 1;
    let awakenReady = !!(activeGem && !activeGem.awakened && (activeGem.level || 1) >= 20 && gemAwakening);
    Object.assign(view, { gemAwakening, qualityNeed, awakenReady });
  }
  function readEnhanceSlot(runtime, view) {
    const { activeGem } = view;
    let engraveCap = activeGem ? activeGem.skyEnhanceCap || 1 : 1;
    let selectedSlot = typeof runtime.deps.getSelectedGemEngraveSlot === "function" ? (0, runtime.deps.getSelectedGemEngraveSlot)() : 0;
    if (selectedSlot >= engraveCap) selectedSlot = Math.max(0, engraveCap - 1);
    runtime.deps.game.gemEngraveSelectedSlot = selectedSlot;
    Object.assign(view, { engraveCap, selectedSlot });
  }
  function readEnhanceSkyPower(runtime, view) {
    const { isGem, active } = view;
    let permanentSkyBoost = isGem && typeof runtime.deps.getSkyTowerGemBoostLevel === "function" ? (0, runtime.deps.getSkyTowerGemBoostLevel)(active) : 0;
    let permanentSkyCost = isGem && typeof runtime.deps.getSkyTowerGemBoostCost === "function" ? (0, runtime.deps.getSkyTowerGemBoostCost)(active) : 0;
    let permanentSkyMax = typeof runtime.deps.getSkyTowerGemBoostMaxLevel === "function" ? (0, runtime.deps.getSkyTowerGemBoostMaxLevel)() : 3;
    let condensedPower = (typeof runtime.deps.ensureSkyTowerState === "function" ? (0, runtime.deps.ensureSkyTowerState)().condensedPower : 0) || 0;
    Object.assign(view, { permanentSkyBoost, permanentSkyCost, permanentSkyMax, condensedPower });
  }
  function readEnhanceCompletion(runtime, view) {
    const { activeGem, engraveCap, activeEnh } = view;
    let coreDone = !!(activeGem && activeGem.enhanceLevel >= runtime.deps.GEM_CORE_FORGE.maxLevel);
    let slotDone = !!(activeGem && engraveCap >= 5);
    let engraveFilled = !!(activeGem && activeEnh.length >= engraveCap);
    Object.assign(view, { coreDone, slotDone, engraveFilled });
  }
  function readEnhancePresentation(runtime, view) {
    const { active, isGem, pStats, activeEnh } = view;
    let activeDef = runtime.deps.SKILL_DB[active] || {};
    let activeMeta = (0, runtime.deps.getGemCardMeta)(activeDef);
    let activePresentation = isGem ? (0, runtime.deps.getUiGemPresentation)(active, false, pStats) : null;
    let growthSummary = isGem ? (0, runtime.deps.getGemGrowthSummaryHtml)(active, activePresentation) : "";
    let activeOptions = activeEnh.map((id) => runtime.deps.GEM_SKY_ENHANCEMENTS[id] ? runtime.deps.GEM_SKY_ENHANCEMENTS[id].name : id).join(", ") || "적용된 각인 없음";
    Object.assign(view, { activeDef, activeMeta, activePresentation, growthSummary, activeOptions });
  }
  function renderEnhanceTarget(runtime, view) {
    const { targetButtons, isGem, activeMeta, active, activeDef, growthSummary, coreDone, activeGem, slotDone, engraveCap, engraveFilled, activeEnh, activeOptions } = view;
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById("ui-gem-enhance-target"), `<div class="gem-target-list">${targetButtons || (0, runtime.deps._t)('<span class="gem-process-empty">기본 공격은 강화할 수 없습니다. 공격 룬을 장착하면 여기서 키웁니다.</span>')}</div>` + (isGem ? `<div class="gem-target-profile element-${activeMeta.className}">${(0, runtime.deps.renderSkillGemArt)(active, "gem-target-profile-icon", { eager: true })}<div><small class="gem-target-kicker">${(0, runtime.deps._t)("현재 선택")}<i>${activeMeta.elementLabel}</i><i>${activeMeta.typeLabel}</i></small><strong>${(0, runtime.deps.escapeHTML)(active)}</strong><p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(activeDef.desc) || "")}</p></div></div>${growthSummary}<div class="gem-enhance-status"><span class="gem-status-chip ${coreDone ? "done" : ""}">${coreDone ? (0, runtime.deps._t)("룬 강화 완료") : (0, runtime.deps._t)("룬 강화 +{enhanceLevel}", { enhanceLevel: activeGem.enhanceLevel })}</span><span ${runtime.deps.contentUnlockUi.lockAttribute("engraving")} class="gem-status-chip gem-engrave-status ${slotDone ? "done" : ""}">${slotDone ? (0, runtime.deps._t)("슬롯 최대") : (0, runtime.deps._t)("각인 슬롯 {engraveCap}/5", { engraveCap })}</span><span ${runtime.deps.contentUnlockUi.lockAttribute("engraving")} class="gem-status-chip gem-engrave-status ${engraveFilled ? "done" : ""}">${engraveFilled ? (0, runtime.deps._t)("슬롯 사용 완료") : (0, runtime.deps._t)("빈 슬롯 {max}", { max: Math.max(0, engraveCap - activeEnh.length) })}</span></div><div ${runtime.deps.contentUnlockUi.lockAttribute("engraving")} class="gem-current-inscriptions"><span>${(0, runtime.deps._t)("현재 각인")}</span><strong>${(0, runtime.deps.escapeHTML)(activeOptions)}</strong></div>` : '<div class="gem-process-empty">공격 룬을 선택하면 성장 정보가 표시됩니다.</div>'));
  }
  function renderEnhanceCore(runtime, view) {
    const { activeGem, condensedPower, activeSlots, engraveCap, activePresentation, isGem, active } = view;
    (0, runtime.deps.renderGemResourceStrip)(activeGem, condensedPower);
    (0, runtime.deps.renderGemEngraveSlots)(activeSlots, engraveCap);
    let currentTotalGemLevel = Math.max(1, Math.floor(activePresentation && activePresentation.totalLevel || 1));
    runtime.deps.gemCoreForgeUi.renderSection(isGem ? active : null);
    Object.assign(view, { currentTotalGemLevel });
  }
  function skyUpgradeOption(runtime, view) {
    const { permanentSkyBoost, permanentSkyMax, condensedPower, permanentSkyCost } = view;
    return { title: (0, runtime.deps._t)("응축 창공 영구 강화"), action: "upgradeActiveGemWithCondensedSkyPower()", done: permanentSkyBoost >= permanentSkyMax, ready: runtime.deps.game.skyTower.unlocked && condensedPower >= permanentSkyCost, details: (0, runtime.deps._t)("{value}, 보유 {floor} / 필요 {permanentSkyCost}", { value: runtime.deps.game.skyTower.unlocked ? (0, runtime.deps._t)("루프 초기화 없음") : (0, runtime.deps._t)("창공의 탑 해금 필요"), floor: Math.floor(condensedPower), permanentSkyCost }), gain: 1 };
  }
  function qualityUpgradeOption(runtime, view) {
    const { activeGem, qualityNeed } = view;
    return { title: (0, runtime.deps._t)("룬 퀄리티 강화"), action: "upgradeActiveGemQuality()", done: activeGem?.quality >= 20, ready: (runtime.deps.game.currencies.bossCore || 0) >= qualityNeed, details: (0, runtime.deps._t)("군주의 핵 {bossCore}/{qualityNeed}, 피해/속도 배율 +0.5%", { bossCore: runtime.deps.game.currencies.bossCore || 0, qualityNeed }) };
  }
  function awakenUpgradeOption(runtime, view) {
    const { activeGem, awakenReady, gemAwakening, active } = view;
    return { title: (0, runtime.deps._t)("각성 룬 변환"), action: "awakenActiveGemCandidate()", done: !!activeGem?.awakened, ready: awakenReady && (runtime.deps.game.currencies.awakenedEcho || 0) >= 3, details: (0, runtime.deps._t)("{value}기본 Lv.20, 각성 잔향 {awakenedEcho}/3{replace}", { value: gemAwakening ? "" : (0, runtime.deps._t)("‘룬 각성’ 해금 필요, "), awakenedEcho: runtime.deps.game.currencies.awakenedEcho || 0, replace: (0, runtime.deps.getGemAwakenedPerkNote)(active).replace(/^ (.*)\.$/, ", $1") }), gain: 2 };
  }
  function renderEnhanceUpgrades(runtime, view) {
    const { isGem, currentTotalGemLevel } = view;
    const upgrades = [skyUpgradeOption(runtime, view), qualityUpgradeOption(runtime, view), awakenUpgradeOption(runtime, view)];
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById("ui-gem-upgrade-actions"), isGem ? upgrades.map((upgrade) => renderGemUpgradeButton(runtime, upgrade, currentTotalGemLevel)).join("") : `<div class="gem-process-empty">강화할 공격 룬을 먼저 장착하세요.<br><button type="button" onclick="switchSkillSubtab('skill-tab-equip')">공격 룬 장착하기</button></div>`);
  }
  function renderEnhanceOptions(runtime, view) {
    const { activeSlots, isGem } = view;
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById("ui-gem-enhance-options"), `<div class="gem-engrave-slot-guide"><strong>${(0, runtime.deps._t)("전체 각인")}</strong><span>${(0, runtime.deps._t)("누르면 빈 슬롯에 적용되고 다시 누르면 해제됩니다.")}</span></div>` + Object.values(runtime.deps.GEM_SKY_ENHANCEMENTS).map((enh) => (0, runtime.deps.renderSkyEnhancementOption)(enh, activeSlots, isGem)).join(""));
  }

  // modules/ui/skill-screen-render.mjs
  function skillScreenStats(runtime, context) {
    return context.pStats || (typeof runtime.deps.getPlayerStats === "function" ? runtime.deps.getPlayerStats() : {});
  }
  function renderSkillGemScreen(runtime, context) {
    let ctx = context || {};
    let pStats = skillScreenStats(runtime, ctx);
    let sf = ctx.searchFilters || (typeof runtime.deps.getSearchFilterState === "function" ? (0, runtime.deps.getSearchFilterState)() : {});
    let foldAttackInactive = !!runtime.deps.game.gemFoldInactiveAttack;
    let foldSupportInactive = !!runtime.deps.game.gemFoldInactiveSupport;
    let pickerKind = runtime.deps.skillGemBoardUi.currentKind();
    let effectiveResonanceCap = (0, runtime.deps.getEffectiveResonanceCap)(pStats);
    let skyTowerSignatureState = typeof runtime.deps.ensureSkyTowerState === "function" ? (0, runtime.deps.ensureSkyTowerState)() : null;
    const skillPanelRenderSignature = skillScreenSignature(runtime, { pStats, sf, foldAttackInactive, foldSupportInactive, pickerKind, effectiveResonanceCap, skyTowerSignatureState });
    if (skillPanelRenderSignature === runtime.state.lastSkillPanelRenderSignature) return;
    runtime.state.lastSkillPanelRenderSignature = skillPanelRenderSignature;
    runtime.deps.skillGemBoardUi.render(pStats);
    let sealedSupports = Array.isArray(runtime.deps.game.sealedSupports) ? runtime.deps.game.sealedSupports : [];
    renderAttackGemLibrary(runtime, pStats, sf.skill, foldAttackInactive);
    let supportHtml = runtime.handlers.renderGemLibrary("support", runtime.deps.game.supports, sealedSupports, pStats, sf.support);
    let supportListEl = runtime.deps.document.getElementById("ui-support-list");
    let supportActions = renderLibraryActions(runtime, "support", foldSupportInactive);
    let supportRenderSig = `${supportHtml}::${supportActions}`;
    if (supportListEl && supportListEl.dataset.renderSig !== supportRenderSig) {
      (0, runtime.deps.renderSearchSection)("ui-support-list", "support", "보조스킬룬 이름/효과 검색", supportHtml, "", supportActions);
      supportListEl = runtime.deps.document.getElementById("ui-support-list");
      supportListEl.dataset.renderSig = supportRenderSig;
    }
    syncPickerHead(runtime, pickerKind, pStats);
    renderSkillEnhancement(runtime, pStats);
  }
  function skillLoadoutSignature(runtime) {
    return {
      skills: runtime.deps.game.skills || [],
      supports: runtime.deps.game.supports || [],
      equippedSupports: runtime.deps.game.equippedSupports || [],
      equippedSummonSkills: runtime.deps.game.equippedSummonSkills || [],
      summonSkillCounts: runtime.deps.game.summonSkillCounts || {},
      sealedSkills: runtime.deps.game.sealedSkills || [],
      sealedSupports: runtime.deps.game.sealedSupports || []
    };
  }
  function skillRecordSignature(runtime) {
    return {
      gemData: runtime.deps.game.gemData || {},
      supportGemData: runtime.deps.game.supportGemData || {},
      skyGemEnhancements: runtime.deps.game.skyGemEnhancements || {},
      gemEnhanceTargetSkill: runtime.deps.game.gemEnhanceTargetSkill || "",
      runeSpares: runtime.deps.game.runeSpares || {}
    };
  }
  function skillResourceSignature(runtime, view) {
    const { skyTowerSignatureState } = view;
    return {
      currencies: {
        bossCore: runtime.deps.game.currencies.bossCore || 0,
        skyEssence: runtime.deps.game.currencies.skyEssence || 0,
        awakenedEcho: runtime.deps.game.currencies.awakenedEcho || 0
      },
      skyTower: {
        condensedPower: Math.max(0, Math.floor(skyTowerSignatureState && skyTowerSignatureState.condensedPower || 0)),
        gemBoosts: skyTowerSignatureState && skyTowerSignatureState.gemBoosts || {}
      }
    };
  }
  function skillScreenSignature(runtime, view) {
    const { pickerKind, sf, foldAttackInactive, foldSupportInactive, pStats, effectiveResonanceCap } = view;
    return JSON.stringify({
      libraryPages: runtime.state.libraryPages,
      pickerKind,
      engraving: runtime.deps.contentProgression.isUnlocked("engraving"),
      mobileLibrary: runtime.deps.uiDisplay.matches("(max-width: 1080px)"),
      activeSkill: runtime.deps.game.activeSkill || "",
      mobilitySkill: runtime.deps.game.mobilitySkill,
      buildLocked: !!runtime.deps.game.woodsmanBuildLock,
      ...skillLoadoutSignature(runtime),
      ...skillRecordSignature(runtime),
      ...skillResourceSignature(runtime, view),
      filters: { skill: sf.skill || "", support: sf.support || "" },
      foldAttackInactive,
      foldSupportInactive,
      suppCap: pStats.suppCap || 0,
      resonanceCap: effectiveResonanceCap,
      gemEnhanceUnlocked: !!runtime.deps.game.gemEnhanceUnlocked,
      gemAwakening: runtime.deps.contentProgression.isUnlocked("gemAwakening"),
      season: runtime.deps.game.season || 1
    });
  }

  // modules/ui/skill-screen-view.mjs
  function createSkillScreenView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { renderSkillGemScreen };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.renderGemLibrary = createRenderGemLibrary(runtime);
    runtime.api = { renderSkillGemScreen: runtime.handlers.renderSkillGemScreen, dispose: () => disposeSkillScreen(runtime) };
    listenView(runtime, runtime.deps.document, "click", (event) => {
      const tab = event.target.closest("[data-picker-kind]");
      if (tab && !tab.disabled) {
        runtime.deps.skillGemBoardUi.pick(tab.dataset.pickerKind);
        return;
      }
      const foldButton = event.target.closest("[data-gem-fold]");
      if (foldButton) {
        (0, runtime.deps.toggleGemFoldMode)(foldButton.dataset.gemFold);
        return;
      }
      const sealButton = event.target.closest("[data-gem-bulk-seal]");
      if (sealButton && !sealButton.disabled) {
        confirmLibrarySeal(runtime, sealButton.dataset.gemBulkSeal);
        return;
      }
      const button = event.target.closest("[data-gem-page]");
      if (!button || button.disabled) return;
      runtime.state.libraryPages[button.dataset.gemPage].index += Number(button.dataset.step);
      (0, runtime.deps.updateStaticUI)();
    });
    listenView(runtime, runtime.deps.document, "click", (event) => {
      const button = event.target.closest("[data-tile-seal], [data-tile-unseal]");
      if (!button || button.disabled) return;
      event.stopPropagation();
      const name = button.dataset.gemName;
      if (button.dataset.tileSeal) {
        if (button.dataset.tileSeal === "support") (0, runtime.deps.sealSupportGem)(name);
        else (0, runtime.deps.sealSkillGem)(name);
        bumpSealedTab(runtime);
      } else if (button.dataset.tileUnseal === "support") (0, runtime.deps.unsealSupportGem)(name);
      else (0, runtime.deps.unsealSkillGem)(name);
    }, true);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.lastSkillPanelRenderSignature = "";
    runtime.state.libraryPages = { skill: { index: 0, query: "" }, support: { index: 0, query: "" } };
    runtime.state.sealConfirmationPending = false;
    runtime.state.PICKER_TABS = Object.freeze([
      { kind: "active", label: "공격|룬 종류", icon: "sword" },
      { kind: "mobility", label: "이동|룬 종류", icon: "boot" },
      { kind: "summon", label: "소환|룬 종류", icon: "skull" },
      { kind: "support", label: "보조|룬 종류", icon: "gem" },
      { kind: "sealed", label: "봉인|룬 종류", icon: "lock" }
    ]);
    runtime.state.MOBILE_PAGE_SIZE = 8;
    runtime.state.supportDpsGains = /* @__PURE__ */ new Map();
  }
  function disposeSkillScreen(runtime) {
    releaseViewEvents(runtime);
    runtime.state.lastSkillPanelRenderSignature = "";
    runtime.state.supportDpsGains.clear();
  }

  // modules/skills-ui-classic.mjs
  var skillScreenView = createSkillScreenView({
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get skillGemBoardUi() {
      return skillGemBoardUi;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get window() {
      return window;
    },
    get renderAttackGemCard() {
      return renderAttackGemCard;
    },
    get renderSupportGemCard() {
      return renderSupportGemCard;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    get document() {
      return document;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get sealAllInactiveSupportGems() {
      return sealAllInactiveSupportGems;
    },
    get sealAllInactiveSkillGems() {
      return sealAllInactiveSkillGems;
    },
    get showGameToast() {
      return showGameToast;
    },
    get getSkillGemSealRefusal() {
      return getSkillGemSealRefusal;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get supportGemSigil() {
      return supportGemSigil;
    },
    get renderSkillGemArt() {
      return renderSkillGemArt;
    },
    get renderGemTileLevel() {
      return renderGemTileLevel;
    },
    get getUiGemPresentation() {
      return getUiGemPresentation;
    },
    get contentProgression() {
      return contentProgression;
    },
    get renderSearchSection() {
      return renderSearchSection;
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
    },
    get getSearchFilterState() {
      return typeof getSearchFilterState === "undefined" ? void 0 : getSearchFilterState;
    },
    get getEffectiveResonanceCap() {
      return getEffectiveResonanceCap;
    },
    get ensureSkyTowerState() {
      return typeof ensureSkyTowerState === "undefined" ? void 0 : ensureSkyTowerState;
    },
    get getGemEnhanceTargetSkill() {
      return typeof getGemEnhanceTargetSkill === "undefined" ? void 0 : getGemEnhanceTargetSkill;
    },
    get getEquippedEnhanceableGemNames() {
      return typeof getEquippedEnhanceableGemNames === "undefined" ? void 0 : getEquippedEnhanceableGemNames;
    },
    get isEnhanceableAttackGem() {
      return typeof isEnhanceableAttackGem === "undefined" ? void 0 : isEnhanceableAttackGem;
    },
    get getSkyEnhancementSlotsForSkill() {
      return typeof getSkyEnhancementSlotsForSkill === "undefined" ? void 0 : getSkyEnhancementSlotsForSkill;
    },
    get getSkyEnhancementForSkill() {
      return getSkyEnhancementForSkill;
    },
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get getSelectedGemEngraveSlot() {
      return typeof getSelectedGemEngraveSlot === "undefined" ? void 0 : getSelectedGemEngraveSlot;
    },
    get getSkyTowerGemBoostLevel() {
      return typeof getSkyTowerGemBoostLevel === "undefined" ? void 0 : getSkyTowerGemBoostLevel;
    },
    get getSkyTowerGemBoostCost() {
      return typeof getSkyTowerGemBoostCost === "undefined" ? void 0 : getSkyTowerGemBoostCost;
    },
    get getSkyTowerGemBoostMaxLevel() {
      return typeof getSkyTowerGemBoostMaxLevel === "undefined" ? void 0 : getSkyTowerGemBoostMaxLevel;
    },
    get GEM_CORE_FORGE() {
      return GEM_CORE_FORGE;
    },
    get getGemCardMeta() {
      return getGemCardMeta;
    },
    get getGemGrowthSummaryHtml() {
      return getGemGrowthSummaryHtml;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get renderGemResourceStrip() {
      return renderGemResourceStrip;
    },
    get renderGemEngraveSlots() {
      return renderGemEngraveSlots;
    },
    get gemCoreForgeUi() {
      return gemCoreForgeUi;
    },
    get getGemAwakenedPerkNote() {
      return getGemAwakenedPerkNote;
    },
    get GEM_SKY_ENHANCEMENTS() {
      return GEM_SKY_ENHANCEMENTS;
    },
    get renderGemEnhanceTargetCard() {
      return renderGemEnhanceTargetCard;
    },
    get renderSkyEnhancementOption() {
      return renderSkyEnhancementOption;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get toggleGemFoldMode() {
      return toggleGemFoldMode;
    },
    get unsealSupportGem() {
      return unsealSupportGem;
    },
    get unsealSkillGem() {
      return unsealSkillGem;
    },
    get sealSupportGem() {
      return sealSupportGem;
    },
    get sealSkillGem() {
      return sealSkillGem;
    }
  });
  safeExposeGlobals({
    renderSkillGemScreen: skillScreenView.renderSkillGemScreen
  });
  window.GameModules.skillScreenView = skillScreenView;
})();
