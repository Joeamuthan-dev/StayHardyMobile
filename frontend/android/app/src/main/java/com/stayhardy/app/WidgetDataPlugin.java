package com.stayhardy.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "WidgetDataPlugin")
public class WidgetDataPlugin extends Plugin {

    public static final String PREFS_NAME = "stayhardy_widget_prefs";
    public static final String PREFS_KEY_DATA = "stayhardy_widget_data";

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        try {
            JSObject data = call.getData();
            if (data == null) {
                call.reject("Missing widget payload");
                return;
            }

            JSONObject normalized = new JSONObject();
            normalized.put("streak", jsonInt(data, "streak", 0));
            normalized.put("tasksCompleted", jsonInt(data, "tasksCompleted", 0));
            normalized.put("tasksTotal", jsonInt(data, "tasksTotal", 0));
            normalized.put("routinesCompleted", jsonInt(data, "routinesCompleted", 0));
            normalized.put("routinesTotal", jsonInt(data, "routinesTotal", 0));
            normalized.put("productivityScore", jsonInt(data, "productivityScore", 0));
            normalized.put("topPendingTask", data.optString("topPendingTask", ""));

            Context ctx = getContext();
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(PREFS_KEY_DATA, normalized.toString()).apply();

            StayHardyWidgetUpdater.refreshAllWidgets(ctx);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update widget data", e);
        }
    }

    private static int jsonInt(JSONObject o, String key, int def) {
        if (o == null || !o.has(key)) return def;
        try {
            return o.getInt(key);
        } catch (Exception ignored) {
            try {
                return (int) Math.round(o.getDouble(key));
            } catch (Exception ignored2) {
                return def;
            }
        }
    }
}
