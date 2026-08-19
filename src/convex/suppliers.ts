import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suppliers").collect();
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase();
    if (!term) return [];
    const all = await ctx.db.query("suppliers").collect();
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.companyName && s.companyName.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(term))
    );
  },
});

export const get = query({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    companyName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    ntn: v.optional(v.string()),
    email: v.optional(v.string()),
    previousBalance: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("suppliers", {
      ...args,
      currentBalance: args.previousBalance ?? 0,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("suppliers"),
    name: v.optional(v.string()),
    companyName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    ntn: v.optional(v.string()),
    email: v.optional(v.string()),
    previousBalance: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) clean[key] = value;
    }
    await ctx.db.patch(id, clean);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});

export const updateBalance = mutation({
  args: {
    supplierId: v.id("suppliers"),
    amountChange: v.number(),
  },
  handler: async (ctx, args) => {
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier) throw new Error("Supplier not found");
    await ctx.db.patch(args.supplierId, {
      currentBalance: supplier.currentBalance + args.amountChange,
    });
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("suppliers").collect();
    return { total: all.filter((s) => s.isActive).length };
  },
});
