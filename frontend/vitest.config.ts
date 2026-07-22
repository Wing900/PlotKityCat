import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// 独立于 vite.config.ts — 生产构建 (npm run build) 完全不读此文件,
// 测试 (npm test) 完全不读 vite.config.ts, 前后端测试隔离。
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.spec.ts", "tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts"],
    },
  },
});
