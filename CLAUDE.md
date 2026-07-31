# שכר לימוד — CLAUDE.md

## סביבת עבודה
- **ריפו:** `ygtotlrl-lab/schar-limud`
- **Pages:** `https://ygtotlrl-lab.github.io/schar-limud/`
- **קובץ ראשי:** `index.html`
- **Supabase:** `kxbtskqobynewvnckaaz`
- **אופן העבודה (נכון ליולי 2026):** העבודה מתנהלת בסשני ענן (Claude Code cloud) — הריפו משוכפל טרי בתחילת כל סשן, העבודה נעשית על ענף ייעודי, והדחיפה בסוף הסשן. **אין עותקים מקומיים קבועים.**
- **עבודה מקומית במחשב (אם בכל זאת):** שכפול **אך ורק** לתיקייה יציבה כמו `C:\Users\F\Documents\repos\` — **לעולם לא ל-Temp** (מנקה Windows / Storage Sense מוחק משם קבצים באמצע עבודה; זה גרם ל"מחיקות רפאים" חוזרות). טוקן: מאוחסן ב-Windows Credential Manager (host `github.com`) — לעולם לא בקובץ; `git push`/`clone` מושכים אותו אוטומטית דרך GCM.

## גישת Supabase
כשזמין ה-Supabase MCP, נהג לפי הכללים הבאים — ללא יוצאים מן הכלל:
- **שינויי סכימה** (יצירה/שינוי/מחיקת טבלאות, עמודות, פוליסות, הרשאות) — **אך ורק דרך `apply_migration`** עם שם ברור ותיאורי (למשל `add_sl_transactions_soft_delete`). לא דרך `execute_sql`.
- **שאילתות אבחון וקריאה** (SELECT, בדיקת מבנה, ספירות, `list_tables` וכו') — **חופשיות**, ללא אישור.
- **עדכון או מחיקת נתונים בטבלאות `sl_*`** (`sl_students`, `sl_transactions`, `sl_settings`, `sl_lists`, `sl_users`) — **מחייבים אישור מפורש מהמשתמש לפני הרצה**. אין להריץ `UPDATE`/`DELETE`/`upsert` על נתונים בלי אישור. (בפרט: `sl_transactions` הוא כספים — מחיקה היא soft-delete בלבד, `deleted=true`.)

## כללי ענפים
- כל עבודה נעשית על **ענף ייעודי** — לא ישירות על `main`.
- **מיזוג ל-`main` רק לאחר אישור מפורש מהמשתמש**, אחרי שבדק את השינוי בבדיקה חיצונית.
- **מחיקת ענפים מרוחקים חסומה בסביבת הענן** — אין לנסות למחוק; לדלג ולדווח למשתמש שהענף נותר.

## לפני כל push — חובה: בדיקת תחביר עם node
**כל שינוי בקוד (`index.html` או `sw.js`) חייב לעבור את הבדיקה הזו לפני דחיפה. דחיפה ללא הבדיקה — אסורה.**
בדיקת איזון-סוגריים בלבד אינה מספיקה (עיוורת לשגיאות בתוך מחרוזות). `node --check` = parse מלא אמיתי ב-V8. (node זמין בסביבת הענן; הנוהל הישן עם Chrome headless היה נכון לסביבה המקומית שבה node לא היה מותקן.)
```bash
# 1) חלץ את כל ה-JS המוטבע מ-index.html לקובץ
python3 -c "
import io, re
s = io.open('index.html', encoding='utf-8').read()
js = chr(10).join(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', s, re.DOTALL))
io.open('_app.js', 'w', encoding='utf-8').write(js)
"
# 2) בדיקת parse — חובה ששתי הפקודות יעברו בלי שגיאה
node --check _app.js
node --check sw.js
rm -f _app.js
# 3) סנכרון הסכימה — העותק המוטבע ב-index.html מול מקור האמת
python3 tools/sync-setup-sql.py --check
```
אם `node --check` מדווח שגיאה — אסור לדחוף עד שהיא מתוקנת.
אם `sync-setup-sql.py --check` נכשל — הרץ `python3 tools/sync-setup-sql.py` וקומיט מחדש.

## עדכוני Service Worker
- **כל שינוי בקוד מחייב קידום `CACHE` ב-`sw.js` לגרסה הבאה** — בלי זה המשתמשים לא יקבלו את העדכון.
- מנגנון באנר "גרסה חדשה זמינה" קיים באפליקציה — המשתמשים מקבלים את העדכון בלחיצה על הבאנר.

## Push
```bash
git add . && git commit -m "תיאור השינוי"
git push -u origin <שם-הענף>   # דחיפה לענף העבודה — לא ל-main
```

## סיום משימה
בסיום כל משימה משמעותית — **עדכן קובץ זה בתמצית** לפני סיום הסשן: מה שונה, מה הוחלט. כך הסשן הבא מתחיל עם תמונת מצב עדכנית.

## כללים קריטיים
1. **בדיקת תחביר עם `node --check` לפני כל push** (הסעיף למעלה) — חובה מוחלטת. כל שינוי ב-`index.html` חייב לעבור חילוץ-JS + `node --check` (וגם `sw.js`). דחיפה בלי זה — אסורה.
2. **קידום `CACHE` ב-`sw.js` בכל שינוי קוד** (הסעיף למעלה) — בלי זה העדכון לא מגיע למשתמשים.
3. Supabase: כל טבלה חדשה — GRANT מפורש ל-anon, authenticated, service_role + RLS
4. **מקור אמת יחיד = `index.html`** — זה הקובץ ש-Pages מגיש ושאליו מצביע `start_url` במניפסט. כל עדכון קוד נכנס לכאן בלבד. אסור ליצור קבצי HTML כפולים של האפליקציה. (אין כאן מנגנון אוטו-אפדייט פנימי — בניגוד ל-yoman-avoda. אין יותר sl_p1/p2/p3.txt + gen.py — index.html נערך ישירות. הרענון הוא דרך ה-Service Worker.)
5. **`sl_transactions` = כספים** — מחיקה היא soft-delete (`deleted=true`+`deleted_at`+`deleted_by`), לעולם לא מחיקה פיזית. כל שליפה/סיכום מסננת `deleted=false`. הוספה ממלאת `created_by`.
6. **`sl_students` = גם soft-delete** (יולי 2026, `migrations/002`) — `deleteStudent` הריץ `DELETE` פיזי, ועל `sl_transactions` מוגדר `ON DELETE CASCADE`: מחיקת תלמיד השמידה פיזית את **כל היסטוריית הכספים שלו**, בעקיפה של כלל 5. מעכשיו התלמיד מסומן `deleted=true` והתנועות נשארות. הסינון נעשה בנקודה אחת — ב-`syncAll`, בדיוק כמו `TRANSACTIONS` — ולכן כל 11 הקוראים של `STUDENTS` מקבלים אותו אוטומטית. **אין להחזיר `.delete()` על אף אחת מהטבלאות האלה.**
7. **מקור אמת יחיד לסכימה = `migrations/000_initial_schema.sql`** (יולי 2026, סבב 6). `supabase-setup.sql` הוא קובץ הפניה בלבד, וה-SQL ב-`index.html` נמשך ב-`fetch` מקובץ המיגרציה (עם עותק-גיבוי מיוצר אוטומטית). **אין להחזיר סכימה כתובה-ביד לאף אחד מהשניים.** בדיקה: `python3 tools/sync-setup-sql.py --check`.
8. **בריחת HTML** — כל ערך שמקורו בנתוני משתמש ונכנס ל-`innerHTML` חייב לעבור `esc()` (סבב 6).
9. **גרסאות CDN נעוצות במדויק** — אין `@2`/`@4` צפים (סבב 6).

## הגדרת Supabase — פעם ראשונה בלבד
הרץ **`migrations/000_initial_schema.sql`** ב-Supabase SQL Editor:
https://supabase.com/dashboard/project/kxbtskqobynewvnckaaz/sql
(אידמפוטנטי, כולל כבר את 001 ו-002. `supabase-setup.sql` הוא קובץ הפניה בלבד.)
טבלאות: sl_users, sl_students, sl_transactions, sl_settings, sl_lists
משתמש ברירת מחדל: admin / admin

## סבב תיקונים 6 (יולי 2026, `sw.js` v6)
- **סכימת SQL — מקור אמת יחיד.** הסכימה ישבה בשלושה עותקים לא מסונכרנים (ה-SQL המוטבע
  במסך ההגדרה, `supabase-setup.sql`, ו-`migrations/`), ושניים מהם התיישנו בשקט: חסרו בהם
  `deleted`/`deleted_at`/`deleted_by`/`created_by`, ולכן **התקנה טרייה לפי מסך האפליקציה
  לא יכלה לשמור או למחוק תשלום**. מעכשיו:
  - **`migrations/000_initial_schema.sql` = מקור האמת** (כל 5 הטבלאות + GRANT + RLS +
    אינדקסים + seed, כולל עמודות ה-soft-delete). 001/002 נשארות כמיגרציות שדרוג.
  - `supabase-setup.sql` = **קובץ הפניה בלבד**, בלי סכימה. אין להחזיר אליו סכימה.
  - `index.html` **מושך** את קובץ המיגרציה ב-`fetch` (`SETUP_SQL_URL`) ומציג אותו;
    `SETUP_SQL_FALLBACK` הוא עותק **מיוצר אוטומטית** לשעת כשל fetch בלבד, ומסומן
    באזהרה בראשו. **אין לערוך אותו ביד.**
  - **`python3 tools/sync-setup-sql.py --check` — בדיקת חובה לפני push**, לצד
    `node --check`. שינית סכימה? הרץ `python3 tools/sync-setup-sql.py` ואז קומיט.
- **בריחת HTML — `esc()`.** לא הייתה בריחה בכלל: שמות תלמידים, הערות וערכי רשימות נכנסו
  ל-`innerHTML` גולמיים. **כל הזרקה של ערך מנתוני משתמש ל-HTML חייבת לעבור דרך `esc()`.**
  `sdRenderList` קיבל טיפול מיוחד: ה-label עבר דרך `replace(/'/g,"\\'")` לתוך מחרוזת JS
  בתוך מאפיין `onmousedown` — הבנייה שנשברת מכל מרכאה כפולה. במקומה `data-k`/`data-id`/
  `data-label` + `sdSelectEl(this)`. **אין להחזיר קוד JS מורכב לתוך מאפייני HTML.**
- **`syncAll` בודק שגיאות באמת.** `supabase-js` לא זורק, ולכן ה-`catch` היה קוד מת וכשל
  השאיר נתונים ישנים על המסך בלי משוב. עכשיו `rs[i].error` נבדק פר-קטגוריה, רק תוצאות
  תקינות נכתבות (עדיף ישן מרוקן), והמשתמש מקבל טוסט **פעם אחת** (`_syncWarned`) + טוסט
  התאוששות.
- **`_syncBusy` נגד חפיפה** — `setInterval(syncAll,3000)` הערים קריאות ברשת איטית.
  **חובה לשחרר ב-`finally`** ולא בסוף ה-`try`: דגל שנתקע דלוק מקפיא את הסנכרון לתמיד
  (הבאג של `_ysSyncing` ב-hanhala).
- **דגל הגיבוי היומי נכתב אחרי הצלחה** — `sl_last_backup` נכתב ראשון, ולכן גיבוי שנכשל
  דילג בשקט על יממה. נוסף `_slBackupRunning` כנעילת ריצה במקום הכתיבה-מראש, ובדיקת
  `error` גם על ה-`insert` ל-`kv_backup`. **אין להחזיר את הכתיבה-מראש.**
- **גרסאות CDN נעוצות** — `@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js` (זהה
  ל-hanhala) ו-`chart.js@4.4.1`. **אין לחזור ל-`@2`/`@4` צפים**: שחרור בצד הספק שובר את
  האפליקציה בלי שינוי קוד, וזה בלתי ניתן לשחזור מהריפו.

**נותר פתוח (מומלץ לסבב הבא):** `sw.js` שומר במטמון **כל** תגובת GET — כולל קריאות
PostgREST ל-Supabase. זו אותה משפחת באגים שתוקנה ב-hanhala v17 (`isSupabaseRequest`).
כאן אין עקיפת אימות (`caches.match` לפי URL מלא, בלי `ignoreSearch`), אבל **נתוני כספים
ישנים עלולים להיות מוגשים כטריים** אחרי ניתוק.

## הרנסי בדיקה (בסשן, לא בריפו)
`test_round6_esc.js` (`esc` + `sdRenderList` מול שם עם גרש/מרכאה/תגית),
`test_round6_sync.js` (`syncAll` מול Supabase מדומה: שגיאות, שומר חפיפה, דגל הגיבוי).
שניהם מריצים את הקוד האמיתי המחולץ מ-`index.html`. שווה לשחזר לפני נגיעה באזורים האלה.
