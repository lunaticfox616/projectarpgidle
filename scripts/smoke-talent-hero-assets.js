const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('data/passives.js', 'utf8'), context, { filename: 'data/passives.js' });

const heroDefs = context.window.HERO_SELECTION_DEFS;
const heroes = Object.values(heroDefs);
assert.strictEqual(heroes.length, 10, '모든 재능 캐릭터가 이미지 계약에 포함되어야 합니다');
assert.strictEqual(new Set(heroes.map(def => def.spriteSrc)).size, heroes.length, '재능별 이미지는 서로 달라야 합니다');
assert.strictEqual(new Set(heroes.map(def => def.strips.idle)).size, heroes.length, '재능별 로더 키는 서로 달라야 합니다');

heroes.forEach(def => {
    assert.strictEqual(def.spriteFrameCount, 1, `${def.label} 이미지는 단일 프레임이어야 합니다`);
    assert.match(def.spriteSrc, /^assets\/talent\/.+\/rotations\/east\.png$/, `${def.label}는 오른쪽 방향 재능 이미지를 사용해야 합니다`);
    assert.strictEqual(new Set(Object.values(def.strips)).size, 1, `${def.label}의 모든 동작은 단일 프레임 키를 공유해야 합니다`);

    const spritePath = path.resolve(def.spriteSrc);
    assert(fs.existsSync(spritePath), `${def.label} 이미지 파일이 존재해야 합니다: ${def.spriteSrc}`);
    const png = fs.readFileSync(spritePath);
    assert.strictEqual(png.subarray(1, 4).toString('ascii'), 'PNG', `${def.label} 자산은 PNG여야 합니다`);
    assert(png.readUInt32BE(16) >= 64 && png.readUInt32BE(20) >= 64, `${def.label} 자산은 렌더링 가능한 크기여야 합니다`);

    const talentDir = def.spriteSrc.split('/').slice(0, 3).join('/');
    const metadata = JSON.parse(fs.readFileSync(path.join(talentDir, 'metadata.json'), 'utf8'));
    const expectedRelativePath = metadata.states[0].frames.rotations.east;
    assert(def.spriteSrc.endsWith(expectedRelativePath), `${def.label} 경로는 talent 메타데이터의 east 프레임과 일치해야 합니다`);
});

console.log(`smoke-talent-hero-assets passed (${heroes.length} talent sprites)`);
