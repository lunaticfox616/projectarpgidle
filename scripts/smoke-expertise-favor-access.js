const assert = require('assert');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
runtime.game.expertise.unlockedExperts = ['mycologist'];
runtime.game.expertise.levels.mycologist = 20;
const html = runtime.getExpertiseCardHtml('mycologist');

assert(html.includes('expert-favor-panel'), '전문가 카드에 호의 선택지가 보여야 한다');
assert(html.indexOf('expert-favor-panel') < html.indexOf('경험치 획득 가이드'),
    '전문가 탭을 누르면 호의가 긴 경험치 가이드보다 먼저 보여야 한다');
assert(html.indexOf('expert-favor-panel') < html.indexOf('해금 기록'),
    '호의 선택을 위해 해금 기록을 끝까지 스크롤하게 만들면 안 된다');

console.log('smoke-expertise-favor-access passed');
