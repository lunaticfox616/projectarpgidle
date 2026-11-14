// GENERATED from modules/loop-mutation*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/loop-mutation-rules.mjs
  function loopRuleMutationOfLoop(env, loop) {
    const index = Math.floor(Number(loop) || 0) - env.deps.LOOP_MUTATION.startLoop;
    if (index < 0) return null;
    const [immune, weak] = env.deps.LOOP_MUTATION.schedule[index % env.deps.LOOP_MUTATION.schedule.length];
    return { immune, weak, empowered: loopRuleEmpoweredElementOfLoop(env, loop, immune) };
  }
  function loopRuleEmpoweredElementOfLoop(env, loop, immune) {
    const rule = env.deps.LOOP_MUTATION.empowered;
    if (Math.floor(Number(loop) || 0) < rule.startLoop) return null;
    const roll = env.deps.createSeededRng(`loop-mutation-empowered:${Math.floor(Number(loop))}`)();
    if (roll < rule.immuneWeight) return immune;
    const others = env.MUTATION_ELEMENTS.filter((ele) => ele !== immune);
    return others[Math.min(others.length - 1, Math.floor((roll - rule.immuneWeight) / (1 - rule.immuneWeight) * others.length))];
  }
  function loopRuleCurrentMutation(env, state) {
    return state && state.loopMutationSeason === state.season ? loopRuleMutationOfLoop(env, state.season) : null;
  }
  function loopRuleMutationBites(env, state) {
    return !!loopRuleCurrentMutation(env, state) && !!state.activeSkill && state.activeSkill !== "기본 공격";
  }
  function loopRuleTakenMul(env, owner, enemy, ele) {
    if (!enemy || enemy.isWoodsman || !loopRuleMutationBites(env, owner)) return 1;
    const rule = loopRuleMutationOfLoop(env, owner.season);
    if (ele === rule.immune) return 0;
    return ele === rule.weak ? 1 + env.deps.LOOP_MUTATION.weakTakenPct / 100 : 1;
  }
  function loopRuleEmpoweredHit(env, owner, enemy, rawHit) {
    const rule = enemy && !enemy.isWoodsman && loopRuleMutationBites(env, owner) ? loopRuleMutationOfLoop(env, owner.season) : null;
    if (!rule || !rule.empowered) return null;
    const amount = Math.floor(rawHit * env.deps.LOOP_MUTATION.empowered.addedPct / 100);
    return amount > 0 ? { ele: rule.empowered, amount } : null;
  }
  function loopRuleRewardMul(env, zone, state) {
    const rule = (!zone || zone.type !== "outsideChaos") && loopRuleMutationBites(env, state) ? loopRuleMutationOfLoop(env, state.season) : null;
    return rule ? 1 + loopRuleRewardPctOf(env, rule) / 100 : 1;
  }
  function loopRuleRewardPctOf(env, rule) {
    return rule.empowered ? env.deps.LOOP_MUTATION.empowered.rewardPct : env.deps.LOOP_MUTATION.rewardPct;
  }
  function loopRuleBeginLoop(env, state) {
    state.loopMutationSeason = loopRuleMutationOfLoop(env, state.season) ? state.season : 0;
  }
  function loopRuleDescribeMutation(env, rule) {
    return `${loopRuleDescribeSides(env, rule)}, ${env.deps._t("보상 +{rewardPct}%", { rewardPct: loopRuleRewardPctOf(env, rule) })}`;
  }
  function loopRuleDescribeSides(env, rule) {
    if (rule.empowered) return env.deps._t("{immune} 면역, {weak} 약점, {strong} 공격 강화", {
      immune: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.immune]),
      weak: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.weak]),
      strong: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.empowered])
    });
    return env.deps._t("{DAMAGE_ELEMENT_LABELS} 면역, {DAMAGE_ELEMENT_LABELS2} 약점", { DAMAGE_ELEMENT_LABELS: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.immune]), DAMAGE_ELEMENT_LABELS2: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.weak]) });
  }

  // modules/domain/loop-mutation.mjs
  function createLoopMutation(deps) {
    const env = { deps };
    env.MUTATION_ELEMENTS = Object.freeze(["phys", "fire", "cold", "light", "chaos"]);
    return Object.freeze({
      of: (...args) => loopRuleMutationOfLoop(env, ...args),
      current: (...args) => loopRuleCurrentMutation(env, ...args),
      bites: (...args) => loopRuleMutationBites(env, ...args),
      takenMul: (...args) => loopRuleTakenMul(env, ...args),
      begin: (...args) => loopRuleBeginLoop(env, ...args),
      describe: (...args) => loopRuleDescribeMutation(env, ...args),
      empoweredHit: (...args) => loopRuleEmpoweredHit(env, ...args),
      rewardMul: (...args) => loopRuleRewardMul(env, ...args),
      rewardPct: (...args) => loopRuleRewardPctOf(env, ...args)
    });
  }

  // modules/ui/loop-mutation.mjs
  function renderLoopMutationPart(deps, ele, word) {
    return `<b style="--mutation-ele:${deps.getElementColor(ele)}">${deps.escapeHTML(deps._t(deps.labels[ele]))} ${deps.escapeHTML(deps._t(word))}</b>`;
  }
  function renderLoopMutationParts(deps, rule, separator = "") {
    const parts = [renderLoopMutationPart(deps, rule.immune, "면역"), renderLoopMutationPart(deps, rule.weak, "약점")];
    if (rule.empowered) parts.push(renderLoopMutationPart(deps, rule.empowered, "공격 강화"));
    parts.push(`<b class="loop-mutation-reward">${deps.escapeHTML(deps._t("보상 +{rewardPct}%", { rewardPct: deps.rewardPct(rule) }))}</b>`);
    return parts.join(separator);
  }

  // modules/loop-mutation-classic.mjs
  var rules = createLoopMutation({
    get LOOP_MUTATION() {
      return LOOP_MUTATION;
    },
    get createSeededRng() {
      return createSeededRng;
    },
    get _t() {
      return _t;
    },
    get DAMAGE_ELEMENT_LABELS() {
      return DAMAGE_ELEMENT_LABELS;
    }
  });
  var display = {
    get labels() {
      return DAMAGE_ELEMENT_LABELS;
    },
    get _t() {
      return _t;
    },
    get getElementColor() {
      return getElementColor;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    rewardPct: rules.rewardPct
  };
  var loopMutation = Object.freeze({
    of: rules.of,
    current: (state = game) => rules.current(state),
    bites: (state = game) => rules.bites(state),
    takenMul: (enemy, ele) => rules.takenMul(game, enemy, ele),
    begin: rules.begin,
    describe: rules.describe,
    partHtml: (ele, word) => renderLoopMutationPart(display, ele, word),
    partsHtml: (rule, separator = "") => renderLoopMutationParts(display, rule, separator),
    empoweredHit: (enemy, rawHit) => rules.empoweredHit(game, enemy, rawHit),
    rewardMul: (zone, state = game) => rules.rewardMul(zone, state),
    rewardPct: rules.rewardPct
  });
  safeExposeGlobals({ loopMutation });
})();
