#!/usr/bin/env node
/*  test_rulesdocs_ui.mjs — רתמת המוטציות של חלק הממשק בבודק היכולות.
 *
 *  **מה נאכף:** ⛔ «מוטציות — כיסוי» לטענות ש-`test_caps_ui` ו-`test_visual`
 *  מכריעים — ⚠️ מפת הפעולות · צינור השמירה · השומר שבניתוב · הספריות
 *  החיצוניות · ערכת הנושא · הסולם · והסגנון המוטבע: ⭐ לכל טענה מוטציה
 *  שמפילה אותה ומוטציית-נגד שאינה מפילה, ⛔ והבודק האמיתי רץ על עותק מוטט.
 *
 *  **הנימוק המדוד:** ⛔ רתמת בודק היכולות ישבה בשער אחד, ⚠️ והוא תפס
 *  יותר ממחצית תקרת הסט: ⭐ שער שתופס את רובה אינו משאיר מרווח לתנודת
 *  המכונה, ⛔ וכל תנודה מפילה את הסט כולו.
 *
 *  **מה יישבר בלעדיו:** ⛔ טענת ממשק שאיש אינו מוטט היא טענה שאיש לא
 *  הוכיח שהיא מפילה, ⚠️ והשורה שהיא אוכפת נראית מכוסה.
 *
 *  **מה אינו נאכף כאן:** ⛔ שאר טענות הבודק — ⚠️ הן ב-`test_rulesdocs_caps`,
 *  ⭐ ומוטציות התיעוד וההערות ב-`test_rulesdocs`.
 *
 *  ⛔ לכל טענה מוטציה שמפילה אותה ומוטציית-נגד שאינה מפילה, ⛔ והמוטציות
 *  רצות על עותק בתיקייה זמנית ולא על העץ.
 *  זהה בית-לבית בכל הריפו פרט לבלוק APP ולאזור הריצפה.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { FACTS } from './app-facts.mjs';

/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
const FLOOR = { shared: 39, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו.
 *  ⛔ **ושומר הרקורסיה הוא ריצת-משנה אף הוא** — ⚠️ הסט רץ שם על **עותק
 *  סינתטי** שאין לצידו אחיות ואין בו `.git`, ⭐ ולכן שער שמשווה מול אחות
 *  או קורא את סט המעקב מגיע לחלק מטענותיו **בכוונה**: ⛔ והריצפה נמדדת
 *  על עץ אמיתי ⛔ ולא שם. */
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.GATE_INNER;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד**
 *  — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
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
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר —
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
/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {};
/* ── סוף APP ───────────────────────────────────────────────────────────── */
/*  ⛔ השורה בטבלת התשתית שהקובץ הזה אוכף — ⚠️ «מוטציות — כיסוי»: ⭐ כל
 *  טענת ממשק שהטבלה מצביעה עליה נושאת מוטציה, ⛔ והרתמה הזו היא מקומן. */
export const ROWS = [37];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⛔ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

if (process.env.GATE_INNER || process.env.RULESDOCS_ROOT) {
  console.log(`${GATE_ID}: ריצה פנימית — ⛔ מדלג, והשער אינו נמדד כאן (מניעת רקורסיה)`);
  process.exit(0);
}

/*  ⛔ כל גופו של השער הזה הוא מוטציה — ⚠️ ולכן הוא כולו מדלג ברמה
 *  המהירה, ⛔ ורץ ברמה המלאה בלבד. */
mutStage();
if (!RUN_MUT) {
  console.log(`${GATE_ID}: המוטציות רצות ברמה המלאה (--full) — ⛔ מדלג, ואינן נמדדות כאן`);
  process.exit(0);
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const t = (c, m) => { RAN++; if (c) { pass++; console.log('  ok   ' + m); }
                      else { fail++; console.error('  FAIL ' + m); } };
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ── המוטציות — ⛔ עותק אחד לשער, ולא עותק לכל מוטציה ───────────────────── */
/*  ⛔ בעבר כל אחת מ-40 המוטציות עשתה `cp -r` של העץ כולו ⛔ ותהליך
 *  `node` חדש — ⚠️ והזמן גדל עם **מספר המוטציות** ולא עם גודל הקוד.
 *  ⭐ העותק נוצר פעם אחת ונשמר, ⛔ והקבצים שהמוטציה נגעה בהם מוחזרים
 *  אחריה: ⚠️ שחזור סלקטיבי הוא מה שמתיר לשתף את העותק בלי שמוטציה אחת
 *  תזלוג לשנייה. */
let WORK = null;
function work() {
  if (WORK) return WORK;
  /*  ⛔ כותב על עותק — ⚠️ הרתמה מריצה בודקים אמיתיים על עץ `tools` סינתטי. */
  WORK = fs.mkdtempSync(path.join(os.tmpdir(), FACTS.slug + '-rdui-'));
  execFileSync('cp', ['-r', ROOT + '/.', WORK]);
  /*  ⛔ המחיקה על יציאה — ⚠️ נמדד: העותק נשאר בכל הרצה,
   *  ⛔ ומאות עותקי עץ מילאו את הדיסק. */
  process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) {} });
  return WORK;
}
/*  ⛔ הזזת גוון בצעד אחד — ⚠️ משמשת מוטציית-נגד שצריכה
 *  ערך אחר שעדיין תקין: ⭐ הנמדד הוא המבנה ⛔ ולא הצבע. */
function shiftHex(h) {
  const n = parseInt(h.slice(1), 16);
  return '#' + (((n & 0xfefefe) + 0x010101) & 0xffffff).toString(16).padStart(6, '0');
}
/*  ⛔ מחזירה `true` כשהשער **נפל** — ⚠️ זה מה שהמוטציה מודדת. */
function runGateOn(files, gate, env) {
  const dir = work();
  const saved = [];
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    saved.push([p, fs.existsSync(p) ? fs.readFileSync(p) : null]);
    fs.writeFileSync(p, body);
  }
  try {
    execFileSync('node', [path.join(dir, 'tools', gate)],
      { cwd: dir, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, ...env(dir) } });
    return false;
  } catch (e) {
    return true;
  } finally {
    /*  ⛔ השחזור ב-`finally` — ⚠️ מוטציה שזרקה הייתה משאירה את העותק
     *  מזוהם, ⛔ והמוטציה הבאה הייתה מודדת שתי מוטציות יחד. */
    for (const [p, b] of saved) {
      if (b === null) fs.rmSync(p, { force: true }); else fs.writeFileSync(p, b);
    }
  }
}

{
  const CAPS = 'tools/check-capabilities.mjs';
  const caps = rd(CAPS);
  /*  ⛔⛔ מ42 — ליטרל צבע בכללי הבאנר: ⚠️ הטענה שנופלת היא
   *  «כל ערך חזותי נגזר — סריקה הפוכה», ⭐ והנימוק המדוד הוא ארבעה באנרים
   *  שנראו זהים — ⛔ הליטרל מבטל את הזהות הפר-אפליקציה: ⚠️ **והמדידה עברה
   *  לסריקה ההפוכה**, ⛔ שאינה מוגבלת לשלוש תכונות.
   *  ⛔ **והמוטציה נכתבת כתבנית ולא כשם אסימון** — ⚠️ שם האסימון נבדל
   *  ביניהן, ⭐ והמנגנון אחד. */
  {
    const bad = rd('app.css').replace(/(#updater \.in\{\s*background:)var\(--[a-z0-9-]+\)/,
                                      '$1#1a1a1a');
    t(runGateOn({ 'app.css': bad, [CAPS]: caps }, 'test_visual.mjs', () => ({})),
      'מ42 · ליטרל צבע בכללי הבאנר **מפיל** את «כל ערך חזותי נגזר — סריקה הפוכה»');
  }
  /*  ⭐ מוטציית-נגד: ערך שאינו צבע באותו כלל ⛔ אינו מפיל — ⚠️ המנגנון
   *  לא נגע, ⭐ ורק העיגול השתנה. */
  {
    const ok = rd('index.html').replace(/(#updater \.in\{[\s\S]{0,80}?border-radius:)var\(--r-5\)/, '$1var(--r-4)');
    t(!runGateOn({ 'index.html': ok, [CAPS]: caps }, 'test_visual.mjs', () => ({})),
      'נ25 · ⭐ ערך שאינו צבע בכלל הבאנר ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ48 · מ49 — כתובות CDN: ⚠️ **מה נכנס**: כתובת ה-CDN
   *  הראשונה שב-`index.html`, ⛔ **ומה מפיל**: כתובת בלי נתיב מלא ⛔ וגרסה
   *  שנבדלת בין שני הקבצים. ⭐ **ולמה שתיים**: הן שני צדדיו של אותו תקן —
   *  ⚠️ נתיב שאבד הוא תוכן שאינו נעוץ, ⛔ וגרסה שנבדלת היא מטמון שאינו
   *  נמשך ואופליין שנשבר. */
  {
    const idx = rd('index.html'), sw = rd('sw.js');
    const hit = /<script[^>]*\ssrc="(https:\/\/[^"]+@\d+\.\d+\.\d+\/[^"]+)"/.exec(idx);
    if (!hit) { t(true, 'מ48 · ⭕ אין כאן כתובת jsdelivr עם נתיב — ⛔ ואין מה למוטט');
                t(true, 'מ49 · ⭕ אין כאן כתובת jsdelivr עם נתיב — ⛔ ואין מה למוטט'); }
    else {
      const full = hit[1], bare = full.replace(/(@\d+\.\d+\.\d+)\/.*$/, '$1');
      t(runGateOn({ 'index.html': idx.split(full).join(bare),
                    'sw.js': sw.split(full).join(bare) },
                  'test_caps_ui.mjs', () => ({})),
        'מ48 · כתובת בלי נתיב מלא **מפילה** את «ספרייה חיצונית — גרסה מוצהרת»');
      const verOne = full.replace(/@(\d+)\.(\d+)\.(\d+)\//,
        (m, a, b, c) => '@' + a + '.' + b + '.' + (Number(c) + 1) + '/');
      t(runGateOn({ 'sw.js': sw.split(full).join(verOne) },
                  'test_caps_ui.mjs', () => ({})),
        'מ49 · גרסה שנבדלת בין הקבצים **מפילה** את «ספרייה חיצונית — גרסה מוצהרת»');
    }
  }
  /*  ⭐ מוטציית-נגד: קידום גרסה עקבי בשני הקבצים ובהצהרה ⛔ אינו מפיל —
   *  ⚠️ זה בדיוק השינוי החי שהתקן בא להתיר. */
  {
    const idx = rd('index.html'), sw = rd('sw.js'), caps = rd('tools/check-capabilities.mjs');
    const hit = /<script[^>]*\ssrc="(https:\/\/[^"]+@(\d+)\.(\d+)\.(\d+)\/[^"]+)"/.exec(idx);
    if (!hit) t(true, 'נ29 · ⭕ אין כאן כתובת jsdelivr עם נתיב — ⛔ ואין מה להחליף');
    else {
      const from = hit[2] + '.' + hit[3] + '.' + hit[4];
      const to = hit[2] + '.' + hit[3] + '.' + (Number(hit[4]) + 1);
      /*  ⛔ שלושה מקומות ולא שניים — ⚠️ הגרסה חיה בכתובת
       *  שבהצהרה וגם ב-`ver` שלידה, ⭐ וקידום שמדלג על אחד מהם
       *  אינו השינוי החי שהתקן בא להתיר. */
      const ok = { 'index.html': idx.split('@' + from + '/').join('@' + to + '/'),
                   'sw.js': sw.split('@' + from + '/').join('@' + to + '/'),
                   'tools/check-capabilities.mjs': caps.split('@' + from + '/').join('@' + to + '/')
                                                       .split("ver: '" + from + "'").join("ver: '" + to + "'") };
      t(!runGateOn(ok, 'test_caps_ui.mjs', () => ({})),
        'נ29 · ⭐ קידום גרסה עקבי בשני הקבצים ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ59 · מ60 · מ61 — שלושת כיווני ההצלבה של `APP.cdnLibs`:
   *  ⚠️ **מה נכנס**: הרשימה ותגי ה-`script`, ⛔ **ומה מפיל**: כתובת
   *  שאינה מוצהרת · סמל מוצהר שאין לו קורא · וסמל שנקרא בלי הצהרה.
   *  ⭐ **ולמה שלוש** — ⚠️ כל אחת שוברת כיוון אחר, ⛔ ושער שתופס
   *  שניים מהם ומפספס את השלישי עובר על שניים בלבד. */
  {
    const caps = rd('tools/check-capabilities.mjs');
    const blk = /cdnLibs: \[([\s\S]*?)\n  \],/.exec(caps);
    if (!blk) { t(true, 'מ59 · ⭕ אין כאן `cdnLibs` — ⛔ ואין מה למוטט');
                t(true, 'מ60 · ⭕ אין כאן `cdnLibs` — ⛔ ואין מה למוטט');
                t(true, 'מ61 · ⭕ אין כאן `cdnLibs` — ⛔ ואין מה למוטט'); }
    else {
      const one = /\{ url: '([^']+)',\n      ver: '([^']+)', sym: '([^']+)'/.exec(blk[1]);
      /*  ⛔ מ59 · כתובת שירדה מההצהרה ונשארה בטעינה — ⚠️ הכיוון הראשון
       *  נופל משני צדדיו: ⭐ תג בלי הצהרה, והצהרה בלי תג. */
      t(runGateOn({ 'tools/check-capabilities.mjs':
                      caps.replace("{ url: '" + one[1], "{ url: 'X" + one[1]) },
                  'test_caps_ui.mjs', () => ({})),
        'מ59 · כתובת שאינה מוצהרת **מפילה** את «ספרייה חיצונית — גרסה מוצהרת»');
      /*  ⛔ מ60 · רשומה שנייה לאותה כתובת עם סמל שאיש אינו קורא —
       *  ⚠️ הכיוון הראשון עובר (לכל רשומה יש תג), ⭐ והשני נופל. */
      t(runGateOn({ 'tools/check-capabilities.mjs':
                      caps.replace("cdnLibs: [\n",
                        "cdnLibs: [\n    { url: '" + one[1] + "',\n      ver: '" + one[2] +
                        "', sym: 'ZzTest' },\n") },
                  'test_caps_ui.mjs', () => ({})),
        'מ60 · סמל מוצהר שאין לו קורא **מפיל** את «ספרייה חיצונית — גרסה מוצהרת»');
      /*  ⛔ מ61 · קריאה לסמל שאינו מוצהר — ⚠️ הנבחר הוא הראשון
       *  ב-`LIB_SYMS` שאינו מוצהר כאן, ⛔ ואינו מוקלד. */
      const syms = /const LIB_SYMS = \[([^\]]*)\]/.exec(caps);
      const pick = syms[1].split(',').map((x) => x.trim().replace(/'/g, ''))
                          .filter((x) => x && blk[1].indexOf("sym: '" + x + "'") < 0)[0];
      const idx = rd('index.html');
      if (!pick) t(true, 'מ61 · ⭕ כל סמלי הספריות מוצהרים כאן — ⛔ ואין מה למוטט');
      else
        t(runGateOn({ 'index.html': idx.replace('var MSG_SAVED_LOCAL',
                        'var _mutLib = ' + pick + '.x;\nvar MSG_SAVED_LOCAL') },
                    'test_caps_ui.mjs', () => ({})),
          'מ61 · סמל שנקרא בלי ספרייה מוצהרת **מפיל** את «ספרייה חיצונית — גרסה מוצהרת»');
    }
  }
  /*  ⛔⛔ מ65 — מאזין רשת שאינו מוצהר: ⚠️ **מה נכנס**: כל
   *  `addEventListener('online'…)` שבמקור, ⛔ **ומה מפיל**: מאזין שאינו
   *  אחד מהשלושה המשותפים ואינו מוצהר. */
  {
    const idx = rd('index.html');
    const at = idx.indexOf('var DOM_ACTIONS = {');
    if (at < 0) t(true, 'מ65 · ⭕ אין כאן מפת פעולות — ⛔ ואין לאן להוסיף');
    else
      t(runGateOn({ 'index.html': idx.slice(0, at) +
                      "window.addEventListener('online', function () { mutNetProbe(); });\n" +
                      'function mutNetProbe() { return 1; }\n' + idx.slice(at) },
                  'test_caps_ui.mjs', () => ({})),
        'מ65 · מאזין רשת שאינו מוצהר **מפיל** את «`pull` — מנגנון המשיכה»');
  }
  /*  ⭐ מוטציית-נגד: מאזין נוסף שמוצהר יחד איתו ⛔ אינו מפיל —
   *  ⚠️ זה בדיוק השינוי החי שהתקן בא להתיר: ⭐ מה שהפולינג אינו
   *  מכסה נשאר במאזין משלו, ⛔ והוא נושא את נימוקו. */
  {
    const idx = rd('index.html'), caps = rd('tools/check-capabilities.mjs');
    const at = idx.indexOf('var DOM_ACTIONS = {');
    const dk = caps.indexOf('  netListeners: {');
    if (at < 0 || dk < 0) t(true, 'נ41 · ⭕ אין כאן מפה או הצהרה — ⛔ ואין לאן להוסיף');
    else {
      const e = caps.indexOf('{', dk) + 1;
      t(!runGateOn({ 'index.html': idx.slice(0, at) +
                       "window.addEventListener('online', function () { mutNetProbe(); });\n" +
                       'function mutNetProbe() { return 1; }\n' + idx.slice(at),
                     'tools/check-capabilities.mjs': caps.slice(0, e) +
                       "\n    mutNetProbe: 'מוטציית-נגד — ⛔ מאזין שמוצהר יחד עם הוספתו'," +
                       caps.slice(e) },
                   'test_caps_ui.mjs', () => ({})),
        'נ41 · ⭐ מאזין נוסף שמוצהר יחד איתו ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ64 — שמירה שיצאה מהצינור: ⚠️ **מה נכנס**: כל
   *  `function save*` שבמקור, ⛔ **ומה מפיל**: שם שאינו ב-`runSave`
   *  ואינו מוצהר ב-`APP.saveDirect`. ⭐ **והמוטציה שוברת את המנגנון**
   *  ⛔ ולא את הצורה — ⚠️ הקריאה ל-`runSave` מוחלפת בקריאה ישירה. */
  {
    const idx = rd('index.html');
    const hit = /return runSave\(([A-Za-z_$][\w$]*), /.exec(idx) ||
                /return runSave\(function \(\) \{ return ([A-Za-z_$][\w$]*)\(/.exec(idx);
    if (!hit) t(true, 'מ64 · ⭕ אין כאן קריאה ל-`runSave` במפה — ⛔ ואין מה למוטט');
    else {
      const at = idx.indexOf(hit[0]);
      const tail = idx.slice(at, idx.indexOf('\n', at));
      /*  ⛔ השמירה נקראת ישירות — ⚠️ והשורה נשארת תקינה תחבירית. */
      const broke = '{ ' + hit[1] + '(); },';
      t(runGateOn({ 'index.html': idx.replace(tail, broke) },
                  'test_caps_ui.mjs', () => ({})),
        'מ64 · שמירה שאינה עוברת בצינור **מפילה** את «פעולה מגיבה מיד»');
    }
  }
  /*  ⭐ מוטציית-נגד: שם שמירה שהוחלף בעקביות ⛔ אינו מפיל —
   *  ⚠️ הנמדד הוא **המעבר בצינור** ⛔ ולא השם, ⭐ ושינוי שם
   *  הוא השינוי החי שהתקן בא להתיר. */
  {
    const idx = rd('index.html');
    const hit = /return runSave\(([A-Za-z_$][\w$]*), / .exec(idx) ||
                /return runSave\(function \(\) \{ return ([A-Za-z_$][\w$]*)\(/.exec(idx);
    if (!hit) t(true, 'נ40 · ⭕ אין כאן שמירה שעוברת בצינור — ⛔ ואין מה להחליף');
    else {
      /*  ⛔ ההחלפה בשני הצדדים — ⚠️ השם מוצהר גם ברשימות החריגה שבשער,
       *  ⭐ ושינוי עקבי הוא שינוי **בשניהם**: ⛔ החלפה במקור בלבד אינה
       *  «שינוי חי» אלא הצהרה שנשברה. */
      const re = new RegExp('\\b' + hit[1] + '\\b', 'g');
      t(!runGateOn({ 'index.html': idx.replace(re, hit[1] + 'Zz'),
                     'tools/check-capabilities.mjs': rd('tools/check-capabilities.mjs').replace(re, hit[1] + 'Zz') },
                   'test_caps_ui.mjs', () => ({})),
        'נ40 · ⭐ שם שמירה שהוחלף בעקביות בשני הצדדים ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ66 — האופק שאין מי שינקה: ⚠️ **מה נכנס**: הקריאה
   *  ל-`lsHorizonRelease` מגוף המשיכה המלאה, ⛔ **ומה מפיל**: הסרתה —
   *  ⭐ הסימן שהפינוי משאיר אומר «את הישן זרקתי», ⚠️ וכל עוד הוא עומד
   *  המשיכה אינה מחזירה אותו: ⛔ והכפתור שניקה אותו ידנית ירד. */
  {
    const idx = rd('index.html');
    const hit = /\n(\s*)try \{ lsHorizonRelease\(\); \} catch \(e0\) \{ \}\n/.exec(idx);
    if (!hit) t(true, 'מ66 · ⭕ אין כאן קריאה לשחרור האופק — ⛔ ואין מה למוטט');
    else t(runGateOn({ 'index.html': idx.replace(hit[0], '\n') },
                     'test_caps_ui.mjs', () => ({})),
           'מ66 · הסרת שחרור האופק מהמשיכה **מפילה** את «אסטרטגיית localStorage»');
  }
  /*  ⛔⛔ מ62 · מ63 — משפחת הרקע: ⚠️ **מה נכנס**: שלוש
   *  רמות הרקע וכללי הריחוף, ⛔ **ומה מפיל**: רמה חסרה ⛔ ורקע
   *  ריחוף שנלקח מ-`--bg`. ⭐ **ולמה שתיים** — ⚠️ אחת שוברת את
   *  ההגדרה, ⛔ והשנייה את השימוש: ⭐ שער שתופס את הראשונה
   *  בלבד מאשר `--card-2` שמוגדר ואיש אינו נוגע בו. */
  {
    const idx = rd('index.html');
    const hv = /([.#][\w.\- ]*:hover[^{}]*)\{([^}]*background:var\(--card-2\)[^}]*)\}/.exec(idx);
    if (!hv) t(true, 'מ62 · ⭕ אין כאן כלל ריחוף עם `--card-2` — ⛔ ואין מה למוטט');
    else
      t(runGateOn({ 'index.html': idx.replace(hv[0],
                      hv[0].replace('background:var(--card-2)', 'background:var(--bg)')) },
                  'test_caps_ui.mjs', () => ({})),
        'מ62 · רקע ריחוף מ-`--bg` **מפיל** את «ערכת נושא — בהיר וכהה»');
    /*  ⛔ הרמה השלישית יורדת מהערכה הבהירה בלבד — ⚠️ וכללי
     *  הריחוף נשארים במקומם: ⭐ זה בדיוק המצב שהטענה תופסת. */
    const dm = idx.search(/@media\s*\(prefers-color-scheme/);
    const j = idx.indexOf('--card-2:');
    if (j < 0 || (dm >= 0 && j > dm)) t(true, 'מ63 · ⭕ אין `--card-2` בערכה הבהירה — ⛔ ואין מה למוטט');
    else {
      const e = idx.indexOf(';', j) + 1;
      t(runGateOn({ 'index.html': idx.slice(0, j) + idx.slice(e) },
                  'test_caps_ui.mjs', () => ({})),
        'מ63 · רמה חסרה במשפחת הרקע **מפילה** את «ערכת נושא — בהיר וכהה»');
    }
  }
  /*  ⭐ מוטציית-נגד: גוון אחר לרמה השלישית בשתי הערכות ⛔ אינו
   *  מפיל — ⚠️ הנמדד הוא **קיום הרמה והשימוש בה** ⛔ ולא הערך,
   *  ⭐ ושינוי גוון הוא השינוי החי שהתקן בא להתיר. */
  {
    const idx = rd('index.html');
    const all = [...idx.matchAll(/--card-2:\s*(#[0-9a-fA-F]{6})/g)];
    if (all.length < 2) t(true, 'נ39 · ⭕ `--card-2` אינו מוגדר בשתי הערכות — ⛔ ואין מה להחליף');
    else {
      let out = idx;
      for (const m of all) out = out.split(m[0]).join('--card-2:' + shiftHex(m[1]));
      t(!runGateOn({ 'index.html': out }, 'test_caps_ui.mjs', () => ({})),
        'נ39 · ⭐ גוון אחר לרמה השלישית בשתי הערכות ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ75 · נ47 — אוצר המילים אינו רשימה סגורה: ⚠️ **מה
   *  נכנס**: הערכה הבהירה ו-`APP.appTokens`, ⛔ **ומה מפיל**: אסימון
   *  שנוסף באחת בלבד ואינו מוצהר. ⭐ **והנימוק המדוד**: `--textlite`
   *  חי ביומן לצד `--text-3` שבשלוש, ⛔ ורשימה של חמישה שמות לא תפסה
   *  אותו — ⚠️ היא תפסה את מה שהיה ⛔ ולא את מה שנוסף. */
  {
    const idx = rd('app.css');
    const li = idx.indexOf(':root');
    const at = idx.indexOf('\n', li) + 1;
    /*  ⛔ ולאסימון החדש קורא — ⚠️ בלעדיו נופלת הטענה «הוגדר ואין לו
     *  קורא», ⭐ והמוטציה הייתה מודדת טענה אחרת. */
    const one = (idx.slice(0, at) + '  --xtra:#123456;\n' + idx.slice(at))
                  .replace('var(--text-3)', 'var(--xtra)');
    t(runGateOn({ 'app.css': one }, 'test_caps_ui.mjs', () => ({})),
      'מ75 · אסימון שנוסף באחת ואינו מוצהר **מפיל** את «ערכת נושא — בהיר וכהה»');
  }
  /*  ⭐ מוטציית-נגד: שינוי שם עקבי בערכה, בגוף ה-CSS ובהצהרה ⛔ אינו
   *  מפיל — ⚠️ הנמדד הוא **שהאסימון מוצהר**, ⛔ ולא השם שהוא נושא. */
  {
    const idx = rd('index.html');
    const caps = rd('tools/check-capabilities.mjs');
    const li = idx.indexOf(':root');
    const light = idx.slice(li, idx.indexOf('}', li));
    /*  ⛔ ההיקף הוא בלוק `appTokens` בלבד — ⚠️ סריקה על כל
     *  הקובץ אספה גם מפתחות של רשימות אחרות, ⛔ ובהן שמות שבאוצר
     *  המילים: ⭐ שינוי שם עקבי של שם כזה **חייב** להפיל, ⚠️ והמוטציה
     *  הזו הייתה מודדת את ההפך ממה שהיא מצהירה. */
    const at0 = caps.indexOf('  appTokens: {');
    const blk = at0 < 0 ? '' : caps.slice(at0, caps.indexOf('\n  },', at0));
    const decl = [...blk.matchAll(/^\s*'(--[a-z0-9-]+)':/gm)].map((m) => m[1]);
    /*  ⛔ השם נבחר מההצהרה ⛔ ואינו מוקלד — ⚠️ אסימוני המוצר נבדלים בין
     *  כולן, ⭐ ושם קשיח היה מפיל שלוש מהן. */
    const name = decl.filter((n) => light.indexOf(n + ':') >= 0).sort().pop();
    if (!name) t(true, 'נ47 · ⭕ אין כאן אסימון מוצר מוצהר — ⛔ ואין מה לשנות');
    else {
      const re = new RegExp(name + '(?![-A-Za-z0-9])', 'g');
      t(!runGateOn({ 'index.html': idx.replace(re, name + 'x'),
                     'tools/check-capabilities.mjs': caps.replace(re, name + 'x') },
                   'test_caps_ui.mjs', () => ({})),
        'נ47 · ⭐ שינוי שם עקבי של אסימון מוצר ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ76 · נ48 — פס שנבנה ביד: ⚠️ **מה נכנס**: גוף `bar`
   *  וכל אתר מסלול במקור, ⛔ **ומה מפיל**: מסלול שיושב מחוץ לגופה.
   *  ⭐ **והנימוק המדוד**: בגיוס חיו שני מימושים לאותו פס — הבונה,
   *  ⛔ ופס שנבנה ביד בטבלת הפילוח: ⚠️ שני מקומות שבהם הרוחב נכתב ביד. */
  {
    const idx = rd('index.html');
    const CALL = 'bar(pct(rows[i].val))';
    if (idx.indexOf(CALL) < 0) {
      t(true, 'מ76 · ⭕ אין כאן פס — ⛔ ואין מה למוטט');
      t(true, 'נ48 · ⭕ אין כאן פס — ⛔ ואין קורא שאפשר להוסיף');
    } else {
      const hand = "'<span class=\"btrack\"><i style=\"width:' + pct(rows[i].val) + '%\"></i></span>'";
      t(runGateOn({ 'index.html': idx.replace(CALL, hand) }, 'test_caps_ui.mjs', () => ({})),
        'מ76 · פס שנבנה ביד **מפיל** את «גרף נבנה מ-CSS ולא מספרייה»');
      /*  ⭐ מוטציית-נגד: קורא נוסף ל-`bar` ⛔ אינו מפיל — ⚠️ הנמדד הוא
       *  **המיקום של המסלול** ⛔ ולא מספר הקוראים. */
      t(!runGateOn({ 'index.html': idx.replace(CALL, CALL + " + bar(pct(rows[i].val), 'tgt')") },
                   'test_caps_ui.mjs', () => ({})),
        'נ48 · ⭐ קורא נוסף ל-`bar` ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ77 · נ49 — נימוק שנוקב בנוכחות בלבד: ⚠️ **מה נכנס**:
   *  הנימוק שב-`APP.appTokens`, ⛔ **ומה מפיל**: ניסוח שאומר «אינו
   *  בכולן» ⛔ ואינו אומר מה האסימון משרת. ⭐ **והנימוק המדוד**: כל שם
   *  שהרשימה מחזיקה אינו בכולן — ⚠️ זו המדידה שהכניסה אותו לשם,
   *  ⛔ והיא אינה מסבירה למה התפקיד אינו קיים בשאר. */
  {
    const caps = rd('tools/check-capabilities.mjs');
    const at0 = caps.indexOf('  appTokens: {');
    const m = at0 < 0 ? null
      : /^(\s*'--[a-z0-9-]+': ')([^']+)(',)$/m.exec(caps.slice(at0));
    if (!m) {
      t(true, 'מ77 · ⭕ אין כאן אסימון מוצר מוצהר — ⛔ ואין מה למוטט');
      t(true, 'נ49 · ⭕ אין כאן אסימון מוצר מוצהר — ⛔ ואין מה להחליף');
    } else {
      const at = at0 + m.index;
      const swap = (why) => caps.slice(0, at) + m[1] + why + m[3] +
                            caps.slice(at + m[0].length);
      t(runGateOn({ 'tools/check-capabilities.mjs':
                      swap('המילוי של הכרטיס — מוצר ולא תשתית, ואינו בכולן') },
                  'test_caps_ui.mjs', () => ({})),
        'מ77 · נימוק שנוקב בנוכחות בלבד **מפיל** את «ערכת נושא — בהיר וכהה»');
      /*  ⭐ מוטציית-נגד: אותו אסימון בנימוק תפקידי ⛔ אינו מפיל — ⚠️ הנמדד
       *  הוא **מה שהנימוק אומר** ⛔ ולא אורכו ולא השם שהוא נושא. */
      t(!runGateOn({ 'tools/check-capabilities.mjs':
                      swap('גוון שמשרת מסך שאין לו מקבילה בשאר — מוצר ולא תשתית') },
                   'test_caps_ui.mjs', () => ({})),
        'נ49 · ⭐ אותו אסימון בנימוק תפקידי ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ78 · נ50 — הפניה ל-`var()` שאין לה הגדרה: ⚠️ **מה
   *  נכנס**: כל `var(--x)` בגוף ה-CSS מול כל `--x:` שבו, ⛔ **ומה מפיל**:
   *  הפניה בלי הגדרה. ⭐ **והנימוק המדוד**: מפת השמות שפרשו החזיקה תשעה
   *  שמות והייתה המנגנון היחיד שתפס אותם — ⚠️ ונמדד ששם שפרש **והוגדר**
   *  נופל בלאו הכי כאסימון שאינו מוצהר, ⛔ והצד היחיד שנשאר לה הוא
   *  ההפניה בלי הגדרה: ⭐ והוא נמדד כאן לכל שם ⛔ ולא לתשעה. */
  {
    const idx = rd('index.html');
    const hit = /\n(\.[a-z0-9-]+\{)color:var\((--[a-z0-9-]+)\)/i.exec(idx);
    if (!hit) {
      t(true, 'מ78 · ⭕ אין כאן כלל שפותח בדיו מאסימון — ⛔ ואין מה למוטט');
      t(true, 'נ50 · ⭕ אין כאן כלל שפותח בדיו מאסימון — ⛔ ואין מה להחליף');
    } else {
      const to = (n) => idx.replace(hit[0], '\n' + hit[1] + 'color:var(' + n + ')');
      t(runGateOn({ 'index.html': to('--ink') }, 'test_caps_ui.mjs', () => ({})),
        'מ78 · הפניה לאסימון שאינו מוגדר **מפילה** את «ערכת נושא — בהיר וכהה»');
      /*  ⭐ מוטציית-נגד: הפניה לאסימון אחר **שמוגדר** ⛔ אינה מפילה —
       *  ⚠️ הנמדד הוא **ההגדרה** ⛔ ולא השם שההפניה נושאת. */
      t(!runGateOn({ 'index.html': to('--text-2') }, 'test_caps_ui.mjs', () => ({})),
        'נ50 · ⭐ הפניה לאסימון מוגדר ⛔ **אינה** מפילה');
    }
  }
  /*  ⛔⛔ מ56 — דיו שאינו עומד ביחס במצב אחד: ⚠️ הטענה שנופלת היא
   *  «ערכת נושא — בהיר וכהה», ⭐ והנימוק המדוד הוא שצמד נמדד **בשני**
   *  המצבים: ⛔ דיו שנכון בבהיר יכול להיבלע בכהה, ⚠️ ומדידה במצב אחד
   *  מאשרת אותו. */
  {
    const idx = rd('index.html');
    const dm = /@media\s*\(prefers-color-scheme\s*:\s*dark\)/.exec(idx);
    const j = dm ? idx.indexOf('--on-brand:', dm.index) : -1;
    if (j < 0) t(true, 'מ56 · ⭕ אין כאן `--on-brand` בערכה הכהה — ⛔ ואין מה למוטט');
    else {
      const end = idx.indexOf(';', j) + 1;
      t(runGateOn({ 'index.html': idx.slice(0, j) + '--on-brand:var(--brand);' + idx.slice(end) },
                  'test_caps_ui.mjs', () => ({})),
        'מ56 · דיו שאינו עומד ביחס במצב הכהה **מפיל** את «ערכת נושא — בהיר וכהה»');
    }
  }
  /*  ⭐ מוטציית-נגד: דיו אחר שכן עומד ביחס ⛔ אינו מפיל — ⚠️ הנמדד הוא
   *  **היחס** ⛔ ולא הערך, ⭐ ושינוי גוון בתוך הטווח הוא שינוי חי. */
  {
    const idx = rd('index.html');
    const dm = /@media\s*\(prefers-color-scheme\s*:\s*dark\)/.exec(idx);
    const j = dm ? idx.indexOf('--on-brand:', dm.index) : -1;
    if (j < 0) t(true, 'נ35 · ⭕ אין כאן `--on-brand` בערכה הכהה — ⛔ ואין מה להחליף');
    else {
      const end = idx.indexOf(';', j) + 1;
      const was = idx.slice(j, end);
      const to = /#f|#e|#d|#c|#b|#a|#9|#8/i.test(was) ? '--on-brand:#fdfdfd;' : '--on-brand:#0b1220;';
      t(!runGateOn({ 'index.html': idx.slice(0, j) + to + idx.slice(end) },
                   'test_caps_ui.mjs', () => ({})),
        'נ35 · ⭐ גוון דיו אחר שעומד ביחס ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ57 — השומר שבניתוב: ⚠️ הטענה שנופלת היא «פעולה מגיבה
   *  מיד», ⭐ והנימוק המדוד הוא שההשבתה **היא** התגובה: ⛔ ניתוב שממתין
   *  להבטחה בלי להשבית מותיר את הכפתור חי, ⚠️ ולחיצה שנייה נכנסת.
   *  ⛔ **והמוטציה נושאת איתה את החתימה** — ⚠️ הבלוק חתום. */
  const BZ_A = '/* ═══ כפתור עסוק והשומר שבניתוב';
  const BZ_Z = '/* ═══════════════ סוף מודול כפתור עסוק';
  const bzResign = (h) => {
    const i = h.indexOf(BZ_A), k = h.indexOf(BZ_Z, i), e = h.indexOf('*/', k) + 2;
    const sha = crypto.createHash('sha256').update(h.slice(i, e)).digest('hex').slice(0, 16);
    return caps.replace(/(busyguard:[\s\S]*?block: \{ sha: ')[0-9a-f]{16}/, '$1' + sha);
  };
  {
    const idx = rd('index.html');
    const empty = /writeActs: \[\s*\]/.test(caps);
    if (empty || idx.indexOf('actRun(el, fn)') < 0)
      t(true, 'מ57 · ⭕ אין כאן פעולה שממתינה לכתיבה ברשת — ⛔ והשומר אינו נמדד');
    else {
      const bad = idx.replace('\n  actRun(el, fn);', '\n  fn(el);');
      t(runGateOn({ 'index.html': bad, [CAPS]: bzResign(bad) }, 'test_caps_ui.mjs', () => ({})),
        'מ57 · ניתוב שאינו עובר בשומר **מפיל** את «כפתור שכותב מושבת בזמן הכתיבה»');
      /*  ⭐ מוטציית-נגד: שינוי שם עקבי של דגל השומר ⛔ אינו מפיל — ⚠️ הנמדד
       *  הוא הצורה «דגל על האלמנט שיוצא מוקדם», ⛔ ולא השם. */
      const okS = idx.split('_actBusy').join('_actPending');
      t(!runGateOn({ 'index.html': okS, [CAPS]: bzResign(okS) }, 'test_caps_ui.mjs', () => ({})),
        'נ36 · ⭐ שינוי שם עקבי של דגל השומר ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ58 — פעולה מוצהרת שאינה מחזירה: ⚠️ הטענה שנופלת היא
   *  «כפתור שכותב מושבת בזמן הכתיבה», ⭐ והנימוק המדוד הוא שהשומר יושב
   *  בניתוב: ⛔ מטפל שאינו מחזיר את ההבטחה אינו נכנס אליו כלל, ⚠️ והכפתור
   *  נשאר חי בזמן שהכתיבה באוויר. */
  {
    const m = /writeActs: \[([^\]]*)\]/.exec(caps);
    const names = m ? (m[1].match(/'[a-z0-9-]+'/g) || []).map((s) => s.slice(1, -1)) : [];
    if (!names.length) t(true, 'מ58 · ⭕ אין כאן פעולה שממתינה לכתיבה ברשת — ⛔ ואין מה למוטט');
    else {
      const idx = rd('index.html');
      const re = new RegExp("('" + names[0] + "'\\s*:\\s*function\\s*\\([^)]*\\)\\s*\\{\\s*)return\\s+");
      const bad = idx.replace(re, '$1');
      t(bad !== idx && runGateOn({ 'index.html': bad }, 'test_caps_ui.mjs', () => ({})),
        'מ58 · פעולה מוצהרת שאינה מחזירה את ההבטחה **מפילה** את «כפתור שכותב מושבת בזמן הכתיבה»');
      /*  ⭐ מוטציית-נגד: שורת שמירה שנוספה לפני ה-`return` ⛔ אינה
       *  מפילה — ⚠️ הנמדד הוא ש**המטפל מחזיר**, ⛔ ולא מה קודם לכך:
       *  ⭐ ושם הפונקציה שהוא מחזיר יושב בבלוק חתום, ⛔ ואינו מקרה
       *  לשינוי שם. */
      const gm = new RegExp("('" + names[0] + "'\\s*:\\s*function\\s*\\(([^)]*)\\)\\s*\\{\\s*)return\\s").exec(idx);
      if (!gm) t(true, 'נ37 · ⭕ המטפל אינו נפתח ב-`return` — ⛔ ואין לאן להוסיף');
      else {
        const okS = idx.replace(gm[0], gm[1] + 'if (!' + (gm[2].trim() || 'el') + ') return null;\n    return ');
        t(okS !== idx && !runGateOn({ 'index.html': okS }, 'test_caps_ui.mjs', () => ({})),
          'נ37 · ⭐ שומר שנוסף לפני ה-`return` ⛔ **אינו** מפיל');
      }
    }
  }
  /*  ⛔⛔ מ53 — שם שירד חוזר לחיים: ⚠️ הטענה שנופלת היא «ערכת
   *  נושא — בהיר וכהה», ⭐ והנימוק המדוד הוא שאוצר מילים שנבדל מכריח כלל
   *  CSS פרטי — ⛔ וכלל משותף אינו יכול לנקוב בשם שקיים באחת בלבד. */
  {
    const idx = rd('app.css');
    if (idx.indexOf('--border') < 0) t(true, 'מ53 · ⭕ אין כאן `--border` — ⛔ ואין מה למוטט');
    else
      t(runGateOn({ 'app.css': idx.split('--border').join('--line') },
                  'test_caps_ui.mjs', () => ({})),
        'מ53 · `--line` במקום `--border` **מפיל** את «ערכת נושא — בהיר וכהה»');
  }
  /*  ⭐ מוטציית-נגד: שינוי שם עקבי — האסימון והמרשם יחד ⛔ אינו מפיל:
   *  ⚠️ אוצר מילים אחד אינו «אותו שם לנצח», ⭐ והוא נמדד מול המרשם
   *  ⛔ ולא מול מחרוזת קפואה. */
  {
    const idx = rd('index.html'), caps = rd('tools/check-capabilities.mjs');
    if (idx.indexOf('--text-2') < 0) t(true, 'נ32 · ⭕ אין כאן `--text-2` — ⛔ ואין מה להחליף');
    else
      t(!runGateOn({ 'index.html': idx.split('--text-2').join('--text-2'),
                     'tools/check-capabilities.mjs': caps.split("'--text-2'").join("'--text-2'") },
                   'test_caps_ui.mjs', () => ({})),
        'נ32 · ⭐ שינוי שם עקבי של אסימון הטקסט המשני ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ50 — צבע הזהות: ⚠️ **מה נכנס**: כלל `#updater.in`,
   *  ⛔ **ומה מפיל**: משטח הבאנר שנגזר מדיו הטקסט במקום מ-`--brand`:
   *  ⭐ גווני הטקסט הם אותו כהה, ⚠️ והבאנרים נראו זהים. */
  {
    const idx = rd('index.html');
    const hit = /#updater \.in\{\s*background:var\(--brand\)/.exec(idx);
    if (!hit) t(true, 'מ50 · ⭕ אין כאן כלל `#updater .in` — ⛔ ואין מה למוטט');
    else
      t(runGateOn({ 'index.html': idx.replace('#updater .in{\n  background:var(--brand)',
                                              '#updater .in{\n  background:var(--text)') },
                  'test_caps_ui.mjs', () => ({})),
        'מ50 · משטח הבאנר מדיו הטקסט **מפיל** את «ערכת נושא — בהיר וכהה»');
  }
  /*  ⭐ מוטציית-נגד: שינוי שם עקבי — האסימון, ההכרזה והכלל יחד ⛔ אינו
   *  מפיל: ⚠️ זה בדיוק השינוי החי שהתקן בא להתיר, ⭐ ושם אחד בכולן
   *  אינו «אותו שם לנצח». */
  {
    /*  ⛔ הצמד מוחלף **יחד** ⛔ ולא חצי ממנו — ⚠️ המוסכמה
     *  `--on-X` היא מה שקושר בין השניים, ⭐ ושינוי חצי הוא ניתוק
     *  הצמד ⛔ ולא שינוי שם. */
    const idx = rd('index.html'), css = rd('app.css'), caps = rd('tools/check-capabilities.mjs');
    const ren = (s) => s.split('--on-brand').join('--on-ident')
                        .replace(/--brand(?![-A-Za-z0-9])/g, '--ident');
    if (css.indexOf('--on-brand') < 0) t(true, 'נ30 · ⭕ אין כאן `--on-brand` — ⛔ ואין מה להחליף');
    else
      t(!runGateOn({ 'index.html': ren(idx), 'app.css': ren(css),
                     'tools/check-capabilities.mjs': ren(caps) },
                   'test_caps_ui.mjs', () => ({})),
        'נ30 · ⭐ שינוי שם עקבי של הצמד כולו ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ71 — סגנון מוטבע חוזר: ⚠️ **מה נכנס**: תגית שנושאת
   *  `style="…"` מחוץ לאזור מוצהר; ⛔ **ומה מפיל**: הטענה «אין סגנון
   *  מוטבע» — ⭐ צבע ורוחב שנכתבים בתגית אינם מקבלים שינוי ערכה. */
  {
    const idx = rd('index.html');
    t(runGateOn({ 'index.html': idx.replace('<div id="toasts"',
                                            '<div style="color:red" id="toasts"') },
                'test_caps_ui.mjs', () => ({})),
      'מ71 · `style="…"` מחוץ לאזור מוצהר **מפיל** את «אין סגנון מוטבע»');
  }
  /*  ⛔⛔ מ72 — ערך מספרי שאינו מהסולם: ⚠️ **מה נכנס**: הצהרת
   *  ריווח בכלל CSS; ⛔ **ומה מפיל**: הטענה «סולם אחד לגודל, לריווח
   *  ולרדיוס» — ⭐ ערך שנבחר לאתר בודד הוא סולם שלא הוגדר. */
  {
    /*  ⛔ הכלל נבחר מהגיליון ⛔ ואינו מוקלד — ⚠️ מחלקה שיורדת משאירה
     *  מוטציה שמחליפה מחרוזת שאינה שם, ⭐ והיא עוברת בשתיקה. */
    const idx = rd('app.css');
    const hit = /\n(\.u-[a-z0-9-]+\{)([^}]*)\}/.exec(idx);
    if (!hit) {
      t(true, 'מ72 · ⭕ אין כאן מחלקת שירות בגיליון — ⛔ ואין מה למוטט');
    } else {
      t(runGateOn({ 'app.css': idx.replace(hit[0],
                      '\n' + hit[1] + hit[2] + ';padding:7px}') },
                  'test_caps_ui.mjs', () => ({})),
        'מ72 · ערך ריווח שאינו מהסולם **מפיל** את «סולם אחד לגודל, לריווח ולרדיוס»');
    }
  }
  /*  ⭐ מוטציית-נגד: מחלקה חדשה שכל ערכיה מהסולם ⛔ אינה מפילה — ⚠️ זה
   *  בדיוק השינוי החי שהתקן בא להתיר, ⭐ והנמדד הוא מקור הערך ⛔ ולא
   *  מספר המחלקות. */
  {
    const idx = rd('index.html');
    t(!runGateOn({ 'index.html': idx.replace('.u-ai-c{align-items:center}',
                    '.u-ai-c{align-items:center}\n.u-zz-new{padding:var(--sp-4);border-radius:var(--r-2)}') },
                 'test_caps_ui.mjs', () => ({})),
      'נ45 · ⭐ מחלקה חדשה שערכיה מהסולם ⛔ **אינה** מפילה');
  }
  /*  ⛔⛔ מ70 — מטפל שכותב ואינו מחזיר את ההבטחה: ⚠️ **מה נכנס**:
   *  ה-`return` שבראש המטפל הראשון שב-`APP.writeActs`, ⛔ **ומה מפיל**:
   *  הסרתו — ⭐ מטפל שאינו מחזיר אינו נכנס לשומר כלל, ⚠️ והכפתור נשאר חי
   *  בזמן הכתיבה: ⛔ נמדד שחמישה מטפלי מחיקה היו כך, ⚠️ וה-probe אישר
   *  אותם מפני שגבול ה-`return` שלו התאים תמיד. */
  {
    const capsTxt = rd('tools/check-capabilities.mjs');
    const idx = rd('index.html');
    const wa = /writeActs: \[([\s\S]*?)\]/.exec(capsTxt);
    const acts = wa ? (wa[1].match(/'([^']+)'/g) || []).map((x) => x.slice(1, -1)) : [];
    /*  ⛔ המטפל נבחר מהמוצהר ⛔ ואינו מוקלד — ⚠️ שם שהוקלד נסחף בכל שינוי
     *  במפת הפעולות, ⭐ והמוטציה מפסיקה לפגוע במה שהיא באה למדוד.
     *  ⛔ **והגוף נחתך בהתאמת סוגריים** — ⚠️ מטפל נכתב בשורה אחת באחת
     *  ובכמה שורות באחרת, ⭐ ותבנית שנשענת על שורה חדשה מוצאת חלק מהם. */
    const bodyAt = (t, o) => {
      let d = 0;
      for (let i = o; i < t.length; i++) {
        if (t[i] === '{') d++;
        else if (t[i] === '}' && !--d) return t.slice(o, i + 1);
      }
      return '';
    };
    let head = '';
    for (const act of acts) {
      const m = new RegExp("'" + act + "':\\s*function\\s*\\([^)]*\\)\\s*\\{").exec(idx);
      if (!m) continue;
      const body = bodyAt(idx, idx.indexOf('{', m.index + m[0].length - 1));
      if (/[{;]\s*return\s+[A-Za-z_$]/.test(body)) { head = m[0] + body.slice(1); break; }
    }
    if (!head) t(true, 'מ70 · ⭕ אין כאן מטפל שמחזיר הבטחה — ⛔ ואין מה למוטט');
    else {
      const cut = head.replace(/return\s+([A-Za-z_$])/, '$1');
      t(runGateOn({ 'index.html': idx.replace(head, cut) }, 'test_caps_ui.mjs', () => ({})),
        'מ70 · מטפל בלי `return` **מפיל** את «כפתור שכותב מושבת בזמן הכתיבה»');
      /*  ⭐ מוטציית-נגד: קוד חי שנוסף לפני ההחזרה ⛔ אינו מפיל — ⚠️ שינוי
       *  חי ⛔ ולא הערה, ⭐ והנמדד הוא ההחזרה ⛔ ולא מה שקודם לה. */
      const add = head.replace(/return\s+([A-Za-z_$])/, 'var _r137 = 1; void _r137; return $1');
      t(!runGateOn({ 'index.html': idx.replace(head, add) }, 'test_caps_ui.mjs', () => ({})),
        'נ44 · ⭐ קוד חי שנוסף לפני ההחזרה ⛔ **אינו** מפיל');
    }
  }
}

console.log(fail ? `\n✗ ${GATE_ID} — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ ${GATE_ID} — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
