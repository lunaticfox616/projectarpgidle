const fs = require('fs');
const assert = require('assert');

const heroData = fs.readFileSync('data/passives.js', 'utf8');
const passives = fs.readFileSync('js/passives.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function readPngDimensions(filePath) {
    const png = fs.readFileSync(filePath);
    assert.strictEqual(png.toString('ascii', 1, 4), 'PNG', `${filePath} must be a PNG file`);
    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function getConfiguredFrameCount(stripKey) {
    const match = passives.match(new RegExp(`${stripKey}:\\s*(\\d+)`));
    assert(match, `${stripKey} must have an explicit frame count`);
    return Number(match[1]);
}

const expectedHeroes = ['hero2', 'hero6', 'hero10'];
for (const heroId of expectedHeroes) {
    assert.match(
        heroData,
        new RegExp(`strips: \\{ idle: '${heroId}Idle', walk: '${heroId}Walk', attack: '${heroId}Attack', hurt: '${heroId}Hurt', death: '${heroId}Death' \\}`),
        `${heroId} must select its own canvas animation strips`
    );

    for (const animation of ['walk', 'attack']) {
        const stripKey = `${heroId}${animation[0].toUpperCase()}${animation.slice(1)}`;
        const assetPath = `assets/${heroId}/${heroId}_${animation}.png`;
        assert(passives.includes(`${stripKey}: '${assetPath}'`), `${stripKey} must register ${assetPath}`);
        const dimensions = readPngDimensions(assetPath);
        assert.strictEqual(dimensions.width % dimensions.height, 0, `${assetPath} must contain square frames`);
        assert.strictEqual(
            getConfiguredFrameCount(stripKey),
            dimensions.width / dimensions.height,
            `${stripKey} frame count must match the supplied strip`
        );
    }
}

assert(!passives.includes('assets/hero2/DemonKin'), 'warrior must no longer load the legacy DemonKin sheets');
assert(passives.includes("const walkFallbackHeroIds = new Set(['hero2', 'hero6', 'hero10'])"), 'walk-only heroes must hold a resting frame for unsupported states');
assert(!passives.includes("sword_attack_body: heroId === 'hero2' ||"), 'the new warrior attack strip must follow attack progress instead of looping continuously');
assert(/data\/passives\.js\?v=[^"']+/.test(index), 'hero selection data must use a versioned cache key');
assert(/js\/passives\.js\?v=[^"']+/.test(index), 'battle asset loader must use a versioned cache key');

console.log('Hero animation asset smoke checks passed.');
