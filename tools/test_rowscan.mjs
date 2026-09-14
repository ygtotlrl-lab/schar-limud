#!/usr/bin/env node
/* ───────────────────────────────────────────────────────────────────────────
   test_rowscan.mjs — כל קלט נופל על שורה אחת, וכל אכיפה כתובה בתקן (סבב 141)

   **מה נאכף:** ⛔ שתי שורות אינן נופלות על אותו קלט — ⚠️ probe זהה בית-לבית,
   והצהרת `APP` ששתי שורות נוקבות בה · ⛔ ושורה שכל אכיפתה נימוק
   כתוב אינה מסומנת תקין · ⭐ ושער שרץ ואין שורה שמצביעה עליו
   מוכרז בשמו ובנימוקו.

   **הנימוק המדוד:** ⚠️ שלוש סתירות נמצאו בשיחה ⛔ ולא בשער — ⭐ אסימון שפרש
   והוגדר מחדש · מפה שהייתה מנגנון שני · ⛔ ושתי שורות שחפפו.
   ⚠️ ו-188 שורות חיו זו לצד זו ⛔ בלי שאיש מדד אם שתיים סותרות.

   **מה יישבר בלעדיו:** ⛔ שתי שורות על אותה מדידה — ⚠️ אחת מהן משתנה, ⭐ והשנייה
   ממשיכה לתאר עולם שהשתנה: ⛔ ומי שקורא אותה מיישר לכיוון הלא נכון.

   **מה אינו נאכף כאן:** ⚠️ **האם התקן עצמו נכון** — ⛔ זו קריאת משמעות, ⭐ ונסרקת
   ידנית בכל סבב שנוגע · ⛔ ותוכן השורה, שנמדד בבודק התיעוד.
   ──────────────────────────────────────────────────────────────────────── */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  sameProbeOk: [],
  sharedDecl: [],
  /*  ⛔ שער שרץ ואינו מצהיר שורה — ⚠️ **מה נכנס**: שם השער ⟵ הנושא
   *  שהוא מודד ולמה אינו מצהיר אותו; ⛔ **ומה מפיל**: שער בלי שורה
   *  ובלי הכרזה, והכרזה שאין לה שער. ⭐ **ולמה המבנה קיים**: אכיפה
   *  שאין לה שורה מפילה על טענה שאינה בתקן, ⚠️ ומי שנפל עליה אינו
   *  יודע איזו הוראה נשברה.
   *  ⛔ **והנימוק המשותף לכולם** — ⚠️ השורה שהשער מודד נאכפת ב-`MATRIX`
   *  שבבודק המרוכז, ⭐ ושני מרשמים לשורה אחת אינם מותרים: ⛔ שורה
   *  שמוצהרת גם ב-`ROWS` וגם ב-`MATRIX` מפילה כשורה שאינה במרשם. */
  gateNoRows: {
    'check-structure.mjs':       'המבנה הקנוני של הריפו — ⚠️ קיום הקבצים ומיקומם, ⛔ ואין לו שורה: ⭐ הטבלה מודדת תוכן ⛔ ולא נוכחות',
    'test_backup_policy.mjs':    'מדיניות הגיבויים במסד — ⚠️ נמדדת מול המסד החי, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_budget.mjs':           'תקציב התיעוד — ⚠️ ספירת השורות, ⛔ והשורות עצמן נאכפות בבודק התיעוד',
    'test_caps_build.mjs':       'חלק «מעטפת ומסד» של בודק היכולות — ⚠️ השורות שהוא מודד נגזרות מ-`MATRIX` שבבודק המרוכז',
    'test_caps_guard.mjs':       'חלק «קלט וניקוי» של בודק היכולות — ⚠️ השורות שהוא מודד נגזרות מ-`MATRIX` שבבודק המרוכז',
    'test_caps_ui.mjs':          'חלק «מסך ועיצוב» של בודק היכולות — ⚠️ השורות שהוא מודד נגזרות מ-`MATRIX` שבבודק המרוכז',
    'test_devid.mjs':            'מודול מזהה המכשיר — ⚠️ גוף המודול המשותף, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_hotwin.mjs':           'מודול החלון החם והשחזור המקומי — ⚠️ גוף המודול, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_icons.mjs':            'תוכן `icons/` ו-`design/` — ⚠️ הנכסים עצמם, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_idarg.mjs':            'העברת מזהה ל-DOM — ⚠️ הגוף אות-באות, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_ids.mjs':              'מודול מזהי הרשומות — ⚠️ גוף המודול המשותף, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_lists.mjs':            'שקילות שתי רשימות המודולים המשותפים — ⚠️ צד שני של אותה מדידה, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_lock.mjs':             'נעילת חוסר-הפעילות — ⚠️ גוף המודול המשותף אות-באות, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_md.mjs':               'שלד שלושת קובצי ה-md הנלווים — ⚠️ הפסקאות עצמן, ⛔ והשורות נאכפות בבודק התיעוד',
    'test_merge_pending.mjs':    'ליבת המיזוג והגנת ה-⏳ — ⚠️ גוף המודול המשותף, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_offline_login.mjs':    'כניסה אופליין מרובת-משתמשים — ⚠️ המסלול עצמו, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_pendflush.mjs':        'הניסיון החוזר ואישור ה-⏳ בריקון התור — ⚠️ גוף המודול, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_pull.mjs':             'מנגנון המשיכה המאוחד — ⚠️ גוף המודול, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_roles.mjs':            'מודל ההרשאות — ⚠️ המסלול עצמו, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_session.mjs':          'מודל הסשן — ⚠️ גוף המודול המשותף אות-באות, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_shell.mjs':            'החתימה על מעטפת ה-WebView — ⚠️ גוף המעטפת, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_stage_a.mjs':          'הגיבוי היומי ויומן הפעולות — ⚠️ גוף המודול המשותף, ⛔ והשורה עצמה ב-`MATRIX`',
    'test_swcore.mjs':           'ליבת ה-service worker וקו הבסיס ההתנהגותי — ⚠️ גוף הקובץ, ⛔ והשורה עצמה ב-`MATRIX`',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [194];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בארבעת הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/*  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ כל טענה שאין לה מה למדוד בריפו הזה
 *  נושאת שורת נימוק ⛔ ואינה מדולגת: ⭐ המספר זהה בארבעתן. */
const FLOOR = { shared: 5, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
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

/*  ⛔ הטבלה נקראת פעם אחת — ⚠️ **מה נכנס**: שורות הבלוק החתום;
 *  ⛔ **ומה מפיל**: שורה שאינה מתפרקת לשבע עמודות. ⭐ **ולמה המבנה
 *  קיים**: חמש הבדיקות שכאן מודדות את **אותה** טבלה, ⛔ וקריאה נפרדת
 *  לכל אחת הייתה חמישה מצבים שיכולים להיבדל. */
function tableRows(md) {
  const ls = md.split('\n');
  const a = ls.findIndex((l) => /^<!--\s*SHARED:start\s+id="table"/.test(l));
  const b = ls.findIndex((l, i) => i > a && /^<!--\s*SHARED:end/.test(l));
  if (a < 0 || b < 0) return null;
  const out = [];
  for (const l of ls.slice(a, b)) {
    const m = /^\|\s*(\d+)\s*\|/.exec(l);
    if (!m) continue;
    const c = l.split('|');
    out.push({ n: Number(m[1]), name: (c[2] || '').trim(), std: c[3] || '',
               marks: [c[4], c[5], c[6], c[7]].map((x) => (x || '').trim()),
               note: (c[8] || '').trim() });
  }
  return out;
}

/*  ⛔ שני המרשמים נקראים מהבודק — ⚠️ `MATRIX` נושא probe לכל שורה,
 *  ⛔ ו-`GATES` נושא שם טענה או נימוק כתוב: ⭐ ושורה שאינה באף אחד מהם
 *  היא שורה שאיש אינו מודד. */
function registries(src) {
  const mx = /const MATRIX = \[([\s\S]*?)\n\];/.exec(src);
  const gb = /const GATES = \{([\s\S]*?)\n\};/.exec(src);
  const entries = [];
  if (mx) for (const m of mx[1].matchAll(/\{\s*row:\s*(\d+),[\s\S]{0,200}?probe:\s*\(\)\s*=>\s*([^\n]*)/g))
    entries.push({ row: Number(m[1]), probe: m[2].trim().replace(/[,}]\s*$/, '').trim() });
  const gates = {};
  if (gb) {
    const ls = gb[1].split('\n');
    for (let i = 0; i < ls.length; i++) {
      const km = /^(\s*)(\d+):/.exec(ls[i]);
      if (!km) continue;
      let d = 0, j = i, body = [];
      do { const t = ls[j]; body.push(t);
           for (const ch of t) { if (ch === '{' || ch === '[') d++; if (ch === '}' || ch === ']') d--; }
           j++; } while (d > 0 && j < ls.length);
      gates[Number(km[2])] = body.join('\n');
      i = j - 1;
    }
  }
  return { entries, gates };
}

/*  ⛔ מרשם הדפוסים והמוטציות — ⚠️ **מה נכנס**: שם כל דפוס שהשער מכריז,
 *  ⛔ ושם כל דפוס שיש לו מוטציה; ⛔ **ומה מפיל**: דפוס בלי מוטציה,
 *  ומוטציה בלי דפוס. ⭐ **ולמה המבנה קיים**: הוא מה שמאפשר להצליב
 *  את השער מבחוץ — ⛔ דפוס בלי מוטציה נשחק בשקט. */
export const PATTERNS = ['א', 'ב+ג', 'ד', 'ה'];
export const MUTS = ['א', 'ב+ג', 'ד', 'ה'];

/*  ⛔ כל בדיקה היא **פונקציה טהורה של טקסט** — ⚠️ היא מקבלת את התוכן
 *  כארגומנט, ⭐ ולכן המוטציות רצות בזיכרון: ⛔ שער שמודד טקסט ומריץ
 *  תהליך לכל מוטציה משלם על מה שאינו צריך, ⚠️ והזמן נגזר ממספרן. */
const CTX = () => ({
  md: rd('CLAUDE.md'),
  cap: rd('tools/check-capabilities.mjs'),
  js: rd('tools/check-js.mjs'),
  rows: Object.fromEntries(fs.readdirSync(path.join(ROOT, 'tools'))
    .filter((x) => x.endsWith('.mjs'))
    .map((f) => [f, (/export const ROWS = \[([^\]]*)\]/.exec(rd('tools/' + f)) || [, ''])[1]])),
});

/* א · שתי שורות שה-probe שלהן נופל על אותו קלט */
function dupProbe(c) {
  const { entries } = registries(c.cap);
  const by = {};
  for (const e of entries) {
    const k = e.probe.replace(/\s+/g, '');
    if (!k || k === '{' || k.length < 4) continue;
    (by[k] = by[k] || new Set()).add(e.row);
  }
  return Object.entries(by).filter(([, v]) => v.size > 1)
    .map(([k, v]) => `${[...v].sort((x, y) => x - y).join('+')} → ${k.slice(0, 40)}`)
    .filter((s) => !APP.sameProbeOk.includes(s.split(' → ')[0]));
}

/* ב+ג · הצהרה אחת ⟵ שורה אחת */
function clashDecl(c) {
  const rows = tableRows(c.md) || [];
  const owner = {};
  for (const r of rows)
    for (const m of r.std.matchAll(/`APP\.([A-Za-z_$][\w$]*)`/g))
      (owner[m[1]] = owner[m[1]] || new Set()).add(r.n);
  return Object.entries(owner)
    .filter(([k, v]) => v.size > 1 && !APP.sharedDecl.includes(k))
    .map(([k, v]) => `APP.${k} → ${[...v].sort((x, y) => x - y).join('+')}`);
}

/* ד · שורה שאכיפתה נימוק כתוב ⛔ ומסומנת תקין — ⚠️ «נימוק» אינו «נמדד» */
function falseGreen(c) {
  const rows = tableRows(c.md) || [];
  const { entries, gates } = registries(c.cap);
  const probed = new Set(entries.map((e) => e.row));
  const inRows = new Set();
  for (const v of Object.values(c.rows))
    String(v).split(',').map((x) => Number(x.trim())).filter(Boolean).forEach((n) => inRows.add(n));
  return rows.filter((r) => !probed.has(r.n) && !inRows.has(r.n) &&
                            /manual:/.test(gates[r.n] || '') &&
                            r.marks.some((x) => x === '✅'))
             .map((r) => `${r.n} «${r.name}»`);
}

/* ה · אכיפה שאין לה שורה */
function silentGates(c) {
  const wired = [...((/gates: \[([\s\S]*?)\],/.exec(c.js) || ['', ''])[1])
    .matchAll(/'([a-z_-]+)\.mjs'/g)].map((m) => m[1] + '.mjs');
  const silent = wired.filter((g) => g in c.rows &&
    String(c.rows[g]).split(',').map((x) => x.trim()).filter(Boolean).length === 0);
  return {
    silent,
    undeclared: silent.filter((g) => !APP.gateNoRows[g]),
    ghost: Object.keys(APP.gateNoRows).filter((g) => !silent.includes(g)),
    bare: Object.entries(APP.gateNoRows).filter(([, w]) => !w || String(w).trim().length < 12).map(([g]) => g),
  };
}

const C0 = CTX();
t(!!tableRows(C0.md) && tableRows(C0.md).length > 0,
  `טבלת התשתית נקראה — נמדדו ${(tableRows(C0.md) || []).length} שורות והצפוי לפחות אחת`);
{
  const g = dupProbe(C0);
  t(g.length === 0, `א · אין שתי שורות על אותו probe — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. ממזגים, או נותנים לכל שורה מדידה משלה` : ''));
}
{
  const g = clashDecl(C0);
  t(g.length === 0, `ב+ג · הצהרה אחת לשורה אחת — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מסירים את האזכור מהשורה שאינה הבעלים` : ''));
}
{
  const g = falseGreen(C0);
  t(g.length === 0, `ד · שורה שאכיפתה נימוק כתוב אינה מסומנת תקין — נמדדו ${g.length} והצפוי אפס` +
    (g.length ? `: ${g.join(' · ')}. מסמנים ⭕ עם «אינו ניתן לאכיפה», או בונים אכיפה` : ''));
}
{
  const s = silentGates(C0);
  const bad = s.undeclared.length + s.ghost.length + s.bare.length;
  t(bad === 0, `ה · אכיפה שאין לה שורה — נמדדו ${s.undeclared.length} בלי הכרזה, ` +
    `${s.ghost.length} הכרזות בלי מקרה, ${s.bare.length} בלי נימוק; והצפוי אפס` +
    (bad ? `: ${[...s.undeclared, ...s.ghost, ...s.bare].slice(0, 10).join(' · ')}. ` +
           'מצהירים ב-`ROWS` את השורה שהשער אוכף, או מכריזים עם נימוקו'
         : ` (${s.silent.length} שערים מוכרזים)`));
}

mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציות בזיכרון — ⚠️ כל אחת מוסרת טקסט שונה לאותה פונקציה,
   *  ⭐ ואינה כותבת לעץ ⛔ ואינה פותחת תהליך. */
  const firstRow = (tableRows(C0.md) || [])[0];
  const MUT = [
    /*  ⛔ המוטציה משכפלת **שורת רשומה שלמה** ⛔ ואינה מרכיבה probe מטקסט —
     *  ⚠️ probe שנחלץ ומולחם מחדש עלול להיחתך אחרת בפרסור, ⭐ והמוטציה
     *  הייתה מדווחת «לא נפל» על מנגנון תקין. */
    { m: 'מ1', lbl: 'שתי שורות על אותו probe', claim: 'א',
      run: () => {
        const line = C0.cap.split('\n').find((l) =>
          /^\s*\{ row: \d+, name: '[^']*', probe: \(\) => .*\},$/.test(l));
        if (!line) return null;
        const twin = line.replace(/row: \d+/, 'row: 999');
        return dupProbe({ ...C0, cap: C0.cap.replace(line, line + '\n' + twin) }).length >
               dupProbe(C0).length;
      } },
    { m: 'מ2', lbl: 'הצהרה ששתי שורות נוקבות בה', claim: 'ב+ג',
      /*  ⛔ שם ההצהרה נבחר **מהטבלה** ⛔ ואינו מוקלד — ⚠️ שם מוקלד היה
       *  נספר בעצמו כקריאה חיה בסורק ההצהרות, ⭐ ומדווח על השער הזה. */
      run: () => {
        const rows = tableRows(C0.md) || [];
        const own = {};
        for (const r of rows)
          for (const m of r.std.matchAll(/`APP\.([A-Za-z_$][\w$]*)`/g))
            (own[m[1]] = own[m[1]] || new Set()).add(r.n);
        const solo = Object.keys(own).find((k) => own[k].size === 1);
        const host = rows.find((r) => !own[solo].has(r.n) && r.std.length > 40);
        if (!solo || !host) return null;
        const line = C0.md.split('\n').find((l) =>
          new RegExp('^\\|\\s*' + host.n + '\\s*\\|').test(l));
        const hurt = line.replace(host.std, host.std + ' · `APP' + '.' + solo + '`');
        return clashDecl({ ...C0, md: C0.md.replace(line, hurt) }).length > clashDecl(C0).length;
      } },
    /*  ⛔ המועמדת נבחרת לפי **התוצאה** ⛔ ולא לפי התנאי לבדו — ⚠️ שורה
     *  שמוצהרת ב-`ROWS` של שער אינה נספרת ב-`falseGreen`, ⭐ ובחירה בה
     *  הייתה מדווחת «לא נפל» על מנגנון תקין. */
    { m: 'מ3', lbl: 'שורה שאכיפתה נימוק כתוב מסומנת תקין', claim: 'ד',
      run: () => {
        const { entries, gates } = registries(C0.cap);
        const base = falseGreen(C0).length;
        for (const r of tableRows(C0.md) || []) {
          if (entries.some((e) => e.row === r.n)) continue;
          if (!/manual:/.test(gates[r.n] || '')) continue;
          if (!r.marks.length || !r.marks.every((x) => x === '⭕')) continue;
          const line = C0.md.split('\n').find((l) => new RegExp('^\\|\\s*' + r.n + '\\s*\\|').test(l));
          if (!line) continue;
          if (falseGreen({ ...C0, md: C0.md.replace(line, line.replace('⭕', '✅')) }).length > base)
            return true;
        }
        return null;
      } },
    { m: 'מ4', lbl: 'שער בלי שורה ובלי הכרזה', claim: 'ה',
      run: () => {
        const g = silentGates(C0).silent[0];
        if (!g) return null;
        const saved = APP.gateNoRows[g]; delete APP.gateNoRows[g];
        const bad = silentGates(C0).undeclared.length > 0;
        APP.gateNoRows[g] = saved;
        return bad;
      } },
  ];
  for (const r of MUT) {
    const got = r.run();
    if (got === null) { t(true, `${r.m} · ⭕ ${r.lbl} — ⛔ אין כאן מה למוטט`); continue; }
    t(got === true, `${r.m} · ${r.lbl} **מפיל** את «${r.claim}»`);
  }
  /*  ⭐ מוטציית-נגד: שינוי ניסוח בשם שורה ⛔ אינו מפיל — ⚠️ הנמדד הוא
   *  **המבנה** ⛔ ולא הטקסט שהשורה נושאת. */
  const renamed = firstRow
    ? C0.md.replace('| ' + firstRow.n + ' | ' + firstRow.name,
                    '| ' + firstRow.n + ' | ' + firstRow.name + ' ')
    : C0.md;
  const c2 = { ...C0, md: renamed };
  /*  ⛔ מוטציית-נגד נמדדת מול **קו הבסיס** ⛔ ולא מול אפס — ⚠️ שער
   *  שיש לו ממצא פתוח היה מדווח «הנגד הפילה», ⭐ והנמדד הוא שהשינוי
   *  אינו **מוסיף** ממצא. */
  t(dupProbe(c2).length === dupProbe(C0).length &&
    clashDecl(c2).length === clashDecl(C0).length &&
    falseGreen(c2).length === falseGreen(C0).length,
    'נ1 · ניסוח שם שורה שהשתנה — ⛔ אינו מוסיף ממצא');
}

if (fail) {
  console.error(`\n❌ ${GATE_ID}: ${fail} כשלים מתוך ${pass + fail}`);
  process.exit(1);
}
console.log(`\n✅ ${GATE_ID}: ${pass} טענות`);
