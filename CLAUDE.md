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
```
אם `node --check` מדווח שגיאה — אסור לדחוף עד שהיא מתוקנת.

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

## הגדרת Supabase — פעם ראשונה בלבד
הרץ supabase-setup.sql ב-Supabase SQL Editor:
https://supabase.com/dashboard/project/kxbtskqobynewvnckaaz/sql
טבלאות: sl_users, sl_students, sl_transactions, sl_settings, sl_lists
משתמש ברירת מחדל: admin / admin
