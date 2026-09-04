/* ───────────────────────────────────────────────────────────────────────────
   test_signedshared.mjs — רכיב משותף יושב בתוך בלוק חתום
   ───────────────────────────────────────────────────────────────────────────
   **מה נאכף:** פונקציה שמוגדרת בריפו הזה **וגם** בריפו אחות בגוף זהה
   בית-לבית ⛔ יושבת בתוך אחד הבלוקים החתומים שמוצהרים ב-`check-capabilities`,
   ⚠️ או מוכרזת ומנומקת ב-`APP.unsignedAllow` — ⛔ והכרזה שאין לה מקרה
   בפועל מפילה אף היא.

   **הנימוק המדוד:** `isNetErr` · `guardOnline` · `errMsg` · `withTimeout`
   הוכרזו «זהים בית-לבית» וישבו **בין** בלוקים, ⛔ ולכן אף `sha256` לא מדד
   אותם: ⚠️ `isNetErr` נכתב בשורה אחת באחת ובשש בשלוש, `guardOnline` נעדרה
   מאחת לגמרי, ו-`errMsg` נבדל בשתיים. ⭐ 15 הבלוקים כיסו 2,177 שורות
   מתוך 10,135, ⛔ וכל מה שנכתב ביניהן נסחף בלי שאיש ידע.

   **מה יישבר בלעדיו:** ⛔ שורה בטבלה שמצהירה «זהה בית-לבית» על קוד שאין
   לו חתימה היא **שורה ✅ שאינה אמת** — ⚠️ והיא הכשל החמור מכולם: ⭐ הסבב
   הבא בונה עליה, ⛔ ומגלה ארבעה מימושים שונים לאותה יכולת.

   **מה אינו נאכף כאן:** ⛔ פונקציה שגופה **נבדל** בין הריפו — ⚠️ היא אינה
   רכיב משותף לפי ההגדרה, ⭐ והשער אינו מכריע אם הייתה אמורה להיות אחד ·
   ⛔ ותוכן הבלוק מול חתימתו, שנמדד ב-`check-capabilities` · ⛔ וההשוואה
   דורשת את הריפו האחיות על הדיסק: ⚠️ כשהן חסרות היא **מדווחת ואינה
   מדלגת בשתיקה**.
   ──────────────────────────────────────────────────────────────────────── */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  name: 'schar-limud',
  /*  ⛔ תאום בלי חתימה שנשאר בכוונה — ⚠️ כל שם נושא את הסיבה, ⛔ ושם
   *  שכבר בבלוק ⛔ או שאין לו תאום **מפיל**: ⭐ רשימת-היתר שהתיישנה היא
   *  בעצמה השארית שהשער בא לסלק. ⚠️ **והיא ריקה** — ⛔ שבע הפונקציות
   *  שישבו בה נכנסו לשני בלוקים חתומים, ⭐ וריקה היא המצב הנכון: ⛔ תאום
   *  חדש נכנס לבלוק ⛔ ואינו נרשם כאן. */
  unsignedAllow: {},
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ השורות בטבלת התשתית שהקובץ הזה אוכף (סבב 72) — ⚠️ המיפוי היה
 *  חד-כיווני ב-`check-capabilities` בלבד, ⛔ ומי שערך שער כאן לא ראה
 *  אותו. ⭐ הבודק גוזר את המיפוי מכאן, ⛔ ואינו מחזיק רשימה משלו. */
export const ROWS = [52];

/*  ⛔ המוטציות אינן ברירת המחדל (סבב 92) — ⚠️ כל מוטציה היא שינוי ⟵ הרצה
 *  ⟵ שחזור, ⭐ ושני שערים לבדם היו רוב זמן הסט: ⛔ הן רצות ברמה המלאה
 *  (`--full`), בסוף הסבב ולפני מיזוג, ⚠️ ולא בכל הרצה בזמן העבודה. */
const RUN_MUT = process.env.GATE_MUT === '1';

/*  ⛔ ארבעת הריפו בשמם — ⚠️ הרשימה זהה בית-לבית בארבעת העותקים: ⭐ ריפו
 *  שיורד מכאן יורד בארבעתם באותו סבב. */
const PEERS = ['yoman-avoda', 'hanhala-ruchanit', 'schar-limud', 'gius'];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIBS = resolve(ROOT, '..');

let pass = 0, fail = 0;
const t = (n, cond, m) => { if (cond) { pass++; console.log(`  ok   ${n} · ${m}`); }
                            else { fail++; console.log(`  FAIL ${n} · ${m}`); } };

/*  ⛔ טווחי הבלוקים נגזרים מ-`check-capabilities` ⛔ ואינם מוקלדים כאן —
 *  ⚠️ רשימה שנייה של סמנים הייתה מקור אמת שני, ⭐ ובלוק שנוסף שם היה
 *  נשאר בלתי-נראה כאן. */
function signedRanges(src, capsSrc) {
  const re = /block:\s*\{[\s\S]*?start:\s*'([^']+)',[\s\S]*?end:\s*'([^']+)'/g;
  const out = []; let m, declared = 0;
  while ((m = re.exec(capsSrc)) !== null) {
    declared++;
    const i = src.indexOf(m[1]); if (i < 0) continue;      /* בלוק ב-`sw.js` */
    const j = src.indexOf(m[2], i); if (j < 0) continue;
    const k = src.indexOf('*/', j); if (k < 0) continue;
    out.push([i, k + 2]);
  }
  return { ranges: out, declared };
}

/*  ⛔ הגוף נחתך בהתאמת סוגריים ⛔ ולא בחלון תווים — ⚠️ חלון קבוע חותך
 *  פונקציה ארוכה ממנו באמצע, ⭐ ואז שני גופים שונים נראים זהים. */
function fnBodies(src) {
  const map = new Map();
  const re = /(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + (src[m.index] === '\n' ? 1 : 0);
    let i = src.indexOf('{', m.index + m[0].length - 1);
    if (i < 0) continue;
    let d = 0, j = i;
    for (; j < src.length; j++) {
      if (src[j] === '{') d++;
      else if (src[j] === '}') { d--; if (!d) { j++; break; } }
    }
    if (!map.has(m[1])) map.set(m[1], { body: src.slice(start, j), at: start });
  }
  return map;
}

/*  ⛔ הליבה — ⚠️ היא מקבלת את המקורות כפרמטרים ⛔ ואינה קוראת מהדיסק:
 *  ⭐ ולכן המוטציה מזינה לה עץ שונה ⛔ בלי לגעת בעץ האמיתי. */
function unsignedTwins(mine, ranges, peerSrcs) {
  const inBlock = (at) => ranges.some(([a, b]) => at >= a && at < b);
  const peers = peerSrcs.map(fnBodies);
  const out = [];
  for (const [name, info] of fnBodies(mine)) {
    if (inBlock(info.at)) continue;
    const twins = peers.filter((p) => p.has(name) && p.get(name).body === info.body).length;
    if (twins) out.push({ name, twins });
  }
  return out;
}

const SRC  = readFileSync(join(ROOT, 'index.html'), 'utf8');
const CAPS = readFileSync(join(ROOT, 'tools', 'check-capabilities.mjs'), 'utf8');

/* ── 1. הבלוקים החתומים נמצאו ──────────────────────────────────────────── */
const R = signedRanges(SRC, CAPS);
let n = 1;
t(n++, R.declared > 0 && R.ranges.length > 0,
  `בלוקים חתומים — נמדדו ${R.declared} מוצהרים ב-check-capabilities ו-${R.ranges.length} ` +
  'שסמניהם נמצאו ב-index.html והצפוי לפחות אחד מכל סוג. מיישרים את הסמנים לקוד');

/*  ⚠️ שורש הייחוס הוא הריפו הזה, והאחיות נמצאות לצידו — ⛔ ריפו שאינו על
 *  הדיסק **מדווח בשמו**: ⭐ ההשוואה שלא רצה נראית, ⛔ ואינה נספרת כטענה
 *  שעברה. ⚠️ והמוטציות בונות לעצמן אחות סינתטית ולכן רצות תמיד. */
const others = PEERS.filter((p) => p !== APP.name);
const have = others.filter((p) => existsSync(join(SIBS, p, 'index.html')));
const away = others.filter((p) => have.indexOf(p) < 0);

/* ── 2. תאום בלי חתימה — מוכרז, או מפיל ────────────────────────────────── */
const allow = APP.unsignedAllow || {};
let found = [];
if (!away.length) {
  const PSRC = have.map((p) => readFileSync(join(SIBS, p, 'index.html'), 'utf8'));
  found = unsignedTwins(SRC, R.ranges, PSRC);
  const undeclared = found.filter((f) => !allow[f.name]);
  const stale = Object.keys(allow).filter((x) => !found.some((f) => f.name === x));
  t(n++, undeclared.length === 0,
    `תאומים בלי חתימה ובלי הכרזה — נמדדו ${undeclared.length} והצפוי 0` +
    (undeclared.length ? ` (${undeclared.map((f) => f.name).join(', ')})` : '') +
    '. מכניסים אותם לבלוק חתום, או מכריזים עליהם ב-APP.unsignedAllow עם הנימוק');
  t(n++, stale.length === 0,
    `הכרזות שהתיישנו — נמדדו ${stale.length} והצפוי 0` +
    (stale.length ? ` (${stale.join(', ')})` : '') +
    '. מסירים מ-APP.unsignedAllow שם שכבר בבלוק או שאין לו תאום');
} else {
  console.log(`  ⚠️  ההשוואה בין הריפו לא רצה — ${away.join(' · ')} אינם על הדיסק ` +
              `לצד ${APP.name}; נמדדו ${have.length} מתוך ${others.length}. ` +
              `מריצים את הסבב עם ארבעת הריפו זה לצד זה`);
}
t(n++, Object.values(allow).every((v) => typeof v === 'string' && v.length >= 20),
  `נימוק לכל הכרזה — נמדדו ${Object.values(allow).filter((v) => typeof v === 'string' && v.length >= 20).length} ` +
  `מתוך ${Object.keys(allow).length} והצפוי כולן. כותבים בכל אחת מה נדרש כדי להוציא אותה`);

if (RUN_MUT) {
/* ── 4. מוטציה — פונקציה שיוצאת מהבלוק **חייבת** להיתפס ────────────────── */
/*  ⛔ המוטציה שוברת את המנגנון ⛔ ולא את הצורה — ⚠️ היא מוציאה גוף
 *  פונקציה מתוך בלוק חתום ומניחה אותו מחוצה לו, ⭐ בלי לשנות אף תו בגופו:
 *  ⛔ שער שמודד «יש בלוק» היה עובר עליה. ⛔ והמוטציה רצה על מחרוזת. */
/*  ⛔ האחות הסינתטית היא המקור עצמו — ⚠️ ולכן לכל פונקציה מקומית יש תאום
 *  בהגדרה, ⭐ ומה שנמדד הוא **המיקום בלבד**: ⛔ המוטציה רצה גם בעותק עץ
 *  שאין לצידו ריפו אחות. */
const SYNTH = [SRC];
{
  const before = unsignedTwins(SRC, R.ranges, SYNTH);
  const inFirst = [...fnBodies(SRC)].find(([, i]) =>
    R.ranges.some(([a, b]) => i.at >= a && i.at < b));
  if (!inFirst) {
    t(n++, false, 'המוטציה לא נתפסה — לא נמצאה פונקציה בתוך בלוק חתום ' +
                  'והצפוי לפחות אחת. מיישרים את סמני הבלוקים לקוד');
  } else {
    const [nm, info] = inFirst;
    /*  ⛔ `replace` על הגוף עצמו — ⚠️ הוא ייחודי בקובץ, ⭐ והשינוי הוא
     *  **מיקום** בלי לגעת באף תו בגוף. */
    const moved = SRC.replace(info.body, '') + '\n' + info.body + '\n';
    const R2 = signedRanges(moved, CAPS);
    const after = unsignedTwins(moved, R2.ranges, SYNTH);
    t(n++, after.some((f) => f.name === nm) && !before.some((f) => f.name === nm),
      `⭐ המוטציה: «${nm}» הוצאה מהבלוק — נמדדו ${after.length} תאומים בלי חתימה ` +
      `מול ${before.length} קודם, והשם בתוכם. הטענה על מיקום הפונקציה אמיתית`);
  }
}

/* ── 5. מוטציית-נגד — קוד חדש שאין לו תאום ⛔ אינו מפיל ─────────────────── */
/*  ⛔ שינוי חי ⛔ ולא הערה — ⚠️ פונקציה חדשה שאין לה תאום בשום ריפו היא
 *  בדיוק מה שכל עבודה באפליקציה מוסיפה, ⭐ ושער שנופל עליה חוסם עבודה. */
{
  const base = unsignedTwins(SRC, R.ranges, SYNTH);
  const grown = SRC + '\nfunction _ncSignedPing(){ return 1; }\n';
  const R3 = signedRanges(grown, CAPS);
  const after = unsignedTwins(grown, R3.ranges, SYNTH);
  t(n++, grown !== SRC && !after.some((f) => f.name === '_ncSignedPing') &&
         after.length === base.length,
    `נ1 · ⭐ מוטציית-נגד: פונקציה חדשה בלי תאום ⛔ אינה מפילה — נמדדו ${after.length} ` +
    `תאומים והצפוי ${base.length}`);
}

}

console.log(`\n${fail ? '✗' : '✓'} סבב 84 (רכיב משותף בבלוק חתום) — ` +
            `${pass} טענות עברו, ${fail} נכשלו · ` +
            `${found.length} תאומים בלי חתימה מוכרזים ומנומקים`);
process.exit(fail ? 1 : 0);
