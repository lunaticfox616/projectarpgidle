// GENERATED from modules/atlas-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/atlas-view-model.mjs
  function terrainOf(runtime, node) {
    return (runtime.deps.ACT_EXPLORATION_MAPS.find((map) => map.act === node.act) || {}).terrain || "";
  }
  function flowerWallet(runtime) {
    return runtime.state.FLOWER_COLORS.flatMap((color) => [runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, false), runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, true)]);
  }
  function ledger(runtime) {
    return runtime.deps.game.atlas;
  }
  function nodeName(runtime, id) {
    return runtime.deps.atlas.node(id)?.name || "";
  }
  function selectedMap(runtime) {
    return ledger(runtime).stash.find((map) => map.uid === runtime.state.selectedUid) || null;
  }
  function panelOpen(runtime) {
    return runtime.deps.game.mapExploreSubtab === "map-explore-worldtree" && runtime.deps.game.mapSubtab === "map-tab-zones";
  }
  function encounterNames(runtime, types, golden = []) {
    return types.map((type) => `${golden.includes(type) ? `${runtime.deps.ATLAS.goldenRoom.prefix} ` : ""}${runtime.deps.ATLAS.encounters[type].name}`).join(", ");
  }
  function tierStyle(runtime, tier) {
    return `--atlas-tier:${runtime.deps.atlas.tierBand(tier).tone}`;
  }
  function viewOpen(runtime, id) {
    return id !== "board" || runtime.deps.atlasBoard.unlocked(runtime.deps.game);
  }
  function sortedStash(runtime) {
    return [...ledger(runtime).stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid);
  }
  function mapName(runtime, map) {
    return (0, runtime.deps._t)("{node} {tier}등급 {name}", { node: nodeName(runtime, map.node), tier: map.tier, name: runtime.deps.ATLAS.rarities[map.rarity].name });
  }
  function plainUpTo(runtime, tier) {
    return ledger(runtime).stash.filter((map) => runtime.deps.atlas.plainMap(map) && map.tier <= tier).length;
  }
  function tierCounts(runtime, made) {
    return Object.entries(made).sort(([a], [b]) => b - a).map(([tier, count]) => (0, runtime.deps._t)("{tier}등급 {count}개", { tier, count })).join(", ");
  }
  function sumOf(runtime, made) {
    return Object.values(made).reduce((sum, count) => sum + count, 0);
  }
  function shownNodes(runtime) {
    return runtime.deps.atlas.nodes.filter((node) => node.region === runtime.state.selectedRegion || runtime.state.selectedRegion === "trunk" && node.kind === "pinnacle");
  }
  function done(runtime, id) {
    return ["complete", "bonus"].includes(runtime.deps.atlas.status(runtime.deps.game, id));
  }
  function nodeLabel(runtime, node, tier, status) {
    return (0, runtime.deps.escapeHTML)((0, runtime.deps._t)("{name} {tier}등급 {STATUS}", {
      name: (0, runtime.deps._t)(node.name),
      tier,
      STATUS: (0, runtime.deps._t)(runtime.state.STATUS[status])
    }));
  }
  function heldLate(runtime, run) {
    return Object.entries(run.endgame && run.endgame.items || {}).map(([id, n]) => `${runtime.deps.atlasEndgame.itemName(id)} ${n}`).join(", ");
  }
  function TICKET(runtime, key) {
    return runtime.deps.ORB_DB[key].name.replace("그림자 뿌리 입장권: ", "");
  }
  function momentClass(runtime, moment) {
    return moment ? ` moment-${moment}` : "";
  }

  // modules/ui/atlas-view-map.mjs
  function chartHtml(runtime) {
    const region = runtime.deps.ATLAS.regions.find((row) => row.id === runtime.state.selectedRegion), lore = runtime.deps.ATLAS.lore.regions[runtime.state.selectedRegion];
    return `<section class="atlas-region-route"><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}</h3><p class="atlas-muted">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(lore.note))}</p>
            <div class="atlas-chart atlas-route-chart" role="group" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}"><canvas class="atlas-art" aria-hidden="true"></canvas>
            ${shownNodes(runtime).map(runtime.handlers.nodeHtml).join("")}</div><p class="atlas-muted">${(0, runtime.deps._t)("입구에서 갈래를 선택하고 수호자를 거쳐 최초의 경계로 향합니다.")}</p></section>`;
  }
  function linkState(runtime, a, b) {
    if (done(runtime, a) && done(runtime, b)) return "done";
    return (done(runtime, a) || done(runtime, b)) && runtime.deps.atlas.reachable(runtime.deps.game, a) && runtime.deps.atlas.reachable(runtime.deps.game, b) ? "lit" : "dim";
  }
  function linkModel(runtime, [a, b]) {
    return { from: runtime.deps.atlas.position(runtime.deps.atlas.node(a)), to: runtime.deps.atlas.position(runtime.deps.atlas.node(b)), state: linkState(runtime, a, b) };
  }
  function chartModel(runtime) {
    const running = ledger(runtime).run && ledger(runtime).run.map.node;
    const nodes = shownNodes(runtime).map((node) => ({
      ...runtime.deps.atlas.position(node),
      kind: node.kind,
      region: node.regionIndex,
      status: runtime.deps.atlas.status(runtime.deps.game, node.id),
      selected: node.id === runtime.state.selectedNode,
      running: node.id === running
    }));
    return { regions: runtime.deps.ATLAS.regions, flat: true, nodes, links: runtime.deps.atlas.links.filter(([a, b]) => shownNodes(runtime).some((n) => n.id === a) && shownNodes(runtime).some((n) => n.id === b)).map(runtime.handlers.linkModel), tickets: runtime.deps.ATLAS.pinnacle.tickets.map((key) => (runtime.deps.game.currencies[key] || 0) >= 1) };
  }
  function paintChart(runtime) {
    const box = runtime.deps.document.querySelector("#ui-atlas .atlas-chart"), canvas = box && box.querySelector(".atlas-art");
    if (!canvas || !box.clientWidth) return;
    runtime.deps.atlasChartArt.paint(canvas, Math.max(120, Math.round(box.clientWidth / 2)), chartModel(runtime));
  }
  function watchPanel(runtime, panel) {
    if (runtime.state.panelObserver || typeof runtime.deps.ResizeObserver !== "function") return;
    runtime.state.panelObserver = new runtime.deps.ResizeObserver(() => {
      if (panelOpen(runtime)) runtime.state.PAINT[runtime.state.view]();
    });
    runtime.state.panelObserver.observe(panel);
  }
  function hint(runtime, event, id) {
    const node = runtime.deps.atlas.node(id);
    if (!node || typeof runtime.deps.showInfoTooltipHtml !== "function") return;
    const region = runtime.deps.ATLAS.regions.find((row) => row.id === node.region), tint = region ? region.tint : "#d9b066";
    const status = runtime.deps.atlas.status(runtime.deps.game, id), tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node);
    const title = `<div class="tooltip-title" style="color:${tint}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</div>`;
    if (status === "locked") return (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, title, tint);
    const kind = node.kind === "map" ? terrainOf(runtime, node) : `${node.kind === "guardian" ? (0, runtime.deps._t)("지역 수호자") : (0, runtime.deps._t)("정점")}(${terrainOf(runtime, node)})`;
    const where = region ? `, ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}` : "";
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, `${title}
            <div class="tooltip-line"><span class="atlas-tip-tier" style="${tierStyle(runtime, tier)}">${(0, runtime.deps._t)("{tier}등급", { tier })}</span> <span style="color:${runtime.state.STATUS_TONE[status]}">${(0, runtime.deps._t)(runtime.state.STATUS[status])}</span>${where}</div>
            <div class="tooltip-line">${(0, runtime.deps._t)("{kind}, 보스 {boss}", { kind, boss: (0, runtime.deps.escapeHTML)(node.boss) })}</div>`, tint);
  }
  function legendHtml(runtime) {
    return `<nav class="atlas-region-tabs" aria-label="${(0, runtime.deps._t)("지역")}">${runtime.deps.ATLAS.regions.map((region) => {
      const nodes = runtime.deps.atlas.nodes.filter((node) => node.region === region.id), done2 = nodes.filter((node) => ledger(runtime).completed.includes(node.id)).length;
      const branch = { sun: "태양", moon: "달", origin: "경계" }[runtime.deps.ATLAS.lore.regions[region.id].path];
      return `<button style="--tint:${region.tint}" aria-pressed="${region.id === runtime.state.selectedRegion}" onclick="atlasUi.selectRegion('${region.id}')"><small>${(0, runtime.deps._t)(branch)}</small>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name))}<b>${done2}/${nodes.length}</b></button>`;
    }).join("")}</nav>`;
  }
  function nodeHtml(runtime, node) {
    const { x, y } = runtime.deps.atlas.position(node), status = runtime.deps.atlas.status(runtime.deps.game, node.id);
    const held = ledger(runtime).stash.filter((map) => map.node === node.id).length;
    const active = ledger(runtime).run?.map.node === node.id;
    const classes = ["atlas-node", `is-${status}`, `kind-${node.kind}`, node.id === runtime.state.selectedNode ? "is-selected" : "", active ? "is-running" : ""].join(" ");
    const tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node);
    return `<button class="${classes}" style="--x:${x}%;--y:${y}%;${tierStyle(runtime, tier)}" data-atlas-node="${node.id}" data-info-tooltip-anchor="1" aria-pressed="${node.id === runtime.state.selectedNode}"
            aria-label="${nodeLabel(runtime, node, tier, status)}" onclick="atlasUi.selectNode('${node.id}')"
            onmouseenter="atlasUi.hint(event,'${node.id}')" onmousemove="atlasUi.hint(event,'${node.id}')" onmouseleave="hideInfoTooltip()"><b>${tier}</b><span class="atlas-route-name">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</span>${held ? `<i>${held}</i>` : ""}</button>`;
  }
  function omenHtml(runtime, map) {
    const found = runtime.deps.lootOmens.of(map);
    if (!found) return "";
    const omen = runtime.deps.lootOmens.describe(found.omen.id);
    return `<p class="atlas-omen${map.uid === runtime.state.bloomedUid ? " is-bloomed" : ""}" style="--omen:${omen.tone}"><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.name))}</b><small>${(0, runtime.deps._t)("세기 ×{strength}", { strength: found.strength })}</small><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.note))}</span></p>`;
  }
  function omenChipHtml(runtime, map) {
    const omen = map.omen && runtime.deps.lootOmens.describe(map.omen);
    return omen ? `<i class="atlas-omen-chip" style="--omen:${omen.tone}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.name))}</i>` : "";
  }
  function mapCardHtml(runtime, map, extra = "") {
    const special = runtime.state.RUN_KIND[runtime.deps.atlas.node(map.node)?.kind];
    if (special) return `<div class="atlas-map-card"><strong>${(0, runtime.deps.escapeHTML)(nodeName(runtime, map.node))}</strong><span class="atlas-map-tags">${(0, runtime.deps._t)("{tier}등급, {special}", { tier: map.tier, special })}</span>${extra}</div>`;
    const fx = runtime.deps.atlasMaps.effects(map), rule = runtime.deps.ATLAS.rarities[map.rarity];
    const mods = map.mods.map((entry) => `<li>${(0, runtime.deps.escapeHTML)(runtime.deps.atlasMaps.describe(entry))}</li>`).join("");
    const tags = [
      (0, runtime.deps._t)("{tier}등급", { tier: map.tier }),
      rule.name,
      map.quality ? (0, runtime.deps._t)("품질 {quality}%", { quality: map.quality }) : "",
      map.corrupted ? "타락" : "",
      fx.overTiers ? (0, runtime.deps._t)("고등급 보상 {overTiers}단계", { overTiers: fx.overTiers }) : ""
    ].filter(Boolean).join(", ");
    return `<div class="atlas-map-card rarity-${map.rarity}${map.corrupted ? " is-corrupted" : ""}"><strong>${(0, runtime.deps.escapeHTML)(nodeName(runtime, map.node))}</strong>
            <span class="atlas-map-tags">${tags}</span>${omenHtml(runtime, map)}${mods ? `<ul class="atlas-mods">${mods}</ul>` : (0, runtime.deps._t)('<p class="atlas-muted">옵션 없음</p>')}
            <p class="atlas-rewards">아이템 수량 +${fx.quantity}%, 희귀도 +${fx.rarity}%${fx.packExtra ? (0, runtime.deps._t)(", 무리 +{packExtra}", { packExtra: fx.packExtra }) : ""}</p>${extra}</div>`;
  }
  function runHtml(runtime, run) {
    const total = run.board ? 1 : runtime.deps.ATLAS.portals + run.bonus.portals, late = heldLate(runtime, run);
    const portals = Array.from({ length: total }, (_, i) => `<i class="${i < run.portals ? "is-on" : ""}"></i>`).join("");
    const inside = runtime.deps.atlas.inMap(runtime.deps.game), rooms = run.encounters.length ? `<p class="atlas-encounters">콘텐츠 방: ${encounterNames(runtime, run.encounters, run.golden || [])}</p>` : "";
    return `<section class="atlas-device is-running" aria-label="${(0, runtime.deps._t)("열린 지도")}"><h3>${(0, runtime.deps._t)("열린 지도")}</h3>
            ${mapCardHtml(runtime, run.map, `${rooms}<p class="atlas-portals" aria-label="${(0, runtime.deps._t)("남은 포털 {portals}", { portals: run.portals })}">${(0, runtime.deps._t)("포털 {portals}", { portals })}</p>
            <p class="atlas-muted">${(0, runtime.deps._t)("맵에서 얻은 지도석 {length}개, 각인 {length2}개, 보스를 잡으면 보관함으로", { length: run.drops.length, length2: run.found.length })}</p>
            ${late ? `<p class="atlas-muted">${(0, runtime.deps._t)("후반부 재료 {late} (보스를 잡으면 받음)", { late })}</p>` : ""}`)}
            <div class="atlas-actions">${inside ? `<button class="atlas-primary" onclick="switchTab('tab-battle')">${(0, runtime.deps._t)("전투 보기")}</button>` : (0, runtime.deps._t)('<button class="atlas-primary" data-exploration-departure onclick="atlasUi.reenter()">다시 들어가기</button>')}
            <button onclick="atlasUi.abandon()">${(0, runtime.deps._t)("지도 닫기")}</button></div></section>`;
  }
  function fragmentsHtml(runtime) {
    const st = ledger(runtime), slots = runtime.deps.atlas.slots(runtime.deps.game);
    const shown = runtime.deps.ATLAS.fragments.filter((fragment) => runtime.deps.atlas.fragmentOpen(fragment, runtime.deps.game.season) || st.fragments[fragment.id] > 0 || st.loadout.includes(fragment.id));
    const chips = shown.map((fragment) => {
      const count = st.fragments[fragment.id] || 0, on = st.loadout.includes(fragment.id);
      return `<button class="atlas-fragment${on ? " is-on" : ""}" aria-pressed="${on}" onclick="atlasUi.toggleFragment('${fragment.id}')"
                ${!on && !count ? "disabled" : ""} data-tip="${(0, runtime.deps.escapeHTML)(fragmentText(runtime, fragment))}"><span>${(0, runtime.deps._t)(fragment.name)}</span><small>${count}</small></button>`;
    }).join("");
    return `<div class="atlas-fragments" aria-label="${(0, runtime.deps._t)("각인 홈")}"><p class="atlas-muted">${(0, runtime.deps._t)("각인 홈 {length}/{slots}, 지도를 열 때 하나씩 씀", { length: st.loadout.length, slots })}</p>${chips}</div>`;
  }
  function fragmentText(runtime, fragment) {
    const room = fragment.encounter ? runtime.deps.ATLAS.encounters[fragment.encounter].name : "";
    if (room) return `${room}${room.endsWith("방") ? "" : (0, runtime.deps._t)(" 방")}이 반드시 생긴다`;
    const label = ([key, value]) => runtime.deps.ATLAS_PASSIVES.labels[key][1] === "on" ? runtime.deps.ATLAS_PASSIVES.labels[key][0] : `${runtime.deps.ATLAS_PASSIVES.labels[key][0]} +${value}${runtime.deps.ATLAS_PASSIVES.labels[key][1]}`;
    return Object.entries(fragment.effect).map(label).join(", ");
  }
  function regionChanceNote(runtime, type) {
    return Object.entries(runtime.deps.ATLAS.encounters[type].regionChance || {}).map(([id, mul]) => ` (${(runtime.deps.ATLAS.regions.find((row) => row.id === id) || {}).name} ×${mul})`).join("");
  }
  function chancesHtml(runtime) {
    const bonus = runtime.deps.atlasPassives.effects(runtime.deps.game);
    const rows = (late) => runtime.deps.atlasEncounters.types.filter((type) => !!runtime.deps.ATLAS.encounters[type].late === late && runtime.deps.atlasEncounters.isOpen(type, runtime.deps.game.season)).map((type) => `${runtime.deps.ATLAS.encounters[type].name} ${runtime.deps.ATLAS.encounters[type].chance + (bonus[type] || 0)}%${regionChanceNote(runtime, type)}`).join(", ");
    const altars = runtime.deps.atlasEndgame.awakened(runtime.deps.game) ? `<p class="atlas-encounters">${(0, runtime.deps._t)("제단 확률: {value} (지도마다 {altarLimit}개까지)", { value: rows(true), altarLimit: runtime.deps.ATLAS.altarLimit })}</p>` : "";
    const golden = (0, runtime.deps._t)("황금 방 {value}% (보상 {rewardMul}배)", { value: runtime.deps.ATLAS.goldenRoom.chance + (bonus.goldenRoom || 0), rewardMul: runtime.deps.ATLAS.goldenRoom.rewardMul });
    return `<p class="atlas-encounters">${(0, runtime.deps._t)("콘텐츠 방 확률: {value} (지도마다 {roomLimit}개까지), {golden}", { value: rows(false), roomLimit: runtime.deps.atlasEncounters.roomLimit(bonus, runtime.deps.game.season), golden })}</p>${altars}`;
  }
  function deviceHtml(runtime) {
    const map = selectedMap(runtime), lock = runtime.deps.atlas.lockReason(runtime.deps.game) || runtime.deps.atlasRun.blockReason();
    if (!map) return `<section class="atlas-device" aria-label="${(0, runtime.deps._t)("지도 장치")}"><h3>${(0, runtime.deps._t)("지도 장치")}</h3><p class="atlas-muted">${ledger(runtime).stash.length ? (0, runtime.deps._t)("보관함이나 노드에서 지도석을 고르세요.") : (0, runtime.deps._t)("지도석이 없습니다. 혼돈 20 이상에서 보스를 잡거나 이번 루프의 혼돈 20을 깨면 들어옵니다.")}</p>${fragmentsHtml(runtime)}</section>`;
    const crafts = runtime.state.CRAFT_ORDER.map((key) => craftButtonHtml(runtime, map, key)).join("");
    return `<section class="atlas-device" aria-label="${(0, runtime.deps._t)("지도 장치")}"><h3>${(0, runtime.deps._t)("지도 장치")}</h3>${mapCardHtml(runtime, map, (0, runtime.deps.buildMapPowerEstimateHtml)(runtime.deps.atlas.preview(runtime.deps.game, map)))}
            <div class="atlas-crafts" aria-label="${(0, runtime.deps._t)("지도석 제작")}">${crafts}</div>${flowersHtml(runtime, map)}${fragmentsHtml(runtime)}${chancesHtml(runtime)}
            ${lock ? `<p class="atlas-lock">${lock}</p>` : ""}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.open()" ${lock ? "disabled" : ""}>${(0, runtime.deps._t)("지도 열기")}</button></div></section>`;
  }
  function craftButtonHtml(runtime, map, key) {
    const have = Math.floor(runtime.deps.game.currencies[key] || 0), reason = runtime.deps.atlasMaps.craftReason(map, key);
    return `<button onclick="atlasUi.craft('${key}')" ${reason || have < 1 ? "disabled" : ""}${reason ? ` data-tip="${(0, runtime.deps.escapeHTML)(reason)}"` : ""}>
            <span>${runtime.deps.window.getStyledOrbName(key)}</span><small>${(0, runtime.deps._t)(runtime.deps.atlasMaps.crafts[key].label)}, ${have}</small></button>`;
  }
  function flowerButtonsHtml(runtime, map, color) {
    const name = (0, runtime.deps._t)("{label} 꽃", { label: runtime.deps.STUMP_BOX_COLORS[color].label }), blocked = runtime.deps.atlas.omenChangeReason(map), names = runtime.deps.lootOmens.flowerOmens(color, runtime.deps.game, map.omen).map((omen) => omen.name).join(", ");
    const plain = runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, false), golden = runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, true), closed = blocked || !names;
    const icon = `<img class="atlas-flower-icon" src="${runtime.deps.stumpBox.harvestPriceIcon(runtime.deps.stumpBox.harvestPriceKey("flower", color))}" alt="">`;
    const tip = blocked || (plain ? names : (0, runtime.deps._t)("{name}이 없습니다. {names}", { name, names }));
    const pick = golden ? `<button class="is-golden" onclick="atlasUi.goldenFlowerOmen('${color}')" ${closed ? "disabled" : ""} data-tip="${(0, runtime.deps.escapeHTML)(blocked || names)}">
            ${icon}<span>${(0, runtime.deps._t)("황금 {name}", { name })}<small>${(0, runtime.deps._t)("직접 고르기, {golden}", { golden })}</small></span></button>` : "";
    return `<div class="atlas-flower" style="--flower:${runtime.deps.STUMP_BOX_COLORS[color].tone}"><button onclick="atlasUi.flowerOmen('${color}')" ${closed || plain < 1 ? "disabled" : ""} data-tip="${(0, runtime.deps.escapeHTML)(tip)}">
            ${icon}<span>${name}<small>${(0, runtime.deps._t)(runtime.deps.LOOT_OMENS.flowers[color].label)}, ${plain}</small></span></button>${pick}</div>`;
  }
  function flowersHtml(runtime, map) {
    if (runtime.deps.atlas.node(map.node)?.kind !== "map") return "";
    return `<div class="atlas-flowers" aria-label="${(0, runtime.deps._t)("꽃으로 기운 바꾸기")}"><p>${(0, runtime.deps._t)("꽃으로 기운 바꾸기")}</p>${runtime.state.FLOWER_COLORS.map((color) => flowerButtonsHtml(runtime, map, color)).join("")}</div>`;
  }
  function nodeDetailHtml(runtime) {
    const node = runtime.deps.atlas.node(runtime.state.selectedNode);
    if (!node) return '<section class="atlas-node-detail"><p class="atlas-muted">노드를 누르면 정보가 보입니다. 완료한 노드의 이웃이 열립니다.</p></section>';
    if (node.kind === "pinnacle") return pinnacleHtml(runtime, node);
    const region = runtime.deps.ATLAS.regions.find((row) => row.id === node.region), status = runtime.deps.atlas.status(runtime.deps.game, node.id), tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node);
    const maps = ledger(runtime).stash.filter((map) => map.node === node.id).sort((a, b) => b.tier - a.tier);
    const kind = node.kind === "guardian" ? `<p class="atlas-guardian-note">${(0, runtime.deps._t)("지역 수호자, 처치마다 뿌리 입장권({value}), 지도석은 이 지역 {minTier}등급 이상 보스가 떨어뜨립니다", { value: node.ticket ? TICKET(runtime, node.ticket) : (0, runtime.deps._t)("가장 적은 종류"), minTier: runtime.deps.ATLAS.guardianRules.minTier })}</p>${runtime.deps.itemInfluencesUi.sourceHtml("guardian")}` : "";
    return `<section class="atlas-node-detail" style="--tint:${region.tint}"><small>${(0, runtime.deps._t)(region.name)}, ${runtime.state.STATUS[status]}</small><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</h3>
            <p>${(0, runtime.deps._t)("{tier}등급, {node}, 보스 {boss}", { tier, node: terrainOf(runtime, node), boss: (0, runtime.deps.escapeHTML)(node.boss) })}</p>${kind}
            <p class="atlas-muted">${(0, runtime.deps._t)("장비 T{lootTier}까지, 혼돈 {equivalentDepth} 상당", { lootTier: runtime.deps.atlas.lootTier(tier), equivalentDepth: runtime.deps.atlas.equivalentDepth(tier) })}</p>
            ${maps.length ? `<div class="atlas-node-maps">${maps.map(runtime.handlers.stashRowHtml).join("")}</div>` : (0, runtime.deps._t)('<p class="atlas-muted">이 노드의 지도석이 없습니다.</p>')}</section>`;
  }
  function pinnacleHtml(runtime, node) {
    const tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node), reason = runtime.deps.atlas.pinnacleReason(runtime.deps.game) || runtime.deps.atlasRun.blockReason(), busy = !!ledger(runtime).run;
    const tickets = runtime.deps.ATLAS.pinnacle.tickets.map((key) => `<span class="${(runtime.deps.game.currencies[key] || 0) >= 1 ? "is-on" : ""}">${TICKET(runtime, key)} ${Math.floor(runtime.deps.game.currencies[key] || 0)}</span>`).join("");
    return `<section class="atlas-node-detail atlas-pinnacle-detail"><small>${(0, runtime.deps._t)("정점, 세계수 씨앗 {seeds}/{max}", { seeds: ledger(runtime).seeds, max: runtime.deps.ATLAS.seeds.max })}</small><h3>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(node.name))}</h3>
            <p>${(0, runtime.deps._t)("{tier}등급, 투기장, 보스 {stages}단계", { tier, stages: runtime.deps.ATLAS.pinnacle.stages })}</p><div class="atlas-tickets">${tickets}</div>
            <p class="atlas-muted">${ledger(runtime).seeds >= runtime.deps.ATLAS.seeds.max ? (0, runtime.deps._t)("세계수 씨앗 {max}개를 다 모아 더는 나오지 않습니다(시대 재생 뒤 다시).", { max: runtime.deps.ATLAS.seeds.max }) : (0, runtime.deps._t)("처치하면 세계수 씨앗 하나(최대 {max}).", { max: runtime.deps.ATLAS.seeds.max })} 씨앗마다 모든 노드 등급 +${runtime.deps.ATLAS.seeds.tierStep}. 씨앗 ${runtime.deps.BEYOND_BOUNDARY_UNLOCK_SEEDS}개면 경계 너머가 루프 50 전에 열립니다(관측자 처치 필요).</p>
            ${runtime.deps.atlasEndgame.awakened(runtime.deps.game) ? "" : (0, runtime.deps._t)('<p class="atlas-muted">처음 쓰러뜨리면 아틀라스가 깨어나 최종 보스가 열립니다.</p>')}
            ${reason && !busy ? `<p class="atlas-lock">${reason}</p>` : ""}<div class="atlas-actions"><button class="atlas-primary" data-exploration-departure
            onclick="atlasUi.openPinnacle()" ${reason ? "disabled" : ""}>${(0, runtime.deps._t)("정점 열기")}</button></div></section>`;
  }
  function stashRowHtml(runtime, map) {
    return `<button class="atlas-stash-row rarity-${map.rarity}" aria-pressed="${map.uid === runtime.state.selectedUid}" onclick="atlasUi.selectMap(${map.uid})">
            <b style="${tierStyle(runtime, map.tier)}">${map.tier}</b><span>${(0, runtime.deps.escapeHTML)(nodeName(runtime, map.node))}${omenChipHtml(runtime, map)}</span><small>${(0, runtime.deps._t)(runtime.deps.ATLAS.rarities[map.rarity].name)}${map.mods.length ? (0, runtime.deps._t)(", 옵션 {length}", { length: map.mods.length }) : ""}${map.quality ? `, ${map.quality}%` : ""}${map.corrupted ? (0, runtime.deps._t)(", 타락") : ""}</small></button>`;
  }
  function stashToolsHtml(runtime, selected, busy) {
    const same = ledger(runtime).stash.filter((map) => map.tier === selected.tier).length, reason = runtime.deps.atlas.combineReason(runtime.deps.game, selected.uid);
    const low = plainUpTo(runtime, selected.tier), off = busy ? "disabled" : "";
    const why = reason && same >= runtime.deps.ATLAS.combine.count && !busy ? `<small>${(0, runtime.deps.escapeHTML)(reason)}</small>` : "";
    return `<div class="atlas-stash-tools"><button class="atlas-combine" onclick="atlasUi.combine()" ${reason ? "disabled" : ""}>${(0, runtime.deps._t)("같은 등급 {count}개 합치기", { count: runtime.deps.ATLAS.combine.count })} <span>${Math.min(same, runtime.deps.ATLAS.combine.count)}/${runtime.deps.ATLAS.combine.count}</span></button>${combineAllHtml(runtime)}
            <button class="atlas-discard" onclick="atlasUi.discard()" ${off}>${(0, runtime.deps._t)("버리기")}</button>
            <button class="atlas-discard" onclick="atlasUi.discardLow()" ${off || (low ? "" : "disabled")}>${(0, runtime.deps._t)("{tier}등급 이하 일반 모두 버리기", { tier: selected.tier })} <span>${low}</span></button></div>${why}`;
  }
  function stashHtml(runtime) {
    const maps = sortedStash(runtime);
    const selected = selectedMap(runtime), busy = runtime.deps.atlas.runOpenReason(runtime.deps.game), full = maps.length >= runtime.deps.ATLAS.stashCap;
    const capacity = full ? "보관함이 가득 찼습니다." : (0, runtime.deps._t)("빈자리 {value}칸", { value: runtime.deps.ATLAS.stashCap - maps.length });
    const management = selected ? `<div class="atlas-stash-management"><p><strong>${(0, runtime.deps._t)("선택: {node}", { node: (0, runtime.deps.escapeHTML)(nodeName(runtime, selected.node)) })}</strong><span><b style="${tierStyle(runtime, selected.tier)}">${selected.tier}등급</b>, ${(0, runtime.deps._t)(runtime.deps.ATLAS.rarities[selected.rarity].name)}${selected.quality ? (0, runtime.deps._t)(", 품질 {quality}%", { quality: selected.quality }) : ""}${selected.corrupted ? (0, runtime.deps._t)(", 타락") : ""}</span></p>
            ${stashToolsHtml(runtime, selected, busy)}${busy ? `<small>${busy}</small>` : ""}</div>` : `<div class="atlas-stash-management"><div class="atlas-stash-tools">${combineAllHtml(runtime)}</div></div>`;
    return `<section class="atlas-stash" aria-label="${(0, runtime.deps._t)("지도석 보관함")}"><h3>${(0, runtime.deps._t)("지도석 보관함")} <span>${maps.length}/${runtime.deps.ATLAS.stashCap}</span></h3>
            <p class="atlas-stash-capacity${full ? " is-full" : ""}" role="status">${capacity}</p>${management}
            ${maps.length ? `<div class="atlas-stash-list">${maps.map(runtime.handlers.stashRowHtml).join("")}</div>` : (0, runtime.deps._t)('<p class="atlas-muted">비어 있습니다. 보관함은 루프마다 비워집니다.</p>')}</section>`;
  }
  function combineAllHtml(runtime) {
    const used = runtime.deps.atlas.combineAllPlan(runtime.deps.game).used;
    return `<button class="atlas-combine" onclick="atlasUi.combineAll()" ${used ? "" : "disabled"}>${(0, runtime.deps._t)("모두 합치기")} <span>${used}</span></button>`;
  }

  // modules/ui/atlas-view-results.mjs
  function itemFind(runtime, row) {
    const name = row.rarity === "unique" ? `「${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}」` : (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name));
    return { rank: runtime.deps.lootMoments.rank(row.moment), html: `<span class="atlas-find rarity-${row.rarity}${momentClass(runtime, row.moment)}" data-tip="${(0, runtime.deps.escapeHTML)((0, runtime.deps.getItemSlotDisplayLabel)(null, row.slot))}">${row.fresh ? (0, runtime.deps._t)("<em>새</em>") : ""}${name}</span>` };
  }
  function leafFind(runtime, [id, count]) {
    const leaf = runtime.deps.memoryLeaves.leaf(id);
    return { rank: runtime.state.LEAF_RANK, html: `<span class="atlas-find is-leaf">${(0, runtime.deps.renderPixelIcon)("leaf", "atlas-find-leaf")}${(0, runtime.deps.escapeHTML)(leaf ? leaf.name : id)}${count > 1 ? ` <b>×${count}</b>` : ""}</span>` };
  }
  function yarnFind(runtime, [id, count]) {
    return { rank: 1, html: `<span class="atlas-find">${(0, runtime.deps._t)("실타래 {name}", { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.deps.knitting.row(id).name)) })} <b>×${count}</b></span>` };
  }
  function currencyFind(runtime, [key, count]) {
    const moment = runtime.deps.lootMoments.ofCurrency(key), src = runtime.deps.ORB_DB[key] && runtime.deps.ORB_DB[key].icon;
    const icon = src ? `<img class="atlas-find-icon" src="${src}" alt="" aria-hidden="true">` : "";
    return { rank: runtime.deps.lootMoments.rank(moment), html: `<span class="atlas-find${momentClass(runtime, moment)}">${icon}${runtime.deps.window.getStyledOrbName(key)} <b>×${count}</b></span>` };
  }
  function findsHtml(runtime, receipt) {
    const currencies = Object.entries(receipt.currencies).filter(([key]) => runtime.deps.lootMoments.ofCurrency(key));
    const finds = [...receipt.items.map(runtime.handlers.itemFind), ...Object.entries(receipt.leaves).map(runtime.handlers.leafFind), ...Object.entries(receipt.yarns || {}).map(runtime.handlers.yarnFind), ...currencies.map(runtime.handlers.currencyFind)];
    return finds.sort((a, b) => b.rank - a.rank).slice(0, 8).map((find) => find.html).join("");
  }
  function resultNotes(runtime, result) {
    return [
      result.first && "첫 완료",
      result.bonus && "보너스 달성",
      result.drops && (0, runtime.deps._t)("지도석 {drops}개", { drops: result.drops }),
      result.fragments && (0, runtime.deps._t)("각인 {fragments}개", { fragments: result.fragments }),
      result.seed && (0, runtime.deps._t)("세계수 씨앗 +1 ({seeds}/{max})", { seeds: result.seeds, max: runtime.deps.ATLAS.seeds.max }),
      result.endgame?.awakened && "아틀라스 후반부 개방"
    ].filter(Boolean).join(", ");
  }
  function resultMaterialsHtml(runtime, result) {
    const spoils = result.endgame;
    if (!spoils) return "";
    const items = [...spoils.items, ...spoils.invite ? [["ringInvite", spoils.invite]] : []];
    if (!items.length) return "";
    return `<div class="atlas-result-currencies"><small>${(0, runtime.deps._t)("후반부 재료")}</small>${items.map(([id, n]) => `<span>${(0, runtime.deps.escapeHTML)(runtime.deps.atlasEndgame.itemName(id))} <b>+${n}</b></span>`).join("")}</div>`;
  }
  function receiptHtml(runtime, receipt) {
    const none = '<span class="atlas-muted">기록된 재화 없음</span>';
    if (!receipt) return `<div class="atlas-result-currencies">${none}</div>`;
    const finds = findsHtml(runtime, receipt);
    const currencies = Object.entries(receipt.currencies).map(([key, n]) => `<span>${runtime.deps.window.getStyledOrbName(key)} <b>+${n}</b></span>`).join("");
    return `${finds ? `<div class="atlas-result-finds" aria-label="${(0, runtime.deps._t)("이번 판의 발견")}"><small>${(0, runtime.deps._t)("이번 판의 발견")}</small>${finds}</div>` : ""}
            <div class="atlas-result-currencies"><small>${(0, runtime.deps._t)("재화 {length}종, 장비 {equipmentCount}개", { length: Object.keys(receipt.currencies).length, equipmentCount: receipt.equipmentCount })}</small>${currencies || none}</div>`;
  }
  function resultHtml(runtime) {
    const result = ledger(runtime).lastResult;
    if (!result) return "";
    const done2 = result.outcome === "complete", recalled = result.memory?.foughtTier;
    return `<section class="atlas-result${done2 ? "" : " is-failed"}" aria-label="${(0, runtime.deps._t)("지난 지도 결과")}"><h3>${(0, runtime.deps.escapeHTML)(nodeName(runtime, result.nodeId))}${recalled ? (0, runtime.deps._t)(" (기억 {recalled}단계)", { recalled }) : ""} ${result.tier}등급 ${done2 ? (0, runtime.deps._t)("완료") : (0, runtime.deps._t)("실패")}<span>${resultNotes(runtime, result)}</span></h3>
            ${done2 ? overflowHtml(runtime, result) : failureHtml(runtime, result)}${resultMemoryHtml(runtime, result)}${resultMaterialsHtml(runtime, result)}${receiptHtml(runtime, result.loot)}</section>`;
  }
  function lostRewards(runtime, result) {
    return [
      result.lost && (0, runtime.deps._t)("지도석 {lost}개", { lost: result.lost }),
      result.lostFragments && (0, runtime.deps._t)("각인 {lostFragments}개", { lostFragments: result.lostFragments }),
      ...(result.lostMaterials || []).map(([id, count]) => (0, runtime.deps._t)("{itemName} {count}개", { itemName: runtime.deps.atlasEndgame.itemName(id), count }))
    ].filter(Boolean);
  }
  function overflowHtml(runtime, result) {
    const lost = lostRewards(runtime, result);
    if (!lost.length) return "";
    return `<div class="atlas-result-loss"><p>${(0, runtime.deps._t)("보관 한도 초과: {lost}는 보관하지 못했습니다.", { lost: (0, runtime.deps.escapeHTML)(lost.join(", ")) })}</p></div>`;
  }
  function resultMemoryHtml(runtime, result) {
    const memory = result.memory;
    if (!memory) return "";
    const record = memory.newBest ? `<p>${(0, runtime.deps._t)("기억 최고 기록 갱신 ({foughtTier}단계)", { foughtTier: memory.foughtTier })}</p>` : "";
    const ticket = memory.ticket;
    if (!ticket) return record ? `<div class="atlas-result-memory">${record}</div>` : "";
    const name = runtime.deps.atlas.node(ticket.node).boss;
    return `<div class="atlas-result-memory">${record}<p>${(0, runtime.deps._t)("기억 획득: {name} {tier}단계 +1", { name: (0, runtime.deps.escapeHTML)(name), tier: ticket.tier })}</p>
            <button onclick="atlasUi.setView('memory');memoryDungeonUi.select('${ticket.node}',${ticket.tier})">${(0, runtime.deps._t)("기억 준비 보기")}</button></div>`;
  }
  function failureHtml(runtime, result) {
    const lost = lostRewards(runtime, result);
    return `${lost.length ? `<div class="atlas-result-loss"><p>${(0, runtime.deps._t)("보류 보상 손실: {lost}", { lost: (0, runtime.deps.escapeHTML)(lost.join(", ")) })}</p></div>` : ""}
            ${!ledger(runtime).run && ledger(runtime).stash.length ? (0, runtime.deps._t)('<div class="atlas-actions"><button onclick="atlasUi.revealStash()">다음 지도석 고르기</button></div>') : ""}`;
  }

  // modules/ui/atlas-view-screen.mjs
  function pages(runtime) {
    const free = runtime.deps.atlasPassives.spendable(runtime.deps.game), memories = runtime.deps.memoryDungeon.total(runtime.deps.game);
    const badges = { passives: free ? `+${free}` : "", memory: memories ? String(memories) : "" };
    return { select: runtime.handlers.setView, items: runtime.state.VIEW_TABS.filter(([id]) => viewOpen(runtime, id)).map(([id, label]) => ({ id, label, badge: badges[id], on: runtime.state.view === id })) };
  }
  function progressLine(runtime) {
    const st = ledger(runtime);
    if (st.run) return (0, runtime.deps._t)("열린 지도: {node}", { node: nodeName(runtime, st.run.map.node) });
    return !st.unlocked && runtime.deps.atlas.lockReason(runtime.deps.game) || (0, runtime.deps._t)("지도석 {length}개, 완료 {length2}곳", { length: st.stash.length, length2: st.completed.length });
  }
  function headerHtml(runtime) {
    const st = ledger(runtime), total = runtime.deps.atlas.nodes.length + (runtime.deps.atlasEndgame.awakened(runtime.deps.game) ? runtime.deps.atlas.lateNodes.length : 0), free = runtime.deps.atlasPassives.spendable(runtime.deps.game);
    const stat = (label, value, tone) => `<span class="atlas-stat" style="--stat-tone:${tone}">${label} <b>${value}</b></span>`;
    const stats = stat("완료", `${st.completed.length}/${total}`, "#d9b066") + stat("보너스", st.bonus.length, "#9fd46a") + stat("씨앗", `${st.seeds}/${runtime.deps.ATLAS.seeds.max}`, "#c9a0f0") + stat("포인트", `${runtime.deps.atlas.points(runtime.deps.game)}${free ? (0, runtime.deps._t)(" (남음 {free})", { free }) : ""}`, "#7fd6cf");
    return `<header class="atlas-head"><span class="atlas-stats">${stats}</span>
            <label class="atlas-auto" data-tip="${(0, runtime.deps._t)("완료하면 같은 등급 이하에서 다음 지도석을 연다")}"><input type="checkbox" ${st.autoMap ? "checked" : ""} onchange="atlasUi.toggleAuto(this.checked)"><span>${(0, runtime.deps._t)("자동 지도")}</span>
            <small>${(0, runtime.deps._t)("완료하면 같은 등급 이하에서 다음 지도석을 연다")}</small></label></header>`;
  }
  function huntingJourneyAction(runtime) {
    const highest = Math.min(runtime.deps.game.maxZoneId, (0, runtime.deps.getVisibleHuntingMapCapZoneId)());
    const chaos = highest >= (0, runtime.deps.getAbyssZoneIdForDepth)(1) || (0, runtime.deps.getDeepChaosEntryState)().open;
    return {
      action: `switchMapExploreSubtab('${chaos ? "map-explore-chaos" : "map-explore-hunting"}')`,
      label: chaos ? "혼돈 지도 보기" : "일반 사냥터 보기"
    };
  }
  function mapJourney(runtime) {
    const stash = ledger(runtime).stash, guardians = stash.filter((map2) => runtime.deps.atlas.node(map2.node)?.kind === "guardian");
    const missing = guardians.find((map2) => {
      const ticket = runtime.deps.atlas.node(map2.node).ticket;
      return !ticket || !runtime.deps.game.currencies[ticket];
    });
    if (missing) return {
      title: (0, runtime.deps._t)("수호자 지도석 준비됨"),
      text: (0, runtime.deps._t)("{node} {tier}등급", { node: nodeName(runtime, missing.node), tier: missing.tier }),
      action: `atlasUi.selectMap(${missing.uid},true)`,
      label: (0, runtime.deps._t)("수호자 준비 보기")
    };
    const maps = [...stash].sort((a, b) => a.tier - b.tier || a.uid - b.uid), map = selectedMap(runtime) || maps[0];
    if (map) return {
      title: (0, runtime.deps._t)("지도석 {length}개 준비됨", { length: stash.length }),
      text: (0, runtime.deps._t)("{node} {tier}등급", { node: nodeName(runtime, map.node), tier: map.tier }),
      action: `atlasUi.selectMap(${map.uid},true)`,
      label: (0, runtime.deps._t)("지도 준비 보기")
    };
    return {
      title: (0, runtime.deps._t)("다음 지도석 모으기"),
      text: (0, runtime.deps._t)("혼돈 20 이상 보스가 지도석을 줍니다."),
      ...huntingJourneyAction(runtime)
    };
  }
  function journeyState(runtime) {
    const st = ledger(runtime), lock = runtime.deps.atlas.lockReason(runtime.deps.game);
    if (st.run) return {
      title: (0, runtime.deps._t)("열린 지도 진행 중"),
      text: (0, runtime.deps._t)("{node}, 남은 포털 {portals}개", { node: nodeName(runtime, st.run.map.node), portals: st.run.portals }),
      action: "atlasUi.revealDevice()",
      label: (0, runtime.deps._t)("열린 지도 보기")
    };
    if (lock) return {
      title: (0, runtime.deps._t)("이번 루프의 입장 준비"),
      text: lock,
      ...huntingJourneyAction(runtime)
    };
    if (st.seeds >= runtime.deps.ATLAS.seeds.max) return {
      title: (0, runtime.deps._t)("씨앗을 모두 모았습니다"),
      text: "",
      action: "atlasUi.setView('late')",
      label: (0, runtime.deps._t)("최종 보스 보기"),
      epoch: true
    };
    if (runtime.deps.ATLAS.pinnacle.tickets.every((key) => runtime.deps.game.currencies[key] >= 1)) return {
      title: (0, runtime.deps._t)("정점 입장권 4종 준비됨"),
      text: "",
      action: "atlasUi.selectNode('pinnacle',true)",
      label: (0, runtime.deps._t)("정점 준비 보기")
    };
    return mapJourney(runtime);
  }
  function journeyHtml(runtime) {
    const next = journeyState(runtime);
    return `<section class="atlas-journey" aria-label="${(0, runtime.deps._t)("아틀라스 다음 목표")}"><div><h3>${(0, runtime.deps._t)(next.title)}</h3>${next.text ? `<p>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(next.text))}</p>` : ""}</div>
            <div class="atlas-actions"><button class="atlas-primary" onclick="${next.action}">${(0, runtime.deps._t)(next.label)}</button>${next.epoch ? `<button onclick="atlasUi.setView('epoch')">${(0, runtime.deps._t)("시대 재생 비교")}</button>` : ""}</div></section>`;
  }
  function autoOptionsHtml(runtime) {
    const st = ledger(runtime);
    if (!st.autoMap) return "";
    const stop = runtime.deps.game.settings.mapCompleteAction === "stop";
    return `<section class="atlas-auto-options" aria-label="${(0, runtime.deps._t)("자동 지도 설정")}"><label><input type="checkbox" ${st.autoGuardians ? "checked" : ""} onchange="atlasUi.toggleAutoGuardians(this.checked)">${(0, runtime.deps._t)("수호자 지도 포함")}</label>
            ${stop ? (0, runtime.deps._t)("<p>완료 후 멈춤 설정으로 자동 지도가 대기 중입니다.</p>") : ""}
            ${stop ? (0, runtime.deps._t)('<button onclick="openMapCompleteActionPicker(event)">완료 후 행동 변경</button>') : ""}</section>`;
  }
  function sheetParts(runtime) {
    const st = ledger(runtime), map = selectedMap(runtime), node = runtime.deps.atlas.node(runtime.state.selectedNode), busy = runtime.deps.atlas.runOpenReason(runtime.deps.game), block = runtime.deps.atlasRun.blockReason();
    const card = map ? `<section class="atlas-device" aria-label="${(0, runtime.deps._t)("지도 장치")}">${mapCardHtml(runtime, map, (0, runtime.deps.buildMapPowerEstimateHtml)(runtime.deps.atlas.preview(runtime.deps.game, map)))}
            <div class="atlas-crafts" aria-label="${(0, runtime.deps._t)("지도석 제작")}">${runtime.state.CRAFT_ORDER.map((key) => craftButtonHtml(runtime, map, key)).join("")}</div>${flowersHtml(runtime, map)}${chancesHtml(runtime)}</section>` : "";
    const side = st.run ? runHtml(runtime, st.run) : node && node.kind === "pinnacle" ? pinnacleHtml(runtime, node) : card;
    const tools = map ? `${stashToolsHtml(runtime, map, busy)}${busy ? `<small>${busy}</small>` : ""}` : `<div class="atlas-stash-tools">${combineAllHtml(runtime)}</div>`;
    return { node: runtime.state.selectedNode, uid: runtime.state.selectedUid, lock: runtime.deps.atlas.lockReason(runtime.deps.game) || block, block, side, tools, after: `${autoOptionsHtml(runtime)}${resultHtml(runtime)}`, mapName: runtime.handlers.mapName };
  }
  function mapsViewHtml(runtime) {
    if (runtime.deps.atlasSheetUi.on()) return runtime.deps.atlasSheetUi.html(sheetParts(runtime));
    return `${journeyHtml(runtime)}<div class="atlas-ancient-entry"><button onclick="atlasUi.setView('late')">${(0, runtime.deps._t)("태양과 달, 피나클")}</button></div>${autoOptionsHtml(runtime)}<div class="atlas-main"><div class="atlas-chart-column">${legendHtml(runtime)}${chartHtml(runtime)}</div><div class="atlas-side">${ledger(runtime).run ? runHtml(runtime, ledger(runtime).run) : deviceHtml(runtime)}${nodeDetailHtml(runtime)}</div></div>
            ${resultHtml(runtime)}${stashHtml(runtime)}`;
  }
  function render(runtime) {
    runtime.deps.atlasEndgameUi.noticeAwakened();
    const panel = runtime.deps.document.getElementById("ui-atlas");
    if (!panel || !panelOpen(runtime)) return;
    runtime.deps.atlas.sync(runtime.deps.game);
    runtime.deps.atlasBoard.sync(runtime.deps.game);
    const wallet = [...[...runtime.state.CRAFT_ORDER, ...runtime.deps.ATLAS.pinnacle.tickets].map((key2) => runtime.deps.game.currencies[key2] || 0), ...flowerWallet(runtime)];
    if (!viewOpen(runtime, runtime.state.view)) runtime.state.view = "maps";
    const key = JSON.stringify([runtime.deps.atlasSheetUi.on(), runtime.state.view, runtime.state.selectedRegion, ledger(runtime), runtime.state.selectedNode, runtime.state.selectedUid, wallet, runtime.deps.atlasRun.blockReason(), runtime.deps.game.currentZoneId, runtime.deps.game.maxZoneId, runtime.deps.game.settings.mapCompleteAction, (0, runtime.deps.getPersistentBuildSignature)(runtime.deps.game)]);
    if (key === runtime.state.signature && panel.innerHTML) return;
    runtime.state.signature = key;
    const lock = runtime.deps.atlas.lockReason(runtime.deps.game);
    panel.innerHTML = `<div class="atlas-shell">${runtime.deps.atlasSheetUi.on() ? runtime.state.view === "maps" ? "" : runtime.deps.atlasSheetUi.top(false) : headerHtml(runtime)}${lock && !ledger(runtime).unlocked ? `<p class="atlas-lock">${lock}</p>` : ""}
            ${runtime.state.VIEWS[runtime.state.view]()}</div>`;
    runtime.state.PAINT[runtime.state.view]();
    watchPanel(runtime, panel);
  }
  function hudKindHtml(runtime, run) {
    const special = run.map.memory ? (0, runtime.deps._t)("기억 {memory}단계", { memory: run.map.memory }) : runtime.state.RUN_KIND[runtime.deps.atlas.node(run.map.node)?.kind];
    if (special) return `<span class="atlas-hud-chip">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(special))}</span>`;
    return `<span class="atlas-hud-chip rarity-${run.map.rarity}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.deps.ATLAS.rarities[run.map.rarity].name))}</span>`;
  }
  function hudPortalsHtml(runtime, run) {
    if (run.board) return `<span class="atlas-hud-chip">${(0, runtime.deps._t)("포털 없음")}</span>`;
    const total = runtime.deps.ATLAS.portals + run.bonus.portals, tip = (0, runtime.deps._t)("포털 {portals}/{value}", { portals: run.portals, value: total });
    const pips = Array.from({ length: total }, (_, index) => `<i${index < run.portals ? ' class="is-on"' : ""}></i>`).join("");
    return `<span class="atlas-hud-chip atlas-hud-portals" data-tip="${(0, runtime.deps.escapeHTML)(tip)}"><small>${(0, runtime.deps._t)("포털")}</small>${pips}</span>`;
  }
  function updateHud(runtime, zone) {
    const host = runtime.deps.document.getElementById("ui-atlas-combat");
    if (!host) return;
    const run = ledger(runtime).run, show = !!run && zone && zone.type === "atlasMap" && !runtime.deps.actExplorationState.current(runtime.deps.game)?.departure;
    host.toggleAttribute("hidden", !show);
    if (!show) {
      runtime.state.hudSignature = "";
      return;
    }
    const key = JSON.stringify([run.map.uid, run.portals, run.encounters]);
    if (key === runtime.state.hudSignature) return;
    runtime.state.hudSignature = key;
    const rooms = run.encounters.map((type) => `<span class="atlas-hud-chip is-room">${(0, runtime.deps.escapeHTML)(encounterNames(runtime, [type], run.golden || []))}</span>`).join("");
    host.innerHTML = `<span class="atlas-hud-chip atlas-hud-tier" style="${tierStyle(runtime, run.map.tier)}">${(0, runtime.deps._t)("{tier}등급", { tier: run.map.tier })}</span>${hudKindHtml(runtime, run)}${rooms}${omenChipHtml(runtime, run.map)}${hudPortalsHtml(runtime, run)}
            <button type="button" class="combat-action-btn" onclick="atlasUi.openPanel()">${(0, runtime.deps._t)("아틀라스")}</button>`;
  }

  // modules/ui/atlas-view-actions.mjs
  function openPanel(runtime) {
    if (!runtime.deps.document.getElementById("tab-map").classList.contains("active")) (0, runtime.deps.switchTab)("tab-map");
    (0, runtime.deps.switchMapSubtab)("map-tab-zones");
    (0, runtime.deps.switchMapExploreSubtab)("map-explore-worldtree");
    render(runtime);
  }
  function refresh(runtime) {
    runtime.state.signature = "";
    render(runtime);
    (0, runtime.deps.updateStaticUI)();
  }
  function setView(runtime, next) {
    runtime.state.view = ["passives", "epoch", "late", "memory", "board"].includes(next) && viewOpen(runtime, next) ? next : "maps";
    refresh(runtime);
  }
  function openNode(runtime, id) {
    selectNode(runtime, id);
    if (selectedMap(runtime) && selectedMap(runtime).node === id && !ledger(runtime).run) open(runtime);
  }
  function selectRegion(runtime, id, showMaps = false) {
    if (!runtime.deps.ATLAS.regions.some((row) => row.id === id)) return;
    if (showMaps) runtime.state.view = "maps";
    runtime.state.selectedRegion = id;
    runtime.state.selectedNode = null;
    refresh(runtime);
  }
  function selectNode(runtime, id, reveal = false) {
    const node = runtime.deps.atlas.node(id);
    if (!node) return;
    (0, runtime.deps.hideInfoTooltip)();
    if (reveal) runtime.state.view = "maps";
    runtime.state.selectedNode = id;
    runtime.state.selectedRegion = node.region || "trunk";
    const maps = ledger(runtime).stash.filter((map) => map.node === id);
    if ((reveal || maps.length) && !maps.some((map) => map.uid === runtime.state.selectedUid)) runtime.state.selectedUid = maps.length ? maps[0].uid : null;
    render(runtime);
    if (reveal) revealNodeDetail(runtime);
  }
  function revealNodeDetail(runtime) {
    const detail = runtime.deps.document.querySelector("#ui-atlas .atlas-node-detail");
    if (!detail) return;
    detail.tabIndex = -1;
    detail.focus({ preventScroll: true });
    detail.scrollIntoView({ block: "nearest" });
  }
  function selectMap(runtime, uid, reveal = false) {
    const map = ledger(runtime).stash.find((entry) => entry.uid === uid);
    if (!map) return;
    runtime.state.selectedUid = uid;
    runtime.state.selectedNode = map.node;
    runtime.state.selectedRegion = runtime.deps.atlas.node(map.node).region || "trunk";
    render(runtime);
    if (reveal) revealDevice(runtime);
  }
  function revealDevice(runtime) {
    runtime.deps.document.querySelector("#ui-atlas .atlas-device")?.scrollIntoView({ block: "start" });
  }
  function revealStash(runtime) {
    runtime.deps.document.querySelector("#ui-atlas .atlas-stash")?.scrollIntoView({ block: "start" });
  }
  async function discard(runtime) {
    const map = selectedMap(runtime), busy = runtime.deps.atlas.runOpenReason(runtime.deps.game);
    if (!map) return;
    if (busy) return (0, runtime.deps.addLog)(busy, "attack-monster");
    const name = mapName(runtime, map);
    if (!runtime.deps.atlas.plainMap(map) && !await (0, runtime.deps.requestGameConfirmation)(
      `${name} 지도석 1개를 버릴까요?
지도석과 제작에 쓴 재화는 돌려받을 수 없습니다.`,
      { title: (0, runtime.deps._t)("지도석 버리기"), tone: "danger", confirmLabel: (0, runtime.deps._t)("버리기"), cancelLabel: (0, runtime.deps._t)("취소"), dismissOnBackdrop: false }
    )) return;
    if (selectedMap(runtime) !== map) return (0, runtime.deps.addLog)((0, runtime.deps._t)("선택한 지도석이 바뀌어 버리기를 취소했습니다."), "attack-monster");
    const order = sortedStash(runtime), at = order.indexOf(map);
    const reason = runtime.deps.atlas.discard(runtime.deps.game, map.uid);
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    const next = order[at + 1] || order[at - 1];
    runtime.state.selectedUid = next ? next.uid : null;
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🗺️ {name} 지도석 1개를 버렸습니다.", { name }), "attack-monster");
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }
  async function discardLow(runtime) {
    const map = selectedMap(runtime), busy = runtime.deps.atlas.runOpenReason(runtime.deps.game);
    if (!map) return;
    if (busy) return (0, runtime.deps.addLog)(busy, "attack-monster");
    const tier = map.tier, count = plainUpTo(runtime, tier);
    if (!count) return (0, runtime.deps.addLog)((0, runtime.deps._t)("{tier}등급 이하에 일반 지도석이 없습니다.", { tier }), "attack-monster");
    const ok = await (0, runtime.deps.requestGameConfirmation)(
      (0, runtime.deps._t)("{tier}등급 이하 일반 지도석 {count}개를 모두 버릴까요?\n마법, 희귀, 품질, 타락 지도석은 남습니다.", { tier, count }),
      { title: (0, runtime.deps._t)("지도석 정리"), tone: "danger", confirmLabel: (0, runtime.deps._t)("{count}개 버리기", { count }), cancelLabel: (0, runtime.deps._t)("취소"), dismissOnBackdrop: false }
    );
    if (!ok) return;
    if (plainUpTo(runtime, tier) !== count) return (0, runtime.deps.addLog)((0, runtime.deps._t)("보관함이 바뀌어 정리를 취소했습니다. 다시 눌러 주세요."), "attack-monster");
    const removed = runtime.deps.atlas.discardPlainUpTo(runtime.deps.game, tier);
    if (!ledger(runtime).stash.includes(map)) runtime.state.selectedUid = null;
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🗺️ {tier}등급 이하 일반 지도석 {removed}개를 버렸습니다.", { tier, removed }), "attack-monster");
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }
  async function combine(runtime) {
    const map = selectedMap(runtime), reason = map && runtime.deps.atlas.combineReason(runtime.deps.game, map.uid);
    if (!map) return;
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    const set = runtime.deps.atlas.combineSet(runtime.deps.game, map.uid);
    if (set.some((entry) => !runtime.deps.atlas.plainMap(entry)) && !await (0, runtime.deps.requestGameConfirmation)(
      (0, runtime.deps._t)("제작한 지도석이 함께 합쳐집니다.\n{names}", { names: set.map(runtime.handlers.mapName).join("\n") }),
      { title: (0, runtime.deps._t)("지도석 합치기"), confirmLabel: (0, runtime.deps._t)("합치기"), cancelLabel: (0, runtime.deps._t)("취소"), dismissOnBackdrop: false }
    )) return;
    const now = runtime.deps.atlas.combineSet(runtime.deps.game, map.uid);
    if (!now || now.length !== set.length || now.some((entry, at) => entry !== set[at])) return (0, runtime.deps.addLog)((0, runtime.deps._t)("보관함이 바뀌어 합치기를 취소했습니다. 다시 눌러 주세요."), "attack-monster");
    const result = runtime.deps.atlas.combine(runtime.deps.game, map.uid);
    if (result.reason) return (0, runtime.deps.addLog)(result.reason, "attack-monster");
    runtime.state.selectedUid = result.map.uid;
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🗺️ {tier}등급 지도석 {count}개를 합쳐 {name} 지도석을 얻었습니다.", { tier: map.tier, count: result.used.length, name: mapName(runtime, result.map) }), "loot-normal");
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }
  async function combineAll(runtime) {
    const busy = runtime.deps.atlas.runOpenReason(runtime.deps.game), plan = runtime.deps.atlas.combineAllPlan(runtime.deps.game);
    if (busy) return (0, runtime.deps.addLog)(busy, "attack-monster");
    if (!plan.used) return (0, runtime.deps.addLog)((0, runtime.deps._t)("셋씩 합칠 지도석이 없습니다."), "attack-monster");
    const ok = await (0, runtime.deps.requestGameConfirmation)(
      (0, runtime.deps._t)("지도석 {used}개를 합쳐 새 지도석 {made}개를 만들까요?\n{list}\n타락, 수호자 지도석은 남습니다.", { used: plan.used, made: sumOf(runtime, plan.made), list: tierCounts(runtime, plan.made) }),
      { title: (0, runtime.deps._t)("지도석 합치기"), confirmLabel: (0, runtime.deps._t)("합치기"), cancelLabel: (0, runtime.deps._t)("취소"), dismissOnBackdrop: false }
    );
    if (!ok) return;
    if (JSON.stringify(runtime.deps.atlas.combineAllPlan(runtime.deps.game)) !== JSON.stringify(plan)) return (0, runtime.deps.addLog)((0, runtime.deps._t)("보관함이 바뀌어 합치기를 취소했습니다. 다시 눌러 주세요."), "attack-monster");
    const result = runtime.deps.atlas.combineAll(runtime.deps.game), made = {};
    for (const map of result.made) made[map.tier] = (made[map.tier] || 0) + 1;
    if (!ledger(runtime).stash.some((map) => map.uid === runtime.state.selectedUid)) runtime.state.selectedUid = [...result.made].sort((a, b) => b.tier - a.tier)[0]?.uid ?? null;
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🗺️ 지도석 {used}개를 합쳐 새 지도석 {made}개를 얻었습니다({list}).", { used: result.used, made: result.made.length, list: tierCounts(runtime, made) }), "loot-normal");
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }
  function craft(runtime, key) {
    const map = selectedMap(runtime);
    if (!map) return;
    const cost = [{ key, amount: 1 }];
    const reason = runtime.deps.atlasMaps.craftReason(map, key) || ((0, runtime.deps.canPayCurrencyCosts)(cost) ? "" : (0, runtime.deps._t)("{name} 없습니다.", { name: (0, runtime.deps.withSubjectParticle)((0, runtime.deps._t)(runtime.deps.ORB_DB[key].name)) }));
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    (0, runtime.deps.payCurrencyCosts)(cost);
    runtime.deps.atlasMaps.craft(map, key);
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🗺️ {node} 지도석에 {name} 사용: {label}", { node: nodeName(runtime, map.node), name: (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name), label: runtime.deps.atlasMaps.crafts[key].label }), "loot-magic");
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }
  function applyFlower(runtime, map, color, omenId) {
    const result = runtime.deps.atlas.changeOmen(runtime.deps.game, map.uid, color, omenId);
    if (result.reason) return (0, runtime.deps.addLog)(result.reason, "attack-monster");
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🗺️ {node} 지도석에 {golden}{color} 꽃 사용: {omen}", { node: nodeName(runtime, map.node), golden: omenId ? `${(0, runtime.deps._t)("황금")} ` : "", color: (0, runtime.deps._t)(runtime.deps.STUMP_BOX_COLORS[color].label), omen: (0, runtime.deps._t)(runtime.deps.lootOmens.describe(result.omen).name) }), "loot-magic");
    (0, runtime.deps.playUiFeedbackSound)("gemSocket");
    (0, runtime.deps.queueImportantSave)(200);
    runtime.state.bloomedUid = map.uid;
    refresh(runtime);
    runtime.state.bloomedUid = null;
  }
  function flowerOmen(runtime, color) {
    const map = selectedMap(runtime);
    if (map) applyFlower(runtime, map, color, null);
  }
  async function goldenFlowerOmen(runtime, color) {
    const map = selectedMap(runtime);
    if (!map) return;
    const choices = runtime.deps.lootOmens.flowerOmens(color, runtime.deps.game, map.omen).map((omen) => ({ value: omen.id, label: omen.name, detail: omen.note }));
    const picked = await (0, runtime.deps.requestGameChoice)({ title: (0, runtime.deps._t)("황금 {label} 꽃", { label: runtime.deps.STUMP_BOX_COLORS[color].label }), message: (0, runtime.deps._t)("지도석에 붙일 기운을 고르세요."), choices, confirmLabel: (0, runtime.deps._t)("이 기운으로"), cancelLabel: (0, runtime.deps._t)("취소") });
    if (!picked) return;
    if (selectedMap(runtime) !== map) return (0, runtime.deps.addLog)((0, runtime.deps._t)("선택한 지도석이 바뀌어 기운 바꾸기를 취소했습니다."), "attack-monster");
    applyFlower(runtime, map, color, picked);
  }
  function toggleFragment(runtime, id) {
    const loadout = ledger(runtime).loadout;
    if (loadout.includes(id)) runtime.deps.atlas.setLoadout(runtime.deps.game, loadout.filter((entry) => entry !== id));
    else if (loadout.length < runtime.deps.atlas.slots(runtime.deps.game)) runtime.deps.atlas.setLoadout(runtime.deps.game, [...loadout, id]);
    else return (0, runtime.deps.addLog)((0, runtime.deps._t)("각인 홈은 {slots}개입니다. 먼저 하나를 빼세요.", { slots: runtime.deps.atlas.slots(runtime.deps.game) }), "attack-monster");
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }
  function open(runtime) {
    const map = selectedMap(runtime);
    if (!map) return;
    const reason = runtime.deps.atlasRun.open(map.uid);
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    runtime.state.selectedUid = null;
    refresh(runtime);
    (0, runtime.deps.switchTab)("tab-battle");
  }
  function openPinnacle(runtime) {
    const reason = runtime.deps.atlasRun.openPinnacle();
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    refresh(runtime);
    (0, runtime.deps.switchTab)("tab-battle");
  }
  function reenter(runtime) {
    const reason = runtime.deps.atlasRun.reenter();
    if (reason) return (0, runtime.deps.addLog)(reason, "attack-monster");
    refresh(runtime);
    (0, runtime.deps.switchTab)("tab-battle");
  }
  async function abandon(runtime) {
    const run = ledger(runtime).run;
    if (!run) return;
    const ok = await (0, runtime.deps.requestGameConfirmation)(abandonMessage(runtime, run), { title: (0, runtime.deps._t)("지도 닫기"), tone: "danger", confirmLabel: (0, runtime.deps._t)("지도 닫기"), cancelLabel: (0, runtime.deps._t)("취소"), dismissOnBackdrop: false });
    if (!ok || ledger(runtime).run !== run) return;
    if (runtime.deps.atlasRun.abandon()) (0, runtime.deps.addLog)((0, runtime.deps._t)("🗺️ 지도를 닫았습니다."), "attack-monster");
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }
  function abandonMessage(runtime, run) {
    const held = run.drops.length + run.found.length, kind = runtime.deps.atlas.node(run.map.node)?.kind;
    const offering = run.board ? (0, runtime.deps._t)("보관 재화 {lossPctFor}%", { lossPctFor: runtime.deps.atlasBoard.lossPctFor(ledger(runtime).board, run.board.boss) }) : run.map.memory ? (0, runtime.deps._t)("보스의 기억 {memory}단계", { memory: run.map.memory }) : kind === "pinnacle" ? "바친 입장권" : runtime.state.RUN_KIND[kind] ? "바친 재료" : "지도석";
    const lost = [offering, held ? (0, runtime.deps._t)("보류 중인 지도석과 각인 {held}개", { held }) : "", heldLate(runtime, run)].filter(Boolean).join(", ");
    return `${run.board ? run.board.name : nodeName(runtime, run.map.node)} 지도를 닫을까요?
손실: ${lost}
일반 장비와 재화, 바닥 전리품은 남습니다.${run.board ? (0, runtime.deps._t)("\n다음 진입에는 심재 주사위 1개가 필요합니다.") : ""}`;
  }
  function toggleAuto(runtime, on) {
    ledger(runtime).autoMap = !!on;
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }
  function toggleAutoGuardians(runtime, on) {
    ledger(runtime).autoGuardians = !!on;
    (0, runtime.deps.queueImportantSave)(200);
    refresh(runtime);
  }

  // modules/ui/atlas-view-announcements.mjs
  function dropsText(runtime, detail) {
    const parts = [];
    if (detail.room) parts.push(`${detail.golden ? `${runtime.deps.ATLAS.goldenRoom.prefix} ` : ""}${runtime.deps.ATLAS.encounters[detail.room].name} 정리: ${detail.rewards.map(([key, n]) => `${(0, runtime.deps._t)(runtime.deps.ORB_DB[key].name)} ${n}`).join(", ") || (0, runtime.deps._t)("보상 없음")}`);
    if (detail.maps.length) parts.push(`지도석 ${detail.maps.map((map) => `${nodeName(runtime, map.node)}(${map.tier})`).join(", ")}`);
    if (detail.fragments.length) parts.push(`각인 ${detail.fragments.map((id) => runtime.deps.atlas.fragment(id).name).join(", ")}`);
    if (detail.late && detail.late.length) parts.push(`${detail.late.map(([id, n]) => `${runtime.deps.atlasEndgame.itemName(id)} ${n}`).join(", ")} (보스를 잡으면 받음)`);
    return `🗺️ ${parts.join(", ")}`;
  }
  function logClass(runtime, detail) {
    if (detail.kind === "failed") return "death";
    return detail.kind === "complete" && (detail.first || detail.bonus || detail.seed) ? "loot-unique" : "season-up";
  }
  function autoReturnText(runtime, detail) {
    const lock = runtime.deps.atlas.lockReason(runtime.deps.game);
    if (lock) return (0, runtime.deps._t)(" → 자동 지도 대기: {lock}", { lock });
    if (!ledger(runtime).stash.length) return " → 지도석이 없어 원래 사냥터로 돌아갑니다.";
    return (0, runtime.deps._t)(" → {tier}등급 이하 지도석이 없어 원래 사냥터로 돌아갑니다.", { tier: detail.tier });
  }
  function returnText(runtime, detail) {
    if (detail.board) return " → 심재의 나이테에서 다음 길을 고르세요.";
    if (detail.next) return "";
    if (runtime.deps.game.settings.mapCompleteAction === "stop") return " → 완료 후 멈춤 설정으로 전투를 멈춥니다.";
    const special = detail.memory?.spoils || !["map", "guardian"].includes(runtime.deps.atlas.node(detail.nodeId).kind);
    if (special) return " → 특수 도전을 마치고 원래 사냥터로 돌아갑니다.";
    if (ledger(runtime).autoMap) return autoReturnText(runtime, detail);
    const left = ledger(runtime).stash.length;
    return left ? (0, runtime.deps._t)(" → 원래 사냥터로 돌아갑니다. 남은 지도석 {left}개는 아틀라스에서 고르세요.", { left }) : "";
  }
  function announce(runtime, detail) {
    const text = {
      board: () => detail.message,
      omen: () => (0, runtime.deps._t)("🔮 뿌리를 품은 몬스터에게서 {name}를 얻었습니다.", { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[detail.key].name) }),
      complete: () => `🗺️ ${detail.name} ${detail.tier}등급 완료${detail.first ? (0, runtime.deps._t)(", 첫 완료") : ""}${detail.bonus ? (0, runtime.deps._t)(", 보너스 달성") : ""}${detail.drops ? (0, runtime.deps._t)(", 지도석 {drops}개", { drops: detail.drops }) : ""}` + (detail.ticket ? `, ${(0, runtime.deps._t)(runtime.deps.ORB_DB[detail.ticket].name)}` : "") + (detail.seed ? (0, runtime.deps._t)(", 세계수 씨앗 {seeds}/{max}", { seeds: detail.seeds, max: runtime.deps.ATLAS.seeds.max }) : "") + (detail.next ? (0, runtime.deps._t)(" → 다음 지도: {next}", { next: nodeName(runtime, detail.next) }) : returnText(runtime, detail)),
      portal: () => (0, runtime.deps._t)("🌀 {REASON}, 남은 포털 {portals}", { REASON: runtime.state.REASON[detail.reason] || detail.reason, portals: detail.portals }),
      failed: () => (0, runtime.deps._t)("🗺️ {REASON}, 포털이 모두 닫혀 지도가 실패했습니다.", { REASON: runtime.state.REASON[detail.reason] || detail.reason }),
      drops: () => dropsText(runtime, detail),
      starter: () => detail.opened ? `🌳 세계수 아틀라스가 열렸습니다${detail.count ? (0, runtime.deps._t)(", 지도석 {count}개", { count: detail.count }) : ""}` : (0, runtime.deps._t)("🌳 이번 루프의 지도석 {count}개가 보관함에 들어왔습니다.", { count: detail.count })
    }[detail.kind];
    if (!text) return;
    (0, runtime.deps.addLog)(text(), logClass(runtime, detail));
    if (detail.kind === "complete" && (detail.lost || detail.lostFragments)) (0, runtime.deps.addLog)((0, runtime.deps._t)("보관 한도가 가득 차 {detail}를 보관하지 못했습니다.", { detail: lostRewards(runtime, detail).join(", ") }), "attack-monster");
    if (detail.kind === "starter" && detail.opened) runtime.deps.contentUnlockUi.announceJourney("map-explore-worldtree");
    runtime.state.signature = "";
  }

  // modules/ui/atlas-view.mjs
  function createAtlasView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { mapName, nodeHtml, linkModel, stashRowHtml, itemFind, leafFind, yarnFind, currencyFind, setView, render, refresh, updateHud, openPanel, pages, progressLine, journeyState, selectRegion, selectNode, openNode, selectMap, revealDevice, revealStash, hint, nodeLabel, craft, flowerOmen, goldenFlowerOmen, discard, discardLow, combine, combineAll, toggleFragment, open, openPinnacle, reenter, abandon, toggleAuto, toggleAutoGuardians };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => disposeAtlasScreen(runtime), render: runtime.handlers.render, refresh: runtime.handlers.refresh, updateHud: runtime.handlers.updateHud, openPanel: runtime.handlers.openPanel, setView: runtime.handlers.setView, pages: runtime.handlers.pages, progressLine: runtime.handlers.progressLine, journey: runtime.handlers.journeyState, selectRegion: runtime.handlers.selectRegion, selectNode: runtime.handlers.selectNode, openNode: runtime.handlers.openNode, selectMap: runtime.handlers.selectMap, revealDevice: runtime.handlers.revealDevice, revealStash: runtime.handlers.revealStash, hint: runtime.handlers.hint, nodeLabel: runtime.handlers.nodeLabel, craft: runtime.handlers.craft, flowerOmen: runtime.handlers.flowerOmen, goldenFlowerOmen: runtime.handlers.goldenFlowerOmen, discard: runtime.handlers.discard, discardLow: runtime.handlers.discardLow, combine: runtime.handlers.combine, combineAll: runtime.handlers.combineAll, toggleFragment: runtime.handlers.toggleFragment, open: runtime.handlers.open, openPinnacle: runtime.handlers.openPinnacle, reenter: runtime.handlers.reenter, abandon: runtime.handlers.abandon, toggleAuto: runtime.handlers.toggleAuto, toggleAutoGuardians: runtime.handlers.toggleAutoGuardians });
    runtime.onMap = (event) => announce(runtime, event.detail);
    runtime.deps.window.addEventListener("project-idle:atlas-map", runtime.onMap);
    return runtime.api;
  }
  function disposeAtlasScreen(runtime) {
    runtime.deps.window.removeEventListener("project-idle:atlas-map", runtime.onMap);
    runtime.state.panelObserver?.disconnect();
    runtime.state.panelObserver = null;
  }
  function initialize(runtime) {
    runtime.state.signature = "";
    runtime.state.hudSignature = "";
    runtime.state.selectedNode = null;
    runtime.state.selectedRegion = "roots";
    runtime.state.selectedUid = null;
    runtime.state.view = "maps";
    runtime.state.panelObserver = null;
    runtime.state.bloomedUid = null;
    runtime.state.STATUS = { locked: "잠김", open: "열림", complete: "완료", bonus: "보너스" };
    runtime.state.STATUS_TONE = { locked: "#8d826e", open: "#f3d28c", complete: "#efe6d2", bonus: "#fff1c9" };
    runtime.state.CRAFT_ORDER = ["magicBud", "sapBud", "formlessDew", "blightSpore", "pruningShears", "goldenRule", "deepWhetstone", "emberBranch"];
    runtime.state.FLOWER_COLORS = Object.keys(runtime.deps.LOOT_OMENS.flowers);
    runtime.state.PAINT = { maps: () => runtime.deps.atlasSheetUi.on() ? runtime.deps.atlasSheetUi.paint() : paintChart(runtime), passives: () => runtime.deps.atlasPassivesUi.paint(), epoch: () => {
    }, late: () => {
    }, memory: () => {
    }, board: () => {
    } };
    runtime.state.LEAF_RANK = 1.5;
    runtime.state.VIEW_TABS = Object.freeze([["maps", "지도"], ["passives", "패시브"], ["late", "최종"], ["memory", "기억"], ["epoch", "시대"], ["board", "나이테 원정"]]);
    runtime.state.VIEWS = {
      maps: () => mapsViewHtml(runtime),
      passives: () => runtime.deps.atlasPassivesUi.html(),
      epoch: () => runtime.deps.atlasEpochUi.html(),
      late: () => runtime.deps.atlasEndgameUi.html(),
      memory: () => runtime.deps.memoryDungeonUi.html(),
      board: () => runtime.deps.atlasBoardUi.html()
    };
    runtime.state.RUN_KIND = { pinnacle: "정점", apex: "최종 보스", league: "리그 우두머리" };
    runtime.state.REASON = { defeat: "쓰러졌습니다", travel: "지도를 떠났습니다", "마을 귀환": "마을로 귀환했습니다" };
  }

  // modules/atlas-ui-classic.mjs
  var atlasUi = createAtlasView({
    get document() {
      return document;
    },
    get switchTab() {
      return switchTab;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get switchMapExploreSubtab() {
      return switchMapExploreSubtab;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get ATLAS() {
      return ATLAS;
    },
    get atlas() {
      return atlas;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get addLog() {
      return addLog;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get _t() {
      return _t;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get atlasMaps() {
      return atlasMaps;
    },
    get canPayCurrencyCosts() {
      return canPayCurrencyCosts;
    },
    get withSubjectParticle() {
      return withSubjectParticle;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get payCurrencyCosts() {
      return payCurrencyCosts;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get lootOmens() {
      return lootOmens;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get requestGameChoice() {
      return requestGameChoice;
    },
    get atlasRun() {
      return atlasRun;
    },
    get atlasBoard() {
      return atlasBoard;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get atlasChartArt() {
      return atlasChartArt;
    },
    get ResizeObserver() {
      return typeof ResizeObserver === "undefined" ? void 0 : ResizeObserver;
    },
    get showInfoTooltipHtml() {
      return typeof showInfoTooltipHtml === "undefined" ? void 0 : showInfoTooltipHtml;
    },
    get ATLAS_PASSIVES() {
      return ATLAS_PASSIVES;
    },
    get atlasPassives() {
      return atlasPassives;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get atlasEncounters() {
      return atlasEncounters;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get window() {
      return window;
    },
    get stumpBox() {
      return stumpBox;
    },
    get LOOT_OMENS() {
      return LOOT_OMENS;
    },
    get itemInfluencesUi() {
      return itemInfluencesUi;
    },
    get BEYOND_BOUNDARY_UNLOCK_SEEDS() {
      return BEYOND_BOUNDARY_UNLOCK_SEEDS;
    },
    get lootMoments() {
      return lootMoments;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get memoryLeaves() {
      return memoryLeaves;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get knitting() {
      return knitting;
    },
    get memoryDungeon() {
      return memoryDungeon;
    },
    get getVisibleHuntingMapCapZoneId() {
      return getVisibleHuntingMapCapZoneId;
    },
    get getAbyssZoneIdForDepth() {
      return getAbyssZoneIdForDepth;
    },
    get getDeepChaosEntryState() {
      return getDeepChaosEntryState;
    },
    get atlasSheetUi() {
      return atlasSheetUi;
    },
    get atlasEndgameUi() {
      return atlasEndgameUi;
    },
    get getPersistentBuildSignature() {
      return getPersistentBuildSignature;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get ACT_EXPLORATION_MAPS() {
      return ACT_EXPLORATION_MAPS;
    },
    get atlasPassivesUi() {
      return atlasPassivesUi;
    },
    get atlasEpochUi() {
      return atlasEpochUi;
    },
    get memoryDungeonUi() {
      return memoryDungeonUi;
    },
    get atlasBoardUi() {
      return atlasBoardUi;
    }
  });
  safeExposeGlobals({ atlasUi });
})();
