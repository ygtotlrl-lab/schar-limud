-- ============================================================
-- schar-limud — soft-delete לתלמידים
-- שם המיגרציה: add_sl_students_soft_delete
-- הרץ ב-Supabase SQL Editor (פרויקט kxbtskqobynewvnckaaz)
-- ============================================================
-- למה: deleteStudent הריץ DELETE פיזי על sl_students, ועל sl_transactions
-- מוגדר ON DELETE CASCADE — כלומר מחיקת תלמיד השמידה פיזית את כל רשומות
-- הכספים שלו, בעקיפה של כלל ה-soft-delete. מעכשיו התלמיד רק מסומן כמחוק
-- והתנועות נשארות במקומן, ניתנות לשליפה ולסיכום היסטורי.

ALTER TABLE public.sl_students
  ADD COLUMN IF NOT EXISTS deleted     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by  text;

-- אינדקס חלקי לשליפת התלמידים הפעילים (מה שהאפליקציה טוענת בכל sync)
CREATE INDEX IF NOT EXISTS sl_students_active_idx
  ON public.sl_students (name)
  WHERE deleted = false;

-- ============================================================
-- שחזור תלמיד שנמחק בטעות (הרצה ידנית לפי id):
--   UPDATE public.sl_students
--   SET deleted = false, deleted_at = NULL, deleted_by = NULL
--   WHERE id = <STUDENT_ID>;
-- ============================================================

-- ============================================================
-- אופציונלי — רשת ביטחון נוספת (לא חובה לתיקון, החלט בנפרד):
-- כל עוד ה-FK מוגדר ON DELETE CASCADE, כל DELETE ידני על sl_students
-- (מה-Dashboard, מ-SQL Editor, או מקוד עתידי) עדיין ישמיד את התנועות.
-- הקוד כבר לא מריץ DELETE, אז זה לא נדרש — אבל אם תרצה לחסום את זה
-- ברמת המסד, הרץ את הבלוק הבא. שים לב: הוא מחליף את האילוץ הקיים,
-- ולכן כדאי לוודא קודם שאין תנועות יתומות:
--   SELECT COUNT(*) FROM public.sl_transactions t
--   LEFT JOIN public.sl_students s ON s.id = t.student_id
--   WHERE s.id IS NULL;
--
-- ALTER TABLE public.sl_transactions
--   DROP CONSTRAINT IF EXISTS sl_transactions_student_id_fkey;
-- ALTER TABLE public.sl_transactions
--   ADD CONSTRAINT sl_transactions_student_id_fkey
--   FOREIGN KEY (student_id) REFERENCES public.sl_students(id)
--   ON DELETE RESTRICT;
-- ============================================================
