// GENERATED from modules/knitting*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/knitting-sources.mjs
  function threadOpen(env, state, row) {
    return (row.unlocks || []).every((id) => env.deps.contentProgression.isUnlocked(id, state));
  }
  function threadZoneKeys(zone) {
    if (!zone) return [];
    const keys = ["type:" + zone.type];
    if (zone.type === "act" && Number.isInteger(Number(zone.id))) keys.push("act:" + Number(zone.id));
    if (zone.atlasRegion) keys.push("atlas:" + zone.atlasRegion);
    if (zone.atlasNode !== void 0 && zone.atlasNode !== null) keys.push("node:" + zone.atlasNode);
    return keys;
  }
  function threadSourceMatches(env, source, zone, enemy) {
    return Object.entries(env.sourceChecks).every(([key, test]) => source[key] === void 0 || test(source[key], zone, enemy));
  }
  function threadDropPool(env, state, zone, enemy) {
    return env.deps.KNITTING.list.filter((row) => threadOpen(env, state, row) && threadSourceMatches(env, row.source, zone, enemy) && !(row.source.once && state.knitting.once.includes(row.id)));
  }
  function threadKillChance(env, zone, enemy, level) {
    const rank = enemy.isBoss ? "boss" : enemy.isElite ? "elite" : "regular";
    const chance = zone.type === "act" && enemy.isBoss ? env.deps.KNITTING.chance.actBoss : env.deps.KNITTING.chance[rank];
    return chance * env.deps.levelProgression.rewardMultiplier(zone, enemy, level);
  }

  // modules/domain/knitting-catalog.mjs
  function threadSetProblem(env, row) {
    const range = env.deps.KNITTING.setRange[row.grade];
    const inRange = Number.isInteger(row.set) && row.set >= range[0] && row.set <= range[1];
    return inRange ? [] : [env.deps._t("{id}: 세트 {set}, 등급 {grade} 범위 {range}", { id: row.id, set: row.set, grade: row.grade, range })];
  }
  function threadNameProblem(env, row) {
    return /실타래/.test(row.name) ? [env.deps._t("{id}: 이름에 종류명", { id: row.id })] : [];
  }
  function threadSourceProblem(env, row) {
    const src = row.source || {};
    const has = !!src.any || !!(src.types && src.types.length) || !!(src.zones && src.zones.length);
    return has ? [] : [env.deps._t("{id}: 출처 없음", { id: row.id })];
  }
  function threadZoneKeyProblem(env, row) {
    const keys = (row.homes || []).concat((row.source || {}).zones || []);
    return keys.every((key) => env.ZONE_KEY.test(key)) ? [] : [env.deps._t("{id}: 지역 키 형식", { id: row.id })];
  }
  function threadUnlockProblem(env, row) {
    const needed = ((row.source || {}).types || []).map((type) => env.deps.KNITTING.typeUnlocks[type]);
    const own = row.unlocks || [];
    const missing = needed.length > 0 && needed.every(Boolean) && needed.some((id) => !own.includes(id));
    return missing ? [env.deps._t("{id}: 출처 해금 누락", { id: row.id })] : [];
  }
  function threadRowProblems(env, row) {
    if (!env.deps.KNITTING.grades[row.grade] || !env.deps.KNITTING.setRange[row.grade]) return [env.deps._t("{id}: 등급 {grade}", { id: row.id, grade: row.grade })];
    return env.ROW_CHECKS.flatMap((check) => check(row));
  }
  function threadHomeProblems(env) {
    return env.deps.KNITTING.homeZones.map((key) => [key, env.deps.KNITTING.list.filter((row) => (row.homes || []).includes(key)).length]).filter(([, n]) => n < 1 || n > 4).map(([key, n]) => env.deps._t("주력 {key}: {n}종", { key, n }));
  }
  function threadNodeProblems(env) {
    if (typeof env.deps.atlas !== "object" || typeof env.deps.atlas.node !== "function") return ["아틀라스 공개 API(atlas.node)를 읽을 수 없음"];
    const maps = env.deps.atlas.nodes.filter((node) => node.kind === "map");
    const out = maps.filter((node) => !env.deps.KNITTING.homeZones.includes("node:" + node.id)).map((node) => env.deps._t("주력 목록에 없는 지도 {id}", { id: node.id }));
    out.push(...env.deps.KNITTING.homeZones.filter((key) => key.startsWith("node:") && env.deps.atlas.node(key.slice(5))?.kind !== "map").map((key) => env.deps._t("일반 지도가 아님 {key}", { key })));
    for (const row of env.deps.KNITTING.list) {
      const own = (row.homes || []).filter((key) => key.startsWith("node:"));
      const node = own.length === 1 ? env.deps.atlas.node(own[0].slice(5)) : null;
      if (node?.name && row.found !== node.name) out.push(`${row.id}: ${node.name} 지도와 표시 불일치`);
    }
    return out;
  }
  function threadStructureProblems(env) {
    const out = [], ids = /* @__PURE__ */ new Set(), names = /* @__PURE__ */ new Set();
    for (const row of env.deps.KNITTING.list) {
      if (ids.has(row.id)) out.push(`중복 id ${row.id}`);
      if (names.has(row.name)) out.push(`중복 이름 ${row.name}`);
      ids.add(row.id);
      names.add(row.name);
      out.push(...threadRowProblems(env, row));
    }
    const singles = env.deps.KNITTING.list.filter((row) => row.set === 1).length;
    if (singles > env.deps.KNITTING.maxSingles) out.push(`1개짜리 ${singles}종, 상한 ${env.deps.KNITTING.maxSingles}`);
    if (env.deps.KNITTING.list.length !== env.deps.KNITTING.target) out.push(`종류 ${env.deps.KNITTING.list.length}, 목표 ${env.deps.KNITTING.target}`);
    return out.concat(threadHomeProblems(env), threadNodeProblems(env));
  }

  // modules/domain/knitting-state.mjs
  function threadDefaults(season) {
    return { season, counts: {}, seen: [], knitted: {}, once: [] };
  }
  function threadWhole(value, cap) {
    return Number.isFinite(Number(value)) ? Math.max(0, Math.min(cap, Math.floor(Number(value)))) : 0;
  }
  function threadKnownIds(env, raw) {
    return [...new Set(Array.isArray(raw) ? raw : [])].filter((id) => env.byId.has(id));
  }
  function threadRestoreCounts(env, src, out, same) {
    for (const id of env.byId.keys()) {
      const count = threadWhole(src.counts?.[id], env.deps.KNITTING.countCap), knitted = threadWhole(src.knitted?.[id], 999999);
      if (count && same) out.counts[id] = count;
      if (knitted) out.knitted[id] = knitted;
      if (count || knitted) out.seen.push(id);
    }
  }
  function threadNormalize(env, raw, season) {
    const src = raw && typeof raw === "object" ? raw : {}, out = threadDefaults(season);
    const same = src.season === season || src.season === void 0;
    threadRestoreCounts(env, src, out, same);
    out.seen = threadKnownIds(env, [...out.seen, ...threadKnownIds(env, src.seen)]);
    out.once = same ? threadKnownIds(env, src.once) : [];
    return out;
  }
  function threadResetForLoop(state) {
    state.knitting = { ...threadDefaults(state.season), seen: state.knitting.seen.slice(), knitted: { ...state.knitting.knitted } };
  }
  function threadMarkDrop(env, state, id) {
    if (env.byId.get(id)?.source.once && !state.knitting.once.includes(id)) state.knitting.once.push(id);
  }
  function threadReceive(env, state, id) {
    const row = env.byId.get(id), st = state.knitting;
    if (!row) return null;
    const first = !st.seen.includes(id), previous = st.counts[id] || 0;
    if (first) st.seen.push(id);
    st.counts[id] = Math.min(env.deps.KNITTING.countCap, previous + 1);
    return { id, name: row.name, count: st.counts[id], set: row.set, first, complete: previous < row.set && st.counts[id] >= row.set };
  }
  function threadVisible(env, state) {
    return env.deps.KNITTING.list.filter((row) => state.knitting.seen.includes(row.id));
  }
  function threadGainedBetween(env, before, after) {
    const old = before?.counts || {}, seen = before?.seen || [];
    return {
      total: Object.entries(after?.counts || {}).reduce((sum, [id, n]) => sum + Math.max(0, n - (old[id] || 0)), 0),
      fresh: (after?.seen || []).filter((id) => !seen.includes(id) && env.byId.has(id)).map((id) => env.byId.get(id).name)
    };
  }

  // modules/domain/knitting-draws.mjs
  function threadPick(rows, random) {
    return rows[Math.floor(random() * rows.length)];
  }
  function threadBaseWeight(env, row, keys, enemy) {
    const grade = env.deps.KNITTING.grades[row.grade];
    if (!grade || !(row.set >= 1)) return 0;
    if ((row.homes || []).some((key) => keys.includes(key))) return grade.weight * env.deps.KNITTING.homeBonus;
    const ranked = !!enemy && !!(row.source.boss || row.source.elite);
    return grade.weight * (ranked ? env.deps.KNITTING.rankBonus : 1);
  }
  function threadWeighted(env, rows, zone, enemy) {
    const keys = threadZoneKeys(zone);
    const list = rows.map((row) => ({ row, weight: threadBaseWeight(env, row, keys, enemy) })).filter((entry) => entry.weight > 0).sort((a, b) => a.row.grade - b.row.grade);
    const floor = { weight: Infinity, pace: Infinity }, current = { grade: 0, weight: Infinity, pace: Infinity };
    for (const entry of list) {
      if (entry.row.grade !== current.grade) {
        floor.weight = Math.min(floor.weight, current.weight);
        floor.pace = Math.min(floor.pace, current.pace);
        Object.assign(current, { grade: entry.row.grade, weight: Infinity, pace: Infinity });
      }
      entry.weight = Math.min(entry.weight, floor.weight, floor.pace * entry.row.set);
      current.weight = Math.min(current.weight, entry.weight);
      current.pace = Math.min(current.pace, entry.weight / entry.row.set);
    }
    return list;
  }
  function threadPickWeighted(list, random) {
    const total = list.reduce((sum, entry) => sum + entry.weight, 0);
    if (!(total > 0)) return null;
    let roll = random() * total;
    return (list.find((entry) => (roll -= entry.weight) < 0) || list[list.length - 1]).row.id;
  }
  function threadRollKill(env, state, zone, enemy, random = Math.random) {
    if (!env.deps.contentProgression.isUnlocked("knitting", state)) return null;
    if (!zone || !enemy || enemy.noLoot) return null;
    if (random() >= threadKillChance(env, zone, enemy, state.level)) return null;
    return threadPickWeighted(threadWeighted(env, threadDropPool(env, state, zone, enemy), zone, enemy), random);
  }
  function threadYarnPool(env, state, id) {
    const grade = env.byId.get(id)?.grade || 0;
    return env.deps.KNITTING.list.filter((row) => row.id !== id && row.set > 1 && !row.reward.yarns && row.yarnOut !== false && row.grade <= grade && state.knitting.seen.includes(row.id) && threadOpen(env, state, row));
  }
  function threadPickYarn(env, state, id, random) {
    return threadPickWeighted(threadWeighted(env, threadYarnPool(env, state, id), null, null), random);
  }
  function threadReason(env, state, id) {
    const row = env.byId.get(id);
    const count = state.knitting.counts[id] || 0;
    if (!row || !state.knitting.seen.includes(id)) return "발견하지 않은 실타래입니다.";
    if (!env.deps.contentProgression.isUnlocked("knitting", state)) return "뜨개질이 아직 열리지 않았습니다.";
    if (state.woodsmanBuildLock) return "나무꾼 전투 중에는 뜨개질할 수 없습니다.";
    if (!threadOpen(env, state, row)) return "보상에 필요한 콘텐츠를 먼저 해금하세요.";
    if (count < row.set) return env.deps._t("실타래 부족 ({count}/{set})", { count, set: row.set });
    if (row.reward.yarns && !threadYarnPool(env, state, id).length) return "다른 종류의 실타래를 먼저 발견하세요.";
    return "";
  }

  // modules/domain/knitting.mjs
  function createKnitting(deps) {
    const env = { deps };
    env.byId = new Map(env.deps.KNITTING.list.map((row) => [row.id, row]));
    env.sourceChecks = {
      types: (value, zone) => value.includes(zone.type),
      zones: (value, zone) => threadZoneKeys(zone).some((key) => value.includes(key)),
      boss: (value, zone, enemy) => !value || !!enemy.isBoss,
      elite: (value, zone, enemy) => !value || !!enemy.isElite || !!enemy.isBoss,
      treasure: (value, zone, enemy) => !value || !!enemy.treasureCarrier,
      minAtlasTier: (value, zone) => zone.type === "atlasMap" && Number(zone.atlasTier) >= value,
      act: (value, zone) => Number(zone.id) === value,
      minAct: (value, zone) => Number(zone.id) >= value,
      kind: (value, zone) => zone.atlasKind === value,
      apostle: (value, zone) => !value || !!zone.atlasApostle
    };
    env.ZONE_KEY = /^(type|act|atlas|node):\S+$/;
    env.ROW_CHECKS = [(...args) => threadSetProblem(env, ...args), (...args) => threadNameProblem(env, ...args), (...args) => threadSourceProblem(env, ...args), (...args) => threadZoneKeyProblem(env, ...args), (...args) => threadUnlockProblem(env, ...args)];
    return Object.freeze({
      defaults: threadDefaults,
      normalize: (...args) => threadNormalize(env, ...args),
      resetForLoop: threadResetForLoop,
      zoneKeys: threadZoneKeys,
      dropPool: (...args) => threadDropPool(env, ...args),
      weighted: (...args) => threadWeighted(env, ...args),
      rollKill: (...args) => threadRollKill(env, ...args),
      markDrop: (...args) => threadMarkDrop(env, ...args),
      receive: (...args) => threadReceive(env, ...args),
      yarnPool: (...args) => threadYarnPool(env, ...args),
      pickYarn: (...args) => threadPickYarn(env, ...args),
      reason: (...args) => threadReason(env, ...args),
      visible: (...args) => threadVisible(env, ...args),
      gainedBetween: (...args) => threadGainedBetween(env, ...args),
      structureProblems: (...args) => threadStructureProblems(env, ...args),
      row: (id) => env.byId.get(id),
      validId: (id) => env.byId.has(id),
      pick: threadPick
    });
  }

  // modules/knitting-classic.mjs
  var rules = createKnitting({
    get KNITTING() {
      return KNITTING;
    },
    get contentProgression() {
      return contentProgression;
    },
    get levelProgression() {
      return levelProgression;
    },
    get _t() {
      return _t;
    },
    get atlas() {
      return typeof atlas === "undefined" ? void 0 : atlas;
    }
  });
  var knitting = rules;
  safeExposeGlobals({ knitting });
})();
