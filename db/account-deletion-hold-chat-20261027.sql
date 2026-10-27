-- 계정 삭제와 보류 계정의 채팅 금지(2026-10-27). Supabase 대시보드 > SQL Editor > New query에 이 파일 내용을 전부 붙여 넣고 Run.
-- db/multiplayer-hardening-20261027.sql까지 실행한 프로젝트에 쓴다. 같은 내용이 db/cloud-and-playtest.sql(delete_my_account)과
-- db/anti-cheat.sql(5절 guard_chat_message)에도 들어 있어, 나중에 처음부터 다시 설치해도 같은 상태가 된다(npm run check:db가 둘의 일치를 본다).
-- 여러 번 실행해도 안전하다. 기존 데이터는 지우거나 고치지 않는다. 한 묶음이라 중간에 오류가 나면 아무것도 바뀌지 않는다.
-- 먼저 오류만 보고 싶으면 맨 끝의 commit;을 rollback;으로 바꿔 한 번 돌려 본다.
--
--   1. delete_my_account(): 로그인한 사람이 자기 계정을 지운다(설정 > 클라우드 세이브 > 계정 삭제). auth.users 한 줄을 지우면
--      public의 모든 표가 외래키(on delete cascade)로 함께 지워진다. 이 기기의 저장은 남는다.
--   2. 보류한 계정(cheat_holds)은 채팅을 보내지 못한다(CHAT_ACCOUNT_HELD). 전에는 전당 등록과 구매, 고스트 등록만 막혔다.

begin;

-- 전제 확인: db/anti-cheat.sql의 cheat_account_held와 db/social.sql의 chat_messages가 있어야 한다. plpgsql은 함수를 만들 때 본문이 부르는
-- 함수를 검사하지 않아, 없는 프로젝트에서도 이 묶음이 그냥 성공하고 그 뒤 모든 채팅 넣기가 깨진다(검토 지적 2026-10-27).
do $$
begin
    if to_regprocedure('public.cheat_account_held(uuid)') is null then
        raise exception 'db/anti-cheat.sql을 먼저 실행해야 합니다(cheat_account_held가 없다)';
    end if;
    if to_regclass('public.chat_messages') is null then
        raise exception 'db/social.sql을 먼저 실행해야 합니다(chat_messages가 없다)';
    end if;
end;
$$;

-- ============================================================================
-- 1) 계정 삭제 (db/cloud-and-playtest.sql)
-- ============================================================================
-- 계정 삭제(2026-10-27): 로그인한 사람이 자기 계정을 지운다(설정 > 클라우드 세이브 > 계정 삭제, js/cloud-tools-ui.js deleteCloudAccount).
-- auth.users 한 줄을 지우면 public의 모든 표가 외래키(on delete cascade)로 함께 지워진다(라이브 DB의 외래키 20개를 2026-10-27 확인):
-- 클라우드 저장과 버전, 공개 프로필(닉네임도 풀린다), 채팅과 금지, 신고, 치트 기록과 보류, 전당 등록부와 전시와 구매, 고스트 프로필과
-- 대전 기록, 원격 측정. 남이 이 계정의 전시에서 산 구매 기록과 남의 대전 기록 중 이 계정이 상대인 줄도 함께 지워진다.
-- 이 기기의 게스트 저장은 서버와 무관해 남는다. postgres 소유의 보안 정의자라야 auth.users를 지울 수 있다.
-- 보류 중인 계정도 지울 수 있다(스토어의 계정 삭제 정책). 그 보류 기록은 함께 사라진다.
-- 남는 것: auth.audit_log_entries의 로그인 기록(GoTrue가 이메일을 jsonb로 남기고 외래키가 없다)과 다른 기기 저장의 cloudUserId 메모.
create or replace function public.delete_my_account()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then raise exception 'AUTH_REQUIRED'; end if;
    delete from auth.users where id = uid;
    if not found then raise exception 'ACCOUNT_NOT_FOUND'; end if;
    return jsonb_build_object('deleted', true);
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================================
-- 2) 보류한 계정은 채팅을 보내지 못한다 (db/anti-cheat.sql 5절)
-- ============================================================================
-- ---------------------------------------------------------------------------
-- 5) 채팅: 보류한 계정은 채팅을 보내지 못한다 (2026-10-27)
-- ---------------------------------------------------------------------------
-- 보류는 남과 나누는 곳에서 빼는 조치(원칙 3)인데 채팅은 그 안에 없었다. chat_messages의 넣기 트리거(db/social.sql의 속도 제한) 다음에
-- 돌고(이름 순), 어느 쪽 오류든 메시지는 들어가지 않는다. 오류 문구는 js/social.js SOCIAL_CHAT_ERROR_TEXTS의 CHAT_ACCOUNT_HELD.
-- 보류를 풀면 바로 다시 보낼 수 있다(채팅 금지 chat_mutes와는 따로 간다). 실행 권한을 회수한 cheat_account_held를 부르므로 보안 정의자.
create or replace function public.guard_chat_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if public.cheat_account_held(new.user_id) then raise exception 'CHAT_ACCOUNT_HELD'; end if;
    return new;
end;
$$;

drop trigger if exists trg_guard_chat_message on public.chat_messages;
create trigger trg_guard_chat_message before insert on public.chat_messages
    for each row execute function public.guard_chat_message();

revoke all on function public.guard_chat_message() from public, anon, authenticated;

commit;
