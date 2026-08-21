package com.stayhardy.app;

/**
 * The storage contract shared between the app and the home-screen widgets.
 *
 * These exact values were previously constants on the Capacitor
 * {@code WidgetDataPlugin}, which cannot come across because it extends
 * Capacitor's Plugin class. They MUST NOT change: widgets already placed on
 * users' home screens read this SharedPreferences file, and an in-place APK
 * update preserves it. Changing either string leaves every placed widget stuck
 * on its empty state until the user removes and re-adds it.
 */
public final class WidgetContract {
    public static final String PREFS_NAME = "stayhardy_widget_prefs";
    public static final String PREFS_KEY_DATA = "stayhardy_widget_data";

    private WidgetContract() {}
}
