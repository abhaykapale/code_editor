import {useState, useCallback, useEffect, useRef} from "react";

import {WebContainer} from '@webcontainer/api'

import { TemplateFolder } from "@/modules/playground/lib/path-to-json";

interface UseWebContanierProps {
    templateData : TemplateFolder
}

interface UseWebContanierReturn {
    templateData : TemplateFolder
    serverUrl : string | null;
    error : string | null;
    isLoading : boolean ;
    instance : WebContainer | null;
    writeFileSync : (path :string , content : string) => Promise<void>;
    destroy : ()=>void;
}

// Ensure WebContainer.boot() is called exactly once across all hook instances,
// React StrictMode double-mounts, and HMR cycles.
const globalForWebContainer = globalThis as unknown as {
    __webcontainerPromise?: Promise<WebContainer> | null;
};

function getWebContainerInstance(): Promise<WebContainer> {
    if (!globalForWebContainer.__webcontainerPromise) {
        globalForWebContainer.__webcontainerPromise = WebContainer.boot();
    }
    return globalForWebContainer.__webcontainerPromise;
}

export const UseWebContanier = ({templateData} : UseWebContanierProps)=> {

    const [serverUrl, setServerUrl]= useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [instance, setInstance] = useState<WebContainer | null>(null);
    const instanceRef = useRef<WebContainer | null>(null);
    
    
    useEffect( () => {
        let mounted = true;

        async function initialiseWebContainer() {
            try {
                const webcontainerInstance = await getWebContainerInstance();
                
                if(!mounted) return ;
                instanceRef.current = webcontainerInstance;
                setInstance(webcontainerInstance)
                setIsLoading(false)
                
            } catch (error) {
                console.error('Failed to initialize WebContainer:',error)
                if (mounted) {
                    setError(error instanceof Error ? error.message : 'Failed to initialize WebContainer');
                    setIsLoading(false);
                }   
            }
        }
        initialiseWebContainer();

        return ()=> {
            mounted = false;
            // Don't teardown on cleanup — the singleton persists for the page lifetime.
            // Teardown only happens explicitly via destroy().
        }
    },[] );


    const writeFileSync= useCallback(async (path: string , content : string):Promise<void> => {

        if(!instance)
        {
            throw new Error ('Webcontainer instance is not Available');
        }
        try {
            const pathParts = path.split('/');
            const folderPath = pathParts.slice(0,-1).join('/');

            if(folderPath)
            {
                await instance.fs.mkdir(folderPath , { recursive : true}) ;
            }

            await instance.fs.writeFile(path,content);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to write file';
            console.error( `Failed to write file at ${path}:`, err);
            throw new Error(`Failed to write file at ${path}: ${errorMessage}`);
        }

    }, [instance]
    );

    const destroy = useCallback ( ()=> {
        if(instanceRef.current)
            {
                instanceRef.current.teardown();
                instanceRef.current = null;
                globalForWebContainer.__webcontainerPromise = null; // Allow re-boot if needed
                setInstance(null);
                setServerUrl(null);
            } 

    }, [])


    return { serverUrl, isLoading , error, instance, writeFileSync , destroy}
}
