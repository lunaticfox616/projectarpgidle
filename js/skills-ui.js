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

    function renderSkillGemScreen(context) {
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
        let effectiveResonanceCap = getEffectiveResonanceCap();
        renderSkillLoadoutSummary(pStats, effectiveResonanceCap);
        let skyTowerSignatureState = (typeof ensureSkyTowerState === 'function') ? ensureSkyTowerState() : null;
        let skillPanelRenderSignature = JSON.stringify({
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
            filters: { skill: sf.skill || '', support: sf.support || '' },
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
        let skillsRows = game.skills.filter(name => {
            let def = SKILL_DB[name] || {};
            let searchable = getGemSearchText(name, def);
            let active = name === game.activeSkill || (isSummonAttackSkillGem(name)
                && Array.isArray(game.equippedSummonSkills) && game.equippedSummonSkills.includes(name));
            return isGemLibraryMatchVisible(searchable, sf.skill, foldAttackInactive, active);
        }).map(name => renderAttackGemCard(name, highlightSearchText(name, sf.skill))).join('');
        let sealedSkillRows = sealedSkills.filter(name => {
            let def = SKILL_DB[name] || {};
            let searchable = getGemSearchText(name, def);
            return isGemLibraryMatchVisible(searchable, sf.skill, foldAttackInactive, false);
        }).map(name => renderSealedGemCard(name, highlightSearchText(name, sf.skill), false)).join('');
        let skillsHtml = skillsRows + sealedSkillRows;
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
            suppResonanceEl.innerText = `${Math.max(0, getEffectiveResonanceCap() - used)}`;
        }
        let supportRows = game.supports.filter(name => {
            let def = SUPPORT_GEM_DB[name] || {};
            let searchable = getGemSearchText(name, def);
            return isGemLibraryMatchVisible(searchable, sf.support, foldSupportInactive, game.equippedSupports.includes(name));
        }).map(name => renderSupportGemCard(name, highlightSearchText(name, sf.support))).join('');
        let sealedSupportRows = sealedSupports.filter(name => {
            let def = SUPPORT_GEM_DB[name] || {};
            let searchable = getGemSearchText(name, def);
            return isGemLibraryMatchVisible(searchable, sf.support, foldSupportInactive, false);
        }).map(name => renderSealedGemCard(name, highlightSearchText(name, sf.support), true)).join('');
        let supportHtml = supportRows + sealedSupportRows;
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
                skillEnhanceBtn.title = gemEnhanceOpen ? '' : '군주의 핵 또는 창공의 힘을 처음 획득하면 개방됩니다.';
            }
            if (!gemEnhanceOpen && game.skillSubtab === 'skill-tab-enhance') game.skillSubtab = 'skill-tab-equip';
            if (gemEnhanceOpen) {
                let active = (typeof getGemEnhanceTargetSkill === 'function') ? getGemEnhanceTargetSkill() : game.activeSkill;
                let equippedEnhanceTargets = typeof getEquippedEnhanceableGemNames === 'function' ? getEquippedEnhanceableGemNames() : [];
                if ((!active || !equippedEnhanceTargets.includes(active)) && equippedEnhanceTargets.length > 0) active = equippedEnhanceTargets[0];
                let targetButtons = equippedEnhanceTargets.map(name => renderGemEnhanceTargetCard(name, name === active)).join('');
                let isGem = !!(SKILL_DB[active] && SKILL_DB[active].isGem);
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
                let activePresentation = isGem ? getUiGemPresentation(active, false) : null;
                let growthSummary = isGem ? getGemGrowthSummaryHtml(active, activePresentation) : '';
                let activeOptions = activeEnh.map(id => GEM_SKY_ENHANCEMENTS[id] ? GEM_SKY_ENHANCEMENTS[id].name : id).join(', ') || '적용된 각인 없음';
                document.getElementById('ui-gem-enhance-target').innerHTML = `<div class="gem-target-list">${targetButtons || '<span class="gem-process-empty">장착 중인 공격 젬 없음</span>'}</div>` + (isGem
                    ? `<div class="gem-target-profile element-${activeMeta.className}">${renderSkillGemArt(active, 'gem-target-profile-icon', { eager: true })}<div><small>현재 선택 · ${activeMeta.elementLabel} ${activeMeta.typeLabel}</small><strong>${escapeHTML(active)}</strong><p>${escapeHTML(activeDef.desc || '')}</p></div></div>${growthSummary}<div class="gem-enhance-status"><span class="gem-status-chip ${coreDone ? 'done' : ''}">${coreDone ? '핵 강화 완료' : '핵 강화 진행 중'}</span><span class="gem-status-chip ${slotDone ? 'done' : ''}">${slotDone ? '슬롯 최대' : `각인 슬롯 ${engraveCap}/5`}</span><span class="gem-status-chip ${engraveFilled ? 'done' : ''}">${engraveFilled ? '슬롯 사용 완료' : `빈 슬롯 ${Math.max(0, engraveCap - activeEnh.length)}`}</span></div><div class="gem-current-inscriptions"><span>현재 각인</span><strong>${escapeHTML(activeOptions)}</strong></div>`
                    : '<div class="gem-process-empty">공격 젬을 선택하면 성장 정보가 표시됩니다.</div>');
                renderGemResourceStrip(activeGem, gemExpertLv, condensedPower);
                renderGemEngraveSlots(activeSlots, engraveCap);
                renderSupportGemProcessList(gemExpertLv);
                let upgradeBtns = [];
                let currentTotalGemLevel = Math.max(1, Math.floor((activePresentation && activePresentation.totalLevel) || 1));
                upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.bossCoreLevel >= 5 ? 'done' : ''}" onclick="upgradeActiveGem('bossCore', 1)" ${!isGem || (activeGem && activeGem.bossCoreLevel >= 5) ? 'disabled' : ''}><strong>${activeGem && activeGem.bossCoreLevel >= 5 ? '✅ 군주의 핵 강화 완료' : '군주의 핵 강화'}</strong><br><small>보유 ${game.currencies.bossCore || 0} / 필요 ${bossNeed} · ${activeGem && activeGem.bossCoreLevel >= 5 ? '최대 단계' : `적용 후 최종 Lv.${currentTotalGemLevel + 1}`}</small></button>`);
                upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.skyCoreLevel >= 5 ? 'done' : ''}" onclick="upgradeActiveGem('skyEssence', 1)" ${!isGem || (activeGem && activeGem.skyCoreLevel >= 5) ? 'disabled' : ''}><strong>${activeGem && activeGem.skyCoreLevel >= 5 ? '✅ 창공의 힘 강화 완료' : '창공의 힘 강화'}</strong><br><small>보유 ${game.currencies.skyEssence || 0} / 필요 ${skyNeed} · ${activeGem && activeGem.skyCoreLevel >= 5 ? '최대 단계' : `적용 후 최종 Lv.${currentTotalGemLevel + 1}`}</small></button>`);
                upgradeBtns.push(`<button class="gem-upgrade-btn ${permanentSkyBoost >= permanentSkyMax ? 'done' : ''}" onclick="upgradeActiveGemWithCondensedSkyPower()" ${!isGem || permanentSkyBoost >= permanentSkyMax ? 'disabled' : ''}><strong>${permanentSkyBoost >= permanentSkyMax ? '✅ 응축 창공 강화 완료' : '응축 창공 영구 강화'}</strong><br><small>루프 초기화 없음 · 보유 ${Math.floor(condensedPower)} / 필요 ${permanentSkyCost} · ${permanentSkyBoost >= permanentSkyMax ? '최대 단계' : `적용 후 최종 Lv.${currentTotalGemLevel + 1}`}</small></button>`);
                upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && (activeGem.quality || 0) >= 20 ? 'done' : ''}" onclick="upgradeActiveGemQuality()" ${!isGem || gemExpertLv < 8 || (activeGem && (activeGem.quality || 0) >= 20) ? 'disabled' : ''}><strong>${activeGem && (activeGem.quality || 0) >= 20 ? '✅ 퀄리티 완료' : '젬 퀄리티 강화'}</strong><br><small>젬 각인사 Lv.8 · 군주의 핵 ${game.currencies.bossCore || 0}/${qualityNeed} · 피해·속도 배율 +0.5%</small></button>`);
                upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.awakened ? 'done' : ''}" onclick="awakenActiveGemCandidate()" ${!isGem || !awakenReady || (game.currencies.awakenedEcho || 0) < 3 ? 'disabled' : ''}><strong>${activeGem && activeGem.awakened ? '✅ 각성 젬' : '각성 젬 변환'}</strong><br><small>각인사 Lv.15 · 기본 Lv.20 · 각성 잔향 ${game.currencies.awakenedEcho || 0}/3 · ${activeGem && activeGem.awakened ? '각성 완료' : `적용 후 최종 Lv.${currentTotalGemLevel + 2}`}</small></button>`);
                document.getElementById('ui-gem-upgrade-actions').innerHTML = upgradeBtns.join('') || `<div style="grid-column:1/-1; color:var(--copy-muted);">보유한 젬 강화 재료가 없습니다.</div>`;
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
