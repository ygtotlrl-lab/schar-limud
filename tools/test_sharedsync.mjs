/* ───────────────────────────────────────────────────────────────────────────
   test_sharedsync.mjs — הבלוק המשותף זהה בין הריפו
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** ארבעת בלוקי `rules-*` שב-`CLAUDE.md` זהים **בית-לבית** בין
   ארבעת הריפו, ⛔ וגם החתימות שמוצהרות להם ב-`CANON` שב-`check-docs`
   נושאות אותו ערך בארבעת העותקים.

   **הנימוק המדוד:** שער החתימות מודד ש**החתימה תואמת לתוכן באותו ריפו**,
   ⛔ ולא שהתוכן זהה בין הריפו: ⚠️ סבב שערך בלוק משותף באחת בלבד וקידם שם
   גם את החתימה מקבל ארבע חתימות תקינות על ארבעה תכנים — ⭐ ונמדד: שורת
   «טיפול באירועים» נבדלה בהנהלה, והחתימה שם הייתה `35d4bef7` מול
   `a7ef068d` בשלושה. ⛔ שמונה סבבים אחורה הבלוק היה זהה בכולם, ⚠️ וזו
   הסחיפה הראשונה מסוגה.

   **מה יישבר בלעדיו:** ⛔ הכלל המרכזי — «יכולת שבטבלה קיימת בארבעתן» —
   נשען על כך שהטבלה **אחת**; ⚠️ טבלה שנסחפה היא ארבע טבלאות שכל אחת
   מאשרת את עצמה, ⭐ ואז «נאכף» בריפו אחד אינו אומר דבר על השלושה.

   **מה אינו נאכף כאן:** ⛔ החלק הפרטי של `CLAUDE.md` — ⚠️ הוא פרטי בהגדרה
   · ⛔ ותוכן הבלוק מול החתימה שלו, ⭐ שנמדד בשער התיעוד. ⛔ וההשוואה
   דורשת את הריפו האחיות על הדיסק: ⚠️ כשהן חסרות היא **מדווחת ואינה
   מדלגת בשתיקה**, ⛔ ואינה מדפיסה טענה שעברה — ⭐ פער גלוי עדיף על פער
   שהשער מאשר. ⚠️ והמוטציות בונות לעצמן עותקים ולכן רצות תמיד.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync,
         copyFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [52];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ ארבעת הריפו בשמם — ⚠️ הרשימה זהה בית-לבית בארבעת העותקים, בדיוק
 *  כמו הסט המשותף: ⭐ ריפו שיורד מכאן יורד בארבעתם באותו סבב. */
const PEERS = ['yoman-avoda', 'hanhala-ruchanit', 'schar-limud', 'gius'];

const DOC = 'CLAUDE.md';
const DOCGATE = 'tools/check-docs.mjs';
const START = /^<!--\s*SHARED:start\s+id="([^"]*)"\s*-->\s*$/;
const END   = /^<!--\s*SHARED:end\s*-->\s*$/;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
const t = (n, cond, m) => { if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

/*  ⛔ גוף הבלוק נחתך בדיוק כפי ששער התיעוד חותך אותו — ⚠️ חיתוך אחר היה
 *  מדווח סחיפה על רווח שאיש אינו מודד, ⛔ או בולע סחיפה אמיתית. */
function blocksOf(root) {
  const out = new Map();
  let open = null;
  for (const l of readFileSync(join(root, DOC), 'utf8').split('\n')) {
    const m = START.exec(l);
    if (m) { open = { id: m[1], body: [] }; continue; }
    if (END.test(l) && open) { out.set(open.id, open.body.join('\n').trim()); open = null; continue; }
    if (open) open.body.push(l);
  }
  return out;
}

/*  ⛔ החתימות המוצהרות נקראות מהשער ⛔ ואינן נכתבות כאן שוב — ⚠️ רשימה
 *  שנייה של אותם ערכים היא בדיוק המקור השני שהשער הזה בא לתפוס. */
function canonOf(root) {
  const txt = readFileSync(join(root, DOCGATE), 'utf8');
  const blk = /const CANON = \[([\s\S]*?)\];/.exec(txt);
  return new Map([...(blk ? blk[1] : '')
    .matchAll(/'([a-z-]+)',\s*'([0-9a-f]{16})'/g)].map((m) => [m[1], m[2]]));
}

/*  ⚠️ מדווח את **מספר השורה הראשונה שנבדלה** ולא «אינו זהה» — ⛔ הודעה
 *  בלי מיקום שולחת את הקורא להשוות 186 שורות ביד. */
function firstGap(a, b) {
  const x = a.split('\n'), y = b.split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    if (x[i] !== y[i]) return i + 1;
  return 0;
}

/* ── הביקורת — רצה על אוסף שורשים כלשהו ────────────────────────────────── */
function audit(roots) {
  const v = [];
  if (roots.length < 2) return v;
  const [refName, refRoot] = roots[0];
  const refBlocks = blocksOf(refRoot), refCanon = canonOf(refRoot);
  /*  ⛔ קבוצת המזהים נגזרת מ-`CANON` של שורש הייחוס ⛔ ואינה מוקלדת —
   *  ⚠️ ורשימה ריקה מפילה: `every` על אוסף ריק מדווח «עבר» בלי למדוד. */
  const ids = [...refCanon.keys()];
  if (!ids.length) { v.push({ kind: 'canon-missing', msg: `${refName}: CANON ריק` }); return v; }
  for (const [name, root] of roots.slice(1)) {
    const blocks = blocksOf(root), canon = canonOf(root);
    for (const id of ids) {
      const a = refBlocks.get(id), b = blocks.get(id);
      if (a === undefined || b === undefined) {
        v.push({ kind: 'block-missing', msg: `${id}: ${a === undefined ? refName : name} אינו מחזיק את הבלוק` });
        continue;
      }
      if (a !== b) {
        /*  ⛔ המספר נגזר לפני ההודעה ⛔ ולא בתוכה — ⚠️ קריאה שיושבת בתוך
         *  תבנית מחרוזת אינה נראית לסורק הפונקציות בלי קוראים, ⭐ והעוזר
         *  נספר כקוד מת בעוד הוא רץ. */
        const gapAt = firstGap(a, b);
        v.push({ kind: 'block-drift', msg:
          `${id}: ${refName} ≠ ${name}, ההבדל הראשון בשורה ${gapAt} של הבלוק` });
      }
      const ca = refCanon.get(id), cb = canon.get(id);
      if (!ca || !cb) v.push({ kind: 'canon-missing', msg: `${id}: חתימה חסרה ב-${!ca ? refName : name}` });
      else if (ca !== cb)
        v.push({ kind: 'canon-drift', msg: `${id}: החתימה המוצהרת ${ca} ב-${refName} מול ${cb} ב-${name}` });
    }
  }
  return v;
}

export { audit };
const SELF = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (SELF) {

console.log(`\n── סבב 81 — הבלוק המשותף זהה בין הריפו (${APP.name}) ──────────────────`);

/*  ⚠️ שורש הייחוס הוא הריפו הזה, והאחיות נמצאות לצידו — ⛔ ריפו שאינו על
 *  הדיסק **מדווח בשמו**: ⭐ ההשוואה שלא רצה נראית, ⛔ ואינה נספרת כטענה
 *  שעברה. */
const here = join(ROOT, '..');
const roots = [[APP.name, ROOT]];
const away = [];
for (const p of PEERS) {
  if (p === APP.name) continue;
  const dir = join(here, p);
  if (existsSync(join(dir, DOC)) && existsSync(join(dir, DOCGATE))) roots.push([p, dir]);
  else away.push(p);
}

let n = 1;
if (roots.length === PEERS.length) {
  const live = audit(roots);
  const of = (k) => live.filter((x) => x.kind === k).map((x) => x.msg).join(' · ');
  t(n++, !live.some((x) => x.kind.startsWith('block')),
    `א. ארבעת בלוקי rules-* זהים בית-לבית ב-${roots.length} הריפו ${of('block-drift')}${of('block-missing')}`);
  t(n++, !live.some((x) => x.kind.startsWith('canon')),
    `ב. והחתימות המוצהרות להם זהות בארבעת עותקי השער ${of('canon-drift')}${of('canon-missing')}`);
} else {
  console.log(`  ⚠️  ההשוואה בין הריפו לא רצה — ${away.join(' · ')} אינם על הדיסק ` +
              `לצד ${APP.name}; נמדדו ${roots.length} מתוך ${PEERS.length}. ` +
              `מריצים את הסבב עם ארבעת הריפו זה לצד זה`);
}

if (RUN_MUT) {
/* ── מוטציות — על עותקים בתיקייה זמנית, ⛔ ואינן נכתבות לעץ ─────────────── */
/*  ⭐ המוטציות בונות לעצמן שני שורשים ⛔ ואינן תלויות בריפו האחיות —
 *  ⚠️ אחרת מסלול הכשל היה רץ רק במכונה שיש בה ארבעתם. */
const tmp = mkdtempSync(join(tmpdir(), 'r81sync-'));
const mk = (label) => {
  const d = join(tmp, label);
  mkdirSync(join(d, 'tools'), { recursive: true });
  copyFileSync(join(ROOT, DOC), join(d, DOC));
  copyFileSync(join(ROOT, DOCGATE), join(d, DOCGATE));
  return d;
};
const A = mk('a'), B = mk('b');
const pair = [['a', A], ['b', B]];
const edit = (root, f, fn) =>
  writeFileSync(join(root, f), fn(readFileSync(join(root, f), 'utf8')));
const restore = () => { for (const [f, from] of [[DOC, DOC], [DOCGATE, DOCGATE]])
  copyFileSync(join(ROOT, from), join(B, f)); };

t(n++, audit(pair).length === 0, 'נגד: שני עותקים נקיים עוברים את הביקורת');

/*  ⛔ המוטציה שוברת את המנגנון — היא **משנה בית בגוף הבלוק** ומקדמת שם גם
 *  את החתימה, ⚠️ בדיוק כמו הסחיפה שנמדדה: ⭐ כל ריפו לעצמו נשאר תקין. */
/*  ⛔ השורה מאותרת **בשמה** ⛔ ומספרה אינו מוקלד — ⚠️ מספור מחדש הזיז אותה
 *  והמוטציה חדלה לתפוס דבר, ⭐ בעוד השער המשיך לדווח שהוא בודק. */
edit(B, DOC, (s) => s.replace(/^(\| \d+ \| טיפול באירועים )\|/m, '$1 |'));
{
  const got = audit(pair).map((x) => x.kind);
  t(n++, got.includes('block-drift'),
    `מ1 · מוטציה: בית שנשתנה בגוף rules-table מפיל את טענה א — נתפסה כ-[${got.join(',') || 'כלום'}]`);
}
restore();

edit(B, DOCGATE, (s) => s.replace(/(\['rules-table',\s*')[0-9a-f]{16}/, '$1' + '0'.repeat(16)));
{
  const got = audit(pair).map((x) => x.kind);
  t(n++, got.includes('canon-drift'),
    `מ2 · מוטציה: חתימה מוצהרת שנבדלה בין העותקים מפילה את טענה ב — נתפסה כ-[${got.join(',') || 'כלום'}]`);
}
restore();

/*  ⭐ מוטציית-נגד — ⛔ שינוי חי שאסור לו להפיל: אותו תיקון **בשני**
 *  העותקים יחד. ⚠️ בלעדיה הטענות אינן מבחינות בין «משוות בין הריפו»
 *  ל«אוסרות לגעת בבלוק». */
for (const r of [A, B]) {
  edit(r, DOC, (s) => s.replace('| 64 | טיפול באירועים |', '| 64 | טיפול באירועים  |'));
  edit(r, DOCGATE, (s) => s.replace(/(\['rules-table',\s*')[0-9a-f]{16}/, '$1' + '1'.repeat(16)));
}
{
  const got = audit(pair).map((x) => x.kind);
  t(n++, got.length === 0,
    `נ1 · ⭐ מוטציית-נגד: אותו שינוי בשני העותקים ⛔ אינו מפיל את טענות א–ב — נמדדו ${got.length} סטיות`);
}

rmSync(tmp, { recursive: true, force: true });

}

console.log(`\n${fail ? '❌' : '✅'} סבב 81 (הבלוק המשותף זהה בין הריפו) — ${pass} טענות עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);
}
