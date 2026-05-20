"use client"
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
    return (
        <div>
            Playground Id: {id}
        </div>
    )
}

export default MainPlaygroundPage;