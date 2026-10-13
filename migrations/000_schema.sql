-- migrations/000_schema.sql — שכר לימוד: הסכימה החיה

-- ── שכר לימוד ──

create table if not exists public.sl_lookups (
  client_id text not null,
  kind text not null,
  label text not null,
  sort integer default 0,
  created_at timestamp with time zone default now(),
  updated_at bigint not null,
  deleted boolean default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint sl_lookups_pkey PRIMARY KEY (client_id)
);

create table if not exists public.sl_settings (
  key text not null,
  value text,
  updated_at bigint not null,
  client_id text,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint sl_settings_pkey PRIMARY KEY (key),
  constraint sl_settings_value_json CHECK (((value IS NULL) OR ((value)::jsonb IS NOT NULL)))
);

-- תקופות הפעילות — מערך { start, end } ב-YYYY-MM, ו-end ריק לתקופה פתוחה; CHECK אינו יכול להריץ שאילתה, ולכן הבדיקה בפונקציה.
-- בלי חפיפה, ותקופה פתוחה אחת לכל היותר — האחרונה: שתיים פתוחות הן שני חיובים לאותו חודש.
CREATE OR REPLACE FUNCTION public.sl_students_periods_ok(p jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  e jsonb; prev_end text; prev_open boolean := false; n integer := 0;
  rx constant text := '^[0-9]{4}-(0[1-9]|1[0-2])$';
begin
  if p is null or jsonb_typeof(p) <> 'array' then return false; end if;
  for e in select x from jsonb_array_elements(p) x order by x->>'start' loop
    if jsonb_typeof(e) <> 'object' or coalesce(e->>'start', '') !~ rx then return false; end if;
    if e->>'end' is not null and (e->>'end' !~ rx or e->>'end' < e->>'start') then return false; end if;
    if prev_open or (n > 0 and e->>'start' <= prev_end) then return false; end if;
    prev_end := e->>'end'; prev_open := e->>'end' is null; n := n + 1;
  end loop;
  return true;
end
$function$;

create table if not exists public.sl_students (
  name text not null,
  card_settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  client_id text not null,
  updated_at bigint not null,
  periods jsonb not null,
  constraint sl_students_pkey PRIMARY KEY (client_id),
  constraint sl_students_periods_check CHECK (public.sl_students_periods_ok(periods))
);

create table if not exists public.sl_transactions (
  txn_date date not null,
  amount numeric(10,2) not null,
  payment_method text,
  note text,
  created_at timestamp with time zone default now(),
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  created_by_client_id text,
  client_id text not null,
  updated_at bigint not null,
  student_client_id text,
  constraint sl_transactions_pkey PRIMARY KEY (client_id),
  constraint sl_transactions_student_client_id_fkey FOREIGN KEY (student_client_id) REFERENCES sl_students(client_id) ON DELETE RESTRICT
);

create table if not exists public.sl_users (
  client_id text not null,
  username text not null,
  full_name text not null,
  role text not null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at bigint not null,
  pass_salt text,
  pass_fp text,
  sort integer,
  constraint sl_users_pkey PRIMARY KEY (client_id),
  constraint sl_users_username_key UNIQUE (username),
  constraint sl_users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'junior'::text])))
);

create index if not exists sl_lookups_kind_idx ON public.sl_lookups USING btree (kind, sort);
create UNIQUE index if not exists sl_settings_client_id_key ON public.sl_settings USING btree (client_id);
create index if not exists sl_students_name_idx ON public.sl_students USING btree (name);
create index if not exists sl_transactions_student_date_idx ON public.sl_transactions USING btree (student_client_id, txn_date);

-- revoke לפני grant — GRANT מוסיף ואינו מחליף, וטבלה חדשה ב-Supabase נולדת עם DELETE ו-TRUNCATE ל-anon.
revoke all on table public.sl_lookups from anon, authenticated;
grant select, insert, update on table public.sl_lookups to anon, authenticated;
grant all on table public.sl_lookups to service_role;
revoke all on table public.sl_settings from anon, authenticated;
grant select, insert, update on table public.sl_settings to anon, authenticated;
grant all on table public.sl_settings to service_role;
revoke all on table public.sl_students from anon, authenticated;
grant select, insert, update on table public.sl_students to anon, authenticated;
grant all on table public.sl_students to service_role;
revoke all on table public.sl_transactions from anon, authenticated;
grant select, insert, update on table public.sl_transactions to anon, authenticated;
grant all on table public.sl_transactions to service_role;
revoke all on table public.sl_users from anon, authenticated;
grant select, insert, update on table public.sl_users to anon, authenticated;
grant all on table public.sl_users to service_role;

alter table public.sl_lookups enable row level security;
drop policy if exists sl_lookups_all on public.sl_lookups;
create policy sl_lookups_all on public.sl_lookups as permissive for all to anon, authenticated using (true) with check (true);
alter table public.sl_settings enable row level security;
drop policy if exists sl_settings_all on public.sl_settings;
create policy sl_settings_all on public.sl_settings as permissive for all to anon, authenticated using (true) with check (true);
alter table public.sl_students enable row level security;
drop policy if exists sl_students_all on public.sl_students;
create policy sl_students_all on public.sl_students as permissive for all to anon, authenticated using (true) with check (true);
alter table public.sl_transactions enable row level security;
drop policy if exists sl_transactions_all on public.sl_transactions;
create policy sl_transactions_all on public.sl_transactions as permissive for all to anon, authenticated using (true) with check (true);
alter table public.sl_users enable row level security;
drop policy if exists sl_users_all on public.sl_users;
create policy sl_users_all on public.sl_users as permissive for all to anon, authenticated using (true) with check (true);
