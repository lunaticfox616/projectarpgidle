// 공개 저장소(GitHub)에는 Hana 그림과 스킬 인계 원본이 없다(scripts/publish-github.cjs PRIVATE_PATHS,
// docs/github-publish-20261001.md). 그 파일을 읽는 검사는 CI에서 그 폴더가 통째로 없을 때만 그 부분을 건너뛴다.
// 로컬에서는(CI 환경 변수 없음) 파일이 빠지면 예전처럼 실패한다.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** true = 공개 저장소 CI라 이 비공개 폴더가 없다(검사 건너뜀). */
function isPrivateAssetDirMissingInCi(relativeDir) {
    return !!process.env.CI && !fs.existsSync(path.join(ROOT, relativeDir));
}

module.exports = { isPrivateAssetDirMissingInCi };
