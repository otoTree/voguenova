import {
  text,
  timestamp,
  uuid,
  varchar,
  pgTable,
} from "drizzle-orm/pg-core"

export const appUsers = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("invited"),
  company: varchar("company", { length: 255 }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const models = pgTable("models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  style: varchar("style", { length: 255 }).notNull(),
  backstory: text("backstory"),
  avatarUrl: text("avatar_url"),
  createdByUserId: uuid("created_by_user_id").references(() => appUsers.id, {
    onDelete: "set null",
  }),
  assignedOperatorId: uuid("assigned_operator_id").references(
    () => appUsers.id,
    {
      onDelete: "set null",
    }
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const images = pgTable("images", {
  id: uuid("id").defaultRandom().primaryKey(),
  modelId: uuid("model_id").references(() => models.id, {
    onDelete: "cascade",
  }),
  productId: uuid("product_id").references(() => resourceProducts.id, {
    onDelete: "set null",
  }),
  imageUrl: text("image_url").notNull(),
  prompt: text("prompt"),
  sourceType: varchar("source_type", { length: 50 }).notNull().default("generated"),
  generationMode: varchar("generation_mode", { length: 50 })
    .notNull()
    .default("text-to-image"),
  assetCategory: varchar("asset_category", { length: 50 })
    .notNull()
    .default("retouch"),
  variantLabel: varchar("variant_label", { length: 255 }),
  referenceImageUrls: text("reference_image_urls"),
  createdByUserId: uuid("created_by_user_id").references(() => appUsers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const videos = pgTable("videos", {
  id: uuid("id").defaultRandom().primaryKey(),
  imageId: uuid("image_id").references(() => images.id, {
    onDelete: "cascade",
  }),
  taskId: varchar("task_id", { length: 255 }).notNull(),
  videoUrl: text("video_url"),
  status: varchar("status", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const campaignRequests = pgTable("campaign_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  requesterUserId: uuid("requester_user_id").references(() => appUsers.id, {
    onDelete: "cascade",
  }),
  preferredModelId: uuid("preferred_model_id").references(() => models.id, {
    onDelete: "set null",
  }),
  assignedOperatorId: uuid("assigned_operator_id").references(
    () => appUsers.id,
    {
      onDelete: "set null",
    }
  ),
  productName: varchar("product_name", { length: 255 }).notNull(),
  brief: text("brief"),
  status: varchar("status", { length: 50 }).notNull().default("submitted"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const resourceProducts = pgTable("resource_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => appUsers.id, {
      onDelete: "cascade",
    }),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  sku: varchar("sku", { length: 255 }),
  imageUrl: text("image_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const resourceInstructions = pgTable("resource_instructions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull().default("general"),
  content: text("content").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => appUsers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})
