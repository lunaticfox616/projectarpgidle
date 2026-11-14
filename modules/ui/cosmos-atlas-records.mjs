import { COSMOS_STONE_TIER_FLOORS, GALAXY_SEQUENCE, COSMOS_MASTERY_NODES, COSMOS_MASTERY_LINKS } from '../data/cosmos-atlas.mjs';

export function getCosmosTierFloorTooltipHtml(view) {
        const current = view.stones.getCosmosTierFloor();
        const baseFloors = COSMOS_STONE_TIER_FLOORS.slice(1, 6);
        const floorText = baseFloors.map(tier => {
            const style = tier === current ? 'color:#ffd98a;font-weight:800;text-shadow:0 0 8px rgba(255,217,138,.65);' : 'color:var(--copy-bright);';
            return `<span style="${style}">${tier}</span>`;
        }).join(' / ');
        return `<div class="tooltip-line">${view.deps._t('우주계 최소 티어 보정 {floorText}', { floorText })}</div>`;
    }

export function buildCosmosStoneOverlayHtml(view, state) {
        return `<div class="cosmos-stone-overlay-inner">
            <div class="cosmos-stone-overlay-head">
                <span>${view.deps._t('💠 우주석 장착')}</span>
                <button type="button" class="cosmos-stone-overlay-close" data-cosmos-action="close-stones">✕</button>
            </div>
            ${view.renderCosmosStonePanel(state)}
        </div>`;
    }

export function buildCosmosStoneTooltipHtml(view, galaxy) {
        const state = view.state.getState();
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        const acquired = view.state.isCosmosStoneAcquired(state, g);
        const options = acquired ? view.stones.ensureCosmosStoneOptions(state, g) : [];
        const lines = options.map(option => `<div class="tooltip-line">${view.deps.escapeHTML(view.stones.getCosmosStoneOptionText(option))}</div>`).join('') || '<div class="tooltip-line">아직 획득하지 않았습니다.</div>';
        return `<div class="tooltip-title">${view.deps.escapeHTML(view.stones.getCosmosStoneNameByGalaxy(g))}</div>${view.getCosmosTierFloorTooltipHtml()}<div class="tooltip-line" style="color:var(--copy-bright);">${view.deps._t('보스 유물 사용: 무작위 1줄을 해당 우주석의 보스 옵션으로 리롤')}</div>${lines}`;
    }

export function renderCosmosStonePanel(view, state) {
        const relicCount = Array.isArray(state.bossRelics) ? state.bossRelics.length : 0;
        const cardGalaxies = view.state.hasSixthCosmosStoneUnlock() ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
        const cards = cardGalaxies.map(g => {
            const acquired = view.state.isCosmosStoneAcquired(state, g);
            const equipped = !!(state.equippedStones && state.equippedStones[String(g)]);
            const usableRelic = Array.isArray(state.bossRelics) && view.stones.findCosmosBossRelicIndexForStone(state.bossRelics, g) >= 0;
            const options = acquired ? view.stones.ensureCosmosStoneOptions(state, g) : [];
            const optionHtml = options.map(option => `<div class="cosmos-stone-option ${option.boss ? 'boss' : ''}">${view.deps.escapeHTML(view.stones.getCosmosStoneOptionText(option))}</div>`).join('') || '<div class="cosmos-stone-option empty">미획득</div>';
            return `<article class="cosmos-stone-card ${acquired ? 'acquired' : 'locked'} ${equipped ? 'equipped' : ''}" data-info-tooltip-anchor="1" data-cosmos-stone-tip="${g}"><div class="cosmos-stone-orb"><i></i><b>G${g}</b></div><div class="cosmos-stone-card-body"><header><b>${view.deps.escapeHTML(view.stones.getCosmosStoneNameByGalaxy(g))}</b><span>${equipped ? view.deps._t('장착 중') : (acquired ? view.deps._t('보유') : view.deps._t('미획득'))}</span></header><small>${view.deps._t('최소 티어 T{cosmosTierFloor}', { cosmosTierFloor: view.stones.getCosmosTierFloor() })}</small><div class="cosmos-stone-options">${optionHtml}</div>${cosmosStoneControls(view, g, { acquired, equipped, usableRelic })}</div></article>`;
        }).join('');
        return `<section class="cosmos-stone-panel"><header><strong>${view.deps._t('우주석 성좌')}</strong><span>${view.deps._t('보스 유물 {relicCount}개', { relicCount })}</span></header><div class="cosmos-stone-grid">${cards}</div></section>`;
    }

export function renderSummary(view) {
        if (!view.ui.summary) return;
        const state = view.state.getState();
        const cleared = state.cleared.length;
        const available = view.graph.nodes.filter(node => view.progress.getNodeStatus(node, state) === 'available').length;
        const planetsCleared = view.graph.nodes.filter(n => n.kind === 'planet' && state.cleared.includes(n.id)).length;
        const asteroidsCleared = view.graph.nodes.filter(n => n.kind === 'asteroid' && state.cleared.includes(n.id)).length;
        const unlocked = view.progress.isCosmosUnlocked();
        const capstone = view.progress.getCosmosCapstoneProgress(state);
        const galaxyProgress = GALAXY_SEQUENCE.map(galaxy => {
            const total = view.graph.nodes.filter(node => node.orbit === galaxy).length;
            const complete = view.graph.nodes.filter(node => node.orbit === galaxy && state.cleared.includes(node.id)).length;
            return `<span><b>G${galaxy}</b><i><em style="width:${total > 0 ? Math.floor(complete / total * 100) : 0}%"></em></i><small>${complete}/${total}</small></span>`;
        }).join('');
        const { capstoneState, capstoneMessage } = cosmosCapstoneStatus(capstone);
        const capstoneBosses = capstone.bosses.map(row => `
            <button type="button" class="cosmos-capstone-boss ${row.cleared ? 'cleared' : 'missing'}"
                data-cosmos-action="capstone" data-cosmos-value="${row.id}"
                data-tip="${row.cleared ? view.deps._t('이번 루프 격파 완료') : view.deps._t('아틀라스에서 위치 확인')}">
                <span>G${row.galaxy}</span>${view.deps.escapeHTML(view.deps._t(row.name))}<b>${row.cleared ? '✓' : '○'}</b>
            </button>`).join('');
        const capstoneAction = capstone.ready
            ? `<button type="button" class="cosmos-capstone-action" data-cosmos-action="capstone-panel">${view.deps._t('잔향체 아스트라 위치 열기')}</button>`
            : '';
        view.ui.summary.innerHTML = `
            <div class="cosmos-summary-metrics">
                <div><span>${view.deps._t('탐사 완료')}</span><strong>${cleared}<small> / ${view.graph.nodes.length}</small></strong></div>
                <div><span>${view.deps._t('개별 탐사 가능')}</span><strong>${view.deps._t('{count}개', { count: unlocked ? available : 0 })}</strong></div>
                <div><span>${view.deps._t('성도술')}</span><strong>${view.progress.getCosmosMasteryFreePoints()}<small> / ${view.progress.getCosmosMasteryTotalPoints()}</small></strong></div>
                <div data-tip="${view.deps._t('창공의 정수는 우주계 탐사, 은하 보스에서 얻고 룬 강화와 룬 각인에 씁니다.')}"><span>${view.deps._t('창공의 정수')}</span><strong>${view.progress.getSkyPowerBalance()}</strong></div>
            </div>
            <div class="cosmos-progress-overview"><div class="cosmos-galaxy-progress">${galaxyProgress}</div>
                <div class="cosmos-resource-line"><span>${view.deps._t('행성 {planetsCleared}/50, 소행성 {asteroidsCleared}/75', { planetsCleared, asteroidsCleared })}</span><span>보스 유물 ${(state.bossRelics || []).length}, 우주석 ${view.state.getEquippedCosmosStoneCount(state)}/${view.state.hasSixthCosmosStoneUnlock() ? 6 : 5}</span></div></div>
            <details class="cosmos-capstone-card ${capstoneState}" data-ui-disclosure="cosmos-capstone">
                <summary class="cosmos-capstone-head"><span>${view.deps._t('최종 관문')}</span><strong>${view.deps._t('잔향체 아스트라 {clearedCount}/{total}, 표식 {keyCount}', { clearedCount: capstone.clearedCount, total: capstone.total, keyCount: capstone.keyCount })}</strong></summary>
                <div class="cosmos-capstone-bosses">${capstoneBosses}</div>
                <p>${view.deps.escapeHTML(capstoneMessage)}</p>
                <div class="cosmos-capstone-footer"><span>${view.deps._t('표식: 잔향')} <b>${capstone.keyCount}</b></span>${capstoneAction}</div>
            </details>`;
    }

export function renderMasteryPanel(view) {
        const el = view.deps.document.getElementById('cosmos-inner-mastery');
        if (!el) return;
        const freePoints = view.progress.getCosmosMasteryFreePoints();
        if (el.style.display === 'none') return;
        const totalPoints = view.progress.getCosmosMasteryTotalPoints();
        const cards = COSMOS_MASTERY_NODES.map(node => {
            const value = view.progress.getCosmosMasteryValue(node.key);
            const lockReason = view.progress.getCosmosMasteryLockReason(node.key);
            const canSpend = freePoints >= node.cost && value < node.max && !lockReason;
            const stateClass = lockReason ? 'locked' : (value >= node.max ? 'maxed' : (canSpend ? 'available' : ''));
            const linkLine = cosmosMasteryLinkLine(node);
            return `<article class="cosmos-mastery-card ${stateClass}">
                <div class="cosmos-mastery-card-head"><div><span>${lockReason ? view.deps._t('잠김') : (value >= node.max ? view.deps._t('완성') : view.deps._t('별길'))}</span><strong>${view.deps._t(node.name)}</strong></div><b>${value}/${node.max}</b></div>
                <div class="cosmos-mastery-progress"><i style="width:${Math.floor(value / node.max * 100)}%"></i></div>
                <p>${view.deps._t(node.desc)}</p>
                <div class="cosmos-mastery-card-foot"><small>${lockReason || linkLine}</small><button type="button" data-cosmos-action="mastery" data-cosmos-value="${node.key}" ${canSpend ? '' : 'disabled'}>${view.deps._t('투자, {cost}P', { cost: node.cost })}</button></div>
            </article>`;
        }).join('');
        const html = `<div class="cosmos-mastery-header"><div><div class="cosmos-kicker">${view.deps._t('별의 숙련')}</div><div class="cosmos-detail-title">${view.deps._t('성도술 항로')}</div><p>${view.deps._t('탐사 완료로 얻은 포인트를 연결된 항로에 투자하세요.')}</p></div><div class="cosmos-mastery-points"><span>${view.deps._t('사용 가능')}<strong>${freePoints}</strong></span><span>${view.deps._t('누적 획득')}<strong>${totalPoints}</strong></span></div></div><div class="cosmos-mastery-grid">${cards}</div>`;
        if (el.__masteryHtml !== html || !el.firstElementChild) {
            el.innerHTML = html;
            el.__masteryHtml = html;
        }
    }

function cosmosStoneControls(view, g, state) {
    const { acquired, equipped, usableRelic } = state;
    return `<div class="cosmos-stone-actions"><button data-cosmos-action="equip" data-cosmos-value="${g}" ${acquired && !equipped ? '' : 'disabled'}>${view.deps._t('장착')}</button><button data-cosmos-action="unequip" data-cosmos-value="${g}" ${equipped ? '' : 'disabled'}>${view.deps._t('해제')}</button><button data-cosmos-action="inscribe" data-cosmos-value="${g}" ${acquired && usableRelic ? '' : 'disabled'} data-tip="${usableRelic ? view.deps._t('이 우주석 전용 보스 유물 사용') : view.deps._t('이 우주석에 맞는 보스 유물이 없습니다')}">${view.deps._t('유물 각인')}</button></div>`;
}

function cosmosCapstoneStatus(capstone) {
        const capstoneState = !capstone.eligibleSeason
            ? 'locked'
            : (capstone.canChallenge ? 'ready' : (capstone.ready ? 'key-needed' : 'progress'));
        const capstoneMessage = !capstone.eligibleSeason
            ? '루프 31부터 다섯 은하 보스를 같은 루프에 격파하면 최종 관문이 열립니다.'
            : (capstone.canChallenge
                ? '표식과 격파 조건을 모두 갖췄습니다. 잔향체 아스트라에 도전할 수 있습니다.'
                : (capstone.ready
                    ? '격파 조건 완료, 은하 보스를 반복 처치해 「표식: 잔향」을 확보하세요.'
                    : `이번 루프 미격파: ${capstone.missing.map(row => row.name).join(', ')}`));
        return { capstoneState, capstoneMessage };
}

function cosmosMasteryLinkLine(node) {
            const links = COSMOS_MASTERY_LINKS[node.key] || [];
            const linkLine = links.length ? links.map(link => {
                const [key, level] = String(link).split(':');
                const required = COSMOS_MASTERY_NODES.find(row => row.key === key);
                return `${required ? required.name : key} ${Math.max(1, Math.floor(Number(level || 1)))}Lv`;
            }).join(', ') : '시작 노드';
            return linkLine;
}
