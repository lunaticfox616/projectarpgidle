// GENERATED from modules/world-map-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowMatchMedia = (...args) => globalThis.matchMedia(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/world-map-actions.mjs
  function centre(runtime, zone) {
    let area = 0, cx = 0, cy = 0;
    zone.forEach(([x1, y1], i) => {
      const [x2, y2] = zone[(i + 1) % zone.length], f = x1 * y2 - x2 * y1;
      area += f;
      cx += (x1 + x2) * f;
      cy += (y1 + y2) * f;
    });
    return [cx / (3 * area), cy / (3 * area)];
  }
  function glyph(runtime, name, color, scale, outline = runtime.state.OUTLINE) {
    const key = `${name}|${color}|${scale}|${outline}`;
    if (runtime.state.urls.has(key)) return runtime.state.urls.get(key);
    const rows = runtime.deps.WORLD_MAP.symbols[name] || runtime.deps.WORLD_MAP.symbols.diamond;
    const canvas = runtime.deps.document.createElement("canvas");
    canvas.width = canvas.height = 13 * scale;
    const ctx = canvas.getContext("2d");
    const cells = [];
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "#") cells.push([x + 1, y + 1]);
    }));
    ctx.fillStyle = outline;
    for (const [x, y] of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) ctx.fillRect((x + dx) * scale, (y + dy) * scale, scale, scale);
    ctx.fillStyle = color;
    for (const [x, y] of cells) ctx.fillRect(x * scale, y * scale, scale, scale);
    runtime.state.urls.set(key, canvas.toDataURL());
    return runtime.state.urls.get(key);
  }
  function actState(runtime, region) {
    const index = region.act - 1, maximum = runtime.deps.game.maxZoneId, act = runtime.deps.STORY_ACTS[index];
    const current = runtime.deps.game.currentZoneId === index, cleared = index < maximum;
    return {
      index,
      open: runtime.state.api.available("map-explore-hunting") && index <= maximum,
      cleared,
      current,
      next: index === maximum + 1,
      attention: false,
      reward: runtime.state.api.actRewardZoneIds().includes(index),
      status: (0, runtime.deps._t)(current ? "현재 위치" : cleared ? "완료" : "미완료"),
      color: current ? "#ffe39a" : cleared ? "#c9a862" : "#f2d28a",
      title: (0, runtime.deps._t)(act.title),
      kind: (0, runtime.deps.formatStoryActLabel)(act),
      description: act.subtitle ? (0, runtime.deps._t)(act.subtitle) : "",
      target: "",
      symbol: "diamond",
      icon: "act",
      route: "map-explore-hunting",
      go: `explorationAtlasUi.hunt(${index})`
    };
  }
  function contentState(runtime, region) {
    const button = runtime.deps.document.getElementById("btn-" + region.route);
    const summary = runtime.state.api.routeSummary(region.route);
    const entryBlock = button?.dataset.entryCondition;
    const status = region.route === "map-explore-root-boss" ? "" : entryBlock || summary.status || "";
    return {
      open: runtime.state.api.available(region.route),
      cleared: false,
      current: false,
      next: false,
      attention: !!summary.attention,
      status,
      entryBlock,
      color: region.color,
      title: (0, runtime.deps._t)(region.name),
      kind: runtime.deps.EXPLORATION_REGIONS.activities[region.route]?.kind || "",
      description: region.description ? (0, runtime.deps._t)(region.description) : "",
      target: summary.target || "",
      symbol: region.symbol,
      icon: region.icon,
      also: region.also || [],
      route: region.route,
      go: `explorationAtlasUi.enter('${region.route}')`
    };
  }
  function zoneHtml(runtime, entry) {
    const { region, state } = entry, { width: W, height: H, src } = runtime.deps.WORLD_MAP;
    const xs = region.zone.map((p) => p[0]), ys = region.zone.map((p) => p[1]);
    const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
    const clip = region.zone.map(([x, y]) => `${((x - bx) / bw * 100).toFixed(2)}% ${((y - by) / bh * 100).toFixed(2)}%`).join(",");
    const style = `left:${pct(runtime, bx, W)};top:${pct(runtime, by, H)};width:${pct(runtime, bw, W)};height:${pct(runtime, bh, H)};clip-path:polygon(${clip});background-image:url('${src}');background-size:${pct(runtime, W, bw)} ${pct(runtime, H, bh)};background-position:${pct(runtime, bx, W - bw)} ${pct(runtime, by, H - bh)}`;
    const hover = `onmouseenter="worldMapUi.link('${region.id}',true)" onfocus="worldMapUi.link('${region.id}',true)" onmouseleave="worldMapUi.link('${region.id}',false)" onblur="worldMapUi.link('${region.id}',false)"`;
    const press = state.open ? `onclick="worldMapUi.pick('${region.id}')" ondblclick="${state.go}"` : 'aria-disabled="true"';
    return `<button class="wm-zone ${pieceClasses(runtime, entry)}" data-wm="${region.id}" aria-label="${(0, runtime.deps.escapeHTML)(state.open ? state.title : lockedLabel(runtime))}" style="${style}" ${hover} ${press}></button>`;
  }
  function linesHtml(runtime, entry) {
    const { region } = entry, cls = pieceClasses(runtime, entry), points = region.zone.map((p) => p.join(",")).join(" "), [cx, cy] = centre(runtime, region.zone);
    return `<polygon class="wm-outline-under ${cls}" data-wm="${region.id}" points="${points}"/><polygon class="wm-outline ${cls}" data-wm="${region.id}" points="${points}"/><polyline class="wm-leader ${cls}" data-wm="${region.id}" points="${cx.toFixed(1)},${cy.toFixed(1)} ${region.tag[0]},${region.tag[1]}"/>`;
  }
  function nextLinkHtml(runtime, all) {
    const acts = all.filter((e) => e.state.open && e.region.type === "act");
    const from = acts.find((e) => e.state.current) || acts[acts.length - 1], to = from && actAfter(runtime, from.region);
    const rest = to ? `${point(runtime, from.region)} ${point(runtime, to)}` : "";
    return `<polyline class="wm-next-link" data-rest="${rest}" points="${rest}"/>`;
  }
  function aimNextLink(runtime, id, on) {
    const line = runtime.deps.document.querySelector("#ui-exploration-atlas .wm-next-link");
    if (!line) return;
    const hovered = on ? runtime.deps.WORLD_MAP.regions.find((region) => region.id === id && region.type === "act") : null;
    const to = hovered && actAfter(runtime, hovered);
    line.setAttribute("points", hovered ? to ? `${point(runtime, hovered)} ${point(runtime, to)}` : "" : line.dataset.rest);
  }
  function markHtml(runtime, entry) {
    const { region, state } = entry, [cx, cy] = centre(runtime, region.zone);
    const image = state.next ? glyph(runtime, "hollow", "#f2d28a", 2) : placeIcon(runtime, state, !state.open);
    const number = region.type === "act" && state.open ? `<b>${region.act}</b>` : "";
    return `<span class="wm-pin ${pieceClasses(runtime, entry)}" data-wm="${region.id}" style="left:${pct(runtime, cx, runtime.deps.WORLD_MAP.width)};top:${pct(runtime, cy, runtime.deps.WORLD_MAP.height)}"><i style="background-image:url('${image}')"></i>${number}${state.reward ? bangHtml(runtime) : ""}</span>`;
  }
  function tagHtml(runtime, entry) {
    const { region, state } = entry, [cx] = centre(runtime, region.zone);
    const body = state.open ? `${(0, runtime.deps.escapeHTML)(state.title)}${state.status ? `<small>${(0, runtime.deps.escapeHTML)(state.status)}</small>` : ""}` : (0, runtime.deps.escapeHTML)(lockedLabel(runtime));
    const at = `left:round(nearest,${pct(runtime, region.tag[0], runtime.deps.WORLD_MAP.width)},1px);top:round(nearest,${pct(runtime, region.tag[1], runtime.deps.WORLD_MAP.height)},1px)`;
    return `<span class="wm-tag ${region.tag[0] < cx ? "is-left" : ""} ${pieceClasses(runtime, entry)}" data-wm="${region.id}" style="${at}"><span>${body}</span></span>`;
  }
  function spreadFrom(runtime, button, box, art, then) {
    if (!box || box.querySelector(".wm-turn")) return;
    const b = button.getBoundingClientRect(), r = box.getBoundingClientRect();
    const x = ((b.left + b.width / 2 - r.left) / r.width * 100).toFixed(2), y = ((b.top + b.height / 2 - r.top) / r.height * 100).toFixed(2);
    button.classList.add("is-turning");
    const veil = runtime.deps.document.createElement("div");
    veil.className = "wm-turn";
    veil.style.cssText = `background-image:url('${art}');--wm-turn-x:${x}%;--wm-turn-y:${y}%`;
    box.appendChild(veil);
    (0, runtime.deps.playUiFeedbackSound)("open");
    const still = typeof runtime.deps.matchMedia === "function" && (0, runtime.deps.matchMedia)("(prefers-reduced-motion: reduce)").matches;
    const turn = { button, veil, timer: null };
    runtime.turns.add(turn);
    turn.timer = (0, runtime.deps.setTimeout)(() => {
      try {
        then();
      } finally {
        runtime.turns.delete(turn);
        veil.remove();
        button.classList.remove("is-turning");
      }
    }, still ? 0 : runtime.state.TURN_MS);
  }
  function atlasEntranceSpot(runtime) {
    const [x, y] = centre(runtime, runtime.deps.WORLD_MAP.regions.find((row) => row.id === runtime.deps.WORLD_MAP.atlas.entrance).zone);
    return { x: x / runtime.deps.WORLD_MAP.width * 100, y: y / runtime.deps.WORLD_MAP.height * 100 };
  }
  function actionsHtml(runtime, { region, state }) {
    if (region.type === "act") return runtime.state.api.actActionsHtml(state.index);
    return `<button class="wm-go" onclick="${state.go}">${(0, runtime.deps._t)("이동")}</button>`;
  }
  function sideFor(runtime, entry) {
    const { region, state } = entry;
    const kind = state.kind ? `<small>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(state.kind))}</small>` : "";
    const reward = runtime.deps.EXPLORATION_REGIONS.guides[state.route]?.reward;
    const description = reward ? (0, runtime.deps._t)("주요 보상 · {reward}", { reward: (0, runtime.deps._t)(reward) }) : state.description;
    const blocked = state.entryBlock && state.route !== "map-tab-underworld" ? `<p>${(0, runtime.deps.escapeHTML)(state.entryBlock)}</p>` : "";
    return `<div class="wm-side" data-wm="${region.id}" style="--wm-tone:${state.color}">
            <div class="wm-side-text">${kind}<strong>${(0, runtime.deps.escapeHTML)(state.title)}</strong>${description ? `<p>${(0, runtime.deps.escapeHTML)(description)}</p>` : ""}${blocked}${runtime.state.api.rewardNamesHtml(state.route)}${runtime.state.api.trackedRewardHtml(state.route)}</div>
            ${region.type === "content" ? runtime.deps.worldMapBrief.html(region.route) : ""}<div class="wm-side-actions atlas-hunting-action">${actionsHtml(runtime, entry)}</div></div>`;
  }
  function peek(runtime, id) {
    const side = runtime.deps.document.querySelector("#ui-exploration-atlas .wm-side");
    if (!side) return;
    const open = entries(runtime).filter((e) => e.state.open);
    const entry = id && open.find((e) => e.region.id === id) || resting(runtime, open);
    if (entry && side.dataset.wm !== entry.region.id) side.outerHTML = sideFor(runtime, entry);
  }
  function link(runtime, id, on) {
    runtime.deps.document.querySelectorAll(`#ui-exploration-atlas [data-wm="${id}"]`).forEach((piece) => piece.classList.toggle("is-linked", on));
    aimNextLink(runtime, id, on);
    peek(runtime, on ? id : null);
  }
  function pick(runtime, id) {
    runtime.state.picked = id;
    runtime.deps.document.querySelectorAll("#ui-exploration-atlas .is-picked").forEach((piece) => piece.classList.remove("is-picked"));
    runtime.deps.document.querySelectorAll(`#ui-exploration-atlas [data-wm="${id}"]`).forEach((piece) => piece.classList.add("is-picked"));
    peek(runtime, id);
  }
  function pickAct(runtime, zoneId) {
    const region = runtime.deps.WORLD_MAP.regions.find((row) => row.type === "act" && row.act === zoneId + 1);
    if (region) pick(runtime, region.id);
    return !!region;
  }
  function offMapRoutes(runtime) {
    const onMap = new Set(runtime.deps.WORLD_MAP.regions.flatMap((region) => [region.route, ...region.also || []]));
    return runtime.deps.EXPLORATION_REGIONS.regions.flatMap((region) => region.routes).filter((route) => route !== "map-explore-hunting" && !onMap.has(route) && runtime.state.api.available(route));
  }
  function othersHtml(runtime) {
    const chips = offMapRoutes(runtime).map((route) => `<button class="wm-chip" onclick="explorationAtlasUi.enter('${route}')">${(0, runtime.deps.escapeHTML)(runtime.state.api.routeLabel(route))}</button>`);
    return chips.length ? `<div class="wm-others"><span>${(0, runtime.deps._t)("그 밖의 곳")}</span>${chips.join("")}</div>` : "";
  }
  function atlasEntranceHtml(runtime) {
    if (!runtime.state.api.available("map-explore-worldtree")) return "";
    const region = runtime.deps.WORLD_MAP.regions.find((row) => row.id === runtime.deps.WORLD_MAP.atlas.entrance);
    const [x, y] = centre(runtime, region.zone);
    const icon = glyph(runtime, region.symbol, region.color, 2);
    if (!runtime.deps.atlasSheetUi.on()) return `<button type="button" class="wm-atlas-entrance" style="left:${pct(runtime, x, runtime.deps.WORLD_MAP.width)};top:${pct(runtime, y, runtime.deps.WORLD_MAP.height)}" onclick="explorationAtlasUi.showAtlasMap(true)">
            ${(0, runtime.deps._t)("아틀라스")}<i aria-hidden="true" style="background-image:url('${icon}')"></i></button>`;
    return `<button type="button" class="wm-atlas-entrance is-icon" style="left:${pct(runtime, x, runtime.deps.WORLD_MAP.width)};top:${pct(runtime, y, runtime.deps.WORLD_MAP.height)}" aria-label="${(0, runtime.deps._t)("아틀라스")}" data-tip="${(0, runtime.deps._t)("아틀라스")}"
            onclick="worldMapUi.turnToAtlas(this)"><i aria-hidden="true" style="background-image:url('${atlasIcon(runtime, "pinnacle", region.color, false, true)}')"></i></button>`;
  }
  function mixHex(runtime, from, to, share) {
    const parts = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), a = parts(from), b = parts(to);
    return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * share).toString(16).padStart(2, "0")).join("");
  }
  function atlasPalette(runtime, tint, locked, calm = false) {
    const look = runtime.state.ICON_LOOKS[locked ? "locked" : calm ? "calm" : "plain"], base = look.base(tint);
    return {
      Y: look.Y,
      y: look.y,
      d: look.d,
      w: look.w,
      p: look.p,
      q: look.q,
      G: look.G,
      o: runtime.state.OUTLINE,
      k: runtime.state.OUTLINE,
      a: mixHex(runtime, base, "#ffffff", look.light),
      b: base,
      c: mixHex(runtime, base, "#000000", 0.42),
      g: mixHex(runtime, base, "#ffffff", look.gem),
      s: mixHex(runtime, base, "#14111a", 0.82)
    };
  }
  function atlasIcon(runtime, name, tint = runtime.state.ATLAS_ICON_TINT, locked = false, calm = false) {
    const key = `atlas|${name}|${tint}|${locked}|${calm}`;
    if (runtime.state.urls.has(key)) return runtime.state.urls.get(key);
    const rows = runtime.deps.WORLD_MAP.atlas.icons[name] || runtime.deps.WORLD_MAP.icons[name], palette = atlasPalette(runtime, tint, locked, calm), canvas = runtime.deps.document.createElement("canvas");
    canvas.width = rows[0].length * 2;
    canvas.height = rows.length * 2;
    const ctx = canvas.getContext("2d");
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!palette[ch]) return;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(x * 2, y * 2, 2, 2);
    }));
    runtime.state.urls.set(key, canvas.toDataURL());
    return runtime.state.urls.get(key);
  }
  function atlasNodeHtml(runtime, node, point2, { open, lock }) {
    const status = open && !lock ? runtime.deps.atlas.status(runtime.deps.game, node.id) : "locked", tier = runtime.deps.atlas.effectiveTier(runtime.deps.game, node);
    const label = runtime.deps.atlasUi.nodeLabel(node, tier, status);
    const tone = Number.isFinite(tier) && runtime.deps.atlas.tierBand(tier)?.tone || "#ece6d8";
    const tint = runtime.deps.ATLAS.regions.find((row) => row.id === node.region)?.tint || "#6f5a86";
    const icon = atlasIcon(runtime, runtime.deps.WORLD_MAP.atlas.icons[node.kind] ? node.kind : "stone", tint, status === "locked");
    return `<button type="button" class="wm-atlas-node is-${status} kind-${node.kind}" style="${atlasAnchorStyle(runtime, point2)};--wm-tier:${tone}" data-atlas-node="${node.id}"
            aria-label="${label}" data-tip="${label}" aria-disabled="${!open}" onclick="explorationAtlasUi.enterAtlasNode('${node.id}')"><span aria-hidden="true" style="background-image:url('${icon}')">${node.kind === "map" ? tier : ""}</span></button>`;
  }
  function atlasRegionRoutes(runtime, points) {
    return runtime.deps.atlas.links.filter(([from, to]) => points.has(from) && points.has(to)).map(([from, to]) => {
      const [x1, y1] = points.get(from), [x2, y2] = points.get(to);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" vector-effect="non-scaling-stroke"/>`;
    }).join("");
  }
  function atlasRegionHtml(runtime, anchor, access) {
    const region = runtime.deps.ATLAS.regions.find((row) => row.id === anchor.id);
    const lore = runtime.deps.ATLAS.lore.regions[region.id];
    const nodes = runtime.deps.atlas.nodes.filter((node) => node.region === region.id);
    const points = new Map(nodes.map((node) => [node.id, anchor.nodes[node.slot]]));
    const name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(region.name));
    return `<div class="wm-atlas-territory" role="group" aria-label="${name}" data-atlas-region="${region.id}" style="--wm-region:${region.tint}">
            <svg class="wm-atlas-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${atlasRegionRoutes(runtime, points)}</svg>
            <button type="button" class="wm-atlas-region" style="${atlasAnchorStyle(runtime, anchor.label)}"
                data-tip="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(lore.note))}" onclick="explorationAtlasUi.enterAtlasRegion('${region.id}')" ${access.open ? "" : "disabled"}>${name}</button>
            ${nodes.map((node) => atlasNodeHtml(runtime, node, points.get(node.id), access)).join("")}</div>`;
  }
  function atlasOverviewHtml(runtime) {
    const access = { open: runtime.state.api.available("map-explore-worldtree"), lock: runtime.deps.atlas.lockReason(runtime.deps.game) };
    return `<div class="world-map wm-atlas-overview"><div class="wm-side-wrap"><div class="wm-side">
            <div class="wm-side-text"><strong>${(0, runtime.deps._t)("아틀라스")}</strong>
            <p>${(0, runtime.deps._t)("어머니 나무 이전, 고대 존재들이 남긴 다섯 권역입니다.")}</p>
            <p class="wm-atlas-legend"><span><i style="background-image:url('${atlasIcon(runtime, "guardian")}')"></i>${(0, runtime.deps._t)("지역 수호자")}</span><span><i style="background-image:url('${atlasIcon(runtime, "pinnacle", "#6f5a86")}')"></i>${(0, runtime.deps._t)("정점")}</span></p>
            ${access.lock ? `<p class="wm-atlas-lock">${(0, runtime.deps.escapeHTML)(access.lock)}</p>` : ""}</div>
            <div class="wm-side-actions atlas-hunting-action"><button type="button" class="wm-atlas-back" onclick="explorationAtlasUi.showAtlasMap(false)"><span aria-hidden="true">←</span> ${(0, runtime.deps._t)("세계 지도")}</button></div>
            </div></div><div class="wm-view"><div class="wm-map wm-atlas-map" role="group" aria-label="${(0, runtime.deps._t)("아틀라스")}">
            <div class="wm-art wm-atlas-art" aria-hidden="true" style="background-image:url('${runtime.deps.WORLD_MAP.atlas.src}')"></div>
            ${runtime.deps.WORLD_MAP.atlas.regions.map((region) => atlasRegionHtml(runtime, region, access)).join("")}
            ${atlasNodeHtml(runtime, runtime.deps.atlas.node("pinnacle"), runtime.deps.WORLD_MAP.atlas.pinnacle, access)}</div></div></div>`;
  }
  function overviewHtml(runtime, reader) {
    runtime.state.api = reader;
    if (runtime.state.atlasMap) return atlasOverviewHtml(runtime);
    const all = entries(runtime).filter((e) => e.region.id !== runtime.deps.WORLD_MAP.atlas.entrance);
    const open = all.filter((e) => e.state.open), others = othersHtml(runtime);
    if (!open.some((e) => e.region.id === runtime.state.picked)) runtime.state.picked = null;
    const shown = all.filter((e) => e.state.open || e.state.next);
    const layers = `<svg class="wm-lines" viewBox="0 0 ${runtime.deps.WORLD_MAP.width} ${runtime.deps.WORLD_MAP.height}" aria-hidden="true">${shown.map(runtime.handlers.linesHtml).join("")}${nextLinkHtml(runtime, all)}</svg>` + shown.map(runtime.handlers.zoneHtml).join("") + shown.map(runtime.handlers.markHtml).join("") + shown.map(runtime.handlers.tagHtml).join("");
    return `<div class="world-map${others ? " has-others" : ""}">${open.length ? `<div class="wm-side-wrap">${sideFor(runtime, resting(runtime, open))}</div>` : ""}<div class="wm-view"><div class="wm-map" role="group" aria-label="${(0, runtime.deps._t)("세계 지도")}"><div class="wm-art" style="background-image:url('${runtime.deps.WORLD_MAP.src}')"></div>${layers}${atlasEntranceHtml(runtime)}</div></div>${others}</div>`;
  }
  function placeTabsHtml(runtime, reader, route) {
    runtime.state.api = reader;
    const open = entries(runtime).filter((e) => e.state.open), acts = open.filter((e) => e.region.type === "act");
    const act = acts.find((e) => e.state.current) || acts[acts.length - 1];
    const tree = act ? [placeTabHtml(runtime, { ...act.state, title: (0, runtime.deps._t)("나무"), reward: acts.some((e) => e.state.reward) }, route, act.region.act)] : [];
    return tree.concat(open.filter((e) => e.region.type === "content").map((e) => placeTabHtml(runtime, e.state, route, ""))).join("");
  }
  function placeTabHtml(runtime, state, route, number) {
    const on = state.route === route || (state.also || []).includes(route);
    return `<button class="exploration-place-tab${state.attention ? " is-attention" : ""}" aria-pressed="${on}"${on ? "" : ` data-tip="${(0, runtime.deps.escapeHTML)(state.title)}"`} onclick="explorationAtlasUi.enter('${state.route}')"><i style="background-image:url('${placeIcon(runtime, state)}')">${number ? `<b>${number}</b>` : ""}${state.reward ? bangHtml(runtime) : ""}</i><span>${(0, runtime.deps.escapeHTML)(state.title)}</span></button>`;
  }
  function pct(runtime, value, total) {
    return `${(value / total * 100).toFixed(3)}%`;
  }
  function entries(runtime) {
    return runtime.deps.WORLD_MAP.regions.map((region) => ({ region, state: region.type === "act" ? actState(runtime, region) : contentState(runtime, region) }));
  }
  function pieceClasses(runtime, { region, state }) {
    return [
      state.open ? "" : "is-locked",
      state.cleared ? "is-cleared" : "",
      state.current ? "is-current" : "",
      state.next ? "is-next" : "",
      state.attention ? "is-attention" : "",
      state.reward ? "is-reward" : "",
      runtime.state.picked === region.id ? "is-picked" : ""
    ].filter(Boolean).join(" ");
  }
  function lockedLabel(runtime) {
    return (0, runtime.deps._t)("아직 닿지 않은 곳");
  }
  function point(runtime, region) {
    return centre(runtime, region.zone).map((v) => v.toFixed(1)).join(",");
  }
  function actAfter(runtime, region) {
    return runtime.deps.WORLD_MAP.regions.find((other) => other.type === "act" && other.act === region.act + 1);
  }
  function placeIcon(runtime, state, locked = false) {
    return atlasIcon(runtime, state.icon || "act", state.color, locked, true);
  }
  function bangHtml(runtime) {
    return `<em style="background-image:url('${glyph(runtime, "bang", "#ffd82e", 2)}')"></em>`;
  }
  function turnToAtlas(runtime, button) {
    return spreadFrom(runtime, button, button.closest(".wm-map"), runtime.deps.WORLD_MAP.atlas.src, () => runtime.deps.explorationAtlasUi.enter("map-explore-worldtree"));
  }
  function turnToWorld(runtime, button) {
    return spreadFrom(runtime, button, button.closest(".as-chart"), runtime.deps.WORLD_MAP.src, () => runtime.deps.explorationAtlasUi.open());
  }
  function resting(runtime, open) {
    return open.find((e) => e.region.id === runtime.state.picked) || open.find((e) => e.state.current) || open.filter((e) => e.region.type === "act").pop() || open[0];
  }
  function atlasAnchorStyle(runtime, [x, y]) {
    return `left:${x}%;top:${y}%`;
  }

  // modules/ui/world-map-view.mjs
  function createWorldMapView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, turns: /* @__PURE__ */ new Set() };
    const handlers = { linesHtml, zoneHtml, markHtml, tagHtml, overviewHtml, placeTabsHtml, offMapRoutes, pick, pickAct, link, atlasIcon, turnToAtlas, turnToWorld, atlasEntranceSpot };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = { overviewHtml: runtime.handlers.overviewHtml, placeTabsHtml: runtime.handlers.placeTabsHtml, offMapRoutes: runtime.handlers.offMapRoutes, pick: runtime.handlers.pick, pickAct: runtime.handlers.pickAct, link: runtime.handlers.link, atlasIcon: runtime.handlers.atlasIcon, turnToAtlas: runtime.handlers.turnToAtlas, turnToWorld: runtime.handlers.turnToWorld, atlasEntranceSpot: runtime.handlers.atlasEntranceSpot, showAtlas: (on) => {
      runtime.state.atlasMap = on;
    } };
    runtime.api.dispose = () => disposeWorldMapView(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.urls = /* @__PURE__ */ new Map();
    runtime.state.picked = null;
    runtime.state.api = null;
    runtime.state.atlasMap = false;
    runtime.state.OUTLINE = "#1a120a";
    runtime.state.TURN_MS = 520;
    runtime.state.ATLAS_ICON_TINT = "#8a6a45";
    runtime.state.ICON_LOOKS = Object.freeze({
      plain: { base: (tint) => tint, light: 0.38, gem: 0.7, G: "#ffffff", Y: "#fbe7a4", y: "#e2b85a", d: "#9a6f2c", w: "#f6efff", p: "#a47cf0", q: "#4b2f86" },
      locked: { base: () => "#7a7380", light: 0.38, gem: 0.7, G: "#ffffff", Y: "#c9c2cc", y: "#9a929f", d: "#655e6b", w: "#d8d2dc", p: "#8a8290", q: "#4f4955" },
      calm: { base: (tint) => mixHex(runtime, tint, "#7d6f5c", 0.5), light: 0.2, gem: 0.4, G: "#e0d6c0", Y: "#cdb884", y: "#a98a4c", d: "#75572a", w: "#d2c8b4", p: "#8f7bb8", q: "#463560" }
    });
  }
  function disposeWorldMapView(runtime) {
    for (const turn of runtime.turns) {
      runtime.deps.clearTimeout(turn.timer);
      turn.veil.remove();
      turn.button.classList.remove("is-turning");
    }
    runtime.turns.clear();
    runtime.state.urls.clear();
    runtime.state.api = null;
  }

  // modules/world-map-ui-classic.mjs
  var worldMapUi = createWorldMapView({
    get WORLD_MAP() {
      return WORLD_MAP;
    },
    get document() {
      return document;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get STORY_ACTS() {
      return STORY_ACTS;
    },
    get _t() {
      return _t;
    },
    get formatStoryActLabel() {
      return formatStoryActLabel;
    },
    get EXPLORATION_REGIONS() {
      return EXPLORATION_REGIONS;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get playUiFeedbackSound() {
      return playUiFeedbackSound;
    },
    get matchMedia() {
      return typeof matchMedia === "undefined" ? void 0 : windowMatchMedia;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get worldMapBrief() {
      return worldMapBrief;
    },
    get atlasSheetUi() {
      return atlasSheetUi;
    },
    get atlas() {
      return atlas;
    },
    get atlasUi() {
      return atlasUi;
    },
    get ATLAS() {
      return ATLAS;
    },
    get explorationAtlasUi() {
      return explorationAtlasUi;
    }
  });
  safeExposeGlobals({ worldMapUi });
})();
