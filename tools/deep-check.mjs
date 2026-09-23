/* ───────────────────────────────────────────────────────────────────────────
   הבדיקה העמוקה — מודול משותף לזרימה שרצה מחוץ לסט (סבב 171)

   ⛔ מה נאכף: כל שער שזהה בית-לבית בחמשת הריפו רץ בכל אחד מהם, ⚠️ וזמנו
      מושווה בין הריפו **בשני יחסים תמיד** — ⭐ הגולמי, ⛔ והזמן לבית של
      המקור המחובר: ⚠️ שער עובר אם אחד מהם מתחת לסף, ⭐ והפלט אומר איזה ·
      ⛔ ושער שנכשל באחד מהם מפיל אף הוא.
   ⚠️ הנימוק המדוד: שלוש הרצות לכל שער משותף בכל הריפו ארוכות מהסט כולו —
      ⛔ ולכן ההשוואה אינה בסט, ⭐ והיא רצה בזרימה שמופעלת ביד לפני המיזוג.
   ⛔ מה יישבר בלעדיו: שער שזמנו תלוי בנתוני האפליקציה נראה תקין בכל ריפו
      בנפרד, ⚠️ והפער נראה רק בהשוואה — ⭐ שאיש אינו עושה.
   ⭐ מה אינו נאכף כאן: **שער שאינו זהה בית-לבית** — ⛔ אין מול מה להשוות
      את זמנו, ⚠️ שהוא מודד דבר אחר בכל ריפו · ⛔ והמודול אינו מריץ את
      עצמו: ⭐ הזרימה קוראת לו בשמו.
   ──────────────────────────────────────────────────────────────────────── */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PEERS } from './peers.mjs';

/*  ⛔ הגודל שזמן שער לינארי בו — ⚠️ **המקור המחובר**: `index.html`,
 *  גיליון הסגנון ומודולי הליבה, ⭐ שהם מה שהסורקים קוראים. ⛔ **ואין בסיס
 *  שני** — ⚠️ שער שאינו לינארי במקור נמדד ביחס הגולמי, ⭐ ושני היחסים
 *  נמדדים לכל שער: ⛔ ואין רשימה שמכריזה איזה חל על מי — ⚠️ הכרזה כזו
 *  היא מקור אמת שני לשאלה שהמדידה עונה עליה. */
const SIZES = {
  src: (repo) => ['index.html', 'app.css']
    .concat(fs.existsSync(path.join(repo, 'core'))
      ? fs.readdirSync(path.join(repo, 'core')).filter((f) => f.endsWith('.js')).map((f) => 'core/' + f) : [])
    .filter((f) => fs.existsSync(path.join(repo, f)))
    .reduce((n, f) => n + fs.statSync(path.join(repo, f)).size, 0),
};

/*  ⛔ פער של פי שניים — ⚠️ הסף הוא התקן ⛔ ואינו נבחר כאן. */
const GAP = 2;
/*  ⛔ שלוש הרצות, והראשונה נזרקת — ⚠️ היא כוללת את טעינת Node ואת מטמון
 *  הדיסק, ⭐ והמינימום של השתיים שאחריה הוא הזמן. */
const RUNS = 3;

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

/*  ⛔ השערים הזהים נגזרים מהעץ ⛔ ואינם רשימה — ⚠️ שער שנעשה זהה נכנס
 *  מעצמו, ⭐ ושער שנבדל יוצא מעצמו. */
export function identicalGates(sibs) {
  const tools = (r) => path.join(sibs, r, 'tools');
  return fs.readdirSync(tools(PEERS[0]))
    .filter((f) => /^(test_|check-).*\.mjs$/.test(f))
    .filter((f) => PEERS.every((r) => fs.existsSync(path.join(tools(r), f))))
    .filter((f) => new Set(PEERS.map((r) => sha(path.join(tools(r), f)))).size === 1)
    .sort();
}

/*  ⛔ טווח הריצפה נקרא מהמריץ של אותו ריפו — ⚠️ ולא מוקלד כאן: ⭐ שער
 *  שמספר טענותיו תלוי באחיות רץ כאן בדיוק כפי שהוא רץ בסט, ⛔ ובלעדיו
 *  הבדיקה העמוקה הייתה מפילה את מה שהסט מתיר. */
function floorRange(repo, gate) {
  const src = fs.readFileSync(path.join(repo, 'tools', 'check-js.mjs'), 'utf8');
  const m = new RegExp(`'${gate.replace(/\.mjs$/, '')}':\\s*'(\\d+-\\d+) —`).exec(src);
  return m ? m[1] : '';
}

function timeGate(repo, gate) {
  const ms = [];
  const range = floorRange(repo, gate);
  let status = 0, out = '';
  for (let i = 0; i < RUNS; i++) {
    const t0 = process.hrtime.bigint();
    const r = spawnSync(process.execPath, ['tools/' + gate], {
      cwd: repo, encoding: 'utf8', env: { ...process.env, GATE_MUT: '1', GATE_FLOOR_RANGE: range }, maxBuffer: 1 << 26,
    });
    ms.push(Number(process.hrtime.bigint() - t0) / 1e6);
    if (r.status !== 0) { status = r.status; out = (r.stdout || '') + (r.stderr || ''); }
  }
  return { ms: Math.round(Math.min(...ms.slice(1))), status, out };
}

/*  ⛔ הריצה עצמה — ⚠️ מחזירה את מספר הכשלים, ⭐ והזרימה נכשלת כשהוא אינו אפס. */
export function deepCheck(sibs) {
  let fail = 0;
  const bad = (m) => { fail++; console.error('  FAIL ' + m); };
  const missing = PEERS.filter((r) => !fs.existsSync(path.join(sibs, r, 'tools')));
  if (missing.length) {
    bad(`[deep-sibs] הריפו האחיות — חסרות ${missing.join(' · ')} והצפוי אפס. משכפלים את כולן זו לצד זו`);
    return fail;
  }
  const gates = identicalGates(sibs);
  console.log(`[deep-check] ${gates.length} שערים זהים בית-לבית ב-${PEERS.length} הריפו: ${gates.join(' · ')}`);
  const ratios = [];
  for (const g of gates) {
    const row = PEERS.map((r) => ({ r, ...timeGate(path.join(sibs, r), g) }));
    for (const x of row.filter((x) => x.status !== 0))
      bad(`[deep-run] ${x.r}/${g} — יצא ${x.status} והצפוי 0. מריצים אותו שם ומתקנים:\n` +
        x.out.split('\n').filter((l) => /FAIL|❌/.test(l)).slice(0, 8).join('\n'));
    const spread = (v) => Math.max(...v) / Math.max(1e-9, Math.min(...v));
    /*  ⛔ שני היחסים נמדדים תמיד — ⚠️ הגולמי, ⭐ והזמן לבית של המקור
     *  המחובר: ⛔ שער עובר אם אחד מהם מתחת לסף, ⚠️ והפלט אומר איזה —
     *  ⭐ פער שנשאר בשניהם הוא פער שהגודל אינו מסביר. */
    const raw = spread(row.map((x) => Math.max(1, x.ms)));
    const norm = spread(row.map((x) => Math.max(1, x.ms) / Math.max(1, SIZES.src(path.join(sibs, x.r)))));
    const by = raw < GAP ? 'גולמי' : norm < GAP ? 'לבית' : '';
    ratios.push({ g, raw, norm, by });
    console.log(`  ${by ? 'ok' : '⚠️'}   ${g} — ${row.map((x) => `${x.r} ${x.ms}`).join(' · ')} מ״ש · ` +
      `גולמי פי ${raw.toFixed(2)} · לבית פי ${norm.toFixed(2)}${by ? ` · עבר ב${by}` : ''}`);
    if (!by) bad(`[deep-gap] ${g} — גולמי פי ${raw.toFixed(2)} ולבית פי ${norm.toFixed(2)}, והתקרה פי ${GAP} ` +
      'בשניהם. מאתרים את מה שזמנו תלוי בנתוני האפליקציה ואינו גודל המקור');
  }
  const cnt = (k) => ratios.filter((x) => x.by === k).length;
  console.log(fail ? `\n❌ deep-check: ${fail} כשלים`
    : `\n✅ deep-check: ${gates.length} שערים × ${PEERS.length} ריפו — ${cnt('גולמי')} עברו ביחס הגולמי ` +
      `ו-${cnt('לבית')} ביחס לבית, ואפס בלי אחד מהם`);
  return fail;
}
