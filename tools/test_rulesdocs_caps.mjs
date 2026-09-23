#!/usr/bin/env node
/*  test_rulesdocs_caps.mjs — רתמת המוטציות של בודק היכולות.
 *
 *  **מה נאכף:** ⛔ כל טענה של `check-capabilities` וחלקיו שהטבלה מצביעה
 *  עליה נושאת מוטציה שמפילה אותה ומוטציית-נגד שאינה מפילה — ⚠️ והבודק
 *  האמיתי רץ על עותק מוטט, ⭐ ומה שנמדד הוא קוד היציאה שלו.
 *
 *  **הנימוק המדוד:** ⛔ ה-probe מדד **שערים**, ⚠️ וטענה בתוך שער אינה
 *  שער: ⭐ טענות של הבודק חמקו ממדידת הכיסוי, ⛔ והרתמה שלהן ישבה בשער
 *  התיעוד וחצתה את מחצית תקרת הסט.
 *
 *  **מה יישבר בלעדיו:** ⛔ טענה שאיש אינו מוטט היא טענה שאיש לא הוכיח
 *  שהיא מפילה, ⚠️ והשורה שהיא אוכפת נראית מכוסה.
 *
 *  **מה אינו נאכף כאן:** ⛔ מוטציות התיעוד וההערות — ⚠️ הן ב-
 *  `test_rulesdocs`, ⭐ והרתמה המשותפת של שניהם היא מה שסורק הכיסוי קורא.
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
const FLOOR = { shared: 42, app: 0, appWhy: '' };
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
 *  טענה שהטבלה מצביעה עליה נושאת מוטציה, ⛔ והרתמה הזו היא מקומן. */
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
const DOC = rd('CLAUDE.md');

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
  WORK = fs.mkdtempSync(path.join(os.tmpdir(), FACTS.slug + '-rdcaps-'));
  execFileSync('cp', ['-r', ROOT + '/.', WORK]);
  /*  ⛔ המחיקה על יציאה — ⚠️ נמדד: העותק נשאר בכל הרצה,
   *  ⛔ ומאות עותקי עץ מילאו את הדיסק. */
  process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) {} });
  return WORK;
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
/*  ⛔⛔ מ79 · מ80 · נ51 — כל טענה נושאת מוטציה או שורת נימוק:
 *  ⚠️ **מה נכנס**: כל טענה ש-`GATES` מצביעה עליה, מול אזור המוטציות
 *  ומול הרתמה; ⛔ **ומה מפיל**: טענה בלי שניהם, ⚠️ ונימוק לטענה
 *  שמוטציה נוקבת בשמה. ⭐ **והנימוק המדוד**: ה-probe מדד **שערים**,
 *  ⛔ וטענה בתוך שער אינה שער: ⚠️ והיא חמקה. */
{
  const CAPS = 'tools/check-capabilities.mjs';
  const caps = rd(CAPS), harn = rd('tools/test_rulesdocs.mjs');
  /*  ⛔ הטענה נבחרת מהמרשם ⛔ ואינה מוקלדת — ⚠️ מפתח קשיח נסחף. */
  const r0 = caps.indexOf('const CLAIM_NO_MUT = {');
  const ent = /\n  ('[^']+'):\n    '([^']*)',/.exec(caps.slice(r0));
  if (!ent) {
    t(true, 'מ79 · ⭕ אין כאן מרשם נימוקים — ⛔ ואין מה למוטט');
  } else {
    const at = r0 + ent.index;
    t(runGateOn({ [CAPS]: caps.slice(0, at) +
                    '\n  ' + ent[1] + ':\n    \'\',' +
                    caps.slice(at + ent[0].length) },
                'check-capabilities.mjs', () => ({})),
      'מ79 · הסרת שורת נימוק מטענה שאין לה מוטציה **מפילה** את ' +
      '«מוטציות — כיסוי»');
  }
  /*  ⛔ הטענה שמוטציה נוקבת בשמה — ⚠️ שמה חי ברתמה בלבד, ⭐ ובשער
   *  שאוכף אותה אין אזור מוטציות. */
  /*  ⛔ השם נבנה משני חלקים — ⚠️ ליטרל מלא היה מופע שני ברתמה. */
  const NAMED = 'תווית מוטציה' + ' מודפסת';
  if (harn.split(NAMED).length !== 2) {
    t(true, 'מ80 · ⭕ שם הטענה אינו יחיד ברתמה — ⛔ ואין מה למוטט');
    t(true, 'נ51 · ⭕ שם הטענה אינו יחיד ברתמה — ⛔ ואין מה להחליף');
  } else {
    t(runGateOn({ 'tools/test_rulesdocs.mjs':
                    harn.replace(NAMED, 'תווית מוטציה שנדפסה') },
                'check-capabilities.mjs', () => ({})),
      'מ80 · הסרת המוטציה מטענה **מפילה** את «מוטציות — כיסוי»');
    /*  ⭐ מוטציית-נגד: שם שנקצר בעקביות ⛔ אינו מפיל — ⚠️ הנמדד
     *  הוא **שיש לה מוטציה** ⛔ ולא ניסוחה. */
    t(!runGateOn({ [CAPS]: caps.replace("'" + NAMED + "'", "'תווית מוטציה'") },
                 'check-capabilities.mjs', () => ({})),
      'נ51 · ⭐ טענה עם מוטציה, בשם שהוחלף בעקביות, ⛔ **אינה** מפילה');
  }
}

/*  ⛔ מוטציה: הצהרת מיזוג-מפה שאין לה אתר — ⚠️ הטענה שנופלת היא
 *  «מחיקת מפתח בערך משותף»: ⭐ רשימת-היתר שהתיישנה היא בעצמה השארית
 *  שהשורה באה לסלק. */
{
  const CAPS = 'tools/check-capabilities.mjs';
  const caps = rd(CAPS);
  /*  ⛔ שורה שסימונה ⭕ אינה מריצה את ה-probe כלל — ⚠️ ולכן אין בה מה
   *  למוטט, ⭐ והדילוג נושא נימוק ⛔ ואינו שקט: ⚠️ מספר השורה נגזר משמה
   *  ⛔ ואינו מוקלד, ⭐ והחריגה נקראת מרשימת ההחרגה שבשער. */
  const rowNo24 = Number((/^\|\s*(\d+)\s*\|\s*מיזוג מכל/m.exec(DOC) || [])[1]);
  const gaps24 = ((/gapRows: \[([^\]]*)\]/.exec(caps) || [, ''])[1].match(/\d+/g) || []).map(Number);
  if (gaps24.includes(rowNo24)) {
    t(true, `מ24 · ⭕ בשורה ${rowNo24} — ה-probe אינו רץ כאן, ⛔ ואין מה למוטט`);
  } else {
    t(runGateOn({ [CAPS]: caps.replace(/mergePoints: \[/, "mergePoints: ['mergeNothing', ") },
                'test_caps_build.mjs', () => ({})),
      'מ24 · הצהרת נקודת-מיזוג בלי אתר בפועל **מפילה** את «מיזוג מכל»');
  }
  /*  ⭐ מוטציית-נגד: שם מקומי שהוחלף בעקביות בגוף ה-probe ⛔ אינו מפיל —
   *  ⚠️ המנגנון לא נגע, ⭐ ורק השם השתנה. */
  t(!runGateOn({ [CAPS]: caps
      .replace('const maps = keyMapMerges();', 'const found = keyMapMerges();')
      .replace('for (const f of maps) {', 'for (const f of found) {')
      .replace('const found = maps.concat(pairs);', 'const all = found.concat(pairs);')
      .replace('if (!found.some((f) => f.name === n))', 'if (!all.some((f) => f.name === n))') },
              'test_caps_build.mjs', () => ({})),
    'נ15 · ⭐ שם מקומי שהוחלף בעקביות בגוף ה-probe ⛔ **אינו** מפיל');
  /*  ⛔⛔ מ32 — שער שקורא את המקור ואינו מוצהר ב-`scanKind`:
   *  ⚠️ הטענה שנופלת היא «שער סורק קוד מולבן», ⭐ וההצהרה היא כל מה
   *  שיש: ⛔ בלעדיה איש אינו יודע אם השער מודד קוד או טקסט. */
  t(runGateOn({ [CAPS]: caps.replace(/^    'check-comments': 'raw[^\n]*\n/m, '') },
              'check-capabilities.mjs', () => ({})),
    'מ32 · שער שקורא את המקור ואינו מוצהר **מפיל** את «שער סורק קוד מולבן»');
  /*  ⭐ מוטציית-נגד: אותה הצהרה בנימוק אחר ⛔ אינה מפילה — ⚠️ הנמדד הוא
   *  **שיש נימוק**, ⛔ ולא ניסוחו. */
  t(!runGateOn({ [CAPS]: caps.replace(/^(    'check-comments': 'raw — )[^']*'/m,
                                      "$1מודד טקסט שההלבנה מוחקת, ולכן גולמי'") },
               'check-capabilities.mjs', () => ({})),
    'נ20 · ⭐ אותה הצהרה בנימוק אחר ⛔ **אינה** מפילה');
  /*  ⛔⛔ מ36 — דפוס שנפתח בשם מוצהר בלי גבול: ⚠️ הטענה
   *  שנופלת היא «RegExp מהצהרה בלי גבול», ⭐ והנימוק המדוד הוא הבאג
   *  שחי חמישה סבבים — ⛔ `ACTIONS[act]` התאים למפה ששמה `DOM_ACTIONS`. */
  /*  ⛔ הצורה העירומה נבנית בשרשור ⛔ ואינה נכתבת כמחרוזת אחת — ⚠️ הסורק
   *  קורא את הקובץ הזה אף הוא, ⭐ ומחרוזת שנושאת את הדפוס הייתה נספרת
   *  כאתר חי. */
  /*  ⛔ האתר החי נבחר בבודק עצמו — ⚠️ האתר הקודם ישב בשער
   *  עובדות המסד ⛔ ונגרע כשהקורא המדומה הוחלף בדפוסי קריאה: ⭐ ומוטציה
   *  שנושאה הוסר עוברת תמיד. */
  const ACT_REF = 'APP.' + 'actMap + ';
  const BOUND_RX = "new RegExp('(?<![\\\\w$.])' + " + ACT_REF;
  const BARE_RX = 'new RegExp(' + ACT_REF;
  t(runGateOn({ [CAPS]: caps.replace(BOUND_RX, BARE_RX) },
              'check-capabilities.mjs', () => ({})),
    'מ36 · דפוס שנפתח בשם מוצהר בלי גבול **מפיל** את «RegExp מהצהרה בלי גבול»');
  /*  ⛔⛔ מ37 — שם מפה שאינו קיים בקוד: ⚠️ הטענה שנופלת היא «הניתוב
   *  אינו עובר במפת הפעולות», ⭐ וזו המדידה שהגבול הפך לאפשרית: ⛔ בלי
   *  הגבול `ACTIONS[act]` היה נמצא בתוך `DOM_ACTIONS[act]`. */
  t(runGateOn({ [CAPS]: caps.replace(/^(  actMap: ')[A-Za-z_$][\w$]*'/m, "$1ACTIONS'") },
              'test_caps_ui.mjs', () => ({})),
    'מ37 · שם מפה שהוא סיומת של השם החי **מפיל** את «מפת הפעולות»');
  /*  ⭐ מוטציית-נגד: גבול שנכתב בצורה שקולה ⛔ אינו מפיל — ⚠️ המנגנון
   *  לא נגע, ⭐ ורק ניסוח הגבול השתנה: ⛔ ושם המפה עצמו אינו ניתן
   *  להחלפה כאן, ⚠️ שהוא יושב גם בבלוק חתום — ⭐ והחתימה הייתה נופלת
   *  במקום הטענה שנמדדת. */
  t(!runGateOn({ [CAPS]: caps.replace(BOUND_RX, 'new RegExp(' + "'(?<![\\\\w$.])(?:)' + " + ACT_REF) },
               'check-capabilities.mjs', () => ({})),
    'נ23 · ⭐ גבול שנכתב בצורה שקולה ⛔ **אינו** מפיל');
  /*  ⛔⛔ מ39 — מיכל באנר העדכון שאינו במקור: ⚠️ הטענה שנופלת
   *  היא «מיכל באנר העדכון במקור», ⭐ והנימוק המדוד הוא שהבאנר נחוץ
   *  בדיוק כשהקוד שרץ הוא הישן — ⛔ ומיכל שנבנה ב-JS קיים רק אחרי
   *  שהקוד רץ. */
  t(runGateOn({ [CAPS]: caps,
                'index.html': rd('index.html').replace('<div id="updater">', '<div id="updaterX">') },
              'test_caps_guard.mjs', () => ({})),
    'מ39 · מיכל באנר העדכון שאינו במקור **מפיל** את «מיכל באנר העדכון במקור»');
  /*  ⛔⛔ מ40 — שער שמריץ את הסט ומוכרז `text`: ⚠️ הטענה
   *  שנופלת היא «שער אינו מריץ את check-js המלא», ⭐ וההמרה הופכת אותו
   *  לבדיקה שאינה יכולה להיכשל — ⛔ בזיכרון הוא היה מודד את עצמו. */
  t(runGateOn({ [CAPS]: caps.replace(/^(\s*'test_readonly':\s*)'behavior[^']*'/m, "$1'text'") },
              'check-capabilities.mjs', () => ({})),
    'מ40 · שער שמריץ את הסט ומוכרז text **מפיל** את «סוג השער מוצהר»');
  /*  ⛔⛔ מ41 — טיימר קצר שמרענן בעצמו: ⚠️ הטענה שנופלת היא
   *  «הרענון מ-controllerchange בלבד», ⭐ והנימוק המדוד הוא הלולאה —
   *  ⛔ הרענון קדם להשתלטות, `reg.waiting` שרד, הבאנר חזר, והלחיצה
   *  הבאה חזרה עליו.
   *  ⛔ **והמוטציה נושאת איתה את החתימה** — ⚠️ הבלוק חתום, ⭐ ובלי
   *  חתימה מחדש הייתה נופלת הליבה ⛔ ולא הטענה שנמדדת. */
  const SW_A = '/* ═══ הרשמת service worker';
  const SW_Z = '/* ═══════════════ סוף מודול הרשמת service worker';
  const swResign = (h) => {
    const i = h.indexOf(SW_A), k = h.indexOf(SW_Z, i), e = h.indexOf('*/', k) + 2;
    const sha = crypto.createHash('sha256').update(h.slice(i, e)).digest('hex').slice(0, 16);
    return caps.replace(/(swreg:[\s\S]*?block: \{ sha: ')[0-9a-f]{16}/, '$1' + sha);
  };
  {
    const bad = rd('index.html').replace(
      '_swWait = setTimeout(function () { swApplyFail(btn, MSG_SW_TIMEOUT); }, SW_APPLY_MS);',
      'setTimeout(function () { _swReloaded = true; location.reload(); }, 1500);');
    t(runGateOn({ 'index.html': bad, [CAPS]: swResign(bad) }, 'test_caps_guard.mjs', () => ({})),
      'מ41 · טיימר קצר שמרענן בעצמו **מפיל** את «הרענון מ-controllerchange בלבד»');
  }
  /*  ⭐ מוטציית-נגד: תקרה ארוכה יותר ⛔ אינה מפילה — ⚠️ המנגנון לא נגע,
   *  ⭐ ורק הערך קודם. */
  {
    const ok = rd('index.html').replace('var SW_APPLY_MS = 10000;', 'var SW_APPLY_MS = 15000;');
    t(!runGateOn({ 'index.html': ok, [CAPS]: swResign(ok) }, 'test_caps_guard.mjs', () => ({})),
      'נ24 · ⭐ תקרת המתנה ארוכה יותר ⛔ **אינה** מפילה');
  }
  /*  ⛔⛔ מ43 — נוסח אחר לחסימת כתיבת המשתמש: ⚠️ הטענה שנופלת
   *  היא «הודעת החסימה», ⭐ והנימוק המדוד הוא ששני ניסוחים לאותה חסימה
   *  הם שני מסלולים בעיני הקורא.
   *  ⛔ **והדילוג נושא נימוק** ⛔ ואינו שקט — ⚠️ אפליקציה בלי טבלת
   *  משתמשים אין לה מה למוטט כאן. */
  {
    const html = rd('index.html');
    /*  ⛔ הנמדד הוא **האתר** ⛔ ולא השם — ⚠️ הקבוע מוצהר בכולן בבלוק
     *  החתום של מחרוזות ההודעה, ⭐ ונקודת המעבר שמחזירה אותו חיה רק במי
     *  שיש בה כניסה: ⛔ הצהרה לבדה אינה מסלול שאפשר למוטט. */
    if (!/return\s+MSG_OFF_USER_WRITE\s*;/.test(html)) {
      t(true, 'מ43 · ⭕ אין כאן טבלת משתמשים — ⛔ ואין מה למוטט');
      t(true, 'מ44 · ⭕ אין כאן אתר אימות שש ספרות — ⛔ ואין מה למוטט');
    } else {
      const bad = html.replace(/(var MSG_OFF_USER_WRITE = ')[^']*/,
                               '$1📴 אין חיבור — הפעולה לא בוצעה');
      t(runGateOn({ 'index.html': bad }, 'test_push.mjs', () => ({})),
        'מ43 · נוסח אחר לחסימת כתיבת המשתמש **מפיל** את «הודעת החסימה»');
      /*  ⛔⛔ מ44 — מחרוזת שנכתבת באתר האימות: ⚠️ הטענה שנופלת היא
       *  «הודעת שש הספרות», ⭐ וזה בדיוק המצב שהיה — שני אתרים, שני
       *  ניסוחים. */
      if (html.indexOf('PASS_SIX_RE') < 0) {
        t(true, 'מ44 · ⭕ אין כאן אתר אימות שש ספרות — ⛔ ואין מה למוטט');
      } else {
        const bare = html.replace(/(PASS_SIX_RE\.test\([^)]*\)\) \{ [a-zA-Z.]+ ?= ?|PASS_SIX_RE\.test\([^)]*\)\) \{ toast\()MSG_PASS_SIX/,
                                  "$1'סיסמה שגויה'");
        t(runGateOn({ 'index.html': bare }, 'test_push.mjs', () => ({})),
          'מ44 · מחרוזת באתר האימות **מפילה** את «הודעת שש הספרות»');
      }
    }
  }
  /*  ⭐ מוטציית-נגד: נוסח אחר להודעה **אחרת** ⛔ אינו מפיל — ⚠️ הטענות
   *  מודדות את ההודעה הייעודית, ⭐ ולא כל הודעת אופליין. */
  {
    const other = rd('index.html').replace(/(var MSG_OFFLINE\s*= ')[^']*/, '$1אין חיבור כרגע');
    t(!runGateOn({ 'index.html': other }, 'test_push.mjs', () => ({})),
      'נ26 · ⭐ נוסח אחר להודעה אחרת ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ46 — מסך שינוי הסיסמה יורד: ⚠️ הטענה שנופלת היא «מסך
   *  שינוי הסיסמה», ⭐ והנימוק המדוד הוא שמשתמש שאינו יכול לשנות סיסמה
   *  בעצמו תלוי במסד בכל שינוי.
   *  ⛔ **והדילוג נושא נימוק** ⛔ ואינו שקט — ⚠️ אפליקציה בלי כניסה אין
   *  לה מסך שיירד. */
  {
    const push = rd('tools/test_push.mjs');
    const scr = /passScreen: \{ open: '([A-Za-z_$][\w$]*)'/.exec(push);
    if (!scr) {
      t(true, 'מ46 · ⭕ אין כאן מסך שינוי סיסמה — ⛔ ואין מה למוטט');
      t(true, 'מ47 · ⭕ אין כאן שכבת טביעה — ⛔ ואין מה למוטט');
    } else {
      const bad = rd('index.html').replace(
        new RegExp('(?:async\\s+)?function\\s+' + scr[1] + '\\s*\\('), 'function _gone' + scr[1] + '(');
      t(runGateOn({ 'index.html': bad }, 'test_push.mjs', () => ({})),
        'מ46 · פותח המסך שנעלם **מפיל** את «מסך שינוי הסיסמה»');
      /*  ⛔⛔ מ47 — עזר שמוצהר ואין לו נימוק: ⚠️ הטענה שנופלת היא «עזר
       *  שקיים כאן בלבד», ⭐ ובדיוק זה מה שהופך שכבה שנבדלה להצהרה
       *  שאיש אינו מאמת. */
      const bare = push.replace(/(\n\s*)fields: '([A-Za-z_$][\w$]*)',/,
                                "$1fields: '$2',$1extra: { name: '$2', why: '' },");
      t(runGateOn({ 'tools/test_push.mjs': bare }, 'test_push.mjs', () => ({})),
        'מ47 · עזר מוצהר בלי נימוק **מפיל** את «עזר שקיים כאן בלבד»');
    }
  }
  /*  ⭐ מוטציית-נגד: שם עזר שהוחלף בעקביות ⛔ אינו מפיל — ⚠️ המנגנון לא
   *  נגע, ⭐ והשכבה עדיין שלוש פונקציות חיות. */
  {
    const push = rd('tools/test_push.mjs');
    const mk = /make: '([A-Za-z_$][\w$]*)',/.exec(push);
    if (!mk) t(true, 'נ28 · ⭕ אין כאן שכבת טביעה — ⛔ ואין מה להחליף');
    else {
      const re = new RegExp('(?<![\\w$.])' + mk[1] + '(?![\\w$])', 'g');
      const ok = { 'index.html': rd('index.html').replace(re, mk[1] + 'X'),
                   'tools/test_push.mjs': push.replace(re, mk[1] + 'X') };
      t(!runGateOn(ok, 'test_push.mjs', () => ({})),
        'נ28 · ⭐ שם עזר שהוחלף בעקביות ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ51 — שם פעולה שנבדל: ⚠️ **מה נכנס**: שתי הפעולות
   *  שב-`APP.passScreen`, ⛔ **ומה מפיל**: שם שנבדל מ-«my-pass»/«my-pass-save»:
   *  ⭐ אותה יכולת בשלושה שמות היא שלושה חיפושים, ⚠️ ומי שמיישר את השלוש
   *  אינו מוצא את השלישית. */
  {
    const push = rd('tools/test_push.mjs');
    const scr = /passScreen: \{ open: '[A-Za-z_$][\w$]*', open_act: '([a-z-]+)'/.exec(push);
    if (!scr) t(true, 'מ51 · ⭕ אין כאן מסך שינוי סיסמה — ⛔ ואין מה למוטט');
    else
      t(runGateOn({ 'tools/test_push.mjs': push.replace("open_act: '" + scr[1] + "'",
                                                        "open_act: 'mypass-open'") },
                  'test_push.mjs', () => ({})),
        'מ51 · שם פעולה שנבדל **מפיל** את «מסך שינוי הסיסמה»');
  }
  /*  ⛔⛔ מ52 — שומר בלי נפילת דיאלוג: ⚠️ הטענה שנופלת היא
   *  «נפילת דיאלוג», ⭐ והנימוק המדוד הוא ששומר שקורא ערך משדה שאינו
   *  ב-DOM זורק: ⛔ והמסלול נגמר בלי שהמשתמש יודע למה. */
  {
    const idx = rd('index.html');
    const hit = /\n(\s*)if \(![a-z]\d? \|\| ![a-z]\d? \|\| ![a-z]\d?\) \{ uiNoDialog\('[A-Za-z_$][\w$]*', 'm[pw]-[a-z]+'\); return; \}/.exec(idx);
    if (!hit) t(true, 'מ52 · ⭕ אין כאן שומר מסך סיסמה — ⛔ ואין מה למוטט');
    else
      t(runGateOn({ 'index.html': idx.replace(hit[0], '') }, 'test_push.mjs', () => ({})),
        'מ52 · שומר בלי `uiNoDialog` **מפיל** את «נפילת דיאלוג»');
  }
  /*  ⭐ מוטציית-נגד: שינוי שם עקבי של השומר — הפונקציה, אתר הקריאה שבמפה
   *  והתווית שב-`uiNoDialog` יחד ⛔ אינו מפיל: ⚠️ המנגנון לא נגע, ⭐ ושמות
   *  הפעולות הם מה שאחיד ⛔ ולא שמות הפונקציות. */
  {
    const idx = rd('index.html');
    const hit = /uiNoDialog\('([A-Za-z_$][\w$]*)', 'm[pw]-[a-z]+'\)/.exec(idx);
    if (!hit) t(true, 'נ31 · ⭕ אין כאן שומר מסך סיסמה — ⛔ ואין מה להחליף');
    else {
      const re = new RegExp('(?<![\\w$.])' + hit[1] + '(?![\\w$])', 'g');
      const push = rd('tools/test_push.mjs');
      t(!runGateOn({ 'index.html': idx.replace(re, hit[1] + 'X'),
                     'tools/test_push.mjs': push.replace(re, hit[1] + 'X') },
                   'test_push.mjs', () => ({})),
        'נ31 · ⭐ שם השומר שהוחלף בעקביות ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ67 — שדה מצב שהוחזר: ⚠️ **מה נכנס**: אזור המצב
   *  שירד במלואו, ⛔ **ומה מפיל**: פונקציית מצב שהוחזרה לקוד בלי
   *  שורה בטבלה ובלי שער — ⭐ שבע פונקציות ושני מזהים ירדו יחד,
   *  ⚠️ ומי שמחזיר אחת מהן מחזיר חצי רכיב. */
  {
    const idx = rd('index.html');
    const at = idx.indexOf('window.actRun = actRun;');
    if (at < 0) t(true, 'מ67 · ⭕ אין כאן נקודת הזרקה — ⛔ ואין מה למוטט');
    else t(runGateOn({ 'index.html': idx.slice(0, at) +
             'function bkLastAt() { return 0; }\nwindow.bkLastAt = bkLastAt;\n' + idx.slice(at) },
                     'check-capabilities.mjs', () => ({})),
           'מ67 · פונקציית מצב שהוחזרה **מפילה** את «פונקציה בלי קוראים»');
  }
  /*  ⛔⛔ מ55 — סינון המטמון בקידומת האחסון: ⚠️ הטענה שנופלת היא
   *  «סימן דחיית הבאנר מתמיד», ⭐ והנימוק המדוד הוא שהקידומות מתלכדות
   *  היום **במקרה** — ⛔ ושם אחסון שישתנה יחזיר רשימה ריקה, ⚠️ וסימן
   *  שנשען על מחרוזת ריקה מת בשקט.
   *  ⛔ **והמוטציה נושאת איתה את החתימה** — ⚠️ הבלוק חתום. */
  {
    const idx = rd('index.html');
    if (idx.indexOf('LS_CFG.cachePrefix') < 0)
      t(true, 'מ55 · ⭕ אין כאן `cachePrefix` — ⛔ ואין מה למוטט');
    else {
      const bad = idx.replace('indexOf(LS_CFG.cachePrefix)', 'indexOf(LS_CFG.hzPrefix)');
      t(runGateOn({ 'index.html': bad, [CAPS]: swResign(bad) }, 'test_caps_guard.mjs', () => ({})),
        'מ55 · סינון המטמון בקידומת האחסון **מפיל** את «סימן דחיית הבאנר מתמיד»');
    }
  }
  /*  ⭐ מוטציית-נגד: קידומת אחרת בשני הקבצים יחד ⛔ אינה מפילה — ⚠️ הנמדד
   *  הוא **ההתאמה** בין `LS_CFG.cachePrefix` ל-`SW_CFG.prefix`, ⛔ ולא
   *  הערך עצמו. */
  {
    const idx = rd('index.html'), sw = rd('sw.js');
    const m = /cachePrefix: '([^']*)'/.exec(idx);
    if (!m) t(true, 'נ34 · ⭕ אין כאן `cachePrefix` — ⛔ ואין מה להחליף');
    else {
      const to = m[1] + 'x';
      const ok2 = { 'index.html': idx.split("cachePrefix: '" + m[1] + "'").join("cachePrefix: '" + to + "'"),
                    'sw.js': sw.split("prefix: '" + m[1] + "'").join("prefix: '" + to + "'") };
      ok2[CAPS] = swResign(ok2['index.html']);
      t(!runGateOn(ok2, 'test_caps_guard.mjs', () => ({})),
        'נ34 · ⭐ קידומת מטמון אחרת בשני הקבצים ⛔ **אינה** מפילה');
    }
  }
  /*  ⛔⛔ מ54 — שומר כפול: ⚠️ הטענה שנופלת היא «שומר אחד לכל
   *  פעולה», ⭐ והנימוק המדוד הוא שהניתוב כבר מנטרל את הכפתור —
   *  ⛔ ושומר שני משחרר אותו בעוד הראשון מחזיק. ⚠️ **והמוטציה חלה רק
   *  כשיש שומר בניתוב** — ⭐ ובשלוש שאין בהן, אין שומר כפול שאפשר להחזיר. */
  {
    const inp = rd('tools/test_inputlayer.mjs'), idx = rd('index.html');
    const bf = /busyFn:\s*'([A-Za-z_$][\w$]*)'/.exec(inp);
    const act = /'[a-z0-9-]+':\s*function \(\) \{ return ([A-Za-z_$][\w$]*)\(\); \},/.exec(idx);
    if (!bf || !/routeGuard:\s*'/.test(inp) || !act)
      t(true, 'מ54 · ⭕ אין כאן שומר בנקודת הניתוב — ⛔ ואין שומר כפול שאפשר להחזיר');
    else {
      /*  ⛔ שתי צורות ההגדרה ⛔ ולא אחת — ⚠️ המטפל מחזיר גם פונקציה
       *  שאינה `async` אך מחזירה הבטחה, ⭐ ומוטציה שחיפשה `async` בלבד
       *  לא נכתבה כלל: ⛔ ובדיוק זו «מוטציה שלא רצה». */
      const head = ['async function ' + act[1] + '() {', 'function ' + act[1] + '() {']
                     .find((h) => idx.indexOf(h) >= 0);
      if (!head) t(true, 'מ54 · ⭕ המטפל אינו מחזיר פונקציה מוגדרת בשם — ⛔ ואין מה למוטט');
      else
        t(runGateOn({ 'index.html': idx.replace(head, head + '\n  ' + bf[1] + '(null, true);') },
                    'test_inputlayer.mjs', () => ({})),
          'מ54 · שומר בגוף המטפל **מפיל** את «שומר אחד לכל פעולה»');
    }
  }
  /*  ⭐ מוטציית-נגד: שינוי שם עקבי של המגן — הקריאות וההכרזה יחד ⛔ אינו
   *  מפיל: ⚠️ הנמדד הוא **מיקום** השומר ⛔ ולא שמו. */
  {
    const inp = rd('tools/test_inputlayer.mjs'), idx = rd('index.html');
    const bf = /busyFn:\s*'([A-Za-z_$][\w$]*)'/.exec(inp);
    if (!bf || !/routeGuard:\s*'/.test(inp))
      t(true, 'נ33 · ⭕ אין כאן שומר בנקודת הניתוב — ⛔ ואין מה להחליף');
    else
      t(!runGateOn({ 'index.html': idx.split(bf[1]).join(bf[1] + 'Wait'),
                     'tools/test_inputlayer.mjs': inp.split(bf[1]).join(bf[1] + 'Wait') },
                   'test_inputlayer.mjs', () => ({})),
        'נ33 · ⭐ שינוי שם עקבי של מגן השליחה הכפולה ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ73 — ליטרל באזור המוצהר שאינו ערך אסימון: ⚠️ **מה
   *  נכנס**: ליטרל צבע בתוך אזור ש-`APP.inlineStyleAllow` מכריז;
   *  ⛔ **ומה מפיל**: ההצלבה לאסימון — ⭐ הדוח נצרב לתמונה, ⚠️ וליטרל
   *  שאינו ערכו הבהיר של אסימון מייצר דוח בצבע שאינו של האפליקציה. */
  {
    const idx = rd('index.html');
    if (idx.indexOf('background:#1A2540') < 0)
      t(true, 'מ73 · ⭕ אין כאן אזור סגנון מוטבע מוצהר עם ליטרל צבע — ⛔ ואין מה למוטט');
    else
      t(runGateOn({ 'index.html': idx.replace('background:#1A2540', 'background:#1A2541') },
                  'check-capabilities.mjs', () => ({})),
        'מ73 · ליטרל שאינו ערך אסימון **מפיל** את «ליטרל צבע בסגנון מוטבע»');
  }
  /*  ⛔⛔ מ74 — טענת היעדר שנשמטה: ⚠️ **מה נכנס**: רשומה
   *  ב-`APP.absenceClaims`; ⛔ **ומה מפיל**: `probe` שהכרעתו נוכחות על
   *  המקור כולו ואינו טענת היעדר מוכרזת — ⭐ ואין לו חריגה אחרת. */
  {
    const caps = rd(CAPS);
    const decl = "    '183|מחיקה רכה בלבד — אין `DELETE` פיזי':\n";
    const at = caps.indexOf(decl);
    const end = at < 0 ? -1 : caps.indexOf("',\n", caps.indexOf("\n", at + decl.length));
    t(at >= 0 && end > at && runGateOn({ [CAPS]: caps.slice(0, at) + caps.slice(end + 3) },
                'check-capabilities.mjs', () => ({})),
      'מ74 · טענת היעדר שנשמטה **מפילה** את «probe שבודק נוכחות ולא מיקום»');
  }
  /*  ⭐ מוטציית-נגד: ניסוח אחר לאותו נימוק ⛔ אינו מפיל — ⚠️ הנמדד הוא
   *  שההכרזה קיימת ונושאת נימוק, ⭐ ולא המילים עצמן. */
  {
    const caps = rd(CAPS);
    const was = 'ששם כפול נתפס בשורת הפונקציות בלי קוראים';
    if (caps.indexOf(was) < 0)
      t(true, 'נ46 · ⭕ אין כאן את הנימוק הזה — ⛔ ואין מה להחליף');
    else
      t(!runGateOn({ [CAPS]: caps.replace(was, 'ושם כפול נתפס בשורת הפונקציות שאין להן קוראים') },
                   'check-capabilities.mjs', () => ({})),
        'נ46 · ⭐ ניסוח אחר לאותו נימוק ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ45 — סימן דחייה בזיכרון: ⚠️ הטענה שנופלת היא «סימן
   *  דחיית הבאנר מתמיד», ⭐ והנימוק המדוד הוא שהסימן מתאפס בטעינה —
   *  ⛔ ואז הבאנר חוזר בכל טעינה, בלי שדבר השתנה.
   *  ⛔ **והמוטציה נושאת איתה את החתימה** — ⚠️ הבלוק חתום. */
  {
    const bad = rd('index.html').replace(
      "if (v && v === lsGet(LS_CFG.dismissKey, '')) return;",
      'if (v && _swAccepted) return;');
    t(runGateOn({ 'index.html': bad, [CAPS]: swResign(bad) }, 'test_caps_guard.mjs', () => ({})),
      'מ45 · סימן דחייה בזיכרון **מפיל** את «סימן דחיית הבאנר מתמיד»');
  }
  /*  ⭐ מוטציית-נגד: מפריד אחר במזהה הגרסה ⛔ אינו מפיל — ⚠️ המנגנון לא
   *  נגע, ⭐ והמזהה עדיין נגזר משמות המטמון החיים. */
  {
    const ok = rd('index.html').replace(".sort().join('|');", ".sort().join('#');");
    t(!runGateOn({ 'index.html': ok, [CAPS]: swResign(ok) }, 'test_caps_guard.mjs', () => ({})),
      'נ27 · ⭐ מפריד אחר במזהה הגרסה ⛔ **אינו** מפיל');
  }
  /*  ⛔ מוטציה: זוג-רשומה שמעתיק את שדות הבסיס בלבד — ⚠️ בדיוק
   *  המנוע שהוחלף: ⭐ הטענה שנופלת היא «מיזוג מכל».
   *  ⛔ **והזוג מוזרק ומוצהר** ⛔ ולא נחתך מהקיים — ⚠️ בשתיים מהן אין
   *  זוג כזה כלל, ⭐ ומוטציה שנשענת עליו לא הייתה רצה שם.
   *  ⛔ **ומוטציית-נגד אחת משרתת את שלוש המוטציות שכאן** — ⚠️ **זה אותו
   *  עץ בדיוק**, ⭐ והיא מודדת אותו נקי: ⛔ עותק שני ושלישי שלה היו
   *  שלושה תהליכי `node` נוספים על אותה מדידה — ⚠️ והם נמדדו: כעשר
   *  שניות בתקציב הסט של האפליקציה הגדולה. */
  {
    const SRC = 'index.html', CAP = 'tools/check-capabilities.mjs';
    /*  ⭐ המכווץ שבבדיקה **מכווץ** — ⛔ מפת ערכים שמכריעה אם פריט נכנס,
     *  ⚠️ ומ27 היא זו שמחליפה אותו בשרשור. */
    const COLLAPSING = 'function mergeItemsX(a, b) {\n' +
      '  var seen = {}, out = [];\n' +
      '  (a || []).concat(b || []).forEach(function (v) { if (seen[v]) return; seen[v] = 1; out.push(v); });\n' +
      '  return out;\n}\n';
    const CONCAT = 'function mergeItemsX(a, b) { return (a || []).concat(b || []); }\n';
    const stubs = 'function recTsX(r) { return (r && r.updatedAt) || 0; }\n' + COLLAPSING;
    const exp = 'window.zzPair = zzPair; window.recTsX = recTsX; window.mergeItemsX = mergeItemsX;\n';
    const head = stubs + 'function zzPair(loc, rem, k, pend) {\n' +
      '  var base = pend || recTsX(loc) > recTsX(rem) ? loc : rem;\n' +
      '  var out = {};\n' +
      '  Object.keys(base).forEach(function (kk) { out[kk] = base[kk]; });\n';
    const tail = '  return out;\n}\n' + exp;
    /*  ⛔ ההזרקה נכנסת **לתוך בלוק הסקריפט הקיים** ⛔ ולא כבלוק שני —
     *  ⚠️ הנימוק המדוד: בלוק `<script>` נוסף הסיט את חילוץ הקוד הפרטי,
     *  ⭐ והשער נפל על «פונקציית העלייה לא נמצאה»: ⛔ מוטציה שמפילה טענה
     *  אחרת אינה אכיפה. */
    const inject = (body, extra) => {
      const app = rd(SRC), at = app.lastIndexOf('</script>');
      return app.slice(0, at) + head + body + tail + (extra || '') + app.slice(at);
    };
    /*  ⛔ הזוג המוזרק מוצהר בשני המרשמים — ⚠️ נקודת מיזוג שאין לה הצהרת
     *  כיווץ מפילה בעצמה, ⭐ ואז המוטציה הייתה מפילה טענה אחרת. */
    const declare = rd(CAP)
      .replace(/mergePoints: \[/, "mergePoints: ['zzPair', ")
      .replace(/listCollapse: \{/, "listCollapse: { zzPair: 'mergeItemsX', ");
    const pairBody = '  out.items = mergeItemsX(loc.items, rem.items);\n';
    /*  ⛔ שורה שסימונה ⭕ אינה מריצה את ה-probe כלל — ⚠️ ולכן אין בה מה
     *  למוטט, ⭐ והדילוג נושא נימוק ⛔ ואינו שקט: ⚠️ מספר השורה נגזר משמה
     *  ⛔ ואינו מוקלד, ⭐ והחריגה נקראת מרשימת ההחרגה שבשער. */
    const rowNo = Number((/^\|\s*(\d+)\s*\|\s*מיזוג מכל/m.exec(DOC) || [])[1]);
    /*  ⛔ שתי שורות ושני probe — ⚠️ «מיזוג מכל» מודדת את המבנה,
     *  ⭐ ו«רשימה אינה נושאת פריט כפול» את הכפילות: ⛔ מוטציה שמפילה את
     *  השנייה אינה אכיפה של הראשונה. */
    const dupNo = Number((/^\|\s*(\d+)\s*\|\s*רשימה אינה נושאת פריט כפול/m.exec(DOC) || [])[1]);
    const gaps = ((/gapRows: \[([^\]]*)\]/.exec(rd(CAP)) || [, ''])[1].match(/\d+/g) || []).map(Number);
    const skip = gaps.includes(rowNo), skipDup = gaps.includes(dupNo);
    if (skip) {
      t(true, `מ25 · ⭕ בשורה ${rowNo} — ה-probe אינו רץ כאן, ⛔ ואין מה למוטט`);
    } else {
      t(runGateOn({ [SRC]: inject(''), [CAP]: declare }, 'test_caps_build.mjs', () => ({})),
        'מ25 · זוג-רשומה שמעתיק את שדות הבסיס בלבד **מפיל** את «מיזוג מכל»');
    }
    /*  ⛔ מוטציה: כתיבה לרשימה שאינה בודקת קיום — ⚠️ הטענה
     *  שנופלת היא «מיזוג מכל»: ⭐ פריט שנדחף פעמיים הוא פריט אחד על
     *  המסך, ⛔ ומחיקה אחת משאירה את השני.
     *  ⛔ **והאתר מוזרק ומוצהר** ⛔ ולא נחתך מהקיים — ⚠️ שמות הכתיבות
     *  נבדלים ביניהן, ⭐ ומוטציה שנשענת על שם אחד לא הייתה רצה בשאר. */
    const addFn = (guard, stamp) => 'function zzAddItem() {\n' +
      '  var inp = document.getElementById(\'zz-inp\');\n' +
      '  var v = inp.value.trim();\n' +
      '  if (!v) return;\n' + (guard || '') + (stamp || '') +
      '  window.zzList.push(v);\n' +
      '}\nwindow.zzAddItem = zzAddItem;\nwindow.zzList = [];\n';
    const GUARD = '  if (uniqHas(window.zzList, v)) return;\n';
    const declAdd = (c) => c.replace(/listAdds: \[/, "listAdds: ['zzAddItem', ");
    const declStamp = (c) => declAdd(c).replace(/itemStamp: \[/,
      "itemStamp: [{ target: 'window.zzList', stamp: 'zzStamp' }, ");
    if (skipDup) {
      t(true, `מ26 · ⭕ בשורה ${dupNo} — ה-probe אינו רץ כאן, ⛔ ואין מה למוטט`);
    } else {
      t(runGateOn({ [SRC]: inject(pairBody, addFn('')), [CAP]: declAdd(declare) },
                  'test_caps_build.mjs', () => ({})),
        'מ26 · כתיבה שאינה עוברת ב-`uniqHas` **מפילה** את «רשימה אינה נושאת פריט כפול»');
    }
    /*  ⛔ מוטציה: מיזוג שאינו מכווץ — ⚠️ המכווץ המוצהר משרשר
     *  את שני הצדדים ⛔ ואין בו מפת ערכים שמכריעה: ⭐ פריט שקיים בשני
     *  הצדדים יוצא פעמיים. */
    if (skipDup) {
      t(true, `מ27 · ⭕ בשורה ${dupNo} — ה-probe אינו רץ כאן, ⛔ ואין מה למוטט`);
    } else {
      t(runGateOn({ [SRC]: inject(pairBody).replace(COLLAPSING, CONCAT), [CAP]: declare },
                  'test_caps_build.mjs', () => ({})),
        'מ27 · מכווץ מוצהר שאין בו מפת ערכים **מפיל** את «רשימה אינה נושאת פריט כפול»');
    }
    /*  ⛔ מוטציה: פריט שנכתב בלי חותמת — ⚠️ הטענה שנופלת היא
     *  «מיזוג מכל»: ⭐ פריט בלי חותמת מפסיד לכל עריכה מתוארכת · ⛔ **והכתיבה
     *  עוברת ב-`uniqHas`** ⛔ כדי שהשורה השנייה תישאר נקייה — ⚠️ מוטציה
     *  שמפילה שתי שורות אינה מודדת אף אחת מהן. */
    if (skip) {
      t(true, `מ28 · ⭕ בשורה ${rowNo} — ה-probe אינו רץ כאן, ⛔ ואין מה למוטט`);
    } else {
      t(runGateOn({ [SRC]: inject(pairBody, addFn(GUARD)), [CAP]: declStamp(declare) },
                  'test_caps_build.mjs', () => ({})),
        'מ28 · פריט שנכתב בלי חותמת **מפיל** את «מיזוג מכל»');
    }

    /*  ⭐ מוטציית-נגד אחת לשלושתן: אותו עץ בדיוק — ⛔ שדה מערך שממוזג
     *  פר-פריט ונכתב לרשומה היוצאת, ⛔ מכווץ שמחזיק מפת ערכים,
     *  ⛔ ובלי כתיבה לרשימה שאינה בודקת קיום: ⚠️ שינוי חי שאסור לו
     *  להפיל. */
    t(!runGateOn({ [SRC]: inject(pairBody, addFn(GUARD, '  var zzStamp = Date.now();\n')),
                   [CAP]: declStamp(declare) }, 'test_caps_build.mjs', () => ({})),
      'נ16 · ⭐ אותו עץ עם מיזוג פר-פריט, מכווץ, בדיקת קיום וחותמת ⛔ **אינו** מפיל');
  }
}

/*  ⛔⛔ מ68 — שער שעבר את סף הגודל: ⚠️ **מה נכנס**: קובץ שער
 *  שתפח מעבר לתקרת השורות, ⛔ **ומה מפיל**: שהוא אינו אחד מחלקי פיצול
 *  מוצהר — ⭐ שער אחד ארוך חוסם את הבריכה, ⚠️ ורתמות המוטציה מריצות
 *  אותו עשרות פעמים בכל סבב. */
t(runGateOn({ 'tools/test_md.mjs': rd('tools/test_md.mjs') + '\n'.repeat(2200) },
            'check-capabilities.mjs', () => ({})),
  'מ68 · שער שתפח מעבר לתקרת השורות **מפיל** את «gateSizeGaps»');
/*  ⭐ מוטציית-נגד: אותה תוספת **מתחת** לתקרה ⛔ אינה מפילה — ⚠️ הנמדד
 *  הוא הסף, ⛔ ולא כל גדילה: ⭐ שער שגדל ונשאר מתחתיו אינו חוסם דבר. */
t(!runGateOn({ 'tools/test_md.mjs': rd('tools/test_md.mjs') + '\n'.repeat(100) },
             'check-capabilities.mjs', () => ({})),
  'נ42 · ⭐ גדילה שנשארת מתחת לתקרה ⛔ **אינה** מפילה');

/*  ⛔⛔ מ69 — דפוס שאחת מחלופותיו עוגן לבדו: ⚠️ **מה נכנס**:
 *  `|^` בסוף דפוס, ⛔ **ומה מפיל**: שהוא מתאים למחרוזת ריקה בכל קלט —
 *  ⭐ והבדיקה שנשענת עליו מאשרת כל גוף: ⚠️ בדיוק «probe שאינו יכול
 *  להיכשל». ⛔ **והדפוס מורכב בזמן ריצה** — ⚠️ כתיבתו כליטרל הייתה
 *  מפילה את השער על הקובץ הזה עצמו. */
const DEADALT = '/' + 'zz|' + '^' + '/';
t(runGateOn({ 'tools/test_md.mjs': rd('tools/test_md.mjs') + '\nconst _r137 = ' + DEADALT + ';\nvoid _r137;\n' },
            'check-capabilities.mjs', () => ({})),
  'מ69 · דפוס שאחת מחלופותיו עוגן לבדו **מפיל** את «anchorGaps»');
/*  ⭐ מוטציית-נגד: אותה חלופה עם תו אחריה ⛔ אינה מפילה — ⚠️ `^y` הוא
 *  עוגן שדורש תו, ⛔ והוא אינו מתאים למחרוזת ריקה. */
t(!runGateOn({ 'tools/test_md.mjs': rd('tools/test_md.mjs') + '\nconst _r137 = /zz|' + '^y/;\nvoid _r137;\n' },
             'check-capabilities.mjs', () => ({})),
  'נ43 · ⭐ עוגן שדורש תו אחריו ⛔ **אינו** מפיל');


console.log(fail ? `\n✗ ${GATE_ID} — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ ${GATE_ID} — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
