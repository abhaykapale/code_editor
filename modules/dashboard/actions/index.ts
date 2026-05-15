"use server" ;

import { prisma } from "@/lib/db";
import { currentUser } from "@/modules/auth/actions";

export const getAllPlaygroundUser = async ()=>{
    const user =await currentUser()
    try {
        const playground = await prisma.playground.findMany({
            where : {
                userId:user?.id
            },
            include : {
                user: true
            }
        })

        return  playground 
    } catch (error) {
        console.log(error);
    }
}