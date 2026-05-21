"use client"
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TemplateFileTree } from "@/modules/playground/components/playground-explorer";
import { usePlayground } from "@/modules/playground/hooks/usePlayground";
import { useParams } from "next/navigation";
import React from "react";

const MainPlaygroundPage =() =>
{
    const {id} = useParams<{id: string}>();

    const {
        playgroundData,
        templateData,
        loadPlayground,
        error,
        isLoading,
        saveTemplateData,
        isSaving
    } = usePlayground(id);
    if(isLoading) return <div>Loading...</div>;
    if(error) return <div>Error: {error}</div>;
    if(!templateData) return <div>No template found</div>;

    const activeFile= "sample.txt"

    return (
        <TooltipProvider>
            <>

                <TemplateFileTree
                    data={templateData}
                    onFileSelect={()=>{}}
                    selectedFile={activeFile}
                    title="File Explorer"
                    onAddFile={()=>{}}
                    onAddFolder={()=>{}}
                    onDeleteFile={()=>{}}
                    onDeleteFolder={()=>{}}
                    onRenameFile={()=>{}}
                    onRenameFolder={()=>{}} 
                />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="ml-1"/>
                    <Separator orientation="vertical" className="mr-2 h-4"/>
                </header>
                <div className="flex flex-1 items-center gap-2">
                    <div className="flex flex-col flex-1">
                        <h1>{playgroundData?.title || "Code Playground"}</h1>
                    </div>
                </div>
            </SidebarInset>
            </>
        </TooltipProvider>
    )
}

export default MainPlaygroundPage;