-- ============================================================
-- schar-limud — תיקון: אינדקס client_id מלא במקום חלקי
-- שם המיגרציה: fix_client_id_index_not_partial
-- הרץ ב-Supabase SQL Editor (פרויקט kxbtskqobynewvnckaaz):
--   https://supabase.com/dashboard/project/kxbtskqobynewvnckaaz/sql/new
-- ============================================================
-- ⚠️ מיגרציה **מחייבת**. בלעדיה שמירת תשלום ותלמיד חדש **אינה עובדת**.
--
-- מה קרה: 006 הורצה במסד בגרסה עם אינדקסים **חלקיים** —
--   CREATE UNIQUE INDEX sl_transactions_client_id_uidx
--     ON sl_transactions (client_id) WHERE client_id IS NOT NULL;
-- הכוונה נכונה (לא לאנדקס את הרשומות ההיסטוריות), אבל היא שוברת את ה-UPSERT.
--
-- למה: Postgres מסיק את "אינדקס הבורר" של ON CONFLICT מרשימת העמודות. עבור
-- אינדקס **חלקי** ההסקה מצליחה **רק אם המשפט חוזר על התנאי של האינדקס**:
--     ON CONFLICT (client_id) WHERE client_id IS NOT NULL   ✅ עובד
--     ON CONFLICT (client_id)                               ❌ 42P10
-- ו-PostgREST — כלומר `.upsert(row,{onConflict:'client_id'})` — פולט תמיד את
-- הצורה השנייה. אין בו שום דרך להוסיף predicate. אומת חי מול המסד ב-EXPLAIN:
-- הצורה הראשונה מתכננת ובוחרת את `sl_transactions_client_id_uidx` כבורר,
-- והשנייה נכשלת ב-
--   «there is no unique or exclusion constraint matching the ON CONFLICT specification».
--
-- למה אינדקס מלא הוא הפתרון הנכון ולא ויתור: `client_id` מותרת ב-NULL, וב-Postgres
-- ערכי NULL **נחשבים שונים זה מזה** באינדקס ייחודי רגיל. כלומר אינדקס מלא מתיר
-- את 25 התנועות ו-63 התלמידים חסרי ה-client_id בדיוק כמו האינדקס החלקי —
-- ההתנהגות זהה, וההבדל היחיד הוא כמה עמודי אינדקס לשורות NULL. **מה שנשבר
-- באינדקס החלקי הוא ההסקה, לא הייחודיות.**
--
-- הרצה חוזרת בטוחה. הסדר מכוון: יוצרים את המלא **לפני** שמוחקים את החלקי,
-- כדי שלא יהיה רגע אחד שבו אין הגנת ייחודיות על העמודה.
-- ============================================================

-- ---------- 1. sl_transactions ----------
CREATE UNIQUE INDEX IF NOT EXISTS sl_transactions_client_id_key
  ON public.sl_transactions (client_id);
DROP INDEX IF EXISTS public.sl_transactions_client_id_uidx;

-- ---------- 2. sl_students ----------
CREATE UNIQUE INDEX IF NOT EXISTS sl_students_client_id_key
  ON public.sl_students (client_id);
DROP INDEX IF EXISTS public.sl_students_client_id_uidx;

-- ---------- 3. אימות ----------
-- אמור להחזיר בדיוק שתי שורות, שתיהן **בלי** WHERE ב-indexdef:
--
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE schemaname='public' AND indexdef ILIKE '%client_id%' ORDER BY indexname;
--
-- והבדיקה שסוגרת את הלולאה — EXPLAIN בלבד, לא מריץ ולא כותב שורה.
-- אם היא מתכננת בהצלחה ומציגה "Conflict Arbiter Indexes", ה-upsert של
-- האפליקציה יעבוד:
--
-- EXPLAIN INSERT INTO public.sl_transactions (client_id, student_id, date, amount)
-- VALUES ('00000000-0000-4000-8000-000000000000', NULL, '2026-01-01', 1)
-- ON CONFLICT (client_id) DO UPDATE SET amount = EXCLUDED.amount;
