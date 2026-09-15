#!/usr/bin/env node
/*  test_parentchild.mjs — אב ובן: ירושת המחיקה, ירושת החותמת וסדר הדחיפה.
 *
 *  **מה נאכף:** מפת האב-ובן מוצהרת ונמדדת משני צדדיה מול הסכימה החיה;
 *  ⛔ אין מפתח זר שמוחק — אפס `on delete cascade`, ⚠️ ומצב המפתח הזר
 *  מוצהר פר-זוג; ⛔ האב נדחף לפני הבן; ⛔ הבן יורש את המחיקה ואת החותמת
 *  מהאב, ⚠️ והירושה נמדדת בהרצה ברתמת `vm`; ⛔ ובן שיש לו שני הורים
 *  מצהיר את **סדר ההכרעה** ביניהם.
 *
 *  **הנימוק המדוד:** בשתי אפליקציות נמדד שמחיקת האב אינה נוגעת בבן —
 *  ⛔ תלמיד שנמחק השאיר את כל תנועותיו חיות, ⚠️ ותורם שנמחק השאיר את
 *  התחייבויותיו ואת תנועותיו: ⭐ הן המשיכו להיספר בסיכומי החודש,
 *  ⛔ והוצגו ביומן התנועות בלי שם אב.
 *
 *  **מה יישבר בלעדיו:** ⛔ בן שאינו יורש את המחיקה חוזר לחיים בכל מסך
 *  שסופר אותו; ⛔ בן שאינו יורש את החותמת נושא מחיקה בחותמת שנייה,
 *  ⚠️ ומכשיר שממזג מכריע על שני אירועים במקום אחד; ⛔ ובן שנדחף לפני
 *  האב נדחה במפתח הזר, ⚠️ או יוצר בענן רגע שבו יש בן בלי אב.
 *
 *  **מה אינו נאכף כאן:** ⛔ הרצת המיגרציות — ⚠️ הבדיקה קוראת אותן כטקסט,
 *  ⭐ ומצב ההרצה נמדד מול המסד בשער עובדות המסד; ⛔ ומבנה הטבלאות עצמו —
 *  ⚠️ האינדקסים, ההרשאות והאידמפוטנטיות נמדדים בשערי המסד.
 *
 *  ⛔ הקובץ זהה בית-לבית בכל הריפו פרט לבלוק `APP` שבראשו.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { DB_SCHEMA } from './db_schema.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
/*  ⛔ **מה נכנס**: תחילית הטבלאות של האפליקציה · מפת האב-ובן · הנימוק
 *  להיעדרה · מפת הבנים לשני הורים · הכותב שסדרו נמדד · ורתמת הירושה.
 *  ⛔ **ומה מפיל**: זוג מוצהר שאין לו טבלה חיה, מועמד חי בלי הצהרה,
 *  נימוק היעדר שהוא נוכחות בלבד, והצהרת שני-הורים שאין לה בן.
 *  ⭐ **ולמה המבנה קיים**: שלוש האפליקציות מחזיקות אב-ובן בשלושה מימושים,
 *  ⚠️ והדבר היחיד שאפשר להשוות בהן הוא **מה שהוצהר** — ⛔ והגוף שמודד
 *  אותו זהה בכולן. */
const APP = {
  app: 'schar-limud',
  tablePrefix: 'sl_',
  dbSchema: DB_SCHEMA,
  parentChild: [
    { parent: 'sl_students', child: 'sl_transactions', fk: 'student_client_id',
      fkMode: 'restrict', push: 'list',
      why: 'תנועת הכספים תלויה בתלמיד — ⛔ ותנועה בלי תלמיד אינה ניתנת לשיוך' },
  ],
  /*  ⛔ נימוק ההיעדר — ⚠️ **ולמה ריק כאן**: נמדד ויש, ⭐ ויש כאן זוגות
   *  אב-ובן מוצהרים: ⛔ נימוק לצד זוגות היה מצהיר היעדר וקיום כאחד. */
  noPairs: '',
  /*  ⛔ בן לשני הורים — ⚠️ **ולמה ריק**: נמדד ואין, ⭐ ולכל בן כאן אב
   *  אחד: ⛔ הצהרה שאין לה בן בעל שני הורים מפילה. */
  twoParents: {},
  pushWriter: null,
  /*  ⚠️ רתמת הירושה — ⛔ הבן הוא שורה עצמאית, ⭐ ולכן הירושה היא פונקציה
   *  שמקבלת את האב ואת הבן: ⛔ הרתמה חותכת אותה מהמקור ומריצה אותה. */
  inherit: {
    why: 'תנועה יורשת את מחיקת התלמיד — ⛔ אחרת היא נספרת בסיכומי החודש בלי אב',
    cols: ['deleted', 'deleted_at', 'deleted_by', 'updated_at'],
    cut: (src) => {
      const a = src.indexOf('function pcChildKill(');
      if (a < 0) return '';
      let d = 0;
      for (let k = src.indexOf('{', a); k < src.length; k++) {
        if (src[k] === '{') d++;
        else if (src[k] === '}') { d--; if (!d) return src.slice(a, k + 1); }
      }
      return '';
    },
    stubs: () => ({}),
    call: (sb, parent, kid) => sb.pcChildKill(parent, kid),
    mutStamp: (code) => code.replace('updated_at: parent.updated_at', 'updated_at: Date.now()'),
    mutDel: (code) => code.replace('deleted: !!parent.deleted', 'deleted: false'),
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ הרשימה ריקה עד שהשורה
 *  נכנסת לטבלה, ⛔ והשער מוכרז עד אז ב-`gateNoRows` עם נימוקו: ⭐ הצהרה
 *  ריקה ולא היעדר — ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [164];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = 0, pass = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה.
 *  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ שש הטענות רצות בכולן, ⭐ וכל אחת
 *  נושאת ענף מדוד גם באפליקציה שאין בה אב-ובן: ⛔ טענה שהייתה מדולגת שם
 *  הייתה מדווחת «עבר» על מה שלא נמדד. */
const FLOOR = { shared: 6, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות — ⚠️ `null` הוא תהליך שלא הגיע
 *  לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה שמבדיל ריצה
 *  חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ **מה נכנס**: מספר הטענות שרצו עד
 *  שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית — ⛔ ויותר
 *  ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה מתעדכנת
 *  מפסיקה למדוד את מה שנוסף. */
const FLOOR_MAX = (() => {
  const r = /^(\d+)-(\d+)$/.exec(process.env.GATE_FLOOR_RANGE || '');
  return r ? Number(r[2]) : EXPECTED;
})();
process.on('exit', () => {
  /*  ⚠️ שער שיובא לתהליך של שער אחר אינו סוגר — ⛔ הספירה שלו לא רצה. */
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
const t = (cond, m) => { RAN++; if (cond) { pass++; console.log('  ok   ' + m); }
                         else { failed++; console.error('  FAIL ' + m); } };

/*  ⛔ המקור נקרא פעם אחת — ⚠️ שער שקורא את אותו קובץ בכל טענה משלם על כל
 *  אחת מהן, ⭐ והתקציב נגזר ממספר הקריאות ⛔ ולא מגודל הקובץ. */
const SRC = readFileSync(join(ROOT, 'index.html'), 'utf8');
/*  ⛔ הערות SQL נחתכות לפני המדידה — ⚠️ המילים `references` ו-`cascade`
 *  מופיעות בהערות ההסבר של המיגרציות, ⭐ וספירה גולמית מדווחת הפרה על
 *  קובץ תקין. */
const sqlCode = (s) => s.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
const MIG = (() => {
  const d = join(ROOT, 'migrations');
  if (!existsSync(d)) return '';
  return readdirSync(d).filter((f) => f.endsWith('.sql')).sort()
    .map((f) => sqlCode(readFileSync(join(d, f), 'utf8'))).join('\n');
})();

/* ══════════════════════════════════════════════════════════════════════════
   העוזרים — הגזירות שכל הטענות נשענות עליהן
   ══════════════════════════════════════════════════════════════════════════ */

/*  ⛔ מועמדי האב-ובן נגזרים מהסכימה ⛔ ואינם רשימה שנייה — ⚠️ **מה נכנס**:
 *  כל טבלה של האפליקציה הזו שיש בה עמודה `<שם>_client_id`; ⛔ **ומה
 *  מפיל**: מועמד חי שאינו מוצהר. ⭐ **ולמה גזירה**: רשימה ידנית תופסת
 *  את מה שהיה ⛔ ולא את מה שנוסף, ⚠️ ועמודה שנוספת במיגרציה נכנסת לסכימה
 *  ומופיעה כאן מעצמה. */
function liveKids(schema) {
  const mine = schema.filter((r) => String(r.t).startsWith(APP.tablePrefix));
  const out = [];
  for (const r of mine)
    for (const c of String(r.c).split(','))
      if (/^.+_client_id$/.test(c.trim())) out.push({ child: r.t, fk: c.trim() });
  return out;
}

/*  ⛔ רשימת הדחיפה נחלצת מהמקור ⛔ ואינה מוקלדת כאן — ⚠️ רשימה שנייה
 *  מתיישנת בשקט ביום שבו טבלה נוספת למקור. */
function pushList(src) {
  const m = /var PUSH_TABLES = \[([^\]]*)\]/.exec(src);
  return m ? (m[1].match(/'([^']+)'/g) || []).map((x) => x.slice(1, -1)) : [];
}

/*  ⛔ גוף פונקציה נחתך בהתאמת סוגריים ⛔ ולא בחלון תווים קבוע — ⚠️ גוף
 *  שנמתח מעבר לסוגר הסוגר מכניס למדידה קוד שאינו שלה, ⭐ וגוף שנחתך
 *  באמצע משמיט בדיוק את השורה שנמדדת. */
function cutFn(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  const b = src.indexOf('{', i);
  if (b < 0) return '';
  let depth = 0;
  for (let k = b; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (!depth) return src.slice(i, k + 1); }
  }
  return '';
}

/*  ⛔ סדר הדחיפה נמדד בשתי צורות — ⚠️ בן שמופיע ב-`PUSH_TABLES` נמדד
 *  במקומו ברשימה, ⭐ ובן שנכתב בתוך דחיפת האב נמדד בגוף הכותב: ⛔ צורה
 *  אחת בלבד הייתה מאשרת את השנייה בשתיקה. */
function orderViolations(src) {
  const list = pushList(src);
  const bad = [];
  for (const p of APP.parentChild) {
    if (p.push === 'list') {
      const a = list.indexOf(p.parent), b = list.indexOf(p.child);
      if (a < 0 || b < 0 || a > b) bad.push(`${p.parent}⟵${p.child}`);
    } else {
      if (list.indexOf(p.child) >= 0) bad.push(`${p.child} ברשימת הדחיפה`);
      if (list.indexOf(p.parent) < 0) bad.push(`${p.parent} אינו ברשימת הדחיפה`);
    }
  }
  const w = APP.pushWriter;
  if (w) {
    const body = cutFn(src, w.fn);
    const a = body.indexOf(w.first), b = body.indexOf(w.then);
    if (a < 0 || b < 0 || a > b) bad.push(`${w.fn}: ${w.first} אינו לפני ${w.then}`);
  }
  return bad;
}

/*  ⛔ מצב המפתח הזר נמדד מול המיגרציות — ⚠️ **מה נכנס**: `restrict` —
 *  מפתח זר שאינו מוחק, ⛔ ו-`none` — אפס הפניות מהבן לאב; ⛔ **ומה
 *  מפיל**: מצב מוצהר שאינו מה שכתוב במיגרציה. ⭐ **ולמה שני מצבים**:
 *  שתי ההכרעות נמדדו בפועל — ⚠️ מי שנושא מפתח זר חייב את סדר הדחיפה,
 *  ⛔ ומי שאינו נושא אותו קיבל שורות ממכשירים אופליין בסדר לא ידוע. */
function fkViolations(mig) {
  const bad = [];
  for (const p of APP.parentChild) {
    const ref = new RegExp('references\\s+public\\.' + p.parent + '\\s*\\(');
    const res = new RegExp('foreign key\\s*\\(\\s*' + p.fk + '\\s*\\)\\s*references\\s+public\\.' +
                           p.parent + '\\s*\\([^)]*\\)\\s*on delete restrict');
    if (p.fkMode === 'restrict' && !res.test(mig)) bad.push(`${p.child}: אין מפתח זר restrict`);
    if (p.fkMode === 'none' && ref.test(mig)) bad.push(`${p.child}: מפתח זר פיזי שהוצהר כלא-קיים`);
  }
  return bad;
}

/*  ⛔ הרתמה מריצה את פונקציית הירושה עצמה ⛔ ולא regex עליה — ⚠️ מחרוזת
 *  שמופיעה בגוף אינה עדות על מה שהגוף מחזיר, ⭐ והטענה כאן היא על הערך
 *  שחזר: ⛔ עותק שני של הכלל היה ממשיך לעבור אחרי שהמקורי השתנה. */
function runInherit(code) {
  const sb = Object.assign({ console, Object, Array, String, Number, Math, Date, JSON, RegExp },
                           APP.inherit.stubs());
  vm.createContext(sb);
  vm.runInContext(code, sb);
  const parent = { client_id: 'p1', id: 'p1', deleted: true, deleted_at: '2026-09-14T06:00:00.000Z',
                   deleted_by: 'רב א', updated_at: 1757800000000,
                   date_iso: '2026-09-14', marks: { k1: { s: 'p', min: 0 } } };
  const kid = { client_id: 'c1', deleted: false, deleted_at: null, deleted_by: null,
                updated_at: 1757000000000 };
  const got = APP.inherit.call(sb, parent, kid);
  const miss = [];
  if (!got) return { miss: ['הבן לא חזר מהרתמה'], parent };
  for (const c of APP.inherit.cols)
    if (got[c] !== parent[c]) miss.push(`${c}: ${JSON.stringify(got[c])} ≠ ${JSON.stringify(parent[c])}`);
  return { miss, parent, got };
}

/* ══════════════════════════════════════════════════════════════════════════
   1 · המפה, ההיעדר, המפתח הזר והסדר
   ══════════════════════════════════════════════════════════════════════════ */
console.log(`\n— אב-ובן (${APP.app}) —`);

const PAIRS = APP.parentChild;
const LIVE = liveKids(APP.dbSchema);
const TABLES = new Set(APP.dbSchema.map((r) => r.t));
{
  const stale = PAIRS.filter((p) => !TABLES.has(p.parent) || !TABLES.has(p.child) ||
    !LIVE.some((l) => l.child === p.child && l.fk === p.fk));
  const undecl = LIVE.filter((l) => !PAIRS.some((p) => p.child === l.child && p.fk === l.fk));
  t(stale.length === 0 && undecl.length === 0,
    `1 · [pc-map] המפה משני צדדיה — נמדדו ${PAIRS.length} זוגות מוצהרים מול ` +
    `${LIVE.length} מועמדים חיים בסכימה, ו-${stale.length}+${undecl.length} חריגות והצפוי אפס` +
    `${stale.length ? ' (הצהרה בלי טבלה חיה: ' + stale.map((p) => p.child).join(', ') + ')' : ''}` +
    `${undecl.length ? ' (מועמד חי בלי הצהרה: ' + undecl.map((l) => l.child + '.' + l.fk).join(', ') + ')' : ''}. ` +
    'מה עושים: מוסיפים את הזוג ל-`APP.parentChild`, או מסירים הצהרה שאין לה טבלה');
}
{
  /*  ⛔ ההיעדר מוצהר ⛔ ואינו נשמט — ⚠️ שדה חסר נקרא «לא נשאל», ⭐ וריק
   *  עם נימוק נקרא «נמדד ואין»: ⛔ ונימוק שהוא נוכחות בלבד מפיל, ⚠️ ש-
   *  «אין כאן אב-ובן» הוא המדידה ⛔ ואינו הנימוק. */
  const why = String(APP.noPairs || '');
  const presence = /^\s*(אין|לא|אינו|אינה)[\s,.]/.test(why) && why.length < 60;
  const okAbs = PAIRS.length > 0 ? why === '' : (why.length >= 20 && !presence);
  t(okAbs,
    `2 · [pc-absence] ההיעדר מוצהר — נמדדו ${PAIRS.length} זוגות ונימוק באורך ${why.length}, ` +
    'והצפוי: זוגות ⇒ נימוק ריק, אפס זוגות ⇒ נימוק תפקידי בן 20 תווים לפחות. ' +
    'מה עושים: כותבים ב-`APP.noPairs` איזו יכולת אינה קיימת כאן, ולא שהיא אינה קיימת');
}
{
  const casc = (MIG.match(/on delete cascade/gi) || []).length;
  const bad = fkViolations(MIG);
  t(casc === 0 && bad.length === 0,
    `3 · [pc-fk] אין מפתח זר שמוחק — נמדדו ${casc} מופעי \`on delete cascade\` והצפוי אפס, ` +
    `ו-${bad.length} מצבי מפתח זר שאינם כמוצהר מתוך ${PAIRS.length}${bad.length ? ' (' + bad.join(' · ') + ')' : ''}. ` +
    'מה עושים: גורעים את ה-`cascade` במיגרציה חדשה, או מיישרים את `fkMode` למה שרץ במסד');
}
{
  const bad = orderViolations(SRC);
  const list = pushList(SRC);
  t(list.length > 0 && bad.length === 0,
    `4 · [pc-order] האב נדחף לפני הבן — נמדדו ${list.length} טבלאות ברשימת הדחיפה ` +
    `ו-${bad.length} הפרות סדר מתוך ${PAIRS.length} זוגות והצפוי אפס` +
    `${bad.length ? ' (' + bad.join(' · ') + ')' : ''}. ` +
    'מה עושים: מקדימים את האב לבן ב-`PUSH_TABLES`, או בגוף הכותב שמוצהר ב-`APP.pushWriter`');
}
{
  /*  ⛔ הירושה נמדדת בהרצה — ⚠️ ובאפליקציה שאין בה אב-ובן הטענה מודדת את
   *  **שני צדדי ההצהרה**: ⭐ אין זוגות ⇒ אין פונקציית ירושה, ⛔ ויש זוגות
   *  ⇒ יש: ⚠️ הצהרה שנשמטה בצד אחד היא בדיוק מה שמדלג בשתיקה. */
  if (!APP.inherit) {
    t(PAIRS.length === 0,
      `5 · [pc-inherit] אין פונקציית ירושה, ונמדדו ${PAIRS.length} זוגות מוצהרים והצפוי אפס. ` +
      'מה עושים: מצהירים `APP.inherit` לאפליקציה שיש בה אב-ובן');
  } else {
    const code = APP.inherit.cut(SRC);
    const r = code ? runInherit(code) : { miss: ['גוף פונקציית הירושה לא נחלץ מהמקור'] };
    t(r.miss.length === 0,
      `5 · [pc-inherit] הבן יורש את המחיקה ואת החותמת — נמדדו ${r.miss.length} שדות שאינם ` +
      `כשל האב מתוך ${APP.inherit.cols.length} והצפוי אפס${r.miss.length ? ' (' + r.miss.join(' · ') + ')' : ''}. ` +
      'מה עושים: גוזרים את השדות מרשומת האב, ⛔ ולא `Date.now()` ולא `false`');
  }
}
{
  /*  ⛔ בן לשני הורים מצהיר את סדר ההכרעה — ⚠️ **מה נכנס**: שם הבן וסדר
   *  ההורים שנשאלים; ⛔ **ומה מפיל**: בן שיש לו שני הורים ואינו מוצהר,
   *  ⛔ והצהרה לבן שאין לו שניים. ⭐ **ולמה הסדר**: שני אבות שנמחקו
   *  בזמנים שונים הם שתי חותמות לאותה מחיקה, ⛔ ובלי סדר מוצהר הבן נושא
   *  את זו של מי שנכתב אחרון. */
  const multi = {};
  for (const p of PAIRS) (multi[p.child] = multi[p.child] || []).push(p.parent);
  const need = Object.keys(multi).filter((c) => multi[c].length > 1);
  const decl = Object.keys(APP.twoParents);
  const missing = need.filter((c) => !decl.includes(c));
  const stale = decl.filter((c) => !need.includes(c) ||
    APP.twoParents[c].order.join('|') !== multi[c].join('|') ||
    String(APP.twoParents[c].why || '').length < 20);
  t(missing.length === 0 && stale.length === 0,
    `6 · [pc-two] בן לשני הורים מצהיר את סדר ההכרעה — נמדדו ${need.length} בנים ` +
    `בעלי שני הורים ו-${decl.length} הצהרות, ו-${missing.length}+${stale.length} חריגות והצפוי אפס` +
    `${missing.length ? ' (בלי הצהרה: ' + missing.join(', ') + ')' : ''}` +
    `${stale.length ? ' (הצהרה שאינה תואמת: ' + stale.join(', ') + ')' : ''}. ` +
    'מה עושים: מצהירים ב-`APP.twoParents` את ההורים בסדר שבו הם נשאלים, ואת הנימוק');
}

/*  ⛔ מכאן ולמטה מוטציות — ⚠️ הן רצות ברמה המלאה בלבד: ⛔ הרמה המהירה
 *  עוצרת כאן עם קוד היציאה של הטענות שכבר רצו, ⭐ והכיסוי אינו יורד. */
mutStage();
if (!RUN_MUT) {
  console.log('\n⏭ test_parentchild: המוטציות רצות ברמה המלאה (--full)');
  process.exit(failed ? 1 : 0);
}

/* ══════════════════════════════════════════════════════════════════════════
   2 · מוטציות — כל טענה שאין מוטציה שמפילה אותה אינה שער
   ══════════════════════════════════════════════════════════════════════════ */
console.log('\n— מוטציות —');
{
  /*  ⛔ המוטציה מוסיפה לסכימה בן שאינו מוצהר — ⚠️ היא רצה על **עותק**
   *  של הסכימה בזיכרון, ⛔ ואינה נכתבת לעץ. */
  const mut = APP.dbSchema.concat([{ p: 'mut', t: APP.tablePrefix + 'mut_kid',
                                     c: 'client_id,' + APP.tablePrefix.replace(/_$/, '') + '_client_id' }]);
  const undecl = liveKids(mut).filter((l) => !PAIRS.some((p) => p.child === l.child && p.fk === l.fk));
  t(undecl.length === 1,
    'מ1 · [pc-map] מוטציה: בן חי שאינו מוצהר — נתפס (טענה 1 הייתה נכשלת)');
}
{
  const mut = MIG + '\n  foreign key (x_client_id) references public.zz(client_id) on delete cascade;\n';
  t((mut.match(/on delete cascade/gi) || []).length === 1,
    'מ2 · [pc-fk] מוטציה: `on delete cascade` שנוסף למיגרציה — נתפס (טענה 3 הייתה נכשלת)');
}
{
  /*  ⛔ המוטציה מהפכת את סדר הדחיפה — ⚠️ היא שוברת את **המנגנון**: ⭐ הבן
   *  קודם לאב, ⛔ ורגע אחד שבו יש בן בלי אב הוא בדיוק מה שהסדר מונע. */
  const w = APP.pushWriter;
  const list = pushList(SRC);
  let mut = SRC, tag = '';
  if (APP.parentChild.some((p) => p.push === 'list')) {
    const p = APP.parentChild.find((x) => x.push === 'list');
    mut = SRC.replace(/var PUSH_TABLES = \[[^\]]*\]/,
      "var PUSH_TABLES = ['" + list.filter((x) => x !== p.parent)
        .concat([p.parent]).join("', '") + "']");
    tag = 'רשימת הדחיפה';
  } else if (w) {
    const body = cutFn(SRC, w.fn);
    const swapped = body.replace(w.first, '@@PC@@').replace(w.then, w.first).replace('@@PC@@', w.then);
    mut = SRC.replace(body, swapped);
    tag = 'גוף הכותב';
  }
  /*  ⛔ הדילוג מוכרז ⛔ ואינו שקט — ⚠️ אין כאן זוג אב-ובן שאפשר להפוך
   *  את סדרו, ⭐ והמצב הזה עצמו נמדד בטענות 1 ו-2. */
  if (mut === SRC) console.log('  ⏭ מ3 · אין כאן זוג אב-ובן — אין סדר שאפשר להפוך');
  else t(orderViolations(mut).length > 0,
    `מ3 · [pc-order] מוטציה: הבן קודם לאב ב${tag} — נתפסה (טענה 4 הייתה נכשלת)`);
}
if (APP.inherit) {
  const code = APP.inherit.cut(SRC);
  {
    const mut = APP.inherit.mutStamp(code);
    const r = mut === code ? { miss: [] } : runInherit(mut);
    t(mut !== code && r.miss.some((x) => x.indexOf('updated_at') === 0),
      'מ4 · [pc-inherit] מוטציה: ביטול ירושת החותמת — נתפסה (טענה 5 הייתה נכשלת)');
  }
  {
    const mut = APP.inherit.mutDel(code);
    const r = mut === code ? { miss: [] } : runInherit(mut);
    t(mut !== code && r.miss.some((x) => x.indexOf('deleted:') === 0),
      'מ5 · [pc-inherit] מוטציה: האב נמחק והבן נשאר חי — נתפסה (טענה 5 הייתה נכשלת)');
  }
} else {
  /*  ⛔ הדילוג מוכרז ⛔ ואינו שקט — ⚠️ אין כאן פונקציית ירושה למוטט,
   *  ⭐ והטענה שמכסה את המצב הזה היא 5 עצמה: ⛔ היא מודדת ששני צדדי
   *  ההצהרה מסכימים. */
  console.log('  ⏭ מ4/מ5 · אין פונקציית ירושה באפליקציה הזו — אין מה למוטט');
}
{
  /*  ⭐ מוטציית-נגד: **הצהרה שנוספה כדין** ⛔ אינה מפילה — ⚠️ הטענות
   *  מודדות את ההתאמה בין המפה לסכימה, ⛔ ולא את אורך הרשימה: ⭐ שער
   *  שהיה נופל על כל תוספת היה הופך כל טבלה חדשה להפרה. */
  const mut = APP.dbSchema.concat([{ p: 'mut', t: APP.tablePrefix + 'mut_solo', c: 'client_id,name' }]);
  const undecl = liveKids(mut).filter((l) => !PAIRS.some((p) => p.child === l.child && p.fk === l.fk));
  t(undecl.length === 0 && liveKids(mut).length === LIVE.length,
    'נ1 · ⭐ מוטציית-נגד: טבלה שנוספה ואין בה מפתח אב ⛔ אינה מפילה');
}

console.log('\n' + (failed === 0 ? '✅' : '❌') +
  ` אב-ובן — ${pass} טענות עברו, ${failed} נכשלו`);
process.exit(failed ? 1 : 0);
