/* ───────────────────────────────────────────────────────────────────────────
   הבדיקה העמוקה — מודול משותף לזרימה שרצה מחוץ לסט (סבב 171)

   ⛔ מה נאכף: כל שער שזהה בית-לבית בחמשת הריפו רץ בכל אחד מהם, ⚠️ וזמנו
      מושווה בין הריפו: ⭐ פער של פי שניים ומעלה באותו שער נושא נימוק מוכרז
      ב-`GAP_WHY`, ⛔ ושער שנכשל באחד מהם מפיל אף הוא.
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

/*  ⛔ פער מוכרז — ⚠️ **מה נכנס**: שם שער ⟵ הגודל שזמנו לינארי בו
 *  ⟵ ונימוקו; ⛔ **ומה מפיל**: פער בלי הכרזה, ⚠️ הכרזה לשער שאינו זהה,
 *  ⭐ ופער שנשאר גם אחרי החלוקה בגודל המוצהר — ⛔ **ההכרזה נמדדת**:
 *  זמן לבית שנבדל פי שניים הוא פער שהגודל אינו מסביר. */
export const GAP_WHY = {
  'test_caps_ui.mjs': { scale: 'src', why: 'סורק כל אתר ממשק במקור המחובר — ⛔ זמנו לינארי בגודל המקור, ⚠️ והמקור הגדול כפול מהקטן' },
  'test_caps_build.mjs': { scale: 'src', why: 'מחלץ כל גוף פונקציה מהמקור המחובר — ⛔ זמנו לינארי בגודל המקור, ⚠️ והמקור הגדול כפול מהקטן' },
  'test_sistername.mjs': { scale: 'src', why: 'סורק את המקור הגולמי מול כל שמות האחיות — ⛔ זמנו לינארי בגודל המקור, ⚠️ והמקור הגדול כפול מהקטן' },
};

/*  ⛔ הגדלים שזמן שער יכול להיות לינארי בהם — ⚠️ **המקור המחובר**:
 *  `index.html`, גיליון הסגנון ומודולי הליבה, ⭐ שהם מה שהסורקים קוראים. */
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
  const gaps = new Set();
  for (const g of gates) {
    const row = PEERS.map((r) => ({ r, ...timeGate(path.join(sibs, r), g) }));
    for (const x of row.filter((x) => x.status !== 0))
      bad(`[deep-run] ${x.r}/${g} — יצא ${x.status} והצפוי 0. מריצים אותו שם ומתקנים:\n` +
        x.out.split('\n').filter((l) => /FAIL|❌/.test(l)).slice(0, 8).join('\n'));
    const spread = (v) => Math.max(...v) / Math.max(1e-9, Math.min(...v));
    const ratio = spread(row.map((x) => Math.max(1, x.ms)));
    const decl = GAP_WHY[g];
    /*  ⛔ שער מוכרז נמדד בזמן לבית של הגודל שהוא לינארי בו — ⚠️ ולא
     *  בזמן הגולמי: ⭐ הפער שנשאר הוא הפער שהגודל אינו מסביר. */
    const norm = decl && SIZES[decl.scale] ? spread(row.map((x) => Math.max(1, x.ms) / SIZES[decl.scale](path.join(sibs, x.r)))) : ratio;
    console.log(`  ${norm >= GAP ? '⚠️' : 'ok'}   ${g} — ${row.map((x) => `${x.r} ${x.ms}`).join(' · ')} מ״ש · פי ${ratio.toFixed(2)}` +
      (decl ? ` · לבית ${decl.scale} פי ${norm.toFixed(2)}` : ''));
    if (norm >= GAP) bad(`[deep-gap] ${g} — פער של פי ${norm.toFixed(2)} והתקרה פי ${GAP}` +
      (decl ? `, ⛔ גם אחרי החלוקה ב-${decl.scale}` : ', ⛔ בלי נימוק') +
      '. מאתרים את מה שזמנו תלוי בנתוני האפליקציה, או מכריזים ב-`GAP_WHY` את הגודל שהוא לינארי בו');
    gaps.add(g);
  }
  const ghost = Object.keys(GAP_WHY).filter((g) => !gaps.has(g) || !SIZES[GAP_WHY[g].scale] || !GAP_WHY[g].why);
  if (ghost.length) bad(`[deep-gap] הכרזה שאין לה שער זהה, גודל או נימוק — ${ghost.join(' · ')}: נמדדו ${ghost.length} והצפוי אפס. מתקנים או מסירים מ-\`GAP_WHY\``);
  console.log(fail ? `\n❌ deep-check: ${fail} כשלים` : `\n✅ deep-check: ${gates.length} שערים × ${PEERS.length} ריפו, אפס פער בלי נימוק`);
  return fail;
}
