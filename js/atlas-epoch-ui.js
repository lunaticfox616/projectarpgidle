// GENERATED from modules/atlas-epoch-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/atlas-epoch-actions.mjs
  function perkText(runtime, perk) {
    if (perk.effect) return Object.entries(perk.effect).map(([key, value]) => `${runtime.state.labels[key][0]} +${value}${runtime.state.labels[key][1]}`).join(", ") + " / 단계";
    if (perk.points) return (0, runtime.deps._t)("아틀라스 포인트 +{points} / 단계", { points: perk.points });
    if (perk.offline) return (0, runtime.deps._t)("방치 효율 +{round}%p / 단계", { round: Math.round(perk.offline * 100) });
    return `루프 시작 때 ${perk.supply.map(([key, amount]) => `${(0, runtime.deps._t)(runtime.deps.ORB_DB[key].name)} ${amount}`).join(", ")} / 단계`;
  }
  async function rebirth(runtime) {
    const owner = runtime.deps.game, target = owner.atlas, why = runtime.deps.atlasEpoch.reason(owner);
    if (why) return (0, runtime.deps.addLog)(why, "attack-monster");
    const reviewed = rebirthReview(runtime, owner), gained = runtime.deps.atlasEpoch.essenceFor(owner), before = target.epoch.essence;
    const accepted = await (0, runtime.deps.requestGameConfirmation)(
      (0, runtime.deps._t)("아틀라스 완료, 보너스, 패시브, 씨앗, 후반부 진행(깨어남과 재료)과 이번 루프의 지도석, 각인이 사라지고, 세계수 정수 {gained}개를 받습니다. 특전, 해금, 자동 지도 설정은 남습니다.", { gained }),
      { title: (0, runtime.deps._t)("시대 재생"), tone: "danger", confirmLabel: (0, runtime.deps._t)("재생"), cancelLabel: (0, runtime.deps._t)("그만두기") }
    );
    if (!accepted) return;
    if (runtime.deps.game !== owner || runtime.deps.game.atlas !== target || rebirthReview(runtime, owner) !== reviewed) {
      return (0, runtime.deps.addLog)((0, runtime.deps._t)("확인 중 저장이나 아틀라스 진행이 바뀌어 시대 재생을 취소했습니다. 현재 상태를 다시 확인하세요."), "attack-monster");
    }
    const reason = runtime.deps.atlasEpoch.rebirth(owner);
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    runtime.deps.atlas.sync(owner);
    runtime.state.lastRebirth = { owner, target, season: owner.season, epoch: target.epoch.count, gained: target.epoch.essence - before, maps: target.stash.length };
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🌳 시대 재생 {count}회, 세계수 정수 +{gained}, 새 지도석 {maps}개", { count: target.epoch.count, gained: runtime.state.lastRebirth.gained, maps: runtime.state.lastRebirth.maps }), "loot-unique");
    (0, runtime.deps.queueImportantSave)(100);
    runtime.deps.atlasUi.refresh();
    runtime.deps.document.querySelector("#ui-atlas .atlas-epoch-restart")?.scrollIntoView({ block: "start" });
  }
  function chooseMap(runtime) {
    const busy = runtime.deps.atlas.runOpenReason(runtime.deps.game);
    if (busy) return (0, runtime.deps.addLog)(busy, "attack-monster");
    runtime.deps.atlasUi.setView("maps");
    const map = runtime.deps.game.atlas.stash[0];
    if (map) runtime.deps.atlasUi.selectMap(map.uid, true);
  }
  function buy(runtime, id) {
    const reason = runtime.deps.atlasEpoch.buy(runtime.deps.game, id);
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🌳 {name} {rank}단계", { name: runtime.deps.atlasEpoch.perks.get(id).name, rank: runtime.deps.atlasEpoch.rank(runtime.deps.game, id) }), "season-up");
    (0, runtime.deps.queueImportantSave)(200);
    runtime.deps.atlasUi.refresh();
  }
  function perkHtml(runtime, perk) {
    const level = runtime.deps.atlasEpoch.rank(runtime.deps.game, perk.id), full = level >= perk.max, reason = runtime.deps.atlasEpoch.buyReason(runtime.deps.game, perk.id);
    return `<div class="atlas-perk${level ? " is-taken" : ""}"><div><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(perk.name))} <span>${level}/${perk.max}</span></strong><small>${(0, runtime.deps.escapeHTML)(perkText(runtime, perk))}</small></div>
            <button onclick="atlasEpochUi.buy('${perk.id}')" ${reason ? "disabled" : ""} data-tip="${(0, runtime.deps.escapeHTML)(reason || "")}">${full ? (0, runtime.deps._t)("최대") : (0, runtime.deps._t)("정수 {cost}", { cost: runtime.deps.atlasEpoch.cost(runtime.deps.game, perk.id) })}</button></div>`;
  }
  function rebirthReceipt(runtime) {
    if (!runtime.state.lastRebirth || runtime.state.lastRebirth.owner !== runtime.deps.game || runtime.state.lastRebirth.target !== runtime.deps.game.atlas || runtime.state.lastRebirth.season !== runtime.deps.game.season || runtime.state.lastRebirth.epoch !== runtime.deps.game.atlas.epoch.count) return null;
    return runtime.state.lastRebirth;
  }
  function restartState(runtime) {
    const st = runtime.deps.game.atlas;
    if (!st.epoch.count || st.seeds || st.completed.length) return null;
    const reason = runtime.deps.atlas.runOpenReason(runtime.deps.game) || (!st.stash.length ? "지도석이 없습니다. 이번 루프의 혼돈 20을 클리어하거나 혼돈 20 이상 보스를 처치하세요." : "");
    return { receipt: rebirthReceipt(runtime), reason };
  }
  function restartHtml(runtime) {
    const next = restartState(runtime);
    if (!next) return "";
    const { receipt, reason } = next;
    const received = receipt ? `<p>${(0, runtime.deps._t)("세계수 정수")} <b>+${receipt.gained}</b>${(0, runtime.deps._t)(", 새 지도석")} <b>${(0, runtime.deps._t)("{maps}개", { maps: receipt.maps })}</b>${(0, runtime.deps._t)("를 받았습니다.")}</p>` : "";
    return `<section class="atlas-epoch-restart" aria-label="${(0, runtime.deps._t)("시대 재생 후 성장")}"><h3>${receipt ? (0, runtime.deps._t)("시대 재생 완료") : (0, runtime.deps._t)("새 시대의 시작")}</h3>${received}
            <p>${(0, runtime.deps._t)("보유 정수")} <b>${(0, runtime.deps._t)("{essence}개", { essence: runtime.deps.game.atlas.epoch.essence })}</b></p>
            <div><button type="button" onclick="atlasEpochUi.chooseMap()" ${reason ? "disabled" : ""}>${(0, runtime.deps._t)("새 지도 고르기")}</button><span>${(0, runtime.deps._t)("보관함 {length}개", { length: runtime.deps.game.atlas.stash.length })}</span></div>
            ${reason ? `<p class="atlas-muted">${reason}</p>` : ""}</section>`;
  }
  function html(runtime) {
    const epoch = runtime.deps.game.atlas.epoch, why = runtime.deps.atlasEpoch.reason(runtime.deps.game), restart = restartHtml(runtime);
    const head = `<section class="atlas-epoch-head"><div><h3>${(0, runtime.deps._t)("시대 재생")} <span>${(0, runtime.deps._t)("{count}회", { count: epoch.count })}</span></h3>
            <p class="atlas-muted">${(0, runtime.deps._t)("세계수 씨앗 {seeds}/{max}, 현재 진행 기준 예상 정수 {essenceFor}개 (기본 {base}, 지도 노드 완료 {perCompleted}개마다 1, 보너스 {perBonus}개마다 1, 씨앗마다 {perSeed})", { seeds: runtime.deps.game.atlas.seeds, max: runtime.deps.ATLAS.seeds.max, essenceFor: runtime.deps.atlasEpoch.essenceFor(runtime.deps.game), base: runtime.deps.ATLAS.epoch.essence.base, perCompleted: runtime.deps.ATLAS.epoch.essence.perCompleted, perBonus: runtime.deps.ATLAS.epoch.essence.perBonus, perSeed: runtime.deps.ATLAS.epoch.essence.perSeed })}</p>
            <p class="atlas-muted">${(0, runtime.deps._t)("초기화: 완료, 보너스, 패시브, 씨앗, 후반부 진행, 이번 루프의 지도석과 각인. 유지: 특전, 해금, 자동 지도, 각인 홈 설정.")}</p></div>
            <div class="atlas-epoch-action"><strong>${(0, runtime.deps._t)("세계수 정수 {essence}", { essence: epoch.essence })}</strong>${why ? `<p class="atlas-lock">${why}</p>` : ""}
            <button class="atlas-primary" onclick="atlasEpochUi.rebirth()" ${why ? "disabled" : ""}>${(0, runtime.deps._t)("시대 재생")}</button></div></section>`;
    const perks = `<div class="atlas-perks">${runtime.deps.ATLAS.epoch.perks.map(runtime.handlers.perkHtml).join("")}</div>`;
    return `<div class="atlas-epoch">${restart ? `${restart}${perks}${head}` : `${head}${perks}`}</div>`;
  }
  function rebirthReview(runtime, owner) {
    const { completed, bonus, passives, seeds, stash, fragments, run, endgame, epoch } = owner.atlas;
    return JSON.stringify([
      owner.season,
      { completed, bonus, passives, seeds, stash, fragments, run, endgame, epoch },
      (0, runtime.deps.hasCurrentLoopChaos20Clear)(owner),
      runtime.deps.atlasEndgame.loopKeptCurrencies(owner)
    ]);
  }

  // modules/ui/atlas-epoch-view.mjs
  function createAtlasEpochView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { perkHtml, html, rebirth, buy, chooseMap };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ html: runtime.handlers.html, rebirth: runtime.handlers.rebirth, buy: runtime.handlers.buy, chooseMap: runtime.handlers.chooseMap });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.labels = runtime.deps.ATLAS_PASSIVES.labels;
    runtime.state.lastRebirth = null;
  }

  // modules/atlas-epoch-ui-classic.mjs
  var atlasEpochUi = createAtlasEpochView({
    get _t() {
      return _t;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get atlasEpoch() {
      return atlasEpoch;
    },
    get addLog() {
      return addLog;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get atlas() {
      return atlas;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get atlasUi() {
      return atlasUi;
    },
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get ATLAS() {
      return ATLAS;
    },
    get hasCurrentLoopChaos20Clear() {
      return hasCurrentLoopChaos20Clear;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get ATLAS_PASSIVES() {
      return ATLAS_PASSIVES;
    }
  });
  safeExposeGlobals({ atlasEpochUi });
})();
