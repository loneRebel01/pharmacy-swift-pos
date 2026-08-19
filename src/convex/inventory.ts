import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("inventory").collect();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

export const adjustStock = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    type: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    const newStock = product.currentStock + args.quantity;
    if (newStock < 0) throw new Error("Stock cannot be negative");
    await ctx.db.patch(args.productId, {
      currentStock: newStock,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("inventory", {
      productId: args.productId,
      type: args.type,
      quantity: args.quantity,
      referenceType: args.type,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const transfer = mutation({
  args: {
    productId: v.id("products"),
    fromLocation: v.string(),
    toLocation: v.string(),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("inventory", {
      productId: args.productId,
      type: "transfer",
      quantity: 0,
      referenceType: "transfer",
      notes: `Transfer ${args.fromLocation} → ${args.toLocation}: ${args.quantity}`,
      createdAt: Date.now(),
    });
  },
});
