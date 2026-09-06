-- ============================================================================
-- 018_users_client_id_shape.sql — `sl_users` בצורת טבלת המשתמשים המשותפת
-- ============================================================================
--
-- ⛔ **רץ במסד.**
--
-- ⛔⛔ **מה הקובץ עושה:** ⚠️ בונה את הטבלה מחדש בתשע עמודות, **בסדר**:
--    `client_id` · `username` · `full_name` · `role` · `active` ·
--    `created_at` · `updated_at` · `pass_salt` · `pass_fp`.
--
-- ⛔⛔ **ולמה בנייה מחדש ולא `alter`:** ⚠️ פוסטגרס אינו יודע לשנות **סדר**
--    עמודות — ⭐ והסדר הוא חלק מהתקן: ⛔ שלוש טבלאות משתמשים שנבדלות
--    בסדר אינן ניתנות להשוואה בעין.
--
-- ⛔⛔ **`full_name` נוספת כאן, ⚠️ ולא הייתה קיימת** — ⭐ ערכה ההתחלתי הוא
--    `username`: ⛔ עמודה שאינה בשימוש באפליקציה הזו **נשארת בסכימה**,
--    ⚠️ שהתקן הוא «אותן עמודות, אותם טיפוסים, אותו סדר — גם לעמודה שאינה
--    בשימוש»: ⭐ טבלה מקבילה שחסרה בה עמודה אינה ניתנת להשוואה.
--
-- ⛔ **`id` ה-`SERIAL` יורד ו-`client_id` נכנס במקומו** — ⚠️ **והערך נשמר**
--    (`id::text`): ⭐ מזהה שנשמר הוא מזהה שאפשר לעקוב אחריו, ⛔ ומזהה חדש
--    היה מנתק כל מטמון כניסה אופליין קיים. ⚠️ **והרצף נגרע איתו** —
--    ⛔ רצף שנשאר בלי עמודה שמושכת ממנו הוא שריד.
--
-- ⛔ **המדיניות וההרשאות נבנות מחדש במפורש** — ⚠️ `drop table` גורע איתה
--    את ה-policy ואת ה-`grant`.
--
-- ⛔ **נמדד לפני הבנייה:** ⚠️ שורה אחת · אפס מפתחות זרים שמצביעים עליה.
-- ============================================================================

do $$
begin
  if to_regclass('public.sl_users') is null
     or exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'sl_users'
                   and column_name = 'client_id')
  then return; end if;

  create table if not exists public.sl_users__new (
    client_id  text        not null,
    username   text        not null,
    full_name  text        not null,
    role       text        not null,
    active     boolean     not null default true,
    created_at timestamptz not null default now(),
    updated_at bigint      not null,
    pass_salt  text,
    pass_fp    text,
    primary key (client_id),
    unique (username)
  );

  insert into public.sl_users__new
    (client_id, username, full_name, role, active, created_at, updated_at, pass_salt, pass_fp)
  select id::text, username, username, role, coalesce(active, true),
         coalesce(created_at, now()), updated_at, pass_salt, pass_fp
  from public.sl_users;

  drop table public.sl_users;
  alter table public.sl_users__new rename to sl_users;
  alter index public.sl_users__new_pkey         rename to sl_users_pkey;
  alter index public.sl_users__new_username_key rename to sl_users_username_key;

  drop sequence if exists public.sl_users_id_seq;

  alter table public.sl_users enable row level security;
  create policy sl_users_all on public.sl_users for all using (true) with check (true);
  grant select, insert, update on public.sl_users to anon, authenticated;
end $$;
