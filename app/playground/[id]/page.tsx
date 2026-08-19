"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bot,
  FileText,
  Save,
  Settings,
  X,
  MoreHorizontal,
  AlertCircle,
  FolderOpen,
  Terminal,
} from "lucide-react";

import FileIcon from "@/modules/playground/components/file-icon";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import { useFileExplorer } from "@/modules/playground/hooks/useFileExplorer";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import { PlaygroundEditor } from "@/modules/playground/components/editor";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { UseWebContanier } from "@/modules/webcontainers/hooks/useWebContainer";
import WebContainerPreview from "@/modules/webcontainers/components/webcontainer-preview";
import {
  TemplateFile,
  TemplateFolder,
} from "@/modules/playground/lib/path-to-json";
import { findFilePath } from "@/modules/playground/lib";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/modules/playground/components/dialogs/confirmation-dialog";
import LoadingStep from "@/modules/playground/components/loadingStep";
import TerminalComponent from "@/modules/webcontainers/components/terminal";

import ToggleAI from "@/modules/playground/components/toogleAI";
import { UseAiSuggestions } from "@/modules/playground/hooks/useAisuggestions";

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // UI state
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [runtimeSyncStatus, setRuntimeSyncStatus] = useState<
    "synced" | "out-of-sync"
  >("synced");

  const [runtimeSyncError, setRuntimeSyncError] = useState<{
    fileId: string;
    filePath: string;
    content: string;
  } | null>(null);

  const AISuggestions = UseAiSuggestions();

  // Custom hooks
  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);
  //   const aiSuggestions = useAISuggestions();
  const {
    activeFileId,
    closeAllFiles,
    openFile,
    closeFile,
    editorContent,
    updateFileContent,
    handleAddFile,
    handleAddFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleRenameFile,
    handleRenameFolder,
    openFiles,
    setTemplateData,
    setActiveFileId,
    setPlaygroundId,
    setOpenFiles,
    setEditorContent,
  } = useFileExplorer();

  const lastSyncedContent = useRef<Map<string, string>>(new Map());
  const savingRef = useRef(new Set<string>());

  // Set template data when playground loads
  useEffect(() => {
    setPlaygroundId(id);
  }, [id, setPlaygroundId]);

  // Initialize zustand templateData from usePlayground only on first load
  useEffect(() => {
    if (templateData && !openFiles.length) {
      setTemplateData(templateData);
    }
  }, [templateData, setTemplateData, openFiles.length]);

  // Create wrapper functions that pass saveTemplateData
const {
  serverUrl,
  isLoading: containerLoading,
  error: containerError,
  instance,
  writeFileSync,
  deleteFileSync,
  deleteFolderSync,
  renameFileSync,
  renameFolderSync,
  remountPersistedTree,
} = UseWebContanier({
  templateData: templateData!,
});

const createFolderSync = useCallback(
  async (folderPath: string): Promise<void> => {
    if (!instance) {
      throw new Error("WebContainer is not available");
    }

    await instance.fs.mkdir(folderPath, {
      recursive: true,
    });
  },
  [instance],
);

const remountCurrentTree = useCallback(async (): Promise<void> => {
  const currentTemplateData = useFileExplorer.getState().templateData;

  if (!currentTemplateData) {
    throw new Error("Template data is not available");
  }

  await remountPersistedTree(currentTemplateData);
}, [remountPersistedTree]);

const wrappedHandleAddFile = useCallback(
  (newFile: TemplateFile, parentPath: string) => {
    return handleAddFile(
      newFile,
      parentPath,
      saveTemplateData,
      writeFileSync,
      remountCurrentTree,
    );
  },
  [handleAddFile, saveTemplateData, writeFileSync, remountCurrentTree],
);

const wrappedHandleAddFolder = useCallback(
  (newFolder: TemplateFolder, parentPath: string) => {
    return handleAddFolder(
      newFolder,
      parentPath,
      saveTemplateData,
      createFolderSync,
      remountCurrentTree,
    );
  },
  [handleAddFolder, saveTemplateData, createFolderSync, remountCurrentTree],
);

const wrappedHandleDeleteFile = useCallback(
  (file: TemplateFile, parentPath: string) => {
    return handleDeleteFile(
      file,
      parentPath,
      saveTemplateData,
      deleteFileSync,
      remountCurrentTree,
    );
  },
  [handleDeleteFile, saveTemplateData, deleteFileSync, remountCurrentTree],
);

const wrappedHandleDeleteFolder = useCallback(
  (folder: TemplateFolder, parentPath: string) => {
    return handleDeleteFolder(
      folder,
      parentPath,
      saveTemplateData,
      deleteFolderSync,
      remountCurrentTree,
    );
  },
  [handleDeleteFolder, saveTemplateData, deleteFolderSync, remountCurrentTree],
);

const wrappedHandleRenameFile = useCallback(
  (
    file: TemplateFile,
    newFilename: string,
    newExtension: string,
    parentPath: string,
  ) => {
    return handleRenameFile(
      file,
      newFilename,
      newExtension,
      parentPath,
      saveTemplateData,
      renameFileSync,
      remountCurrentTree,
    );
  },
  [handleRenameFile, saveTemplateData, renameFileSync, remountCurrentTree],
);

const wrappedHandleRenameFolder = useCallback(
  (folder: TemplateFolder, newFolderName: string, parentPath: string) => {
    return handleRenameFolder(
      folder,
      newFolderName,
      parentPath,
      saveTemplateData,
      renameFolderSync,
      remountCurrentTree,
    );
  },
  [handleRenameFolder, saveTemplateData, renameFolderSync, remountCurrentTree],
);

  const activeFile = openFiles.find((file) => file.id === activeFileId);
  const hasUnsavedChanges = openFiles.some((file) => file.hasUnsavedChanges);

  const handleFileSelect = (file: TemplateFile) => {
    openFile(file);
  };

  const retryRuntimeSync = useCallback(async () => {
    if (!runtimeSyncError || !writeFileSync) return;

    try {
      await writeFileSync(runtimeSyncError.filePath, runtimeSyncError.content);

      lastSyncedContent.current.set(
        runtimeSyncError.fileId,
        runtimeSyncError.content,
      );

      setRuntimeSyncStatus("synced");
      setRuntimeSyncError(null);

      toast.success("Runtime synced successfully");
    } catch (error) {
      console.error("Runtime retry failed:", error);

      toast.error("Runtime sync failed again");
    }
  }, [runtimeSyncError, writeFileSync]);

  const handleSave = useCallback(
    async (fileId?: string) => {
      const targetId = fileId ?? activeFileId;
      if (!targetId) return;
      if (savingRef.current.has(targetId)) return;

      savingRef.current.add(targetId);

      try {
        const fileToSave = openFiles.find((f) => f.id === targetId);
        if (!fileToSave) return;

        const storeTemplateData = useFileExplorer.getState().templateData;

        if (!storeTemplateData) return;

        const filePath = findFilePath(fileToSave, storeTemplateData);

        if (filePath === null || filePath === undefined) {
          toast.error(
            `Could not find: ${fileToSave.filename}.${fileToSave.fileExtension}`,
          );
          return;
        }

        const filename = `${fileToSave.filename}.${fileToSave.fileExtension}`;

        const fullFilePath = filePath ? `${filePath}/${filename}` : filename;

        const targetFilePath = filePath
          ? `${filePath}/${fileToSave.filename}.${fileToSave.fileExtension}`
          : `${fileToSave.filename}.${fileToSave.fileExtension}`;

        const normalizePath = (value: string) =>
          value.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");

        const normalizedTargetPath = normalizePath(targetFilePath);

        const updateItemsContent = (
          items: (TemplateFile | TemplateFolder)[],
          currentPath = "",
        ): (TemplateFile | TemplateFolder)[] => {
          let changed = false;

          const updated = items.map((item) => {
            if ("folderName" in item) {
              const folderPath = currentPath
                ? `${currentPath}/${item.folderName}`
                : item.folderName;

              const updatedChildren = updateItemsContent(
                item.items,
                folderPath,
              );

              if (updatedChildren !== item.items) {
                changed = true;

                return {
                  ...item,
                  items: updatedChildren,
                };
              }

              return item;
            }

            const currentFilePath = normalizePath(
              currentPath
                ? `${currentPath}/${item.filename}.${item.fileExtension}`
                : `${item.filename}.${item.fileExtension}`,
            );

            if (currentFilePath === normalizedTargetPath) {
              changed = true;

              return {
                ...item,
                content: fileToSave.content,
              };
            }

            return item;
          });

          return changed ? updated : items;
        };

        const updatedTemplate: TemplateFolder = {
          ...storeTemplateData,
          items: updateItemsContent(storeTemplateData.items),
        };

        //MongoDB is the source of truth.
        // Persist the template FIRST.
        await saveTemplateData(updatedTemplate);

        // 2. Database persistence succeeded.
        setTemplateData(updatedTemplate);

        const currentOpenFiles = useFileExplorer.getState().openFiles;

        setOpenFiles(
          currentOpenFiles.map((file) =>
            file.id === targetId
              ? {
                  ...file,
                  content: fileToSave.content,
                  originalContent: fileToSave.content,
                  hasUnsavedChanges: false,
                }
              : file,
          ),
        );

        //  Now it will sync the WebContainer.
        if (writeFileSync) {
          try {
            await writeFileSync(fullFilePath, fileToSave.content);

            lastSyncedContent.current.set(fileToSave.id, fileToSave.content);

            setRuntimeSyncStatus("synced");
            setRuntimeSyncError(null);

            toast.success(
              `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`,
            );
          } catch (runtimeError) {
            console.error("Runtime sync failed:", runtimeError);

            setRuntimeSyncStatus("out-of-sync");

            setRuntimeSyncError({
              fileId: fileToSave.id,
              filePath: fullFilePath,
              content: fileToSave.content,
            });

            toast.error(
              `Saved ${fileToSave.filename}.${fileToSave.fileExtension}, but runtime sync failed.`,
            );
          }
        } else {
          toast.success(
            `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`,
          );
        }
      } catch (error) {
        console.error("Database save failed:", error);

        const fileToSave = openFiles.find((f) => f.id === targetId);

        toast.error(
          `Failed saving ${fileToSave?.filename}.${fileToSave?.fileExtension}`,
        );
      } finally {
        savingRef.current.delete(targetId);
      }
    },
    [
      activeFileId,
      openFiles,
      writeFileSync,
      saveTemplateData,
      setTemplateData,
      setOpenFiles,
    ],
  );

  const handleSaveAll = useCallback(async () => {
    const unsavedFiles = openFiles.filter((file) => file.hasUnsavedChanges);

    if (!unsavedFiles.length) {
      toast.info("No unsaved changes");
      return;
    }

    try {
      for (const file of unsavedFiles) {
        await handleSave(file.id);
      }
      toast.success(`Saved ${unsavedFiles.length} file(s)`);
    } catch (error) {
      console.error("Save all failed:", error);
      toast.error("Failed saving some files");
    }
  }, [openFiles, handleSave]);

  // Ctrl+S to save, Ctrl+` to toggle terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        if (e.shiftKey) {

        e.preventDefault();
          handleSaveAll();
        } else {
          handleSave();
        }
      }
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        setIsTerminalVisible((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleSaveAll]);

  // Error state
  if (error) {
    return (
      <div className='flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4'>
        <AlertCircle className='h-12 w-12 text-red-500 mb-4' />
        <h2 className='text-xl font-semibold text-red-600 mb-2'>
          Something went wrong
        </h2>
        <p className='text-gray-600 mb-4'>{error}</p>
        <Button onClick={() => window.location.reload()} variant='destructive'>
          Try Again
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4'>
        <div className='w-full max-w-md p-6 rounded-lg shadow-sm border'>
          <h2 className='text-xl font-semibold mb-6 text-center'>
            Loading Playground
          </h2>
          <div className='mb-8'>
            <LoadingStep
              currentStep={1}
              step={1}
              label='Loading playground data'
            />
            <LoadingStep
              currentStep={2}
              step={2}
              label='Setting up environment'
            />
            <LoadingStep currentStep={3} step={3} label='Ready to code' />
          </div>
        </div>
      </div>
    );
  }

  // No template data
  if (!templateData) {
    return (
      <div className='flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4'>
        <FolderOpen className='h-12 w-12 text-amber-500 mb-4' />
        <h2 className='text-xl font-semibold text-amber-600 mb-2'>
          No template data available
        </h2>
        <Button onClick={() => window.location.reload()} variant='outline'>
          Reload Template
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <TemplateFileTree
          data={templateData}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
          title='File Explorer'
          onAddFile={wrappedHandleAddFile}
          onAddFolder={wrappedHandleAddFolder}
          onDeleteFile={wrappedHandleDeleteFile}
          onDeleteFolder={wrappedHandleDeleteFolder}
          onRenameFile={wrappedHandleRenameFile}
          onRenameFolder={wrappedHandleRenameFolder}
        />

        <SidebarInset>
          <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator orientation='vertical' className='mr-2 h-4' />

            <div className='flex flex-1 items-center gap-2'>
              <div className='flex flex-col flex-1'>
                <h1 className='text-sm font-medium'>
                  {playgroundData?.title || "Code Playground"}
                </h1>
                <p className='text-xs text-muted-foreground'>
                  {openFiles.length} file(s) open
                  {hasUnsavedChanges && " • Unsaved changes"}
                </p>
              </div>

              <div className='flex items-center gap-1'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleSave()}
                      disabled={!activeFile || !activeFile.hasUnsavedChanges}>
                      <Save className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save (Ctrl+S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={handleSaveAll}
                      disabled={!hasUnsavedChanges}>
                      <Save className='h-4 w-4' /> All
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save All (Ctrl+Shift+S)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='inline-flex'>
                      <ToggleAI
                        isEnabled={false}
                        onToggle={() => { }}
                        suggestionLoading={false}
                      />
                    </div>
                  </TooltipTrigger>

                  <TooltipContent>Coming Soon</TooltipContent>
                </Tooltip>

                {/* <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant={isTerminalVisible ? "default" : "outline"}
                      onClick={() => setIsTerminalVisible(!isTerminalVisible)}>
                      <Terminal className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Terminal (Ctrl+`)</TooltipContent>
                </Tooltip> */}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size='sm' variant='outline'>
                      <Settings className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      onClick={() => setIsPreviewVisible(!isPreviewVisible)}>
                      {isPreviewVisible ? "Hide" : "Show"} Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsTerminalVisible(!isTerminalVisible)}>
                      {isTerminalVisible ? "Hide" : "Show"} Terminal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={closeAllFiles}>
                      Close All Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {runtimeSyncStatus === "out-of-sync" && (
            <div className='flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-4 py-2'>
              <div className='flex items-center gap-2'>
                <AlertCircle className='h-5 w-5 text-amber-600' />

                <span className='text-sm text-amber-800'>
                  Changes are saved, but the runtime is out of sync.
                </span>
              </div>

              <Button onClick={retryRuntimeSync} variant='outline' size='sm'>
                Retry Sync
              </Button>
            </div>
          )}

          <div className='h-[calc(100vh-4rem)]'>
            {openFiles.length > 0 ? (
              <div className='h-full flex flex-col'>
                {/* File Tabs */}
                <div className='border-b bg-muted/30'>
                  <Tabs
                    value={activeFileId || ""}
                    onValueChange={setActiveFileId}>
                    <div className='flex items-center justify-between px-4 py-2'>
                      <TabsList className='h-8 bg-transparent p-0'>
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className='relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group'>
                            <div className='flex items-center gap-2'>
                              <FileText className='h-3 w-3' />
                              <span>
                                {file.filename}.{file.fileExtension}
                              </span>
                              {file.hasUnsavedChanges && (
                                <span className='h-2 w-2 rounded-full bg-orange-500' />
                              )}
                              <span
                                className='ml-2 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  closeFile(file.id);
                                }}>
                                <X className='h-3 w-3' />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {openFiles.length > 1 && (
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={closeAllFiles}
                          className='h-6 px-2 text-xs'>
                          Close All
                        </Button>
                      )}
                    </div>
                  </Tabs>
                </div>

                <div className='flex-1 overflow-hidden'>
                  <ResizablePanelGroup
                    orientation='vertical'
                    className='h-full'>
                    <ResizablePanel
                      defaultSize={isTerminalVisible ? 70 : 100}
                      minSize={20}>
                      <ResizablePanelGroup
                        orientation='horizontal'
                        className='h-full'>
                        <ResizablePanel
                          defaultSize={isPreviewVisible ? 50 : 100}>
                          <PlaygroundEditor
                            activeFile={activeFile}
                            content={activeFile?.content || ""}
                            onContentChange={(value) => {
                              if (activeFileId) {
                                updateFileContent(activeFileId, value);
                              }
                            }}
                            suggestion={AISuggestions.suggestion}
                            suggestionLoading={AISuggestions.isLoading}
                            suggestionPosition={AISuggestions.position}
                            onAcceptSuggestion={(editor, monaco) =>
                              AISuggestions.acceptSuggestion(editor, monaco)
                            }
                            onRejectSuggestion={(editor) =>
                              AISuggestions.rejectSuggestion(editor)
                            }
                            onTriggerSuggestion={(type, editor) =>
                              AISuggestions.fetchSuggestion(type, editor)
                            }
                          />
                        </ResizablePanel>

                        {isPreviewVisible && (
                          <>
                            <ResizableHandle />
                            <ResizablePanel defaultSize={50}>
                              <WebContainerPreview
                                templateData={templateData}
                                instance={instance}
                                writeFileSync={writeFileSync}
                                isLoading={containerLoading}
                                error={containerError}
                                serverUrl={serverUrl!}
                                forceResetup={false}
                              />
                            </ResizablePanel>
                          </>
                        )}
                      </ResizablePanelGroup>
                    </ResizablePanel>

                    {/* Bottom: Terminal */}
                    {isTerminalVisible && (
                      <>
                        <ResizableHandle
                          withHandle
                          className='hover:bg-primary/10 transition-colors data-resize-handle-active:bg-primary/20'
                        />

                        <ResizablePanel
                          defaultSize={30}
                          minSize={10}
                          maxSize={80}>
                          <TerminalComponent
                            webContainerInstance={instance}
                            className='h-full rounded-none border-0'
                          />
                        </ResizablePanel>
                      </>
                    )}
                  </ResizablePanelGroup>
                </div>
              </div>
            ) : (
              <div className='flex flex-col h-full items-center justify-center text-muted-foreground gap-4'>
                <FileText className='h-16 w-16 text-gray-300' />
                <div className='text-center'>
                  <p className='text-lg font-medium'>No files open</p>
                  <p className='text-sm text-gray-500'>
                    Select a file from the sidebar to start editing
                  </p>
                </div>
              </div>
            )}
          </div>
        </SidebarInset>

        <ConfirmationDialog
          isOpen={confirmationDialog.isOpen}
          title={confirmationDialog.title}
          description={confirmationDialog.description}
          onConfirm={confirmationDialog.onConfirm}
          onCancel={confirmationDialog.onCancel}
          setIsOpen={(open) =>
            setConfirmationDialog((prev) => ({ ...prev, isOpen: open }))
          }
        />
      </>
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;
