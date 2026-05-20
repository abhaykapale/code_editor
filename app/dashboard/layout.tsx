import { SidebarProvider } from "@/components/ui/sidebar";
import { getAllPlaygroundUser } from "@/modules/dashboard/actions";
import { DashboardSidebar } from "@/modules/dashboard/components/dashboard-sidebar";
import React from "react";

export default async function DashboardLayout ( {children} :{children:React.ReactNode} ) {
    
    const playgroundData =await getAllPlaygroundUser()
    const technologyIconMap : Record<string,string> = {
        REACT: "Zap",
        NEXTJS: "Lightbulb",
        EXPRESS: "Database",
        VUE: "Compass",
        HONO: "FlameIcon",
        ANGULAR: "Terminal",
    }

    const formattedPlaygroundData = playgroundData?.map((item)=> ({
        id :item.id,
        name: item.title,
        //todo: star realted thing 
        starred: item.starMarks?.[0]?.isMarked || false,
        icon : technologyIconMap[item.template] || "Code2",
    }))   ?? []



    return (
        <SidebarProvider>
            <div className="flex min-h w-full overflow-x-hidden">
            {/*DASHBOARD UI SIDEBAR*/ }
            <DashboardSidebar initialPlaygroundData = {formattedPlaygroundData} />
            <main className="flex-1">
                {children}
            </main>
            </div>
        </SidebarProvider>
    )
}

