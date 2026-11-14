import { BattlefieldText } from './rendering/battlefield-text.mjs';
import { SkillEffectImages } from './rendering/skill-effect-images.mjs';
import { SkillEffectQueue } from './rendering/skill-effect-queue.mjs';
import { SkillEffectLayer } from './rendering/skill-effect-layer.mjs';
import { SkillImpactRenderer } from './rendering/skill-impact.mjs';
import { MeteorSpellPainter } from './rendering/meteor-spell.mjs';
import { AreaSpellPainter } from './rendering/area-spell.mjs';
import { CombatCellEffect } from './rendering/combat-cell-effect.mjs';
import { CombatTravelEffect } from './rendering/combat-travel-effect.mjs';
import { BattlefieldBody, bodyCueAnchor, bodyCueFromFx } from './rendering/battlefield-body.mjs';
import { BattlefieldLabels } from './rendering/battlefield-labels.mjs';
import { BattlefieldBars } from './rendering/battlefield-bars.mjs';
import { BattlefieldFeedbackTiming } from './rendering/battlefield-feedback-timing.mjs';
import { PlayerGridMotion } from './rendering/player-grid-motion.mjs';
import { PlayerReturnEffect } from './rendering/player-return-effect.mjs';
import { EnemyDeathRenderer } from './rendering/enemy-death.mjs';
import { BattlefieldHitFeedback } from './rendering/battlefield-hit-feedback.mjs';
import { EnemyFacing } from './rendering/enemy-facing.mjs';
import { BattlefieldEnemies } from './rendering/battlefield-enemies.mjs';
import { BattlefieldScreen } from './rendering/battlefield-screen.mjs';
import { BattlefieldBossBanner } from './rendering/battlefield-boss-banner.mjs';
import { BattlefieldEventEffects } from './rendering/battlefield-event-effects.mjs';
import { EnemyTelegraphs, enemyTelegraphColor } from './rendering/enemy-telegraphs.mjs';
import { BattlefieldGround } from './rendering/battlefield-ground.mjs';
import { PlayerFacing } from './rendering/player-facing.mjs';
import { BattlefieldActors } from './rendering/battlefield-actors.mjs';
import { BattlefieldPlayerFrame } from './rendering/battlefield-player-frame.mjs';
import { BattlefieldFrameEffects } from './rendering/battlefield-frame-effects.mjs';
import { BattlefieldRenderer } from './rendering/battlefield-renderer.mjs';

const text = new BattlefieldText({
    get i18n() { return i18n; },
    get tones() { return statToneText; },
    get drawText() { return drawCrispCanvasText; }
});
const body = new BattlefieldBody({
    get wispBarLift() { return wispActors.barLift; },
    get heroHeadY() { return getHeroHeadY; },
    get heroSizeScale() { return HERO_SIZE_SCALE; }
});
const labels = new BattlefieldLabels({
    get mechanics() { return COSMOS_MECHANIC_DB; },
    get habitats() { return COSMOS_ROUTE_G1.habitats; },
    get tones() { return statToneText; }
}, text);
const bars = new BattlefieldBars({
    get heroHeadY() { return getHeroHeadY; },
    get heroSizeScale() { return HERO_SIZE_SCALE; },
    get woodsmanActive() { return woodsmanView.active; },
    get readability() { return drawBattlePlayerFigure.readability; },
    get damageGhost() { return typeof updateEnemyHpDamageGhost === 'function' ? updateEnemyHpDamageGhost : null; },
    get drawnEntry() { return battleDrawList.drawnEntry; },
    get arrow() { return targetMarks.arrow; },
    get actorScale() { return stageActors.scaleFor; },
    get combatTime() { return getCombatTime; },
    get castBar() { return enemyAttackRules.castBar; },
    pendingAttacks: () => window.GameModules.state.combat.pendingEnemyCombatAttacks
}, body, labels, text);

// Preserve boot-time optional providers until the remaining compositor joins the native entry.
const runtimeFunction = name => {
    const provider = window[name];
    return typeof provider === 'function' && provider.__placeholderGlobal !== true ? provider : null;
};
const screen = new BattlefieldScreen({
    game: () => window.GameModules.state.game,
    effects: () => battleFx,
    get feedback() { return worldTreeSkillFx.feedback; },
    get feedbackProfile() { return typeof getBattleFeedbackProfile === 'function' ? getBattleFeedbackProfile : null; },
    get entrance() { return bossEntranceView; },
    get projectileImpact() { return stageProjectileImpact; },
    renderScale: () => typeof uiDisplay === 'object' && uiDisplay && uiDisplay.battleRenderScale,
    reducedEffects: () => uiDisplay.reducedEffects(),
    documentBody: () => typeof document !== 'undefined' ? document.body : null,
    roomGlow: () => typeof actExplorationView === 'object' ? actExplorationView.bossRoomGlow() : null,
    get redrawn() { return redrawnSkillFx; },
    get summons() { return wispSummonFx; },
    get remake() { return fxRemake; },
    get ocean() { return typeof stageOcean === 'object' ? stageOcean : undefined; },
    get readability() { return drawBattlePlayerFigure.readability; },
    get actors() { return stageActors; },
    get exploration() { return actExplorationState; }
}, bars);
const banner = new BattlefieldBossBanner({
    visual: () => battleVisualState,
    get entrance() { return bossEntranceView; },
    get bossMoves() { return bossMoves; },
    get i18n() { return i18n; },
    get _t() { return _t; },
    get stripEmoji() { return stripDecorativeEmoji; },
    get drawText() { return drawCrispCanvasText; },
    drawnEntry: boss => typeof battleDrawList === 'object' ? battleDrawList.drawnEntry(boss) : null
}, body, text);
const timing = new BattlefieldFeedbackTiming({
    get playerStats() { return runtimeFunction('getPlayerStats'); },
    get skillTargets() { return runtimeFunction('getSkillTargets'); },
    game: () => window.GameModules.state.game,
    now: () => typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(),
    get combatTime() { return getCombatTime; },
    visual: () => battleVisualState,
    effects: () => battleFx,
    skillProfile: name => getSkillGemVfxProfile(name),
    get feedbackProfile() { return getBattleFeedbackProfile; }
});
const movement = new PlayerGridMotion({
    get classes() { return typeof PLAYER_CLASS_DEFS === 'undefined' ? null : PLAYER_CLASS_DEFS; },
    get heroes() { return typeof HERO_SELECTION_DEFS === 'undefined' ? null : HERO_SELECTION_DEFS; },
    get moveIntervalSec() { return COMBAT_GRID_CONFIG.playerMoveIntervalSec; },
    get cellKey() { return gridCellKey; },
    effects: () => battleFx,
    visual: () => battleVisualState,
    run: () => actExplorationState.current(window.GameModules.state.game),
    get explorationMotion() { return actExplorationMotion; },
    get paused() { return isForegroundGameplayPausedForBackground; },
    get kickoffMs() { return STAGE_VIEW.kickoffMs; },
    get runes() { return typeof stageSkillRunes === 'object' ? stageSkillRunes : null; }
});
const returning = new PlayerReturnEffect({ reducedEffects: () => uiDisplay.reducedEffects() });
const playerFacing = new PlayerFacing({
    game: () => window.GameModules.state.game,
    visual: () => battleVisualState,
    effects: () => battleFx,
    get combatTime() { return getCombatTime; },
    skillRuntime: () => window.GameModules.state.combat.skillGemCombatRuntime,
    get mobility() { return mobilitySkill; },
    get actors() { return stageActors; }
});
const events = new BattlefieldEventEffects({
    get tree() { return worldTreeSkillFx; },
    get headY() { return getHeroHeadY; },
    get heroScale() { return HERO_SIZE_SCALE; },
    get _t() { return _t; },
    get drawText() { return drawCrispCanvasText; },
    get atlas() { return SKILL_FX_ATLAS; },
    get hitFx() { return drawBattleHitFx; }
}, text);
const telegraphs = new EnemyTelegraphs({
    get bossAttacks() { return bossAttackView; },
    get traps() { return trialTrapArt; },
    get projectFootprint() { return projectSkillFootprint; },
    get drawFootprint() { return drawSkillFootprintGround; },
    get woodsman() { return woodsmanView; },
    get sideEncounters() { return sideEncounterCanvas; },
    get bossMoves() { return bossMoveView; },
    observerZone: () => window.GameModules.state.game.currentZoneId === BEYOND_BOUNDARY_UNLOCK_BOSS_ID
});
const facing = new EnemyFacing({
    get bossMoves() { return bossMoveView; },
    get mobility() { return mobilitySkill; },
    get frontFacing() { return BOSS_ASSET_FRONT_FACING; }
});
const enemies = new BattlefieldEnemies({
    get bossDrawScale() { return BOSS_DRAW_SCALE; },
    get entrance() { return bossEntranceView; },
    get wisps() { return wispActors; },
    get monsters() { return monsterActors; },
    get woodsman() { return woodsmanBattle; },
    get woodsmanView() { return woodsmanView; },
    get ambush() { return enemyAmbushView; },
    get bossMoves() { return bossMoveView; },
    get stride() { return stageStride; },
    get attackRules() { return enemyAttackRules; },
    get drawSprite() { return drawEnemySprite; },
    visual: () => battleVisualState
}, facing);
const hits = new BattlefieldHitFeedback({
    game: () => window.GameModules.state.game,
    visual: () => battleVisualState,
    effects: () => battleFx,
    mildHits: () => window.GameModules.state.game.settings.hitEmphasis === 'mild' || uiDisplay.reducedEffects(),
    get damageText() { return spawnDamageText; },
    get hasCell() { return hasGridCell; },
    get roster() { return stageRoster; },
    get footprint() { return getGridUnitFootprint; }
}, body);
const death = new EnemyDeathRenderer({
    reducedEffects: () => uiDisplay.reducedEffects(),
    get story() { return stageStory; },
    get roster() { return stageRoster; },
    get feedback() { return worldTreeSkillFx.feedback; },
    facing: facing.direction.bind(facing),
    bossScale: enemies.bossScale.bind(enemies),
    drawAfterimage: enemies.afterimage.bind(enemies)
});

const images = new SkillEffectImages(() => document.createElement('canvas'));
const impacts = new SkillImpactRenderer({
    get color() { return getElementColor; },
    get signature() { return drawSkillSignatureImpact; },
    get ground() { return drawSkillFootprintGround; }
}, images);
const effectQueue = new SkillEffectQueue({
    profile: name => getSkillGemVfxProfile(name),
    visual: () => battleVisualState,
    effects: () => battleFx,
    get skills() { return typeof SKILL_DB === 'undefined' ? null : SKILL_DB; },
    get rules() { return typeof stageSkillRules === 'object' ? stageSkillRules : null; },
    get tree() { return worldTreeSkillFx; },
    get delivery() { return getSkillCombatDelivery; }
}, timing);
const effectLayer = new SkillEffectLayer({
    effects: () => battleVisualState.skillEffects,
    get image() { return getSkillGemVfxImage; },
    get atlas() { return SKILL_FX_ATLAS; },
    get remake() { return fxRemake; },
    get tree() { return worldTreeSkillFx; },
    get stage() { return typeof stageSkillVfx === 'object' ? stageSkillVfx : null; },
    get sigil() { return stageSkillSigil; },
    get bossMoves() { return bossMoveView; },
    get color() { return getElementColor; }
}, images, impacts);

// Shared read-only spell sources; live rendering records remain in the existing visual-state owner.
const spellSources = {
    profile: name => getSkillGemVfxProfile(name),
    get image() { return getSkillGemVfxImage; },
    get color() { return getElementColor; },
    get grids() { return typeof SKILL_GRID_DB === 'undefined' ? null : SKILL_GRID_DB; },
    get enemyProjectiles() { return enemyProjectileSprites; },
    get earthSpikes() { return drawEarthSpikeField; },
    get footprintGround() { return drawSkillFootprintGround; }
};
const cellEffects = new CombatCellEffect(spellSources, images,
    new AreaSpellPainter(spellSources), new MeteorSpellPainter(spellSources));
const travelEffects = new CombatTravelEffect({
    profile: name => getSkillGemVfxProfile(name),
    get image() { return getSkillGemVfxImage; },
    get color() { return getElementColor; },
    get grids() { return typeof SKILL_GRID_DB === 'undefined' ? null : SKILL_GRID_DB; },
    get enemyProjectiles() { return enemyProjectileSprites; },
    get rules() { return stageSkillRules; },
    get tree() { return worldTreeSkillFx; },
    get atlas() { return SKILL_FX_ATLAS; },
    get signature() { return drawSkillSignatureTravel; },
    get footprint() { return projectSkillFootprint; },
    game: () => window.GameModules.state.game,
    drawnHeight: enemy => body.drawnHeight(enemy),
    headOrigin: (...args) => stageRoster.headOrigin(...args)
}, images, cellEffects);

const ground = new BattlefieldGround({
    get cosmos() { return cosmosRouteRuntime; },
    get gridSize() { return getCombatGridSize; },
    get exploration() { return actExplorationState; },
    game: () => window.GameModules.state.game,
    get walkable() { return actExplorationMap.walkable; },
    get explorationView() { return actExplorationView; },
    get rings() { return stageRings; },
    get actors() { return stageActors; },
    get unitCells() { return getGridUnitCells; },
    get stride() { return stageStride; },
    visual: () => battleVisualState,
    get hasCell() { return hasGridCell; },
    get skillProfile() { return getSkillGridProfile; },
    get attackArea() { return getGridAttackAreaCells; },
    get cellKey() { return gridCellKey; },
    get sideEncounters() { return sideEncounterCanvas; },
    get combatTime() { return getCombatTime; },
    get traps() { return trialTrapArt; },
    get remake() { return fxRemake; },
    get stageEffects() { return typeof stageSkillVfx === 'object' ? stageSkillVfx : undefined; },
    get blessing() { return typeof stageBlessing === 'object' ? stageBlessing : undefined; },
    get tree() { return worldTreeSkillFx; },
    get redrawn() { return redrawnSkillFx; },
    get summons() { return wispSummonFx; },
    get ocean() { return typeof stageOcean === 'object' ? stageOcean : undefined; },
    get incidents() { return typeof stageIncidents === 'object' ? stageIncidents : undefined; },
    get drawSummons() { return drawActiveSummons; }
}, screen, travelEffects);

const actorLayer = new BattlefieldActors({
    get messageFrames() { return typeof messageFrames === 'object' ? messageFrames : undefined; },
    get actors() { return stageActors; },
    get doors() { return stageDoorMarks; },
    get roster() { return stageRoster; },
    get footprint() { return getGridUnitFootprint; },
    get layout() { return getBattleLayout; },
    get exploration() { return actExplorationView; },
    get drawList() { return battleDrawList; },
    effects: () => battleFx,
    get woodsman() { return woodsmanView; },
    get traps() { return trialTrapArt; },
    get entrance() { return bossEntranceView; },
    get readability() { return drawBattlePlayerFigure.readability; },
    get drawPlayer() { return window.drawBattlePlayerActor; },
    get drawEnemy() { return window.drawBattleEnemyActor; },
    get tree() { return worldTreeSkillFx; },
    get mirrored() { return isBattlePlayerMirrored; },
    get tintedPlayer() { return drawTintedBattlePlayerFigure; }
}, hits, body, returning);
const playerFrame = new BattlefieldPlayerFrame({
    game: () => window.GameModules.state.game,
    visual: () => battleVisualState,
    effects: () => battleFx,
    get appearance() { return typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId : null; },
    get skills() { return SKILL_DB; },
    get hasCell() { return hasGridCell; },
    get spawn() { return COMBAT_GRID_CONFIG.playerSpawn; }
}, timing, movement, playerFacing);
const frameEffects = new BattlefieldFrameEffects({
    get tree() { return worldTreeSkillFx; },
    get ambush() { return enemyAmbushView; },
    visual: () => battleVisualState,
    effects: () => battleFx,
    get playSkill() { return playSkillFromActiveGem; },
    get damageText() { return spawnDamageText; },
    get projectFootprint() { return projectSkillFootprint; },
    get atlas() { return SKILL_FX_ATLAS; },
    get spawnAttack() { return typeof attackFxSpawn === 'function' ? attackFxSpawn : undefined; },
    get playFeedback() { return typeof playUiFeedbackSound === 'function' ? playUiFeedbackSound : undefined; },
    get cleanupVisual() { return cleanupBattleVisualState; },
    get bossAttacks() { return bossAttackView; },
    get bossMoves() { return bossMoveView; }
}, { events, death, travel: travelEffects, telegraphs, timing, body, queue: effectQueue, layer: effectLayer, hits, enemies, facing });
const renderer = new BattlefieldRenderer({
    game: () => window.GameModules.state.game,
    visual: () => battleVisualState,
    effects: () => battleFx,
    get document() { return document; },
    get display() { return uiDisplay; },
    get resize() { return resizeBattlefieldCanvas; },
    get canvasBox() { return window.GameModules.battlefieldPresentation.canvasBox; },
    get assets() { return battleAssets; },
    autoload: () => window.__battleAssetAutoloadEnabled !== false,
    get initAssets() { return initBattleAssets; },
    now: () => performance.now(),
    get bossMoves() { return bossMoveView; },
    get tree() { return worldTreeSkillFx; },
    get cleanupFx() { return cleanupBattleFx; },
    get updateAttacks() { return typeof attackFxUpdate === 'function' ? attackFxUpdate : undefined; },
    get zone() { return getZone; },
    get theme() { return getBattleZoneTheme; },
    get projection() { return getBattleGridProjection; },
    get backdrop() { return drawBattleBackdrop; },
    get drawText() { return drawCrispCanvasText; },
    get _t() { return _t; },
    get skillVisual() { return getBattleSkillVisual; },
    get layout() { return getBattleLayout; },
    get drawList() { return battleDrawList; },
    get hasCell() { return hasGridCell; },
    get spawn() { return COMBAT_GRID_CONFIG.playerSpawn; },
    get loot() { return battleGroundLoot; },
    get projectile() { return drawVisualProjectile; },
    pending: () => window.GameModules.state.combat.pendingEnemyCombatAttacks,
    get bossAttacks() { return bossAttackView; },
    get frontSkills() { return window.drawSkillGemVfxLayer; },
    get woodsman() { return woodsmanView; },
    get drawAttacks() { return typeof attackFxDraw === 'function' ? attackFxDraw : undefined; },
    get stageScene() { return typeof stageScene === 'object' ? stageScene : undefined; },
    get drawDamage() { return drawDamageTexts; },
    get titleCard() { return actTitleCard; },
    get rooms() { return typeof stageRoomsView === 'object' ? stageRoomsView : undefined; },
    get explorationState() { return typeof actExplorationState === 'object' ? actExplorationState : undefined; },
    get barkEffect() { return getWorldTreeBarkEffect; },
    get setText() { return setElementText; },
    get explorationView() { return typeof actExplorationView === 'object' ? actExplorationView : undefined; },
    get warmup() { return stageWarmup; },
    get doors() { return stageDoorMarks; },
    get drawGround() { return window.drawBattleGroundLayer; }
}, { timing, screen, player: playerFrame, actors: actorLayer, enemies, telegraphs, hits, frameEffects,
    bars, banner, text, ground });

const getSkillGemVfxProfile = name => {
    const profiles = typeof SKILL_GEM_VFX_PROFILES === 'undefined' ? null : SKILL_GEM_VFX_PROFILES;
    return profiles && profiles[name] ? profiles[name] : null;
};
const battlePixelFont = text.font.bind(text);
const drawEnemyDeathFx = death.draw.bind(death);
const drawBossDefeat = death.boss.bind(death);
const drawCombatTravelFx = (ctx, fx, ...view) => {
    const [now, projection, playerPos, enemyPosMap] = view;
    return travelEffects.draw(ctx, fx, { now, projection, playerPos, enemyPosMap });
};
const isGroundSkillCast = travelEffects.isGround.bind(travelEffects);
const drawTrialTrapGridFx = telegraphs.trap.bind(telegraphs);
const getEnemyTelegraphColor = enemyTelegraphColor;
const drawBossPatternArea = telegraphs.pattern.bind(telegraphs);
const drawEnemyAttackTelegraphs = telegraphs.draw.bind(telegraphs);
const drawEliteNameplate = labels.draw.bind(labels);
const noteEnemyDrawnHeight = body.note.bind(body);
const getEnemyFieldBarLift = body.barLift.bind(body);
const getBodyCueAnchor = Object.assign((pos, height) => bodyCueAnchor(pos, height), { fromFx: bodyCueFromFx });
const getEnemyBodyHeight = body.enemyHeight.bind(body);
const updatePlayerGridVisualMotion = movement.update.bind(movement);
const getStageHeroAirGround = movement.airGround.bind(movement);
const drawPlayerReturnWarpEffect = returning.arrival.bind(returning);
const drawPlayerReturnDepartureEffect = returning.departure.bind(returning);
const drawPlayerReturnWhiteShroud = returning.shroud.bind(returning);
const getPlayerHurtPosition = hits.hurtPosition.bind(hits);
const resolveEnemyFacingDirection = facing.direction.bind(facing);
const noteEnemySpriteSide = facing.note.bind(facing);
const shouldMirrorEnemySprite = facing.mirror.bind(facing);
const getBossDrawScale = enemies.bossScale.bind(enemies);
const drawBattleActorLayer = actorLayer.draw.bind(actorLayer);
const getMapMonstersLeft = renderer.monstersLeft.bind(renderer);
const renderBattlefield = renderer.render.bind(renderer);
const getBattleCameraShake = screen.shake.bind(screen);
const drawBattleScreenGrade = screen.grade.bind(screen);
const drawBattleLightingAndBars = screen.finish.bind(screen);
const drawLockOnMark = bars.lockOn.bind(bars);
const updateBossAnnouncement = banner.update.bind(banner);
const drawBossAnnouncement = banner.draw.bind(banner);
const getEnemyDisplayName = banner.displayName.bind(banner);
const getEnemyTraitSummary = banner.traits.bind(banner);
const resolveStageStrikeSide = playerFacing.strikeSide.bind(playerFacing);
const drawBattleGroundLayer = ground.draw.bind(ground);
const drawSkillGemVfxLayer = effectLayer.draw.bind(effectLayer);
const drawBattlePlayerActor = actorLayer.player.bind(actorLayer);
const drawBattleEnemyActor = enemies.draw.bind(enemies);
drawEliteNameplate.presentation = labels.presentation.bind(labels);

window.GameModules.battlefieldHud = Object.freeze({
    drawnEnemyHeight: body.drawnHeight.bind(body),
    dispose: () => { timing.dispose(); body.dispose(); labels.dispose(); bars.dispose(); images.dispose(); hits.dispose(); facing.dispose(); playerFacing.dispose(); }
});
// Publish the render entry last: resolving its boot fallback may immediately draw a queued frame.
// Public classic consumers remain at this adapter; the frame pipeline itself is native ESM.
safeExposeGlobals({ battlePixelFont, drawEnemyDeathFx, drawBossDefeat, drawCombatTravelFx, isGroundSkillCast, drawTrialTrapGridFx, getEnemyTelegraphColor, drawBossPatternArea, drawEnemyAttackTelegraphs, drawEliteNameplate, noteEnemyDrawnHeight, getEnemyFieldBarLift, getBodyCueAnchor, getEnemyBodyHeight, updatePlayerGridVisualMotion, getStageHeroAirGround, drawPlayerReturnWarpEffect, drawPlayerReturnDepartureEffect, drawPlayerReturnWhiteShroud, getPlayerHurtPosition, resolveEnemyFacingDirection, noteEnemySpriteSide, shouldMirrorEnemySprite, getBossDrawScale, drawBattleActorLayer, getMapMonstersLeft, getBattleCameraShake, drawBattleScreenGrade, drawBattleLightingAndBars, drawLockOnMark, updateBossAnnouncement, drawBossAnnouncement, getEnemyDisplayName, getEnemyTraitSummary, resolveStageStrikeSide, drawBattleGroundLayer, drawSkillGemVfxLayer, drawBattlePlayerActor, drawBattleEnemyActor });
safeExposeGlobals({ renderBattlefield });
