import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase();
    if (!term) return [];
    const allProducts = await ctx.db.query("products").collect();
    return allProducts.filter(
      (p) =>
        p.isActive &&
        (p.name.toLowerCase().includes(term) ||
          (p.code && p.code.toLowerCase().includes(term)) ||
          (p.barcode && p.barcode.toLowerCase().includes(term)) ||
          (p.genericName && p.genericName.toLowerCase().includes(term)) ||
          (p.brand && p.brand.toLowerCase().includes(term)) ||
          (p.batchNumber && p.batchNumber.toLowerCase().includes(term)))
    );
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByBarcode = query({
  args: { barcode: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("products")
      .withIndex("by_barcode", (q) => q.eq("barcode", args.barcode))
      .collect();
    return results.find((p) => p.isActive) ?? null;
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    barcode: v.optional(v.string()),
    name: v.string(),
    genericName: v.optional(v.string()),
    brand: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    rackNumber: v.optional(v.string()),
    unit: v.string(),
    purchasePrice: v.number(),
    retailPrice: v.number(),
    wholesalePrice: v.optional(v.number()),
    tax: v.optional(v.number()),
    discount: v.optional(v.number()),
    expiryDate: v.optional(v.string()),
    manufacturingDate: v.optional(v.string()),
    minimumStock: v.optional(v.number()),
    maximumStock: v.optional(v.number()),
    supplierId: v.optional(v.id("suppliers")),
    imageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    currentStock: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("products", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    code: v.optional(v.string()),
    barcode: v.optional(v.string()),
    name: v.optional(v.string()),
    genericName: v.optional(v.string()),
    brand: v.optional(v.string()),
    manufacturer: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    batchNumber: v.optional(v.string()),
    rackNumber: v.optional(v.string()),
    unit: v.optional(v.string()),
    purchasePrice: v.optional(v.number()),
    retailPrice: v.optional(v.number()),
    wholesalePrice: v.optional(v.number()),
    tax: v.optional(v.number()),
    discount: v.optional(v.number()),
    expiryDate: v.optional(v.string()),
    manufacturingDate: v.optional(v.string()),
    minimumStock: v.optional(v.number()),
    maximumStock: v.optional(v.number()),
    supplierId: v.optional(v.id("suppliers")),
    imageUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    currentStock: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    cleanUpdates.updatedAt = Date.now();
    await ctx.db.patch(id, cleanUpdates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: false, updatedAt: Date.now() });
  },
});

export const getLowStock = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("products").collect();
    return all.filter(
      (p) =>
        p.isActive &&
        p.minimumStock !== undefined &&
        p.currentStock <= p.minimumStock
    );
  },
});

export const getExpiring = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const all = await ctx.db.query("products").collect();
    return all.filter((p) => {
      if (!p.isActive || !p.expiryDate) return false;
      const exp = new Date(p.expiryDate);
      return exp <= thirtyDays;
    });
  },
});

export const getExpired = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString().split("T")[0];
    const all = await ctx.db.query("products").collect();
    return all.filter(
      (p) => p.isActive && p.expiryDate && p.expiryDate <= now
    );
  },
});

export const updateStock = mutation({
  args: {
    productId: v.id("products"),
    quantityChange: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    const newStock = product.currentStock + args.quantityChange;
    if (newStock < 0) throw new Error("Insufficient stock");
    await ctx.db.patch(args.productId, {
      currentStock: newStock,
      updatedAt: Date.now(),
    });
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("products").collect();
    const active = all.filter((p) => p.isActive);
    const now = new Date().toISOString().split("T")[0];
    return {
      total: active.length,
      lowStock: active.filter(
        (p) => p.minimumStock !== undefined && p.currentStock <= p.minimumStock
      ).length,
      expired: active.filter((p) => p.expiryDate && p.expiryDate <= now).length,
    };
  },
});
