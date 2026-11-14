import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** Owns transient controls and listeners; current saves are read through deps. */
class MemoryLeavesView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        this.GROUPS = [...this.deps.ATLAS.regions.map(region => ({ id: region.id, name: region.name, tint: region.tint,
        test: leaf => leaf.source.region === region.id })),
        { id: 'special', name: '보스와 특별한 곳', tint: '#b89a5a', test: leaf => !!(leaf.source.boss || leaf.source.golden || leaf.source.treasure) },
        { id: 'any', name: '어느 지도나', tint: '#7f9a8a', test: leaf => !!leaf.source.any }];
        this.lastHtml = '';
        this.esc = value => this.deps.escapeHTML(String(value ?? ''));
        for (const name of ["cardHtml","groupHtml","render","announceLeaf"]) this[name] = this[name].bind(this);
        listenView(this, this.deps.window, 'project-idle:memory-leaf', ({ detail }) => this.announceLeaf(detail));
    }

    cardHtml(leaf, tint) {
        const seen = this.deps.game.atlas.leaves.seen.includes(leaf.id);
        const body = seen ? `<strong>${this.esc(this.deps._t(leaf.name))}</strong><span class="leaf-reward">${this.esc(this.deps._t(leaf.bonus.label))}</span>`
            : '<strong class="is-hidden">아직 못 본 잎</strong>';
        const button = seen ? `<button type="button" class="leaf-read" data-leaf-read="${leaf.journal}">${this.deps._t('기억 읽기')}</button>` : '';
        return `<article class="leaf-card${seen ? '' : ' is-unseen'}" style="--leaf-tint:${tint}">`
            + `<span class="leaf-glyph" aria-hidden="true">${this.deps.renderPixelIcon('leaf', 'leaf-icon')}</span><div class="leaf-body">${body}`
            + `<small class="leaf-source">${this.esc(this.deps.memoryLeaves.sourceText(leaf))}</small>`
            + `<span class="leaf-count">${seen ? this.deps._t('저널에 기록됨') : this.deps._t('미발견')}</span></div>${button}</article>`;
    }

    groupHtml(group) {
        const cards = this.deps.memoryLeaves.list.filter(group.test).map(leaf => this.cardHtml(leaf, group.tint)).join('');
        return cards ? `<section class="leaf-group" style="--leaf-tint:${group.tint}"><h4>${this.esc(this.deps._t(group.name))}</h4><div class="leaf-grid">${cards}</div></section>` : '';
    }

    render() {
        if (!this.active) return;
        const root = this.deps.document.getElementById('ui-leaf-book');
        if (!root) return;
        this.bindControls(root);
        const header = `<header class="leaf-head"><div class="leaf-head-title"><h3>${this.deps._t('기억의 잎')}</h3></div>`
            + `<div class="leaf-stats"><span><small>${this.deps._t('발견한 기억')}</small><b>${this.deps.game.atlas.leaves.seen.length}/${this.deps.memoryLeaves.list.length}</b></span></div></header>`;
        const html = header + this.GROUPS.map(this.groupHtml).join('');
        if (html !== this.lastHtml) { root.innerHTML = html; this.lastHtml = html; }
    }

    announceLeaf(result) {
        this.deps.game.noti.journal = true;
        this.deps.game.noti.codex = true;
        if (this.deps.game.isBackgroundCalculation) return;
        if (this.deps.game.settings.lootFx?.notices?.leaf !== false) {
            this.deps.showGameToast(this.deps._t('기억의 잎을 발견했습니다. 「{name}」', { name: this.deps._t(result.name) }), { tone: 'leaf', duration: 3600 });
        }
        this.deps.queueImportantSave(200);
    }

    bindControls(root) {
        if (this.root === root) return;
        releaseViewTarget(this, this.root);
        this.root = root;
        this.lastHtml = '';
        listenView(this, root, 'click', event => {
            const button = event.target.closest('[data-leaf-read]');
            if (!button || !root.contains(button)) return;
            const leaf = this.deps.memoryLeaves.list.find(row => row.journal === button.dataset.leafRead);
            if (leaf && this.deps.game.atlas.leaves.seen.includes(leaf.id)) this.deps.storyJournalUi.openEntry(leaf.journal);
        });
    }

    api() { return Object.freeze({ render: this.render }); }

    dispose() {
        releaseViewEvents(this);
        this.root = null;
        this.lastHtml = '';
    }
}

export function createMemoryLeavesView(deps) {
    const view = new MemoryLeavesView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
}
