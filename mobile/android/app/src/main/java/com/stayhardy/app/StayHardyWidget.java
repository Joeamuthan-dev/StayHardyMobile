package com.stayhardy.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class StayHardyWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            appWidgetManager.updateAppWidget(
                id,
                StayHardyWidgetUpdater.buildViews(context, R.layout.stayhardy_widget, false)
            );
        }
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        StayHardyWidgetUpdater.refreshAllWidgets(context);
    }

    @Override
    public void onDisabled(Context context) {
        super.onDisabled(context);
    }
}
