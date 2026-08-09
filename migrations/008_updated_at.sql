-- ============================================================
-- 008 — updated_at + טריגר, ל-sl_transactions ול-sl_students
-- ============================================================
-- ✅ הורצה ואומתה במסד (אוגוסט 2026): שתי העמודות קיימות עם ברירת מחדל
--    NOW(), ושני הטריגרים פעילים. 25 תנועות / ₪41,952 / 63 תלמידים —
--    זהה למצב שלפני ההרצה.
--
-- **למה היא נדרשת:** בלי חותמת עדכון אין מנוע מיזוג. שני מכשירים שערכו את
-- אותה רשומה מציגים שתי גרסאות, ואין דרך להכריע איזו מהן החדשה — כלומר
-- אי אפשר לבנות עבודה אופליין (כלל ברזל 3). `created_at` אינה תחליף: היא
-- לא זזה בעריכה.
--
-- ⚠️ **המכשיר שולח `updated_at` משלו**, והטריגר דורס אותה **ב-UPDATE בלבד**:
--   • INSERT (רשומה שנוצרה במכשיר ועלתה מאוחר) — הטריגר אינו יורה, ולכן
--     החותמת שהמכשיר קבע ברגע היצירה **נשמרת**. זה מה שמונע מרשומה
--     שנוצרה אופליין להיראות כאילו נוצרה ברגע ההגעה לשרת.
--   • UPDATE — הטריגר קובע NOW(). זה מקובל, **כי הלקוח דוחף רק שורות שכבר
--     ניצחו במיזוג המקומי**: שורה מקומית שהפסידה אינה נשלחת כלל, ולכן
--     לעולם אינה מפעילה את הטריגר ולא "מדלגת קדימה" בזמן.
--
-- אידמפוטנטית — אפשר להריץ שוב בבטחה.
-- ============================================================

-- ---------- 1. העמודה ----------
ALTER TABLE public.sl_transactions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sl_students
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ---------- 2. הפונקציה ----------
CREATE OR REPLACE FUNCTION public.sl_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- 3. הטריגרים ----------
DROP TRIGGER IF EXISTS sl_transactions_touch ON public.sl_transactions;
CREATE TRIGGER sl_transactions_touch
  BEFORE UPDATE ON public.sl_transactions
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();

DROP TRIGGER IF EXISTS sl_students_touch ON public.sl_students;
CREATE TRIGGER sl_students_touch
  BEFORE UPDATE ON public.sl_students
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();

-- ---------- 4. אימות ----------
-- שתי שורות, שתיהן timestamptz NOT NULL עם default now():
--
-- SELECT table_name, column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND column_name='updated_at'
--    AND table_name IN ('sl_transactions','sl_students');
--
-- ושני טריגרים:
--
-- SELECT tgname, tgrelid::regclass FROM pg_trigger
--  WHERE NOT tgisinternal AND tgname LIKE 'sl_%_touch';
