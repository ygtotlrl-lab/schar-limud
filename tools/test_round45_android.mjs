#!/usr/bin/env node
/*  שער החתימה של שכבת האנדרואיד — סבב 45, כלל ברזל 14.
 *
 *  ⚠️ **הפער שנמדד בסבב 44:** `MainActivity.java` ו-`ShellActivity.java`
 *  חתומים מסבבים 40–41, אבל **שני הקבצים שקובעים איך ה-APK נבנה ומה
 *  אנדרואיד מרשה לו** — `AndroidManifest.xml` ו-`android/app/build.gradle` —
 *  לא נשאו שום חתימה. `test_round40_gradle.mjs` בודק את ה-`versionCode`
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
 *  באמת שער, `test_round40_gradle.mjs`.
 *
 *  ⭐ **וזו מדידה ולא הצהרה** (סבב 45): אחרי הנרמול שלושת הריפו
 *  חסרי-הגשר נושאים **חתימה זהה בדיוק** בשני הקבצים, ולריפו אחד —
 *  יומן — חתימה משלו. ⛔ וההפרש כולו נמדד ונמצא **בדיוק** `<queries>`
 *  + `<provider>` במניפסט ושתי תלויות ה-`androidx` בקובץ הבנייה, כלומר
 *  גשר השיתוף ותו לא. חריגה **מדודה**, לא סחיפה.
 *
 *  זהה בית-לבית בארבעת הריפו פרט לבלוק APP.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
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

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/* ── א. חוזה שכבת האנדרואיד ─────────────────────────────────────────────
 *  מה שכל מעטפת בארגון מכריזה, ולמה. ⛔ שורה שיורדת מכאן היא יכולת או
 *  הרשאה שנעלמה מריפו אחד בשקט.                                        */
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

/* ── גשר השיתוף — שלושת רכיביו, יחד או בכלל לא ──────────────────────────
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

/* ── ב+ג. שתי החתימות ───────────────────────────────────────────────────── */
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

/* ── ד. מוטציות ─────────────────────────────────────────────────────────
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

console.log(failures ? `\n❌ ${APP.app}: ${failures} כשלים בשער שכבת האנדרואיד`
                     : `\n✅ ${APP.app}: שער שכבת האנדרואיד עבר`);
process.exit(failures ? 1 : 0);
