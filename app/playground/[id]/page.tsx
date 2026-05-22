"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    Bot,
    FileText,
    Save,
    Settings,
    X,
    MoreHorizontal,
} from "lucide-react";

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

import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import { useFileExplorer } from "@/modules/playground/hooks/useFileExplorer";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";

const MainPlaygroundPage = () => {
    const { id } = useParams<{ id: string }>();

    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

    const {
        playgroundData,
        templateData,
        saveTemplateData,
    } = usePlayground(id);

    const {
        setActiveFileId,
        setPlaygroundId,
        openFile,
        openFiles,
        closeFile,
        closeAllFiles,
        switchToFile,
        setTemplateData,
        setEditorContent,
        activeFileId,
        editorContent,
    } = useFileExplorer();

    useEffect(() => {
        setPlaygroundId(id);
    }, [id]);

    useEffect(() => {
        if (templateData && !openFiles.length) {
            setTemplateData(templateData);
        }
    }, [templateData]);

    const activeFile =
        openFiles.find(
            (file) => file.id === activeFileId
        );

    const hasUnsavedChanges =
        openFiles.some(
            (file) => file.hasUnsavedChanges
        );

    const handleFileSelect = (file: any) => {
        openFile(file);
    };

    const handleSave = async () => {
        if (!activeFile || !templateData) return;

        // Build an updated template tree with the active file's new content
        const updateFileInTree = (folder: any): any => ({
            ...folder,
            items: folder.items.map((item: any) => {
                if ("items" in item) {
                    return updateFileInTree(item);
                }
                // Match by filename + extension
                if (
                    item.filename === activeFile.filename &&
                    item.fileExtension === activeFile.fileExtension
                ) {
                    return { ...item, content: editorContent };
                }
                return item;
            }),
        });

        const updatedTree = updateFileInTree(templateData);
        await saveTemplateData(updatedTree);
    };

    return (
        <TooltipProvider>
            <>
                <TemplateFileTree
                    data={templateData}
                    onFileSelect={handleFileSelect}
                    selectedFile={activeFile}
                    title="File Explorer"
                    onAddFile={() => {}}
                    onAddFolder={() => {}}
                    onDeleteFile={() => {}}
                    onDeleteFolder={() => {}}
                    onRenameFile={() => {}}
                    onRenameFolder={() => {}}
                />

                <SidebarInset>

                    <header className="flex h-16 items-center gap-2 border-b px-4">

                        <SidebarTrigger />
                        <Separator
                            orientation="vertical"
                            className="h-4"
                        />

                        <div className="flex flex-1 justify-between">

                            <div>
                                <h1>
                                    {playgroundData?.title ??
                                        "Code Playground"}
                                </h1>

                                <p className="text-xs text-muted-foreground">

                                    {openFiles.length} files open

                                    {hasUnsavedChanges &&
                                        " • Unsaved changes"}

                                </p>
                            </div>

                            <div className="flex gap-2">

                                <Tooltip>

                                    <TooltipTrigger asChild>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={
                                                !activeFile ||
                                                !activeFile.hasUnsavedChanges
                                            }
                                            onClick={handleSave}
                                        >
                                            <Save />

                                            Save
                                        </Button>

                                    </TooltipTrigger>

                                    <TooltipContent>

                                        Ctrl + S

                                    </TooltipContent>

                                </Tooltip>


                                <Tooltip>

                                    <TooltipTrigger asChild>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={
                                                !hasUnsavedChanges
                                            }
                                            onClick={handleSave}
                                        >
                                            <Save />

                                            Save All
                                        </Button>

                                    </TooltipTrigger>

                                    <TooltipContent>

                                        Ctrl + Shift + S

                                    </TooltipContent>

                                </Tooltip>


                                <Button
                                    size="icon"
                                    aria-label="AI Assistant"
                                >

                                    <Bot />

                                </Button>


                                <DropdownMenu>

                                    <DropdownMenuTrigger
                                        asChild
                                    >

                                        <Button
                                            size="icon"
                                            variant="outline"
                                        >

                                            <Settings />

                                        </Button>

                                    </DropdownMenuTrigger>


                                    <DropdownMenuContent>

                                        <DropdownMenuItem
                                            onClick={() =>
                                                setIsPreviewVisible(
                                                    !isPreviewVisible
                                                )
                                            }
                                        >

                                            {isPreviewVisible
                                                ? "Hide"
                                                : "Show"}

                                            Preview

                                        </DropdownMenuItem>


                                        <DropdownMenuSeparator />


                                        <DropdownMenuItem
                                            onClick={
                                                closeAllFiles
                                            }
                                        >

                                            Close All Files

                                        </DropdownMenuItem>

                                    </DropdownMenuContent>

                                </DropdownMenu>

                            </div>

                        </div>

                    </header>


                    <div className="h-[calc(100vh-4rem)]">

                        {openFiles.length ? (

                            <Tabs
                                value={
                                    activeFileId ?? ""
                                }

                                onValueChange={
                                    switchToFile
                                }

                                className="h-full"
                            >

                                <div className="border-b">

                                    <TabsList className="bg-transparent">

                                        {openFiles.map(
                                            (file) => (

                                                <TabsTrigger
                                                    key={
                                                        file.id
                                                    }

                                                    value={
                                                        file.id
                                                    }

                                                    className="group"
                                                >

                                                    <FileText
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    <span>

                                                        {
                                                            file.filename
                                                        }

                                                        .

                                                        {
                                                            file.fileExtension
                                                        }

                                                    </span>


                                                    {file.hasUnsavedChanges && (

                                                        <div
                                                            className="
                                                            h-2
                                                            w-2
                                                            rounded-full
                                                            bg-orange-500
                                                        "
                                                        />

                                                    )}


                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            closeFile(file.id);
                                                        }}
                                                        className="
                                                            opacity-0
                                                            group-hover:opacity-100
                                                            cursor-pointer
                                                            p-1
                                                            rounded
                                                            hover:bg-gray-700
                                                        "
                                                    >
                                                        ✕
                                                    </span>

                                                </TabsTrigger>

                                            )
                                        )}

                                    </TabsList>


                                    {openFiles.length >
                                        1 && (

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={
                                                closeAllFiles
                                            }
                                        >

                                            <MoreHorizontal />

                                        </Button>

                                    )}

                                </div>

                                <div className="flex-1 h-[calc(100%-2.5rem)] overflow-hidden">
                                    {activeFile && (
                                        <textarea
                                            className="w-full h-full bg-background text-foreground font-mono text-sm p-4 resize-none outline-none border-0"
                                            value={editorContent}
                                            onChange={(e) => {
                                                const newContent = e.target.value;
                                                setEditorContent(newContent);
                                            }}
                                            spellCheck={false}
                                        />
                                    )}
                                </div>

                            </Tabs>

                        ) : (

                            <div
                                className="
                                flex
                                h-full
                                items-center
                                justify-center
                                flex-col
                            "
                            >

                                <FileText
                                    size={64}
                                />

                                <h2>

                                    No File Selected

                                </h2>

                                <p>

                                    Open a file to start

                                </p>

                            </div>

                        )}

                    </div>

                </SidebarInset>

            </>
        </TooltipProvider>
    );
};

export default MainPlaygroundPage;