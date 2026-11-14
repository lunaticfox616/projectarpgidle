/** @param {{title: string, action: string, done: boolean, ready: boolean, details: string, gain?: number}} upgrade
* @param {number} currentLevel Displayed total gem level, including equipment and passives. */
export function renderGemUpgradeButton(runtime, upgrade, currentLevel) {
    let details = upgrade.done ? '최대 단계' : upgrade.details;
    if (!upgrade.done && upgrade.gain) details += (0, runtime.deps._t)(', 적용 후 최종 Lv.{value}', { value: currentLevel + upgrade.gain });
    return `<button class="gem-upgrade-btn ${upgrade.done ? 'done' : ''}" onclick="${(0, runtime.deps.escapeHTML)(upgrade.action)}" ${upgrade.ready && !upgrade.done ? '' : 'disabled'}><strong>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(upgrade.title))}${upgrade.done ? (0, runtime.deps._t)(' 완료') : ''}</strong><small>${(0, runtime.deps.escapeHTML)(details)}</small></button>`;
}

export function createRenderGemLibrary(runtime) {
    return function renderGemLibrary(kind, owned, sealed, stats, filter) {
        const support = kind === 'support';
        const slotKind = support ? null : runtime.deps.skillGemBoardUi.currentKind();
        const fold = support ? runtime.deps.game.gemFoldInactiveSupport : runtime.deps.game.gemFoldInactiveAttack;
        const definitions = support ? runtime.deps.SUPPORT_GEM_DB : runtime.deps.SKILL_DB;
        const records = owned.map(name => ({ name, sealed: false }))
            .concat(sealed.map(name => ({ name, sealed: true }))).filter(record => {
            if (slotKind && runtime.deps.skillGemBoardUi.kindOf(record.name) !== slotKind) return false;
            const active = !record.sealed && (support ? runtime.deps.game.equippedSupports.includes(record.name)
                    : [runtime.deps.game.activeSkill, runtime.deps.game.mobilitySkill].includes(record.name) || (runtime.deps.game.equippedSummonSkills || []).includes(record.name));
            return runtime.deps.window.isGemLibraryMatchVisible(runtime.deps.window.getGemSearchText(record.name, definitions[record.name] || {}), filter, fold, active);
        });
        const state = runtime.state.libraryPages[kind];
        if (support) return renderSupportLibrary(runtime, records, stats, filter);
        const query = JSON.stringify([filter || '', !!fold, slotKind]);
        if (state.query !== query) { state.index = 0; state.query = query; }
        const mobile = runtime.deps.uiDisplay.matches('(max-width: 1080px)');
        const count = Math.max(1, Math.ceil(records.length / runtime.state.MOBILE_PAGE_SIZE));
        state.index = Math.min(state.index, count - 1);
        const visible = mobile ? records.slice(state.index * runtime.state.MOBILE_PAGE_SIZE, (state.index + 1) * runtime.state.MOBILE_PAGE_SIZE) : records;
        const cards = visible.map(record => {
            const label = runtime.deps.window.highlightSearchText((0, runtime.deps._t)(record.name), filter);
            return record.sealed ? renderSealedRuneTile(runtime, record.name, label, false, stats) : withTileSeal(runtime, (0, runtime.deps.renderAttackGemCard)(record.name, label, stats), false, record.name);
        }).join('');
        if (!mobile || records.length <= runtime.state.MOBILE_PAGE_SIZE) return cards;
        return renderLibraryPager(runtime, kind, state.index, count, records.length) + cards;
    };
}

export function renderSupportLibrary(runtime, records, stats, filter) {
    const full = runtime.deps.game.equippedSupports.length >= Math.floor(stats.suppCap || 0);
    const rows = records.map(record => supportLibraryRow(runtime, record, full, stats));
    rows.sort((a, b) => b.targets - a.targets || b.dps - a.dps);
    const card = row => row.sealed ? renderSealedRuneTile(runtime, row.name, runtime.deps.window.highlightSearchText((0, runtime.deps._t)(row.name), filter), true, stats)
        : withTileSeal(runtime, (0, runtime.deps.renderSupportGemCard)(row.name, runtime.deps.window.highlightSearchText((0, runtime.deps._t)(row.name), filter), stats), true, row.name);
    const matched = rows.filter(row => row.targets > 0), unmatched = rows.filter(row => row.targets === 0);
    const banner = full ? '<p class="support-full-banner">보조 칸이 차서 룬을 고르면 바꿀 칸을 고릅니다.</p>' : '';
    return banner + matched.map(card).join('') + (unmatched.length ? `<details class="support-unmatched"><summary>${(0, runtime.deps._t)('지금 장착한 스킬에 안 맞음 ({length})', { length: unmatched.length })}</summary><div class="support-library-unmatched">${unmatched.map(card).join('')}</div></details>` : '');
}

export function supportLibraryRow(runtime, record, full, stats) {
    const targets = runtime.deps.gemSelectionUi.targetCount(record.name);
    const compare = !full && !record.sealed && !runtime.deps.game.equippedSupports.includes(record.name) && targets > 0;
    return { ...record, targets, dps: compare ? supportDpsGain(runtime, record.name, stats) : 0 };
}

export function supportDpsGain(runtime, name, stats) {
    const key = [name, stats.totalDps, runtime.deps.game.activeSkill, runtime.deps.game.mobilitySkill, ...runtime.deps.game.equippedSupports, '|', ...(runtime.deps.game.equippedSummonSkills || [])].join(',');
    if (!runtime.state.supportDpsGains.has(key)) {
        if (runtime.state.supportDpsGains.size > 500) runtime.state.supportDpsGains.clear();
        const preview = runtime.deps.gemSelectionUi.preview('support', name);
        runtime.state.supportDpsGains.set(key, preview.after.totalDps - preview.before.totalDps);
    }
    return runtime.state.supportDpsGains.get(key);
}

export function renderLibraryPager(runtime, kind, index, count, total) {
    return '<nav class="gem-library-pager" aria-label="' + (kind === 'support' ? '보조' : '공격') + ' 룬 페이지">'
        + '<button type="button" data-gem-page="' + kind + '" data-step="-1"' + (index === 0 ? ' disabled' : '') + '>이전</button>'
        + '<span aria-live="polite">' + (index + 1) + ' / ' + count + '<small>총 ' + total + '개</small></span>'
        + '<button type="button" data-gem-page="' + kind + '" data-step="1"' + (index === count - 1 ? ' disabled' : '') + '>다음</button></nav>';
}

/** The 봉인 tab's count jumps once when a rune goes in (the tile leaves the list it was in). */
export function bumpSealedTab(runtime) {
    const tab = runtime.deps.document.querySelector('#ui-skill-picker-tabs [data-picker-kind="sealed"]');
    if (!tab) return;
    tab.classList.remove('is-bumped');
    void tab.offsetWidth;
    tab.classList.add('is-bumped');
}

/** Resonance the sealed runes would give with these names added (봉인 2개당 1). */
export function sealResonanceWith(runtime, kind, names) {
    const key = kind === 'support' ? 'sealedSupports' : 'sealedSkills';
    return runtime.deps.gemDropRewards.sealResonance({ ...runtime.deps.game, [key]: [...(runtime.deps.game[key] || []), ...names] });
}

export async function confirmLibrarySeal(runtime, kind) {
    if (runtime.state.sealConfirmationPending) return;
    const names = runtime.deps.window.GameModules.skills.sealableNames(kind);
    if (!names.length) return;
    const state = runtime.deps.game, season = runtime.deps.game.season, label = (0, runtime.deps._t)(kind === 'support' ? '보조스킬룬' : '공격 룬');
    const gain = sealResonanceWith(runtime, kind, names) - runtime.deps.gemDropRewards.sealResonance(runtime.deps.game);
    runtime.state.sealConfirmationPending = true;
    try {
        const accepted = await (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('{label} {length}개를 봉인합니다. 공명력 +{gain}', { label, length: names.length, gain }),
            { title: (0, runtime.deps._t)('{label} 일괄 봉인', { label }), confirmLabel: (0, runtime.deps._t)('{length}개 봉인', { length: names.length }), cancelLabel: (0, runtime.deps._t)('취소') });
        if (!runtime.active || !accepted || runtime.deps.game !== state || runtime.deps.game.season !== season) return;
        if (JSON.stringify(names) !== JSON.stringify(runtime.deps.window.GameModules.skills.sealableNames(kind))) {
            (0, runtime.deps.showGameToast)((0, runtime.deps._t)('룬 목록이 바뀌었습니다. 다시 확인하세요.'), { tone: 'warning' });
            return;
        }
        if (kind === 'support') (0, runtime.deps.sealAllInactiveSupportGems)();
        else (0, runtime.deps.sealAllInactiveSkillGems)();
        bumpSealedTab(runtime);
    } finally {
        runtime.state.sealConfirmationPending = false;
    }
}

export function bulkSealButton(runtime, kind) {
    const disabled = runtime.deps.window.GameModules.skills.sealableNames(kind).length ? '' : 'disabled';
    return `<button type="button" data-gem-bulk-seal="${kind}" ${disabled}>${(0, runtime.deps._t)(kind === 'support' ? '보조룬 일괄 봉인' : '공격룬 일괄 봉인')}</button>`;
}

/** The search row's buttons after 검색어 리셋 (2026-11-09 사용자: 장착 중 단추와 일괄 봉인을 그 줄에 같은 단추로): the "worn only" toggle,
* then the bulk seal, which the toggle hides because it lists only worn runes. */
export function renderLibraryActions(runtime, kind, fold) {
    const toggle = `<button type="button" data-gem-fold="${kind === 'support' ? 'support' : 'attack'}" aria-pressed="${fold}" class="${fold ? 'active' : ''}">${(0, runtime.deps._t)('장착 중')}</button>`;
    return toggle + (fold ? '' : bulkSealButton(runtime, kind));
}

/** A library tile's own seal button (2026-11-09 사용자: 룬마다 봉인할 길이 없었다). Only where sealing is allowed now: not on a worn
* rune, 기본 공격, the first-rune guide's rune or during the woodsman fight (getSkillGemSealRefusal). The tile shows the rune tooltip,
* so the button carries visible words and no data-tip. */
export function withTileSeal(runtime, cardHtml, support, name) {
    if ((0, runtime.deps.getSkillGemSealRefusal)(name, support)) return cardHtml;
    const end = cardHtml.lastIndexOf('</article>');
    const button = `<button type="button" class="gem-tile-seal" data-tile-seal="${support ? 'support' : 'skill'}" data-gem-name="${(0, runtime.deps.escapeHTML)(name)}" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)('{name} 봉인', { name: (0, runtime.deps._t)(name) }))}">`
        + `${(0, runtime.deps.renderPixelIcon)('lock', 'gem-tile-seal-icon')}<span>${(0, runtime.deps._t)('봉인')}</span></button>`;
    return cardHtml.slice(0, end) + button + cardHtml.slice(end);
}

/** A sealed rune: its level, the 해제 button where a tile's 봉인 button sits (2026-11-09 사용자: 같은 자리), dim art under a lock and
* the name. Under it 공명력 -1 when this restore takes one away (봉인 2개당 1, so every other one does). No button during the woodsman
* fight, as with 봉인. Hovering shows the rune tooltip. */
export function renderSealedRuneTile(runtime, name, label, support, stats) {
    const type = support ? 'support' : 'active';
    const art = support ? runtime.deps.supportGemSigil.html(name, 'gem-card-sigil gem-tile-art gem-tile-support-art', 0) : (0, runtime.deps.renderSkillGemArt)(name, 'gem-card-sigil gem-card-art gem-tile-art');
    const sealedCount = (runtime.deps.game.sealedSkills || []).length + (runtime.deps.game.sealedSupports || []).length;
    const note = sealedCount % 2 === 0 ? `<small class="gem-usage-state">${(0, runtime.deps._t)('공명력 -1')}</small>` : '';
    const button = runtime.deps.game.woodsmanBuildLock ? '' : `<button type="button" class="gem-tile-seal is-unseal" data-tile-unseal="${support ? 'support' : 'skill'}" data-gem-name="${(0, runtime.deps.escapeHTML)(name)}" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)('{name} 봉인 해제', { name: (0, runtime.deps._t)(name) }))}">`
        + `${(0, runtime.deps.renderPixelIcon)('unlock', 'gem-tile-seal-icon')}<span>${(0, runtime.deps._t)('해제')}</span></button>`;
    return `<article class="skill-gem gem-library-card gem-tile sealed-gem-card${support ? ' support-gem' : ''}" data-info-tooltip-anchor="1" onpointerenter="showGemCardHint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)('{name}, 봉인됨', { name: (0, runtime.deps._t)(name) }))}">`
        + `${(0, runtime.deps.renderGemTileLevel)((0, runtime.deps.getUiGemPresentation)(name, support, stats))}${button}<span class="gem-tile-sealed-art">${art}${(0, runtime.deps.renderPixelIcon)('lock', 'gem-tile-sealed-lock')}</span><strong class="gem-tile-name">${label}</strong>${note}</article>`;
}

/** The 봉인 tab: how many runes are sealed, the resonance they give with a two-step meter toward the next point, the two bulk seal
* buttons (the same search-row buttons the lists use), then the sealed attack and support runes. */
export function renderSealedLibrary(runtime, stats) {
    const skills = runtime.deps.game.sealedSkills || [], supports = runtime.deps.game.sealedSupports || [];
    const total = skills.length + supports.length;
    const pips = [0, 1].map(index => `<i class="${index < total % 2 ? 'is-on' : ''}"></i>`).join('');
    const bulk = bulkSealButton(runtime, 'skill') + (runtime.deps.contentProgression.isUnlocked('support') ? bulkSealButton(runtime, 'support') : '');
    const head = `<div class="sealed-library-head">${(0, runtime.deps.renderPixelIcon)('lock', 'sealed-library-icon')}<div class="sealed-library-sum"><b>${(0, runtime.deps._t)('봉인 {total}개', { total })}</b>`
        + `<span class="sealed-library-power"><em>${(0, runtime.deps._t)('공명력 +{power}', { power: runtime.deps.gemDropRewards.sealResonance(runtime.deps.game) })}</em><span class="sealed-library-pips" aria-label="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)('다음 공명력까지 {left}개', { left: 2 - total % 2 }))}">${pips}</span></span></div>`
        + `<div class="search-action-row sealed-library-actions">${bulk}</div></div>`;
    const group = (title, names, support) => names.length ? `<section class="sealed-library-group"><h4>${(0, runtime.deps._t)(title)}<small>${names.length}</small></h4>`
        + `<div class="sealed-library-grid">${names.map(name => renderSealedRuneTile(runtime, name, (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name)), support, stats)).join('')}</div></section>` : '';
    const empty = total ? '' : `<p class="sealed-library-empty">${(0, runtime.deps._t)('봉인한 룬이 없습니다.')}</p>`;
    return head + empty + group('공격 룬', skills, false) + group('보조스킬룬', supports, true);
}

/** One tab per rune list with the count it holds. */
export function renderPickerTabs(runtime, current) {
    const counts = { support: (runtime.deps.game.supports || []).length, sealed: (runtime.deps.game.sealedSkills || []).length + (runtime.deps.game.sealedSupports || []).length };
    (runtime.deps.game.skills || []).forEach(name => { const kind = runtime.deps.skillGemBoardUi.kindOf(name); counts[kind] = (counts[kind] || 0) + 1; });
    const html = runtime.state.PICKER_TABS.filter(tab => tab.kind !== 'support' || runtime.deps.contentProgression.isUnlocked('support')).map(tab => {
        const on = tab.kind === current;
        return `<button type="button" role="tab" class="skill-picker-tab is-${tab.kind}${on ? ' is-active' : ''}" aria-selected="${on}" data-picker-kind="${tab.kind}">`
            + `${(0, runtime.deps.renderPixelIcon)(tab.icon, 'skill-picker-tab-icon')}<span>${(0, runtime.deps._t)(tab.label)}</span><b>${counts[tab.kind] || 0}</b></button>`;
    }).join('');
    const nav = runtime.deps.document.getElementById('ui-skill-picker-tabs');
    if (nav.dataset.renderSig !== html) { nav.innerHTML = html; nav.dataset.renderSig = html; }
}

/** The picker head: the tabs and which list shows (the title is written by skillGemBoardUi). */
export function syncPickerHead(runtime, kind, stats) {
    renderPickerTabs(runtime, kind);
    runtime.deps.document.getElementById('ui-skills-list').hidden = kind === 'support' || kind === 'sealed';
    runtime.deps.document.getElementById('ui-support-list').hidden = kind !== 'support';
    const sealedList = runtime.deps.document.getElementById('ui-sealed-list');
    sealedList.hidden = kind !== 'sealed';
    const sealedHtml = kind === 'sealed' ? renderSealedLibrary(runtime, stats) : '';
    if (sealedList.dataset.renderSig !== sealedHtml) { sealedList.innerHTML = sealedHtml; sealedList.dataset.renderSig = sealedHtml; }
}

export function renderAttackGemLibrary(runtime, stats, filter, fold) {
    const sealed = Array.isArray(runtime.deps.game.sealedSkills) ? runtime.deps.game.sealedSkills : [];
    const html = runtime.handlers.renderGemLibrary('skill', runtime.deps.game.skills, sealed, stats, filter);
    const actions = renderLibraryActions(runtime, 'skill', fold);
    let list = runtime.deps.document.getElementById('ui-skills-list');
    const signature = `${html}::${actions}`;
    if (!list || list.dataset.renderSig === signature) return;
    (0, runtime.deps.renderSearchSection)('ui-skills-list', 'skill', '공격 룬 이름/태그 검색', html, '', actions);
    list = runtime.deps.document.getElementById('ui-skills-list');
    list.dataset.renderSig = signature;
}
