#!/usr/bin/env node
/* סבב 49 — תקציב התיעוד (כלל ברזל 18).
 *
 * ⚠️ **תשעה סשנים נחנקו בשבוע אחד**, ונמדד ש-`CLAUDE.md` תפח מ-1,782
 * שורות (אחרי הגיזום של סבב 34) ל-4,447 — ⛔ מפני שכל סבב מוסיף פרק ואף
 * סבב אינו מוחק אחד. כלל ברזל 18 קובע **שלושה** תנאים, וכולם נאכפים
 * בסעיף ט של `check-docs.mjs`: **חלון של שני פרקי סבבים** · **תקרה של
 * 3,000 שורות** · ו**תקרת 900 שורות על החלק הפרטי-הקבוע** (סבב 50).
 *
 * ⛔ הבדיקה מריצה את `check-docs` **האמיתי** על עותק מוטב בתיקייה זמנית
 * ודורשת שהוא ייפול על כל אחד משלושת התנאים, ⛔ ושלא ייפול על כותרת `##`
 * שאינה פרק סבב. ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג).
 *
 * ⛔ הקובץ זהה בית-לבית בארבעת הריפו — אין בו בלוק `APP`.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const MAX_LINES = 3000;
const MAX_ROUNDS = 2;
const MAX_PRIVATE = 900;
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

/* ⭐ החלק הפרטי-הקבוע — מה שאינו בלוק `SHARED` ואינו פרק סבב (סבב 50).
   ⚠️ אותה מסכת גדרות-קוד: ⛔ סמן `SHARED` שבתוך דוגמה אינו בלוק אמיתי. */
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
  return kind.filter(k => k === 0).length;
})();

const docs = fs.readFileSync(path.join(HERE, 'check-docs.mjs'), 'utf8');
t(n++, /const DOC_MAX_LINES\s*=\s*3000;/.test(docs), 'check-docs מחזיק DOC_MAX_LINES = 3000');
t(n++, /const DOC_MAX_ROUNDS\s*=\s*2;/.test(docs), 'check-docs מחזיק DOC_MAX_ROUNDS = 2');
t(n++, /const DOC_MAX_PRIVATE\s*=\s*900;/.test(docs), 'check-docs מחזיק DOC_MAX_PRIVATE = 900');
t(n++, /const ROUND_H2\s*=/.test(docs), 'check-docs מזהה פרק סבב לפי ביטוי ייעודי');
t(n++, /!inFence\[i\]\s*&&\s*ROUND_H2\.test/.test(docs),
  '⛔ והזיהוי מדלג על כותרת שבתוך גדר קוד — אחרת דוגמה בתיעוד נספרת כפרק');

/* ── מוטציות: העץ אינו נגוע, העותק בתיקייה זמנית ────────────────────── */
function runDocsOn(mutate) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r49bg-'));
  try {
    for (const f of fs.readdirSync(ROOT)) {
      if (f === '.git' || f === 'node_modules') continue;
      fs.cpSync(path.join(ROOT, f), path.join(tmp, f), { recursive: true });
    }
    fs.writeFileSync(path.join(tmp, 'CLAUDE.md'), mutate(raw));
    try {
      execFileSync(process.execPath, [path.join(tmp, 'tools', 'check-docs.mjs')],
                   { cwd: tmp, stdio: 'pipe' });
      return true;                       // עבר
    } catch (e) { return false; }        // נפל
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

t(n++, runDocsOn(s => s) === true, '⭐ קו הבסיס — check-docs עובר על הקובץ כפי שהוא');

/* ⚠️ המוטציה מוסיפה **מספיק** פרקים כדי לחצות את החלון, ולא פרק אחד
   (סבב 49) — ⛔ ריפו שגזם מתחת לתקרה היה עובר מוטציה של פרק בודד, כלומר
   המוטציה הייתה no-op והבדיקה הייתה מדווחת «נאכף» על שער שלא נבדק. */
const need = MAX_ROUNDS - rounds.length + 1;
const extra = Array.from({ length: need }, (_, k) =>
  `\n## סבב 9${k} (2026-12-31) — פרק סבב עודף, לצורך המוטציה\nגוף.\n`).join('');
t(n++, runDocsOn(s => s + extra) === false,
  `⛔ מוטציה: ${need} פרקי סבבים נוספים **מפילים** את check-docs (חלון של שניים)`);

const padTo = 3001 - nlines + 1;
t(n++, padTo > 0, `יש מה לרפד — ${padTo} שורות עד 3,001`);
t(n++, runDocsOn(s => s + '\nריפוד.'.repeat(0) + Array(padTo + 1).join('ריפוד לצורך המוטציה.\n')) === false,
  '⛔ מוטציה: 3,001 שורות **מפילות** את check-docs (תקרה קשיחה)');

t(n++, privateLines <= MAX_PRIVATE,
  `CLAUDE.md — ${privateLines}/${MAX_PRIVATE} שורות בחלק הפרטי-הקבוע`);

/* ⚠️ מוטציית החלק הפרטי מוסיפה **פרק שאינו פרק סבב**, ולכן שורותיו
   נספרות כפרטיות. ⛔ והיא חייבת להישאר מתחת ל-3,000 — אחרת היא הייתה
   מפילה את השער על התקרה הגלובלית ומדווחת «נאכף» על תנאי שלא נבדק. */
const needPriv = MAX_PRIVATE - privateLines + 1;
const privChunk = `\n## פרק פרטי עודף, לצורך המוטציה\n` +
                  Array(needPriv).join('שורה פרטית לצורך המוטציה.\n');
t(n++, nlines + needPriv + 2 < MAX_LINES,
  `⚠️ מוטציית החלק הפרטי נשארת מתחת ל-${MAX_LINES} — היא בודקת את התקרה הנכונה`);
t(n++, runDocsOn(s => s + privChunk) === false,
  `⛔ מוטציה: ${needPriv} שורות פרטיות נוספות **מפילות** את check-docs (תקרת 900)`);
t(n++, runDocsOn(s => s + Array(needPriv + 1).join('שורה בתוך פרק הסבב האחרון.\n')) === true,
  '⭐ ואותה כמות שורות **בתוך פרק סבב** ⛔ **אינה** מפילה — המדידה מבחינה ביניהם');

t(n++, runDocsOn(s => s + '\n## פרק שאינו פרק סבב\nגוף.\n') === true,
  '⭐ ומוטציה שאינה פרק סבב — כותרת `##` רגילה — ⛔ **אינה** מפילה');

console.log(fail ? `\n✗ סבב 49 (תקציב תיעוד) — ${fail} נכשלו, ${pass} עברו`
                 : `\n✓ סבב 49 (תקציב תיעוד) — ${pass} טענות עברו`);
process.exit(fail ? 1 : 0);
