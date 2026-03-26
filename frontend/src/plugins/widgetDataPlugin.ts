import { registerPlugin } from '@capacitor/core';

export interface WidgetDataPayload {
  streak: number;
  tasksCompleted: number;
  tasksTotal: number;
  routinesCompleted: number;
  routinesTotal: number;
  productivityScore: number;
  topPendingTask: string;
}

interface WidgetDataPluginType {
  updateWidgetData(payload: WidgetDataPayload): Promise<void>;
}

const WidgetDataPlugin = registerPlugin<WidgetDataPluginType>('WidgetDataPlugin', {
  web: () => ({
    updateWidgetData: async () => undefined,
  }),
});

export default WidgetDataPlugin;
