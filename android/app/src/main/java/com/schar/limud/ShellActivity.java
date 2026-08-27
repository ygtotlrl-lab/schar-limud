package com.schar.limud;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/*  ⛔ ה-javadoc כאן נשאר באנגלית — חריגה מנומקת (סבב 67, כלל ברזל 11):
 *  זהו תקן Java, הכלים שקוראים אותו מצפים לאנגלית, והוא זהה בארבע
 *  המעטפות. ⛔ שאר ההערות בארגון בעברית. */
/**
 * ══════════════════════════════════════════════════════════════════════════
 * The organisation's WebView shell — the shared core (round 41).
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This file is byte-for-byte identical in all four repos apart from its
 * {@code package} line, and {@code tools/test_round40_shell.mjs} enforces that
 * with a signature. Everything that differs between the apps — the URL, the
 * name shown on the offline page, the accent colour, and yoman-avoda's share
 * bridge — lives in the per-app {@link MainActivity} that extends this class.
 *
 * <p><b>Why a WebView and never a Trusted Web Activity.</b> A TWA runs the site
 * inside Chrome, and the content filters installed on the users' devices block
 * Chrome, so a TWA build never opens. This was measured, not assumed: the
 * PWABuilder TWA of gius simply did not launch. A plain WebView renders
 * in-process and is not affected.
 *
 * <p><b>The shell loads the live site over the network, and there are no bundled
 * assets — on purpose.</b> A file:// fallback copy would live in a <i>different
 * storage origin</i> from the https site, so anything typed into it offline
 * would land in a localStorage partition the online app never reads: silent
 * data loss. It would also be a second source of truth that only ever goes
 * stale. Web releases therefore reach installed devices the moment GitHub Pages
 * updates, with no new APK — the site's service worker keeps it working offline
 * afterwards, exactly as it does in a browser.
 *
 * <p><b>There is no native bridge here, on purpose.</b> A bridge on a remotely
 * loaded page is reach handed to whoever serves the page. Only yoman-avoda has
 * one, because only its page shares a report image, and it is guarded twice
 * over — see MainActivity there. If a bridge is ever needed elsewhere, copy
 * that double-guarded pattern (addWebMessageListener + an origin allow-list);
 * never a bare addJavascriptInterface.
 *
 * <p>⛔ Nothing app-specific belongs in this file. A value that differs between
 * the apps goes through one of the abstract methods below; a behaviour only one
 * app needs goes through {@link #installBridge()} or
 * {@link #onShellNavigation(String)}. Anything else re-creates the four
 * free-floating copies this extraction replaced.
 */
public abstract class ShellActivity extends Activity {

    private static final int FILE_CHOOSER_REQUEST = 1001;

    /** The live site this shell loads. */
    protected abstract String appUrl();

    /**
     * The first sentence of the offline page, in Hebrew and complete.
     *
     * <p>⚠️ The whole sentence and not just the app name: the verb agrees with
     * the name's gender («הנהלה רוחנית לא הצליחה» vs «יומן עבודה לא הצליח»),
     * so a name-only placeholder would produce broken Hebrew in two of the four.
     */
    protected abstract String offlineLine();

    /** Accent colour of the offline page's retry button, as a CSS hex value. */
    protected abstract String accentColor();

    /** Attach a native bridge. Default: none — overridden only where one exists. */
    protected void installBridge() { }

    /** Called on every navigation, start and finish. Default: nothing. */
    protected void onShellNavigation(String url) { }

    protected WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    /** true once any real page has painted — keeps a late error from wiping a live app. */
    private boolean loadedOnce = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage — the app's local copy lives here
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // The site is https-only, so there is no reason to allow mixed content wholesale.
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        // No file:// or content:// access is needed — nothing is loaded from disk.
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        webView.setWebViewClient(new ShellWebViewClient());

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView wv, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (filePathCallback != null) { filePathCallback.onReceiveValue(null); }
                filePathCallback = cb;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        installBridge();

        // restoreState() returns null when there was no history to restore — then
        // (and on a normal cold start) load the site.
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(appUrl());
        } else {
            loadedOnce = true;
        }
    }

    private class ShellWebViewClient extends WebViewClient {

        // ⛔ http/https ALWAYS stays inside the WebView. Handing a web URL to the system
        // browser would land the user in Chrome, which the content filters on their
        // devices block — the very failure that made the TWA build unusable. Everything
        // else (tel:, mailto:, whatsapp:, …) has no renderer here and goes to the system.
        @Override
        public boolean shouldOverrideUrlLoading(WebView wv, WebResourceRequest request) {
            return handleUrl(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView wv, String url) {
            return handleUrl(Uri.parse(url));
        }

        private boolean handleUrl(Uri uri) {
            String scheme = uri.getScheme();
            if (scheme == null) return false;
            if (scheme.equals("http") || scheme.equals("https")) return false;
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                // ⛔ אין FLAG_ACTIVITY_NEW_TASK מהקשר Activity חי (סבב 58) — ר' share-bridge-rule ב-CLAUDE.md
                startActivity(intent);
            } catch (ActivityNotFoundException e) {
                Toast.makeText(ShellActivity.this, "אין אפליקציה שיודעת לפתוח את הקישור", Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        @Override
        public void onPageStarted(WebView wv, String url, android.graphics.Bitmap favicon) {
            onShellNavigation(url);
        }

        @Override
        public void onPageFinished(WebView wv, String url) {
            onShellNavigation(url);
            if (url != null && !url.startsWith("data:")) loadedOnce = true;
        }

        @Override
        public void onReceivedError(WebView wv, WebResourceRequest request, WebResourceError error) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request.isForMainFrame()) {
                showOfflinePage();
            }
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView wv, int errorCode, String description, String failingUrl) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) showOfflinePage();
        }
    }

    /**
     * Cold start with no network and nothing in the service-worker cache. Once the app has
     * loaded once, the service worker answers offline and this never runs — so it only
     * shows while the shell is still empty.
     *
     * <p>⛔ Served as text/html through loadDataWithBaseURL, never as a plain string:
     * a page body without a content type is not a message to the user.
     */
    protected void showOfflinePage() {
        if (loadedOnce) return;
        String html =
            "<!doctype html><html lang='he' dir='rtl'><head>"
            + "<meta charset='utf-8'>"
            + "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<style>"
            + "body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;"
            + "justify-content:center;gap:18px;background:#f4f6f9;color:#0f172a;text-align:center;padding:24px;"
            + "font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif}"
            + "h1{font-size:20px;margin:0}p{margin:0;color:#475569;line-height:1.6}"
            + "a{background:" + accentColor() + ";color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700}"
            + "</style></head><body>"
            + "<h1>אין חיבור לאינטרנט</h1>"
            + "<p>" + offlineLine() + "<br>בדוק את החיבור ונסה שוב.</p>"
            + "<a href='" + appUrl() + "'>נסה שוב</a>"
            + "</body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            filePathCallback.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            filePathCallback = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    protected void toastUi(final String msg) {
        runOnUiThread(new Runnable() {
            @Override public void run() {
                Toast.makeText(ShellActivity.this, msg, Toast.LENGTH_SHORT).show();
            }
        });
    }
}
