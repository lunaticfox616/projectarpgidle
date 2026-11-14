// snapshot: explicit account state and dependency ports; no ambient game/global state.
export class SocialSnapshot {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["snapStat","snapStatMarks","snapAffixKind","buildItemSnapshot","buildItemMetaSnapshot","profileItemLevel","buildRequirementSnapshot","buildSocketSnapshots","buildJewelKeystoneSnapshot","buildJewelSnapshot","buildTalismanSnapshot","talismanStateFor","statsWithoutBarkZone","buildProfileStats","buildSkillSnapshot","buildProfileIdentity","buildProfileGear","buildCoreSnapshot","buildCoreCard","buildStumpSnapshot","buildStumpCellSnapshot","buildStumpItemCard","buildStumpItemSnapshot","stumpItemNote","buildProfileSnapshot"].forEach(name => { this[name] = this[name].bind(this); });
    }

    snapStat(st) {
        let o = { id: st.id || st.stat, val: st.val, statName: st.statName, tier: st.tier,
            valMin: st.valMin, valMax: st.valMax, baseRollMin: st.baseRollMin, baseRollMax: st.baseRollMax };
        return Object.assign(o, this.snapStatMarks(st));
    }

    snapStatMarks(st) {
        let marks = {
            exceptional: !!st.exceptional, honey: !!st.lockedByHoney, wax: !!st.waxBonus, petite: !!st.petite && !st.waxBonus, ember: st.emberScale,
            fixed: typeof this.deps.isFixedEquipmentAffix === 'function' && this.deps.isFixedEquipmentAffix(st),
            source: typeof this.deps.equipmentCrafting === 'object' ? this.deps.equipmentCrafting.getLabel(st) : ''
        };
        return Object.fromEntries(Object.entries(marks).filter(([, value]) => value));
    }

    snapAffixKind(item, st) {
        const kind = typeof this.deps.equipmentCrafting === 'object' ? this.deps.equipmentCrafting.storedAffixKind(item, st) : 'special';
        return kind === 'prefix' || kind === 'suffix' ? { kind } : {};
    }

    buildItemSnapshot(item, slotOverride) {
        if (!item) return null;
        const snap = this.itemIdentitySnapshot(item, slotOverride);
        snap.baseStats = (item.baseStats || []).slice(0, 8).map(this.snapStat);
        // Unique fusions may have twelve affixes, with up to four subordinate values each.
        snap.stats = (item.stats || []).slice(0, 12).map(st => {
            const stat = this.snapStat(st);
            if (Array.isArray(st.extraStats)) stat.extraStats = st.extraStats.slice(0, 4).map(this.snapStat);
            return Object.assign(stat, this.snapAffixKind(item, st));
        });
        this.applyHallSnapshot(snap, item);
        this.applySpecialItemSnapshot(snap, item);
        return Object.assign(snap, this.buildItemMetaSnapshot(item));
    }

    itemIdentitySnapshot(item, slotOverride) {
        let slot = slotOverride || item.slot || '';
        return {
            slot,
            category: this.services.profileValues.profileItemCategory(item),
            name: item.name || '',
            rarity: item.rarity || 'normal',
            baseName: item.baseName || '',
            uniqueEffect: item.uniqueEffect || '',
            // 베이스 수치를 키우는 고유(implicitAmp)의 방어도와 회피(itemTooltipRules.defenseView)가 절반으로 나오지 않게.
            uniqueEffectKey: item.uniqueEffectKey,
            uniqueEffectParams: item.uniqueEffectParams,
            corrupted: !!item.corrupted
        };
    }

    applyHallSnapshot(snap, item) {
        if (item.hallReplica) {
            snap.hallReplica = true;
            snap.hallCuratorName = item.hallCuratorName || '';
            snap.hallAppraisalScore = Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0));
        }
        if (item.hallRelistBlocked) snap.hallRelistBlocked = true;
    }

    applySpecialItemSnapshot(snap, item) {
        // 특수 상태: 봉인(나무꾼의 손길), 고유 융합 유물, 혼돈 주입, 잠식 — 실제 툴팁과 동일하게 노출.
        if (item.loopSealed) snap.loopSealed = true;
        if (item.fusedRelic) {
            snap.fusedRelic = true;
            snap.fusionGrade = item.fusionGrade || '';
            snap.fusedRareName = item.fusedRareName || '';
        }
        if (item.chaosInfusion) snap.chaosInfusion = Object.assign(this.snapStat(item.chaosInfusion), this.snapAffixKind(item, item.chaosInfusion));
        if (item.encroached) {
            snap.encroached = {
                liberated: !!item.encroached.liberated,
                chosen: (item.encroached.liberated && item.encroached.chosen) ? this.snapStat(item.encroached.chosen) : null
            };
        }
    }

    buildItemMetaSnapshot(item) {
        let chain = typeof this.deps.getItemBaseChainInfo === 'function' ? this.deps.getItemBaseChainInfo(item) : null;
        return {
            baseId: item.baseId, // 인형 배치의 장비 그림(profileItemArt)
            wardSlots: typeof this.deps.colonyWards === 'object' ? this.deps.colonyWards.beltRoll(item) : undefined, // 허리띠의 액막이 칸 수(profileWardSlotsHtml)
            baseStep: chain && chain.total > 1 ? [chain.step, chain.total] : undefined,
            itemLevel: this.profileItemLevel(item),
            grade: typeof this.deps.getItemCraftTier === 'function' ? this.deps.getItemCraftTier(item) : undefined,
            requirements: this.buildRequirementSnapshot(item),
            sockets: this.buildSocketSnapshots(item),
            ember: item.burned ? (item.emberLines || []).slice(0, 2).map(this.snapStat) : undefined,
            anoint: this.services.profileValues.profileAnointSnapshot(item)
        };
    }

    profileItemLevel(item) {
        if (item.itemLevel) return Math.floor(Number(item.itemLevel)) || undefined;
        if (typeof this.deps.levelProgression !== 'object') return undefined;
        return Math.floor(Number(this.deps.levelProgression.tierLevel(item.hiddenTier || item.itemTier)) || 0) || undefined;
    }

    buildRequirementSnapshot(item) {
        if (typeof this.deps.levelProgression !== 'object' || typeof this.deps.levelProgression.requirements !== 'function') return undefined;
        let required = this.deps.levelProgression.requirements(item);
        return { level: required.level, attributes: required.attributes };
    }

    buildSocketSnapshots(item) {
        let unlocked = typeof this.deps.contentProgression === 'object' && this.deps.contentProgression.isUnlocked('jewel');
        let rows = unlocked && typeof this.deps.equipmentSockets === 'object' ? this.deps.equipmentSockets.list(item) : [];
        if (!rows.length) return undefined;
        return rows.map(row => ({ label: this.deps.equipmentSockets.label(row), jewel: this.buildJewelSnapshot(row.jewel) }));
    }

    buildJewelKeystoneSnapshot(jewel) {
        if (!jewel.cosmosKeystoneJewel || !jewel.cosmosKeystone) return undefined;
        let id = jewel.cosmosKeystone;
        let owner = typeof this.deps.getAscendKeystoneOwnerClass === 'function' ? this.deps.getAscendKeystoneOwnerClass(id) : null;
        let ascend = owner && typeof this.deps.CLASS_TEMPLATES !== 'undefined' && this.deps.CLASS_TEMPLATES[owner] ? this.deps.CLASS_TEMPLATES[owner].name : '';
        let active = (Array.isArray(this.deps.game.cosmosTwinKeystones) ? this.deps.game.cosmosTwinKeystones : []).includes(id);
        return { name: typeof this.deps.getAscendKeystoneName === 'function' ? this.deps.getAscendKeystoneName(id) : String(id), ascend, active };
    }

    buildJewelSnapshot(jewel) {
        if (!jewel) return null;
        let stats = [];
        try {
            if (typeof this.deps.getJewelStats === 'function') this.deps.getJewelStats(jewel).forEach(st => stats.push(this.snapStat(st)));
        } catch (error) { this.deps.console.warn('[social] jewel snapshot unavailable:', error.message); }
        return { kind: 'jewel', name: jewel.name || '주얼', rarity: jewel.rarity || 'normal', stats: stats.slice(0, 8),
            uniqueEffect: this.deps.getJewelUniqueEffectText(jewel) || undefined, keystone: this.buildJewelKeystoneSnapshot(jewel) };
    }

    buildTalismanSnapshot(t) {
        if (!t || !Array.isArray(t.lines)) return null;
        let lines = t.lines.map(line => ({ text: this.deps.talismans.describeLine(line), condition: line.kind === 'condition' }));
        if (t.special === 'moment') lines.push({ text: this.deps._t('보스에게 주는 최종 피해 +{moment}%, 생명력 5% 이하 보스 처형', { moment: t.moment }), condition: true });
        return { kind: 'talisman', name: t.name || '부적', rarity: t.rarity || 'magic', uniqueEffect: t.uniqueEffect || undefined, lines, state: this.talismanStateFor(t) };
    }

    talismanStateFor(item) {
        if (this.deps.game.stumpBox.board.indexOf(item.id) < 0) return 'stored';
        if (!this.deps.stumpBox.isMature(item)) return 'asleep';
        let summary = this.deps.talismanEffects.summarize();
        if (summary.suppressed.has(item.id)) return 'suppressed';
        return summary.amplified.has(item.id) ? 'amplified' : 'awake';
    }

    statsWithoutBarkZone() {
        if (!this.deps.getWorldTreeBarkEffect().on) return this.deps.getPlayerStats();
        return this.deps.previewBuildStats(clone => { Object.assign(clone.worldTreeBark, { damage: 0, taken: 0, move: 0 }); }).after;
    }

    buildProfileStats() {
        let s = typeof this.deps.getPlayerStats === 'function' ? this.statsWithoutBarkZone() : null;
        if (!s) return { stats: [], power: 0 };
        let rows = this.data.PROFILE_STAT_KEYS.filter(([key]) => key !== 'summonDps' || Number(s.summonDps) > 0)
            // dps는 직접 DPS다(캐릭터 창과 같은 이름). 머리 띠의 큰 수가 총 DPS라, 'DPS'로 두면 둘이 다른 수로 보였다.
            .map(([key]) => ({ key, label: key === 'dps' ? '직접 DPS' : this.deps.COMPARE_STAT_META[key].label, value: this.deps.COMPARE_STAT_META[key].format(Number(s[key]) || 0) }));
        // 총 DPS(직접 + 소환)는 게임의 권장 전투력 비교와 같은 값이다(js/combat-ehp.js getMapPowerReadiness).
        let power = Math.floor(Number(s.totalDps) || (Number(s.dps) || 0) + (Number(s.summonDps) || 0));
        return { stats: rows, power };
    }

    buildSkillSnapshot(state) {
        let gem = name => ({ name, level: Math.max(1, Math.floor(Number(state.gemData?.[name]?.level) || 1)), quality: Math.max(0, Math.floor(Number(state.gemData?.[name]?.quality) || 0)) });
        let support = name => ({ name, level: Math.max(1, Math.floor(Number(state.supportGemData?.[name]?.level) || 1)) });
        let summon = name => ({ ...gem(name), count: Math.max(1, Math.floor(Number(state.summonSkillCounts?.[name]) || 1)) });
        return {
            active: state.activeSkill ? gem(state.activeSkill) : null,
            supports: (state.equippedSupports || []).filter(Boolean).slice(0, 8).map(support),
            mobility: state.mobilitySkill ? gem(state.mobilitySkill) : null,
            summons: (state.equippedSummonSkills || []).filter(Boolean).slice(0, 6).map(summon)
        };
    }

    buildProfileIdentity(state) {
        let classDef = typeof this.deps.PLAYER_CLASS_DEFS !== 'undefined' ? this.deps.PLAYER_CLASS_DEFS[state.selectedClassId] : null;
        return { classId: state.selectedClassId || '', heroClassName: classDef ? classDef.label : '', ascendClass: state.ascendClass || '', className: this.services.format.socialClassLabel(state.ascendClass) };
    }

    buildProfileGear(state) {
        let equipment = [];
        let eq = state.equipment || {};
        Object.keys(eq).filter(slot => !this.deps.bagItems.isSpecial(eq[slot])).forEach(slot => { let snap = this.buildItemSnapshot(eq[slot], slot); if (snap) equipment.push(snap); });
        return { equipment: equipment.slice(0, 16), core: this.buildCoreSnapshot(state), stump: this.buildStumpSnapshot(state) };
    }

    buildCoreSnapshot(state) {
        let core = (state.equipment || {})['코어'];
        if (!core || typeof this.deps.coreItems !== 'object' || !this.deps.contentProgression.isUnlocked('cube', state)) return undefined;
        return this.buildCoreCard(core);
    }

    buildCoreCard(core) {
        return { kind: 'core', name: core.name, lines: (core.lines || []).map(line => this.deps.coreItems.describe(line)) };
    }

    buildStumpSnapshot(state) {
        let box = state.stumpBox;
        if (!box || !box.acquired || typeof this.deps.stumpBox !== 'object' || box.board.every(id => id === null)) return undefined;
        let result = this.deps.stumpBox.evaluate(state);
        return { cells: box.board.map((id, cell) => this.buildStumpCellSnapshot(state, result, id, cell)) };
    }

    buildStumpCellSnapshot(state, result, id, cell) {
        if (!this.deps.stumpBox.isOpen(state, cell)) return null;
        let rank = this.deps.stumpBox.graftRank(state.stumpBox, cell);
        let row = rank ? { graft: rank, graftPct: rank * this.deps.STUMP_BOX_GRAFT.pctPerRank } : {};
        let card = id === null ? null : this.buildStumpItemCard(this.deps.stumpBox.itemById(state, id), result);
        if (card) row.item = card;
        return row;
    }

    buildStumpItemCard(item, result) {
        let card = !item ? null : item.family === 'talisman' ? this.buildTalismanSnapshot(item) : this.buildStumpItemSnapshot(item, result);
        if (!card) return null;
        return Object.assign(card, { stage: this.deps.stumpBox.stageOf(item), ripe: this.deps.stumpBox.isMature(item), xp: Math.floor(item.xp), need: this.deps.stumpBox.need(item) });
    }

    buildStumpItemSnapshot(item, result) {
        let gain = this.deps.stumpBox.yieldOf(item), suppressed = result.suppressed.has(item.id);
        let value = result.values[item.id] ?? (gain ? gain.value * this.deps.stumpBox.qualityOf(item) * this.deps.stumpBox.goldenMul(item) : 0);
        return { kind: 'stump', family: item.family, color: item.color, name: this.deps.stumpBox.label(item), quality: Math.round(item.roll * 100),
            yieldText: gain ? gain.text.replace('{v}', String(Math.round(value * 10) / 10)) : '', suppressed,
            resonant: !suppressed && this.deps.stumpBox.isMature(item) && !!result.synergy[item.id], note: this.stumpItemNote(item, result),
            extra: this.deps.stumpBox.extraLinesOf(item, result).map(line => ({ id: line.stat, text: this.deps.stumpBox.lineText(line.stat, line.value) })),
            golden: this.deps.stumpBox.goldenMul(item) > 1 };
    }

    stumpItemNote(item, result) {
        let note = this.deps.stumpBox.boardNote(item, result);
        return note ? note.text : '';
    }

    buildProfileSnapshot() {
        let state = typeof this.deps.game !== 'undefined' && this.deps.game ? this.deps.game : {};
        let numbers = { stats: [], power: 0 };
        try { numbers = this.buildProfileStats(); } catch (e) { this.deps.console.warn('프로필 스탯 계산 실패:', e); }
        return {
            version: 8,
            nickname: this.services.identity.getMyNickname(),
            level: state.level || 1,
            ...this.buildProfileIdentity(state),
            loop: typeof this.deps.getSaveLoopNumber === 'function' ? this.deps.getSaveLoopNumber(state) : 0,
            ...numbers,
            ...this.buildProfileGear(state),
            skills: this.buildSkillSnapshot(state),
            updatedAt: Date.now()
        };
    }
}
