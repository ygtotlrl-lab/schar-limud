-- ============================================================
-- schar-limud — soft-delete לתשלומים (מחיקה בטוחה בכספים)
-- שם המיגרציה: add_sl_transactions_soft_delete
-- הרץ ב-Supabase SQL Editor (פרויקט kxbtskqobynewvnckaaz)
-- ============================================================

ALTER TABLE public.sl_transactions
  ADD COLUMN IF NOT EXISTS deleted     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by  text,
  ADD COLUMN IF NOT EXISTS created_by  text;

-- אינדקס חלקי לשליפות המהירות של תשלומים פעילים בלבד
CREATE INDEX IF NOT EXISTS sl_transactions_active_idx
  ON public.sl_transactions (student_id, date)
  WHERE deleted = false;

-- ============================================================
-- שחזור תשלום שנמחק בטעות (הרצה ידנית לפי id):
--   UPDATE public.sl_transactions
--   SET deleted = false, deleted_at = NULL, deleted_by = NULL
--   WHERE id = <TXN_ID>;
-- ============================================================
