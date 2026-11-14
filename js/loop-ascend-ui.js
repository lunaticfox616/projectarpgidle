// GENERATED from modules/loop-ascend-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowMatchMedia = (...args) => globalThis.matchMedia(...args);

  // modules/domain/season-investments.mjs
  function createSeasonInvestments(defs) {
    const level = (owner, id) => seasonInvestmentLevel(owner, id);
    const evolved = (owner) => {
      const ids = Object.keys(defs.nodes || {});
      return ids.length > 0 && ids.every((id) => level(owner, id) >= 1);
    };
    const required = (owner, node) => {
      if (node?.inner && !evolved(owner)) return false;
      return !node?.req || seasonPrerequisiteMet(owner.seasonNodes, node.req);
    };
    const cap = (owner, node) => node?.inner ? 1 : evolved(owner) ? 5 : 1;
    const canInvest = (owner, node, id) => defs.unlocked(owner) && !!node && (owner.season || 1) >= defs.unlockLoop(id) && required(owner, node);
    const rules = { level, evolved, required, cap, canInvest };
    return Object.freeze({
      ...rules,
      buy: (owner, id) => purchaseSeasonInvestment(defs, rules, owner, id),
      refund: (owner, id) => refundSeasonInvestment(defs, owner, id),
      spendable: (owner) => seasonInvestmentSpendable(defs, rules, owner),
      reset: (owner) => resetSeasonInvestments(owner),
      resetCost: (owner) => {
        owner.seasonNodes = Array.isArray(owner.seasonNodes) ? owner.seasonNodes : [];
        return owner.seasonNodes.length;
      }
    });
  }
  function seasonPrerequisiteMet(owned, req) {
    return Array.isArray(req) ? req.some((id) => owned.includes(id)) : owned.includes(req);
  }
  function investmentRequiresRemovedNode(owned, req, id) {
    if (!req) return false;
    return Array.isArray(req) ? req.includes(id) && req.filter((key) => key !== id).every((key) => !owned.includes(key)) : req === id;
  }
  function seasonInvestmentLevel(owner, id) {
    owner.seasonNodeLevels = owner.seasonNodeLevels && typeof owner.seasonNodeLevels === "object" ? owner.seasonNodeLevels : {};
    return owner.seasonNodes.includes(id) ? Math.max(1, Math.floor(owner.seasonNodeLevels[id] || 1)) : 0;
  }
  function purchaseSeasonInvestment(defs, rules, owner, id) {
    const node = defs.node(id);
    owner.seasonNodeLevels = owner.seasonNodeLevels && typeof owner.seasonNodeLevels === "object" ? owner.seasonNodeLevels : {};
    if (!rules.canInvest(owner, node, id)) return "unavailable";
    const level = rules.level(owner, id);
    if (level >= rules.cap(owner, node) && level > 0) return "maximum";
    if (owner.seasonPoints <= 0) return "no-points";
    if (level <= 0) owner.seasonNodes.push(id);
    owner.seasonNodeLevels[id] = level + 1;
    owner.seasonPoints--;
    return "changed";
  }
  function refundSeasonInvestment(defs, owner, id) {
    owner.seasonNodes = Array.isArray(owner.seasonNodes) ? owner.seasonNodes : [];
    if (!owner.seasonNodes.includes(id)) return "unavailable";
    const issue = seasonRefundDependency(defs, owner, id);
    if (issue) return issue;
    if ((owner.currencies.blightSpore || 0) < 1) return "no-spores";
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - 1);
    const level = seasonInvestmentLevel(owner, id);
    owner.seasonNodes = owner.seasonNodes.filter((key) => key !== id);
    delete owner.seasonNodeLevels[id];
    owner.seasonPoints = Math.max(0, Math.floor(owner.seasonPoints || 0)) + level;
    return "changed";
  }
  function seasonRefundDependency(defs, owner, id) {
    const node = defs.node(id);
    const innerOwned = Object.keys(defs.innerNodes || {}).some((key) => owner.seasonNodes.includes(key));
    if (node && !node.inner && innerOwned) return "inner-owned";
    const blocked = defs.ids().some((key) => key !== id && owner.seasonNodes.includes(key) && investmentRequiresRemovedNode(owner.seasonNodes, (defs.node(key) || {}).req, id));
    return blocked ? "dependent" : null;
  }
  function seasonInvestmentSpendable(defs, rules, owner) {
    const points = Math.max(0, Math.floor(owner.seasonPoints || 0));
    if (points <= 0) return false;
    if ((owner.season || 1) >= 10 && ["flatHp", "flatDmg", "aspd", "move"].some((key) => defs.loop10Cost(owner, key) <= points)) return true;
    return defs.ids().some((id) => {
      const node = defs.node(id);
      return rules.canInvest(owner, node, id) && rules.level(owner, id) < rules.cap(owner, node);
    });
  }
  function resetSeasonInvestments(owner) {
    owner.seasonNodes = Array.isArray(owner.seasonNodes) ? owner.seasonNodes : [];
    if (!owner.seasonNodes.length) return { status: "empty" };
    const cost = owner.seasonNodes.length;
    if ((owner.currencies.blightSpore || 0) < cost) return { status: "no-spores", cost };
    const total = owner.seasonNodes.reduce((sum, id) => sum + seasonInvestmentLevel(owner, id), 0);
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - cost);
    owner.seasonPoints = Math.max(0, Math.floor(owner.seasonPoints || 0)) + total;
    owner.seasonNodes = [];
    owner.seasonNodeLevels = {};
    return { status: "changed", cost };
  }

  // modules/domain/ascend-investments.mjs
  function createAscendInvestments(defs) {
    return Object.freeze({
      required: (owner, node) => !node?.req || seasonPrerequisiteMet(owner.ascendNodes, node.req),
      keystoneRequired: ascendInvestmentKeystoneRequired,
      buy: (owner, id) => purchaseAscendInvestment(defs, owner, id),
      refund: (owner, id) => refundAscendInvestment(defs, owner, id),
      buyKeystone: (owner, id) => purchaseAscendKeystone(defs, owner, id),
      keystoneRefundIssue: (owner, id) => ascendKeystoneRefundIssue(defs, owner, id),
      refundKeystone: (owner, id) => refundAscendInvestmentKeystone(defs, owner, id),
      moveDualEquipment: (owner, enable) => moveAscendDualEquipment(defs, owner, enable),
      resetCost: (owner, keystones) => ascendResetList(owner, keystones).length,
      reset: (owner, keystones) => resetAscendInvestments(defs, owner, keystones),
      normalize: (owner) => {
        ascendResetList(owner, false);
        ascendResetList(owner, true);
      },
      select: (owner, id, forPlan = false) => selectInvestmentClass(defs, owner, id, forPlan),
      lastPlan: (owner) => {
        const plan = owner.lastLoopAscendPlan;
        return plan && defs.classes[plan.ascendClass] && defs.isClass(plan.ascendClass, owner.selectedClassId) ? plan : null;
      }
    });
  }
  function ascendInvestmentKeystoneRequired(owner, node) {
    if (!node) return false;
    owner.ascendKeystones = Array.isArray(owner.ascendKeystones) ? owner.ascendKeystones : [];
    if (node.fifthJobOnly) return !!owner.ascendClass && owner.bloomedClassThisLoop === owner.ascendClass;
    if (node.req) return owner.ascendKeystones.includes(node.req);
    if (Array.isArray(node.reqAny) && node.reqAny.length) return node.reqAny.some((id) => owner.ascendKeystones.includes(id));
    return true;
  }
  function purchaseAscendInvestment(defs, owner, id) {
    if (!owner.ascendClass) return "unavailable";
    const node = defs.tree(owner.ascendClass, owner)[id];
    if (node?.exclusive && owner.ascendNodes.includes(node.exclusive)) return "exclusive";
    if (!node || owner.ascendPoints <= 0 || owner.ascendNodes.includes(id)) return "unavailable";
    if (node.req && !seasonPrerequisiteMet(owner.ascendNodes, node.req)) return "unavailable";
    owner.ascendNodes.push(id);
    owner.ascendPoints--;
    return "changed";
  }
  function refundAscendInvestment(defs, owner, id) {
    if (!owner.ascendClass) return "unavailable";
    owner.ascendNodes = Array.isArray(owner.ascendNodes) ? owner.ascendNodes : [];
    if (!owner.ascendNodes.includes(id)) return "unavailable";
    const tree = defs.tree(owner.ascendClass, owner);
    const blocked = Object.keys(tree).some((key) => key !== id && owner.ascendNodes.includes(key) && (investmentRequiresRemovedNode(owner.ascendNodes, tree[key].req, id) || investmentRequiresRemovedNode(owner.ascendNodes, tree[key].reqAny, id)));
    if (blocked) return "dependent";
    if ((owner.currencies.blightSpore || 0) < 1) return "no-spores";
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - 1);
    owner.ascendNodes = owner.ascendNodes.filter((key) => key !== id);
    owner.ascendPoints = Math.max(0, Math.floor(owner.ascendPoints || 0)) + 1;
    return "changed";
  }
  function purchaseAscendKeystone(defs, owner, id) {
    if (!owner.ascendClass) return { status: "unavailable" };
    const node = defs.keystones(owner.ascendClass).find((row) => row.id === id);
    if (!node) return { status: "unavailable" };
    ascendResetList(owner, true);
    if (owner.ascendKeystones.includes(id)) return { status: "unavailable" };
    owner.ascendKeystonePoints = Math.max(0, Math.floor(owner.ascendKeystonePoints || 0));
    if (owner.ascendKeystonePoints <= 0) return { status: "no-points" };
    if (owner.ascendKeystones.length >= defs.pickLimit) return { status: "pick-limit" };
    if (!ascendInvestmentKeystoneRequired(owner, node)) return { status: "prerequisite" };
    const equipment = id === "w3" ? moveAscendDualEquipment(defs, owner, true) : "unchanged";
    if (equipment === "full") return { status: "full", enable: true };
    owner.ascendKeystones.push(id);
    owner.ascendKeystonePoints--;
    return { status: "changed", equipment, enable: true };
  }
  function ascendKeystoneRefundIssue(defs, owner, id) {
    ascendResetList(owner, true);
    if (!owner.ascendKeystones.includes(id)) return { status: "unavailable" };
    const blockers = defs.keystones(owner.ascendClass).filter((node) => {
      if (!owner.ascendKeystones.includes(node.id) || node.id === id) return false;
      if (node.req && node.req === id) return true;
      return Array.isArray(node.reqAny) && investmentRequiresRemovedNode(owner.ascendKeystones, node.reqAny, id);
    });
    if (blockers.length) return { status: "dependent", blockers };
    if ((owner.currencies.blightSpore || 0) < 1) return { status: "no-spores" };
    return { status: "ready" };
  }
  function refundAscendInvestmentKeystone(defs, owner, id) {
    const issue = ascendKeystoneRefundIssue(defs, owner, id);
    if (issue.status !== "ready") return issue;
    const equipment = id === "w3" ? moveAscendDualEquipment(defs, owner, false) : "unchanged";
    if (equipment === "full") return { status: "full", enable: false };
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - 1);
    owner.ascendKeystones = owner.ascendKeystones.filter((key) => key !== id);
    owner.ascendKeystonePoints = Math.max(0, Math.floor(owner.ascendKeystonePoints || 0)) + 1;
    return { status: "changed", equipment, enable: false, removed: [id] };
  }
  function moveAscendDualEquipment(defs, owner, enable) {
    if (owner.ascendClass !== "warrior") return "unchanged";
    owner.equipment = owner.equipment || {};
    owner.inventory = Array.isArray(owner.inventory) ? owner.inventory : [];
    const item = owner.equipment["방패"];
    if (!item || item.slot !== (enable ? "방패" : "무기")) return "unchanged";
    if (!defs.canStore([item], owner)) return "full";
    owner.inventory.push(item);
    owner.equipment["방패"] = null;
    return "moved";
  }
  function ascendResetList(owner, keystones) {
    const key = keystones ? "ascendKeystones" : "ascendNodes";
    owner[key] = Array.isArray(owner[key]) ? owner[key] : [];
    return owner[key];
  }
  function resetAscendInvestments(defs, owner, keystones) {
    const list = ascendResetList(owner, keystones), cost = list.length;
    if (!cost) return { status: "empty" };
    if ((owner.currencies.blightSpore || 0) < cost) return { status: "no-spores", cost };
    const equipment = ascendResetEquipment(defs, owner, keystones, list);
    if (equipment === "full") return { status: "full", enable: false };
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - cost);
    const points = keystones ? "ascendKeystonePoints" : "ascendPoints";
    owner[points] = Math.max(0, Math.floor(owner[points] || 0)) + cost;
    owner[keystones ? "ascendKeystones" : "ascendNodes"] = [];
    return { status: "changed", cost, equipment, enable: false, removed: list.slice() };
  }
  function ascendResetEquipment(defs, owner, keystones, list) {
    return keystones && list.includes("w3") ? moveAscendDualEquipment(defs, owner, false) : "unchanged";
  }
  function selectInvestmentClass(defs, owner, id, forPlan) {
    if (!defs.isClass(id, owner.selectedClassId)) return null;
    const previous = Array.isArray(owner.ascendKeystones) ? owner.ascendKeystones.slice() : [];
    owner.ascendClass = id;
    owner.ascendKeystones = [];
    if (forPlan) ascendResetList(owner, false);
    return previous;
  }

  // modules/domain/passive-node-refund.mjs
  function createPassiveNodeRefund(defs) {
    const canRefund = (owner, id) => canRefundAllocatedPassive(defs, owner, id);
    return Object.freeze({ canRefund, refund: (owner, id) => refundAllocatedPassive(defs, canRefund, owner, id) });
  }
  function canRefundAllocatedPassive(defs, owner, id) {
    const node = defs.tree.nodes[id];
    if (id === defs.root(owner) || node?.kind === "start" || !owner.passives.includes(id)) return false;
    const remaining = { ...owner, passives: owner.passives.filter((key) => key !== id) };
    const connected = defs.routing.connected(remaining, defs.tree, defs.route(remaining));
    return connected.length === remaining.passives.length && defs.routing.pointBudget(owner) + defs.routing.paleBonus(remaining) >= remaining.passives.length;
  }
  function refundAllocatedPassive(defs, canRefund, owner, id) {
    owner.passives = Array.isArray(owner.passives) ? owner.passives : [];
    const node = defs.tree.nodes[id];
    if (!owner.passives.includes(id) || node?.kind === "start") return { status: "unavailable" };
    if ((owner.currencies.blightSpore || 0) < 1) return { status: "no-spores" };
    if (!canRefund(owner, id)) return { status: "dependent" };
    const budget = defs.routing.pointBudget(owner);
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - 1);
    owner.passives = owner.passives.filter((key) => key !== id);
    owner.passivePoints = Math.max(0, Math.floor(owner.passivePoints || 0)) + 1;
    defs.routing.settlePoints(owner, budget);
    return { status: "changed", node, budget };
  }

  // modules/ui/loop-investment-session.mjs
  function captureInvestmentSession(runtime) {
    const owner = runtime.deps.game;
    return {
      owner,
      season: owner.season,
      loop: owner.loopCount,
      selectedClass: owner.selectedClassId,
      ascendClass: owner.ascendClass
    };
  }
  function investmentSessionIsCurrent(runtime, session) {
    const owner = runtime.deps.game;
    return runtime.active && session.owner === owner && session.season === owner.season && session.loop === owner.loopCount && session.selectedClass === owner.selectedClassId && session.ascendClass === owner.ascendClass;
  }
  function investmentMayEdit(runtime) {
    return runtime.active && (0, runtime.deps.assertBuildEditable)();
  }
  function syncInvestmentSelection(runtime) {
    if (runtime.selectionSession && investmentSessionIsCurrent(runtime, runtime.selectionSession)) return;
    runtime.selectionSession = captureInvestmentSession(runtime);
    runtime.shown = null;
    runtime.pressed = null;
  }
  function investmentLog(runtime, text, kind = "attack-monster", params) {
    (0, runtime.deps.addLog)((0, runtime.deps._t)(text, params), kind);
  }

  // modules/ui/loop-investment-actions.mjs
  async function buySeason(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime);
    const result = runtime.deps.season.buy(session.owner, id);
    if (result === "changed") return (0, runtime.deps.updateStaticUI)();
    if (result !== "maximum") return;
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)("이미 최대 단계인 노드입니다.\n마름병 포자 1개를 사용해 반환하시겠습니까?"), {
      title: (0, runtime.deps._t)("최대 단계 노드 반환"),
      tone: "danger",
      confirmLabel: (0, runtime.deps._t)("노드 반환")
    });
    if (yes && investmentSessionIsCurrent(runtime, session)) return refundSeasonNode(runtime, id);
  }
  function refundSeasonNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const status = runtime.deps.season.refund(runtime.deps.game, id);
    const messages = {
      "inner-owned": "내부 마법진 패시브를 먼저 반환해야 우로보로스 몸통을 해제할 수 있습니다.",
      dependent: "선행 조건으로 연결된 루프 패시브가 있어 반환할 수 없습니다.",
      "no-spores": "루프 패시브 반환에는 마름병 포자 1개가 필요합니다."
    };
    if (messages[status]) return investmentLog(runtime, messages[status]);
    if (status === "changed") (0, runtime.deps.updateStaticUI)();
  }
  function buyAscend(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const status = runtime.deps.ascend.buy(runtime.deps.game, id);
    if (status === "exclusive") return investmentLog(runtime, "같은 계열의 노드는 둘 중 하나만 할당할 수 있습니다.");
    if (status !== "changed") return;
    (0, runtime.deps.normalizeSupportLoadout)(true);
    (0, runtime.deps.updateStaticUI)();
  }
  function refundAscendNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const status = runtime.deps.ascend.refund(runtime.deps.game, id);
    if (status === "dependent") return investmentLog(runtime, "이 노드를 선행으로 둔 전직 노드가 있어 반환할 수 없습니다.");
    if (status === "no-spores") return investmentLog(runtime, "전직 노드 반환에는 마름병 포자 1개가 필요합니다.");
    if (status !== "changed") return;
    (0, runtime.deps.normalizeSupportLoadout)(true);
    (0, runtime.deps.updateStaticUI)();
  }
  async function askRefundSeasonNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime);
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)("선택한 루프 패시브를 반환하고 마름병 포자 1개를 소모합니다."), {
      title: (0, runtime.deps._t)("루프 패시브 반환"),
      tone: "danger",
      confirmLabel: (0, runtime.deps._t)("노드 반환")
    });
    if (yes && investmentSessionIsCurrent(runtime, session)) return refundSeasonNode(runtime, id);
  }
  async function askRefundAscendNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime);
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)("할당한 전직 노드를 반환하고 마름병 포자 1개를 소모합니다."), {
      title: (0, runtime.deps._t)("전직 노드 반환"),
      tone: "danger",
      confirmLabel: (0, runtime.deps._t)("노드 반환")
    });
    if (yes && investmentSessionIsCurrent(runtime, session)) return refundAscendNode(runtime, id);
  }
  function refundPassiveNode(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const hadOverflow = (0, runtime.deps.hasAuthoredPassiveKeystone)("의지의 공명");
    const result = runtime.deps.passive.refund(runtime.deps.game, id);
    if (result.status === "no-spores") return investmentLog(runtime, "패시브 노드 반환에는 마름병 포자 1개가 필요합니다.");
    if (result.status === "dependent") return investmentLog(runtime, "연결 유지에 필요한 노드는 반환할 수 없습니다.");
    if (result.status !== "changed") return;
    (0, runtime.deps.calculateReachableNodes)();
    (0, runtime.deps.normalizeSupportLoadout)(true, null, hadOverflow);
    investmentLog(runtime, "패시브 노드 반환: {node} (마름병 포자 1개 소모)", "season-up", {
      node: (0, runtime.deps.escapeHTML)(runtime.deps.passiveNodePresentation.getPassiveNodeDisplayName(result.node))
    });
    (0, runtime.deps.updateStaticUI)();
  }

  // modules/ui/ascend-keystone-actions.mjs
  function reportDualEquipmentChange(runtime, result, enable) {
    if (result === "full") {
      investmentLog(runtime, enable ? "쌍수 훈련 활성화를 위해 완갑을 해제해야 하지만 인벤토리가 가득 찼습니다." : "쌍수 훈련 해제를 위해 보조 슬롯 무기를 해제해야 하지만 인벤토리가 가득 찼습니다.");
      return false;
    }
    if (result === "moved") investmentLog(runtime, enable ? "🛡️ 쌍수 훈련 활성화: 기존 완갑을 인벤토리로 이동했습니다." : "🧰 쌍수 훈련 해제: 보조 슬롯 무기를 인벤토리로 이동했습니다.", "loot-normal");
    return true;
  }
  function enforceWarriorDualTrainingEquipment(runtime, enable) {
    return reportDualEquipmentChange(runtime, runtime.deps.ascend.moveDualEquipment(runtime.deps.game, enable), enable);
  }
  function buyAscendKeystone(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const result = runtime.deps.ascend.buyKeystone(runtime.deps.game, id);
    if (result.status === "no-points") return investmentLog(runtime, "키스톤 포인트가 부족합니다.");
    if (result.status === "pick-limit") return investmentLog(runtime, "키스톤은 최대 {CLASS_KEYSTONE_PICK_LIMIT}개 할당할 수 있습니다.", "attack-monster", {
      CLASS_KEYSTONE_PICK_LIMIT: runtime.deps.CLASS_KEYSTONE_PICK_LIMIT
    });
    if (result.status === "prerequisite") return investmentLog(runtime, "선행 키스톤이 필요합니다.");
    if (result.status === "full") return reportDualEquipmentChange(runtime, "full", true);
    if (result.status !== "changed") return;
    reportDualEquipmentChange(runtime, result.equipment, true);
    (0, runtime.deps.updateStaticUI)();
  }
  function reportKeystoneRefundIssue(runtime, result, confirmed) {
    if (result.status === "unavailable") {
      if (confirmed) investmentLog(runtime, "확인 중 키스톤 상태가 변경되어 반환을 취소했습니다.");
    } else if (result.status === "dependent") {
      investmentLog(runtime, confirmed ? "확인 중 선행 상태가 변경되었습니다: {names}" : "이 키스톤을 선행으로 둔 키스톤이 있어 반환할 수 없습니다: {names}", "attack-monster", {
        names: result.blockers.map((node) => (0, runtime.deps._t)(node.name)).join(", ")
      });
    } else if (result.status === "no-spores") {
      investmentLog(runtime, confirmed ? "확인 중 마름병 포자가 부족해져 반환을 취소했습니다." : "키스톤 반환에는 마름병 포자 1개가 필요합니다.");
    } else if (result.status === "full") reportDualEquipmentChange(runtime, "full", false);
  }
  async function refundAscendKeystone(runtime, id) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime);
    const issue = runtime.deps.ascend.keystoneRefundIssue(session.owner, id);
    if (issue.status !== "ready") return reportKeystoneRefundIssue(runtime, issue, false);
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)("할당한 키스톤을 반환하고 마름병 포자 1개를 소모합니다."), {
      title: (0, runtime.deps._t)("키스톤 반환"),
      tone: "danger",
      confirmLabel: (0, runtime.deps._t)("키스톤 반환")
    });
    if (!yes || !investmentSessionIsCurrent(runtime, session) || !investmentMayEdit(runtime)) return;
    const result = runtime.deps.ascend.refundKeystone(session.owner, id);
    if (result.status !== "changed") return reportKeystoneRefundIssue(runtime, result, true);
    reportDualEquipmentChange(runtime, result.equipment, false);
    if (typeof runtime.deps.clearAscendKeystoneRuntimeState === "function") (0, runtime.deps.clearAscendKeystoneRuntimeState)(result.removed);
    (0, runtime.deps.updateStaticUI)();
  }

  // modules/ui/loop-investment-reset.mjs
  var resetMessages = Object.freeze({
    season: {
      title: "루프 패시브 전체 초기화",
      shortage: "루프 패시브 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.",
      prompt: "루프 패시브를 모두 초기화하고 마름병 포자 {cost}개를 소모합니다.",
      empty: "확인 중 루프 패시브 상태가 변경되어 초기화를 취소했습니다."
    },
    ascend: {
      title: "전직 노드 전체 초기화",
      shortage: "전직 노드 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.",
      prompt: "전직 노드를 모두 초기화하고 마름병 포자 {cost}개를 소모합니다.",
      empty: "확인 중 전직 노드 상태가 변경되어 초기화를 취소했습니다."
    },
    keystones: {
      title: "키스톤 전체 초기화",
      shortage: "키스톤 전체 초기화에는 마름병 포자 {cost}개가 필요합니다.",
      prompt: "할당한 키스톤을 모두 반환하고 마름병 포자 {cost}개를 소모합니다.",
      empty: "확인 중 키스톤 상태가 변경되어 초기화를 취소했습니다."
    }
  });
  async function resetInvestmentGroup(runtime, kind) {
    if (!investmentMayEdit(runtime)) return;
    const session = captureInvestmentSession(runtime), messages = resetMessages[kind];
    const rules = kind === "season" ? runtime.deps.season : runtime.deps.ascend;
    const keystones = kind === "keystones", cost = rules.resetCost(session.owner, keystones);
    if (!cost) return;
    if ((session.owner.currencies.blightSpore || 0) < cost) return investmentLog(runtime, messages.shortage, "attack-monster", { cost });
    const yes = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)(messages.prompt, { cost }), {
      title: (0, runtime.deps._t)(messages.title),
      tone: "danger",
      confirmLabel: (0, runtime.deps._t)("전체 초기화")
    });
    if (!yes || !investmentSessionIsCurrent(runtime, session) || !investmentMayEdit(runtime)) return;
    const result = rules.reset(session.owner, keystones);
    return presentInvestmentReset(runtime, kind, result);
  }
  function presentInvestmentReset(runtime, kind, result) {
    const messages = resetMessages[kind];
    if (result.status === "empty") return investmentLog(runtime, messages.empty);
    if (result.status === "no-spores") return investmentLog(runtime, "확인 중 마름병 포자가 부족해졌습니다. (필요: {cost})", "attack-monster", { cost: result.cost });
    if (result.status === "full") return reportDualEquipmentChange(runtime, "full", false);
    if (result.status !== "changed") return;
    finishInvestmentReset(runtime, kind, result);
  }
  function finishInvestmentReset(runtime, kind, result) {
    if (kind === "keystones") {
      reportDualEquipmentChange(runtime, result.equipment, false);
      if (typeof runtime.deps.clearAscendKeystoneRuntimeState === "function") (0, runtime.deps.clearAscendKeystoneRuntimeState)(result.removed);
    } else if (kind === "ascend") (0, runtime.deps.normalizeSupportLoadout)(true);
    (0, runtime.deps.updateStaticUI)();
  }

  // modules/ui/ascend-plan-actions.mjs
  async function selectClass(runtime, key) {
    const session = captureInvestmentSession(runtime);
    if (!(0, runtime.deps.isAscendancyOfClass)(key, session.owner.selectedClassId)) return;
    const yes = await (0, runtime.deps.requestGameConfirmation)(`[${runtime.deps.CLASS_TEMPLATES[key].name}] 전직을 선택합니다.
이번 루프에는 다시 변경할 수 없습니다.`, {
      title: (0, runtime.deps._t)("전직 선택"),
      confirmLabel: (0, runtime.deps._t)("이 전직 선택")
    });
    if (!yes || !investmentSessionIsCurrent(runtime, session)) return;
    const removed = runtime.deps.ascend.select(session.owner, key);
    if (!removed) return;
    if (typeof runtime.deps.clearAscendKeystoneRuntimeState === "function") (0, runtime.deps.clearAscendKeystoneRuntimeState)(removed, { force: true });
    (0, runtime.deps.updateStaticUI)();
  }
  function allocateLastLoopAscendPlan(runtime, plan) {
    const owner = runtime.deps.game;
    let placed = 0;
    for (const id of plan.nodes) {
      const node = (0, runtime.deps.getClassTreeDef)(owner.ascendClass)[id];
      if (!canReplayAscendNode(runtime, owner, id, node)) continue;
      buyAscend(runtime, id);
      placed += owner.ascendNodes.includes(id) ? 1 : 0;
    }
    for (const id of plan.keystones) {
      const node = (0, runtime.deps.getClassKeystoneDefs)(owner.ascendClass).find((row) => row.id === id);
      if (!canReplayAscendKeystone(runtime, owner, id, node)) continue;
      buyAscendKeystone(runtime, id);
      placed += owner.ascendKeystones.includes(id) ? 1 : 0;
    }
    return placed;
  }
  function canReplayAscendNode(runtime, owner, id, node) {
    if (!node || owner.ascendPoints <= 0 || owner.ascendNodes.includes(id)) return false;
    if (node.exclusive && owner.ascendNodes.includes(node.exclusive)) return false;
    return runtime.deps.ascend.required(owner, node);
  }
  function canReplayAscendKeystone(runtime, owner, id, node) {
    if (!node || owner.ascendKeystonePoints <= 0 || owner.ascendKeystones.includes(id)) return false;
    if (owner.ascendKeystones.length >= runtime.deps.CLASS_KEYSTONE_PICK_LIMIT) return false;
    return runtime.deps.ascend.keystoneRequired(owner, node);
  }
  async function chooseLastLoopAscendPlan(runtime) {
    const session = captureInvestmentSession(runtime), plan = runtime.deps.ascend.lastPlan(session.owner);
    if (!plan || session.owner.ascendClass || !investmentMayEdit(runtime)) return;
    const name = runtime.deps.CLASS_TEMPLATES[plan.ascendClass].name;
    const yes = await (0, runtime.deps.requestGameConfirmation)(`[${name}] 전직을 선택하고 지난 루프의 배치를 다시 할당합니다.
이번 루프에는 전직을 다시 변경할 수 없습니다.`, {
      title: (0, runtime.deps._t)("지난 루프처럼"),
      confirmLabel: (0, runtime.deps._t)("이 전직 선택")
    });
    if (!yes || !investmentSessionIsCurrent(runtime, session) || !investmentMayEdit(runtime)) return;
    if (runtime.deps.ascend.lastPlan(session.owner) !== plan) return;
    if (!runtime.deps.ascend.select(session.owner, plan.ascendClass, true)) return;
    const placed = allocateLastLoopAscendPlan(runtime, plan);
    investmentLog(runtime, "[{name}] 지난 루프 배치: {placed}개를 다시 골랐습니다.", "season-up", { name, placed });
    (0, runtime.deps.updateStaticUI)();
  }
  function continueLastLoopAscendPlan(runtime) {
    const plan = runtime.deps.ascend.lastPlan(runtime.deps.game);
    if (!plan || plan.ascendClass !== runtime.deps.game.ascendClass || !investmentMayEdit(runtime)) return;
    const placed = allocateLastLoopAscendPlan(runtime, plan);
    investmentLog(
      runtime,
      placed > 0 ? "지난 루프 배치: {placed}개를 더 할당했습니다." : "지금 할당할 수 있는 다음 노드나 키스톤이 없습니다.",
      placed > 0 ? "season-up" : "attack-monster",
      { placed }
    );
    (0, runtime.deps.updateStaticUI)();
  }

  // modules/ui/ascend-tree-data.mjs
  var ICONS = /* @__PURE__ */ Object.freeze({
    pctDmg: "sword",
    flatDmg: "sword",
    meleePctDmg: "sword",
    physPctDmg: "sword",
    slamPctDmg: "sword",
    attackPctDmg: "sword",
    elementalPctDmg: "flame",
    firePctDmg: "flame",
    coldPctDmg: "drop",
    lightPctDmg: "up",
    chaosPctDmg: "drop",
    dotPctDmg: "flame",
    spellPctDmg: "star",
    projectilePctDmg: "reticle",
    aoePctDmg: "split",
    summonPctDmg: "fork",
    summonHpPct: "heart",
    pctHp: "heart",
    flatHp: "heart",
    regen: "drop",
    leech: "leech",
    dr: "shield",
    armor: "shield",
    armorPct: "shield",
    evasion: "boot",
    evasionPct: "boot",
    energyShield: "shield",
    resAll: "shield",
    resChaos: "shield",
    blockChance: "shield",
    aspd: "speed",
    ds: "speed",
    move: "boot",
    crit: "crit",
    critDmg: "eye",
    resPen: "pierce",
    physIgnore: "physIgnore",
    suppCap: "star"
  });

  // modules/ui/ascend-tree-common.mjs
  var ascendTreeIconOf = (stat) => ICONS[stat] || "star";
  var ascendTreeEsc = (runtime, value) => runtime.deps.escapeHTML(String(value));
  var ascendTreeStatName = (runtime, stat) => String(runtime.deps._t(runtime.deps.P_STATS[stat] && runtime.deps.P_STATS[stat].name || runtime.deps.getStatName(stat))).replace(/\s*\(%\)$/, "");
  var ascendTreeLinesOf = (node) => node && Array.isArray(node.stats) ? node.stats : node && node.stat ? [{ stat: node.stat, val: node.val }] : [];
  var ascendTreeKeystoneReqs = (k) => [k.req, ...Array.isArray(k.reqAny) ? k.reqAny : []].filter(Boolean);
  function ascendTreeKeystoneRows(defs) {
    const ids = new Set(defs.map((k) => k.id)), depth = new Map(defs.map((k) => [k.id, 0]));
    for (let pass = 0; pass < defs.length; pass++) {
      defs.forEach((k) => {
        const reqs = ascendTreeKeystoneReqs(k).filter((id) => ids.has(id));
        if (reqs.length) depth.set(k.id, 1 + Math.max(...reqs.map((id) => depth.get(id))));
      });
    }
    const last = Math.max(0, ...depth.values()) + 1, rows = [];
    defs.forEach((k) => {
      const d = k.fifthJobOnly ? last : depth.get(k.id);
      (rows[d] = rows[d] || []).push(k.id);
    });
    return rows.filter(Boolean);
  }

  // modules/ui/ascend-tree-pick.mjs
  function ascendTreeFocusStats(runtime, key) {
    const tree = runtime.deps.getClassTreeDef(key), stats = [];
    ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9"].forEach((id) => ascendTreeLinesOf(tree[id]).forEach((line) => {
      if (line.stat && !stats.includes(line.stat)) stats.push(line.stat);
    }));
    return stats.slice(0, 4);
  }
  function ascendTreePickCardHtml(runtime, key) {
    const template = runtime.deps.CLASS_TEMPLATES[key], defs = runtime.deps.getClassKeystoneDefs(key), stats = ascendTreeFocusStats(runtime, key);
    const chips = stats.map((stat) => `<span class="ascend-pick-chip">${runtime.deps.renderPixelIcon(ascendTreeIconOf(stat), "ascend-pick-chip-icon")}${ascendTreeEsc(runtime, ascendTreeStatName(runtime, stat))}</span>`).join("");
    const keys = (ascendTreeKeystoneRows(defs)[0] || []).map((id) => defs.find((k) => k.id === id)).filter(Boolean).map((k) => `<span class="ascend-pick-key"><b>${ascendTreeEsc(runtime, runtime.deps._t(k.name))}</b><span>${runtime.deps.statToneText.html(runtime.deps._t(k.desc))}</span></span>`).join("");
    return `<button type="button" class="class-card ascend-pick-card" data-loop-class="${key}">
            <span class="ascend-pick-head">${runtime.deps.renderPixelIcon(ascendTreeIconOf(stats[0]), "ascend-pick-icon")}<strong>${ascendTreeEsc(runtime, runtime.deps._t(template.name))}</strong></span>
            <span class="ascend-pick-desc">${ascendTreeEsc(runtime, runtime.deps._t(template.desc))}</span>
            <span class="ascend-pick-section">${runtime.deps._t("노드")}</span><span class="ascend-pick-chips">${chips}</span>
            <span class="ascend-pick-section">${runtime.deps._t("첫 키스톤 ({length}개 가운데 {value}개 할당)", { length: defs.length, value: runtime.deps.CLASS_KEYSTONE_PICK_LIMIT })}</span><span class="ascend-pick-keys">${keys}</span>
            <span class="ascend-pick-cta">${runtime.deps._t("이 전직 고르기")}</span></button>`;
  }

  // modules/ui/ascend-plan-markup.mjs
  function renderAscendancyPickCard(runtime, key) {
    return ascendTreePickCardHtml(runtime, key);
  }
  function fillAscendancyPickScreen(runtime) {
    const planBox = runtime.deps.document.getElementById("ui-class-plan");
    if (planBox) planBox.innerHTML = renderLastLoopPlanCard(runtime);
    runtime.deps.document.getElementById("ui-class-grid").innerHTML = runtime.deps.getAscendanciesForClass(runtime.deps.game.selectedClassId).map((key) => renderAscendancyPickCard(runtime, key)).join("");
  }
  function renderLastLoopPlanCard(runtime) {
    const plan = runtime.deps.ascend.lastPlan(runtime.deps.game);
    return plan ? `<button type="button" class="class-card ascend-plan-card" data-loop-plan="restore"><strong>${runtime.deps._t("지난 루프처럼: {name}", { name: runtime.deps.CLASS_TEMPLATES[plan.ascendClass].name })}</strong><span>${runtime.deps._t("노드 {length}개와 키스톤 {length2}개를 포인트만큼 같은 순서로 다시 할당합니다.", { length: plan.nodes.length, length2: plan.keystones.length })}</span></button>` : "";
  }
  function getAscendancyPlanContinueHtml(runtime) {
    const plan = runtime.deps.ascend.lastPlan(runtime.deps.game);
    if (!plan || plan.ascendClass !== runtime.deps.game.ascendClass) return "";
    const nodesLeft = runtime.deps.game.ascendPoints > 0 && plan.nodes.some((id) => !runtime.deps.game.ascendNodes.includes(id));
    const keystonesLeft = runtime.deps.game.ascendKeystonePoints > 0 && plan.keystones.some((id) => !runtime.deps.game.ascendKeystones.includes(id));
    return nodesLeft || keystonesLeft ? `<button type="button" class="ascend-plan-continue" data-ascend-action="continue-plan">${runtime.deps._t("지난 루프 배치 이어 하기")}</button>` : "";
  }

  // modules/ui/loop-investment-markup.mjs
  function loopOrbitCenterHtml(runtime) {
    return runtime.handlers.isSeasonTreeEvolved() ? "" : `<div class="loop-orbit-center" aria-live="polite">${loopOrbitCenterBody(runtime)}</div>`;
  }
  function loopOrbitCenterBody(runtime) {
    const node = runtime.shown ? runtime.deps.getSeasonPassiveNodeDef(runtime.shown) : null;
    return node ? loopNodeDetailHtml(runtime, runtime.shown, node) : loopOrbitTotalsHtml(runtime);
  }
  function loopNodeValueText(runtime, node, lv) {
    const info = runtime.deps.P_STATS[node.stat] || {}, value = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(2));
    return `${runtime.deps._t(String(info.name || node.stat)).replace(/s*(%)$/, "")} +${runtime.deps.formatValue(node.stat, value)}${info.isPct ? "%" : ""}`;
  }
  function loopNodeStateText(runtime, id, node, lv) {
    const unlockLoop = runtime.deps.getSeasonPassiveUnlockLoop(id);
    if ((runtime.deps.game.season || 1) < unlockLoop) return runtime.deps._t("루프 {unlockLoop}에 열립니다", { unlockLoop });
    if (!runtime.handlers.isSeasonNodeRequirementMet(node)) return "이어진 노드를 먼저 활성화하세요";
    return lv > 0 ? runtime.deps._t("{lv}/{node}단계", { lv, node: runtime.handlers.getSeasonNodeCap(node) }) : "활성화할 수 있습니다";
  }
  function loopNodeBuyHtml(runtime, id, node, lv) {
    const open = (runtime.deps.game.season || 1) >= runtime.deps.getSeasonPassiveUnlockLoop(id) && runtime.handlers.isSeasonNodeRequirementMet(node);
    if (!open || lv >= runtime.handlers.getSeasonNodeCap(node)) return "";
    return `<button type="button" data-loop-action="buy" data-loop-id="${id}" ${runtime.deps.game.seasonPoints > 0 ? "" : runtime.deps._t('disabled data-tip="루프 포인트가 없습니다"')}>${lv > 0 ? runtime.deps._t("강화") : runtime.deps._t("활성화")}</button>`;
  }
  function loopNodeActionsHtml(runtime, id, node, lv) {
    const buy = loopNodeBuyHtml(runtime, id, node, lv);
    const refund = lv > 0 ? `<button type="button" data-loop-action="refund" data-loop-id="${id}">${runtime.deps._t("마름병 포자로 반환")}</button>` : "";
    return buy || refund ? `<span class="loop-orbit-actions">${buy}${refund}</span>` : "";
  }
  function loopNodeDetailHtml(runtime, id, node) {
    const lv = runtime.handlers.getSeasonNodeLevel(id);
    return `<strong>${runtime.deps.escapeHTML(runtime.deps._t(node.name))}</strong><small>${runtime.deps.statToneText.html(runtime.deps._t(node.desc))}</small>
        ${lv > 1 ? `<em style="color:${runtime.deps.getItemStatToneColor(node.stat)}">${runtime.deps._t("지금 {node}", { node: runtime.deps.escapeHTML(loopNodeValueText(runtime, node, lv)) })}</em>` : ""}<b>${loopNodeStateText(runtime, id, node, lv)}</b>${loopNodeActionsHtml(runtime, id, node, lv)}`;
  }
  function loopOrbitTotalsHtml(runtime) {
    const sums = /* @__PURE__ */ new Map();
    Object.keys(runtime.deps.SEASON_NODES || {}).forEach((id) => {
      const lv = runtime.handlers.getSeasonNodeLevel(id), node = runtime.deps.getSeasonPassiveNodeDef(id);
      if (lv > 0 && node) sums.set(node.stat, (sums.get(node.stat) || 0) + node.val * (1 + (lv - 1) * 0.2));
    });
    const total = [...sums].map(([stat, val]) => loopNodeValueText(runtime, { stat, val }, 1)).join(", ");
    return `<strong>${runtime.deps._t("우로보로스 원환")}</strong><small>${total ? `${runtime.deps._t("활성화한 노드의 합계")}: ${runtime.deps.statToneText.html(total)}` : runtime.deps._t("노드를 가리키면 그 효과가 여기에 나옵니다.")}</small>`;
  }
  function loopPassiveHint(runtime, id) {
    runtime.shown = id;
    const center = runtime.deps.document.querySelector("#ui-season-tree .loop-orbit-center");
    if (center) center.innerHTML = loopOrbitCenterBody(runtime);
  }
  function loopPassivePress(runtime, id) {
    const again = runtime.pressed === id, touch = typeof runtime.deps.matchMedia === "function" && !runtime.deps.matchMedia("(hover: hover)").matches;
    runtime.pressed = id;
    loopPassiveHint(runtime, id);
    if (touch && !runtime.deps.uiDisplay.matches("(max-width: 1080px)") && !again) return;
    runtime.handlers.buySeason(id);
  }

  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/loop-investment-events.mjs
  function installLoopInvestmentEvents(runtime) {
    installAscendancyChoiceEvents(runtime);
    const host = runtime.deps.document.getElementById("ui-season-tree");
    if (!host) return;
    listenView(runtime, host, "click", (event) => dispatchLoopInvestment(runtime, host, event, false));
    listenView(runtime, host, "keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") dispatchLoopInvestment(runtime, host, event, true);
    });
    const hint = (event) => {
      const node = event.target.closest?.("[data-loop-hint]");
      if (node && host.contains(node)) runtime.handlers.loopPassiveHint(node.dataset.loopHint);
    };
    listenView(runtime, host, "mouseover", (event) => {
      const node = event.target.closest?.("[data-loop-hint]");
      if (node?.contains(event.relatedTarget)) return;
      hint(event);
    });
    listenView(runtime, host, "focusin", hint);
  }
  function installAscendancyChoiceEvents(runtime) {
    for (const id of ["ui-class-grid", "ui-class-plan"]) {
      const host = runtime.deps.document.getElementById(id);
      if (!host) continue;
      listenView(runtime, host, "click", (event) => {
        if (!runtime.selectionSession || !investmentSessionIsCurrent(runtime, runtime.selectionSession)) {
          runtime.handlers.fillAscendancyPickScreen();
          return;
        }
        const target = event.target.closest?.("[data-loop-class], [data-loop-plan]");
        if (!target || !host.contains(target)) return;
        if (target.dataset.loopClass) runtime.handlers.selectClass(target.dataset.loopClass);
        else runtime.handlers.chooseLastLoopAscendPlan();
      });
    }
  }
  function dispatchLoopInvestment(runtime, host, event, keyboard) {
    const target = event.target.closest?.("[data-loop-action]");
    if (!target || !host.contains(target) || target.disabled) return;
    const action = target.dataset.loopAction, id = target.dataset.loopId;
    if (!["press", "buy", "refund"].includes(action)) return;
    event.preventDefault();
    if (action === "refund") event.stopPropagation();
    if (action === "refund") return runtime.handlers.askRefundSeasonNode(id);
    if (action === "buy" || keyboard) return runtime.handlers.buySeason(id);
    return runtime.handlers.loopPassivePress(id);
  }

  // modules/ui/loop-investment-view.mjs
  function createLoopInvestmentView(deps) {
    const runtime = { deps, active: true, shown: null, pressed: null, selectionSession: null, listeners: [], handlers: {} };
    const actions = {
      buySeason,
      refundSeasonNode,
      buyAscend,
      askRefundSeasonNode,
      askRefundAscendNode,
      refundPassiveNode,
      buyAscendKeystone,
      refundAscendKeystone,
      enforceWarriorDualTrainingEquipment,
      selectClass,
      chooseLastLoopAscendPlan,
      continueLastLoopAscendPlan,
      fillAscendancyPickScreen,
      getAscendancyPlanContinueHtml,
      loopOrbitCenterHtml,
      loopPassiveHint,
      loopPassivePress
    };
    for (const [name, action] of Object.entries(actions)) {
      runtime.handlers[name] = (...args) => {
        if (!runtime.active) return;
        syncInvestmentSelection(runtime);
        return action(runtime, ...args);
      };
    }
    Object.assign(runtime.handlers, investmentQueries(deps), {
      resetSeasonNodes: () => resetInvestmentGroup(runtime, "season"),
      resetAscendNodes: () => resetInvestmentGroup(runtime, "ascend"),
      resetAscendKeystones: () => resetInvestmentGroup(runtime, "keystones")
    });
    installLoopInvestmentEvents(runtime);
    return Object.freeze({ ...runtime.handlers, dispose() {
      releaseViewEvents(runtime);
      runtime.selectionSession = null;
    } });
  }
  function investmentQueries(deps) {
    return {
      isSeasonNodeRequirementMet: (node) => deps.season.required(deps.game, node),
      getSeasonNodeLevel: (id) => deps.season.level(deps.game, id),
      isSeasonTreeEvolved: () => deps.season.evolved(deps.game),
      canInvestSeasonNode: (node, id) => deps.season.canInvest(deps.game, node, id),
      getSeasonNodeCap: (node) => deps.season.cap(deps.game, node),
      hasSpendableSeasonPoint: () => deps.season.spendable(deps.game),
      isAscendNodeRequirementMet: (node) => deps.ascend.required(deps.game, node),
      isAscendKeystoneRequirementMet: (node) => deps.ascend.keystoneRequired(deps.game, node),
      canRefundPassiveNode: (id) => deps.passive.canRefund(deps.game, id)
    };
  }

  // modules/loop-ascend-ui-classic.mjs
  var season = createSeasonInvestments({
    get nodes() {
      return SEASON_NODES;
    },
    get innerNodes() {
      return SEASON_INNER_NODES;
    },
    node: (id) => getSeasonPassiveNodeDef(id),
    ids: () => getAllSeasonPassiveNodeIds(),
    unlockLoop: (id) => getSeasonPassiveUnlockLoop(id),
    unlocked: (owner) => contentProgression.isUnlocked("loopTree", owner),
    loop10Cost: (owner, key) => getLoop10StatCost(key, owner)
  });
  var ascend = createAscendInvestments({
    get classes() {
      return CLASS_TEMPLATES;
    },
    get pickLimit() {
      return CLASS_KEYSTONE_PICK_LIMIT;
    },
    tree: (id, owner) => getClassTreeDef(id, owner),
    keystones: (id) => getClassKeystoneDefs(id),
    isClass: (id, base) => isAscendancyOfClass(id, base),
    canStore: (items, owner) => canStoreEquipmentItems(items, owner)
  });
  var passive = createPassiveNodeRefund({
    get tree() {
      return PASSIVE_TREE;
    },
    get routing() {
      return passiveRouting;
    },
    root: (owner) => getPassiveTreeRootNodeId(owner),
    route: (owner) => getPassiveRouting(owner)
  });
  var view = createLoopInvestmentView({
    season,
    ascend,
    passive,
    get game() {
      return window.GameModules.state.game;
    },
    get document() {
      return document;
    },
    get _t() {
      return _t;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get assertBuildEditable() {
      return assertBuildEditable;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get addLog() {
      return addLog;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get normalizeSupportLoadout() {
      return normalizeSupportLoadout;
    },
    get clearAscendKeystoneRuntimeState() {
      return typeof clearAscendKeystoneRuntimeState === "undefined" ? void 0 : clearAscendKeystoneRuntimeState;
    },
    get calculateReachableNodes() {
      return calculateReachableNodes;
    },
    get hasAuthoredPassiveKeystone() {
      return hasAuthoredPassiveKeystone;
    },
    get passiveNodePresentation() {
      return window.GameModules.passiveScene.nodes;
    },
    get CLASS_TEMPLATES() {
      return CLASS_TEMPLATES;
    },
    get CLASS_KEYSTONE_PICK_LIMIT() {
      return CLASS_KEYSTONE_PICK_LIMIT;
    },
    get P_STATS() {
      return P_STATS;
    },
    get SEASON_NODES() {
      return SEASON_NODES;
    },
    get isAscendancyOfClass() {
      return isAscendancyOfClass;
    },
    get getAscendanciesForClass() {
      return getAscendanciesForClass;
    },
    get getClassTreeDef() {
      return getClassTreeDef;
    },
    get getClassKeystoneDefs() {
      return getClassKeystoneDefs;
    },
    get getSeasonPassiveNodeDef() {
      return getSeasonPassiveNodeDef;
    },
    get getSeasonPassiveUnlockLoop() {
      return getSeasonPassiveUnlockLoop;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get getStatName() {
      return getStatName;
    },
    get statToneText() {
      return statToneText;
    },
    get formatValue() {
      return formatValue;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get matchMedia() {
      return typeof matchMedia === "undefined" ? void 0 : windowMatchMedia;
    }
  });
  window.GameModules.loopInvestmentView = view;
  window.GameModules.loopInvestmentRules = Object.freeze({ season, ascend, passive });
  safeExposeGlobals({
    isSeasonNodeRequirementMet: view.isSeasonNodeRequirementMet,
    getSeasonNodeLevel: view.getSeasonNodeLevel,
    isSeasonTreeEvolved: view.isSeasonTreeEvolved,
    isAscendNodeRequirementMet: view.isAscendNodeRequirementMet,
    canRefundPassiveNode: view.canRefundPassiveNode,
    refundPassiveNode: view.refundPassiveNode,
    askRefundSeasonNode: view.askRefundSeasonNode,
    refundSeasonNode: view.refundSeasonNode,
    askRefundAscendNode: view.askRefundAscendNode,
    canInvestSeasonNode: view.canInvestSeasonNode,
    getSeasonNodeCap: view.getSeasonNodeCap,
    hasSpendableSeasonPoint: view.hasSpendableSeasonPoint,
    loopOrbitCenterHtml: view.loopOrbitCenterHtml,
    loopPassiveHint: view.loopPassiveHint,
    loopPassivePress: view.loopPassivePress,
    isAscendKeystoneRequirementMet: view.isAscendKeystoneRequirementMet,
    enforceWarriorDualTrainingEquipment: view.enforceWarriorDualTrainingEquipment,
    refundAscendKeystone: view.refundAscendKeystone,
    resetAscendKeystones: view.resetAscendKeystones,
    resetSeasonNodes: view.resetSeasonNodes,
    resetAscendNodes: view.resetAscendNodes,
    selectClass: view.selectClass,
    fillAscendancyPickScreen: view.fillAscendancyPickScreen,
    chooseLastLoopAscendPlan: view.chooseLastLoopAscendPlan,
    getAscendancyPlanContinueHtml: view.getAscendancyPlanContinueHtml,
    continueLastLoopAscendPlan: view.continueLastLoopAscendPlan,
    buyAscend: view.buyAscend,
    buySeason: view.buySeason,
    buyAscendKeystone: view.buyAscendKeystone
  });
})();
