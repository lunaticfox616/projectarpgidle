-- 실시간 채팅 켜기(2026-10-21). Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
-- db/social.sql을 이미 실행한 프로젝트에 쓴다. 같은 내용이 db/social.sql에도 들어 있어, 나중에 처음부터 다시 설치해도 같은 상태가 된다.
-- 반복 실행해도 안전하고, 데이터를 지우거나 고치지 않는다(실시간 발행 목록만 바꾼다).
--   chat_messages 표를 supabase_realtime 발행에 넣는다. 그러면 새 채팅이 Supabase Realtime(postgres_changes)으로 바로 전해진다
--   (js/social.js syncLiveChat). 읽을 수 있는 사람은 지금처럼 로그인한 사용자뿐이다(chat_messages_select 정책).
--   이 SQL 없이도 게임은 예전처럼 채팅을 묻는 방식으로 돌아간다. 대시보드 Database > Publications > supabase_realtime에서
--   chat_messages를 켜도 같다.

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
         where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
    ) then
        alter publication supabase_realtime add table public.chat_messages;
    end if;
end
$$;
