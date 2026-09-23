// Exact gem-drop records and collection merging. No random draws, UI or global game mutations.
const gemDropRewards=(()=>{
    function missingAttacks(state,pending=[]) {
        const owned=new Set(getOwnedSkillGemNames(state));
        pending.filter(row=>row.kind==='attack').forEach(row=>owned.add(row.name));
        return Object.keys(SKILL_DB).filter(name=>SKILL_DB[name].isGem&&!owned.has(name));
    }
    function nextSupport(state,name,pending=[]) {
        const held=pending.find(row=>row.kind==='support'&&row.name===name);
        let before=held?held.tier:0;
        if(hasSupportGemOwned(name,state))before=Math.max(before,normalizeGemRecord(state.supportGemData[name]).unlockedTier||1);
        const cap=getSupportTierCap(name);
        if(before>=cap)return null;
        return {kind:'support',name,tier:before+1};
    }
    function validate(rewards) {
        if(!Array.isArray(rewards))throw Error('잘못된 탐험 젬 목록');
        const keys=new Set();
        for(const row of rewards) {
            validateGem(row);
            const key=row.kind+':'+row.name;
            if(keys.has(key))throw Error('중복된 탐험 젬 저장');
            keys.add(key);
        }
    }
    function validateGem(row) {
        if(!row||typeof row.name!=='string')throw Error('잘못된 탐험 젬 저장');
        if(row.kind==='attack') {
            validateAttack(row);
            return;
        }
        if(row.kind!=='support'||!Object.hasOwn(SUPPORT_GEM_DB,row.name))throw Error('잘못된 탐험 보조 젬 저장');
        if(!Number.isInteger(row.tier)||row.tier<1||row.tier>getSupportTierCap(row.name))throw Error('잘못된 탐험 보조 젬 등급');
    }
    function validateAttack(row) {
        if(!Object.hasOwn(SKILL_DB,row.name)||!SKILL_DB[row.name].isGem||typeof row.awakened!=='boolean')throw Error('잘못된 탐험 공격 젬 저장');
    }
    /** Preserve XP, quality, forging, sealing and active tiers changed while rewards were pending. */
    function prepare(state,rewards) {
        validate(rewards);
        if(!rewards.length)return {};
        const result={skills:[...state.skills],supports:[...state.supports],
            gemData:{...state.gemData},supportGemData:{...state.supportGemData}};
        for(const row of rewards) {
            if(row.kind==='attack')mergeAttack(result,state,row);
            else mergeSupport(result,state,row);
        }
        return result;
    }
    function mergeAttack(result,state,row) {
        if(!hasSkillGemOwned(row.name,state))result.skills.push(row.name);
        const record=normalizeGemRecord(state.gemData[row.name]);
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
    return {missingAttacks,nextSupport,validate,validateGem,prepare,grant};
})();
safeExposeGlobals({gemDropRewards});
