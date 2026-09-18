import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { systemRouter } from "./_core/systemRouter.js";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
import { createPrediction, getAnalytics, getCategories, getPrediction, listPredictions, resolvePrediction, updateForecast } from "./db.js";
import { generateForecast } from "./forecast.js";
import { TRPCError } from "@trpc/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const predictionId = z.string().uuid();
const question = z.string().trim().min(10, "Ask a question with enough detail to measure.").max(1000);

function requireSupabase(ctx: { supabase: SupabaseClient | null }) {
  if (!ctx.supabase) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Supabase is not available for this request." });
  return ctx.supabase;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  categories: protectedProcedure.query(({ ctx }) => getCategories(requireSupabase(ctx))),
  predictions: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional() }).optional()).query(({ ctx, input }) => listPredictions(requireSupabase(ctx), ctx.user.id, input?.status)),
    get: protectedProcedure.input(z.object({ id: predictionId })).query(({ ctx, input }) => getPrediction(requireSupabase(ctx), ctx.user.id, input.id)),
    generate: protectedProcedure.input(z.object({ question, categorySlug: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const generation = await generateForecast(input.question, input.categorySlug);
      return createPrediction(requireSupabase(ctx), ctx.user, generation);
    }),
    update: protectedProcedure.input(z.object({ id: predictionId, question, categorySlug: z.string().optional(), changeSummary: z.string().min(5).max(500) })).mutation(async ({ ctx, input }) => {
      const generation = await generateForecast(input.question, input.categorySlug);
      return updateForecast(requireSupabase(ctx), ctx.user.id, input.id, generation, input.changeSummary);
    }),
    resolve: protectedProcedure.input(z.object({ id: predictionId, outcome: z.enum(["yes", "no", "ambiguous", "cancelled"]), resolutionNote: z.string().min(5).max(1000), sourceUrl: z.string().url().optional() })).mutation(({ ctx, input }) => resolvePrediction(requireSupabase(ctx), ctx.user.id, input.id, input.outcome, input.resolutionNote, input.sourceUrl)),
  }),
  analytics: protectedProcedure.query(({ ctx }) => getAnalytics(requireSupabase(ctx), ctx.user.id)),
});

export type AppRouter = typeof appRouter;
