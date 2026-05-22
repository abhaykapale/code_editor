"use server"

import { prisma } from "@/lib/db"
import { TemplateFolder } from "../lib/path-to-json";
import { currentUser } from "@/modules/auth/actions";

export const getPlaygroundById = async(id:string) => {
    try {
        const playground = await prisma.playground.findUnique({
            where:{
                id
            },
            select : {
                id: true,
                title: true,
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
export const SaveUpdatedCode = async (id: string , data:TemplateFolder) => {
    const user = await currentUser()
    if(!user) {
        throw new Error("User not found");
    }
        const updatedPlayground = await prisma.templateFile.upsert({
            where : {
                playgroundId: id
            },
            update : {
                content: JSON.stringify(data),
            },
            create : {
                playgroundId: id,
                content:JSON.stringify(data),
            }
        })

        return updatedPlayground;
} 



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