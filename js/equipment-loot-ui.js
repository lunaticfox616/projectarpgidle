// GENERATED from modules/equipment-loot-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/equipment-loot-view.mjs
  var EquipmentLootView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      for (const name of ["renderPresets", "pickChip", "pickRow", "rarityTierChip", "renderPickup", "renderFx", "togglePick", "renderRuleTargets", "renderRuleAmount", "renderRule", "renderTargets", "renderAutoSalvage", "renderSettings", "saveAndPreview", "previewTargets", "updatePickup", "readRule", "applyPreset", "updateTargets", "addRule", "addTagRule", "removeRule", "renderHighlights", "renderHighlight", "showHighlight"]) this[name] = this[name].bind(this);
      this.rarityNames = this.deps.ITEM_RARITY_LABELS;
      this.host = null;
      this.owner = null;
      this.ALWAYS_CHIPS = Object.freeze([
        ["exceptional", "특출난 베이스", "#9fe0c0"],
        ["fineRare", "상급 옵션 희귀", "#f3d28c"],
        ["socket", "소켓", "#d7a6ff"],
        ["corrupted", "타락", "#e7685c"],
        ["newUnique", "도감에 없는 고유", "#ffb469"],
        ["influenced", "영향 장비", "#ff9a6a"],
        ["ward", "액막이", "#c8b6ff"]
      ]);
      this.BEAM_CHIPS = Object.freeze([["jackpot", "최상급 발견", "#ff6b6b"], ["great", "큰 발견", "#f3d28c"], ["good", "좋은 발견 반짝임", "#e8c27a"]]);
      this.NOTICE_CHIPS = Object.freeze([
        ["chase", "최상급 발견", "#ff6b6b"],
        ["goldenRule", "황금률", "#f7d66a"],
        ["treasure", "보물", "#ffd75e"],
        ["codex", "도감 등록", "#ffb469"],
        ["leaf", "기억의 잎", "#9fe0c0"]
      ]);
    }
    renderPresets() {
      const buttons = Object.entries(this.deps.ITEM_PICKUP_PRESETS).map(([key, preset]) => `<button type="button" data-pickup-preset="${key}" data-tip="${this.deps.escapeHTML(this.deps._t(preset.note))}">${this.deps.escapeHTML(this.deps._t(preset.label))}</button>`).join("");
      const notes = Object.values(this.deps.ITEM_PICKUP_PRESETS).map((preset) => `${this.deps._t(preset.label)}: ${this.deps._t(preset.note)}`).join(" ");
      return `<div class="loot-filter-actions loot-pickup-presets"><span>${this.deps._t("빠른 설정")}</span>${buttons}</div><p class="loot-filter-note">${this.deps.escapeHTML(notes)}</p>`;
    }
    pickChip(group, key, label, tone) {
      const on = this.deps.equipmentLootPolicy.pickGroup(this.deps.game.settings, group)[key] !== false;
      return `<button type="button" class="rarity-filter-chip loot-pick-chip${on ? " active" : ""}"${tone ? ` style="--rarity-color:${tone}"` : ""} aria-pressed="${on}" data-loot-pick="${group}" data-loot-key="${this.deps.escapeHTML(key)}">${this.deps.escapeHTML(this.deps._t(label))}</button>`;
    }
    pickRow(label, chips) {
      return `<div class="loot-pick-row"><span class="loot-pick-label">${label}</span><div class="loot-pick-chips">${chips}</div></div>`;
    }
    rarityTierChip([id, name]) {
      const on = this.deps.game.settings.itemFilterRarities[id] !== false, tier = this.deps.game.settings.itemFilterMinTiers[id];
      return `<span class="loot-pick-rarity"><button type="button" class="rarity-filter-chip rarity-${id}${on ? " active" : ""}" aria-pressed="${on}" data-loot-pick="rarity" data-loot-key="${id}">${this.deps._t(name)}</button><label class="loot-pick-tier">T<input type="number" min="1" max="20" value="${tier}" data-tier="${id}" aria-label="${this.deps._t("{name} 최소 티어", { name: this.deps._t(name) })}" data-loot-change="pickup"></label></span>`;
    }
    renderPickup(open = false) {
      const settings = this.deps.game.settings;
      const slots = this.deps.EQUIPMENT_DROP_SLOTS.map((slot) => this.pickChip("slot", slot, this.deps.getItemSlotDisplayLabel(null, slot))).join("");
      const weapons = Object.entries(this.deps.WEAPON_CATEGORIES).map(([id, row]) => this.pickChip("weapon", id, this.deps._t(row.name))).join("");
      return `<details class="loot-filter-section" id="loot-pickup-config" ${open ? "open" : ""}><summary>${this.deps._t("습득 조건")}</summary>${this.renderPresets()}
            <label><input id="chk-item-filter-enabled" type="checkbox" ${settings.itemFilterEnabled ? "checked" : ""} data-loot-change="pickup">${this.deps._t("습득 조건 사용")}</label>
            <p class="loot-filter-note">${this.deps._t("조건 밖 장비는 줍지 않습니다. 목표 옵션과 추적 중인 고유, 항상 줍기에 맞는 장비는 줍습니다.")}</p>
            ${this.pickRow(this.deps._t("희귀도, 최소 티어"), Object.entries(this.rarityNames).map(this.rarityTierChip).join(""))}
            ${this.pickRow(this.deps._t("부위"), slots)}${this.pickRow(this.deps._t("무기 종류"), weapons)}
            ${this.pickRow(this.deps._t("항상 줍기"), this.ALWAYS_CHIPS.map(([key, label, tone]) => this.pickChip("always", key, label, tone)).join(""))}
            <div class="loot-filter-fields">
            <label>${this.deps._t("추가 옵션 티어 기준")}<input id="inp-item-filter-tier-threshold" type="number" min="1" max="20" value="${settings.itemFilterTierThreshold}" data-loot-change="pickup"></label>
            <label>${this.deps._t("기준 이상 옵션 최소 개수")}<input id="inp-item-filter-tier-count" type="number" min="0" max="6" value="${settings.itemFilterMinTierCount}" data-loot-change="pickup"></label></div>
            <label class="loot-pick-codex"><input id="chk-item-filter-unique-new-codex" type="checkbox" ${settings.itemFilterOnlyNewCodexUnique ? "checked" : ""} data-loot-change="pickup">${this.deps._t("고유는 도감 미등록만 습득")}</label></details>`;
    }
    renderFx() {
      return `<section class="loot-filter-section" id="loot-fx-config"><h3>${this.deps._t("발견 연출")}</h3>
            ${this.pickRow(this.deps._t("빛기둥"), this.BEAM_CHIPS.map(([key, label, tone]) => this.pickChip("beams", key, label, tone)).join(""))}
            ${this.pickRow(this.deps._t("알림"), this.NOTICE_CHIPS.map(([key, label, tone]) => this.pickChip("notices", key, label, tone)).join(""))}</section>`;
    }
    togglePick(group, key) {
      if (!this.settingsCurrent()) return;
      if (!this.deps.equipmentLootPolicy.togglePick(this.owner.settings, group, key)) return;
      const fx = group === "beams" || group === "notices", section = this.deps.document.getElementById(fx ? "loot-fx-config" : "loot-pickup-config");
      if (section) section.outerHTML = fx ? this.renderFx() : this.renderPickup(true);
      this.saveAndPreview();
    }
    renderRuleTargets(rule) {
      const key = this.deps.equipmentLootPolicy.ruleKey(rule);
      const tags = this.deps.equipmentLootPolicy.tagOptions().map((tag) => `<option value="tag:${this.deps.escapeHTML(tag.id)}" ${"tag:" + tag.id === key ? "selected" : ""}>${this.deps._t("{tag} 태그", { tag: this.deps._t(tag.name) })}</option>`).join("");
      const stats = this.deps.equipmentLootPolicy.statOptions().map((stat) => `<option value="${this.deps.escapeHTML(stat.id)}" ${stat.id === key ? "selected" : ""}>${this.deps.escapeHTML(this.deps._t(stat.name))}</option>`).join("");
      return `<optgroup label="${this.deps._t("태그")}">${tags}</optgroup><optgroup label="${this.deps._t("옵션")}">${stats}</optgroup>`;
    }
    renderRuleAmount(rule, index) {
      if (rule.tag) return `<label>${this.deps._t("최소 줄 수")}<input data-field="minCount" type="number" min="1" max="6" value="${rule.minCount}" aria-label="${this.deps._t("최소 줄 수")} ${index + 1}" data-loot-change="targets"></label>`;
      return `<label>${this.deps._t("최소 수치")}<input data-field="minValue" type="number" step="any" min="0" value="${rule.minValue}" aria-label="${this.deps._t("최소 수치")} ${index + 1}" data-loot-change="targets"></label>`;
    }
    renderRule(rule, index) {
      return `<div class="loot-target-rule" data-target-rule>
            <label>${this.deps._t("목표 옵션")}<select data-field="target" aria-label="${this.deps._t("목표 옵션")} ${index + 1}" data-loot-change="targets">${this.renderRuleTargets(rule)}</select></label>
            ${this.renderRuleAmount(rule, index)}
            <label>${this.deps._t("최소 티어")}<input data-field="minTier" type="number" min="0" max="20" value="${rule.minTier}" aria-label="${this.deps._t("최소 티어")} ${index + 1}" data-loot-change="targets"></label>
            <button type="button" aria-label="${this.deps._t("목표 옵션")} ${index + 1} ${this.deps._t("삭제")}" data-loot-rule="${index}">${this.deps._t("삭제")}</button></div>`;
    }
    renderTargets() {
      const filter = this.deps.game.settings.equipmentTargets;
      const slots = ["any", ...this.deps.EQUIPMENT_DROP_SLOTS].map((slot) => `<option value="${this.deps.escapeHTML(slot)}" ${filter.slot === slot ? "selected" : ""}>${slot === "any" ? this.deps._t("모든 장비 부위") : this.deps.escapeHTML(this.deps.getItemSlotDisplayLabel(null, slot))}</option>`).join("");
      return `<div class="loot-filter-section loot-target-section"><h3>${this.deps._t("노리는 옵션, 우선 보관")}</h3>
            <label><input id="loot-target-enabled" type="checkbox" ${filter.enabled ? "checked" : ""} data-loot-change="targets">${this.deps._t("목표 옵션 보호 사용")}</label>
            <p class="loot-filter-note">${this.deps._t("일치한 장비는 습득 제한/자동해체/일괄해체에서 보호합니다. 개별 해체는 가능합니다.")}</p>
            <div class="loot-filter-fields"><label>${this.deps._t("장비 부위")}<select id="loot-target-slot" data-loot-change="targets">${slots}</select></label>
            <label>${this.deps._t("검사할 옵션")}<select id="loot-target-scope" data-loot-change="targets"><option value="explicit" ${filter.scope === "explicit" ? "selected" : ""}>${this.deps._t("추가 옵션만")}</option><option value="all" ${filter.scope === "all" ? "selected" : ""}>${this.deps._t("기본/추가/지하 마법부여")}</option></select></label>
            <label>${this.deps._t("충족할 조건 수")}<input id="loot-target-count" type="number" min="1" max="${Math.max(1, filter.rules.length)}" value="${filter.minMatches}" data-loot-change="targets"></label></div>
            <div id="loot-target-rules">${filter.rules.map(this.renderRule).join("") || `<p class="loot-filter-note">${this.deps._t("노리는 옵션을 추가해 주세요.")}</p>`}</div>
            <div class="loot-filter-actions"><button type="button" id="loot-target-add" ${filter.rules.length >= 6 ? "disabled" : ""} data-loot-rule="stat">${this.deps._t("옵션 추가")}</button>
            <button type="button" id="loot-target-add-tag" ${filter.rules.length >= 6 ? "disabled" : ""} data-loot-rule="tag">${this.deps._t("태그 추가")}</button></div>
            <p class="loot-filter-note">${this.deps._t("조건은 최대 6개. 조건 수 1은 하나만 일치해도 보호합니다. 수치는 옵션에 적힌 단위이며, 최소 티어 0은 제한 없음입니다. 복합 옵션도 검사하고 서로 다른 줄의 수치는 합산하지 않습니다.")}</p>
            <p class="loot-filter-note">${this.deps._t("태그 조건은 그 태그가 붙은 옵션 줄을 셉니다. 예를 들어 화염 태그 2줄, 최소 티어 10이면 T10 이상 화염 옵션이 두 줄인 장비를 보호합니다.")}</p>
            <p id="loot-target-preview" role="status"></p></div>`;
    }
    renderAutoSalvage(rarityChips) {
      const enabled = !!this.deps.game.settings.autoSalvageEnabled;
      return `<section class="eqw-auto-salvage"><p class="eqw-rail-title">${this.deps._t("자동해체")} <b class="${enabled ? "is-on" : ""}">${this.deps._t(enabled ? "켜짐" : "꺼짐")}</b></p>
            <p class="loot-filter-note">${this.deps._t("우선 보관 대상은 빼고, 습득 조건을 통과한 장비 가운데 고른 등급을 해체합니다. 떨어진 주얼도 같은 등급을 따릅니다.")}</p>
            <div id="auto-salvage-rarity-chips" class="loot-filter-grades">${rarityChips}</div>
            <button type="button" id="auto-salvage-toggle-btn" onclick="toggleAutoSalvage();refreshAutoSalvagePanel();">${this.deps._t(enabled ? "자동해체 끄기" : "자동해체 켜기")}</button></section>`;
    }
    renderSettings() {
      if (!this.active) return;
      const host = this.deps.document.getElementById("ui-settings-item-filter");
      if (!host) return;
      this.bindSettings(host);
      this.owner = this.deps.game;
      this.settings = this.owner.settings;
      host.innerHTML = `<div id="loot-target-config">${this.renderTargets()}</div>${this.renderPickup()}${this.renderFx()}`;
      this.previewTargets();
    }
    saveAndPreview() {
      this.deps.queueImportantSave(200);
      this.previewTargets();
    }
    previewTargets() {
      const label = this.deps.document.getElementById("loot-target-preview");
      if (!label) return;
      const filter = this.deps.game.settings.equipmentTargets;
      const count = this.deps.game.inventory.filter((item) => this.deps.equipmentLootPolicy.matches(item, this.deps.game)).length;
      label.textContent = filter.enabled ? this.deps._t("현재 인벤토리에서 {count}개 보호, {min}개 조건 충족 시 보관", { count, min: filter.minMatches }) : this.deps._t("목표 옵션 보호 꺼짐");
      label.dataset.state = filter.enabled ? "on" : "off";
    }
    updatePickup() {
      if (!this.settingsCurrent()) return;
      const root = this.deps.document.getElementById("ui-settings-item-filter");
      if ([...root.querySelectorAll('.loot-filter-section input[type="number"]')].some((input2) => !input2.reportValidity())) return;
      const input = {
        itemFilterEnabled: root.querySelector("#chk-item-filter-enabled").checked,
        itemFilterMinTiers: Object.fromEntries([...root.querySelectorAll("[data-tier]")].map((field) => [field.dataset.tier, Number(field.value)])),
        itemFilterTierThreshold: Number(root.querySelector("#inp-item-filter-tier-threshold").value),
        itemFilterMinTierCount: Number(root.querySelector("#inp-item-filter-tier-count").value),
        itemFilterOnlyNewCodexUnique: root.querySelector("#chk-item-filter-unique-new-codex").checked
      };
      if (!this.deps.equipmentLootPolicy.updatePickup(this.owner.settings, input)) return;
      this.saveAndPreview();
    }
    readRule(row) {
      const target = row.querySelector('[data-field="target"]').value, minTier = Number(row.querySelector('[data-field="minTier"]').value);
      const count = row.querySelector('[data-field="minCount"]'), value = row.querySelector('[data-field="minValue"]');
      if (target.startsWith("tag:")) return { tag: target.slice(4), minCount: count ? Number(count.value) : 2, minTier };
      return { statId: target, minValue: value ? Number(value.value) : 0, minTier };
    }
    applyPreset(key) {
      if (!this.settingsCurrent()) return;
      if (!this.deps.equipmentLootPolicy.applyPreset(this.owner.settings, key, this.deps.getZone(this.owner.currentZoneId))) return;
      const section = this.deps.document.getElementById("loot-pickup-config");
      if (section) section.outerHTML = this.renderPickup(true);
      this.saveAndPreview();
    }
    updateTargets() {
      if (!this.settingsCurrent()) return;
      const root = this.deps.document.getElementById("loot-target-config");
      if ([...root.querySelectorAll('input[type="number"]')].some((input) => !input.reportValidity())) return;
      const rows = [...root.querySelectorAll("[data-target-rule]")], rules = rows.map(this.readRule);
      if (new Set(rules.map(this.deps.equipmentLootPolicy.ruleKey)).size !== rules.length) {
        const preview = this.deps.document.getElementById("loot-target-preview");
        preview.textContent = this.deps._t("같은 옵션이나 태그는 한 번만 선택해 주세요. 중복 설정은 저장하지 않았습니다.");
        preview.dataset.state = "error";
        return;
      }
      if (!this.deps.equipmentLootPolicy.updateTargets(this.owner.settings, {
        enabled: root.querySelector("#loot-target-enabled").checked,
        slot: root.querySelector("#loot-target-slot").value,
        scope: root.querySelector("#loot-target-scope").value,
        minMatches: Number(root.querySelector("#loot-target-count").value),
        rules
      })) return;
      if (rows.some((row, index) => !!row.querySelector('[data-field="minCount"]') !== !!rules[index].tag)) root.innerHTML = this.renderTargets();
      this.saveAndPreview();
    }
    addRule() {
      if (!this.settingsCurrent() || !this.deps.equipmentLootPolicy.addTarget(this.owner.settings, "stat")) return;
      this.deps.document.getElementById("loot-target-config").innerHTML = this.renderTargets();
      this.saveAndPreview();
    }
    addTagRule() {
      if (!this.settingsCurrent() || !this.deps.equipmentLootPolicy.addTarget(this.owner.settings, "tag")) return;
      this.deps.document.getElementById("loot-target-config").innerHTML = this.renderTargets();
      this.saveAndPreview();
    }
    removeRule(index) {
      if (!this.settingsCurrent() || !this.deps.equipmentLootPolicy.removeTarget(this.owner.settings, index)) return;
      this.deps.document.getElementById("loot-target-config").innerHTML = this.renderTargets();
      this.saveAndPreview();
    }
    renderHighlights(highlights) {
      if (!highlights || !highlights.items.length) return "";
      const owned = [...this.deps.game.inventory, ...Object.values(this.deps.game.equipment), ...this.deps.game.offlineProgress?.stash || []].filter(Boolean);
      const cards = highlights.items.map((item) => this.renderHighlight(item, owned)).join("");
      return `<section class="loot-return-highlights"><h3>${this.deps._t("주요 장비")} <small>${this.deps._t("{n}개", { n: highlights.total })}</small></h3><ul>${cards}</ul></section>`;
    }
    renderHighlight(item, owned) {
      const equipment = owned.find((entry) => String(entry.id) === String(item.id));
      const token = equipment ? this.deps.registerCombatLogItemSnapshot(equipment) : null;
      const detail = `<span class="loot-highlight-name"><strong>${this.deps.escapeHTML(this.deps.getItemDisplayName(item))}</strong><small>${this.deps.escapeHTML(this.deps.getItemSlotDisplayLabel(item))}, ${this.deps.escapeHTML(item.location)}</small></span><span class="loot-highlight-reason">${this.deps.escapeHTML(item.reason)}</span>`;
      const attrs = token === null ? "disabled" : `data-item-tooltip-anchor="1" data-log-item-token="${token}" onpointerenter="if(event.pointerType!=='touch')equipmentLootUi.showHighlight(event,${token})" onpointermove="if(event.pointerType!=='touch')equipmentLootUi.showHighlight(event,${token})" onpointerleave="if(event.pointerType==='mouse')hideItemTooltip(event)" onfocus="equipmentLootUi.showHighlight(event,${token})" onblur="hideItemTooltip()" onclick="equipmentLootUi.showHighlight(event,${token})"`;
      const tones = `--loot-rarity:${this.deps.getRarityColor(item.rarity)}${item.color ? `;--loot-reason:${item.color}` : ""}`;
      return `<li class="loot-highlight-card" style="${tones}"><button type="button" ${attrs} aria-label="${this.deps.escapeHTML(this.deps.getItemDisplayName(item))}, ${this.deps.escapeHTML(this.deps._t(this.rarityNames[item.rarity] || item.rarity))} ${this.deps._t("옵션 확인")}">${detail}</button></li>`;
    }
    showHighlight(event, token) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = event.type === "pointermove" || event.type === "pointerenter" ? event : { clientX: rect.left + rect.width / 2, clientY: rect.top };
      this.deps.showCombatLogItemTooltip(pointer, token);
    }
    api() {
      return Object.freeze({
        renderAutoSalvage: this.renderAutoSalvage,
        renderSettings: this.renderSettings,
        updatePickup: this.updatePickup,
        togglePick: this.togglePick,
        applyPreset: this.applyPreset,
        updateTargets: this.updateTargets,
        addRule: this.addRule,
        addTagRule: this.addTagRule,
        removeRule: this.removeRule,
        renderHighlights: this.renderHighlights,
        showHighlight: this.showHighlight
      });
    }
    settingsCurrent() {
      if (!this.active) return false;
      if (this.owner === this.deps.game && this.settings === this.owner.settings) return true;
      this.renderSettings();
      return false;
    }
    bindSettings(host) {
      if (this.host === host) return;
      releaseViewTarget(this, this.host);
      this.host = host;
      listenView(this, host, "click", (event) => this.onClick(event));
      listenView(this, host, "change", (event) => {
        if (event.target.closest('[data-loot-change="pickup"]')) this.updatePickup();
        else if (event.target.closest('[data-loot-change="targets"]')) this.updateTargets();
      });
    }
    onClick(event) {
      const button = event.target.closest("[data-loot-pick], [data-pickup-preset], [data-loot-rule]");
      if (!button || button.disabled || !this.host.contains(button)) return;
      if (button.hasAttribute("data-loot-pick")) this.togglePick(button.dataset.lootPick, button.dataset.lootKey);
      else if (button.hasAttribute("data-pickup-preset")) this.applyPreset(button.dataset.pickupPreset);
      else if (button.dataset.lootRule === "stat") this.addRule();
      else if (button.dataset.lootRule === "tag") this.addTagRule();
      else this.removeRule(Number(button.dataset.lootRule));
    }
    dispose() {
      releaseViewEvents(this);
      this.host = null;
      this.owner = null;
      this.settings = null;
    }
  };
  function createEquipmentLootView(deps) {
    const view = new EquipmentLootView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/equipment-loot-ui-classic.mjs
  var equipmentLootUi = createEquipmentLootView({
    get EQUIPMENT_DROP_SLOTS() {
      return EQUIPMENT_DROP_SLOTS;
    },
    get ITEM_PICKUP_PRESETS() {
      return ITEM_PICKUP_PRESETS;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get WEAPON_CATEGORIES() {
      return WEAPON_CATEGORIES;
    },
    get _t() {
      return _t;
    },
    get document() {
      return document;
    },
    get equipmentLootPolicy() {
      return window.GameModules.equipmentLootPolicy;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get getRarityColor() {
      return getRarityColor;
    },
    get getZone() {
      return getZone;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get registerCombatLogItemSnapshot() {
      return registerCombatLogItemSnapshot;
    },
    get showCombatLogItemTooltip() {
      return showCombatLogItemTooltip;
    }
  });
  safeExposeGlobals({ equipmentLootUi });
})();
