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

## לפני כל push — חובה
node --check index.html (extract scripts and check syntax)

## Push
cd /tmp/schar-limud
git add . && git commit -m "תיאור השינוי"
git push origin main   # GCM מספק את הטוקן אוטומטית — אין טוקן בפקודה

## כללים קריטיים
1. node --check לפני כל push — חובה
2. GitHub חוסם push עם טוקן גולמי בקובץ — שמור תמיד כ-TOKEN_IN_MEMORY
3. Supabase: כל טבלה חדשה — GRANT מפורש ל-anon, authenticated, service_role + RLS
4. **מקור אמת יחיד = `index.html`** — זה הקובץ ש-Pages מגיש ושאליו מצביע `start_url` במניפסט. כל עדכון קוד נכנס לכאן בלבד. אסור ליצור קבצי HTML כפולים של האפליקציה. (אין כאן מנגנון אוטו-אפדייט פנימי — בניגוד ל-yoman-avoda.)

## הגדרת Supabase — פעם ראשונה בלבד
הרץ supabase-setup.sql ב-Supabase SQL Editor:
https://supabase.com/dashboard/project/kxbtskqobynewvnckaaz/sql
טבלאות: sl_users, sl_students, sl_transactions, sl_settings, sl_lists
משתמש ברירת מחדל: admin / admin
