import { createCatalogSummaries } from './crafting-catalog-summaries.mjs';
import { listed, catalogCard, catalogClick, catalogGroup, catalogOpen, name, styledName, catalogDescription, catalogSummary, catalogCapture, catalogVisible, sporeShortage } from './crafting-catalog-view.mjs';

/** Search, selected currency and dialog focus belong to this catalog; discovery stays in the save owner. */
export function createCraftingCatalog(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { listed, catalogCard, catalogClick, catalogGroup, catalogOpen, name, styledName, catalogDescription, catalogSummary, catalogCapture, catalogVisible, sporeShortage };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = {open:ctx.handlers.catalogOpen,name: ctx.handlers.name,styledName: ctx.handlers.styledName,description:ctx.handlers.catalogDescription,summary:ctx.handlers.catalogSummary,theme: ctx.state.theme,capture:ctx.handlers.catalogCapture,visible:ctx.handlers.catalogVisible,sporeShortage: ctx.handlers.sporeShortage};
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.groups = [['all','전체'],['basic','기본 재화'],['fossil','화석'],['special','특수 제작'],['omen','뿌리']];
    ctx.state.separateMaterials = new Set(ctx.deps.craftingWorkspaceState.separate);
    ctx.state.craftingOnly = false;
    ctx.state.useState = undefined;
    ctx.state.dialog = undefined;
    ctx.state.onSelect = undefined;
    ctx.state.recipes = undefined;
    ctx.state.category = 'all';
    ctx.state.query = '';
    ctx.state.ownedOnly = true;
    ctx.state.active = '';
    ctx.state.inspected = '';
    ctx.state.openerId = '';
    ctx.state.theme = ctx.handlers.catalogGroup;
    ctx.state.keywordTones = {일반:'normal',마법:'magic',희귀:'rare',고유:'unique',물리:'physical',근접:'physical',생명:'life',방어:'defense',속도:'speed',치명:'critical',저항:'resist',원소:'element',카오스:'chaos',흡혈:'life',재생:'life',화염:'fire',냉기:'cold',번개:'light',투사체:'speed',관통:'physical',균열:'chaos',타락:'life'};
    ctx.state.keywordPattern = new RegExp(Object.keys(ctx.state.keywordTones).join('|'),'g');
    ctx.state.summaries = createCatalogSummaries();
}
