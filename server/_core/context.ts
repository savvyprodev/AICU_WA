import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getBearerToken, verifySupabaseAccessToken } from "./auth/supabase";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = getBearerToken(opts.req);
    if (token) {
      const claims = await verifySupabaseAccessToken(token);
      const existing =
        (await db.getUserByIdentity({
          provider: "supabase",
          subject: claims.sub,
        })) ?? null;

      if (existing) {
        user = existing;
      } else {
        // Auto-link migrated legacy accounts by email on first Supabase login.
        // Safety: only link when there is exactly one matching legacy user row.
        const email = claims.email ?? null;
        const legacyMatch = email ? await db.getUniqueUserByEmail(email) : null;

        if (legacyMatch) {
          user =
            (await db.linkSupabaseIdentityToExistingUser({
              userId: legacyMatch.id,
              supabaseSub: claims.sub,
              email,
              name: null,
            })) ?? legacyMatch;
        } else {
          user = await db.createUserForSupabase({
            supabaseSub: claims.sub,
            email,
            name: null,
          });
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
