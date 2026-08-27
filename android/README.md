# schar-limud — Native WebView APK

A native Android **WebView** shell (not a TWA) that loads the **live site** over the
network:

```
https://ygtotlrl-lab.github.io/schar-limud/
```

Built in the exact pattern of yoman-avoda's round-13 shell (the network-loading one),
with one deliberate difference — see "אין גשר שיתוף" below.

## Why WebView and never a TWA

<!-- SHARED:start id="android-why-twa" -->
**Do not rebuild this as a TWA, and do not use PWABuilder** (it only produces
TWAs). A TWA is not a standalone component — it runs the site *inside Chrome*
and merely hides the address bar. The content filtering installed on the users'
devices blocks Chrome, so a TWA build never opens at all. A WebView renders
in-process and never goes through Chrome, so the filter does not touch it.
<!-- SHARED:end -->

This is measured, not theoretical: gius shipped a PWABuilder TWA and did not
open on the users' devices, while yoman and hanhala — both WebView — work.

## מה בפנים

| | |
|---|---|
| **Package ID** | `com.schar.limud` |
| **טוען** | `https://ygtotlrl-lab.github.io/schar-limud/` — **מהרשת**, לא מנכסים מוטבעים |
| **versionCode** | 8 — קודם בסבב 66 (עשרת קובצי ה-mipmap הוחלפו). 6 — קודם בתיקון שאחרי סבב 60 (קיצור ההערה המשותפת ב-`ShellActivity`, שנעשה בסבב 60 בלי קידום). 5 — קודם בסבב 58 (הסרת `FLAG_ACTIVITY_NEW_TASK` ממסירת יעד חיצוני ל-`ACTION_VIEW`). 4 = סבב 46ב (היפוך ברירת המחדל בקובצי התצורה). 3 = סבב 45, 2 = סבב 41 (חילוץ המעטפת), 1 = המעטפת הראשונה של שכר לימוד, טוענת מהרשת מהיום הראשון (לא היה כאן שלב `file://`) |
| **minSdk / targetSdk** | 21 / 34 |
| **WebView** | JavaScript, DOM storage (localStorage — שם יושבים `sl_mirror_*`/`sl_pending`), DB. **בלי** גישת `file://` ובלי mixed content פתוח — האתר הוא https בלבד, `usesCleartextTraffic=false` |
| **ניווט** | כל `http`/`https` **נשאר בתוך המעטפת**. שאר הסכימות (`tel:`, `mailto:`, `whatsapp:`, …) נמסרות למערכת |
| **בורר קבצים** | `WebChromeClient.onShowFileChooser` מחובר ל-`<input type=file>` (תשתית — אין כרגע input כזה בדף) |
| **אופליין** | ה-service worker + שכבת ה-MIRROR של האתר. המעטפת מציגה דף שגיאה בעברית **רק** בהפעלה ראשונה בלי רשת |

<!-- SHARED:start id="android-web-update" -->
**עדכוני קוד web לא מצריכים APK חדש.** כל דחיפה ל-`main` מגיעה למכשירים דרך
אותו מנגנון service worker + באנר "גרסה חדשה זמינה" שכבר עובד בדפדפן. APK חדש
נדרש רק כששינוי נוגע במעטפת עצמה.
<!-- SHARED:end -->

## ⛔ אין גשר שיתוף — וזה ההבדל היחיד מהתבנית של יומן

למעטפת של yoman-avoda יש `AndroidShareBridge` (מוגבל-origin, בשני מנעולים) כי הדף
שלה קורא ל-`navigator.share` עם תמונת דו"ח. **בקוד של שכר לימוד אין `navigator.share`
בכלל**, ולכן הגשר הושמט כליל — לא בצד Java, לא בצד הדף, לא ב-manifest
(אין `FileProvider`, אין `<queries>`) ולא בתלויות (אין androidx).

גשר מקורי על דף שנטען מהרשת הוא כוח שנמסר למי שמגיש את הדף. אם אי-פעם יידרש כאן
גשר — מעתיקים את הדפוס הכפול-נעילה של יומן (`WebViewCompat.addWebMessageListener`
עם `ALLOWED_ORIGINS`, ונפילה-חזרה שמחוברת רק על ה-origin שלנו). **לעולם לא
`addJavascriptInterface` חשוף.**

## למה אין נכסים מוטבעים

- ⛔ **`file://` הוא origin אחסון אחר.** ה-localStorage של `file://` ושל
  `https://ygtotlrl-lab.github.io` הן שתי מחיצות נפרדות לחלוטין. תשלום שנרשם
  לעותק מוטבע בעלייה ראשונה **לא נראה לאפליקציה האמיתית לעולם** — והוא גם לא
  יסונכרן, כי הסנכרון רץ בדף השני. כאן זה לא סתם נתון — זה **כסף**
  (`sl_transactions`). גיבוי שמייצר אובדן נתונים אינו גיבוי.
- **זה מקור אמת שני** — בדיוק מה שכלל קריטי 4 של הריפו אוסר. הוא מתיישן בכל שחרור.
- **מה שהוא אמור לפתור כבר פתור**: אחרי עלייה מוצלחת אחת, ה-service worker מגיש
  הכול אופליין ושכבת ה-MIRROR (סבב 12–13) עובדת בלי רשת. המקרה היחיד שנשאר הוא
  **התקנה + הפעלה ראשונה בלי רשת בכלל** — ולהתקנת APK ממילא צריך רשת. במקרה הזה
  המעטפת מציגה דף שגיאה בעברית עם כפתור "נסה שוב".

<!-- SHARED:start id="android-origin-switch" -->
## ⚠️ מעבר-origin חד-פעמי — ולפני כל הפצת APK

ה-WebView של האפליקציה מחזיק **מחיצת אחסון משלו**, נפרדת מזו של הדפדפן באותו
מכשיר. מי שעבד עד עכשיו בדפדפן ועובר ל-APK מתחיל עם localStorage **ריק**:
כניסה מחדש, והעותק המקומי נטען מהענן — שהוא ממילא מקור האמת.

⛔ **מה שכן יכול ללכת לאיבוד: רשומה שנרשמה במכשיר וטרם עלתה לענן.** לכן —
**לפני כל הפצת APK, ודא בכל מכשיר שההגדרות ← «⏳ ממתין לסנכרון» מציג 0.**
רשומה שמסומנת ⏳ יושבת רק באותה מחיצת אחסון, ומעבר ה-origin ישאיר אותה מאחור.

⚠️ **ואותו מעבר קורה גם בהחלפת חתימה, לא רק בהחלפת origin:** התקנה ראשונה של
בנייה שנחתמה במפתח קבוע חדש מחייבת **הסרה חד-פעמית** של האפליקציה הישנה
(חתימה שונה ⇒ אנדרואיד רואה אפליקציה זרה ⇒ `INSTALL_FAILED_UPDATE_INCOMPATIBLE`),
וההסרה מוחקת את מחיצת האחסון שלה. מאותה נקודה ואילך ההתקנות חלקות.
⛔ **גם כאן «⏳ ממתין לסנכרון» נבדק לפני ההסרה ולא אחריה** — אחריה כבר אין מה
לבדוק.
<!-- SHARED:end -->

⚠️ **כאן אין APK ותיק להחליף** — המעטפת הראשונה בריפו הזה טוענת מהרשת מהיום
הראשון, ולכן המעבר היחיד הוא דפדפן ← APK. ⛔ **והנתונים כאן הם כסף**
(`sl_transactions`): תשלום שנרשם בדפדפן וטרם עלה לענן אינו «אי-נוחות».

<!-- SHARED:start id="android-icons" -->
## אייקונים

אייקוני המעטפת יושבים ב-`android/app/src/main/res/` — **עשרה קובצי `mipmap`**
(`ic_launcher.png` ו-`ic_launcher_foreground.png` בכל אחת מחמש הרזולוציות)
ו**קובץ XML אדפטיבי אחד**, `mipmap-anydpi-v26/ic_launcher.xml`, שהרקע שלו הוא
`res/drawable/ic_launcher_background.xml`.
⭐ **נמדד בארבעת הריפו — אותו מבנה בדיוק בכולן.**

⛔ **אין לערוך את קובצי ה-`mipmap` ידנית** — כולם נגזרים ממקור גרפי אחד, וכל
עריכה ידנית היא גרסה שנייה שתידרס בגזירה הבאה בלי שאיש יידע.
⚠️ **המקור עצמו נבדל פר-אפליקציה**, והוא מתועד בשורה שמתחת.
<!-- SHARED:end -->

⚠️ **המקור כאן:** `icons/master-green-1024.png` — אותה גיאומטריה של המאסטר
הארגוני, באלפא-דיו ירוק `#307535`; `ic_launcher` מלא על לבן,
ו-`ic_launcher_foreground` על שקוף ב-66% מהקנבס.

<!-- SHARED:start id="android-shell-split" -->
## המעטפת — ליבה משותפת ומעטפת פר-אפליקציה (סבב 41)

`MainActivity.java` היה עד סבב 41 **ארבעה עותקים חופשיים** של אותה מעטפת:
hanhala ו-schar כמעט זהות בית-לבית, gius נבדלת בניסוח, ו-yoman כפולה בגלל
גשר השיתוף. שער החתימה של סבב 40 הקפיא את המצב, ⛔ אך לא איחד אותו.

מעכשיו הקוד מפוצל לשניים:

| קובץ | מה יש בו |
|---|---|
| `ShellActivity.java` | **הליבה המשותפת** — הגדרות ה-WebView, בורר הקבצים, `shouldOverrideUrlLoading`, דף האופליין, כפתור החזרה ושמירת המצב. ⭐ **זהה בית-לבית בארבעת הריפו** פרט לשורת ה-`package`. |
| `MainActivity.java` | **זהות בלבד** — הכתובת, משפט האופליין וצבע הכפתור, דרך שלוש מתודות. |

⛔ **אין להוסיף לוגיקה ל-`MainActivity`** (סבב 41) — התנהגות שנוספת
לאפליקציה אחת בלבד מחזירה בדיוק את ארבעת העותקים שהחילוץ החליף. מה שנחוץ
לכולן נכנס ל-`ShellActivity`; מה שנחוץ לאחת עובר דרך שתי הווים שהליבה
חושפת — `installBridge()` ו-`onShellNavigation(String)` — ונרשם כחריגה
מנומקת.

⚠️ **החריגה היחידה היום היא גשר השיתוף של yoman-avoda**, והיא מדודה: הליבה
נושאת חתימה אחת בארבעתן (`d8efd10bc6d47354`), ורק המעטפת של yoman נבדלת.
`tools/test_shell.mjs` אוכף את שתי החתימות, ו⛔ **נכשל אם נמצא גשר
בליבה** — גשר שם היה מגיע לארבע האפליקציות בבת אחת.
<!-- SHARED:end -->

## Build

### הדרך המומלצת — GitHub Actions (לא צריך שום דבר מותקן)

`.github/workflows/build-apk.yml`: Actions → **Build APK** → **Run workflow**.
ה-APK **החתום** יורד כ-artifact בשם `schar-limud-apk`.

### בנייה מקומית (דורשת Android SDK + Gradle)

```bash
cd android
gradle :app:assembleRelease        # או: ./gradlew :app:assembleRelease
# Unsigned APK output:
#   android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Sign with the PERMANENT key (required so it installs over previous builds)

```bash
../signing/sign-apk.sh app/build/outputs/apk/release/app-release-unsigned.apk schar-limud.apk
```

### המפתח הקבוע — ⛔ לעולם לא להחליף

| | |
|---|---|
| **קובץ** | `signing/schar.keystore` (PKCS12, RSA 2048) |
| **alias** | `schar` |
| **storepass / keypass** | `schar123` (זהה לשניהם) |
| **תוקף** | 10,000 יום — 08.08.2026 עד 23.12.2053 |
| **SHA256** | `29:32:D9:B5:94:69:D4:E4:53:EF:C7:EE:3B:10:55:C9:CE:4B:EE:D6:9B:BB:78:EC:EE:18:BD:C6:BE:2D:0F:87` |
| **SHA1** | `F5:BD:6A:6E:BE:EF:B5:85:78:9F:70:B1:19:60:8F:1B:DE:90:1B:D4` |
| **DN** | `CN=schar, OU=Yeshiva, O=Yeshiva, L=Rishon LeZion, ST=Israel, C=IL` |

⭐ **מסלול חתימה אחד ויחיד** (סבב 53) — `signing/sign-apk.sh`. ⛔ החלופות
הידניות אינן מתועדות כאן: מסלול חתימה שני בתיעוד הוא בדיוק הדרך שבה APK
נחתם במפתח הלא-נכון. אימות:
`keytool -list -v -keystore signing/schar.keystore -storepass schar123`.

⚠️ **בסביבת הענן אין Android SDK ו-`dl.google.com` חסום** — הדרך המעשית היא
ה-workflow שלמעלה (`Build Signed APK`, temurin 17, artifact `schar-limud-apk`).
⛔ ולא PWABuilder: הוא יודע לייצר TWA בלבד.

### פרטי המעטפת
package `com.schar.limud`, versionCode 3, minSdk 21 / targetSdk 34,
`usesCleartextTraffic=false`. ⚠️ המעטפת הראשונה כאן טוענת מהרשת מהיום
הראשון — ⛔ לא היה כאן שלב `file://`.

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
