import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const getStats = httpAction(async (ctx, request) => {
  const installs = await ctx.runQuery(internal.stats_internal.internalGetStats, {});
  return new Response(JSON.stringify({ installs }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

export const bumpInstall = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const installs = await ctx.runMutation(internal.stats_internal.internalBumpInstall, {});
  return new Response(JSON.stringify({ installs }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
