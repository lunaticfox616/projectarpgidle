/** Fixed display labels shared by every node; never mutated or saved. */
const EFFECT_LABELS = Object.freeze({
        flatHp: '생명력', pctHp: '생명(%)', regen: '재생', leech: '흡혈',
        flatDmg: '피해', pctDmg: '피해(%)', meleePctDmg: '근접(%)', physPctDmg: '물리피해(%)', aoePctDmg: '범위피해(%)', projectilePctDmg: '투사체피해(%)',
        firePctDmg: '화염피해(%)', coldPctDmg: '냉기피해(%)', lightPctDmg: '번개피해(%)', chaosPctDmg: '카오스피해(%)', elementalPctDmg: '원소피해(%)', dotPctDmg: '지속피해(%)', spellFlatPct: '주문내장(%)',
        slamPctDmg: '강타피해(%)', slamEchoChance: '여진확률', projectileExtraShots: '투사체추가',
        crit: '치명타 확률', critDmg: '치명타 피해', aspd: '공격 속도', move: '이동 속도', ds: '연속타격',
        armor: '방어도', armorPct: '방어도(%)', evasion: '회피', evasionPct: '회피(%)', energyShield: '보호막', energyShieldPct: '보호막(%)', energyShieldRegen: '보호막재생',
        deflectChance: '비껴내기', deflectMajor: '비껴내기', dr: '피감', blockChance: '막기', blockChancePct: '막기증폭',
        resF: '화염저항', resC: '냉기저항', resL: '번개저항', resAll: '모든원소저항', resChaos: '카오스저항', resPen: '저항관통',
        maxResF: '화염최대', maxResC: '냉기최대', maxResL: '번개최대', maxResChaos: '카오스최대', chaosResElemPenalty: '카오스저항+',
        igniteChance: '점화확률', chillChance: '냉각확률', freezeChance: '동결확률', shockChance: '감전확률', poisonChance: '중독확률', bleedChance: '출혈확률',
        igniteDamageMultiplierPct: '점화효율', chillEffect: '냉각효율', shockEffect: '감전효율',
        shockedEnemyHitDamagePct: '감전명중피해',
        ailResIgnite: '점화저항', ailResShock: '감전저항', ailResFreeze: '동결저항', ailResPoison: '중독저항', ailResBleed: '출혈저항',
        regenSuppress: '재생억제', physIgnore: '물리무시', minDmgRoll: '최소보정', maxDmgRoll: '최대보정',
        leechRateCap: '흡혈속도캡', leechTotalCap: '흡혈총량캡', leechInstanceCap: '흡혈캡',
        moveEvasion: '이속 및 회피', hpArmor: '생명력 및 방어도', aspdMove: '공속 및 이속',
        summonPctDmg: '소환피해(%)', summonHpPct: '소환생명(%)', summonCritDmg: '소환치피', summonFlatDmg: '소환피해', summonCrit: '소환치명', summonAspd: '소환공속',
        gemLevel: '룬레벨', suppCap: '보조스킬룬한도', expGain: '경험치',
        fireGemLevel: '화염룬레벨', coldGemLevel: '냉기룬레벨', lightGemLevel: '번개룬레벨', chaosGemLevel: '카오스룬레벨', physGemLevel: '물리룬레벨',
        projectileGemLevel: '투사체룬레벨', meleeGemLevel: '근접룬레벨', slamGemLevel: '강타룬레벨', spellGemLevel: '주문룬레벨', dotGemLevel: '지속룬레벨', aoeGemLevel: '범위룬레벨', elementalGemLevel: '원소룬레벨',
        strGemLevel: '힘룬레벨', dexGemLevel: '민첩룬레벨', intGemLevel: '지능룬레벨', runeResonancePower: '공명력'
    });

export function drawPassiveSearchHighlight(runtime, ctx, node, radius, accent) {
    ctx.save();
    const ringColor = accent && accent.activeOuter ? accent.activeOuter : '#ffffff';
    const textColor = accent && accent.text ? accent.text : '#ffffff';
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = Math.max(1.4, 2.2 / Math.max(0.35, runtime.deps.camZoom));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 타이틀이 지정된 노드는 깔끔한 고유명을, 그 외에는 stat 이름을 쓴다.
    // stat 이름의 '(%)'·'(초)'·끝의 '증가' 접미사는 타이틀 노드와 통일성을 위해 표시에서만 정리한다.
    const label = String((0, runtime.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node) || '')
        .replace(/\s*\([^)]*\)\s*$/, '')
        .replace(/\s*증가$/, '')
        .trim();
    if (label && runtime.deps.camZoom >= 0.18) {
        const fontSize = Math.max(10, Math.min(22, 12 / Math.max(0.32, runtime.deps.camZoom)));
        ctx.font = `${fontSize}px ${runtime.deps.i18n.fontFamily("'Galmuri11'")}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const y = node.y - radius - 14;
        const padX = 6 / Math.max(0.42, runtime.deps.camZoom);
        const h = fontSize + 5;
        const w = ctx.measureText(label).width + padX * 2;
        ctx.fillStyle = 'rgba(6,10,16,0.82)';
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1 / Math.max(0.45, runtime.deps.camZoom);
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(node.x - w / 2, y - h, w, h, 5 / Math.max(0.45, runtime.deps.camZoom));
        else ctx.rect(node.x - w / 2, y - h, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = textColor;
        ctx.fillText(label, node.x, y - 3);
    }
    ctx.restore();
}

export function getPassiveNodeEffectShortLabel(runtime, node) {
    if (!node) return '';
    const stat = node.stat || '';
    const shortByStat = EFFECT_LABELS;
    // 큐레이션된 짧은 라벨은 단어 중간에서 잘리지 않도록 그대로 사용한다.
    if (shortByStat[stat]) return shortByStat[stat];
    let label = (0, runtime.deps.getStatName)(stat) || (0, runtime.deps.passiveNodePresentation.getPassiveEffectLabel)(node) || '';
    label = String(label)
        .replace(/\([^)]*\)/g, '')
        .replace(/[+\-]?\d+(?:\.\d+)?\s*%?/g, '')
        .replace(/[·:：]/g, ' ')
        .replace(/증가|확률|획득|피해량|효과/g, '')
        .replace(/\s+/g, '')
        .trim();
    if (!label) label = (0, runtime.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node) || '';
    return label.length > 6 ? label.slice(0, 6) : label;
}

export function drawPassiveNodeEffectLabel(runtime, ctx, node, look, visibility) {
    const { radius, active, reachable } = look;
    if (runtime.deps.game.settings.passiveTreeShowLabels === false) return;
    if (labelOutsideView(runtime, node, visibility)) return;
    const important = majorLabelNode(node);
    const hovered = isHoveredLabel(runtime, node);
    if (inactiveLabelHidden(hovered, reachable, active, important)) return;

    const label = getPassiveNodeEffectShortLabel(runtime, node);
    if (!label) return;
    const accent = (0, runtime.deps.passiveNodePresentation.getPassiveStatAccent)(node.stat);
    // 월드 좌표 크기 = 목표 화면 크기 / 배율. 나눗셈 하한을 표시 최소 배율까지 낮춰야
    // 축소했을 때 글자가 화면에서 작아지지 않는다(예전에는 하한 0.55와 상한 15px이
    // 서로 싸워서 0.46 근처에서 이미 읽기 힘들 만큼 작아졌다).
    const zoomForScale = Math.max(runtime.state.PASSIVE_EFFECT_LABEL_MIN_ZOOM, runtime.deps.camZoom);
    const fontSize = Math.max(9, Math.min(46, 10.5 / zoomForScale));
    const padX = 4.5 / zoomForScale;
    const padY = 2.5 / zoomForScale;
    const placeLeft = node.x < -80;
    const gap = 6 / zoomForScale;
    const anchorX = node.x + (placeLeft ? -(radius + gap) : (radius + gap));
    const y = node.y + fontSize * 0.38;

    ctx.save();
    ctx.font = `${fontSize}px ${runtime.deps.i18n.fontFamily("'Galmuri11'")}`;
    ctx.textAlign = placeLeft ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width + padX * 2;
    const h = fontSize + padY * 2;
    const x = placeLeft ? anchorX - w : anchorX;
    const rect = { x: x - 2, y: y - h / 2 - 2, w: w + 4, h: h + 4 };
    const collides = runtime.state.passiveEffectLabelRects.some(other => !(
            rect.x + rect.w < other.x || other.x + other.w < rect.x
                || rect.y + rect.h < other.y || other.y + other.h < rect.y
    ));
    if (collides && !hovered) {
        ctx.restore();
        return;
    }
    runtime.state.passiveEffectLabelRects.push(rect);
    paintLabelBox(ctx, { active, reachable, accent, zoomForScale, x, y, w, h, label, placeLeft, padX });
}

/** 블랙홀 초월 공허: 시작점 없이도 길이 이어지는 연결 거점이라 점선 고리로 표시한다. */
export function drawPassiveNodeStatusRing(runtime, ctx, node, look) {
    if (look.dimmed || !look.anchor) return;
    ctx.save();
    ctx.globalAlpha = look.alpha;
    ctx.beginPath();
    ctx.arc(node.x, node.y, look.radius + 9, 0, Math.PI * 2);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(188,132,255,0.95)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
}

export function drawPassiveNodeExtras(runtime, ctx, extras) {
    extras.forEach(({ node, look, visibility }) => {
        drawPassiveNodeStatusRing(runtime, ctx, node, look);
        if (!look.dimmed) drawPassiveNodeEffectLabel(runtime, ctx, node, look, visibility);
        if (look.searchHit) drawPassiveSearchHighlight(runtime, ctx, node, look.radius, (0, runtime.deps.passiveNodePresentation.getPassiveStatAccent)(node.stat));
    });
}

export function drawPassiveClassStartLabels(runtime, ctx, nodes, frame) {
    const starts = nodes.filter(node => node.kind === 'start' && node.title && (0, runtime.deps.getPassiveVisibility)(node.id) !== 'hidden');
    if (!starts.length) return;
    ctx.save();
    ctx.font = `${13 / runtime.deps.camZoom}px ${runtime.deps.i18n.fontFamily("'Galmuri11'")}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 / runtime.deps.camZoom;
    ctx.strokeStyle = 'rgba(5,4,4,0.92)';
    starts.forEach(node => {
        const y = node.y + (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) * 1.45 + 4 / runtime.deps.camZoom;
        ctx.fillStyle = node.id === frame.rootId ? '#e9be67' : '#b3a283';
        ctx.strokeText((0, runtime.deps._t)(node.title), node.x, y);
        ctx.fillText((0, runtime.deps._t)(node.title), node.x, y);
    });
    ctx.restore();
}

function labelOutsideView(runtime, node, visibility) {
    return !node || visibility === 'hidden' || runtime.deps.camZoom < runtime.state.PASSIVE_EFFECT_LABEL_MIN_ZOOM;
}

function majorLabelNode(node) {
    return node.kind === 'major' || node.kind === 'hub' || node.kind === 'apex' || node.kind === 'transcendent';
}

function isHoveredLabel(runtime, node) {
    return !!(runtime.deps.hoverNode && runtime.deps.hoverNode.id === node.id);
}

function inactiveLabelHidden(hovered, reachable, active, important) {
    return !hovered && !reachable && !(active && important);
}

function paintLabelBox(ctx, layout) {
    const { active, reachable, accent, zoomForScale, x, y, w, h, label, placeLeft, padX } = layout;
    ctx.globalAlpha = active ? 0.98 : (reachable ? 0.9 : 0.76);
    ctx.fillStyle = 'rgba(5,9,15,0.78)';
    ctx.strokeStyle = active ? accent.activeOuter : (reachable ? accent.reachOuter : 'rgba(150,175,200,0.5)');
    ctx.lineWidth = Math.max(0.7, 1 / zoomForScale);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y - h / 2, w, h, 4 / zoomForScale);
    else ctx.rect(x, y - h / 2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent.text || '#dce6f2';
    ctx.fillText(label, placeLeft ? x + w - padX : x + padX, y);
    ctx.restore();
}
