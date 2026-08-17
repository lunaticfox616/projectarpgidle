const UNIQUE_HUNT_SOURCE_TYPES = Object.freeze({
    act: { label: '액트 사냥터', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-hunting' },
    abyss: { label: '혼돈', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-chaos' },
    chaosRealm: { label: '혼돈계', mapSubtab: 'map-tab-chaos-realm' },
    underworld: { label: '지하계', mapSubtab: 'map-tab-underworld' },
    cosmos: { label: '우주계', mapSubtab: 'map-tab-cosmos' },
    beehive: { label: '벌집 원정', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-beehive' },
    trial: { label: '전직 시련', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-trials' },
    labyrinth: { label: '고대 미궁', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-labyrinth' },
    meteor: { label: '운석 낙하 지점', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-meteor' },
    seasonBoss: { label: '최종 관문', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-root-boss' }
});
const UNIQUE_HUNT_SOURCE_IDS = Object.freeze({
    grand_breach_run: { label: '대균열', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-voidrift' },
    cosmos_astra: { label: '잔향체 아스트라', mapSubtab: 'map-tab-cosmos' }
});
const UNIQUE_HUNT_COSMOS_BOSSES = Object.freeze({
    'planet-45': '에니프론', 'planet-46': '하말리스', 'planet-47': '디프다르',
    'planet-48': '주베누비아', 'planet-49': '주벤샤말'
});

function getUniqueHuntSource(entry) {
    let drop = entry && entry.dropOnly && typeof entry.dropOnly === 'object' ? entry.dropOnly : null;
    if (drop && UNIQUE_HUNT_SOURCE_IDS[drop.id]) return { ...UNIQUE_HUNT_SOURCE_IDS[drop.id] };
    if (drop && drop.type === 'cosmosBoss') {
        let boss = UNIQUE_HUNT_COSMOS_BOSSES[drop.bossId] || '은하 보스';
        return { label: `우주계 · ${boss}`, mapSubtab: 'map-tab-cosmos' };
    }
    let source = drop && UNIQUE_HUNT_SOURCE_TYPES[drop.type]
        ? { ...UNIQUE_HUNT_SOURCE_TYPES[drop.type] }
        : { label: `T${Math.max(1, Math.floor(Number(entry && entry.reqTier) || 1))}+ 사냥터`, mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-hunting' };
    if (drop && drop.type === 'labyrinth' && Number(drop.minFloor) > 0) source.label += ` ${Math.floor(drop.minFloor)}층+`;
    return source;
}

function renderUniqueHuntTargetCard(entry) {
    let key = uniqueHuntRuntime.getKey(entry);
    let encoded = encodeURIComponent(key).replace(/'/g, '%27');
    let source = getUniqueHuntSource(entry);
    let registered = !!(game.uniqueCodex && game.uniqueCodex[key]);
    let chase = entry.ultraRare || entry.cosmosChase;
    return `<article class="unique-hunt-target${chase ? ' is-chase' : ''}">
        <div class="unique-hunt-target-head"><span>${escapeHTML(entry.slots[0])}</span>${chase ? '<b>극희귀</b>' : '<b>추적 중</b>'}</div>
        <strong>${escapeHTML(entry.name)}</strong><small>${escapeHTML(source.label)} · ${registered ? '도감 등록됨, 재획득 추적' : '도감 미등록'}</small>
        <div><button type="button" onclick="uniqueHuntUi.navigate('${encoded}')">드랍처 보기</button><button type="button" onclick="uniqueHuntUi.toggle('${encoded}')">해제</button></div>
    </article>`;
}

function renderUniqueHuntPanel() {
    let root = document.getElementById('ui-unique-hunt-tracker');
    if (!root) return;
    let targets = uniqueHuntRuntime.getTargets();
    let cards = targets.map(renderUniqueHuntTargetCard);
    while (cards.length < uniqueHuntRuntime.limit) {
        cards.push('<div class="unique-hunt-empty-slot"><span>＋</span><small>도감 카드에서<br>파밍 목표 지정</small></div>');
    }
    root.innerHTML = `<section class="unique-hunt-panel">
        <header><div><span>HUNT WISHLIST</span><strong>🎯 고유 파밍 추적</strong><small>목표 드랍은 필터·자동해체·인벤토리 초과로 유실되지 않습니다.</small></div><b>${targets.length}/${uniqueHuntRuntime.limit}</b></header>
        <div class="unique-hunt-targets">${cards.join('')}</div>
    </section>`;
}

function renderUniqueHuntCardAction(entry) {
    if (!entry || entry.realmCodexOnly) return '';
    let key = uniqueHuntRuntime.getKey(entry);
    let tracked = uniqueHuntRuntime.ensureState().includes(key);
    let encoded = encodeURIComponent(key).replace(/'/g, '%27');
    return `<button type="button" class="codex-hunt-toggle${tracked ? ' active' : ''}" aria-pressed="${tracked}" onclick="uniqueHuntUi.toggle('${encoded}')">${tracked ? '🎯 추적 중' : '＋ 파밍 추적'}</button>`;
}

function toggleUniqueHuntFromUi(encodedKey) {
    let result = uniqueHuntRuntime.toggle(decodeURIComponent(encodedKey));
    if (!result.ok) {
        if (typeof showGameToast === 'function') showGameToast(result.reason, { tone: 'warning' });
        return false;
    }
    if (typeof queueImportantSave === 'function') queueImportantSave(200);
    if (typeof showGameToast === 'function') {
        showGameToast(`${result.entry.name} 파밍 추적 ${result.tracked ? '시작' : '해제'}`, { tone: result.tracked ? 'success' : 'info' });
    }
    updateStaticUI();
    return true;
}

function navigateToUniqueHuntSource(encodedKey) {
    let entry = uniqueHuntRuntime.getEntry(decodeURIComponent(encodedKey));
    if (!entry) return false;
    let source = getUniqueHuntSource(entry);
    let tabButton = document.getElementById(`btn-${source.mapSubtab}`);
    if (!tabButton || tabButton.style.display === 'none') {
        if (typeof showGameToast === 'function') showGameToast(`${source.label} 콘텐츠가 아직 해금되지 않았습니다.`, { tone: 'warning' });
        return false;
    }
    switchTab('tab-map');
    switchMapSubtab(source.mapSubtab);
    if (source.exploreSubtab) {
        let exploreButton = document.getElementById(`btn-${source.exploreSubtab}`);
        if (exploreButton && exploreButton.style.display !== 'none') switchMapExploreSubtab(source.exploreSubtab);
    }
    return true;
}

function refreshUniqueHuntUi() {
    let codexTab = document.getElementById('tab-codex');
    if (codexTab && codexTab.classList.contains('active')) renderUniqueCodexUI();
    else renderUniqueHuntPanel();
}

const uniqueHuntUi = Object.freeze({
    renderPanel: renderUniqueHuntPanel,
    renderCardAction: renderUniqueHuntCardAction,
    getSource: getUniqueHuntSource,
    toggle: toggleUniqueHuntFromUi,
    navigate: navigateToUniqueHuntSource
});

window.addEventListener('project-idle:unique-hunt-changed', refreshUniqueHuntUi);
safeExposeGlobals({ uniqueHuntUi });
