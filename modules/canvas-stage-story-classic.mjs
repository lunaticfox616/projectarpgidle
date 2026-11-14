import { createStageStory } from './rendering/stage-story.mjs';

const native = createStageStory({
    get STAGE_STORY_ART() { return STAGE_STORY_ART; },
    get stageAssetRetry() { return stageAssetRetry; },
    get stageDots() { return stageDots; },
    get performance() { return performance; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationDoors() { return actExplorationDoors; },
    get STAGE_STORY() { return STAGE_STORY; },
    get stageActors() { return stageActors; },
    get stageRoster() { return stageRoster.renderer; },
    get document() { return document; }
});
const stageStory = Object.freeze({
    append: (actors, state) => native.append(game, actors, state),
    draw: native.draw,
    revive: native.revive,
    drawRevive: (ctx, enemy, p, rise) => native.drawRevive(game, ctx, enemy, p, rise),
    drawObject: (ctx, look, at) => native.drawObject(game, ctx, look, at),
    outlineObject: (ctx, look, at, colour) => native.outlineObject(game, ctx, look, at, colour),
    objectTop: (look, at) => native.objectTop(game, look, at),
    objects: Object.freeze({ drawObject: native.drawObject, outlineObject: native.outlineObject, objectTop: native.objectTop }),
    scenery: Object.freeze({ append: native.append, draw: (_owner, ctx, actor, state) => native.draw(ctx, actor, state) })
});
safeExposeGlobals({ stageStory });
