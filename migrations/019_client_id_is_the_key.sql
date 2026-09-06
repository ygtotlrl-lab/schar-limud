-- ============================================================================
-- 019_client_id_is_the_key.sql — `client_id` הוא מפתח הזהות, ו-`SERIAL` יורד
-- ============================================================================
--
-- ⛔ **רץ במסד.**
--
-- ⛔⛔ **מה הקובץ עושה:** ⚠️ משלים `client_id` לכל שורה שנוצרה לפני `006`,
--    ⛔ הופך אותו למפתח הראשי בשלוש הטבלאות, ⛔ מעביר את המפתח הזר של
--    התנועות מ-`student_id` ל-`student_client_id`, ⛔ וגורע את ה-`SERIAL`.
--
-- ⛔⛔ **הנימוק — והוא כסף:** ⚠️ `id` הוא `SERIAL` שהמסד מקצה, ⭐ ולכן רשומה
--    שנוצרה במכשיר **חסרת זהות עד שהיא מגיעה לשרת**: ⛔ ניסיון חוזר אחרי
--    תשובה שאבדה ברשת הקצה `id` שני — ⚠️ תשלום כפול, בכסף. ⭐ מזהה שנוצר
--    במכשיר קיים לפני שראה שרת, ⛔ ו-`upsert` עליו אידמפוטנטי.
--
-- ⛔⛔ **וההשלמה היא `id::text` ⛔ ולא מזהה חדש** — ⚠️ **וזה מה שמונע
--    כפילות**: ⭐ מכשיר שמחזיק מראה מלפני המיגרציה מפתח את שורותיו לפי
--    `id`, ⛔ ומזהה חדש בענן היה נראה לו **רשומה שנייה** — ⚠️ ובכסף,
--    תנועה שנייה. ⭐ `id::text` נופל בדיוק על אותו מפתח, ⛔ והמיזוג מזהה
--    את השורה כאותה שורה.
--
-- ⛔ **נמדד לפני ההשלמה:** ⚠️ 63 מתוך 63 תלמידים · 25 מתוך 92 תנועות ·
--    9 מתוך 11 שורות רשימה נשאו `client_id` ריק, ⭐ ואפס תנועות בלי תלמיד.
--
-- ⚠️ **והאינדקסים הייחודיים על `client_id` כבר קיימים מ-`014`** — ⛔ הם
--    נגרעים כאן ⚠️ שהמפתח הראשי מייצר אינדקס משלו: ⭐ שני אינדקסים ייחודיים
--    על אותה עמודה הם עבודה כפולה בכל כתיבה.
-- ============================================================================

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'sl_transactions'
                    and column_name = 'student_id')
  then return; end if;

  update public.sl_students     set client_id = id::text where client_id is null;
  update public.sl_transactions set client_id = id::text where client_id is null;
  update public.sl_lists        set client_id = id::text where client_id is null;

  alter table public.sl_transactions add column if not exists student_client_id text;
  update public.sl_transactions t
     set student_client_id = s.client_id
    from public.sl_students s
   where s.id = t.student_id and t.student_client_id is null;

  alter table public.sl_transactions drop constraint if exists sl_transactions_student_id_fkey;
  drop index if exists public.sl_transactions_student_date_idx;

  alter table public.sl_students     alter column client_id set not null;
  alter table public.sl_transactions alter column client_id set not null;
  alter table public.sl_lists        alter column client_id set not null;

  drop index if exists public.sl_students_client_id_key;
  drop index if exists public.sl_transactions_client_id_key;
  drop index if exists public.sl_lists_client_id_key;

  -- ⛔ גריעת `id` היא שגורעת איתה את המפתח הראשי ואת הרצף — ⚠️ שניהם
  -- תלויים בה, ⭐ ולכן אין צורך לגרוע אותם בנפרד.
  alter table public.sl_students     drop column id;
  alter table public.sl_transactions drop column id;
  alter table public.sl_transactions drop column student_id;
  alter table public.sl_lists        drop column id;

  alter table public.sl_students     add primary key (client_id);
  alter table public.sl_transactions add primary key (client_id);
  alter table public.sl_lists        add primary key (client_id);

  alter table public.sl_transactions
    add constraint sl_transactions_student_client_id_fkey
    foreign key (student_client_id) references public.sl_students(client_id)
    on delete restrict;

  create index if not exists sl_transactions_student_date_idx
    on public.sl_transactions (student_client_id, date);
end $$;
