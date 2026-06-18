export const templatePaths = {
  REACT: "/starters/react",
  NEXTJS: "/starters/nextjs",
  VUE: "/starters/vue",
  EXPRESS: "/starters/express-simple",
  HONO: "/starters/hono-nodejs-starter",
  ANGULAR: "/starters/angular",
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