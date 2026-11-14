import { SUDDEN_DEATH_MS, RESULT_TITLES } from '../data/ghost-duel-stage.mjs';

export class GhostDuelView {
    constructor(deps, links) {
        this.deps = deps;
        this.links = links;
    }

    escape(value) { return (0, this.deps.escapeHTML)(String(value == null ? '' : value)); }

    plateHtml(f) {
        return `<div class="ghost-duel-plate ${f.side}"><strong>${this.escape(f.name)}</strong><small>${this.escape(f.skill)}</small>
            <div class="ghost-duel-life"><i data-duel-life="${f.side}"></i></div><em data-duel-pct="${f.side}">100%</em></div>`;
    }

    rootHtml(scene) {
        return `<canvas class="ghost-duel-canvas" aria-hidden="true"></canvas>${this.plateHtml(scene.fighters.left)}${this.plateHtml(scene.fighters.right)}
            <p class="ghost-duel-banner" aria-live="polite" data-duel-banner>${(0, this.deps._t)('불러오는 중')}</p>
            <div class="ghost-duel-controls"><button type="button" data-duel="pause">${(0, this.deps._t)('일시정지')}</button><button type="button" data-duel="speed">${(0, this.deps._t)('1배속')}</button>
            <button type="button" data-duel="skip">${(0, this.deps._t)('건너뛰기')}</button><button type="button" data-duel="close">${(0, this.deps._t)('나가기')}</button></div>
            <section class="ghost-duel-result" data-duel-result hidden></section>`;
    }

    mountRoot(scene) {
        const host = this.deps.document.getElementById('battlefield-wrap');
        if (!host) return null;
        const root = this.deps.document.createElement('div');
        root.id = 'ghost-duel-stage';
        root.className = 'ghost-duel-stage';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', (0, this.deps._t)('고스트 대결'));
        root.innerHTML = this.rootHtml(scene);
        host.appendChild(root);
        return root;
    }

    bannerAt(scene, c) {
        if (!scene.started) return '불러오는 중';
        if (c < (scene.strikes.length ? scene.strikes[0].at : 0)) return '대결 시작';
        return c >= SUDDEN_DEATH_MS && c < scene.endAt ? '막판: 피해 1.5배' : '';
    }

    updateHud(scene, c) {
        const life = this.links.timeline.lifeAt(scene, c);
        for (const side of ['left', 'right']) {
            const bar = scene.root.querySelector(`[data-duel-life="${side}"]`), pct = scene.root.querySelector(`[data-duel-pct="${side}"]`);
            if (bar) bar.style.width = `${life[side]}%`;
            if (pct) pct.textContent = `${life[side].toFixed(1)}%`;
        }
        const node = scene.root.querySelector('[data-duel-banner]'), banner = this.bannerAt(scene, c);
        if (!node) return;
        if (node.textContent !== banner) node.textContent = banner;
        node.hidden = !banner;
    }

    ratingLine(scene) {
        const outcome = scene.outcome || {}, result = outcome.result || {};
        if (outcome.mode !== 'ranked' || result.ratingAfter === undefined) return '친선전이라 레이팅은 그대로입니다';
        const delta = Number(result.ratingDelta) || 0;
        return (0, this.deps._t)('레이팅 {ratingBefore} → {ratingAfter} ({value}{delta})', { ratingBefore: this.escape(result.ratingBefore), ratingAfter: this.escape(result.ratingAfter), value: delta >= 0 ? '+' : '', delta });
    }

    /** 내 쪽(도전자)에서 본 결과. */
    resultHtml(scene) {
        const [title, tone] = RESULT_TITLES[scene.winner] || ['무승부', 'draw'];
        return `<strong class="${tone}">${title}</strong><span>${(0, this.deps._t)('대결 상대 {name}', { name: this.escape(scene.fighters.right.name) })}</span><span>${this.ratingLine(scene)}</span>
            <div><button type="button" data-duel="again">${(0, this.deps._t)('다시 보기')}</button><button type="button" data-duel="tab">${(0, this.deps._t)('대전 탭으로')}</button><button type="button" data-duel="close">${(0, this.deps._t)('닫기')}</button></div>`;
    }

    showResult(scene) {
        const panel = scene.root.querySelector('[data-duel-result]');
        if (!panel || !panel.hidden) return;
        panel.innerHTML = this.resultHtml(scene);
        panel.hidden = false;
        scene.root.querySelector('.ghost-duel-controls').hidden = true;
    }

    syncButtons(scene) {
        scene.root.querySelector('[data-duel="pause"]').textContent = scene.paused ? (0, this.deps._t)('계속') : (0, this.deps._t)('일시정지');
        scene.root.querySelector('[data-duel="speed"]').textContent = (0, this.deps._t)('{speed}배속', { speed: scene.speed });
    }
}
