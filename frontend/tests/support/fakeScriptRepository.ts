import { vi } from "vitest";
import type { ScriptWorkspaceRepository, WorkspaceSnapshotLike } from "../../src/features/scripts/model/scriptWorkspaceTypes";

export type FakeWorkspace = {
  files: Record<string, string>;
  order: string[];
};

export type FakeScriptRepository = ScriptWorkspaceRepository & {
  workspaces: Record<string, FakeWorkspace>;
  currentWorkspace: string;
};

export function createFakeScriptRepository(
  initialWorkspaces: Record<string, FakeWorkspace> = defaultWorkspaces(),
): FakeScriptRepository {
  const repository = {
    workspaces: cloneWorkspaces(initialWorkspaces),
    currentWorkspace: Object.keys(initialWorkspaces)[0] ?? "workspace-a",
  } as FakeScriptRepository;

  const snapshot = (preferredFile = ""): WorkspaceSnapshotLike => {
    const workspace = repository.workspaces[repository.currentWorkspace];
    const currentFile = preferredFile && workspace.order.includes(preferredFile)
      ? preferredFile
      : workspace.order[0] ?? "";

    return {
      currentFile,
      currentWorkspace: repository.currentWorkspace,
      scripts: [...workspace.order],
      workspaces: Object.entries(repository.workspaces).map(([name, value]) => ({
        name,
        sceneCount: value.order.length,
      })),
      document: {
        filename: currentFile,
        code: currentFile ? workspace.files[currentFile] : "",
      },
    };
  };

  Object.assign(repository, {
    refreshWorkspace: vi.fn(async (preferredFile = "") => snapshot(preferredFile)),
    getScriptContent: vi.fn(async (filename: string) => ({
      filename,
      code: repository.workspaces[repository.currentWorkspace].files[filename] ?? "",
    })),
    saveScript: vi.fn(async (filename: string, code: string) => {
      repository.workspaces[repository.currentWorkspace].files[filename] = code;
    }),
    saveAndRun: vi.fn(async () => undefined),
    createScript: vi.fn(async (filename: string) => {
      const workspace = repository.workspaces[repository.currentWorkspace];
      workspace.files[filename] = "# new scene";
      workspace.order.push(filename);
      return { filename, code: workspace.files[filename] };
    }),
    renameScript: vi.fn(async (oldFilename: string, newFilename: string) => {
      const workspace = repository.workspaces[repository.currentWorkspace];
      workspace.files[newFilename] = workspace.files[oldFilename] ?? "";
      delete workspace.files[oldFilename];
      workspace.order = workspace.order.map((name) => name === oldFilename ? newFilename : name);
      return snapshot(newFilename);
    }),
    deleteScript: vi.fn(async (filename: string) => {
      const workspace = repository.workspaces[repository.currentWorkspace];
      delete workspace.files[filename];
      workspace.order = workspace.order.filter((name) => name !== filename);
      return snapshot();
    }),
    reorderScripts: vi.fn(async (scripts: string[]) => {
      repository.workspaces[repository.currentWorkspace].order = [...scripts];
      return snapshot();
    }),
    switchWorkspace: vi.fn(async (name: string) => {
      repository.currentWorkspace = name;
      return snapshot();
    }),
    createWorkspace: vi.fn(async (name: string) => {
      repository.workspaces[name] = { files: {}, order: [] };
      repository.currentWorkspace = name;
      return snapshot();
    }),
    renameWorkspace: vi.fn(async (oldName: string, newName: string) => {
      repository.workspaces[newName] = repository.workspaces[oldName];
      delete repository.workspaces[oldName];
      repository.currentWorkspace = newName;
      return snapshot();
    }),
    deleteWorkspace: vi.fn(async (name: string) => {
      delete repository.workspaces[name];
      repository.currentWorkspace = Object.keys(repository.workspaces)[0] ?? "";
      return snapshot();
    }),
  });

  return repository;
}

function defaultWorkspaces(): Record<string, FakeWorkspace> {
  return {
    "workspace-a": {
      files: { "main.py": "print('a')", "second.py": "print('second')" },
      order: ["main.py", "second.py"],
    },
    "workspace-b": {
      files: { "other.py": "print('b')" },
      order: ["other.py"],
    },
  };
}

function cloneWorkspaces(workspaces: Record<string, FakeWorkspace>) {
  return Object.fromEntries(
    Object.entries(workspaces).map(([name, workspace]) => [name, {
      files: { ...workspace.files },
      order: [...workspace.order],
    }]),
  );
}
