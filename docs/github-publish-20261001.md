# GitHub 올리기 — 공개 / 비공개 나눔 (2026-10-01)

Hana Caraka 캐릭터 스프라이트는 팀 내부 전용(재배포 금지)이라 공개 저장소에 올릴 수 없다.
그래서 개발 브랜치 `rignin-next`를 두 저장소에 나눠 올린다.

| 저장소 | 브랜치 | 내용 |
|---|---|---|
| 공개 `lunaticfox616/projectarpgidle` | `rignin-next` | 전부. 단, 아래 비공개 경로는 커밋 이력 전체에서 뺀다 |
| 비공개 `lunaticfox616/projectarpgidle-assets` | `main` | 비공개 경로의 파일만, 같은 위치에 + README |

비공개 경로 (`scripts/publish-github.cjs`의 `PRIVATE_PATHS`):

- `assets/playable/hana/` — Hana 캐릭터 스프라이트 67장
- `docs/skill-assets-hana/reference/` — 스킬 인계 원본 보관본 3개
- `assets/summon/hana/` — 예전 Hana 소환수 스프라이트. 지금 트리에는 없지만 옛 커밋에 남아 있어 이력에서 뺀다

인계 스킬 이펙트 코드(`data/hana-skill-fx.js` 등)와 Hana 메타데이터(`data/hana-sprites.js`, `data/hana-weapon-combos.js`)는 그림이 아니라서 공개 쪽에 둔다(2026-10-01 결정).
공개 브랜치만 받으면 캐릭터 그림이 빠진 상태다.

## 올리는 법

- 런처(`RIGNIN 테스트.cmd` / `rignin-ui\테스트-메뉴.cmd`) → **9. GitHub에 올리기**
- 또는 `node scripts/publish-github.cjs` — `--dry-run` 확인만, `--yes` 묻지 않고 올림

커밋된 내용만 올라간다. 로컬 작업 방식은 그대로다(로컬 `rignin-next`에는 Hana 그림이 계속 있다).

## 동작

1. 임시 bare 클론(`--shared`: 개체를 복사하지 않음)에서 작업한다. 이 작업 트리·인덱스·브랜치는 건드리지 않는다.
2. 공개 기준 커밋 `98bc57a4`(나눌 때의 공개 `main`) 이후 커밋을 `git filter-branch --index-filter`로 다시 쓴다.
   트리·날짜·메시지가 같으면 해시도 같으므로, 매번 전체를 다시 써도 이전에 올린 결과에 새 커밋만 이어 붙는다(fast-forward).
3. 올리기 전 검사: 걸러낸 이력에 비공개 경로가 남아 있거나, 경로에 `hana`/`caraka`가 들어간 그림 파일이 공개 쪽에 있으면 중단한다.
4. 공개 저장소의 브랜치가 이번 결과의 조상이 아니면(누가 직접 올렸거나 `PRIVATE_PATHS`를 바꿨을 때) 중단한다. 확인한 뒤 `--force-public`.
5. 비공개 쪽은 비공개 경로 파일 + README로 트리를 만들어, 내용이 바뀌었을 때만 `main`에 커밋을 하나 더한다.

## 주의

- 로컬 `rignin-next`를 공개 저장소(`origin`)에 직접 push하지 않는다. Hana 그림이 이력째 올라간다.
  같은 이름은 이력이 달라 거절되지만, 다른 브랜치 이름으로 올리면 그대로 올라간다.
- Hana 그림을 새 경로에 추가하면 `PRIVATE_PATHS`에 넣는다. 옛 커밋이 다시 쓰이므로 그다음 한 번은 `--force-public`이 필요하다.
- 새 PC에서 전체 게임을 받으려면 공개 `rignin-next`를 받은 뒤 비공개 저장소의 `assets`, `docs` 폴더를 그 위에 복사한다.
- 공개 저장소 CI(`.github/workflows/test.yml`)에는 비공개 경로가 없다. 그 파일을 읽는 검사(`smoke-hana-actors`의 시트 파일 검사,
  `smoke-redrawn-skill-art` 전체)는 `CI` 환경 변수가 있고 그 폴더가 통째로 없을 때만 건너뛴다(`scripts/lib/private-assets.js`).
  로컬에서는 예전처럼 빠진 파일이 실패로 잡힌다. 2026-09-30 공개 CI 실패 두 건이 이것이었다(2026-10-02 고침).
  공개 상태를 미리 보려면 `git archive HEAD`에서 비공개 경로를 지운 복사본에서 `CI=true npm test`.

## 새 배포 알림 (2026-10-11)
사용자: "PR 올려서 github pages에 들어가고 나면 새로고침 하라고 떴으면 좋겠는데".
- 웹 묶음을 만들 때(`scripts/build-web.js`) 배포 표식을 `dist/index.html`의 `<meta name="app-deploy">`와 `dist/version.json`에 적는다.
  Actions에서는 커밋 앞 12자, 그 밖에서는 묶음을 만든 시각이다. 저장소의 index.html에는 `dev`로 남는다.
- 열려 있는 게임(`js/app-update-ui.js`)은 5분마다, 탭으로 돌아올 때(1분에 한 번까지) `version.json`을 캐시 없이 읽어 제 표식과 다르면
  화면 위 가운데에 "새 버전이 올라왔습니다. 새로고침하면 적용됩니다."와 새로고침, 나중에(30분 뒤 다시) 단추를 띄운다.
  새로고침은 플레이어가 누를 때만 한다(떠날 때 저장은 js/main.js의 pagehide가 맡는다).
- 표식이 `dev`인 개발 서버와 앱(네이티브)에서는 켜지지 않는다. 기존 `<meta name="app-build">`는 플레이 기록용 이름표라 그대로 둔다.
- 읽는 파일은 수십 바이트이고 GitHub Pages에서 받는다(클라우드 서버 요청은 늘지 않는다).
