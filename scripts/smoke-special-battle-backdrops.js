const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const assets = [
  'assets/background/sky-tower-v1.webp',
  'assets/background/underworld-v1.webp',
  'assets/background/ocean-depth-v1.webp',
  'assets/background/cosmos-v1.webp'
];
const hideoutAsset = 'assets/hideout/root-sanctum-wood-v2.webp';

function readLossyWebpDimensions(file) {
  const bytes = fs.readFileSync(file);
  assert.strictEqual(bytes.toString('ascii', 0, 4), 'RIFF', `${file} must be a RIFF image`);
  assert.strictEqual(bytes.toString('ascii', 8, 12), 'WEBP', `${file} must be a WebP image`);
  const frameChunk = bytes.indexOf(Buffer.from('VP8 '), 12);
  assert(frameChunk >= 0, `${file} must use the reviewed lossy WebP profile`);
  const frame = frameChunk + 8;
  assert.strictEqual(bytes.toString('hex', frame + 3, frame + 6), '9d012a', `${file} must have a valid VP8 frame`);
  return {
    width: bytes.readUInt16LE(frame + 6) & 0x3fff,
    height: bytes.readUInt16LE(frame + 8) & 0x3fff,
    bytes: bytes.length
  };
}

let totalBytes = 0;
assets.forEach(file => {
  const dimensions = readLossyWebpDimensions(file);
  assert.strictEqual(dimensions.width, 627, `${file} must remain 627px wide`);
  assert.strictEqual(dimensions.height, 627, `${file} must remain 627px tall`);
  totalBytes += dimensions.bytes;
});
assert(totalBytes < 512 * 1024, 'the four special backdrops must stay below 512 KiB combined');
const hideoutDimensions = readLossyWebpDimensions(hideoutAsset);
assert.deepStrictEqual(
  { width:hideoutDimensions.width, height:hideoutDimensions.height },
  { width:1600, height:900 },
  'the hideout backdrop must remain a 16:9 battlefield image'
);
assert(hideoutDimensions.bytes < 300 * 1024, 'the compressed hideout backdrop must stay below 300 KiB');

const createdImages = [];
let renderCount = 0;
let now = 1000;
let failNextImage = false;
let hideoutActive = false;
class FakeImage {
  constructor() { createdImages.push(this); }
  set src(value) {
    this.resolvedSrc = value;
    const shouldFail = failNextImage;
    failNextImage = false;
    queueMicrotask(() => shouldFail ? this.onerror() : this.onload());
  }
}

const context = {
  console,
  Image: FakeImage,
  Map,
  Math,
  Number,
  Object,
  Promise,
  Date: { now: () => now },
  battleAssets: { backdrops: {}, loadTicket: 1 },
  game: {},
  isHideoutActive: () => hideoutActive,
  isLocalFileProtocol: () => false,
  renderBattlefield: () => { renderCount += 1; },
  safeExposeGlobals(values) { Object.assign(context, values); }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/battle-backdrops.js', 'utf8'), context, { filename:'js/battle-backdrops.js' });

async function run() {
  hideoutActive = true;
  assert.strictEqual(context.getBattleBackdropKeyForZone({ type:'act', id:0 }), 'bgHideout');
  hideoutActive = false;
  assert.strictEqual(context.getBattleBackdropKeyForZone({ type:'skyTower' }), 'bgSkyTower');
  assert.strictEqual(context.getBattleBackdropKeyForZone({ type:'underworld' }), 'bgUnderworld');
  assert.strictEqual(context.getBattleBackdropKeyForZone({ type:'oceanDepth' }), 'bgOceanDepth');
  assert.strictEqual(context.getBattleBackdropKeyForZone({ type:'cosmos' }), 'bgCosmos');
  assert.strictEqual(context.getBattleBackdropKeyForZone({ type:'seasonBoss', pinnacleTrack:'ocean' }), 'bgOceanDepth');
  assert.strictEqual(context.getBattleBackdropKeyForZone({ type:'seasonBoss', cosmosCapstone:true }), 'bgCosmos');
  assert.strictEqual(context.requestSpecialBattleBackdrop('bgAct1'), null, 'ordinary backgrounds stay in the eager manifest');

  const loaded = await context.requestSpecialBattleBackdrop('bgCosmos');
  assert.strictEqual(createdImages.length, 1, 'the requested special backdrop loads on demand');
  assert.strictEqual(loaded.resolvedSrc, 'assets/background/cosmos-v1.webp');
  assert.strictEqual(context.battleAssets.backdrops.bgCosmos, loaded);
  assert.strictEqual(renderCount, 1, 'the battlefield redraws once after the backdrop becomes ready');

  await context.requestSpecialBattleBackdrop('bgCosmos');
  assert.strictEqual(createdImages.length, 1, 'repeat requests reuse the loaded image');
  delete context.battleAssets.backdrops.bgCosmos;
  await context.requestSpecialBattleBackdrop('bgCosmos');
  assert.strictEqual(context.battleAssets.backdrops.bgCosmos, loaded, 'asset reloads restore the cached special backdrop');
  assert.strictEqual(createdImages.length, 1);

  failNextImage = true;
  assert.strictEqual(await context.requestSpecialBattleBackdrop('bgOceanDepth'), null, 'a failed optional image load remains non-fatal');
  assert.strictEqual(createdImages.length, 2);
  assert.strictEqual(context.requestSpecialBattleBackdrop('bgOceanDepth'), null, 'the retry delay prevents a hot failure loop');
  assert.strictEqual(createdImages.length, 2, 'failure backoff must not allocate another image immediately');
  now += 5000;
  const retried = await context.requestSpecialBattleBackdrop('bgOceanDepth');
  assert(retried && retried.resolvedSrc.endsWith('ocean-depth-v1.webp'), 'a temporary image failure becomes retryable');
  assert.strictEqual(createdImages.length, 3);
  const hideoutLoaded = await context.requestSpecialBattleBackdrop('bgHideout');
  assert.strictEqual(hideoutLoaded.resolvedSrc, hideoutAsset, 'the hideout battlefield must load its dedicated compressed backdrop');
  assert.strictEqual(createdImages.length, 4);

  const eagerManifest = fs.readFileSync('js/passives.js', 'utf8');
  assets.forEach(file => assert(!eagerManifest.includes(file), `${file} must not return to the eager battle manifest`));
  const indexSource = fs.readFileSync('index.html', 'utf8');
  assert(indexSource.indexOf('js/battle-backdrops.js') < indexSource.indexOf('js/ui.js'), 'the backdrop producer must load before its UI consumer');
  const uiSource = fs.readFileSync('js/ui.js', 'utf8');
  ['bgSkyTower', 'bgUnderworld', 'bgOceanDepth', 'bgCosmos'].forEach(key => {
    assert(uiSource.includes(`${key}: {`), `${key} needs its reviewed floor calibration instead of one shared profile`);
  });
  const processor = fs.readFileSync('scripts/process-battle-background.ps1', 'utf8');
  assert(processor.includes("$outputExtension -eq '.webp'") && processor.includes('cwebp'), 'the backdrop processor must encode real WebP files when requested');
  console.log(`smoke-special-battle-backdrops: ok (${Math.round(totalBytes / 1024)} KiB)`);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
