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

מקור האמת המלא לסכימה: `migrations/000_initial_schema.sql` (כלל קריטי 7 ב-CLAUDE.md).

---

## כללים קריטיים לפיתוח

1. **`node tools/check-js.mjs` לפני כל push** — חובה מוחלטת. השער מחלץ את ה-JS
   המוטבע מ-`index.html`, מריץ `node --check` עליו ועל `sw.js`, ומריץ את כל
   שערי האחידות ואת חבילות בדיקות הסבבים.
   ⚠️ **מסבב 33 זו פקודה אחת ולא רשימה** — הניסוח הקודם כאן מנה את הבודקים
   בנפרד, וזה בדיוק המצב שהשער האחד בא לסלק.
2. **קידום `CACHE_NAME` ב-`sw.js`** בכל שינוי קוד — בלי זה העדכון לא מגיע
   למשתמשים.
3. **`sl_transactions` = כספים** — soft-delete בלבד (`deleted=true`),
   ⛔ לעולם לא `DELETE` פיזי; אותו כלל חל על `sl_students`.
4. **`client_id` בכל רשומה חדשה**, וכתיבה ב-`upsert` עליו — ⛔ לא `insert`.
5. **כתיבה ל-localStorage אך ורק דרך `lsSet`/`lsSetArray`** (כלל ברזל 1).
6. **`esc()`** על כל ערך משתמש שנכנס ל-`innerHTML`.

---

## טבלאות

| טבלה | תפקיד | הערות |
|---|---|---|
| `sl_users` | משתמשים | ⛔ אין ברירת מחדל (סבב 24) · `role` קובע הרשאה (סבב 26) |
| `sl_students` | תלמידים | soft-delete (migrations/002); `start_month`/`end_month` = טווח החיוב (migrations/004) |
| `sl_transactions` | תשלומים (כספים!) | soft-delete בלבד; FK ל-`sl_students` ב-RESTRICT (migrations/003) |
| `sl_settings` | הגדרות (key/value) | `default_tuition`. ⚠️ שורת `admin_pass` **נמחקה מהמסד ומהגיבויים** בסבב 35; מנגנון סינון הסודות (`SL_NEVER_MIRROR_SETTINGS`) נשאר דרוך וריק |
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
- יתרת זכות (עודף תשלום) כשדה נפרד + סעיף «זוכה על חשבון יתרת זכות» ✅ (`migrations/005` לא תורץ בכוונה — זריעת נתון בלבד, האפליקציה זורעת בעצמה)

**מצב המיגרציות במסד הייצור:** `001`–`014` הורצו ואומתו, **פרט ל-`005`** —
⛔ שלא תורץ בכוונה (זריעת נתון בלבד; האפליקציה זורעת בעצמה). הטבלה המלאה
יושבת ב-CLAUDE.md, פרק «מצב המיגרציות במסד הייצור» — ⚠️ הניסוח הקודם כאן
נעצר ב-`004` ותוקן בסבב 39.

## פרטי מערכת
- מעטפת APK: **WebView מקורי** ב-`android/` שטוען מהרשת — ⛔ לא TWA ולא
  PWABuilder. ⚠️ הניסוח הקודם כאן («אין APK — PWA בלבד») קדם למעטפת ותוקן
  בסבב 39.
- חתימה: `signing/schar.keystore` (alias `schar`) — ⛔ המפתח הקבוע
- סנכרון: `syncAll` בפולינג של 3 שניות; שומר חפיפה `_syncBusy` (שחרור ב-`finally`)
- נעילה אוטומטית אחרי 5 דקות חוסר פעילות

<!-- SHARED:start id="context-smali-scope" -->
## תיקון URL ב-APK קיים ובנוי (בלי מקור) — smali בלבד

⚠️ **הפרק הזה רלוונטי רק ל-APK ישן שנבנה לפני `android/`.** בנייה רגילה היום
היא מ-`android/` דרך `.github/workflows/build-apk.yml`, והמעטפת טוענת מהרשת —
ולכן אין בה URL שצריך לתקן.
⛔ **smali בלבד — לא binary patch.** עריכה בינארית של ה-APK שוברת את החתימה
ואינה ניתנת לאימות, ⛔ והחתימה מחדש היא במפתח הקבוע של הריפו בלבד — ר' הפרק
«חתימת APK» ב-CLAUDE.md.
<!-- SHARED:end -->

```bash
apktool d <app>.apk -o /tmp/schar_work -f
# תקן את ה-URL ב-MainActivity.smali ו-MainActivity$2.smali
rm -rf /tmp/schar_work/build          # חובה לפני בנייה חוזרת
apktool b /tmp/schar_work -o built.apk
zipalign -f 4 built.apk aligned.apk
apksigner sign --ks signing/schar.keystore --ks-key-alias schar \
  --ks-pass pass:schar123 --key-pass pass:schar123 --out output.apk aligned.apk
```

⚠️ **כאן אין APK ותיק בלי מקור** — המעטפת הראשונה בריפו הזה נבנתה מ-`android/`
מהיום הראשון. הפרק נשמר כדפוס ארגוני אחיד, ⛔ ולא מפני שיש כאן APK שצריך
לתקן.

<!-- SHARED:start id="context-cache-apk" -->
### ⚠️ Cache APK — כלל זהב

שם קובץ חוזר נתפס במטמון — של הדפדפן, של מנהל ההורדות ושל המכשיר — והמשתמש
מתקין שוב את הבנייה **הקודמת** בלי לדעת. ⛔ **תמיד שם חדש בכל בנייה**, עם
חותמת זמן:
<!-- SHARED:end -->

```bash
TS=$(date +%s) && apksigner sign ... --out schar-limud-${TS}.apk
```

הכללים המחייבים והתיעוד המלא — ב-[CLAUDE.md](CLAUDE.md).
