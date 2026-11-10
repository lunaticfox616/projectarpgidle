// 전장 그리기(옛 보드): 격자 투영, 배경, 주인공과 몬스터 그림, 타격 효과 (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function resizeBattlefieldCanvas() {
    const canvas = document.getElementById('battlefield-canvas');
    if (!canvas || canvas.offsetParent === null) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return;
    const cssWidth = Math.max(1, Math.round(rect.width / uiDisplay.factor || 1));
    const cssHeight = Math.max(1, Math.round(rect.height / uiDisplay.factor || 1));
    const dpr = uiDisplay.battleRenderScale;
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.dataset.renderScale = String(dpr);
    lastBattlefieldCanvasSize = { width: cssWidth, height: cssHeight, dpr };
    if (typeof battleCanvasBox === 'object') battleCanvasBox.forget();
}

// ACT 맵과 9x8 판정은 같은 변환을 쓴다. grid-contain은 장식만 잘라내고 전투 칸 전체를 보인다.
function getBattleGridProjection(width, height, fitMode) {
    if(actExplorationState.current(game))return actExplorationView.projection(width,height);
    return getStageBoardProjection(width,height,fitMode) || getFixedBattleGridProjection(width,height,fitMode);
}

/** 옆에서 보는 무대의 고정 전장(js/canvas-stage-board.js): 그 구역의 무대 그림이 있으면 방 하나처럼 놓는다. 전장을 그리는 쪽만 묻는다. */
function getStageBoardProjection(width,height,fitMode) {
    return fitMode==='grid-contain' && typeof stageBoard==='object' ? stageBoard.projection(width,height,getZone(game.currentZoneId)) : null;
}

function drawStageBoardBackdrop(ctx,width,height,gridProj) {
    return typeof stageBoard==='object' && stageBoard.background(ctx,gridProj,{width,height});
}

function getFixedBattleGridProjection(width,height,fitMode) {
    const layout = ACT_BATTLE_MAP_LAYOUT;
    const gridContain = fitMode === 'grid-contain';
    const contain = fitMode === 'contain' || gridContain;
    // 옆에서 보는 무대(data/stage-view.js): 세로(깊이)만 depth배로 눌러 그린다. 배경 그림과 칸이 함께 눌리고, 남는 높이만큼 무대가 커진다.
    const depth = stageView.depth();
    const frameLeft = gridContain ? layout.gridOriginX - 48 : 0;
    const frameTop = gridContain ? layout.gridOriginY - 64 : 0;
    const frameWidth = gridContain ? layout.columns * layout.cellWidth + 96 : layout.width;
    const frameHeight = (gridContain ? layout.rows * layout.cellHeight + 112 : layout.height) * depth;
    const scale = contain
        ? Math.min(width / frameWidth, height / frameHeight)
        : Math.max(width / layout.width, height / (layout.height * depth)) * layout.viewScale;
    const deep = scale * depth;
    const mapWidth = layout.width * scale;
    const mapHeight = layout.height * deep;
    const frameX = (width - frameWidth * scale) / 2;
    const frameY = gridContain ? (height - frameHeight * scale) / 2 : height - frameHeight * scale;
    const mapX = contain ? frameX - frameLeft * scale : (width - mapWidth) / 2;
    const mapY = contain ? frameY - frameTop * deep : (height - mapHeight) / 2;
    const tileW = layout.cellWidth * scale;
    const tileH = layout.cellHeight * deep;
    return {
        tileW,
        tileH,
        actorGroundOffsetY: Math.round(tileH * 0.22),
        mapX,
        mapY,
        mapWidth,
        mapHeight,
        cellToScreen(gx, gy) {
            return {
                x: mapX + (layout.gridOriginX + (gx + 0.5) * layout.cellWidth) * scale,
                y: mapY + (layout.gridOriginY + (gy + 0.5) * layout.cellHeight) * deep
            };
        }
    };
}

function getBattleLayout(enemies, width, height, projection) {
    let list = enemies || [];
    if (list.length === 0) return [];
    let proj = projection || getBattleGridProjection(width, height);
    let fallbackCell = COMBAT_GRID_CONFIG.bossSpawn;
    return list.map(enemy => {
        let cell = hasGridCell(enemy) ? enemy : fallbackCell;
        let center = hasGridCell(enemy) ? getGridUnitCenter(enemy) : cell;
        let footprint = hasGridCell(enemy) ? getGridUnitFootprint(enemy) : { columns: 1, rows: 1 };
        // 다칸 유닛의 몸은 점유 영역 중앙에 두되, 발은 마지막 행의 중앙을 딛게 한다.
        // 2x2 보스가 네 칸 사이 교차점 위에 떠 있는 듯 보이는 것을 막는다.
        let groundCell = {
            gx: center.gx,
            gy: center.gy + (footprint.rows - 1) / 2
        };
        let pos = proj.cellToScreen(groundCell.gx, groundCell.gy);
        return { enemy: enemy, x: pos.x, y: pos.y + proj.actorGroundOffsetY };
    }).sort((a, b) => a.y - b.y || (a.enemy.id - b.enemy.id));
}

function getBattleZoneTheme(zone) {
    zone = zone || getZone(game.currentZoneId);
    let theme = {
        skyTop: '#17324c',
        skyBottom: '#0c1b28',
        floorA: '#245a3b',
        floorB: '#2d6b48',
        pathA: '#355d46',
        pathB: '#3f6c54',
        propA: '#7cb86f',
        propB: '#4e8f52',
        accent: '#d7f0a1',
        ruin: '#6f876b',
        water: '#183b57',
        mist: 'rgba(173,223,255,0.08)'
    };
    if (zone.ele === 'fire') {
        theme = { skyTop: '#4a2419', skyBottom: '#1d1010', floorA: '#5e3224', floorB: '#70392a', pathA: '#744436', pathB: '#8a5540', propA: '#f59e55', propB: '#9b3f2d', accent: '#ffcf72', ruin: '#7f5a47', water: '#4b170f', mist: 'rgba(255,149,91,0.08)' };
    } else if (zone.ele === 'cold') {
        theme = { skyTop: '#18354d', skyBottom: '#0f1828', floorA: '#506b86', floorB: '#64839c', pathA: '#7897ae', pathB: '#88a7bc', propA: '#d7f7ff', propB: '#9cd7ea', accent: '#effcff', ruin: '#8d9eb1', water: '#244c6b', mist: 'rgba(219,250,255,0.12)' };
    } else if (zone.ele === 'light') {
        theme = { skyTop: '#25344f', skyBottom: '#121626', floorA: '#61613e', floorB: '#706d46', pathA: '#7f7a4b', pathB: '#978f57', propA: '#ffe27d', propB: '#d7bf58', accent: '#fff4a8', ruin: '#918764', water: '#3a4465', mist: 'rgba(255,235,158,0.09)' };
    } else if (zone.ele === 'chaos') {
        theme = { skyTop: '#25173b', skyBottom: '#0f0a1a', floorA: '#35244d', floorB: '#473065', pathA: '#563776', pathB: '#654589', propA: '#b98cff', propB: '#7b59be', accent: '#f2d1ff', ruin: '#6d5b84', water: '#271f3a', mist: 'rgba(193,140,255,0.08)' };
    }
    if (zone.type === 'trial') {
        theme.pathA = '#7f6840';
        theme.pathB = '#9f8251';
        theme.accent = '#ffe2a4';
        theme.ruin = '#9a7d54';
    } else if (zone.type === 'abyss') {
        theme.skyTop = '#111421';
        theme.skyBottom = '#07080d';
        theme.floorA = '#1c2431';
        theme.floorB = '#252f3d';
        theme.pathA = '#30394a';
        theme.pathB = '#3b4660';
        theme.mist = 'rgba(126,162,255,0.07)';
    } else if (zone.type === 'meteor') {
        theme.skyTop = '#1a1026';
        theme.skyBottom = '#07050c';
        theme.floorA = '#241736';
        theme.floorB = '#332248';
        theme.pathA = '#4a2f68';
        theme.pathB = '#5c3a78';
        theme.mist = 'rgba(189,120,255,0.1)';
    }
    return theme;
}

function getBattleSkillVisual(skillName, skillData) {
    skillData = skillData || SKILL_DB[skillName] || SKILL_DB['기본 공격'];
    let rawTags = Array.isArray(skillData.tags) ? skillData.tags : [];
    let ele = String(skillData.ele || '').toLowerCase();
    let targetMode = String(skillData.targetMode || '').toLowerCase();
    let cacheKey = `${skillName || ''}|${ele}|${targetMode}|${rawTags.join('/')}`;
    if (battleSkillVisualCache.key === cacheKey && battleSkillVisualCache.value) return battleSkillVisualCache.value;
    let tags = rawTags.map(tag => String(tag).toLowerCase());
    let group = 'physical';
    let primary = '#d7dde6';
    let secondary = '#ffffff';
    let aura = null;
    if (tags.includes('chaos') || ele === 'chaos') {
        group = 'chaos';
        primary = '#ba83ff';
        secondary = '#f2ddff';
        aura = 'rgba(176,118,255,0.16)';
    } else if (tags.includes('cold') || ele === 'cold') {
        group = 'cold';
        primary = '#8de7ff';
        secondary = '#eefbff';
        aura = 'rgba(133,235,255,0.14)';
    } else if (tags.includes('lightning') || tags.includes('light') || ele === 'light' || ele === 'lightning') {
        group = 'lightning';
        primary = '#ffd84f';
        secondary = '#fff7cc';
        aura = 'rgba(255,216,79,0.14)';
    } else if (tags.includes('fire') || ele === 'fire') {
        group = 'fire';
        primary = '#ff8a4a';
        secondary = '#ffe3b0';
        aura = 'rgba(255,126,74,0.14)';
    } else if (tags.includes('physical') && tags.includes('slam')) {
        group = 'physical_slam';
        primary = '#c7a27b';
        secondary = '#f3e1cf';
    }
    const normalizedName = String(skillName || '').toLowerCase();
    let variant = 'melee';
    if (tags.includes('corpse') || tags.includes('corpse_explosion') || normalizedName.includes('시체')) variant = 'corpse_burst';
    else if (tags.includes('slam')) variant = 'slam';
    else if (tags.includes('chain') || targetMode === 'chain') variant = 'chain';
    else if (tags.includes('pierce') || targetMode === 'pierce') variant = 'pierce';
    else if (tags.includes('summon') || targetMode === 'summon') variant = 'summon';
    else if (tags.includes('dot')) variant = 'dot';
    else if (tags.includes('aoe') || targetMode === 'all' || targetMode === 'whirl') variant = 'nova';
    else if (tags.includes('projectile') || targetMode === 'projectile') variant = 'projectile';
    let visual = {
        pose: tags.includes('projectile') ? 'bow' : 'sword',
        group: group,
        effect: group,
        primary: primary,
        secondary: secondary,
        aura: aura,
        isSlam: variant === 'slam',
        variant: variant,
        targetMode: targetMode,
        tags: tags
    };
    battleSkillVisualCache = { key: cacheKey, value: visual };
    return visual;
}

function drawBattleBackdrop(ctx, width, height, theme, now, zone, gridProj) {
    if(actExplorationView.background(ctx,width,height,gridProj))return true;
    if(drawStageBoardBackdrop(ctx,width,height,gridProj))return true;
    // 무대에서 지도가 아직 없는 순간(부팅, 구역을 여는 중)은 그림을 기다리는 방처럼 어둠만 둔다.
    ctx.fillStyle='#0b090c';ctx.fillRect(0,0,width,height);return true;
}

function getLocalBattleHeroVisualTuning(spriteScale) {
    const defaultTuning = {
        baseHeight: 63,
        minHeight: 58,
        maxHeight: 71,
        downShrink: 7,
        minScaleBoost: 0.56,
        maxScaleBoost: 1.12,
        shadowWidth: 11.5,
        shadowHeight: 4.6,
        shadowAlpha: 0.18,
        offsetY: 0
    };
    const tuningByHero = {
        hero1: { baseHeight: 63, maxHeight: 71 },
        hero2: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 },
        hero3: { baseHeight: 63, maxHeight: 71 },
        hero4: { baseHeight: 62, maxHeight: 70 },
        hero5: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 },
        hero6: { baseHeight: 62, maxHeight: 70 },
        hero7: { baseHeight: 63, maxHeight: 71 },
        hero8: { baseHeight: 65, maxHeight: 73, shadowWidth: 12.5 },
        hero9: { baseHeight: 63, maxHeight: 71 },
        hero10: { baseHeight: 63, maxHeight: 71 },
        occultist: { baseHeight: 63, maxHeight: 71 },
        wanderer: { baseHeight: 63, maxHeight: 71 },
        cleric: { baseHeight: 64, maxHeight: 72 },
        archer: { baseHeight: 63, maxHeight: 71 },
        alchemist: { baseHeight: 63, maxHeight: 71 },
        warrior: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 }
    };
    let heroId = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId;
    let tuning = { ...defaultTuning, ...(tuningByHero[heroId] || {}) };
    let requestedScale = Number(spriteScale);
    tuning.scaleBoost = Number.isFinite(requestedScale) && requestedScale > 0
        ? clampNumber(requestedScale / 1.85, tuning.minScaleBoost, tuning.maxScaleBoost)
        : 1;
    return tuning;
}

/**
 * @param {Array<Array<object>>} cycles
 * @param {?Array<number>} configuredWeights
 * @param {number} seed
 * @returns {?Array<object>}
 */
function pickAttackVariantCycle(cycles, configuredWeights, seed) {
    let variants = Array.isArray(cycles)
        ? cycles.filter(cycle => Array.isArray(cycle) && cycle.length > 0)
        : [];
    if (variants.length === 0) return null;
    let variantSeed = clampNumber(Number(seed) || 0, 0, 0.999999);
    let uniformVariant = variants[Math.floor(variantSeed * variants.length)];
    if (!Array.isArray(configuredWeights) || configuredWeights.length !== variants.length) {
        return uniformVariant;
    }
    let weights = configuredWeights.map(weight => Math.max(0, Number(weight) || 0));
    let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return uniformVariant;
    let weightedRoll = variantSeed * totalWeight;
    for (let index = 0; index < weights.length; index++) {
        weightedRoll -= weights[index];
        if (weightedRoll < 0) return variants[index];
    }
    return variants[variants.length - 1];
}

function drawPlayerSprite(ctx, x, y, scale, flash, swingPower, skillVisual, now, motionState) {
    let activeSkillPlayback = getSkillPlaybackState(now);
    if (battleAssets.images.hero) {
        motionState = motionState || {};
        let animationStats = motionState.playerStats || getUiPlayerStats();
        let advanceBlend = clampNumber(Number.isFinite(motionState.advanceBlend) ? motionState.advanceBlend : 0, 0, 1);
        let motionName = 'idle';
        let frameIndex = HERO_MOTIONS.idle[0];
        if (activeSkillPlayback && advanceBlend <= 0.08) {
            motionName = activeSkillPlayback.skillCfg.motion;
            frameIndex = activeSkillPlayback.frameIndex;
        } else {
            let attackBlend = clampNumber(Number.isFinite(motionState.attackBlend) ? motionState.attackBlend : 0, 0, 1);
            let hurtBlend = clampNumber(Number.isFinite(motionState.hurtBlend) ? motionState.hurtBlend : (flash ? 1 : 0), 0, 1);
            if (hurtBlend > 0.55) {
                motionName = 'idle';
            } else if (attackBlend > 0.2 || Math.abs(swingPower) > 0.16) {
                let effect = skillVisual && skillVisual.effect ? skillVisual.effect : 'slash';
                if (effect === 'arrow' || effect === 'projectile') motionName = 'bow';
                else if (effect === 'poisonDart' || effect === 'lightSpear') motionName = 'throw';
                else if (effect === 'chain' || effect === 'storm' || effect === 'iceLance' || effect === 'nova') motionName = 'cast';
                else motionName = 'slash';
            } else if (advanceBlend > 0.08) {
                motionName = advanceBlend > 0.6 ? 'run' : 'walk';
            } else {
                motionName = 'idle';
            }
            let frames = HERO_MOTIONS[motionName] || HERO_MOTIONS.idle;
            const _motionMs = { walk: 285, run: 190, slash: 160, throw: 170, cast: 180, bow: 175, hit: 200, idle: 320 };
            let _frameMs = _motionMs[motionName] || 220;
            if (motionName === 'walk' || motionName === 'run') {
                let moveSpeed = Number(animationStats.moveSpeed) || 100;
                let moveRatio = clampNumber(moveSpeed / 100, 0.6, 3.2);
                _frameMs = clampNumber(_frameMs / moveRatio, 62, 460);
            }
            let localFrame = Math.floor((now / _frameMs)) % frames.length;
            if ((motionName === 'walk' || motionName === 'run') && Number.isFinite(motionState.moveProgress)) {
                localFrame = Math.floor(clampNumber(motionState.moveProgress, 0, 0.999) * frames.length);
            }
            frameIndex = frames[localFrame];
        }
        let heroFrame = getSpriteFrameRectByIndex(battleAssets.images.hero, frameIndex, HERO_SPRITE_CONFIG);
        if (heroFrame) {
            let frameMeta = getHeroFrameMeta(frameIndex);
            let metrics = getHeroDrawMetrics(x, y, heroFrame, frameMeta);
            drawPixelShadow(ctx, x, y + 2, 11, 4, 0.18);
            ctx.save();
            ctx.filter = 'brightness(1.15) contrast(1.08) saturate(1.05)';
            ctx.drawImage(
                battleAssets.images.hero,
                heroFrame.sx, heroFrame.sy, heroFrame.sw, heroFrame.sh,
                metrics.dx, metrics.dy, metrics.drawW, metrics.drawH
            );
            ctx.restore();
            if (DEBUG_BATTLE_ANCHORS) {
                ctx.save();
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 1;
                ctx.strokeRect(metrics.dx, metrics.dy, metrics.drawW, metrics.drawH);
                let handX = metrics.dx + ((frameMeta.hand.x / 300) * heroFrame.sw) * metrics.scaleX;
                let handY = metrics.dy + ((frameMeta.hand.y / 300) * heroFrame.sh) * metrics.scaleY;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(handX, handY, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }
    }
    if (battleAssets.ready && battleAssets.atlas && battleAssets.atlas.hero) {
        motionState = motionState || {};
        let animationStats = motionState.playerStats || getUiPlayerStats();
        let frames = battleAssets.atlas.hero.frames;
        let bodyClips = frames.characterAnimations || {};
        let clipLoop = frames.clipLoop || {};
        let advanceBlend = clampNumber(Number.isFinite(motionState.advanceBlend) ? motionState.advanceBlend : 0, 0, 1);
        let isAdvancing = advanceBlend > 0.08;
        let moveProgress = clampNumber(Number(motionState.moveProgress) || 0, 0, 1);
        let hurtBlend = clampNumber(Number.isFinite(motionState.hurtBlend) ? motionState.hurtBlend : (flash ? 1 : 0), 0, 1);
        let downFx = battleFx.filter(fx => fx.type === 'playerDown' && now - fx.start <= fx.duration).slice(-1)[0];
        let downPhase = downFx ? clampNumber((now - downFx.start) / downFx.duration, 0, 0.999) : null;
        let downBlend = clampNumber(Number.isFinite(motionState.downBlend) ? motionState.downBlend : (downPhase !== null ? 1 : 0), 0, 1);
        // 칸을 좁히는 동안 남은 타격 이펙트가 있어도 공격 포즈로 미끄러지지 않게
        // 걷기 상태를 우선한다. 공격은 실제 이동이 끝난 다음 프레임부터 재개한다.
        let isAttacking = !isAdvancing && motionState.attackActive === true;
        let defaultIdleCycle = Array.isArray(bodyClips.idle) && bodyClips.idle.length > 0 ? bodyClips.idle : (Array.isArray(frames.idle) && frames.idle.length > 0 ? frames.idle : [frames.sideIdle, frames.frontIdle, frames.frontGuard].filter(Boolean));
        let facingDirection = motionState.facingDirection || motionState.attackDirection || 'east';
        let directionalIdles = bodyClips.idleDirections || frames.idleDirections || {};
        let idleCycle = Array.isArray(directionalIdles[facingDirection])
            && directionalIdles[facingDirection].length > 0
            ? directionalIdles[facingDirection]
            : defaultIdleCycle;
        let defaultWalkCycle = Array.isArray(bodyClips.walk_or_run) && bodyClips.walk_or_run.length > 0 ? bodyClips.walk_or_run : (Array.isArray(frames.walk) && frames.walk.length > 0 ? frames.walk : [frames.sideWalk, frames.sideIdle, frames.frontGuard].filter(Boolean));
        let directionalWalks = bodyClips.walkDirections || frames.walkDirections || {};
        let walkCycle = Array.isArray(directionalWalks[motionState.moveDirection])
            && directionalWalks[motionState.moveDirection].length > 0
            ? directionalWalks[motionState.moveDirection]
            : defaultWalkCycle;
        let runCycle = walkCycle;
        let hurtCycle = Array.isArray(bodyClips.hurt) && bodyClips.hurt.length > 0 ? bodyClips.hurt : (Array.isArray(frames.hurt) && frames.hurt.length > 0 ? frames.hurt : [frames.frontGuard, frames.sideIdle].filter(Boolean));
        let downCycle = Array.isArray(bodyClips.down_or_knockdown) && bodyClips.down_or_knockdown.length > 0 ? bodyClips.down_or_knockdown : (Array.isArray(frames.down) && frames.down.length > 0 ? frames.down : hurtCycle);
        function pickCycle(list, speed, phaseOffset) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let baseSpeed = speed || 110;
            let sequenceSpeedScale = sequence.length <= 3 ? 1.32 : (sequence.length <= 5 ? 1.14 : 1);
            let adjustedSpeed = baseSpeed * sequenceSpeedScale;
            let phase = ((now / adjustedSpeed) + (phaseOffset || 0)) % sequence.length;
            return sequence[Math.floor(phase)];
        }
        function pickProgressFrame(list, phase) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let idx = Math.floor(clampNumber(phase, 0, 0.999) * sequence.length);
            return sequence[clampNumber(idx, 0, sequence.length - 1)];
        }
        function pickSkillAttackCycle() {
            let directionalAttacks = bodyClips.attackDirections || frames.attackDirections || {};
            let directionVariants = directionalAttacks[motionState.attackDirection];
            let attackVariant = pickAttackVariantCycle(
                Array.isArray(directionVariants) ? directionVariants : frames.attackVariants,
                frames.attackVariantWeights,
                motionState.attackVariantSeed
            );
            if (attackVariant) return attackVariant;
            let activeSkillName = game && typeof game.activeSkill === 'string' ? game.activeSkill : '';
            let activeSkillData = (SKILL_DB && activeSkillName && SKILL_DB[activeSkillName]) ? SKILL_DB[activeSkillName] : null;
            let activeTags = activeSkillData && Array.isArray(activeSkillData.tags)
                ? activeSkillData.tags.map(tag => String(tag).toLowerCase())
                : [];
            let isSlamGem = activeTags.includes('slam');
            if (isSlamGem && Array.isArray(frames.greatswordCombo) && frames.greatswordCombo.length > 0) {
                return frames.greatswordCombo;
            }
            if (!isSlamGem && Array.isArray(frames.quakeCombo) && frames.quakeCombo.length > 0) {
                return frames.quakeCombo;
            }
            if (Array.isArray(bodyClips.sword_attack_body) && bodyClips.sword_attack_body.length > 0) {
                return bodyClips.sword_attack_body;
            }
            return frames.swordCombo || frames.greatswordCombo || frames.quakeCombo || frames.castCombo || frames.bowCombo || frames.projectileCombo || frames.whirlCombo;
        }
        function pickAttackFrame(list) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let attackProgress = Number.isFinite(motionState.attackProgress) ? motionState.attackProgress : Math.abs(swingPower);
            let phase = clampNumber(attackProgress, 0, 0.999);
            let idx = Math.floor(phase * sequence.length);
            if (clipLoop.sword_attack_body === true) {
                let aspd = Math.max(0.1, Number(animationStats.aspd) || 1);
                let loopFrameMs = clampNumber(120 / aspd, 38, 170);
                idx = Math.floor((now / loopFrameMs) % sequence.length);
            }
            return sequence[clampNumber(idx, 0, sequence.length - 1)];
        }
        let idleFrame = pickCycle(idleCycle, 920, 0);
        let moveStat = Math.max(70, Number(animationStats.move) || 100);
        let moveRatio = clampNumber(moveStat / 100, 0.85, 2.25);
        let walkSequenceLength = Math.max(1, walkCycle.length || 1);
        let walkCycleDuration = clampNumber(960 / moveRatio, 560, 1130);
        let moveFrameDuration = clampNumber(walkCycleDuration / walkSequenceLength, 45, 105);
        let walkFrame = pickCycle(walkCycle, moveFrameDuration, 0);
        let movingFrame = Number.isFinite(motionState.moveProgress)
            ? pickProgressFrame(runCycle, moveProgress)
            : (pickCycle(runCycle, moveFrameDuration, 0) || walkFrame);
        let frame = downPhase !== null || downBlend > 0.24
            ? pickProgressFrame(downCycle, downPhase !== null ? downPhase : clampNumber(downBlend * 0.999, 0, 0.999))
            : (advanceBlend > 0.08 ? movingFrame : idleFrame);
        if (downPhase === null && hurtBlend > 0.8 && !isAttacking && hurtCycle.length > 0) {
            frame = ['north', 'south'].includes(facingDirection) ? idleFrame : hurtCycle[0];
        }
        if (downPhase === null && isAttacking) {
            frame = pickAttackFrame(pickSkillAttackCycle());
        }
        let walkMotion = downPhase === null && advanceBlend > 0.08 && typeof getPlayableHeroWalkMotion === 'function'
            ? getPlayableHeroWalkMotion(getHeroAppearanceId(), moveProgress, advanceBlend)
            : { x: 0, y: 0 };
        let localHeroTuning = getLocalBattleHeroVisualTuning(scale);
        let heroScaleBoost = localHeroTuning.scaleBoost;
        let normalizedHeroSize = (localHeroTuning.baseHeight * heroScaleBoost) - downBlend * localHeroTuning.downShrink;
        let scaledMinHeight = localHeroTuning.minHeight * Math.min(1, heroScaleBoost);
        normalizedHeroSize = clampNumber(normalizedHeroSize, scaledMinHeight, localHeroTuning.maxHeight) * HERO_SIZE_SCALE;
        drawPixelShadow(ctx, x, y + 2, localHeroTuning.shadowWidth * heroScaleBoost * HERO_SIZE_SCALE, localHeroTuning.shadowHeight * heroScaleBoost * HERO_SIZE_SCALE, localHeroTuning.shadowAlpha);
        let drawOptions = {
            alpha: downPhase !== null ? 0.98 : 1,
            smoothing: 'high',
            devicePixelSnap: true,
            outlineColor: '#ddd6bd',
            outlineAlpha: 0.22,
            outlineThickness: 0.5
        };
        drawBattleSprite(ctx, battleAssets.atlas.hero.image, frame, x + walkMotion.x, y + walkMotion.y + localHeroTuning.offsetY - advanceBlend * 0.18 + hurtBlend * 0.08 + downBlend * 2.2, normalizedHeroSize, drawOptions);
        if (flash && downPhase === null) {
            ctx.save();
            ctx.globalAlpha = 0.42;
            ctx.strokeStyle = '#dff6ff';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - 11, y - 10);
            ctx.lineTo(x - 3, y - 16);
            ctx.moveTo(x + 2, y - 14);
            ctx.lineTo(x + 10, y - 19);
            ctx.moveTo(x - 9, y - 1);
            ctx.lineTo(x - 2, y - 7);
            ctx.stroke();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#dff6ff';
            ctx.fillRect(Math.round(x - 4), Math.round(y - 15), 8, 2);
            ctx.restore();
        }
        return;
    }
    let s = scale;
    let bob = Math.sin(now / 180) * 0.7 * s;
    let tunic = flash ? '#9fe5ff' : '#4f7cff';
    let trim = flash ? '#fefefe' : '#dff3ff';
    let shield = '#f2d27c';
    drawPixelShadow(ctx, x, y + 18 * s, 13 * s, 5 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.fillStyle = '#2f4571';
    ctx.fillRect(-4 * s, 4 * s, 3 * s, 5 * s);
    ctx.fillRect(1 * s, 4 * s, 3 * s, 5 * s);
    ctx.fillStyle = tunic;
    ctx.fillRect(-5 * s, -4 * s, 10 * s, 10 * s);
    ctx.fillStyle = '#28456b';
    ctx.fillRect(-3 * s, 2 * s, 6 * s, 4 * s);
    ctx.fillStyle = trim;
    ctx.fillRect(-4 * s, -2 * s, 8 * s, 2 * s);
    ctx.fillStyle = '#f0c79a';
    ctx.fillRect(-4 * s, -11 * s, 8 * s, 7 * s);
    ctx.fillStyle = '#7c4e2e';
    ctx.fillRect(-5 * s, -13 * s, 10 * s, 4 * s);
    ctx.fillStyle = '#b8d2ff';
    ctx.fillRect(-8 * s, -1 * s, 3 * s, 5 * s);
    ctx.fillStyle = shield;
    ctx.fillRect(-11 * s, -1 * s, 3 * s, 6 * s);
    ctx.fillStyle = '#cfa44f';
    ctx.fillRect(-10 * s, 1 * s, 1 * s, 2 * s);

    let handOffset = 4 * s + swingPower * 4 * s;
    ctx.fillStyle = '#f0c79a';
    ctx.fillRect(5 * s, -1 * s, 3 * s, 5 * s);
    if (skillVisual.pose === 'hammer') {
        ctx.fillStyle = '#9c7a4a';
        ctx.fillRect(8 * s, -1 * s, 8 * s + handOffset, 2 * s);
        ctx.fillStyle = '#d3d8e5';
        ctx.fillRect(14 * s + handOffset, -4 * s, 6 * s, 8 * s);
    } else if (skillVisual.pose === 'spear') {
        ctx.fillStyle = '#9c7a4a';
        ctx.fillRect(8 * s, 0, 12 * s + handOffset, 1.5 * s);
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(19 * s + handOffset, -2 * s, 6 * s, 5 * s);
    } else if (skillVisual.pose === 'staff') {
        ctx.fillStyle = '#846038';
        ctx.fillRect(8 * s, -3 * s, 2 * s, 11 * s);
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(8 * s, -7 * s, 4 * s, 4 * s);
    } else if (skillVisual.pose === 'bow') {
        ctx.strokeStyle = '#d1b37a';
        ctx.lineWidth = Math.max(2, 1.5 * s);
        ctx.beginPath();
        ctx.moveTo(11 * s, -5 * s);
        ctx.quadraticCurveTo(18 * s + handOffset, 0, 11 * s, 5 * s);
        ctx.stroke();
        ctx.strokeStyle = '#f1ede7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(11 * s, -5 * s);
        ctx.lineTo(11 * s, 5 * s);
        ctx.stroke();
    } else if (skillVisual.pose === 'throw') {
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(11 * s + handOffset, -2 * s, 5 * s, 3 * s);
    } else if (skillVisual.pose === 'dual' || skillVisual.pose === 'dagger') {
        ctx.fillStyle = '#f7efdc';
        ctx.fillRect(9 * s, -4 * s, 7 * s + handOffset, 2 * s);
        ctx.fillRect(7 * s, 3 * s, 5 * s + handOffset * 0.5, 2 * s);
    } else {
        ctx.fillStyle = '#f7efdc';
        ctx.fillRect(9 * s, -3 * s, 9 * s + handOffset, 2 * s);
        ctx.fillStyle = '#e2b25c';
        ctx.fillRect(7 * s, -3 * s, 2 * s, 3 * s);
    }
    ctx.restore();
}

function getBossAssetVariantEntry(enemy, enemyAtlas) {
    if (!enemy || !enemy.isBoss || !enemy.bossAssetKey || !enemyAtlas) return null;
    let bossImage = (enemyAtlas.bossImages || {})[enemy.bossAssetKey];
    if (!bossImage) return null;
    return {
        image: bossImage,
        frame: { x: 0, y: 0, width: bossImage.width, height: bossImage.height, basisHeight: bossImage.height }
    };
}

function pickBattleEnemyVariant(enemy, enemyAtlas) {
    if (!enemyAtlas) return null;
    let pools = enemyAtlas.variants || {};
    let frames = enemyAtlas.frames || {};
    let baseImage = enemyAtlas.image;
    let normalPool = (pools.normal || []).slice();
    let elitePool = (pools.elite || []).slice();
    let bossPool = (pools.boss || []).slice();
    if (normalPool.length === 0) {
        normalPool = [
            { image: baseImage, frame: frames.slime },
            { image: baseImage, frame: frames.bandit },
            { image: baseImage, frame: frames.shadow },
            { image: baseImage, frame: frames.wraith }
        ].filter(entry => entry.frame);
    }
    if (elitePool.length === 0) {
        elitePool = [
            { image: baseImage, frame: frames.knight },
            { image: baseImage, frame: frames.skeleton },
            { image: baseImage, frame: frames.shadow },
            { image: baseImage, frame: frames.wraith }
        ].filter(entry => entry.frame);
    }
    if (bossPool.length === 0) {
        bossPool = [
            { image: baseImage, frame: frames.boss },
            { image: baseImage, frame: frames.knight },
            { image: baseImage, frame: frames.skeleton }
        ].filter(entry => entry.frame);
    }
    let pool = enemy.isBoss ? bossPool : (enemy.isElite ? elitePool : normalPool);
    if (pool.length === 0) return null;
    return pickSeededEnemyVariant(enemy, pool);
}

/** The pool entry an enemy shows: its assigned variant when the pool has it, otherwise one picked by its seed and element. */
function pickSeededEnemyVariant(enemy, pool) {
    if (enemy.spriteVariantId) {
        let assignedVariant = pool.find(entry => entry && entry.id === enemy.spriteVariantId);
        if (assignedVariant) return assignedVariant;
    }
    let variantSeed = Math.abs(enemy.variantSeed || enemy.id || 1);
    let elementOffset = enemy.ele === 'fire' ? 1 : (enemy.ele === 'cold' ? 2 : (enemy.ele === 'light' ? 3 : (enemy.ele === 'chaos' ? 4 : 0)));
    return pool[(variantSeed + elementOffset) % pool.length];
}

function resolveEnemySpriteMotion(variantEntry, moving, now, enemy, attackMotion, facingDirection) {
    let directionalEntry = variantEntry && variantEntry.directions
        ? (variantEntry.directions[facingDirection] || variantEntry.directions.south)
        : variantEntry;
    let animations = directionalEntry && directionalEntry.animations;
    let attackFrames = Array.isArray(directionalEntry && directionalEntry.attackFrames)
        ? directionalEntry.attackFrames
        : (animations && Array.isArray(animations.attack) ? animations.attack : []);
    if (attackMotion && attackFrames.length > 0) {
        let index = Math.floor(clampNumber(attackMotion.progress, 0, 0.999) * attackFrames.length);
        return { entry: attackFrames[index] || {}, x: 0, y: 0 };
    }
    let movementFrames = Array.isArray(directionalEntry && directionalEntry.frames) ? directionalEntry.frames : [];
    let movementIndex = moving === true && movementFrames.length > 0
        ? Math.floor(((Number(now) || 0) + Math.abs(Number(enemy.variantSeed || enemy.id || 0)) * 41) / 190) % movementFrames.length
        : 0;
    return {
        entry: movementFrames[movementIndex] || {},
        x: attackMotion ? attackMotion.x : 0,
        y: attackMotion ? attackMotion.y : 0
    };
}

/** Sprite rim (data BATTLE_SPRITE_OUTLINES): bosses a stronger red, elites their trait colour, every other monster red. */
function getEnemyOutlineStyle(enemy) {
    // 보스 변이체(js/boss-variants.js)는 그 변이의 색 테.
    if (enemy.isBoss) return enemy.variantOutline ? { ...BATTLE_SPRITE_OUTLINES.boss, color: enemy.variantOutline } : BATTLE_SPRITE_OUTLINES.boss;
    // 잿불 터 무리(data/atlas.js encounters outline): 일반 몬스터의 테를 잿불 색으로. 정예는 특성 색을 지킨다.
    if (!enemy.isElite) return enemy.encounterOutline ? { ...BATTLE_SPRITE_OUTLINES.enemy, color: enemy.encounterOutline } : BATTLE_SPRITE_OUTLINES.enemy;
    const color = enemy.traitOutlineColor || (enemy.trait && enemy.trait.outlineColor) || BATTLE_SPRITE_OUTLINES.elite.color;
    return { ...BATTLE_SPRITE_OUTLINES.elite, color };
}

function drawEnemySprite(ctx, enemy, x, y, scale, flash, now, moving, attackMotion, facingDirection) {
    if (battleAssets.ready && battleAssets.atlas && battleAssets.atlas.enemies) {
        let enemyAtlas = battleAssets.atlas.enemies;
        let variantEntry = getBossAssetVariantEntry(enemy, enemyAtlas) || pickBattleEnemyVariant(enemy, enemyAtlas) || {};
        let spriteMotion = resolveEnemySpriteMotion(variantEntry, moving, now, enemy, attackMotion, facingDirection);
        x += spriteMotion.x;
        y += spriteMotion.y;
        let groundY = y + 2;
        let animatedEntry = spriteMotion.entry;
        let frame = animatedEntry.frame || variantEntry.frame || enemyAtlas.frames.bandit || enemyAtlas.frames.slime;
        let frameImage = animatedEntry.image || variantEntry.image || enemyAtlas.image;
        let drawSize = enemy.isBoss ? 70 : (enemy.isElite ? 52 : 44);
        let outline = getEnemyOutlineStyle(enemy);
        drawSize *= scale / (enemy.isBoss ? 2.55 : (enemy.isElite ? 2.2 : 1.95)); noteEnemyDrawnHeight(enemy, drawSize);
        let bossScaleRatio = enemy.isBoss ? scale / 2.55 : 1;
        drawPixelShadow(ctx, x, groundY, enemy.isBoss ? 22 * bossScaleRatio : 9, enemy.isBoss ? 7 * bossScaleRatio : 4, 0.17);
        ctx.save();
        if (enemy.bossVisualTint != null) ctx.filter = `hue-rotate(${enemy.bossVisualTint}deg) saturate(1.28) brightness(1.08)`;
        drawBattleSprite(ctx, frameImage, frame, x, groundY, drawSize, {
            smoothing: enemy.bossAssetKey ? 'high' : 'low',
            outlineColor: outline.color,
            outlineThickness: outline.thickness,
            outlineAlpha: outline.alpha,
            flipX: shouldMirrorEnemySprite(enemy),
            offsetY: bossAttackView.spriteOffsetY(attackMotion, frame),
            flash
        });
        ctx.restore();
        return;
    }
    if (attackMotion) {
        x += attackMotion.x;
        y += attackMotion.y;
    }
    let groundY = y + 2;
    let s = scale;
    let main = enemy.isBoss ? '#8b4cc7' : (enemy.isElite ? '#cc7a28' : '#c24d3f');
    let accent = enemy.isBoss ? '#e4b8ff' : (enemy.isElite ? '#ffd07b' : '#ff9c73');
    if (enemy.ele === 'cold') {
        main = enemy.isBoss ? '#6493d8' : '#5f88b6';
        accent = '#dbf7ff';
    } else if (enemy.ele === 'light') {
        main = enemy.isBoss ? '#9f8e37' : '#b6992f';
        accent = '#fff5a1';
    } else if (enemy.ele === 'chaos') {
        main = enemy.isBoss ? '#6e38a4' : '#7a49af';
        accent = '#f1cbff';
    } else if (enemy.ele === 'fire') {
        main = enemy.isBoss ? '#b2422d' : '#bd5540';
        accent = '#ffbb8e';
    }
    let variant = enemy.isBoss ? 'boss' : (enemy.isElite ? 'knight' : (enemy.id % 3 === 0 ? 'slime' : (enemy.id % 3 === 1 ? 'bat' : 'cultist')));
    drawPixelShadow(ctx, x, groundY + 2 * s, (enemy.isBoss ? 15 : 11) * s, 4 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(groundY));
    if (variant === 'slime') {
        ctx.fillStyle = flash ? '#fff8e2' : accent;
        ctx.fillRect(-5 * s, -5 * s, 10 * s, 8 * s);
        ctx.fillStyle = flash ? '#fffbe9' : main;
        ctx.fillRect(-7 * s, -1 * s, 14 * s, 7 * s);
        ctx.fillStyle = '#111';
        ctx.fillRect(-3 * s, -1 * s, 1.5 * s, 1.5 * s);
        ctx.fillRect(2 * s, -1 * s, 1.5 * s, 1.5 * s);
    } else if (variant === 'bat') {
        ctx.fillStyle = flash ? '#fff8d9' : main;
        ctx.fillRect(-3 * s, -3 * s, 6 * s, 6 * s);
        ctx.fillRect(-10 * s, -6 * s, 6 * s, 3 * s);
        ctx.fillRect(4 * s, -6 * s, 6 * s, 3 * s);
        ctx.fillRect(-9 * s, -2 * s, 5 * s, 2 * s);
        ctx.fillRect(4 * s, -2 * s, 5 * s, 2 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-2 * s, -6 * s, 4 * s, 3 * s);
    } else if (variant === 'knight') {
        ctx.fillStyle = '#41444f';
        ctx.fillRect(-5 * s, -4 * s, 10 * s, 10 * s);
        ctx.fillStyle = flash ? '#fff4cc' : main;
        ctx.fillRect(-4 * s, -2 * s, 8 * s, 9 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-3 * s, -10 * s, 6 * s, 6 * s);
        ctx.fillStyle = '#d8dce4';
        ctx.fillRect(-6 * s, -1 * s, 2 * s, 5 * s);
        ctx.fillRect(4 * s, -1 * s, 2 * s, 5 * s);
    } else if (variant === 'boss') {
        ctx.fillStyle = flash ? '#fff1c8' : main;
        ctx.fillRect(-8 * s, -6 * s, 16 * s, 12 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-6 * s, -14 * s, 12 * s, 8 * s);
        ctx.fillStyle = '#28152d';
        ctx.fillRect(-7 * s, 5 * s, 4 * s, 5 * s);
        ctx.fillRect(3 * s, 5 * s, 4 * s, 5 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-8 * s, -17 * s, 3 * s, 4 * s);
        ctx.fillRect(5 * s, -17 * s, 3 * s, 4 * s);
    } else {
        ctx.fillStyle = flash ? '#fff7d1' : main;
        ctx.fillRect(-4 * s, -5 * s, 8 * s, 10 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-3 * s, -12 * s, 6 * s, 7 * s);
        ctx.fillStyle = '#241717';
        ctx.fillRect(-3 * s, 4 * s, 2 * s, 5 * s);
        ctx.fillRect(1 * s, 4 * s, 2 * s, 5 * s);
        ctx.fillStyle = '#f8ef8f';
        ctx.fillRect(-2 * s, -9 * s, 1 * s, 1 * s);
        ctx.fillRect(1 * s, -9 * s, 1 * s, 1 * s);
    }
    ctx.restore();
}

function drawBattleHitFx(ctx, fx, t, playerPos, enemyPosMap) {
    // The elemental impact body/particles are owned by the attack-fx engine
    // (js/canvas-attack-fx.js), spawned once per hit. This keeps only the
    // generic critical-hit flourish layered above that effect.
    let enemyEntry = enemyPosMap[fx.enemyId];
    if (!enemyEntry || fx.dot || !fx.crit) return;
    let tx = enemyEntry.x;
    let ty = enemyEntry.y - 6;
    ctx.save();
    {
        ctx.globalAlpha = (1 - t) * 0.75;
        ctx.strokeStyle = '#fff4a8';
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 4; i++) {
            let angle = (Math.PI * 2 * i) / 4 + t * 0.35;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(angle) * (10 + t * 20), ty + Math.sin(angle) * (10 + t * 20));
            ctx.stroke();
        }
    }
    ctx.restore();
}

exposeFileGlobals({ resizeBattlefieldCanvas, getBattleGridProjection, getFixedBattleGridProjection, getBattleLayout, getBattleZoneTheme, getBattleSkillVisual, drawBattleBackdrop, drawPlayerSprite, getEnemyOutlineStyle, drawEnemySprite, drawBattleHitFx });
})();
