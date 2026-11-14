import { stashHtml, stashShowTab, stashTip } from './crafting-stash-view.mjs';

/** Owns the visible currency tab only. Balances and discovered slots are read on each render. */
export function createCraftingStash(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { stashHtml, stashShowTab, stashTip };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({ html: ctx.handlers.stashHtml, showTab: ctx.handlers.stashShowTab, tip: ctx.handlers.stashTip });
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.TABS = Object.freeze([
        { id: 'basic', label: '기본 재화', icon: 'formlessDew', groups: [
            { label: '등급', cols: 3, keys: ['magicBud', 'sapBud', 'formlessDew'] },
            { label: '수치', cols: 2, keys: ['goldenRule', 'blessing'] },
            { label: '제거', cols: 2, keys: ['blightSpore', 'pruningShears'] },
            { label: '진화', cols: 1, keys: ['fairyRing'] }] },
        { id: 'special', label: '특수 제작', icon: 'emberBranch', groups: [
            { label: '타락', cols: 1, keys: ['emberBranch', 'burningEmberBranch'] },
            { label: '고정', cols: 1, keys: ['ouroboros', 'enchantedHoney'] },
            { label: '부여', cols: 2, keys: ['venomStinger', 'voidChisel', 'oceanRerollShard'] },
            { label: '제단', cols: 1, keys: ['altarEmber', 'altarIchor'] }] },
        { id: 'quality', label: '퀄리티', icon: 'catalystFire', groups: [
            { label: '강화', cols: 1, keys: ['deepWhetstone', 'rootIron', 'jewelPolish'] },
            { label: '속성', cols: 4, keys: ['abyssCatalyst', 'catalystPhys', 'catalystFire', 'catalystCold', 'catalystLight', 'catalystChaos', 'catalystCrit', 'catalystSummon'] }] },
        { id: 'fossil', label: '화석', icon: 'fossilJagged', groups: [
            { label: '정제', cols: 1, keys: ['fossil', 'fossilPrimal', 'fossilAncientPrimal'] },
            { label: '화석', cols: 5, keys: ['fossilJagged', 'fossilBound', 'fossilGale', 'fossilPrismatic', 'fossilAbyssal', 'fossilPrimordial', 'fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift'] }] },
        { id: 'omen', label: '뿌리', icon: 'omenWeave', groups: [
            { label: '제작 뿌리', cols: 5, keys: ['omenPruning', 'omenCompost', 'omenWeave', 'omenPyre', 'omenHunger'] }] }
    ]);
    ctx.state.shownTab = '';
}
