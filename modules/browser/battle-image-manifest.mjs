const HERO_IMAGES = {
    hero1Idle: 'assets/playable/hero1/idle.png',
    hero1Walk: 'assets/playable/hero1/walk.png',
    hero1Attack: 'assets/playable/hero1/attack.png',
    hero1Hurt: 'assets/playable/hero1/idle.png',
    hero1Death: 'assets/playable/hero1/idle.png',
    hero2Idle: 'assets/playable/hero2/idle.png',
    hero2Walk: 'assets/playable/hero2/walk.png',
    hero2Attack: 'assets/playable/hero2/attack.png',
    hero2Hurt: 'assets/playable/hero2/idle.png',
    hero2Death: 'assets/playable/hero2/idle.png',
    hero3Idle: 'assets/playable/hero3/idle.png',
    hero3Walk: 'assets/playable/hero3/walk.png',
    hero3Attack: 'assets/playable/hero3/attack.png',
    hero3Hurt: 'assets/playable/hero3/idle.png',
    hero3Death: 'assets/playable/hero3/idle.png',
    hero4Idle: 'assets/playable/hero4/idle.png',
    hero4Walk: 'assets/playable/hero4/walk.png',
    hero4Attack: 'assets/playable/hero4/attack.png',
    hero4Hurt: 'assets/playable/hero4/idle.png',
    hero4Death: 'assets/playable/hero4/idle.png',
    hero5Idle: 'assets/playable/hero5/idle.png',
    hero5Walk: 'assets/playable/hero5/walk.png',
    hero5Attack: 'assets/playable/hero5/attack.png',
    hero5Hurt: 'assets/playable/hero5/idle.png',
    hero5Death: 'assets/playable/hero5/idle.png',
    hero6Idle: 'assets/playable/hero6/idle.png',
    hero6Walk: 'assets/playable/hero6/walk.png',
    hero6Attack: 'assets/playable/hero6/attack.png',
    hero6Hurt: 'assets/playable/hero6/idle.png',
    hero6Death: 'assets/playable/hero6/idle.png',
    hero7Idle: 'assets/playable/hero7/idle.png',
    hero7Walk: 'assets/playable/hero7/walk.png',
    hero7Attack: 'assets/playable/hero7/attack.png',
    hero7Hurt: 'assets/playable/hero7/idle.png',
    hero7Death: 'assets/playable/hero7/idle.png',
    hero8Idle: 'assets/playable/hero8/idle.png',
    hero8Walk: 'assets/playable/hero8/walk.png',
    hero8Attack: 'assets/playable/hero8/attack.png',
    hero8Hurt: 'assets/playable/hero8/idle.png',
    hero8Death: 'assets/playable/hero8/idle.png',
    hero9Idle: 'assets/playable/hero9/idle.png',
    hero9Walk: 'assets/playable/hero9/walk.png',
    hero9Attack: 'assets/playable/hero9/attack.png',
    hero9Hurt: 'assets/playable/hero9/idle.png',
    hero9Death: 'assets/playable/hero9/idle.png',
    hero10Idle: 'assets/playable/hero10/idle.png',
    hero10Walk: 'assets/playable/hero10/walk.png',
    hero10Attack: 'assets/playable/hero10/attack.png',
    hero10Hurt: 'assets/playable/hero10/idle.png',
    hero10Death: 'assets/playable/hero10/idle.png',
    playerClassOccultistIdle: 'assets/playable/classes/occultist/idle.webp',
    playerClassOccultistIdleNorth: 'assets/playable/classes/occultist/idle-north.webp',
    playerClassOccultistIdleSouth: 'assets/playable/classes/occultist/idle-south.webp',
    playerClassOccultistWalk: 'assets/playable/classes/occultist/walk.webp',
    playerClassOccultistWalkNorth: 'assets/playable/classes/occultist/walk-north.webp',
    playerClassOccultistWalkSouth: 'assets/playable/classes/occultist/walk-south.webp?v=20260902-walk-repair3',
    playerClassOccultistWalkWest: 'assets/playable/classes/occultist/walk-west.webp',
    playerClassOccultistAttack: 'assets/playable/classes/occultist/attack.webp',
    playerClassOccultistAttack2: 'assets/playable/classes/occultist/attack-2.webp',
    playerClassOccultistAttackNorth: 'assets/playable/classes/occultist/attack-north.webp',
    playerClassOccultistAttack2North: 'assets/playable/classes/occultist/attack-2-north.webp',
    playerClassOccultistAttackSouth: 'assets/playable/classes/occultist/attack-south.webp',
    playerClassOccultistAttack2South: 'assets/playable/classes/occultist/attack-2-south.webp',
    playerClassWandererIdle: 'assets/playable/classes/wanderer/idle.webp',
    playerClassWandererIdleNorth: 'assets/playable/classes/wanderer/idle-north.webp',
    playerClassWandererIdleSouth: 'assets/playable/classes/wanderer/idle-south.webp',
    playerClassWandererWalk: 'assets/playable/classes/wanderer/walk.webp',
    playerClassWandererWalkNorth: 'assets/playable/classes/wanderer/walk-north.webp',
    playerClassWandererWalkSouth: 'assets/playable/classes/wanderer/walk-south.webp',
    playerClassWandererWalkWest: 'assets/playable/classes/wanderer/walk-west.webp',
    playerClassWandererAttack: 'assets/playable/classes/wanderer/attack.webp',
    playerClassWandererAttack2: 'assets/playable/classes/wanderer/attack-2.webp',
    playerClassWandererAttackNorth: 'assets/playable/classes/wanderer/attack-north.webp',
    playerClassWandererAttackSouth: 'assets/playable/classes/wanderer/attack-south.webp',
    playerClassWandererAttack2South: 'assets/playable/classes/wanderer/attack-2-south.webp',
    playerClassClericIdle: 'assets/playable/classes/cleric/idle.webp',
    playerClassClericIdleNorth: 'assets/playable/classes/cleric/idle-north.webp',
    playerClassClericIdleSouth: 'assets/playable/classes/cleric/idle-south.webp',
    playerClassClericWalk: 'assets/playable/classes/cleric/walk.webp',
    playerClassClericWalkNorth: 'assets/playable/classes/cleric/walk-north.webp',
    playerClassClericWalkSouth: 'assets/playable/classes/cleric/walk-south.webp?v=20260902-walk-repair2',
    playerClassClericWalkWest: 'assets/playable/classes/cleric/walk-west.webp',
    playerClassClericAttack: 'assets/playable/classes/cleric/attack.webp',
    playerClassClericAttackNorth: 'assets/playable/classes/cleric/attack-north.webp',
    playerClassClericAttackSouth: 'assets/playable/classes/cleric/attack-south.webp',
    playerClassArcherIdle: 'assets/playable/classes/archer/idle.webp',
    playerClassArcherIdleNorth: 'assets/playable/classes/archer/idle-north.webp',
    playerClassArcherIdleSouth: 'assets/playable/classes/archer/idle-south.webp',
    playerClassArcherWalk: 'assets/playable/classes/archer/walk.webp',
    playerClassArcherWalkNorth: 'assets/playable/classes/archer/walk-north.webp',
    playerClassArcherWalkSouth: 'assets/playable/classes/archer/walk-south.webp',
    playerClassArcherWalkWest: 'assets/playable/classes/archer/walk-west.webp',
    playerClassArcherAttack: 'assets/playable/classes/archer/attack.webp',
    playerClassArcherAttack2: 'assets/playable/classes/archer/attack-2.webp',
    playerClassArcherAttackNorth: 'assets/playable/classes/archer/attack-north.webp',
    playerClassArcherAttack2North: 'assets/playable/classes/archer/attack-2-north.webp',
    playerClassArcherAttackSouth: 'assets/playable/classes/archer/attack-south.webp',
    playerClassArcherAttack2South: 'assets/playable/classes/archer/attack-2-south.webp',
    playerClassAlchemistIdle: 'assets/playable/classes/alchemist/idle.webp',
    playerClassAlchemistIdleNorth: 'assets/playable/classes/alchemist/idle-north.webp',
    playerClassAlchemistIdleSouth: 'assets/playable/classes/alchemist/idle-south.webp',
    playerClassAlchemistWalk: 'assets/playable/classes/alchemist/walk.webp?v=20260902-walk-repair2',
    playerClassAlchemistWalkNorth: 'assets/playable/classes/alchemist/walk-north.webp?v=20260902-walk-repair2',
    playerClassAlchemistWalkSouth: 'assets/playable/classes/alchemist/walk-south.webp?v=20260902-walk-repair2',
    playerClassAlchemistWalkWest: 'assets/playable/classes/alchemist/walk-west.webp?v=20260902-walk-repair2',
    playerClassAlchemistAttack: 'assets/playable/classes/alchemist/attack.webp',
    playerClassAlchemistAttack2: 'assets/playable/classes/alchemist/attack-2.webp',
    playerClassAlchemistAttack3: 'assets/playable/classes/alchemist/attack-3.webp',
    playerClassAlchemistAttackNorth: 'assets/playable/classes/alchemist/attack-north.webp',
    playerClassAlchemistAttack2North: 'assets/playable/classes/alchemist/attack-2-north.webp',
    playerClassAlchemistAttackSouth: 'assets/playable/classes/alchemist/attack-south.webp',
    playerClassWarriorIdle: 'assets/playable/classes/warrior/idle.webp',
    playerClassWarriorIdleNorth: 'assets/playable/classes/warrior/idle-north.webp',
    playerClassWarriorIdleSouth: 'assets/playable/classes/warrior/idle-south.webp',
    playerClassWarriorWalk: 'assets/playable/classes/warrior/walk.webp?v=20260906-sheathed',
    playerClassWarriorWalkNorth: 'assets/playable/classes/warrior/walk-north.webp',
    playerClassWarriorWalkSouth: 'assets/playable/classes/warrior/walk-south.webp',
    playerClassWarriorWalkWest: 'assets/playable/classes/warrior/walk-west.webp?v=20260906-sheathed',
    playerClassWarriorAttack: 'assets/playable/classes/warrior/attack.webp',
    playerClassWarriorAttack2: 'assets/playable/classes/warrior/attack-2.webp',
    playerClassWarriorAttack3: 'assets/playable/classes/warrior/attack-3.webp',
    playerClassWarriorAttackNorth: 'assets/playable/classes/warrior/attack-north.webp',
    playerClassWarriorAttack2North: 'assets/playable/classes/warrior/attack-2-north.webp',
    playerClassWarriorAttack3North: 'assets/playable/classes/warrior/attack-3-north.webp',
    playerClassWarriorAttackSouth: 'assets/playable/classes/warrior/attack-south.webp',
    playerClassWarriorAttack2South: 'assets/playable/classes/warrior/attack-2-south.webp',
    playerClassWarriorAttack3South: 'assets/playable/classes/warrior/attack-3-south.webp'
};

const BATTLE_IMAGES = {
    enemies: 'assets/battle-clean/battle-enemies-v1.png',
    bossTelegraphRing: 'assets/effects/boss-telegraph-ring-v1.png',
    bossTelegraphFan: 'assets/effects/boss-telegraph-fan-v1.png',
    bossTelegraphPulse: 'assets/effects/boss-telegraph-pulse-v1.png',
    skillFxWhirlwind: 'assets/effects/skill-whirlwind-v2.png',
    skillFxChainPrimary: 'assets/effects/skill-chain-primary-v2.png',
    skillFxChainJump: 'assets/effects/skill-chain-jump-v1.png',
    skillFxSlamPrimary: 'assets/effects/skill-slam-primary-v2.png',
    skillFxSlamAftershock: 'assets/effects/skill-slam-aftershock-v2.png',
    skillFxMeteorProjectile: 'assets/effects/skill-meteor-projectile-v2.png',
    skillFxMeteorImpact: 'assets/effects/skill-meteor-impact-v2.png',
    skillFxMeteorGround: 'assets/effects/skill-meteor-ground-v2.png',
    skillFxContinuousSlash: 'assets/effects/skill-continuous-slash-v1.png',
    skillFxProjectile: 'assets/effects/skill-projectile-v2.png',
    skillFxEnemyProjectiles: 'assets/effects/enemy-projectiles-v1.webp',
    skillFxVenomFang: 'assets/effects/skill-venom-fang-v3.png',
    skillFxFrostField: 'assets/effects/skill-frost-field-v2.png',
    skillFxBlizzardAmbient: 'assets/effects/skill-bludgeoning-blizzard-ambient-sheet-v2.png',
    skillFxBlizzardImpact: 'assets/effects/skill-bludgeoning-blizzard-impact-sheet-v2.png',
    skillFxFrostWave: 'assets/effects/skill-frost-wave-v2.png',
    skillFxChaosBoomerang: 'assets/effects/skill-chaos-boomerang-v2.png',
    skillFxFrostBurst: 'assets/effects/skill-frost-burst-v1.png',
    skillFxFrostWaveRing: 'assets/effects/skill-frost-wave-ring-v1.png',
    skillFxBurst: 'assets/effects/skill-burst-v2.png',
    skillFxImpactFlare: 'assets/effects/skill-impact-flare-v1.png'
};

const UTILITY_IMAGES = {
    skillFxEarthSpike: 'assets/effects/pixel-earth-spike-v1.png',
    skillFxDotField: 'assets/effects/skill-dot-field-v2.png',
    skillFxSummonStrike: 'assets/effects/skill-summon-strike-v1.png',
    passiveTreeIcons: 'assets/ui/passive-tree-icons-v5.png',
    passiveTreeKeystoneIcons: 'assets/ui/passive-tree-keystone-icons-v2.png',
    passiveTreeNotableIcons: 'assets/ui/passive-tree-notable-icons-v5.png',
    passiveTreeFrames: 'assets/ui/passive-tree-frames-v1.png',
    summon1: 'assets/battle-clean/summon1.png'
};

/** Build a fresh manifest; the URL aliases, insertion order and existing cache versions are intentional. */
export function createBattleImageManifest({ customHeroSrc, areaVfx, bossAssets, passiveNodes }) {
    const manifest = { ...HERO_IMAGES, ...(customHeroSrc ? { heroLegacy: customHeroSrc } : {}),
        ...BATTLE_IMAGES, ...areaVfx, ...UTILITY_IMAGES, ...bossAssets };
    for (const node of Object.values(passiveNodes)) {
        const source = String(node && node.iconAsset || '');
        if (!/^assets\/ui\/passive-custom-icons\/[a-zA-Z0-9._-]+\.webp$/.test(source)) continue;
        manifest['passiveTreeCustom_' + node.id] = source;
    }
    appendHeroCacheVersion(manifest);
    return manifest;
}

function appendHeroCacheVersion(manifest) {
    for (const key of Object.keys(manifest)) {
        if ((key.startsWith('hero') || key.startsWith('playerClass')) &&
            typeof manifest[key] === 'string' && manifest[key].startsWith('assets/playable/')) {
            manifest[key] += '?v=20260902-directional-poses2';
        }
    }
}

export function criticalHeroImageKeys(definition) {
    const keys = Object.values((definition || {}).strips || {})
        .flatMap(value => Array.isArray(value) ? value : ((value && typeof value === 'object') ? Object.values(value) : [value]))
        .filter(value => typeof value === 'string' && value);
    return new Set(['enemies', 'effects', 'summon1', ...keys]);
}

export function isOptionalBattleImage(key) {
    return key.startsWith('hero') || key.startsWith('playerClass') || key.startsWith('bg') ||
        key.startsWith('bossTelegraph') || key.startsWith('skillFx') || key.startsWith('passiveTree');
}
