import { useState, useCallback, useEffect, useRef } from "react";
import { WebContainer, WebContainerProcess } from "@webcontainer/api";

import {
  TemplateFolder,
  TemplateFile,
} from "@/modules/playground/lib/path-to-json";

interface UseWebContanierProps {
  templateData: TemplateFolder;
}

interface UseWebContanierReturn {
  serverUrl: string | null;
  error: string | null;
  isLoading: boolean;
  instance: WebContainer | null;

  writeFileSync: (path: string, content: string) => Promise<void>;
  deleteFileSync: (path: string) => Promise<void>;
  deleteFolderSync: (path: string) => Promise<void>;
  renameFileSync: (oldPath: string, newPath: string) => Promise<void>;
  renameFolderSync: (oldPath: string, newPath: string) => Promise<void>;
  remountPersistedTree: (templateData: TemplateFolder) => Promise<void>;

  trackProcess: (process: WebContainerProcess) => WebContainerProcess;
  killTrackedProcesses: () => void;
  destroy: () => Promise<void>;
}

const globalForWebContainer = globalThis as unknown as {
  __webcontainerPromise?: Promise<WebContainer>;
  __webcontainerInstance?: WebContainer | null;
};

globalForWebContainer.__webcontainerInstance ??= null;

function getWebContainerInstance(): Promise<WebContainer> {
  const existingPromise = globalForWebContainer.__webcontainerPromise;

  if (existingPromise) {
    return existingPromise;
  }

  const promise = WebContainer.boot();

  globalForWebContainer.__webcontainerPromise = promise;

  promise
    .then((instance) => {
      if (globalForWebContainer.__webcontainerPromise !== promise) {
        void instance.teardown();
        return instance;
      }

      globalForWebContainer.__webcontainerInstance = instance;
      return instance;
    })
    .catch(() => {
      if (globalForWebContainer.__webcontainerPromise === promise) {
        globalForWebContainer.__webcontainerPromise = undefined;
        globalForWebContainer.__webcontainerInstance = null;
      }
    });

  return promise;
}

export const UseWebContanier = ({
  templateData,
}: UseWebContanierProps): UseWebContanierReturn => {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WebContainer | null>(null);

  const instanceRef = useRef<WebContainer | null>(null);
  const mountedRef = useRef(false);
  const destroyedRef = useRef(false);

  const ownedProcessesRef = useRef<Set<WebContainerProcess>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    destroyedRef.current = false;

    let cancelled = false;

    async function initialiseWebContainer() {
      try {
        setIsLoading(true);
        setError(null);

        const webcontainerInstance = await getWebContainerInstance();

        if (cancelled || !mountedRef.current || destroyedRef.current) {
          return;
        }

        instanceRef.current = webcontainerInstance;

        setInstance(webcontainerInstance);
        setIsLoading(false);
      } catch (err) {
        if (cancelled || !mountedRef.current) {
          return;
        }

        console.error("Failed to initialize WebContainer:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize WebContainer",
        );

        setIsLoading(false);
      }
    }

    initialiseWebContainer();

    return () => {
      cancelled = true;
      mountedRef.current = false;

      for (const process of ownedProcessesRef.current) {
        try {
          process.kill();
        } catch (err) {
          console.warn("Failed to kill WebContainer process:", err);
        }
      }

      ownedProcessesRef.current.clear();
      instanceRef.current = null;
    };
  }, []);

  const trackProcess = useCallback((process: WebContainerProcess) => {
    ownedProcessesRef.current.add(process);

    process.exit
      .catch(() => undefined)
      .finally(() => {
        ownedProcessesRef.current.delete(process);
      });

    return process;
  }, []);

  const killTrackedProcesses = useCallback(() => {
    for (const process of ownedProcessesRef.current) {
      try {
        process.kill();
      } catch (err) {
        console.warn("Failed to kill WebContainer process:", err);
      }
    }

    ownedProcessesRef.current.clear();
  }, []);

  const writeFileSync = useCallback(
    async (path: string, content: string): Promise<void> => {
      const webcontainer = instanceRef.current;

      if (!webcontainer) {
        throw new Error("WebContainer instance is not available");
      }

      try {
        const pathParts = path.split("/");
        const folderPath = pathParts.slice(0, -1).join("/");

        if (folderPath) {
          await webcontainer.fs.mkdir(folderPath, {
            recursive: true,
          });
        }

        await webcontainer.fs.writeFile(path, content);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to write file";

        console.error(`Failed to write file at ${path}:`, err);

        throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
      }
    },
    [],
  );

  const deleteFileSync = useCallback(async (path: string): Promise<void> => {
    const webcontainer = instanceRef.current;

    if (!webcontainer) {
      throw new Error("WebContainer instance is not available");
    }

    try {
      await webcontainer.fs.rm(path);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete file";

      console.error(`Failed to delete file at ${path}:`, err);

      throw new Error(`Failed to delete file at ${path}: ${errorMessage}`);
    }
  }, []);

  const deleteFolderSync = useCallback(async (path: string): Promise<void> => {
    const webcontainer = instanceRef.current;

    if (!webcontainer) {
      throw new Error("WebContainer instance is not available");
    }

    try {
      await webcontainer.fs.rm(path, {
        recursive: true,
        force: true,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete folder";

      console.error(`Failed to delete folder at ${path}:`, err);

      throw new Error(`Failed to delete folder at ${path}: ${errorMessage}`);
    }
  }, []);

  const renameFileSync = useCallback(
    async (oldPath: string, newPath: string): Promise<void> => {
      const webcontainer = instanceRef.current;

      if (!webcontainer) {
        throw new Error("WebContainer instance is not available");
      }

      try {
        await webcontainer.fs.rename(oldPath, newPath);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to rename file";

        console.error(
          `Failed to rename file from ${oldPath} to ${newPath}:`,
          err,
        );

        throw new Error(
          `Failed to rename file from ${oldPath} to ${newPath}: ${errorMessage}`,
        );
      }
    },
    [],
  );

  const renameFolderSync = useCallback(
    async (oldPath: string, newPath: string): Promise<void> => {
      const webcontainer = instanceRef.current;

      if (!webcontainer) {
        throw new Error("WebContainer instance is not available");
      }

      try {
        await webcontainer.fs.rename(oldPath, newPath);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to rename folder";

        console.error(
          `Failed to rename folder from ${oldPath} to ${newPath}:`,
          err,
        );

        throw new Error(
          `Failed to rename folder from ${oldPath} to ${newPath}: ${errorMessage}`,
        );
      }
    },
    [],
  );

  const remountPersistedTree = useCallback(
    async (persistedTemplateData: TemplateFolder): Promise<void> => {
      const webcontainer = instanceRef.current;

      if (!webcontainer) {
        throw new Error("WebContainer instance is not available");
      }

      try {
        const filesystem = transformToWebContainerFormat(persistedTemplateData);

        await webcontainer.mount(filesystem);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to remount persisted tree";

        console.error("Failed to remount persisted tree:", err);

        throw new Error(`Failed to remount persisted tree: ${errorMessage}`);
      }
    },
    [],
  );

  const destroy = useCallback(async () => {
    if (destroyedRef.current) {
      return;
    }

    destroyedRef.current = true;

    killTrackedProcesses();

    const webcontainerInstance =
      instanceRef.current ??
      globalForWebContainer.__webcontainerInstance ??
      null;

    instanceRef.current = null;

    if (webcontainerInstance) {
      try {
        await webcontainerInstance.teardown();
      } catch (err) {
        console.warn("Failed to teardown WebContainer:", err);
      }
    }

    globalForWebContainer.__webcontainerInstance = null;
    globalForWebContainer.__webcontainerPromise = undefined;

    if (mountedRef.current) {
      setInstance(null);
      setServerUrl(null);
    }
  }, [killTrackedProcesses]);

  return {
    serverUrl,
    error,
    isLoading,
    instance,
    writeFileSync,
    deleteFileSync,
    deleteFolderSync,
    renameFileSync,
    renameFolderSync,
    remountPersistedTree,
    trackProcess,
    killTrackedProcesses,
    destroy,
  };
};

type WebContainerFile = {
  file: {
    contents: string;
  };
};

type WebContainerDirectory = {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
};

type WebContainerFileSystem = Record<
  string,
  WebContainerFile | WebContainerDirectory
>;

export function transformToWebContainerFormat(
  template: TemplateFolder,
): WebContainerFileSystem {
  const processItem = (
    item: TemplateFile | TemplateFolder,
  ): WebContainerFile | WebContainerDirectory => {
    if ("folderName" in item) {
      const directoryContents: WebContainerFileSystem = {};

      item.items.forEach((subItem) => {
        const key =
          "filename" in subItem
            ? subItem.fileExtension
              ? `${subItem.filename}.${subItem.fileExtension}`
              : subItem.filename
            : subItem.folderName;

        directoryContents[key] = processItem(subItem);
      });

      return {
        directory: directoryContents,
      };
    }

    return {
      file: {
        contents: item.content,
      },
    };
  };

  const result: WebContainerFileSystem = {};

  template.items.forEach((item) => {
    const key =
      "filename" in item
        ? item.fileExtension
          ? `${item.filename}.${item.fileExtension}`
          : item.filename
        : item.folderName;

    result[key] = processItem(item);
  });

  return result;
}
