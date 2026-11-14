import { GALAXY_BOSS_REQUIRED_CLEARS } from '../data/cosmos-atlas.mjs';

export function getStatusLabel(view, status) {
        if (status === 'cleared') return '탐사 완료';
        if (status === 'available') return '탐사 가능';
        return '별길 잠김';
    }

export function renderCosmosDifficultySection(view, node) {
        const model = view.rules.getCosmosNodeRecommendation(node);
        if (!model || !model.readiness) return '';
        const ready = model.readiness;
        const label = view.deps._t('권장 전투력 {value}', { value: ready.meetsRecommendation ? view.deps._t('달성') : view.deps._t('미달성') });
        return `<div class="cosmos-detail-section cosmos-readiness">
            <div class="cosmos-section-label">${view.deps._t('전투 준비도')}</div>
            <div class="cosmos-power-grid map-power-estimate" tabindex="0" aria-label="${label}" data-info-tooltip-anchor="1" data-player-dps="${Math.round(ready.playerDps)}" data-recommended-dps="${Math.round(ready.recommendedDps)}" data-player-ehp="${Math.round(ready.playerEhp)}" data-recommended-ehp="${Math.round(ready.recommendedEhp)}" data-limiting-element="${ready.element}" data-cosmos-power-tip><span><strong class="map-power-grade grade-${ready.meetsRecommendation ? 'high' : 'low'}">${label}</strong></span></div>
        </div>`;
    }

export function renderGalaxyGateLine(view, node, state) {
        if (!node || node.orbit <= 0) return '';
        const clears = view.progress.getGalaxyClearCount(state, node.orbit);
        const ready = clears >= GALAXY_BOSS_REQUIRED_CLEARS;
        return `<div class="cosmos-gate-line ${ready ? 'ready' : ''}"><span>${view.deps._t('은하 안정도')}</span><strong>${Math.min(GALAXY_BOSS_REQUIRED_CLEARS, clears)}/${GALAXY_BOSS_REQUIRED_CLEARS}</strong><small>${ready ? view.deps._t('은하 보스 도전 가능') : view.deps._t('보스 해금까지 {value}개 노드', { value: GALAXY_BOSS_REQUIRED_CLEARS - clears })}</small></div>`;
    }

export function formatCosmosDirectivePressure(view, multiplier) {
        const pct = Math.round((Math.max(0, Number(multiplier) || 1) - 1) * 100);
        return `${pct > 0 ? '+' : ''}${pct}%`;
    }

export function renderCosmosDirectiveCard(view, node, directive, selected, disabled) {
        const chance = Math.round(Math.max(0, Number(directive.jackpotChance) || 0) * 100);
        const className = ['cosmos-directive-card', selected ? 'selected' : '', directive.rare ? 'rare' : '']
            .filter(Boolean).join(' ');
        return `<button type="button" class="${className}" data-cosmos-directive-node="${view.deps.escapeHTML(node.id)}" data-cosmos-directive-id="${view.deps.escapeHTML(directive.id)}" aria-pressed="${selected ? 'true' : 'false'}" ${disabled ? 'disabled' : ''}>
            <span class="cosmos-directive-card-head"><small>${view.deps.escapeHTML(directive.signal || 'SIGNAL')}</small>${cosmosDirectiveBadge(view, directive, selected)}</span>
            <strong>${view.deps.escapeHTML(view.deps._t(directive.name))}</strong>
            <span class="cosmos-directive-desc">${view.deps.escapeHTML(view.deps._t(directive.description))}</span>
            <span class="cosmos-directive-risk"><i>${view.deps._t('생명력 {enemyHpMul}', { enemyHpMul: view.formatCosmosDirectivePressure(directive.enemyHpMul) })}</i><i>${view.deps._t('피해 {enemyDamageMul}', { enemyDamageMul: view.formatCosmosDirectivePressure(directive.enemyDamageMul) })}</i><i>${view.deps._t('속도 {enemyAttackSpeedMul}', { enemyAttackSpeedMul: view.formatCosmosDirectivePressure(directive.enemyAttackSpeedMul) })}</i></span>
            <span class="cosmos-directive-reward"><b>${view.deps._t('보상 ×{rewardMul}', { rewardMul: Number(directive.rewardMul || 1).toFixed(2) })}</b><em>${chance > 0 ? view.deps._t('공명 잭팟 {chance}%', { chance }) : view.deps._t('잭팟 없음')}</em></span>
        </button>`;
    }

export function renderCosmosDirectiveSection(view, node, state) {
        const status = view.progress.getNodeStatus(node);
        const choices = view.directives.getCosmosDirectiveChoicesForNode(node, state);
        if (choices.length === 0) return '';
        const selected = view.directives.getSelectedCosmosDirective(node, state);
        const fighting = view.deps.game.currentZoneId === 'cosmos_challenge'
            && state.activeChallenge && state.activeChallenge.nodeId === node.id;
        const disabled = !view.rules.canChallengeNode(node) || fighting;
        const cards = choices.map(row => view.renderCosmosDirectiveCard(node, row, selected && row.id === selected.id, disabled)).join('');
        let hint = status === 'cleared'
            ? '새 신호가 포착되었습니다. 원하는 항로로 재탐사하세요.'
            : '탐사 완료 후 무작위 신호 2개가 갱신됩니다.';
        if (fighting) hint = '현재 탐사에 고정됨';
        return `<section class="cosmos-directive-section"><div class="cosmos-directive-title"><span>${view.deps._t('탐사 신호 선택')}</span><small>${hint}</small></div><div class="cosmos-directive-list">${cards}</div></section>`;
    }

export function getCosmosChallengeButtonLabel(view, node, status) {
        if (node && node.tag === 'boss') return status === 'cleared' ? '은하 보스 재도전' : '은하 보스 도전';
        return status === 'cleared' ? '새 신호 재탐사' : '전투 도전';
    }

export function renderDetail(view) {
        if (!view.ui.detail) return;
        const state = view.state.getState();
        const node = view.graph.byId.get(view.state.getState().selectedId) || view.graph.byId.get('planet-0');
        const status = view.progress.getNodeStatus(node);
        const available = view.rules.canChallengeNode(node) && !view.deps.cosmosRouteRuntime.active(view.deps.game);
        const reward = node.tag === 'boss' ? view.deps._t('첫 격파, {node}', { node: view.stones.getBossStoneName(node) })
            : view.deps._t('창공의 정수, {value}', { value: node.kind === 'planet' ? view.deps._t('행성 보상') : view.deps._t('제작 재료') });
        view.ui.detail.innerHTML = `
            <div class="cosmos-detail-hero"><div class="cosmos-detail-title">${view.deps.escapeHTML(view.deps._t(node.name))}</div>
                <span class="cosmos-status ${status}">${view.getStatusLabel(status)}</span></div>
            ${view.renderCosmosDifficultySection(node)}
            ${view.renderGalaxyGateLine(node, state)}
            <div class="cosmos-actions">
                <button class="primary" data-exploration-departure data-cosmos-action="challenge" ${available ? '' : 'disabled'}>${view.getCosmosChallengeButtonLabel(node, status)}</button>
                <button data-cosmos-action="stones">${view.deps._t('우주석 관리')}</button>
                <button data-cosmos-action="close-detail">${view.deps._t('닫기')}</button>
            </div>
            <details data-ui-disclosure="cosmos-selected-conditions"><summary>${view.deps._t('전투 조건, 보상')}</summary>
                <p class="cosmos-reward-line">${view.deps.escapeHTML(reward)}</p>
                ${view.renderCosmosDirectiveSection(node, state)}
            </details>`;
    }

function cosmosDirectiveBadge(view, directive, selected) {
    if (selected) return view.deps._t('<b>선택됨</b>');
    return directive.rare ? view.deps._t('<b>희귀 신호</b>') : '';
}
