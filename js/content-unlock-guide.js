// GENERATED from modules/content-unlock-guide*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/content-guide-common.mjs
  function unlockGuideCount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }
  function unlockGuideRequirement(label, met, current, target) {
    let row = { label, met: !!met };
    if (Number.isFinite(current) && Number.isFinite(target)) {
      row.current = Math.max(0, Math.floor(current));
      row.target = Math.max(1, Math.floor(target));
    }
    return row;
  }
  function unlockGuideGuide(definition) {
    let requirements = Array.isArray(definition.requirements) ? definition.requirements : [];
    let completed = requirements.filter((row) => row.met).length;
    return { ...definition, requirements, completed, total: requirements.length };
  }
  function unlockGuideTabUnlocked(env, state, id) {
    if (typeof env.deps.isMapPrimaryContentUnlocked === "function") return env.deps.isMapPrimaryContentUnlocked(state, id);
    return Array.isArray(state.unlockedMapContents) && state.unlockedMapContents.includes(id);
  }
  function unlockGuideHighestChaosDepth(env, state) {
    if (typeof env.deps.getHighestUnlockedEndlessChaosDepth === "function") return unlockGuideCount(env.deps.getHighestUnlockedEndlessChaosDepth(state));
    let depths = Array.isArray(state.abyssUnlockedDepths) ? state.abyssUnlockedDepths.map(unlockGuideCount) : [];
    return Math.max(unlockGuideCount(state.abyssEndlessDepth), ...depths, 0);
  }

  // modules/domain/content-guide-milestones.mjs
  function unlockGuideGetRoadmapMilestones(env) {
    if (typeof env.deps.SEASON_CONTENT_ROADMAP === "undefined" || !env.deps.SEASON_CONTENT_ROADMAP) return [];
    return Object.keys(env.deps.SEASON_CONTENT_ROADMAP).map(Number).sort((a, b) => a - b).map((loop) => {
      let row = env.deps.SEASON_CONTENT_ROADMAP[loop] || {};
      let features = (Array.isArray(row.features) ? row.features : []).filter((text) => !/^심화:|^전술 조건/.test(text));
      return { loop, features };
    }).filter((row) => row.features.length > 0);
  }
  function unlockGuideCleanRoadmapFeature(text) {
    return String(text || "").replace(/^(?:조건부 )?해금:\s*/, "").replace(/^전환점:\s*/, "").replace(/\s*\/\s*/g, ", ");
  }
  function unlockGuideLoopMilestoneGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    let next = unlockGuideGetRoadmapMilestones(env).find((row) => row.loop > loop);
    if (!next) return null;
    let titles = next.features.map(unlockGuideCleanRoadmapFeature);
    return unlockGuideGuide({
      id: `loop-${next.loop}`,
      title: titles[0],
      description: env.deps._t("루프 {loop}: {titles}", { loop: next.loop, titles: titles.join(", ") }),
      requirements: [unlockGuideRequirement(env.deps._t("루프 {loop}", { loop: next.loop }), false, loop, next.loop)],
      actionLabel: state.unlocks && state.unlocks.season ? "루프 보기" : "",
      actionTabId: state.unlocks && state.unlocks.season ? "tab-season" : ""
    });
  }
  function unlockGuideEventUnlockGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    if (loop >= 4 && !state.gemEnhanceUnlocked) return unlockGuideGuide({
      id: "gem-enhancement",
      title: env.deps._t("룬 강화"),
      description: env.deps._t("군주의 핵 또는 창공의 정수를 얻으면 스킬룬 강화가 열립니다."),
      requirements: [unlockGuideRequirement("루프 4", true), unlockGuideRequirement("강화 재료 획득", false)],
      actionLabel: "스킬룬 보기",
      actionTabId: "tab-skills",
      actionSubtabId: "skill-tab-enhance"
    });
    let meteorUnlocked = !!(state.meteorSite && state.meteorSite.unlocked);
    if (loop >= 7 && !meteorUnlocked) return unlockGuideGuide({
      id: "meteor-site",
      title: env.deps._t("운석 낙하 지점"),
      description: env.deps._t("루프 7에서 액트 7을 클리어하면 하늘 균열 게이지가 차기 시작합니다."),
      requirements: [unlockGuideRequirement("루프 7", true), unlockGuideRequirement("액트 7 클리어", unlockGuideCount(state.maxZoneId) >= 7, unlockGuideCount(state.maxZoneId), 7)],
      actionLabel: "사냥터 보기",
      actionTabId: "tab-map",
      actionSubtabId: "map-explore-atlas",
      actionMapAct: 6
    });
    return null;
  }
  function unlockGuideContentChoiceGuide(env, state) {
    const points = env.deps.contentProgression.points(state);
    if (points.complete) return null;
    const next = env.deps.contentProgression.cheapestOpen(state), ready = points.balance > 0 && !!next && next.cost <= points.balance;
    return unlockGuideGuide({
      id: "content-choice",
      title: ready ? "해금 선택" : "다음 해금",
      description: ready ? env.deps._t("해금 포인트 {balance}점 사용", { balance: points.balance }) : unlockGuideContentWaitText(env, points, next),
      requirements: [unlockGuideRequirement("해금 포인트", ready, points.balance, next ? Math.max(1, next.cost) : 1)],
      actionLabel: state.season >= 2 ? "해금 열기" : "장비 열기",
      actionTabId: state.season >= 2 ? "tab-unlocks" : "tab-items"
    });
  }
  function unlockGuideContentWaitText(env, points, next) {
    const award = points.nextAward > 0 ? env.deps._t("다음 루프에 도달하여 해금 포인트 {nextAward}점 획득", { nextAward: points.nextAward }) : "";
    if (points.balance <= 0) return award;
    const need = next ? env.deps._t("다음 해금에 {cost}점 필요", { cost: next.cost }) : "지금 고를 해금 없음";
    return [need, award || "남은 해금은 조건 달성 후 열림"].join(", ");
  }

  // modules/domain/content-guide-realms.mjs
  function unlockGuideChaosRealmGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    if (loop < 10 || state.chaosRealm && state.chaosRealm.unlocked) return null;
    let woodsmanPct = Math.min(100, unlockGuideCount(state.chaosRealm && state.chaosRealm.woodsmanBestDamagePct));
    let loopReady = typeof env.deps.hasCurrentLoopAbyssRequirementClear === "function" ? env.deps.hasCurrentLoopAbyssRequirementClear(loop) : false;
    return unlockGuideGuide({
      id: "chaos-realm",
      title: env.deps._t("혼돈계"),
      description: env.deps._t("현재 루프 조건을 달성한 뒤 혼돈 밖 나무꾼에게 최대 생명력의 10% 이상 피해를 주세요."),
      requirements: [
        unlockGuideRequirement("루프 10", true),
        unlockGuideRequirement("이번 루프 혼돈 조건", loopReady),
        unlockGuideRequirement("나무꾼 피해", woodsmanPct >= 10, Math.min(10, woodsmanPct), 10)
      ],
      actionLabel: loopReady ? "혼돈 밖 보기" : "혼돈 보기",
      actionTabId: loopReady ? "tab-season" : "tab-map",
      actionSubtabId: loopReady ? "" : "map-explore-chaos"
    });
  }
  function unlockGuideSkyTowerGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    if (loop < 15 || state.skyTower && state.skyTower.unlocked) return null;
    let chaos20 = typeof env.deps.hasCurrentLoopChaos20Clear === "function" ? env.deps.hasCurrentLoopChaos20Clear(state) : false;
    return unlockGuideGuide({
      id: "sky-tower",
      title: env.deps._t("창공의 탑"),
      description: env.deps._t("루프 15에서 혼돈 20층을 클리어하면 영구 해금됩니다."),
      requirements: [unlockGuideRequirement("루프 15", true), unlockGuideRequirement("이번 루프 혼돈 20층", chaos20)],
      actionLabel: "혼돈 보기",
      actionTabId: "tab-map",
      actionSubtabId: "map-explore-chaos"
    });
  }
  function unlockGuideUnderworldGuide(env, state) {
    if (unlockGuideTabUnlocked(env, state, "map-tab-underworld")) return null;
    let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
    let deep = unlockGuideHighestChaosDepth(env, state);
    let labyrinth = Math.max(1, unlockGuideCount(state.labyrinthUnlockedMaxFloor || state.labyrinthFloor) || 1);
    let requirements = [
      unlockGuideRequirement("혼돈계 발견", !!(state.chaosRealm && state.chaosRealm.unlocked)),
      unlockGuideRequirement("케르베로스 처치", roots.has("s6_beast_cerberus")),
      unlockGuideRequirement("혼돈 심화 30층", deep >= 30, Math.min(deep, 30), 30),
      unlockGuideRequirement("고대 미궁 100층", labyrinth >= 100, Math.min(labyrinth, 100), 100)
    ];
    let nextSubtab = !roots.has("s6_beast_cerberus") ? "map-explore-root-boss" : deep < 30 ? "map-explore-chaos" : "map-explore-labyrinth";
    return unlockGuideGuide({
      id: "underworld",
      title: env.deps._t("지하계"),
      description: env.deps._t("네 갈래의 엔드게임 기록을 모으면 지하계가 영구적으로 나타납니다."),
      requirements,
      actionLabel: "다음 조건 보기",
      actionTabId: "tab-map",
      actionSubtabId: nextSubtab
    });
  }
  function unlockGuideCoreGuide(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    let highest = Math.max(1, unlockGuideCount(state.underworldProgress && state.underworldProgress.highestFloor) || 1);
    if (loop >= 20 && highest >= 11) return null;
    return unlockGuideGuide({
      id: "core",
      title: env.deps._t("코어"),
      description: env.deps._t("루프 20 이후 지하계 10층을 넘기면 지하계 적에게서 코어가 떨어집니다. 장비창 왼쪽 위 코어 칸에 낍니다."),
      requirements: [unlockGuideRequirement("루프 20", loop >= 20, Math.min(loop, 20), 20), unlockGuideRequirement("지하계 10층", highest >= 11, Math.min(highest - 1, 10), 10)],
      actionLabel: "지하계 보기",
      actionTabId: "tab-map",
      actionSubtabId: "map-tab-underworld"
    });
  }
  function unlockGuideCosmosGuide(env, state) {
    if (unlockGuideTabUnlocked(env, state, "map-tab-cosmos")) return null;
    let journal = new Set(Array.isArray(state.journalEntries) ? state.journalEntries : []);
    let highest = Math.max(1, unlockGuideCount(state.underworldProgress && state.underworldProgress.highestFloor) || 1);
    return unlockGuideGuide({
      id: "cosmos",
      title: env.deps._t("우주계"),
      description: env.deps._t("나무꾼의 정체를 확인하고 지하계 30층에 도달하면 우주계가 영구적으로 나타납니다."),
      requirements: [unlockGuideRequirement("나무꾼 처치 기록", journal.has("woodsman")), unlockGuideRequirement("지하계 30층", highest >= 30, Math.min(highest, 30), 30)],
      actionLabel: highest < 30 ? "지하계 보기" : "지도 보기",
      actionTabId: "tab-map",
      actionSubtabId: highest < 30 ? "map-tab-underworld" : "map-tab-zones"
    });
  }
  function unlockGuideAstraGuide(env, state) {
    let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
    if (roots.has("cosmos_astra")) return null;
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    let zone = env.deps.SEASON_BOSS_ZONES.find((row) => row.id === "cosmos_astra");
    let gate = zone ? env.deps.getSeasonBossProgressGate(zone, state) : { met: false, current: 0, target: 5 };
    let keys = unlockGuideCount(state.currencies && state.currencies.cosmosSovereignKey);
    let ready = loop >= 31 && gate.met && keys > 0;
    return unlockGuideGuide({
      id: "astra",
      title: env.deps._t("잔향체 아스트라"),
      description: env.deps._t("다섯 은하 보스를 이번 루프에 격파하고 표식: 잔향을 준비하세요."),
      requirements: [unlockGuideRequirement("루프 31", loop >= 31, Math.min(loop, 31), 31), unlockGuideRequirement("은하 보스", gate.met, gate.current, gate.target), unlockGuideRequirement("표식: 잔향", keys > 0, Math.min(keys, 1), 1)],
      actionLabel: ready ? "아스트라 도전" : "우주계 보기",
      actionTabId: "tab-map",
      actionSubtabId: ready ? "map-explore-root-boss" : "map-tab-cosmos"
    });
  }
  function unlockGuideGetPinnacleSubtab(zone) {
    if (zone.pinnacleTrack === "underworld") return "map-tab-underworld";
    if (zone.pinnacleTrack === "ocean") return "map-tab-ocean";
    if (zone.pinnacleTrack === "sky") return "map-tab-sky";
    return "map-explore-root-boss";
  }
  function unlockGuideGetPinnacleRequirementLabel(zone) {
    if (zone.pinnacleTrack === "underworld") return "지하계 층수";
    if (zone.pinnacleTrack === "ocean") return "심해 깊이";
    if (zone.pinnacleTrack === "sky") return "창공의 탑 층수";
    return "수호자 격파";
  }
  function unlockGuidePinnacleGuide(env, state) {
    let roots = new Set(Array.isArray(state.clearedRootBosses) ? state.clearedRootBosses : []);
    let zones = env.deps.SEASON_BOSS_ZONES.filter((zone) => zone.milestonePinnacle);
    let next = zones.find((zone) => !roots.has(zone.id));
    if (!next) return null;
    let gate = env.deps.getSeasonBossProgressGate(next, state);
    let isObserver = !!next.pinnacleCapstone;
    return unlockGuideGuide({
      id: next.id,
      title: next.name,
      description: isObserver ? "지하/심해/창공/우주의 네 수호자를 격파하면 최종 관문, 베일라에게 도전할 수 있습니다." : "경계의 수호자입니다. 대응하는 무한 콘텐츠 기록을 완성하세요.",
      requirements: [unlockGuideRequirement(unlockGuideGetPinnacleRequirementLabel(next), gate.met, gate.current, gate.target)],
      actionLabel: gate.met ? "보스 도전" : "진행 화면 보기",
      actionTabId: "tab-map",
      actionSubtabId: gate.met ? "map-explore-root-boss" : unlockGuideGetPinnacleSubtab(next)
    });
  }

  // modules/domain/content-guide-selection.mjs
  function unlockGuideGetNextMajorContentUnlock(env, state) {
    if (!state || typeof state !== "object") return null;
    if (state.contentProgression) return unlockGuideContentChoiceGuide(env, state);
    return unlockGuideGetNextLegacyContentUnlock(env, state);
  }
  function unlockGuideGetNextLegacyContentUnlock(env, state) {
    let loop = Math.max(1, unlockGuideCount(state.season) || 1);
    const candidates = [unlockGuideEventUnlockGuide, unlockGuideChaosRealmGuide, unlockGuideSkyTowerGuide];
    if (loop >= 18) candidates.push(unlockGuideUnderworldGuide, unlockGuideCoreGuide, unlockGuideCosmosGuide);
    if (unlockGuideTabUnlocked(env, state, "map-tab-cosmos") && loop >= 31) candidates.push(unlockGuideAstraGuide, unlockGuidePinnacleGuide);
    for (const candidate of candidates) {
      const found = candidate(env, state);
      if (found) return found;
    }
    return unlockGuideLoopMilestoneGuide(env, state);
  }

  // modules/domain/content-unlock-guide.mjs
  function createContentUnlockGuide(deps) {
    const env = { deps };
    return Object.freeze({ getNextMajorContentUnlock: (...args) => unlockGuideGetNextMajorContentUnlock(env, ...args) });
  }

  // modules/content-unlock-guide-classic.mjs
  var rules = createContentUnlockGuide({
    get isMapPrimaryContentUnlocked() {
      return typeof isMapPrimaryContentUnlocked === "undefined" ? void 0 : isMapPrimaryContentUnlocked;
    },
    get getHighestUnlockedEndlessChaosDepth() {
      return typeof getHighestUnlockedEndlessChaosDepth === "undefined" ? void 0 : getHighestUnlockedEndlessChaosDepth;
    },
    get SEASON_CONTENT_ROADMAP() {
      return typeof SEASON_CONTENT_ROADMAP === "undefined" ? void 0 : SEASON_CONTENT_ROADMAP;
    },
    get _t() {
      return _t;
    },
    get contentProgression() {
      return contentProgression;
    },
    get hasCurrentLoopAbyssRequirementClear() {
      return typeof hasCurrentLoopAbyssRequirementClear === "undefined" ? void 0 : hasCurrentLoopAbyssRequirementClear;
    },
    get hasCurrentLoopChaos20Clear() {
      return typeof hasCurrentLoopChaos20Clear === "undefined" ? void 0 : hasCurrentLoopChaos20Clear;
    },
    get SEASON_BOSS_ZONES() {
      return SEASON_BOSS_ZONES;
    },
    get getSeasonBossProgressGate() {
      return getSeasonBossProgressGate;
    }
  });
  var getNextMajorContentUnlock = rules.getNextMajorContentUnlock;
  safeExposeGlobals({ getNextMajorContentUnlock });
})();
