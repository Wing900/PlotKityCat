import type { Ref } from "vue";
import type { AIProviderSettings, ChangedLineRange } from "../../ai/services/aiTypes";
import { useAIWorkflowSession } from "../../aiWorkflow/model/useAIWorkflowSession";
import { useAIRunErrorRepair } from "../../aiRepair/model/useAIRunErrorRepair";
import { useCodeAIOptimize } from "../../codeAIOptimize/model/useCodeAIOptimize";
import { useAINoteGeneration } from "./useAINoteGeneration";

type AIActivityStatus = {
  aiStatusLabel: Ref<string>;
  isAIGenerating: Ref<boolean>;
  startChecking: () => void;
  startWorking: () => void;
  stop: () => void;
};

type RunErrorDialog = {
  clearRunError: () => void;
  closeRunErrorDialog: () => void;
  copyRunError: () => Promise<void>;
  isRunErrorCopied: Ref<boolean>;
  isRunErrorDialogOpen: Ref<boolean>;
  isRunErrorRepairable: Ref<boolean>;
  openRunErrorDialog: (
    errorText: string,
    options?: { repairable?: boolean; repairSceneName?: string; repairText?: string },
  ) => void;
  runErrorRepairSceneName: Ref<string>;
  runErrorRepairText: Ref<string>;
  runErrorText: Ref<string>;
};

type ScriptWorkspace = {
  codeContent: Ref<string>;
  currentFile: Ref<string>;
  updateCode: (code: string) => void;
};

type PlotAIWorkflowOptions = {
  aiActivity: AIActivityStatus;
  aiSettings: Ref<AIProviderSettings>;
  loadSceneCode: (sceneName: string) => Promise<string>;
  onAnimateChangedRanges: (ranges: ChangedLineRange[]) => void;
  runErrorDialog: RunErrorDialog;
  scriptWorkspace: ScriptWorkspace;
};

export function usePlotAIWorkflow(options: PlotAIWorkflowOptions) {
  const aiWorkflowSession = useAIWorkflowSession(options.aiActivity);
  const getHandlers = createAIWorkflowHandlers(options);

  const aiRepair = useAIRunErrorRepair({
    codeContent: options.scriptWorkspace.codeContent,
    currentFile: options.scriptWorkspace.currentFile,
    errorDialog: options.runErrorDialog,
    loadSceneCode: options.loadSceneCode,
    startWorkflow: async ({ sceneName, currentCode, errorText }) => {
      await aiWorkflowSession.startWorkflow(
        {
          kind: "repair",
          sceneName,
          currentCode,
          instruction: "",
          errorText,
          selection: { items: [] },
          maxAttempts: 8,
          settings: options.aiSettings.value,
        },
        getHandlers(sceneName),
      );
    },
  });

  const codeAIOptimize = useCodeAIOptimize({
    codeContent: options.scriptWorkspace.codeContent,
    currentFile: options.scriptWorkspace.currentFile,
    onError: options.runErrorDialog.openRunErrorDialog,
    startWorkflow: async ({ instruction }) => {
      const sceneName = options.scriptWorkspace.currentFile.value;
      if (!sceneName) {
        return false;
      }

      const result = await aiWorkflowSession.startWorkflow(
        {
          kind: "optimize",
          sceneName,
          currentCode: options.scriptWorkspace.codeContent.value,
          instruction,
          errorText: "",
          selection: { items: [] },
          maxAttempts: 8,
          settings: options.aiSettings.value,
        },
        getHandlers(sceneName),
      );
      return result.ok;
    },
  });

  const aiGeneration = useAINoteGeneration({
    onError: options.runErrorDialog.openRunErrorDialog,
    resolveSceneCode: options.loadSceneCode,
    startWorkflow: async ({ sceneName, currentCode, selection }) => {
      await aiWorkflowSession.startWorkflow(
        {
          kind: "visualize",
          sceneName,
          currentCode,
          instruction: "",
          errorText: "",
          selection,
          maxAttempts: 8,
          settings: options.aiSettings.value,
        },
        getHandlers(sceneName),
      );
    },
  });

  return {
    aiGeneration,
    aiRepair,
    aiWorkflowSession,
    codeAIOptimize,
  };
}

function createAIWorkflowHandlers(options: PlotAIWorkflowOptions) {
  return (sceneName: string) => ({
    onCodeApplied: (event: { sceneName: string; code: string; changedRanges: ChangedLineRange[] }) => {
      if (event.sceneName === options.scriptWorkspace.currentFile.value) {
        options.scriptWorkspace.updateCode(event.code);
        options.onAnimateChangedRanges(event.changedRanges);
      }
    },
    onFailed: (event: { errorText: string; repairable: boolean; sceneName: string }) => {
      options.runErrorDialog.openRunErrorDialog(
        event.sceneName === options.scriptWorkspace.currentFile.value
          ? event.errorText
          : `[${event.sceneName}] ${event.errorText}`,
        {
          repairable: event.repairable,
          repairSceneName: event.sceneName,
          repairText: event.errorText,
        },
      );
    },
    onInterrupted: () => {
      // 中断是预期动作（用户点停止 / 会话被销毁），不再弹错误框
      options.runErrorDialog.clearRunError();
    },
    onSucceeded: () => {
      options.runErrorDialog.clearRunError();
    },
  });
}
