#!/usr/bin/env node
/*  סבב 64 — העברת מזהה ל-DOM.
 *
 *  ⭐ **מה נשמר כאן:** מזהה רשומה הוא **טקסט** מסבב 38, ולכן מזהה שנכנס
 *  ל-`onclick` או לבורר `querySelector` חייב לעבור ב-`idArg` — שמצטט
 *  אותו ומסנן ברשימת-היתר של תווים.
 *
 *  ⚠️ **הכשל שהוליד את השער היה שקט בשתי אפליקציות בבת אחת** (סבב 64):
 *  ביומן `editEntry`/`arcEditEntry` **חיפשו** מזהה בלי מרכאות בזמן
 *  שהצד שיוצר את המאפיין כבר עטף אותו — הבורר לא התאים והפונקציה חזרה
 *  בלי לעשות דבר; ובהנהלה ארבעה אתרים **יצרו** את המאפיין בלי מרכאות,
 *  ותלמידים מקבלים uuid מסבב 37 — הכפתור פשוט מת. ⛔ בשני הכיוונים אין
 *  שגיאה ואין תגובה, ולכן שער ולא בדיקה בעין.
 *
 *  ⛔ **מה שהשער בודק הוא המקום שבו המזהה הופך לטוקן חשוף** — אופרנד
 *  שמשורשר מיד אחרי `('` או `,'`, כלומר נוחת בקוד ה-JS של המאפיין בלי
 *  מרכאות סביבו. ⚠️ אופרנד שנוחת **בתוך** מרכאות (הצורה `\''+x+'\'`)
 *  אינו נפגע ואינו נספר כהפרה — הוא מצוטט, גם אם לא דרך `idArg`.
 *
 *  ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג).
 *
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import fs from 'node:fs';
import path from 'node:path';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'index.html',
  /*  ⚠️ `sites` — כמה אתרי העברת-מזהה נמדדו כאן. ⛔ אפס אינו כישלון:
   *  יש אפליקציות שאינן מעבירות מזהה לתוך ביטוי JS במארקאפ כלל, והן
   *  מסומנות «לא רלוונטי» בשורה 45 שבמטריצה. מה שכן כישלון הוא אתר
   *  שקיים ואינו עטוף. */
  sites: 0,
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

const root = path.resolve(process.argv[2] || path.join(import.meta.dirname, '..'));
let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  ok   ' + m); };
const bad = (m) => { fail++; console.log('  FAIL ' + m); };

/* ── הסרת הערות בלבד — מחרוזות נשמרות, הן ההקשר עצמו ───────────────────── */
function stripComments(t) {
  let out = '', i = 0, n = t.length;
  while (i < n) {
    const c = t[i], c2 = t[i + 1];
    /*  ⚠️ הערה מוחלפת ברווחים ו**שורות החדשה נשמרות** (סבב 64) — בלי זה
     *  מספרי השורות שהשער מדפיס מצביעים על שורה אחרת בקובץ.            */
    if (c === '/' && c2 === '/') { while (i < n && t[i] !== '\n') { out += ' '; i++; } continue; }
    if (c === '/' && c2 === '*') {
      const e = t.indexOf('*/', i + 2); const to = e < 0 ? n : e + 2;
      for (; i < to; i++) out += (t[i] === '\n' ? '\n' : ' ');
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {          // מחרוזת — מועתקת כמות שהיא
      const q = c; out += c; i++;
      while (i < n) {
        if (t[i] === '\\') { out += t[i] + (t[i + 1] || ''); i += 2; continue; }
        out += t[i];
        if (t[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/*  אופרנד שנראה כמו מזהה: הסגמנט האחרון מסתיים ב-`id`.
 *  ⚠️ נבדק על הסגמנט האחרון ולא על המחרוזת כולה — `rec.id` הוא מזהה,
 *  `idx` אינו.                                                          */
const OPERAND = /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)/;
const looksLikeId = (expr) => {
  const last = expr.split('.').pop().trim();
  return /id$/i.test(last);
};

/*  ⛔ הגבול המסוכן: `('` או `,'` ואז `+` ואז האופרנד. שם המחרוזת
 *  **נסגרת** מיד אחרי סוגר או פסיק, ולכן האופרנד נוחת כטוקן חשוף.
 *  ⚠️ הצורה המצוטטת `\''+x+'\'` אינה נתפסת כאן בכוונה: לפני ה-`'`
 *  הסוגר יש `\'`, כלומר גרש שנשאר **בתוך** המאפיין.                    */
const RE_BARE = new RegExp("[(,]'\\s*\\+\\s*" + OPERAND.source, 'g');

function scan(text) {
  const code = stripComments(text);
  const hits = [];
  let m;
  RE_BARE.lastIndex = 0;
  while ((m = RE_BARE.exec(code)) !== null) {
    const expr = m[1];
    const after = code.slice(m.index + m[0].length, m.index + m[0].length + 1);
    if (expr === 'idArg' && after === '(') continue;        // עטוף — תקין
    if (!looksLikeId(expr)) continue;                       // אינו מזהה
    const line = code.slice(0, m.index).split('\n').length;
    hits.push({ line, expr });
  }
  return hits;
}

function wrapped(text) {
  const code = stripComments(text);
  const re = /[(,]'\s*\+\s*idArg\s*\(/g;
  return (code.match(re) || []).length;
}

console.log(`\n— סבב 64 · העברת מזהה ל-DOM (${APP.app}) —`);
const src = fs.readFileSync(path.join(root, APP.file), 'utf8');

/* ── א. אין אף אתר חשוף ────────────────────────────────────────────────── */
const bare = scan(src);
if (bare.length === 0) ok('1 · ⛔ אין מזהה שנכנס למארקאפ או לבורר בלי `idArg`');
else bad('1 · ⛔ ' + bare.length + ' מזהים חשופים: ' +
         bare.slice(0, 6).map(h => `שורה ${h.line} (${h.expr})`).join(' · '));

/* ── ב. וכמות האתרים העטופים תואמת למדידה שב-APP ───────────────────────── */
const w = wrapped(src);
if (w === APP.sites) ok(`2 · ⭐ ${w} אתרי העברת-מזהה, כולם עטופים — תואם למדידה`);
else bad(`2 · מספר האתרים העטופים הוא ${w} ולא ${APP.sites} שב-APP — ` +
         'אתר נוסף או שהוסר; יש למדוד מחדש ולעדכן.');

/* ── ג. `idArg` קיים ומצטט ─────────────────────────────────────────────── */
const m = src.match(/function idArg\(v\)[\s\S]*?\n\}/);
if (!m) bad('3 · ⛔ `idArg` אינו מוגדר — הכלל בלי מנגנון');
else {
  const fn = new Function(m[0] + '; return idArg;')();
  const cases = [
    ['a1b2c3d4-e5f6-4789-abcd-0123456789ab', "'a1b2c3d4-e5f6-4789-abcd-0123456789ab'"],
    ['1787654321098', "'1787654321098'"],
    [null, "''"],
    ["x')+alert(1)+('", "'xalert1'"],
  ];
  let good = true;
  for (const [inp, exp] of cases) if (fn(inp) !== exp) { good = false; bad(`3 · idArg(${inp}) = ${fn(inp)} ולא ${exp}`); }
  if (good) ok('3 · ⛔ `idArg` מצטט תמיד, ומסנן ברשימת-היתר — גם על ניסיון הזרקה');
}

/* ── ד. מוטציות ────────────────────────────────────────────────────────── */
console.log('  — מוטציות —');

/*  מוטציה 1 — הסרת `idArg` מאתר קיים. ⛔ חייבת להפיל את טענה 1.        */
if (APP.sites > 0) {
  const mut = src.replace(/([(,]'\s*\+\s*)idArg\s*\(\s*([^)]*?)\s*\)/, '$1$2');
  const h = scan(mut);
  if (h.length === bare.length + 1) ok('4 · מוטציה: הסרת `idArg` מאתר אחד — טענה 1 הייתה נכשלת');
  else bad('4 · ⛔ הסרת `idArg` לא נתפסה — השער עיוור בדיוק לבאג שהוליד אותו');
} else {
  ok('4 · ⚠️ אין אתרים כאן — מוטציית ההסרה אינה רלוונטית (ר' + "'" + 'לא רלוונטי' + "'" + ' במטריצה)');
}

/*  מוטציה 2 — `querySelector` חדש בלי עטיפה. ⛔ חייבת להפיל.            */
const injected = src.replace(
  '</script>',
  "var _m = document.querySelector('[onclick*=\"zap(' + rec.id + ')\"]');\n</script>");
if (scan(injected).length === bare.length + 1) ok('5 · מוטציה: `querySelector` חדש בלי עטיפה — נתפס');
else bad('5 · ⛔ בורר חדש בלי עטיפה לא נתפס');

/*  מוטציית-נגד — קוד תקין אינו מפיל. ⛔ בלעדיה השער עלול להיות
 *  «נכשל תמיד», וזה נראה כמו הגנה ואינו הגנה.                          */
const clean = src.replace(
  '</script>',
  "var _c = document.querySelector('[onclick*=\"zap(' + idArg(rec.id) + ')\"]');\n</script>");
if (scan(clean).length === bare.length) ok('6 · ⭐ מוטציית-נגד: בורר חדש **עם** עטיפה אינו מפיל');
else bad('6 · ⛔ קוד תקין נתפס כהפרה — השער מדווח שקר');

/*  מוטציית-נגד שנייה — אופרנד שאינו מזהה אינו נספר.                    */
const noise = src.replace('</script>', "var _n = f('a(' + idx + ')');\n</script>");
if (scan(noise).length === bare.length) ok('7 · ⭐ מוטציית-נגד: אופרנד שאינו מזהה (`idx`) אינו נספר');
else bad('7 · ⛔ `idx` נספר כמזהה — הבדיקה רחבה מדי');

console.log(`${fail ? '✗' : '✓'} סבב 64 (העברת מזהה ל-DOM) — ${pass} טענות עברו, ${fail} נכשלו\n`);
process.exit(fail ? 1 : 0);
