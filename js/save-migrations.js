/** 루프 관문 대기 플래그. 오프라인에서 채운 관문 표시는 관문이 남아 있을 때만 의미가 있다. */
function normalizeLoopGateFlags(state) {
    state.pendingLoopDecision = !!state.pendingLoopDecision;
    state.pendingLoopReady = !!state.pendingLoopReady;
    state.loopGateOffline = state.loopGateOffline === true && (state.pendingLoopDecision || state.pendingLoopReady);
}

/** 자동화 설정: 자동 이동(기본 켬) · 자동 환생(기본 끔) · 다음 루프 직업(매번 고르기 | 같은 직업 유지). */
function normalizeAutomationSettings(settings) {
    settings.autoMove = settings.autoMove !== false;
    settings.autoLoop = settings.autoLoop === true;
    settings.autoLoopClass = settings.autoLoopClass === 'keep' ? 'keep' : 'ask';
}

/** 없어진 창(7단계 2026-10-01: 가지치기 · 아르카나 · 전문가)의 메뉴 단추. 저장된 순서 · 배치에서 버린다. */
/** 보스 특수 공격의 예고 상태는 저장에 싣지 않는다(다음 틱에 다시 계산한다). 예전 저장은 예고 영역의 중심에 보스 전체 사본이
 * 겹겹이 들어가 특수 공격마다 커졌다(검토 5차: 20분 보스전에서 저장 1MB · 직렬화 실패) — 중심은 칸 좌표로 줄인다. 두 번 불러와도 같다. */
function stripBossPatternRuntime(enemy) {
    if (!enemy || typeof enemy !== 'object') return;
    // 다음 예고 미리보기(nextPatternState)는 영역이 없어 겹치지 않으니 그대로 둔다 — 지우면 불러온 탐험이 저장 전과 달라졌다.
    delete enemy.lastPatternState;
    const center = enemy.patternArea && enemy.patternArea.center;
    const nested = center && typeof center === 'object' && ['hp', 'patternArea', 'lastPatternState'].some(key => key in center);
    if (nested) enemy.patternArea.center = { gx: Math.floor(Number(center.gx) || 0), gy: Math.floor(Number(center.gy) || 0) };
}

/** 전직 저장 경계(2026-10-02, 전직 18종). 모르는 전직은 비우고 그 노드 · 키스톤에 쓴 포인트를 돌려준다(예전에는 검사하지 않아
 * 전직 화면이 이름을 읽다 멈췄다). 직업과 맞지 않는 예전 저장(전직을 아무 직업이나 고르던 때)은 이번 루프만 그대로 둔다 — 전직은
 * 루프마다 새로 고른다. 재능 개화 카드는 있는 조합만 남긴다. 지난 루프 전직 배치도 검사한다. 두 번 불러와도 같다. */
function normalizeAscendancySave(merged) {
    merged.ascendNodes = Array.isArray(merged.ascendNodes) ? merged.ascendNodes.filter(id => typeof id === 'string') : [];
    if (merged.ascendClass && !CLASS_TEMPLATES[merged.ascendClass]) {
        merged.ascendPoints = Math.max(0, Math.floor(Number(merged.ascendPoints) || 0)) + merged.ascendNodes.length;
        const keystones = Array.isArray(merged.ascendKeystones) ? merged.ascendKeystones.length : 0;
        merged.ascendKeystonePoints = Math.max(0, Math.floor(Number(merged.ascendKeystonePoints) || 0)) + keystones;
        merged.ascendClass = '';
        merged.ascendNodes = [];
        merged.ascendKeystones = [];
    }
    normalizeTalentCardKeys(merged);
    merged.lastLoopAscendPlan = normalizeLastLoopAscendPlan(merged.lastLoopAscendPlan);
}

/** 지난 루프 전직 배치: 있는 전직, 노드 id 모양(n1~n13d), 그 전직의 키스톤만 남긴다. */
function normalizeLastLoopAscendPlan(raw) {
    if (!raw || typeof raw !== 'object' || !CLASS_TEMPLATES[raw.ascendClass]) return null;
    const keystoneIds = new Set((CLASS_KEYSTONE_DEFS[raw.ascendClass] || []).map(node => node.id));
    const keepIds = (value, keep) => Array.from(new Set((Array.isArray(value) ? value : []).filter(id => typeof id === 'string' && keep(id)))).slice(0, 32);
    return { ascendClass: raw.ascendClass, nodes: keepIds(raw.nodes, id => /^n\d{1,2}[a-d]?$/.test(id)), keystones: keepIds(raw.keystones, id => keystoneIds.has(id)) };
}

/** 재능 개화 카드(2026-10-02 재능 정리): 카드를 그 전직의 카드(직업의 대표 재능 × 전직)로 옮겨 합친다. 레벨과 점수는 큰 쪽,
 * 개화 횟수는 더한다. 장착 칸과 개화 기록도 옮기고 겹치면 하나만 남긴다. 모르는 전직의 카드는 버린다. 두 번 불러와도 같다. */
function normalizeTalentCardKeys(merged) {
    if (typeof TALENT_BLOOM_CARD_DEFS !== 'object' || !TALENT_BLOOM_CARD_DEFS || typeof getTalentBloomCardKeyForAscendancy !== 'function') return;
    const bloomCardOf = key => getTalentBloomCardKeyForAscendancy(String(key || '').split('__')[1]);
    const cards = merged.talentCards && typeof merged.talentCards === 'object' ? merged.talentCards : {};
    const folded = {};
    Object.entries(cards).forEach(([key, card]) => {
        const to = bloomCardOf(key);
        if (to && card && typeof card === 'object') folded[to] = mergeTalentCardRecords(folded[to], card);
    });
    merged.talentCards = folded;
    if (Array.isArray(merged.talentCardLoadout)) {
        const moved = merged.talentCardLoadout.map(key => (key ? bloomCardOf(key) : null));
        merged.talentCardLoadout = moved.map((key, index) => (key && folded[key] && moved.indexOf(key) === index ? key : null));
    }
    if (Array.isArray(merged.talentBloomCombos)) merged.talentBloomCombos = Array.from(new Set(merged.talentBloomCombos.map(bloomCardOf).filter(Boolean)));
    alignBloomLoopTalent(merged);
}

/** 이번 루프의 개화 재능 기록도 직업의 대표 재능으로 맞춘다(5차 노드 n13a, n13b가 이 값을 읽는다). */
function alignBloomLoopTalent(merged) {
    const classTalent = getTalentBloomHeroIdForAscendancy(merged.ascendClass);
    if (!classTalent) return;
    if (merged.bloomedTalentThisLoop) merged.bloomedTalentThisLoop = classTalent;
    if (merged.pendingTalentBloomHeroId) merged.pendingTalentBloomHeroId = classTalent;
}

function mergeTalentCardRecords(previous, card) {
    if (!previous) return { ...card };
    return { ...previous, level: Math.max(Number(previous.level) || 1, Number(card.level) || 1), score: Math.max(Number(previous.score) || 0, Number(card.score) || 0),
        count: (Number(previous.count) || 0) + (Number(card.count) || 0) };
}

const RETIRED_TAB_BUTTON_IDS = Object.freeze(['btn-tab-pruning', 'btn-tab-arcana', 'btn-tab-expertise']);

/** Saved menu layouts are independent value copies; legacy shared layouts seed both once. */
function normalizeTabLayoutSettings(settings) {
    const normalizeOrder = (list, pattern) => Array.from(new Set(
        (Array.isArray(list) ? list : []).filter(id => typeof id === 'string' && pattern.test(id) && !RETIRED_TAB_BUTTON_IDS.includes(id))
    ));
    const buttonId = /^btn-(tab-[a-z]+|map-complete-action-picker)$/;
    const layouts = {};
    for (const platform of ['desktop', 'mobile']) {
        const candidate = settings.tabLayouts && settings.tabLayouts[platform];
        const source = candidate && typeof candidate === 'object' ? candidate : settings;
        const placements = source.tabPlacement && typeof source.tabPlacement === 'object' ? source.tabPlacement : {};
        layouts[platform] = {
            tabOrder: normalizeOrder(source.tabOrder, buttonId),
            tabPlacement: Object.fromEntries(Object.entries(placements)
                .filter(([id, place]) => buttonId.test(id) && ['top', 'bottom'].includes(place) && !RETIRED_TAB_BUTTON_IDS.includes(id))),
            tabGroupOrder: normalizeOrder(source.tabGroupOrder, /^(character|growth|content|gear|etc)$/)
        };
    }
    return layouts;
}

/** 전술 규칙만 남긴다: 예전 컨디션 젬 규칙(행동이 없거나 condition_gem)은 버린다. */
function normalizeSavedTacticRules(raw) {
    const rules = Array.isArray(raw) ? raw.filter(rule => rule && typeof rule === 'object') : [];
    return rules.filter(rule => rule.actionType && rule.actionType !== 'condition_gem').map(rule => normalizeConditionPatternRule({ ...rule }));
}

/** 생장판 제거(2026-09-30): 판 · 보관함 · 확장 · 생장 정수 · 설정 · 해금 표시는 보상 없이 지운다(결정 4). 두 번 불러와도 같다. */
function stripRemovedGrowthBoard(merged) {
    ['growthBoard', 'growthInventory', 'recentGrowthDrops', 'growthInventoryExpandLevel', 'growthEssenceExpandLevel', 'growthCodex']
        .forEach(key => delete merged[key]);
    ['growthSortMode', 'growthAutoSalvageEnabled', 'growthAutoSalvageRarities', 'growthUseItemFilter', 'growthInventoryFilter']
        .forEach(key => delete merged.settings[key]);
    [[merged.settings.searchFilters, 'growth'], [merged.currencies, 'growthEssence'], [merged.unlocks, 'growthboard'], [merged.noti, 'growthboard']]
        .forEach(([row, key]) => { if (row && typeof row === 'object') delete row[key]; });
}

const METEOR_SITE_SAVE_KEYS = Object.freeze(['unlocked', 'skyRiftGauge', 'skyRiftReady', 'skyRiftMinTier', 'skyRiftAllCosmos',
    'activeMeteorTier', 'meteorReturnZoneId', 'lastAnomalyAt', 'skyRiftCarryGauge', 'constellationBuff', 'entriesCleared']);
const RETIRED_STAR_WEDGE_CURRENCIES = Object.freeze(['meteorShard', 'incompleteStarWedge', 'starWedge', 'astralCore']);

/** 6단계(2026-10-01): 운석 낙하 지점 상태(게이지 · 단계 · 돌아갈 곳 · 별자리 관측)를 별쐐기 저장에서 meteorSite로 옮기고,
 * 별쐐기 · 장착 · 변성 기록은 보상 없이 지운다(결정 4 · 8). 별쐐기 저널은 운석 낙하 지점 저널이 된다. 두 번 불러와도 같다. */
function moveStarWedgeSaveToMeteorSite(merged, save) {
    const legacy = save.starWedge && typeof save.starWedge === 'object' ? save.starWedge : null;
    if (legacy && !(save.meteorSite && typeof save.meteorSite === 'object')) {
        merged.meteorSite = Object.fromEntries(METEOR_SITE_SAVE_KEYS.filter(key => key in legacy).map(key => [key, legacy[key]]));
    }
    delete merged.starWedge;
    ensureMeteorSiteState(merged);
    if (Array.isArray(merged.journalEntries)) merged.journalEntries = merged.journalEntries.map(id => id === 'star_wedge' ? 'meteor_fall' : id);
}

/** 6단계(2026-10-01): 운석 파편 · 불완전한 별쐐기 · 별쐐기 · 성핵 조각과 나무꾼 잠금 사진의 별쐐기, 명왕성 별쐐기가 만들던
 * 공허 노드(star_pluto_*)의 보관된 제작 기록을 지운다. 그 노드는 다시 생기지 않는다. */
function stripRemovedStarWedges(merged) {
    RETIRED_STAR_WEDGE_CURRENCIES.forEach(key => delete merged.currencies[key]);
    if (merged.woodsmanBuildSnapshot && typeof merged.woodsmanBuildSnapshot === 'object') delete merged.woodsmanBuildSnapshot.starWedge;
    Object.keys(merged.retiredVoidPassives || {}).filter(id => id.startsWith('star_')).forEach(id => delete merged.retiredVoidPassives[id]);
}

/** 7단계(2026-10-01): 아르카나 · 가지치기 · 전문가와 별가루를 보상 없이 지운다(결정 4 · 10 · 11). 해금 원장의 세 항목은
 * content-progression이 모르는 항목으로 버리고 포인트를 돌려준다. 벌집 갈림길에 저장된 양봉업자 레벨도 지운다. 두 번 불러와도 같다. */
function stripRemovedAuxSystems(merged) {
    ['arcana', 'pruningTree', 'expertise'].forEach(key => delete merged[key]);
    ['arcana', 'pruning', 'expertise'].forEach(key => { delete merged.unlocks[key]; delete merged.noti[key]; });
    delete merged.currencies.starDust;
    const choice = merged.beehive && merged.beehive.pendingChoice;
    if (choice && typeof choice === 'object') {
        delete choice.expertLevel;
        ['a', 'b', 'c'].forEach(key => { if (choice[key] && typeof choice[key] === 'object') delete choice[key].expertLevel; });
    }
}

/** 7단계: 전문가 레벨로 이미 쓰던 기능은 새 해금 항목으로 이어 준다(포인트 없이 계승). 옛 최소 레벨 기준 —
 * 균사학자 Lv.4 잉여 화석 정제 · 원시 화석 복원, Lv.7 부패 홀씨, 젬 각인사 Lv.12 각성 잔향 · 각성 각인. */
const RETIRED_EXPERT_ACCESS = Object.freeze([
    ['mycologist', 4, 'fossilRestore'], ['mycologist', 7, 'advancedSpores'], ['gemEngraver', 12, 'gemAwakening']
]);

function inheritRetiredExpertAccess(ledger, save) {
    const levels = save && save.expertise && save.expertise.levels;
    if (!levels || typeof levels !== 'object') return;
    RETIRED_EXPERT_ACCESS.forEach(([expert, level, id]) => {
        const owned = ledger.unlocked.includes(id) || ledger.inherited.includes(id);
        if (!owned && (Number(levels[expert]) || 0) >= level) ledger.inherited.push(id);
    });
}

/** 2단계(2026-10-01): 플라스크 삭제 — 물약 상태(연금 유리 포함) · 알림을 보상 없이 지운다(결정 4 · 7).
 * 단축키 배정 · 히든 저널 · 보스 도전 기록은 불러올 때 이미 모르는 항목을 버리거나 새로 시작한다. */
function stripRemovedFlasks(merged) {
    delete merged.flasks;
    [[merged.settings && merged.settings.notiFilters, 'flask'], [merged.noti, 'flask']]
        .forEach(([row, key]) => { if (row && typeof row === 'object') delete row[key]; });
}

/** 2026-10-02: 목재 몬스터 넷(수액 응집체 · 뿌리 거미 · 수액 흡충 · 목각 인형)의 그림을 내렸다. 모은 외형은 가장 닮은
 * 새 몬스터로(data/bosses.js RETIRED_WOOD_MONSTER_SKINS), 싸우던 적은 그 지역의 새 외형 · 이름으로 바꾸고 공격 방식을
 * 다시 정하게 한다(그림을 따른다, js/combat-grid.js). 두 번 불러와도 같다. */
function migrateRetiredWoodMonsters(merged) {
    const skins = merged.unlockedMonsterSkins;
    if (skins && typeof skins === 'object') Object.entries(RETIRED_WOOD_MONSTER_SKINS).forEach(([old, next]) => {
        if (skins[old]) skins[next] = true;
        delete skins[old];
    });
    merged.selectedMonsterSkin = RETIRED_WOOD_MONSTER_SKINS[merged.selectedMonsterSkin] || merged.selectedMonsterSkin;
    const zone = Number.isInteger(merged.currentZoneId) && merged.currentZoneId < ACT_ZONE_COUNT ? MAP_ZONES[merged.currentZoneId] : null;
    const packs = Array.isArray(merged.actExploration?.packs) ? merged.actExploration.packs : [];
    [merged.enemies, ...packs.map(pack => pack?.waiting)].filter(Array.isArray).flat().forEach(enemy => retireWoodMonsterVisual(enemy, zone));
}

function retireWoodMonsterVisual(enemy, zone) {
    if (!enemy || !/^(woodSlime|rootSpider|sapLeech|woodPuppet)-\d+$/.test(enemy.spriteVariantId || '')) return;
    const pool = getActMonsterPool(zone), def = ACT_MONSTER_VISUAL_BY_ID[pool[Math.abs(Math.floor(Number(enemy.variantSeed) || 0)) % pool.length]];
    if (enemy.baseMonsterName && typeof enemy.name === 'string') enemy.name = enemy.name.replace(enemy.baseMonsterName, def.name);
    Object.assign(enemy, { spriteVariantId: def.id, baseMonsterName: def.name });
    ['attackKind', 'attackRange', 'attackDelivery', 'projectileToEdge', 'attackCastMs', 'attackLabel'].forEach(key => delete enemy[key]);
}

/** Save boundary: retain prior access except locked trial bypasses. */
function normalizeContentProgressionSave(merged, save) {
    merged.contentProgression = contentProgression.restore(save.contentProgression, merged, Object.keys(save).length > 0);
    inheritRetiredExpertAccess(merged.contentProgression, save);
    contentProgression.sync(merged);
    if (TRIAL_ZONES.some(zone => zone.id === merged.currentZoneId) && !contentProgression.isUnlocked('battleTrials', merged)) {
        merged.currentZoneId = 0;
        merged.enemies = []; merged.encounterPlan = []; merged.killsInZone = 0;
        merged.inTicketBossFight = false; merged.moveTimer = 0;
    }
    return merged;
}

// Only already-equipped pre-level-system items receive grace, until their next removal.
function markLegacyEquipmentGrace(equipment) {
    Object.values(equipment).forEach(item => {
        if (item && !item.requirementsVersion) item.legacyRequirementGrace = true;
    });
}

/** Slot corrections preserve ownership, even when the inventory is already full. */
function reconcileUniqueEquipmentSave(state) {
    for (const [slot, item] of Object.entries(state.equipment)) {
        if (!item?.uniqueBaseLegacy || getEquipCandidateSlots(item, state).includes(slot)) continue;
        delete item.legacyRequirementGrace;
        state.inventory.push(item);
        state.equipment[slot] = null;
    }
    state.offlineProgress.stash = state.offlineProgress.stash.map(normalizeItem);
    state.inventory.forEach(item => { if (item?.rarity === 'unique') normalizeItem(item); });
    state.timeRift.altarUnique = normalizeItem(state.timeRift.altarUnique);
    migrateUniqueCodexKeys(state.uniqueCodex);
    migrateUniqueCodexKeys(state.codexNewlyRegistered);
    equipmentInventoryGridRuntime.ensureState(state);
}

/** The main gem and the 이동 스킬 slot (스킬 변경분 2). A summon gem is never the main gem; a mobility gem worn as the main
 * gem moves to its own slot (unless one is already there) and the main gem falls back to 기본 공격; the slot keeps only an
 * owned mobility gem. Idempotent. */
function normalizeSkillSlotsSave(merged) {
    merged.activeSkill = SKILL_DB[merged.activeSkill] ? merged.activeSkill : (merged.skills[0] || '기본 공격');
    if ((SKILL_DB[merged.activeSkill]?.tags || []).includes('summon_attack')) {
        if (!merged.gemEnhanceTargetSkill) merged.gemEnhanceTargetSkill = merged.activeSkill;
        merged.activeSkill = '기본 공격';
    }
    const worn = name => mobilitySkill.isMobilityGem(name) && merged.skills.includes(name);
    if (mobilitySkill.isMobilityGem(merged.activeSkill)) {
        if (!worn(merged.mobilitySkill)) merged.mobilitySkill = merged.activeSkill;
        merged.activeSkill = '기본 공격';
    }
    merged.mobilitySkill = worn(merged.mobilitySkill) ? merged.mobilitySkill : '';
}

/** The gem the enhance screen opens on: one that is worn — the main gem, the mobility gem or a summon gem. */
function normalizeGemEnhanceTargetSave(merged) {
    const worn = [merged.activeSkill, merged.mobilitySkill, ...merged.equippedSummonSkills].filter(name => SKILL_DB[name]?.isGem);
    if (worn.includes(merged.gemEnhanceTargetSkill)) return;
    merged.gemEnhanceTargetSkill = worn[0] || null;
}

function migrateUniqueCodexKeys(records) {
    for (const [key, found] of Object.entries(records)) {
        const next = migrateUniqueCodexKey(key);
        if (found && typeof found === 'object' && found.rarity === 'unique') normalizeItem(found);
        if (next === key) continue;
        if (found && typeof found === 'object') found.slot = next.split('|')[0];
        records[next] ||= found;
        delete records[key];
    }
}

function migrateUniqueCodexKey(key) {
    const name = String(key).slice(String(key).indexOf('|') + 1);
    const slot = UNIQUE_EQUIPMENT_RULES[name]?.slot;
    return slot ? `${slot}|${name}` : key;
}

function normalizeUniqueHuntSave(state) {
    state.uniqueHuntTargets = Array.isArray(state.uniqueHuntTargets)
        ? state.uniqueHuntTargets.map(migrateUniqueCodexKey) : [];
    if (typeof uniqueHuntRuntime !== 'undefined') uniqueHuntRuntime.ensureState(state);
}

/** Save boundary: an absent/invalid old receipt is unknown, never an inferred payout. */
function normalizeVoidRiftSave(state) {
    state.voidRift = (state.voidRift && typeof state.voidRift === 'object') ? state.voidRift : {};
    state.voidRift.grandBreachCleared = !!state.voidRift.grandBreachCleared;
    const run = state.voidRift.grandRun;
    if (!run || typeof run !== 'object') return;
    const paid = run.rewardVoidChisel;
    run.rewardVoidChisel = Number.isFinite(paid) && paid >= 0 ? Math.floor(paid) : null;
}

function mergeDefaults(save) {
    function clampFiniteNumber(value, fallback, min, max) {
        let num = Number(value);
        if (!Number.isFinite(num)) num = fallback;
        if (Number.isFinite(min)) num = Math.max(min, num);
        if (Number.isFinite(max)) num = Math.min(max, num);
        return num;
    }
    function normalizePassiveNodeId(rawId) {
        if (typeof rawId === 'string') {
            let currentId = typeof getCurrentPassiveNodeId === 'function' ? getCurrentPassiveNodeId(rawId) : rawId;
            if (PASSIVE_TREE.nodes[currentId]) return currentId;
            if (/^\d+$/.test(currentId)) {
                let converted = 'n' + currentId;
                if (PASSIVE_TREE.nodes[converted]) return converted;
            }
            return null;
        }
        if (typeof rawId === 'number' && Number.isFinite(rawId)) {
            let converted = 'n' + Math.floor(rawId);
            return PASSIVE_TREE.nodes[converted] ? converted : null;
        }
        return null;
    }
    function normalizeAllocatedPassiveTreeNodes(rawIds, passiveStarEvolution, passiveSaveState) {
        const rawList = Array.isArray(rawIds) ? rawIds : [];
        const seen = new Set(), kept = [];
        let refunded = 0;
        rawList.forEach(rawId => {
            const id = normalizePassiveNodeId(rawId);
            if (!id) { refunded++; return; }
            if (seen.has(id)) return;
            seen.add(id);
            const node = PASSIVE_TREE.nodes[id];
            if (node.kind === 'start') return;
            if (node.requiresEvolution && !passiveStarEvolution) {
                refunded++; return;
            }
            kept.push(id);
        });
        const candidate = { ...passiveSaveState, passives: kept };
        const connected = passiveRouting.connected(candidate, PASSIVE_TREE, getPassiveRouting(candidate));
        const lostBonus = Math.max(0, passiveRouting.paleBonus({ ...candidate, passives: rawList })
            - passiveRouting.paleBonus({ ...candidate, passives: connected }));
        return { passives: connected, refunded: refunded + kept.length - connected.length, lostBonus };
    }
    function migratePassiveSaveNodeReferences(state) {
        if (typeof migratePassiveNodeIdList !== 'function' || typeof migratePassiveNodeIdRecord !== 'function') return;
        state.passives = migratePassiveNodeIdList(state.passives);
        state.discoveredPassives = migratePassiveNodeIdList(state.discoveredPassives);
        state.passiveAttributeChoices = migratePassiveNodeIdRecord(state.passiveAttributeChoices);
        state.voidPassives = migratePassiveNodeIdRecord(state.voidPassives);
        state.retiredVoidPassives = migratePassiveNodeIdRecord(state.retiredVoidPassives);
    }
    function normalizeEncounterMarker(marker) {
        if (!marker || typeof marker !== 'object') return null;
        let at = clampFiniteNumber(marker.at, NaN, 0, 100);
        if (!Number.isFinite(at)) return null;
        let normalized = {
            at: at,
            count: Math.max(1, Math.floor(clampFiniteNumber(marker.count, 1, 1, 99))),
            elite: !!marker.elite,
            boss: !!marker.boss
        };
        // Markers keep only their spawn shape; removed content fields (e.g. treasure-hunt ids) are dropped.
        return normalized;
    }
    function normalizeEnemyRecord(enemy) {
        if (!enemy || typeof enemy !== 'object') return null;
        let hp = clampFiniteNumber(enemy.hp, NaN, 0);
        let maxHp = clampFiniteNumber(enemy.maxHp, clampFiniteNumber(hp, 1, 1), 1);
        if (!Number.isFinite(hp)) hp = maxHp;
        return normalizeEnemyGridFields({
            ...enemy,
            id: Math.max(1, Math.floor(clampFiniteNumber(enemy.id, 1, 1))),
            hp: Math.min(maxHp, hp),
            maxHp: maxHp,
            attackTimer: clampFiniteNumber(enemy.attackTimer, 0, 0),
            regenBank: Math.round(clampFiniteNumber(enemy.regenBank, 0, 0) * 10) / 10,
            spawnAt: clampFiniteNumber(enemy.spawnAt, 0, 0, 100),
            spawnStamp: 0,
            groupIndex: Math.max(0, Math.floor(clampFiniteNumber(enemy.groupIndex, 0, 0))),
            variantSeed: Math.floor(clampFiniteNumber(enemy.variantSeed, 1)),
            ele: enemy.ele || 'phys',
            name: enemy.name || '이름 없는 적',
            atkMul: clampFiniteNumber(enemy.atkMul, 1, 0.1),
            dr: clampFiniteNumber(enemy.dr, 0, 0),
            resF: clampFiniteNumber(enemy.resF, 0),
            resC: clampFiniteNumber(enemy.resC, 0),
            resL: clampFiniteNumber(enemy.resL, 0),
            resChaos: clampFiniteNumber(enemy.resChaos, 0),
            isElite: !!enemy.isElite,
            isBoss: !!enemy.isBoss
        });
    }

    // 그리드 필드 정리: 잘못된 좌표/유형은 버려서 다음 전투 틱의 그리드 복구가 다시 배치하게 한다.
    function normalizeEnemyGridFields(record) {
        delete record.battleSlot;
        // Exploration coordinates are validated against their own saved map below; never
        // silently move a saved enemy to another tile or into a wall by clamping it.
        const exploration=merged.actExploration;
        if(exploration)return record;
        let gx = Math.floor(clampFiniteNumber(record.gx, NaN, 0, COMBAT_GRID_CONFIG.columns - 1));
        let gy = Math.floor(clampFiniteNumber(record.gy, NaN, 0, COMBAT_GRID_CONFIG.rows - 1));
        if (Number.isFinite(gx) && Number.isFinite(gy)) {
            record.gx = gx;
            record.gy = gy;
        } else {
            delete record.gx;
            delete record.gy;
        }
        record.gridMoveTimer = 0;
        if (record.attackKind !== 'melee' && record.attackKind !== 'ranged') {
            delete record.attackKind;
            delete record.attackRange;
        } else {
            record.attackRange = Math.max(1, Math.floor(clampFiniteNumber(record.attackRange, 1, 1, 99)));
        }
        return record;
    }
    function normalizeRecentDamageEvent(entry) {
        if (!entry || typeof entry !== 'object') return null;
        let ele = normalizeDamageElementKey(entry.ele);
        let amount = Math.max(0, Math.floor(clampFiniteNumber(entry.amount, 0, 0)));
        return {
            at: clampFiniteNumber(entry.at, Date.now(), 0),
            ele: ele,
            amount: amount,
            source: typeof entry.source === 'string' ? entry.source : '',
            sourceType: ['monster', 'hazard', 'ailment'].includes(entry.sourceType) ? entry.sourceType : 'hazard',
            sourceId: typeof entry.sourceId === 'string' || Number.isFinite(entry.sourceId) ? entry.sourceId : null,
            sourceName: typeof entry.sourceName === 'string' ? entry.sourceName : '',
            ailmentType: typeof entry.ailmentType === 'string' ? entry.ailmentType : ''
        };
    }
    function normalizeDeathDamageSummaryRows(rows) {
        let damageSummary = Array.isArray(rows) ? rows.map(entry => {
            if (!entry || typeof entry !== 'object') return null;
            let ele = normalizeDamageElementKey(entry.ele);
            let value = Math.max(0, Math.floor(clampFiniteNumber(entry.value, entry.amount, 0)));
            return { ele: ele, value: value };
        }).filter(Boolean) : [];
        let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
        damageSummary.forEach(entry => {
            totals[entry.ele] += Math.max(0, Math.floor(entry.value || 0));
        });
        return Object.keys(totals)
            .map(ele => ({ ele: ele, value: totals[ele] }))
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);
    }
    function normalizeDeathMonsterSummaryRows(rows) {
        return Array.isArray(rows) ? rows.map(row => {
            if (!row || typeof row !== 'object') return null;
            let byElement = {};
            ['phys', 'fire', 'cold', 'light', 'chaos', 'other'].forEach(ele => {
                let value = Math.max(0, Math.floor(clampFiniteNumber(row.byElement && row.byElement[ele], 0, 0)));
                if (value > 0) byElement[ele] = value;
            });
            return {
                sourceId: typeof row.sourceId === 'string' || Number.isFinite(row.sourceId) ? row.sourceId : null,
                name: typeof row.name === 'string' && row.name ? row.name : '알 수 없는 몬스터',
                value: Math.max(0, Math.floor(clampFiniteNumber(row.value, 0, 0))),
                byElement: byElement,
                primaryElement: normalizeDamageElementKey(row.primaryElement)
            };
        }).filter(row => row && row.value > 0).sort((a, b) => b.value - a.value) : [];
    }
    /** {frontierZoneId: story act id 1-9, level: positive integer} or null for anything else. */
    function normalizeActRetreat(value) {
        if (!value || typeof value !== 'object') return null;
        const zone = getZone(value.frontierZoneId);
        const level = Math.floor(Number(value.level));
        if (zone?.type !== 'act' || !(zone.id > 0) || !Number.isFinite(level) || level < 1) return null;
        return { frontierZoneId: zone.id, level };
    }

    function normalizeDeathLog(log) {
        if (!log || typeof log !== 'object') return null;
        let primaryElement = normalizeDamageElementKey(log.primaryElement);
        let damageSummary = normalizeDeathDamageSummaryRows(log.damageSummary);
        let ailmentDamageSummary = normalizeDeathDamageSummaryRows(log.ailmentDamageSummary);
        let monsterSummary = normalizeDeathMonsterSummaryRows(log.monsterSummary);
        let activeAilments = Array.isArray(log.activeAilments) ? log.activeAilments.map(row => {
            if (!row || typeof row !== 'object') return null;
            let type = typeof row.type === 'string' && row.type ? row.type : 'unknown';
            return {
                type: type,
                label: typeof row.label === 'string' && row.label ? row.label : getAilmentDisplayLabel(type),
                time: Math.max(0, Math.ceil(clampFiniteNumber(row.time, 0, 0, 30))),
                power: Math.max(0, clampFiniteNumber(row.power, 0, 0, 1.5)),
                sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))),
                sourceEnemyName: typeof row.sourceEnemyName === 'string' ? row.sourceEnemyName : ''
            };
        }).filter(Boolean) : [];
        return {
            primaryElement: primaryElement,
            fatalElement: Object.keys(DAMAGE_ELEMENT_LABELS).find(ele => ele === log.fatalElement) ?? null,
            reasonText: typeof log.reasonText === 'string' && log.reasonText.trim() ? log.reasonText : (DEATH_REASON_TEXT[primaryElement] || DEATH_REASON_TEXT.phys),
            expLost: Math.max(0, Math.floor(clampFiniteNumber(log.expLost, 0, 0))),
            damageSummary: damageSummary,
            ailmentDamageSummary: ailmentDamageSummary,
            monsterSummary: monsterSummary,
            activeAilments: activeAilments,
            sourceName: typeof log.sourceName === 'string' ? log.sourceName : '',
            lostItems: Math.max(0, Math.floor(clampFiniteNumber(log.lostItems, 0, 0))),
            lostCurrencies: Math.max(0, Math.floor(clampFiniteNumber(log.lostCurrencies, 0, 0))),
            retreatZoneName: typeof log.retreatZoneName === 'string' ? log.retreatZoneName : '',
            at: clampFiniteNumber(log.at, Date.now(), 0)
        };
    }
    function estimateSummonEquipCapForMergedSave(state) {
        let bonus = 0;
        function statValue(stat) {
            if (!stat || typeof stat !== 'object') return 0;
            if (Number.isFinite(stat.val)) return stat.val;
            if (Number.isFinite(stat.value)) return stat.value;
            if (Number.isFinite(stat.base)) return stat.base;
            return 0;
        }
        Object.entries((state && state.equipment) || {}).forEach(([slot, item]) => {
            if (!item) return;
            [...(item.baseStats || []), ...(item.stats || []), ...(typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item) : [])].forEach(stat => {
                if (stat && stat.id === 'summonCap') bonus += statValue(stat);
            });
            if (item.uniqueEffectKey === 'summonCapBonus') bonus += Number((item.uniqueEffectParams || {}).cap) || 1;
            if (item.uniqueEffectKey === 'rightRingSummonCap' && slot === '반지2') bonus += Number((item.uniqueEffectParams || {}).cap) || 1;
        });
        (state && Array.isArray(state.passives) ? state.passives : []).forEach(id => {
            let node = PASSIVE_TREE.nodes[id];
            if (node && node.stat === 'summonCap') bonus += node.val || 0;
        });
        (state && Array.isArray(state.actRewardBonuses) ? state.actRewardBonuses : []).forEach(entry => { if (entry && entry.stat === 'summonCap') bonus += Number(entry.value) || 0; });
        (state && Array.isArray(state.journalBonuses) ? state.journalBonuses : []).forEach(entry => { if (entry && entry.stat === 'summonCap') bonus += Number(entry.value) || 0; });
        let keystones = (state && Array.isArray(state.ascendKeystones)) ? state.ascendKeystones : [];
        if (state && state.ascendClass === 'soulbinder') {
            if (keystones.includes('sb4')) bonus += 1;
            if (keystones.includes('sb8')) bonus += 3;
        }
        let ownedCards = Object.keys((state && state.talentCards) || {});
        let unlockedSlots = (typeof TALENT_CARD_SLOT_UNLOCKS !== 'undefined' ? TALENT_CARD_SLOT_UNLOCKS : [])
            .filter(requirement => ownedCards.length >= requirement).length;
        (state && Array.isArray(state.talentCardLoadout) ? state.talentCardLoadout.slice(0, unlockedSlots) : []).forEach(comboKey => {
            let rule = typeof TALENT_PRECISE_CARD_RULES !== 'undefined' ? TALENT_PRECISE_CARD_RULES[comboKey] : null;
            ((rule && rule.uniques) || []).forEach(effect => {
                if (effect && effect.key === 'summonCapBonus') bonus += Number((effect.params || {}).cap) || 1;
            });
        });
        let cap = Math.max(1, Math.floor(1 + bonus));
        let expandedCap = state && state.ascendClass === 'soulbinder' && keystones.includes('sb9');
        if (expandedCap) cap = Math.floor(cap * 1.5);
        return Math.min(expandedCap ? 12 : 8, cap);
    }

    let savedHeroAppearanceMode = save && save.settings && save.settings.heroAppearanceMode;
    let savedColony = (save && save.colony && typeof save.colony === 'object') ? save.colony : null;
    let savedColonyHadWardSlotVersion = !!(savedColony && Object.prototype.hasOwnProperty.call(savedColony, 'wardSlotVersion'));
    let merged = {
        ...JSON.parse(JSON.stringify(defaultGame)),
        ...save,
        actExploration: save.actExploration == null ? null : JSON.parse(JSON.stringify(save.actExploration)),
        equipmentDropProgress: clampFiniteNumber(save.equipmentDropProgress, 0, 0, EQUIPMENT_DROUGHT_RULES.threshold - 0.5),
        settings: { ...defaultGame.settings, ...(save.settings || {}) },
        unlocks: { ...defaultGame.unlocks, ...(save.unlocks || {}) },
        noti: { ...defaultGame.noti, ...(save.noti || {}) },
        currencies: { ...defaultGame.currencies, ...(save.currencies || {}) },
        equipment: { ...defaultGame.equipment, ...(save.equipment || {}) },
        saveMeta: { ...defaultGame.saveMeta, ...(save.saveMeta || {}) }
    };
    delete merged.hideout;
    delete merged.abyssPassivePoints;
    delete merged.abyssPassives;
    delete merged.unlocks.hideout;
    delete merged.noti.hideout;
    migratePassiveSaveNodeReferences(merged);
    migrateLegacySummonGemSave(merged);
    delete merged.talentCardRuntime;
    Object.entries(typeof CURRENCY_LEGACY_MERGE === 'object' ? CURRENCY_LEGACY_MERGE : {}).forEach(([currentKey, legacyKeys]) => {
        let legacyAmount = (legacyKeys || []).reduce((sum, legacyKey) => sum + Math.max(0, Math.floor(Number(merged.currencies[legacyKey]) || 0)), 0);
        merged.currencies[currentKey] = Math.max(0, Math.floor(Number(merged.currencies[currentKey]) || 0)) + legacyAmount;
        (legacyKeys || []).forEach(legacyKey => delete merged.currencies[legacyKey]);
        (legacyKeys || []).forEach(legacyKey => Object.defineProperty(merged.currencies, legacyKey, {
            configurable: true,
            enumerable: false,
            get() { return this[currentKey] || 0; },
            set(value) { this[currentKey] = Math.max(0, Math.floor(Number(value) || 0)); }
        }));
    });
    // Removed contracts must not survive in legacy saves or later serialization.
    delete merged.challengeContract;
    delete merged.activeChallengeContract;
    const legacyHiveTrace = Math.max(0, Math.floor(Number(merged.currencies.hiveTrace) || 0));
    if (legacyHiveTrace > 0) {
        merged.currencies.colonyTrace = Math.max(0, Math.floor(Number(merged.currencies.colonyTrace) || 0)) + legacyHiveTrace;
    }
    delete merged.currencies.hiveTrace;
    merged.cosmosAtlas = (merged.cosmosAtlas && typeof merged.cosmosAtlas === 'object') ? { ...merged.cosmosAtlas } : {};
    delete merged.cosmosAtlas.starDust;
    merged.saveMeta.lastCloudUploadProfile = normalizeCloudUploadProfile(merged.saveMeta.lastCloudUploadProfile);
    merged.saveMeta.cloudUserId = typeof merged.saveMeta.cloudUserId === 'string' && merged.saveMeta.cloudUserId.trim()
        ? merged.saveMeta.cloudUserId
        : null;
    merged.ocean = mergeOceanState(save && save.ocean);
    if (typeof syncPermanentTalentTabUnlock === 'function') syncPermanentTalentTabUnlock(merged);
    if (!save.currencies && save.materials) {
        merged.currencies.magicBud += Math.floor(save.materials / 2) + Math.floor(save.materials / 4);
        merged.currencies.formlessDew += Math.floor(save.materials / 10);
    }
    let normalizedEquipment = Object.fromEntries(Object.keys(defaultGame.equipment)
        .map(slot => [slot, merged.equipment[slot] || null]));
    if (save && save.equipment && save.equipment['장갑'] && !save.equipment['장갑1'] && !save.equipment['장갑2']) {
        normalizedEquipment['장갑1'] = save.equipment['장갑'];
    }
    merged.equipment = normalizedEquipment;
    markLegacyEquipmentGrace(merged.equipment);
    if (window.equipmentLoadoutRuntime) window.equipmentLoadoutRuntime.ensureState(merged);
    merged.inventory = (merged.inventory || []).map(normalizeItem);
    merged.equipmentTemporaryStorage = Array.isArray(merged.equipmentTemporaryStorage)
        ? merged.equipmentTemporaryStorage.map(normalizeItem) : [];
    Object.keys(merged.equipment).forEach(slot => merged.equipment[slot] = normalizeItem(merged.equipment[slot]));
    if (typeof equipmentInventoryGridRuntime !== 'undefined') equipmentInventoryGridRuntime.ensureState(merged);
    merged.gemData = (merged.gemData && typeof merged.gemData === 'object') ? merged.gemData : {};
    merged.gemData['기본 공격'] = normalizeGemRecord(merged.gemData['기본 공격']);
    Object.keys(merged.gemData).forEach(name => merged.gemData[name] = normalizeGemRecord(merged.gemData[name]));
    merged.supportGemData = (merged.supportGemData && typeof merged.supportGemData === 'object') ? merged.supportGemData : {};
    Object.keys(merged.supportGemData).forEach(name => merged.supportGemData[name] = normalizeGemRecord(merged.supportGemData[name]));
    if ((save.saveVersion || 0) < 9) {
        merged.passives = [];
        merged.discoveredPassives = [getPassiveTreeRootNodeId(merged)];
    }
    if ((save.saveVersion || 0) < 13) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 10) merged.currentZoneId += (ABYSS_START_ZONE_ID - 10);
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 10) merged.maxZoneId += (ABYSS_START_ZONE_ID - 10);
    } else if ((save.saveVersion || 0) < 14) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 11) merged.currentZoneId -= 1;
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 11) merged.maxZoneId -= 1;
    } else if ((save.saveVersion || 0) < 15) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 5) merged.currentZoneId -= 1;
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 5) merged.maxZoneId -= 1;
    }
    const legacyPassiveRefundCount = Number(merged.passiveLayoutVersion || 0) < 22
        ? (Array.isArray(save.passives) ? save.passives.filter(id => id !== 'n0').length : 0)
        : 0;
    moveStarWedgeSaveToMeteorSite(merged, save);
    let passiveAllocationNormalization = normalizeAllocatedPassiveTreeNodes(merged.passives, !!merged.passiveStarEvolution, merged);
    merged.passives = passiveAllocationNormalization.passives;
    merged.autoRefundedPassivePoints = Math.max(0, Math.floor(passiveAllocationNormalization.refunded || 0));
    function getPassiveTierValueForLoad(statKey, tier) {
        let statDef = P_STATS[statKey];
        if (!statDef) return tier === 3 ? 8 : (tier === 2 ? 4 : 2);
        if (tier === 0) return 10;
        if (tier === 1) return statDef.s !== undefined ? statDef.s : (statDef.m !== undefined ? statDef.m : (statDef.k !== undefined ? statDef.k : 2));
        if (tier === 2) return statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : (statDef.k !== undefined ? statDef.k : 4));
        return statDef.k !== undefined ? statDef.k : (statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : 8));
    }
    Object.values(PASSIVE_TREE.nodes || {}).forEach(node => {
        if (!node || node.stat !== 'critDmg') return;
        node.val = getPassiveTierValueForLoad('critDmg', Math.max(0, Math.floor(node.tier || 1)));
    });
    merged.discoveredPassives = Array.from(new Set((merged.discoveredPassives || []).map(normalizePassiveNodeId).filter(Boolean)));
    const passiveAttributeStats = new Set(['strength', 'dexterity', 'intelligence']);
    merged.passiveAttributePreference = passiveAttributeStats.has(merged.passiveAttributePreference) ? merged.passiveAttributePreference : 'strength';
    const rawPassiveAttributeChoices = merged.passiveAttributeChoices && typeof merged.passiveAttributeChoices === 'object' && !Array.isArray(merged.passiveAttributeChoices)
        ? merged.passiveAttributeChoices
        : {};
    merged.passiveAttributeChoices = Object.fromEntries(Object.entries(rawPassiveAttributeChoices)
        .filter(([nodeId, stat]) => passiveAttributeStats.has(stat)
            && PASSIVE_TREE.nodes[nodeId]
            && PASSIVE_TREE.nodes[nodeId].kind === 'attribute'
            && (merged.passives || []).includes(nodeId)));
    const passiveSpecializationOptions = { migrateWisdomBranchChoice: true, passiveIds: merged.passives };
    merged.passiveSpecialization = typeof normalizePassiveSpecializationState === 'function'
        ? normalizePassiveSpecializationState(merged.passiveSpecialization, passiveSpecializationOptions)
        : JSON.parse(JSON.stringify(defaultGame.passiveSpecialization));
    if (merged.passiveLayoutVersion !== PASSIVE_LAYOUT_VERSION) {
        // Version 22 replaces the generated tree with the authored six-class layout.
        // Refund once rather than silently mapping old node ids onto unrelated effects.
        if (Number(merged.passiveLayoutVersion || 0) < 22) {
            merged.autoRefundedPassivePoints = Math.max(merged.autoRefundedPassivePoints, legacyPassiveRefundCount);
            merged.passives = [];
            merged.passiveAttributeChoices = {};
        }
        merged.discoveredPassives = Array.from(new Set([getPassiveTreeRootNodeId(merged)].concat(merged.passives || [])));
        merged.passiveLayoutVersion = PASSIVE_LAYOUT_VERSION;
    }
    merged.claimableActRewards = (merged.claimableActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.claimedActRewards = (merged.claimedActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.actRewardBonuses = (merged.actRewardBonuses || []).filter(entry => entry && entry.stat);
    merged.seasonChaseUniqueDrops = Array.from(new Set((Array.isArray(merged.seasonChaseUniqueDrops) ? merged.seasonChaseUniqueDrops : []).filter(name => typeof name === 'string' && name)));
    // Old saves only had a boolean flag and could not identify which chase unique dropped.
    // Do not treat that unknown legacy flag as a full chase-unique blacklist.
    merged.seasonChaseUniqueDropped = merged.seasonChaseUniqueDrops.length > 0;
    if (Array.isArray(merged.skills) && merged.skills.includes('수액 골렘 소환')) {
        merged.supports = Array.isArray(merged.supports) ? merged.supports : [];
        if (!merged.supports.includes('수액 골렘 소환')) merged.supports.push('수액 골렘 소환');
        merged.supportGemData = (merged.supportGemData && typeof merged.supportGemData === 'object') ? merged.supportGemData : {};
        if (!merged.supportGemData['수액 골렘 소환']) {
            merged.supportGemData['수액 골렘 소환'] = normalizeGemRecord((merged.gemData || {})['수액 골렘 소환'] || { level: 1, exp: 0, unlockedTier: 1, activeTier: 1 });
        }
        merged.equippedSupports = Array.isArray(merged.equippedSupports) ? merged.equippedSupports : [];
        if (!merged.equippedSupports.includes('수액 골렘 소환')) merged.equippedSupports.push('수액 골렘 소환');
        if (merged.activeSkill === '수액 골렘 소환') {
            merged.activeSkill = '기본 공격';
        }
    }
    merged.skills = dedupeList(Array.isArray(merged.skills) ? merged.skills.filter(name => !!SKILL_DB[name]) : []);
    if (!merged.skills.includes('기본 공격')) merged.skills.unshift('기본 공격');
    merged.sealedSkills = dedupeList(Array.isArray(merged.sealedSkills) ? merged.sealedSkills.filter(name => !!SKILL_DB[name] && name !== '기본 공격' && !merged.skills.includes(name)) : []);
    merged.supports = dedupeList(Array.isArray(merged.supports) ? merged.supports.filter(name => !!SUPPORT_GEM_DB[name]) : []);
    merged.sealedSupports = dedupeList(Array.isArray(merged.sealedSupports) ? merged.sealedSupports.filter(name => !!SUPPORT_GEM_DB[name] && !merged.supports.includes(name)) : []);
    merged.equippedSupports = Array.isArray(merged.equippedSupports) ? dedupeList(merged.equippedSupports.filter(name => merged.supports.includes(name))) : [];
    merged.seasonNodes = Array.isArray(merged.seasonNodes) ? merged.seasonNodes.filter(id => !!getSeasonPassiveNodeDef(id)) : [];
    merged.seasonNodeLevels = (merged.seasonNodeLevels && typeof merged.seasonNodeLevels === 'object') ? merged.seasonNodeLevels : {};
    merged.seasonNodes.forEach(id => {
        let lv = Math.max(1, Math.floor(merged.seasonNodeLevels[id] || 1));
        merged.seasonNodeLevels[id] = Math.min(5, lv);
    });
    merged.unlockedSeasonContents = Array.isArray(merged.unlockedSeasonContents) ? merged.unlockedSeasonContents.filter(id => typeof id === 'string') : ['season_1'];
    merged.seenSeasonContentNotices = Array.isArray(merged.seenSeasonContentNotices) ? merged.seenSeasonContentNotices.filter(id => typeof id === 'string') : ['season_1'];
    merged.unlockedMapContents = Array.isArray(merged.unlockedMapContents) ? merged.unlockedMapContents.filter(id => typeof id === 'string') : [];
    merged.labyrinthFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.labyrinthFloor, defaultGame.labyrinthFloor || 1, 1)));
    merged.labyrinthUnlockedMaxFloor = Math.max(
        merged.labyrinthFloor,
        Math.floor(clampFiniteNumber(merged.labyrinthUnlockedMaxFloor, defaultGame.labyrinthUnlockedMaxFloor || 1, 1))
    );
    merged.abyssEndlessDepth = Math.max(20, Math.floor(clampFiniteNumber(merged.abyssEndlessDepth, defaultGame.abyssEndlessDepth || 20, 20)));
    merged.abyssUnlockedDepths = Array.isArray(merged.abyssUnlockedDepths)
        ? Array.from(new Set(merged.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 20))).sort((a, b) => a - b)
        : [20];
    if (!merged.abyssUnlockedDepths.includes(20)) merged.abyssUnlockedDepths.unshift(20);
    if (merged.abyssEndlessDepth >= 21 && !merged.abyssUnlockedDepths.includes(merged.abyssEndlessDepth)) merged.abyssUnlockedDepths.push(merged.abyssEndlessDepth);
    function normalizeJewelRecord(jewel) {
        if (!jewel || typeof jewel !== 'object') return null;
        let stats = typeof getJewelStats === 'function' ? getJewelStats(jewel) : (Array.isArray(jewel.stats) ? jewel.stats.filter(stat => stat && stat.id) : []);
        if (stats.length === 0 && jewel.stat && jewel.stat.id) stats = typeof normalizeJewelStat === 'function' ? [normalizeJewelStat(jewel.stat)].filter(Boolean) : [jewel.stat];
        if (stats.length === 0) return null;
        let hiddenTier = Math.max(1, Math.floor(Math.max(...stats.map(stat => Math.floor(stat.tier || 1)))));
        let hasWaxBonus = stats.some(stat => stat && stat.waxBonus);
        let statLimit = jewel.waxedByBeeswax || hasWaxBonus ? 5 : 4;
        return { ...jewel, rarity: ['normal', 'magic', 'rare', 'unique'].includes(jewel.rarity) ? jewel.rarity : 'normal', waxedByBeeswax: !!jewel.waxedByBeeswax || hasWaxBonus, hiddenTier: hiddenTier, stats: stats.slice(0, statLimit), locked: !!jewel.locked };
    }
    merged.jewelInventory = Array.isArray(merged.jewelInventory) ? merged.jewelInventory.map(normalizeJewelRecord).filter(Boolean) : [];
    // 한도를 넘은 주얼을 잘라내지 않는다. 전투 드랍은 보관함이 가득 차도 희귀·고유
    // 주얼만은 유실 방지로 한도를 넘겨 보관하는데(combat.js의 protectOverflow),
    // 여기서 잘라내면 바로 그 아껴 둔 주얼이 다음 불러오기에 조용히 사라졌다.
    // 게다가 앞에서부터 40개를 남기므로 가장 최근에 지켜 낸 것이 먼저 지워진다.
    // 장비 보관함도 같은 이유로 자르지 않고 초과 보관을 허용한다(유실 방지).
    // 새로 넣는 쪽은 각 push 지점이 getJewelInventoryLimit()으로 계속 막는다.
    // 주얼 슬롯은 2026-09-30에 없어졌다(주얼은 장비 소켓에만 낀다). 슬롯의 주얼은 보관함으로 옮기고, 증폭은 보상 없이 지운다.
    merged.jewelInventory.push(...(Array.isArray(merged.jewelSlots) ? merged.jewelSlots.map(normalizeJewelRecord).filter(Boolean) : []));
    delete merged.jewelSlots; delete merged.jewelSlotAmplify; delete merged.unlocks.jewel; delete merged.noti.jewel;
    merged.skyGemEnhancements = (merged.skyGemEnhancements && typeof merged.skyGemEnhancements === 'object') ? merged.skyGemEnhancements : {};
    Object.keys(merged.skyGemEnhancements).forEach(skill => {
        let arr = Array.isArray(merged.skyGemEnhancements[skill]) ? merged.skyGemEnhancements[skill] : [];
        merged.skyGemEnhancements[skill] = typeof normalizeSkyGemEnhancementSlots === 'function'
            ? normalizeSkyGemEnhancementSlots(arr)
            : arr.slice(0, 5);
    });
    normalizeAscendancySave(merged);
    merged.bloomedClassThisLoop = CLASS_TEMPLATES[merged.bloomedClassThisLoop] ? merged.bloomedClassThisLoop : null;
    merged.bloomedTalentThisLoop = HERO_SELECTION_DEFS[merged.bloomedTalentThisLoop] ? merged.bloomedTalentThisLoop : null;
    if (merged.bloomedClassThisLoop && !merged.bloomedTalentThisLoop) merged.bloomedTalentThisLoop = merged.selectedHeroId;
    if (!merged.bloomedClassThisLoop) merged.bloomedTalentThisLoop = null;
    merged.pendingTalentBloomHeroId = merged.currentZoneId === 'trial_5'
        && HERO_SELECTION_DEFS[merged.pendingTalentBloomHeroId] ? merged.pendingTalentBloomHeroId : null;
    merged.ascendKeystonePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendKeystonePoints, 0, 0)));
    let classKeystoneSet = new Set(getClassKeystoneDefs(merged.ascendClass).map(node => node.id));
    merged.ascendKeystones = Array.isArray(merged.ascendKeystones)
        ? Array.from(new Set(merged.ascendKeystones.filter(id => typeof id === 'string' && classKeystoneSet.has(id)))).slice(0, CLASS_KEYSTONE_PICK_LIMIT)
        : [];
    if (!merged.ascendClass && (!Array.isArray(merged.completedTrials) || merged.completedTrials.length === 0)) {
        merged.ascendKeystonePoints = 0;
        merged.ascendKeystones = [];
    }
    if (merged.ascendClass) {
        let legacyTrialCount = Array.isArray(merged.completedTrials)
            ? merged.completedTrials.filter(id => ['trial_1', 'trial_2', 'trial_3', 'trial_4'].includes(id)).length
            : 0;
        let legacyAscendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, 0, 0, 4)));
        let legacyKeystoneTotal = Math.min(CLASS_KEYSTONE_PICK_LIMIT, Math.max(legacyAscendRank, legacyTrialCount));
        let minExpectedPoints = Math.max(0, legacyKeystoneTotal - merged.ascendKeystones.length);
        merged.ascendKeystonePoints = Math.max(merged.ascendKeystonePoints, minExpectedPoints);
    }
    let validVoidPassiveIds = new Set(typeof getVoidPassiveNodeIds === 'function' ? getVoidPassiveNodeIds() : []);
    let rawVoidPassives = (merged.voidPassives && typeof merged.voidPassives === 'object') ? merged.voidPassives : {};
    merged.voidPassives = {};
    merged.retiredVoidPassives = (merged.retiredVoidPassives && typeof merged.retiredVoidPassives === 'object') ? merged.retiredVoidPassives : {};
    Object.keys(rawVoidPassives).forEach(nodeId => {
        if (!validVoidPassiveIds.has(String(nodeId))) merged.retiredVoidPassives[nodeId] = rawVoidPassives[nodeId];
    });
    let legacyVoidMigration = !(save.voidPassives && typeof save.voidPassives === 'object');
    let allocatedVoidIds = legacyVoidMigration ? new Set((merged.passives || []).map(id => String(id))) : new Set();
    validVoidPassiveIds.forEach(nodeId => {
        let rawEntry = rawVoidPassives[nodeId] && typeof rawVoidPassives[nodeId] === 'object' ? rawVoidPassives[nodeId] : {};
        let stats = Array.isArray(rawEntry.stats) ? rawEntry.stats : [];
        if (legacyVoidMigration && allocatedVoidIds.has(String(nodeId)) && stats.length <= 0) {
            let node = PASSIVE_TREE.nodes[nodeId];
            if (node && P_STATS[node.legacyVoidStat] && Number.isFinite(Number(node.legacyVoidVal))) {
                stats = [{ id: node.legacyVoidStat, val: Number(node.legacyVoidVal) }];
            }
        }
        stats = stats.filter(line => line && P_STATS[line.id] && Number.isFinite(Number(line.val))).slice(0, 2).map(line => ({ id: line.id, val: Number(line.val) }));
        let transcendent = (typeof normalizeTranscendentVoidPassive === 'function') ? normalizeTranscendentVoidPassive(rawEntry.transcendent) : null;
        if (stats.length > 0 || transcendent || rawVoidPassives[nodeId] || allocatedVoidIds.has(String(nodeId))) merged.voidPassives[nodeId] = { rarity: transcendent ? 'transcendent' : (stats.length > 0 ? 'magic' : 'normal'), stats, transcendent };
    });
    merged.completedTrials = Array.isArray(merged.completedTrials) ? merged.completedTrials.filter(id => typeof id === 'string') : [];
    merged.unlockedTrials = Array.isArray(merged.unlockedTrials) ? merged.unlockedTrials.filter(id => typeof id === 'string') : [];
    Object.assign(merged, craftingWorkspaceState.restore(merged));
    merged.skillSubtab = ['skill-tab-equip','skill-tab-enhance','skill-tab-research','skill-tab-condition'].includes(merged.skillSubtab) ? merged.skillSubtab : 'skill-tab-equip';
    merged.skillAutoRules = normalizeSavedTacticRules(merged.skillAutoRules);
    // 컨디션 젬 → 부적 조건부 줄(2026-09-30): 젬 · 레벨 · 가공 선택 · 전투 중 버프 · 젬 규칙은 보상 없이 지운다. 전술 규칙은 남는다.
    ['conditionGemUnlocked', 'conditionGemPool', 'conditionGemLevels', 'pendingConditionGemChoices', 'conditionGemCooldowns', 'playerConditionBuffs',
        'lastConditionGemCast', 'playerCastDelayUntil', 'enemyCurseExpirePayloads'].forEach(key => delete merged[key]);
    merged.beyondBoundary = normalizeBeyondBoundaryState(merged.beyondBoundary, merged);
    delete merged.worldDeck;
    merged.clearedRootBosses = Array.isArray(merged.clearedRootBosses) ? merged.clearedRootBosses : [];
    merged.mapSubtab = ['map-tab-zones', 'map-tab-chaos-realm', 'map-tab-sky', 'map-tab-underworld', 'map-tab-cosmos', 'map-tab-ocean', 'map-tab-fishing', 'map-tab-pvp'].includes(merged.mapSubtab) ? merged.mapSubtab : 'map-tab-zones';
    merged.mapExploreSubtab = ['map-explore-atlas', 'map-explore-worldtree', 'map-explore-hunting', 'map-explore-chaos', 'map-explore-root-boss', 'map-explore-beyond', 'map-explore-labyrinth', 'map-explore-deep-chaos', 'map-explore-meteor', 'map-explore-beehive', 'map-explore-colony', 'map-explore-voidrift', 'map-explore-timerift', 'map-explore-trials'].includes(merged.mapExploreSubtab) ? merged.mapExploreSubtab : 'map-explore-atlas';
    delete merged.coreCube; delete merged.unlocks.cube; delete merged.noti.cube; // 코어 큐브 → 코어 칸(2026-09-30): 예전 진행은 보상 없이 지운다.
    merged.cores = coreItems.normalize(merged.cores);
    merged.gemFoldInactiveAttack = !!merged.gemFoldInactiveAttack;
    merged.gemFoldInactiveSupport = !!merged.gemFoldInactiveSupport;
    let gemResearchExpanded = merged.gemResearchExpanded && typeof merged.gemResearchExpanded === 'object' && !Array.isArray(merged.gemResearchExpanded) ? merged.gemResearchExpanded : {};
    merged.gemResearchExpanded = {};
    ['attack', 'support'].forEach(section => {
        if (typeof gemResearchExpanded[section] === 'boolean') merged.gemResearchExpanded[section] = gemResearchExpanded[section];
    });
    if (merged.gemFoldInactive) {
        merged.gemFoldInactiveAttack = true;
        merged.gemFoldInactiveSupport = true;
    }
    merged.autoRepeatSeasonBoss = !!merged.autoRepeatSeasonBoss;
    if (((merged.currencies || {}).talismanCore || 0) > 0) {
        merged.currencies.sealShard = (merged.currencies.sealShard || 0) + (merged.currencies.talismanCore || 0);
        merged.currencies.talismanCore = 0;
    }
    if (((merged.currencies || {}).jewelCore || 0) > 0) {
        merged.currencies.jewelShard = (merged.currencies.jewelShard || 0) + Math.max(0, Math.floor(merged.currencies.jewelCore || 0));
        merged.currencies.jewelCore = 0;
    }
    // 부적 판 → 그루터기 함의 부적(2026-09-30): 예전 판 · 배치 · 보유 부적은 보상 없이 지운다. 봉인편린은 그대로 쓴다.
    ['talismanUnlocked', 'talismanBoardUnlock', 'talismanUnlockedCells', 'talismanInventory', 'talismanBoard', 'talismanPlacements',
        'talismanSelectedId', 'talismanUnseal', 'talismanUnlockPickMode', 'talismanSubtab'].forEach(key => delete merged[key]);
    delete merged.unlocks.talisman; delete merged.noti.talisman;
    merged.gemEnhanceUnlocked = !!merged.gemEnhanceUnlocked;
    merged.gemEngraveSelectedSlot = Math.max(0, Math.min(4, Math.floor(clampFiniteNumber(merged.gemEngraveSelectedSlot, 0, 0, 4))));
    merged.gemEnhanceTargetSkill = (typeof merged.gemEnhanceTargetSkill === 'string' && SKILL_DB[merged.gemEnhanceTargetSkill] && SKILL_DB[merged.gemEnhanceTargetSkill].isGem && Array.isArray(merged.skills) && merged.skills.includes(merged.gemEnhanceTargetSkill)) ? merged.gemEnhanceTargetSkill : null;
    merged.uniqueCodex = (merged.uniqueCodex && typeof merged.uniqueCodex === 'object') ? merged.uniqueCodex : {};
    normalizeUniqueHuntSave(merged);
    merged.codexNewlyRegistered = (merged.codexNewlyRegistered && typeof merged.codexNewlyRegistered === 'object') ? merged.codexNewlyRegistered : {};
    merged.codexCollapsedSlots = (merged.codexCollapsedSlots && typeof merged.codexCollapsedSlots === 'object') ? merged.codexCollapsedSlots : {};
    merged.codexSubtab = (merged.codexSubtab === 'realm') ? 'realm' : 'main';
    merged.codexSelectedSlot = getCodexSlotOrder().includes(merged.codexSelectedSlot) ? merged.codexSelectedSlot : '무기';
    merged.uniqueCodexCompletedRewardClaimed = !!merged.uniqueCodexCompletedRewardClaimed;
    if (!merged.gemEnhanceUnlocked && (((merged.currencies || {}).bossCore || 0) > 0 || ((merged.currencies || {}).skyEssence || 0) > 0)) merged.gemEnhanceUnlocked = true;
    merged.inTicketBossFight = !!merged.inTicketBossFight;
    merged.beehive = (merged.beehive && typeof merged.beehive === 'object') ? merged.beehive : { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 };
    merged.colony = (merged.colony && typeof merged.colony === 'object') ? { ...defaultGame.colony, ...merged.colony } : { ...defaultGame.colony };
    merged.colony.wave = Math.max(0, Math.floor(clampFiniteNumber(merged.colony.wave, 0, 0)));
    merged.colony.highestWave = Math.max(merged.colony.wave, Math.floor(clampFiniteNumber(merged.colony.highestWave, merged.colony.wave, 0)));
    merged.colony.wardInventory = Array.isArray(merged.colony.wardInventory) ? merged.colony.wardInventory.map(w => w && typeof w === 'object' ? { ...w, locked: !!w.locked } : w).filter(Boolean) : [];
    merged.colony.wardEquipped = Array.isArray(merged.colony.wardEquipped) ? merged.colony.wardEquipped.slice(0, 4) : [null,null,null,null];
    while (merged.colony.wardEquipped.length < 4) merged.colony.wardEquipped.push(null);
    let highestWardSlot = merged.colony.wardEquipped.reduce((max, ward, idx) => ward ? Math.max(max, idx + 1) : max, 1);
    if (!savedColonyHadWardSlotVersion) merged.colony.wardSlots = highestWardSlot;
    else merged.colony.wardSlots = Math.max(1, Math.min(4, Math.floor(merged.colony.wardSlots || 1)));
    merged.colony.wardSlots = Math.max(merged.colony.wardSlots, highestWardSlot);
    merged.colony.wardSlotVersion = 1;
    let beeHasReturnZone = merged.beehive.returnZoneId !== undefined && merged.beehive.returnZoneId !== null;
    let beeHasStartedRoute = Math.max(0, Math.floor(merged.beehive.branchStep || 0)) > 0;
    let activeBeehiveRuntime = !!(merged.beehive.inRun && merged.currentZoneId === 'beehive_run' && (
        merged.beehive.awaitingClear
        || (merged.beehive.pendingChoice && (beeHasReturnZone || beeHasStartedRoute))
        || merged.beehive.queenActive
        || merged.beehive.pendingWaveReward
        || (Array.isArray(merged.beehive.pendingQueenRewards) && merged.beehive.pendingQueenRewards.length > 0)
        || (Array.isArray(merged.enemies) && merged.enemies.some(enemy => enemy && enemy.hp > 0))
    ));
    if (!activeBeehiveRuntime) {
        let staleBeehiveReturnZone = beeHasReturnZone ? merged.beehive.returnZoneId : merged.maxZoneId;
        merged.beehive.inRun = false;
        resetBeehiveRunModifiers(merged.beehive);
        if (merged.currentZoneId === 'beehive_run') merged.currentZoneId = staleBeehiveReturnZone;
    }
    if (merged.beehive && merged.beehive.inRun) {
        merged.combatHalted = !merged.beehive.awaitingClear;
    } else {
        merged.combatHalted = !!merged.combatHalted;
    }
    merged.seenTutorials = Array.isArray(merged.seenTutorials) ? merged.seenTutorials.filter(id => typeof id === 'string') : [];
    merged.starterGemTutorialPending = typeof merged.starterGemTutorialPending === 'string'
        && Array.isArray(merged.skills) && merged.skills.includes(merged.starterGemTutorialPending)
        ? merged.starterGemTutorialPending
        : null;
    merged.journalEntries = Array.isArray(merged.journalEntries) ? Array.from(new Set(merged.journalEntries.filter(id => typeof id === 'string' && JOURNAL_DB[id]))) : ['prologue'];
    // 보스 도전 추적은 저장 복원 후 이어 붙이지 않는다. 탭이 닫힌 동안의 피해를
    // 잃은 기록으로 업적을 잘못 판정하지 않도록 새 조우에서만 다시 시작한다.
    merged.hiddenJournalBossRun = null;
    // 전적: 기존 세이브에는 과거 시간 데이터가 없다. 지어내지 않고 지금부터 기록을 시작하며,
    // startedAt이 남으므로 화면이 "언제부터의 기록인지"를 그대로 밝힐 수 있다.
    if (typeof ensureRecordsState === 'function') ensureRecordsState(merged);
    normalizeVoidRiftSave(merged);
    merged.timeRift = (merged.timeRift && typeof merged.timeRift === 'object') ? { ...defaultGame.timeRift, ...merged.timeRift } : { ...defaultGame.timeRift };
    merged.timeRift.fusionCount = Math.max(0, Math.floor(clampFiniteNumber(merged.timeRift.fusionCount, 0, 0)));
    repairJournalEntriesFromProgress(merged);
    // 저널 보너스는 기록 정의에서 항상 재구축한다. 저장 배열을 그대로 신뢰하면
    // 클라우드 병합·구버전 이관 과정에서 같은 기록이 중복되어 능력치가 누적될 수 있다.
    let journalLoadState = rebuildJournalBonusStateForLoad(merged);
    let pendingJournalPassivePoints = Math.max(0, Math.floor(journalLoadState.pendingPassivePoints || 0));
    merged.passiveStarEvolution = !!merged.passiveStarEvolution;
    // outer_constellation: 별쐐기 성률로 각성한 옛 저장(각성은 영구히 유지). outer_void: 외곽 공허 소켓 여섯의 초월.
    const awakeningSources = new Set(['legacy_migrated', 'legacy_apex', 'outer_constellation', 'outer_void']);
    merged.passiveStarEvolutionSource = merged.passiveStarEvolution
        ? (awakeningSources.has(merged.passiveStarEvolutionSource) ? merged.passiveStarEvolutionSource : 'legacy_migrated')
        : null;
    merged.settings.showDeathNotice = merged.settings.showDeathNotice !== false;
    merged.settings.uiSounds = merged.settings.uiSounds !== false;
    // 라이트 모드는 2026-09 UI 개편에서 제거됐다(다크 전용). 이전 저장의 설정값은 버린다.
    delete merged.settings.themeMode;
    merged.settings.uiSkin = normalizeUiSkin(merged.settings.uiSkin);
    merged.settings.highContrast = merged.settings.highContrast === true;
    merged.settings.hotkeyOverrides = hotkeyBindings.normalize(merged.settings.hotkeyOverrides);
    merged.settings.uiScale = normalizeUiScale(merged.settings.uiScale);
    merged.settings.tabLayouts = normalizeTabLayoutSettings(save.settings || {});
    ['tabOrder', 'tabPlacement', 'tabGroupOrder', 'tabPlacementInitialized'].forEach(key => delete merged.settings[key]);
    merged.settings.twoRowTabs = false;
    merged.settings.leftPaneCollapsed = !!merged.settings.leftPaneCollapsed;
    merged.settings.combatLogCollapsed = !!merged.settings.combatLogCollapsed;
    merged.settings.mobileCombatLogExpanded = merged.settings.mobileCombatLogExpanded === true;
    equipmentLootPolicy.normalizeSettings(merged.settings);
    merged.settings.autoEnterGrandBreach = !!merged.settings.autoEnterGrandBreach;
    merged.settings.inventoryViewRarities = { ...(defaultGame.settings.inventoryViewRarities || {}), ...(merged.settings.inventoryViewRarities || {}) };
    delete merged.settings.jewelAutoSalvageEnabled; delete merged.settings.jewelAutoSalvageRarities; // 주얼 자동 해체는 주얼 창과 함께 없어졌다.
    merged.settings.mapCompleteAction = ['nextZone', 'repeatZone', 'nextLoopBestPlusOne', 'stop'].includes(merged.settings.mapCompleteAction) ? merged.settings.mapCompleteAction : 'nextZone';
    merged.settings.actExplorationMode = merged.settings.actExplorationMode === 'full' ? 'full' : 'direct';
    normalizeAutomationSettings(merged.settings);
    merged.settings.disableItemAutomationAfterLoop = merged.settings.disableItemAutomationAfterLoop !== false;
    merged.settings.postLoopMapCompleteAction = ['nextZone', 'repeatZone', 'nextLoopBestPlusOne', 'stop'].includes(merged.settings.postLoopMapCompleteAction) ? merged.settings.postLoopMapCompleteAction : 'nextLoopBestPlusOne';
    merged.settings.townReturnAction = ['retry', 'stop'].includes(merged.settings.townReturnAction) ? merged.settings.townReturnAction : 'retry';
    merged.heroSelectionInitialized = !!merged.heroSelectionInitialized;
    let hasSavedTalentHero = !!HERO_SELECTION_DEFS[save && save.selectedHeroId];
    merged.selectedHeroId = hasSavedTalentHero ? save.selectedHeroId : 'hero1';
    let legacyMotionId = save && save.settings && typeof save.settings.testCharacterMotionId === 'string'
        ? save.settings.testCharacterMotionId.replace(/^motion_/, '') : '';
    let migratedClassId = PLAYER_CLASS_DEFS[save && save.selectedClassId]
        ? save.selectedClassId
        : (PLAYER_CLASS_DEFS[legacyMotionId] ? legacyMotionId : LEGACY_HERO_TO_PLAYER_CLASS[merged.selectedHeroId]);
    merged.selectedClassId = PLAYER_CLASS_DEFS[migratedClassId] ? migratedClassId : 'archer';
    if (!hasSavedTalentHero) merged.selectedHeroId = PLAYER_CLASS_DEFS[merged.selectedClassId].recommendedTalentHeroId;
    let classTalentAlignmentVersion = Math.max(0, Math.floor(Number(save && save.classTalentAlignmentVersion) || 0));
    if (classTalentAlignmentVersion < 1 && save && save.heroSelectionInitialized) {
        merged.selectedHeroId = PLAYER_CLASS_DEFS[merged.selectedClassId].recommendedTalentHeroId;
    }
    merged.classTalentAlignmentVersion = 1;
    let hasSavedTalentInitializedFlag = !!save
        && Object.prototype.hasOwnProperty.call(save, 'talentSelectionInitialized');
    merged.talentSelectionInitialized = hasSavedTalentInitializedFlag
        ? !!save.talentSelectionInitialized
        : (hasSavedTalentHero || !!merged.heroSelectionInitialized);
    let legacyAppearanceClassId = LEGACY_HERO_TO_PLAYER_CLASS[save && save.appearanceHeroId];
    merged.appearanceClassId = PLAYER_CLASS_DEFS[save && save.appearanceClassId]
        ? save.appearanceClassId
        : (PLAYER_CLASS_DEFS[legacyAppearanceClassId] ? legacyAppearanceClassId : null);
    let savedDiscoveredClasses = Array.isArray(save && save.discoveredClassIds)
        ? save.discoveredClassIds
        : (Array.isArray(save && save.discoveredHeroIds) ? save.discoveredHeroIds.map(id => LEGACY_HERO_TO_PLAYER_CLASS[id]) : []);
    merged.discoveredClassIds = [...new Set(savedDiscoveredClasses.filter(id => PLAYER_CLASS_DEFS[id]))];
    merged.classFreeSwitchUnlocked = !!(save && (save.classFreeSwitchUnlocked || save.heroFreeSwitchUnlocked));
    if ((merged.heroSelectionInitialized || merged.classFreeSwitchUnlocked) && !merged.discoveredClassIds.includes(merged.selectedClassId)) {
        merged.discoveredClassIds.push(merged.selectedClassId);
    }
    merged.classFreeSwitchUnlocked = merged.classFreeSwitchUnlocked || merged.discoveredClassIds.length >= PLAYER_CLASS_ORDER.length;
    merged.settings.heroAppearanceMode = ['fixed', 'loop'].includes(savedHeroAppearanceMode)
        ? savedHeroAppearanceMode
        : (merged.appearanceClassId ? 'fixed' : 'loop');
    if (merged.settings.heroAppearanceMode === 'fixed' && !merged.appearanceClassId) merged.appearanceClassId = merged.selectedClassId;
    delete merged.appearanceHeroId;
    delete merged.discoveredHeroIds;
    delete merged.heroFreeSwitchUnlocked;
    merged.pendingLoopHeroSelection = !!merged.pendingLoopHeroSelection;
    merged.abyssClearedDepths = Array.isArray(merged.abyssClearedDepths) ? merged.abyssClearedDepths.map(v => Math.max(1, Math.floor(v || 1))).filter(v => v <= 20) : [];
    merged.playerAilments = Array.isArray(merged.playerAilments) ? merged.playerAilments.map(row => ({ type: row.type, time: Math.max(0, clampFiniteNumber(row.time, 0, 0, 30)), power: Math.max(0, clampFiniteNumber(row.power, 0.1, 0, 1.5)), sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))) })).filter(row => row.type) : [];
    merged.playerLeechInstances = Array.isArray(merged.playerLeechInstances) ? merged.playerLeechInstances.map(row => ({ remaining: Math.max(0, clampFiniteNumber(row.remaining, 0, 0)), rate: Math.max(0, clampFiniteNumber(row.rate, 0, 0)), target: row.target === 'energyShield' ? 'energyShield' : 'life' })).filter(row => row.remaining > 0 && row.rate > 0).slice(0, 80) : [];
    merged.recentDamageEvents = Array.isArray(merged.recentDamageEvents) ? merged.recentDamageEvents.map(normalizeRecentDamageEvent).filter(Boolean) : [];
    merged.lastDeathLog = normalizeDeathLog(merged.lastDeathLog);
    merged.actRetreat = normalizeActRetreat(merged.actRetreat);
    merged.enemies = Array.isArray(merged.enemies) ? merged.enemies.map(normalizeEnemyRecord).filter(Boolean) : [];
    if(merged.actExploration) {
        // Validate the original ownership/HP first so normalization cannot revive a corrupt record.
        actExplorationState.validate(merged.actExploration, save.enemies || []);
        merged.actExploration.packs.forEach(pack=>{pack.waiting=pack.waiting.map(normalizeEnemyRecord);});
    }
    let aliveEnemyIds = new Set((merged.enemies || []).map(enemy => String(enemy.id)));
    function pruneEnemyRuntimeMap(rawMap, options = {}) {
        let map = (rawMap && typeof rawMap === 'object') ? rawMap : {};
        let keys = Object.keys(map);
        let maxKeys = Math.max(0, Math.floor(options.maxKeys || 200));
        let out = {};
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (!aliveEnemyIds.has(String(key))) continue;
            out[key] = map[key];
            if (Object.keys(out).length >= maxKeys) break;
        }
        return out;
    }
    merged.enemyKeystoneDebuffs = pruneEnemyRuntimeMap(merged.enemyKeystoneDebuffs, { maxKeys: 120 });
    merged.rangerWeakpointMarks = pruneEnemyRuntimeMap(merged.rangerWeakpointMarks, { maxKeys: 120 });
    merged.enemyUniqueChaosResDown = pruneEnemyRuntimeMap(merged.enemyUniqueChaosResDown, { maxKeys: 120 });
    merged.enemyUniqueElementalResDown = pruneEnemyRuntimeMap(merged.enemyUniqueElementalResDown, { maxKeys: 120 });
    merged.encounterPlan = Array.isArray(merged.encounterPlan) ? merged.encounterPlan.map(normalizeEncounterMarker).filter(Boolean).sort((a, b) => a.at - b.at) : [];
    merged.level = Math.max(1, Math.floor(clampFiniteNumber(merged.level, defaultGame.level, 1, MAX_PLAYER_LEVEL)));
    merged.exp = Math.max(0, Math.floor(clampFiniteNumber(merged.exp, defaultGame.exp, 0)));
    merged.season = Math.max(1, Math.floor(clampFiniteNumber(merged.season, defaultGame.season, 1)));
    merged.loopCount = Math.max(0, Math.floor(clampFiniteNumber(merged.loopCount, defaultGame.loopCount, 0)));
    if (typeof ensureOfflineProgressState === 'function') ensureOfflineProgressState(merged);
    if (typeof syncOfflineProgressEntitlement === 'function') syncOfflineProgressEntitlement(merged);
    merged.woodsmanDefeatAttempts = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanDefeatAttempts, defaultGame.woodsmanDefeatAttempts, 0)));
    merged.woodsmanSimulatorSeenLoop = !!merged.woodsmanSimulatorSeenLoop;
    merged.woodsmanEntrancePending = !!(merged.woodsmanEntrancePending && merged.currentZoneId === OUTSIDE_CHAOS_ZONE_ID);
    merged.woodsmanCurseActive = !!merged.woodsmanCurseActive;
    merged.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseDamageTakenStacks, defaultGame.woodsmanCurseDamageTakenStacks || 0, 0)));
    merged.woodsmanCurseLastTickAt = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseLastTickAt, defaultGame.woodsmanCurseLastTickAt || 0, 0)));
    merged.woodsmanCurseNextLogStack = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseNextLogStack, defaultGame.woodsmanCurseNextLogStack || 0, 0)));
    merged.chaosInfuserUnlocked = !!merged.chaosInfuserUnlocked || merged.woodsmanSimulatorSeenLoop || Math.max(0, Math.floor(merged.woodsmanDefeatAttempts || 0)) > 0 || (Array.isArray(merged.journalEntries) && merged.journalEntries.includes('woodsman'));
    merged.killsInZone = Math.max(0, Math.floor(clampFiniteNumber(merged.killsInZone, defaultGame.killsInZone, 0)));
    merged.passivePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.passivePoints, defaultGame.passivePoints, 0))) + Math.max(0, Math.floor(merged.autoRefundedPassivePoints || 0)) + pendingJournalPassivePoints;
    passiveRouting.reconcile(merged, PASSIVE_TREE, getPassiveRouting(merged), passiveRouting.pointBudget(merged) - passiveAllocationNormalization.lostBonus);
    delete merged.inventoryExpandLevel;
    merged.jewelInventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.jewelInventoryExpandLevel, defaultGame.jewelInventoryExpandLevel, 0)));
    merged.settings = { ...defaultGame.settings, ...(merged.settings || {}) };
    delete merged.settings.testCharacterMotionId;
    merged.settings.chatMessageSize = ['small', 'medium', 'large'].includes(merged.settings.chatMessageSize) ? merged.settings.chatMessageSize : 'medium';
    const passiveVisualVersion = Math.max(0, Math.floor(Number(save && save.settings && save.settings.passiveTreeVisualStyleVersion) || 0));
    if (passiveVisualVersion < 1) merged.settings.passiveTreeShowLabels = false;
    else merged.settings.passiveTreeShowLabels = merged.settings.passiveTreeShowLabels === true;
    merged.settings.passiveInvestmentSummaryCollapsed = passiveVisualVersion < 2
        ? true : merged.settings.passiveInvestmentSummaryCollapsed === true;
    merged.settings.passiveTreeVisualStyleVersion = 2;
    if (typeof normalizePassiveTreePlannerState === 'function') {
        merged.settings.passiveTreePlanner = normalizePassiveTreePlannerState(merged.settings.passiveTreePlanner);
    }
    merged.settings.damageNumberFormat = ['comma', 'korean', 'korean_short', 'english'].includes(merged.settings.damageNumberFormat) ? merged.settings.damageNumberFormat : 'comma';
    merged.settings.showExpComma = merged.settings.showExpComma !== false;
    merged.settings.showHpComma = merged.settings.showHpComma !== false;
    merged.settings.showEnemyHpComma = merged.settings.showEnemyHpComma !== false;
    merged.settings.showCharacterComma = merged.settings.showCharacterComma !== false;
    merged.settings.notiFilters = { ...(defaultGame.settings.notiFilters || {}), ...(merged.settings.notiFilters || {}) };
    delete merged.settings.notiFilters.hideout; delete merged.settings.notiFilters.talisman;
    merged.playerHp = Math.max(0, Math.floor(clampFiniteNumber(merged.playerHp, defaultGame.playerHp, 0)));
    merged.playerEnergyShield = Math.max(0, Math.floor(clampFiniteNumber(merged.playerEnergyShield, defaultGame.playerEnergyShield, 0)));
    merged.moveTimer = clampFiniteNumber(merged.moveTimer, defaultGame.moveTimer, 0);
    merged.moveTotalTime = clampFiniteNumber(merged.moveTotalTime, defaultGame.moveTotalTime, 0);
    merged.runProgress = clampFiniteNumber(merged.runProgress, defaultGame.runProgress, 0, 100);
    merged.encounterIndex = Math.max(0, Math.floor(clampFiniteNumber(merged.encounterIndex, defaultGame.encounterIndex, 0)));
    merged.nextEnemyId = Math.max(1, Math.floor(clampFiniteNumber(merged.nextEnemyId, defaultGame.nextEnemyId, 1)));
    merged.seasonPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.seasonPoints, defaultGame.seasonPoints, 0)));
    merged.loopDeepPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.loopDeepPoints, defaultGame.loopDeepPoints, 0)));
    merged.loopDeepStats = { ...(defaultGame.loopDeepStats || {}), ...(merged.loopDeepStats || {}) };
    merged.chaosRealm = { ...createDefaultChaosRealmState(), ...(merged.chaosRealm || {}) };
    merged.skyTower = { ...createDefaultSkyTowerState(), ...(merged.skyTower || {}) };
    const legacyCondensedSkyPower = Math.max(0, Math.floor(Number(merged.currencies.condensedSkyPower) || 0));
    if (legacyCondensedSkyPower > 0) {
        merged.skyTower.condensedPower = Math.max(0, Math.floor(Number(merged.skyTower.condensedPower) || 0)) + legacyCondensedSkyPower;
    }
    delete merged.currencies.condensedSkyPower;
    merged.skyTower.skyStone = { ...(createDefaultSkyTowerState().skyStone || {}), ...((merged.skyTower || {}).skyStone || {}) };
    merged.skyTower.gemBoosts = { ...((merged.skyTower || {}).gemBoosts || {}) };
    merged.chaosRealm.permanentBonuses = { ...CHAOS_REALM_DEFAULT_BONUSES, ...((merged.chaosRealm || {}).permanentBonuses || {}) };
    merged.chaosRealm.unlocked = !!merged.chaosRealm.unlocked;
    merged.chaosRealm.highestFloor = Math.max(0, Math.floor(clampFiniteNumber(merged.chaosRealm.highestFloor, 0, 0)));
    merged.chaosRealm.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.chaosRealm.currentFloor, 1, 1)));
    let hasSavedUnderworldProgress = !!(save && typeof save === 'object' && save.underworldProgress && typeof save.underworldProgress === 'object');
    let legacyUnderworldProgress = {};
    if (!hasSavedUnderworldProgress) {
        let legacyHighest = Math.max(1, Math.floor(clampFiniteNumber(((save && save.chaosRealm) || {}).highestFloor, 1, 1)));
        let legacyCurrent = Math.max(1, Math.floor(clampFiniteNumber(((save && save.chaosRealm) || {}).currentFloor, 1, 1)));
        legacyUnderworldProgress = { highestFloor: legacyHighest, currentFloor: legacyCurrent, floor10Cleared: legacyHighest >= 11 };
    }
    merged.underworldProgress = { ...(defaultGame.underworldProgress || { highestFloor: 1, currentFloor: 1 }), ...legacyUnderworldProgress, ...(merged.underworldProgress || {}) };
    merged.underworldProgress.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.underworldProgress.highestFloor, 1, 1)));
    merged.underworldProgress.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.underworldProgress.currentFloor, 1, 1)));
    let savedRunes = (merged.underworldRunes && typeof merged.underworldRunes === 'object') ? merged.underworldRunes : {};
    let underworld10ClearCredit = !!merged.underworldProgress.floor10Cleared
        || Math.max(0, Math.floor(Number(savedRunes.unlockedSlots) || 0)) >= 1
        || Math.max(0, Math.floor(Number(savedRunes.unlockedRunesMaxNumber) || 0)) >= 1;
    merged.underworldProgress.floor10Cleared = underworld10ClearCredit;
    if (!underworld10ClearCredit) {
        merged.underworldProgress.highestFloor = Math.min(merged.underworldProgress.highestFloor, 10);
        merged.underworldProgress.currentFloor = Math.min(merged.underworldProgress.currentFloor, merged.underworldProgress.highestFloor);
    }
    merged.chaosRealm.clearedFloors = Array.isArray(merged.chaosRealm.clearedFloors) ? Array.from(new Set(merged.chaosRealm.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    merged.chaosRealm.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(merged.chaosRealm.woodsmanBestDamagePct) || 0));
    Object.keys(CHAOS_REALM_DEFAULT_BONUSES).forEach(key => { merged.chaosRealm.permanentBonuses[key] = Math.max(0, Number(merged.chaosRealm.permanentBonuses[key]) || 0); });
    if (merged.chaosRealm.unlocked && merged.chaosRealm.highestFloor < 1) merged.chaosRealm.highestFloor = 1;
    merged.skyTower.unlocked = !!merged.skyTower.unlocked;
    merged.skyTower.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.skyTower.highestFloor, 1, 1)));
    merged.skyTower.currentFloor = Math.max(1, Math.min(merged.skyTower.highestFloor, Math.floor(clampFiniteNumber(merged.skyTower.currentFloor, 1, 1))));
    merged.skyTower.loopSeason = Math.max(1, Math.floor(clampFiniteNumber(merged.skyTower.loopSeason, merged.season || 1, 1)));
    if (merged.skyTower.loopSeason !== Math.max(1, Math.floor(merged.season || 1))) { merged.skyTower.loopSeason = Math.max(1, Math.floor(merged.season || 1)); merged.skyTower.clearedThisLoop = 0; }
    merged.skyTower.clearedThisLoop = Math.max(0, Math.min(getSkyTowerLoopClearLimit(), Math.floor(clampFiniteNumber(merged.skyTower.clearedThisLoop, 0, 0))));
    merged.skyTower.clearedFloors = Array.isArray(merged.skyTower.clearedFloors) ? Array.from(new Set(merged.skyTower.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    merged.skyTower.condensedPower = Math.max(0, Math.floor(clampFiniteNumber(merged.skyTower.condensedPower, 0, 0)));
    merged.skyTower.skyStone.level = Math.max(0, Math.min(getSkyStoneMaxLevel(), Math.floor(clampFiniteNumber(merged.skyTower.skyStone.level, 0, 0))));
    merged.skyTower.skyStone.crafted = !!merged.skyTower.skyStone.crafted || merged.skyTower.skyStone.level > 0;
    Object.keys(merged.skyTower.gemBoosts).forEach(name => { merged.skyTower.gemBoosts[name] = Math.max(0, Math.min(getSkyTowerGemBoostMaxLevel(), Math.floor(clampFiniteNumber(merged.skyTower.gemBoosts[name], 0, 0)))); if (merged.skyTower.gemBoosts[name] <= 0) delete merged.skyTower.gemBoosts[name]; });
    if (!merged.skyTower.unlocked && ((merged.season || 1) > 15 || ((merged.season || 1) >= 15 && (merged.loopProgressCurrent && merged.loopProgressCurrent.chaos20Cleared)))) merged.skyTower.unlocked = true;
    merged.woodsmanPendingScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanPendingScore, defaultGame.woodsmanPendingScore || 0, 0)));
    merged.woodsmanLifetimeScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanLifetimeScore, defaultGame.woodsmanLifetimeScore || 0, 0)));
    merged.woodsmanSettledScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanSettledScore, defaultGame.woodsmanSettledScore || 0, 0)));
    merged.woodsmanEchoRun = (merged.woodsmanEchoRun && typeof merged.woodsmanEchoRun === 'object') ? merged.woodsmanEchoRun : { active:false, timeLeft:0, duration:30, lastTickAt:0, totalDamage:0, bestDps:0 };
    merged.woodsmanEchoRun.active = !!merged.woodsmanEchoRun.active;
    merged.woodsmanEchoRun.timeLeft = Math.max(0, Number(merged.woodsmanEchoRun.timeLeft || 0));
    merged.woodsmanEchoRun.duration = 30;
    merged.woodsmanEchoRun.totalDamage = Math.max(0, Math.floor(Number(merged.woodsmanEchoRun.totalDamage || 0)));
    merged.woodsmanEchoRun.bestDps = Math.max(0, Number(merged.woodsmanEchoRun.bestDps || 0));
    merged.loopProgressBase = { ...(defaultGame.loopProgressBase || {}), ...(merged.loopProgressBase || {}) };
    merged.loopProgressCurrent = { ...(defaultGame.loopProgressCurrent || {}), ...(merged.loopProgressCurrent || {}), ...Object.fromEntries(['bestSkyFloor','bestUnderworldFloor'].map(key => [key, Number.isFinite(save?.loopProgressCurrent?.[key]) ? Math.max(0,Math.floor(save.loopProgressCurrent[key])) : null])) };
    merged.loopProgressBase.specialBosses = Array.isArray(merged.loopProgressBase.specialBosses) ? merged.loopProgressBase.specialBosses : [];
    merged.loopProgressCurrent.specialBosses = Array.isArray(merged.loopProgressCurrent.specialBosses) ? merged.loopProgressCurrent.specialBosses : [];
    merged.loopProgressCurrent.cosmosPlanets = Array.isArray(merged.loopProgressCurrent.cosmosPlanets) ? Array.from(new Set(merged.loopProgressCurrent.cosmosPlanets.filter(Boolean))) : [];
    merged.cosmosLoopCount = Math.max(0, Math.floor(clampFiniteNumber(merged.cosmosLoopCount, defaultGame.cosmosLoopCount || 0, 0)));
    merged.lastLoopAdvancePath = ['chaos', 'cosmos'].includes(merged.lastLoopAdvancePath) ? merged.lastLoopAdvancePath : null;
    merged.loopProgressCurrent.chaos20Cleared = !!merged.loopProgressCurrent.chaos20Cleared || (Array.isArray(merged.abyssClearedDepths) && merged.abyssClearedDepths.map(v => Math.floor(v || 0)).includes(20));
    if (!merged.skyTower.unlocked && (merged.season || 1) >= 15 && merged.loopProgressCurrent.chaos20Cleared) merged.skyTower.unlocked = true;
    normalizeLoopGateFlags(merged);
    merged.ascendPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendPoints, defaultGame.ascendPoints, 0)));
    merged.ascendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, defaultGame.ascendRank, 0, 5))); // 재능 개화는 5
    normalizeSkillSlotsSave(merged);
    if (Array.isArray(merged.woodsmanBuildSnapshot?.skills)) normalizeSkillSlotsSave(merged.woodsmanBuildSnapshot);
    merged.equippedSummonSkills = Array.isArray(merged.equippedSummonSkills)
        ? Array.from(new Set(merged.equippedSummonSkills.filter(name => {
            let def = SKILL_DB[name] || {};
            return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_attack') && merged.skills.includes(name));
        })))
        : [];
    let hasSavedSummonSkillCounts = !!(save && Object.prototype.hasOwnProperty.call(save, 'summonSkillCounts') && save.summonSkillCounts && typeof save.summonSkillCounts === 'object');
    merged.summonSkillCounts = hasSavedSummonSkillCounts ? { ...merged.summonSkillCounts } : {};
    Object.keys(merged.summonSkillCounts).forEach(name => { if (!merged.equippedSummonSkills.includes(name)) delete merged.summonSkillCounts[name]; });
    if (hasSavedSummonSkillCounts) merged.equippedSummonSkills.forEach(name => { merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(merged.summonSkillCounts[name]) || 1)); });
    let ownedSummonAttackSkills = (Array.isArray(merged.skills) ? merged.skills : []).filter(name => {
        let def = SKILL_DB[name] || {};
        return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_attack'));
    });
    let saveSummonCap = estimateSummonEquipCapForMergedSave(merged);
    if (!merged.summonLoadoutInitialized && merged.equippedSummonSkills.length === 0 && ownedSummonAttackSkills.length > 0) {
        merged.equippedSummonSkills = ownedSummonAttackSkills.slice(0, saveSummonCap);
        if (hasSavedSummonSkillCounts) merged.equippedSummonSkills.forEach(name => { merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(merged.summonSkillCounts[name]) || 1)); });
    }
    if (!hasSavedSummonSkillCounts) {
        let legacySummonCounts = {};
        let guardCount = (Array.isArray(merged.equippedSupports) ? merged.equippedSupports : []).filter(name => {
            let def = SUPPORT_GEM_DB[name] || {};
            return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_guard'));
        }).length;
        let baseAttackSlots = Math.max(0, Math.min(merged.equippedSummonSkills.length, saveSummonCap - guardCount));
        merged.equippedSummonSkills.slice(0, baseAttackSlots).forEach(name => { legacySummonCounts[name] = (legacySummonCounts[name] || 0) + 1; });
        let usedSlots = Math.min(saveSummonCap, guardCount + baseAttackSlots);
        let cursor = 0;
        while (usedSlots < saveSummonCap && merged.equippedSummonSkills.length > 0) {
            let name = merged.equippedSummonSkills[cursor % merged.equippedSummonSkills.length];
            legacySummonCounts[name] = (legacySummonCounts[name] || 0) + 1;
            usedSlots++;
            cursor++;
        }
        merged.summonSkillCounts = legacySummonCounts;
    }
    merged.summonLoadoutInitialized = true;
    normalizeGemEnhanceTargetSave(merged);
    if (typeof merged.currentZoneId === 'string' && /^\d+$/.test(merged.currentZoneId)) merged.currentZoneId = parseInt(merged.currentZoneId, 10);
    if (typeof merged.maxZoneId === 'string' && /^\d+$/.test(merged.maxZoneId)) merged.maxZoneId = parseInt(merged.maxZoneId, 10);
    if (typeof merged.maxZoneId !== 'string') {
        let mergedSeasonCap = getSeasonFinalZoneId(merged.season || 1);
        merged.maxZoneId = clampNumber(Number.isFinite(merged.maxZoneId) ? merged.maxZoneId : 0, 0, Math.max(MAP_ZONES.length - 1, mergedSeasonCap));
    }
    if (typeof merged.currentZoneId !== 'string') {
        let numericZoneId = Number.isFinite(merged.currentZoneId) ? merged.currentZoneId : 0;
        let savedDepth = Math.max(Math.floor(merged.abyssEndlessDepth || 20), getAbyssDepthFromZoneId(numericZoneId), ...((Array.isArray(merged.abyssUnlockedDepths) ? merged.abyssUnlockedDepths : [20]).map(v => Math.floor(v || 0))));
        let maxDeepZoneId = getAbyssZoneIdForDepth(Math.max(20, savedDepth));
        merged.currentZoneId = clampNumber(numericZoneId, 0, Math.max(MAP_ZONES.length - 1, maxDeepZoneId));
    }
    atlas.normalize(merged);
    if (typeof merged.currentZoneId === 'string' && !getSavedZoneForValidation(merged)) merged.currentZoneId = 0;
    if (merged.currentZoneId === BEYOND_BOUNDARY_ZONE_ID && !merged.beyondBoundary.activeRun) merged.currentZoneId = getAutoProgressZoneId(merged.maxZoneId);
    if (merged.currentZoneId === 'beehive_run' && !(merged.beehive && merged.beehive.inRun)) merged.currentZoneId = merged.beehive && merged.beehive.returnZoneId !== undefined && merged.beehive.returnZoneId !== null ? merged.beehive.returnZoneId : merged.maxZoneId;
    if (merged.beehive && merged.beehive.inRun && merged.currentZoneId !== 'beehive_run') {
        merged.beehive.inRun = false;
        resetBeehiveRunModifiers(merged.beehive);
    }
    if (merged.woodsmanBuildLock && (merged.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID || !merged.woodsmanBuildSnapshot)) {
        merged.woodsmanBuildLock = false;
        merged.woodsmanBuildSnapshot = null;
    }
    let currentAbyssDepth = typeof merged.currentZoneId !== 'string' ? getAbyssDepthFromZoneId(merged.currentZoneId) : 0;
    let legacyDeepChaosSlot = (merged.season || 1) >= 10 && currentAbyssDepth === 20 && Math.floor(merged.abyssEndlessDepth || 0) > 20;
    if (typeof merged.maxZoneId !== 'string' && typeof merged.currentZoneId !== 'string' && merged.currentZoneId > merged.maxZoneId && currentAbyssDepth <= 20 && !legacyDeepChaosSlot) merged.currentZoneId = merged.maxZoneId;
    if (merged.discoveredPassives.length === 0) merged.discoveredPassives = [getPassiveTreeRootNodeId(merged)];
    let seasonCap = getSeasonFinalZoneId(merged.season || 1);
    if (typeof merged.maxZoneId !== 'string') merged.maxZoneId = clampNumber(merged.maxZoneId, 0, seasonCap);
    if (typeof merged.currentZoneId !== 'string') {
        let normalizedDepth = getAbyssDepthFromZoneId(merged.currentZoneId);
        let keepLegacyDeepChaosSlot = (merged.season || 1) >= 10 && normalizedDepth === 20 && Math.floor(merged.abyssEndlessDepth || 0) > 20;
        if ((normalizedDepth <= 20 && !keepLegacyDeepChaosSlot) || (merged.season || 1) < 10) merged.currentZoneId = clampNumber(merged.currentZoneId, 0, seasonCap);
    }
    if ((merged.season || 1) >= METEOR_SITE_UNLOCK_LOOP && (merged.maxZoneId || 0) >= METEOR_SITE_UNLOCK_ACT) {
        merged.meteorSite.unlocked = true;
    }
    reconcileMapPrimaryContentUnlocks(merged);
    if (!isMapPrimaryContentUnlocked(merged, merged.mapSubtab)) merged.mapSubtab = 'map-tab-zones';
    if (typeof salvageRecoveryRuntime !== 'undefined') salvageRecoveryRuntime.ensureState(merged);
    if (typeof stumpBox === 'object') stumpBox.restore(merged); merged.stumpCube = stumpCube.normalize(merged.stumpCube);
    merged.saveVersion = defaultGame.saveVersion;
    // 보물사냥은 삭제된 콘텐츠: 남은 진행·예약 보물은 지급 없이 버리고, 표적이던 적은 표시만 지운다.
    delete merged.bountyHunt;
    const explorationPacks = Array.isArray(merged.actExploration?.packs) ? merged.actExploration.packs : [];
    [merged.enemies, ...explorationPacks.map(pack => pack?.waiting)].filter(Array.isArray).flat()
        .forEach(enemy => { if (enemy) { delete enemy.isBountyTarget; delete enemy.bountyId; } });
    [merged.enemies, ...explorationPacks.map(pack => pack?.waiting)].filter(Array.isArray).flat().forEach(stripBossPatternRuntime);
    stripRemovedGrowthBoard(merged);
    stripRemovedFlasks(merged);
    stripRemovedStarWedges(merged);
    stripRemovedAuxSystems(merged);
    migrateRetiredWoodMonsters(merged);
    shrineRuntime.ensureState(merged);
    reconcileUniqueEquipmentSave(merged);
    enforcePassiveEquipmentRestrictions(merged);
    const normalized = normalizeContentProgressionSave(normalizeSavedCombatRuntime(merged), save);
    // Escrow identity checks need the migrated exploration loot containers first.
    playerStall.restore(normalized);
    return normalized;
}

function normalizeSavedCombatRuntime(state) {
    actExplorationState.restore(state);
    combatLootReceipts.normalize(state);
    state.cosmosGravity = null;
    restoreCosmosRouteSave(state);
    const challenge = state.cosmosAtlas.activeChallenge;
    if (challenge) challenge.habitat = cosmosRouteRuntime.habitat(state, challenge.nodeId);
    const time = Number(state.combatTimeMs);
    state.combatTimeMs = Number.isFinite(time) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, time)) : 0;
    delete state.isBackgroundCalculation;
    delete state.backgroundStopReason;
    delete state.backgroundOverflowSalvageCount;
    delete state.backgroundKillMix;
    return state;
}

function getSavedZoneForValidation(state) {
    if (state.currentZoneId === ATLAS.zoneId) return atlas.zone(state);
    // During boot the current game has no challenge yet; validate the incoming snapshot instead.
    if (state.currentZoneId === 'cosmos_challenge') return createCosmosChallengeZone(state);
    const zone = getZone(state.currentZoneId);
    // The zone registry owns valid IDs; array properties such as "constructor" are not zones.
    return zone?.id === state.currentZoneId ? zone : null;
}

/** Restore the additive route ledger; invalid routes never grant rewards or change exploration records. */
function restoreCosmosRouteSave(state) {
    restoreCosmosRouteBoard(state);
    const route = state.cosmosRoute;
    if (!route) { state.cosmosRoute = null; return; }
    if (!isValidCosmosRouteSave(route)) {
        console.warn('Invalid cosmos route save discarded; earned rewards and atlas records retained.');
        state.cosmosRoute = null;
        return;
    }
    state.cosmosRoute = JSON.parse(JSON.stringify(route));
    if (route.version === 1) cosmosRouteRuntime.upgrade(state);
    const active = ['fighting', 'choice'].includes(route.phase);
    if (!active) return;
    if (route.loop !== state.season || state.currentZoneId !== 'cosmos_challenge') {
        state.cosmosRoute.phase = 'returned';
        state.cosmosRoute.queue = [];
        return;
    }
    if (route.phase === 'choice') state.combatHalted = true;
    else if (state.cosmosAtlas.activeChallenge?.nodeId !== route.queue[0]) {
        state.cosmosRoute.phase = 'returned';
        state.cosmosRoute.queue = [];
    }
}

function isValidCosmosRouteSave(route) {
    if ([3,4,5].includes(route.version)) return isValidCosmosExpeditionSave(route);
    return isValidLegacyCosmosRouteSave(route);
}

function isValidLegacyCosmosRouteSave(route) {
    if (![1, 2].includes(route.version) || !['dust', 'boss'].includes(route.goal)) return false;
    if (!['fighting', 'choice', 'complete', 'failed', 'returned'].includes(route.phase)) return false;
    if (![0, 1, 2, 3, 4, 5].includes(route.stage)) return false;
    if (![1, 2, 3, 4, 5].includes(route.legSize)) return false;
    if (!Number.isFinite(route.loop) || !Number.isFinite(route.dust) || route.dust < 0) return false;
    return isValidCosmosRouteLedger(route) && isValidCosmosRouteVersion(route);
}

function isValidCosmosRouteVersion(route) {
    return route.version === 1 || isValidCosmosRoutePlan(route);
}

function restoreCosmosRouteBoard(state) {
    const saved = state.cosmosRouteBoard;
    const defaults = defaultGame.cosmosRouteBoard;
    const board = saved && typeof saved === 'object' ? saved : defaults;
    state.cosmosRouteBoard = {
        seed: Number.isSafeInteger(board.seed) ? Math.max(1, Math.min(1000000000, board.seed)) : 1,
        selected: [0, 1, 2].includes(board.selected) ? board.selected : 0,
        goal: ['dust', 'boss'].includes(board.goal) ? board.goal : 'dust',
        retryAt: Number.isFinite(board.retryAt) ? Math.max(0, Math.min(board.retryAt, Date.now() + COSMOS_ROUTE_G1.retryMs)) : 0,
        decisions: { ...defaults.decisions },
        habitats: defaults.habitats.map((id, index) => Object.hasOwn(COSMOS_ROUTE_G1.habitats, board.habitats?.[index]) ? board.habitats[index] : id)
    };
    for (const stage of [1, 3]) {
        const signal = board.decisions?.[stage];
        if (COSMOS_ROUTE_G1.choices[stage].includes(signal)) state.cosmosRouteBoard.decisions[stage] = signal;
    }
}

function isValidCosmosExpeditionSave(route) {
    if (!['fighting','complete','failed','returned'].includes(route.phase)) return false;
    if (!Number.isSafeInteger(route.seed) || !Number.isFinite(route.loop) || !['dust','boss'].includes(route.goal)) return false;
    const definition = COSMOS_ROUTE_GALAXIES[route.version === 5 ? route.galaxy : 1];
    return !!definition && isValidCosmosExpeditionPlan(route, definition) && isValidCosmosExpeditionLedger(route) && isValidCosmosExpeditionPhase(route);
}

function isValidCosmosExpeditionPlan(route, definition) {
    if (!Array.isArray(route.plan) || route.plan.length !== 4) return false;
    if (!route.plan.every((ids,i) => Array.isArray(ids) && ids.length === definition.lengths[i])) return false;
    if (route.version === 3 && !isValidLegacyCosmosHabitats(route.habitats)) return false;
    const ids = route.plan.flat(), expected = new Set([definition.start,definition.boss,...definition.middle]);
    if (ids[0] !== definition.start || ids.at(-1) !== definition.boss) return false;
    return new Set(ids.filter(id => expected.has(id))).size === definition.total;
}

function isValidCosmosExpeditionLedger(route) {
    if (!Array.isArray(route.history) || !Array.isArray(route.queue) || route.history.length > route.plan.flat().length) return false;
    if (!Number.isFinite(route.dust) || route.dust < 0) return false;
    const ledger = route.plan.flatMap((leg,stage) => leg.map(id => ({id,stage})));
    if (!route.history.every((row,i) => row?.id === ledger[i].id && row.stage === ledger[i].stage && Number.isFinite(row.dust) && row.dust >= 0)) return false;
    return route.history.reduce((sum,row) => sum + row.dust,0) === route.dust;
}

function isValidLegacyCosmosHabitats(habitats) {
    return Array.isArray(habitats) && habitats.length === 4 && habitats[3] === 'guard'
        && habitats.every(id => Object.hasOwn(COSMOS_ROUTE_G1.habitats,id));
}

function isValidCosmosExpeditionPhase(route) {
    if (route.phase === 'complete') return route.stage === 4 && route.history.length === route.plan.flat().length && route.queue.length === 0;
    if (![0,1,2,3].includes(route.stage)) return false;
    if (route.phase !== 'fighting') return route.queue.length === 0;
    const ledger = route.plan.flatMap((leg,stage) => leg.map(id => ({id,stage})));
    return ledger[route.history.length]?.stage === route.stage && isValidCosmosRoutePlanProgress(route);
}

function isValidCosmosRoutePlan(route) {
    if (!Number.isInteger(route.seed) || !Array.isArray(route.plan) || route.plan.length !== 5) return false;
    if (![1, 3].every(stage => COSMOS_ROUTE_G1.choices[stage].includes(route.decisions[stage]))) return false;
    if (!route.plan.every((leg, stage) => Array.isArray(leg) && leg.length === (stage % 4 === 0 ? 1 : route.legSize))) return false;
    if (route.plan[0][0] !== COSMOS_ROUTE_G1.start || route.plan[4][0] !== COSMOS_ROUTE_G1.boss) return false;
    const middle = route.plan.slice(1, 4).flat();
    const pool = new Set([...COSMOS_ROUTE_G1.planets, ...COSMOS_ROUTE_G1.asteroids]);
    if (new Set(middle).size !== middle.length || !middle.every(id => pool.has(id))) return false;
    return isValidCosmosRoutePlanProgress(route);
}

function isValidCosmosRoutePlanProgress(route) {
    if (!Array.isArray(route.history)) return false;
    if (!route.history.every(row => route.plan[row.stage]?.includes(row.id))) return false;
    if (route.phase !== 'fighting') return true;
    const remaining = route.plan[route.stage].filter(id => !route.history.some(row => row.id === id));
    return JSON.stringify(route.queue) === JSON.stringify(remaining);
}

function isValidCosmosRouteLedger(route) {
    const ids = new Set([COSMOS_ROUTE_G1.start, COSMOS_ROUTE_G1.boss,
        ...COSMOS_ROUTE_G1.planets, ...COSMOS_ROUTE_G1.asteroids]);
    if (!Array.isArray(route.queue) || !Array.isArray(route.history) || route.history.length > 17) return false;
    if (!isValidCosmosRoutePhase(route)) return false;
    if (!route.queue.every(id => ids.has(id)) || route.queue.length > 5) return false;
    if (!route.history.every(row => row && ids.has(row.id) && Number.isFinite(row.dust) && row.dust >= 0)) return false;
    const combined = [...route.queue, ...route.history.map(row => row.id)];
    if (new Set(combined).size !== combined.length) return false;
    return true;
}

function isValidCosmosRoutePhase(route) {
    if (!route.decisions || typeof route.decisions !== 'object') return false;
    if (!['survey', 'salvage', 'rift'].includes(route.signal)) return false;
    if (route.phase === 'complete') return route.stage === 5;
    if (route.phase === 'choice') return [1, 3].includes(route.stage) && route.queue.length === 0;
    if (route.phase === 'fighting') return route.stage < 5 && route.queue.length > 0;
    return route.queue.length === 0;
}

function cloneDefaultGame() {
    return mergeDefaults({});
}

safeExposeGlobals({ mergeDefaults, cloneDefaultGame });
