import NextAuth from "next-auth"

import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

import { PrismaAdapter } from "@auth/prisma-adapter"

import { prisma } from "@/lib/db"
import { getUserById } from "./modules/auth/actions"

export const { handlers, auth, signIn, signOut } = NextAuth({

  adapter: PrismaAdapter(prisma),

  providers: [

    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),

    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),

  ],

  session: {
    strategy: "jwt"
  },

  callbacks: {

    async signIn({ user, account, profile }) {

      console.log(user)
      console.log(account)
      console.log(profile)

      return true
    },

    async jwt({ token }) {

      if(!token.sub) return token

      const existingUser = await getUserById(token.sub)

      if(!existingUser) return token

      token.role = existingUser.role
      token.email=existingUser.email
      token.name=existingUser.name

      return token
  },


    async session({ session, token }) {

      if (token.sub  && session.user) {
        session.user.id = token.sub as string
        // session.user.role = token.role
      }
      if (token.sub  && session.user) {
        
        //@ts-ignore

        session.user.role = token.role as string
        
        // session.user.role = token.role
      }

      return session
    }

  }

})