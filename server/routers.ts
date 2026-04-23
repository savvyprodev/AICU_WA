import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getUserChats, getChatById, createChat, updateChat, deleteChat, getChatStats, getChatsByTool, getChatsByAccount } from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      return {
        success: true,
      } as const;
    }),
  }),

  chats: router({
    list: protectedProcedure
      .input(
        z.object({
          aiTool: z.string().optional(),
          accountTag: z.string().optional(),
          searchTerm: z.string().optional(),
          limit: z.number().default(20),
          offset: z.number().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const chats = await getUserChats(ctx.user.id, {
          aiTool: input.aiTool,
          accountTag: input.accountTag,
          searchTerm: input.searchTerm,
          limit: input.limit,
          offset: input.offset,
        });
        return chats;
      }),

    byId: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getChatById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          aiTool: z.string(),
          accountTag: z.string().optional(),
          title: z.string(),
          fullConversation: z.unknown(),
          messageCount: z.number().optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return createChat(ctx.user.id, input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().optional(),
          fullConversation: z.unknown().optional(),
          messageCount: z.number().optional(),
          tags: z.array(z.string()).optional(),
          accountTag: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return updateChat(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteChat(input.id, ctx.user.id);
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return getChatStats(ctx.user.id);
    }),

    byTool: protectedProcedure.query(async ({ ctx }) => {
      return getChatsByTool(ctx.user.id);
    }),

    byAccount: protectedProcedure.query(async ({ ctx }) => {
      return getChatsByAccount(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
