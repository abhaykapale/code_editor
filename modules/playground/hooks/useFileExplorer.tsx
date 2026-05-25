import {create} from 'zustand'
import {toast} from 'sonner'
import {TemplateFile,TemplateFolder} from '../lib/path-to-json'
import { generateFileId } from '../lib';
import { Field } from '@base-ui/react';

interface OpenFile extends TemplateFile {
    id: string;
    hasUnsavedChanges: boolean;
    content: string;
    originalContent: string;
}

interface FileExplorerState{
    playgroundId: string ;
    templateData: TemplateFolder | null ;
    openFiles: OpenFile[] ;
    activeFileId: string | null ;
    editorContent : string ;
    
    setPlaygroundId: (id: string) => void;
    setTemplateData: (data: TemplateFolder | null) => void;
    setEditorContent: (content: string) => void;
    setOpenFiles: (files: OpenFile[]) => void;
    setActiveFileId: (fileId: string | null) => void;

    openFile: (file: TemplateFile) => void;
    closeFile: (fileId: string) => void;
    closeAllFiles: ()=> void;
    switchToFile: (fileId: string) => void;
    markActiveFileSaved: () => void;
    markAllFilesSaved: () => void;
}
//@ts-ignore
export const useFileExplorer = create<FileExplorerState>((set, get) => ({
    templateData: null,
    playgroundId: "",
    openFiles: [] satisfies OpenFile[],
    activeFileId: null,
    editorContent: "",

    setTemplateData: (data) =>
        set({ templateData: data }),

    setPlaygroundId: (id) =>
        set({ playgroundId: id }),

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
        set({ editorContent: content, openFiles: updatedOpenFiles });
    },

    setOpenFiles: (files) =>
        set({ openFiles: files }),

    setActiveFileId: (fileId) =>
        set({ activeFileId: fileId }),

    openFile: (file)=>{
    const fileId = generateFileId(
        file,
        get().templateData!
    );

    const { openFiles } = get();

    const existingFile =
        openFiles.find(
            (f)=>f.id===fileId
        );

    if(existingFile){

        set({
            activeFileId:fileId,
            editorContent:
                existingFile.content
        });

        return;
    }

    const newOpenFile: OpenFile = {

        ...file,

        id:fileId,

        hasUnsavedChanges:false,

        content:
            file.content || "",

        originalContent:
            file.content || "",

    };

    set((state)=>({

        openFiles:[
            ...state.openFiles,
            newOpenFile
        ],

        activeFileId:fileId,

        editorContent:
            file.content || "",

    }));
},


   closeFile: (fileId) => {
    const { openFiles, activeFileId } = get();

    const newFiles = openFiles.filter(
        (f) => f.id !== fileId
    );

    let newActiveFileId = activeFileId;
    let newEditorContent = get().editorContent;

    // If closing active file
    if (activeFileId === fileId) {
        if (newFiles.length > 0) {
            const lastFile =
                newFiles[newFiles.length - 1];

            newActiveFileId =
                lastFile.id;

            newEditorContent =
                lastFile.content;
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

   switchToFile: (fileId) => {
    const { openFiles } = get();
    const file = openFiles.find((f) => f.id === fileId);
    if (file) {
        set({
            activeFileId: fileId,
            editorContent: file.content,
        });
    }
},

   markActiveFileSaved: () => {
    const { openFiles, activeFileId } = get();
    const updatedOpenFiles = openFiles.map((file) => {
        if (file.id === activeFileId) {
            return {
                ...file,
                originalContent: file.content,
                hasUnsavedChanges: false,
            };
        }
        return file;
    });
    set({ openFiles: updatedOpenFiles });
   },

   markAllFilesSaved: () => {
    const { openFiles } = get();
    const updatedOpenFiles = openFiles.map((file) => ({
        ...file,
        originalContent: file.content,
        hasUnsavedChanges: false,
    }));
    set({ openFiles: updatedOpenFiles });
   },
}));
