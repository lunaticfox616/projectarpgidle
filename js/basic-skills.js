// GENERATED from modules/basic-skills*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/basic-skills-rules.mjs
  function starterSkillFamilyOf(env, classId) {
    return env.deps.SKILL_RUNE_STANCE_BY_CATEGORY[env.deps.HANA_WEAPON_COMBOS.classWeapons[classId]] || null;
  }
  function starterSkillNameOf(env, family, ele) {
    const row = env.deps.BASIC_SKILL_ROWS.find((entry) => entry.family === family && entry.ele === ele);
    return row ? row.name : null;
  }
  function starterSkillChoiceCount(env, state) {
    return 2 + env.WIDER.filter((id) => env.deps.contentProgression.holds(id, state)).length;
  }
  function starterSkillOffer(env, state, random = Math.random) {
    const count = starterSkillChoiceCount(env, state), kept = state.basicSkillOffer;
    if (kept && kept.loop === state.season && kept.elements.length === count) return kept.elements.slice();
    const rule = env.deps.loopMutation.of(state.season), pool = env.ELEMENTS.filter((ele) => !rule || ele !== rule.immune);
    const elements = pool.map((ele) => ({ ele, key: random() })).sort((a, b) => a.key - b.key).slice(0, count).map((row) => row.ele).sort((a, b) => env.ELEMENTS.indexOf(a) - env.ELEMENTS.indexOf(b));
    state.basicSkillOffer = { loop: state.season, elements };
    return elements.slice();
  }
  function* starterSkillGrant(env, state, classId, ele) {
    const offered = starterSkillOffer(env, state), pick = offered.includes(ele) ? ele : offered[0], name = starterSkillNameOf(env, starterSkillFamilyOf(env, classId), pick);
    if (!name) return null;
    if (!env.deps.hasSkillGemOwned(name, state)) state.skills.push(name);
    state.gemData[name] = state.gemData[name] || { level: 1, exp: 0 };
    if (state.skills.includes(name)) {
      state.activeSkill = name;
      yield { kind: "fitStarterWeapon", args: [] };
    }
    state.basicSkillElement = pick;
    state.basicSkillOffer = null;
    state.unlocks.skills = true;
    return name;
  }
  function starterSkillAutoPick(env, state) {
    const offered = starterSkillOffer(env, state);
    return offered.includes(state.basicSkillElement) ? state.basicSkillElement : offered[0];
  }

  // modules/domain/basic-skills.mjs
  function createBasicSkills(deps) {
    const env = { deps };
    env.ELEMENTS = Object.freeze(env.deps.BASIC_SKILL_ELEMENTS.map((row) => row.ele));
    env.WIDER = Object.freeze(["basicElement3", "basicElement4"]);
    env.weaponGuide = "tutorial_starter_gem_equip";
    return Object.freeze({ weaponGuide: env.weaponGuide, familyOf: (...args) => starterSkillFamilyOf(env, ...args), nameOf: (...args) => starterSkillNameOf(env, ...args), choiceCount: (...args) => starterSkillChoiceCount(env, ...args), offer: (...args) => starterSkillOffer(env, ...args), grant: (...args) => starterSkillGrant(env, ...args), autoPick: (...args) => starterSkillAutoPick(env, ...args) });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/basic-skills-classic.mjs
  var rules = createBasicSkills({
    get SKILL_RUNE_STANCE_BY_CATEGORY() {
      return SKILL_RUNE_STANCE_BY_CATEGORY;
    },
    get HANA_WEAPON_COMBOS() {
      return HANA_WEAPON_COMBOS;
    },
    get BASIC_SKILL_ROWS() {
      return BASIC_SKILL_ROWS;
    },
    get contentProgression() {
      return contentProgression;
    },
    get loopMutation() {
      return loopMutation;
    },
    get hasSkillGemOwned() {
      return hasSkillGemOwned;
    },
    get BASIC_SKILL_ELEMENTS() {
      return BASIC_SKILL_ELEMENTS;
    }
  });
  var effects = { fitStarterWeapon: () => fitActiveSkillToWeapon() };
  var basicSkills = Object.freeze({
    ...rules,
    choiceCount: (state = game) => rules.choiceCount(state),
    offer: (state = game, random = Math.random) => rules.offer(state, random),
    grant: (state, classId, ele) => consumeDomainCommands(rules.grant(state, classId, ele), effects),
    autoPick: (state = game) => rules.autoPick(state)
  });
  safeExposeGlobals({ basicSkills });
})();
