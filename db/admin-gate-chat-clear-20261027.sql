-- 관리자 확인 수정과 운영 창의 채팅 전체 비우기(2026-10-27). Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
-- db/multiplayer-hardening-20261027.sql까지 실행한 프로젝트에 쓴다. 같은 함수가 db/operations-and-ghost.sql(is_project_admin)과
-- db/social.sql(admin_clear_chat)에도 들어 있어, 나중에 처음부터 다시 설치해도 같은 상태가 된다(npm run check:db가 함수의 일치를 본다).
-- 여러 번 실행해도 안전하다. 실행만으로는 채팅을 지우지 않는다(운영 창의 단추가 이 함수를 부를 때 지운다).
-- 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다. 먼저 오류만 보고 싶으면 맨 끝의 commit;을 rollback;으로 바꿔 한 번 돌려 본다.
--
--   1. is_project_admin(): 관리자 키가 없는 계정에 false 대신 NULL을 돌려줘, 관리자 함수들의 `if not public.is_project_admin()`이
--      막지 못하고 넘어갔다(로그인한 플레이어 누구나 운영 함수를 부를 수 있었다). coalesce로 언제나 true나 false를 돌려준다.
--      실행 전후로 확인: begin; select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"provider":"google"}}',true);
--      select public.is_project_admin(); rollback;  (전: NULL, 후: false)
--   2. admin_clear_chat(): chat_messages의 줄을 모두 지우고 지운 수를 돌려준다. 관리자만.
--      신고 기록(chat_reports)은 신고한 줄의 글을 따로 들고 있어 그대로 남는다.
--      한 줄 지우기(admin_delete_chat_message)는 이미 있고, 채팅창의 줄마다 붙는 지우기 단추가 그것을 부른다.

begin;

do $$
begin
    if to_regprocedure('public.is_project_admin()') is null then
        raise exception 'db/operations-and-ghost.sql을 먼저 실행해야 합니다(is_project_admin이 없다)';
    end if;
    if to_regclass('public.chat_messages') is null then
        raise exception 'db/social.sql을 먼저 실행해야 합니다(chat_messages가 없다)';
    end if;
end;
$$;

-- 1. 관리자 확인: 언제나 true나 false.
create or replace function public.is_project_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    -- coalesce: a player without either key gets NULL from the comparisons, and `if not NULL` in the admin RPCs skips the raise
    -- (2026-10-27 review: every admin RPC was open to any logged-in player). The gate must be a plain true or false.
    select coalesce(auth.uid() is not null and (
        auth.jwt() -> 'app_metadata' ->> 'project_admin' = 'true'
        or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    ), false);
$$;

-- 2. 관리자: 채팅 전체 비우기(운영 창). 줄마다 실시간 삭제 알림이 가서 열려 있는 채팅창에서도 빠진다.
-- where true: Supabase의 pg-safeupdate가 WHERE 없는 DELETE를 막는다.
create or replace function public.admin_clear_chat()
returns jsonb language plpgsql security definer set search_path = public as $$
declare removed integer;
begin
    if not public.is_project_admin() then raise exception 'ADMIN_REQUIRED'; end if;
    delete from public.chat_messages where true;
    get diagnostics removed = row_count;
    return jsonb_build_object('deleted', removed);
end;
$$;

revoke all on function public.admin_clear_chat() from public, anon;
grant execute on function public.admin_clear_chat() to authenticated;

commit;
