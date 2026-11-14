// GENERATED from modules/stump-box*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/stump-box-state.mjs
  function stumpEmptyHarvest(env) {
    return { grown: [], gifts: Object.fromEntries(env.HARVEST_ROWS.map((row) => [row, false])), legacyRows: [] };
  }
  function stumpEmpty(env) {
    return {
      version: env.BOX_VERSION,
      acquired: false,
      via: null,
      starter: { seed: false, second: false },
      nextId: 1,
      items: [],
      board: Array(env.CELLS).fill(null),
      graft: Array(env.CELLS).fill(0),
      harvest: stumpEmptyHarvest(env),
      sealed: [],
      pouches: { opened: [], offers: {} },
      codex: [],
      scarGift: false,
      wallet: {},
      nursery: Array(env.CELLS).fill(null)
    };
  }
  function stumpFillLaterShapes(env, box) {
    if (!Array.isArray(box.codex)) box.codex = [];
    if (!box.wallet || typeof box.wallet !== "object") box.wallet = {};
    if (!Array.isArray(box.nursery)) box.nursery = Array(env.CELLS).fill(null);
  }
  function stumpFillHarvestShape(env, box) {
    if (!box.harvest || !Array.isArray(box.harvest.grown) || !box.harvest.gifts) box.harvest = { ...stumpEmptyHarvest(env), ...box.harvest && typeof box.harvest === "object" ? box.harvest : {} };
    if (!Array.isArray(box.harvest.grown)) box.harvest.grown = [];
    if (!Array.isArray(box.harvest.legacyRows)) box.harvest.legacyRows = [];
  }
  function stumpOf(env, state) {
    if (!state.stumpBox || typeof state.stumpBox !== "object") state.stumpBox = stumpEmpty(env);
    const box = state.stumpBox;
    stumpFillHarvestShape(env, box);
    stumpFillLaterShapes(env, box);
    return box;
  }
  function stumpFindItem(box, id) {
    return box.items.find((item) => item.id === id) || null;
  }
  function stumpCellOf(env, state, id) {
    return stumpOf(env, state).board.indexOf(id);
  }
  function stumpIsPlaced(env, state, id) {
    const box = stumpOf(env, state);
    return box.board.includes(id) || box.nursery.includes(id);
  }
  function stumpEditable(env, state) {
    return stumpOf(env, state).acquired && !state.woodsmanBuildLock;
  }
  function stumpInNursery(env, state, id) {
    return stumpOf(env, state).nursery.includes(id);
  }
  function stumpInvalidatePlacementUndo(env, state) {
    env.placementUndos.delete(state);
  }

  // modules/domain/stump-box-item-values.mjs
  function stumpGrowKind(env, random = Math.random) {
    return env.KINDS[Math.min(env.KINDS.length - 1, Math.floor(random() * env.KINDS.length))];
  }
  function stumpLegacyKind(env, id) {
    return env.KINDS[Number(id) % env.KINDS.length];
  }
  function stumpNeed(env, item) {
    return env.deps.STUMP_BOX_GROWTH.need[item.family];
  }
  function stumpIsMature(item) {
    return item.ripe === true;
  }
  function stumpYieldKind(item) {
    return item.family === "seed" && stumpIsMature(item) ? item.path : null;
  }
  function stumpGrows(env, item) {
    return env.FAMILIES.includes(item.family) || !!env.FIXED_TARGET[item.family];
  }
  function stumpYieldOf(env, item) {
    const kind = stumpYieldKind(item);
    return kind ? env.deps.STUMP_BOX_YIELDS[kind][item.color] : null;
  }
  function stumpTargetStage(env, item) {
    return env.FIXED_TARGET[item.family] || item.path;
  }
  function stumpIsPlainHarvest(env, item) {
    return !item.albino && !item.ancient && stumpGoldenMul(env, item) === 1;
  }
  function stumpIsGoldenHarvest(env, item) {
    return !item.albino && !item.ancient && stumpGoldenMul(env, item) > 1;
  }
  function stumpClampRoll(env, value, cap = env.deps.STUMP_BOX_ROLL_LIMIT.max) {
    return Math.round(Math.min(cap, Math.max(env.deps.STUMP_BOX_ROLL_LIMIT.min, Number(value) || 1)) * 100) / 100;
  }
  function stumpQualityOf(item) {
    return item.roll + (item.harvest && item.harvest.bonus || 0);
  }
  function stumpGoldenMul(env, item) {
    return item.golden || item.harvest && item.harvest.golden ? env.deps.STUMP_BOX_RIPENING.golden.mul : 1;
  }
  function stumpItemScale(env, item, boardMul) {
    return stumpQualityOf(item) * stumpGoldenMul(env, item) * boardMul;
  }
  function stumpItemValue(env, item, boardMul) {
    return Math.round(stumpYieldOf(env, item).value * stumpItemScale(env, item, boardMul) * 100) / 100;
  }
  function stumpLineValues(env, item, boardMul) {
    const scale = stumpItemScale(env, item, boardMul);
    return (item.harvest && item.harvest.lines || []).map((line) => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 })).concat(stumpAlbinoLines(env, item));
  }
  function stumpAlbinoLines(env, item) {
    return item.albino && stumpIsMature(item) ? env.deps.STUMP_BOX_RIPENING.albino.variants[stumpYieldKind(item)][item.color] : [];
  }
  function stumpScarValues(item, graft) {
    return Object.entries(item.absorbed || {}).map(([stat, value]) => ({ stat, value: Math.round(value * graft * 100) / 100 }));
  }
  function stumpAddLines(stats, lines) {
    lines.forEach((line) => {
      stats[line.stat] = Math.round(((stats[line.stat] || 0) + line.value) * 100) / 100;
    });
  }

  // modules/domain/stump-box-geometry.mjs
  function stumpHighestLoop(state) {
    const ledger = state.contentProgression && state.contentProgression.highestLoop;
    return Math.max(1, Math.floor(Number(state.season) || 1), Math.floor(Number(ledger) || 1));
  }
  function stumpOpenCount(env, state) {
    if (!stumpOf(env, state).acquired) return 0;
    const steps = Math.floor((stumpHighestLoop(state) - 1) / env.deps.STUMP_BOX_OPENING.everyLoops);
    return Math.min(env.deps.STUMP_BOX_CELL_ORDER.length, env.deps.STUMP_BOX_OPENING.start + steps);
  }
  function stumpLoopForRank(env, rank) {
    return rank < env.deps.STUMP_BOX_OPENING.start ? 1 : 1 + (rank + 1 - env.deps.STUMP_BOX_OPENING.start) * env.deps.STUMP_BOX_OPENING.everyLoops;
  }
  function stumpIsOpen(env, state, cell) {
    return env.deps.STUMP_BOX_CELL_ORDER.slice(0, stumpOpenCount(env, state)).includes(cell);
  }
  function stumpOpensAt(env, state, cell) {
    const rank = env.deps.STUMP_BOX_CELL_ORDER.indexOf(cell);
    return stumpIsOpen(env, state, cell) || rank < 0 ? null : stumpLoopForRank(env, rank);
  }
  function stumpNextOpening(env, state) {
    const open = stumpOpenCount(env, state);
    return open < env.deps.STUMP_BOX_CELL_ORDER.length ? { loop: stumpLoopForRank(env, open), cells: open + 1 } : null;
  }
  function stumpNeighbors(env, cell) {
    const x = cell % env.deps.STUMP_BOX_SIZE, y = Math.floor(cell / env.deps.STUMP_BOX_SIZE), out = [];
    if (x > 0) out.push(cell - 1);
    if (x < env.deps.STUMP_BOX_SIZE - 1) out.push(cell + 1);
    if (y > 0) out.push(cell - env.deps.STUMP_BOX_SIZE);
    if (y < env.deps.STUMP_BOX_SIZE - 1) out.push(cell + env.deps.STUMP_BOX_SIZE);
    return out;
  }

  // modules/domain/stump-box-harvest-records.mjs
  function stumpRecordCodex(env, box, talisman) {
    if (!talisman || !env.CODEX_IDS.includes(talisman.uniqueId) || box.codex.includes(talisman.uniqueId)) return;
    box.codex = env.CODEX_IDS.filter((id) => id === talisman.uniqueId || box.codex.includes(id));
  }
  function stumpCodexStorage(env, state) {
    return Math.floor(stumpOf(env, state).codex.length / env.deps.STUMP_BOX_TALISMAN_CODEX.every) * env.deps.STUMP_BOX_TALISMAN_CODEX.storage;
  }
  function stumpHarvestKey(item) {
    const kind = stumpYieldKind(item);
    return kind ? `${kind}-${item.color}` : null;
  }
  function stumpRecordHarvest(env, box, items) {
    const grown = new Set(box.harvest.grown);
    items.forEach((item) => {
      const key = stumpHarvestKey(item);
      if (key) grown.add(key);
    });
    if (grown.size !== box.harvest.grown.length) box.harvest.grown = env.HARVEST_KEYS.filter((key) => grown.has(key));
  }
  function stumpRowDone(env, box, row) {
    return box.harvest.legacyRows.includes(row) || env.COLORS.every((color) => box.harvest.grown.includes(`${row}-${color}`));
  }
  function stumpHarvestRows(env, state) {
    const box = stumpOf(env, state);
    return env.HARVEST_ROWS.filter((row) => stumpRowDone(env, box, row));
  }
  function stumpHasHarvested(env, state, kind) {
    return stumpOf(env, state).harvest.grown.some((key) => key.startsWith(`${kind}-`));
  }
  function stumpPendingGifts(env, state) {
    const box = stumpOf(env, state);
    return stumpHarvestRows(env, state).filter((row) => !box.harvest.gifts[row]);
  }

  // modules/domain/stump-box-storage.mjs
  function stumpStorage(env, state) {
    const box = stumpOf(env, state), placed = new Set([...box.board, ...box.nursery].filter((id) => id !== null));
    return box.items.filter((item) => !placed.has(item.id));
  }
  function stumpStorageSeedOrder(a, b) {
    return !!b.color - !!a.color || (a.color ? b.roll - a.roll : 0) || a.id - b.id;
  }
  function stumpHasSlot(item) {
    return Number.isInteger(item.slot) && item.slot >= 0;
  }
  function stumpSettleStorageSlots(env, state) {
    const taken = /* @__PURE__ */ new Set(), waiting = [], items = stumpStorage(env, state);
    [...items.filter((item) => item.locked), ...items.filter((item) => !item.locked)].forEach((item) => {
      if (stumpHasSlot(item) && !taken.has(item.slot)) taken.add(item.slot);
      else waiting.push(item);
    });
    let free = 0;
    waiting.sort(stumpStorageSeedOrder).forEach((item) => {
      while (taken.has(free)) free++;
      item.slot = free;
      taken.add(free);
    });
  }
  function stumpOrderStorage(state, cells) {
    cells.forEach((item, index) => {
      if (item) item.slot = index;
    });
  }
  function stumpMoveInStorage(env, state, id, slot) {
    stumpSettleStorageSlots(env, state);
    const items = stumpStorage(env, state), item = items.find((row) => row.id === id);
    if (!item || !Number.isInteger(slot) || slot < 0 || item.slot === slot) return false;
    const other = items.find((row) => row.slot === slot);
    if (other) other.slot = item.slot;
    item.slot = slot;
    return true;
  }

  // modules/domain/stump-box-unlocks.mjs
  function stumpRollCap(env, state) {
    return Math.max(env.deps.STUMP_BOX_ROLL_LIMIT.max, ...stumpOpenUnlocks(env, state).map((row) => row.qualityCap || 0));
  }
  function stumpRollCeiling(env, state) {
    return Math.round((stumpRollCap(env, state) + env.deps.STUMP_CUBE_MERGE.over) * 100) / 100;
  }
  function stumpSpecRollCap(env, state, spec) {
    return spec.overCap === true ? stumpRollCeiling(env, state) : stumpRollCap(env, state);
  }
  function stumpNurseryOpen(env, state) {
    return env.deps.contentProgression.holds("stumpNursery", state);
  }
  function stumpNurseryRate(env, state) {
    return Math.min(1, Math.round((env.deps.STUMP_BOX_NURSERY.rate + env.deps.STUMP_BOX_NURSERY.ratePerRank * env.deps.contentProgression.rank("stumpNurseryRate", state)) * 100) / 100);
  }
  function stumpGraftOpen(env, state) {
    return stumpOf(env, state).acquired && env.deps.contentProgression.holds("graft", state);
  }
  function stumpGraftMaxRank(env, state) {
    return stumpOpenUnlocks(env, state).reduce((sum, row) => sum + (row.graftRanks || 0), env.deps.STUMP_BOX_GRAFT.maxRank);
  }
  function stumpBulkCompostOpen(env, state) {
    return stumpOpenUnlocks(env, state).some((row) => row.bulkCompost);
  }
  function stumpSealLimit(env, state) {
    return stumpOpenUnlocks(env, state).reduce((sum, row) => sum + (row.sealSlots || 0), 0);
  }
  function stumpDevourOpen(env, state) {
    return stumpOpenUnlocks(env, state).some((row) => row.devour);
  }
  function stumpBreedingOpen(env, state) {
    return stumpOpenUnlocks(env, state).some((row) => row.breeding);
  }
  function stumpUnlockMet(env, state, when) {
    if (when.loop && stumpHighestLoop(state) < when.loop) return false;
    if (when.content && !env.deps.contentProgression.holds(when.content, state)) return false;
    if (when.journal && !(Array.isArray(state.journalEntries) && state.journalEntries.includes(when.journal))) return false;
    return stumpHarvestMet(env, state, when);
  }
  function stumpHarvestMet(env, state, when) {
    if (when.harvestCells && stumpOf(env, state).harvest.grown.length < when.harvestCells) return false;
    if (when.harvestRow && !stumpHarvestRows(env, state).includes(when.harvestRow)) return false;
    return !when.harvestRows || stumpHarvestRows(env, state).length >= when.harvestRows;
  }
  function stumpOpenUnlocks(env, state) {
    return stumpOf(env, state).acquired ? env.deps.STUMP_BOX_UNLOCKS.filter((row) => stumpUnlockMet(env, state, row.when)) : [];
  }
  function stumpStorageLimit(env, state) {
    return stumpOpenUnlocks(env, state).reduce((sum, row) => sum + (row.storage || 0), env.deps.STUMP_BOX_STORAGE_BASE) + stumpCodexStorage(env, state) + env.deps.contentProgression.rank("stumpStorage", state) * env.SERIES_STORAGE;
  }
  function stumpStorageFull(env, state) {
    return stumpStorage(env, state).length >= stumpStorageLimit(env, state);
  }

  // modules/domain/stump-box-graft.mjs
  function stumpGraftCost(rank) {
    return rank * (rank + 1) / 2;
  }
  function stumpGraftJournalPoints(env, state) {
    const journal = Array.isArray(state.journalEntries) ? state.journalEntries : [];
    return Object.entries(env.deps.STUMP_BOX_GRAFT.journalPoints).reduce((sum, [id, points]) => sum + (journal.includes(id) ? points : 0), 0);
  }
  function stumpGraftEarned(env, state) {
    return Math.max(0, stumpHighestLoop(state) - env.deps.STUMP_BOX_GRAFT.startLoop + 1) * env.deps.STUMP_BOX_GRAFT.pointsPerLoop + stumpGraftJournalPoints(env, state) + stumpGraftOverflowPoints(env, state);
  }
  function stumpGraftOverflowPoints(env, state) {
    return env.deps.contentProgression.overflow(state);
  }
  function stumpGraftPoints(env, state) {
    const earned = stumpGraftEarned(env, state), spent = stumpOf(env, state).graft.reduce((sum, rank) => sum + stumpGraftCost(rank), 0);
    return { earned, spent, free: Math.max(0, earned - spent) };
  }
  function stumpGraftRaiseReason(env, state, cell) {
    const next = stumpOf(env, state).graft[cell] + 1;
    if (!stumpGraftOpen(env, state)) return env.deps._t("접붙이기는 루프 {startLoop}부터 할 수 있습니다.", { startLoop: env.deps.STUMP_BOX_GRAFT.startLoop });
    if (!stumpEditable(env, state)) return "나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.";
    if (!stumpIsOpen(env, state, cell)) return "닫힌 칸입니다.";
    if (next > stumpGraftMaxRank(env, state)) return "이미 마지막 단계입니다.";
    return stumpGraftPoints(env, state).free >= next ? "" : env.deps._t("접붙이기 점수가 부족합니다. {next}단계에는 {next2}점이 필요합니다.", { next, next2: next });
  }
  function stumpGraftRaise(env, state, cell) {
    if (stumpGraftRaiseReason(env, state, cell)) return false;
    stumpOf(env, state).graft[cell] += 1;
    return true;
  }
  function stumpGraftLowerReason(env, state, cell) {
    if (!stumpEditable(env, state)) return "나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.";
    if (stumpOf(env, state).graft[cell] < 1) return "접붙이지 않은 칸입니다.";
    const need = env.deps.STUMP_BOX_GRAFT.refundSpores;
    return (state.currencies.blightSpore || 0) >= need ? "" : env.deps._t("마름병 포자가 {need}개 필요합니다.", { need });
  }
  function stumpGraftLower(env, state, cell) {
    if (stumpGraftLowerReason(env, state, cell)) return false;
    state.currencies.blightSpore -= env.deps.STUMP_BOX_GRAFT.refundSpores;
    stumpOf(env, state).graft[cell] -= 1;
    return true;
  }

  // modules/domain/stump-box-board-items.mjs
  function stumpItemSignature(item) {
    const lines = item.harvest ? `h${item.harvest.bonus}${item.harvest.golden ? "G" : ""}${item.harvest.lines.map((line) => line.stat + line.value).join(",")}` : "";
    const absorbed = item.absorbed ? Object.entries(item.absorbed).map(([stat, value]) => stat + value).join(",") : "";
    return `${item.id}${item.color}${item.path || ""}${item.ripe ? "R" : ""}${item.roll}${item.golden ? "G" : ""}${item.ancient ? "A" : ""}${item.albino ? "U" : ""}${lines}${absorbed}`;
  }
  function stumpSignature(box) {
    return box.board.map((id, cell) => {
      const item = id === null ? null : stumpFindItem(box, id);
      return item ? `${stumpItemSignature(item)}g${box.graft[cell]}` : "-";
    }).join("|");
  }
  function stumpPlacedItems(box) {
    return box.board.filter((id) => id !== null).map((id) => stumpFindItem(box, id)).filter(Boolean);
  }
  function stumpPlacedCells(box) {
    return box.board.map((id, cell) => ({ item: id === null ? null : stumpFindItem(box, id), cell })).filter((entry) => entry.item);
  }

  // modules/domain/stump-box-synergy.mjs
  function stumpRowOf(env, cell) {
    return Math.floor(cell / env.deps.STUMP_BOX_SIZE);
  }
  function stumpCrossNeighbors(env, cell, axis) {
    return stumpNeighbors(env, cell).filter((at) => stumpRowOf(env, at) === stumpRowOf(env, cell) === (axis === "col"));
  }
  function stumpSynergyCells(box) {
    return box.board.map((id) => {
      const item = id === null ? null : stumpFindItem(box, id);
      return item && item.color ? { item, color: item.color, grown: stumpIsMature(item), ancient: !!item.ancient } : null;
    });
  }
  function stumpSharedColor(run) {
    const colors = new Set(run.filter((at) => !at.ancient).map((at) => at.color));
    return colors.size > 1 ? null : [...colors][0] || "";
  }
  function stumpCrowded(env, cells, run, color) {
    return run.some((cell) => stumpNeighbors(env, cell).some((at) => !run.includes(at) && cells[at] && !cells[at].ancient && cells[at].color === color));
  }
  function stumpResonanceLines(env, cells) {
    const length = env.deps.STUMP_BOX_SYNERGY.resonance.length;
    return env.LINES.flatMap((line) => [...Array(env.deps.STUMP_BOX_SIZE - length + 1).keys()].map((start) => line.cells.slice(start, start + length))).filter((run) => run.every((cell) => cells[cell] && cells[cell].grown)).map((run) => ({ cells: run, color: stumpSharedColor(run.map((cell) => cells[cell])) })).filter((run) => run.color === "" || run.color !== null && !stumpCrowded(env, cells, run.cells, run.color)).map((run) => ({ color: run.color || null, cells: run.cells }));
  }
  function stumpFiveElementsAt(env, cells, immune, cell) {
    const at = cells[cell], near = stumpNeighbors(env, cell).filter((next) => cells[next]);
    const threat = near.find((next) => cells[next].color === env.OVERCOMER[at.color]);
    const counter = near.find((next) => immune.has(next) && cells[next].color === env.deps.STUMP_BOX_OVERCOMES[at.color]);
    const by = threat !== void 0 ? threat : counter;
    return by === void 0 ? null : {
      why: { color: cells[by].color, counter: threat === void 0 },
      feeders: near.filter((next) => cells[next].color === env.FEEDER[at.color])
    };
  }
  function stumpFiveElements(env, cells, immune) {
    const stopped = /* @__PURE__ */ new Map(), links = [];
    cells.forEach((at, cell) => {
      const hit = at && !immune.has(cell) ? stumpFiveElementsAt(env, cells, immune, cell) : null;
      if (!hit) return;
      if (hit.feeders.length) hit.feeders.forEach((feeder) => links.push([cell, feeder]));
      else stopped.set(cell, hit.why);
    });
    return { stopped, links };
  }
  function stumpAllColors(run) {
    const real = run.filter((at) => !at.ancient).map((at) => at.color);
    return new Set(real).size === real.length;
  }
  function stumpDisciplineLines(env, cells, stopped) {
    const sameAcross = (cell, axis) => !cells[cell].ancient && stumpCrossNeighbors(env, cell, axis).some((at) => cells[at] && !cells[at].ancient && cells[at].color === cells[cell].color);
    return env.LINES.filter((line) => line.cells.every((cell) => cells[cell] && cells[cell].grown && !stopped.has(cell)) && stumpAllColors(line.cells.map((cell) => cells[cell])) && !line.cells.some((cell) => sameAcross(cell, line.axis)));
  }
  function stumpSynergyTags(env, cells, resonance, links, discipline) {
    const tags = {}, add = (name) => (cell) => {
      const id = cells[cell].item.id;
      (tags[id] = tags[id] || /* @__PURE__ */ new Set()).add(name);
    };
    resonance.forEach((line) => line.cells.forEach(add("resonance")));
    links.flat().forEach(add("feed"));
    discipline.forEach((line) => line.cells.forEach(add("discipline")));
    return Object.fromEntries(Object.entries(tags).map(([id, set]) => [id, env.SYNERGY_ORDER.filter((name) => set.has(name))]));
  }
  function stumpBoardEffects(env, box) {
    const key = stumpSignature(box);
    if (env.effectsMemo.key === key && env.effectsMemo.box === box) return env.effectsMemo.value;
    const cells = stumpSynergyCells(box), resonance = stumpResonanceLines(env, cells);
    const { stopped, links } = stumpFiveElements(env, cells, new Set(resonance.flatMap((line) => line.cells)));
    const discipline = stumpDisciplineLines(env, cells, stopped).map((line) => ({ axis: line.axis, cells: line.cells }));
    const idOf = (cell) => cells[cell].item.id;
    const value = {
      suppressed: new Set([...stopped.keys()].map(idOf)),
      stoppedBy: Object.fromEntries([...stopped].map(([cell, why]) => [idOf(cell), why])),
      synergy: stumpSynergyTags(env, cells, resonance, links, discipline),
      groups: { resonance, discipline, feed: links },
      resonant: new Set(resonance.map((line) => line.color).filter(Boolean))
    };
    env.effectsMemo = { key, box, value };
    return value;
  }
  function stumpSuppressedIds(env, box) {
    return stumpBoardEffects(env, box).suppressed;
  }
  function stumpNeighbourColors(env, box, cell) {
    return stumpNeighbors(env, cell).map((at) => box.board[at]).filter((id) => id !== null).map((id) => (stumpFindItem(box, id) || {}).color).filter(Boolean);
  }
  function stumpSynergyMul(env, effects, item) {
    return 1 + (effects.synergy[item.id] || []).reduce((sum, name) => sum + env.deps.STUMP_BOX_SYNERGY[name].bonusPct, 0) / 100;
  }
  function stumpBoardNote(env, item, result) {
    const why = result.stoppedBy[item.id];
    if (why) return { text: env.deps._t("비활성화: {label}{value} 인접", { label: env.deps.STUMP_BOX_COLORS[why.color].label, value: why.counter ? env.deps._t(" 공명") : "" }), bad: true };
    const tags = stumpIsMature(item) ? result.synergy[item.id] || [] : [];
    return tags.length ? { text: tags.map((name) => `${env.deps.STUMP_BOX_SYNERGY[name].label} +${env.deps.STUMP_BOX_SYNERGY[name].bonusPct}%`).join(", "), bad: false } : null;
  }

  // modules/domain/stump-box-graft-values.mjs
  function stumpGraftRank(box, cell) {
    return box.graft[cell];
  }
  function stumpGraftMultiplier(env, box, cell) {
    return 1 + (box.graft[cell] + stumpAncientRanks(env, box, cell)) * env.deps.STUMP_BOX_GRAFT.pctPerRank / 100;
  }
  function stumpAncientRanks(env, box, cell) {
    const near = stumpNeighbors(env, cell).map((at) => box.board[at]).filter((id) => id !== null).map((id) => stumpFindItem(box, id)).filter((item) => item && item.ancient && stumpIsMature(item));
    if (!near.length) return 0;
    const suppressed = stumpSuppressedIds(env, box);
    return near.filter((item) => !suppressed.has(item.id)).length * env.deps.STUMP_BOX_ANCIENT.graftRanks;
  }

  // modules/domain/stump-box-stats.mjs
  function stumpEvaluate(env, state) {
    const box = stumpOf(env, state), key = stumpSignature(box);
    if (env.memo.key === key && env.memo.box === box) return env.memo.value;
    const effects = stumpBoardEffects(env, box), counts = Object.fromEntries(env.COLORS.map((color) => [color, 0]));
    const grown = stumpPlacedCells(box).filter(({ item }) => stumpIsMature(item) && stumpYieldOf(env, item) && !effects.suppressed.has(item.id));
    grown.forEach(({ item }) => {
      counts[item.color]++;
    });
    const stats = {}, values = {}, extras = {};
    for (const { item, cell } of grown) {
      const boardMul = stumpSynergyMul(env, effects, item) * stumpGraftMultiplier(env, box, cell);
      values[item.id] = stumpItemValue(env, item, boardMul);
      extras[item.id] = stumpLineValues(env, item, boardMul);
      stumpAddLines(stats, [{ stat: stumpYieldOf(env, item).stat, value: values[item.id] }].concat(extras[item.id]));
    }
    stumpPlacedCells(box).filter(({ item }) => item.family === "scar" && stumpIsMature(item)).forEach(({ item, cell }) => {
      extras[item.id] = stumpScarValues(item, stumpGraftMultiplier(env, box, cell));
      stumpAddLines(stats, extras[item.id]);
    });
    const value = { ...effects, counts, stats, values, extras };
    env.memo = { key, box, value };
    return value;
  }
  function stumpExtraLinesOf(env, item, result) {
    if (result.extras[item.id]) return result.extras[item.id];
    if (item.family === "scar") return Object.entries(item.absorbed || {}).map(([stat, value]) => ({ stat, value }));
    const scale = stumpQualityOf(item) * stumpGoldenMul(env, item), lines = stumpIsMature(item) && item.harvest ? item.harvest.lines : [];
    return lines.map((line) => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 })).concat(stumpAlbinoLines(env, item));
  }
  function stumpApplyStats(env, bucket, state) {
    if (!state.stumpBox || !state.stumpBox.acquired) return;
    const stats = stumpEvaluate(env, state).stats;
    Object.keys(stats).forEach((stat) => env.deps.addStatToBucket(bucket, stat, stats[stat]));
  }

  // modules/domain/stump-box-placement.mjs
  function stumpWornAlbinoId(env, state) {
    return stumpPlacedItems(stumpOf(env, state)).find((item) => item.albino)?.id ?? null;
  }
  function stumpWornOneId(env, state, item) {
    const rule = item ? env.ONE_ON_BOARD.find((row) => row.test(item)) : null;
    return rule ? stumpPlacedItems(stumpOf(env, state)).find((other) => other.id !== item.id && rule.test(other))?.id ?? null : null;
  }
  function stumpOnePerBoardReason(env, state, id, cell) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id), rule = item ? env.ONE_ON_BOARD.find((row) => row.test(item)) : null;
    if (!rule) return "";
    const from = box.board.indexOf(id);
    const conflict = box.board.some((other, at) => other !== null && other !== id && (from >= 0 || at !== cell) && rule.test(stumpFindItem(box, other) || {}));
    return conflict ? rule.reason : "";
  }
  function stumpPlaceOnBoard(env, state, id, cell) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id);
    if (!stumpEditable(env, state) || !item || !stumpIsOpen(env, state, cell) || box.board[cell] !== null || box.nursery.includes(id) || stumpOnePerBoardReason(env, state, id, cell)) return false;
    const from = box.board.indexOf(id);
    if (from >= 0) box.board[from] = null;
    box.board[cell] = id;
    return true;
  }
  function stumpPlace(env, state, id, cell) {
    if (!stumpPlaceOnBoard(env, state, id, cell)) return false;
    stumpInvalidatePlacementUndo(env, state);
    return true;
  }
  function stumpMoveOnBoard(env, state, id, cell) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id), from = box.board.indexOf(id), occupant = box.board[cell];
    if (!stumpEditable(env, state) || !item || !stumpIsOpen(env, state, cell) || from === cell || box.nursery.includes(id) || stumpOnePerBoardReason(env, state, id, cell)) return false;
    if (occupant === null) return stumpPlaceOnBoard(env, state, id, cell);
    box.board[cell] = id;
    if (from >= 0) box.board[from] = occupant;
    return true;
  }
  function stumpRememberPlacement(env, state, before) {
    const box = state.stumpBox;
    env.placementUndos.set(state, { box, items: box.items, season: state.season, before, after: box.board.slice() });
  }
  function stumpMove(env, state, id, cell) {
    const before = stumpOf(env, state).board.slice();
    if (!stumpMoveOnBoard(env, state, id, cell)) return false;
    stumpRememberPlacement(env, state, before);
    return true;
  }
  function stumpUnplace(env, state, id) {
    const box = stumpOf(env, state), from = box.board.indexOf(id);
    if (!stumpEditable(env, state) || from < 0 || stumpStorageFull(env, state)) return false;
    const before = box.board.slice();
    box.board[from] = null;
    stumpRememberPlacement(env, state, before);
    return true;
  }
  function stumpUnplaceAllReason(env, state) {
    const placed = stumpOf(env, state).board.filter((id) => id !== null).length;
    if (!stumpEditable(env, state)) return "나무꾼 전투 중에는 그루터기 함 배치를 바꿀 수 없습니다.";
    if (!placed) return "그루터기 함에 놓인 아이템이 없습니다.";
    const room = stumpStorageLimit(env, state) - stumpStorage(env, state).length;
    return room < placed ? env.deps._t("보관함에 {value}칸이 더 필요합니다.", { value: placed - room }) : "";
  }
  function stumpUnplaceAll(env, state) {
    if (stumpUnplaceAllReason(env, state)) return 0;
    const box = stumpOf(env, state), before = box.board.slice();
    box.board = before.map(() => null);
    stumpRememberPlacement(env, state, before);
    return before.filter((id) => id !== null).length;
  }
  function stumpFirstNurseryCell(env, state) {
    const cell = env.deps.STUMP_BOX_CELL_ORDER.find((at) => stumpIsOpen(env, state, at) && stumpOf(env, state).nursery[at] === null);
    return cell === void 0 ? null : cell;
  }
  function stumpNurseryMove(env, state, id, cell) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id), from = box.nursery.indexOf(id), occupant = box.nursery[cell];
    if (!stumpEditable(env, state) || !item || !stumpIsOpen(env, state, cell) || from === cell) return false;
    const onBoard = box.board.indexOf(id);
    if (onBoard >= 0 && occupant !== null && stumpStorageFull(env, state)) return false;
    if (onBoard >= 0) box.board[onBoard] = null;
    if (from >= 0) box.nursery[from] = occupant;
    box.nursery[cell] = id;
    stumpInvalidatePlacementUndo(env, state);
    return true;
  }
  function stumpNurseryUnplace(env, state, id) {
    const box = stumpOf(env, state), from = box.nursery.indexOf(id);
    if (!stumpEditable(env, state) || from < 0 || stumpStorageFull(env, state)) return false;
    box.nursery[from] = null;
    return true;
  }
  function stumpNurseryClearReason(env, state) {
    const placed = stumpOf(env, state).nursery.filter((id) => id !== null).length;
    if (!stumpEditable(env, state)) return "나무꾼 전투 중에는 생육함 배치를 바꿀 수 없습니다.";
    if (!placed) return "생육함에 놓인 아이템이 없습니다.";
    const room = stumpStorageLimit(env, state) - stumpStorage(env, state).length;
    return room < placed ? env.deps._t("보관함에 {value}칸이 더 필요합니다.", { value: placed - room }) : "";
  }
  function stumpNurseryClear(env, state) {
    if (stumpNurseryClearReason(env, state)) return 0;
    const box = stumpOf(env, state), count = box.nursery.filter((id) => id !== null).length;
    box.nursery = box.nursery.map(() => null);
    return count;
  }
  function stumpPlacementUnchanged(state, record) {
    const box = state.stumpBox;
    return box === record.box && box.items === record.items && state.season === record.season && box.acquired && !state.woodsmanBuildLock && record.after.every((id, cell) => box.board[cell] === id);
  }
  function stumpCanUndoPlacement(env, state) {
    const record = env.placementUndos.get(state);
    if (!record) return false;
    if (!stumpPlacementUnchanged(state, record) || !record.before.every((id, cell) => id === null || stumpIsOpen(env, state, cell))) {
      stumpInvalidatePlacementUndo(env, state);
      return false;
    }
    const placedBefore = record.before.filter((id) => id !== null).length;
    const placedAfter = record.after.filter((id) => id !== null).length;
    return placedBefore >= placedAfter || state.stumpBox.items.length - placedBefore <= stumpStorageLimit(env, state);
  }
  function stumpUndoPlacement(env, state) {
    if (!stumpCanUndoPlacement(env, state)) return false;
    state.stumpBox.board = env.placementUndos.get(state).before.slice();
    stumpInvalidatePlacementUndo(env, state);
    return true;
  }
  function stumpPreviewMove(env, state, id, cell) {
    if (!state.stumpBox || !Number.isInteger(cell)) return null;
    const preview = { ...state, stumpBox: { ...state.stumpBox, board: state.stumpBox.board.slice() } };
    return stumpMoveOnBoard(env, preview, id, cell) ? preview : null;
  }

  // modules/domain/stump-box-growth.mjs
  function stumpKillKind(enemy) {
    return enemy && enemy.isBoss ? "boss" : enemy && enemy.isElite ? "elite" : "normal";
  }
  function stumpIsGrowing(env, item, suppressed) {
    return !suppressed.has(item.id) && !stumpIsMature(item) && stumpGrows(env, item);
  }
  function stumpGrowingItems(env, state) {
    const suppressed = stumpEvaluate(env, state).suppressed;
    return stumpPlacedItems(stumpOf(env, state)).filter((item) => stumpIsGrowing(env, item, suppressed));
  }
  function stumpLineOdds(env, quality) {
    const rows = env.deps.STUMP_BOX_RIPENING.lineOdds, upper = rows.findIndex((row) => row.roll >= quality);
    if (upper <= 0) return rows[upper < 0 ? rows.length - 1 : 0].odds;
    const low = rows[upper - 1], high = rows[upper], t = (quality - low.roll) / (high.roll - low.roll);
    return low.odds.map((odd, index) => odd + (high.odds[index] - odd) * t);
  }
  function stumpPickCount(odds, random) {
    let roll = random();
    for (let count = 0; count < odds.length; count++) {
      roll -= odds[count];
      if (roll < 0) return count;
    }
    return 0;
  }
  function stumpPickLineAt(left, random) {
    let roll = random() * left.reduce((sum, line) => sum + (line.weight || 1), 0);
    const at = left.findIndex((line) => (roll -= line.weight || 1) < 0);
    return at < 0 ? left.length - 1 : at;
  }
  function stumpRollLines(env, item, count, random) {
    const left = ((env.deps.STUMP_BOX_EXTRA_LINES[stumpYieldKind(item)] || {})[item.color] || []).slice(), lines = [];
    while (lines.length < count && left.length) {
      const line = left.splice(stumpPickLineAt(left, random), 1)[0], span = line.span || env.deps.STUMP_BOX_RIPENING.lineValue;
      lines.push({ stat: line.stat, value: Math.round(line.value * (span.min + random() * (span.max - span.min)) * 100) / 100 });
    }
    return lines;
  }
  function stumpRipen(env, item, random) {
    if (!env.FAMILIES.includes(item.family)) return;
    const bonus = random() < env.deps.STUMP_BOX_RIPENING.bumper.chance ? env.deps.STUMP_BOX_RIPENING.bumper.quality : 0;
    const golden = random() < env.deps.STUMP_BOX_RIPENING.golden.chance;
    item.harvest = { bonus, golden, lines: stumpRollLines(env, item, stumpPickCount(stumpLineOdds(env, item.roll + bonus), random), random) };
    if (random() < env.deps.STUMP_BOX_RIPENING.albino.chance) item.albino = true;
  }
  function stumpEnforceAlbinoLimit(box, wornId = null) {
    let kept = wornId !== null;
    box.board.forEach((id, cell) => {
      if (id === wornId || !stumpFindItem(box, id)?.albino) return;
      if (kept) box.board[cell] = null;
      kept = true;
    });
  }
  function stumpGrowItem(env, item, amount, random, ripened) {
    item.xp = Math.min(stumpNeed(env, item), Math.round((item.xp + amount) * 100) / 100);
    if (item.xp < stumpNeed(env, item)) return;
    item.ripe = true;
    if (env.FAMILIES.includes(item.family)) item.path = stumpGrowKind(env, random);
    stumpRipen(env, item, random);
    ripened.push(item);
  }
  function stumpNurseryGrowing(env, state) {
    const box = stumpOf(env, state);
    return box.nursery.filter((id) => id !== null).map((id) => stumpFindItem(box, id)).filter((item) => item && !stumpIsMature(item) && stumpGrows(env, item));
  }
  function stumpGrowBy(env, state, amount, random = Math.random) {
    const ripened = [];
    const wornId = stumpWornAlbinoId(env, state);
    stumpGrowingItems(env, state).forEach((item) => stumpGrowItem(env, item, amount, random, ripened));
    const share = amount * stumpNurseryRate(env, state);
    stumpNurseryGrowing(env, state).forEach((item) => stumpGrowItem(env, item, share, random, ripened));
    if (ripened.some((item) => item.albino)) {
      stumpEnforceAlbinoLimit(stumpOf(env, state), wornId);
      stumpInvalidatePlacementUndo(env, state);
    }
    stumpRecordHarvest(env, stumpOf(env, state), ripened);
    return ripened;
  }
  function stumpGrow(env, state, enemy) {
    return stumpGrowBy(env, state, env.deps.STUMP_BOX_GROWTH.perKill[stumpKillKind(enemy)]);
  }

  // modules/domain/stump-box-items.mjs
  function stumpCreateItem(env, state, spec, force) {
    const box = stumpOf(env, state);
    if (!env.FAMILIES.includes(spec.family) || !env.COLORS.includes(spec.color)) return null;
    if (!force && stumpStorageFull(env, state)) return null;
    const item = { id: box.nextId++, family: spec.family, color: spec.color, path: null, xp: 0, ripe: false, roll: stumpClampRoll(env, spec.roll, stumpSpecRollCap(env, state, spec)) };
    if (spec.golden === true) item.golden = true;
    if (spec.ancient === true && spec.family === "seed") item.ancient = true;
    box.items.push(item);
    return item;
  }
  function stumpAddTalisman(env, state, talisman, force) {
    const box = stumpOf(env, state), fields = env.deps.talismans.normalizeTalisman(talisman);
    if (!box.acquired || !fields || !force && stumpStorageFull(env, state)) return null;
    const item = { id: box.nextId++, family: "talisman", color: null, path: null, xp: 0, ripe: false, roll: 1, ...fields };
    box.items.push(item);
    stumpRecordCodex(env, box, item);
    return item;
  }
  function stumpDiscard(env, state, id) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id);
    if (stumpIsPlaced(env, state, id) || !item || item.locked) return false;
    box.items = box.items.filter((item2) => item2.id !== id);
    return true;
  }

  // modules/domain/stump-box-starter.mjs
  function stumpEligible(env, state) {
    const journal = Array.isArray(state.journalEntries) && state.journalEntries.includes("act_10");
    const claimed = [state.claimedActRewards, state.claimableActRewards].some((list) => Array.isArray(list) && list.includes(9));
    return journal || claimed || Number(state.maxZoneId) >= env.deps.ABYSS_START_ZONE_ID || stumpHighestLoop(state) >= 2 || Number(state.loopCount) >= 1;
  }
  function stumpSync(env, state, via) {
    const box = stumpOf(env, state);
    if (box.acquired || !stumpEligible(env, state)) return false;
    box.acquired = true;
    box.via = via;
    return true;
  }
  function stumpClaimStarter(env, state, slot, color) {
    const box = stumpOf(env, state);
    if (!box.acquired || !env.STARTER_SLOTS.includes(slot) || box.starter[slot]) return null;
    const item = stumpCreateItem(env, state, { family: "seed", color, roll: 1 });
    if (item) box.starter[slot] = true;
    return item;
  }
  function stumpClash(env, a, b) {
    return env.OVERCOMER[a] === b || env.OVERCOMER[b] === a;
  }
  function stumpStarterChoice(env, state, stats) {
    const seed = env.SKILL_ELEMENT_COLORS[(env.deps.SKILL_DB[state.activeSkill] || {}).ele] || "physical";
    const others = Object.keys(env.RESIST_STATS).filter((color) => color !== seed), calm = others.filter((color) => !stumpClash(env, color, seed));
    const second = (calm.length ? calm : others).reduce((low, color) => (stats[env.RESIST_STATS[color]] || 0) < (stats[env.RESIST_STATS[low]] || 0) ? color : low);
    return { seed, second };
  }
  function stumpStarterOwed(env, state) {
    const box = stumpOf(env, state);
    return box.acquired && env.STARTER_SLOTS.some((slot) => !box.starter[slot]);
  }
  function stumpGrantStarter(env, state, stats) {
    const choice = stumpStarterChoice(env, state, stats);
    return env.STARTER_SLOTS.map((slot) => stumpClaimStarter(env, state, slot, choice[slot])).filter(Boolean);
  }
  function stumpTouchesClash(env, box, cell, color) {
    return stumpNeighbourColors(env, box, cell).some((other) => stumpClash(env, other, color));
  }
  function stumpPlantStored(env, state) {
    const box = stumpOf(env, state);
    let placed = 0;
    for (const item of stumpStorage(env, state).filter((row) => env.FAMILIES.includes(row.family))) {
      const cell = env.deps.STUMP_BOX_CELL_ORDER.find((at) => stumpIsOpen(env, state, at) && box.board[at] === null && !stumpTouchesClash(env, box, at, item.color));
      if (cell !== void 0 && stumpPlace(env, state, item.id, cell)) placed++;
    }
    return placed;
  }

  // modules/domain/stump-box-restore.mjs
  function stumpValidItem(env, raw) {
    const colored = raw && (env.FAMILIES.includes(raw.family) || raw.family === "sap") && env.COLORS.includes(raw.color);
    const known = raw && (raw.family === "talisman" || raw.family === "scar" || colored);
    return known && Number.isSafeInteger(raw.id) && raw.id > 0;
  }
  function stumpCleanScar(env, raw) {
    const xp = Math.min(env.deps.STUMP_BOX_GROWTH.need.scar, Math.max(0, Math.floor(Number(raw.xp) || 0))), absorbed = {};
    Object.entries(raw.absorbed && typeof raw.absorbed === "object" ? raw.absorbed : {}).forEach(([stat, value]) => {
      if (env.SCAR_CAPS[stat] && Number(value) > 0) absorbed[stat] = Math.round(Math.min(env.SCAR_CAPS[stat], Number(value)) * 100) / 100;
    });
    const count = (value) => Math.max(0, Math.floor(Number(value) || 0));
    return {
      id: raw.id,
      family: "scar",
      color: null,
      path: null,
      xp,
      ripe: xp >= env.deps.STUMP_BOX_GROWTH.need.scar,
      roll: 1,
      absorbed,
      meals: count(raw.meals),
      misses: count(raw.misses)
    };
  }
  function stumpCleanHarvest(env, raw, item) {
    if (!item.ripe || !raw || typeof raw !== "object") return void 0;
    const pool = (env.deps.STUMP_BOX_EXTRA_LINES[stumpYieldKind(item)] || {})[item.color] || [], seen = /* @__PURE__ */ new Set(), span = env.deps.STUMP_BOX_RIPENING.lineValue;
    const lines = (Array.isArray(raw.lines) ? raw.lines : []).map((line) => ({ line, row: pool.find((row) => line && row.stat === line.stat) })).filter(({ line, row }) => row && Number(line.value) > 0 && !seen.has(row.stat) && seen.add(row.stat)).slice(0, 3).map(({ line, row }) => ({ stat: row.stat, value: Math.round(Math.min(row.value * span.max, Number(line.value)) * 100) / 100 }));
    return { bonus: raw.bonus === env.deps.STUMP_BOX_RIPENING.bumper.quality ? raw.bonus : 0, golden: raw.golden === true, lines };
  }
  function stumpCleanTalisman(env, raw) {
    const fields = env.deps.talismans.normalizeTalisman(raw);
    if (!fields) return null;
    const xp = Math.min(env.deps.STUMP_BOX_GROWTH.need.talisman, Math.max(0, Math.floor(Number(raw.xp) || 0)));
    return { id: raw.id, family: "talisman", color: null, path: null, xp, ripe: xp >= env.deps.STUMP_BOX_GROWTH.need.talisman, roll: 1, ...fields };
  }
  function stumpCleanMarks(env, raw, item) {
    if (raw.golden === true) item.golden = true;
    if (raw.ancient === true && raw.family === "seed") item.ancient = true;
    if (raw.albino === true) {
      item.albino = true;
      item.xp = stumpNeed(env, item);
      item.ripe = true;
    }
  }
  function stumpCleanItem(env, raw, cap) {
    const item = stumpCleanItemFields(env, raw.family === "sap" ? stumpLegacySap(env, raw) : raw, cap);
    if (item && raw.locked === true) item.locked = true;
    if (item && Number.isInteger(raw.slot) && raw.slot >= 0) item.slot = raw.slot;
    return item;
  }
  function stumpCleanItemFields(env, raw, cap) {
    if (raw.family === "talisman") return stumpCleanTalisman(env, raw);
    if (raw.family === "scar") return stumpCleanScar(env, raw);
    const xp = Math.min(env.deps.STUMP_BOX_GROWTH.need.seed, Math.max(0, Math.floor(Number(raw.xp) || 0)));
    const ripe = xp >= env.deps.STUMP_BOX_GROWTH.need.seed;
    const path = ripe ? env.KINDS.includes(raw.path) ? raw.path : stumpLegacyKind(env, raw.id) : null;
    const item = { id: raw.id, family: "seed", color: raw.color, path, xp, ripe, roll: stumpClampRoll(env, raw.roll, cap) };
    stumpCleanMarks(env, raw, item);
    const harvest = stumpCleanHarvest(env, raw.harvest, item);
    if (harvest) item.harvest = harvest;
    return item;
  }
  function stumpLegacySap(env, raw) {
    const ripe = raw.ripe === true || Number(raw.xp) >= env.deps.STUMP_BOX_GROWTH.legacySapNeed;
    return { ...raw, family: "seed", xp: ripe ? env.deps.STUMP_BOX_GROWTH.need.seed : 0, path: ripe ? "root" : null };
  }
  function stumpCurrentSocketItem(env, raw) {
    if (!raw || typeof raw !== "object" || raw.family !== "sap" || !env.COLORS.includes(raw.color)) return raw;
    return stumpCleanItem(env, stumpLegacySap(env, raw), Math.max(env.deps.STUMP_BOX_ROLL_LIMIT.max, Number(raw.roll) || 0));
  }
  function stumpRestoreGraft(env, raw, state) {
    const source = Array.isArray(raw) ? raw : [], max = stumpGraftMaxRank(env, state);
    const ranks = Array.from({ length: env.CELLS }, (_, cell) => Math.min(max, Math.max(0, Math.floor(Number(source[cell]) || 0))));
    let over = ranks.reduce((sum, rank) => sum + stumpGraftCost(rank), 0) - stumpGraftEarned(env, state);
    while (over > 0) {
      const cell = ranks.lastIndexOf(Math.max(...ranks));
      over -= ranks[cell];
      ranks[cell] -= 1;
    }
    return ranks;
  }
  function stumpUpgradeGrowth(env, raw) {
    const items = Array.isArray(raw.items) ? raw.items : [];
    if (Number(raw.version) >= 2) return items;
    return items.map((item) => {
      const old = item && env.deps.STUMP_BOX_GROWTH.v1Need[item.family], now = item && env.deps.STUMP_BOX_GROWTH.need[item.family], xp = Number(item && item.xp) || 0;
      return old ? { ...item, xp: item.ripe === true || xp >= old ? now : Math.floor(xp * now / old) } : item;
    });
  }
  function stumpRestoreCells(env, list, target, seen, used) {
    (Array.isArray(list) ? list : []).slice(0, env.CELLS).forEach((id, cell) => {
      if (seen.has(id) && !used.has(id)) {
        used.add(id);
        target[cell] = id;
      }
    });
  }
  function stumpRestoreItems(env, raw, box, cap) {
    const seen = /* @__PURE__ */ new Set();
    stumpUpgradeGrowth(env, raw).filter((...args) => stumpValidItem(env, ...args)).forEach((item) => {
      const clean = seen.has(item.id) ? null : stumpCleanItem(env, item, cap);
      if (clean) {
        seen.add(clean.id);
        box.items.push(clean);
      }
    });
    const used = /* @__PURE__ */ new Set();
    stumpRestoreCells(env, raw.board, box.board, seen, used);
    stumpRestoreCells(env, raw.nursery, box.nursery, seen, used);
    stumpEnforceAlbinoLimit(box);
  }
  function stumpCurrentKey(key) {
    return String(key).replace(/^amber(?=-|$)/, "root");
  }
  function stumpRestoreHarvest(env, raw, box, version) {
    const source = raw && typeof raw === "object" ? raw : {}, grown = new Set((Array.isArray(source.grown) ? source.grown : []).map(stumpCurrentKey));
    const gifts = Object.fromEntries(Object.entries(source.gifts && typeof source.gifts === "object" ? source.gifts : {}).map(([row, taken]) => [stumpCurrentKey(row), taken]));
    box.harvest.grown = env.HARVEST_KEYS.filter((key) => grown.has(key));
    const kept = Number(version) >= 3 ? new Set(Array.isArray(source.legacyRows) ? source.legacyRows : []) : new Set(env.HARVEST_ROWS.filter((row) => env.OLD_COLORS.every((color) => grown.has(`${row}-${color}`))));
    box.harvest.legacyRows = env.HARVEST_ROWS.filter((row) => kept.has(row));
    env.HARVEST_ROWS.forEach((row) => {
      box.harvest.gifts[row] = gifts[row] === true;
    });
    stumpRecordHarvest(env, box, box.items.filter(stumpIsMature));
  }
  function stumpRestoreWallet(env, raw) {
    const out = {};
    Object.entries(raw && typeof raw === "object" ? raw : {}).forEach(([stack, value]) => {
      const key = stumpCurrentKey(stack), count = Math.floor(Number(value));
      if (env.HARVEST_KEYS.includes(key) && Number.isFinite(count) && count > 0) out[key] = (out[key] || 0) + count;
    });
    return out;
  }
  function stumpRestoreSealed(env, raw, state) {
    const cells = (Array.isArray(raw) ? raw : []).filter((cell) => Number.isInteger(cell) && stumpIsOpen(env, state, cell));
    return [...new Set(cells)].slice(0, stumpSealLimit(env, state));
  }
  function stumpRestorePouches(env, raw) {
    const rows = new Set(env.deps.STUMP_BOX_UNLOCKS.filter((row) => row.pouch).map((row) => row.id)), source = raw && typeof raw === "object" ? raw : {};
    const opened = [...new Set((Array.isArray(source.opened) ? source.opened : []).filter((id) => rows.has(id)))], offers = {};
    Object.entries(source.offers && typeof source.offers === "object" ? source.offers : {}).forEach(([id, list]) => {
      const valid = Array.isArray(list) ? list.filter((spec) => spec && spec.family === "seed" && env.COLORS.includes(spec.color)) : [];
      if (rows.has(id) && !opened.includes(id) && valid.length) offers[id] = valid.map((spec) => ({ family: "seed", color: spec.color, roll: stumpClampRoll(env, spec.roll) }));
    });
    return { opened, offers };
  }
  function stumpRestoreCodex(env, raw, box) {
    const held = box.items.filter((item) => item.family === "talisman").map((item) => item.uniqueId);
    const known = new Set((Array.isArray(raw) ? raw : []).concat(held));
    return env.CODEX_IDS.filter((id) => known.has(id));
  }
  function stumpRestore(env, state) {
    stumpInvalidatePlacementUndo(env, state);
    const raw = state.stumpBox, box = stumpEmpty(env);
    state.stumpBox = box;
    if (raw && typeof raw === "object") {
      box.acquired = raw.acquired === true;
      box.via = typeof raw.via === "string" ? raw.via : null;
      box.starter = { seed: !!(raw.starter && raw.starter.seed), second: !!(raw.starter && (raw.starter.second || raw.starter.sap)) };
      stumpRestoreItems(env, raw, box, stumpRollCeiling(env, state));
      box.nextId = Math.max(Number.isSafeInteger(raw.nextId) ? raw.nextId : 1, ...box.items.map((item) => item.id + 1), 1);
      stumpRestoreHarvest(env, raw.harvest, box, raw.version);
      box.codex = stumpRestoreCodex(env, raw.codex, box);
      box.pouches = stumpRestorePouches(env, raw.pouches);
      box.graft = stumpRestoreGraft(env, raw.graft, state);
      box.sealed = stumpRestoreSealed(env, raw.sealed, state);
      box.scarGift = raw.scarGift === true;
      box.wallet = stumpRestoreWallet(env, raw.wallet);
    }
    stumpSync(env, state, "migration");
    return box;
  }

  // modules/domain/stump-box-item-view.mjs
  function stumpStageOf(env, item) {
    if (env.ASLEEP[item.family]) return stumpIsMature(item) ? item.family : env.ASLEEP[item.family];
    return stumpIsMature(item) && item.path ? item.path : "seed";
  }
  function stumpShortName(env, item) {
    if (item.family === "talisman") return stumpIsMature(item) ? item.name : env.deps._t("{name} (잠듦)", { name: item.name });
    if (item.family === "scar") return stumpIsMature(item) ? env.deps.STUMP_BOX_SCAR.name : env.deps._t("{name} (잠듦)", { name: env.deps.STUMP_BOX_SCAR.name });
    return `${item.albino ? env.deps._t("알비노 ") : ""}${stumpGoldenMul(env, item) > 1 ? env.deps._t("황금 ") : ""}${item.ancient ? env.deps._t("고대 ") : ""}${env.deps.STUMP_BOX_COLORS[item.color].label} ${env.deps.STUMP_BOX_STAGES[stumpStageOf(env, item)].label}`;
  }
  function stumpLabel(env, item) {
    return stumpShortName(env, item);
  }
  function stumpLineText(env, stat, value) {
    const row = env.LINE_ROWS.concat(env.ALBINO_ROWS).find((entry) => entry.stat === stat);
    const shown = String(Math.round(value * 10) / 10);
    return row ? row.text.replace("{v}", shown) : `${env.deps.getStatName(stat)} +${shown}`;
  }
  function stumpIconPath(env, item) {
    if (item.albino) return `assets/items/stump-albino-v1/${stumpYieldKind(item)}-${item.color}.png`;
    if (item.family === "scar" && stumpIsMature(item)) return "assets/items/stump-albino-v1/scar-ember.png";
    const icon = env.deps.STUMP_BOX_STAGES[stumpStageOf(env, item)].icon, suffix = item.family === "talisman" ? item.rarity : item.color;
    return `assets/items/stump-pixel-v1/${icon}${suffix ? `-${suffix}` : ""}.png`;
  }

  // modules/domain/stump-box-seed-spec.mjs
  function stumpDropColor(env, state, random) {
    const placed = stumpPlacedItems(stumpOf(env, state)).map((item) => item.color).filter(Boolean);
    const pool = placed.length && random() < env.deps.STUMP_BOX_DROPS.boardColorShare ? placed : env.COLORS;
    return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
  }
  function stumpSeedDropSpec(env, state, random) {
    const spec = { family: "seed", color: stumpDropColor(env, state, random), roll: stumpClampRoll(env, env.deps.STUMP_BOX_DROPS.roll.min + random() * (env.deps.STUMP_BOX_DROPS.roll.max - env.deps.STUMP_BOX_DROPS.roll.min)) };
    spec.golden = random() < env.deps.STUMP_BOX_RIPENING.golden.dropChance;
    return spec;
  }
  function stumpDropView(spec) {
    return { ...spec, xp: 0, ripe: false };
  }
  function stumpDropIcon(env, spec) {
    return stumpIconPath(env, stumpDropView(spec));
  }
  function stumpDropName(env, spec) {
    return stumpLabel(env, stumpDropView(spec));
  }
  function stumpValidDrop(env, spec) {
    return !!spec && env.FAMILIES.includes(spec.family) && env.COLORS.includes(spec.color) && Number.isFinite(spec.roll);
  }

  // modules/domain/stump-box-harvest-price.mjs
  function stumpHarvestPriceKey(kind, color) {
    return `harvest:${kind}${color ? `:${color}` : ""}`;
  }
  function stumpIsHarvestPrice(env, key) {
    return env.HARVEST_PRICE.test(key);
  }
  function stumpParseHarvestPrice(env, key) {
    const [, kind, color] = env.HARVEST_PRICE.exec(key);
    return { kind, color: color || null };
  }
  function stumpHarvestPriceName(env, key) {
    const { kind, color } = stumpParseHarvestPrice(env, key), name = kind === env.ANY_KIND ? env.ANY_KIND_LABEL : env.deps.STUMP_BOX_STAGES[kind].label;
    return color ? `${env.deps._t(env.deps.STUMP_BOX_COLORS[color].label)} ${env.deps._t(name)}` : env.deps._t(name);
  }
  function stumpHarvestPriceIcon(env, key) {
    const { kind, color } = stumpParseHarvestPrice(env, key);
    return `assets/items/stump-pixel-v1/${env.deps.STUMP_BOX_STAGES[kind === env.ANY_KIND ? "flower" : kind].icon}-${color || "fire"}.png`;
  }
  function stumpHarvestWalletKeys(env) {
    return [...env.COLORS.map((color) => stumpHarvestPriceKey("flower", color)), stumpHarvestPriceKey("root"), stumpHarvestPriceKey("vine"), stumpHarvestPriceKey("fruit")];
  }

  // modules/domain/stump-box-wallet.mjs
  function stumpHarvestForPrice(env, state, key) {
    const { kind, color } = stumpParseHarvestPrice(env, key);
    return stumpStorage(env, state).filter((item) => stumpIsMature(item) && !item.locked && (kind === env.ANY_KIND || stumpYieldKind(item) === kind) && (!color || item.color === color)).sort((a, b) => stumpIsPlainHarvest(env, b) - stumpIsPlainHarvest(env, a) || stumpQualityOf(a) - stumpQualityOf(b));
  }
  function stumpHarvestPriceHeld(env, state, key) {
    return stumpHarvestForPrice(env, state, key).length + stumpWalletForPrice(env, state, key).reduce((sum, stack) => sum + stumpWalletCount(env, state, stack), 0);
  }
  function stumpPayHarvestPrice(env, state, key) {
    const stack = stumpWalletForPrice(env, state, key)[0];
    if (stack) return stumpSpendWallet(env, state, stack) ? { walletKey: stack } : null;
    const item = stumpHarvestForPrice(env, state, key)[0];
    return item && stumpDiscard(env, state, item.id) ? item : null;
  }
  function stumpWalletCount(env, state, key) {
    return Number(stumpOf(env, state).wallet[key]) || 0;
  }
  function stumpWalletTotal(env, state) {
    return env.HARVEST_KEYS.reduce((sum, key) => sum + stumpWalletCount(env, state, key), 0);
  }
  function stumpAddToWallet(box, item) {
    const key = `${stumpYieldKind(item)}-${item.color}`;
    box.wallet[key] = (Number(box.wallet[key]) || 0) + 1;
  }
  function stumpWalletForPrice(env, state, key) {
    const { kind, color } = stumpParseHarvestPrice(env, key), kinds = kind === env.ANY_KIND ? env.KINDS : [kind];
    return kinds.flatMap((one) => (color ? [color] : env.COLORS).map((tone) => `${one}-${tone}`)).filter((stack) => stumpWalletCount(env, state, stack) > 0).sort((a, b) => stumpWalletCount(env, state, b) - stumpWalletCount(env, state, a));
  }
  function stumpSpendWallet(env, state, key) {
    const left = stumpWalletCount(env, state, key);
    if (left < 1) return false;
    if (left === 1) delete stumpOf(env, state).wallet[key];
    else stumpOf(env, state).wallet[key] = left - 1;
    return true;
  }
  function stumpCanMonetize(env, state, item) {
    return !!item && stumpEditable(env, state) && env.FAMILIES.includes(item.family) && stumpIsMature(item) && !item.locked && !stumpIsPlaced(env, state, item.id);
  }
  function stumpMonetize(env, state, id) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id);
    if (!stumpCanMonetize(env, state, item)) return false;
    box.items = box.items.filter((row) => row !== item);
    stumpAddToWallet(box, item);
    return true;
  }
  function stumpHarvestHoldings(env, state, key) {
    const [kind, color] = key.split("-");
    return { real: stumpHarvestForPrice(env, state, stumpHarvestPriceKey(kind, color)).length, wallet: stumpWalletCount(env, state, key) };
  }
  function stumpWalletPiece(env, key, index) {
    const id = `${key}#${index}`;
    if (!env.walletPieceMemo.has(id)) {
      const [kind, color] = key.split("-");
      env.walletPieceMemo.set(id, Object.freeze({ id, walletKey: key, family: "seed", path: kind, color, xp: 0, ripe: true, roll: env.deps.STUMP_BOX_ROLL_LIMIT.min }));
    }
    return env.walletPieceMemo.get(id);
  }
  function stumpWalletPieceById(env, state, id) {
    const [key, index] = String(id).split("#");
    return env.HARVEST_KEYS.includes(key) && Number(index) < stumpWalletCount(env, state, key) ? stumpWalletPiece(env, key, Number(index)) : null;
  }
  function stumpWalletPieces(env, state, limit) {
    return env.HARVEST_KEYS.flatMap((key) => Array.from({ length: Math.min(limit, stumpWalletCount(env, state, key)) }, (_, index) => stumpWalletPiece(env, key, index)));
  }
  function stumpStoredFlowers(env, state, color, golden) {
    return stumpHarvestForPrice(env, state, stumpHarvestPriceKey("flower", color)).filter(golden ? (...args) => stumpIsGoldenHarvest(env, ...args) : (...args) => stumpIsPlainHarvest(env, ...args));
  }
  function stumpStoredFlowerCount(env, state, color, golden) {
    return stumpStoredFlowers(env, state, color, golden).length + (golden ? 0 : stumpWalletCount(env, state, `flower-${color}`));
  }
  function stumpPayFlower(env, state, color, golden) {
    const stack = `flower-${color}`;
    if (!golden && stumpSpendWallet(env, state, stack)) return { walletKey: stack };
    const item = stumpStoredFlowers(env, state, color, golden)[0];
    return item && stumpDiscard(env, state, item.id) ? item : null;
  }

  // modules/domain/stump-box-compost.mjs
  function stumpCompostGrowth(env, item, state) {
    return Math.round(env.deps.STUMP_BOX_COMPOST.growth * stumpClampRoll(env, item.roll, stumpRollCap(env, state)));
  }
  function stumpCompostReason(env, state, id) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id);
    if (!stumpEditable(env, state)) return "나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.";
    if (item && item.locked) return "잠긴 아이템은 거름으로 쓸 수 없습니다.";
    if (item && item.albino) return "알비노는 거름 대신 조합 재료로 사용할 수 있습니다.";
    if (!item || !env.FAMILIES.includes(item.family) || stumpIsPlaced(env, state, id)) return "보관함의 씨앗만 거름으로 쓸 수 있습니다.";
    return stumpGrowingItems(env, state).length ? "" : "그루터기 함에서 성장 중인 그루터기 아이템이 없습니다.";
  }
  function stumpCompost(env, state, id) {
    if (stumpCompostReason(env, state, id)) return null;
    const box = stumpOf(env, state), item = stumpFindItem(box, id), growth = stumpCompostGrowth(env, item, state), fed = stumpGrowingItems(env, state).length;
    box.items = box.items.filter((other) => other.id !== id);
    return { growth, fed, ripened: stumpGrowBy(env, state, growth) };
  }
  function* stumpFeedAsh(env, state, growth) {
    const fed = stumpGrowingItems(env, state).length;
    if (!fed) return null;
    const ripened = stumpGrowBy(env, state, growth);
    if (ripened.length) yield { kind: "dispatchRuntimeEvent", args: ["stump-box-changed", { ripened, drop: null, compost: null }] };
    return { growth, fed, ripened };
  }
  function stumpFilterColors(env, filter) {
    return env.COLORS.includes(filter) ? [filter] : filter === "all" ? env.COLORS : [];
  }
  function stumpStoredSeeds(env, state, filter) {
    const colors = stumpFilterColors(env, filter);
    return stumpStorage(env, state).filter((item) => env.FAMILIES.includes(item.family) && colors.includes(item.color));
  }
  function stumpBulkItems(env, state, filter) {
    const groups = /* @__PURE__ */ new Map();
    stumpStoredSeeds(env, state, filter).forEach((item) => {
      const key = `${item.color}-${item.path || "seed"}`;
      groups.set(key, (groups.get(key) || []).concat(item));
    });
    return [...groups.values()].flatMap((list) => list.sort((a, b) => b.roll - a.roll || a.id - b.id).slice(env.deps.STUMP_BOX_BULK_COMPOST.keep)).filter((item) => !item.golden && !item.ancient && !item.albino && !item.locked);
  }
  function stumpBulkDiscardItems(env, state, filter) {
    const seeds = stumpStoredSeeds(env, state, filter).filter((item) => stumpIsMature(item) ? stumpIsPlainHarvest(env, item) : !item.golden && !item.ancient && !item.albino && !item.xp);
    const talismanItems = filter === "all" || filter === "talisman" ? stumpStorage(env, state).filter((item) => item.family === "talisman" && item.rarity !== "unique" && !item.xp && !stumpIsMature(item)) : [];
    return seeds.concat(talismanItems).filter((item) => !item.locked);
  }
  function stumpBulkCompostPlan(env, state, filter) {
    const growing = stumpGrowingItems(env, state), plan = [];
    let left = growing.length ? Math.max(...growing.map((item) => stumpNeed(env, item) - item.xp)) : 0;
    for (const item of stumpBulkItems(env, state, filter).sort((a, b) => a.roll - b.roll || a.id - b.id)) {
      if (left <= 0) break;
      plan.push(item);
      left -= stumpCompostGrowth(env, item, state);
    }
    return plan;
  }
  function stumpBulkCompostReason(env, state, filter) {
    if (!stumpBulkCompostOpen(env, state)) return `수확 일지를 ${env.deps.STUMP_BOX_UNLOCKS.find((row) => row.bulkCompost).when.harvestCells}칸 채우면 열립니다.`;
    if (!stumpEditable(env, state)) return "나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.";
    if (!stumpGrowingItems(env, state).length) return "그루터기 함에서 성장 중인 그루터기 아이템이 없습니다.";
    return stumpBulkItems(env, state, filter).length ? "" : "거름으로 쓸 씨앗이 없습니다.";
  }
  function stumpCompostMany(env, state, filter) {
    if (stumpBulkCompostReason(env, state, filter)) return null;
    const out = { count: 0, growth: 0, fed: stumpGrowingItems(env, state).length, ripened: [] };
    for (const item of stumpBulkCompostPlan(env, state, filter)) {
      const one = stumpCompost(env, state, item.id);
      if (!one) break;
      out.count++;
      out.growth += one.growth;
      out.ripened.push(...one.ripened);
    }
    return out;
  }
  function stumpBulkDiscardReason(env, state, filter) {
    if (!stumpEditable(env, state)) return "나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.";
    return stumpBulkDiscardItems(env, state, filter).length ? "" : "버릴 아이템이 없습니다.";
  }
  function stumpToggleLock(env, state, id) {
    const item = stumpFindItem(stumpOf(env, state), id);
    if (!item || !stumpEditable(env, state)) return false;
    if (item.locked) delete item.locked;
    else item.locked = true;
    return true;
  }
  function stumpDiscardMany(env, state, filter) {
    if (stumpBulkDiscardReason(env, state, filter)) return null;
    const box = stumpOf(env, state), gone = stumpBulkDiscardItems(env, state, filter), ids = new Set(gone.map((item) => item.id));
    box.items = box.items.filter((item) => !ids.has(item.id));
    gone.filter((item) => env.FAMILIES.includes(item.family) && stumpIsMature(item)).forEach((item) => stumpAddToWallet(box, item));
    return gone;
  }

  // modules/domain/stump-box-drops.mjs
  function stumpRollDropSpec(env, state, enemy, random) {
    return random() < env.deps.STUMP_BOX_DROPS.chance[stumpKillKind(enemy)] ? stumpSeedDropSpec(env, state, random) : null;
  }
  function stumpReceiveDrop(env, state, spec, random = Math.random) {
    const item = stumpCreateItem(env, state, spec);
    if (item) return { item, compost: null };
    return { item: null, compost: stumpCompostOverflow(env, state, spec, random) };
  }
  function stumpRollDrop(env, state, enemy, random) {
    const spec = stumpRollDropSpec(env, state, enemy, random);
    return spec ? stumpReceiveDrop(env, state, spec, random) : null;
  }
  function stumpCompostOverflow(env, state, spec, random = Math.random) {
    const growth = stumpCompostGrowth(env, spec, state), fed = stumpGrowingItems(env, state).length;
    return { family: spec.family, color: spec.color, growth, fed, ripened: stumpGrowBy(env, state, growth, random) };
  }
  function stumpDropsHere(env, state) {
    return !(typeof env.deps.actExplorationState === "object" && env.deps.actExplorationState.current(state)?.act != null);
  }
  function stumpRollKillDrop(env, state, enemy) {
    return state.stumpBox && state.stumpBox.acquired && stumpDropsHere(env, state) ? stumpRollDropSpec(env, state, enemy, Math.random) : null;
  }
  function* stumpOnEnemyKilled(env, state, enemy, drop = stumpRollKillDrop(env, state, enemy)) {
    const box = state.stumpBox;
    if (!box || !box.acquired) return;
    const ripened = stumpGrow(env, state, enemy), rolled = drop ? stumpReceiveDrop(env, state, drop) : env.NO_DROP;
    if (rolled.compost) ripened.push(...rolled.compost.ripened);
    if (!ripened.length && !rolled.item && !rolled.compost) return;
    if (state.noti) state.noti.stump = true;
    yield { kind: "dispatchRuntimeEvent", args: ["stump-box-changed", { ripened, drop: rolled.item, compost: rolled.compost }] };
  }

  // modules/domain/stump-box-seals-read.mjs
  function stumpIsSealed(box, cell) {
    return Array.isArray(box.sealed) && box.sealed.includes(cell);
  }

  // modules/domain/stump-box-seals.mjs
  function stumpSealReason(env, state, cell) {
    const box = stumpOf(env, state);
    if (!stumpSealLimit(env, state)) return "봉인 칸 해금 뒤에 열립니다.";
    if (!stumpEditable(env, state)) return "나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.";
    if (!stumpIsOpen(env, state, cell)) return "닫힌 칸입니다.";
    if (stumpIsSealed(box, cell)) return "";
    return box.sealed.length < stumpSealLimit(env, state) ? "" : env.deps._t("봉인 칸은 {state}개까지입니다.", { state: stumpSealLimit(env, state) });
  }
  function stumpToggleSeal(env, state, cell) {
    if (stumpSealReason(env, state, cell)) return false;
    const box = stumpOf(env, state);
    box.sealed = stumpIsSealed(box, cell) ? box.sealed.filter((at) => at !== cell) : box.sealed.concat(cell);
    return true;
  }
  function stumpAddScar(env, state, force) {
    const box = stumpOf(env, state);
    if (!box.acquired || !stumpDevourOpen(env, state) || !force && stumpStorageFull(env, state)) return null;
    const item = { id: box.nextId++, family: "scar", color: null, path: null, xp: 0, ripe: false, roll: 1, absorbed: {}, meals: 0, misses: 0 };
    box.items.push(item);
    return item;
  }
  function stumpGrantScar(env, state) {
    const box = stumpOf(env, state);
    if (box.scarGift || !stumpDevourOpen(env, state)) return null;
    const item = stumpAddScar(env, state, true);
    if (item) box.scarGift = true;
    return item;
  }
  function* stumpRollScarDrop(env, state, random = Math.random) {
    if (!stumpDevourOpen(env, state) || random() >= env.deps.STUMP_BOX_SCAR.bossChance) return null;
    const item = stumpAddScar(env, state, true);
    if (item) yield { kind: "dispatchRuntimeEvent", args: ["stump-box-changed", { ripened: [], drop: item, compost: null }] };
    return item;
  }

  // modules/domain/stump-box-devour.mjs
  function stumpBiteCell(env, cell, random) {
    const [dx, dy] = env.MOORE[Math.floor(random() * env.MOORE.length)];
    const x = cell % env.deps.STUMP_BOX_SIZE + dx, y = Math.floor(cell / env.deps.STUMP_BOX_SIZE) + dy;
    return x < 0 || y < 0 || x >= env.deps.STUMP_BOX_SIZE || y >= env.deps.STUMP_BOX_SIZE ? -1 : y * env.deps.STUMP_BOX_SIZE + x;
  }
  function stumpMealOf(env, item) {
    const made = stumpIsMature(item) ? stumpYieldOf(env, item) : null;
    if (!made) return [];
    const share = env.deps.STUMP_BOX_SCAR.absorb.ripe, scale = stumpQualityOf(item) * stumpGoldenMul(env, item) * share;
    const lines = [{ stat: made.stat, value: made.value }].concat(item.harvest ? item.harvest.lines : []);
    return lines.map((line) => ({ stat: line.stat, value: Math.round(line.value * scale * 100) / 100 })).concat(stumpAlbinoLines(env, item).map((line) => ({ stat: line.stat, value: line.value * share })));
  }
  function stumpAbsorb(env, scar, meal) {
    const kept = [], lost = [];
    meal.forEach((line) => {
      const held = Object.hasOwn(scar.absorbed, line.stat);
      if (!held && Object.keys(scar.absorbed).length >= env.deps.STUMP_BOX_SCAR.maxLines) return lost.push(line);
      const total = (scar.absorbed[line.stat] || 0) + line.value;
      scar.absorbed[line.stat] = Math.round(Math.min(env.SCAR_CAPS[line.stat] || 0, total) * 100) / 100;
      kept.push(line);
    });
    return { kept, lost };
  }
  function stumpBite(env, state, scar, cell, random) {
    const box = stumpOf(env, state), target = stumpBiteCell(env, cell, random);
    const preyId = target >= 0 && stumpIsOpen(env, state, target) ? box.board[target] : null, prey = preyId === null ? null : stumpFindItem(box, preyId);
    if (!prey || !env.FAMILIES.includes(prey.family)) {
      scar.misses = (scar.misses || 0) + 1;
      return { scar, target, ate: null, gained: [], lost: [] };
    }
    const { kept, lost } = stumpAbsorb(env, scar, stumpMealOf(env, prey));
    scar.meals = (scar.meals || 0) + 1;
    box.board[target] = null;
    box.items = box.items.filter((item) => item.id !== prey.id);
    return { scar, target, ate: stumpShortName(env, prey), gained: kept, lost };
  }
  function stumpDevour(env, state, random) {
    const box = stumpOf(env, state);
    const scars = stumpPlacedCells(box).filter(({ item, cell }) => item.family === "scar" && stumpIsMature(item) && stumpIsSealed(box, cell));
    return scars.map(({ item, cell }) => stumpBite(env, state, item, cell, random));
  }

  // modules/domain/stump-box-regression.mjs
  function stumpBreedSpec(env, state, fruit, random) {
    const odds = env.deps.STUMP_BOX_BREEDING.mutation;
    if (stumpDevourOpen(env, state) && random() < odds.scar) return { scar: true, parent: fruit.color };
    const others = env.COLORS.filter((color2) => color2 !== fruit.color);
    const color = random() < odds.color ? others[Math.floor(random() * others.length)] : fruit.color;
    const roll = env.deps.STUMP_BOX_DROPS.roll.min + random() * (env.deps.STUMP_BOX_DROPS.roll.max - env.deps.STUMP_BOX_DROPS.roll.min);
    return { family: "seed", color, roll, golden: random() < odds.golden, parent: fruit.color };
  }
  function stumpBreed(env, state, specs, random) {
    return specs.map((spec) => {
      if (spec.scar) return { spec, item: stumpAddScar(env, state, true), compost: null };
      const item = stumpCreateItem(env, state, spec);
      if (item) return { spec, item, compost: null };
      return { spec, item: null, compost: stumpCompostOverflow(env, state, spec, random) };
    });
  }
  function stumpClearUnsealed(box) {
    const kept = new Set(box.sealed.map((cell) => box.board[cell]).filter((id) => id !== null));
    const count = box.items.filter((item) => !kept.has(item.id)).length;
    box.items = box.items.filter((item) => kept.has(item.id));
    box.board = box.board.map((id) => id !== null && kept.has(id) ? id : null);
    box.nursery = box.nursery.map(() => null);
    return { count, sealed: box.items.length };
  }
  function stumpGrownFruits(env, state, box) {
    return box.acquired && stumpBreedingOpen(env, state) ? stumpPlacedItems(box).filter((item) => item.path === "fruit" && stumpIsMature(item)) : [];
  }
  function* stumpRegress(env, state, random = Math.random) {
    stumpInvalidatePlacementUndo(env, state);
    const box = state.stumpBox;
    if (!box || !Array.isArray(box.items)) return 0;
    if (!Array.isArray(box.sealed)) box.sealed = [];
    const eaten = box.acquired ? stumpDevour(env, state, random) : [], fruits = stumpGrownFruits(env, state, box);
    const back = stumpClearUnsealed(box);
    box.wallet = {};
    const bred = stumpBreed(env, state, fruits.map((fruit) => stumpBreedSpec(env, state, fruit, random)), random);
    if (back.count || back.sealed || eaten.length || bred.length) yield { kind: "dispatchRuntimeEvent", args: ["stump-box-regressed", { ...back, eaten, bred }] };
    return back.count;
  }

  // modules/domain/stump-box-harvest-gifts.mjs
  function stumpClaimHarvestGift(env, state, row, color) {
    const box = stumpOf(env, state);
    if (!box.acquired || !stumpPendingGifts(env, state).includes(row)) return null;
    const item = stumpCreateItem(env, state, { family: "seed", color, roll: env.deps.STUMP_BOX_HARVEST.giftRoll });
    if (item) box.harvest.gifts[row] = true;
    return item;
  }

  // modules/domain/stump-box-pouches.mjs
  function stumpPendingPouches(env, state) {
    const opened = stumpOf(env, state).pouches.opened;
    return stumpOpenUnlocks(env, state).filter((row) => row.pouch && !opened.includes(row.id)).map((row) => row.id);
  }
  function stumpPouchOffers(env, state, id, random = Math.random) {
    const box = stumpOf(env, state), span = env.deps.STUMP_BOX_SEED_POUCH.roll;
    if (!stumpPendingPouches(env, state).includes(id)) return [];
    if (!Array.isArray(box.pouches.offers[id])) {
      box.pouches.offers[id] = Array.from({ length: env.deps.STUMP_BOX_SEED_POUCH.offers }, () => ({
        family: "seed",
        color: env.COLORS[Math.floor(random() * env.COLORS.length)],
        roll: stumpClampRoll(env, span.min + random() * (span.max - span.min))
      }));
    }
    return box.pouches.offers[id];
  }
  function stumpChoosePouch(env, state, id, index) {
    const box = stumpOf(env, state), offer = stumpPouchOffers(env, state, id)[index];
    const item = offer ? stumpCreateItem(env, state, offer) : null;
    if (!item) return null;
    box.pouches.opened.push(id);
    delete box.pouches.offers[id];
    return item;
  }

  // modules/domain/stump-box-sockets.mjs
  function stumpSocketable(env, state, id) {
    const item = stumpFindItem(stumpOf(env, state), id);
    return item && !stumpIsPlaced(env, state, item.id) && !item.locked && env.FAMILIES.includes(item.family) && stumpIsMature(item) && stumpYieldKind(item) ? item : null;
  }
  function stumpSocketCandidates(env, state, kinds) {
    return stumpStorage(env, state).filter((item) => stumpSocketable(env, state, item.id) && kinds.includes(stumpYieldKind(item))).sort((a, b) => stumpQualityOf(b) * stumpGoldenMul(env, b) - stumpQualityOf(a) * stumpGoldenMul(env, a));
  }
  function stumpTakeForSocket(env, state, item) {
    const box = stumpOf(env, state);
    box.items = box.items.filter((row) => row !== item);
  }
  function stumpReturnFromSocket(env, state, item, force = false) {
    if (!force && stumpStorageFull(env, state)) return false;
    delete item.slot;
    stumpOf(env, state).items.push(item);
    return true;
  }
  function stumpSocketLines(env, item) {
    const made = stumpIsMature(item) ? stumpYieldOf(env, item) : null;
    if (!made) return [];
    const scale = stumpQualityOf(item) * stumpGoldenMul(env, item), round = (value) => Math.round(value * scale * 100) / 100;
    return [{ stat: made.stat, value: round(made.value) }].concat((item.harvest && item.harvest.lines || []).map((line) => ({ stat: line.stat, value: round(line.value) })), stumpAlbinoLines(env, item));
  }

  // modules/domain/stump-box.mjs
  function createStumpEnvironment(deps) {
    const env = { deps };
    env.CELLS = env.deps.STUMP_BOX_SIZE * env.deps.STUMP_BOX_SIZE;
    env.FAMILIES = ["seed"];
    env.KINDS = env.deps.STUMP_BOX_KINDS;
    env.COLORS = Object.keys(env.deps.STUMP_BOX_COLORS);
    env.FIXED_TARGET = { talisman: "talisman", scar: "scar" };
    env.OVERCOMER = Object.freeze(Object.fromEntries(Object.entries(env.deps.STUMP_BOX_OVERCOMES).map(([winner, loser]) => [loser, winner])));
    env.FEEDER = Object.freeze(Object.fromEntries(Object.entries(env.deps.STUMP_BOX_FEEDS).map(([mother, child]) => [child, mother])));
    env.MOORE = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    env.LINE_ROWS = Object.freeze(Object.values(env.deps.STUMP_BOX_YIELDS).flatMap(Object.values).concat(Object.values(env.deps.STUMP_BOX_EXTRA_LINES).flatMap(Object.values).flat()));
    env.ALBINO_ROWS = Object.freeze(Object.values(env.deps.STUMP_BOX_RIPENING.albino.variants).flatMap(Object.values).flat());
    env.SCAR_CAPS = (() => {
      const out = {};
      env.LINE_ROWS.concat(env.ALBINO_ROWS).forEach((row) => {
        out[row.stat] = Math.max(out[row.stat] || 0, row.value * env.deps.STUMP_BOX_SCAR.capMul);
      });
      return Object.freeze(out);
    })();
    env.HARVEST_ROWS = env.deps.STUMP_BOX_HARVEST.rows;
    env.HARVEST_KEYS = env.HARVEST_ROWS.flatMap((row) => env.COLORS.map((color) => `${row}-${color}`));
    env.BOX_VERSION = 3;
    env.OLD_COLORS = env.COLORS.filter((color) => color !== "physical");
    env.memo = { key: null, box: null, value: null };
    env.placementUndos = /* @__PURE__ */ new WeakMap();
    env.ASLEEP = Object.freeze({ talisman: "sealed", scar: "scarAsleep" });
    env.HARVEST_PRICE = /^harvest:(flower|fruit|vine|root|any)(?::(\w+))?$/;
    env.ANY_KIND = "any";
    env.ANY_KIND_LABEL = "식물";
    env.walletPieceMemo = /* @__PURE__ */ new Map();
    env.ONE_ON_BOARD = Object.freeze([
      Object.freeze({ test: (item) => !!item.albino, reason: "알비노는 그루터기 함 전체에 하나만 놓을 수 있습니다." }),
      Object.freeze({ test: (item) => item.family === "scar", reason: "불씨의 흉터는 그루터기 함에 하나만 놓을 수 있습니다." })
    ]);
    env.SYNERGY_ORDER = Object.freeze(["resonance", "feed", "discipline"]);
    env.LINES = Object.freeze([...Array(env.deps.STUMP_BOX_SIZE).keys()].flatMap((at) => [
      { axis: "row", cells: [...Array(env.deps.STUMP_BOX_SIZE).keys()].map((step) => at * env.deps.STUMP_BOX_SIZE + step) },
      { axis: "col", cells: [...Array(env.deps.STUMP_BOX_SIZE).keys()].map((step) => step * env.deps.STUMP_BOX_SIZE + at) }
    ]));
    env.effectsMemo = { key: null, box: null, value: null };
    env.NO_DROP = Object.freeze({ item: null, compost: null });
    env.STARTER_SLOTS = Object.freeze(["seed", "second"]);
    env.SKILL_ELEMENT_COLORS = Object.freeze({ phys: "physical", fire: "fire", cold: "cold", light: "lightning", chaos: "chaos" });
    env.RESIST_STATS = Object.freeze({ fire: "resF", cold: "resC", lightning: "resL" });
    env.CODEX_IDS = Object.freeze([...env.deps.TALISMAN_UNIQUE_DB, ...env.deps.TALISMAN_WILD_UNIQUE_DB].map((row) => row.id));
    env.SERIES_STORAGE = env.deps.CONTENT_UNLOCK_SERIES.find((spec) => spec.series === "stumpStorage").storage;
    return env;
  }
  function createStumpBoardApi(env) {
    return {
      empty: (...args) => stumpEmpty(env, ...args),
      of: (...args) => stumpOf(env, ...args),
      restore: (...args) => stumpRestore(env, ...args),
      sync: (...args) => stumpSync(env, ...args),
      eligible: (...args) => stumpEligible(env, ...args),
      claimStarter: (...args) => stumpClaimStarter(env, ...args),
      starterChoice: (...args) => stumpStarterChoice(env, ...args),
      starterOwed: (...args) => stumpStarterOwed(env, ...args),
      grantStarter: (...args) => stumpGrantStarter(env, ...args),
      plantStored: (...args) => stumpPlantStored(env, ...args),
      createItem: (...args) => stumpCreateItem(env, ...args),
      addTalisman: (...args) => stumpAddTalisman(env, ...args),
      discard: (...args) => stumpDiscard(env, ...args),
      storage: (...args) => stumpStorage(env, ...args),
      place: (...args) => stumpPlace(env, ...args),
      move: (...args) => stumpMove(env, ...args),
      previewMove: (...args) => stumpPreviewMove(env, ...args),
      unplace: (...args) => stumpUnplace(env, ...args),
      onePerBoardReason: (...args) => stumpOnePerBoardReason(env, ...args),
      wornAlbinoId: (...args) => stumpWornAlbinoId(env, ...args),
      wornOneId: (...args) => stumpWornOneId(env, ...args),
      unplaceAll: (...args) => stumpUnplaceAll(env, ...args),
      unplaceAllReason: (...args) => stumpUnplaceAllReason(env, ...args),
      canUndoPlacement: (...args) => stumpCanUndoPlacement(env, ...args),
      undoPlacement: (...args) => stumpUndoPlacement(env, ...args),
      invalidatePlacementUndo: (...args) => stumpInvalidatePlacementUndo(env, ...args),
      evaluate: (...args) => stumpEvaluate(env, ...args),
      boardNote: (...args) => stumpBoardNote(env, ...args),
      applyStats: (...args) => stumpApplyStats(env, ...args)
    };
  }
  function createStumpGrowthApi(env) {
    return {
      onEnemyKilled: (...args) => stumpOnEnemyKilled(env, ...args),
      rollKillDrop: (...args) => stumpRollKillDrop(env, ...args),
      seedDropSpec: (...args) => stumpSeedDropSpec(env, ...args),
      receiveDrop: (...args) => stumpReceiveDrop(env, ...args),
      dropIcon: (...args) => stumpDropIcon(env, ...args),
      dropName: (...args) => stumpDropName(env, ...args),
      validDrop: (...args) => stumpValidDrop(env, ...args),
      grow: (...args) => stumpGrow(env, ...args),
      ancientRanks: (...args) => stumpAncientRanks(env, ...args),
      rollDrop: (...args) => stumpRollDrop(env, ...args),
      regress: (...args) => stumpRegress(env, ...args),
      compost: (...args) => stumpCompost(env, ...args),
      compostReason: (...args) => stumpCompostReason(env, ...args),
      compostGrowth: (...args) => stumpCompostGrowth(env, ...args),
      compostOverflow: (...args) => stumpCompostOverflow(env, ...args),
      feedAsh: (...args) => stumpFeedAsh(env, ...args),
      growingItems: (...args) => stumpGrowingItems(env, ...args),
      openCount: (...args) => stumpOpenCount(env, ...args),
      isOpen: (...args) => stumpIsOpen(env, ...args),
      opensAt: (...args) => stumpOpensAt(env, ...args),
      nextOpening: (...args) => stumpNextOpening(env, ...args),
      neighbors: (...args) => stumpNeighbors(env, ...args),
      stageOf: (...args) => stumpStageOf(env, ...args),
      isMature: stumpIsMature,
      need: (...args) => stumpNeed(env, ...args),
      yieldOf: (...args) => stumpYieldOf(env, ...args),
      targetStage: (...args) => stumpTargetStage(env, ...args),
      label: (...args) => stumpLabel(env, ...args),
      shortName: (...args) => stumpShortName(env, ...args),
      lineText: (...args) => stumpLineText(env, ...args),
      extraLinesOf: (...args) => stumpExtraLinesOf(env, ...args),
      iconPath: (...args) => stumpIconPath(env, ...args),
      cellOf: (...args) => stumpCellOf(env, ...args),
      editable: (...args) => stumpEditable(env, ...args),
      highestLoop: stumpHighestLoop
    };
  }
  function createStumpGraftApi(env) {
    return {
      graftRank: stumpGraftRank,
      graftMultiplier: (...args) => stumpGraftMultiplier(env, ...args),
      graftOpen: (...args) => stumpGraftOpen(env, ...args),
      graftPoints: (...args) => stumpGraftPoints(env, ...args),
      graftJournalPoints: (...args) => stumpGraftJournalPoints(env, ...args),
      graftOverflowPoints: (...args) => stumpGraftOverflowPoints(env, ...args),
      graftRaiseReason: (...args) => stumpGraftRaiseReason(env, ...args),
      graftRaise: (...args) => stumpGraftRaise(env, ...args),
      graftLowerReason: (...args) => stumpGraftLowerReason(env, ...args),
      graftLower: (...args) => stumpGraftLower(env, ...args),
      harvestKey: stumpHarvestKey,
      harvestRows: (...args) => stumpHarvestRows(env, ...args),
      hasHarvested: (...args) => stumpHasHarvested(env, ...args),
      pendingGifts: (...args) => stumpPendingGifts(env, ...args),
      claimHarvestGift: (...args) => stumpClaimHarvestGift(env, ...args),
      openUnlocks: (...args) => stumpOpenUnlocks(env, ...args),
      storageLimit: (...args) => stumpStorageLimit(env, ...args),
      storageFull: (...args) => stumpStorageFull(env, ...args),
      rollCap: (...args) => stumpRollCap(env, ...args),
      graftMaxRank: (...args) => stumpGraftMaxRank(env, ...args),
      qualityOf: stumpQualityOf,
      goldenMul: (...args) => stumpGoldenMul(env, ...args),
      sealLimit: (...args) => stumpSealLimit(env, ...args),
      isSealed: stumpIsSealed,
      sealReason: (...args) => stumpSealReason(env, ...args),
      toggleSeal: (...args) => stumpToggleSeal(env, ...args),
      devourOpen: (...args) => stumpDevourOpen(env, ...args),
      addScar: (...args) => stumpAddScar(env, ...args),
      grantScar: (...args) => stumpGrantScar(env, ...args),
      rollScarDrop: (...args) => stumpRollScarDrop(env, ...args),
      scarCaps: () => env.SCAR_CAPS,
      breedingOpen: (...args) => stumpBreedingOpen(env, ...args)
    };
  }
  function createStumpStorageApi(env) {
    return {
      bulkCompostOpen: (...args) => stumpBulkCompostOpen(env, ...args),
      bulkItems: (...args) => stumpBulkItems(env, ...args),
      bulkCompostPlan: (...args) => stumpBulkCompostPlan(env, ...args),
      bulkCompostReason: (...args) => stumpBulkCompostReason(env, ...args),
      compostMany: (...args) => stumpCompostMany(env, ...args),
      bulkDiscardItems: (...args) => stumpBulkDiscardItems(env, ...args),
      bulkDiscardReason: (...args) => stumpBulkDiscardReason(env, ...args),
      discardMany: (...args) => stumpDiscardMany(env, ...args),
      toggleLock: (...args) => stumpToggleLock(env, ...args),
      pendingPouches: (...args) => stumpPendingPouches(env, ...args),
      pouchOffers: (...args) => stumpPouchOffers(env, ...args),
      choosePouch: (...args) => stumpChoosePouch(env, ...args),
      codexIds: () => env.CODEX_IDS,
      itemById: (state, id) => stumpFindItem(stumpOf(env, state), id),
      settleStorageSlots: (...args) => stumpSettleStorageSlots(env, ...args),
      orderStorage: stumpOrderStorage,
      moveInStorage: (...args) => stumpMoveInStorage(env, ...args),
      harvestPriceKey: stumpHarvestPriceKey,
      isHarvestPrice: (...args) => stumpIsHarvestPrice(env, ...args),
      harvestPriceName: (...args) => stumpHarvestPriceName(env, ...args),
      harvestPriceIcon: (...args) => stumpHarvestPriceIcon(env, ...args),
      harvestPriceHeld: (...args) => stumpHarvestPriceHeld(env, ...args),
      payHarvestPrice: (...args) => stumpPayHarvestPrice(env, ...args),
      harvestWalletKeys: (...args) => stumpHarvestWalletKeys(env, ...args),
      canMonetize: (...args) => stumpCanMonetize(env, ...args),
      monetize: (...args) => stumpMonetize(env, ...args),
      spendWallet: (...args) => stumpSpendWallet(env, ...args),
      walletCount: (...args) => stumpWalletCount(env, ...args),
      walletTotal: (...args) => stumpWalletTotal(env, ...args),
      harvestHoldings: (...args) => stumpHarvestHoldings(env, ...args),
      walletPieceById: (...args) => stumpWalletPieceById(env, ...args),
      walletPieces: (...args) => stumpWalletPieces(env, ...args)
    };
  }
  function createStumpSocketApi(env) {
    return {
      isPlaced: (...args) => stumpIsPlaced(env, ...args),
      nurseryOpen: (...args) => stumpNurseryOpen(env, ...args),
      nurseryRate: (...args) => stumpNurseryRate(env, ...args),
      inNursery: (...args) => stumpInNursery(env, ...args),
      firstNurseryCell: (...args) => stumpFirstNurseryCell(env, ...args),
      nurseryMove: (...args) => stumpNurseryMove(env, ...args),
      nurseryUnplace: (...args) => stumpNurseryUnplace(env, ...args),
      nurseryClearReason: (...args) => stumpNurseryClearReason(env, ...args),
      nurseryClear: (...args) => stumpNurseryClear(env, ...args),
      storedFlowerCount: (...args) => stumpStoredFlowerCount(env, ...args),
      payFlower: (...args) => stumpPayFlower(env, ...args),
      yieldKind: stumpYieldKind,
      socketable: (...args) => stumpSocketable(env, ...args),
      socketCandidates: (...args) => stumpSocketCandidates(env, ...args),
      takeForSocket: (...args) => stumpTakeForSocket(env, ...args),
      returnFromSocket: (...args) => stumpReturnFromSocket(env, ...args),
      socketLines: (...args) => stumpSocketLines(env, ...args),
      currentSocketItem: (...args) => stumpCurrentSocketItem(env, ...args),
      overcomerOf: (color) => env.OVERCOMER[color] || null,
      feederOf: (color) => env.FEEDER[color] || null
    };
  }
  function createStumpBox(deps) {
    const env = createStumpEnvironment(deps);
    return {
      ...createStumpBoardApi(env),
      ...createStumpGrowthApi(env),
      ...createStumpGraftApi(env),
      ...createStumpStorageApi(env),
      ...createStumpSocketApi(env)
    };
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/ui/runtime-event-commands.mjs
  function runRuntimeEventCommands(commands, dispatch) {
    return consumeDomainCommands(commands, { dispatchRuntimeEvent: dispatch });
  }

  // modules/stump-box-classic.mjs
  var rules = createStumpBox({
    get STUMP_BOX_GROWTH() {
      return STUMP_BOX_GROWTH;
    },
    get STUMP_BOX_YIELDS() {
      return STUMP_BOX_YIELDS;
    },
    get STUMP_BOX_ROLL_LIMIT() {
      return STUMP_BOX_ROLL_LIMIT;
    },
    get STUMP_BOX_RIPENING() {
      return STUMP_BOX_RIPENING;
    },
    get _t() {
      return _t;
    },
    get STUMP_BOX_SCAR() {
      return STUMP_BOX_SCAR;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get STUMP_BOX_STAGES() {
      return STUMP_BOX_STAGES;
    },
    get getStatName() {
      return getStatName;
    },
    get STUMP_CUBE_MERGE() {
      return STUMP_CUBE_MERGE;
    },
    get contentProgression() {
      return contentProgression;
    },
    get STUMP_BOX_NURSERY() {
      return STUMP_BOX_NURSERY;
    },
    get STUMP_BOX_GRAFT() {
      return STUMP_BOX_GRAFT;
    },
    get STUMP_BOX_UNLOCKS() {
      return STUMP_BOX_UNLOCKS;
    },
    get STUMP_BOX_STORAGE_BASE() {
      return STUMP_BOX_STORAGE_BASE;
    },
    get talismans() {
      return talismans;
    },
    get STUMP_BOX_OPENING() {
      return STUMP_BOX_OPENING;
    },
    get STUMP_BOX_CELL_ORDER() {
      return STUMP_BOX_CELL_ORDER;
    },
    get STUMP_BOX_SIZE() {
      return STUMP_BOX_SIZE;
    },
    get STUMP_BOX_SYNERGY() {
      return STUMP_BOX_SYNERGY;
    },
    get STUMP_BOX_OVERCOMES() {
      return STUMP_BOX_OVERCOMES;
    },
    get addStatToBucket() {
      return addStatToBucket;
    },
    get STUMP_BOX_ANCIENT() {
      return STUMP_BOX_ANCIENT;
    },
    get STUMP_BOX_EXTRA_LINES() {
      return STUMP_BOX_EXTRA_LINES;
    },
    get STUMP_BOX_COMPOST() {
      return STUMP_BOX_COMPOST;
    },
    get STUMP_BOX_BULK_COMPOST() {
      return STUMP_BOX_BULK_COMPOST;
    },
    get STUMP_BOX_DROPS() {
      return STUMP_BOX_DROPS;
    },
    get actExplorationState() {
      return typeof actExplorationState === "undefined" ? void 0 : actExplorationState;
    },
    get ABYSS_START_ZONE_ID() {
      return ABYSS_START_ZONE_ID;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get STUMP_BOX_BREEDING() {
      return STUMP_BOX_BREEDING;
    },
    get STUMP_BOX_SEED_POUCH() {
      return STUMP_BOX_SEED_POUCH;
    },
    get STUMP_BOX_TALISMAN_CODEX() {
      return STUMP_BOX_TALISMAN_CODEX;
    },
    get STUMP_BOX_HARVEST() {
      return STUMP_BOX_HARVEST;
    },
    get STUMP_BOX_KINDS() {
      return STUMP_BOX_KINDS;
    },
    get STUMP_BOX_FEEDS() {
      return STUMP_BOX_FEEDS;
    },
    get TALISMAN_UNIQUE_DB() {
      return TALISMAN_UNIQUE_DB;
    },
    get TALISMAN_WILD_UNIQUE_DB() {
      return TALISMAN_WILD_UNIQUE_DB;
    },
    get CONTENT_UNLOCK_SERIES() {
      return CONTENT_UNLOCK_SERIES;
    }
  });
  var stumpBox = {
    ...rules,
    compostGrowth: (item, state = game) => rules.compostGrowth(item, state),
    feedAsh: (...args) => runRuntimeEventCommands(rules.feedAsh(...args), dispatchRuntimeEvent),
    onEnemyKilled: (...args) => runRuntimeEventCommands(rules.onEnemyKilled(...args), dispatchRuntimeEvent),
    rollScarDrop: (...args) => runRuntimeEventCommands(rules.rollScarDrop(...args), dispatchRuntimeEvent),
    regress: (...args) => runRuntimeEventCommands(rules.regress(...args), dispatchRuntimeEvent)
  };
  safeExposeGlobals({ stumpBox });
})();
