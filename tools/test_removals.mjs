#!/usr/bin/env node
/*  שער ההסרות — סבב 72.
 *
 *  ⭐ משימת הבודק: סורק את המזהים שנמחקו בקומיט האחרון — ⛔ ומפיל על
 *  מזהה שנמחק ונשאר לו קורא חי בעץ.
 *
 * ⛔ **מה נאכף כאן, וזה כל מה שנאכף:** פונקציה או קבוע שהוגדרו בקומיט
 * הקודם ואינם מוגדרים בזה — ⛔ ואין להם אף קורא שנשאר.
 *
 * ⚠️ **הנימוק המדוד:** יכולת הוואטסאפ הוסרה, ⛔ וכפתור השיתוף של ראשון
 * לציון ירד יחד איתה מפני שהוא ישב באותו מסלול. ⭐ הסשן אף רשם זאת
 * בהערה — ⛔ ואף שער לא שאל «ומי השתמש בזה».
 *
 * ⛔ **מה יישבר בלעדיו:** מחיקה שנראית מקומית תוריד יכולת שנייה, ⚠️ והעדות
 * היחידה תהיה הערה שאיש אינו קורא.
 *
 * ⚠️ **ומה שאינו נאכף כאן:** ⛔ השער רואה **מזהים**, ולא חיווט: כפתור
 * שיורד מהמסך בלי שנמחקה פונקציה אינו נראה לו — ⭐ ולכן החיווט פר-מוסד
 * נמדד בשער השיתוף, בנפרד. ⚠️ השער משווה `HEAD^` ל-`HEAD`; ⛔ בקומיט מיזוג
 * ה-`HEAD^` הוא `main` הישן, ⚠️ ולכן שינוי צורה נראה כמחיקה.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = { app: 'schar-limud' };
/* ── סוף APP ───────────────────────────────────────────────────────────── */

export const ROWS = [47];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0, n = 0;
const t = (cond, msg) => { n++; if (cond) console.log('  ok   ' + n + ' · ' + msg);
                           else { failures++; console.error('  FAIL ' + n + ' · ' + msg); } };

const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });

/*  ⛔ המזהים נשלפים מהתוכן ⛔ ולא משורות הדיף (סבב 72) — ⚠️ שורה שהשתנתה
    מופיעה גם כמחיקה וגם כהוספה, ⭐ והשוואת **הגדרות** היא מה שמבדיל בין
    «נמחק» ל«נערך». */
const DEF = [/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]{3,})\s*\(/g,
             /\b(?:const|let|var)\s+([A-Za-z_$][\w$]{3,})\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g,
             /^[ \t]*(?:async\s+)?([A-Za-z_$][\w$]{3,})\s*\([^()]*\)\s*\{/gm];
/*  ⛔ מילת שפה אינה הגדרה (סבב 72) — ⚠️ תבנית המתודה תופסת גם `while (x) {`,
    ⛔ ומזהה כזה שנעלם משורה אחת נראה כמחיקה של פונקציה. */
const KW = new Set(['case', 'catch', 'class', 'const', 'delete', 'else', 'export',
                    'function', 'import', 'return', 'super', 'switch', 'throw',
                    'typeof', 'void', 'while', 'yield']);
export function defsOf(text) {
  const out = new Set();
  for (const re of DEF) for (const m of text.matchAll(re)) if (!KW.has(m[1])) out.add(m[1]);
  return out;
}
const SCAN = /\.(mjs|js|html|java)$/;
function defsAt(rev) {
  const out = new Map();
  for (const f of git('ls-tree', '-r', '--name-only', rev).split('\n').filter((x) => SCAN.test(x))) {
    let txt = '';
    try { txt = git('show', `${rev}:${f}`); } catch (e) { continue; }
    for (const d of defsOf(txt)) out.set(d, f);
  }
  return out;
}
const TREE = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(mjs|js|html|json|sql|java|xml|yml|sh)$/.test(e.name)) TREE.push(p);
  }
})(ROOT);
export function callersOf(id, files = TREE) {
  const re = new RegExp(`\\b${id}\\s*\\(`);
  return files.filter((f) => re.test(fs.readFileSync(f, 'utf8'))).map((f) => f.replace(ROOT + '/', ''));
}
export function orphans(before, after, files = TREE) {
  const out = [];
  for (const id of before.keys()) {
    if (after.has(id)) continue;
    const hits = callersOf(id, files);
    if (hits.length) out.push({ id, from: before.get(id), hits });
  }
  return out;
}

console.log(`── שער ההסרות (${APP.app}) ─────────────────────────────────────────────`);
let head = null, prev = null;
try { head = git('rev-parse', 'HEAD').trim(); prev = git('rev-parse', 'HEAD^').trim(); }
catch (e) { prev = null; }
/*  ⛔ קומיט ראשון בהיסטוריה אינו ניתן להשוואה — ⚠️ נימוק כתוב ⛔ ולא דילוג
    בשתיקה: אין «לפני» למדוד מולו. */
if (!prev) {
  t(true, 'אין קומיט קודם להשוואה — ⛔ אין מה למדוד, וזו הצהרה ולא דילוג');
} else {
  const orph = orphans(defsAt(prev), defsAt(head));
  t(orph.length === 0,
    `מזהה שנמחק ונשאר לו קורא — נמדדו ${orph.length} והצפוי אפס` +
    (orph.length ? ': ' + orph.map((o) => `${o.id} ⟵ ${o.hits.slice(0, 2).join(' · ')}`).join(' | ') : ''));
}

/*  ⛔ המוטציה על **מודל** ולא על הריפו (סבב 72) — ⚠️ מחיקת פונקציה אמיתית
    כדי לבדוק שער היא בדיוק מה שהשער בא למנוע. */
{
  const before = new Map([['ysDoThing', 'index.html'], ['ysGoneClean', 'index.html']]);
  const after = new Map();
  const tmp = join(ROOT, 'tools');
  const files = [];
  t(orphans(before, after, files).length === 0, '⭐ מוטציית-נגד: מזהה שנמחק ואין לו קורא ⛔ אינו מפיל');
  const fake = [join(tmp, 'test_removals.mjs')];
  const withCaller = new Map([['defsOf', 'x.mjs']]);
  t(orphans(withCaller, new Map(), fake).length === 1,
    '⛔ מוטציה: מזהה שנמחק ויש לו קורא — נתפס');

  /*  ⛔ מוטציית-נגד על **צורה** (סבב 72) — ⚠️ זו בדיוק המוטציה שהפילה את
      המיזוג: `async` שנוסף לחץ אינו מחיקה, ⛔ ואסור לו להפיל. */
  const asDefs = (txt) => new Map([...defsOf(txt)].map((d) => [d, 'index.html']));
  const plain = asDefs('const callersOf = (id) => { return id; };');
  const asyn = asDefs('const callersOf = async (id) => { return id; };');
  t(plain.has('callersOf') && asyn.has('callersOf'),
    '⛔ חץ רגיל וחץ `async` — שניהם נראים כהגדרה');
  t(asDefs('async function callersOf(id) { return id; }').has('callersOf'),
    '⛔ ו-`async function` אף הוא');
  t(asDefs('  callersOf(id) { return id; }').has('callersOf'), '⛔ וכך גם מתודה');
  t(asDefs('  while (id) { return id; }').size === 0,
    '⭐ מוטציית-נגד: `while (x) {` אינו מזהה — ⛔ מילת שפה אינה הגדרה');
  t(orphans(plain, asyn, fake).length === 0,
    '⭐ מוטציית-נגד: הפיכת `const f = (x) =>` ל-`async` ⛔ אינה מפילה');
  t(orphans(plain, new Map(), fake).length === 1,
    '⛔ מוטציה: מחיקה אמיתית של אותה הגדרה, ולה קורא — מפילה');
}

/*  ⛔ האימות על העץ החי (סבב 72) — ⚠️ העיוורון לא נראה במודל אלא בעץ:
    הגדרה שאינה נראית לשער נקראת כמחיקה בכל שינוי צורה שייגע בה. */
{
  const RE = /(?:const|let|var)\s+([A-Za-z_$][\w$]{3,})\s*=\s*async\s*\(/g;
  let seen = 0; const missed = [];
  for (const f of TREE.filter((p) => /\.(mjs|js|html)$/.test(p))) {
    const txt = fs.readFileSync(f, 'utf8');
    const d = defsOf(txt);
    for (const m of txt.matchAll(RE)) { seen++; if (!d.has(m[1])) missed.push(m[1]); }
  }
  t(seen > 0 && missed.length === 0,
    `⛔ כל הגדרות החץ-\`async\` בעץ נראות לשער — נמדדו ${seen}, ואינן נראות ${missed.length}` +
    (missed.length ? ': ' + missed.join(' · ') : ''));
}

console.log(failures ? `\n❌ שער ההסרות — ${failures} נכשלו` : `\n✅ שער ההסרות — ${n} טענות עברו`);
process.exit(failures ? 1 : 0);
