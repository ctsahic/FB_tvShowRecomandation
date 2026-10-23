package il.tv.recommender;

import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * טיפול בשלט הרחוק של Android TV.
 *
 * ה-WebView של אנדרואיד לא מעביר את מקשי החיצים של השלט לאירועי מקלדת בדף,
 * ולכן ניווט הפוקוס לא עובד כברירת מחדל. כאן לוכדים את ארבעת מקשי ה-D-pad
 * ומזריקים אותם לדף כאירועי keydown — הניווט המרחבי עצמו ממומש ב-JS
 * (useDpadNavigation).
 *
 * מקש ה-OK (DPAD_CENTER / ENTER) לא נלכד בכוונה: Chromium מטפל בו בעצמו
 * ומעביר אותו לרכיב שבפוקוס, וכך שדות טקסט מקבלים את המקלדת של הטלוויזיה.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // ה-WebView חייב להיות focusable כדי שהשלט יעבוד.
        WebView webView = currentWebView();
        if (webView != null) {
            webView.setFocusable(true);
            webView.setFocusableInTouchMode(true);
            webView.requestFocus();
        }
    }

    private WebView currentWebView() {
        return getBridge() == null ? null : getBridge().getWebView();
    }

    /** מפתח JS לאירוע המקלדת, או null למקש שלא ממופה. */
    private static String jsKeyFor(int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_UP:
                return "ArrowUp";
            case KeyEvent.KEYCODE_DPAD_DOWN:
                return "ArrowDown";
            case KeyEvent.KEYCODE_DPAD_LEFT:
                return "ArrowLeft";
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                return "ArrowRight";
            default:
                return null;
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        String key = jsKeyFor(event.getKeyCode());
        if (key == null) {
            return super.dispatchKeyEvent(event);
        }
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            injectKey(key);
        }
        // צורכים גם DOWN וגם UP כדי שלא ייכנסו שוב ל-WebView.
        return true;
    }

    private void injectKey(String key) {
        WebView webView = currentWebView();
        if (webView == null) {
            return;
        }
        String script = "(function(){"
                + "var e=new KeyboardEvent('keydown',{key:'" + key + "',code:'" + key
                + "',bubbles:true,cancelable:true});"
                + "window.dispatchEvent(e);"
                + "})();";
        webView.evaluateJavascript(script, null);
    }
}
