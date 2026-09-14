// 스킬 젬 화면 조립 — js/ui.js의 거대 렌더 함수에서 분리했다.
//
// 왜 분리하는가: performUpdateStaticUI 하나가 2,500줄이라 한 화면을 손대면 무관한
// 화면이 깨졌다(#920, #921). 화면별 렌더러를 자기 파일로 옮겨 그 결합을 끊는다.
// js/records-ui.js와 같은 형태다.
//
// 계약: 이 파일은 화면 갱신이 넘겨준 컨텍스트(pStats·검색 필터)만 받고, 그 외에는
// 기존과 동일하게 전역 도메인 함수를 호출한다. 스킬 젬 화면 밖의 DOM은 건드리지 않는다.
(function () {
    'use strict';

    // 스킬 패널 재렌더 메모. 이 화면만 쓰므로 여기서 소유한다
    // (예전에는 ui.js 최상단 전역이라 무엇이 쓰는지 파일을 훑어야 알 수 있었다).
    let lastSkillPanelRenderSignature = '';
    const libraryPages = { skill: { index: 0, query: '' }, support: { index: 0, query: '' } };

    /** @param {{title: string, action: string, done: boolean, ready: boolean, details: string, gain?: number}} upgrade
     * @param {number} currentLevel Displayed total gem level, including equipment and passives. */
    function renderGemUpgradeButton(upgrade, currentLevel) {
        let details = upgrade.done ? '최대 단계' : upgrade.details;
        if (!upgrade.done && upgrade.gain) details += ` · 적용 후 최종 Lv.${currentLevel + upgrade.gain}`;
        return `<button class="gem-upgrade-btn ${upgrade.done ? 'done' : ''}" onclick="${escapeHTML(upgrade.action)}" ${upgrade.ready && !upgrade.done ? '' : 'disabled'}><strong>${escapeHTML(upgrade.title)}${upgrade.done ? ' 완료' : ''}</strong><small>${escapeHTML(details)}</small></button>`;
    }

    function syncMobileLibraryNavigation(kind) {
        const panel = document.getElementById('skill-tab-equip');
        const navigation = panel.querySelector('.skill-mobile-library-navigation');
        const supportOpen = contentProgression.isUnlocked('support');
        navigation.hidden = !supportOpen;
        const selected = supportOpen ? (kind || panel.dataset.mobileLibrary) : 'skill';
        panel.dataset.mobileLibrary = selected;
        navigation.querySelectorAll('button').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.mobileGemLibrary === selected));
        });
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-mobile-gem-library]');
        if (button) syncMobileLibraryNavigation(button.dataset.mobileGemLibrary);
    });

    // Filter the complete library first; only build the visible cards on phones.
    function renderGemLibrary(kind, owned, sealed, stats, filter) {
        const support = kind === 'support';
        const fold = support ? game.gemFoldInactiveSupport : game.gemFoldInactiveAttack;
        const definitions = support ? SUPPORT_GEM_DB : SKILL_DB;
        const records = owned.map(name => ({ name, sealed: false }))
            .concat(sealed.map(name => ({ name, sealed: true }))).filter(record => {
                const active = !record.sealed && (support ? game.equippedSupports.includes(record.name)
                    : record.name === game.activeSkill || (game.equippedSummonSkills || []).includes(record.name));
                return window.isGemLibraryMatchVisible(window.getGemSearchText(record.name, definitions[record.name] || {}), filter, fold, active);
            });
        const state = libraryPages[kind];
        const query = JSON.stringify([filter || '', !!fold]);
        if (state.query !== query) { state.index = 0; state.query = query; }
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        const count = Math.max(1, Math.ceil(records.length / 6));
        state.index = Math.min(state.index, count - 1);
        const visible = mobile ? records.slice(state.index * 6, (state.index + 1) * 6) : records;
        const cards = visible.map(record => {
            const label = window.highlightSearchText(record.name, filter);
            if (record.sealed) return renderSealedGemCard(record.name, label, support);
            return support ? renderSupportGemCard(record.name, label, stats) : renderAttackGemCard(record.name, label, stats);
        }).join('');
        if (!mobile || records.length <= 6) return cards;
        return renderLibraryPager(kind, state.index, count, records.length) + cards;
    }

    function renderLibraryPager(kind, index, count, total) {
        return '<nav class="gem-library-pager" aria-label="' + (kind === 'support' ? '보조' : '공격') + ' 젬 페이지">'
            + '<button type="button" data-gem-page="' + kind + '" data-step="-1"' + (index === 0 ? ' disabled' : '') + '>이전</button>'
            + '<span aria-live="polite">' + (index + 1) + ' / ' + count + '<small>총 ' + total + '개</small></span>'
            + '<button type="button" data-gem-page="' + kind + '" data-step="1"' + (index === count - 1 ? ' disabled' : '') + '>다음</button></nav>';
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-gem-page]');
        if (!button || button.disabled) return;
        libraryPages[button.dataset.gemPage].index += Number(button.dataset.step);
        updateStaticUI();
    });

    function renderGemResearchCandidate(kind, name, cost, availableFragments) {
        let isSupport = kind === 'support';
        let def = isSupport ? (SUPPORT_GEM_DB[name] || {}) : (SKILL_DB[name] || {});
        let meta = getGemCardMeta(def);
        let encodedName = encodeURIComponent(name);
        let affordable = availableFragments >= cost;
        let rangeText = !isSupport && typeof describeSkillGridProfile === 'function' ? describeSkillGridProfile(name, def) : '';
        let tags = renderGemTagChips(def, 3);
        if (!tags && isSupport) {
            tags = `<span class="gem-tag gem-tag--support">${escapeHTML(def.name || getStatName(def.stat || '') || '보조 효과')}</span>`;
        }
        let art = isSupport ? '<span>보조</span>' : renderSkillGemArt(name, 'gem-research-card-art');
        return `<article class="gem-research-card element-${meta.className}" aria-label="${escapeHTML(name)}">
            <div class="gem-research-card-head">${art}<div><small>${isSupport ? '보조 젬' : `${meta.elementLabel} · ${meta.typeLabel}`}</small><strong>${escapeHTML(name)}</strong></div></div>
            <p>${escapeHTML(def.desc || '연구를 완료하면 보유 젬 목록에 추가됩니다.')}</p>
            ${rangeText ? `<div class="gem-card-range">${escapeHTML(rangeText)}</div>` : ''}
            <div class="gem-card-tags">${tags}</div>
            <button type="button" onclick="researchMissingGem('${kind}', decodeURIComponent('${encodedName}'))" ${affordable ? '' : 'disabled'}>
                ${affordable ? `확정 연구 · 잔향 ${cost}` : `잔향 부족 · ${availableFragments}/${cost}`}
            </button>
        </article>`;
    }
    function renderGemResearchSection(kind, collection, options) {
        const {query, cost, fragments, defaultOpen} = options;
        const data = collection[kind];
        const definitions = kind === 'support' ? SUPPORT_GEM_DB : SKILL_DB;
        const matches = data.missing.filter(name => matchSearchQuery(window.getGemSearchText(name, definitions[name]), query));
        if (query && !matches.length) return '';
        const saved = game.gemResearchExpanded[kind];
        const open = query ? true : (typeof saved === 'boolean' ? saved : defaultOpen);
        const label = kind === 'support' ? '보조' : '공격';
        const cards = matches.map(name => renderGemResearchCandidate(kind, name, cost, fragments)).join('');
        return `<details data-gem-research-section="${kind}" ${open ? 'open' : ''}><summary>미보유 ${label} 젬 <b>${matches.length}</b></summary><div class="gem-research-grid">${cards || '<div class="gem-process-empty">수집 완료</div>'}</div></details>`;
    }
    function bindGemResearchSections(root, query) {
        root.querySelectorAll('details[data-gem-research-section]').forEach(details => {
            if (details.dataset.bound) return;
            details.dataset.bound = 'true';
            details.addEventListener('toggle', () => {
                if (query) return;
                game.gemResearchExpanded[details.dataset.gemResearchSection] = details.open;
                queueImportantSave(500);
            });
        });
    }
    function renderGemResearchPanel() {
        const root = document.getElementById('ui-gem-research-panel');
        if (!root) return;
        const state = getGemResearchCollectionState();
        const fragments = Math.max(0, Math.floor(game.currencies.gemShard || 0));
        const query = getSearchFilterState().gemResearch.trim();
        const attackCost = getGemResearchCost('attack'), supportCost = getGemResearchCost('support');
        if (!root.querySelector('#ui-gem-research-results')) {
            root.innerHTML = '<div class="gem-research-summary"></div><div id="ui-gem-research-results"></div>';
        }
        root.querySelector('.gem-research-summary').innerHTML = `<div><h3>젬 연구</h3><p>젬 잔향으로 원하는 미보유 젬을 획득합니다.</p></div>
            <div class="gem-research-resource"><span>젬 잔향</span><strong>${fragments}</strong><small>공격 ${attackCost} · 보조 ${supportCost}</small></div>
            <div class="gem-research-progress"><span>공격 <b>${state.attack.owned}/${state.attack.total}</b></span><span>보조 <b>${state.support.owned}/${state.support.total}</b></span></div>`;
        const sections = renderGemResearchSection('attack', state, {query, cost: attackCost, fragments, defaultOpen: fragments >= attackCost})
            + renderGemResearchSection('support', state, {query, cost: supportCost, fragments, defaultOpen: fragments >= supportCost && !state.attack.missing.length});
        const allComplete = !state.attack.missing.length && !state.support.missing.length;
        const rows = allComplete ? '<div class="gem-research-complete">모든 젬 연구 완료</div>' : (sections ? `<div class="gem-research-columns">${sections}</div>` : '');
        renderSearchSection('ui-gem-research-results', 'gemResearch', '젬 이름·효과·태그 검색', rows, '<div class="gem-process-empty">검색 결과가 없습니다.</div>', '');
        bindGemResearchSections(root, query);
    }
    function renderSkillGemScreen(context) {
        syncMobileLibraryNavigation();
        let ctx = context || {};
        let pStats = ctx.pStats || (typeof getPlayerStats === 'function' ? getPlayerStats() : {});
        let sf = ctx.searchFilters || (typeof getSearchFilterState === 'function' ? getSearchFilterState() : {});
        let foldAttackInactive = !!game.gemFoldInactiveAttack;
        let foldSupportInactive = !!game.gemFoldInactiveSupport;
        let foldActiveBtn = document.getElementById('btn-skill-fold-active');
        let foldAttackBtn = document.getElementById('btn-skill-fold-inactive-attack');
        let foldSupportBtn = document.getElementById('btn-skill-fold-inactive-support');
        if (foldActiveBtn) foldActiveBtn.classList.toggle('active', !foldAttackInactive && !foldSupportInactive);
        if (foldAttackBtn) foldAttackBtn.classList.toggle('active', foldAttackInactive);
        if (foldSupportBtn) foldSupportBtn.classList.toggle('active', foldSupportInactive);
        let effectiveResonanceCap = getEffectiveResonanceCap(pStats);
        renderSkillLoadoutSummary(pStats, effectiveResonanceCap);
        let skyTowerSignatureState = (typeof ensureSkyTowerState === 'function') ? ensureSkyTowerState() : null;
        let skillPanelRenderSignature = JSON.stringify({
            libraryPages: libraryPages,
            mobileLibrary: uiDisplay.matches('(max-width: 1080px)'),
            activeSkill: game.activeSkill || '',
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
            currencies: {
                bossCore: game.currencies.bossCore || 0,
                skyEssence: game.currencies.skyEssence || 0,
                awakenedEcho: game.currencies.awakenedEcho || 0,
                gemShard: game.currencies.gemShard || 0
            },
            skyTower: {
                condensedPower: Math.max(0, Math.floor((skyTowerSignatureState && skyTowerSignatureState.condensedPower) || 0)),
                gemBoosts: (skyTowerSignatureState && skyTowerSignatureState.gemBoosts) || {}
            },
            filters: { skill: sf.skill || '', support: sf.support || '', gemResearch: sf.gemResearch || '' },
            foldAttackInactive: foldAttackInactive,
            foldSupportInactive: foldSupportInactive,
            suppCap: pStats.suppCap || 0,
            resonanceCap: effectiveResonanceCap,
            gemEnhanceUnlocked: !!game.gemEnhanceUnlocked,
            gemEngraverLevel: typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('gemEngraver') || 1)) : 1,
            inscriptionCostReduction: typeof getExpertCombinedCostReduction === 'function' ? getExpertCombinedCostReduction('inscriptionCostReducePct') : 0,
            gemQualityCostReduction: typeof getExpertCombinedCostReduction === 'function' ? getExpertCombinedCostReduction('gemQualityCostReducePct') : 0,
            season: game.season || 1
        });
        if (skillPanelRenderSignature !== lastSkillPanelRenderSignature) {
            lastSkillPanelRenderSignature = skillPanelRenderSignature;
        renderGemResearchPanel();
        let resonancePower = effectiveResonanceCap;
        let sealedSkills = Array.isArray(game.sealedSkills) ? game.sealedSkills : [];
        let sealedSupports = Array.isArray(game.sealedSupports) ? game.sealedSupports : [];
        let skillsHtml = renderGemLibrary('skill', game.skills, sealedSkills, pStats, sf.skill);
        let skillsListEl = document.getElementById('ui-skills-list');
        let skillActions = foldAttackInactive ? '' : '<button onclick="sealAllInactiveSkillGems()">미사용 공격 젬 일괄 봉인</button>';
        let skillsRenderSig = `${skillsHtml}::${skillActions}`;
        if (skillsListEl && skillsListEl.dataset.renderSig !== skillsRenderSig) {
            renderSearchSection('ui-skills-list', 'skill', '공격 젬 이름·태그 검색', skillsHtml, '', skillActions);
            skillsListEl = document.getElementById('ui-skills-list');
            skillsListEl.dataset.renderSig = skillsRenderSig;
        }

        let suppCountEl = document.getElementById('ui-supp-count');
        let suppMaxEl = document.getElementById('ui-supp-max');
        let suppResonanceEl = document.getElementById('ui-resonance');
        if (suppCountEl) suppCountEl.innerText = game.equippedSupports.length;
        if (suppMaxEl) suppMaxEl.innerText = pStats.suppCap;
        if (suppResonanceEl) {
            let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
            suppResonanceEl.innerText = `${Math.max(0, getEffectiveResonanceCap(pStats) - used)}`;
        }
        let supportHtml = renderGemLibrary('support', game.supports, sealedSupports, pStats, sf.support);
        let supportListEl = document.getElementById('ui-support-list');
        let supportActions = foldSupportInactive ? '' : '<button onclick="sealAllInactiveSupportGems()">미사용 보조 젬 일괄 봉인</button>';
        let supportRenderSig = `${supportHtml}::${supportActions}`;
        if (supportListEl && supportListEl.dataset.renderSig !== supportRenderSig) {
            renderSearchSection('ui-support-list', 'support', '보조 젬 이름·효과 검색', supportHtml, '', supportActions);
            supportListEl = document.getElementById('ui-support-list');
            supportListEl.dataset.renderSig = supportRenderSig;
        }

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
                skillEnhanceBtn.title = gemEnhanceOpen ? '' : '해금 탭에서 젬 강화를 해금하세요.';
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
                let bossNeed = activeGem ? ((activeGem.bossCoreLevel || 0) + 1) : 1;
                let gemExpertLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('gemEngraver') || 1)) : 1;
                let qualityDiscount = typeof getExpertCombinedCostReduction === 'function' ? getExpertCombinedCostReduction('gemQualityCostReducePct') : 0;
                let qualityNeed = activeGem ? Math.max(1, Math.floor((1 + Math.floor((activeGem.quality || 0) / 5)) * (1 - qualityDiscount))) : 1;
                let awakenReady = !!(activeGem && !activeGem.awakened && (activeGem.level || 1) >= 20 && gemExpertLv >= 15);
                let skyNeed = activeGem ? ((activeGem.skyCoreLevel || 0) + 1) : 1;
                let engraveCap = activeGem ? (activeGem.skyEnhanceCap || 1) : 1;
                let selectedSlot = typeof getSelectedGemEngraveSlot === 'function' ? getSelectedGemEngraveSlot() : 0;
                if (selectedSlot >= engraveCap) selectedSlot = Math.max(0, engraveCap - 1);
                game.gemEngraveSelectedSlot = selectedSlot;
                let permanentSkyBoost = isGem && typeof getSkyTowerGemBoostLevel === 'function' ? getSkyTowerGemBoostLevel(active) : 0;
                let permanentSkyCost = isGem && typeof getSkyTowerGemBoostCost === 'function' ? getSkyTowerGemBoostCost(active) : 0;
                let permanentSkyMax = typeof getSkyTowerGemBoostMaxLevel === 'function' ? getSkyTowerGemBoostMaxLevel() : 3;
                let condensedPower = (typeof ensureSkyTowerState === 'function' ? ensureSkyTowerState().condensedPower : 0) || 0;
                let coreDone = !!(activeGem && activeGem.bossCoreLevel >= 5 && activeGem.skyCoreLevel >= 5);
                let slotDone = !!(activeGem && engraveCap >= 5);
                let engraveFilled = !!(activeGem && activeEnh.length >= engraveCap);
                let activeDef = SKILL_DB[active] || {};
                let activeMeta = getGemCardMeta(activeDef);
                let activePresentation = isGem ? getUiGemPresentation(active, false, pStats) : null;
                let growthSummary = isGem ? getGemGrowthSummaryHtml(active, activePresentation) : '';
                let activeOptions = activeEnh.map(id => GEM_SKY_ENHANCEMENTS[id] ? GEM_SKY_ENHANCEMENTS[id].name : id).join(', ') || '적용된 각인 없음';
                document.getElementById('ui-gem-enhance-target').innerHTML = `<div class="gem-target-list">${targetButtons || '<span class="gem-process-empty">장착 중인 공격 젬 없음</span>'}</div>` + (isGem
                    ? `<div class="gem-target-profile element-${activeMeta.className}">${renderSkillGemArt(active, 'gem-target-profile-icon', { eager: true })}<div><small>현재 선택 · ${activeMeta.elementLabel} ${activeMeta.typeLabel}</small><strong>${escapeHTML(active)}</strong><p>${escapeHTML(activeDef.desc || '')}</p></div></div>${growthSummary}<div class="gem-enhance-status"><span class="gem-status-chip ${coreDone ? 'done' : ''}">${coreDone ? '핵 강화 완료' : '핵 강화 진행 중'}</span><span ${contentUnlockUi.lockAttribute('engraving')} class="gem-status-chip gem-engrave-status ${slotDone ? 'done' : ''}">${slotDone ? '슬롯 최대' : `각인 슬롯 ${engraveCap}/5`}</span><span ${contentUnlockUi.lockAttribute('engraving')} class="gem-status-chip gem-engrave-status ${engraveFilled ? 'done' : ''}">${engraveFilled ? '슬롯 사용 완료' : `빈 슬롯 ${Math.max(0, engraveCap - activeEnh.length)}`}</span></div><div ${contentUnlockUi.lockAttribute('engraving')} class="gem-current-inscriptions"><span>현재 각인</span><strong>${escapeHTML(activeOptions)}</strong></div>`
                    : '<div class="gem-process-empty">공격 젬을 선택하면 성장 정보가 표시됩니다.</div>');
                renderGemResourceStrip(activeGem, gemExpertLv, condensedPower);
                renderGemEngraveSlots(activeSlots, engraveCap);
                renderSupportGemProcessList(gemExpertLv);
                let currentTotalGemLevel = Math.max(1, Math.floor((activePresentation && activePresentation.totalLevel) || 1));
                const upgrades = [
                    { title: '군주의 핵 강화', action: "upgradeActiveGem('bossCore', 1)", done: activeGem?.bossCoreLevel >= 5, ready: (game.currencies.bossCore || 0) >= bossNeed, details: `보유 ${game.currencies.bossCore || 0} / 필요 ${bossNeed}`, gain: 1 },
                    { title: '창공의 힘 강화', action: "upgradeActiveGem('skyEssence', 1)", done: activeGem?.skyCoreLevel >= 5, ready: (game.currencies.skyEssence || 0) >= skyNeed, details: `보유 ${game.currencies.skyEssence || 0} / 필요 ${skyNeed}`, gain: 1 },
                    { title: '응축 창공 영구 강화', action: 'upgradeActiveGemWithCondensedSkyPower()', done: permanentSkyBoost >= permanentSkyMax, ready: game.skyTower.unlocked && condensedPower >= permanentSkyCost, details: `${game.skyTower.unlocked ? '루프 초기화 없음' : '창공의 탑 해금 필요'} · 보유 ${Math.floor(condensedPower)} / 필요 ${permanentSkyCost}`, gain: 1 },
                    { title: '젬 퀄리티 강화', action: 'upgradeActiveGemQuality()', done: activeGem?.quality >= 20, ready: gemExpertLv >= 8 && (game.currencies.bossCore || 0) >= qualityNeed, details: `젬 각인사 Lv.8 · 군주의 핵 ${game.currencies.bossCore || 0}/${qualityNeed} · 피해·속도 배율 +0.5%` },
                    { title: '각성 젬 변환', action: 'awakenActiveGemCandidate()', done: !!activeGem?.awakened, ready: awakenReady && (game.currencies.awakenedEcho || 0) >= 3, details: `각인사 Lv.15 · 기본 Lv.20 · 각성 잔향 ${game.currencies.awakenedEcho || 0}/3`, gain: 2 }
                ];
                document.getElementById('ui-gem-upgrade-actions').innerHTML = isGem ? upgrades.map(upgrade => renderGemUpgradeButton(upgrade, currentTotalGemLevel)).join('') : '<div class="gem-process-empty">강화할 공격 젬을 먼저 장착하세요.<br><button type="button" onclick="switchSkillSubtab(\'skill-tab-equip\')">공격 젬 장착하기</button></div>';
                if ((game.season || 1) >= 4) {
                    document.getElementById('ui-gem-enhance-options').innerHTML = `<div class="gem-engrave-slot-guide"><strong>전체 각인</strong><span>각인을 누르면 빈 슬롯에 적용되고, 적용 중인 각인을 다시 누르면 해제됩니다. 특정 슬롯을 교체하려면 위 슬롯을 누르세요.</span></div>` + Object.values(GEM_SKY_ENHANCEMENTS).map(enh => renderSkyEnhancementOption(enh, activeSlots, gemExpertLv, isGem)).join('');
                } else {
                    document.getElementById('ui-gem-enhance-options').innerHTML = '<div class="gem-process-empty">창공 각인은 루프 4부터 해금됩니다.</div>';
                }
            }
        }

        }

    }

    safeExposeGlobals({ renderSkillGemScreen });
}());
