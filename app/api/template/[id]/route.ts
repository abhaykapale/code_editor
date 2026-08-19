import {
  readTemplateStructureFromJson,
  saveTemplateStructureToJson,
} from "@/modules/playground/lib/path-to-json";
import { prisma } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import path from "path";
import fs from "fs/promises";
import { NextRequest } from "next/server";
import { auth } from "../../../../auth";
// import { error } from "console";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        {
          error: "Template id is required",
        },
        {
          status: 400,
        },
      );
    }

    const session = await auth();

    if (!session?.user?.id) {
      return Response.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const playground = await prisma.playground.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        template: true,
      },
    });

    if (!playground) {
      return Response.json(
        {
          error: "Template not found",
        },
        {
          status: 404,
        },
      );
    }

    const templateKey = playground.template as keyof typeof templatePaths;

    const templatePath = templatePaths[templateKey];

    if (!templatePath) {
      return Response.json(
        {
          error: "Invalid template",
        },
        {
          status: 400,
        },
      );
    }

    const fullPath = path.join(process.cwd(), templatePath);

    const outputPath = path.join(
      process.cwd(),
      "output",
      `${crypto.randomUUID()}.json`,
    );

    try {
      await saveTemplateStructureToJson(fullPath, outputPath);

      const result = await readTemplateStructureFromJson(outputPath);

      return Response.json({
        success: true,
        data: {
          template: result,
          templateName: templateKey,
        },
      });
    } finally {
      await fs.unlink(outputPath).catch(() => {});
    }
  } catch (error) {
    console.log("Error while fetching template", error);

    return Response.json(
      {
        error: "Failed to fetch template",
      },
      {
        status: 500,
      },
    );
  }
}
