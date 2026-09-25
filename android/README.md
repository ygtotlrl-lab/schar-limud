# שכר לימוד — Native WebView APK

A native Android **WebView** shell (not a TWA) that loads the **live site** over the
network — כתובת האפליקציה, `android.url` שבתצורה.

## מה בפנים

| | |
|---|---|
| **Package ID** | שם החבילה — `android.package` שבתצורה |
| **טוען** | כתובת האפליקציה — `android.url` שבתצורה — **מהרשת**, לא מנכסים מוטבעים |
| **versionCode** | ⛔ עולה בכל שינוי ב-APK: ⚠️ מכשיר אינו מתקין מעל גרסה שאינה גבוהה ממנה |
| **minSdk / targetSdk** | נוצרים ב-`tools/gen-app.mjs` — ⛔ זהים בכולן |
| **WebView** | JavaScript, DOM storage (localStorage — שם יושבים `sl_mirror_*`/`sl_pending`), DB. **בלי** גישת `file://` ובלי mixed content פתוח — האתר הוא https בלבד, `usesCleartextTraffic=false` |
| **ניווט** | כל `http`/`https` **נשאר בתוך המעטפת**. שאר הסכימות (`tel:`, `mailto:`, `whatsapp:`, …) נמסרות למערכת |
| **בורר קבצים** | `WebChromeClient.onShowFileChooser` מחובר ל-`<input type=file>` (תשתית — אין כרגע input כזה בדף) |
| **אופליין** | ה-service worker + שכבת ה-MIRROR של האתר. המעטפת מציגה דף שגיאה בעברית **רק** בהפעלה ראשונה בלי רשת |

<!-- SHARED:start id="android-web-update" -->
**עדכוני קוד web לא מצריכים APK חדש.** כל דחיפה ל-`main` מגיעה למכשירים דרך
אותו מנגנון service worker + באנר "גרסה חדשה זמינה" שכבר עובד בדפדפן. APK חדש
נדרש רק כששינוי נוגע במעטפת עצמה.
<!-- SHARED:end -->

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

⛔ **והנתונים כאן הם כסף**
(`sl_transactions`): תשלום שנרשם בדפדפן וטרם עלה לענן אינו «אי-נוחות».

<!-- SHARED:start id="android-icons" -->
## אייקונים

אייקוני המעטפת יושבים ב-`android/app/src/main/res/` — **עשרה קובצי `mipmap`**
(`ic_launcher.png` ו-`ic_launcher_foreground.png` בכל אחת מחמש הרזולוציות)
ו**קובץ XML אדפטיבי אחד**, `mipmap-anydpi-v26/ic_launcher.xml`, שהרקע שלו הוא
`res/drawable/ic_launcher_background.xml`.
⭐ **נמדד בכל הריפו — אותו מבנה בדיוק בכולן.**

⛔ **אין לערוך את קובצי ה-`mipmap` ידנית** — כולם נגזרים ממקור גרפי אחד, וכל
עריכה ידנית היא גרסה שנייה שתידרס בגזירה הבאה בלי שאיש יידע.
⚠️ **המקור עצמו נבדל פר-אפליקציה**, והוא מתועד בשורה שמתחת.
<!-- SHARED:end -->

⚠️ **המאסטר הוא `design/icon-master.png`** — ⛔ המחולל קורא אותו וגוזר ממנו את 16 הנכסים,
⚠️ ואין נכס שנערך ביד: ⭐ והצורה מוצהרת ב-`APP.art` שבמחולל.

<!-- SHARED:start id="android-shell-split" -->
## המעטפת — ליבה משותפת ומעטפת פר-אפליקציה

⛔ **שני קובצי ה-Java נוצרים מהתצורה** — `node tools/gen-app.mjs`, מהתבניות
שב-`tools/java/`: ⚠️ ואין עורכים אותם ביד, ⭐ ו-`--check` מפיל כשהעץ נבדל.

| קובץ | מה יש בו |
|---|---|
| `ShellActivity.java` | **הליבה המשותפת** — הגדרות ה-WebView, בורר הקבצים, `shouldOverrideUrlLoading`, דף האופליין, כפתור החזרה ושמירת המצב. ⭐ תבנית אחת, ושורת ה-`package` היא ההבדל היחיד. |
| `MainActivity.java` | **זהות בלבד** — הכתובת, משפט האופליין וצבע הכפתור, מ-`android` שבתצורה, דרך שלוש מתודות. |

⛔ **אין להוסיף לוגיקה ל-`MainActivity`** — התנהגות שנוספת לאפליקציה אחת
בלבד היא עותק חופשי של המעטפת. מה שנחוץ לכולן נכנס לתבנית של
`ShellActivity`; מה שנחוץ לאחת עובר דרך שתי הווים שהליבה חושפת —
`installBridge()` ו-`onShellNavigation(String)` — ומוצהר בתצורה.

⚠️ **גשר השיתוף נוצר רק כש-`android.share` מוצהר בתצורה** — קטע `//@@share`
בתבנית, ⭐ שיורד כולו כשאינו מוצהר. ⛔ **ואין גשר בליבה** — גשר שם היה מגיע
לכל האפליקציות בבת אחת.
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

### פרטי המפתח הקבוע

| | |
|---|---|
| **קובץ** | ⛔ אינו בריפו — GitHub Secret `KEYSTORE_B64`, מפוענח לקובץ זמני בזמן בנייה ונמחק אחריה (PKCS12, RSA 4096) |
| **alias** | ⛔ אינו מוקלד — `sign-apk.sh` גוזר אותו מהמפתח עצמו |
| **storepass / keypass** | ⛔ אינה בריפו — GitHub Secret `KEYSTORE_PASS` |
| **SHA256** | טביעת המפתח — `signSha256` שבתצורה |

⭐ **מסלול חתימה אחד ויחיד** — `signing/sign-apk.sh`. ⛔ החלופות
הידניות אינן מתועדות כאן: מסלול חתימה שני בתיעוד הוא בדיוק הדרך שבה APK
נחתם במפתח הלא-נכון. אימות:
`keytool -list -v -keystore <עותק מקומי> -storepass <הערך שב-KEYSTORE_PASS>`.

⚠️ **בסביבת הענן אין Android SDK ו-`dl.google.com` חסום** — הדרך המעשית
היא ה-workflow. ⛔ ולא PWABuilder: הוא יודע לייצר TWA בלבד.

### פרטי המעטפת
שם החבילה, `versionCode` ו-SDK — מהתצורה ומ-`tools/gen-app.mjs`;
`usesCleartextTraffic=false`.

<!-- SHARED:start id="android-cache-apk" -->
### ⚠️ Cache APK — כלל זהב

שם קובץ חוזר נתפס במטמון — של הדפדפן, של מנהל ההורדות ושל המכשיר — והמשתמש
מתקין שוב את הבנייה **הקודמת** בלי לדעת. ⛔ **תמיד שם חדש בכל בנייה**, עם
חותמת זמן:
<!-- SHARED:end -->

```bash
TS=$(date +%s) && apksigner sign ... --out schar-limud-${TS}.apk
```
