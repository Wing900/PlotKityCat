import { ref, type Ref } from "vue";
import {
  createDefaultAISettings,
  getAISettings,
  saveAISettings,
} from "../../../ai/services/aiSettingsBridgeCompat";
import type { AIProviderSettings } from "../../../ai/services/aiTypes";
import { getErrorMessage } from "../../../../lib/errors";

export interface WorkspaceAISettingsDeps {
  openRunErrorDialog: (message: string, options?: { repairable?: boolean }) => void;
  /** 打开 AI 设置对话框时触发, 用来刷新订阅状态 */
  onOpen?: () => void;
}

export function useWorkspaceAISettings(deps: WorkspaceAISettingsDeps) {
  const isAISettingsDialogOpen = ref(false);
  const aiSettings = ref<AIProviderSettings>(createDefaultAISettings());

  function openAISettings() {
    isAISettingsDialogOpen.value = true;
    deps.onOpen?.();
  }

  function closeAISettings() {
    isAISettingsDialogOpen.value = false;
  }

  async function updateAISettings(nextSettings: AIProviderSettings) {
    try {
      aiSettings.value = await saveAISettings(nextSettings);
    } catch (error) {
      deps.openRunErrorDialog(getErrorMessage(error));
    }
  }

  async function refreshAISettings() {
    try {
      aiSettings.value = await getAISettings();
    } catch (error) {
      aiSettings.value = createDefaultAISettings();
      deps.openRunErrorDialog(getErrorMessage(error));
    }
  }

  return {
    isAISettingsDialogOpen: isAISettingsDialogOpen as Ref<boolean>,
    aiSettings: aiSettings as Ref<AIProviderSettings>,
    openAISettings,
    closeAISettings,
    updateAISettings,
    refreshAISettings,
  };
}