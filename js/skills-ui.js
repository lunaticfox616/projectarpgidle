// 스킬룬 화면 조립 — js/ui.js의 거대 렌더 함수에서 분리했다.
//
// 왜 분리하는가: performUpdateStaticUI 하나가 2,500줄이라 한 화면을 손대면 무관한
// 화면이 깨졌다(#920, #921). 화면별 렌더러를 자기 파일로 옮겨 그 결합을 끊는다.
// js/records-ui.js와 같은 형태다.
//
// 계약: 이 파일은 화면 갱신이 넘겨준 컨텍스트(pStats·검색 필터)만 받고, 그 외에는
// 기존과 동일하게 전역 도메인 함수를 호출한다. 스킬룬 화면 밖의 DOM은 건드리지 않는다.
(function () {
    'use strict';

    // 스킬 패널 재렌더 메모. 이 화면만 쓰므로 여기서 소유한다
    // (예전에는 ui.js 최상단 전역이라 무엇이 쓰는지 파일을 훑어야 알 수 있었다).
    let lastSkillPanelRenderSignature = '';
    /** Per library: phone page and the filter it was paged for. */
    const libraryPages = { skill: { index: 0, query: '' }, support: { index: 0, query: '' } };
    let sealConfirmationPending = false;
    /** 룬 종류 탭(2026-11-09 사용자: 칸을 눌러야만 룬 목록을 볼 수 있었고 봉인과 해제가 숨어 있었다). 봉인 탭은 봉인한 공격 룬과 보조스킬룬을 모은다. */
    const PICKER_TABS = Object.freeze([
        { kind: 'active', label: '공격|룬 종류', icon: 'sword' },
        { kind: 'mobility', label: '이동|룬 종류', icon: 'boot' },
        { kind: 'summon', label: '소환|룬 종류', icon: 'skull' },
        { kind: 'support', label: '보조|룬 종류', icon: 'gem' },
        { kind: 'sealed', label: '봉인|룬 종류', icon: 'lock' }
    ]);

    /** @param {{title: string, action: string, done: boolean, ready: boolean, details: string, gain?: number}} upgrade
     * @param {number} currentLevel Displayed total gem level, including equipment and passives. */
    function renderGemUpgradeButton(upgrade, currentLevel) {
        let details = upgrade.done ? '최대 단계' : upgrade.details;
        if (!upgrade.done && upgrade.gain) details += _t(', 적용 후 최종 Lv.{value}', { value: currentLevel + upgrade.gain });
        return `<button class="gem-upgrade-btn ${upgrade.done ? 'done' : ''}" onclick="${escapeHTML(upgrade.action)}" ${upgrade.ready && !upgrade.done ? '' : 'disabled'}><strong>${escapeHTML(_t(upgrade.title))}${upgrade.done ? _t(' 완료') : ''}</strong><small>${escapeHTML(details)}</small></button>`;
    }

    /** Gems a phone shows per page (two rows of four tiles). */
    const MOBILE_PAGE_SIZE = 8;

    // Filter the complete library first; only build the visible tiles on phones. The attack library only lists the gems
    // the picked board slot takes (js/skill-gem-board-ui.js: main attack, mobility or summon).
    function renderGemLibrary(kind, owned, sealed, stats, filter) {
        const support = kind === 'support';
        const slotKind = support ? null : skillGemBoardUi.currentKind();
        const fold = support ? game.gemFoldInactiveSupport : game.gemFoldInactiveAttack;
        const definitions = support ? SUPPORT_GEM_DB : SKILL_DB;
        const records = owned.map(name => ({ name, sealed: false }))
            .concat(sealed.map(name => ({ name, sealed: true }))).filter(record => {
                if (slotKind && skillGemBoardUi.kindOf(record.name) !== slotKind) return false;
                const active = !record.sealed && (support ? game.equippedSupports.includes(record.name)
                    : [game.activeSkill, game.mobilitySkill].includes(record.name) || (game.equippedSummonSkills || []).includes(record.name));
                return window.isGemLibraryMatchVisible(window.getGemSearchText(record.name, definitions[record.name] || {}), filter, fold, active);
            });
        const state = libraryPages[kind];
        if (support) return renderSupportLibrary(records, stats, filter);
        const query = JSON.stringify([filter || '', !!fold, slotKind]);
        if (state.query !== query) { state.index = 0; state.query = query; }
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        const count = Math.max(1, Math.ceil(records.length / MOBILE_PAGE_SIZE));
        state.index = Math.min(state.index, count - 1);
        const visible = mobile ? records.slice(state.index * MOBILE_PAGE_SIZE, (state.index + 1) * MOBILE_PAGE_SIZE) : records;
        const cards = visible.map(record => {
            const label = window.highlightSearchText(_t(record.name), filter);
            return record.sealed ? renderSealedRuneTile(record.name, label, false, stats) : withTileSeal(renderAttackGemCard(record.name, label, stats), false, record.name);
        }).join('');
        if (!mobile || records.length <= MOBILE_PAGE_SIZE) return cards;
        return renderLibraryPager(kind, state.index, count, records.length) + cards;
    }

    function renderSupportLibrary(records, stats, filter) {
        const full = game.equippedSupports.length >= Math.floor(stats.suppCap || 0);
        const rows = records.map(record => supportLibraryRow(record, full, stats));
        rows.sort((a, b) => b.targets - a.targets || b.dps - a.dps);
        const card = row => row.sealed ? renderSealedRuneTile(row.name, window.highlightSearchText(_t(row.name), filter), true, stats)
            : withTileSeal(renderSupportGemCard(row.name, window.highlightSearchText(_t(row.name), filter), stats), true, row.name);
        const matched = rows.filter(row => row.targets > 0), unmatched = rows.filter(row => row.targets === 0);
        const banner = full ? '<p class="support-full-banner">보조 칸이 차서 룬을 고르면 바꿀 칸을 고릅니다.</p>' : '';
        return banner + matched.map(card).join('') + (unmatched.length ? `<details class="support-unmatched"><summary>${_t('지금 장착한 스킬에 안 맞음 ({length})', { length: unmatched.length })}</summary><div class="support-library-unmatched">${unmatched.map(card).join('')}</div></details>` : '');
    }

    function supportLibraryRow(record, full, stats) {
        const targets = gemSelectionUi.targetCount(record.name);
        const compare = !full && !record.sealed && !game.equippedSupports.includes(record.name) && targets > 0;
        return { ...record, targets, dps: compare ? supportDpsGain(record.name, stats) : 0 };
    }
    /** 끼우면 늘어나는 DPS(목록의 정렬). 미리보기 하나가 능력치 계산 두 번이라, 지금 DPS와 끼운 룬이 같으면 전에 잰 값을 쓴다: 목록은 처치마다
     * (룬 경험치) 다시 그려진다. */
    const supportDpsGains = new Map();
    function supportDpsGain(name, stats) {
        const key = [name, stats.totalDps, game.activeSkill, game.mobilitySkill, ...game.equippedSupports, '|', ...(game.equippedSummonSkills || [])].join(',');
        if (!supportDpsGains.has(key)) {
            if (supportDpsGains.size > 500) supportDpsGains.clear();
            const preview = gemSelectionUi.preview('support', name);
            supportDpsGains.set(key, preview.after.totalDps - preview.before.totalDps);
        }
        return supportDpsGains.get(key);
    }

    function renderLibraryPager(kind, index, count, total) {
        return '<nav class="gem-library-pager" aria-label="' + (kind === 'support' ? '보조' : '공격') + ' 룬 페이지">'
            + '<button type="button" data-gem-page="' + kind + '" data-step="-1"' + (index === 0 ? ' disabled' : '') + '>이전</button>'
            + '<span aria-live="polite">' + (index + 1) + ' / ' + count + '<small>총 ' + total + '개</small></span>'
            + '<button type="button" data-gem-page="' + kind + '" data-step="1"' + (index === count - 1 ? ' disabled' : '') + '>다음</button></nav>';
    }

    document.addEventListener('click', event => {
        const tab = event.target.closest('[data-picker-kind]');
        if (tab && !tab.disabled) { skillGemBoardUi.pick(tab.dataset.pickerKind); return; }
        const foldButton = event.target.closest('[data-gem-fold]');
        if (foldButton) { toggleGemFoldMode(foldButton.dataset.gemFold); return; }
        const sealButton = event.target.closest('[data-gem-bulk-seal]');
        if (sealButton && !sealButton.disabled) { confirmLibrarySeal(sealButton.dataset.gemBulkSeal); return; }
        const button = event.target.closest('[data-gem-page]');
        if (!button || button.disabled) return;
        libraryPages[button.dataset.gemPage].index += Number(button.dataset.step);
        updateStaticUI();
    });

    /** A tile's seal button and a sealed tile's restore button. Capture phase: the tile under them would open its detail first. */
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-tile-seal], [data-tile-unseal]');
        if (!button || button.disabled) return;
        event.stopPropagation();
        const name = button.dataset.gemName;
        if (button.dataset.tileSeal) {
            if (button.dataset.tileSeal === 'support') sealSupportGem(name);
            else sealSkillGem(name);
            bumpSealedTab();
        } else if (button.dataset.tileUnseal === 'support') unsealSupportGem(name);
        else unsealSkillGem(name);
    }, true);

    /** The 봉인 tab's count jumps once when a rune goes in (the tile leaves the list it was in). */
    function bumpSealedTab() {
        const tab = document.querySelector('#ui-skill-picker-tabs [data-picker-kind="sealed"]');
        if (!tab) return;
        tab.classList.remove('is-bumped');
        void tab.offsetWidth;
        tab.classList.add('is-bumped');
    }

    /** Resonance the sealed runes would give with these names added (봉인 2개당 1). */
    function sealResonanceWith(kind, names) {
        const key = kind === 'support' ? 'sealedSupports' : 'sealedSkills';
        return gemDropRewards.sealResonance({ ...game, [key]: [...(game[key] || []), ...names] });
    }

    async function confirmLibrarySeal(kind) {
        if (sealConfirmationPending) return;
        const names = window.GameModules.skills.sealableNames(kind);
        if (!names.length) return;
        const state = game, season = game.season, label = _t(kind === 'support' ? '보조스킬룬' : '공격 룬');
        const gain = sealResonanceWith(kind, names) - gemDropRewards.sealResonance(game);
        sealConfirmationPending = true;
        try {
            const accepted = await requestGameConfirmation(_t('{label} {length}개를 봉인합니다. 공명력 +{gain}', { label, length: names.length, gain }),
                { title: _t('{label} 일괄 봉인', { label }), confirmLabel: _t('{length}개 봉인', { length: names.length }), cancelLabel: _t('취소') });
            if (!accepted || game !== state || game.season !== season) return;
            if (JSON.stringify(names) !== JSON.stringify(window.GameModules.skills.sealableNames(kind))) {
                showGameToast(_t('룬 목록이 바뀌었습니다. 다시 확인하세요.'), { tone: 'warning' });
                return;
            }
            if (kind === 'support') sealAllInactiveSupportGems();
            else sealAllInactiveSkillGems();
            bumpSealedTab();
        } finally {
            sealConfirmationPending = false;
        }
    }

    function bulkSealButton(kind) {
        const disabled = window.GameModules.skills.sealableNames(kind).length ? '' : 'disabled';
        return `<button type="button" data-gem-bulk-seal="${kind}" ${disabled}>${_t(kind === 'support' ? '보조룬 일괄 봉인' : '공격룬 일괄 봉인')}</button>`;
    }

    /** The search row's buttons after 검색어 리셋 (2026-11-09 사용자: 장착 중 단추와 일괄 봉인을 그 줄에 같은 단추로): the "worn only" toggle,
     * then the bulk seal, which the toggle hides because it lists only worn runes. */
    function renderLibraryActions(kind, fold) {
        const toggle = `<button type="button" data-gem-fold="${kind === 'support' ? 'support' : 'attack'}" aria-pressed="${fold}" class="${fold ? 'active' : ''}">${_t('장착 중')}</button>`;
        return toggle + (fold ? '' : bulkSealButton(kind));
    }

    /** A library tile's own seal button (2026-11-09 사용자: 룬마다 봉인할 길이 없었다). Only where sealing is allowed now: not on a worn
     * rune, 기본 공격, the first-rune guide's rune or during the woodsman fight (getSkillGemSealRefusal). The tile shows the rune tooltip,
     * so the button carries visible words and no data-tip. */
    function withTileSeal(cardHtml, support, name) {
        if (getSkillGemSealRefusal(name, support)) return cardHtml;
        const end = cardHtml.lastIndexOf('</article>');
        const button = `<button type="button" class="gem-tile-seal" data-tile-seal="${support ? 'support' : 'skill'}" data-gem-name="${escapeHTML(name)}" aria-label="${escapeHTML(_t('{name} 봉인', { name: _t(name) }))}">`
            + `${renderPixelIcon('lock', 'gem-tile-seal-icon')}<span>${_t('봉인')}</span></button>`;
        return cardHtml.slice(0, end) + button + cardHtml.slice(end);
    }

    /** A sealed rune: its level, the 해제 button where a tile's 봉인 button sits (2026-11-09 사용자: 같은 자리), dim art under a lock and
     * the name. Under it 공명력 -1 when this restore takes one away (봉인 2개당 1, so every other one does). No button during the woodsman
     * fight, as with 봉인. Hovering shows the rune tooltip. */
    function renderSealedRuneTile(name, label, support, stats) {
        const type = support ? 'support' : 'active';
        const art = support ? supportGemSigil.html(name, 'gem-card-sigil gem-tile-art gem-tile-support-art', 0) : renderSkillGemArt(name, 'gem-card-sigil gem-card-art gem-tile-art');
        const sealedCount = (game.sealedSkills || []).length + (game.sealedSupports || []).length;
        const note = sealedCount % 2 === 0 ? `<small class="gem-usage-state">${_t('공명력 -1')}</small>` : '';
        const button = game.woodsmanBuildLock ? '' : `<button type="button" class="gem-tile-seal is-unseal" data-tile-unseal="${support ? 'support' : 'skill'}" data-gem-name="${escapeHTML(name)}" aria-label="${escapeHTML(_t('{name} 봉인 해제', { name: _t(name) }))}">`
            + `${renderPixelIcon('unlock', 'gem-tile-seal-icon')}<span>${_t('해제')}</span></button>`;
        return `<article class="skill-gem gem-library-card gem-tile sealed-gem-card${support ? ' support-gem' : ''}" data-info-tooltip-anchor="1" onpointerenter="showGemCardHint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()" aria-label="${escapeHTML(_t('{name}, 봉인됨', { name: _t(name) }))}">`
            + `${renderGemTileLevel(getUiGemPresentation(name, support, stats))}${button}<span class="gem-tile-sealed-art">${art}${renderPixelIcon('lock', 'gem-tile-sealed-lock')}</span><strong class="gem-tile-name">${label}</strong>${note}</article>`;
    }

    /** The 봉인 tab: how many runes are sealed, the resonance they give with a two-step meter toward the next point, the two bulk seal
     * buttons (the same search-row buttons the lists use), then the sealed attack and support runes. */
    function renderSealedLibrary(stats) {
        const skills = game.sealedSkills || [], supports = game.sealedSupports || [];
        const total = skills.length + supports.length;
        const pips = [0, 1].map(index => `<i class="${index < total % 2 ? 'is-on' : ''}"></i>`).join('');
        const bulk = bulkSealButton('skill') + (contentProgression.isUnlocked('support') ? bulkSealButton('support') : '');
        const head = `<div class="sealed-library-head">${renderPixelIcon('lock', 'sealed-library-icon')}<div class="sealed-library-sum"><b>${_t('봉인 {total}개', { total })}</b>`
            + `<span class="sealed-library-power"><em>${_t('공명력 +{power}', { power: gemDropRewards.sealResonance(game) })}</em><span class="sealed-library-pips" aria-label="${escapeHTML(_t('다음 공명력까지 {left}개', { left: 2 - total % 2 }))}">${pips}</span></span></div>`
            + `<div class="search-action-row sealed-library-actions">${bulk}</div></div>`;
        const group = (title, names, support) => names.length ? `<section class="sealed-library-group"><h4>${_t(title)}<small>${names.length}</small></h4>`
            + `<div class="sealed-library-grid">${names.map(name => renderSealedRuneTile(name, escapeHTML(_t(name)), support, stats)).join('')}</div></section>` : '';
        const empty = total ? '' : `<p class="sealed-library-empty">${_t('봉인한 룬이 없습니다.')}</p>`;
        return head + empty + group('공격 룬', skills, false) + group('보조스킬룬', supports, true);
    }

    /** One tab per rune list with the count it holds. */
    function renderPickerTabs(current) {
        const counts = { support: (game.supports || []).length, sealed: (game.sealedSkills || []).length + (game.sealedSupports || []).length };
        (game.skills || []).forEach(name => { const kind = skillGemBoardUi.kindOf(name); counts[kind] = (counts[kind] || 0) + 1; });
        const html = PICKER_TABS.filter(tab => tab.kind !== 'support' || contentProgression.isUnlocked('support')).map(tab => {
            const on = tab.kind === current;
            return `<button type="button" role="tab" class="skill-picker-tab is-${tab.kind}${on ? ' is-active' : ''}" aria-selected="${on}" data-picker-kind="${tab.kind}">`
                + `${renderPixelIcon(tab.icon, 'skill-picker-tab-icon')}<span>${_t(tab.label)}</span><b>${counts[tab.kind] || 0}</b></button>`;
        }).join('');
        const nav = document.getElementById('ui-skill-picker-tabs');
        if (nav.dataset.renderSig !== html) { nav.innerHTML = html; nav.dataset.renderSig = html; }
    }

    /** The picker head: the tabs and which list shows (the title is written by skillGemBoardUi). */
    function syncPickerHead(kind, stats) {
        renderPickerTabs(kind);
        document.getElementById('ui-skills-list').hidden = kind === 'support' || kind === 'sealed';
        document.getElementById('ui-support-list').hidden = kind !== 'support';
        const sealedList = document.getElementById('ui-sealed-list');
        sealedList.hidden = kind !== 'sealed';
        const sealedHtml = kind === 'sealed' ? renderSealedLibrary(stats) : '';
        if (sealedList.dataset.renderSig !== sealedHtml) { sealedList.innerHTML = sealedHtml; sealedList.dataset.renderSig = sealedHtml; }
    }

    function renderAttackGemLibrary(stats, filter, fold) {
        const sealed = Array.isArray(game.sealedSkills) ? game.sealedSkills : [];
        const html = renderGemLibrary('skill', game.skills, sealed, stats, filter);
        const actions = renderLibraryActions('skill', fold);
        let list = document.getElementById('ui-skills-list');
        const signature = `${html}::${actions}`;
        if (!list || list.dataset.renderSig === signature) return;
        renderSearchSection('ui-skills-list', 'skill', '공격 룬 이름/태그 검색', html, '', actions);
        list = document.getElementById('ui-skills-list');
        list.dataset.renderSig = signature;
    }

    function renderSkillGemScreen(context) {
        let ctx = context || {};
        let pStats = ctx.pStats || (typeof getPlayerStats === 'function' ? getPlayerStats() : {});
        let sf = ctx.searchFilters || (typeof getSearchFilterState === 'function' ? getSearchFilterState() : {});
        let foldAttackInactive = !!game.gemFoldInactiveAttack;
        let foldSupportInactive = !!game.gemFoldInactiveSupport;
        let pickerKind = skillGemBoardUi.currentKind();
        let effectiveResonanceCap = getEffectiveResonanceCap(pStats);
        let skyTowerSignatureState = (typeof ensureSkyTowerState === 'function') ? ensureSkyTowerState() : null;
        let skillPanelRenderSignature = JSON.stringify({
            libraryPages: libraryPages,
            pickerKind: pickerKind,
            engraving: contentProgression.isUnlocked('engraving'),
            mobileLibrary: uiDisplay.matches('(max-width: 1080px)'),
            activeSkill: game.activeSkill || '', mobilitySkill: game.mobilitySkill,
            buildLocked: !!game.woodsmanBuildLock,
            skills: game.skills || [],
            supports: game.supports || [],
            equippedSupports: game.equippedSupports || [],
            equippedSummonSkills: game.equippedSummonSkills || [],
            summonSkillCounts: game.summonSkillCounts || {},
            sealedSkills: game.sealedSkills || [],
            sealedSupports: game.sealedSupports || [],
            gemData: game.gemData || {},
            supportGemData: game.supportGemData || {},
            skyGemEnhancements: game.skyGemEnhancements || {},
            gemEnhanceTargetSkill: game.gemEnhanceTargetSkill || '',
            runeSpares: game.runeSpares || {},
            currencies: {
                bossCore: game.currencies.bossCore || 0,
                skyEssence: game.currencies.skyEssence || 0,
                awakenedEcho: game.currencies.awakenedEcho || 0,
            },
            skyTower: {
                condensedPower: Math.max(0, Math.floor((skyTowerSignatureState && skyTowerSignatureState.condensedPower) || 0)),
                gemBoosts: (skyTowerSignatureState && skyTowerSignatureState.gemBoosts) || {}
            },
            filters: { skill: sf.skill || '', support: sf.support || '' },
            foldAttackInactive: foldAttackInactive,
            foldSupportInactive: foldSupportInactive,
            suppCap: pStats.suppCap || 0,
            resonanceCap: effectiveResonanceCap,
            gemEnhanceUnlocked: !!game.gemEnhanceUnlocked,
            gemAwakening: contentProgression.isUnlocked('gemAwakening'),
            season: game.season || 1
        });
        if (skillPanelRenderSignature !== lastSkillPanelRenderSignature) {
            lastSkillPanelRenderSignature = skillPanelRenderSignature;
        skillGemBoardUi.render(pStats);
        let sealedSupports = Array.isArray(game.sealedSupports) ? game.sealedSupports : [];
        renderAttackGemLibrary(pStats, sf.skill, foldAttackInactive);

        let supportHtml = renderGemLibrary('support', game.supports, sealedSupports, pStats, sf.support);
        let supportListEl = document.getElementById('ui-support-list');
        let supportActions = renderLibraryActions('support', foldSupportInactive);
        let supportRenderSig = `${supportHtml}::${supportActions}`;
        if (supportListEl && supportListEl.dataset.renderSig !== supportRenderSig) {
            renderSearchSection('ui-support-list', 'support', '보조스킬룬 이름/효과 검색', supportHtml, '', supportActions);
            supportListEl = document.getElementById('ui-support-list');
            supportListEl.dataset.renderSig = supportRenderSig;
        }
        syncPickerHead(pickerKind, pStats);

        let gemEnhanceOpen = !!game.gemEnhanceUnlocked;
        let gemEnhanceHeader = document.getElementById('ui-gem-enhance-header');
        let gemEnhancePanel = document.getElementById('ui-gem-enhance-panel');
        let skillEnhanceBtn = document.getElementById('btn-skill-tab-enhance');
        if (gemEnhanceHeader && gemEnhancePanel) {
            gemEnhanceHeader.style.display = gemEnhanceOpen ? '' : 'none';
            gemEnhancePanel.style.display = gemEnhanceOpen ? '' : 'none';
            if (skillEnhanceBtn) {
                skillEnhanceBtn.disabled = !gemEnhanceOpen;
                skillEnhanceBtn.style.opacity = gemEnhanceOpen ? '1' : '0.45';
                skillEnhanceBtn.dataset.tip = gemEnhanceOpen ? '' : _t('해금 탭에서 룬 강화를 해금하세요.');
            }
            if (!gemEnhanceOpen && game.skillSubtab === 'skill-tab-enhance') game.skillSubtab = 'skill-tab-equip';
            if (gemEnhanceOpen) {
                let active = (typeof getGemEnhanceTargetSkill === 'function') ? getGemEnhanceTargetSkill() : game.activeSkill;
                let equippedEnhanceTargets = typeof getEquippedEnhanceableGemNames === 'function' ? getEquippedEnhanceableGemNames() : [];
                if ((!active || !equippedEnhanceTargets.includes(active)) && equippedEnhanceTargets.length > 0) active = equippedEnhanceTargets[0];
                let targetButtons = equippedEnhanceTargets.map(name => renderGemEnhanceTargetCard(name, name === active, pStats)).join('');
                let isGem = typeof isEnhanceableAttackGem === 'function'
                    ? isEnhanceableAttackGem(active)
                    : !!(SKILL_DB[active] && SKILL_DB[active].isGem);
                let activeSlots = isGem && typeof getSkyEnhancementSlotsForSkill === 'function' ? getSkyEnhancementSlotsForSkill(active) : [null, null, null, null, null];
                let activeEnh = getSkyEnhancementForSkill(active);
                let activeGem = isGem ? normalizeGemRecord((game.gemData || {})[active]) : null;

                let gemAwakening = contentProgression.isUnlocked('gemAwakening');
                let qualityNeed = activeGem ? 1 + Math.floor((activeGem.quality || 0) / 5) : 1;
                let awakenReady = !!(activeGem && !activeGem.awakened && (activeGem.level || 1) >= 20 && gemAwakening);

                let engraveCap = activeGem ? (activeGem.skyEnhanceCap || 1) : 1;
                let selectedSlot = typeof getSelectedGemEngraveSlot === 'function' ? getSelectedGemEngraveSlot() : 0;
                if (selectedSlot >= engraveCap) selectedSlot = Math.max(0, engraveCap - 1);
                game.gemEngraveSelectedSlot = selectedSlot;
                let permanentSkyBoost = isGem && typeof getSkyTowerGemBoostLevel === 'function' ? getSkyTowerGemBoostLevel(active) : 0;
                let permanentSkyCost = isGem && typeof getSkyTowerGemBoostCost === 'function' ? getSkyTowerGemBoostCost(active) : 0;
                let permanentSkyMax = typeof getSkyTowerGemBoostMaxLevel === 'function' ? getSkyTowerGemBoostMaxLevel() : 3;
                let condensedPower = (typeof ensureSkyTowerState === 'function' ? ensureSkyTowerState().condensedPower : 0) || 0;
                let coreDone = !!(activeGem && activeGem.enhanceLevel >= GEM_CORE_FORGE.maxLevel);
                let slotDone = !!(activeGem && engraveCap >= 5);
                let engraveFilled = !!(activeGem && activeEnh.length >= engraveCap);
                let activeDef = SKILL_DB[active] || {};
                let activeMeta = getGemCardMeta(activeDef);
                let activePresentation = isGem ? getUiGemPresentation(active, false, pStats) : null;
                let growthSummary = isGem ? getGemGrowthSummaryHtml(active, activePresentation) : '';
                let activeOptions = activeEnh.map(id => GEM_SKY_ENHANCEMENTS[id] ? GEM_SKY_ENHANCEMENTS[id].name : id).join(', ') || '적용된 각인 없음';
                writeHtmlIfChanged(document.getElementById('ui-gem-enhance-target'), `<div class="gem-target-list">${targetButtons || _t('<span class="gem-process-empty">기본 공격은 강화할 수 없습니다. 공격 룬을 장착하면 여기서 키웁니다.</span>')}</div>` + (isGem
                    ? `<div class="gem-target-profile element-${activeMeta.className}">${renderSkillGemArt(active, 'gem-target-profile-icon', { eager: true })}<div><small class="gem-target-kicker">${_t('현재 선택')}<i>${activeMeta.elementLabel}</i><i>${activeMeta.typeLabel}</i></small><strong>${escapeHTML(active)}</strong><p>${escapeHTML(_t(activeDef.desc) || '')}</p></div></div>${growthSummary}<div class="gem-enhance-status"><span class="gem-status-chip ${coreDone ? 'done' : ''}">${coreDone ? _t('룬 강화 완료') : _t('룬 강화 +{enhanceLevel}', { enhanceLevel: activeGem.enhanceLevel })}</span><span ${contentUnlockUi.lockAttribute('engraving')} class="gem-status-chip gem-engrave-status ${slotDone ? 'done' : ''}">${slotDone ? _t('슬롯 최대') : _t('각인 슬롯 {engraveCap}/5', { engraveCap })}</span><span ${contentUnlockUi.lockAttribute('engraving')} class="gem-status-chip gem-engrave-status ${engraveFilled ? 'done' : ''}">${engraveFilled ? _t('슬롯 사용 완료') : _t('빈 슬롯 {max}', { max: Math.max(0, engraveCap - activeEnh.length) })}</span></div><div ${contentUnlockUi.lockAttribute('engraving')} class="gem-current-inscriptions"><span>${_t('현재 각인')}</span><strong>${escapeHTML(activeOptions)}</strong></div>`
                    : '<div class="gem-process-empty">공격 룬을 선택하면 성장 정보가 표시됩니다.</div>'));
                renderGemResourceStrip(activeGem, condensedPower);
                renderGemEngraveSlots(activeSlots, engraveCap);
                let currentTotalGemLevel = Math.max(1, Math.floor((activePresentation && activePresentation.totalLevel) || 1));
                gemCoreForgeUi.renderSection(isGem ? active : null);
                const upgrades = [


                    { title: _t('응축 창공 영구 강화'), action: 'upgradeActiveGemWithCondensedSkyPower()', done: permanentSkyBoost >= permanentSkyMax, ready: game.skyTower.unlocked && condensedPower >= permanentSkyCost, details: _t('{value}, 보유 {floor} / 필요 {permanentSkyCost}', { value: game.skyTower.unlocked ? _t('루프 초기화 없음') : _t('창공의 탑 해금 필요'), floor: Math.floor(condensedPower), permanentSkyCost }), gain: 1 },
                    { title: _t('룬 퀄리티 강화'), action: 'upgradeActiveGemQuality()', done: activeGem?.quality >= 20, ready: (game.currencies.bossCore || 0) >= qualityNeed, details: _t('군주의 핵 {bossCore}/{qualityNeed}, 피해/속도 배율 +0.5%', { bossCore: game.currencies.bossCore || 0, qualityNeed }) },
                    { title: _t('각성 룬 변환'), action: 'awakenActiveGemCandidate()', done: !!activeGem?.awakened, ready: awakenReady && (game.currencies.awakenedEcho || 0) >= 3, details: _t('{value}기본 Lv.20, 각성 잔향 {awakenedEcho}/3{replace}', { value: gemAwakening ? '' : _t('‘룬 각성’ 해금 필요, '), awakenedEcho: game.currencies.awakenedEcho || 0, replace: getGemAwakenedPerkNote(active).replace(/^ (.*)\.$/, ', $1') }), gain: 2 }
                ];
                writeHtmlIfChanged(document.getElementById('ui-gem-upgrade-actions'), isGem ? upgrades.map(upgrade => renderGemUpgradeButton(upgrade, currentTotalGemLevel)).join('') : '<div class="gem-process-empty">강화할 공격 룬을 먼저 장착하세요.<br><button type="button" onclick="switchSkillSubtab(\'skill-tab-equip\')">공격 룬 장착하기</button></div>');
                // The whole 창공 각인 section hides until 룬 각인 is unlocked (data/content-progression.js sections, contentUnlockUi.sync), so the
                // list needs no loop gate of its own (it read loop 4 after the unlock moved to loop 6).
                writeHtmlIfChanged(document.getElementById('ui-gem-enhance-options'), `<div class="gem-engrave-slot-guide"><strong>${_t('전체 각인')}</strong><span>${_t('누르면 빈 슬롯에 적용되고 다시 누르면 해제됩니다.')}</span></div>` + Object.values(GEM_SKY_ENHANCEMENTS).map(enh => renderSkyEnhancementOption(enh, activeSlots, isGem)).join(''));
            }
        }

        }

    }

    safeExposeGlobals({ renderSkillGemScreen });
}());
