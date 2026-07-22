import { defineComponent, h, ref, type Ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { vi } from "vitest";
import { useScriptWorkspaceMachine } from "../../src/features/scripts/model/useScriptWorkspaceMachine";
import type { ScriptWorkspaceRepository } from "../../src/features/scripts/model/scriptWorkspaceTypes";

export function mountScriptWorkspaceMachine(options: {
  repository: ScriptWorkspaceRepository;
  isSyncPaused?: Ref<boolean>;
}): {
  wrapper: VueWrapper;
  machine: ReturnType<typeof useScriptWorkspaceMachine>;
  onError: ReturnType<typeof vi.fn>;
} {
  const onError = vi.fn();
  const isRunning = ref(false);
  let machine!: ReturnType<typeof useScriptWorkspaceMachine>;
  const component = defineComponent({
    setup(_, { expose }) {
      machine = useScriptWorkspaceMachine(onError, isRunning, options.isSyncPaused, {
        repository: options.repository,
        selectionStorage: { load: () => "", save: vi.fn() },
      });
      expose(machine);
      return () => h("div");
    },
  });

  const wrapper = mount(component);
  return { wrapper, machine, onError };
}
