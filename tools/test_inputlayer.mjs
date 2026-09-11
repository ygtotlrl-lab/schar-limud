/* ───────────────────────────────────────────────────────────────────────────
   test_inputlayer.mjs — שכבת הקלט והכניסה
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** דפוס אחד לשדה מספרי · ארבעת מאפייני שדה הסיסמה · קישור כל
   שדה קלט ל-`label` או ל-`aria-label` · מגן שליחה כפולה על פעולה שדורשת
   רשת · ⛔ ו-probe שמאמת נקודת כניסה **חיה** ⛔ ולא קיום פונקציה.

   **הנימוק המדוד:** מסך שינוי סיסמה סומן ✅ והיה **קוד מת**, ⛔ מפני
   שה-probe הסתפק בקיום השם.

   **מה יישבר בלעדיו:** ⛔ שדה קלט חדש נכתב בהעתקה משדה קיים, ⚠️ וכל אחד
   מארבעת המאפיינים יכול להישמט **בלי שדבר ייראה שונה על המסך**.

   **מה אינו נאכף כאן:** ⛔ ולידציית התוכן עצמה — ⚠️ מה נחשב מספר תקין הוא
   לוגיקה עסקית, ⭐ וכאן נמדדת **הצורה** בלבד.
   ──────────────────────────────────────────────────────────────────────── */


/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'index.html',
  /*  ⛔ אין כאן מגן שליחה כפולה, וזה נימוק ולא השמטה (סבב 67) — מסבב 12
   *  כל כתיבה כאן היא מקומית-תחילה (`slLocalWrite`) וחוזרת מיד; הדחיפה
   *  לענן היא `upsert` על `client_id`, כלומר אידמפוטנטית בהגדרה. */
  busyFn: 'busy',
  guardReason: null,
  /*  ⛔ שומר שיושב בנקודת הניתוב — ⚠️ ריק כאן: ⭐ המנתב קורא `fn(el)`
   *  ⛔ ואינו ממתין להבטחה, ⚠️ ולכן השומר היחיד הוא זה שבאתר הכתיבה. */
  routeGuard: 'הניתוב מנטרל את הכפתור כשהמטפל מחזיר הבטחה',
  guarded: [],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [83, 157, 78];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ הבודק קורא **קבצים** (סבב 67) — הוא מאמת שהקלט מוצהר נכון במקור,
 *  ⛔ ולא שהמקלדת שנפתחת במכשיר היא הנכונה. ⚠️ בדיקת מכשיר היא בדיקת עין
 *  ואין להציג את השער כראיה לה.                                         */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let pass = 0, failed = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בארבעת הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 6, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות (סבב 119) — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
/*  ⛔ הריצפה נמדדת בשני הכיוונים (סבב 118) — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד
 *  (סבב 119)** — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
 *  מוסיף אינו נספר בתקרה: ⛔ השהיה על הרמה המלאה כולה השאירה תשעה שערים
 *  בלי מדידה באף כיוון. ⚠️ ושער שמספרו משתנה גם בלי המוטציות מוכרז
 *  ב-`APP.floorRange` ומקבל את הטווח ב-`GATE_FLOOR_RANGE`. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  /*  ⚠️ שער שיובא לתהליך של שער אחר אינו סוגר — ⛔ הספירה שלו לא רצה.
   *  ⛔ וגם ריצת-משנה מוצהרת אינה סוגרת — ⚠️ שער שמריץ את עצמו בעץ
   *  סינתטי מגיע לחלק מטענותיו בכוונה, ⭐ והרצפה נמדדת על עץ אמיתי. */
  if (!process.argv[1] || !process.argv[1].endsWith(GATE_ID)) return;
  if (SUBRUN) return;
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר (סבב 119) —
   *  ⚠️ שער שכל גופו מוטציות אינו רץ ברמה המהירה, ⭐ ואפס כזה אינו
   *  ריצה חלקית: ⛔ ו-`null` — תהליך שלא הגיע לשם — כן. */
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
const ok  = (m) => { RAN++; pass++;   console.log('  ok   ' + m); };
const bad = (m) => { RAN++; failed++; console.log('  FAIL ' + m); };
const sec = (t) => console.log('\n— ' + t + ' —');

/*  שדות שאינם נבדקים: מוסתרים, ולחצנים. ⚠️ `hidden` אינו קלט משתמש. */
const FIELD_RX = /<(input|select|textarea)\b[^>]*>/g;
/*  ⛔ הערות מנוקות לפני הסריקה (סבב 67) — פסקת הערה שמזכירה `<select>`
 *  אינה שדה קלט, ושער שסופר אותה נופל על ניסוח ועובר על מציאות. */
const stripComments = (s) =>
  s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
const isSkippable = (tag) =>
  /type="(hidden|submit|button|reset)"/.test(tag);

/*  ⭐ קישור ל-label נמדד בשלוש הצורות שהתקן מתיר (סבב 67): `<label>` עוטף,
 *  `for=` שמצביע על ה-id, או `aria-label`. ⛔ אין צורה רביעית — שדה בלי
 *  אף אחת מהן אינו נגיש, וקורא-מסך מקריא עליו «תיבת עריכה» ותו לא.     */
function labelAudit(raw) {
  const src = stripComments(raw);
  const forIds = new Set([...src.matchAll(/\bfor="([^"]+)"/g)].map((m) => m[1]));
  const out = [];
  for (const m of src.matchAll(FIELD_RX)) {
    const tag = m[0];
    if (isSkippable(tag)) continue;
    if (/aria-label=/.test(tag)) continue;
    const id = (tag.match(/\bid="([^"]+)"/) || [])[1];
    if (id && forIds.has(id)) continue;
    /*  ⚠️ חלון אחורה ולא ניתוח DOM — הקובץ אינו HTML תקני בלבד: חלק
     *  מהשדות נבנים כמחרוזות JS, ואין עץ לטייל בו.                     */
    const before = src.slice(Math.max(0, m.index - 900), m.index);
    const open = before.lastIndexOf('<label');
    const close = before.lastIndexOf('</label');
    if (open > -1 && open > close) continue;
    out.push(id || tag.slice(0, 60));
  }
  return out;
}

/*  ⭐ שדה סיסמה — ארבעת המאפיינים, וכולם (סבב 67). ⛔ `type=text` על שדה
 *  סיסמה מציג אותה על המסך למי שעומד מאחור, ⛔ ו-autocomplete חסר מונע
 *  ממנהל הסיסמאות של הדפדפן להציע את הערך הנכון.                        */
function passAudit(raw) {
  const src = stripComments(raw);
  const out = [];
  for (const m of src.matchAll(FIELD_RX)) {
    const tag = m[0];
    if (!/\bid="[^"]*(pass|pw-|mp-|sw-pass)[^"]*"/i.test(tag)) continue;
    if (/readonly/.test(tag)) continue;      /* ⚠️ תצוגה בלבד, אינו נקלט */
    const id = (tag.match(/\bid="([^"]+)"/) || [])[1] || tag.slice(0, 50);
    const miss = [];
    if (!/type="password"/.test(tag))        miss.push('type=password');
    if (!/autocomplete="/.test(tag))         miss.push('autocomplete');
    if (!/inputmode="numeric"/.test(tag))    miss.push('inputmode=numeric');
    if (!/maxlength="/.test(tag))            miss.push('maxlength');
    if (miss.length) out.push(id + ' → ' + miss.join(', '));
  }
  return out;
}

/*  ⛔ probe שמסתפק בקיום פונקציה (סבב 67) — `!!c.fnBody('x')` ותו לא.
 *  ⚠️ בדיוק כך שרד בהנהלה מסך שינוי סיסמה שהיה קוד מת: הפונקציה הייתה
 *  שם, שלמה ונכונה, בלי אף קורא ובלי שדות ב-DOM, והמטריצה אמרה ✅.     */
/*  ⚠️ הפסיק הסוגר נדרש (סבב 67) — probe רב-שורתי ממשיך בשורה הבאה,
 *  ובלי הדרישה הזו השורה הראשונה שלו הייתה נקראת כבדיקת-קיום. */
const BARE_PROBE_RX = /^\s*\(c\)\s*=>\s*!!\s*c\.fnBody\([^)]*\)\s*,\s*$/;
function bareProbes(capSrc) {
  const out = [];
  const body = capSrc.slice(capSrc.indexOf('matrixProbe'));
  const end = body.indexOf('\n  },');
  for (const line of body.slice(0, end < 0 ? body.length : end).split('\n')) {
    const m = line.match(/^\s*(\d+):\s*(.*)$/);
    if (!m) continue;
    if (BARE_PROBE_RX.test(' (c) => ' + m[2].replace(/^\(c\)\s*=>\s*/, ''))) out.push(m[1]);
  }
  return out;
}

/*  ⭐ הביקורת המלאה — ⛔ מוחזרת כמערך הפרות, כדי ש-`check-capabilities`
 *  יוכל למדוד את שורת שכבת הקלט מכאן ולא לממש מדידה שנייה משלו.               */
export function audit(root) {
  const src = fs.readFileSync(path.join(root, APP.file), 'utf8');
  const v = [];
  /*  א1 — דפוס שדה מספרי אחד ומוצהר. */
  const nums = (stripComments(src).match(/type="number"/g) || []).length;
  if (nums) v.push('[number] ' + nums + ' שדות `type="number"` — הדפוס המוצהר הוא type=text + inputmode');
  /*  א2 — שדות סיסמה. */
  for (const p of passAudit(src)) v.push('[pass] ' + p);
  /*  ב — קישור ל-label. */
  for (const l of labelAudit(src)) v.push('[label] ' + l);
  return v;
}

/*  ⛔ הריצה העצמית מוגנת (סבב 67) — `check-capabilities` מייבא את `audit`
 *  כדי למדוד את שורת שכבת הקלט, ⚠️ וייבוא בלי השער הזה היה מריץ גם את המוטציות. */
const SELF = process.argv[1] &&
  path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (SELF) {

/* ── הטענות ────────────────────────────────────────────────────────────── */
const SRC = fs.readFileSync(APP.file, 'utf8');

sec('א · שדה מספרי ושדה סיסמה — דפוס אחד מוצהר');
const nums = (stripComments(SRC).match(/type="number"/g) || []).length;
nums === 0
  ? ok('1 · ⛔ אין `type="number"` — הדפוס הוא type=text + inputmode + ולידציה משלנו')
  : bad('1 · ' + nums + ' שדות `type="number"` שרדו');
const pv = passAudit(SRC);
pv.length === 0
  ? ok('2 · כל שדה סיסמה נושא type=password · autocomplete · inputmode · maxlength')
  : bad('2 · שדות סיסמה חסרי מאפיין: ' + pv.join(' | '));

sec('ב · כל שדה קלט מקושר ל-label');
const lv = labelAudit(SRC);
lv.length === 0
  ? ok('3 · כל שדות הקלט מקושרים — עוטף, for= או aria-label')
  : bad('3 · ' + lv.length + ' שדות בלי קישור: ' + lv.slice(0, 8).join(', '));

sec('ג · פעולה שדורשת רשת — כפתור מושבת עד שהסתיימה');
/*  ⛔ הגדרה מאותרת בכל צורותיה — ⚠️ `function X` · `window.X = function` ·
 *  `const X =` · `X: function`: ⭐ חיפוש שמכיר צורה אחת מאשר «אין מגן»
 *  לפונקציה שנושאת אותו, ⛔ ומדווח חסר על קוד תקין. */
const GSRC = stripComments(SRC);
const defAt = (name) => {
  for (const form of ['function ' + name + '(', 'window.' + name + ' =',
                      'const ' + name + ' =', name + ': function'])
    if (GSRC.indexOf(form) >= 0) return GSRC.indexOf(form);
  return -1;
};
/*  ⛔ הגוף נחתך בהתאמת סוגריים ⛔ ולא בחלון תווים קבוע — ⚠️ חלון שנמתח
 *  אל הפונקציה הבאה מאשר מגן שאינו בגוף הזה, ⭐ וחלון שנקטע מדווח חסר
 *  על פונקציה שנושאת אותו. */
const bodyOf = (name) => {
  const i = defAt(name);
  if (i < 0) return null;
  const s = GSRC.indexOf('{', i);
  if (s < 0) return null;
  let d = 0;
  for (let j = s; j < GSRC.length; j++) {
    if (GSRC[j] === '{') d++;
    else if (GSRC[j] === '}' && --d === 0) return GSRC.slice(s, j + 1);
  }
  return null;
};
const hasBusy = (body) => !!body && new RegExp('\\b' + APP.busyFn + '\\s*\\(').test(body);
if (!APP.busyFn) {
  APP.guardReason
    ? ok('4 · ⚠️ אין כאן מגן שליחה כפולה, והנימוק כתוב: ' + APP.guardReason)
    : bad('4 · ⛔ אין `busyFn` ואין נימוק כתוב — «אין כאן כזה» חייב להיאמר');
} else {
  const missing = APP.guarded.filter((fn) => !hasBusy(bodyOf(fn)));
  missing.length === 0
    ? ok('4 · ' + APP.guarded.length + ' פונקציות כתיבה עוברות ב-`' + APP.busyFn + '`')
    : bad('4 · פונקציות כתיבה בלי מגן: ' + missing.join(', ') + '. נמדדו ' + missing.length +
          ' והצפוי 0. מוסיפים את הקריאה ל-`' + APP.busyFn + '` בגוף הפונקציה');
}
/*  ⛔ שומר אחד לכל פעולה (סבב 134) — ⚠️ **מה נכנס**: מפת הפעולות והמטפלים
 *  שהיא מנתבת אליהם, ⛔ **ומה מפיל**: מטפל שמחזיר את ההבטחה — ⭐ ולכן
 *  הניתוב מנטרל את הכפתור — ⛔ וגופו קורא שוב לאותו מגן: ⚠️ שני שומרים
 *  לאותה פעולה הם שתי הכרעות על אותה ראיה, ⭐ והשני משחרר כפתור
 *  שהראשון עוד מחזיק. ⛔ **והמדידה חלה רק כשהניתוב מנטרל** — ⚠️ ובשלוש
 *  שאין בהן שומר בניתוב, השומר שבאתר הכתיבה הוא היחיד. */
const dbl = [];
if (APP.busyFn && APP.routeGuard)
  for (const m of GSRC.matchAll(/'([a-z0-9-]+)'\s*:\s*function\s*\([^)]*\)\s*\{\s*return\s+([A-Za-z_$][\w$]*)\s*\(/g))
    if (hasBusy(bodyOf(m[2]))) dbl.push(m[1] + ' → ' + m[2]);
dbl.length === 0
  ? ok('4ב · שומר אחד לכל פעולה — ' + (APP.routeGuard
        ? 'הניתוב מנטרל, ⛔ ואין מטפל שמנטרל שוב' : 'אין שומר בניתוב, ⭐ והשומר יושב באתר הכתיבה'))
  : bad('4ב · שומר כפול — הניתוב מנטרל וגם המטפל: ' + dbl.join(', ') + '. נמדדו ' + dbl.length +
        ' והצפוי 0. מסירים את הקריאה ל-`' + APP.busyFn + '` מגוף המטפל');

sec('ד · יכולת ✅ מחייבת נקודת כניסה חיה');
const CAP = fs.readFileSync('tools/check-capabilities.mjs', 'utf8');
const bare = bareProbes(CAP);
bare.length === 0
  ? ok('5 · ⛔ אף probe אינו בדיקת קיום-פונקציה בלבד')
  : bad('5 · probe שמסתפק בקיום פונקציה בשורות: ' + bare.join(', '));

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_inputlayer: המוטציות רצות ברמה המלאה (--full)');
  process.exit(failed ? 1 : 0);
}
/* ── מוטציות ───────────────────────────────────────────────────────────── */
/*  ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג) — עותק בתיקייה זמנית. */
sec('מוטציות');
/*  ⛔ כותב על עותק — ⚠️ השער האמיתי רץ בתהליך נפרד, ⛔ והוא קורא את `index.html` מהדיסק. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inp-'));
const mut = (name, edit, expectFail, why) => {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, APP.file), edit(SRC));
  const got = audit(dir);
  const fell = got.length > 0;
  if (fell === expectFail) ok(why);
  else bad(why + ' — ציפיתי ' + (expectFail ? 'לנפילה' : 'למעבר') + ' וקיבלתי את ההפך');
};

mut('m1', (s) => s.replace(/<input /, '<input type="number" '), true,
    'מ1 · הזרקת `type="number"` מפילה את טענה 1');
if (/type="password"/.test(SRC)) {
  mut('m2', (s) => s.replace(/autocomplete="current-password"/, 'data-x="1"'), true,
      'מ2 · שדה סיסמה בלי autocomplete מפיל את טענה 2');
} else {
  /*  ⚠️ מוצהר ולא מושמט בשתיקה — אין כאן משתמשים ואין שדה סיסמה. */
  ok('מ2 · ⚠️ אין כאן שדות סיסמה — הטענה מוצהרת ריקה ולא מדולגת בשקט');
}
mut('m3', (s) => s.replace('</body>', '<input id="mut-orphan-field">\n</body>'), true,
    'מ3 · שדה בלי שום קישור ל-label מפיל את טענה 3');
mut('n1', (s) => s.replace('</body>',
      '<label for="mut-tied-field">שדה</label><input id="mut-tied-field">\n</body>'), false,
    'נ1 · ⭐ מוטציית-נגד: אותו שדה **עם** `for=` ⛔ אינו מפיל — נמדד קישור ולא כמות');

/*  ⛔ מוטציות ד רצות על טקסט **סינתטי** ולא על הקובץ החי (סבב 67) —
 *  ⚠️ ל-yoman אין `matrixProbe` פר-אפליקציה, ומוטציה שהייתה נשענת על
 *  שורה קיימת הייתה ריקה מתוכן בדיוק שם.                                */
const synth = (probe) => '  matrixProbe: {\n    19: ' + probe + '\n  },\n';
bareProbes(synth("(c) => !!c.fnBody('changeMyPassword'),")).length > 0
  ? ok('מ4 · probe שהוא בדיקת-קיום בלבד מפיל את טענה 5')
  : bad('מ4 · probe של בדיקת-קיום לא נתפס');
bareProbes(synth("(c) => !!c.fnBody('x') && /onclick=/.test(c.src),")).length === 0
  ? ok('נ2 · ⭐ מוטציית-נגד: `fnBody` **כחלק** מביטוי גדול יותר ⛔ אינו מפיל')
  : bad('נ2 · probe מורכב נספר בטעות כבדיקת-קיום');

fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n' + (failed === 0 ? '✅' : '❌') +
  ` סבב 67 (שכבת הקלט והכניסה) — ${pass} טענות עברו, ${failed} נכשלו`);
if (failed) process.exit(1);

}
