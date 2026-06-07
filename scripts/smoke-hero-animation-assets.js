const fs = require('fs');
const assert = require('assert');

const heroData = fs.readFileSync('data/passives.js', 'utf8');
const passives = fs.readFileSync('js/passives.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const expectedHeroes = [
    { id: 'hero2', walkFrames: 13, attackFrames: 20 },
    { id: 'hero6', walkFrames: 13, attackFrames: 14 },
    { id: 'hero10', walkFrames: 12, attackFrames: 10 }
];

for (const hero of expectedHeroes) {
    assert.match(
        heroData,
        new RegExp(`strips: \\{ idle: '${hero.id}Idle', walk: '${hero.id}Walk', attack: '${hero.id}Attack', hurt: '${hero.id}Hurt', death: '${hero.id}Death' \\}`),
        `${hero.id} must select its own canvas animation strips`
    );
    assert(passives.includes(`${hero.id}Walk: 'assets/${hero.id}/${hero.id}_walk.png'`), `${hero.id} walk sheet path must be registered`);
    assert(passives.includes(`${hero.id}Attack: 'assets/${hero.id}/${hero.id}_attack.png'`), `${hero.id} attack sheet path must be registered`);
    assert(passives.includes(`${hero.id}Idle: ${hero.walkFrames}, ${hero.id}Walk: ${hero.walkFrames}, ${hero.id}Attack: ${hero.attackFrames}`), `${hero.id} frame counts must match the supplied strips`);
}

assert(!passives.includes('assets/hero2/DemonKin'), 'warrior must no longer load the legacy DemonKin sheets');
assert(passives.includes("const walkFallbackHeroIds = new Set(['hero2', 'hero6', 'hero10'])"), 'walk-only heroes must hold a resting frame for unsupported states');
assert(!passives.includes("sword_attack_body: heroId === 'hero2' ||"), 'the new warrior attack strip must follow attack progress instead of looping continuously');
assert(/data\/passives\.js\?v=[^"']+/.test(index), 'hero selection data must use a versioned cache key');
assert(/js\/passives\.js\?v=[^"']+/.test(index), 'battle asset loader must use a versioned cache key');

console.log('Hero animation asset smoke checks passed.');
