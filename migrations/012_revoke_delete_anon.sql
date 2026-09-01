-- ============================================================================
-- 012_revoke_delete_anon.sql — צמצום הרשאות `anon` ו-`authenticated` לחמש טבלאות ה-sl_
-- ============================================================================
--
-- ⛔ **רץ במסד.** ⛔ מיגרציה שכבר רצה אינה נערכת — ⚠️ המסד החיל אותה,
--    ועריכה שלה יוצרת מצב שבו הקובץ מתאר משהו אחר ממה שרץ; ⛔ שינוי מבני
--    נעשה בקובץ הבא בתור.
--
-- **הבעיה.** מיפוי `information_schema.role_table_grants` מול המסד
-- החי מצא ש-`anon` מחזיק על חמש טבלאות ה-`sl_`:
--     DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- כלומר גם **מחיקת שורות** וגם **ריקון טבלה שלמה**. מפתח ה-anon יושב גלוי
-- ב-`index.html` בריפו ציבורי, וה-RLS כאן הוא `using (true)` — ולכן מי
-- שמחזיק בו יכול תיאורטית למחוק את `sl_transactions`, כלומר **את כל
-- היסטוריית הכספים**.
--
-- ⚠️ **מאיפה זה הגיע:** לא מהקובץ הזה ולא מ-`000_initial_schema.sql`. פרויקט
-- Supabase סטנדרטי מגיע עם
--     alter default privileges in schema public grant all on tables
--       to anon, authenticated, service_role;
-- ולכן **כל טבלה שנוצרה כאן נולדה עם DELETE ו-TRUNCATE**. ה-`GRANT SELECT,
-- INSERT, UPDATE, DELETE` שבסכימה לא הוסיף אותם והוא גם לא היה יכול להסיר
-- אותם: ⛔ **GRANT הוא אדיטיבי בלבד.** רק `REVOKE` מסיר.
--
-- **למה ההסרה בטוחה.** ⛔ אין באפליקציה שום מסלול מחיקה
-- מול המסד: סריקה של כל קבצי הריפו מצאה **אפס** קריאות `.delete()` ל-
-- PostgREST (ההתאמות היחידות הן `caches.delete()` של ה-service worker
-- ו-`Set.delete` ברתמות הבדיקה). מחיקה כאן היא **תמיד** soft-delete —
-- `deleted=true` + `deleted_at` + `deleted_by` — שמתבצעת ב-UPDATE
-- (כללים קריטיים 5 ו-6). ההרשאה מיותרת לחלוטין, והסרתה אינה שוברת דבר.
--
-- **מה נשאר ל-anon:** `SELECT, INSERT, UPDATE` — בדיוק מה שדחיפת-המצב
-- צריכה. ⚠️ הרשאות ה-SEQUENCE **לא נגעו**: `INSERT` על טבלה עם `SERIAL`
-- דורש `USAGE` על הרצף, ובלעדיו שמירת תשלום או תלמיד חדש הייתה נשברת.
--
-- **`authenticated` מצומצם כאן יחד עם `anon`.** לתפקיד הזה היו בדיוק אותן
-- הרשאות מלאות, מאותה ירושה. ⚠️ **הצמצום נעשה כשאין משתמשי Auth כלל**
-- (`auth.users` ריקה — Supabase Auth אינו בשימוש כאן), ולכן הוא **אינו
-- נבדק מול מסלול חי**: אם ייפתח Auth בעתיד, יש לוודא ש-`SELECT, INSERT,
-- UPDATE` מספיקים למסלול שייבנה. הנימוק לצמצום הוא שהתפקיד קיים ומחזיק
-- הרשאות עודפות **היום**, ופתיחת signup הייתה פוערת את ההגנה בשקט.
-- ⚠️ זהו **יישור ל-gius**, שמיגרציה 0002 שלה כבר צמצמה את שני התפקידים.
--
-- ⛔ **`sync_log` ו-`kv_backup` אינן כאן, ואין להוסיף אותן — לאף אחד
-- משני התפקידים.** הן שייכות לפרויקט המשותף ומחזיקות `INSERT, SELECT`
-- בלבד ל-anon — היעדר ה-UPDATE שם הוא **הגנה מכוונת** (יומני ראיות שאי
-- אפשר לזייף בהם רישום קיים), ואין «ליישר» אותן לסט של הטבלאות האלה.
-- ר' כלל ברזל 10 סעיף 9.
--
-- אדיטיבית, אידמפוטנטית, ⛔ **ואינה נוגעת בנתונים** — הרשאות בלבד. אין
-- כאן INSERT, UPDATE או DELETE על אף שורה.
-- ============================================================

BEGIN;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sl_lists', 'sl_settings', 'sl_students', 'sl_transactions', 'sl_users'
  ]
  LOOP
    -- ⛔ REVOKE ואז GRANT, בסדר הזה. `GRANT SELECT, INSERT, UPDATE` לבדו
    -- אינו מסיר את DELETE/TRUNCATE שכבר קיימים — הוא רק מוסיף.
    EXECUTE format(
      'REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE ON TABLE public.%I TO anon, authenticated', t);
  END LOOP;
END $$;

-- טבלה עתידית בסכימה הזו לא תיוולד עם ההרשאות האלה.
-- ⚠️ **אינו תחליף לשורות שלמעלה:** `ALTER DEFAULT PRIVILEGES` משפיע רק על
-- ברירות מחדל שבבעלות התפקיד שמריץ אותו, ורק על טבלאות שייווצרו **מכאן
-- והלאה**. אם ברירות המחדל של Supabase נקבעו ע"י תפקיד אחר, זהו no-op.
-- ⛔ ולכן הכלל נשאר: **כל מיגרציה שמוסיפה טבלה חייבת REVOKE מפורש משלה** —
-- ⚠️ טבלה שנולדת עם ההרשאות המלאות אינה משאירה סימן, ואיש אינו מודד אותה.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE DELETE, TRUNCATE ON TABLES FROM anon, authenticated;

COMMIT;

-- ============================================================
-- אימות אחרי ההרצה
-- ============================================================
--   SELECT table_name,
--          string_agg(DISTINCT privilege_type, ', ' ORDER BY privilege_type)
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'anon' AND table_schema = 'public'
--     AND table_name LIKE 'sl\_%'
--   GROUP BY table_name ORDER BY table_name;
--
-- מצופה, לכל חמש השורות בדיוק: INSERT, SELECT, UPDATE

-- ============================================================
-- אימות אחרי ההרצה — התפקיד `authenticated`
-- ============================================================
--   SELECT table_name,
--          string_agg(DISTINCT privilege_type, ', ' ORDER BY privilege_type)
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'authenticated' AND table_schema = 'public'
--     AND table_name LIKE 'sl\_%'
--   GROUP BY table_name ORDER BY table_name;
--
-- מצופה, לכל חמש השורות בדיוק: INSERT, SELECT, UPDATE
--
-- ⛔ `service_role` לא נגע ואינו אמור להשתנות — הוא תפקיד השרת ומחזיק
--    את הסט המלא.
