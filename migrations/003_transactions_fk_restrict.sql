-- ============================================================
-- schar-limud — החלפת ON DELETE CASCADE ב-RESTRICT על sl_transactions
-- שם המיגרציה: sl_transactions_fk_restrict
-- הרץ ב-Supabase SQL Editor (פרויקט kxbtskqobynewvnckaaz):
--   https://supabase.com/dashboard/project/kxbtskqobynewvnckaaz/sql/new
-- ============================================================
-- למה: 002 העביר את מחיקת התלמידים ל-soft-delete, אבל האילוץ עצמו נשאר
-- ON DELETE CASCADE. כלומר הקוד כבר לא מוחק פיזית — אבל DELETE ידני אחד
-- מלוח הבקרה של Supabase, מ-SQL Editor, או מקוד עתידי שישכח את הכלל,
-- עדיין ישמיד בשקט את **כל היסטוריית הכספים** של אותו תלמיד. אין שם
-- אישור, אין tombstone, ואין דרך לשחזר. RESTRICT הופך את זה לשגיאה
-- גלויה במקום לאובדן שקט: המסד פשוט מסרב למחוק תלמיד שיש לו תנועות.
--
-- אחרי המיגרציה, מחיקת תלמיד עם תנועות תיכשל עם:
--   ERROR: update or delete on table "sl_students" violates foreign key
--          constraint "sl_transactions_student_id_fkey" on table "sl_transactions"
-- וזו התנהגות רצויה — הדרך הנכונה היא soft-delete (deleted = true).
--
-- הרצה חוזרת בטוחה. ⚠️ מריצים ידנית, שלב אחר שלב.
-- ============================================================


-- ------------------------------------------------------------
-- שלב 1 — בדיקת יתומים. הרץ את זה קודם, **לבד**, וקרא את התוצאה.
-- ------------------------------------------------------------
-- תנועה "יתומה" = student_id שמצביע על תלמיד שכבר לא קיים בטבלה. מצב כזה
-- לא אמור להתקיים (ה-FK אכף אותו), אבל אם הוא כן — למשל כי האילוץ הוסר
-- ידנית בעבר — הוספת RESTRICT בשלב 2 תיכשל, וכל השלב יתגלגל אחורה.
-- שים לב ל-`student_id IS NOT NULL`: תנועה בלי תלמיד כלל אינה יתומה,
-- והיא לא תפריע להוספת האילוץ.
--
-- התוצאה הרצויה: orphan_count = 0.

SELECT COUNT(*) AS orphan_count
FROM public.sl_transactions t
LEFT JOIN public.sl_students s ON s.id = t.student_id
WHERE t.student_id IS NOT NULL
  AND s.id IS NULL;

-- אם orphan_count > 0 — **אל תמשיך לשלב 2**. הרץ את זה כדי לראות אותן:
--
--   SELECT t.id, t.student_id, t.date, t.amount, t.note
--   FROM public.sl_transactions t
--   LEFT JOIN public.sl_students s ON s.id = t.student_id
--   WHERE t.student_id IS NOT NULL AND s.id IS NULL
--   ORDER BY t.date;
--
-- אלה רשומות כספים אמיתיות שאיבדו את התלמיד שלהן. **אל תמחק אותן.**
-- הדרך הנכונה: ליצור מחדש את התלמיד החסר (או תלמיד "לא משויך" אחד)
-- ולהצביע אליו, ורק אז לחזור לשלב 2.


-- ------------------------------------------------------------
-- שלב 2 — החלפת האילוץ. הרץ רק אחרי ש-orphan_count = 0.
-- ------------------------------------------------------------
-- הכל בטרנזקציה אחת: אם ה-ADD נכשל, ה-DROP מתגלגל אחורה ולא נשארים
-- בלי אילוץ בכלל. הבדיקה החוזרת בפנים היא רשת ביטחון למקרה שנוצרו
-- יתומים בין שלב 1 לשלב 2.

DO $$
DECLARE
  orphans bigint;
  current_action text;
BEGIN
  SELECT COUNT(*) INTO orphans
  FROM public.sl_transactions t
  LEFT JOIN public.sl_students s ON s.id = t.student_id
  WHERE t.student_id IS NOT NULL AND s.id IS NULL;

  IF orphans > 0 THEN
    RAISE EXCEPTION
      'נמצאו % תנועות יתומות — האילוץ לא הוחלף. ראה שלב 1 בקובץ המיגרציה.',
      orphans;
  END IF;

  -- confdeltype: 'c' = CASCADE, 'r' = RESTRICT, 'a' = NO ACTION
  SELECT confdeltype INTO current_action
  FROM pg_constraint
  WHERE conname = 'sl_transactions_student_id_fkey'
    AND conrelid = 'public.sl_transactions'::regclass;

  IF current_action = 'r' THEN
    RAISE NOTICE 'האילוץ כבר מוגדר ON DELETE RESTRICT — אין מה לעשות.';
    RETURN;
  END IF;

  ALTER TABLE public.sl_transactions
    DROP CONSTRAINT IF EXISTS sl_transactions_student_id_fkey;

  ALTER TABLE public.sl_transactions
    ADD CONSTRAINT sl_transactions_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.sl_students(id)
    ON DELETE RESTRICT;

  RAISE NOTICE 'האילוץ הוחלף ל-ON DELETE RESTRICT.';
END $$;


-- ------------------------------------------------------------
-- שלב 3 — אימות. התוצאה הרצויה: delete_action = 'RESTRICT'.
-- ------------------------------------------------------------

SELECT
  conname AS constraint_name,
  CASE confdeltype
    WHEN 'c' THEN 'CASCADE'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS delete_action
FROM pg_constraint
WHERE conname = 'sl_transactions_student_id_fkey'
  AND conrelid = 'public.sl_transactions'::regclass;
