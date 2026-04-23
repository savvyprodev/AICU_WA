import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

let cachedApp: ReturnType<typeof express> | null = null;

function getApp() {
  if (cachedApp) return cachedApp;

  const app = express();

  // Keep payload limit reasonable for serverless.
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  cachedApp = app;
  return app;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Delegate to express app.
  return getApp()(req as any, res as any);
}

