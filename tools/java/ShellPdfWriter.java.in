package android.print;

import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;

import java.io.File;

// tools/java/ShellPdfWriter.java.in — כתיבת מסמך מודפס לקובץ PDF בלי חלון ההדפסה.
// יושב בחבילה android.print: הבנאים של LayoutResultCallback ו-WriteResultCallback אינם פתוחים מחוצה לה.
// כל כשל — ב-fail, והמעטפת נופלת-חוזרת לחלון ההדפסה של המערכת.
public final class ShellPdfWriter {

    private ShellPdfWriter() { }

    public static void write(final PrintDocumentAdapter adapter, final PrintAttributes attrs, final File out,
                             final Runnable ok, final Runnable fail) {
        adapter.onStart();
        adapter.onLayout(null, attrs, new CancellationSignal(), new PrintDocumentAdapter.LayoutResultCallback() {
            @Override
            public void onLayoutFinished(PrintDocumentInfo info, boolean changed) {
                final ParcelFileDescriptor fd;
                try {
                    fd = ParcelFileDescriptor.open(out, ParcelFileDescriptor.MODE_CREATE
                        | ParcelFileDescriptor.MODE_TRUNCATE | ParcelFileDescriptor.MODE_READ_WRITE);
                } catch (Exception e) {
                    adapter.onFinish();
                    fail.run();
                    return;
                }
                adapter.onWrite(new PageRange[]{PageRange.ALL_PAGES}, fd, new CancellationSignal(),
                    new PrintDocumentAdapter.WriteResultCallback() {
                        @Override
                        public void onWriteFinished(PageRange[] pages) { done(fd, adapter); ok.run(); }

                        @Override
                        public void onWriteFailed(CharSequence error) { done(fd, adapter); fail.run(); }

                        @Override
                        public void onWriteCancelled() { done(fd, adapter); fail.run(); }
                    });
            }

            @Override
            public void onLayoutFailed(CharSequence error) { adapter.onFinish(); fail.run(); }

            @Override
            public void onLayoutCancelled() { adapter.onFinish(); fail.run(); }
        }, null);
    }

    private static void done(ParcelFileDescriptor fd, PrintDocumentAdapter adapter) {
        try { fd.close(); } catch (Exception e) { /* הקובץ כבר נכתב */ }
        adapter.onFinish();
    }
}
