# vendor

게임이 외부 CDN 없이 직접 내려주는 라이브러리. 저장소에 든 바이트만 실행된다(2026-10-27, 공급망 위험 때문에 jsDelivr 태그를 대체).

- supabase.js: @supabase/supabase-js 2.115.0의 UMD 묶음(패키지의 jsdelivr 진입점 dist/umd/supabase.js). 라이선스는 supabase-LICENSE.txt.

올리는 법: package.json의 버전을 올려 npm install 한 뒤 아래를 돌리고, index.html의 vendor/supabase.js?v= 값을 새 버전으로 바꾼다.

    node -e "const fs=require('fs');fs.copyFileSync('node_modules/@supabase/supabase-js/dist/umd/supabase.js','vendor/supabase.js');fs.copyFileSync('node_modules/@supabase/supabase-js/LICENSE','vendor/supabase-LICENSE.txt')"
