// GENERATED from modules/act-exploration-room-plans*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/act-exploration-room-plans.mjs
  var ROLE = Object.freeze({ S: "entry", X: "boss", b: "battle", e: "elite", o: "optional" });
  var LETTER = Object.freeze({ entry: "S", boss: "X", battle: "b", elite: "e", optional: "o" });
  var STEP = Object.freeze({ east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1] });
  var OPPOSITE = Object.freeze({ east: "west", west: "east", north: "south", south: "north" });
  var planCellAt = (cells, col, row) => cells.findIndex((cell) => cell.col === col && cell.row === row);
  function parsePlanLines(lines) {
    const cells = [], links = [];
    lines.forEach((line, y) => [...line].forEach((letter, x) => {
      if (y % 2 === 0 && x % 2 === 0 && ROLE[letter]) cells.push({ role: ROLE[letter], col: x / 2, row: y / 2 });
    }));
    lines.forEach((line, y) => [...line].forEach((letter, x) => {
      if (letter === "-" && y % 2 === 0) links.push({ from: planCellAt(cells, (x - 1) / 2, y / 2), to: planCellAt(cells, (x + 1) / 2, y / 2), side: "east" });
      if (letter === "|" && x % 2 === 0) links.push({ from: planCellAt(cells, x / 2, (y - 1) / 2), to: planCellAt(cells, x / 2, (y + 1) / 2), side: "south" });
    }));
    if (links.some((link) => link.from < 0 || link.to < 0)) throw Error("방 놓임새의 문이 방에 닿지 않습니다: " + lines.join("/"));
    return { cells, links };
  }
  function planLines(plan) {
    const width = Math.max(...plan.cells.map((cell) => cell.col)) * 2 + 1, height = Math.max(...plan.cells.map((cell) => cell.row)) * 2 + 1;
    const grid = Array.from({ length: height }, () => Array(width).fill(" "));
    for (const cell of plan.cells) grid[cell.row * 2][cell.col * 2] = LETTER[cell.role];
    for (const link of plan.links) {
      const from = plan.cells[link.from];
      if (link.side === "east") grid[from.row * 2][from.col * 2 + 1] = "-";
      else grid[from.row * 2 + 1][from.col * 2] = "|";
    }
    return grid.map((row) => row.join("").replace(/\s+$/, ""));
  }
  function nameRooms(plan, base) {
    const left = /* @__PURE__ */ new Map();
    for (const [id, , , , , role] of base.rooms) left.set(role, [...left.get(role) || [], id]);
    const reading = plan.cells.map((cell, index) => index).sort((a, b) => plan.cells[a].row - plan.cells[b].row || plan.cells[a].col - plan.cells[b].col);
    const cells = plan.cells.map((cell) => ({ ...cell }));
    for (const index of reading) cells[index].id = (left.get(cells[index].role) || []).shift();
    const spare = [...left.entries()].filter(([role, ids]) => role !== "path" && ids.length).length;
    if (spare || cells.some((cell) => !cell.id)) throw Error("방 놓임새의 방 수가 지도와 다릅니다: " + base.id);
    return Object.freeze({ cells: Object.freeze(cells.map(Object.freeze)), links: Object.freeze(plan.links.map(Object.freeze)) });
  }
  function roleCounts(base) {
    const counts = { battle: 0, elite: 0, optional: 0 };
    for (const row of base.rooms) if (row[5] in counts) counts[row[5]]++;
    return counts;
  }
  var pickOne = (rng, list) => list[Math.floor(rng() * list.length)];
  function shuffledList(rng, list) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function weightedPick(rng, rows) {
    let roll = rng() * rows.reduce((sum, row) => sum + row[1], 0);
    for (const row of rows) {
      roll -= row[1];
      if (roll < 0) return row[0];
    }
    return rows[rows.length - 1][0];
  }
  function splitRoles(counts, rng, rule) {
    const share = rule.mainShare[0] + (rule.mainShare[1] - rule.mainShare[0]) * rng();
    const onMain = Math.max(Math.min(1, counts.battle), Math.min(counts.battle, Math.round(counts.battle * share)));
    const elites = Array.from({ length: counts.elite }, () => rng() < rule.eliteOnMain);
    const main = shuffledList(rng, [...Array(Math.max(0, onMain - 1)).fill("battle"), ...elites.filter(Boolean).map(() => "elite")]);
    if (onMain) main.unshift("battle");
    const side = shuffledList(rng, [...Array(counts.battle - onMain).fill("battle"), ...elites.filter((on) => !on).map(() => "elite")]);
    return { main, side: [...side, ...Array(counts.optional).fill("optional")] };
  }
  function nextMainStep(rng, rule, walk, last) {
    if (last) return "east";
    const upright = walk.side !== "east", rows = [["east", rule.east]];
    if (walk.run < rule.turn) {
      for (const side of ["north", "south"]) if (!upright || walk.side === side) rows.push([side, 1]);
    }
    return weightedPick(rng, rows);
  }
  function walkMainPath(cells, links, roles, rng, rule) {
    const walk = { side: "east", run: 0 };
    roles.forEach((role, index) => {
      const from = cells.length - 1, side = nextMainStep(rng, rule, walk, index === roles.length - 1), [dx, dy] = STEP[side];
      Object.assign(walk, { run: side === "east" ? 0 : walk.side === side ? walk.run + 1 : 1, side });
      cells.push({ role, col: cells[from].col + dx, row: cells[from].row + dy, main: true });
      links.push(side === "north" ? { from: cells.length - 1, to: from, side: "south" } : { from, to: cells.length - 1, side });
    });
  }
  function freeCellsAround(cells, host, strict) {
    const boss = cells.find((cell) => cell.role === "boss");
    return Object.entries(STEP).map(([side, [dx, dy]]) => ({ side, col: host.col + dx, row: host.row + dy })).filter((spot) => planCellAt(cells, spot.col, spot.row) < 0 && !(strict && Math.abs(spot.col - boss.col) + Math.abs(spot.row - boss.row) <= 1));
  }
  function attachSideRoom(cells, links, role, rng, rule) {
    for (const strict of [true, false]) {
      const hosts = cells.map((cell, index2) => ({ cell, index: index2, spots: freeCellsAround(cells, cell, strict) })).filter((row) => row.spots.length && row.cell.role !== "boss" && row.cell.role !== "optional");
      if (!hosts.length) continue;
      const host = weightedPick(rng, hosts.map((row) => [row, row.cell.role === "entry" ? rule.entryHost : row.cell.main ? 1 : rule.chain]));
      const spot = weightedPick(rng, host.spots.map((row) => [row, row.side === "north" || row.side === "south" ? rule.upright : 1]));
      cells.push({ role, col: spot.col, row: spot.row });
      const index = cells.length - 1, forward = spot.side === "east" || spot.side === "south";
      links.push(forward ? { from: host.index, to: index, side: spot.side } : { from: index, to: host.index, side: OPPOSITE[spot.side] });
      return;
    }
    throw Error("방 놓임새에 방을 붙일 자리가 없습니다.");
  }
  function addLoopLink(cells, links, rng, rule) {
    const isOpenRoom = (cell) => cell.role === "battle" || cell.role === "elite", pairs = [];
    cells.forEach((cell, from) => {
      for (const side of ["east", "south"]) {
        const to = planCellAt(cells, cell.col + STEP[side][0], cell.row + STEP[side][1]);
        if (to >= 0 && isOpenRoom(cell) && isOpenRoom(cells[to]) && !links.some((link) => link.from === from && link.to === to)) pairs.push({ from, to, side });
      }
    });
    if (pairs.length && rng() < rule.loop) links.push(pickOne(rng, pairs));
  }
  function semiRandomPlan(rules, base, seed, profile) {
    const rule = { ...rules.plans.random, ...profile }, rng = rules.seeded(`rooms:${base.id}:${seed}`), roles = splitRoles(roleCounts(base), rng, rule);
    const cells = [{ role: "entry", col: 0, row: 0, main: true }], links = [];
    walkMainPath(cells, links, [...roles.main, "boss"], rng, rule);
    for (const role of roles.side) attachSideRoom(cells, links, role, rng, rule);
    addLoopLink(cells, links, rng, rule);
    const left = Math.min(...cells.map((cell) => cell.col)), top = Math.min(...cells.map((cell) => cell.row));
    return nameRooms({ cells: cells.map((cell) => ({ role: cell.role, col: cell.col - left, row: cell.row - top })), links }, base);
  }
  var arenaPlan = (base) => nameRooms(parsePlanLines(["S-X"]), { ...base, rooms: base.rooms.filter((row) => row[5] === "entry" || row[5] === "boss") });
  var CHAIN_WIDE = 4;
  var chainWide = (total) => total <= 12 ? CHAIN_WIDE : total <= 18 ? 6 : 8;
  function chainLink(cells, a, b) {
    const [first, second] = cells[a].col + cells[a].row <= cells[b].col + cells[b].row ? [a, b] : [b, a];
    return { from: first, to: second, side: cells[first].row === cells[second].row ? "east" : "south" };
  }
  function chainPlan(base) {
    const total = base.rooms.length, wide = chainWide(total), cells = [], links = [];
    for (let index = 0; index < total; index++) {
      const row = Math.floor(index / wide), along = index % wide, boss = index === total - 1;
      const cell = { role: index === 0 ? "entry" : boss ? "boss" : "battle", col: row % 2 ? wide - 1 - along : along, row };
      if (boss && row > 0 && along === 0) Object.assign(cell, { row: row - 1, col: cells[index - 1].col + ((row - 1) % 2 ? -1 : 1) });
      cells.push(cell);
      if (index) links.push(chainLink(cells, index - 1, index));
    }
    const left = Math.min(...cells.map((cell) => cell.col));
    return nameRooms({ cells: cells.map((cell) => ({ ...cell, col: cell.col - left })), links }, base);
  }
  function presetPlan(plans, base, index) {
    const lines = (plans.acts[base.act] || [])[index];
    return lines ? nameRooms(parsePlanLines(lines), base) : null;
  }
  function buildRoomPlan(rules, base, plan, seed, profile) {
    if (base.rooms.some((row) => row[5] === "path")) return arenaPlan(base);
    if (plan === "c") return chainPlan(base);
    if (plan[0] === "p") return presetPlan(rules.plans, base, Number(plan.slice(1)));
    return semiRandomPlan(rules, base, plan.length > 1 ? plan.slice(1) : seed, profile);
  }
  var validPlanKey = (plan) => /^(p[0-3]|g\d{0,9}|c)$/.test(String(plan));
  function softPickPreset(rules, act) {
    const count = (rules.plans.acts[act] || []).length, seen = rules.recent.get(act) || [], soft = rules.plans.soft;
    if (!count) return null;
    const rows = Array.from({ length: count }, (unused, index2) => [index2, index2 === seen[0] ? soft.last : index2 === seen[1] ? soft.before : 1]);
    const index = rows.some((row) => row[1] > 0) ? weightedPick(Math.random, rows) : 0;
    rules.recent.set(act, [index, seen[0]]);
    return index;
  }
  function chooseRoomPlan(rules, where, wanted) {
    if (where.source && where.source.chain) return "c";
    if (!where.act) return "g";
    if (wanted === "semiRandomPlan") return "g" + Math.floor(Math.random() * 1e9);
    const fixed = Number(wanted), count = (rules.plans.acts[where.act] || []).length;
    if (Number.isInteger(fixed) && fixed >= 1 && fixed <= count) return "p" + (fixed - 1);
    const index = softPickPreset(rules, where.act);
    return index === null ? "g" + Math.floor(Math.random() * 1e9) : "p" + index;
  }
  var actRegionName = (act) => "act-" + String(act).padStart(2, "0");
  function bossRegionName(zone, rule) {
    if (zone.pinnacleTrack) return rule.tracks[zone.pinnacleTrack] || "";
    return zone.rivalBlade ? rule.rival : zone.cosmosCapstone ? rule.capstone : "";
  }
  function oceanRegion(plans, zone, arena) {
    const rule = plans.regions.ocean, depth = Math.max(0, Number(zone.depthM) || 0);
    if (arena) return rule.arena;
    const band = rule.bands.find(([below]) => depth < below);
    return band ? band[1] : rule.deep;
  }
  function atlasRegion(readAtlas, zone) {
    if (zone.type !== "atlasMap" || zone.boardBoss) return "";
    const atlas = readAtlas(), boss = atlas.lore.bosses.find((row) => row.id === zone.atlasNode);
    return boss?.scene || atlas.lore.regions[boss?.region || zone.atlasRegion]?.scene || "";
  }
  function contentRegion(plans, zone) {
    const rule = plans.regions;
    return rule.zones[zone.id] || (zone.type === "abyss" && zone.isEndlessDepth ? rule.deep : rule.types[zone.type]) || (zone.type === "timeRift" ? rule.rift[zone.riftPhase] : bossRegionName(zone, rule));
  }
  function regionForZone(rules, zone, where) {
    const ancient = atlasRegion(rules.readAtlas, zone);
    if (ancient) return ancient;
    if (where.act) return actRegionName(where.act);
    if (zone.type === "oceanDepth") return oceanRegion(rules.plans, zone, !!where.source.arena);
    return contentRegion(rules.plans, zone) || (where.source.style === "act" ? actRegionName(where.source.act) : "");
  }
  function createRoomPlans(plans, seeded, readAtlas) {
    const rules = { plans, seeded, readAtlas, recent: /* @__PURE__ */ new Map() };
    return Object.freeze({
      parse: parsePlanLines,
      text: planLines,
      valid: validPlanKey,
      countsOf: roleCounts,
      build: buildRoomPlan.bind(null, rules),
      choose: chooseRoomPlan.bind(null, rules),
      region: regionForZone.bind(null, rules),
      oceanRegion: oceanRegion.bind(null, plans),
      random: semiRandomPlan.bind(null, rules)
    });
  }

  // modules/act-exploration-room-plans-classic.mjs
  var actExplorationRoomPlans = createRoomPlans(STAGE_ROOM_PLANS, createSeededRng, () => ATLAS);
  safeExposeGlobals({ actExplorationRoomPlans });
})();
