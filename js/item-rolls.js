// GENERATED from modules/equipment-affixes*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/equipment-labels.mjs
  function getTierBadgeHtml(deps, tierValue, labelPrefix) {
    if (Math.floor(Number(tierValue)) === 0) {
      return `<span class="tier-badge tier-badge-unique" style="color:#ff9f43;">[U]</span>`;
    }
    let tier = (0, deps.getTierDisplayLevel)(tierValue);
    let label = labelPrefix || "T";
    return `<span class="tier-badge ${(0, deps.getTierClassName)(tier)}">[${label}${tier}]</span>`;
  }
  function formatJewelStatValue(deps, statId, value) {
    let option = (0, deps.getJewelOptionDef)(statId);
    if (option && Number.isFinite(option.step) && option.step < 1) return Number(value || 0).toFixed(2);
    if (Math.abs(Number(value) || 0) < 1 && !Number.isInteger(Number(value))) return Number(value || 0).toFixed(2);
    return (0, deps.formatValue)(statId, value);
  }
  function getJewelRarityLabel(deps, rarity) {
    if (rarity === "unique") return "고유";
    if (rarity === "rare") return deps.ITEM_RARITY_LABELS.rare;
    if (rarity === "magic") return deps.ITEM_RARITY_LABELS.magic;
    return "일반";
  }
  function getJewelRarityClass(rarity) {
    if (rarity === "unique") return "unique";
    if (rarity === "rare") return "rare";
    if (rarity === "magic") return "magic";
    return "normal";
  }
  function formatCurrencyCosts(deps, costs) {
    return (costs || []).map((row) => `${(deps.ORB_DB[row.key] || {}).name || row.key} ${row.amount}`).join(" + ");
  }

  // modules/ui/equipment-salvage-text.mjs
  function formatSalvageRewardSummary(deps, rewards) {
    let normalized = (0, deps.mergeSalvageRewards)({}, rewards);
    let entries = Object.entries(normalized).filter(([, amount]) => Number(amount) > 0);
    if (entries.length <= 0) return "회수 재화 없음";
    return entries.map(([key, amount]) => `${(0, deps.getStyledOrbName)(key)} +${Math.floor(amount)}`).join(", ");
  }
  function getItemSalvagePreviewText(deps, item, compact) {
    let profile = (0, deps.getItemSalvageRewardProfile)(item);
    let guaranteed = Object.entries(profile.guaranteed).filter(([, amount]) => amount > 0).map(([key, amount]) => {
      let label = (0, deps.getCurrencyInfo)(key).name;
      return `${label} ${amount}`;
    });
    let chances = profile.chances.filter((row) => row && row.chance > 0).map((row) => compact && item && item.rarity === "unique" ? null : `${(0, deps.getCurrencyInfo)(row.key).name} ${Math.round(row.chance * 100)}%`).filter(Boolean);
    if (compact && item && item.rarity === "unique" && profile.chances.length > 0) chances.push("고급 재화 확률");
    return (0, deps._t)("해체 {concat}", { concat: guaranteed.concat(chances).join(", ") || (0, deps._t)("보상 없음") });
  }

  // modules/ui/equipment-salvage-controls.mjs
  function syncSalvageControlsFromSettings(deps) {
    deps.game.settings.autoSalvageRarities = deps.game.settings.autoSalvageRarities || { normal: true, magic: true, rare: false, unique: false };
    ["normal", "magic", "rare", "unique"].forEach((rarity) => {
      let el = deps.document.getElementById(`chk-salvage-${rarity}`);
      if (el) el.checked = !!deps.game.settings.autoSalvageRarities[rarity];
    });
    let btn = deps.document.getElementById("eqw-rail-salvage");
    if (btn) {
      let enabled = !!deps.game.settings.autoSalvageEnabled;
      btn.dataset.enabled = String(enabled);
      btn.setAttribute("aria-label", (0, deps._t)("해체, 자동해체 {value}", { value: enabled ? (0, deps._t)("켜짐") : (0, deps._t)("꺼짐") }));
    }
  }
  function toggleAutoSalvage(deps) {
    let f = deps.game.settings.autoSalvageRarities || {};
    if (!deps.game.settings.autoSalvageEnabled) {
      let active = ["normal", "magic", "rare", "unique"].filter((r) => f[r]);
      if (active.length === 0) return (0, deps.addLog)((0, deps._t)("자동해체할 등급을 먼저 선택하세요."), "attack-monster");
    }
    deps.game.settings.autoSalvageEnabled = !deps.game.settings.autoSalvageEnabled;
    syncSalvageControlsFromSettings(deps);
    (0, deps.queueImportantSave)(200);
    (0, deps.addLog)(`⚙️ ${(0, deps._t)("자동해체")} ${(0, deps._t)(deps.game.settings.autoSalvageEnabled ? "활성화" : "비활성화")}`, "loot-normal");
  }
  function getActiveRarityFilterSet(deps) {
    let f = typeof deps.getInventoryRarityFilter === "function" ? (0, deps.getInventoryRarityFilter)() : deps.game.settings && deps.game.settings.inventoryViewRarities || { normal: true, magic: true, rare: true, unique: true };
    return ["normal", "magic", "rare", "unique"].filter((rarity) => !!f[rarity]);
  }
  function getShownSlotFilter(deps) {
    let slot = String(deps.game.settings && deps.game.settings.equipmentSlotFilter || "all");
    return slot !== "all" && (deps.game.inventory || []).some((item) => item && item.slot === slot) ? slot : "all";
  }

  // modules/ui/equipment-salvage-actions.mjs
  async function salvageJewel(deps, jewelId) {
    let jewel = deps.bagItems.jewels().find((row) => row.id === jewelId);
    if (!jewel) return false;
    if (jewel.rarity === "unique" && !await (0, deps.requestGameConfirmation)(`[${jewel.name || (0, deps._t)("고유 주얼")}]${(0, deps.pickParticle)(jewel.name || "고유 주얼", "을", "를")} 해체합니다.
주얼 결정 ${(0, deps.getJewelSalvageShardGain)(jewel)}개를 획득하며 되돌릴 수 없습니다.`, {
      title: (0, deps._t)("고유 주얼 해체"),
      tone: "danger",
      confirmLabel: (0, deps._t)("해체")
    })) return false;
    if (!deps.bagItems.take(jewel)) return false;
    (0, deps.salvageJewelObject)(jewel, false);
    (0, deps.dispatchRuntimeEvent)("items-salvaged", { count: 1 });
    (0, deps.updateStaticUI)();
    return true;
  }
  function salvageItem(deps, idx) {
    let item = deps.game.inventory[idx];
    if (!item) return;
    if (item.locked) return (0, deps.addLog)((0, deps._t)("🔒 잠금된 아이템은 해체할 수 없습니다. [{name}]", { name: (0, deps._t)(item.name) }), "attack-monster");
    if (typeof deps.equipmentLoadoutRuntime !== "undefined" && deps.equipmentLoadoutRuntime.isReferenced(item)) {
      return (0, deps.addLog)((0, deps._t)("🧰 장비 세팅에 저장된 아이템은 해체할 수 없습니다. [{name}]", { name: (0, deps._t)(item.name) }), "attack-monster");
    }
    if (!(0, deps.isCraftSelectionEquip)() && (0, deps.getCraftSelectionRef)() === item.id) (0, deps.clearCraftSelection)();
    (0, deps.salvageItemObject)(item, false);
    deps.game.inventory.splice(idx, 1);
    (0, deps.dispatchRuntimeEvent)("items-salvaged", { count: 1 });
    (0, deps.updateStaticUI)();
  }
  async function bulkSalvageSelected(deps) {
    let selectedRarities = getActiveRarityFilterSet(deps);
    if (selectedRarities.length === 0) return (0, deps.addLog)((0, deps._t)("해체할 등급을 먼저 선택하세요. (등급 필터에서 선택)"), "attack-monster");
    let rarityLabels = deps.ITEM_RARITY_LABELS;
    let shownSlot = getShownSlotFilter(deps);
    let isShown = (item) => selectedRarities.includes(item.rarity) && (shownSlot === "all" || item.slot === shownSlot);
    let targetItems = (deps.game.inventory || []).filter((item) => item && !(0, deps.isBulkSalvageProtectedItem)(item) && isShown(item));
    let targetCount = targetItems.length;
    if (targetCount <= 0) return (0, deps.addLog)((0, deps._t)("선택한 등급의 해체 가능한 장비가 없습니다."), "attack-monster");
    let labelText = selectedRarities.map((r) => rarityLabels[r] || r).join("/");
    const note = deps.bagItems.countNote(targetItems);
    if (!await (0, deps.requestGameConfirmation)(`[${labelText}] 등급 ${shownSlot === "all" ? (0, deps._t)("장비") : shownSlot} ${targetCount}개를 해체합니다.${note ? `
${note} 포함` : ""}
잠금, 세팅, 우선 보관 장비는 빼고 해체합니다.`, {
      title: (0, deps._t)("등급 일괄 해체"),
      tone: "danger",
      confirmLabel: (0, deps._t)("{targetCount}개 해체", { targetCount })
    })) return;
    const targets = (0, deps.confirmedSalvageTargets)(targetItems);
    const lockedSkipped = deps.game.inventory.filter((item) => isShown(item) && (0, deps.isBulkSalvageProtectedItem)(item)).length;
    if (targets.length === 0) {
      if (lockedSkipped > 0) return (0, deps.addLog)((0, deps._t)("🔒 고른 장비가 모두 보호 중입니다(잠금, 세팅, 우선 보관 {lockedSkipped}개).", { lockedSkipped }), "attack-monster");
      return (0, deps.addLog)((0, deps._t)("선택한 등급의 장비가 없습니다."), "attack-monster");
    }
    const rewards = (0, deps.salvageBagItems)(targets);
    (0, deps.ensureCraftSelectionValid)();
    (0, deps.addLog)((0, deps._t)("🧪 선택한 등급 장비 {count}개 해체, {rewards}{kept}", { count: targets.length, rewards: formatSalvageRewardSummary(deps, rewards), kept: lockedSkipped > 0 ? ` ${(0, deps._t)("(잠금, 세팅, 우선 보관 {n}개는 남김)", { n: lockedSkipped })}` : "" }), "loot-normal");
    (0, deps.updateStaticUI)();
  }
  async function bulkSalvageAllInventory(deps) {
    if (!Array.isArray(deps.game.inventory) || deps.game.inventory.length <= 0) return (0, deps.addLog)((0, deps._t)("해체할 장비가 없습니다."), "attack-monster");
    let lockedCount = deps.game.inventory.filter((item) => (0, deps.isBulkSalvageProtectedItem)(item)).length;
    let targetItems = deps.game.inventory.filter((item) => !(0, deps.isBulkSalvageProtectedItem)(item));
    if (targetItems.length <= 0) return (0, deps.addLog)((0, deps._t)("🔒 잠금, 세팅, 우선 보관 장비뿐이라 전체 해체할 장비가 없습니다."), "attack-monster");
    if (!await confirmBulkSalvageAll(deps, targetItems, lockedCount)) return;
    const targets = (0, deps.confirmedSalvageTargets)(targetItems), rewards = (0, deps.salvageBagItems)(targets);
    if (!(0, deps.isCraftSelectionEquip)()) (0, deps.clearCraftSelection)();
    (0, deps.addLog)((0, deps._t)("🧪 인벤토리 전체해체 완료 ({count}개), {rewards}{kept}", { count: targets.length, rewards: formatSalvageRewardSummary(deps, rewards), kept: lockedCount > 0 ? `, ${(0, deps._t)("잠금, 세팅, 우선 보관 {n}개는 남김", { n: lockedCount })}` : "" }), "loot-normal");
    (0, deps.updateStaticUI)();
  }
  function confirmBulkSalvageAll(deps, targetItems, lockedCount) {
    const count = targetItems.length;
    return (0, deps.requestGameConfirmation)(`인벤토리 장비 ${count}개를 모두 해체합니다.${lockedCount > 0 ? `
잠금, 세팅, 우선 보관 장비 ${lockedCount}개는 빼고 해체합니다.` : ""}`, {
      title: (0, deps._t)("인벤토리 전체 해체"),
      tone: "danger",
      confirmLabel: (0, deps._t)("{count}개 해체", { count }),
      summaryHtml: deps.equipmentWindowUi.salvageSummaryHtml(targetItems)
    });
  }

  // modules/ui/equipment-workshop-view.mjs
  function showEncroachmentLiberationOverlay(deps, item, options) {
    let overlay = deps.document.getElementById("encroachment-liberation-overlay");
    if (!overlay) {
      deps.document.body.insertAdjacentHTML("beforeend", '<div id="encroachment-liberation-overlay" style="position:fixed;inset:0;background:rgba(6,4,14,.82);z-index:10000;display:flex;align-items:center;justify-content:center;padding:14px;"></div>');
      overlay = deps.document.getElementById("encroachment-liberation-overlay");
    }
    let rows = options.map((stat, idx) => {
      let label = `${(0, deps._t)(stat.statName || (0, deps.getStatName)(stat.id))} +${(0, deps.formatValue)(stat.id, stat.val)}`;
      return `<button id="encroach-opt-${idx}" onclick="confirmEncroachmentLiberation(${idx})" disabled style="opacity:0;transform:translateY(12px);transition:opacity .55s ease,transform .55s ease;pointer-events:none;display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 14px;border:1px solid #5a3f8f;border-radius:10px;background:linear-gradient(90deg,rgba(40,24,64,.92),rgba(24,16,40,.92));color:#e7d8ff;font-size:15px;cursor:pointer;"><span>${label}</span><span style="color:#b79bff;font-size:12px;">[T${stat.tier || 10}]</span></button>`;
    }).join("");
    overlay.innerHTML = `<div style="width:min(520px,calc(95vw / var(--scale-display-factor, 1)));background:#120c1e;border:1px solid #6a47b3;border-radius:14px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.6);"><div style="color:#caa6ff;font-size:19px;font-weight:700;margin-bottom:4px;">${(0, deps._t)("잠식 해방")}</div><div style="color:#b9a7d8;font-size:13px;margin-bottom:14px;line-height:1.5;">${(0, deps._t)("[{name}], 최고 티어 옵션 셋 중", { name: item.name })} <strong style="color:#e7d8ff;">${(0, deps._t)("반드시 하나")}</strong>${(0, deps._t)("를 선택해야 합니다.")}</div><div style="display:grid;gap:10px;">${rows}</div><div id="encroach-hint" style="opacity:0;transition:opacity .5s ease;margin-top:12px;color:#9b86c4;font-size:12px;text-align:center;">${(0, deps._t)("옵션이 모두 드러나면 하나를 선택하세요.")}</div></div>`;
    options.forEach((_, idx) => {
      (0, deps.setTimeout)(() => {
        let el = deps.document.getElementById(`encroach-opt-${idx}`);
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "none";
        el.disabled = false;
        el.style.pointerEvents = "auto";
        if (idx === options.length - 1) {
          let hint = deps.document.getElementById("encroach-hint");
          if (hint) hint.style.opacity = "1";
        }
      }, 280 + idx * 620);
    });
  }
  function hideEncroachmentLiberationOverlay(deps) {
    let overlay = deps.document.getElementById("encroachment-liberation-overlay");
    if (overlay) overlay.remove();
  }
  async function useCurrency(deps, currencyKey) {
    const result = deps.craftCurrencyUse.use(currencyKey);
    if (result.reason) return (0, deps.addLog)(result.reason, "attack-monster");
    result.logs.forEach((args) => (0, deps.addLog)(...args));
    if (!result.ok) return void 0;
    (0, deps.updateStaticUI)();
    return true;
  }

  // modules/data/equipment-runtime-tables.mjs
  var DROPPED_AFFIX_TIER_WEIGHT_FALLOFF = 0.2;
  var EQUIPMENT_DROP_SLOTS = ["무기", "투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠", "방패"];
  var uniqueMeetsTier = (unique, tier) => !!unique && tier >= (unique.dropOnly && unique.dropOnly.minTier || unique.reqTier || 1);
  var UNIQUE_JEWEL_DB = [
    { id: "uj_crown_empty", name: "비어 있는 왕좌", ultra: true, uniqueEffect: "다른 고유 주얼이 없으면 피해 +25%, 룬 레벨 +1 추가", stats: [{ id: "pctDmg", val: 25 }, { id: "gemLevel", val: 1 }] },
    { id: "uj_mirror_heart", name: "거울 심장", ultra: true, uniqueEffect: "반지 소켓에 끼우면 반대쪽 반지 소켓의 주얼 복제", stats: [{ id: "pctDmg", val: 8 }, { id: "resAll", val: 8 }] },
    { id: "uj_old_box", name: "오래된 보석함", ultra: true, uniqueEffect: "가방의 마법 아이템 하나마다 공격 속도 +0.5%(최대 30%), 희귀 하나마다 피해 +1.2%(최대 60%), 고유 하나마다 물리 피해 감소 +1.5%(최대 12%)", stats: [{ id: "aspd", val: 6 }, { id: "resAll", val: 10 }] },
    { id: "uj_hurried_mind", name: "다급해지는 마음", ultra: true, uniqueEffect: "적이 없으면 이동속도 +50%", stats: [{ id: "move", val: 12 }, { id: "regen", val: 1.2 }] },
    { id: "uj_condensed_curse", name: "응축된 저주", ultra: true, uniqueEffect: "저주 최대치 +1, 대상 저주당 최종 피해 +10%", stats: [{ id: "dotPctDmg", val: 14 }, { id: "resPen", val: 6 }] },
    { id: "uj_burning_will", name: "불같은 의지", ultra: true, uniqueEffect: "최대치를 넘는 화염 저항 1%마다 기본 피해 +0.5%(최대 35%)", stats: [{ id: "maxResF", val: 2 }, { id: "firePctDmg", val: 12 }] },
    { id: "uj_closed_eyes", name: "질끈 감은 눈", ultra: true, uniqueEffect: "플레이어 상태이상 면역, 부적의 수호, 함성, 저주 줄 비활성", stats: [{ id: "dr", val: 6 }, { id: "resAll", val: 12 }] },
    { id: "uj_spark_ember", name: "불씨의 파편", stats: [{ id: "firePctDmg", val: 14 }, { id: "igniteChance", val: 10 }] },
    { id: "uj_frost_nail", name: "서리 못", stats: [{ id: "coldPctDmg", val: 14 }, { id: "chillChance", val: 10 }] },
    { id: "uj_storm_shard", name: "폭풍 조각", stats: [{ id: "lightPctDmg", val: 14 }, { id: "shockEffectReducePct", val: 12 }] },
    { id: "uj_venom_eye", name: "독안", stats: [{ id: "chaosPctDmg", val: 14 }, { id: "poisonChance", val: 12 }] },
    { id: "uj_blood_tine", name: "혈극", stats: [{ id: "physPctDmg", val: 14 }, { id: "bleedChance", val: 12 }] },
    { id: "uj_iron_husk", name: "강철 껍질", stats: [{ id: "armorPct", val: 16 }, { id: "dr", val: 5 }] },
    { id: "uj_windstep", name: "바람걸음", stats: [{ id: "move", val: 14 }, { id: "aspd", val: 8 }] },
    { id: "uj_null_seed", name: "영점 씨앗", stats: [{ id: "resPen", val: 7 }, { id: "crit", val: 1.2 }] },
    { id: "uj_root_charm", name: "뿌리 부적", stats: [{ id: "flatHp", val: 55 }, { id: "regen", val: 1.5 }] },
    { id: "uj_tide_mark", name: "조류 각인", stats: [{ id: "dotPctDmg", val: 12 }, { id: "dotTakenDamageReducePct", val: 8 }] },
    { id: "uj_ash_loop", name: "잿빛 고리", stats: [{ id: "critDmg", val: 18 }, { id: "crit", val: 1 }] },
    { id: "uj_horizon_pin", name: "지평 핀", stats: [{ id: "projectilePctDmg", val: 16 }, { id: "minDmgRoll", val: 4 }] },
    { id: "uj_stone_beat", name: "석맥 박동", stats: [{ id: "slamPctDmg", val: 16 }, { id: "maxDmgRoll", val: 4 }] },
    { id: "uj_lattice", name: "격자 파편", stats: [{ id: "resAll", val: 10 }, { id: "energyShieldPct", val: 12 }] },
    { id: "uj_bramble", name: "가시덩굴", stats: [{ id: "evasionPct", val: 12 }, { id: "takenDamageReduceWhen2EnemiesPct", val: 6 }] },
    { id: "uj_dawn_chip", name: "새벽 조각", stats: [{ id: "pctDmg", val: 12 }, { id: "takenDamageReduceWhen1EnemyPct", val: 4 }] },
    // 2026-10-02 재능 정리: 얻을 수 없게 된 옛 재능 카드의 효과(bloomMechanic, js/talent-cards.js getGrantedBloomMechanics).
    // 일반 고유 풀에 둔다(울트라 풀이면 고유 주얼 하나당 약 0.4%로 너무 드물다).
    { id: "uj_judgment_mark", name: "심판의 표식", bloomMechanic: "hero1__inquisitor", uniqueEffect: "공격하면 5초 동안 피해를 모으는 표식을 남기고, 5초 뒤 모은 피해의 12%로 터짐(재사용 6초)", stats: [{ id: "pctDmg", val: 8 }, { id: "crit", val: 1 }] },
    { id: "uj_hex_burst", name: "터지는 저주", bloomMechanic: "hero1__warlock", uniqueEffect: "저주에 걸린 적을 공격하면 그 저주를 터뜨려 적 모두에게 0.2배 피해", stats: [{ id: "chaosPctDmg", val: 10 }, { id: "dotPctDmg", val: 10 }] },
    { id: "uj_stinger", name: "독침의 끝", bloomMechanic: "hero1__catalyst", uniqueEffect: "남은 지속 피해가 적의 남은 생명력보다 많으면 그 적을 바로 마무리", stats: [{ id: "dotPctDmg", val: 14 }, { id: "poisonChance", val: 8 }] },
    { id: "uj_crowd_roar", name: "관중의 함성", bloomMechanic: "hero2__gladiator", uniqueEffect: "처치마다 관중의 함성 1중첩, 5중첩이면 다음 공격이 주변 적 다섯에게 120% 피해(적이 하나면 피해 20% 증폭)", stats: [{ id: "meleePctDmg", val: 12 }, { id: "aspd", val: 5 }] },
    { id: "uj_moon_shadow", name: "달그림자", bloomMechanic: "hero3__assassin", uniqueEffect: "치명타 피해의 20%가 모든 피해 감소를 무시하는 고정 피해로 바뀜", stats: [{ id: "critDmg", val: 15 }, { id: "crit", val: 1 }] },
    { id: "uj_forest_ring", name: "숲마당", bloomMechanic: "hero3__gladiator", uniqueEffect: "플레이어와 몬스터의 모든 공격이 반드시 명중함", stats: [{ id: "flatHp", val: 40 }, { id: "aspd", val: 4 }] },
    { id: "uj_defiant_bolt", name: "거역의 번개", bloomMechanic: "hero5__assassin", uniqueEffect: "번개 피해가 카오스 피해로 바뀌고, 카오스 피해를 준 적의 생명력 재생 50% 감소", stats: [{ id: "chaosPctDmg", val: 12 }, { id: "lightPctDmg", val: 8 }] },
    { id: "uj_pilgrim_spark", name: "순례자의 번개", bloomMechanic: "hero5__ranger", uniqueEffect: "물리 피해의 50%가 번개 피해로 바뀜", stats: [{ id: "lightPctDmg", val: 12 }, { id: "physPctDmg", val: 8 }] },
    { id: "uj_endless_night", name: "끝없는 밤", bloomMechanic: "hero5__warlock", uniqueEffect: "적에게 거는 저주가 끝나지 않음", stats: [{ id: "dotPctDmg", val: 10 }, { id: "resPen", val: 4 }] },
    { id: "uj_marksman_eye", name: "명사수의 눈", bloomMechanic: "hero6__ranger", uniqueEffect: "치명타 확률을 두 번 굴려 좋은 쪽을 쓰고, 치명타 확률이 100%를 넘으면 넘는 몫의 50%가 치명타 피해로 바뀜", stats: [{ id: "crit", val: 1.5 }, { id: "critDmg", val: 12 }] },
    { id: "uj_three_way", name: "삼갈래 화살", bloomMechanic: "hero6__gladiator", uniqueEffect: "투사체가 세 갈래로 나뉘어 날아감, 투사체 추가 발사 +1, 투사체 연속 타격 확률 +50%", stats: [{ id: "projectilePctDmg", val: 12 }, { id: "aspd", val: 4 }] },
    { id: "uj_elemental_oath", name: "원소 성전", bloomMechanic: "hero9__crusader", uniqueEffect: "생명력이 1로 고정되는 대신 받는 카오스 피해 50% 감소", stats: [{ id: "energyShieldPct", val: 20 }, { id: "resAll", val: 10 }] },
    { id: "uj_root_bond", name: "뿌리 결속", bloomMechanic: "hero3__soulbinder", uniqueEffect: "소환수의 공격 속도가 플레이어의 공격 속도와 같아지는 대신 플레이어는 공격하지 않음", stats: [{ id: "summonPctDmg", val: 15 }, { id: "summonHpPct", val: 10 }] },
    { id: "uj_blue_judgment", name: "푸른 심판", bloomMechanic: "hero3__inquisitor", uniqueEffect: "원소 공격의 15%가 적의 원소 저항을 반대로 셈", stats: [{ id: "elementalPctDmg", val: 12 }, { id: "resPen", val: 3 }] }
  ];
  var JEWEL_SUMMON_OPTION_IDS = /* @__PURE__ */ new Set(["summonFlatDmg", "summonPctDmg", "summonAspd", "summonHpPct", "summonCrit", "summonCritDmg", "summonEfficiency", "summonResPen"]);
  var JEWEL_SUMMON_OPTION_GROUP = { id: "__summonOptionGroup", name: "소환수 옵션군" };
  var JEWEL_OPTION_POOL = [
    { id: "pctDmg", name: "피해 증폭", min: 4, max: 10 },
    { id: "physPctDmg", name: "물리 증폭", min: 6, max: 15 },
    { id: "firePctDmg", name: "화염 증폭", min: 6, max: 15 },
    { id: "coldPctDmg", name: "냉기 증폭", min: 6, max: 15 },
    { id: "lightPctDmg", name: "번개 증폭", min: 6, max: 15 },
    { id: "chaosPctDmg", name: "카오스 증폭", min: 6, max: 15 },
    { id: "flatHp", name: "생명력 주입", min: 20, max: 45 },
    { id: "crit", name: "치명 보석", min: 1, max: 3 },
    { id: "aspd", name: "질주 보석", min: 3, max: 7 },
    // 재사용 대기시간 세팅(2026-10-21): 한 개로는 작고, 여러 개를 모아야 난사에 다가간다.
    { id: "cooldownRecovery", name: "순환 수정", min: 2, max: 4 },
    { id: "mobilityCooldownRecovery", name: "바람결 파편", min: 3, max: 6 },
    { id: "resAll", name: "수호 보석", min: 4, max: 9 },
    { id: "resF", name: "화염 수호", min: 8, max: 18 },
    { id: "resC", name: "냉기 수호", min: 8, max: 18 },
    { id: "resL", name: "번개 수호", min: 8, max: 18 },
    { id: "resChaos", name: "공허 수호", min: 4, max: 8 },
    { id: "physIgnore", name: "절개 파편", min: 2, max: 6 },
    { id: "dr", name: "강인 파편", min: 3, max: 8 },
    { id: "resPen", name: "관통 수정", min: 2, max: 6 },
    { id: "dotPctDmg", name: "부패 수정", min: 4, max: 10 },
    { id: "regenSuppress", name: "봉쇄 파편", min: 0.5, max: 0.5, step: 0.1 },
    { id: "minDmgRoll", name: "하한 수정", min: 1, max: 3 },
    { id: "maxDmgRoll", name: "상한 수정", min: 1, max: 3 },
    { id: "armorPct", name: "강화 외피", min: 4, max: 10 },
    { id: "evasionPct", name: "유동 보법", min: 4, max: 10 },
    { id: "energyShieldPct", name: "보호막 기동", min: 4, max: 10 },
    { id: "summonFlatDmg", name: "사역 피해 주입", min: 4, max: 12 },
    { id: "summonPctDmg", name: "지배자의 파편", min: 6, max: 16 },
    { id: "summonAspd", name: "무리의 가속", min: 3, max: 9, step: 0.5 },
    { id: "summonHpPct", name: "사역 생명핵", min: 6, max: 16 },
    { id: "summonCrit", name: "야수의 눈", min: 1, max: 4, step: 0.5 },
    { id: "summonCritDmg", name: "포식의 송곳니", min: 10, max: 28 },
    { id: "summonEfficiency", name: "영혼 결속정", min: 4, max: 12 },
    { id: "summonResPen", name: "사역 관통석", min: 1, max: 5, step: 0.5 },
    { id: "ailResIgnite", name: "소염 수정", min: 12.5, max: 50, step: 0.5 },
    { id: "ailResShock", name: "절연 수정", min: 12.5, max: 50, step: 0.5 },
    { id: "ailResFreeze", name: "방한 수정", min: 12.5, max: 50, step: 0.5 },
    { id: "ailResPoison", name: "해독 수정", min: 12.5, max: 50, step: 0.5 },
    { id: "ailResBleed", name: "지혈 수정", min: 12.5, max: 50, step: 0.5 }
  ];
  var JEWEL_HIDDEN_TIER_COUNT = 5;
  var JEWEL_PETITE_OPTION_POOL = [
    { id: "pctDmg", name: "작은 피해결", magic: [1, 1], rare: [1, 2] },
    { id: "flatHp", name: "작은 생명결", magic: [4, 6], rare: [6, 9] },
    { id: "crit", name: "작은 치명결", magic: [0.5, 0.5], rare: [0.5, 1] },
    { id: "aspd", name: "작은 가속결", magic: [1, 1], rare: [1, 2] },
    { id: "resAll", name: "작은 수호결", magic: [1, 1], rare: [1, 2] },
    { id: "resPen", name: "작은 관통결", magic: [1, 1], rare: [1, 2] },
    { id: "regen", name: "작은 재생결", magic: [0.1, 0.1], rare: [0.1, 0.2], step: 0.1 }
  ];
  var QUALITY_ATTRIBUTE_MODES = ["base", "fire", "cold", "light", "chaos", "physical", "defense", "speed"];
  var QUALITY_CATALYST_MODES = ["crit", "summon"];
  var QUALITY_ATTRIBUTE_LABELS = {
    base: "기본",
    fire: "화염",
    cold: "냉기",
    light: "번개",
    chaos: "카오스",
    physical: "물리",
    defense: "방어",
    speed: "속도",
    crit: "치명",
    summon: "소환"
  };
  var BASE_ELEMENT_STATS = Object.freeze({ phys: "physPctDmg", fire: "firePctDmg", light: "lightPctDmg" });

  // modules/data/chaos-infuser-options.mjs
  function createChaosInfuserOptions(CURRENCY_LEGACY_MERGE2) {
    const CHAOS_INFUSER_OPTIONS2 = [
      { optionId: "weapon_flatDmg", id: "flatDmg", min: 12, max: 18, currency: "chaos", cost: 6, label: "무기 기본 피해", slots: ["무기"] },
      { optionId: "weapon_pctDmg", id: "pctDmg", min: 18, max: 26, currency: "chaos", cost: 6, label: "무기 피해 증가", slots: ["무기"] },
      { optionId: "weapon_aspd", id: "aspd", min: 8, max: 12, currency: "alteration", cost: 12, label: "무기 공격 속도", slots: ["무기"] },
      { optionId: "armor_pctHp", id: "pctHp", min: 12, max: 18, currency: "exalted", cost: 1, label: "갑옷 생명력 증가", slots: ["갑옷"] },
      { optionId: "armor_flatHp", id: "flatHp", min: 55, max: 80, currency: "transmute", cost: 18, label: "갑옷/완갑 최대 생명력", slots: ["갑옷", "방패"] },
      { optionId: "armor_defensePct", id: "armorPct", min: 18, max: 26, currency: "augment", cost: 12, label: "갑옷/완갑 방어도 증가", slots: ["갑옷", "방패"] },
      { optionId: "boots_move", id: "move", min: 16, max: 22, currency: "exalted", cost: 1, label: "장화 이동 속도", slots: ["신발"] },
      { optionId: "boots_evasionPct", id: "evasionPct", min: 18, max: 26, currency: "augment", cost: 12, label: "장화 회피 증가", slots: ["신발"] },
      { optionId: "gloves_aspd", id: "aspd", min: 8, max: 12, currency: "alteration", cost: 12, label: "장갑 공격 속도", slots: ["장갑"] },
      { optionId: "gloves_crit", id: "crit", min: 4, max: 6, currency: "exalted", cost: 1, label: "장갑 치명타 확률", slots: ["장갑"] },
      { optionId: "helmet_flatHp", id: "flatHp", min: 45, max: 70, currency: "transmute", cost: 14, label: "투구 최대 생명력", slots: ["투구"] },
      { optionId: "helmet_critDmg", id: "critDmg", min: 22, max: 32, currency: "divine", cost: 1, label: "투구 치명타 피해", slots: ["투구"] },
      { optionId: "belt_pctHp", id: "pctHp", min: 10, max: 16, currency: "exalted", cost: 1, label: "허리띠 생명력 증가", slots: ["허리띠"] },
      { optionId: "belt_flatHp", id: "flatHp", min: 50, max: 76, currency: "transmute", cost: 16, label: "허리띠 최대 생명력", slots: ["허리띠"] },
      { optionId: "jewelry_pctDmg", id: "pctDmg", min: 16, max: 24, currency: "chaos", cost: 6, label: "장신구 피해 증가", slots: ["반지", "목걸이"] },
      { optionId: "jewelry_resPen", id: "resPen", min: 4, max: 6, currency: "chaos", cost: 8, label: "장신구 저항 관통", slots: ["반지", "목걸이"] },
      { optionId: "res_all", id: "resAll", min: 4, max: 7, currency: "chaos", cost: 5, label: "낮은 모든 저항", slots: ["투구", "갑옷", "장갑", "신발", "반지", "목걸이", "허리띠", "방패"] },
      { optionId: "res_fire", id: "resF", min: 12, max: 18, currency: "chaos", cost: 5, label: "화염 저항", slots: ["투구", "갑옷", "장갑", "신발", "반지", "목걸이", "허리띠", "방패"] },
      { optionId: "res_cold", id: "resC", min: 12, max: 18, currency: "chaos", cost: 5, label: "냉기 저항", slots: ["투구", "갑옷", "장갑", "신발", "반지", "목걸이", "허리띠", "방패"] },
      { optionId: "res_light", id: "resL", min: 12, max: 18, currency: "chaos", cost: 5, label: "번개 저항", slots: ["투구", "갑옷", "장갑", "신발", "반지", "목걸이", "허리띠", "방패"] },
      { optionId: "shield_chaos_res", id: "resChaos", min: 8, max: 12, currency: "chaos", cost: 6, label: "완갑 카오스 저항", slots: ["방패"] },
      { optionId: "shield_block_pct", id: "blockChancePct", min: 16, max: 24, currency: "augment", cost: 12, label: "기본 막기 확률 증가", slots: ["방패"] }
    ];
    CHAOS_INFUSER_OPTIONS2.forEach((option) => {
      let merged = Object.entries(CURRENCY_LEGACY_MERGE2 || {}).find(([, legacyKeys]) => legacyKeys.includes(option.currency));
      if (merged) option.currency = merged[0];
    });
    return CHAOS_INFUSER_OPTIONS2;
  }

  // modules/state/equipment-pickups.mjs
  var freshGearIds = [];
  var takeFreshGearIds = (limit) => freshGearIds.splice(0, limit);

  // modules/domain/equipment-workshop-admission.mjs
  function workshopGetAdmission(env, owner, action) {
    if (["liberateEncroachment", "applyVoidChisel"].includes(action)) return "";
    if (owner.woodsmanBuildLock) return env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.");
    if (action === "applyChaosInfusion" && !env.deps.isChaosInfuserUnlocked(owner)) return env.deps._t("나무꾼을 한 번 이상 마주친 뒤 혼돈 주입을 사용할 수 있습니다.");
    const harvestReasons = { applyCorruptSpore: "부패 수확은 고급 수확 제작을 해금해야 쓸 수 있습니다.", applyRiftSpore: "균열 수확은 고급 수확 제작을 해금해야 쓸 수 있습니다." };
    if (harvestReasons[action] && !env.deps.contentProgression.isUnlocked("advancedSpores", owner)) return env.deps._t(harvestReasons[action]);
    return "";
  }

  // modules/domain/equipment-workshop-liberation.mjs
  function* workshopLiberateEncroachment(env, owner, item) {
    if (!item || !item.encroached) return yield { kind: "workshopLog", args: [env.deps._t("잠식된 아이템을 선택하세요."), "attack-monster"] };
    if (item.encroached.liberated) return yield { kind: "workshopLog", args: [env.deps._t("이미 잠식 해방이 완료된 아이템입니다."), "attack-monster"] };
    let options = env.deps.rollEncroachmentLiberationOptions(item);
    if (!options || options.length <= 0) return yield { kind: "workshopLog", args: [env.deps._t("해방 가능한 최고 티어 옵션 후보가 없습니다."), "attack-monster"] };
    yield* workshopOpenEncroachment(owner, item, options);
  }
  function* workshopOpenEncroachment(owner, item, options) {
    owner.pendingEncroachmentLiberation = { itemId: item.id };
    yield { kind: "workshopShowLiberation", args: [item, options] };
  }
  function* workshopCloseEncroachment(owner) {
    owner.pendingEncroachmentLiberation = null;
    yield { kind: "workshopHideLiberation", args: [] };
  }
  function findEncroachmentItem(owner, itemId) {
    let item = (owner.inventory || []).find((v) => v && v.id === itemId);
    if (!item) {
      let equipMatch = Object.entries(owner.equipment || {}).find(([, eq]) => eq && eq.id === itemId);
      if (equipMatch) item = equipMatch[1];
    }
    return item;
  }
  function* workshopConfirmEncroachment(env, owner, pickIdx) {
    let pending = owner.pendingEncroachmentLiberation;
    if (!pending) return;
    let item = findEncroachmentItem(owner, pending.itemId);
    if (!item || !item.encroached || item.encroached.liberated) {
      yield* workshopCloseEncroachment(owner);
      return;
    }
    let options = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions : [];
    let idx = Math.floor(Number(pickIdx) || 0);
    if (idx < 0 || idx >= options.length) return;
    let chosen = { ...options[idx], encroachedFinal: true, encroachedCandidate: false };
    item.encroached.liberated = true;
    item.encroached.chosen = chosen;
    item.encroached.pendingOptions = [];
    yield* workshopCloseEncroachment(owner);
    yield { kind: "workshopLog", args: [env.deps._t("🕳️ 잠식 해방 완료: {value} +{value2} 확정", { value: env.deps._t(chosen.statName || env.deps.getStatName(chosen.id)), value2: env.deps.formatValue(chosen.id, chosen.val) }), "loot-unique"] };
    yield { kind: "workshopRefresh", args: [] };
  }

  // modules/domain/equipment-workshop-infusion.mjs
  function* workshopApplyChaosInfusion(env, owner, item, optionId) {
    if (!item) return yield { kind: "workshopLog", args: [env.deps._t("혼돈 주입 대상 아이템을 선택하세요."), "attack-monster"] };
    let eligibility = env.deps.isChaosInfusionEligibleItem(item);
    if (!eligibility.ok) return yield { kind: "workshopLog", args: [eligibility.reason, "attack-monster"] };
    let option = env.deps.getChaosInfuserOption(optionId);
    if (!option || !env.deps.P_STATS[option.id]) return;
    if (!env.deps.getChaosInfuserOptionsForItem(item).some((opt) => (opt.optionId || opt.id) === (option.optionId || option.id))) return yield { kind: "workshopLog", args: [env.deps._t("이 부위에는 해당 혼돈 주입 옵션을 사용할 수 없습니다."), "attack-monster"] };
    let costs = env.deps.getChaosInfusionCost(option, item);
    if (!env.deps.canPayCurrencyCosts(owner, costs)) return yield { kind: "workshopLog", args: [env.deps._t("혼돈 주입 재화가 부족합니다. (필요: {costs})", { costs: yield { kind: "workshopCurrencyCosts", args: [costs] } }), "attack-monster"] };
    if (!env.deps.payCurrencyCosts(owner, costs)) return;
    let infusion = env.deps.rollChaosInfusionOption(option);
    item.chaosInfusion = infusion;
    yield { kind: "workshopLog", args: [env.deps._t("🧪 혼돈 주입: [{name}] {id} +{value} 부여", { name: env.deps._t(item.name), id: env.deps.getStatName(option.id), value: env.deps.formatValue(option.id, infusion.val) }), "loot-rare"] };
    env.deps.normalizeItem(item);
    yield { kind: "workshopRefresh", args: [] };
  }
  function* workshopRemoveChaosInfusion(env, owner, item) {
    if (!item || !item.chaosInfusion) return;
    let costs = [{ key: "blightSpore", amount: 1 }];
    if (!env.deps.canPayCurrencyCosts(owner, costs)) return yield { kind: "workshopLog", args: [env.deps._t("혼돈 주입 제거에는 {name} 1개가 필요합니다.", { name: env.deps._t(env.deps.ORB_DB.blightSpore.name) }), "attack-monster"] };
    if (!env.deps.payCurrencyCosts(owner, costs)) return;
    item.chaosInfusion = null;
    yield { kind: "workshopLog", args: [env.deps._t("🧼 혼돈 주입 제거: [{name}]", { name: env.deps._t(item.name) }), "loot-normal"] };
    yield { kind: "workshopRefresh", args: [] };
  }

  // modules/domain/equipment-workshop-modifiers.mjs
  function* workshopApplyEnchantedHoney(env, owner, item) {
    if (!item) return yield { kind: "workshopLog", args: [env.deps._t("먼저 아이템을 선택하세요."), "attack-monster"] };
    if (item.fusedRelic) return yield { kind: "workshopLog", args: [env.deps._t("융합 유물은 시간에 굳어, 황금률/잿불가지/축복의 꽃잎만 받아들입니다."), "attack-monster"] };
    if ((owner.currencies.enchantedHoney || 0) <= 0) return yield { kind: "workshopLog", args: [env.deps._t("마력 깃든 벌꿀이 부족합니다."), "attack-monster"] };
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length < 4) return yield { kind: "workshopLog", args: [env.deps._t("벌꿀 고정은 추가 옵션이 4개 이상일 때만 사용할 수 있습니다."), "attack-monster"] };
    if (item.stats.some((stat) => stat && stat.lockedByHoney)) return yield { kind: "workshopLog", args: [env.deps._t("이 장비에는 이미 고정 옵션이 있습니다."), "attack-monster"] };
    let candidates = item.stats.filter((stat) => stat && !stat.lockedByRift);
    if (candidates.length <= 0) return yield { kind: "workshopLog", args: [env.deps._t("고정 가능한 옵션이 없습니다."), "attack-monster"] };
    let pick = candidates[Math.floor(Math.random() * candidates.length)];
    pick.lockedByHoney = true;
    owner.currencies.enchantedHoney--;
    yield { kind: "workshopLog", args: [env.deps._t("🍯 [{name}] 옵션 고정 적용: {value}", { name: env.deps._t(item.name), value: env.deps._t(pick.statName || env.deps.getStatName(pick.id)) }), "loot-unique"] };
    yield { kind: "workshopRefresh", args: [] };
  }
  function* workshopApplyVenomStinger(env, owner, item) {
    if (!item) return yield { kind: "workshopLog", args: [env.deps._t("먼저 아이템을 선택하세요."), "attack-monster"] };
    if (item.fusedRelic) return yield { kind: "workshopLog", args: [env.deps._t("융합 유물은 시간에 굳어, 황금률/잿불가지/축복의 꽃잎만 받아들입니다."), "attack-monster"] };
    if ((owner.currencies.venomStinger || 0) <= 0) return yield { kind: "workshopLog", args: [env.deps._t("독벌침이 부족합니다."), "attack-monster"] };
    const refusal = env.deps.getVenomStingerRefusal(item);
    if (refusal) return yield { kind: "workshopLog", args: [refusal, "attack-monster"] };
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let attackMods = env.deps.getVenomStingerMods(item);
    if (attackMods.length <= 0) return yield { kind: "workshopLog", args: [env.deps._t("독벌침이 붙일 수 있는 공격 옵션 자리가 없습니다(접두 3, 접미 3)."), "attack-monster"] };
    let mod = env.deps.pickWeightedMod(attackMods);
    let rolled = env.deps.rollAffixValue(mod, env.deps.getItemCraftTier(item));
    let idx = item.stats.findIndex((stat) => stat && stat.venomStingerBonus);
    rolled.venomStingerBonus = true;
    if (idx >= 0) item.stats[idx] = rolled;
    else item.stats.push(rolled);
    owner.currencies.venomStinger--;
    yield { kind: "workshopLog", args: [env.deps._t("🦂 독벌침 적용: {value} +{value2}", { value: env.deps._t(rolled.statName || env.deps.getStatName(rolled.id)), value2: env.deps.formatValue(rolled.id, rolled.val) }), "loot-rare"] };
    yield { kind: "workshopRefresh", args: [] };
  }
  function* workshopApplyVoidChisel(env, owner, item) {
    if (!item) return yield { kind: "workshopLog", args: [env.deps._t("먼저 아이템을 선택하세요."), "attack-monster"] };
    let result = env.deps.equipmentSockets.chisel(item, owner);
    if (!result.ok) return yield { kind: "workshopLog", args: [result.reason, "attack-monster"] };
    yield { kind: "workshopLog", args: [env.deps._t("🕳️ [{name}]에 공허 소켓을 뚫었습니다.", { name: env.deps._t(item.name) }), "loot-rare"] };
    yield { kind: "workshopRefresh", args: [] };
  }
  function* workshopApplyWoodsmanTouch(env, owner, item) {
    if (!item) return yield { kind: "workshopLog", args: [env.deps._t("먼저 봉인할 장비를 선택하세요."), "attack-monster"] };
    if ((owner.currencies.ouroboros || 0) < 1) return yield { kind: "workshopLog", args: [env.deps._t("우로보로스가 부족합니다."), "attack-monster"] };
    if (item.loopSealed) return yield { kind: "workshopLog", args: [env.deps._t("이미 봉인된 장비입니다."), "attack-monster"] };
    owner.currencies.ouroboros--;
    item.loopSealed = true;
    yield { kind: "workshopLog", args: [env.deps._t("🌿 [{name}]{particle} 나무꾼의 손길로 봉인했습니다. 루프가 진행되어도 사라지지 않습니다.", { name: yield { kind: "workshopItemName", args: [item] }, particle: env.deps.pickParticle(item.name, "을", "를") }), "loot-unique"] };
    yield { kind: "workshopRefresh", args: [] };
    yield { kind: "workshopSave", args: [200] };
  }

  // modules/domain/equipment-workshop-harvest.mjs
  function* workshopApplyCorruptSpore(env, owner, item) {
    if (!item) return yield { kind: "workshopLog", args: [env.deps._t("먼저 아이템을 선택하세요."), "attack-monster"] };
    if (!env.deps.isSporeCraftEquipment(item)) return yield { kind: "workshopLog", args: [env.deps._t("수확 제작은 장비에만 사용할 수 있습니다."), "attack-monster"] };
    const refusal = env.deps.getRotHarvestRefusal(item);
    if (refusal) return yield { kind: "workshopLog", args: [env.deps._t(refusal), "attack-monster"] };
    if (!workshopRotHarvestKeys(env).every((key) => workshopHoldsHarvest(env, owner, key))) return yield { kind: "workshopLog", args: [env.deps._t("부패 수확에는 화염, 냉기, 번개 식물이 하나씩 필요합니다."), "attack-monster"] };
    let ids = new Set(env.deps.ROT_SPORE_STAT_IDS);
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let candidates = item.stats.map((stat, idx) => ({ stat, idx })).filter((row) => row.stat && !row.stat.lockedByHoney && !row.stat.lockedByRift && ids.has(row.stat.id));
    if (candidates.length <= 0) return yield { kind: "workshopLog", args: [env.deps._t("제거할 원소 계열 옵션이 없습니다."), "attack-monster"] };
    workshopRotHarvestKeys(env).forEach((key) => env.deps.stumpBox.payHarvestPrice(owner, key));
    let pick = env.deps.rndChoice(candidates);
    let removed = item.stats.splice(pick.idx, 1)[0];
    env.deps.updateItemName(item);
    yield { kind: "workshopLog", args: [env.deps._t("🌿 부패 수확 적용: {value} 옵션 제거", { value: env.deps._t(removed.statName || env.deps.getStatName(removed.id)) }), "loot-rare"] };
    yield { kind: "workshopRefresh", args: [] };
  }
  function* workshopApplyRiftSpore(env, owner, item) {
    if (!item) return yield { kind: "workshopLog", args: [env.deps._t("먼저 아이템을 선택하세요."), "attack-monster"] };
    if (!env.deps.isSporeCraftEquipment(item)) return yield { kind: "workshopLog", args: [env.deps._t("수확 제작은 장비에만 사용할 수 있습니다."), "attack-monster"] };
    const craftBlock = env.deps.equipmentCrafting.getRiftHarvestBlockReason(item);
    if (craftBlock) return yield { kind: "workshopLog", args: [craftBlock, "attack-monster"] };
    if ((owner.currencies.fossil || 0) < 1 || !workshopHoldsHarvest(env, owner, workshopRiftHarvestKey(env))) return yield { kind: "workshopLog", args: [env.deps._t("균열 수확에는 미궁 화석 1개와 뿌리 1개가 필요합니다."), "attack-monster"] };
    return yield* applyRiftHarvest(env, owner, item);
  }
  function* applyRiftHarvest(env, owner, item) {
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let pool = typeof env.deps.getFossilExclusivePool === "function" ? env.deps.getFossilExclusivePool(item) : env.deps.FOSSIL_EXCLUSIVE_MODS.filter((mod) => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return yield { kind: "workshopLog", args: [env.deps._t("이 장비 슬롯에 붙일 수 있는 화석 전용 옵션이 없습니다."), "attack-monster"] };
    owner.currencies.fossil--;
    env.deps.stumpBox.payHarvestPrice(owner, workshopRiftHarvestKey(env));
    let roll = env.deps.rollAffixValue(env.deps.pickWeightedMod(pool), env.deps.getItemCraftTier(item));
    roll.fossilExclusiveSpore = true;
    roll.craftSource = "fossil";
    item.stats.push(roll);
    item.rarity = item.rarity === "normal" ? "magic" : item.rarity;
    env.deps.updateItemName(item);
    yield { kind: "workshopLog", args: [env.deps._t("🌿 균열 수확 적용: {value} +{value2}", { value: env.deps._t(roll.statName || env.deps.getStatName(roll.id)), value2: env.deps.formatValue(roll.id, roll.val) }), "loot-unique"] };
    yield { kind: "workshopRefresh", args: [] };
  }
  function workshopRotHarvestKeys(env) {
    return env.deps.STUMP_BOX_HARVEST_CRAFT.rot.map((color) => env.deps.stumpBox.harvestPriceKey("any", color));
  }
  function workshopRiftHarvestKey(env) {
    return env.deps.stumpBox.harvestPriceKey(env.deps.STUMP_BOX_HARVEST_CRAFT.riftKind);
  }
  function workshopHoldsHarvest(env, owner, key) {
    return env.deps.stumpBox.harvestPriceHeld(owner, key) >= 1;
  }

  // modules/domain/equipment-workshop-jewels.mjs
  function destroyWorkshopItem(env, owner, item) {
    if (typeof env.deps.getCraftSelectionRef !== "function" || typeof env.deps.isCraftSelectionEquip !== "function") return 0;
    const jewels = env.deps.equipmentSockets.returnJewels(item, owner);
    const ref = env.deps.getCraftSelectionRef();
    if (env.deps.isCraftSelectionEquip()) owner.equipment[ref] = null;
    else owner.inventory = (owner.inventory || []).filter((entry) => entry !== item);
    if (typeof env.deps.clearCraftSelection === "function") env.deps.clearCraftSelection();
    return jewels;
  }
  function* refineWorkshopJewel(env, owner) {
    if (owner.woodsmanBuildLock) return yield { kind: "workshopLog", args: [env.deps._t("☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다."), "attack-monster"] };
    const cost = 12;
    if ((owner.currencies.jewelShard || 0) < cost) return yield { kind: "workshopLog", args: [env.deps._t("주얼 가공에 필요한 주얼 결정이 부족합니다. (필요: {cost})", { cost }), "attack-monster"] };
    if (!env.deps.equipmentInventoryGridRuntime.findAddPlacement({ slot: env.deps.bagItems.JEWEL }, owner).ok) return yield { kind: "workshopLog", args: [env.deps._t("가방에 자리가 없습니다."), "attack-monster"] };
    owner.currencies.jewelShard -= cost;
    const zoneTier = Math.max(1, Math.floor((env.deps.getZone(owner.currentZoneId) || {}).tier || 1));
    const jewel = env.deps.generateJewelDrop(zoneTier + 8);
    if (!jewel) {
      yield* env.deps.awardCurrency(owner, "jewelShard", cost);
      return yield { kind: "workshopLog", args: [env.deps._t("주얼 가공 결과를 생성하지 못했습니다. 소모 재화를 반환합니다."), "attack-monster"] };
    }
    env.deps.bagItems.put(env.deps.bagItems.asJewel(jewel), owner, true);
    yield { kind: "workshopJewelCreated", args: [jewel] };
    yield { kind: "workshopRefresh", args: [] };
  }

  // modules/domain/equipment-workshop.mjs
  function createEquipmentWorkshop(deps) {
    const env = { deps };
    return Object.freeze({
      getAdmission: (...args) => workshopGetAdmission(env, ...args),
      liberateEncroachment: (...args) => workshopLiberateEncroachment(env, ...args),
      applyChaosInfusion: (...args) => workshopApplyChaosInfusion(env, ...args),
      removeChaosInfusion: (...args) => workshopRemoveChaosInfusion(env, ...args),
      applyEnchantedHoney: (...args) => workshopApplyEnchantedHoney(env, ...args),
      applyVenomStinger: (...args) => workshopApplyVenomStinger(env, ...args),
      applyVoidChisel: (...args) => workshopApplyVoidChisel(env, ...args),
      applyWoodsmanTouch: (...args) => workshopApplyWoodsmanTouch(env, ...args),
      applyCorruptSpore: (...args) => workshopApplyCorruptSpore(env, ...args),
      applyRiftSpore: (...args) => workshopApplyRiftSpore(env, ...args),
      destroySelectedCraftItem: (...args) => destroyWorkshopItem(env, ...args),
      drawJewelRefine: (...args) => refineWorkshopJewel(env, ...args),
      openEncroachment: workshopOpenEncroachment,
      closeEncroachment: workshopCloseEncroachment,
      confirmEncroachment: (...args) => workshopConfirmEncroachment(env, ...args)
    });
  }

  // modules/domain/equipment-refinement-admission.mjs
  function refineCanPayCurrencyCosts(owner, costs) {
    return (costs || []).every((row) => (owner.currencies[row.key] || 0) >= row.amount);
  }
  function refinePayCurrencyCosts(owner, costs) {
    if (!refineCanPayCurrencyCosts(owner, costs)) return false;
    (costs || []).forEach((row) => {
      owner.currencies[row.key] = Math.max(0, Math.floor(owner.currencies[row.key] || 0) - row.amount);
    });
    return true;
  }
  function refineGetVenomStingerRefusal(env, item) {
    if (item.slot !== "무기") return "독벌침은 무기에만 사용할 수 있습니다.";
    if (!["magic", "rare", "unique"].includes(item.rarity)) return "독벌침은 마법, 희귀, 고유 무기에만 사용할 수 있습니다.";
    const replaces = (Array.isArray(item.stats) ? item.stats : []).some((stat) => stat && stat.venomStingerBonus);
    return !replaces && env.deps.getItemExplicitOptionCount(item) >= env.deps.EXPLICIT_AFFIX_LINE_CAP ? "추가 옵션이 6줄이라 독벌침 줄을 붙일 수 없습니다." : "";
  }
  function refineGetVenomStingerMods(env, item) {
    const occupiedIds = env.deps.getItemOccupiedExplicitModIds(item);
    const room = env.deps.equipmentCrafting.affixRoom(item, item.rarity, (item.stats || []).find((stat) => stat && stat.venomStingerBonus) || null);
    return env.deps.MOD_DB.filter((mod) => mod.slots.includes("무기") && env.deps.VENOM_STINGER_STAT_IDS.includes(mod.statId || mod.id) && env.deps.isModForOrigin(mod, item) && !occupiedIds.has(mod.statId || mod.id) && env.deps.equipmentCrafting.fitsRoom(room, mod));
  }
  function refineGetRotHarvestRefusal(item) {
    if (item.corrupted) return "타락한 아이템에는 사용할 수 없습니다.";
    if (item.fusedRelic) return "융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.";
    return item.hallReplica ? "전당 소장품은 원본 상태를 보존하므로 제작할 수 없습니다." : "";
  }
  function refineIsMarketUnlocked(env) {
    return env.deps.contentProgression.isUnlocked("market");
  }
  function refineIsChaosInfuserUnlocked(owner) {
    return !!(owner.chaosInfuserUnlocked || owner.woodsmanSimulatorSeenLoop || (owner.woodsmanDefeatAttempts || 0) > 0 || (owner.journalEntries || []).includes("woodsman"));
  }

  // modules/domain/equipment-refinement-liberation.mjs
  function refineGetEncroachmentLiberationTier(env, item) {
    let sourceFloor = Math.max(1, Math.floor(Number(item && item.encroached && item.encroached.sourceFloor) || 1));
    let sourceTier = typeof env.deps.getChaosRealmTier === "function" ? env.deps.getChaosRealmTier(sourceFloor) : 15;
    let sourceZone = { type: "chaosRealm", tier: sourceTier, floor: sourceFloor };
    let realmCap = env.deps.getRealmEquipmentAffixTierCap(sourceZone, env.deps.getRealmEquipmentHiddenTierCap(sourceZone));
    return Math.max(env.deps.getItemCraftTier(item), realmCap);
  }
  function refineRollEncroachmentLiberationOptions(env, item) {
    if (!item || !item.encroached || item.encroached.liberated) return [];
    let liberationTier = refineGetEncroachmentLiberationTier(env, item);
    item.encroached.pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.filter(Boolean).slice(0, 3) : [];
    let pendingMatchesTier = item.encroached.pendingOptions.length > 0 && item.encroached.pendingOptions.every((option) => Math.floor(Number(option && option.tier) || 0) === liberationTier);
    if (pendingMatchesTier) return item.encroached.pendingOptions;
    let existing = env.deps.getItemOccupiedExplicitModIds(item);
    let pool = env.deps.getAvailableMods(item).filter((mod) => !existing.has(mod.statId || mod.id));
    let picks = env.deps.pickRandomMods(pool, 3);
    item.encroached.pendingOptions = picks.map((mod) => ({ ...env.deps.rollAffixValueInTierRange(mod, liberationTier, liberationTier), encroachedCandidate: true }));
    return item.encroached.pendingOptions;
  }

  // modules/domain/equipment-refinement-quality.mjs
  function refineGetItemQualityAttributeMode(env, item) {
    let mode = item && typeof item.qualityAttribute === "string" ? item.qualityAttribute : "base";
    return env.deps.QUALITY_ATTRIBUTE_MODES.includes(mode) || env.deps.QUALITY_CATALYST_MODES.includes(mode) ? mode : "base";
  }
  function refineGetItemQualityAttributeLabel(env, mode) {
    return env.deps.QUALITY_ATTRIBUTE_LABELS[mode] || env.deps.QUALITY_ATTRIBUTE_LABELS.base;
  }
  function refineGetNextItemQualityAttributeMode(env, mode) {
    let current = env.deps.QUALITY_ATTRIBUTE_MODES.indexOf(env.deps.QUALITY_ATTRIBUTE_MODES.includes(mode) ? mode : "base");
    return env.deps.QUALITY_ATTRIBUTE_MODES[(current + 1) % env.deps.QUALITY_ATTRIBUTE_MODES.length];
  }
  function refineIsQualityAttributeStat(env, mode, statId) {
    let group = env.deps.QUALITY_ATTRIBUTE_STAT_GROUPS[mode] || [];
    return group.includes(statId);
  }
  function refineApplyAbyssCatalystToItemQuality(env, item) {
    let nextMode = refineGetNextItemQualityAttributeMode(env, refineGetItemQualityAttributeMode(env, item));
    item.qualityAttribute = nextMode;
    return refineGetItemQualityAttributeLabel(env, nextMode);
  }

  // modules/domain/equipment-refinement-corruption.mjs
  function refineIsRemovableExplicitStat(stat) {
    return !!(stat && !stat.lockedByHoney && !stat.lockedByRift && !stat.encroachedFinal && !stat.unremovable);
  }
  function refineGetAnnulmentRemovableStats(item) {
    return (item && Array.isArray(item.stats) ? item.stats : []).map((stat, index) => ({ stat, index })).filter((row) => refineIsRemovableExplicitStat(row.stat));
  }
  function refineGetTaintedRerollLines(item) {
    return (item.stats || []).map((stat, index) => ({ stat, index })).filter(({ stat }) => stat && !stat.lockedByHoney && !stat.lockedByRift);
  }
  function refineCanApplyTaintedOutcome(env, owner, item, kind) {
    if (kind === "addMod") return env.deps.getAvailableMods(item).length > 0;
    if (kind === "quality") return Math.floor(Number(item.quality) || 0) < env.deps.TAINTED_CRAFT_OUTCOMES.quality.cap;
    if (kind === "rerollMod") return refineGetTaintedRerollLines(item).length > 0 && env.deps.getAvailableMods(item).length > 0;
    if (kind === "socket") return env.deps.contentProgression.isUnlocked("jewel", owner) && env.deps.equipmentSockets.canAddCorruptionSocket(item);
    return kind === "nothing";
  }
  function refinePickTaintedOutcome(env, owner, item) {
    const rows = env.deps.TAINTED_CRAFT_OUTCOMES.weights.filter(([kind]) => refineCanApplyTaintedOutcome(env, owner, item, kind));
    let roll = Math.random() * rows.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [kind, weight] of rows) {
      if (roll < weight) return kind;
      roll -= weight;
    }
    return "nothing";
  }
  function refineRerollTaintedLine(env, item) {
    const { stat, index } = env.deps.rndChoice(refineGetTaintedRerollLines(item));
    const name = stat.statName || env.deps.getStatName(stat.id);
    item.stats.splice(index, 1);
    const open = env.deps.getOpenAffixMods(item);
    const mod = env.deps.pickWeightedMod(open.filter((row) => (row.statId || row.id) !== stat.id)) || env.deps.pickWeightedMod(open);
    item.stats.splice(index, 0, mod ? env.deps.rollAffixValue(mod, env.deps.getItemCraftTier(item)) : stat);
    env.deps.updateItemName(item);
    return env.deps._t("{name} 옵션이 {statName} 옵션으로 바뀌었습니다.", { name, statName: item.stats[index].statName || env.deps.getStatName(item.stats[index].id) });
  }
  function refineCorruptCraftedItem(env, owner, item) {
    const kind = refinePickTaintedOutcome(env, owner, item);
    item.corrupted = true;
    if (kind === "addMod") {
      item.stats.push(env.deps.rollAffixValue(env.deps.pickWeightedMod(env.deps.getAvailableMods(item)), env.deps.getItemCraftTier(item)));
      if (item.rarity === "normal") item.rarity = "magic";
      env.deps.updateItemName(item);
      return { kind, text: env.deps._t("추가 옵션이 부여되었습니다.") };
    }
    if (kind === "quality") {
      const { min, max, cap } = env.deps.TAINTED_CRAFT_OUTCOMES.quality, before = Math.floor(Number(item.quality) || 0);
      item.quality = Math.min(cap, before + min + Math.floor(Math.random() * (max - min + 1)));
      return { kind, text: env.deps._t("품질이 {before}% → {quality}%로 올랐습니다.", { before, quality: item.quality }) };
    }
    if (kind === "rerollMod") return { kind, text: refineRerollTaintedLine(env, item) };
    if (kind === "socket") {
      env.deps.equipmentSockets.addCorruptionSocket(item);
      return { kind, text: env.deps.equipmentSockets.count(item) > 1 ? "두 번째 소켓, 타락 소켓이 열렸습니다!" : "타락 소켓이 하나 생겼습니다." };
    }
    return { kind, text: env.deps._t("아이템에 변화가 없습니다.") };
  }

  // modules/domain/equipment-relic-stats.mjs
  function refineGetCosmosBossRelicStatTotals(owner) {
    let atlas2 = owner && owner.cosmosAtlas || {};
    let equipped = atlas2.equippedStones && typeof atlas2.equippedStones === "object" ? atlas2.equippedStones : {};
    let legacyEquippedGalaxy = Math.max(0, Math.min(6, Math.floor(atlas2.equippedStoneGalaxy || 0)));
    let optionsByGalaxy = atlas2.bossStoneOptions && typeof atlas2.bossStoneOptions === "object" ? atlas2.bossStoneOptions : {};
    let totals = {};
    Object.keys(optionsByGalaxy).forEach((galaxyKey) => {
      let galaxy = Math.max(1, Math.min(6, Math.floor(Number(galaxyKey) || 0)));
      let isEquipped = !!equipped[galaxyKey] || Object.keys(equipped).length === 0 && legacyEquippedGalaxy >= galaxy;
      if (!isEquipped) return;
      (Array.isArray(optionsByGalaxy[galaxyKey]) ? optionsByGalaxy[galaxyKey] : []).forEach((option) => {
        if (!option || !option.stat) return;
        totals[option.stat] = (totals[option.stat] || 0) + Number(option.value || 0);
      });
    });
    return totals;
  }

  // modules/domain/equipment-refinement.mjs
  function createEquipmentRefinement(deps) {
    const env = { deps };
    return Object.freeze({
      canPayCurrencyCosts: refineCanPayCurrencyCosts,
      payCurrencyCosts: refinePayCurrencyCosts,
      getVenomStingerRefusal: (...args) => refineGetVenomStingerRefusal(env, ...args),
      getVenomStingerMods: (...args) => refineGetVenomStingerMods(env, ...args),
      getRotHarvestRefusal: refineGetRotHarvestRefusal,
      isMarketUnlocked: (...args) => refineIsMarketUnlocked(env, ...args),
      isChaosInfuserUnlocked: refineIsChaosInfuserUnlocked,
      rollEncroachmentLiberationOptions: (...args) => refineRollEncroachmentLiberationOptions(env, ...args),
      getItemQualityAttributeMode: (...args) => refineGetItemQualityAttributeMode(env, ...args),
      getItemQualityAttributeLabel: (...args) => refineGetItemQualityAttributeLabel(env, ...args),
      isQualityAttributeStat: (...args) => refineIsQualityAttributeStat(env, ...args),
      applyAbyssCatalystToItemQuality: (...args) => refineApplyAbyssCatalystToItemQuality(env, ...args),
      getAnnulmentRemovableStats: refineGetAnnulmentRemovableStats,
      canApplyTaintedOutcome: (...args) => refineCanApplyTaintedOutcome(env, ...args),
      corruptCraftedItem: (...args) => refineCorruptCraftedItem(env, ...args),
      getCosmosBossRelicStatTotals: refineGetCosmosBossRelicStatTotals
    });
  }

  // modules/domain/equipment-acquisition-currency.mjs
  function acquireResolveCurrencyAward(env, owner, currencyKey, amount, source = "reward") {
    const key = env.deps.getCanonicalCurrencyKey(currencyKey);
    if (source === "drop" && !env.deps.contentProgression.canDropCurrency(key, owner)) return { key, gain: 0, refused: true };
    let gain = Number(amount || 0);
    if (gain > 0) gain = Math.max(1, Math.floor(gain));
    return { key, gain, refused: false };
  }
  function* acquireAwardCurrency(env, owner, currencyKey, amount, source = "reward") {
    const award = acquireResolveCurrencyAward(env, owner, currencyKey, amount, source);
    if (award.refused) return 0;
    yield* acquireCommitCurrencyGain(env, owner, award.key, award.gain);
    return award.gain;
  }
  function* acquireCommitCurrencyGain(env, owner, currencyKey, gain) {
    if (currencyKey === "condensedSkyPower") {
      let st = env.deps.ensureSkyTowerState(owner);
      st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + gain;
      env.deps.combatLootReceipts.currency(owner, currencyKey, gain);
      owner.currencyDropVersion = Math.max(0, Math.floor(owner.currencyDropVersion || 0)) + 1;
      return;
    }
    owner.currencies[currencyKey] = (owner.currencies[currencyKey] || 0) + gain;
    env.deps.currencyExchange.noteSeen(owner, currencyKey);
    env.deps.combatLootReceipts.currency(owner, currencyKey, gain);
    owner.currencyDropVersion = Math.max(0, Math.floor(owner.currencyDropVersion || 0)) + 1;
    yield* acquireNotifyCurrencyAcquisition(owner, currencyKey, gain);
  }
  function* acquireNotifyCurrencyAcquisition(owner, currencyKey, gain) {
    if ((currencyKey === "chaosKey" || currencyKey === "coreKey") && gain > 0) {
      if (owner.noti) owner.noti.map = true;
    }
    if (currencyKey === "ouroboros" && gain > 0) {
      owner.woodsmanTouchSeen = true;
    }
    const unlocked = acquireUnlockLegacyCurrencyFeatures(owner, currencyKey);
    yield { kind: "acquisitionEvent", args: ["currency-acquired", { currencyKey, gain, unlocked }] };
  }
  function acquireUnlockLegacyCurrencyFeatures(owner, currencyKey) {
    const unlocked = { gem: false };
    if (!owner.contentProgression && !owner.gemEnhanceUnlocked && (currencyKey === "bossCore" || currencyKey === "skyEssence")) {
      owner.gemEnhanceUnlocked = true;
      owner.noti.skills = true;
      unlocked.gem = true;
    }
    return unlocked;
  }

  // modules/domain/equipment-acquisition-codex.mjs
  function acquireGetUniqueCodexKeyByItem(env, item) {
    if (!item || item.rarity !== "unique") return null;
    if (typeof env.deps.bagItems === "object" && env.deps.bagItems.isSpecial(item)) return null;
    return `${item.slot}|${item.name}`;
  }
  function* acquireRegisterUniqueToCodexOnAcquire(env, owner, item) {
    let key = acquireGetUniqueCodexKeyByItem(env, item);
    if (!key) return false;
    owner.uniqueCodex ?? (owner.uniqueCodex = {});
    let existing = owner.uniqueCodex[key];
    if (existing && existing.baseName) return false;
    owner.uniqueCodex[key] = JSON.parse(JSON.stringify(item));
    let firstTime = !existing;
    if (!firstTime) return true;
    owner.codexNewlyRegistered ?? (owner.codexNewlyRegistered = {});
    owner.codexNewlyRegistered[key] = true;
    if (owner.noti) owner.noti.codex = true;
    if (!(yield { kind: "acquisitionIsLiveOwner", args: [owner] })) return true;
    yield { kind: "acquisitionLog", args: [env.deps._t("📚 도감 신규 등록: <span class='loot-unique'>[{name}]</span>", { name: env.deps._t(item.name) }), "loot-unique"] };
    if (env.deps.claimCodexCompletion(owner)) {
      yield { kind: "acquisitionLog", args: [env.deps._t("📚 도감 완성! 다음 루프부터 루프마다 액트 1 고유 하나를 무작위로 받습니다."), "loot-unique"] };
    }
    return true;
  }
  function* acquireRecordEquipmentAcquisition(env, owner, item) {
    env.deps.freshGearIds.push(item.id);
    if (env.deps.freshGearIds.length > 40) env.deps.freshGearIds.shift();
    env.deps.combatLootReceipts.item(owner, item);
    return yield* acquireRecordUniqueAcquisition(env, owner, item);
  }
  function* acquireRecordUniqueAcquisition(env, owner, item) {
    if (item.rarity !== "unique") return false;
    yield* acquireRegisterUniqueToCodexOnAcquire(env, owner, item);
    if (typeof env.deps.uniqueHuntRuntime === "undefined") return true;
    let target = env.deps.uniqueHuntRuntime.complete(item, owner);
    if (!target) return true;
    yield { kind: "acquisitionLog", args: [env.deps._t("🎯 파밍 목표 획득: <span class='loot-unique'>[{name}]</span>", { name: env.deps._t(item.name) }), "loot-unique", { item, toast: true }] };
    return true;
  }

  // modules/domain/equipment-acquisition-filters.mjs
  function acquirePassesPickupTierCount(item, settings) {
    const minTierCount = Math.max(0, Math.floor(settings.itemFilterMinTierCount || 0));
    if (minTierCount <= 0 || item.rarity === "unique") return true;
    const tierThreshold = Math.max(1, Math.floor(settings.itemFilterTierThreshold || 10));
    return (item.stats || []).filter((stat) => Number.isFinite(stat.tier) && stat.tier >= tierThreshold).length >= minTierCount;
  }
  function acquireIsPickupException(env, owner, item, always) {
    return !!always && Object.entries(env.PICKUP_EXCEPTIONS).some(([key, test]) => always[key] === true && test(item, owner));
  }
  function acquirePassesPickupSlot(env, item, settings) {
    const slot = String(item.slot || "").replace(/[123]$/, "");
    if (settings.itemFilterSlots && settings.itemFilterSlots[slot] === false) return false;
    const category = slot === "무기" ? env.deps.getWeaponCategoryId(item) : null;
    return !category || !settings.itemFilterWeaponCategories || settings.itemFilterWeaponCategories[category] !== false;
  }
  function acquirePassesItemPickupFilter(env, owner, item) {
    let settings = owner.settings || {};
    if (!settings.itemFilterEnabled) return true;
    if (acquireIsPickupException(env, owner, item, settings.itemFilterAlways)) return true;
    let rarities = { normal: true, magic: true, rare: true, unique: true, ...settings.itemFilterRarities || {} };
    if (!rarities[item.rarity] || !acquirePassesPickupSlot(env, item, settings)) return false;
    if (!passesPickupMinimumTier(item, settings)) return false;
    if (!acquirePassesPickupTierCount(item, settings)) return false;
    return passesPickupCodex(env, owner, item, settings);
  }
  function passesPickupMinimumTier(item, settings) {
    let minTier = Math.max(1, Math.floor((settings.itemFilterMinTiers || {})[item.rarity] || settings.itemFilterMinHiddenTier || 1));
    return !((item.hiddenTier || item.itemTier || 1) < minTier);
  }
  function passesPickupCodex(env, owner, item, settings) {
    if (item.rarity === "unique" && settings.itemFilterOnlyNewCodexUnique) {
      let key = acquireGetUniqueCodexKeyByItem(env, item);
      if (key && owner.uniqueCodex && owner.uniqueCodex[key]) return false;
    }
    return true;
  }
  function acquireIsGuaranteedEquipmentPickup(env, owner, item, options) {
    return !!(options && options.guaranteedKeep) || env.deps.uniqueHuntRuntime.isTargetItem(item, owner) || env.deps.equipmentLootPolicy.matches(item, owner) || env.deps.bagItems.ownShape(item);
  }
  function acquirePreviewEquipmentPickup(env, owner, item, options) {
    env.deps.normalizeItem(item);
    if (acquireIsGuaranteedEquipmentPickup(env, owner, item, options) || env.deps.bagItems.keptOnPickup(item, owner)) return "kept";
    if (!acquirePassesItemPickupFilter(env, owner, item)) return "filtered";
    return owner.settings.autoSalvageEnabled && owner.settings.autoSalvageRarities?.[item.rarity] ? "salvaged" : "kept";
  }

  // modules/domain/equipment-salvage-rewards.mjs
  function acquireIsChaseUniqueItem(env, item) {
    if (!item || item.rarity !== "unique") return false;
    if (item.ultraRare || item.chaseUnique) return true;
    let uniqueDef = env.deps.UNIQUE_DB.find((unique) => unique && unique.name === item.name);
    return !!(uniqueDef && uniqueDef.ultraRare);
  }
  function acquireGetUniqueDismantleDivineChance(env, item) {
    if (!item || item.rarity !== "unique") return 0;
    if (acquireIsChaseUniqueItem(env, item)) return 1;
    let tier = env.deps.getItemCraftTier(item);
    return Math.min(0.12, 0.01 + (tier - 1) / 14 * 0.11);
  }
  function acquireGetItemSalvageRewardProfile(env, item, options) {
    if (env.deps.bagItems.isSpecial(item)) return env.deps.bagItems.salvageProfile(item);
    let noDivine = !!(options && options.noDivine);
    let rarity = item && item.rarity || "normal";
    let guaranteed = {};
    let chances = [];
    if (rarity === "normal") {
      guaranteed.magicBud = 1;
    } else if (rarity === "magic") {
      guaranteed.magicBud = 1;
    } else if (rarity === "rare") {
      guaranteed.formlessDew = 1;
      let tier = Math.max(1, env.deps.getItemCraftTier(item));
      let explicitCount = Math.max(0, env.deps.getItemExplicitOptionCount(item));
      chances.push({ key: "formlessDew", amount: 1, chance: Math.min(0.35, 0.04 + tier * 0.01 + explicitCount * 0.02) });
    } else if (rarity === "unique") {
      guaranteed.formlessDew = 2;
      chances.push({ key: "sapBud", amount: 1, chance: 0.55 });
      if (!noDivine) chances.push({ key: "goldenRule", amount: 1, chance: acquireGetUniqueDismantleDivineChance(env, item) });
    }
    return { guaranteed, chances };
  }
  function acquireAddSalvageRewardAmount(env, rewards, key, amount) {
    let gain = Math.max(0, Math.floor(Number(amount) || 0));
    if (!key || gain <= 0) return rewards;
    let currencyKey = env.deps.getCanonicalCurrencyKey(key);
    rewards[currencyKey] = Math.max(0, Math.floor(Number(rewards[currencyKey]) || 0)) + gain;
    return rewards;
  }
  function acquireMergeSalvageRewards(env, target, source) {
    let result = target && typeof target === "object" ? target : {};
    Object.entries(source || {}).forEach(([key, amount]) => acquireAddSalvageRewardAmount(env, result, key, amount));
    return result;
  }
  function acquireRollItemSalvageRewards(env, item, options) {
    let replayRewards = typeof env.deps.salvageRecoveryRuntime !== "undefined" ? env.deps.salvageRecoveryRuntime.getReplayRewards(item) : null;
    if (replayRewards) return replayRewards;
    let profile = acquireGetItemSalvageRewardProfile(env, item, options);
    let rewards = {};
    acquireMergeSalvageRewards(env, rewards, profile.guaranteed);
    profile.chances.forEach((row) => {
      if (row && Math.random() < Math.max(0, Math.min(1, Number(row.chance) || 0))) {
        acquireAddSalvageRewardAmount(env, rewards, row.key, row.amount);
      }
    });
    return rewards;
  }
  function acquireGetJewelSalvageShardGain(jewel) {
    if (!jewel) return 0;
    let rarity = jewel.rarity || "normal";
    return rarity === "unique" ? 18 : rarity === "rare" ? 9 : rarity === "magic" ? 5 : 2;
  }

  // modules/domain/equipment-salvage-execution.mjs
  function* acquireSalvageJewelObject(env, owner, jewel, silent) {
    let shardGain = acquireGetJewelSalvageShardGain(jewel);
    if (shardGain <= 0) return 0;
    yield* acquireAwardCurrency(env, owner, "jewelShard", shardGain, "reward");
    if (!silent) yield { kind: "acquisitionLog", args: [env.deps._t("💠 [{name}] 주얼 해체 ({rewards})", { name: env.deps._t(jewel.name), rewards: yield { kind: "acquisitionSalvageText", args: [{ jewelShard: shardGain }] } }), "loot-normal"] };
    return shardGain;
  }
  function* acquireSalvageItemObject(env, owner, item, silent, options) {
    if (!item) return {};
    const jewels = env.deps.equipmentSockets.returnJewels(item, owner);
    if (jewels > 0) yield { kind: "acquisitionLog", args: [env.deps._t("💠 [{name}]에 끼운 주얼 {jewels}개를 가방으로 돌려받았습니다.", { name: env.deps._t(item.name), jewels }), "loot-rare"] };
    let rewards = acquireRollItemSalvageRewards(env, item, options);
    for (const [key, amount] of Object.entries(rewards)) yield* acquireAwardCurrency(env, owner, key, amount, "reward");
    if (typeof env.deps.salvageRecoveryRuntime !== "undefined") env.deps.salvageRecoveryRuntime.record(item, rewards, owner);
    if (!silent) yield { kind: "acquisitionLog", args: [env.deps._t("🧪 <span class='loot-{rarity}'>[{name}]</span> 해체, {rewards}", { rarity: item.rarity, name: env.deps._t(item.name), rewards: yield { kind: "acquisitionSalvageText", args: [rewards] } }), "loot-normal"] };
    return rewards;
  }
  function acquireIsBulkSalvageProtectedItem(env, owner, item) {
    if (!item) return true;
    if (item.locked || env.deps.equipmentLootPolicy.matches(item, owner)) return true;
    return typeof env.deps.equipmentLoadoutRuntime !== "undefined" && env.deps.equipmentLoadoutRuntime.isReferenced(item, owner);
  }
  function* acquireSalvageBagItems(env, owner, targets) {
    const rewards = {}, gone = new Set(targets);
    for (const item of targets) acquireMergeSalvageRewards(env, rewards, yield* acquireSalvageItemObject(env, owner, item, true));
    owner.inventory = owner.inventory.filter((item) => !gone.has(item));
    if (targets.length) yield { kind: "acquisitionEvent", args: ["items-salvaged", { count: targets.length }] };
    return rewards;
  }
  function acquireConfirmedSalvageTargets(env, owner, items) {
    return items.filter((item) => owner.inventory.includes(item) && !acquireIsBulkSalvageProtectedItem(env, owner, item));
  }

  // modules/domain/equipment-acquisition-pickup.mjs
  function acquireGetAcquiredItemAutoEquipSlot(env, owner, item, options) {
    if (options?.skipAutoEquip || item && item.id === owner.starterWeaponTutorialPending) return null;
    return typeof env.deps.tryAutoEquipEmptySlot === "function" ? env.deps.tryAutoEquipEmptySlot(item, owner) : null;
  }
  function* acquireStowBoughtItem(env, owner, item, place = null) {
    if (!(yield* acquireAddItemToInventory(env, owner, item, { ignoreFilter: true, ignoreAutoSalvage: true, skipAutoEquip: true }))) return false;
    env.deps.equipmentInventoryGridRuntime.ensureState(owner);
    if (place) env.deps.equipmentInventoryGridRuntime.placeInventoryItem(env.deps.equipmentInventoryGridRuntime.getItemKey(item), place.column, place.row, owner);
    return true;
  }
  function* acquireStoreEquipmentPickup(env, owner, item, { guaranteedKeep, ignoreAutoSalvage }) {
    const fits = env.deps.canStoreEquipmentItems([item], owner);
    if (!fits && !guaranteedKeep) return yield* acquireSalvageEquipmentPickup(env, owner, item, true);
    if (!ignoreAutoSalvage && owner.settings.autoSalvageEnabled && owner.settings.autoSalvageRarities?.[item.rarity])
      return yield* acquireSalvageEquipmentPickup(env, owner, item, false);
    owner.inventory.push(item);
    return { accepted: true, kind: fits ? "stored" : "protected" };
  }
  function* acquireSalvageEquipmentPickup(env, owner, item, overflow) {
    const rewards = yield* acquireSalvageItemObject(env, owner, item, true, { noDivine: overflow });
    if (overflow && owner.isBackgroundCalculation) acquireCountBackgroundOverflowSalvage(owner);
    return { accepted: false, kind: overflow ? "overflow" : "salvaged", rewards, log: !overflow || !owner.isBackgroundCalculation };
  }
  function acquireCountBackgroundOverflowSalvage(owner) {
    owner.backgroundOverflowSalvageCount = Math.max(0, Math.floor(Number(owner.backgroundOverflowSalvageCount) || 0)) + 1;
  }
  function* acquireAddItemToInventory(env, owner, item, options) {
    env.deps.normalizeItem(item);
    const logLoot = owner.settings.showLootLog;
    const { guaranteedKeep, ignoreFilter, ignoreAutoSalvage } = pickupAdmission(env, owner, item, options);
    let autoEquipSlot = acquireGetAcquiredItemAutoEquipSlot(env, owner, item, options);
    if (autoEquipSlot) {
      yield* acquireRecordEquipmentAcquisition(env, owner, item);
      if (logLoot) yield { kind: "acquisitionLog", args: [env.deps._t("🛡️ 빈 {autoEquipSlot} 슬롯에 자동 장착: <span class='loot-{rarity}'>[{name}]</span>", { autoEquipSlot, rarity: item.rarity, name: env.deps._t(item.name) }), "loot-rare", { item }] };
      yield { kind: "acquisitionUnlocks", args: [] };
      return true;
    }
    if (!ignoreFilter && !acquirePassesItemPickupFilter(env, owner, item)) {
      if (logLoot) yield { kind: "acquisitionLog", args: [env.deps._t("🚫 아이템 필터로 미습득: <span class='loot-{rarity}'>[{name}]</span>", { rarity: item.rarity, name: env.deps._t(item.name) }), "attack-monster"] };
      return false;
    }
    const result = yield* acquireStoreEquipmentPickup(env, owner, item, { guaranteedKeep, ignoreAutoSalvage });
    if (result.accepted) {
      yield* acquireRecordEquipmentAcquisition(env, owner, item);
      yield { kind: "acquisitionUnlocks", args: [] };
    }
    yield* publishPickupResult(env, item, result, logLoot);
    return result.accepted;
  }
  function pickupAdmission(env, owner, item, options) {
    let guaranteedKeep = acquireIsGuaranteedEquipmentPickup(env, owner, item, options), alwaysPicked = env.deps.bagItems.keptOnPickup(item, owner);
    let ignoreFilter = guaranteedKeep || alwaysPicked || !!(options && options.ignoreFilter);
    let ignoreAutoSalvage = guaranteedKeep || alwaysPicked || !!(options && options.ignoreAutoSalvage);
    return { guaranteedKeep, ignoreFilter, ignoreAutoSalvage };
  }
  function* publishPickupResult(env, item, result, logLoot) {
    if (result.kind === "protected") yield { kind: "acquisitionLog", args: [env.deps._t("🎒 인벤토리가 가득 찼지만 [{name}]{particle} 유실 방지를 위해 초과 보관됩니다.", { name: env.deps.getItemDisplayName(item), particle: env.deps.pickParticle(item.name, "은", "는") }), "attack-monster"] };
    else if (logLoot && result.rewards && result.log) {
      const label = result.kind === "overflow" ? "공간 부족 자동해체" : "자동해체";
      yield { kind: "acquisitionLog", args: [`${label}: <span class='loot-${item.rarity}'>[${env.deps._t(item.name)}]</span>, ${yield { kind: "acquisitionSalvageText", args: [result.rewards] }}`, "loot-normal"] };
    }
  }
  function* acquireReceiveJewelDrop(env, owner, jewel) {
    if (env.deps.bagItems.salvagedOnDrop(jewel, owner)) return { jewel, inventoryFull: false, stored: false, protectOverflow: false, shardGain: yield* acquireSalvageJewelObject(env, owner, jewel, true) };
    env.deps.combatLootReceipts.item(owner, jewel, "jewel");
    const added = env.deps.bagItems.addJewel(jewel, owner);
    return { jewel, inventoryFull: added.protectOverflow || !added.stored, ...added };
  }

  // modules/domain/equipment-acquisition.mjs
  function createEquipmentAcquisition(deps) {
    const env = { deps };
    env.PICKUP_EXCEPTIONS = Object.freeze({
      exceptional: (item) => !!item.exceptionalBase,
      fineRare: (item) => item.rarity === "rare" && env.deps.lootMoments.fineLines(item) >= env.deps.LOOT_OMENS.fineRare.good,
      socket: (item) => !!item.voidSocket || Array.isArray(item.sockets) && item.sockets.length > 0,
      corrupted: (item) => !!item.corrupted,
      newUnique: (item, owner) => env.deps.lootMoments.isNewUnique(item, owner),
      influenced: (item) => env.deps.itemInfluences.influenceKeys(item).some((key) => key !== "swapped"),
      ward: (item) => env.deps.colonyWards.isWard(item)
    });
    return Object.freeze({
      resolveCurrencyAward: (...args) => acquireResolveCurrencyAward(env, ...args),
      awardCurrency: (...args) => acquireAwardCurrency(env, ...args),
      commitCurrencyGain: (...args) => acquireCommitCurrencyGain(env, ...args),
      notifyCurrencyAcquisition: acquireNotifyCurrencyAcquisition,
      getUniqueCodexKeyByItem: (...args) => acquireGetUniqueCodexKeyByItem(env, ...args),
      registerUniqueToCodexOnAcquire: (...args) => acquireRegisterUniqueToCodexOnAcquire(env, ...args),
      recordEquipmentAcquisition: (...args) => acquireRecordEquipmentAcquisition(env, ...args),
      passesItemPickupFilter: (...args) => acquirePassesItemPickupFilter(env, ...args),
      isGuaranteedEquipmentPickup: (...args) => acquireIsGuaranteedEquipmentPickup(env, ...args),
      previewEquipmentPickup: (...args) => acquirePreviewEquipmentPickup(env, ...args),
      getAcquiredItemAutoEquipSlot: (...args) => acquireGetAcquiredItemAutoEquipSlot(env, ...args),
      stowBoughtItem: (...args) => acquireStowBoughtItem(env, ...args),
      storeEquipmentPickup: (...args) => acquireStoreEquipmentPickup(env, ...args),
      addItemToInventory: (...args) => acquireAddItemToInventory(env, ...args),
      receiveJewelDrop: (...args) => acquireReceiveJewelDrop(env, ...args),
      isChaseUniqueItem: (...args) => acquireIsChaseUniqueItem(env, ...args),
      getItemSalvageRewardProfile: (...args) => acquireGetItemSalvageRewardProfile(env, ...args),
      mergeSalvageRewards: (...args) => acquireMergeSalvageRewards(env, ...args),
      rollItemSalvageRewards: (...args) => acquireRollItemSalvageRewards(env, ...args),
      getJewelSalvageShardGain: acquireGetJewelSalvageShardGain,
      salvageJewelObject: (...args) => acquireSalvageJewelObject(env, ...args),
      salvageItemObject: (...args) => acquireSalvageItemObject(env, ...args),
      isBulkSalvageProtectedItem: (...args) => acquireIsBulkSalvageProtectedItem(env, ...args),
      salvageBagItems: (...args) => acquireSalvageBagItems(env, ...args),
      confirmedSalvageTargets: (...args) => acquireConfirmedSalvageTargets(env, ...args)
    });
  }

  // modules/domain/equipment-generation-infusion.mjs
  function gearChaosInfusionFitsAffixRoom(env, item, option) {
    const room = env.deps.equipmentCrafting.affixRoom(item, "rare", item.chaosInfusion || null);
    return !room || env.deps.equipmentCrafting.storedAffixKind(item, { id: option.id }) === "special" || room[env.deps.equipmentCrafting.storedAffixKind(item, { id: option.id })] > 0;
  }
  function gearRollChaosInfusionOption(env, option) {
    let min = Number(option && option.min);
    let max = Number(option && option.max);
    if (!Number.isFinite(min)) min = Number(option && option.value) || 0;
    if (!Number.isFinite(max)) max = min;
    if (max < min) {
      let tmp = min;
      min = max;
      max = tmp;
    }
    let val;
    if (env.deps.isTenthStat(option.id)) {
      let minStep = Math.round(min * 10);
      let maxStep = Math.round(max * 10);
      val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
      min = minStep / 10;
      max = maxStep / 10;
    } else {
      min = Math.floor(min);
      max = Math.floor(max);
      val = min + Math.floor(Math.random() * (max - min + 1));
    }
    return { id: option.id, val, valMin: min, valMax: max, tier: 5, statName: env.deps.getStatName(option.id), temporary: true, source: "chaosInfuser", sourceOptionId: option.optionId || option.id };
  }
  function gearGetChaosInfuserOption(env, optionId) {
    return env.deps.CHAOS_INFUSER_OPTIONS.find((opt) => (opt.optionId || opt.id) === optionId || opt.id === optionId) || null;
  }
  function gearGetChaosInfuserOptionsForItem(env, item) {
    let slot = item && item.slot ? item.slot.replace(/[12]/, "") : "";
    let occupied = env.deps.getItemOccupiedExplicitModIds(item);
    return env.deps.CHAOS_INFUSER_OPTIONS.filter((opt) => (!opt.slots || opt.slots.includes(slot)) && env.deps.isDefenseTypeStatAllowed(item, opt.id) && (!occupied.has(opt.id) || item && item.chaosInfusion && item.chaosInfusion.id === opt.id)).filter((opt) => !item || gearChaosInfusionFitsAffixRoom(env, item, opt));
  }
  function gearIsChaosInfusionEligibleItem(env, item) {
    if (!item) return { ok: false, reason: env.deps._t("아이템 미선택") };
    if (item.corrupted) return { ok: false, reason: env.deps._t("타락된 아이템에는 혼돈 주입을 할 수 없습니다.") };
    if (item.rarity === "unique") return { ok: false, reason: env.deps._t("고유 아이템에는 혼돈 주입을 할 수 없습니다.") };
    if (item.rarity === "normal" || item.rarity === "magic") return { ok: false, reason: env.deps._t("일반/마법 등급 아이템에는 혼돈 주입을 할 수 없습니다.") };
    if (item.rarity !== "rare") return { ok: false, reason: env.deps._t("희귀 장비에만 혼돈 주입을 할 수 있습니다.") };
    return infusionLineCapacity(env, item);
  }
  function infusionLineCapacity(env, item) {
    let explicitCount = env.deps.getItemExplicitOptionCount(item);
    if (!item.chaosInfusion && explicitCount >= env.deps.EXPLICIT_AFFIX_LINE_CAP) return { ok: false, reason: env.deps._t("추가 옵션 6줄 제한에 걸려 더 주입할 수 없습니다.") };
    if (item.chaosInfusion && explicitCount > env.deps.EXPLICIT_AFFIX_LINE_CAP) return { ok: false, reason: env.deps._t("추가 옵션이 6줄을 초과했습니다. 기존 주입을 제거하세요.") };
    return { ok: true, reason: env.deps._t("사용 가능") };
  }
  function gearGetChaosInfusionCost(option, item) {
    if (!option) return null;
    let costs = [{ key: option.currency, amount: option.cost }];
    if (item && item.chaosInfusion) costs.push({ key: "blightSpore", amount: 1 });
    return costs;
  }

  // modules/domain/equipment-mod-selection.mjs
  function gearPickWeightedMod(mods) {
    if (!Array.isArray(mods) || mods.length === 0) return null;
    let totalWeight = mods.reduce((sum, mod) => sum + Math.max(0.01, Number(mod.weight) || 1), 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < mods.length; i++) {
      let weight = Math.max(0.01, Number(mods[i].weight) || 1);
      if (roll < weight) return mods[i];
      roll -= weight;
    }
    return mods[mods.length - 1];
  }
  function gearPickRandomMods(env, mods, count, room, weigh) {
    let pool = Array.isArray(mods) ? mods.slice() : [];
    const left = room && { ...room };
    let picks = [];
    let wanted = Math.max(0, Math.floor(count || 0));
    while (picks.length < wanted) {
      if (left) pool = pool.filter((mod) => env.deps.equipmentCrafting.fitsRoom(left, mod));
      let picked = gearPickWeightedMod(weigh ? weigh(pool, picks) : pool);
      if (!picked) break;
      picks.push(picked);
      if (left && env.deps.equipmentCrafting.affixKind(picked) !== "special") left[env.deps.equipmentCrafting.affixKind(picked)]--;
      const occupied = new Set(env.deps.getExplicitModStatIds(picked));
      pool = pool.filter((mod) => !env.deps.getExplicitModStatIds(mod).some((id) => occupied.has(id)));
    }
    return picks;
  }

  // modules/domain/equipment-generation-rerolls.mjs
  function gearRerollChaosInfusionForItem(env, item, previousInfusion, side = "") {
    if (!item || !previousInfusion) return null;
    let pool = gearGetChaosInfuserOptionsForItem(env, item).filter((option2) => !side || env.deps.equipmentCrafting.storedAffixKind(item, option2) === side);
    if (pool.length === 0) {
      item.chaosInfusion = null;
      return null;
    }
    let option = env.deps.rndChoice(pool);
    item.chaosInfusion = gearRollChaosInfusionOption(env, option);
    return item.chaosInfusion;
  }
  function gearRerollLineRoll(env, options, maxTier) {
    if (options.rollLine) return options.rollLine;
    let minTier = env.deps.clampNumber(Math.floor(Number(options.minTier) || 1), 1, maxTier);
    let falloff = Number(options.tierWeightFalloff);
    return minTier > 1 || Number.isFinite(falloff) ? (mod) => env.deps.rollAffixValueInTierRange(mod, minTier, maxTier, falloff) : (mod) => env.deps.rollAffixValue(mod, maxTier);
  }
  function gearPrepareExplicitReroll(env, item, options) {
    const side = options.side || "", onSide = (stat) => !side || env.deps.equipmentCrafting.storedAffixKind(item, stat) === side;
    let rerollChaosInfusion = !!options.rerollChaosInfusion && (!item.chaosInfusion || onSide(item.chaosInfusion));
    const previousInfusion = item.chaosInfusion;
    if (rerollChaosInfusion) item.chaosInfusion = null;
    let locked = (item.stats || []).filter((stat) => env.deps.equipmentCrafting.keptOnReroll(item, stat) || !onSide(stat));
    item.stats = locked.concat(options.guaranteedStat ? [options.guaranteedStat] : []);
    if (rerollChaosInfusion) gearRerollChaosInfusionForItem(env, item, previousInfusion, side);
    return side;
  }
  function gearRerollExplicitMods(env, item, rarity, zoneTier, options = {}) {
    const maxTier = Math.max(1, zoneTier), rollLine = gearRerollLineRoll(env, options, maxTier);
    const side = gearPrepareExplicitReroll(env, item, options);
    let count = 0;
    if (rarity === "magic") count = Math.random() < 0.5 ? 1 : 2;
    if (rarity === "rare") count = 4 + Math.floor(Math.random() * 2);
    count = Math.max(0, count - env.deps.getItemExplicitOptionCount(item));
    let mods = gearPickRandomMods(env, env.deps.getAvailableMods(item).filter((mod) => !side || env.deps.equipmentCrafting.affixKind(mod) === side), count, env.deps.equipmentCrafting.affixRoom(item, rarity), options.weigh);
    mods.forEach((mod) => item.stats.push(rollLine(mod)));
    env.deps.updateItemName(item);
  }

  // modules/domain/equipment-generation-bases.mjs
  function gearChooseItemBase(env, slot, zoneTier, zone, weaponCategory) {
    const zoneRealm = zone.type === "chaosRealm" ? "chaos" : zone.type === "underworld" ? "underworld" : zone.type === "cosmos" ? "cosmos" : null;
    let candidates = env.deps.BASE_ITEM_DB.filter((base) => {
      if (base.slot !== slot || (base.dropOnly?.minTier ?? base.reqTier) > zoneTier) return false;
      if (base.realmBase && base.realmBase !== zoneRealm) return false;
      return baseMatchesDropLocation(base, zone);
    });
    if (candidates.length === 0) candidates = env.deps.BASE_ITEM_DB.filter((base) => base.slot === slot && !base.realmBase);
    candidates = env.deps.keepWeaponCategoryBases(candidates, weaponCategory);
    let weights = candidates.map((base) => env.deps.getBaseDropWeight(base, zoneTier));
    let totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return env.deps.rndChoice(candidates);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }
  function baseMatchesDropLocation(base, zone) {
    if (!base.dropOnly) return true;
    if (base.dropOnly.type && zone.type !== base.dropOnly.type) return false;
    if (base.dropOnly.id && zone.id !== base.dropOnly.id) return false;
    if (base.dropOnly.minFloor && Math.floor(zone.floor || 0) < base.dropOnly.minFloor) return false;
    return true;
  }
  function gearCreateItemFromBase(env, base, rarity, zoneTier, origin) {
    const id = env.deps.allocateItemId();
    origin = origin && typeof origin === "object" ? origin : {};
    const dropRealm = typeof origin.dropRealm === "string" ? origin.dropRealm : null;
    const affixTierCap = env.deps.clampNumber(Math.floor(Number(origin.affixTierCap) || Math.min(15, Math.max(1, Number(zoneTier) || 1))), 1, 20);
    const affixTierFloor = env.deps.clampNumber(Math.floor(Number(origin.affixTierFloor) || 1), 1, affixTierCap);
    let item = {
      id,
      slot: base.slot,
      baseId: base.id,
      baseName: base.name,
      name: base.name,
      rarity,
      blockBaseVersion: 1,
      itemTier: zoneTier,
      hiddenTier: Math.max(1, Math.floor(Number(zoneTier) || 1)),
      affixTierCap,
      itemLevel: env.deps.levelProgression.tierLevel(zoneTier),
      requirementsVersion: 1,
      dropRealm,
      dropRegion: env.deps.normalizeDropRegion(origin.dropRegion),
      baseStats: env.deps.rollBaseStats(base, zoneTier),
      stats: []
    };
    if (rarity === "magic" || rarity === "rare") gearRerollExplicitMods(env, item, rarity, affixTierCap, {
      minTier: affixTierFloor,
      tierWeightFalloff: origin.tierWeightFalloff,
      weigh: origin.weigh
    });
    return item;
  }
  function gearBoostItemStatValue(env, statId, value, factor) {
    if (env.deps.isTenthStat(statId)) return Math.round(value * factor * 10) / 10;
    return Math.max(1, Math.floor(value * factor));
  }
  function gearBoostExceptionalBaseLine(env, item, stat) {
    let max = Number.isFinite(stat.baseRollMax) ? stat.baseRollMax : Number.isFinite(stat.valMax) ? stat.valMax : Number(stat.val) || 0;
    stat.val = gearBoostItemStatValue(env, stat.id, max, 1.2);
    stat.exceptional = true;
    let names = item.baseStats.filter((row) => row && row.exceptional).map((row) => env.deps._t(row.statName || env.deps.getStatName(row.id)));
    item.exceptionalBase = true;
    item.exceptionalStatNames = names;
    item.exceptionalStatName = names.join(", ");
    item.exceptionalAllLines = names.length === item.baseStats.length;
  }
  function gearMaybeApplyExceptionalBase(env, item) {
    if (!item || !Array.isArray(item.baseStats) || item.baseStats.length === 0) return item;
    item.baseStats.forEach((stat) => {
      if (stat && Math.random() < 0.01) gearBoostExceptionalBaseLine(env, item, stat);
    });
    return item;
  }

  // modules/domain/equipment-generation-uniques.mjs
  function gearGetUniqueStatRollRange(env, stat) {
    let min = stat.min !== void 0 ? stat.min : stat.base;
    let max = stat.max !== void 0 ? stat.max : stat.base;
    if (max < min) max = min;
    if (env.deps.isTenthStat(stat.id)) return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
    return { min: Math.floor(min), max: Math.floor(max) };
  }
  function gearRollUniqueStatValue(env, stat) {
    let { min, max } = gearGetUniqueStatRollRange(env, stat);
    if (env.deps.isTenthStat(stat.id)) {
      let minStep = Math.round(min * 10);
      let maxStep = Math.round(max * 10);
      return { min, max, val: (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10 };
    }
    return { min, max, val: min + Math.floor(Math.random() * (max - min + 1)) };
  }
  function gearGetChaseUniqueChance(env, zone) {
    return 16e-4 * (typeof env.deps.atlasMaps === "object" ? env.deps.atlasMaps.chaseMul(zone) : 1);
  }
  function gearUniqueDropsInZone(env, unique, zone, owner) {
    if (!env.deps.contentProgression.canDropUnique(unique, owner)) return false;
    if (!unique.dropOnly) return true;
    return gearUniqueDropRegionMatches(unique.dropOnly, zone);
  }
  function gearUniqueDropRegionMatches(dropOnly, zone) {
    if (dropOnly.type && zone.type !== dropOnly.type) return false;
    if (dropOnly.id && zone.id !== dropOnly.id) return false;
    if (dropOnly.minFloor && Math.floor(zone.floor || 0) < dropOnly.minFloor) return false;
    return true;
  }
  function gearGetFairyRingUniquePools(env, item, zone, owner) {
    const tier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || 1));
    const fits = (unique) => unique.slots.includes(item.slot) && gearUniqueDropsInZone(env, unique, zone, owner) && env.deps.uniqueMeetsTier(unique, tier);
    return { tier, chase: env.deps.UNIQUE_DB.filter((unique) => unique.ultraRare && fits(unique)), normal: env.deps.UNIQUE_DB.filter((unique) => !unique.ultraRare && fits(unique)) };
  }
  function* gearGenerateUniqueItem(env, zoneTier, preferredSlot, forcedUniqueName, ...selection) {
    const [zone, owner] = selection;
    let forcedUnique = env.deps.UNIQUE_DB.find((unique2) => unique2.name === (env.deps.RENAMED_UNIQUES[forcedUniqueName] || forcedUniqueName));
    if (forcedUnique && !env.deps.contentProgression.canDropUnique(forcedUnique, owner)) return null;
    let slot = forcedUnique?.slots?.[0] || preferredSlot || env.deps.rndChoice(env.deps.EQUIPMENT_DROP_SLOTS);
    const { unique, canRollChase } = rollUniqueDefinition(env, zoneTier, slot, forcedUnique, { zone, owner });
    const item = createUniqueEquipment(env, unique, zoneTier);
    initializeUniqueAbyssSockets(env, item);
    unique.stats.forEach((stat) => appendUniqueStat(env, item, stat));
    if (unique.ultraRare && canRollChase) {
      gearRecordChaseUniqueOwnership(owner, unique.name);
      yield { kind: "equipmentLog", args: [env.deps._t("🌠 체이싱 유니크 발견! [{name}]", { name: env.deps._t(unique.name) }), "loot-unique"] };
    }
    gearMaybeApplyExceptionalBase(env, item);
    return env.deps.levelProgression.stampItem(item);
  }
  function rollUniqueDefinition(env, zoneTier, slot, forcedUnique, { zone, owner }) {
    let canDropUniqueInZone = (unique2) => gearUniqueDropsInZone(env, unique2, zone, owner);
    let meetsUniqueTier = (unique2) => env.deps.uniqueMeetsTier(unique2, zoneTier);
    let normalOptions = env.deps.UNIQUE_DB.filter((unique2) => !unique2.ultraRare && canDropUniqueInZone(unique2));
    let chaseOptions = env.deps.UNIQUE_DB.filter((unique2) => unique2.ultraRare && canDropUniqueInZone(unique2) && meetsUniqueTier(unique2));
    let canRollChase = !forcedUnique && chaseOptions.length > 0 && Math.random() < gearGetChaseUniqueChance(env, zone);
    let poolSource = canRollChase ? chaseOptions : normalOptions;
    let options = poolSource.filter((unique2) => unique2.slots.includes(slot) && meetsUniqueTier(unique2));
    if (options.length === 0) options = poolSource.filter(meetsUniqueTier);
    if (options.length === 0) options = poolSource.length > 0 ? poolSource : env.deps.UNIQUE_DB.filter(canDropUniqueInZone);
    let unique = forcedUnique || env.deps.rndChoice(options);
    return { unique, canRollChase };
  }
  function createUniqueEquipment(env, unique, zoneTier) {
    let uniqueTier = unique.reqTier || zoneTier;
    let base = env.deps.BASE_ITEM_DB.find((row) => row.id === env.deps.UNIQUE_EQUIPMENT_RULES[unique.name].baseId);
    const id = env.deps.allocateItemId();
    return {
      id,
      slot: unique.slots[0],
      baseId: base.id,
      baseName: base.name,
      name: unique.name,
      rarity: "unique",
      uniqueEquipmentVersion: 1,
      blockBaseVersion: 1,
      itemTier: uniqueTier,
      hiddenTier: uniqueTier,
      baseStats: env.deps.rollBaseStats(base, uniqueTier),
      stats: [],
      uniqueEffect: unique.uniqueEffect || "",
      uniqueEffectKey: unique.uniqueEffectKey || "",
      uniqueEffectParams: unique.uniqueEffectParams ? JSON.parse(JSON.stringify(unique.uniqueEffectParams)) : null
    };
  }
  function initializeUniqueAbyssSockets(env, item) {
    if (item.uniqueEffectKey !== "abyssSocketOnItem" && item.uniqueEffectKey !== "abyssSocketAndJewelAmp") return;
    let p = item.uniqueEffectParams || {};
    let min = Math.max(1, Math.floor(Number(p.min || p.socketsMin || 1)));
    let max = Math.max(min, Math.floor(Number(p.max || p.socketsMax || 2)));
    let count = min + Math.floor(Math.random() * (max - min + 1));
    item.abyssSockets = Array.from({ length: count }, () => ({ jewel: null }));
    if (item.uniqueEffectKey === "abyssSocketAndJewelAmp") rollUniqueJewelAmplification(env, item, p, count);
  }
  function rollUniqueJewelAmplification(env, item, p, count) {
    let ampMin = Math.max(1, Math.floor(Number(p.ampMin || 1)));
    let ampMax = Math.max(ampMin, Math.floor(Number(p.ampMax || 100)));
    p.ampPct = ampMin + Math.floor(Math.random() * (ampMax - ampMin + 1));
    item.uniqueEffectParams = p;
    item.uniqueEffect = env.deps._t("심연 주얼 슬롯 ({count})개, 장착 심연 주얼 효과 +{ampPct}%", { count, ampPct: p.ampPct });
  }
  function appendUniqueStat(env, item, stat) {
    let rolled = gearRollUniqueStatValue(env, stat);
    let boost = 1;
    let val = env.deps.isTenthStat(stat.id) ? Math.round(rolled.val * boost * 10) / 10 : Math.floor(rolled.val * boost);
    let min = env.deps.isTenthStat(stat.id) ? Math.round(rolled.min * boost * 10) / 10 : Math.floor(rolled.min * boost);
    let max = env.deps.isTenthStat(stat.id) ? Math.round(rolled.max * boost * 10) / 10 : Math.floor(rolled.max * boost);
    item.stats.push({ id: stat.id, val, valMin: min, valMax: max, tier: 0, statName: env.deps.getStatName(stat.id) });
  }
  function gearRecordChaseUniqueOwnership(owner, name) {
    owner.seasonChaseUniqueDrops = Array.isArray(owner.seasonChaseUniqueDrops) ? owner.seasonChaseUniqueDrops : [];
    if (!owner.seasonChaseUniqueDrops.includes(name)) owner.seasonChaseUniqueDrops.push(name);
    owner.seasonChaseUniqueDropped = owner.seasonChaseUniqueDrops.length > 0;
  }

  // modules/domain/equipment-generation-drops.mjs
  function gearApplyEncroachmentToItem(item, sourceFloor) {
    if (!item || item.rarity === "unique" || item.encroached) return item;
    item.encroached = {
      liberated: false,
      sourceFloor: Math.max(1, Math.floor(sourceFloor || 1)),
      pendingOptions: [],
      chosen: null
    };
    return item;
  }
  function gearGetEncroachmentDropChance(enemy) {
    if (!enemy) return 0;
    if (enemy.isBoss) return 0.1;
    if (enemy.isElite) return 0.04;
    return 0.012;
  }
  function gearMaybeApplyChaosRealmEncroachment(item, enemy, zone) {
    if (!item || !zone || zone.type !== "chaosRealm" || item.rarity === "unique") return item;
    if (Math.random() >= gearGetEncroachmentDropChance(enemy)) return item;
    gearApplyEncroachmentToItem(item, Math.max(1, Math.floor(zone.floor || 1)));
    return item;
  }
  function gearGetEquipmentDropRegion(env, zone, state) {
    if (!zone || zone.type !== "atlasMap" || !env.deps.contentProgression.holds("regionAffix", state)) return null;
    return env.deps.normalizeDropRegion(zone.atlasRegion);
  }
  function gearMaybeApplyDroppedFossilExclusiveAffix(env, item, enemy, zoneTier, owner) {
    if (!env.deps.contentProgression.isUnlocked("fossilRestore", owner) || !item || item.rarity === "unique") return item;
    let chance = fossilAffixChance(enemy);
    if (Math.random() >= chance) return item;
    let pool = typeof env.deps.getFossilExclusivePool === "function" ? env.deps.getFossilExclusivePool(item) : env.deps.FOSSIL_EXCLUSIVE_MODS.filter((mod) => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return item;
    return appendDroppedFossilAffix(env, item, pool, zoneTier);
  }
  function fossilAffixChance(enemy) {
    return enemy && enemy.isBoss ? 0.12 : enemy && enemy.isElite ? 0.06 : 0.018;
  }
  function appendDroppedFossilAffix(env, item, pool, zoneTier) {
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length >= env.deps.EXPLICIT_AFFIX_LINE_CAP) item.stats.pop();
    let tierRange = env.deps.getDroppedAffixTierRange(zoneTier);
    let roll = env.deps.rollAffixValueInTierRange(
      gearPickWeightedMod(pool),
      tierRange.min,
      tierRange.max,
      env.deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF
    );
    roll.fossilExclusiveDrop = true;
    item.stats.push(roll);
    if (item.rarity === "normal") item.rarity = "magic";
    env.deps.updateItemName(item);
    return item;
  }
  function gearGetEquipmentDropSlot(env, options, zone) {
    if (env.deps.EQUIPMENT_DROP_SLOTS.includes(options?.slot)) return options.slot;
    const weights = env.deps.lootOmens.slotWeights(zone);
    if (!weights) return env.deps.rndChoice(env.deps.EQUIPMENT_DROP_SLOTS);
    let roll = Math.random() * env.deps.EQUIPMENT_DROP_SLOTS.reduce((sum, slot) => sum + (weights[slot] || 1), 0);
    return env.deps.EQUIPMENT_DROP_SLOTS.find((slot) => (roll -= weights[slot] || 1) < 0) || env.deps.EQUIPMENT_DROP_SLOTS[env.deps.EQUIPMENT_DROP_SLOTS.length - 1];
  }
  function* gearGenerateEquipmentDrop(env, enemy, options, owner) {
    let zone = options && options.zone ? options.zone : env.deps.getZone(owner.currentZoneId) || {};
    const itemLevel = env.deps.levelProgression.itemLevel(zone, enemy);
    let hiddenTierCap = Math.min(env.deps.getRealmEquipmentHiddenTierCap(zone), env.deps.levelProgression.maxDropTier(itemLevel));
    let dropTier = Math.min(env.deps.rollRealmItemDropTier(zone, enemy), env.deps.levelProgression.maxDropTier(itemLevel));
    let affixTierCap = Math.min(env.deps.levelProgression.affixCap(itemLevel), env.deps.getRealmEquipmentAffixTierCap(zone, dropTier));
    let affixTierRange = env.deps.getDroppedAffixTierRange(affixTierCap);
    let slot = gearGetEquipmentDropSlot(env, options, zone);
    let base = gearChooseItemBase(env, slot, dropTier, zone, env.deps.getRootMonsterWeapon(enemy));
    let rarity = env.deps.getEquipmentDropRarity(enemy, Math.random());
    if (rarity === "unique") return env.deps.levelProgression.stampItem(yield* gearGenerateUniqueItem(env, hiddenTierCap, slot, null, zone, owner), itemLevel);
    let minimumRarity = options && ["normal", "magic", "rare"].includes(options.minimumRarity) ? options.minimumRarity : null;
    if (minimumRarity && env.deps.getRarityRank(rarity) < env.deps.getRarityRank(minimumRarity)) rarity = minimumRarity;
    let item = gearCreateItemFromBase(env, base, rarity, dropTier, gearGetEquipmentDropOrigin(env, zone, affixTierCap, affixTierRange, options, owner));
    gearMaybeApplyExceptionalBase(env, item);
    env.deps.equipmentSockets.rollDropSocket(item, owner);
    item = gearMaybeApplyDroppedFossilExclusiveAffix(env, item, enemy, dropTier, owner);
    return env.deps.levelProgression.stampItem(env.deps.itemInfluences.onDrop(gearMaybeApplyChaosRealmEncroachment(item, enemy, zone), enemy, zone), itemLevel);
  }
  function gearGetEquipmentDropOrigin(env, zone, affixTierCap, affixTierRange, ...selection) {
    const [options, owner] = selection;
    return {
      dropRealm: zone.type || null,
      dropRegion: gearGetEquipmentDropRegion(env, zone, owner),
      affixTierCap,
      affixTierFloor: affixTierRange.min,
      tierWeightFalloff: env.deps.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF,
      weigh: options && options.weigh
    };
  }

  // modules/domain/jewel-stat-record.mjs
  function gearGetJewelOptionDef(env, statId) {
    return env.deps.JEWEL_OPTION_POOL.find((option) => option.id === statId) || null;
  }
  function gearIsJewelPetiteStat(stat) {
    return !!(stat && stat.petite && !stat.waxBonus);
  }
  function gearGetJewelStatHiddenTier(env, statId, value, valMin, valMax) {
    let min = Number.isFinite(Number(valMin)) ? Number(valMin) : Number(value);
    let max = Number.isFinite(Number(valMax)) ? Number(valMax) : Number(value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 1;
    let ratio = (Number(value) - min) / (max - min);
    ratio = Math.max(0, Math.min(0.999999, ratio));
    return Math.max(1, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, Math.floor(ratio * env.deps.JEWEL_HIDDEN_TIER_COUNT) + 1));
  }
  function gearNormalizeJewelStat(env, stat) {
    if (!stat || !stat.id) return null;
    let option = gearGetJewelOptionDef(env, stat.id);
    let val = Number(stat.val);
    if (!Number.isFinite(val)) val = option ? option.min : 0;
    let valMin = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : option ? option.min : val;
    let valMax = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : option ? option.max : val;
    let tier = Number.isFinite(Number(stat.tier)) ? Math.floor(Number(stat.tier)) : gearGetJewelStatHiddenTier(env, stat.id, val, valMin, valMax);
    tier = Math.max(1, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, tier));
    return { id: stat.id, val, valMin, valMax, tier, petite: !!stat.petite, waxBonus: !!stat.waxBonus };
  }
  function gearCloneJewelStat(env, stat) {
    let normalized = gearNormalizeJewelStat(env, stat);
    return normalized ? { ...normalized } : null;
  }
  function gearGetJewelStats(env, jewel) {
    if (!jewel) return [];
    if (Array.isArray(jewel.stats) && jewel.stats.length > 0) return jewel.stats.map((...args) => gearCloneJewelStat(env, ...args)).filter(Boolean);
    if (jewel.stat && jewel.stat.id) return [gearCloneJewelStat(env, jewel.stat)].filter(Boolean);
    return [];
  }

  // modules/domain/jewel-generation-values.mjs
  function gearRollJewelStat(env, option, tierRange) {
    if (!option) return null;
    const requested = requestedJewelTiers(env, tierRange);
    let ailResIds = /* @__PURE__ */ new Set(["ailResIgnite", "ailResShock", "ailResFreeze", "ailResPoison", "ailResBleed"]);
    if (ailResIds.has(option.id)) return rollJewelAilmentResistance(env, option, tierRange, requested);
    return rollJewelRangeValue(env, option, tierRange, requested);
  }
  function requestedJewelTiers(env, tierRange) {
    let requestedMinTier = tierRange ? Math.max(1, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, Math.floor(Number(tierRange.min) || 1))) : 1;
    let requestedMaxTier = tierRange ? Math.max(requestedMinTier, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, Math.floor(Number(tierRange.max) || requestedMinTier))) : env.deps.JEWEL_HIDDEN_TIER_COUNT;
    return { min: requestedMinTier, max: requestedMaxTier };
  }
  function rollJewelAilmentResistance(env, option, tierRange, requested) {
    let tier = tierRange ? env.deps.pickTierInRangeWeighted(requested.min, requested.max) : 1 + Math.floor(Math.random() * env.deps.JEWEL_HIDDEN_TIER_COUNT);
    let tierRanges = { 1: [12.5, 25], 2: [17, 30], 3: [22, 36], 4: [26, 43], 5: [30, 50] };
    let rng = tierRanges[tier] || [12.5, 50];
    let step = 0.5;
    let slots = Math.max(0, Math.floor((rng[1] - rng[0]) / step + 1e-6));
    let val = rng[0] + Math.floor(Math.random() * (slots + 1)) * step;
    val = Number(val.toFixed(2));
    return gearNormalizeJewelStat(env, { id: option.id, val, valMin: rng[0], valMax: rng[1], tier });
  }
  function jewelRollStep(option, min, max, decimalStep) {
    let hasDecimalRange = !Number.isInteger(Number(min)) || !Number.isInteger(Number(max));
    return Number.isFinite(option.step) && option.step > 0 ? option.step : hasDecimalRange ? decimalStep : 1;
  }
  function rollJewelRangeValue(env, option, tierRange, requested) {
    let step = jewelRollStep(option, option.min, option.max, 0.1);
    let slots = Math.max(0, Math.floor((option.max - option.min) / step + 1e-6));
    let selectedTier = slots > 0 && tierRange ? env.deps.pickTierInRangeWeighted(requested.min, requested.max) : 1;
    let slotStart = tierRange ? Math.ceil((selectedTier - 1) * (slots + 1) / env.deps.JEWEL_HIDDEN_TIER_COUNT) : 0;
    let slotEnd = tierRange ? Math.max(slotStart + 1, Math.ceil(selectedTier * (slots + 1) / env.deps.JEWEL_HIDDEN_TIER_COUNT)) : slots + 1;
    let slotIndex = slotStart + Math.floor(Math.random() * Math.max(1, slotEnd - slotStart));
    let val = option.min + Math.min(slots, slotIndex) * step;
    val = step < 1 || !Number.isInteger(Number(val)) ? Number(val.toFixed(2)) : Math.floor(val);
    let rolled = { id: option.id, val, valMin: option.min, valMax: option.max };
    if (tierRange && slots > 0) rolled.tier = selectedTier;
    return gearNormalizeJewelStat(env, rolled);
  }
  function gearGetJewelDropTierRange(env, zoneTier) {
    let boundedZoneTier = Math.max(1, Math.min(20, Math.floor(Number(zoneTier) || 1)));
    let maxTier = Math.max(1, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, Math.ceil(boundedZoneTier / 4)));
    return { min: Math.max(1, maxTier - 1), max: maxTier };
  }
  function gearMakeFixedJewelStat(env, statId, val) {
    let stat = gearNormalizeJewelStat(env, { id: statId, val, valMin: val, valMax: val, tier: 1 });
    return stat || { id: statId, val, valMin: val, valMax: val, tier: 1 };
  }
  function gearRollJewelPetiteStat(env, rarity, excludeIds) {
    if (rarity !== "magic" && rarity !== "rare") return null;
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let pool = env.deps.JEWEL_PETITE_OPTION_POOL.filter((option2) => !excluded.has(option2.id));
    if (pool.length <= 0) pool = env.deps.JEWEL_PETITE_OPTION_POOL;
    let option = env.deps.rndChoice(pool);
    let range = rarity === "rare" ? option.rare : option.magic;
    let min = range[0];
    let max = range[1];
    let step = jewelRollStep(option, min, max, 0.5);
    let slots = Math.max(0, Math.floor((max - min) / step + 1e-6));
    let val = min + Math.floor(Math.random() * (slots + 1)) * step;
    val = step < 1 || !Number.isInteger(Number(val)) ? Number(val.toFixed(2)) : Math.floor(val);
    let stat = gearNormalizeJewelStat(env, { id: option.id, val, valMin: min, valMax: max, tier: 1, petite: true });
    return stat;
  }

  // modules/domain/jewel-generation-options.mjs
  function gearGetJewelUniqueEffectText(env, jewel) {
    const row = jewel && jewel.uniqueId ? env.deps.UNIQUE_JEWEL_DB.find((entry) => entry.id === jewel.uniqueId) : null;
    return row && row.uniqueEffect || jewel && jewel.uniqueEffect || "";
  }
  function gearGetJewelRollOptionPool(env, excludeIds) {
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let hasSummon = env.deps.JEWEL_OPTION_POOL.some((option) => env.deps.JEWEL_SUMMON_OPTION_IDS.has(option.id) && !excluded.has(option.id));
    let pool = env.deps.JEWEL_OPTION_POOL.filter((option) => !env.deps.JEWEL_SUMMON_OPTION_IDS.has(option.id) && !excluded.has(option.id));
    if (hasSummon) pool.push(env.deps.JEWEL_SUMMON_OPTION_GROUP);
    return pool.length > 0 ? pool : env.deps.JEWEL_OPTION_POOL;
  }
  function gearResolveJewelRollOption(env, option, excludeIds) {
    if (!option || option.id !== env.deps.JEWEL_SUMMON_OPTION_GROUP.id) return option || null;
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let pool = env.deps.JEWEL_OPTION_POOL.filter((row) => env.deps.JEWEL_SUMMON_OPTION_IDS.has(row.id) && !excluded.has(row.id));
    return env.deps.rndChoice(pool.length > 0 ? pool : env.deps.JEWEL_OPTION_POOL.filter((row) => env.deps.JEWEL_SUMMON_OPTION_IDS.has(row.id)));
  }
  function gearRollRandomJewelStat(env, excludeIds, tierRange) {
    let pool = gearGetJewelRollOptionPool(env, excludeIds);
    return gearRollJewelStat(env, gearResolveJewelRollOption(env, env.deps.rndChoice(pool), excludeIds), tierRange);
  }
  function gearRollJewelCraftStats(env, count, keepStats, tierRange) {
    let stats = (keepStats || []).map((...args) => gearCloneJewelStat(env, ...args)).filter(Boolean);
    let usedIds = stats.map((stat) => stat.id);
    while (stats.length < count) {
      let stat = gearRollRandomJewelStat(env, usedIds, tierRange);
      if (!stat) break;
      stats.push(stat);
      usedIds.push(stat.id);
    }
    return stats;
  }

  // modules/domain/jewel-generation-drops.mjs
  function gearGenerateJewelDrop(env, zoneOrTier, odds = null) {
    let tier = zoneOrTier && typeof zoneOrTier === "object" ? env.deps.getRealmEquipmentHiddenTierCap(zoneOrTier) : Math.max(1, Number(zoneOrTier) || 1);
    let dropTierRange = gearGetJewelDropTierRange(env, tier);
    let uniqueChance = odds ? odds.unique : Math.max(3e-3, Math.min(0.03, 2e-3 + tier / 2e3));
    if (Math.random() < uniqueChance) return generateUniqueJewel(env);
    return generateOrdinaryJewel(env, dropTierRange, odds);
  }
  function generateUniqueJewel(env) {
    let pool = env.deps.UNIQUE_JEWEL_DB.filter((v) => !v.ultra);
    let ultraPool = env.deps.UNIQUE_JEWEL_DB.filter((v) => v.ultra);
    let canRollUltra = ultraPool.length > 0;
    let baseRow = pool.length > 0 ? env.deps.rndChoice(pool) : env.deps.rndChoice(env.deps.UNIQUE_JEWEL_DB);
    let row = canRollUltra && Math.random() < 0.08 ? env.deps.rndChoice(ultraPool) : baseRow;
    let uniquePower = 1.1;
    let stats = (row.stats || []).map((st) => {
      let boosted = env.deps.isTenthStat(st.id) ? Math.round(st.val * uniquePower * 10) / 10 : Math.round(st.val * uniquePower);
      return gearMakeFixedJewelStat(env, st.id, boosted);
    });
    let petite = gearRollJewelPetiteStat(env, "rare", stats.map((st) => st.id));
    if (petite) stats.push(petite);
    return { id: env.deps.allocateItemId(), uniqueId: row.id, name: row.name, rarity: "unique", uniqueEffect: row.uniqueEffect || "", hiddenTier: Math.max(1, ...stats.map((st) => st.tier || 1)), stats };
  }
  function generateOrdinaryJewel(env, dropTierRange, odds) {
    let rarity = Math.random() > (odds ? 1 - odds.rare : 0.85) ? "rare" : "magic";
    let lineCount = rarity === "rare" ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 2);
    let stats = gearRollJewelCraftStats(env, lineCount, null, dropTierRange);
    let hiddenTier = stats.length ? Math.max(1, ...stats.map((st) => st.tier || 1)) : 1;
    let name = stats.length ? env.deps._t("{id} 주얼", { id: env.deps.getStatName(stats[0].id) }) : "미가공 주얼";
    return { id: env.deps.allocateItemId(), name, tier: 1, hiddenTier, rarity, stats };
  }

  // modules/domain/equipment-generation.mjs
  function createEquipmentGeneration(deps) {
    const env = { deps };
    return Object.freeze({
      chooseItemBase: (...args) => gearChooseItemBase(env, ...args),
      createItemFromBase: (...args) => gearCreateItemFromBase(env, ...args),
      pickWeightedMod: gearPickWeightedMod,
      pickRandomMods: (...args) => gearPickRandomMods(env, ...args),
      boostExceptionalBaseLine: (...args) => gearBoostExceptionalBaseLine(env, ...args),
      maybeApplyExceptionalBase: (...args) => gearMaybeApplyExceptionalBase(env, ...args),
      rerollChaosInfusionForItem: (...args) => gearRerollChaosInfusionForItem(env, ...args),
      rerollExplicitMods: (...args) => gearRerollExplicitMods(env, ...args),
      chaosInfusionFitsAffixRoom: (...args) => gearChaosInfusionFitsAffixRoom(env, ...args),
      rollChaosInfusionOption: (...args) => gearRollChaosInfusionOption(env, ...args),
      getChaosInfuserOption: (...args) => gearGetChaosInfuserOption(env, ...args),
      getChaosInfuserOptionsForItem: (...args) => gearGetChaosInfuserOptionsForItem(env, ...args),
      isChaosInfusionEligibleItem: (...args) => gearIsChaosInfusionEligibleItem(env, ...args),
      getChaosInfusionCost: gearGetChaosInfusionCost,
      getUniqueStatRollRange: (...args) => gearGetUniqueStatRollRange(env, ...args),
      getChaseUniqueChance: (...args) => gearGetChaseUniqueChance(env, ...args),
      uniqueDropsInZone: (...args) => gearUniqueDropsInZone(env, ...args),
      getFairyRingUniquePools: (...args) => gearGetFairyRingUniquePools(env, ...args),
      generateUniqueItem: (...args) => gearGenerateUniqueItem(env, ...args),
      getEquipmentDropSlot: (...args) => gearGetEquipmentDropSlot(env, ...args),
      generateEquipmentDrop: (...args) => gearGenerateEquipmentDrop(env, ...args),
      getJewelUniqueEffectText: (...args) => gearGetJewelUniqueEffectText(env, ...args),
      getJewelOptionDef: (...args) => gearGetJewelOptionDef(env, ...args),
      rollJewelCraftStats: (...args) => gearRollJewelCraftStats(env, ...args),
      isJewelPetiteStat: gearIsJewelPetiteStat,
      normalizeJewelStat: (...args) => gearNormalizeJewelStat(env, ...args),
      getJewelStats: (...args) => gearGetJewelStats(env, ...args),
      getJewelDropTierRange: (...args) => gearGetJewelDropTierRange(env, ...args),
      generateJewelDrop: (...args) => gearGenerateJewelDrop(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/domain/equipment-save-stats.mjs
  function equipmentSaveMigrateEquipmentProjectileOption(env, stat) {
    if (!stat) return;
    if (stat.id === "projectileExtraShots") {
      stat.id = "projectileExtraChance";
      for (const key of ["val", "valMin", "valMax", "baseRollMin", "baseRollMax", "originalVal"]) {
        if (stat[key] !== null && Number.isFinite(Number(stat[key]))) stat[key] = Number(stat[key]) * 50;
      }
      stat.statName = env.deps.getStatName(stat.id);
    }
    (stat.extraStats || []).forEach(equipmentSaveMigrateEquipmentProjectileOption.bind(void 0, env));
  }
  function equipmentSaveMigrateEquipmentAffixValue(env, stat, mod, preserveValue = stat.affixBalanceVersion >= 1) {
    const tier = Math.max(1, Math.min(mod.tierValues.length, stat.tier || 1));
    const range = mod.tierValues[tier - 1];
    const [min, max] = Array.isArray(range) ? range : [range, range];
    const oldWidth = stat.valMax - stat.valMin;
    const rank = oldWidth > 0 ? Math.max(0, Math.min(1, (stat.val - stat.valMin) / oldWidth)) : 0.5;
    const step = mod.valueStep || (Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01);
    if (!preserveValue) stat.val = Number((min + Math.round(rank * (max - min) / step) * step).toFixed(2));
    Object.assign(stat, {
      valMin: min,
      valMax: max,
      tier,
      valueStep: step,
      fixedValue: !!mod.fixedValue,
      sourceModId: mod.id,
      affixBalanceVersion: mod.affixBalanceVersion,
      statName: mod.statName || env.deps.getStatName(stat.id)
    });
  }
  function equipmentSaveFindStoredEquipmentAffix(env, item, stat) {
    const candidates = env.deps.MOD_DB.filter((mod) => (mod.slots.includes(item.slot) || mod.retiredSlots?.includes(item.slot)) && (mod.statId || mod.id) === stat.id).map((mod) => env.deps.makeDualDefenseAffixMod(item, mod));
    const extraIds = (stat.extraStats || []).map((extra) => extra.id);
    return candidates.find((row) => row.id === stat.sourceModId) || candidates.find((row) => env.deps.getExplicitModStatIds(row).filter((id) => id !== stat.id).every((id) => extraIds.includes(id)) && (row.compound || []).length === extraIds.length);
  }
  function equipmentSaveRefitGemLevelAffix(env, item, stat) {
    if (!stat || stat.affixBalanceVersion >= 3 || !/GemLevel$/.test(stat.id)) return;
    const mod = equipmentSaveFindStoredEquipmentAffix(env, item, stat);
    if (!mod || !(mod.affixBalanceVersion >= 3)) return;
    const tier = Math.max(1, Math.min(mod.tierValues.length, Math.floor(Number(stat.tier) || 1)));
    const value = mod.tierValues[tier - 1][0];
    Object.assign(stat, {
      val: value,
      valMin: value,
      valMax: value,
      tier,
      valueStep: 1,
      fixedValue: false,
      sourceModId: mod.id,
      affixBalanceVersion: mod.affixBalanceVersion
    });
  }
  function equipmentSaveMigrateEquipmentAffixBalance(env, item) {
    [...item.baseStats, ...item.stats, item.underEnchant, item.chaosInfusion].forEach((...args) => equipmentSaveMigrateEquipmentProjectileOption(env, ...args));
    if (item.rarity === "unique") return;
    for (const stat of item.stats.filter((stat2) => !stat2.oceanBenchOptionId && !stat2.isEchoMod)) {
      equipmentSaveRefitGemLevelAffix(env, item, stat);
      if (stat.affixBalanceVersion >= 2 || !stat.tier || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore) continue;
      const mod = equipmentSaveFindStoredEquipmentAffix(env, item, stat);
      if (!mod) continue;
      const preserveValue = stat.affixBalanceVersion >= 1;
      equipmentSaveMigrateEquipmentAffixValue(env, stat, mod);
      (stat.extraStats || []).forEach((extra) => {
        const sub = mod.compound.find((row) => (row.statId || row.id) === extra.id);
        if (sub) equipmentSaveMigrateEquipmentAffixValue(env, extra, sub, preserveValue);
      });
    }
  }
  function equipmentSaveMigrateVowBlockAffix(env, item) {
    if (item.rarity !== "unique" || item.name !== "고요한 맹세") return;
    const stat = item.stats.find((row) => row.id === "blockChancePct" && row.tier === 0 && !row.fusedFromRare);
    if (!stat) return;
    stat.id = "blockChance";
    stat.statName = env.deps.getStatName(stat.id);
    for (const key of ["val", "valMin", "valMax", "baseRollMin", "baseRollMax", "originalVal"]) {
      if (Number.isFinite(stat[key])) stat[key] = Number((stat[key] / 10).toFixed(2));
    }
  }
  function equipmentSaveCoerceFiniteNumber(value, fallback) {
    let num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }
  function normalizeStoredNumericRange(stat) {
    let val = equipmentSaveCoerceFiniteNumber(stat.val, NaN);
    if (!Number.isFinite(val)) val = equipmentSaveCoerceFiniteNumber(stat.value, NaN);
    if (!Number.isFinite(val)) val = equipmentSaveCoerceFiniteNumber(stat.base, NaN);
    if (!Number.isFinite(val)) val = equipmentSaveCoerceFiniteNumber(stat.amount, 0);
    let min = equipmentSaveCoerceFiniteNumber(stat.valMin, NaN);
    if (!Number.isFinite(min)) min = equipmentSaveCoerceFiniteNumber(stat.min, NaN);
    if (!Number.isFinite(min)) min = equipmentSaveCoerceFiniteNumber(stat.base, val);
    let max = equipmentSaveCoerceFiniteNumber(stat.valMax, NaN);
    if (!Number.isFinite(max)) max = equipmentSaveCoerceFiniteNumber(stat.max, NaN);
    if (!Number.isFinite(max)) max = equipmentSaveCoerceFiniteNumber(stat.base, val);
    if (max < min) max = min;
    return { val, min, max };
  }
  function equipmentSaveNormalizeStatRecord(env, stat) {
    if (!stat || !stat.id) return null;
    const { val, min, max } = normalizeStoredNumericRange(stat);
    let normalized = {
      ...stat,
      val,
      valMin: min,
      valMax: max,
      tier: Math.max(0, Math.floor(equipmentSaveCoerceFiniteNumber(stat.tier, 0))),
      statName: stat.statName || env.deps.getStatName(stat.id),
      originalVal: equipmentSaveCoerceFiniteNumber(stat.originalVal ?? NaN, null)
    };
    normalized.craftSource = env.deps.equipmentCrafting.getSource(stat);
    if (Array.isArray(stat.extraStats)) {
      normalized.extraStats = stat.extraStats.map(equipmentSaveNormalizeStatRecord.bind(void 0, env)).filter(Boolean);
      if (normalized.extraStats.length === 0) delete normalized.extraStats;
    }
    return normalized;
  }

  // modules/domain/equipment-save-identity.mjs
  function equipmentSaveSyncStoredUniqueEffect(env, item) {
    if (item.rarity !== "unique") return;
    const source = env.deps.UNIQUE_DB.find((unique) => unique.syncEffectOnLoad && unique.name === item.name);
    if (!source) return;
    item.uniqueEffect = source.uniqueEffect || "";
    item.uniqueEffectKey = source.uniqueEffectKey || "";
    item.uniqueEffectParams = source.uniqueEffectParams ? JSON.parse(JSON.stringify(source.uniqueEffectParams)) : null;
  }
  function equipmentSaveRenameRetiredItemStatIds(env, item) {
    if (!item) return null;
    [item.baseStats, item.stats].forEach((list) => (Array.isArray(list) ? list : []).forEach((stat) => {
      if (!stat || !Object.hasOwn(env.RETIRED_ITEM_STAT_IDS, stat.id)) return;
      stat.id = env.RETIRED_ITEM_STAT_IDS[stat.id];
      stat.statName = env.deps.getStatName(stat.id);
    }));
    if (item.rarity === "unique" && Object.hasOwn(env.deps.RENAMED_UNIQUES, item.name)) item.name = env.deps.RENAMED_UNIQUES[item.name];
    equipmentSaveNormalizeArmGuardIdentity(env, item);
    return item;
  }
  function equipmentSaveNormalizeArmGuardIdentity(env, item) {
    const legacyNames = env.RENAMED_BASE_NAMES_BY_SLOT[item.slot];
    if (!legacyNames) return;
    const previousName = item.baseName || item.name || "";
    const legacy = Object.entries(legacyNames).find(([name]) => name === previousName || name === item.name || String(item.name || "").endsWith(" " + name));
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === (item.baseId || legacy?.[1]));
    if (!base || base.slot !== item.slot) return;
    item.baseId = base.id;
    item.baseName = base.name;
    const oldName = legacy?.[0] || previousName;
    equipmentSaveReplaceArmGuardBaseName(item, oldName, base.name);
    if (env.deps.equipmentCrafting.normalizeImprint(item.imprint)) equipmentSaveReplaceArmGuardBaseName(item.imprint, oldName, base.name);
  }
  function equipmentSaveReplaceArmGuardBaseName(item, previousName, nextName) {
    if (item.rarity === "unique") return;
    if (!item.name || item.name === previousName) item.name = nextName;
    else if (previousName && item.name.endsWith(" " + previousName)) item.name = item.name.slice(0, -previousName.length) + nextName;
  }
  function equipmentSaveMigrateEquipmentBlockBases(env, item) {
    if (item.blockBaseVersion >= 1 || !["무기", "방패"].includes(item.slot)) return;
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === item.baseId || row.slot === item.slot && row.name === item.baseName);
    if (!base) return;
    equipmentSaveMigrateVowBlockAffix(env, item);
    const block = base.baseStats.find((stat) => stat.id === "baseBlockChance");
    if (item.slot === "방패" && !block) {
      item.baseStats = item.baseStats.filter((stat) => stat.id !== "baseBlockChance");
      item.exceptionalStatNames = item.baseStats.filter((stat) => stat.exceptional).map((stat) => stat.statName);
      item.exceptionalBase = item.exceptionalStatNames.length > 0;
      item.exceptionalStatName = item.exceptionalStatNames.join(", ");
      item.exceptionalAllLines = item.exceptionalBase && item.exceptionalStatNames.length === item.baseStats.length;
    }
    if (item.slot === "무기" && block && !item.baseStats.some((stat) => stat.id === "baseBlockChance")) item.baseStats.push({ ...env.deps.rollBaseStat(block, 0), originalVal: null });
    item.blockBaseVersion = 1;
  }
  function equipmentSaveRenameAndExpandItemLines(env, item) {
    return equipmentSaveRenameRetiredItemStatIds(env, item) ? env.deps.itemSaveSlim.expandItem(item) : null;
  }

  // modules/domain/equipment-save-bases.mjs
  function equipmentSaveMigrateWeaponBaseDamage(env, item) {
    if (item.slot !== "무기") return;
    if (item.baseStats.every((stat) => stat.baseDamageBalanceVersion >= 1 || !["flatDmg", "spellFlatDmg"].includes(stat.id))) return;
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === item.baseId) || env.deps.BASE_ITEM_DB.find((row) => row.slot === "무기" && row.name === item.baseName);
    if (!base || base.slot !== "무기") return;
    for (const stat of item.baseStats) {
      if (stat.baseDamageBalanceVersion >= 1) continue;
      const definition = base.baseStats.find((row) => row.id === stat.id && row.legacyDamageBase > 0);
      if (definition) equipmentSaveMigrateWeaponBaseDamageStat(stat, definition);
    }
  }
  function equipmentSaveMigrateWeaponBaseDamageStat(stat, definition) {
    const oldMin = Math.max(1, Math.floor(definition.legacyDamageBase * 0.8));
    const oldMax = Math.max(oldMin, Math.floor(definition.legacyDamageBase * 1.2));
    const nextMin = Math.max(1, Math.floor(definition.base * 0.8));
    const nextMax = Math.max(nextMin, Math.floor(definition.base * 1.2));
    const convert = (value) => {
      if (value > oldMax) return Math.floor(value * nextMax / oldMax);
      if (value < oldMin) return Math.floor(value * nextMin / oldMin);
      const rank = oldMax > oldMin ? (value - oldMin) / (oldMax - oldMin) : 0.5;
      return nextMin + Math.round(rank * (nextMax - nextMin));
    };
    stat.val = convert(stat.val);
    if (Number.isFinite(stat.originalVal)) stat.originalVal = convert(stat.originalVal);
    Object.assign(stat, {
      valMin: nextMin,
      valMax: nextMax,
      baseRollMin: nextMin,
      baseRollMax: nextMax,
      baseDamageBalanceVersion: 1
    });
  }
  function equipmentSaveMigrateUniqueBaseStat(env, stat, old) {
    const width = old ? old.valMax - old.valMin : 0;
    const percentile = width > 0 ? env.deps.clampNumber((old.val - old.valMin) / width, 0, 1) : 0.5;
    const rolled = env.deps.rollBaseStat(stat, percentile);
    const result = { ...old, ...rolled, originalVal: null };
    if (!old) return result;
    const convert = (value) => {
      if (value <= old.valMax || old.valMax <= 0) {
        return env.deps.rollBaseStat(stat, width > 0 ? env.deps.clampNumber((value - old.valMin) / width, 0, 1) : 0.5).val;
      }
      const valueScale = env.deps.getBaseStatRollRange(stat).usesDecimalRoll ? 10 : 1;
      return Math.floor(rolled.valMax * value / old.valMax * valueScale) / valueScale;
    };
    result.val = convert(old.val);
    if (Number.isFinite(old.originalVal)) result.originalVal = convert(old.originalVal);
    return result;
  }
  function equipmentSaveMigrateUniqueBaseStats(env, item, base) {
    const remaining = item.baseStats.filter((stat) => stat.id !== "flaskUtilSlots");
    return base.baseStats.map((stat) => {
      const index = Math.max(0, remaining.findIndex((row) => row.id === stat.id));
      return equipmentSaveMigrateUniqueBaseStat(env, stat, remaining.splice(index, 1)[0]);
    });
  }
  function equipmentSaveMigrateUniqueEquipmentIdentity(env, item) {
    if (item.uniqueEquipmentVersion === 1) return;
    const rule = item.rarity === "unique" && env.deps.UNIQUE_EQUIPMENT_RULES[item.name];
    if (!rule) return;
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === rule.baseId);
    item.uniqueEquipmentVersion = 1;
    if (item.baseId === base.id && item.slot === base.slot) return;
    if (equipmentSaveHasLegacyUniqueBaseUpgrade(env, item, base.slot)) return;
    item.uniqueBaseLegacy ?? (item.uniqueBaseLegacy = {
      baseId: item.baseId,
      baseName: item.baseName,
      slot: item.slot,
      baseStats: JSON.parse(JSON.stringify(item.baseStats))
    });
    item.baseStats = equipmentSaveMigrateUniqueBaseStats(env, item, base);
    item.baseId = base.id;
    item.baseName = base.name;
    item.slot = base.slot;
    item.exceptionalStatNames = item.baseStats.filter((stat) => stat.exceptional).map((stat) => stat.statName);
    item.exceptionalBase = item.exceptionalStatNames.length > 0;
    item.exceptionalStatName = item.exceptionalStatNames.join(", ");
    item.exceptionalAllLines = item.exceptionalBase && item.exceptionalStatNames.length === item.baseStats.length;
  }
  function equipmentSaveHasLegacyUniqueBaseUpgrade(env, item, slot) {
    const previous = env.deps.BASE_ITEM_DB.find((base) => base.id === item.baseId);
    return previous && previous.slot === slot && item.slot === slot && item.itemTier > item.hiddenTier && previous.reqTier === item.itemTier;
  }
  function equipmentSaveNormalizeBelt(env, item) {
    item.baseStats = item.baseStats.filter((stat) => !stat || stat.id !== "flaskUtilSlots");
    if (typeof env.deps.colonyWards === "object") env.deps.colonyWards.stampBelt(item);
  }

  // modules/domain/equipment-save-record.mjs
  function equipmentSaveNormalizeItem(env, item) {
    if (!equipmentSaveRenameAndExpandItemLines(env, item)) return null;
    if (typeof env.deps.bagItems === "object" && env.deps.bagItems.ownShape(item)) return env.deps.bagItems.normalize(item);
    equipmentSaveNormalizeItemStatCollections(env, item);
    equipmentSaveNormalizeItemAbyssSockets(env, item);
    equipmentSaveNormalizeItemCorruptionSocket(item);
    item.chaosInfusion = item.chaosInfusion ? equipmentSaveNormalizeStatRecord(env, item.chaosInfusion) : null;
    if ("imprint" in item && !env.deps.equipmentCrafting.normalizeImprint(item.imprint)) delete item.imprint;
    equipmentSaveNormalizeItemEncroachment(env, item);
    item.rarity = item.rarity || "magic";
    item.hiddenTier = Math.max(1, Math.floor(equipmentSaveCoerceFiniteNumber(item.hiddenTier, equipmentSaveCoerceFiniteNumber(item.itemTier, 1), 1)));
    equipmentSaveMigrateUniqueEquipmentIdentity(env, item);
    equipmentSaveMigrateEquipmentBlockBases(env, item);
    equipmentSaveNormalizeItemTierLimits(env, item);
    if (item.slot === "허리띠") equipmentSaveNormalizeBelt(env, item);
    normalizeEquipmentNames(item);
    equipmentSaveSyncStoredUniqueEffect(env, item);
    item.locked = !!item.locked;
    equipmentSaveMigrateWeaponBaseDamage(env, item);
    equipmentSaveMigrateEquipmentAffixBalance(env, item);
    equipmentSaveNormalizeItemHallFlags(item);
    if (!item.id) item.id = env.deps.allocateItemId();
    return env.deps.levelProgression.stampItem(item);
  }
  function normalizeEquipmentNames(item) {
    item.baseName = item.baseName || item.name || "알 수 없는 장비";
    item.name = item.name || item.baseName;
  }
  function equipmentSaveNormalizeItemStatCollections(env, item) {
    item.baseStats = Array.isArray(item.baseStats) ? item.baseStats.map((...args) => equipmentSaveNormalizeStatRecord(env, ...args)).filter(Boolean) : [];
    item.stats = Array.isArray(item.stats) ? item.stats.map((...args) => equipmentSaveNormalizeStatRecord(env, ...args)).filter(Boolean) : [];
  }
  function equipmentSaveNormalizeItemAbyssSockets(env, item) {
    let abyssCap = env.deps.getAbyssSocketCapacity(item);
    if (abyssCap > 0) {
      item.abyssSockets = Array.isArray(item.abyssSockets) ? item.abyssSockets.slice(0, abyssCap).map((sock) => ({ jewel: sock && typeof sock.jewel === "object" ? sock.jewel : null })) : [];
    } else {
      item.abyssSockets = [];
    }
  }
  function equipmentSaveNormalizeItemCorruptionSocket(item) {
    if (item.corruptionSocket !== void 0) {
      if (item.corruptionSocket && typeof item.corruptionSocket === "object") item.corruptionSocket = { jewel: item.corruptionSocket.jewel && typeof item.corruptionSocket.jewel === "object" ? item.corruptionSocket.jewel : null };
      else delete item.corruptionSocket;
    }
  }
  function equipmentSaveNormalizeItemEncroachment(env, item) {
    if (item.encroached && typeof item.encroached === "object") {
      let pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.map((...args) => equipmentSaveNormalizeStatRecord(env, ...args)).filter(Boolean).slice(0, 3) : [];
      let chosen = item.encroached.chosen ? equipmentSaveNormalizeStatRecord(env, { ...item.encroached.chosen, encroachedFinal: true }) : null;
      item.encroached = {
        liberated: !!item.encroached.liberated && !!chosen,
        sourceFloor: Math.max(1, Math.floor(equipmentSaveCoerceFiniteNumber(item.encroached.sourceFloor, 1))),
        pendingOptions: chosen ? [] : pendingOptions,
        chosen
      };
    } else item.encroached = null;
  }
  function equipmentSaveNormalizeItemTierLimits(env, item) {
    const existingHighAffixTier = item.stats.reduce((max, stat) => Math.max(max, Math.floor(equipmentSaveCoerceFiniteNumber(stat && stat.tier, 0))), 0);
    const storedHighAffixCap = Number.isFinite(Number(item.affixTierCap)) && Number(item.affixTierCap) >= 11;
    const legacyProgressionProvenance = item.dropRealm === "cosmos" || storedHighAffixCap || existingHighAffixTier >= 11;
    item.dropRealm = typeof item.dropRealm === "string" ? item.dropRealm : null;
    env.deps.normalizeItemOrigin(item);
    item.affixTierCap = env.deps.clampNumber(Math.floor(equipmentSaveCoerceFiniteNumber(
      item.affixTierCap,
      legacyProgressionProvenance ? item.hiddenTier : Math.min(10, item.hiddenTier)
    )), 1, legacyProgressionProvenance ? 20 : 10);
  }
  function equipmentSaveNormalizeItemHallFlags(item) {
    item.hallReplica = !!item.hallReplica;
    item.hallRelistBlocked = !!item.hallRelistBlocked;
    if (item.hallReplica) {
      item.locked = true;
      item.tradeLocked = true;
      item.hallSourceId = Math.max(0, Math.floor(equipmentSaveCoerceFiniteNumber(item.hallSourceId, 0)));
      item.hallAppraisalScore = Math.max(0, Math.floor(equipmentSaveCoerceFiniteNumber(item.hallAppraisalScore, 0)));
      item.hallCuratorName = String(item.hallCuratorName || "").slice(0, 24);
    }
  }

  // modules/domain/equipment-normalization.mjs
  function createEquipmentNormalization(deps) {
    const env = { deps };
    env.RETIRED_ITEM_STAT_IDS = Object.freeze({ venomStingerBonus: "poisonDamageMultiplierPct" });
    env.RENAMED_BASE_NAMES_BY_SLOT = Object.freeze({ 방패: env.deps.ARM_GUARD_BASE_LEGACY_NAMES, 무기: env.deps.WEAPON_BASE_LEGACY_NAMES });
    return Object.freeze({
      findStoredEquipmentAffix: (...args) => equipmentSaveFindStoredEquipmentAffix(env, ...args),
      normalizeArmGuardIdentity: (...args) => equipmentSaveNormalizeArmGuardIdentity(env, ...args),
      migrateEquipmentBlockBases: (...args) => equipmentSaveMigrateEquipmentBlockBases(env, ...args),
      normalizeItem: (...args) => equipmentSaveNormalizeItem(env, ...args)
    });
  }

  // modules/domain/equipment-affix-tiers.mjs
  function equipmentAffixGetUniqueCraftTier(env, item) {
    return env.deps.clampNumber(Math.floor(Number(item.hiddenTier || item.itemTier) || 1), 1, 20);
  }
  function equipmentAffixGetItemCraftTier(env, item) {
    if (!item) return 1;
    if (item.rarity === "unique") return equipmentAffixGetUniqueCraftTier(env, item);
    if (Number.isFinite(item.affixTierCap)) return env.deps.clampNumber(Math.floor(item.affixTierCap), 1, item.affixTierCap >= 11 ? 20 : 10);
    const existingHighAffixTier = (Array.isArray(item.stats) ? item.stats : []).reduce((max, stat) => Math.max(max, Math.floor(Number(stat && stat.tier) || 0)), 0);
    if (existingHighAffixTier >= 11) return env.deps.clampNumber(Math.max(existingHighAffixTier, Math.floor(Number(item.hiddenTier) || 1)), 11, 20);
    if (Number.isFinite(item.hiddenTier)) return env.deps.clampNumber(Math.floor(item.hiddenTier), 1, 10);
    if (Number.isFinite(item.itemTier)) return env.deps.clampNumber(Math.floor(item.itemTier), 1, 10);
    return 1;
  }
  function equipmentAffixGetRealmEquipmentHiddenTierCap(env, zone) {
    if (!zone) return 1;
    const cap = env.REALM_EQUIPMENT_TIER_CAPS[zone.type];
    return cap ? cap(zone) : Math.min(15, Math.max(1, Math.floor(Number(zone.tier) || 1)));
  }
  function equipmentAffixGetZoneEquipmentTierCap(env, zone) {
    if (!zone) return 1;
    const itemLevel = env.deps.levelProgression.itemLevel(zone, { isBoss: false, isElite: false });
    return Math.min(equipmentAffixGetRealmEquipmentHiddenTierCap(env, zone), env.deps.levelProgression.maxDropTier(itemLevel));
  }
  function equipmentAffixGetChaosDepthEquipmentTierCap(depth) {
    return Math.min(15, 10 + Math.floor((Math.max(1, Math.floor(Number(depth) || 1)) - 1) / 5));
  }
  function equipmentAffixGetRealmEquipmentAffixTierCap(zone, hiddenTierCap) {
    const itemTier = Math.max(1, Math.floor(Number(hiddenTierCap) || 1));
    return Math.min(zone && ["cosmos", "atlasMap"].includes(zone.type) ? 20 : 15, itemTier);
  }
  function equipmentAffixGetRealmItemDropTierRange(env, zone, enemy) {
    const maxTier = equipmentAffixGetRealmEquipmentHiddenTierCap(env, zone);
    const width = enemy && enemy.isBoss ? 2 : enemy && enemy.isElite ? 3 : 4;
    return { min: Math.max(1, maxTier - width), max: maxTier };
  }
  function equipmentAffixGetDroppedAffixTierRange(env, itemTier) {
    const maxTier = env.deps.clampNumber(Math.floor(Number(itemTier) || 1), 1, 20);
    return { min: 1, max: maxTier };
  }
  function equipmentAffixGetCraftTierRangeForItem(env, item, source) {
    let maxTier = equipmentAffixGetItemCraftTier(env, item);
    if (maxTier < 11) return { min: 1, max: maxTier };
    return { min: source === "spore" ? 9 : 10, max: maxTier };
  }
  function equipmentAffixIsFixedEquipmentAffix(env, stat) {
    if (stat.fixedValue) return true;
    if (!stat.fossilExclusive && !stat.fossilExclusiveDrop && !stat.fossilExclusiveSpore) return false;
    if (stat.fossilExclusive && !stat.tier) return true;
    return env.deps.FOSSIL_EXCLUSIVE_MODS.some((mod) => (mod.statId || mod.id) === stat.id && mod.step === 0);
  }
  function equipmentAffixGetTierDisplayLevel(env, tierValue) {
    return env.deps.clampNumber(Math.max(1, Math.floor(Number(tierValue) || 1)), 1, 20);
  }
  function equipmentAffixGetTierClassName(env, tierValue) {
    return `tier-${equipmentAffixGetTierDisplayLevel(env, tierValue)}`;
  }

  // modules/domain/equipment-base-rolls.mjs
  function equipmentAffixKeepWeaponCategoryBases(env, candidates, weaponCategory) {
    const own = weaponCategory ? candidates.filter((base) => env.deps.getWeaponCategoryOfBase(base.id) === weaponCategory) : [];
    return own.length > 0 ? own : candidates;
  }
  function equipmentAffixIsBaseChainTop(env, base) {
    return env.deps.getBaseChainRank(env.deps.getBaseChainInfo(base)) >= 6 || (base.reqTier || 0) >= 20;
  }
  function equipmentAffixGetBaseDropWeight(env, base, dropTier) {
    const rules2 = env.deps.BASE_DROP_WEIGHTS;
    if (base.dropOnly || base.realmBase) return (base.reqTier || 0) >= 20 ? rules2.contentTop : 1;
    const top = (equipmentAffixIsBaseChainTop(env, base) ? rules2.chainTop : 1) * equipmentAffixGetHorizontalBaseDropShare(env, base);
    return (base.reqTier || 1) < dropTier - rules2.windowTiers ? top * rules2.belowWindow : top;
  }
  function equipmentAffixGetHorizontalBaseDropShare(env, base) {
    const share = env.deps.BASE_DROP_WEIGHTS.horizontal;
    if (!base.family || !share) return 1;
    return Object.hasOwn(share, base.slot) ? share[base.slot] : share.default;
  }
  function equipmentAffixGetBaseStatRollRange(env, stat) {
    let minBase = Number.isFinite(stat.baseMin) ? stat.baseMin : (stat.base || 0) * 0.8;
    let maxBase = Number.isFinite(stat.baseMax) ? stat.baseMax : (stat.base || 0) * 1.2;
    let scale = stat.id === "energyShield" ? 1.5 : 1;
    let scaledMin = minBase * scale;
    let scaledMax = maxBase * scale;
    let usesDecimalRoll = env.deps.isTenthStat(stat.id);
    if (scaledMax > 0) {
      let positiveMinimum = usesDecimalRoll ? 0.1 : 1;
      scaledMin = Math.max(positiveMinimum, scaledMin);
      scaledMax = Math.max(scaledMin, scaledMax);
    }
    return { scaledMin, scaledMax, usesDecimalRoll };
  }
  function equipmentAffixBaseStatRollBounds(env, stat) {
    let { scaledMin, scaledMax, usesDecimalRoll } = equipmentAffixGetBaseStatRollRange(env, stat);
    if (usesDecimalRoll) {
      scaledMin = Math.round(scaledMin * 10) / 10;
      scaledMax = Math.round(scaledMax * 10) / 10;
    } else {
      scaledMin = Math.floor(scaledMin);
      scaledMax = Math.floor(scaledMax);
      if (scaledMax > 0) scaledMin = Math.max(1, scaledMin);
    }
    if (stat.id === "flatDmg") {
      scaledMin = Math.max(1, scaledMin);
      scaledMax = Math.max(scaledMin, scaledMax);
    }
    return { min: scaledMin, max: scaledMax, usesDecimalRoll };
  }
  function equipmentAffixRollBaseStat(env, stat, percentile = Math.random()) {
    const { min, max, usesDecimalRoll } = equipmentAffixBaseStatRollBounds(env, stat);
    let val;
    if (usesDecimalRoll) {
      const minStep = Math.round(min * 10), maxStep = Math.round(max * 10);
      val = Math.min(maxStep, minStep + Math.floor(percentile * (maxStep - minStep + 1))) / 10;
    } else {
      val = Math.min(max, min + Math.floor(percentile * (max - min + 1)));
    }
    if (stat.id === "flatDmg") val = Math.max(1, val);
    return {
      id: stat.id,
      val,
      valMin: min,
      valMax: max,
      baseRollMin: min,
      baseRollMax: max,
      ...stat.legacyDamageBase > 0 ? { baseDamageBalanceVersion: 1 } : {},
      tier: 0,
      statName: env.deps.getStatName(stat.id)
    };
  }
  function equipmentAffixRollBaseStats(env, base) {
    return base.baseStats.map((stat) => equipmentAffixRollBaseStat(env, stat));
  }

  // modules/domain/equipment-affix-values.mjs
  function equipmentAffixGetListedAffixTierRange(env, mod, tier) {
    const effectiveTier = Math.max(1, Math.min(mod.tierValues.length, Math.floor(Number(tier) || 1)));
    const range = mod.tierValues[effectiveTier - 1];
    let min = Array.isArray(range) ? Number(range[0]) : Number(range);
    let max = Array.isArray(range) ? Number(range[1]) : min;
    if (!Number.isFinite(min)) min = Number(mod.base) || 0;
    if (!Number.isFinite(max)) max = min;
    [min, max] = [Math.min(min, max), Math.max(min, max)];
    const step = mod.valueStep >= 1 ? mod.valueStep : equipmentAffixGetAffixRollStep(env, mod.statId || mod.id, [min, max]);
    [min, max] = equipmentAffixSnapAffixRange(min, max, step);
    return { min, max, step, tier: effectiveTier };
  }
  function equipmentAffixGetAffixRollStep(env, statId, values) {
    return env.deps.WHOLE_ROLL_STAT_IDS.includes(statId) || values.every(Number.isInteger) ? 1 : 0.1;
  }
  function equipmentAffixSnapAffixRange(min, max, step) {
    const onStep = (value) => Number((Math.round(value / step + 1e-9) * step).toFixed(1));
    const low = onStep(min);
    return [low, Math.max(low, onStep(max))];
  }
  function equipmentAffixRollSteppedAffixValue(range) {
    if (range.step === 0.1) {
      const minStep = Math.round(range.min * 10);
      return (minStep + Math.floor(Math.random() * (Math.round(range.max * 10) - minStep + 1))) / 10;
    }
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
  }
  function equipmentAffixRollTierValueAffix(env, mod, statId, tier) {
    const { min, max, step: valueStep, tier: effectiveTier } = equipmentAffixGetAffixTierRange(env, mod, statId, tier);
    const val = Number((min + Math.floor(Math.random() * (Math.round((max - min) / valueStep) + 1)) * valueStep).toFixed(2));
    return {
      id: statId,
      val,
      valMin: min,
      valMax: max,
      tier: effectiveTier,
      statName: mod.statName,
      valueStep,
      fixedValue: !!mod.fixedValue,
      sourceModId: mod.id,
      affixBalanceVersion: mod.affixBalanceVersion
    };
  }
  function equipmentAffixRerollStoredAffixValue(env, stat) {
    let min = Number(stat && stat.valMin);
    let max = Number(stat && stat.valMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    if (max < min) {
      let tmp = min;
      min = max;
      max = tmp;
    }
    if (stat.valueStep) {
      const step = stat.valueStep >= 1 ? stat.valueStep : equipmentAffixGetAffixRollStep(env, stat.id, [min, max]);
      [min, max] = equipmentAffixSnapAffixRange(min, max, step);
      Object.assign(stat, { valMin: min, valMax: max, valueStep: step });
      stat.val = Number((min + Math.floor(Math.random() * (Math.round((max - min) / step) + 1)) * step).toFixed(2));
      return;
    }
    if (env.deps.isTenthStat(stat.id)) {
      let minStep = Math.round(min * 10);
      let maxStep = Math.round(max * 10);
      stat.val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
      return;
    }
    let minInt = Math.round(min);
    let maxInt = Math.round(max);
    stat.val = minInt + Math.floor(Math.random() * (maxInt - minInt + 1));
  }
  function equipmentAffixRollCompoundExtraStats(env, mod, tier, roundInteger) {
    if (!mod || !Array.isArray(mod.compound) || mod.compound.length === 0) return null;
    return mod.compound.map((sub) => {
      let subId = sub.statId || sub.id;
      if (Array.isArray(sub.tierValues)) return equipmentAffixRollTierValueAffix(env, sub, subId, tier);
      const range = equipmentAffixGetAffixTierRange(env, sub, subId, tier, roundInteger);
      return { id: subId, val: equipmentAffixRollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier, statName: sub.statName || env.deps.getStatName(subId) };
    });
  }
  function equipmentAffixRollAffixValue(env, mod, maxTier, opts) {
    let roundInteger = !!(opts && opts.roundInteger);
    let statId = mod.statId || mod.id;
    let tier = 1;
    maxTier = env.deps.clampNumber(Math.floor(Number(maxTier) || 1), 1, 20);
    if (Array.isArray(mod.tierValues)) maxTier = Math.min(maxTier, mod.tierValues.length);
    while (tier < maxTier && Math.random() < 0.58) tier++;
    let result;
    if (Array.isArray(mod.tierValues)) {
      result = equipmentAffixRollTierValueAffix(env, mod, statId, tier);
    } else {
      const range = equipmentAffixGetAffixTierRange(env, mod, statId, tier, roundInteger);
      result = { id: statId, val: equipmentAffixRollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier, statName: mod.statName, fixedValue: !!mod.fixedValue };
    }
    let extras = equipmentAffixRollCompoundExtraStats(env, mod, result.tier, roundInteger);
    if (extras) result.extraStats = extras;
    return result;
  }
  function equipmentAffixPickTierInRangeWeighted(minTier, maxTier, tierWeightFalloff) {
    minTier = Math.max(1, Math.floor(minTier || 1));
    maxTier = Math.max(minTier, Math.floor(maxTier || minTier));
    let requestedFalloff = Number(tierWeightFalloff);
    let falloff = Number.isFinite(requestedFalloff) ? Math.max(0, requestedFalloff) : 0.85;
    let pool = [];
    for (let tier = minTier; tier <= maxTier; tier++) {
      let dist = tier - minTier;
      let weight = 1 / (1 + dist * falloff);
      pool.push({ tier, weight });
    }
    let total = pool.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      if (roll < pool[i].weight) return pool[i].tier;
      roll -= pool[i].weight;
    }
    return pool[pool.length - 1].tier;
  }
  function equipmentAffixRollRealmItemDropTier(env, zone, enemy) {
    const range = equipmentAffixGetRealmItemDropTierRange(env, zone, enemy);
    return equipmentAffixPickTierInRangeWeighted(range.min, range.max);
  }
  function equipmentAffixRollAffixValueInTierRange(env, mod, minTier, maxTier, tierWeightFalloff) {
    let statId = mod.statId || mod.id;
    minTier = env.deps.clampNumber(Math.floor(Number(minTier) || 1), 1, 20);
    maxTier = env.deps.clampNumber(Math.floor(Number(maxTier) || minTier), minTier, 20);
    if (Array.isArray(mod.tierValues)) {
      maxTier = Math.min(maxTier, mod.tierValues.length);
      minTier = Math.min(minTier, maxTier);
    }
    let tier = equipmentAffixPickTierInRangeWeighted(minTier, maxTier, tierWeightFalloff);
    let result;
    if (Array.isArray(mod.tierValues)) {
      result = equipmentAffixRollTierValueAffix(env, mod, statId, tier);
    } else {
      const range = equipmentAffixGetAffixTierRange(env, mod, statId, tier);
      result = { id: statId, val: equipmentAffixRollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier, statName: mod.statName, fixedValue: !!mod.fixedValue };
    }
    let extras = equipmentAffixRollCompoundExtraStats(env, mod, result.tier, false);
    if (extras) result.extraStats = extras;
    return result;
  }
  function equipmentAffixGetAffixTierRange(env, mod, statId, tier, roundInteger = false) {
    if (Array.isArray(mod.tierValues)) return equipmentAffixGetListedAffixTierRange(env, mod, tier);
    const min = mod.base + tier * mod.step;
    const max = min + mod.step * 1.6;
    if (env.deps.isTenthStat(statId)) {
      return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, step: 0.1, tier };
    }
    const toInt = roundInteger ? Math.round : Math.floor;
    const high = toInt(max);
    return { min: high > 0 ? Math.max(1, toInt(min)) : toInt(min), max: high, step: 1, tier };
  }

  // modules/domain/equipment-affix-identity.mjs
  function equipmentAffixGetImmutableItemSpecialStats(env, item) {
    if (!item) return [];
    const ember = [...Array.isArray(item.emberLines) ? item.emberLines : [], ...typeof env.deps.gardenOils === "object" ? env.deps.gardenOils.lines(item) : []];
    if (!item.encroached || !item.encroached.liberated || !item.encroached.chosen) return ember;
    let stat = item.encroached.chosen;
    return [{ ...stat, statName: env.deps._t("[잠식] {statName}", { statName: stat.statName || env.deps.getStatName(stat.id) }), encroachedFinal: true }, ...ember];
  }
  function equipmentAffixGetItemOccupiedExplicitModIds(env, item) {
    let ids = /* @__PURE__ */ new Set();
    (item && Array.isArray(item.stats) ? item.stats : []).forEach((stat) => {
      if (!stat) return;
      if (stat.id) ids.add(stat.id);
      if (Array.isArray(stat.extraStats)) stat.extraStats.forEach((extra) => {
        if (extra && extra.id) ids.add(extra.id);
      });
    });
    if (item && item.chaosInfusion && item.chaosInfusion.id) ids.add(item.chaosInfusion.id);
    equipmentAffixGetImmutableItemSpecialStats(env, item).forEach((stat) => {
      if (stat && stat.id) ids.add(stat.id);
    });
    return ids;
  }
  function equipmentAffixGetItemExplicitOptionCount(item) {
    if (!item) return 0;
    return (Array.isArray(item.stats) ? item.stats.length : 0) + (item.chaosInfusion ? 1 : 0);
  }
  function equipmentAffixNormalizeItemOrigin(env, item) {
    item.dropRegion = equipmentAffixNormalizeDropRegion(env, item.dropRegion);
    if (typeof env.deps.emberCorruption === "object") env.deps.emberCorruption.normalize(item);
    if (typeof env.deps.gardenOils === "object") env.deps.gardenOils.normalize(item);
    env.deps.itemInfluences.normalizeInfluences(item);
  }
  function equipmentAffixNormalizeDropRegion(env, value) {
    const regions = typeof env.deps.ATLAS === "object" && env.deps.ATLAS && Array.isArray(env.deps.ATLAS.regions) ? env.deps.ATLAS.regions : [];
    return typeof value === "string" && regions.some((row) => row.id === value) ? value : null;
  }
  function equipmentAffixUpdateItemName(item) {
    if (!item) return;
    if (item.rarity === "normal") item.name = item.baseName;
    else if (item.rarity === "magic") item.name = `마법의 ${item.baseName}`;
    else if (item.rarity === "rare") item.name = `희귀한 ${item.baseName}`;
  }
  function equipmentAffixGetExplicitModStatIds(mod) {
    return [mod.statId || mod.id, ...(mod.compound || []).map((sub) => sub.statId || sub.id)];
  }

  // modules/domain/equipment-affix-defense.mjs
  function equipmentAffixGetItemBaseDefenseTypes(item) {
    return new Set((item && Array.isArray(item.baseStats) ? item.baseStats : []).map((stat) => stat && stat.id).filter((id) => id === "armor" || id === "evasion" || id === "energyShield"));
  }
  function equipmentAffixGetPrimaryBaseDefenseType(item) {
    let row = (item && Array.isArray(item.baseStats) ? item.baseStats : []).find((stat) => stat && (stat.id === "armor" || stat.id === "evasion" || stat.id === "energyShield"));
    return row ? row.id : null;
  }
  function equipmentAffixGetDefenseTypeForAffixStat(env, statId) {
    statId = String(statId || "");
    if (env.DEFENSE_TYPE_PCT_STAT[statId]) return statId;
    return env.DEFENSE_PCT_TYPE_STAT[statId] || null;
  }
  function equipmentAffixScaleDefenseCompoundStat(env, source, statId) {
    const scaledRanges = source.tierValues?.map((range) => (Array.isArray(range) ? range : [range, range]).map((value) => Number((value * env.DUAL_DEFENSE_AFFIX_RATIO).toFixed(2))));
    const valueStep = equipmentAffixGetAffixRollStep(env, statId, scaledRanges ? scaledRanges.flat() : []);
    return {
      statId,
      statName: env.deps.getStatName(statId),
      base: (Number(source && source.base) || 0) * env.DUAL_DEFENSE_AFFIX_RATIO,
      step: (Number(source && source.step) || 0) * env.DUAL_DEFENSE_AFFIX_RATIO,
      affixBalanceVersion: source.affixBalanceVersion,
      valueStep,
      tierValues: scaledRanges?.map((range, index) => index === 0 ? range : [Number((scaledRanges[index - 1][1] + valueStep).toFixed(2)), range[1]])
    };
  }
  function equipmentAffixIsPrimaryDualDefenseAffixMod(env, item, mod) {
    let sourceDefenseType = equipmentAffixGetDefenseTypeForAffixStat(env, mod && (mod.statId || mod.id));
    let defenseTypes = equipmentAffixGetItemBaseDefenseTypes(item);
    if (!sourceDefenseType || defenseTypes.size < 2) return true;
    return sourceDefenseType === equipmentAffixGetPrimaryBaseDefenseType(item);
  }
  function equipmentAffixMakeDualDefenseAffixMod(env, item, mod) {
    let statId = mod && (mod.statId || mod.id);
    let sourceDefenseType = equipmentAffixGetDefenseTypeForAffixStat(env, statId);
    let defenseTypes = Array.from(equipmentAffixGetItemBaseDefenseTypes(item));
    if (!sourceDefenseType || defenseTypes.length < 2 || !defenseTypes.includes(sourceDefenseType)) return mod;
    let extras = Array.isArray(mod.compound) ? mod.compound.slice() : [];
    defenseTypes.forEach((type) => {
      if (type === sourceDefenseType) return;
      if (Array.isArray(mod.compound)) {
        extras.push(equipmentAffixScaleDefenseCompoundStat(env, mod, type));
        let ownPct = mod.compound.find((sub) => equipmentAffixGetDefenseTypeForAffixStat(env, sub && (sub.statId || sub.id)) === sourceDefenseType);
        if (ownPct) extras.push(equipmentAffixScaleDefenseCompoundStat(env, ownPct, env.DEFENSE_TYPE_PCT_STAT[type]));
        return;
      }
      if (statId === sourceDefenseType) extras.push(equipmentAffixScaleDefenseCompoundStat(env, mod, type));
      if (statId === env.DEFENSE_TYPE_PCT_STAT[sourceDefenseType]) extras.push(equipmentAffixScaleDefenseCompoundStat(env, mod, env.DEFENSE_TYPE_PCT_STAT[type]));
    });
    if (extras.length === 0) return mod;
    return { ...mod, compound: extras };
  }
  function equipmentAffixIsDefenseTypeStatAllowed(env, item, statId) {
    let defenseSlots = /* @__PURE__ */ new Set(["투구", "갑옷", "장갑", "신발", "방패"]);
    if (!item || item.rarity === "unique" || !defenseSlots.has(item.slot)) return true;
    statId = String(statId || "");
    if (item.slot === "방패" && statId === "blockChancePct") return (item.baseStats || []).some((stat) => stat.id === "baseBlockChance" && stat.val > 0);
    const defenseType = equipmentAffixGetDefenseTypeForAffixStat(env, statId);
    if (!defenseType) return true;
    let baseDefenseTypes = equipmentAffixGetItemBaseDefenseTypes(item);
    return baseDefenseTypes.size <= 0 || baseDefenseTypes.has(defenseType);
  }

  // modules/domain/equipment-affix-pools.mjs
  function equipmentAffixIsKaleidoscopeShieldItem(item) {
    return !!(item && item.rarity === "unique" && item.uniqueEffectKey === "kaleidoscopeShield");
  }
  function equipmentAffixGetAvailableModSlotsForItem(env, item) {
    if (equipmentAffixIsKaleidoscopeShieldItem(item)) return env.deps.EQUIPMENT_DROP_SLOTS.slice();
    return [item && item.slot].filter(Boolean);
  }
  function equipmentAffixIsModForWeaponCategory(mod, weaponCategory) {
    return !mod.weaponCategories || mod.weaponCategories.includes(weaponCategory);
  }
  function equipmentAffixIsModForBaseElement(env, mod, item) {
    if (!mod.baseElements) return true;
    const own = equipmentAffixGetBaseElements(env, item.baseId);
    return own.length === 0 || mod.baseElements.some((element) => own.includes(element));
  }
  function equipmentAffixGetBaseElements(env, baseId) {
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === baseId);
    return Object.entries(env.deps.BASE_ELEMENT_STATS).filter(([, stat]) => (base?.baseStats || []).some((row) => row.id === stat)).map(([element]) => element);
  }
  function equipmentAffixIsModForWeapon(env, mod, weaponCategory, item) {
    return equipmentAffixIsModForWeaponCategory(mod, weaponCategory) && equipmentAffixIsModForBaseElement(env, mod, item);
  }
  function equipmentAffixIsModForDropRegion(mod, region) {
    return !mod.regions || mod.regions.includes(region);
  }
  function equipmentAffixIsModForOrigin(env, mod, item) {
    return equipmentAffixIsModForDropRegion(mod, item.dropRegion) && env.deps.itemInfluences.isModForInfluence(mod, item.influence);
  }
  function equipmentAffixWeighModForWeaponCategory(env, mod, weaponCategory) {
    const off = env.deps.WEAPON_CATEGORY_OFF_MODS.byCategory[weaponCategory];
    if (!off || !off.includes(mod.id)) return mod;
    return { ...mod, weight: (Number(mod.weight) || 1) * env.deps.WEAPON_CATEGORY_OFF_MODS.weight };
  }
  function equipmentAffixHasSummonBaseStat(env, item) {
    return !!(item && Array.isArray(item.baseStats) && item.baseStats.some((stat) => stat && env.AVAILABLE_MOD_SUMMON_STAT_IDS.has(stat.id)));
  }
  function equipmentAffixGetAvailableModPoolKey(env, item) {
    const summonSlot = item.slot === "무기" || item.slot === "반지";
    return [
      item.slot,
      item.rarity === "unique" ? "unique" : "",
      equipmentAffixIsKaleidoscopeShieldItem(item) ? "kaleidoscope" : "",
      env.deps.getWeaponCategoryId(item) || "",
      summonSlot && equipmentAffixHasSummonBaseStat(env, item) ? "summon" : "",
      [...equipmentAffixGetItemBaseDefenseTypes(item)].join("+"),
      equipmentAffixIsDefenseTypeStatAllowed(env, item, "blockChancePct") ? "block" : "",
      item.dropRegion || "",
      item.influence || "",
      equipmentAffixGetBaseElements(env, item.baseId).join("+")
    ].join("|");
  }
  function equipmentAffixGetBlockedAvailableModStats(env, item) {
    const defenseTypes = equipmentAffixGetItemBaseDefenseTypes(item), blocked = /* @__PURE__ */ new Set();
    if (!defenseTypes.has("evasion")) {
      blocked.add("deflectChance");
      blocked.add("deflectDamageReduce");
    }
    if (item.slot === "방패" && !equipmentAffixIsKaleidoscopeShieldItem(item) && !defenseTypes.has("energyShield")) blocked.add("spellGemLevel");
    if ((item.slot === "무기" || item.slot === "반지") && !equipmentAffixHasSummonBaseStat(env, item)) env.AVAILABLE_MOD_SUMMON_STAT_IDS.forEach((id) => blocked.add(id));
    return blocked;
  }
  function equipmentAffixBuildAvailableModPool(env, item) {
    const allowedSlots = equipmentAffixGetAvailableModSlotsForItem(env, item), blocked = equipmentAffixGetBlockedAvailableModStats(env, item), weaponCategory = env.deps.getWeaponCategoryId(item);
    return Object.freeze(env.deps.MOD_DB.filter((mod) => equipmentAffixIsModForWeapon(env, mod, weaponCategory, item) && equipmentAffixIsModForOrigin(env, mod, item) && !blocked.has(mod.statId || mod.id) && equipmentAffixIsDefenseTypeStatAllowed(env, item, mod.statId || mod.id) && equipmentAffixIsPrimaryDualDefenseAffixMod(env, item, mod) && allowedSlots.some((slot) => mod.slots.includes(slot))).map((mod) => {
      const shaped = equipmentAffixMakeDualDefenseAffixMod(env, item, mod);
      return Object.freeze({ mod: equipmentAffixWeighModForWeaponCategory(env, shaped, weaponCategory), statIds: equipmentAffixGetExplicitModStatIds(shaped) });
    }));
  }
  function equipmentAffixGetAvailableMods(env, item) {
    const existing = equipmentAffixGetItemOccupiedExplicitModIds(env, item), key = equipmentAffixGetAvailableModPoolKey(env, item);
    if (!env.availableModPools.has(key)) env.availableModPools.set(key, equipmentAffixBuildAvailableModPool(env, item));
    return env.availableModPools.get(key).filter((row) => !row.statIds.some((id) => existing.has(id))).map((row) => row.mod);
  }
  function equipmentAffixGetOpenAffixMods(env, item, rarity = item.rarity, skip = null) {
    const room = env.deps.equipmentCrafting.affixRoom(item, rarity, skip);
    return equipmentAffixGetAvailableMods(env, item).filter((mod) => env.deps.equipmentCrafting.fitsRoom(room, mod));
  }

  // modules/domain/equipment-affixes.mjs
  function createAffixEnvironment(deps) {
    const env = { deps };
    env.REALM_EQUIPMENT_TIER_CAPS = Object.freeze({
      act: (zone) => Math.min(9, Math.max(1, Math.floor(Number(zone.storyOrder) || Number(zone.id) + 1 || 1))),
      abyss: (zone) => equipmentAffixGetChaosDepthEquipmentTierCap(zone.depth),
      timeRift: (zone) => equipmentAffixGetChaosDepthEquipmentTierCap(zone.equivalentChaosDepth),
      // 전투 tier는 지하계 환산값(첫 지역도 50+)이다. 전리품은 아틀라스에 표시된
      // 1~25 티어를 사용해야 G1~G5가 각각 T16~T20으로 한 단계씩 열린다.
      cosmos: (zone) => Math.min(20, 16 + Math.floor((Math.max(1, Math.floor(Number(zone.lootTier) || Number(zone.tier) || 1)) - 1) / 5)),
      // 세계수 아틀라스: 지도 등급이 오를수록 T15 → T20 (js/atlas.js lootTier).
      atlasMap: (zone) => env.deps.atlas.lootTier(zone.atlasTier)
    });
    env.DEFENSE_TYPE_PCT_STAT = { armor: "armorPct", evasion: "evasionPct", energyShield: "energyShieldPct" };
    env.DEFENSE_PCT_TYPE_STAT = { armorPct: "armor", evasionPct: "evasion", energyShieldPct: "energyShield" };
    env.DUAL_DEFENSE_AFFIX_RATIO = 0.6;
    env.AVAILABLE_MOD_SUMMON_STAT_IDS = /* @__PURE__ */ new Set([
      "summonPctDmg",
      "summonFlatDmg",
      "summonEfficiency",
      "summonHpPct",
      "summonCrit",
      "summonCritDmg",
      "summonAspd",
      "summonCap",
      "summonResPen",
      "summonGemLevel"
    ]);
    env.availableModPools = /* @__PURE__ */ new Map();
    return env;
  }
  function bindAffixTiers(env) {
    return {
      getItemCraftTier: (...args) => equipmentAffixGetItemCraftTier(env, ...args),
      getRealmEquipmentHiddenTierCap: (...args) => equipmentAffixGetRealmEquipmentHiddenTierCap(env, ...args),
      getZoneEquipmentTierCap: (...args) => equipmentAffixGetZoneEquipmentTierCap(env, ...args),
      getChaosDepthEquipmentTierCap: equipmentAffixGetChaosDepthEquipmentTierCap,
      getRealmEquipmentAffixTierCap: equipmentAffixGetRealmEquipmentAffixTierCap,
      getRealmItemDropTierRange: (...args) => equipmentAffixGetRealmItemDropTierRange(env, ...args),
      getDroppedAffixTierRange: (...args) => equipmentAffixGetDroppedAffixTierRange(env, ...args),
      getCraftTierRangeForItem: (...args) => equipmentAffixGetCraftTierRangeForItem(env, ...args),
      isFixedEquipmentAffix: (...args) => equipmentAffixIsFixedEquipmentAffix(env, ...args),
      getTierDisplayLevel: (...args) => equipmentAffixGetTierDisplayLevel(env, ...args),
      getTierClassName: (...args) => equipmentAffixGetTierClassName(env, ...args)
    };
  }
  function bindBaseRolls(env) {
    return {
      keepWeaponCategoryBases: (...args) => equipmentAffixKeepWeaponCategoryBases(env, ...args),
      getBaseDropWeight: (...args) => equipmentAffixGetBaseDropWeight(env, ...args),
      getBaseStatRollRange: (...args) => equipmentAffixGetBaseStatRollRange(env, ...args),
      baseStatRollBounds: (...args) => equipmentAffixBaseStatRollBounds(env, ...args),
      rollBaseStat: (...args) => equipmentAffixRollBaseStat(env, ...args),
      rollBaseStats: (...args) => equipmentAffixRollBaseStats(env, ...args)
    };
  }
  function bindAffixValues(env) {
    return {
      getListedAffixTierRange: (...args) => equipmentAffixGetListedAffixTierRange(env, ...args),
      rollTierValueAffix: (...args) => equipmentAffixRollTierValueAffix(env, ...args),
      rerollStoredAffixValue: (...args) => equipmentAffixRerollStoredAffixValue(env, ...args),
      rollAffixValue: (...args) => equipmentAffixRollAffixValue(env, ...args),
      pickTierInRangeWeighted: equipmentAffixPickTierInRangeWeighted,
      rollRealmItemDropTier: (...args) => equipmentAffixRollRealmItemDropTier(env, ...args),
      rollAffixValueInTierRange: (...args) => equipmentAffixRollAffixValueInTierRange(env, ...args),
      getAffixTierRange: (...args) => equipmentAffixGetAffixTierRange(env, ...args)
    };
  }
  function bindAffixIdentity(env) {
    return {
      getImmutableItemSpecialStats: (...args) => equipmentAffixGetImmutableItemSpecialStats(env, ...args),
      getItemOccupiedExplicitModIds: (...args) => equipmentAffixGetItemOccupiedExplicitModIds(env, ...args),
      getItemExplicitOptionCount: equipmentAffixGetItemExplicitOptionCount,
      normalizeItemOrigin: (...args) => equipmentAffixNormalizeItemOrigin(env, ...args),
      normalizeDropRegion: (...args) => equipmentAffixNormalizeDropRegion(env, ...args),
      updateItemName: equipmentAffixUpdateItemName,
      getExplicitModStatIds: equipmentAffixGetExplicitModStatIds
    };
  }
  function bindAffixDefense(env) {
    return {
      getItemBaseDefenseTypes: equipmentAffixGetItemBaseDefenseTypes,
      makeDualDefenseAffixMod: (...args) => equipmentAffixMakeDualDefenseAffixMod(env, ...args),
      isDefenseTypeStatAllowed: (...args) => equipmentAffixIsDefenseTypeStatAllowed(env, ...args)
    };
  }
  function bindAffixPools(env) {
    return {
      isKaleidoscopeShieldItem: equipmentAffixIsKaleidoscopeShieldItem,
      isModForOrigin: (...args) => equipmentAffixIsModForOrigin(env, ...args),
      buildAvailableModPool: (...args) => equipmentAffixBuildAvailableModPool(env, ...args),
      getAvailableMods: (...args) => equipmentAffixGetAvailableMods(env, ...args),
      getOpenAffixMods: (...args) => equipmentAffixGetOpenAffixMods(env, ...args)
    };
  }
  function createEquipmentAffixRules(deps) {
    const env = createAffixEnvironment(deps);
    return Object.freeze({
      ...bindAffixTiers(env),
      ...bindBaseRolls(env),
      ...bindAffixValues(env),
      ...bindAffixIdentity(env),
      ...bindAffixDefense(env),
      ...bindAffixPools(env)
    });
  }

  // modules/equipment-affixes-classic.mjs
  var CHAOS_INFUSER_OPTIONS = createChaosInfuserOptions(CURRENCY_LEGACY_MERGE);
  var VENOM_STINGER_STAT_IDS = resolveAffixTagList(AFFIX_TAG_LISTS.venomStinger, MOD_DB);
  var ROT_SPORE_STAT_IDS = resolveAffixTagList(AFFIX_TAG_LISTS.rotSpore, MOD_DB);
  var QUALITY_ATTRIBUTE_STAT_GROUPS = Object.fromEntries(Object.entries(AFFIX_TAG_LISTS.quality).map(([mode, rule]) => [mode, resolveAffixTagList(rule, MOD_DB)]));
  var rules = createEquipmentAffixRules({
    get clampNumber() {
      return clampNumber;
    },
    get levelProgression() {
      return levelProgression;
    },
    get FOSSIL_EXCLUSIVE_MODS() {
      return FOSSIL_EXCLUSIVE_MODS;
    },
    get getWeaponCategoryOfBase() {
      return getWeaponCategoryOfBase;
    },
    get getBaseChainRank() {
      return getBaseChainRank;
    },
    get getBaseChainInfo() {
      return getBaseChainInfo;
    },
    get BASE_DROP_WEIGHTS() {
      return BASE_DROP_WEIGHTS;
    },
    get isTenthStat() {
      return isTenthStat;
    },
    get getStatName() {
      return getStatName;
    },
    get WHOLE_ROLL_STAT_IDS() {
      return WHOLE_ROLL_STAT_IDS;
    },
    get gardenOils() {
      return typeof gardenOils === "undefined" ? void 0 : gardenOils;
    },
    get _t() {
      return _t;
    },
    get emberCorruption() {
      return typeof emberCorruption === "undefined" ? void 0 : emberCorruption;
    },
    get itemInfluences() {
      return itemInfluences;
    },
    get ATLAS() {
      return typeof ATLAS === "undefined" ? void 0 : ATLAS;
    },
    get EQUIPMENT_DROP_SLOTS() {
      return EQUIPMENT_DROP_SLOTS;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get BASE_ELEMENT_STATS() {
      return BASE_ELEMENT_STATS;
    },
    get WEAPON_CATEGORY_OFF_MODS() {
      return WEAPON_CATEGORY_OFF_MODS;
    },
    get getWeaponCategoryId() {
      return getWeaponCategoryId;
    },
    get MOD_DB() {
      return MOD_DB;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get atlas() {
      return atlas;
    }
  });
  var normalization = createEquipmentNormalization({
    get getStatName() {
      return getStatName;
    },
    get MOD_DB() {
      return MOD_DB;
    },
    get makeDualDefenseAffixMod() {
      return rules.makeDualDefenseAffixMod;
    },
    get getExplicitModStatIds() {
      return rules.getExplicitModStatIds;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get clampNumber() {
      return clampNumber;
    },
    get rollBaseStat() {
      return rules.rollBaseStat;
    },
    get getBaseStatRollRange() {
      return rules.getBaseStatRollRange;
    },
    get UNIQUE_EQUIPMENT_RULES() {
      return UNIQUE_EQUIPMENT_RULES;
    },
    get colonyWards() {
      return typeof colonyWards === "undefined" ? void 0 : colonyWards;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get RENAMED_UNIQUES() {
      return RENAMED_UNIQUES;
    },
    get itemSaveSlim() {
      return window.GameModules.itemSaveSlim;
    },
    get bagItems() {
      return typeof bagItems === "undefined" ? void 0 : bagItems;
    },
    allocateItemId: () => ++window.GameModules.state.session.itemIdCounter,
    get levelProgression() {
      return levelProgression;
    },
    getAbyssSocketCapacity: (item) => equipmentSockets.getAbyssSocketCapacity(item),
    get normalizeItemOrigin() {
      return rules.normalizeItemOrigin;
    },
    get ARM_GUARD_BASE_LEGACY_NAMES() {
      return ARM_GUARD_BASE_LEGACY_NAMES;
    },
    get WEAPON_BASE_LEGACY_NAMES() {
      return WEAPON_BASE_LEGACY_NAMES;
    }
  });
  var generation = createEquipmentGeneration({
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get keepWeaponCategoryBases() {
      return rules.keepWeaponCategoryBases;
    },
    get rndChoice() {
      return rndChoice;
    },
    get getBaseDropWeight() {
      return rules.getBaseDropWeight;
    },
    allocateItemId: () => ++window.GameModules.state.session.itemIdCounter,
    get clampNumber() {
      return clampNumber;
    },
    get levelProgression() {
      return levelProgression;
    },
    get normalizeDropRegion() {
      return rules.normalizeDropRegion;
    },
    get rollBaseStats() {
      return rules.rollBaseStats;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get getExplicitModStatIds() {
      return rules.getExplicitModStatIds;
    },
    get isTenthStat() {
      return isTenthStat;
    },
    get _t() {
      return _t;
    },
    get getStatName() {
      return getStatName;
    },
    get rollAffixValueInTierRange() {
      return rules.rollAffixValueInTierRange;
    },
    get rollAffixValue() {
      return rules.rollAffixValue;
    },
    get getItemExplicitOptionCount() {
      return rules.getItemExplicitOptionCount;
    },
    get getAvailableMods() {
      return rules.getAvailableMods;
    },
    get updateItemName() {
      return rules.updateItemName;
    },
    get CHAOS_INFUSER_OPTIONS() {
      return CHAOS_INFUSER_OPTIONS;
    },
    get getItemOccupiedExplicitModIds() {
      return rules.getItemOccupiedExplicitModIds;
    },
    get isDefenseTypeStatAllowed() {
      return rules.isDefenseTypeStatAllowed;
    },
    get EXPLICIT_AFFIX_LINE_CAP() {
      return EXPLICIT_AFFIX_LINE_CAP;
    },
    get atlasMaps() {
      return typeof atlasMaps === "undefined" ? void 0 : atlasMaps;
    },
    get contentProgression() {
      return contentProgression;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get uniqueMeetsTier() {
      return uniqueMeetsTier;
    },
    get EQUIPMENT_DROP_SLOTS() {
      return EQUIPMENT_DROP_SLOTS;
    },
    get RENAMED_UNIQUES() {
      return RENAMED_UNIQUES;
    },
    get UNIQUE_EQUIPMENT_RULES() {
      return UNIQUE_EQUIPMENT_RULES;
    },
    get getFossilExclusivePool() {
      return typeof getFossilExclusivePool === "undefined" ? void 0 : getFossilExclusivePool;
    },
    get FOSSIL_EXCLUSIVE_MODS() {
      return FOSSIL_EXCLUSIVE_MODS;
    },
    get getDroppedAffixTierRange() {
      return rules.getDroppedAffixTierRange;
    },
    get DROPPED_AFFIX_TIER_WEIGHT_FALLOFF() {
      return DROPPED_AFFIX_TIER_WEIGHT_FALLOFF;
    },
    get lootOmens() {
      return lootOmens;
    },
    get getZone() {
      return getZone;
    },
    get getRealmEquipmentHiddenTierCap() {
      return rules.getRealmEquipmentHiddenTierCap;
    },
    get rollRealmItemDropTier() {
      return rules.rollRealmItemDropTier;
    },
    get getRealmEquipmentAffixTierCap() {
      return rules.getRealmEquipmentAffixTierCap;
    },
    get getRootMonsterWeapon() {
      return getRootMonsterWeapon;
    },
    get getEquipmentDropRarity() {
      return getEquipmentDropRarity;
    },
    get getRarityRank() {
      return getRarityRank;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get itemInfluences() {
      return itemInfluences;
    },
    get UNIQUE_JEWEL_DB() {
      return UNIQUE_JEWEL_DB;
    },
    get JEWEL_OPTION_POOL() {
      return JEWEL_OPTION_POOL;
    },
    get JEWEL_SUMMON_OPTION_GROUP() {
      return JEWEL_SUMMON_OPTION_GROUP;
    },
    get JEWEL_SUMMON_OPTION_IDS() {
      return JEWEL_SUMMON_OPTION_IDS;
    },
    get JEWEL_HIDDEN_TIER_COUNT() {
      return JEWEL_HIDDEN_TIER_COUNT;
    },
    get pickTierInRangeWeighted() {
      return rules.pickTierInRangeWeighted;
    },
    get JEWEL_PETITE_OPTION_POOL() {
      return JEWEL_PETITE_OPTION_POOL;
    }
  });
  var generationEffects = { get equipmentLog() {
    return addLog.bind(void 0);
  } };
  var production = Object.freeze({
    ...generation,
    chooseItemBase: (slot, tier, zone = getZone(game.currentZoneId) || {}, category) => generation.chooseItemBase(slot, tier, zone, category),
    uniqueDropsInZone: (unique, zone, owner = game) => generation.uniqueDropsInZone(unique, zone, owner),
    getFairyRingUniquePools: (item, zone = getZone(game.currentZoneId) || {}, owner = game) => generation.getFairyRingUniquePools(item, zone, owner),
    generateUniqueItem: (tier, slot, forcedName, zone = getZone(game.currentZoneId) || {}, owner = game) => consumeDomainCommands(generation.generateUniqueItem(tier, slot, forcedName, zone, owner), generationEffects),
    generateEquipmentDrop: (enemy, options) => consumeDomainCommands(generation.generateEquipmentDrop(enemy, options, game), generationEffects)
  });
  var acquisitionRules = createEquipmentAcquisition({
    claimCodexCompletion: (owner) => window.GameModules.lootRules.claimCodexCompletion(owner),
    get getCanonicalCurrencyKey() {
      return getCanonicalCurrencyKey;
    },
    get contentProgression() {
      return contentProgression;
    },
    get currencyExchange() {
      return currencyExchange;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get ensureSkyTowerState() {
      return ensureSkyTowerState;
    },
    get bagItems() {
      return typeof bagItems === "undefined" ? void 0 : bagItems;
    },
    get _t() {
      return _t;
    },
    get freshGearIds() {
      return freshGearIds;
    },
    get uniqueHuntRuntime() {
      return typeof uniqueHuntRuntime === "undefined" ? void 0 : uniqueHuntRuntime;
    },
    get getWeaponCategoryId() {
      return getWeaponCategoryId;
    },
    get equipmentLootPolicy() {
      return equipmentLootPolicy;
    },
    get normalizeItem() {
      return normalization.normalizeItem;
    },
    get tryAutoEquipEmptySlot() {
      return typeof tryAutoEquipEmptySlot === "undefined" ? void 0 : tryAutoEquipEmptySlot;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get pickParticle() {
      return pickParticle;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get getItemCraftTier() {
      return rules.getItemCraftTier;
    },
    get getItemExplicitOptionCount() {
      return rules.getItemExplicitOptionCount;
    },
    get salvageRecoveryRuntime() {
      return typeof salvageRecoveryRuntime === "undefined" ? void 0 : salvageRecoveryRuntime;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get equipmentLoadoutRuntime() {
      return typeof equipmentLoadoutRuntime === "undefined" ? void 0 : equipmentLoadoutRuntime;
    },
    get lootMoments() {
      return lootMoments;
    },
    get LOOT_OMENS() {
      return LOOT_OMENS;
    },
    get itemInfluences() {
      return itemInfluences;
    },
    get colonyWards() {
      return colonyWards;
    }
  });
  var acquisitionEffects = {
    get acquisitionSalvageText() {
      return formatSalvageRewardSummary2.bind(void 0);
    },
    get acquisitionLog() {
      return addLog.bind(void 0);
    },
    get acquisitionUnlocks() {
      return checkUnlocks.bind(void 0);
    },
    get acquisitionEvent() {
      return dispatchRuntimeEvent.bind(void 0);
    },
    acquisitionIsLiveOwner: (owner) => owner === game
  };
  var acquisition = Object.freeze({
    ...acquisitionRules,
    resolveCurrencyAward: (...args) => acquisitionRules.resolveCurrencyAward(game, ...args),
    awardCurrency: (...args) => consumeDomainCommands(acquisitionRules.awardCurrency(game, ...args), acquisitionEffects),
    commitCurrencyGain: (...args) => consumeDomainCommands(acquisitionRules.commitCurrencyGain(game, ...args), acquisitionEffects),
    notifyCurrencyAcquisition: (...args) => consumeDomainCommands(acquisitionRules.notifyCurrencyAcquisition(game, ...args), acquisitionEffects),
    registerUniqueToCodexOnAcquire: (item, owner = game) => consumeDomainCommands(acquisitionRules.registerUniqueToCodexOnAcquire(owner, item), acquisitionEffects),
    recordEquipmentAcquisition: (...args) => consumeDomainCommands(acquisitionRules.recordEquipmentAcquisition(game, ...args), acquisitionEffects),
    passesItemPickupFilter: (...args) => acquisitionRules.passesItemPickupFilter(game, ...args),
    isGuaranteedEquipmentPickup: (...args) => acquisitionRules.isGuaranteedEquipmentPickup(game, ...args),
    previewEquipmentPickup: (...args) => acquisitionRules.previewEquipmentPickup(game, ...args),
    getAcquiredItemAutoEquipSlot: (...args) => acquisitionRules.getAcquiredItemAutoEquipSlot(game, ...args),
    stowBoughtItem: (...args) => consumeDomainCommands(acquisitionRules.stowBoughtItem(game, ...args), acquisitionEffects),
    storeEquipmentPickup: (...args) => consumeDomainCommands(acquisitionRules.storeEquipmentPickup(game, ...args), acquisitionEffects),
    addItemToInventory: (...args) => consumeDomainCommands(acquisitionRules.addItemToInventory(game, ...args), acquisitionEffects),
    receiveJewelDrop: (...args) => consumeDomainCommands(acquisitionRules.receiveJewelDrop(game, ...args), acquisitionEffects),
    salvageJewelObject: (jewel, silent, owner = game) => consumeDomainCommands(acquisitionRules.salvageJewelObject(owner, jewel, silent), acquisitionEffects),
    salvageItemObject: (...args) => consumeDomainCommands(acquisitionRules.salvageItemObject(game, ...args), acquisitionEffects),
    isBulkSalvageProtectedItem: (...args) => acquisitionRules.isBulkSalvageProtectedItem(game, ...args),
    salvageBagItems: (...args) => consumeDomainCommands(acquisitionRules.salvageBagItems(game, ...args), acquisitionEffects),
    confirmedSalvageTargets: (...args) => acquisitionRules.confirmedSalvageTargets(game, ...args)
  });
  var refinementRules = createEquipmentRefinement({
    get getItemExplicitOptionCount() {
      return rules.getItemExplicitOptionCount;
    },
    get EXPLICIT_AFFIX_LINE_CAP() {
      return EXPLICIT_AFFIX_LINE_CAP;
    },
    get getItemOccupiedExplicitModIds() {
      return rules.getItemOccupiedExplicitModIds;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get MOD_DB() {
      return MOD_DB;
    },
    get VENOM_STINGER_STAT_IDS() {
      return VENOM_STINGER_STAT_IDS;
    },
    get isModForOrigin() {
      return rules.isModForOrigin;
    },
    get contentProgression() {
      return contentProgression;
    },
    get getChaosRealmTier() {
      return typeof getChaosRealmTier === "undefined" ? void 0 : getChaosRealmTier;
    },
    get getRealmEquipmentAffixTierCap() {
      return rules.getRealmEquipmentAffixTierCap;
    },
    get getRealmEquipmentHiddenTierCap() {
      return rules.getRealmEquipmentHiddenTierCap;
    },
    get getItemCraftTier() {
      return rules.getItemCraftTier;
    },
    get getAvailableMods() {
      return rules.getAvailableMods;
    },
    get pickRandomMods() {
      return generation.pickRandomMods;
    },
    get rollAffixValueInTierRange() {
      return rules.rollAffixValueInTierRange;
    },
    get QUALITY_ATTRIBUTE_MODES() {
      return QUALITY_ATTRIBUTE_MODES;
    },
    get QUALITY_CATALYST_MODES() {
      return QUALITY_CATALYST_MODES;
    },
    get QUALITY_ATTRIBUTE_LABELS() {
      return QUALITY_ATTRIBUTE_LABELS;
    },
    get QUALITY_ATTRIBUTE_STAT_GROUPS() {
      return QUALITY_ATTRIBUTE_STAT_GROUPS;
    },
    get TAINTED_CRAFT_OUTCOMES() {
      return TAINTED_CRAFT_OUTCOMES;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get rndChoice() {
      return rndChoice;
    },
    get getStatName() {
      return getStatName;
    },
    get getOpenAffixMods() {
      return rules.getOpenAffixMods;
    },
    get pickWeightedMod() {
      return generation.pickWeightedMod;
    },
    get rollAffixValue() {
      return rules.rollAffixValue;
    },
    get updateItemName() {
      return rules.updateItemName;
    },
    get _t() {
      return _t;
    }
  });
  var refinement = Object.freeze({
    ...refinementRules,
    canPayCurrencyCosts: (...args) => refinementRules.canPayCurrencyCosts(game, ...args),
    payCurrencyCosts: (...args) => refinementRules.payCurrencyCosts(game, ...args),
    isChaosInfuserUnlocked: (...args) => refinementRules.isChaosInfuserUnlocked(game, ...args),
    canApplyTaintedOutcome: (...args) => refinementRules.canApplyTaintedOutcome(game, ...args),
    corruptCraftedItem: (...args) => refinementRules.corruptCraftedItem(game, ...args),
    getCosmosBossRelicStatTotals: (...args) => refinementRules.getCosmosBossRelicStatTotals(game, ...args)
  });
  var workshopRules = createEquipmentWorkshop({
    get getCraftSelectionRef() {
      return typeof getCraftSelectionRef === "undefined" ? void 0 : getCraftSelectionRef;
    },
    get isCraftSelectionEquip() {
      return typeof isCraftSelectionEquip === "undefined" ? void 0 : isCraftSelectionEquip;
    },
    get clearCraftSelection() {
      return typeof clearCraftSelection === "undefined" ? void 0 : clearCraftSelection;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get bagItems() {
      return bagItems;
    },
    get getZone() {
      return getZone;
    },
    get generateJewelDrop() {
      return generation.generateJewelDrop;
    },
    get awardCurrency() {
      return acquisitionRules.awardCurrency;
    },
    get _t() {
      return _t;
    },
    get isChaosInfuserUnlocked() {
      return refinementRules.isChaosInfuserUnlocked;
    },
    get contentProgression() {
      return contentProgression;
    },
    get isChaosInfusionEligibleItem() {
      return generation.isChaosInfusionEligibleItem;
    },
    get getChaosInfuserOption() {
      return generation.getChaosInfuserOption;
    },
    get P_STATS() {
      return P_STATS;
    },
    get getChaosInfuserOptionsForItem() {
      return generation.getChaosInfuserOptionsForItem;
    },
    get getChaosInfusionCost() {
      return generation.getChaosInfusionCost;
    },
    get canPayCurrencyCosts() {
      return refinementRules.canPayCurrencyCosts;
    },
    get payCurrencyCosts() {
      return refinementRules.payCurrencyCosts;
    },
    get rollChaosInfusionOption() {
      return generation.rollChaosInfusionOption;
    },
    get getStatName() {
      return getStatName;
    },
    get formatValue() {
      return formatValue;
    },
    get normalizeItem() {
      return normalization.normalizeItem;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get getVenomStingerRefusal() {
      return refinementRules.getVenomStingerRefusal;
    },
    get getVenomStingerMods() {
      return refinementRules.getVenomStingerMods;
    },
    get pickWeightedMod() {
      return generation.pickWeightedMod;
    },
    get rollAffixValue() {
      return rules.rollAffixValue;
    },
    get getItemCraftTier() {
      return rules.getItemCraftTier;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get pickParticle() {
      return pickParticle;
    },
    get isSporeCraftEquipment() {
      return isSporeCraftEquipment;
    },
    get getRotHarvestRefusal() {
      return refinementRules.getRotHarvestRefusal;
    },
    get ROT_SPORE_STAT_IDS() {
      return ROT_SPORE_STAT_IDS;
    },
    get rndChoice() {
      return rndChoice;
    },
    get updateItemName() {
      return rules.updateItemName;
    },
    get stumpBox() {
      return stumpBox;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get getFossilExclusivePool() {
      return typeof getFossilExclusivePool === "undefined" ? void 0 : getFossilExclusivePool;
    },
    get FOSSIL_EXCLUSIVE_MODS() {
      return FOSSIL_EXCLUSIVE_MODS;
    },
    get STUMP_BOX_HARVEST_CRAFT() {
      return STUMP_BOX_HARVEST_CRAFT;
    },
    get rollEncroachmentLiberationOptions() {
      return refinementRules.rollEncroachmentLiberationOptions;
    }
  });
  var workshopEffects = {
    get acquisitionEvent() {
      return acquisitionEffects.acquisitionEvent;
    },
    workshopJewelCreated: (jewel) => notifyRefinedJewel(jewel),
    get workshopCurrencyCosts() {
      return formatCurrencyCosts2.bind(void 0);
    },
    get workshopItemName() {
      return getItemDisplayName.bind(void 0);
    },
    get workshopLog() {
      return addLog.bind(void 0);
    },
    get workshopRefresh() {
      return updateStaticUI.bind(void 0);
    },
    get workshopSave() {
      return queueImportantSave.bind(void 0);
    },
    get workshopShowLiberation() {
      return showEncroachmentLiberationOverlay2.bind(void 0);
    },
    get workshopHideLiberation() {
      return hideEncroachmentLiberationOverlay2.bind(void 0);
    }
  };
  function runSelectedWorkshop(action, args) {
    const reason = workshopRules.getAdmission(game, action);
    if (reason) return workshopEffects.workshopLog(reason, "attack-monster");
    const item = getSelectedCraftItem();
    return consumeDomainCommands(workshopRules[action](game, item, ...args), workshopEffects);
  }
  function notifyRefinedJewel(jewel) {
    const lineText = generation.getJewelStats(jewel).map((stat) => `${generation.isJewelPetiteStat(stat) ? _t("쁘띠 ") : ""}${getStatName(stat.id)} +${formatJewelStatValue2(stat.id, stat.val)}${Number.isFinite(Number(stat.tier)) && !generation.isJewelPetiteStat(stat) ? ` T${Math.floor(stat.tier)}` : ""}`).join(" / ");
    workshopEffects.workshopLog(_t("🎰 주얼 가공: {rarity} [{name}] 획득! ({lineText})", { rarity: getJewelRarityLabel2(jewel.rarity), name: _t(jewel.name), lineText }), jewel.rarity === "unique" ? "loot-unique" : "loot-rare", { item: jewel, itemKind: "jewel" });
  }
  var workshop = Object.freeze({
    destroySelectedCraftItem: (item, owner = game) => workshopRules.destroySelectedCraftItem(owner, item),
    drawJewelRefine: () => consumeDomainCommands(workshopRules.drawJewelRefine(game), workshopEffects),
    liberateSelectedEncroachedItem: (...args) => runSelectedWorkshop("liberateEncroachment", args),
    applyChaosInfusionToSelectedItem: (...args) => runSelectedWorkshop("applyChaosInfusion", args),
    removeChaosInfusionFromSelectedItem: (...args) => runSelectedWorkshop("removeChaosInfusion", args),
    applyEnchantedHoneyToSelectedItem: (...args) => runSelectedWorkshop("applyEnchantedHoney", args),
    applyVenomStingerToSelectedItem: (...args) => runSelectedWorkshop("applyVenomStinger", args),
    applyVoidChiselToSelectedItem: (...args) => runSelectedWorkshop("applyVoidChisel", args),
    applyWoodsmanTouchToSelectedItem: (...args) => runSelectedWorkshop("applyWoodsmanTouch", args),
    applyCorruptSporeToSelectedItem: (...args) => runSelectedWorkshop("applyCorruptSpore", args),
    applyRiftSporeToSelectedItem: (...args) => runSelectedWorkshop("applyRiftSpore", args),
    openEncroachmentLiberationOverlay: (...args) => consumeDomainCommands(workshopRules.openEncroachment(game, ...args), workshopEffects),
    closeEncroachmentLiberationOverlay: (...args) => consumeDomainCommands(workshopRules.closeEncroachment(game, ...args), workshopEffects),
    confirmEncroachmentLiberation: (...args) => consumeDomainCommands(workshopRules.confirmEncroachment(game, ...args), workshopEffects)
  });
  var uiDeps = {
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get bagItems() {
      return bagItems;
    },
    get clearCraftSelection() {
      return clearCraftSelection;
    },
    get confirmedSalvageTargets() {
      return acquisition.confirmedSalvageTargets;
    },
    get craftCurrencyUse() {
      return craftCurrencyUse;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    },
    get document() {
      return document;
    },
    get ensureCraftSelectionValid() {
      return ensureCraftSelectionValid;
    },
    get equipmentLoadoutRuntime() {
      return typeof equipmentLoadoutRuntime === "undefined" ? void 0 : equipmentLoadoutRuntime;
    },
    get equipmentWindowUi() {
      return equipmentWindowUi;
    },
    get formatValue() {
      return formatValue;
    },
    get game() {
      return game;
    },
    get getCraftSelectionRef() {
      return getCraftSelectionRef;
    },
    get getCurrencyInfo() {
      return getCurrencyInfo;
    },
    // Optional legacy hook; the inventory view's own implementation is private.
    get getInventoryRarityFilter() {
      return globalThis.getInventoryRarityFilter;
    },
    get getItemSalvageRewardProfile() {
      return acquisition.getItemSalvageRewardProfile;
    },
    get getJewelOptionDef() {
      return production.getJewelOptionDef;
    },
    get getJewelSalvageShardGain() {
      return acquisition.getJewelSalvageShardGain;
    },
    get getStatName() {
      return getStatName;
    },
    get getStyledOrbName() {
      return getStyledOrbName;
    },
    get getTierClassName() {
      return rules.getTierClassName;
    },
    get getTierDisplayLevel() {
      return rules.getTierDisplayLevel;
    },
    get isBulkSalvageProtectedItem() {
      return acquisition.isBulkSalvageProtectedItem;
    },
    get isCraftSelectionEquip() {
      return isCraftSelectionEquip;
    },
    get mergeSalvageRewards() {
      return acquisition.mergeSalvageRewards;
    },
    get pickParticle() {
      return pickParticle;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get salvageBagItems() {
      return acquisition.salvageBagItems;
    },
    get salvageItemObject() {
      return acquisition.salvageItemObject;
    },
    get salvageJewelObject() {
      return acquisition.salvageJewelObject;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get updateStaticUI() {
      return updateStaticUI;
    }
  };
  var getTierBadgeHtml2 = getTierBadgeHtml.bind(void 0, uiDeps);
  var showEncroachmentLiberationOverlay2 = showEncroachmentLiberationOverlay.bind(void 0, uiDeps);
  var hideEncroachmentLiberationOverlay2 = hideEncroachmentLiberationOverlay.bind(void 0, uiDeps);
  var formatJewelStatValue2 = formatJewelStatValue.bind(void 0, uiDeps);
  var getJewelRarityLabel2 = getJewelRarityLabel.bind(void 0, uiDeps);
  var getJewelRarityClass2 = getJewelRarityClass;
  var salvageJewel2 = salvageJewel.bind(void 0, uiDeps);
  var formatSalvageRewardSummary2 = formatSalvageRewardSummary.bind(void 0, uiDeps);
  var getItemSalvagePreviewText2 = getItemSalvagePreviewText.bind(void 0, uiDeps);
  var salvageItem2 = salvageItem.bind(void 0, uiDeps);
  var syncSalvageControlsFromSettings2 = syncSalvageControlsFromSettings.bind(void 0, uiDeps);
  var toggleAutoSalvage2 = toggleAutoSalvage.bind(void 0, uiDeps);
  var bulkSalvageSelected2 = bulkSalvageSelected.bind(void 0, uiDeps);
  var bulkSalvageAllInventory2 = bulkSalvageAllInventory.bind(void 0, uiDeps);
  var confirmBulkSalvageAll2 = confirmBulkSalvageAll.bind(void 0, uiDeps);
  var useCurrency2 = useCurrency.bind(void 0, uiDeps);
  var formatCurrencyCosts2 = formatCurrencyCosts.bind(void 0, uiDeps);
  function ensureAbyssSockets(item) {
    equipmentSockets.ensureAbyssSockets(item);
  }
  exposeFileGlobals({
    isChaosInfuserUnlocked: refinement.isChaosInfuserUnlocked,
    addItemToInventory: acquisition.addItemToInventory,
    receiveJewelDrop: acquisition.receiveJewelDrop,
    getChaosInfuserOptionsForItem: production.getChaosInfuserOptionsForItem,
    isChaosInfusionEligibleItem: production.isChaosInfusionEligibleItem,
    getChaosInfusionCost: production.getChaosInfusionCost,
    getAffixTierRange: rules.getAffixTierRange,
    getItemExplicitOptionCount: rules.getItemExplicitOptionCount,
    findStoredEquipmentAffix: normalization.findStoredEquipmentAffix,
    normalizeArmGuardIdentity: normalization.normalizeArmGuardIdentity,
    migrateEquipmentBlockBases: normalization.migrateEquipmentBlockBases,
    normalizeItem: normalization.normalizeItem,
    getItemCraftTier: rules.getItemCraftTier,
    getRealmEquipmentHiddenTierCap: rules.getRealmEquipmentHiddenTierCap,
    getZoneEquipmentTierCap: rules.getZoneEquipmentTierCap,
    getChaosDepthEquipmentTierCap: rules.getChaosDepthEquipmentTierCap,
    getRealmEquipmentAffixTierCap: rules.getRealmEquipmentAffixTierCap,
    getRealmItemDropTierRange: rules.getRealmItemDropTierRange,
    getDroppedAffixTierRange: rules.getDroppedAffixTierRange,
    getCraftTierRangeForItem: rules.getCraftTierRangeForItem,
    isFixedEquipmentAffix: rules.isFixedEquipmentAffix,
    getTierClassName: rules.getTierClassName,
    getTierBadgeHtml: getTierBadgeHtml2,
    getUniqueCodexKeyByItem: acquisition.getUniqueCodexKeyByItem,
    registerUniqueToCodexOnAcquire: acquisition.registerUniqueToCodexOnAcquire,
    keepWeaponCategoryBases: rules.keepWeaponCategoryBases,
    getBaseDropWeight: rules.getBaseDropWeight,
    chooseItemBase: production.chooseItemBase,
    baseStatRollBounds: rules.baseStatRollBounds,
    rollBaseStat: rules.rollBaseStat,
    rollBaseStats: rules.rollBaseStats,
    getListedAffixTierRange: rules.getListedAffixTierRange,
    rollTierValueAffix: rules.rollTierValueAffix,
    rerollStoredAffixValue: rules.rerollStoredAffixValue,
    rollAffixValue: rules.rollAffixValue,
    rollRealmItemDropTier: rules.rollRealmItemDropTier,
    rollAffixValueInTierRange: rules.rollAffixValueInTierRange,
    getImmutableItemSpecialStats: rules.getImmutableItemSpecialStats,
    getItemOccupiedExplicitModIds: rules.getItemOccupiedExplicitModIds,
    liberateSelectedEncroachedItem: workshop.liberateSelectedEncroachedItem,
    openEncroachmentLiberationOverlay: workshop.openEncroachmentLiberationOverlay,
    confirmEncroachmentLiberation: workshop.confirmEncroachmentLiberation,
    closeEncroachmentLiberationOverlay: workshop.closeEncroachmentLiberationOverlay,
    getItemBaseDefenseTypes: rules.getItemBaseDefenseTypes,
    isDefenseTypeStatAllowed: rules.isDefenseTypeStatAllowed,
    isKaleidoscopeShieldItem: rules.isKaleidoscopeShieldItem,
    getExplicitModStatIds: rules.getExplicitModStatIds,
    isModForOrigin: rules.isModForOrigin,
    buildAvailableModPool: rules.buildAvailableModPool,
    getAvailableMods: rules.getAvailableMods,
    getOpenAffixMods: rules.getOpenAffixMods,
    updateItemName: rules.updateItemName,
    rerollChaosInfusionForItem: production.rerollChaosInfusionForItem,
    rerollExplicitMods: production.rerollExplicitMods,
    chaosInfusionFitsAffixRoom: production.chaosInfusionFitsAffixRoom,
    canPayCurrencyCosts: refinement.canPayCurrencyCosts,
    payCurrencyCosts: refinement.payCurrencyCosts,
    applyChaosInfusionToSelectedItem: workshop.applyChaosInfusionToSelectedItem,
    removeChaosInfusionFromSelectedItem: workshop.removeChaosInfusionFromSelectedItem,
    applyEnchantedHoneyToSelectedItem: workshop.applyEnchantedHoneyToSelectedItem,
    getVenomStingerRefusal: refinement.getVenomStingerRefusal,
    applyVenomStingerToSelectedItem: workshop.applyVenomStingerToSelectedItem,
    applyVoidChiselToSelectedItem: workshop.applyVoidChiselToSelectedItem,
    applyWoodsmanTouchToSelectedItem: workshop.applyWoodsmanTouchToSelectedItem,
    ensureAbyssSockets,
    createItemFromBase: production.createItemFromBase,
    pickWeightedMod: production.pickWeightedMod,
    pickRandomMods: production.pickRandomMods,
    getUniqueStatRollRange: production.getUniqueStatRollRange,
    getChaseUniqueChance: production.getChaseUniqueChance,
    uniqueDropsInZone: production.uniqueDropsInZone,
    getFairyRingUniquePools: production.getFairyRingUniquePools,
    generateUniqueItem: production.generateUniqueItem,
    getEquipmentDropSlot: production.getEquipmentDropSlot,
    generateEquipmentDrop: production.generateEquipmentDrop,
    boostExceptionalBaseLine: production.boostExceptionalBaseLine,
    maybeApplyExceptionalBase: production.maybeApplyExceptionalBase,
    resolveCurrencyAward: acquisition.resolveCurrencyAward,
    awardCurrency: acquisition.awardCurrency,
    commitCurrencyGain: acquisition.commitCurrencyGain,
    notifyCurrencyAcquisition: acquisition.notifyCurrencyAcquisition,
    getAcquiredItemAutoEquipSlot: acquisition.getAcquiredItemAutoEquipSlot,
    isGuaranteedEquipmentPickup: acquisition.isGuaranteedEquipmentPickup,
    previewEquipmentPickup: acquisition.previewEquipmentPickup,
    stowBoughtItem: acquisition.stowBoughtItem,
    storeEquipmentPickup: acquisition.storeEquipmentPickup,
    recordEquipmentAcquisition: acquisition.recordEquipmentAcquisition,
    passesItemPickupFilter: acquisition.passesItemPickupFilter,
    getJewelUniqueEffectText: production.getJewelUniqueEffectText,
    rollJewelCraftStats: production.rollJewelCraftStats,
    isJewelPetiteStat: production.isJewelPetiteStat,
    formatJewelStatValue: formatJewelStatValue2,
    normalizeJewelStat: production.normalizeJewelStat,
    getJewelDropTierRange: production.getJewelDropTierRange,
    generateJewelDrop: production.generateJewelDrop,
    getJewelStats: production.getJewelStats,
    getJewelRarityLabel: getJewelRarityLabel2,
    getJewelRarityClass: getJewelRarityClass2,
    getJewelSalvageShardGain: acquisition.getJewelSalvageShardGain,
    salvageJewelObject: acquisition.salvageJewelObject,
    destroySelectedCraftItem: workshop.destroySelectedCraftItem,
    drawJewelRefine: workshop.drawJewelRefine,
    salvageJewel: salvageJewel2,
    isChaseUniqueItem: acquisition.isChaseUniqueItem,
    getItemSalvageRewardProfile: acquisition.getItemSalvageRewardProfile,
    mergeSalvageRewards: acquisition.mergeSalvageRewards,
    formatSalvageRewardSummary: formatSalvageRewardSummary2,
    getItemSalvagePreviewText: getItemSalvagePreviewText2,
    rollItemSalvageRewards: acquisition.rollItemSalvageRewards,
    salvageItemObject: acquisition.salvageItemObject,
    salvageItem: salvageItem2,
    syncSalvageControlsFromSettings: syncSalvageControlsFromSettings2,
    toggleAutoSalvage: toggleAutoSalvage2,
    isBulkSalvageProtectedItem: acquisition.isBulkSalvageProtectedItem,
    salvageBagItems: acquisition.salvageBagItems,
    confirmedSalvageTargets: acquisition.confirmedSalvageTargets,
    bulkSalvageSelected: bulkSalvageSelected2,
    bulkSalvageAllInventory: bulkSalvageAllInventory2,
    confirmBulkSalvageAll: confirmBulkSalvageAll2,
    applyCorruptSporeToSelectedItem: workshop.applyCorruptSporeToSelectedItem,
    applyRiftSporeToSelectedItem: workshop.applyRiftSporeToSelectedItem,
    getItemQualityAttributeMode: refinement.getItemQualityAttributeMode,
    getItemQualityAttributeLabel: refinement.getItemQualityAttributeLabel,
    isQualityAttributeStat: refinement.isQualityAttributeStat,
    applyAbyssCatalystToItemQuality: refinement.applyAbyssCatalystToItemQuality,
    getCosmosBossRelicStatTotals: refinement.getCosmosBossRelicStatTotals,
    getAnnulmentRemovableStats: refinement.getAnnulmentRemovableStats,
    canApplyTaintedOutcome: refinement.canApplyTaintedOutcome,
    corruptCraftedItem: refinement.corruptCraftedItem,
    useCurrency: useCurrency2,
    isMarketUnlocked: refinement.isMarketUnlocked
  });
  var equipmentDefinitions = { DROPPED_AFFIX_TIER_WEIGHT_FALLOFF, EQUIPMENT_DROP_SLOTS, CHAOS_INFUSER_OPTIONS, VENOM_STINGER_STAT_IDS, uniqueMeetsTier, freshGearIds, takeFreshGearIds, UNIQUE_JEWEL_DB, JEWEL_SUMMON_OPTION_IDS, JEWEL_SUMMON_OPTION_GROUP, JEWEL_OPTION_POOL, JEWEL_HIDDEN_TIER_COUNT, JEWEL_PETITE_OPTION_POOL, ROT_SPORE_STAT_IDS, QUALITY_ATTRIBUTE_MODES, QUALITY_CATALYST_MODES, QUALITY_ATTRIBUTE_LABELS, QUALITY_ATTRIBUTE_STAT_GROUPS };
  Object.assign(globalThis, equipmentDefinitions);
  safeExposeGlobals(equipmentDefinitions);
  safeExposeGlobals({ formatCurrencyCosts: formatCurrencyCosts2 });
})();
