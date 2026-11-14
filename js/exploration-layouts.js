// GENERATED from modules/exploration-layouts*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/exploration-layouts.mjs
  var STYLE = "act";
  var NAMED = "map";
  var ACTS = 10;
  function authored(acts, act) {
    const row = acts.find((map) => map.act === act);
    if (!row) throw Error("넓은 맵 명세가 잘못되었습니다: 액트 지도 " + act);
    return row;
  }
  function content(contentMaps, id) {
    const row = contentMaps.find((map) => map.id === id);
    if (!row) throw Error("넓은 맵 명세가 잘못되었습니다: 콘텐츠 지도 " + id);
    return row;
  }
  var seedOf = (spec) => String(spec.seed === void 0 ? "" : spec.seed);
  var CHAIN_MAX = 30;
  function withArena(out, spec) {
    if (spec.arena === true) out.arena = true;
    if (spec.chain === true) out.chain = true;
    else if (Number.isInteger(spec.chain) && spec.chain >= 1 && spec.chain <= CHAIN_MAX) out.chain = spec.chain;
    return out;
  }
  function normalize(acts, contentMaps, spec) {
    if (spec && spec.style === NAMED) return withArena({ style: NAMED, id: content(contentMaps, String(spec.id)).id, seed: seedOf(spec) }, spec);
    const act = Number(spec && spec.act);
    if (!spec || spec.style !== STYLE || !Number.isInteger(act) || act < 1 || act > ACTS) {
      throw Error("넓은 맵 명세가 잘못되었습니다: " + JSON.stringify(spec));
    }
    return withArena({ style: STYLE, act, seed: seedOf(spec) }, spec);
  }
  var specKey = (spec) => [spec.style, spec.style === NAMED ? spec.id : spec.act, spec.arena ? "arena" : spec.chain ? spec.chain === true ? "chain" : "chain" + spec.chain : "map"].join(":");
  function arenaSource(base) {
    const rooms = base.rooms.map((room) => {
      const role = room[5] === "boss" ? "boss" : room[0] === base.approach ? "entry" : "path";
      return Object.freeze([room[0], room[1], room[2], room[3], room[4], role]);
    });
    return { ...base, rooms: Object.freeze(rooms) };
  }
  function chainSource(base, count) {
    if (count !== true) return countedChain(base, count);
    const rooms = base.rooms.map((room) => Object.freeze([room[0], room[1], room[2], room[3], room[4], ["entry", "boss"].includes(room[5]) ? room[5] : "battle"]));
    return { ...base, rooms: Object.freeze(rooms) };
  }
  function countedChain(base, count) {
    const entry = base.rooms.find((room) => room[5] === "entry"), boss = base.rooms.find((room) => room[5] === "boss");
    const between = base.rooms.filter((room) => room !== entry && room !== boss);
    const rooms = Array.from({ length: count }, (unused, index) => {
      const like = between[index % between.length];
      return Object.freeze(["c" + (index + 1), like[1], like[2], like[3], like[4], "battle"]);
    });
    return { ...base, rooms: Object.freeze([entry, ...rooms, boss]) };
  }
  function build(acts, contentMaps, spec) {
    const clean = normalize(acts, contentMaps, spec), base = clean.style === NAMED ? content(contentMaps, clean.id) : authored(acts, clean.act);
    if (clean.chain) return chainSource(base, clean.chain);
    return clean.arena ? arenaSource(base) : base;
  }
  function supports(acts, contentMaps, spec) {
    try {
      normalize(acts, contentMaps, spec);
      return true;
    } catch {
      return false;
    }
  }
  function createExplorationLayouts(acts, contentMaps) {
    return Object.freeze({
      styles: Object.freeze([STYLE, NAMED]),
      key: (spec) => specKey(normalize(acts, contentMaps, spec)),
      normalize: normalize.bind(null, acts, contentMaps),
      build: build.bind(null, acts, contentMaps),
      supports: supports.bind(null, acts, contentMaps)
    });
  }

  // modules/exploration-layouts-classic.mjs
  var explorationLayouts = createExplorationLayouts(ACT_EXPLORATION_MAPS, CONTENT_EXPLORATION_MAPS);
  safeExposeGlobals({ explorationLayouts });
})();
