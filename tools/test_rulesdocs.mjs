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

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',  cachePrefix: 'schar-limud-',
  /*  מחלקות CSS שמורכבות בזמן ריצה (`'role-' + role`) — ⛔ הן נראות מתות
   *  לסורק סטטי, והן חיות. ⚠️ כל שורה כאן היא הצהרה שאדם מתחזק. */
  dynamicClasses: [],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [11, 15, 32, 66, 68];

/*  ⛔ שורש נדרס בסביבת מוטציה (סבב 65) — ⚠️ המוטציות רצות על עותק
 *  בתיקייה זמנית ולא על העץ, והדרך היחידה להריץ את השער **האמיתי**
 *  עליו היא להצביע אותו לשם. ⛔ והדגל הזה הוא גם סימן הריצה הפנימית:
 *  ⚠️ בלעדיו כל מוטציה הייתה מריצה בעותק את רתמת המוטציות שלה.
 *  ⛔ אין שני דגלים לאותו מצב (סבב 72) — שניים היו נופלים לרקורסיה. */
const ROOT = process.env.RULESDOCS_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INNER = !!process.env.RULESDOCS_ROOT;
let pass = 0, fail = 0;
const t = (c, m) => { if (c) { pass++; console.log('  ok   ' + m); }
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
  const ids = [];
  const heads = [];
  let inb = false;
  for (let i = 0; i < ls.length; i++) {
    if (inF[i]) continue;
    const m = /^<!--\s*SHARED:start\s+id="([^"]*)"/.exec(ls[i]);
    if (m) { ids.push(m[1]); inb = true; continue; }
    if (/^<!--\s*SHARED:end/.test(ls[i])) { inb = false; continue; }
    if (!inb && ls[i].startsWith('## ')) heads.push(ls[i]);
  }
  return { ids, heads };
}

/* ── א. ארבעה בלוקי כללים בדיוק ────────────────────────────────────────── */
const WANT = ['rules-session', 'rules-writing', 'rules-table', 'rules-enforce'];
{
  const { ids } = analyze(DOC);
  t(ids.length === 4, `א1 · ארבעה בלוקי SHARED בדיוק (נמצאו ${ids.length})`);
  t(WANT.every((w, i) => ids[i] === w),
    'א2 · והם `rules-session` · `rules-writing` · `rules-table` · `rules-enforce`, בסדר הזה');
}

/* ── ב. תוכן הקבצים לפי תפקידם ─────────────────────────────────────────── */
{
  const { heads } = analyze(DOC);
  const bad = heads.filter((h) => !PRIVATE_H2.some((re) => re.test(h)));
  t(bad.length === 0,
    `ב1 · כל כותרת בחלק הפרטי היא מסכים, פער או פרק סבב${bad.length ? ' — ' + bad.join(' · ') : ''}`);
  /*  ⛔ ושלושת הקבצים הנלווים אינם מחזיקים כללים (סבב 69) — ⚠️ כלל
   *  שמופיע בשניהם הוא מקור אמת שני, וזה בדיוק מה שנסחף. */
  for (const f of ['README.md', 'CONTEXT.md', 'android/README.md']) {
    const s = rd(f);
    t(!/^##\s+⭐?\s*כלל ברזל/m.test(s) && !/<!--\s*SHARED:start\s+id="rules-/.test(s),
      `ב2 · ${f} אינו מחזיק פרק כללים`);
  }
}

/* ── ג. הערה אינה מפנה לקובץ ───────────────────────────────────────────── */
/*  ⛔ אין לתפוס אזכור סתם (סבב 69) — התבנית היא **הפניה**: «ר'/ראה …
 *  ב-<קובץ>». ⚠️ שער שקורא קובץ רשאי לנקוב בשמו, ⛔ ולכן
 *  `APP.docs = 'CLAUDE.md'` אינו נתפס. */
const REF_RE = /(?:ר'|ר׳|ראה|עיין)[^\n]{0,60}ב-?[«"'`]?(?:CLAUDE\.md|CONTEXT\.md|README\.md)/;
function refHits(text) {
  return text.split('\n').filter((l) => REF_RE.test(l));
}
{
  const files = ['index.html', 'sw.js'];
  /*  ⛔ אין לסרוק את הקובץ הזה עצמו (סבב 69) — ⚠️ הוא מחזיק את התבנית
   *  שהוא אוכף, גם בבאנר וגם במחרוזת המוטציה, ⛔ ולכן היה נופל על עצמו. */
  for (const f of fs.readdirSync(path.join(ROOT, 'tools'))) {
    if (f.endsWith('.mjs') && f !== 'test_rulesdocs.mjs') files.push('tools/' + f);
  }
  const hits = [];
  for (const f of files) {
    for (const l of refHits(rd(f))) hits.push(`${f}: ${l.trim().slice(0, 60)}`);
  }
  t(hits.length === 0,
    `ג1 · אין הפניה לקובץ בקוד ובשערים${hits.length ? ' — ' + hits.slice(0, 3).join(' · ') : ''}`);
}

/* ══ כללי הברזל 21–24 (סבב 72: מוזג לכאן) ════════════════════════════════ */
const DOC_LINES = DOC.split('\n');

/*  ⚠️ פרק סבב הוא **היסטוריה** ולא הוראה, ולכן הוא מוחרג מרוב הסעיפים:
 *  שורה כמו «`CACHE_NAME` קודם ל-v45» היא תיאור של מה שנעשה אז, והיא
 *  יורדת מאליה בחלון שני הסבבים (כלל ברזל 18). ⛔ מה שאסור הוא הצהרה
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
  const VER = new RegExp(APP.cachePrefix.replace(/[-]/g, '\\-') + 'v\\d+');
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
  t(!/###\s*תיאום גרסאות/.test(DOC), '21ג · ⛔ טבלת «תיאום גרסאות» אינה חוזרת');
}

/* ── שורה 32 — עמודת «מה זה» היא הוראה ─────────────────────────────────── */
/*  ⛔ הכלל מוצהר בבלוק המשותף ⛔ ולא בפרק פרטי (סבב 71) — ⚠️ הוראה
 *  שיושבת באחת מארבע היא הוראה שלוש אינן מכירות. ⛔ והטענה מודדת **ערך**:
 *  שהסעיף יושב בתוך `rules-table` ⛔ ולא איפה שהוא בקובץ — הבלוק הוא מה
 *  שהחתימה אוכפת, ⛔ וסעיף מחוצה לו אינו זהה בין הריפו. */
{
  const b = /<!--\s*SHARED:start\s+id="rules-table"\s*-->([\s\S]*?)<!--\s*SHARED:end\s*-->/.exec(DOC);
  const body = b ? b[1] : '';
  t(/^###\s+⛔⛔\s+עמודת «מה זה» היא הוראה מחייבת\s*$/m.test(body),
    '31א · סעיף «עמודת «מה זה» היא הוראה מחייבת» יושב בתוך `rules-table`');
  t(/עמודת «מה זה» היא הוראה מחייבת, ⛔ ולא תיאור/.test(body) &&
    /ואין לכתוב דבר שסותר שורה קיימת/.test(body),
    '31ב · ⛔ והוא אוסר במפורש לכתוב דבר שסותר שורה קיימת');
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
  t(/\|\s*\d+\s*\|\s*`pend`/.test(DOC) && /\|\s*\d+\s*\|\s*`status`/.test(DOC),
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

/* ── מחלקות CSS מתות (ממצא 15) ─────────────────────────────────────────── */
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

/* ── המוטציות — על עותק בתיקייה זמנית ──────────────────────────────────── */
function runOn(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rulesdocs-'));
  execFileSync('cp', ['-r', ROOT + '/.', dir]);
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  const r = execFileSync('node', [path.join(dir, 'tools', 'test_rulesdocs.mjs')],
    { cwd: dir, encoding: 'utf8', stdio: 'pipe' , env: { ...process.env, RULESDOCS_ROOT: dir } });
  fs.rmSync(dir, { recursive: true, force: true });
  return r;
}
function fails(files) {
  try { runOn(files); return false; } catch { return true; }
}

if (!INNER) {
  /*  ⛔ מ1 — בלוק חמישי מפיל את א1. */
  t(fails({ 'CLAUDE.md': DOC + '\n<!-- SHARED:start id="rules-extra" -->\nגוף.\n<!-- SHARED:end -->\n' }),
    'מ1 · בלוק כללים חמישי **מפיל**');
  /*  ⛔ מ2 — כותרת פרטית שאינה מסכים/פער/סבב מפילה את ב1. */
  t(fails({ 'CLAUDE.md': DOC + '\n## צעדי התקנת המסד\nגוף תפעולי.\n' }),
    'מ2 · כותרת תפעולית בחלק הפרטי **מפילה**');
  /*  ⛔ מ3 — פרק כללים בקובץ נלווה מפיל את ב2. */
  t(fails({ 'README.md': rd('README.md') + '\n## ⭐ כלל ברזל 99 — כלל שהוברח לכאן\nגוף.\n' }),
    'מ3 · פרק כללים ב-`README.md` **מפיל**');
  /*  ⛔ מ4 — הפניה שהוחזרה לקוד מפילה את ג1. */
  t(fails({ 'sw.js': "/* ר' «אזור מצב» ב-CLAUDE.md */\n" + rd('sw.js') }),
    'מ4 · הפניה לקובץ בהערה **מפילה**');

  /*  ⭐ מוטציות-נגד — ⛔ שינוי אמיתי שחייב **לעבור**. */
  t(!fails({ 'CLAUDE.md': DOC + '\n## סבב 99 (2099-01-01) — פרק סבב נוסף\nגוף.\n' }),
    'נ1 · ⭐ כותרת פרק סבב ⛔ **אינה** מפילה — היא מותרת בהגדרה');
  t(!fails({ 'sw.js': "/* ⚠️ `CLAUDE.md` הוא שם קובץ ולא הפניה. */\n" + rd('sw.js') }),
    'נ2 · ⭐ אזכור שם הקובץ בלי «ר׳ … ב-» ⛔ **אינו** מפיל');

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
  t(fails({ 'CLAUDE.md': atTop('### תיאום גרסאות') }),
    'מ2 · החזרת טבלת «תיאום גרסאות» מפילה את 21ג');
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

console.log(fail ? `\n✗ סבב 72 (כללים ותוכן הקבצים) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 72 (כללים, תוכן הקבצים וכללי הברזל 21–24) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
