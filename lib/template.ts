import path from "node:path";

export const templatePaths = {
  REACT: "react",
  NEXTJS: "nextjs",
  VUE: "vue",
  EXPRESS: "express-simple",
  HONO: "hono-nodejs-starter",
  ANGULAR: "angular",
} as const;

export function getTemplatePath(templateKey: keyof typeof templatePaths) {
  return path.join(process.cwd(), "starters", templatePaths[templateKey]);
}
export type ActionResponse<T = null> = {
    success: boolean
    data?: T
    error?: string
}
export const templateFile ={
  "react": [
    "src/App.tsx",
    "src/index.tsx",
    "src/style.css"
  ],
  "nextjs": [
    "app/page.tsx",
    "app/layout.tsx",
    "app/globals.css"
  ],
  "vue": [
    "src/App.vue",
    "src/main.ts",
    "src/style.css"
  ],
  "express": [
    "index.js",
  ],
  "hono": [
    "src/index.ts",
  ],
  "angular": [
    "src/app/app.component.ts",
    "src/app/app.module.ts",
    "src/app/app.component.css"
  ],
}
