# שכר לימוד — קונטקסט פיתוח

## פרטי ריפו
- **ריפו:** `ygtotlrl-lab/schar-limud`
- **GitHub Pages:** כתובת האפליקציה — `android.url` שבתצורה
- **טוקן:** מנוהל ב-Windows Credential Manager (host `github.com`) — לעולם לא בקובץ
- **קובץ ראשי:** `index.html`
- **Supabase:** project — `supabase.url` שבתצורה | טבלאות `sl_*`

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

⚠️ **הסיבה:** `GRANT` הוא **אדיטיבי בלבד ואינו מסיר דבר**, ופרויקט Supabase
סטנדרטי מגיע עם `alter default privileges … grant all on tables` — כלומר
**כל טבלה נולדת עם `DELETE` ו-`TRUNCATE`**. מחיקה כאן היא תמיד `deleted=true`,
ולכן ההרשאות האלה מיותרות בהגדרה ומסוכנות בפועל: מפתח ה-anon יושב גלוי
ב-`index.html` הציבורי.

⚠️ **ושמות הטבלאות נגזרים מתפקידן** — ⭐ `<תחילית>_settings` · `_users` ·
`_entries`: ⛔ ולא לפי מה שנשמע טוב.
<!-- SHARED:end -->

מקור האמת המלא לסכימה: `migrations/000_schema.sql`.
