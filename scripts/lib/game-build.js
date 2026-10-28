'use strict';

/**
 * 게임 판 표식(2026-10-28), scripts/build-web.js와 scripts/build-mobile-web.js가 같이 쓴다. 배포 묶음의 index.html
 * `<meta name="game-build">`에 묶음을 만든 커밋의 시각(ISO)을 적는다. js/save.js가 저장마다 이 값을 남기고, 더 뒤의 판이 남긴 저장은
 * 불러오지도 덮어쓰지도 않는다(스토어 심사 때문에 앱이 웹보다 며칠 늦는다).
 * 묶음을 만든 시각이 아니라 커밋 시각이다: 같은 커밋으로 만든 웹과 앱은 같은 판이고, 나중에 만든 앱 묶음도 예전 커밋이면 예전 판이다.
 * main의 병합 커밋은 병합한 때에 생기므로 main 배포는 차례대로 커진다.
 */
const cp = require('node:child_process');

const PLACEHOLDER = '<meta name="game-build" content="dev">';

/** html with the placeholder replaced by the HEAD commit time of the repository at root. Throws when either is missing. */
function stampGameBuild(html, root) {
    if (!html.includes(PLACEHOLDER)) throw new Error('index.html has no game-build placeholder');
    const seconds = Number(cp.execFileSync('git', ['show', '-s', '--format=%ct', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim());
    if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error('git gave no commit time for the game build');
    const stamp = new Date(seconds * 1000).toISOString();
    // A commit from a machine whose clock runs ahead would stamp saves that every later (correctly timed) release refuses.
    if (seconds * 1000 > Date.now() + 10 * 60 * 1000) throw new Error(`HEAD commit time ${stamp} is in the future; commit again with a correct clock`);
    return html.replace(PLACEHOLDER, `<meta name="game-build" content="${stamp}">`);
}

module.exports = { stampGameBuild };
