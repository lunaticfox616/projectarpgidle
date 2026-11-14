// GENERATED from modules/stump-talisman-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/view-events.mjs
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/stump-talisman-markup.mjs
  function esc(runtime, text) {
    return (0, runtime.deps.escapeHTML)(String(text));
  }
  function tone(runtime, item) {
    return runtime.deps.TALISMAN_RARITY_TONES[item.rarity] || runtime.deps.TALISMAN_RARITY_TONES.magic;
  }
  function owned(runtime, key) {
    return Math.floor(runtime.deps.game.currencies[key] || 0);
  }
  function shardName(runtime, key) {
    return (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name);
  }
  function lineTone(runtime, line, text) {
    if (line.kind !== "condition") return (0, runtime.deps.getItemStatToneColor)(line.id);
    const def = runtime.deps.talismans.conditionDef(line.id);
    return def && def.stat ? (0, runtime.deps.getItemStatToneColor)(def.stat) : runtime.deps.statToneText.lineColor(text, "");
  }
  function effectRow(runtime, html, tooltip, cls = "", colour = "") {
    const style = colour ? ` style="color:${colour}"` : "";
    return tooltip ? `<div class="tooltip-line stump-tip-talisman ${cls}"${style}>${html}</div>` : `<li class="${cls}"${style}>${html}</li>`;
  }
  function lineRow(runtime, line, tooltip = false) {
    const text = runtime.deps.talismans.describeLine(line);
    return effectRow(runtime, esc(runtime, text), tooltip, line.kind === "condition" ? "is-condition" : "", lineTone(runtime, line, text));
  }
  function offRow(runtime, text, tooltip = false) {
    return effectRow(runtime, (0, runtime.deps._t)("{text} (비활성)", { text: esc(runtime, text) }), tooltip, "is-off");
  }
  function boardMul(runtime, item, cell) {
    return runtime.deps.stumpBox.graftMultiplier(runtime.deps.game.stumpBox, cell) * (runtime.deps.talismanEffects.summarize().amplified.has(item.id) ? 1.25 : 1);
  }
  function linesHtml(runtime, item, active, mul, tooltip) {
    const moment = item.special === "moment" ? (0, runtime.deps._t)("보스에게 주는 최종 피해 +{moment}%, 생명력 5% 이하 보스 처형", { moment: item.moment }) : "";
    const rows = active ? item.lines.map((line) => lineRow(runtime, scaledLine(runtime, line, mul), tooltip)) : item.lines.map((line) => offRow(runtime, runtime.deps.talismans.describeLine(line), tooltip));
    if (moment) rows.push(active ? effectRow(runtime, moment, tooltip, "is-condition", (0, runtime.deps.getItemStatToneColor)("bossDamagePct")) : offRow(runtime, moment, tooltip));
    if (!rows.length) return "";
    return tooltip ? rows.join("") : `<ul class="stump-talisman-lines">${rows.join("")}</ul>`;
  }
  function isActive(runtime, item, cell) {
    return cell >= 0 && runtime.deps.stumpBox.isMature(item) && !runtime.deps.talismanEffects.summarize().suppressed.has(item.id);
  }
  function stateLine(runtime, item, cell, tooltip) {
    const summary = runtime.deps.talismanEffects.summarize();
    if (cell < 0 || !runtime.deps.stumpBox.isMature(item)) return "";
    const tag = tooltip ? "div" : "p", cls = tooltip ? "tooltip-line stump-tip-status" : "stump-status";
    if (summary.suppressed.has(item.id)) return `${(0, runtime.deps._t)('<{tag} class="{cls} is-bad">비활성화: 척력 인접', { tag, cls })}</${tag}>`;
    return summary.amplified.has(item.id) ? `${(0, runtime.deps._t)('<{tag} class="{cls} is-good">척력으로 효과 +25%', { tag, cls })}</${tag}>` : "";
  }
  function toolsHtml(runtime, item, cell) {
    const buttons = [];
    if (runtime.deps.talismans.isDirectional(item)) {
      buttons.push(`<button type="button" data-stump-action="talisman-turn">표식 돌리기, 지금 ${runtime.deps.talismans.directionName(item.dir)}</button>`);
    }
    const wax2 = runtime.deps.talismans.waxPreview(item);
    if (wax2) {
      buttons.push(`<button type="button" data-stump-action="talisman-wax"${owned(runtime, "beeswax") > 0 ? "" : " disabled"}>${(0, runtime.deps._t)("밀랍 바르기 → {id} +{id2}, 밀랍 {value}", { id: esc(runtime, (0, runtime.deps.getStatName)(wax2.id)), id2: esc(runtime, (0, runtime.deps.formatValue)(wax2.id, wax2.value)), value: owned(runtime, "beeswax") })}</button>`);
    }
    if (cell < 0) buttons.push(`<button type="button" data-stump-action="talisman-discard"${item.locked ? " disabled" : ""}>버리기</button>`);
    return buttons.length ? `<div class="stump-actions">${buttons.join("")}</div>` : "";
  }
  function detailHtml(runtime, item, cell) {
    return bodyHtml(runtime, item, cell, false) + toolsHtml(runtime, item, cell);
  }
  function uniqueEffectHtml(runtime, item, active, tooltip) {
    if (!item.uniqueEffect) return "";
    const tag = tooltip ? "div" : "p", cls = tooltip ? "tooltip-line stump-tip-talisman" : "stump-yield";
    return active ? `<${tag} class="${cls}">${runtime.deps.statToneText.html((0, runtime.deps._t)(item.uniqueEffect))}</${tag}>` : `${(0, runtime.deps._t)('<{tag} class="{cls} is-off">{uniqueEffect} (비활성)', { tag, cls, uniqueEffect: esc(runtime, item.uniqueEffect) })}</${tag}>`;
  }
  function bodyHtml(runtime, item, cell, tooltip) {
    const active = isActive(runtime, item, cell), label = (0, runtime.deps._t)("{RARITY_LABELS} 부적", { RARITY_LABELS: runtime.state.RARITY_LABELS[item.rarity] });
    const rarity = tooltip ? `<div class="tooltip-line" style="color:${tone(runtime, item)}">${label}</div>` : `<p class="stump-talisman-rarity" style="--stump-tone:${tone(runtime, item)}">${label}</p>`;
    return rarity + uniqueEffectHtml(runtime, item, active, tooltip) + linesHtml(runtime, item, active, active ? boardMul(runtime, item, cell) : 1, tooltip) + stateLine(runtime, item, cell, tooltip);
  }
  function tooltipHtml(runtime, item, cell) {
    return bodyHtml(runtime, item, cell, true);
  }
  function statRow(runtime, stat, value) {
    return `<li style="color:${(0, runtime.deps.getItemStatToneColor)(stat)}">${esc(runtime, (0, runtime.deps.getStatName)(stat))} ${value >= 0 ? "+" : "−"}${esc(runtime, (0, runtime.deps.formatValue)(stat, Math.abs(value)))}</li>`;
  }
  function summaryHtml(runtime) {
    const summary = runtime.deps.talismanEffects.summarize();
    const rows = Object.keys(summary.stats).filter((stat) => stat !== "cosmosLightningVariance").map((stat) => statRow(runtime, stat, summary.stats[stat])).concat(summary.conditions.map((line) => lineRow(runtime, { kind: "condition", id: line.id, value: line.value })));
    if (summary.bossFinalDmgBonusPct > 0) rows.push(`<li class="is-condition" style="color:${(0, runtime.deps.getItemStatToneColor)("bossDamagePct")}">보스 최종 피해 +${summary.bossFinalDmgBonusPct}%, 생명력 5% 이하 보스 처형</li>`);
    if (summary.stats.cosmosLightningVariance > 0) rows.push(`<li class="is-condition" style="color:${(0, runtime.deps.getItemStatToneColor)("lightPctDmg")}">번개 피해가 타격마다 0.8~1.5배</li>`);
    return rows.length ? `<h4 class="stump-talisman-title">${(0, runtime.deps._t)("깨어난 부적")}</h4><ul class="stump-stats">${rows.join("")}</ul>` : "";
  }
  function shardCard(runtime, key) {
    const rule = runtime.deps.TALISMAN_UNSEAL_RULES[key], have = owned(runtime, key), ready = have >= rule.cost;
    return `<div class="stump-shard-card${ready ? " is-ready" : ""}" style="--shard-tone:${shardTone(runtime, key)}"><img src="assets/items/stump-pixel-v1/sealed-${runtime.state.SHARD_RARITY[key] || "magic"}.png" alt="" draggable="false"><strong>${esc(runtime, shardName(runtime, key))}</strong><span class="stump-shard-count">${(0, runtime.deps._t)("보유")} <b>${have}</b></span><small>${(0, runtime.deps._t)("옵션 {lines}, 고유 {uniqueChance}", { lines: linesText(runtime, rule.lines), uniqueChance: chanceText(runtime, rule.uniqueChance) })}</small><button type="button" data-stump-action="talisman-unseal" data-source="${key}"${ready ? "" : " disabled"}>${(0, runtime.deps._t)("풀기")}</button></div>`;
  }
  function exchangeRow(runtime, row, index) {
    const have = owned(runtime, row.from), ready = have >= row.cost, fill = Math.min(100, Math.floor(have / row.cost * 100));
    return `<div class="stump-exchange-row${ready ? " is-ready" : ""}"><span class="stump-exchange-from" style="--shard-tone:${shardTone(runtime, row.from)}">${esc(runtime, shardName(runtime, row.from))} ${row.cost}</span><span class="stump-exchange-arrow" aria-hidden="true">→</span><span class="stump-exchange-to" style="--shard-tone:${shardTone(runtime, row.to)}">${esc(runtime, shardName(runtime, row.to))} 1</span><span class="stump-exchange-bar" style="--shard-tone:${shardTone(runtime, row.from)}"><i style="width:${fill}%"></i></span><small>${have}/${row.cost}</small><button type="button" data-stump-action="talisman-exchange" data-index="${index}"${ready ? "" : " disabled"}>${(0, runtime.deps._t)("교환")}</button></div>`;
  }
  function unsealHtml(runtime) {
    if (!runtime.deps.contentProgression.isUnlocked("talisman")) return "";
    return `<h3>${(0, runtime.deps._t)("부적 풀기")} <small>${(0, runtime.deps._t)("편린: 고대 미궁에서 획득")}</small></h3><div class="stump-shard-cards">${Object.keys(runtime.deps.TALISMAN_UNSEAL_RULES).map(runtime.handlers.shardCard).join("")}</div><h3>${(0, runtime.deps._t)("편린 교환")}</h3><div class="stump-exchange">${runtime.deps.TALISMAN_SHARD_EXCHANGE.map(runtime.handlers.exchangeRow).join("")}</div>`;
  }
  function scaledLine(runtime, line, mul) {
    return { ...line, value: Math.round(line.value * mul * 100) / 100 };
  }
  function shardTone(runtime, key) {
    return runtime.deps.TALISMAN_RARITY_TONES[runtime.state.SHARD_RARITY[key]] || runtime.deps.TALISMAN_RARITY_TONES.magic;
  }
  function linesText(runtime, range) {
    return range[0] === range[1] ? (0, runtime.deps._t)("{range}줄", { range: range[0] }) : (0, runtime.deps._t)("{range}~{range2}줄", { range: range[0], range2: range[1] });
  }
  function chanceText(runtime, chance) {
    return `${Math.round(chance * 1e3) / 10}%`;
  }

  // modules/ui/stump-talisman-actions.mjs
  function refuse(runtime, reason) {
    (0, runtime.deps.showGameToast)(reason, { tone: "warning" });
    return false;
  }
  function unseal(runtime, source) {
    const result = runtime.deps.talismans.unseal(source);
    if (!result.ok) return refuse(runtime, result.reason) || null;
    const item = result.item, text = item.lines.map(runtime.deps.talismans.describeLine).join(", ") || item.uniqueEffect || "";
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🧿 부적 풀기: [{name}] {text}", { name: (0, runtime.deps._t)(item.name), text }), item.rarity === "unique" ? "loot-unique" : "loot-rare");
    return item;
  }
  function exchange(runtime, index) {
    const result = runtime.deps.talismans.exchange(index);
    return result.ok || refuse(runtime, result.reason);
  }
  function wax(runtime, id) {
    const result = runtime.deps.talismans.wax(id);
    if (!result.ok) return refuse(runtime, result.reason);
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🐝 부적 밀랍: {describeLine}", { describeLine: runtime.deps.talismans.describeLine(result.line) }), "loot-rare");
    return true;
  }
  function turn(runtime, id) {
    return runtime.deps.talismans.turn(id) || refuse(runtime, "지금은 표식을 돌릴 수 없습니다.");
  }
  async function discard(runtime, id) {
    const owner = runtime.deps.game;
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (!item || item.family !== "talisman") return false;
    const message = `[${item.name}]${(0, runtime.deps.pickParticle)(item.name, "을", "를")} 버립니다. 되돌릴 수 없습니다.`;
    const options = { title: (0, runtime.deps._t)("부적 버리기"), tone: "danger", confirmLabel: (0, runtime.deps._t)("버리기"), cancelLabel: (0, runtime.deps._t)("취소") };
    if (item.rarity === "unique" && !await (0, runtime.deps.requestGameConfirmation)(message, options)) return false;
    if (!runtime.active || owner !== runtime.deps.game || runtime.deps.stumpBox.itemById(owner, id) !== item) return false;
    return runtime.deps.stumpBox.discard(owner, id);
  }

  // modules/ui/stump-talisman-view.mjs
  function createStumpTalismanView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { shardCard, exchangeRow, tone, detailHtml, tooltipHtml, summaryHtml, unsealHtml, unseal, exchange, wax, turn, discard };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.api = StumpTalismanViewApi(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.RARITY_LABELS = { magic: "마법", rare: "희귀", unique: "고유" };
    runtime.state.SHARD_RARITY = Object.freeze({ sealShard: "magic", strongSealShard: "rare", radiantSealShard: "unique" });
  }
  function StumpTalismanViewApi(runtime) {
    return Object.freeze({
      tone: runtime.handlers.tone,
      detailHtml: runtime.handlers.detailHtml,
      tooltipHtml: runtime.handlers.tooltipHtml,
      summaryHtml: runtime.handlers.summaryHtml,
      unsealHtml: runtime.handlers.unsealHtml,
      unseal: runtime.handlers.unseal,
      exchange: runtime.handlers.exchange,
      wax: runtime.handlers.wax,
      turn: runtime.handlers.turn,
      discard: runtime.handlers.discard,
      dispose: () => disposeStumpTalismanView(runtime)
    });
  }
  function disposeStumpTalismanView(runtime) {
    releaseViewEvents(runtime);
  }

  // modules/stump-talisman-ui-classic.mjs
  var stumpTalismanUi = createStumpTalismanView({
    get escapeHTML() {
      return escapeHTML;
    },
    get TALISMAN_RARITY_TONES() {
      return TALISMAN_RARITY_TONES;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get talismans() {
      return talismans;
    },
    get statToneText() {
      return statToneText;
    },
    get stumpBox() {
      return stumpBox;
    },
    get talismanEffects() {
      return talismanEffects;
    },
    get getStatName() {
      return getStatName;
    },
    get formatValue() {
      return formatValue;
    },
    get TALISMAN_UNSEAL_RULES() {
      return TALISMAN_UNSEAL_RULES;
    },
    get contentProgression() {
      return contentProgression;
    },
    get TALISMAN_SHARD_EXCHANGE() {
      return TALISMAN_SHARD_EXCHANGE;
    },
    get showGameToast() {
      return showGameToast;
    },
    get addLog() {
      return addLog;
    },
    get pickParticle() {
      return pickParticle;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    }
  });
  safeExposeGlobals({ stumpTalismanUi });
})();
