-- ═══ 000_schema.sql — שכר לימוד: הסכימה החיה ═══════════════════════════

-- ─── שכר לימוד ─────────────────────────────────────────────────────────

create table if not exists public.sl_lists (
  category text not null,
  value text not null,
  updated_at bigint not null,
  client_id text not null,
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  constraint sl_lists_pkey PRIMARY KEY (client_id)
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

create table if not exists public.sl_students (
  name text not null,
  active boolean default true,
  card_settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  start_month text,
  end_month text,
  client_id text not null,
  updated_at bigint not null,
  constraint sl_students_pkey PRIMARY KEY (client_id),
  constraint sl_students_months_format_chk CHECK ((((start_month IS NULL) OR (start_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text)) AND ((end_month IS NULL) OR (end_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::text)))),
  constraint sl_students_months_order_chk CHECK (((start_month IS NULL) OR (end_month IS NULL) OR (end_month >= start_month)))
);

create table if not exists public.sl_transactions (
  date date not null,
  amount numeric(10,2) not null,
  payment_method text,
  note text,
  created_at timestamp with time zone default now(),
  deleted boolean not null default false,
  deleted_at timestamp with time zone,
  deleted_by text,
  created_by text,
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
  constraint sl_users_pkey PRIMARY KEY (client_id),
  constraint sl_users_username_key UNIQUE (username),
  constraint sl_users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'junior'::text])))
);

create UNIQUE index if not exists sl_settings_client_id_key ON public.sl_settings USING btree (client_id);
create index if not exists sl_students_name_idx ON public.sl_students USING btree (name);
create index if not exists sl_transactions_student_date_idx ON public.sl_transactions USING btree (student_client_id, date);

-- ⛔ revoke לפני grant — GRANT מוסיף ואינו מחליף, וטבלה חדשה ב-Supabase נולדת
--    עם DELETE ו-TRUNCATE ל-anon: המחיקה היא deleted=true, ולא DELETE.
revoke all on table public.sl_lists from anon, authenticated;
grant select, insert, update on table public.sl_lists to anon, authenticated;
grant all on table public.sl_lists to service_role;
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

alter table public.sl_lists enable row level security;
drop policy if exists sl_lists_all on public.sl_lists;
create policy sl_lists_all on public.sl_lists as permissive for all to anon, authenticated using (true) with check (true);
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
