import { createRemoteJWKSet, jwtVerify } from "jose";
import { ForbiddenError } from "@shared/_core/errors";
import { ENV } from "../env";

type SupabaseJwtClaims = {
  sub: string;
  email?: string;
  role?: string;
  iss?: string;
  aud?: string | string[];
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;
  if (!ENV.supabaseJwksUrl) {
    throw ForbiddenError("SUPABASE_JWKS_URL is not configured");
  }
  jwks = createRemoteJWKSet(new URL(ENV.supabaseJwksUrl));
  return jwks;
}

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

export function getBearerToken(req: RequestLike): string | null {
  const raw =
    req.headers?.["authorization"] ?? req.headers?.["Authorization"];
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

export async function verifySupabaseAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: ENV.supabaseIssuer || undefined,
    });
    const claims = payload as unknown as SupabaseJwtClaims;
    if (!claims.sub || typeof claims.sub !== "string") {
      throw ForbiddenError("Invalid Supabase token (missing sub)");
    }
    return claims;
  } catch (e) {
    throw ForbiddenError("Invalid Supabase access token");
  }
}

