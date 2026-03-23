package com.stayhardy.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.text.TextUtils;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * Builds RemoteViews for StayHardy home screen widgets from SharedPreferences JSON.
 */
public final class StayHardyWidgetUpdater {

    private StayHardyWidgetUpdater() {}

    public static void refreshAllWidgets(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        updateProvider(context, mgr, StayHardyWidget.class, R.layout.stayhardy_widget, false);
        updateProvider(context, mgr, StayHardyWidgetSmall.class, R.layout.stayhardy_widget_small, true);
    }

    private static void updateProvider(
        Context context,
        AppWidgetManager mgr,
        Class<?> providerClass,
        int layoutRes,
        boolean compact
    ) {
        android.content.ComponentName cn = new android.content.ComponentName(context, providerClass);
        int[] ids = mgr.getAppWidgetIds(cn);
        for (int id : ids) {
            RemoteViews views = buildViews(context, layoutRes, compact);
            mgr.updateAppWidget(id, views);
        }
    }

    static RemoteViews buildViews(Context context, int layoutRes, boolean compact) {
        RemoteViews rv = new RemoteViews(context.getPackageName(), layoutRes);

        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context,
            layoutRes,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        rv.setOnClickPendingIntent(R.id.widget_root, pi);

        SharedPreferences prefs = context.getSharedPreferences(WidgetDataPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(WidgetDataPlugin.PREFS_KEY_DATA, null);

        if (TextUtils.isEmpty(raw)) {
            showEmptyState(context, rv, compact);
            return rv;
        }

        try {
            JSONObject o = new JSONObject(raw);
            int streak = o.optInt("streak", 0);
            int tasksDone = o.optInt("tasksCompleted", 0);
            int tasksTotal = o.optInt("tasksTotal", 0);
            int routinesDone = o.optInt("routinesCompleted", 0);
            int routinesTotal = o.optInt("routinesTotal", 0);
            int score = o.optInt("productivityScore", 0);
            String topTask = o.optString("topPendingTask", "");

            rv.setViewVisibility(R.id.widget_empty_state, View.GONE);
            rv.setViewVisibility(R.id.widget_content, View.VISIBLE);

            rv.setTextViewText(R.id.widget_app_name, context.getString(R.string.widget_stayhardy_label));
            rv.setTextViewText(R.id.widget_streak, "🔥 " + streak);

            int taskPct = tasksTotal > 0 ? Math.round((tasksDone * 100f) / tasksTotal) : 0;
            if (!compact) {
                rv.setProgressBar(R.id.widget_tasks_progress, 100, taskPct, false);
            }

            rv.setTextViewText(R.id.widget_tasks_line, tasksDone + "/" + tasksTotal);
            if (!compact) {
                rv.setTextViewText(R.id.widget_routines_line, routinesDone + "/" + routinesTotal);
            }

            rv.setTextViewText(R.id.widget_score_line, score + "%");
            rv.setTextColor(R.id.widget_score_line, scoreColor(score));

            if (!compact) {
                String ellipsized = topTask;
                if (ellipsized.length() > 80) {
                    ellipsized = ellipsized.substring(0, 77) + "…";
                }
                rv.setTextViewText(R.id.widget_top_task, ellipsized);
            }
        } catch (Exception e) {
            showEmptyState(context, rv, compact);
        }

        return rv;
    }

    private static void showEmptyState(Context context, RemoteViews rv, boolean compact) {
        rv.setViewVisibility(R.id.widget_content, View.GONE);
        rv.setViewVisibility(R.id.widget_empty_state, View.VISIBLE);
        rv.setImageViewResource(R.id.widget_empty_logo, R.mipmap.ic_launcher);
        rv.setTextViewText(R.id.widget_empty_text, context.getString(R.string.widget_open_app_prompt));
        if (!compact) {
            rv.setProgressBar(R.id.widget_tasks_progress, 100, 0, false);
        }
    }

    private static int scoreColor(int score) {
        if (score < 34) return Color.parseColor("#f87171");
        if (score < 67) return Color.parseColor("#facc15");
        return Color.parseColor("#4ade80");
    }
}
