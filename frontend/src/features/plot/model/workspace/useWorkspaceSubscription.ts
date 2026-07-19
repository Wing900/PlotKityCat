import { ref, type Ref } from "vue";
import {
  GetSubscriptionStatus,
  OpenSubscriptionPurchase,
} from "../../../../../wailsjs/go/bridge/App";
import type { AISubscriptionStatus } from "../../../ai/services/aiTypes";
import { getErrorMessage } from "../../../../lib/errors";
import { normalizeSubscriptionStatus } from "./subscriptionStatusHelpers";

export interface WorkspaceSubscriptionDeps {
  openRunErrorDialog: (message: string, options?: { repairable?: boolean }) => void;
}

export function useWorkspaceSubscription(deps: WorkspaceSubscriptionDeps) {
  const subscriptionStatus = ref<AISubscriptionStatus>({
    status: "unconfigured",
    activated: false,
    deviceId: "",
    expireAt: "",
    lastCheckedAt: "",
    message: "订阅服务未配置",
    model: "",
    baseUrl: "",
  });

  async function refreshSubscriptionStatus(force: boolean) {
    try {
      subscriptionStatus.value = normalizeSubscriptionStatus(await GetSubscriptionStatus(force));
    } catch (error) {
      subscriptionStatus.value = {
        ...subscriptionStatus.value,
        status: "error",
        activated: false,
        message: getErrorMessage(error),
      };
    }
  }

  async function purchaseSubscription() {
    try {
      await OpenSubscriptionPurchase();
    } catch (error) {
      deps.openRunErrorDialog(getErrorMessage(error));
    }
  }

  async function refreshSubscriptionStatusManually() {
    await refreshSubscriptionStatus(true);
  }

  return {
    subscriptionStatus: subscriptionStatus as Ref<AISubscriptionStatus>,
    refreshSubscriptionStatus,
    purchaseSubscription,
    refreshSubscriptionStatusManually,
  };
}