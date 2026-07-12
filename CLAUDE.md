# שכר לימוד — CLAUDE.md

## סביבת עבודה
- ריפו: `ygtotlrl-lab/schar-limud`
- Pages: `https://ygtotlrl-lab.github.io/schar-limud/`
- טוקן: מאוחסן ב-Windows Credential Manager (host `github.com`) — לעולם לא בקובץ. `git push`/`clone` מושכים אותו אוטומטית דרך GCM.
- קובץ ראשי: `index.html`
- Supabase: `kxbtskqobynewvnckaaz`

## התחלת סשן — חובה
git clone https://github.com/ygtotlrl-lab/schar-limud.git /tmp/schar-limud
cd /tmp/schar-limud
git config user.email "dev@yeshiva.com" && git config user.name "Dev"

## לפני כל push — חובה: בדיקת V8-parse של ה-JS המוטבע
**כל שינוי ב-`index.html` חייב לעבור את הבדיקה הזו לפני דחיפה. דחיפה ללא הבדיקה — אסורה.**
בדיקת איזון-סוגריים בלבד אינה מספיקה (עיוורת לשגיאות בתוך מחרוזות). `new Function` ב-V8 = parse מלא אמיתי. (`node` אינו מותקן במכונה — Chrome headless הוא מנוע הבדיקה.)
```bash
# 1) חלץ את כל ה-JS המוטבע לקובץ
python3 -c "
import io, re
s = io.open('index.html', encoding='utf-8').read()
js = chr(10).join(re.findall(r'<script(?![^>]*src)[^>]*>(.*?)</script>', s, re.DOTALL))
io.open('_app.js', 'w', encoding='utf-8').write(js)
"
# 2) harness עם new Function (parse בלבד)
cat > _harness.html <<'EOF'
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="out">PENDING</div>
<script>
fetch('_app.js').then(function(r){return r.text();}).then(function(code){
  try { new Function(code); document.getElementById('out').textContent = 'SYNTAX-OK'; }
  catch(e) { document.getElementById('out').textContent = 'SYNTAX-ERR: ' + e.message; }
});
</script></body></html>
EOF
# 3) הרץ ב-Chrome headless — חובה לראות SYNTAX-OK
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --allow-file-access-from-files --virtual-time-budget=8000 \
  --dump-dom "file:///$(cygpath -m "$PWD")/_harness.html" 2>/dev/null | grep -o '<div id="out">[^<]*</div>'
rm -f _app.js _harness.html
```
אם התוצאה אינה `SYNTAX-OK` — אסור לדחוף. וגם: לקדם את `CACHE` ב-`sw.js` בכל שינוי משמעותי.

## Push
cd /tmp/schar-limud
git add . && git commit -m "תיאור השינוי"
git push origin main   # GCM מספק את הטוקן אוטומטית — אין טוקן בפקודה

## גישת Supabase
כשזמין ה-Supabase MCP, נהג לפי הכללים הבאים — ללא יוצאים מן הכלל:
- **שינויי סכימה** (יצירה/שינוי/מחיקת טבלאות, עמודות, פוליסות, הרשאות) — **אך ורק דרך `apply_migration`** עם שם ברור ותיאורי (למשל `add_sl_transactions_soft_delete`). לא דרך `execute_sql`.
- **שאילתות אבחון וקריאה** (SELECT, בדיקת מבנה, ספירות, `list_tables` וכו') — **חופשיות**, ללא אישור.
- **עדכון או מחיקת נתונים בטבלאות `sl_*`** (`sl_students`, `sl_transactions`, `sl_settings`, `sl_lists`, `sl_users`) — **מחייבים אישור מפורש מהמשתמש לפני הרצה**. אין להריץ `UPDATE`/`DELETE`/`upsert` על נתונים בלי אישור. (בפרט: `sl_transactions` הוא כספים — מחיקה היא soft-delete בלבד, `deleted=true`.)

## כללים קריטיים
1. **בדיקת V8-parse לפני כל push** (הסעיף למעלה) — חובה מוחלטת. דחיפה בלי `SYNTAX-OK` — אסורה.
2. GitHub חוסם push עם טוקן גולמי בקובץ — שמור תמיד כ-TOKEN_IN_MEMORY
3. Supabase: כל טבלה חדשה — GRANT מפורש ל-anon, authenticated, service_role + RLS
4. **מקור אמת יחיד = `index.html`** — זה הקובץ ש-Pages מגיש ושאליו מצביע `start_url` במניפסט. כל עדכון קוד נכנס לכאן בלבד. אסור ליצור קבצי HTML כפולים של האפליקציה. (אין כאן מנגנון אוטו-אפדייט פנימי — בניגוד ל-yoman-avoda. אין יותר sl_p1/p2/p3.txt + gen.py — index.html נערך ישירות.)
5. **`sl_transactions` = כספים** — מחיקה היא soft-delete (`deleted=true`+`deleted_at`+`deleted_by`), לעולם לא מחיקה פיזית. כל שליפה/סיכום מסננת `deleted=false`. הוספה ממלאת `created_by`.

## הגדרת Supabase — פעם ראשונה בלבד
הרץ supabase-setup.sql ב-Supabase SQL Editor:
https://supabase.com/dashboard/project/kxbtskqobynewvnckaaz/sql
טבלאות: sl_users, sl_students, sl_transactions, sl_settings, sl_lists
משתמש ברירת מחדל: admin / admin
