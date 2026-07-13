let growthUiSelection = { itemId: null, source: null, dragItemId: null, compareItemId: null, heldItemId: null, heldRotation: 0 };
let growthUiFilters = { search: '', category: 'all', sort: 'newest' };

const GROWTH_STAT_LABELS = {
    flatDmg:'기본 피해', flatHp:'최대 생명력', pctHp:'생명력 증가', armor:'방어도', armorPct:'방어도 증가',
    evasion:'회피도', evasionPct:'회피도 증가', energyShield:'영혼 보호막', energyShieldPct:'영혼 보호막 증가',
    resAll:'모든 저항', resPen:'저항 관통', regen:'초당 생명력 재생', leech:'피해 흡혈', dr:'받는 피해 감소',
    pctDmg:'모든 피해 증가', physPctDmg:'물리 피해 증가', elementalPctDmg:'원소 피해 증가', firePctDmg:'화염 피해 증가',
    coldPctDmg:'냉기 피해 증가', lightPctDmg:'번개 피해 증가', chaosPctDmg:'혼돈 피해 증가', projectilePctDmg:'투사체 피해 증가',
    dotPctDmg:'지속 피해 증가', aspd:'공격 속도', move:'이동 속도', crit:'치명타 확률', critDmg:'치명타 피해',
    bleedChance:'출혈 확률', shockChance:'감전 확률', ailmentPower:'상태 이상 효과', ds:'재행동 확률',
    blockChance:'수호 확률', deflectChance:'비껴내기 확률', targetAny:'연결 대상 수', targetProjectile:'추가 투사체 대상',
    summonCap:'소환 한도'
};

const GROWTH_TAG_LABELS = {
    flower:'발현', branch:'수호', leaf:'공명', physical:'물리', melee:'근접', line:'직선', large:'대형', fire:'화염',
    aoe:'범위', branching:'분기', cold:'냉기', bent:'곡선', lightning:'번개', chain:'연쇄', asymmetric:'비대칭', armor:'장벽',
    closed:'폐쇄', evasion:'회피', shield:'보호', guard:'수호', life:'생명', recovery:'회복', speed:'속도', link:'연결', pierce:'관통',
    bleed:'출혈', chaos:'혼돈', dot:'지속', projectile:'투사체', counter:'반격', symmetric:'대칭', small:'소형', repeat:'반복',
    ailment:'상태 이상', conversion:'변환', split:'분리', core:'핵심', trigger:'발동', summon:'소환', resonance:'공명'
};

function getGrowthCategoryLabel(category) {
    return { flower:'발현체 · 공세', branch:'수호체 · 생존', leaf:'공명체 · 연결' }[category] || '미분류 생장체';
}

function getGrowthRarityLabel(rarity) {
    return { normal:'일반', magic:'마법', rare:'희귀', unique:'고유' }[rarity] || rarity;
}

function escapeGrowthText(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getGrowthDisplayName(item) {
    let base = getGrowthBase(item);
    if (item && item.legacyBaseId && base) return `${base.name} · 계승체`;
    return item && item.name ? item.name : (base ? base.name : '이름 없는 생장체');
}

function getGrowthStatLabel(stat) {
    let id = typeof stat === 'string' ? stat : (stat && stat.id);
    if (GROWTH_STAT_LABELS[id]) return GROWTH_STAT_LABELS[id];
    let translated = typeof getStatName === 'function' ? getStatName(id) : id;
    if (translated && translated !== id) return sanitizeGrowthTerminology(translated.replace(/\(%\)/g, '').trim());
    let supplied = stat && stat.statName;
    return supplied && /[^\x00-\x7F]/.test(supplied) ? sanitizeGrowthTerminology(supplied) : '특수 능력';
}

function sanitizeGrowthTerminology(value) {
    return String(value || '')
        .replace(/무기/g, '발현체').replace(/방패/g, '수호체')
        .replace(/갑옷|투구|장갑|신발|허리띠/g, '수호체')
        .replace(/목걸이|반지|사역봉/g, '공명체');
}

function getGrowthTagLabel(tag) { return GROWTH_TAG_LABELS[tag] || '특수'; }

function getGrowthTriggerLabel(id) {
    return {
        growthSolarHeart:'태양 심장 폭발', growthWorldroot:'세계뿌리 보호', growthHollowNest:'빈 둥지 소환',
        growthSeveredBridge:'끊어진 다리 관통', growthTrinity:'삼원 공명', growthHorizon:'지평선 연쇄'
    }[id] || '고유 공간 발동';
}

function getGrowthSpatialDescription(item) {
    if (item && item.uniqueEffect) return sanitizeGrowthTerminology(item.uniqueEffect);
    let effect = item && item.spatialEffect;
    if (!effect) return '공간 반응 없음';
    let stat = getGrowthStatLabel(effect.stat);
    let value = Number.isFinite(Number(effect.value)) ? ` ${stat} +${formatValue(effect.stat, effect.value)}` : '';
    let category = getGrowthCategoryLabel(effect.category).split(' · ')[0];
    let direction = { up:'위쪽', right:'오른쪽', down:'아래쪽', left:'왼쪽' }[effect.direction] || '지정 방향';
    let categoryPair = (effect.categories || []).map(value => getGrowthCategoryLabel(value).split(' · ')[0]).join('와 ');
    let labels = {
        wall:`외곽에 닿으면${value}`, wallFaces:`닿은 외곽 면마다${value}`, adjacentCategory:`인접한 ${category}마다${value}`,
        directionEmpty:`${direction}이 비어 있으면${value}`, corner:`모서리에 놓이면${value}`, surrounded:`주변이 채워지면${value}`,
        betweenCategories:`${categoryPair || '지정된 생장체'} 사이를 이어 주면${value}`, rowEdge:`행의 끝에 놓이면${value}`, sameRowCategory:`같은 행의 동종 생장체마다${value}`,
        sameColumnCategory:`같은 열의 동종 생장체마다${value}`, distanceFromWall:`외곽에서 ${effect.min || 1}칸 이상 떨어지면${value}`,
        tagExact:`${getGrowthTagLabel(effect.tag)} 성질이 ${effect.count || 1}개 모이면${value}`, adjacentDifferentTags:`서로 다른 성질 ${effect.count || 1}개와 닿으면${value}`,
        connectedTag:`같은 성질을 연결하면${value}`, gapOccupied:`형태 내부의 빈자리가 채워지면${value}`, gapEmpty:`형태 사이가 비어 있으면${value}`,
        isolated:`다른 생장체와 닿지 않으면${value}`, adjacentCount:`인접한 생장체마다${value}`, distinctElements:`세 원소가 공명하면${value}`,
        fullRow:`한 행을 완전히 채우면${value}`
    };
    return labels[effect.type] || `배치 조건 충족 시${value || ' 특수 효과 발동'}`;
}

function getGrowthVisualClasses(item) {
    let tags = new Set((item && item.tags) || []);
    let accent = ['fire','cold','lightning','chaos','physical','shield','link'].find(tag => tags.has(tag)) || 'natural';
    return `category-${item.category} rarity-${item.rarity} accent-${accent}`;
}

function renderGrowthMiniShape(item, rotation) {
    let cells = getGrowthItemShape(item, rotation === undefined ? item.rotation || 0 : rotation);
    if (cells.length === 0) return '';
    let maxX = Math.max(...cells.map(cell => cell.x));
    let maxY = Math.max(...cells.map(cell => cell.y));
    let occupied = new Set(cells.map(cell => growthCellKey(cell.x, cell.y)));
    let html = '';
    for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) html += `<i class="${occupied.has(growthCellKey(x,y)) ? 'on' : ''}"></i>`;
    }
    return `<span class="growth-mini-shape ${getGrowthVisualClasses(item)}" style="--shape-w:${maxX + 1};--shape-h:${maxY + 1}">${html}</span>`;
}

function getGrowthSelectedItem() {
    return growthUiSelection.itemId === null ? null : findGrowthItemById(growthUiSelection.itemId);
}

function selectGrowthUiItem(itemId, source) {
    growthUiSelection.itemId = itemId;
    growthUiSelection.source = source || (getGrowthPlacement(itemId) ? 'board' : 'storage');
    updateStaticUI();
}

function getGrowthHeldItem() {
    return growthUiSelection.heldItemId === null ? null : findGrowthItemById(growthUiSelection.heldItemId);
}

function getGrowthItemTooltipLines(item) {
    if (!item) return [];
    let base = getGrowthBase(item);
    let condition = (ensureGrowthBoardEffectsCache().conditionsByItem || {})[String(item.id)];
    let baseStats = (item.baseStats || []).map(stat => `${getGrowthStatLabel(stat)} +${formatValue(stat.id, stat.val)}`);
    let affixes = (item.stats || []).map(stat => `${getGrowthStatLabel(stat)} +${formatValue(stat.id, stat.val)}${Number.isFinite(stat.tier) ? ` · ${stat.tier}단계` : ''}`);
    return [
        `${getGrowthRarityLabel(item.rarity)} · ${getGrowthCategoryLabel(item.category)} · ${getGrowthItemShape(item).length}칸`,
        `요구 단계 ${base ? base.requiredTier : item.itemTier || 1} · 방향 ${(item.rotation || 0) * 90}°`,
        `고유 능력: ${baseStats.join(', ') || '없음'}`,
        `추가 옵션: ${affixes.join(', ') || '없음'}`,
        `성질: ${(item.tags || []).map(getGrowthTagLabel).join(', ') || '없음'}`,
        `공간 반응: ${getGrowthSpatialDescription(item)}`,
        `조건: ${condition ? (condition.active ? `충족 (${condition.count})` : '미충족') : '미배치'}`,
        `품질 ${item.quality || 0}%${item.corrupted ? ' · 타락' : ''}${item.fused || item.fusedRelic ? ' · 융합' : ''}${item.sealed || item.loopSealed ? ' · 봉인' : ''}`
    ];
}

function renderGrowthItemDetail(item) {
    if (!item) return '<div class="growth-empty-detail">생장체를 누르면 직접 들어 옮길 수 있고, 능력과 공간 반응을 확인할 수 있습니다.</div>';
    let lines = getGrowthItemTooltipLines(item).map(line => `<div>${escapeGrowthText(line)}</div>`).join('');
    let placed = !!getGrowthPlacement(item.id);
    let actions = placed
        ? `<button onclick="rotateGrowthUiItem('${item.id}')" ${item.rotationAllowed === false ? 'disabled' : ''}>90° 회전</button><button onclick="removeGrowthUiItem('${item.id}')">보관함으로</button>`
        : `<button onclick="autoPlaceGrowthUiItem('${item.id}')">자동 배치</button>`;
    return `<div class="growth-detail-head">${renderGrowthMiniShape(item)}<div><strong class="growth-rarity-${item.rarity}">${escapeGrowthText(getGrowthDisplayName(item))}</strong><div>${escapeGrowthText(getGrowthCategoryLabel(item.category))}</div></div></div><div class="growth-detail-lines">${lines}</div>${renderGrowthComparison(item)}<div class="growth-detail-actions">${actions}<button onclick="beginGrowthMove('${item.id}','${placed ? 'board' : 'storage'}')">직접 옮기기</button><button onclick="selectGrowthForCrafting('${item.id}',${placed})">제작 선택</button></div>`;
}

function getGrowthCombinedStats(item) {
    let totals = {};
    (item ? (item.baseStats || []).concat(item.stats || []) : []).forEach(stat => {
        if (stat && stat.id) totals[stat.id] = (totals[stat.id] || 0) + Number(stat.val || 0);
    });
    return totals;
}

function renderGrowthComparison(item) {
    let other = growthUiSelection.compareItemId ? findGrowthItemById(growthUiSelection.compareItemId) : null;
    if (!other || String(other.id) === String(item.id)) return '';
    let current = getGrowthCombinedStats(item);
    let reference = getGrowthCombinedStats(other);
    let ids = Array.from(new Set(Object.keys(current).concat(Object.keys(reference))));
    let rows = ids.slice(0, 8).map(id => {
        let delta = (current[id] || 0) - (reference[id] || 0);
        return `<span class="${delta >= 0 ? 'positive' : 'negative'}">${escapeGrowthText(getGrowthStatLabel(id))} ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}</span>`;
    }).join('');
    return `<div class="growth-compare"><strong>${escapeGrowthText(getGrowthDisplayName(other))} 대비</strong>${rows || '<span>직접 수치 차이 없음</span>'}<button onclick="clearGrowthComparison()">비교 해제</button></div>`;
}

function renderGrowthBoardCells(cache) {
    let board = ensureGrowthBoardState(game);
    let unlocked = new Set(board.unlockedCells);
    let held = getGrowthHeldItem();
    let cells = [];
    for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
            let index = y * board.width + x;
            let cls = unlocked.has(index) ? 'unlocked' : 'sealed';
            if (held && unlocked.has(index)) {
                let placement = { x, y, rotation: growthUiSelection.heldRotation };
                cls += canPlaceGrowthItem(board, held, placement, held.id) ? ' drop-valid' : ' drop-invalid';
            }
            cells.push(`<div class="growth-cell ${cls}" data-x="${x}" data-y="${y}" ondragover="event.preventDefault()" ondrop="dropGrowthOnCell(event,${x},${y})" onclick="placeHeldGrowthAt(${x},${y})">${!unlocked.has(index) ? '<span aria-label="봉인된 자리"></span>' : ''}</div>`);
        }
    }
    return cells.join('') + renderGrowthBoardItems(cache);
}

function renderGrowthBoardItems(cache) {
    let linked = new Set((cache.connections || []).flat().map(String));
    return getActiveGrowthItems().map(entry => {
        let shape = getGrowthItemShape(entry.item, entry.placement.rotation);
        let width = Math.max(...shape.map(cell => cell.x)) + 1;
        let height = Math.max(...shape.map(cell => cell.y)) + 1;
        let selected = String(growthUiSelection.itemId) === String(entry.item.id) ? ' selected' : '';
        let held = String(growthUiSelection.heldItemId) === String(entry.item.id) ? ' held-origin' : '';
        let connected = linked.has(String(entry.item.id)) ? ' linked' : '';
        let tiles = shape.map(cell => `<span class="growth-item-tile" style="grid-column:${cell.x + 1};grid-row:${cell.y + 1}" draggable="true" ondragstart="startGrowthDrag(event,'${entry.item.id}')" onclick="event.stopPropagation();beginGrowthMove('${entry.item.id}','board')"></span>`).join('');
        return `<div class="growth-board-item ${getGrowthVisualClasses(entry.item)}${selected}${held}${connected}" style="grid-column:${entry.placement.x + 1}/span ${width};grid-row:${entry.placement.y + 1}/span ${height};--item-w:${width};--item-h:${height}" title="${escapeGrowthText(`${getGrowthDisplayName(entry.item)}\n${getGrowthItemTooltipLines(entry.item).join('\n')}`)}">${tiles}</div>`;
    }).join('');
}

function renderGrowthHeldCursor() {
    let item = getGrowthHeldItem();
    if (!item) return '';
    return `<div id="growth-held-cursor" class="growth-held-cursor">${renderGrowthMiniShape(item, growthUiSelection.heldRotation)}<span>클릭하여 배치 · 우클릭 회전 · Esc 취소</span></div>`;
}

function renderGrowthSynergies(cache) {
    let active = cache.synergies || [];
    let triggers = cache.triggers || [];
    if (active.length === 0 && triggers.length === 0) return '<span class="growth-muted">활성 시너지 없음</span>';
    return active.map(rule => `<span class="growth-synergy-chip">${escapeGrowthText(rule.label)}</span>`)
        .concat(triggers.map(trigger => `<span class="growth-synergy-chip trigger">발동 · ${escapeGrowthText(getGrowthTriggerLabel(trigger.id))}</span>`)).join('');
}

function renderGrowthStorageCard(item, source) {
    let selected = String(growthUiSelection.itemId) === String(item.id);
    let placed = !!getGrowthPlacement(item.id);
    let buttons = source === 'recent'
        ? `<button onclick="event.stopPropagation();claimRecentGrowth('${item.id}')">보관</button>`
        : `${placed ? '<span class="growth-equipped-badge">배치됨</span>' : `<button onclick="event.stopPropagation();autoPlaceGrowthUiItem('${item.id}')">배치</button>`}<button onclick="event.stopPropagation();setGrowthComparison('${item.id}')">비교</button><button onclick="event.stopPropagation();toggleGrowthUiLock('${item.id}')">${item.locked ? '잠금해제' : '잠금'}</button>${placed || item.locked ? '' : `<button class="danger" onclick="event.stopPropagation();salvageGrowthUiItem('${item.id}')">해체</button>`}`;
    let click = source === 'recent' ? `selectGrowthUiItem('${item.id}','recent')` : `beginGrowthMove('${item.id}','storage')`;
    return `<article class="growth-storage-card ${selected ? 'selected' : ''}" onclick="${click}" title="${escapeGrowthText(getGrowthItemTooltipLines(item).join('\n'))}">${renderGrowthMiniShape(item)}<div class="growth-card-copy"><strong class="growth-rarity-${item.rarity}">${item.locked ? '🔒 ' : ''}${escapeGrowthText(getGrowthDisplayName(item))}</strong><small>${escapeGrowthText(getGrowthCategoryLabel(item.category))} · ${getGrowthItemShape(item).length}칸 · ${escapeGrowthText((item.tags || []).slice(0,3).map(getGrowthTagLabel).join(' / '))}</small></div><div class="growth-card-actions">${buttons}</div></article>`;
}

function getFilteredGrowthStorageItems() {
    let query = growthUiFilters.search.trim().toLowerCase();
    let rows = getStoredGrowthItems().filter(item => {
        if (growthUiFilters.category !== 'all' && item.category !== growthUiFilters.category) return false;
        if (!query) return true;
        return [getGrowthDisplayName(item), getGrowthCategoryLabel(item.category)].concat((item.tags || []).map(getGrowthTagLabel)).join(' ').toLowerCase().includes(query);
    });
    if (growthUiFilters.sort === 'size') rows.sort((a,b) => getGrowthItemShape(b).length - getGrowthItemShape(a).length);
    if (growthUiFilters.sort === 'rarity') rows.sort((a,b) => ['normal','magic','rare','unique'].indexOf(b.rarity) - ['normal','magic','rare','unique'].indexOf(a.rarity));
    if (growthUiFilters.sort === 'name') rows.sort((a,b) => getGrowthDisplayName(a).localeCompare(getGrowthDisplayName(b), 'ko'));
    return rows;
}

function renderGrowthStorageControls() {
    return `<div class="growth-storage-controls"><input type="search" value="${escapeGrowthText(growthUiFilters.search)}" placeholder="이름·태그 검색" oninput="setGrowthUiSearch(this.value)"><select onchange="setGrowthUiCategory(this.value)"><option value="all" ${growthUiFilters.category === 'all' ? 'selected' : ''}>전체 종류</option><option value="flower" ${growthUiFilters.category === 'flower' ? 'selected' : ''}>꽃</option><option value="branch" ${growthUiFilters.category === 'branch' ? 'selected' : ''}>가지</option><option value="leaf" ${growthUiFilters.category === 'leaf' ? 'selected' : ''}>잎</option></select><select onchange="setGrowthUiSort(this.value)"><option value="newest" ${growthUiFilters.sort === 'newest' ? 'selected' : ''}>획득순</option><option value="size" ${growthUiFilters.sort === 'size' ? 'selected' : ''}>크기순</option><option value="rarity" ${growthUiFilters.sort === 'rarity' ? 'selected' : ''}>희귀도순</option><option value="name" ${growthUiFilters.sort === 'name' ? 'selected' : ''}>이름순</option></select></div>`;
}

function renderGrowthLoadouts() {
    let board = ensureGrowthBoardState(game);
    return board.loadouts.map((loadout, index) => `<div class="growth-loadout ${board.activeLoadout === index ? 'active' : ''}"><span>${escapeGrowthText(loadout.name)}</span><button onclick="saveGrowthUiLoadout(${index})">저장</button><button onclick="applyGrowthUiLoadout(${index})">전환</button></div>`).join('');
}

function renderGrowthBoardUI() {
    let root = document.getElementById('ui-growth-board-root');
    if (!root) return;
    syncGrowthBoardUnlocks(game);
    let cache = ensureGrowthBoardEffectsCache();
    let board = ensureGrowthBoardState(game);
    let selected = getGrowthSelectedItem();
    let storedItems = getStoredGrowthItems();
    let filteredItems = getFilteredGrowthStorageItems();
    root.innerHTML = `<section class="growth-board-shell"><header><div><h2>🌿 생장판</h2><p>생장체를 눌러 들어 올린 뒤 원하는 자리를 누르세요. 모양과 배치 관계가 전투 능력을 결정합니다.</p></div><div class="growth-progress"><strong>${board.unlockedCells.length}/60칸</strong><span>공명 단계 ${getGrowthProgressTier()}</span></div></header><div class="growth-board-stage"><div class="growth-board-legend"><span class="legend-flower"><i></i>발현체</span><span class="legend-branch"><i></i>수호체</span><span class="legend-leaf"><i></i>공명체</span></div><div class="growth-board-frame"><div class="growth-board-grid ${getGrowthHeldItem() ? 'is-carrying' : ''}" style="--growth-cols:${board.width};--growth-rows:${board.height}">${renderGrowthBoardCells(cache)}</div></div></div><div class="growth-synergy-bar">${renderGrowthSynergies(cache)}</div><div class="growth-loadouts">${renderGrowthLoadouts()}</div></section><section class="growth-detail-panel">${renderGrowthItemDetail(selected)}</section><section class="growth-storage-section"><h2>🎒 생장 보관고 <small>${storedItems.length}/${getGrowthStorageLimit()}</small></h2>${renderGrowthStorageControls()}<div class="growth-storage-list">${filteredItems.map(item => renderGrowthStorageCard(item,'storage')).join('') || '<div class="growth-muted">조건에 맞는 생장체가 없습니다.</div>'}</div></section><section class="growth-storage-section recent"><h2>✨ 최근 발현 <small>${game.recentGrowthDrops.length}/24</small></h2><div class="growth-storage-list">${game.recentGrowthDrops.map(item => renderGrowthStorageCard(item,'recent')).join('') || '<div class="growth-muted">최근 발현한 생장체가 없습니다.</div>'}</div></section>${renderGrowthHeldCursor()}`;
}

function renderGrowthCraftingCard(item, placed) {
    return `<article class="growth-craft-card" onclick="selectGrowthForCrafting('${item.id}',${placed})">${renderGrowthMiniShape(item)}<div><strong class="growth-rarity-${item.rarity}">${escapeGrowthText(getGrowthDisplayName(item))}</strong><small>${getGrowthItemShape(item).length}칸 · ${escapeGrowthText(getGrowthCategoryLabel(item.category))}</small></div><button>선택</button></article>`;
}

function renderGrowthCraftingLists() {
    let placed = getActiveGrowthItems().map(entry => entry.item);
    ['ui-craft-equip-list','ui-fossil-equip-list','ui-infuser-equip-list'].forEach(id => {
        let host = document.getElementById(id);
        if (host) host.innerHTML = placed.map(item => renderGrowthCraftingCard(item, true)).join('');
    });
    ['ui-craft-inventory-list','ui-fossil-inventory-list','ui-infuser-inventory-list'].forEach(id => {
        let host = document.getElementById(id);
        if (host) host.innerHTML = game.growthInventory.filter(item => !getGrowthPlacement(item.id)).map(item => renderGrowthCraftingCard(item, false)).join('');
    });
}

function startGrowthDrag(event, itemId) { growthUiSelection.dragItemId = itemId; if (event.dataTransfer) event.dataTransfer.setData('text/plain', itemId); }
function dropGrowthOnCell(event, x, y) { event.preventDefault(); let id = event.dataTransfer ? event.dataTransfer.getData('text/plain') : growthUiSelection.dragItemId; if (id) moveGrowthUiItem(id, x, y); }
function moveGrowthUiItem(itemId, x, y) {
    let item = findGrowthItemById(itemId);
    let current = getGrowthPlacement(itemId);
    if (!item) return false;
    let carrying = String(growthUiSelection.heldItemId) === String(itemId);
    let placement = { x, y, rotation: carrying ? growthUiSelection.heldRotation : (current ? current.rotation : item.rotation || 0) };
    if (!placeGrowthItem(itemId, placement)) return false;
    growthUiSelection.itemId = itemId; growthUiSelection.source = 'board'; growthUiSelection.heldItemId = null; updateStaticUI(); return true;
}
function beginGrowthMove(itemId, source) {
    let item = findGrowthItemById(itemId);
    if (!item || source === 'recent') return false;
    let current = getGrowthPlacement(itemId);
    if (String(growthUiSelection.heldItemId) === String(itemId)) return cancelGrowthMove();
    growthUiSelection.itemId = itemId;
    growthUiSelection.source = source || (current ? 'board' : 'storage');
    growthUiSelection.heldItemId = itemId;
    growthUiSelection.heldRotation = current ? current.rotation : item.rotation || 0;
    renderGrowthBoardUI();
    return true;
}
function cancelGrowthMove() { growthUiSelection.heldItemId = null; renderGrowthBoardUI(); return true; }
function placeHeldGrowthAt(x, y) {
    let item = getGrowthHeldItem();
    if (!item) return false;
    if (moveGrowthUiItem(item.id, x, y)) return true;
    let frame = document.querySelector('.growth-board-frame');
    if (frame) { frame.classList.remove('placement-denied'); void frame.offsetWidth; frame.classList.add('placement-denied'); }
    return false;
}
function placeSelectedGrowthAt(x, y) { return placeHeldGrowthAt(x, y); }
function rotateHeldGrowthItem() {
    let item = getGrowthHeldItem();
    if (!item || item.rotationAllowed === false) return false;
    growthUiSelection.heldRotation = (growthUiSelection.heldRotation + 1) % 4;
    renderGrowthBoardUI();
    return true;
}
function moveGrowthHeldCursor(event) {
    let cursor = document.getElementById('growth-held-cursor');
    if (!cursor || !event) return;
    cursor.style.transform = `translate(${event.clientX + 18}px,${event.clientY + 18}px)`;
}
function autoPlaceGrowthUiItem(itemId) { let item=findGrowthItemById(itemId); let placement=item&&findFirstGrowthPlacement(ensureGrowthBoardState(game),item); if(placement&&placeGrowthItem(itemId,placement)){growthUiSelection.itemId=itemId;growthUiSelection.source='board';updateStaticUI();} }
function rotateGrowthUiItem(itemId) { if (rotatePlacedGrowthItem(itemId)) updateStaticUI(); }
function removeGrowthUiItem(itemId) { if (removeGrowthItem(itemId)) { growthUiSelection.source='storage'; updateStaticUI(); } }
function claimRecentGrowth(itemId) { if (moveRecentGrowthDropToStorage(itemId)) { growthUiSelection.source='storage'; updateStaticUI(); } }
function toggleGrowthUiLock(itemId) { if (toggleGrowthItemLock(itemId)) updateStaticUI(); }
function salvageGrowthUiItem(itemId) { if (salvageGrowthItem(itemId)) { growthUiSelection.itemId=null; updateStaticUI(); } }
function setGrowthComparison(itemId) { growthUiSelection.compareItemId=itemId; if (String(growthUiSelection.itemId) === String(itemId)) growthUiSelection.itemId=null; updateStaticUI(); }
function clearGrowthComparison() { growthUiSelection.compareItemId=null; updateStaticUI(); }
function setGrowthUiSearch(value) { growthUiFilters.search=String(value || ''); renderGrowthBoardUI(); }
function setGrowthUiCategory(value) { growthUiFilters.category=value || 'all'; renderGrowthBoardUI(); }
function setGrowthUiSort(value) { growthUiFilters.sort=value || 'newest'; renderGrowthBoardUI(); }
function saveGrowthUiLoadout(index) { let board=ensureGrowthBoardState(game); let name=window.prompt('세팅 이름',board.loadouts[index].name); if(name!==null&&saveGrowthLoadout(index,name)) updateStaticUI(); }
function applyGrowthUiLoadout(index) { if (!applyGrowthLoadout(index)) return addLog('전투 중이거나 배치가 유효하지 않아 세팅을 전환하지 못했습니다.','attack-monster'); updateStaticUI(); }
function selectGrowthForCrafting(itemId, placed) { if (typeof selectForCrafting === 'function') selectForCrafting(itemId, !!placed); }

if (typeof document !== 'undefined' && !document.growthBoardPointerBindings) {
    document.growthBoardPointerBindings = true;
    document.addEventListener('pointermove', moveGrowthHeldCursor);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && getGrowthHeldItem()) cancelGrowthMove(); });
    document.addEventListener('contextmenu', event => { if (!getGrowthHeldItem()) return; event.preventDefault(); rotateHeldGrowthItem(); });
}

safeExposeGlobals({ renderGrowthBoardUI, renderGrowthCraftingLists, selectGrowthUiItem, beginGrowthMove, cancelGrowthMove, placeHeldGrowthAt, rotateHeldGrowthItem, startGrowthDrag, dropGrowthOnCell, placeSelectedGrowthAt, autoPlaceGrowthUiItem, rotateGrowthUiItem, removeGrowthUiItem, claimRecentGrowth, toggleGrowthUiLock, salvageGrowthUiItem, setGrowthComparison, clearGrowthComparison, setGrowthUiSearch, setGrowthUiCategory, setGrowthUiSort, saveGrowthUiLoadout, applyGrowthUiLoadout, selectGrowthForCrafting });
