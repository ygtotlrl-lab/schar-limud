-- ============================================================================
-- 004_students_enrollment_months.sql — חודש הצטרפות / חודש עזיבה לתלמיד
-- ============================================================================
--
-- ⛔ **רץ במסד.** ⛔ מיגרציה שכבר רצה אינה נערכת — ⚠️ המסד החיל אותה,
--    ועריכה שלה יוצרת מצב שבו הקובץ מתאר משהו אחר ממה שרץ; ⛔ שינוי מבני
--    נעשה בקובץ הבא בתור.
--
-- למה: עד היום כל תלמיד פעיל חויב אוטומטית ב-12 חודשי השנה, בלי דרך להגדיר
-- מתי הצטרף. תלמיד שהגיע באמצע השנה הוצג כחייב גם על חודשים שלא היה בהם,
-- ומי שעזב המשיך להיצבר לו חוב. מעכשיו:
--   start_month — החודש הראשון שבו התלמיד פעיל (פורמט 'YYYY-MM')
--   end_month   — החודש האחרון שבו היה פעיל; NULL = עדיין פעיל
-- החיוב מחושב רק לחודשים שבטווח (כולל). תלמיד בלי start_month מתנהג
-- כמו קודם — כל השנה — כדי לא לשבור נתונים קיימים.
--
-- ⚠️ גבולות שנת הלימודים (ספטמבר–אוגוסט) לא השתנו. הטווח כאן הוא חודשי
--    לוח גרגוריאני ('2025-09'), והשוואתו לקסיקוגרפית — הפורמט הזה ממוין
--    כרונולוגית כמחרוזת.
--
-- הרצה חוזרת בטוחה.
-- ============================================================

-- ---------- 1. העמודות החדשות ----------
ALTER TABLE public.sl_students
  ADD COLUMN IF NOT EXISTS start_month TEXT,
  ADD COLUMN IF NOT EXISTS end_month   TEXT;

COMMENT ON COLUMN public.sl_students.start_month IS
  'החודש הראשון שבו התלמיד פעיל, בפורמט YYYY-MM. NULL = חויב בכל חודשי השנה (התנהגות ישנה).';
COMMENT ON COLUMN public.sl_students.end_month IS
  'החודש האחרון שבו התלמיד היה פעיל, בפורמט YYYY-MM. NULL = עדיין פעיל.';

-- ---------- 2. אילוצי פורמט וסדר ----------
-- ערך שאינו YYYY-MM שובר את ההשוואה הלקסיקוגרפית בקוד ומחזיר טווח שגוי,
-- ולכן המסד חוסם אותו. ה-DO block נועד לאידמפוטנטיות (אין ADD CONSTRAINT
-- IF NOT EXISTS ב-Postgres).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sl_students_months_format_chk'
      AND conrelid = 'public.sl_students'::regclass
  ) THEN
    ALTER TABLE public.sl_students
      ADD CONSTRAINT sl_students_months_format_chk CHECK (
        (start_month IS NULL OR start_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
        AND
        (end_month   IS NULL OR end_month   ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sl_students_months_order_chk'
      AND conrelid = 'public.sl_students'::regclass
  ) THEN
    ALTER TABLE public.sl_students
      ADD CONSTRAINT sl_students_months_order_chk CHECK (
        start_month IS NULL OR end_month IS NULL OR end_month >= start_month
      );
  END IF;
END $$;

-- ---------- 3. הסרת handled_months ----------
-- העמודה לא נקראה ולא נכתבה באף מקום בקוד, וכל הרשומות החזיקו בה ערך ריק
-- ('[]'). אומת לפני ההסרה. היא הוסרה גם מ-000_initial_schema.sql כדי שלא
-- תיווצר מחדש בהתקנה טרייה.
ALTER TABLE public.sl_students
  DROP COLUMN IF EXISTS handled_months;

-- ---------- 4. אימות ----------
DO $$
DECLARE
  has_start bool;
  has_end   bool;
  has_old   bool;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='sl_students' AND column_name='start_month') INTO has_start;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='sl_students' AND column_name='end_month') INTO has_end;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='sl_students' AND column_name='handled_months') INTO has_old;

  IF NOT has_start OR NOT has_end THEN
    RAISE EXCEPTION 'המיגרציה נכשלה: start_month/end_month לא נוצרו';
  END IF;
  IF has_old THEN
    RAISE EXCEPTION 'המיגרציה נכשלה: handled_months עדיין קיימת';
  END IF;

  RAISE NOTICE '✅ 004 הושלמה: start_month/end_month נוספו, handled_months הוסרה';
END $$;
