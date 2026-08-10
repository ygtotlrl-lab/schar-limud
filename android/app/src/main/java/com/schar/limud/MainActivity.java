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

/**
 * Native WebView shell for schar-limud — deliberately NOT a Trusted Web Activity.
 *
 * A TWA runs the site inside Chrome, and the content filters installed on the users'
 * devices block Chrome, so a TWA build never opens. A plain WebView renders in-process
 * and is not affected. Same reasoning as yoman-avoda and gius — see android/README.md.
 *
 * <p>The shell loads {@link #APP_URL} over the network. Web releases therefore reach
 * installed devices the moment GitHub Pages updates, with no new APK — the site's
 * service worker keeps it working offline afterwards, exactly as it does in a browser.
 *
 * <p><b>There are no bundled assets, on purpose.</b> A file:// fallback copy would live
 * in a <i>different storage origin</i> from the https site, so anything typed into it
 * offline would land in a localStorage partition the online app never reads — silent
 * data loss, and here the data is money (sl_mirror_transactions). See android/README.md.
 *
 * <p><b>There is no native bridge here, on purpose.</b> yoman-avoda's shell carries an
 * origin-restricted share bridge because its page calls navigator.share with an image;
 * schar-limud's code has no navigator.share at all, so the bridge — and the reach it
 * hands to whoever serves the page — is omitted entirely. If a bridge is ever needed,
 * copy yoman's double-guarded pattern (addWebMessageListener + ALLOWED_ORIGINS);
 * never a bare addJavascriptInterface on a remotely loaded page.
 */
public class MainActivity extends Activity {

    private static final String APP_URL = "https://ygtotlrl-lab.github.io/schar-limud/";

    private static final int FILE_CHOOSER_REQUEST = 1001;

    private WebView webView;
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
        s.setDomStorageEnabled(true);          // localStorage — MIRROR/sl_pending live here
        s.setDatabaseEnabled(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // The site is https-only, so there is no reason to allow mixed content wholesale.
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        // No file:// access is needed — nothing is loaded from disk.
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

        // restoreState() returns null when there was no history to restore — then
        // (and on a normal cold start) load the site.
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_URL);
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
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (ActivityNotFoundException e) {
                Toast.makeText(MainActivity.this, "אין אפליקציה שיודעת לפתוח את הקישור", Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView wv, String url) {
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
     */
    private void showOfflinePage() {
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
            + "a{background:#c9a84c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700}"
            + "</style></head><body>"
            + "<h1>אין חיבור לאינטרנט</h1>"
            + "<p>שכר לימוד לא הצליח להתחבר.<br>בדוק את החיבור ונסה שוב.</p>"
            + "<a href='" + APP_URL + "'>נסה שוב</a>"
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
}
