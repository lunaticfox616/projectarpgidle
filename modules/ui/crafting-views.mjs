import { createCraftingCatalog } from './crafting-catalog.mjs';
import { createCraftingStash } from './crafting-stash.mjs';
import { createCraftingWorkspace } from './crafting-workspace.mjs';
import { createCraftingResultView } from './crafting-result-view.mjs';
import { renderFossilWorkbench } from './fossil-workbench.mjs';

/** Each crafting view is created once and linked directly, without browser-global lookup. */
export function createCraftingViews(deps) {
    const results = createCraftingResultView(deps);
    const fossils = renderFossilWorkbench.bind(undefined, deps);
    const catalog = createCraftingCatalog(deps);
    const stash = createCraftingStash(Object.create(deps, { craftingCatalogUi: { value: catalog } }));
    const workspace = createCraftingWorkspace(Object.create(deps, {
        craftingCatalogUi: { value: catalog }, craftingStashUi: { value: stash },
        craftingResultUi: { value: results }, renderFossilWorkbench: { value: fossils }
    }));
    return { catalog, stash, workspace, fossils };
}
