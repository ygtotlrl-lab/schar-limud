/* ───────────────────────────────────────────────────────────────────────────
   test_secrets.mjs — אין סוד בקובץ שנדחף
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** ⛔ **סריקה הפוכה** — ⚠️ כל קובץ במעקב תחת `signing/` מוצהר,
   ⛔ ואפס קובץ מפתח במעקב בכל העץ · ⚠️ וכל מחרוזת שנראית כאישור **מפילה
   אלא אם היא מוכרזת עם נימוקה**: ⭐ ערך שיושב ליד מילת מפתח, ⛔ או רצף ארוך
   שמערב אותיות גדולות, קטנות וספרות. ⛔ **ו-`.gitignore` חוסם את המפתח**.

   **הנימוק המדוד:** חמשת הריפו פומביים — ⚠️ ובכל אחד ישבו קובץ מפתח מחויב
   ומילת המעבר שלו בטקסט גלוי: ⭐ ומי שמחזיק את שניהם חותם APK שאנדרואיד
   מקבל כעדכון לגיטימי ⛔ ומחליף את האפליקציה במכשיר.

   **מה יישבר בלעדיו:** ⛔ סוד **מסוג שלא חשבנו עליו** — ⚠️ טוקן חדש, מפתח
   API, כתובת webhook: ⭐ רשימת דפוסים שמחפשת את מה שכבר ידוע מוצאת את מה
   שכבר תוקן, ⛔ והסריקה ההפוכה היא שורת הניקוי עצמה.

   **מה אינו נאכף כאן:** ⛔ קובץ בינארי — ⚠️ הוא אינו טקסט, ⭐ ומה שנמדד בו
   הוא **הימצאותו במעקב** · ⛔ ומטען `data:` — ⚠️ הוא נכס שנצרב ולא הגדרה,
   ⭐ והוא נמדד בשורת הסגנון המוטבע · ⛔ וקובץ שאינו במעקב, ⚠️ שאינו נדחף:
   ⭐ עותק מקומי של המפתח הוא בדיוק מה ש-`.gitignore` מתיר.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import fs from 'node:fs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ ההכרזות — ⚠️ **מה נכנס**: `file` · `anchor` — מחרוזת שחיה בשורה
   *  עצמה — ו-`why`, מה הערך **הוא** ולמה אינו סוד; ⛔ **ומה מפיל**:
   *  אתר חשוד שאינו כאן, ⛔ והכרזה שאין לה אתר. ⭐ **ולמה עוגן ולא
   *  מספר שורה**: מספר זז בכל עריכה, ⛔ והכרזה שזזה מכסה שורה אחרת.
   *  ⚠️ **וההיעדר מוצהר ריק** ⛔ ואינו נשמט. */
  secretAllow: [
    /*  ⭐ **שם** הסוד ⛔ ולא ערכו — ⚠️ הוא מה שה-workflow מבקש מ-GitHub Secrets, ⛔ והוא ציבורי מעצם טבעו: ⭐ הערך עצמו לעולם אינו בעץ */
    { file: "android/README.md", anchor: "KEYSTORE_B64" },
    /*  ⭐ מפתח ה-`anon` של Supabase — ⛔ הוא נועד לרוץ בדפדפן ומוגש עם הדף בכל טעינה: ⚠️ הגבול הוא RLS וההרשאות שבמסד, ⛔ ולא סודיות המפתח */
    { file: "index.html", anchor: "xbtskqobynewvnckaaz.supabase.co','" },
    /*  ⭐ שם האלגוריתם שמועבר ל-`importKey` — ⛔ ולא ערך: ⚠️ מה שנגזר הוא הטביעה, והחומר שנכנס הוא מה שהמשתמש הקליד */
    { file: "index.html", anchor: "'PBKDF2'" },
    /*  ⭐ חתימת התוכן של המפתח — ⛔ היא **זהותו** ואינה פותחת אותו: ⚠️ היא מודפסת מכל APK חתום, ⛔ ושער שנופל עליה חוסם את השורה שדורשת אותה */
    { file: "tools/check-capabilities.mjs", anchor: "keystoreSha:" },
    /*  ⭐ מזהה מכשיר סינתטי בקבוע בדיקה — ⛔ אין לו מקבילה במסד ולא באחסון של אף מכשיר: ⚠️ הוא הקלט של המוטציה ושל מוטציית-הנגד */
    { file: "tools/test_devid.mjs", anchor: "APP.deviceKey" },
    /*  ⭐ שם פונקציית האורקל שגוזרת את הטביעה בבדיקה — ⛔ ולא ערך: ⚠️ הסיסמה שלצידה היא קבוע בדיקה, ולא אישור של איש */
    { file: "tools/test_offline_login.mjs", anchor: "oraclePbkdf2(" },
    /*  ⭐ שם מפתח גיבוי בקבוע בדיקה — ⛔ ולא אישור: ⚠️ הוא נבחר כדי ליפול תחת תבנית `PRE_*` שהפינוי אינו נוגע בה */
    { file: "tools/test_stage_a.mjs", anchor: "PRE_SYNC_UNIFY_k1" },
    /*  ⭐ שם הרשומה בטבלת המעקב של המסד — ⛔ ואינו אישור: ⚠️ הוא שם מיגרציה שרצה, ⭐ והוא מודפס בכל `select` מטבלת המעקב */
    { file: "tools/test_mignames.mjs", anchor: "sl_019_client_id_is_the_key" },
  ],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [200];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ חמש הטענות מודדות את אותו סט קבצים
 *  בכולן, ⭐ ומספרן אינו תלוי במה שיש באפליקציה. */
const FLOOR = { shared: 5, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה שמבדיל
 *  ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ פחות מהמוצהר הוא ריצה חלקית,
 *  ⛔ ויותר ממנו הוא ריצפה מיושנת: ⭐ ריצפה שאינה מתעדכנת מפסיקה למדוד
 *  את מה שנוסף. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  if (PRE_MUT === 0 && process.env.GATE_MUT !== '1') {
    console.log(`⏭ ${GATE_ID}: כל גופו רץ ברמה המלאה — לא נמדד כאן`);
    return;
  }
  const N = PRE_MUT || RAN;
  console.log(`רצו ${N} מתוך ${EXPECTED}`);
  if (N < EXPECTED) {
    console.error(`❌ ${GATE_ID}: רצו ${N} טענות מתוך ${EXPECTED} מוצהרות — ` +
      'מה עושים: ודא `await` בקריאה הראשית, ⛔ ויציאה שאינה קודמת להמתנה.');
    process.exitCode = 1;
  } else if (N > FLOOR_MAX) {
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — ` +
      'עדכן את `FLOOR`.');
    process.exitCode = 1;
  }
});
const t = (n, cond, m) => { RAN++; if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

/*  ⛔ מה שמותר לשבת ב-`signing/` — ⚠️ **מה נכנס**: שם קובץ; ⛔ **ומה
 *  מפיל**: כל שם אחר שנמצא במעקב. ⭐ **ולמה הרשימה ולא דפוס**: דפוס
 *  שאוסר `*.keystore` מתיר `key.bin`, ⚠️ והסריקה ההפוכה אינה מנחשת
 *  את הסיומת הבאה. */
const SIGNING_OK = ['sign-apk.sh'];

/*  ⛔ קובץ בינארי אינו נסרק כטקסט — ⚠️ רצף הבתים שלו מייצר רעש בכל דפוס,
 *  ⭐ ומה שנמדד בו הוא **הימצאותו במעקב** ⛔ ולא תוכנו. */
const BINARY = /\.(png|jpg|jpeg|gif|webp|ico|svg|keystore|jks|apk|zip|pdf|woff2?|ttf|eot)$/i;

/*  ⛔ סיומות המפתח — ⚠️ **מה נכנס**: סיומת; ⛔ **ומה מפיל**: קובץ במעקב
 *  שנושא אותה. ⭐ **ולמה כאן**: המפתח חי ב-GitHub Secrets ונמשך בזמן
 *  בנייה, ⛔ וקובץ מחויב בריפו פומבי הוא קובץ ציבורי. */
const KEY_EXT = /\.(keystore|jks|p12|pfx|pem)$/i;

/*  ⛔ מילות המפתח — ⚠️ הן **מאתרות את ההקשר** ⛔ ואינן מזהות את הסוד:
 *  ⭐ מה שמפיל הוא הערך שיושב לידן, ⚠️ ולא השם עצמו. */
const KW = /storepass|keypass|passphrase|password|api[_-]?key|credential|secret|token|pass|pwd|key/gi;
/*  ⛔ ערך ⛔ ולא מילה בפרוזה — ⚠️ הוא בגרשיים או אחרי `=`/`:`: ⭐ «הסיסמה
 *  נגזרת ב-PBKDF2» הוא הסבר, ⛔ ומילת מפתח שאחריה ערך היא ערך. */
const VALUE = /(?:["'`]([A-Za-z0-9_]{6,})["'`]|[=:]\s*([A-Za-z0-9_]{6,}))/g;
/*  ⛔ ומילת מפתח שהיא **דגל** נושאת את ערכה אחרי רווח — ⚠️ זו אותה צורה
 *  בדיוק, ⭐ והמפריד הוא רווח ולא `=`: ⛔ בלי זה שורת הפעלה שמעבירה את
 *  הסוד בשורת הפקודה עוברת בשקט. */
const VALUE_FLAG = /(?:["'`]([A-Za-z0-9_]{6,})["'`]|[=:]\s*([A-Za-z0-9_]{6,})|\s+([A-Za-z0-9_]{6,}))/g;
/*  ⛔ רצף ארוך שמערב שלוש משפחות תווים — ⚠️ זה מה שמבדיל אישור מטקסט:
 *  ⭐ חתימת `sha256` היא ספרות ואותיות קטנות בלבד, ⛔ וטוקן אינו. */
const LONG = /[A-Za-z0-9_]{24,}/g;

const mixed = (s) => /[A-Za-z]/.test(s) && /[0-9]/.test(s);
const diverse = (s) => /[a-z]/.test(s) && /[A-Z]/.test(s) && /[0-9]/.test(s);
/*  ⛔ מטען `data:` נחתך לפני המדידה — ⚠️ הוא נכס שנצרב לתמונה ⛔ ולא
 *  הגדרה: ⭐ בלי החיתוך אריח אחד מייצר אלפי התאמות, ⚠️ והשער מפסיק
 *  להיות קריא. */
const stripData = (l) => l.replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/gi, 'data:');

/*  ⛔ הליבה — פונקציה טהורה על טקסט, ⚠️ כדי שהמוטציה תרוץ בזיכרון
 *  ⛔ ולא על העץ. ⭐ מחזירה אתר לכל שורה חשודה, ⚠️ ולא לכל אסימון:
 *  ⛔ שורה אחת שנושאת שלושה מקטעים של אותו אישור היא אתר אחד. */
function credLines(rel, text) {
  const out = [];
  text.split('\n').forEach((raw, i) => {
    const line = stripData(raw);
    let hit = '';
    KW.lastIndex = 0;
    for (const k of line.matchAll(KW)) {
      const at = k.index + k[0].length;
      const win = line.slice(at, at + 40);
      const re = line[k.index - 1] === '-' ? VALUE_FLAG : VALUE;
      for (const v of win.matchAll(re)) {
        const tok = v[1] || v[2] || v[3];
        if (mixed(tok)) { hit = hit || tok; }
      }
    }
    if (!hit) for (const tok of line.match(LONG) || []) if (diverse(tok)) { hit = tok; break; }
    if (hit) out.push({ file: rel, line: i + 1, token: hit });
  });
  return out;
}

/*  ⛔ הכרזה מכסה אתר כשהיא נוקבת בקובץ **ובעוגן שחי בשורה** — ⚠️ ולא
 *  במספר השורה: ⭐ מספר שורה זז בכל עריכה, ⛔ והעוגן הוא מה שמזהה את
 *  האתר עצמו. */
const covers = (a, site, text) =>
  a.file === site.file &&
  (text.split('\n')[site.line - 1] || '').indexOf(a.anchor) >= 0;

/*  ⛔ קובץ מפתח נמדד בסט **שבמעקב** ⛔ ולא על הדיסק — ⚠️ עותק מקומי
 *  מוחרג ב-`.gitignore` והוא מה שמאפשר חתימה ביד: ⭐ מה שמפיל הוא מה
 *  שנדחף. */
function keyFiles(files) { return files.filter((f) => KEY_EXT.test(f)); }
function signingGaps(files) {
  return files.filter((f) => f.indexOf('signing/') === 0)
              .filter((f) => SIGNING_OK.indexOf(f.slice('signing/'.length)) < 0);
}

/* ── הריצה האמיתית ─────────────────────────────────────────────────────── */
/*  ⛔ הסט נקרא מ-git ⛔ ולא מהדיסק — ⚠️ זה מה שנדחף, ⭐ וזה מה שהופך
 *  קובץ לציבורי. */
/*  ⛔ ועץ שאין בו git מדווח «לא נמדד» ⛔ ואינו מפיל — ⚠️ שער הקריאה-בלבד
 *  מעתיק את העץ לתיקייה זמנית **בלי** `.git`, ⭐ ושם אין סט מעקב כלל:
 *  ⛔ נפילה שם הייתה אומרת «יש סוד», ⚠️ והיא אומרת «אין לי מה למדוד».
 *  ⛔ **ומצב הדיסק אינו תחליף** — ⚠️ העותק המקומי של המפתח יושב בעץ
 *  בכוונה, ⭐ והוא בדיוק מה ש-`.gitignore` מתיר: ⛔ סריקת דיסק הייתה
 *  מדווחת עליו כהפרה. */
let FILES;
try {
  FILES = execFileSync('git', ['-C', ROOT, 'ls-files'],
                       { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
            .split('\n').filter(Boolean);
} catch (_) { FILES = null; }
if (!FILES || !FILES.length) {
  console.log(`⏭️  ${GATE_ID}: אין סט מעקב — נמדדו ${FILES ? 0 : 'אין git'} קבצים ` +
              'והצפוי סט לא-ריק; מה עושים: מריצים בתוך עותק עבודה של git — ' +
              '⛔ מה שנדחף הוא מה שציבורי, ⚠️ ומצב הדיסק אינו אומר עליו דבר — ' +
              '⛔ ואף קובץ אינו נמדד כאן');
  process.exit(0);
}

let n = 1;
{
  const gaps = signingGaps(FILES);
  t(n++, gaps.length === 0,
    `[sec-signing] קובץ ב-signing/ שאינו מוצהר — נמדדו ${gaps.length} מתוך ` +
    `${FILES.filter((f) => f.indexOf('signing/') === 0).length} והצפוי 0` +
    (gaps.length ? ` (${gaps.join(' · ')})` : '') +
    '. מסירים אותו מהמעקב, או מוסיפים את שמו ל-SIGNING_OK בכל עותקי השער');
}
{
  const keys = keyFiles(FILES);
  t(n++, keys.length === 0,
    `[sec-keyfile] קובץ מפתח במעקב — נמדדו ${keys.length} והצפוי 0` +
    (keys.length ? ` (${keys.join(' · ')})` : '') +
    '. מסירים אותו מהמעקב — המפתח חי ב-GitHub Secrets ונמשך בזמן בנייה');
}

/*  ⛔ הטקסט נקרא פעם אחת ונשמר — ⚠️ שתי קריאות לאותו קובץ הן שתי
 *  הזדמנויות למדוד תוכן שונה. */
const TEXT = new Map();
for (const f of FILES) {
  if (BINARY.test(f)) continue;
  try { TEXT.set(f, readFileSync(join(ROOT, f), 'utf8')); } catch (e) {
    console.error(`  ⚠️  ${f} אינו נקרא כטקסט — ${e.code || e.message}`);
  }
}
const SITES = [];
for (const [f, txt] of TEXT) SITES.push(...credLines(f, txt));

{
  const bare = SITES.filter((s) => !APP.secretAllow.some((a) => covers(a, s, TEXT.get(s.file))));
  t(n++, bare.length === 0,
    `[sec-literal] מחרוזת שנראית כאישור ואינה מוכרזת — נמדדו ${bare.length} ` +
    `מתוך ${SITES.length} אתרים והצפוי 0` +
    (bare.length ? ` (${bare.slice(0, 6).map((s) => `${s.file}:${s.line}`).join(' · ')})` : '') +
    '. מסירים את הערך מהקובץ, או מכריזים ב-APP.secretAllow עם הנימוק למה אינו סוד');
}
{
  const stale = APP.secretAllow.filter((a) =>
    !SITES.some((s) => covers(a, s, TEXT.get(s.file))));
  t(n++, stale.length === 0,
    `[sec-stale] הכרזה שאין לה אתר — נמדדו ${stale.length} מתוך ` +
    `${APP.secretAllow.length} והצפוי 0` +
    (stale.length ? ` (${stale.map((a) => `${a.file}:${a.anchor}`).join(' · ')})` : '') +
    '. מסירים מ-APP.secretAllow הכרזה שהאתר שלה כבר אינו בעץ');
}
{
  /*  ⛔ ה-`.gitignore` הוא מה שמונע את החזרה — ⚠️ בלעדיו המפתח שנוצר
   *  לחתימה ביד חוזר למעקב ב-`git add .` הבא, ⭐ ואיש אינו מבחין. */
  let ign = '';
  try { ign = readFileSync(join(ROOT, '.gitignore'), 'utf8'); } catch (_) { ign = ''; }
  t(n++, /^\s*signing\/\*\.keystore\s*$/m.test(ign),
    '[sec-ignore] `.gitignore` חוסם `signing/*.keystore` — נמדד ' +
    `${/signing\/\*\.keystore/.test(ign) ? 'בצורה אחרת' : 'שאינו שם'} והצפוי השורה המדויקת. ` +
    'מוסיפים `signing/*.keystore` ל-.gitignore');
}

if (RUN_MUT) {
  mutStage();
  /* ── מוטציה א — קובץ מפתח שחזר למעקב **חייב** להיתפס ─────────────────── */
  /*  ⛔ המוטציה על **סט הקבצים** ⛔ ואינה נכתבת לעץ — ⚠️ הסט מועבר
   *  כארגומנט, ⭐ והמדידה היא אותה פונקציה בדיוק. */
  {
    const bent = FILES.concat(['signing/back.keystore']);
    t(n++, signingGaps(bent).length === 1 && keyFiles(bent).length === 1 &&
           signingGaps(FILES).length === 0 && keyFiles(FILES).length === 0,
      'מ1 · ⛔ מוטציה: קובץ מפתח ב-signing/ מפיל את «[sec-signing]» ואת ' +
      `«[sec-keyfile]» — נמדדו ${signingGaps(bent).length}/${keyFiles(bent).length} ` +
      'והצפוי 1/1 מול 0/0 בקו הבסיס');
  }
  /* ── מוטציה ב — ערך שהוצב במשתנה סוד **חייב** להיתפס ─────────────────── */
  {
    const bent = 'PASS=' + 'abc' + '123\n';
    const got = credLines('x.sh', bent);
    t(n++, got.length === 1,
      'מ2 · ⛔ מוטציה: ערך שהוצב במשתנה סוד מפיל את «[sec-literal] מחרוזת ' +
      `שנראית כאישור» — נמדדו ${got.length} אתרים והצפוי 1`);
  }
  /* ── מוטציה ג — טוקן שהודבק בהערה **חייב** להיתפס ────────────────────── */
  /*  ⛔ הטוקן נבנה מרצף ⛔ ואינו מוקלד — ⚠️ מחרוזת שנראית כאישור בקובץ
   *  השער היא בדיוק מה שהשער מפיל עליו, ⭐ והוא היה מפיל את עצמו. */
  {
    const tok = 'Ab3' + 'Cd7'.repeat(8);
    const got = credLines('x.mjs', '/* ' + tok + ' */\n');
    t(n++, got.length === 1 && got[0].token === tok,
      'מ3 · ⛔ מוטציה: טוקן שהודבק בהערה מפיל את «[sec-literal] מחרוזת ' +
      `שנראית כאישור» — נמדדו ${got.length} אתרים והצפוי 1`);
  }
  /* ── מוטציית-נגד — טביעת המפתח המוצהרת ⛔ אינה מפילה ──────────────────── */
  /*  ⛔ שינוי חי ⛔ ולא הערה — ⚠️ הטביעה היא **זהות** המפתח והיא ציבורית
   *  מעצם טבעה: ⭐ היא מודפסת מכל APK חתום, ⛔ ושער שנופל עליה חוסם את
   *  השורה שדורשת אותה. */
  {
    const line = "  keystoreSha: '29:F5:0B:29:60:79:0B:77:28:25:7C:88:79:12:31:28'," + '\n';
    const got = credLines('caps.mjs', line);
    t(n++, got.length === 0,
      'נ1 · ⭐ מוטציית-נגד: טביעת המפתח המוצהרת ⛔ אינה מפילה — ' +
      `נמדדו ${got.length} אתרים והצפוי 0`);
  }
}

console.log(`\n${fail ? '✗' : '✓'} ${APP.app} — אין סוד בקובץ שנדחף: ` +
            `${pass} טענות עברו, ${fail} נכשלו · ` +
            `${FILES.length} קבצים במעקב · ${TEXT.size} נסרקו כטקסט · ` +
            `${SITES.length} אתרים · ${APP.secretAllow.length} הכרזות`);
if (fail) process.exitCode = 1;
