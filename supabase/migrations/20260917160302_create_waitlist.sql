-- The waitlist itself.
create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       text        not null,
  handle      text        not null,
  joined_at   timestamptz not null default now(),
  user_agent  text,
  constraint waitlist_email_shape check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint waitlist_handle_len  check (char_length(handle) between 2 and 40)
);

-- One signup per person, case-insensitively: "Ada@x.com" and "ada@x.com" are
-- the same human. This is what makes duplicate detection the database's job.
create unique index if not exists waitlist_email_key
  on public.waitlist (lower(email));

-- RLS on with *no policies at all*: neither the browser nor the publishable
-- key can read, insert, update or delete this table directly. The only way in
-- is the security-definer function, so the list can never be scraped.
alter table public.waitlist enable row level security;

revoke all on public.waitlist from anon, authenticated;

-- Superseded by the four-argument version in the next migration.
create or replace function public.join_waitlist(p_email text, p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email    text := lower(btrim(p_email));
  v_handle   text := btrim(p_handle);
  v_id       bigint;
  v_dupe     boolean := false;
  v_position integer;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  if left(v_handle, 1) <> '@' then
    v_handle := '@' || v_handle;
  end if;

  if char_length(v_handle) < 2 then
    raise exception 'invalid handle' using errcode = '22023';
  end if;

  insert into public.waitlist (email, handle)
  values (v_email, v_handle)
  on conflict (lower(email)) do nothing
  returning id into v_id;

  if v_id is null then
    v_dupe := true;
    select id into v_id from public.waitlist where lower(email) = v_email;
  end if;

  select count(*) into v_position from public.waitlist where id <= v_id;

  return jsonb_build_object('duplicate', v_dupe, 'position', v_position);
end;
$$;

revoke all on function public.join_waitlist(text, text) from public;
grant execute on function public.join_waitlist(text, text) to anon, authenticated;
