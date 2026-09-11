#!/usr/bin/env node
/*  test_rulesdocs.mjs — תוכן הקבצים, בלוקי הכללים וכללי הברזל 21–24
 *  (סבב 72: מוזג).
 *
 *  **מה נאכף:** (א) ארבעה בלוקי כללים בדיוק ב-`CLAUDE.md`; (ב) תוכן כל
 *  קובץ לפי תפקידו — כל כותרת בחלק הפרטי שאינה פרק סבב ואינה תחת
 *  «מסכים ולוגיקה» מפילה; (ג) הערה אינה שולחת את הקורא לקובץ אחר;
 *  (ד) ערך שקיים בקוד אינו מוצהר בתיעוד · פרוזה רק למה שאין לו שער ·
 *  קובץ נשפט לפי תפקידו · הבדל מכוון מנומק במקומו · ואין מחלקת CSS מתה.
 *
 *  **הנימוק המדוד:** כלל שאין לו שער חוזר תוך סבבים ספורים — נמדד על
 *  23 הצהרות ה-SHARED, על חמש הצהרות הגרסה ועל 49 שורות טבלאות
 *  הפרמטרים ששרדו שלושה גיזומים. ⚠️ ושני שערים נפרדים קראו את אותם
 *  קבצים ובנו את אותה רתמת-מוטציה, ⛔ כל אחד בעותק משלו.
 *
 *  **מה יישבר בלעדיו:** תוכן תפעולי ב-`CLAUDE.md` נקרא פעם אחת ומשולם
 *  בכל סשן; ⛔ והפניה בהערה נשברת בכל שינוי שם, **בשקט**.
 *
 *  **מה אינו נאכף כאן:** ⛔ ארבעה ממצאים שאינם ניתנים לאכיפה מכנית —
 *  ⚠️ הם רשומים במפורש בפרק «מה אינו נאכף» שבסוף הקובץ, ⛔ ואינם
 *  נשמטים בשתיקה.
 *
 *  ⛔ לכל טענה מוטציה שמפילה אותה ומוטציית-נגד שאינה מפילה, ⛔ והמוטציות
 *  רצות על עותק בתיקייה זמנית ולא על העץ.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',  cachePrefix: 'schar-limud-',
  /*  מחלקות CSS שמורכבות בזמן ריצה (`'role-' + role`) — ⛔ הן נראות מתות
   *  לסורק סטטי, והן חיות. ⚠️ כל שורה כאן היא הצהרה שאדם מתחזק. */
  /*  ⛔ מחלקה שמוחלת ואין לה כלל CSS ואין קורא (סבב 113) — ⚠️ **מה נכנס**:
   *  שם שמופיע ב-`class=` בלבד. ⛔ **ומה מפיל**: שם שמוכרז ובכל זאת יש לו
   *  כלל או קורא, ⛔ ושם שאינו מוכרז ואין לו אף אחד מהם. ⭐ **ולמה היא
   *  קיימת**: מחלקה כזו אינה עושה דבר, ⛔ והרשימה היא מה שהופך «אינה
   *  עושה דבר» להחלטה רשומה. ⚠️ וכאן נמדדה ריקה. */
  classNoRule: {},
  dynamicIds: ['acc-', 'panel-', 'sd-input-', 'sd-list-'],
  /*  ⛔ מחלקה ששמה מורכב בזמן ריצה — ⚠️ **מה נכנס**: שם מחלקה שאין לה
   *  ליטרל מלא בקוד. ⛔ **ומה מפיל**: שם שאין לו אתר בפועל. ⭐ **ולמה היא
   *  קיימת**: מחלקה מורכבת נראית כמחלקה בלי קורא — ⛔ **וכאן אין אחת
   *  כזו**, ⚠️ וההצהרה ריקה ואינה נשמטת. */
  dynamicClasses: [],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [5, 8, 39, 173, 95];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ שורש נדרס בסביבת מוטציה (סבב 65) — ⚠️ המוטציות רצות על עותק
 *  בתיקייה זמנית ולא על העץ, והדרך היחידה להריץ את השער **האמיתי**
 *  עליו היא להצביע אותו לשם. ⛔ והדגל הזה הוא גם סימן הריצה הפנימית:
 *  ⚠️ בלעדיו כל מוטציה הייתה מריצה בעותק את רתמת המוטציות שלה.
 *  ⛔ אין שני דגלים לאותו מצב (סבב 72) — שניים היו נופלים לרקורסיה. */
const ROOT = process.env.RULESDOCS_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INNER = !!process.env.RULESDOCS_ROOT;
let pass = 0, fail = 0;
/*  ⛔ שער מריץ את כל טענותיו — ⚠️ תהליך שנסגר באמצע מדפיס «עבר» על טענות
 *  שלא רצו: ⭐ `EXPECTED` הוא רצפה שנמדדה ברמה שבה השער רץ, ⛔ ופחות ממנה
 *  הוא כשל — ⚠️ והמאזין על `exit` תופס גם יציאה שקדמה להמתנה. */
const GATE_ID = new URL(import.meta.url).pathname.split('/').pop();
/*  ⛔ ריצפת הטענות — ⚠️ **מה נכנס**: המשותפת, שהיא מספר זהה בארבעת הריפו,
 *  ⛔ והפרטית עם היכולת שמוסיפה אותה; ⛔ **ומה מפיל**: משותפת שנבדלת בין
 *  הריפו, פרטית בלי נימוק, וסכום אפס. ⭐ **ולמה לא מספר אחד**: הוא מסתיר
 *  טענה משותפת שאבדה. */
/* ⚠️ פר-אפליקציה — הריצפה הפרטית של השער נבדלת בין הארבע לפי היכולת שכל אחת נושאת, והנימוק בשדה עצמו */
const FLOOR = { shared: 24, app: 4, appWhy: 'מספר השערים והבודקים שהריפו נושא — כל שער פרטי מוסיף טענת תוכן' };
/* ⚠️ סוף פר-אפליקציה */
const EXPECTED = FLOOR.shared + FLOOR.app;
let RAN = 0;
/*  ⛔ המונה נלכד בכניסה לשלב המוטציות (סבב 119) — ⚠️ `null` הוא תהליך
 *  שלא הגיע לשם, ⛔ ואפס הוא שער שכל גופו מוטציות: ⭐ ההבחנה היא מה
 *  שמבדיל ריצה חלקית מדילוג מוצהר. */
let PRE_MUT = null;
const mutStage = () => { if (PRE_MUT === null) PRE_MUT = RAN; };
/*  ⛔ הדגל נלכד ברישום ⛔ ולא בסגירה — ⚠️ שער שמריץ שער אחר מציב אותו
 *  **אחרי** הרישום, ⭐ ולכן הוא חל על הילד ⛔ ולא על עצמו. */
const SUBRUN = !!process.env.GATE_SUBRUN;
/*  ⛔ הריצפה נמדדת בשני הכיוונים (סבב 118) — ⚠️ **מה נכנס**: מספר הטענות
 *  שרצו עד שלב המוטציות; ⛔ **ומה מפיל**: פחות מהמוצהר — ריצה חלקית —
 *  ⛔ ויותר ממנו — ריצפה מיושנת. ⭐ **ולמה שני הכיוונים**: ריצפה שאינה
 *  מתעדכנת מפסיקה למדוד את מה שנוסף. ⛔ **וההשהיה על שלב המוטציות בלבד
 *  (סבב 119)** — ⚠️ `mutStage` לוכדת את המונה בכניסה אליו, ⭐ ומה שהוא
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
  /*  ⛔ אפס שנמדד בכניסה לשלב המוטציות הוא דילוג מוצהר (סבב 119) —
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
const t = (c, m) => { RAN++; if (c) { pass++; console.log('  ok   ' + m); }
                      else { fail++; console.error('  FAIL ' + m); } };

const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const DOC = rd('CLAUDE.md');

/*  ⛔ הכותרות המותרות בחלק הפרטי — ⚠️ זו ההגדרה עצמה ולא רשימת דוגמאות:
 *  מסכים ולוגיקה של האפליקציה · הפער הפתוח · ופרקי הסבבים שבחלון. */
const PRIVATE_H2 = [
  /^##\s+מסכים ולוגיקה/,
  /^##\s+(?:⭐\s+)?סבב\s/,
];

function fenceMask(ls) {
  const m = new Array(ls.length).fill(false);
  let f = false;
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].startsWith('```')) { f = !f; m[i] = true; continue; }
    m[i] = f;
  }
  return m;
}

/*  ⚠️ הניתוח מוצא בלוקי SHARED וכותרות `##` פרטיות בטקסט כלשהו, כדי
 *  שאותה פונקציה תרוץ גם על העותק המוטב. */
function analyze(doc) {
  const ls = doc.split('\n');
  const inF = fenceMask(ls);
  const heads = [];
  let inb = false;
  for (let i = 0; i < ls.length; i++) {
    if (inF[i]) continue;
    const m = /^<!--\s*SHARED:start\s+id="([^"]*)"/.exec(ls[i]);
    if (m) { inb = true; continue; }
    if (/^<!--\s*SHARED:end/.test(ls[i])) { inb = false; continue; }
    if (!inb && ls[i].startsWith('## ')) heads.push(ls[i]);
  }
  return { heads };
}

/* ── ב. תוכן הקבצים לפי תפקידם ─────────────────────────────────────────── */
{
  const { heads } = analyze(DOC);
  const bad = heads.filter((h) => !PRIVATE_H2.some((re) => re.test(h)));
  t(bad.length === 0,
    `ב1 · כל כותרת בחלק הפרטי היא מסכים, פער או פרק סבב${bad.length ? ' — ' + bad.join(' · ') : ''}`);
  /*  ⛔ ושלושת הקבצים הנלווים אינם מחזיקים עותק של הטבלה (סבב 69) —
   *  ⚠️ טבלה שמופיעה בשניהם היא מקור אמת שני, וזה בדיוק מה שנסחף.
   *  ⛔ **והחצי שמדד «פרק כללים» ירד בסבב 97** — ⚠️ ארבעת בלוקי הכללים
   *  ירדו בסבב 96, ⭐ ומאז אין כלל שאפשר להבריח לכאן. */
  for (const f of ['README.md', 'CONTEXT.md', 'android/README.md']) {
    const s = rd(f);
    t(!/<!--\s*SHARED:start\s+id="table"/.test(s),
      `ב2 · ${f} אינו מחזיק עותק של הטבלה`);
  }
}

/* ── ג. הערה אינה מפנה לקובץ ───────────────────────────────────────────── */
/*  ⛔ אין לתפוס אזכור סתם (סבב 69) — התבנית היא **הפניה**: «ר'/ראה …
 *  ב-<קובץ>». ⚠️ שער שקורא קובץ רשאי לנקוב בשמו, ⛔ ולכן
 *  `APP.docs = 'CLAUDE.md'` אינו נתפס. */
const REF_RE = /(?:ר'|ר׳|ראה|עיין)[^\n]{0,60}ב-?[«"'`]?(?:CLAUDE\.md|CONTEXT\.md|README\.md)/;
/*  ⛔ ומספר שורה בטבלה הוא הפניה אף הוא (סבב 72) — ⚠️ נמדדו 113 הפניות
 *  «שורה N», ⛔ ורבות מהן הצביעו על שורה אחרת לגמרי: המספר זז בכל מיזוג
 *  שורות, ⭐ והשם אינו זז. ⚠️ הודעת ריצה שמרכיבה מספר (`שורה ${n}`) אינה
 *  הפניה — ⛔ היא מדפיסה את מה שנמדד עכשיו. */
const ROW_RE = /(?<!\$\{[^}\n]{0,40})שורה\s+\d+/;
function refHits(text) {
  return text.split('\n').filter((l) => REF_RE.test(l) || ROW_RE.test(l));
}
/*  ⛔ אין לסרוק את הקובץ הזה עצמו (סבב 69) — ⚠️ הוא מחזיק את התבנית
 *  שהוא אוכף, גם בבאנר וגם במחרוזת המוטציה, ⛔ ולכן היה נופל על עצמו. */
const files = ['index.html', 'sw.js'];
for (const f of fs.readdirSync(path.join(ROOT, 'tools'))) {
  if (f.endsWith('.mjs') && f !== 'test_rulesdocs.mjs') files.push('tools/' + f);
}
{
  const hits = [];
  for (const f of files) {
    for (const l of refHits(rd(f))) hits.push(`${f}: ${l.trim().slice(0, 60)}`);
  }
  t(hits.length === 0,
    `ג1 · אין הפניה לקובץ ואין «שורה N» בקוד ובשערים${hits.length ? ' — ' + hits.slice(0, 3).join(' · ') : ''}`);
}

/*  ⛔ והפניה למספר כלל היא הפניה אף היא (סבב 96ג) — ⚠️ «כלל ברזל N»
 *  ו«סעיף N» הצביעו על מנגנון שקדם לטבלה, ⛔ ואחרי שהכללים ירדו הם
 *  מצביעים על **לא-כלום**: ⭐ נמדדו 62 הפניות במקור האפליקציה ועוד 267
 *  בשערים, ⛔ והמשפט נשאר בכולן — ההפניה בלבד ירדה. ⚠️ **וההיקף הוא
 *  אותו סט קבצים של ג1** — מקור האפליקציה ו-`tools/` כאחד: ⭐ באנר של
 *  שער שמפנה למספר כלל שולח את הקורא לחפש טקסט שאינו קיים. */
const RULE_RE = /כלל\s+ברזל|סעיף\s+\d/;
{
  const hits = [];
  for (const f of files) {
    for (const l of rd(f).split('\n')) {
      if (RULE_RE.test(l)) hits.push(`${f}: ${l.trim().slice(0, 60)}`);
    }
  }
  t(hits.length === 0,
    `ג2 · אין «כלל ברזל N» ואין «סעיף N» במקור האפליקציה וב-tools — נמדדו ` +
    `${hits.length} מול 0 הצפויים${hits.length ? ' · ' + hits.slice(0, 3).join(' · ') : ''}. ` +
    'מוחקים את ההפניה ומשאירים את המשפט.');
}


/* ══ כללי הברזל 21–24 (סבב 72: מוזג לכאן) ════════════════════════════════ */
const DOC_LINES = DOC.split('\n');

/*  ⚠️ פרק סבב הוא **היסטוריה** ולא הוראה, ולכן הוא מוחרג מרוב הסעיפים:
 *  שורה כמו «`CACHE_NAME` קודם ל-v45» היא תיאור של מה שנעשה אז, והיא
 *  יורדת מאליה בחלון שני הסבבים. ⛔ מה שאסור הוא הצהרה
 *  בפרק **פעיל** — ⛔ שם איש אינו מוחק אותה, והיא נקראת כמציאות. */
const roundMask = (() => {
  const m = new Array(DOC_LINES.length).fill(false);
  let inR = false, fence = false;
  for (let i = 0; i < DOC_LINES.length; i++) {
    if (DOC_LINES[i].startsWith('```')) { fence = !fence; m[i] = inR; continue; }
    if (!fence && DOC_LINES[i].startsWith('## ')) inR = /^##\s+(⭐\s*)?סבב\s/.test(DOC_LINES[i]);
    m[i] = inR;
  }
  return m;
})();
const activeLines = DOC_LINES.filter((_, i) => !roundMask[i]);
const ACTIVE = activeLines.join('\n');

/* ── כלל 21 — ערך שקיים בקוד אינו מוצהר בתיעוד ─────────────────────────── */
{
  /*  ⛔ מספר גרסה בתיעוד נסחף תמיד (סבב 65) — נמדד: חמישה מקומות הצהירו
   *  גרסה, והפער היה 15–35 קידומים. */
  const VER = new RegExp('(?<![\\w-])' + APP.cachePrefix.replace(/[-]/g, '\\-') + 'v\\d+');
  const hits = [];
  for (const f of ['CLAUDE.md', 'CONTEXT.md', 'README.md']) {
    const ls = rd(f).split('\n');
    ls.forEach((l, i) => {
      if (f === 'CLAUDE.md' && roundMask[i]) return;
      if (VER.test(l)) hits.push(`${f}:${i + 1}`);
    });
  }
  t(hits.length === 0, `21א · אין הצהרת \`CACHE_NAME\` בתיעוד הפעיל${hits.length ? ' — ' + hits.join(', ') : ''}`);
  const av = activeLines.filter((l) => /app-version["'`]?\s*(content=)?["']?\s*\d+-\d{4}-/.test(l));
  t(av.length === 0, '21ב · אין הצהרת `app-version` בתיעוד הפעיל');
}

/* ── עמודת התקן היא הוראה ──────────────────────────────────────────────── */
/*  ⛔ הכלל מוצהר בבלוק המשותף ⛔ ולא בפרק פרטי — ⚠️ הוראה שיושבת באחת
 *  מארבע היא הוראה שלוש אינן מכירות. ⛔ והטענה מודדת **ערך**: שהשורה
 *  יושבת בתוך `table` ⛔ ולא איפה שהיא בקובץ — הבלוק הוא מה
 *  שהחתימה אוכפת, ⛔ ושורה מחוצה לו אינה זהה בין הריפו. ⚠️ והכלל ירד
 *  מפרק הכללים לעמודת התקן של שורתו (סבב 73), ⛔ ולכן הטענה מודדת את
 *  התא ולא את הכותרת: ⭐ פרק כלל שכפל את מה שהשורה כבר אומרת. */
{
  const b = /<!--\s*SHARED:start\s+id="table"\s*-->([\s\S]*?)<!--\s*SHARED:end\s*-->/.exec(DOC);
  const body = b ? b[1] : '';
  /*  ⛔ שם השורה עירום (סבב 96) — ⚠️ סימון הלולאה ירד עם הכללים,
   *  ⭐ ואין יותר זיווג שממנו הוא נגזר. */
  const row = /^\|\s*\d+\s*\|\s*עמודת התקן כהוראה\s*\|([^|]*)\|/m.exec(body);
  t(!!row, '31א · שורת «עמודת התקן כהוראה» יושבת בתוך `table`');
  const std = row ? row[1] : '';
  t(/הטבלה היא מקור ההוראה, ⛔ ולא תיאור/.test(std) &&
    /ואין לכתוב דבר שסותר שורה קיימת/.test(std),
    '31ב · ⛔ ועמודת התקן שלה אוסרת במפורש לכתוב דבר שסותר שורה קיימת');
}

/* ── כלל 22 — פרוזה רק למה שאין לו שער ─────────────────────────────────── */
{
  /*  ⛔ אחד-עשר המודולים המשותפים מתועדים באינדקס אחד (סבב 65) — פרק
   *  פרוזה לכל אחד מהם הוא בדיוק מה שנמחק. */
  const MODS = ['ממתין לסנכרון', 'גיבוי יומי ויומן פעולות', 'חלון חם',
                'מיזוג רשומות', 'מזהי רשומות', 'מזהה מכשיר', 'ניסיון חוזר',
                'service worker', 'מנגנון המשיכה', 'נעילת חוסר-פעילות', 'מודל הסשן'];
  const heads = activeLines.filter((l) => l.startsWith('## '));
  const back = MODS.filter((m) => heads.some((h) => h.includes(m) && !h.includes('אינדקס')));
  t(back.length === 0, `22א · אין פרק פרוזה למודול משותף${back.length ? ' — ' + back.join(', ') : ''}`);
  t(/\|\s*\d+\s*\|\s*`pend`/.test(DOC) && /\|\s*\d+\s*\|\s*`hw`/.test(DOC),
    '22ב · המודולים המשותפים רשומים כשורות בטבלת התשתית');
  /*  ⛔ טבלת ידיות פר-אפליקציה (סבב 65) — 49 שורות שאף שער לא קרא,
   *  בזמן שהערכים כבר נאכפים בבלוק `APP` של כל שער. */
  t(!/^\|\s*ידית\s*\|/m.test(ACTIVE), '22ג · ⛔ אין טבלת ידיות פר-אפליקציה בתיעוד');
}

/* ── כלל 22 (המשך) — «הבעיה שנמדדה» עד שלוש שורות ──────────────────────── */
{
  const over = [];
  for (let i = 0; i < DOC_LINES.length; i++) {
    if (roundMask[i] || !/^#{3,}\s.*הבעיה/.test(DOC_LINES[i])) continue;
    let j = i + 1, body = 0;
    while (j < DOC_LINES.length && !/^#{2,3}\s/.test(DOC_LINES[j]) &&
           !/^<!--\s*SHARED:end/.test(DOC_LINES[j])) { if (DOC_LINES[j].trim()) body++; j++; }
    if (body > 3) over.push(`${i + 1}(${body})`);
  }
  t(over.length === 0, `22ד · כל פרק «הבעיה שנמדדה» עד שלוש שורות${over.length ? ' — ' + over.join(', ') : ''}`);
}

/* ── כלל 23 — קובץ נשפט לפי תפקידו ─────────────────────────────────────── */
{
  /*  ⛔ הוראות התקנה, חתימה ובנייה יושבות ב-`README.md` וב-`android/README.md`
   *  (סבב 65) — ⚠️ ב-`CLAUDE.md` נשארות ההכרעות בלבד. */
  const OPS = [['keytool -genkeypair', 'יצירת keystore'],
               ['apksigner sign', 'פקודת חתימה'],
               ['storepass', 'סיסמת keystore'],
               ['zipalign', 'פקודת בנייה'],
               ['gradle :app:assembleRelease', 'פקודת בנייה']];
  const found = OPS.filter(([s]) => ACTIVE.includes(s)).map(([, why]) => why);
  t(found.length === 0, `23א · אין תוכן תפעולי ב-CLAUDE.md${found.length ? ' — ' + found.join(', ') : ''}`);
  /*  ⛔ `CONTEXT.md` מחזיק לקוח · צורך · הסכימה וההרשאות — כל כותרת נוספת
   *  היא עותק שני של `CLAUDE.md` או של `README.md`, וזה מה שנסחף.
   *  ⛔ ופרק «מצב נוכחי» ירד (סבב 71) — ⚠️ הוא צילום מצב, כלומר היסטוריה,
   *  ⛔ וכלל «ערך שקיים בקוד אינו מוצהר בתיעוד» אוסר אותו במפורש. */
  /*  ⛔ ו-`README.md` מחזיק התקנה · הפעלה · פיתוח (סבב 71) — ⚠️ ארבע
   *  הכותרות זהות בארבעת הריפו, ⛔ וכותרת חמישית היא פרק שנדד לכאן. */
  const RM_OK = ['## הפעלה ראשונה', '## מסכים', '## פיתוח', '## APK'];
  const rm = rd('README.md').split('\n').filter((l) => l.startsWith('## '));
  const rmBad = rm.filter((h) => !RM_OK.includes(h.trim()));
  t(rmBad.length === 0 && rm.length === RM_OK.length,
    `23ד · README.md — ${RM_OK.length} הכותרות בלבד${rmBad.length ? ' — ' + rmBad.join(' / ') : ''}`);
  const CTX_OK = ['## פרטי ריפו', '## ⚠️ Supabase — GRANT חובה לטבלאות חדשות'];
  const ctx = rd('CONTEXT.md').split('\n').filter((l) => l.startsWith('## '));
  const extra = ctx.filter((h) => !CTX_OK.some((k) => h.startsWith(k.slice(0, 12))));
  t(extra.length === 0, `23ב · CONTEXT.md — שתי הכותרות בלבד${extra.length ? ' — ' + extra.join(' / ') : ''}`);
  t(!/^##\s+מצב נוכחי/m.test(rd('CONTEXT.md')), '23ג · ⛔ ואין בו פרק «מצב נוכחי» — צילום מצב הוא היסטוריה');
}

/* ── כלל 24 — הבדל מכוון מנומק במקום שבו הוא נראה ──────────────────────── */
{
  /*  ⛔ הפניה לקובץ או לבלוק בנקודת הכניסה של מודול משותף (סבב 69) —
   *  ⚠️ השער מגן, ⛔ לא ההפניה; והפניה נשברת בכל שינוי שם, בשקט. */
  const SRC = rd('index.html') + '\n' + rd('sw.js');
  const MARK = /— מודול משותף \(סבב \d+/g;
  let marks = 0, refs = 0, m;
  while ((m = MARK.exec(SRC))) {
    marks++;
    /*  ⚠️ ההפניה נמדדת **בתוך אותה כותרת** ולא בקובץ כולו — ספירה
     *  גלובלית הייתה מפספסת נקודת כניסה יחידה שהחזירה אותה. */
    if (/CLAUDE\.md|shared-modules-index/.test(SRC.slice(m.index, m.index + 700))) refs++;
  }
  t(marks > 0 && refs === 0,
    `24א · ⛔ אין הפניה לקובץ בנקודת כניסה של מודול משותף (${refs}/${marks})`);
  /*  ⛔ תחולת תקן ההערות (סבב 65) — `sw.js` ו-`tools/` אינם מוחרגים. */
  const cc = rd('tools/check-comments.mjs');
  t(cc.includes("add('sw.js')") && cc.includes("readdirSync('tools')"),
    '24ב · תקן ההערות חל גם על sw.js ועל tools/');
}

/* ── סלקטור בלי קורא (ממצא 15) ─────────────────────────────────────────── */
{
  const src = rd('index.html');
  const styles = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const rest = src.split(/<style[^>]*>[\s\S]*?<\/style>/).join('\n');
  const names = new Set();
  for (const m of styles.matchAll(/(?<![\w/-])\.(-?[A-Za-z_][\w-]*)/g)) names.add(m[1]);
  const dead = [...names].filter((c) => {
    if (APP.dynamicClasses.includes(c)) return false;
    return !new RegExp('(?<![\\w-])' + c.replace(/-/g, '\\-') + '(?![\\w-])').test(rest);
  }).sort();
  t(dead.length === 0, `15 · אין מחלקת CSS שאינה מוחלת לעולם${dead.length ? ' — ' + dead.join(' ') : ''}`);
  for (const c of APP.dynamicClasses) {
    const pre = c.replace(/[^-]*$/, '');
    t(pre.length > 0 && rest.includes("'" + pre + "'"),
      `15ב · חריגה מוצהרת \`${c}\` — הקידומת \`${pre}\` באמת מורכבת בקוד`);
  }
  /*  ⛔ והכיוון השני נמדד אף הוא (סבב 113) — ⚠️ מחלקה שנוספת ל-DOM ואין
   *  לה כלל CSS ואין קורא שבוחר אותה **אינה עושה דבר**: ⭐ הנימוק המדוד —
   *  `.bkStale` נוסף לבאנר «הגיבוי לא רץ N ימים» בארבע האפליקציות,
   *  ⛔ ולאף אחת מהן לא היה לו כלל, ⚠️ והאזהרה הוצגה כטקסט חשוף.
   *  ⛔ **והסלקטור המורכב נספר** — ⚠️ `.toast.bad` מגדיר את `bad`,
   *  ⭐ והסריקה שדרשה תו שאינו מילה לפני הנקודה פספסה אותו. */
  const styled = new Set();
  for (const m of styles.matchAll(/(?<!\d)\.(-?[A-Za-z_][\w-]*)/g)) styled.add(m[1]);
  const applied = new Set();
  for (const m of src.matchAll(/class\s*=\s*\\?["']([^"'<>\\]*)\\?["']/g))
    for (const c of m[1].split(/\s+/)) if (/^[A-Za-z_][\w-]*$/.test(c)) applied.add(c);
  for (const m of src.matchAll(/classList\.(?:add|toggle|remove)\(([^)]*)\)/g))
    for (const q of m[1].matchAll(/['"]([A-Za-z_][\w-]*)['"]/g)) applied.add(q[1]);
  const reads = (c) => new RegExp('\\.' + c.replace(/-/g, '\\-') + '(?![\\w-])').test(rest);
  const noRule = [...applied].filter((c) => !styled.has(c) && !reads(c) &&
                                            !(c in APP.classNoRule)).sort();
  t(noRule.length === 0,
    `15ה · אין מחלקה שנוספת ל-DOM בלי כלל CSS ובלי קורא${noRule.length ? ' — ' + noRule.join(' ') : ''}`);
  for (const c of Object.keys(APP.classNoRule))
    t(applied.has(c) && !styled.has(c) && !reads(c),
      `15ו · חריגה מוצהרת \`${c}\` — באמת מוחלת, ובאמת בלי כלל ובלי קורא`);
  /*  ⛔ ומזהה `id` נמדד באותה מידה (סבב 110) — ⚠️ המחלקות נמדדו והמזהים לא,
   *  ⭐ ומזהה שקוראו נמחק או ששמו שונה נשאר בתגית בלי שאיש יידע: ⛔ הנימוק
   *  המדוד — 13 מזהים בלי קורא נמצאו בסבב שבו הצד הזה נכתב. */
  const js = [...src.matchAll(/<script(?![^>]*\ssrc[=\s])[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1]).join('\n');
  const markup = src.replace(/<script[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
  const ids = new Set();
  for (const m of src.matchAll(/\sid\s*=\s*["']([^"'\s]+)["']/g)) ids.add(m[1]);
  /*  ⛔ קורא הוא ליטרל ב-JS · כלל `#id` ב-CSS · או מאפיין שמצביע עליו —
   *  ⚠️ `getElementById` לבדו מפספס `querySelector('#x')` ואת `<label for>`,
   *  ⭐ ומזהה נגיש שאיבד את קוראו היה נמחק יחד עם הקישור לתווית. */
  const ATTR = 'for|aria-labelledby|aria-controls|aria-describedby|list|form|headers|href';
  const deadIds = [...ids].filter((id) => {
    if (APP.dynamicIds.some((p) => id.startsWith(p))) return false;
    const q = id.replace(/-/g, '\\-');
    return !new RegExp('[\'"`]' + q + '[\'"`]|#' + q + '(?![\\w-])').test(js) &&
           !new RegExp('#' + q + '(?![\\w-])').test(styles) &&
           !new RegExp('(?:' + ATTR + ')\\s*=\\s*["\']#?' + q + '["\']').test(markup);
  }).sort();
  t(deadIds.length === 0,
    `15ג · אין מזהה id שאין לו קורא${deadIds.length ? ' — ' + deadIds.join(' ') : ''}`);
  for (const p of APP.dynamicIds)
    t(new RegExp('[\'"`]' + p.replace(/-/g, '\\-')).test(js),
      `15ד · קידומת מוצהרת \`${p}\` — באמת מורכבת בקוד`);
}

/* ── כלל 21 (המשך) — אין הצהרת «זהה בארבעתן» ───────────────────────────── */
{
  /*  ⛔ הצהרת זהות היא ערך שנקבע במקום אחר (סבב 65) — `check-docs` מודדת
   *  את החתימה בפועל, ומשפט שמכריז «זהה מילה במילה» נשאר נכון בעיניים גם
   *  כשהוא כבר שקרי. 23 מהם נמדדו, ואחד תיאר פרק שנבדל בשלושה ריפו. */
  const DECL = [/זהה (מילה במילה|בית-לבית) בארבעת קבצי/,
                /ממשיך את .{2,24} כללי הברזל שלמעלה/];
  const hits = activeLines.filter((l) => DECL.some((re) => re.test(l)));
  t(hits.length === 0, `21ד · אין הצהרת «זהה בארבעתן» בתיעוד הפעיל (${hits.length})`);
}

if (RUN_MUT) {
  mutStage();
/* ── המוטציות — ⛔ עותק אחד לשער, ולא עותק לכל מוטציה (סבב 75) ──────────── */
/*  ⛔ עד סבב 75 כל אחת מ-40 המוטציות עשתה `cp -r` של העץ כולו ⛔ ותהליך
 *  `node` חדש — ⚠️ והזמן גדל עם **מספר המוטציות** ולא עם גודל הקוד.
 *  ⭐ העותק נוצר פעם אחת ונשמר, ⛔ והקבצים שהמוטציה נגעה בהם מוחזרים
 *  אחריה: ⚠️ שחזור סלקטיבי הוא מה שמתיר לשתף את העותק בלי שמוטציה אחת
 *  תזלוג לשנייה. */
let WORK = null;
function work() {
  if (WORK) return WORK;
  /*  ⛔ כותב על עותק — ⚠️ הרתמה מריצה בודקים אמיתיים על עץ `tools` סינתטי. */
  WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'rulesdocs-'));
  execFileSync('cp', ['-r', ROOT + '/.', WORK]);
  /*  ⛔ המחיקה על יציאה (סבב 72) — ⚠️ נמדד: העותק נשאר בכל הרצה,
   *  ⛔ ומאות עותקי עץ מילאו את הדיסק. */
  process.on('exit', () => { try { fs.rmSync(WORK, { recursive: true, force: true }); } catch (e) {} });
  return WORK;
}
/*  ⛔ מחזירה `true` כשהשער **נפל** — ⚠️ זה מה שהמוטציה מודדת. */
/*  ⛔ הזזת גוון בצעד אחד — ⚠️ משמשת מוטציית-נגד שצריכה
 *  ערך אחר שעדיין תקין: ⭐ הנמדד הוא המבנה ⛔ ולא הצבע. */
function shiftHex(h) {
  const n = parseInt(h.slice(1), 16);
  return '#' + (((n & 0xfefefe) + 0x010101) & 0xffffff).toString(16).padStart(6, '0');
}
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
const fails = (files) => runGateOn(files, 'test_rulesdocs.mjs', (d) => ({ RULESDOCS_ROOT: d }));
/*  ⛔ הרצת `check-capabilities` על העותק (סבב 72) — ⚠️ הטענה על עמודת
 *  ההערות יושבת שם, ⭐ ורק ריצה אמיתית מוכיחה שהמוטציה נתפסה. */
const capsFails = (edit) => runGateOn({ 'CLAUDE.md': edit(DOC) }, 'check-capabilities.mjs', () => ({}));
/*  ⛔ מוטציה שמכוונת לשער אחר (סבב 72) — ⚠️ «פרק שחופף לשורה בטבלה»
 *  נאכף ב-`check-comments`, ⛔ ולכן המוטציה מריצה **אותו** על העותק
 *  ולא את השער הזה: מוטציה שמריצה את השער הלא-נכון אינה אכיפה. */
const commentsFails = (files) => runGateOn(files, 'check-comments.mjs', () => ({}));

/*  ⛔ השורה נבחרת מהטבלה ⛔ ולא נכתבת כמספר — ⚠️ מספר קשיח נסחף בכל
 *  מספור מחדש, ⭐ והמוטציה מפסיקה לפגוע במה שהיא באה למדוד: היא הייתה
 *  עוברת בשקט על שורה שכבר נושאת הערה. */
const okRow = (doc) => /^\| (\d+) \|(?:[^\n|]*\|){2}(?: ✅ \|){4}\s*\|$/m.exec(doc);
t(!!okRow(DOC), 'מ18 · נמצאה שורה ✅✅✅✅ עם הערה ריקה למוטציה');

if (!INNER) {

  /*  ⛔ עשר קריאות רתמת המוטציה יושבות מתחת לסוגר (סבב 74) — ⚠️ כל
   *  אחת מהן היא `cp -r` של העץ ותהליך `node` חדש, ⛔ והריצה הפנימית
   *  שמריצה אותן שוב לכל מוטציה הכפילה אותן פי מספר המוטציות:
   *  ⭐ נמדד 77–83 שניות לשער, ⛔ ומהן 2,956 מ״ש מתוך 3,427 ב-spawn. */
/*  ⛔ מוטציה: הערת נימוק על שורה ✅✅✅✅ (סבב 72) — ⚠️ היא מתארת מצב
 *  שכבר אינו, ⛔ ומי שקורא אותה מחפש בעיה שנפתרה. */
t(capsFails((doc) => {
  const m = okRow(doc);
  return doc.replace(m[0], m[0].replace(/\|$/, ' נשאר להמיר את שאר האתרים |'));
}), 'מ18 · הערת נימוק על שורה ✅✅✅✅ **מפילה** את check-capabilities');
/*  ⭐ מוטציית-נגד: הערה שהיא **ספירה נגזרת** ⛔ אינה מפילה — ⚠️ «כמה
 *  שערים» משתנה בכל סבב, ⛔ ומקומו בהערות ולא בעמודת התקן. */
t(!capsFails((doc) => {
  const m = okRow(doc);
  return doc.replace(m[0], m[0].replace(/\|$/, ' נמדדו 74 קבצים בסט המשותף |'));
}), 'נ9 · ⭐ הערה שנושאת ספירה נגזרת ⛔ **אינה** מפילה');

/*  ⛔ מוטציה: הצהרת מיזוג-מפה שאין לה אתר (סבב 98) — ⚠️ הטענה שנופלת היא
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
                'check-capabilities.mjs', () => ({})),
      'מ24 · הצהרת נקודת-מיזוג בלי אתר בפועל **מפילה** את «מיזוג מכל»');
  }
  /*  ⭐ מוטציית-נגד: שם מקומי שהוחלף בעקביות בגוף ה-probe ⛔ אינו מפיל —
   *  ⚠️ המנגנון לא נגע, ⭐ ורק השם השתנה. */
  t(!runGateOn({ [CAPS]: caps
      .replace('const maps = keyMapMerges();', 'const found = keyMapMerges();')
      .replace('for (const f of maps) {', 'for (const f of found) {')
      .replace('const found = maps.concat(pairs);', 'const all = found.concat(pairs);')
      .replace('if (!found.some((f) => f.name === n))', 'if (!all.some((f) => f.name === n))') },
              'check-capabilities.mjs', () => ({})),
    'נ15 · ⭐ שם מקומי שהוחלף בעקביות בגוף ה-probe ⛔ **אינו** מפיל');
  /*  ⛔⛔ מ32 — שער שקורא את המקור ואינו מוצהר ב-`scanKind` (סבב 111):
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
  /*  ⛔⛔ מ36 — דפוס שנפתח בשם מוצהר בלי גבול (סבב 130): ⚠️ הטענה
   *  שנופלת היא «RegExp מהצהרה בלי גבול», ⭐ והנימוק המדוד הוא הבאג
   *  שחי חמישה סבבים — ⛔ `ACTIONS[act]` התאים למפה ששמה `DOM_ACTIONS`. */
  /*  ⛔ הצורה העירומה נבנית בשרשור ⛔ ואינה נכתבת כמחרוזת אחת — ⚠️ הסורק
   *  קורא את הקובץ הזה אף הוא, ⭐ ומחרוזת שנושאת את הדפוס הייתה נספרת
   *  כאתר חי. */
  const BARE_RX = 'new RegExp(' + 'APP.cfgReader';
  t(runGateOn({ [CAPS]: caps,
                'tools/test_dbfacts.mjs': rd('tools/test_dbfacts.mjs')
                  .replace("new RegExp('(?<![\\\\w$.])' + APP.cfgReader", BARE_RX) },
              'check-capabilities.mjs', () => ({})),
    'מ36 · דפוס שנפתח בשם מוצהר בלי גבול **מפיל** את «RegExp מהצהרה בלי גבול»');
  /*  ⛔⛔ מ37 — שם מפה שאינו קיים בקוד: ⚠️ הטענה שנופלת היא «הניתוב
   *  אינו עובר במפת הפעולות», ⭐ וזו המדידה שהגבול הפך לאפשרית: ⛔ בלי
   *  הגבול `ACTIONS[act]` היה נמצא בתוך `DOM_ACTIONS[act]`. */
  t(runGateOn({ [CAPS]: caps.replace(/^(  actMap: ')[A-Za-z_$][\w$]*'/m, "$1ACTIONS'") },
              'check-capabilities.mjs', () => ({})),
    'מ37 · שם מפה שהוא סיומת של השם החי **מפיל** את «מפת הפעולות»');
  /*  ⭐ מוטציית-נגד: גבול שנכתב בצורה שקולה ⛔ אינו מפיל — ⚠️ המנגנון
   *  לא נגע, ⭐ ורק ניסוח הגבול השתנה: ⛔ ושם המפה עצמו אינו ניתן
   *  להחלפה כאן, ⚠️ שהוא יושב גם בבלוק חתום — ⭐ והחתימה הייתה נופלת
   *  במקום הטענה שנמדדת. */
  t(!runGateOn({ [CAPS]: caps,
                 'tools/test_dbfacts.mjs': rd('tools/test_dbfacts.mjs')
                   .replace("new RegExp('(?<![\\\\w$.])' + APP.cfgReader",
                            "new RegExp('(?<![\\\\w$.])(?:)' + APP.cfgReader") },
               'check-capabilities.mjs', () => ({})),
    'נ23 · ⭐ גבול שנכתב בצורה שקולה ⛔ **אינו** מפיל');
  /*  ⛔⛔ מ38 — הכרזת הגירה בלי הסבב שבו רצה (סבב 130): ⚠️ הטענה
   *  שנופלת היא «הגירה מקומית שהושלמה», ⭐ והנימוק המדוד הוא שההכרזה
   *  נקראת כקבועה — ⛔ והיא מדידה שחלפה.
   *  ⛔ **והדילוג נושא נימוק** ⛔ ואינו שקט — ⚠️ אפליקציה שאין בה הגירה
   *  שנשארת בכוונה אין לה מה למוטט כאן. */
  if (/migrateKeep: \{\s*\}/.test(caps)) {
    t(true, 'מ38 · ⭕ אין כאן הגירה שנשארת בכוונה — ⛔ ואין מה למוטט');
  } else {
    t(runGateOn({ [CAPS]: caps.replace(/(migrateKeep: \{[\s\S]*?\n  \},)/,
                                       (b) => b.replace(/ \(סבב \d+\)/g, '')) },
                'check-capabilities.mjs', () => ({})),
      'מ38 · הכרזת הגירה בלי הסבב שבו רצה **מפילה** את «הגירה מקומית שהושלמה»');
  }
  /*  ⛔⛔ מ39 — מיכל באנר העדכון שאינו במקור (סבב 130): ⚠️ הטענה שנופלת
   *  היא «מיכל באנר העדכון במקור», ⭐ והנימוק המדוד הוא שהבאנר נחוץ
   *  בדיוק כשהקוד שרץ הוא הישן — ⛔ ומיכל שנבנה ב-JS קיים רק אחרי
   *  שהקוד רץ. */
  t(runGateOn({ [CAPS]: caps,
                'index.html': rd('index.html').replace('<div id="updater">', '<div id="updaterX">') },
              'check-capabilities.mjs', () => ({})),
    'מ39 · מיכל באנר העדכון שאינו במקור **מפיל** את «מיכל באנר העדכון במקור»');
  /*  ⛔⛔ מ40 — שער שמריץ את הסט ומוכרז `text` (סבב 130): ⚠️ הטענה
   *  שנופלת היא «שער אינו מריץ את check-js המלא», ⭐ וההמרה הופכת אותו
   *  לבדיקה שאינה יכולה להיכשל — ⛔ בזיכרון הוא היה מודד את עצמו. */
  t(runGateOn({ [CAPS]: caps.replace(/^(\s*'test_readonly':\s*)'behavior[^']*'/m, "$1'text'") },
              'check-capabilities.mjs', () => ({})),
    'מ40 · שער שמריץ את הסט ומוכרז text **מפיל** את «סוג השער מוצהר»');
  /*  ⛔⛔ מ41 — טיימר קצר שמרענן בעצמו (סבב 131): ⚠️ הטענה שנופלת היא
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
      '_swWait = setTimeout(function () { swApplyFail(btn); }, SW_APPLY_MS);',
      'setTimeout(function () { _swReloaded = true; location.reload(); }, 1500);');
    t(runGateOn({ 'index.html': bad, [CAPS]: swResign(bad) }, 'check-capabilities.mjs', () => ({})),
      'מ41 · טיימר קצר שמרענן בעצמו **מפיל** את «הרענון מ-controllerchange בלבד»');
  }
  /*  ⭐ מוטציית-נגד: תקרה ארוכה יותר ⛔ אינה מפילה — ⚠️ המנגנון לא נגע,
   *  ⭐ ורק הערך קודם. */
  {
    const ok = rd('index.html').replace('var SW_APPLY_MS = 10000;', 'var SW_APPLY_MS = 15000;');
    t(!runGateOn({ 'index.html': ok, [CAPS]: swResign(ok) }, 'check-capabilities.mjs', () => ({})),
      'נ24 · ⭐ תקרת המתנה ארוכה יותר ⛔ **אינה** מפילה');
  }
  /*  ⛔⛔ מ42 — ליטרל צבע בכללי הבאנר (סבב 131): ⚠️ הטענה שנופלת היא
   *  «ערכת נושא — בהיר וכהה», ⭐ והנימוק המדוד הוא ארבעה באנרים שנראו
   *  זהים — ⛔ הליטרל מבטל את הזהות הפר-אפליקציה.
   *  ⛔ **והמוטציה נכתבת כתבנית ולא כשם אסימון** — ⚠️ שם האסימון נבדל
   *  בין הארבע, ⭐ והמנגנון אחד. */
  {
    const bad = rd('index.html').replace(/(#updater \.in\{\s*background:)var\(--[a-z0-9-]+\)/,
                                         '$1#1a1a1a');
    t(runGateOn({ 'index.html': bad, [CAPS]: caps }, 'check-capabilities.mjs', () => ({})),
      'מ42 · ליטרל צבע בכללי הבאנר **מפיל** את «ערכת נושא — בהיר וכהה»');
  }
  /*  ⭐ מוטציית-נגד: ערך שאינו צבע באותו כלל ⛔ אינו מפיל — ⚠️ המנגנון
   *  לא נגע, ⭐ ורק העיגול השתנה. */
  {
    const ok = rd('index.html').replace(/(#updater \.in\{[\s\S]{0,80}?border-radius:)14px/, '$112px');
    t(!runGateOn({ 'index.html': ok, [CAPS]: caps }, 'check-capabilities.mjs', () => ({})),
      'נ25 · ⭐ ערך שאינו צבע בכלל הבאנר ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ43 — נוסח אחר לחסימת כתיבת המשתמש (סבב 131): ⚠️ הטענה שנופלת
   *  היא «הודעת החסימה», ⭐ והנימוק המדוד הוא ששני ניסוחים לאותה חסימה
   *  הם שני מסלולים בעיני הקורא.
   *  ⛔ **והדילוג נושא נימוק** ⛔ ואינו שקט — ⚠️ אפליקציה בלי טבלת
   *  משתמשים אין לה מה למוטט כאן. */
  {
    const html = rd('index.html');
    if (html.indexOf('MSG_OFF_USER_WRITE') < 0) {
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
  /*  ⛔⛔ מ46 — מסך שינוי הסיסמה יורד (סבב 132): ⚠️ הטענה שנופלת היא «מסך
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
  /*  ⛔⛔ מ51 — שם פעולה שנבדל (סבב 133): ⚠️ **מה נכנס**: שתי הפעולות
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
  /*  ⛔⛔ מ52 — שומר בלי נפילת דיאלוג (סבב 133): ⚠️ הטענה שנופלת היא
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
  /*  ⛔⛔ מ48 · מ49 — כתובות CDN (סבב 133): ⚠️ **מה נכנס**: כתובת ה-CDN
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
                  'check-capabilities.mjs', () => ({})),
        'מ48 · כתובת בלי נתיב מלא **מפילה** את «ספרייה חיצונית — גרסה מוצהרת»');
      const verOne = full.replace(/@(\d+)\.(\d+)\.(\d+)\//,
        (m, a, b, c) => '@' + a + '.' + b + '.' + (Number(c) + 1) + '/');
      t(runGateOn({ 'sw.js': sw.split(full).join(verOne) },
                  'check-capabilities.mjs', () => ({})),
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
      t(!runGateOn(ok, 'check-capabilities.mjs', () => ({})),
        'נ29 · ⭐ קידום גרסה עקבי בשני הקבצים ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ59 · מ60 · מ61 — שלושת כיווני ההצלבה של `APP.cdnLibs` (סבב 136):
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
                  'check-capabilities.mjs', () => ({})),
        'מ59 · כתובת שאינה מוצהרת **מפילה** את «ספרייה חיצונית — גרסה מוצהרת»');
      /*  ⛔ מ60 · רשומה שנייה לאותה כתובת עם סמל שאיש אינו קורא —
       *  ⚠️ הכיוון הראשון עובר (לכל רשומה יש תג), ⭐ והשני נופל. */
      t(runGateOn({ 'tools/check-capabilities.mjs':
                      caps.replace("cdnLibs: [\n",
                        "cdnLibs: [\n    { url: '" + one[1] + "',\n      ver: '" + one[2] +
                        "', sym: 'ZzTest' },\n") },
                  'check-capabilities.mjs', () => ({})),
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
                    'check-capabilities.mjs', () => ({})),
          'מ61 · סמל שנקרא בלי ספרייה מוצהרת **מפיל** את «ספרייה חיצונית — גרסה מוצהרת»');
    }
  }
  /*  ⛔⛔ מ65 — מאזין רשת שאינו מוצהר (סבב 136): ⚠️ **מה נכנס**: כל
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
                  'check-capabilities.mjs', () => ({})),
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
                   'check-capabilities.mjs', () => ({})),
        'נ41 · ⭐ מאזין נוסף שמוצהר יחד איתו ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ64 — שמירה שיצאה מהצינור (סבב 136): ⚠️ **מה נכנס**: כל
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
                  'check-capabilities.mjs', () => ({})),
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
                   'check-capabilities.mjs', () => ({})),
        'נ40 · ⭐ שם שמירה שהוחלף בעקביות בשני הצדדים ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ66 — האופק שאין מי שינקה (סבב 136): ⚠️ **מה נכנס**: הקריאה
   *  ל-`lsHorizonRelease` מגוף המשיכה המלאה, ⛔ **ומה מפיל**: הסרתה —
   *  ⭐ הסימן שהפינוי משאיר אומר «את הישן זרקתי», ⚠️ וכל עוד הוא עומד
   *  המשיכה אינה מחזירה אותו: ⛔ והכפתור שניקה אותו ידנית ירד. */
  {
    const idx = rd('index.html');
    const hit = /\n(\s*)try \{ lsHorizonRelease\(\); \} catch \(e0\) \{ \}\n/.exec(idx);
    if (!hit) t(true, 'מ66 · ⭕ אין כאן קריאה לשחרור האופק — ⛔ ואין מה למוטט');
    else t(runGateOn({ 'index.html': idx.replace(hit[0], '\n') },
                     'check-capabilities.mjs', () => ({})),
           'מ66 · הסרת שחרור האופק מהמשיכה **מפילה** את «אסטרטגיית localStorage»');
  }
  /*  ⛔⛔ מ67 — שדה מצב שהוחזר (סבב 136): ⚠️ **מה נכנס**: אזור המצב
   *  שירד במלואו, ⛔ **ומה מפיל**: פונקציית מצב שהוחזרה לקוד בלי
   *  שורה בטבלה ובלי שער — ⭐ שבע פונקציות ושני מזהים ירדו יחד,
   *  ⚠️ ומי שמחזיר אחת מהן מחזיר חצי רכיב. */
  {
    const idx = rd('index.html');
    const at = idx.indexOf('window.lsHorizonRelease = lsHorizonRelease;');
    if (at < 0) t(true, 'מ67 · ⭕ אין כאן נקודת הזרקה — ⛔ ואין מה למוטט');
    else t(runGateOn({ 'index.html': idx.slice(0, at) +
             'function bkLastAt() { return 0; }\nwindow.bkLastAt = bkLastAt;\n' + idx.slice(at) },
                     'check-capabilities.mjs', () => ({})),
           'מ67 · פונקציית מצב שהוחזרה **מפילה** את «פונקציה בלי קוראים»');
  }
  /*  ⛔⛔ מ62 · מ63 — משפחת הרקע (סבב 136): ⚠️ **מה נכנס**: שלוש
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
                  'check-capabilities.mjs', () => ({})),
        'מ62 · רקע ריחוף מ-`--bg` **מפיל** את «ערכת נושא — בהיר וכהה»');
    /*  ⛔ הרמה השלישית יורדת מהערכה הבהירה בלבד — ⚠️ וכללי
     *  הריחוף נשארים במקומם: ⭐ זה בדיוק המצב שהטענה תופסת. */
    const dm = idx.search(/@media\s*\(prefers-color-scheme/);
    const j = idx.indexOf('--card-2:');
    if (j < 0 || (dm >= 0 && j > dm)) t(true, 'מ63 · ⭕ אין `--card-2` בערכה הבהירה — ⛔ ואין מה למוטט');
    else {
      const e = idx.indexOf(';', j) + 1;
      t(runGateOn({ 'index.html': idx.slice(0, j) + idx.slice(e) },
                  'check-capabilities.mjs', () => ({})),
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
      t(!runGateOn({ 'index.html': out }, 'check-capabilities.mjs', () => ({})),
        'נ39 · ⭐ גוון אחר לרמה השלישית בשתי הערכות ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ56 — דיו שאינו עומד ביחס במצב אחד (סבב 135): ⚠️ הטענה שנופלת היא
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
                  'check-capabilities.mjs', () => ({})),
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
                   'check-capabilities.mjs', () => ({})),
        'נ35 · ⭐ גוון דיו אחר שעומד ביחס ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ57 — השומר שבניתוב (סבב 135): ⚠️ הטענה שנופלת היא «פעולה מגיבה
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
      t(runGateOn({ 'index.html': bad, [CAPS]: bzResign(bad) }, 'check-capabilities.mjs', () => ({})),
        'מ57 · ניתוב שאינו עובר בשומר **מפיל** את «כפתור שכותב מושבת בזמן הכתיבה»');
      /*  ⭐ מוטציית-נגד: שינוי שם עקבי של דגל השומר ⛔ אינו מפיל — ⚠️ הנמדד
       *  הוא הצורה «דגל על האלמנט שיוצא מוקדם», ⛔ ולא השם. */
      const okS = idx.split('_actBusy').join('_actPending');
      t(!runGateOn({ 'index.html': okS, [CAPS]: bzResign(okS) }, 'check-capabilities.mjs', () => ({})),
        'נ36 · ⭐ שינוי שם עקבי של דגל השומר ⛔ **אינו** מפיל');
    }
  }
  /*  ⛔⛔ מ58 — פעולה מוצהרת שאינה מחזירה (סבב 135): ⚠️ הטענה שנופלת היא
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
      t(bad !== idx && runGateOn({ 'index.html': bad }, 'check-capabilities.mjs', () => ({})),
        'מ58 · פעולה מוצהרת שאינה מחזירה את ההבטחה **מפילה** את «כפתור שכותב מושבת בזמן הכתיבה»');
      /*  ⭐ מוטציית-נגד: שורת שמירה שנוספה לפני ה-`return` ⛔ אינה
       *  מפילה — ⚠️ הנמדד הוא ש**המטפל מחזיר**, ⛔ ולא מה קודם לכך:
       *  ⭐ ושם הפונקציה שהוא מחזיר יושב בבלוק חתום, ⛔ ואינו מקרה
       *  לשינוי שם. */
      const gm = new RegExp("('" + names[0] + "'\\s*:\\s*function\\s*\\(([^)]*)\\)\\s*\\{\\s*)return\\s").exec(idx);
      if (!gm) t(true, 'נ37 · ⭕ המטפל אינו נפתח ב-`return` — ⛔ ואין לאן להוסיף');
      else {
        const okS = idx.replace(gm[0], gm[1] + 'if (!' + (gm[2].trim() || 'el') + ') return null;\n    return ');
        t(okS !== idx && !runGateOn({ 'index.html': okS }, 'check-capabilities.mjs', () => ({})),
          'נ37 · ⭐ שומר שנוסף לפני ה-`return` ⛔ **אינו** מפיל');
      }
    }
  }
  /*  ⛔⛔ מ55 — סינון המטמון בקידומת האחסון (סבב 135): ⚠️ הטענה שנופלת היא
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
      t(runGateOn({ 'index.html': bad, [CAPS]: swResign(bad) }, 'check-capabilities.mjs', () => ({})),
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
      t(!runGateOn(ok2, 'check-capabilities.mjs', () => ({})),
        'נ34 · ⭐ קידומת מטמון אחרת בשני הקבצים ⛔ **אינה** מפילה');
    }
  }
  /*  ⛔⛔ מ54 — שומר כפול (סבב 134): ⚠️ הטענה שנופלת היא «שומר אחד לכל
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
  /*  ⛔⛔ מ53 — שם שירד חוזר לחיים (סבב 134): ⚠️ הטענה שנופלת היא «ערכת
   *  נושא — בהיר וכהה», ⭐ והנימוק המדוד הוא שאוצר מילים שנבדל מכריח כלל
   *  CSS פרטי — ⛔ וכלל משותף אינו יכול לנקוב בשם שקיים באחת בלבד. */
  {
    const idx = rd('index.html');
    if (idx.indexOf('--border') < 0) t(true, 'מ53 · ⭕ אין כאן `--border` — ⛔ ואין מה למוטט');
    else
      t(runGateOn({ 'index.html': idx.split('--border').join('--line') },
                  'check-capabilities.mjs', () => ({})),
        'מ53 · `--line` במקום `--border` **מפיל** את «ערכת נושא — בהיר וכהה»');
  }
  /*  ⭐ מוטציית-נגד: שינוי שם עקבי — האסימון והמרשם יחד ⛔ אינו מפיל:
   *  ⚠️ אוצר מילים אחד אינו «אותו שם לנצח», ⭐ והוא נמדד מול המרשם
   *  ⛔ ולא מול מחרוזת קפואה. */
  {
    const idx = rd('index.html'), caps = rd('tools/check-capabilities.mjs');
    if (idx.indexOf('--text2') < 0) t(true, 'נ32 · ⭕ אין כאן `--text2` — ⛔ ואין מה להחליף');
    else
      t(!runGateOn({ 'index.html': idx.split('--text2').join('--text-2'),
                     'tools/check-capabilities.mjs': caps.split("'--text2'").join("'--text-2'") },
                   'check-capabilities.mjs', () => ({})),
        'נ32 · ⭐ שינוי שם עקבי של אסימון הטקסט המשני ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ50 — צבע הזהות (סבב 133): ⚠️ **מה נכנס**: כלל `#updater .in`,
   *  ⛔ **ומה מפיל**: משטח הבאנר שנגזר מדיו הטקסט במקום מ-`--brand`:
   *  ⭐ ארבעה גווני טקסט הם אותו כהה, ⚠️ וארבעת הבאנרים נראו זהים. */
  {
    const idx = rd('index.html');
    const hit = /#updater \.in\{\s*background:var\(--brand\)/.exec(idx);
    if (!hit) t(true, 'מ50 · ⭕ אין כאן כלל `#updater .in` — ⛔ ואין מה למוטט');
    else
      t(runGateOn({ 'index.html': idx.replace('#updater .in{\n  background:var(--brand)',
                                              '#updater .in{\n  background:var(--text)') },
                  'check-capabilities.mjs', () => ({})),
        'מ50 · משטח הבאנר מדיו הטקסט **מפיל** את «ערכת נושא — בהיר וכהה»');
  }
  /*  ⭐ מוטציית-נגד: שינוי שם עקבי — האסימון, ההכרזה והכלל יחד ⛔ אינו
   *  מפיל: ⚠️ זה בדיוק השינוי החי שהתקן בא להתיר, ⭐ ושם אחד בארבעתן
   *  אינו «אותו שם לנצח». */
  {
    /*  ⛔ הצמד מוחלף **יחד** ⛔ ולא חצי ממנו (סבב 135) — ⚠️ המוסכמה
     *  `--on-X` היא מה שקושר בין השניים, ⭐ ושינוי חצי הוא ניתוק
     *  הצמד ⛔ ולא שינוי שם. */
    const idx = rd('index.html'), caps = rd('tools/check-capabilities.mjs');
    const ren = (s) => s.split('--on-brand').join('--on-ident')
                        .replace(/--brand(?![-A-Za-z0-9])/g, '--ident');
    if (idx.indexOf('--on-brand') < 0) t(true, 'נ30 · ⭕ אין כאן `--on-brand` — ⛔ ואין מה להחליף');
    else
      t(!runGateOn({ 'index.html': ren(idx), 'tools/check-capabilities.mjs': ren(caps) },
                   'check-capabilities.mjs', () => ({})),
        'נ30 · ⭐ שינוי שם עקבי של הצמד כולו ⛔ **אינו** מפיל');
  }
  /*  ⛔⛔ מ45 — סימן דחייה בזיכרון (סבב 132): ⚠️ הטענה שנופלת היא «סימן
   *  דחיית הבאנר מתמיד», ⭐ והנימוק המדוד הוא שהסימן מתאפס בטעינה —
   *  ⛔ ואז הבאנר חוזר בכל טעינה, בלי שדבר השתנה.
   *  ⛔ **והמוטציה נושאת איתה את החתימה** — ⚠️ הבלוק חתום. */
  {
    const bad = rd('index.html').replace(
      "if (v && v === lsGet(LS_CFG.dismissKey, '')) return;",
      'if (v && _swAccepted) return;');
    t(runGateOn({ 'index.html': bad, [CAPS]: swResign(bad) }, 'check-capabilities.mjs', () => ({})),
      'מ45 · סימן דחייה בזיכרון **מפיל** את «סימן דחיית הבאנר מתמיד»');
  }
  /*  ⭐ מוטציית-נגד: מפריד אחר במזהה הגרסה ⛔ אינו מפיל — ⚠️ המנגנון לא
   *  נגע, ⭐ והמזהה עדיין נגזר משמות המטמון החיים. */
  {
    const ok = rd('index.html').replace(".sort().join('|');", ".sort().join('#');");
    t(!runGateOn({ 'index.html': ok, [CAPS]: swResign(ok) }, 'check-capabilities.mjs', () => ({})),
      'נ27 · ⭐ מפריד אחר במזהה הגרסה ⛔ **אינו** מפיל');
  }
  /*  ⛔ מוטציה: זוג-רשומה שמעתיק את שדות הבסיס בלבד (סבב 99) — ⚠️ בדיוק
   *  המנוע שהוחלף: ⭐ הטענה שנופלת היא «מיזוג מכל».
   *  ⛔ **והזוג מוזרק ומוצהר** ⛔ ולא נחתך מהקיים — ⚠️ בשתיים מהארבע אין
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
    /*  ⛔ שתי שורות ושני probe (סבב 101) — ⚠️ «מיזוג מכל» מודדת את המבנה,
     *  ⭐ ו«רשימה אינה נושאת פריט כפול» את הכפילות: ⛔ מוטציה שמפילה את
     *  השנייה אינה אכיפה של הראשונה. */
    const dupNo = Number((/^\|\s*(\d+)\s*\|\s*רשימה אינה נושאת פריט כפול/m.exec(DOC) || [])[1]);
    const gaps = ((/gapRows: \[([^\]]*)\]/.exec(rd(CAP)) || [, ''])[1].match(/\d+/g) || []).map(Number);
    const skip = gaps.includes(rowNo), skipDup = gaps.includes(dupNo);
    if (skip) {
      t(true, `מ25 · ⭕ בשורה ${rowNo} — ה-probe אינו רץ כאן, ⛔ ואין מה למוטט`);
    } else {
      t(runGateOn({ [SRC]: inject(''), [CAP]: declare }, 'check-capabilities.mjs', () => ({})),
        'מ25 · זוג-רשומה שמעתיק את שדות הבסיס בלבד **מפיל** את «מיזוג מכל»');
    }
    /*  ⛔ מוטציה: כתיבה לרשימה שאינה בודקת קיום (סבב 100) — ⚠️ הטענה
     *  שנופלת היא «מיזוג מכל»: ⭐ פריט שנדחף פעמיים הוא פריט אחד על
     *  המסך, ⛔ ומחיקה אחת משאירה את השני.
     *  ⛔ **והאתר מוזרק ומוצהר** ⛔ ולא נחתך מהקיים — ⚠️ שמות הכתיבות
     *  נבדלים בין הארבע, ⭐ ומוטציה שנשענת על שם אחד לא הייתה רצה בשאר. */
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
                  'check-capabilities.mjs', () => ({})),
        'מ26 · כתיבה שאינה עוברת ב-`uniqHas` **מפילה** את «רשימה אינה נושאת פריט כפול»');
    }
    /*  ⛔ מוטציה: מיזוג שאינו מכווץ (סבב 100) — ⚠️ המכווץ המוצהר משרשר
     *  את שני הצדדים ⛔ ואין בו מפת ערכים שמכריעה: ⭐ פריט שקיים בשני
     *  הצדדים יוצא פעמיים. */
    if (skipDup) {
      t(true, `מ27 · ⭕ בשורה ${dupNo} — ה-probe אינו רץ כאן, ⛔ ואין מה למוטט`);
    } else {
      t(runGateOn({ [SRC]: inject(pairBody).replace(COLLAPSING, CONCAT), [CAP]: declare },
                  'check-capabilities.mjs', () => ({})),
        'מ27 · מכווץ מוצהר שאין בו מפת ערכים **מפיל** את «רשימה אינה נושאת פריט כפול»');
    }
    /*  ⛔ מוטציה: פריט שנכתב בלי חותמת (סבב 101) — ⚠️ הטענה שנופלת היא
     *  «מיזוג מכל»: ⭐ פריט בלי חותמת מפסיד לכל עריכה מתוארכת · ⛔ **והכתיבה
     *  עוברת ב-`uniqHas`** ⛔ כדי שהשורה השנייה תישאר נקייה — ⚠️ מוטציה
     *  שמפילה שתי שורות אינה מודדת אף אחת מהן. */
    if (skip) {
      t(true, `מ28 · ⭕ בשורה ${rowNo} — ה-probe אינו רץ כאן, ⛔ ואין מה למוטט`);
    } else {
      t(runGateOn({ [SRC]: inject(pairBody, addFn(GUARD)), [CAP]: declStamp(declare) },
                  'check-capabilities.mjs', () => ({})),
        'מ28 · פריט שנכתב בלי חותמת **מפיל** את «מיזוג מכל»');
    }

    /*  ⭐ מוטציית-נגד אחת לשלושתן: אותו עץ בדיוק — ⛔ שדה מערך שממוזג
     *  פר-פריט ונכתב לרשומה היוצאת, ⛔ מכווץ שמחזיק מפת ערכים,
     *  ⛔ ובלי כתיבה לרשימה שאינה בודקת קיום: ⚠️ שינוי חי שאסור לו
     *  להפיל. */
    t(!runGateOn({ [SRC]: inject(pairBody, addFn(GUARD, '  var zzStamp = Date.now();\n')),
                   [CAP]: declStamp(declare) }, 'check-capabilities.mjs', () => ({})),
      'נ16 · ⭐ אותו עץ עם מיזוג פר-פריט, מכווץ, בדיקת קיום וחותמת ⛔ **אינו** מפיל');
  }
}

/*  ⛔ מוטציה: קריאת רתמה שהוזזה מעל סוגר הריצה הפנימית (סבב 74ב) —
 *  ⚠️ זו התפיחה שנמדדה בפועל: 77 שניות במקום 7, ⛔ מפני שהרתמה רצה גם
 *  בכל ריצה פנימית — פעם לכל מוטציה. */
t(commentsFails({ 'tools/test_rulesdocs.mjs': rd('tools/test_rulesdocs.mjs')
    .replace('if (!INNER) {', 't(capsFails((d) => d), "x");\nif (!INNER) {') }),
  'מ19 · קריאת רתמה **מעל** הסוגר מפילה את check-comments');
/*  ⭐ מוטציית-נגד: אותה קריאה בדיוק **מתחת** לסוגר ⛔ אינה מפילה (סבב 74ב) —
 *  ⚠️ מה שנמדד הוא המיקום, ⛔ ולא קיומה של הרתמה: טענה שהייתה אוסרת רתמה
 *  הייתה אוסרת את המוטציות עצמן. */
t(!commentsFails({ 'tools/test_rulesdocs.mjs': rd('tools/test_rulesdocs.mjs')
    .replace('if (!INNER) {', 'if (!INNER) {\nt(capsFails((d) => d), "x");') }),
  'נ10 · ⭐ אותה קריאה **מתחת** לסוגר ⛔ אינה מפילה');

/*  ⛔ מוטציה: `every` בלי שומר גודל (סבב 72) — ⚠️ `[].every()` הוא `true`,
 *  ⛔ והטענה «עוברת» על אוסף שלא נבנה. */
t(commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs') + '\nconst _r72a = [1]; t(_r72a.every((x) => x > 0), "x");\n' }),
  'מ16 · `every` בלי שומר `.length` **מפיל** את check-comments');
/*  ⭐ מוטציית-נגד: אותה טענה עם שומר ⛔ אינה מפילה — ⚠️ הטענה מודדת
 *  את היעדר השומר, ⛔ ולא כל שימוש ב-`every`. */
t(!commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs') + '\nconst _r72a = [1]; t(_r72a.length > 0 && _r72a.every((x) => x > 0), "x");\n' }),
  'נ7 · ⭐ `every` עם שומר `.length` ⛔ **אינו** מפיל');
/*  ⛔ מוטציה: `catch {}` שבולע את איסוף השערים — ⚠️ הרשימה נשארת ריקה,
 *  ⛔ הלולאה אינה רצה, והשער מדפיס «עבר». */
t(commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs') + '\nlet _r72b = []; try { _r72b = fs.readdirSync("tools"); } catch (e) {}\nfor (const _x of _r72b) { void _x; }\n' }),
  'מ17 · `catch {}` שבולע איסוף **מפיל** את check-comments');
/*  ⭐ מוטציית-נגד: אותו איסוף עם כשל על אורך אפס ⛔ אינו מפיל — ⚠️ מה
 *  שנמדד הוא הבליעה השקטה, ⛔ ולא ה-`catch` עצמו. */
t(!commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs') + '\nlet _r72b = []; try { _r72b = fs.readdirSync("tools"); } catch (e) {}\nif (!_r72b.length) throw new Error("ריק");\nfor (const _x of _r72b) { void _x; }\n' }),
  'נ8 · ⭐ איסוף שנבדק על אורך אפס ⛔ **אינו** מפיל');

/*  ⛔ מוטציה על שדה שאינו קיים (סבב 72) — ⚠️ בדיוק הכשל שנמדד: הטענה
 *  משווה מול `APP` שאין בו את השדה, ⛔ והתנאי הוא `undefined`. */
t(commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs') + '\nif (APP.noSuchField) { /* x */ }\n' }),
  'מ15 · השוואה מול שדה שאינו מוגדר ב-APP **מפילה** את check-comments');
/*  ⭐ מוטציית-נגד: שדה שמוצהר ריק ⛔ אינו מפיל — ⚠️ זו כל ההבחנה בין
 *  «לא נשאל» ל«נמדד ואין», ⛔ ובלעדיה הטענה הייתה אוסרת הצהרה ריקה. */
t(!commentsFails({ 'tools/test_bump.mjs':
    rd('tools/test_bump.mjs').replace('const APP = {', 'const APP = {\n  emptyOnPurpose: null,')
    + '\nif (APP.emptyOnPurpose) { /* x */ }\n' }),
  'נ6 · ⭐ שדה שמוצהר ריק ⛔ **אינו** מפיל');

/*  ⛔ מוטציה על ה-probe עצמו (סבב 72) — ⚠️ `\b` צמוד לאות עברית הוא
 *  ביטוי שלעולם אינו תואם, ⛔ ולכן השער שנשען עליו «עובר» תמיד:
 *  ⭐ הטענה שנופלת כאן היא «תווית מוטציה מודפסת», ⛔ ולא בדיקת צורה. */
/*  ⚠️ התבנית מורכבת בזמן ריצה (סבב 72) — ⛔ כתיבתה כמחרוזת אחת הייתה
 *  מפילה את השער על הקובץ הזה עצמו, ⭐ בדיוק כמו תבנית ההפניה שמעליה. */
const DEAD = '/' + '\\' + 'b';
t(commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs') + `\nconst _r72 = ${DEAD}גרסה/;\n` }),
  'מ14 · `\\b` צמוד לאות עברית **מפיל** את check-comments');
/*  ⭐ מוטציית-נגד: אותו `\b` לפני אות לטינית ⛔ אינו מפיל — ⚠️ שם הוא
 *  גבול-מילה אמיתי, ⛔ והטענה מודדת ביטוי מת ולא כל שימוש ב-`\b`. */
t(!commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs') + `\nconst _r72 = ${DEAD}versionCode/;\n` }),
  'נ5 · ⭐ `\\b` לפני אות לטינית ⛔ **אינו** מפיל');
/*  ⛔⛔ ספירה שנמדדה בכלי חיצוני (סבב 95) — ⚠️ «נמדד ב-<כלי>» ורשימת
 *  מספרים אחריו: ⭐ הכלי אינו רץ בשער, ⛔ ולכן איש אינו מודד את
 *  המספרים שוב והם נסחפים בשקט. ⚠️ **ושני הצדדים נמדדים** — ⛔ הערת
 *  הקוד ועמודת ההערות בטבלה כאחת. */
/*  ⛔ קריאת רתמה אחת לדפוס ⛔ ולא שתיים (סבב 95ב) — ⚠️ `hit` היא
 *  פונקציה אחת ששתי הלולאות קוראות לה, ⭐ ולכן מוטציה בצד אחד מוכיחה
 *  את הדפוס בשניהם: ⛔ ומה שמוכיח שלולאת הקוד חיה הוא המוטציות
 *  שמעליה, ⚠️ שכולן מזריקות הערת קוד. ⭐ והצד שנוסף כאן הוא הטבלה,
 *  ⛔ ולכן הוא זה שמקבל את קריאת הרתמה — ⚠️ כל קריאה היא תהליך
 *  `node` נוסף, ⛔ והסט של ההנהלה צמוד לתקרה. */
const TOOLCNT = 'נמדד ב-`strace`: `x` 5 · `y` 3 — הסיבה';
/*  ⛔ השורה נגזרת ⛔ ואינה מוקלדת (סבב 96) — ⚠️ מספר קשיח נסחף בכל
 *  מספור מחדש, ⭐ ו-`okRow` מחזירה שורה ✅✅✅✅ שהערתה ריקה: ⛔ בדיוק
 *  התא שהמוטציה צריכה למלא. */
const noteRow = okRow(DOC)[0];
t(commentsFails({ 'CLAUDE.md': DOC.replace(noteRow, noteRow.replace(/\|$/, ` ⚠️ ${TOOLCNT} |`)) }),
  'מ20 · ספירה שנמדדה בכלי חיצוני בעמודת ההערות של **הטבלה** **מפילה**');
/*  ⭐ מוטציית-נגד: מדידה שהשער כן מריץ ⛔ אינה מפילה — ⚠️ «מול המסד»
 *  ו«בדפדפן» חוזרות בכל הרצה, ⭐ ואין להן שם כלי בגרשיים אחוריים. */
t(!commentsFails({ 'CLAUDE.md': DOC.replace(noteRow, noteRow.replace(/\|$/, ' ⚠️ **נמדד** מול המסד: 8 · 8 שורות, ובדפדפן 3 · 3 |')) }),
  'נ11 · ⭐ מדידה חוזרת שהשער מריץ ⛔ **אינה** מפילה');
/*  ⛔⛔ פתיחת ההערה (סבב 96) — ⚠️ שלוש פתיחות בלבד: «הבדל מכוון» ·
 *  «אינו ניתן לאכיפה» · «נמדד». ⭐ המוטציה מחליפה את הפתיחה של הערה
 *  קיימת בניסוח חופשי, ⛔ ו-`check-comments` מפיל עליה. */
const openRow = DOC.split('\n').find((l) => /^\|\s*\d+\s*\|/.test(l) &&
  /^[\s*⛔⚠️⭐️\uFE0F]*נמדד/.test((l.split('|')[8] || '').trim()));
t(!!openRow, 'מ21 · נמצאה שורה שהערתה נפתחת ב«נמדד» למוטציה');
t(commentsFails({ 'CLAUDE.md': DOC.replace(openRow,
    openRow.replace(/\|([^|]*)\|$/, (m, note) => '| כאן יושבת הסיבה ' + note.replace(/^[\s*⛔⚠️⭐️\uFE0F]*נמדד/, '') + '|')) }),
  'מ21 · הערה שנפתחת בניסוח חופשי **מפילה** את check-comments');
/*  ⭐ מוטציית-נגד: אותה הערה בפתיחה תקפה אחרת ⛔ אינה מפילה — ⚠️ הטענה
 *  מודדת **פתיחה מתוך שלוש**, ⛔ ולא מחרוזת אחת. */
t(!commentsFails({ 'CLAUDE.md': DOC.replace(openRow,
    openRow.replace(/\|([^|]*)\|$/, '| ⛔ **הבדל מכוון**: אותה שורה, פתיחה תקפה אחרת |')) }),
  'נ12 · ⭐ פתיחה תקפה אחרת ⛔ **אינה** מפילה');
/*  ⛔⛔ הפתיחה מודגשת (סבב 109) — ⚠️ שלוש הפתיחות חיו בשתי צורות,
 *  מודגשת ולא: ⭐ המוטציה מסירה את ההדגשה ומשאירה פתיחה תקפה,
 *  ⛔ והטענה הראשונה עוברת — ⚠️ וזו בדיוק הסיבה שלשנייה צריכה להיות. */
t(commentsFails({ 'CLAUDE.md': DOC.replace(openRow,
    openRow.replace(/\|([^|]*)\|$/, (m, note) => '|' + note.replace(/\*\*/g, '') + '|')) }),
  'מ30 · פתיחה תקפה שאינה מודגשת **מפילה** את check-comments');
/*  ⭐ מוטציית-נגד: הדגשה נוספת בגוף ההערה ⛔ אינה מפילה — ⚠️ הנמדד
 *  הוא **הפתיחה** ⛔ ולא כל כוכבית בעמודה. */
t(!commentsFails({ 'CLAUDE.md': DOC.replace(openRow,
    openRow.replace(/\|([^|]*)\|$/, '| ⚠️ **נמדד**: אותה שורה, **והדגשה נוספת בגוף** |')) }),
  'נ18 · ⭐ הדגשה נוספת בגוף ההערה ⛔ **אינה** מפילה');
/*  ⛔⛔ מ29 — ספירה פר-אפליקציה בלי הצהרה שהשער קורא מפילה את ב4
 *  (סבב 105): ⚠️ מפקד נגזר מהמוצר וישתנה איתו, ⛔ ומי שיוסיף שדה או
 *  טבלה לא יחזור לעדכן את ההערה — ⭐ והמספר יוסיף להיקרא כעדות. */
t(commentsFails({ 'CLAUDE.md': DOC.replace(noteRow,
    noteRow.replace(/\|$/, ' ⚠️ **נמדד**: ומעליהם 1 · 2 · 3 · 4 אתרים |')) }),
  'מ29 · מפקד פר-אפליקציה בהערת הטבלה **מפיל** את «ספירה פר-אפליקציה»');
/*  ⭐ מוטציית-נגד: אותה ספירה שנוקבת בשם מוצהר שהשער קורא ⛔ אינה
 *  מפילה — ⚠️ ערך תצורה שהשער משווה מולו נופל ברעש ברגע שהוא נסחף,
 *  ⛔ ולכן אינו מפקד. */
t(!commentsFails({ 'CLAUDE.md': DOC.replace(noteRow,
    noteRow.replace(/\|$/, ' ⚠️ **נמדד**: ומעליהם 1 · 2 · 3 · 4 מוצהרים ב-`--toast-bottom` |')) }),
  'נ17 · ⭐ ספירה שנוקבת בהצהרה שהשער קורא ⛔ **אינה** מפילה');
  /*  ⛔ מ2 — כותרת פרטית שאינה מסכים/פער/סבב מפילה את ב1. */
  t(fails({ 'CLAUDE.md': DOC + '\n## צעדי התקנת המסד\nגוף תפעולי.\n' }),
    'מ2 · כותרת תפעולית בחלק הפרטי **מפילה**');
  /*  ⛔ מ3 — עותק של הטבלה בקובץ נלווה מפיל את ב2. ⚠️ המוטציה כוונה
   *  מחדש בסבב 97: ⭐ עד כה היא הבריחה **פרק כללים**, ⛔ ומאז שהכללים
   *  ירדו היא נכשלה על טענה שאינה קיימת. */
  t(fails({ 'README.md': rd('README.md') + '\n<!-- SHARED:start id="table" -->\nגוף.\n' }),
    'מ3 · עותק של הטבלה ב-`README.md` **מפיל**');
  /*  ⛔⛔ מ31 — מזהה `id` שאין לו קורא (סבב 110): ⚠️ עד כאן נמדדו המחלקות
   *  בלבד, ⭐ ומזהה ששמו שונה או שקוראו נמחק נשאר בתגית בלי שאיש יידע.
   *  ⛔ ההזרקה לפני הסוגר **האחרון** — ⚠️ `'</body>'` בתוך מחרוזת JS אינו
   *  תג, ⭐ והזרקה לפני הראשון הייתה נוחתת בתוך קוד. */
  const withOrphan = (extra) => {
    const h = rd('index.html'), i = h.lastIndexOf('</body>');
    return h.slice(0, i) + '<div id="zz-no-reader"></div>' + extra + h.slice(i);
  };
  t(fails({ 'index.html': withOrphan('') }),
    'מ31 · מזהה id בלי קורא **מפיל** את «סלקטור בלי קורא»');
  /*  ⭐ מוטציית-נגד: אותו מזהה עם קורא חי ⛔ אינו מפיל — ⚠️ הנמדד הוא
   *  **הקורא** ⛔ ולא עצם קיומו של מזהה חדש. */
  t(!fails({ 'index.html': withOrphan(
      '<script>document.getElementById(\'zz-no-reader\');</script>') }),
    'נ19 · ⭐ מזהה שיש לו קורא ⛔ **אינו** מפיל');
  /*  ⛔ מ4 — הפניה שהוחזרה לקוד מפילה את ג1. */
  t(fails({ 'sw.js': "/* ר' «אזור מצב» ב-CLAUDE.md */\n" + rd('sw.js') }),
    'מ4 · הפניה לקובץ בהערה **מפילה**');

  /*  ⭐ מוטציות-נגד — ⛔ שינוי אמיתי שחייב **לעבור**. */
  t(!fails({ 'CLAUDE.md': DOC + '\n## סבב 99 (2099-01-01) — פרק סבב נוסף\nגוף.\n' }),
    'נ1 · ⭐ כותרת פרק סבב ⛔ **אינה** מפילה — היא מותרת בהגדרה');
  t(!fails({ 'sw.js': "/* ⚠️ `CLAUDE.md` הוא שם קובץ ולא הפניה. */\n" + rd('sw.js') }),
    'נ2 · ⭐ אזכור שם הקובץ בלי «ר׳ … ב-» ⛔ **אינו** מפיל');

  /*  ⛔ מ22 — הפניה למספר כלל שהוחזרה **לבאנר של שער** מפילה את ג2:
   *  ⚠️ זה ההיקף שנוסף בסבב 96ג, ⛔ ומוטציה על `sw.js` לבדו לא הייתה
   *  מודדת אותו. */
  const GATE = 'tools/check-structure.mjs';
  t(fails({ [GATE]: rd(GATE).replace(' *\n', ' *  ⚠️ הרכיב נאכף כאן (כלל ברזל 5).\n *\n') }),
    'מ22 · «כלל ברזל N» בבאנר של שער **מפילה** את «אין הפניה למספר כלל»');
  /*  ⭐ מוטציית-נגד: חותמת הסבב ⛔ אינה מפילה — ⚠️ היא אומרת **מתי**
   *  נכתב הדבר, ⛔ ואינה שולחת את הקורא לחפש טקסט שאינו קיים. */
  t(!fails({ [GATE]: rd(GATE).replace(' *\n', ' *  ⚠️ הרכיב נאכף כאן (נרשם בסבב 27).\n *\n') }),
    'נ13 · ⭐ «נרשם בסבב N» באותו מקום ⛔ **אינו** מפיל');

  /*  ⛔ מ23 — הערה שנוקבת בתוכן המבנה שמתחתיה מפילה את ב3 (סבב 97ג):
   *  ⚠️ «ריקה בארבעת הריפו» נכונה עד הפריט הראשון שייכנס, ⛔ ואיש אינו
   *  חוזר לתקן אותה. */
  t(commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs')
      + '\n/*  ⚠️ נמדד: ריקה בארבעת הריפו. */\nconst _r97c = [];\nvoid _r97c;\n' }),
    'מ23 · הערה שנוקבת בתוכן המבנה **מפילה** את «הערה מעל מבנה נתונים»');
  /*  ⭐ מוטציית-נגד: אותה מילה בתוך **כלל** ⛔ אינה מפילה — ⚠️ «רשימה
   *  ריקה מפילה» אומרת מה קורה, ⛔ ואינה מתארת את מה שיש. */
  t(!commentsFails({ 'tools/test_bump.mjs': rd('tools/test_bump.mjs')
      + '\n/*  ⛔ רשימה ריקה מפילה — ⚠️ מדידה על אוסף ריק מדווחת «עבר». */\nconst _r97c = [];\nvoid _r97c;\n' }),
    'נ14 · ⭐ «רשימה ריקה מפילה» ⛔ **אינה** מפילה — היא כלל ולא תיאור');


/*  ⛔ המוטציה כותבת הפניה למספר שורה (סבב 72) — ⚠️ בדיוק הצורה שנמחקה
 *  מ-113 מקומות, ⭐ והטענה שנופלת היא «אין הפניה». */
t(fails({ 'sw.js': rd('sw.js') + '\n// ⚠️ הרישום התואם יושב במטריצה, שורה 41.\n' }),
  'מ13 · הפניה למספר שורה בטבלה **מפילה** את «אין הפניה»');
/*  ⭐ מוטציית-נגד: הודעת ריצה שמרכיבה את המספר ⛔ אינה מפילה — ⚠️ היא
 *  מדפיסה את מה שנמדד עכשיו, ⛔ ואינה שולחת את הקורא לחפש שורה. */
t(!fails({ 'sw.js': rd('sw.js') + '\nconst _r72 = (n) => `שורה ${n} נמדדה`;\n' }),
  'נ4 · ⭐ `שורה ${n}` בהודעת ריצה ⛔ **אינה** מפילה');

  /*  ⛔ ד — קובץ תיעוד אינו מסביר כלל שהטבלה אוכפת (סבב 72). */
  const androidMd = rd('android/README.md');
  t(commentsFails({ 'android/README.md': androidMd + '\n## סוג המעטפת\nגוף.\n' }),
    'מ12 · פרק שכותרתו חופפת לשורה בטבלה **מפיל** את check-comments');
  t(!commentsFails({ 'android/README.md': androidMd + '\n## בנייה מקומית מהירה\nגוף.\n' }),
    'נ3 · ⭐ פרק שכותרתו הוראה מעשית ⛔ **אינו** מפיל');

  /*  ── מוטציות כללי הברזל 21–24 ───────────────────────────────────────── */
  const atTop = (add) => { const l = DOC_LINES.slice(); l.splice(4, 0, add); return l.join('\n'); };
  const inRound = (add) => {
    const idx = DOC_LINES.map((l, i) => (/^##\s+(⭐\s*)?סבב\s/.test(l) ? i : -1))
                         .filter((i) => i >= 0).pop();
    const l = DOC_LINES.slice(); l.splice(idx + 1, 0, add); return l.join('\n');
  };
  const CSS = (add) => rd('index.html').replace('</style>', add + '\n</style>');

  t(fails({ 'CLAUDE.md': atTop('`CACHE_NAME` הנוכחי: `' + APP.cachePrefix + "v99`.") }),
    'מ1 · הצהרת גרסה בפרק פעיל מפילה את 21א');
  t(fails({ 'CLAUDE.md': atTop('פרק זה זהה מילה במילה בארבעת קבצי ה-CLAUDE.md.') }),
    'מ3 · החזרת הצהרת «זהה בארבעתן» מפילה את 21ד');
  t(fails({ 'CLAUDE.md': atTop('## ⭐ מודול מזהי רשומות — הפרוזה שחזרה') }),
    'מ4 · פרק פרוזה למודול משותף מפיל את 22א');
  t(fails({ 'CLAUDE.md': atTop('| ידית | yoman | hanhala | schar | gius |') }),
    'מ5 · טבלת ידיות פר-אפליקציה מפילה את 22ג');
  t(fails({ 'CLAUDE.md': atTop('### הבעיה שנמדדה\nא\nב\nג\nד') }),
    'מ6 · «הבעיה שנמדדה» בת ארבע שורות מפילה את 22ד');
  t(fails({ 'CLAUDE.md': atTop('`apksigner sign --ks signing/key.keystore`') }),
    'מ7 · פקודת חתימה ב-CLAUDE.md מפילה את 23א');
  t(fails({ 'CONTEXT.md': rd('CONTEXT.md') + '\n## פרק תפעולי שחזר\n' }),
    'מ8 · כותרת נוספת ב-CONTEXT.md מפילה את 23ב');
  t(fails({ 'tools/check-comments.mjs': rd('tools/check-comments.mjs').replace("add('sw.js')", "add('x.js')") }),
    'מ9 · צמצום תחולת תקן ההערות מפיל את 24ב');
  t(fails({ 'index.html': CSS('.r65-dead-class{color:red}') }),
    'מ10 · מחלקת CSS שאינה מוחלת מפילה את טענה 15');

  t(fails({ 'index.html': rd('index.html').replace(
      '— מודול משותף (סבב 11)', "— מודול משותף (סבב 11). ר' CLAUDE.md") }),
    'מ11 · החזרת הפניה לקובץ בנקודת כניסה מפילה את 24א');

  /*  ⭐ מוטציות-נגד — ⛔ שינוי שחייב **לעבור**. */
  t(!fails({ 'CLAUDE.md': inRound('`CACHE_NAME` קודם ל-`' + APP.cachePrefix + "v99`.") }),
    'נ1 · ⭐ אותה הצהרה **בתוך פרק סבב** אינה מפילה — הפרק הוא היסטוריה');
  t(!fails({ 'index.html': CSS('.r65-live-class{color:red}')
                             .replace('</body>', '<i class="r65-live-class"></i></body>') }),
    'נ2 · ⭐ מחלקה שכן מוחלת אינה מפילה — המדידה היא שימוש ולא ספירה');
}

/* ── מה אינו נאכף — ⛔ ונרשם כאן במפורש (סבב 65) ─────────────────────────────
   ⚠️ שער שמובן לא נכון גרוע משער שאינו קיים, ולכן ארבעת אלה נרשמים:
     · **ממצא 16 — מספר במקום שם קבוע.** ⛔ אינו ניתן לאכיפה: «12 רשומות»
       בהערה יכול להיות קבוע שקיים ויכול להיות מדידה חד-פעמית, וההבחנה
       היא קריאת משמעות. סריקה גורפת הייתה מפילה כל תאריך ומספר סבב.
     · **ממצא 17 — שפת ההערות.** ⛔ הכרעת שפה היא של המנהל ולא של שער;
       הספירה נרשמת בפרק הסבב (135 · 23 · 2 · 27 שורות לטיניות).
     · **ממצא 14 — הערה שמפנה לסמל שאינו קיים.** ⚠️ ניתן לאכיפה **חלקית**
       בלבד: מזהה בגרשיים אחוריים יכול להיות שם עמודה במסד, שם קובץ או
       מונח — ⛔ ורשימת-היתר שהייתה נדרשת לזה גדולה מהתועלת.
     · **«נימוק שראוי לעלות לתיעוד».** ⛔ שיקול דעת, ואין מה למדוד.
   ══════════════════════════════════════════════════════════════════════ */

}

console.log(fail ? `\n✗ סבב 72 (כללים ותוכן הקבצים) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 72 (כללים, תוכן הקבצים וכללי הברזל 21–24) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
