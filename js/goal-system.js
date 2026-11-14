// GENERATED from modules/goal-system*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/goal-actions.mjs
  function nextGoalGoalGame(env) {
    return typeof env.deps.game !== "undefined" && env.deps.game && typeof env.deps.game === "object" ? env.deps.game : null;
  }
  function nextGoalIsTabActionAvailable(env, tabId) {
    let g = nextGoalGoalGame(env);
    if (!g) return false;
    if (typeof env.deps.isTabSurfaceAvailable === "function") return !!env.deps.isTabSurfaceAvailable(tabId);
    let gateKey = typeof env.deps.TAB_UNLOCK_GATES !== "undefined" && env.deps.TAB_UNLOCK_GATES ? env.deps.TAB_UNLOCK_GATES[tabId] : null;
    if (!gateKey) return true;
    return !!(g.unlocks && g.unlocks[gateKey]);
  }
  function nextGoalBuildTabAction(env, goal, label, tabId, subtabId) {
    if (!nextGoalIsTabActionAvailable(env, tabId)) return goal;
    goal.actionLabel = label;
    goal.actionTabId = tabId;
    if (subtabId) goal.actionSubtabId = subtabId;
    return goal;
  }
  function nextGoalClampCount(value) {
    let num = Math.floor(Number(value) || 0);
    return num > 0 ? num : 0;
  }
  function nextGoalWithMapAct(target, zoneId) {
    if (target.actionTabId && Number.isInteger(zoneId)) target.actionMapAct = zoneId;
    return target;
  }
  function nextGoalBuildNotice(env, text, actionTabId, actionSubtabId) {
    let notice = { text };
    if (actionTabId && nextGoalIsTabActionAvailable(env, actionTabId)) notice.actionTabId = actionTabId;
    if (notice.actionTabId && actionSubtabId) notice.actionSubtabId = actionSubtabId;
    return notice;
  }

  // modules/ui/goal-progress.mjs
  function nextGoalHasEquippableInventoryItem(env, g) {
    if (!g || !Array.isArray(g.inventory) || !g.equipment || typeof g.equipment !== "object") return false;
    return g.inventory.some((item) => {
      if (!item) return false;
      let slots = [];
      if (typeof env.deps.getEquipCandidateSlots === "function") slots = env.deps.getEquipCandidateSlots(item) || [];
      else if (item.slot) slots = [item.slot];
      return slots.some((slot) => Object.prototype.hasOwnProperty.call(g.equipment, slot) && !g.equipment[slot]);
    });
  }
  function nextGoalHasAffordableGemUpgrade(env, g) {
    if (!g || !g.gemEnhanceUnlocked || Math.max(1, Math.floor(Number(g.season) || 1)) < 2) return false;
    if (typeof env.deps.SKILL_DB === "undefined" || !env.deps.SKILL_DB || !Array.isArray(g.skills)) return false;
    let currencies = g.currencies || {};
    return g.skills.some((name) => {
      if (!env.deps.SKILL_DB[name] || !env.deps.SKILL_DB[name].isGem) return false;
      let gem = g.gemData && g.gemData[name] || {};
      let level = Math.max(0, Math.floor(Number(gem.enhanceLevel) || 0));
      return level < env.deps.GEM_CORE_FORGE.maxLevel && nextGoalClampCount(currencies[env.deps.GEM_CORE_FORGE.materialKey]) >= env.deps.GEM_CORE_FORGE.costs[level];
    });
  }
  function nextGoalGetAstraProgress(g) {
    if (!g || Math.max(1, Math.floor(Number(g.season) || 1)) < 31) return null;
    const { atlas, underworld } = nextGoalCosmosRecords(g);
    if (!nextGoalAstraUnlocked(atlas, underworld)) return null;
    let required = ["planet-45", "planet-46", "planet-47", "planet-48", "planet-49"];
    let cleared = new Set(atlas && Array.isArray(atlas.bossClears) ? atlas.bossClears : []);
    let clearedCount = required.filter((id) => cleared.has(id)).length;
    let keyCount = nextGoalClampCount(g.currencies && g.currencies.cosmosSovereignKey);
    return {
      clearedCount,
      total: required.length,
      ready: clearedCount === required.length,
      keyCount,
      canChallenge: clearedCount === required.length && keyCount > 0
    };
  }
  function nextGoalGetCosmosJourney(g) {
    if (!g) return null;
    const journal = Array.isArray(g.journalEntries) ? g.journalEntries : [];
    if (!journal.includes("woodsman_echo")) return null;
    const { atlas, underworld } = nextGoalCosmosRecords(g);
    const highestFloor = Math.max(0, Math.floor(Number(underworld && underworld.highestFloor) || 0));
    if (highestFloor < 30) return { stage: "unlock", highestFloor };
    const bosses = new Set(atlas && Array.isArray(atlas.bossClears) ? atlas.bossClears : []);
    const bossIds = ["planet-46", "planet-47", "planet-48", "planet-49", "planet-45"];
    const nextGalaxy = bossIds.findIndex((id) => !bosses.has(id)) + 1;
    return { stage: nextGalaxy > 0 ? "atlas" : "complete", highestFloor, nextGalaxy };
  }
  function nextGoalGetPinnacleJourney(env, g) {
    if (!g || Math.max(1, Math.floor(Number(g.season) || 1)) < 31) return null;
    const ids = ["pinnacle_underking", "pinnacle_leviathan", "pinnacle_sky", "pinnacle_observer"];
    const zones = ids.map((id) => env.deps.SEASON_BOSS_ZONES.find((zone) => zone.id === id)).filter(Boolean);
    const cleared = new Set(Array.isArray(g.clearedRootBosses) ? g.clearedRootBosses : []);
    const next = zones.find((zone) => !cleared.has(zone.id));
    if (!next) return { complete: true };
    const guardians = (zones.find((zone) => zone.pinnacleCapstone) || {}).requiresPinnacles || [];
    const guardiansCleared = guardians.filter((id) => cleared.has(id)).length;
    return { complete: false, next, gate: env.deps.getSeasonBossProgressGate(next, g), guardiansCleared, guardianTotal: guardians.length };
  }
  function nextGoalCosmosRecords(g) {
    return {
      atlas: g.cosmosAtlas && typeof g.cosmosAtlas === "object" ? g.cosmosAtlas : null,
      underworld: g.underworldProgress && typeof g.underworldProgress === "object" ? g.underworldProgress : null
    };
  }
  function nextGoalAstraUnlocked(atlas, underworld) {
    return !!(atlas && atlas.unlocked) || Math.max(0, Math.floor(Number(underworld && underworld.highestFloor) || 0)) >= 30;
  }
  function nextGoalGetPinnacleJourneySubtab(journey, g) {
    if (!journey || !journey.next || journey.gate.met) return "map-explore-root-boss";
    if (journey.next.pinnacleTrack === "underworld") return "map-tab-underworld";
    if (journey.next.pinnacleTrack === "ocean") return "map-tab-ocean";
    if (journey.next.pinnacleTrack === "sky") return "map-tab-sky";
    const cleared = new Set(Array.isArray(g && g.clearedRootBosses) ? g.clearedRootBosses : []);
    return cleared.has("cosmos_astra") ? "map-explore-root-boss" : "map-tab-cosmos";
  }

  // modules/ui/goal-notice-rules.mjs
  var GOAL_NOTICE_RULES = [
    {
      id: "journal-unread-notice",
      matches(env, g, primary) {
        return primary !== "journal-unread" && !!(g.noti && g.noti.journal) && env.deps.contentProgression.canOpen("tab-journal", g);
      },
      build(env) {
        return nextGoalBuildNotice(env, env.deps._t("새 이야기 저널 확인"), "tab-journal");
      }
    },
    {
      id: "act-reward-notice",
      matches(env, g, primary) {
        return primary !== "claim-act-reward" && env.deps.getAvailableActRewardZoneIds(g).length > 0;
      },
      build(env, g) {
        return nextGoalWithMapAct(nextGoalBuildNotice(env, env.deps._t("액트 보상 {n}개 선택", { n: env.deps.getAvailableActRewardZoneIds(g).length }), "tab-map", "map-explore-atlas"), env.deps.getAvailableActRewardZoneIds(g)[0]);
      }
    },
    {
      id: "cosmos-journey-notice",
      matches(env, g, primary) {
        let journey = nextGoalGetCosmosJourney(g);
        let primaryId = String(primary || "");
        return !!journey && journey.stage !== "complete" && primaryId !== "cosmos-unlock-underworld" && !primaryId.startsWith("cosmos-galaxy-");
      },
      build(env, g) {
        let journey = nextGoalGetCosmosJourney(g);
        if (journey.stage === "unlock") {
          return nextGoalBuildNotice(env, env.deps._t("지하계 30층을 돌파하여 우주계 해금 (현재 {floor}층)", { floor: journey.highestFloor }), "tab-map", "map-tab-underworld");
        }
        return nextGoalBuildNotice(env, env.deps._t("G{n} 은하 보스 처치", { n: journey.nextGalaxy }), "tab-map", "map-tab-cosmos");
      }
    },
    {
      id: "cosmos-astra-progress",
      matches(env, g) {
        return !!(g.unlocks && g.unlocks.map) && !!nextGoalGetAstraProgress(g);
      },
      build(env, g) {
        let progress = nextGoalGetAstraProgress(g);
        if (progress.canChallenge) return nextGoalBuildNotice(env, env.deps._t("잔향체 아스트라 도전"), "tab-map", "map-explore-root-boss");
        if (progress.ready) return nextGoalBuildNotice(env, env.deps._t("아스트라 도전권(표식: 잔향) 획득"), "tab-map", "map-tab-cosmos");
        return nextGoalBuildNotice(env, env.deps._t("아스트라 조건, 은하 보스 {done}/{total} 처치", { done: progress.clearedCount, total: progress.total }), "tab-map", "map-tab-cosmos");
      }
    },
    {
      id: "atlas-pinnacle-progress",
      matches(env, g) {
        let journey = nextGoalGetPinnacleJourney(env, g);
        return !!(g.unlocks && g.unlocks.map) && !!journey && !journey.complete;
      },
      build(env, g) {
        let journey = nextGoalGetPinnacleJourney(env, g);
        let next = journey.next, text = journey.gate.met ? env.deps._t("{name} 도전", { name: env.deps._t(next.name) }) : `${env.deps._t(next.name)}, ${env.deps._t(journey.gate.label)}`;
        if (!next.pinnacleCapstone) text += ` ${env.deps._t("(수호자 격파 {done}/{total})", { done: journey.guardiansCleared, total: journey.guardianTotal })}`;
        return nextGoalBuildNotice(env, text, "tab-map", nextGoalGetPinnacleJourneySubtab(journey, g));
      }
    },
    {
      id: "passive-points",
      matches(env, g) {
        return nextGoalClampCount(g.passivePoints) > 0 && !!(g.unlocks && g.unlocks.char) && env.deps.contentProgression.canOpen("tab-char", g);
      },
      build(env, g) {
        return nextGoalBuildNotice(env, env.deps._t("스킬트리 포인트 {n} 사용", { n: nextGoalClampCount(g.passivePoints) }), "tab-char");
      }
    },
    {
      id: "equippable-equipment",
      matches(env, g) {
        return !!(g.unlocks && g.unlocks.items) && env.deps.contentProgression.canOpen("tab-items", g) && nextGoalHasEquippableInventoryItem(env, g);
      },
      build(env) {
        return nextGoalBuildNotice(env, env.deps._t("빈 장비 칸에 장비 장착"), "tab-items", "item-tab-equip");
      }
    },
    {
      id: "gem-upgrade",
      matches(env, g) {
        return !!(g.unlocks && g.unlocks.skills) && nextGoalHasAffordableGemUpgrade(env, g);
      },
      build(env) {
        return nextGoalBuildNotice(env, env.deps._t("룬 강화"), "tab-skills", "skill-tab-enhance");
      }
    },
    {
      id: "season-points",
      matches(env, g) {
        return nextGoalClampCount(g.seasonPoints) > 0 && !!(g.unlocks && g.unlocks.season) && (typeof env.deps.hasSpendableSeasonPoint !== "function" || env.deps.hasSpendableSeasonPoint());
      },
      build(env, g) {
        return nextGoalBuildNotice(env, env.deps._t("루프 포인트 {n} 사용", { n: nextGoalClampCount(g.seasonPoints) }), "tab-season");
      }
    },
    {
      id: "cosmos-alt-path",
      matches(env, g, primary) {
        if (primary !== null && !String(primary).startsWith("loop-chaos-")) return false;
        if (typeof env.deps.getAvailableLoopAdvancePaths !== "function") return false;
        return env.deps.getAvailableLoopAdvancePaths(Math.max(1, Math.floor(Number(g.season) || 1))).includes("cosmos");
      },
      build(env) {
        return nextGoalBuildNotice(env, env.deps._t("우주계 경로로도 루프 진행"), "tab-map", "map-tab-cosmos");
      }
    },
    {
      id: "inventory-near-full",
      matches(env, g) {
        if (typeof env.deps.getInventoryLimit !== "function" || !Array.isArray(g.inventory)) return false;
        let limit = Math.max(1, Math.floor(env.deps.getInventoryLimit(g)));
        return env.deps.getInventoryUsedCellCount(g) >= Math.floor(limit * env.INVENTORY_NOTICE_RATIO);
      },
      build(env, g) {
        let used = env.deps.getInventoryUsedCellCount(g);
        let limit = Math.floor(env.deps.getInventoryLimit(g));
        return nextGoalBuildNotice(env, env.deps._t("가방 {used}/{limit}칸, 자동 해체 설정", { used, limit }), "tab-items", "item-tab-equip");
      }
    }
  ];

  // modules/ui/goal-primary-rules.mjs
  var GOAL_RULES = [
    {
      // 첫 루프의 시작 무기가 가방에서 장착을 기다린다(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill)
      id: "first-weapon-equip",
      priority: 850,
      matches(env, g) {
        const id = g.starterWeaponTutorialPending;
        return id != null && (g.inventory || []).some((item) => item && item.id === id);
      },
      build(env, g) {
        const item = g.inventory.find((row) => row && row.id === g.starterWeaponTutorialPending);
        return nextGoalBuildTabAction(env, {
          id: "first-weapon-equip",
          type: "progression",
          categoryLabel: env.deps._t("첫 무기"),
          title: env.deps._t("{name} 장착", { name: env.deps._t(item.name) })
        }, env.deps._t("장비 열기"), "tab-items");
      }
    },
    {
      // 1순위: 진행을 막는 선택/수령 대기.
      id: "pending-choice",
      priority: 1e3,
      matches(env, g) {
        return !!(g.pendingLoopHeroSelection || g.pendingLoopDecision || g.pendingLoopReady);
      },
      build(env, g) {
        if (g.pendingLoopHeroSelection) {
          return {
            id: "pending-hero-select",
            type: "blocking",
            categoryLabel: env.deps._t("필수 선택"),
            title: env.deps._t("새 루프 직업 선택"),
            mandatory: true
          };
        }
        let goal = {
          id: "pending-loop-advance",
          type: "blocking",
          categoryLabel: env.deps._t("필수 선택"),
          title: env.deps._t("다음 루프 진행 선택"),
          description: env.deps._t("진행 또는 이번 루프 유지"),
          mandatory: true
        };
        return nextGoalBuildTabAction(env, goal, env.deps._t("루프 화면 열기"), "tab-season");
      }
    },
    {
      // 액트 클리어 보상 미수령.
      id: "claim-act-reward",
      priority: 900,
      matches(env, g) {
        return env.deps.getAvailableActRewardZoneIds(g).length > 0;
      },
      build(env, g) {
        let count = env.deps.getAvailableActRewardZoneIds(g).length;
        let goal = {
          id: "claim-act-reward",
          stage: `n${count}`,
          type: "claim",
          categoryLabel: env.deps._t("보상"),
          title: env.deps._t("액트 보상 선택"),
          description: env.deps._t("남은 보상 {count}개", { count }),
          mandatory: true
        };
        return nextGoalWithMapAct(nextGoalBuildTabAction(env, goal, env.deps._t("액트 보상 열기"), "tab-map", "map-explore-atlas"), env.deps.getAvailableActRewardZoneIds(g)[0]);
      }
    },
    {
      // 2순위: 스토리 액트 진행.
      id: "story-progress",
      priority: 700,
      matches(env, g) {
        if (typeof env.deps.LAST_STORY_ZONE_ID === "undefined") return false;
        if (nextGoalClampCount(g.loopCount) > 0 || Math.max(1, Math.floor(Number(g.season) || 1)) > 1) return false;
        return nextGoalClampCount(g.maxZoneId) <= env.deps.LAST_STORY_ZONE_ID;
      },
      build(env, g) {
        let frontier = Math.min(nextGoalClampCount(g.maxZoneId), env.deps.LAST_STORY_ZONE_ID);
        let zone = typeof env.deps.getZone === "function" ? env.deps.getZone(frontier) : null;
        if (!zone || !zone.name) return null;
        let act = typeof env.deps.getStoryActByZoneId === "function" ? env.deps.getStoryActByZoneId(frontier) : null;
        const title = nextGoalStoryTitle(env, act, zone);
        let onFrontier = nextGoalClampCount(g.currentZoneId) === frontier && Number(g.currentZoneId) === frontier;
        let goal = {
          id: `story-zone-${frontier}`,
          type: "progression",
          iconKind: "attack",
          categoryLabel: env.deps._t("이야기"),
          title,
          description: onFrontier ? "" : env.deps._t("지도에서 {zone} 선택", { zone: env.deps._t(zone.name) })
        };
        if (onFrontier) {
          goal.current = Math.max(0, Math.min(100, Math.floor(Number(g.runProgress) || 0)));
          goal.target = 100;
          goal.progressPct = goal.current;
          goal.progressText = "";
        }
        return nextGoalWithMapAct(nextGoalBuildTabAction(env, goal, env.deps._t("지도 열기"), "tab-map", "map-explore-atlas"), frontier);
      }
    },
    {
      id: "cosmos-endgame-path",
      priority: 650,
      matches(env, g) {
        const journey = nextGoalGetCosmosJourney(g);
        return !!journey && journey.stage !== "complete";
      },
      build(env, g) {
        const journey = nextGoalGetCosmosJourney(g);
        if (journey.stage === "unlock") {
          return nextGoalBuildTabAction(env, {
            id: "cosmos-unlock-underworld",
            type: "progression",
            categoryLabel: env.deps._t("지하계"),
            title: env.deps._t("지하계 30층을 돌파하여 우주계 해금"),
            current: journey.highestFloor,
            target: 30,
            progressText: env.deps._t("현재 최고 {floor}층", { floor: journey.highestFloor })
          }, env.deps._t("지하계 열기"), "tab-map", "map-tab-underworld");
        }
        return nextGoalBuildTabAction(env, {
          id: `cosmos-galaxy-${journey.nextGalaxy}`,
          type: "progression",
          categoryLabel: env.deps._t("우주계"),
          title: env.deps._t("G{n} 은하 보스 처치", { n: journey.nextGalaxy }),
          description: env.deps._t("별길 {n}개 안정화 후 도전", { n: env.deps.COSMOS_ROUTE_G1.requiredClears })
        }, env.deps._t("우주계 열기"), "tab-map", "map-tab-cosmos");
      }
    },
    {
      // 3순위: 현재 루프의 필수 돌파 목표(혼돈/혼돈 심화, 우주계 대체 경로 포함).
      id: "loop-requirement",
      // 우주계는 루프의 대체 진행 경로다. 아직 현재 루프 조건이 남아 있다면
      // 엔드게임 장기 목표보다 먼저 보여 플레이어가 당장 해야 할 일을 잃지 않게 한다.
      priority: 950,
      matches(env, g) {
        if (typeof env.deps.LAST_STORY_ZONE_ID === "undefined" || typeof env.deps.getSeasonAbyssDepthCap !== "function") return false;
        return nextGoalClampCount(g.maxZoneId) > env.deps.LAST_STORY_ZONE_ID;
      },
      build(env, g) {
        let season = Math.max(1, Math.floor(Number(g.season) || 1));
        let cap = Math.max(1, Math.floor(env.deps.getSeasonAbyssDepthCap(season)));
        let met = typeof env.deps.hasCurrentLoopAbyssRequirementClear === "function" && env.deps.hasCurrentLoopAbyssRequirementClear(season);
        if (met) {
          let goal2 = {
            id: "loop-requirement-met",
            stage: `season-${season}`,
            type: "progression",
            categoryLabel: env.deps._t("루프"),
            title: env.deps._t("다음 루프 진행"),
            mandatory: true
          };
          return nextGoalBuildTabAction(env, goal2, env.deps._t("루프 화면 열기"), "tab-season");
        }
        let progress = g.loopProgressCurrent && typeof g.loopProgressCurrent === "object" ? g.loopProgressCurrent : {};
        let best = Math.max(0, Math.min(cap, Math.floor(Number(progress.bestAbyssDepth) || 0)));
        let goal = {
          id: `loop-chaos-${cap}`,
          stage: `season-${season}`,
          type: "progression",
          categoryLabel: env.deps._t("루프 조건"),
          title: env.deps._t(cap > 20 ? "혼돈 심화 {n}층 돌파" : "혼돈 {n}층 돌파", { n: cap }),
          current: best,
          target: cap,
          progressText: env.deps._t("현재 최고 {floor}층", { floor: best })
        };
        return nextGoalBuildTabAction(env, goal, env.deps._t("혼돈 열기"), "tab-map", env.CHAOS_EXPLORE_SUBTAB);
      }
    },
    {
      // 6순위: 자유 성장 — 혼돈 심화 기록의 다음 이정표(5층 단위).
      id: "endless-chaos-record",
      priority: 200,
      matches(env, g) {
        void g;
        return typeof env.deps.getHighestUnlockedEndlessChaosDepth === "function" && env.deps.getHighestUnlockedEndlessChaosDepth() >= 21;
      },
      build(env, g) {
        void g;
        let best = Math.floor(env.deps.getHighestUnlockedEndlessChaosDepth());
        let target = (Math.floor(best / 5) + 1) * 5;
        let goal = {
          id: `endless-chaos-${target}`,
          type: "record",
          categoryLabel: env.deps._t("기록 갱신"),
          title: env.deps._t("혼돈 심화 {n}층 도달", { n: target }),
          current: best,
          target,
          progressText: env.deps._t("현재 최고 {floor}층", { floor: best })
        };
        return nextGoalBuildTabAction(env, goal, env.deps._t("혼돈 열기"), "tab-map", env.CHAOS_EXPLORE_SUBTAB);
      }
    },
    {
      // 다른 필수 진행 목표가 없을 때 새로 열린 세계 기록을 놓치지 않게 한다.
      id: "journal-unread",
      priority: 150,
      matches(env, g) {
        return !!(g.noti && g.noti.journal) && env.deps.contentProgression.canOpen("tab-journal", g);
      },
      build(env) {
        return nextGoalBuildTabAction(env, {
          id: "journal-unread",
          type: "discovery",
          categoryLabel: env.deps._t("저널"),
          title: env.deps._t("새 이야기 저널 확인")
        }, env.deps._t("이야기 저널 열기"), "tab-journal");
      }
    }
  ].sort((a, b) => b.priority - a.priority);
  function nextGoalStoryTitle(env, act, zone) {
    return act && act.bossName ? env.deps._t("{zone}의 보스 {boss} 처치", { zone: env.deps._t(zone.name), boss: env.deps._t(act.bossName) }) : env.deps._t("{zone} 돌파", { zone: env.deps._t(zone.name) });
  }

  // modules/ui/goal-selection.mjs
  function nextGoalComputeNextGoal(env) {
    let g = nextGoalGoalGame(env);
    if (!g) return null;
    for (let rule of env.GOAL_RULES) {
      let goal = null;
      try {
        if (rule.matches(env, g)) goal = rule.build(env, g);
      } catch (error) {
        env.deps.console.warn(`[goal-system] rule "${rule.id}" failed:`, error);
        goal = null;
      }
      if (goal && goal.id && goal.title) return goal;
    }
    return null;
  }
  function nextGoalBuildGoalNotices(env, primaryGoalId) {
    let g = nextGoalGoalGame(env);
    if (!g) return [];
    let notices = [];
    for (let rule of env.GOAL_NOTICE_RULES) {
      if (notices.length >= 4) break;
      try {
        if (rule.matches(env, g, primaryGoalId)) notices.push(rule.build(env, g));
      } catch (error) {
        env.deps.console.warn(`[goal-system] notice "${rule.id}" failed:`, error);
      }
    }
    return notices;
  }
  function nextGoalGetMajorUnlockGoal(env, g) {
    if (typeof env.deps.getNextMajorContentUnlock !== "function") return null;
    let unlock = env.deps.getNextMajorContentUnlock(g);
    if (!unlock || !unlock.id || !unlock.title) return null;
    if (unlock.actionTabId && !nextGoalIsTabActionAvailable(env, unlock.actionTabId)) {
      delete unlock.actionLabel;
      delete unlock.actionTabId;
      delete unlock.actionSubtabId;
    }
    return unlock;
  }
  function nextGoalBuildMajorUnlockFallback(env, unlock) {
    return {
      id: `major-unlock-${unlock.id}`,
      stage: `${unlock.completed || 0}-${unlock.total || 0}`,
      type: "progression",
      categoryLabel: env.deps._t("다음 주요 해금"),
      title: unlock.title,
      description: unlock.description || "",
      requirements: unlock.requirements || [],
      actionLabel: unlock.actionLabel,
      actionTabId: unlock.actionTabId,
      actionSubtabId: unlock.actionSubtabId,
      actionMapAct: unlock.actionMapAct
    };
  }

  // modules/ui/goal-refresh.mjs
  function nextGoalRunGoalSystemRefresh(env) {
    if (typeof env.deps.presentGoalDrawer !== "function") return;
    let g = nextGoalGoalGame(env);
    let goal = nextGoalComputeNextGoal(env);
    let nextUnlock = nextGoalGetMajorUnlockGoal(env, g);
    if (!goal && nextUnlock) goal = nextGoalBuildMajorUnlockFallback(env, nextUnlock);
    else if (goal && nextUnlock) goal.nextUnlock = nextUnlock;
    if (goal) goal.notices = nextGoalBuildGoalNotices(env, goal.id);
    env.deps.presentGoalDrawer(goal);
  }
  function nextGoalRequestGoalSystemRefresh(env) {
    if (env.goalRefreshTimer) return;
    env.goalRefreshTimer = env.deps.setTimeout(() => {
      env.goalRefreshTimer = null;
      nextGoalRunGoalSystemRefresh(env);
    }, env.GOAL_REFRESH_DEBOUNCE_MS);
  }

  // modules/ui/goal-system.mjs
  function createGoalSystem(deps) {
    const env = { deps };
    env.GOAL_REFRESH_DEBOUNCE_MS = 400;
    env.INVENTORY_NOTICE_RATIO = 0.9;
    env.goalRefreshTimer = null;
    env.CHAOS_EXPLORE_SUBTAB = "map-explore-chaos";
    env.GOAL_RULES = GOAL_RULES;
    env.GOAL_NOTICE_RULES = GOAL_NOTICE_RULES;
    return Object.freeze({
      requestGoalSystemRefresh: (...args) => nextGoalRequestGoalSystemRefresh(env, ...args),
      runGoalSystemRefresh: (...args) => nextGoalRunGoalSystemRefresh(env, ...args),
      dispose() {
        if (env.goalRefreshTimer) deps.clearTimeout(env.goalRefreshTimer);
        env.goalRefreshTimer = null;
      }
    });
  }

  // modules/goal-system-classic.mjs
  var rules = createGoalSystem({
    get game() {
      return typeof game === "undefined" ? void 0 : game;
    },
    get isTabSurfaceAvailable() {
      return typeof isTabSurfaceAvailable === "undefined" ? void 0 : isTabSurfaceAvailable;
    },
    get TAB_UNLOCK_GATES() {
      return typeof TAB_UNLOCK_GATES === "undefined" ? void 0 : TAB_UNLOCK_GATES;
    },
    get getEquipCandidateSlots() {
      return typeof getEquipCandidateSlots === "undefined" ? void 0 : getEquipCandidateSlots;
    },
    get SKILL_DB() {
      return typeof SKILL_DB === "undefined" ? void 0 : SKILL_DB;
    },
    get GEM_CORE_FORGE() {
      return GEM_CORE_FORGE;
    },
    get getSeasonBossProgressGate() {
      return getSeasonBossProgressGate;
    },
    get SEASON_BOSS_ZONES() {
      return SEASON_BOSS_ZONES;
    },
    get console() {
      return console;
    },
    get getNextMajorContentUnlock() {
      return typeof getNextMajorContentUnlock === "undefined" ? void 0 : getNextMajorContentUnlock;
    },
    get _t() {
      return _t;
    },
    get presentGoalDrawer() {
      return typeof presentGoalDrawer === "undefined" ? void 0 : presentGoalDrawer;
    },
    get setTimeout() {
      return setTimeout.bind(globalThis);
    },
    get clearTimeout() {
      return clearTimeout.bind(globalThis);
    },
    get getAvailableActRewardZoneIds() {
      return getAvailableActRewardZoneIds;
    },
    get LAST_STORY_ZONE_ID() {
      return typeof LAST_STORY_ZONE_ID === "undefined" ? void 0 : LAST_STORY_ZONE_ID;
    },
    get getZone() {
      return typeof getZone === "undefined" ? void 0 : getZone;
    },
    get getStoryActByZoneId() {
      return typeof getStoryActByZoneId === "undefined" ? void 0 : getStoryActByZoneId;
    },
    get COSMOS_ROUTE_G1() {
      return COSMOS_ROUTE_G1;
    },
    get getSeasonAbyssDepthCap() {
      return typeof getSeasonAbyssDepthCap === "undefined" ? void 0 : getSeasonAbyssDepthCap;
    },
    get hasCurrentLoopAbyssRequirementClear() {
      return typeof hasCurrentLoopAbyssRequirementClear === "undefined" ? void 0 : hasCurrentLoopAbyssRequirementClear;
    },
    get getHighestUnlockedEndlessChaosDepth() {
      return typeof getHighestUnlockedEndlessChaosDepth === "undefined" ? void 0 : getHighestUnlockedEndlessChaosDepth;
    },
    get contentProgression() {
      return contentProgression;
    },
    get hasSpendableSeasonPoint() {
      return typeof hasSpendableSeasonPoint === "undefined" ? void 0 : hasSpendableSeasonPoint;
    },
    get getAvailableLoopAdvancePaths() {
      return typeof getAvailableLoopAdvancePaths === "undefined" ? void 0 : getAvailableLoopAdvancePaths;
    },
    get getInventoryLimit() {
      return typeof getInventoryLimit === "undefined" ? void 0 : getInventoryLimit;
    },
    get getInventoryUsedCellCount() {
      return getInventoryUsedCellCount;
    }
  });
  var { requestGoalSystemRefresh, runGoalSystemRefresh } = rules;
  safeExposeGlobals({ requestGoalSystemRefresh, runGoalSystemRefresh });
})();
