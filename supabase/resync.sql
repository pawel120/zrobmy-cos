-- ============================================================================
-- BuildTogether — RESYNC block
-- Bezpieczny do wielokrotnego uruchomienia. Wkleja WSZYSTKIE funkcje,
-- triggery, polityki RLS i storage z schema.sql i nadpisuje ich stare wersje
-- w bazie (create or replace / drop if exists). NIE dotyka tabel ani danych.
-- Uruchom w Supabase → SQL Editor → New query → Run.
-- ============================================================================

-- ============================================================================
-- Trigger: auto-create profile row when a new auth.users row appears
--
-- Split into three pieces so profile creation is never a single point of
-- failure for signup:
--   create_profile_for_user() — shared, race-safe creation logic
--   handle_new_user()         — trigger wrapper that NEVER raises (a failure
--                               here would roll back the auth.users insert
--                               and abort the whole signup)
--   ensure_profile()          — self-heal RPC: any logged-in user missing a
--                               profile row gets one on their next request
--                               (called from middleware.ts)
-- ============================================================================
create or replace function public.create_profile_for_user(uid uuid, user_email text, meta jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  if exists (select 1 from public.profiles where id = uid) then
    return;
  end if;

  base_username := lower(regexp_replace(coalesce(meta->>'username', split_part(user_email, '@', 1), ''), '[^a-z0-9_]', '', 'g'));
  if base_username = '' then
    base_username := 'student';
  end if;
  final_username := base_username;

  -- Race-safe dedup: instead of check-then-insert (two concurrent signups
  -- with the same base name could both pass the check), attempt the INSERT
  -- and let the unique index arbitrate; on collision retry with a suffix,
  -- falling back to a random suffix if sequential ones keep colliding.
  loop
    begin
      insert into public.profiles (id, username, display_name)
      values (uid, final_username, coalesce(meta->>'display_name', base_username))
      on conflict (id) do nothing;
      return;
    exception when unique_violation then
      suffix := suffix + 1;
      if suffix > 20 then
        final_username := base_username || '_' || substr(md5(random()::text), 1, 6);
      else
        final_username := base_username || suffix::text;
      end if;
    end;
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_profile_for_user(new.id, new.email, new.raw_user_meta_data);
  return new;
exception when others then
  -- Never abort the signup because of the profile: log and continue —
  -- ensure_profile() will heal the missing row on the user's next request.
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.ensure_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  u record;
begin
  if me is null then
    return;
  end if;
  if exists (select 1 from public.profiles where id = me) then
    return;
  end if;

  select email, raw_user_meta_data into u from auth.users where id = me;
  if not found then
    return;
  end if;

  perform public.create_profile_for_user(me, u.email, u.raw_user_meta_data);
end;
$$;

-- ============================================================================
-- Trigger: keep projects.fire_count and profiles.hype_score in sync
-- ============================================================================
create or replace function public.handle_fire_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj_owner uuid;
begin
  update public.projects
    set fire_count = fire_count + 1
    where id = new.project_id
    returning owner_id into proj_owner;

  update public.profiles
    set hype_score = hype_score + 1
    where id = proj_owner;

  insert into public.notifications (user_id, actor_id, type, project_id, message)
  values (
    proj_owner,
    new.user_id,
    'fire_received',
    new.project_id,
    'Ktoś dał 🔥 Twojemu projektowi'
  );

  return new;
end;
$$;

drop trigger if exists on_fire_insert on public.fires;
create trigger on_fire_insert
  after insert on public.fires
  for each row execute function public.handle_fire_insert();

create or replace function public.handle_fire_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj_owner uuid;
begin
  update public.projects
    set fire_count = greatest(fire_count - 1, 0)
    where id = old.project_id
    returning owner_id into proj_owner;

  update public.profiles
    set hype_score = greatest(hype_score - 1, 0)
    where id = proj_owner;

  return old;
end;
$$;

drop trigger if exists on_fire_delete on public.fires;
create trigger on_fire_delete
  after delete on public.fires
  for each row execute function public.handle_fire_delete();

-- ============================================================================
-- Trigger: bump chat_rooms.last_message_at + notify recipient on new message
-- ============================================================================
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  update public.chat_rooms
    set last_message_at = new.created_at
    where id = new.room_id;

  select case when user_a = new.sender_id then user_b else user_a end
    into recipient
    from public.chat_rooms
    where id = new.room_id;

  insert into public.notifications (user_id, actor_id, type, room_id, message)
  values (recipient, new.sender_id, 'new_message', new.room_id, 'Masz nową wiadomość');

  return new;
end;
$$;

drop trigger if exists on_new_message on public.messages;
create trigger on_new_message
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- RLS allows any room participant to UPDATE a message row (needed so the
-- recipient can mark it read), but only `read_at` should ever actually
-- change post-insert. This trigger enforces that at the database level
-- regardless of what the client sends.
create or replace function public.enforce_message_immutability()
returns trigger
language plpgsql
as $$
begin
  if new.content <> old.content or new.sender_id <> old.sender_id or new.room_id <> old.room_id then
    raise exception 'messages are immutable except for read_at';
  end if;
  return new;
end;
$$;

drop trigger if exists on_message_update on public.messages;
create trigger on_message_update
  before update on public.messages
  for each row execute function public.enforce_message_immutability();

-- ============================================================================
-- Trigger: notify a project's owner when someone requests to join
-- ============================================================================
create or replace function public.handle_join_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  proj_owner uuid;
  proj_title text;
begin
  select owner_id, title into proj_owner, proj_title
  from public.projects
  where id = new.project_id;

  insert into public.notifications (user_id, actor_id, type, project_id, message)
  values (
    proj_owner,
    new.requester_id,
    'join_request',
    new.project_id,
    'Ktoś chce dołączyć do „' || proj_title || '”'
  );

  return new;
end;
$$;

drop trigger if exists on_join_request_insert on public.join_requests;
create trigger on_join_request_insert
  after insert on public.join_requests
  for each row execute function public.handle_join_request_insert();

-- ============================================================================
-- RPC: respond_to_join_request — owner accepts/declines; accepting also
-- opens (or reuses) a chat room with the requester so they can coordinate
-- immediately, reusing the same race-safe pairing logic as get_or_create_chat_room.
-- ============================================================================
create or replace function public.respond_to_join_request(request_id uuid, accept boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  req record;
  proj_owner uuid;
  room_id uuid;
  a uuid;
  b uuid;
begin
  select jr.*, p.owner_id into req from public.join_requests jr
    join public.projects p on p.id = jr.project_id
    where jr.id = request_id
    for update of jr;

  if req is null then
    raise exception 'join request not found';
  end if;
  if req.owner_id <> me then
    raise exception 'only the project owner can respond to this request';
  end if;
  if req.status <> 'pending' then
    raise exception 'this request was already resolved';
  end if;

  update public.join_requests
    -- Cast is required: a CASE over two text literals resolves to `text`, and
    -- there is no implicit text -> enum assignment cast for join_request_status.
    set status = (case when accept then 'accepted' else 'declined' end)::join_request_status,
        resolved_at = now()
    where id = request_id;

  insert into public.notifications (user_id, actor_id, type, project_id, message)
  values (
    req.requester_id,
    me,
    'system',
    req.project_id,
    case when accept then 'Twoja prośba o dołączenie została zaakceptowana 🔥' else 'Twoja prośba o dołączenie została odrzucona' end
  );

  if not accept then
    return null;
  end if;

  if me < req.requester_id then
    a := me; b := req.requester_id;
  else
    a := req.requester_id; b := me;
  end if;

  select id into room_id from public.chat_rooms where user_a = a and user_b = b;
  if room_id is null then
    insert into public.chat_rooms (user_a, user_b)
    values (a, b)
    on conflict (user_a, user_b) do nothing
    returning id into room_id;

    if room_id is null then
      select id into room_id from public.chat_rooms where user_a = a and user_b = b;
    end if;
  end if;

  return room_id;
end;
$$;

-- ============================================================================
-- RPC: get_or_create_chat_room — idempotent room lookup/creation
-- Normalizes (user_a, user_b) ordering so a race between two inserts cannot
-- create duplicate rooms; relies on the unique constraint + upsert.
-- ============================================================================
create or replace function public.get_or_create_chat_room(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  room_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if me = other_user_id then
    raise exception 'cannot open a chat with yourself';
  end if;

  if me < other_user_id then
    a := me; b := other_user_id;
  else
    a := other_user_id; b := me;
  end if;

  select id into room_id from public.chat_rooms where user_a = a and user_b = b;

  if room_id is null then
    insert into public.chat_rooms (user_a, user_b)
    values (a, b)
    on conflict (user_a, user_b) do nothing
    returning id into room_id;

    if room_id is null then
      select id into room_id from public.chat_rooms where user_a = a and user_b = b;
    end if;
  end if;

  return room_id;
end;
$$;

-- ============================================================================
-- RPC: get_hot_projects — "Najgorętsze" sort, ranked by fires in the last N
-- days rather than all-time fire_count. Kept as a function (not a view) so
-- the window is a parameter instead of a hardcoded 7 days.
-- ============================================================================
create or replace function public.get_hot_projects(days_back int default 7, limit_count int default 30)
returns setof public.projects
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.projects p
  left join (
    select project_id, count(*) as recent_fires
    from public.fires
    where created_at >= now() - (days_back || ' days')::interval
    group by project_id
  ) f on f.project_id = p.id
  where p.is_shadowbanned = false
  order by coalesce(f.recent_fires, 0) desc, p.created_at desc
  limit limit_count;
$$;

-- ============================================================================
-- Write throttling (server-side, in the database)
-- The middleware rate limiter only covers /api/* reads; every write (messages,
-- projects, fires, join_requests) goes straight from the browser to Supabase,
-- so the only place a limit actually holds — regardless of how many serverless
-- instances are running — is here, as BEFORE INSERT triggers.
--
-- Fires and join_requests are already bounded by their unique(…) constraints
-- (one per user per project), so only message flooding and project spam need
-- an explicit rate cap. security definer so the count sees ALL of the user's
-- rows, not just the ones their RLS policy can select.
-- ============================================================================
create or replace function public.throttle_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  select count(*) into recent
  from public.messages
  where sender_id = new.sender_id
    and created_at > now() - interval '1 minute';

  if recent >= 20 then
    raise exception 'Za dużo wiadomości w krótkim czasie. Odczekaj chwilę.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists throttle_messages_trigger on public.messages;
create trigger throttle_messages_trigger
  before insert on public.messages
  for each row execute function public.throttle_messages();

create or replace function public.throttle_projects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  select count(*) into recent
  from public.projects
  where owner_id = new.owner_id
    and created_at > now() - interval '1 hour';

  if recent >= 5 then
    raise exception 'Za dużo nowych projektów w krótkim czasie. Spróbuj później.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists throttle_projects_trigger on public.projects;
create trigger throttle_projects_trigger
  before insert on public.projects
  for each row execute function public.throttle_projects();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.fires enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.join_requests enable row level security;
alter table public.reports enable row level security;

-- profiles: public read (non-shadowbanned), self update only
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  using (is_shadowbanned = false or id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  -- The three "col = (select col ...)" clauses pin moderation/ranking columns to
  -- their stored value: a self-update may change bio/skills/etc. but can never
  -- flip is_admin (privilege escalation), lift its own is_shadowbanned (evade
  -- moderation), or inflate hype_score (rank manipulation). Admins go through
  -- the separate admin_full_profiles policy, which has no such restriction.
  with check (
    id = auth.uid()
    and is_admin = (select is_admin from public.profiles where id = auth.uid())
    and is_shadowbanned = (select is_shadowbanned from public.profiles where id = auth.uid())
    and hype_score = (select hype_score from public.profiles where id = auth.uid())
  );

-- projects: public read (non-shadowbanned), owner can insert/update/delete
drop policy if exists "projects_select_public" on public.projects;
create policy "projects_select_public"
  on public.projects for select
  using (is_shadowbanned = false or owner_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects for insert
  with check (owner_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects for update
  using (owner_id = auth.uid())
  -- Owner may edit their project's content but not lift its own is_shadowbanned
  -- (moderation evasion) nor rewrite the denormalized fire_count (rank
  -- manipulation); both are pinned to the stored row. Admin_full_projects
  -- bypasses this for moderators.
  with check (
    owner_id = auth.uid()
    and is_shadowbanned = (select p2.is_shadowbanned from public.projects p2 where p2.id = projects.id)
    and fire_count = (select p2.fire_count from public.projects p2 where p2.id = projects.id)
  );

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects for delete
  using (owner_id = auth.uid());

-- fires: readable by everyone, insertable only by the authenticated user for
-- themselves, never updatable, deletable only by the user who gave it
drop policy if exists "fires_select_public" on public.fires;
create policy "fires_select_public"
  on public.fires for select
  using (true);

drop policy if exists "fires_insert_own" on public.fires;
create policy "fires_insert_own"
  on public.fires for insert
  with check (user_id = auth.uid());

drop policy if exists "fires_delete_own" on public.fires;
create policy "fires_delete_own"
  on public.fires for delete
  using (user_id = auth.uid());

-- chat_rooms: only the two participants can see the room
drop policy if exists "chat_rooms_select_participant" on public.chat_rooms;
create policy "chat_rooms_select_participant"
  on public.chat_rooms for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- inserts happen exclusively through get_or_create_chat_room (security definer)
drop policy if exists "chat_rooms_insert_participant" on public.chat_rooms;
create policy "chat_rooms_insert_participant"
  on public.chat_rooms for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- messages: only participants of the room can read; only the sender, and
-- only if they belong to the room, can insert
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages for select
  using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = room_id and (r.user_a = auth.uid() or r.user_b = auth.uid())
    )
  );

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_rooms r
      where r.id = room_id and (r.user_a = auth.uid() or r.user_b = auth.uid())
    )
  );

drop policy if exists "messages_update_own_read_state" on public.messages;
create policy "messages_update_own_read_state"
  on public.messages for update
  using (
    exists (
      select 1 from public.chat_rooms r
      where r.id = room_id and (r.user_a = auth.uid() or r.user_b = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.chat_rooms r
      where r.id = room_id and (r.user_a = auth.uid() or r.user_b = auth.uid())
    )
  );

-- notifications: only the owner can see/update their own notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- join_requests: requester and project owner can both see a request;
-- only the requester can create one (for themselves, never on their own
-- project); status changes go exclusively through respond_to_join_request(),
-- so there is deliberately no generic UPDATE policy here for non-admins.
drop policy if exists "join_requests_select_participant" on public.join_requests;
create policy "join_requests_select_participant"
  on public.join_requests for select
  using (
    requester_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "join_requests_insert_own" on public.join_requests;
create policy "join_requests_insert_own"
  on public.join_requests for insert
  with check (
    requester_id = auth.uid()
    and not exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- reports: reporters can see their own submissions (so the UI can say
-- "already reported"), and insert new ones for themselves. No client-side
-- select of the full open-report queue — that's admin-only, via the bypass
-- below — and no client-side update at all; resolving goes through the
-- resolve_report() RPC.
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select
  using (reporter_id = auth.uid());

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  with check (
    reporter_id = auth.uid()
    and (reported_profile_id is null or reported_profile_id <> auth.uid())
    and (
      reported_project_id is null
      or not exists (select 1 from public.projects p where p.id = reported_project_id and p.owner_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- Admin bypass: admins can select/update/delete anything via a dedicated
-- policy, checked against the profiles.is_admin flag of the caller.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists "admin_full_profiles" on public.profiles;
create policy "admin_full_profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_full_projects" on public.projects;
create policy "admin_full_projects" on public.projects for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_full_fires" on public.fires;
create policy "admin_full_fires" on public.fires for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_full_notifications" on public.notifications;
create policy "admin_full_notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_full_join_requests" on public.join_requests;
create policy "admin_full_join_requests" on public.join_requests for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_full_reports" on public.reports;
create policy "admin_full_reports" on public.reports for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- RPC: resolve_report — admin-only, marks a report resolved/dismissed and
-- optionally shadowbans the reported profile/project in the same call.
-- ============================================================================
create or replace function public.resolve_report(report_id uuid, action report_status, also_shadowban boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rep record;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if action = 'open' then
    raise exception 'action must be resolved or dismissed';
  end if;

  select * into rep from public.reports where id = report_id;
  if rep is null then
    raise exception 'report not found';
  end if;

  update public.reports set status = action, resolved_at = now() where id = report_id;

  if also_shadowban and action = 'resolved' then
    if rep.reported_profile_id is not null then
      update public.profiles set is_shadowbanned = true where id = rep.reported_profile_id;
    elsif rep.reported_project_id is not null then
      update public.projects set is_shadowbanned = true where id = rep.reported_project_id;
    end if;
  end if;
end;
$$;

-- ============================================================================
-- RPC: get_inbox — chat rooms for the caller, each with the other participant,
-- a last-message preview, and an unread count, sorted by recency. Powers
-- /messages without an N+1 query per room from the client.
-- ============================================================================
create or replace function public.get_inbox()
returns table (
  room_id uuid,
  other_user_id uuid,
  last_message_at timestamptz,
  last_message_content text,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    r.id as room_id,
    case when r.user_a = auth.uid() then r.user_b else r.user_a end as other_user_id,
    r.last_message_at,
    (
      select m.content from public.messages m
      where m.room_id = r.id
      order by m.created_at desc
      limit 1
    ) as last_message_content,
    (
      select count(*) from public.messages m
      where m.room_id = r.id and m.sender_id <> auth.uid() and m.read_at is null
    ) as unread_count
  from public.chat_rooms r
  where r.user_a = auth.uid() or r.user_b = auth.uid()
  order by r.last_message_at desc;
$$;

-- ============================================================================
-- Storage: avatars bucket
-- Public read (avatars are shown everywhere), writes restricted to files
-- whose path is prefixed with the uploader's own uid, e.g. `{uid}/avatar.png`.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar_public_read" on storage.objects;
create policy "avatar_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatar_owner_write" on storage.objects;
create policy "avatar_owner_write"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_owner_update" on storage.objects;
create policy "avatar_owner_update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_owner_delete" on storage.objects;
create policy "avatar_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Realtime: expose tables needed for live UI updates
-- ============================================================================
do $pub$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $pub$;
do $pub$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $pub$;
do $pub$ begin
  alter publication supabase_realtime add table public.fires;
exception when duplicate_object then null; end $pub$;
do $pub$ begin
  alter publication supabase_realtime add table public.join_requests;
exception when duplicate_object then null; end $pub$;

