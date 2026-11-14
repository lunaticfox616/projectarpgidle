// GENERATED from modules/act-exploration-sight*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/act-exploration-sight-values.mjs
  var FOG = "fog";
  var ROOM = "room";

  // modules/combat/exploration-sight-mode.mjs
  function sightForced(env) {
    return env.deps.settings()?.stageSight === FOG;
  }
  function sightSightMode(env, run) {
    const map = run ? env.deps.actExplorationMap.forRun(run) : null;
    if (!map || !map.stage) return FOG;
    return sightForced(env) || env.deps.STAGE_ROOM_PLANS.regions.sight.includes(map.region) ? FOG : ROOM;
  }
  function sightWholeRoom(env, run) {
    return sightSightMode(env, run) === ROOM;
  }
  function sightSameRoom(env, map, one, other) {
    const room = env.deps.actExplorationRooms.roomAt(map, one);
    return !!room && room === env.deps.actExplorationRooms.roomAt(map, other);
  }
  function sightInRoomOf(env, map, cell) {
    const here = env.deps.actExplorationRooms.roomAt(map, cell);
    return (unit) => !!here && env.deps.actExplorationRooms.roomAt(map, unit) === here;
  }

  // modules/combat/exploration-sight-discovery.mjs
  function sightSeenCells(env, run) {
    const memo2 = env.memo.seenMemo.get(run);
    if (memo2 && memo2.list === run.discovered) return memo2.set;
    const set = new Set(run.discovered);
    env.memo.seenMemo.set(run, { list: run.discovered, set });
    return set;
  }
  function sightKnownCell(env, run, cell) {
    const map = env.deps.actExplorationMap.forRun(run);
    if (sightSightMode(env, run) === FOG) return sightSeenCells(env, run).has(env.deps.actExplorationMap.index(map, cell));
    const room = env.deps.actExplorationRooms.roomAt(map, cell);
    return !!room && run.visitedRooms.includes(room.id);
  }
  function sightFloorOf(room) {
    return (room.x1 - room.x0 + 1) * (room.y1 - room.y0 + 1);
  }
  function sightExploredShare(env, run) {
    const map = env.deps.actExplorationMap.forRun(run);
    if (sightSightMode(env, run) === FOG) {
      const floor = map.tiles.filter(env.deps.Boolean).length;
      return floor ? run.discovered.filter((id) => map.tiles[id]).length / floor : 0;
    }
    const total = map.rooms.reduce((sum, room) => sum + sightFloorOf(room), 0);
    const walked = map.rooms.filter((room) => run.visitedRooms.includes(room.id)).reduce((sum, room) => sum + sightFloorOf(room), 0);
    return total ? walked / total : 0;
  }
  function sightDropCellList(env, run) {
    if (run.discovered.length && sightWholeRoom(env, run)) run.discovered = [];
  }

  // modules/act-exploration-sight-classic.mjs
  var memo = { seenMemo: /* @__PURE__ */ new WeakMap() };
  var deps = {
    settings: () => typeof game === "object" ? game.settings : void 0,
    get actExplorationMap() {
      return actExplorationMap;
    },
    get STAGE_ROOM_PLANS() {
      return STAGE_ROOM_PLANS;
    },
    get actExplorationRooms() {
      return actExplorationRooms;
    },
    get Boolean() {
      return Boolean;
    }
  };
  var actExplorationSight = Object.freeze({
    sightMode(run) {
      return sightSightMode({ deps, memo }, run);
    },
    wholeRoom(run) {
      return sightWholeRoom({ deps, memo }, run);
    },
    sameRoom(map, one, other) {
      return sightSameRoom({ deps, memo }, map, one, other);
    },
    inRoomOf(map, cell) {
      return sightInRoomOf({ deps, memo }, map, cell);
    },
    seenCells(run) {
      return sightSeenCells({ deps, memo }, run);
    },
    knownCell(run, cell) {
      return sightKnownCell({ deps, memo }, run, cell);
    },
    exploredShare(run) {
      return sightExploredShare({ deps, memo }, run);
    },
    dropCellList(run) {
      return sightDropCellList({ deps, memo }, run);
    }
  });
  safeExposeGlobals({ actExplorationSight });
})();
