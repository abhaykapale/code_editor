"use server";

import { prisma } from "@/lib/db";
import { ActionResponse } from "@/lib/template";
import { currentUser } from "@/modules/auth/actions";
import { Playground } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const getAllPlaygroundUser = async () => {
    const user = await currentUser()
    try {
        const playground = await prisma.playground.findMany({
            where: {
                userId: user?.id
            },
            include: {
                user: true,
                starMarks: {
                    where: {
                        userId: user?.id
                    },
                    select: {
                        isMarked: true,
                        id: true,
                        userId: true,
                        playgroundId: true
                    }
                }
            }
        })

        return playground
    } catch (error) {
        console.log(error);
        return {
            error: "Something went wrong",
            success: false
        }
    }
}

export const createPlayground = async (
    data: {
        title: string
        template: "REACT" | "NEXTJS" | "EXPRESS" | "ANGULAR" | "HONO" | "VUE"
        description?: string
    }
): Promise<ActionResponse<Playground>> => {
    const user = await currentUser()

    if (!user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        }
    }

    try {
        const playground = await prisma.playground.create({
            data: {
                ...data,
                userId: user.id
            }
        })

        return {
            success: true,
            data: playground
        }
    } catch (error) {
        console.error(error)

        return {
            success: false,
            error: "Something went wrong"
        }
    }
}

export const getPlaygroundById = async (
    id: string
): Promise<ActionResponse<any>> => {
    const user = await currentUser()

    if (!user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        }
    }

    try {
        const playground = await prisma.playground.findFirst({
            where: {
                id,
                userId: user.id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                starMarks: {
                    where: {
                        userId: user.id
                    }
                }
            }
        })

        if (!playground) {
            return {
                success: false,
                error: "Playground not found"
            }
        }

        return {
            success: true,
            data: playground
        }
    } catch (error) {
        console.error(error)

        return {
            success: false,
            error: "Something went wrong"
        }
    }
}

export const deleteProjectById = async (
    id: string
): Promise<ActionResponse> => {
    const user = await currentUser()

    if (!user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        }
    }

    try {
        const project = await prisma.playground.findFirst({
            where: {
                id,
                userId: user.id
            }
        })

        if (!project) {
            return {
                success: false,
                error: "Project not found"
            }
        }

        await prisma.playground.delete({
            where: {
                id
            }
        })

        revalidatePath("/dashboard")

        return {
            success: true
        }
    } catch (error) {
        console.error(error)

        return {
            success: false,
            error: "Delete failed"
        }
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

        revalidatePath('/dashboard')
        return { success: true, error: null, isMarked: newMarkedState }
    } catch (error) {
        console.log(error)
        return { success: false, error: "Something went wrong", isMarked: newMarkedState }
    }
}

export const editProjectById = async (
    id: string,
    data: {
        title: string
        description: string
    }
): Promise<ActionResponse> => {
    const user = await currentUser()

    if (!user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        }
    }

    try {
        const project = await prisma.playground.findFirst({
            where: {
                id,
                userId: user.id
            }
        })

        if (!project) {
            return {
                success: false,
                error: "Project not found"
            }
        }

        await prisma.playground.update({
            where: {
                id
            },
            data
        })

        revalidatePath("/dashboard")

        return {
            success: true
        }
    } catch (error) {
        console.error(error)

        return {
            success: false,
            error: "Update failed"
        }
    }
}

export const duplicateProjectById = async (
    id: string
): Promise<ActionResponse<Playground>> => {
    const user = await currentUser()

    if (!user?.id) {
        return {
            success: false,
            error: "Unauthorized"
        }
    }

    try {
        const original = await prisma.playground.findFirst({
            where: {
                id,
                userId: user.id
            }
        })

        if (!original) {
            return {
                success: false,
                error: "Project not found"
            }
        }

        const duplicate = await prisma.playground.create({
            data: {
                title: `${original.title} (Copy)`,
                description: original.description,
                template: original.template,
                userId: user.id
            }
        })

        revalidatePath("/dashboard")

        return {
            success: true,
            data: duplicate
        }
    } catch (error) {
        console.error(error)

        return {
            success: false,
            error: "Duplicate failed"
        }
    }
}

