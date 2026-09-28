# 리그닌 — 새 게임 (next/)

기존 게임(저장소 루트)과 분리된 재설계 개발본이다. 저장소 루트의 `AGENTS.md`가 그대로 적용되며,
여기서는 ES module + TypeScript를 쓴다(Node 22.18+의 타입 제거로 빌드 없이 실행, `tsc`는 검사만).

| 경로 | 책임 |
| --- | --- |
| `src/data/` | 밸런스 수치(`balance.ts`), 막 지도 프리셋(생성물), 캐릭터 시트 계약(`characters.ts`) |
| `src/core/` | 규칙 코어: 순수·결정적, DOM 없음. 상태는 JSON 그대로 저장 가능 (`save.ts`가 저장 검증 경계) |
| `src/web/` | 브라우저 화면: 캔버스(`draw`, `fx`, `terrain`), 연출 모델(`scene`), HUD·패널·화면, 저장소(`storage`) |
| `tools/` | 가져오기·자동 플레이 측정 도구 (게임에서 로드하지 않음) |
| `test/` | `node --test` 행동 검사 |

의존 방향은 `data → core → web`이다. `scene.ts`는 코어가 즉시 판정한 공격을 시트의 타격 프레임에 맞춰
보여 주고, 처치·드랍·배너는 그 타격이 보이는 순간까지 미룬다(상태는 바꾸지 않음).

규칙 코어는 `createGame(seed, classId)`로 시작하고 `step(state)` 한 번이 100ms 한 틱이다. 실시간 진행,
오프라인 정산(`advance`), 테스트, 자동 플레이가 모두 같은 `step`을 거치므로 결과가 같다.

```sh
npm install
npm run dev            # http://localhost:8123/next/ — 브라우저 게임 (저장소 루트를 서빙해 기존 /assets 사용)
npm run check          # typecheck + test + 브라우저 번들
npm run autoplay -- --seeds 20 --class arcanist   # 첫 루프(1~10막) 시뮬레이션 시간 측정
npm run import:acts    # 기존 data/act-exploration-maps.js가 바뀌었을 때만
```

## 캐릭터 에셋킷

직업 스프라이트는 `리그닌_캐릭터_에셋킷`(Hana Caraka 가공본)을 쓴다. 원본 약관상 공개 저장소에 올릴 수
없으므로 이미지는 커밋하지 않고, 로컬 킷에서 gitignore된 `assets/characters/`로 가져온다.

```sh
npm run import:characters -- "<킷 경로>/리그닌_캐릭터_에셋킷"
```

규격 JSON을 검증한 뒤 `assets/characters/<직업>/<모션>-<레이어>.png`와 `manifest.json`을 만든다.
직업 대응은 `src/data/characters.ts`의 `CLASS_SPRITES`(전사 → 전사·대검, 비술사 → 비술사·오브)다.

## GitHub Pages 배포

`.github/workflows/next-site.yml`이 담당한다. 킷 이미지는 비공개 에셋 저장소에만 두고, 배포할 때만
받아서 빌드된 게임 안에 싣는다.

| 이벤트 | 하는 일 | Pages |
| --- | --- | --- |
| `ui-rift` 푸시 | `npm run check`, 캐릭터 없는 사이트 빌드 | 그대로 |
| `site-v*` 태그 푸시 | 킷 가져오기 → 검사 → `npm run build:site` → 배포 | **이 게임으로 교체** |

로컬에서 배포본 확인: `npm run build:site && npm run preview:site` → `http://localhost:8124/projectarpgidle/`

팀 테스트용 한 파일: `npm run build:site -- --zip rignin-test.zip`. 압축을 풀고 `index.html`을 더블클릭하면
서버 없이 실행된다(번들이 classic script이고 캐릭터 목록이 번들 안에 들어 있어 file://에서도 동작).
킷 이미지가 들어 있으니 팀 밖으로 돌리지 않는다.

교체 전 한 번만 준비할 것:

1. 비공개 저장소 `lunaticfox616/projectarpgidle-assets`에 킷(`결과물/Hana_직업` 포함 폴더)을 올린다.
   다른 이름이면 저장소 변수 `ASSETS_REPO`에 `소유자/이름`을 넣는다.
2. 그 저장소만 Contents: Read-only로 읽는 fine-grained 토큰을 `ASSETS_TOKEN` 시크릿으로 등록한다.
3. 교체할 때: Settings → Pages → Source를 **GitHub Actions**로 바꾸고, Settings → Environments →
   `github-pages`의 배포 규칙에 태그 `site-v*`를 허용한 뒤 태그를 푸시한다
   (`git tag site-v1 && git push origin site-v1`).
