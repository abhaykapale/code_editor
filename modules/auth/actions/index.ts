"user server"

import {auth} from "@/auth"
import { prisma } from "@/lib/db"

export const getUserById  = async (id: string) =>
{
  try {
      const user = await prisma.user.findUnique ( {
          where : {id},
          include : {
              accounts: true
          }
      })

        return user;

  } catch (error) {
    
    console.log(error);
    return null 
  }


}

export const getAccountsByUserId = async (userId: string) => {

   try {

      const accounts = await prisma.account.findMany({
         where: {
            userId
         }
      })

      return accounts

   } catch (error) {

      console.log(error)
      return null
   }
}
export const currUser= async()=>{
    const user = await auth()
    return user?.user
} 