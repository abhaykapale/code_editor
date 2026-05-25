import  {useState, useEffect, useCallback} from "react";
import {toast} from "sonner"
import type { TemplateFolder } from "../lib/path-to-json";
import { getPlaygroundById, SaveUpdatedCode, getStarterTemplate } from "../actions";

interface PlaygroundData{
    id:string;
    title?: string;
    files: TemplateFolder;
    [key:string] :any;
}

interface UsePlaygroundReturn{
    playgroundData: PlaygroundData | null
    templateData: TemplateFolder | null
    isLoading: boolean
    error :string | null
    loadPlayground : ()=> Promise<void>
    saveTemplateData: (data: TemplateFolder)=> Promise<void>
    isSaving: boolean
}
export const usePlayground = (id: string) => {
    const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null> (null);
    const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState("Untitled")


    const loadPlayground = useCallback(async () => {
        if(!id) return ;
        try {
            setIsLoading(true);
            setError(null);
            const data = await getPlaygroundById(id);

            if (!data) {
                setPlaygroundData(null);
                setTemplateData(null);
                return;
            }

            // templateFiles[0].content is the serialized TemplateFolder JSON blob.
            // We must map it manually because Prisma returns { templateFiles: [{ content: JsonValue }] }
            // but PlaygroundData expects { files: TemplateFolder }.
            const files = (data.templateFiles[0]?.content ?? null) as unknown as TemplateFolder | null;

            setPlaygroundData({
                id: data.id,
                title: data.title,
                files: files!,
            });
            const rawcontent = data.templateFiles[0]?.content;

            if (rawcontent) {
                // Prisma Json fields can return either a string or a parsed object
                if (typeof rawcontent === 'string') {
                    setTemplateData(JSON.parse(rawcontent));
                } else {
                    // Already a parsed object from Prisma's Json type
                    setTemplateData(rawcontent as unknown as TemplateFolder);
                }
                toast.success("Playground loaded successfully");
                return;
            }

            // No saved content yet — load the starter template via server action
            const starterTemplate = await getStarterTemplate(data.template);
            
            if (starterTemplate) {
                setTemplateData(starterTemplate);
            } else {
                setTemplateData({
                    folderName: "Root",
                    items: [],
                });
            }
            toast.success("Template loaded successfully");
            

        } catch (error) {
            console.error("Error loading playground:", error);
            setError("Failed to load playground");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    const saveTemplateData = useCallback(async (data: TemplateFolder) => {
        try {
            setIsSaving(true);
            await SaveUpdatedCode(id, data);
            setTemplateData(data);
            toast.success("Changes saved successfully");
        } catch (error) {
            console.error("Error saving template data:", error);
            toast.error("Failed to save changes");
            throw error;
        } finally {
            setIsSaving(false);
        }
    }, [id]);

    useEffect(() => {
        loadPlayground();
    }, [loadPlayground]);


    return {
        playgroundData,
        templateData,
        isLoading,
        error,
        loadPlayground,
        saveTemplateData,
        isSaving,
    };
}