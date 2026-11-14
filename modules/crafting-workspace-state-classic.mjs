import { createCraftingWorkspaceState } from './state/crafting-workspace.mjs';
const craftingWorkspaceState = createCraftingWorkspaceState({
    get CRAFT_OMENS() { return CRAFT_OMENS; }, get FOSSIL_DB() { return FOSSIL_DB; }, get AFFIX_TAG_LABELS() { return AFFIX_TAG_LABELS; }
});
safeExposeGlobals({ craftingWorkspaceState });
