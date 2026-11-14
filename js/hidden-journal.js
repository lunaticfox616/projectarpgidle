// GENERATED from modules/hidden-journal*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/hidden-journal-rules.mjs
  function hiddenIsHiddenJournalEndgameBoss(zone) {
    if (!zone) return false;
    return !!zone.milestonePinnacle || zone.type === "seasonBoss" || zone.type === "outsideChaos";
  }
  function hiddenIsHiddenJournalPinnacleBoss(zone) {
    return !!(zone && zone.milestonePinnacle);
  }
  function hiddenGetHiddenJournalActiveRun(enemy, owner) {
    let run = owner.hiddenJournalBossRun;
    if (!run || !enemy || run.enemyId !== enemy.id) return null;
    return run;
  }
  function hiddenStartHiddenJournalBossRun(enemy, zone, owner) {
    if (!enemy || !enemy.isBoss || !hiddenIsHiddenJournalEndgameBoss(zone)) return false;
    let active = hiddenGetHiddenJournalActiveRun(enemy, owner);
    if (active) return false;
    owner.hiddenJournalBossRun = {
      enemyId: enemy.id,
      zoneId: zone.id,
      hpDamageTaken: 0,
      ailments: []
    };
    return true;
  }
  function hiddenRestartHiddenJournalBossRun(enemy, zone, owner) {
    if (!enemy || !enemy.isBoss) return false;
    owner.hiddenJournalBossRun = null;
    return hiddenStartHiddenJournalBossRun(enemy, zone, owner);
  }
  function hiddenTrackHiddenJournalPlayerDamage(amount, owner) {
    let run = owner.hiddenJournalBossRun;
    let damage = Math.max(0, Math.floor(Number(amount) || 0));
    if (!run || damage <= 0) return;
    run.hpDamageTaken = Math.max(0, Math.floor(run.hpDamageTaken || 0)) + damage;
  }
  function hiddenTrackHiddenJournalAilment(env, type, enemy, owner) {
    let run = hiddenGetHiddenJournalActiveRun(enemy, owner);
    if (!run || !env.HIDDEN_JOURNAL_AILMENTS.has(type)) return;
    let ailments = new Set(Array.isArray(run.ailments) ? run.ailments : []);
    ailments.add(type);
    run.ailments = Array.from(ailments);
  }
  function hiddenAtLastBreath(owner, playerStats) {
    let hp = Math.max(0, Number(owner.playerHp) || 0);
    let maxHp = Math.max(1, Number(playerStats && playerStats.maxHp) || hp || 1);
    return hp > 0 && hp / maxHp <= 0.05;
  }
  function* hiddenUnlockHiddenJournalRunEntries(run, zone, playerStats, owner) {
    if (hiddenAtLastBreath(owner, playerStats)) yield { kind: "unlockHiddenEntry", args: ["hidden_last_breath"] };
    if (hiddenIsHiddenJournalPinnacleBoss(zone) && (run.hpDamageTaken || 0) <= 0) yield { kind: "unlockHiddenEntry", args: ["hidden_unscarred"] };
    if ((run.ailments || []).length >= 4) yield { kind: "unlockHiddenEntry", args: ["hidden_fourfold_affliction"] };
  }
  function* hiddenCompleteHiddenJournalBossRun(enemy, zone, playerStats, owner) {
    let run = hiddenGetHiddenJournalActiveRun(enemy, owner);
    if (!run || !hiddenIsHiddenJournalEndgameBoss(zone)) return false;
    yield* hiddenUnlockHiddenJournalRunEntries(run, zone, playerStats, owner);
    owner.hiddenJournalBossRun = null;
    return true;
  }
  function hiddenResetHiddenJournalBossRun(owner) {
    owner.hiddenJournalBossRun = null;
  }

  // modules/domain/hidden-journal.mjs
  function createHiddenJournal() {
    const env = {};
    env.HIDDEN_JOURNAL_AILMENTS = /* @__PURE__ */ new Set(["ignite", "chill", "freeze", "shock", "poison", "bleed"]);
    return Object.freeze({
      startHiddenJournalBossRun: hiddenStartHiddenJournalBossRun,
      restartHiddenJournalBossRun: hiddenRestartHiddenJournalBossRun,
      trackHiddenJournalPlayerDamage: hiddenTrackHiddenJournalPlayerDamage,
      trackHiddenJournalAilment: (...args) => hiddenTrackHiddenJournalAilment(env, ...args),
      completeHiddenJournalBossRun: hiddenCompleteHiddenJournalBossRun,
      resetHiddenJournalBossRun: hiddenResetHiddenJournalBossRun,
      HIDDEN_JOURNAL_AILMENTS: env.HIDDEN_JOURNAL_AILMENTS
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/hidden-journal-classic.mjs
  var rules = createHiddenJournal();
  var HIDDEN_JOURNAL_AILMENTS = rules.HIDDEN_JOURNAL_AILMENTS;
  var effects = { unlockHiddenEntry: (key) => unlockJournalEntry(key) };
  function startHiddenJournalBossRun(enemy, zone) {
    return rules.startHiddenJournalBossRun(enemy, zone, game);
  }
  function restartHiddenJournalBossRun(enemy, zone) {
    return rules.restartHiddenJournalBossRun(enemy, zone, game);
  }
  function trackHiddenJournalPlayerDamage(amount) {
    return rules.trackHiddenJournalPlayerDamage(amount, game);
  }
  function trackHiddenJournalAilment(type, enemy) {
    return rules.trackHiddenJournalAilment(type, enemy, game);
  }
  function completeHiddenJournalBossRun(enemy, zone, playerStats) {
    return consumeDomainCommands(rules.completeHiddenJournalBossRun(enemy, zone, playerStats, game), effects);
  }
  function resetHiddenJournalBossRun() {
    return rules.resetHiddenJournalBossRun(game);
  }
  safeExposeGlobals({
    startHiddenJournalBossRun,
    restartHiddenJournalBossRun,
    trackHiddenJournalPlayerDamage,
    trackHiddenJournalAilment,
    completeHiddenJournalBossRun,
    resetHiddenJournalBossRun,
    HIDDEN_JOURNAL_AILMENTS
  });
})();
