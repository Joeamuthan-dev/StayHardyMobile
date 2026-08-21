package com.stayhardy.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import io.flutter.plugin.common.MethodChannel

/**
 * Reads Android's usage statistics for the screen-time feature.
 *
 * **This data never leaves the device.** It is aggregated here, written to the
 * local SQLite database, and excluded from the backup payload. There is no
 * network call anywhere in this path, and there must never be one — usage
 * statistics are the most sensitive thing this app can see, and the disclosure
 * the user agrees to says exactly that.
 *
 * Two Android details drive the whole design:
 *
 * **`PACKAGE_USAGE_STATS` is a special permission.** It cannot be requested
 * with a runtime dialog; the user has to grant it by hand in
 * Settings → Special app access → Usage access. So the flow is: show the
 * disclosure, send the user to that screen, and re-check on resume. There is no
 * callback to wait on.
 *
 * **`queryAndAggregateUsageStats` is not usable for per-day totals.** It
 * aggregates over whatever interval the platform feels like and double-counts
 * sessions that straddle a boundary, so "3h 41m yesterday" computed from it
 * disagrees with Digital Wellbeing on the same phone. Foreground time is
 * therefore reconstructed from raw [UsageEvents] — resume/pause pairs clipped
 * to the window — which is what Digital Wellbeing itself does.
 */
object ScreenTimeBridge {
    const val CHANNEL = "com.stayhardy.app/screen_time"

    fun handle(context: Context, method: String, args: Any?, result: MethodChannel.Result) {
        when (method) {
            "hasPermission" -> result.success(hasUsageAccess(context))

            "openSettings" -> {
                // ACTION_USAGE_ACCESS_SETTINGS is the only route. Some OEM builds
                // ship without the screen at all, in which case fall back to this
                // app's details page rather than crashing on an unresolved intent.
                val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                val resolved = intent.resolveActivity(context.packageManager) != null
                if (resolved) {
                    context.startActivity(intent)
                } else {
                    context.startActivity(
                        Intent(
                            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            android.net.Uri.parse("package:${context.packageName}"),
                        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                    )
                }
                result.success(resolved)
            }

            "query" -> {
                val map = args as? Map<*, *>
                val start = (map?.get("startMs") as? Number)?.toLong()
                val end = (map?.get("endMs") as? Number)?.toLong()
                if (start == null || end == null || end <= start) {
                    result.error("bad_args", "startMs and endMs required", null)
                    return
                }
                if (!hasUsageAccess(context)) {
                    result.error("no_permission", "usage access not granted", null)
                    return
                }
                result.success(query(context, start, end))
            }

            else -> result.notImplemented()
        }
    }

    /**
     * Whether usage access is granted.
     *
     * Checked through [AppOpsManager] rather than `checkSelfPermission`: the
     * manifest entry only makes the app *eligible* to appear in the usage-access
     * list, and `checkSelfPermission` returns granted for it whether or not the
     * user has actually flipped the switch.
     */
    private fun hasUsageAccess(context: Context): Boolean {
        val ops = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
            ?: return false
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ops.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName,
            )
        } else {
            @Suppress("DEPRECATION")
            ops.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName,
            )
        }
        // DEFAULT means "fall back to the manifest permission", which for this
        // op means granted; anything else must be an explicit ALLOWED.
        return if (mode == AppOpsManager.MODE_DEFAULT) {
            context.checkCallingOrSelfPermission(
                "android.permission.PACKAGE_USAGE_STATS",
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            mode == AppOpsManager.MODE_ALLOWED
        }
    }

    /**
     * Foreground milliseconds and launch counts per package in [start, end).
     *
     * Returns a map of `packages` (list of per-package maps) plus `unlockCount`.
     * All arithmetic is clipped to the window, so a session that began before
     * [start] contributes only the part inside it.
     */
    private fun query(context: Context, start: Long, end: Long): Map<String, Any> {
        val usage = context.getSystemService(Context.USAGE_STATS_SERVICE)
            as? UsageStatsManager ?: return mapOf("packages" to emptyList<Any>(), "unlockCount" to 0)

        // Query from before the window so a session already in progress at
        // [start] is seen; without this, whatever the user was doing at midnight
        // is silently dropped from the day.
        val lookBehind = 12 * 60 * 60 * 1000L
        val events = usage.queryEvents(start - lookBehind, end)

        val foreground = HashMap<String, Long>()
        val launches = HashMap<String, Int>()
        val resumedAt = HashMap<String, Long>()
        var unlockCount = 0

        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue

            when (event.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> {
                    resumedAt[pkg] = event.timeStamp
                    if (event.timeStamp in start until end) {
                        launches[pkg] = (launches[pkg] ?: 0) + 1
                    }
                }

                UsageEvents.Event.ACTIVITY_PAUSED,
                UsageEvents.Event.ACTIVITY_STOPPED -> {
                    val began = resumedAt.remove(pkg) ?: continue
                    add(foreground, pkg, began, event.timeStamp, start, end)
                }

                UsageEvents.Event.KEYGUARD_HIDDEN -> {
                    if (event.timeStamp in start until end) unlockCount++
                }
            }
        }

        // Anything still in the foreground when the window closed. Without this
        // the app the user is looking at right now always reads as zero.
        for ((pkg, began) in resumedAt) {
            add(foreground, pkg, began, end, start, end)
        }

        val pm = context.packageManager
        val packages = foreground.entries
            .filter { it.value > 0 }
            .sortedByDescending { it.value }
            // The tail is hundreds of system services with milliseconds each.
            // Nothing downstream shows more than a handful.
            .take(40)
            .map { (pkg, ms) ->
                mapOf(
                    "packageName" to pkg,
                    "foregroundMs" to ms,
                    "launchCount" to (launches[pkg] ?: 0),
                    "appLabel" to label(pm, pkg),
                )
            }

        return mapOf("packages" to packages, "unlockCount" to unlockCount)
    }

    /** Adds the part of [from, to) that falls inside [windowStart, windowEnd). */
    private fun add(
        into: HashMap<String, Long>,
        pkg: String,
        from: Long,
        to: Long,
        windowStart: Long,
        windowEnd: Long,
    ) {
        val clippedFrom = maxOf(from, windowStart)
        val clippedTo = minOf(to, windowEnd)
        val span = clippedTo - clippedFrom
        if (span > 0) into[pkg] = (into[pkg] ?: 0) + span
    }

    /**
     * Human-readable app name, or null.
     *
     * Null is normal and not an error: package visibility on API 30+ hides
     * anything without a launcher intent, and the manifest deliberately does not
     * request `QUERY_ALL_PACKAGES` — it is a sensitive permission needing a Play
     * declaration, for a nicety. The UI falls back to the package name.
     */
    private fun label(pm: PackageManager, pkg: String): String? = try {
        pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
    } catch (_: PackageManager.NameNotFoundException) {
        null
    } catch (_: SecurityException) {
        null
    }
}
