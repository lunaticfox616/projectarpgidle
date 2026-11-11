// Exact gem-drop records and collection merging. No random draws, UI or global game mutations.
const gemDropRewards=(()=>{
    /** Sealed runes per point of resonance (2026-11-09 사용자: 봉인 2개당 공명력 1, 전에는 1개당 1). */
    const SEALED_RUNES_PER_RESONANCE = 2;
    /** Resonance the sealed attack and support runes give. state.resonancePower is the base without it (saveVersion 21). */
    function sealResonance(state) {
        return Math.floor(((state.sealedSkills || []).length + (state.sealedSupports || []).length) / SEALED_RUNES_PER_RESONANCE);
    }
    /** Shared by the support-rune UI and deferred floor pickups. Pure calculation from the supplied build. */
    function resonanceCap(state, stats) {
        const base = Math.max(0, Math.floor(state.resonancePower || 0)) + sealResonance(state);
        const floor = Math.max(0, Math.floor(stats?.uniqueResonanceFloor || 0));
        const inquisitor = Math.max(0, Math.floor(stats?.inquisitorResonanceBonus || 0));
        const runes = Math.max(0, Math.floor(stats?.runeResonancePower || 0));
        return Math.max(base, floor) + inquisitor + runes;
    }
    function resonanceUsed(state, names = state.equippedSupports || []) {
        const supports = window.GameModules.skills.supports;
        return names.reduce((sum, name) => sum + getSupportResonanceCostAtTier(name, supports.tierOf(name, state)), 0);
    }
    function allowsResonanceOverflow(stats) {
        return !!stats?.passiveKeystoneFlags?.willResonance && Math.floor(stats.suppCap) >= 9;
    }
    function exceedsResonanceBudget(stats, used, cap) {
        return used > cap && !allowsResonanceOverflow(stats);
    }
    // Leave legacy loadouts alone. Recheck the budget when the keystone no longer gives permission.
    function normalizationResonanceCap(state, stats, hadOverflowKeystone) {
        if (allowsResonanceOverflow(stats)) return Infinity;
        return hadOverflowKeystone || stats?.passiveKeystoneFlags?.willResonance ? resonanceCap(state, stats) : Infinity;
    }
    /** Every attack rune: one already held drops and sells again and adds a spare (2026-11-02 사용자). Monster drops may roll
     * drop-only runes; shops and direct rewards use the default pool. */
    function attackRunes({ includeDropOnly = false } = {}) {
        return Object.keys(SKILL_DB).filter(name => SKILL_DB[name].isGem && (includeDropOnly || !SKILL_DB[name].dropOnly));
    }
    /** Copies beyond the one in use. A broken rune takes one (js/gem-core-forge.js). */
    function spareCount(state,name) {
        return Math.max(0,Math.floor(Number(state.runeSpares?.[name])||0));
    }
    function copyCount(state,name) {
        return hasSkillGemOwned(name,state)?1+spareCount(state,name):0;
    }
    /** @returns {boolean} whether a spare was there to take. */
    function takeSpare(state,name) {
        const left=spareCount(state,name)-1;
        if(left<0)return false;
        state.runeSpares={...state.runeSpares};
        if(left)state.runeSpares[name]=left;
        else delete state.runeSpares[name];
        return true;
    }
    function nextSupport(state,name) {
        let before=0;
        if(hasSupportGemOwned(name,state))before=Math.max(before,normalizeGemRecord(state.supportGemData[name]).unlockedTier||1);
        const cap=getSupportTierCap(name);
        if(before>=cap)return null;
        return {kind:'support',name,tier:before+1};
    }
    function validate(rewards) {
        if(!Array.isArray(rewards))throw Error('잘못된 탐험 룬 목록');
        const keys=new Set();
        for(const row of rewards) {
            validateGem(row);
            if(row.kind==='attack')continue;   // 같은 공격 룬이 또 떨어지면 여분이 된다
            const key=row.kind+':'+row.name;
            if(keys.has(key))throw Error('중복된 탐험 룬 저장');
            keys.add(key);
        }
    }
    function validateGem(row) {
        if(!row||typeof row.name!=='string')throw Error('잘못된 탐험 룬 저장');
        if(row.kind==='attack') {
            validateAttack(row);
            return;
        }
        if(row.kind!=='support'||!Object.hasOwn(SUPPORT_GEM_DB,row.name))throw Error('잘못된 탐험 보조스킬룬 저장');
        if(!Number.isInteger(row.tier)||row.tier<1||row.tier>getSupportTierCap(row.name))throw Error('잘못된 탐험 보조스킬룬 등급');
    }
    function validateAttack(row) {
        if(!Object.hasOwn(SKILL_DB,row.name)||!SKILL_DB[row.name].isGem||typeof row.awakened!=='boolean')throw Error('잘못된 탐험 공격 룬 저장');
    }
    /** Preserve XP, quality, forging, sealing and active tiers changed while rewards were pending. */
    function prepare(state,rewards) {
        validate(rewards);
        if(!rewards.length)return {};
        const result={skills:[...state.skills],supports:[...state.supports],runeSpares:{...state.runeSpares},
            gemData:{...state.gemData},supportGemData:{...state.supportGemData}};
        for(const row of rewards) {
            if(row.kind==='attack')mergeAttack(result,state,row);
            else mergeSupport(result,state,row);
        }
        return result;
    }
    function mergeAttack(result,state,row) {
        if(hasSkillGemOwned(row.name,{...state,skills:result.skills}))result.runeSpares[row.name]=spareCount(result,row.name)+1;
        else result.skills.push(row.name);
        const record=normalizeGemRecord(result.gemData[row.name]);
        result.gemData[row.name]={...record,awakened:record.awakened||row.awakened};
    }
    function mergeSupport(result,state,row) {
        if(!hasSupportGemOwned(row.name,state))result.supports.push(row.name);
        const record=normalizeGemRecord(state.supportGemData[row.name]);
        result.supportGemData[row.name]={...record,unlockedTier:Math.max(record.unlockedTier||1,row.tier)};
    }
    /** Ordinary immediate drops retain their existing highest-affordable-tier activation policy. */
    function grant(state,row,resonanceCap) {
        const result=prepare(state,[row]);
        if(row.kind==='support')activateAffordableTier(state,result,row.name,resonanceCap);
        Object.assign(state,result);state.noti.skills=true;
    }
    function activateAffordableTier(state,result,name,cap) {
        const record=result.supportGemData[name],before=record.activeTier||1;
        const used=state.equippedSupports.reduce((sum,key)=>{
            const tier=normalizeGemRecord(state.supportGemData[key]).activeTier||1;
            return sum+getSupportResonanceCostAtTier(key,tier);
        },0);
        const extra=getSupportResonanceCostAtTier(name,record.unlockedTier)-getSupportResonanceCostAtTier(name,before);
        if(!state.equippedSupports.includes(name)||Math.max(0,cap-used)>=extra)record.activeTier=record.unlockedTier;
    }
    return {resonanceCap,resonanceUsed,allowsResonanceOverflow,exceedsResonanceBudget,normalizationResonanceCap,sealResonance,attackRunes,spareCount,copyCount,takeSpare,nextSupport,validate,validateGem,prepare,grant};
})();
safeExposeGlobals({gemDropRewards});
