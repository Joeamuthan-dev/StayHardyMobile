package com.stayhardy.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetDataPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
