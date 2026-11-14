import { listenView, releaseViewEvents } from './view-events.mjs';

/** Owns transient controls and listeners; current saves are read through deps. */
class ChronicleView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        this.C = this.deps.CHRONICLE;
        this.esc = value => this.deps.escapeHTML(String(value));
        this.TONES = Object.freeze({ codex: '#ff9f43', mastery: '#e8c27a', talismans: '#c98cff', journal: '#ffd36b', depth: '#b78bff', loops: '#7fd88a',
        harvest: '#9fd46a', fishing: '#5ab8f0', variants: '#ff6f59', memory: '#78d7ff', epochs: '#f0c86f' });
        this.TARGETS = Object.freeze({
        codex: { route: 'tab-codex', select: () => this.deps.uniqueCodexUi.setSubtab('main') },
        mastery: { route: 'tab-records', section: '.records-mastery' },
        talismans: { route: 'tab-stump', content: 'talisman', more: 'talisman', section: '#stump-box-more .stump-codex' },
        journal: { route: 'tab-journal' },
        depth: { route: 'tab-map', content: 'deepChaos' },
        loops: { route: 'tab-records', section: '.records-loop-history' },
        harvest: { route: 'tab-stump', more: 'harvest', section: '#stump-box-more' },
        fishing: { route: 'tab-map', content: 'fishing' },
        variants: { route: 'map-explore-worldtree', atlas: 'memory', ready: () => this.deps.bossVariants.open(this.deps.game), section: '#ui-atlas .boss-variant-records' },
        memory: { route: 'map-explore-worldtree', atlas: 'memory', ready: () => this.deps.memoryDungeon.open(this.deps.game), select: () => this.deps.memoryDungeonUi.setFilter('records', true) },
        epochs: { route: 'map-explore-worldtree', atlas: 'epoch' }
    });
        for (const name of ["ringsSvg","targetReady","revealSection","open","chapterHtml","sectionHtml","announce"]) this[name] = this[name].bind(this);
        listenView(this, this.deps.window, 'project-idle:chronicle-ring', event => this.announce(event.detail || {}));
    }

    ringsSvg(wound, share) {
        const circles = Array.from({ length: this.C.rings }, (_, index) => {
            const on = index < wound;
            return `<circle cx="60" cy="60" r="${17 + index * 4.4}" fill="none" stroke="${on ? '#e0aa45' : 'rgba(190, 168, 120, .3)'}"
                stroke-width="${on ? 3 : 1.4}"/>`;
        }).join('');
        return `<svg class="chronicle-rings" viewBox="0 0 120 120" role="img" aria-label="${this.deps._t('나이테 {wound}개', { wound })}">${circles}
            <text x="60" y="64" text-anchor="middle">${Math.floor(share * 100)}%</text></svg>`;
    }

    targetReady(id) {
        if (!Object.hasOwn(this.TARGETS, id)) return false;
        const target = this.TARGETS[id];
        if (target.content && !this.deps.contentProgression.isUnlocked(target.content)) return false;
        if (target.ready && !target.ready()) return false;
        return this.deps.contentProgression.canOpen(target.route);
    }

    revealSection(selector) {
        const section = this.deps.document.querySelector(selector);
        if (!section) return;
        if (section.tagName === 'DETAILS') section.open = true;
        section.setAttribute('tabindex', '-1');
        section.focus({ preventScroll: true });
        section.scrollIntoView({ block: 'start' });
    }

    open(id) {
        if (!this.active) return false;
        if (!this.targetReady(id)) return false;
        const target = this.TARGETS[id];
        if (target.atlas) { this.deps.atlasUi.openPanel(); this.deps.atlasUi.setView(target.atlas); }
        else if (target.content) this.deps.contentUnlockUi.open(target.content);
        else this.deps.switchTab(target.route, { keepWindowOpen: true });
        if (target.select) target.select();
        if (target.more) this.deps.stumpBoxUi.revealMoreTab(target.more);
        if (target.section) this.revealSection(target.section);
        return true;
    }

    chapterHtml(row) {
        const fill = Math.floor(row.share * 100), done = row.share >= 1, state = done ? ' is-done' : row.count > 0 ? ' is-started' : '';
        const action = this.targetReady(row.id) ? `<button type="button" class="chronicle-open" aria-label="${this.deps._t('{name} 보기', { name: this.esc(this.deps._t(row.name)) })}" data-chronicle-open="${row.id}">${this.deps._t('보기')}</button>` : '';
        return `<li class="chronicle-chapter${state}" style="--chapter-tone:${this.TONES[row.id] || '#e8c27a'}"><div><strong>${this.esc(this.deps._t(row.name))}</strong><span>${row.count}/${row.goal}</span>${action}</div>
            <div class="mastery-bar"><i style="width:${fill}%"></i></div>${done ? '' : `<small>${this.esc(row.hint)}</small>`}</li>`;
    }

    sectionHtml() {
        if (!this.active) return '';
        this.bindControls();
        this.deps.chronicle.check(this.deps.game);
        const view = this.deps.chronicle.completion(this.deps.game), wound = this.deps.chronicle.rings(this.deps.game);
        const nextAt = wound < this.C.rings ? Math.ceil((wound + 1) * 100 / this.C.rings) : 0;
        return `<details class="records-fold records-chronicle" open><summary>${this.deps._t('세계수 연대기')}<span>${this.deps._t('나이테 {wound}/{rings}, 방치 효율', { wound, rings: this.C.rings })} <b class="records-gain">+${wound}%p</b></span></summary>
            <div class="records-fold-body chronicle-body">${this.ringsSvg(wound, view.share)}<div><p class="records-fold-hint">흩어진 수집을 한데 모은 완성도입니다.
            10%마다 나이테가 하나 감기고 나이테마다 방치 효율 +1%p.${nextAt ? this.deps._t(' 다음 나이테는 {nextAt}%.', { nextAt }) : ''}</p>
            <ul class="chronicle-chapters">${view.rows.filter(row => row.count > 0 || this.targetReady(row.id)).map(this.chapterHtml).join('')}</ul></div></div></details>`;
    }

    announce(detail) {
        const rings = Array.isArray(detail.rings) ? detail.rings : [];
        if (!rings.length) return;
        this.deps.addLog(this.deps._t('🌳 세계수 연대기에 나이테가 감겼습니다({rings}번째). 방치 효율 +{length}%p.', { rings: rings.join(', '), length: rings.length }), 'loot-unique', { toast: true });
    }

    bindControls() {
        if (this.controlsBound) return;
        this.controlsBound = true;
        listenView(this, this.deps.document, 'click', event => {
            const button = event.target.closest('[data-chronicle-open]');
            if (button?.closest('.records-chronicle')) this.open(button.dataset.chronicleOpen);
        });
    }

    api() { return Object.freeze({ sectionHtml: this.sectionHtml, open: this.open }); }

    dispose() {
        releaseViewEvents(this);

    }
}

export function createChronicleView(deps) {
    const view = new ChronicleView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
}
