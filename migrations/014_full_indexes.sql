-- ============================================================================
-- 014_full_indexes.sql — החלפת שני האינדקסים החלקיים באינדקסים מלאים
-- ============================================================================
--
-- ⛔ **רץ במסד.** ⛔ מיגרציה שכבר רצה אינה נערכת — ⚠️ המסד החיל אותה,
--    ועריכה שלה יוצרת מצב שבו הקובץ מתאר משהו אחר ממה שרץ; ⛔ שינוי מבני
--    נעשה בקובץ הבא בתור.
--
-- שני אינדקסים שרדו מלפני הכלל של `migrations/007` («אין ליצור אינדקס חלקי
-- בשום מיגרציה עתידית»). נבדקו מול המסד:
--
--   sl_students_active_idx      ON sl_students     (name)             WHERE deleted = false
--   sl_transactions_active_idx  ON sl_transactions (student_id, date) WHERE deleted = false
--
-- ⚠️ **תיקון עובדתי, וחשוב שיהיה כתוב:** שני אלה **אינם ייחודיים ואינם
-- יעד של `ON CONFLICT`**, ולכן הם **אינם** גורמים ל-42P10 שתיאר.
--    התקלה ההיא נגעה לאינדקסים החלקיים על `client_id`, והם כבר הוחלפו
--    למלאים ב-007 (אומת: אפס אינדקסים חלקיים על `client_id`).
--    מה שכן: אינדקס חלקי משמש את המתכנן **רק** כשהשאילתה חוזרת על התנאי
--    שלו, ומאז `migrations/008` שכבת המראה מושכת `select('*')` בלי
--    `.eq('deleted',false)` — הסינון עבר ל-`slApplyMirror` בצד הלקוח.
--    כלומר האינדקסים החלקיים האלה **אינם משרתים היום אף שאילתה**.
--
-- ⛔ הסדר הוא יצירה ואז מחיקה, ולא להפך — שלא ייווצר רגע שבו
--    הטבלה בלי אינדקס על העמודות האלה.
-- ⛔ אין נגיעה בנתונים.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS sl_students_name_idx
  ON public.sl_students (name);
DROP INDEX IF EXISTS public.sl_students_active_idx;

CREATE INDEX IF NOT EXISTS sl_transactions_student_date_idx
  ON public.sl_transactions (student_id, date);
DROP INDEX IF EXISTS public.sl_transactions_active_idx;

-- ---------- אימות ----------
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE schemaname='public' AND tablename IN ('sl_students','sl_transactions');
-- מצופה: אפס `WHERE` ב-indexdef.
