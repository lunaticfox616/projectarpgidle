// GENERATED from modules/side-encounter-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/side-encounter-markup.mjs
  var SideEncounterMarkup = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    // Keep the action row connected while combat estimates and countdowns change.
    renderPanel(panel, html) {
      if (panel.__lastHtml === html) return;
      if (!html) {
        panel.replaceChildren();
        panel.__lastHtml = html;
        return;
      }
      const template = this.deps.document.createElement("template");
      template.innerHTML = html;
      const intro = template.content.firstElementChild;
      const actions2 = intro.querySelector(".map-expedition-actions");
      actions2.remove();
      const bodyHtml = intro.innerHTML;
      let body = panel.querySelector(".map-expedition-content");
      if (!body) {
        intro.innerHTML = '<div class="map-expedition-content"></div>';
        intro.append(actions2);
        panel.replaceChildren(intro);
        body = intro.firstElementChild;
      }
      if (body.innerHTML !== bodyHtml) {
        (0, this.deps.captureUiDisclosureState)(body);
        body.innerHTML = bodyHtml;
        (0, this.deps.restoreUiDisclosureState)(body);
      }
      this.refreshActions(panel.querySelector(".map-expedition-actions"), actions2);
      panel.__lastHtml = html;
    }
    refreshActions(current, next) {
      const signature = (row) => [...row.children].map((el) => `${el.tagName}:${el.getAttribute("onclick")}`).join("|");
      if (signature(current) !== signature(next)) {
        current.replaceChildren(...next.children);
        return;
      }
      [...next.children].forEach((child, index) => {
        const target = current.children[index];
        if (target.textContent !== child.textContent) target.textContent = child.textContent;
        if (child.tagName === "BUTTON") {
          target.disabled = child.disabled;
          if (child.hasAttribute("aria-pressed")) target.setAttribute("aria-pressed", child.getAttribute("aria-pressed"));
        }
      });
    }
    rows(values, empty) {
      const counts = /* @__PURE__ */ new Map();
      values.filter(Boolean).forEach((value) => counts.set(String(value), (counts.get(String(value)) || 0) + 1));
      if (!counts.size) return `<li class="expedition-empty">${empty}</li>`;
      return [...counts].map(([text, count]) => `<li>${(0, this.deps.escapeHTML)(text)}${count > 1 ? ` <small>×${count}</small>` : ""}</li>`).join("");
    }
  };

  // modules/ui/side-expedition-view.mjs
  var SideExpeditionView = class {
    constructor(deps2, links) {
      this.deps = deps2;
      this.links = links;
    }
    hiveSummary(hive) {
      const penalties = Array.isArray(hive.penaltyLedger) ? hive.penaltyLedger : [];
      const rewards = (Array.isArray(hive.rewardLedger) ? hive.rewardLedger : []).filter((row) => row !== "보상 획득 실패");
      const queen = (Array.isArray(hive.pendingQueenRewards) ? hive.pendingQueenRewards : []).map((reward) => String(reward.text || "").replace(/^\[[^\]]+\]\s*/, ""));
      const power = Math.max(0, Math.floor(hive.enemyEmpower || 0));
      const wax = 1 + Math.floor(Math.min(30, power) / 6);
      const stinger = 1 + Math.floor(Math.min(30, power) / 10);
      return `<section class="expedition-ledger" aria-label="${(0, this.deps._t)("벌집 위험과 보상")}">
            <div class="expedition-ledger-risk"><h3>${(0, this.deps._t)("누적 대가")} <b>${(0, this.deps._t)("군체 강화 {power}", { power })}</b></h3><ul>${this.links.markup.rows(penalties, "선택한 대가 없음")}</ul></div>
            <div><h3>${(0, this.deps._t)("확보 보상")} <b>${(0, this.deps._t)("이미 지급됨")}</b></h3><ul>${this.links.markup.rows(rewards, "아직 없음")}</ul>
                ${hive.pendingWaveRewardText ? `<p>${(0, this.deps._t)("이번 무리 처치 후, {pendingWaveRewardText}", { pendingWaveRewardText: (0, this.deps.escapeHTML)(hive.pendingWaveRewardText) })}</p>` : ""}</div>
            <div class="expedition-ledger-queen"><h3>${(0, this.deps._t)("여왕 처치 시")} <b>${(0, this.deps._t)("보류 중")}</b></h3>
                <ul>${this.links.markup.rows(queen, "아직 보류한 선택 보상 없음")}</ul><p>${(0, this.deps._t)("기본 전리품: 밀랍 {wax}, 독벌침 {stinger}. 확률 보상은 처치 시 추첨", { wax, stinger })}</p></div>
        </section>`;
    }
    hivePanel(hive, choices, power) {
      const keys = Math.max(0, this.deps.game.currencies.hiveKey || 0);
      if (!hive.inRun) return `<div class="map-expedition-intro"><p class="map-expedition-type">${(0, this.deps._t)("갈림길을 직접 고르는 원정, 10갈래 후 여왕")}</p>
            <dl><div><dt>${(0, this.deps._t)("전투 방식")}</dt><dd>${(0, this.deps._t)("벌떼 열 방과 여왕의 방. 강화 대가를 고를수록 여왕 전리품 증가")}</dd></div>
            <div><dt>${(0, this.deps._t)("주요 전리품")}</dt><dd>${(0, this.deps._t)("꽃가루, 독벌침, 벌꿀, 밀랍")}</dd></div>
            <div><dt>${(0, this.deps._t)("입장 비용")}</dt><dd>${(0, this.deps._t)("벌집 열쇠 1개")} <small>${(0, this.deps._t)("보유 {n}개", { n: keys })}</small></dd></div></dl>
            ${power}<div class="map-expedition-actions"><button type="button" data-exploration-departure onclick="startBeehiveRun()" ${keys > 0 ? "" : "disabled"}>${(0, this.deps._t)("벌집 입장")}</button>
            ${keys > 0 ? "" : `<span>${(0, this.deps._t)("벌집 열쇠가 필요합니다.")}</span>`}</div></div>`;
      return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${hive.queenActive ? (0, this.deps._t)("여왕벌 전투") : (0, this.deps._t)("갈림길 {n}/10", { n: Math.min(10, hive.branchStep) })}</strong>${power}</div>
            ${this.hiveSummary(hive)}${choices}<details class="map-expedition-details"><summary>${(0, this.deps._t)("원정 정보, 보유 재료")}</summary>
            <p>${(0, this.deps._t)("꽃가루")} ${this.deps.game.currencies.pollen || 0}, ${(0, this.deps._t)("독벌침")} ${this.deps.game.currencies.venomStinger || 0}, ${(0, this.deps._t)("마력 깃든 벌꿀")} ${this.deps.game.currencies.enchantedHoney || 0}, ${(0, this.deps._t)("밀랍")} ${this.deps.game.currencies.beeswax || 0}</p></details>
            <div class="map-expedition-actions"><button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)("전투 보기")}</button><button type="button" onclick="forfeitBeehiveRun()">${(0, this.deps._t)("원정 포기")}</button></div></div>`;
    }
    meteorPanel(power) {
      const active = this.deps.game.currentZoneId === this.deps.METEOR_FALL_ZONE_ID;
      const ready = this.deps.game.meteorSite.skyRiftReady;
      const percent = Math.min(100, Math.floor(this.deps.game.meteorSite.skyRiftGauge || 0));
      const site = (0, this.deps.getZone)(this.deps.METEOR_FALL_ZONE_ID);
      const reward = (0, this.deps._t)("희귀 이상 장비 {rewardEquipmentCount}개 확정, 운석 고유 장비(낮은 확률). 가방이 차도 보상은 보관됩니다", { rewardEquipmentCount: site.rewardEquipmentCount });
      const escort = site.tier >= 40 ? "정예 호위 2기" : site.tier >= 20 ? "정예 호위 1기" : "보스 단독";
      const kind = (0, this.deps.getMeteorKind)();
      const kindText = kind ? `<span class="meteor-kind is-${kind.id}">${(0, this.deps._t)(kind.name)}</span> (${kind.element})` : "충전 완료 시 정해짐";
      return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${active ? (0, this.deps._t)("운석 원정 진행 중") : ready ? (0, this.deps._t)("원정 준비 완료") : (0, this.deps._t)("하늘의 균열 충전 {pct}%", { pct: percent })}</strong>${power}</div>
            <dl><div><dt>${(0, this.deps._t)("운석")}</dt><dd>${kindText}</dd></div>
            <div><dt>${(0, this.deps._t)("주요 전리품")}</dt><dd>${reward}</dd></div>
            <div><dt>${(0, this.deps._t)("난이도")}</dt><dd>${(0, this.deps._t)("티어")} ${site.tier}<small>${(0, this.deps._t)("충전 중 기록한 최저 티어 기준")}</small></dd></div>
            <div><dt>${(0, this.deps._t)("전투 방식")}</dt><dd>${(0, this.deps._t)("파편 무리 → 별철 관통 사수 → 운석 핵({escort}). 핵 체력 절반부터 연속 예고 공격", { escort })}</dd></div></dl>
            <div class="map-expedition-actions">${active ? `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)("전투 보기")}</button>` : `<button type="button" data-exploration-departure onclick="changeZone('${this.deps.METEOR_FALL_ZONE_ID}')" ${ready ? "" : "disabled"}>${(0, this.deps._t)("운석 원정 입장")}</button>${ready ? "" : (0, this.deps._t)("<span>충전을 완료하면 1회 입장할 수 있습니다.</span>")}`}</div></div>`;
    }
  };

  // modules/ui/grand-breach-view.mjs
  var GrandBreachView = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    grandRewardPreview(reward) {
      const parts = [];
      if (this.deps.contentProgression.canDropCurrency("voidChisel")) parts.push(`공허의 끌 ${reward.voidChisel}`);
      if (reward.jewelShard && this.deps.contentProgression.canDropCurrency("jewelShard")) parts.push(`주얼 결정 ${reward.jewelShard}`);
      return parts.join(", ") || "제작 재화 해금 후 획득";
    }
    usesGrandBreachArena() {
      const expedition2 = this.deps.actExplorationState.current(this.deps.game);
      if (expedition2?.zoneId === "grand_breach_run") return !!this.deps.actExplorationMap.forRun(expedition2).grandBreach;
      return !!(0, this.deps.getZone)("grand_breach_run")?.exploration?.arena;
    }
    /** Time left before the lord must be called (GRAND_BREACH_ENCOUNTER.survivalLimitSeconds), as m:ss. */
    grandTimeLeft(run) {
      const left = Number.isFinite(run.survivalEndsAt) ? run.survivalEndsAt - (0, this.deps.getCombatTime)() : this.deps.GRAND_BREACH_ENCOUNTER.survivalLimitSeconds * 1e3;
      const seconds = Math.max(0, Math.ceil(left / 1e3));
      return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    }
    grandSummary(run) {
      if (run.phase === "loot") return `<strong>${(0, this.deps._t)("군주 격파")}</strong><span>${(0, this.deps._t)("전리품 수거 중")}</span><small>${(0, this.deps._t)("바닥 아이템을 모두 획득하면 귀환")}</small>`;
      const progress2 = (0, this.deps.getGrandBreachProgress)(run.gauge);
      const reward = (0, this.deps.getGrandBreachRewardSummary)(run.kills);
      const nextKills = 10 - reward.kills % 10;
      const pressure = Math.min(6, Math.floor(reward.kills / 10));
      const heading = (0, this.deps._t)({ survival: "균열 쇄도", bossPending: "군주 소환" }[run.phase] || "균열 군주");
      const next = run.phase === "survival" ? (0, this.deps._t)("남은 시간 {time}, 다음 보상 증가까지 {n}마리", { time: this.grandTimeLeft(run), n: nextKills }) : (0, this.deps._t)(run.phase === "bossPending" ? "군주 소환 중" : "군주 처치 시 지급");
      const config = this.usesGrandBreachArena() ? this.deps.GRAND_BREACH_ENCOUNTER.arena : this.deps.GRAND_BREACH_ENCOUNTER;
      const crowd = run.inRun && run.phase === "survival" ? `<span>${(0, this.deps._t)("현장 적")} <b>${this.deps.game.enemies.filter((enemy) => enemy.hp > 0).length}/${config.capacities[progress2.stage]}</b></span>` : "";
      return `<strong>${heading}</strong><span>${(0, this.deps._t)("게이지")} <b>${progress2.percent}%</b></span>
            <span>${(0, this.deps._t)("군주 압박")} <b>${(0, this.deps._t)("{n}단계", { n: pressure })}</b></span>
            ${crowd}<span>${(0, this.deps._t)("보관 전리품")} <b>${(0, this.deps._t)("{n}묶음", { n: run.pendingLoot?.length || 0 })}</b></span><span class="grand-breach-reward">${(0, this.deps._t)("격파 보상")} <b>${this.grandRewardPreview(reward)}</b></span><small>${next}</small>`;
    }
    grandActions(rift) {
      if (rift.grandRun?.inRun) return `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)("전투 보기")}</button>
            <button type="button" onclick="sideEncounterUi.withdrawGrandBreach()">${(0, this.deps._t)(rift.grandRun.phase === "loot" ? "귀환" : "원정 포기")}</button>`;
      const hint = rift.grandBreachUnlock ? "" : `<span>${(0, this.deps._t)("공허 균열 완료 시 {pct}% 확률로 열립니다.", { pct: Math.round(this.deps.GRAND_BREACH_ENCOUNTER.unlockChance * 100) })}</span>`;
      return `<button type="button" data-exploration-departure onclick="enterGrandBreach()" ${rift.grandBreachUnlock ? "" : "disabled"}>${(0, this.deps._t)("대균열 입장")}</button>${hint}`;
    }
    grandResultReward(run) {
      if (run.phase !== "done") return "군주 보상 없음";
      const pieces = [];
      if (run.rewardVoidChisel > 0) pieces.push(`공허의 끌 +${run.rewardVoidChisel}`);
      if (run.rewardJewelShard > 0) pieces.push(`주얼 결정 +${run.rewardJewelShard}`);
      return pieces.join(", ") || (run.rewardVoidChisel == null ? "정산 완료" : "지급된 제작 재화 없음");
    }
    grandResult(run) {
      if (!run || run.inRun || !["done", "failed"].includes(run.phase)) return "";
      const cleared = run.phase === "done";
      return `<div class="map-expedition-result" aria-label="${(0, this.deps._t)("최근 원정 결과")}"><span>${(0, this.deps._t)("최근 원정")}</span>
            <strong>${(0, this.deps._t)(cleared ? "군주 격파" : "군주 격파 실패")}</strong><span>${(0, this.deps._t)("균열 몬스터 {n}처치", { n: Math.max(0, Math.floor(run.kills || 0)) })}</span>
            <b>${this.grandResultReward(run)}</b></div>`;
    }
    grandEntryRewardDescription() {
      const rewards = [
        this.deps.contentProgression.canDropCurrency("voidChisel") ? "공허의 끌 2개부터, 10마리 처치마다 +1개" : "",
        this.deps.contentProgression.canDropCurrency("jewelShard") ? "15마리마다 주얼 결정 +1개(최대 3개)" : ""
      ];
      return rewards.filter(Boolean).join(", ") || "제작 재화 해금 후 획득";
    }
    grandEncounterDescription() {
      const rule = this.deps.GRAND_BREACH_ENCOUNTER;
      const normal = rule.normalGaugeGain / rule.requiredGauge * 100;
      const elite = rule.eliteGaugeGain / rule.requiredGauge * 100;
      if (this.usesGrandBreachArena()) {
        return (0, this.deps._t)("균열 게이지 100%까지 몬스터 쇄도 (일반 {normal}%, 정예 {elite}%) → 균열 군주", { normal, elite });
      }
      return (0, this.deps._t)("몬스터를 처치해 게이지 100% 달성(일반 {normal}%, 정예 {elite}%) → 균열 군주. 10마리마다 군주 압박 증가", { normal, elite });
    }
    grandPanelProgress(run) {
      if (run.phase === "loot") return "군주 격파, 바닥 전리품을 다 주우면 귀환";
      if (run.phase === "bossPending") return "균열 군주 소환 중";
      if (run.phase !== "survival") return "균열 군주 전투";
      const progress2 = (0, this.deps.getGrandBreachProgress)(run.gauge);
      return (0, this.deps._t)("균열 게이지 {percent}%, 몬스터 {max}처치, 남은 시간 {run}", { percent: progress2.percent, max: Math.max(0, Math.floor(run.kills || 0)), run: this.grandTimeLeft(run) });
    }
    grandPanel(rift, power) {
      const run = rift.grandRun;
      const current = run?.inRun;
      const waves = rift.active ? `${rift.defeatedCount || 0}/${rift.totalToSpawn || 0} ${(0, this.deps._t)("처치")}` : (0, this.deps._t)("혼돈 사냥 중 발생");
      const reward = this.grandEntryRewardDescription();
      return `<div class="map-expedition-intro"><p class="map-expedition-type">${(0, this.deps._t)("공허 균열")}, ${waves}</p>
            <div class="map-expedition-heading"><strong>${(0, this.deps._t)("대균열")} ${current ? (0, this.deps._t)("진행 중") : ""}</strong>${power}</div>
            ${current ? `<p>${this.grandPanelProgress(run)}</p><div class="map-grand-summary">${this.grandSummary(run)}</div>` : `<dl><div><dt>${(0, this.deps._t)("전투 방식")}</dt><dd>${this.grandEncounterDescription()}</dd></div><div><dt>${(0, this.deps._t)("격파 보상")}</dt><dd>${reward}</dd></div></dl>`}
            ${this.grandResult(run)}<div class="map-expedition-actions">${this.grandActions(rift)}</div></div>`;
    }
  };

  // modules/ui/side-encounter-progress.mjs
  var SideEncounterProgress = class {
    constructor(deps2, links) {
      this.deps = deps2;
      this.links = links;
      this.lastHudHtml = "";
      this.lastHudHost = null;
    }
    updateGrandBreachGauge(run) {
      if (run.phase === "loot") {
        this.updateLootCollectionProgress();
        return;
      }
      const progress2 = (0, this.deps.getGrandBreachProgress)(run.gauge);
      const survival = run.phase === "survival";
      const pending = run.phase === "bossPending";
      (0, this.deps.setTextById)("ui-progress-label", (0, this.deps._t)(survival ? "균열 게이지" : pending ? "군주 소환" : "최종 전투"));
      (0, this.deps.setTextById)("ui-move-time-text", survival ? `${progress2.percent}%, ${this.links.grand.grandTimeLeft(run)}` : pending ? "100%" : (0, this.deps._t)("군주 처치"));
      (0, this.deps.setCombatProgressGaugePercent)(survival ? progress2.percent : 100);
    }
    updateReturnAction(zone) {
      const grand2 = this.deps.game.voidRift.grandRun;
      const inGrand = zone.type === "grandBreach" && grand2?.inRun;
      const inColony = zone.type === "colony" && this.deps.game.colony.inRun;
      this.deps.document.getElementById("btn-combat-return")?.toggleAttribute("data-exploration-departure", !inGrand && !inColony);
    }
    /** The HUD return button's word: 원정 포기 in a grand breach fight, 철수 in a colony run, else 귀환. */
    returnLabel(zone) {
      if (zone.type === "grandBreach" && this.deps.game.voidRift.grandRun?.inRun) return (0, this.deps._t)(this.deps.game.voidRift.grandRun.phase === "loot" ? "귀환" : "원정 포기");
      return (0, this.deps._t)(zone.type === "colony" && this.deps.game.colony.inRun ? "철수" : "귀환");
    }
    updateHud(zone) {
      this.updateReturnAction(zone);
      this.updateMeteorProgress(zone);
      this.updateColonyProgress(zone);
      this.updateEchoProgress(zone);
      const host = this.deps.document.getElementById("side-encounter-hud");
      if (!host) return;
      const run = this.deps.game.voidRift && this.deps.game.voidRift.grandRun;
      const active = zone.type === "grandBreach" && run && run.inRun;
      host.toggleAttribute("hidden", !active);
      if (!active) {
        this.lastHudHtml = "";
        return;
      }
      const html = this.links.grand.grandSummary(run);
      if (host !== this.lastHudHost || html !== this.lastHudHtml) {
        host.innerHTML = html;
        this.lastHudHtml = html;
        this.lastHudHost = host;
      }
      this.updateGrandBreachGauge(run);
    }
    dispose() {
      this.lastHudHtml = "";
      this.lastHudHost = null;
    }
    updateMeteorProgress(zone) {
      if (zone.type !== "meteor" || this.deps.game.moveTimer > 0) return;
      const bossAlive = this.deps.game.enemies.some((enemy) => enemy.isBoss && enemy.hp > 0);
      (0, this.deps.setTextById)("ui-progress-label", (0, this.deps._t)(bossAlive ? "운석 핵 파괴" : "운석 접근"));
      (0, this.deps.setTextById)("ui-move-time-text", bossAlive ? (0, this.deps._t)("처치 중") : `${this.deps.game.runProgress.toFixed(0)}%`);
    }
    /** 나무꾼의 잔상: 남은 시간. 방 단위 지도에서는 잔상이 일어설 때까지 30초 그대로 서 있다. */
    updateEchoProgress(zone) {
      const run = this.deps.game.woodsmanEchoRun;
      if (zone.type !== "woodsmanEcho" || !run || !run.active) return;
      (0, this.deps.setTextById)("ui-progress-label", (0, this.deps._t)("남은 시간"));
      (0, this.deps.setTextById)("ui-move-time-text", (0, this.deps._t)("{n}초", { n: Math.ceil(Math.max(0, run.timeLeft)) }));
      (0, this.deps.setCombatProgressGaugePercent)(run.duration > 0 ? run.timeLeft / run.duration * 100 : 0);
    }
    updateColonyProgress(zone) {
      if (zone.type !== "colony" || !this.deps.game.colony.inRun) return;
      if (this.deps.game.colony.lootPending) {
        this.updateLootCollectionProgress();
        return;
      }
      const { wave, kills, requiredKills, coreHp, coreMaxHp } = this.deps.game.colony;
      if (!coreMaxHp) {
        (0, this.deps.setTextById)("ui-progress-label", (0, this.deps._t)("{n}웨이브", { n: wave }));
        (0, this.deps.setTextById)("ui-move-time-text", `${kills}/${requiredKills} ${(0, this.deps._t)("처치")}`);
        (0, this.deps.setCombatProgressGaugePercent)(requiredKills > 0 ? kills / requiredKills * 100 : 0);
        return;
      }
      const durability = Math.max(0, Math.ceil(coreHp / coreMaxHp * 100));
      (0, this.deps.setTextById)("ui-progress-label", `${(0, this.deps._t)("{n}웨이브", { n: wave })}, ${(0, this.deps._t)("군락 핵")}`);
      (0, this.deps.setTextById)("ui-move-time-text", `${durability}%, ${kills}/${requiredKills} ${(0, this.deps._t)("처치")}`);
      (0, this.deps.setCombatProgressGaugePercent)(durability);
    }
    updateLootCollectionProgress() {
      const remaining = this.deps.actExplorationState.current(this.deps.game)?.groundLoot?.length || 0;
      (0, this.deps.setTextById)("ui-progress-label", (0, this.deps._t)("전리품 수거"));
      (0, this.deps.setTextById)("ui-move-time-text", (0, this.deps._t)("{n}개 남음", { n: remaining }));
      (0, this.deps.setCombatProgressGaugePercent)(100);
    }
  };

  // modules/ui/side-encounter-destinations.mjs
  var SideEncounterDestinations = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    destinations() {
      const blocked = (0, this.deps.isBeehiveRunLockedForMapTravel)();
      return [
        { id: "beehive", name: (0, this.deps._t)("벌집 원정"), active: this.deps.game.beehive.inRun, ready: !blocked && this.deps.game.currencies.hiveKey > 0 },
        { id: "voidrift", name: (0, this.deps._t)("대균열"), active: this.deps.game.voidRift.grandRun?.inRun, ready: !blocked && this.deps.game.voidRift.grandBreachUnlock },
        { id: "meteor", name: (0, this.deps._t)("운석 낙하"), active: this.deps.game.currentZoneId === this.deps.METEOR_FALL_ZONE_ID, ready: !blocked && this.deps.game.meteorSite.skyRiftReady }
      ];
    }
    refreshDestinations() {
      const host = this.deps.document.getElementById("map-ready-destinations");
      if (!host) return;
      const available = this.destinations().filter((row) => (0, this.deps.isMapExploreSubtabOpenable)("map-explore-" + row.id) && (row.active || row.ready));
      const current = (0, this.deps.escapeHTML)((0, this.deps._t)((0, this.deps.getZone)(this.deps.game.currentZoneId).name));
      const expanded = host.querySelector("details")?.open;
      const focused = host.querySelector("summary") === this.deps.document.activeElement;
      const links = available.map((row) => `<button type="button" onclick="switchMapExploreSubtab('map-explore-${row.id}')"><small>${(0, this.deps._t)(row.active ? "진행 중" : "입장 가능")}</small>${(0, this.deps._t)(row.name)}</button>`).join("");
      const html = `<button type="button" class="map-ready-current" onclick="switchTab('tab-battle')"><small>${(0, this.deps._t)("현재 위치")}</small>${current}</button>` + (available.length ? `<details><summary>${(0, this.deps._t)("입장 가능한 원정")} ${available.length}</summary><div>${links}</div></details>` : "");
      host.hidden = false;
      if (host._destinationsMarkup === html) return;
      host.innerHTML = html;
      host._destinationsMarkup = html;
      const details = host.querySelector("details");
      if (details) details.open = !!expanded;
      if (focused) host.querySelector("summary")?.focus({ preventScroll: true });
    }
  };

  // modules/ui/labyrinth-encounter-view.mjs
  var LabyrinthEncounterView = class {
    constructor(deps2, links) {
      this.deps = deps2;
      this.links = links;
      this.active = true;
      this.labyrinthChoice = { owner: null, season: 0, floor: 1, current: 1 };
    }
    labyrinthSelectedFloor() {
      const current = Math.max(1, Math.floor(this.deps.game.labyrinthFloor || 1));
      const max = Math.max(current, Math.floor(this.deps.game.labyrinthUnlockedMaxFloor || 1));
      const choice = this.labyrinthChoice;
      if (choice.owner !== this.deps.game || choice.season !== this.deps.game.season) {
        this.labyrinthChoice = { owner: this.deps.game, season: this.deps.game.season, floor: current, current };
      } else {
        if (choice.floor === choice.current) choice.floor = current;
        choice.current = current;
        choice.floor = Math.min(max, choice.floor);
      }
      return this.labyrinthChoice.floor;
    }
    selectLabyrinthFloor(floor) {
      if (!this.active) return;
      this.labyrinthSelectedFloor();
      const max = Math.max(1, Math.floor(this.deps.game.labyrinthUnlockedMaxFloor || this.deps.game.labyrinthFloor || 1));
      if (!Number.isInteger(floor) || floor < 1 || floor > max) return;
      this.labyrinthChoice.floor = floor;
      this.links.markup.renderPanel(this.deps.document.getElementById("ui-labyrinth-list"), this.labyrinthPanel());
    }
    async chooseLabyrinthFloor() {
      if (!this.active) return;
      const owner = this.deps.game, season = this.deps.game.season;
      const max = Math.max(1, Math.floor(this.deps.game.labyrinthUnlockedMaxFloor || this.deps.game.labyrinthFloor || 1));
      const floor = await (0, this.deps.requestGameNumber)({
        title: (0, this.deps._t)("고대 미궁 층 선택"),
        min: 1,
        max,
        value: this.labyrinthSelectedFloor(),
        confirmLabel: (0, this.deps._t)("살펴보기")
      });
      if (!this.active || this.deps.game !== owner || this.deps.game.season !== season || floor === null) return;
      this.selectLabyrinthFloor(Number(floor));
    }
    dispose() {
      this.active = false;
      this.labyrinthChoice = { owner: null, season: 0, floor: 1, current: 1 };
    }
    labyrinthRewards(floor) {
      const rows = [];
      if (this.deps.contentProgression.isUnlocked("fossil")) rows.push(["화석", "미궁 화석, 속성 화석, 심연 화석"]);
      if (this.deps.contentProgression.isUnlocked("fossilRestore")) rows.push(["복원용 화석", "원시 화석, 원시 고대 화석"]);
      if ((this.deps.game.season || 1) >= 6 && this.deps.contentProgression.canDropCurrency("sealShard")) {
        rows.push(["부적 재료", (0, this.deps._t)("봉인편린, 강력한 기운의 봉인편린{value}", { value: floor >= 30 ? (0, this.deps._t)(", 찬란한 봉인편린") : "" })]);
      }
      return rows.length ? rows.map(([title, text]) => `<div><dt>${title}</dt><dd>${text}</dd></div>`).join("") : "<div><dd>화석 제작 해금 후 획득</dd></div>";
    }
    labyrinthUniques(zone) {
      const tier = Math.min(
        (0, this.deps.getRealmEquipmentHiddenTierCap)(zone),
        this.deps.levelProgression.maxDropTier(this.deps.levelProgression.itemLevel(zone, { isBoss: true }, () => 1 - Number.EPSILON))
      );
      const names = this.deps.UNIQUE_DB.filter((item) => item.dropOnly?.type === "labyrinth" && (0, this.deps.uniqueDropsInZone)(item, zone) && (0, this.deps.uniqueMeetsTier)(item, tier)).map((item) => (0, this.deps.escapeHTML)((0, this.deps.getItemDisplayName)(item)));
      return names.length ? `<div class="labyrinth-unique-pool"><span>${(0, this.deps._t)("전용 고유")}</span>${names.map((name) => `<b>${name}</b>`).join("")}</div>` : "";
    }
    labyrinthResult() {
      const result = this.deps.game.labyrinthLastResult;
      if (!result || result.season !== this.deps.game.season) return "";
      const rewards = Object.entries(result.currencies).filter(([key, count]) => this.deps.ORB_DB[key] && count > 0).map(([key, count]) => `<span>${(0, this.deps.escapeHTML)((0, this.deps._t)(this.deps.ORB_DB[key].name))} <b>+${count}</b></span>`).join("");
      return `<div class="map-expedition-result labyrinth-result"><strong>${(0, this.deps._t)("{n}층 돌파 보상", { n: result.floor })}</strong>${rewards || `<span>${(0, this.deps._t)("재료 없음")}</span>`}</div>`;
    }
    labyrinthEntryActions(floor, max, current, blocked) {
      const action = current ? `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)("전투 보기")}</button>` : `<button type="button" data-exploration-departure onclick="enterLabyrinthFloor(${floor})" ${blocked ? `disabled data-tip="${(0, this.deps.escapeHTML)(blocked)}"` : ""}>${(0, this.deps._t)("{n}층 입장", { n: floor })}</button>`;
      const picks = [.../* @__PURE__ */ new Set([1, Math.max(1, floor - 1), Math.min(max, floor + 1), max])].filter((value) => value !== floor);
      const navigation = picks.map((value) => `<button type="button" class="labyrinth-floor-link" onclick="sideEncounterUi.selectLabyrinthFloor(${value})">${value === max ? `${(0, this.deps._t)("최고")} ` : ""}${(0, this.deps._t)("{n}층", { n: value })}</button>`).join("");
      return `<div class="map-expedition-actions">${action}${navigation}${max > 1 ? `<button type="button" onclick="sideEncounterUi.chooseLabyrinthFloor()">${(0, this.deps._t)("층 선택")}</button>` : ""}</div>`;
    }
    labyrinthPanel() {
      const floor = this.labyrinthSelectedFloor(), zone = (0, this.deps.getLabyrinthZoneNow)(floor);
      const max = Math.max(1, Math.floor(this.deps.game.labyrinthUnlockedMaxFloor || this.deps.game.labyrinthFloor || 1));
      const active = this.deps.game.currentZoneId === this.deps.LABYRINTH_ZONE_ID && !this.deps.game.combatHalted;
      const current = active && this.deps.game.labyrinthFloor === floor;
      const blocked = (0, this.deps.getZoneTravelBlockReason)(this.deps.LABYRINTH_ZONE_ID) || (0, this.deps.getHeldRunBlockReason)();
      return `<div class="map-expedition-intro labyrinth-panel"><div class="map-expedition-heading"><strong>${(0, this.deps._t)("{n}층", { n: floor })} ${(0, this.deps._t)(current ? "탐험 중" : "입장 준비")}</strong>
            <span class="labyrinth-floor-record">${(0, this.deps._t)("입장 가능 1 ~ {max}층", { max })}</span>${(0, this.deps.buildMapPowerEstimateHtml)(zone)}</div>
            <div class="labyrinth-rewards"><small>${(0, this.deps._t)("나올 수 있는 전리품")}</small><dl>${this.labyrinthRewards(floor)}</dl>${this.labyrinthUniques(zone)}</div>
            ${this.labyrinthResult()}${active && !current ? `<p class="labyrinth-current">${(0, this.deps._t)("{n}층 탐험 중", { n: this.deps.game.labyrinthFloor })}</p>` : ""}
            ${this.labyrinthEntryActions(floor, max, current, blocked)}</div>`;
    }
  };

  // modules/ui/time-rift-encounter-view.mjs
  var TimeRiftEncounterView = class {
    constructor(deps2, links) {
      this.deps = deps2;
      this.links = links;
    }
    timePressure(rift) {
      const pressure = rift.pressure;
      const locked = rift.altarOpen || [this.deps.TIME_RIFT_PAST_ZONE_ID, this.deps.TIME_RIFT_FUTURE_ZONE_ID].includes(this.deps.game.currentZoneId);
      return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${(0, this.deps._t)("시간압")} ${pressure}</strong>
            <span>${(0, this.deps._t)("혼돈 심화 {depth} 상당, 루프 {loop} 기준", { depth: (0, this.deps.getTimeRiftEquivalentChaosDepth)(pressure), loop: (0, this.deps.getTimeRiftFixedSeason)(pressure) })}</span></div>
            ${this.timeOddsHtml(rift)}
            <div class="map-expedition-actions time-rift-stepper"><button type="button" aria-label="${(0, this.deps._t)("시간압 낮추기")}" onclick="setTimeRiftPressure(-1)" ${locked || pressure <= 1 ? "disabled" : ""}>−</button>
            <b>${pressure}</b><button type="button" aria-label="${(0, this.deps._t)("시간압 높이기")}" onclick="setTimeRiftPressure(1)" ${locked || pressure >= this.deps.TIME_RIFT_MAX_PRESSURE ? "disabled" : ""}>+</button><span>${locked ? (0, this.deps._t)("이번 제단의 시간압 고정") : (0, this.deps._t)("높일수록 전투가 어렵고 옵션이 더 많이 남습니다.")}</span></div></div>`;
    }
    /** Fusion outcomes for the actual rare (six options before selection): one column per kept count, its height against the likeliest
     * count and its chance on top (2026-10-25 사용자: 자잘한 설명 말고 개수별 확률만 그래프로). */
    timeOddsHtml(rift) {
      const stats = Array.isArray(rift.altarRare?.stats) ? rift.altarRare.stats : [];
      const count = rift.altarRare ? stats.filter(Boolean).length : 6;
      const kept = (0, this.deps.getTimeRiftLossOdds)(rift.pressure, count).reverse(), top = Math.max(...kept);
      const percent = (value) => `${(value * 100).toFixed(value >= 0.1 ? 0 : value >= 0.01 ? 1 : 2)}%`;
      const columns = kept.map((value, keptCount) => `<div class="time-rift-column loss-${count - keptCount}"><small>${percent(value)}</small><span><i style="height:${(value / top * 100).toFixed(1)}%"></i></span><b>${(0, this.deps._t)("{keptCount}개", { keptCount })}</b></div>`).join("");
      return `<div class="time-rift-odds" style="--time-rift-columns:${count + 1}" role="img" aria-label="남는 옵션 개수별 확률: ${kept.map((value, keptCount) => (0, this.deps._t)("{keptCount}개 {value}", { keptCount, value: percent(value) })).join(", ")}">${columns}</div>`;
    }
    timePast(rift) {
      const current = this.deps.game.currentZoneId === this.deps.TIME_RIFT_PAST_ZONE_ID;
      const action = current ? `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)("전투 보기")}</button>` : `<button type="button" data-exploration-departure onclick="changeZone('${this.deps.TIME_RIFT_PAST_ZONE_ID}')" ${rift.altarOpen ? "disabled" : ""}>${(0, this.deps._t)("과거 입장")}</button>`;
      return `<div class="map-expedition-intro"><h3>1. ${(0, this.deps._t)("과거")}</h3><strong>${(0, this.deps._t)(rift.altarOpen ? "제단 개방 완료" : "과거를 돌파해 제단 개방")}</strong>
            ${(0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)(this.deps.TIME_RIFT_PAST_ZONE_ID))}<p>${(0, this.deps._t)("제단을 열면 장비 두 개를 올릴 수 있습니다.")}</p>
            <div class="map-expedition-actions">${action}</div></div>`;
    }
    timeAltar(rift) {
      const selected = (0, this.deps.getSelectedCraftItem)();
      const issue = (0, this.deps.isCraftSelectionEquip)() ? "장착 중인 장비는 먼저 해제하세요." : (0, this.deps.getTimeAltarItemIssue)(selected, rift);
      const filled = [rift.altarUnique, rift.altarRare].some(Boolean);
      const ready = [rift.altarUnique, rift.altarRare].every(Boolean);
      const selection = this.timeAltarSelection(selected, issue, ready);
      return `<div class="map-expedition-intro"><h3>2. ${(0, this.deps._t)("제단")}</h3><strong>${(0, this.deps._t)("같은 부위의 고유 + 희귀")}</strong>
            <div class="time-rift-items">${this.timeItemDetails(rift.altarUnique, "altarUnique", (0, this.deps._t)("고유"))}${this.timeItemDetails(rift.altarRare, "altarRare", (0, this.deps._t)("희귀"))}</div>
            ${selection}
            <div class="map-expedition-actions"><button type="button" onclick="openCraftItemPickerOverlay('altar')" ${!rift.altarOpen || ready ? "disabled" : ""}>${(0, this.deps._t)("장비 고르기")}</button>
            <button type="button" onclick="placeItemOnTimeAltar()" ${issue ? "disabled" : ""}>${(0, this.deps._t)("선택 장비 올리기")}</button>
            <button type="button" onclick="retrieveTimeAltarItems()" ${rift.altarOpen ? "" : "disabled"}>${(0, this.deps._t)(filled ? "제단 회수" : "빈 제단 닫기")}</button></div></div>`;
    }
    timeAltarSelection(selected, issue, ready) {
      if (ready) return `<p>${(0, this.deps._t)("두 장비가 준비되었습니다.")}</p>`;
      const name = selected ? `<p class="time-rift-selected">${(0, this.deps.escapeHTML)((0, this.deps._t)(selected.name))}</p>` : "";
      return `${name}<p>${(0, this.deps.escapeHTML)(issue || "이 장비를 제단에 올릴 수 있습니다.")}</p>`;
    }
    timeItemDetails(item, source, label) {
      if (!item) return `<div class="time-rift-item-empty"><span>${label}</span><span>${(0, this.deps._t)("비어 있음")}</span></div>`;
      return `<details class="time-rift-item" id="time-rift-item-${source}" data-rift-inspect="${source}" ontoggle="sideEncounterUi.inspectTimeItem(this)">
            <summary><span>${label}</span><strong>${(0, this.deps.escapeHTML)((0, this.deps.getItemDisplayName)(item))}</strong></summary><div class="time-rift-item-body"></div></details>`;
    }
    timeResultItem(rift) {
      const result = rift.lastFusion;
      if (!result) return null;
      return (0, this.deps.getEquipmentLoadoutOwnedItems)(this.deps.game).find((item) => item.fusedRelic && item.id === result.id && (0, this.deps.getEquipmentLoadoutItemIdentity)(item) === result.instanceId) || null;
    }
    inspectTimeItem(details) {
      if (!details.open || !details.isConnected) return;
      const source = details.dataset.riftInspect, rift = (0, this.deps.ensureTimeRiftState)();
      const item = source === "lastFusion" ? this.timeResultItem(rift) : ["altarUnique", "altarRare"].includes(source) ? rift[source] : null;
      const body = details.querySelector(".time-rift-item-body");
      const signature = JSON.stringify(item);
      if (body.dataset.signature === signature) return;
      body.replaceChildren(...item ? [this.deps.equipmentInspectionUi.tooltipBox(item, null, false)] : []);
      body.dataset.signature = signature;
    }
    timeResult(rift) {
      const result = rift.lastFusion;
      if (!result) return "";
      const item = this.timeResultItem(rift);
      const equipment = item ? this.timeItemDetails(item, "lastFusion", "융합 유물") : `<strong>${(0, this.deps.escapeHTML)((0, this.deps._t)(result.name))}</strong>`;
      return `<div class="map-expedition-intro time-rift-result-card"><div class="map-expedition-heading"><strong>${(0, this.deps._t)("최근 융합")}</strong>
            <span>${(0, this.deps._t)("루프")} ${result.season}, ${(0, this.deps._t)("시간압")} ${result.pressure}</span></div>${equipment}
            <dl><div><dt>${(0, this.deps._t)("계승")}</dt><dd>${(0, this.deps._t)("{inherited}개", { inherited: result.inherited })}</dd></div><div><dt>${(0, this.deps._t)("유실")}</dt><dd>${(0, this.deps._t)("{lost}개", { lost: result.lost })}</dd></div></dl><div class="map-expedition-actions"></div></div>`;
    }
    timeFuture(rift) {
      const current = this.deps.game.currentZoneId === this.deps.TIME_RIFT_FUTURE_ZONE_ID;
      const issue = (0, this.deps.getTimeRiftFutureEntryReason)(rift);
      const action = current ? `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)("전투 보기")}</button>` : `<button type="button" data-exploration-departure onclick="changeZone('${this.deps.TIME_RIFT_FUTURE_ZONE_ID}')" ${issue ? "disabled" : ""}>${(0, this.deps._t)("미래 입장")}</button>`;
      return `<div class="map-expedition-intro"><h3>${(0, this.deps._t)("3. 미래")}</h3><strong>${(0, this.deps._t)("희귀 옵션을 고유에 계승")}</strong>
            ${(0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)(this.deps.TIME_RIFT_FUTURE_ZONE_ID))}<p>${(0, this.deps.escapeHTML)(issue || "융합 준비 완료")}</p>
            <p class="time-rift-risk">${(0, this.deps._t)("실패하면 제단 장비가 파괴됩니다.")}</p>
            <details class="map-expedition-details" id="time-rift-fusion-rules"><summary>${(0, this.deps._t)("융합 규칙")}</summary>
            <p>${(0, this.deps._t)("미래 클리어 시 두 장비를 소모해 융합 유물 1개를 만듭니다. 희귀 옵션은 하나씩 시간압의 확률로 남고({TIME_RIFT_KEEP_CAP}개가 남은 뒤로는 훨씬 낮은 확률), 나머지는 사라집니다.", { TIME_RIFT_KEEP_CAP: this.deps.TIME_RIFT_KEEP_CAP })}</p>
            <p>${(0, this.deps._t)("융합 후에는 황금률/잿불가지/축복의 꽃잎만 사용할 수 있습니다.")}</p></details>
            <div class="map-expedition-actions">${action}</div></div>`;
    }
    timeRiftPanel(host, rift) {
      if (!host.querySelector(".time-rift-stages")) host.innerHTML = '<div class="time-rift-pressure"></div><section class="time-rift-result" aria-label="최근 융합"></section><div class="time-rift-stages"><section aria-label="과거" data-rift-stage="past"></section><section aria-label="제단" data-rift-stage="altar"></section><section aria-label="미래" data-rift-stage="future"></section></div>';
      this.links.markup.renderPanel(host.querySelector(".time-rift-pressure"), this.timePressure(rift));
      host.querySelector(".time-rift-result").hidden = !rift.lastFusion;
      this.links.markup.renderPanel(host.querySelector(".time-rift-result"), this.timeResult(rift));
      this.links.markup.renderPanel(host.querySelector('[data-rift-stage="past"]'), this.timePast(rift));
      this.links.markup.renderPanel(host.querySelector('[data-rift-stage="altar"]'), this.timeAltar(rift));
      this.links.markup.renderPanel(host.querySelector('[data-rift-stage="future"]'), this.timeFuture(rift));
      host.querySelectorAll("[data-rift-inspect][open]").forEach(this.inspectTimeItem.bind(this));
    }
  };

  // modules/ui/colony-encounter-view.mjs
  var ColonyEncounterView = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    colonyWavePattern(zone) {
      const patterns = { charge: "굴착 돌격 (근접 무리)", sharpshooters: "독침 사격 (예고 관통탄)", carapace: "갑각 호위 (높은 방어)", mixed: "혼합 파상 (여러 역할)", overlord: "지배체 (예고 강타)" };
      return patterns[zone.wavePattern] || "군락 방어전";
    }
    colonyPanelActions(colony2, traces) {
      const entryDisabled = traces <= 0 || colony2.inRun ? "disabled" : "";
      const withdrawDisabled = colony2.inRun ? "" : "disabled";
      const scheduled = colony2.inRun ? `<button type="button" aria-pressed="${!!colony2.returnAfterWave}" onclick="sideEncounterUi.toggleColonyReturn()">${colony2.returnAfterWave ? (0, this.deps._t)("철수 예약 취소") : (0, this.deps._t)("{returnWave}웨이브 후 철수", { returnWave: this.deps.colonyRun.returnWave(colony2) })}</button>` : "";
      return `<div class="map-expedition-actions"><button type="button" data-exploration-departure onclick="startColonyRun()" ${entryDisabled}>${(0, this.deps._t)("군락지 입장")}</button>
            <button type="button" onclick="sideEncounterUi.withdrawColony()" ${withdrawDisabled}>${(0, this.deps._t)("지금 철수")}</button>${scheduled}
            <button type="button" onclick="document.getElementById('ui-colony-ward-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' })">${(0, this.deps._t)("액막이 관리")}</button>
            <span>${(0, this.deps._t)("액막이 칸 {slotCount}/{maxSlots}, 편린 {colonyShard}개", { slotCount: this.deps.colonyWards.slotCount(), maxSlots: this.deps.COLONY_WARD_RULES.maxSlots, colonyShard: this.deps.game.currencies.colonyShard || 0 })}</span></div>`;
    }
    colonyStage(colony2) {
      if (colony2.inRun) return colony2.lootPending ? (0, this.deps._t)("{value}웨이브 전리품 수거 중", { value: colony2.wave - 1 }) : (0, this.deps._t)("{wave}웨이브, {kills}/{requiredKills}처치", { wave: colony2.wave, kills: colony2.kills, requiredKills: colony2.requiredKills });
      const result = colony2.lastResult;
      const labels = { left: "지역 이동", core: "군락 핵 파괴", defeat: "전투 불능" };
      if (result && ["scheduled", "withdraw"].includes(result.kind)) return result.completed ? (0, this.deps._t)("{completed}웨이브 방어 후 철수", { completed: result.completed }) : "철수 완료";
      if (result) return (0, this.deps._t)("{wave}웨이브, {labels}", { wave: result.wave, labels: labels[result.kind] });
      return colony2.failedWave > 0 ? (0, this.deps._t)("{failedWave}웨이브, 군락 핵 파괴", { failedWave: colony2.failedWave }) : "방어전 입장 준비";
    }
    colonyResultHtml(colony2) {
      const completed = Math.max(0, Math.floor(colony2.wave || 0) - 1);
      const returnNote = colony2.inRun ? "현재 원정" : "최근 원정";
      return `<div class="map-expedition-result"><span>${returnNote}</span><strong>${(0, this.deps._t)("완료 {completed}웨이브", { completed })}</strong><span>${(0, this.deps._t)("최고 도달 {max}웨이브", { max: Math.max(0, colony2.highestWave || 0) })}</span>
            ${colony2.returnAfterWave ? `<span>${(0, this.deps._t)("{returnAfterWave}웨이브 후 철수", { returnAfterWave: colony2.returnAfterWave })}</span>` : ""}
            ${!colony2.inRun && colony2.lastResult?.lostHeld ? `<span>${(0, this.deps._t)("보관 전리품 {lostHeld}묶음 소멸", { lostHeld: colony2.lastResult.lostHeld })}</span>` : ""}</div>`;
    }
    colonyPanel(colony2, zone) {
      const traces = Math.max(0, this.deps.game.currencies.colonyTrace || 0);
      const loot = this.deps.colonyRun.uncollected();
      const stage = this.colonyStage(colony2);
      return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${stage}</strong>${(0, this.deps.buildMapPowerEstimateHtml)(zone)}</div>
            <dl><div><dt>${(0, this.deps._t)("입장 비용")}</dt><dd>${(0, this.deps._t)("군락지 흔적 1개")}<small>${(0, this.deps._t)("보유 {traces}개, 기준 혼돈 심화 {entryDeepChaosDepth}", { traces, entryDeepChaosDepth: zone.entryDeepChaosDepth })}</small></dd></div>
            <div><dt>${colony2.lootPending ? (0, this.deps._t)("다음 적 무리") : (0, this.deps._t)("현재 적 무리")}</dt><dd>${this.colonyWavePattern(zone)}</dd></div>
            <div><dt>${(0, this.deps._t)("방어 목표")}</dt><dd>${(0, this.deps._t)("군락 핵 보호")}<small>${colony2.coreMaxHp > 0 ? (0, this.deps._t)("{ceil} / {coreMaxHp} 내구도", { ceil: Math.ceil(colony2.coreHp).toLocaleString(), coreMaxHp: colony2.coreMaxHp.toLocaleString() }) : (0, this.deps._t)("입장 시 핵 내구도 충전")}, 파괴되면 실패</small></dd></div>
            <div><dt>${(0, this.deps._t)("웨이브 돌파 보상")}</dt><dd>${(0, this.deps._t)("군락지 편린, 액막이 부적")}<small>${(0, this.deps._t)("{every}웨이브마다 액막이 확정", { every: this.deps.COLONY_WARD_RULES.colonyWave.every })}</small></dd></div>
            ${loot.held ? `<div><dt>${(0, this.deps._t)("보관 전리품")}</dt><dd>${(0, this.deps._t)("{held}묶음", { held: loot.held })}<small>${(0, this.deps._t)("지배체 처치 전 철수하면 소멸")}</small></dd></div>` : ""}
            ${loot.floor ? `<div><dt>${(0, this.deps._t)("바닥 전리품")}</dt><dd>${(0, this.deps._t)("{floor}묶음", { floor: loot.floor })}<small>${colony2.returnAfterWave && colony2.wave > colony2.returnAfterWave ? (0, this.deps._t)("수거 후 철수") : (0, this.deps._t)("수거 후 다음 웨이브")}</small></dd></div>` : ""}</dl>
            ${this.colonyResultHtml(colony2)}
            <details class="map-expedition-details" id="colony-entry-guide"><summary>${(0, this.deps._t)("입장권 획득처, 진행 규칙")}</summary>
            <p>${(0, this.deps._t)("혼돈 심화 21층 이상/벌집/대균열에서 군락지 흔적을 얻습니다. 웨이브 보상은 바로 받고, 보관 전리품은 지배체를 처치해야 떨어집니다.")}</p>
            <p>${(0, this.deps._t)("철수 시 보관 전리품은 사라지고, 바닥 전리품은 받습니다. 새 도전은 1웨이브부터 시작합니다.")}</p></details>
            ${this.colonyPanelActions(colony2, traces)}</div>`;
    }
  };

  // modules/ui/sky-tower-encounter-view.mjs
  var SkyTowerEncounterView = class {
    constructor(deps2) {
      this.deps = deps2;
    }
    skyPanel(tower) {
      if (!tower.unlocked) return `<div class="map-expedition-intro"><h3>${(0, this.deps._t)("창공의 탑, 봉인됨")}</h3>
            <p>${(0, this.deps._t)("루프 15에서 혼돈 20을 돌파하면 해금됩니다. 루프 16부터는 해금을 유지합니다.")}</p>
            <div class="map-expedition-actions"><button disabled>${(0, this.deps._t)("혼돈 입성 필요")}</button></div></div>`;
      const floor = tower.currentFloor;
      const remaining = (0, this.deps.getSkyTowerRemainingClears)();
      const first = !tower.clearedFloors.includes(floor);
      const reward = (0, this.deps.getSkyTowerRewardAmount)(floor);
      const current = this.deps.game.currentZoneId === this.deps.SKY_TOWER_ZONE_ID && !this.deps.game.combatHalted;
      const ready = (0, this.deps.canEnterSkyTower)();
      const rewardText = first ? (0, this.deps._t)("{reward}개 확정", { reward }) : (0, this.deps._t)("{max}개, 16% 확률", { max: Math.max(1, Math.floor(reward * 0.35)) });
      const title = !remaining ? current ? (0, this.deps._t)("{floor}층 연습 중", { floor }) : "이번 루프 보상 완료" : (0, this.deps._t)("{floor}층 {value}", { floor, value: current ? (0, this.deps._t)("탐험 중") : (0, this.deps._t)("입장 준비") });
      return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${title}</strong>${(0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)(this.deps.SKY_TOWER_ZONE_ID))}</div>
            <dl><div><dt>${first ? (0, this.deps._t)("첫 돌파 보상") : (0, this.deps._t)("반복 돌파 보상")}</dt><dd>${(0, this.deps._t)("응축된 창공의 정수")}<small>${remaining ? rewardText : (0, this.deps._t)("이번 루프 보상 소진, 다음 루프에 재개")}</small></dd></div>
            <div><dt>${(0, this.deps._t)("이번 루프 남은 보상 전투")}</dt><dd>${(0, this.deps._t)("{remaining} / {skyTowerLoopClearLimit}회", { remaining, skyTowerLoopClearLimit: (0, this.deps.getSkyTowerLoopClearLimit)() })}<small>${(0, this.deps._t)("첫 돌파/반복 돌파 모두 1회 사용")}</small></dd></div></dl>
            <div class="map-expedition-result"><span>${(0, this.deps._t)("영구 기록")}</span><strong>${(0, this.deps._t)("{length}개 층 돌파", { length: tower.clearedFloors.length })}</strong><span>${(0, this.deps._t)("최고 입장 {highestFloor}층", { highestFloor: tower.highestFloor })}</span></div>
            ${this.skyLastResult(tower)}
            ${ready ? "" : (0, this.deps._t)("<p>이번 루프 혼돈 입성 후 입장할 수 있습니다.</p>")}
            <details class="map-expedition-details" id="sky-tower-guide"><summary>${(0, this.deps._t)("등반, 보상 규칙")}</summary>
            <p>${(0, this.deps._t)("새 층을 돌파하면 다음 층이 열립니다. 25회 소진 후에는 등반 기록과 응축 보상이 늘지 않습니다.")}</p>
            <p>${(0, this.deps._t)("돌파 기록/응축된 창공의 정수/영구 강화는 루프를 넘어 유지됩니다. 보상 전투 횟수만 루프마다 회복됩니다.")}</p></details>
            <div class="map-expedition-actions">${this.skyEntryActions(tower, remaining, ready)}</div></div>`;
    }
    skyLastResult(tower) {
      const result = tower.lastResult;
      if (!result) return "";
      const title = result.kind === "practice" ? "연습 완료" : result.kind === "first" ? "첫 돌파" : "반복 돌파";
      const reward = result.kind === "practice" ? "등반 보상 없음" : result.condensedPower > 0 ? (0, this.deps._t)("응축된 창공의 정수 +{condensedPower}", { condensedPower: result.condensedPower }) : "정수 없음";
      return `<div class="map-expedition-result"><strong>${(0, this.deps._t)("{floor}층 {title}", { floor: result.floor, title })}</strong><span>${reward}</span></div>`;
    }
    skyEntryActions(tower, remaining, ready) {
      const disabled = ready ? "" : "disabled";
      const action = this.deps.game.currentZoneId === this.deps.SKY_TOWER_ZONE_ID && !this.deps.game.combatHalted ? `<button onclick="switchTab('tab-battle')">${(0, this.deps._t)("전투 보기")}</button>` : `<button data-exploration-departure onclick="enterSkyTowerPrompt(${tower.currentFloor})" ${disabled}>${(0, this.deps._t)("{currentFloor}층 {value}", { currentFloor: tower.currentFloor, value: remaining ? (0, this.deps._t)("입장") : (0, this.deps._t)("연습 입장") })}</button>`;
      const other = tower.highestFloor > 1 ? `<button data-exploration-departure onclick="enterSkyTowerPrompt()" ${disabled}>${(0, this.deps._t)("다른 층 선택")}</button>` : "";
      const next = ready ? "" : this.deps.contentUnlockUi.progressButton("map-explore-chaos", "혼돈으로 가는 길 보기");
      return action + other + next;
    }
    skyGrowth(tower) {
      const level = tower.skyStone.level;
      const max = (0, this.deps.getSkyStoneMaxLevel)();
      const cost = (0, this.deps.getSkyStoneNextCost)();
      const gemUnlocked = this.deps.contentProgression.isUnlocked("gemForge");
      return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${(0, this.deps._t)("영구 강화")}</strong><span>${(0, this.deps._t)("응축된 창공의 정수 {condensedPower}개", { condensedPower: tower.condensedPower })}</span></div>
            <dl><div><dt>${(0, this.deps._t)("창공석, {level}/{max}", { level, max })}</dt><dd>${(0, this.deps._t)("지하계 중력 패널티 감소 {skyStoneReductionPct}%", { skyStoneReductionPct: (0, this.deps.getSkyStoneReductionPct)() })}<small>${level >= max ? (0, this.deps._t)("최대 강화") : (0, this.deps._t)("다음 단계 {value}%, 필요 {cost}개", { value: (0, this.deps.getSkyStoneReductionPct)() + 5, cost })}</small></dd></div>
            <div><dt>${(0, this.deps._t)("공격 룬 영구 강화")}</dt><dd>${(0, this.deps._t)("룬 레벨 최대 +{skyTowerGemBoostMaxLevel}", { skyTowerGemBoostMaxLevel: (0, this.deps.getSkyTowerGemBoostMaxLevel)() })}<small>${gemUnlocked ? (0, this.deps._t)("룬별 60 → 120 → 240개") : (0, this.deps._t)("룬 강화 해금 필요")}</small></dd></div></dl>
            <div class="map-expedition-actions"><button onclick="upgradeSkyStone()" ${level >= max || tower.condensedPower < cost ? "disabled" : ""}>${(0, this.deps._t)("창공석 {value}", { value: level ? (0, this.deps._t)("강화") : (0, this.deps._t)("제작") })}</button>
            <button onclick="switchTab('tab-skills'); switchSkillSubtab('skill-tab-enhance')" ${gemUnlocked ? "" : "disabled"}>${(0, this.deps._t)("룬 강화로 이동")}</button></div></div>`;
    }
  };

  // modules/ui/side-encounter-actions.mjs
  var SideEncounterActions = class {
    constructor(deps2) {
      this.deps = deps2;
      this.active = true;
      this.colonyWithdrawPending = null;
      this.grandWithdrawPending = null;
    }
    toggleColonyReturn() {
      if (!this.active) return;
      if (this.deps.colonyRun.toggleReturn()) (0, this.deps.updateStaticUI)();
    }
    returnFromBattle() {
      if (!this.active) return false;
      if (this.deps.game.currentZoneId === "colony_run" && this.deps.game.colony.inRun) return this.withdrawColony();
      if (this.deps.game.currentZoneId === "grand_breach_run" && this.deps.game.voidRift.grandRun?.inRun) return this.withdrawGrandBreach();
      return (0, this.deps.returnToTown)();
    }
    pendingCurrent(view) {
      return !!view && this.active && view.owner === this.deps.game && view.run === this.deps.game.actExploration;
    }
    withdrawalPending() {
      return this.pendingCurrent(this.colonyWithdrawPending) || this.pendingCurrent(this.grandWithdrawPending);
    }
    withdrawalCurrent(view, encounter, zoneId, stage) {
      return this.deps.game === view.owner && encounter === view.encounter && encounter.inRun && this.deps.game.currentZoneId === zoneId && this.deps.game.actExploration === view.run && stage === view.stage && JSON.stringify(encounter.pendingLoot) === view.held;
    }
    async withdrawGrandBreach() {
      if (!this.active) return false;
      const grand2 = this.deps.game.voidRift.grandRun;
      if (this.pendingCurrent(this.grandWithdrawPending) || !grand2?.inRun || this.deps.game.currentZoneId !== "grand_breach_run") return false;
      if (grand2.phase === "loot") {
        (0, this.deps.returnToTown)();
        return true;
      }
      const view = { owner: this.deps.game, encounter: grand2, run: this.deps.game.actExploration, stage: grand2.phase, held: JSON.stringify(grand2.pendingLoot) };
      const message = grand2.pendingLoot.length ? (0, this.deps._t)("보관 전리품 {length}묶음을 포기하고 귀환할까요?", { length: grand2.pendingLoot.length }) : "대균열을 포기하고 귀환할까요?";
      return this.confirmGrandWithdrawal(view, message);
    }
    async confirmGrandWithdrawal(view, message) {
      this.grandWithdrawPending = view;
      try {
        const accepted = await (0, this.deps.requestGameConfirmation)(message, { kicker: (0, this.deps._t)("대균열"), title: (0, this.deps._t)("원정 포기"), tone: "danger", confirmLabel: (0, this.deps._t)("포기"), cancelLabel: (0, this.deps._t)("계속 전투"), dismissOnBackdrop: false });
        if (!accepted || !this.active) return false;
        if (!this.withdrawalCurrent(view, this.deps.game.voidRift.grandRun, "grand_breach_run", this.deps.game.voidRift.grandRun?.phase)) {
          (0, this.deps.addLog)((0, this.deps._t)("원정 상태가 바뀌었습니다. 다시 확인하세요."), "attack-monster");
          return false;
        }
        (0, this.deps.returnToTown)();
        return true;
      } finally {
        if (this.grandWithdrawPending === view) this.grandWithdrawPending = null;
      }
    }
    async withdrawColony() {
      if (!this.active) return false;
      const colony2 = this.deps.game.colony;
      if (this.pendingCurrent(this.colonyWithdrawPending) || !colony2.inRun || this.deps.game.currentZoneId !== "colony_run") return false;
      const view = { owner: this.deps.game, encounter: colony2, run: this.deps.game.actExploration, stage: colony2.wave, held: JSON.stringify(colony2.pendingLoot) };
      const message = colony2.pendingLoot.length ? (0, this.deps._t)("보관 전리품 {length}묶음을 포기하고 철수할까요?", { length: colony2.pendingLoot.length }) : "군락지에서 철수할까요?";
      this.colonyWithdrawPending = view;
      try {
        const accepted = await (0, this.deps.requestGameConfirmation)(
          message,
          { title: (0, this.deps._t)("군락지 철수"), confirmLabel: (0, this.deps._t)("철수"), cancelLabel: (0, this.deps._t)("취소"), dismissOnBackdrop: false }
        );
        if (!accepted || !this.active) return false;
        if (!this.withdrawalCurrent(view, this.deps.game.colony, "colony_run", this.deps.game.colony.wave)) {
          (0, this.deps.addLog)((0, this.deps._t)("군락지 원정이 바뀌었습니다. 다시 확인하세요."), "attack-monster");
          return false;
        }
        (0, this.deps.forfeitColonyRun)();
        return true;
      } finally {
        if (this.colonyWithdrawPending === view) this.colonyWithdrawPending = null;
      }
    }
    dispose() {
      this.active = false;
      this.colonyWithdrawPending = null;
      this.grandWithdrawPending = null;
    }
  };

  // modules/side-encounter-ui-classic.mjs
  var deps = {
    get COLONY_WARD_RULES() {
      return COLONY_WARD_RULES;
    },
    get GRAND_BREACH_ENCOUNTER() {
      return GRAND_BREACH_ENCOUNTER;
    },
    get LABYRINTH_ZONE_ID() {
      return LABYRINTH_ZONE_ID;
    },
    get METEOR_FALL_ZONE_ID() {
      return METEOR_FALL_ZONE_ID;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get SKY_TOWER_ZONE_ID() {
      return SKY_TOWER_ZONE_ID;
    },
    get TIME_RIFT_FUTURE_ZONE_ID() {
      return TIME_RIFT_FUTURE_ZONE_ID;
    },
    get TIME_RIFT_KEEP_CAP() {
      return TIME_RIFT_KEEP_CAP;
    },
    get TIME_RIFT_MAX_PRESSURE() {
      return TIME_RIFT_MAX_PRESSURE;
    },
    get TIME_RIFT_PAST_ZONE_ID() {
      return TIME_RIFT_PAST_ZONE_ID;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get _t() {
      return _t;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get addLog() {
      return addLog;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get canEnterSkyTower() {
      return canEnterSkyTower;
    },
    get captureUiDisclosureState() {
      return captureUiDisclosureState;
    },
    get colonyRun() {
      return window.GameModules.colonyRun;
    },
    get colonyWards() {
      return colonyWards;
    },
    get contentProgression() {
      return contentProgression;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get document() {
      return document;
    },
    get ensureTimeRiftState() {
      return ensureTimeRiftState;
    },
    get equipmentInspectionUi() {
      return equipmentInspectionUi;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get forfeitColonyRun() {
      return forfeitColonyRun;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getEquipmentLoadoutItemIdentity() {
      return getEquipmentLoadoutItemIdentity;
    },
    get getEquipmentLoadoutOwnedItems() {
      return getEquipmentLoadoutOwnedItems;
    },
    get getGrandBreachProgress() {
      return getGrandBreachProgress;
    },
    get getGrandBreachRewardSummary() {
      return getGrandBreachRewardSummary;
    },
    get getHeldRunBlockReason() {
      return getHeldRunBlockReason;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get getLabyrinthZoneNow() {
      return getLabyrinthZoneNow;
    },
    get getMeteorKind() {
      return getMeteorKind;
    },
    get getRealmEquipmentHiddenTierCap() {
      return getRealmEquipmentHiddenTierCap;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get getSkyStoneMaxLevel() {
      return getSkyStoneMaxLevel;
    },
    get getSkyStoneNextCost() {
      return getSkyStoneNextCost;
    },
    get getSkyStoneReductionPct() {
      return getSkyStoneReductionPct;
    },
    get getSkyTowerGemBoostMaxLevel() {
      return getSkyTowerGemBoostMaxLevel;
    },
    get getSkyTowerLoopClearLimit() {
      return getSkyTowerLoopClearLimit;
    },
    get getSkyTowerRemainingClears() {
      return getSkyTowerRemainingClears;
    },
    get getSkyTowerRewardAmount() {
      return getSkyTowerRewardAmount;
    },
    get getTimeAltarItemIssue() {
      return getTimeAltarItemIssue;
    },
    get getTimeRiftEquivalentChaosDepth() {
      return getTimeRiftEquivalentChaosDepth;
    },
    get getTimeRiftFixedSeason() {
      return getTimeRiftFixedSeason;
    },
    get getTimeRiftFutureEntryReason() {
      return getTimeRiftFutureEntryReason;
    },
    get getTimeRiftLossOdds() {
      return getTimeRiftLossOdds;
    },
    get getZone() {
      return getZone;
    },
    get getZoneTravelBlockReason() {
      return getZoneTravelBlockReason;
    },
    get isBeehiveRunLockedForMapTravel() {
      return isBeehiveRunLockedForMapTravel;
    },
    get isCraftSelectionEquip() {
      return isCraftSelectionEquip;
    },
    get isMapExploreSubtabOpenable() {
      return isMapExploreSubtabOpenable;
    },
    get levelProgression() {
      return levelProgression;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get requestGameNumber() {
      return requestGameNumber;
    },
    get restoreUiDisclosureState() {
      return restoreUiDisclosureState;
    },
    get returnToTown() {
      return returnToTown;
    },
    get setCombatProgressGaugePercent() {
      return setCombatProgressGaugePercent;
    },
    get setTextById() {
      return setTextById;
    },
    get uniqueDropsInZone() {
      return uniqueDropsInZone;
    },
    get uniqueMeetsTier() {
      return uniqueMeetsTier;
    },
    get updateStaticUI() {
      return updateStaticUI;
    }
  };
  var markup = new SideEncounterMarkup(deps);
  var expedition = new SideExpeditionView(deps, { markup });
  var grand = new GrandBreachView(deps);
  var progress = new SideEncounterProgress(deps, { grand });
  var destinations = new SideEncounterDestinations(deps);
  var labyrinth = new LabyrinthEncounterView(deps, { markup });
  var time = new TimeRiftEncounterView(deps, { markup });
  var colony = new ColonyEncounterView(deps);
  var sky = new SkyTowerEncounterView(deps);
  var actions = new SideEncounterActions(deps);
  var sideEncounterUi = Object.freeze({
    dispose() {
      actions.dispose();
      labyrinth.dispose();
      progress.dispose();
    },
    hiveSummary: expedition.hiveSummary.bind(expedition),
    updateHud: progress.updateHud.bind(progress),
    returnLabel: progress.returnLabel.bind(progress),
    withdrawalPending: actions.withdrawalPending.bind(actions),
    refreshDestinations: destinations.refreshDestinations.bind(destinations),
    hivePanel: expedition.hivePanel.bind(expedition),
    grandPanel: grand.grandPanel.bind(grand),
    meteorPanel: expedition.meteorPanel.bind(expedition),
    labyrinthPanel: labyrinth.labyrinthPanel.bind(labyrinth),
    selectLabyrinthFloor: labyrinth.selectLabyrinthFloor.bind(labyrinth),
    chooseLabyrinthFloor: labyrinth.chooseLabyrinthFloor.bind(labyrinth),
    timeRiftPanel: time.timeRiftPanel.bind(time),
    inspectTimeItem: time.inspectTimeItem.bind(time),
    colonyPanel: colony.colonyPanel.bind(colony),
    toggleColonyReturn: actions.toggleColonyReturn.bind(actions),
    withdrawColony: actions.withdrawColony.bind(actions),
    withdrawGrandBreach: actions.withdrawGrandBreach.bind(actions),
    returnFromBattle: actions.returnFromBattle.bind(actions),
    skyPanel: sky.skyPanel.bind(sky),
    skyGrowth: sky.skyGrowth.bind(sky),
    renderPanel: markup.renderPanel.bind(markup)
  });
  window.GameModules.sideEncounterView = sideEncounterUi;
  safeExposeGlobals({ sideEncounterUi });
})();
