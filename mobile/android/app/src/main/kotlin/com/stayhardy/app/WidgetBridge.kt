package com.stayhardy.app

import android.content.Context
import io.flutter.plugin.common.MethodChannel
import org.json.JSONObject

/**
 * Writes widget data from Dart, replacing the Capacitor `WidgetDataPlugin`.
 *
 * The prefs file, key, and JSON field names are the ones already on users'
 * devices (see [WidgetContract]). Writing anything else leaves placed widgets
 * showing their empty state.
 *
 * Deliberately hand-rolled rather than using the `home_widget` package: that
 * package writes to its own `HomeWidgetPreferences` file with its own key
 * naming, which would mean either rewriting the widget classes or leaving every
 * placed widget blank across the upgrade. Sixty lines here preserves the
 * contract exactly and adds no dependency.
 */
object WidgetBridge {
    const val CHANNEL = "com.stayhardy.app/widget"

    fun handle(context: Context, method: String, args: Any?, result: MethodChannel.Result) {
        when (method) {
            "update" -> {
                val map = args as? Map<*, *>
                if (map == null) {
                    result.error("bad_args", "expected a map", null)
                    return
                }

                // Normalised to exactly the seven fields the widget layouts read.
                // Coercion is defensive: the original plugin handled doubles
                // arriving from JS, and a malformed payload must degrade to the
                // empty state rather than crash the widget's process.
                val payload = JSONObject().apply {
                    put("streak", intOf(map["streak"]))
                    put("tasksCompleted", intOf(map["tasksCompleted"]))
                    put("tasksTotal", intOf(map["tasksTotal"]))
                    put("routinesCompleted", intOf(map["routinesCompleted"]))
                    put("routinesTotal", intOf(map["routinesTotal"]))
                    put("productivityScore", intOf(map["productivityScore"]))
                    put("topPendingTask", (map["topPendingTask"] as? String) ?: "")
                }

                context
                    .getSharedPreferences(WidgetContract.PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(WidgetContract.PREFS_KEY_DATA, payload.toString())
                    .apply()

                StayHardyWidgetUpdater.refreshAllWidgets(context)
                result.success(true)
            }

            else -> result.notImplemented()
        }
    }

    private fun intOf(value: Any?): Int = when (value) {
        is Int -> value
        is Number -> value.toInt()
        is String -> value.toIntOrNull() ?: 0
        else -> 0
    }
}
