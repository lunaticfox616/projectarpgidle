// ============================================================================
// 재능 개화 카드 시스템 (P3)
// 재능(10) × 직업(12) = 120종. 개화 시련 클리어로 카드를 획득/강화한다.
// 카드 점수는 계정 진행도(여러 무한 콘텐츠의 최고 도달 + 나무꾼 잔상 전투력)로 매겨지고,
// 점수가 카드 레벨을 결정한다. 표면(직업 테마)·이면(재능 테마) 효과는 레벨에 비례한다.
// 카드/조합 기록은 루프(시즌 리셋)로 초기화되지 않는다.
// (효과의 실제 스탯 반영 및 장착 슬롯은 P4에서 연결)
// ============================================================================

// 카드 레벨 임계값(점수 기준). 점수는 "층 환산" 단위(무한 콘텐츠 최고층 합 + DPS 로그 환산).
const TALENT_CARD_LEVEL_THRESHOLDS = [0, 20, 45, 80, 125, 180, 250, 340, 450, 600];
const TALENT_CARD_MAX_LEVEL = TALENT_CARD_LEVEL_THRESHOLDS.length;
const TALENT_BLOOM_TOTAL_CARDS = 120;

// 나무꾼 잔상 전투력(최고 DPS)의 로그 환산 기준. DPS가 2배 될 때마다 +1점(층과 동일 스케일).
const TALENT_BLOOM_DPS_BASE = 1000;

// 카드 효과는 data/talent-cards.js의 TALENT_BLOOM_CARD_DEFS(120개 조합 = 5차전직 1개당 표면 1 + 이면 1)에서 조회한다.
function getTalentCardDef(heroId, classKey) {
    let key = makeTalentComboKey(heroId, classKey);
    if (typeof TALENT_BLOOM_CARD_DEFS !== 'undefined' && TALENT_BLOOM_CARD_DEFS[key]) return TALENT_BLOOM_CARD_DEFS[key];
    return null;
}

function parseTalentComboKey(comboKey) {
    let parts = String(comboKey || '').split('__');
    return { heroId: parts[0] || 'hero1', classKey: parts[1] || 'none' };
}
function makeTalentComboKey(heroId, classKey) {
    return `${heroId || 'hero1'}__${classKey || 'none'}`;
}

// 계정 진행도 기반 개화 점수. (무한 콘텐츠 최고층 합 + 나무꾼 잔상 전투력 로그 환산)
function getTalentBloomScore() {
    let deepChaos = Math.max(0, Math.floor(Number(game.abyssEndlessDepth) || 0));
    let labyrinth = Math.max(0, Math.floor(Number(game.labyrinthUnlockedMaxFloor) || 0));
    let chaosFloor = (typeof ensureChaosRealmState === 'function')
        ? Math.max(0, Math.floor(Number(ensureChaosRealmState().highestFloor) || 0)) : 0;
    let underFloor = Math.max(0, Math.floor(Number(game.underworldProgress && game.underworldProgress.highestFloor) || 0));
    let cosmos = (game.cosmosAtlas && Array.isArray(game.cosmosAtlas.cleared))
        ? game.cosmosAtlas.cleared.length + ((game.cosmosAtlas.bossClears || []).length) : 0;
    let bestDps = Math.max(0, Number((game.woodsmanEchoRun && game.woodsmanEchoRun.bestDps) || 0));
    let dpsTerm = bestDps > TALENT_BLOOM_DPS_BASE ? Math.floor(Math.log2(bestDps / TALENT_BLOOM_DPS_BASE)) : 0;
    return deepChaos + labyrinth + chaosFloor + underFloor + cosmos + Math.max(0, dpsTerm);
}

function getTalentBloomScoreBreakdown() {
    let deepChaos = Math.max(0, Math.floor(Number(game.abyssEndlessDepth) || 0));
    let labyrinth = Math.max(0, Math.floor(Number(game.labyrinthUnlockedMaxFloor) || 0));
    let chaosFloor = (typeof ensureChaosRealmState === 'function')
        ? Math.max(0, Math.floor(Number(ensureChaosRealmState().highestFloor) || 0)) : 0;
    let underFloor = Math.max(0, Math.floor(Number(game.underworldProgress && game.underworldProgress.highestFloor) || 0));
    let cosmos = (game.cosmosAtlas && Array.isArray(game.cosmosAtlas.cleared))
        ? game.cosmosAtlas.cleared.length + ((game.cosmosAtlas.bossClears || []).length) : 0;
    let bestDps = Math.max(0, Number((game.woodsmanEchoRun && game.woodsmanEchoRun.bestDps) || 0));
    let dpsTerm = bestDps > TALENT_BLOOM_DPS_BASE ? Math.floor(Math.log2(bestDps / TALENT_BLOOM_DPS_BASE)) : 0;
    return { deepChaos, labyrinth, chaosFloor, underFloor, cosmos, dpsTerm: Math.max(0, dpsTerm) };
}

function getTalentCardLevel(score) {
    let s = Math.max(0, Math.floor(Number(score) || 0));
    let level = 1;
    for (let i = 0; i < TALENT_CARD_LEVEL_THRESHOLDS.length; i++) {
        if (s >= TALENT_CARD_LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return Math.min(TALENT_CARD_MAX_LEVEL, level);
}

// 개화 시련 클리어 시 호출: 조합 카드의 점수를 최고값으로 갱신하고 레벨을 다시 계산한다.
function recordTalentBloomCard(comboKey) {
    if (!game.talentCards || typeof game.talentCards !== 'object') game.talentCards = {};
    let score = getTalentBloomScore();
    let card = game.talentCards[comboKey] || { score: 0, level: 1, count: 0 };
    card.count = Math.max(0, Math.floor(card.count || 0)) + 1;
    if (score > (card.score || 0)) card.score = score;
    let prevLevel = Math.max(1, Math.floor(card.level || 1));
    card.level = getTalentCardLevel(card.score);
    game.talentCards[comboKey] = card;
    return { card, leveledUp: card.level > prevLevel, score };
}

// 카드의 표면(1)·이면(1) 효과를 레벨에 맞춰 스탯 목록으로 반환. (조합당 고유 정의에서 조회)
function getTalentCardStatBonuses(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    if (!def) return [];
    let out = [];
    if (def.surface && def.surface.stat) out.push({ stat: def.surface.stat, val: def.surface.perLevel * lv, kind: 'surface' });
    if (def.hidden && def.hidden.stat) out.push({ stat: def.hidden.stat, val: def.hidden.perLevel * lv, kind: 'hidden' });
    return out;
}

function getTalentStatLabel(stat) {
    if (typeof P_STATS !== 'undefined' && P_STATS[stat] && P_STATS[stat].name) return P_STATS[stat].name;
    if (typeof getStatName === 'function') return getStatName(stat);
    return stat;
}

function getTalentCardEffectLines(heroId, classKey, level) {
    return getTalentCardStatBonuses(heroId, classKey, level).map(b => {
        let label = getTalentStatLabel(b.stat);
        let tag = b.kind === 'surface' ? '표면' : '이면';
        return `<span style="color:${b.kind === 'surface' ? '#ffd36b' : '#9fe0ff'};">[${tag}] ${label} +${b.val}%</span>`;
    });
}

function getTalentCardName(heroId, classKey) {
    let heroLabel = (typeof getHeroSelectionDef === 'function') ? getHeroSelectionDef(heroId).label : heroId;
    let classLabel = (typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[classKey]) ? CLASS_TEMPLATES[classKey].name : '무직';
    // 카드 이름 = 실제 인게임 재능 이름 + 실제 인게임 전직 이름 (예: '궁수 소울바인더')
    let bloomName = `${heroLabel} ${classLabel}`;
    return { heroLabel, classLabel, bloomName };
}

function getOwnedTalentCardCount() {
    return (game.talentCards && typeof game.talentCards === 'object') ? Object.keys(game.talentCards).length : 0;
}

// ---- 장착 슬롯 (P4) ----
// 슬롯은 보유 카드 수가 다음 임계값에 도달할 때마다 1칸씩 열린다.
const TALENT_CARD_SLOT_UNLOCKS = [1, 4, 12, 25, 50, 100];
const TALENT_CARD_SLOT_COUNT = TALENT_CARD_SLOT_UNLOCKS.length;

function ensureTalentCardLoadout() {
    if (!Array.isArray(game.talentCardLoadout)) game.talentCardLoadout = [];
    while (game.talentCardLoadout.length < TALENT_CARD_SLOT_COUNT) game.talentCardLoadout.push(null);
    if (game.talentCardLoadout.length > TALENT_CARD_SLOT_COUNT) game.talentCardLoadout.length = TALENT_CARD_SLOT_COUNT;
    // 보유하지 않은 카드가 슬롯에 남아있으면 비운다.
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    for (let i = 0; i < game.talentCardLoadout.length; i++) {
        if (game.talentCardLoadout[i] && !owned[game.talentCardLoadout[i]]) game.talentCardLoadout[i] = null;
    }
    return game.talentCardLoadout;
}

function getUnlockedTalentSlotCount() {
    let owned = getOwnedTalentCardCount();
    let count = 0;
    for (let i = 0; i < TALENT_CARD_SLOT_UNLOCKS.length; i++) if (owned >= TALENT_CARD_SLOT_UNLOCKS[i]) count++;
    return count;
}

function getTalentCardSlotIndex(comboKey) {
    let loadout = ensureTalentCardLoadout();
    return loadout.indexOf(comboKey);
}

function equipTalentCard(comboKey) {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    if (!owned[comboKey]) return;
    let loadout = ensureTalentCardLoadout();
    let unlocked = getUnlockedTalentSlotCount();
    if (unlocked <= 0) { if (typeof addLog === 'function') addLog('🔒 아직 장착 슬롯이 열리지 않았습니다.', 'attack-monster'); return; }
    // 이미 장착돼 있으면 해제(토글)
    let existing = loadout.indexOf(comboKey);
    if (existing >= 0) { loadout[existing] = null; afterTalentLoadoutChange(); return; }
    // 빈 슬롯 우선, 없으면 마지막 열린 슬롯 교체
    let target = -1;
    for (let i = 0; i < unlocked; i++) { if (!loadout[i]) { target = i; break; } }
    if (target < 0) target = unlocked - 1;
    loadout[target] = comboKey;
    afterTalentLoadoutChange();
}

function unequipTalentSlot(slotIndex) {
    let loadout = ensureTalentCardLoadout();
    if (slotIndex < 0 || slotIndex >= loadout.length) return;
    loadout[slotIndex] = null;
    afterTalentLoadoutChange();
}

function afterTalentLoadoutChange() {
    if (typeof renderTalentTab === 'function') renderTalentTab();
    if (typeof updateStaticUI === 'function') updateStaticUI();
    if (typeof queueImportantSave === 'function') queueImportantSave(200);
}

// 장착된(열린 슬롯에 한함) 카드들의 표면+이면 효과를 {id, val} 목록으로 합산. (getPlayerStats에서 reward 버킷에 주입)
function getActiveTalentCardStatBonuses() {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let loadout = Array.isArray(game.talentCardLoadout) ? game.talentCardLoadout : [];
    let unlocked = getUnlockedTalentSlotCount();
    let out = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        let key = loadout[i];
        if (!key || !owned[key]) continue;
        let { heroId, classKey } = parseTalentComboKey(key);
        let level = Math.max(1, Math.floor(owned[key].level || 1));
        getTalentCardStatBonuses(heroId, classKey, level).forEach(b => out.push({ id: b.stat, val: b.val }));
    }
    return out;
}

function renderTalentTab() {
    let summaryEl = document.getElementById('ui-talent-summary');
    let gridEl = document.getElementById('ui-talent-card-grid');
    if (!summaryEl || !gridEl) return;
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let ownedKeys = Object.keys(owned);
    let bd = getTalentBloomScoreBreakdown();
    let curScore = getTalentBloomScore();
    summaryEl.innerHTML = `보유 카드 <strong>${ownedKeys.length}</strong> / ${TALENT_BLOOM_TOTAL_CARDS} · 총 개화 ${Math.max(0, Math.floor(game.talentBloomClears || 0))}회`
        + `<br><span style="font-size:0.85em; color:#9fb4d1;">현재 개화 점수 <strong>${curScore}</strong> = 혼돈심화 ${bd.deepChaos} + 미궁 ${bd.labyrinth} + 혼돈계 ${bd.chaosFloor} + 지하계 ${bd.underFloor} + 우주계 ${bd.cosmos} + 전투력 ${bd.dpsTerm}</span>`;

    // 장착 슬롯 영역
    ensureTalentCardLoadout();
    let loadout = game.talentCardLoadout;
    let unlockedSlots = getUnlockedTalentSlotCount();
    let slotHtml = '';
    for (let i = 0; i < TALENT_CARD_SLOT_COUNT; i++) {
        let unlocked = i < unlockedSlots;
        let key = loadout[i];
        if (!unlocked) {
            slotHtml += `<div class="talent-slot locked">🔒<br><span>보유 ${TALENT_CARD_SLOT_UNLOCKS[i]}장</span></div>`;
        } else if (key && owned[key]) {
            let { heroId, classKey } = parseTalentComboKey(key);
            let { heroLabel, classLabel } = getTalentCardName(heroId, classKey);
            slotHtml += `<div class="talent-slot filled" onclick="unequipTalentSlot(${i})" title="클릭하여 해제"><strong>${heroLabel}</strong><br><span>${classLabel} · Lv.${Math.max(1, Math.floor(owned[key].level || 1))}</span></div>`;
        } else {
            slotHtml += `<div class="talent-slot empty">빈 슬롯<br><span>카드를 눌러 장착</span></div>`;
        }
    }
    let nextSlot = unlockedSlots < TALENT_CARD_SLOT_COUNT ? `<span style="color:#9fb4d1;"> · 다음 슬롯: 보유 ${TALENT_CARD_SLOT_UNLOCKS[unlockedSlots]}장</span>` : '';
    let loadoutHtml = `<div style="grid-column:1/-1;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
            <strong>장착 슬롯</strong><span style="font-size:0.82em;">열린 슬롯 ${unlockedSlots}/${TALENT_CARD_SLOT_COUNT}${nextSlot}</span>
        </div>
        <div class="talent-slot-row">${slotHtml}</div>
    </div>`;

    if (ownedKeys.length === 0) {
        gridEl.innerHTML = loadoutHtml + `<div style="grid-column:1/-1; color:#9fb4d1; padding:18px; text-align:center;">아직 개화한 카드가 없습니다. 지도 탭의 🌸 <strong>혹독한 겨울의 미궁</strong>(재능 개화 시련)을 클리어하면 현재 재능 × 직업 조합의 카드를 얻습니다.</div>`;
        return;
    }
    // 레벨 내림차순 정렬
    ownedKeys.sort((a, b) => (owned[b].level - owned[a].level) || (owned[b].score - owned[a].score));
    let cardsHtml = ownedKeys.map(key => {
        let card = owned[key];
        let { heroId, classKey } = parseTalentComboKey(key);
        let { heroLabel, classLabel, bloomName } = getTalentCardName(heroId, classKey);
        let level = Math.max(1, Math.floor(card.level || 1));
        let lines = getTalentCardEffectLines(heroId, classKey, level);
        let nextThreshold = level < TALENT_CARD_MAX_LEVEL ? TALENT_CARD_LEVEL_THRESHOLDS[level] : null;
        let nextText = nextThreshold !== null ? `다음 레벨 점수 ${nextThreshold}` : '최대 레벨';
        let equipped = getTalentCardSlotIndex(key) >= 0;
        return `<div class="talent-card${equipped ? ' equipped' : ''}" onclick="equipTalentCard('${key}')" title="클릭하여 ${equipped ? '해제' : '장착'}">
            <div class="talent-card-head">
                <span class="talent-card-title">${bloomName}</span>
                <span class="talent-card-level">Lv.${level}/${TALENT_CARD_MAX_LEVEL}</span>
            </div>
            <div class="talent-card-sub">재능 ${heroLabel} · 전직 ${classLabel}</div>
            <div class="talent-card-effects">${lines.join('<br>')}</div>
            <div class="talent-card-foot">${equipped ? '✅ 장착됨 · ' : ''}점수 ${Math.max(0, Math.floor(card.score || 0))} · 개화 ${Math.max(0, Math.floor(card.count || 0))}회 · ${nextText}</div>
        </div>`;
    }).join('');
    gridEl.innerHTML = loadoutHtml + cardsHtml;
}
