import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("purchaseOrders").order("desc").collect();
  },
});

export const get = query({
  args: { id: v.id("purchaseOrders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getItems = query({
  args: { poId: v.id("purchaseOrders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("purchaseOrderItems")
      .withIndex("by_po", (q) => q.eq("poId", args.poId))
      .collect();
  },
});

export const getLowStockProducts = query({
  args: {
    projectionDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Get recent sales for demand calculation
    const sales = await ctx.db.query("saleItems").collect();
    const inventory = await ctx.db.query("inventory").collect();

    const now = Date.now();
    const projectionDays = args.projectionDays || 30;
    const projectionStart = now - projectionDays * 24 * 60 * 60 * 1000;

    // Calculate sold quantities per product
    const soldByProduct = new Map<string, number>();
    for (const sale of sales) {
      const productId = sale.productId;
      const current = soldByProduct.get(productId) || 0;
      soldByProduct.set(productId, current + sale.quantity);
    }

    // Filter low stock products
    const lowStockProducts = [];
    for (const product of products) {
      const soldQty = soldByProduct.get(product._id) || 0;
      const minStock = product.minimumStock || 0;
      const currentStock = product.currentStock;

      // Include if stock is zero, below minimum, or dead item
      const isLowStock = currentStock <= minStock || currentStock === 0 || soldQty > currentStock;

      if (isLowStock) {
        const requiredPacks = Math.max(0, minStock - currentStock + Math.ceil(soldQty * (projectionDays / 365)));
        
        lowStockProducts.push({
          _id: product._id,
          name: product.name,
          code: product.code,
          soldQty,
          stockInHand: currentStock,
          requiredPacks: requiredPacks > 0 ? requiredPacks : 0,
          customerDemand: soldQty,
          packSize: 1,
          purchasePrice: product.purchasePrice,
          discount: 0,
          minQty: minStock,
          bonusQty: 0,
          netAmount: 0,
          manufacturer: product.manufacturer || "",
        });
      }
    }

    return lowStockProducts;
  },
});

export const create = mutation({
  args: {
    poNumber: v.string(),
    date: v.string(),
    supplierId: v.optional(v.id("suppliers")),
    poCategory: v.optional(v.string()),
    projectionDays: v.optional(v.number()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    totalAmount: v.number(),
    status: v.string(),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        soldQty: v.number(),
        stockInHand: v.number(),
        requiredPacks: v.number(),
        customerDemand: v.number(),
        packSize: v.optional(v.number()),
        purchasePrice: v.number(),
        discount: v.optional(v.number()),
        minQty: v.optional(v.number()),
        bonusQty: v.optional(v.number()),
        netAmount: v.number(),
        manufacturer: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const poId = await ctx.db.insert("purchaseOrders", {
      poNumber: args.poNumber,
      date: args.date,
      supplierId: args.supplierId,
      poCategory: args.poCategory,
      projectionDays: args.projectionDays,
      fromDate: args.fromDate,
      toDate: args.toDate,
      totalAmount: args.totalAmount,
      status: args.status,
      notes: args.notes,
      createdBy: undefined,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of args.items) {
      await ctx.db.insert("purchaseOrderItems", {
        poId,
        ...item,
      });
    }

    return poId;
  },
});

export const update = mutation({
  args: {
    id: v.id("purchaseOrders"),
    poNumber: v.optional(v.string()),
    date: v.optional(v.string()),
    supplierId: v.optional(v.id("suppliers")),
    poCategory: v.optional(v.string()),
    projectionDays: v.optional(v.number()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
    totalAmount: v.optional(v.number()),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    items: v.optional(
      v.array(
        v.object({
          productId: v.id("products"),
          productName: v.string(),
          soldQty: v.number(),
          stockInHand: v.number(),
          requiredPacks: v.number(),
          customerDemand: v.number(),
          packSize: v.optional(v.number()),
          purchasePrice: v.number(),
          discount: v.optional(v.number()),
          minQty: v.optional(v.number()),
          bonusQty: v.optional(v.number()),
          netAmount: v.number(),
          manufacturer: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const { id, items, ...fields } = args;
    const now = Date.now();

    // Update the order
    await ctx.db.patch(id, { ...fields, updatedAt: now });

    // If items provided, replace them
    if (items) {
      // Delete old items
      const oldItems = await ctx.db
        .query("purchaseOrderItems")
        .withIndex("by_po", (q) => q.eq("poId", id))
        .collect();
      for (const old of oldItems) {
        await ctx.db.delete(old._id);
      }

      // Insert new items
      for (const item of items) {
        await ctx.db.insert("purchaseOrderItems", {
          poId: id,
          ...item,
        });
      }
    }

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("purchaseOrders") },
  handler: async (ctx, args) => {
    // Delete items first
    const items = await ctx.db
      .query("purchaseOrderItems")
      .withIndex("by_po", (q) => q.eq("poId", args.id))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});
