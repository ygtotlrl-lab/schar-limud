#!/usr/bin/env node
/*  test_wiring.mjs — החיווט בין הכפתור למטפל ובין הקורא להגדרה.
 *
 *  **מה נאכף:** שלושה דפוסים שכולם צורה אחת של חצי-חיווט — ⛔ ערך
 *  `data-act` שאין לו מטפל במפת הפעולות · ⛔ מטפל במפה שאף כפתור אינו
 *  מייצר · ⛔ וקריאה ל-`window.X(` שאין לה הגדרה בקובץ. ⭐ הנמדד הוא
 *  **שם מול שם**: הערכים נאספים משני הצדדים ומושווים, ⛔ ולא נוכחות
 *  מחרוזת.
 *
 *  **הנימוק המדוד:** שלושתם צצו אחרי המרת הדלגציה, ⛔ ושלושתם נמצאו
 *  בסריקה ידנית ולא בשער. ⭐ נמדד על `origin/main` שלפני הסבב: קריאה
 *  אחת ל-`window.X(` בלי הגדרה — כפתור «בטל סטטוס» שהפונקציה שלו נמחקה
 *  שני סבבים קודם, ⛔ וערך `data-act` אחד שהוא מציין-מקום בהערה.
 *
 *  **מה יישבר בלעדיו:** ⛔ הכפתור זורק ⛔ והמודאל נסגר — ⚠️ והמשתמש
 *  קורא את הסגירה כהצלחה: ⭐ אין הודעת שגיאה, אין סימן, והפעולה לא
 *  התבצעה. ⛔ ובכיוון השני מטפל שאיש אינו מייצר הוא קוד מת שנקרא כיכולת.
 *
 *  **מה אינו נאכף כאן:** ⛔ שהמטפל **עושה** את מה ששמו אומר — ⚠️ הנמדד
 *  הוא החיווט בלבד; ⭐ וכן ערך `data-act` שנבנה בזמן ריצה משרשור, ⛔ שאין
 *  לו שם קבוע בטקסט ואינו נראה לשער.
 *
 *  ⛔ המוטציות אינן נכתבות לעץ — הן רצות על עותק של המחרוזת בזיכרון.
 *  ⛔ הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  file: 'index.html',
  /*  ⛔ שם מפת הפעולות — ⚠️ הוא הדבר היחיד שנבדל בין הריפו בשער הזה,
   *  ⛔ ומפה שלא נמצאה מפילה את טענה 1 ואינה מדלגת בשתיקה. */
  map: 'DOM_ACTIONS',
  /*  ⛔ שמות שהדפדפן מגדיר ואינם בקובץ — ⚠️ הרשימה פר-אפליקציה מפני
   *  שהיא נמדדת: ⛔ שם שהוכרז ואיש אינו קורא לו יורד ממנה. ⭐ כאן:
   *  רישום מאזין בלבד. */
  domGlobals: ['addEventListener'],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */
/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 82) — ⚠️ הבודק גוזר מכאן
 *  את המיפוי, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [48];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו 70% מזמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0, n = 0;
const t = (cond, m) => { n++; if (cond) console.log('  ok   ' + m);
                         else { failures++; console.error('  FAIL ' + m); } };

/* ── הסריקה — שם מול שם, ולא נוכחות מחרוזת ─────────────────────────────── */
/*  ⛔ גוף המפה נחתך בהתאמת סוגריים ⛔ ולא בחלון תווים קבוע — ⚠️ מפה שגדלה
 *  מעבר לחלון הייתה נחתכת באמצע, ⭐ והמטפלים שמתחת לחתך היו נקראים
 *  «אינם קיימים» בזמן שהם חיים. */
export function mapBody(src, mapName) {
  const at = src.indexOf('var ' + mapName + ' = {');
  if (at < 0) return '';
  let d = 0, i = src.indexOf('{', at);
  const s = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (!d) break; }
  }
  return src.slice(s, i + 1);
}

/*  ⛔ מפתח המטפל נאסף מהצורה `'שם': function` ⛔ ולא מכל מחרוזת במרכאות —
 *  ⚠️ מחרוזת בגוף מטפל אחר הייתה נספרת כמטפל, ⭐ ואז «מטפל בלי כפתור»
 *  היה מדווח שקר על כל בורר CSS שבמפה. */
export function wiring(src, mapName, globals) {
  const body = mapBody(src, mapName);
  const keys = [...new Set([...body.matchAll(/'([a-z0-9-]+)'\s*:\s*(?:async\s+)?function/g)]
                            .map((m) => m[1]))];
  const acts = [...new Set([...src.matchAll(/data-act=\\?["']([^"'\\]*)/g)].map((m) => m[1]))];
  const called = [...new Set([...src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))];
  const defined = new Set([...src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=[^=]/g)].map((m) => m[1]));
  for (const m of src.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
  return {
    keys, acts,
    noHandler:  acts.filter((a) => keys.indexOf(a) < 0),
    noProducer: keys.filter((k) => acts.indexOf(k) < 0),
    missing:    called.filter((c) => !defined.has(c) && globals.indexOf(c) < 0),
    calledGlobals: called.filter((c) => globals.indexOf(c) >= 0),
  };
}

/*  ⛔ עוטף שקורא את `APP` של הקובץ הזה — ⚠️ הקורא החיצוני אינו מכיר את
 *  שם המפה ואת רשימת הגלובלים, ⭐ ושכפולם אצלו היה מקור אמת שני. */
export const wiringHere = (src) => wiring(src, APP.map, APP.domGlobals);

/*  ⭐ `wiring` מיוצאת, ⛔ ואין לשכפל אותה ל-probe נפרד — ⚠️ שורת «פונקציה
 *  בלי קוראים» מודדת את הכיוון ההפוך מאותם נתונים, ⭐ ומימוש שני היה
 *  נסחף ומדווח ✅ על בדיוק מה שהשער כאן מפיל. ⚠️ הריצה העצמית מוגנת,
 *  ⛔ אחרת ייבוא היה מריץ את המוטציות. */
const SELF = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (SELF) {

console.log(`── שער החיווט (${APP.app}) ────────────────────────────────────────────`);
const SRC = fs.readFileSync(path.join(ROOT, APP.file), 'utf8');
const W = wiring(SRC, APP.map, APP.domGlobals);

/* ── א. שלושת הדפוסים ──────────────────────────────────────────────────── */
t(W.keys.length > 0 && W.acts.length > 0,
  `1 · מפת הפעולות ורשימת הכפתורים אינן ריקות — נמדדו ${W.keys.length} מטפלים ` +
  `ו-${W.acts.length} ערכי \`data-act\` והצפוי לפחות אחד מכל צד. ` +
  'מתקנים את שם המפה ב-`APP.map` — ⛔ מדידה על רשימה ריקה מדווחת «עבר»');

t(W.noHandler.length === 0,
  `2 · לכל ערך \`data-act\` יש מטפל — נמדדו ${W.noHandler.length} בלי מטפל מתוך ` +
  `${W.acts.length} והצפוי אפס${W.noHandler.length ? ': ' + W.noHandler.join(', ') : ''}. ` +
  'מוסיפים מטפל למפה, או מסירים את הכפתור');

t(W.noProducer.length === 0,
  `3 · לכל מטפל יש כפתור שמייצר אותו — נמדדו ${W.noProducer.length} בלי כפתור מתוך ` +
  `${W.keys.length} והצפוי אפס${W.noProducer.length ? ': ' + W.noProducer.join(', ') : ''}. ` +
  'מוחקים את המטפל, או מחזירים את הכפתור שאבד');

t(W.missing.length === 0,
  `4 · לכל \`window.X(\` יש הגדרה — נמדדו ${W.missing.length} קריאות בלי הגדרה ` +
  `והצפוי אפס${W.missing.length ? ': ' + W.missing.join(', ') : ''}. ` +
  'מחזירים את ההגדרה שנמחקה, או מסירים את הקורא');

/* ── ב. רשימת ההיתר אינה מתיישנת ───────────────────────────────────────── */
/*  ⛔ החרגה שאין לה מקרה בפועל מפילה אף היא — ⚠️ שם שנשאר ברשימה אחרי
 *  שהקורא שלו ירד הוא בדיוק השארית שהשורה באה לסלק, ⭐ ואיש אינו מודד
 *  אותה. */
{
  const stale = APP.domGlobals.filter((g) => W.calledGlobals.indexOf(g) < 0);
  t(stale.length === 0,
    `5 · כל שם ב-\`APP.domGlobals\` נקרא בפועל — נמדדו ${stale.length} מוכרזים ` +
    `וללא קורא מתוך ${APP.domGlobals.length} והצפוי אפס` +
    (stale.length ? ': ' + stale.join(', ') : '') + '. מסירים אותם מהרשימה');
}

if (RUN_MUT) {
/* ── ג. מוטציות — על מחרוזת בזיכרון, ולא על העץ ────────────────────────── */
/*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ שינוי רווח או שם היה
 *  עובר את השער בלי להוכיח דבר. */
{
  const nonce = 'zz' + Math.random().toString(36).slice(2, 8);

  /*  מ1 — ⛔ כפתור עם ערך שאין לו מטפל: חייב להפיל את טענה 2. */
  const m1 = SRC.replace('</body>', `<button data-act="${nonce}"></button>\n</body>`);
  const r1 = wiring(m1, APP.map, APP.domGlobals);
  t(r1.noHandler.length === W.noHandler.length + 1 && r1.noHandler.indexOf(nonce) >= 0,
    `מ1 · מוטציה: כפתור בלי מטפל — טענה 2 הייתה נכשלת (נמדדו ${r1.noHandler.length} ` +
    `במקום ${W.noHandler.length}). ⛔ מתקנים את איסוף ה-\`data-act\``);

  /*  מ2 — ⛔ מטפל שאין לו כפתור: חייב להפיל את טענה 3. */
  const m2 = SRC.replace('var ' + APP.map + ' = {',
                         'var ' + APP.map + ` = {\n  '${nonce}': function () { return 1; },`);
  const r2 = wiring(m2, APP.map, APP.domGlobals);
  t(r2.noProducer.length === W.noProducer.length + 1 && r2.noProducer.indexOf(nonce) >= 0,
    `מ2 · מוטציה: מטפל בלי כפתור — טענה 3 הייתה נכשלת (נמדדו ${r2.noProducer.length} ` +
    `במקום ${W.noProducer.length}). ⛔ מתקנים את איסוף מפתחות המפה`);

  /*  מ3 — ⛔ קריאה לשם שאינו מוגדר: חייבת להפיל את טענה 4. ⚠️ זו בדיוק
   *  הצורה שנמדדה בייצור — קורא ששרד את מחיקת ההגדרה. */
  const m3 = SRC.replace('</body>', `<script>window.${nonce}(1);</script>\n</body>`);
  const r3 = wiring(m3, APP.map, APP.domGlobals);
  t(r3.missing.length === W.missing.length + 1 && r3.missing.indexOf(nonce) >= 0,
    `מ3 · מוטציה: קריאה ל-\`window.X(\` בלי הגדרה — טענה 4 הייתה נכשלת ` +
    `(נמדדו ${r3.missing.length} במקום ${W.missing.length}). ⛔ מתקנים את איסוף ההגדרות`);

  /*  מ4 — ⛔ הסרת בדיקת ההגדרה: המנגנון עצמו, ⛔ ולא הקלט. */
  {
    const broken = (s) => {
      const called = [...new Set([...s.matchAll(/window\.([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))];
      /* ⛔ בלי מדידת ההגדרות — וזה השבר: כל קריאה נספרת כחסרה */
      return called.filter((c) => APP.domGlobals.indexOf(c) < 0);
    };
    t(broken(SRC).length > W.missing.length,
      `מ4 · מוטציה: השער בלי מדידת ההגדרות מדווח ${broken(SRC).length} במקום ` +
      `${W.missing.length} — טענה 4 הייתה מדווחת שקר. ⛔ מחזירים את איסוף ההגדרות`);
  }

  /*  נ1 — ⭐ מוטציית-נגד: זוג שלם שנוסף ⛔ אינו מפיל אף טענה. */
  const c1 = SRC
    .replace('var ' + APP.map + ' = {',
             'var ' + APP.map + ` = {\n  '${nonce}': function () { return 1; },`)
    .replace('</body>', `<button data-act="${nonce}"></button>\n</body>`);
  const rc1 = wiring(c1, APP.map, APP.domGlobals);
  t(rc1.noHandler.length === W.noHandler.length && rc1.noProducer.length === W.noProducer.length,
    `נ1 · ⭐ מוטציית-נגד: כפתור ומטפל שנוספו יחד ⛔ אינם מפילים את טענות 2 ו-3 ` +
    `(נמדדו ${rc1.noHandler.length} ו-${rc1.noProducer.length} והצפוי ` +
    `${W.noHandler.length} ו-${W.noProducer.length})`);

  /*  נ2 — ⭐ מוטציית-נגד: קריאה **והגדרה** יחד ⛔ אינן מפילות את טענה 4. */
  const c2 = SRC.replace('</body>',
    `<script>window.${nonce} = function () { return 1; }; window.${nonce}(1);</script>\n</body>`);
  const rc2 = wiring(c2, APP.map, APP.domGlobals);
  t(rc2.missing.length === W.missing.length,
    `נ2 · ⭐ מוטציית-נגד: קריאה שהגדרתה נוספה איתה ⛔ אינה מפילה את טענה 4 ` +
    `(נמדדו ${rc2.missing.length} והצפוי ${W.missing.length})`);
}

}

console.log(failures ? `\n✗ סבב 82 (חיווט) — ${failures} טענות נכשלו מתוך ${n}`
                     : `\n✓ סבב 82 (חיווט) — ${n} טענות עברו`);
process.exit(failures ? 1 : 0);

}
