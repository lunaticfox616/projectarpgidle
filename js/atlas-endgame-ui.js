// GENERATED from modules/atlas-endgame-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/atlas-endgame-actions.mjs
  function setFilter(runtime, value) {
    if (!["all", "ready", "undefeated"].includes(value)) return;
    runtime.state.filter = value;
    runtime.deps.atlasUi.refresh();
    runtime.deps.document.querySelector(`[data-atlas-fight-filter="${runtime.state.filter}"]`)?.focus();
  }
  function showSource(runtime, item) {
    if (!Object.hasOwn(runtime.state.E.items, item)) return;
    const guardian = Object.entries(runtime.state.E.guardianShears).find(([, material]) => material === item);
    runtime.deps.atlasUi.setView("maps");
    if (guardian) runtime.deps.atlasUi.selectNode(`${guardian[0]}_g`, true);
    else runtime.deps.atlasUi.revealStash();
  }
  function preparePinnacle(runtime) {
    runtime.deps.atlasUi.setView("maps");
    runtime.deps.atlasUi.selectNode("pinnacle", true);
  }
  function showFight(runtime, id) {
    if (!runtime.deps.atlasEndgame.def(id)) return;
    runtime.state.filter = "all";
    runtime.deps.atlasUi.refresh();
    const card = runtime.deps.document.querySelector(`[data-atlas-fight="${id}"]`);
    card?.scrollIntoView({ block: "start" });
    card?.focus({ preventScroll: true });
  }
  function challenge(runtime, id) {
    const reason = runtime.deps.atlasRun.openEndgame(id);
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    if (runtime.state.E.stories[id]) (0, runtime.deps.addLog)((0, runtime.deps.escapeHTML)(runtime.state.E.stories[id].entry), "season-up");
    (0, runtime.deps.queueImportantSave)(200);
    runtime.deps.atlasUi.refresh();
    (0, runtime.deps.switchTab)("tab-battle");
  }
  function entryHtml(runtime, entry) {
    return entry.map((row) => `<span class="${row.have >= row.need ? "is-on" : ""}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))} ${row.have}/${row.need}</span>`).join("");
  }
  function sourcesHtml(runtime, fight) {
    const missing = fight.entry.filter((row) => row.have < row.need);
    if (!missing.length) return "";
    const rows = missing.map((row) => {
      const apostle = runtime.state.E.apostles.find((entry) => entry.item === row.item);
      const regions = apostle ? (0, runtime.deps._t)(", {regions}의 마름 지도", { regions: apostle.regions.map(runtime.handlers.regionName).join(", ") }) : "";
      const guardian = Object.values(runtime.state.E.guardianShears).includes(row.item);
      return `<li><b>${(0, runtime.deps._t)("{name} {value}개 부족", { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name)), value: row.need - row.have })}</b><span>${(0, runtime.deps.escapeHTML)(runtime.state.E.items[row.item].from + regions)}</span>
                <button type="button" onclick="atlasEndgameUi.showSource('${row.item}')">${guardian ? (0, runtime.deps._t)("수호자 지도 보기") : (0, runtime.deps._t)("지도 보관함 보기")}</button></li>`;
    }).join("");
    return `<details class="atlas-material-sources"><summary>${(0, runtime.deps._t)("부족한 재료 획득처")}</summary><ul>${rows}</ul></details>`;
  }
  function fightHtml(runtime, fight, block) {
    const row = fight.row, tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, runtime.deps.atlas.node(row.id)), why = fight.reason || block, [who, where] = titleOf(runtime, row);
    const lockId = `atlas-late-lock-${row.id}`;
    return `<div class="atlas-late-card${why ? "" : " is-ready"}${fight.unlocked ? "" : " is-locked"}" data-atlas-fight="${row.id}" tabindex="-1">
            <strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(who))}</strong><small>${(0, runtime.deps.escapeHTML)(where)}, ${tier}등급, ${row.stages.length}단계${fight.kills ? (0, runtime.deps._t)(", 처치 {kills}회", { kills: fight.kills }) : ""}</small>
            ${powerHtml(runtime, row, tier)}<div class="atlas-late-entry">${entryHtml(runtime, fight.entry)}</div>
            ${sourcesHtml(runtime, fight)}${fight.lock ? `<p class="atlas-lock" id="${lockId}">${(0, runtime.deps.escapeHTML)(fight.lock)}</p>` : ""}
            <button class="atlas-primary" data-exploration-departure onclick="atlasEndgameUi.challenge('${row.id}')" aria-label="${(0, runtime.deps._t)("{who} 도전", { who: (0, runtime.deps.escapeHTML)(who) })}"
                ${fight.lock ? `aria-describedby="${lockId}"` : ""} ${why ? `disabled data-tip="${(0, runtime.deps.escapeHTML)(why)}"` : ""}>${(0, runtime.deps._t)("도전")}</button></div>`;
  }
  function departBlock(runtime) {
    return runtime.deps.atlas.runOpenReason(runtime.deps.game) || runtime.deps.atlas.lockReason(runtime.deps.game) || runtime.deps.atlasRun.blockReason();
  }
  function headHtml(runtime, view, block) {
    if (!view.awakened) return `<section class="atlas-late-head"><h3>${(0, runtime.deps._t)("잠든 아틀라스")}</h3>
            <p class="atlas-muted">${(0, runtime.deps._t)("정점을 쓰러뜨리면 열립니다.")}</p>
            <button type="button" onclick="atlasEndgameUi.preparePinnacle()">${(0, runtime.deps._t)("정점 준비 보기")}</button></section>`;
    const fights = [...view.apexes, ...view.leagues];
    const filters = [
      ["all", "전체", fights.length],
      ["ready", "도전 가능", fights.filter((fight) => ready(runtime, fight, block)).length],
      ["undefeated", "미처치", fights.filter((fight) => !fight.kills).length]
    ];
    return `<section class="atlas-late-head"><h3>${(0, runtime.deps._t)("깨어난 아틀라스")}</h3>
            <p class="atlas-muted">최종 보스 ${view.apexes.filter((fight) => fight.kills > 0).length}/${view.apexes.length}종 격파</p>
            <p class="atlas-muted">나이테가 목격한 처치 ${view.witness}회, ${runtime.deps.atlasEndgame.count(runtime.deps.game, "ringInvite") >= runtime.state.E.itemCap ? (0, runtime.deps._t)("초대장이 보관 한도({itemCap}개)라 더 받지 못합니다", { itemCap: runtime.state.E.itemCap }) : (0, runtime.deps._t)("다음 초대장까지 {value}/{witnessPer}", { value: view.witness % view.witnessPer, witnessPer: view.witnessPer })}</p>
            ${block ? `<p class="atlas-lock">${(0, runtime.deps.escapeHTML)(block)}</p>` : ""}
            <nav class="atlas-fight-filters" aria-label="${(0, runtime.deps._t)("보스 목록")}">${filters.map(([id, label, count]) => `<button type="button" data-atlas-fight-filter="${id}"
                aria-pressed="${runtime.state.filter === id}" onclick="atlasEndgameUi.setFilter('${id}')">${label} ${count}</button>`).join("")}</nav></section>`;
  }
  function blightHtml(runtime, view) {
    if (!view.gardenerDown) return "";
    const shard = (region) => {
      const apostle = runtime.state.E.apostles.find((row) => row.regions.includes(region.id));
      return apostle ? runtime.state.E.items[apostle.item].name : "";
    };
    const chips = view.blight.map(({ region, level }) => `<span style="--tint:${region.tint}"><i></i>${(0, runtime.deps._t)(region.name)} ${level}/${runtime.state.E.blight.max}${shard(region) ? `, ${shard(region)}` : ""}</span>`).join("");
    return `<section class="atlas-late-group"><h3>${(0, runtime.deps._t)("마름")}</h3>
            <div class="atlas-late-blight">${chips}</div></section>`;
  }
  function groupHtml(runtime, title, fights, block, awakened) {
    const shown = fights.filter((fight) => !awakened || runtime.state.filter === "all" || (runtime.state.filter === "ready" ? ready(runtime, fight, block) : !fight.kills));
    if (!shown.length) return "";
    return `<section class="atlas-late-group"><h3>${title}</h3><div class="atlas-late-cards">${shown.map((fight) => fightHtml(runtime, fight, block)).join("")}</div></section>`;
  }
  function html(runtime) {
    const view = runtime.deps.atlasEndgame.overview(runtime.deps.game), block = view.awakened ? departBlock(runtime) : "";
    const ancientIds = new Set(runtime.deps.ATLAS.lore.bosses.map((row) => row.id));
    const groups = [["sun", "태양의 계열"], ["moon", "달의 계열"], ["pinnacle", "피나클"]].map(([path, title]) => {
      const fights = runtime.deps.ATLAS.lore.bosses.filter((row) => row.path === path).map((row) => view.apexes.find((fight) => fight.row.id === row.id));
      return groupHtml(runtime, (0, runtime.deps._t)(title), fights, block, view.awakened);
    }).join("") + groupHtml(runtime, (0, runtime.deps._t)("남겨진 시련"), view.apexes.filter((fight) => !ancientIds.has(fight.row.id)), block, view.awakened) + groupHtml(runtime, (0, runtime.deps._t)("리그 우두머리"), view.leagues, block, view.awakened);
    return `<div class="atlas-late">${headHtml(runtime, view, block)}<p class="atlas-ancient-order">${(0, runtime.deps._t)("괴브니우와 케르눈노스 → 벨라-루 / 비포르네우스와 엘라하 → 아리안로드 / 두 계열 → 나무꾼 → 베일라")}</p>${followupHtml(runtime, view)}
            ${groups || `<div class="atlas-fight-empty"><p class="atlas-muted">${(0, runtime.deps._t)("조건에 맞는 보스가 없습니다.")}</p><button onclick="atlasEndgameUi.setFilter('all')">${(0, runtime.deps._t)("전체 목록 보기")}</button></div>`}
            ${blightHtml(runtime, view)}</div>`;
  }
  function followupHtml(runtime, view) {
    const result = runtime.deps.game.atlas.lastResult;
    if (!result || result.outcome !== "complete" || result.memory?.foughtTier) return "";
    const next = view.apexes.find((fight) => fight.unlocked && !fight.kills && fight.row.unlock?.kill === result.nodeId);
    if (!next) return "";
    return `<section class="atlas-fight-followup"><h3>${(0, runtime.deps._t)("새 목표: {name}", { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(next.row.name)) })}</h3>
            <button onclick="atlasEndgameUi.showFight('${next.row.id}')">${(0, runtime.deps._t)("준비할 재료 보기")}</button></section>`;
  }
  function noticeAwakened(runtime) {
    if (!runtime.deps.atlasEndgame.awakened(runtime.deps.game)) return;
    runtime.deps.contentUnlockUi.announceJourney("atlas-late");
  }
  function spoilsText(runtime, spoils) {
    const parts = [
      ...spoils.rewards.map(([key, amount]) => `${(0, runtime.deps._t)(runtime.deps.ORB_DB[key].name)} ${amount}`),
      ...spoils.items.map(([id, amount]) => `${runtime.deps.atlasEndgame.itemName(id)} ${amount}`)
    ];
    if (spoils.invite) parts.push(`${runtime.deps.atlasEndgame.itemName("ringInvite")} ${spoils.invite}`);
    return parts.join(", ");
  }
  function announce(runtime, detail) {
    const spoils = detail.kind === "complete" ? detail.endgame : null;
    if (!spoils) return;
    const story = runtime.state.E.stories[detail.nodeId];
    if (story) (0, runtime.deps.addLog)((0, runtime.deps.escapeHTML)(story.fall), "season-up");
    if (spoils.awakened) (0, runtime.deps.addLog)((0, runtime.deps._t)("🌳 세계수의 그림자가 쓰러져 아틀라스가 깨어났습니다."), "loot-unique");
    noticeAwakened(runtime);
    const text = spoilsText(runtime, spoils);
    if (text) (0, runtime.deps.addLog)((0, runtime.deps._t)("🌳 후반부 보상: {text}", { text }), "season-up");
    if (spoils.unique) (0, runtime.deps.addLog)((0, runtime.deps._t)("👑 고유 장비 <span class='loot-unique'>[{unique}]</span>", { unique: (0, runtime.deps.escapeHTML)(spoils.unique) }), "loot-unique");
    if (spoils.blight && spoils.blight.cleansed) (0, runtime.deps.addLog)((0, runtime.deps._t)("🌿 사도가 쓰러져 {region}의 마름이 걷혔습니다.", { region: (0, runtime.deps.escapeHTML)(regionName(runtime, spoils.blight.region)) }), "season-up");
  }
  function regionName(runtime, id) {
    return (runtime.deps.ATLAS.regions.find((region) => region.id === id) || {}).name || id;
  }
  function ready(runtime, fight, block) {
    return !(fight.reason || block);
  }
  function titleOf(runtime, row) {
    return row.kind === "league" ? [row.boss, row.name] : [row.stages[0].name, row.domain];
  }
  function powerHtml(runtime, row, tier) {
    return (0, runtime.deps.buildMapPowerEstimateHtml)(runtime.deps.atlas.preview(runtime.deps.game, runtime.deps.atlasMaps.create(row.id, tier, "normal", () => 0)));
  }

  // modules/ui/atlas-endgame-view.mjs
  function createAtlasEndgameView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { regionName, html, challenge, noticeAwakened, setFilter, showSource, preparePinnacle, showFight };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => disposeAtlasEndgameView(runtime), html: runtime.handlers.html, challenge: runtime.handlers.challenge, noticeAwakened: runtime.handlers.noticeAwakened, setFilter: runtime.handlers.setFilter, showSource: runtime.handlers.showSource, preparePinnacle: runtime.handlers.preparePinnacle, showFight: runtime.handlers.showFight });
    runtime.onMap = (event) => announce(runtime, event.detail);
    runtime.deps.window.addEventListener("project-idle:atlas-map", runtime.onMap);
    return runtime.api;
  }
  function disposeAtlasEndgameView(runtime) {
    runtime.deps.window.removeEventListener("project-idle:atlas-map", runtime.onMap);
  }
  function initialize(runtime) {
    runtime.state.E = runtime.deps.ATLAS_ENDGAME;
    runtime.state.filter = "all";
  }

  // modules/atlas-endgame-ui-classic.mjs
  var atlasEndgameUi = createAtlasEndgameView({
    get atlasUi() {
      return atlasUi;
    },
    get document() {
      return document;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get atlasRun() {
      return atlasRun;
    },
    get addLog() {
      return addLog;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get switchTab() {
      return switchTab;
    },
    get _t() {
      return _t;
    },
    get atlas() {
      return atlas;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get ATLAS() {
      return ATLAS;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get atlasMaps() {
      return atlasMaps;
    },
    get ATLAS_ENDGAME() {
      return ATLAS_ENDGAME;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ atlasEndgameUi });
})();
