# שכר לימוד — קונטקסט פיתוח

## פרטי ריפו
- **ריפו:** `ygtotlrl-lab/schar-limud`
- **GitHub Pages:** `https://ygtotlrl-lab.github.io/schar-limud/`
- **טוקן:** מנוהל ב-Windows Credential Manager (host `github.com`) — לעולם לא בקובץ
- **קובץ ראשי:** `index.html`
- **Supabase:** project `kxbtskqobynewvnckaaz` | טבלאות `sl_*` (ראה למטה)

---

<!-- SHARED:start id="context-grant" -->
## ⚠️ Supabase — GRANT חובה לטבלאות חדשות

כל טבלה חדשה שנוצרת ב-`public` schema חייבת לכלול GRANT מפורש — אחרת supabase-js
לא יוכל לגשת אליה. **⛔ וכאן הסדר הוא `revoke` ואז `grant`, ולא `grant` לבדו:**

```sql
revoke all on public.TABLE_NAME from anon, authenticated;
grant select, insert, update on public.TABLE_NAME to anon, authenticated;
grant all on public.TABLE_NAME to service_role;
alter table public.TABLE_NAME enable row level security;
```
<!-- SHARED:end -->

⚠️ **הסיבה:** `GRANT` הוא **אדיטיבי בלבד ואינו מסיר דבר**, ופרויקט Supabase
סטנדרטי מגיע עם `alter default privileges … grant all on tables` — כלומר
**כל טבלה נולדת עם `DELETE` ו-`TRUNCATE`**. מחיקה בארגון היא תמיד `deleted=true`
(כלל קריטי 5, וכלל ברזל 6 סעיף 1), ולכן ההרשאות האלה מיותרות בהגדרה ומסוכנות
בפועל: מפתח ה-anon יושב גלוי ב-`index.html` הציבורי. ר' `migrations/012`.
⚠️ **הניסוח הקודם כאן כלל `delete` לשלושת התפקידים** — הוא קדם למיגרציה 012
ולכלל ברזל 10 סעיף 9, ותוקן בסבב 39.

מקור האמת המלא לסכימה: `migrations/000_initial_schema.sql`.

---

⛔ **הקובץ הזה מחזיק לקוח · צורך · הסכימה וההרשאות** — ⛔ ותו לא. התקנה,
הפעלה ופיתוח יושבים ב-[README.md](README.md), והמעטפת והחתימה
ב-[android/README.md](android/README.md). ⛔ תיאור שחוזר משם נסחף בשקט,
⛔ ופרק «מצב נוכחי» לא יחזור: צילום מצב הוא היסטוריה, והכלל אוסר.
