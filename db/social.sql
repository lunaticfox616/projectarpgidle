-- ============================================================================
-- 소셜 기능(프로필 공개 / 채팅) 백엔드 스키마
-- ----------------------------------------------------------------------------
-- 적용 방법:
--   1) Supabase 대시보드 → 좌측 메뉴 "SQL Editor" → "New query"
--   2) 이 파일 전체를 붙여넣고 "Run"
--   3) 오류 없이 "Success" 가 뜨면 완료. (여러 번 실행해도 안전하도록 작성됨)
--
-- ⚠️ service_role 키는 어디에도 붙여넣거나 공유하지 마세요. 이 SQL은 대시보드에
--    로그인된 상태에서 실행되므로 별도의 키가 필요하지 않습니다.
-- ============================================================================

-- updated_at 자동 갱신용 트리거 함수 -----------------------------------------
create or replace function public.social_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- ============================================================================
-- 1) 공개 프로필: 다른 플레이어가 장비/스탯을 구경할 수 있도록 하는 스냅샷
-- ============================================================================
create table if not exists public.player_profiles (
    user_id      uuid primary key references auth.users(id) on delete cascade,
    nickname     text not null,
    profile_data jsonb not null default '{}'::jsonb,
    updated_at   timestamptz not null default now()
);

-- 닉네임은 대소문자 무시하고 유일해야 한다.
create unique index if not exists player_profiles_nickname_unique
    on public.player_profiles (lower(nickname));

drop trigger if exists trg_player_profiles_updated_at on public.player_profiles;
create trigger trg_player_profiles_updated_at
    before update on public.player_profiles
    for each row execute function public.social_set_updated_at();

alter table public.player_profiles enable row level security;

-- 로그인한 사용자라면 누구나 프로필을 볼 수 있다(구경 기능).
drop policy if exists "player_profiles_select" on public.player_profiles;
create policy "player_profiles_select"
    on public.player_profiles for select
    to authenticated
    using (true);

-- 자기 자신의 프로필만 생성/수정할 수 있다.
drop policy if exists "player_profiles_insert_own" on public.player_profiles;
create policy "player_profiles_insert_own"
    on public.player_profiles for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "player_profiles_update_own" on public.player_profiles;
create policy "player_profiles_update_own"
    on public.player_profiles for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ============================================================================
-- 2) 채팅 메시지
-- ============================================================================
create table if not exists public.chat_messages (
    id         bigint generated always as identity primary key,
    user_id    uuid not null references auth.users(id) on delete cascade,
    nickname   text not null,
    body       text not null check (char_length(body) between 1 and 500),
    payload    jsonb,                       -- 아이템 링크 등 부가 데이터(2차 기능용)
    created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_at_idx
    on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

-- 로그인한 사용자라면 누구나 채팅을 읽을 수 있다.
drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select"
    on public.chat_messages for select
    to authenticated
    using (true);

-- 자기 user_id 로만 메시지를 보낼 수 있다.
drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own"
    on public.chat_messages for insert
    to authenticated
    with check (auth.uid() = user_id);

-- (선택) 자기 메시지는 본인이 삭제 가능.
drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own"
    on public.chat_messages for delete
    to authenticated
    using (auth.uid() = user_id);

-- ============================================================================
-- 끝. player_profiles / chat_messages 두 테이블과 RLS 정책이 준비되었습니다.
-- ============================================================================
