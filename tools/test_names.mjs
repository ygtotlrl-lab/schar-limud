#!/usr/bin/env node
/*  test_names.mjs — שם נגזר מדפוס מוצהר.
 *
 *  **מה נאכף:** שלושת תחומי השמות — ⚠️ פונקציות · קובצי `tools/` · מחלקות
 *  CSS — ⛔ נמדדים מול הדפוס שמוצהר ב-`APP.namePolicy`: ⭐ תחילית פונקציה
 *  שהיא **תחיליתה החיה של אחות** מפילה, ⛔ קובץ שמריץ את עצמו ואינו נושא
 *  שם של שער מפיל, ⚠️ ושם מודול רב-מילי שנושא `_` מפיל.
 *
 *  **הנימוק המדוד:** 49 פונקציות בהנהלה נשאו את התחילית `sl` — ⛔ שהיא
 *  תחיליתה של שכר לימוד: ⚠️ `slSetLateMin` נראה בדיוק כמו `lsSweep`,
 *  ⭐ ורק מי שיודע ש-`sl` הוא ריפו אחר רואה את השארית. ⛔ ונמדד שחיתוך
 *  השמות בין שתי האפליקציות הוא **אפס** — ⚠️ ולכן אין זוג גופים להשוות,
 *  ⭐ והשאלה אינה «איזה מימוש נכון» אלא «למי השם שייך».
 *
 *  **מה יישבר בלעדיו:** ⛔ שם ייכתב לפי מה שנשמע טוב — ⚠️ ומי שמחפש את
 *  שכבת השינה יחפש ב-`sl`, ⭐ ויגיע לשכר לימוד: ⛔ ושארית גזירה שנראית
 *  כשכבה משותפת מוסבת «בחזרה» בתום לב בסבב הבא.
 *
 *  **מה אינו נאכף כאן:** ⛔ **שם שנגזר מהדפוס ומתאר את הדבר הלא נכון** —
 *  ⚠️ אין לכך מדידה מכנית, ⭐ ושורת «אוצר מילים אחד לפעולה אחת» היא
 *  בת-הזוג · ⛔ **ותחילית שאינה של אף אחות אינה נמדדת** — ⚠️ היא מוצר,
 *  ⭐ ומפקד שלה נגזר מהמסכים וישתנה איתם · ⛔ **ושם מחלקה אינו נמדד
 *  בתוכנו** — ⚠️ רק בצורתו · ⛔ **ומחלקה שנבנית בתוך מחרוזת JS אינה
 *  נמדדת כאן** — ⚠️ ההלבנה מוחקת אותה יחד עם המחרוזת, ⭐ והיא נמדדת
 *  בשורת «סלקטור בלי קורא» מול גיליון הסגנון.
 *
 *  זהה בית-לבית בכל הריפו פרט לבלוק APP.
 */

import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';
import { whiten } from './whiten.mjs';
import { appSrc } from './appsrc.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  /*  ⛔ מרשם הדפוסים — ⚠️ **מה נכנס**: תחום ⟵ הדפוס שלו והנימוק
   *  התפקידי; ⛔ **ומה מפיל**: תחום שהשער מודד ואינו מוצהר, תחום
   *  שמוצהר ואינו נמדד, ⛔ ונימוק ריק. ⭐ **ולמה המבנה קיים**: בלעדיו
   *  הדפוס חי בגוף ה-probe בלבד, ⚠️ ומי שקורא שם אינו יודע מה מותר. */
  namePolicy: {
    domains: {
      fn: {
        pattern: 'lowerCamelCase · ותחילית שהיא שכבה משותפת או האפליקציה',
        why: 'התחילית אומרת לקורא איפה הפונקציה חיה — ⛔ ותחילית של אחות שולחת אותו לריפו אחר',
      },
      gate: {
        pattern: 'test_<נושא> · check-<נושא>',
        why: 'שער מריץ את עצמו — ⛔ ושם שאינו נגזר אינו נמצא בסריקה שמרכיבה את הסט',
      },
      module: {
        pattern: 'שם יחיד, ורב-מילי ב-kebab-case',
        why: 'מודול אינו מריץ את עצמו — ⛔ ושם שנקרא כמזהה JS הוא שתי צורות לאותו מושג',
      },
      token: {
        pattern: '--<קבוצה>-<מדרגה> · ומספר נושא מקף לפניו',
        why: 'שני דפוסי מספר באותו גיליון מכריחים כל קורא לזכור איזה שייך למה — ⛔ ומי שיוסיף מדרגה לא יידע באיזה לבחור',
      },
      cls: {
        pattern: 'kebab-case',
        why: 'המחלקה נחתכת מהגיליון באסימון מלא — ⛔ ואות גדולה או קו תחתון שוברים את החיתוך',
      },
    },
    /*  ⛔ שם שנשאר בכוונה בתחילית של אחות — ⚠️ **מה נכנס**: השם ⟵ מה
     *  שהוא עושה שאין לו מקבילה בתחילית אחרת; ⛔ **ומה מפיל**: הכרזה
     *  שאין לה שם חי, ⛔ ושם חורג שאינו כאן. ⭐ **ולמה ריק**: נמדד ואין. */
    fnAllow: {},
    /*  ⛔ אסימון שחי כאן בלבד — ⚠️ **מה נכנס**: השם ⟵ תפקידו כאן;
     *  ⛔ **ומה מפיל**: אסימון שחי כאן בלבד ואינו כאן, ⛔ והכרזה
     *  לאסימון שחי גם באחות. ⭐ **ולמה המבנה קיים**: «אינו בכולן»
     *  הוא המדידה ⛔ ואינו הנימוק. */
    appTokens: {
      '--accent-2': 'גוון מוצר של מסך שקיים כאן בלבד — ⛔ ואין לו תפקיד באחיות',
      '--bad-soft-2': 'גוון מוצר של מסך שקיים כאן בלבד — ⛔ ואין לו תפקיד באחיות',
      '--credit': 'גוון מוצר של מסך שקיים כאן בלבד — ⛔ ואין לו תפקיד באחיות',
      '--creditl': 'גוון מוצר של מסך שקיים כאן בלבד — ⛔ ואין לו תפקיד באחיות',
    },
    /*  ⛔ חריץ — ⚠️ **מה נכנס**: אסימון שמוגדר יותר מפעם אחת וכל
     *  הגדרותיו `var(--…)`, ⭐ או שנכתב ב-`setProperty`; ⛔ **ומה
     *  מפיל**: הכרזה שאינה עומדת במבחן. ⚠️ **ולמה סוג שלישי**:
     *  הוא אינו מוצר ואינו תשתית — ⭐ הוא המנגנון שהכלל דורש. */
    slotTokens: {
    },
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורה שהקובץ הזה אוכף — ⚠️ נגזרת משם השורה בטבלה ⛔ ואינה מוקלדת
 *  בגוף השער: ⭐ והמרשם הוא המקום היחיד שנוקב במספר. */
export const ROWS = [116, 90];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = join(ROOT, '..');

let n = 0, bad = 0;
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. */
const FLOOR = { shared: 12, app: 0, appWhy: '' };
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
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
    console.error(`❌ ${GATE_ID}: רצו ${N}, והריצפה ${EXPECTED} — ` +
      'עדכן את `FLOOR`.');
    process.exitCode = 1;
  }
});
const ok = (m) => (RAN++, console.log(`  ok   ${++n} · ${m}`));
const no = (m) => { RAN++; bad++; console.error(`  FAIL ${++n} · ${m}`); };
const is = (c, m) => (c ? ok(m) : no(m));

/* ── עוזרים — ⛔ אותו חילוץ לכל מדידה ───────────────────────────────────── */

/*  ⛔ חמש צורות ההגדרה — ⚠️ **מה נכנס**: מקור מולבן ⟵ קבוצת השמות שברמת
 *  המודול; ⛔ **ומה מפיל**: כאן כלום — זה חילוץ ⛔ ולא הכרעה. ⚠️ **ולמה
 *  המבנה קיים**: שלוש סריקות שבונות כל אחת את רשימת הצורות שלה נבדלות
 *  ביום שבו נוספת צורה שישית. */
const DEF_FORMS = [
  /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
  /\bwindow\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/g,
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?function\b/g,
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
  /\bwindow\.([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
];
function defNames(text) {
  const out = new Set();
  for (const re of DEF_FORMS) { re.lastIndex = 0; let m; while ((m = re.exec(text))) out.add(m[1]); }
  return out;
}
/*  ⛔ התחילית נמדדת אחרי הסרת הקו התחתון הפותח — ⚠️ `_slPullCfg` נקרא
 *  אצל הקורא כ-`sl` בדיוק כמו `slLoadData`: ⭐ והקו אינו מסתיר תחילית. */
const prefixOf = (name) => {
  const m = /^_*([a-z]+)(?=[A-Z])/.exec(name);
  return m ? m[1] : null;
};
/*  ⛔ הקובץ מריץ את עצמו — ⚠️ **מה נכנס**: גוף קובץ ⟵ אמת/שקר; ⛔ **ומה
 *  מפיל**: כלום כאן. ⭐ **ולמה זו ההבחנה** — ⛔ **וייצוא אינו**: כל שער
 *  מייצא `ROWS`, ⚠️ ושורת «שלוש דרכי אכיפה» דורשת זאת במפורש. */
const runsItself = (text) => /^\s*(?:await\s+)?main\s*\(\s*\)/m.test(text)
  || /process\.exit\(/.test(text)
  || /process\.on\(\s*['"]exit['"]/.test(text);
const gateNamed = (file) => /^test_/.test(file) || /^check-/.test(file);

/*  ⛔ שם מודול רב-מילי — ⚠️ שתי מילים ומעלה נפרדות ב-`-` או ב-`_`. */
const multiWord = (base) => /[-_]/.test(base);

/*  ⛔ המקור נקרא דרך העוזר המשותף ⛔ ואינו משורשר כאן — ⚠️ הוא עוטף כל
 *  מודול ב-`<script>`, ⭐ שההלבנה המשותפת מלבינה **מה שאינו בתוכו**:
 *  ⛔ מודול חשוף היה נמחק כולו, ⚠️ והשער היה מדווח אפס שמות על קוד שרץ. */
const srcText = whiten(appSrc(ROOT));

const toolFiles = fs.readdirSync(join(ROOT, 'tools'))
  .filter((f) => /\.mjs$/.test(f))
  .map((f) => ({ file: f, base: f.replace(/\.mjs$/, ''), text: fs.readFileSync(join(ROOT, 'tools', f), 'utf8') }))
  .map((o) => ({ ...o, runs: runsItself(o.text) }));

/*  ⛔ התחיליות החיות של האחיות — ⚠️ נקראות מהצהרת `tablePrefix` שבעץ
 *  של כל אחות, ⛔ ולא מרשימה מוקלדת כאן: ⭐ רשימה מוקלדת מתיישנת ביום
 *  שבו אחות מסבה את תחיליתה, ⚠️ והיא מתארת את מה שהיה.
 *  ⛔ **ואחות שאינה על הדיסק מדווחת בשמה** ⛔ ואינה נספרת כטענה שעברה. */
const sisterPrefix = [], sisterMissing = [], sisterNoDecl = [];
for (const p of PEERS) {
  if (p === APP.app) continue;
  const f = join(SIBS, p, 'tools', 'test_period.mjs');
  if (!fs.existsSync(f)) { sisterMissing.push(p); continue; }
  const m = /tablePrefix\s*:\s*['"]([a-z]+)_['"]/.exec(fs.readFileSync(f, 'utf8'));
  if (m) sisterPrefix.push({ app: p, pfx: m[1] }); else sisterNoDecl.push(p);
}

/* ── המדידות ───────────────────────────────────────────────────────────── */
console.log(`· ${APP.app} — סבב 148: שם נגזר מדפוס מוצהר`);

/* 1. המרשם עצמו — ⛔ ארבעת התחומים, ובשני הכיוונים */
const MEASURED = ['fn', 'gate', 'module', 'cls', 'token'];
const declared = Object.keys(APP.namePolicy.domains || {}).sort();
is(declared.join(',') === MEASURED.slice().sort().join(','),
  `[name-policy] ⛔ ארבעת התחומים מוצהרים ונמדדים — נמדדו ${declared.length} מתוך ${MEASURED.length}` +
  (declared.join(',') === MEASURED.slice().sort().join(',') ? '' : ` (${declared.join(' ')})`));

const noWhy = [];
for (const [k, v] of Object.entries(APP.namePolicy.domains || {}))
  if (!v || !v.pattern || !v.why || v.why.length < 12) noWhy.push('domains.' + k);
for (const [k, v] of Object.entries(APP.namePolicy.fnAllow || {}))
  if (!v || v.length < 12) noWhy.push('fnAllow.' + k);
for (const [k, v] of Object.entries(APP.namePolicy.appTokens || {}))
  if (!v || v.length < 12) noWhy.push('appTokens.' + k);
for (const [k, v] of Object.entries(APP.namePolicy.slotTokens || {}))
  if (!v || v.length < 12) noWhy.push('slotTokens.' + k);
is(noWhy.length === 0,
  `[name-policy-why] ⛔ כל הצהרה נושאת נימוק תפקידי — נמדדו ${noWhy.length} בלי נימוק והצפוי אפס` +
  (noWhy.length ? ` (${noWhy.join(' ')})` : ''));

/* 2. פונקציות — ⛔ תחילית שהיא תחיליתה של אחות */
const names = [...defNames(srcText)].sort();
const live = new Map(sisterPrefix.map((s) => [s.pfx, s.app]));
const hits = [];
for (const nm of names) {
  const p = prefixOf(nm);
  if (p && live.has(p) && !(nm in (APP.namePolicy.fnAllow || {}))) hits.push(`${nm}⟵${live.get(p)}`);
}
is(hits.length === 0,
  `[fn-sister-prefix] ⛔ אפס תחילית של אחות ב-${names.length} שמות — נמדדו ${hits.length} והצפוי אפס` +
  (hits.length ? ` (${hits.slice(0, 6).join(' ')})` : ''));

const allowDead = Object.keys(APP.namePolicy.fnAllow || {}).filter((k) => !names.includes(k));
is(allowDead.length === 0,
  `[fn-allow] ⛔ כל הכרזה ב-\`fnAllow\` נושאת שם חי — נמדדו ${allowDead.length} בלי אתר והצפוי אפס` +
  (allowDead.length ? ` (${allowDead.join(' ')})` : ''));

/*  ⛔ אחות שעל הדיסק ואין לה הצהרה — ⚠️ היא הכשל: ⭐ אחות שאינה על
 *  הדיסק מדווחת בשמה ⛔ ואינה נספרת כטענה שעברה, ⚠️ וזה בדיוק מצב
 *  העותק הזמני שהשער הזה נמדד בו בשער אחר. */
is(sisterNoDecl.length === 0,
  `[fn-sisters] ⛔ כל אחות שעל הדיסק מצהירה תחילית — ${sisterPrefix.length} נמדדו, ` +
  `נמדדו ${sisterNoDecl.length} בלי הצהרה והצפוי אפס` +
  (sisterNoDecl.length ? ` (${sisterNoDecl.join(' ')})` : '') +
  (sisterMissing.length ? ` · ⚠️ ואינן על הדיסק: ${sisterMissing.join(' ')}` : ''));

/* 3. שערים ומודולים — ⛔ ההבחנה היא ריצה, ⚠️ ובשני הכיוונים */
const runsNotNamed = toolFiles.filter((t) => t.runs && !gateNamed(t.file)).map((t) => t.file);
is(runsNotNamed.length === 0,
  `[gate-name] ⛔ כל קובץ שמריץ את עצמו נושא \`test_\` או \`check-\` — ${toolFiles.filter((t) => t.runs).length} מריצים, ` +
  `נמדדו ${runsNotNamed.length} חורגים והצפוי אפס` + (runsNotNamed.length ? ` (${runsNotNamed.join(' ')})` : ''));

const namedNotRuns = toolFiles.filter((t) => !t.runs && gateNamed(t.file)).map((t) => t.file);
is(namedNotRuns.length === 0,
  `[module-name] ⛔ קובץ שאינו מריץ את עצמו אינו שער — ${toolFiles.filter((t) => !t.runs).length} מודולים, ` +
  `נמדדו ${namedNotRuns.length} שנושאים שם של שער והצפוי אפס` + (namedNotRuns.length ? ` (${namedNotRuns.join(' ')})` : ''));

const badSep = toolFiles.filter((t) => !t.runs && multiWord(t.base) && t.base.includes('_')).map((t) => t.file);
is(badSep.length === 0,
  `[module-sep] ⛔ שם מודול רב-מילי נושא \`-\` ⛔ ולא \`_\` — נמדדו ${badSep.length} חורגים והצפוי אפס` +
  (badSep.length ? ` (${badSep.join(' ')})` : ''));

/* 4. מחלקות CSS — ⛔ kebab-case */
const classes = new Set();
/*  ⛔ אסימון שאינו שם — ⚠️ שבר של שרשור JS בתוך `class="…"`: ⭐ הוא
 *  אינו מחלקה, ⛔ ואינו נמדד — ⚠️ ומה שנותר הוא שם מלא בלבד. */
/*  ⛔ המחלקות נסרקות מהמקור **המולבן** — ⚠️ וההלבנה מוחקת בדיוק את
 *  מה שאינו מחלקה: ⭐ `class="st ' + (fill + EPS …` חי בתוך מחרוזת JS,
 *  ⛔ ונתן את `EPS` כשם מחלקה. ⚠️ **ומה שנשאר הוא הסימון שבמסמך**. */
for (const m of srcText.matchAll(/class="([^"]*)"/g))
  for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
const badCls = [...classes].filter((c) => /[A-Z_]/.test(c));
is(badCls.length === 0,
  `[class-case] ⛔ אפס מחלקה עם אות גדולה או קו תחתון — ${classes.size} מחלקות, ` +
  `נמדדו ${badCls.length} חורגות והצפוי אפס` + (badCls.length ? ` (${badCls.slice(0, 6).join(' ')})` : ''));

/* 5. אסימוני עיצוב — ⛔ דפוס אחד למספר, ⚠️ ואסימון שחי כאן בלבד מוצהר */
/*  ⛔ ההגדרות נקראות מהמקור הגולמי — ⚠️ הן חיות ב-`<style>`, ⭐ שההלבנה
 *  המשותפת מלבינה **מה שאינו בתוך `<script>`**: ⛔ ומקור מולבן היה
 *  מחזיר אפס אסימונים תמיד. */
const tokDefs = (text) => {
  const m = new Map();
  for (const x of text.matchAll(/(--[a-zA-Z][\w-]*)\s*:\s*([^;}]*)/g))
    (m.get(x[1]) || m.set(x[1], []).get(x[1])).push(x[2].trim());
  return m;
};
const RAW_SRC = fs.readFileSync(join(ROOT, 'index.html'), 'utf8');
const myTok = tokDefs(RAW_SRC);
/*  ⛔ `--ls-n1`/`--ls-n2` אינם חריגה — ⚠️ התקן נוקב בהם במפורש ככיוון
 *  שלילי, ⭐ והמספר שם הוא סימן ⛔ ולא מדרגה. */
const NEG = /^--ls-n\d+$/;
const catNum = [...myTok.keys()].filter((k) => /[a-zA-Z]\d+$/.test(k) && !NEG.test(k));
is(catNum.length === 0,
  `[token-pattern] ⛔ מספר באסימון נושא מקף לפניו — ${myTok.size} אסימונים, ` +
  `נמדדו ${catNum.length} משורשרים והצפוי אפס` + (catNum.length ? ` (${catNum.join(' ')})` : ''));

/*  ⛔ אסימון שחי כאן בלבד נמדד מול האחיות שעל הדיסק — ⚠️ ואחות שאינה
 *  שם מדווחת בשמה: ⭐ שער שמדלג בשתיקה היה מכריז «חי כאן בלבד» על
 *  אסימון שחי בכולן. */
const sisTok = new Set();
const tokMissing = [];
for (const p of PEERS) {
  if (p === APP.app) continue;
  const f = join(SIBS, p, 'index.html');
  if (!fs.existsSync(f)) { tokMissing.push(p); continue; }
  for (const k of tokDefs(fs.readFileSync(f, 'utf8')).keys()) sisTok.add(k);
}
const declTok = { ...(APP.namePolicy.appTokens || {}), ...(APP.namePolicy.slotTokens || {}) };
const onlyHere = tokMissing.length ? [] : [...myTok.keys()].filter((k) => !sisTok.has(k));
const undeclared = onlyHere.filter((k) => !(k in declTok));
const overDeclared = tokMissing.length ? [] : Object.keys(declTok).filter((k) => sisTok.has(k) || !myTok.has(k));
is(undeclared.length === 0 && overDeclared.length === 0,
  `[token-app] ⛔ אסימון שחי כאן בלבד מוצהר — ${onlyHere.length} נמדדו, ` +
  `${undeclared.length} בלי הצהרה · ${overDeclared.length} הצהרה בלי אתר, והצפוי אפס` +
  (undeclared.length ? ` (${undeclared.slice(0, 6).join(' ')})` : '') +
  (overDeclared.length ? ` (${overDeclared.slice(0, 6).join(' ')})` : '') +
  (tokMissing.length ? ` · ⚠️ אחיות שאינן על הדיסק: ${tokMissing.join(' ')}` : ''));

/*  ⛔ המבחן של החריץ מכני — ⚠️ מוגדר יותר מפעם אחת וכל הגדרותיו
 *  `var(--…)`, ⭐ או שהוא נכתב ב-`setProperty`: ⛔ והכרזה שאינה עומדת
 *  בו היא אסימון מוצר שהוסתר. */
const slotBad = Object.keys(APP.namePolicy.slotTokens || {}).filter((k) => {
  const v = myTok.get(k) || [];
  const setProp = new RegExp("setProperty\\(\\s*['\"]" + k + "['\"]").test(RAW_SRC);
  return !(setProp || (v.length > 1 && v.every((x) => /^var\(--/.test(x))));
});
is(slotBad.length === 0,
  `[token-slot] ⛔ כל חריץ מוצהר עומד במבחן — ${Object.keys(APP.namePolicy.slotTokens || {}).length} מוצהרים, ` +
  `נמדדו ${slotBad.length} חורגים והצפוי אפס` + (slotBad.length ? ` (${slotBad.join(' ')})` : ''));

if (RUN_MUT) {
  mutStage();
/* ── מוטציות ───────────────────────────────────────────────────────────── */
console.log('  — מוטציות —');

/*  ⛔ המוטציות רצות על קלט מסונתז בזיכרון — ⚠️ ולא על העץ: ⭐ שער אינו
 *  משנה קבצים, ⛔ והמנגנון הנמדד הוא אותו עוזר בדיוק. */

/*  ⛔ מוטציה: פונקציה בתחילית של אחות — `[fn-sister-prefix]` נופלת.
 *  ⚠️ **והתחילית נלקחת מהאחות החיה** ⛔ ואינה מוקלדת: ⭐ `sl` הוא
 *  תחיליתה של שכר לימוד, ⛔ ובשכר לימוד עצמה הוא התחילית שלה —
 *  ⚠️ ומוטציה שמקלידה אותו אינה מוטציה שם. */
const mPfx = (sisterPrefix[0] || {}).pfx || '';
const mSis = mPfx ? [...defNames('function ' + mPfx + 'Foo(){}')].filter((x) => {
  const p = prefixOf(x); return p && live.has(p);
}) : [];
is(mSis.length === 1,
  `מ1 · ⛔ מוטציה: \`function ${mPfx}Foo(\` נמדד כתחילית של אחות — \`[fn-sister-prefix]\` הייתה נכשלת`);

/* מ2. קובץ שמריץ את עצמו ואינו נושא שם של שער — `[gate-name]` נופלת */
is(runsItself('process.exit(0);') && !gateNamed('verify_x.mjs'),
  'מ2 · ⛔ מוטציה: `verify_x.mjs` שמריץ את עצמו — `[gate-name]` הייתה נכשלת');

/* מ3. קובץ שאינו מריץ את עצמו בשם של שער — `[module-name]` נופלת */
is(!runsItself('export const X = 1;') && gateNamed('test_x.mjs'),
  'מ3 · ⛔ מוטציה: `test_x.mjs` שאינו מריץ את עצמו — `[module-name]` הייתה נכשלת');

/* מ4. הצהרה בלי נימוק — `[name-policy-why]` נופלת */
const mWhy = Object.entries({ fn: { pattern: 'x', why: '' } })
  .filter(([, v]) => !v.why || v.why.length < 12);
is(mWhy.length === 1,
  'מ4 · ⛔ מוטציה: הצהרה בלי נימוק תפקידי — `[name-policy-why]` הייתה נכשלת');

/* מ5. מודול רב-מילי עם `_` — `[module-sep]` נופלת */
is(multiWord('foo_bar') && 'foo_bar'.includes('_'),
  'מ5 · ⛔ מוטציה: מודול בשם `foo_bar.mjs` — `[module-sep]` הייתה נכשלת');

/* מ6. אסימון במספר משורשר — `[token-pattern]` נופלת */
const m6 = [...tokDefs('a{--navy4' + ':#000;}').keys()].filter((k) => /[a-zA-Z]\d+$/.test(k) && !NEG.test(k));
is(m6.length === 1,
  'מ6 · ⛔ מוטציה: `--navy4` נמדד כמספר משורשר — `[token-pattern]` הייתה נכשלת');

/* מ7. אסימון שחי כאן בלבד ואינו מוצהר — `[token-app]` נופלת */
is(!('--zz-only' in declTok) && !sisTok.has('--zz-only'),
  'מ7 · ⛔ מוטציה: `--zz-only` שאינו מוצהר — `[token-app]` הייתה נכשלת');

/* מ8. חריץ שהוצהר ואינו עומד במבחן — `[token-slot]` נופלת */
const m8 = [['#fff']].filter((v) => !(v.length > 1 && v.every((x) => /^var\(--/.test(x))));
is(m8.length === 1,
  'מ8 · ⛔ מוטציה: הכרזת חריץ על אסימון שהגדרתו ליטרל — `[token-slot]` הייתה נכשלת');

/*  ⭐ מוטציות-נגד — ⛔ שינוי חי שאסור לו להפיל. */
const nLs = [...defNames('function lsSweep(){}')].filter((x) => {
  const p = prefixOf(x); return p && live.has(p);
});
is(nLs.length === 0,
  'נ1 · ⭐ מוטציית-נגד: `lsSweep` — תחילית שכבה משותפת ⛔ אינה מפילה');

is(!/[A-Z_]/.test('card') && !/[A-Z_]/.test('tab-btn'),
  'נ2 · ⭐ מוטציית-נגד: `.card` ו-`.tab-btn` ⛔ אינן מפילות');

is(!runsItself('export const PEERS = [];') && !gateNamed('peers.mjs') && !multiWord('peers'),
  'נ3 · ⭐ מוטציית-נגד: `peers.mjs` המוצהר ⛔ אינו מפיל');

is(runsItself('export const ROWS = [1];\nprocess.exit(0);') && gateNamed('test_x.mjs'),
  'נ4 · ⭐ מוטציית-נגד: שער שמייצא `ROWS` ⛔ אינו מפיל — וזה מה שכל השערים עושים');

is([...tokDefs('a{--sp-5' + ':8px;--ls-n1' + ':-.01em;}').keys()]
     .filter((k) => /[a-zA-Z]\d+$/.test(k) && !NEG.test(k)).length === 0,
  'נ5 · ⭐ מוטציית-נגד: `--sp-5` ו-`--ls-n1` ⛔ אינם מפילים — המקף והכיוון השלילי תקינים');

}

console.log(bad ? `\n❌ ${APP.app}: ${n} טענות, ${bad} נכשלו`
                : `\n✓ סבב 148 (שם נגזר מדפוס מוצהר) — ${n} טענות עברו, 0 נכשלו`);
process.exit(bad ? 1 : 0);
