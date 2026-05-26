"use server"

import { prisma } from "@/lib/db"
import { TemplateFolder, scanTemplateDirectory } from "../lib/path-to-json";
import { currentUser } from "@/modules/auth/actions";
import { templatePaths } from "@/lib/template";
import path from "path";

export const getStarterTemplate = async (templateKey: string): Promise<TemplateFolder | null> => {
    try {
        const templatePath = templatePaths[templateKey as keyof typeof templatePaths];
        if (!templatePath) {
            console.error(`Unknown template key: ${templateKey}`);
            return null;
        }
        const fullPath = path.join(process.cwd(), templatePath);
        const result = await scanTemplateDirectory(fullPath);
        return result;
    } catch (error) {
        console.error("Error loading starter template:", error);
        return null;
    }
}

export const getPlaygroundById = async(id:string) => {
    try {
        const playground = await prisma.playground.findUnique({
            where:{
                id
            },
            select : {
                id: true,
                title: true,
                template: true,
                templateFiles :{
                    select : {
                        content:true,
                    }
                }
            }
        })

        if(!playground) return null;

        return playground;

    } catch ( error)
    {
        console.log("Error while fetching playground",error);
        return null;
    }
}
export const SaveUpdatedCode = async (id: string, data: TemplateFolder) => {
    const user = await currentUser();
    if (!user) {
        throw new Error("Unauthorized: You must be signed in to save changes.");
    }

    // Verify the playground exists and belongs to the current user
    const playground = await prisma.playground.findUnique({
        where: { id },
        select: { userId: true },
    });

    if (!playground) {
        throw new Error("Not found: Playground does not exist.");
    }

    if (playground.userId !== user.id) {
        throw new Error("Forbidden: You do not have permission to edit this playground.");
    }

    const updatedPlayground = await prisma.templateFile.upsert({
        where: {
            playgroundId: id,
        },
        update: {
            content: JSON.stringify(data),
        },
        create: {
            playgroundId: id,
            content: JSON.stringify(data),
        },
    });

    return updatedPlayground;
};



// export const updatePlayground = async(id:string, content: string)=> {
//     try {
//         const updatePlayground = await prisma.templateFile.update({
//             where:{
//                 id
//             },
//             data:{
//                 content
//             }
//         })
//         return updatePlayground;
//     } catch (error) {
//         console.log("Error while updating playground",error);
//         return null;
//     }
// }