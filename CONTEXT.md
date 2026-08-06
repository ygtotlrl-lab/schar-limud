# שכר לימוד — קונטקסט פיתוח

## פרטי ריפו
- **ריפו:** `ygtotlrl-lab/schar-limud`
- **GitHub Pages:** `https://ygtotlrl-lab.github.io/schar-limud/`
- **טוקן:** מנוהל ב-Windows Credential Manager (host `github.com`) — לעולם לא בקובץ
- **קובץ ראשי:** `index.html`
- **Supabase:** project `kxbtskqobynewvnckaaz` | טבלאות `sl_*` (ראה למטה)

---

## ⚠️ Supabase — GRANT חובה לטבלאות חדשות

כל טבלה חדשה שנוצרת ב-`public` schema חייבת לכלול GRANT מפורש — אחרת supabase-js לא יוכל לגשת אליה:

```sql
grant select, insert, update, delete on public.TABLE_NAME to anon;
grant select, insert, update, delete on public.TABLE_NAME to authenticated;
grant select, insert, update, delete on public.TABLE_NAME to service_role;
alter table public.TABLE_NAME enable row level security;
```

יש ליישם זאת על כל טבלה חדשה מעתה ואילך.
מקור האמת המלא לסכימה: `migrations/000_initial_schema.sql` (כלל קריטי 7 ב-CLAUDE.md).

---

## כללים קריטיים לפיתוח

1. **node --check לפני כל push** — חובה מוחלטת (חילוץ ה-JS מ-`index.html` + `sw.js`)
2. **`python3 tools/sync-setup-sql.py --check`** — חובה לצד בדיקת התחביר
3. **קידום `CACHE_NAME` ב-`sw.js`** בכל שינוי קוד — בלי זה העדכון לא מגיע למשתמשים
4. **`sl_transactions` = כספים** — soft-delete בלבד (`deleted=true`), לעולם לא `DELETE` פיזי
5. **`esc()`** על כל ערך משתמש שנכנס ל-`innerHTML`

```python
import re, subprocess
content = open('index.html', encoding='utf-8').read()
scripts = re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', content, re.DOTALL)
with open('/tmp/test_syntax.js','w') as f: f.write('\n'.join(scripts))
r = subprocess.run(['node','--check','/tmp/test_syntax.js'],capture_output=True,text=True)
print("✅ OK" if r.returncode==0 else "❌ "+r.stderr[:300])
```

---

## טבלאות

| טבלה | תפקיד | הערות |
|---|---|---|
| `sl_users` | משתמשים | ברירת מחדל admin/admin |
| `sl_students` | תלמידים | soft-delete (migrations/002); `start_month`/`end_month` = טווח החיוב (migrations/004) |
| `sl_transactions` | תשלומים (כספים!) | soft-delete בלבד; FK ל-`sl_students` ב-RESTRICT (migrations/003) |
| `sl_settings` | הגדרות (key/value) | כולל `default_tuition`, `admin_pass` |
| `sl_lists` | רשימות בחירה | אמצעי תשלום, סעיפים; כולל את סעיף המערכת «זוכה על חשבון יתרת זכות» |

⚠️ **התנגשות שמות:** הקידומת `sl` כאן = **שכר לימוד**; ב-`hanhala-ruchanit` קיימת
קידומת `sl` שפירושה **שינה** (`slSaveData`, `slOpenSession`...) — פונקציות JS בלבד,
באותו פרויקט Supabase. פירוט מלא ב-CLAUDE.md של שני הפרויקטים.

---

## מצב נוכחי
- ניהול תלמידים ותשלומים ✅ (soft-delete בשניהם)
- לוח מחוונים עם Chart.js ✅
- גיבוי יומי ל-`kv_backup` ✅
- PWA + באנר עדכון ✅
- מקור אמת יחיד לסכימה: `migrations/000_initial_schema.sql` ✅
- חודש הצטרפות/עזיבה לתלמיד + מצבת תלמידים חודשית בדשבורד ✅ (`migrations/004` הורצה
  ואומתה; 63 התלמידים כבר מוגדרים עם חודש הצטרפות)
- יתרת זכות (עודף תשלום) כשדה נפרד + סעיף «זוכה על חשבון יתרת זכות» ✅ (`sw.js` v11;
  `migrations/005` לא תורץ בכוונה — זריעת נתון בלבד, האפליקציה זורעת בעצמה)

**מצב המיגרציות במסד הייצור:** 001–004 הורצו ואומתו (soft-delete לתשלומים ולתלמידים,
FK ב-RESTRICT, `start_month`/`end_month` קיימות ו-`handled_months` הוסרה). 005 — לא תורץ.

## פרטי מערכת
- אין APK — האפליקציה היא PWA בלבד (בניגוד ל-hanhala ול-yoman)
- סנכרון: `syncAll` בפולינג של 3 שניות; שומר חפיפה `_syncBusy` (שחרור ב-`finally`)
- נעילה אוטומטית אחרי 5 דקות חוסר פעילות
