import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, users, aiChats } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUniqueUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return null;

  const db = await getDb();
  if (!db) return null;

  const matches = await db
    .select()
    .from(users)
    .where(
      sql`LOWER(${users.email}) = ${normalized}`
    )
    .limit(2);

  if (matches.length !== 1) return null;
  return matches[0];
}

export async function touchUserOnLogin(params: {
  userId: number;
  email?: string | null;
  name?: string | null;
  loginMethod?: string | null;
}) {
  const db = await getDb();
  if (!db) return;

  const nextEmail = params.email?.trim() ? params.email.trim() : null;
  const nextName = params.name?.trim() ? params.name.trim() : null;

  // Only fill in missing profile fields to avoid clobbering legacy data.
  await db
    .update(users)
    .set({
      lastSignedIn: new Date(),
      email: sql`COALESCE(${users.email}, ${nextEmail})`,
      name: sql`COALESCE(${users.name}, ${nextName})`,
      loginMethod: params.loginMethod ?? undefined,
    })
    .where(eq(users.id, params.userId));
}

export async function getUserByIdentity(params: {
  provider: "legacy" | "supabase";
  subject: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.execute(sql`
    SELECT u.*
    FROM users u
    JOIN user_identities ui ON ui.user_id = u.id
    WHERE ui.provider = ${params.provider}
      AND ui.subject = ${params.subject}
    LIMIT 1
  `);

  const rows = (result as any)?.rows ?? result;
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
}

export async function linkUserIdentity(params: {
  userId: number;
  provider: "legacy" | "supabase";
  subject: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.execute(sql`
    INSERT INTO user_identities (user_id, provider, subject, created_at)
    VALUES (${params.userId}, ${params.provider}, ${params.subject}, NOW())
    ON CONFLICT DO NOTHING
  `);
}

export async function createUserForSupabase(params: {
  supabaseSub: string;
  email?: string | null;
  name?: string | null;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Keep existing schema stable: `users.openId` is currently NOT NULL and unique.
  // During migration we store a namespaced value to avoid colliding with (and misidentifying)
  // legacy openIds.
  const openId = `supabase:${params.supabaseSub}`;
  await upsertUser({
    openId,
    email: params.email ?? null,
    name: params.name ?? null,
    loginMethod: "supabase",
    lastSignedIn: new Date(),
  });

  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("Failed to create user");

  await linkUserIdentity({
    userId: user.id,
    provider: "supabase",
    subject: params.supabaseSub,
  });

  return user;
}

export async function linkSupabaseIdentityToExistingUser(params: {
  userId: number;
  supabaseSub: string;
  email?: string | null;
  name?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await linkUserIdentity({
    userId: params.userId,
    provider: "supabase",
    subject: params.supabaseSub,
  });

  await touchUserOnLogin({
    userId: params.userId,
    email: params.email ?? null,
    name: params.name ?? null,
    // Keep legacy openId intact; just record that they can log in via Supabase now.
    loginMethod: "supabase",
  });

  const user = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);
  return user.length > 0 ? user[0] : null;
}

export async function backfillLegacyIdentitiesFromUsersOpenId() {
  const db = await getDb();
  if (!db) return;

  // Only backfill rows that look like pre-Supabase identities.
  await db.execute(sql`
    INSERT INTO user_identities (user_id, provider, subject, created_at)
    SELECT u.id, 'legacy', u.open_id, NOW()
    FROM users u
    WHERE u.open_id IS NOT NULL
      AND u.open_id NOT LIKE 'supabase:%'
    ON CONFLICT DO NOTHING
  `);
}

/**
 * Get all chats for a user with optional filters
 */
export async function getUserChats(
  userId: number,
  filters?: {
    aiTool?: string;
    accountTag?: string;
    searchTerm?: string;
    limit?: number;
    offset?: number;
  }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(aiChats.userId, userId)];

  if (filters?.aiTool) {
    conditions.push(eq(aiChats.aiTool, filters.aiTool));
  }
  if (filters?.accountTag) {
    conditions.push(eq(aiChats.accountTag, filters.accountTag));
  }
  if (filters?.searchTerm) {
    conditions.push(
      sql`${aiChats.title} LIKE ${`%${filters.searchTerm}%`}`
    );
  }

  let query = db
    .select()
    .from(aiChats)
    .where(and(...conditions))
    .orderBy(desc(aiChats.createdAt)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.offset(filters.offset);
  }

  return query;
}

/**
 * Get a single chat by ID
 */
export async function getChatById(chatId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(aiChats)
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Create a new chat
 */
export async function createChat(
  userId: number,
  data: {
    aiTool: string;
    accountTag?: string;
    title: string;
    fullConversation: unknown;
    messageCount?: number;
    tags?: string[];
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(aiChats).values({
    userId,
    aiTool: data.aiTool,
    accountTag: data.accountTag,
    title: data.title,
    fullConversation: data.fullConversation,
    messageCount: data.messageCount || 0,
    tags: data.tags || [],
  });

  return result;
}

/**
 * Update a chat
 */
export async function updateChat(
  chatId: number,
  userId: number,
  data: Partial<{
    title: string;
    fullConversation: unknown;
    messageCount: number;
    tags: string[];
    accountTag: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(aiChats)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)));
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .delete(aiChats)
    .where(and(eq(aiChats.id, chatId), eq(aiChats.userId, userId)));
}

/**
 * Get chat statistics for a user
 */
export async function getChatStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalChats: 0, totalMessages: 0, aiTools: [] };

  const chats = await db
    .select()
    .from(aiChats)
    .where(eq(aiChats.userId, userId));

  const totalChats = chats.length;
  const totalMessages = chats.reduce((sum, chat) => sum + (chat.messageCount || 0), 0);
  const aiToolsSet = new Set(chats.map((chat) => chat.aiTool));
  const aiTools = Array.from(aiToolsSet);

  return { totalChats, totalMessages, aiTools };
}

/**
 * Get chats grouped by AI tool
 */
export async function getChatsByTool(userId: number) {
  const db = await getDb();
  if (!db) return {};

  const chats = await db
    .select()
    .from(aiChats)
    .where(eq(aiChats.userId, userId))
    .orderBy(desc(aiChats.createdAt));

  const grouped: Record<string, typeof chats> = {};
  for (const chat of chats) {
    if (!grouped[chat.aiTool]) {
      grouped[chat.aiTool] = [];
    }
    grouped[chat.aiTool].push(chat);
  }

  return grouped;
}

/**
 * Get chats grouped by account tag
 */
export async function getChatsByAccount(userId: number) {
  const db = await getDb();
  if (!db) return {};

  const chats = await db
    .select()
    .from(aiChats)
    .where(eq(aiChats.userId, userId))
    .orderBy(desc(aiChats.createdAt));

  const grouped: Record<string, typeof chats> = {};
  for (const chat of chats) {
    const accountKey = chat.accountTag || "Untagged";
    if (!grouped[accountKey]) {
      grouped[accountKey] = [];
    }
    grouped[accountKey].push(chat);
  }

  return grouped;
}

// TODO: add feature queries here as your schema grows.
