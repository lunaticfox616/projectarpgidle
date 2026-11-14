// GENERATED from modules/passive-selection-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/application/passive-layout-data.mjs
  function initializePassiveLayout(ctx) {
    ctx.edgeKeys = /* @__PURE__ */ new Set();
    ctx.nId = 0;
    ctx.genericPathStats = ["aspd", "move", "flatHp", "crit", "pctDmg", "flatDmg", "regen"];
    ctx.regionalPathDefenseStats = {
      templar: ["energyShield", "energyShieldPct"],
      witch: ["energyShield", "energyShieldPct"],
      shadow: ["evasion", "evasionPct"],
      ranger: ["evasion", "evasionPct"],
      duelist: ["armor", "armorPct"],
      marauder: ["armor", "armorPct"]
    };
    ctx.centralCoreSpecs = createCoreSpecs(ctx);
    ctx.clusterThemeBySector = createClusterThemes(ctx);
    ctx.sectorThemes = ["templar", "witch", "shadow", "ranger", "duelist", "marauder", "marauder", "marauder"];
    ctx.sectorCount = ctx.sectorThemes.length;
    ctx.spokesPerSector = 2;
    ctx.webSpokeCount = ctx.sectorCount * ctx.spokesPerSector;
    ctx.maxDepth = 12;
    ctx.innerRadius = 285;
    ctx.ringSpacing = 142;
    ctx.webYScale = 1;
    ctx.angleStep = Math.PI * 2 / ctx.webSpokeCount;
  }
  function initializePassiveClusters(ctx) {
    ctx.webCellClusterBlueprints = [
      { role: "defense", label: ctx.deps._t("방어"), length: 4, spread: 0.34 },
      { role: "offense", label: ctx.deps._t("화력"), length: 5, spread: 0.42 },
      { role: "utility", label: ctx.deps._t("운용"), length: 4, spread: 0.5 },
      { role: "mastery", label: ctx.deps._t("숙련"), length: 5, spread: 0.58 },
      { role: "survival", label: ctx.deps._t("생존"), length: 4, spread: 0.38 }
    ];
    ctx.tagGemClusterSpecs = [
      { stat: "firePctDmg", endStat: "fireGemLevel", title: ctx.deps._t("화염 룬 단련"), length: 5 },
      { stat: "coldPctDmg", endStat: "coldGemLevel", title: ctx.deps._t("냉기 룬 단련"), length: 5 },
      { stat: "lightPctDmg", endStat: "lightGemLevel", title: ctx.deps._t("번개 룬 단련"), length: 5 },
      { stat: "chaosPctDmg", endStat: "chaosGemLevel", title: ctx.deps._t("카오스 룬 단련"), length: 5 },
      { stat: "physPctDmg", endStat: "physGemLevel", title: ctx.deps._t("물리 룬 단련"), length: 5 },
      { stat: "projectilePctDmg", endStat: "projectileGemLevel", title: ctx.deps._t("투사체 룬 단련"), length: 5 },
      { stat: "meleePctDmg", endStat: "meleeGemLevel", title: ctx.deps._t("근접 룬 단련"), length: 5 },
      { stat: "slamPctDmg", endStat: "slamGemLevel", title: ctx.deps._t("강타 룬 단련"), length: 5 },
      { stat: "spellFlatPct", endStat: "spellGemLevel", title: ctx.deps._t("주문 룬 단련"), length: 5 },
      { stat: "dotPctDmg", endStat: "dotGemLevel", title: ctx.deps._t("지속 룬 단련"), length: 5 },
      { stat: "aoePctDmg", endStat: "aoeGemLevel", title: ctx.deps._t("범위 룬 단련"), length: 5 },
      { stat: "elementalPctDmg", endStat: "elementalGemLevel", title: ctx.deps._t("원소 룬 단련"), length: 5 }
    ];
    ctx.retainedGlobalGemLevelCluster = false;
    ctx.clusterAnchorsById = {};
  }
  function createCoreSpecs(ctx) {
    return {
      templar: [
        { stat: "energyShieldPct", title: ctx.deps._t("성역 보호막 관문"), desc: ctx.deps._t("핵심 성좌입니다.") },
        { stat: "spellFlatPct", title: ctx.deps._t("성광 주문 관문"), desc: ctx.deps._t("핵심 성좌입니다.") }
      ],
      witch: [
        { stat: "energyShieldPct", title: ctx.deps._t("비전 보호막 관문"), desc: ctx.deps._t("핵심 성좌입니다.") },
        { stat: "chaosPctDmg", title: ctx.deps._t("공허 부패 관문"), desc: ctx.deps._t("핵심 성좌입니다.") }
      ],
      shadow: [
        { stat: "evasionPct", title: ctx.deps._t("그림자 회피 관문"), desc: ctx.deps._t("핵심 성좌입니다.") },
        { stat: "crit", title: ctx.deps._t("급소 절개 관문"), desc: ctx.deps._t("핵심 성좌입니다.") }
      ],
      ranger: [
        { stat: "evasionPct", title: ctx.deps._t("바람 회피 관문"), desc: ctx.deps._t("핵심 성좌입니다.") },
        { stat: "projectilePctDmg", title: ctx.deps._t("탄도 개시 관문"), desc: ctx.deps._t("핵심 성좌입니다.") }
      ],
      duelist: [
        { stat: "armorPct", title: ctx.deps._t("결투 방어 관문"), desc: ctx.deps._t("핵심 성좌입니다.") },
        { stat: "meleePctDmg", title: ctx.deps._t("연격 개시 관문"), desc: ctx.deps._t("핵심 성좌입니다.") }
      ],
      marauder: [
        { stat: "armorPct", title: ctx.deps._t("철갑 생존 관문"), desc: ctx.deps._t("핵심 성좌입니다.") },
        { stat: "physPctDmg", title: ctx.deps._t("대지 강타 관문"), desc: ctx.deps._t("핵심 성좌입니다.") }
      ]
    };
  }
  function createClusterThemes(ctx) {
    return {
      templar: [
        { stat: "energyShieldPct", title: ctx.deps._t("성역 보호막") },
        { stat: "spellFlatPct", title: ctx.deps._t("성광 주문") },
        { stat: "aoePctDmg", title: ctx.deps._t("신성 범위") },
        { stat: "resAll", title: ctx.deps._t("원소 수호") },
        { stat: "firePctDmg", title: ctx.deps._t("정화의 불꽃") }
      ],
      witch: [
        { stat: "coldPctDmg", title: ctx.deps._t("서리 비전") },
        { stat: "lightPctDmg", title: ctx.deps._t("번개 비전") },
        { stat: "chaosPctDmg", title: ctx.deps._t("공허 비전") },
        { stat: "dotPctDmg", title: ctx.deps._t("지속 부패") },
        { stat: "gemLevel", title: ctx.deps._t("룬 각성") }
      ],
      shadow: [
        { stat: "crit", title: ctx.deps._t("급소 조준") },
        { stat: "critDmg", title: ctx.deps._t("치명 배율") },
        { stat: "leechRateCap", title: ctx.deps._t("흡혈 가속") },
        { stat: "chaosPctDmg", title: ctx.deps._t("독성 그림자") },
        { stat: "evasionPct", title: ctx.deps._t("그림자 회피") }
      ],
      ranger: [
        { stat: "projectilePctDmg", title: ctx.deps._t("투사체 숙련") },
        { stat: "projectileExtraShots", title: ctx.deps._t("추가 발사") },
        { stat: "evasionPct", title: ctx.deps._t("바람 회피") },
        { stat: "coldPctDmg", title: ctx.deps._t("냉기 사격") },
        { stat: "coldPctDmg", title: ctx.deps._t("냉기 사격") }
      ],
      duelist: [
        { stat: "meleePctDmg", title: ctx.deps._t("근접 결투") },
        { stat: "ds", title: ctx.deps._t("연속 타격") },
        { stat: "leechInstanceCap", title: ctx.deps._t("깊은 흡혈") },
        { stat: "aspd", title: ctx.deps._t("쌍검 속도") },
        { stat: "physPctDmg", title: ctx.deps._t("정밀 물리") }
      ],
      marauder: [
        { stat: "physPctDmg", title: ctx.deps._t("물리 파쇄") },
        { stat: "slamPctDmg", title: ctx.deps._t("강타 충격") },
        { stat: "armorPct", title: ctx.deps._t("철갑 강화") },
        { stat: "pctHp", title: ctx.deps._t("거인의 생명") },
        { stat: "leechTotalCap", title: ctx.deps._t("피의 저수지") }
      ]
    };
  }

  // modules/application/passive-layout-nodes.mjs
  function pickValidStat(ctx, theme, tier, seedIndex) {
    let pool = (ctx.deps.PASSIVE_THEME_POOLS[theme] || ctx.deps.PASSIVE_THEME_POOLS.center).filter((stat) => ctx.deps.P_STATS[stat] && ctx.deps.P_STATS[stat].tiers && ctx.deps.P_STATS[stat].tiers.includes(tier));
    if (pool.length === 0) pool = Object.keys(ctx.deps.P_STATS).filter((stat) => ctx.deps.P_STATS[stat].tiers && ctx.deps.P_STATS[stat].tiers.includes(tier));
    if (pool.length === 0) return "flatHp";
    return pool[Math.abs(seedIndex) % pool.length];
  }
  function getGenericPathStat(ctx, theme, depth, lane, sectorIndex) {
    let pathCycle = ctx.genericPathStats;
    let defenseCycle = ctx.regionalPathDefenseStats[theme] || [];
    let laneAbs = Math.abs(lane);
    let isRegionalDefenseStep = defenseCycle.length > 0 && depth >= 4 && depth % 4 === 0 && laneAbs >= 1;
    if (isRegionalDefenseStep) {
      let defenseStat = defenseCycle[(depth / 4 + laneAbs + sectorIndex) % defenseCycle.length];
      if (ctx.deps.P_STATS[defenseStat]) return defenseStat;
    }
    let stat = pathCycle[(depth + laneAbs * 2 + sectorIndex) % pathCycle.length];
    return ctx.deps.P_STATS[stat] ? stat : "flatHp";
  }
  function getCoreDirectionLabel(ctx, sectorIndex) {
    const labels = ["북쪽", "북동쪽", "동쪽", "남동쪽", "남쪽", "남서쪽", "서쪽", "북서쪽"];
    return labels[(sectorIndex % labels.length + labels.length) % labels.length] || "중앙";
  }
  function specializePathNode(ctx, { node, theme, depth, lane, sectorIndex, shape }) {
    if (!node || !shape) return;
    if (shape.kind === "core") {
      specializeCoreNode(ctx, node, { theme, lane, sectorIndex });
      return;
    }
    if (["path", "major", "keystone", "hub"].includes(shape.kind)) {
      let stat = getGenericPathStat(ctx, theme, depth, lane, sectorIndex);
      node.stat = stat;
      node.val = ctx.deps.getPassiveStatTierValue(stat, node.tier);
      if (shape.kind === "major" || shape.kind === "keystone") node.val = Math.max(node.val, ctx.deps.getPassiveStatTierValue(stat, 2));
      if (shape.kind === "hub") {
        node.title = ctx.deps._t("교차 거점");
        node.desc = "여러 갈래의 길이 만나는 거점입니다.";
      }
    }
  }
  function specializeCoreNode(ctx, node, { theme, lane, sectorIndex }) {
    let specs = ctx.centralCoreSpecs[theme] || [];
    let spec = specs[(Math.abs(lane) + sectorIndex) % specs.length];
    if (!spec || !ctx.deps.P_STATS[spec.stat]) return;
    node.stat = spec.stat;
    node.val = ctx.deps.getPassiveStatTierValue(node.stat, node.tier);
    node.title = ctx.deps._t(spec.title);
    node.desc = ctx.deps._t("{sectorIndex} 시작축: {desc}", { sectorIndex: getCoreDirectionLabel(ctx, sectorIndex), desc: spec.desc });
  }
  function selectNodeStat(ctx, themeOrStat, tier, meta) {
    let statKey = ctx.deps.P_STATS[themeOrStat] ? themeOrStat : pickValidStat(ctx, themeOrStat, tier, ctx.nId + (meta && meta.depth || 0) * 7 + (meta && meta.lane || 0) * 13);
    if (!ctx.deps.P_STATS[statKey]) statKey = "flatHp";
    return statKey;
  }
  function nodeLayoutMetadata(meta) {
    return {
      layoutDepth: meta && Number.isFinite(meta.depth) ? meta.depth : null,
      lane: meta && Number.isFinite(meta.lane) ? meta.lane : null,
      sector: meta && meta.sector ? meta.sector : null,
      kind: meta && meta.kind ? meta.kind : "node"
    };
  }
  function addNode(ctx, { x, y, tier, themeOrStat, meta }) {
    if (Object.keys(ctx.deps.PASSIVE_TREE.nodes).length >= ctx.deps.PASSIVE_TARGET_NODES) return null;
    let statKey = selectNodeStat(ctx, themeOrStat, tier, meta);
    let node = {
      id: "n" + ctx.nId++,
      x: x * ctx.deps.PASSIVE_WORLD_SCALE,
      y: y * ctx.deps.PASSIVE_WORLD_SCALE,
      tier,
      stat: statKey,
      val: ctx.deps.getPassiveStatTierValue(statKey, tier),
      depth: Infinity,
      ...nodeLayoutMetadata(meta)
    };
    ctx.deps.PASSIVE_TREE.nodes[node.id] = node;
    return node;
  }
  function applyNodeSpec(ctx, node, spec, fallbackKind) {
    if (!node || !spec) return node;
    node.stat = spec.stat || node.stat;
    node.val = spec.val !== void 0 ? spec.val : node.val;
    node.kind = spec.kind || fallbackKind || node.kind;
    describeNodeSpec(ctx, node, spec);
    if (spec.requiresEvolution) node.requiresEvolution = true;
    if (spec.starIndex !== void 0) node.starIndex = spec.starIndex;
    return node;
  }
  function describeNodeSpec(ctx, node, spec) {
    node.title = ctx.deps._t(spec.title) || null;
    node.desc = spec.desc || null;
    node.effectLabel = spec.effectLabel || ctx.deps.getPassiveEffectLabel(node);
  }
  function connect(ctx, aId, bId) {
    if (!aId || !bId || aId === bId) return;
    let key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
    if (ctx.edgeKeys.has(key)) return;
    ctx.edgeKeys.add(key);
    ctx.deps.PASSIVE_TREE.edges.push({ from: aId, to: bId });
  }
  function getNodeClearanceDistance(ctx, a, b, extraPadding) {
    return ctx.deps.getPassiveNodeVisualRadius(a) + ctx.deps.getPassiveNodeVisualRadius(b) + (extraPadding || 24);
  }
  function getNodeDistance(ctx, a, b) {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    return Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0));
  }
  function buildAdjacencyMap(ctx) {
    let adj = /* @__PURE__ */ new Map();
    Object.keys(ctx.deps.PASSIVE_TREE.nodes).forEach((id) => adj.set(id, /* @__PURE__ */ new Set()));
    ctx.deps.PASSIVE_TREE.edges.forEach((edge) => {
      if (!adj.has(edge.from)) adj.set(edge.from, /* @__PURE__ */ new Set());
      if (!adj.has(edge.to)) adj.set(edge.to, /* @__PURE__ */ new Set());
      adj.get(edge.from).add(edge.to);
      adj.get(edge.to).add(edge.from);
    });
    return adj;
  }

  // modules/application/passive-layout-geometry.mjs
  function getWebSectorIndex(ctx, spoke) {
    return Math.floor((spoke % ctx.webSpokeCount + ctx.webSpokeCount) % ctx.webSpokeCount / ctx.spokesPerSector) % ctx.sectorCount;
  }
  function getWebTheme(ctx, spoke) {
    return ctx.sectorThemes[getWebSectorIndex(ctx, spoke)];
  }
  function getWebLane(ctx, spoke) {
    return spoke % ctx.spokesPerSector === 0 ? 0 : 1;
  }
  function getWebAngle(ctx, spoke) {
    return -Math.PI / 2 + spoke * ctx.angleStep;
  }
  function getWebRadius(ctx, depth) {
    return ctx.innerRadius + (depth - 1) * ctx.ringSpacing;
  }
  function getWebPoint(ctx, spoke, depth, angleShift, radiusShift) {
    let angle = getWebAngle(ctx, spoke) + (angleShift || 0);
    let radius = getWebRadius(ctx, depth) + (radiusShift || 0);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * ctx.webYScale
    };
  }
  function realignWebPathNodes(ctx) {
    for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
      for (let depth = 1; depth <= ctx.maxDepth; depth++) {
        let node = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth - 1];
        if (!node) continue;
        let point = getWebPoint(ctx, spoke, depth, 0, 0);
        node.x = point.x * ctx.deps.PASSIVE_WORLD_SCALE;
        node.y = point.y * ctx.deps.PASSIVE_WORLD_SCALE;
      }
    }
  }
  function classifyWebNode(ctx, depth, spoke) {
    let lane = getWebLane(ctx, spoke);
    let isPrimarySpoke = lane === 0;
    if (depth === 1 && isPrimarySpoke) return { tier: 2, kind: "core" };
    if (isWebHub(depth, lane)) return { tier: 2, kind: "hub" };
    if (depth === ctx.maxDepth && isPrimarySpoke) return { tier: 3, kind: "keystone" };
    if (depth === ctx.maxDepth || depth % 3 === 0) return { tier: 2, kind: "major" };
    return { tier: 1, kind: "path" };
  }
  function isWebHub(depth, lane) {
    return depth === 4 && lane === 1 || depth === 7 && lane === 1 || depth === 10 && lane === 0;
  }
  function getWebCellClusterPoint(ctx, cell, step, chainLength) {
    let t = step / Math.max(1, chainLength + 1);
    let bendDir = cell.bendDir || 1;
    let bow = Math.sin(t * Math.PI) * (cell.blueprint.spread || 0.4);
    let curve = Math.sin(t * Math.PI * 1.35) * 0.07 * bendDir;
    let radiusCurve = Math.sin(t * Math.PI * 2) * 0.05 * bendDir;
    let angleRatio = 0.12 + t * 0.44 + bow * 0.08 + curve;
    let radiusRatio = 0.1 + t * 0.56 + radiusCurve;
    let angle = cell.angle + ctx.angleStep * Math.max(0.1, Math.min(0.72, angleRatio));
    let radius = (cell.innerRadius + ctx.ringSpacing * Math.max(0.08, Math.min(0.72, radiusRatio))) * ctx.deps.PASSIVE_WORLD_SCALE;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * ctx.webYScale
    };
  }
  function realignSpecializedClusters(ctx, clusterCellsById) {
    let clusterNodes = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node) => node && node.clusterId && Number.isFinite(node.clusterStep)).sort((a, b) => {
      let clusterDelta = String(a.clusterId).localeCompare(String(b.clusterId));
      if (clusterDelta !== 0) return clusterDelta;
      return (a.clusterStep || 0) - (b.clusterStep || 0);
    });
    clusterNodes.forEach((node) => {
      let cell = clusterCellsById[node.clusterAnchorId];
      if (!cell) return;
      let pos = getWebCellClusterPoint(ctx, cell, node.clusterStep || 1, node.clusterLength || 4);
      node.x = pos.x;
      node.y = pos.y;
    });
  }
  function angleDistance(ctx, a, b) {
    let diff = a - b;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff);
  }

  // modules/application/passive-layout-relays.mjs
  function addOuterPathRelay(ctx, { a, b, t, depth, spoke, relayIndex, relayCount }) {
    const { x, y } = outerRelayPoint(a, b, t, { depth, spoke, relayIndex });
    let special = depth >= ctx.maxDepth - 1 && relayCount >= 2 && relayIndex === Math.ceil(relayCount / 2);
    const sector = a.sector || b.sector;
    const stat = outerRelayStat(ctx, { special, sector, depth, relayIndex, spoke });
    let node = addNode(ctx, { x: x / ctx.deps.PASSIVE_WORLD_SCALE, y: y / ctx.deps.PASSIVE_WORLD_SCALE, tier: special ? 2 : 1, themeOrStat: stat, meta: { sector, kind: special ? "major" : "path", depth, lane: relayIndex } });
    if (!node) return null;
    node.webBridge = true;
    node.webRing = depth;
    node.title = special ? ctx.deps._t("외곽 별길 규칙") : ctx.deps._t("외곽 별길");
    node.desc = special ? "먼 외곽 성좌 사이를 잇는 보강 규칙 노드입니다. 긴 이동 경로에 작은 보상을 배치합니다." : "멀리 떨어진 외곽 성좌 사이를 촘촘하게 이어 주는 경로 노드입니다.";
    return node;
  }
  function outerRelayPoint(a, b, t, { depth, spoke, relayIndex }) {
    let ax = a.x || 0, ay = a.y || 0, bx = b.x || 0, by = b.y || 0;
    let x = ax + (bx - ax) * t;
    let y = ay + (by - ay) * t;
    let radialLen = Math.hypot(x, y) || 1;
    let ripple = ((spoke + relayIndex + depth) % 2 === 0 ? 1 : -1) * (18 + depth * 1.5);
    x += x / radialLen * ripple;
    y += y / radialLen * ripple;
    return { x, y };
  }
  function outerRelayStat(ctx, { special, sector, depth, relayIndex, spoke }) {
    const specialOuterStats = ["move", "resAll", "crit", "regen", "maxDmgRoll", "minDmgRoll", "resPen", "physIgnore"];
    return special ? specialOuterStats[(spoke + depth) % specialOuterStats.length] : getGenericPathStat(ctx, sector || "center", depth, relayIndex, spoke);
  }
  function connectWithOuterRelays(ctx, a, b, depth, spoke) {
    if (!a || !b) return;
    let dist = getNodeDistance(ctx, a, b);
    let maxSegment = Math.max(190, getNodeClearanceDistance(ctx, a, b, 110));
    let relayCount = Math.max(0, Math.min(3, Math.ceil(dist / maxSegment) - 1));
    if (relayCount <= 0) {
      connect(ctx, a.id, b.id);
      return;
    }
    let prev = a;
    for (let i = 1; i <= relayCount; i++) {
      let relay = addOuterPathRelay(ctx, { a, b, t: i / (relayCount + 1), depth, spoke, relayIndex: i, relayCount });
      if (!relay) break;
      connect(ctx, prev.id, relay.id);
      prev = relay;
    }
    connect(ctx, prev.id, b.id);
  }
  function ensureOuterHubNeighborConnections(ctx, minNeighbors) {
    let hubs = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node) => node && node.kind === "hub" && (node.depth || 0) >= 10);
    if (hubs.length <= 0) return;
    hubs.forEach((hub) => {
      let adj = buildAdjacencyMap(ctx);
      let linked = adj.get(hub.id) || /* @__PURE__ */ new Set();
      let need = Math.max(0, (minNeighbors || 0) - linked.size);
      if (need <= 0) return;
      let candidates = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node) => node && node.id !== hub.id).filter((node) => !node.clusterId).filter((node) => node.kind !== "apex").filter((node) => !linked.has(node.id)).sort((a, b) => {
        let aSector = a.sector === hub.sector ? 0 : 1;
        let bSector = b.sector === hub.sector ? 0 : 1;
        if (aSector !== bSector) return aSector - bSector;
        let da = Math.hypot(a.x - hub.x, a.y - hub.y);
        let db = Math.hypot(b.x - hub.x, b.y - hub.y);
        return da - db;
      });
      candidates.slice(0, need).forEach((node) => connect(ctx, hub.id, node.id));
    });
  }

  // modules/application/passive-layout-web.mjs
  function markVoidPassiveNodes(ctx) {
    for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
      let candidates = (ctx.webNodes[spoke] || []).filter((node) => node && (node.webRing || 0) >= 3).filter((node) => node.kind === "path" || node.kind === "major");
      if (candidates.length <= 0) continue;
      let pick = candidates[(spoke * 7 + 3) % candidates.length];
      pick.legacyVoidStat = pick.stat;
      pick.legacyVoidVal = pick.val;
      pick.kind = "void";
      pick.stat = "pctDmg";
      pick.val = 0;
      pick.title = ctx.deps._t("공허 패시브");
      pick.desc = "처음 활성화할 때는 아무 효과도 없습니다. 마법의 새싹을 사용할 때마다 공허 옵션 1~2줄을 다시 굴릴 수 있습니다.";
      pick.effectLabel = null;
      pick.voidPassive = true;
    }
  }
  function buildWebPaths(ctx) {
    for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
      let theme = getWebTheme(ctx, spoke);
      let lane = getWebLane(ctx, spoke);
      ctx.webNodes[spoke] = [];
      let prev = null;
      for (let depth = 1; depth <= ctx.maxDepth; depth++) {
        let point = getWebPoint(ctx, spoke, depth, 0, 0);
        let shape = classifyWebNode(ctx, depth, spoke);
        let node = addNode(ctx, { x: point.x, y: point.y, tier: shape.tier, themeOrStat: theme, meta: { sector: theme, kind: shape.kind, depth, lane } });
        if (!node) break;
        node.webSpoke = spoke;
        node.webRing = depth;
        specializePathNode(ctx, { node, theme, depth, lane, sectorIndex: getWebSectorIndex(ctx, spoke), shape });
        ctx.webNodes[spoke][depth - 1] = node;
        if (prev) connect(ctx, prev.id, node.id);
        if (depth === 1 && lane === 0 && ctx.root) connect(ctx, ctx.root.id, node.id);
        prev = node;
      }
    }
  }
  function connectWebRings(ctx) {
    for (let depth = 1; depth <= ctx.maxDepth; depth++) {
      for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
        connectRingSegment(ctx, depth, spoke);
      }
    }
  }
  function connectRingSegment(ctx, depth, spoke) {
    let a = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth - 1];
    let b = ctx.webNodes[(spoke + 1) % ctx.webSpokeCount] && ctx.webNodes[(spoke + 1) % ctx.webSpokeCount][depth - 1];
    let intentionalGap = depth >= 4 && depth <= 9 && (spoke + depth) % 7 === 3;
    if (!a || !b || intentionalGap) return;
    if (depth >= 9) connectWithOuterRelays(ctx, a, b, depth, spoke);
    else connect(ctx, a.id, b.id);
  }
  function connectWebDiagonals(ctx) {
    for (let depth = 2; depth < ctx.maxDepth; depth++) {
      for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
        connectDiagonalSegment(ctx, depth, spoke);
      }
    }
  }
  function connectDiagonalSegment(ctx, depth, spoke) {
    let a = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth - 1];
    if (!a) return;
    if (depth % 4 === 0 && spoke % 3 === 1) {
      connectAdjacentWebNode(ctx, a, (spoke + 1) % ctx.webSpokeCount, depth);
    }
    if (depth % 5 === 2 && spoke % 4 === 0) {
      connectAdjacentWebNode(ctx, a, (spoke + ctx.webSpokeCount - 1) % ctx.webSpokeCount, depth);
    }
  }
  function connectAdjacentWebNode(ctx, node, spoke, index) {
    const adjacent = ctx.webNodes[spoke] && ctx.webNodes[spoke][index];
    if (adjacent) connect(ctx, node.id, adjacent.id);
  }

  // modules/application/passive-layout-specs.mjs
  function getTagGemClusterSpec(ctx, spoke, depth) {
    return ctx.tagGemClusterSpecs[(spoke * 5 + depth * 3) % ctx.tagGemClusterSpecs.length];
  }
  function isTopChaosPenaltyCluster(ctx, spoke, depth) {
    let topArc = angleDistance(ctx, getWebAngle(ctx, spoke), -Math.PI / 2) <= Math.PI / 3;
    return topArc && (spoke === 15 && depth === 5 || spoke === 1 && depth === 9);
  }
  function isOneOClockCluster(ctx, spoke) {
    return spoke === 1 || spoke === 2;
  }
  function getOneOClockClusterSpec(ctx, spoke, depth) {
    const specs = [
      { stat: "chaosPctDmg", title: ctx.deps._t("심연 독기"), length: 4 },
      { stat: "dotPctDmg", title: ctx.deps._t("부패 지속"), length: 4 },
      { stat: "coldPctDmg", title: ctx.deps._t("빙결 한기"), length: 4 },
      { stat: "chaosPctDmg", endStat: "chaosGemLevel", title: ctx.deps._t("카오스 룬 독성"), length: 5 },
      { stat: "dotPctDmg", endStat: "dotGemLevel", title: ctx.deps._t("지속 룬 부식"), length: 5 }
    ];
    return specs[(spoke + depth) % specs.length];
  }
  function getDirectionalClusterSpec(ctx, spoke, depth) {
    const fixedClusters = {
      "10:5": { stat: "firePctDmg", title: ctx.deps._t("서녘 화염"), length: 4 },
      "11:8": { stat: "firePctDmg", title: ctx.deps._t("황혼 화염"), length: 4 },
      "14:6": { stat: "firePctDmg", title: ctx.deps._t("여명 화염"), length: 4 },
      "0:6": { stat: "coldPctDmg", title: ctx.deps._t("천정 서리"), length: 4 },
      "1:6": { stat: "lightPctDmg", title: ctx.deps._t("새벽 번개"), length: 4 },
      "14:9": { stat: "summonAspd", title: ctx.deps._t("성좌 지휘"), length: 4 },
      "15:5": { stat: "summonPctDmg", title: ctx.deps._t("별무리 사역"), length: 5 },
      "15:8": { stat: "summonHpPct", title: ctx.deps._t("사역 생명핵"), length: 4 }
    };
    return fixedClusters[`${spoke}:${depth}`] || null;
  }
  function getScatteredMaxResClusterSpec(ctx, spoke, depth) {
    if (spoke === 5 && depth % 4 === 1) return { stat: "resF", endStat: "maxResF", title: ctx.deps._t("화염 최대 저항"), length: 4 };
    if (spoke === 9 && depth % 4 === 2) return { stat: "resC", endStat: "maxResC", title: ctx.deps._t("냉기 최대 저항"), length: 4 };
    if (spoke === 13 && depth % 4 === 3) return { stat: "resL", endStat: "maxResL", title: ctx.deps._t("번개 최대 저항"), length: 4 };
    return null;
  }
  function getCompositeClusterSpec(ctx, spoke, depth) {
    let scatteredMaxRes = getScatteredMaxResClusterSpec(ctx, spoke, depth);
    if (scatteredMaxRes) return scatteredMaxRes;
    if (spoke === 4) {
      if (depth % 2 === 0) return { stat: "moveEvasion", title: ctx.deps._t("질풍 회피"), length: 4 };
      const altSpecs = [
        { stat: "projectilePctDmg", title: ctx.deps._t("탄도 숙련"), length: 4 },
        { stat: "pctHp", title: ctx.deps._t("생명 순환"), length: 4 },
        { stat: "resC", title: ctx.deps._t("한기 내성"), length: 4 },
        { stat: "projectileExtraShots", title: ctx.deps._t("추가 발사"), length: 4 }
      ];
      return altSpecs[Math.floor(depth / 2) % altSpecs.length];
    }
    if (spoke === 8) return { stat: "hpArmor", title: ctx.deps._t("거석 생명"), length: 4 };
    if (spoke === 12) return { stat: "slamPctDmg", endStat: "slamEchoChance", title: ctx.deps._t("대지 여진"), length: 5 };
    if (spoke === 0) return { stat: "energyShieldPct", endStat: "energyShieldRegen", title: ctx.deps._t("보호막 순환"), length: 4 };
    if (isTopChaosPenaltyCluster(ctx, spoke, depth)) return { stat: "chaosResElemPenalty", title: ctx.deps._t("혼돈 절연"), length: 4 };
    const rotating = [
      { stat: "critDmg", title: ctx.deps._t("치명 배율"), length: 4 },
      { stat: "ds", title: ctx.deps._t("연속 타격"), length: 4 },
      { stat: "maxDmgRoll", title: ctx.deps._t("상한 보정"), length: 4 },
      { stat: "pctDmg", endStat: "suppCap", title: ctx.deps._t("보조스킬룬 연결"), length: 4 },
      { stat: "minDmgRoll", title: ctx.deps._t("하한 안정"), length: 4 },
      { stat: "resAll", title: ctx.deps._t("원소 수호"), length: 4 },
      { stat: "resChaos", title: ctx.deps._t("카오스 저항"), length: 4 },
      { stat: "regenSuppress", title: ctx.deps._t("재생 봉쇄"), length: 4 },
      { stat: "aspdMove", title: ctx.deps._t("쌍속 기동"), length: 4 }
    ];
    return rotating[(spoke * 3 + depth) % rotating.length];
  }
  function getClusterStatForStep(ctx, spec, isEnd) {
    return isEnd && spec.endStat ? spec.endStat : spec.stat;
  }
  function getFinalClusterSpec(ctx, themeSpec, spoke, depth) {
    let directional = getDirectionalClusterSpec(ctx, spoke, depth);
    if (directional) return directional;
    if (isOneOClockCluster(ctx, spoke)) return getOneOClockClusterSpec(ctx, spoke, depth);
    if (themeSpec.stat === "gemLevel") {
      return selectGlobalGemCluster(ctx, spoke, depth);
    }
    if (depth === 6 && spoke === 1) return ctx.tagGemClusterSpecs[11];
    if (depth >= 6 && (spoke + depth) % 9 === 0) return getTagGemClusterSpec(ctx, spoke, depth);
    if (depth <= 4) return { stat: themeSpec.stat, title: themeSpec.title, length: null };
    let composite = getCompositeClusterSpec(ctx, spoke, depth);
    if (isClusterSpecAvailable(ctx, composite)) return composite;
    return { stat: themeSpec.stat, title: themeSpec.title, length: null };
  }
  function selectGlobalGemCluster(ctx, spoke, depth) {
    if (!ctx.retainedGlobalGemLevelCluster && depth >= ctx.maxDepth - 1) {
      ctx.retainedGlobalGemLevelCluster = true;
      return { stat: "spellFlatPct", endStat: "gemLevel", title: ctx.deps._t("외곽 룬 각성"), length: 5 };
    }
    return getTagGemClusterSpec(ctx, spoke, depth);
  }
  function isClusterSpecAvailable(ctx, spec) {
    return !!(spec && ctx.deps.P_STATS[spec.stat] && (!spec.endStat || ctx.deps.P_STATS[spec.endStat]));
  }

  // modules/application/passive-layout-clusters.mjs
  function prepareCluster(ctx, spoke, depth) {
    const theme = getWebTheme(ctx, spoke);
    const themes = ctx.clusterThemeBySector[theme] || ctx.clusterThemeBySector.templar;
    const blueprint = ctx.webCellClusterBlueprints[(depth + spoke) % ctx.webCellClusterBlueprints.length];
    let themeSpec = themes[(depth * 2 + spoke) % themes.length];
    if (!blueprint || !themeSpec || !ctx.deps.P_STATS[themeSpec.stat]) return null;
    themeSpec = getFinalClusterSpec(ctx, themeSpec, spoke, depth);
    if (!isClusterSpecAvailable(ctx, themeSpec)) return null;
    const chainLength = themeSpec.length || blueprint.length || 4;
    const clusterId = "web_" + spoke + "_" + depth + "_" + blueprint.role;
    const cell = {
      angle: getWebAngle(ctx, spoke),
      innerRadius: getWebRadius(ctx, depth),
      blueprint,
      bendDir: (spoke + depth) % 2 === 0 ? 1 : -1
    };
    return { theme, blueprint, themeSpec, chainLength, clusterId, cell, spoke, depth };
  }
  function assignClusterValue(ctx, node, { statForStep, tier, chainLength, step }) {
    node.val = ctx.deps.getPassiveStatTierValue(statForStep, tier);
    if (statForStep === "slamPctDmg") node.val *= 2;
    if (statForStep === "critDmg") {
      if (chainLength === 4) node.val = [8, 8, 12, 20][step - 1];
      else if (chainLength === 5) node.val = [12, 12, 12, 12, 25][step - 1];
    }
  }
  function describeClusterStep(ctx, node, cluster, step) {
    const { themeSpec, theme, blueprint, chainLength } = cluster;
    if (step === chainLength) {
      node.title = ctx.deps._t("{title} 핵심", { title: themeSpec.title });
      node.desc = ctx.deps._t("{PASSIVE_SECTOR_TITLES}의 {label} 구역을 완성하는 거미줄 칸 내부 전문 노드입니다.", { PASSIVE_SECTOR_TITLES: ctx.deps.PASSIVE_SECTOR_TITLES[theme] || ctx.deps._t("성좌"), label: blueprint.label });
    } else if (step === 1) {
      node.title = ctx.deps._t("{title} 길목", { title: themeSpec.title });
      node.desc = ctx.deps._t("거미줄 경로 한 칸 안에서 {label} 축으로 갈라지는 시작 노드입니다.", { label: blueprint.label });
    }
  }
  function createClusterStep(ctx, cluster, step) {
    const { cell, chainLength, themeSpec, theme, depth, spoke, clusterId, blueprint } = cluster;
    const isEnd = step === chainLength;
    const pos = getWebCellClusterPoint(ctx, cell, step, chainLength);
    const tier = isEnd ? 3 : step >= chainLength - 1 ? 2 : 1;
    const kind = isEnd ? "keystone" : step >= chainLength - 1 ? "major" : "node";
    const statForStep = getClusterStatForStep(ctx, themeSpec, isEnd);
    const node = addNode(ctx, {
      x: pos.x / ctx.deps.PASSIVE_WORLD_SCALE,
      y: pos.y / ctx.deps.PASSIVE_WORLD_SCALE,
      tier,
      themeOrStat: statForStep,
      meta: { sector: theme, kind, depth: depth + step, lane: getWebLane(ctx, spoke) }
    });
    if (!node) return null;
    node.clusterId = clusterId;
    node.clusterAnchorId = clusterId;
    node.clusterRole = blueprint.role;
    node.clusterRoleLabel = blueprint.label;
    node.clusterStep = step;
    node.clusterLength = chainLength;
    node.clusterTheme = themeSpec.title;
    node.clusterBaseStat = themeSpec.stat;
    node.clusterEndStat = themeSpec.endStat || null;
    node.webCellSpoke = spoke;
    node.webCellRing = depth;
    assignClusterValue(ctx, node, { statForStep, tier, chainLength, step });
    describeClusterStep(ctx, node, cluster, step);
    return node;
  }
  function connectClusterEntrance(ctx, node, spoke, depth) {
    if ((spoke + depth) % 4 !== 0) return;
    const sideAnchor = ctx.webNodes[(spoke + 1) % ctx.webSpokeCount] && ctx.webNodes[(spoke + 1) % ctx.webSpokeCount][depth - 1];
    const radialAnchor = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth];
    if (sideAnchor) connect(ctx, sideAnchor.id, node.id);
    if (radialAnchor && (spoke + depth) % 8 === 0) connect(ctx, radialAnchor.id, node.id);
  }
  function buildWebCellCluster(ctx, anchor, spoke, depth, clusterCellsById) {
    if (!anchor) return;
    if (depth <= 2 && (spoke + depth) % 2 === 0) return;
    const cluster = prepareCluster(ctx, spoke, depth);
    if (!cluster) return;
    clusterCellsById[cluster.clusterId] = cluster.cell;
    let prev = anchor;
    for (let step = 1; step <= cluster.chainLength; step++) {
      const node = createClusterStep(ctx, cluster, step);
      if (!node) return;
      connect(ctx, prev.id, node.id);
      if (step === 1) connectClusterEntrance(ctx, node, spoke, depth);
      prev = node;
    }
  }
  function buildWebClusters(ctx) {
    for (let depth = 1; depth < ctx.maxDepth; depth++) {
      for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
        const anchor = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth - 1];
        buildWebCellCluster(ctx, anchor, spoke, depth, ctx.clusterAnchorsById);
      }
    }
  }

  // modules/application/passive-layout-outer.mjs
  function buildOuterStars(ctx) {
    ctx.deps.PASSIVE_APEX_CONFIGS.forEach((config, index) => {
      let angle = -Math.PI / 2 + index / ctx.deps.PASSIVE_APEX_CONFIGS.length * Math.PI * 2;
      let apexRadius = ctx.baseOuterRadius + 210;
      let apex = addNode(ctx, { x: Math.cos(angle) * apexRadius, y: Math.sin(angle) * apexRadius * 0.92, tier: 3, themeOrStat: config.stat, meta: { sector: `star_${index}`, kind: "apex", depth: ctx.maxDepth + 1, lane: index } });
      applyNodeSpec(ctx, apex, {
        title: config.title,
        stat: config.stat,
        val: config.val,
        kind: "apex",
        desc: config.desc,
        starIndex: index
      }, "apex");
      if (!apex) return;
      let anchors = ctx.outerAnchors.map((node) => ({
        node,
        dist: Math.hypot(node.x - apex.x, node.y - apex.y),
        angleDiff: angleDistance(ctx, Math.atan2(node.y, node.x), angle)
      })).filter((entry) => entry.angleDiff <= 0.7).sort((a, b) => a.dist - b.dist).slice(0, 2).map((entry) => entry.node);
      if (anchors.length === 0) {
        anchors = ctx.outerAnchors.map((node) => ({ node, dist: Math.hypot(node.x - apex.x, node.y - apex.y) })).sort((a, b) => a.dist - b.dist).slice(0, 2).map((entry) => entry.node);
      }
      anchors.forEach((node) => connect(ctx, node.id, apex.id));
      let leftSpec = config.outerNodes[0];
      let rightSpec = config.outerNodes[1];
      let tipSpec = config.outerNodes[2];
      let branchRadius = ctx.baseOuterRadius + 360;
      let tipRadius = ctx.baseOuterRadius + 500;
      let leftNode = addNode(ctx, { x: Math.cos(angle - 0.16) * branchRadius, y: Math.sin(angle - 0.16) * branchRadius * 0.91, tier: 3, themeOrStat: leftSpec.stat, meta: { sector: `star_${index}`, kind: leftSpec.kind, depth: ctx.maxDepth + 2, lane: -1 } });
      let rightNode = addNode(ctx, { x: Math.cos(angle + 0.16) * branchRadius, y: Math.sin(angle + 0.16) * branchRadius * 0.91, tier: 3, themeOrStat: rightSpec.stat, meta: { sector: `star_${index}`, kind: rightSpec.kind, depth: ctx.maxDepth + 2, lane: 1 } });
      let tipNode = addNode(ctx, { x: Math.cos(angle) * tipRadius, y: Math.sin(angle) * tipRadius * 0.9, tier: 3, themeOrStat: tipSpec.stat, meta: { sector: `star_${index}`, kind: tipSpec.kind, depth: ctx.maxDepth + 3, lane: 0 } });
      applyNodeSpec(ctx, leftNode, { ...leftSpec, requiresEvolution: true, starIndex: index }, leftSpec.kind);
      applyNodeSpec(ctx, rightNode, { ...rightSpec, requiresEvolution: true, starIndex: index }, rightSpec.kind);
      applyNodeSpec(ctx, tipNode, { ...tipSpec, requiresEvolution: true, starIndex: index }, tipSpec.kind);
      connectOuterBranches(ctx, { anchors, apex, leftNode, rightNode, tipNode });
    });
  }
  function connectOuterBranches(ctx, { anchors, apex, leftNode, rightNode, tipNode }) {
    let leftAnchor = anchors[0] || apex;
    let rightAnchor = anchors[1] || anchors[0] || apex;
    if (leftNode) connect(ctx, leftAnchor.id, leftNode.id);
    if (rightNode) connect(ctx, rightAnchor.id, rightNode.id);
    if (leftNode && tipNode) connect(ctx, leftNode.id, tipNode.id);
    if (rightNode && tipNode) connect(ctx, rightNode.id, tipNode.id);
  }

  // modules/application/passive-layout-defense.mjs
  function buildDeflectCluster(ctx, { clusterKey, angle, radiusStart, values, finalMajor }) {
    let anchors = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node) => node && !node.clusterId).map((node) => ({ node, dist: Math.abs(angleDistance(ctx, Math.atan2(node.y, node.x), angle)) * 560 + Math.abs(Math.hypot(node.x, node.y) - radiusStart) })).sort((a, b) => a.dist - b.dist);
    let prev = anchors.length > 0 ? anchors[0].node : ctx.root;
    for (let i = 0; i < values.length; i++) {
      let stepRadius = radiusStart + i * 74;
      let stepAngle = angle + (i - 1.5) * 0.035;
      let stat = finalMajor && i === values.length - 1 ? "deflectMajor" : "deflectChance";
      let node = addNode(ctx, { x: Math.cos(stepAngle) * stepRadius, y: Math.sin(stepAngle) * stepRadius * ctx.webYScale, tier: i === values.length - 1 ? 3 : 2, themeOrStat: stat, meta: { sector: "deflect", kind: i === values.length - 1 ? "keystone" : "major", depth: ctx.maxDepth - 2 + i, lane: i } });
      if (!node) return;
      applyNodeSpec(ctx, node, deflectNodeSpec(ctx, { stat, value: values[i], isLast: i === values.length - 1, finalMajor }), node.kind);
      node.clusterId = clusterKey;
      node.clusterRole = "deflect";
      node.clusterRoleLabel = "비껴내기";
      node.clusterStep = i + 1;
      node.clusterLength = values.length;
      if (prev) connect(ctx, prev.id, node.id);
      prev = node;
    }
  }
  function buildBlockCluster(ctx, { clusterKey, angle, radiusStart, values, stat, labelSuffix }) {
    let anchors = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node) => node && !node.clusterId).map((node) => ({ node, dist: Math.abs(angleDistance(ctx, Math.atan2(node.y, node.x), angle)) * 560 + Math.abs(Math.hypot(node.x, node.y) - radiusStart) })).sort((a, b) => a.dist - b.dist);
    let prev = anchors.length > 0 ? anchors[0].node : ctx.root;
    for (let i = 0; i < values.length; i++) {
      let stepRadius = radiusStart + i * 74;
      let stepAngle = angle + (i - 1.5) * 0.035;
      let node = addNode(ctx, { x: Math.cos(stepAngle) * stepRadius, y: Math.sin(stepAngle) * stepRadius * ctx.webYScale, tier: i === values.length - 1 ? 3 : 2, themeOrStat: stat, meta: { sector: "block", kind: i === values.length - 1 ? "keystone" : "major", depth: ctx.maxDepth - 2 + i, lane: i } });
      if (!node) return;
      applyNodeSpec(ctx, node, blockNodeSpec(ctx, { stat, value: values[i], isLast: i === values.length - 1, labelSuffix }), node.kind);
      node.clusterId = clusterKey;
      node.clusterRole = "block";
      node.clusterRoleLabel = "막기";
      node.clusterStep = i + 1;
      node.clusterLength = values.length;
      if (prev) connect(ctx, prev.id, node.id);
      prev = node;
    }
  }
  function buildDefenseClusters(ctx) {
    buildDeflectCluster(ctx, { clusterKey: "deflect_chance_cluster", angle: 0.34, radiusStart: getWebRadius(ctx, 7) * ctx.deps.PASSIVE_WORLD_SCALE, values: [4, 4, 4, 8], finalMajor: false });
    buildDeflectCluster(ctx, { clusterKey: "deflect_reduction_cluster", angle: 0.72, radiusStart: getWebRadius(ctx, 7.6) * ctx.deps.PASSIVE_WORLD_SCALE, values: [3, 3, 3, 6], finalMajor: true });
    buildDeflectCluster(ctx, { clusterKey: "deflect_south_cluster", angle: 1.3, radiusStart: getWebRadius(ctx, 7.2) * ctx.deps.PASSIVE_WORLD_SCALE, values: [4, 4, 4, 8], finalMajor: false });
    buildBlockCluster(ctx, { clusterKey: "block_south_cluster", angle: 1.52, radiusStart: getWebRadius(ctx, 7.5) * ctx.deps.PASSIVE_WORLD_SCALE, values: [1.5, 1.5, 1.5, 3], stat: "blockChance", labelSuffix: "%p" });
    buildBlockCluster(ctx, { clusterKey: "block_flat_cluster", angle: 2.55, radiusStart: getWebRadius(ctx, 7.1) * ctx.deps.PASSIVE_WORLD_SCALE, values: [1.5, 1.5, 1.5, 3], stat: "blockChance", labelSuffix: "%p" });
    buildBlockCluster(ctx, { clusterKey: "block_base_pct_cluster", angle: 3.02, radiusStart: getWebRadius(ctx, 7.7) * ctx.deps.PASSIVE_WORLD_SCALE, values: [20, 20, 20, 30], stat: "blockChancePct", labelSuffix: "% 증가" });
  }
  function deflectNodeSpec(ctx, { stat, value, isLast, finalMajor }) {
    return {
      stat,
      val: value,
      title: isLast ? "비껴내기 숙련" : "비껴내기 자세",
      desc: finalMajor && isLast ? "비껴내기 확률을 크게 올리고, 비껴낸 피해의 감소율을 추가로 강화합니다." : "공격을 정면으로 받지 않고 흘려 받는 방어 성좌입니다.",
      kind: isLast ? "keystone" : "major",
      effectLabel: finalMajor && isLast ? ctx.deps._t("비껴내기 확률 +{values}%, 비껴내기 피해 감소 +3%", { values: value }) : ctx.deps._t("비껴내기 확률 +{values}%", { values: value })
    };
  }
  function blockNodeSpec(ctx, { stat, value, isLast, labelSuffix }) {
    let title = stat === "blockChancePct" ? "막기 기반 강화" : "막기 자세";
    let desc = stat === "blockChancePct" ? "완갑과 대검의 기본 막기 확률에서 비율로 증가하는 방어 성좌입니다." : "최종 막기 확률에 직접 더해지는 방어 성좌입니다.";
    return {
      stat,
      val: value,
      title: isLast ? ctx.deps._t("{title} 숙련", { title }) : title,
      desc,
      kind: isLast ? "keystone" : "major",
      effectLabel: ctx.deps._t("막기 확률 +{values}{labelSuffix}", { values: value, labelSuffix })
    };
  }

  // modules/application/passive-layout-packing.mjs
  function packingClearance(ctx, a, b) {
    let minDist = getNodeClearanceDistance(ctx, a, b, a.sector === b.sector ? 36 : 58);
    if (a.kind === "apex" || b.kind === "apex") minDist += 22;
    if (a.requiresEvolution || b.requiresEvolution) minDist += 18;
    if (a.clusterId && b.clusterId && a.clusterId !== b.clusterId) minDist += 18;
    return minDist;
  }
  function separateNodePair(ctx, a, b) {
    if (a.id === "n0" || b.id === "n0") return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1e-3;
    const minDist = packingClearance(ctx, a, b);
    if (dist >= minDist) return;
    const push = (minDist - dist) * 0.5;
    const nx = dx / dist;
    const ny = dy / dist;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
  }
  function packPassiveNodes(ctx) {
    for (let iter = 0; iter < 16; iter++) {
      for (let i = 0; i < ctx.packed.length; i++) {
        for (let j = i + 1; j < ctx.packed.length; j++) {
          separateNodePair(ctx, ctx.packed[i], ctx.packed[j]);
        }
      }
    }
  }

  // modules/application/passive-layout-bounds.mjs
  function updatePassiveBounds(deps) {
    const nodes = Object.values(deps.PASSIVE_TREE.nodes);
    deps.PASSIVE_BOUNDS.minX = Math.min(...nodes.map((node) => node.x));
    deps.PASSIVE_BOUNDS.maxX = Math.max(...nodes.map((node) => node.x));
    deps.PASSIVE_BOUNDS.minY = Math.min(...nodes.map((node) => node.y));
    deps.PASSIVE_BOUNDS.maxY = Math.max(...nodes.map((node) => node.y));
  }

  // modules/application/passive-layout-build.mjs
  function generateOrganicTree(deps) {
    const ctx = { deps };
    Object.keys(deps.PASSIVE_TREE.nodes).forEach((key) => delete deps.PASSIVE_TREE.nodes[key]);
    deps.PASSIVE_TREE.edges.length = 0;
    initializePassiveLayout(ctx);
    ctx.root = addNode(ctx, { x: 0, y: 0, tier: 0, themeOrStat: "flatDmg", meta: { sector: "center", kind: "root", depth: 0, lane: 0 } });
    if (ctx.root) ctx.root.val = 8;
    ctx.webNodes = {};
    buildWebPaths(ctx);
    markVoidPassiveNodes(ctx);
    connectWebRings(ctx);
    connectWebDiagonals(ctx);
    initializePassiveClusters(ctx);
    buildWebClusters(ctx);
    ctx.baseOuterRadius = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node) => !node.clusterId).reduce((max, node) => Math.max(max, Math.hypot(node.x, node.y)), 0);
    ctx.outerAnchors = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node) => !node.clusterId).filter((node) => Math.hypot(node.x, node.y) >= ctx.baseOuterRadius - 240);
    buildOuterStars(ctx);
    buildDefenseClusters(ctx);
    ensureOuterHubNeighborConnections(ctx, 4);
    realignWebPathNodes(ctx);
    realignSpecializedClusters(ctx, ctx.clusterAnchorsById);
    ctx.packed = Object.values(deps.PASSIVE_TREE.nodes);
    packPassiveNodes(ctx);
    updatePassiveBounds(deps);
    if (typeof deps.markPassiveRenderCacheDirty === "function") deps.markPassiveRenderCacheDirty("structure");
    return ctx;
  }

  // modules/application/passive-layout-postprocess.mjs
  function computePassiveDepths(ctx) {
    Object.values(ctx.deps.PASSIVE_TREE.nodes).forEach((node) => node.depth = Infinity);
    let root = ctx.deps.PASSIVE_TREE.nodes["n0"];
    if (!root) return;
    root.depth = 0;
    let queue = ["n0"];
    while (queue.length > 0) {
      let current = queue.shift();
      let currentDepth = ctx.deps.PASSIVE_TREE.nodes[current].depth;
      ctx.deps.PASSIVE_TREE.edges.forEach((edge) => {
        let next = null;
        if (edge.from === current) next = edge.to;
        if (edge.to === current) next = edge.from;
        if (next && ctx.deps.PASSIVE_TREE.nodes[next].depth === Infinity) {
          ctx.deps.PASSIVE_TREE.nodes[next].depth = currentDepth + 1;
          queue.push(next);
        }
      });
    }
  }
  function polishPassiveLayout(ctx) {
    let nodes = Object.values(ctx.deps.PASSIVE_TREE.nodes || {});
    if (nodes.length === 0) return;
    let minX = Math.min(...nodes.map((node) => node.x));
    let maxX = Math.max(...nodes.map((node) => node.x));
    let minY = Math.min(...nodes.map((node) => node.y));
    let maxY = Math.max(...nodes.map((node) => node.y));
    ctx.deps.PASSIVE_BOUNDS.minX = minX;
    ctx.deps.PASSIVE_BOUNDS.maxX = maxX;
    ctx.deps.PASSIVE_BOUNDS.minY = minY;
    ctx.deps.PASSIVE_BOUNDS.maxY = maxY;
    let centerX = (minX + maxX) * 0.5;
    let centerY = (minY + maxY) * 0.5;
    nodes.forEach((node) => {
      node.x -= centerX;
      node.y -= centerY;
    });
  }
  function rebalancePassiveStartingStats(ctx) {
    const root = ctx.deps.PASSIVE_TREE.nodes.n0;
    if (!root) return;
    const startPlans = {
      templar: ["energyShieldPct"],
      witch: ["chaosPctDmg"],
      shadow: ["evasionPct"],
      ranger: ["projectilePctDmg"],
      duelist: ["armorPct"],
      marauder: ["physPctDmg", "pctHp", "slamPctDmg"]
    };
    const sectorUseCount = {};
    const usedStartStats = /* @__PURE__ */ new Set([root.stat]);
    const starters = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node) => node && node.depth === 1).sort((a, b) => sectorOrderForStartingNode(a) - sectorOrderForStartingNode(b) || String(a.id).localeCompare(String(b.id), void 0, { numeric: true }));
    starters.forEach((node) => {
      const useIndex = sectorUseCount[node.sector] || 0;
      sectorUseCount[node.sector] = useIndex + 1;
      let candidates = (startPlans[node.sector] || []).concat(ctx.deps.PASSIVE_THEME_POOLS[node.sector] || [], ctx.deps.PASSIVE_THEME_POOLS.center || []);
      let preferred = candidates[useIndex] || candidates.find((stat) => !usedStartStats.has(stat));
      if (!preferred || usedStartStats.has(preferred)) preferred = candidates.find((stat) => ctx.deps.P_STATS[stat] && !usedStartStats.has(stat));
      if (preferred) {
        setStat(ctx, node, preferred);
        usedStartStats.add(preferred);
      }
      node.title = ctx.deps._t("{PASSIVE_SECTOR_TITLES} 시작점", { PASSIVE_SECTOR_TITLES: ctx.deps.PASSIVE_SECTOR_TITLES[node.sector] || ctx.deps._t("성좌") });
      node.desc = "루트에서 처음 선택하는 성장 축입니다. 다른 시작점과 겹치지 않는 고유한 기초 효과를 제공합니다.";
    });
    const adjacency = /* @__PURE__ */ new Map();
    ctx.deps.PASSIVE_TREE.edges.forEach((edge) => {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
      adjacency.get(edge.from).push(edge.to);
      adjacency.get(edge.to).push(edge.from);
    });
    starters.forEach((starter) => {
      const used = /* @__PURE__ */ new Set([starter.stat]);
      const children = (adjacency.get(starter.id) || []).map((id) => ctx.deps.PASSIVE_TREE.nodes[id]).filter((node) => node && node.depth === 2 && (node.kind === "path" || node.kind === "node")).sort((a, b) => String(a.id).localeCompare(String(b.id), void 0, { numeric: true }));
      children.forEach((node, index) => {
        if (!used.has(node.stat)) {
          used.add(node.stat);
          return;
        }
        const pool = (ctx.deps.PASSIVE_THEME_POOLS[node.sector] || ctx.deps.PASSIVE_THEME_POOLS.center || []).filter((stat) => ctx.deps.P_STATS[stat]);
        const replacement = pool.slice(index).concat(pool.slice(0, index)).find((stat) => !used.has(stat));
        if (replacement) {
          setStat(ctx, node, replacement);
          used.add(replacement);
        }
      });
    });
  }
  function applyPassiveSpecializations(ctx) {
    const used = /* @__PURE__ */ new Set();
    const kindPriority = { keystone: 0, deadend: 1, major: 2, hub: 3, core: 4, path: 5 };
    ctx.deps.PASSIVE_SPECIAL_NODE_CONFIGS.forEach((config) => {
      let candidates = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter((node2) => node2 && node2.sector === config.sector).filter((node2) => !node2.clusterId).filter((node2) => (config.kinds || []).includes(node2.kind)).filter((node2) => node2.id !== "n0" && !used.has(node2.id));
      candidates.sort((a, b) => {
        let kindDelta = (kindPriority[a.kind] ?? 99) - (kindPriority[b.kind] ?? 99);
        if (kindDelta !== 0) return kindDelta;
        let radiusDelta = Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y);
        if (radiusDelta !== 0) return radiusDelta;
        return a.id.localeCompare(b.id);
      });
      let node = candidates[0];
      if (!node) return;
      used.add(node.id);
      node.stat = config.stat;
      node.val = config.val;
      node.title = ctx.deps._t(config.title);
      node.desc = config.desc;
      node.effectLabel = `${ctx.deps.getStatName(config.stat)} +${ctx.deps.formatValue(config.stat, config.val)}${ctx.deps.P_STATS[config.stat] && ctx.deps.P_STATS[config.stat].isPct ? "%" : ""}`;
    });
  }
  function sectorOrderForStartingNode(node) {
    const order = { templar: 0, witch: 1, shadow: 2, ranger: 3, duelist: 4, marauder: 5 };
    return order[node.sector] ?? 99;
  }
  function setStat(ctx, node, statKey) {
    if (!node || !ctx.deps.P_STATS[statKey]) return;
    node.stat = statKey;
    node.val = ctx.deps.getPassiveStatTierValue(statKey, node.tier);
    node.effectLabel = null;
  }

  // modules/domain/passive-allocation-roots.mjs
  function allocationHasAuthoredPassiveTreeSource(env) {
    return typeof env.deps.PASSIVE_TREE_V22 !== "undefined" && env.deps.PASSIVE_TREE_V22 && env.deps.PASSIVE_TREE_V22.nodes && env.deps.PASSIVE_TREE_V22.edges;
  }
  function allocationHasAuthoredPassiveTree(env) {
    if (!allocationHasAuthoredPassiveTreeSource(env) || env.deps.PASSIVE_TREE.layoutVersion !== env.deps.PASSIVE_TREE_V22.version) return false;
    return Object.values(env.deps.PASSIVE_TREE_V22.classStarts || {}).some((nodeId) => !!env.deps.PASSIVE_TREE.nodes[nodeId]);
  }

  // modules/application/passive-tree-bootstrap.mjs
  function loadAuthoredPassiveTree(deps) {
    deps.scene.state.passiveTreeViewAngle = 0;
    Object.keys(deps.PASSIVE_TREE.nodes).forEach((key) => delete deps.PASSIVE_TREE.nodes[key]);
    deps.PASSIVE_TREE.edges.length = 0;
    Object.entries(deps.PASSIVE_TREE_V22.nodes).forEach(([id, source]) => {
      const node = { ...source, effects: (source.effects || []).map((effect) => ({ ...effect })) };
      node.depth = Number.isFinite(node.distanceFromClassStart) ? node.distanceFromClassStart : Infinity;
      if (node.choiceGroup) node.choiceGroup = JSON.parse(JSON.stringify(node.choiceGroup));
      if (Array.isArray(node.hiddenRouteNodeIds)) node.hiddenRouteNodeIds = node.hiddenRouteNodeIds.slice();
      deps.PASSIVE_TREE.nodes[id] = node;
    });
    deps.PASSIVE_TREE.edges.push(...deps.PASSIVE_TREE_V22.edges.map((edge) => ({ ...edge })));
    deps.PASSIVE_TREE.layoutVersion = deps.PASSIVE_TREE_V22.version;
    updatePassiveBounds(deps);
    if (typeof deps.markPassiveRenderCacheDirty === "function") deps.markPassiveRenderCacheDirty("authored-tree");
  }
  function bootstrapPassiveTree(deps) {
    if (allocationHasAuthoredPassiveTreeSource({ deps })) {
      loadAuthoredPassiveTree(deps);
      return true;
    }
    const ctx = generateOrganicTree(deps);
    applyPassiveSpecializations(ctx);
    computePassiveDepths(ctx);
    rebalancePassiveStartingStats(ctx);
    polishPassiveLayout(ctx);
    return true;
  }

  // modules/ui/passive-scene-camera.mjs
  function getPassiveTreeViewAngle(runtime) {
    return runtime.state.passiveTreeViewAngle;
  }
  function syncPassiveTreeView(runtime) {
    if (!allocationHasAuthoredPassiveTree(runtime)) return;
    const start = runtime.deps.PASSIVE_TREE_V22.nodes[(0, runtime.deps.getPassiveTreeRootNodeId)()];
    const angle = Math.PI / 2 - Math.atan2(start.y, start.x);
    if (angle === runtime.state.passiveTreeViewAngle) return;
    runtime.state.passiveTreeViewAngle = angle;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    Object.entries(runtime.deps.PASSIVE_TREE_V22.nodes).forEach(([id, source]) => {
      const node = runtime.deps.PASSIVE_TREE.nodes[id];
      if (!node) return;
      node.x = source.x * cos - source.y * sin;
      node.y = source.x * sin + source.y * cos;
    });
    runtime.state.passiveCameraInitialized = false;
  }
  function clampPassiveCamera2(runtime) {
    runtime.state.camX = (0, runtime.deps.clampNumber)(runtime.state.camX, -9800, 9800);
    runtime.state.camY = (0, runtime.deps.clampNumber)(runtime.state.camY, -7800, 7800);
  }
  function getPassiveActiveViewBoundsIds(runtime) {
    let ids = /* @__PURE__ */ new Set([(0, runtime.deps.getPassiveTreeRootNodeId)()]);
    const invested = Array.isArray(runtime.deps.game && runtime.deps.game.passives) ? runtime.deps.game.passives : [];
    invested.forEach((id) => ids.add(id));
    runtime.deps.reachableNodes.forEach((id) => ids.add(id));
    if (invested.length > 0) return ids;
    const adjacency = (0, runtime.deps.getPassiveTreeAdjacency)();
    const queue = Array.from(ids, (id) => ({ id, depth: 0 }));
    let queueIndex = 0;
    while (queueIndex < queue.length) {
      const current = queue[queueIndex++];
      if (current.depth >= 3) continue;
      (adjacency.get(current.id) || []).forEach((nextId) => {
        if (ids.has(nextId)) return;
        ids.add(nextId);
        queue.push({ id: nextId, depth: current.depth + 1 });
      });
    }
    return ids;
  }
  function getPassiveViewBounds(runtime, viewNodes) {
    const nodes = viewNodes.length ? viewNodes : [(0, runtime.deps.getPassiveTreeRootNode)() || { x: 0, y: 0 }];
    const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }
  function placePassiveRootLow(runtime, width, height, bounds, invested) {
    const root = (0, runtime.deps.getPassiveTreeRootNode)();
    if (!root) return;
    if (!invested) runtime.state.camX = -root.x * runtime.state.camZoom;
    const low = height * (width < 768 ? 0.1 : 0.32);
    if ((bounds.maxY - bounds.minY) * runtime.state.camZoom <= height / 2 + low - 60) runtime.state.camY = low - root.y * runtime.state.camZoom;
  }
  function fitPassiveCameraToBounds2(runtime, force) {
    syncPassiveTreeView(runtime);
    if (runtime.state.passiveCameraInitialized && !force) return;
    let container = runtime.deps.document.getElementById("tree-container");
    if (!container || container.offsetParent === null) return;
    (0, runtime.deps.calculateReachableNodes)();
    let width = Math.max(1, container.clientWidth);
    let height = Math.max(1, container.clientHeight);
    let viewNodes = Array.from(getPassiveActiveViewBoundsIds(runtime)).map((id) => runtime.deps.PASSIVE_TREE.nodes[id]).filter(Boolean);
    const invested = Array.isArray(runtime.deps.game && runtime.deps.game.passives) && runtime.deps.game.passives.length > 0;
    const bounds = getPassiveViewBounds(runtime, viewNodes);
    const viewPadding = 120;
    const spanX = Math.max(1, bounds.maxX - bounds.minX + viewPadding * 2);
    const spanY = Math.max(1, bounds.maxY - bounds.minY + viewPadding * 2);
    const defaultZoom = Math.min((width - 64) / spanX, (height - 72) / spanY);
    runtime.state.camZoom = (0, runtime.deps.clampNumber)(invested || width >= 768 ? defaultZoom : Math.max(defaultZoom, 0.3), 0.1, 0.72);
    const toolbarOffsetY = invested ? 0 : 56;
    runtime.state.camX = -(bounds.minX + bounds.maxX) * 0.5 * runtime.state.camZoom;
    runtime.state.camY = -(bounds.minY + bounds.maxY) * 0.5 * runtime.state.camZoom + toolbarOffsetY;
    placePassiveRootLow(runtime, width, height, bounds, invested);
    runtime.state.passiveCameraInitialized = true;
  }

  // modules/ui/passive-scene-cache.mjs
  function markPassiveRenderCacheDirty(runtime, type) {
    if (!runtime.state.passiveRenderCache) return;
    if (type === "structure") runtime.state.passiveRenderCache.structureDirty = true;
    runtime.state.passiveRenderCache.stateDirty = true;
    runtime.state.passiveRenderCache.hoverPath = null;
  }
  function getPassiveStateSignature(runtime) {
    let passives = (runtime.deps.game.passives || []).slice().sort().join("|");
    let discovered = Array.from(runtime.deps.discoveredPassiveNodes || []).sort().join("|");
    let reachable = Array.from(runtime.deps.reachableNodes || []).sort().join("|");
    return `${passives}::${discovered}::${reachable}`;
  }
  function rebuildPassiveStructureCache(runtime) {
    let nodes = Object.values(runtime.deps.PASSIVE_TREE.nodes || {});
    let edges = (runtime.deps.PASSIVE_TREE.edges || []).map((edge) => {
      let a = runtime.deps.PASSIVE_TREE.nodes[edge.from];
      let b = runtime.deps.PASSIVE_TREE.nodes[edge.to];
      if (!a || !b) return null;
      return { ...edge, a, b };
    }).filter(Boolean);
    runtime.state.passiveRenderCache.nodes = nodes;
    runtime.state.passiveRenderCache.edges = edges;
    runtime.state.passiveRenderCache.hoverGrid = /* @__PURE__ */ new Map();
    runtime.state.passiveRenderCache.adjacency = typeof runtime.deps.getPassiveTreeAdjacency === "function" ? (0, runtime.deps.getPassiveTreeAdjacency)() : /* @__PURE__ */ new Map();
    let cellSize = runtime.state.passiveRenderCache.cellSize;
    nodes.forEach((node) => {
      let cx = Math.floor(node.x / cellSize);
      let cy = Math.floor(node.y / cellSize);
      let key = `${cx},${cy}`;
      if (!runtime.state.passiveRenderCache.hoverGrid.has(key)) runtime.state.passiveRenderCache.hoverGrid.set(key, []);
      runtime.state.passiveRenderCache.hoverGrid.get(key).push(node);
    });
    runtime.state.passiveRenderCache.hoverPath = null;
    runtime.state.passiveRenderCache.structureDirty = false;
  }
  function rebuildPassiveStateCache(runtime) {
    runtime.state.passiveRenderCache.glowNodes = [];
    runtime.state.passiveRenderCache.activeEdges = runtime.state.passiveRenderCache.edges.filter((edge) => {
      if (!(0, runtime.deps.isPassiveTreeEdgeAvailable)(edge)) return false;
      if (!(0, runtime.deps.isPassiveNodeAvailable)(edge.a) || !(0, runtime.deps.isPassiveNodeAvailable)(edge.b)) return false;
      let va = (0, runtime.deps.getPassiveVisibility)(edge.a.id);
      let vb = (0, runtime.deps.getPassiveVisibility)(edge.b.id);
      return va !== "hidden" && vb !== "hidden";
    });
    runtime.state.passiveRenderCache.stateSignature = getPassiveStateSignature(runtime);
    runtime.state.passiveRenderCache.stateDirty = false;
  }
  function ensurePassiveRenderCache(runtime) {
    syncPassiveTreeView(runtime);
    if (runtime.state.passiveRenderCache.viewAngle !== getPassiveTreeViewAngle(runtime)) {
      runtime.state.passiveRenderCache.viewAngle = getPassiveTreeViewAngle(runtime);
      markPassiveRenderCacheDirty(runtime, "structure");
    }
    if (runtime.state.passiveRenderCache.structureDirty) rebuildPassiveStructureCache(runtime);
    if (runtime.state.passiveRenderCache.stateDirty) rebuildPassiveStateCache(runtime);
  }
  function getPassiveWorldViewport(runtime, displayWidth, displayHeight) {
    let halfW = displayWidth / 2;
    let halfH = displayHeight / 2;
    return {
      minX: (-halfW - runtime.state.camX) / runtime.state.camZoom,
      maxX: (halfW - runtime.state.camX) / runtime.state.camZoom,
      minY: (-halfH - runtime.state.camY) / runtime.state.camZoom,
      maxY: (halfH - runtime.state.camY) / runtime.state.camZoom
    };
  }
  function isNodeInViewport(runtime, node, viewport, margin) {
    let m = Number.isFinite(margin) ? margin : 0;
    return node.x >= viewport.minX - m && node.x <= viewport.maxX + m && node.y >= viewport.minY - m && node.y <= viewport.maxY + m;
  }
  function isEdgeInViewport(runtime, edge, viewport, margin) {
    let m = Number.isFinite(margin) ? margin : 0;
    let minX = Math.min(edge.a.x, edge.b.x);
    let maxX = Math.max(edge.a.x, edge.b.x);
    let minY = Math.min(edge.a.y, edge.b.y);
    let maxY = Math.max(edge.a.y, edge.b.y);
    return !(maxX < viewport.minX - m || minX > viewport.maxX + m || maxY < viewport.minY - m || minY > viewport.maxY + m);
  }

  // modules/ui/passive-node-hit.mjs
  function getPassiveNodeAtTouch(runtime, touch2) {
    return getPassiveNodeAtClientPosition(runtime, touch2.clientX, touch2.clientY, 22);
  }
  function getPassiveNodeAtClientPosition(runtime, clientX, clientY, minScreenRadius) {
    ensurePassiveRenderCache(runtime);
    const rect = runtime.state.canvas.getBoundingClientRect();
    const viewW = runtime.state.passiveCanvasMetrics.width || rect.width;
    const viewH = runtime.state.passiveCanvasMetrics.height || rect.height;
    const minRadius = minScreenRadius * viewW / rect.width / runtime.state.camZoom;
    const worldX = ((clientX - rect.left) * viewW / rect.width - viewW / 2 - runtime.state.camX) / runtime.state.camZoom;
    const worldY = ((clientY - rect.top) * viewH / rect.height - viewH / 2 - runtime.state.camY) / runtime.state.camZoom;
    let found = null;
    let foundDistance = Infinity;
    let cellSize = runtime.state.passiveRenderCache.cellSize;
    let cx = Math.floor(worldX / cellSize);
    let cy = Math.floor(worldY / cellSize);
    const candidates = nodeHitCandidates(runtime, cx, cy);
    let nearbyNodes = candidates.length > 0 ? candidates : runtime.state.passiveRenderCache.nodes;
    nearbyNodes.forEach((node) => {
      if ((0, runtime.deps.getPassiveVisibility)(node.id) === "hidden") return;
      let radius = Math.max((0, runtime.nodes.getPassiveNodeVisualRadius)(node) + 8, minRadius);
      let distance = Math.hypot(node.x - worldX, node.y - worldY);
      if (distance > radius) return;
      if (!found || distance < foundDistance) {
        found = node;
        foundDistance = distance;
      }
    });
    return found;
  }
  function nodeHitCandidates(runtime, cx, cy) {
    const candidates = [];
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        let bucket = runtime.state.passiveRenderCache.hoverGrid.get(`${cx + ox},${cy + oy}`);
        if (bucket && bucket.length) candidates.push(...bucket);
      }
    }
    return candidates;
  }

  // modules/ui/passive-node-tooltip.mjs
  function renderPassiveRouteHint(runtime, cost) {
    if (cost <= 0 || runtime.deps.uiDisplay.matches("(max-width: 1080px)")) return "";
    return `<div class="tooltip-line" style="margin-top:6px;color:#f2d88f;">${(0, runtime.deps._t)("현재 경로 기준 {cost}포인트 필요", { cost })}</div>`;
  }
  function renderPassiveStatPreview(runtime, route) {
    const taken = new Set(runtime.deps.game.passives || []);
    const ids = Array.from(route).filter((id) => !taken.has(id) && runtime.deps.PASSIVE_TREE.nodes[id] && runtime.deps.PASSIVE_TREE.nodes[id].kind !== "start");
    const parts = ids.length ? (0, runtime.deps.buildStatPreviewParts)((0, runtime.deps.previewPassiveNodeStats)(ids)) : "";
    return parts ? `<div class="tooltip-line" style="margin-top:6px;">${(0, runtime.deps._t)("이 노드까지 할당 시 {parts}", { parts })}</div>` : "";
  }
  function renderPassiveEffectToneHtml(runtime, node, label) {
    const effects = Array.isArray(node.effects) && node.effects.length > 0 ? node.connectedDevotionPenalty ? (0, runtime.deps.getEffectivePassiveNodeEffects)(node) : node.effects : null;
    if (!effects) return node.stat ? label : runtime.deps.statToneText.markup(label);
    return String(label).split("<br>").map((line, index) => index < effects.length ? `<span style="color:${(0, runtime.deps.getItemStatToneColor)(effects[index].stat)}">${line}</span>` : runtime.deps.statToneText.markup(line)).join("<br>");
  }
  function renderPassiveTooltip(runtime, node, clientX, clientY) {
    if (!runtime.state.canvasTooltip || !node) return;
    let displayStat = typeof runtime.deps.getPassiveNodeDisplayStat === "function" ? (0, runtime.deps.getPassiveNodeDisplayStat)(node) : node.stat;
    let passiveAccent = (0, runtime.nodes.getPassiveStatAccent)(displayStat);
    let state = (0, runtime.deps.getPassiveVisibility)(node.id);
    let route = (0, runtime.deps.getHoverAllocationNodeIds)(node.id);
    let routeCost = Array.from(route).filter((id) => !(runtime.deps.game.passives || []).includes(id) && runtime.deps.PASSIVE_TREE.nodes[id] && runtime.deps.PASSIVE_TREE.nodes[id].kind !== "start").length;
    let ownedApexCount = (0, runtime.deps.getPassiveApexNodeIds)().filter((id) => (runtime.deps.game.passives || []).includes(id)).length;
    let msg = initialNodeMessage(runtime, node);
    msg = progressNodeMessage(runtime, node, state, ownedApexCount, msg);
    const { effectHtml, displayedEffectLabels } = nodeEffectMarkup(runtime, node, passiveAccent, displayStat);
    let voidCraftHtml = "";
    if (node.kind === "void" && (runtime.deps.game.passives || []).includes(node.id)) {
      voidCraftHtml = `<div class="tooltip-line" style="margin-top:8px; color:var(--copy-bright);">${(0, runtime.deps._t)("🕳️ 클릭하면 공허 제작 창이 열립니다.")}</div>`;
    }
    const tooltipDescription = (0, runtime.deps.getPassiveTooltipDescription)(node, displayedEffectLabels);
    runtime.state.canvasTooltip.innerHTML = `<div class="tooltip-title" style="color:${emphasizedNodeTitle(node) ? "#e7bf73" : "#b9d0df"}">${(0, runtime.nodes.getPassiveNodeDisplayName)(node)}</div>
             <div class="tooltip-line">${(0, runtime.nodes.getPassiveKindLabel)(node)}</div>
             ${effectHtml}
             ${tooltipDescription ? `<div class="tooltip-line" style="margin-top:6px; color:var(--copy-bright);">${runtime.deps.statToneText.markup(tooltipDescription)}</div>` : ""}
             ${voidCraftHtml}
             ${renderPassiveRouteHint(runtime, routeCost)}
             ${renderPassiveStatPreview(runtime, route)}
             <div class="tooltip-line" style="margin-top:6px;">${msg}</div>`;
    runtime.deps.passiveSelectionUi.present(node, runtime.state.canvasTooltip, { x: clientX, y: clientY });
  }
  function initialNodeMessage(runtime, node) {
    return (runtime.deps.game.passives || []).includes(node.id) ? "활성화됨" : runtime.deps.reachableNodes.has(node.id) ? (0, runtime.deps.describeReachablePassiveNode)(node) : "아직 길이 이어지지 않은 노드";
  }
  function progressNodeMessage(runtime, node, state, ownedApexCount, msg) {
    if (state === "preview" && !runtime.deps.discoveredPassiveNodes.has(node.id)) {
      msg = "안개 속 노드입니다. 활성화하여 주변을 밝힐 수 있습니다.";
    }
    if (node.kind === "apex" && !ownsNode(runtime, node)) {
      msg = (0, runtime.deps._t)("★ 별끝 특수 노드 {ownedApexCount}/5. 다섯 개를 모두 잇면 외곽 성좌가 별 모양으로 각성합니다.", { ownedApexCount });
    } else if (isEvolvedNode(runtime, node)) {
      msg = ownsNode(runtime, node) ? "✔️ 각성된 별자리를 이미 받아들였습니다." : "✨ 성좌 진화 이후 드러난 강력한 외곽 노드입니다.";
    } else if (node.voidRing === "outer" && !runtime.deps.game.passiveStarEvolution) {
      const progress = (0, runtime.deps.getPassiveConstellationAwakeningProgress)();
      msg += (0, runtime.deps._t)(", 성좌 각성 {completed}/{required}: 직업 공허 소켓 여섯을 모두 활성화하면 각성합니다.", { completed: progress.completed, required: progress.required });
    }
    return msg;
  }
  function ownsNode(runtime, node) {
    return (runtime.deps.game.passives || []).includes(node.id);
  }
  function isEvolvedNode(runtime, node) {
    return (node.kind === "evolved" || node.kind === "transcendent") && runtime.deps.game.passiveStarEvolution;
  }
  function nodeEffectMarkup(runtime, node, passiveAccent, displayStat) {
    let effectTextColor = (0, runtime.deps.getItemStatToneColor)(displayStat);
    let effectBadge = (label, accent, caption) => {
      let tone = accent || passiveAccent;
      return `<div class="tooltip-line passive-effect-badge" style="--badge-edge:${tone.activeOuter}; color:${effectTextColor};">
                <div class="passive-effect-caption">${caption}</div>
                ${label}
            </div>`;
    };
    const primaryEffectLabel = (0, runtime.nodes.getPassiveEffectLabel)(node);
    const displayedEffectLabels = [primaryEffectLabel].filter(Boolean);
    let effectHtml = primaryEffectLabel ? effectBadge(renderPassiveEffectToneHtml(runtime, node, primaryEffectLabel), passiveAccent, "효과") : "";
    const activationState = (0, runtime.deps.getPassiveNodeActivationState)(node);
    if (node.activationRequirement && !activationState.active) {
      const requiredName = activationState.statId === "devotion" ? "계시" : (0, runtime.deps.getStatName)(activationState.statId);
      effectHtml += `<div class="tooltip-line" style="margin-top:7px; padding:7px 9px; border:1px solid rgba(255,184,106,.48); border-radius:8px; color:#ffd0a2; background:rgba(91,52,20,.28);">${(0, runtime.deps._t)("{requiredName} {required} 미만이면 이 노드의 모든 효과가 비활성화됩니다. 현재 {available}", { requiredName: (0, runtime.deps.withSubjectParticle)(requiredName), required: activationState.required, available: activationState.available })}</div>`;
    }
    return { effectHtml, displayedEffectLabels };
  }
  function emphasizedNodeTitle(node) {
    return node.tier >= 3 || node.kind === "apex" || node.kind === "transcendent";
  }

  // modules/ui/passive-node-activation.mjs
  async function activateHoveredPassive(runtime, opts) {
    let options = opts || {};
    chooseHoveredNode(runtime, options);
    if (runtime.state.dragDist >= 10 || !runtime.state.hoverNode) return;
    const targetNode = runtime.state.hoverNode;
    const targetNodeId = targetNode.id;
    let activationPath = (0, runtime.deps.getPassiveActivationPath)(targetNodeId);
    let canActivate = activationPath.length === 1 && runtime.deps.reachableNodes.has(targetNodeId);
    let canPathActivate = activationPath.length > 1;
    if (!canActivate && !canPathActivate) {
      return unavailableNodeAction(runtime, options);
    }
    let pointCost = activationPath.length;
    if (runtime.deps.game.passivePoints < pointCost) {
      previewAtPointer(runtime, options);
      return (0, runtime.deps.addLog)((0, runtime.deps._t)("스킬트리 포인트가 부족합니다. (필요: {pointCost})", { pointCost }), "attack-monster", { toast: true });
    }
    if (touchPreviewNeeded(runtime, options)) return;
    await confirmAndActivatePath(runtime, targetNode, activationPath, canPathActivate, pointCost);
  }
  function chooseHoveredNode(runtime, options) {
    if (options.nodeId) {
      runtime.state.hoverNode = runtime.deps.PASSIVE_TREE.nodes[options.nodeId];
    } else if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) {
      runtime.state.hoverNode = getPassiveNodeAtClientPosition(runtime, options.clientX, options.clientY, 0);
    }
  }
  function unavailableNodeAction(runtime, options) {
    if ((runtime.deps.game.passives || []).includes(runtime.state.hoverNode.id)) {
      if (runtime.state.hoverNode.kind === "void") {
        runtime.state.pendingTouchPassiveId = null;
        runtime.state.pendingTouchPassiveRefundId = null;
        return (0, runtime.deps.openVoidPassiveCraftOverlay)(runtime.state.hoverNode.id);
      }
      if (options.fromTouch) {
        let now = Date.now();
        if (runtime.state.pendingTouchPassiveRefundId !== runtime.state.hoverNode.id || now - runtime.state.pendingTouchPassiveRefundAt > 1200) {
          runtime.state.pendingTouchPassiveRefundId = runtime.state.hoverNode.id;
          runtime.state.pendingTouchPassiveRefundAt = now;
          renderPassiveTooltip(runtime, runtime.state.hoverNode, options.clientX || 0, options.clientY || 0);
          (0, runtime.deps.addLog)((0, runtime.deps._t)("👆 반환 확인: 같은 노드를 한 번 더 탭하면 환불 창이 열립니다."), "loot-magic");
          return;
        }
      }
      runtime.state.pendingTouchPassiveId = null;
      runtime.state.pendingTouchPassiveRefundId = null;
      return (0, runtime.deps.askRefundPassiveNode)(runtime.state.hoverNode.id);
    }
    previewAtPointer(runtime, options);
    return (0, runtime.deps.addLog)((0, runtime.deps.describeBlockedPassiveNode)(runtime.state.hoverNode), "attack-monster", { toast: true });
  }
  async function confirmAndActivatePath(runtime, targetNode, activationPath, canPathActivate, pointCost) {
    const targetNodeId = targetNode.id;
    const attributeNodeCount = activationPath.filter((id) => runtime.deps.PASSIVE_TREE.nodes[id] && runtime.deps.PASSIVE_TREE.nodes[id].kind === "attribute").length;
    if (canPathActivate && !await runtime.deps.passiveSelectionUi.confirmPath(targetNode, activationPath)) return;
    let attributeStat = null;
    if (attributeNodeCount > 0) {
      attributeStat = await (0, runtime.deps.requestGameChoice)(attributeChoices(runtime, attributeNodeCount));
      if (!attributeStat) return;
    }
    runtime.state.pendingTouchPassiveId = null;
    let activationResult = (0, runtime.deps.activatePassivePath)(targetNodeId, { forcePulseNodeId: targetNodeId, attributeStat, expectedPath: activationPath });
    if (!activationResult.activated) {
      (0, runtime.deps.calculateReachableNodes)();
      let reason = activationResult.reason === "points" ? (0, runtime.deps._t)("스킬트리 포인트가 부족합니다. (필요: {cost})", { cost: activationResult.cost }) : activationResult.message || "확인 중 패시브 트리 상태가 변경되었습니다. 노드를 다시 선택해 주세요.";
      (0, runtime.deps.addLog)(reason, "attack-monster");
      (0, runtime.deps.updateStaticUI)();
      return;
    }
    (0, runtime.deps.unlockPassiveStarEvolution)();
    (0, runtime.deps.calculateReachableNodes)();
    let nodeName = (0, runtime.nodes.getPassiveNodeDisplayName)(targetNode);
    let routeText = canPathActivate ? (0, runtime.deps._t)(" (최단 경로 {pointCost}개 노드)", { pointCost }) : "";
    (0, runtime.deps.addLog)((0, runtime.deps._t)("🌟 {nodeName} 활성화!{routeText}", { nodeName, routeText }), "loot-magic");
    (0, runtime.deps.updateStaticUI)();
  }
  function attributeChoices(runtime, attributeNodeCount) {
    return {
      kicker: (0, runtime.deps._t)("패시브 능력치"),
      title: attributeNodeCount > 1 ? (0, runtime.deps._t)("능력치 노드 {attributeNodeCount}개 선택", { attributeNodeCount }) : "능력치 노드 선택",
      message: attributeNodeCount > 1 ? "이번 최단 경로에 포함된 모든 능력치 노드에 같은 능력치를 적용합니다." : "이 노드에 저장할 능력치를 선택하세요.",
      confirmLabel: (0, runtime.deps._t)("능력치 적용"),
      choices: [
        { value: "strength", label: (0, runtime.deps._t)("◆ 힘"), detail: (0, runtime.deps._t)("생명력과 근접 계열 성장에 적합합니다.") },
        { value: "dexterity", label: (0, runtime.deps._t)("● 민첩"), detail: (0, runtime.deps._t)("회피/공격 속도/투사체 계열 성장에 적합합니다.") },
        { value: "intelligence", label: (0, runtime.deps._t)("✦ 지능"), detail: (0, runtime.deps._t)("에너지 보호막/주문/원소 계열 성장에 적합합니다.") }
      ]
    };
  }
  function previewAtPointer(runtime, options) {
    if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) renderPassiveTooltip(runtime, runtime.state.hoverNode, options.clientX, options.clientY);
  }
  function touchPreviewNeeded(runtime, options) {
    if (!options.fromTouch) return false;
    const now = Date.now();
    if (runtime.state.pendingTouchPassiveId !== runtime.state.hoverNode.id || now - runtime.state.pendingTouchPassiveAt > 1200) {
      runtime.state.pendingTouchPassiveId = runtime.state.hoverNode.id;
      runtime.state.pendingTouchPassiveAt = now;
      renderPassiveTooltip(runtime, runtime.state.hoverNode, options.clientX || 0, options.clientY || 0);
      (0, runtime.deps.addLog)((0, runtime.deps._t)("👆 패시브 노드 정보 확인됨. 같은 노드를 한 번 더 탭하면 활성화됩니다."), "loot-magic");
      return true;
    }
    return false;
  }

  // modules/ui/passive-scene-input.mjs
  function resizePassiveTreeCanvas(runtime, force) {
    const canvas = runtime.deps.document.getElementById("tree-canvas");
    if (!canvas) return false;
    let parent = canvas.parentElement || runtime.deps.document.getElementById("tree-container");
    if (!parent || canvas.offsetParent === null) return false;
    let rect = parent.getBoundingClientRect();
    let displayWidth = Math.max(1, Math.floor(rect.width / runtime.deps.uiDisplay.factor));
    let displayHeight = Math.max(1, Math.floor(rect.height / runtime.deps.uiDisplay.factor));
    if (displayWidth < 50 || displayHeight < 50) return false;
    let dpr = runtime.deps.passiveSelectionUi.pixelRatio();
    let bufferWidth = Math.max(1, Math.round(displayWidth * dpr));
    let bufferHeight = Math.max(1, Math.round(displayHeight * dpr));
    let changed = canvasSizeChanged(runtime, force, canvas, { bufferWidth, bufferHeight, displayWidth, displayHeight, dpr });
    if (!changed) return false;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    runtime.state.passiveCanvasMetrics.width = displayWidth;
    runtime.state.passiveCanvasMetrics.height = displayHeight;
    runtime.state.passiveCanvasMetrics.dpr = dpr;
    if (typeof runtime.deps.updatePassiveTreeOverlayTransform === "function") (0, runtime.deps.updatePassiveTreeOverlayTransform)(displayWidth, displayHeight);
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
  function hideCanvasTooltip(runtime) {
    runtime.deps.passiveSelectionUi.hide();
    if (!runtime.state.canvasTooltip) return;
    runtime.state.canvasTooltip.style.display = "none";
    (0, runtime.deps.clearActiveTooltip)("canvas-tooltip");
  }
  function updateHoverNode(runtime, clientX, clientY) {
    let oldHover = runtime.state.hoverNode;
    runtime.state.hoverNode = getPassiveNodeAtClientPosition(runtime, clientX, clientY, 0);
    if (oldHover !== runtime.state.hoverNode) {
      (0, runtime.deps.drawPassiveTree)();
      if (runtime.deps.uiDisplay.matches("(max-width: 1080px)")) return;
      if (runtime.state.hoverNode) renderPassiveTooltip(runtime, runtime.state.hoverNode, clientX, clientY);
      else hideCanvasTooltip(runtime);
    } else if (runtime.state.hoverNode) {
      (0, runtime.deps.positionTooltipElement)(runtime.state.canvasTooltip, clientX, clientY);
    }
  }
  function updateDrag(runtime, clientX, clientY, deltaX, deltaY) {
    runtime.state.camX = clientX / runtime.deps.uiDisplay.factor - runtime.state.dragStartX;
    runtime.state.camY = clientY / runtime.deps.uiDisplay.factor - runtime.state.dragStartY;
    clampPassiveCamera2(runtime);
    runtime.state.dragDist += Math.abs(deltaX) + Math.abs(deltaY);
    if (runtime.state.dragDist >= 10) {
      runtime.state.pendingTouchPassiveId = null;
      runtime.state.pendingTouchPassiveRefundId = null;
    }
    (0, runtime.deps.drawPassiveTree)();
    hideCanvasTooltip(runtime);
  }
  function setupCanvasEvents(runtime, setupBattlefieldMovementInteraction) {
    if (runtime.boundCanvas) return;
    runtime.deps.passiveSelectionUi.bindTools(runtime.handlers.listen);
    (0, runtime.deps.setupPassiveTreeSearchControls)();
    setupBattlefieldMovementInteraction();
    runtime.state.canvas = runtime.deps.document.getElementById("tree-canvas");
    if (!runtime.state.canvas) return;
    runtime.boundCanvas = runtime.state.canvas;
    runtime.state.canvasTooltip = runtime.deps.document.getElementById("canvas-tooltip");
    runtime.state.pendingTouchPassiveId = null;
    runtime.state.pendingTouchPassiveAt = 0;
    runtime.state.pendingTouchPassiveRefundId = null;
    runtime.state.pendingTouchPassiveRefundAt = 0;
    runtime.deps.window.hidePassiveNodeTooltip = runtime.handlers.hideCanvasTooltip;
    bindPassiveTreeMouseEvents(runtime, runtime.state.canvas, {
      drag: runtime.handlers.updateDrag,
      hover: runtime.handlers.updateHoverNode,
      hideTooltip: runtime.handlers.hideCanvasTooltip,
      activate: async (point) => {
        if (runtime.deps.uiDisplay.matches("(max-width: 1080px)")) {
          const node = getPassiveNodeAtClientPosition(runtime, point.clientX, point.clientY, 0);
          return runtime.deps.passiveSelectionUi.touch(node, point, { preview: runtime.handlers.renderPassiveTooltip, activate: runtime.handlers.activateHoveredPassive });
        }
        await activateHoveredPassive(runtime, point);
        if (runtime.state.hoverNode && runtime.state.canvasTooltip.style.display !== "none") {
          renderPassiveTooltip(runtime, runtime.state.hoverNode, point.clientX, point.clientY);
        }
      }
    });
    runtime.handlers.listen(runtime.state.canvas, "wheel", (e) => {
      e.preventDefault();
      let rect = runtime.state.canvas.getBoundingClientRect();
      let centerX = runtime.state.canvas.clientWidth / 2;
      let centerY = runtime.state.canvas.clientHeight / 2;
      let localX = (e.clientX - rect.left) * runtime.state.canvas.clientWidth / rect.width;
      let localY = (e.clientY - rect.top) * runtime.state.canvas.clientHeight / rect.height;
      let worldX = (localX - centerX - runtime.state.camX) / runtime.state.camZoom;
      let worldY = (localY - centerY - runtime.state.camY) / runtime.state.camZoom;
      runtime.state.camZoom *= e.deltaY > 0 ? 0.74 : 1.32;
      runtime.state.camZoom = (0, runtime.deps.clampNumber)(runtime.state.camZoom, 0.09, 2.5);
      runtime.state.camX = localX - centerX - worldX * runtime.state.camZoom;
      runtime.state.camY = localY - centerY - worldY * runtime.state.camZoom;
      clampPassiveCamera2(runtime);
      (0, runtime.deps.drawPassiveTree)();
    });
    runtime.deps.passiveSelectionUi.bindTouch(runtime.state.canvas, {
      drag: runtime.handlers.updateDrag,
      hideTooltip: runtime.handlers.hideCanvasTooltip,
      nodeAt: runtime.handlers.getPassiveNodeAtTouch,
      preview: runtime.handlers.renderPassiveTooltip,
      activate: runtime.handlers.activateHoveredPassive
    }, runtime.handlers.listen);
    resizePassiveTreeCanvas(runtime, true);
  }
  function bindPassiveTreeMouseEvents(runtime, canvas, handlers) {
    runtime.handlers.listen(canvas, "mousedown", (e) => {
      if (e.button !== 0) return;
      runtime.state.isDragging = true;
      runtime.state.dragDist = 0;
      runtime.state.dragStartX = e.clientX / runtime.deps.uiDisplay.factor - runtime.state.camX;
      runtime.state.dragStartY = e.clientY / runtime.deps.uiDisplay.factor - runtime.state.camY;
      handlers.hover(e.clientX, e.clientY);
      canvas.style.cursor = "grabbing";
    });
    runtime.handlers.listen(runtime.deps.document, "mousemove", (e) => {
      if (runtime.state.isDragging) {
        handlers.drag(e.clientX, e.clientY, e.movementX, e.movementY);
        return;
      }
      if (e.target === canvas) handlers.hover(e.clientX, e.clientY);
    }, true);
    runtime.handlers.listen(runtime.deps.document, "mouseup", (e) => {
      if (!runtime.state.isDragging || e.button !== 0) return;
      runtime.state.isDragging = false;
      canvas.style.cursor = "grab";
      if (e.target === canvas) handlers.activate({ clientX: e.clientX, clientY: e.clientY });
    }, true);
    runtime.handlers.listen(runtime.deps.window, "blur", () => {
      runtime.state.isDragging = false;
      canvas.style.cursor = "grab";
    });
    runtime.handlers.listen(canvas, "mouseleave", () => {
      if (runtime.state.isDragging || runtime.deps.uiDisplay.matches("(max-width: 1080px)")) return;
      runtime.state.hoverNode = null;
      canvas.style.cursor = "grab";
      (0, runtime.deps.drawPassiveTree)();
      handlers.hideTooltip();
    });
  }
  function canvasSizeChanged(runtime, force, canvas, dimensions) {
    const { bufferWidth, bufferHeight, displayWidth, displayHeight, dpr } = dimensions;
    return !!force || canvas.width !== bufferWidth || canvas.height !== bufferHeight || runtime.state.passiveCanvasMetrics.width !== displayWidth || runtime.state.passiveCanvasMetrics.height !== displayHeight || Math.abs((runtime.state.passiveCanvasMetrics.dpr || 1) - dpr) > 1e-3;
  }

  // modules/ui/passive-input-events.mjs
  function listen(runtime, target, type, handler, options) {
    target.addEventListener(type, handler, options);
    runtime.listeners.push({ target, type, handler, options });
  }
  function disposeCanvasEvents(runtime) {
    for (const { target, type, handler, options } of runtime.listeners) {
      target.removeEventListener(type, handler, options);
    }
    runtime.listeners.length = 0;
    runtime.boundCanvas = null;
    runtime.state.isDragging = false;
    runtime.state.hoverNode = null;
    runtime.deps.passiveSelectionUi.dispose();
    if (runtime.deps.window.hidePassiveNodeTooltip === runtime.handlers.hideCanvasTooltip) {
      delete runtime.deps.window.hidePassiveNodeTooltip;
    }
    runtime.state.canvas = null;
    runtime.state.canvasTooltip = null;
  }

  // modules/ui/passive-scene-reveal.mjs
  function cleanupPassiveBursts(runtime) {
    let now = runtime.deps.performance.now();
    runtime.state.passiveRevealBursts = runtime.state.passiveRevealBursts.filter((burst) => now - burst.startTime <= burst.duration + 250);
  }
  function getNodeRevealAmount(runtime, node) {
    let visibility = (0, runtime.deps.getPassiveVisibility)(node.id);
    if (visibility === "hidden") return 0;
    let amount = visibility === "preview" ? 0.14 : 1;
    let now = runtime.deps.performance.now();
    runtime.state.passiveRevealBursts.forEach((burst) => {
      if (burst.nodeIds.includes(node.id)) {
        let progress = (0, runtime.deps.clampNumber)((now - burst.startTime) / burst.duration, 0, 1);
        let dist = Math.hypot(node.x - burst.x, node.y - burst.y);
        let delay = (0, runtime.deps.clampNumber)(dist / Math.max(1, burst.radius) * 0.55, 0, 0.65);
        let anim = (0, runtime.deps.clampNumber)((progress - delay) / 0.24, 0, 1);
        amount = Math.max(amount, anim);
      }
    });
    return amount;
  }

  // modules/data/passive-node-art.mjs
  var PASSIVE_NODE_KIND_RADIUS = Object.freeze({
    start: 34,
    transcendent: 30,
    keystone: 31,
    void: 28,
    apex: 26,
    core: 24,
    deadend: 24,
    evolved: 24,
    major: 24,
    assist: 9
  });
  var PASSIVE_NODE_SOURCE_RADIUS = Object.freeze({ major: 24, normal: 14, assist: 9, minor: 9 });
  var PASSIVE_START_ICON_FAMILY = Object.freeze({
    occultist: "mystique",
    wanderer: "blade",
    cleric: "devotion",
    archer: "projectile",
    alchemist: "potion",
    warrior: "blade"
  });
  var PASSIVE_ICON_ATLAS_CELL = Object.freeze({
    blade: [0, 0],
    projectile: [1, 0],
    shield: [2, 0],
    potion: [3, 0],
    strength: [4, 0],
    mystique: [0, 1],
    devotion: [1, 1],
    cycle: [2, 1],
    elemental: [3, 1],
    dexterity: [4, 1],
    chaos: [0, 2],
    life: [1, 2],
    arcane: [2, 2],
    summon: [3, 2],
    intelligence: [4, 2],
    precision: [0, 3],
    wind: [1, 3],
    void: [2, 3],
    constellation: [3, 3],
    fire: [4, 3],
    cold: [0, 4],
    lightning: [1, 4],
    cooldown: [2, 4],
    critical: [3, 4],
    armor: [4, 4],
    evasion: [0, 5],
    energyShield: [1, 5],
    ignite: [2, 5],
    chill: [3, 5],
    freeze: [4, 5],
    shock: [0, 6],
    bleed: [1, 6],
    poison: [2, 6],
    // 2026-11-01 expansion-02: skill kinds and weapons, picked by hand or by the stat below
    wisp: [3, 6],
    blessing: [4, 6],
    mobility: [0, 7],
    area: [1, 7],
    slam: [2, 7],
    damageOverTime: [3, 7],
    spell: [4, 7],
    censer: [0, 8],
    greatsword: [1, 8],
    bow: [2, 8],
    orb: [3, 8]
  });
  var PASSIVE_ICON_ATLAS_COLUMNS = 5;
  var PASSIVE_ICON_ATLAS_ROWS = 9;
  var PASSIVE_NOTABLE_ICON_ATLAS_CELL = Object.freeze({
    notableEnergyShield: [0, 0],
    notableArmor: [1, 0],
    notableFire: [2, 0],
    notableCold: [3, 0],
    notableLightning: [0, 1],
    notableElementalResist: [1, 1],
    notableBleed: [2, 1],
    notableGem: [3, 1],
    notableAttackSpeed: [0, 2],
    notableMoveSpeed: [1, 2],
    notableLife: [2, 2],
    notableSpellInherent: [3, 2]
  });
  var PASSIVE_NOTABLE_ICON_FAMILY_BY_STAT = Object.freeze({
    energyShield: "notableEnergyShield",
    energyShieldPct: "notableEnergyShield",
    energyShieldRegen: "notableEnergyShield",
    energyShieldRechargeFaster: "notableEnergyShield",
    armor: "notableArmor",
    armorPct: "notableArmor",
    firePctDmg: "notableFire",
    addedFireDamagePct: "notableFire",
    coldPctDmg: "notableCold",
    addedColdDamagePct: "notableCold",
    lightPctDmg: "notableLightning",
    addedLightDamagePct: "notableLightning",
    resF: "notableElementalResist",
    resC: "notableElementalResist",
    resL: "notableElementalResist",
    resAll: "notableElementalResist",
    maxResF: "notableElementalResist",
    maxResC: "notableElementalResist",
    maxResL: "notableElementalResist",
    maxResAll: "notableElementalResist",
    bleedChance: "notableBleed",
    bleedDamageMultiplierPct: "notableBleed",
    bleedDamageReducePct: "notableBleed",
    gemLevel: "notableGem",
    suppCap: "notableGem",
    fireGemLevel: "notableGem",
    coldGemLevel: "notableGem",
    lightGemLevel: "notableGem",
    chaosGemLevel: "notableGem",
    physGemLevel: "notableGem",
    projectileGemLevel: "notableGem",
    meleeGemLevel: "notableGem",
    slamGemLevel: "notableGem",
    spellGemLevel: "notableGem",
    dotGemLevel: "notableGem",
    aoeGemLevel: "notableGem",
    elementalGemLevel: "notableGem",
    summonGemLevel: "notableGem",
    strGemLevel: "notableGem",
    dexGemLevel: "notableGem",
    intGemLevel: "notableGem",
    runeResonancePower: "notableGem",
    aspd: "notableAttackSpeed",
    move: "notableMoveSpeed",
    flatHp: "notableLife",
    pctHp: "notableLife",
    regen: "notableLife",
    spellFlatDmg: "notableSpellInherent",
    spellFlatPct: "notableSpellInherent"
  });
  var PASSIVE_KEYSTONE_ICON_CELL_BY_ID = Object.freeze({
    pt_core_keystone_01: [0, 0],
    pt_core_keystone_02: [1, 0],
    pt_core_keystone_03: [2, 0],
    pt_core_keystone_04: [3, 0],
    pt_core_keystone_05: [4, 0],
    pt_core_keystone_06: [5, 0],
    npqq5m7h2ri: [0, 1],
    n39ip40yc3d: [1, 1],
    nv67fzprmet: [2, 1],
    nkr7zwrymol: [3, 1],
    nxsxdk1yr2y: [4, 1],
    n2c51dapljo: [5, 1],
    nkf64engb6m: [0, 2],
    backbone_branch_occultist_cleric_center_occultist_cleric_channel_guard_keystone: [1, 2],
    backbone_branch_cleric_warrior_center_cleric_warrior_guard_regen_keystone: [2, 2],
    backbone_branch_warrior_wanderer_center_warrior_wanderer_roll_speed_keystone: [3, 2],
    backbone_branch_wanderer_archer_center_wanderer_archer_range_roll_keystone: [4, 2],
    backbone_branch_archer_alchemist_center_archer_alchemist_area_projectile_keystone: [5, 2],
    backbone_branch_alchemist_occultist_center_alchemist_occultist_energy_poison_keystone: [0, 3],
    backbone_branch_occultist_outer_2_mystique_single_keystone: [1, 3],
    backbone_branch_occultist_outer_4_occultist_summon_keystone: [2, 3],
    backbone_branch_cleric_outer_1_devotion_triple_keystone: [3, 3],
    backbone_branch_cleric_outer_4_cleric_summon_efficiency_keystone: [4, 3],
    backbone_branch_warrior_outer_1_cycle_reverse_keystone: [5, 3],
    backbone_branch_warrior_outer_4_warrior_bleed_keystone: [0, 4],
    backbone_branch_wanderer_outer_4_wanderer_duel_keystone: [1, 4],
    backbone_branch_archer_outer_4_archer_physical_keystone: [2, 4],
    backbone_branch_alchemist_outer_1_universal_flask_keystone: [3, 4],
    backbone_branch_alchemist_outer_2_universal_summon_keystone: [4, 4],
    backbone_branch_alchemist_outer_4_alchemist_resist_keystone: [5, 4],
    pt_warrior_blood_cradle: [0, 5]
  });
  var PASSIVE_KEYSTONE_ICON_ATLAS_ROWS = 6;
  var PASSIVE_TREE_FRAME_SHEET = Object.freeze({ small: [0, 24], medium: [26, 40], notable: [68, 56], keystone: [126, 72], void: [200, 56] });
  var PASSIVE_STAT_ICON_FAMILY = Object.freeze({
    voidLinkEfficiency: "void",
    attackPctDmg: "blade",
    projectileChain: "projectile",
    skillDelayReduce: "arcane",
    spellRepeatChance: "arcane",
    igniteDurationPct: "elemental",
    chillDurationPct: "elemental",
    freezeDurationPct: "elemental",
    shockDurationPct: "elemental",
    poisonDurationPct: "potion",
    bleedDurationPct: "blade",
    minDmgRoll: "blade",
    maxDmgRoll: "blade",
    ailmentPotencyPct: "damageOverTime",
    ailmentDamagePct: "damageOverTime",
    summonEfficiency: "summon",
    atk: "spell",
    utility: "cooldown",
    mystique: "mystique",
    devotion: "devotion",
    cycle: "cycle",
    projectilePctDmg: "projectile",
    projectileExtraShots: "projectile",
    accuracy: "projectile",
    accuracyBonusPct: "projectile",
    meleePctDmg: "blade",
    physPctDmg: "blade",
    slamPctDmg: "slam",
    flatDmg: "blade",
    strength: "strength",
    pctDmg: "blade",
    ds: "blade",
    bleedChance: "bleed",
    physIgnore: "blade",
    doubleDamageChance: "blade",
    addedPhysDamagePct: "blade",
    blockChance: "shield",
    blockChanceMax: "shield",
    shieldPctDmg: "shield",
    armor: "armor",
    armorPct: "armor",
    dr: "armor",
    deflectChance: "shield",
    takenDamageReduceWhen1EnemyPct: "shield",
    takenDamageReduceWhen2EnemiesPct: "shield",
    potionPctDmg: "potion",
    poisonChance: "poison",
    summonPctDmg: "summon",
    summonHpPct: "summon",
    summonGemLevel: "summon",
    summonCrit: "summon",
    summonCritDmg: "summon",
    summonFlatDmg: "summon",
    summonAspd: "summon",
    summonResPen: "summon",
    // 2026-11-01: Codex's 14 new pictures take the stats that used to share elemental, shield, precision, wind and arcane.
    firePctDmg: "fire",
    coldPctDmg: "cold",
    lightPctDmg: "lightning",
    elementalPctDmg: "elemental",
    resPen: "elemental",
    igniteChance: "ignite",
    chillChance: "chill",
    freezeChance: "freeze",
    shockChance: "shock",
    resF: "fire",
    resC: "cold",
    resL: "lightning",
    resAll: "elemental",
    aoePctDmg: "area",
    chillEffect: "chill",
    shockEffect: "shock",
    igniteDamageMultiplierPct: "ignite",
    shockedEnemyHitDamagePct: "shock",
    shockedEnemyHitDamageMorePct: "shock",
    addedFireDamagePct: "fire",
    addedColdDamagePct: "cold",
    addedLightDamagePct: "lightning",
    physTakenAsFire: "fire",
    physTakenAsCold: "cold",
    physTakenAsLight: "lightning",
    chaosPctDmg: "chaos",
    dotPctDmg: "damageOverTime",
    resChaos: "chaos",
    poisonDamageMultiplierPct: "poison",
    addedChaosDamagePct: "chaos",
    physTakenAsChaos: "chaos",
    flatHp: "life",
    pctHp: "life",
    regen: "life",
    leech: "life",
    leechTotalCap: "life",
    energyShield: "energyShield",
    energyShieldPct: "energyShield",
    energyShieldRegen: "energyShield",
    energyShieldRechargeFaster: "energyShield",
    spellPctDmg: "spell",
    spellFlatDmg: "spell",
    spellFlatPct: "spell",
    intelligence: "intelligence",
    dexterity: "dexterity",
    crit: "critical",
    critDmg: "critical",
    aspd: "precision",
    cooldownRecovery: "cooldown",
    cooldownReduction: "cooldown",
    mobilityCooldownRecovery: "mobility",
    mobilityCooldownReduction: "mobility",
    evasion: "evasion",
    evasionPct: "evasion",
    move: "wind",
    mobilityPctDmg: "mobility"
  });
  function createPassiveIconFamily(weaponConditionStats) {
    return Object.freeze({
      ...Object.fromEntries(Object.entries(weaponConditionStats).map(([id, line]) => [id, { greatsword: "blade", sword: "blade", bow: "projectile", orb: "arcane", flask: "potion", censer: "arcane" }[line.stance]])),
      ...PASSIVE_STAT_ICON_FAMILY
    });
  }

  // modules/ui/passive-node-description.mjs
  function getPassiveNodeDisplayName(runtime, node) {
    if (!node) return "미확인 성좌";
    if (node.intentionalNoEffect) return "무효";
    if (node.title) return (0, runtime.deps._t)(node.title);
    return (runtime.deps.P_STATS[node.stat] || {}).name || "미확인 성좌";
  }
  function getPassiveEffectLabel(runtime, node) {
    if (!node) return "";
    if (node.intentionalNoEffect) return "효과 없음";
    if (node.effectLabel) return node.effectLabel;
    if (node.kind === "void") return (0, runtime.deps.getVoidPassiveEffectLabel)(node.id);
    if (node.kind === "keystone") return (0, runtime.deps._t)(node.desc || "키스톤 효과");
    if (Array.isArray(node.effects) && node.effects.length > 0) {
      return combinedEffects(runtime, node);
    }
    return singleEffect(runtime, node);
  }
  function combinedEffects(runtime, node) {
    const effects = node.connectedDevotionPenalty ? (0, runtime.deps.getEffectivePassiveNodeEffects)(node) : node.effects;
    const labels = effects.map((effect) => effectLine(runtime, effect));
    if (node.connectedDevotionPenalty) {
      labels.push(`기본 +${node.val}%에서 직접 연결된 헌신 1개 할당마다 각각 ${node.connectedDevotionPenalty}%p 감소`);
    }
    if (node.activationRequirement) labels.push(activationLine(runtime, node));
    return labels.join("<br>");
  }
  function effectLine(runtime, effect) {
    const statInfo = runtime.deps.P_STATS[effect.stat] || {}, rawName = statInfo.name || (0, runtime.deps.getStatName)(effect.stat);
    const sign = Number(effect.val) >= 0 ? "+" : "";
    const statName = String(rawName).replace(/\s*\((\+%p|%)\)\s*/g, "").trim();
    const isPct = statInfo.name ? statInfo.isPct : /\(%\)/.test(rawName);
    return `${statName} ${sign}${(0, runtime.deps.formatValue)(effect.stat, effect.val)}${isPct ? "%" : ""}`;
  }
  function activationLine(runtime, node) {
    const state = (0, runtime.deps.getPassiveNodeActivationState)(node);
    const statName = state.statId === "devotion" ? "계시" : (0, runtime.deps.getStatName)(state.statId);
    const color = state.active ? "#9fe5bb" : "#ffaaaa";
    return `<span style="color:${color};">${state.active ? (0, runtime.deps._t)("활성") : (0, runtime.deps._t)("비활성")}, ${statName} ${state.available}/${state.required}</span>`;
  }
  function singleEffect(runtime, node) {
    if (!node.stat) return "";
    if (node.stat === "chaosResElemPenalty") {
      let value = (0, runtime.deps.formatValue)(node.stat, node.val);
      return (0, runtime.deps._t)("카오스 저항 +{value}% 및 모든 원소 저항 -{value2}%", { value, value2: value });
    }
    let stat = runtime.deps.P_STATS[node.stat] || {};
    let suffix = stat.isPct ? "%" : "";
    return `${stat.name || node.stat} +${(0, runtime.deps.formatValue)(node.stat, node.val)}${suffix}`;
  }
  var KIND_LABELS = Object.freeze({
    start: "직업 시작점",
    apex: "별끝 특수 노드",
    evolved: "각성 성좌",
    transcendent: "초월 성좌",
    core: "핵심 성좌",
    deadend: "막다른 길 거점",
    hub: "교차 거점"
  });
  function getPassiveKindLabel(node) {
    if (!node) return "성좌";
    if (Object.hasOwn(KIND_LABELS, node.kind)) return KIND_LABELS[node.kind];
    if (node.kind === "void") return node.voidRing === "outer" ? "직업 공허 소켓" : "공허 패시브";
    return sourceKindLabel(node);
  }
  function sourceKindLabel(node) {
    if (node.sourceType === "keystone" || node.kind === "keystone") return "키스톤";
    if (node.sourceType === "major" || node.kind === "major") return "주요 패시브";
    if (node.sourceType === "normal" || node.kind === "node") return "일반 패시브";
    if (["minor", "assist"].includes(node.sourceType) || ["path", "assist"].includes(node.kind)) return "소형 패시브";
    return "보조 노드";
  }

  // modules/rendering/passive-node-art.mjs
  function getPassiveNodeVisualRadius(node) {
    if (!node) return 6;
    if (node.kind === "hub") return 26;
    const kindRadius = PASSIVE_NODE_KIND_RADIUS[node.kind];
    if (kindRadius) return kindRadius;
    const sourceRadius = PASSIVE_NODE_SOURCE_RADIUS[node.sourceType];
    if (sourceRadius) return sourceRadius;
    return tierRadius(node);
  }
  function tierRadius(node) {
    if (node.tier === 0) return 34;
    if (node.tier >= 3) return 24;
    if (node.tier === 2 || node.kind === "ring" || node.kind === "inner") return 14;
    return 9;
  }
  var BASE_ACCENT = Object.freeze({
    activeOuter: "#f2dfb0",
    activeMid: "#d4ac63",
    activeGlow: "rgba(242,223,176,0.35)",
    reachOuter: "#88a8bd",
    reachMid: "#172029",
    reachGlow: "rgba(123,170,205,0.16)",
    previewOuter: "rgba(98,123,141,0.56)",
    previewMid: "rgba(16,21,28,0.82)",
    previewGlow: "rgba(92,124,151,0.1)",
    idleOuter: "rgba(142,160,179,0.92)",
    idleMid: "rgba(49,64,80,0.92)",
    idleInner: "rgba(85,105,126,0.95)",
    text: "#dce6f2"
  });
  var ACCENT_GROUPS = Object.freeze([
    [["flatHp", "pctHp", "regen", "leech"], Object.freeze({ activeOuter: "#9be1b9", activeMid: "#327858", activeGlow: "rgba(100,210,145,0.28)", reachOuter: "#6dc89b", reachMid: "#173127", previewOuter: "rgba(88,155,124,0.56)", idleOuter: "rgba(128,182,154,0.92)", text: "#c8ffe0" })],
    [["igniteChance", "chillChance", "freezeChance", "shockChance", "poisonChance", "bleedChance"], Object.freeze({ activeOuter: "#ff9bb6", activeMid: "#8a3a4d", activeGlow: "rgba(255,113,151,0.3)", reachOuter: "#e0708d", reachMid: "#361822", previewOuter: "rgba(164,82,105,0.56)", idleOuter: "rgba(194,112,133,0.92)", text: "#ffd8e2" })],
    [["armor", "armorPct", "evasion", "evasionPct", "deflectChance", "dr", "blockChance", "blockChancePct"], Object.freeze({ activeOuter: "#5dcaa5", activeMid: "#236753", activeGlow: "rgba(93,202,165,0.3)", reachOuter: "#4eb18f", reachMid: "#14312a", previewOuter: "rgba(69,137,116,0.56)", idleOuter: "rgba(98,169,147,0.92)", text: "#caffef" })],
    [["energyShield", "energyShieldPct", "energyShieldRegen"], Object.freeze({ activeOuter: "#b9c6ff", activeMid: "#4a5295", activeGlow: "rgba(132,154,255,0.32)", reachOuter: "#8999e6", reachMid: "#1d2344", previewOuter: "rgba(96,107,166,0.56)", idleOuter: "rgba(130,141,196,0.92)", text: "#e4e8ff" })],
    [["ailResIgnite", "ailResShock", "ailResFreeze", "ailResPoison", "ailResBleed"], Object.freeze({ activeOuter: "#d7e1ea", activeMid: "#667786", activeGlow: "rgba(188,207,222,0.26)", reachOuter: "#aab8c4", reachMid: "#26323c", previewOuter: "rgba(122,137,150,0.56)", idleOuter: "rgba(151,164,176,0.92)", text: "#edf5fb" })],
    [["flatDmg", "pctDmg", "meleePctDmg", "physPctDmg", "aoePctDmg", "ds", "physIgnore"], Object.freeze({ activeOuter: "#ffca8b", activeMid: "#865233", activeGlow: "rgba(255,174,94,0.28)", reachOuter: "#d39b69", reachMid: "#2f2118", previewOuter: "rgba(151,109,76,0.56)", idleOuter: "rgba(178,143,110,0.92)", text: "#ffe2c0" })],
    [["aspd", "move", "projectilePctDmg", "suppCap", "gemLevel", "expGain"], Object.freeze({ activeOuter: "#93e3e8", activeMid: "#2b6d79", activeGlow: "rgba(102,223,235,0.28)", reachOuter: "#6fb8c7", reachMid: "#15303b", previewOuter: "rgba(82,131,148,0.56)", idleOuter: "rgba(124,175,191,0.92)", text: "#cbfbff" })],
    [["crit", "critDmg", "chaosPctDmg", "resChaos"], Object.freeze({ activeOuter: "#d5a5ff", activeMid: "#64378f", activeGlow: "rgba(190,120,255,0.3)", reachOuter: "#a77bd4", reachMid: "#221732", previewOuter: "rgba(118,90,156,0.56)", idleOuter: "rgba(152,125,191,0.92)", text: "#efd9ff" })],
    [["firePctDmg", "resF"], Object.freeze({ activeOuter: "#ffb08d", activeMid: "#8c4030", activeGlow: "rgba(255,130,94,0.3)", reachOuter: "#d08c72", reachMid: "#351a15", previewOuter: "rgba(146,88,73,0.56)", idleOuter: "rgba(183,129,118,0.92)", text: "#ffe1d2" })],
    [["coldPctDmg", "resC"], Object.freeze({ activeOuter: "#a5ddff", activeMid: "#356d95", activeGlow: "rgba(128,208,255,0.3)", reachOuter: "#7db8d8", reachMid: "#172b39", previewOuter: "rgba(84,123,148,0.56)", idleOuter: "rgba(126,164,189,0.92)", text: "#dff5ff" })],
    [["lightPctDmg", "resL", "elementalPctDmg", "resAll", "resPen"], Object.freeze({ activeOuter: "#f6dc8f", activeMid: "#8a6e30", activeGlow: "rgba(255,214,91,0.28)", reachOuter: "#ceb768", reachMid: "#302815", previewOuter: "rgba(151,133,73,0.56)", idleOuter: "rgba(183,167,114,0.92)", text: "#fff0c0" })]
  ]);
  function getPassiveStatAccent(statId) {
    const group = ACCENT_GROUPS.find(([stats]) => stats.includes(statId));
    return { ...BASE_ACCENT, ...group ? group[1] : {} };
  }
  function tracePassiveLinkSegment(ctx, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance <= 0) return false;
    const startInset = getPassiveNodeVisualRadius(a) + 2;
    const endInset = getPassiveNodeVisualRadius(b) + 2;
    if (distance <= startInset + endInset) return false;
    const ux = dx / distance;
    const uy = dy / distance;
    ctx.moveTo(a.x + ux * startInset, a.y + uy * startInset);
    ctx.lineTo(b.x - ux * endInset, b.y - uy * endInset);
    return true;
  }
  function getPassiveNodeIconFamily(runtime, node) {
    if (!node) return null;
    if (node.kind === "void") return "void";
    return (node.iconFamily && PASSIVE_ICON_ATLAS_CELL[node.iconFamily] ? node.iconFamily : null) || runtime.iconFamily[node.stat] || runtime.iconFamily[node.archetype] || runtime.iconFamily[node.cat] || PASSIVE_START_ICON_FAMILY[node.startClassId] || null;
  }
  function getPassiveTreeArtImage(runtime, key) {
    const image = runtime.deps.battleAssets && runtime.deps.battleAssets.images ? runtime.deps.battleAssets.images[key] : null;
    if (!image || !image.complete || !(image.naturalWidth || image.width)) return null;
    return image;
  }
  function getPassiveKeystoneIconCell(node) {
    return PASSIVE_KEYSTONE_ICON_CELL_BY_ID[node.id] || PASSIVE_KEYSTONE_ICON_CELL_BY_ID[String(node.keystoneEffectId || "").replace("keystone:", "")];
  }
  function getPassiveNodeAtlasArt(runtime, node) {
    const keystone = keystoneArt(runtime, node);
    if (keystone) return keystone;
    return regularArt(runtime, node);
  }
  function keystoneArt(runtime, node) {
    let keystoneCell = node && node.kind === "keystone" ? getPassiveKeystoneIconCell(node) : null;
    let keystoneImage = keystoneCell && getPassiveTreeArtImage(runtime, "passiveTreeKeystoneIcons");
    if (keystoneImage) return { image: keystoneImage, cell: keystoneCell, columns: 6, rows: PASSIVE_KEYSTONE_ICON_ATLAS_ROWS };
    return null;
  }
  function regularArt(runtime, node) {
    let family = node && (PASSIVE_NOTABLE_ICON_ATLAS_CELL[node.iconFamily] ? node.iconFamily : PASSIVE_NOTABLE_ICON_FAMILY_BY_STAT[node.stat]);
    let notableCell = PASSIVE_NOTABLE_ICON_ATLAS_CELL[family];
    let notableImage = notableCell && getPassiveTreeArtImage(runtime, "passiveTreeNotableIcons");
    if (notableImage) return { image: notableImage, cell: notableCell, columns: 4, rows: 3 };
    let baseCell = PASSIVE_ICON_ATLAS_CELL[getPassiveNodeIconFamily(runtime, node)];
    let baseImage = baseCell && getPassiveTreeArtImage(runtime, "passiveTreeIcons");
    return baseImage ? { image: baseImage, cell: baseCell, columns: PASSIVE_ICON_ATLAS_COLUMNS, rows: PASSIVE_ICON_ATLAS_ROWS } : null;
  }
  function isPassiveFramedNode(node) {
    if (!node) return false;
    return node.kind === "start" || node.kind === "keystone" || node.kind === "void" || node.kind === "hub" || node.kind === "apex" || node.kind === "core" || node.kind === "major" || node.tier >= 3;
  }
  function isPassiveImageSlotNode(node) {
    return !!node && node.kind === "void";
  }

  // modules/rendering/passive-node-glyphs.mjs
  function tracePassiveBladeIcon(ctx, r) {
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r * 0.45);
    ctx.moveTo(-r * 0.45, r * 0.22);
    ctx.lineTo(r * 0.45, r * 0.22);
    ctx.moveTo(-r * 0.18, r);
    ctx.lineTo(0, r * 0.45);
    ctx.lineTo(r * 0.18, r);
  }
  function tracePassiveProjectileIcon(ctx, r) {
    ctx.moveTo(-r, r * 0.5);
    ctx.lineTo(r, -r * 0.5);
    ctx.moveTo(r, -r * 0.5);
    ctx.lineTo(r * 0.35, -r * 0.62);
    ctx.moveTo(r, -r * 0.5);
    ctx.lineTo(r * 0.62, r * 0.05);
  }
  function tracePassiveShieldIcon(ctx, r) {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.72, -r * 0.52);
    ctx.lineTo(r * 0.56, r * 0.45);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.56, r * 0.45);
    ctx.lineTo(-r * 0.72, -r * 0.52);
    ctx.closePath();
  }
  function tracePassivePotionIcon(ctx, r) {
    ctx.moveTo(-r * 0.34, -r);
    ctx.lineTo(r * 0.34, -r);
    ctx.lineTo(r * 0.3, -r * 0.42);
    ctx.lineTo(r * 0.72, r * 0.62);
    ctx.lineTo(r * 0.45, r);
    ctx.lineTo(-r * 0.45, r);
    ctx.lineTo(-r * 0.72, r * 0.62);
    ctx.lineTo(-r * 0.3, -r * 0.42);
    ctx.closePath();
  }
  function tracePassiveEyeIcon(ctx, r) {
    ctx.moveTo(-r, 0);
    ctx.lineTo(0, -r * 0.62);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r * 0.62);
    ctx.closePath();
    ctx.moveTo(r * 0.28, 0);
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  }
  function tracePassiveCubeIcon(ctx, r) {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.82, -r * 0.45);
    ctx.lineTo(r * 0.82, r * 0.45);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.82, r * 0.45);
    ctx.lineTo(-r * 0.82, -r * 0.45);
    ctx.closePath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, r);
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.82, -r * 0.45);
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.82, -r * 0.45);
  }
  function tracePassiveCycleIcon(ctx, r) {
    ctx.arc(0, 0, r * 0.72, -Math.PI * 0.15, Math.PI * 1.25);
    ctx.moveTo(-r * 0.62, -r * 0.45);
    ctx.lineTo(-r * 0.92, -r * 0.16);
    ctx.lineTo(-r * 0.48, -r * 0.08);
  }
  function tracePassiveElementIcon(ctx, r) {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, r * 0.48);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.7, r * 0.48);
    ctx.closePath();
    ctx.moveTo(0, -r * 0.42);
    ctx.lineTo(r * 0.25, r * 0.32);
    ctx.lineTo(-r * 0.25, r * 0.32);
    ctx.closePath();
  }
  function tracePassiveChaosIcon(ctx, r) {
    ctx.moveTo(-r * 0.9, -r * 0.2);
    ctx.lineTo(-r * 0.25, -r * 0.72);
    ctx.lineTo(r * 0.5, -r * 0.5);
    ctx.lineTo(r * 0.9, r * 0.18);
    ctx.lineTo(r * 0.2, r * 0.76);
    ctx.lineTo(-r * 0.58, r * 0.5);
    ctx.closePath();
    ctx.moveTo(r * 0.24, 0);
    ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
  }
  function tracePassiveLifeIcon(ctx, r) {
    ctx.moveTo(0, r);
    ctx.lineTo(-r * 0.82, r * 0.06);
    ctx.lineTo(-r * 0.58, -r * 0.62);
    ctx.lineTo(0, -r * 0.28);
    ctx.lineTo(r * 0.58, -r * 0.62);
    ctx.lineTo(r * 0.82, r * 0.06);
    ctx.closePath();
  }
  function tracePassiveArcaneIcon(ctx, r) {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.86, r * 0.52);
    ctx.lineTo(-r * 0.86, r * 0.52);
    ctx.closePath();
    ctx.moveTo(0, -r * 0.38);
    ctx.lineTo(0, r * 0.52);
  }
  function tracePassiveSummonIcon(ctx, r) {
    ctx.moveTo(r * 0.45, r * 0.3);
    ctx.arc(0, r * 0.3, r * 0.45, 0, Math.PI * 2);
    [-0.58, -0.2, 0.2, 0.58].forEach((x) => {
      ctx.moveTo(x * r + r * 0.18, -r * 0.38);
      ctx.arc(x * r, -r * 0.38, r * 0.18, 0, Math.PI * 2);
    });
  }
  function tracePassivePrecisionIcon(ctx, r) {
    ctx.moveTo(r, 0);
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.moveTo(r * 0.42, 0);
    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
  }
  function tracePassiveWindIcon(ctx, r) {
    ctx.moveTo(-r, -r * 0.48);
    ctx.lineTo(r * 0.55, -r * 0.48);
    ctx.lineTo(r, -r * 0.2);
    ctx.moveTo(-r * 0.7, 0);
    ctx.lineTo(r * 0.35, 0);
    ctx.lineTo(r * 0.72, r * 0.25);
    ctx.moveTo(-r, r * 0.48);
    ctx.lineTo(r * 0.58, r * 0.48);
  }
  function tracePassiveAttributeIcon(ctx, r) {
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.3, -r * 0.28);
    ctx.lineTo(r, 0);
    ctx.lineTo(r * 0.3, r * 0.28);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.3, r * 0.28);
    ctx.lineTo(-r, 0);
    ctx.lineTo(-r * 0.3, -r * 0.28);
    ctx.closePath();
  }
  function tracePassiveVoidIcon(ctx, r) {
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.moveTo(r * 0.48, 0);
    ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
  }
  function tracePassiveConstellationIcon(ctx, r) {
    const points = [[-0.72, -0.32], [0.12, -0.72], [0.72, 0.1], [-0.18, 0.72]];
    points.forEach(([x, y], index) => {
      const next = points[(index + 1) % points.length];
      ctx.moveTo(x * r, y * r);
      ctx.lineTo(next[0] * r, next[1] * r);
      ctx.moveTo(x * r + r * 0.12, y * r);
      ctx.arc(x * r, y * r, r * 0.12, 0, Math.PI * 2);
    });
  }
  var PASSIVE_ICON_TRACERS = Object.freeze({
    blade: tracePassiveBladeIcon,
    projectile: tracePassiveProjectileIcon,
    shield: tracePassiveShieldIcon,
    potion: tracePassivePotionIcon,
    mystique: tracePassiveEyeIcon,
    devotion: tracePassiveCubeIcon,
    cycle: tracePassiveCycleIcon,
    elemental: tracePassiveElementIcon,
    chaos: tracePassiveChaosIcon,
    life: tracePassiveLifeIcon,
    arcane: tracePassiveArcaneIcon,
    summon: tracePassiveSummonIcon,
    precision: tracePassivePrecisionIcon,
    wind: tracePassiveWindIcon,
    strength: tracePassiveAttributeIcon,
    dexterity: tracePassiveAttributeIcon,
    intelligence: tracePassiveAttributeIcon,
    void: tracePassiveVoidIcon,
    constellation: tracePassiveConstellationIcon,
    // the 2026-11-01 families fall back to the nearest older tracer while the sheet is still loading
    fire: tracePassiveElementIcon,
    cold: tracePassiveElementIcon,
    lightning: tracePassiveElementIcon,
    ignite: tracePassiveElementIcon,
    chill: tracePassiveElementIcon,
    freeze: tracePassiveElementIcon,
    shock: tracePassiveElementIcon,
    critical: tracePassivePrecisionIcon,
    armor: tracePassiveShieldIcon,
    evasion: tracePassiveWindIcon,
    energyShield: tracePassiveArcaneIcon,
    cooldown: tracePassiveCycleIcon,
    bleed: tracePassiveBladeIcon,
    poison: tracePassivePotionIcon,
    wisp: tracePassiveSummonIcon,
    blessing: tracePassiveCubeIcon,
    mobility: tracePassiveWindIcon,
    area: tracePassiveElementIcon,
    slam: tracePassiveBladeIcon,
    damageOverTime: tracePassiveChaosIcon,
    spell: tracePassiveArcaneIcon,
    censer: tracePassivePotionIcon,
    greatsword: tracePassiveBladeIcon,
    bow: tracePassiveProjectileIcon,
    orb: tracePassiveArcaneIcon
  });
  function drawPassiveNodeIcon(runtime, ctx, node, radius, color) {
    const tracer = PASSIVE_ICON_TRACERS[getPassiveNodeIconFamily(runtime, node)];
    if (!tracer) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.1, radius * 0.1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    tracer(ctx, radius * 0.48);
    ctx.stroke();
    ctx.restore();
  }

  // modules/ui/passive-node-presentation.mjs
  function createPassiveNodePresentation(deps) {
    const runtime = { deps, iconFamily: createPassiveIconFamily(deps.WEAPON_CONDITION_STATS) };
    return Object.freeze({
      iconFamily: runtime.iconFamily,
      iconAtlasCell: PASSIVE_ICON_ATLAS_CELL,
      frameSheet: PASSIVE_TREE_FRAME_SHEET,
      getPassiveNodeDisplayName: getPassiveNodeDisplayName.bind(void 0, runtime),
      getPassiveEffectLabel: getPassiveEffectLabel.bind(void 0, runtime),
      getPassiveKindLabel,
      getPassiveNodeVisualRadius,
      getPassiveStatAccent,
      tracePassiveLinkSegment,
      getPassiveNodeIconFamily: getPassiveNodeIconFamily.bind(void 0, runtime),
      getPassiveTreeArtImage: getPassiveTreeArtImage.bind(void 0, runtime),
      getPassiveNodeAtlasArt: getPassiveNodeAtlasArt.bind(void 0, runtime),
      isPassiveFramedNode,
      isPassiveImageSlotNode,
      drawPassiveNodeIcon: drawPassiveNodeIcon.bind(void 0, runtime)
    });
  }

  // modules/ui/passive-scene-view.mjs
  function createPassiveScene(deps) {
    const runtime = { deps, state: {}, handlers: {}, listeners: [], boundCanvas: null, nodes: createPassiveNodePresentation(deps) };
    const handlers = { hideCanvasTooltip, updateDrag, updateHoverNode, getPassiveNodeAtTouch, renderPassiveTooltip, activateHoveredPassive, getPassiveTreeViewAngle, syncPassiveTreeView, clampPassiveCamera: clampPassiveCamera2, fitPassiveCameraToBounds: fitPassiveCameraToBounds2, cleanupPassiveBursts, getNodeRevealAmount, markPassiveRenderCacheDirty, ensurePassiveRenderCache, getPassiveWorldViewport, isNodeInViewport, isEdgeInViewport, resizePassiveTreeCanvas, setupCanvasEvents };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.handlers.listen = listen.bind(void 0, runtime);
    runtime.handlers.dispose = disposeCanvasEvents.bind(void 0, runtime);
    initialize(runtime);
    return Object.freeze({
      state: runtime.state,
      nodes: runtime.nodes,
      dispose: runtime.handlers.dispose,
      getPassiveTreeViewAngle: runtime.handlers.getPassiveTreeViewAngle,
      syncPassiveTreeView: runtime.handlers.syncPassiveTreeView,
      clampPassiveCamera: runtime.handlers.clampPassiveCamera,
      fitPassiveCameraToBounds: runtime.handlers.fitPassiveCameraToBounds,
      cleanupPassiveBursts: runtime.handlers.cleanupPassiveBursts,
      getNodeRevealAmount: runtime.handlers.getNodeRevealAmount,
      markPassiveRenderCacheDirty: runtime.handlers.markPassiveRenderCacheDirty,
      ensurePassiveRenderCache: runtime.handlers.ensurePassiveRenderCache,
      getPassiveWorldViewport: runtime.handlers.getPassiveWorldViewport,
      isNodeInViewport: runtime.handlers.isNodeInViewport,
      isEdgeInViewport: runtime.handlers.isEdgeInViewport,
      resizePassiveTreeCanvas: runtime.handlers.resizePassiveTreeCanvas,
      setupCanvasEvents: runtime.handlers.setupCanvasEvents
    });
  }
  function initialize(runtime) {
    runtime.state.passiveRevealBursts = [];
    runtime.state.passiveTreeViewAngle = 0;
    runtime.state.hoverNode = null;
    runtime.state.camX = 0;
    runtime.state.camY = 0;
    runtime.state.camZoom = 0.3;
    runtime.state.passiveCameraInitialized = false;
    runtime.state.passiveCanvasMetrics = { width: 0, height: 0, dpr: 1 };
    runtime.state.passiveRenderCache = {
      structureDirty: true,
      stateDirty: true,
      nodes: [],
      edges: [],
      glowNodes: [],
      activeEdges: [],
      hoverGrid: /* @__PURE__ */ new Map(),
      adjacency: /* @__PURE__ */ new Map(),
      hoverPath: null,
      cellSize: 180,
      stateSignature: ""
    };
    runtime.state.isDragging = false;
    runtime.state.dragStartX = 0;
    runtime.state.dragStartY = 0;
    runtime.state.dragDist = 0;
    runtime.state.canvas = null;
    runtime.state.canvasTooltip = null;
    runtime.state.pendingTouchPassiveId = null;
    runtime.state.pendingTouchPassiveAt = null;
    runtime.state.pendingTouchPassiveRefundId = null;
    runtime.state.pendingTouchPassiveRefundAt = null;
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/ui/passive-discovery-view.mjs
  var PassiveDiscoveryView = class {
    constructor(deps, scene) {
      this.deps = deps;
      this.scene = scene;
      this.effects = {
        passiveRenderDirty: scene.markPassiveRenderCacheDirty,
        passiveRevealBurst: this.presentBurst.bind(this)
      };
      this.calculateReachability = this.calculateReachability.bind(this);
      this.refreshDiscovery = this.refreshDiscovery.bind(this);
      this.revealNodes = this.revealNodes.bind(this);
      this.visibilityForNode = this.visibilityForNode.bind(this);
    }
    calculateReachability() {
      return consumeDomainCommands(this.deps.rules.calculateReachableNodes(this.deps.game), this.effects);
    }
    refreshDiscovery() {
      return consumeDomainCommands(this.deps.rules.refreshPassiveVisibility(this.deps.game), this.effects);
    }
    revealNodes(nodeId, options) {
      return consumeDomainCommands(this.deps.rules.revealAroundNode(this.deps.game, nodeId, options), this.effects);
    }
    visibilityForNode(nodeId) {
      return this.deps.rules.getPassiveVisibility(this.deps.game, nodeId);
    }
    presentBurst(details) {
      const burst = { ...details, startTime: this.deps.performance.now() };
      this.scene.state.passiveRevealBursts.push(burst);
      const showOverlay = this.deps.spawnPassiveRevealBurstOverlay;
      if (typeof showOverlay === "function") showOverlay(burst);
    }
  };

  // modules/ui/passive-selection-actions.mjs
  function refreshGuide(ctx) {
    if (typeof ctx.deps.tutorialActionUi === "object") ctx.deps.tutorialActionUi.refresh();
  }
  function hide(ctx) {
    ctx.state.selection = null;
    const panel = ctx.deps.document.getElementById("passive-mobile-detail");
    if (panel) panel.hidden = true;
    refreshGuide(ctx);
  }
  function confirmLabel(ctx, node, owned, cost) {
    if (owned) return node.kind === "void" ? "공허 제작" : "노드 반환 (포자 1개)";
    return node.kind === "start" ? "시작점, 이미 열림" : (0, ctx.deps._t)("{cost}포인트 사용", { cost });
  }
  function canAct(ctx, node, cost) {
    if (ctx.deps.game.passives.includes(node.id) && node.kind === "void") return true;
    if (ctx.deps.game.woodsmanBuildLock) return false;
    if (!ctx.deps.game.passives.includes(node.id)) return cost > 0 && ctx.deps.game.passivePoints >= cost;
    return (0, ctx.deps.canRefundPassiveNode)(node.id) && ctx.deps.game.currencies.blightSpore > 0;
  }
  function actionHint(ctx, node, owned, cost) {
    if (owned && node.kind === "void") return "할당한 공허의 옵션을 확인하고 제작합니다.";
    if (ctx.deps.game.woodsmanBuildLock) return "나무꾼 전투 중에는 스킬트리를 변경할 수 없습니다.";
    if (node.kind === "start") return "시작점은 무료입니다.";
    if (owned) return refundHint(ctx, node);
    if (!cost) return "먼저 연결된 노드를 할당해 주세요.";
    return (0, ctx.deps._t)("필요 {cost}포인트, 보유 {passivePoints}포인트{value}", { cost, passivePoints: ctx.deps.game.passivePoints, value: ctx.deps.game.passivePoints < cost ? (0, ctx.deps._t)(", 포인트 부족") : "" });
  }
  function refundHint(ctx, node) {
    if (!(0, ctx.deps.canRefundPassiveNode)(node.id)) return "연결이나 포인트 한도 유지에 필요한 노드입니다.";
    return (0, ctx.deps._t)("반환 비용: 마름병 포자 1개, 보유 {blightSpore}개", { blightSpore: ctx.deps.game.currencies.blightSpore || 0 });
  }
  function pixelRatio(ctx) {
    const deviceDpr = ctx.deps.window.devicePixelRatio || 1;
    return Math.max(1, (ctx.deps.uiDisplay.matches("(max-width: 1080px)") ? Math.min(2, deviceDpr) : deviceDpr) * ctx.deps.uiDisplay.factor);
  }
  function pathNodeDescription(ctx, id, index) {
    const node = ctx.deps.PASSIVE_TREE.nodes[id];
    const name = (0, ctx.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node);
    const effect = node.kind === "attribute" ? "힘, 민첩, 지능 중 다음 단계에서 선택" : (0, ctx.deps.normalizePassiveTooltipText)((0, ctx.deps.passiveNodePresentation.getPassiveEffectLabel)(node).replace(/<br\s*\/?>/gi, " / "));
    const description = effect.startsWith(name + " ") ? effect : `${name}${effect ? "\n" + effect : ""}`;
    return `${index + 1}. ${description}`;
  }
  function confirmPath(ctx, node, path) {
    const notes = [];
    if (path.some((id) => ctx.deps.PASSIVE_TREE.nodes[id].kind === "attribute")) {
      notes.push("능력치 노드는 다음 단계에서 선택하며, 선택을 취소하면 포인트를 쓰지 않습니다.");
    }
    if (path.some((id) => ctx.deps.PASSIVE_TREE.nodes[id].activationRequirement || ctx.deps.PASSIVE_TREE.nodes[id].connectedDevotionPenalty)) {
      notes.push("조건부 효과와 연결 보정은 현재 투자 상태 기준입니다.");
    }
    const message = ["함께 활성화할 노드", ...path.map(ctx.handlers.pathNodeDescription), ...notes].join("\n\n");
    return (0, ctx.deps.requestGameConfirmation)(message, {
      title: (0, ctx.deps._t)("{node}까지 활성화", { node: (0, ctx.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node) }),
      kicker: (0, ctx.deps._t)("최단 경로 노드 {length}개", { length: path.length }),
      confirmLabel: (0, ctx.deps._t)("{length}포인트 사용", { length: path.length })
    });
  }
  function present(ctx, node, tooltip, position) {
    if (!ctx.deps.uiDisplay.matches("(max-width: 1080px)")) {
      (0, ctx.deps.invalidateTooltipSize)(tooltip);
      tooltip.style.display = "block";
      (0, ctx.deps.positionTooltipElement)(tooltip, position.x, position.y);
      (0, ctx.deps.setActiveTooltip)("canvas-tooltip");
      return;
    }
    tooltip.style.display = "none";
    (0, ctx.deps.clearActiveTooltip)("canvas-tooltip");
    let panel = ctx.deps.document.getElementById("passive-mobile-detail");
    if (!panel) {
      panel = ctx.deps.document.createElement("section");
      panel.id = "passive-mobile-detail";
      panel.setAttribute("aria-label", (0, ctx.deps._t)("선택한 노드"));
      ctx.deps.document.getElementById("tab-char").appendChild(panel);
    }
    const owned = ctx.deps.game.passives.includes(node.id);
    const path = (0, ctx.deps.getPassiveActivationPath)(node.id);
    const cost = path.length;
    const enabled = canAct(ctx, node, cost);
    const label = confirmLabel(ctx, node, owned, cost);
    panel.dataset.nodeId = node.id;
    panel.innerHTML = `<header><strong>${(0, ctx.deps._t)("선택한 노드")}</strong><button type="button" data-passive-close aria-label="${(0, ctx.deps._t)("노드 설명 닫기")}">${(0, ctx.deps._t)("닫기")}</button></header><div class="passive-mobile-description">${tooltip.innerHTML}</div><footer><p id="passive-mobile-action-hint" role="status">${actionHint(ctx, node, owned, cost)}</p><button type="button" data-passive-confirm aria-describedby="passive-mobile-action-hint" ${enabled ? "" : "disabled"}>${label}</button></footer>`;
    panel.hidden = false;
    panel.querySelector("[data-passive-close]").onclick = ctx.handlers.hide;
    panel.querySelector("[data-passive-confirm]").onclick = ctx.handlers.confirmSelection;
    refreshGuide(ctx);
  }
  async function confirmSelection(ctx) {
    const current = ctx.state.selection;
    if (!current) return;
    const panel = ctx.deps.document.getElementById("passive-mobile-detail");
    const button = panel.querySelector("[data-passive-confirm]");
    if (panel.hidden || button.disabled) return;
    button.disabled = true;
    hide(ctx);
    await current.actions.activate({ nodeId: current.node.id, ...current.point });
  }
  function touch(ctx, node, point, actions) {
    if (ctx.deps.dragDist >= 10 || !node) return;
    if (ctx.deps.uiDisplay.matches("(max-width: 1080px)")) {
      ctx.state.selection = { node, point: { clientX: point.clientX, clientY: point.clientY }, actions };
      actions.preview(node, point.clientX, point.clientY);
      return;
    }
    actions.activate({ fromTouch: true, nodeId: node.id, clientX: point.clientX, clientY: point.clientY });
  }
  function bindTools(ctx, listen2) {
    const toolbar = ctx.deps.document.querySelector(".passive-tree-toolbar");
    listen2(toolbar, "click", (event) => {
      if (!ctx.deps.uiDisplay.matches("(max-width: 1080px)")) return;
      const trigger = event.target.closest("summary, .passive-investment-summary-toggle");
      if (!trigger) return;
      hide(ctx);
      for (const drawer of toolbar.querySelectorAll("details")) {
        if (!drawer.contains(trigger)) drawer.open = false;
      }
      if (trigger.tagName === "SUMMARY") {
        ctx.deps.game.settings.passiveInvestmentSummaryCollapsed = true;
        (0, ctx.deps.renderPassiveInvestmentSummary)();
      }
    }, true);
    bindCameraTools(ctx, listen2);
  }
  function bindCameraTools(ctx, listen2) {
    const container = ctx.deps.document.getElementById("tree-container");
    const controls = ctx.deps.document.createElement("nav");
    controls.className = "passive-mobile-camera";
    controls.setAttribute("aria-label", (0, ctx.deps._t)("스킬트리 화면 조절"));
    controls.innerHTML = '<button type="button" data-tree-view="out" aria-label="스킬트리 축소">−</button><button type="button" data-tree-view="fit">내 트리</button><button type="button" data-tree-view="in" aria-label="스킬트리 확대">+</button>';
    listen2(controls, "click", (event) => {
      const button = event.target.closest("[data-tree-view]");
      if (!button) return;
      hide(ctx);
      if (button.dataset.treeView === "fit") (0, ctx.deps.fitPassiveCameraToBounds)(true);
      else {
        const zoom = (0, ctx.deps.clampNumber)(ctx.deps.camZoom * (button.dataset.treeView === "in" ? 1.3 : 1 / 1.3), 0.09, 2.5);
        ctx.deps.camX *= zoom / ctx.deps.camZoom;
        ctx.deps.camY *= zoom / ctx.deps.camZoom;
        ctx.deps.camZoom = zoom;
        (0, ctx.deps.clampPassiveCamera)();
      }
      (0, ctx.deps.drawPassiveTree)();
    });
    container.appendChild(controls);
    ctx.state.controls = controls;
  }
  function pinchPoint(ctx, canvas, touches) {
    const rect = canvas.getBoundingClientRect();
    return {
      distance: Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY),
      x: ((touches[0].clientX + touches[1].clientX) / 2 - rect.left) * canvas.clientWidth / rect.width - canvas.clientWidth / 2,
      y: ((touches[0].clientY + touches[1].clientY) / 2 - rect.top) * canvas.clientHeight / rect.height - canvas.clientHeight / 2
    };
  }
  function startPinch(ctx, canvas, touches, gesture) {
    const point = pinchPoint(ctx, canvas, touches);
    Object.assign(gesture, {
      pinched: true,
      distance: point.distance,
      zoom: ctx.deps.camZoom,
      anchorX: (point.x - ctx.deps.camX) / ctx.deps.camZoom,
      anchorY: (point.y - ctx.deps.camY) / ctx.deps.camZoom
    });
    ctx.deps.isDragging = false;
    ctx.deps.dragDist = 10;
  }
  function startDrag(ctx, point, gesture) {
    ctx.deps.isDragging = true;
    ctx.deps.dragStartX = point.clientX / ctx.deps.uiDisplay.factor - ctx.deps.camX;
    ctx.deps.dragStartY = point.clientY / ctx.deps.uiDisplay.factor - ctx.deps.camY;
    gesture.x = point.clientX;
    gesture.y = point.clientY;
  }
  function moveTouch(ctx, event, canvas, gesture, handlers) {
    event.preventDefault();
    if (event.touches.length >= 2) {
      if (!gesture.distance) startPinch(ctx, canvas, event.touches, gesture);
      const point2 = pinchPoint(ctx, canvas, event.touches);
      if (!gesture.distance) return;
      ctx.deps.camZoom = (0, ctx.deps.clampNumber)(gesture.zoom * point2.distance / gesture.distance, 0.09, 2.5);
      ctx.deps.camX = point2.x - gesture.anchorX * ctx.deps.camZoom;
      ctx.deps.camY = point2.y - gesture.anchorY * ctx.deps.camZoom;
      (0, ctx.deps.clampPassiveCamera)();
      (0, ctx.deps.drawPassiveTree)();
      handlers.hideTooltip();
      return;
    }
    if (!ctx.deps.isDragging || !event.touches.length) return;
    const point = event.touches[0];
    handlers.drag(point.clientX, point.clientY, point.clientX - gesture.x, point.clientY - gesture.y);
    gesture.x = point.clientX;
    gesture.y = point.clientY;
  }
  function endTouch(ctx, event, canvas, gesture, handlers) {
    event.preventDefault();
    if (event.touches.length >= 2) return startPinch(ctx, canvas, event.touches, gesture);
    gesture.distance = 0;
    if (event.touches.length) return startDrag(ctx, event.touches[0], gesture);
    ctx.deps.isDragging = false;
    canvas.style.cursor = "grab";
    if (gesture.pinched || ctx.deps.dragDist >= 10) return;
    const point = event.changedTouches[0];
    if (!point) return;
    ctx.deps.hoverNode = handlers.nodeAt(point);
    if (ctx.deps.hoverNode) touch(ctx, ctx.deps.hoverNode, point, handlers);
    else handlers.hideTooltip();
    (0, ctx.deps.drawPassiveTree)();
  }
  function bindTouch(ctx, canvas, handlers, listen2) {
    const gesture = { distance: 0, pinched: false, x: 0, y: 0 };
    listen2(canvas, "touchstart", (event) => {
      if (!event.touches.length) return;
      event.preventDefault();
      if (event.touches.length >= 2) {
        startPinch(ctx, canvas, event.touches, gesture);
        handlers.hideTooltip();
        return;
      }
      gesture.pinched = false;
      gesture.distance = 0;
      ctx.deps.dragDist = 0;
      startDrag(ctx, event.touches[0], gesture);
      ctx.deps.hoverNode = handlers.nodeAt(event.touches[0]);
      canvas.style.cursor = "grabbing";
    }, { passive: false });
    listen2(canvas, "touchmove", (event) => moveTouch(ctx, event, canvas, gesture, handlers), { passive: false });
    listen2(canvas, "touchend", (event) => endTouch(ctx, event, canvas, gesture, handlers), { passive: false });
    listen2(canvas, "touchcancel", () => {
      ctx.deps.isDragging = false;
      gesture.distance = 0;
      gesture.pinched = true;
      ctx.deps.dragDist = 10;
      ctx.deps.hoverNode = null;
      canvas.style.cursor = "grab";
      (0, ctx.deps.drawPassiveTree)();
      handlers.hideTooltip();
    }, { passive: false });
  }
  function dispose(ctx) {
    hide(ctx);
    ctx.state.controls?.remove();
    ctx.state.controls = null;
  }

  // modules/ui/passive-selection-view.mjs
  function createPassiveSelectionView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { pathNodeDescription, hide, confirmSelection, present, touch, bindTools, confirmPath, bindTouch, pixelRatio, dispose };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(void 0, ctx);
    initialize2(ctx);
    ctx.api = { present: ctx.handlers.present, hide: ctx.handlers.hide, touch: ctx.handlers.touch, bindTools: ctx.handlers.bindTools, confirmPath: ctx.handlers.confirmPath, bindTouch: ctx.handlers.bindTouch, pixelRatio: ctx.handlers.pixelRatio, dispose: ctx.handlers.dispose };
    return ctx.api;
  }
  function initialize2(ctx) {
    ctx.state.selection = null;
    ctx.state.controls = null;
  }

  // modules/passive-selection-ui-classic.mjs
  var passiveScene = createPassiveScene({
    get WEAPON_CONDITION_STATS() {
      return WEAPON_CONDITION_STATS;
    },
    get P_STATS() {
      return P_STATS;
    },
    get battleAssets() {
      return battleAssets;
    },
    get formatValue() {
      return formatValue;
    },
    get getVoidPassiveEffectLabel() {
      return getVoidPassiveEffectLabel;
    },
    get PASSIVE_TREE_V22() {
      return PASSIVE_TREE_V22;
    },
    get getPassiveTreeRootNodeId() {
      return getPassiveTreeRootNodeId;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get clampNumber() {
      return clampNumber;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get reachableNodes() {
      return reachableNodes;
    },
    get getPassiveTreeAdjacency() {
      return typeof getPassiveTreeAdjacency === "undefined" ? void 0 : getPassiveTreeAdjacency;
    },
    get getPassiveTreeRootNode() {
      return getPassiveTreeRootNode;
    },
    get document() {
      return document;
    },
    get calculateReachableNodes() {
      return passiveDiscovery.calculateReachability;
    },
    get performance() {
      return performance;
    },
    get getPassiveVisibility() {
      return passiveDiscovery.visibilityForNode;
    },
    get discoveredPassiveNodes() {
      return discoveredPassiveNodes;
    },
    get isPassiveTreeEdgeAvailable() {
      return isPassiveTreeEdgeAvailable;
    },
    get isPassiveNodeAvailable() {
      return isPassiveNodeAvailable;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get passiveSelectionUi() {
      return passiveSelectionUi;
    },
    get updatePassiveTreeOverlayTransform() {
      return typeof updatePassiveTreeOverlayTransform === "undefined" ? void 0 : updatePassiveTreeOverlayTransform;
    },
    get clearActiveTooltip() {
      return clearActiveTooltip;
    },
    get _t() {
      return _t;
    },
    get buildStatPreviewParts() {
      return buildStatPreviewParts;
    },
    get previewPassiveNodeStats() {
      return previewPassiveNodeStats;
    },
    get getEffectivePassiveNodeEffects() {
      return getEffectivePassiveNodeEffects;
    },
    get statToneText() {
      return statToneText;
    },
    get getItemStatToneColor() {
      return getItemStatToneColor;
    },
    get getPassiveNodeDisplayStat() {
      return window.getPassiveNodeDisplayStat;
    },
    get getHoverAllocationNodeIds() {
      return getHoverAllocationNodeIds;
    },
    get getPassiveApexNodeIds() {
      return getPassiveApexNodeIds;
    },
    get describeReachablePassiveNode() {
      return describeReachablePassiveNode;
    },
    get getPassiveNodeActivationState() {
      return getPassiveNodeActivationState;
    },
    get getPassiveTooltipDescription() {
      return getPassiveTooltipDescription;
    },
    get getPassiveConstellationAwakeningProgress() {
      return getPassiveConstellationAwakeningProgress;
    },
    get getStatName() {
      return getStatName;
    },
    get withSubjectParticle() {
      return withSubjectParticle;
    },
    get drawPassiveTree() {
      return drawPassiveTree;
    },
    get positionTooltipElement() {
      return positionTooltipElement;
    },
    get getPassiveActivationPath() {
      return getPassiveActivationPath;
    },
    get addLog() {
      return addLog;
    },
    get describeBlockedPassiveNode() {
      return describeBlockedPassiveNode;
    },
    get askRefundPassiveNode() {
      return askRefundPassiveNode;
    },
    get openVoidPassiveCraftOverlay() {
      return openVoidPassiveCraftOverlay;
    },
    get activatePassivePath() {
      return activatePassivePath;
    },
    get unlockPassiveStarEvolution() {
      return unlockPassiveStarEvolution;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get requestGameChoice() {
      return requestGameChoice;
    },
    get setupPassiveTreeSearchControls() {
      return setupPassiveTreeSearchControls;
    },
    get window() {
      return window;
    }
  });
  window.GameModules.passiveScene = passiveScene;
  var passiveTreeInputs = {
    get PASSIVE_APEX_CONFIGS() {
      return PASSIVE_APEX_CONFIGS;
    },
    get PASSIVE_BOUNDS() {
      return window.GameModules.passiveTree.bounds;
    },
    get PASSIVE_SECTOR_TITLES() {
      return PASSIVE_SECTOR_TITLES;
    },
    get PASSIVE_SPECIAL_NODE_CONFIGS() {
      return PASSIVE_SPECIAL_NODE_CONFIGS;
    },
    get PASSIVE_TARGET_NODES() {
      return PASSIVE_TARGET_NODES;
    },
    get PASSIVE_THEME_POOLS() {
      return PASSIVE_THEME_POOLS;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get PASSIVE_TREE_V22() {
      return typeof PASSIVE_TREE_V22 === "undefined" ? void 0 : PASSIVE_TREE_V22;
    },
    get PASSIVE_WORLD_SCALE() {
      return window.GameModules.passiveTree.worldScale;
    },
    get P_STATS() {
      return P_STATS;
    },
    get _t() {
      return _t;
    },
    get formatValue() {
      return formatValue;
    },
    get getPassiveEffectLabel() {
      return passiveScene.nodes.getPassiveEffectLabel;
    },
    get getPassiveNodeVisualRadius() {
      return passiveScene.nodes.getPassiveNodeVisualRadius;
    },
    get getPassiveStatTierValue() {
      return getPassiveStatTierValue;
    },
    get getStatName() {
      return getStatName;
    },
    get markPassiveRenderCacheDirty() {
      return passiveScene.markPassiveRenderCacheDirty;
    },
    get scene() {
      return passiveScene;
    }
  };
  var bootstrapPassiveTreeOnceReady = () => bootstrapPassiveTree(passiveTreeInputs);
  window.GameModules.passiveTreeBootstrap = Object.freeze({ bootstrap: bootstrapPassiveTreeOnceReady });
  safeExposeGlobals({ bootstrapPassiveTreeOnceReady });
  var passiveDiscovery = new PassiveDiscoveryView({
    get rules() {
      return window.GameModules.passiveVisibility;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get performance() {
      return performance;
    },
    get spawnPassiveRevealBurstOverlay() {
      return typeof spawnPassiveRevealBurstOverlay === "undefined" ? void 0 : spawnPassiveRevealBurstOverlay;
    }
  }, passiveScene);
  var passiveSelectionUi = createPassiveSelectionView({
    get passiveNodePresentation() {
      return passiveScene.nodes;
    },
    get tutorialActionUi() {
      return typeof tutorialActionUi === "undefined" ? void 0 : tutorialActionUi;
    },
    get document() {
      return document;
    },
    get _t() {
      return _t;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get canRefundPassiveNode() {
      return canRefundPassiveNode;
    },
    get window() {
      return window;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get normalizePassiveTooltipText() {
      return normalizePassiveTooltipText;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get clearActiveTooltip() {
      return clearActiveTooltip;
    },
    get getPassiveActivationPath() {
      return getPassiveActivationPath;
    },
    get invalidateTooltipSize() {
      return invalidateTooltipSize;
    },
    get positionTooltipElement() {
      return positionTooltipElement;
    },
    get setActiveTooltip() {
      return setActiveTooltip;
    },
    get dragDist() {
      return window.GameModules.passiveScene.state.dragDist;
    },
    set dragDist(value) {
      window.GameModules.passiveScene.state.dragDist = value;
    },
    get renderPassiveInvestmentSummary() {
      return renderPassiveInvestmentSummary;
    },
    get fitPassiveCameraToBounds() {
      return fitPassiveCameraToBounds;
    },
    get drawPassiveTree() {
      return drawPassiveTree;
    },
    get clampNumber() {
      return clampNumber;
    },
    get camZoom() {
      return window.GameModules.passiveScene.state.camZoom;
    },
    set camZoom(value) {
      window.GameModules.passiveScene.state.camZoom = value;
    },
    get camX() {
      return window.GameModules.passiveScene.state.camX;
    },
    set camX(value) {
      window.GameModules.passiveScene.state.camX = value;
    },
    get camY() {
      return window.GameModules.passiveScene.state.camY;
    },
    set camY(value) {
      window.GameModules.passiveScene.state.camY = value;
    },
    get clampPassiveCamera() {
      return clampPassiveCamera;
    },
    get isDragging() {
      return window.GameModules.passiveScene.state.isDragging;
    },
    set isDragging(value) {
      window.GameModules.passiveScene.state.isDragging = value;
    },
    get dragStartX() {
      return window.GameModules.passiveScene.state.dragStartX;
    },
    set dragStartX(value) {
      window.GameModules.passiveScene.state.dragStartX = value;
    },
    get dragStartY() {
      return window.GameModules.passiveScene.state.dragStartY;
    },
    set dragStartY(value) {
      window.GameModules.passiveScene.state.dragStartY = value;
    },
    get hoverNode() {
      return window.GameModules.passiveScene.state.hoverNode;
    },
    set hoverNode(value) {
      window.GameModules.passiveScene.state.hoverNode = value;
    }
  });
  safeExposeGlobals({
    passiveSelectionUi,
    calculateReachableNodes: passiveDiscovery.calculateReachability,
    refreshPassiveVisibility: passiveDiscovery.refreshDiscovery,
    revealAroundNode: passiveDiscovery.revealNodes,
    getPassiveVisibility: passiveDiscovery.visibilityForNode,
    markPassiveRenderCacheDirty: passiveScene.markPassiveRenderCacheDirty,
    ensurePassiveRenderCache: passiveScene.ensurePassiveRenderCache,
    getPassiveWorldViewport: passiveScene.getPassiveWorldViewport,
    isNodeInViewport: passiveScene.isNodeInViewport,
    isEdgeInViewport: passiveScene.isEdgeInViewport,
    resizePassiveTreeCanvas: passiveScene.resizePassiveTreeCanvas
  });
})();
