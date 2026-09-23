/* ───────────────────────────────────────────────────────────────────────────
   test_signeddead.mjs — בלוק חתום נמדד כמו כל קוד
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** ⛔ מדידת היתומים רצה **בתוך** הבלוקים החתומים — ⚠️ שם
   שמוגדר שם ואין לו קורא כאן ואין לו קורא באף אחות **מפיל**, ⭐ או מוכרז
   ב-`APP.signedDeadAllow` עם נימוקו · ⛔ **וכל `skip` בשער נושא נימוק
   שאומר מה אינו נמדד בגללו** — ⚠️ ולא רק למה הוא מדלג.

   **הנימוק המדוד:** ⛔ שער היתומים מדלג על הבלוקים החתומים כדי להימנע
   מכפילות מדידה — ⚠️ ובכך ויתר על המדידה עצמה: ⭐ נמדדו 168–199 שמות
   בתוך הבלוקים בכל ריפו, ⛔ ותשעה מהם מתו בכל מי שנושא אותם.

   **מה יישבר בלעדיו:** ⛔ משטח API שנכתב ואיש לא צרך נשאר בחמישה לנצח —
   ⚠️ הוא נחתם, נמדד כזהה, ⭐ ונקרא בסבב הבא כאילו הוא חי.

   **מה אינו נאכף כאן:** ⛔ **תוכן הבלוק מול חתימתו** — ⚠️ הוא נמדד
   ב-`check-capabilities` · ⛔ **ומיקום הרכיב המשותף**, ⚠️ שנמדד
   ב-`test_signedshared` · ⛔ **ושם שמת כאן וחי באחות** — ⭐ הוא יורד
   מכולן או מאף אחת, ⚠️ ואינו יורד מכאן לבדו · ⛔ **וההשוואה דורשת את
   הריפו האחיות על הדיסק**: ⚠️ כשהן חסרות היא **מדווחת בשמן** ⛔ ואינה
   מדלגת בשתיקה.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';
import { whiten, whitenJs } from './whiten.mjs';
import { FACTS } from './app-facts.mjs';
import { declCases, dumpCases } from './decl-cases.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⛔ שם מת בבלוק חתום שנשאר בכוונה — ⚠️ **מה נכנס**: השם ⟵ מה שהוא
   *  משרת שאין לו קורא היום; ⛔ **ומה מפיל**: שם כזה שאינו כאן, והכרזה
   *  שאין לה שם מת. ⭐ **ולמה ריק**: נמדד ואין — ⚠️ תשעת השמות שמתו
   *  בכל מי שנשא אותם ירדו. */
  signedDeadAllow: {
    rtyReady: 'השער שמונע לולאת ניסיון חוזר על סכימה מיושנת — ⛔ הוא נמדד בשורת באנר העדכון כמנגנון שקיים, ⚠️ ואין לו קורא חי: החיווט אל `rtyArm` הוא חוב פתוח ⛔ ואינו שינוי שנעשה בסבב שמדד אותו',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */
const CASE = declCases(import.meta.url, APP);

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [211];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = resolve(ROOT, '..');

let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס.
 *  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ שלוש הטענות רצות בכולן, ⭐ והרביעית
 *  תלויה בריפו האחיות: ⛔ הטווח מוצהר ב-`APP.floorRange` שב-`check-js`. */
const FLOOR = { shared: 3, app: 0, appWhy: '' };
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
  dumpCases();
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
const t = (n, cond, m) => { RAN++; if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

/*  ⛔ מקור האפליקציה הוא `index.html` **וכל מודול ב-`core/`** — ⚠️ בלוק
 *  שיצא למודול אינו מפסיק להיות בלוק: ⭐ סריקה שמוגבלת לקובץ אחד מדווחת
 *  «אין בלוקים» על אפליקציה שכולה מודולים. */
const SELF = 'test_signeddead.mjs';
export function appSources(root) {
  const out = { 'index.html': readFileSync(join(root, 'index.html'), 'utf8') };
  const cdir = join(root, 'core');
  if (existsSync(cdir))
    for (const f of readdirSync(cdir).filter((x) => x.endsWith('.js')))
      out['core/' + f] = readFileSync(join(cdir, f), 'utf8');
  return out;
}
/*  ⛔ הקורא נמדד גם ב-`tools/` — ⚠️ שם בבלוק חתום שקוראו היחיד הוא שער
 *  הוא **חי**: ⭐ הוא נקודת האחיזה שבה המדידה נתלית, ⛔ וסריקה שמוגבלת
 *  למקור המוצר הייתה מדווחת אותו מת ומוחקת את מה שהשער נשען עליו. */
export function corpus(root) {
  /*  ⛔ מקור האפליקציה עובר ב-`whiten` עם `markup: 'blank'` — ⚠️ הוא HTML
   *  שבתוכו JS, ⭐ והתגיות אינן קוד · ⛔ וקובצי `tools/` הם JS טהור. */
  const parts = Object.entries(appSources(root))
    .map(([f, s]) => (f.endsWith('.html') ? whiten(s, { markup: 'blank' }) : whitenJs(s)));
  const tdir = join(root, 'tools');
  /*  ⛔ השער הזה עצמו אינו חלק מהמצבור — ⚠️ רשימת ההכרזה שבו נוקבת בשמות
   *  המתים, ⭐ וספירתה כקורא הייתה הופכת כל הכרזה למי שמחיה את מה שהיא
   *  מכריזה: ⛔ הצהרה אינה צרכן. */
  if (existsSync(tdir))
    for (const f of readdirSync(tdir).filter((x) => x.endsWith('.mjs') && x !== SELF))
      parts.push(whitenJs(readFileSync(join(tdir, f), 'utf8')));
  return parts.join('\n;\n');
}
/*  ⛔ טווחי הבלוקים נגזרים מהסמנים שמוצהרים בבודק ⛔ ואינם רשימה שנייה —
 *  ⚠️ בלוק שחי בקובץ אחר מדולג כאן, ⭐ שהמדידה היא על מקור האפליקציה. */
export function signedRanges(src, capsSrc) {
  const re = /block:\s*\{[\s\S]*?start:\s*'([^']+)',[\s\S]*?end:\s*'([^']+)'/g;
  const out = []; let m, declared = 0;
  while ((m = re.exec(capsSrc)) !== null) {
    declared++;
    const i = src.indexOf(m[1]); if (i < 0) continue;
    const j = src.indexOf(m[2], i); if (j < 0) continue;
    const k = src.indexOf('*/', j); if (k < 0) continue;
    out.push([i, k + 2]);
  }
  return { ranges: out, declared };
}
/*  ⛔ השמות שמוגדרים **בתוך** הבלוקים — ⚠️ זה בדיוק ההיפוך של שער
 *  היתומים, ⭐ שמדלג עליהם. */
export function namesIn(src, ranges) {
  const out = [];
  const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const at = m.index + (src.charAt(m.index) === '\n' ? 1 : 0);
    if (ranges.some(([a, b]) => at >= a && at < b)) out.push(m[1]);
  }
  return [...new Set(out)];
}
/*  ⛔ המדידה על מקור מולבן — ⚠️ שם שיושב בהערה או במחרוזת אינו קורא,
 *  ⭐ והלבנה שומרת על ההיסטים: ⛔ והגבול אינו `\b`, ⚠️ ש-`$` אינו תו-מילה. */
export function aliveIn(W, name) {
  const esc = name.replace(/\$/g, '\\$');
  const refs = (W.match(new RegExp('(?<![\\w$])' + esc + '(?![\\w$])', 'g')) || []).length;
  const defs = (W.match(new RegExp('(?:async\\s+)?function\\s+' + esc + '\\s*\\(', 'g')) || []).length;
  return refs - defs > 0;
}
/*  ⛔ שם מת כאן וחי באחות **נשאר** — ⚠️ הוא יורד מכולן או מאף אחת,
 *  ⭐ כדרישת «קבוע בבלוק חתום»: ⛔ והמדידה היא על **כל** האחיות שעל הדיסק. */
export function deadGaps(mineW, names, sibW, allow) {
  const dead = names.filter((n) => !aliveIn(mineW, n));
  const noSis = dead.filter((n) => !sibW.some((w) => aliveIn(w, n)));
  const undeclared = noSis.filter((n) => !Object.prototype.hasOwnProperty.call(allow || {}, n));
  const ghost = Object.keys(allow || {}).filter((n) => noSis.indexOf(n) < 0);
  const bare = Object.entries(allow || {})
    .filter(([, v]) => !v || String(v).trim().length < 15).map(([k]) => k);
  return { dead, noSis, undeclared, ghost, bare };
}

/*  ⛔ הודעת דילוג אומרת **מה אינו נמדד בגללה** — ⚠️ «רץ בשער אחר» אומר
 *  איפה, ⛔ ואינו אומר מה נשאר בחוץ: ⭐ והצירופים סגורים, ⚠️ שכל ניסוח
 *  חופשי היה מחזיר את השאלה לקורא.
 *  ⛔ **והעוזר שמדפיס בלבד אינו הודעה** — ⚠️ גופו אינו נושא טקסט עברי,
 *  ⭐ והנימוק חי באתר הקריאה שלו. */
const SKIP_MARK = /⏭|מדלג/;
const SKIP_WHY = /לא נמדד|אינו נמדד|אינה נמדד|אינם נמדד|אינן נמדד/;
const HEB = /[\u0590-\u05FF]/g;
/*  ⛔ הודעת דילוג שאינה אומרת מה אינו נמדד מפילה ⛔ ואין לה חריגה —
 *  ⚠️ רשימת ההחרגה נותרה ריקה בכל הריפו, ⭐ וירדה עם מי שקרא אותה. */
export function skipGaps(files) {
  const out = [];
  for (const [f, src] of Object.entries(files)) {
    /*  ⛔ הקריאה נמדדת על המקור המולבן ⛔ והטקסט נחתך מהגולמי — ⚠️ `console.log`
     *  שיושב **בתוך** מחרוזת הוא דוגמה למוטציה ⛔ ואינו אתר דילוג. */
    const Wf = whitenJs(src);
    const re = /console\.log\s*\(/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (Wf.slice(m.index, m.index + m[0].length) !== m[0]) continue;
      let d = 0, j = m.index + m[0].length - 1;
      for (; j < src.length; j++) {
        const c = src.charAt(j);
        if (c === '(') d++;
        else if (c === ')') { d--; if (!d) break; }
      }
      const stmt = src.slice(m.index, j + 1);
      if (!SKIP_MARK.test(stmt)) continue;
      if ((stmt.match(HEB) || []).length < 12) continue;
      if (SKIP_WHY.test(stmt)) continue;
      out.push(f + ':' + src.slice(0, m.index).split('\n').length);
    }
  }
  return { sites: out };
}

console.log(`· ${FACTS.slug} — בלוק חתום נמדד כמו כל קוד`);
let n = 1;

const SRCS = appSources(ROOT);
const CAPS = readFileSync(join(ROOT, 'tools', 'check-capabilities.mjs'), 'utf8');
let DECLARED = 0, FOUND = 0;
const NAMES = [];
for (const src of Object.values(SRCS)) {
  const r = signedRanges(src, CAPS);
  DECLARED = r.declared;
  FOUND += r.ranges.length;
  NAMES.push(...namesIn(src, r.ranges));
}
const W = corpus(ROOT);
const others = PEERS.filter((p) => p !== FACTS.slug);
const have = others.filter((p) => existsSync(join(SIBS, p, 'index.html')));
const away = others.filter((p) => have.indexOf(p) < 0);
const SIB_W = have.map((p) => corpus(join(SIBS, p)));

t(n++, DECLARED > 0 && FOUND > 0 && NAMES.length > 0,
  `[signed-dead] הבלוקים החתומים נסרקו — נמדדו ${DECLARED} בלוקים מוצהרים, ` +
  `${FOUND} שסמניהם במקור ו-${NAMES.length} שמות בתוכם; והצפוי לפחות אחד מכל סוג. ` +
  'מיישרים את הסמנים לקוד');
if (away.length) {
  /*  ⛔ ריפו שאינו על הדיסק מדווח בשמו — ⚠️ והטענה **אינה נספרת כטענה
   *  שעברה**: ⭐ הטווח מוצהר ב-`APP.floorRange` שב-`check-js`. */
  console.log(`  ⚠️  ההצלבה בין הריפו לא רצה — ${away.join(' · ')} אינם על הדיסק ` +
              `לצד ${FACTS.slug}; נמדדו ${have.length} מתוך ${others.length}`);
  CASE.unmeasured('signedDeadAllow', 'אחות אינה על הדיסק — ⛔ ושם מת נמדד מול כולן');
} else {
  const g = deadGaps(W, NAMES, SIB_W, APP.signedDeadAllow);
  for (const k of Object.keys(APP.signedDeadAllow || {})) if (g.noSis.includes(k)) CASE('signedDeadAllow', k);
  const bad = g.undeclared.length + g.ghost.length + g.bare.length;
  t(n++, bad === 0,
    `[signed-dead] שם מת בבלוק חתום — נמדדו ${g.dead.length} מתים כאן מתוך ${NAMES.length}, ` +
    `${g.noSis.length} בלי קורא באף אחות, ${g.undeclared.length} בלי הכרזה, ` +
    `${g.ghost.length} הכרזות בלי מקרה ו-${g.bare.length} בלי נימוק; והצפוי אפס` +
    (bad ? `: ${[...g.undeclared, ...g.ghost, ...g.bare].slice(0, 8).join(' · ')}. ` +
           'מוחקים את השם מכל מי שנושא אותו, או מכריזים ב-`APP.signedDeadAllow` עם נימוקו' : ''));
}
{
  const files = {};
  for (const f of readdirSync(join(ROOT, 'tools')).filter((x) => x.endsWith('.mjs')))
    files['tools/' + f] = readFileSync(join(ROOT, 'tools', f), 'utf8');
  const g = skipGaps(files);
  t(n++, g.sites.length === 0,
    `[skip-why] הודעת דילוג אומרת מה אינו נמדד — נמדדו ${g.sites.length} הודעות בלי ` +
    `«לא נמדד», והצפוי אפס${g.sites.length ? ': ' + g.sites.slice(0, 8).join(' · ') : ''}. ` +
    'כותבים בהודעה מה אינו נמדד בגלל הדילוג — ⛔ ואין חריגה');
}
t(n++, Object.values(APP.signedDeadAllow || {})
  .every((v) => typeof v === 'string' && v.trim().length >= 15),
  `[signed-dead] נימוק לכל הכרזה — נמדדו ${Object.keys(APP.signedDeadAllow || {}).length} ` +
  `הכרזות שם, והצפוי שכולן נושאות נימוק. ` +
  'כותבים בכל אחת מה נדרש כדי להוציא אותה');

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציות בזיכרון — ⚠️ כל אחת מוסרת קלט אחר לאותה פונקציה,
   *  ⭐ ואינה כותבת לעץ ⛔ ואינה פותחת תהליך. */
  {
    const got = deadGaps('function zzDeadName() { return 1; }', ['zzDeadName'], [], {});
    t(n++, got.undeclared.length === 1,
      'מ1 · ⛔ מוטציה: שם מת בבלוק חתום מפיל את «[signed-dead]» — ' +
      `נמדדו ${got.undeclared.length} והצפוי 1`);
  }
  {
    const got = deadGaps('function zzDeadName() { return 1; }', ['zzDeadName'], [],
                         { zzDeadName: 'קצר' });
    t(n++, got.bare.length === 1,
      'מ2 · ⛔ מוטציה: הכרזה בלי נימוק מפילה את «[signed-dead]» — ' +
      `נמדדו ${got.bare.length} והצפוי 1`);
  }
  {
    const got = skipGaps({ 'zz.mjs': "console.log('⏭ zz: המוטציות רצות ברמה המלאה');" });
    t(n++, got.sites.length === 1,
      'מ3 · ⛔ מוטציה: הודעת דילוג בלי «לא נמדד» מפילה את «[skip-why]» — ' +
      `נמדדו ${got.sites.length} והצפוי 1`);
  }
  /*  ⭐ מוטציות-נגד — ⛔ שינוי חי שאסור לו להפיל. */
  {
    const got = deadGaps('function zzDeadName() { return 1; }', ['zzDeadName'],
                         ['zzDeadName(); function zzDeadName() { return 1; }'], {});
    t(n++, got.undeclared.length === 0 && got.dead.length === 1,
      'נ1 · ⭐ מוטציית-נגד: שם שמת כאן וחי באחות ⛔ אינו מפיל — ' +
      `נמדדו ${got.dead.length} מתים ו-${got.undeclared.length} פערים, והצפוי 1 ו-0`);
  }
  {
    const got = skipGaps({ 'zz.mjs': "console.log('⏭ zz: המוטציות רצות ברמה המלאה — ⛔ ואינן נמדדות כאן');" });
    t(n++, got.sites.length === 0,
      'נ2 · ⭐ מוטציית-נגד: הודעת דילוג שאומרת מה אינו נמדד ⛔ אינה מפילה — ' +
      `נמדדו ${got.sites.length} והצפוי 0`);
  }
  {
    const got = skipGaps({ 'zz.mjs': "const skip = (m) => console.log('⏭️  ' + m);" });
    t(n++, got.sites.length === 0,
      'נ3 · ⭐ מוטציית-נגד: עוזר שמדפיס בלבד ⛔ אינו הודעה — ' +
      `נמדדו ${got.sites.length} והצפוי 0`);
  }
  {
    const got = skipGaps(
      { 'zz.mjs': 'const sample = "console.log(\'⏭ zz: המוטציות רצות ברמה המלאה\')";' });
    t(n++, got.sites.length === 0,
      'נ4 · ⭐ מוטציית-נגד: קריאה שיושבת בתוך מחרוזת ⛔ אינה אתר דילוג — ' +
      `נמדדו ${got.sites.length} והצפוי 0`);
  }
}

console.log(`\n${fail ? '✗' : '✓'} ${FACTS.slug} — בלוק חתום נמדד כמו כל קוד: ` +
            `${pass} טענות עברו, ${fail} נכשלו · ${FOUND} בלוקים · ` +
            `${NAMES.length} שמות · ${have.length} אחיות`);
if (fail) process.exitCode = 1;
