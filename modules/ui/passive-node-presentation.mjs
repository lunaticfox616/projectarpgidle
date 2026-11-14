import { createPassiveIconFamily, PASSIVE_ICON_ATLAS_CELL, PASSIVE_TREE_FRAME_SHEET } from '../data/passive-node-art.mjs';
import { getPassiveNodeDisplayName, getPassiveEffectLabel, getPassiveKindLabel } from './passive-node-description.mjs';
import { getPassiveNodeVisualRadius, getPassiveStatAccent, tracePassiveLinkSegment, getPassiveNodeIconFamily, getPassiveTreeArtImage, getPassiveNodeAtlasArt, isPassiveFramedNode, isPassiveImageSlotNode } from '../rendering/passive-node-art.mjs';
import { drawPassiveNodeIcon } from '../rendering/passive-node-glyphs.mjs';

/** One presentation service per passive scene; image readiness is read from the existing asset owner. */
export function createPassiveNodePresentation(deps) {
    const runtime = { deps, iconFamily: createPassiveIconFamily(deps.WEAPON_CONDITION_STATS) };
    return Object.freeze({
        iconFamily: runtime.iconFamily, iconAtlasCell: PASSIVE_ICON_ATLAS_CELL, frameSheet: PASSIVE_TREE_FRAME_SHEET,
        getPassiveNodeDisplayName: getPassiveNodeDisplayName.bind(undefined, runtime),
        getPassiveEffectLabel: getPassiveEffectLabel.bind(undefined, runtime),
        getPassiveKindLabel,
        getPassiveNodeVisualRadius,
        getPassiveStatAccent,
        tracePassiveLinkSegment,
        getPassiveNodeIconFamily: getPassiveNodeIconFamily.bind(undefined, runtime),
        getPassiveTreeArtImage: getPassiveTreeArtImage.bind(undefined, runtime),
        getPassiveNodeAtlasArt: getPassiveNodeAtlasArt.bind(undefined, runtime),
        isPassiveFramedNode,
        isPassiveImageSlotNode,
        drawPassiveNodeIcon: drawPassiveNodeIcon.bind(undefined, runtime)
    });
}
