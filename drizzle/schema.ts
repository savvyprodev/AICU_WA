import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const userRole = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Legacy external identifier (historically used for auth). Unique per user. */
  openId: varchar("open_id", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userIdentities = pgTable(
  "user_identities",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("user_identities_user_id_idx").on(t.userId),
    providerSubjectUq: uniqueIndex("user_identities_provider_subject_uq").on(
      t.provider,
      t.subject
    ),
  })
);

export type UserIdentity = typeof userIdentities.$inferSelect;
export type InsertUserIdentity = typeof userIdentities.$inferInsert;

/**
 * AI Chat table storing conversations from various AI platforms.
 * Stores the full conversation thread as JSON for flexibility.
 */
export const aiChats = pgTable("ai_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  aiTool: varchar("ai_tool", { length: 64 }).notNull(), // e.g., "ChatGPT", "Claude", "Gemini"
  accountTag: varchar("account_tag", { length: 255 }), // User-defined account identifier
  title: varchar("title", { length: 500 }).notNull(),
  fullConversation: jsonb("full_conversation").notNull(), // Array of message objects
  messageCount: integer("message_count").default(0),
  tags: jsonb("tags"), // Array of custom tags
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AiChat = typeof aiChats.$inferSelect;
export type InsertAiChat = typeof aiChats.$inferInsert;

/**
 * AI Tools reference table for managing available AI platforms.
 */
export const aiTools = pgTable("ai_tools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(), // e.g., "ChatGPT", "Claude"
  displayName: varchar("display_name", { length: 128 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color code
  icon: varchar("icon", { length: 255 }), // URL or icon identifier
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AiTool = typeof aiTools.$inferSelect;
export type InsertAiTool = typeof aiTools.$inferInsert;

/**
 * Accounts table for managing user accounts across different AI platforms.
 */
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tag: varchar("tag", { length: 255 }).notNull(), // User-defined account identifier
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

/**
 * Chat tags for organizing and categorizing chats.
 */
export const chatTags = pgTable("chat_tags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  chatId: integer("chat_id").notNull(),
  tag: varchar("tag", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChatTag = typeof chatTags.$inferSelect;
export type InsertChatTag = typeof chatTags.$inferInsert;
