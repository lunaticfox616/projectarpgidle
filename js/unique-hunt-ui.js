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
    seasonBoss: { label: '강대한 적', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-root-boss' },
    // 깨어난 아틀라스의 최종 보스와 리그 우두머리만 주는 고유(data/atlas-endgame.js, 아틀라스의 최종 보기).
    atlasLate: { label: '깨어난 아틀라스 보스', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-worldtree', atlasView: 'late' }
});
const UNIQUE_HUNT_SOURCE_IDS = Object.freeze({
    grand_breach_run: { label: '대균열', mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-voidrift' },
    cosmos_astra: { label: '잔향체 아스트라', mapSubtab: 'map-tab-cosmos' }
});
const UNIQUE_HUNT_COSMOS_BOSSES = Object.freeze({
    'planet-45': '에니프론', 'planet-46': '하말리스', 'planet-47': '디프다르',
    'planet-48': '주베누비아', 'planet-49': '주벤샤말'
});

/** 깨어난 아틀라스의 리그 우두머리도 주는 고유(data/atlas-endgame.js leagues): 원래 자리에 더해 그 우두머리를 적는다. */
function describeUniqueHuntSource(entry) {
    let source = getUniqueHuntSource(entry);
    let league = ATLAS_ENDGAME.leagues.find(row => row.unique === (entry && entry.name));
    if (league && source.exploreSubtab !== 'map-explore-worldtree') source.label += `, 아틀라스 ${league.boss}`;
    return source;
}

function getUniqueHuntSource(entry) {
    let drop = entry && entry.dropOnly && typeof entry.dropOnly === 'object' ? entry.dropOnly : null;
    if (drop && UNIQUE_HUNT_SOURCE_IDS[drop.id]) return { ...UNIQUE_HUNT_SOURCE_IDS[drop.id] };
    if (drop && drop.type === 'cosmosBoss') {
        let boss = UNIQUE_HUNT_COSMOS_BOSSES[drop.bossId] || '은하 보스';
        return { label: `우주계, ${boss}`, mapSubtab: 'map-tab-cosmos' };
    }
    let source = drop && UNIQUE_HUNT_SOURCE_TYPES[drop.type]
        ? { ...UNIQUE_HUNT_SOURCE_TYPES[drop.type] }
        : { label: `T${Math.max(1, Math.floor(Number(entry && entry.reqTier) || 1))}+ 사냥터`, mapSubtab: 'map-tab-zones', exploreSubtab: 'map-explore-hunting' };
    if (drop && drop.type === 'labyrinth' && Number(drop.minFloor) > 0) source.label += ` ${Math.floor(drop.minFloor)}층+`;
    return source;
}

/** One hunt target: the unique's picture, name, where it drops (and whether the codex has it), go-to and stop buttons. */
function renderUniqueHuntTargetCard(entry) {
    let key = uniqueHuntRuntime.getKey(entry);
    let encoded = encodeURIComponent(key).replace(/'/g, '%27');
    let registered = !!(game.uniqueCodex && game.uniqueCodex[key]);
    let chase = entry.ultraRare || entry.cosmosChase;
    return `<article class="codex-hunt-target${chase ? ' is-chase' : ''}"><span class="codex-art"><img src="${getUniqueEntryVisualAsset(entry)}" alt=""></span>
        <div><strong>${escapeHTML(entry.name)}</strong><small>${escapeHTML(describeUniqueHuntSource(entry).label)}${registered ? ', 등록됨' : ''}${chase ? ', 극희귀' : ''}</small></div>
        <div class="codex-hunt-actions"><button type="button" onclick="uniqueHuntUi.navigate('${encoded}')">드랍처</button><button type="button" onclick="uniqueHuntUi.toggle('${encoded}')">해제</button></div>
    </article>`;
}

/** The hunt row above the codex (2026-10-09 도감 다시 그림): three cells, a target card or an empty cell. */
function renderUniqueHuntPanel() {
    let root = document.getElementById('ui-unique-hunt-tracker');
    if (!root) return;
    root.hidden = game.codexSubtab === 'realm';
    if (root.hidden) return;
    let targets = uniqueHuntRuntime.getTargets();
    let cells = targets.map(renderUniqueHuntTargetCard);
    while (cells.length < uniqueHuntRuntime.limit) cells.push(`<div class="codex-hunt-empty">${cells.length ? '빈 칸' : '고유를 눌러 추적'}</div>`);
    root.innerHTML = `<section class="codex-hunt"><header><strong>파밍 추적</strong><em>자동해체 보호</em><b>${targets.length}/${uniqueHuntRuntime.limit}</b></header>
        <div class="codex-hunt-row">${cells.join('')}</div></section>`;
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
    let source = describeUniqueHuntSource(entry);
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
    if (source.atlasView) atlasUi.setView(source.atlasView); // the atlas's late view (아틀라스 후반부 고유)
    return true;
}

function refreshUniqueHuntUi() {
    let codexTab = document.getElementById('tab-codex');
    if (codexTab && codexTab.classList.contains('active')) uniqueCodexUi.render();
    else renderUniqueHuntPanel();
}

const uniqueHuntUi = Object.freeze({
    renderPanel: renderUniqueHuntPanel,
    getSource: describeUniqueHuntSource,
    toggle: toggleUniqueHuntFromUi,
    navigate: navigateToUniqueHuntSource
});

window.addEventListener('project-idle:unique-hunt-changed', refreshUniqueHuntUi);
safeExposeGlobals({ uniqueHuntUi });
