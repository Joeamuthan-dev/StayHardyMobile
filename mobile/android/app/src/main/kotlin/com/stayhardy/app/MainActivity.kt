package com.stayhardy.app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            LegacyPrefsBridge.CHANNEL,
        ).setMethodCallHandler { call, result ->
            LegacyPrefsBridge.handle(applicationContext, call.method, call.arguments, result)
        }

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            WidgetBridge.CHANNEL,
        ).setMethodCallHandler { call, result ->
            WidgetBridge.handle(applicationContext, call.method, call.arguments, result)
        }

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            ScreenTimeBridge.CHANNEL,
        ).setMethodCallHandler { call, result ->
            ScreenTimeBridge.handle(applicationContext, call.method, call.arguments, result)
        }
    }
}
