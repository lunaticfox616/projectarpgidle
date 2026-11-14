import { UNDERWORLD_RUNE_BONUS_POOL as BONUS_POOL } from '../data/underworld-crafting.mjs';
import { underworldRuneState } from '../state/underworld-runes.mjs';
const rounded = value => Number((Math.round(value * 10) / 10).toFixed(1));
const canPay = (owner, cost) => Object.entries(cost).every(([key, amount]) => (owner.currencies[key] || 0) >= amount);
const pay = (owner, cost) => { for (const [key, amount] of Object.entries(cost)) owner.currencies[key] -= amount; };

export function underworldEnchantCost(strength) {
    return {underCopper:Math.max(4,strength*6),underSilver:Math.max(2,strength*3),underGold:Math.max(1,strength-1)};
}

export function underworldLimitBreakCost(slot, rule) {
    const kind = slot.includes('반지') || slot === '목걸이' || slot === '허리띠' ? 'accessory' : slot === '무기' ? 'weapon' : 'armour';
    return rule.costs[kind];
}

export function underworldGrowthCost(level, reroll) {
    return reroll ? {underCopper:180+level*110,underSilver:95+level*80,underGold:36+level*34}
        : {underCopper:260+level*220,underSilver:150+level*150,underGold:55+level*58,runeShard:120+level*90};
}

export function ownedUnderworldRuneNumbers(state, getDef) {
    return [...new Set([...state.obtainedRunes,...state.equippedRunes.slice(0,state.unlockedSlots)]
        .filter(no => no && getDef(no)))].sort((a,b) => a-b);
}

export function underworldRuneDef(no, definitions) {
    return (Array.isArray(definitions) ? definitions : []).find(row => row.no === Math.max(1,Math.floor(no || 0))) || null;
}

export function underworldRuneCountMap(runes) {
    return (Array.isArray(runes) ? runes : []).reduce((counts,number) => {
        const key = Math.max(1,Math.floor(number || 1));
        counts[key] = (counts[key] || 0)+1;
        return counts;
    },{});
}

export function validUnderworldRuneSlot(state, index) {
    return Number.isInteger(index) && index >= 0 && index < Math.min(6,state.unlockedSlots);
}

function receiveRune(state, no) {
    state.obtainedRunes.push(no);
    const cap = Math.max(0,Math.min(6,Math.floor(state.unlockedSlots || 0)));
    const slot = state.equippedRunes.slice(0,cap).findIndex(value => !value);
    if (slot < 0) return;
    // Match the first owned copy, including one already present before this reward.
    const owned = state.obtainedRunes.findIndex(value => Math.floor(value || 0) === Math.floor(no || 0));
    state.obtainedRunes.splice(owned,1);
    state.equippedRunes[slot] = no;
}

function growthStateCurrent(owner, choice, getDef) {
    return choice.owner === owner && choice.loop === owner.loopCount && choice.season === owner.season
        && choice.state === owner.underworldRunes && (choice.state.enhanceLvByNo[choice.no] || 0) === choice.level
        && ownedUnderworldRuneNumbers(choice.state,getDef).includes(choice.no);
}

/** Domain-owned prices, draws and atomic mutation. The view only selects, displays and persists results. */
export class UnderworldCrafting {
    constructor(deps) { this.deps = deps; }

    equipRune(owner, index, no) {
        const state = underworldRuneState(owner);
        if (!validUnderworldRuneSlot(state,index) || !Number.isInteger(no) || no < 1 || !this.deps.runeDef(no)) return {reason:'rune'};
        const owned = state.obtainedRunes.findIndex(value => Math.floor(value || 0) === no);
        if (owned < 0) return {reason:'owned'};
        const previous = state.equippedRunes[index];
        if (previous) state.obtainedRunes.push(Math.floor(previous));
        state.obtainedRunes.splice(owned,1);
        state.equippedRunes[index] = no;
        return {ok:true};
    }

    unequipRune(owner, index) {
        const state = underworldRuneState(owner);
        if (!validUnderworldRuneSlot(state,index)) return {reason:'slot'};
        const previous = state.equippedRunes[index];
        if (previous) state.obtainedRunes.push(Math.floor(previous));
        state.equippedRunes[index] = null;
        return {ok:true};
    }

    craftRune(owner) {
        const state = underworldRuneState(owner), maxNo = Math.max(0,Math.floor(state.unlockedRunesMaxNumber || 0));
        if (maxNo <= 0) return {reason:'unlock'};
        const cost = {runeShard:10};
        if (!canPay(owner,cost)) return {reason:'cost',cost};
        const no = 1+Math.floor(this.deps.random()*maxNo);
        pay(owner,cost);
        receiveRune(state,no);
        return {ok:true,no};
    }

    upgradeRune(owner, fromNo) {
        const state = underworldRuneState(owner), counts = underworldRuneCountMap(state.obtainedRunes);
        const from = Number.isInteger(fromNo) ? fromNo : 0;
        if (!(counts[from] >= 3) || from >= 30) return {reason:'copies'};
        const cost = {runeShard:Math.max(5,from)};
        if (!canPay(owner,cost)) return {reason:'cost',cost};
        const max = Math.max(1,Math.min(30,Math.floor(state.unlockedRunesMaxNumber || 1)));
        if (from >= max) return {reason:'unlock',from,max};
        pay(owner,cost);
        let removed = 0;
        state.obtainedRunes = state.obtainedRunes.filter(value => !(Math.floor(value || 0) === from && removed++ < 3));
        const no = Math.min(max,from+1);
        receiveRune(state,no);
        return {ok:true,from,no,cost};
    }

    enchant(owner, slot) {
        const item = owner.equipment && owner.equipment[slot];
        if (!item) return {reason:'item'};
        const pool = this.deps.enchantPools[slot];
        if (!pool) return {reason:'item'};
        // Preserve the original draw order, including both draws before an unaffordable attempt is rejected.
        const [id,min,max,strength] = pool[Math.floor(this.deps.random()*pool.length)];
        const value = rounded(min + this.deps.random()*(max-min)), cost = underworldEnchantCost(strength);
        if (!canPay(owner,cost)) return {reason:'cost',cost};
        const line = {id,statName:this.deps.statName(id),val:value,valMin:value,valMax:value,underEnchant:true};
        const stats = Array.isArray(item.stats) ? item.stats.filter(stat => !(stat && stat.underEnchant)) : [];
        pay(owner,cost); item.stats = stats; item.underEnchant = line;
        return {ok:true,item,id,value,cost};
    }

    limitBreak(owner, slot) {
        const item = owner.equipment && owner.equipment[slot], rule = this.deps.limitBreak;
        if (!item) return {reason:'item'};
        const before = Math.floor(item.quality || 0);
        if (before !== rule.quality) return {reason:'quality',before,required:rule.quality};
        if (item.qualityLockedByLimitBreak) return {reason:'locked'};
        const amounts = underworldLimitBreakCost(slot,rule);
        const cost = {underCopper:amounts[0],underSilver:amounts[1],underGold:amounts[2]};
        if (!canPay(owner,cost)) return {reason:'cost',cost};
        const delta = -rule.swing + Math.floor(this.deps.random()*(rule.swing*2+1));
        const after = Math.max(0,Math.min(rule.cap,before+delta));
        pay(owner,cost); item.quality = after; item.qualityLockedByLimitBreak = true;
        return {ok:true,item,before,after,delta};
    }

    quoteGrowth(owner, choice, reroll) {
        if (!choice || !growthStateCurrent(owner,choice,this.deps.runeDef)) return {reason:'state'};
        const level = choice.level;
        if (reroll ? level < 5 || level > 15 : level < 0 || level >= 15) return {reason:'state'};
        const cost = underworldGrowthCost(level,reroll);
        return canPay(owner,cost) ? {cost} : {reason:'cost',cost};
    }

    bonusLine() {
        const row = BONUS_POOL[Math.floor(this.deps.random()*BONUS_POOL.length)];
        return {stat:row.stat,val:rounded(row.min+this.deps.random()*(row.max-row.min))};
    }

    grow(owner, choice, reroll) {
        const quote = this.quoteGrowth(owner,choice,reroll);
        if (quote.reason) return quote;
        const {state,no} = choice, level = choice.level + (reroll ? 0 : 1);
        const count = level >= 15 ? 3 : (level >= 10 ? 2 : (level >= 5 ? 1 : 0));
        const lines = reroll || !Array.isArray(state.bonusLinesByNo[no]) ? [] : state.bonusLinesByNo[no].slice();
        while (lines.length < count) lines.push(this.bonusLine());
        pay(owner,quote.cost);
        if (!reroll) state.enhanceLvByNo[no] = level;
        state.bonusLinesByNo[no] = lines;
        return {ok:true,no,level,lines};
    }
}
