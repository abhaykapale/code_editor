// import { TemplateFile, TemplateFolder } from "./path-to-json";

/**
 * Generates a unique file ID based on file location
 * in the folder structure.
 *
 * @param file - The file to generate an ID for
 * @param rootFolder - The root template folder containing all files
 * @returns A unique file identifier including full path
 */

import { TemplateFile, TemplateFolder } from "./path-to-json";

export const findFilePath = (
    targetFile: TemplateFile,
    folder: TemplateFolder,
    currentPath = ""
): string | null => {

    for (const item of folder.items) {

        if ("items" in item) {
            const result = findFilePath(
                targetFile,
                item,
                `${currentPath}/${item.folderName}`
            );

            if (result) {
                return result;
            }
        }

        else if (
            item.filename === targetFile.filename &&
            item.fileExtension === targetFile.fileExtension
        ) {
            return currentPath;
        }
    }

    return null;
};

export const generateFileId = (
    file: TemplateFile,
    rootFolder: TemplateFolder
): string => {

    const path =
        findFilePath(file, rootFolder)?.replace(/^\/+/, "") || "";

    const extension =
        file.fileExtension?.trim();

    const extensionSuffix =
        extension ? `.${extension}` : "";

    return path
        ? `${path}/${file.filename}${extensionSuffix}`
        : `${file.filename}${extensionSuffix}`;
};