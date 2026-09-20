#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_anchors.mjs — כל טענה נמדדת בתוך ההיקף שלה (סבב 139)

   **מה נאכף:** ⛔ לכל טענה שעוגנה — מוטציה ש**מזיזה את המחרוזת למקום הלא
   נכון** ומשאירה אותה במקור, ⚠️ והשער שמכסה את השורה חייב ליפול עליה:
   ⭐ המחרוזת עדיין קיימת, ⛔ והיא כבר לא בגוף ולא באזור שלה.

   **הנימוק המדוד:** 21 בדיקות הכריעו במבחן חברות על המקור כולו, ⚠️ ושלוש
   מהן אישרו באג חי — מיכל הבאנר שנבנה ב-JS, סמל ספרייה שנמדד בכתובת
   ה-CDN, ⛔ ומאזין שנספר בתוך מחרוזת. ⭐ ובלי המוטציות האלה, עיגון
   שנשחק בחזרה לבדיקת נוכחות עובר בשקט.

   **מה יישבר בלעדיו:** ⛔ הסבב הבא שיכתוב מחדש עוזר יחזיר אותו למדידה על
   המקור כולו, ⚠️ והתא יישאר ✅ — ⭐ בדיוק המצב שהעיגון בא לסגור.

   **מה אינו נאכף כאן:** ⚠️ **איזה** היקף נכון לטענה — ⛔ זו קריאת משמעות,
   ⭐ ונסרקת ידנית בכל סבב שנוגע · ⛔ וטענת היעדר, שההיקף שלה הוא המקור
   כולו, ⚠️ ומוצהרת ב-`APP.absenceClaims`.

   ⛔ כל גופו מוטציות — ⚠️ הוא רץ ברמה המלאה בלבד (`--full`), ⭐ והמוטציות
   רצות על עותק בתיקייה זמנית ולא על העץ.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
/*  ⛔ השמות שהמוטציות מזיזות — ⚠️ **מה נכנס**: שם שהמוטציה בונה ממנו את
 *  המחרוזת שהיא מזיזה; ⛔ **ומה מפיל**: שם שאין לו אתר במקור — ⭐ המוטציה
 *  מדווחת ⭕ ⛔ ואינה מדלגת בשתיקה. ⚠️ **וריק הוא «נמדד ואין»** ⛔ ואינו
 *  נשמט: ⭐ שדה חסר נקרא «לא נשאל». */
const APP = {
  app: 'schar-limud',
  actMap: 'DOM_ACTIONS',
  sortFn: 'slApplyMirror',
  cdnSym: 'supabase',
  /* ⚠️ אתרי הקריאה של מסלול הייצוא, וההחלפה שמנטרלת כל אחד — ריק כשאין ייצוא */
  exportCalls: [],
  /* ⚠️ חותמת זריקה לערך מפתח-ערך — ריקה כשאין כאן ערך שלם שממוזג */
  kvResetKey: '',
  /* ⚠️ מפתח מראת המשתמשים — ריק כשאין כאן כניסה */
  mirrorKey: 'sl_mirror_users',
  /* ⚠️ מקור המשתמש המחובר — ריק כשאין כאן כניסה */
  authUser: '',
  /* ⚠️ דרגה שאיש אינו נושא — ריקה כשאין כאן מודל הרשאות */
  roleUnused: 'junior',
  /* ⚠️ המאמת האופליין — ריק כשאין כאן כניסה */
  verifyFn: 'slVerifyOffline',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [39];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה.
 *  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ כל מוטציה שאין לה מה למוטט בריפו הזה
 *  נושאת שורת נימוק ⛔ ואינה מדולגת: ⭐ המספר זהה בכולן. */
const FLOOR = { shared: 21, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.R33_INNER;
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — עדכן את \`FLOOR\`.`);
    process.exitCode = 1;
  }
});
const t = (c, m) => { RAN++; if (c) { pass++; console.log('  ok   ' + m); }
                      else { fail++; console.error('  FAIL ' + m); } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

mutStage();
if (RUN_MUT) {
/* ── רתמת המוטציות — ⛔ עותק אחד לשער, ולא עותק לכל מוטציה ──────────────── */
let WORK = null;
function work() {
  if (WORK) return WORK;
  /*  ⛔ כותב על עותק — ⚠️ הרתמה מריצה שערים אמיתיים על עץ סינתטי. */
  WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'anchors-'));
  execFileSync('cp', ['-r', ROOT + '/.', WORK]);
  process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) {} });
  return WORK;
}
/*  ⛔ מחזירה `true` כשהשער **נפל** — ⚠️ זה מה שהמוטציה מודדת. */
function runGateOn(files, gate) {
  const dir = work();
  const saved = [];
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(dir, rel);
    saved.push([p, fs.readFileSync(p)]);
    fs.writeFileSync(p, body);
  }
  try {
    execFileSync('node', [path.join(dir, 'tools', gate)],
      { cwd: dir, encoding: 'utf8', stdio: 'pipe', env: { ...process.env } });
    return false;
  } catch (e) {
    return true;
  } finally {
    /*  ⛔ השחזור ב-`finally` — ⚠️ מוטציה שזרקה הייתה משאירה את העותק
     *  מזוהם, ⛔ והמוטציה הבאה הייתה מודדת שתי מוטציות יחד. */
    for (const [p, b] of saved) fs.writeFileSync(p, b);
  }
}

/*  ⛔ ההזזה משאירה את המחרוזת במקור ⛔ ומוציאה אותה מההיקף — ⚠️ זה בדיוק
 *  ההבדל שהעיגון מודד: ⭐ בדיקת נוכחות הייתה עוברת על התוצאה. */
const HOST = 'function esc(';
function relocate(text, needle) {
  const i = text.indexOf(needle);
  if (i < 0) return null;
  const cut = text.slice(0, i) + text.slice(i + needle.length);
  const j = cut.indexOf(HOST);
  if (j < 0) return null;
  const k = cut.indexOf('{', j) + 1;
  return cut.slice(0, k) + ' ' + needle + ' ' + cut.slice(k);
}
/*  ⛔ ההוספה מכניסה מחרוזת להיקף שאסור לה — ⚠️ הצד השני של אותה טענה:
 *  ⭐ יש טענות שהנמדד בהן הוא **אפס אתרים** בהיקף. */
function inject(text, snippet) {
  const j = text.indexOf(HOST);
  if (j < 0) return null;
  const k = text.indexOf('{', j) + 1;
  return text.slice(0, k) + ' ' + snippet + ' ' + text.slice(k);
}
const IDX = rd('index.html');
/*  ⛔ מרשם טקסט דו-ממדי ברמת המודול, ואתר ציור — ⚠️ שניהם יחד הם מה
 *  שהשער מודד, ⭐ והשם מגיע מהקורא כדי ששתי המוטציות לא יהיו אותו שינוי. */
function prose(text, name) {
  const j = text.lastIndexOf('</body>');
  if (j < 0) return null;
  const blk = '<script>\nvar ' + name + ' = [\n' +
              "  ['\u05d0', '\u05d1'],\n  ['\u05d2', '\u05d3'],\n];\n" +
              'function _zzDraw() { var h = 0; ' + name +
              '.forEach(function (x) { h += x.length; }); return h; }\n<\/script>\n';
  return text.slice(0, j) + blk + text.slice(j);
}
/*  ⛔ מרשם המוטציות — ⚠️ **מה נכנס**: שם הטענה · השער שמכסה אותה ·
 *  והעריכה שמזיזה את המחרוזת; ⛔ **ומה מפיל**: שער שלא נפל עליה.
 *  ⭐ **ולמה המבנה קיים**: עיגון שאין לו מוטציה נשחק בחזרה לבדיקת
 *  נוכחות, ⚠️ והתא נשאר ✅ בלי שנמדד דבר. */
const MUT = [
  { m: 'מ1',  part: 'test_caps_ui',       lbl: '`closest(\'.ksave\')` מחוץ ל-`ksKey`',
    edit: () => relocate(IDX, "closest('.ksave')") },
  { m: 'מ2',  part: 'test_caps_ui',       lbl: '`ksKey(e)` מחוץ למאזין המקלדת',
    edit: () => relocate(IDX, 'ksKey(e)') },
  { m: 'מ3',  part: 'test_caps_ui',       lbl: 'מפת הפעולות מחוץ ל-`ksFire`',
    edit: () => relocate(IDX, APP.actMap + '[act]') },
  { m: 'מ4',  part: 'test_caps_ui',       lbl: 'מאזין הלחיצה על `window` ולא על `document`',
    edit: () => IDX.replace("document.addEventListener('click'", "window.addEventListener('click'") },
  { m: 'מ5',  part: 'test_caps_ui',       lbl: 'מאזין לחיצה שני על `document`',
    edit: () => inject(IDX, "document.addEventListener('click', function () {});") },
  { m: 'מ6',  part: 'test_caps_ui',       lbl: 'חתימת `openModal` שנייה',
    edit: () => inject(IDX, 'function openModal(title, body, foot) { return 0; }') },
  { m: 'מ7',  part: 'test_caps_ui',       lbl: 'הגדרת פונקציית המיון שירדה, והשם נשאר',
    edit: () => IDX.replace('function ' + APP.sortFn + '(', 'function ' + APP.sortFn + 'Z(') },
  { m: 'מ8',  part: 'test_caps_ui',       lbl: 'סמל הספרייה בלי אתר קריאה',
    edit: () => IDX.split(APP.cdnSym + '.').join(APP.cdnSym + 'Z.')
                   .split(APP.cdnSym + '(').join(APP.cdnSym + 'Z(') },
  { m: 'מ9',  part: 'test_caps_ui',       lbl: 'אתרי הייצוא המוצהרים בלי קריאה',
    edit: () => { if (!APP.exportCalls.length) return null;
                  let o = IDX;
                  for (const [a, b] of APP.exportCalls) o = o.split(a).join(b);
                  return o; } },
  { m: 'מ10', part: 'test_caps_build',    lbl: 'קישור המניפסט מחוץ ל-`head`',
    edit: () => { const m = /<link[^>]+rel=["']manifest["'][^>]*>/i.exec(IDX);
                  if (!m) return null;
                  const cut = IDX.replace(m[0], '');
                  const b = cut.lastIndexOf('</body>');
                  return cut.slice(0, b) + m[0] + cut.slice(b); } },
  { m: 'מ11', part: 'test_caps_build',    lbl: 'בקשת העימוד מחוץ לקריאת הגיבוי',
    edit: () => relocate(IDX, "count: 'exact', head: true") },
  { m: 'מ12', part: 'test_caps_build',    lbl: 'חותמת הזריקה המוצהרת בלי קורא',
    edit: () => APP.kvResetKey ? IDX.split("'" + APP.kvResetKey + "'").join("'" + APP.kvResetKey + "Z'") : null },
  { m: 'מ13', part: 'test_caps_guard',    lbl: 'מפתח המראה בשני ליטרלים',
    edit: () => APP.mirrorKey ? inject(IDX, "var _dup = '" + APP.mirrorKey + "';") : null },
  { m: 'מ14', part: 'test_caps_guard',    lbl: 'מקור המשתמש בלי אתר, או דרגה שהוכרזה חסרת-נושא',
    edit: () => (APP.authUser
                   ? IDX.split(APP.authUser + '.role').join(APP.authUser + '.roleZ')
                        .split('get user()').join('get userZ()')
                   : (APP.roleUnused ? inject(IDX, "var _r = '" + APP.roleUnused + "';") : null)) },
  { m: 'מ15', part: 'test_caps_guard',    lbl: 'המאמת האופליין בלי אתר קריאה',
    edit: () => APP.verifyFn ? IDX.split(APP.verifyFn + '(').join(APP.verifyFn + 'Z(') : null },
  { m: 'מ16', part: 'test_caps_guard',    lbl: 'הבדיקה המחזורית מחוץ ל-`swRegister`',
    edit: () => relocate(IDX, 'setInterval(checkForUpdate,') },
  { m: 'מ17', part: 'test_caps_guard',    lbl: 'מיכל הבאנר נבנה ב-JS',
    edit: () => inject(IDX, "var _u = document.createElement('div'); _u.id = 'updater';") },
  /*  ⛔ מ18 · מ19 — מסך שמתאר תהליך שמחוץ לקוד (סבב 148): ⚠️ **מה נכנס**:
   *  מרשם טקסט דו-ממדי ברמת המודול שמצויר לטבלה; ⛔ **ומה מפיל**: שניהם
   *  יחד — ⭐ המרשם שירד, ⚠️ ומרשם חדש בשם אחר. */
  { m: 'מ18', part: 'check-capabilities', lbl: 'המרשם שירד חוזר — «staticProseRegistries»',
    edit: () => prose(IDX, 'ZZ_INF_DIMS') },
  { m: 'מ19', part: 'check-capabilities', lbl: 'מרשם תצוגה קבוע חדש — «staticProseRegistries»',
    edit: () => prose(IDX, '_zzSteps') },
];
for (const r of MUT) {
  const body = r.edit();
  if (body === null || body === IDX) {
    t(true, `${r.m} · ⭕ ${r.lbl} — ⛔ אין כאן מה למוטט`);
    continue;
  }
  t(runGateOn({ 'index.html': body }, r.part + '.mjs'),
    `${r.m} · ${r.lbl} **מפיל** את ${r.part}`);
}
/*  ⭐ מוטציית-נגד: שינוי שם עקבי של מודול המקש ⛔ אינו מפיל — ⚠️ הנמדד
 *  הוא **המיקום של המחרוזת בגוף**, ⛔ ולא השם שהגוף נושא. */
{
  /*  ⛔ השם נבחר מהגוף ⛔ ואינו מוקלד — ⚠️ והשינוי עקבי בתוך ההיקף
   *  עצמו: ⭐ מה שנמדד הוא **המיקום בגוף**, ⛔ ולא השם שהמשתנה נושא. */
  const fb = /function ksFire\([\s\S]*?\n}/.exec(IDX);
  if (!fb) t(true, 'נ1 · ⭕ אין כאן מודול מקש — ⛔ ואין שם שאפשר לשנות');
  else t(!runGateOn({ 'index.html': IDX.replace(fb[0], fb[0].replace(/\bb\b/g, 'btn')) },
                    'test_caps_ui.mjs'),
         'נ1 · ⭐ שינוי שם עקבי בתוך ההיקף ⛔ **אינו** מפיל');
}
/*  ⭐ מוטציית-נגד: מרשם דו-ממדי שנגזר ממצב חי ⛔ אינו מפיל — ⚠️ הנמדד הוא
 *  **טקסט קבוע**, ⛔ ולא הצורה הדו-ממדית: ⭐ מה שנגזר נמדד מול מקורו. */
{
  const j = IDX.lastIndexOf('</body>');
  /*  ⛔ השם שנוסף נקרא באותו קטע — ⚠️ מוטציית-נגד היא **שינוי חי**:
   *  ⭐ שם שאין לו קורא הוא יתום, ⛔ והוא מפיל בדין. */
  const live = '<script>\nvar _zzLive = (window._rows || []).map(function (r) ' +
               '{ return [r.k, r.v]; });\nfunction _zzL() { var h = 0; ' +
               '_zzLive.forEach(function (x) { h += x.length; }); return h; }\n' +
               '_zzL();\n<\/script>\n';
  if (j < 0) t(true, 'נ2 · ⭕ אין כאן סוגר גוף — ⛔ ואין לאן להוסיף');
  else t(!runGateOn({ 'index.html': IDX.slice(0, j) + live + IDX.slice(j) },
                    'check-capabilities.mjs'),
         'נ2 · ⭐ מרשם שנגזר ממצב חי ⛔ **אינו** מפיל');
}
}

if (fail) { console.error(`❌ ${GATE_ID}: ${fail} טענות נכשלו`); process.exitCode = 1; }
else console.log(`✅ ${GATE_ID} — ${pass} טענות עברו`);
