/* ───────────────────────────────────────────────────────────────────────────
   test_docfacts.mjs — ערך בקובץ תיאור נמדד מול מקורו, והקובץ מתאר את האפליקציה שלו
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** ⛔ כל ערך מדיד בארבעת קובצי התיאור נושא מקור אמת מוצהר
   ב-`APP.docFacts`, ⚠️ ונמדד מולו — `build.gradle` או העץ · ⛔ **ותאריך
   נכתב בפורמט אחד**, `YYYY-MM-DD` · ⛔ **ושם קובץ בגרשיים אחוריים קיים
   בעץ**, ⚠️ ואין לו חריגה: ⭐ שם שירד — יורד מהתיעוד איתו · ⛔ **ואזכור סבב שקדם ללידת האפליקציה מפיל**, ⚠️ והלידה נגזרת
   מהקומיט השורשי.

   **הנימוק המדוד:** ⛔ 58 ערכים מדידים נסרקו בארבעת הקבצים, ⚠️ ו-13 סטו —
   ⭐ תשעה ערך שגוי וארבעה פורמט שגוי: ⛔ ואחד מהם, `110.08.2026`, אינו
   תאריך כלל. ⚠️ ופסקה שהועתקה מאחות סיפרה על החלפת מפתח שלא קרתה כאן,
   ⭐ והיא משכנעת יותר מערך שגוי — ⛔ שאין מול מה למדוד אותה.

   **מה יישבר בלעדיו:** ⛔ ערך שנכתב ביד נפגם בשקט ומתפשט לאחיות — ⚠️ ומי
   שקורא אותו מיישר לפיו את הקוד · ⛔ ושם קובץ שירד נשאר בתיעוד, ⭐ ומי
   שמחפש אותו מוצא עולם שהשתנה.

   **מה אינו נאכף כאן:** ⛔ **ערכי המפתח עצמם** — ⚠️ טביעה · מועד יצירה ·
   תוקף: ⭐ מקורם `keytool`, ⛔ והוא דורש את סיסמת המאגר — ⚠️ שחיה
   ב-GitHub Secrets ⛔ ואינה בעץ: ⭐ **והשורות שנושאות אותם נמדדות כאן
   בפורמט ובסבב ככל שורה אחרת** · ⛔ **ופרוזה חופשית** — ⚠️ המדידה על שם
   בגרשיים אחוריים בלבד, ⭐ שפסקה אינה ניתנת
   למדידה · ⛔ **ותוכן הבלוק המשותף**, ⚠️ שזהותו נמדדת ב-`sha256` ⛔ והוא
   זהה בכל הריפו · ⛔ **וסבב הלידה בקלון רדוד** — ⚠️ אין בו קומיט שורשי,
   ⭐ והמדידה מדווחת «לא נמדד» ⛔ ואינה מפילה.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEERS } from './peers.mjs';
import { FACTS } from './app-facts.mjs';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  /*  ⛔ הערכים המדידים — ⚠️ **מה נכנס**: מזהה הערך ⟵ הקובץ שבו הוא נכתב,
   *  הביטוי שמאתרו שם, והגזירה שקוראת את מקור האמת; ⛔ **ומה מפיל**: רשומה
   *  שאין לה אתר בקובץ, גזירה שאינה מוכרזת, וערך שאינו שווה למקורו.
   *  ⭐ **ולמה המבנה קיים**: ערך שנכתב ביד אינו נבדל מערך שנגזר, ⛔ ואיש
   *  אינו יודע מול מה למדוד אותו. */
  docFacts: {
    versionCode: { file: 'android/README.md', from: 'gradle-version',
      doc: '\\|\\s*\\*\\*versionCode\\*\\*\\s*\\|\\s*(\\d+)' },
    packageId:   { file: 'android/README.md', from: 'gradle-appid',
      doc: '\\|\\s*\\*\\*Package ID\\*\\*\\s*\\|\\s*`([\\w.]+)`' },
    sdk:         { file: 'android/README.md', from: 'gradle-sdk',
      doc: '\\|\\s*\\*\\*minSdk / targetSdk\\*\\*\\s*\\|\\s*(\\d+ / \\d+)' },
    master:      { file: 'android/README.md', from: 'tree-master',
      doc: '\\*\\*המאסטר הוא `(design/[\\w.-]+)`\\*\\*' },
  },
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */
/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף — ⚠️ המיפוי נגזר מכאן ⛔ ואינו
 *  רשימה שנייה בבודק. */
export const ROWS = [137, 205];

/*  ⛔ המוטציות אינן ברירת המחדל — ⚠️ כל מוטציה היא שינוי ⟵ הרצה ⟵ שחזור,
 *  ⭐ והן רצות ברמה המלאה (`--full`), בסוף הסבב ולפני מיזוג. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בכל הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה.
 *  ⚠️ **וכאן אין ריצפה פרטית** — ⛔ ארבעת קובצי התיאור קיימים בכולן,
 *  ⭐ והמרשם מונה את אותן ארבע עובדות: ⚠️ מה שנבדל הוא הערך ⛔ ולא מספר
 *  הטענות. */
const FLOOR = { shared: 5, app: 0, appWhy: '' };
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
const SUBRUN = !!process.env.GATE_SUBRUN || !!process.env.GATE_INNER;
/*  ⛔ הריצפה נמדדת בשני הכיוונים — ⚠️ פחות מהמוצהר הוא ריצה חלקית,
 *  ⛔ ויותר ממנו הוא ריצפה מיושנת. */
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
const t = (n, cond, m) => { RAN++; if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

/*  ⛔ ארבעת קובצי התיאור — ⚠️ **מה נכנס**: הקבצים שהתקן נותן להם תקרה
 *  ושלד; ⛔ **ומה מפיל**: אין כאן מה שיפיל, ⭐ שקובץ שאינו קיים מדולג.
 *  ⚠️ **ולמה המבנה קיים**: ארבעתם נסרקים באותם כללים, ⛔ ורשימה שנייה
 *  בכל בדיקה הייתה ארבע הזדמנויות להיבדל. */
const DOCS = ['CLAUDE.md', 'README.md', 'CONTEXT.md', 'android/README.md'];

const rd = (f) => readFileSync(join(ROOT, f), 'utf8');
const has = (f) => existsSync(join(ROOT, f));

/*  ⛔ הבלוק המשותף אינו נסרק כאן — ⚠️ זהותו נמדדת ב-`sha256`, ⭐ והוא זהה
 *  בית-לבית בכל הריפו: ⛔ שם שחי בו אינו תיאור של האפליקציה הזו ⛔ אלא
 *  תשתית, ⚠️ ומדידה שלו כאן הייתה דורשת חמישה תכנים נבדלים לבלוק אחד.
 *  ⛔ **והשורות מוחלפות בריקות ⛔ ואינן נמחקות** — ⚠️ מספר שורה שנגזר
 *  מהתוצאה מצביע על אותה שורה במקור. */
export function outsideShared(txt) {
  const ls = txt.split('\n');
  const out = [];
  let ins = false;
  for (const l of ls) {
    if (/^<!--\s*SHARED:start\b/.test(l)) { ins = true; out.push(''); continue; }
    if (/^<!--\s*SHARED:end\b/.test(l)) { ins = false; out.push(''); continue; }
    out.push(ins ? '' : l);
  }
  return out;
}

/*  ⛔ שם קובץ בגרשיים אחוריים ⛔ ולא פרוזה — ⚠️ המדידה צרה בכוונה:
 *  ⭐ שם שנכתב בלי גרשיים אינו נבדל ממילה, ⛔ ודרישה ממנו הייתה רעש.
 *  ⛔ **ונתיב מוחלט ונתיב שמתחיל בשם אחות אינם נתיב בעץ** — ⚠️ הראשון
 *  אינו בריפו כלל, ⭐ והשני הוא הקובץ שבריפו הבעלים. */
const NAME_EXT = /\.(?:md|html|js|mjs|sh|json|sql|png|svg|xml|gradle|keystore|apk|yml|yaml|properties|java|txt|webmanifest)$/;
export function docNames(lines, peers) {
  const out = [];
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/`([^`\s]+)`/g)) {
      const tok = m[1];
      if (!NAME_EXT.test(tok)) continue;
      if (tok.charAt(0) === '/') continue;
      if (peers.some((p) => tok.indexOf(p + '/') === 0)) continue;
      out.push({ tok, line: i + 1, hasRound: /סבב\s*\d+/.test(l) });
    }
  });
  return out;
}

/*  ⛔ הקובץ קיים כשהוא במעקב, ⛔ או כשדפוס ב-`.gitignore` תופס אותו —
 *  ⚠️ המפתח חי בסודות ואינו נדחף, ⭐ ושמו בכל זאת נכתב בתיעוד:
 *  ⛔ דרישת מעקב לבדה הייתה מפילה אותו. */
export function nameGaps(names, tracked, ignored) {
  const base = new Set([...tracked].map((f) => f.split('/').pop()));
  const out = [];
  for (const n of names) {
    if (tracked.has(n.tok) || base.has(n.tok.split('/').pop())) continue;
    if (ignored.some((re) => re.test(n.tok))) continue;
    out.push(n.tok + ' (' + n.line + ')');
  }
  return out;
}
/*  ⛔ פרוזה שנוקבת בנתיב אינה סותרת את מצבו — ⚠️ **מה נכנס**: שם שאינו
 *  במעקב `git` וחסום ב-`.gitignore`; ⛔ **ומה מפיל**: משפט שנוקב בו בלי
 *  הצהרת ההיעדר. ⭐ **ולמה**: ⛔ הקורא מאמין לפרוזה — ⚠️ היא מסבירה,
 *  ⭐ **והשורה רק קובעת**: ⛔ ופסקה שנוקבת בנתיב בריפו בלי לומר שאינו שם
 *  שולחת אותו לחפש קובץ שלא יימצא, ⚠️ ולהסיק שהריפו שבור.
 *  ⛔ **וההצהרה נמדדת בשלוש השורות שסביב השם** ⛔ ולא בשורה שלו בלבד —
 *  ⚠️ פרוזה נגללת, ⭐ והמשפט אינו נגמר בסוף השורה. */
const ABSENT_RE = /אינו בריפו|אינם בריפו|אינו בעץ|אינם בעץ|אינו במעקב/;
export function absentGaps(names, tracked, ignored, lines) {
  const base = new Set([...tracked].map((f) => f.split('/').pop()));
  const out = [];
  for (const nm of names) {
    if (tracked.has(nm.tok) || base.has(nm.tok.split('/').pop())) continue;
    /*  ⛔ מה שאינו חסום ב-`.gitignore` נמדד בטענה שמעל — ⚠️ שם שאין לו
     *  קובץ כלל: ⭐ ושתי מדידות על אותו שם הן שתי הכרעות על אותה ראיה. */
    if (!ignored.some((re) => re.test(nm.tok))) continue;
    const near = [lines[nm.line - 2] || '', lines[nm.line - 1] || '', lines[nm.line] || ''].join(' ');
    if (!ABSENT_RE.test(near)) out.push(nm.tok + ' (' + nm.line + ')');
  }
  return out;
}

/*  ⛔ ארבע גזירות מוצהרות ⛔ ואין חמישית — ⚠️ **מה נכנס**: שם הגזירה ⟵
 *  הפונקציה שקוראת את מקור האמת; ⛔ **ומה מפיל**: רשומה שנוקבת בגזירה
 *  שאינה כאן. ⭐ **ולמה המבנה קיים**: «מקור» שהוא טקסט חופשי אינו ניתן
 *  להרצה, ⚠️ והוא הופך את המרשם להצהרה. */
const FROM = {
  'gradle-version': (g) => (/versionCode\s+(\d+)/.exec(g) || [, ''])[1],
  'gradle-appid':   (g) => (/applicationId\s+"([^"]+)"/.exec(g) || [, ''])[1],
  'gradle-sdk':     (g) => ((/minSdk[A-Za-z]*\s+(\d+)/.exec(g) || [, ''])[1] + ' / ' +
                            (/targetSdk[A-Za-z]*\s+(\d+)/.exec(g) || [, ''])[1]),
  'tree-master':    (g, tree) => tree.slice().sort()[0] || '',
};

/*  ⛔ הערך שבתיעוד מושווה לערך שבמקור ⛔ ולא לערך שני בתיעוד — ⚠️ שני
 *  ליטרלים לאותו ערך הם שני מקומות לתקן, ⭐ ואחד מהם נשאר. */
export function factGaps(facts, texts, gradle, tree) {
  const out = [];
  for (const [id, f] of Object.entries(facts || {})) {
    const fn = FROM[f.from];
    if (!fn) { out.push('[גזירה לא מוכרזת] ' + id + ' ⟵ ' + f.from); continue; }
    const txt = texts[f.file];
    if (txt === undefined) { out.push('[קובץ חסר] ' + id + ' ⟵ ' + f.file); continue; }
    const m = new RegExp(f.doc).exec(txt);
    if (!m) { out.push('[בלי אתר] ' + id); continue; }
    const want = fn(gradle, tree);
    if (String(m[1]).trim() !== String(want).trim())
      out.push('[סטה] ' + id + ': «' + m[1] + '» במקום «' + want + '»');
  }
  return out;
}

/*  ⛔ תאריך בפורמט אחד ⛔ ואין שני — ⚠️ הסריקה על **כל** צורת תאריך
 *  שהיא, ⭐ ומה שאינו `YYYY-MM-DD` מפיל: ⛔ **ואין כאן שורה פטורה** —
 *  ⚠️ שורת ערך מפתח נכתבת בפורמט אחד ככל שורה אחרת, ⭐ והפטור שהיה
 *  כאן לא החריג דבר. */
const DATE_ANY = /(?<![\w./])(\d{1,4}[./-]\d{1,2}[./-]\d{2,4})(?![\w./-])/g;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
/*  ⛔ טקסט בגרשיים אחוריים מולבן לפני המדידה — ⚠️ הוא ליטרל שצוטט מהקוד
 *  או מהנתון, ⭐ ואינו תאריך שהמסמך אומר: ⛔ דרישת פורמט ממנו הייתה
 *  משנה את הנתון עצמו. */
const noTicks = (l) => l.replace(/`[^`]*`/g, (m) => ' '.repeat(m.length));
export function dateGaps(lines) {
  const out = [];
  lines.forEach((l, i) => {
    for (const m of noTicks(l).matchAll(DATE_ANY))
      if (!DATE_ISO.test(m[1])) out.push('שורה ' + (i + 1) + ': «' + m[1] + '»');
  });
  return out;
}

/*  ⛔ אזכור סבב שקדם ללידת האפליקציה — ⚠️ הלידה נגזרת מהקומיט הראשון
 *  ⛔ ואינה מוקלדת: ⭐ וקלון רדוד אינו נושא אותו — ⛔ ואז המדידה מדווחת
 *  «לא נמדד» ⛔ ואינה מפילה, ⚠️ בדיוק כמו שער שהמסד אינו בהישג ידו. */
export function roundGaps(lines, born) {
  const out = [];
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/סבב\s*(\d+)/g))
      if (Number(m[1]) < born) out.push('שורה ' + (i + 1) + ': סבב ' + m[1]);
  });
  return out;
}

console.log(`· ${FACTS.slug} — ערך בקובץ תיאור נמדד מול מקורו`);
let n = 1;

const TEXTS = {};
for (const d of DOCS) if (has(d)) TEXTS[d] = rd(d);
const LINES = {};
for (const d of Object.keys(TEXTS)) LINES[d] = outsideShared(TEXTS[d]);
const ALL = Object.values(LINES).flat();

/*  ⛔ המעקב נקרא מ-`git` ⛔ ולא מהדיסק — ⚠️ קובץ שיושב בעץ ואינו במעקב
 *  אינו בריפו, ⭐ ומי שמשכפל את הריפו לא יקבל אותו. */
let TRACKED = new Set();
let GIT_OK = true;
try {
  TRACKED = new Set(execFileSync('git', ['-C', ROOT, 'ls-files'], { encoding: 'utf8' })
    .trim().split('\n').filter(Boolean));
} catch (e) { GIT_OK = false; }
/*  ⛔ דפוסי ה-`.gitignore` הופכים לביטויים ⛔ ואינם מושווים כטקסט —
 *  ⚠️ `signing/*.keystore` הוא דפוס, ⭐ ולא שם. */
const IGNORED = (has('.gitignore') ? rd('.gitignore').split('\n') : [])
  .map((l) => l.trim()).filter((l) => l && l.charAt(0) !== '#')
  .map((l) => new RegExp('^' + l.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'));

const NAMES = docNames(ALL, PEERS.filter((p) => p !== FACTS.slug));
const GRADLE = has('android/app/build.gradle') ? rd('android/app/build.gradle') : '';
const TREE = has('design') ? readdirSync(join(ROOT, 'design')).map((f) => 'design/' + f) : [];

/* ── א · שם קובץ בתיעוד — קיים ─────────────────────────────────────────── */
{
  /*  ⛔ בלי סט מעקב אין מול מה למדוד — ⚠️ הדילוג מדווח **מה אינו נמדד
   *  בגללו**, ⭐ ונספר ככל תוצאה: ⛔ מונה שמדלג עליו מדווח חוסר שאינו קיים. */
  const g = GIT_OK ? nameGaps(NAMES, TRACKED, IGNORED) : [];
  t(n++, g.length === 0,
    GIT_OK
      ? `[doc-name] שם קובץ שאין לו קובץ — נמדדו ${g.length} מתוך ${NAMES.length} ` +
        `שמות והצפוי אפס${g.length ? ' (' + g.slice(0, 6).join(' · ') + ')' : ''}. ` +
        'מתקנים את השם, או מסירים אותו מהתיעוד — ⛔ ואין חריגה'
      : `[doc-name] לא נמדד — אין סט מעקב ב-\`git\`: ⛔ ואף אחד מ-${NAMES.length} ` +
        'השמות שבתיעוד אינו מוצלב לקובץ. מריצים בתוך עותק עבודה של git');
}
{
  const g = GIT_OK ? absentGaps(NAMES, TRACKED, IGNORED, ALL) : [];
  t(n++, g.length === 0,
    GIT_OK
      ? `[doc-absent] פרוזה שנוקבת בנתיב שאינו בריפו בלי לומר זאת — נמדדו ${g.length} מתוך ` +
        `${NAMES.length} שמות והצפוי אפס${g.length ? ' (' + g.slice(0, 6).join(' · ') + ')' : ''}. ` +
        'מוסיפים למשפט את הצהרת ההיעדר — ⛔ הפרוזה אינה סותרת את מצב הקובץ'
      : `[doc-absent] לא נמדד — אין סט מעקב ב-\`git\`: ⛔ ואף אחד מ-${NAMES.length} ` +
        'השמות שבתיעוד אינו מוצלב למעקב. מריצים בתוך עותק עבודה של git');
}

/* ── ב · ערך מדיד מול מקורו ────────────────────────────────────────────── */
{
  const g = factGaps(APP.docFacts, TEXTS, GRADLE, TREE);
  const cnt = Object.keys(APP.docFacts || {}).length;
  t(n++, cnt > 0 && g.length === 0,
    `[doc-fact] ערך בתיעוד מול מקורו — נמדדו ${cnt} ערכים במרשם ו-${g.length} סטיות, ` +
    `והצפוי לפחות אחד ואפס סטיות${g.length ? ' (' + g.join(' · ') + ')' : ''}. ` +
    'מיישרים את התיעוד למקור, ⛔ ולא את המקור לתיעוד');
}

/* ── ג · פורמט אחד לתאריך ──────────────────────────────────────────────── */
{
  const g = dateGaps(ALL);
  t(n++, g.length === 0,
    `[doc-date] תאריך שאינו \`YYYY-MM-DD\` — נמדדו ${g.length} והצפוי אפס` +
    `${g.length ? ' (' + g.slice(0, 6).join(' · ') + ')' : ''}. ` +
    'כותבים את התאריך בפורמט אחד — ⛔ ואין שורה פטורה');
}

/* ── ד · אזכור סבב שקדם ללידה ──────────────────────────────────────────── */
{
  /*  ⛔ הלידה נגזרת מהקומיט השורשי — ⚠️ וקלון רדוד אינו נושא אותו:
   *  ⭐ המדידה מדווחת «לא נמדד» ⛔ ואינה מפילה, ⚠️ בדיוק כמו שער שהמסד
   *  אינו בהישג ידו. */
  let born = 0, why = '';
  try {
    const shallow = existsSync(join(ROOT, '.git', 'shallow'));
    if (shallow) why = 'הקלון רדוד';
    else {
      const root = execFileSync('git', ['-C', ROOT, 'rev-list', '--max-parents=0', 'HEAD'],
        { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
      if (root.length !== 1) why = 'אין קומיט שורשי יחיד';
      else {
        const sub = execFileSync('git', ['-C', ROOT, 'log', '--format=%s'], { encoding: 'utf8' });
        const nums = [...sub.matchAll(/סבב\s*(\d+)/g)].map((m) => Number(m[1]));
        if (!nums.length) why = 'אין מספר סבב בהודעות הקומיט';
        else born = Math.min(...nums);
      }
    }
  } catch (e) { why = e.message; }
  const g = born ? roundGaps(ALL, born) : [];
  t(n++, g.length === 0,
    born
      ? `[doc-round] אזכור סבב שקדם ללידה (סבב ${born}) — נמדדו ${g.length} והצפוי אפס` +
        `${g.length ? ' (' + g.slice(0, 6).join(' · ') + ')' : ''}. ` +
        'מסירים את הפסקה — היא מתארת מה שלא קרה כאן'
      : `[doc-round] לא נמדד — ${why}: ⛔ אין ממה לגזור את סבב הלידה. ` +
        'מריצים על קלון מלא'
  );
}

/* ── מוטציות ───────────────────────────────────────────────────────────── */
mutStage();
if (RUN_MUT) {
  /*  ⛔ המוטציות בזיכרון — ⚠️ כל אחת מוסרת קלט אחר לאותה פונקציה,
   *  ⭐ ואינה כותבת לעץ ⛔ ואינה פותחת תהליך. */
  {
    const got = dateGaps(['התאריך 10.08.2026 נמדד בסבב 41']);
    t(n++, got.length === 1,
      'מ1 · ⛔ מוטציה: תאריך `DD.MM.YYYY` מפיל את «[doc-date]» — ' +
      `נמדדו ${got.length} והצפוי 1`);
  }
  {
    const got = nameGaps([{ tok: 'zz-no-such-file.sql', line: 1, hasRound: false }],
                         TRACKED, IGNORED);
    t(n++, got.length === 1,
      'מ2 · ⛔ מוטציה: שם קובץ שאינו קיים מפיל את «[doc-name]» — ' +
      `נמדדו ${got.length} והצפוי 1`);
  }
  {
    const id = Object.keys(APP.docFacts)[0];
    const hurt = {};
    hurt[id] = APP.docFacts[id];
    const txts = Object.assign({}, TEXTS);
    const f = APP.docFacts[id];
    const m = new RegExp(f.doc).exec(txts[f.file]);
    txts[f.file] = txts[f.file].replace(m[0], m[0].replace(m[1], m[1] + '9'));
    const got = factGaps(hurt, txts, GRADLE, TREE);
    t(n++, got.length === 1 && got[0].indexOf('[סטה]') === 0,
      'מ3 · ⛔ מוטציה: ערך שסטה ממקורו מפיל את «[doc-fact]» — ' +
      `נמדדו ${got.length} והצפוי 1 («${(got[0] || '').slice(0, 40)}»)`);
  }
  {
    const got = roundGaps(['⭐ ובסבב 39 הוחלף גם ה-keystore'], 145);
    t(n++, got.length === 1,
      'מ4 · ⛔ מוטציה: אזכור סבב שקדם ללידה מפיל את «[doc-round]» — ' +
      `נמדדו ${got.length} והצפוי 1`);
  }
  /*  ⛔ ושורת ערך מפתח נמדדת ככל שורה — ⚠️ הפורמט שלה אחד, ⭐ וגם היא
   *  נופלת על תאריך שאינו `YYYY-MM-DD`: ⛔ ושורה שאינה נמדדת היא
   *  הצהרה ⛔ ולא בדיקה. */
  {
    const got = dateGaps(['| **תוקף** | 10,000 יום — 15/09/2026 עד 2054-01-31 |']);
    t(n++, got.length === 1,
      'מ6 · ⛔ מוטציה: תאריך שאינו ISO **בשורת ערך מפתח** מפיל את «[doc-date]» — ' +
      `נמדדו ${got.length} והצפוי 1`);
  }

  /*  ⛔ מוטציית-נגד היא שינוי חי שאסור לו להפיל — ⚠️ הנמדד הוא הערך
   *  והפורמט, ⭐ ולא עצם הוספת טקסט. */
  {
    const got = dateGaps(['נמדד ב-2026-09-15 והתוצאה נשמרה']);
    t(n++, got.length === 0,
      'נ1 · ⭐ מוטציית-נגד: תאריך `YYYY-MM-DD` ⛔ אינו מפיל — ' +
      `נמדדו ${got.length} והצפוי 0`);
  }
  {
    const live = [...TRACKED].find((f) => /\.mjs$/.test(f)) || 'tools/peers.mjs';
    const got = nameGaps([{ tok: live, line: 1, hasRound: false }], TRACKED, IGNORED);
    t(n++, got.length === 0,
      'נ2 · ⭐ מוטציית-נגד: שם של קובץ שבמעקב ⛔ אינו מפיל — ' +
      `נמדדו ${got.length} והצפוי 0 (${live})`);
  }
  {
    const got = absentGaps([{ tok: 'signing/zz.keystore', line: 1, hasRound: false }],
                           new Set(), [/^signing\/[^/]*\.keystore$/],
                           ['⭐ **וכל חתימה היא ב-`signing/zz.keystore`**.']);
    t(n++, got.length === 1,
      'מ8 · ⛔ מוטציה: פרוזה שנוקבת בנתיב שאינו בריפו בלי הצהרת היעדר מפילה את «[doc-absent]» — ' +
      `נמדדו ${got.length} והצפוי 1`);
  }
  {
    const got = absentGaps([{ tok: 'signing/zz.keystore', line: 1, hasRound: false }],
                           new Set(), [/^signing\/[^/]*\.keystore$/],
                           ['⭐ **וכל חתימה היא ב-`signing/zz.keystore`** — ⛔ הקובץ אינו בריפו.']);
    t(n++, got.length === 0,
      'נ4 · ⭐ מוטציית-נגד: אותה פרוזה עם הצהרת ההיעדר ⛔ אינה מפילה — ' +
      `נמדדו ${got.length} והצפוי 0`);
  }
  {
    const got = roundGaps(['⭐ סבב 148 — הסחף נסגר'], 145);
    t(n++, got.length === 0,
      'נ4 · ⭐ מוטציית-נגד: אזכור סבב שאחרי הלידה ⛔ אינו מפיל — ' +
      `נמדדו ${got.length} והצפוי 0`);
  }
}

console.log(`\n${fail ? '✗' : '✓'} ${FACTS.slug} — ערך בקובץ תיאור נמדד מול מקורו: ` +
            `${pass} טענות עברו, ${fail} נכשלו · ${Object.keys(TEXTS).length} קבצים · ` +
            `${NAMES.length} שמות · ${Object.keys(APP.docFacts || {}).length} ערכים`);
if (fail) process.exitCode = 1;
