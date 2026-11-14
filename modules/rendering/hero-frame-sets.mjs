import { detectSpriteComponents, padSpriteRect } from '../browser/sprite-components.mjs';
import { hasUsableFrame } from './hero-frame-layout.mjs';
import { getBattleHero1SafeClipDefs } from '../data/legacy-hero-frames.mjs';

export function buildHeroFrameSetFromDetectedRows(inputs, image) {
    let detected = detectSpriteComponents(inputs, image, 650)
        .filter(rect => rect.width >= 36 && rect.height >= 48)
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    if (detected.length < 4) return null;
    let rows = [];
    let rowThreshold = Math.max(14, Math.round((image.height || 900) * 0.07));
    detected.forEach(rect => {
        let row = rows.find(entry => Math.abs(entry.anchorY - rect.y) <= rowThreshold);
        if (!row) {
            row = { anchorY: rect.y, items: [] };
            rows.push(row);
        }
        row.items.push(rect);
        row.anchorY = Math.round((row.anchorY * (row.items.length - 1) + rect.y) / row.items.length);
    });
    rows.sort((a, b) => a.anchorY - b.anchorY);
    rows.forEach(row => row.items.sort((a, b) => a.x - b.x));
    let walkRow = rows[0] ? rows[0].items : [];
    let combatRow = rows[1] ? rows[1].items : walkRow;
    if (walkRow.length === 0 || combatRow.length === 0) return null;
    function trim(rect) {
        return inputs.trimRectToContent(image, padSpriteRect(rect, image, 4), 2);
    }
    let { walkA, walkB, frontIdle, frontGuard } = pickDetectedHeroFrontFrames(trim, walkRow, combatRow);
    let { sideIdle, attack } = pickDetectedHeroSideFrames(trim, combatRow, walkRow);
    let { extraA, extraB } = pickDetectedHeroExtraFrames(trim, combatRow);
    return buildHeroFrameSet([frontIdle, frontGuard, sideIdle, attack, walkA, extraA, extraB, attack, walkB]);
}

export function buildHeroFrameSet(frames) {
    let base = (frames || []).filter(Boolean);
    let { frontIdle, frontGuard, attack, sideIdle, sideWalk } = pickLegacyHeroMeleePoses(base);
    let { rangedAttack, castAttack, heavyAttack } = pickLegacyHeroSpellPoses(base, attack);
    return {
        frontIdle: frontIdle,
        frontGuard: frontGuard,
        sideIdle: sideIdle,
        attack: attack,
        sideWalk: sideWalk,
        rangedAttack: rangedAttack,
        castAttack: castAttack,
        heavyAttack: heavyAttack,
        idle: [frontIdle, frontGuard, sideIdle],
        walk: [sideWalk, sideIdle, sideWalk, frontGuard],
        swordCombo: [attack, sideIdle, attack],
        whirlCombo: [attack, sideWalk, attack, sideIdle],
        chaosCombo: [attack, sideIdle, attack],
        lightningCombo: [rangedAttack, sideIdle, rangedAttack],
        castCombo: [castAttack, frontGuard, castAttack],
        frostCombo: [castAttack, sideIdle, frontGuard],
        quakeCombo: [heavyAttack, attack, frontGuard],
        projectileCombo: [rangedAttack, sideIdle, rangedAttack]
    };
}

export function buildSafeHeroFrameSetFromClipDefs(inputs, image, defs) {
    let bodyFrames = {};
    Object.entries(defs.bodyFrames || {}).forEach(([id, rect]) => {
        let prepared = padSpriteRect(rect, image, 4);
        let trimmed = inputs.trimRectToContent(image, prepared, 2);
        if (hasUsableFrame(trimmed)) {
            if (Number.isFinite(rect.basisHeight)) trimmed.basisHeight = rect.basisHeight;
            if (Number.isFinite(rect.offsetX)) trimmed.offsetX = rect.offsetX;
            if (Number.isFinite(rect.offsetY)) trimmed.offsetY = rect.offsetY;
            bodyFrames[id] = trimmed;
        }
    });
    function resolveClip(name) {
        return (defs.characterAnimations && defs.characterAnimations[name] ? defs.characterAnimations[name] : [])
            .map(id => bodyFrames[id])
            .filter(Boolean);
    }
    let characterAnimations = {
        idle: resolveClip('idle'),
        walk_or_run: resolveClip('walk_or_run'),
        sword_attack_body: resolveClip('sword_attack_body'),
        cast_body: resolveClip('cast_body'),
        hurt: resolveClip('hurt'),
        down_or_knockdown: resolveClip('down_or_knockdown'),
        bow_attack_body: resolveClip('bow_attack_body')
    };
    return describeLegacyHeroClips(characterAnimations, defs);
}

export function buildSafeHeroFrameSetBattleHero1(inputs, image) {
    return buildSafeHeroFrameSetFromClipDefs(inputs, image, getBattleHero1SafeClipDefs());
}

export function buildHeroFrameSetBattleHero1(inputs, image) {
    return buildSafeHeroFrameSetBattleHero1(inputs, image);
}

function pickDetectedHeroFrontFrames(trim, walkRow, combatRow) {
    let walkA = trim(walkRow[0]);
    let walkB = trim(walkRow[1] || walkRow[0]);
    let frontIdle = trim(combatRow[0] || walkRow[0]);
    let frontGuard = trim(combatRow[1] || combatRow[0] || walkRow[0]);
    return { walkA, walkB, frontIdle, frontGuard };
}

function pickDetectedHeroSideFrames(trim, combatRow, walkRow) {
    let sideIdle = trim(combatRow[2] || combatRow[1] || combatRow[0] || walkRow[0]);
    let attack = trim(combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
    return { sideIdle, attack };
}

function pickDetectedHeroExtraFrames(trim, combatRow) {
    let extraA = trim(combatRow[4] || combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
    let extraB = trim(combatRow[5] || extraA || combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
    return { extraA, extraB };
}

function pickLegacyHeroMeleePoses(base) {
    let frontIdle = base[0];
    let frontGuard = base[1] || frontIdle;
    let sideIdle = base[2] || frontIdle || frontGuard;
    let attack = base[3] || sideIdle || frontIdle;
    let sideWalk = base[4] || sideIdle || attack;
    return { frontIdle, frontGuard, attack, sideIdle, sideWalk };
}

function pickLegacyHeroSpellPoses(base, attack) {
    let rangedAttack = base[5] || attack;
    let castAttack = base[6] || rangedAttack || attack;
    let heavyAttack = base[7] || attack;
    return { rangedAttack, castAttack, heavyAttack };
}

function describeLegacyHeroClips(characterAnimations, defs) {
    return {
        characterAnimations: characterAnimations,
        clipLoop: { ...(defs.clipLoop || {}) },
        idle: characterAnimations.idle,
        walk: characterAnimations.walk_or_run,
        run: characterAnimations.walk_or_run,
        swordCombo: characterAnimations.sword_attack_body,
        castCombo: characterAnimations.cast_body,
        projectileCombo: characterAnimations.cast_body,
        bowCombo: characterAnimations.bow_attack_body,
        hurt: characterAnimations.hurt,
        down: characterAnimations.down_or_knockdown,
        attack: characterAnimations.sword_attack_body[0] || characterAnimations.idle[0] || null,
        sideIdle: characterAnimations.idle[0] || null,
        sideWalk: characterAnimations.walk_or_run[0] || characterAnimations.idle[0] || null,
        frontIdle: characterAnimations.idle[0] || null,
        frontGuard: characterAnimations.idle[1] || characterAnimations.idle[0] || null
    };
}
