-- ============================================================================
-- 017_stamp_bigint_drop_touch.sql — החותמת היא `bigint` של המכשיר
-- ============================================================================
--
-- ⛔ **רץ במסד.**
--
-- ⛔⛔ **מה הקובץ עושה:** ⚠️ מסיר את טריגרי ה-`touch` שבצד השרת, ⛔ וממיר
--    את `updated_at` מ-`timestamptz` ל-`bigint` — ⭐ מילישניות מאז העידן,
--    בדיוק מה ש-`Date.now()` מייצר.
--
-- ⛔⛔ **הנימוק:** ⚠️ חותמת שרת הופכת מכשיר שערך אופליין לחדש יותר בטעות
--    ודורסת את עריכתו האמיתית — ⭐ הטריגר דרס את החותמת ב-`NOW()` בכל
--    `UPDATE`, ⛔ ולכן דחיפה של מכשיר אחד נראתה «חדשה» מעריכה שטרם עלתה.
--    ⚠️ שתי החומות שהחזיקו את זה — «⏳ מנצחת» ו«דוחפים רק מי שניצח» —
--    ⛔ הן טיפול בסימפטום: ⭐ מנוע ההכרעה חייב מקור חותמת **אחד**,
--    ⛔ והוא המכשיר שערך.
--
-- ⚠️ **ואין `default`** — ⛔ ולא `now()` במילישניות: ⭐ ברירת מחדל בצד השרת
--    היא מקור חותמת שני שמתמלא בשקט כשהקוד שוכח. ⚠️ `not null` בלי ברירה
--    מפיל כתיבה כזו ברעש, ⛔ וזה הרצוי.
--
-- ⚠️ **`deleted_at` נשאר `timestamptz`** — ⛔ הוא אינו חותמת מיזוג: ⭐ איש
--    אינו מכריע לפיו, ⛔ והוא נקרא בעיני אדם.
--
-- ⛔ **`users_touch_updated_at()` אינה נגרעת כאן** — ⚠️ היא משרתת גם את
--    `ys_users`, ⭐ ולכן היא נגרעת במיגרציה של הריפו שהוא בעליה.
--
-- ⛔ **נמדד לפני ההמרה:** ⚠️ 11 · 1 · 63 · 92 · 1 שורות בחמש הטבלאות.
-- ============================================================================

drop trigger if exists sl_lists_touch        on public.sl_lists;
drop trigger if exists sl_settings_touch     on public.sl_settings;
drop trigger if exists sl_students_touch     on public.sl_students;
drop trigger if exists sl_transactions_touch on public.sl_transactions;
drop trigger if exists sl_users_touch        on public.sl_users;

drop function if exists public.sl_touch_updated_at();

do $$
declare t text;
begin
  foreach t in array array['sl_lists','sl_settings','sl_students','sl_transactions','sl_users'] loop
    if (select data_type from information_schema.columns
          where table_schema = 'public' and table_name = t
            and column_name = 'updated_at') is distinct from 'bigint' then
      execute format('alter table public.%I alter column updated_at drop default', t);
      execute format('alter table public.%I alter column updated_at type bigint '
                     'using (extract(epoch from updated_at) * 1000)::bigint', t);
    end if;
  end loop;
end $$;
