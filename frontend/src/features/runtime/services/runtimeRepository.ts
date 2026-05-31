import {
  GetEnvironmentStatus,
  InitializeApp,
  RebuildRuntime,
  StopCurrentRun,
} from "../../../../wailsjs/go/bridge/App";
import type {
  RuntimeInitSnapshotLike,
  RuntimeStatusLike,
} from "./runtimeBridgeCompat";

export function createRuntimeRepository() {
  return {
    getEnvironmentStatus(): Promise<RuntimeStatusLike> {
      return GetEnvironmentStatus();
    },

    initializeApp(): Promise<RuntimeInitSnapshotLike> {
      return InitializeApp();
    },

    rebuildRuntime(): Promise<RuntimeStatusLike> {
      return RebuildRuntime();
    },

    stopCurrentRun(): Promise<unknown> {
      return StopCurrentRun();
    },
  };
}
