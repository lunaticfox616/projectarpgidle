const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
const start = source.indexOf('function getBattlePlayerVisualMetrics');
const end = source.indexOf('function getCanvasPlayerStats', start);
assert(start >= 0 && end > start, '플레이어 시각 메트릭 함수를 찾을 수 있어야 합니다');

const context = {
    clampNumber(value, min, max) {
        return Math.max(min, Math.min(max, Number(value) || 0));
    }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

const normal = vm.runInContext('getBattlePlayerVisualMetrics(2.8, 0)', context);
assert(normal.height <= 70, '플레이어 표시 높이는 70px를 넘지 않아야 합니다');
assert(normal.height >= 56, '플레이어는 식별 가능한 최소 크기를 유지해야 합니다');
assert(normal.healthBarOffsetY >= Math.ceil(normal.height + 7), 'HP 바는 캐릭터 머리 위 여백을 확보해야 합니다');

const compact = vm.runInContext('getBattlePlayerVisualMetrics(1.3, 0)', context);
assert(compact.height <= normal.height, '작은 전장에서는 캐릭터가 더 커지지 않아야 합니다');

const down = vm.runInContext('getBattlePlayerVisualMetrics(2.8, 1)', context);
assert(down.height < normal.height, '쓰러짐 상태에서는 캐릭터 높이가 줄어야 합니다');
assert(down.healthBarOffsetY < normal.healthBarOffsetY, 'HP 바는 줄어든 캐릭터 높이를 따라야 합니다');

console.log('smoke-player-visual-layout passed');
