/* ───────────────────────────────────────────────────────────────────────────
   test_toolsid.mjs — קובצי `tools/` זהים בין ארבעת הריפו
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** קובץ `tools/` שקיים בארבעת הריפו זהה בית-לבית **אחרי
   הסרת בלוק `APP` ואחרי הסרת אזורי «פר-אפליקציה» המסומנים** — ⛔ וקובץ
   שאין בו `APP` כלל מוכרז ב-`APP.pureTools` ⚠️ או ב-`APP.perAppTools`
   עם נימוקו: ⭐ ושני הצדדים מפילים — ⛔ הכרזה שאין לה קובץ, וקובץ שאינו
   מוכרז.

   **הנימוק המדוד:** ⚠️ 48 קבצים חיים בארבעתן ורק שמונה היו זהים בית-לבית,
   ⛔ ואיש לא מדד את השאר: ⭐ `whiten.mjs` הוא מה שכל שער סורק דרכו, ⛔
   וסחיפה של בית אחד בו הייתה משנה את מה שכולם מודדים בלי שאיש יראה.

   **מה יישבר בלעדיו:** ⛔ שער שנערך בריפו אחד בלבד — ⚠️ שלוש האחיות
   ממשיכות למדוד את הכלל הישן, ⭐ וארבעה שערים בשם אחד מודדים ארבעה
   דברים: ⛔ «עבר בהנהלה» מפסיק להעיד על גיוס.

   **מה אינו נאכף כאן:** ⛔ שער פרטי שאינו בארבעתן — ⚠️ אין לו מול מה
   להשוות · ⛔ ותוכן בלוק `APP` עצמו, שהוא ההבדל המותר · ⛔ וגוף הבלוקים
   החתומים שב-`index.html`, שנמדד בשער הסנכרון · ⛔ וההשוואה דורשת את
   הריפו האחיות על הדיסק: ⚠️ כשהן חסרות היא **מדווחת ואינה מדלגת
   בשתיקה**.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /*  ⛔ קובץ `tools/` שאין בו `APP` — ⚠️ ואין לו מה שיבדיל אותו בין
   *  הריפו, ⭐ ולכן הוא חייב להיות זהה בית-לבית: ⛔ והרשימה נמדדת משני
   *  צדדיה — שם שאין לו קובץ, וקובץ שאינו ברשימה. */
  pureTools: [
    '_capability-notes.md', 'test_budget.mjs', 'test_icons.mjs',
    'test_manifest.mjs', 'test_md.mjs', 'test_orphans.mjs',
    'test_readonly.mjs', 'whiten.mjs',
  ],
  /*  ⛔ קובץ שאין בו `APP` ובכל זאת נבדל — ⚠️ כל שם נושא את הסיבה, ⭐ ושם
   *  שתוכנו זהה בארבעתן **מפיל**: ⛔ הכרזה שאין לה מקרה בפועל היא בעצמה
   *  השארית שהשער בא לסלק. */
  /*  ⛔ קובץ תשתית שקיים בחלק מהריפו (סבב 114) — ⚠️ כל שם נושא את הסיבה,
   *  ⭐ והוא נמדד בית-לבית בין מי שיש לו: ⛔ קובץ שנופל בין הכיסאות
   *  אינו נמדד כלל. */
  subsetTools: {
    'roles-harness.mjs': 'רתמת מודל ההרשאות — שלוש האפליקציות שיש בהן כניסה, '
      + 'וביומן אין כניסה ואין תפקיד שיוכרע',
  },
  perAppTools: {
    '_prune-lessons.md': 'לקחי הגיזום של האפליקציה עצמה — היסטוריה פרטית ' +
      'שאין לה מקבילה באחיות, ואיחודה היה מקור אמת שני',
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 112) — ⚠️ המיפוי נגזר מכאן
 *  ⛔ ואינו רשימה שנייה בבודק. */
export const ROWS = [20, 52];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`) בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ ארבעת הריפו בשמם — ⚠️ הרשימה זהה בית-לבית בארבעת העותקים: ⭐ ריפו
 *  שיורד מכאן יורד בארבעתם באותו סבב. */
const PEERS = ['yoman-avoda', 'hanhala-ruchanit', 'schar-limud', 'gius'];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = resolve(ROOT, '..');

let pass = 0, fail = 0;
let n = 1;
const t = (i, cond, m) => { if (cond) { pass++; console.log(`  ok   ${i} · ${m}`); }
                          else { fail++; console.log(`  FAIL ${i} · ${m}`); } };

/*  ⛔ שלושת הסמנים הם המנגנון — ⚠️ בלוק `APP` נחתך מהכרזתו עד באנר הסיום,
 *  ⭐ ואזור «פר-אפליקציה» מהכותרת שנושאת את הנימוק עד באנר הסגירה: ⛔ מה
 *  שמחוץ לשניהם חייב להיות זהה בית-לבית. */
const APP_HEAD = 'const APP = {';
const APP_TAIL = '/* ── סוף APP';
/*  ⛔ הסמן נבנה מחלקיו ⛔ ואינו ליטרל שלם — ⚠️ אחרת הקובץ הזה עצמו נראה
 *  כנושא אזור פר-אפליקציה, ⭐ והשער מודד את עצמו. */
const PA_WORD  = 'פר-אפליקציה';
const PA_HEAD  = '/* ⚠️ ' + PA_WORD + ' — ';
const PA_TAIL  = '/* ⚠️ סוף ' + PA_WORD + ' */';

export function stripAppBlock(text) {
  const i = text.indexOf(APP_HEAD);
  if (i < 0) return text;
  const b = text.indexOf(APP_TAIL, i);
  if (b < 0) return text;
  const e = text.indexOf('\n', b);
  return text.slice(0, i) + (e < 0 ? '' : text.slice(e + 1));
}

/*  ⛔ האזורים נגזרים **אחרי** הסרת `APP` — ⚠️ סמן שחי בתוך בלוק `APP`
 *  אינו אזור, ⭐ והוא כבר ירד. */
export function perAppRegions(text) {
  const out = [];
  let from = 0;
  for (;;) {
    const a = text.indexOf(PA_HEAD, from);
    if (a < 0) break;
    const h = text.indexOf('*/', a);
    const c = h < 0 ? -1 : text.indexOf(PA_TAIL, h);
    if (h < 0 || c < 0) { out.push({ at: a, reason: '', body: '', open: true }); break; }
    out.push({ at: a, end: c + PA_TAIL.length, open: false,
               reason: text.slice(a + PA_HEAD.length, h).trim(),
               body: text.slice(h + 2, c) });
    from = c + PA_TAIL.length;
  }
  return out;
}

/*  ⛔ השלד הוא מה שמושווה — ⚠️ כל אזור פר-אפליקציה מוחלף בסמן קבוע, ⭐
 *  ולכן גם **מספר האזורים ומיקומם** נמדדים: ⛔ אזור שנוסף בריפו אחד מזיז
 *  את השלד ונתפס. */
export function skeleton(text) {
  const s = stripAppBlock(text);
  const regs = perAppRegions(s);
  let out = s;
  for (let k = regs.length - 1; k >= 0; k--) {
    const r = regs[k];
    if (r.open) continue;
    out = out.slice(0, r.at) + '/*PA*/' + out.slice(r.end);
  }
  return out;
}

/*  ⛔ ההודעה נוקבת בשורה הראשונה שנבדלה — ⚠️ «אינם זהים» שולח את הקורא
 *  להריץ diff בעצמו, ⭐ ומספר שורה בשלד מוביל ישירות למקום. */
export function firstDiff(texts) {
  const L = texts.map((x) => skeleton(x).split('\n'));
  const max = Math.max(...L.map((a) => a.length));
  for (let i = 0; i < max; i++) {
    const v = L.map((a) => (a[i] === undefined ? '<סוף>' : a[i]));
    if (v.some((x) => x !== v[0])) return { line: i + 1, v };
  }
  return null;
}

/* ── 1. איסוף הקבצים ───────────────────────────────────────────────────── */
/*  ⛔ הריפו הזה נקרא מ-`ROOT` ⛔ ולא לפי שמו — ⚠️ שער הקריאה-בלבד מריץ את
 *  הסט על עותק בתיקייה זמנית ששמה אינו שם הריפו, ⭐ ושם חיפוש לפי שם היה
 *  מחזיר אפס קבצים: ⛔ והטענה הראשונה הייתה נופלת על עותק תקין. */
const others = PEERS.filter((p) => p !== APP.name);
const dirOf = (p) => (p === APP.name ? ROOT : join(SIBS, p));
const away = others.filter((p) => !existsSync(join(dirOf(p), 'tools')));
const order = [APP.name].concat(others);
const listOf = (p) => {
  try { return readdirSync(join(dirOf(p), 'tools')).sort(); } catch (e) { return []; }
};
const readOf = (p, f) => readFileSync(join(dirOf(p), 'tools', f), 'utf8');

const mine = listOf(APP.name);
t(n++, mine.length > 0,
  `קובצי tools/ נקראו — נמדדו ${mine.length} והצפוי לפחות אחד. ` +
  'מריצים את השער משורש הריפו');

const shared = away.length ? [] :
  mine.filter((f) => order.filter((p) => existsSync(join(dirOf(p), 'tools', f))).length === order.length);

/* ── 2. `pureTools` — קובץ בלי `APP` זהה בית-לבית ──────────────────────── */
const declPure = APP.pureTools || [];
const declPerApp = APP.perAppTools || {};
if (!away.length) {
  const noApp = shared.filter((f) => !readOf(APP.name, f).includes(APP_HEAD) &&
                                     !readOf(APP.name, f).includes(PA_HEAD));
  const drifted = declPure.filter((f) => {
    if (!shared.includes(f)) return true;
    const b = order.map((p) => readOf(p, f));
    return b.some((x) => x !== b[0]);
  });
  t(n++, drifted.length === 0,
    `[pure-tools] קובץ מוכרז שאינו זהה בארבעתן — נמדדו ${drifted.length} מתוך ` +
    `${declPure.length} והצפוי 0${drifted.length ? ` (${drifted.join(', ')})` : ''}. ` +
    'מיישרים את הקובץ בארבעת הריפו באותו סבב');

  const undeclared = noApp.filter((f) => !declPure.includes(f) && !(f in declPerApp));
  t(n++, undeclared.length === 0,
    `[pure-undeclared] קובץ בלי APP שאינו מוכרז — נמדדו ${undeclared.length} והצפוי 0` +
    `${undeclared.length ? ` (${undeclared.join(', ')})` : ''}. ` +
    'מכניסים ל-APP.pureTools, או ל-APP.perAppTools עם הנימוק');

  const stalePure = declPure.filter((f) => !noApp.includes(f));
  t(n++, stalePure.length === 0,
    `[pure-stale] הכרזת pureTools שאין לה קובץ בלי APP — נמדדו ${stalePure.length} והצפוי 0` +
    `${stalePure.length ? ` (${stalePure.join(', ')})` : ''}. מסירים מהרשימה`);

  const paNames = Object.keys(declPerApp);
  const paSame = paNames.filter((f) => {
    if (!shared.includes(f)) return true;
    const b = order.map((p) => readOf(p, f));
    return b.length > 0 && b.filter((x) => x !== b[0]).length === 0;
  });
  t(n++, paSame.length === 0,
    `[perapp-tools] הכרזת perAppTools שתוכנה זהה בארבעתן — נמדדו ${paSame.length} והצפוי 0` +
    `${paSame.length ? ` (${paSame.join(', ')})` : ''}. מעבירים ל-pureTools`);
  const noWhy = paNames.filter((f) => typeof declPerApp[f] !== 'string' || declPerApp[f].length < 20);
  t(n++, paNames.length > 0 && noWhy.length === 0,
    `[perapp-reason] נימוק לכל הכרזת perAppTools — נמדדו ${noWhy.length} בלי נימוק ` +
    `מתוך ${paNames.length} והצפוי 0, ולפחות הכרזה אחת. כותבים בכל אחת למה הקובץ פרטי`);
}

/* ── 2ב. קובץ שקיים בחלק מהריפו — זהה בית-לבית בין מי שיש לו ───────────── */
/*  ⛔ קובץ תשתית שקיים בכמה ריפו ולא בכולם — ⚠️ הוא נופל בין הכיסאות:
 *  ⭐ `pureTools` דורש שיהיה בארבעתם, ⛔ ובלי מדידה הוא נסחף בשקט.
 *  ⚠️ **וההצהרה נמדדת משני צדדיה**: שם שאין לו קובץ אצלנו, ⛔ ושם
 *  שקיים בארבעתם ולכן מקומו ב-`pureTools`. */
if (!away.length) {
  const subset = APP.subsetTools || {};
  const names = Object.keys(subset);
  const missing = names.filter((f) => !mine.includes(f));
  t(n++, missing.length === 0,
    `[subset-missing] הכרזת subsetTools שאין לה קובץ — נמדדו ${missing.length} והצפוי 0` +
    `${missing.length ? ` (${missing.join(', ')})` : ''}. מסירים מהרשימה`);
  const inAll = names.filter((f) => shared.includes(f));
  t(n++, inAll.length === 0,
    `[subset-in-all] קובץ שקיים בארבעתם ומוכרז כתת-קבוצה — נמדדו ${inAll.length} והצפוי 0` +
    `${inAll.length ? ` (${inAll.join(', ')})` : ''}. מעבירים ל-pureTools`);
  const noWhy2 = names.filter((f) => typeof subset[f] !== 'string' || subset[f].length < 20);
  t(n++, noWhy2.length === 0,
    `[subset-reason] נימוק לכל הכרזת subsetTools — נמדדו ${noWhy2.length} בלי נימוק והצפוי 0. ` +
    'כותבים בכל אחת למה הקובץ אינו בארבעתם');
  const subDrift = names.filter((f) => {
    const b = order.filter((p) => existsSync(join(dirOf(p), 'tools', f))).map((p) => readOf(p, f));
    return b.length < 2 || b.some((x) => x !== b[0]);
  });
  t(n++, subDrift.length === 0,
    `[subset-drift] קובץ תת-קבוצה שאינו זהה בין מי שיש לו — נמדדו ${subDrift.length} והצפוי 0` +
    `${subDrift.length ? ` (${subDrift.join(', ')})` : ''}. מיישרים אותו באותו סבב`);
}

/* ── 3. גוף השער זהה אחרי הסרת `APP` ואזורי פר-אפליקציה ────────────────── */
if (!away.length) {
  const gates = shared.filter((f) => f.endsWith('.mjs'));
  const bad = [];
  const noopRegions = [];
  const shortReason = [];
  for (const f of gates) {
    const texts = order.map((p) => readOf(p, f));
    const d = firstDiff(texts);
    if (d) bad.push(`${f}:${d.line}`);
    const regs = order.map((p, k) => perAppRegions(stripAppBlock(texts[k])));
    if (regs[0].some((r) => r.open)) bad.push(`${f}: אזור פר-אפליקציה בלי סוגר`);
    regs[0].forEach((r, k) => {
      if (r.reason.length < 20) shortReason.push(`${f}#${k + 1}`);
      const bodies = regs.map((a) => (a[k] ? a[k].body : null));
      if (bodies.filter((b) => b !== bodies[0]).length === 0) noopRegions.push(`${f}#${k + 1}`);
    });
  }
  t(n++, gates.length > 0,
    `שערים משותפים להשוואה — נמדדו ${gates.length} והצפוי לפחות אחד. ` +
    'מריצים את הסבב עם ארבעת הריפו זה לצד זה');
  t(n++, bad.length === 0,
    `[tools-drift] גוף שער שנבדל מעבר ל-APP — נמדדו ${bad.length} מתוך ${gates.length} ` +
    `והצפוי 0${bad.length ? ` (${bad.join(', ')})` : ''}. מיישרים את השורה בארבעתן, ` +
    'או עוטפים אותה באזור פר-אפליקציה עם נימוקו');
  t(n++, noopRegions.length === 0,
    `[perapp-noop] אזור פר-אפליקציה שתוכנו זהה בארבעתן — נמדדו ${noopRegions.length} ` +
    `והצפוי 0${noopRegions.length ? ` (${noopRegions.join(', ')})` : ''}. מסירים את הסמנים`);
  t(n++, shortReason.length === 0,
    `[perapp-reason] אזור פר-אפליקציה בלי נימוק בן 20 תווים — נמדדו ${shortReason.length} ` +
    `והצפוי 0${shortReason.length ? ` (${shortReason.join(', ')})` : ''}. כותבים בכותרת למה`);
} else {
  /*  ⛔ ההשוואה שלא רצה **נראית** ⛔ ואינה מדלגת בשתיקה — ⚠️ ואינה נספרת
   *  כטענה שעברה: ⭐ עותק עץ בתיקייה זמנית אין לצידו אחיות, ⛔ ושער
   *  שהיה נופל שם היה מפיל את קו הבסיס של שער הקריאה-בלבד. */
  console.log(`  ⚠️  ההשוואה בין הריפו לא רצה — ${away.join(' · ')} אינם על הדיסק ` +
              `לצד ${APP.name}; מריצים את הסבב עם ארבעת הריפו זה לצד זה`);
}

if (RUN_MUT) {
/*  ⛔ המוטציות רצות על מחרוזות ⛔ ואינן נכתבות לעץ — ⚠️ האחות הסינתטית
 *  היא המקור עצמו, ⭐ ולכן הן רצות גם בעותק שאין לצידו ריפו אחות. */
const SELF = readFileSync(join(ROOT, 'tools', 'test_toolsid.mjs'), 'utf8');

/*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ היא מזיזה תו בגוף
 *  השער **מחוץ** ל-`APP`, ⭐ ושער שמשווה קבצים שלמים בלי להסיר `APP`
 *  היה נופל על כל ארבעתם ממילא. */
const moved = SELF.replace('const PEERS = [', 'const  PEERS = [');
t(n++, moved !== SELF && firstDiff([SELF, moved, SELF, SELF]) !== null,
  '[tools-drift] מוטציה: רווח שנוסף מחוץ ל-APP באחות — נתפסה');

/*  ⭐ מוטציית-נגד: שינוי חי **בתוך** בלוק `APP` — ⛔ אינו מפיל. */
const inApp = SELF.replace(`name: '${APP.name}',`, "name: 'שם-אחר',");
t(n++, inApp !== SELF && firstDiff([SELF, inApp, SELF, SELF]) === null,
  '[tools-drift] ⭐ מוטציית-נגד: שינוי בתוך בלוק APP ⛔ אינו מפיל');

/*  ⛔ המוטציה השנייה מכוונת לאזור פר-אפליקציה — ⚠️ אזור שנוסף בריפו אחד
 *  בלבד מזיז את השלד, ⭐ והטענה שנופלת היא `tools-drift`. */
const withPa = SELF.replace('const ROOT = join(',
  PA_HEAD + 'נימוק סינתטי שאורכו מעל עשרים תווים */\nconst X = 1;\n' +
  PA_TAIL + '\nconst ROOT = join(');
t(n++, withPa !== SELF && firstDiff([SELF, withPa, SELF, SELF]) !== null,
  '[tools-drift] מוטציה: אזור פר-אפליקציה שנוסף באחות אחת — נתפסה');

/*  ⭐ מוטציית-נגד: אותו אזור בדיוק בארבעתן — ⛔ אינו מפיל, ⚠️ וזה בדיוק
 *  מה שהסמן נועד להתיר. */
t(n++, firstDiff([withPa, withPa, withPa, withPa]) === null,
  '[tools-drift] ⭐ מוטציית-נגד: אותו אזור בארבעתן ⛔ אינו מפיל');
}

console.log(fail ? `\n✗ סבב 112 (זהות קובצי tools) — ${fail} טענות נכשלו`
                 : `\n✓ סבב 112 (זהות קובצי tools) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
