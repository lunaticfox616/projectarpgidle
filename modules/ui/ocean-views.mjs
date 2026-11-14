import { createFishingView } from './fishing-view.mjs';
import { createOceanDiveView } from './ocean-dive-view.mjs';

/** The workshop and dive panel share one fishing view for upgrade refresh and navigation. */
export function createOceanViews(deps) {
    const fishing = createFishingView(deps);
    const dive = createOceanDiveView(Object.create(deps, { fishingUi: { value: fishing } }));
    return { fishing, dive };
}
