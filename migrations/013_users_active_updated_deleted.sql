-- ═══════════════════════════════════════════════════════════════════════════
-- 013 — `sl_users`: `active`, `updated_at` ו-`deleted`
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ **הורצה ואומתה ב-2026-08-18** ע"י המנהל, ונרשמה ב-`schema_migrations`
--    בשם `schar_013_users_active_updated_deleted`.
--
-- ⚠️ **הקובץ הזה נכתב מחדש כדי לתאר את מה שרץ בפועל, ולא את מה שתוכנן.**
--    הגרסה הראשונה שלו (סבב 37) הוסיפה `active`+`updated_at` בלבד וכללה
--    טריגר; מה שרץ הוסיף **גם `deleted`** ו**בלי טריגר**. ⛔ הקובץ הוא
--    מקור האמת, ואי-התאמה בינו לבין המסד היא בדיוק מה שמייצר גרסה שלישית
--    שאיש אינו יודע עליה (הלקח של סבב 36).
--
-- ⭐ הבעיה שנסגרה: **ל-`sl_users` לא הייתה עמודת `active` כלל** — לא
--    בטבלה ולא בקוד. `slVerifyOffline` בדקה `!u` בלבד, ולכן לא הייתה שום
--    דרך להשבית משתמש באפליקציית הכספים: מי שעזב המשיך להיכנס מכל מכשיר
--    שכבר החזיק מראה מקומית. שתי האחיות חוסמות `active !== true` מאז
--    סבבים 22–23.
--
-- ⚠️ **ברירת המחדל של `active` היא `TRUE`, וזו החלטה ולא נוחות:** ההרצה
--    חייבת להשאיר את המשתמשים הקיימים פעילים. `DEFAULT false` היה נועל
--    את כולם בחוץ ברגע ההרצה.
-- ⛔ אין כאן `INSERT` ואין נגיעה בנתונים (כלל ברזל 10 סעיף 7) — מבנה
--    בלבד, וה-`UPDATE` היחיד ממלא עמודה שזה עתה נוספה.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sl_users ADD COLUMN IF NOT EXISTS active BOOLEAN;
UPDATE public.sl_users SET active = TRUE WHERE active IS NULL;
ALTER TABLE public.sl_users ALTER COLUMN active SET DEFAULT TRUE;
ALTER TABLE public.sl_users ALTER COLUMN active SET NOT NULL;

ALTER TABLE public.sl_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE public.sl_users SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE public.sl_users ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE public.sl_users ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.sl_users ADD COLUMN IF NOT EXISTS deleted BOOLEAN;
UPDATE public.sl_users SET deleted = FALSE WHERE deleted IS NULL;
ALTER TABLE public.sl_users ALTER COLUMN deleted SET DEFAULT FALSE;
ALTER TABLE public.sl_users ALTER COLUMN deleted SET NOT NULL;

-- ---------- הרשאות ----------
-- ⛔ REVOKE לפני GRANT, ואין לקצר (כלל ברזל 10 סעיף 9) — GRANT הוא אדיטיבי
--    ואינו מסיר את ה-DELETE/TRUNCATE שהטבלה נולדה איתם.
REVOKE ALL ON public.sl_users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sl_users TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- ⚠️ מה ש**לא** רץ כאן — טריגר `updated_at`
-- ═══════════════════════════════════════════════════════════════════════════
-- נמדד ב-2026-08-18: `pg_trigger` על `sl_users` **ריק**. המשמעות המעשית:
-- `updated_at` נקבעת ב-INSERT (ברירת המחדל) ו**אינה מתעדכנת מאליה
-- ב-UPDATE** — כולל עריכה מלוח הבקרה של Supabase, שהיא הדרך שבה מנוהלים
-- כאן המשתמשים. כלומר העמודה קיימת, אבל שובר-השוויון שהיא נועדה לתת אינו
-- שלם עדיין.
-- ⛔ הטריגר **אינו** נוסף כאן מיוזמת הסבב — שתי טבלאות הליבה קיבלו אותו
--    ב-008 בהחלטה מפורשת, ו-`g_users` ב-gius נושאת `g_users_touch`; כאן
--    ההחלטה שרצה בפועל לא כללה אותו. ר' שורת הפער ב-CLAUDE.md.
--
-- ---------- אימות (נמדד ב-2026-08-18) ----------
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='sl_users'
--    AND column_name IN ('active','updated_at','deleted');
-- התקבל: active boolean NO true · updated_at timestamptz NO now()
--         · deleted boolean NO false
-- ומשתמש אחד בטבלה, `active = true`.
