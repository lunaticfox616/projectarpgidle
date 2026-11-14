// GENERATED from modules/stump-nursery*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/stump-nursery-rules.mjs
  function nurseryOpen(env, state) {
    return env.deps.contentProgression.holds("nursery", state);
  }
  function nurseryAncientOpen(env, state) {
    return env.deps.contentProgression.holds("ancientSeed", state);
  }
  function nurseryAcquired(state) {
    return !!(state.stumpBox && state.stumpBox.acquired);
  }
  function nurseryBetween([min, max], random) {
    return min + random() * (max - min);
  }
  function nurseryAnyColor(env, random) {
    return env.COLORS[Math.min(env.COLORS.length - 1, Math.floor(random() * env.COLORS.length))];
  }
  function nurseryColorOf(env, zone, random) {
    return env.N.regionColors[zone && zone.atlasRegion] || nurseryAnyColor(env, random);
  }
  function* nurseryGive(env, state, spec, random) {
    const item = env.deps.stumpBox.createItem(state, spec, spec.ancient === true);
    const compost = item ? null : env.deps.stumpBox.compostOverflow(state, spec, random);
    yield { kind: "dispatchRuntimeEvent", args: ["stump-box-changed", { ripened: compost ? compost.ripened : [], drop: item, compost }] };
    return item;
  }
  function nurseryNurserySpec(env, zone, roll, random) {
    return {
      family: "seed",
      color: nurseryColorOf(env, zone, random),
      roll: nurseryBetween(roll, random),
      golden: random() < env.deps.STUMP_BOX_RIPENING.golden.dropChance * env.N.goldenMul
    };
  }
  function nurseryAncientSpec(env, color, random) {
    return { family: "seed", color, roll: nurseryBetween(env.N.ancient.roll, random), ancient: true };
  }
  function* nurseryOnKilled(env, state, enemy, random = Math.random) {
    if (!enemy || enemy.atlasEncounter !== "nursery" || enemy.isBoss || !nurseryAcquired(state)) return null;
    if (random() >= env.N.killChance[enemy.isElite ? "elite" : "normal"]) return null;
    return yield* nurseryGive(env, state, nurseryNurserySpec(env, env.deps.getZone(state.currentZoneId), env.N.killRoll, random), random);
  }
  function* nurseryClearGift(env, state, zone, random = Math.random) {
    if (!nurseryAcquired(state)) return [];
    const ancient = nurseryAncientOpen(env, state) && random() < env.N.ancient.roomChance;
    const out = [yield* nurseryGive(env, state, ancient ? nurseryAncientSpec(env, nurseryColorOf(env, zone, random), random) : nurseryNurserySpec(env, zone, env.N.clearRoll, random), random)];
    if (random() < env.N.scarChance && env.deps.stumpBox.devourOpen(state)) out.push(env.deps.stumpBox.rollScarDrop(state, () => 0));
    return out.filter(Boolean);
  }
  function* nurseryAncientFromBoss(env, state, random = Math.random) {
    if (!nurseryAcquired(state) || !nurseryAncientOpen(env, state) || random() >= env.N.ancient.apexChance) return null;
    return yield* nurseryGive(env, state, nurseryAncientSpec(env, nurseryAnyColor(env, random), random), random);
  }

  // modules/domain/stump-nursery.mjs
  function createStumpNursery(deps) {
    const env = { deps };
    env.N = env.deps.STUMP_NURSERY;
    env.COLORS = Object.freeze(Object.keys(env.deps.STUMP_BOX_COLORS));
    return Object.freeze({
      open: (...args) => nurseryOpen(env, ...args),
      ancientOpen: (...args) => nurseryAncientOpen(env, ...args),
      colorOf: (...args) => nurseryColorOf(env, ...args),
      onKilled: (...args) => nurseryOnKilled(env, ...args),
      clearGift: (...args) => nurseryClearGift(env, ...args),
      ancientFromBoss: (...args) => nurseryAncientFromBoss(env, ...args)
    });
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

  // modules/stump-nursery-classic.mjs
  var rules = createStumpNursery({
    get contentProgression() {
      return contentProgression;
    },
    get stumpBox() {
      return stumpBox;
    },
    get STUMP_BOX_RIPENING() {
      return STUMP_BOX_RIPENING;
    },
    get getZone() {
      return getZone;
    },
    get STUMP_NURSERY() {
      return STUMP_NURSERY;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    }
  });
  var stumpNursery = Object.freeze({
    ...rules,
    onKilled: (...args) => runRuntimeEventCommands(rules.onKilled(...args), dispatchRuntimeEvent),
    clearGift: (...args) => runRuntimeEventCommands(rules.clearGift(...args), dispatchRuntimeEvent),
    ancientFromBoss: (...args) => runRuntimeEventCommands(rules.ancientFromBoss(...args), dispatchRuntimeEvent)
  });
  safeExposeGlobals({ stumpNursery });
})();
