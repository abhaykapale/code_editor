"use server" ;

import { prisma } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";
import { revalidatePath } from "next/cache";
import { use } from "react";

export const getAllPlaygroundUser = async ()=>{
    const user =await currentUser()
    try {
        const playground = await prisma.playground.findMany({
            where : {
                userId:user?.id
            },
            include : {
                user: true,
                starMarks: {
                    where : {
                        userId:user?.id
                    },
                    select:{
                        isMarked:true,
                        id:true,
                        userId:true,
                        playgroundId:true
                    }
                }
            }
        })

        return  playground 
    } catch (error) {
        console.log(error);
    }
}

export const createPlayground = async(data: {
    title: string,
    template: "REACT" | 'NEXTJS' | 'EXPRESS' | 'ANGULAR' | 'HONO' | 'VUE',
    description? : string,

})=>
{
    const user = await currentUser()
    const {title , template, description} = data;
    try {
        const playground = await prisma.playground.create({
            data: {
                title: title,
                template: template,
                description: description,
                userId : user?.id!,

            }
        })
        return playground
    } catch (error) {
        
    }
}

export const getPlaygroundById = async (id:string)=>
{   
    const user =await currentUser()
    try {
        const playground = await prisma.playground.findUnique({
            where : {
                id
            },
            include : {
                user: true,
                starMarks: {
                    where : {
                        userId:user?.id
                    },
                    select:{
                        isMarked:true,
                        id:true,
                        userId:true,
                        playgroundId:true
                    }
                }
            }
        })

        return  playground 
    } catch (error) {
        console.log(error);
    }
    
}
export const deleteProjectById = async (id: string)=>
{
    try {
        await prisma.playground.delete({
            where : {
                id
            }
        })
        revalidatePath('/dashboard')
    } catch (error) {
        console.log(error);
        
    }
}

export const toggleStarMark = async (playgroundId: string, newMarkedState: boolean) => {
    try {
        const user = await currentUser()
        if (!user?.id) return { success: false, error: "Unauthorized", isMarked: false }

        await prisma.starMark.upsert({
            where: {
                userId_playgroundId: {
                    userId: user.id,
                    playgroundId,
                },
            },
            update: { isMarked: newMarkedState },
            create: {
                userId: user.id,
                playgroundId,
                isMarked: newMarkedState,
            },
        })

        revalidatePath('/dashboard', 'layout')
        return { success: true, error: null, isMarked: newMarkedState }
    } catch (error) {
        console.log(error)
        return { success: false, error: "Something went wrong", isMarked: newMarkedState }
    }
}
export const editProjectById = async (id:string ,data:{title : string  , description: string} )=>
{
    try {
        // const {title, description} =data;

        await prisma.playground.update({
            where : {
                  id
                },
                data:data
        })
        revalidatePath('/dashboard')
    } catch (error) {
        console.log(error);
        
    }
}

export const duplicateProjectById = async (id:string)=>
{
    try {
        const OG=await prisma.playground.findUnique ({
            where : {
                id
            }
            //todo template files
        })

        if(!OG) throw new Error ("original playground not found")

            const duplicatePlayground= await prisma.playground.create ({
                data : {
                    title :`${OG.title}(Copy)`,
                    description : `${OG.description}`,
                    template :`${OG.template}`,
                    userId  : `${OG.userId}`,

                    // todo add template files
                }
            })

        revalidatePath('/dashboard')
    } catch (error) {
        console.log(error);
        
    }
}

