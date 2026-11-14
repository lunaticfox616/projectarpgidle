import { activeSupportTier, getSupportTierCap, getSupportResonanceCostAtTier, hasSkillGemOwned, hasSupportGemOwned } from '../common/support-gems.mjs';
import { normalizeGemRecord } from '../state/gem-records.mjs';

// Record normalization and support tiers share native rules with the other rune modules.
// No global game reads or random draws. prepare calculates first; grant commits the complete result.
class GemDropRewards {
    constructor(tables) { this.tables = tables; }
    /** Sealed runes per point of resonance (2026-11-09 사용자: 봉인 2개당 공명력 1, 전에는 1개당 1). */
    static SEALED_RUNES_PER_RESONANCE = 2;
    /** Resonance the sealed attack and support runes give. state.resonancePower is the base without it (saveVersion 21). */
    sealResonance(state) {
        return Math.floor(((state.sealedSkills || []).length + (state.sealedSupports || []).length) / GemDropRewards.SEALED_RUNES_PER_RESONANCE);
    }
    /** Shared by the support-rune UI and deferred floor pickups. Pure calculation from the supplied build. */
    resonanceCap(state, stats) {
        const base = Math.max(0, Math.floor(state.resonancePower || 0)) + this.sealResonance(state);
        const floor = Math.max(0, Math.floor(stats?.uniqueResonanceFloor || 0));
        const inquisitor = Math.max(0, Math.floor(stats?.inquisitorResonanceBonus || 0));
        const runes = Math.max(0, Math.floor(stats?.runeResonancePower || 0));
        return Math.max(base, floor) + inquisitor + runes;
    }
    resonanceUsed(state, names = state.equippedSupports || []) {
        return names.reduce((sum, name) => sum + getSupportResonanceCostAtTier(name, activeSupportTier(name, state, this.tables.supports), this.tables.supports), 0);
    }
    allowsResonanceOverflow(stats) {
        return !!stats?.passiveKeystoneFlags?.willResonance && Math.floor(stats.suppCap) >= 9;
    }
    exceedsResonanceBudget(stats, used, cap) {
        return used > cap && !this.allowsResonanceOverflow(stats);
    }
    // Leave legacy loadouts alone. Recheck the budget when the keystone no longer gives permission.
    normalizationResonanceCap(state, stats, hadOverflowKeystone) {
        if (this.allowsResonanceOverflow(stats)) return Infinity;
        return hadOverflowKeystone || stats?.passiveKeystoneFlags?.willResonance ? this.resonanceCap(state, stats) : Infinity;
    }
    /** Every attack rune: one already held drops and sells again and adds a spare (2026-11-02 사용자). Monster drops may roll
     * drop-only runes, and a boss's drop also the chase runes (this.tables.skills chase); shops and direct rewards use the default pool. */
    attackRunes({ includeDropOnly = false, boss = false } = {}) {
        return Object.keys(this.tables.skills).filter(name => this.tables.skills[name].isGem && (includeDropOnly || !this.tables.skills[name].dropOnly) && (boss || !this.tables.skills[name].chase));
    }
    /** Copies beyond the one in use. A broken rune takes one (js/gem-core-forge.js). */
    spareCount(state,name) {
        return Math.max(0,Math.floor(Number(state.runeSpares?.[name])||0));
    }
    copyCount(state,name) {
        return hasSkillGemOwned(name,state)?1+this.spareCount(state,name):0;
    }
    /** @returns {boolean} whether a spare was there to take. */
    takeSpare(state,name) {
        const left=this.spareCount(state,name)-1;
        if(left<0)return false;
        state.runeSpares={...state.runeSpares};
        if(left)state.runeSpares[name]=left;
        else delete state.runeSpares[name];
        return true;
    }
    nextSupport(state,name) {
        let before=0;
        if(hasSupportGemOwned(name,state))before=Math.max(before,normalizeGemRecord(state.supportGemData[name], this.tables.forge).unlockedTier||1);
        const cap=getSupportTierCap(name, this.tables.supports);
        if(before>=cap)return null;
        return {kind:'support',name,tier:before+1};
    }
    validate(rewards) {
        if(!Array.isArray(rewards))throw Error('잘못된 탐험 룬 목록');
        const keys=new Set();
        for(const row of rewards) {
            this.validateGem(row);
            if(row.kind==='attack')continue;   // 같은 공격 룬이 또 떨어지면 여분이 된다
            const key=row.kind+':'+row.name;
            if(keys.has(key))throw Error('중복된 탐험 룬 저장');
            keys.add(key);
        }
    }
    validateGem(row) {
        if(!row||typeof row.name!=='string')throw Error('잘못된 탐험 룬 저장');
        if(row.kind==='attack') {
            this.validateAttack(row);
            return;
        }
        if(row.kind!=='support'||!Object.hasOwn(this.tables.supports,row.name))throw Error('잘못된 탐험 보조스킬룬 저장');
        if(!Number.isInteger(row.tier)||row.tier<1||row.tier>getSupportTierCap(row.name, this.tables.supports))throw Error('잘못된 탐험 보조스킬룬 등급');
    }
    validateAttack(row) {
        if(!Object.hasOwn(this.tables.skills,row.name)||!this.tables.skills[row.name].isGem||typeof row.awakened!=='boolean')throw Error('잘못된 탐험 공격 룬 저장');
    }
    /** Preserve XP, quality, forging, sealing and active tiers changed while rewards were pending. */
    prepare(state,rewards) {
        this.validate(rewards);
        if(!rewards.length)return {};
        const result={skills:[...state.skills],supports:[...state.supports],runeSpares:{...state.runeSpares},
            gemData:{...state.gemData},supportGemData:{...state.supportGemData}};
        for(const row of rewards) {
            if(row.kind==='attack')this.mergeAttack(result,state,row);
            else this.mergeSupport(result,state,row);
        }
        return result;
    }
    mergeAttack(result,state,row) {
        if(hasSkillGemOwned(row.name,{...state,skills:result.skills}))result.runeSpares[row.name]=this.spareCount(result,row.name)+1;
        else result.skills.push(row.name);
        const record=normalizeGemRecord(result.gemData[row.name], this.tables.forge);
        result.gemData[row.name]={...record,awakened:record.awakened||row.awakened};
    }
    mergeSupport(result,state,row) {
        if(!hasSupportGemOwned(row.name,state))result.supports.push(row.name);
        const record=normalizeGemRecord(state.supportGemData[row.name], this.tables.forge);
        result.supportGemData[row.name]={...record,unlockedTier:Math.max(record.unlockedTier||1,row.tier)};
    }
    /** Ordinary immediate drops retain their existing highest-affordable-tier activation policy. */
    grant(state,row,resonanceCap) {
        const result=this.prepare(state,[row]);
        if(row.kind==='support')this.activateAffordableTier(state,result,row.name,resonanceCap);
        Object.assign(state,result);state.noti.skills=true;
    }
    activateAffordableTier(state,result,name,cap) {
        const record=result.supportGemData[name],before=record.activeTier||1;
        const used=state.equippedSupports.reduce((sum,key)=>{
            const tier=normalizeGemRecord(state.supportGemData[key], this.tables.forge).activeTier||1;
            return sum+getSupportResonanceCostAtTier(key,tier,this.tables.supports);
        },0);
        const extra=getSupportResonanceCostAtTier(name,record.unlockedTier,this.tables.supports)-getSupportResonanceCostAtTier(name,before,this.tables.supports);
        if(!state.equippedSupports.includes(name)||Math.max(0,cap-used)>=extra)record.activeTier=record.unlockedTier;
    }
}
export function createGemDropRewards(tables) {
    const rewards = new GemDropRewards(tables);
    return Object.fromEntries(["resonanceCap","resonanceUsed","allowsResonanceOverflow","exceedsResonanceBudget","normalizationResonanceCap","sealResonance","attackRunes","spareCount","copyCount","takeSpare","nextSupport","validate","validateGem","prepare","grant"].map(name => [name, rewards[name].bind(rewards)]));
}
