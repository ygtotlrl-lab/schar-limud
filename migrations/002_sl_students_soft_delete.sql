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
-- רשת הביטחון שהייתה כאן כבלוק מוער — ON DELETE RESTRICT במקום CASCADE —
-- הועברה למיגרציה משלה: **migrations/003_transactions_fk_restrict.sql**,
-- עם בדיקת יתומים לפני ההחלפה. אין להריץ אותה מכאן.
-- ============================================================
