import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** Owns screen state and subscriptions. Saves and domain rules are supplied by the application. */
class UniqueCodexView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        for (const name of ["rewardStatHtml","freshHtml","summaryHtml","slotsOf","shownSlot","slotTabHtml","tileHtml","rangeText","statLines","statsHtml","actionsHtml","sheetHtml","openEntry","onSheetClick","syncSubtabs","showLeaves","onClick","render","setSubtab"]) this[name] = this[name].bind(this);
        this.DIALOG = 'unique-codex-dialog';
        this.dialogKey = null;
        this.lastTop = '';
        this.lastHtml = '';
        this.lastSheet = '';
        this.hosts = [];
        this.overlay = null;
        this.owner = null;
        this.codexBook = null;
        this.esc = value => this.deps.escapeHTML(String(value ?? ''));
        this.codex = () => (this.deps.game.uniqueCodex && typeof this.deps.game.uniqueCodex === 'object' ? this.deps.game.uniqueCodex : {});
        this.newly = () => (this.deps.game.codexNewlyRegistered && typeof this.deps.game.codexNewlyRegistered === 'object' ? this.deps.game.codexNewlyRegistered : {});
        this.keyOf = entry => `${entry.slots[0]}|${entry.name}`;
        this.encode = key => encodeURIComponent(key).replace(/'/g, '%27');
        this.isChase = entry => !!(entry.ultraRare || entry.cosmosChase);
        this.isFresh = entry => !!(this.newly()[this.keyOf(entry)] && this.codex()[this.keyOf(entry)]);
        this.fill = (have, need) => Math.max(0, Math.min(100, need > 0 ? (have / need) * 100 : 0));
        this.bar = (have, need) => `<i class="codex-bar"><i style="width:${this.fill(have, need).toFixed(1)}%"></i></i>`;
        this.pool = () => this.deps.UNIQUE_DB.filter(entry => (this.deps.game.codexSubtab === 'realm' ? !!entry.realm : !entry.realmCodexOnly));
        this.entryOf = key => this.deps.UNIQUE_DB.find(entry => this.keyOf(entry) === key) || null;
        listenView(this, deps.window, 'project-idle:unique-hunt-changed', () => {
            if (deps.document.getElementById('tab-codex')?.classList.contains('active')) this.render();
        });
    }

    rewardStatHtml(left) {
        if (this.deps.game.codexSubtab === 'realm') return '';
        return `<div class="codex-stat${left ? '' : ' is-done'}"><span>${this.deps._t('완성 보상')}</span><b>${left ? this.deps._t('{left}개 남음', { left }) : this.deps._t('받는 중')}</b><small>${this.deps._t('루프마다 액트 1 고유 하나')}</small></div>`;
    }

    freshHtml(entries) {
        const chips = entries.filter(this.isFresh).map(entry => `<button type="button" class="codex-fresh-chip" data-codex-key="${this.encode(this.keyOf(entry))}">`
            + `<img src="${this.deps.getUniqueEntryVisualAsset(entry)}" alt="">${this.esc(this.deps._t(entry.name))}</button>`).join('');
        return chips ? `<div class="codex-fresh"><span>${this.deps._t('새로 등록')}</span>${chips}</div>` : '';
    }

    summaryHtml(entries) {
        const stored = entries.filter(entry => this.codex()[this.keyOf(entry)]).length, total = entries.length;
        const bonus = this.deps.game.codexSubtab === 'realm' ? ''
            : `<div class="codex-stat"><span>${this.deps._t('도감 보너스')}</span><b>+${this.deps.getCodexBonusPctFromCount(stored).toFixed(1)}%</b><small>${this.deps._t('피해, 생명력, 드랍률')}</small></div>`;
        return `<section class="codex-summary"><div class="codex-stat is-count"><span>${this.deps._t('등록')}</span><b>${stored}<small>/${total}</small></b>${this.bar(stored, total)}</div>`
            + `${bonus}${this.rewardStatHtml(total - stored)}</section>`;
    }

    slotsOf(entries) {
        return this.deps.getCodexSlotOrder().filter(slot => entries.some(entry => entry.slots[0] === slot));
    }

    shownSlot(entries) {
        const slots = this.slotsOf(entries), fresh = slots.find(slot => entries.some(entry => entry.slots[0] === slot && this.isFresh(entry)));
        if (fresh && this.deps.game.codexFocusNewOnOpen) { this.deps.game.codexSelectedSlot = fresh; this.deps.game.codexFocusNewOnOpen = false; }
        if (!slots.includes(this.deps.game.codexSelectedSlot)) this.deps.game.codexSelectedSlot = fresh || slots[0] || this.deps.getCodexSlotOrder()[0];
        return this.deps.game.codexSelectedSlot;
    }

    slotTabHtml(entries, slot, selected) {
        const list = entries.filter(entry => entry.slots[0] === slot), have = list.filter(entry => this.codex()[this.keyOf(entry)]).length;
        const cls = `codex-slot${slot === selected ? ' is-active' : ''}${have === list.length ? ' is-done' : ''}`;
        return `<button type="button" class="${cls}" data-codex-slot="${slot}" aria-pressed="${slot === selected}"><img src="${this.deps.getEquipmentGridVisualAsset({ slot })}" alt="">`
            + `<span>${this.esc(this.deps.getItemSlotDisplayLabel(null, slot))}</span><b>${have}/${list.length}</b>${this.bar(have, list.length)}${list.some(this.isFresh) ? this.deps._t('<em>신규</em>') : ''}</button>`;
    }

    tileHtml(entry) {
        const key = this.keyOf(entry), stored = this.codex()[key], fresh = this.isFresh(entry), tracked = this.deps.uniqueHuntRuntime.ensureState().includes(key);
        const flag = fresh ? '<em class="is-new">신규</em>' : (tracked ? '<em class="is-hunt">추적</em>' : '');
        const cls = ['codex-tile', stored ? 'is-on' : 'is-off', this.isChase(entry) ? 'is-chase' : '', fresh ? 'is-new' : ''].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-codex-key="${this.encode(key)}"><span class="codex-art"><img src="${this.deps.getUniqueEntryVisualAsset(entry)}" alt="" draggable="false"></span>`
            + `<strong>${this.esc(this.deps._t(entry.name))}</strong><small>${this.esc(this.deps.uniqueHuntUi.getSource(entry).label)}</small>${flag}</button>`;
    }

    rangeText(stat) {
        return stat.valMin !== undefined && stat.valMax !== undefined ? ` (${this.deps.formatValue(stat.id, stat.valMin)}~${this.deps.formatValue(stat.id, stat.valMax)})` : '';
    }

    statLines(entry, stored) {
        if (stored && stored.baseName) {
            return (stored.baseStats || []).map(stat => ({ id: stat.id, text: `${stat.statName} ${this.deps.formatSignedValue(stat.id, stat.val)}`, base: true }))
                .concat((stored.stats || []).map(stat => ({ id: stat.id, text: `${stat.statName} +${this.deps.formatValue(stat.id, stat.val)}${this.rangeText(stat)}` })));
        }
        return (entry.stats || []).map(stat => {
            const { min, max } = this.deps.getUniqueStatRollRange(stat);
            return { id: stat.id, text: `${this.deps.getStatName(stat.id)} +${this.deps.formatValue(stat.id, min)}~+${this.deps.formatValue(stat.id, max)}` };
        });
    }

    statsHtml(entry, stored) {
        const effect = (stored && stored.uniqueEffect) || entry.uniqueEffect;
        const lines = this.statLines(entry, stored).map(line => `<li${line.base ? ' class="is-base"' : ''}>${this.deps.statToneText.statLine(line.id, line.text)}</li>`).join('');
        return `${effect ? `<p class="codex-sheet-effect">${this.deps.statToneText.html(effect)}</p>` : ''}<ul class="codex-sheet-lines">${lines}</ul>`;
    }

    actionsHtml(entry) {
        if (entry.realmCodexOnly) return '';
        const key = this.encode(this.keyOf(entry)), tracked = this.deps.uniqueHuntRuntime.ensureState().includes(this.keyOf(entry));
        return `<div class="codex-sheet-actions"><button type="button" data-codex-go="${key}">${this.deps._t('드랍처 보기')}</button>`
            + `<button type="button" class="codex-hunt-button${tracked ? ' is-tracked' : ''}" data-codex-hunt="${key}" aria-pressed="${tracked}">${tracked ? this.deps._t('추적 해제') : this.deps._t('파밍 추적')}</button></div>`;
    }

    sheetHtml(entry) {
        const stored = this.codex()[this.keyOf(entry)];
        const base = stored && stored.baseName ? this.deps._t('{baseName}, 숨겨진 티어 {hiddenTier}', { baseName: this.esc(this.deps._t(stored.baseName)), hiddenTier: this.deps.getTierBadgeHtml(stored.hiddenTier || stored.itemTier || 1, 'T') }) : this.esc(this.deps.getItemSlotDisplayLabel(null, entry.slots[0]));
        const body = stored ? this.statsHtml(entry, stored) : '<p class="codex-sheet-note">획득하면 옵션이 공개됩니다.</p>';
        return `<div class="codex-sheet${stored ? ' is-on' : ''}${this.isChase(entry) ? ' is-chase' : ''}"><div class="codex-sheet-head">`
            + `<span class="codex-art"><img src="${this.deps.getUniqueEntryVisualAsset(entry)}" alt=""></span><div><strong>${this.esc(this.deps._t(entry.name))}</strong><span>${base}</span>`
            + `<em>${stored ? this.deps._t('등록됨') : this.deps._t('미등록')}${this.isChase(entry) ? this.deps._t(', 극희귀') : ''}</em></div></div>`
            + `<p class="codex-sheet-source"><span>${this.deps._t('드랍처')}</span><b>${this.esc(this.deps.uniqueHuntUi.getSource(entry).label)}</b></p>${body}${this.actionsHtml(entry)}</div>`;
    }

    openEntry(key, refresh) {
        if (!this.adoptOwner()) return;
        const entry = this.entryOf(key);
        if (!entry) return;
        const body = this.sheetHtml(entry);
        if (refresh && body === this.lastSheet) return;
        this.dialogKey = key;
        this.lastSheet = body;
        const panel = this.deps.selectionDialog.show({ id: this.DIALOG, title: this.deps._t('고유 아이템'), panelClass: 'codex-sheet-panel', body });
        const overlay = panel && panel.parentElement;
        if (overlay !== this.overlay) {
            releaseViewTarget(this, this.overlay);
            this.overlay = overlay;
            if (overlay) listenView(this, overlay, 'click', this.onSheetClick);
        }
    }

    onSheetClick(event) {
        if (!this.adoptOwner()) { this.render(); return; }
        const go = event.target.closest('[data-codex-go]'), hunt = event.target.closest('[data-codex-hunt]');
        if (go) {
            this.deps.selectionDialog.close(this.DIALOG);
            this.deps.uniqueHuntUi.navigate(go.dataset.codexGo);
        } else if (hunt) {
            this.deps.uniqueHuntUi.toggle(hunt.dataset.codexHunt);
            this.openEntry(this.dialogKey, true);
        }
    }

    syncSubtabs() {
        const tabs = { main: true, realm: this.deps.UNIQUE_DB.some(entry => entry.realm && this.codex()[this.keyOf(entry)]),
            leaves: !!(this.deps.game.atlas && (this.deps.game.atlas.unlocked || this.deps.game.atlas.leaves.seen.length)) };
        if (!tabs[this.deps.game.codexSubtab]) this.deps.game.codexSubtab = 'main';
        const sidebar = this.deps.document.querySelector('#tab-codex .vertical-tab-sidebar');
        if (sidebar) sidebar.hidden = !tabs.realm && !tabs.leaves;
        for (const [tab, open] of Object.entries(tabs)) {
            const button = this.deps.document.getElementById(`btn-codex-${tab}`);
            if (button) Object.assign(button, { hidden: !open }).classList.toggle('active', tab === this.deps.game.codexSubtab);
        }
    }

    showLeaves(head, root) {
        const shown = this.deps.game.codexSubtab === 'leaves', book = this.deps.document.getElementById('ui-leaf-book');
        [head, root, this.deps.document.getElementById('ui-unique-hunt-tracker')].forEach(el => { if (el) el.hidden = shown; });
        if (book) book.hidden = !shown;
        if (shown) this.deps.memoryLeavesUi.render();
        return shown;
    }

    onClick(event) {
        if (!this.adoptOwner()) { this.render(); return; }
        const slot = event.target.closest('[data-codex-slot]'), card = event.target.closest('[data-codex-key]');
        if (slot) { this.deps.game.codexSelectedSlot = slot.dataset.codexSlot; this.render(); } else if (card) this.openEntry(decodeURIComponent(card.dataset.codexKey));
    }

    render() {
        if (!this.active) return;
        this.adoptOwner();
        const head = this.deps.document.getElementById('ui-codex-summary'), root = this.deps.document.getElementById('ui-codex-list');
        if (!head || !root) return;
        this.bindHosts(head, root);
        this.syncSubtabs();
        if (this.showLeaves(head, root)) return;
        this.deps.uniqueHuntUi.renderPanel();
        const entries = this.pool(), selected = this.shownSlot(entries);
        const tiles = entries.filter(entry => entry.slots[0] === selected).map(this.tileHtml).join('');
        const top = this.summaryHtml(entries);
        const html = `${this.freshHtml(entries)}<nav class="codex-slots" aria-label="${this.deps._t('부위')}">${this.slotsOf(entries).map(slot => this.slotTabHtml(entries, slot, selected)).join('')}</nav>`
            + `<div class="codex-grid">${tiles}</div>`;
        if (top !== this.lastTop) { head.innerHTML = top; this.lastTop = top; }
        if (html !== this.lastHtml) { root.innerHTML = html; this.lastHtml = html; }
        if (this.dialogKey && this.deps.selectionDialog.isOpen(this.DIALOG)) this.openEntry(this.dialogKey, true);
    }

    setSubtab(tab) {
        if (!this.active) return;
        this.deps.game.codexSubtab = ['realm', 'leaves'].includes(tab) ? tab : 'main';
        this.render();
    }

    api() { return Object.freeze({ render: this.render, setSubtab: this.setSubtab }); }

    adoptOwner() {
        const owner = this.deps.game;
        if (this.owner === owner && this.codexBook === owner.uniqueCodex && this.loop === owner.loop) return true;
        this.deps.selectionDialog.close(this.DIALOG);
        releaseViewTarget(this, this.overlay);
        this.overlay = null;
        this.dialogKey = null;
        this.lastSheet = this.lastTop = this.lastHtml = '';
        this.owner = owner;
        this.codexBook = owner.uniqueCodex;
        this.loop = owner.loop;
        return false;
    }

    bindHosts(head, root) {
        if (this.hosts[0] === head && this.hosts[1] === root) return;
        for (const host of this.hosts) releaseViewTarget(this, host);
        this.hosts = [head, root];
        this.lastTop = this.lastHtml = '';
        for (const host of this.hosts) listenView(this, host, 'click', this.onClick);
    }

    dispose() {
        releaseViewEvents(this);
        this.deps.selectionDialog.close(this.DIALOG);
        this.hosts = [];
        this.overlay = null;
        this.owner = null;
        this.codexBook = null;
    }
}

export function createUniqueCodexView(deps) {
    const view = new UniqueCodexView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
}

