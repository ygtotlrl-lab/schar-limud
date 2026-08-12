-- ============================================================
-- שכר לימוד — הסכימה המלאה (מקור האמת היחיד)
-- שם המיגרציה: initial_schema
-- הרץ ב-Supabase SQL Editor (פרויקט kxbtskqobynewvnckaaz):
--   https://supabase.com/dashboard/project/kxbtskqobynewvnckaaz/sql/new
-- ============================================================
-- ⚠️ הקובץ הזה הוא **מקור האמת היחיד** לסכימה.
--    * `supabase-setup.sql` בשורש הריפו מפנה לכאן ואינו מכיל סכימה.
--    * `index.html` מושך את הקובץ הזה ב-fetch ומציג אותו במסך ההגדרה
--      הראשונית; יש בו עותק-גיבוי מוטבע לשעת חירום בלבד, ו-
--      `tools/check-sql-sync.py` נכשל אם הוא נפרד מהקובץ הזה.
--    כל שינוי סכימה נכנס כאן **וגם** כמיגרציית שדרוג נפרדת (00N_) עבור
--    התקנות קיימות. הרצה חוזרת בטוחה — הכל IF NOT EXISTS.
--
-- היסטוריה: 001 = soft-delete לתשלומים, 002 = soft-delete לתלמידים,
-- 003 = ON DELETE RESTRICT על sl_transactions, 004 = חודש הצטרפות/עזיבה
-- לתלמיד (והסרת handled_months), 006+007 = client_id + אינדקס ייחודי
-- **מלא**, 008 = updated_at + טריגר, 009 = updated_at/client_id/tombstones
-- ל-sl_settings ול-sl_lists. כולן כבר מוכלות כאן, ולכן על התקנה טרייה הן
-- no-op. (005 היא זריעת נתון בלבד ואינה חלק מהסכימה.)
-- ============================================================

-- ---------- משתמשים ----------
-- pass_salt / pass_fp (ראה migrations/010): טביעת PBKDF2-SHA256 ב-100,000
-- סיבובים עם מלח אקראי פר-משתמש, שנשמרת במכשיר ומאפשרת **כניסה בלי רשת**.
-- ⛔ `password` נשאר טקסט גלוי בענן במכוון — הטביעה נוספת לצידו ואינה
--    מחליפה אותו (כלל ברזל 9). במכשיר עצמו הסיסמה אינה נשמרת לעולם.
CREATE TABLE IF NOT EXISTS public.sl_users (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  pass_salt  TEXT,
  pass_fp    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- שדרוג התקנה שנוצרה לפני 010
ALTER TABLE public.sl_users
  ADD COLUMN IF NOT EXISTS pass_salt TEXT,
  ADD COLUMN IF NOT EXISTS pass_fp   TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_users TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_users_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_users_all" ON public.sl_users;
CREATE POLICY "sl_users_all" ON public.sl_users FOR ALL USING (true) WITH CHECK (true);

-- ---------- תלמידים ----------
-- מחיקה כאן היא soft-delete בלבד (ראה migrations/002): מחיקה פיזית הפעילה
-- ON DELETE CASCADE על sl_transactions והשמידה את כל היסטוריית הכספים.
-- start_month / end_month (ראה migrations/004): טווח החודשים שבו התלמיד
-- פעיל, בפורמט 'YYYY-MM'. החיוב מחושב רק בתוך הטווח (כולל); start_month
-- ריק = כל השנה, כמו לפני 004. end_month ריק = עדיין פעיל.
CREATE TABLE IF NOT EXISTS public.sl_students (
  id             SERIAL PRIMARY KEY,
  client_id      TEXT,
  name           TEXT NOT NULL,
  active         BOOLEAN DEFAULT true,
  start_month    TEXT,
  end_month      TEXT,
  card_settings  JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted        BOOLEAN NOT NULL DEFAULT false,
  deleted_at     TIMESTAMPTZ,
  deleted_by     TEXT
);
-- שדרוג התקנה שנוצרה לפני 002
ALTER TABLE public.sl_students
  ADD COLUMN IF NOT EXISTS deleted    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;
-- שדרוג התקנה שנוצרה לפני 004
ALTER TABLE public.sl_students
  ADD COLUMN IF NOT EXISTS start_month TEXT,
  ADD COLUMN IF NOT EXISTS end_month   TEXT;
-- שדרוג התקנה שנוצרה לפני 006 — client_id: מפתח זהות שנוצר במכשיר.
-- מותר ב-NULL בכוונה (רשומות היסטוריות); NULL-ים נחשבים שונים באינדקס ייחודי.
-- ⛔ האינדקס חייב להיות **מלא ולא חלקי** — ר' 007. אינדקס עם
--    `WHERE client_id IS NOT NULL` שובר את הסקת ON CONFLICT של PostgREST.
ALTER TABLE public.sl_students
  ADD COLUMN IF NOT EXISTS client_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sl_students_client_id_key
  ON public.sl_students (client_id);
DROP INDEX IF EXISTS public.sl_students_client_id_uidx;  -- הווריאנט החלקי, אם נוצר
-- handled_months הוסרה ב-004: היא לא נקראה ולא נכתבה באף מקום בקוד, וכל
-- הרשומות החזיקו בה ערך ריק. אין להחזיר אותה.
ALTER TABLE public.sl_students
  DROP COLUMN IF EXISTS handled_months;
-- ערך שאינו YYYY-MM שובר את ההשוואה הלקסיקוגרפית בקוד ומחזיר טווח שגוי.
-- ה-DO block נועד לאידמפוטנטיות (אין ADD CONSTRAINT IF NOT EXISTS).
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_students TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_students_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_students_all" ON public.sl_students;
CREATE POLICY "sl_students_all" ON public.sl_students FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS sl_students_active_idx
  ON public.sl_students (name)
  WHERE deleted = false;

-- ---------- תשלומים (כספים) ----------
-- מחיקה = soft-delete בלבד. כל שליפה/סיכום באפליקציה מסננת deleted = false.
-- ON DELETE RESTRICT (ראה migrations/003) — רשת ביטחון ברמת המסד: מחיקה
-- פיזית של תלמיד תיכשל במקום להשמיד בשקט את כל היסטוריית הכספים שלו.
CREATE TABLE IF NOT EXISTS public.sl_transactions (
  id             SERIAL PRIMARY KEY,
  client_id      TEXT,
  student_id     INTEGER REFERENCES public.sl_students(id) ON DELETE RESTRICT,
  date           DATE NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  created_by     TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted        BOOLEAN NOT NULL DEFAULT false,
  deleted_at     TIMESTAMPTZ,
  deleted_by     TEXT
);
-- שדרוג התקנה שנוצרה לפני 001
ALTER TABLE public.sl_transactions
  ADD COLUMN IF NOT EXISTS deleted    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;
-- שדרוג התקנה שנוצרה לפני 006 — client_id: מפתח זהות שנוצר במכשיר.
-- בלעדיו שליחה חוזרת של תשלום (ניתוק באמצע ואז ניסיון נוסף) יוצרת שורה
-- שנייה, כלומר תשלום כפול. הכתיבה מהאפליקציה היא UPSERT על העמודה הזו.
-- ⛔ האינדקס חייב להיות **מלא ולא חלקי** — ר' 007. אינדקס עם
--    `WHERE client_id IS NOT NULL` שובר את הסקת ON CONFLICT של PostgREST,
--    כלומר שמירת תשלום מפסיקה לעבוד.
ALTER TABLE public.sl_transactions
  ADD COLUMN IF NOT EXISTS client_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sl_transactions_client_id_key
  ON public.sl_transactions (client_id);
DROP INDEX IF EXISTS public.sl_transactions_client_id_uidx;  -- הווריאנט החלקי, אם נוצר
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_transactions TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_transactions_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_transactions_all" ON public.sl_transactions;
CREATE POLICY "sl_transactions_all" ON public.sl_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS sl_transactions_active_idx
  ON public.sl_transactions (student_id, date)
  WHERE deleted = false;
-- שדרוג התקנה שנוצרה לפני 003 (האילוץ הישן היה ON DELETE CASCADE).
-- מדלג בשקט אם יש תנועות יתומות — הרצה חוזרת של הקובץ הזה לא אמורה
-- להיכשל אף פעם. לטיפול מלא ביתומים ראה migrations/003.
DO $$
DECLARE
  orphans bigint;
  del_action text;
BEGIN
  SELECT confdeltype INTO del_action
  FROM pg_constraint
  WHERE conname = 'sl_transactions_student_id_fkey'
    AND conrelid = 'public.sl_transactions'::regclass;

  IF del_action IS NULL OR del_action = 'r' THEN RETURN; END IF;

  SELECT COUNT(*) INTO orphans
  FROM public.sl_transactions t
  LEFT JOIN public.sl_students s ON s.id = t.student_id
  WHERE t.student_id IS NOT NULL AND s.id IS NULL;

  IF orphans > 0 THEN
    RAISE NOTICE 'דילוג על החלפת האילוץ ל-RESTRICT: % תנועות יתומות. ראה migrations/003.', orphans;
    RETURN;
  END IF;

  ALTER TABLE public.sl_transactions
    DROP CONSTRAINT IF EXISTS sl_transactions_student_id_fkey;
  ALTER TABLE public.sl_transactions
    ADD CONSTRAINT sl_transactions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.sl_students(id)
    ON DELETE RESTRICT;
END $$;

-- ---------- הגדרות ----------
-- updated_at / client_id (ראה migrations/009): שתי הטבלאות האלה נכנסו
-- לשכבת האופליין, ולכן הן צריכות חותמת מיזוג וזהות שנוצרת במכשיר.
-- ⚠️ המפתח הראשי כאן הוא `key` (TEXT) ולא SERIAL — לרשומה כבר יש זהות
-- שהמכשיר יודע לייצר, ולכן האפליקציה כותבת ב-onConflict:'key'.
-- `client_id` נוספת לסימטריה ולשימוש עתידי, ואינה מפתח הכתיבה כאן.
CREATE TABLE IF NOT EXISTS public.sl_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  client_id  TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ⛔ אינדקס **מלא** ולא חלקי — ראה ההסבר אצל sl_students/sl_transactions
-- ואצל migrations/007. אינדקס חלקי שובר את הסקת ON CONFLICT.
CREATE UNIQUE INDEX IF NOT EXISTS sl_settings_client_id_key
  ON public.sl_settings (client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_settings TO anon, authenticated, service_role;
ALTER TABLE public.sl_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_settings_all" ON public.sl_settings;
CREATE POLICY "sl_settings_all" ON public.sl_settings FOR ALL USING (true) WITH CHECK (true);

-- ---------- רשימות (אמצעי תשלום, שיעורות) ----------
-- מחיקה כאן היא soft-delete בלבד (ראה migrations/009). בלי tombstone פריט
-- שנמחק במכשיר אחד חוזר לחיים במיזוג הבא, כי היעדר רשומה אצל צד אחד אינו
-- מחיקה. `id` הוא SERIAL והמסד מקצה אותו, ולכן `client_id` הוא **מפתח
-- הכתיבה בפועל** לכל פריט שנוצר במכשיר.
CREATE TABLE IF NOT EXISTS public.sl_lists (
  id         SERIAL PRIMARY KEY,
  category   TEXT NOT NULL,
  value      TEXT NOT NULL,
  client_id  TEXT,
  deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- ⛔ אינדקס **מלא** ולא חלקי — ראה migrations/007.
CREATE UNIQUE INDEX IF NOT EXISTS sl_lists_client_id_key
  ON public.sl_lists (client_id);
CREATE INDEX IF NOT EXISTS sl_lists_deleted_idx ON public.sl_lists (deleted);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_lists TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_lists_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_lists_all" ON public.sl_lists;
CREATE POLICY "sl_lists_all" ON public.sl_lists FOR ALL USING (true) WITH CHECK (true);

-- ---------- נתוני פתיחה ----------
-- ⛔ **אין כאן משתמש ברירת מחדל, ואין להחזיר אותו** (סבב 24).
-- עד הסבב הזה ישבה כאן שורת INSERT ל-`sl_users` שיצרה חשבון בשם admin
-- ובאותה סיסמה עצמה — כלומר **כל התקנה טרייה נולדה עם חשבון שסיסמתו
-- ידועה לכל העולם**, על מסד
-- שה-RLS שלו פתוח (`USING (true)`) ושכתובתו מופיעה בקוד המקור. במסד הייצור
-- הנוכחי הוא אינו קיים (אומת: משתמש אחד בלבד, סיסמה בת שש ספרות), אבל
-- לכל התקנה **עתידית** זו פצצה רדומה — בדיוק זו שהוסרה מ-hanhala בסבב 21.
--
-- יצירת המשתמש הראשון היא פעולה ידנית ומודעת. הרץ כאן, אחרי החלפת הערכים:
--     INSERT INTO public.sl_users (username, password)
--     VALUES ('שם המשתמש שלך', '123456');
-- (סיסמה בת שש ספרות — סבב 19.) האפליקציה מציגה את ההנחיה הזו מעצמה
-- כשהיא מזהה שהטבלה ריקה.
--
-- ⚠️ `admin_pass` שלמטה הוא **דבר אחר** — סיסמת שער מסך ההגדרות ולא
-- חשבון כניסה. היא נשארת עם ערך פתיחה כדי שמסך ההגדרות יהיה נגיש בהתקנה
-- טרייה, ויש להחליף אותה מתוך «הגדרות ← שנה סיסמה».
INSERT INTO public.sl_settings (key, value) VALUES ('default_tuition', '2000') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_settings (key, value) VALUES ('admin_pass', 'admin') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('payment_methods', 'מזומן') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('payment_methods', 'העברה בנקאית') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('payment_methods', 'ביט') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('sections', 'כיתה א') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('sections', 'כיתה ב') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('sections', 'כיתה ג') ON CONFLICT DO NOTHING;
-- סעיף "זוכה על חשבון יתרת זכות" (ראה migrations/005): תנועה שנרשמת בו
-- מקטינה את חוב התלמיד אך אינה כסף שהתקבל, ולכן אינה נספרת בשום סיכום
-- גבייה/הכנסה. הוא נרשם כאמצעי תשלום כי זו הרשימה היחידה שנשמרת **על
-- התנועה** (sl_transactions.payment_method); רשימת ה-sections שמורה
-- לשיוך תלמיד ואינה קיימת ברמת התנועה.
-- ⚠️ ל-sl_lists אין אילוץ ייחודיות, ולכן ON CONFLICT DO NOTHING אינו מונע
--    כפילות בהרצה חוזרת — כאן משתמשים ב-WHERE NOT EXISTS שאכן מונע אותה.
INSERT INTO public.sl_lists (category, value)
SELECT 'payment_methods', 'זוכה על חשבון יתרת זכות'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sl_lists WHERE value = 'זוכה על חשבון יתרת זכות'
);

-- ============================================================
-- שחזור רשומה שנמחקה בטעות (הרצה ידנית לפי id):
--   UPDATE public.sl_transactions SET deleted=false, deleted_at=NULL, deleted_by=NULL WHERE id=<TXN_ID>;
--   UPDATE public.sl_students     SET deleted=false, deleted_at=NULL, deleted_by=NULL WHERE id=<STUDENT_ID>;
-- ============================================================

-- ============================================================
-- 008 — updated_at + טריגר (מיזוג ברמת רשומה, סבב 12 שלב 2)
-- ============================================================
-- בלי חותמת עדכון אין מנוע מיזוג, ולכן אין עבודה אופליין. הטריגר דורס
-- **ב-UPDATE בלבד**; ב-INSERT החותמת שהמכשיר קבע ברגע היצירה נשמרת, וזה
-- מה שמונע מרשומה שנוצרה אופליין להיראות כאילו נוצרה בהגעה לשרת.
-- ר' `migrations/008_updated_at.sql` להסבר המלא.
ALTER TABLE public.sl_transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sl_students
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.sl_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sl_transactions_touch ON public.sl_transactions;
CREATE TRIGGER sl_transactions_touch
  BEFORE UPDATE ON public.sl_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();

DROP TRIGGER IF EXISTS sl_students_touch ON public.sl_students;
CREATE TRIGGER sl_students_touch
  BEFORE UPDATE ON public.sl_students
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();

-- ============================================================
-- 009 — sl_settings ו-sl_lists נכנסות לשכבת האופליין
-- ============================================================
-- ה-CREATE TABLE שלמעלה כבר כולל את העמודות עבור התקנה טרייה; הבלוק הזה
-- הוא מסלול השדרוג להתקנה קיימת. ר' `migrations/009_settings_lists_offline.sql`
-- להסבר המלא — ובפרט לאזהרה שהאינדקס על client_id חייב להיות **מלא**.
ALTER TABLE public.sl_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sl_settings ADD COLUMN IF NOT EXISTS client_id  TEXT;
ALTER TABLE public.sl_lists    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sl_lists    ADD COLUMN IF NOT EXISTS client_id  TEXT;
ALTER TABLE public.sl_lists    ADD COLUMN IF NOT EXISTS deleted    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.sl_lists    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.sl_lists    ADD COLUMN IF NOT EXISTS deleted_by TEXT;

DROP TRIGGER IF EXISTS sl_settings_touch ON public.sl_settings;
CREATE TRIGGER sl_settings_touch
  BEFORE UPDATE ON public.sl_settings
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();

DROP TRIGGER IF EXISTS sl_lists_touch ON public.sl_lists;
CREATE TRIGGER sl_lists_touch
  BEFORE UPDATE ON public.sl_lists
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();
