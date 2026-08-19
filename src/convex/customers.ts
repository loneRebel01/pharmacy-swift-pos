import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("customers").collect();
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase();
    if (!term) return [];
    const all = await ctx.db.query("customers").collect();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.mobile && c.mobile.includes(term))
    );
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    mobile: v.optional(v.string()),
    address: v.optional(v.string()),
    creditLimit: v.optional(v.number()),
    previousBalance: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("customers", {
      ...args,
      currentBalance: args.previousBalance ?? 0,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("customers"),
    name: v.optional(v.string()),
    mobile: v.optional(v.string()),
    address: v.optional(v.string()),
    creditLimit: v.optional(v.number()),
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
  args: { id: v.id("customers") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false });
  },
});

export const updateBalance = mutation({
  args: {
    customerId: v.id("customers"),
    amountChange: v.number(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found");
    await ctx.db.patch(args.customerId, {
      currentBalance: customer.currentBalance + args.amountChange,
    });
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("customers").collect();
    return { total: all.filter((c) => c.isActive).length };
  },
});
