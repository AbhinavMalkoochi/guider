import { internalQuery, internalMutation } from "./_generated/server";

export const internalGetStats = internalQuery(async (ctx) => {
  const doc = await ctx.db.query("counters").withIndex("by_name", (q) => q.eq("name", "installs")).first();
  return doc?.count || 4127;
});

export const internalBumpInstall = internalMutation(async (ctx) => {
  const doc = await ctx.db.query("counters").withIndex("by_name", (q) => q.eq("name", "installs")).first();
  if (doc) {
    await ctx.db.patch(doc._id, { count: doc.count + 1 });
    return doc.count + 1;
  } else {
    await ctx.db.insert("counters", { name: "installs", count: 4128 });
    return 4128;
  }
});
