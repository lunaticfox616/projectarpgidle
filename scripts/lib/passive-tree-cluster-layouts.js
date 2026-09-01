'use strict';

const PATTERNS = Object.freeze([
    ['forked-road', [[52, 0], [104, 0], [154, -55], [154, 55], [208, 0]], [[0, 1], [1, 2], [1, 3], [1, 4]]],
    ['split-tail', [[52, 0], [104, 0], [154, -55], [154, 55], [208, -55], [208, 55]], [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5]]],
    ['diamond-tail', [[52, 0], [104, 0], [154, -52], [204, 0], [154, 52], [256, 0]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [3, 5]]],
    ['triangle-spur', [[52, 0], [104, 0], [154, -55], [154, 55], [208, 0], [260, 55]], [[0, 1], [1, 2], [2, 3], [3, 1], [3, 4], [4, 5]]],
    ['short-ladder', [[52, 0], [104, -52], [104, 52], [156, -52], [156, 52], [208, 0]], [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [3, 4]]],
    ['crescent', [[52, 0], [92, -48], [144, -68], [196, -48], [220, 0], [184, 48], [132, 60]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]]],
    ['strung-bow', [[52, 0], [100, -48], [152, -72], [204, -48], [100, 48], [152, 72], [204, 48]], [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [3, 6]]],
    ['double-spear', [[52, 0], [104, -50], [104, 50], [156, 0], [208, -50], [208, 50], [260, 0]], [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]]],
    ['hook', [[52, 0], [104, 0], [156, 0], [196, 40], [176, 92], [124, 104]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]],
    ['zigzag', [[52, 0], [100, -45], [152, 0], [204, -45], [204, 45], [152, 90]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]],
    ['crown', [[52, 0], [104, 0], [145, -55], [190, -90], [218, -35], [218, 35], [170, 70]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1]]],
    ['roots', [[52, 0], [104, 0], [150, -50], [150, 50], [202, -82], [210, 0], [202, 82]], [[0, 1], [1, 2], [1, 3], [2, 4], [2, 5], [3, 5], [3, 6]]],
    ['eye', [[52, 0], [104, 0], [152, -58], [210, 0], [152, 58], [158, 0]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [1, 5], [5, 3]]],
    ['kite', [[52, 0], [104, -55], [160, 0], [104, 55], [218, 0]], [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4]]],
    ['rising-arc', [[52, 0], [98, -45], [150, -68], [202, -45], [248, 0], [202, 45]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]],
    ['hourglass', [[52, 0], [104, -55], [104, 55], [156, 0], [208, -55], [208, 55], [260, 0]], [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]]],
    ['pinwheel', [[52, 0], [104, 0], [156, -58], [214, -20], [196, 38], [138, 58]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]]],
    ['long-ladder', [[52, 0], [104, -52], [104, 52], [156, -52], [156, 52], [208, -52], [208, 52]], [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [3, 4], [5, 6]]],
    ['pentagon', [[52, 0], [105, 0], [146, -55], [205, -34], [205, 34], [146, 55]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]]],
    ['satellite', [[52, 0], [104, 0], [156, 0], [208, 0], [156, -55], [156, 55], [208, 70]], [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5], [5, 6]]],
    ['tulip', [[52, 0], [104, 0], [150, -55], [200, -25], [200, 25], [150, 55]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]]],
    ['claw', [[52, 0], [104, 0], [150, -55], [202, -78], [156, 0], [208, 0], [150, 55]], [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [1, 6]]],
    ['wings', [[52, 0], [104, 0], [150, -55], [202, -55], [150, 55], [202, 55], [254, 0]], [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [3, 6], [5, 6]]],
    ['cross', [[52, 0], [104, 0], [156, 0], [208, 0], [156, -55], [156, 55]], [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5]]],
    ['chevron', [[52, 0], [104, -52], [156, 0], [208, -52], [104, 52], [208, 52]], [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 2]]],
    ['comet', [[52, 0], [104, -50], [104, 50], [160, 0], [212, 50]], [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]]],
    ['blossom', [[52, 0], [104, 0], [156, 0], [156, -58], [206, -30], [206, 30], [156, 58]], [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 2]]],
    ['shield', [[52, 0], [104, 0], [156, 0], [208, -52], [208, 52]], [[0, 1], [1, 2], [2, 3], [2, 4]]],
    ['braid', [[52, 0], [100, -45], [152, 0], [204, 45], [204, -45]], [[0, 1], [1, 2], [2, 3], [2, 4]]],
    ['web', [[52, 0], [104, 0], [156, 0], [156, -55], [156, 55]], [[0, 1], [1, 2], [2, 3], [2, 4]]]
].map(([id, points, edges]) => Object.freeze({ id, points: Object.freeze(points), edges: Object.freeze(edges) })));

function minimumPointDistance(points) {
    let minimum = Infinity;
    for (let left = 0; left < points.length; left += 1) {
        for (let right = left + 1; right < points.length; right += 1) {
            minimum = Math.min(minimum, Math.hypot(points[left][0] - points[right][0], points[left][1] - points[right][1]));
        }
    }
    return minimum;
}

function sharesEndpoint(left, right) {
    return left[0] === right[0] || left[0] === right[1] || left[1] === right[0] || left[1] === right[1];
}

function orientation(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function edgesCross(points, left, right) {
    if (sharesEndpoint(left, right)) return false;
    const [a, b] = left.map(index => points[index]), [c, d] = right.map(index => points[index]);
    return orientation(a, b, c) * orientation(a, b, d) < 0
        && orientation(c, d, a) * orientation(c, d, b) < 0;
}

function validatePattern(pattern) {
    if (pattern.points.length < 5) throw new Error(`노드 뭉치가 너무 작습니다: ${pattern.id}`);
    const minimum = minimumPointDistance(pattern.points);
    if (minimum < 49) throw new Error(`노드 뭉치 내부 간격이 너무 좁습니다: ${pattern.id}/${minimum.toFixed(1)}`);
    for (let left = 0; left < pattern.edges.length; left += 1) {
        for (let right = left + 1; right < pattern.edges.length; right += 1) {
            if (edgesCross(pattern.points, pattern.edges[left], pattern.edges[right])) {
                throw new Error(`노드 뭉치 내부 연결선이 교차합니다: ${pattern.id}`);
            }
        }
    }
}

function nodeDegrees(pattern) {
    const degrees = Array.from({ length: pattern.points.length }, () => 0);
    pattern.edges.forEach(([left, right]) => { degrees[left] += 1; degrees[right] += 1; });
    return degrees;
}

function buildClusterLayout(themeCount, patternIndex) {
    if (themeCount < 1 || themeCount > 5) throw new Error(`노드 뭉치 효과 주제는 1~5개여야 합니다: ${themeCount}`);
    const pattern = PATTERNS[patternIndex];
    if (!pattern) throw new Error(`노드 뭉치 모양을 찾을 수 없습니다: ${patternIndex}`);
    validatePattern(pattern);
    const degrees = nodeDegrees(pattern);
    const farthestIndex = pattern.points.reduce((best, point, index, points) => point[0] > points[best][0] ? index : best, 0);
    const normalCounts = new Map();
    const specs = pattern.points.map((unused, index) => {
        const themeIndex = index % themeCount;
        const type = index === farthestIndex ? 'major' : (degrees[index] >= 3 ? 'normal' : (index < 2 ? 'assist' : 'minor'));
        const normalIndex = normalCounts.get(themeIndex) || 0;
        if (type === 'normal') normalCounts.set(themeIndex, normalIndex + 1);
        const effectIndex = type === 'major' ? 8
            : (type === 'normal' ? [4, 7, 9][normalIndex % 3] : (type === 'assist' ? 2 : 0));
        return { themeIndex, type, effectIndex };
    });
    return { id: pattern.id, points: pattern.points, edges: pattern.edges, specs, entryIndices: [0] };
}

function clusterPatternCount() {
    return PATTERNS.length;
}

module.exports = { buildClusterLayout, clusterPatternCount };
