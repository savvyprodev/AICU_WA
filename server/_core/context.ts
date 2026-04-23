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

      user =
        existing ??
        (await db.createUserForSupabase({
          supabaseSub: claims.sub,
          email: claims.email ?? null,
          name: null,
        }));
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
