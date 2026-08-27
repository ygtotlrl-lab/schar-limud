#!/usr/bin/env node
/*  שער כללי הברזל 21–24 — סבב 65.
 *
 *  ⚠️ **הפער שנמדד (סבב 65):** ארבעה כללי תיעוד נולדו בסבב הזה, ⛔ ושלושה
 *  מהם ניתנים לאכיפה מכנית. כלל שאין לו שער חוזר תוך סבבים ספורים — זה
 *  נמדד על 23 הצהרות ה-SHARED, על חמש הצהרות הגרסה, ועל 49 שורות טבלאות
 *  הפרמטרים ששרדו שלושה גיזומים.
 *
 *  ⛔ **ומה שאינו ניתן לאכיפה נרשם כאן במפורש ולא נשמט בשתיקה** — ר'
 *  הפרק «מה אינו נאכף» בסוף הקובץ.
 *
 *  הקובץ זהה בית-לבית בארבעת הריפו פרט לבלוק `APP` שבראשו.
 */
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── APP — הדבר היחיד שנבדל בין הריפו ──────────────────────────────────── */
const APP = {
  app: 'schar-limud',
  cachePrefix: 'schar-limud-',
  /*  מחלקות CSS שמורכבות בזמן ריצה (`'role-' + role`) — ⛔ הן נראות מתות
   *  לסורק סטטי, והן חיות. ⚠️ כל שורה כאן היא הצהרה שאדם מתחזק. */
  dynamicClasses: [],
};
/* ── סוף APP ───────────────────────────────────────────────────────────── */

/*  ⛔ שורש נדרס בסביבת מוטציה (סבב 65) — המוטציות רצות על עותק בתיקייה
 *  זמנית ולא על העץ, והדרך היחידה להריץ את השער **האמיתי** עליו היא
 *  להצביע אותו לשם. */
const ROOT = process.env.R65_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => fs.readFileSync(join(ROOT, f), 'utf8');
let n = 0, bad = 0;
const ok = (m) => { n++; console.log(`  ok   ${m}`); };
const no = (m) => { n++; bad++; console.error(`  FAIL ${m}`); };
const t  = (c, m) => (c ? ok(m) : no(m));

console.log('· ' + APP.app + ' — סבב 65: כללי הברזל 21–24');

const DOC = rd('CLAUDE.md');
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
  t(/shared-modules-index/.test(DOC), '22ב · אינדקס אחד-עשר המודולים קיים');
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
  /*  ⛔ `CONTEXT.md` מחזיק לקוח וצורך בלבד — כל כותרת נוספת היא עותק שני
   *  של `CLAUDE.md` או של `README.md`, וזה מה שנסחף. */
  const CTX_OK = ['## פרטי ריפו', '## ⚠️ Supabase — GRANT חובה לטבלאות חדשות', '## מצב נוכחי'];
  const ctx = rd('CONTEXT.md').split('\n').filter((l) => l.startsWith('## '));
  const extra = ctx.filter((h) => !CTX_OK.some((k) => h.startsWith(k.slice(0, 12))));
  t(extra.length === 0, `23ב · CONTEXT.md — שלוש הכותרות בלבד${extra.length ? ' — ' + extra.join(' / ') : ''}`);
}

/* ── כלל 24 — הבדל מכוון מנומק במקום שבו הוא נראה ──────────────────────── */
{
  /*  ⛔ הפניה מנקודת הכניסה של כל מודול משותף (סבב 65) — בלעדיה הקורא
   *  שיושב בקוד אינו יודע שיש שער שאוכף את הבלוק הזה. */
  const SRC = rd('index.html') + '\n' + rd('sw.js');
  const marks = (SRC.match(/— מודול משותף \(סבב \d+/g) || []).length;
  const refs  = (SRC.match(/shared-modules-index/g) || []).length;
  t(refs >= marks && marks > 0,
    `24א · הפניה ל-\`shared-modules-index\` בכל נקודת כניסה (${refs}/${marks})`);
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
/* ── המוטציות — ⛔ שער בלי מוטציה הוא הצהרה (סבב 65) ────────────────────── */
/*  ⚠️ כל מוטציה רצה על **עותק בתיקייה זמנית** ומריצה את השער האמיתי עליו;
 *  הצלחה = השער נפל. ⛔ המוטציות אינן נכתבות לעץ (הלקח של סבב 42ג).
 *  ⭐ ולצידן מוטציות-נגד: שינוי שאסור לו להפיל — הוא מה שמוכיח שהשער
 *  מודד את מה שהוא טוען ולא סופר גולמית. */
if (!process.env.R65_ROOT) {
  const os = await import('node:os');
  const { spawnSync } = await import('node:child_process');
  const SELF = fileURLToPath(import.meta.url);
  const FILES = ['CLAUDE.md', 'CONTEXT.md', 'README.md', 'index.html', 'sw.js',
                 'tools/check-comments.mjs'];
  const fails = (mut) => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'r65-'));
    try {
      fs.mkdirSync(join(dir, 'tools'));
      for (const f of FILES) fs.writeFileSync(join(dir, f), mut[f] !== undefined ? mut[f] : rd(f));
      const r = spawnSync(process.execPath, [SELF],
        { env: { ...process.env, R65_ROOT: dir }, encoding: 'utf8' });
      return r.status !== 0;
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  };
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

if (bad) { console.error(`\n✗ ${APP.app}: ${n} טענות, ${bad} נכשלו`); process.exit(1); }
console.log(`\n✓ סבב 65 (כללי הברזל 21–24) — ${n} טענות עברו, 0 נכשלו`);
