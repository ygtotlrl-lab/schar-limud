#!/usr/bin/env node
/* test_crossgate.mjs — אין סתירה בין שערים.
 *
 * **מה נאכף:** שני שערים שנוגעים באותו נושא מצהירים על אותו ערך
 * **ומודדים אותו מספר** — ⛔ הטענות קוראות את הקבועים משני הקבצים
 * ומשוות, ⛔ ומריצות את שני השערים על אותו עץ ומשוות את המספרים שדיווחו.
 *
 * **הנימוק המדוד:** שער נכתב מול מצב, שער שני נכתב מולו שנה אחר כך,
 * ⛔ ואיש אינו מריץ את שניהם על אותה שאלה.
 *
 * **מה יישבר בלעדיו:** ⛔ הנמוך מהשניים הוא שמפעיל את השער, ⚠️ והגבוה
 * מדווח «נאכף» על תנאי שלא נבדק.
 *
 * **מה אינו נאכף כאן:** ⛔ «אותה טענה» כקריאת משמעות — ⚠️ מה שנמדד הוא
 * **אותו ערך** בין שני שערים, ⭐ ומיזוג של שני שערים שנושאם זהה נסרק
 * ידנית בכל סבב שנוגע.
 *
 * ⛔ המוטציות רצות על עותק בתיקייה זמנית ואינן נכתבות לעץ.
 * ⛔ הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */

import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [26];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/*  ⛔ כל גופו של השער הזה הוא השוואת שער מול שער (סבב 92) — ⚠️ בדיקת
 *  שלמות ולא בדיקת נכונות של האפליקציה: ⛔ ולכן הוא כולו רץ ברמה המלאה
 *  בלבד, ⭐ כמו המוטציות. */
if (!RUN_MUT) {
  console.log('test_crossgate: ההשוואה בין השערים רצה ברמה המלאה (--full) — מדלג');
  process.exit(0);
}

let pass = 0, fail = 0;
const t = (n, cond, m) => { if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

const rd = (root, f) => readFileSync(join(root, f), 'utf8');
const num = (s, re) => { const m = re.exec(s); return m ? Number(m[1]) : null; };
const nums = (s) => (s ? s.match(/\d+/g) || [] : []).map(Number);

/* ⚠️ מריץ שער ומחזיר את הפלט **בלי תלות בקוד היציאה** — ⛔ שער שנפל
   עדיין מדווח את המספר שמדד, וזה בדיוק מה שמשווים כאן. */
function run(root, tool) {
  const r = spawnSync(process.execPath, [join(root, 'tools', tool)],
                      { cwd: root, encoding: 'utf8' });
  return (r.stdout || '') + (r.stderr || '');
}

/* ── הביקורת — פונקציה אחת שרצה על שורש כלשהו ──────────────────────────── */
function audit(root) {
  const v = [];
  const docs   = rd(root, 'tools/check-docs.mjs');
  const budget = rd(root, 'tools/test_budget.mjs');
  const caps   = rd(root, 'tools/check-capabilities.mjs');
  const matrix = rd(root, 'tools/test_matrix.mjs');
  const cmts   = rd(root, 'tools/check-comments.mjs');
  const md     = rd(root, 'CLAUDE.md');

  /* א. הקבועים המוצהרים — check-docs מול test_budget */
  const pairs = [
    ['התקרה הכוללת', /const DOC_MAX_LINES\s*=\s*(\d+)/,   /const MAX_LINES\s*=\s*(\d+)/],
    ['תקרת החלק המשותף', /const DOC_MAX_SHARED\s*=\s*(\d+)/, /const MAX_SHARED\s*=\s*(\d+)/],
    ['תקרת החלק הפרטי', /const DOC_MAX_PRIVATE\s*=\s*(\d+)/, /const MAX_PRIVATE\s*=\s*(\d+)/],
    ['חלון פרקי הסבבים', /const DOC_MAX_ROUNDS\s*=\s*(\d+)/, /const MAX_ROUNDS\s*=\s*(\d+)/],
  ];
  for (const [what, reD, reB] of pairs) {
    const a = num(docs, reD), b = num(budget, reB);
    if (a === null || b === null) v.push({ kind: 'const-missing', msg: `${what} — check-docs ${a} · test_budget ${b}` });
    else if (a !== b) v.push({ kind: 'const-gap', msg: `${what} — check-docs ${a} ≠ test_budget ${b}` });
  }

  /* ב. המספר שנמדד בפועל — שני השערים על אותו עץ */
  const od = run(root, 'check-docs.mjs'), ob = run(root, 'test_budget.mjs');
  const measured = [
    ['סך השורות',      /תקציב התיעוד — (\d+)\/\d+ שורות$/m,  /CLAUDE\.md — (\d+)\/\d+ שורות$/m],
    ['פרקי הסבבים',    /תקציב התיעוד — (\d+)\/\d+ פרקי סבבים/, /CLAUDE\.md — (\d+)\/\d+ פרקי סבבים/],
    ['החלק המשותף',    /תקציב התיעוד — (\d+)\/\d+ שורות בחלק המשותף/, /החלק המשותף (\d+) מול תקרת/],
    ['החלק הפרטי',     /תקציב התיעוד — (\d+)\/\d+ שורות בחלק הפרטי-הקבוע/, /CLAUDE\.md — (\d+)\/\d+ שורות בחלק הפרטי-הקבוע/],
  ];
  for (const [what, reD, reB] of measured) {
    const a = num(od, reD), b = num(ob, reB);
    if (a === null || b === null) v.push({ kind: 'measure-missing', msg: `${what} — check-docs ${a} · test_budget ${b}` });
    else if (a !== b) v.push({ kind: 'measure-gap', msg: `${what} — check-docs מדד ${a}, test_budget מדד ${b}` });
  }

  /* ג. רשימת השורות המוחרגות ב-test_matrix מול GATES שב-check-capabilities */
  const gates = [...caps.matchAll(/^ {2}(\d+): /gm)].map((m) => Number(m[1]));
  const exempt = nums(/const EXEMPT = \[([\s\S]*?)\];/.exec(matrix)?.[1]);
  const dbFact = nums(/const DB_FACT_EXEMPT = \[([^\]]*)\]/.exec(matrix)?.[1]);
  const wantEx = [...new Set([...gates, ...dbFact])].sort((a, b) => a - b);
  const gotEx  = [...new Set(exempt)].sort((a, b) => a - b);
  if (!gates.length || !exempt.length)
    v.push({ kind: 'rows-missing', msg: `GATES ${gates.length} · EXEMPT ${exempt.length}` });
  else if (wantEx.join(',') !== gotEx.join(','))
    v.push({ kind: 'rows-gap', msg:
      `EXEMPT ואינן ב-GATES/DB_FACT: [${gotEx.filter((x) => !wantEx.includes(x))}] · ` +
      `ב-GATES ואינן ב-EXEMPT: [${wantEx.filter((x) => !gotEx.includes(x))}]` });

  /* ד. שורות `app: true` מול מפתחות `APP.tableProbe` */
  /*  ⚠️ שורה שמוכרזת ב-`APP.gapRows` היא ⭕ באפליקציה הזו, ⛔ ולכן אין לה
      probe **בכוונה** — ⛔ ודרישת probe ממנה הייתה הופכת את ההכרזה עצמה
      לבלתי אפשרית. */
  const gapRows = nums(/gapRows: \[([^\]]*)\]/.exec(caps)?.[1]);
  const appRows = [...caps.matchAll(/\{ row: (\d+),[^}]*app: true/g)].map((m) => Number(m[1]));
  const probeBlk = /  tableProbe: \{\n([\s\S]*?)\n  \},/.exec(caps)?.[1] ?? '';
  const probeRows = [...probeBlk.matchAll(/^ {4}(\d+):/gm)].map((m) => Number(m[1]));
  const needP = [...new Set(appRows.filter((r) => !gapRows.includes(r)))].sort((a, b) => a - b);
  const allP  = [...new Set(appRows)];
  const gotP  = [...new Set(probeRows)].sort((a, b) => a - b);
  const noProbe  = needP.filter((x) => !gotP.includes(x));
  const noRow    = gotP.filter((x) => !allP.includes(x));
  if (noProbe.length || noRow.length)
    v.push({ kind: 'probe-gap', msg:
      `\`app: true\` בלי probe: [${noProbe}] · probe בלי שורת \`app: true\`: [${noRow}]` });

  /* ה. רוחב המפרידים — check-comments מול הכלל הכתוב */
  const ruleW = num(cmts, /const RULE_W\s*=\s*(\d+)/);
  const bannerW = num(cmts, /const BANNER_W\s*=\s*(\d+)/);
  /*  ⛔ שני הרוחבים נקראים מ**שורות הטבלה** (סבב 96) — ⚠️ עד כאן הם נקראו
      מפרוזת הכללים, ⛔ והיא ירדה: ⭐ הטבלה היא ההוראה, ⛔ ומספר שאין לו
      צד שני בקובץ הוא מספר שאיש אינו משווה. */
  const docRuleW = num(md, /מפרידי\s+`═`\s+ברוחב\s+(\d+)/);
  const docBannerW = num(md, /באנר\s+`──`\s+ברוחב\s+(\d+)/);
  if (ruleW !== docRuleW) v.push({ kind: 'width-gap', msg: `מפריד הבלוק — check-comments ${ruleW} ≠ הכלל ${docRuleW}` });
  if (bannerW !== docBannerW) v.push({ kind: 'width-gap', msg: `באנר ה-tools — check-comments ${bannerW} ≠ הכלל ${docBannerW}` });

  /*  ⛔ **חתימת בלוק מוצהרת במקום אחד** (סבב 96ד) — ⚠️ הנימוק המדוד:
      תשע חתימות היו כתובות פעמיים — ב-`check-capabilities` **וגם** בשער
      שמודד אותו בלוק: ⭐ סבב שקידם את האחת ולא את השנייה מקבל אישור
      מהשער שלא עודכן, ⛔ והבלוק נמדד מול ערך שכבר אינו. ⚠️ מה שנמדד הוא
      **מחרוזת בת 16 תווים הקסה שמופיעה בשני קובצי שערים**, ⛔ ולא
      «אותה טענה»: ⭐ המרשם הוא המקור, וכל שער אחר קורא ממנו. */
  {
    const seen = new Map();
    for (const f of readdirSync(join(root, 'tools'))) {
      if (!f.endsWith('.mjs') || f === basename(fileURLToPath(import.meta.url))) continue;
      const s = readFileSync(join(root, 'tools', f), 'utf8');
      for (const m of s.matchAll(/'([0-9a-f]{16})'/g)) {
        if (!seen.has(m[1])) seen.set(m[1], new Set());
        seen.get(m[1]).add(f);
      }
    }
    for (const [sha, files] of seen) {
      if (files.size > 1) v.push({ kind: 'sha-dup', msg:
        `החתימה ${sha} מוצהרת ב-${[...files].sort().join(' וב-')} — קוראים אותה מהמרשם` });
    }
  }

  return v;
}

export { audit };
const SELF = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (SELF) {

console.log(`\n── סבב 71 — אין סתירה בין שערים (${APP.name}) ─────────────────────────`);
const base = audit(ROOT);
let n = 1;
const of = (k) => base.filter((x) => x.kind === k).map((x) => x.msg).join(' · ');

t(n++, !base.some((x) => x.kind.startsWith('const')), `א. ארבע תקרות התיעוד זהות בשני השערים ${of('const-gap')}${of('const-missing')}`);
t(n++, !base.some((x) => x.kind.startsWith('measure')), `ב. וארבעת המספרים שנמדדו בפועל זהים ${of('measure-gap')}${of('measure-missing')}`);
t(n++, !base.some((x) => x.kind.startsWith('rows')), `ג. EXEMPT שב-test_matrix נגזר מ-GATES ${of('rows-gap')}${of('rows-missing')}`);
t(n++, !base.some((x) => x.kind === 'probe-gap'), `ד. כל שורת \`app: true\` נושאת מפתח ב-tableProbe ${of('probe-gap')}`);
t(n++, !base.some((x) => x.kind === 'width-gap'), `ה. רוחבי המפרידים זהים בשער ובכלל הכתוב ${of('width-gap')}`);
t(n++, !base.some((x) => x.kind === 'sha-dup'), `ו. אין חתימת בלוק שמוצהרת בשני קובצי שערים ${of('sha-dup')}`);

/* ── מוטציות — על עותק בתיקייה זמנית ───────────────────────────────────── */
const tmp = mkdtempSync(join(tmpdir(), 'r71x-'));
cpSync(ROOT, tmp, { recursive: true, filter: (s) => {
  const p = relative(ROOT, s).split(sep);
  return !p.includes('.git') && !p.includes('node_modules');
} });

t(n++, audit(tmp).length === 0, 'נגד: עותק נקי עובר את הביקורת');

/* ⚠️ `edits` הוא רשימת `[קובץ, פונקציה]` — ⛔ מוטציה שנוגעת בקובץ אחד
   בלבד אינה יכולה להראות ששינוי **מתואם** אינו סתירה. */
const mutate = (label, edits, kinds) => {
  const bak = edits.map(([f]) => [join(tmp, f), readFileSync(join(tmp, f), 'utf8')]);
  try {
    for (const [f, fn] of edits) writeFileSync(join(tmp, f), fn(readFileSync(join(tmp, f), 'utf8')));
    const got = audit(tmp).map((x) => x.kind);
    const want = kinds.includes('__none__') ? got.length === 0 : kinds.some((k) => got.includes(k));
    t(n++, want, `מוטציה: ${label} — נתפסה כ-[${got.join(',') || 'כלום'}]`);
  } finally { for (const [p, s0] of bak) writeFileSync(p, s0); }
};

mutate('תקרה פרטית שונה בין שני השערים',
  [['tools/test_budget.mjs', (s) => s.replace(/const MAX_PRIVATE = \d+;/, 'const MAX_PRIVATE = 250;')]],
  ['const-gap']);

/*  ⭐⭐ המוטציה שמשחזרת את התקלה שנמדדה (סבב 70) — ⛔ הפרדת פרקי הסבבים
    מהחלק הפרטי ב-test_budget בלבד. ⚠️ שני השערים ממשיכים לעבור כל אחד
    לעצמו, ⛔ והמספר שהם מדווחים על אותו קובץ נבדל. */
mutate('פרקי הסבבים מוחרגים מהחלק הפרטי בשער אחד בלבד',
  [['tools/test_budget.mjs', (s) => s.replace('return kind.filter(k => k !== 1).length;',
                   'return kind.filter(k => k === 0).length;')]], ['measure-gap']);

mutate('שורה שהוחרגה ב-test_matrix ואינה ב-GATES',
  [['tools/test_matrix.mjs', (s) => s.replace('const EXEMPT = [', 'const EXEMPT = [7778, ')]], ['rows-gap']);

mutate('מפתח tableProbe שנמחק בזמן ששורת app:true נשארה',
  [['tools/check-capabilities.mjs', (s) => s.replace(/^ {4}(\d+):/m, '    9999:')]], ['probe-gap']);

mutate('רוחב הבאנר בשער נבדל מהכלל הכתוב',
  [['tools/check-comments.mjs', (s) => s.replace(/const BANNER_W = \d+;/, 'const BANNER_W = 76;')]], ['width-gap']);

/*  ⛔ החזרת חתימה מוקלדת לשער שני — ⚠️ בדיוק המצב שנמדד: ⭐ אותה מחרוזת
    בת 16 תווים בשני קובצי שערים. */
mutate('חתימת בלוק שהוחזרה כליטרל לשער שני',
  [['tools/test_session.mjs', (s) => s.replace('}, capsBlock(START));',
      "}, { sha: '4ab395fd78fa83f8', lines: 51 });")]], ['sha-dup']);
/*  ⭐ מוטציית-נגד: אותה חתימה שנקראת מהמרשם ⛔ אינה מפילה — ⚠️ קוד שנוסף
    ולא הערה, ⭐ והערך ממשיך לבוא ממקום אחד. */
mutate('⭐ מוטציית-נגד: קריאה שנייה מהמרשם ⛔ אינה מפילה',
  [['tools/test_session.mjs', (s) => s.replace('}, capsBlock(START));',
      '}, capsBlock(START));\nconst SESS_SHA_ALT = capsBlock(START).sha;')]], ['__none__']);

/*  ⭐ מוטציית-נגד — ⛔ שינוי אמיתי בקובץ שאסור לו להפיל: ניסוח הערה.
    ⚠️ בלעדיה הטענות אינן מבחינות בין «משוות ערכים» ל«סופרות בתים». */
mutate('⭐ מוטציית-נגד: ניסוח הערה ב-test_budget ⛔ אינו מפיל',
  [['tools/test_budget.mjs', (s) => s.replace('/* ⭐ החלק הפרטי-הקבוע', '/* ⭐⭐ החלק הפרטי-הקבוע, בניסוח אחר')]],
  ['__none__']);

/*  ⭐ ומוטציית-נגד שנייה — ⛔ הוספת שורה **לשני** השערים יחד אינה סתירה:
    ⚠️ הסתירה היא הפרש בין שניים, ⛔ ולא שינוי. */
mutate('⭐ מוטציית-נגד: אותה תקרה משתנה בשני השערים יחד ⛔ אינה מפילה',
  /*  ⛔ התקרה **מורמת** ולא מונמכת (סבב 71) — ⚠️ הנמכה עוברת באפליקציה
      אחת ומפילה באחרת שהחלק הפרטי שלה גבוה יותר, ⛔ ואז מוטציית-הנגד
      מודדת את גודל הקובץ ולא את ההפרש שהיא באה לבדוק. */
  [['tools/check-docs.mjs', (s) => s.replace(/const DOC_MAX_PRIVATE = (\d+);/,
      (m, v) => `const DOC_MAX_PRIVATE = ${Number(v) + 50};`)],
   ['tools/test_budget.mjs', (s) => s.replace(/const MAX_PRIVATE = (\d+);/,
      (m, v) => `const MAX_PRIVATE = ${Number(v) + 50};`)]],
  ['__none__']);

rmSync(tmp, { recursive: true, force: true });

}

console.log(`\n${fail ? '❌' : '✅'} סבב 71 (אין סתירה בין שערים) — ${pass} טענות עברו, ${fail} נכשלו`);
process.exit(fail ? 1 : 0);