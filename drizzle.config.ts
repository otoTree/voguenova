import "dotenv/config"

import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  tablesFilter: [
    "app_users",
    "models",
    "images",
    "videos",
    "video_projects",
    "video_project_scenes",
    "video_generations",
    "campaign_requests",
    "resource_products",
    "resource_instructions",
  ],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
})
