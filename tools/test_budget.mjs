#!/usr/bin/env node
/* test_budget.mjs — תקציב התיעוד.
 *
 * **מה נאכף:** ארבעה תנאים, ⛔ וכל אחד מהם מפיל בנפרד: **חלון של שני
 * פרקי סבבים** · **תקרת שורות לקובץ** · **תקרה על החלק המשותף** ·
 * ו**תקרה על החלק הפרטי**. ⛔ הבדיקה מריצה את בודק התיעוד **האמיתי** על
 * עותק מוטב, ⛔ ודורשת שלא ייפול על כותרת שאינה פרק סבב.
 *
 * **הנימוק המדוד:** תשעה סשנים נחנקו בשבוע אחד, ⛔ ונמדד ש-`CLAUDE.md`
 * תפח מ-1,782 שורות ל-4,447 — ⚠️ מפני שכל סבב מוסיף פרק ⛔ ואף סבב אינו
 * מוחק אחד.
 *
 * **מה יישבר בלעדיו:** ⛔ קובץ שכל סשן קורא בכל עבודה הוא מס קבוע,
 * ⚠️ וסשן שנחנק אינו מותיר שום סימן — ⛔ אין שער שנופל ואין קומיט.
 *
 * **מה אינו נאכף כאן:** ⛔ תוכן הפרקים — ⚠️ «האם השורה הזו ראויה» היא
 * קריאת משמעות, ⭐ ומה שנמדד הוא **הכמות**.
 *
 * ⛔ המוטציות אינן נכתבות לעץ.
 * ⛔ הקובץ זהה בית-לבית בארבעת הריפו — אין בו בלוק `APP`.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';


/*  ⛔ הקובץ הזה אינו אוכף שורה בטבלת התשתית (סבב 72) — ⚠️ הצהרה ריקה
 *  ולא היעדר: ⛔ שער בלי הצהרה אינו נבדל משער שההצהרה שלו נשמטה. */
export const ROWS = [];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const MAX_LINES = 700;
const MAX_ROUNDS = 2;
const MAX_PRIVATE = 300;
const MAX_ROUND_LINES = 10;
/*  ⛔ הסף בשער 403 — ⚠️ שלוש שורות מרווח למוטציית-הנגד שלמטה, ⭐ והתקרה
 *  לכללים היא 400: ⛔ שני מספרים מוצהרים ולא אחד. */
const MAX_SHARED = 403;
const ROUND_H2 = /^##\s+(?:⭐\s+)?סבב\s/;

let pass = 0, fail = 0;
const t = (n, cond, m) => { if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

const docPath = path.join(ROOT, 'CLAUDE.md');
const raw = fs.readFileSync(docPath, 'utf8');
const lines = raw.split('\n');
const nlines = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;

/* ⚠️ אותה מסכת גדרות-קוד של סעיף א — ⛔ כותרת שבתוך ``` אינה פרק (סבב 49). */
const mask = new Array(lines.length).fill(false);
{ let f = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('```')) { f = !f; mask[i] = true; continue; } mask[i] = f; } }
const rounds = lines.filter((l, i) => !mask[i] && ROUND_H2.test(l));

let n = 1;
t(n++, nlines <= MAX_LINES, `CLAUDE.md — ${nlines}/${MAX_LINES} שורות`);
t(n++, rounds.length <= MAX_ROUNDS, `CLAUDE.md — ${rounds.length}/${MAX_ROUNDS} פרקי סבבים`);
t(n++, rounds.length > 0, '⚠️ ויש בו לפחות פרק סבב אחד — קובץ בלי היסטוריה כלל אינו «חלון»');

/* ⭐ החלק הפרטי-הקבוע — כל מה שאינו בלוק `SHARED` (סבב 50).
   ⚠️ אותה מסכת גדרות-קוד: ⛔ סמן `SHARED` שבתוך דוגמה אינו בלוק אמיתי.
   ⛔ **ופרקי הסבבים נספרים בו** (סבב 70) — ⚠️ עד הסבב הזה הם הוחרגו כאן
   ובלבד כאן, ⛔ והמספר שדווח היה נמוך מזה שהשער האמיתי אוכף: 95 מול 235
   על אותו קובץ. ⚠️ **וזה לא היה רק דיווח:** `needPriv` נגזר ממנו, ולכן
   המוטציה ריפדה מאה שורות מיותרות ⛔ ונחסמה על התקרה הגלובלית. */
const privateLines = (() => {
  const kind = new Array(nlines).fill(0);
  let s = -1;
  for (let i = 0; i < nlines; i++) {
    if (mask[i]) continue;
    if (/<!--\s*SHARED:start/.test(lines[i])) s = i;
    else if (/<!--\s*SHARED:end/.test(lines[i]) && s >= 0) {
      for (let j = s; j <= i; j++) kind[j] = 1; s = -1;
    }
  }
  let h = -1;
  for (let i = 0; i < nlines; i++) {
    if (mask[i] || !/^##\s/.test(lines[i])) continue;
    if (h >= 0) { for (let j = h; j < i; j++) if (!kind[j]) kind[j] = 2; h = -1; }
    if (ROUND_H2.test(lines[i])) h = i;
  }
  if (h >= 0) for (let j = h; j < nlines; j++) if (!kind[j]) kind[j] = 2;
  return kind.filter(k => k !== 1).length;
})();

const docs = fs.readFileSync(path.join(HERE, 'check-docs.mjs'), 'utf8');
t(n++, /const DOC_MAX_LINES\s*=\s*700;/.test(docs), 'check-docs מחזיק DOC_MAX_LINES = 700');
t(n++, /const DOC_MAX_SHARED\s*=\s*403;/.test(docs), 'check-docs מחזיק DOC_MAX_SHARED = 403 — התקרה לכללים 400 ועוד שלוש שורות המוטציה');
t(n++, /const DOC_MAX_ROUNDS\s*=\s*2;/.test(docs), 'check-docs מחזיק DOC_MAX_ROUNDS = 2');
t(n++, /const DOC_MAX_PRIVATE\s*=\s*300;/.test(docs), 'check-docs מחזיק DOC_MAX_PRIVATE = 300');
t(n++, /const ROUND_H2\s*=/.test(docs), 'check-docs מזהה פרק סבב לפי ביטוי ייעודי');
t(n++, /const DOC_MAX_ROUND_LINES\s*=\s*10;/.test(docs),
  'check-docs מחזיק DOC_MAX_ROUND_LINES = 10');

/*  ⛔ מכאן ולמטה מוטציות ובדיקות שלמות (סבב 92) — ⚠️ הן רצות ברמה
 *  המלאה בלבד: ⛔ הרמה המהירה עוצרת כאן עם קוד היציאה של הטענות
 *  שכבר רצו, ⭐ והכיסוי שלהן אינו יורד. */
if (!RUN_MUT) {
  console.log('\n⏭ test_budget: המוטציות רצות ברמה המלאה (--full)');
  process.exit(fail ? 1 : 0);
}
/* ── מוטציות: העץ אינו נגוע, העותק בתיקייה זמנית ───────────────────────── */
/*  ⛔ המוטציה **חותמת מחדש** את הבלוקים המשותפים בעותק (סבב 71) —
    ⚠️ בלעדיה כל תוספת בתוך בלוק משותף מפילה את check-docs על **החתימה**,
    ⛔ והמוטציה שנועדה לבדוק את תקרת החלק המשותף מדווחת «נאכף» על תנאי
    שכלל לא נבדק. ⭐ החתימה נבדקת במקום אחר, וכאן היא רעש. */
function resign(docsSrc, mdSrc) {
  const ls = mdSrc.split('\n');
  const out = []; let open = null, f = false;
  for (const l of ls) {
    if (/^\s*```/.test(l)) { f = !f; if (open) open.body.push(l); continue; }
    if (f) { if (open) open.body.push(l); continue; }
    const m = /^<!--\s*SHARED:start\s+id="([^"]*)"\s*-->\s*$/.exec(l);
    if (m) { open = { id: m[1], body: [] }; continue; }
    if (/^<!--\s*SHARED:end\s*-->\s*$/.test(l) && open) {
      out.push([open.id, crypto.createHash('sha256')
        .update(open.body.join('\n').trim()).digest('hex').slice(0, 16)]);
      open = null; continue;
    }
    if (open) open.body.push(l);
  }
  let s = docsSrc;
  for (const [id, sha] of out)
    s = s.replace(new RegExp(`(\\['${id}',\\s*')[0-9a-f]{16}(')`), `$1${sha}$2`);
  return s;
}

/*  ⛔ עותק אחד לשער, ⛔ ולא עותק לכל מוטציה (סבב 92) — ⚠️ נמדד שהשער
    פתח **אחד-עשר** עותקי עץ בהרצה אחת, ⭐ אחד לכל קריאה: ⛔ הזמן גדל עם
    מספר המוטציות ולא עם גודל הקוד. ⚠️ והמוטציות כאן נוגעות ב**תוכן**
    שני קבצים בלבד — ⭐ ולכן שחזורם מהמקור מחזיר את העותק למצבו הנקי,
    ⛔ ואין צורך בעץ חדש. */
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'r49bg-'));
for (const f of fs.readdirSync(ROOT)) {
  if (f === '.git' || f === 'node_modules') continue;
  fs.cpSync(path.join(ROOT, f), path.join(WORK, f), { recursive: true });
}
const WORK_DOC = path.join(WORK, 'CLAUDE.md');
const WORK_CHK = path.join(WORK, 'tools', 'check-docs.mjs');
const CLEAN_CHK = fs.readFileSync(WORK_CHK, 'utf8');

function runDocsOn(mutate) {
  try {
    const md = mutate(raw);
    fs.writeFileSync(WORK_DOC, md);
    fs.writeFileSync(WORK_CHK, resign(CLEAN_CHK, md));
    try {
      execFileSync(process.execPath, [WORK_CHK], { cwd: WORK, stdio: 'pipe' });
      return true;                       // עבר
    } catch (e) { return false; }        // נפל
  } finally {
    /*  ⛔ השחזור בכל מסלול יציאה — ⚠️ מוטציה שנפלה באמצע משאירה את העותק
        מלוכלך, ⛔ והמוטציה הבאה נמדדת על עץ שאינו נקי. */
    fs.writeFileSync(WORK_DOC, raw);
    fs.writeFileSync(WORK_CHK, CLEAN_CHK);
  }
}

t(n++, runDocsOn(s => s) === true, '⭐ קו הבסיס — check-docs עובר על הקובץ כפי שהוא');

/* ⭐⭐ **פינוי מקום לפני כל מוטציה שמוסיפה שורות — ⛔ ולא ויתור עליה
   (סבב 61).** ⚠️ **הבעיה שנמדדה:** ככל שהקובץ מתקרב לתקרה הגלובלית, כל
   מוטציה שמוסיפה שורות חוצה אותה **לפני** שהיא מגיעה לתנאי שהיא באה
   לבדוק — ⛔ ואז «נאכף» מדווח על שער שלא נבדק, וזה כשל בכיוון המסוכן.
   ⭐ **הפתרון: פינוי שורות מגוף פרקי הסבבים בעותק הזמני** — הן היחידות
   שנספרות בתקרה הגלובלית ו⛔ **אינן** נספרות בחלק הפרטי ואינן בבלוק
   `SHARED`. ⚠️ כלומר הפינוי מקטין את הכולל, ⛔ ומשאיר את `privateLines`
   ואת חתימות ה-SHARED בדיוק כפי שהם — וזה מה שמבודד את התנאי הנבדק.
   ⛔ כותרות `##` וגדרות קוד מדולגות: הסרת כותרת הייתה משנה את מניין
   פרקי הסבבים, והסרת שורה מתוך גדר הייתה משאירה גדר לא מאוזנת. */
function roundBodyIdx(ls) {
  const m = new Array(ls.length).fill(false);
  { let f = false;
    for (let i = 0; i < ls.length; i++) {
      if (ls[i].startsWith('```')) { f = !f; m[i] = true; continue; } m[i] = f; } }
  const idx = []; let inRound = false;
  for (let i = 0; i < ls.length; i++) {
    if (!m[i] && /^##\s/.test(ls[i])) { inRound = ROUND_H2.test(ls[i]); continue; }
    if (inRound && !m[i]) idx.push(i);
  }
  return idx;
}
function freeRoundLines(s, k) {
  if (k <= 0) return s;
  const ls = s.split('\n');
  const drop = new Set(roundBodyIdx(ls).slice(-k));
  return ls.filter((_, i) => !drop.has(i)).join('\n');
}
/* ⚠️ כמה שורות לפנות כדי שתוספת של `k` שורות תישאר **מתחת** לתקרה. */
const roomFor = k => Math.max(0, (nlines + k) - (MAX_LINES - 1));

/* ⚠️ המוטציה מוסיפה **מספיק** פרקים כדי לחצות את החלון, ולא פרק אחד
   (סבב 49) — ⛔ ריפו שגזם מתחת לתקרה היה עובר מוטציה של פרק בודד, כלומר
   המוטציה הייתה no-op והבדיקה הייתה מדווחת «נאכף» על שער שלא נבדק. */
const need = MAX_ROUNDS - rounds.length + 1;
const extra = Array.from({ length: need }, (_, k) =>
  `\n## סבב 9${k} (2026-12-31) — פרק סבב עודף, לצורך המוטציה\nגוף.\n`).join('');
/* ⚠️ הפינוי נדרש כאן מאותה סיבה בדיוק שבמוטציית החלק הפרטי שלמטה (סבב 61) —
   ⛔ בקובץ שקרוב לתקרה, שלוש שורות הפרק היו מפילות את השער על התקרה
   הגלובלית, והטענה הייתה מדווחת «נאכף» על **חלון הסבבים** שלא נבדק. */
t(n++, runDocsOn(s => freeRoundLines(s, roomFor(extra.split('\n').length)) + extra) === false,
  `⛔ מוטציה: ${need} פרקי סבבים נוספים **מפילים** את check-docs (חלון של שניים)`);

const padTo = MAX_LINES + 1 - nlines + 1;
t(n++, padTo > 0, `יש מה לרפד — ${padTo} שורות עד ${MAX_LINES + 1}`);
t(n++, runDocsOn(s => s + '\nריפוד.'.repeat(0) + Array(padTo + 1).join('ריפוד לצורך המוטציה.\n')) === false,
  `⛔ מוטציה: ${MAX_LINES + 1} שורות **מפילות** את check-docs (תקרה קשיחה)`);

t(n++, privateLines <= MAX_PRIVATE,
  `CLAUDE.md — ${privateLines}/${MAX_PRIVATE} שורות בחלק הפרטי-הקבוע`);

/* ⚠️ הריפוד הוא כותרת `###` ⛔ ולא `##` (סבב 71) — ⚠️ כותרת `##` בחלק
   הפרטי שאינה «מסכים ולוגיקה» ואינה פרק סבב מפילה שער אחר, ⛔ ואז
   המוטציה מפילה מסיבה שאינה התקרה שהיא באה לבדוק.
   ⚠️ מוטציית החלק הפרטי מוסיפה **פרק שאינו פרק סבב**, ולכן שורותיו
   נספרות כפרטיות. ⛔ והיא חייבת להישאר מתחת לתקרה הגלובלית — אחרת הייתה
   מפילה את השער על התקרה הגלובלית ומדווחת «נאכף» על תנאי שלא נבדק. */
const needPriv = MAX_PRIVATE - privateLines + 1;
const privChunk = `\n### פרק פרטי עודף, לצורך המוטציה\n` +
                  Array(needPriv).join('שורה פרטית לצורך המוטציה.\n');

/*  ⛔ ופינוי מגוף פרקי הסבבים אינו עוזר כאן (סבב 70) — ⚠️ מרגע שהם
    נספרים בחלק הפרטי, כל שורה שמפונה חוזרת מיד כשורת ריפוד, ⛔ והיחס
    אינו זז. ⭐ מה שקובע הוא **גודל החלק המשותף**: המוטציה ניתנת לבנייה
    כל עוד `shared + MAX_PRIVATE + 1 < MAX_LINES`. ⚠️ וזו תקרה סמויה על
    החלק המשותף, נמוכה מ-`DOC_MAX_SHARED` המוצהרת. */
const sharedLines = nlines - privateLines;
t(n++, sharedLines + MAX_PRIVATE + 1 < MAX_LINES,
  `⚠️ המוטציה ניתנת לבנייה — החלק המשותף ${sharedLines} מול תקרת ${MAX_LINES - MAX_PRIVATE - 2}`);
t(n++, nlines + needPriv < MAX_LINES,
  `⚠️ מוטציית החלק הפרטי נשארת מתחת ל-${MAX_LINES} — היא בודקת את התקרה הנכונה`);
t(n++, runDocsOn(s => s) === true,
  '⭐ ⛔ ובסיס המוטציה עצמו **עובר** — כלומר מה שמפיל הוא הריפוד ולא הבסיס');
t(n++, runDocsOn(s => s + privChunk) === false,
  `⛔ מוטציה: ${needPriv} שורות פרטיות נוספות **מפילות** את check-docs (התקרה הפרטית)`);
/*  ⭐ מוטציית-נגד (סבב 69) — ⛔ שינוי שחייב **לעבור**: שלוש שורות פרטיות
    נוספות אינן חוצות אף תקרה, ⚠️ כלומר השער מודד סף ואינו נופל על כל
    תוספת. ⛔ בלעדיה «המוטציה מפילה» אינה מבחינה בין מדידה לרגישות-יתר. */
t(n++, runDocsOn(s => freeRoundLines(s, Math.max(roomFor(3), 5)) +
      '\n### פרק פרטי קטן\nגוף.\n') === true,
  '⭐ מוטציית-נגד: שלוש שורות פרטיות ⛔ **אינן** מפילות');

/* ── ⛔ אורך פרק הסבב — ⭐ ולא רק מספר הפרקים (סבב 72) ────────────────────────
   ⚠️ עד סבב 72 נספרו הפרקים ולא נמדד אורכם, ⛔ ולכן שני פרקים בני 75 ו-108
   שורות עברו. ⭐ שתי המוטציות כאן מודדות את הסף עצמו: פרק בן
   `DOC_MAX_ROUND_LINES + 1` מפיל, ⛔ ופרק בן `DOC_MAX_ROUND_LINES` אינו.
   ⛔ והזיהוי מדלג על כותרת שבתוך גדר קוד — ⚠️ דוגמה בתיעוד אינה פרק,
   ⭐ והמוטציה השלישית היא זו שמודדת את זה. */
/*  ⚠️ אורך הפרק = שורת הכותרת ועוד `k` שורות גוף. */
const roundOf = (k) => '\n## סבב 91 (2026-12-31) — פרק לצורך המוטציה\n' + 'שורה.\n'.repeat(k);
/*  ⚠️ הפרק החדש **מחליף** את השניים הקיימים — ⛔ אחרת החלון עצמו מפיל,
 *  והמדידה הייתה מדווחת «נאכף» על תנאי שלא נבדק. */
const onlyRound = (s, body) => s.slice(0, s.search(/^##\s+(?:⭐\s+)?סבב\s/m)) + body;
t(n++, runDocsOn(s => onlyRound(s, roundOf(MAX_ROUND_LINES))) === false,
  `⛔ מוטציה: פרק סבב בן ${MAX_ROUND_LINES + 1} שורות **מפיל** את check-docs`);
t(n++, runDocsOn(s => onlyRound(s, roundOf(MAX_ROUND_LINES - 1))) === true,
  `⭐ מוטציית-נגד: פרק בן ${MAX_ROUND_LINES} שורות ⛔ **אינו** מפיל — נמדד סף, לא אורך`);
/*  ⚠️ שתי הכותרות שבתוך הגדר היו הופכות את מניין הפרקים לשלושה, ⛔ והחלון
 *  היה מפיל — ⭐ ולכן «עובר» כאן הוא בדיוק העדות שהגדר מדולגת. */
t(n++, runDocsOn(s => onlyRound(s, '\n## סבב 91 (2026-12-31) — פרק קצר\nגוף.\n' +
      '```\n## סבב 92 (2026-12-31) — דוגמה בתוך גדר\n' +
      '## סבב 93 (2026-12-31) — דוגמה בתוך גדר\n```\n')) === true,
  '⭐ מוטציית-נגד: כותרת פרק **בתוך גדר קוד** ⛔ אינה נספרת כפרק');

/*  ⛔ ומוטציה על החלק המשותף (סבב 69) — ⚠️ התקרה המשותפת היא תקרה
    **נפרדת**, ותוספת בתוך בלוק משותף אינה נספרת בפרטי. ⛔ והריפוד נגזר
    מהנמדד ואינו קבוע (סבב 71): קבוע שנכתב פעם אחת חוצה עם הזמן גם את
    התקרה הגלובלית, ⚠️ ואז המוטציה «מפילה» מסיבה אחרת ומדווחת «נאכף» על
    תנאי שלא נבדק. */
const needShared = MAX_SHARED - sharedLines + 1;
t(n++, nlines + needShared < MAX_LINES,
  `⚠️ מוטציית החלק המשותף נשארת מתחת ל-${MAX_LINES} — היא בודקת את התקרה הנכונה`);
t(n++, runDocsOn(s => s.replace('<!-- SHARED:end -->',
    Array(needShared + 1).join('שורה משותפת לצורך המוטציה.\n') + '<!-- SHARED:end -->')) === false,
  `⛔ מוטציה: ${needShared} שורות משותפות נוספות **מפילות** את check-docs (התקרה המשותפת)`);
/*  ⭐ מוטציית-נגד: שלוש שורות משותפות ⛔ אינן מפילות — ⚠️ בלעדיה
    «חריגה מפילה» אינה מבחינה בין תקרה לרגישות לכל תוספת. */
t(n++, runDocsOn(s => s.replace('<!-- SHARED:end -->',
    Array(4).join('שורה משותפת קטנה.\n') + '<!-- SHARED:end -->')) === true,
  '⭐ מוטציית-נגד: שלוש שורות משותפות ⛔ **אינן** מפילות');

console.log(fail ? `\n✗ סבב 49 (תקציב תיעוד) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 49 (תקציב תיעוד) — ${pass} טענות עברו`);
/*  ⛔ כותב על עותק — ⚠️ הבודק קורא את התיעוד ואת חתימתו מהדיסק, ⛔ ואין דרך למסור לו טקסט. */
fs.rmSync(WORK, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
