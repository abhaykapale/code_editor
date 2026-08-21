import { create } from "zustand";
import { toast } from "sonner";
import { TemplateFile, TemplateFolder } from "../lib/path-to-json";
import { generateFileId } from "../lib";
import { WebContainer } from "@webcontainer/api";

interface OpenFile extends TemplateFile {
  id: string;
  hasUnsavedChanges: boolean;
  content: string;
  originalContent: string;
  path: string;
}

type ProjectStatus = "SYNCED" | "OUT_OF_SYNC";

type SaveTemplateData = (data: TemplateFolder) => Promise<void>;

type WriteFileSync = (path: string, content: string) => Promise<void>;

type CreateFolderSync = (path: string) => Promise<void>;

type DeleteFileSync = (path: string) => Promise<void>;

type DeleteFolderSync = (path: string) => Promise<void>;

type RenameFileSync = (oldPath: string, newPath: string) => Promise<void>;

type RenameFolderSync = (oldPath: string, newPath: string) => Promise<void>;

type RemountPersistedTree = () => Promise<void>;


interface FileExplorerState {
  playgroundId: string;
  templateData: TemplateFolder | null;
  openFiles: OpenFile[];
  activeFileId: string | null;
  editorContent: string;
  projectStatus: ProjectStatus;

  setPlaygroundId: (id: string) => void;

  setTemplateData: (data: TemplateFolder | null) => void;

  setEditorContent: (content: string) => void;

  setOpenFiles: (files: OpenFile[]) => void;

  setActiveFileId: (fileId: string | null) => void;

  setProjectStatus: (status: ProjectStatus) => void;

  openFile: (file: TemplateFile, filePath?: string) => void;

  closeFile: (fileId: string) => void;

  closeAllFiles: () => void;

  handleAddFile: (
    newFile: TemplateFile,
    parentPath: string,
    saveTemplateData: SaveTemplateData,
    writeFileSync: WriteFileSync,
    remountPersistedTree?: RemountPersistedTree,
  ) => Promise<void>;

  handleAddFolder: (
    newFolder: TemplateFolder,
    parentPath: string,
    saveTemplateData: SaveTemplateData,
    createFolderSync: CreateFolderSync,
    remountPersistedTree?: RemountPersistedTree,
  ) => Promise<void>;

  handleDeleteFile: (
    file: TemplateFile,
    parentPath: string,
    saveTemplateData: SaveTemplateData,
    deleteFileSync?: DeleteFileSync,
    remountPersistedTree?: RemountPersistedTree,
  ) => Promise<void>;

  handleDeleteFolder: (
    folder: TemplateFolder,
    parentPath: string,
    saveTemplateData: SaveTemplateData,
    deleteFolderSync?: DeleteFolderSync,
    remountPersistedTree?: RemountPersistedTree,
  ) => Promise<void>;

  handleRenameFile: (
    file: TemplateFile,
    newFilename: string,
    newExtension: string,
    parentPath: string,
    saveTemplateData: SaveTemplateData,
    renameFileSync?: RenameFileSync,
    remountPersistedTree?: RemountPersistedTree,
  ) => Promise<void>;

  handleRenameFolder: (
    folder: TemplateFolder,
    newFolderName: string,
    parentPath: string,
    saveTemplateData: SaveTemplateData,
    renameFolderSync?: RenameFolderSync,
    remountPersistedTree?: RemountPersistedTree,
  ) => Promise<void>;

  updateFileContent: (fileId: string, content: string) => void;
}

function cloneTemplateData(templateData: TemplateFolder): TemplateFolder {
  return structuredClone(templateData);
}

function getFilePath(parentPath: string, file: TemplateFile): string {
  const filename = file.fileExtension
    ? `${file.filename}.${file.fileExtension}`
    : file.filename;

  return parentPath ? `${parentPath}/${filename}` : filename;
}

function getFolderPath(parentPath: string, folderName: string): string {
  return parentPath ? `${parentPath}/${folderName}` : folderName;
}

function findFolder(root: TemplateFolder, folderPath: string): TemplateFolder {
  const pathParts = folderPath.split("/").filter(Boolean);

  let currentFolder = root;

  for (const part of pathParts) {
    const nextFolder = currentFolder.items.find(
      (item) => "folderName" in item && item.folderName === part,
    ) as TemplateFolder | undefined;

    if (!nextFolder) {
      throw new Error(`Folder not found: ${folderPath}`);
    }

    currentFolder = nextFolder;
  }

  return currentFolder;
}

function collectFilePaths(folder: TemplateFolder, parentPath = ""): string[] {
  const paths: string[] = [];

  for (const item of folder.items) {
    if ("filename" in item) {
      paths.push(getFilePath(parentPath, item));
    } else {
      const folderPath = getFolderPath(parentPath, item.folderName);

      paths.push(...collectFilePaths(item, folderPath));
    }
  }

  return paths;
}

export const useFileExplorer = create<FileExplorerState>((set, get) => ({

  
  templateData: null,

  playgroundId: "",

  openFiles: [],

  activeFileId: null,

  editorContent: "",

  projectStatus: "SYNCED",

  setPlaygroundId: (id) =>
    set({
      playgroundId: id,
    }),

  setTemplateData: (data) =>
    set({
      templateData: data,
    }),

  setEditorContent: (content) => {
    const { openFiles, activeFileId } = get();

    const updatedOpenFiles = openFiles.map((file) => {
      if (file.id === activeFileId) {
        return {
          ...file,
          content,
          hasUnsavedChanges: content !== file.originalContent,
        };
      }

      return file;
    });

    set({
      editorContent: content,
      openFiles: updatedOpenFiles,
    });
  },

  setOpenFiles: (files) =>
    set({
      openFiles: files,
    }),

  setActiveFileId: (fileId) =>
    set({
      activeFileId: fileId,
    }),

  setProjectStatus: (status) =>
    set({
      projectStatus: status,
    }),

  openFile: (file, filePath) => {
    const templateData = get().templateData;

    if (!templateData) return;

    const resolvedPath = filePath ?? getFilePath("", file);

    const fileId = generateFileId(file, templateData);

    const existingFile = get().openFiles.find((f) => f.id === fileId);

    if (existingFile) {
      set({
        activeFileId: fileId,
        editorContent: existingFile.content,
      });

      return;
    }

    const newOpenFile: OpenFile = {
      ...file,
      id: fileId,
      path: resolvedPath,
      hasUnsavedChanges: false,
      content: file.content || "",
      originalContent: file.content || "",
    };

    set((state) => ({
      openFiles: [...state.openFiles, newOpenFile],
      activeFileId: fileId,
      editorContent: file.content || "",
    }));
  },

  closeFile: (fileId) => {
    const { openFiles, activeFileId } = get();

    const newFiles = openFiles.filter((file) => file.id !== fileId);

    let newActiveFileId = activeFileId;

    let newEditorContent = get().editorContent;

    if (activeFileId === fileId) {
      if (newFiles.length > 0) {
        const lastFile = newFiles[newFiles.length - 1];

        newActiveFileId = lastFile.id;

        newEditorContent = lastFile.content;
      } else {
        newActiveFileId = null;
        newEditorContent = "";
      }
    }

    set({
      openFiles: newFiles,
      activeFileId: newActiveFileId,
      editorContent: newEditorContent,
    });
  },

  closeAllFiles: () => {
    set({
      openFiles: [],
      activeFileId: null,
      editorContent: "",
    });
  },

  handleAddFile: async (
    newFile,
    parentPath,
    saveTemplateData,
    writeFileSync,
    remountPersistedTree,
  ) => {
    const { templateData } = get();

    if (!templateData) return;

    try {
      const updatedTemplateData = cloneTemplateData(templateData);

      const currentFolder = findFolder(updatedTemplateData, parentPath);

      const fileExists = currentFolder.items.some(
        (item) =>
          "filename" in item &&
          item.filename === newFile.filename &&
          item.fileExtension === newFile.fileExtension,
      );

      if (fileExists) {
        throw new Error(
          `File already exists: ${getFilePath(parentPath, newFile)}`,
        );
      }

      currentFolder.items.push(newFile);

      const filePath = getFilePath(parentPath, newFile);

      await saveTemplateData(updatedTemplateData);

      try {
        await writeFileSync(filePath, newFile.content || "");
      } catch (runtimeError) {
        console.error("WebContainer synchronization failed:", runtimeError);

        set({
          templateData: updatedTemplateData,
          projectStatus: "OUT_OF_SYNC",
        });

        if (remountPersistedTree) {
          try {
            await remountPersistedTree();

            set({
              projectStatus: "SYNCED",
            });
          } catch (remountError) {
            console.error("Failed to remount persisted tree:", remountError);
          }
        }

        throw new Error(
          "File was saved but WebContainer synchronization failed.",
        );
      }

      set({
        templateData: updatedTemplateData,
        projectStatus: "SYNCED",
      });

      get().openFile(newFile, filePath);

      toast.success(`Created file: ${filePath}`);
    } catch (error) {
      console.error("Error adding file:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to create file",
      );
    }
  },

  handleAddFolder: async (
    newFolder,
    parentPath,
    saveTemplateData,
    createFolderSync,
    remountPersistedTree,
  ) => {
    const { templateData } = get();

    if (!templateData) return;

    try {
      const updatedTemplateData = cloneTemplateData(templateData);

      const currentFolder = findFolder(updatedTemplateData, parentPath);

      const folderExists = currentFolder.items.some(
        (item) =>
          "folderName" in item && item.folderName === newFolder.folderName,
      );

      if (folderExists) {
        throw new Error(
          `Folder already exists: ${getFolderPath(
            parentPath,
            newFolder.folderName,
          )}`,
        );
      }

      currentFolder.items.push(newFolder);

      const folderPath = getFolderPath(parentPath, newFolder.folderName);

      await saveTemplateData(updatedTemplateData);

      try {
        await createFolderSync(folderPath);
      } catch (runtimeError) {
        console.error("WebContainer synchronization failed:", runtimeError);

        set({
          templateData: updatedTemplateData,
          projectStatus: "OUT_OF_SYNC",
        });

        if (remountPersistedTree) {
          try {
            await remountPersistedTree();

            set({
              projectStatus: "SYNCED",
            });
          } catch (remountError) {
            console.error("Failed to remount persisted tree:", remountError);
          }
        }

        throw new Error(
          "Folder was saved but WebContainer synchronization failed.",
        );
      }

      set({
        templateData: updatedTemplateData,
        projectStatus: "SYNCED",
      });

      toast.success(`Created folder: ${folderPath}`);
    } catch (error) {
      console.error("Error adding folder:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to create folder",
      );
    }
  },

  handleDeleteFile: async (
    file,
    parentPath,
    saveTemplateData,
    deleteFileSync,
    remountPersistedTree,
  ) => {
    const { templateData, openFiles } = get();

    if (!templateData) return;

    const filePath = getFilePath(parentPath, file);

    try {
      const updatedTemplateData = cloneTemplateData(templateData);

      const currentFolder = findFolder(updatedTemplateData, parentPath);

      const fileIndex = currentFolder.items.findIndex(
        (item) =>
          "filename" in item &&
          item.filename === file.filename &&
          item.fileExtension === file.fileExtension,
      );

      if (fileIndex === -1) {
        throw new Error(`File not found: ${filePath}`);
      }

      currentFolder.items.splice(fileIndex, 1);

      const fileId = generateFileId(file, templateData);

      if (openFiles.some((openFile) => openFile.id === fileId)) {
        get().closeFile(fileId);
      }

      await saveTemplateData(updatedTemplateData);

      if (deleteFileSync) {
        try {
          await deleteFileSync(filePath);
        } catch (runtimeError) {
          console.error("WebContainer synchronization failed:", runtimeError);

          set({
            templateData: updatedTemplateData,
            projectStatus: "OUT_OF_SYNC",
          });

          if (remountPersistedTree) {
            try {
              await remountPersistedTree();

              set({
                projectStatus: "SYNCED",
              });
            } catch (remountError) {
              console.error("Failed to remount persisted tree:", remountError);
            }
          }

          throw new Error(
            "File was saved but WebContainer synchronization failed.",
          );
        }
      }

      set({
        templateData: updatedTemplateData,
        projectStatus: "SYNCED",
      });

      toast.success(`Deleted file: ${filePath}`);
    } catch (error) {
      console.error("Error deleting file:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to delete file",
      );
    }
  },

  handleDeleteFolder: async (
    folder,
    parentPath,
    saveTemplateData,
    deleteFolderSync,
    remountPersistedTree,
  ) => {
    const { templateData } = get();

    if (!templateData) return;

    const folderPath = getFolderPath(parentPath, folder.folderName);

    try {
      const updatedTemplateData = cloneTemplateData(templateData);

      const currentFolder = findFolder(updatedTemplateData, parentPath);

      const folderIndex = currentFolder.items.findIndex(
        (item) => "folderName" in item && item.folderName === folder.folderName,
      );

      if (folderIndex === -1) {
        throw new Error(`Folder not found: ${folderPath}`);
      }

      currentFolder.items.splice(folderIndex, 1);

      const deletedFilePaths = collectFilePaths(folder, folderPath);

      const openFiles = get().openFiles;

      const affectedFiles = openFiles.filter((openFile) =>
        deletedFilePaths.includes(openFile.path),
      );

      for (const openFile of affectedFiles) {
        get().closeFile(openFile.id);
      }

      await saveTemplateData(updatedTemplateData);

      if (deleteFolderSync) {
        try {
          await deleteFolderSync(folderPath);
        } catch (runtimeError) {
          console.error("WebContainer synchronization failed:", runtimeError);

          set({
            templateData: updatedTemplateData,
            projectStatus: "OUT_OF_SYNC",
          });

          if (remountPersistedTree) {
            try {
              await remountPersistedTree();

              set({
                projectStatus: "SYNCED",
              });
            } catch (remountError) {
              console.error("Failed to remount persisted tree:", remountError);
            }
          }

          throw new Error(
            "Folder was saved but WebContainer synchronization failed.",
          );
        }
      }

      set({
        templateData: updatedTemplateData,
        projectStatus: "SYNCED",
      });

      toast.success(`Deleted folder: ${folderPath}`);
    } catch (error) {
      console.error("Error deleting folder:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to delete folder",
      );
    }
  },

  handleRenameFile: async (
    file,
    newFilename,
    newExtension,
    parentPath,
    saveTemplateData,
    renameFileSync,
    remountPersistedTree,
  ) => {
    const { templateData, openFiles, activeFileId } = get();

    if (!templateData) return;

    const oldPath = getFilePath(parentPath, file);

    const newFile: TemplateFile = {
      ...file,
      filename: newFilename,
      fileExtension: newExtension,
    };

    const newPath = getFilePath(parentPath, newFile);

    const oldFileId = generateFileId(file, templateData);

    const newFileId = generateFileId(newFile, templateData);

    try {
      const updatedTemplateData = cloneTemplateData(templateData);

      const currentFolder = findFolder(updatedTemplateData, parentPath);

      const fileIndex = currentFolder.items.findIndex(
        (item) =>
          "filename" in item &&
          item.filename === file.filename &&
          item.fileExtension === file.fileExtension,
      );

      if (fileIndex === -1) {
        throw new Error(`File not found: ${oldPath}`);
      }

      const duplicateFile = currentFolder.items.some(
        (item, index) =>
          index !== fileIndex &&
          "filename" in item &&
          item.filename === newFilename &&
          item.fileExtension === newExtension,
      );

      if (duplicateFile) {
        throw new Error(`File already exists: ${newPath}`);
      }

      currentFolder.items[fileIndex] = newFile;

      const updatedOpenFiles = openFiles.map((openFile) => {
        if (openFile.id !== oldFileId) {
          return openFile;
        }

        return {
          ...openFile,
          id: newFileId,
          filename: newFilename,
          fileExtension: newExtension,
          path: newPath,
        };
      });

      await saveTemplateData(updatedTemplateData);

      if (renameFileSync) {
        try {
          await renameFileSync(oldPath, newPath);
        } catch (runtimeError) {
          console.error("WebContainer synchronization failed:", runtimeError);

          set({
            templateData: updatedTemplateData,
            openFiles: updatedOpenFiles,
            activeFileId: activeFileId === oldFileId ? newFileId : activeFileId,
            projectStatus: "OUT_OF_SYNC",
          });

          if (remountPersistedTree) {
            try {
              await remountPersistedTree();

              set({
                projectStatus: "SYNCED",
              });
            } catch (remountError) {
              console.error("Failed to remount persisted tree:", remountError);
            }
          }

          throw new Error(
            "File was renamed in the project but WebContainer synchronization failed.",
          );
        }
      }

      set({
        templateData: updatedTemplateData,
        openFiles: updatedOpenFiles,
        activeFileId: activeFileId === oldFileId ? newFileId : activeFileId,
        projectStatus: "SYNCED",
      });

      toast.success(`Renamed file to: ${newPath}`);
    } catch (error) {
      console.error("Error renaming file:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to rename file",
      );
    }
  },

  handleRenameFolder: async (
    folder,
    newFolderName,
    parentPath,
    saveTemplateData,
    renameFolderSync,
    remountPersistedTree,
  ) => {
    const { templateData, openFiles, activeFileId } = get();

    if (!templateData) return;

    const oldFolderPath = getFolderPath(parentPath, folder.folderName);

    const newFolderPath = getFolderPath(parentPath, newFolderName);

    try {
      const updatedTemplateData = cloneTemplateData(templateData);

      const currentFolder = findFolder(updatedTemplateData, parentPath);

      const folderIndex = currentFolder.items.findIndex(
        (item) => "folderName" in item && item.folderName === folder.folderName,
      );

      if (folderIndex === -1) {
        throw new Error(`Folder not found: ${oldFolderPath}`);
      }

      const duplicateFolder = currentFolder.items.some(
        (item, index) =>
          index !== folderIndex &&
          "folderName" in item &&
          item.folderName === newFolderName,
      );

      if (duplicateFolder) {
        throw new Error(`Folder already exists: ${newFolderPath}`);
      }

      const updatedFolder = {
        ...currentFolder.items[folderIndex],
        folderName: newFolderName,
      } as TemplateFolder;

      currentFolder.items[folderIndex] = updatedFolder;

      const updatedOpenFiles = openFiles.map((openFile) => {
        const isInsideFolder =
          openFile.path === oldFolderPath ||
          openFile.path.startsWith(`${oldFolderPath}/`);

        if (!isInsideFolder) {
          return openFile;
        }

        const newPath = `${newFolderPath}${openFile.path.slice(
          oldFolderPath.length,
        )}`;

        return {
          ...openFile,
          path: newPath,
        };
      });

      await saveTemplateData(updatedTemplateData);

      if (renameFolderSync) {
        try {
          await renameFolderSync(oldFolderPath, newFolderPath);
        } catch (runtimeError) {
          console.error("WebContainer synchronization failed:", runtimeError);

          set({
            templateData: updatedTemplateData,
            openFiles: updatedOpenFiles,
            activeFileId,
            projectStatus: "OUT_OF_SYNC",
          });

          if (remountPersistedTree) {
            try {
              await remountPersistedTree();

              set({
                projectStatus: "SYNCED",
              });
            } catch (remountError) {
              console.error("Failed to remount persisted tree:", remountError);
            }
          }

          throw new Error(
            "Folder was renamed in the project but WebContainer synchronization failed.",
          );
        }
      }

      set({
        templateData: updatedTemplateData,
        openFiles: updatedOpenFiles,
        activeFileId,
        projectStatus: "SYNCED",
      });

      toast.success(`Renamed folder to: ${newFolderPath}`);
    } catch (error) {
      console.error("Error renaming folder:", error);

      toast.error(
        error instanceof Error ? error.message : "Failed to rename folder",
      );
    }
  },

  updateFileContent: (fileId, content) => {
    set((state) => ({
      openFiles: state.openFiles.map((file) =>
        file.id === fileId
          ? {
              ...file,
              content,
              hasUnsavedChanges: content !== file.originalContent,
            }
          : file,
      ),

      editorContent:
        fileId === state.activeFileId ? content : state.editorContent,
    }));
  },
}));
