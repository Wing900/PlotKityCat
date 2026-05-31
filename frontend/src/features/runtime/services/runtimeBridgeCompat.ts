import type { bridge } from "../../../../wailsjs/go/models";

export type RuntimeCheckItemLike = Partial<bridge.EnvironmentCheckItem>;

export type RuntimeStatusLike = Partial<bridge.EnvironmentStatus> & {
  items?: RuntimeCheckItemLike[];
  missing?: string[];
};

export type RuntimeInitSnapshotLike = Partial<bridge.InitSnapshot> & {
  environment?: RuntimeStatusLike;
};
