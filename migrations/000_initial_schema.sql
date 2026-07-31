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
-- 003 = ON DELETE RESTRICT על sl_transactions. שלושתן כבר מוכלות כאן,
-- ולכן על התקנה טרייה הן no-op.
-- ============================================================

-- ---------- משתמשים ----------
CREATE TABLE IF NOT EXISTS public.sl_users (
  id         SERIAL PRIMARY KEY,
  username   TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_users TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_users_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_users_all" ON public.sl_users;
CREATE POLICY "sl_users_all" ON public.sl_users FOR ALL USING (true) WITH CHECK (true);

-- ---------- תלמידים ----------
-- מחיקה כאן היא soft-delete בלבד (ראה migrations/002): מחיקה פיזית הפעילה
-- ON DELETE CASCADE על sl_transactions והשמידה את כל היסטוריית הכספים.
CREATE TABLE IF NOT EXISTS public.sl_students (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  active         BOOLEAN DEFAULT true,
  handled_months JSONB DEFAULT '[]',
  card_settings  JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  deleted        BOOLEAN NOT NULL DEFAULT false,
  deleted_at     TIMESTAMPTZ,
  deleted_by     TEXT
);
-- שדרוג התקנה שנוצרה לפני 002
ALTER TABLE public.sl_students
  ADD COLUMN IF NOT EXISTS deleted    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;
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
  student_id     INTEGER REFERENCES public.sl_students(id) ON DELETE RESTRICT,
  date           DATE NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  created_by     TEXT,
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
CREATE TABLE IF NOT EXISTS public.sl_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_settings TO anon, authenticated, service_role;
ALTER TABLE public.sl_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_settings_all" ON public.sl_settings;
CREATE POLICY "sl_settings_all" ON public.sl_settings FOR ALL USING (true) WITH CHECK (true);

-- ---------- רשימות (אמצעי תשלום, שיעורות) ----------
CREATE TABLE IF NOT EXISTS public.sl_lists (
  id       SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  value    TEXT NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sl_lists TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sl_lists_id_seq TO anon, authenticated, service_role;
ALTER TABLE public.sl_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sl_lists_all" ON public.sl_lists;
CREATE POLICY "sl_lists_all" ON public.sl_lists FOR ALL USING (true) WITH CHECK (true);

-- ---------- נתוני פתיחה ----------
INSERT INTO public.sl_users (username, password) VALUES ('admin', 'admin') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_settings (key, value) VALUES ('default_tuition', '2000') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_settings (key, value) VALUES ('admin_pass', 'admin') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('payment_methods', 'מזומן') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('payment_methods', 'העברה בנקאית') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('payment_methods', 'ביט') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('sections', 'כיתה א') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('sections', 'כיתה ב') ON CONFLICT DO NOTHING;
INSERT INTO public.sl_lists (category, value) VALUES ('sections', 'כיתה ג') ON CONFLICT DO NOTHING;

-- ============================================================
-- שחזור רשומה שנמחקה בטעות (הרצה ידנית לפי id):
--   UPDATE public.sl_transactions SET deleted=false, deleted_at=NULL, deleted_by=NULL WHERE id=<TXN_ID>;
--   UPDATE public.sl_students     SET deleted=false, deleted_at=NULL, deleted_by=NULL WHERE id=<STUDENT_ID>;
-- ============================================================
