-- ═══════════════════════════════════════════════════════════════════════════
-- 013 — `sl_users`: עמודת `active` ועמודת `updated_at` + טריגר
-- ═══════════════════════════════════════════════════════════════════════════
-- ⛔ נכתבה ולא הורצה (סבב 37) — «נכתב» אינו «רץ». ההרצה היא החלטת המנהל.
--
-- ⭐ שתי בעיות שנמדדו מול המסד החי ב-2026-08-18, ושתיהן מבניות:
--
--   1. **אין ל-`sl_users` עמודת `active` כלל** — לא בטבלה ולא בקוד. שתי
--      האחיות שיש בהן משתמשים (`ys_users` ב-hanhala, `g_users` ב-gius)
--      מחזיקות אותה מאז ומעולם, ו-`ysVerifyOffline`/`gVerifyOffline`
--      חוסמות בה משתמש מושבת **גם אופליין**. כאן `slVerifyOffline` בדקה
--      `!u` בלבד, ולכן **לא הייתה שום דרך להשבית משתמש** — לא אופליין ולא
--      מקוון. באפליקציית כספים זה פער אמיתי: מי שעזב ממשיך להיכנס מכל
--      מכשיר שכבר החזיק מראה מקומית.
--   2. **אין `updated_at`** — ולכן להתנגשות על שורת משתמש אין שובר-שוויון
--      דטרמיניסטי, בניגוד לשתי טבלאות הליבה (`migrations/008`).
--
-- ⚠️ **`deleted` אינה נוספת כאן, ובכוונה.** בארגון, מחיקת משתמש היא
--    `active=false` ולא tombstone — כך זה ב-`g_users` (כלל קריטי 4 ב-gius:
--    «משתמשים הם החריג: הם לא נמחקים אף פעם, השדה `active` הוא המחיקה הרכה
--    שלהם») וכך ב-`ys_users`. הוספת עמודה שנייה לאותו מושג הייתה יוצרת שני
--    מקורות אמת למצב של משתמש.
--
-- ⚠️ **ברירת המחדל היא `true`, וזו החלטה ולא נוחות:** ההרצה חייבת להשאיר
--    את המשתמשים הקיימים פעילים. `DEFAULT false` היה נועל את כולם בחוץ
--    ברגע ההרצה.
-- ⛔ אין כאן `INSERT` ואין נגיעה בנתונים (כלל ברזל 10 סעיף 7) — מבנה בלבד,
--    וה-`UPDATE` היחיד ממלא עמודה שזה עתה נוספה.
-- ═══════════════════════════════════════════════════════════════════════════

-- ---------- 1. active ----------
ALTER TABLE public.sl_users
  ADD COLUMN IF NOT EXISTS active BOOLEAN;
UPDATE public.sl_users SET active = TRUE WHERE active IS NULL;
ALTER TABLE public.sl_users ALTER COLUMN active SET DEFAULT TRUE;
ALTER TABLE public.sl_users ALTER COLUMN active SET NOT NULL;

-- ---------- 2. updated_at + טריגר ----------
-- `sl_touch_updated_at()` כבר קיימת מ-`migrations/008`; `create or replace`
-- כאן הוא שורת ההתכנסות שמכסה התקנה שבה 008 טרם רצה.
CREATE OR REPLACE FUNCTION public.sl_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.sl_users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE public.sl_users SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE public.sl_users ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE public.sl_users ALTER COLUMN updated_at SET NOT NULL;

DROP TRIGGER IF EXISTS sl_users_touch ON public.sl_users;
CREATE TRIGGER sl_users_touch
  BEFORE UPDATE ON public.sl_users
  FOR EACH ROW EXECUTE FUNCTION public.sl_touch_updated_at();

-- ---------- 3. הרשאות ----------
-- ⛔ REVOKE לפני GRANT, ואין לקצר (כלל ברזל 10 סעיף 9) — GRANT הוא אדיטיבי
--    ואינו מסיר את ה-DELETE/TRUNCATE שהטבלה נולדה איתם.
REVOKE ALL ON public.sl_users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sl_users TO anon, authenticated;

-- ---------- 4. אימות ----------
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='sl_users'
--    AND column_name IN ('active','updated_at');
-- מצופה: active boolean NO true · updated_at timestamptz NO now()
--
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid='public.sl_users'::regclass AND NOT tgisinternal;
-- מצופה: sl_users_touch
