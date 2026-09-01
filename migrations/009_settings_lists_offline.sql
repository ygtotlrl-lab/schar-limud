-- ============================================================================
-- 009_settings_lists_offline.sql — sl_settings ו-sl_lists נכנסות לשכבת האופליין
-- ============================================================================
--
-- ⛔ **רץ במסד.** ⛔ מיגרציה שכבר רצה אינה נערכת — ⚠️ המסד החיל אותה,
--    ועריכה שלה יוצרת מצב שבו הקובץ מתאר משהו אחר ממה שרץ; ⛔ שינוי מבני
--    נעשה בקובץ הבא בתור.
--
-- ⚠️ מיגרציה **מחייבת** לסבב הזה. בלעדיה עריכת הגדרות ורשימות אופליין
--    אינה עובדת, וה-upsert על `client_id` ב-`sl_lists` נכשל ב-42P10.
--
-- **הרקע.** 008 הוסיפה `updated_at` ל-`sl_transactions` ול-`sl_students`
-- בלבד, ולכן שתי טבלאות ההגדרות נשארו מחוץ למנוע המיזוג: אין להן חותמת
-- להשוות, ובלי חותמת אי אפשר להכריע איזו משתי גרסאות היא החדשה. הן היו
-- ממורות **לקריאה בלבד**, ועל ארבעת נתיבי העריכה שלהן נשאר `guardOnline`.
-- המיגרציה הזו נותנת להן בדיוק את מה שיש לשתי טבלאות הליבה, ולכן הן
-- נכנסות לאותה שכבה בדיוק.
--
-- שלושה דברים, ולכל אחד סיבה נפרדת:
--   1. `updated_at` + טריגר — חותמת המיזוג (כלל ברזל 6, סעיף 5).
--   2. `client_id` + **אינדקס ייחודי מלא** — זהות שנוצרת במכשיר, כדי
--      שרשומה שנוצרה אופליין תהיה ניתנת ל-UPSERT אידמפוטנטי.
--   3. `deleted`/`deleted_at`/`deleted_by` ל-**`sl_lists` בלבד** — בלי
--      tombstone, פריט שנמחק במכשיר אחד חוזר לחיים במיזוג הבא.
--
-- אידמפוטנטית — אפשר להריץ שוב בבטחה.
-- ============================================================

-- ============================================================
-- 1. updated_at
-- ============================================================
-- ⚠️ **המכשיר שולח `updated_at` משלו**, והטריגר דורס אותה **ב-UPDATE בלבד**
--    — בדיוק כמו ב-008. ב-INSERT הטריגר אינו יורה, ולכן פריט רשימה שנוצר
--    אופליין נושא את חותמת **היצירה** ולא את חותמת ההגעה לשרת.
ALTER TABLE public.sl_settings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sl_lists
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- הפונקציה כבר קיימת מ-008; CREATE OR REPLACE כדי שהמיגרציה תעמוד גם
-- לבדה, על מסד שבו 008 לא הורצה משום סיבה.
CREATE OR REPLACE FUNCTION public.sl_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sl_settings_touch ON public.sl_settings;
CREATE TRIGGER sl_settings_touch
  BEFORE UPDATE ON public.sl_settings
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();

DROP TRIGGER IF EXISTS sl_lists_touch ON public.sl_lists;
CREATE TRIGGER sl_lists_touch
  BEFORE UPDATE ON public.sl_lists
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();

-- ============================================================
-- 2. client_id + אינדקס ייחודי **מלא**
-- ============================================================
-- ⛔⛔ **האינדקס חייב להיות מלא ולא חלקי.** זו בדיוק התקלה של 006, ש-007
-- באה לתקן, ואין לחזור עליה. Postgres מסיק את אינדקס-הבורר של ON CONFLICT
-- מרשימת העמודות, ועבור אינדקס **חלקי** ההסקה מצליחה רק אם המשפט חוזר על
-- ה-predicate של האינדקס:
--     ON CONFLICT (client_id) WHERE client_id IS NOT NULL   ✅
--     ON CONFLICT (client_id)                               ❌ 42P10
-- ו-PostgREST — כלומר `.upsert(row,{onConflict:'client_id'})` — פולט תמיד
-- את הצורה השנייה, ואין בו שום דרך להוסיף predicate.
--
-- אינדקס מלא אינו ויתור: `client_id` מותרת ב-NULL, וב-Postgres ערכי NULL
-- **נחשבים שונים זה מזה** באינדקס ייחודי רגיל — כלומר כל השורות ההיסטוריות
-- (שנוצרו לפני העמודה ולכן `client_id IS NULL`) מותרות בדיוק כמו באינדקס
-- החלקי. **מה שנשבר בחלקי הוא ההסקה, לא הייחודיות.**
ALTER TABLE public.sl_settings ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.sl_lists    ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS sl_settings_client_id_key
  ON public.sl_settings (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS sl_lists_client_id_key
  ON public.sl_lists (client_id);

-- ⚠️ **הערה על `sl_settings`:** המפתח הראשי שלה הוא `key` (TEXT) ולא SERIAL,
-- כלומר לרשומה **כבר יש** זהות שהמכשיר יודע לייצר לבדו. לכן האפליקציה
-- כותבת אליה ב-`upsert(..., {onConflict:'key'})`, וזה כבר אידמפוטנטי.
-- העמודה נוספת כאן לשם סימטריה סכימתית ולשימוש עתידי — **ולא כדי להחליף
-- את `key` כמפתח הכתיבה.** ב-`sl_lists`, לעומת זאת, ה-`id` הוא SERIAL
-- והמסד מקצה אותו, ולכן שם `client_id` הוא **מפתח הכתיבה בפועל** לכל
-- פריט שנוצר במכשיר.

-- ============================================================
-- 3. tombstones ל-sl_lists
-- ============================================================
-- ⚠️ בלי זה אי אפשר למחוק פריט רשימה אופליין: מנוע המיזוג בנוי על הכלל
-- ש**היעדר רשומה אצל צד אחד אינו מחיקה** (כלל ברזל 6, סעיף 1), ולכן פריט
-- שנמחק פיזית במכשיר א' היה חוזר אליו מהענן בסנכרון הבא, שוב ושוב.
-- מחיקה חייבת להיות עובדה מסומנת ומתוארכת, כמו ב-`sl_students` וב-
-- `sl_transactions`.
--
-- `sl_settings` **אינה מקבלת את העמודות האלה בכוונה**: שורותיה הן זוגות
-- מפתח/ערך קבועים שנכתבים ונקראים ולעולם לא נמחקים. אין נתיב מחיקה בקוד,
-- ואין טעם בעמודה שאף אחד לא יכתוב אליה.
ALTER TABLE public.sl_lists ADD COLUMN IF NOT EXISTS deleted     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.sl_lists ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;
ALTER TABLE public.sl_lists ADD COLUMN IF NOT EXISTS deleted_by  TEXT;

CREATE INDEX IF NOT EXISTS sl_lists_deleted_idx ON public.sl_lists (deleted);

-- ============================================================
-- 4. אימות
-- ============================================================
-- ארבע שורות `updated_at` (שתיים מ-008 ושתיים מכאן):
--
-- SELECT table_name, column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND column_name='updated_at'
--    AND table_name LIKE 'sl_%' ORDER BY table_name;
--
-- ארבעה טריגרים:
--
-- SELECT tgname, tgrelid::regclass FROM pg_trigger
--  WHERE NOT tgisinternal AND tgname LIKE 'sl_%_touch' ORDER BY tgname;
--
-- ארבעה אינדקסים ייחודיים על client_id, **כולם בלי WHERE ב-indexdef**:
--
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE schemaname='public' AND indexdef ILIKE '%client_id%' ORDER BY indexname;
--
-- ושלוש עמודות ה-soft-delete ב-sl_lists:
--
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='sl_lists'
--    AND column_name IN ('deleted','deleted_at','deleted_by');
--
-- והבדיקה שסוגרת את הלולאה — EXPLAIN בלבד, לא מריץ ולא כותב שורה. אם היא
-- מתכננת בהצלחה, ה-upsert של האפליקציה על רשימות יעבוד:
--
-- EXPLAIN INSERT INTO public.sl_lists (client_id, category, value)
-- VALUES ('00000000-0000-4000-8000-000000000000', 'payment_methods', 'בדיקה')
-- ON CONFLICT (client_id) DO UPDATE SET value = EXCLUDED.value;
