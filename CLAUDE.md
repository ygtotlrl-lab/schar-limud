# שכר לימוד — CLAUDE.md

## סביבת עבודה
- ריפו: `ygtotlrl-lab/schar-limud`
- Pages: `https://ygtotlrl-lab.github.io/schar-limud/`
- טוקן: `TOKEN_IN_MEMORY`
- קובץ ראשי: `index.html`
- Supabase: `kxbtskqobynewvnckaaz`

## התחלת סשן — חובה
git clone https://TOKEN_IN_MEMORY@github.com/ygtotlrl-lab/schar-limud.git /tmp/schar-limud
cd /tmp/schar-limud
git config user.email "dev@yeshiva.com" && git config user.name "Dev"

## לפני כל push — חובה
node --check index.html (extract scripts and check syntax)

## Push
cd /tmp/schar-limud
git add . && git commit -m "תיאור השינוי"
git push https://TOKEN_IN_MEMORY@github.com/ygtotlrl-lab/schar-limud.git main

## כללים קריטיים
1. node --check לפני כל push — חובה
2. GitHub חוסם push עם טוקן גולמי בקובץ — שמור תמיד כ-TOKEN_IN_MEMORY
3. Supabase: כל טבלה חדשה — GRANT מפורש ל-anon, authenticated, service_role + RLS

## הגדרת Supabase — פעם ראשונה בלבד
הרץ supabase-setup.sql ב-Supabase SQL Editor:
https://supabase.com/dashboard/project/kxbtskqobynewvnckaaz/sql
טבלאות: sl_users, sl_students, sl_transactions, sl_settings, sl_lists
משתמש ברירת מחדל: admin / admin
