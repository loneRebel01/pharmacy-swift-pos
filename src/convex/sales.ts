import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const sales = await ctx.db.query("sales").collect();
    return sales.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getItems = query({
  args: { saleId: v.id("sales") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("saleItems")
      .withIndex("by_sale", (q) => q.eq("saleId", args.saleId))
      .collect();
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase();
    if (!term) return [];
    const all = await ctx.db.query("sales").collect();
    return all
      .filter((s) => s.invoiceNumber.toLowerCase().includes(term))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    customerId: v.optional(v.id("customers")),
    invoiceNumber: v.string(),
    date: v.string(),
    paymentMethod: v.string(),
    subtotal: v.number(),
    totalDiscount: v.optional(v.number()),
    totalTax: v.optional(v.number()),
    totalAmount: v.number(),
    cashReceived: v.optional(v.number()),
    changeReturned: v.optional(v.number()),
    notes: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        unit: v.string(),
        quantity: v.number(),
        retailPrice: v.number(),
        salePrice: v.number(),
        discount: v.optional(v.number()),
        extraDiscount: v.optional(v.number()),
        taxPercent: v.optional(v.number()),
        taxAmount: v.optional(v.number()),
        margin: v.optional(v.number()),
        marginPercent: v.optional(v.number()),
        total: v.number(),
        netRate: v.number(),
        batchNumber: v.optional(v.string()),
        expiryDate: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { items, ...saleData } = args;
    const now = Date.now();
    const saleId = await ctx.db.insert("sales", {
      ...saleData,
      status: "completed",
      items: items,
      createdBy: undefined,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of items) {
      await ctx.db.insert("saleItems", {
        saleId,
        ...item,
      });

      // Update product stock
      const product = await ctx.db.get(item.productId);
      if (product) {
        await ctx.db.patch(item.productId, {
          currentStock: Math.max(0, product.currentStock - item.quantity),
          updatedAt: now,
        });
      }

      // Log inventory
      await ctx.db.insert("inventory", {
        productId: item.productId,
        type: "sale",
        quantity: -item.quantity,
        referenceId: saleId,
        referenceType: "sale",
        notes: `Sale: ${saleData.invoiceNumber}`,
        createdAt: now,
      });
    }

    // Update customer balance for credit sales
    if (
      saleData.customerId &&
      saleData.paymentMethod === "credit"
    ) {
      const customer = await ctx.db.get(saleData.customerId);
      if (customer) {
        await ctx.db.patch(saleData.customerId, {
          currentBalance: customer.currentBalance + saleData.totalAmount,
        });
      }
    }

    return saleId;
  },
});

export const remove = mutation({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "deleted" });
  },
});

export const hold = mutation({
  args: { data: v.any() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("heldTransactions", {
      type: "sale",
      data: args.data,
      createdAt: Date.now(),
    });
  },
});

export const getHeld = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("heldTransactions")
      .withIndex("by_type", (q) => q.eq("type", "sale"))
      .collect();
  },
});

export const removeHeld = mutation({
  args: { id: v.id("heldTransactions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const all = await ctx.db.query("sales").collect();

    const todaySales = all.filter(
      (s) => s.date === today && s.status === "completed"
    );
    const monthSales = all.filter(
      (s) => s.date >= monthStart && s.status === "completed"
    );

    return {
      todayTotal: todaySales.reduce((sum, s) => sum + s.totalAmount, 0),
      monthTotal: monthSales.reduce((sum, s) => sum + s.totalAmount, 0),
      todayCount: todaySales.length,
      totalCount: all.filter((s) => s.status === "completed").length,
    };
  },
});
