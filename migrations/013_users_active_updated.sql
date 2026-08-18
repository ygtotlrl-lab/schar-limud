-- ═══════════════════════════════════════════════════════════════════════════
-- 013 — `sl_users`: `active`, `updated_at` וטריגר החותמת
-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ **הורצה ואומתה ב-2026-08-18** ע"י המנהל, בשתי מיגרציות רצופות:
--    `schar_013_users_active_updated_deleted` ואחריה
--    `users_drop_deleted_add_touch_trigger`. הקובץ הזה מתאר את **המצב
--    הסופי** שהשתיים הותירו, ולא את הדרך אליו.
--
-- ⛔ **`deleted` אינה כאן, ולא תחזור (סבב 37) — היא נוספה ואז הוסרה.**
--    ההצעה הראשונה של הסבב הזה כללה אותה, המנהל הריץ אותה, ואז הכריע
--    להסיר: ההשבתה בארגון היא `active=false` (כלל קריטי 4 ב-gius), ועמודה
--    שנייה שמתארת «המשתמש הוסר» היא מקור אמת שני. ⛔ אין להחזיר אותה
--    לקובץ הזה, ל-`000_initial_schema.sql` או לתיעוד.
--    נמדד ב-2026-08-18: `sl_users` מחזיקה `active` · `updated_at` — ואין
--    בה `deleted`.
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
-- ⭐ **שלוש טבלאות המשתמשים בארגון זהות מעכשיו:** `active` · `updated_at` ·
--    טריגר חותמת · **בלי `deleted`**. `g_users` ב-gius הייתה הדפוס (היא
--    נשאה `g_users_touch` מלכתחילה), ו-`sl_users`/`ys_users` יושרו אליו.
-- ⛔ אין כאן `INSERT` ואין נגיעה בנתונים (כלל ברזל 10 סעיף 7) — מבנה
--    בלבד, וה-`UPDATE`-ים היחידים ממלאים עמודות שזה עתה נוספו.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.sl_users ADD COLUMN IF NOT EXISTS active BOOLEAN;
UPDATE public.sl_users SET active = TRUE WHERE active IS NULL;
ALTER TABLE public.sl_users ALTER COLUMN active SET DEFAULT TRUE;
ALTER TABLE public.sl_users ALTER COLUMN active SET NOT NULL;

ALTER TABLE public.sl_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE public.sl_users SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE public.sl_users ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE public.sl_users ALTER COLUMN updated_at SET NOT NULL;

-- ---------- טריגר החותמת ----------
-- ⚠️ **`public.users_touch_updated_at()` היא פונקציה אחת לשתי טבלאות
--    המשתמשים שבפרויקט המשותף** (`sl_users` ו-`ys_users`) — היא נוצרה
--    ע"י המנהל ב-`users_drop_deleted_add_touch_trigger`, ולכן היא מוגדרת
--    כאן וב-`hanhala-ruchanit/migrations/007` באותו נוסח בדיוק.
--    ⛔ אין לגזור ממנה שם פר-אפליקציה (`sl_touch_…`) — שתי הגדרות לאותה
--    פונקציה בפרויקט אחד הן גרסה שנייה שאיש אינו יודע עליה (סבב 36).
-- ⚠️ בלי הטריגר `updated_at` נקבעת ב-INSERT ואינה מתעדכנת ב-UPDATE —
--    כולל עריכה מלוח הבקרה של Supabase, שהיא הדרך שבה מנוהלים כאן
--    המשתמשים; כלומר שובר-השוויון שהעמודה נועדה לתת לא היה שלם.
CREATE OR REPLACE FUNCTION public.users_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sl_users_touch ON public.sl_users;
CREATE TRIGGER sl_users_touch
  BEFORE UPDATE ON public.sl_users
  FOR EACH ROW EXECUTE FUNCTION public.users_touch_updated_at();

-- ---------- הרשאות ----------
-- ⛔ REVOKE לפני GRANT, ואין לקצר (כלל ברזל 10 סעיף 9) — GRANT הוא אדיטיבי
--    ואינו מסיר את ה-DELETE/TRUNCATE שהטבלה נולדה איתם.
REVOKE ALL ON public.sl_users FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sl_users TO anon, authenticated;

-- ---------- אימות (נמדד ב-2026-08-18) ----------
-- SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='sl_users';
-- התקבל: active boolean NO true · updated_at timestamptz NO now()
--         · ⛔ **אין `deleted`**
-- ומשתמש אחד בטבלה, `active = true`.
--
-- SELECT trigger_name, action_statement FROM information_schema.triggers
--  WHERE trigger_schema='public' AND event_object_table='sl_users';
-- התקבל: sl_users_touch → EXECUTE FUNCTION users_touch_updated_at()
