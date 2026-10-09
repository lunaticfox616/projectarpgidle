/** 고유 아이템 도감(기록 창의 도감, 2026-10-09 사용자 "게임 전체에서 부족한 화면" 2순위). 171장이 같은 글 카드였다.
 * 위 줄: 등록 수와 막대, 도감 보너스, 완성 보상과 남은 수, 이번에 새로 등록된 고유. 부위 탭: 부위 그림, 모은 수, 막대.
 * 카드: 고유 그림 칸(미등록은 검은 그림자, 등록은 제 색), 이름, 드랍처. 카드를 누르면 고유 창(옵션, 드랍처 보기, 파밍 추적)이 열린다.
 * 파밍 추적 칸은 js/unique-hunt-ui.js, 등록과 보너스 규칙은 js/passives.js registerUniqueToCodexOnAcquire와 js/loot.js. */
const uniqueCodexUi = (() => {
    const DIALOG = 'unique-codex-dialog';
    let dialogKey = null, lastTop = '', lastHtml = '', lastSheet = '', bound = false;

    const esc = value => escapeHTML(String(value ?? ''));
    const codex = () => (game.uniqueCodex && typeof game.uniqueCodex === 'object' ? game.uniqueCodex : {});
    const newly = () => (game.codexNewlyRegistered && typeof game.codexNewlyRegistered === 'object' ? game.codexNewlyRegistered : {});
    const keyOf = entry => `${entry.slots[0]}|${entry.name}`;
    const encode = key => encodeURIComponent(key).replace(/'/g, '%27');
    const isChase = entry => !!(entry.ultraRare || entry.cosmosChase);
    const isFresh = entry => !!(newly()[keyOf(entry)] && codex()[keyOf(entry)]);
    const fill = (have, need) => Math.max(0, Math.min(100, need > 0 ? (have / need) * 100 : 0));
    const bar = (have, need) => `<i class="codex-bar"><i style="width:${fill(have, need).toFixed(1)}%"></i></i>`;
    const pool = () => UNIQUE_DB.filter(entry => (game.codexSubtab === 'realm' ? !!entry.realm : !entry.realmCodexOnly));
    const entryOf = key => UNIQUE_DB.find(entry => keyOf(entry) === key) || null;

    // ── 위 줄 ─────────────────────────────────────────────────────
    function rewardStatHtml(left) {
        if (game.codexSubtab === 'realm') return '';
        return `<div class="codex-stat${left ? '' : ' is-done'}"><span>완성 보상</span><b>${left ? `${left}개 남음` : '받는 중'}</b><small>루프마다 액트 1 고유 하나</small></div>`;
    }
    function freshHtml(entries) {
        const chips = entries.filter(isFresh).map(entry => `<button type="button" class="codex-fresh-chip" data-codex-key="${encode(keyOf(entry))}">`
            + `<img src="${getUniqueEntryVisualAsset(entry)}" alt="">${esc(entry.name)}</button>`).join('');
        return chips ? `<div class="codex-fresh"><span>새로 등록</span>${chips}</div>` : '';
    }
    function summaryHtml(entries) {
        const stored = entries.filter(entry => codex()[keyOf(entry)]).length, total = entries.length;
        const bonus = game.codexSubtab === 'realm' ? ''
            : `<div class="codex-stat"><span>도감 보너스</span><b>+${getCodexBonusPctFromCount(stored).toFixed(1)}%</b><small>피해, 생명력, 드랍률</small></div>`;
        return `<section class="codex-summary"><div class="codex-stat is-count"><span>등록</span><b>${stored}<small>/${total}</small></b>${bar(stored, total)}</div>`
            + `${bonus}${rewardStatHtml(total - stored)}</section>`;
    }

    // ── 부위 탭과 카드 ─────────────────────────────────────────────
    function slotsOf(entries) {
        return getCodexSlotOrder().filter(slot => entries.some(entry => entry.slots[0] === slot));
    }
    /** The slot on show: the first one with a new unique when the codex opens from its notice, else the last pick. */
    function shownSlot(entries) {
        const slots = slotsOf(entries), fresh = slots.find(slot => entries.some(entry => entry.slots[0] === slot && isFresh(entry)));
        if (fresh && game.codexFocusNewOnOpen) { game.codexSelectedSlot = fresh; game.codexFocusNewOnOpen = false; }
        if (!slots.includes(game.codexSelectedSlot)) game.codexSelectedSlot = fresh || slots[0] || getCodexSlotOrder()[0];
        return game.codexSelectedSlot;
    }
    function slotTabHtml(entries, slot, selected) {
        const list = entries.filter(entry => entry.slots[0] === slot), have = list.filter(entry => codex()[keyOf(entry)]).length;
        const cls = `codex-slot${slot === selected ? ' is-active' : ''}${have === list.length ? ' is-done' : ''}`;
        return `<button type="button" class="${cls}" data-codex-slot="${slot}" aria-pressed="${slot === selected}"><img src="${getEquipmentGridVisualAsset({ slot })}" alt="">`
            + `<span>${slot}</span><b>${have}/${list.length}</b>${bar(have, list.length)}${list.some(isFresh) ? '<em>신규</em>' : ''}</button>`;
    }
    function tileHtml(entry) {
        const key = keyOf(entry), stored = codex()[key], fresh = isFresh(entry), tracked = uniqueHuntRuntime.ensureState().includes(key);
        const flag = fresh ? '<em class="is-new">신규</em>' : (tracked ? '<em class="is-hunt">추적</em>' : '');
        const cls = ['codex-tile', stored ? 'is-on' : 'is-off', isChase(entry) ? 'is-chase' : '', fresh ? 'is-new' : ''].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-codex-key="${encode(key)}"><span class="codex-art"><img src="${getUniqueEntryVisualAsset(entry)}" alt="" draggable="false"></span>`
            + `<strong>${esc(entry.name)}</strong><small>${esc(uniqueHuntUi.getSource(entry).label)}</small>${flag}</button>`;
    }

    // ── 고유 창 ────────────────────────────────────────────────────
    function rangeText(stat) {
        return stat.valMin !== undefined && stat.valMax !== undefined ? ` (${formatValue(stat.id, stat.valMin)}~${formatValue(stat.id, stat.valMax)})` : '';
    }
    /** The stored copy's rolled lines while it is kept, else the definition's ranges (a loop keeps only the record). */
    function statLines(entry, stored) {
        if (stored && stored.baseName) {
            return (stored.baseStats || []).map(stat => ({ id: stat.id, text: `${stat.statName} +${formatValue(stat.id, stat.val)}`, base: true }))
                .concat((stored.stats || []).map(stat => ({ id: stat.id, text: `${stat.statName} +${formatValue(stat.id, stat.val)}${rangeText(stat)}` })));
        }
        return (entry.stats || []).map(stat => {
            const min = Number.isFinite(Number(stat.min)) ? Number(stat.min) : Number(stat.base || 0);
            const max = Number.isFinite(Number(stat.max)) ? Number(stat.max) : min;
            return { id: stat.id, text: `${getStatName(stat.id)} +${formatValue(stat.id, min)}~+${formatValue(stat.id, max)}` };
        });
    }
    function statsHtml(entry, stored) {
        const effect = (stored && stored.uniqueEffect) || entry.uniqueEffect;
        const lines = statLines(entry, stored).map(line => `<li${line.base ? ' class="is-base"' : ''}>${statToneText.statLine(line.id, line.text)}</li>`).join('');
        return `${effect ? `<p class="codex-sheet-effect">${statToneText.html(effect)}</p>` : ''}<ul class="codex-sheet-lines">${lines}</ul>`;
    }
    function actionsHtml(entry) {
        if (entry.realmCodexOnly) return '';
        const key = encode(keyOf(entry)), tracked = uniqueHuntRuntime.ensureState().includes(keyOf(entry));
        return `<div class="codex-sheet-actions"><button type="button" data-codex-go="${key}">드랍처 보기</button>`
            + `<button type="button" class="codex-hunt-button${tracked ? ' is-tracked' : ''}" data-codex-hunt="${key}" aria-pressed="${tracked}">${tracked ? '추적 해제' : '파밍 추적'}</button></div>`;
    }
    function sheetHtml(entry) {
        const stored = codex()[keyOf(entry)];
        const base = stored && stored.baseName ? `${esc(stored.baseName)}, 숨겨진 티어 ${getTierBadgeHtml(stored.hiddenTier || stored.itemTier || 1, 'T')}` : esc(entry.slots[0]);
        const body = stored ? statsHtml(entry, stored) : '<p class="codex-sheet-note">획득하면 옵션이 공개됩니다.</p>';
        return `<div class="codex-sheet${stored ? ' is-on' : ''}${isChase(entry) ? ' is-chase' : ''}"><div class="codex-sheet-head">`
            + `<span class="codex-art"><img src="${getUniqueEntryVisualAsset(entry)}" alt=""></span><div><strong>${esc(entry.name)}</strong><span>${base}</span>`
            + `<em>${stored ? '등록됨' : '미등록'}${isChase(entry) ? ', 극희귀' : ''}</em></div></div>`
            + `<p class="codex-sheet-source"><span>드랍처</span><b>${esc(uniqueHuntUi.getSource(entry).label)}</b></p>${body}${actionsHtml(entry)}</div>`;
    }
    /** Opens the unique's window, or redraws it when refresh is set and its text changed (a render after tracking). */
    function openEntry(key, refresh) {
        const entry = entryOf(key);
        if (!entry) return;
        const body = sheetHtml(entry);
        if (refresh && body === lastSheet) return;
        dialogKey = key;
        lastSheet = body;
        const panel = selectionDialog.show({ id: DIALOG, title: '고유 아이템', panelClass: 'codex-sheet-panel', body });
        const overlay = panel && panel.parentElement;
        if (overlay && !overlay.dataset.codexBound) {
            overlay.dataset.codexBound = '1';
            overlay.addEventListener('click', onSheetClick);
        }
    }
    function onSheetClick(event) {
        const go = event.target.closest('[data-codex-go]'), hunt = event.target.closest('[data-codex-hunt]');
        if (go) {
            selectionDialog.close(DIALOG);
            uniqueHuntUi.navigate(go.dataset.codexGo);
        } else if (hunt) {
            uniqueHuntUi.toggle(hunt.dataset.codexHunt);
            openEntry(dialogKey, true);
        }
    }

    // ── 그리기와 입력 ──────────────────────────────────────────────
    function syncSubtabs() {
        const hasRealm = UNIQUE_DB.some(entry => entry.realm && codex()[keyOf(entry)]);
        game.codexSubtab = game.codexSubtab === 'realm' && hasRealm ? 'realm' : 'main';
        const realmButton = document.getElementById('btn-codex-realm'), sidebar = document.querySelector('#tab-codex .vertical-tab-sidebar');
        if (realmButton) realmButton.hidden = !hasRealm;
        if (sidebar) sidebar.hidden = !hasRealm; // 나무 도감 하나뿐이면 고를 탭이 없다
        ['main', 'realm'].forEach(tab => document.getElementById(`btn-codex-${tab}`)?.classList.toggle('active', tab === game.codexSubtab));
    }
    function onClick(event) {
        const slot = event.target.closest('[data-codex-slot]'), card = event.target.closest('[data-codex-key]');
        if (slot) { game.codexSelectedSlot = slot.dataset.codexSlot; render(); } else if (card) openEntry(decodeURIComponent(card.dataset.codexKey));
    }
    function render() {
        const head = document.getElementById('ui-codex-summary'), root = document.getElementById('ui-codex-list');
        if (!head || !root) return;
        if (!bound) { bound = true; head.addEventListener('click', onClick); root.addEventListener('click', onClick); }
        syncSubtabs();
        uniqueHuntUi.renderPanel();
        const entries = pool(), selected = shownSlot(entries);
        const tiles = entries.filter(entry => entry.slots[0] === selected).map(tileHtml).join('');
        const top = summaryHtml(entries);
        const html = `${freshHtml(entries)}<nav class="codex-slots" aria-label="부위">${slotsOf(entries).map(slot => slotTabHtml(entries, slot, selected)).join('')}</nav>`
            + `<div class="codex-grid">${tiles}</div>`;
        if (top !== lastTop) { head.innerHTML = top; lastTop = top; }
        if (html !== lastHtml) { root.innerHTML = html; lastHtml = html; }
        if (dialogKey && selectionDialog.isOpen(DIALOG)) openEntry(dialogKey, true);
    }
    function setSubtab(tab) {
        game.codexSubtab = tab === 'realm' ? 'realm' : 'main';
        render();
    }
    return Object.freeze({ render, setSubtab });
})();

safeExposeGlobals({ uniqueCodexUi });
