"use client";

import React, { useEffect, useState, useRef } from "react";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

import { WebContainer } from "@webcontainer/api";
import { TemplateFolder } from "@/modules/playground/lib/path-to-json";



interface WebContainerPreviewProps {
    templateData: TemplateFolder;
    serverUrl: string;
    isLoading: boolean;
    error: string | null;
    instance: WebContainer | null;
    writeFileSync: (path: string, content: string) => Promise<void>;
    forceResetup?: boolean;
}

const WebContainerPreview = ({
    templateData,
    serverUrl,
    isLoading,
    error,
    instance,
    writeFileSync,
    forceResetup =false,
}: WebContainerPreviewProps) => {

    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
    });

    const [currentStep, setCurrentStep] = useState(0);
    const totalSteps = 4;
    const [setupError, setSetupError] = useState<string | null>(null);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [isSetupInProgress, setIsSetupInProgress] = useState(false);


        useEffect (() => {
            
            async function setupContainer() {

                if(!instance || !templateData || isSetupComplete || isSetupInProgress) return ;

                try {
                    setIsSetupInProgress(true);
                    setSetupError(null);
                    
                    try {
                        const packageJsonExists = await instance.fs.readFile('package.json', "utf-8");

                        if(packageJsonExists) {
                            //Fast-path: container already has files from a previous setup
                            instance.on("server-ready" , (port:number, url :string) =>{
                                setPreviewUrl(url)
                                setLoadingState((prev)=> ({
                                    ...prev,
                                    starting: false,
                                    ready : true,
                                }));
                                setIsSetupComplete(true);
                                setIsSetupInProgress(false);
                            })

                            setCurrentStep(4);
                            setLoadingState((prev)=> ({...prev, starting: true}))
                            return; // Don't fall through to full setup
                        }
                    } catch (error) {
                        // File doesn't exist yet — proceed with full setup
                    }

                    //Transforming the data
                        setLoadingState((prev)=> ({...prev, transforming: true}));
                        setCurrentStep(1);
                        //TODO TERMINAL LOGIC

                        const files= transformToWebContainerFormat(templateData);
                        setLoadingState((prev)=> ({...prev, transforming: false, mounting:true}));

                        setCurrentStep(2);
                        //Mounting the files

                        //TODO terminal logic

                        await instance.mount(files)
                        //TODO terminal logic

                        setLoadingState((prev)=> ({...prev, mounting:false, installing: true}));
                        

                        setCurrentStep(3)
                        //Install dependencies
                        
                        //Todo Terminal Logic

                        const installProcess = await instance.spawn("npm" ,["install", "--legacy-peer-deps", "--no-audit"]);

                        installProcess.output.pipeTo(
                            new WritableStream ({

                                write(data) {
                                    console.log("[npm install]:", data);
                                }
                            })
                        )
                        const installExitCode = await installProcess.exit ; 

                        if(installExitCode !==0)
                        {
                            throw new Error(`Failed to install dependencies. Exit Code: ${installExitCode}`);
                        }

                        //Todo :: terminal logic

                        setLoadingState((prev)=> ({...prev, installing: false, starting:true}));

                        setCurrentStep(4);
                        
                        //Starting the server

                        //todo terminal logic

                        // Try to find the start/dev script from package.json
                        let startScript = "start";
                        try {
                            const packageJsonFile = await instance.fs.readFile("package.json", "utf-8");
                            const packageJson = JSON.parse(packageJsonFile);
                            if (packageJson.scripts) {
                                if (packageJson.scripts.dev) {
                                    startScript = "dev";
                                } else if (packageJson.scripts.start) {
                                    startScript = "start";
                                }
                            }
                        } catch (e) {
                            console.error("Could not parse package.json for start script, defaulting to start:", e);
                        }

                        const startProcess = await instance.spawn("npm", ["run", startScript]);

                        instance.on('server-ready' ,(port : number , url : string)=>{
                            //TODO terminal logic
                            setPreviewUrl(url)
                            setLoadingState((prev)=> ({...prev, starting: false, ready:true}));

                            setIsSetupComplete(true)
                            setIsSetupInProgress(false);
                        })

                        startProcess.output.pipeTo (
                            new WritableStream ({
                                write(data) {
                                    console.log("[npm start/dev]:", data);
                                },
                            })
                        )
                } catch (error) {
                    console.error("Error setting up container: ", error);
                    const errorMessage= error instanceof Error ? error.message : String(error);
                     
                    //todo terminal logic

                    setSetupError(errorMessage)
                    setIsSetupInProgress(false)
                    setLoadingState({transforming:false , installing:false, mounting: false, ready: false , starting: false});

                }

            }

            setupContainer();
        }, [instance,templateData, isSetupComplete, isSetupInProgress])

        useEffect(()=> {
            return ()=> {}
        }, []);

    const setupSteps = [
  "Transforming template data",
  "Mounting project files",
  "Installing dependencies",
  "Starting development server",
];

if (isLoading || !isSetupComplete) {
  return (
    <div className="h-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] rounded-full bg-violet-500/10 blur-[80px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/3 left-1/3 w-[250px] h-[250px] rounded-full bg-fuchsia-500/5 blur-[60px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '-3.5s' }} />

      <div className="w-[440px] rounded-3xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-xl p-8 shadow-[0_0_50px_-12px_rgba(168,85,247,0.18)] relative z-10 animate-float-card">

        <div className="flex justify-center mb-6 relative">
          <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-violet-400 shadow-inner">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-zinc-100 text-center mb-2 tracking-tight">
          Initializing Environment
        </h2>

        <p className="text-sm text-zinc-400 text-center mb-6 max-w-[320px] mx-auto leading-relaxed">
          Preparing your WebContainer and launching the workspace.
        </p>

        {/* Custom animated progress bar */}
        <div className="relative h-2 w-full bg-zinc-800/60 rounded-full overflow-hidden mb-8 border border-zinc-900">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        <div className="space-y-3">
          {setupSteps.map((step, index) => {
            const stepNumber = index + 1;
            const complete = stepNumber < currentStep;
            const active = stepNumber === currentStep;

            return (
              <div
                key={step}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 ${
                  active 
                    ? "bg-zinc-800/30 border-zinc-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.1)]" 
                    : "border-transparent text-zinc-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  {complete ? (
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 scale-100 transition-all duration-500 animate-[bounce_0.5s_ease-out_1]">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  ) : active ? (
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-6 w-6 rounded-full border border-zinc-800 text-zinc-600 bg-zinc-900/50">
                      <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                    </div>
                  )}

                  <span
                    className={`text-sm font-medium transition-all duration-300
                    ${
                      complete
                        ? "text-emerald-400/90 line-through decoration-zinc-700/30"
                        : active
                        ? "text-zinc-100 font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                        : "text-zinc-500"
                    }`}
                  >
                    {step}
                  </span>
                </div>

                {complete && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                    Done
                  </span>
                )}
                {active && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-sm animate-pulse">
                    Running
                  </span>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}


if (error || setupError) {
  return (
    <div className="h-full flex items-center justify-center">

      <div className="
        w-[450px]
        rounded-2xl
        border
        border-red-300/30
        bg-red-500/5
        p-8
        shadow-lg
      ">

        <div className="flex items-center gap-3 mb-4">

          <div className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-red-500/10
          ">
            <XCircle className="h-5 w-5 text-red-500" />
          </div>

          <div>
            <h2 className="font-semibold">
              Failed to initialize
            </h2>

            <p className="text-sm text-muted-foreground">
              Something went wrong
            </p>
          </div>

        </div>

        <div className="
          rounded-lg
          bg-muted
          p-4
          text-sm
          font-mono
          break-words
        ">
          {error || setupError}
        </div>

      </div>

    </div>
  );
}


return (
  <div className="h-full bg-background">
    {previewUrl ? (
      <iframe
        src={previewUrl}
        title="Preview"
        className="h-full w-full border-none bg-white"
      />
    ) : (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Awaiting server start...
      </div>
    )}
  </div>
);
};

export default WebContainerPreview;