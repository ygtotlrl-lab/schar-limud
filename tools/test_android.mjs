#!/usr/bin/env node
/*  שער החתימה של שכבת האנדרואיד — סבב 45, כלל ברזל 14.
 *
 *  ⚠️ **הפער שנמדד בסבב 44:** `MainActivity.java` ו-`ShellActivity.java`
 *  חתומים מסבבים 40–41, אבל **שני הקבצים שקובעים איך ה-APK נבנה ומה
 *  אנדרואיד מרשה לו** — `AndroidManifest.xml` ו-`android/app/build.gradle` —
 *  לא נשאו שום חתימה. `test_bump.mjs` בודק את ה-`versionCode`
 *  ואת מזהה החבילה, ⛔ ואינו נוגע בשאר הקובץ: הרשאה שנוספה, `<queries>`
 *  שנעלם או `configChanges` שנסחף עברו בשקט בארבעת הריפו.
 *
 *  ⛔ **וזו בדיוק הצורה הרביעית שכלל ברזל 14 אוסר** — «קיים רק באחת,
 *  בשקט»: `configChanges` היה `orientation|screenSize|keyboardHidden`
 *  בשלושה ו-`…|screenLayout|smallestScreenSize` ב-gius, ⛔ ואיש לא החליט
 *  על ההבדל. סבב 45 יישר לסופרסט וחתם.
 *
 *  הבדיקה נכשלת על שלושה סוגי סטייה:
 *    א. **חוזה** — הרשאה שנעלמה, `configChanges` שאינו הסופרסט הקנוני,
 *       או גשר שיתוף שקיים/חסר בניגוד למוצהר ב-APP.
 *    ב. **חתימת המניפסט** — החלק המשותף אינו תואם לחתימה הקנונית.
 *    ג. **חתימת קובץ הבנייה** — אותו דבר, ב-`build.gradle`.
 *
 *  ⚠️ **מה שמנורמל החוצה, ובכוונה:** מזהי החבילה (`namespace`/
 *  `applicationId`), מספרי הגרסה (`versionCode`/`versionName`), שם
 *  האפליקציה (`android:label`) וכל ההערות. ⛔ אלה מצייני-זהות והיסטוריה
 *  ולא לוגיקת בנייה — בלי נרמולם כל ריפו היה נושא חתימה משלו, ואי אפשר
 *  היה לאכוף שהם זהים. ⚠️ ה-`versionCode` **כן** נאכף — במקום שבו הוא
 *  באמת שער, `test_bump.mjs`.
 *
 *  ⭐ **וזו מדידה ולא הצהרה** (סבב 45): אחרי הנרמול שלושת הריפו
 *  חסרי-הגשר נושאים **חתימה זהה בדיוק** בשני הקבצים, ולריפו אחד —
 *  יומן — חתימה משלו. ⛔ וההפרש כולו נמדד ונמצא **בדיוק** `<queries>`
 *  + `<provider>` במניפסט ושתי תלויות ה-`androidx` בקובץ הבנייה, כלומר
 *  גשר השיתוף ותו לא. חריגה **מדודה**, לא סחיפה.
 *
 *  ⭐ **סבב 46ב הפך כאן את ברירת המחדל.** עד אז ההפרש של יומן היה
 *  **מוצהר** — חתימה משלה, בלי מול מה להשוות. מעכשיו בלוקי הגשר
 *  מופשטים החוצה וארבעת הריפו נושאים את החתימה חסרת-הגשר הקנונית:
 *  ⛔ הפרש שאינו הגשר מפיל את השער, גם אם החתימה הפרטית עודכנה.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /* ⚠️ אין כאן גשר שיתוף — אין `navigator.share` בקוד, ולכן אין
     `<queries>`, אין `<provider>` ואין תלויות androidx. ⛔ אין לתת גשר
     מקורי לדף שנטען מהרשת בלי צורך (סבב 41). שתי החתימות כאן הן
     הקנוניות של חסרי-הגשר, וזהות בשלושת הריפו. */
  shareBridge: false,
  manifestSha: '5689f6b481333147',
  gradleSha:   '9cbf35bb88e9b753',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [75];

const ROOT     = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const GRADLE   = 'android/app/build.gradle';

/*  ⭐ החתימות הקנוניות של ריפו **בלי גשר** — נמדדו בסבב 45 ונמצאו זהות
 *  בית-לבית בשלושה (hanhala · schar · gius) אחרי נרמול הזהות. ⛔ ריפו
 *  שהוכרז חסר-גשר חייב לשאת אותן, אחרת השלושה יכולים להיסחף זה מזה
 *  בשקט — בדיוק מה שכלל ברזל 14 אוסר.                                  */
const MANIFEST_SHA_NO_BRIDGE = '5689f6b481333147';
const GRADLE_SHA_NO_BRIDGE   = '9cbf35bb88e9b753';

/*  ⭐ הסופרסט הקנוני (סבב 45) — יושר לערך של gius, שהיה הרחב מבין
 *  השניים. ⚠️ הכיוון הוא הוספה ולא גריעה: `configChanges` חסר פירושו
 *  שאנדרואיד **הורס ובונה מחדש את ה-Activity** בסיבוב מסך או בפיצול
 *  חלון, וה-WebView נטען מאפס — כלומר טופס שהמשתמש באמצע מילויו נמחק.  */
const CONFIG_CHANGES =
  'orientation|screenSize|keyboardHidden|screenLayout|smallestScreenSize';

let failures = 0;
const fail = (m) => { failures++; console.error('❌ ' + m); };
const pass = (m) => console.log('✅ ' + m);
const skip = (m) => console.log('⏭️  ' + m);

for (const p of [MANIFEST, GRADLE]) {
  if (!fs.existsSync(join(ROOT, p))) { fail(`${p} אינו קיים — אין שכבת אנדרואיד`); process.exit(1); }
}
const manifestSrc = fs.readFileSync(join(ROOT, MANIFEST), 'utf8');
const gradleSrc   = fs.readFileSync(join(ROOT, GRADLE),   'utf8');

/*  ⚠️ טוקניזציה ולא ביטוי רגולרי על `//` (סבב 45) — הלקח של
 *  `check-comments.mjs`: כל URL מכיל `//`, ומחרוזת שמכילה אותו הייתה
 *  נקראת כתחילת הערה ושארית השורה הייתה נבלעת. ההליכה כאן היא תו-תו,
 *  עם מצב מחרוזת.                                                      */
function stripGradleComments(text) {
  let out = '', i = 0; const n = text.length;
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; out += c; i++;
      while (i < n && text[i] !== q) { if (text[i] === '\\') { out += text[i]; i++; } out += text[i]; i++; }
      out += q; i++; continue;
    }
    out += c; i++;
  }
  return out;
}

function normGradle(text) {
  return stripGradleComments(text)
    .replace(/\bnamespace\s+["'][^"']*["']/g,     'namespace §')
    .replace(/\bapplicationId\s+["'][^"']*["']/g, 'applicationId §')
    .replace(/\bversionCode\s+\d+/g,              'versionCode §')
    .replace(/\bversionName\s+["'][^"']*["']/g,   'versionName §')
    .replace(/\s+/g, ' ').trim();
}

/*  ⚠️ במניפסט ביטוי רגולרי **כן** בטוח, וזה נימוק ולא הרגל: `<!--` אינו
 *  יכול להופיע בתוך ערך מאפיין — XML אוסר `<` גולמי שם — ולכן אין כאן
 *  את דו-המשמעות מחרוזת/הערה שהכריחה טוקניזציה ב-JS.                   */
function normManifest(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/android:label\s*=\s*"[^"]*"/g, 'android:label="§"')
    .replace(/\s+/g, ' ').trim();
}

/*  ⭐ הפשטת גשר השיתוף — היפוך ברירת המחדל (סבב 46ב).
 *  ⚠️ **מה שהיה חסר עד כאן:** ליומן חתימה **משלה**, ואין לה מול מה
 *  להישמר — שורה שנוספה שם לבדה (הרשאה, `configChanges` אחר, כל דבר)
 *  הזיזה את החתימה, סשן עדכן את `APP.manifestSha`, והשער אישר.
 *  ⛔ כלומר ההפרש היה **מוצהר** («זה הגשר») ולא **מדוד**.
 *  ⭐ מעכשיו שני בלוקי הגשר מופשטים החוצה, ו**ארבעת הריפו** חייבים לשאת
 *  את החתימה הקנונית של חסרי-הגשר. ⛔ מה שנשאר פרטי הוא הגשר ותו לא —
 *  כל שאר הקובץ משותף, וזו ההגדרה של ההיפוך.                           */
function stripBridgeManifest(text) {
  return text
    .replace(/<queries>[\s\S]*?<\/queries>/g, '')
    .replace(/<provider[\s\S]*?<\/provider>/g, '');
}
function stripBridgeGradle(text) {
  return stripGradleComments(text).replace(/\bdependencies\s*\{[\s\S]*?\n\}/g, '');
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/* ── א. חוזה שכבת האנדרואיד ─────────────────────────────────────────────────
 *  מה שכל מעטפת בארגון מכריזה, ולמה. ⛔ שורה שיורדת מכאן היא יכולת או
 *  הרשאה שנעלמה מריפו אחד בשקט — כלומר בדיוק מה שהשער בא לתפוס.        */
const CONTRACT = [
  { name: 'הרשאת INTERNET',
    re: /android\.permission\.INTERNET/,
    why: 'המעטפת טוענת את האתר מהרשת — בלעדיה היא עולה ריקה' },
  { name: 'הרשאת ACCESS_NETWORK_STATE',
    re: /android\.permission\.ACCESS_NETWORK_STATE/,
    why: '`navigator.onLine` נשען עליה, וכל מנגנון ה-⏳ נשען עליו' },
  { name: 'usesCleartextTraffic=false',
    re: /android:usesCleartextTraffic\s*=\s*"false"/,
    why: '⛔ הדף נטען ב-https בלבד; פתיחת http הייתה פותחת אותו לזיהום בדרך' },
  { name: 'supportsRtl=true',
    re: /android:supportsRtl\s*=\s*"true"/,
    why: 'ארבע האפליקציות עבריות; בלעדיה המערכת מיישרת את המעטפת לשמאל' },
  { name: 'ה-Activity מיוצאת (LAUNCHER)',
    re: /android:exported\s*=\s*"true"/,
    why: 'בלעדיה אין אייקון בלאנצ׳ר, ומ-API 31 הבנייה עצמה נכשלת' },
];
for (const c of CONTRACT) {
  if (c.re.test(manifestSrc)) pass(`חוזה: ${c.name}`);
  else fail(`חוזה: ${c.name} — חסר מ-${MANIFEST}. ${c.why}`);
}

const ccFound = /android:configChanges\s*=\s*"([^"]*)"/.exec(manifestSrc);
if (!ccFound) fail(`configChanges חסר מ-${MANIFEST} — סיבוב מסך יהרוס את ה-Activity ויטען את ה-WebView מאפס`);
else if (ccFound[1] !== CONFIG_CHANGES) {
  fail(`configChanges הוא «${ccFound[1]}» ולא הסופרסט הקנוני «${CONFIG_CHANGES}» — ` +
       'זו בדיוק האסימטריה שסבב 45 יישר');
} else pass('configChanges הוא הסופרסט הקנוני');

/*  ⛔ מספר סבב בהערת `build.gradle` — היסטוריית גרסאות (סבב 68, כלל ברזל 21).
 *  ⚠️ נמדד: 6 · 4 · 4 · 6 אזכורים בארבעתן, ⛔ ובלוק ההערות ביומן מנה עד
 *  סבב 7 ⛔ ולא כלל 8–13 — כלומר מקור אמת שני שכבר נסחף. ⛔ ההיסטוריה
 *  יושבת בטבלה שב-`android/README.md`, שהיא מה שהשער אוכף. */
{
  const hist = gradleSrc.split('\n')
    .filter((l) => /^\s*\/\/\s*\d+\s*=\s*סבב/.test(l));
  (hist.length === 0 ? pass : fail)(
     '⛔ אין שורת היסטוריית-גרסאות בהערות `build.gradle` — ההיסטוריה ב-android/README.md'
     + (hist.length ? ` (נמצאו ${hist.length})` : ''));
  /*  ⭐ מוטציה — ⛔ שורת היסטוריה שחוזרת מפילה את הטענה. */
  (/^\s*\/\/\s*\d+\s*=\s*סבב/m.test('        // 7 = סבב 57 — הסרת דגל.') ? pass : fail)(
     '⛔ מוטציה: החזרת שורת «N = סבב M» מפילה את הטענה שמעליה');
  /*  ⭐ מוטציית-נגד — ⛔ הערה שמזכירה סבב **בלי** תבנית ההיסטוריה
   *  (כמו «⛔ … (סבב 46ב) — הנימוק», שתקן ההערות דורש) אינה מפילה. */
  (!/^\s*\/\/\s*\d+\s*=\s*סבב/m.test('        // ⛔ versionCode לעולם אינו יורד (סבב 46ב) — הנימוק') ? pass : fail)(
     '⭐ מוטציית-נגד: ⛔ עם מספר סבב בתבנית תקן ההערות ⛔ אינו נספר כהיסטוריה');
}

/* ── גשר השיתוף — שלושת רכיביו, יחד או בכלל לא ──────────────────────────────
 *  ⛔ שלושתם הוסרו מ-gius באותו קומיט בסבב 41 מפני שהסרת אחד מהם לבדו
 *  שוברת את ה-APK בהתקנה. הבדיקה כאן דורשת אותם כקבוצה.               */
const BRIDGE = [
  { name: '<queries> להתרת resolveActivity',   ok: /<queries>/.test(manifestSrc) },
  { name: '<provider> של FileProvider',        ok: /androidx\.core\.content\.FileProvider/.test(manifestSrc) },
  { name: 'תלות androidx בקובץ הבנייה',        ok: /androidx/.test(stripGradleComments(gradleSrc)) },
];
for (const b of BRIDGE) {
  if (APP.shareBridge && !b.ok) {
    fail(`הגשר מוצהר ב-APP אך ${b.name} חסר — שלושת רכיבי הגשר הם קבוצה אחת`);
  } else if (!APP.shareBridge && b.ok) {
    fail(`אין גשר מוצהר ב-APP אך ${b.name} קיים — ⛔ אין לתת גשר מקורי לדף ` +
         'שנטען מהרשת בלי צורך, ורכיב יתום כאן הוא בדיוק מה שנמדד והוסר בסבבים 41 ו-45');
  }
}
pass(APP.shareBridge ? 'גשר השיתוף מוצהר, ושלושת רכיביו קיימים'
                     : 'אין גשר מוצהר, ואף אחד משלושת רכיביו אינו קיים');

/* ── ב+ג. שתי החתימות ──────────────────────────────────────────────────── */
const checkSha = (label, text, want, canon) => {
  const got = sha(text);
  if (got !== want) {
    fail(`${label}: החלק המשותף אינו תואם לחתימה — ${got} במקום ${want}. ` +
         'שינוי מכוון = עדכון בארבעת הריפו ובארבעת עותקי הבדיקה, באותו סבב');
    return;
  }
  if (!APP.shareBridge && got !== canon) {
    fail(`${label}: הריפו מוצהר חסר-גשר אך חתימתו (${got}) אינה הקנונית (${canon}) — ` +
         'שלושת חסרי-הגשר חייבים להיות זהים בית-לבית');
    return;
  }
  pass(`${label}: תואם לחתימה (${got})` + (APP.shareBridge ? ' — חריגת הגשר המדודה' : ''));
};
const mNorm = normManifest(manifestSrc);
const gNorm = normGradle(gradleSrc);
checkSha('חתימת המניפסט',    mNorm, APP.manifestSha, MANIFEST_SHA_NO_BRIDGE);
checkSha('חתימת קובץ הבנייה', gNorm, APP.gradleSha,   GRADLE_SHA_NO_BRIDGE);

/* ── ב2+ג2. ⭐ החתימה חסרת-הגשר — נאכפת בארבעתן (סבב 46ב) ────────────────────
 *  ⛔ ריפו שההפרש שלו מהשלושה אינו **בדיוק** גשר השיתוף נופל כאן, גם
 *  כשחתימתו הפרטית עודכנה. זה מה שהופך את «חריגה מדודה» למדידה.       */
const bare = (label, stripped, canon) => {
  const got = sha(stripped);
  if (got === canon) pass(`${label} ללא הגשר: תואם לקנונית (${got})`);
  else fail(`${label} ללא הגשר: ${got} במקום הקנונית ${canon} — ⛔ ההפרש בין ` +
            'הריפו הזה לשלושת האחרים אינו גשר השיתוף בלבד. כל שורה אחרת חייבת ' +
            'להיות זהה בארבעתן, או מוכרזת פרטית עם נימוק (כלל ברזל 14)');
};
const bareM = normManifest(stripBridgeManifest(manifestSrc));
const bareG = normGradle(stripBridgeGradle(gradleSrc));
bare('חתימת המניפסט',     bareM, MANIFEST_SHA_NO_BRIDGE);
bare('חתימת קובץ הבנייה', bareG, GRADLE_SHA_NO_BRIDGE);

/* ── ד. מוטציות ─────────────────────────────────────────────────────────────
 *  ⛔ רצות על עותק **בזיכרון** ולא על העץ (הלקח של סבב 42ג) — מוטציה
 *  שנכתבת לקובץ האמיתי ומוחזרת ב-`finally` מותירה את הריפו שבור אם
 *  התהליך נהרג באמצע.                                                   */
const mut = (label, before, after, shouldDiffer) => {
  if ((before !== after) === shouldDiffer) pass(`מוטציה: ${label}`);
  else fail(`מוטציה: ${label} — ` +
            (shouldDiffer ? 'החתימה לא השתנתה, כלומר השדה אינו נאכף'
                          : 'החתימה השתנתה, כלומר השדה אינו מנורמל החוצה'));
};
/* ⭐ מה ש**כן** נאכף — שינוי בו חייב להזיז את החתימה. */
mut('configChanges שנסחף מפיל את חתימת המניפסט',
    mNorm, normManifest(manifestSrc.replace(CONFIG_CHANGES, 'orientation|screenSize')), true);
mut('הרשאה שנמחקה מפילה את חתימת המניפסט',
    mNorm, normManifest(manifestSrc.replace(/\s*<uses-permission[^>]*ACCESS_NETWORK_STATE[^>]*\/>/, '')), true);
mut('תלות שנוספה מפילה את חתימת קובץ הבנייה',
    gNorm, normGradle(gradleSrc.replace(/\bcompileSdk 34/, "compileSdk 34\n    // x\n    implementation 'x:y:1'")), true);
/* ⭐ ומה ש**מנורמל החוצה** — שינוי בו ⛔ אינו רשאי להזיז אותה. */
mut('שם האפליקציה אינו בחתימת המניפסט',
    mNorm, normManifest(manifestSrc.replace(/android:label="[^"]*"/, 'android:label="שם אחר"')), false);
mut('הערה אינה בחתימת המניפסט',
    mNorm, normManifest(manifestSrc.replace('<manifest ', '<!-- הערה חדשה -->\n<manifest ')), false);
mut('versionCode אינו בחתימת קובץ הבנייה',
    gNorm, normGradle(gradleSrc.replace(/versionCode \d+/, 'versionCode 999')), false);
mut('מזהה החבילה אינו בחתימת קובץ הבנייה',
    gNorm, normGradle(gradleSrc.replace(/applicationId\s+"[^"]*"/, 'applicationId "com.x.y"')), false);
mut('הערה אינה בחתימת קובץ הבנייה',
    gNorm, normGradle(gradleSrc.replace('plugins {', '// הערה חדשה\nplugins {')), false);

/* ⭐ מוטציות ההיפוך (סבב 46ב) — מה שמופשט החוצה, ומה שדווקא לא. */
mut('הרשאה שנוספה בריפו אחד מפילה את החתימה חסרת-הגשר',
    bareM, normManifest(stripBridgeManifest(manifestSrc.replace('<application',
      '<uses-permission android:name="android.permission.CAMERA" />\n    <application'))), true);
mut('בלוק גשר שנוסף למניפסט ⛔ אינו מזיז את החתימה חסרת-הגשר',
    bareM, normManifest(stripBridgeManifest(manifestSrc.replace('</application>',
      '<provider android:name="x"><meta-data android:name="y" /></provider>\n    </application>'))), false);
mut('שדה שנוסף לקובץ הבנייה מפיל את החתימה חסרת-הגשר',
    bareG, normGradle(stripBridgeGradle(gradleSrc.replace(/\bcompileSdk 34/,
      "compileSdk 34\n    buildToolsVersion '34.0.0'"))), true);
mut('בלוק dependencies שנוסף ⛔ אינו מזיז את החתימה חסרת-הגשר',
    bareG, normGradle(stripBridgeGradle(gradleSrc +
      "\ndependencies {\n    implementation 'a:b:1'\n}\n")), false);

/* ── ה. מוטציות על שער ה-versionCode (סבב 45ב) ──────────────────────────────
 *  ⚠️ **למה כאן ולא בשער ה-`versionCode` עצמו:** הוא נשען על
 *  `origin/main` דרך git, ולכן מוטציה עליו אינה יכולה לרוץ «בזיכרון»
 *  כמו מוטציות החתימה שלמעלה — היא חייבת עץ עם git. ⛔ ולא על העץ
 *  האמיתי (הלקח של סבב 42ג): הרתמה בונה **ריפו git זמני** משלה, מריצה
 *  בו את השער האמיתי, ומוחקת אותו.
 *
 *  ⭐ **וזו מוטציה על השער ולא על הקוד** — היא מוכיחה שהשער **נופל**
 *  כשהמעטפת השתנתה בלי קידום, ולא רק שהוא עובר כשהכול תקין. ⛔ שער
 *  שאיש לא ראה אותו נכשל אינו שער.                                      */
const RUN_MUT = process.env.R45_NO_MUT !== '1';
if (!RUN_MUT) skip('מוטציות שער ה-versionCode מדולגות (R45_NO_MUT=1)');
else {
  const tmp = fs.mkdtempSync(join(os.tmpdir(), 'r45gate-'));
  const g = (args, cwd) => execFileSync('git', ['-C', cwd, ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const put = (rel, txt) => {
    const dst = join(tmp, rel);
    fs.mkdirSync(dirname(dst), { recursive: true });
    fs.writeFileSync(dst, txt);
  };
  /* עץ מינימלי: השער, קובץ הבנייה, המניפסט, וטבלת ה-README. */
  const readmeSrc = fs.readFileSync(join(ROOT, 'android/README.md'), 'utf8');
  const seed = () => {
    put('tools/test_bump.mjs',
        fs.readFileSync(join(ROOT, 'tools/test_bump.mjs'), 'utf8'));
    put(GRADLE, gradleSrc);
    put(MANIFEST, manifestSrc);
    put('android/README.md', readmeSrc);
  };
  const runGate = () => {
    try {
      execFileSync(process.execPath, [join(tmp, 'tools/test_bump.mjs')],
                   { encoding: 'utf8', stdio: 'pipe',
                     env: { ...process.env, BUMP_GATE_ONLY: '1' } });
      return 0;
    } catch (e) { return e.status === undefined ? -1 : e.status; }
  };
  const gateMut = (label, mutate, wantFail) => {
    fs.rmSync(join(tmp, 'android'), { recursive: true, force: true });
    seed();
    mutate();
    const code = runGate();
    if ((code !== 0) === wantFail) pass(`מוטציית שער: ${label}`);
    else fail(`מוטציית שער: ${label} — השער החזיר ${code}, ` +
              (wantFail ? 'כלומר הוא אינו תופס את הסטייה' : 'כלומר הוא נופל על מצב תקין'));
  };
  try {
    seed();
    g(['init', '-q'], tmp);
    g(['add', '-A'], tmp);
    execFileSync('git', ['-C', tmp, '-c', 'user.email=t@t', '-c', 'user.name=t',
                         'commit', '-q', '-m', 'base'], { stdio: 'ignore' });
    g(['update-ref', 'refs/remotes/origin/main', 'HEAD'], tmp);

    gateMut('עץ נקי מול origin/main — השער עובר', () => {}, false);
    gateMut('שינוי במניפסט בלי קידום versionCode מפיל',
            () => put(MANIFEST, manifestSrc.replace('<manifest ', '<!-- שינוי -->\n<manifest ')), true);
    gateMut('שינוי במניפסט **עם** קידום versionCode עובר', () => {
      put(MANIFEST, manifestSrc.replace('<manifest ', '<!-- שינוי -->\n<manifest '));
      const next = Number(/^\s*versionCode\s+(\d+)\s*$/m.exec(gradleSrc)[1]) + 1;
      put(GRADLE, gradleSrc.replace(/^(\s*)versionCode\s+\d+\s*$/m, `$1versionCode ${next}`));
      put('android/README.md',
          readmeSrc.replace(/^(\|\s*\*\*versionCode\*\*\s*\|\s*)\d+/m, `$1${next}`));
    }, false);
    gateMut('קובץ `.md` תחת android/ בלבד ⛔ אינו דורש קידום',
            () => put('android/README.md', readmeSrc + '\n<!-- שורה חדשה -->\n'), false);
    gateMut('נסיגה ב-versionCode מפילה',
            () => put(GRADLE, gradleSrc.replace(/^(\s*)versionCode\s+(\d+)\s*$/m,
                        (_, s, n) => `${s}versionCode ${Math.max(1, Number(n) - 1)}`)), true);
    gateMut('versionCode מתועד שנסחף מפיל',
            () => put('android/README.md',
                      readmeSrc.replace(/^(\|\s*\*\*versionCode\*\*\s*\|\s*)\d+/m, '$1999')), true);
    gateMut('שורת ה-versionCode שנמחקה מהטבלה מפילה',
            () => put('android/README.md',
                      readmeSrc.replace(/^\|\s*\*\*versionCode\*\*\s*\|.*$/m, '| **x** | y |')), true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ── ⛔ אין נכסים מוטבעים — מוטציה על העץ (סבב 72) ───────────────────────────
 *  ⚠️ ה-probe שבטבלה מאמת **היעדר**, ⛔ וטענת-היעדר עוברת גם כשהיא אינה
 *  מסוגלת ליפול. ⭐ המוטציה מניחה `index.html` תחת `assets/` ודורשת
 *  ש-`check-capabilities` ייפול, ⛔ ומוטציית-הנגד מניחה שם קובץ אחר
 *  ודורשת שלא ייפול — כלומר נמדד **מה** מוטבע ולא **שהתיקייה ריקה**. */
{
  const ASSETS = 'android/app/src/main/assets';
  const run = (dir) => execFileSync(process.execPath,
      [join(dir, 'tools', 'check-capabilities.mjs')],
      { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
  const assetMut = (label, rel, wantFail) => {
    const d = fs.mkdtempSync(join(os.tmpdir(), 'r72-assets-'));
    try {
      fs.cpSync(ROOT, d, { recursive: true,
                           filter: (s) => !s.split('/').includes('.git') });
      fs.mkdirSync(join(d, ASSETS), { recursive: true });
      fs.writeFileSync(join(d, ASSETS, rel), '<!-- מוטציה -->\n');
      let fell = false;
      try { run(d); } catch (e) { fell = true; }
      if (fell === wantFail) pass(label);
      else fail(`${label} — נמדד ${fell ? 'נפל' : 'עבר'} והצפוי ` +
                `${wantFail ? 'נפל' : 'עבר'}. בודקים את ה-probe של שורה 82`);
    } finally { fs.rmSync(d, { recursive: true, force: true }); }
  };
  assetMut('⛔ מוטציה: `index.html` תחת `assets/` מפיל את שורה 82', 'index.html', true);
  assetMut('⭐ מוטציית-נגד: קובץ אחר תחת `assets/` ⛔ אינו מפיל — נמדד מה מוטבע',
           'fonts.txt', false);
}

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער שכבת האנדרואיד`
                     : `\n✅ ${APP.app}: שער שכבת האנדרואיד עבר`);
process.exit(failures ? 1 : 0);
