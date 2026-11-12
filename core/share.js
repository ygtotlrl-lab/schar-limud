// core/share.js — שליחת קובץ שהאפליקציה יצרה (תמונה, PDF או גיליון): במעטפת — גשר השיתוף, ובדפדפן — גיליון השיתוף, ובלעדיו הורדה;
// ומסמך (printFile): במעטפת — גשר ההדפסה, שכותב PDF ומשתף אותו, ובדפדפן — חלון ההדפסה.
// החתימות הן חוזה עם Java (tools/java/MainActivity.java.in — shareFile · shareFiles · printHtml) ומשתנות בשני הצדדים יחד.

// AndroidShareBridge (addWebMessageListener) נוסה ראשון — בו WebView עצמו אוכף את רשימת המקורות;
// AndroidShare (addJavascriptInterface) נשאר ל-WebView ישן מ-88, והמעטפת מאמתת בו את מקור הדף.
function _bridge(b64, mime, name) {
  try {
    var br = window.AndroidShareBridge;
    if (br && typeof br.postMessage === 'function') {
      br.postMessage(JSON.stringify({ data: b64, mime: mime, name: name || '' }));
      return true;
    }
    if (window.AndroidShare && typeof window.AndroidShare.shareFile === 'function') {
      window.AndroidShare.shareFile(b64, mime);
      return true;
    }
  } catch (e) { /* נופל לשיתוף של הדפדפן */ }
  return false;
}

function _blob(b64, mime) {
  var bin = atob(b64), u = new Uint8Array(bin.length), i;
  for (i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: mime });
}

// הורדה בלבד, בלי קישור-עומק ליעד — קישור כזה הוא מסלול שיתוף שני שאיש אינו בודק, ונשבר בשקט.
function _download(blob, name) {
  var url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
}

// אין כאן פרמטר יעד — בורר המערכת בוחר.
// שם הקובץ — בלי תווים שמערכת קבצים דוחה: גרשיים של שנה עברית («תשפ"ז») הופכים בכרום את השם כולו ל-download.
function _safeName(name) {
  var n = String(name == null ? '' : name).replace(/"/g, '״').replace(/'/g, '׳')
    .replace(/[\\/:*?<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return n.slice(0, 120) || 'file';
}

function shareFile(b64, mime, name) {
  name = _safeName(name);
  if (_bridge(b64, mime, name)) return;
  var blob = _blob(b64, mime);
  try {
    var file = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).catch(function (err) {
        if (err && err.name !== 'AbortError') _download(blob, name);
      });
      return;
    }
  } catch (e) { /* הורדה */ }
  _download(blob, name);
}

// כמה קבצים בשיתוף אחד — list: [{ b64, mime, name }] (דוח שחולק לכמה תמונות).
// במעטפת — גשר הקבצים (AndroidShareFiles), ובו בורר אחד לכולם; מעטפת שאין בה גשר כזה — גרסה ישנה: שגיאה שמבקשת עדכון, כמו בהדפסה;
// בדפדפן — גיליון השיתוף עם כל הקבצים, ובלעדיו הורדה של כל קובץ בשמו.
function shareFiles(list) {
  list = (list || []).map(function (f) { return { b64: f.b64, mime: f.mime, name: _safeName(f.name) }; });
  if (!list.length) return;
  if (list.length === 1) { shareFile(list[0].b64, list[0].mime, list[0].name); return; }
  var mb = window.AndroidShareFiles;
  if (mb && typeof mb.postMessage === 'function') {
    mb.postMessage(JSON.stringify({ files: list.map(function (f) { return { data: f.b64, mime: f.mime, name: f.name }; }) }));
    return;
  }
  if (window.AndroidShareBridge || window.AndroidShare) throw new Error('יש לעדכן את האפליקציה המותקנת');
  var blobs = list.map(function (f) { return _blob(f.b64, f.mime); });
  function each() { blobs.forEach(function (b, i) { setTimeout(function () { _download(b, list[i].name); }, i * 400); }); }
  try {
    var files = blobs.map(function (b, i) { return new File([b], list[i].name, { type: list[i].mime }); });
    if (navigator.canShare && navigator.canShare({ files: files })) {
      navigator.share({ files: files }).catch(function (err) { if (err && err.name !== 'AbortError') each(); });
      return;
    }
  } catch (e) { /* הורדה */ }
  each();
}

// קובץ שנבנה כ-Blob (גיליון, CSV) — אותו מסלול, דרך base64.
function shareBlob(blob, mime, name) {
  var r = new FileReader();
  r.onload = function () { shareFile(String(r.result).split(',')[1] || '', mime, name); };
  r.readAsDataURL(blob);
}

// מסמך — דף HTML שלם, שהמעטפת מדפיסה לקובץ PDF ומשתפת; בדפדפן — חלון ההדפסה, ובו «שמירה כ-PDF».
// מעטפת שיש בה גשר שיתוף ואין בה גשר הדפסה — גרסה ישנה: הדפסת הדפדפן אינה עובדת בה, ולכן שגיאה שמבקשת עדכון.
function printFile(html, name) {
  name = _safeName(name);
  var br = window.AndroidPrintBridge;
  if (br && typeof br.postMessage === 'function') { br.postMessage(JSON.stringify({ html: html, name: name })); return; }
  if (window.AndroidShare && typeof window.AndroidShare.printHtml === 'function') { window.AndroidShare.printHtml(html, name); return; }
  if (window.AndroidShareBridge || window.AndroidShare) throw new Error('יש לעדכן את האפליקציה המותקנת');
  var f = document.createElement('iframe');
  f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.onload = function () {
    setTimeout(function () {
      try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { console.error('[print]', e); }
      setTimeout(function () { f.remove(); }, 60000);
    }, 300);
  };
  f.srcdoc = html;
  document.body.appendChild(f);
}

export { printFile, shareBlob, shareFile, shareFiles };
