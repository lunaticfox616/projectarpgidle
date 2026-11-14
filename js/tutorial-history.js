// GENERATED from modules/tutorial-history*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/state/tutorial-history-rules.mjs
  function noticeRecordText(value, limit) {
    return typeof value === "string" ? value.slice(0, limit) : "";
  }
  function noticeRecordKeyOf(value) {
    return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$/.test(value) ? value : null;
  }
  function noticeRecordRouteOf(value) {
    return typeof value === "string" && /^(tab-|item-tab-|skill-tab-|map-tab-|map-explore-)[a-z0-9-]{1,70}$/.test(value) ? value : null;
  }
  function noticeRecordTimeOf(env, value) {
    return Number.isFinite(value) && value >= 0 ? Math.min(env.deps.tutorialNow(), Math.floor(value)) : 0;
  }
  function noticeRecordStatusOf(env, value) {
    return noticeRecordTimeOf(env, value.readAt) > 0 ? "read" : env.STATES.has(value.status) ? value.status : "unread";
  }
  function noticeRecordCanonicalKey(env, key) {
    return Object.hasOwn(env.deps.TUTORIAL_SEEN_ALIASES, key) ? env.deps.TUTORIAL_SEEN_ALIASES[key] : key;
  }
  function noticeRecordAliasesOf(env, key) {
    return [key, ...Object.keys(env.deps.TUTORIAL_SEEN_ALIASES).filter((alias) => env.deps.TUTORIAL_SEEN_ALIASES[alias] === key)];
  }
  function noticeRecordUpdatedAt(row) {
    return Math.max(row.queuedAt, row.displayedAt, row.readAt);
  }
  function noticeRecordPreferredRecord(prior, next) {
    if (prior && !!prior.readAt !== !!next.readAt) return prior.readAt ? prior : next;
    if (!prior || noticeRecordUpdatedAt(next) > noticeRecordUpdatedAt(prior)) return next;
    if (noticeRecordUpdatedAt(next) === noticeRecordUpdatedAt(prior) && next.status === "read") return next;
    return prior;
  }
  function noticeRecordSubtabOf(value) {
    const route = noticeRecordRouteOf(value.subtabId);
    if (!route) return null;
    const prefix = { "tab-items": "item-tab-", "tab-skills": "skill-tab-", "tab-map": "map-" }[value.tabId];
    return prefix && route.startsWith(prefix) ? route : null;
  }
  function noticeRecordRecordOf(env, value) {
    if (!value || typeof value !== "object" || !noticeRecordKeyOf(value.key)) return null;
    const title = noticeRecordText(value.title, 180), body = noticeRecordText(value.body, 5e3);
    if (!title || !body) return null;
    const key = noticeRecordCanonicalKey(env, value.key);
    const graft = env.deps.STUMP_BOX_GRAFT;
    const bodyParams = key === "unlock_stump_graft" ? {
      loop: graft.startLoop,
      points: graft.pointsPerLoop,
      maxRank: graft.maxRank,
      pct: graft.pctPerRank
    } : void 0;
    return {
      key,
      title,
      body,
      bodyParams,
      status: noticeRecordStatusOf(env, value),
      queuedAt: noticeRecordTimeOf(env, value.queuedAt),
      displayedAt: noticeRecordTimeOf(env, value.displayedAt),
      readAt: noticeRecordTimeOf(env, value.readAt),
      tabId: noticeRecordRouteOf(value.tabId),
      subtabId: noticeRecordSubtabOf(value),
      contentId: noticeRecordKeyOf(value.contentId),
      openLabel: noticeRecordText(value.openLabel, 100),
      atlasView: ["maps", "passives", "epoch", "late", "memory", "board"].includes(value.atlasView) ? value.atlasView : null,
      quote: value.quote && typeof value.quote === "object" ? { speaker: noticeRecordText(value.quote.speaker, 80), quote: noticeRecordText(value.quote.quote, 1e3) } : null
    };
  }
  function noticeRecordLegacySeen(env, state, key) {
    return noticeRecordAliasesOf(env, noticeRecordCanonicalKey(env, key)).some((alias) => state.seenTutorials.includes(alias));
  }
  function noticeRecordRetain(env, records) {
    if (records.length <= env.LIMIT) return records;
    const waiting = records.filter((row) => row.status === "pending" || row.status === "displayed");
    const archive = records.filter((row) => row.status !== "pending" && row.status !== "displayed");
    return [...archive.slice(-Math.max(0, env.LIMIT - waiting.length)), ...waiting].slice(-env.LIMIT);
  }
  function noticeRecordNormalize(env, state) {
    const rows = Array.isArray(state.tutorialHistory) ? state.tutorialHistory.slice(-env.LIMIT * 4) : [];
    const records = /* @__PURE__ */ new Map();
    for (const value of rows) {
      const row = noticeRecordRecordOf(env, value);
      if (!row) continue;
      records.set(row.key, noticeRecordPreferredRecord(records.get(row.key), row));
    }
    state.tutorialHistory = noticeRecordRetain(env, [...records.values()]);
    const starter = state.tutorialHistory.find((row) => row.key === "tutorial_starter_gem_equip");
    if (starter && starter.status !== "pending" && !noticeRecordLegacySeen(env, state, starter.key)) state.seenTutorials.push(starter.key);
    return state.tutorialHistory;
  }
  function noticeRecordBindQueue(env, state) {
    if (env.owner === state) return;
    env.owner = state;
    env.deps.tutorialQueue.length = 0;
    env.deps.tutorialQueue.push(...state.tutorialHistory.filter((row) => row.status === "pending" || row.status === "displayed"));
    env.revision++;
  }
  function noticeRecordSync(env, state) {
    noticeRecordBindQueue(env, state);
    for (const row of state.tutorialHistory) {
      if (noticeRecordConsumedStory(env, state, row)) {
        row.status = "read";
        env.revision++;
      }
    }
    const retained = new Set(state.tutorialHistory.map((row) => row.key));
    for (let i = env.deps.tutorialQueue.length - 1; i >= 0; i--) {
      const row = env.deps.tutorialQueue[i];
      if (!retained.has(row.key) || row.status === "read" || row.status === "unread") env.deps.tutorialQueue.splice(i, 1);
    }
  }
  function noticeRecordConsumedStory(env, state, row) {
    const replaced = row.key.startsWith("story_") || row.key === "tutorial_battle_basics";
    return replaced && row.status === "pending" && noticeRecordLegacySeen(env, state, row.key);
  }
  function noticeRecordEnqueue(env, state, notice) {
    noticeRecordSync(env, state);
    if (state.tutorialHistory.some((row2) => row2.key === noticeRecordCanonicalKey(env, notice.key)) || noticeRecordLegacySeen(env, state, notice.key)) return;
    const row = noticeRecordRecordOf(env, { ...notice, status: "pending", queuedAt: env.deps.tutorialNow() });
    if (!row) return;
    state.tutorialHistory.push(row);
    state.tutorialHistory = noticeRecordRetain(env, state.tutorialHistory);
    env.deps.tutorialQueue.push(row);
    noticeRecordSync(env, state);
    env.revision++;
  }
  function noticeRecordTransition(env, state, key, status) {
    const row = state.tutorialHistory.find((record) => record.key === noticeRecordCanonicalKey(env, key));
    if (!row || !env.STATES.has(status) || row.status === status) return;
    row.status = status;
    if (status === "displayed") row.displayedAt = env.deps.tutorialNow();
    if (status === "read") row.readAt = env.deps.tutorialNow();
    if (status !== "pending") {
      for (const alias of noticeRecordAliasesOf(env, row.key)) if (!state.seenTutorials.includes(alias)) state.seenTutorials.push(alias);
    }
    env.revision++;
  }
  function noticeRecordArchivePending(env, state, key) {
    const row = state.tutorialHistory.find((record) => record.key === noticeRecordCanonicalKey(env, key));
    if (row?.status !== "pending") return;
    noticeRecordTransition(env, state, key, "unread");
    noticeRecordSync(env, state);
  }

  // modules/state/tutorial-history.mjs
  function createTutorialHistory(deps) {
    const env = { deps };
    env.LIMIT = 320;
    env.STATES = /* @__PURE__ */ new Set(["pending", "displayed", "unread", "read"]);
    env.owner = null;
    env.revision = 0;
    return {
      normalize: (...args) => noticeRecordNormalize(env, ...args),
      sync: (...args) => noticeRecordSync(env, ...args),
      enqueue: (...args) => noticeRecordEnqueue(env, ...args),
      transition: (...args) => noticeRecordTransition(env, ...args),
      archivePending: (...args) => noticeRecordArchivePending(env, ...args),
      get revision() {
        return env.revision;
      },
      reset() {
        env.owner = null;
      }
    };
  }

  // modules/tutorial-history-classic.mjs
  var rules = createTutorialHistory({
    get STUMP_BOX_GRAFT() {
      return STUMP_BOX_GRAFT;
    },
    get tutorialNow() {
      return Date.now;
    },
    get TUTORIAL_SEEN_ALIASES() {
      return TUTORIAL_SEEN_ALIASES;
    },
    get tutorialQueue() {
      return tutorialQueue;
    }
  });
  window.GameModules.state.tutorials = rules;
})();
