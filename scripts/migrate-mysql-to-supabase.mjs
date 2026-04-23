import mysql from "mysql2/promise";
import pg from "pg";

const { Pool } = pg;

function requireEnv(name) {
  const v = process.env[name];
  if (!v || String(v).trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return v;
}

const SOURCE_DATABASE_URL = requireEnv("SOURCE_DATABASE_URL");
const DATABASE_URL = requireEnv("DATABASE_URL");

function buildMysqlPool(urlString) {
  // TiDB Cloud serverless requires TLS.
  const u = new URL(urlString);
  const sslMode = (u.searchParams.get("ssl-mode") || "").toLowerCase();
  const requireTls =
    sslMode === "require" ||
    sslMode === "required" ||
    sslMode === "verify_identity" ||
    sslMode === "verify-ca" ||
    u.hostname.endsWith(".tidbcloud.com");

  const port = u.port ? Number(u.port) : 3306;
  const database = (u.pathname || "").replace(/^\//, "");

  // mysql2 accepts either a URL or a config object. For TLS we use config object.
  return mysql.createPool({
    host: u.hostname,
    port,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
    ssl: requireTls ? { rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

function buildPgPool() {
  // pg requires a valid RFC3986 URL if using connectionString. If your password has
  // special characters, percent-encode it OR provide PGHOST/PGUSER/PGPASSWORD/PGDATABASE.
  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;
  const port = process.env.PGPORT ? Number(process.env.PGPORT) : 5432;

  // Prefer explicit PG* vars when present (useful for pooler hosts / IPv4-only).
  if (host && user && password && database) {
    return new Pool({
      host,
      user,
      password,
      database,
      port,
      max: 5,
      // Pooler connections can present cert chains that fail strict validation
      // on some Windows setups. For migration tooling, prefer connectivity.
      ssl: { rejectUnauthorized: false },
    });
  }

  // Fall back to connectionString if no explicit PG* vars.
  // Validate URL syntax without logging it.
  // eslint-disable-next-line no-new
  new URL(DATABASE_URL);
  return new Pool({ connectionString: DATABASE_URL, max: 5 });
}

function safeJson(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return value;
  const s = value.trim();
  if (s.length === 0) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function safeJsonArray(value, fallback = []) {
  const parsed = safeJson(value);
  if (Array.isArray(parsed)) return parsed;
  if (parsed == null) return fallback;
  return fallback;
}

function toJsonbParam(value) {
  // pg driver accepts objects sometimes, but to be consistent and avoid
  // ambiguous type inference, send JSON text for jsonb columns.
  return JSON.stringify(value ?? null);
}

async function resetSequence(pool, tableName, idColumn = "id") {
  // Works for serial/identity columns.
  const sql = `
    SELECT
      CASE
        WHEN (SELECT COALESCE(MAX(${idColumn}), 0) FROM ${tableName}) <= 0
          THEN setval(pg_get_serial_sequence($1, $2), 1, false)
        ELSE setval(
          pg_get_serial_sequence($1, $2),
          (SELECT MAX(${idColumn}) FROM ${tableName})
        )
      END;
  `;
  await pool.query(sql, [tableName, idColumn]);
}

async function main() {
  console.log("Connecting to source MySQL/TiDB...");
  const mysqlPool = await buildMysqlPool(SOURCE_DATABASE_URL);

  console.log("Connecting to destination Supabase Postgres...");
  const pgPool = buildPgPool();

  try {
    // Ensure destination tables already exist (run drizzle migrations first).
    // Migration order matters.

    // 1) users
    {
      const [rows] = await mysqlPool.query("SELECT * FROM users ORDER BY id");
      console.log(`Migrating users: ${rows.length}`);

      for (const r of rows) {
        await pgPool.query(
          `
          INSERT INTO users
            (id, open_id, name, email, login_method, role, created_at, updated_at, last_signed_in)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO NOTHING
        `,
          [
            r.id,
            r.openId ?? r.open_id,
            r.name ?? null,
            r.email ?? null,
            r.loginMethod ?? r.login_method ?? null,
            r.role ?? "user",
            r.createdAt ?? r.created_at ?? new Date(),
            r.updatedAt ?? r.updated_at ?? new Date(),
            r.lastSignedIn ?? r.last_signed_in ?? new Date(),
          ]
        );
      }
      await resetSequence(pgPool, "users");
    }

    // 2) user_identities (may not exist in older MySQL DB; skip if missing)
    {
      try {
        const [rows] = await mysqlPool.query(
          "SELECT * FROM user_identities ORDER BY id"
        );
        console.log(`Migrating user_identities: ${rows.length}`);

        for (const r of rows) {
          await pgPool.query(
            `
            INSERT INTO user_identities
              (id, user_id, provider, subject, created_at)
            VALUES
              ($1,$2,$3,$4,$5)
            ON CONFLICT (id) DO NOTHING
          `,
            [
              r.id,
              r.userId ?? r.user_id,
              r.provider,
              r.subject,
              r.createdAt ?? r.created_at ?? new Date(),
            ]
          );
        }
        await resetSequence(pgPool, "user_identities");
      } catch (e) {
        console.warn(
          "Skipping user_identities (table missing in source DB?)",
          String(e?.message ?? e)
        );
      }
    }

    // 3) ai_tools
    {
      const [rows] = await mysqlPool.query("SELECT * FROM ai_tools ORDER BY id");
      console.log(`Migrating ai_tools: ${rows.length}`);

      for (const r of rows) {
        await pgPool.query(
          `
          INSERT INTO ai_tools
            (id, name, display_name, description, color, icon, created_at)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (id) DO NOTHING
        `,
          [
            r.id,
            r.name,
            r.displayName ?? r.display_name,
            r.description ?? null,
            r.color ?? null,
            r.icon ?? null,
            r.createdAt ?? r.created_at ?? new Date(),
          ]
        );
      }
      await resetSequence(pgPool, "ai_tools");
    }

    // 4) accounts
    {
      const [rows] = await mysqlPool.query("SELECT * FROM accounts ORDER BY id");
      console.log(`Migrating accounts: ${rows.length}`);

      for (const r of rows) {
        await pgPool.query(
          `
          INSERT INTO accounts
            (id, user_id, tag, description, created_at, updated_at)
          VALUES
            ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO NOTHING
        `,
          [
            r.id,
            r.userId ?? r.user_id,
            r.tag,
            r.description ?? null,
            r.createdAt ?? r.created_at ?? new Date(),
            r.updatedAt ?? r.updated_at ?? new Date(),
          ]
        );
      }
      await resetSequence(pgPool, "accounts");
    }

    // 5) ai_chats
    {
      const [rows] = await mysqlPool.query("SELECT * FROM ai_chats ORDER BY id");
      console.log(`Migrating ai_chats: ${rows.length}`);

      for (const r of rows) {
        await pgPool.query(
          `
          INSERT INTO ai_chats
            (id, user_id, ai_tool, account_tag, title, full_conversation, message_count, tags, created_at, updated_at)
          VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (id) DO NOTHING
        `,
          [
            r.id,
            r.userId ?? r.user_id,
            r.aiTool ?? r.ai_tool,
            r.accountTag ?? r.account_tag ?? null,
            r.title,
            toJsonbParam(safeJsonArray(r.fullConversation ?? r.full_conversation, [])),
            r.messageCount ?? r.message_count ?? 0,
            toJsonbParam(safeJsonArray(r.tags, [])),
            r.createdAt ?? r.created_at ?? new Date(),
            r.updatedAt ?? r.updated_at ?? new Date(),
          ]
        );
      }
      await resetSequence(pgPool, "ai_chats");
    }

    // 6) chat_tags
    {
      const [rows] = await mysqlPool.query("SELECT * FROM chat_tags ORDER BY id");
      console.log(`Migrating chat_tags: ${rows.length}`);

      for (const r of rows) {
        await pgPool.query(
          `
          INSERT INTO chat_tags
            (id, user_id, chat_id, tag, created_at)
          VALUES
            ($1,$2,$3,$4,$5)
          ON CONFLICT (id) DO NOTHING
        `,
          [
            r.id,
            r.userId ?? r.user_id,
            r.chatId ?? r.chat_id,
            r.tag,
            r.createdAt ?? r.created_at ?? new Date(),
          ]
        );
      }
      await resetSequence(pgPool, "chat_tags");
    }

    console.log("✓ Migration complete");
  } finally {
    await mysqlPool.end().catch(() => undefined);
    // pg Pool doesn't have end() on the constructor import? It does.
    // Ensure we close it.
    // eslint-disable-next-line no-undef
    // @ts-ignore
    await pgPool.end().catch(() => undefined);
  }
}

main().catch((e) => {
  console.error("✗ Migration failed:", e);
  process.exit(1);
});

