// GENERATED from modules/tooltips-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowCancelIdleCallback = (...args) => globalThis.cancelIdleCallback(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowRequestIdleCallback = (...args) => globalThis.requestIdleCallback(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/tooltip-core.mjs
  function measureTooltip(runtime, el) {
    let size = runtime.state.tooltipSizeCache.get(el);
    if (size && size.factor === runtime.deps.uiDisplay.factor) return size;
    el.style.transform = "none";
    const rect = el.getBoundingClientRect(), fixed = (0, runtime.deps.getComputedStyle)(el).pointerEvents === "none";
    const fit = fixed ? Math.max(0.5, Math.min(1, (runtime.deps.window.innerHeight - 16) / rect.height, (runtime.deps.window.innerWidth - 16) / rect.width)) : 1;
    size = { width: rect.width * fit, height: rect.height * fit, fit, factor: runtime.deps.uiDisplay.factor };
    runtime.state.tooltipSizeCache.set(el, size);
    return size;
  }
  function applyTooltipPosition(runtime, el, x, y) {
    if (!el || el.style.display === "none") return;
    if (el.style.left !== "0px" || el.style.top !== "0px") {
      el.style.left = "0px";
      el.style.top = "0px";
    }
    const size = measureTooltip(runtime, el);
    let left = x + 18;
    let top = y + 18;
    if (left + size.width > runtime.deps.window.innerWidth - 10) left = x - size.width - 18;
    if (top + size.height > runtime.deps.window.innerHeight - 10) top = y - size.height - 18;
    left = (0, runtime.deps.clampNumber)(left, 8, Math.max(8, runtime.deps.window.innerWidth - size.width - 8));
    top = (0, runtime.deps.clampNumber)(top, 8, Math.max(8, runtime.deps.window.innerHeight - size.height - 8));
    ({ left, top } = runtime.deps.tutorialActionUi.clearTooltipSpot({ left, top, width: size.width, height: size.height }, x, y));
    const deviceScale = Math.max(1, Number(runtime.deps.window.devicePixelRatio) || 1);
    const snappedLeft = Math.round(left * deviceScale) / deviceScale;
    const snappedTop = Math.round(top * deviceScale) / deviceScale;
    el.style.transform = `translate(${snappedLeft / runtime.deps.uiDisplay.factor}px, ${snappedTop / runtime.deps.uiDisplay.factor}px)${size.fit < 1 ? ` scale(${size.fit})` : ""}`;
  }
  function flushTooltipPositions(runtime) {
    runtime.state.tooltipPositionFrame = null;
    if (!runtime.active || runtime.owner !== runtime.deps.game) return;
    let positions = Array.from(runtime.state.pendingTooltipPositions.entries());
    runtime.state.pendingTooltipPositions.clear();
    positions.forEach(([el, point]) => applyTooltipPosition(runtime, el, point.x, point.y));
  }
  function positionTooltipElement(runtime, el, x, y) {
    if (!el) return;
    runtime.state.pendingTooltipPositions.set(el, { x: Number(x) || 0, y: Number(y) || 0 });
    if (runtime.state.tooltipPositionFrame !== null) return;
    runtime.state.tooltipPositionFrame = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.flushTooltipPositions);
  }
  function invalidateTooltipSize(runtime, el) {
    if (!el) return;
    runtime.state.tooltipSizeCache.delete(el);
  }
  function reuseInfoTooltip(runtime, event, token) {
    let tt = runtime.deps.document.getElementById("info-tooltip");
    if (!token || runtime.state.activeInfoTooltipToken !== token || !tt || tt.style.display !== "block" || !tt.innerHTML) return false;
    positionTooltipElement(runtime, tt, event.clientX, event.clientY);
    return true;
  }
  function setActiveTooltip(runtime, id) {
    if (typeof runtime.state.activeTooltipId === "undefined") runtime.state.activeTooltipId = null;
    runtime.state.activeTooltipId = id;
  }
  function clearActiveTooltip(runtime, id) {
    if (typeof runtime.state.activeTooltipId === "undefined") return;
    if (runtime.state.activeTooltipId === id) runtime.state.activeTooltipId = null;
  }
  function checkTooltipAnchors(runtime) {
    runtime.state.tooltipAnchorCheck = 0;
    if (!runtime.active || runtime.owner !== runtime.deps.game) return;
    for (const [id, el] of [...runtime.state.tooltipAnchors]) if (!anchorShown(runtime, el)) runtime.state.TOOLTIP_CLOSERS[id]();
  }
  function queueTooltipAnchorCheck(runtime) {
    if (!runtime.active || runtime.owner !== runtime.deps.game) return;
    if (!runtime.state.tooltipAnchorCheck) runtime.state.tooltipAnchorCheck = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.checkTooltipAnchors);
  }
  function watchTooltipAnchor(runtime, id, el) {
    if (!el || el === runtime.deps.document.body || el === runtime.deps.document.documentElement || typeof runtime.deps.MutationObserver !== "function") return;
    runtime.state.tooltipAnchors.set(id, el);
    if (runtime.state.tooltipAnchorWatch) return;
    runtime.state.tooltipAnchorWatch = new runtime.deps.MutationObserver(runtime.handlers.queueTooltipAnchorCheck);
    runtime.state.tooltipAnchorWatch.observe(runtime.deps.document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
  }
  function releaseTooltipAnchor(runtime, id) {
    runtime.state.tooltipAnchors.delete(id);
    if (runtime.state.tooltipAnchors.size || !runtime.state.tooltipAnchorWatch) return;
    runtime.state.tooltipAnchorWatch.disconnect();
    runtime.state.tooltipAnchorWatch = null;
    (0, runtime.deps.cancelAnimationFrame)(runtime.state.tooltipAnchorCheck);
    runtime.state.tooltipAnchorCheck = 0;
  }
  function closeEveryTooltip(runtime) {
    hideInfoTooltip(runtime);
    dismissItemTooltipNow(runtime);
    if (typeof runtime.deps.window.hidePassiveNodeTooltip === "function") runtime.deps.window.hidePassiveNodeTooltip();
  }
  function createShowInfoTooltipHtml(runtime) {
    return function showInfoTooltipHtml(x, y, html, borderColor, contentToken) {
      if (runtime.deps.tutorialActionUi.hushesTooltipAt(x, y)) return;
      let tt = runtime.deps.document.getElementById("info-tooltip");
      let hadComparison = tt.classList.contains("item-compare-tooltip");
      if (hadComparison) tt.classList.remove("item-compare-tooltip");
      const fresh = tt.style.display !== "block" || tt.innerHTML !== html || hadComparison;
      if (tt.innerHTML !== html || hadComparison) {
        tt.innerHTML = html;
        invalidateTooltipSize(runtime, tt);
      }
      runtime.state.activeInfoTooltipToken = contentToken || null;
      tt.style.borderColor = borderColor || "#777";
      tt.style.display = "block";
      positionTooltipElement(runtime, tt, x, y);
      setActiveTooltip(runtime, "info-tooltip");
      if (fresh) watchTooltipAnchor(runtime, "info-tooltip", tooltipAnchorAt(runtime, null, x, y));
    };
  }
  function hideInfoTooltip(runtime) {
    clearActiveTooltip(runtime, "info-tooltip");
    releaseTooltipAnchor(runtime, "info-tooltip");
    runtime.state.activeInfoTooltipToken = null;
    const element = runtime.deps.document.getElementById("info-tooltip");
    if (element) element.style.display = "none";
  }
  function dismissItemTooltipNow(runtime) {
    runtime.state.itemTooltipComparisonScheduler.cancel();
    runtime.state.itemTooltipComparisonScheduler.setPointer(null);
    runtime.state.activeItemTooltipToken = null;
    clearActiveTooltip(runtime, "item-tooltip-box");
    releaseTooltipAnchor(runtime, "item-tooltip-box");
    const element = runtime.deps.document.getElementById("item-tooltip-box");
    if (element) element.style.display = "none";
  }
  function cancelTooltipComparison(runtime) {
    let job = runtime.state.tooltipComparisonJob;
    runtime.state.tooltipComparisonJob = null;
    if (!job) return;
    if (job.delayHandle !== null) (0, runtime.deps.cancelAnimationFrame)(job.delayHandle);
    if (job.workHandle === null) return;
    if (job.workKind === "idle" && typeof runtime.deps.cancelIdleCallback === "function") (0, runtime.deps.cancelIdleCallback)(job.workHandle);
    else (0, runtime.deps.clearTimeout)(job.workHandle);
  }
  function hideItemTooltip(runtime, event) {
    if (event && runtime.deps.equipmentInventoryInteraction.getFocusedKey()) return;
    if (runtime.state.itemTooltipHideTimer) (0, runtime.deps.clearTimeout)(runtime.state.itemTooltipHideTimer);
    runtime.state.itemTooltipHideTimer = null;
    if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      dismissItemTooltipNow(runtime);
      return;
    }
    let pointerX = event.clientX;
    let pointerY = event.clientY;
    runtime.state.itemTooltipHideTimer = (0, runtime.deps.setTimeout)(() => {
      runtime.state.itemTooltipHideTimer = null;
      if (!runtime.active || runtime.owner !== runtime.deps.game) return;
      let hovered = runtime.deps.document.elementFromPoint(pointerX, pointerY);
      if (hovered && hovered.closest('[data-item-tooltip-anchor="1"]')) return;
      dismissItemTooltipNow(runtime);
    }, 24);
  }
  function anchorShown(runtime, el) {
    return el.isConnected && (typeof el.checkVisibility === "function" ? el.checkVisibility() : el.getClientRects().length > 0);
  }
  function tooltipAnchorAt(runtime, el, x, y) {
    return el && el.nodeType === 1 ? el : runtime.deps.document.elementFromPoint(x, y);
  }

  // modules/ui/tooltip-item-shell.mjs
  function createPrepareItemTooltip(runtime) {
    return function prepareItemTooltip(event, item, idx, isEquip, options) {
      const context = runtime.handlers.prepareItemTooltipContext(event, item, idx, isEquip, options);
      return context && runtime.deps.bagItemsUi.presentTooltip(context, event, item) ? null : context;
    };
  }
  function createPrepareItemTooltipContext(runtime) {
    return function prepareItemTooltipContext(event, item, idx, isEquip, options) {
      if (options.target) return { target: options.target, inline: true };
      if (runtime.deps.equipmentInventoryInteraction.getFocusedKey()) return null;
      if (runtime.state.itemTooltipHideTimer) {
        (0, runtime.deps.clearTimeout)(runtime.state.itemTooltipHideTimer);
        runtime.state.itemTooltipHideTimer = null;
      }
      let nextTooltipToken = options.token || (isEquip ? `equip:${idx}:${item.id}` : `inv:${idx}:${item.id}`);
      let tt = runtime.deps.document.getElementById("item-tooltip-box");
      runtime.state.itemTooltipComparisonScheduler.setPointer(event);
      if (runtime.state.activeItemTooltipToken === nextTooltipToken && tt.style.display === "block" && tt.innerHTML) {
        positionTooltipElement(runtime, tt, event.clientX, event.clientY);
        return null;
      }
      runtime.state.itemTooltipComparisonScheduler.cancel();
      runtime.state.activeItemTooltipToken = nextTooltipToken;
      return { target: tt, token: nextTooltipToken, inline: false };
    };
  }
  function createPresentItemTooltip(runtime) {
    return function presentItemTooltip(context, event, item, html, isEquip) {
      let tt = context.target;
      tt.innerHTML = html;
      runtime.deps.itemInfluencesUi.markTooltip(tt, item);
      if (context.inline) return;
      tt.dataset.rarity = item.rarity || "normal";
      tt.classList.toggle("item-compare-tooltip", false);
      tt.classList.toggle("dual-compare-tooltip", false);
      invalidateTooltipSize(runtime, tt);
      tt.style.display = "block";
      positionTooltipElement(runtime, tt, event.clientX, event.clientY);
      setActiveTooltip(runtime, "item-tooltip-box");
      watchTooltipAnchor(runtime, "item-tooltip-box", tooltipAnchorAt(runtime, event.currentTarget, event.clientX, event.clientY));
      if (!isEquip) runtime.state.itemTooltipComparisonScheduler.schedule(item, context.token, html);
    };
  }
  function getItemAffixTierHtml(runtime, stat) {
    const tier = (0, runtime.deps.isFixedEquipmentAffix)(stat) ? ' <span class="tier-badge tier-badge-fixed">[T0]</span>' : stat.tier !== void 0 ? ` ${(0, runtime.deps.getTierBadgeHtml)(stat.tier, "T")}` : "";
    const source = runtime.deps.equipmentCrafting.getLabel(stat);
    return `${tier}${source ? ` <span class="equipment-craft-source">, ${source}</span>` : ""}`;
  }
  function itemExplicitAffixHeaderHtml(runtime, item, count) {
    const used = runtime.deps.EXPLICIT_AFFIX_RULES[item.rarity] ? runtime.deps.equipmentCrafting.affixCounts(item) : null;
    const header = item.fusedRelic ? { text: `추가 옵션 ${count}개 (계승 ${item.stats.filter((stat) => stat.fusedFromRare).length}개)`, over: false } : runtime.deps.equipmentCrafting.affixHeader(item.rarity, count, used);
    const style = header.over ? ' style="color:#ffb454;"' : "";
    const note = header.over ? `<div class="tooltip-line" style="color:#ffb454;">${(0, runtime.deps._t)("레거시 아이템")}</div>` : "";
    return `<div class="tooltip-line tooltip-section tooltip-section-explicit"${style}><span class="px-center">${(0, runtime.deps._t)(header.text)}</span></div>${note}`;
  }
  function getItemBaseBadgesHtml(runtime, item) {
    let info = typeof runtime.deps.getItemBaseChainInfo === "function" ? (0, runtime.deps.getItemBaseChainInfo)(item) : null;
    let step = info && info.total > 1 ? ` <span class="${(0, runtime.deps.getBaseStepClassName)(info)}" data-tip="${(0, runtime.deps._t)("업그레이드 단계 (낮을수록 하위, 높을수록 상위 베이스)")}">[${info.step}/${info.total}]</span>` : "";
    return step;
  }

  // modules/ui/tooltip-item-details.mjs
  function getItemDropRegionLineHtml(runtime, item) {
    const region = item && item.dropRegion ? runtime.deps.ATLAS.regions.find((row) => row.id === item.dropRegion) : null;
    return region ? `<div class="tooltip-line" style="color:${runtime.deps.REGION_AFFIX_TONES[region.id]};">${(0, runtime.deps._t)("🌳 세계수 기운: {name}", { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name)) })}</div>` : "";
  }
  function getItemSlotDisplayLabel(runtime, item, fallbackLabel) {
    let rawSlot = item?.slot ?? null;
    if (rawSlot === null && item && Array.isArray(item.slots) && item.slots.length > 0) rawSlot = item.slots[0];
    let label = rawSlot !== null ? rawSlot : fallbackLabel || "장비";
    return (0, runtime.deps._t)((0, runtime.deps.weaponCategorySlotLabel)(item, String(label || "장비").replace(/[12]$/, "")));
  }
  function getItemStatRollRange(runtime, stat, options) {
    if (!stat) return null;
    let min = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : Number(stat.baseRollMin);
    let max = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : Number(stat.baseRollMax);
    if ((!Number.isFinite(min) || !Number.isFinite(max)) && options && options.estimateFromValue) {
      let cur = Number(stat.val || 0);
      min = Number((cur * 0.8).toFixed(2));
      max = Number((cur * 1.2).toFixed(2));
    }
    return orderedItemRollBounds(min, max);
  }
  function orderedItemRollBounds(min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return max < min ? { min: max, max: min } : { min, max };
  }
  function getItemStatRollRangeHtml(runtime, stat, options) {
    let statKey = stat && (stat.id || stat.stat);
    let range = getItemStatRollRange(runtime, stat, options);
    if (!range) return "";
    return ` <span style="color:#888;">(${(0, runtime.deps.formatValue)(statKey, range.min)}~${(0, runtime.deps.formatValue)(statKey, range.max)})</span>`;
  }
  function getHoneyLockBadgeHtml(runtime, stat) {
    return stat && stat.lockedByHoney ? ' <span class="item-affix-lock item-affix-lock--honey" data-tip="마력 깃든 벌꿀로 고정되어 재련/소멸되지 않는 옵션">🍯 벌꿀 고정</span>' : "";
  }
  function getUniqueEffectApplicationHint(runtime, item, isEquipped, equipSlotKey) {
    if (!item || item.rarity !== "unique" || !item.uniqueEffectKey) return "";
    let key = String(item.uniqueEffectKey || "");
    if (key === "rightRingSummonCap") {
      if (isEquipped && equipSlotKey !== "반지2") return "현재 조건 미충족: 오른쪽 반지 슬롯에 장착해야 적용";
      return "오른쪽 반지 슬롯 전용";
    }
    let triggerLabels = {
      summonDeathDamageBuff: "소환수 사망 시 발동",
      summonCritAspdStacks: "소환수 치명타 적중 시 발동",
      blockRecoverEnergyShieldPct: "막기 성공 시 발동",
      deflectGrantShadowStealth: "비껴내기 성공 시 발동",
      hitShockedEnemyDamageMorePct: "감전된 적을 타격할 때 적용",
      stackingElementalResDownOnHit: "원소 피해 적중 시 중첩",
      projectileExtraShotChance: "투사체 공격 시 확률 발동",
      maxRollBonusHit: "최대 피해 조건을 만족한 타격 시 발동",
      leechEfficiencyOnKill: "적 처치 시 발동",
      corpseExplodeOnKill: "적 처치 시 확률 발동",
      stealEliteTrait: "정예 처치 시 발동",
      realmRiftWaveOnHit: "적중 시 확률 발동",
      realmInvulnerableBarrierOnHit: "피격 시 확률 발동",
      realmAllResDownOnHit: "적중 시 중첩",
      realmKillMoveStacks: "적 처치 시 중첩",
      meteorFootsteps: "이동 중 확률 발동",
      queenBeeSummonOnHit: "적중 시 확률 발동",
      implicitAmp: "이 장비의 기본 옵션에 적용",
      loopGrowth: "지금 루프 수만큼 적용",
      familyBond: "장착한 수평 베이스 수만큼 적용",
      sightBeyond: "탐험 지도에서 적용",
      chestLuck: "탐험 지도를 열 때 적용",
      emberHeart: "장착한 타락 장비 수만큼 적용",
      amberTime: "장착한 장비의 품질 합만큼 적용",
      witheredEcho: "목걸이에 새긴 노드 수만큼 적용",
      nurseryBloom: "그루터기 함의 성장 완료된 꽃, 열매, 덩굴, 뿌리 수만큼 적용",
      // 체이싱 고유(2026-10-20, data/items.js): 수만큼 자라는 넷과 잔잔한 사건(js/combat-incidents.js)을 바꾸는 넷, 액막이 허리띠.
      uniqueChorus: "장착한 고유 장비 수만큼 적용",
      rareBark: "장착한 희귀 장비 수만큼 적용",
      wardVow: "끼운 액막이 수만큼 적용",
      emptyPlaces: "비어 있는 장비 칸 수만큼 적용",
      critterLure: "금빛 수액 슬라임을 만날 때 적용",
      goldenTouch: "적 처치 시 확률 발동",
      repdigitLuck: "행운의 숫자에 적용",
      drowsyIncense: "처음 들어선 전투 방에서 확률 발동",
      wardString: "액막이 칸과 끼운 액막이에 적용",
      uniqueTakenReduceWhen1Enemy: "생존한 적이 1명일 때만 적용",
      uniqueTakenReduceWhen2Enemies: "생존한 적이 2명 이상일 때만 적용",
      crowdEvasionMore: "요구 적 수를 만족할 때만 적용",
      mirrorOppositeRing: "반대쪽 반지의 옵션을 복제",
      kaleidoscopeShield: "이 장비의 추가 옵션에 적용"
    };
    if (triggerLabels[key]) return triggerLabels[key];
    if (/OnHit|onHit|OnKill|onKill|OnCrit|onCrit|OnBlock|onBlock/.test(key)) return "전투 조건 충족 시 발동";
    return "";
  }
  function getPlayerStatComparisonLines(runtime, before, after) {
    return Object.keys(runtime.deps.COMPARE_STAT_META).map((key) => {
      let diff = (after[key] || 0) - (before[key] || 0);
      if (Math.abs(diff) < 1e-3) return null;
      let meta = runtime.deps.COMPARE_STAT_META[key];
      let color = diff > 0 ? "#2ecc71" : "#e74c3c";
      let sign = diff > 0 ? "▲" : "▼";
      return `<div class="tooltip-line item-compare-line"><span style="color:${color}">${sign}</span> ${(0, runtime.deps._t)(meta.label)}: <span style="color:${color}">${meta.format(Math.abs(diff))}</span></div>`;
    }).filter(Boolean);
  }

  // modules/ui/tooltip-items.mjs
  function createShowItemTooltip(runtime) {
    return function showItemTooltip(event, idx, isEquip, itemOverride, options = {}) {
      let item = itemOverride || (isEquip ? runtime.deps.game.equipment[idx] : runtime.deps.game.inventory[idx]);
      let resolveItemStatTone = (statId) => (0, runtime.deps.getItemStatToneColor)(statId);
      if (!item) return;
      let context = runtime.handlers.prepareItemTooltip(event, item, idx, isEquip, options);
      if (!context) return;
      const inactiveAffixes = runtime.deps.equipmentInspectionUi.getInactiveAffixIds(runtime.deps.cachedTooltipStats, runtime.deps.game.equippedSummonSkills);
      const affixClass = (statId) => inactiveAffixes.has(statId) ? ' class="equipment-affix-inactive"' : "";
      let html = "";
      html = appendItemIdentity(runtime, html, { item, isEquip, idx });
      html = appendItemBaseStats(runtime, html, { item, affixClass, resolveItemStatTone });
      html = appendItemExplicitStats(runtime, html, { item, affixClass, resolveItemStatTone });
      html = appendItemEncroachment(runtime, html, { item });
      runtime.handlers.presentItemTooltip(context, event, item, html + runtime.deps.sapCatalystsUi.qualityHtml(item) + runtime.deps.gardenOilsUi.tooltipHtml(item) + runtime.deps.emberCorruptionUi.tooltipHtml(item) + runtime.deps.weaponMasteryUi.tooltipHtml(item), isEquip);
    };
  }
  function showCombatLogItemTooltip(runtime, event, token) {
    let item = runtime.deps.window.GameModules.combatLogView.itemSnapshot(token);
    if (!item) return;
    runtime.handlers.showItemTooltip(event, null, false, item, { token: `log:${token}:snapshot` });
  }
  function openCombatLogItemEquipment(runtime, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    dismissItemTooltipNow(runtime);
    (0, runtime.deps.switchTab)("tab-items");
    if (runtime.deps.document.body.classList.contains("desktop-windowed-ui") && typeof runtime.deps.openWindow === "function") (0, runtime.deps.openWindow)("tab-items");
    (0, runtime.deps.switchItemSubtab)("item-tab-equip");
  }
  function hideCombatLogItemTooltip(runtime, event) {
    hideItemTooltip(runtime, event);
  }
  function validateItemTooltipAnchor(runtime) {
    if (!runtime.state.activeItemTooltipToken) return;
    let [scope, key, idText] = String(runtime.state.activeItemTooltipToken).split(":");
    if (scope === "log") {
      if (!runtime.deps.window.GameModules.combatLogView.itemSnapshot(key)) hideItemTooltip(runtime);
      return;
    }
    let expectedId = Number(idText);
    if (!Number.isFinite(expectedId)) return hideItemTooltip(runtime);
    const current = itemTooltipRecord(runtime, scope, key);
    if (!current || current.id !== expectedId) hideItemTooltip(runtime);
  }
  function itemTooltipRecord(runtime, scope, key) {
    if (scope === "equip") {
      return runtime.deps.game.equipment && runtime.deps.game.equipment[key];
    }
    if (scope === "inv" && Array.isArray(runtime.deps.game.inventory)) return runtime.deps.game.inventory[Number(key)];
    return null;
  }
  function appendItemIdentity(runtime, html, context) {
    const { item, isEquip, idx } = context;
    html = appendItemTitleAndHall(runtime, html, { item });
    html += `<div class="tooltip-line tooltip-meta tooltip-meta-base">${(0, runtime.deps._t)("베이스")}: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.baseName))}${getItemBaseBadgesHtml(runtime, item)}</div>`;
    html += `<div class="tooltip-line tooltip-meta">${(0, runtime.deps._t)("아이템 Lv.")}${item.itemLevel || runtime.deps.levelProgression.tierLevel(item.hiddenTier || item.itemTier)} &ensp; ${(0, runtime.deps._t)("등급|티어")} ${(0, runtime.deps.getTierBadgeHtml)((0, runtime.deps.getItemCraftTier)(item), "T")}</div>${runtime.deps.levelProgressionUi.item(item, isEquip, idx)}`;
    html = appendItemUniqueEffect(runtime, html, { item, isEquip, idx });
    html += runtime.deps.equipmentSocketsUi.tooltipHtml(item) + getItemDropRegionLineHtml(runtime, item);
    if (item.fusedRelic) {
      let fusionGradeLabel = (0, runtime.deps._t)(item.fusionGrade === "perfect" ? "완벽한 융합" : item.fusionGrade === "unstable" ? "불안정한 융합" : "보통 융합");
      html += `<div class="tooltip-line" style="color:#8fd8ff;">⌛ ${fusionGradeLabel}${item.fusedRareName ? (0, runtime.deps._t)(", [{fusedRareName}]의 기억", { fusedRareName: (0, runtime.deps.escapeHTML)(item.fusedRareName) }) : ""}, 황금률/잿불가지/축복의 꽃잎만 사용 가능</div>`;
    }
    return html;
  }
  function appendItemEncroachment(runtime, html, context) {
    const { item } = context;
    if (item.encroached) {
      html += `<div class="tooltip-line" style="margin-top:6px; color:#b084ff;">${(0, runtime.deps._t)("잠식 특수 옵션")}</div>`;
      if (item.encroached.liberated && item.encroached.chosen) {
        let st = item.encroached.chosen;
        html += `<div class="tooltip-line" style="color:#d7b8ff;">${(0, runtime.deps._t)("[잠식] {statName} +{id} {tier}", { statName: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(st.statName || (0, runtime.deps.getStatName)(st.id))), id: (0, runtime.deps.formatValue)(st.id, st.val), tier: (0, runtime.deps.getTierBadgeHtml)(st.tier || 10, "T") })}</div>`;
      } else {
        html += `<div class="tooltip-line" style="color:#8d7bb3;">${(0, runtime.deps._t)("해방 전에는 효과 없음, 모든 제작으로도 변하지 않음")}</div>`;
      }
    }
    return html;
  }
  function appendItemExplicitStats(runtime, html, context) {
    const { item, affixClass, resolveItemStatTone } = context;
    let explicitStats = (item.stats || []).slice();
    if (item.chaosInfusion) explicitStats.push({ ...item.chaosInfusion, statName: (0, runtime.deps._t)("[주입] {statName}", { statName: (0, runtime.deps._t)(item.chaosInfusion.statName || (0, runtime.deps.getStatName)(item.chaosInfusion.id)) }) });
    if (explicitStats.length > 0) {
      explicitStats.sort(runtime.deps.itemTooltipRules.compareStats);
      html += itemExplicitAffixHeaderHtml(runtime, item, explicitStats.length);
      explicitStats.forEach((stat) => {
        let statKey = stat && (stat.id || stat.stat);
        let tierText = getItemAffixTierHtml(runtime, stat);
        let rangeText = `${getItemStatRollRangeHtml(runtime, stat)}${tierText}`;
        let honeyLockText = getHoneyLockBadgeHtml(runtime, stat) + runtime.deps.emberCorruptionUi.scaleBadgeHtml(stat) + runtime.deps.itemInfluencesUi.lineBadgeHtml(item, stat);
        let label = itemTooltipAffixLabel(runtime, stat, statKey);
        if (Array.isArray(stat.extraStats) && stat.extraStats.length > 0) {
          let parts = [`<span${affixClass(statKey)} style="color:${resolveItemStatTone(statKey)};">${(0, runtime.deps.escapeHTML)((0, runtime.deps.getStatName)(statKey))} +${(0, runtime.deps.formatValue)(statKey, stat.val)}</span>`];
          stat.extraStats.forEach((extra) => {
            let exKey = extra && (extra.id || extra.stat);
            parts.push(`<span${affixClass(exKey)} style="color:${resolveItemStatTone(exKey)};">${(0, runtime.deps.escapeHTML)((0, runtime.deps.getStatName)(exKey))} +${(0, runtime.deps.formatValue)(exKey, extra.val)}</span>`);
          });
          for (let i = 0; i < parts.length; i += 2) {
            let chunk = parts.slice(i, i + 2).join(' <span style="color:var(--copy-muted);">/</span> ');
            let continuation = i > 0 ? " compound-option-continuation" : "";
            let indent = i > 0 ? "padding-left:14px;" : "";
            let suffix = i === 0 ? `${rangeText}${honeyLockText}` : "";
            html += `<div class="tooltip-line${continuation}" style="${indent}">${chunk}${suffix}</div>`;
          }
          return;
        }
        html += `<div class="tooltip-line"><span${affixClass(statKey)} style="color:${resolveItemStatTone(statKey)};">${label} +${(0, runtime.deps.formatValue)(statKey, stat.val)}</span>${rangeText}${honeyLockText}</div>`;
      });
    } else {
      html += runtime.deps.itemTooltipRules.emptyExplicitHtml(item);
    }
    return html;
  }
  function appendItemBaseStats(runtime, html, context) {
    const { item, affixClass, resolveItemStatTone } = context;
    let defenseView = runtime.deps.itemTooltipRules.defenseView(item);
    if ((item.baseStats || []).length > 0) {
      html += `<div class="tooltip-line tooltip-section tooltip-section-base"><span class="px-center">${(0, runtime.deps._t)("베이스 옵션")}</span></div>${runtime.deps.colonyWardsUi.beltLineHtml(item)}`;
      item.baseStats.forEach((stat) => {
        let statKey = stat && (stat.id || stat.stat);
        if (statKey === "armor" || statKey === "evasion" || statKey === "energyShield") return;
        let cur = Number(stat.val || 0);
        let rangeText = getItemStatRollRangeHtml(runtime, stat, { estimateFromValue: true });
        let label = itemTooltipAffixLabel(runtime, stat, statKey);
        let valueColor = stat.exceptional ? "#ffb454" : resolveItemStatTone(statKey);
        let exMark = (stat.exceptional ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : "") + runtime.deps.itemInfluencesUi.lineBadgeHtml(item, stat);
        html += `<div class="tooltip-line"><span${affixClass(statKey)}><span style="color:${resolveItemStatTone(statKey)};">${label} </span><span style="color:${valueColor};">${(0, runtime.deps.formatSignedValue)(statKey, cur)}</span></span>${rangeText}${exMark}</div>`;
      });
      ["armor", "evasion", "energyShield"].forEach((id) => {
        let label = (0, runtime.deps.escapeHTML)((0, runtime.deps.getStatName)(id));
        let finalVal = defenseView[id];
        let baseVal = defenseView.base[id];
        if (finalVal <= 0 && baseVal <= 0) return;
        let src = (item.baseStats || []).find((stat) => stat && stat.id === id);
        let rangeText = "";
        if (src) {
          rangeText = getItemStatRollRangeHtml(runtime, src, { estimateFromValue: true });
        }
        let valueColor = src && src.exceptional ? "#ffb454" : resolveItemStatTone(id);
        let exMark = src && src.exceptional ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : "";
        if (Math.floor(finalVal) === Math.floor(baseVal)) {
          html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(baseVal)}</span>${rangeText}${exMark}</div>`;
        } else {
          html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(finalVal)}</span> <span style="color:var(--copy-bright);">(${Math.floor(baseVal)})</span>${rangeText}${exMark}</div>`;
        }
      });
    }
    return html;
  }
  function appendItemTitleAndHall(runtime, html, context) {
    const { item } = context;
    let exceptionalStars = typeof runtime.deps.getExceptionalBaseStarsHtml === "function" ? (0, runtime.deps.getExceptionalBaseStarsHtml)(item) : "";
    html = `<div class="tooltip-title" style="color:${(0, runtime.deps.getRarityColor)(item.rarity)}"><span class="px-center">[${getItemSlotDisplayLabel(runtime, item)}] ${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemDisplayName)(item))}${exceptionalStars}${item.encroached ? ` <span style="color:#b084ff;">${(0, runtime.deps._t)("(잠식)")}</span>` : ""}${item.corrupted ? ` <span style="color:#e74c3c;">${(0, runtime.deps._t)("(타락)")}</span>` : ""}${runtime.deps.craftingWorkspaceUi.imprintMark(item)}${item.loopSealed ? ` <span style="color:#7fd99a;" data-tip="${(0, runtime.deps._t)("나무꾼의 손길로 봉인됨: 루프가 지나도 유지")}">${(0, runtime.deps._t)("🌿봉인")}</span>` : ""}</span></div>${runtime.deps.itemInfluencesUi.tooltipHtml(item)}`;
    if (item.hallReplica) html += `<div class="tooltip-line" style="color:#d2b878;">🏛️ 전당 소장품, 전시자 ${(0, runtime.deps.escapeHTML)(item.hallCuratorName || "익명")}, 감정 ${Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0)).toLocaleString()}, 제작/재등록 불가</div>`;
    else if (item.hallRelistBlocked) html += '<div class="tooltip-line" style="color:#bda979;">🏛️ 전당 복제 이력, 재등록 불가</div>';
    return html;
  }
  function itemTooltipAffixLabel(runtime, stat, statKey) {
    return (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(stat.statName || (0, runtime.deps.getStatName)(statKey)) || statKey);
  }
  function appendItemUniqueEffect(runtime, html, context) {
    const { item, isEquip, idx } = context;
    if (item.rarity === "unique" && item.uniqueEffect) {
      let uniqueGlow = "display:inline-block;padding:1px 6px;border-radius:6px;border:1px solid rgba(198,162,255,0.55);background:linear-gradient(135deg, rgba(73,52,108,0.45) 0%, rgba(31,23,56,0.5) 100%);color:#f0dcff;font-weight:700;text-shadow:0 0 6px rgba(196,154,255,0.8),0 0 12px rgba(142,109,214,0.55);box-shadow:0 0 10px rgba(140,94,220,0.4),inset 0 0 10px rgba(229,205,255,0.2);";
      html += `<div class="tooltip-line" style="margin-top:6px;"><span style="${uniqueGlow}">✨ ${(0, runtime.deps._t)("고유 효과")}: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.uniqueEffect))}</span></div>`;
      let applicationHint = getUniqueEffectApplicationHint(runtime, item, !!isEquip, isEquip ? idx : null);
      if (applicationHint) html += `<div class="tooltip-line" style="color:#bda9d8; margin-top:3px;">◆ ${(0, runtime.deps.escapeHTML)(applicationHint)}</div>`;
    }
    return html;
  }

  // modules/ui/tooltip-comparison.mjs
  function setTooltipComparisonPointer(runtime, event) {
    runtime.state.tooltipComparisonPointer = {
      x: Number.isFinite(event && event.clientX) ? event.clientX : 0,
      y: Number.isFinite(event && event.clientY) ? event.clientY : 0
    };
  }
  function getTooltipComparisonSlots(runtime, item) {
    let slots = (0, runtime.deps.getEquipCandidateSlots)(item).filter((slotKey) => !!runtime.deps.game.equipment[slotKey]);
    if (slots.length === 0) slots = (0, runtime.deps.getEquipCandidateSlots)(item);
    return slots;
  }
  function isTooltipComparisonActive(runtime, job) {
    if (!runtime.active || runtime.owner !== runtime.deps.game || runtime.state.tooltipComparisonJob !== job) return false;
    if (job.receiver) return job.receiver.isActive();
    if (runtime.state.activeItemTooltipToken !== job.tooltipToken) return false;
    return !(typeof runtime.deps.equipmentInventoryInteraction !== "undefined" && runtime.deps.equipmentInventoryInteraction && typeof runtime.deps.equipmentInventoryInteraction.isCarrying === "function" && runtime.deps.equipmentInventoryInteraction.isCarrying());
  }
  function keepTooltipComparisonActive(runtime, job) {
    if (isTooltipComparisonActive(runtime, job)) return true;
    if (runtime.state.tooltipComparisonJob === job) cancelTooltipComparison(runtime);
    return false;
  }
  function buildTooltipComparisonPanel(runtime, item, targetSlot) {
    const backup = runtime.deps.game.equipment[targetSlot];
    const { before, after } = runtime.deps.previewBuildStats((copy) => {
      copy.equipment[targetSlot] = item;
    });
    let changedLines = getPlayerStatComparisonLines(runtime, before, after);
    if ((backup && backup.uniqueEffect) !== item.uniqueEffect) {
      let hint = item.uniqueEffect ? getUniqueEffectApplicationHint(runtime, item, true, targetSlot) : "";
      if (item.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#d8b5ff;">◆ 획득: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.uniqueEffect))}${hint ? `<small style="display:block;color:#a995bf;">${(0, runtime.deps.escapeHTML)(hint)}</small>` : ""}</div>`);
      if (backup && backup.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#c98f9f;">◇ 상실: ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(backup.uniqueEffect))}</div>`);
    }
    let label = (0, runtime.deps.getDualSlotDisplayLabel)(targetSlot);
    if (changedLines.length > 0) return `<div class="item-compare-panel"><div class="tooltip-line item-compare-title">${(0, runtime.deps._t)("{label} 기준 착용 시 변화", { label })}</div>${changedLines.join("")}</div>`;
    if (!(0, runtime.deps.isDualSlotItem)(item.slot)) return "";
    return `<div class="item-compare-panel item-compare-empty"><div class="tooltip-line item-compare-title">${label}</div><div class="tooltip-line">${(0, runtime.deps._t)("교체 시 변화 없음")}</div></div>`;
  }
  function applyTooltipComparison(runtime, job, result) {
    if (!keepTooltipComparisonActive(runtime, job)) return;
    if (job.receiver) {
      job.receiver.apply(result);
      return;
    }
    let tt = runtime.deps.document.getElementById("item-tooltip-box");
    if (!tt) return;
    tt.classList.toggle("item-compare-tooltip", result.hasSections);
    tt.classList.toggle("dual-compare-tooltip", result.hasSections && (0, runtime.deps.isDualSlotItem)(job.item.slot));
    tt.innerHTML = result.hasSections ? `<div class="item-tooltip-main">${job.mainHtml}</div>${result.markup}` : job.mainHtml;
    invalidateTooltipSize(runtime, tt);
    positionTooltipElement(runtime, tt, runtime.state.tooltipComparisonPointer.x, runtime.state.tooltipComparisonPointer.y);
  }
  function finishTooltipComparison(runtime, job) {
    let sections = job.sections.filter(Boolean);
    let layoutClass = sections.length > 1 ? "item-compare-grid" : "item-compare-single";
    let result = {
      hasSections: sections.length > 0,
      markup: sections.length > 0 ? `<div class="${layoutClass}">${sections.join("")}</div>` : ""
    };
    applyTooltipComparison(runtime, job, result);
    if (runtime.state.tooltipComparisonJob === job) runtime.state.tooltipComparisonJob = null;
  }
  function failTooltipComparison(runtime, job, error) {
    runtime.deps.console.error("equipment tooltip comparison failed:", error);
    let result = {
      hasSections: true,
      markup: '<div class="item-compare-single"><div class="item-compare-panel item-compare-empty"><div class="tooltip-line">장비 비교를 표시하지 못했습니다.</div></div></div>'
    };
    applyTooltipComparison(runtime, job, result);
    if (runtime.state.tooltipComparisonJob === job) runtime.state.tooltipComparisonJob = null;
  }
  function queueTooltipComparisonWork(runtime, job) {
    if (!keepTooltipComparisonActive(runtime, job)) return;
    let run = () => {
      job.workHandle = null;
      if (!keepTooltipComparisonActive(runtime, job)) return;
      let slot = job.slots[job.index++];
      try {
        job.sections.push(buildTooltipComparisonPanel(runtime, job.item, slot));
      } catch (error) {
        failTooltipComparison(runtime, job, error);
        return;
      }
      if (job.index >= job.slots.length) finishTooltipComparison(runtime, job);
      else queueTooltipComparisonWork(runtime, job);
    };
    if (typeof runtime.deps.requestIdleCallback === "function") {
      job.workKind = "idle";
      job.workHandle = (0, runtime.deps.requestIdleCallback)(run, { timeout: 240 });
    } else {
      job.workKind = "timeout";
      job.workHandle = (0, runtime.deps.setTimeout)(run, 0);
    }
  }
  function scheduleTooltipComparison(runtime, item, tooltipToken, mainHtml, receiver = null) {
    cancelTooltipComparison(runtime);
    let slots = getTooltipComparisonSlots(runtime, item);
    if (slots.length === 0) return;
    let job = {
      item,
      tooltipToken,
      mainHtml,
      receiver,
      slots,
      sections: [],
      index: 0,
      delayHandle: null,
      workHandle: null,
      workKind: ""
    };
    runtime.state.tooltipComparisonJob = job;
    job.delayHandle = (0, runtime.deps.requestAnimationFrame)(() => {
      job.delayHandle = null;
      queueTooltipComparisonWork(runtime, job);
    });
  }

  // modules/ui/tooltip-player.mjs
  function showSporeCraftTooltip(runtime, event, kind) {
    let info = kind === "corrupt" ? { name: "부패 수확", desc: "잠기지 않은 원소 피해/원소 저항 옵션 1개를 무작위로 제거합니다.", color: "#b58ad9" } : { name: "균열 수확", desc: "빈 옵션 1칸에 해당 부위의 화석 전용 옵션 1개를 추가합니다.", color: "#72c8d8" };
    let html = `<div class="tooltip-title">${(0, runtime.deps._t)(info.name)}</div><div class="tooltip-line">${(0, runtime.deps._t)(info.desc)}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, info.color);
  }
  function renderBreakdownHtml(runtime, data) {
    let html = `<div class="tooltip-title">${(0, runtime.deps._t)(data.title)}</div>`;
    (data.lines || []).filter(Boolean).forEach((line) => {
      html += `<div class="tooltip-line">${line}</div>`;
    });
    if (data.final !== void 0) html += `<div class="tooltip-final">${(0, runtime.deps._t)("최종 수치: {final}", { final: data.final })}</div>`;
    return html;
  }
  function showStatTooltip(runtime, event, key) {
    let stats = (0, runtime.deps.getUiPlayerStats)();
    runtime.deps.cachedTooltipStats = stats;
    let data = stats && stats.breakdowns ? stats.breakdowns[key] : null;
    if (!data) return;
    const rect = event.currentTarget.getBoundingClientRect();
    runtime.handlers.showInfoTooltipHtml(event.clientX ?? rect.left, event.clientY ?? rect.bottom, renderBreakdownHtml(runtime, data), "#f39c12");
  }
  function createShowPlayerAilmentTooltip(runtime) {
    return function showPlayerAilmentTooltip(event, type, timeLeft, power, sourceHitDamage) {
      let visual = (0, runtime.deps.getUiCombatEffectPresentation)(type);
      let p = Math.max(0.1, Number(power || 0.1));
      let source = Math.max(0, Number(sourceHitDamage || 0));
      const detail = playerAilmentDetail(runtime, type, p, source);
      let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(visual.label))}</div><div class="tooltip-line">${(0, runtime.deps._t)("남은 시간: {ceil}초", { ceil: Math.ceil(Math.max(0, Number(timeLeft || 0))) })}</div><div class="tooltip-line">${(0, runtime.deps._t)("위력: {p}", { p: p.toFixed(2) })}</div><div class="tooltip-line">${detail}</div>`;
      runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, "#ff7f7f");
    };
  }
  function showPlayerEhpTooltip(runtime, event) {
    const anchor = event.currentTarget;
    const rect = anchor.getBoundingClientRect();
    const html = `<div class="tooltip-title">${(0, runtime.deps._t)("속성별 실효 체력")}</div><div class="tooltip-line">${(0, runtime.deps.escapeHTML)(anchor.dataset.ehpDetail)}</div><div class="tooltip-line tooltip-muted">${(0, runtime.deps._t)("공격 EHP는 회피를 포함한 평균 내구도, 직격 EHP는 회피하지 못한 타격 기준입니다.")}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX || rect.left, event.clientY || rect.bottom, html, "#b49b68");
  }
  function showMapProgressTooltip(runtime, event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const speed = Math.max(1, Number(runtime.deps.cachedTooltipStats?.moveSpeed) || 100);
    const multiplier = speed / 100;
    const saved = (1 - 1 / multiplier) * 100;
    const html = `<div class="tooltip-title">${(0, runtime.deps._t)("이동 속도와 진행도")}</div><div class="tooltip-line">${(0, runtime.deps._t)("이동 속도 {speed}, 기본 대비 {multiplier}배", { speed: speed.toFixed(1), multiplier: multiplier.toFixed(2) })}</div><div class="tooltip-line">${(0, runtime.deps._t)("같은 이동 구간의 소요 시간 {abs}% {value}", { abs: Math.abs(saved).toFixed(1), value: saved >= 0 ? (0, runtime.deps._t)("단축") : (0, runtime.deps._t)("증가") })}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX || rect.left, event.clientY || rect.bottom, html, "#b49b68");
  }
  function showPlayerExperienceTooltip(runtime, event) {
    let progress = (0, runtime.deps.getUiExperienceProgress)(runtime.deps.game.level, runtime.deps.game.exp);
    let current = (0, runtime.deps.formatSettingNumber)(progress.current, "showExpComma");
    let required = (0, runtime.deps.formatSettingNumber)(progress.required, "showExpComma");
    let remaining = (0, runtime.deps.formatSettingNumber)(progress.remaining, "showExpComma");
    let html = `<div class="tooltip-title">경험치</div><div class="tooltip-line">${(0, runtime.deps._t)("현재: {current} / {required}", { current, required })}</div><div class="tooltip-line">${(0, runtime.deps._t)("다음 레벨까지: {remaining}", { remaining })}</div><div class="tooltip-line">${(0, runtime.deps._t)("진행도: {percent}%", { percent: progress.percent.toFixed(1) })}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, "#c89be8");
  }
  function createShowPlayerRuntimeEffectTooltip(runtime) {
    return function showPlayerRuntimeEffectTooltip(event, type, value, maxValue, remainSec) {
      let visual = (0, runtime.deps.getUiCombatEffectPresentation)(type);
      let detail = (0, runtime.deps.getUiRuntimeEffectDetail)(type, value, maxValue);
      let duration = Number(remainSec || 0) > 0 ? `<div class="tooltip-line">${(0, runtime.deps._t)("남은 시간: {ceil}초", { ceil: Math.ceil(remainSec) })}</div>` : "";
      let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(visual.label))}</div>${duration}<div class="tooltip-line">${(0, runtime.deps.escapeHTML)(detail)}</div>`;
      runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
    };
  }
  function createShowPlayerNamedEffectTooltip(runtime) {
    return function showPlayerNamedEffectTooltip(event, type, name, detail, remainSec) {
      let visual = (0, runtime.deps.getUiCombatEffectPresentation)(type);
      let duration = Number(remainSec || 0) > 0 ? `<div class="tooltip-line">${(0, runtime.deps._t)("남은 시간: {ceil}초", { ceil: Math.ceil(remainSec) })}</div>` : "";
      let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)(name || visual.label)}</div>${duration}<div class="tooltip-line">${(0, runtime.deps.escapeHTML)(detail || "효과가 적용 중입니다.")}</div>`;
      runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
    };
  }
  function createShowPlayerCosmosDebuffTooltip(runtime) {
    return function showPlayerCosmosDebuffTooltip(event, type, value, remainSec, label) {
      let visual = (0, runtime.deps.getUiCombatEffectPresentation)(type);
      let safeLabel = (0, runtime.deps.escapeHTML)(label || visual.label);
      let html = `<div class="tooltip-title">${safeLabel}</div><div class="tooltip-line">${(0, runtime.deps._t)("남은 시간: {ceil}초", { ceil: Math.ceil(Math.max(0, Number(remainSec || 0))) })}</div><div class="tooltip-line">${safeLabel} -${Math.max(0, Number(value || 0)).toFixed(0)}%</div>`;
      runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
    };
  }
  function findConditionEffectDelta(runtime, name, type) {
    if (type !== "curse") return (runtime.deps.talismanCombat.active().find((row) => row.buff.name === name) || {}).delta || null;
    for (const rows of Object.values(runtime.deps.game.enemyConditionDebuffs || {})) {
      const row = (rows || []).find((entry) => entry && entry.name === name);
      if (row) return row.delta;
    }
    return null;
  }
  function showPlayerBuffTooltip(runtime, event, name, type, remainSec) {
    const typeLabel = { curse: "저주", warcry: "함성", guard: "수호" }[type] || "효과";
    let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps.getConditionEffectTitle)(name))}</div><div class="tooltip-line">${(0, runtime.deps._t)("분류: {typeLabel}, 부적 조건부 줄", { typeLabel })}</div>`;
    if (Number(remainSec) > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("남은 시간: {ceil}초", { ceil: Math.ceil(Number(remainSec)) })}</div>`;
    html += `<div class="tooltip-line">${(0, runtime.deps.escapeHTML)(runtime.deps.talismans.describeDelta(findConditionEffectDelta(runtime, name, type)) || "효과 없음")}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, "#7fb3ff");
  }
  function playerAilmentDetail(runtime, type, p, source) {
    let detail = "";
    if ((0, runtime.deps.isUiDamageAilmentType)(type)) {
      let tooltipStats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)(null);
      let dps = (0, runtime.deps.getUiPlayerDamageAilmentDps)({ type, power: p, sourceHitDamage: source }, tooltipStats);
      let basis = source > 0 ? (0, runtime.deps._t)("받은 피해 {floor} 기준", { floor: Math.floor(source) }) : "최대 생명력 기반";
      detail = `${(0, runtime.deps._t)("초당 피해: 약 {dps}", { dps })} <span style="color:var(--copy-bright);">(${basis})</span>`;
    } else if (type === "chill") detail = (0, runtime.deps._t)("공격 속도 약 32% 감소");
    else if (type === "shock") {
      let tooltipStats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)(null);
      let shockTakenIncrease = (0, runtime.deps.getUiPlayerShockTakenDamageIncreasePct)(p, tooltipStats);
      detail = (0, runtime.deps.formatUiTakenDamageShockLine)(shockTakenIncrease);
    } else if (type === "freeze") detail = "행동 불가";
    return detail;
  }

  // modules/ui/tooltip-enemy.mjs
  function getUiEnemyDamageAilmentTooltipDetail(runtime, state) {
    let tooltipStats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)(null);
    let ailmentDps = (0, runtime.deps.getUiEnemyDamageAilmentDps)({
      type: state.type,
      power: state.power,
      sourceHitDamage: state.sourceHitDamage,
      critDotBonusPct: state.critDotBonusPct
    }, tooltipStats);
    let totalDamage = Math.max(0, Math.floor(ailmentDps * state.stacks * state.timeLeft));
    let stackText = state.stacks > 1 ? (0, runtime.deps._t)(", {stacks}중첩", { stacks: state.stacks }) : "";
    return `${(0, runtime.deps._t)("총 피해량: 약 {totalDamage}", { totalDamage })} <span style="color:var(--copy-bright);">${(0, runtime.deps._t)("(원천피해: {floor} / 초당 피해: 약 {ailmentDps}{stackText})", { floor: Math.floor(state.sourceHitDamage), ailmentDps, stackText })}</span>`;
  }
  function getUiFlameDecayTooltipDetail(runtime, state) {
    let dps = Math.max(0, Math.floor(state.specialDps));
    let totalDamage = Math.max(0, Math.floor(dps * state.timeLeft));
    let rawTick = Math.max(0, Math.floor(state.rawTickDamage));
    let interval = Math.max(0.02, state.tickInterval);
    let rawDps = rawTick > 0 ? Math.floor(rawTick / interval) : 0;
    let resistText = Number.isFinite(state.enemyRes) ? (0, runtime.deps._t)(", 적 화염 저항/관통 후 {enemyRes}%", { enemyRes: state.enemyRes.toFixed(1) }) : "";
    let abyssText = Math.abs(state.abyssPlayerMul - 1) > 1e-3 ? (0, runtime.deps._t)(", 심연/지역 배율 {abyssPlayerMul}x", { abyssPlayerMul: state.abyssPlayerMul.toFixed(2) }) : "";
    return `${(0, runtime.deps._t)("총 피해량: 약 {totalDamage}", { totalDamage })} <span style="color:var(--copy-bright);">${(0, runtime.deps._t)("(최종 초당 피해: 약 {dps}, 원시 {rawDps}/s{resistText}{abyssText})", { dps, rawDps, resistText, abyssText })}</span><br><span style="color:#ffb48a;">${(0, runtime.deps._t)("점화 피해 증폭: {igniteTakenMultiplier}x (생명력 기반 시너지)", { igniteTakenMultiplier: state.igniteTakenMultiplier.toFixed(2) })}</span>`;
  }
  function getUiEnemyAilmentTooltipDetail(runtime, state) {
    if ((0, runtime.deps.isUiDamageAilmentType)(state.type)) return getUiEnemyDamageAilmentTooltipDetail(runtime, state);
    if (state.type === "flameDecay") return getUiFlameDecayTooltipDetail(runtime, state);
    if (state.type === "shock") {
      let tooltipStats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)(null);
      let increase = (0, runtime.deps.getUiEnemyShockTakenDamageIncreasePct)(state.power, tooltipStats);
      return `${(0, runtime.deps.formatUiTakenDamageShockLine)(increase)} <span style="color:var(--copy-bright);">${(0, runtime.deps._t)("(최대 생명력 대비 타격 비율 반영)")}</span>`;
    }
    let formatter = runtime.state.UI_ENEMY_AILMENT_DETAIL_FORMATTERS[state.type];
    return formatter ? formatter(state) : "효과가 적용 중입니다.";
  }
  function showEnemyAilmentTooltip(runtime, event, payload) {
    let source = payload && typeof payload === "object" ? payload : {};
    let state = {
      type: String(source.type || "unknown"),
      ...enemyAilmentDamageValues(source),
      enemyRes: Number.isFinite(Number(source.enemyRes)) ? Number(source.enemyRes) : NaN,
      abyssPlayerMul: Number.isFinite(Number(source.abyssPlayerMul)) ? Number(source.abyssPlayerMul) : 1,
      igniteTakenMultiplier: Math.max(1, Number(source.igniteTakenMultiplier) || 1)
    };
    let visual = (0, runtime.deps.getUiCombatEffectPresentation)(state.type);
    let powerLine = (0, runtime.deps.isUiDamageAilmentType)(state.type) || state.type === "hunterExpose" ? "" : `<div class="tooltip-line">${(0, runtime.deps._t)("위력: {power}", { power: state.power.toFixed(2) })}</div>`;
    let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(visual.label))}</div><div class="tooltip-line">${(0, runtime.deps._t)("남은 시간: {ceil}초", { ceil: Math.ceil(state.timeLeft) })}</div>${powerLine}<div class="tooltip-line">${getUiEnemyAilmentTooltipDetail(runtime, state)}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, "#ffcf88");
  }
  function enemyAilmentDamageValues(source) {
    return {
      timeLeft: Math.max(0, Number(source.timeLeft) || 0),
      power: Math.max(0, Number(source.power) || 0),
      sourceHitDamage: Math.max(0, Number(source.sourceHitDamage) || 0),
      specialDps: Math.max(0, Number(source.specialDps) || 0),
      critDotBonusPct: Number(source.critDotBonusPct) || 0,
      stacks: Math.max(1, Math.floor(Number(source.stacks) || 1)),
      rawTickDamage: Math.max(0, Number(source.rawTickDamage) || 0),
      tickInterval: Math.max(0.02, Number(source.tickInterval) || 0.02)
    };
  }

  // modules/common/text.mjs
  function keepKoreanUnitParticles(text) {
    return String(text).replace(/%(?=[가-힣])/g, "%⁠");
  }

  // modules/ui/tooltip-gems.mjs
  function getGemTargetSummaryHtml(runtime, skill) {
    const label = { all: "광역", whirl: "광역 회전", cleave: "전방 다중", chain: "연쇄", pierce: "관통" }[skill.targetMode] || "단일";
    const kind = `<div class="tooltip-line">${(0, runtime.deps._t)("타겟 방식: {label}", { label })}</div>`;
    if ((skill.targets || 0) >= 99) return kind;
    const cap = (skill.tags || []).includes("projectile") ? 12 : 6;
    return `${kind}<div class="tooltip-line">${(0, runtime.deps._t)("최대 타겟 수: {min}", { min: Math.min(cap, Math.max(1, skill.targets || 1)) })}</div>`;
  }
  function getGemAwakenedPerkLine(runtime, name, type, info) {
    const perk = type !== "support" && Object.hasOwn(runtime.deps.GEM_AWAKENED_PERKS, name) ? runtime.deps.GEM_AWAKENED_PERKS[name] : null;
    if (!perk || !info.awakened && info.baseLevel < 15) return "";
    return `<div class="tooltip-line" style="color:#9fd6ff;">${(0, runtime.deps._t)("각성 효과: {label}{value}", { label: (0, runtime.deps._t)(perk.label), value: info.awakened ? "" : (0, runtime.deps._t)(" (각성 룬 변환 뒤)") })}</div>`;
  }
  function getRuneLevelTooltipLine(runtime, name, support) {
    const need = (0, runtime.deps.getRuneLevelReq)(name, support);
    if (!need) return "";
    return `<div class="tooltip-line"${(0, runtime.deps.getRuneLevelNote)(name, support) ? ' style="color:#ff9b8a;"' : ""}>${(0, runtime.deps._t)("요구 레벨 {need}", { need })}</div>`;
  }
  function showGemTooltip(runtime, event, type, name, target = null) {
    if (gemTooltipCovered(runtime, target)) return;
    let cacheKey = `${runtime.deps.i18n.language}:${type || "active"}:${name}`;
    if (!target && reuseInfoTooltip(runtime, event, cacheKey)) return;
    let stats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)();
    if (reuseGemTooltipCache(runtime, event, target, { key: cacheKey, stats })) return;
    let info = (0, runtime.deps.getUiGemPresentation)(name, type === "support", stats);
    let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name))}</div>${getRuneLevelTooltipLine(runtime, name, type === "support")}`;
    if (type === "support") {
      html = appendSupportRuneDetails(runtime, html, { info, name, stats });
    } else {
      html = appendActiveRuneDetails(runtime, html, { info, name, stats });
    }
    html = appendRuneProgression(runtime, html, { type, name, info, stats });
    let border = type === "support" ? "#2bcbba" : "#ff5252";
    html = runtime.deps.statToneText.markup(html);
    runtime.state.gemTooltipCache = { key: cacheKey, html, border, stats };
    presentGemTooltip(runtime, event, target, runtime.state.gemTooltipCache);
  }
  function appendSupportSummonPreview(runtime, html, context) {
    const { name, stats } = context;
    if (runtime.deps.SUPPORT_GEM_DB[name] && Array.isArray(runtime.deps.SUPPORT_GEM_DB[name].tags) && runtime.deps.SUPPORT_GEM_DB[name].tags.includes("summon")) {
      const preview = typeof runtime.deps.getSummonTooltipPreview === "function" ? (0, runtime.deps.getSummonTooltipPreview)(name, stats) : null;
      if (preview) {
        html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? (0, runtime.deps._t)(", 특징: {trait}", { trait: preview.trait }) : ""}</div>`;
        html += `<div class="tooltip-line">${(0, runtime.deps._t)("소환수 레벨: {gemLevel}", { gemLevel: preview.gemLevel })}</div>`;
        if (preview.maxHp > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("수액 골렘 생명력: 약 {floor}", { floor: Math.floor(preview.maxHp).toLocaleString() })}</div>`;
        if (preview.redirectPct > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("피해 대리: 히트 피해 {redirectPct}%", { redirectPct: preview.redirectPct })}</div>`;
      }
    }
    return html;
  }
  function appendSupportRuneScaling(runtime, html, context) {
    const { info, valueText } = context;
    if (info.scaleWithOwnStat) {
      let baseText = typeof runtime.deps.formatSupportGemEffectValue === "function" ? (0, runtime.deps.formatSupportGemEffectValue)(info.scaleBase) : Number(info.scaleBase || 0).toFixed(1);
      let ratioText = typeof runtime.deps.formatSupportGemEffectValue === "function" ? (0, runtime.deps.formatSupportGemEffectValue)(info.scaleRatioPct) : Number(info.scaleRatioPct || 0).toFixed(1);
      html += `<div class="tooltip-line" style="color:#9fd4ff;">${(0, runtime.deps._t)("계산: 보조스킬룬 제외 {statName} {baseText}% × 공명 계수 {ratioText}% = +{valueText}%", { statName: (0, runtime.deps._t)(info.statName), baseText, ratioText, valueText })}</div>`;
      html += `<div class="tooltip-line" style="color:#b8a6ff;">${(0, runtime.deps._t)("제외: 이 보조스킬룬 및 다른 보조스킬룬으로 얻은 {statName} 증가", { statName: (0, runtime.deps._t)(info.statName) })}</div>`;
    }
    return html;
  }
  function appendSupportRuneDetails(runtime, html, context) {
    const { info, name, stats } = context;
    html += `<div class="tooltip-line">${keepKoreanUnitParticles((0, runtime.deps._t)(info.desc))}</div>`;
    let tierText = typeof runtime.deps.getSupportTierLabel === "function" ? (0, runtime.deps.getSupportTierLabel)(name, info.activeTier) : info.activeTier === 3 ? "상급" : info.activeTier === 2 ? "중급" : "하급";
    let valueText = typeof runtime.deps.formatSupportGemEffectValue === "function" ? (0, runtime.deps.formatSupportGemEffectValue)(info.value) : Number(info.value || 0).toFixed(1);
    html += `<div class="tooltip-line" style="margin-top:6px;">${(0, runtime.deps._t)("효과({tierText}): {effectText}", { tierText: (0, runtime.deps._t)(tierText), effectText: (0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.effectText(name, info.activeTier, stats)) })}</div>` + runtime.deps.gemSlotDialog.tierLineHtml(name, stats);
    html = appendSupportRuneScaling(runtime, html, { info, valueText });
    if (runtime.deps.TAGGED_DAMAGE_STAT_BY_TAG && Object.values(runtime.deps.TAGGED_DAMAGE_STAT_BY_TAG).includes(info.statId)) {
      let tag = Object.keys(runtime.deps.TAGGED_DAMAGE_STAT_BY_TAG).find((key) => runtime.deps.TAGGED_DAMAGE_STAT_BY_TAG[key] === info.statId);
      html += `<div class="tooltip-line">${(0, runtime.deps._t)("적용 태그:")} <span class="gem-card-tags gem-tooltip-tags">${(0, runtime.deps.renderGemTagChips)({ tags: [tag] }, 1)}</span></div>`;
    }
    html = appendSupportSummonPreview(runtime, html, { name, stats });
    return html;
  }
  function appendAttackSummonPreview(runtime, html, context) {
    const { rawSkillTags, name, stats } = context;
    if (rawSkillTags.includes("summon_attack")) {
      const preview = typeof runtime.deps.getSummonTooltipPreview === "function" ? (0, runtime.deps.getSummonTooltipPreview)(name, stats) : null;
      if (preview) {
        html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? (0, runtime.deps._t)(", 특징: {trait}", { trait: preview.trait }) : ""}</div>`;
        html += `<div class="tooltip-line">${(0, runtime.deps._t)("소환수 레벨: {gemLevel}", { gemLevel: preview.gemLevel })}</div>`;
        html += `<div class="tooltip-line">예상 1타 피해: ${preview.hitDamageMin} ~ ${preview.hitDamageMax}${preview.attackPerSecond > 0 ? (0, runtime.deps._t)(", 공속 {attackPerSecond}/s", { attackPerSecond: preview.attackPerSecond }) : ""}</div>`;
        html += `<div class="tooltip-line">${(0, runtime.deps._t)("소환수 생명력: {floor}, 자체 재생 {floor2}/s", { floor: Math.floor(preview.maxHp).toLocaleString(), floor2: Math.floor(preview.regenPerSec).toLocaleString() })}</div>`;
        html += `<div class="tooltip-line">${(0, runtime.deps._t)("회피 {floor}, 현재 지역 적 기준 {evadeChancePct}%", { floor: Math.floor(preview.evasion).toLocaleString(), evadeChancePct: preview.evadeChancePct.toFixed(1) })}</div>`;
        if (preview.critChancePct > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("치명타: {critChancePct}%, 치명 피해 {floor}%", { critChancePct: preview.critChancePct, floor: Math.floor(preview.critDmgPct) })}</div>`;
        if (preview.resPenBonus > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("소환수 자체 저항 관통 +{resPenBonus}%", { resPenBonus: preview.resPenBonus })}</div>`;
        if (preview.physIgnoreBonus > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("소환수 자체 물리 피해 감소 무시 +{physIgnoreBonus}%", { physIgnoreBonus: preview.physIgnoreBonus })}</div>`;
        if (preview.redirectPct > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("피해 대리: 히트 피해 {redirectPct}%", { redirectPct: preview.redirectPct })}</div>`;
      }
    }
    return html;
  }
  function appendFireOvercapScaling(runtime, html, context) {
    const { skill } = context;
    if ((skill.fireResOvercapMulPerPct || 0) > 0) {
      const { rawFireRes, maxFireRes, overcapCap, appliedOvercap, effectiveOvercap } = fireOvercapValues(runtime, skill);
      let capText = Number.isFinite(overcapCap) ? (0, runtime.deps._t)(" (최대 {overcapCap}%까지 적용)", { overcapCap: overcapCap.toFixed(0) }) : "";
      let currentText = rawFireRes !== null && maxFireRes !== null ? (0, runtime.deps._t)(", 현재 초과 {appliedOvercap}% 중 적용 {effectiveOvercap}% (미적용 화염 저항 {floor}% / 최대 {floor2}%)", { appliedOvercap: appliedOvercap.toFixed(1), effectiveOvercap: effectiveOvercap.toFixed(1), floor: Math.floor(rawFireRes), floor2: Math.floor(maxFireRes) }) : ", 현재 최대 화염 저항을 초과한 미적용 화염 저항 기준";
      html += `<div class="tooltip-line">${(0, runtime.deps._t)("초과 화염 저항 계수: 최대 화염 저항 초과 1%당 배율 +{fireResOvercapMulPerPct}배{capText}{currentText}", { fireResOvercapMulPerPct: Number(skill.fireResOvercapMulPerPct || 0).toFixed(2), capText, currentText })}</div>`;
    }
    return html;
  }
  function appendRuneLifeScaling(runtime, html, context) {
    const { skill } = context;
    if ((skill.hpDmgScale || 0) > 0) {
      let per100 = (skill.hpDmgScale || 0) * 1e4;
      html += `<div class="tooltip-line">${(0, runtime.deps._t)("생명력 계수: 최대 생명력 100당 약 +{per100}% 내장 피해 (주문 내장 피해처럼 피해 증가 적용)", { per100: per100.toFixed(1) })}</div>`;
    }
    if ((skill.regenDmgScale || 0) > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("재생 계수: 재생 1%당 {regenDmgScale}% 추가 배율", { regenDmgScale: skill.regenDmgScale.toFixed(2) })}</div>`;
    if ((skill.fireResDmgScale || 0) > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("화염 저항 계수: 화염 저항 1%당 {value}% 추가 배율", { value: (skill.fireResDmgScale * 100).toFixed(2) })}</div>`;
    return html;
  }
  function appendRuneHitDetails(runtime, html, context) {
    const { skill, name } = context;
    html = appendRuneDotMultiplier(runtime, html, { skill, name });
    if ((skill.multiHit || 1) > 1) html += `<div class="tooltip-line">다단 히트: 1회 시전당 ${Math.floor(skill.multiHit)}회 타격${skill.repeatHitDamagePct ? (0, runtime.deps._t)(", 후속 타격 {repeatHitDamagePct}%", { repeatHitDamagePct: skill.repeatHitDamagePct }) : ""}${skill.randomTargetEachHit ? (0, runtime.deps._t)(" (타격마다 무작위 대상)") : ""}</div>`;
    if (skill.extraProjectileDamagePct) html += `<div class="tooltip-line">${(0, runtime.deps._t)("추가 투사체 타격 배율: 기본 타격의 {extraProjectileDamagePct}%", { extraProjectileDamagePct: Number(skill.extraProjectileDamagePct).toFixed(0) })}</div>`;
    if (skill.ailmentChanceBonus) {
      let bonusText = Object.entries(skill.ailmentChanceBonus).map(([type, value]) => `${(0, runtime.deps.getAilmentDisplayLabel)(type)} +${value}%`).join(" / ");
      html += `<div class="tooltip-line">${(0, runtime.deps._t)("상태이상 확률 보너스: {bonusText}", { bonusText })}</div>`;
    }
    return html;
  }
  function appendRuneAilmentDetails(runtime, html, context) {
    const { skill } = context;
    if (skill.activeAilmentDamageMore) html += `<div class="tooltip-line">${(0, runtime.deps._t)("{type} 상태인 적에게 적중 피해 {pct}% 증폭", { type: (0, runtime.deps.getAilmentDisplayLabel)(skill.activeAilmentDamageMore.type), pct: skill.activeAilmentDamageMore.pct })}</div>`;
    if (skill.consumeAilmentDamageMore) {
      let consumeText = skill.consumeAilmentDamageMore.map((row) => (0, runtime.deps._t)("{type} 소모 시 {pct}%", { type: (0, runtime.deps.getAilmentDisplayLabel)(row.type), pct: row.pct })).join(" / ");
      html += `<div class="tooltip-line">${(0, runtime.deps._t)("상태 소모 증폭: {consumeText} 증폭", { consumeText })}</div>`;
    }
    if (skill.ailmentSpreadOnHit) html += `<div class="tooltip-line">${(0, runtime.deps._t)("전파: {round}% 확률로 다른 적 {targets}기", { round: Math.round(skill.ailmentSpreadOnHit.chance * 100), targets: skill.ailmentSpreadOnHit.targets })}</div>`;
    if (skill.missingLifeDamagePct) html += `<div class="tooltip-line">${(0, runtime.deps._t)("잃은 생명력 비례 피해: 최대 +{missingLifeDamagePct}%", { missingLifeDamagePct: skill.missingLifeDamagePct })}</div>`;
    if (skill.executeThreshold) html += `<div class="tooltip-line">${(0, runtime.deps._t)("처형: 일반 적 생명력 {value}% 미만", { value: (skill.executeThreshold * 100).toFixed(0) })}</div>`;
    if (skill.periodicOnHit) html += `<div class="tooltip-line">${(0, runtime.deps._t)("반복 타격: {interval}초 간격, {hits}회, 적중 피해의 {damagePct}%", { interval: skill.periodicOnHit.interval, hits: skill.periodicOnHit.hits, damagePct: skill.periodicOnHit.damagePct })}</div>`;
    return html;
  }
  function appendRuneTargetDetails(runtime, html, context) {
    const { skill, isSummonAttackTooltip, info } = context;
    if (skill.dotStackCap) html += `<div class="tooltip-line">${(0, runtime.deps._t)("누적: 최대 {dotStackCap}중첩, 중첩당 피해 +{dotStackDamagePct}% / 둔화 +{dotStackSlowPct}%", { dotStackCap: skill.dotStackCap, dotStackDamagePct: skill.dotStackDamagePct, dotStackSlowPct: skill.dotStackSlowPct })}</div>`;
    if (skill.dotTransferOnDeath) html += `<div class="tooltip-line">${(0, runtime.deps._t)("처치 전파: 남은 지속 피해의 {remainingDamagePct}%를 다른 적 {targets}기에게 이전", { remainingDamagePct: skill.dotTransferOnDeath.remainingDamagePct, targets: skill.dotTransferOnDeath.targets })}</div>`;
    if (!isSummonAttackTooltip) html += getGemTargetSummaryHtml(runtime, skill);
    if ((info.tags || []).length > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("태그:")} <span class="gem-card-tags gem-tooltip-tags">${(0, runtime.deps.renderGemTagChips)(info, info.tags.length)}</span></div>`;
    return html;
  }
  function appendRuneCritAndLeech(runtime, html, context) {
    const { skill } = context;
    if (skill.crit) html += `<div class="tooltip-line">${(0, runtime.deps._t)("추가 치명타 +{crit}%", { crit: Number(skill.crit).toFixed(Number.isInteger(skill.crit) ? 0 : 1) })}</div>`;
    if (skill.critScale) html += `<div class="tooltip-line">${(0, runtime.deps._t)("치명타 성장: 룬 레벨당 +{critScale}%", { critScale: skill.critScale })}</div>`;
    if (skill.pierceOverkillCarry) html += `<div class="tooltip-line" style="color:#8fffe0;">${(0, runtime.deps._t)("특수 옵션: 각 원본 타겟의 초과 피해가 다른 적에게 연속 관통")}</div>`;
    if (skill.leech) html += `<div class="tooltip-line">${(0, runtime.deps._t)("추가 흡혈 +{leech}%", { leech: skill.leech })}</div>`;
    if (skill.instantLeech) html += `<div class="tooltip-line" style="color:#ffb3d1;">${(0, runtime.deps._t)("특수 옵션: 이 룬을 사용해서 주는 피해에는 흡혈 즉시 적용")}</div>`;
    return html;
  }
  function appendRuneDamageDetails(runtime, html, context) {
    const { info, name, stats, skill, isSummonAttackTooltip, rawSkillTags } = context;
    html += `<div class="tooltip-line">${keepKoreanUnitParticles((0, runtime.deps._t)(info.desc))}</div><div class="tooltip-line">${(0, runtime.deps.escapeHTML)(runtime.deps.gemSelectionUi.summonEffect(name, stats))}</div>`;
    if (!isSummonAttackTooltip && typeof runtime.deps.describeSkillGridProfile === "function") {
      html += `<div class="tooltip-line" style="margin-top:6px;color:#7fffd4;">${(0, runtime.deps.describeSkillGridProfile)(name, skill)}</div>`;
    }
    if (!isSummonAttackTooltip) {
      html += `<div class="tooltip-line" style="margin-top:6px;color:${(0, runtime.deps.getItemStatToneColor)("pctDmg")};">${(0, runtime.deps._t)("피해 배율 {dmg}", { dmg: (0, runtime.deps.formatPercentMultiplier)(skill.dmg || skill.baseDmg || 1) })}</div>`;
      html += `<div class="tooltip-line" style="color:${(0, runtime.deps.getItemStatToneColor)("aspd")};">${(0, runtime.deps._t)("공속 배율 {spd}", { spd: (0, runtime.deps.formatPercentMultiplier)(skill.spd || skill.baseSpd || 1) })}</div>`;
    }
    if (rawSkillTags.includes("spell")) {
      let spellLv = Math.max(1, info.finalLevel || 1);
      let spellFlat = (0, runtime.deps.getGemSpellBaseDamage)(skill, spellLv);
      html += `<div class="tooltip-line">${(0, runtime.deps._t)("주문 내장 피해 {floor}", { floor: Math.floor(spellFlat) })}</div>`;
    }
    return html;
  }
  function appendRuneProgression(runtime, html, context) {
    const { type, name, info, stats } = context;
    if (type === "support" || runtime.deps.SKILL_DB[name].isGem || runtime.deps.SKILL_DB[name].levelable) {
      let gemBonusSources = info.gemBonusSources || stats.gemBonusSources;
      html += `<div class="tooltip-line" style="margin-top:8px; color:#2ecc71;">${(0, runtime.deps._t)("총 레벨 {value}", { value: type === "support" ? info.totalLevel : info.finalLevel })}</div>`;
      const sources = [
        ["패시브", gemBonusSources.passive],
        ["장비", gemBonusSources.gear],
        ["보상", gemBonusSources.reward],
        ["룬 강화", runtime.deps.gemCoreForge.effects(info).levels],
        ["응축 창공", info.permanentSkyBonus],
        ["각성", info.awakened ? 2 : 0],
        ["창공 각인", info.engraveLevel]
      ];
      const levels = sources.filter(([, value]) => value > 0).map(([label, value]) => `${label} +${value}`);
      levels.unshift((0, runtime.deps._t)("룬 Lv.{value}", { value: type === "support" ? info.baseLevel : Math.min(20, info.baseLevel) }));
      html += `<div class="tooltip-line">${levels.join(", ")}</div>` + getGemAwakenedPerkLine(runtime, name, type, info);
    }
    html = appendRuneEnhancement(runtime, html, { type, name, info });
    return html;
  }
  function gemTooltipCovered(runtime, target) {
    return !target && runtime.deps.document.getElementById("gem-selection")?.matches(":popover-open");
  }
  function reuseGemTooltipCache(runtime, event, target, request) {
    const entry = runtime.state.gemTooltipCache;
    if (!entry || entry.key !== request.key || entry.stats !== request.stats) return false;
    presentGemTooltip(runtime, event, target, entry);
    return true;
  }
  function presentGemTooltip(runtime, event, target, entry) {
    if (target) target.innerHTML = entry.html;
    else runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, entry.html, entry.border, entry.key);
  }
  function appendActiveRuneDetails(runtime, html, context) {
    const { info, name, stats } = context;
    let skill = info.skill || runtime.deps.SKILL_DB[name];
    let rawSkillTags = Array.isArray(skill.tags) ? skill.tags : [];
    let isSummonAttackTooltip = rawSkillTags.includes("summon");
    html = appendRuneDamageDetails(runtime, html, { info, name, stats, skill, isSummonAttackTooltip, rawSkillTags });
    html = appendRuneLifeScaling(runtime, html, { skill });
    html = appendFireOvercapScaling(runtime, html, { skill });
    html = appendRuneHitDetails(runtime, html, { skill, name });
    html = appendRuneAilmentDetails(runtime, html, { skill });
    html = appendRuneTargetDetails(runtime, html, { skill, isSummonAttackTooltip, info });
    html = appendRuneCritAndLeech(runtime, html, { skill });
    html = appendAttackSummonPreview(runtime, html, { rawSkillTags, name, stats });
    return html;
  }
  function appendRuneDotMultiplier(runtime, html, context) {
    const { skill, name } = context;
    if (name === "화염 부패") html += `<div class="tooltip-line">${(0, runtime.deps._t)("특수 규칙: 공격력(기본 피해) 미적용, 적에게 화염 부패 디버프 적용, 화염 부패 대상은 점화 피해가 생명력 100당 8% 증폭(최대 {max}x)", { max: (Math.max(1, Number(skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1) })}</div>`;
    if ((skill.dotMultiplier || 1) !== 1) html += `<div class="tooltip-line">${(0, runtime.deps._t)("지속 피해 배율 {dotMultiplier}x", { dotMultiplier: (skill.dotMultiplier || 1).toFixed(2) })}</div>`;
    return html;
  }
  function appendRuneEnhancement(runtime, html, context) {
    const { type, name, info } = context;
    if (info.enhanceLevel > 0) html += `<div class="tooltip-line gem-sky-tone">${(0, runtime.deps._t)("룬 강화 +{enhanceLevel}: {effectText}", { enhanceLevel: info.enhanceLevel, effectText: runtime.deps.gemCoreForge.effectText(info.enhanceLevel) })}</div>`;
    if (type !== "support" && runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)("여분 {spareCount}개", { spareCount: runtime.deps.gemDropRewards.spareCount(runtime.deps.game, name) })}</div>`;
    return html;
  }
  function fireOvercapValues(runtime, skill) {
    let stats = runtime.deps.cachedTooltipStats || null;
    let rawFireRes = stats && Number.isFinite(stats.rawResF) ? stats.rawResF : null;
    let maxFireRes = stats && Number.isFinite(stats.maxResF) ? stats.maxResF : null;
    let overcapCap = Number.isFinite(Number(skill.fireResOvercapCap)) ? Math.max(0, Number(skill.fireResOvercapCap)) : Infinity;
    let appliedOvercap = rawFireRes !== null && maxFireRes !== null ? Math.max(0, rawFireRes - maxFireRes) : null;
    let effectiveOvercap = appliedOvercap !== null ? Math.min(appliedOvercap, overcapCap) : null;
    return { rawFireRes, maxFireRes, overcapCap, appliedOvercap, effectiveOvercap };
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

  // modules/ui/tooltip-lifetime.mjs
  function syncTooltipOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) {
      runtime.owner = runtime.deps.game;
      clearTooltipWork(runtime);
    }
    return true;
  }
  function clearTooltipWork(runtime) {
    closeEveryTooltip(runtime);
    const state = runtime.state;
    if (state.itemTooltipHideTimer !== null) runtime.deps.clearTimeout(state.itemTooltipHideTimer);
    if (state.tooltipPositionFrame !== null) runtime.deps.cancelAnimationFrame(state.tooltipPositionFrame);
    if (state.tooltipAnchorCheck) runtime.deps.cancelAnimationFrame(state.tooltipAnchorCheck);
    if (state.tooltipAnchorWatch) state.tooltipAnchorWatch.disconnect();
    state.itemTooltipHideTimer = null;
    state.tooltipPositionFrame = null;
    state.tooltipAnchorCheck = 0;
    state.tooltipAnchorWatch = null;
    state.activeTooltipId = null;
    state.gemTooltipCache = null;
    state.tooltipSizeCache = /* @__PURE__ */ new WeakMap();
    state.pendingTooltipPositions.clear();
    state.tooltipAnchors.clear();
  }
  function disposeTooltipView(runtime) {
    if (!runtime.active) return;
    runtime.active = false;
    clearTooltipWork(runtime);
    releaseViewEvents(runtime);
  }
  function moveTooltipPointer(runtime, event) {
    if (!syncTooltipOwner(runtime)) return;
    const active = runtime.deps.document.getElementById(runtime.state.activeTooltipId);
    if (active && active.style.display !== "none") runtime.handlers.positionTooltipElement(active, event.clientX, event.clientY);
    const info = runtime.deps.document.getElementById("info-tooltip");
    if (!info || info.style.display === "none") return;
    const target = event.target;
    const anchor = target && typeof target.closest === "function" ? target.closest(
      '[data-info-tooltip-anchor="1"], [data-tip], .tip, .skill-gem, .support-gem, .item-card, .currency-card, #info-tooltip'
    ) : null;
    if (!anchor) runtime.handlers.hideInfoTooltip();
    else runtime.handlers.positionTooltipElement(info, event.clientX, event.clientY);
  }
  function installTooltipEvents(runtime) {
    const { document: document2, window: window2 } = runtime.deps;
    const close = () => {
      if (syncTooltipOwner(runtime)) closeEveryTooltip(runtime);
    };
    listenView(runtime, document2.documentElement, "mouseleave", close);
    listenView(runtime, window2, "blur", close);
    listenView(runtime, document2, "visibilitychange", () => {
      if (document2.hidden) close();
    });
    listenView(runtime, document2, "mousemove", (event) => moveTooltipPointer(runtime, event));
    listenView(runtime, window2, "resize", () => {
      runtime.state.tooltipSizeCache = /* @__PURE__ */ new WeakMap();
    });
  }

  // modules/ui/tooltip-view.mjs
  function createTooltipView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, owner: deps.game, active: true, listeners: [] };
    const handlers = { flushTooltipPositions, checkTooltipAnchors, queueTooltipAnchorCheck, cancelTooltipComparison, scheduleTooltipComparison, setTooltipComparisonPointer, applyTooltipPosition, positionTooltipElement, invalidateTooltipSize, reuseInfoTooltip, setActiveTooltip, clearActiveTooltip, hideInfoTooltip, showSporeCraftTooltip, showStatTooltip, showPlayerEhpTooltip, showMapProgressTooltip, showPlayerExperienceTooltip, showPlayerBuffTooltip, showEnemyAilmentTooltip, showGemTooltip, getItemSlotDisplayLabel, getItemStatRollRange, getItemStatRollRangeHtml, getUniqueEffectApplicationHint, getPlayerStatComparisonLines, getItemAffixTierHtml, showCombatLogItemTooltip, openCombatLogItemEquipment, hideCombatLogItemTooltip, dismissItemTooltipNow, validateItemTooltipAnchor, hideItemTooltip, closeEveryTooltip };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.showInfoTooltipHtml = createShowInfoTooltipHtml(runtime);
    runtime.handlers.showPlayerAilmentTooltip = createShowPlayerAilmentTooltip(runtime);
    runtime.handlers.showPlayerRuntimeEffectTooltip = createShowPlayerRuntimeEffectTooltip(runtime);
    runtime.handlers.showPlayerNamedEffectTooltip = createShowPlayerNamedEffectTooltip(runtime);
    runtime.handlers.showPlayerCosmosDebuffTooltip = createShowPlayerCosmosDebuffTooltip(runtime);
    runtime.handlers.prepareItemTooltip = createPrepareItemTooltip(runtime);
    runtime.handlers.prepareItemTooltipContext = createPrepareItemTooltipContext(runtime);
    runtime.handlers.presentItemTooltip = createPresentItemTooltip(runtime);
    runtime.handlers.showItemTooltip = createShowItemTooltip(runtime);
    runtime.api = { applyTooltipPosition: runtime.handlers.applyTooltipPosition, positionTooltipElement: runtime.handlers.positionTooltipElement, invalidateTooltipSize: runtime.handlers.invalidateTooltipSize, reuseInfoTooltip: runtime.handlers.reuseInfoTooltip, setActiveTooltip: runtime.handlers.setActiveTooltip, clearActiveTooltip: runtime.handlers.clearActiveTooltip, showInfoTooltipHtml: runtime.handlers.showInfoTooltipHtml, hideInfoTooltip: runtime.handlers.hideInfoTooltip, showSporeCraftTooltip: runtime.handlers.showSporeCraftTooltip, showStatTooltip: runtime.handlers.showStatTooltip, showPlayerAilmentTooltip: runtime.handlers.showPlayerAilmentTooltip, showPlayerEhpTooltip: runtime.handlers.showPlayerEhpTooltip, showMapProgressTooltip: runtime.handlers.showMapProgressTooltip, showPlayerExperienceTooltip: runtime.handlers.showPlayerExperienceTooltip, showPlayerRuntimeEffectTooltip: runtime.handlers.showPlayerRuntimeEffectTooltip, showPlayerNamedEffectTooltip: runtime.handlers.showPlayerNamedEffectTooltip, showPlayerCosmosDebuffTooltip: runtime.handlers.showPlayerCosmosDebuffTooltip, showPlayerBuffTooltip: runtime.handlers.showPlayerBuffTooltip, showEnemyAilmentTooltip: runtime.handlers.showEnemyAilmentTooltip, showGemTooltip: runtime.handlers.showGemTooltip, getItemSlotDisplayLabel: runtime.handlers.getItemSlotDisplayLabel, getItemStatRollRange: runtime.handlers.getItemStatRollRange, getItemStatRollRangeHtml: runtime.handlers.getItemStatRollRangeHtml, getUniqueEffectApplicationHint: runtime.handlers.getUniqueEffectApplicationHint, getPlayerStatComparisonLines: runtime.handlers.getPlayerStatComparisonLines, prepareItemTooltip: runtime.handlers.prepareItemTooltip, presentItemTooltip: runtime.handlers.presentItemTooltip, getItemAffixTierHtml: runtime.handlers.getItemAffixTierHtml, showItemTooltip: runtime.handlers.showItemTooltip, showCombatLogItemTooltip: runtime.handlers.showCombatLogItemTooltip, openCombatLogItemEquipment: runtime.handlers.openCombatLogItemEquipment, hideCombatLogItemTooltip: runtime.handlers.hideCombatLogItemTooltip, dismissItemTooltipNow: runtime.handlers.dismissItemTooltipNow, validateItemTooltipAnchor: runtime.handlers.validateItemTooltipAnchor, hideItemTooltip: runtime.handlers.hideItemTooltip };
    for (const [name, handler] of Object.entries(runtime.api)) runtime.api[name] = guardTooltipCall(runtime, handler);
    runtime.api.comparison = Object.freeze({
      cancel: runtime.handlers.cancelTooltipComparison,
      schedule: guardTooltipCall(runtime, runtime.handlers.scheduleTooltipComparison),
      setPointer: guardTooltipCall(runtime, runtime.handlers.setTooltipComparisonPointer)
    });
    runtime.api.infoToken = () => syncTooltipOwner(runtime) ? runtime.state.activeInfoTooltipToken : null;
    runtime.api.clearGemCache = () => {
      runtime.state.gemTooltipCache = null;
    };
    runtime.api.dispose = () => disposeTooltipView(runtime);
    installTooltipEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.tooltipAnchors = /* @__PURE__ */ new Map();
    runtime.state.tooltipAnchorWatch = null;
    runtime.state.tooltipAnchorCheck = 0;
    runtime.state.TOOLTIP_CLOSERS = Object.freeze({ "info-tooltip": () => hideInfoTooltip(runtime), "item-tooltip-box": () => dismissItemTooltipNow(runtime) });
    runtime.state.gemTooltipCache = null;
    runtime.state.activeInfoTooltipToken = null;
    runtime.state.tooltipPositionFrame = null;
    runtime.state.pendingTooltipPositions = /* @__PURE__ */ new Map();
    runtime.state.tooltipSizeCache = /* @__PURE__ */ new WeakMap();
    runtime.state.UI_ENEMY_AILMENT_DETAIL_FORMATTERS = Object.freeze({
      chill: () => "이동/공격 속도 감소 (최대 생명력 대비 타격 비율 반영)",
      freeze: () => "행동 불가 (최대 생명력 대비 타격 비율 반영)",
      hunterExpose: () => (0, runtime.deps._t)("헌터 전직 키스톤 효과로 받는 모든 피해가 {takenMorePct}% 증가합니다.", { takenMorePct: runtime.deps.ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct }),
      assassinWeakness: (state) => (0, runtime.deps._t)("{floor}중첩, 중첩당 받는 피해 {takenPctPerStack}% 증가", { floor: Math.floor(state.power), takenPctPerStack: runtime.deps.ASCENDANCY_KEYSTONE_VALUES.a3.takenPctPerStack }),
      cosmosJudgment: (state) => (0, runtime.deps._t)("모든 저항 {power}% 감소", { power: state.power.toFixed(0) }),
      realmAllResDown: (state) => (0, runtime.deps._t)("모든 저항 약화 {stacks}중첩", { stacks: state.stacks })
    });
    runtime.state.itemTooltipHideTimer = null;
    runtime.state.activeTooltipId = null;
    runtime.state.activeItemTooltipToken = null;
    runtime.state.tooltipComparisonJob = null;
    runtime.state.tooltipComparisonPointer = { x: 0, y: 0 };
    runtime.state.itemTooltipComparisonScheduler = Object.freeze({ cancel: runtime.handlers.cancelTooltipComparison, schedule: runtime.handlers.scheduleTooltipComparison, setPointer: runtime.handlers.setTooltipComparisonPointer });
  }
  function guardTooltipCall(runtime, handler) {
    return (...args) => {
      if (syncTooltipOwner(runtime)) return handler(...args);
    };
  }

  // modules/tooltips-ui-classic.mjs
  var tooltipView = createTooltipView({
    get uiDisplay() {
      return uiDisplay;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get window() {
      return window;
    },
    get clampNumber() {
      return clampNumber;
    },
    get tutorialActionUi() {
      return tutorialActionUi;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get document() {
      return document;
    },
    get MutationObserver() {
      return typeof MutationObserver === "undefined" ? void 0 : MutationObserver;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get _t() {
      return _t;
    },
    get getUiPlayerStats() {
      return getUiPlayerStats;
    },
    get cachedTooltipStats() {
      return window.GameModules.uiRuntime.stats.snapshot();
    },
    set cachedTooltipStats(value) {
      window.GameModules.uiRuntime.stats.store(value);
    },
    get getUiCombatEffectPresentation() {
      return getUiCombatEffectPresentation;
    },
    get isUiDamageAilmentType() {
      return isUiDamageAilmentType;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getUiPlayerDamageAilmentDps() {
      return getUiPlayerDamageAilmentDps;
    },
    get getUiPlayerShockTakenDamageIncreasePct() {
      return getUiPlayerShockTakenDamageIncreasePct;
    },
    get formatUiTakenDamageShockLine() {
      return formatUiTakenDamageShockLine;
    },
    get getUiExperienceProgress() {
      return getUiExperienceProgress;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get formatSettingNumber() {
      return formatSettingNumber;
    },
    get getUiRuntimeEffectDetail() {
      return getUiRuntimeEffectDetail;
    },
    get talismanCombat() {
      return talismanCombat;
    },
    get getConditionEffectTitle() {
      return getConditionEffectTitle;
    },
    get talismans() {
      return talismans;
    },
    get getUiEnemyDamageAilmentDps() {
      return getUiEnemyDamageAilmentDps;
    },
    get getUiEnemyShockTakenDamageIncreasePct() {
      return getUiEnemyShockTakenDamageIncreasePct;
    },
    get GEM_AWAKENED_PERKS() {
      return GEM_AWAKENED_PERKS;
    },
    get getRuneLevelReq() {
      return getRuneLevelReq;
    },
    get getRuneLevelNote() {
      return getRuneLevelNote;
    },
    get i18n() {
      return i18n;
    },
    get getUiGemPresentation() {
      return getUiGemPresentation;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get gemCoreForge() {
      return gemCoreForge;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get statToneText() {
      return statToneText;
    },
    get getSupportTierLabel() {
      return typeof getSupportTierLabel === "undefined" ? void 0 : getSupportTierLabel;
    },
    get formatSupportGemEffectValue() {
      return typeof formatSupportGemEffectValue === "undefined" ? void 0 : formatSupportGemEffectValue;
    },
    get gemSelectionUi() {
      return gemSelectionUi;
    },
    get gemSlotDialog() {
      return gemSlotDialog;
    },
    get TAGGED_DAMAGE_STAT_BY_TAG() {
      return TAGGED_DAMAGE_STAT_BY_TAG;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get renderGemTagChips() {
      return renderGemTagChips;
    },
    get getSummonTooltipPreview() {
      return typeof getSummonTooltipPreview === "undefined" ? void 0 : getSummonTooltipPreview;
    },
    get describeSkillGridProfile() {
      return typeof describeSkillGridProfile === "undefined" ? void 0 : describeSkillGridProfile;
    },
    get getAilmentDisplayLabel() {
      return getAilmentDisplayLabel;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get formatPercentMultiplier() {
      return formatPercentMultiplier;
    },
    get getGemSpellBaseDamage() {
      return getGemSpellBaseDamage;
    },
    get ATLAS() {
      return ATLAS;
    },
    get REGION_AFFIX_TONES() {
      return REGION_AFFIX_TONES;
    },
    get weaponCategorySlotLabel() {
      return weaponCategorySlotLabel;
    },
    get formatValue() {
      return formatValue;
    },
    get COMPARE_STAT_META() {
      return COMPARE_STAT_META;
    },
    get bagItemsUi() {
      return bagItemsUi;
    },
    get equipmentInventoryInteraction() {
      return typeof equipmentInventoryInteraction === "undefined" ? void 0 : equipmentInventoryInteraction;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get itemInfluencesUi() {
      return itemInfluencesUi;
    },
    get isFixedEquipmentAffix() {
      return isFixedEquipmentAffix;
    },
    get getTierBadgeHtml() {
      return getTierBadgeHtml;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get EXPLICIT_AFFIX_RULES() {
      return EXPLICIT_AFFIX_RULES;
    },
    get getItemBaseChainInfo() {
      return typeof getItemBaseChainInfo === "undefined" ? void 0 : getItemBaseChainInfo;
    },
    get getBaseStepClassName() {
      return getBaseStepClassName;
    },
    get equipmentInspectionUi() {
      return equipmentInspectionUi;
    },
    get getExceptionalBaseStarsHtml() {
      return typeof getExceptionalBaseStarsHtml === "undefined" ? void 0 : getExceptionalBaseStarsHtml;
    },
    get getRarityColor() {
      return getRarityColor;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get craftingWorkspaceUi() {
      return craftingWorkspaceUi;
    },
    get levelProgression() {
      return levelProgression;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get levelProgressionUi() {
      return levelProgressionUi;
    },
    get equipmentSocketsUi() {
      return equipmentSocketsUi;
    },
    get itemTooltipRules() {
      return itemTooltipRules;
    },
    get getStatName() {
      return getStatName;
    },
    get sapCatalystsUi() {
      return sapCatalystsUi;
    },
    get gardenOilsUi() {
      return gardenOilsUi;
    },
    get emberCorruptionUi() {
      return emberCorruptionUi;
    },
    get weaponMasteryUi() {
      return weaponMasteryUi;
    },
    get colonyWardsUi() {
      return colonyWardsUi;
    },
    get formatSignedValue() {
      return formatSignedValue;
    },
    get switchTab() {
      return switchTab;
    },
    get openWindow() {
      return typeof openWindow === "undefined" ? void 0 : openWindow;
    },
    get switchItemSubtab() {
      return switchItemSubtab;
    },
    get cancelIdleCallback() {
      return typeof cancelIdleCallback === "undefined" ? void 0 : windowCancelIdleCallback;
    },
    get getEquipCandidateSlots() {
      return getEquipCandidateSlots;
    },
    get getDualSlotDisplayLabel() {
      return getDualSlotDisplayLabel;
    },
    get isDualSlotItem() {
      return isDualSlotItem;
    },
    get console() {
      return console;
    },
    get requestIdleCallback() {
      return typeof requestIdleCallback === "undefined" ? void 0 : windowRequestIdleCallback;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get ASCENDANCY_KEYSTONE_VALUES() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get previewBuildStats() {
      return previewBuildStats;
    }
  });
  window.GameModules.tooltipView = tooltipView;
  safeExposeGlobals({
    applyTooltipPosition: tooltipView.applyTooltipPosition,
    positionTooltipElement: tooltipView.positionTooltipElement,
    invalidateTooltipSize: tooltipView.invalidateTooltipSize,
    reuseInfoTooltip: tooltipView.reuseInfoTooltip,
    setActiveTooltip: tooltipView.setActiveTooltip,
    clearActiveTooltip: tooltipView.clearActiveTooltip,
    showInfoTooltipHtml: tooltipView.showInfoTooltipHtml,
    hideInfoTooltip: tooltipView.hideInfoTooltip,
    showSporeCraftTooltip: tooltipView.showSporeCraftTooltip,
    showStatTooltip: tooltipView.showStatTooltip,
    showPlayerAilmentTooltip: tooltipView.showPlayerAilmentTooltip,
    showPlayerEhpTooltip: tooltipView.showPlayerEhpTooltip,
    showMapProgressTooltip: tooltipView.showMapProgressTooltip,
    showPlayerExperienceTooltip: tooltipView.showPlayerExperienceTooltip,
    showPlayerRuntimeEffectTooltip: tooltipView.showPlayerRuntimeEffectTooltip,
    showPlayerNamedEffectTooltip: tooltipView.showPlayerNamedEffectTooltip,
    showPlayerCosmosDebuffTooltip: tooltipView.showPlayerCosmosDebuffTooltip,
    showPlayerBuffTooltip: tooltipView.showPlayerBuffTooltip,
    showEnemyAilmentTooltip: tooltipView.showEnemyAilmentTooltip,
    showGemTooltip: tooltipView.showGemTooltip,
    getItemSlotDisplayLabel: tooltipView.getItemSlotDisplayLabel,
    getItemStatRollRange: tooltipView.getItemStatRollRange,
    getItemStatRollRangeHtml: tooltipView.getItemStatRollRangeHtml,
    getUniqueEffectApplicationHint: tooltipView.getUniqueEffectApplicationHint,
    getPlayerStatComparisonLines: tooltipView.getPlayerStatComparisonLines,
    prepareItemTooltip: tooltipView.prepareItemTooltip,
    presentItemTooltip: tooltipView.presentItemTooltip,
    getItemAffixTierHtml: tooltipView.getItemAffixTierHtml,
    showItemTooltip: tooltipView.showItemTooltip,
    showCombatLogItemTooltip: tooltipView.showCombatLogItemTooltip,
    openCombatLogItemEquipment: tooltipView.openCombatLogItemEquipment,
    hideCombatLogItemTooltip: tooltipView.hideCombatLogItemTooltip,
    dismissItemTooltipNow: tooltipView.dismissItemTooltipNow,
    validateItemTooltipAnchor: tooltipView.validateItemTooltipAnchor,
    hideItemTooltip: tooltipView.hideItemTooltip
  });
})();
